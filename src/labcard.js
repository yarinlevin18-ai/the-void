// labcard.js — wires the Timeline's lab card (render.js renderLab): drag the two
// control points, watch the curve, the dot and the code's numbers follow. The code
// tab shows lab.js's cubicBezier source verbatim (Vite ?raw), so it's the code that runs.
import { cubicBezier, PRESETS, clampHandle, fmt } from './lab.js';
import LAB_SRC from './lab.js?raw';

const Y_MIN = -0.35, Y_MAX = 1.35;                     // visible y range: room for overshoot

export function initLab(root, { reduced = false } = {}) {
  if (!root) return null;
  const cv = root.querySelector('canvas'), ctx = cv && cv.getContext && cv.getContext('2d');
  if (!ctx) return null;
  const src = LAB_SRC.split('// #region cubicBezier\n')[1]?.split('// #endregion')[0] || '';
  const codeEl = root.querySelector('[data-lab-src]');
  if (codeEl) codeEl.textContent = src.trimEnd();
  const callEl = root.querySelector('[data-lab-call]'), dot = root.querySelector('[data-lab-dot]');
  const handles = [...root.querySelectorAll('[data-h]')], track = root.querySelector('.lab-track');
  let p = [...PRESETS.site], ease = cubicBezier(...p), raf = 0, t0 = performance.now(), trackW = 0;

  const size = () => {                                  // crisp at any DPR
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    trackW = track ? Math.max(0, track.clientWidth - 12) : 0;   // px: a % inside translateX resolves against the dot, not the track
    return r;
  };
  let box = size();
  const toPx = (x, y) => [x * box.width, (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * box.height];
  const fromPx = (px, py) => [px / box.width, Y_MIN + (1 - py / box.height) * (Y_MAX - Y_MIN)];

  function draw(prog) {
    const W = box.width, H = box.height;
    ctx.clearRect(0, 0, W, H);
    const [x0, y0] = toPx(0, 0), [x1, y1] = toPx(1, 1);
    ctx.strokeStyle = 'rgba(159,216,255,.14)'; ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y1 + 0.5, x1 - x0 - 1, y0 - y1);            // the unit square
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
    const [a, b] = [toPx(p[0], p[1]), toPx(p[2], p[3])];
    ctx.strokeStyle = 'rgba(79,210,255,.45)';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(...a); ctx.moveTo(x1, y1); ctx.lineTo(...b); ctx.stroke();
    ctx.strokeStyle = '#4fd2ff'; ctx.lineWidth = 2.2; ctx.shadowColor = '#4fd2ff'; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) { const x = i / 64, [px, py] = toPx(x, ease(x)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke(); ctx.shadowBlur = 0;
    if (prog != null) {                                   // the marker riding the curve
      const [mx, my] = toPx(prog, ease(prog));
      ctx.fillStyle = '#eaf4ff'; ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2); ctx.fill();
    }
    handles.forEach((h, i) => { const [hx, hy] = i ? b : a; h.style.transform = `translate(${hx}px, ${hy}px)`; });
  }
  function update() {
    ease = cubicBezier(...p);
    if (callEl) callEl.textContent = `ease = cubicBezier(${p.map(fmt).join(', ')})`;
    root.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(PRESETS[b.dataset.preset].every((v, i) => Math.abs(v - p[i]) < 1e-3))));
    handles.forEach((h, i) => {                        // role="slider": x is the value, the text carries both axes
      h.setAttribute('aria-valuenow', fmt(p[i * 2]));
      h.setAttribute('aria-valuetext', `x ${fmt(p[i * 2])}, y ${fmt(p[i * 2 + 1])}`);
    });
    if (reduced) draw(null);
  }
  function loop(now) {                                   // 1.1 s run, .5 s rest, forever — only while on screen
    const c = ((now - t0) % 1600) / 1100, prog = Math.min(1, c);
    const v = ease(prog);
    if (dot) dot.style.transform = `translateX(${(Math.max(-0.2, Math.min(1.2, v)) * trackW).toFixed(1)}px)`;
    draw(prog);
    raf = requestAnimationFrame(loop);
  }

  handles.forEach((h, i) => {
    h.addEventListener('pointerdown', (e) => {
      e.preventDefault(); h.setPointerCapture(e.pointerId); box = cv.getBoundingClientRect();
      const move = (ev) => {
        const [x, y] = clampHandle(...fromPx(ev.clientX - box.left, ev.clientY - box.top));
        p[i * 2] = x; p[i * 2 + 1] = Math.min(Y_MAX, Math.max(Y_MIN, y)); update();
      };
      const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
    h.addEventListener('keydown', (e) => {                // arrows nudge; Shift = bigger steps
      const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (!k) return;
      e.preventDefault(); const d = e.shiftKey ? 0.1 : 0.02;
      const [x, y] = clampHandle(p[i * 2] + k[0] * d, p[i * 2 + 1] + k[1] * d);
      p[i * 2] = x; p[i * 2 + 1] = Math.min(Y_MAX, Math.max(Y_MIN, y)); update();
    });
  });
  root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => { p = [...PRESETS[b.dataset.preset]]; update(); }));
  root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    root.dataset.view = b.dataset.tab;
    root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  }));
  const onResize = () => { box = size(); if (reduced) draw(null); };
  window.addEventListener('resize', onResize);

  update(); draw(reduced ? null : 0);
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  return {
    start() { if (reduced || raf) return; box = size(); t0 = performance.now(); raf = requestAnimationFrame(loop); },
    stop,
    destroy() { stop(); window.removeEventListener('resize', onResize); },   // Director Mode re-mounts on every commit
  };
}
