// panels.js — the DOM content block of every flight stop.
// initPanels mounts one hidden <section class="stop"> per beat (beat.stop names
// the renderer). show(i)/hide() toggle .in; CSS owns the reveal recipe, JS only
// owns the two things CSS can't: the proof count-up and the print/copy buttons.
import { renderHi, renderAbout, renderTimeline, renderBuild, renderProject, renderContact, esc } from './render.js';
import { copyLabel, failLabel } from './bar.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(hover: none)').matches;

// Portrait-screen entrance recipes for project stops, assigned by position among the
// project stops (never by project name — a Director Mode reorder keeps them). CSS owns
// the motion (`[data-reveal]` in style.css); this only hands out the names.
export const PROJECT_REVEALS = ['scan', 'iris', 'deal', 'wipe', 'shutter'];

// Random entrances (2026-10-13, Yarin: "random transitions … on the text and everything, not
// only type writer"). Every arrival draws its own: how the heading writes itself in, how the
// rows arrive, in which order, how the stop leaves, and (project stops) how the phone
// screenshot reveals. Never the same draw twice in a row. CSS owns every motion (style.css,
// "Random entrances"); this only hands out the names and the row delays.
export const HEADING_FX = ['type', 'scramble', 'rise', 'drop', 'flip', 'blur', 'zoom', 'slide', 'glitch', 'scatter'];
export const ROW_FX = ['rise', 'fall', 'left', 'right', 'blur', 'zoom', 'grow', 'flip', 'unroll', 'wipe', 'skew', 'flash'];
export const ROW_ORDER = ['flow', 'reverse', 'shuffle'];
export const EXIT_FX = ['past', 'recede', 'sink', 'lift', 'left', 'right'];
const SOFT = new Set(['blur', 'flash']);   // filter tweens: never on touch (the IS_TOUCH tier's rule)
// The rows of each stop that take the draw, in reading order (the heading has its own).
const ROWS = {
  hi: '.stop-txt > :not(.greeting)',
  about: '.stop-txt > :not(.about-title)',
  timeline: ':scope > .eyebrow, .tl-row, [data-print-cv]',
  build: '.blog, .method .line, .proof-item, .repo',
  project: '.group-label, .stop-txt > :not(.title)',
};
export const ROW_STEP = 70, ROW_AT = 220;   // ms between rows, ms before the first

// One name from the pool, never `avoid` (the previous draw) when there is a choice.
export function pickFx(pool, avoid, rand = Math.random) {
  const p = pool.length > 1 ? pool.filter((x) => x !== avoid) : pool;
  return p[Math.min(p.length - 1, Math.floor(rand() * p.length))];
}
// Each row's delay in ms for an order: reading order, backwards, or shuffled.
export function rowDelays(n, order, rand = Math.random) {
  const k = [...Array(n).keys()];
  if (order === 'reverse') k.reverse();
  else if (order === 'shuffle') for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; }
  return k.map((x) => x * ROW_STEP + ROW_AT);
}

