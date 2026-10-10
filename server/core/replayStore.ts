/** 每个保存目录一份回放目录：按匹配键保留最早记录，不按 500 条裁剪 */

import fs from 'node:fs';
import path from 'node:path';

import type { ReplayEntry } from './model';

import { normalizeStatusCode } from './capture';
import { replayKey } from './pathname';
import { mergeReplayEntry, type ReplayMap, selectReplay } from './replayCatalog';
import { isSafeFileName } from './sanitize';

/** 写在用户指定的保存目录里，不能和现网 whistle.sake 的 .sake-replay.json 混用 */
export const REPLAY_FILE = '.replay-replay.json';

interface CacheEntry {
  mtimeMs: number;
  map: ReplayMap;
}

const cache = new Map<string, CacheEntry>();

const isStringRecord = (value: unknown): value is Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((item) => typeof item === 'string');
};

const parseEntry = (value: unknown): ReplayEntry | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const file = raw.file;
  const pathname = raw.pathname;
  const method = raw.method;
  if (!isSafeFileName(file) || typeof pathname !== 'string' || !pathname.startsWith('/')) {
    return null;
  }
  const key = replayKey(typeof method === 'string' ? method : '', pathname);
  if (!key || typeof raw.url !== 'string' || typeof raw.time !== 'number') {
    return null;
  }
  return {
    file,
    pathname,
    method: key.slice(0, key.indexOf(' ')),
    url: raw.url,
    time: raw.time,
    statusCode: normalizeStatusCode(raw.statusCode),
    contentType: typeof raw.contentType === 'string' ? raw.contentType : '',
    requestHeaders: isStringRecord(raw.requestHeaders) ? raw.requestHeaders : {},
    requestBody: typeof raw.requestBody === 'string' ? raw.requestBody : '',
    requestBodyOmitted: raw.requestBodyOmitted === true,
    responseHeaders: isStringRecord(raw.responseHeaders) ? raw.responseHeaders : {},
  };
};

export function readReplay(dir: string): ReplayMap {
  const filePath = path.join(dir, REPLAY_FILE);
  let mtimeMs = 0;
  try {
    mtimeMs = fs.statSync(filePath).mtimeMs;
  } catch {
    return {};
  }
  const hit = cache.get(dir);
  if (hit?.mtimeMs === mtimeMs) {
    return hit.map;
  }
  let map: ReplayMap = {};
  try {
    const data: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      map = {};
      for (const item of Object.values(data)) {
        const entry = parseEntry(item);
        if (entry) {
          map = mergeReplayEntry(map, entry, true);
        }
      }
    }
  } catch {
    map = {};
  }
  cache.set(dir, { mtimeMs, map });
  return map;
}

export function recordReplay(dir: string, entry: ReplayEntry): void {
  const key = replayKey(entry.method, entry.pathname);
  if (!key || !isSafeFileName(entry.file)) {
    return;
  }
  const current = readReplay(dir);
  const existing = current[key];
  const existingFileExists = existing ? fs.existsSync(path.join(dir, existing.file)) : false;
  const next = mergeReplayEntry(current, entry, existingFileExists);
  if (next === current) {
    return;
  }
  try {
    const filePath = path.join(dir, REPLAY_FILE);
    fs.writeFileSync(filePath, JSON.stringify(next));
    const mtimeMs = fs.statSync(filePath).mtimeMs;
    cache.set(dir, { mtimeMs, map: next });
  } catch {
    cache.delete(dir);
  }
}

export interface LocatedReplay {
  dir: string;
  entry: ReplayEntry;
}

/** 在多个保存目录中找该键最早且文件仍在的记录 */
export function findEarliestReplay(
  dirs: readonly string[],
  method: string,
  pathname: string,
): LocatedReplay | null {
  const key = replayKey(method, pathname);
  if (!key) {
    return null;
  }
  const candidates = dirs.flatMap((dir, order) => {
    const entry = readReplay(dir)[key];
    if (!entry) {
      return [];
    }
    return [
      {
        order,
        dir,
        entry,
        fileExists: fs.existsSync(path.join(dir, entry.file)),
      },
    ];
  });
  const selected = selectReplay(candidates);
  if (!selected) {
    return null;
  }
  return { dir: selected.dir, entry: selected.entry };
}

/** 按文件名找回记录：展示索引被裁掉后，最早一份仍在回放目录里 */
export function findReplayByFile(dir: string, file: string): ReplayEntry | null {
  if (!isSafeFileName(file)) {
    return null;
  }
  for (const entry of Object.values(readReplay(dir))) {
    if (entry.file === file) {
      return entry;
    }
  }
  return null;
}
