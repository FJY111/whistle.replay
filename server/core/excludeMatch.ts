/** 排除规则：只和 pathname 比较，命中任一启用规则则不回放 */

import type { ExcludeRule } from './model';

import { testMethod, testPattern } from './pattern';

export function isReplayExcluded(
  pathname: string,
  method: string,
  rules: readonly ExcludeRule[],
): boolean {
  return rules.some(
    (rule) =>
      rule.enabled && testPattern(pathname, rule.pattern) && testMethod(method, rule.methods),
  );
}
