import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import type { WhistlePluginContext, WhistleRequest, WhistleServer } from './types/whistle';

import { normalizeStatusCode } from './core/capture';
import { captureHeaders } from './core/headers';
import { getStreamPort, isStreamReq, markReplayed, setStreamPort } from './core/mockMark';
import { firstText, hostnameOf, pathnameOf, replayKey } from './core/pathname';
import { isReplayActive, shouldReplay } from './core/replayAllow';
import { buildFileReplay, buildSseReplay } from './core/replayRule';
import { findLatestReplay } from './core/replayStore';
import { isSafeFileName, parseReplayRules } from './core/sanitize';
import { getConfiguredDirs, getSaveDirs } from './core/settings';
import { splitSseEvents } from './sseStream';

const noop = (): void => {
  /* ignore */
};

const requestUrlOf = (req: WhistleRequest): string =>
  firstText(req.originalReq.fullUrl, req.originalReq.url);

const HEADER_QUERY_LIMIT = 3500;

/** 内置 SSE 流式回放服务（仅监听 127.0.0.1）：按事件逐段推送保存的响应内容 */
function startStreamServer(storage: WhistlePluginContext['storage']): void {
  const app = http.createServer((req, res) => {
    req.resume();
    const notFound = (): void => {
      res.statusCode = 404;
      res.end();
    };
    const [pathname, query] = (req.url ?? '').split('?');
    const matched = /^\/mock\/(.+)$/.exec(pathname ?? '');
    if (!matched) {
      notFound();
      return;
    }
    let name: string;
    let dir: string;
    let headers: Record<string, string> = {};
    let statusCode = 200;
    try {
      name = decodeURIComponent(matched[1] ?? '');
      const params = new URLSearchParams(query ?? '');
      dir = decodeURIComponent(params.get('dir') ?? '');
      statusCode = normalizeStatusCode(params.get('status') ?? 200);
      const rawHeaders = params.get('headers');
      if (rawHeaders) {
        headers = captureHeaders(JSON.parse(rawHeaders) as unknown);
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
    fs.readFile(path.join(dir, name), (err, body) => {
      if (err) {
        notFound();
        return;
      }
      res.writeHead(statusCode, {
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
        setTimeout(push, 0);
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
 * 动态规则：回放开关打开且请求命中白名单时，按 pathname + 方法回放最新的保存结果。
 * 白名单可按主机名、pathname 或两者同时匹配。开关关闭、未命中或没有可回放文件时不注入规则。
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
      const url = requestUrlOf(req);
      const method = req.originalReq.method;
      if (!url || isStreamReq(url)) {
        done();
        return;
      }
      if (!isReplayActive(storage.getProperty('replayActive'))) {
        done();
        return;
      }
      const pathname = pathnameOf(url);
      const key = pathname && method ? replayKey(method, pathname) : null;
      if (!pathname || !key) {
        done();
        return;
      }
      if (
        !shouldReplay(
          true,
          hostnameOf(url) ?? '',
          pathname,
          method ?? '',
          parseReplayRules(storage.getProperty('replayRules')),
        )
      ) {
        done();
        return;
      }
      const found = findLatestReplay(getSaveDirs(storage), method ?? '', pathname);
      if (!found) {
        done();
        return;
      }
      const root = path.resolve(found.dir);
      const filePath = path.resolve(root, found.entry.file);
      if (path.dirname(filePath) !== root || !fs.existsSync(filePath)) {
        done();
        return;
      }
      const headers = found.entry.responseHeaders;
      const statusCode = found.entry.statusCode;
      const contentType = (headers['content-type'] ?? found.entry.contentType).toLowerCase();
      const port = getStreamPort();
      const headerJson = JSON.stringify(headers);
      if (
        contentType.includes('text/event-stream') &&
        port &&
        headerJson.length <= HEADER_QUERY_LIMIT
      ) {
        const target =
          `http://127.0.0.1:${String(port)}/mock/${encodeURIComponent(found.entry.file)}` +
          `?dir=${encodeURIComponent(root)}&status=${String(statusCode)}` +
          `&headers=${encodeURIComponent(headerJson)}`;
        markReplayed(key);
        done(JSON.stringify(buildSseReplay(url, target, statusCode)));
        return;
      }
      const inline = /[\s>]/.test(filePath);
      let inlineBody: string | null = null;
      if (inline) {
        try {
          inlineBody = fs.readFileSync(filePath, 'utf8');
        } catch {
          done();
          return;
        }
      }
      markReplayed(key);
      done(JSON.stringify(buildFileReplay(url, filePath, statusCode, headers, inlineBody)));
    } catch {
      done();
    }
  });
}

export = rulesServer;
