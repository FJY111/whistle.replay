/** 回放目录的纯逻辑：同一匹配键只留最新一条，不按条数裁剪 */

import type { ReplayEntry } from './model';

import { replayKey } from './pathname';

export type ReplayMap = Record<string, ReplayEntry>;

export function mergeReplayEntry(
  map: ReplayMap,
  entry: ReplayEntry,
  existingFileExists: boolean,
): ReplayMap {
  const key = replayKey(entry.method, entry.pathname);
  if (!key) {
    return map;
  }
  const existing = map[key];
  if (existing && existingFileExists && existing.time > entry.time) {
    return map;
  }
  return { ...map, [key]: entry };
}

export interface ReplayCandidate {
  order: number;
  dir: string;
  entry: ReplayEntry;
  fileExists: boolean;
}

/** 选时间最新、文件仍在、且未标不回放的一条。跳过的记录和缺失文件一样，改看下一条 */
export function selectReplay(candidates: readonly ReplayCandidate[]): ReplayCandidate | null {
  if (!candidates.length) {
    return null;
  }
  const ranked = candidates.slice().sort((a, b) => {
    if (a.entry.time !== b.entry.time) {
      return b.entry.time - a.entry.time;
    }
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.entry.file.localeCompare(b.entry.file);
  });
  return ranked.find((item) => item.fileExists && item.entry.skipReplay !== true) ?? null;
}

export interface IndexCapture {
  method?: string;
  pathname?: string;
  statusCode?: number;
  time?: number;
}

export interface SavedCapture {
  dir: string;
  file: string;
  method: string;
  pathname: string;
  statusCode: number | null;
  time: number;
  inReplay: boolean;
  skipReplay: boolean;
  /** 按现有回放规则，这条会被选中 */
  active: boolean;
}

export interface SavedCaptureDir {
  dir: string;
  order: number;
  replay: ReplayMap;
  index: Record<string, IndexCapture>;
}

/** 列出回放记录，并带上索引里有、回放记录里没有的文件。不按条数裁剪 */
export function listSavedCaptures(
  dirs: readonly SavedCaptureDir[],
  fileExists: (dir: string, file: string) => boolean,
): SavedCapture[] {
  const activeKeys = new Set<string>();
  const byKey = new Map<string, ReplayCandidate[]>();
  for (const source of dirs) {
    for (const entry of Object.values(source.replay)) {
      const key = replayKey(entry.method, entry.pathname);
      if (!key) {
        continue;
      }
      const list = byKey.get(key) ?? [];
      list.push({
        order: source.order,
        dir: source.dir,
        entry,
        fileExists: fileExists(source.dir, entry.file),
      });
      byKey.set(key, list);
    }
  }
  for (const candidates of byKey.values()) {
    const selected = selectReplay(candidates);
    if (selected) {
      activeKeys.add(`${selected.dir}\n${selected.entry.file}`);
    }
  }

  const rows: SavedCapture[] = [];
  for (const source of dirs) {
    const replayFiles = new Set<string>();
    for (const entry of Object.values(source.replay)) {
      replayFiles.add(entry.file);
      rows.push({
        dir: source.dir,
        file: entry.file,
        method: entry.method,
        pathname: entry.pathname,
        statusCode: entry.statusCode,
        time: entry.time,
        inReplay: true,
        skipReplay: entry.skipReplay === true,
        active: activeKeys.has(`${source.dir}\n${entry.file}`),
      });
    }
    for (const [file, item] of Object.entries(source.index)) {
      if (replayFiles.has(file)) {
        continue;
      }
      rows.push({
        dir: source.dir,
        file,
        method: item.method ?? '',
        pathname: item.pathname ?? '',
        statusCode: typeof item.statusCode === 'number' ? item.statusCode : null,
        time: typeof item.time === 'number' ? item.time : 0,
        inReplay: false,
        skipReplay: false,
        active: false,
      });
    }
  }
  rows.sort((a, b) => b.time - a.time || a.file.localeCompare(b.file));
  return rows;
}
