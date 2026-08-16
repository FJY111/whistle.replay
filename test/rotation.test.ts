import { expect, test } from 'bun:test';

import { pickFile, resetRotation } from '../server/core/rotation';

test('pickFile: 空列表返回 null', () => {
  expect(pickFile('a', [], 'fixed')).toBeNull();
  expect(pickFile('a', [], 'round-robin')).toBeNull();
});

test('pickFile: fixed 恒返回第一个文件', () => {
  const files = ['a.json', 'b.json', 'c.json'];
  expect(pickFile('fixed-rule', files, 'fixed')).toBe('a.json');
  expect(pickFile('fixed-rule', files, 'fixed')).toBe('a.json');
});

test('pickFile: round-robin 依次轮换并循环', () => {
  const files = ['a.json', 'b.json', 'c.json'];
  resetRotation('rr-rule');
  expect(pickFile('rr-rule', files, 'round-robin')).toBe('a.json');
  expect(pickFile('rr-rule', files, 'round-robin')).toBe('b.json');
  expect(pickFile('rr-rule', files, 'round-robin')).toBe('c.json');
  expect(pickFile('rr-rule', files, 'round-robin')).toBe('a.json');
});

test('pickFile: 不同规则的轮换进度互相独立', () => {
  const files = ['a.json', 'b.json'];
  resetRotation();
  expect(pickFile('r1', files, 'round-robin')).toBe('a.json');
  expect(pickFile('r2', files, 'round-robin')).toBe('a.json');
  expect(pickFile('r1', files, 'round-robin')).toBe('b.json');
  expect(pickFile('r2', files, 'round-robin')).toBe('b.json');
});

test('pickFile: 文件列表变短时轮换不越界', () => {
  resetRotation('shrink');
  expect(pickFile('shrink', ['a.json', 'b.json'], 'round-robin')).toBe('a.json');
  expect(pickFile('shrink', ['a.json', 'b.json'], 'round-robin')).toBe('b.json');
  expect(pickFile('shrink', ['a.json'], 'round-robin')).toBe('a.json');
});

test('pickFile: random 返回列表内文件', () => {
  const files = ['a.json', 'b.json'];
  for (let i = 0; i < 20; i += 1) {
    const picked = pickFile('rand', files, 'random');
    expect(picked != null && files.includes(picked)).toBe(true);
  }
});

test('resetRotation: 指定规则重置后从头开始', () => {
  const files = ['a.json', 'b.json'];
  resetRotation('reset-me');
  pickFile('reset-me', files, 'round-robin');
  resetRotation('reset-me');
  expect(pickFile('reset-me', files, 'round-robin')).toBe('a.json');
});
