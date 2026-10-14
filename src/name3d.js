// ---- The Opening's name, set in the void (2026-10-14) ----------------------------------------
//  Yarin: "the transition inside the void of my name is not part of the void, it's just a
//  stand-alone text". The name is no longer a DOM overlay: every glyph is a textured plane in
//  the scene, NAME_D units out along the Opening's view, where the void's nodes and links pass
//  in front of it and the depth of field racks onto it. The page's h1 still lays the name out
//  (hidden, with its sr-only twin for screen readers); each glyph's box is measured from it and
//  mapped onto the name plane, so the type keeps the DOM's size, kerning and phone tiers.
//  It arrives out of depth, letter by letter, and as the flight leaves for Hi the camera flies
//  THROUGH it: the letters part around the camera, tumble and fade, like the Contact door at
//  the other end. It runs off the camera's position, so flying back assembles it again.

export const NAME_D = 80;                          // the name plane, units along the Opening's view
export const PART_FROM = NAME_D - 64, PART_TO = NAME_D - 8;
export const REVEAL_DUR = 1.3, REVEAL_STAGGER = 0.055;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// how far the name has parted (0 whole → 1 gone), from the camera's distance s along the Opening's view
export const partAt = (s) => sstep(PART_FROM, PART_TO, s);
// glyph i's arrival (0 → 1), t seconds after the reveal starts; reduced motion is a plain fade
export const revealAt = (t, i, reduced = false) => {
  if (reduced) return clamp01(t / 0.5);
  const k = clamp01((t - i * REVEAL_STAGGER) / REVEAL_DUR);
  return 1 - Math.pow(1 - k, 4);
};

