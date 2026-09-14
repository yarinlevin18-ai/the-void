import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { PROFILE } from '../src/content/profile.js';

const featured = PROFILE.work.featured;

test('hi, about and timeline carry the person chapter', () => {
  assert.ok(PROFILE.hi.greeting.startsWith('Hi, I’m'));
  assert.ok(PROFILE.hi.status.includes('AI-native developer'));
  assert.equal(PROFILE.hi.lines.length, 2);
  assert.equal(PROFILE.about.paragraphs.length, 3);
  assert.equal(PROFILE.about.photos.length, 3);
  assert.ok(PROFILE.timeline.rows.length >= 5);
  for (const r of PROFILE.timeline.rows) { assert.ok(r.when); assert.ok(r.what); assert.ok(r.line); }
  assert.equal(PROFILE.hero, undefined); assert.equal(PROFILE.intro, undefined); assert.equal(PROFILE.cvStop, undefined);
});

test('every person-chapter photo path exists under public/', () => {
  for (const p of [PROFILE.hi.portrait, ...PROFILE.about.photos.map((x) => x.src)]) {
    assert.match(p, /^\/assets\/me\/.+\.webp$/, p);
    assert.ok(existsSync(new URL(`../public${p}`, import.meta.url)), p);
  }
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
  assert.equal(PROFILE.contact.line, undefined, 'the card eyebrow says it; contact.line is gone');
  assert.ok(PROFILE.title, 'the card role');
  assert.ok(PROFILE.contact.availability);
  if (PROFILE.links.x) assert.match(PROFILE.links.x, /^https:\/\//);
});

test('ids are unique and the ids render.js hardcodes exist', () => {
  const ids = featured.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of [PROFILE.buildStop.lead, ...PROFILE.buildStop.rows]) assert.ok(ids.includes(id), id);
});

test('public entries have live url and repo; every img matches its id', () => {
  for (const p of featured) {
    if (!p.private) {
      // `offline: true` marks a public build whose deployment is down; it ships without a live link
      if (p.offline) assert.equal(p.url, '', `${p.id} offline url`); else assert.match(p.url, /^https:\/\//, `${p.id} url`);
      assert.match(p.repo, /^https:\/\/github\.com\//, `${p.id} repo`);
    }
    assert.equal(p.img, `/previews/${p.id}.webp`, `${p.id} img`);
  }
});

test('every project id DEFAULT_BEATS hardcodes exists in the profile', () => {
  const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const arr = src.slice(src.indexOf('const DEFAULT_BEATS = ['));
  const body = arr.slice(0, arr.indexOf('\n];'));
  const ids = [...body.matchAll(/\bid: '([a-z-]+)'/g)].map((m) => m[1]);
  const also = [...body.matchAll(/\balso: '([a-z-]+)'/g)].map((m) => m[1]);
  assert.equal(ids.length, 5, 'five project stops');
  assert.equal(also.length, 2, 'two folded-in projects');
  assert.equal(new Set([...ids, ...also]).size, featured.length, 'every featured project is reachable in the flight');
  for (const id of [...ids, ...also]) assert.ok(featured.map((p) => p.id).includes(id), id);
});

test('buildStop ids exist in featured and every featured preview file is on disk', () => {
  const ids = featured.map((p) => p.id);
  assert.ok(ids.includes(PROFILE.buildStop.lead), PROFILE.buildStop.lead);
  for (const r of PROFILE.buildStop.rows) assert.ok(ids.includes(r), r);
  for (const p of featured) assert.ok(existsSync(new URL(`../public${p.img}`, import.meta.url)), p.img);
});

// Claims that were retired in the 2026-09-14 wording rework. They must not
// come back anywhere a visitor or crawler can read them.
const RETIRED = ['ai-native builder', 'real users', 'with users', 'dropped wix', 'stopped rescheduling', 'one user', 'not a demo'];

function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

test('retired claims do not appear in the profile or index.html', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').toLowerCase();
  const all = strings(PROFILE).map((s) => s.toLowerCase());
  for (const phrase of RETIRED) {
    const hit = all.find((s) => s.includes(phrase));
    assert.equal(hit, undefined, `profile contains "${phrase}": ${hit}`);
    assert.ok(!html.includes(phrase), `index.html contains "${phrase}"`);
  }
});
