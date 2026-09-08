// bar.js — the fixed top bar: name · availability · Work · About · Copy email.
// The only navigation chrome on the site (replaces the waypoint rail).
import { esc } from './render.js';

let _t;
export function copyLabel(set, original, ms = 1800) {
  clearTimeout(_t);
  set('Copied');
  _t = setTimeout(() => set(original), ms);
}

export function initBar({ profile, onWork, onAbout, root }) {
  if (typeof onWork !== 'function' || typeof onAbout !== 'function') {
    throw new Error('initBar: onWork and onAbout must be functions');
  }
  root.innerHTML = `
    <span class="bar-name">${esc(profile.name)}</span>
    <span class="bar-avail"><i></i>${esc(profile.status.availability)}</span>
    <button type="button" class="bar-link" data-act="work">Work</button>
    <button type="button" class="bar-link" data-act="about">About</button>
    <button type="button" class="bar-copy">Copy email</button>`;
  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) { (act.dataset.act === 'work' ? onWork : onAbout)(); return; }
    const cp = e.target.closest('.bar-copy');
    if (cp) {
      const set = (v) => { cp.textContent = v; };
      const w = navigator.clipboard?.writeText(profile.links.email);
      if (w) w.then(() => copyLabel(set, 'Copy email')).catch(() => copyLabel(set, 'Copy failed'));
      else copyLabel(set, 'Copy failed');
    }
  });
  root.inert = true;
  return {
    show() { root.inert = false; root.classList.add('show'); },
    hide() { root.inert = true; root.classList.remove('show'); },
  };
}
