import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  assert.deepEqual(featured.map((p) => p.id), ['teepo', 'aerocy', 'shadiez', 'smartcut', 'llm-gateway', 'focus', 'sabai']);
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
  if (PROFILE.links.x) assert.match(PROFILE.links.x, /^https:\/\//);
});

test('cv rows for the CV stop: 5 entries', () => {
  assert.equal(PROFILE.cvStop.length, 5);
  for (const r of PROFILE.cvStop) { assert.ok(r.years); assert.ok(r.role); assert.ok(r.line); }
});

test('ids are unique and the ids render.js hardcodes exist', () => {
  const ids = featured.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of [PROFILE.buildStop.lead, ...PROFILE.buildStop.rows]) assert.ok(ids.includes(id), id);
});

test('public entries have live url and repo; every img matches its id', () => {
  for (const p of featured) {
    if (!p.private) { assert.match(p.url, /^https:\/\//, `${p.id} url`); assert.match(p.repo, /^https:\/\/github\.com\//, `${p.id} repo`); }
    assert.equal(p.img, `/previews/${p.id}.jpg`, `${p.id} img`);
  }
});

test('every project id DEFAULT_BEATS hardcodes exists in the profile', () => {
  const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const arr = src.slice(src.indexOf('const DEFAULT_BEATS = ['));
  const body = arr.slice(0, arr.indexOf('\n];'));
  const ids = [...body.matchAll(/id: '([a-z-]+)'/g)].map((m) => m[1]);
  assert.equal(ids.length, 7);
  for (const id of ids) assert.ok(featured.map((p) => p.id).includes(id), id);
});
