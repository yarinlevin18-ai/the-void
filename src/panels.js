// panels.js — the DOM content block of every flight stop.
// initPanels mounts one hidden <section class="stop"> per beat (beat.stop names
// the renderer). show(i)/hide() toggle .in; CSS owns the reveal recipe, JS only
// owns the two things CSS can't: the proof count-up and the print/copy buttons.
import { renderIntro, renderCV, renderBuild, renderProject, renderContact, esc } from './render.js';
import { copyLabel } from './bar.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initPanels({ beats, profile, root, onTint }) {
  root.innerHTML = '';
  const els = beats.map((b, i) => {
    if (!b.stop) return null;
    const sec = document.createElement('section');
    sec.className = `stop stop-${b.stop}`;
    sec.id = `stop-${b.id || i}`;
    sec.setAttribute('aria-hidden', 'true');
    sec.setAttribute('aria-label', b.name || b.stop);
    if (b.stop === 'intro') sec.innerHTML = renderIntro(profile);
    else if (b.stop === 'cv') sec.innerHTML = renderCV(profile);
    else if (b.stop === 'build') sec.innerHTML = renderBuild(profile);
    else if (b.stop === 'project') {
      const x = profile.work.featured.find((p) => p.id === b.id);
      if (!x) throw new Error(`panels: no featured project with id "${b.id}"`);
      sec.innerHTML = renderProject(x, b.side || 'left');
      sec.dataset.side = b.side || 'left';
      if (b.groupLabel) sec.insertAdjacentHTML('afterbegin', `<div class="group-label">${esc(b.groupLabel)}</div>`);
    } else if (b.stop === 'contact') sec.innerHTML = renderContact(profile);
    else throw new Error(`panels: unknown stop type "${b.stop}"`);
    root.appendChild(sec);
    return sec;
  });

  // buttons that need JS — bound once per root (commit() re-inits panels in Director Mode)
  if (!root.dataset.bound) {
   root.dataset.bound = '1';
   root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-print-cv], [data-copy-email]');
    if (!t) return;
    if (t.hasAttribute('data-print-cv')) window.print(); // needs #print-cv mounted (printcv.js mountPrintCV) — wired in main.js
    else {
      // only swallow the mailto when we can actually copy; otherwise let it navigate
      const s = t.querySelector('small');
      const w = s && navigator.clipboard?.writeText(profile.links.email);
      if (!w) return;
      e.preventDefault();
      const set = (v) => { s.textContent = v; };
      w.then(() => copyLabel(set, 'click to copy')).catch(() => copyLabel(set, 'Copy failed'));
    }
   });
  }

  const counted = new Set();
  function countUp(sec) {
    if (counted.has(sec)) return; counted.add(sec);
    for (const el of sec.querySelectorAll('.num[data-n]')) {
      const n = +el.dataset.n; if (REDUCED) { el.textContent = n; continue; }
      const t0 = performance.now(), dur = 500;
      (function tick(now) { const k = Math.min(1, (now - t0) / dur); el.textContent = Math.round(n * k); if (k < 1) requestAnimationFrame(tick); })(t0);
    }
  }

  let shown = -1;
  return {
    show(i) {
      if (i === shown) return;
      if (shown >= 0 && els[shown]) { els[shown].classList.remove('in'); els[shown].setAttribute('aria-hidden', 'true'); }
      shown = i;
      const sec = els[i];
      if (!sec) { if (onTint) onTint(null); return; }
      sec.classList.add('in'); sec.setAttribute('aria-hidden', 'false');
      if (sec.classList.contains('stop-build')) countUp(sec);
      if (onTint) onTint(sec.querySelector('.project')?.dataset.tint || null);
    },
    hide() {
      if (shown < 0) return;
      const sec = els[shown]; if (sec) { sec.classList.remove('in'); sec.setAttribute('aria-hidden', 'true'); }
      shown = -1;
      if (onTint) onTint(null);
    },
    el: (i) => els[i],
  };
}
