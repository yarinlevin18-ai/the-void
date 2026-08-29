// ============================================================================
//  TEXT 3D — placeable, truly-extruded text in the void.
//  Loads the site's single typeface (self-hosted Source Code Pro, the same face
//  the DOM and the loader use), builds beveled
//  TextGeometry meshes with an emissive material that blooms, and persists
//  every placed text to localStorage. All 3D options are per-item data.
// ============================================================================
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// The site runs ONE typeface, so extruded 3D text must be that same face —
// self-hosted Source Code Pro (OFL), instanced at weight 500 to match the DOM.
const OGG_CANDIDATES = [
  { url: '/fonts/SourceCodePro-Medium.ttf', type: 'ttf' },
];
const STORE_KEY = 'voidTexts';

// Glow that reads as a soft cool halo instead of a white blow-out: tint the
// emissive toward cyan + scale the slider down, so the lit faces/bevels still
// show the 3D form and only the edges bloom. Shared by build + live-apply.
const GLOW_COOL = 0x57c1ff, GLOW_SCALE = 0.5;    // emissive glow strength (bloomable)
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
// Liquid-glass material: glossy clearcoat + thin-film iridescence reflecting the
// scene environment, a linear vertex-gradient fill, and a bloomable cool glow.
function makeGlassMat(color, glow, transparent, width) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, vertexColors: true,
    metalness: 0.0, roughness: 0.16,
    clearcoat: 1.0, clearcoatRoughness: 0.22,
    iridescence: 1.0, iridescenceIOR: 1.3, iridescenceThicknessRange: [130, 460],
    emissive: glowEmissive(color), emissiveIntensity: glow * GLOW_SCALE,
    envMapIntensity: 1.25, transparent: !!transparent, opacity: 1,
  });
  const W = Math.max(20, width || 120);
  mat.onBeforeCompile = (shader) => {               // animated "water" light-sweep across the glass (uSweep advanced per frame)
    shader.uniforms.uSweep = { value: 0 };
    shader.uniforms.uWidth = { value: W };
    shader.vertexShader = 'varying vec3 vLP;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vLP = position;');
    shader.fragmentShader = 'varying vec3 vLP;\nuniform float uSweep,uWidth;\n' + shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      '#include <dithering_fragment>\n  { float _x = vLP.x / uWidth + 0.5; float _b = abs(mod(_x - uSweep, 1.7) - 0.85); float _s = smoothstep(0.11, 0.0, _b); gl_FragColor.rgb += _s * vec3(0.55,0.82,1.0) * 0.85; }');
    mat.userData.shader = shader;
  };
  return mat;
}

let _uid = 1;
export const defaultText = () => ({
  id: _uid++, text: 'VOID',
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
    console.warn('[text3d] the mono face could not be loaded — 3D text stays empty rather than falling back to a second typeface');
    return { ogg: false, url: null };
  }

  function buildMesh(d) {
    const geo = new TextGeometry(d.text || ' ', {
      font, size: d.size, depth: d.depth, curveSegments: 6,
      bevelEnabled: d.bevel > 0, bevelThickness: d.bevel * 0.6, bevelSize: d.bevel, bevelSegments: 3,
    });
    geo.center();                              // pivot at the text's centre
    paintGradient(geo, d.color);               // linear gradient fill
    const bw = geo.boundingBox ? geo.boundingBox.max.x - geo.boundingBox.min.x : 120;
    const mat = makeGlassMat(d.color, d.glow, false, bw);   // glowing liquid glass + light sweep
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
    const bw = geo.boundingBox ? geo.boundingBox.max.x - geo.boundingBox.min.x : 120;
    const mat = makeGlassMat(opts.color || '#eaf4ff', opts.glow ?? 1.6, true, bw);
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 3; mesh.userData = { type: 'headline' };
    return mesh;
  }

  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(items.map((x) => x.data))); } catch (e) { /* ignore */ } }
  function restore() {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) for (const d of JSON.parse(raw)) add(d); } catch (e) { /* ignore */ }
  }

  // Per-frame: advance the light sweep + a gentle idle float so placed text settles into the void.
  function update(t, reduced) {
    const sw = reduced ? 0 : t * 0.3;
    for (const it of items) {
      if (!it.mesh) continue;
      const sh = it.mesh.material.userData && it.mesh.material.userData.shader;
      if (sh) sh.uniforms.uSweep.value = sw;
      const d = it.data;
      if (reduced) it.mesh.position.set(d.x, d.y, d.z);
      else it.mesh.position.set(d.x + Math.sin(t * 0.4 + d.id) * 1.1, d.y + Math.cos(t * 0.33 + d.id * 1.7) * 0.9, d.z);
    }
  }
  return { group, loadFont, add, remove, get, list, rebuild, apply, save, restore, usingOgg: () => usingOgg, buildHeadline, fontReady: () => !!font, update };
}
