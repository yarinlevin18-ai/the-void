import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

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
