import { expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { CaptureMeta } from '../server/core/model';

import { readMeta, recordMeta } from '../server/core/metaStore';
import { commitSavedCapture, readReplay } from '../server/core/replayStore';

const meta = (
  over: Partial<CaptureMeta> & Pick<CaptureMeta, 'pathname' | 'time'>,
): CaptureMeta => ({
  url: 'https://shop.example/api/items?x=1',
  method: 'GET',
  statusCode: 200,
  contentType: 'application/json',
  requestHeaders: {},
  requestBody: '',
  requestBodyOmitted: false,
  responseHeaders: { 'content-type': 'application/json' },
  ...over,
});

test('commitSavedCapture: 同一键再次保存时覆盖记录并删除旧文件', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'replay-overwrite-'));
  writeFileSync(path.join(dir, 'old.json'), 'old');
  writeFileSync(path.join(dir, 'extra.json'), 'extra');
  writeFileSync(path.join(dir, 'other.json'), 'other');
  writeFileSync(path.join(dir, 'new.json'), 'new');

  commitSavedCapture(dir, 'old.json', meta({ pathname: '/api/items', time: 10 }));
  commitSavedCapture(dir, 'other.json', meta({ pathname: '/api/other', time: 11 }));
  recordMeta(dir, 'extra.json', meta({ pathname: '/api/items', time: 12 }));
  commitSavedCapture(dir, 'new.json', meta({ pathname: '/api/items', time: 20, statusCode: 201 }));

  expect(existsSync(path.join(dir, 'new.json'))).toBe(true);
  expect(existsSync(path.join(dir, 'other.json'))).toBe(true);
  expect(existsSync(path.join(dir, 'old.json'))).toBe(false);
  expect(existsSync(path.join(dir, 'extra.json'))).toBe(false);
  expect(readFileSync(path.join(dir, 'new.json'), 'utf8')).toBe('new');

  const replay = readReplay(dir);
  expect(replay['GET /api/items']?.file).toBe('new.json');
  expect(replay['GET /api/items']?.statusCode).toBe(201);
  expect(replay['GET /api/other']?.file).toBe('other.json');

  const index = readMeta(dir);
  expect(Object.keys(index).sort()).toEqual(['new.json', 'other.json']);
  expect(index['new.json']?.statusCode).toBe(201);
});
