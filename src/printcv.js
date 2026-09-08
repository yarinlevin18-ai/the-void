// printcv.js — hidden, print-only CV rendered from PROFILE. The "Download CV"
// button calls window.print(); @media print (style.css) hides the site and
// shows #print-cv, so the PDF can never drift from the web version.
import { esc } from './render.js';

export function mountPrintCV(p) {
  if (document.getElementById('print-cv')) return;
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
