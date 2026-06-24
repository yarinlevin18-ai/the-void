// ============================================================================
//  TEXT 3D — placeable, truly-extruded text in the void.
//  Loads a font Ogg-first (real Adobe Ogg if a file is dropped into
//  public/fonts/, otherwise a bundled serif stand-in), builds beveled
//  TextGeometry meshes with an emissive material that blooms, and persists
//  every placed text to localStorage. All 3D options are per-item data.
// ============================================================================
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// Ogg is tried first; drop any of these into public/fonts/ to upgrade instantly.
const OGG_CANDIDATES = [
  { url: '/fonts/ogg.typeface.json', type: 'json' },
  { url: '/fonts/Ogg-Roman.otf', type: 'ttf' },
  { url: '/fonts/Ogg-Roman.ttf', type: 'ttf' },
  { url: '/fonts/Ogg.otf', type: 'ttf' },
  { url: '/fonts/Ogg.ttf', type: 'ttf' },
];
const FALLBACK = { url: '/fonts/fallback-serif.typeface.json', type: 'json' };
const STORE_KEY = 'voidTexts';

// Glow that reads as a soft cool halo instead of a white blow-out: tint the
// emissive toward cyan + scale the slider down, so the lit faces/bevels still
// show the 3D form and only the edges bloom. Shared by build + live-apply.
const GLOW_COOL = 0x57c1ff, GLOW_SCALE = 0.12;   // glow is now only a faint accent over a gradient fill
function glowEmissive(color) { return new THREE.Color(color).multiplyScalar(0.55).lerp(new THREE.Color(GLOW_COOL), 0.5); }
// Vertical linear-gradient fill baked into the geometry: top = the chosen colour,
// fading down to near-black so the letters sink into the void. Re-paintable live.
function paintGradient(geo, color) {
  if (!geo.boundingBox) geo.computeBoundingBox();
  const y0 = geo.boundingBox.min.y, h = Math.max(1e-4, geo.boundingBox.max.y - geo.boundingBox.min.y);
  const pos = geo.attributes.position, n = pos.count;
  let attr = geo.getAttribute('color');
  if (!attr || attr.count !== n) { attr = new THREE.BufferAttribute(new Float32Array(n * 3), 3); geo.setAttribute('color', attr); }
  const top = new THREE.Color(color), bot = top.clone().multiplyScalar(0.06), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const ty = (pos.getY(i) - y0) / h; c.copy(bot).lerp(top, ty * ty * (3 - 2 * ty)); attr.setXYZ(i, c.r, c.g, c.b); }
  attr.needsUpdate = true;
}

let _uid = 1;
export const defaultText = () => ({
  id: _uid++, text: 'OGG',
  size: 26, depth: 7, bevel: 1.2,           // 3D options
  x: 0, y: 12, z: -40, rx: 0, ry: 0, rz: 0,  // placement
  color: '#eaf4ff', glow: 1.5,               // look
});

