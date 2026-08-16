import { expect, test } from 'bun:test';

import { joinSseFrames, splitSseEvents } from '../server/sseStream';

test('splitSseEvents: 空内容', () => {
  expect(splitSseEvents('')).toEqual([]);
});

test('splitSseEvents: 按空行边界切分事件并保留分隔符', () => {
  const body = 'data: 1\n\ndata: 2\n\ndata: 3';
  const chunks = splitSseEvents(body);
  expect(chunks).toEqual(['data: 1\n\n', 'data: 2\n\n', 'data: 3']);
  expect(chunks.join('')).toBe(body);
});

test('splitSseEvents: 无空行边界的普通文本按行切分', () => {
  const body = 'line1\nline2\nline3';
  const chunks = splitSseEvents(body);
  expect(chunks).toEqual(['line1\n', 'line2\n', 'line3']);
  expect(chunks.join('')).toBe(body);
});

test('splitSseEvents: 兼容 CRLF', () => {
  const body = 'data: 1\r\n\r\ndata: 2\r\n\r\n';
  const chunks = splitSseEvents(body);
  expect(chunks).toEqual(['data: 1\r\n\r\n', 'data: 2\r\n\r\n']);
});

test('joinSseFrames: 按事件还原并忽略客户端帧与空帧', () => {
  const body = joinSseFrames([
    { body: 'data: 1' },
    { body: 'data: 2', isClient: true },
    { body: '' },
    { body: 'data: 3', closed: true },
    { closed: true },
  ]);
  expect(body).toBe('data: 1\n\ndata: 3');
  expect(splitSseEvents(body).map((chunk) => chunk.replace(/\n\n$/, ''))).toEqual([
    'data: 1',
    'data: 3',
  ]);
});

test('joinSseFrames: 空列表', () => {
  expect(joinSseFrames([])).toBe('');
});
