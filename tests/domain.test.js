import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { PROFILE } from '../src/content/profile.js';

const OLD = 'the-void-khaki-pi.vercel.app';
const root = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, root), 'utf8');
function walk(dir, out = []) {
  for (const f of readdirSync(new URL(dir, root))) {
    const rel = dir + f, st = statSync(new URL(rel, root));
    if (st.isDirectory()) walk(rel + '/', out); else out.push(rel);
  }
  return out;
}

test('the old Vercel host is gone from the shipped site (vercel.json redirects it on purpose)', () => {
  const files = ['index.html', 'public/robots.txt', 'public/sitemap.xml', ...walk('src/')];
  for (const f of files) assert.ok(!read(f).includes(OLD), `${f} still names ${OLD}`);
});

test('canonical, sitemap and profile.links.site agree on the domain', () => {
  const host = new URL(PROFILE.links.site).host;
  assert.equal(host, 'yarinlevin.com');
  assert.ok(read('index.html').includes(`<link rel="canonical" href="https://${host}/" />`));
  assert.ok(read('public/sitemap.xml').includes(`https://${host}/`));
  assert.ok(read('public/robots.txt').includes(`https://${host}/sitemap.xml`));
});