export function createText3D() {
  const group = new THREE.Group();
  group.renderOrder = 3;                       // in front of the background, with the panels
  let font = null;
  let usingOgg = false;
  const items = [];                            // { data, mesh }

  // Fetch + VALIDATE before parsing. The Vite dev server answers missing files
  // with index.html (not a 404), so a naive FontLoader.load would try to parse
  // HTML as JSON and throw uncaught — we sniff the payload and reject instead.
  async function tryLoad(c) {
    const res = await fetch(c.url);
    if (!res.ok) throw new Error('not found');
    if (c.type === 'json') {
      const txt = await res.text();
      if (!txt.trimStart().startsWith('{')) throw new Error('not a typeface.json');  // HTML fallback
      return new FontLoader().parse(JSON.parse(txt));
    }
    const buf = await res.arrayBuffer();
    if (new Uint8Array(buf)[0] === 0x3C) throw new Error('not a font file');           // '<' → HTML fallback
    const { TTFLoader } = await import('three/addons/loaders/TTFLoader.js');            // lazy (pulls opentype)
    return new FontLoader().parse(new TTFLoader().parse(buf));
  }
  async function loadFont() {
    for (const c of OGG_CANDIDATES) {
      try { font = await tryLoad(c); usingOgg = true; rebuildAll(); return { ogg: true, url: c.url }; } catch (e) { /* try next */ }
    }
    try { font = await tryLoad(FALLBACK); usingOgg = false; rebuildAll(); return { ogg: false, url: FALLBACK.url }; }
    catch (e) { console.warn('[text3d] no font could be loaded', e); return { ogg: false, url: null }; }
  }

  function buildMesh(d) {
    const geo = new TextGeometry(d.text || ' ', {
      font, size: d.size, depth: d.depth, curveSegments: 6,
      bevelEnabled: d.bevel > 0, bevelThickness: d.bevel * 0.6, bevelSize: d.bevel, bevelSegments: 3,
    });
    geo.center();                              // pivot at the text's centre
    paintGradient(geo, d.color);               // vertical gradient fill that blends into the void
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, vertexColors: true, emissive: glowEmissive(d.color), emissiveIntensity: d.glow * GLOW_SCALE,
      metalness: 0.2, roughness: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(d.x, d.y, d.z);
    mesh.rotation.set(THREE.MathUtils.degToRad(d.rx), THREE.MathUtils.degToRad(d.ry), THREE.MathUtils.degToRad(d.rz));
    mesh.userData = { type: 'text3d', id: d.id };
    return mesh;
  }
  function rebuild(id) {
    const it = items.find((x) => x.data.id === id);
    if (!it || !font) return;
    group.remove(it.mesh);
    it.mesh.geometry.dispose(); it.mesh.material.dispose();
    it.mesh = buildMesh(it.data);
    group.add(it.mesh);
  }
  function rebuildAll() { for (const it of items) { if (it.mesh) { group.remove(it.mesh); it.mesh.geometry.dispose(); it.mesh.material.dispose(); } if (font) { it.mesh = buildMesh(it.data); group.add(it.mesh); } } }

  // cheap in-place transform/look update (no geometry rebuild) for slider drags
  function apply(id) {
    const it = items.find((x) => x.data.id === id);
    if (!it || !it.mesh) return;
    const d = it.data;
    it.mesh.position.set(d.x, d.y, d.z);
    it.mesh.rotation.set(THREE.MathUtils.degToRad(d.rx), THREE.MathUtils.degToRad(d.ry), THREE.MathUtils.degToRad(d.rz));
    it.mesh.material.emissiveIntensity = d.glow * GLOW_SCALE;
    it.mesh.material.emissive.copy(glowEmissive(d.color));
    paintGradient(it.mesh.geometry, d.color);  // recolour the gradient fill in place (no rebuild)
  }

  function add(data) {
    const d = data || defaultText();
    if (d.id >= _uid) _uid = d.id + 1;
    const it = { data: d, mesh: font ? buildMesh(d) : null };
    if (it.mesh) group.add(it.mesh);
    items.push(it);
    save();
    return d;
  }
  function remove(id) {
    const i = items.findIndex((x) => x.data.id === id);
    if (i < 0) return;
    const it = items[i];
    if (it.mesh) { group.remove(it.mesh); it.mesh.geometry.dispose(); it.mesh.material.dispose(); }
    items.splice(i, 1); save();
  }
  const get = (id) => items.find((x) => x.data.id === id)?.data || null;
  const list = () => items.map((x) => x.data);

  // A transient, fade-able headline mesh for a section caption (NOT a saved item).
  // Caller owns it: add to a scene/group, animate material.opacity, dispose on rebuild.
  function buildHeadline(text, opts = {}) {
    if (!font) return null;
    const size = opts.size ?? 16, depth = opts.depth ?? 4, bevel = opts.bevel ?? 1.0;
    const geo = new TextGeometry(text || ' ', {
      font, size, depth, curveSegments: 6,
      bevelEnabled: bevel > 0, bevelThickness: bevel * 0.6, bevelSize: bevel, bevelSegments: 3,
    });
    geo.center();
    paintGradient(geo, opts.color || '#eaf4ff');
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, emissive: glowEmissive(opts.color || '#eaf4ff'), emissiveIntensity: (opts.glow ?? 1.6) * GLOW_SCALE, metalness: 0.2, roughness: 0.6, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 3; mesh.userData = { type: 'headline' };
    return mesh;
  }

  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(items.map((x) => x.data))); } catch (e) { /* ignore */ } }
  function restore() {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) for (const d of JSON.parse(raw)) add(d); } catch (e) { /* ignore */ }
  }

  return { group, loadFont, add, remove, get, list, rebuild, apply, save, restore, usingOgg: () => usingOgg, buildHeadline, fontReady: () => !!font };
}
