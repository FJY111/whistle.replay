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

/** 选时间最新且文件仍在的一条。最新文件已不在时，用下一条仍在的 */
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
  return ranked.find((item) => item.fileExists) ?? null;
}
