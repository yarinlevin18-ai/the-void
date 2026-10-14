import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phaseAt, pointerAt, robotAt, drawTipAt, typedAt, LOOP, STILL, Q2, SEARCH } from '../src/buddy.js';

test('the buddy loop: an answer, then the browser and a drawing', () => {
  const at = [[0.5, 'idle'], [1.5, 'listening'], [2.8, 'transcribing'], [3.4, 'thinking'], [5, 'answer'],
    [8, 'listening'], [8.7, 'transcribing'], [9.1, 'thinking'], [10.5, 'acting'], [13, 'drawing'], [16, 'idle']];
  for (const [t, p] of at) assert.equal(phaseAt(t), p, `${t} s`);
  assert.equal(phaseAt(STILL), 'drawing', 'reduced motion shows the finished drawing');
});

test('the browser shows the words the buddy was given', () => {
  assert.ok(Q2.endsWith(SEARCH) && SEARCH.length > 8);
  assert.equal(typedAt(10.0), 0);
  assert.equal(typedAt(11.0), SEARCH.length, 'typed in full before the results load');
});

test('the pointer loop is seamless and rests on the error line while the buddy works', () => {
  const [a, b] = [pointerAt(0), pointerAt(LOOP - 1e-6)];
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01, 'end meets start');
  assert.deepEqual(pointerAt(2), pointerAt(14), 'still from the first ask to the browser closing');
  for (let t = 0; t < LOOP; t += 0.1) { const [x, y] = pointerAt(t); assert.ok(x > 0 && x < 1 && y > 0 && y < 1, `on canvas at ${t}`); }
});

test('the robot leaves the pointer to work the browser and comes back without a jump', () => {
  const H = 800 * 17.6 / 28;
  for (let t = 0; t < LOOP; t += 0.02) {
    const [x, y] = robotAt(t, H), [x2, y2] = robotAt(Math.min(LOOP - 1e-6, t + 0.02), H);
    assert.ok(x > 0 && x < 800 && y > 0 && y < H, `on canvas at ${t.toFixed(2)}`);
    assert.ok(Math.hypot(x2 - x, y2 - y) < 40, `no jump at ${t.toFixed(2)}`);
  }
  assert.ok(robotAt(12, H)[0] > robotAt(5, H)[0] + 60 || robotAt(12, H)[1] !== robotAt(5, H)[1], 'away from the pointer while drawing');
  const [a, b] = [drawTipAt(12.5 - 1e-6), drawTipAt(11.9)];
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1, 'the box closes where it started');
});
