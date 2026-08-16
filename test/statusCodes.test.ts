import { expect, test } from 'bun:test';

import {
  isValidStatusCodes,
  normalizeStatusCodes,
  testStatusCode,
} from '../server/core/statusCodes';

test('normalizeStatusCodes: 清洗区间、去重并忽略非法项', () => {
  expect(normalizeStatusCodes(' 200-299, 304,304, 99, 500-400, abc ')).toBe('200-299,304');
});

test('isValidStatusCodes: 支持空值、单值与区间', () => {
  expect(isValidStatusCodes('')).toBe(true);
  expect(isValidStatusCodes('200-299,304')).toBe(true);
  expect(isValidStatusCodes('200-999')).toBe(false);
  expect(isValidStatusCodes('ok')).toBe(false);
});

test('testStatusCode: 空表达式匹配全部，其余按区间匹配', () => {
  expect(testStatusCode(undefined, '')).toBe(true);
  expect(testStatusCode(204, '200-299,304')).toBe(true);
  expect(testStatusCode(304, '200-299,304')).toBe(true);
  expect(testStatusCode(500, '200-299,304')).toBe(false);
});
