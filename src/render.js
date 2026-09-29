// render.js — pure functions: PROFILE data → HTML strings for each flight stop.
// No DOM, no Three.js, no side effects: runs in node --test as well as the browser.

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const escAttr = (s) => esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const eyebrow = (t) => `<div class="eyebrow">${esc(t)}</div>`;

// Portrait screens show a stop's imagery as a DOM <img> in flow above the text
// (2026-09-17): the WebGL panels render soft through the touch tier's 1.25× DPR
// cap and, with Safari's URL bar shortening the viewport, landed on the words.
// CSS hides these figures on landscape screens, where the WebGL panels take over.
const figure = (src, alt, cls) => src ? `<figure class="stop-img ${cls}"><img src="${escAttr(src)}" alt="${escAttr(alt)}" loading="lazy" decoding="async"></figure>` : '';

// One sentence per line (2026-09-29): a short statement wraps at its sentence
// breaks, never mid-sentence with one word dropped onto the next line.
// `.sent` is a block in style.css; a sentence too long for the column balances.
// Abbreviations don't end a sentence: initials like "B.A." / "M.A." and e.g. / i.e. / vs. / etc.
export const sentences = (t) => String(t).split(/(?<=[.!?])(?<!\b(?:[A-Z]\.)+)(?<!\b(?:e\.g|i\.e|vs|etc)\.)\s+(?=\S)/).map((x) => `<span class="sent">${esc(x)}</span>`).join(' ');
// A " · " list (the Hi status) breaks only between its items.
const segments = (t) => String(t).split(' · ').map((x, i, a) => `<span class="seg">${esc(x)}${i < a.length - 1 ? ' ·' : ''}</span>`).join(' ');   // the dot rides with the item before it: a line never starts with one

// 01 Hi — portrait panel on the left (WebGL on landscape, DOM figure on portrait), greeting on the right.
export function renderHi(p) {
  const lines = p.hi.lines.map((l, i) => `<p class="line" style="--i:${i + 1}">${sentences(l)}</p>`).join('');
  return `<article class="hi" data-side="left">
    ${figure(p.hi.portrait, p.hi.portraitAlt || p.name || 'Portrait', 'portrait')}
    ${eyebrow('Hello')}
    <h2 class="greeting" style="--i:0">${esc(p.hi.greeting)}</h2>
    <div class="status">${segments(p.hi.status)}</div>
    ${lines}
  </article>`;
}

// 02 About — two speaking photos on the right (WebGL panels; DOM figures on portrait screens), the story on the left.
export function renderAbout(p) {
  const paras = p.about.paragraphs.map((l, i) => `<p class="para" style="--i:${i + 1}">${sentences(l)}</p>`).join('');
  const photos = (p.about.photos || []).map((x, i) => figure(x.src, x.caption, i === 0 ? 'lead' : 'small')).join('');
  return `<article class="about" data-side="right">
    ${photos ? `<div class="stop-imgs">${photos}</div>` : ''}
    ${eyebrow(p.about.eyebrow)}
    <h2 class="about-title" style="--i:0">${esc(p.about.title)}</h2>
    ${paras}
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
    <h2 class="tl-title">${esc(p.timeline.title)}</h2>
    <ol class="timeline">${rows}</ol>
    <button type="button" class="pill" data-print-cv>Download CV ↓</button>
    ${renderLab()}`;
}

