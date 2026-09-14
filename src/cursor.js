// Cursor light trail. The native pointer stays (no custom dot / ring any more,
// 2026-09-14); a fixed 2D canvas under the DOM stops draws a short cyan comet
// tail behind it — a ribbon of the last ~300 ms of pointer positions, drawn
// twice (a wide soft halo and a thin bright core) in additive blending so it
// reads as light on the void, not a line. Skipped on coarse pointers (no
// hover there) and under reduced motion.
export function initCursorTrail({ life = 320, maxPts = 40, color = [79, 210, 255] } = {}) {
  if (!window.matchMedia || window.matchMedia('(pointer: coarse)').matches) return null;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  const cv = document.createElement('canvas');
  cv.className = 'cursor-trail'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  if (!ctx) { cv.remove(); return null; }

  let W = 0, H = 0, dpr = 1;
  function fit() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit(); window.addEventListener('resize', fit);

  const pts = [];                 // { x, y, t } newest last
  let lastT = 0, dirty = false;
  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - lastT < 8) return;  // ~120 Hz cap: enough points for a smooth ribbon
    lastT = now;
    pts.push({ x: e.clientX, y: e.clientY, t: now });
    if (pts.length > maxPts) pts.shift();
    dirty = true;
  });
  window.addEventListener('pointerleave', () => { pts.length = 0; dirty = true; });

  const [r, g, b] = color;
  function draw(now) {
    // drop points that have died
    while (pts.length && now - pts[0].t > life) pts.shift();
    if (!dirty && !pts.length) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, W, H);
    dirty = pts.length > 0;
    if (pts.length > 1) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let pass = 0; pass < 2; pass++) {
        const wide = pass === 0;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], p = pts[i];
          const k = 1 - (now - p.t) / life;          // 1 at the head, 0 as it dies
          if (k <= 0) continue;
          const alpha = (wide ? 0.16 : 0.8) * k * k;
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
          ctx.lineWidth = (wide ? 14 : 2.2) * (0.35 + 0.65 * k);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
      }
      // a small bright head so the tail visibly hangs off the pointer
      const h = pts[pts.length - 1], hk = 1 - (now - h.t) / life;
      if (hk > 0) {
        const gr = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 10);
        gr.addColorStop(0, `rgba(${r},${g},${b},${(0.55 * hk).toFixed(3)})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(h.x, h.y, 10, 0, 6.2832); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  return { canvas: cv };
}
