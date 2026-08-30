// dossier.js — the summonable text layer over the void.
// A DOM overlay with four tabs (About · CV · Work · Ambitions), rendered
// entirely from PROFILE (src/content/profile.js). This is the skim path:
// selectable, Ctrl+F-able, screen-reader navigable, deep-linkable.
// Summon: the corner button, the C hotkey, or /#about /#cv /#work /#ambitions.

import { PROFILE } from './content/profile.js';

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'cv', label: 'CV' },
  { id: 'work', label: 'Work' },
  { id: 'ambitions', label: 'Ambitions' },
];

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---- per-tab renderers ---------------------------------------------------- */

function renderAbout(p) {
  return `
    <p class="do-lead">${esc(p.bio.short)}</p>
    ${p.bio.full.split('\n\n').map((par) => `<p>${esc(par)}</p>`).join('')}
    <div class="do-facts">
      <div><span>Seeking</span>${esc(p.status.seeking)}</div>
      <div><span>Availability</span>${esc(p.status.availability)}</div>
      <div><span>Location</span>${esc(p.status.location)}</div>
      <div><span>Contact</span><a href="mailto:${p.links.email}">${p.links.email}</a> · ${esc(p.links.phone)} — ${esc(p.status.responseTime)}</div>
    </div>`;
}

function renderCV(p) {
  const exp = p.cv.experience
    .map(
      (e) => `
      <div class="do-item">
        <div class="do-item-head"><b>${esc(e.role)}</b><span class="do-dates">${esc(e.period)}</span></div>
        <div class="do-org">${esc(e.org)}</div>
        ${e.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
      </div>`
    )
    .join('');
  const s = p.cv.service;
  const edu = p.cv.education
    .map(
      (e) => `
      <div class="do-item">
        <div class="do-item-head"><b>${esc(e.degree)}</b><span class="do-dates">${esc(e.period)}</span></div>
        <div class="do-org">${esc(e.org)}</div>
      </div>`
    )
    .join('');
  const skills = Object.entries(p.cv.skills)
    .map(
      ([group, items]) => `
      <div class="do-skill"><span>${esc(group)}</span>${items.map(esc).join(' · ')}</div>`
    )
    .join('');
  const langs = p.cv.languages.map((l) => `<b>${esc(l.lang)}</b> — ${esc(l.level)}`).join(' · ');
  return `
    <div class="do-cv-top">
      <button id="do-print" class="do-download" type="button">Download PDF ↓</button>
    </div>
    <h3>Experience</h3>${exp}
    <h3>Military service</h3>
    <div class="do-item">
      <div class="do-item-head"><b>${esc(s.org)}</b><span class="do-dates">${esc(s.period)}</span></div>
      ${s.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
    </div>
    <h3>Education</h3>${edu}
    <h3>Skills</h3>${skills}
    <h3>Languages</h3><p>${langs}</p>`;
}

function renderWork(p) {
  const featured = p.work.featured
    .map(
      (w) => `
      <div class="do-item">
        <div class="do-item-head"><b>${esc(w.name)}</b><span class="do-tag">${esc(w.tag)}</span></div>
        <p>${esc(w.what)}</p>
        <p class="do-built">${esc(w.built)}</p>
        <p class="do-hard">The hard part: ${esc(w.hard)}</p>
        <div class="do-links">
          ${w.url ? `<a href="${w.url}" target="_blank" rel="noopener">Live ↗</a>` : ''}
          ${w.repo ? `<a href="${w.repo}" target="_blank" rel="noopener">Code ↗</a>` : ''}
        </div>
      </div>`
    )
    .join('');
  const shipped = p.work.shipped
    .map(
      (w) => `
      <div class="do-item compact">
        <div class="do-item-head"><b>${esc(w.name)}</b>${w.repo ? `<a class="do-mini" href="${w.repo}" target="_blank" rel="noopener">code ↗</a>` : ''}</div>
        <p>${esc(w.what)} <span class="do-built">${esc(w.built)}</span></p>
      </div>`
    )
    .join('');
  const labs = p.work.labs
    .map((w) => `<div class="do-lab"><b>${esc(w.name)}</b> — ${esc(w.what)}</div>`)
    .join('');
  return `
    <h3>Featured</h3>${featured}
    <h3>Shipped</h3>${shipped}
    <h3>Labs — the daily practice</h3>${labs}
    <p class="do-note">${esc(p.work.labsNote)}</p>`;
}

