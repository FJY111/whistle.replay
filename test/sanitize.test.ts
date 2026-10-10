import { expect, test } from 'bun:test';

import {
  isSafeFileName,
  parseBlockRules,
  parseReplayRules,
  parseSaveRules,
  sanitizeReplayRules,
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

test('sanitizeReplayRules: 只保留路径和方法，丢弃非法 pattern', () => {
  const rules = sanitizeReplayRules([
    { id: 'e1', enabled: true, pattern: '/health', methods: ['get'] },
    { pattern: '/[/' },
    { pattern: '' },
    { host: '/[/', pattern: '/ok' },
    { host: 'shop.example' },
    { host: '/^api\\./i', pattern: '/v1' },
  ]);
  expect(rules).toHaveLength(3);
  expect(rules[0]).toEqual({
    id: 'e1',
    name: '回放 1',
    enabled: true,
    host: '',
    pattern: '/health',
    methods: ['GET'],
  });
  expect(rules[1]).toMatchObject({ host: 'shop.example', pattern: '', methods: [] });
  expect(rules[2]).toMatchObject({ host: '/^api\\./i', pattern: '/v1' });
});

test('parse: 从 storage 字符串解析，坏数据返回空列表', () => {
  expect(parseSaveRules('not-json')).toHaveLength(0);
  expect(parseSaveRules(null)).toHaveLength(0);
  expect(parseReplayRules(undefined)).toHaveLength(0);
  expect(parseSaveRules(JSON.stringify([{ pattern: '/a' }]))).toHaveLength(1);
  expect(parseReplayRules(JSON.stringify([{ pattern: '/health', enabled: true }]))).toHaveLength(1);
  expect(parseBlockRules(JSON.stringify([{ host: 'shop.example', enabled: true }]))[0]?.name).toBe(
    '黑名单 1',
  );
  expect(parseBlockRules('not-json')).toHaveLength(0);
});
