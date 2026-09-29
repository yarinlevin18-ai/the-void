// bar.js — the fixed top bar: name + role · availability · Work · About · phone · LinkedIn · GitHub · Copy email.
// The only navigation chrome on the site (replaces the waypoint rail).
import { esc, escAttr, telHref } from './render.js';

// One pending revert PER label — the bar button and the contact email each own their
// timer, so copying one never cancels the other's revert. `target` is the element whose
// text flips (or a setter function); the timer is keyed by it, so a second click restarts
// the same timer instead of racing it (callers used to pass a fresh setter per click).
// `text` shows for `ms` ('Copied', or 'Copy failed'), then `original` returns, and a
// polite live region tells screen readers what happened.
const _timers = new Map();
export function copyLabel(target, original, ms = 1800, text = 'Copied') {
  const set = typeof target === 'function' ? target : (v) => { target.textContent = v; };
  clearTimeout(_timers.get(target));
  set(text);
  announce(text);
  _timers.set(target, setTimeout(() => { _timers.delete(target); set(original); }, ms));
}
function announce(msg) {
  if (typeof document === 'undefined') return;
  let r = document.getElementById('sr-status');
  if (!r) { r = document.createElement('p'); r.id = 'sr-status'; r.className = 'sr-only'; r.setAttribute('aria-live', 'polite'); document.body.appendChild(r); }
  r.textContent = msg;
}
const failLabel = (set, original) => copyLabel(set, original, 1800, 'Copy failed');
export { failLabel };

export function initBar({ profile, onWork, onAbout, root }) {
  if (typeof onWork !== 'function' || typeof onAbout !== 'function') {
    throw new Error('initBar: onWork and onAbout must be functions');
  }
  const l = profile.links || {}, tel = telHref(l.phone);
  // phones show the icon, wider screens the word (CSS swaps them); the aria-label carries either way
  const ICON = {
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zm7 0h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H10z" fill="currentColor"/></svg>',
    github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" fill="currentColor"/></svg>',
  };
  const ext = (href, label, icon) => href ? `<a href="${escAttr(href)}" target="_blank" rel="noopener" aria-label="${escAttr(label)}">${ICON[icon]}<span class="lbl">${label}</span></a>` : '';
  // 2026-09-17: the details ride in the bar too — role under the name, phone · LinkedIn · GitHub.
  root.innerHTML = `
    <span class="bar-id"><span class="bar-name">${esc(profile.name)}</span><span class="bar-role">${esc(profile.title || '')}</span></span>
    <span class="bar-avail"><i></i>${esc(profile.status.availability)}</span>
    <button type="button" class="bar-link" data-act="work">Work</button>
    <button type="button" class="bar-link" data-act="about">About</button>
    <span class="bar-details">${tel ? `<a class="bar-tel" href="${escAttr(tel)}" aria-label="Call ${escAttr(l.phone)}">${ICON.phone}<span class="lbl">${esc(l.phone)}</span></a>` : ''}${ext(l.linkedin, 'LinkedIn', 'linkedin')}${ext(l.github, 'GitHub', 'github')}</span>
    <button type="button" class="bar-copy">Copy email</button>`;
  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) { (act.dataset.act === 'work' ? onWork : onAbout)(); return; }
    const cp = e.target.closest('.bar-copy');
    if (cp) {
      const w = navigator.clipboard?.writeText(profile.links.email);
      if (w) w.then(() => copyLabel(cp, 'Copy email')).catch(() => failLabel(cp, 'Copy email'));
      else failLabel(cp, 'Copy email');
    }
  });
  root.inert = true;
  return {
    show() { root.inert = false; root.classList.add('show'); },
    hide() { root.inert = true; root.classList.remove('show'); },
  };
}
