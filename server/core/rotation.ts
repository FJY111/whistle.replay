/** mock 文件选择器：fixed / round-robin / random（轮换状态为进程内存） */

import type { MockMode } from './model';

const counters = new Map<string, number>();

/** 按模式从规则的文件列表中选出一个文件；列表为空返回 null */
export function pickFile(ruleId: string, files: string[], mode: MockMode): string | null {
  if (!files.length) {
    return null;
  }
  if (mode === 'random') {
    return files[Math.floor(Math.random() * files.length)] ?? null;
  }
  if (mode === 'fixed') {
    return files[0] ?? null;
  }
  const index = counters.get(ruleId) ?? 0;
  const file = files[index % files.length] ?? null;
  counters.set(ruleId, index + 1);
  return file;
}

/** 重置轮换进度：不传 ruleId 则全部重置 */
export function resetRotation(ruleId?: string): void {
  if (typeof ruleId === 'string') {
    counters.delete(ruleId);
    return;
  }
  counters.clear();
}
