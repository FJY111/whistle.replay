/** 决定一次响应要不要落盘：命中保存规则，或耗时超过 1 秒 */

import { testMethod, testPattern } from './pattern';
import { testStatusCode } from './statusCodes';

export const SLOW_SAVE_MS = 1000;

const asTime = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** 从发出请求到收齐响应的毫秒数。缺少起点时返回 null。没有结束时间时用现在 */
export function responseDurationMs(
  input: {
    startTime?: unknown;
    requestTime?: unknown;
    endTime?: unknown;
  },
  now = Date.now(),
): number | null {
  const sent = asTime(input.requestTime) ?? asTime(input.startTime);
  const done = asTime(input.endTime) ?? now;
  if (sent == null || done < sent) {
    return null;
  }
  return done - sent;
}

/** 大于 1000ms 才因耗时保存；正好 1000ms 不算 */
export function isSlowSave(durationMs: number | null): boolean {
  return durationMs != null && durationMs > SLOW_SAVE_MS;
}

/** 空响应和二进制不保存。仅空白字符仍算非空 */
export function acceptResponseBody(text: string, binary: boolean): string | null {
  if (binary || text.length === 0) {
    return null;
  }
  return text;
}

export interface SaveRuleCheck {
  pattern: string;
  methods: string[];
  saveTypes: readonly string[];
  statusCodes: string;
}

/** 命中该规则，或本次响应超过 1 秒。大小上限由调用方另外判断 */
export function shouldSaveForRule(input: {
  rule: SaveRuleCheck;
  url: string;
  method: string | undefined;
  saveType: string;
  statusCode: number;
  slow: boolean;
}): boolean {
  if (input.slow) {
    return true;
  }
  return (
    testPattern(input.url, input.rule.pattern) &&
    testMethod(input.method, input.rule.methods) &&
    input.rule.saveTypes.includes(input.saveType) &&
    testStatusCode(input.statusCode, input.rule.statusCodes)
  );
}
