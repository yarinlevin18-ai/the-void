import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, sentences, renderHi, renderAbout, renderTimeline, renderBuild, renderProject, renderContact, renderBuildLog, telHref } from '../src/render.js';
import { PROFILE } from '../src/content/profile.js';

test('esc escapes html', () => {
  assert.equal(esc('<a & b>'), '&lt;a &amp; b&gt;');
});

test('hi renders greeting, status and two lines, side left', () => {
  const h = renderHi(PROFILE);
  assert.ok(h.includes('data-side="left"'));
  assert.ok(h.includes(esc(PROFILE.hi.greeting)));
  for (const seg of PROFILE.hi.status.split(' · ')) assert.ok(h.includes(`<span class="seg">${esc(seg)}`), seg);
  assert.equal((h.match(/class="line"/g) || []).length, 2);
});

test('sentences: one span per sentence, text kept whole', () => {
  assert.equal(sentences('One. Two? Three!'), '<span class="sent">One.</span> <span class="sent">Two?</span> <span class="sent">Three!</span>');
  assert.equal(sentences('One sentence, no break'), '<span class="sent">One sentence, no break</span>');
  assert.equal(sentences('a < b'), '<span class="sent">a &lt; b</span>');
  assert.equal(sentences('My dad’s M.A. thesis. B.A. student, e.g. at BGU. Done.'),
    '<span class="sent">My dad’s M.A. thesis.</span> <span class="sent">B.A. student, e.g. at BGU.</span> <span class="sent">Done.</span>');
});

test('about renders title, three paragraphs, side right, and the two photos as portrait-only figures', () => {
  const h = renderAbout(PROFILE);
  assert.ok(h.includes('data-side="right"'));
  assert.equal((h.match(/class="para"/g) || []).length, 3);
  assert.equal((h.match(/<img /g) || []).length, PROFILE.about.photos.length);
  for (const x of PROFILE.about.photos) { assert.ok(h.includes(`src="${x.src}"`)); assert.ok(h.includes(`alt="${x.caption}"`)); }
  assert.ok(h.includes('class="stop-imgs"') && h.includes('class="stop-img lead"'));
});

