import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';

test('loader loop assets exist and the mp4 stays under budget', () => {
  const mp4 = statSync(new URL('../public/assets/loader/void-loop.mp4', import.meta.url));
  const webp = statSync(new URL('../public/assets/loader/void-loop.webp', import.meta.url));
  assert.ok(mp4.size > 0 && webp.size > 0);
  assert.ok(mp4.size <= 2.5 * 1024 * 1024, `void-loop.mp4 is ${(mp4.size / 1048576).toFixed(2)} MB (budget 2.5)`);
});
