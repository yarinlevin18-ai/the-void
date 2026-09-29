import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cubicBezier, PRESETS, clampHandle } from '../src/lab.js';

test('cubicBezier: endpoints, linear identity, the site curve eases out', () => {
  const lin = cubicBezier(...PRESETS.linear);
  for (const x of [0, 0.1, 0.5, 0.9, 1]) assert.ok(Math.abs(lin(x) - x) < 1e-4, `linear ${x}`);
  const site = cubicBezier(...PRESETS.site);
  assert.equal(site(0), 0); assert.equal(site(1), 1);
  assert.ok(site(0.5) > 0.85, 'ease-out: most of the move happens early');
  let prev = 0; for (let x = 0; x <= 1; x += 0.01) { const y = site(x); assert.ok(y >= prev - 1e-9); prev = y; }
});

test('cubicBezier: overshoot goes past 1, snap is symmetric, steep curves still solve', () => {
  const over = cubicBezier(...PRESETS.overshoot);
  assert.ok(Math.max(...Array.from({ length: 101 }, (_, i) => over(i / 100))) > 1.05);
  const snap = cubicBezier(...PRESETS.snap);
  assert.ok(Math.abs(snap(0.5) - 0.5) < 1e-3);
  const steep = cubicBezier(0, 1, 0, 1);
  for (const x of [0.001, 0.3, 0.999]) assert.ok(Number.isFinite(steep(x)) && steep(x) <= 1 + 1e-9);
});

test('clampHandle keeps x a function of time and bounds y', () => {
  assert.deepEqual(clampHandle(-1, 5), [0, 1.35]);
  assert.deepEqual(clampHandle(2, -5), [1, -0.35]);
});

test('the code tab shows the region labcard.js extracts', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/lab.js', import.meta.url), 'utf8');
  const region = src.split('// #region cubicBezier\n')[1]?.split('// #endregion')[0];
  assert.ok(region && region.startsWith('export function cubicBezier('));
});
