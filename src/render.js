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

// 01 Hi — portrait panel on the left (WebGL on landscape, DOM figure on portrait), greeting on the right.
export function renderHi(p) {
  const lines = p.hi.lines.map((l, i) => `<p class="line" style="--i:${i + 1}">${esc(l)}</p>`).join('');
  return `<article class="hi" data-side="left">
    ${figure(p.hi.portrait, p.hi.portraitAlt || p.name || 'Portrait', 'portrait')}
    ${eyebrow('Hello')}
    <h2 class="greeting" style="--i:0">${esc(p.hi.greeting)}</h2>
    <div class="status">${esc(p.hi.status)}</div>
    ${lines}
  </article>`;
}

// 02 About — three speaking photos on the right (WebGL panels; DOM figures on portrait screens), the story on the left.
export function renderAbout(p) {
  const paras = p.about.paragraphs.map((l, i) => `<p class="para" style="--i:${i + 1}">${esc(l)}</p>`).join('');
  const photos = (p.about.photos || []).map((x, i) => figure(x.src, x.caption, i === 0 ? 'lead' : 'small')).join('');
  return `<article class="about" data-side="right">
    ${photos ? `<div class="stop-imgs">${photos}</div>` : ''}
    ${eyebrow(p.about.eyebrow)}
    <h2 class="about-title" style="--i:0">${esc(p.about.title)}</h2>
    ${paras}
  </article>`;
}

// 03 Timeline — dated rows on a glowing rail; the hero screens float beside it (main.js).
export function renderTimeline(p) {
  const rows = p.timeline.rows.map((r, i) => `
    <li class="tl-row" style="--i:${i}">
      <span class="tl-dot"></span>
      <span class="tl-when">${esc(r.when)}</span>
      <span class="tl-body"><b class="tl-what">${esc(r.what)}</b><span class="tl-line">${esc(r.line)}</span></span>
    </li>`).join('');
  return `${eyebrow(p.timeline.eyebrow)}
    <h2 class="tl-title">${esc(p.timeline.title)}</h2>
    <ol class="timeline">${rows}</ol>
    <button type="button" class="pill" data-print-cv>Download CV ↓</button>`;
}

// The live strip (2026-09-17): the real event stream's accounting — ring buffer,
// sliding-window rate, heap top-k — rendered as a small console. main.js fills the
// values from live.js; this only lays out the frame. `ring` = buffer size for the cells.
export function renderLive(ring = 64) {
  const cells = Array.from({ length: ring }, () => '<i></i>').join('');
  return `<div class="live" data-live-state="connecting" aria-live="off">
    <div class="live-hd"><span class="live-src">Wikipedia<span class="more"> · every edit, right now</span></span><span class="live-state"><i></i><b data-live-label>connecting</b></span></div>
    <div class="live-ring" data-live-ring aria-hidden="true">${cells}</div>
    <div class="live-kv"><span>ring<span class="more"> buffer</span></span><b data-live-count>0 / ${ring}</b><span>events / s<span class="more"> · 10 s window</span></span><b data-live-rate>0.0</b><span>top-3 wikis · min-heap</span><b data-live-top>—</b></div>
    <div class="live-feed" data-live-feed></div>
  </div>`;
}

export function renderBuild(p) {
  const method = p.method.lines.map((l, i) => `<p class="line" style="--i:${i}">${esc(l)}</p>`).join('');
  const proof = p.proof.map((x) => `<div class="proof-item"><b class="num" data-n="${x.n}">0</b><span>${esc(x.label)}</span></div>`).join('');
  const byId = (id) => p.work.featured.find((x) => x.id === id);
  const lead = byId(p.buildStop.lead);
  if (!lead) throw new Error(`renderBuild: no featured project "${p.buildStop.lead}"`);
  const rows = p.buildStop.rows.map((id) => { const x = byId(id); if (!x) throw new Error(`renderBuild: no featured project "${id}"`); return x; });
  const link = (href, label) => href ? `<a href="${escAttr(href)}" target="_blank" rel="noopener">${label} ↗</a>` : '';
  return `${eyebrow('How I build')}
    ${renderLive()}
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
  const live = x.url ? `<a class="pill" href="${escAttr(x.url)}" target="_blank" rel="noopener">Visit live ↗</a>` : '<span class="pill ghost">Private build</span>';
  const repo = x.repo ? `<a class="pill ghost" href="${escAttr(x.repo)}" target="_blank" rel="noopener">GitHub ↗</a>` : '';
  const privateRepo = (x.url && x.private && !x.repo) ? '<span class="pill ghost">Private repo</span>' : '';
  const small = (href, label) => href ? `<a href="${escAttr(href)}" target="_blank" rel="noopener">${label} ↗</a>` : '';
  const alsoRow = also ? `
    <div class="also">
      <span class="also-label">Also · ${esc(also.kind)}</span>
      <b>${esc(also.name)}</b>
      <span class="also-line">${esc(also.outcome)}</span>
      <span class="also-links">${small(also.url, 'Visit live')}${small(also.repo, 'GitHub')}</span>
    </div>` : '';
  return `<article class="project" data-side="${escAttr(side)}">
    ${figure(x.img, `${x.name} — screenshot`, 'shot')}
    ${eyebrow(`${x.kind} · ${x.tag}`)}
    <h2 class="title">${esc(x.name)}</h2>
    <p class="outcome">${esc(x.outcome)}</p>
    <dl>
      <dt>Problem</dt><dd>${esc(x.problem)}</dd>
      <dt>Decision</dt><dd>${esc(x.decision)}</dd>
    </dl>
    <div class="stack">${esc(x.stack)}</div>
    <div class="links">${live}${repo}${privateRepo}</div>${alsoRow}
  </article>`;
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
  return `${eyebrow('Let’s build something')}
    <article class="card" aria-label="Contact card">
      <header class="card-row card-head" style="--i:0"><h2 class="card-name">${esc(p.name)}</h2><p class="card-role">${esc(p.title)}</p></header>
      <a class="card-row mail" style="--i:1" href="mailto:${escAttr(l.email)}" data-copy-email>${esc(l.email)}<small>click to copy</small></a>
      ${tel ? `<a class="card-row tel" style="--i:2" href="${escAttr(tel)}">${esc(l.phone)}</a>` : ''}
      <div class="card-row social" style="--i:3">${social}</div>
      ${built && built.label ? `<div class="card-row card-built" style="--i:4">Updated <time datetime="${escAttr(built.iso || '')}">${esc(built.label)}</time></div>` : ''}
    </article>`;
}
