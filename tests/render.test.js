import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, renderHi, renderAbout, renderTimeline, renderBuild, renderProject, renderContact } from '../src/render.js';
import { PROFILE } from '../src/content/profile.js';

test('esc escapes html', () => {
  assert.equal(esc('<a & b>'), '&lt;a &amp; b&gt;');
});

test('hi renders greeting, status and two lines, side left', () => {
  const h = renderHi(PROFILE);
  assert.ok(h.includes('data-side="left"'));
  assert.ok(h.includes(esc(PROFILE.hi.greeting)));
  assert.ok(h.includes(esc(PROFILE.hi.status)));
  assert.equal((h.match(/class="line"/g) || []).length, 2);
});

test('about renders title, three paragraphs, side right, and never draws photos', () => {
  const h = renderAbout(PROFILE);
  assert.ok(h.includes('data-side="right"'));
  assert.equal((h.match(/class="para"/g) || []).length, 3);
  assert.ok(!h.includes('<img'), 'photos are WebGL panels, not DOM images');
});

test('timeline renders one row per entry, a dot each, and the print pill', () => {
  const h = renderTimeline(PROFILE);
  assert.equal((h.match(/class="tl-row"/g) || []).length, PROFILE.timeline.rows.length);
  assert.equal((h.match(/class="tl-dot"/g) || []).length, PROFILE.timeline.rows.length);
  assert.ok(h.includes('data-print-cv'));
  assert.ok(h.includes('Search and Rescue') === false, 'timeline is about code, not service');
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
  const h = renderHi({ hi: { greeting: '<script>x</script>', status: 'a & b', lines: ['<b>'] } });
  assert.ok(!h.includes('<script>'));
  assert.ok(h.includes('a &amp; b'));
  const hp = renderProject({ id: 'q', name: 'n', kind: 'k', tag: 't', tint: '#000000', problem: 'p', decision: 'd', outcome: 'o', stack: 's', url: 'https://x.test/?a="b"', repo: '' }, 'left');
  assert.ok(!hp.includes('?a="b"'));
  assert.ok(hp.includes('&quot;b&quot;'));
});

test('renderers expose the DOM hooks panels.js binds to', () => {
  assert.ok(renderTimeline(PROFILE).includes('data-print-cv'));
  assert.ok(renderContact(PROFILE).includes('data-copy-email'));
  assert.ok(renderContact(PROFILE, 2031).includes('2031'));
});

test('build lead card links GitHub when the lead repo is public, and rows must exist', () => {
  const p = structuredClone(PROFILE);
  p.buildStop = { lead: 'teepo', rows: ['shadiez'] };
  const h = renderBuild(p);
  assert.ok(h.includes(`href="${PROFILE.work.featured.find((x) => x.id === 'teepo').repo}"`));
  assert.ok(!h.includes('private repo'));
  p.buildStop.rows = ['ghost'];
  assert.throws(() => renderBuild(p), /no featured project "ghost"/);
});

test('a project stop can fold in a second project as an Also row', () => {
  const teepo = PROFILE.work.featured.find((x) => x.id === 'teepo');
  const aerocy = PROFILE.work.featured.find((x) => x.id === 'aerocy');
  const h = renderProject(teepo, 'right', aerocy);
  assert.ok(h.includes('class="also"'));
  assert.ok(h.includes(aerocy.name));
  assert.ok(h.includes(aerocy.outcome));
  assert.ok(h.includes(`href="${aerocy.url}"`));
  assert.ok(!renderProject(teepo, 'right').includes('class="also"'), 'no row without a second project');
});

test('outcome leads the project block, above Problem and Decision', () => {
  const h = renderProject(PROFILE.work.featured[0], 'left');
  const teepo = PROFILE.work.featured[0];
  assert.ok(h.indexOf(teepo.outcome) < h.indexOf('Problem'));
  assert.ok(!h.includes('<dt>Outcome</dt>'));
});

test('contact offers a way back to the start', () => {
  assert.ok(renderContact(PROFILE).includes('href="#top"'));
});
