import { expect, test } from 'bun:test';

import type { ReplayEntry, ReplayRule } from '../server/core/model';

import { fitRequestBody, normalizeStatusCode, readBody } from '../server/core/capture';
import { captureHeaders, replayResponseHeaders } from '../server/core/headers';
import { hostnameOf, normalizeMethod, pathnameOf, replayKey } from '../server/core/pathname';
import { isReplayActive, shouldReplay } from '../server/core/replayAllow';
import { mergeReplayEntry, selectReplay } from '../server/core/replayCatalog';
import { buildFileReplay, buildSseReplay } from '../server/core/replayRule';

const entry = (over: Partial<ReplayEntry> & Pick<ReplayEntry, 'file' | 'time'>): ReplayEntry => ({
  url: 'https://example.com/api/items?x=1',
  pathname: '/api/items',
  method: 'GET',
  statusCode: 200,
  contentType: 'application/json',
  requestHeaders: {},
  requestBody: '',
  requestBodyOmitted: false,
  responseHeaders: { 'content-type': 'application/json' },
  ...over,
});

test('pathnameOf: 只留路径，忽略协议、主机、端口、query 和 hash', () => {
  expect(pathnameOf('https://a.example:8443/api/items?x=1#top')).toBe('/api/items');
  expect(pathnameOf('http://b.example/api/items')).toBe('/api/items');
  expect(pathnameOf('/api/items?x=1')).toBe('/api/items');
  expect(pathnameOf('https://a.example/api/items/')).toBe('/api/items/');
  expect(pathnameOf('https://a.example')).toBe('/');
  expect(pathnameOf('')).toBeNull();
  expect(pathnameOf('not a url')).toBeNull();
});

test('hostnameOf: 只留主机名，忽略协议、端口、路径和用户信息', () => {
  expect(hostnameOf('https://a.example:8443/api/items?x=1#top')).toBe('a.example');
  expect(hostnameOf('http://user:pass@Shop.Example/api')).toBe('shop.example');
  expect(hostnameOf('https://[2001:db8::1]:443/api')).toBe('2001:db8::1');
  expect(hostnameOf('/api/items')).toBeNull();
  expect(hostnameOf('')).toBeNull();
  expect(hostnameOf('not a url')).toBeNull();
});

test('replayKey: 方法忽略大小写，键是方法加路径', () => {
  expect(replayKey('get', '/api/items')).toBe('GET /api/items');
  expect(replayKey('post', '/api/items')).toBe('POST /api/items');
  expect(normalizeMethod('propfind')).toBe('PROPFIND');
  expect(replayKey('', '/api/items')).toBeNull();
  expect(replayKey('GET', 'api/items')).toBeNull();
});

test('mergeReplayEntry: 同一键保留更早的一份，且不按条数裁剪', () => {
  const first = entry({ file: 'a.json', time: 10 });
  const later = entry({ file: 'b.json', time: 20 });
  const merged = mergeReplayEntry({}, first, false);
  expect(mergeReplayEntry(merged, later, true)).toBe(merged);
  expect(merged['GET /api/items']?.file).toBe('a.json');

  const replaced = mergeReplayEntry(
    merged,
    entry({ file: 'c.json', time: 5, pathname: '/api/items' }),
    false,
  );
  expect(replaced['GET /api/items']?.file).toBe('c.json');

  let map = {};
  for (let i = 0; i < 600; i += 1) {
    map = mergeReplayEntry(
      map,
      entry({ file: `f${String(i)}.json`, time: i, pathname: `/p/${String(i)}` }),
      false,
    );
  }
  expect(Object.keys(map)).toHaveLength(600);
});

test('selectReplay: 全局最早且文件仍在；最早的文件缺失则不改用更晚的', () => {
  const early = entry({ file: 'early.json', time: 1 });
  const late = entry({ file: 'late.json', time: 9 });
  const picked = selectReplay([
    { order: 1, dir: '/b', entry: late, fileExists: true },
    { order: 0, dir: '/a', entry: early, fileExists: true },
  ]);
  expect(picked?.dir).toBe('/a');
  expect(picked?.entry.file).toBe('early.json');

  const missing = selectReplay([
    { order: 0, dir: '/a', entry: early, fileExists: false },
    { order: 1, dir: '/b', entry: late, fileExists: true },
  ]);
  expect(missing).toBeNull();

  const tie = selectReplay([
    { order: 1, dir: '/b', entry: entry({ file: 'second.json', time: 3 }), fileExists: true },
    { order: 0, dir: '/a', entry: entry({ file: 'first.json', time: 3 }), fileExists: true },
  ]);
  expect(tie?.entry.file).toBe('first.json');
});

