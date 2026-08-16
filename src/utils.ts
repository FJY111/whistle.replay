import type { FileInfo, MockType } from './types';

export const fmtSize = (size: number): string => {
  if (size < 1024) {
    return `${String(size)} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export const fmtTime = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 由文件元数据推断 mock 响应类型 */
export const inferType = (file: FileInfo): MockType => {
  const ct = (file.contentType ?? '').toLowerCase();
  if (ct.includes('event-stream')) {
    return 'sse';
  }
  if (ct.includes('json') || file.name.endsWith('.json')) {
    return 'json';
  }
  return 'text';
};

/** 由文件元数据推断默认匹配规则（优先来源 URL 的路径） */
export const defaultPattern = (file: FileInfo): string => {
  if (file.url) {
    try {
      const u = new URL(file.url);
      return u.pathname === '/' ? u.hostname : u.pathname;
    } catch {
      // 索引中的 URL 异常时退回文件名推断
    }
  }
  return file.name.replace(/_\d+\.(json|txt)$/i, '');
};

/** 校验 pattern：子串恒合法，/正则/ 需可编译 */
export const isValidPattern = (pattern: string): boolean => {
  const p = pattern.trim();
  if (!p) {
    return false;
  }
  const matched = /^\/(.+)\/(i)?$/.exec(p);
  if (!matched) {
    return true;
  }
  try {
    new RegExp(matched[1] ?? '', matched[2] ?? '');
    return true;
  } catch {
    return false;
  }
};

export const isValidStatusCodes = (input: string): boolean => {
  const value = input.trim();
  if (!value) {
    return true;
  }
  return value.split(',').every((raw) => {
    const matched = /^(\d{3})(?:\s*-\s*(\d{3}))?$/.exec(raw.trim());
    if (!matched) {
      return false;
    }
    const start = Number(matched[1]);
    const end = Number(matched[2] ?? matched[1]);
    return start >= 100 && end >= start && end <= 599;
  });
};

export const matchesQuery = (query: string, ...fields: (string | undefined)[]): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return fields.some((field) => field?.toLowerCase().includes(q) === true);
};
