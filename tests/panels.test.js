import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, click, tick } from './_dom.js';
import { PROFILE } from '../src/content/profile.js';

installDom({ reducedMotion: true });   // count-up resolves synchronously under reduced motion
const { initPanels } = await import('../src/panels.js');

const BEATS = [
  { name: 'Opening' },
  { name: 'Hero', stop: 'hero' },
  { name: 'Intro', stop: 'intro' },
  { name: 'CV', stop: 'cv' },
  { name: 'How I Build', stop: 'build' },
  { name: 'TEEPO', stop: 'project', id: 'teepo', also: 'aerocy', side: 'left', groupLabel: 'Landing pages' },
  { name: 'Contact', stop: 'contact' },
];
// index of each stop inside BEATS, by name — so reordering the fixture can't rot the test
const I = Object.fromEntries(BEATS.map((b, i) => [b.stop || 'opening', i]));

const mount = (beats = BEATS) => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  return { root, panels: initPanels({ beats, profile: PROFILE, root }) };
};

test('mounts one hidden, inert section per beat that has a stop', () => {
  const { root, panels } = mount();
  assert.ok(panels.el(I.hero).querySelector('.hero-line'), 'hero stop carries the positioning line');
  const secs = root.querySelectorAll('section.stop');
  assert.equal(secs.length, 6);
  assert.equal(panels.el(0), null);
  for (const s of secs) {
    assert.equal(s.getAttribute('aria-hidden'), 'true');
    assert.equal(s.inert, true);
    assert.ok(!s.classList.contains('in'));
  }
  assert.equal(panels.el(I.project).id, 'stop-teepo');
  assert.equal(panels.el(I.project).dataset.side, 'left');
  assert.equal(panels.el(I.project).querySelector('.group-label').textContent, 'Landing pages');
  assert.equal(panels.el(I.cv).id, `stop-${I.cv}`);
});

test('throws on an unknown stop type or a project id missing from the profile', () => {
  assert.throws(() => mount([{ stop: 'nope' }]), /unknown stop type "nope"/);
  assert.throws(() => mount([{ stop: 'project', id: 'ghost' }]), /no featured project with id "ghost"/);
  assert.throws(() => mount([{ stop: 'project', id: 'teepo', also: 'ghost' }]), /id "ghost" \(also\)/);
});

test('show/hide toggle .in, aria-hidden and inert together', () => {
  const { panels } = mount();
  panels.show(I.intro);
  const intro = panels.el(I.intro);
  assert.ok(intro.classList.contains('in'));
  assert.equal(intro.getAttribute('aria-hidden'), 'false');
  assert.equal(intro.inert, false);

  panels.show(I.project);   // moving on conceals the previous stop immediately
  assert.ok(!intro.classList.contains('in'));
  assert.equal(intro.getAttribute('aria-hidden'), 'true');
  assert.equal(intro.inert, true);
  assert.equal(panels.el(I.project).inert, false);

  panels.hide();
  assert.equal(panels.el(I.project).inert, true);
  assert.ok(!panels.el(I.project).classList.contains('in'));

  panels.show(0);   // a beat without a stop is a no-op
  assert.equal(panels.el(0), null);
});

test('proof numbers resolve to their data-n on the build stop', () => {
  const { panels } = mount();
  panels.show(I.build);
  const nums = [...panels.el(I.build).querySelectorAll('.num[data-n]')];
  assert.equal(nums.length, PROFILE.proof.length);
  for (const n of nums) assert.equal(n.textContent, n.dataset.n);
});

test('Download CV calls window.print', () => {
  const { panels } = mount();
  let printed = 0; window.print = () => { printed++; };
  panels.show(I.cv);
  click(panels.el(I.cv).querySelector('[data-print-cv]'));
  assert.equal(printed, 1);
});

test('copy email: swallows the mailto only when the clipboard write succeeds', async () => {
  const { panels } = mount();
  panels.show(I.contact);
  const a = panels.el(I.contact).querySelector('a.mail[data-copy-email]');
  const small = a.querySelector('small');
  const original = small.textContent;

  assert.equal(click(a), true, 'no clipboard → let the mailto navigate');

  let written = null;
  navigator.clipboard = { writeText: (v) => { written = v; return Promise.resolve(); } };
  assert.equal(click(a), false, 'clipboard ok → default prevented');
  assert.equal(written, PROFILE.links.email);
  await tick();
  assert.equal(small.textContent, 'Copied');
  await tick(1900);
  assert.equal(small.textContent, original);

  navigator.clipboard = { writeText: () => Promise.reject(new Error('denied')) };
  click(a);
  await tick();
  assert.equal(small.textContent, 'Copy failed');
  await tick(1900);
  assert.equal(small.textContent, original);
});