test('hi and project carry their imagery as a portrait-only figure with alt text', () => {
  const hi = renderHi(PROFILE);
  assert.ok(hi.includes(`class="stop-img portrait"`) && hi.includes(`src="${PROFILE.hi.portrait}"`));
  const teepo = PROFILE.work.featured.find((p) => p.id === 'teepo');
  const hp = renderProject(teepo, 'left');
  assert.ok(hp.includes(`class="stop-img shot"`) && hp.includes(`src="${teepo.img}"`) && hp.includes('alt="TEEPO — screenshot"'));
  assert.ok(hp.indexOf('stop-img') < hp.indexOf('class="eyebrow"'), 'figure comes before the words');
  assert.ok(!renderProject({ ...teepo, img: '' }, 'left').includes('<img'), 'no figure without an image');
  assert.ok(renderProject({ ...teepo, phone: true }, 'left').includes(`class="stop-img shot phone"`), 'a phone capture gets the shorter phone figure');
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
  const focus = PROFILE.work.featured.find((p) => p.id === 'thesis');   // a private build with no live link (Focus until 2026-09-29)
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

test('contact renders mailto and text links', () => {
  const h = renderContact(PROFILE);
  assert.ok(h.includes('href="mailto:' + PROFILE.links.email + '"'));
  assert.ok(!h.includes('card-foot'), 'no availability footer');
  assert.ok(h.includes('>GitHub<') && h.includes('>LinkedIn<'));
  assert.equal(h.includes('>X<'), false);
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

test('a project with abilities or potential renders the list twice: text column and strip', () => {
  const base = { id: 'q', name: 'n', kind: 'k', tag: 't', tint: '#000000', problem: 'p', decision: 'd', outcome: 'o', stack: 'A · B', url: '', private: true };
  const h = renderProject({ ...base, potential: [{ t: 'Spend <control>', d: 'one line' }, { t: 'b', d: 'x' }, { t: 'c', d: 'y' }] }, 'right');
  assert.ok(h.includes('class="project has-xl"'), 'the article is flagged for the phone compaction');
  const art = h.slice(0, h.indexOf('</article>'));
  assert.ok(art.includes('class="xl xl-flow"') && art.indexOf('xl-flow') < art.indexOf('class="stack"'), 'the flow list sits in the text column, before the stack');
  assert.ok(h.slice(h.indexOf('</article>')).includes('class="xl xl-strip"'), 'the strip is a sibling of the article, positioned against the stop');
  assert.ok(h.includes('Potential') && h.includes('Spend &lt;control&gt;') && !h.includes('<control>'), 'label shown, text escaped');
  const many = renderProject({ ...base, abilities: Array.from({ length: 8 }, (_, i) => ({ t: `a${i}`, d: 'd' })) }, 'right');
  assert.ok(many.includes('xl-strip many') && many.includes('Abilities'), 'eight abilities get the four-column strip');
  assert.ok(!renderProject(base, 'left').includes('class="xl'), 'no list, no markup');
  assert.ok(renderProject(base, 'left').includes('Private build') && renderProject({ ...base, pill: 'Personal app' }, 'left').includes('>Personal app<'), 'an unlinked project can say why it has no link');
  assert.ok(renderProject(base, 'left').includes('<span class="seg">A ·</span> <span class="seg">B</span>'), 'stack items never break inside, and a line never starts with a dot');
});

test('outcome leads the project block, above Problem and Decision', () => {
  const h = renderProject(PROFILE.work.featured[0], 'left');
  const teepo = PROFILE.work.featured[0];
  assert.ok(h.indexOf(teepo.outcome) < h.indexOf('Problem'));
  assert.ok(!h.includes('<dt>Outcome</dt>'));
});

test('contact renders a card: name, role, mail, tel, socials', () => {
  const h = renderContact(PROFILE);
  assert.ok(h.includes('class="card"'));
  assert.ok(h.includes(`<h2 class="card-name">${PROFILE.name}</h2>`));
  assert.ok(h.includes(`<p class="card-role">${PROFILE.title}</p>`));
  assert.ok(h.includes(`href="mailto:${PROFILE.links.email}"`));
  assert.ok(h.includes('data-copy-email'));
  assert.ok(h.includes('href="tel:+972548029820"'), 'tel href drops the leading 0 and dashes');
  assert.ok(h.includes(`>${PROFILE.links.phone}<`), 'the visible phone keeps its local format');
  assert.ok(h.includes('>GitHub<') && h.includes('>LinkedIn<'));
  assert.equal(h.includes('>X<'), false);
  assert.ok(!h.includes('href="#top"'), 'no in-page anchor: the door is the ending');
  assert.ok(!h.includes('class="foot"'), 'no year footer');
});

test('telHref normalises an Israeli local number', () => {
  assert.equal(telHref('054-8029820'), 'tel:+972548029820');
  assert.equal(telHref('+972 54 802 9820'), 'tel:+972548029820');
  assert.equal(telHref(''), '');
});

test('contact card carries the build stamp when one is injected', () => {
  const built = { label: '14 Sep 2026', iso: '2026-09-14' };
  const h = renderContact(PROFILE, built);
  assert.ok(h.includes('class="card-row card-built"'));
  assert.ok(h.includes('<time datetime="2026-09-14">14 Sep 2026</time>'));
  assert.ok(!renderContact(PROFILE).includes('card-built'), 'no stamp without a build');
});

test('the build log renders a heatmap cell per day, the counts and the latest commits', () => {
  const log = { first: '2026-06-21', today: '2026-06-24', commits: 5, activeDays: 2, streak: 1, tests: 9,
    days: [3, 0, 0, 2], recent: [{ h: 'abc1234', d: '2026-06-24', s: 'fix <b>' }] };
  const h = renderBuildLog(log);
  const grid = h.slice(h.indexOf('blog-grid'), h.indexOf('blog-side'));
  assert.equal((grid.match(/data-l="[0-4]"/g) || []).length, 4, 'one cell per day');
  assert.equal((grid.match(/data-l="x"/g) || []).length, 0, '2026-06-21 is a Sunday: no padding');
  assert.ok(grid.includes('data-l="2"') && grid.includes('data-l="1"'), '3 commits → level 2, 2 → level 1');
  assert.ok(h.includes('9 tests passing'));
  assert.ok(h.includes('fix &lt;b&gt;'), 'commit subjects are escaped');
  assert.equal(renderBuildLog(null), '', 'no log, no strip');
  assert.ok(renderBuild(PROFILE, log).includes('class="blog"'), 'How I Build carries the strip');
  assert.ok(!renderBuild(PROFILE).includes('class="blog"'));
});

test('contact: the finale lead-in types per character but reads whole to screen readers', () => {
  const h = renderContact(PROFILE);
  assert.ok(h.includes(`<span class="sr-only">${esc(PROFILE.finale.lead)}</span>`));
  assert.ok(h.includes(`<span class="sr-only">${esc(PROFILE.finale.line)}</span>`));
  assert.equal((h.match(/style="--c:/g) || []).length, [...PROFILE.finale.lead].length + [...PROFILE.finale.line].length);
});
