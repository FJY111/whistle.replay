/** mock 命中标记与内置流式服务状态（进程内存） */

const MARK_TTL = 60 * 1000;
const MARK_MAX = 1000;

const marks = new Map<string, number>();

export function markMocked(url: string): void {
  if (!url) {
    return;
  }
  if (marks.size >= MARK_MAX) {
    const now = Date.now();
    for (const [key, time] of marks) {
      if (now - time > MARK_TTL) {
        marks.delete(key);
      }
    }
  }
  marks.set(url, Date.now());
}

export function consumeMocked(url: string): boolean {
  const time = marks.get(url);
  if (time == null) {
    return false;
  }
  marks.delete(url);
  return Date.now() - time <= MARK_TTL;
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
