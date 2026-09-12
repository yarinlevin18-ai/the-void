// bar.js — the fixed top bar: name · availability · Work · About · Copy email.
// The only navigation chrome on the site (replaces the waypoint rail).
import { esc } from './render.js';

// one pending revert PER setter — the bar button and the contact email each own
// their own timer, so copying one no longer cancels the other's revert.
// `text` is what shows for `ms` ('Copied', or 'Copy failed'); then `original` returns.
const _timers = new Map();
export function copyLabel(set, original, ms = 1800, text = 'Copied') {
  clearTimeout(_timers.get(set));
  set(text);
  _timers.set(set, setTimeout(() => { _timers.delete(set); set(original); }, ms));
}
const failLabel = (set, original) => copyLabel(set, original, 1800, 'Copy failed');
export { failLabel };

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
      if (w) w.then(() => copyLabel(set, 'Copy email')).catch(() => failLabel(set, 'Copy email'));
      else failLabel(set, 'Copy email');
    }
  });
  root.inert = true;
  return {
    show() { root.inert = false; root.classList.add('show'); },
    hide() { root.inert = true; root.classList.remove('show'); },
  };
}
