import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, click, tick } from './_dom.js';
import { PROFILE } from '../src/content/profile.js';

installDom();
const { copyLabel, initBar } = await import('../src/bar.js');

test('copyLabel returns Copied then reverts', async () => {
  let label = 'Copy email';
  const set = (v) => { label = v; };
  copyLabel(set, 'Copy email', 10);
  assert.equal(label, 'Copied');
  await tick(25);
  assert.equal(label, 'Copy email');
});

test('copyLabel cancels a pending revert on repeat calls', async () => {
  let label = 'Copy email';
  const set = (v) => { label = v; };
  copyLabel(set, 'Copy email', 20);
  await tick(5);
  copyLabel(set, 'Copy email', 20);
  await tick(15);
  assert.equal(label, 'Copied');
  await tick(25);
  assert.equal(label, 'Copy email');
});

const mount = (profile = PROFILE) => {
  const root = document.createElement('nav');
  const calls = [];
  const bar = initBar({ profile, root, onWork: () => calls.push('work'), onAbout: () => calls.push('about') });
  return { root, bar, calls };
};

test('initBar requires both intent callbacks', () => {
  const root = document.createElement('nav');
  assert.throws(() => initBar({ profile: PROFILE, root }), /onWork and onAbout/);
  assert.throws(() => initBar({ profile: PROFILE, root, onWork: () => {} }), /onWork and onAbout/);
});

test('renders name + availability escaped, starts inert, show/hide toggle it', () => {
  const p = structuredClone(PROFILE);
  p.name = 'Ya<rin'; p.status.availability = 'now & then';
  const { root, bar } = mount(p);
  assert.equal(root.querySelector('.bar-name').textContent, 'Ya<rin');
  assert.ok(root.innerHTML.includes('Ya&lt;rin'));
  assert.ok(root.innerHTML.includes('now &amp; then'));
  assert.equal(root.inert, true);
  assert.ok(!root.classList.contains('show'));
  bar.show();
  assert.equal(root.inert, false);
  assert.ok(root.classList.contains('show'));
  bar.hide();
  assert.equal(root.inert, true);
  assert.ok(!root.classList.contains('show'));
});

test('Work / About dispatch their callbacks', () => {
  const { root, calls } = mount();
  click(root.querySelector('[data-act="work"]'));
  click(root.querySelector('[data-act="about"]'));
  assert.deepEqual(calls, ['work', 'about']);
});

test('Copy email writes the email and flips the label, or reports failure', async () => {
  const { root } = mount();
  const btn = root.querySelector('.bar-copy');

  click(btn);   // no clipboard API at all
  assert.equal(btn.textContent, 'Copy failed');
  await tick(1900);
  assert.equal(btn.textContent, 'Copy email', 'failure label reverts too');

  let written = null;
  navigator.clipboard = { writeText: (v) => { written = v; return Promise.resolve(); } };
  click(btn);
  await tick();
  assert.equal(written, PROFILE.links.email);
  assert.equal(btn.textContent, 'Copied');
  await tick(1900);
  assert.equal(btn.textContent, 'Copy email');
});