const rand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function createName3D({ THREE, scene, h1, reduced = false, anisotropy = 1, dpr = 1 }) {
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const glyphs = [];          // { ch, dot, node, at, mesh, tex, cv, ox, oy, w, h, seed, axis }
  const centre = new THREE.Vector3();
  const _o = new THREE.Vector3(), _ff = new THREE.Vector3(), _rt = new THREE.Vector3(), _up = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _qr = new THREE.Quaternion(), _e = new THREE.Euler();
  const frame = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  let ready = false, revealT = -1, fontPx = 0, cx = 0, cy = 0, span = 1;

  // every visible character of the hidden h1 (the words and the cyan full stop), in reading order
  for (const el of h1.querySelectorAll('.op-w, .op-dot')) {
    const node = el.firstChild; if (!node || node.nodeType !== 3) continue;
    for (let at = 0; at < node.length; at++) {
      const ch = node.data[at]; if (ch === ' ') continue;
      glyphs.push({ ch, dot: el.classList.contains('op-dot'), node, at, seed: rand(glyphs.length + 1) });
    }
  }
  glyphs.forEach((g, i) => {
    g.cv = document.createElement('canvas');
    g.tex = new THREE.CanvasTexture(g.cv);
    g.tex.colorSpace = THREE.NoColorSpace;          // the composer has no OutputPass: what's drawn is what shows
    g.tex.anisotropy = anisotropy;
    const mat = new THREE.MeshBasicMaterial({ map: g.tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false });
    g.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    g.mesh.renderOrder = 2;
    g.axis = new THREE.Vector3(rand(i + 7) - .5, rand(i + 13) - .5, rand(i + 19) - .5).normalize();
    group.add(g.mesh);
  });

  // one glyph on its own canvas: the DOM's content box plus a margin (the display face's
  // negative tracking lets ink run past the advance), the h1's cool top-to-bottom gradient
  function paint(g, rect, px) {
    const S = Math.min(3, Math.max(1.5, dpr * 1.6)), pad = px * 0.22;
    const W = Math.ceil((rect.width + pad * 2) * S), H = Math.ceil((rect.height + pad * 2) * S);
    g.cv.width = W; g.cv.height = H;
    const ctx = g.cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.font = `800 ${px * S}px Bricolage`;
    const m = ctx.measureText(g.ch), asc = m.fontBoundingBoxAscent ?? px * S * 0.92;
    const top = pad * S, bot = top + rect.height * S;
    if (g.dot) ctx.fillStyle = '#4fd2ff';
    else {
      const gr = ctx.createLinearGradient(0, top, 0, bot);
      gr.addColorStop(0, '#f2f7fc'); gr.addColorStop(0.48, '#d8e8f5');
      gr.addColorStop(0.82, 'rgba(140,198,236,.9)'); gr.addColorStop(1, 'rgba(100,178,230,.72)');
      ctx.fillStyle = gr;
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(g.ch, pad * S, top + asc);
    g.tex.needsUpdate = true;
    return pad;
  }

  // measure the hidden h1 and map every glyph onto the name plane of the Opening shot
  function layout(pos, quat, fov, viewH) {
    if (!ready) return;
    frame.pos.copy(pos); frame.quat.copy(quat);
    const wpp = (2 * NAME_D * Math.tan((fov * Math.PI) / 360)) / viewH;   // world units per CSS pixel on the plane
    const px = parseFloat(getComputedStyle(h1).fontSize) || 100;
    const repaint = Math.abs(px - fontPx) > 0.5; fontPx = px;
    const W = window.innerWidth, Hh = window.innerHeight;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const r = document.createRange();
    for (const g of glyphs) {
      r.setStart(g.node, g.at); r.setEnd(g.node, g.at + 1);
      const rect = r.getClientRects()[0] || r.getBoundingClientRect();
      if (repaint || !g.pad) g.pad = paint(g, rect, px);
      const pw = rect.width + g.pad * 2, ph = rect.height + g.pad * 2;
      const mx = rect.left + rect.width / 2, my = rect.top + rect.height / 2;
      g.ox = (mx - W / 2) * wpp; g.oy = (Hh / 2 - my) * wpp;
      g.w = pw * wpp; g.h = ph * wpp;
      g.mesh.scale.set(g.w, g.h, 1);
      x0 = Math.min(x0, rect.left); x1 = Math.max(x1, rect.right); y0 = Math.min(y0, rect.top); y1 = Math.max(y1, rect.bottom);
    }
    cx = ((x0 + x1) / 2 - W / 2) * wpp; cy = (Hh / 2 - (y0 + y1) / 2) * wpp; span = Math.max(1, (x1 - x0) * wpp);
    _ff.set(0, 0, -1).applyQuaternion(quat); _rt.set(1, 0, 0).applyQuaternion(quat); _up.set(0, 1, 0).applyQuaternion(quat);
    centre.copy(pos).addScaledVector(_ff, NAME_D).addScaledVector(_rt, cx).addScaledVector(_up, cy);
  }

  // per frame: the arrival, an idle drift, a slow sheen across the name, and the parting as
  // the camera reaches the plane. `show` is false away from the Opening → Hi stretch.
  function update(t, camPos, show) {
    if (!ready || revealT < 0 || !show) { group.visible = false; return 0; }
    _ff.set(0, 0, -1).applyQuaternion(frame.quat); _rt.set(1, 0, 0).applyQuaternion(frame.quat); _up.set(0, 1, 0).applyQuaternion(frame.quat);
    const s = _o.copy(camPos).sub(frame.pos).dot(_ff), p = partAt(s);
    if (p >= 0.999) { group.visible = false; return p; }
    group.visible = true;
    const rt = t - revealT, sweep = ((t * 0.14) % 1) * 1.6 - 0.3;
    glyphs.forEach((g, i) => {
      const a = revealAt(rt, i, reduced), m = g.mesh;
      const back = reduced ? 0 : (1 - a) * (34 + g.seed * 20);                 // out of depth
      const float = reduced ? 0 : Math.sin(t * 0.7 + i * 0.9) * 0.12 * a;      // the idle drift
      let dx = g.ox - cx, dy = g.oy - cy; const dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      const out = reduced ? 0 : Math.pow(p, 1.4) * (span * 0.6 + g.seed * span * 0.5);   // part around the camera
      m.position.copy(frame.pos)
        .addScaledVector(_ff, NAME_D + back + (reduced ? 0 : p * (g.seed - 0.3) * 10))
        .addScaledVector(_rt, g.ox + dx * out)
        .addScaledVector(_up, g.oy + float + dy * out);
      const tilt = reduced ? 0 : (1 - a) * (g.seed - 0.5) * 0.9 + p * (1.2 + g.seed * 1.6);
      _qr.setFromAxisAngle(g.axis, tilt);
      m.quaternion.copy(frame.quat).multiply(_qr);
      // the sheen: a soft band of light crossing the name every ~7 s, never above 1.0
      const u = span > 0 ? (g.ox - cx) / span + 0.5 : 0.5, band = reduced ? 0 : Math.exp(-((u - sweep) ** 2) / 0.012);
      const lum = g.dot ? 1 : 0.9 + 0.1 * band;
      m.material.color.setScalar(lum);
      m.material.opacity = a * (1 - sstep(0.5, 1, p));
    });
    return p;
  }

  const fontReady = document.fonts?.load ? document.fonts.load('800 100px Bricolage') : Promise.resolve();
  return {
    group, centre,
    get ready() { return ready; },
    get count() { return glyphs.length; },
    whenReady: fontReady.catch(() => {}).then(() => { ready = glyphs.length > 0; return ready; }),
    layout, update,
    reveal(t) { if (revealT < 0) revealT = t; },
    shown() { return revealT >= 0; },
  };
}
