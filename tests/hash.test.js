import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveHash, HASH_KEYS } from '../src/hash.js';

const beats = [
  { name: 'Opening' }, { name: 'Hero', stop: 'hero' }, { name: 'Intro', stop: 'intro' },
  { name: 'CV', stop: 'cv' }, { name: 'Build', stop: 'build' },
  { name: 'LLM', stop: 'project' }, { name: 'Contact', stop: 'contact' },
];
const ctx = { beats, workIndex: 5, aboutIndex: 2 };

test('the five public keys resolve, with or without the #, in any case', () => {
  assert.deepEqual(HASH_KEYS.sort(), ['about', 'contact', 'cv', 'top', 'work']);
  assert.equal(resolveHash('#top', ctx), 0);
  assert.equal(resolveHash('work', ctx), 5);
  assert.equal(resolveHash('#About', ctx), 2);
  assert.equal(resolveHash('#CV', ctx), 3);
  assert.equal(resolveHash('#contact', ctx), 6);
});

test('unknown, empty and Object.prototype keys are -1, never a throw', () => {
  for (const k of ['', '#', '#bogus', '#stop-3', '#__proto__', '#__PROTO__', '#constructor', '#toString', '#valueOf', '#hasOwnProperty', '#__defineGetter__', null, undefined, 42]) {
    assert.equal(resolveHash(k, ctx), -1, String(k));
  }
});

test('a key whose stop is missing, or out of range, is -1', () => {
  const noContact = { ...ctx, beats: beats.filter((b) => b.stop !== 'contact') };
  assert.equal(resolveHash('#contact', noContact), -1);
  assert.equal(resolveHash('#work', { ...ctx, workIndex: 99 }), -1);
  assert.equal(resolveHash('#work', { ...ctx, workIndex: NaN }), -1);
  assert.equal(resolveHash('#work', { ...ctx, workIndex: 1.5 }), -1);
  assert.equal(resolveHash('#top', { beats: [] }), 0, 'top is always the first beat');
});
