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

test('copyLabel cancels a pending revert on repeat calls', async () => {
  let label = 'Copy email';
  const set = (v) => { label = v; };
  copyLabel(set, 'Copy email', 20);
  await new Promise((r) => setTimeout(r, 5));
  copyLabel(set, 'Copy email', 20);
  await new Promise((r) => setTimeout(r, 15));
  assert.equal(label, 'Copied');
  await new Promise((r) => setTimeout(r, 25));
  assert.equal(label, 'Copy email');
});