// The scramble heading: each character cycles through random glyphs, then lands on itself.
// Widths are pinned first, so the heading never reflows while it decodes.
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/?';
function scramble(sec) {
  if (sec._scr) cancelAnimationFrame(sec._scr);
  const chars = [...sec.querySelectorAll('.tw .w > span')].map((s) => {
    s.dataset.ch ??= s.textContent;
    return { s, w: s.offsetWidth, start: 160 + (+s.style.getPropertyValue('--c')) * 24 };   // style.css: --tw-at 160ms, --tw-step 24ms
  });
  for (const c of chars) { c.s.style.width = `${c.w}px`; c.s.classList.add('scr'); }
  const t0 = performance.now();
  const frame = (now) => {
    const t = now - t0; let busy = false;
    for (const c of chars) {
      if (!c.s.classList.contains('scr')) continue;
      if (t >= c.start + 300) { c.s.textContent = c.s.dataset.ch; c.s.classList.remove('scr'); c.s.style.width = ''; continue; }
      busy = true;
      if (t >= c.start) c.s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    if (busy) sec._scr = requestAnimationFrame(frame);
  };
  sec._scr = requestAnimationFrame(frame);
}
function unscramble(sec) {
  if (sec._scr) cancelAnimationFrame(sec._scr);
  for (const s of sec.querySelectorAll('.tw .w > span.scr')) { s.textContent = s.dataset.ch; s.classList.remove('scr'); s.style.width = ''; }
}

export function initPanels({ beats, profile, root }) {
  root.innerHTML = '';
  let nProject = 0;
  const els = beats.map((b, i) => {
    if (!b.stop) return null;
    const sec = document.createElement('section');
    sec.className = `stop stop-${b.stop}`;
    sec.id = `stop-${b.id || i}`;
    sec.setAttribute('aria-hidden', 'true');
    sec.inert = true;   // hidden stops are never focusable, even mid-fade
    sec.setAttribute('aria-label', b.name || b.stop);
    if (b.stop === 'hi') { sec.innerHTML = renderHi(profile); sec.dataset.side = 'left'; }
    else if (b.stop === 'about') {
      sec.innerHTML = renderAbout(profile); sec.dataset.side = 'right';
      sec.setAttribute('aria-label', [profile.about.eyebrow, ...profile.about.photos.map((x) => x.caption)].join(' · '));
    }
    else if (b.stop === 'timeline') sec.innerHTML = renderTimeline(profile);
    else if (b.stop === 'build') sec.innerHTML = renderBuild(profile, typeof __BUILDLOG__ !== 'undefined' ? __BUILDLOG__ : null);   // git-history strip from vite.config.js
    else if (b.stop === 'project') {
      const x = profile.work.featured.find((p) => p.id === b.id);
      if (!x) throw new Error(`panels: no featured project with id "${b.id}"`);
      const also = b.also ? profile.work.featured.find((p) => p.id === b.also) : null;
      if (b.also && !also) throw new Error(`panels: no featured project with id "${b.also}" (also)`);
      sec.innerHTML = renderProject(x, b.side || 'left', also);
      sec.dataset.side = b.side || 'left';
      sec.dataset.reveal = PROJECT_REVEALS[nProject++ % PROJECT_REVEALS.length];
      if (b.groupLabel) sec.insertAdjacentHTML('afterbegin', `<div class="group-label">${esc(b.groupLabel)}</div>`);
    }
    else if (b.stop === 'contact') sec.innerHTML = renderContact(profile, typeof __BUILT__ !== 'undefined' ? __BUILT__ : null);   // build stamp from vite.config.js
    else throw new Error(`panels: unknown stop type "${b.stop}"`);
    for (const r of sec.querySelectorAll(ROWS[b.stop] || ':not(*)')) r.dataset.rv = '';
    sec.dataset.hfx = 'type'; sec.dataset.bfx = REDUCED ? 'fade' : 'rise';
    root.appendChild(sec);
    return sec;
  });
  for (const sec of els) if (sec) sec.querySelectorAll('[data-rv]').forEach((r, k) => r.style.setProperty('--rv-delay', `${k * ROW_STEP + ROW_AT}ms`));

  // Draw this arrival's entrance. The new start states land with transitions off (.prep) and
  // a style flush, so the rows travel from the drawn pose, not from the last visit's.
  const pools = {
    h: HEADING_FX.filter((x) => !(TOUCH && SOFT.has(x))),
    b: ROW_FX.filter((x) => !(TOUCH && SOFT.has(x))),
  };
  const last = {};
  const draw = (sec) => {
    if (REDUCED) return;
    sec.classList.add('prep');
    sec.dataset.hfx = last.h = pickFx(pools.h, last.h);
    sec.dataset.bfx = last.b = pickFx(pools.b, last.b);
    const rows = sec.querySelectorAll('[data-rv]');
    rowDelays(rows.length, last.o = pickFx(ROW_ORDER, last.o)).forEach((d, k) => rows[k].style.setProperty('--rv-delay', `${d}ms`));
    if (sec.dataset.reveal) sec.dataset.reveal = last.r = pickFx(PROJECT_REVEALS, last.r);
    void sec.offsetWidth;   // commit the start states before .in
    sec.classList.remove('prep');
  };

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
      // If the copy fails after all, the mail client still opens: the visitor asked for the address.
      w.then(() => copyLabel(s, 'click to copy')).catch(() => { failLabel(s, 'click to copy'); window.location.href = t.href; });
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

  // Leaving, a stop drifts past the camera (`.out`, style.css) instead of fading in place; once
  // it is gone it settles back to its approach pose (.985), ready for the next arrival.
  const outTimers = new Map();
  const conceal = (sec) => {
    if (!REDUCED) sec.dataset.out = last.x = pickFx(EXIT_FX, last.x);
    unscramble(sec);
    sec.classList.remove('in'); sec.classList.add('out'); sec.setAttribute('aria-hidden', 'true'); sec.inert = true;
    clearTimeout(outTimers.get(sec));
    outTimers.set(sec, setTimeout(() => sec.classList.remove('out'), 560));
  };
  let shown = -1;
  return {
    show(i) {
      if (i === shown) return;
      if (shown >= 0 && els[shown]) conceal(els[shown]);
      shown = i;
      const sec = els[i];
      if (!sec) return;
      clearTimeout(outTimers.get(sec)); sec.classList.remove('out');
      draw(sec);
      sec.classList.add('in');
      if (sec.dataset.hfx === 'scramble') scramble(sec); sec.setAttribute('aria-hidden', 'false'); sec.inert = false;
      if (sec.classList.contains('stop-build')) countUp(sec);
    },
    hide() {
      if (shown < 0) return;
      const sec = els[shown]; if (sec) conceal(sec);
      shown = -1;
    },
    el: (i) => els[i],
  };
}
