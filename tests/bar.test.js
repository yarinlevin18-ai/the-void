import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyLabel } from '../src/bar.js';

test('copyLabel returns Copied then reverts', async () => {
  let label = 'Copy email';
  const set = (v) => { label = v; };
  copyLabel(set, 'Copy email', 10);
  assert.equal(label, 'Copied');
  await new Promise((r) => setTimeout(r, 25));
  assert.equal(label, 'Copy email');
});
