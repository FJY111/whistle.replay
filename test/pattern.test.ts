import { expect, test } from 'bun:test';

import { isValidPattern, testMethod, testPattern } from '../server/core/pattern';

test('testPattern: 子串匹配', () => {
  expect(testPattern('https://a.com/api/user?id=1', '/api/user')).toBe(true);
  expect(testPattern('https://a.com/api/user', 'order')).toBe(false);
  expect(testPattern('https://a.com', '')).toBe(false);
  expect(testPattern('', '/api')).toBe(false);
});

test('testPattern: /正则/ 与 /正则/i', () => {
  expect(testPattern('https://a.com/api/user/1', '/\\/api\\/user\\/\\d+$/')).toBe(true);
  expect(testPattern('https://a.com/API/User', '/\\/api\\/user/i')).toBe(true);
  expect(testPattern('https://a.com/api/user', '/\\/order/')).toBe(false);
  expect(testPattern('https://a.com', '/[/')).toBe(false);
});

test('testMethod: 空列表匹配全部方法', () => {
  expect(testMethod('GET', [])).toBe(true);
  expect(testMethod(undefined, [])).toBe(true);
});

test('testMethod: 限定方法时大小写不敏感', () => {
  expect(testMethod('POST', ['POST'])).toBe(true);
  expect(testMethod('post', ['POST'])).toBe(true);
  expect(testMethod('GET', ['POST'])).toBe(false);
  expect(testMethod(undefined, ['POST'])).toBe(false);
});

test('isValidPattern', () => {
  expect(isValidPattern('/api/user')).toBe(true);
  expect(isValidPattern('/\\/api/')).toBe(true);
  expect(isValidPattern('/[/')).toBe(false);
  expect(isValidPattern('')).toBe(false);
  expect(isValidPattern('   ')).toBe(false);
});
