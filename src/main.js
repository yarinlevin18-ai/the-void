// ============================================================================
//  THE VOID — v0.7  "Director Mode"
//  PLAY mode  : visitor experience — scroll / arrows snap between sections.
//  EDIT mode  : press E. Free-fly the whole void (orbit/zoom/pan), manage the
//               path as a list of sections you can add / delete / reorder,
//               capture shots with "Set cam from view", type precise numbers,
//               Undo/Redo (Ctrl+Z / Ctrl+Shift+Z), Save/Reset, Copy config.
//  Edits persist in localStorage. "Copy config" exports the BEATS array.
// ============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { initMagneticCursor } from './cursor.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Only TEXT entry should swallow global hotkeys (E/V/arrows) — not range sliders, checkboxes, etc.
const isTextEntry = (el) => el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'button', 'submit'].includes(el.type));
// Live-tunable effect parameters — the FX panel (press B) edits these in place,
// and the render loop reads them every frame, so every effect is adjustable.
const FX = {
  dofBlur: 0.006, dofAperture: 0.0005,        // depth of field
  panelDimFloor: 0.1, panelLightRange: 300,   // section panels: idle opacity + light-up falloff
  colorIntensity: 1.0, colorReach: 200,       // per-chapter color world
  warpStrength: 0.16, warpLength: 0.1,        // warp streaks
};
const fxEl = document.querySelector('#fxpanel');
const UP_NORMAL = [0, 1, 0];
const UP_VERTICAL = [0, 0, -1]; // "look straight up" orientation

// ---- Renderer / scene / camera --------------------------------------------
const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
let composer = null, bokeh = null;   // DOF (set up below)
const _focusV = new THREE.Vector3();

// ---- Offscreen renderer that draws each shot's thumbnail in the editor list -
const THUMB_W = 240, THUMB_H = 150;
const thumbRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
thumbRenderer.setPixelRatio(1);
thumbRenderer.setSize(THUMB_W, THUMB_H);
const thumbCam = new THREE.PerspectiveCamera(68, THUMB_W / THUMB_H, 0.1, 5000);

const scene = new THREE.Scene();
// dark cinematic world: deep teal-navy background + matching fog for depth
scene.background = new THREE.Color(0x06141c);
scene.fog = new THREE.FogExp2(0x06141c, 0.0016);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 5000);

// ---- The void: drifting data-point field -----------------------------------
const COUNT = 4500, SPREAD = 1400;
const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3);
const cA = new THREE.Color(0x4fd2ff), cB = new THREE.Color(0xeaf4ff), ct = new THREE.Color(); // glowing cyan -> white on dark
for (let i = 0; i < COUNT; i++) {
  pos[i*3] = (Math.random()-0.5)*SPREAD;
  pos[i*3+1] = (Math.random()-0.5)*SPREAD;
  pos[i*3+2] = (Math.random()-0.5)*SPREAD - 250;
  ct.copy(cA).lerp(cB, Math.random());
  col[i*3] = ct.r; col[i*3+1] = ct.g; col[i*3+2] = ct.b;
}
const fGeo = new THREE.BufferGeometry();
fGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
fGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
const pointMat = new THREE.PointsMaterial({
  size: 3, sizeAttenuation: true, vertexColors: true,
  transparent: true, opacity: 0.95, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, // glowing dust, always behind content
});
// Higgsfield-generated soft particle sprite -> alpha mask, so each point is a
// soft glowing dot (tinted slate by the vertex colors) instead of a hard square
new THREE.TextureLoader().load('/particle.png', (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  pointMat.alphaMap = tex;
  pointMat.needsUpdate = true;
});
const pointField = new THREE.Points(fGeo, pointMat);
pointField.renderOrder = -10;
scene.add(pointField);

// ---- Faint connecting network lines (the CRM/SaaS "data relationships" nod) --
// sample ~360 nodes across the field, link each to its 2 nearest -> a delicate web
// ---- Data-network environment ------------------------------------------------
// A real 3D web of nodes + glowing edges you fly THROUGH, with bright pulses that
// flow node-to-node along the edges like data moving through the network.
const dataNet = (() => {
  const N = 480, MAXD2 = 150 * 150, K = 2;   // fewer nodes + fewer links = calmer web
  const nodes = [];
  for (let i = 0; i < N; i++) {
    nodes.push(new THREE.Vector3(
      (Math.random() - 0.5) * 640,            // x corridor
      (Math.random() - 0.5) * 480 + 80,        // y (biased up, toward the path)
      150 - Math.random() * 820,               // z corridor the camera flies down
    ));
  }
  const adj = Array.from({ length: N }, () => []);
  const edgePts = [], seen = new Set();
  for (let a = 0; a < N; a++) {
    const cand = [];
    for (let b = 0; b < N; b++) { if (b === a) continue; const d = nodes[a].distanceToSquared(nodes[b]); if (d < MAXD2) cand.push([d, b]); }
    cand.sort((x, y) => x[0] - y[0]);
    for (let k = 0; k < Math.min(K, cand.length); k++) {
      const b = cand[k][1], key = a < b ? a * N + b : b * N + a;
      if (seen.has(key)) continue;
      seen.add(key);
      adj[a].push(b); adj[b].push(a);
      edgePts.push(nodes[a], nodes[b]);
    }
  }
  const group = new THREE.Group();
  group.renderOrder = -10;                    // whole network sits behind the content panels
  const lineMat = new THREE.LineBasicMaterial({ color: 0x3fb6e6, transparent: true, opacity: 0.13, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: true });
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edgePts), lineMat));
  const nMat = new THREE.PointsMaterial({ size: 4, sizeAttenuation: true, color: 0x6fd8f5, transparent: true, opacity: 0.45, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  group.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(nodes), nMat));
  // flowing pulses (gentler speeds = smoother)
  const M = 110, pulses = [], pPos = new Float32Array(M * 3);
  for (let i = 0; i < M; i++) {
    const a = (Math.random() * N) | 0, nb = adj[a];
    pulses.push({ a, b: nb.length ? nb[(Math.random() * nb.length) | 0] : a, p: Math.random(), spd: 0.22 + Math.random() * 0.5 });
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ size: 7, sizeAttenuation: true, color: 0xc8f6ff, transparent: true, opacity: 1, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  new THREE.TextureLoader().load('/particle.png', (tex) => { tex.colorSpace = THREE.SRGBColorSpace; nMat.alphaMap = tex; nMat.needsUpdate = true; pMat.alphaMap = tex; pMat.needsUpdate = true; });
  group.add(new THREE.Points(pGeo, pMat));
  scene.add(group);
  return { nodes, adj, pulses, pPos, pGeo, lineMat, nMat, pMat };
})();

// Per-chapter "color world": the network recolors toward the nearest section's
// hue on approach, fading back to neutral cyan between beats. (Placeholder
// palette — swap to real project brand colors in Phase A/C.)
const BASE_EDGE = new THREE.Color(0x3fb6e6), BASE_NODE = new THREE.Color(0x6fd8f5), BASE_PULSE = new THREE.Color(0xc8f6ff);
const CHAPTER_COLORS = [0x4fd2ff, 0x9b8cff, 0x36e0c0, 0xff9e7a, 0x7fb4ff, 0xff8fb0, 0xffd27f];
const _chapTarget = new THREE.Color();

// Warp streaks: forward-rushing lines that only appear while the camera is
// flying fast between chapters — a cinematic whoosh, invisible when settled.
const warp = (() => {
  const M = 90, R = 260;
  const pos = new Float32Array(M * 2 * 3), data = [];
  for (let i = 0; i < M; i++) data.push({ p: new THREE.Vector3((Math.random() - 0.5) * R * 1.6, (Math.random() - 0.5) * R * 1.6, (Math.random() - 0.5) * R * 1.6) });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x7fd2ee, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const obj = new THREE.LineSegments(geo, mat);          // identity transform — positions are world-space
  obj.frustumCulled = false; obj.renderOrder = -5;
  scene.add(obj);
  return { R, data, pos, geo, mat, obj };
})();
let _prevCamPos = null;
const _vel = new THREE.Vector3(), _dir = new THREE.Vector3();

// (electric energy sprites removed — a dedicated lightning repo will go here)