test('shouldReplay: 开关关闭一律不回放；开启时只有命中白名单才回放', () => {
  const rules: ReplayRule[] = [
    { id: '1', name: '商品', enabled: true, host: '', pattern: '/api/items', methods: ['GET'] },
    { id: '2', name: '停用', enabled: false, host: '', pattern: '/health', methods: [] },
  ];
  expect(isReplayActive(undefined)).toBe(true);
  expect(isReplayActive(false)).toBe(false);
  expect(shouldReplay(false, 'shop.example', '/api/items', 'GET', rules)).toBe(false);
  expect(shouldReplay(true, 'shop.example', '/status', 'GET', rules)).toBe(false);
  expect(shouldReplay(true, 'shop.example', '/api/items', 'POST', rules)).toBe(false);
  expect(shouldReplay(true, 'shop.example', '/api/items', 'GET', rules)).toBe(true);
  expect(shouldReplay(true, 'other.example', '/api/items', 'GET', rules)).toBe(true);
  expect(shouldReplay(true, 'shop.example', '/health', 'GET', rules)).toBe(false);
  const url = 'https://example.com:8443/api/items?page=1';
  const hostname = hostnameOf(url);
  const pathname = pathnameOf(url);
  expect(hostname).toBe('example.com');
  expect(pathname).toBe('/api/items');
  expect(shouldReplay(true, hostname ?? '', pathname ?? '', 'GET', rules)).toBe(true);
  expect(
    shouldReplay(true, hostname ?? '', pathname ?? '', 'GET', [
      { id: '3', name: '主机当路径', enabled: true, host: '', pattern: 'example.com', methods: [] },
    ]),
  ).toBe(false);
});

test('shouldReplay: 域名和路径可单独或同时作为白名单', () => {
  const hostOnly: ReplayRule = {
    id: 'h',
    name: '域名',
    enabled: true,
    host: 'shop.example',
    pattern: '',
    methods: ['GET'],
  };
  const pathOnly: ReplayRule = {
    id: 'p',
    name: '路径',
    enabled: true,
    host: '',
    pattern: '/api/items',
    methods: [],
  };
  const both: ReplayRule = {
    id: 'b',
    name: '同时',
    enabled: true,
    host: '/^shop\\./',
    pattern: '/api/items',
    methods: [],
  };
  expect(shouldReplay(true, 'shop.example', '/other', 'GET', [hostOnly])).toBe(true);
  expect(shouldReplay(true, 'shop.example', '/other', 'POST', [hostOnly])).toBe(false);
  expect(shouldReplay(true, 'api.shop.example', '/other', 'GET', [hostOnly])).toBe(true);
  expect(shouldReplay(true, 'other.example', '/api/items', 'GET', [hostOnly])).toBe(false);
  expect(shouldReplay(true, 'other.example', '/api/items', 'POST', [pathOnly])).toBe(true);
  expect(shouldReplay(true, 'other.example', '/status', 'GET', [pathOnly])).toBe(false);
  expect(shouldReplay(true, 'shop.example', '/api/items', 'GET', [both])).toBe(true);
  expect(shouldReplay(true, 'shop.example', '/status', 'GET', [both])).toBe(false);
  expect(shouldReplay(true, 'other.example', '/api/items', 'GET', [both])).toBe(false);
  const withPort = hostnameOf('https://shop.example:8443/api/items');
  expect(withPort).toBe('shop.example');
  expect(shouldReplay(true, withPort ?? '', '/api/items', 'GET', [hostOnly])).toBe(true);
  expect(
    shouldReplay(true, withPort ?? '', '/api/items', 'GET', [
      { ...hostOnly, host: 'shop.example:8443' },
    ]),
  ).toBe(false);
});

test('captureHeaders 与回放头: 去掉传输层字段，保留业务头', () => {
  const captured = captureHeaders({
    'Content-Type': 'application/json',
    'Set-Cookie': ['a=1', 'b=2'],
    'Content-Length': '10',
    'Transfer-Encoding': 'chunked',
    'X-Request-Id': 'abc',
  });
  expect(captured['content-type']).toBe('application/json');
  expect(captured['set-cookie']).toBe('a=1\nb=2');
  const replayed = replayResponseHeaders(captured);
  expect(replayed['content-length']).toBeUndefined();
  expect(replayed['transfer-encoding']).toBeUndefined();
  expect(replayed['x-request-id']).toBe('abc');
  expect(replayed['set-cookie']).toBe('a=1\nb=2');
});

test('fitRequestBody: 二进制和超限不写入请求体', () => {
  expect(fitRequestBody('{"a":1}', false, 1)).toEqual({
    requestBody: '{"a":1}',
    requestBodyOmitted: false,
  });
  expect(fitRequestBody('x'.repeat(2048), false, 1).requestBodyOmitted).toBe(true);
  expect(readBody(false)).toEqual({ text: '', binary: true });
  expect(fitRequestBody('', true, 0).requestBodyOmitted).toBe(true);
  expect(normalizeStatusCode('201')).toBe(201);
  expect(normalizeStatusCode('nope')).toBe(200);
});

test('buildFileReplay: 始终带上原始状态码和响应头', () => {
  const built = buildFileReplay(
    'https://example.com/api/items?x=1',
    '/tmp/a.json',
    200,
    {
      'content-type': 'application/json',
    },
    null,
  );
  expect(built.rules).toContain('statusCode://200');
  expect(built.rules).toContain('file://</tmp/a.json>');
  expect(built.rules).not.toContain('resDelay');
  expect(built.values.sakeReplayH).toContain('application/json');

  const inline = buildFileReplay(
    'https://example.com/a',
    '/tmp/my file.json',
    404,
    {},
    '{"ok":true}',
  );
  expect(inline.rules).toContain('file://{sakeReplayBody}');
  expect(inline.rules).toContain('statusCode://404');
  expect(inline.values.sakeReplayBody).toBe('{"ok":true}');

  expect(
    buildSseReplay('https://example.com/stream', 'http://127.0.0.1:9/mock/a.txt', 200).rules,
  ).toContain('statusCode://200');
});
