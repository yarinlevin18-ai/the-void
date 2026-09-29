import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { flightOrder, workList } from '../scripts/noscript.js';
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
