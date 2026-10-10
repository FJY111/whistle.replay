/** 回放目录的纯逻辑：同一匹配键只留最早一份，不按条数裁剪 */

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
  if (existing && existingFileExists && existing.time <= entry.time) {
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

/** 选全局最早的一份。最早的文件已不在时返回 null，不用更晚的那份顶上 */
export function selectReplay(candidates: readonly ReplayCandidate[]): ReplayCandidate | null {
  if (!candidates.length) {
    return null;
  }
  const ranked = candidates.slice().sort((a, b) => {
    if (a.entry.time !== b.entry.time) {
      return a.entry.time - b.entry.time;
    }
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.entry.file.localeCompare(b.entry.file);
  });
  const first = ranked[0];
  if (!first?.fileExists) {
    return null;
  }
  return first;
}