function renderAmbitions(p) {
  if (!p.ambitions.full)
    return `<p class="do-lead">Being written — in my own words, not filler. Ask me in the meantime: <a href="mailto:${PROFILE.links.email}">${PROFILE.links.email}</a></p>`;
  return `
    ${p.ambitions.line ? `<p class="do-lead">${esc(p.ambitions.line)}</p>` : ''}
    ${p.ambitions.full.split('\n\n').map((par) => `<p>${esc(par)}</p>`).join('')}`;
}

const RENDER = { about: renderAbout, cv: renderCV, work: renderWork, ambitions: renderAmbitions };

/* ---- shell ---------------------------------------------------------------- */

export function initDossier() {
  const p = PROFILE;
  const root = document.createElement('div');
  root.id = 'dossier';
  root.hidden = true;
  root.innerHTML = `
    <div class="do-backdrop"></div>
    <aside class="do-panel" role="dialog" aria-modal="true" aria-label="Dossier — about, CV, work, ambitions">
      <header class="do-head">
        <div class="do-id">
          <div class="do-name">${esc(p.name)}</div>
          <div class="do-title">${esc(p.bio.line)}</div>
        </div>
        <button class="do-close" type="button" aria-label="Close (Esc)">Esc ✕</button>
      </header>
      <nav class="do-tabs" role="tablist" aria-label="Dossier sections">
        ${TABS.map(
          (t, i) =>
            `<button role="tab" id="do-tab-${t.id}" aria-controls="do-pane-${t.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${t.id}">${t.label}</button>`
        ).join('')}
      </nav>
      <div class="do-body">
        ${TABS.map((t) => `<section role="tabpanel" id="do-pane-${t.id}" aria-labelledby="do-tab-${t.id}" hidden></section>`).join('')}
      </div>
      <footer class="do-foot">
        <a href="mailto:${p.links.email}">${p.links.email}</a>
        <a href="${p.links.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a>
        <a href="${p.links.github}" target="_blank" rel="noopener">GitHub ↗</a>
      </footer>
    </aside>`;
  document.body.appendChild(root);

  const btn = document.createElement('button');
  btn.id = 'dossier-btn';
  btn.type = 'button';
  btn.setAttribute('data-magnetic', '');
  btn.innerHTML = 'read it instead <span>C</span>';
  document.body.appendChild(btn);

  const panel = root.querySelector('.do-panel');
  const tabButtons = [...root.querySelectorAll('[role="tab"]')];
  const panes = Object.fromEntries(TABS.map((t) => [t.id, root.querySelector(`#do-pane-${t.id}`)]));
  const rendered = new Set();
  let current = 'about';
  let lastFocus = null;
  let open = false;

  function select(id, focusTab) {
    if (!RENDER[id]) id = 'about';
    current = id;
    if (!rendered.has(id)) {
      panes[id].innerHTML = RENDER[id](p);
      rendered.add(id);
      if (id === 'cv') panes.cv.querySelector('#do-print')?.addEventListener('click', () => window.print());
    }
    for (const b of tabButtons) {
      const on = b.dataset.tab === id;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
      if (on && focusTab) b.focus();
    }
    for (const t of TABS) panes[t.id].hidden = t.id !== id;
    if (open && location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  }

  function show(id = current) {
    lastFocus = document.activeElement;
    root.hidden = false;
    open = true;
    requestAnimationFrame(() => root.classList.add('open')); // let the transition run
    select(id, false);
    root.querySelector('.do-close').focus();
  }

  function hide() {
    open = false;
    root.classList.remove('open');
    const done = () => {
      root.hidden = true;
      panel.removeEventListener('transitionend', done);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) root.hidden = true;
    else panel.addEventListener('transitionend', done);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    lastFocus?.focus?.();
  }

  // summon paths
  btn.addEventListener('click', () => show());
  root.querySelector('.do-close').addEventListener('click', hide);
  root.querySelector('.do-backdrop').addEventListener('click', hide);
  tabButtons.forEach((b) => b.addEventListener('click', () => select(b.dataset.tab, false)));

  // keyboard: C toggles, Esc closes, arrows move between tabs, focus stays trapped
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)) {
      open ? hide() : show();
      e.preventDefault();
      return;
    }
    if (!open) return;
    if (k === 'escape') { hide(); return; }
    if ((k === 'arrowright' || k === 'arrowleft') && document.activeElement?.getAttribute('role') === 'tab') {
      const i = tabButtons.findIndex((b) => b.dataset.tab === current);
      const n = (i + (k === 'arrowright' ? 1 : -1) + TABS.length) % TABS.length;
      select(TABS[n].id, true);
      e.preventDefault();
      return;
    }
    if (k === 'tab') {
      const f = [...panel.querySelectorAll('button, a[href], [tabindex="0"]')].filter((el) => !el.hidden && el.offsetParent);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });

  // deep links: /#cv opens straight onto the CV tab
  function fromHash() {
    const id = location.hash.slice(1).toLowerCase();
    if (RENDER[id]) { open ? select(id, false) : show(id); }
  }
  window.addEventListener('hashchange', fromHash);
  if (RENDER[location.hash.slice(1).toLowerCase()]) {
    // wait a tick so the loader/scene bootstrap isn't racing us
    setTimeout(fromHash, 0);
  }

  buildPrintCV(p);
  return { show, hide };
}

