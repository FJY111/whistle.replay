/** 跨规则的配置派生能力 */

import { parseMockRules, parseSaveRules } from './sanitize';

import type { WhistleStorage } from '../types/whistle';

/** 全部规则中配置过的目录集合（用于校验流式服务与文件读取 CGI 的 dir 参数） */
export function getConfiguredDirs(storage: WhistleStorage): string[] {
  const dirs = new Set<string>();
  for (const rule of parseSaveRules(storage.getProperty('saveRules'))) {
    if (rule.dir) {
      dirs.add(rule.dir);
    }
  }
  for (const rule of parseMockRules(storage.getProperty('mockRules'))) {
    if (rule.dir) {
      dirs.add(rule.dir);
    }
  }
  return [...dirs];
}
