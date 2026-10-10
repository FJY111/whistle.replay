/** 是否回放：总开关关闭则一律不回放；开启时只有命中白名单才回放。白名单可限制主机名、路径或两者 */

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

/** 白名单：域名只比主机名，路径只比 pathname。两者都填时必须同时命中 */
export function isReplayAllowed(
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

/** 总开关关闭，或未命中任一启用的白名单时，不回放 */
export function shouldReplay(
  replayActive: boolean,
  hostname: string,
  pathname: string,
  method: string,
  rules: readonly ReplayRule[],
): boolean {
  if (!replayActive) {
    return false;
  }
  return isReplayAllowed(hostname, pathname, method, rules);
}
