/** 是否回放：总开关开启，且命中白名单，且未命中黑名单。两边都可限制主机名、路径或两者 */

import type { ReplayRule } from './model';

import { testMethod, testPattern } from './pattern';

/** 未写入存储时视为开启 */
export function isReplayActive(value: unknown): boolean {
  return value !== false;
}

/** 空 pattern 表示这一侧不限制；非空时沿用子串或 /正则/ */
function matchesOptional(value: string, pattern: string): boolean {
  if (!pattern) {
    return true;
  }
  return testPattern(value, pattern);
}

/** 域名只比主机名，路径只比 pathname。两者都填时必须同时命中。停用或两项都空的规则不算 */
function matchesAnyRule(
  hostname: string,
  pathname: string,
  method: string,
  rules: readonly ReplayRule[],
): boolean {
  return rules.some((rule) => {
    if (!rule.enabled || !testMethod(method, rule.methods)) {
      return false;
    }
    if (!rule.host && !rule.pattern) {
      return false;
    }
    return matchesOptional(hostname, rule.host) && matchesOptional(pathname, rule.pattern);
  });
}

/** 白名单：命中任一启用规则才允许进入回放 */
export function isReplayAllowed(
  hostname: string,
  pathname: string,
  method: string,
  rules: readonly ReplayRule[],
): boolean {
  return matchesAnyRule(hostname, pathname, method, rules);
}

/** 黑名单：命中任一启用规则就不回放。匹配方式和白名单相同 */
export function isReplayBlocked(
  hostname: string,
  pathname: string,
  method: string,
  rules: readonly ReplayRule[],
): boolean {
  return matchesAnyRule(hostname, pathname, method, rules);
}

/**
 * 总开关关闭、未命中白名单，或命中黑名单时，不回放。
 * 黑名单为空时只看白名单。
 */
export function shouldReplay(
  replayActive: boolean,
  hostname: string,
  pathname: string,
  method: string,
  allowRules: readonly ReplayRule[],
  blockRules: readonly ReplayRule[] = [],
): boolean {
  if (!replayActive) {
    return false;
  }
  if (!isReplayAllowed(hostname, pathname, method, allowRules)) {
    return false;
  }
  return !isReplayBlocked(hostname, pathname, method, blockRules);
}
