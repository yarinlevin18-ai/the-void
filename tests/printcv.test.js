import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './_dom.js';
import { PROFILE } from '../src/content/profile.js';

installDom();
const { mountPrintCV } = await import('../src/printcv.js');

test('mountPrintCV mounts #print-cv once', () => {
  mountPrintCV(PROFILE);
  mountPrintCV(PROFILE);
  assert.equal(document.querySelectorAll('#print-cv').length, 1);
  const el = document.getElementById('print-cv');
  assert.equal(el.getAttribute('aria-hidden'), 'true');
  assert.ok(el.querySelector('h1').textContent.includes(PROFILE.name));
  assert.equal(el.querySelectorAll('.pcv-item').length, PROFILE.cv.experience.length + PROFILE.cv.education.length + 1 /* service */);
});

test('every class the print stylesheet targets is emitted', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const print = css.slice(css.indexOf('@media print'));
  const classes = new Set([...print.matchAll(/\.(pcv-[a-z-]+)/g)].map((m) => m[1]));
  assert.ok(classes.size >= 4, 'print block names pcv-* classes');
  const html = document.getElementById('print-cv').innerHTML;
  for (const c of classes) assert.ok(html.includes(`class="${c}"`), `missing .${c}`);
});

test('link fields in the header are escaped', () => {
  document.getElementById('print-cv').remove();
  const hostile = structuredClone(PROFILE);
  hostile.links = { ...hostile.links, email: 'a<b@x.test', phone: '<1>', linkedin: 'https://www.<l>', github: 'https://<g>', site: 'https://<s>' };
  mountPrintCV(hostile);
  const contact = document.querySelector('#print-cv .pcv-contact').innerHTML;
  assert.ok(!/<[a-z]/i.test(contact), contact);
  for (const raw of ['a&lt;b@x.test', '&lt;1&gt;', '&lt;l&gt;', '&lt;g&gt;', '&lt;s&gt;']) assert.ok(contact.includes(raw), raw);
});