// The build log (2026-09-29; replaced the Bluesky live strip): this site's own git
// history, baked in at build time (scripts/buildlog.js → __BUILDLOG__). A GitHub-style
// heatmap, the counts, and the three latest commits. `log` null → no strip.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (d) => { const [, m, day] = String(d).split('-'); return `${+day} ${MON[+m - 1] || ''}`; };
const level = (n) => (n <= 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4);
export function renderBuildLog(log) {
  if (!log || !Array.isArray(log.days) || !log.days.length) return '';
  const lead = new Date(`${log.first}T00:00:00Z`).getUTCDay();   // pad the first week so rows are weekdays
  const cells = [...Array(lead).fill(-1), ...log.days];
  const cols = Math.ceil(cells.length / 7);
  const grid = cells.map((n, i) => `<i data-l="${n < 0 ? 'x' : level(n)}" style="--w:${Math.floor(i / 7)}"${n > 0 ? ` title="${n} commit${n > 1 ? 's' : ''}"` : ''}></i>`).join('');
  const rows = (log.recent || []).map((c) => `<div><span class="h">${esc(c.h)}</span> · ${esc(shortDate(c.d))} · ${esc(c.s)}</div>`).join('');
  return `<div class="blog">
    <div class="blog-hd"><span>Build log<span class="more"> · this site, from its own git history</span></span><span class="blog-state"><i></i><b>${esc(log.tests)} tests passing</b></span></div>
    <div class="blog-body">
      <div class="blog-grid" style="--cols:${cols}" role="img" aria-label="${esc(log.commits)} commits on ${esc(log.activeDays)} days since ${esc(shortDate(log.first))}">${grid}</div>
      <div class="blog-side">
        <div class="blog-kv"><span>commits</span><b>${esc(log.commits)}</b><span>days shipped</span><b>${esc(log.activeDays)}</b><span>longest streak</span><b>${esc(log.streak)} days</b><span>since</span><b>${esc(shortDate(log.first))}</b></div>
        <div class="blog-feed">${rows}</div>
      </div>
    </div>
  </div>`;
}

export function renderBuild(p, log = null) {
  const method = p.method.lines.map((l, i) => `<p class="line" style="--i:${i}">${esc(l)}</p>`).join('');
  const proof = p.proof.map((x) => `<div class="proof-item"><b class="num" data-n="${x.n}">0</b><span>${esc(x.label)}</span></div>`).join('');
  const byId = (id) => p.work.featured.find((x) => x.id === id);
  const lead = byId(p.buildStop.lead);
  if (!lead) throw new Error(`renderBuild: no featured project "${p.buildStop.lead}"`);
  const rows = p.buildStop.rows.map((id) => { const x = byId(id); if (!x) throw new Error(`renderBuild: no featured project "${id}"`); return x; });
  const link = (href, label) => href ? `<a href="${escAttr(href)}" target="_blank" rel="noopener">${label} ↗</a>` : '';
  return `${eyebrow('How I build')}
    ${renderBuildLog(log)}
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
  return `<article class="project${xItems?.length ? ' has-xl' : ''}" data-side="${escAttr(side)}">
    ${x.anim ? `<figure class="stop-img shot anim"><canvas data-anim="${escAttr(x.anim)}" role="img" aria-label="${escAttr(x.animAlt || `${x.name} — animated demo`)}"></canvas></figure>` : figure(x.img, `${x.name} — screenshot`, x.phone ? 'shot phone' : 'shot')}
    ${eyebrow(`${x.kind} · ${x.tag}`)}
    <h2 class="title">${esc(x.name)}</h2>
    <p class="outcome">${esc(x.outcome)}</p>
    <dl>
      <div><dt>Problem</dt><dd>${esc(x.problem)}</dd></div>
      <div><dt>Decision</dt><dd>${esc(x.decision)}</dd></div>
    </dl>${xl('xl-flow')}
    <div class="stack">${segments(x.stack)}</div>
    <div class="links">${live}${repo}${privateRepo}</div>${alsoRow}
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
  const typed = (t, from) => [...t].map((ch, i) => `<span style="--c:${from + i}">${esc(ch)}</span>`).join('');
  const f = p.finale || {};
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
      ${built && built.label ? `<div class="card-row card-built" style="--i:4">Updated <time datetime="${escAttr(built.iso || '')}">${esc(built.label)}</time></div>` : ''}
    </article>`;
}
