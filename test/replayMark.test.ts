import { expect, test } from 'bun:test';

import { consumeReplayed, markReplayed } from '../server/core/mockMark';

test('consumeReplayed: 每个回放标记只消化一次，避免把回放结果再保存', () => {
  const key = `GET /mark-${String(Date.now())}`;
  expect(consumeReplayed(key)).toBe(false);
  markReplayed(key);
  markReplayed(key);
  expect(consumeReplayed(key)).toBe(true);
  expect(consumeReplayed(key)).toBe(true);
  expect(consumeReplayed(key)).toBe(false);
});
