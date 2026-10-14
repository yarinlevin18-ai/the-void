// render.js — pure functions: PROFILE data → HTML strings for each flight stop.
// No DOM, no Three.js, no side effects: runs in node --test as well as the browser.
import { gatewayOutcome } from './gateway.js';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const escAttr = (s) => esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const eyebrow = (t) => `<div class="eyebrow">${esc(t)}</div>`;

// Portrait screens show a stop's imagery as a DOM <img> in flow above the text
// (2026-09-17): the WebGL panels render soft through the touch tier's 1.25× DPR
// cap and, with Safari's URL bar shortening the viewport, landed on the words.
// CSS hides these figures on wide screens, where the WebGL panels take over. The
// words after a figure sit in one .stop-txt block (2026-09-30), so a landscape
// phone can put the figure beside them instead of above.
const figure = (src, alt, cls) => src ? `<figure class="stop-img ${cls}"><img src="${escAttr(src)}" alt="${escAttr(alt)}" loading="lazy" decoding="async"></figure>` : '';

// One sentence per line (2026-09-29): a short statement wraps at its sentence
// breaks, never mid-sentence with one word dropped onto the next line.
// `.sent` is a block in style.css; a sentence too long for the column balances.
// Abbreviations don't end a sentence: initials like "B.A." / "M.A." and e.g. / i.e. / vs. / etc.
export const sentences = (t) => String(t).split(/(?<=[.!?])(?<!\b(?:[A-Z]\.)+)(?<!\b(?:e\.g|i\.e|vs|etc)\.)\s+(?=\S)/).map((x) => `<span class="sent">${esc(x)}</span>`).join(' ');
// Typed headings (2026-10-13): a stop's heading writes itself in on arrival, one character
// at a time with a caret riding the newest one (style.css `.tw`). Screen readers get the
// heading whole; the per-character spans are hidden from them. Words never break apart: there
// is no break opportunity between two inline spans, only at the spaces.
export const typed = (t, from = 0) => [...String(t)].map((ch, i) => `<span style="--c:${from + i}">${esc(ch)}</span>`).join('');
// Headings (2026-10-13, random entrances): each word is one unbreakable box of character spans,
// so a character can move on its own (inline-block) without a line breaking inside the word.
// `--c` is the reading position, `--r` a fixed shuffled position for the scatter entrance.
const shuffled = (n) => [...Array(n).keys()].sort((a, b) => ((a * 7919 + 13) % 101) - ((b * 7919 + 13) % 101));
export const typedHeading = (t) => {
  const chars = [...String(t)], ink = chars.flatMap((ch, i) => (ch === ' ' ? [] : [i])), pos = [];
  shuffled(ink.length).forEach((k, j) => { pos[ink[k]] = j; });
  let html = '', word = '';
  chars.forEach((ch, i) => {
    if (ch === ' ') { html += `<span class="w">${word}</span> `; word = ''; return; }
    word += `<span style="--c:${i};--r:${pos[i]}">${esc(ch)}</span>`;
  });
  html += `<span class="w">${word}</span>`;
  return `<span class="sr-only">${esc(t)}</span><span class="tw" aria-hidden="true">${html}</span>`;
};
// A " · " list (the Hi status) breaks only between its items.
const segments = (t) => String(t).split(' · ').map((x, i, a) => `<span class="seg">${esc(x)}${i < a.length - 1 ? ' ·' : ''}</span>`).join(' ');   // the dot rides with the item before it: a line never starts with one

// 01 Hi — portrait panel on the left (WebGL on landscape, DOM figure on portrait), greeting on the right.
export function renderHi(p) {
  const lines = p.hi.lines.map((l, i) => `<p class="line" style="--i:${i + 1}">${sentences(l)}</p>`).join('');
  return `<article class="hi" data-side="left">
    ${figure(p.hi.portrait, p.hi.portraitAlt || p.name || 'Portrait', 'portrait')}
    <div class="stop-txt">
    ${eyebrow('Hello')}
    <h2 class="greeting" style="--i:0">${typedHeading(p.hi.greeting)}</h2>
    <div class="status">${segments(p.hi.status)}</div>
    ${lines}
    </div>
  </article>`;
}

// 02 About — two speaking photos on the right (WebGL panels; DOM figures on portrait screens), the story on the left.
export function renderAbout(p) {
  const paras = p.about.paragraphs.map((l, i) => `<p class="para" style="--i:${i + 1}">${sentences(l)}</p>`).join('');
  const photos = (p.about.photos || []).map((x, i) => figure(x.src, x.caption, i === 0 ? 'lead' : 'small')).join('');
  return `<article class="about" data-side="right">
    ${photos ? `<div class="stop-imgs">${photos}</div>` : ''}
    <div class="stop-txt">
    ${eyebrow(p.about.eyebrow)}
    <h2 class="about-title" style="--i:0">${typedHeading(p.about.title)}</h2>
    ${paras}
    </div>
  </article>`;
}

