// render.js — pure functions: PROFILE data → HTML strings for each flight stop.
// No DOM, no Three.js, no side effects: runs in node --test as well as the browser.

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const escAttr = (s) => esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const eyebrow = (t) => `<div class="eyebrow">${esc(t)}</div>`;

// 01 Hi — portrait panel on the left (WebGL), greeting on the right.
export function renderHi(p) {
  const lines = p.hi.lines.map((l, i) => `<p class="line" style="--i:${i + 1}">${esc(l)}</p>`).join('');
  return `<article class="hi" data-side="left">
    ${eyebrow('Hello')}
    <h2 class="greeting" style="--i:0">${esc(p.hi.greeting)}</h2>
    <div class="status">${esc(p.hi.status)}</div>
    ${lines}
  </article>`;
}

// 02 About — three speaking photos on the right (WebGL panels), the story on the left.
export function renderAbout(p) {
  const paras = p.about.paragraphs.map((l, i) => `<p class="para" style="--i:${i + 1}">${esc(l)}</p>`).join('');
  return `<article class="about" data-side="right">
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

export function renderBuild(p) {
  const method = p.method.lines.map((l, i) => `<p class="line" style="--i:${i}">${esc(l)}</p>`).join('');
  const proof = p.proof.map((x) => `<div class="proof-item"><b class="num" data-n="${x.n}">0</b><span>${esc(x.label)}</span></div>`).join('');
  const byId = (id) => p.work.featured.find((x) => x.id === id);
  const lead = byId(p.buildStop.lead);
  if (!lead) throw new Error(`renderBuild: no featured project "${p.buildStop.lead}"`);
  const rows = p.buildStop.rows.map((id) => { const x = byId(id); if (!x) throw new Error(`renderBuild: no featured project "${id}"`); return x; });
  const link = (href, label) => href ? `<a href="${escAttr(href)}" target="_blank" rel="noopener">${label} ↗</a>` : '';
  return `${eyebrow('How I build')}
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

export function renderContact(p, year = new Date().getFullYear()) {
  const l = p.links;
  const social = [['GitHub', l.github], ['LinkedIn', l.linkedin], ['X', l.x]].filter(([, h]) => h)
    .map(([n, h]) => `<a href="${escAttr(h)}" target="_blank" rel="noopener">${n}</a>`).join('');
  return `${eyebrow('Let’s build something')}
    <p class="contact-line">${esc(p.contact.line)}</p>
    <a class="mail" href="mailto:${escAttr(l.email)}" data-copy-email>${esc(l.email)}<small>click to copy</small></a>
    <div class="social">${social}</div>
    <div class="availability">${esc(p.contact.availability)}</div>
    <a class="pill ghost restart" href="#top">Back to the start ↑</a>
    <footer class="foot">${esc(p.name)} · ${year}</footer>`;
}
