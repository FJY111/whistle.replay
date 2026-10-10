/** 回放命中标记与内置流式服务状态（进程内存） */

const MARK_TTL = 5 * 60 * 1000;

/** 同一匹配键上尚未被保存钩子消化的回放次数 */
const marks = new Map<string, number[]>();

const prune = (times: readonly number[], now: number): number[] =>
  times.filter((time) => now - time <= MARK_TTL);

export function markReplayed(key: string): void {
  if (!key) {
    return;
  }
  const now = Date.now();
  const next = prune(marks.get(key) ?? [], now);
  next.push(now);
  marks.set(key, next);
}

/** 这次响应来自回放时返回 true，并消化一次标记，避免把回放结果再保存 */
export function consumeReplayed(key: string): boolean {
  if (!key) {
    return false;
  }
  const now = Date.now();
  const next = prune(marks.get(key) ?? [], now);
  if (!next.length) {
    marks.delete(key);
    return false;
  }
  next.shift();
  if (next.length) {
    marks.set(key, next);
  } else {
    marks.delete(key);
  }
  return true;
}

let streamPort = 0;

export function setStreamPort(port: number): void {
  streamPort = port > 0 ? Math.floor(port) : 0;
}

export function getStreamPort(): number {
  return streamPort;
}

/** 是否为发往内置流式服务的内部请求（防止规则循环命中） */
export function isStreamReq(url: string): boolean {
  return streamPort > 0 && url.startsWith(`http://127.0.0.1:${String(streamPort)}/mock/`);
}