// The Timeline's lab card (2026-09-29): the site's own easing as live code. Markup only;
// labcard.js wires the drag, the loop and the source. Desktop-only in style.css.
export function renderLab() {
  const presets = ['site', 'linear', 'overshoot', 'snap'].map((k) => `<button type="button" data-preset="${k}" aria-pressed="false">${k}</button>`).join('');
  return `<aside class="lab" data-view="play" data-own-gestures aria-label="Lab: the easing curve behind every reveal on this site">
    <div class="lab-hd"><span>Lab<span class="more"> · this site’s easing</span></span>
      <span class="lab-tabs" role="tablist"><button type="button" role="tab" data-tab="play" aria-selected="true">play</button><button type="button" role="tab" data-tab="code" aria-selected="false">code</button></span></div>
    <div class="lab-view lab-play">
      <div class="lab-plot"><canvas aria-hidden="true"></canvas>
        <button type="button" class="lab-h" data-h="1" role="slider" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0.22" aria-label="First control point: drag or use the arrow keys"></button>
        <button type="button" class="lab-h" data-h="2" role="slider" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0.36" aria-label="Second control point: drag or use the arrow keys"></button></div>
      <div class="lab-track" aria-hidden="true"><i data-lab-dot></i></div>
      <div class="lab-presets">${presets}</div>
    </div>
    <pre class="lab-view lab-code"><code data-lab-src></code></pre>
    <code class="lab-call" data-lab-call>ease = cubicBezier(0.22, 1.00, 0.36, 1.00)</code>
  </aside>`;
}

// 03 Timeline — dated rows on a glowing rail, the lab card beside them on desktop.
export function renderTimeline(p) {
  const rows = p.timeline.rows.map((r, i) => `
    <li class="tl-row" style="--i:${i}">
      <span class="tl-dot"></span>
      <span class="tl-when">${esc(r.when)}</span>
      <span class="tl-body"><b class="tl-what">${esc(r.what)}</b><span class="tl-line">${sentences(r.line)}</span></span>
    </li>`).join('');
  return `${eyebrow(p.timeline.eyebrow)}
    <h2 class="tl-title">${typedHeading(p.timeline.title)}</h2>
    <ol class="timeline">${rows}</ol>
    <button type="button" class="pill" data-print-cv>Download CV ↓</button>
    ${renderLab()}`;
}

// The workflow (2026-10-14, Yarin: "a motion graphic … illustrating my workflow and how I think";
// it replaced the build-log heatmap): a canvas that src/workflow.js draws (main.js paints it while
// the stop is open), carrying the real numbers from this site's git history (scripts/buildlog.js
// → __BUILDLOG__). Screen readers get the five steps and the numbers as its label. `log` null →
// the animation still runs, without the counts.
export function renderWorkflow(log) {
  const n = (v) => (Number.isFinite(+v) ? +v : 0);
  const tests = n(log?.tests), commits = n(log?.commits), days = n(log?.activeDays);
  const facts = log ? ` This site so far: ${commits} commits on ${days} days, ${tests} tests passing.` : '';
  const label = `How I build, in five steps. Spec: a written plan, its decisions locked before any code. Build: Claude Code types small chunks while I direct. Review: I review every chunk and send some back. Ship: the full test suite, then a push. Lab: the patterns a build leaves behind start the next one.${facts}`;
  return `<figure class="wf"><canvas class="wf-cv" data-wf data-tests="${tests}" data-commits="${commits}" data-days="${days}" role="img" aria-label="${esc(label)}"></canvas></figure>`;
}

export function renderBuild(p, log = null) {
  const method = p.method.lines.map((l, i) => `<p class="line" style="--i:${i}">${esc(l)}</p>`).join('');
  const proof = p.proof.map((x) => `<div class="proof-item"><b class="num" data-n="${x.n}">0</b><span>${esc(x.label)}</span></div>`).join('');
  const byId = (id) => p.work.featured.find((x) => x.id === id);
  const lead = byId(p.buildStop.lead);
  if (!lead) throw new Error(`renderBuild: no featured project "${p.buildStop.lead}"`);
  const rows = p.buildStop.rows.map((id) => { const x = byId(id); if (!x) throw new Error(`renderBuild: no featured project "${id}"`); return x; });
  const link = (href, label) => href ? `<a href="${escAttr(href)}" target="_blank" rel="noopener">${label} ↗</a>` : '';
  // The stop's only heading (every other stop has an h2 title), styled as its eyebrow.
  return `<h2 class="eyebrow">${typedHeading('How I build')}</h2>
    ${renderWorkflow(log)}
    <div class="method">${method}</div>
    <div class="proof">${proof}</div>
    <div class="repos">
      <div class="repo lead">
        <b>${esc(lead.name)}</b>
        <p>${esc(lead.problem)}</p>
        <div class="stack">${esc(lead.stack)}</div>
        <div class="links">${link(lead.url, 'Live')}${lead.repo ? link(lead.repo, 'GitHub') : '<span class="muted">private repo</span>'}</div>
      </div>
      ${rows.map((r) => `<div class="repo"><b>${esc(r.name)}</b><span class="stack">${esc(r.stack)}</span><div class="links">${link(r.url, 'Live')}${link(r.repo, 'GitHub')}</div></div>`).join('')}
    </div>`;
}