// ---- Default path (used until the user edits / loads saved) -----------------
const mkPanel = (x, y, z, w, h, rot = [0, 0, 0]) => ({ pos: [x, y, z], size: [w, h], rot, billboard: false });
// the opening hero shot — a framed camera looking at a big title panel
const makeHeroBeat = () => ({
  name: 'Hero', cam: [0, 2, 120], look: [0, 2, 40], up: UP_NORMAL.slice(),
  fov: 70, dur: 1.8, desc: 'Landing pages & SaaS interfaces — fly through the work.',
  img: '', link: '', panel: mkPanel(0, 2, 35, 120, 64),
});
// Baked from the user's exported path (Copy config) — kept exactly as-is.
const DEFAULT_BEATS = [
  { name: 'Hero', cam: [-56, 2, 120], look: [-11, 59, 42], up: [0, 1, 0], fov: 25, dur: 1.4, desc: 'Landing pages & SaaS interfaces — fly through the work.', img: '', link: '', panel: { pos: [196, -53, -70], size: [120, 64], rot: [-5, -68, 2], billboard: false } },
  { name: 'Transition', cam: [1, 53, 33], look: [192, -55, -56], up: [0, 1, 0], fov: 41, dur: 1.6, desc: '', img: '', link: '', panel: null },
  { name: 'My Projects', cam: [9, 10, -69], look: [15, 4, -119], up: [-0.66418640324206, 0.7376001166578326, -0.1216654825935754], fov: 83, dur: 1.6, desc: '', img: '', link: '', panel: { pos: [15, 4, -119], size: [70, 44], billboard: false, rot: [0, 0, 0] } },
  { name: 'Project 1', cam: [0, 2, -190], look: [-22, 0, -235], up: [0, 1, 0], fov: 87, dur: 1.6, desc: '', img: '', link: '', panel: { pos: [-22, 0, -235], size: [70, 44], billboard: false, rot: [0, 0, 0] } },
  { name: 'Project 2', cam: [0, 2, -310], look: [22, 0, -355], up: [0, 1, 0], fov: 80, dur: 1.6, desc: '', img: '', link: '', panel: { pos: [22, 0, -355], size: [70, 44], billboard: false, rot: [0, 0, 0] } },
  { name: 'Project 3 & 4', cam: [0, 35, -410], look: [0, 60, -475], up: [0, 1, 0], fov: 68, dur: 1.6, desc: '', img: '', link: '', panel: { pos: [0, 60, -475], size: [70, 44], billboard: false, rot: [0, 0, 0] } },
  { name: 'Final / Footer', cam: [0, 49, -560], look: [1, 290, -560], up: [0, 0, -1], fov: 52, dur: 3, desc: '', img: '', link: '', panel: { pos: [1, 290, -560], size: [70, 44], billboard: false, rot: [89, 0, 180] } },
];

// ---- State -----------------------------------------------------------------
let beats = [];
let speedMul = 1;    // global flight-speed multiplier (scales per-shot durations)
let smooth = 0.5;    // 0 = straight segments, 1 = fully curved (spline) path
let tween = null;    // active section→section transition { from, to, t, dur }
let index = 0;       // play-mode target section
let progress = 0;    // smoothed 0..1 along the path
let editMode = false;
let sel = 0;         // selected section in editor
let lastNav = 0;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const DEF_FOV = 68, DEF_DUR = 1.6;
// a sensible starter panel for a section: sits at its aim point, fixed orientation
const defaultPanelFor = (b) => ({ pos: b.look.slice(), size: [70, 44], rot: [0, 0, 0], billboard: false });

const SAVE_KEY = 'voidConfig';
// fill in fields that didn't exist in earlier saved versions
function backfillBeat(b) {
  b.fov ??= DEF_FOV; b.dur ??= DEF_DUR;
  b.desc ??= ''; b.img ??= ''; b.link ??= '';
  if (b.panel === undefined) b.panel = defaultPanelFor(b);
  if (b.panel) {
    if (b.panel.spin !== undefined) { if (b.panel.rot === undefined) b.panel.rot = [0, b.panel.spin, 0]; delete b.panel.spin; } // migrate old single-axis spin
    b.panel.rot ??= [0, 0, 0];
    b.panel.billboard ??= false;
  }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d.beats?.length) {
        beats = d.beats;
        speedMul = d.speed ?? 1;
        smooth = d.smooth ?? 0.5;
        beats.forEach(backfillBeat); // bring older saves up to the current schema
        let migrated = false;
        if (!(d.version >= 2)) { beats.forEach((b) => { if (b.panel) b.panel.billboard = false; }); migrated = true; } // stop the old auto-facing default
        if (!(d.version >= 3)) { beats.unshift(makeHeroBeat()); migrated = true; }      // add a hero opening shot before everything
        if (!(d.version >= 4)) {
          beats.forEach((b) => { if (b.name === 'New section') { b.name = 'Transition'; b.panel = null; } }); // drop the leftover panel, keep its camera
          const fin = beats.find((b) => /final/i.test(b.name)) || beats[beats.length - 1];
          if (fin) fin.dur = 3;                                                          // slow the last transition into the finale
          migrated = true;
        }
        if (migrated) save();
        return;
      }
    }
  } catch (e) { /* ignore */ }
  beats = structuredClone(DEFAULT_BEATS);
  speedMul = 1; smooth = 0.5;
}
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify({ beats, speed: speedMul, smooth, version: 4 })); }
load();

// ---- Derived per-section position + orientation -----------------------------
const beatPos = [];
const beatQuats = [];
// orient with a CAMERA, not a plain Object3D: a camera looks down -Z, while an
// Object3D.lookAt aims +Z at the target — using Object3D flipped every camera,
// frustum, thumbnail, and the rotate math 180° (the "rotation acting up" bug).
const _dummy = new THREE.PerspectiveCamera();
const _tv = new THREE.Vector3();
let curve = null;    // smooth spline through the camera positions
function rebuildDerived() {
  beatPos.length = 0; beatQuats.length = 0;
  for (const b of beats) {
    beatPos.push(new THREE.Vector3(...b.cam));
    _dummy.up.set(...b.up);
    _dummy.position.set(...b.cam);
    _dummy.lookAt(new THREE.Vector3(...b.look));
    beatQuats.push(_dummy.quaternion.clone());
  }
  // centripetal Catmull-Rom keeps the curve from overshooting wildly between shots
  curve = beatPos.length >= 2
    ? new THREE.CatmullRomCurve3(beatPos.map((v) => v.clone()), false, 'centripetal')
    : null;
}
rebuildDerived();

// Position along the flight path at t∈[0,1], blending the straight segments with
// the smooth spline by `smooth`. Always passes exactly through each shot (at f=0).
function pathPoint(t, out) {
  const last = Math.max(1, beatPos.length - 1);
  const seg = clamp(t, 0, 1) * last;
  const i0 = clamp(Math.floor(seg), 0, last);
  const i1 = clamp(i0 + 1, 0, last);
  out.lerpVectors(beatPos[i0], beatPos[i1], seg - i0);
  if (curve && smooth > 0) { curve.getPoint(clamp(t, 0, 1), _tv); out.lerp(_tv, smooth); }
  return out;
}

// ---- Content panels (one optional panel per section) ------------------------
// Each beat may own a `panel` { pos, size:[w,h], spin, billboard } that renders
// as a flat, titled card in the void — this is the actual page content the
// visitor flies up to. The title is the section name; desc/img/link add detail.
const panelGroup = new THREE.Group();
scene.add(panelGroup);
const panelMeshes = [];      // index-aligned with beats; null where a beat has no panel
const imgCache = new Map();  // url -> { img, status } so we load each image once