/* ---- in-world work hub -----------------------------------------------------
   A slim index shown only on the "My Projects" beat — the full body of work at
   a glance, in the void's own vocabulary. Clicking it opens the dossier's Work
   tab. main.js shows/hides it on beat change. */
export function initWorkHub(openWork) {
  const p = PROFILE;
  const el = document.createElement('aside');
  el.id = 'workhub';
  el.setAttribute('aria-label', 'Full body of work');
  el.innerHTML = `
    <div class="wh-sec">Shipped</div>
    ${p.work.shipped.map((w) => `<div class="wh-row"><b>${esc(w.name)}</b><span>${esc(w.what)}</span></div>`).join('')}
    <div class="wh-sec">Labs — daily practice</div>
    ${p.work.labs.map((w) => `<div class="wh-row lab"><b>${esc(w.name)}</b></div>`).join('')}
    <button class="wh-more" type="button" data-magnetic>the full index — every stack, every link ↗</button>`;
  el.querySelector('.wh-more').addEventListener('click', openWork);
  document.body.appendChild(el);
  return {
    show() { el.classList.add('show'); },
    hide() { el.classList.remove('show'); },
  };
}

/* ---- print CV ------------------------------------------------------------
   A hidden, print-only document rendered from the same PROFILE. The Download
   PDF button just calls window.print(): @media print hides the site and shows
   this — so the PDF can never drift from the web version. */
function buildPrintCV(p) {
  const el = document.createElement('div');
  el.id = 'print-cv';
  el.setAttribute('aria-hidden', 'true');
  const exp = p.cv.experience
    .map(
      (e) => `
      <div class="pcv-item">
        <div class="pcv-row"><b>${esc(e.role)}</b><span>${esc(e.period)}</span></div>
        <div class="pcv-org">${esc(e.org)}</div>
        <ul>${e.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      </div>`
    )
    .join('');
  const s = p.cv.service;
  const edu = p.cv.education
    .map(
      (e) => `
      <div class="pcv-item">
        <div class="pcv-row"><b>${esc(e.degree)}</b><span>${esc(e.period)}</span></div>
        <div class="pcv-org">${esc(e.org)}</div>
      </div>`
    )
    .join('');
  const skills = Object.entries(p.cv.skills)
    .map(([g, items]) => `<div class="pcv-skill"><b>${esc(g)}:</b> ${items.map(esc).join(' · ')}</div>`)
    .join('');
  el.innerHTML = `
    <header>
      <h1>${esc(p.name)}</h1>
      <div class="pcv-sub">${esc(p.title)} · ${esc(p.status.seeking)} · ${esc(p.status.availability)}</div>
      <div class="pcv-contact">
        ${p.links.email} · ${esc(p.links.phone)} · ${p.links.linkedin.replace('https://www.', '')} · ${p.links.github.replace('https://', '')} · ${p.links.site.replace('https://', '')}
      </div>
    </header>
    <p class="pcv-profile">${esc(p.bio.short)}</p>
    <h2>Experience</h2>${exp}
    <h2>Military service</h2>
    <div class="pcv-item">
      <div class="pcv-row"><b>${esc(s.org)}</b><span>${esc(s.period)}</span></div>
      <ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    </div>
    <h2>Education</h2>${edu}
    <h2>Skills</h2>${skills}
    <h2>Languages</h2>
    <div class="pcv-skill">${p.cv.languages.map((l) => `<b>${esc(l.lang)}:</b> ${esc(l.level)}`).join(' · ')}</div>`;
  document.body.appendChild(el);
}
