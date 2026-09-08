// bar.js — the fixed top bar: name · availability · Work · About · Copy email.
// The only navigation chrome on the site (replaces the waypoint rail).
import { esc } from './render.js';

export function copyLabel(set, original, ms = 1800) {
  set('Copied');
  setTimeout(() => set(original), ms);
}

export function initBar({ profile, goTo, workIndex, aboutIndex, root }) {
  root.innerHTML = `
    <span class="bar-name">${esc(profile.name)}</span>
    <span class="bar-avail"><i></i>${esc(profile.status.availability)}</span>
    <button type="button" class="bar-link" data-go="${workIndex}">Work</button>
    <button type="button" class="bar-link" data-go="${aboutIndex}">About</button>
    <button type="button" class="bar-copy">Copy email</button>`;
  root.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { goTo(+go.dataset.go); return; }
    const cp = e.target.closest('.bar-copy');
    if (cp) { navigator.clipboard?.writeText(profile.links.email); copyLabel((v) => { cp.textContent = v; }, 'Copy email'); }
  });
  return { show() { root.classList.add('show'); }, hide() { root.classList.remove('show'); } };
}
