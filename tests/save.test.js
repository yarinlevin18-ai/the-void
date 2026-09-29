import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

// main.js boots Three.js, so load()/save() can't be imported here — these grep
// the source for the two numbers that must move together.
const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('save() writes the version the newest load() migration guards', () => {
  const saved = /version:\s*(\d+)\s*\}\)\)/.exec(src);
  assert.ok(saved, 'save() stamps a version');
  const guards = [...src.matchAll(/^\s*if \(!\(d\.version >= (\d+)\)\)/gm)].map((m) => +m[1]);
  assert.ok(guards.length, 'load() has migration guards');
  assert.equal(+saved[1], Math.max(...guards), 'bump save() when you add a migration block');
  assert.deepEqual(guards, [...guards].sort((a, b) => a - b), 'migration blocks stay in ascending order');
});

test('every image DEFAULT_BEATS ships exists under public/', () => {
  const arr = src.slice(src.indexOf('const DEFAULT_BEATS = ['));
  const body = arr.slice(0, arr.indexOf('\n];'));
  const imgs = [...body.matchAll(/\bimg2?: '(\/[^']+)'/g)].map((m) => m[1]);
  assert.ok(imgs.length >= 5, 'the five project stops carry a preview');
  for (const p of imgs) assert.ok(existsSync(new URL(`../public${p}`, import.meta.url)), p);
  for (const p of imgs) assert.match(p, /\.webp$/, `${p} — previews ship as WebP (v17)`);
});

// Every DEFAULT_BEATS change needs a save migration + version bump, because visitors
// carry old beat arrays (CLAUDE.md). The beat block's fingerprint (comments and
// whitespace stripped) is pinned per save version: change a beat and this fails until
// you bump the version, add the load() migration, and pin the new value here.
const PINNED = { 21: 'bbee99921fb515a6' };
test('DEFAULT_BEATS cannot change without a save-version bump', () => {
  const start = src.indexOf('const DEFAULT_BEATS = [');
  const block = src.slice(start, src.indexOf('\n];', start)).replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '');
  const fp = createHash('sha256').update(block).digest('hex').slice(0, 16);
  const version = +/version:\s*(\d+)\s*\}\)\)/.exec(src)[1];
  assert.ok(PINNED[version], `pin DEFAULT_BEATS for save v${version}: '${fp}'`);
  assert.equal(fp, PINNED[version], `DEFAULT_BEATS changed under save v${version}: bump the version, add a load() migration, then pin '${fp}'`);
});
