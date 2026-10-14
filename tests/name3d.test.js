import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { partAt, revealAt, NAME_D, PART_FROM, PART_TO, REVEAL_STAGGER } from '../src/name3d.js';

test('the name parts as the camera reaches its plane, and is whole again flying back', () => {
  assert.equal(partAt(0), 0, 'at the Opening the name is whole');
  assert.equal(partAt(NAME_D + 30), 1, 'past the plane it is gone');
  assert.ok(PART_TO < NAME_D, 'gone before the camera reaches the glyphs');
  let prev = -1;
  for (let s = PART_FROM - 5; s <= PART_TO + 5; s += 1) { const p = partAt(s); assert.ok(p >= prev); prev = p; }
});

test('the glyphs arrive one after another out of depth; reduced motion is one plain fade', () => {
  assert.equal(revealAt(0, 0), 0);
  assert.ok(revealAt(REVEAL_STAGGER * 3, 0) > revealAt(REVEAL_STAGGER * 3, 3), 'reading order');
  assert.equal(revealAt(10, 9), 1);
  assert.equal(revealAt(0.25, 0, true), revealAt(0.25, 9, true), 'no stagger under reduced motion');
  assert.equal(revealAt(0.5, 0, true), 1);
});

test('the site is set in its two faces: Doto, the dot-matrix label face, is gone (2026-10-14)', () => {
  for (const f of ['src/style.css', 'index.html']) {
    const s = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(s, /url\("\/fonts\/Doto|fonts\/Doto\.woff2|--f-mono/, f);
  }
});
