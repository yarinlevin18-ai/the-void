import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

// The loader ships no media (2026-10-14): the Aperture iris shows the live void itself, so the
// Higgsfield loop's poster left with the constellation (the clip itself left on 2026-09-29).
test('the loader ships no media: neither the old loop clip nor its poster', () => {
  for (const f of ['void-loop.webp', 'void-loop.mp4']) assert.ok(!existsSync(new URL(`../public/assets/loader/${f}`, import.meta.url)), f);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const loader = html.slice(html.indexOf('<div id="loader">'), html.indexOf('<canvas id="scene"'));
  assert.ok(!/<(img|video)|poster=/.test(loader), 'the loader is markup only');
});
