import fs from 'node:fs';
import path from 'node:path';

import type { SaveType } from './core/model';
import type {
  WhistlePluginContext,
  WhistleRequest,
  WhistleServer,
  WhistleSession,
} from './types/whistle';

import { recordMeta } from './core/metaStore';
import { consumeMocked, isStreamReq } from './core/mockMark';
import { testMethod, testPattern } from './core/pattern';
import { parseSaveRules } from './core/sanitize';
import { testStatusCode } from './core/statusCodes';
import { joinSseFrames } from './sseStream';

/** 保存响应体并在索引中记录来源信息（供 mock 界面展示与类型推断） */
const saveBody = (
  dir: string,
  fileName: string,
  body: string,
  url: string,
  contentType: string,
  method: string,
): void => {
  const filePath = path.resolve(dir, fileName);
  const record = (): void => {
    recordMeta(dir, fileName, { url, contentType, method, time: Date.now() });
  };
  fs.writeFile(filePath, body, (err) => {
    if (err) {
      fs.writeFile(filePath, body, (retryErr) => {
        if (!retryErr) {
          record();
        }
      });
      return;
    }
    record();
  });
};

/** 按 content-type 识别响应类型；返回 null 表示跳过（图片等二进制） */
const classify = (contentType: unknown): SaveType | null => {
  if (!contentType || typeof contentType !== 'string') {
    return null;
  }
  const ct = contentType.toLowerCase();
  if (ct.includes('text/event-stream')) {
    return 'sse';
  }
  if (ct.includes('json')) {
    return 'json';
  }
  if (ct.includes('image/')) {
    return null;
  }
  if (ct.includes('text/')) {
    return 'text';
  }
  return null;
};

const extOf = (type: SaveType): string => (type === 'json' ? 'json' : 'txt');

/** 取请求路径最后一段作为方法名（去掉 query 与 hash） */
const getMethodName = (url?: string): string => {
  if (!url) {
    return 'unknown';
  }
  const pathname = url.split('?')[0]?.split('#')[0] ?? '';
  const segments = pathname.split('/').filter(Boolean);
  return segments.length ? (segments[segments.length - 1] ?? 'unknown') : 'unknown';
};

const toText = (body: unknown): string => {
  if (body == null) {
    return '';
  }
  if (Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'number' || typeof body === 'boolean' || typeof body === 'bigint') {
    return String(body);
  }
  return '';
};

/**
 * whistle 对 SSE 会把响应拆进 frames，res.body 常为空。
 * 插件侧 getFrames 的 isFrames 判断未覆盖 isSse，需临时打开 useFrames。
 */
const collectSseBody = (
  req: WhistleRequest,
  session: WhistleSession,
  cb: (body: string) => void,
): void => {
  if (typeof req.getFrames !== 'function') {
    cb('');
    return;
  }
  session.useFrames = true;
  const frames: Parameters<typeof joinSseFrames>[0] = [];
  const pull = (): void => {
    req.getFrames?.((batch) => {
      if (!batch || !Array.isArray(batch) || !batch.length) {
        cb(joinSseFrames(frames));
        return;
      }
      frames.push(...batch);
      pull();
    });
  };
  pull();
};

function resStatsServer(server: WhistleServer, { storage, config }: WhistlePluginContext): void {
  const username = config.username ? `${encodeURIComponent(config.username)}_` : '';
  server.on('request', (req) => {
    if (!storage.getProperty('saveActive')) {
      return;
    }
    const url = req.originalReq.url;
    const method = req.originalReq.method;
    if (!url || isStreamReq(url) || consumeMocked(url)) {
      return;
    }
    const rules = parseSaveRules(storage.getProperty('saveRules')).filter(
      (rule) =>
        rule.enabled &&
        rule.dir &&
        testPattern(url, rule.pattern) &&
        testMethod(method, rule.methods),
    );
    if (!rules.length) {
      return;
    }
    req.getSession((s) => {
      if (!s) {
        return;
      }
      const headers = s.resHeaders ?? s.res?.headers ?? {};
      const contentType = headers['content-type'] ?? headers['Content-Type'] ?? '';
      const saveType = classify(contentType);
      if (!saveType) {
        return;
      }
      const statusCode = s.statusCode ?? s.res?.statusCode;
      const apply = (body: string): void => {
        if (!body) {
          return;
        }
        for (const rule of rules) {
          if (!rule.saveTypes.includes(saveType)) {
            continue;
          }
          if (!testStatusCode(statusCode, rule.statusCodes)) {
            continue;
          }
          let output = body;
          if (saveType === 'json' && rule.prettyJson) {
            try {
              output = JSON.stringify(JSON.parse(body), null, 2);
            } catch {
              // 非标准 JSON 保留原内容
            }
          }
          if (rule.maxBodyKB > 0 && Buffer.byteLength(output, 'utf8') > rule.maxBodyKB * 1024) {
            continue;
          }
          const name = `${username}${getMethodName(url)}_${String(Date.now())}.${extOf(saveType)}`;
          saveBody(
            rule.dir,
            name,
            output,
            url,
            typeof contentType === 'string' ? contentType : '',
            method ?? '',
          );
        }
      };

      const body = toText(s.resBody ?? s.res?.body);
      if (body) {
        apply(body);
        return;
      }
      if (saveType === 'sse' || s.isSse || s.isCse) {
        collectSseBody(req, s, apply);
      }
    });
  });
}

export = resStatsServer;
