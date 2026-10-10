/** 从请求 URL 取出回放用的 pathname（不含协议、主机、端口、query、hash） */

/** 取第一个非空字符串 */
export function firstText(...values: (string | undefined)[]): string {
  for (const value of values) {
    if (value) {
      return value;
    }
  }
  return '';
}

/** 解析 pathname；无法解析时返回 null。不合并末尾斜杠，不改大小写 */
export function pathnameOf(url: string): string | null {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw || raw.startsWith('//')) {
    return null;
  }
  try {
    const base = raw.startsWith('/') ? 'http://replay.local' : undefined;
    const pathname = new URL(raw, base).pathname;
    if (!pathname.startsWith('/')) {
      return null;
    }
    return pathname;
  } catch {
    return null;
  }
}

export function normalizeMethod(method: string | undefined): string | null {
  if (!method) {
    return null;
  }
  const upper = method.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9-]*$/.test(upper)) {
    return null;
  }
  return upper;
}

/** 回放键：大写方法 + 一个空格 + pathname */
export function replayKey(method: string, pathname: string): string | null {
  const normalized = normalizeMethod(method);
  if (!normalized || !pathname.startsWith('/')) {
    return null;
  }
  return `${normalized} ${pathname}`;
}
