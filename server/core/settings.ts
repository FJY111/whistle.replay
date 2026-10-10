/** 跨规则的配置派生能力 */

import { parseSaveRules } from './sanitize';

import type { WhistleStorage } from '../types/whistle';

/** 保存规则里配置过的目录（含暂时停用的规则），顺序与规则列表一致 */
export function getSaveDirs(storage: WhistleStorage): string[] {
  const dirs: string[] = [];
  for (const rule of parseSaveRules(storage.getProperty('saveRules'))) {
    if (rule.dir && !dirs.includes(rule.dir)) {
      dirs.push(rule.dir);
    }
  }
  return dirs;
}

/** 文件读取与流式回放允许访问的目录 */
export function getConfiguredDirs(storage: WhistleStorage): string[] {
  return getSaveDirs(storage);
}
