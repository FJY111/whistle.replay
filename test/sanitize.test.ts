import { expect, test } from 'bun:test';

import {
  isSafeFileName,
  parseMockRules,
  parseSaveRules,
  sanitizeMockRules,
  sanitizeSaveRules,
} from '../server/core/sanitize';

test('isSafeFileName: 拒绝路径穿越与非白名单扩展名', () => {
  expect(isSafeFileName('a.json')).toBe(true);
  expect(isSafeFileName('b.txt')).toBe(true);
  expect(isSafeFileName('../a.json')).toBe(false);
  expect(isSafeFileName('dir/a.json')).toBe(false);
  expect(isSafeFileName('.hidden.json')).toBe(false);
  expect(isSafeFileName('a.exe')).toBe(false);
  expect(isSafeFileName('')).toBe(false);
  expect(isSafeFileName(null)).toBe(false);
});

test('sanitizeSaveRules: 填充默认值并保留合法字段', () => {
  const rules = sanitizeSaveRules([
    {
      id: 'r1',
      name: ' 用户接口 ',
      enabled: true,
      pattern: '/api/user',
      methods: ['get', 'post', 'bad'],
      dir: '/tmp/save',
      saveTypes: ['json', 'sse'],
      maxBodyKB: 100,
      statusCodes: '200-299,304',
      prettyJson: true,
    },
  ]);
  expect(rules).toHaveLength(1);
  expect(rules[0]).toEqual({
    id: 'r1',
    name: '用户接口',
    enabled: true,
    pattern: '/api/user',
    methods: ['GET', 'POST'],
    dir: '/tmp/save',
    saveTypes: ['json', 'sse'],
    maxBodyKB: 100,
    statusCodes: '200-299,304',
    prettyJson: true,
  });
});

test('sanitizeSaveRules: 丢弃非法 pattern，生成缺失 id 与名称', () => {
  const rules = sanitizeSaveRules([
    { pattern: '/[/', enabled: true },
    { pattern: '', enabled: true },
    { pattern: '/api', enabled: true },
  ]);
  expect(rules).toHaveLength(1);
  expect(rules[0]?.id).toBeTruthy();
  expect(rules[0]?.name).toBeTruthy();
  expect(rules[0]?.methods).toEqual([]);
  expect(rules[0]?.saveTypes).toEqual(['json', 'text']);
  expect(rules[0]?.maxBodyKB).toBe(0);
  expect(rules[0]?.statusCodes).toBe('');
  expect(rules[0]?.prettyJson).toBe(false);
});

test('sanitizeSaveRules: id 去重、数量封顶、maxBodyKB 取整截断', () => {
  const rules = sanitizeSaveRules([
    { id: 'dup', pattern: '/a', maxBodyKB: 999999 },
    { id: 'dup', pattern: '/b' },
  ]);
  expect(rules).toHaveLength(1);
  expect(rules[0]?.maxBodyKB).toBe(10240);
  expect(sanitizeSaveRules(new Array(300).fill({ pattern: '/x' }))).toHaveLength(200);
});

test('sanitizeMockRules: 无合法文件的规则被丢弃', () => {
  const rules = sanitizeMockRules([
    { pattern: '/a', files: [] },
    { pattern: '/a', files: ['../x.json'] },
    { pattern: '/a', files: ['ok.json'] },
  ]);
  expect(rules).toHaveLength(1);
  expect(rules[0]?.files).toEqual(['ok.json']);
});

test('sanitizeMockRules: 模式与类型推断、delay 封顶、文件去重', () => {
  const rules = sanitizeMockRules([
    {
      id: 'm1',
      enabled: true,
      pattern: '/api',
      dir: '/tmp',
      files: ['a.json', 'a.json', 'b.txt'],
      mode: 'round-robin',
      delay: 99999,
      delayJitter: 8000,
      hitRate: 25,
      statusCode: 503,
      headers: { 'X-Mock': 'yes', Bad: 1 },
    },
    { pattern: '/b', files: ['c.txt'], mode: 'weird', type: 'sse' },
  ]);
  expect(rules).toHaveLength(2);
  expect(rules[0]?.files).toEqual(['a.json', 'b.txt']);
  expect(rules[0]?.mode).toBe('round-robin');
  expect(rules[0]?.type).toBe('json');
  expect(rules[0]?.delay).toBe(5000);
  expect(rules[0]?.delayJitter).toBe(5000);
  expect(rules[0]?.hitRate).toBe(25);
  expect(rules[0]?.statusCode).toBe(503);
  expect(rules[0]?.headers).toEqual({ 'x-mock': 'yes' });
  expect(rules[1]?.mode).toBe('fixed');
  expect(rules[1]?.type).toBe('sse');
});

test('parse: 从 storage 字符串解析，坏数据返回空列表', () => {
  expect(parseSaveRules('not-json')).toHaveLength(0);
  expect(parseSaveRules(null)).toHaveLength(0);
  expect(parseMockRules(undefined)).toHaveLength(0);
  expect(parseSaveRules(JSON.stringify([{ pattern: '/a' }]))).toHaveLength(1);
  expect(parseMockRules(JSON.stringify([{ pattern: '/a', files: ['x.json'] }]))).toHaveLength(1);
});
