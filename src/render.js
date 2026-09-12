// render.js — pure functions: PROFILE data → HTML strings for each flight stop.
// No DOM, no Three.js, no side effects: runs in node --test as well as the browser.

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const escAttr = (s) => esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const eyebrow = (t) => `<div class="eyebrow">${esc(t)}</div>`;

export function renderIntro(p) {
  const lines = p.intro.lines.map((l, i) => `<p class="line" style="--i:${i}">${esc(l)}</p>`).join('');
  return `<div class="intro">${lines}<div class="context">${esc(p.intro.context)}</div></div>`;
}

export function renderCV(p) {
  const rows = p.cvStop.map((r, i) => `
    <div class="cv-row" style="--i:${i}">
      <span class="cv-years">${esc(r.years)}</span>
      <span class="cv-body"><b>${esc(r.role)}</b><span>${esc(r.line)}</span></span>
    </div>`).join('');
  return `${eyebrow('CV')}<div class="cv">${rows}</div>
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

export function renderProject(x, side) {
  const live = x.url ? `<a class="pill" href="${escAttr(x.url)}" target="_blank" rel="noopener">Visit live ↗</a>` : '<span class="pill ghost">Private build</span>';
  const repo = x.repo ? `<a class="pill ghost" href="${escAttr(x.repo)}" target="_blank" rel="noopener">GitHub ↗</a>` : '';
  const privateRepo = (x.url && x.private && !x.repo) ? '<span class="pill ghost">Private repo</span>' : '';
  return `<article class="project" data-side="${escAttr(side)}">
    ${eyebrow(`${x.kind} · ${x.tag}`)}
    <h2 class="title">${esc(x.name)}</h2>
    <dl>
      <dt>Problem</dt><dd>${esc(x.problem)}</dd>
      <dt>Decision</dt><dd>${esc(x.decision)}</dd>
      <dt>Outcome</dt><dd>${esc(x.outcome)}</dd>
    </dl>
    <div class="stack">${esc(x.stack)}</div>
    <div class="links">${live}${repo}${privateRepo}</div>
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
    <footer class="foot">${esc(p.name)} · ${year}</footer>`;
}
