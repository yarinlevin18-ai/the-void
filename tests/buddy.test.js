import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phaseAt, pointerAt, LOOP } from '../src/buddy.js';

test('the buddy loop follows the Swift trigger timeline', () => {
  assert.equal(phaseAt(1), 'idle');
  assert.equal(phaseAt(3), 'listening');
  assert.equal(phaseAt(6), 'transcribing');
  assert.equal(phaseAt(7), 'thinking');
  assert.equal(phaseAt(10), 'answer');
  assert.equal(phaseAt(15.5), 'idle');
});

test('the pointer loop is seamless and rests on the error line while the buddy works', () => {
  const [a, b] = [pointerAt(0), pointerAt(LOOP - 1e-6)];
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01, 'end meets start');
  assert.deepEqual(pointerAt(5), pointerAt(12), 'still from listening to the fade');
  for (let t = 0; t < LOOP; t += 0.1) { const [x, y] = pointerAt(t); assert.ok(x > 0 && x < 1 && y > 0 && y < 1, `on canvas at ${t}`); }
});
