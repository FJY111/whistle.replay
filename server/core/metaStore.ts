/** 保存目录内的索引文件管理：记录每个响应文件的来源信息 */

import fs from 'node:fs';
import path from 'node:path';

/** 写在用户指定的保存目录里，不能和现网 whistle.sake 的 .sake-index.json 混用 */
export const INDEX_FILE = '.replay-index.json';
export const MAX_META = 500;

export interface FileMeta {
  url: string;
  contentType: string;
  method?: string;
  time: number;
  pathname?: string;
  statusCode?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  requestBodyOmitted?: boolean;
  responseHeaders?: Record<string, string>;
}

export type MetaMap = Record<string, FileMeta>;

export function readMeta(dir: string): MetaMap {
  try {
    const raw = fs.readFileSync(path.join(dir, INDEX_FILE), 'utf8');
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {};
    }
    return data as MetaMap;
  } catch {
    return {};
  }
}

export function recordMeta(
  dir: string,
  file: string,
  meta: FileMeta,
  removeFiles: readonly string[] = [],
): void {
  try {
    const data = readMeta(dir);
    const removed = new Set(removeFiles.filter((name) => name !== file));
    const kept: MetaMap = {};
    for (const [name, item] of Object.entries(data)) {
      if (!removed.has(name)) {
        kept[name] = item;
      }
    }
    kept[file] = meta;
    const keys = Object.keys(kept);
    keys.sort((a, b) => (kept[b]?.time ?? 0) - (kept[a]?.time ?? 0));
    const next: MetaMap = {};
    for (const key of keys.slice(0, MAX_META)) {
      const item = kept[key];
      if (item) {
        next[key] = item;
      }
    }
    fs.writeFileSync(path.join(dir, INDEX_FILE), JSON.stringify(next));
  } catch {
    // 索引仅用于展示与类型推断，失败不影响保存主流程
  }
}