function getImage(url) {
  if (!url) return null;
  const hit = imgCache.get(url);
  if (hit) return hit.img;
  const rec = { img: null, status: 'loading' };
  imgCache.set(url, rec);
  const im = new Image();
  im.crossOrigin = 'anonymous';
  im.onload = () => { rec.img = im; rec.status = 'ok'; rebuildPanels(); renderAllThumbs(); };
  im.onerror = () => { rec.status = 'error'; };
  im.src = url;
  return null;
}
function drawWrapped(ctx, text, x, y, maxW, lineH) {
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); y += lineH; line = word; }
      else line = test;
    }
    if (line) { ctx.fillText(line, x, y); y += lineH; }
  }
  return y;
}
function drawImageCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, br = w / h;
  let sw, sh, sx, sy;
  if (ir > br) { sh = img.height; sw = sh * br; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / br; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
function drawPanelCanvas(b) {
  const W = 512, H = clamp(Math.round(W * (b.panel.size[1] / b.panel.size[0])), 96, 1024);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  // light frosted-glass card: pale fill, hairline slate border, ink text
  ctx.fillStyle = 'rgba(8,16,26,0.82)'; ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(79,210,255,0.5)'; ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  const pad = 26; let y = pad;
  const img = getImage(b.img);
  if (img) {
    const iw = W - pad * 2, ih = Math.min(H * 0.5, iw * (img.height / img.width));
    drawImageCover(ctx, img, pad, y, iw, ih);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(79,210,255,0.3)'; ctx.strokeRect(pad, y, iw, ih);
    y += ih + 18;
  }
  ctx.fillStyle = '#eaf4ff'; ctx.font = `800 ${Math.round(W * 0.085)}px Inter, system-ui, sans-serif`;
  y = drawWrapped(ctx, b.name || '', pad, y, W - pad * 2, Math.round(W * 0.1));
  if (b.desc) {
    y += 8; ctx.fillStyle = '#9fc2e0'; ctx.font = `400 ${Math.round(W * 0.044)}px Inter, system-ui, sans-serif`;
    y = drawWrapped(ctx, b.desc, pad, y, W - pad * 2, Math.round(W * 0.06));
  }
  if (b.link) {
    const ph = Math.round(W * 0.085), pw = Math.round(W * 0.34), px = pad, py = H - pad - ph;
    ctx.fillStyle = '#1f9fd6';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fill(); }
    else ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = '#ffffff'; ctx.font = `700 ${Math.round(W * 0.04)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('VISIT LIVE', px + pw / 2, py + ph / 2 + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }
  return cv;
}
function makePanelMesh(b, i) {
  const tex = new THREE.CanvasTexture(drawPanelCanvas(b));
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(b.panel.size[0], b.panel.size[1]), mat);
  mesh.position.set(...b.panel.pos);
  const rot = b.panel.rot || [0, 0, 0];
  mesh.rotation.set(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180);
  mesh.userData = { type: 'panel', i };
  mesh.renderOrder = 2;                       // panels render in front of the background network
  return mesh;
}
function disposePanels() {
  for (const m of panelMeshes) {
    if (!m) continue;
    m.geometry.dispose(); if (m.material.map) m.material.map.dispose(); m.material.dispose();
  }
  panelMeshes.length = 0; panelGroup.clear();
}
function rebuildPanels() {
  disposePanels();
  beats.forEach((b, i) => {
    if (!b.panel) { panelMeshes.push(null); return; }
    const mesh = makePanelMesh(b, i);
    panelGroup.add(mesh); panelMeshes.push(mesh);
  });
}
// cheap in-place update for live slider/typing edits (avoids full rebuild churn)
function updatePanel(i) {
  const b = beats[i], mesh = panelMeshes[i];
  if (!b.panel || !mesh) { rebuildPanels(); return; }
  mesh.position.set(...b.panel.pos);
  const rot = b.panel.rot || [0, 0, 0];
  mesh.rotation.set(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180);
  mesh.geometry.dispose(); mesh.geometry = new THREE.PlaneGeometry(b.panel.size[0], b.panel.size[1]);
  if (mesh.material.map) mesh.material.map.dispose();
  const tex = new THREE.CanvasTexture(drawPanelCanvas(b));
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  mesh.material.map = tex; mesh.material.needsUpdate = true;
}
rebuildPanels();

// ---- Path gizmos (visible only in edit mode) --------------------------------
const pathGroup = new THREE.Group();
pathGroup.visible = false;
scene.add(pathGroup);
const camDots = [];  // clickable camera dots
const lookDots = []; // clickable aim dots
const camMat = new THREE.MeshBasicMaterial({ color: 0x4fd2ff });
const camSelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const lookMat = new THREE.MeshBasicMaterial({ color: 0xff3df0 });
const pathLineMat = new THREE.LineBasicMaterial({ color: 0x6f93b8 });
const aimLineMat = new THREE.LineBasicMaterial({ color: 0xff3df0, transparent: true, opacity: 0.5 });
const frustumMat = new THREE.LineBasicMaterial({ color: 0x9fe4ff });

// Shared geometries (reused every rebuild so we don't leak GPU memory).
const camBodyGeo = new THREE.BoxGeometry(7, 6, 11);   // little camera body
const ringGeo = new THREE.TorusGeometry(3.4, 0.9, 8, 22); // aim "target" reticle
// A frustum (cone of vision) opening toward -Z, the direction a camera looks.
const FN = -5, FF = -20, FW = 9, FH = 6;
const frustumGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0,0,FN), new THREE.Vector3(-FW, FH, FF),
  new THREE.Vector3(0,0,FN), new THREE.Vector3( FW, FH, FF),
  new THREE.Vector3(0,0,FN), new THREE.Vector3(-FW,-FH, FF),
  new THREE.Vector3(0,0,FN), new THREE.Vector3( FW,-FH, FF),
  new THREE.Vector3(-FW, FH, FF), new THREE.Vector3( FW, FH, FF),
  new THREE.Vector3( FW, FH, FF), new THREE.Vector3( FW,-FH, FF),
  new THREE.Vector3( FW,-FH, FF), new THREE.Vector3(-FW,-FH, FF),
  new THREE.Vector3(-FW,-FH, FF), new THREE.Vector3(-FW, FH, FF),
]);

// Build a little camera object (body + frustum) that points along its view dir.
function makeCamObject(b, selected) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(camBodyGeo, selected ? camSelMat : camMat);
  g.add(body);
  g.add(new THREE.LineSegments(frustumGeo, frustumMat));
  g.position.set(...b.cam);
  _dummy.up.set(...b.up);
  _dummy.position.set(...b.cam);
  _dummy.lookAt(new THREE.Vector3(...b.look));
  g.quaternion.copy(_dummy.quaternion); // face the aim point
  g.scale.setScalar(selected ? 1.35 : 1);
  return g;
}

// a floating number showing each camera's order in the sequence (1, 2, 3 …)
function makeLabel(text, selected) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(4,6,10,0.55)'; x.beginPath(); x.arc(32, 32, 30, 0, Math.PI * 2); x.fill();
  x.fillStyle = selected ? '#ffffff' : '#4fd2ff';
  x.font = 'bold 40px Inter, system-ui, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 32, 35);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  spr.scale.set(11, 11, 1);
  spr.userData = { dispose: true, label: true };
  return spr;
}

// dispose only geometries we created fresh this rebuild (flagged); shared ones stay
function clearGroup(g) {
  g.traverse((o) => {
    if (!o.userData || !o.userData.dispose) return;
    if (o.userData.label) { if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }
    else if (o.geometry) o.geometry.dispose();
  });
  g.clear();
}
function rebuildGizmos() {
  clearGroup(pathGroup);
  camDots.length = 0; lookDots.length = 0;
  if (beats.length > 1) {
    // sample the actual (possibly curved) flight path so the editor shows the truth
    const N = 140, pts = [];
    for (let k = 0; k <= N; k++) pts.push(pathPoint(k / N, new THREE.Vector3()));
    const lg = new THREE.BufferGeometry().setFromPoints(pts);
    const pl = new THREE.Line(lg, pathLineMat); pl.userData = { dispose: true };
    pathGroup.add(pl);
  }
  beats.forEach((b, i) => {
    // camera object (this is the draggable "camera")
    const cam = makeCamObject(b, i === sel);
    cam.userData.type = 'cam'; cam.userData.i = i;
    pathGroup.add(cam); camDots.push(cam);
    // order number floating just above the camera
    const label = makeLabel(String(i + 1), i === sel);
    label.position.set(b.cam[0], b.cam[1] + 10, b.cam[2]);
    pathGroup.add(label);
    // aim target reticle (drag this to change where the camera points)
    const ring = new THREE.Mesh(ringGeo, lookMat);
    ring.position.set(...b.look);
    ring.scale.setScalar(i === sel ? 1.3 : 1);
    ring.userData = { type: 'look', i };
    pathGroup.add(ring); lookDots.push(ring);
    // line from camera to its aim point
    const ag = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...b.cam), new THREE.Vector3(...b.look)]);
    const al = new THREE.Line(ag, aimLineMat); al.userData = { dispose: true };
    pathGroup.add(al);
  });
}

// ---- Controls (free-fly in edit mode; also visitor free-roam) ---------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.45;   // lower = less sensitive look
controls.zoomSpeed = 0.9;
controls.panSpeed = 1.0;
controls.screenSpacePanning = true; // pan parallel to the screen, not the ground plane
controls.enablePan = true;
controls.enabled = false;

// ---- Free-fly keyboard movement (Director Mode + free roam) -----------------
// OrbitControls alone only *orbits a pivot* — it can't fly THROUGH the void.
// WASD/RF move the camera (and drag the orbit pivot along with it, so mouse-look
// keeps working from wherever you stop). Shift = boost.
const flyKeys = { w: false, a: false, s: false, d: false, r: false, f: false, boost: false };
const FLY_SPEED = 150;               // units / second (Shift multiplies this)
const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _move = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
function clearFly() { for (const k in flyKeys) flyKeys[k] = false; }
function applyFly(dt) {
  if (transform.dragging) return;    // don't fly while dragging a gizmo
  const sp = FLY_SPEED * (flyKeys.boost ? 3 : 1) * dt;
  _move.set(0, 0, 0);
  camera.getWorldDirection(_fwd);                       // where we're looking
  _right.setFromMatrixColumn(camera.matrixWorld, 0);    // camera's right (screen X)
  if (flyKeys.w) _move.addScaledVector(_fwd, sp);
  if (flyKeys.s) _move.addScaledVector(_fwd, -sp);
  if (flyKeys.d) _move.addScaledVector(_right, sp);
  if (flyKeys.a) _move.addScaledVector(_right, -sp);
  if (flyKeys.r) _move.addScaledVector(WORLD_UP, sp);   // R/F = world up/down
  if (flyKeys.f) _move.addScaledVector(WORLD_UP, -sp);
  if (_move.lengthSq() === 0) return;
  camera.position.add(_move);
  controls.target.add(_move);        // keep the orbit pivot in front of us
}
window.addEventListener('keydown', (e) => {
  if (!(editMode || freeRoam)) return;
  if (isTextEntry(e.target)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  switch (e.key.toLowerCase()) {
    case 'w': flyKeys.w = true; break;
    case 'a': flyKeys.a = true; break;
    case 's': flyKeys.s = true; break;
    case 'd': flyKeys.d = true; break;
    case 'r': flyKeys.r = true; break;
    case 'f': flyKeys.f = true; break;
    case 'shift': flyKeys.boost = true; break;
    default: return;
  }
});
window.addEventListener('keyup', (e) => {
  switch (e.key.toLowerCase()) {
    case 'w': flyKeys.w = false; break;
    case 'a': flyKeys.a = false; break;
    case 's': flyKeys.s = false; break;
    case 'd': flyKeys.d = false; break;
    case 'r': flyKeys.r = false; break;
    case 'f': flyKeys.f = false; break;
    case 'shift': flyKeys.boost = false; break;
  }
});
window.addEventListener('blur', clearFly); // never get stuck "holding" a key

// ---- Click a dot to select it, drag the arrows to move it -------------------
const transform = new TransformControls(camera, renderer.domElement);
transform.size = 0.8;
let dragTarget = null; // { type:'cam'|'look'|'panel', i }
let gizmoMode = 'translate';
let dragDist = 120;
let dragStartCam = null, dragStartLook = null; // captured on mouseDown for rigid camera moves
transform.addEventListener('dragging-changed', (e) => { controls.enabled = !e.value && editMode ? false : controls.enabled; if (e.value) controls.enabled = false; else controls.enabled = editMode; });
transform.addEventListener('mouseDown', () => {
  if (!dragTarget) return;
  const b = beats[dragTarget.i];
  dragDist = Math.max(1, new THREE.Vector3(...b.cam).distanceTo(new THREE.Vector3(...b.look)));
  dragStartCam = b.cam.slice(); dragStartLook = b.look.slice();
});
transform.addEventListener('objectChange', () => {
  if (!dragTarget) return;
  const obj = transform.object;
  if (dragTarget.type === 'cam' && gizmoMode === 'rotate') {
    // rotating the camera body -> capture BOTH the aim point and the up vector
    // from its current facing, so the exact orientation (incl. roll) is kept.
    const q = obj.quaternion;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const upv = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const camV = new THREE.Vector3(...beats[dragTarget.i].cam);
    const look = camV.clone().add(fwd.multiplyScalar(dragDist));
    beats[dragTarget.i].look = [Math.round(look.x), Math.round(look.y), Math.round(look.z)];
    beats[dragTarget.i].up = [upv.x, upv.y, upv.z];
  } else if (dragTarget.type === 'panel') {
    if (gizmoMode === 'rotate') {
      beats[dragTarget.i].panel.rot = [
        Math.round(THREE.MathUtils.radToDeg(obj.rotation.x)),
        Math.round(THREE.MathUtils.radToDeg(obj.rotation.y)),
        Math.round(THREE.MathUtils.radToDeg(obj.rotation.z)),
      ];
    } else {
      const p = obj.position;
      beats[dragTarget.i].panel.pos = [Math.round(p.x), Math.round(p.y), Math.round(p.z)];
    }
  } else if (dragTarget.type === 'cam') {
    // moving the camera carries its aim point along, so the facing (front) is
    // preserved — change the front separately by rotating (T) or dragging the ring
    const p = obj.position;
    if (dragStartCam && dragStartLook) {
      beats[dragTarget.i].look = [
        Math.round(dragStartLook[0] + (p.x - dragStartCam[0])),
        Math.round(dragStartLook[1] + (p.y - dragStartCam[1])),
        Math.round(dragStartLook[2] + (p.z - dragStartCam[2])),
      ];
    }
    beats[dragTarget.i].cam = [Math.round(p.x), Math.round(p.y), Math.round(p.z)];
  } else {
    const p = obj.position;
    beats[dragTarget.i][dragTarget.type] = [Math.round(p.x), Math.round(p.y), Math.round(p.z)];
  }
  rebuildDerived();
  if (dragTarget.i === sel) loadFields();
});
transform.addEventListener('mouseUp', () => commit('Moved point'));
const tcHelper = transform.getHelper ? transform.getHelper() : transform;
scene.add(tcHelper);
function reattach() {
  if (!dragTarget) { transform.detach(); return; }
  dragTarget.i = clamp(dragTarget.i, 0, beats.length - 1);
  const arr = dragTarget.type === 'cam' ? camDots : dragTarget.type === 'look' ? lookDots : panelMeshes;
  const m = arr[dragTarget.i];
  if (m) { transform.attach(m); transform.setMode(dragTarget.type !== 'look' ? gizmoMode : 'translate'); }
  else transform.detach();
}
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (e) => {
  // bail if the press is on the transform gizmo itself (axis set = hovering a
  // handle) — otherwise a rotate-ring click would re-select the object behind it
  // and cancel the drag, which broke rotation for both cameras and panels.
  if (!editMode || transform.dragging || transform.axis) return;
  ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
  ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects([...camDots, ...lookDots, ...panelMeshes.filter(Boolean)], true);
  if (!hits.length) return;
  let o = hits[0].object;
  while (o && !(o.userData && o.userData.type !== undefined)) o = o.parent;
  if (!o) return;
  const { type, i } = o.userData;
  sel = i;
  rebuildGizmos();
  dragTarget = { type, i };
  reattach();
  refreshEditor();
});
// play mode: clicking a panel that has a link opens it
renderer.domElement.addEventListener('click', (e) => {
  if (editMode || freeRoam) return;
  ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
  ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(panelMeshes.filter(Boolean), false);
  if (hits.length) { const b = beats[hits[0].object.userData.i]; if (b && b.link) window.open(b.link, '_blank', 'noopener'); }
});

// ---- Play-mode navigation ---------------------------------------------------
let freeRoam = false;
const freeBtn = document.querySelector('#freeroam');
function lastIdx() { return Math.max(0, beats.length - 1); }
function step(dir) {
  if (editMode || freeRoam) return;
  const now = performance.now();
  if (now - lastNav < 350) return;
  const n = clamp(index + dir, 0, lastIdx());
  if (n === index) return;
  index = n; lastNav = now;
  // start a timed flight into the new section (per-shot duration, scaled by speed)
  const target = index / Math.max(1, lastIdx());
  const dur = (beats[index]?.dur ?? DEF_DUR) / Math.max(0.05, speedMul);
  tween = { from: progress, to: target, t: 0, dur: Math.max(0.15, dur) };
  freeBtn.hidden = index !== lastIdx();
}
window.addEventListener('wheel', (e) => {
  if (editMode || freeRoam) return;   // editor uses orbit zoom
  e.preventDefault();
  if (Math.abs(e.deltaY) < 8) return;
  step(e.deltaY > 0 ? 1 : -1);
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (isTextEntry(e.target)) return;
  if (editMode) return;
  if (['ArrowDown','PageDown',' ','Spacebar'].includes(e.key)) { e.preventDefault(); step(1); }
  else if (['ArrowUp','PageUp'].includes(e.key)) { e.preventDefault(); step(-1); }
});

freeBtn.addEventListener('click', () => setFreeRoam(!freeRoam));
function setFreeRoam(on) {
  freeRoam = on; controls.enabled = on; clearFly();
  if (on) {
    // drop into noclip right where we are, looking the same way
    camera.up.set(0, 1, 0);
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    controls.target.copy(camera.position).addScaledVector(fwd, 60);
    controls.update();
    freeBtn.hidden = false; freeBtn.textContent = 'Exit free-fly (V)';
  } else {
    progress = index / Math.max(1, lastIdx()); tween = null; // resume on the rails at the current section
    freeBtn.hidden = index !== lastIdx();
    freeBtn.textContent = 'Enter free roam';
  }
}

// ---- Waypoint rail: a dot per section that fills/ignites as you travel --------
const wpEl = document.querySelector('#waypoints');
let wpDots = [], wpFill = null;
function buildWaypoints() {
  if (!wpEl) return;
  wpEl.innerHTML = '<div class="wp-track"></div><div class="wp-fill"></div>';
  wpFill = wpEl.querySelector('.wp-fill');
  wpDots = beats.map((b, i) => {
    const dot = document.createElement('button');
    dot.type = 'button'; dot.className = 'wp-dot';
    dot.innerHTML = `<span class="wp-label">${b.name}</span>`;
    dot.addEventListener('click', () => {
      if (editMode) return;
      if (freeRoam) setFreeRoam(false);
      index = clamp(i, 0, lastIdx());
      tween = { from: progress, to: index / Math.max(1, lastIdx()), t: 0, dur: Math.max(0.2, (beats[index]?.dur ?? DEF_DUR) / Math.max(0.05, speedMul)) };
      freeBtn.hidden = index !== lastIdx();
    });
    wpEl.appendChild(dot);
    return dot;
  });
  wpEl.hidden = editMode;
}
function updateWaypoints() {
  if (!wpDots.length) return;
  const cur = editMode ? sel : index;
  for (let i = 0; i < wpDots.length; i++) {
    wpDots[i].classList.toggle('active', i === cur);
    wpDots[i].classList.toggle('done', i < cur);
  }
  if (wpFill) wpFill.style.transform = `scaleY(${clamp(progress, 0, 1)})`;
}
buildWaypoints();

// ---- Kinetic section caption (demo content until real copy drops in) --------
const capEl = document.querySelector('#caption');
const capLabel = capEl && capEl.querySelector('.cap-label');
const capTitle = capEl && capEl.querySelector('.cap-title');
const capDesc = capEl && capEl.querySelector('.cap-desc');
const DEMO_CAPTIONS = beats.map((b, i) => ({
  label: `CH.${String(i + 1).padStart(2, '0')} — ${b.name}`,
  title: b.name,
  desc: 'Placeholder copy — this is where the real section content will drop in.',
}));
let _capShown = -1;
function setCaption(i) {
  if (!capEl || i === _capShown) return;
  _capShown = i;
  const c = DEMO_CAPTIONS[i] || { label: '', title: '', desc: '' };
  capEl.classList.remove('show');
  requestAnimationFrame(() => {                 // reset → set text → replay the reveal
    capLabel.textContent = c.label;
    capTitle.textContent = c.title;
    capDesc.textContent = c.desc;
    requestAnimationFrame(() => capEl.classList.add('show'));
  });
}
function hideCaption() {
  if (!capEl || _capShown === -1) return;
  _capShown = -1;
  capEl.classList.remove('show');
}

// subtle parallax (play mode only)
const mouse = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

// ---- HUD --------------------------------------------------------------------
const overlay = document.querySelector('#overlay');
const hudBeat = document.querySelector('#hud-beat');
const hudProgress = document.querySelector('#hud-progress');
const visitBtn = document.querySelector('#visitlive');

// ===========================================================================
//  EDITOR
// ===========================================================================
const editor = document.querySelector('#editor');
const edSpeed = document.querySelector('#ed-speed');
const edSpeedVal = document.querySelector('#ed-speed-val');
const edSmooth = document.querySelector('#ed-smooth');
const edSmoothVal = document.querySelector('#ed-smooth-val');
const edSens = document.querySelector('#ed-sens');
const edSensVal = document.querySelector('#ed-sens-val');
const edList = document.querySelector('#ed-beatlist');
const edName = document.querySelector('#ed-name');
const edFields = document.querySelector('#ed-fields');
const edVertical = document.querySelector('#ed-vertical');
const edStatus = document.querySelector('#ed-status');
let sens = 0.45;
const edMove = document.querySelector('#ed-move');
const edRotate = document.querySelector('#ed-rotate');
function setGizmoMode(m) {
  gizmoMode = m;
  // cameras AND panels can rotate/translate; the aim ring only translates
  transform.setMode(dragTarget && dragTarget.type !== 'look' ? m : 'translate');
  edMove.classList.toggle('active', m === 'translate');
  edRotate.classList.toggle('active', m === 'rotate');
}
edMove.addEventListener('click', () => setGizmoMode('translate'));
edRotate.addEventListener('click', () => setGizmoMode('rotate'));
setGizmoMode('translate');

// ---- Undo / redo history ----------------------------------------------------
let history = [];
let hPtr = -1;
function snapshot() { return JSON.stringify({ beats, speed: speedMul, smooth }); }
function pushHistory() {
  history = history.slice(0, hPtr + 1);
  history.push(snapshot());
  hPtr = history.length - 1;
  if (history.length > 100) { history.shift(); hPtr--; }
}
function applySnapshot(str) {
  const d = JSON.parse(str);
  beats = d.beats; speedMul = d.speed ?? 1; smooth = d.smooth ?? 0.5;
  beats.forEach(backfillBeat);
  sel = clamp(sel, 0, beats.length - 1);
  rebuildDerived(); rebuildGizmos(); rebuildPanels(); refreshEditor(); save();
}
function undo() { if (hPtr > 0) { hPtr--; applySnapshot(history[hPtr]); flash('Undo'); } }
function redo() { if (hPtr < history.length - 1) { hPtr++; applySnapshot(history[hPtr]); flash('Redo'); } }
function commit(msg) { rebuildDerived(); rebuildGizmos(); rebuildPanels(); buildWaypoints(); reattach(); pushHistory(); save(); if (msg) flash(msg); }
function flash(t) { edStatus.textContent = t; }
pushHistory(); // initial state

// ---- Sliders + number boxes for the selected section ------------------------
// Each row = label + range slider (for feel) + number box (for precision), synced.
// [key, axis, label, min, max]
const AXES = [
  ['cam', 0, 'cam X', -300, 300], ['cam', 1, 'cam Y', -150, 350], ['cam', 2, 'cam Z', -700, 200],
  ['look', 0, 'look X', -300, 300], ['look', 1, 'look Y', -150, 350], ['look', 2, 'look Z', -700, 200],
];
const fieldInputs = [];
const scalarInputs = [];
function makeSlider(min, max, step) {
  const rng = document.createElement('input'); rng.type = 'range'; rng.min = min; rng.max = max; rng.step = step;
  const num = document.createElement('input'); num.type = 'number'; num.step = step; num.min = min; num.max = max; num.className = 'numbox';
  return [rng, num];
}
for (const [key, axis, label, mn, mx] of AXES) {
  const row = document.createElement('div'); row.className = 'row slider';
  const l = document.createElement('label'); l.textContent = label;
  const [rng, num] = makeSlider(mn, mx, 1);
  const apply = (v) => {
    v = Math.round(Number(v) || 0);
    beats[sel][key][axis] = v; rng.value = v; num.value = v;
    rebuildDerived(); rebuildGizmos(); renderThumb(sel);
  };
  rng.addEventListener('input', () => apply(rng.value));
  num.addEventListener('input', () => apply(num.value));
  rng.addEventListener('change', () => commit(''));
  num.addEventListener('change', () => commit(''));
  row.append(l, rng, num);
  edFields.appendChild(row);
  fieldInputs.push({ key, axis, rng, num });
}
// per-shot scalar controls: field-of-view (zoom) and segment duration (timing)
function makeScalarRow(label, mn, mx, step, prop, def) {
  const row = document.createElement('div'); row.className = 'row slider';
  const l = document.createElement('label'); l.textContent = label;
  const [rng, num] = makeSlider(mn, mx, step);
  const apply = (v) => {
    v = clamp(Number(v) || def, mn, mx);
    beats[sel][prop] = v; rng.value = v; num.value = v;
    if (prop === 'fov') renderThumb(sel);
  };
  rng.addEventListener('input', () => apply(rng.value));
  num.addEventListener('input', () => apply(num.value));
  rng.addEventListener('change', () => commit(''));
  num.addEventListener('change', () => commit(''));
  row.append(l, rng, num);
  edFields.appendChild(row);
  scalarInputs.push({ prop, def, rng, num });
}
makeScalarRow('fov', 25, 110, 1, 'fov', DEF_FOV);    // lower = zoomed in, higher = wide
makeScalarRow('secs', 0.3, 5, 0.1, 'dur', DEF_DUR);  // time to fly INTO this shot

// ---- Content panel + page content for the selected section ------------------
const edHasPanel = document.querySelector('#ed-haspanel');
const edBillboard = document.querySelector('#ed-billboard');
const edPanelFields = document.querySelector('#ed-panelfields');
const edDesc = document.querySelector('#ed-desc');
const edImg = document.querySelector('#ed-img');
const edLink = document.querySelector('#ed-link');
const panelInputs = [];
function makePanelSlider(label, mn, mx, step, get, set) {
  const row = document.createElement('div'); row.className = 'row slider';
  const l = document.createElement('label'); l.textContent = label;
  const [rng, num] = makeSlider(mn, mx, step);
  const apply = (v) => {
    if (!beats[sel].panel) return;
    v = clamp(Number(v) || 0, mn, mx);
    set(v); rng.value = v; num.value = v;
    updatePanel(sel);
  };
  rng.addEventListener('input', () => apply(rng.value));
  num.addEventListener('input', () => apply(num.value));
  rng.addEventListener('change', () => commit(''));
  num.addEventListener('change', () => commit(''));
  row.append(l, rng, num);
  edPanelFields.appendChild(row);
  panelInputs.push({ get, rng, num });
}
makePanelSlider('pos X', -300, 300, 1, () => beats[sel].panel.pos[0], (v) => (beats[sel].panel.pos[0] = v));
makePanelSlider('pos Y', -150, 350, 1, () => beats[sel].panel.pos[1], (v) => (beats[sel].panel.pos[1] = v));
makePanelSlider('pos Z', -700, 200, 1, () => beats[sel].panel.pos[2], (v) => (beats[sel].panel.pos[2] = v));
makePanelSlider('width', 5, 300, 1, () => beats[sel].panel.size[0], (v) => (beats[sel].panel.size[0] = v));
makePanelSlider('height', 5, 200, 1, () => beats[sel].panel.size[1], (v) => (beats[sel].panel.size[1] = v));
makePanelSlider('rot X°', -180, 180, 1, () => beats[sel].panel.rot[0], (v) => (beats[sel].panel.rot[0] = v));
makePanelSlider('rot Y°', -180, 180, 1, () => beats[sel].panel.rot[1], (v) => (beats[sel].panel.rot[1] = v));
makePanelSlider('rot Z°', -180, 180, 1, () => beats[sel].panel.rot[2], (v) => (beats[sel].panel.rot[2] = v));

edHasPanel.addEventListener('change', () => {
  beats[sel].panel = edHasPanel.checked ? defaultPanelFor(beats[sel]) : null;
  rebuildPanels(); loadFields(); commit(edHasPanel.checked ? 'Panel added' : 'Panel removed');
});
edBillboard.addEventListener('change', () => { if (beats[sel].panel) { beats[sel].panel.billboard = edBillboard.checked; commit('Panel facing'); } });
edDesc.addEventListener('input', () => { beats[sel].desc = edDesc.value; updatePanel(sel); });
edDesc.addEventListener('change', () => commit(''));
edImg.addEventListener('input', () => { beats[sel].img = edImg.value.trim(); updatePanel(sel); });
edImg.addEventListener('change', () => commit(''));
edLink.addEventListener('input', () => { beats[sel].link = edLink.value.trim(); updatePanel(sel); });
edLink.addEventListener('change', () => commit(''));

// ---- Live per-camera thumbnails (what each shot actually sees) ---------------
const thumbCanvases = [];
function _renderThumbInto(i, cv) {
  const b = beats[i]; if (!b) return;
  thumbCam.up.set(...b.up);
  thumbCam.position.set(...b.cam);
  _dummy.up.set(...b.up); _dummy.position.set(...b.cam); _dummy.lookAt(_tv.set(...b.look));
  thumbCam.quaternion.copy(_dummy.quaternion);
  thumbCam.fov = b.fov ?? DEF_FOV; thumbCam.updateProjectionMatrix();
  for (let j = 0; j < panelMeshes.length; j++) {        // face billboard panels at this shot's camera
    const pm = panelMeshes[j];
    if (pm && beats[j]?.panel?.billboard) pm.quaternion.copy(thumbCam.quaternion);
  }
  thumbRenderer.render(scene, thumbCam);
  cv.getContext('2d').drawImage(thumbRenderer.domElement, 0, 0, cv.width, cv.height);
}
// thumbnails should show the clean visitor view: hide the path gizmos and pull
// the transform gizmo out of the scene entirely (merely hiding it still lets its
// matrix-world check run during the offscreen render, which logs errors).
function withGizmosHidden(fn) {
  const wasPath = pathGroup.visible;
  pathGroup.visible = false;
  const helperParent = tcHelper.parent;
  if (helperParent) helperParent.remove(tcHelper);
  fn();
  if (helperParent) helperParent.add(tcHelper);
  pathGroup.visible = wasPath;
}
function renderThumb(i) { if (editMode && thumbCanvases[i]) withGizmosHidden(() => _renderThumbInto(i, thumbCanvases[i])); }
function renderAllThumbs() {
  if (!editMode) return;
  withGizmosHidden(() => { for (let i = 0; i < beats.length; i++) if (thumbCanvases[i]) _renderThumbInto(i, thumbCanvases[i]); });
}

function renderList() {
  edList.innerHTML = '';
  thumbCanvases.length = 0;
  beats.forEach((b, i) => {
    const row = document.createElement('div');
    row.className = 'beat-row' + (i === sel ? ' selected' : '');
    row.draggable = true;                       // drag the card to reorder
    const cv = document.createElement('canvas');
    cv.className = 'thumb'; cv.width = THUMB_W; cv.height = THUMB_H; cv.draggable = false;
    const meta = document.createElement('div'); meta.className = 'beat-meta';
    meta.innerHTML = `<span class="bidx">⠿ ${i + 1}</span><span class="bname">${b.name}</span>`;
    const dup = mkBtn('⧉', (e) => { e.stopPropagation(); duplicateBeat(i); }, 'Duplicate');
    const del = mkBtn('×', (e) => { e.stopPropagation(); removeBeat(i); }, 'Delete');
    meta.append(dup, del);
    row.append(cv, meta);
    row.addEventListener('click', () => { sel = i; rebuildGizmos(); dragTarget = { type: 'cam', i: sel }; reattach(); jumpToSelected(); refreshEditor(); });
    row.addEventListener('dragstart', (e) => { dragFrom = i; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    row.addEventListener('dragend', () => { dragFrom = null; document.querySelectorAll('.beat-row').forEach((el) => el.classList.remove('dragging', 'dragover')); });
    row.addEventListener('dragover', (e) => { e.preventDefault(); if (dragFrom !== null && dragFrom !== i) row.classList.add('dragover'); });
    row.addEventListener('dragleave', () => row.classList.remove('dragover'));
    row.addEventListener('drop', (e) => { e.preventDefault(); row.classList.remove('dragover'); if (dragFrom !== null && dragFrom !== i) moveBeat(dragFrom, i); });
    edList.appendChild(row);
    thumbCanvases.push(cv);
  });
  renderAllThumbs();
}
function mkBtn(txt, fn, title) { const b = document.createElement('button'); b.textContent = txt; if (title) b.title = title; b.addEventListener('click', fn); return b; }

function loadFields() {
  edName.value = beats[sel].name;
  for (const f of fieldInputs) { const v = beats[sel][f.key][f.axis]; f.rng.value = v; f.num.value = v; }
  for (const s of scalarInputs) { const v = beats[sel][s.prop] ?? s.def; s.rng.value = v; s.num.value = v; }
  edVertical.checked = beats[sel].up[1] === 0; // vertical look uses up=[0,0,-1]
  const hasPanel = !!beats[sel].panel;
  edHasPanel.checked = hasPanel;
  edPanelFields.style.display = hasPanel ? '' : 'none';
  if (hasPanel) {
    edBillboard.checked = beats[sel].panel.billboard === true;
    for (const p of panelInputs) { const v = p.get(); p.rng.value = v; p.num.value = v; }
  }
  edDesc.value = beats[sel].desc || '';
  edImg.value = beats[sel].img || '';
  edLink.value = beats[sel].link || '';
}
function refreshEditor() {
  renderList(); loadFields();
  edSpeed.value = speedMul; edSpeedVal.textContent = speedMul.toFixed(2) + '×';
  edSmooth.value = smooth; edSmoothVal.textContent = smooth.toFixed(2);
  renderTimeline();
}

// name
edName.addEventListener('input', () => { beats[sel].name = edName.value; renderList(); });
edName.addEventListener('change', () => commit(''));
// vertical look toggle
edVertical.addEventListener('change', () => {
  beats[sel].up = (edVertical.checked ? UP_VERTICAL : UP_NORMAL).slice();
  commit('Up vector set');
});
// global flight speed (scales every shot's duration)
edSpeed.addEventListener('input', () => { speedMul = clamp(Number(edSpeed.value) || 1, 0.25, 3); edSpeedVal.textContent = speedMul.toFixed(2) + '×'; });
edSpeed.addEventListener('change', () => commit('Speed set'));
// path smoothness (straight ↔ curved)
edSmooth.addEventListener('input', () => { smooth = clamp(Number(edSmooth.value) || 0, 0, 1); edSmoothVal.textContent = smooth.toFixed(2); rebuildGizmos(); });
edSmooth.addEventListener('change', () => commit('Smoothness set'));
// look sensitivity
edSens.value = sens; edSensVal.textContent = sens.toFixed(2);
edSens.addEventListener('input', () => { sens = Number(edSens.value); controls.rotateSpeed = sens; edSensVal.textContent = sens.toFixed(2); });

// ---- Editor actions ---------------------------------------------------------
function jumpToSelected() {
  camera.up.set(0, 1, 0);
  camera.position.set(...beats[sel].cam);
  camera.fov = beats[sel].fov ?? DEF_FOV; camera.updateProjectionMatrix(); // match the shot's zoom
  controls.target.set(...beats[sel].look);
  controls.update();
}
function setFromView() {
  beats[sel].cam = [r(camera.position.x), r(camera.position.y), r(camera.position.z)];
  beats[sel].look = [r(controls.target.x), r(controls.target.y), r(controls.target.z)];
  beats[sel].fov = r(camera.fov) || DEF_FOV;
  loadFields(); commit('Section shot captured');
}
function addFromView() {
  const aim = [r(controls.target.x), r(controls.target.y), r(controls.target.z)];
  beats.splice(sel + 1, 0, {
    name: 'New section',
    cam: [r(camera.position.x), r(camera.position.y), r(camera.position.z)],
    look: aim,
    up: UP_NORMAL.slice(),
    fov: r(camera.fov) || DEF_FOV,
    dur: DEF_DUR,
    desc: '', img: '', link: '',
    panel: { pos: aim.slice(), size: [70, 44], rot: [0, 0, 0], billboard: false },
  });
  sel += 1; commit('Section added'); refreshEditor();
}
function removeBeat(i) {
  if (beats.length <= 2) { flash('Keep at least 2 sections'); return; }
  beats.splice(i, 1);
  if (sel >= beats.length) sel = beats.length - 1;
  commit('Section deleted'); refreshEditor();
}
function reorder(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= beats.length) return;
  [beats[i], beats[j]] = [beats[j], beats[i]];
  if (sel === i) sel = j; else if (sel === j) sel = i;
  commit('Reordered'); refreshEditor();
}
let dragFrom = null;                              // index being dragged in the list
function moveBeat(from, to) {                     // drag-to-reorder
  const [b] = beats.splice(from, 1);
  beats.splice(to, 0, b);
  sel = to;
  commit('Reordered'); refreshEditor();
}
function duplicateBeat(i) {                        // clone a section as a starting point
  const copy = structuredClone(beats[i]);
  copy.name = (beats[i].name || 'Section') + ' copy';
  beats.splice(i + 1, 0, copy);
  sel = i + 1;
  commit('Duplicated'); refreshEditor();
}
const r = (v) => Math.round(v);

document.querySelector('#ed-setview').addEventListener('click', setFromView);
document.querySelector('#ed-add').addEventListener('click', addFromView);
document.querySelector('#ed-jump').addEventListener('click', () => { jumpToSelected(); flash('Jumped'); });
document.querySelector('#ed-undo').addEventListener('click', undo);
document.querySelector('#ed-redo').addEventListener('click', redo);
document.querySelector('#ed-save').addEventListener('click', () => { save(); flash('Saved'); });
document.querySelector('#ed-reset').addEventListener('click', () => {
  if (!confirm('Reset the whole path to defaults? This clears your saved edits.')) return;
  beats = structuredClone(DEFAULT_BEATS); speedMul = 1; smooth = 0.5; sel = 0;
  localStorage.removeItem(SAVE_KEY);
  rebuildDerived(); rebuildGizmos(); rebuildPanels(); refreshEditor(); pushHistory(); flash('Reset to defaults');
});
document.querySelector('#ed-preview').addEventListener('click', () => { setEdit(false); index = 0; progress = 0; tween = null; });
document.querySelector('#ed-copy').addEventListener('click', () => {
  const lines = beats.map(b => '  ' + JSON.stringify(b) + ',').join('\n');
  const text = 'const BEATS = [\n' + lines + '\n];\nlet SPEED = ' + speedMul + ';\nlet SMOOTH = ' + smooth + ';';
  navigator.clipboard.writeText(text).then(() => flash('Copied to clipboard')).catch(() => flash('Logged to console'));
  console.log(text);
});

// ---- Timeline: keyframes = sections, spaced along time by their durations ---
const timelineEl = document.querySelector('#timeline');
const tlTrack = document.querySelector('#tl-track');
const tlPlayhead = document.querySelector('#tl-playhead');
const tlTotal = document.querySelector('#tl-total');
let scrubbing = false;

function beatTimes() {                       // cumulative arrival time of each beat
  const times = [0];
  for (let i = 1; i < beats.length; i++) times.push(times[i - 1] + Math.max(0.1, beats[i].dur ?? DEF_DUR));
  return times;
}
function positionPlayhead(p) { tlPlayhead.style.left = (clamp(p, 0, 1) * 100) + '%'; }
function renderTimeline() {
  if (!timelineEl) return;
  [...tlTrack.querySelectorAll('.tl-node')].forEach((n) => n.remove());
  const times = beatTimes();
  const total = Math.max(0.001, times[times.length - 1]);
  tlTotal.textContent = total.toFixed(1) + 's';
  beats.forEach((b, i) => {
    const node = document.createElement('div');
    node.className = 'tl-node' + (i === sel ? ' selected' : '');
    node.style.left = (times[i] / total * 100) + '%';
    node.title = b.name;
    node.innerHTML = '<span class="tl-dot"></span><span class="tl-lbl">' + (i + 1) + '</span>';
    node.addEventListener('pointerdown', (e) => startNodeDrag(e, i));
    tlTrack.appendChild(node);
  });
  positionPlayhead(times[clamp(sel, 0, beats.length - 1)] / total);
}
function selectSection(i) {
  sel = clamp(i, 0, beats.length - 1);
  rebuildGizmos(); dragTarget = { type: 'cam', i: sel }; reattach(); jumpToSelected(); refreshEditor();
}
function startNodeDrag(e, i) {
  e.stopPropagation(); e.preventDefault();
  const rect = tlTrack.getBoundingClientRect();
  const times = beatTimes();
  const pxPerSec = rect.width / Math.max(0.001, times[times.length - 1]);
  const prevTime = i > 0 ? times[i - 1] : 0;
  let moved = false;
  const move = (ev) => {
    if (i === 0) return;                     // first keyframe has no incoming duration
    const x = clamp(ev.clientX - rect.left, 0, rect.width);
    beats[i].dur = Math.max(0.3, +(x / pxPerSec - prevTime).toFixed(2));
    moved = true;
    rebuildDerived(); renderTimeline(); loadFields();
  };
  const up = () => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    if (moved) commit('Retimed'); else selectSection(i);   // a click (no drag) selects
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
function scrubTo(p) {                         // drive the camera along the flight path at time p∈[0,1]
  const last = Math.max(1, lastIdx());
  const seg = clamp(p, 0, 1) * last;
  const i0 = clamp(Math.floor(seg), 0, lastIdx());
  const i1 = clamp(i0 + 1, 0, lastIdx());
  const f = seg - i0;
  pathPoint(p, camera.position);
  camera.up.set(0, 1, 0);
  camera.quaternion.copy(beatQuats[i0]).slerp(beatQuats[i1], f);
  const fa = beats[i0]?.fov ?? DEF_FOV, fb = beats[i1]?.fov ?? DEF_FOV;
  camera.fov = fa + (fb - fa) * f; camera.updateProjectionMatrix();
}
if (tlTrack) {
  tlTrack.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.tl-node')) return;              // nodes handle their own drag
    scrubbing = true; controls.enabled = false;
    const rect = tlTrack.getBoundingClientRect();
    const move = (ev) => { const p = clamp((ev.clientX - rect.left) / rect.width, 0, 1); positionPlayhead(p); scrubTo(p); };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      scrubbing = false; controls.enabled = editMode;
      const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);  // resume orbit from the scrubbed pose
      controls.target.copy(camera.position).addScaledVector(fwd, 60); controls.update();
    };
    move(e); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  });
}

// ---- Mode toggle ------------------------------------------------------------
function setEdit(on) {
  editMode = on;
  editor.hidden = !on;
  timelineEl.hidden = !on;
  if (wpEl) wpEl.hidden = on;
  if (fxEl) fxEl.hidden = on;        // hide the FX panel in Director Mode (no overlap with the editor)
  pathGroup.visible = on;
  controls.enabled = on;
  clearFly();
  if (on) {
    if (freeRoam) setFreeRoam(false);
    freeBtn.hidden = true;
    sel = clamp(index, 0, beats.length - 1);
    controls.rotateSpeed = sens;
    rebuildGizmos();
    dragTarget = { type: 'cam', i: sel };
    reattach();
    refreshEditor();
    jumpToSelected();
  } else {
    transform.detach();
    dragTarget = null;
    index = clamp(sel, 0, lastIdx());
    progress = index / Math.max(1, lastIdx());
    tween = null;
  }
}
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    // still allow Ctrl+Z inside fields
  }
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
  const typing = isTextEntry(e.target);
  if (k === 'e' && !typing) { setEdit(!editMode); }
  if (k === 'v' && !typing) {                    // V = drop into / out of noclip free-fly
    if (editMode) { setEdit(false); setFreeRoam(true); }
    else setFreeRoam(!freeRoam);
  }
  if (editMode && !typing) {
    if (k === 't') setGizmoMode('rotate');      // moved off 'r' (now fly-up)
    else if (k === 'g') setGizmoMode('translate'); // moved off 'w' (now fly-forward)
  }
});

// ---- Resize -----------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Depth-of-field + gentle motion blur (kept subtle to avoid sickness) ----
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bokeh = new BokehPass(scene, camera, { focus: 200, aperture: FX.dofAperture, maxblur: FX.dofBlur });
  composer.addPass(bokeh);
  composer.setSize(window.innerWidth, window.innerHeight);
} catch (e) { composer = null; console.warn('Postprocessing disabled:', e); }

// ---- FX control panel (toggle with B) — live-edits every effect -------------
(() => {
  if (!fxEl) return;
  const f4 = (v) => v.toFixed(4), f3 = (v) => v.toFixed(3), f2 = (v) => v.toFixed(2), f0 = (v) => String(Math.round(v));
  // each row: [id, getter, setter, formatter]
  const rows = [
    ['dofblur', () => (bokeh ? bokeh.uniforms.maxblur.value : FX.dofBlur), (v) => { FX.dofBlur = v; if (bokeh) bokeh.uniforms.maxblur.value = v; }, f4],
    ['dofap', () => (bokeh ? bokeh.uniforms.aperture.value : FX.dofAperture), (v) => { FX.dofAperture = v; if (bokeh) bokeh.uniforms.aperture.value = v; }, f4],
    ['dim', () => FX.panelDimFloor, (v) => { FX.panelDimFloor = v; }, f2],
    ['range', () => FX.panelLightRange, (v) => { FX.panelLightRange = v; }, f0],
    ['colint', () => FX.colorIntensity, (v) => { FX.colorIntensity = v; }, f2],
    ['colreach', () => FX.colorReach, (v) => { FX.colorReach = v; }, f0],
    ['warpstr', () => FX.warpStrength, (v) => { FX.warpStrength = v; }, f2],
    ['warplen', () => FX.warpLength, (v) => { FX.warpLength = v; }, f3],
  ];
  for (const [id, get, set, fmt] of rows) {
    const inp = document.querySelector('#fx-' + id), out = document.querySelector('#fx-' + id + '-v');
    if (!inp) continue;
    inp.value = get();
    if (out) out.textContent = fmt(parseFloat(inp.value));
    inp.addEventListener('input', () => { const v = parseFloat(inp.value); set(v); if (out) out.textContent = fmt(v); });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'b' && !isTextEntry(e.target) && !editMode) fxEl.hidden = !fxEl.hidden;
  });
})();

// ---- Animation loop ---------------------------------------------------------
const clock = new THREE.Clock();
const cp = new THREE.Vector3();
let elapsed = 0;
let thumbTimer = 0;

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05); // seconds since last frame (clamped for tab-switches)
  elapsed += dt;
  const t = elapsed;

  if (editMode || freeRoam) {
    if (!scrubbing) { applyFly(dt); controls.update(); } // scrubbing drives the camera directly
  } else {
    const last = Math.max(1, lastIdx());
    if (tween) {                       // time-based flight between shots
      tween.t += dt;
      const k = clamp(tween.t / tween.dur, 0, 1);
      progress = tween.from + (tween.to - tween.from) * easeInOut(k);
      if (k >= 1) { progress = tween.to; tween = null; }
    }
    const seg = progress * last;
    const i0 = clamp(Math.floor(seg), 0, lastIdx());
    const i1 = clamp(i0 + 1, 0, lastIdx());
    const f = seg - i0;
    pathPoint(progress, cp);           // straight or curved per `smooth`
    const mx = mouse.x * 3, my = mouse.y * 3;
    camera.position.set(cp.x + mx, cp.y - my, cp.z);
    camera.quaternion.copy(beatQuats[i0]).slerp(beatQuats[i1], f);
    // per-shot field-of-view (zoom), interpolated across the segment
    const fa = beats[i0]?.fov ?? DEF_FOV, fb = beats[i1]?.fov ?? DEF_FOV;
    const nf = fa + (fb - fa) * f;
    if (Math.abs(camera.fov - nf) > 0.01) { camera.fov = nf; camera.updateProjectionMatrix(); }
  }

  // keep the editor thumbnails fresh (the starfield drifts) — cheap, throttled
  if (editMode) { thumbTimer += dt; if (thumbTimer > 0.8) { thumbTimer = 0; renderAllThumbs(); } }

  pointField.rotation.y = t * 0.01;
  {                                          // flow data pulses along the network edges
    const { nodes, adj, pulses, pPos, pGeo } = dataNet;
    for (let i = 0; i < pulses.length; i++) {
      const pu = pulses[i];
      pu.p += pu.spd * dt;
      while (pu.p >= 1) {                    // reached a node -> hop onto a connected edge
        pu.p -= 1;
        const nb = adj[pu.b];
        pu.a = pu.b;
        pu.b = nb.length ? nb[(Math.random() * nb.length) | 0] : pu.a;
      }
      const A = nodes[pu.a], B = nodes[pu.b], q = pu.p;
      pPos[i * 3] = A.x + (B.x - A.x) * q;
      pPos[i * 3 + 1] = A.y + (B.y - A.y) * q;
      pPos[i * 3 + 2] = A.z + (B.z - A.z) * q;
    }
    pGeo.attributes.position.needsUpdate = true;
  }
  {                                          // per-chapter color world
    let bi = 0, bd = Infinity;
    for (let i = 0; i < beats.length; i++) {
      const c = beats[i].cam;
      const dx = camera.position.x - c[0], dy = camera.position.y - c[1], dz = camera.position.z - c[2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; bi = i; }
    }
    const s = clamp(1 - Math.sqrt(bd) / FX.colorReach, 0, 1) * FX.colorIntensity;   // 1 at a section, 0 far between
    _chapTarget.set(CHAPTER_COLORS[bi % CHAPTER_COLORS.length]);
    dataNet.lineMat.color.copy(BASE_EDGE).lerp(_chapTarget, s * 0.8);
    dataNet.nMat.color.copy(BASE_NODE).lerp(_chapTarget, s);
    dataNet.pMat.color.copy(BASE_PULSE).lerp(_chapTarget, s);
  }
  {                                          // kinetic caption: reveal on arrival, hide while moving / in editor
    if (editMode || freeRoam) hideCaption();
    else {
      const c = beats[index].cam;
      const dx = camera.position.x - c[0], dy = camera.position.y - c[1], dz = camera.position.z - c[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (!tween && dist < 26 && index !== 0) setCaption(index);   // arrived & parked (skip hero — it has the wordmark)
      else if (tween || dist > 70) hideCaption();
    }
  }

  // panels: billboard to face the camera, and light up as the camera arrives
  for (let i = 0; i < panelMeshes.length; i++) {
    const m = panelMeshes[i];
    if (!m) continue;
    if (beats[i]?.panel?.billboard) m.quaternion.copy(camera.quaternion);
    if (editMode) { m.material.opacity = 1; m.scale.setScalar(1); }
    else {
      const a = clamp(1 - (camera.position.distanceTo(m.position) - 90) / FX.panelLightRange, 0, 1); // near = lit
      m.material.opacity = FX.panelDimFloor + (1 - FX.panelDimFloor) * a;
      m.scale.setScalar(0.92 + 0.08 * a);
    }
  }
  updateWaypoints();

  hudBeat.textContent = editMode ? 'Director mode' : (freeRoam ? 'Free roam' : (beats[index]?.name ?? ''));
  hudProgress.textContent = (editMode ? (sel + 1) : (index + 1)) + ' / ' + beats.length;
  overlay.style.opacity = editMode ? '0' : String(1 - clamp(progress / 0.04, 0, 1));

  // "visit live" button for the section currently in view (play mode only)
  const cur = beats[index];
  if (!editMode && !freeRoam && cur && cur.link) { visitBtn.hidden = false; visitBtn.href = cur.link; }
  else visitBtn.hidden = true;

  if (bokeh && bokeh.uniforms && bokeh.uniforms.focus) {   // keep the focused section sharp
    if (editMode || freeRoam) _focusV.copy(controls.target);
    else _focusV.set(beats[index].look[0], beats[index].look[1], beats[index].look[2]);
    bokeh.uniforms.focus.value = Math.max(1, camera.position.distanceTo(_focusV));
  }
  {                                          // warp streaks — world-anchored, stream along actual camera travel
    const { data, pos, geo, mat, R } = warp;
    if (!_prevCamPos) _prevCamPos = camera.position.clone();
    _vel.copy(camera.position).sub(_prevCamPos);
    const camSpeed = _vel.length() / Math.max(dt, 0.0001);
    _prevCamPos.copy(camera.position);
    if (_vel.lengthSq() > 1e-8) _dir.copy(_vel).normalize();
    const len = clamp(camSpeed * FX.warpLength, 0, 60);  // longer streaks the faster you move
    for (let i = 0; i < data.length; i++) {
      const p = data[i].p;
      if (camera.position.distanceTo(p) > R) p.set(      // recycle points that fall out of range around the camera
        camera.position.x + (Math.random() - 0.5) * R * 1.6,
        camera.position.y + (Math.random() - 0.5) * R * 1.6,
        camera.position.z + (Math.random() - 0.5) * R * 1.6,
      );
      const o = i * 6;
      pos[o] = p.x; pos[o + 1] = p.y; pos[o + 2] = p.z;
      pos[o + 3] = p.x - _dir.x * len; pos[o + 4] = p.y - _dir.y * len; pos[o + 5] = p.z - _dir.z * len;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = editMode ? 0 : clamp((camSpeed - 12) / 120, 0, FX.warpStrength);
  }

  if (composer && !editMode && !freeRoam) composer.render(); else renderer.render(scene, camera); // no blur while editing / free-roaming
  requestAnimationFrame(animate);
}
animate();
initMagneticCursor();

// ---- Intro loader: mono % count → reveal the Ogg wordmark -------------------
(() => {
  const ld = document.querySelector('#loader');
  if (!ld) return;
  const pct = document.querySelector('#ld-pct'), fill = document.querySelector('#ld-fill');
  const overlay = document.querySelector('#overlay');
  const dur = 1900; let t0 = null;
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  function step(ts) {
    if (t0 === null) t0 = ts;
    const p = clamp((ts - t0) / dur, 0, 1), e = ease(p);
    if (pct) pct.textContent = Math.round(e * 100);
    if (fill) fill.style.transform = `scaleX(${e})`;
    if (p < 1) requestAnimationFrame(step);
    else {
      ld.classList.add('done');
      if (overlay) overlay.classList.add('revealed');
      setTimeout(() => { ld.style.display = 'none'; }, 900);
    }
  }
  requestAnimationFrame(step);
})();
