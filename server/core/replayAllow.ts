/** 是否回放：总开关关闭则一律不回放；开启时只有命中白名单才回放 */

import type { ReplayRule } from './model';

import { testMethod, testPattern } from './pattern';

/** 未写入存储时视为开启 */
export function isReplayActive(value: unknown): boolean {
  return value !== false;
}

/** 白名单只和 pathname 比较，语法与保存规则相同（子串或 /正则/） */
export function isReplayAllowed(
  pathname: string,
  method: string,
  rules: readonly ReplayRule[],
): boolean {
  return rules.some(
    (rule) =>
      rule.enabled && testPattern(pathname, rule.pattern) && testMethod(method, rule.methods),
  );
}

/** 总开关关闭，或未命中任一启用的白名单时，不回放 */
export function shouldReplay(
  replayActive: boolean,
  pathname: string,
  method: string,
  rules: readonly ReplayRule[],
): boolean {
  if (!replayActive) {
    return false;
  }
  return isReplayAllowed(pathname, method, rules);
}
