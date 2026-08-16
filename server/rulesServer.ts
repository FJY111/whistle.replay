import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import type { MockType } from './core/model';
import type { WhistlePluginContext, WhistleServer, WhistleStorage } from './types/whistle';

import { getStreamPort, isStreamReq, markMocked, setStreamPort } from './core/mockMark';
import { testMethod, testPattern } from './core/pattern';
import { pickFile } from './core/rotation';
import { isSafeFileName, parseMockRules } from './core/sanitize';
import { getConfiguredDirs } from './core/settings';
import { splitSseEvents } from './sseStream';

const noop = (): void => {
  /* ignore */
};

const contentTypeOf = (type: MockType): string => {
  if (type === 'json') {
    return 'application/json; charset=utf-8';
  }
  if (type === 'sse') {
    return 'text/event-stream; charset=utf-8';
  }
  return 'text/plain; charset=utf-8';
};

/** 内置 SSE 流式回放服务（仅监听 127.0.0.1）：按事件逐段推送保存的响应内容 */
function startStreamServer(storage: WhistleStorage): void {
  const app = http.createServer((req, res) => {
    req.resume();
    const notFound = (): void => {
      res.statusCode = 404;
      res.end();
    };
    const [pathname, query] = (req.url ?? '').split('?');
    const matched = /^\/mock\/(\d{1,4})\/(.+)$/.exec(pathname ?? '');
    if (!matched) {
      notFound();
      return;
    }
    let name: string;
    let dir: string;
    let headers: Record<string, string> = {};
    try {
      name = decodeURIComponent(matched[2] ?? '');
      const params = new URLSearchParams(query ?? '');
      dir = decodeURIComponent(params.get('dir') ?? '');
      const rawHeaders = params.get('headers');
      if (rawHeaders) {
        const parsed = JSON.parse(rawHeaders) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          headers = parsed as Record<string, string>;
        }
      }
    } catch {
      notFound();
      return;
    }
    if (
      !isSafeFileName(name) ||
      !path.isAbsolute(dir) ||
      !getConfiguredDirs(storage).includes(dir)
    ) {
      notFound();
      return;
    }
    const delay = Math.min(5000, Math.max(0, parseInt(matched[1] ?? '0', 10) || 0));
    fs.readFile(path.join(dir, name), (err, body) => {
      if (err) {
        notFound();
        return;
      }
      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-store',
        'x-accel-buffering': 'no',
        ...headers,
      });
      const chunks = splitSseEvents(body.toString('utf8'));
      let index = 0;
      let closed = false;
      res.on('close', () => {
        closed = true;
      });
      const push = (): void => {
        if (closed) {
          return;
        }
        if (index >= chunks.length) {
          res.end();
          return;
        }
        res.write(chunks[index]);
        index += 1;
        setTimeout(push, delay);
      };
      push();
    });
  });
  app.on('error', noop);
  app.listen(0, '127.0.0.1', () => {
    const address = app.address();
    if (address && typeof address === 'object') {
      setStreamPort(address.port);
    }
  });
  app.unref();
}

/**
 * 动态规则：命中 mock 规则的请求直接返回本地保存的响应（不发往真实服务器）。
 * - fixed / round-robin / random 三种选文件模式
 * - json/text：file:// 一次性返回，delay > 0 时附加 resDelay
 * - sse：转发到内置流式服务逐段推送；服务未就绪时退化为一次性返回
 */
function rulesServer(server: WhistleServer, { storage }: WhistlePluginContext): void {
  startStreamServer(storage);
  server.on('request', (req, res) => {
    const done = (data?: string): void => {
      try {
        res.end(data ?? '');
      } catch {
        noop();
      }
    };
    try {
      if (!storage.getProperty('mockActive')) {
        done();
        return;
      }
      const url = req.originalReq.url ?? '';
      if (!url || isStreamReq(url)) {
        done();
        return;
      }
      const method = req.originalReq.method;
      const rule = parseMockRules(storage.getProperty('mockRules')).find(
        (item) =>
          item.enabled &&
          item.dir &&
          testPattern(url, item.pattern) &&
          testMethod(method, item.methods),
      );
      if (!rule) {
        done();
        return;
      }
      if (rule.hitRate < 100 && Math.random() * 100 >= rule.hitRate) {
        done();
        return;
      }
      const file = pickFile(rule.id, rule.files, rule.mode);
      if (!file) {
        done();
        return;
      }
      const root = path.resolve(rule.dir);
      const filePath = path.resolve(root, file);
      if (path.dirname(filePath) !== root || !fs.existsSync(filePath)) {
        done();
        return;
      }
      markMocked(url);
      const port = getStreamPort();
      if (rule.type === 'sse' && port) {
        const streamDelay =
          rule.delay +
          (rule.delayJitter > 0 ? Math.floor(Math.random() * (rule.delayJitter + 1)) : 0);
        const target =
          `http://127.0.0.1:${String(port)}/mock/${String(streamDelay)}/${encodeURIComponent(file)}` +
          `?dir=${encodeURIComponent(root)}&headers=${encodeURIComponent(JSON.stringify(rule.headers))}`;
        const statusRule =
          rule.statusCode !== 200 ? ` statusCode://${String(rule.statusCode)}` : '';
        done(JSON.stringify({ rules: `${url} ${target}${statusRule}` }));
        return;
      }
      const headers = JSON.stringify({
        'content-type': contentTypeOf(rule.type),
        'cache-control': 'no-store',
        ...rule.headers,
      });
      const actualDelay =
        rule.delay +
        (rule.delayJitter > 0 ? Math.floor(Math.random() * (rule.delayJitter + 1)) : 0);
      const delayRule =
        actualDelay > 0 && rule.type !== 'sse' ? ` resDelay://${String(actualDelay)}` : '';
      const statusRule = rule.statusCode !== 200 ? ` statusCode://${String(rule.statusCode)}` : '';
      if (/[\s>]/.test(filePath)) {
        let body: string;
        try {
          body = fs.readFileSync(filePath, 'utf8');
        } catch {
          done();
          return;
        }
        done(
          JSON.stringify({
            rules: `${url} file://{sakeMockBody} resHeaders://{sakeMockH}${delayRule}${statusRule}`,
            values: { sakeMockBody: body, sakeMockH: headers },
          }),
        );
        return;
      }
      done(
        JSON.stringify({
          rules: `${url} file://<${filePath}> resHeaders://{sakeMockH}${delayRule}${statusRule}`,
          values: { sakeMockH: headers },
        }),
      );
    } catch {
      done();
    }
  });
}

export = rulesServer;
