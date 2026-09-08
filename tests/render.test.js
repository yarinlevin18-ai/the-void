import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, renderIntro, renderCV, renderBuild, renderProject, renderContact } from '../src/render.js';
import { PROFILE } from '../src/content/profile.js';

test('esc escapes html', () => {
  assert.equal(esc('<a & b>'), '&lt;a &amp; b&gt;');
});

test('intro renders one .line per sentence plus context', () => {
  const h = renderIntro(PROFILE);
  assert.equal((h.match(/class="line"/g) || []).length, PROFILE.intro.lines.length);
  assert.ok(h.includes(PROFILE.intro.context));
});

test('cv renders 5 rows with years and role', () => {
  const h = renderCV(PROFILE);
  assert.equal((h.match(/class="cv-row"/g) || []).length, PROFILE.cvStop.length);
  assert.ok(h.includes('Rescue &amp; Training'));
});

test('build renders method, 3 proof numbers with data-n, and the gateway card', () => {
  const h = renderBuild(PROFILE);
  assert.equal((h.match(/data-n="\d+"/g) || []).length, PROFILE.proof.length);
  assert.ok(h.includes('LLM Gateway'));
  assert.ok(h.includes('shaar-ai-landing.vercel.app'));
  assert.ok(h.includes('github.com/yarinlevin18-ai/TEEPO'));
});

test('project: public repo gets a repo link, private build gets the label and no repo', () => {
  const teepo = PROFILE.work.featured.find((p) => p.id === 'teepo');
  const focus = PROFILE.work.featured.find((p) => p.id === 'focus');
  const gateway = PROFILE.work.featured.find((p) => p.id === 'llm-gateway');
  const ht = renderProject(teepo, 'left');
  assert.ok(ht.includes('href="https://github.com/yarinlevin18-ai/TEEPO"'));
  assert.ok(ht.includes('data-side="left"'));
  const hf = renderProject(focus, 'right');
  assert.ok(hf.includes('Private build'));
  assert.ok(!hf.includes('github.com'));
  assert.ok(!hf.includes('Visit live'));
  const hg = renderProject(gateway, 'left');
  assert.ok(hg.includes('Visit live'));
  assert.ok(hg.includes('Private repo'));
});

test('contact renders mailto, availability and text links', () => {
  const h = renderContact(PROFILE);
  assert.ok(h.includes('href="mailto:' + PROFILE.links.email + '"'));
  assert.ok(h.includes(PROFILE.contact.availability));
  assert.ok(h.includes('>GitHub<') && h.includes('>LinkedIn<'));
  assert.equal(h.includes('>X<'), !!PROFILE.links.x);
});

test('renderers escape hostile text and attributes', () => {
  const h = renderIntro({ intro: { lines: ['<script>x</script>'], context: 'a & b' } });
  assert.ok(!h.includes('<script>'));
  assert.ok(h.includes('a &amp; b'));
  const hp = renderProject({ id: 'q', name: 'n', kind: 'k', tag: 't', tint: '#000000', problem: 'p', decision: 'd', outcome: 'o', stack: 's', url: 'https://x.test/?a="b"', repo: '' }, 'left');
  assert.ok(!hp.includes('?a="b"'));
  assert.ok(hp.includes('&quot;b&quot;'));
});

test('renderers expose the DOM hooks panels.js binds to', () => {
  assert.ok(renderCV(PROFILE).includes('data-print-cv'));
  assert.ok(renderContact(PROFILE).includes('data-copy-email'));
  assert.ok(renderContact(PROFILE, 2031).includes('2031'));
});