// The exhibit (2026-10-12): a project with `exhibit` gets scenario buttons and an outcome
// line in its text column, and a clip in place of its phone screenshot. The words carry the
// result on their own — the clip illustrates it, so a visitor who can't or won't play video
// misses nothing. exhibit.js wires the buttons and the clip; the first scenario is the
// initial state. The <video> has no src until the stop opens (exhibit.js), so a phone
// doesn't fetch it, or its poster, before the visitor arrives.
export function renderExhibitFigure(x) {
  const s = x.exhibit.scenarios[0];
  return `<figure class="stop-img shot exhibit-fig"><video data-exhibit-video muted playsinline preload="none" data-poster="${escAttr(s.poster)}" aria-label="${escAttr(x.exhibit.alt)}"></video></figure>`;
}
// A walkthrough (profile.js `clip`): the poster holds the figure's layout and its reveal, the
// muted loop fades in over it once it plays (exhibit.js initClip). Nothing loads before arrival
// but the poster, which is the clip's first frame.
export function renderClipFigure(x) {
  return `<figure class="stop-img shot clip"><span class="clip-box"><img src="${escAttr(x.clip.poster)}" alt="${escAttr(x.clip.alt)}" loading="lazy" decoding="async"><video data-clip-video muted playsinline loop preload="none" aria-hidden="true"></video></span></figure>`;
}
export function renderExhibit(x) {
  const [first] = x.exhibit.scenarios, o = gatewayOutcome(first);
  const buttons = x.exhibit.scenarios.map((s) => `<button type="button" data-scenario="${escAttr(s.id)}" aria-pressed="${s === first}">${esc(s.label)}</button>`).join('');
  return `<div class="exhibit" data-scenario="${escAttr(first.id)}" data-verdict="${o.verdict}" data-media="idle">
      <div class="ex-hd"><span>Try it<span class="more"> · fictional numbers</span></span><span class="ex-media" aria-live="polite"></span><button type="button" class="ex-replay" hidden>Replay</button></div>
      <div class="ex-choices" role="group" aria-label="Budget scenario">${buttons}</div>
      <p class="ex-out" role="status"><b class="ex-verdict">${esc(o.label)}</b> <span class="ex-reason">${esc(o.reason)}</span></p>
    </div>`;
}

