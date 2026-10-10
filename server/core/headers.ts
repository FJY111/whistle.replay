/** 抓包头的清洗，以及回放时要去掉的传输层字段 */

import { MAX_CAPTURE_HEADERS, MAX_HEADER_NAME_LEN, MAX_HEADER_VALUE_LEN } from './model';

const HOP_BY_HOP = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9a-z]+$/;

const joinValue = (name: string, value: string[]): string => {
  if (name === 'set-cookie') {
    return value.join('\n');
  }
  return value.join(', ');
};

/** 把 whistle 的头对象收成小写字符串头；超长截断 */
export function captureHeaders(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(input)) {
    if (Object.keys(result).length >= MAX_CAPTURE_HEADERS) {
      break;
    }
    const name = rawName.trim().toLowerCase().slice(0, MAX_HEADER_NAME_LEN);
    if (!name || name === 'prototype' || name === 'constructor' || name === '__proto__') {
      continue;
    }
    if (!HEADER_NAME_RE.test(name)) {
      continue;
    }
    const cleanPart = (part: string): string => part.replace(/[\r\n]+/g, ' ');
    let value = '';
    if (typeof rawValue === 'string') {
      value = cleanPart(rawValue);
    } else if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      value = cleanPart(String(rawValue));
    } else if (Array.isArray(rawValue)) {
      const parts = rawValue
        .filter((item): item is string => typeof item === 'string')
        .map(cleanPart);
      value = joinValue(name, parts);
    } else {
      continue;
    }
    result[name] = value.slice(0, MAX_HEADER_VALUE_LEN);
  }
  return result;
}

/** 回放响应头：去掉传输层字段，避免把已解码正文再套一层编码 */
export function replayResponseHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (!HOP_BY_HOP.has(name)) {
      result[name] = value;
    }
  }
  return result;
}
