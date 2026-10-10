/** 从 whistle 会话里取出可保存的文本正文，并按上限裁剪请求体 */

import { MAX_BODY_KB_LIMIT } from './model';

export interface ReadBody {
  text: string;
  /** whistle 用 false 表示没有文本正文（常见于二进制） */
  binary: boolean;
}

export function readBody(body: unknown): ReadBody {
  if (body === false) {
    return { text: '', binary: true };
  }
  if (body == null) {
    return { text: '', binary: false };
  }
  if (Buffer.isBuffer(body)) {
    return { text: body.toString('utf8'), binary: false };
  }
  if (typeof body === 'string') {
    return { text: body, binary: false };
  }
  if (typeof body === 'number' || typeof body === 'boolean' || typeof body === 'bigint') {
    return { text: String(body), binary: false };
  }
  return { text: '', binary: false };
}

export function requestBodyLimit(maxBodyKB: number): number {
  const kb = maxBodyKB > 0 ? maxBodyKB : MAX_BODY_KB_LIMIT;
  return kb * 1024;
}

/** 请求体超限时不写入，调用方仍可保存响应 */
export function fitRequestBody(
  text: string,
  binary: boolean,
  maxBodyKB: number,
): { requestBody: string; requestBodyOmitted: boolean } {
  if (binary) {
    return { requestBody: '', requestBodyOmitted: true };
  }
  if (Buffer.byteLength(text, 'utf8') > requestBodyLimit(maxBodyKB)) {
    return { requestBody: '', requestBodyOmitted: true };
  }
  return { requestBody: text, requestBodyOmitted: false };
}

export function normalizeStatusCode(code: unknown): number {
  const value = typeof code === 'number' ? code : typeof code === 'string' ? Number(code) : NaN;
  if (!Number.isInteger(value) || value < 100 || value > 599) {
    return 200;
  }
  return value;
}
