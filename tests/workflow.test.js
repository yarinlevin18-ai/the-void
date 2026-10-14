import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, LOOP, STILL, sceneAt, chunkAt, CHUNKS, REVIEW, SPEC } from '../src/workflow.js';

test('the loop runs spec → build → review → ship → lab, in order, inside 16 s', () => {
  assert.deepEqual(SCENES.map((s) => s.id), ['spec', 'build', 'review', 'ship', 'lab']);
  for (let i = 1; i < SCENES.length; i++) assert.ok(SCENES[i].at > SCENES[i - 1].at);
  assert.ok(SCENES.at(-1).at < LOOP);
  assert.equal(sceneAt(0), 0); assert.equal(sceneAt(LOOP - 0.01), 4);
});

test('every chunk is typed, then reviewed; one goes back and comes back approved', () => {
  CHUNKS.forEach((_, i) => {
    const seen = [];
    for (let t = 0; t < LOOP; t += 0.02) { const s = chunkAt(t, i); if (seen.at(-1) !== s) seen.push(s); }
    if (i === REVIEW.back) assert.deepEqual(seen, ['hidden', 'queued', 'typing', 'typed', 'back', 'retyping', 'ok']);
    else assert.deepEqual(seen, ['hidden', 'queued', 'typing', 'typed', 'ok']);
  });
});

test('the spec locks its decisions and names what is out of scope; the still shows the loop closed', () => {
  assert.equal(SPEC.filter((r) => r[2] === 'lock').length, 3);
  assert.ok(SPEC.some((r) => r[2] === 'out'));
  assert.equal(SCENES[sceneAt(STILL)].id, 'lab');
});