// 05 Project — outcome leads (the one line the eye lands on), problem and
// decision follow as one sentence each. `also` is an optional second project
// folded into this stop as a compact row (v16: five stops instead of seven).
export function renderProject(x, side, also = null) {
  const live = x.url ? `<a class="pill" href="${escAttr(x.url)}" target="_blank" rel="noopener">Visit live ↗</a>` : `<span class="pill ghost">${esc(x.pill || 'Private build')}</span>`;   // `pill`: what to say when there's no link (Sabai is live, just unlinked)
  const repo = x.repo ? `<a class="pill ghost" href="${escAttr(x.repo)}" target="_blank" rel="noopener">GitHub ↗</a>` : '';
  const privateRepo = (x.url && x.private && !x.repo) ? '<span class="pill ghost">Private repo</span>' : '';
  const small = (href, label) => href ? `<a href="${escAttr(href)}" target="_blank" rel="noopener">${label} ↗</a>` : '';
  // Extra depth (2026-09-29): Cursor Buddy's abilities; what LLM Gateway and Agent
  // Control could become as products. Rendered twice on purpose, like the figures:
  // titles-only in the text column (phones, narrow screens) and as a card strip under
  // the image panel on wide screens (≥ 1100 × 600). CSS shows exactly one.
  const [xLabel, xMore, xItems] = x.abilities ? ['Abilities', 'what it can do', x.abilities] : x.potential ? ['Potential', 'what it could become', x.potential] : [];
  const xl = (cls) => xItems?.length ? `<div class="xl ${cls}"><div class="xl-label">${esc(xLabel)}<span class="more"> · ${esc(xMore)}</span></div><ul>${xItems.map((i) => `<li><b>${esc(i.t)}</b><span>${esc(i.d)}</span></li>`).join(' ')}</ul></div>` : '';   // spaces: the titles-only list wraps between items
  const alsoRow = also ? `
    <div class="also">
      <span class="also-label">Also · ${esc(also.kind)}</span>
      <b>${esc(also.name)}</b>
      <span class="also-line">${esc(also.outcome)}</span>
      <span class="also-links">${small(also.url, 'Visit live')}${small(also.repo, 'GitHub')}</span>
    </div>` : '';
  return `<article class="project${xItems?.length ? ' has-xl' : ''}${x.exhibit ? ' has-exhibit' : ''}" data-side="${escAttr(side)}">
    ${x.exhibit ? renderExhibitFigure(x) : x.clip ? renderClipFigure(x) : x.anim ? `<figure class="stop-img shot anim"><canvas data-anim="${escAttr(x.anim)}" role="img" aria-label="${escAttr(x.animAlt || `${x.name} — animated demo`)}"></canvas></figure>` : figure(x.img, `${x.name} — screenshot`, x.phone ? 'shot phone' : 'shot')}
    <div class="stop-txt">
    ${eyebrow(`${x.kind} · ${x.tag}`)}
    <h2 class="title">${typedHeading(x.name)}</h2>
    <p class="outcome">${esc(x.outcome)}</p>${x.exhibit ? renderExhibit(x) : ''}
    <dl>
      <div><dt>Problem</dt><dd>${esc(x.problem)}</dd></div>
      <div><dt>Decision</dt><dd>${esc(x.decision)}</dd></div>
    </dl>${xl('xl-flow')}
    <div class="stack">${segments(x.stack)}</div>
    <div class="links">${live}${repo}${privateRepo}</div>${alsoRow}
    </div>
  </article>${xl(`xl-strip${xItems?.length > 4 ? ' many' : ''}`)}`;
}

// tel: href — digits only, local 0 → +972. Empty in → empty out (no dead link).
export const telHref = (s) => {
  const d = String(s || '').replace(/\D/g, '');
  if (!d) return '';
  return 'tel:+' + (d.startsWith('972') ? d : d.replace(/^0/, '972'));
};

// 10 Contact — the card the door hands over. Rows carry --i for the stagger.
// `built` = { label: '14 Sep 2026', iso: '2026-09-14' } from Vite's __BUILT__ (injected, so this stays pure).
export function renderContact(p, built = null) {
  const l = p.links;
  const social = [['GitHub', l.github], ['LinkedIn', l.linkedin]].filter(([, h]) => h)
    .map(([n, h]) => `<a href="${escAttr(h)}" target="_blank" rel="noopener">${n}</a>`).join('');
  const tel = telHref(l.phone);
  // The lead-in (2026-09-29): typed one character at a time as the door opens.
  // Screen readers get the sentence whole; the per-character spans are hidden from them.
  const f = p.finale || {};
  // The owner's mark (2026-09-29): © year + name on the last row, then the build stamp.
  // Two .seg spans, so a narrow card breaks between them, never inside one.
  const year = built && built.iso ? built.iso.slice(0, 4) + ' ' : '';
  const stamp = built && built.label ? ` <span class="seg">Updated <time datetime="${escAttr(built.iso || '')}">${esc(built.label)}</time></span>` : '';
  const owner = `<span class="seg">© ${year}${esc(p.name)}${stamp ? ' ·' : ''}</span>`;
  const lead = f.lead ? `<div class="finale">
      <p class="finale-lead"><span class="sr-only">${esc(f.lead)}</span><span aria-hidden="true">${typed(f.lead, 0)}</span></p>
      ${f.line ? `<p class="finale-line"><span class="sr-only">${esc(f.line)}</span><span aria-hidden="true">${typed(f.line, [...f.lead].length + 4)}</span></p>` : ''}
    </div>` : eyebrow('Let’s build something');
  return `${lead}
    <article class="card" aria-label="Contact card">
      <header class="card-row card-head" style="--i:0"><h2 class="card-name">${esc(p.name)}</h2><p class="card-role">${esc(p.title)}</p></header>
      <a class="card-row mail" style="--i:1" href="mailto:${escAttr(l.email)}" data-copy-email>${esc(l.email)}<small>click to copy</small></a>
      ${tel ? `<a class="card-row tel" style="--i:2" href="${escAttr(tel)}">${esc(l.phone)}</a>` : ''}
      <div class="card-row social" style="--i:3">${social}</div>
      <div class="card-row card-built" style="--i:4">${owner}${stamp}</div>
    </article>`;
}
