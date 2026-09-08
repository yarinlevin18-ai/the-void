import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE } from '../src/content/profile.js';

const featured = PROFILE.work.featured;

test('intro has 2–3 lines and a context line', () => {
  assert.ok(PROFILE.intro.lines.length >= 2 && PROFILE.intro.lines.length <= 3);
  assert.ok(PROFILE.intro.context.length > 0);
});

test('method and proof are present, proof has exactly 3 numbers', () => {
  assert.ok(PROFILE.method.lines.length >= 2);
  assert.equal(PROFILE.proof.length, 3);
  for (const p of PROFILE.proof) { assert.equal(typeof p.n, 'number'); assert.ok(p.label); }
});

test('featured projects: 4 landing then 3 saas, in spec order', () => {
  assert.deepEqual(featured.map((p) => p.id), ['teepo', 'aerocy', 'shadiez', 'smartcut', 'llm-gateway', 'focus', 'thailand']);
  assert.deepEqual(featured.map((p) => p.group), ['landing', 'landing', 'landing', 'landing', 'saas', 'saas', 'saas']);
});

test('every featured project has problem/decision/outcome, image, tint, stack', () => {
  for (const p of featured) {
    for (const k of ['problem', 'decision', 'outcome', 'img', 'tint', 'stack']) assert.ok(p[k], `${p.id} missing ${k}`);
    assert.match(p.tint, /^#[0-9a-f]{6}$/i);
  }
});

test('repo links only on public repos; private builds flagged', () => {
  for (const p of featured) {
    if (p.private) assert.equal(p.repo, undefined, `${p.id} is private but has a repo link`);
  }
  assert.equal(featured.find((p) => p.id === 'focus').url, '');
});

test('contact block', () => {
  assert.ok(PROFILE.contact.line);
  assert.ok(PROFILE.contact.availability);
  assert.match(PROFILE.links.x, /^https:\/\//);
});

test('cv rows for the CV stop: 5 entries', () => {
  assert.equal(PROFILE.cvStop.length, 5);
  for (const r of PROFILE.cvStop) { assert.ok(r.years); assert.ok(r.role); assert.ok(r.line); }
});
