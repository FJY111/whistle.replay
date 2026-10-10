import { expect, test } from 'bun:test';

import {
  acceptResponseBody,
  isSlowSave,
  responseDurationMs,
  shouldSaveForRule,
} from '../server/core/savePolicy';

const rule = {
  pattern: 'shop.example/api/items',
  methods: ['GET'],
  saveTypes: ['json', 'text'],
  statusCodes: '200',
};

test('acceptResponseBody: 空字符串不保存，二进制不保存', () => {
  expect(acceptResponseBody('', false)).toBeNull();
  expect(acceptResponseBody(' ', false)).toBe(' ');
  expect(acceptResponseBody('{}', false)).toBe('{}');
  expect(acceptResponseBody('', true)).toBeNull();
  expect(acceptResponseBody('png', true)).toBeNull();
});

test('空响应即使命中规则或耗时超过 1 秒也不保存', () => {
  const hit = {
    rule,
    url: 'https://shop.example/api/items',
    method: 'GET',
    saveType: 'json',
    statusCode: 200,
    slow: false,
  };
  expect(shouldSaveForRule(hit)).toBe(true);
  expect(shouldSaveForRule({ ...hit, slow: true, url: 'https://other.example/health' })).toBe(true);
  expect(acceptResponseBody('', false)).toBeNull();
});

test('responseDurationMs: 从发出请求到收齐响应，大于 1000ms 才算慢', () => {
  expect(responseDurationMs({ requestTime: 1_000, endTime: 2_001 })).toBe(1001);
  expect(isSlowSave(1001)).toBe(true);
  expect(isSlowSave(1000)).toBe(false);
  expect(responseDurationMs({ startTime: 5_000, endTime: 5_500 })).toBe(500);
  expect(responseDurationMs({ requestTime: 10, endTime: 9 })).toBeNull();
  expect(responseDurationMs({})).toBeNull();
});

test('shouldSaveForRule: 命中规则或耗时超过 1 秒，满足任一即保存', () => {
  const hit = {
    rule,
    url: 'https://shop.example/api/items',
    method: 'GET',
    saveType: 'json',
    statusCode: 200,
    slow: false,
  };
  expect(shouldSaveForRule(hit)).toBe(true);
  expect(shouldSaveForRule({ ...hit, url: 'https://other.example/health', slow: true })).toBe(true);
  expect(shouldSaveForRule({ ...hit, url: 'https://other.example/health', slow: false })).toBe(
    false,
  );
  expect(shouldSaveForRule({ ...hit, statusCode: 500, slow: true })).toBe(true);
  expect(shouldSaveForRule({ ...hit, statusCode: 500, slow: false })).toBe(false);
});
