import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAt, auditAt, pointerAt, RUNS, RUN_LEN, LOOP, STILL, APPROVE_AT } from '../src/agent.js';

test('each request walks agent → scrub → guardrails → outcome in order', () => {
  const steps = [];
  for (let t = RUNS[0].at; t < RUNS[0].at + 4.85; t += 0.05) { const s = runAt(t).step; if (steps.at(-1) !== s) steps.push(s); }
  assert.deepEqual(steps, ['arrive', 'to-scrub', 'scrub', 'to-guard', 'check', 'to-outcome', 'stamped']);
  assert.deepEqual(RUNS.map((r) => r.out), ['approved', 'held', 'blocked']);
});

test('the scene tells the demo’s own story: the ₪5,000 ceiling, a manager’s approval, nothing sent', () => {
  assert.match(RUNS[0].rule, /Under the ₪5,000 ceiling/);
  assert.match(RUNS[1].rule, /Over the ₪5,000 ceiling/);
  assert.match(RUNS[2].outText, /Nothing sent/);
  assert.ok(auditAt(APPROVE_AT + 1).some((r) => r.actor.startsWith('Dana Levi') && r.tag === 'approved'));
});

test('the loop is seamless: the log, the pointer and the pipeline start and end empty', () => {
  assert.equal(auditAt(0).length, 2, 'only the standing rows');
  assert.equal(auditAt(LOOP - 1e-6).length, 2);
  assert.equal(pointerAt(0), null); assert.equal(pointerAt(LOOP - 1e-6), null);
  assert.equal(runAt(LOOP - 1e-6), null);
  const log = auditAt(LOOP - 2).map((r) => r.at);
  assert.deepEqual(log, [...log].sort((a, b) => b - a), 'newest first');
});

test('the reduced-motion still shows the held invoice with the pointer on Approve', () => {
  assert.ok(pointerAt(STILL), 'pointer on screen');
  assert.ok(STILL >= RUNS[1].at + 4 && STILL < APPROVE_AT, 'the invoice is waiting in the inbox');
});

test('the requests never overlap: each card leaves before the next one arrives', () => {
  for (let i = 1; i < RUNS.length; i++) assert.ok(RUNS[i].at >= RUNS[i - 1].at + RUN_LEN - 1e-9, `run ${i}`);
});
