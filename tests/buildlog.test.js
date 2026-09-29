import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, merge, shortSubject } from '../scripts/buildlog.js';

test('summarize: per-day counts from the first commit to today, streak, recent three', () => {
  const lines = ['c|2026-06-23|third — detail', 'b|2026-06-22|second', 'a|2026-06-22|first', 'z|2026-06-20|zero'];
  const l = summarize(lines, '2026-06-25', 7);
  assert.equal(l.first, '2026-06-20');
  assert.deepEqual(l.days, [1, 0, 2, 1, 0, 0]);
  assert.equal(l.commits, 4); assert.equal(l.activeDays, 3); assert.equal(l.streak, 2); assert.equal(l.tests, 7);
  assert.deepEqual(l.recent.map((c) => c.s), ['third', 'second', 'first']);
  assert.equal(summarize([], '2026-06-25'), null);
});

test('shortSubject keeps the headline before " — " and cuts long ones at a word', () => {
  assert.equal(shortSubject('live layer: x — the long part'), 'live layer: x');
  const s = shortSubject('a'.repeat(10) + ' ' + 'word '.repeat(30));
  assert.ok(s.length <= 65 && s.endsWith('…'), s);
});

test('merge: a shallow clone adds only the commits the snapshot does not know, by hash', () => {
  const snap = summarize(['b|2026-06-22|second', 'a|2026-06-20|first'], '2026-06-22', 3);
  const shallowLog = ['d|2026-06-24|fourth — detail', 'c|2026-06-24|third', 'b|2026-06-22|second'];   // depth 3: b is already known
  const m = merge(snap, shallowLog, '2026-06-25', 9);
  assert.equal(m.commits, 4);
  assert.deepEqual(m.days, [1, 0, 1, 0, 2, 0]);
  assert.deepEqual(m.recent.map((c) => c.h), ['d', 'c', 'b']);
  assert.equal(m.head, 'd'); assert.equal(m.tests, 9, 'tests are counted at build time, never from the snapshot');
  assert.deepEqual(merge(snap, [], '2026-06-22', 3).days, snap.days, 'nothing new: the snapshot as it was');
  assert.equal(merge(null, shallowLog, '2026-06-25'), null);
});
