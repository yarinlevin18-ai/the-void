import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { flightOrder, workList, alsoLine, noscriptPlugin } from '../scripts/noscript.js';
import { PROFILE } from '../src/content/profile.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('the no-JS Work list follows the flight and names every project stop and its also-row', () => {
  const order = flightOrder(main);
  assert.equal(order.length, 7);
  const list = workList(PROFILE, order);
  for (const { id, also } of order) {
    for (const x of [id, also].filter(Boolean)) assert.ok(list.includes(PROFILE.work.featured.find((p) => p.id === x).name.replace(/’/g, '’')), x);
  }
  assert.ok(!/Focus/.test(list), 'Focus left the flight');
  assert.ok(html.includes('<!-- noscript:work'), 'index.html keeps the marker vite.config.js fills');
});

test('noscript and JSON-LD contact details match profile.js', () => {
  const { email, phone, linkedin, github } = PROFILE.links;
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld.mainEntity.email, `mailto:${email}`);
  assert.equal(ld.mainEntity.telephone, phone);
  assert.deepEqual(ld.mainEntity.sameAs, [linkedin, github]);
  const ns = html.slice(html.lastIndexOf('<noscript>'));
  for (const v of [email, phone, linkedin, github]) assert.ok(ns.includes(v), v);
});

test('the no-JS "Also" line names every other shipped project and every lab, from profile.js', () => {
  const line = alsoLine(PROFILE);
  for (const x of [...PROFILE.work.shipped, ...PROFILE.work.labs]) assert.ok(line.includes(x.name.replace(/&/g, '&amp;')), x.name);
  const out = noscriptPlugin(new URL('..', import.meta.url).pathname.replace(/\/$/, ''), PROFILE).transformIndexHtml(html);
  assert.ok(!out.includes('noscript:also') && !out.includes('noscript:work'), 'both markers are filled');
  assert.ok(out.includes(`<p>${line}</p>`));
});
