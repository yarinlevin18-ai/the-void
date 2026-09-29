// printcv.js — hidden, print-only CV rendered from PROFILE. The "Download CV"
// button calls window.print(); @media print (style.css) hides the site and
// shows #print-cv, so the PDF can never drift from the web version.
import { esc, escAttr, telHref } from './render.js';

export function mountPrintCV(p, built = null) {
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
  // status.seeking ends on the role the title already names; each item appears once.
  const sub = [p.title, ...p.status.seeking.split(' · '), p.status.availability].filter((x, i, a) => x && a.indexOf(x) === i);
  // One unbreakable item per contact detail, so a line never breaks inside an address or the
  // date; the addresses are links, so the saved PDF opens the mail client, LinkedIn, GitHub.
  const l = p.links;
  const contact = [
    [l.email, `mailto:${l.email}`], [l.phone, telHref(l.phone)],
    [l.linkedin.replace('https://www.', ''), l.linkedin], [l.github.replace('https://', ''), l.github], [l.site.replace('https://', ''), l.site],
    [built && built.label ? 'Updated ' + built.label : '', ''],
  ].filter(([t]) => t).map(([t, href]) => href ? `<a href="${escAttr(href)}">${esc(t)}</a>` : `<span>${esc(t)}</span>`).join(' · ');
  el.innerHTML = `
    <header>
      <h1>${esc(p.name)}</h1>
      <div class="pcv-sub">${sub.map(esc).join(' · ')}</div>
      <div class="pcv-contact">${contact}</div>
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
    <div class="pcv-skill">${p.cv.languages.map((l) => `<b>${esc(l.lang)}:</b> ${esc(l.level)}`).join(' · ')}</div>
    <footer class="pcv-foot">© ${built && built.iso ? esc(built.iso.slice(0, 4)) + ' ' : ''}${esc(p.name)} · ${esc(p.links.site.replace('https://', ''))}</footer>`;
  document.body.appendChild(el);
}
