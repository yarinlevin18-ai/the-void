// Magnetic custom cursor (adapted from references/cursor-magnetic-demo).
// A small dot tracks the pointer 1:1; a ring trails with easing and grows over
// interactive elements. Elements marked [data-magnetic] are gently pulled toward
// the pointer. Skipped on touch / coarse pointers (no hover there).
export function initMagneticCursor() {
  if (!window.matchMedia || window.matchMedia('(pointer: coarse)').matches) return;

  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);
  document.body.classList.add('has-custom-cursor');

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;

  window.addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;

    // magnetic pull on [data-magnetic] elements within range
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const range = Math.max(r.width, r.height) * 0.75 + 28;
      if (Math.hypot(dx, dy) < range) {
        el.style.transform = `translate(${dx * 0.32}px, ${dy * 0.32}px)`;
        el.classList.add('is-magnetic');
      } else if (el.classList.contains('is-magnetic')) {
        el.style.transform = '';
        el.classList.remove('is-magnetic');
      }
    });
  });

  const isInteractive = (t) => t && t.closest && t.closest('a, button, [data-magnetic], input, .beat-row, .tl-node');
  window.addEventListener('pointerover', (e) => { if (isInteractive(e.target)) ring.classList.add('cursor-grow'); });
  window.addEventListener('pointerout', (e) => { if (isInteractive(e.target)) ring.classList.remove('cursor-grow'); });
  window.addEventListener('pointerdown', () => ring.classList.add('cursor-press'));
  window.addEventListener('pointerup', () => ring.classList.remove('cursor-press'));

  (function loop() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(loop);
  })();
}
