import fs from 'node:fs';
import path from 'node:path';

import type { CaptureMeta, SaveType } from './core/model';
import type {
  WhistlePluginContext,
  WhistleRequest,
  WhistleServer,
  WhistleSession,
} from './types/whistle';

import { fitRequestBody, normalizeStatusCode, readBody } from './core/capture';
import { captureHeaders, replayResponseHeaders } from './core/headers';
import { consumeReplayed, isStreamReq } from './core/mockMark';
import { firstText, normalizeMethod, pathnameOf, replayKey } from './core/pathname';
import { commitSavedCapture } from './core/replayStore';
import { parseSaveRules } from './core/sanitize';
import {
  acceptResponseBody,
  isSlowSave,
  responseDurationMs,
  shouldSaveForRule,
} from './core/savePolicy';
import { joinSseFrames } from './sseStream';

const requestUrlOf = (req: WhistleRequest): string =>
  firstText(req.originalReq.fullUrl, req.originalReq.url);

/** 保存响应体，并写入展示索引与回放目录 */
const saveBody = (dir: string, fileName: string, body: string, meta: CaptureMeta): void => {
  const filePath = path.resolve(dir, fileName);
  const record = (): void => {
    commitSavedCapture(dir, fileName, meta);
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
  const pathname = pathnameOf(url) ?? '';
  const segments = pathname.split('/').filter(Boolean);
  return segments.length ? (segments[segments.length - 1] ?? 'unknown') : 'unknown';
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
    const url = requestUrlOf(req);
    const method = req.originalReq.method;
    if (!url || isStreamReq(url)) {
      return;
    }
    const pathname = pathnameOf(url);
    const normalizedMethod = normalizeMethod(method);
    const key = pathname && normalizedMethod ? replayKey(normalizedMethod, pathname) : null;
    if (key && consumeReplayed(key)) {
      return;
    }
    const rules = parseSaveRules(storage.getProperty('saveRules')).filter(
      (rule) => rule.enabled && rule.dir,
    );
    if (!rules.length) {
      return;
    }
    req.getSession((s) => {
      if (!s) {
        return;
      }
      const slow = isSlowSave(responseDurationMs(s));
      const rawHeaders = s.res?.headers ?? s.resHeaders ?? {};
      const capturedResponseHeaders = captureHeaders(rawHeaders);
      const contentType = capturedResponseHeaders['content-type'] ?? '';
      const saveType = classify(contentType);
      if (!saveType) {
        return;
      }
      const statusCode = normalizeStatusCode(
        s.res?.statusCode ?? s.statusCode ?? req.originalRes?.statusCode,
      );
      const responseHeaders = replayResponseHeaders(capturedResponseHeaders);
      const requestHeaders = captureHeaders(
        s.req?.headers ?? req.originalReq.headers ?? req.headers,
      );
      const requestRaw = readBody(s.req?.body);
      const savedAt = Date.now();

      const apply = (body: string): void => {
        for (const rule of rules) {
          if (
            !shouldSaveForRule({
              rule,
              url,
              method,
              saveType,
              statusCode,
              slow,
            })
          ) {
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
          const fitted = fitRequestBody(requestRaw.text, requestRaw.binary, rule.maxBodyKB);
          const unique = Math.random().toString(36).slice(2, 8);
          const name = `${username}${getMethodName(url)}_${String(savedAt)}_${unique}.${extOf(saveType)}`;
          const meta: CaptureMeta = {
            url,
            pathname: pathname ?? '',
            method: normalizedMethod ?? '',
            time: savedAt,
            statusCode,
            contentType,
            requestHeaders,
            requestBody: fitted.requestBody,
            requestBodyOmitted: fitted.requestBodyOmitted,
            responseHeaders,
          };
          saveBody(rule.dir, name, output, meta);
        }
      };

      const response = readBody(s.resBody ?? s.res?.body);
      const text = acceptResponseBody(response.text, response.binary);
      if (text == null) {
        return;
      }
      if ((saveType === 'sse' || s.isSse || s.isCse) && text === '') {
        collectSseBody(req, s, apply);
        return;
      }
      apply(text);
    });
  });
}

export = resStatsServer;
