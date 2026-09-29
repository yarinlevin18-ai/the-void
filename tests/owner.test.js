import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { banner, humans, notice, ownerPlugin } from '../scripts/owner.js';
import { PROFILE } from '../src/content/profile.js';

const root = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, root), 'utf8');
const html = read('index.html');
const built = { label: '14 Sep 2026', iso: '2026-09-14' };
const deps = Object.keys(JSON.parse(read('package.json')).dependencies);

test('the banner is a legal comment naming the owner, the year, the site and where the other licenses are', () => {
  const b = banner(PROFILE, 2026);
  assert.ok(b.startsWith('/*!') && b.endsWith('*/') && b.indexOf('*/') === b.length - 2);
  for (const s of [notice(PROFILE, 2026), PROFILE.links.site, 'All rights reserved', '/licenses.txt']) assert.ok(b.includes(s), s);
});

test('the build plugin marks every JS chunk and CSS file, leaves images alone and emits humans.txt', () => {
  const bundle = {
    'assets/index.js': { type: 'chunk', fileName: 'assets/index.js', code: 'run()' },
    'assets/index.css': { type: 'asset', fileName: 'assets/index.css', source: 'a{}' },
    'og.jpg': { type: 'asset', fileName: 'og.jpg', source: new Uint8Array([1, 2]) },
  };
  const emitted = [];
  ownerPlugin(PROFILE, built, deps).generateBundle.call({ emitFile: (f) => emitted.push(f) }, {}, bundle);
  const mark = banner(PROFILE, '2026') + '\n';
  assert.equal(bundle['assets/index.js'].code, mark + 'run()');
  assert.equal(bundle['assets/index.css'].source, mark + 'a{}');
  assert.deepEqual([...bundle['og.jpg'].source], [1, 2]);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].fileName, 'humans.txt');
  assert.equal(emitted[0].source, humans(PROFILE, built, deps));
});

test('humans.txt names the owner and only the libraries the site really ships', () => {
  const h = humans(PROFILE, built, deps);
  for (const s of [`Design and code: ${PROFILE.name}`, `Site: ${PROFILE.links.site}`, 'Last update: 2026-09-14', `Components: ${deps.join(', ')}, Vite`, '© 2026']) assert.ok(h.includes(s), s);
  assert.deepEqual(deps, ['three'], 'three.quarks and meshline were never imported and left package.json (2026-09-29)');
});

test('index.html: the plugin fills both owner markers', () => {
  assert.ok(html.includes('<!-- owner:banner -->') && html.includes('<!-- owner:notice'));
  const out = ownerPlugin(PROFILE, built, deps).transformIndexHtml(html);
  assert.ok(!out.includes('owner:'), 'no marker left behind');
  assert.ok(out.includes(`<!-- The Void — © 2026 ${PROFILE.name} · ${PROFILE.links.site} · All rights reserved. -->`));
  assert.ok(out.includes(`<p><small>© 2026 ${PROFILE.name}. All rights reserved.</small></p>`));
});

test('index.html names the owner the way profile.js does', () => {
  const meta = (attr, key) => html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
  const head = `${PROFILE.name} — ${PROFILE.title}`;
  assert.equal(html.match(/<title>([^<]*)<\/title>/)[1], head);
  assert.equal(meta('property', 'og:title'), head);
  assert.equal(meta('name', 'twitter:title'), head);
  assert.equal(meta('name', 'author'), PROFILE.name);
  assert.ok(html.includes('<link rel="author" href="/humans.txt" />'));
  assert.equal(html.match(/<h1>([^<]*)<\/h1>/)[1].replace(/&nbsp;/g, ' '), PROFILE.name);
  assert.equal(html.match(/id="ld-mark" aria-label="([^"]*)"/)[1], PROFILE.name);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld.mainEntity.name, PROFILE.name);
  assert.equal(ld.author['@id'], ld.mainEntity['@id']);
  assert.equal(ld.copyrightHolder['@id'], ld.mainEntity['@id']);
  assert.ok(ld.copyrightNotice.includes(PROFILE.name));
});

test('no source file spells out the owner\'s name — it comes from profile.js', () => {
  const walk = (dir) => readdirSync(new URL(dir, root)).flatMap((f) => statSync(new URL(dir + f, root)).isDirectory() ? walk(dir + f + '/') : [dir + f]);
  const names = [PROFILE.name, PROFILE.name.toUpperCase()];
  for (const f of walk('src/').filter((f) => f.endsWith('.js') && f !== 'src/content/profile.js')) {
    const src = read(f);
    for (const n of names) for (const q of ["'", '`']) assert.ok(!src.includes(q + n + q), `${f} hard-codes ${q}${n}${q}`);
  }
});

test('vercel.json: a self-only Content-Security-Policy, and only hashed build files cached for a year', () => {
  const rules = JSON.parse(read('vercel.json')).headers;
  const all = Object.fromEntries(rules.find((r) => r.source === '/(.*)').headers.map((h) => [h.key, h.value]));
  const csp = all['Content-Security-Policy'];
  assert.ok(csp.includes("default-src 'self'") && csp.includes("script-src 'self';") && csp.includes("frame-ancestors 'none'"));
  assert.ok(!/https?:|\*/.test(csp), 'the site makes no external requests, and the policy keeps it that way');
  for (const k of ['X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) assert.ok(all[k], k);
  const hashed = rules.find((r) => r.headers.some((h) => /immutable/.test(h.value)));
  const re = new RegExp('^' + hashed.source.replace(/:\w+(\([^)]*\))/g, '$1') + '$');   // path-to-regexp, as Vercel reads it
  assert.ok(re.test('/assets/index-CQxhjoZ1.js') && re.test('/assets/index-Bciwq0_3.css'));
  assert.ok(!re.test('/assets/me/portrait.webp') && !re.test('/assets/loader/void-loop.webp'), 'public/assets files are not hashed: they must stay revalidated');
});
