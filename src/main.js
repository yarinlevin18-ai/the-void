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
import { createText3D, defaultText } from './text3d.js';
import { initMagneticCursor } from './cursor.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Only TEXT entry should swallow global hotkeys (E/V/arrows) — not range sliders, checkboxes, etc.
const isTextEntry = (el) => el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'button', 'submit'].includes(el.type));
// Live-tunable effect parameters — the FX panel (press B) edits these in place,
// and the render loop reads them every frame, so every effect is adjustable.
const FX = {
  dofBlur: 0.003, dofAperture: 0.0004,        // depth of field — lighter blur (cheaper fill-rate, gentler)
  starFrac: 1, nodeFrac: 1, lineFrac: 1, nebFrac: 1,   // density of each void layer (0..1) — also affects the published build
  panelDimFloor: 0.1, panelLightRange: 300,   // section panels: idle opacity + light-up falloff
  colorIntensity: 1.0, colorReach: 200,       // per-chapter color world
  warpStrength: 0.16, warpLength: 0.1,        // warp streaks
  bloomStrength: 1.0, nebula: 1.0, driftOn: true, // living-void background
  fovPunch: 0,                                 // transient FOV widening mid-transition (whoosh)
  twinkleOn: true, linesOn: true, nebVisible: true,                           // living-void toggles
  uiHud: true, uiWaypoints: true, uiCaption: true, uiHint: true, uiScale: 1,  // UX panel state
  waveAmp: 26, waveSpd: 1, waveCoil: 34, waveOn: true, waveGrid: false,        // neon wave ribbon
  nebSpd: 0.6, nebWarp: 1.4, nebHue: 0.5, nebEmber: 0.25, nebVig: true, nebGlow: 0.6,   // nebula climate + inner glow
  lightning: true, glowSpots: true,                                            // in-nebula lightning + flickering glow spots
  lightInt: 1, lightReach: 280, lightRate: 3, glowBright: 1, glowFlick: 1, cursorDrive: 1,   // lightning + glow + cursor-reactivity controls
  waterStr: 0.18, waterRad: 0.018, waterAtt: 0.992, waterDisp: 0.22, waterSheen: 1.0,         // water swipe (APPROVED tuning — see water.md)
  openFit: 0.3, openSize: 1.1, openGlow: 0.55, openForm: 2.6, openShatterR: 5, openPush: 1.7, openSpring: 0.028, openColor: '#9fd8ff',   // Frame 1 opening particles (glow 0.55 — 0.7 fused the letterforms)
};
const fxEl = document.querySelector('#fxpanel');
// FX keyframes: these params live PER BEAT (beat.fx) and are interpolated across
// the active camera segment every frame, so e.g. DOF blur can differ section to
// section and blend over the flight. The toggles below stay global.
const KEYED = ['dofBlur', 'dofAperture', 'panelDimFloor', 'panelLightRange', 'colorIntensity', 'colorReach', 'bloomStrength', 'nebula']; // warp is global (a transition effect), edited in the FX/TX panels
const curFX = { ...FX };                       // resolved live values the render loop reads
const beatFX = (i, k) => (beats[i] && beats[i].fx && beats[i].fx[k] != null) ? beats[i].fx[k] : FX[k];
function ensureBeatFX(b) { const src = b.fx || {}; const out = {}; for (const k of KEYED) out[k] = (src[k] != null) ? src[k] : FX[k]; b.fx = out; }
function resolveFX() {
  if (editMode) { const i = clamp(sel, 0, Math.max(0, beats.length - 1)); for (const k of KEYED) curFX[k] = beatFX(i, k); return; }
  const last = Math.max(1, beats.length - 1);
  const seg = clamp(progress, 0, 1) * last;
  const i0 = clamp(Math.floor(seg), 0, last), i1 = clamp(i0 + 1, 0, last), f = seg - i0;
  for (const k of KEYED) { const a = beatFX(i0, k), b = beatFX(i1, k); curFX[k] = a + (b - a) * f; }
}
let fxSync = () => {}, fxMaybeSync = () => {};  // assigned by the FX panel wiring below
// Dev tooling (all panels + Director Mode) is available in `npm run dev`, and on
// a published build ONLY when the URL carries ?edit. The plain published site is
// preview-only — visitors get the flythrough with no editor surface.
const DEV_TOOLS = import.meta.env.DEV || new URLSearchParams(location.search).has('edit');
const UP_NORMAL = [0, 1, 0];
const UP_VERTICAL = [0, 0, -1]; // "look straight up" orientation

// Touch = coarse pointer AND real touch points (excludes touch-capable laptops
// driven by a mouse). LOW_END adds a memory/size gate for the deepest cuts —
// deviceMemory is Chrome-only, so on iOS it falls through to screen size and
// iPhones land in the IS_TOUCH tier only.
const IS_TOUCH = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) && navigator.maxTouchPoints > 0;
const LOW_END = IS_TOUCH && ((navigator.deviceMemory || 8) <= 4 || Math.min(screen.width, screen.height) <= 480);
const DPR_CAP = IS_TOUCH ? 1.25 : 1.5;   // phones pay per-pixel: fill rate is the budget
if (IS_TOUCH) { const _h = document.querySelector('#overlay .hint'); if (_h) _h.textContent = 'swipe to fly'; }

// ---- Renderer / scene / camera --------------------------------------------
const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false }); // composer renders the scene to its own targets — MSAA on the canvas is wasted
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_CAP)); // cap retina: fewer fragments, big fill-rate win
// Shared CSS3D layer — live HTML assets (SmartCut, TEEPO) rendered as real iframes
// positioned in 3D and synced to the camera. Sits above the canvas, below the UI.
let css3d = null;
if (!LOW_END) try {   // low-end phones skip the whole DOM-composited layer (guards exist everywhere css3d is used)
  const cssR = new CSS3DRenderer();
  cssR.setSize(window.innerWidth, window.innerHeight);
  const el = cssR.domElement;
  el.style.position = 'fixed'; el.style.top = '0'; el.style.left = '0';
  el.style.width = '100%'; el.style.height = '100%'; el.style.pointerEvents = 'none'; el.style.zIndex = '1';
  document.body.appendChild(el);
  css3d = { renderer: cssR, scene: new THREE.Scene() };
} catch (e) { console.warn('[css3d] disabled:', e); }
let composer = null, bokeh = null, bloom = null;   // post-FX (set up below)
let network = null;                                // data network (nodes + energy lines) — built after the beats load
let _lastBeatIdx = 0, voidWarp = 0;                // warp burst on chapter change
let _flash = 0, _nextFlash = 2.5;                  // nebula lightning strikes
let _cVel = 0, _cVelRaw = 0, _flickCD = 0, _pPX = null, _pPY = null;   // smoothed cursor velocity
const _cN = new THREE.Vector2(9, 9), _cWorld = new THREE.Vector3();    // pointer NDC + world-ray scratch
const _ray = new THREE.Raycaster();                                   // cursor → section hit-test (liquid cursor)
const _waveTgt = new THREE.Vector3();                                 // wave-ribbon follow target
const _pc = new THREE.Vector3();                                      // panel-corner projection (water rect)
const _wUV = new THREE.Vector2(-9, -9);                               // pointer in 0..1 uv (water sim drop)
const PREFERS_REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
let water = null;                                                     // water swipe system (set up after the composer)
const _focusV = new THREE.Vector3();

// ---- Offscreen renderer that draws each shot's thumbnail in the editor list -
// Editor-only, so visitors (and every phone) skip the second WebGL context.
const THUMB_W = 240, THUMB_H = 150;
let thumbRenderer = null, thumbCam = null;
if (DEV_TOOLS) {
  thumbRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  thumbRenderer.setPixelRatio(1);
  thumbRenderer.setSize(THUMB_W, THUMB_H);
  thumbCam = new THREE.PerspectiveCamera(68, THUMB_W / THUMB_H, 0.1, 5000);
}

const scene = new THREE.Scene();
// dark cinematic world: deep teal-navy background + matching fog for depth
scene.background = new THREE.Color(0x06141c);
scene.fog = new THREE.FogExp2(0x06141c, 0.0016);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 5000);

// The void's points are now the volumetric starfield inside livingVoid (below).

// ---- Living void (per BACKGROUND.md / demo-living-void.html) -----------------
// An animated nebula backdrop + twinkling, drifting shader nodes + form/dissolve
// energy lines whose endpoints follow the moving nodes. All behind the content.
const livingVoid = (() => {
  // 1) Volumetric nebula — a half-res RAYMARCHED 3D gas cloud (from
  //    demo-nebula-volumetric.html, APPROVED). Each pixel marches a world-space ray
  //    through domain-warped 3D noise -> real depth + parallax, the camera flies
  //    THROUGH it. Rendered to a half-res target, composited under the stars.
  const _reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let _res = IS_TOUCH ? 0.4 : 0.5;             // half-res raymarch (the big perf lever; leaner still on phones)
  const nebRT = new THREE.WebGLRenderTarget(2, 2, { magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, depthBuffer: false });
  const sizeRT = () => nebRT.setSize(Math.max(2, (window.innerWidth * _res) | 0), Math.max(2, (window.innerHeight * _res) | 0));
  sizeRT();
  const nebMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uA: { value: window.innerWidth / window.innerHeight }, uSteps: { value: _reduced ? 18 : (LOW_END ? 22 : IS_TOUCH ? 26 : 40) },
      uDens: { value: FX.nebula }, uSpd: { value: FX.nebSpd }, uWarp: { value: FX.nebWarp }, uHue: { value: FX.nebHue }, uEmber: { value: FX.nebEmber }, uGlow: { value: FX.nebGlow }, uNebFrac: { value: FX.nebFrac },
      uCamPos: { value: new THREE.Vector3() }, uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
      uFlash: { value: new THREE.Vector3(0, 0, -300) }, uFlashAmt: { value: 0 }, uFlashCol: { value: new THREE.Color(0x9fd8ff) }, uFlashReach: { value: 0.00002 }, uCrackle: { value: 18 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `precision highp float; varying vec2 vUv;
      uniform vec3 uCamPos; uniform mat4 uInvProj, uCamWorld;
      uniform float uTime,uA,uSteps,uDens,uSpd,uWarp,uHue,uEmber,uGlow,uNebFrac,uFlashAmt,uFlashReach,uCrackle; uniform vec3 uFlash,uFlashCol;
      float hash(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 x){ vec3 i=floor(x),f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*noise(p); p=p*2.03+vec3(1.7,9.2,4.3); a*=0.5; } return s; }
      float density(vec3 P){ vec3 q=P*0.004+vec3(0.0,uTime*0.02*uSpd,uTime*0.012*uSpd);
        vec3 w=vec3(fbm(q+1.3),fbm(q+5.1),fbm(q+9.2)); float f=fbm(q+uWarp*w);
        return smoothstep(0.64-uDens*0.26,0.96,f); }   // sparser -> more open sky between the clouds
      void main(){
        vec4 clip=vec4(vUv*2.0-1.0,-1.0,1.0); vec4 vh=uInvProj*clip; vec3 viewDir=normalize(vh.xyz/vh.w);
        vec3 rd=normalize(mat3(uCamWorld)*viewDir); vec3 ro=uCamPos;
        float tStart=60.0,tEnd=1700.0; int STEPS=int(uSteps); float stepLen=(tEnd-tStart)/uSteps;
        float t=tStart+hash(vec3(gl_FragCoord.xy,fract(uTime)))*stepLen;
        vec3 teal=vec3(0.05,0.17,0.24),viol=vec3(0.12,0.06,0.22),ember=vec3(0.22,0.09,0.03);
        vec3 climate=mix(teal,viol,clamp(uHue+0.25*sin(uTime*0.05),0.0,1.0));
        vec3 acc=vec3(0.0); float alpha=0.0;
        for(int i=0;i<64;i++){ if(i>=STEPS||alpha>0.97) break;
          vec3 p=ro+rd*t; float d=density(p);
          if(d>0.01){ float fade=smoothstep(tEnd,tStart,t);
            vec3 emit=climate*(0.7+d*0.9)+ember*smoothstep(0.5,1.0,d)*uEmber*2.5;  // dim haze stays under bloom (0.22); only dense cores bloom
            emit+=mix(climate,vec3(0.7,0.85,1.0),smoothstep(0.7,1.0,d))*smoothstep(0.5,1.0,d)*uGlow*1.6;  // inner glow: dense gas glows (cyan->white cores, blooms)
            vec3 fp=p-uFlash; float gd=exp(-dot(fp,fp)*uFlashReach);                       // glow that follows the cursor
            float fil=pow(noise(p*0.06+uTime*4.0),3.0);                                     // filamentary arc veins (electric branches)
            float crk=0.35+0.65*pow(0.5+0.5*sin(uTime*uCrackle+p.x*0.05+p.y*0.07),5.0);     // fast electric crackle
            emit+=uFlashCol*uFlashAmt*gd*(0.3+1.6*fil)*crk;                                  // electrifies the gas along the cursor
            float a=clamp(d*(stepLen*0.0042)*(0.6+uDens*0.5)*fade,0.0,1.0);   // thinner accumulation -> translucent, the star sky shows through
            acc+=emit*a*(1.0-alpha); alpha+=a*(1.0-alpha); }
          t+=stepLen; }
        vec3 col=vec3(0.012,0.020,0.030)+acc*uNebFrac;   // Clouds slider = smooth density fade
        col*=1.0-0.5*smoothstep(0.3,1.0,distance(vUv,vec2(0.5)));
        col+=(hash(vec3(gl_FragCoord.xy,1.0))-0.5)/255.0;
        gl_FragColor=vec4(col,1.0); }`,
  });
  const fsCam = new THREE.Camera();
  const fsScene = new THREE.Scene();
  fsScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), nebMat));
  // composite the raymarched volume into the main scene as the backdrop (upscaled)
  const composite = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, uniforms: { uTex: { value: nebRT.texture } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform sampler2D uTex; void main(){ gl_FragColor = texture2D(uTex, vUv); }`,
  }));
  composite.frustumCulled = false; composite.renderOrder = -20;
  scene.add(composite);

  // 2) Volumetric starfield — a 3D VOLUME you fly through (ported 1:1 from
  //    demo-nebula.html). Streamed toward the camera and wrapped endlessly in the
  //    vertex shader; depth-driven size + fade; per-star magnitude spread + colour
  //    temperature; sharp core + halo + a 4-point spike on the brightest; twinkle.
  const STAR_N = 1500, DEPTH = 1800;
  const spos = new Float32Array(STAR_N * 3), sseed = new Float32Array(STAR_N), smag = new Float32Array(STAR_N), stmp = new Float32Array(STAR_N);
  for (let i = 0; i < STAR_N; i++) {
    spos[i * 3] = (Math.random() * 2 - 1) * 1200; spos[i * 3 + 1] = (Math.random() * 2 - 1) * 760; spos[i * 3 + 2] = -Math.random() * DEPTH;
    sseed[i] = Math.random() * 6.28;
    smag[i] = Math.pow(Math.random(), 3.2);                 // mostly faint, a rare few bright
    stmp[i] = 0.45 + Math.random() * 0.55 - Math.random() * 0.18;  // warm..white..cool
  }
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  sgeo.setAttribute('seed', new THREE.BufferAttribute(sseed, 1));
  sgeo.setAttribute('mag', new THREE.BufferAttribute(smag, 1));
  sgeo.setAttribute('tmp', new THREE.BufferAttribute(stmp, 1));
  const smat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDepth: { value: DEPTH }, uSpeed: { value: 26.0 }, uPtN: { value: new THREE.Vector2(9, 9) }, uVel: { value: 0 }, uStar: { value: 1 }, uTwinkle: { value: 1 }, uWarp: { value: 0 }, uTint: { value: new THREE.Color(0x4fd2ff) }, uTintAmt: { value: 0 } },
    vertexShader: `attribute float seed; attribute float mag; attribute float tmp;
      varying float vT; varying float vMag; varying float vTmp; varying float vFade;
      uniform float uTime,uDepth,uSpeed,uVel,uStar,uTwinkle,uWarp; uniform vec2 uPtN;
      void main(){
        float rate=0.5+seed*0.25;
        float tw=0.7+0.3*sin(uTime*rate+seed)*(1.0-mag*0.7);
        vT=mix(0.85, tw, uTwinkle);
        vMag=mag; vTmp=tmp;
        float z=mod(position.z+uTime*uSpeed, uDepth)-uDepth;
        vec4 mv=modelViewMatrix*vec4(position.x,position.y,z,1.0);
        float depth=-mv.z;
        vFade=smoothstep(uDepth*1.05+360.0,uDepth*0.45,depth);
        vec4 clip=projectionMatrix*mv;
        vec2 ndc=clip.xy/clip.w; vec2 toP=ndc-uPtN; float pd=length(toP);
        float near=smoothstep(0.45,0.0,pd);
        vT*=1.0+near*2.2*uStar;
        clip.xy+=normalize(toP+1e-4)*near*(0.015+uVel*0.10)*uStar*clip.w;
        gl_PointSize=(1.0+mag*7.0)*(520.0/depth)*(1.0+near*0.8*uStar)*(1.0+uWarp*1.2);
        gl_Position=clip;}`,
    fragmentShader: `varying float vT; varying float vMag; varying float vTmp; varying float vFade;
      uniform vec3 uTint; uniform float uTintAmt;
      void main(){
        vec2 c=gl_PointCoord-0.5; float r=length(c);
        float core=1.0-smoothstep(0.0,0.18,r);
        float halo=(1.0-smoothstep(0.0,0.5,r))*0.55;
        float spike=max(1.0-abs(c.x)*22.0,0.0)*(1.0-smoothstep(0.0,0.5,abs(c.y)))
                   +max(1.0-abs(c.y)*22.0,0.0)*(1.0-smoothstep(0.0,0.5,abs(c.x)));
        spike*=smoothstep(0.55,1.0,vMag)*0.6;
        float i=(core+halo+spike)*vT*vFade;
        vec3 warm=vec3(1.0,0.78,0.55), cool=vec3(0.62,0.80,1.0);
        vec3 col=mix(warm,cool,smoothstep(0.0,1.0,vTmp));
        col=mix(col,vec3(1.0),core*0.6);
        col=mix(col,uTint,uTintAmt);                        // per-chapter recolor
        gl_FragColor=vec4(col*i,i);}`,
  });
  const stars = new THREE.Points(sgeo, smat);
  stars.renderOrder = -8; stars.frustumCulled = false;
  scene.add(stars);

  // 3) Glow spots — small bright energy nodes that FLICKER inside the nebula volume.
  const SPOT_N = IS_TOUCH ? 36 : 70;
  const sp = new Float32Array(SPOT_N * 3), spS = new Float32Array(SPOT_N), spZ = new Float32Array(SPOT_N), spC = new Float32Array(SPOT_N * 3);
  const _cc = new THREE.Color();
  for (let i = 0; i < SPOT_N; i++) {
    sp[i * 3] = (Math.random() - 0.5) * 900; sp[i * 3 + 1] = (Math.random() - 0.5) * 480 + 70; sp[i * 3 + 2] = 160 - Math.random() * 1100;
    spS[i] = Math.random() * 6.28; spZ[i] = 18 + Math.random() * 40;
    if (Math.random() < 0.18) _cc.set(0xff8a4d); else _cc.setHSL(0.52 + Math.random() * 0.08, 0.7, 0.7);  // mostly cyan, some ember
    spC[i * 3] = _cc.r; spC[i * 3 + 1] = _cc.g; spC[i * 3 + 2] = _cc.b;
  }
  const spgeo = new THREE.BufferGeometry();
  spgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  spgeo.setAttribute('spSeed', new THREE.BufferAttribute(spS, 1));
  spgeo.setAttribute('spSize', new THREE.BufferAttribute(spZ, 1));
  spgeo.setAttribute('spCol', new THREE.BufferAttribute(spC, 3));
  const spotMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPtN: { value: new THREE.Vector2(9, 9) }, uVel: { value: 0 }, uDrive: { value: 1 }, uBright: { value: 1 }, uFlick: { value: 1 } },
    vertexShader: `attribute float spSeed; attribute float spSize; attribute vec3 spCol;
      uniform float uTime,uVel,uDrive,uBright,uFlick; uniform vec2 uPtN; varying vec3 vC; varying float vF;
      void main(){ vC=spCol;
        float rate=(1.5+spSeed)*uFlick; float fl=0.25+0.75*pow(0.5+0.5*sin(uTime*rate+spSeed),6.0);  // sharp flicker
        vec4 mv=modelViewMatrix*vec4(position,1.0); vec4 clip=projectionMatrix*mv;
        vec2 ndc=clip.xy/clip.w; float near=smoothstep(0.5,0.0,length(ndc-uPtN));
        fl*=1.0+near*(0.7+uVel*1.1)*uDrive;                 // cursor proximity + speed brighten the flicker (kept gentle — no cursor lamp)
        vF=fl*uBright;
        gl_PointSize=spSize*fl*(360.0/max(1.0,-mv.z)); gl_Position=clip; }`,
    fragmentShader: `varying vec3 vC; varying float vF;
      void main(){ float d=length(gl_PointCoord-0.5); if(d>0.5)discard;
        float core=1.0-smoothstep(0.0,0.22,d), halo=(1.0-smoothstep(0.0,0.5,d))*0.5;
        float i=(core+halo)*vF; gl_FragColor=vec4(vC*i,i); }`,
  });
  const spots = new THREE.Points(spgeo, spotMat);
  spots.renderOrder = -7; spots.frustumCulled = false;
  scene.add(spots);

  function update(time) {
    nebMat.uniforms.uTime.value = time;
    smat.uniforms.uTime.value = time;
    spotMat.uniforms.uTime.value = time;
  }
  const setTint = (hex, amt) => { smat.uniforms.uTint.value.set(hex); smat.uniforms.uTintAmt.value = amt; };
  const setWarp = (v) => { smat.uniforms.uWarp.value = v; };           // stars swell on a chapter warp burst
  return { composite, nebMat, nebRT, fsScene, fsCam, sizeRT, smat, sgeo, STAR_N, spots, update, setTint, setWarp };
})();

// ---- Neon wave ribbon (ported 1:1 from demo-wave-ribbon.APPROVED.html) -------
// A contained chrome / liquid-glass band: traveling-sine displacement with an
// analytic normal (fresnel rim + thin-film iridescence + sweeping glint), drifting
// in a bounded Lissajous path around one section. Optional crisp neon grid.
const waveRibbon = (() => {
  const uniforms = { uTime: { value: 0 }, uAmp: { value: FX.waveAmp }, uSpd: { value: FX.waveSpd }, uCoil: { value: FX.waveCoil } };
  const VERT = `uniform float uTime,uAmp,uSpd,uCoil;varying float vH;varying vec2 vUv;varying vec3 vN;varying vec3 vVP;
    void main(){vUv=uv;vec3 p=position;float t=uTime*uSpd;
      float w=sin(p.x*0.018+t*1.8)*uAmp + sin(p.x*0.05-t*1.3)*uAmp*0.45 + sin(p.y*0.06+t)*5.0;
      float wx=cos(p.x*0.018+t*1.8)*uAmp*0.018 + cos(p.x*0.05-t*1.3)*uAmp*0.45*0.05;
      float wy=cos(p.y*0.06+t)*5.0*0.06;
      float cx=cos(p.x*0.012+t*0.9)*uCoil*0.012;
      p.z+=w;
      p.y+=sin(p.x*0.012+t*0.9)*uCoil;
      vH=w;
      vec3 nrm=normalize(cross(vec3(1.0,cx,wx),vec3(0.0,1.0,wy)));
      vN=normalize(normalMatrix*nrm);
      vec4 mv=modelViewMatrix*vec4(p,1.0); vVP=mv.xyz;
      gl_Position=projectionMatrix*mv;}`;
  const FRAG = `uniform float uTime;varying float vH;varying vec2 vUv;
    void main(){
      vec3 cy=vec3(0.28,0.92,1.0), vi=vec3(0.55,0.40,1.0), mg=vec3(0.92,0.40,0.85);
      float m=fract(vUv.x*1.3 - uTime*0.45);
      vec3 col = m<0.5 ? mix(cy,vi,m*2.0) : mix(vi,mg,(m-0.5)*2.0);
      float crest=smoothstep(0.3,1.0,vH/34.0); col+=crest*0.45;
      float edge=smoothstep(0.0,0.18,vUv.y)*smoothstep(1.0,0.82,vUv.y);
      float ends=smoothstep(0.0,0.16,vUv.x)*smoothstep(1.0,0.84,vUv.x);
      gl_FragColor=vec4(col, 0.5*edge*ends);}`;
  const FILL_FRAG = `uniform float uTime;varying float vH;varying vec2 vUv;varying vec3 vN;varying vec3 vVP;
    void main(){
      vec3 n=normalize(vN), v=normalize(-vVP);
      float fres=pow(1.0-max(dot(n,v),0.0),2.4);
      float hue=fres*0.8 + vUv.x*0.5 + vH*0.012 + uTime*0.04;
      vec3 irid=0.5+0.5*cos(6.28318*(hue+vec3(0.0,0.35,0.62))); irid.r*=0.85;
      float streak=fract(vUv.x*1.2 - uTime*0.12);
      float spec=smoothstep(0.05,0.0,abs(streak-0.5))*0.9;
      vec3 chrome=vec3(0.09,0.15,0.23);
      vec3 col=mix(chrome,irid,0.7)+fres*vec3(0.5,0.7,1.0)*0.6+spec;
      float edge=smoothstep(0.0,0.16,vUv.y)*smoothstep(1.0,0.84,vUv.y);
      float ends=smoothstep(0.0,0.16,vUv.x)*smoothstep(1.0,0.84,vUv.x);
      float a=(0.42+fres*0.5+spec)*edge*ends;
      gl_FragColor=vec4(col,a);}`;
  const rgeo = new THREE.PlaneGeometry(620, 80, 240, 14);
  const fillMat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FILL_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide });
  const lineMat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, wireframe: true });
  const group = new THREE.Group();
  const fill = new THREE.Mesh(rgeo, fillMat), grid = new THREE.Mesh(rgeo, lineMat);
  grid.visible = false;
  group.add(fill, grid);
  group.scale.setScalar(0.2);                                  // fit the 620-wide band to a section's scale
  group.userData.anchor = new THREE.Vector3(0, 0, -120);       // placeholder; real anchor set once beats load
  group.position.copy(group.userData.anchor);
  scene.add(group);
  return { uniforms, group, fill, grid };
})();

// ---- Falling stars (shooting-star streaks) — view-space, gated to one frame -----
const meteors = (() => {
  const M = 8;
  const pos = new Float32Array(M * 6), col = new Float32Array(M * 6);
  const data = [];
  for (let i = 0; i < M; i++) data.push({ on: false, next: Math.random() * 5, life: 0, dur: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0 });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
  obj.frustumCulled = false; obj.renderOrder = -7; obj.visible = false;
  scene.add(obj);
  function update(dt, active) {
    obj.visible = active;
    if (!active) return;
    for (let i = 0; i < M; i++) {
      const m = data[i], o = i * 6;
      if (!m.on) {
        m.next -= dt;
        if (m.next <= 0) {                                   // launch a new streak
          m.on = true; m.life = 0; m.dur = 0.55 + Math.random() * 0.6;
          m.x = (Math.random() * 2 - 1) * 350; m.y = 90 + Math.random() * 200; m.z = -260 - Math.random() * 320;
          const sp = 320 + Math.random() * 260; m.vx = -sp * (0.5 + Math.random() * 0.4); m.vy = -sp;  // streak down-left
        }
      }
      if (m.on) {
        m.life += dt; m.x += m.vx * dt; m.y += m.vy * dt;
        const fade = Math.max(0, 1 - m.life / m.dur);
        pos[o] = m.x; pos[o + 1] = m.y; pos[o + 2] = m.z;
        pos[o + 3] = m.x - m.vx * 0.11; pos[o + 4] = m.y - m.vy * 0.11; pos[o + 5] = m.z;   // trailing tail
        col[o] = 0.85 * fade; col[o + 1] = 0.92 * fade; col[o + 2] = fade;                   // bright head
        col[o + 3] = 0; col[o + 4] = 0; col[o + 5] = 0;                                       // faded tail
        if (m.life >= m.dur) { m.on = false; m.next = 0.8 + Math.random() * 5; }
      } else { for (let k = 0; k < 6; k++) { pos[o + k] = 0; col[o + k] = 0; } }
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    obj.position.copy(camera.position); obj.quaternion.copy(camera.quaternion);   // ride the view (sky overlay)
  }
  return { update };
})();

// ---- FRAME 2: HERO — DOM statement (the calm anchor) + TWO real project screens
//  in frosted-glass frames, grouped under one cluster: Shadiez (PNG plane) and
//  SmartCut (LIVE HTML via CSS3D iframe, synced to the camera). LAYOUT ONLY for now —
//  placed statically; entrance/idle/parallax + adaptive recolor come in the next pass.
const heroCluster = (() => {
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  function styleVec(s) {                               // entrance/exit offset [dx, dy, dz, scaleFrom]
    switch (s) {
      case 'rise': return [0, -22, 0, 1];
      case 'fall': return [0, 22, 0, 1];
      case 'slideL': return [-34, 0, 0, 1];
      case 'slideR': return [34, 0, 0, 1];
      case 'depth': return [0, 0, -18, 1];
      case 'scale': return [0, 0, 0, 0.5];
      default: return [0, 0, 0, 1];                    // fade
    }
  }
  const RMVEC = [0, 0, 0, 1], WORLD_W = 26;            // target screen world width at scale 1
  const cards = [];
  function addScreen(spec) {                           // each screen = a DOM container (content + liquid-glass pane + caption) on the CSS3D layer
    let el = null, obj = null;
    if (css3d) try {
      el = document.createElement('div'); el.className = 'hero-screen'; el.style.width = spec.fw + 'px';
      const src = import.meta.env.BASE_URL + spec.src;
      const inner = spec.kind === 'iframe'
        ? `<div class="inner" style="width:${spec.fw}px;height:${spec.fh}px"><iframe src="${src}" scrolling="no" style="width:${spec.iw}px;height:${spec.ih}px;transform:scale(${(spec.fw / spec.iw).toFixed(3)});transform-origin:top left"></iframe></div>`
        : `<div class="inner" style="width:${spec.fw}px"><img src="${src}" alt="${spec.id}"/></div>`;
      el.innerHTML = `<div class="frame">${inner}<div class="dim"></div><div class="glass"></div></div><div class="cap">${spec.cap}</div>`;
      obj = new CSS3DObject(el); obj.visible = false; css3d.scene.add(obj);
    } catch (e) { console.warn('[hero screen]', spec.id, e); }
    cards.push({ id: spec.id, el, obj, dim: el ? el.querySelector('.dim') : null, baseScale: WORLD_W / spec.fw, enter: spec.enter || 0, liss: spec.liss, tilt: spec.tilt, focus: spec.focus0 || 0, _f: -1, _o: -1 });
  }
  // fw = native CSS resolution (rendered big, scaled DOWN in 3D → crisp, not upscaled-blurry); iframe at 1:1 native.
  addScreen({ id: 'card_shadiez',  kind: 'img',    src: 'assets/hero/shadiez-landing.jpg', fw: 920, cap: 'Shadiez · Landing Page', enter: 0, tilt: 1, focus0: 1, liss: { ax: 1.2, ay: 0.8, sp: 0.4, ph: 0 } });
  // 3D-transformed LIVE iframes blank/jank on iOS Safari — desktop only.
  // TODO: capture assets/hero/smartcut-crm.png and re-add as kind:'img' for touch.
  if (!IS_TOUCH) addScreen({ id: 'card_smartcut', kind: 'iframe', src: 'assets/hero/smartcut-crm.html', fw: 800, fh: 513, iw: 800, ih: 513, cap: 'SmartCut · Booking CRM', enter: 0.12, tilt: -1, focus0: 0, liss: { ax: 1.5, ay: 1.0, sp: 0.36, ph: 1.7 } });
  // --- anchor the cluster in the Hero beat's camera frame ---
  const C = new THREE.Vector3(), ff = new THREE.Vector3(), rt = new THREE.Vector3(), uu = new THREE.Vector3(), zc = new THREE.Vector3();
  const baseQ = new THREE.Quaternion(), basis = new THREE.Matrix4();
  const eul = new THREE.Euler(), pQ = new THREE.Quaternion(), _lp = new THREE.Vector3(), _eul = new THREE.Euler(), _tq = new THREE.Quaternion();
  let placed = false, op = 0, focusIdx = 0, focusT = 0, _pt = 0;
  function place(b) {
    if (!b || !b.cam || !b.look) return;
    C.set(b.cam[0], b.cam[1], b.cam[2]);
    ff.set(b.look[0] - C.x, b.look[1] - C.y, b.look[2] - C.z).normalize();
    uu.set(b.up?.[0] ?? 0, b.up?.[1] ?? 1, b.up?.[2] ?? 0);
    rt.copy(ff).cross(uu).normalize(); uu.copy(rt).cross(ff).normalize();
    zc.copy(rt).cross(uu); basis.makeBasis(rt, uu, zc); baseQ.setFromRotationMatrix(basis);
    placed = true;
  }
  function update(active, t, b, scroll) {              // entrance/idle/parallax + focus rule + liquid-glass wetness
    const dt = _pt ? Math.min(t - _pt, 0.05) : 0; _pt = t;
    op += ((active ? 1 : 0) - op) * 0.06;
    const vis = op > 0.004;
    group.visible = vis;
    for (const cd of cards) if (cd.obj) cd.obj.visible = vis;
    if (!vis) return;
    if (active && !placed) place(b);
    if (!placed) return;
    const RM = PREFERS_REDUCED;
    if (active && !RM) { focusT += dt; if (focusT > 4.5) { focusT = 0; focusIdx = (focusIdx + 1) % cards.length; } }   // focus auto-cycles
    const px = RM ? 0 : mouse.x, py = RM ? 0 : mouse.y, sc = RM ? 0 : (scroll || 0);
    eul.set(py * 0.05 + sc * 0.05, -px * 0.06, 0, 'XYZ'); pQ.setFromEuler(eul);
    group.position.copy(C).addScaledVector(rt, px * 2.5).addScaledVector(uu, -py * 1.8);   // whole-cluster parallax
    group.quaternion.copy(baseQ).multiply(pQ);
    group.updateMatrixWorld(true);
    for (let i = 0; i < cards.length; i++) {
      const cd = cards[i]; if (!cd.obj) continue;
      const cfg = assetCfg[cd.id] || {};
      cd.focus += (((i === focusIdx) ? 1 : 0) - cd.focus) * (RM ? 1 : 0.05);   // one screen awake at a time
      const fo = cd.focus;
      const ce = Math.max(0, Math.min(1, (op - cd.enter) / (1 - cd.enter))), e = RM ? op : ce * ce * (3 - 2 * ce);
      const sv = RM ? RMVEC : styleVec(active ? (cfg.ein || 'fade') : (cfg.eout || 'fade'));
      const dx = RM ? 0 : Math.sin(t * cd.liss.sp + cd.liss.ph) * cd.liss.ax, dy = RM ? 0 : Math.cos(t * cd.liss.sp * 0.8 + cd.liss.ph) * cd.liss.ay;
      const zf = (cfg.z ?? -56) + (RM ? 0 : (-10 + fo * 18));   // focused screen pulls forward, unfocused pushes back
      const xSq = Math.min(1, camera.aspect / 1.5);              // narrow (portrait) FOV: pull the raked screens toward center so they stay on-canvas
      _lp.set((cfg.x ?? 0) * xSq + dx + (1 - e) * sv[0], (cfg.y ?? 0) + dy + (1 - e) * sv[1], zf + (1 - e) * sv[2]).applyMatrix4(group.matrixWorld);
      cd.obj.position.copy(_lp);
      const ry = RM ? 0 : THREE.MathUtils.degToRad((15 - fo * 9) * cd.tilt), rx = RM ? 0 : THREE.MathUtils.degToRad(5 - fo * 3);   // raked → face-on on focus
      _eul.set(rx, ry, 0, 'XYZ'); _tq.setFromEuler(_eul); cd.obj.quaternion.copy(group.quaternion).multiply(_tq);
      cd.obj.scale.setScalar(cd.baseScale * (cfg.scale || 1) * (0.92 + fo * 0.14) * (sv[3] + (1 - sv[3]) * e));
      const blur = cfg.blur || 0;
      const dimv = Math.round((1 - fo) * 50) / 100;    // 0..0.5 dark overlay (cheap — no filter re-raster of the live iframe)
      if (cd.dim && dimv !== cd._f) { cd.dim.style.opacity = String(dimv); cd._f = dimv; }
      if (blur > 0.05) cd.el.style.filter = `blur(${blur.toFixed(1)}px)`; else if (cd.el.style.filter) cd.el.style.filter = '';
      const ev = Math.round(e * 100) / 100;
      if (ev !== cd._o) { cd.el.style.opacity = String(ev); cd._o = ev; }   // only write on change → no needless re-composite
      cd.el.classList.toggle('wet', fo > 0.5);
    }
  }
  return { update };
})();

// ---- FRAME 1: OPENING — "Yarin Levin" formed from ~5k additive void particles
//  (ported 1:1 from demo-opening.html): scatter→glyphs form-in, cursor-shatter idle,
//  burst-exit on leave that hands into the flight. Glow is free — additive points + the
//  existing UnrealBloom (threshold ~0.22). A dedicated Points set (the streaming
//  starfield can't hold glyph positions); visually it reads as the void's own matter.
const openingFX = (() => {
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const GLYPH = 0.17;                                  // glyph px → local (rebuild-fixed; live params read from FX)
  let built = false, N = 0, posA, startA, targ, vel, geo, mat, pts;
  function buildText() {
    try {
      const c = document.createElement('canvas'), W = 1100, H = 320; c.width = W; c.height = H;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '600 190px "ogg", Georgia, serif'; x.fillText('Yarin Levin', W / 2, H / 2 + 6);
      const d = x.getImageData(0, 0, W, H).data, raw = [];
      for (let y = 0; y < H; y += 4) for (let xx = 0; xx < W; xx += 4) if (d[(y * W + xx) * 4 + 3] > 130) raw.push([(xx - W / 2) * GLYPH, -(y - H / 2) * GLYPH, (Math.random() - 0.5) * 6]);
      for (let i = raw.length - 1; i > 0; i--) { const j = Math.random() * i | 0;[raw[i], raw[j]] = [raw[j], raw[i]]; }
      N = Math.min(raw.length, IS_TOUCH ? 3100 : 5200); raw.length = N;   // glyph shuffle above keeps coverage even at the lower cap
      posA = new Float32Array(N * 3); startA = new Float32Array(N * 3); targ = new Float32Array(N * 3); vel = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        targ[i * 3] = raw[i][0]; targ[i * 3 + 1] = raw[i][1]; targ[i * 3 + 2] = raw[i][2];
        const a = Math.random() * 6.28, r = 120 + Math.random() * 240;   // start scattered in a wide void cloud
        startA[i * 3] = Math.cos(a) * r; startA[i * 3 + 1] = (Math.random() - 0.5) * 260; startA[i * 3 + 2] = -160 - Math.random() * 260;
        posA[i * 3] = startA[i * 3]; posA[i * 3 + 1] = startA[i * 3 + 1]; posA[i * 3 + 2] = startA[i * 3 + 2];
      }
      geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(posA, 3));
      mat = new THREE.PointsMaterial({ size: FX.openSize, color: new THREE.Color(FX.openColor), transparent: true, opacity: FX.openGlow, blending: THREE.AdditiveBlending, depthWrite: false });
      pts = new THREE.Points(geo, mat); pts.frustumCulled = false; group.add(pts);
      group.scale.setScalar(FX.openFit); built = true;
    } catch (e) { console.warn('[opening] build failed', e); }
  }
  if (document.fonts && document.fonts.load) document.fonts.load('600 190px "ogg"').catch(() => {}).finally(buildText); else buildText();
  // anchor the name in the Opening beat's camera frame (at the look point, facing the camera)
  const C = new THREE.Vector3(), ff = new THREE.Vector3(), rt = new THREE.Vector3(), uu = new THREE.Vector3(), zc = new THREE.Vector3(), basis = new THREE.Matrix4();
  function place() {
    const b = beats[0]; if (!b || !b.cam || !b.look) return;
    C.set(b.cam[0], b.cam[1], b.cam[2]);
    ff.set(b.look[0] - C.x, b.look[1] - C.y, b.look[2] - C.z); const dist = ff.length() || 1; ff.normalize();
    uu.set(b.up?.[0] ?? 0, b.up?.[1] ?? 1, b.up?.[2] ?? 0);
    rt.copy(ff).cross(uu).normalize(); uu.copy(rt).cross(ff).normalize();
    zc.copy(rt).cross(uu); basis.makeBasis(rt, uu, zc); group.quaternion.setFromRotationMatrix(basis);
    group.position.copy(C).addScaledVector(ff, dist);
  }
  const whisper = document.querySelector('#whisper'), overlaySub = document.querySelector('#overlay .sub');
  let _typed = false;
  function typeWhisper() {
    if (!whisper || _typed) return; _typed = true;
    const LINE = 'welcome to my world.', body = LINE.slice(0, -1); let i = 0; whisper.style.opacity = '1';
    (function tw() { whisper.textContent = LINE.slice(0, i); i++; if (i <= LINE.length) setTimeout(tw, 42); else whisper.innerHTML = body + '<span class="dot">.</span>'; })();
  }
  function clearWhisper() { if (whisper) { whisper.style.opacity = '0'; whisper.innerHTML = ''; } _typed = false; }
  let phase = 'off', t0 = 0, exitT0 = 0;
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  function update(active, t) {
    if (!built) return;
    if (active && phase === 'off') { place(); for (let i = 0; i < N * 3; i++) { posA[i] = startA[i]; vel[i] = 0; } phase = 'form'; t0 = t; clearWhisper(); }
    if (!active && (phase === 'form' || phase === 'idle')) { phase = 'exit'; exitT0 = t; clearWhisper(); }
    group.visible = phase !== 'off';
    if (overlaySub) overlaySub.style.display = phase !== 'off' ? 'none' : '';   // the whisper replaces the tagline on the Opening
    if (mat) { mat.size = FX.openSize || 1.1; mat.color.set(FX.openColor || '#9fd8ff'); mat.opacity = FX.openGlow ?? 0.7; }   // live FX
    group.scale.setScalar(FX.openFit || 0.3);
    if (phase === 'off') return;
    const RM = PREFERS_REDUCED;
    if (phase === 'form') {
      const k = RM ? 1 : Math.min((t - t0) / (FX.openForm || 2.6), 1), e = ease(k);
      for (let i = 0; i < N * 3; i++) posA[i] = startA[i] + (targ[i] - startA[i]) * e;
      if (k >= 1) { phase = 'idle'; typeWhisper(); }
    } else if (phase === 'exit') {
      const ek = (t - exitT0) / 1.5;
      if (!RM) for (let i = 0; i < N; i++) { const ix = i * 3;
        vel[ix] += posA[ix] * 0.006; vel[ix + 1] += posA[ix + 1] * 0.006; vel[ix + 2] += 1.5 + Math.random() * 0.7;
        vel[ix] *= 0.985; vel[ix + 1] *= 0.985; vel[ix + 2] *= 0.99;
        posA[ix] += vel[ix]; posA[ix + 1] += vel[ix + 1]; posA[ix + 2] += vel[ix + 2]; }
      if (mat) mat.opacity = Math.max(0, (FX.openGlow ?? 0.7) * (1 - ek));
      if (ek >= 1) { phase = 'off'; group.visible = false; }
    } else {                                            // idle: spring home + cursor shatter
      const dist = camera.position.distanceTo(group.position);
      const halfH = Math.tan((camera.fov * Math.PI / 180) / 2) * dist, halfW = halfH * camera.aspect;
      const F = FX.openFit || 0.3;
      const mwx = RM ? 1e6 : (_cN.x * halfW) / F, mwy = RM ? 1e6 : (_cN.y * halfH) / F;
      const R = FX.openShatterR || 5, R2 = R * R, push = FX.openPush ?? 1.7, spring = FX.openSpring || 0.028, damp = 0.9;
      for (let i = 0; i < N; i++) { const ix = i * 3;
        vel[ix] += (targ[ix] - posA[ix]) * spring; vel[ix + 1] += (targ[ix + 1] - posA[ix + 1]) * spring; vel[ix + 2] += (targ[ix + 2] - posA[ix + 2]) * spring;
        if (!RM) { const ex = posA[ix] - mwx, ey = posA[ix + 1] - mwy, d2 = ex * ex + ey * ey;
          if (d2 < R2 && d2 > 0.01) { const dd = Math.sqrt(d2), f = (1 - dd / R) * push; vel[ix] += ex / dd * f; vel[ix + 1] += ey / dd * f; vel[ix + 2] += (Math.random() - 0.5) * f * 0.2; } }
        vel[ix] *= damp; vel[ix + 1] *= damp; vel[ix + 2] *= damp;
        posA[ix] += vel[ix]; posA[ix + 1] += vel[ix + 1]; posA[ix + 2] += vel[ix + 2]; }
    }
    if (geo) geo.attributes.position.needsUpdate = true;
  }
  return { update };
})();

// ---- Placeable extruded 3D text (Ogg) ---------------------------------------
// Lights are added only for the standard-material text — the particle shaders
// ignore them. Emissive + bloom make the letters glow; the directional light
// catches the bevels/extrusion so they read as solid 3D.
scene.add(new THREE.AmbientLight(0x4a5a6a, 0.85));
const _textKey = new THREE.DirectionalLight(0xbfe6ff, 1.4); _textKey.position.set(40, 80, 120); scene.add(_textKey);   // key light for glass clearcoat glints
// Cool gradient environment so the liquid-glass 3D text has the void to reflect (only Standard/Physical materials use it — panels/nebula are unaffected).
try {
  const c = document.createElement('canvas'); c.width = 16; c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#0c2734'); g.addColorStop(0.5, '#06121c'); g.addColorStop(1, '#020406');
  x.fillStyle = g; x.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(tex).texture; tex.dispose(); pm.dispose();
} catch (e) { console.warn('[glass env] skipped:', e); }   // never let env setup take down the page
const text3d = createText3D();
scene.add(text3d.group);
text3d.restore();                 // re-place saved texts (meshes build once the font loads)
text3d.loadFont().then((r) => { const el = document.querySelector('#text-status'); if (el) el.textContent = r.ogg ? 'Ogg loaded ✓' : 'Fallback serif (drop Ogg in public/fonts/)'; });

// Live density control for every void layer — uses draw ranges (instant, no
// rebuild) so you can dial the amount of stars / nodes / energy lines / nebula.
// Runs at startup too, so editing the FX defaults also tunes the published build.
// Mobile vertex/fill budget: halved UNDER the user's saved fracs, inside this
// function so it survives every dev-slider call and save() never persists it.
const DENSITY_MUL = IS_TOUCH ? 0.5 : 1;
function applyVoidDensity() {
  livingVoid.sgeo.setDrawRange(0, Math.max(0, Math.floor(livingVoid.STAR_N * FX.starFrac * DENSITY_MUL)));
  livingVoid.nebMat.uniforms.uNebFrac.value = FX.nebFrac;   // Clouds = nebula density (smooth fade)
  if (network) {
    network.pgeo.setDrawRange(0, Math.max(0, Math.floor(network.N * FX.nodeFrac * DENSITY_MUL)));
    network.lgeo.setDrawRange(0, 2 * Math.max(0, Math.floor(network.L * FX.lineFrac * DENSITY_MUL)));
  }
}
applyVoidDensity();

// Per-chapter "color world": the network recolors toward the nearest section's
// hue on approach, fading back to neutral cyan between beats. Real brand hues
// (CONTENT.md): Opening/Hero cyan · hub violet · SHADIEZ coastal dusty-blue ·
// TEEPO green · LifeRPG+Kiara mustard/amber · contact warm ember.
const CHAPTER_COLORS = [0x4fd2ff, 0x9fd8ff, 0x9b8cff, 0x8fb8cc, 0x3fc978, 0xeab04e, 0xff9e7a];

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

// ---- The data network — nodes + living energy lines (BACKGROUND.md layer 4,
//  ENVIRONMENT.md Layer 2; look ported from demo-living-void.html, APPROVED).
//  World-space, built AFTER the beats load so hubs cluster around each section:
//  the "CRM/SaaS network" read from the PRD. All motion runs in the vertex
//  shader (drift = layered sines from per-vertex attrs), so nodes and their
//  line endpoints move identically with zero per-frame CPU work. Line thickness
//  stays 1px (approved look); swap to meshline only if a thicker read is wanted.
function buildNetwork() {
  const N = 900, MAX_LINKS = 2, LINK_DIST = 62;   // 2 links/node — 3 tangled the hub halos into yarn balls
  const cams = beats.map((b) => new THREE.Vector3(...b.cam));
  const hubs = beats.filter((b) => b.panel).map((b) => new THREE.Vector3(...b.look));
  const bbox = new THREE.Box3().setFromPoints(cams.concat(hubs)).expandByScalar(320);
  const _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const clearOf = (p) => {                     // keep the corridor + panel faces readable
    for (const c of cams) if (p.distanceToSquared(c) < 25 * 25) return false;
    for (const h of hubs) if (p.distanceToSquared(h) < 30 * 30) return false;
    return true;
  };
  const sampleOnPath = (out) => {              // random point along the cam polyline + lateral offset
    const i = Math.floor(Math.random() * (cams.length - 1));
    out.lerpVectors(cams[i], cams[i + 1], Math.random());
    _s.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    return out.addScaledVector(_s, 55 + Math.random() * 225);
  };
  const sampleHub = (out) => {                 // halo around a section's panel
    const h = hubs.length ? hubs[Math.floor(Math.random() * hubs.length)] : cams[0];
    _s.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    return out.copy(h).addScaledVector(_s, 48 + Math.random() * 110);   // wide halo — tight radii knotted the links
  };
  const sampleWide = (out) => out.set(         // sparse far scatter for depth
    THREE.MathUtils.lerp(bbox.min.x, bbox.max.x, Math.random()),
    THREE.MathUtils.lerp(bbox.min.y, bbox.max.y, Math.random()),
    THREE.MathUtils.lerp(bbox.min.z, bbox.max.z, Math.random()));
  const base = new Float32Array(N * 3), amp = new Float32Array(N * 3), fre = new Float32Array(N * 3), pha = new Float32Array(N * 3);
  const aPhase = new Float32Array(N), aScale = new Float32Array(N), aColor = new Float32Array(N * 3);
  const cCyan = new THREE.Color(0x6fe0ff), cWhite = new THREE.Color(0xeaf4ff), cEmber = new THREE.Color(0xff7a3d), _tc = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = Math.random();
    for (let tries = 0; tries < 8; tries++) {  // rejection-sample away from the camera line + panels
      if (r < 0.45) sampleOnPath(_p); else if (r < 0.78) sampleHub(_p); else sampleWide(_p);
      if (clearOf(_p)) break;
    }
    base[i * 3] = _p.x; base[i * 3 + 1] = _p.y; base[i * 3 + 2] = _p.z;
    for (let k = 0; k < 3; k++) { amp[i * 3 + k] = 3 + Math.random() * 10; fre[i * 3 + k] = 0.15 + Math.random() * 0.55; pha[i * 3 + k] = Math.random() * 6.28; }
    aPhase[i] = Math.random() * 6.28; aScale[i] = 0.6 + Math.random() * 1.8;
    const cr = Math.random(); _tc.copy(cr < 0.12 ? cEmber : (cr < 0.5 ? cWhite : cCyan));   // ~12% ember accents per BACKGROUND.md
    aColor[i * 3] = _tc.r; aColor[i * 3 + 1] = _tc.g; aColor[i * 3 + 2] = _tc.b;
  }
  const DRIFT_GLSL = `vec3 drifted(vec3 b, vec3 A, vec3 F, vec3 P, float t, float on){
    return b + on * vec3(A.x*sin(t*F.x+P.x), A.y*sin(t*F.y+P.y), A.z*sin(t*F.z+P.z)); }`;
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(base, 3));
  pgeo.setAttribute('aAmp', new THREE.BufferAttribute(amp, 3));
  pgeo.setAttribute('aFre', new THREE.BufferAttribute(fre, 3));
  pgeo.setAttribute('aPha', new THREE.BufferAttribute(pha, 3));
  pgeo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  pgeo.setAttribute('aScale', new THREE.BufferAttribute(aScale, 1));
  pgeo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  const pmat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: 3.2 }, uTwinkle: { value: 1 }, uWarp: { value: 0 }, uDrift: { value: 1 }, uPtN: { value: new THREE.Vector2(9, 9) }, uVel: { value: 0 }, uTint: { value: new THREE.Color(0x4fd2ff) }, uTintAmt: { value: 0 } },
    vertexShader: `attribute vec3 aAmp,aFre,aPha,aColor; attribute float aPhase,aScale;
      uniform float uTime,uSize,uTwinkle,uWarp,uDrift,uVel; uniform vec2 uPtN;
      varying vec3 vC; varying float vA;
      ${DRIFT_GLSL}
      void main(){
        vec3 p=drifted(position,aAmp,aFre,aPha,uTime,uDrift);
        float tw=mix(0.85, 0.55+0.45*sin(uTime*1.6+aPhase), uTwinkle);
        vec4 mv=modelViewMatrix*vec4(p,1.0); float depth=-mv.z;
        vec4 clip=projectionMatrix*mv; vec2 ndc=clip.xy/clip.w;
        float near=smoothstep(0.5,0.0,length(ndc-uPtN));
        tw*=1.0+near*(0.5+uVel*0.9);                                      // cursor stirs nearby nodes
        tw=min(tw,1.45);                                                  // cap: additive clusters must never stack to white
        vA=tw*smoothstep(16.0,44.0,depth)*smoothstep(950.0,520.0,depth);  // near+far fade
        vC=aColor;
        gl_PointSize=min(aScale*uSize*tw*(1.0+uWarp*1.6)*(420.0/max(depth,1.0)), 24.0);
        gl_Position=clip; }`,
    fragmentShader: `varying vec3 vC; varying float vA; uniform vec3 uTint; uniform float uTintAmt;
      void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); if(d>0.5) discard;
        float a=smoothstep(0.5,0.0,d)*vA;
        vec3 col=mix(vC,uTint,uTintAmt);                                   // per-chapter recolor
        gl_FragColor=vec4(col*(0.7+vA),a); }`,
  });
  const nodes = new THREE.Points(pgeo, pmat);
  nodes.renderOrder = -6; nodes.frustumCulled = false;
  scene.add(nodes);
  // connections: nearest neighbours under LINK_DIST, computed once from base positions;
  // each line vertex carries ITS node's drift attrs so endpoints track exactly.
  const pairs = [];
  for (let i = 0; i < N; i++) {
    let c = 0;
    for (let j = i + 1; j < N && c < MAX_LINKS; j++) {
      const dx = base[i * 3] - base[j * 3], dy = base[i * 3 + 1] - base[j * 3 + 1], dz = base[i * 3 + 2] - base[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) { pairs.push(i, j); c++; }
    }
  }
  const L = pairs.length / 2;
  const lpos = new Float32Array(L * 6), lamp = new Float32Array(L * 6), lfre = new Float32Array(L * 6), lpha = new Float32Array(L * 6);
  const lT = new Float32Array(L * 2), lPh = new Float32Array(L * 2), lCol = new Float32Array(L * 6);
  for (let k = 0; k < L; k++) {
    const ph = Math.random();
    for (let v = 0; v < 2; v++) {
      const n = pairs[k * 2 + v], o = (k * 2 + v) * 3;
      for (let m = 0; m < 3; m++) { lpos[o + m] = base[n * 3 + m]; lamp[o + m] = amp[n * 3 + m]; lfre[o + m] = fre[n * 3 + m]; lpha[o + m] = pha[n * 3 + m]; lCol[o + m] = aColor[n * 3 + m]; }
      lT[k * 2 + v] = v; lPh[k * 2 + v] = ph;
    }
  }
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  lgeo.setAttribute('aAmp', new THREE.BufferAttribute(lamp, 3));
  lgeo.setAttribute('aFre', new THREE.BufferAttribute(lfre, 3));
  lgeo.setAttribute('aPha', new THREE.BufferAttribute(lpha, 3));
  lgeo.setAttribute('aT', new THREE.BufferAttribute(lT, 1));
  lgeo.setAttribute('aLPhase', new THREE.BufferAttribute(lPh, 1));
  lgeo.setAttribute('aLColor', new THREE.BufferAttribute(lCol, 3));
  const lmat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDrift: { value: 1 }, uWarp: { value: 0 }, uTint: { value: new THREE.Color(0x4fd2ff) }, uTintAmt: { value: 0 } },
    vertexShader: `attribute vec3 aAmp,aFre,aPha,aLColor; attribute float aT,aLPhase;
      uniform float uTime,uDrift; varying float vT,vP,vFade; varying vec3 vC;
      ${DRIFT_GLSL}
      void main(){
        vec3 p=drifted(position,aAmp,aFre,aPha,uTime,uDrift);
        vec4 mv=modelViewMatrix*vec4(p,1.0); float depth=-mv.z;
        vFade=smoothstep(20.0,50.0,depth)*smoothstep(900.0,480.0,depth);
        vT=aT; vP=aLPhase; vC=aLColor;
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vT,vP,vFade; varying vec3 vC;
      uniform float uTime,uWarp,uTintAmt; uniform vec3 uTint;
      void main(){
        float life=0.08+0.15*sin(uTime*0.35+vP*6.2831);                    // slow form/dissolve (restraint: lines support, never shout)
        float head=fract(uTime*0.22+vP);
        float pulse=smoothstep(0.05,0.0,abs(vT-head));                     // bright spark travelling A->B
        float a=clamp(life+pulse*0.9,0.0,1.0)*vFade*(1.0+uWarp*0.8);
        vec3 col=mix(vC,uTint,uTintAmt)+pulse*vec3(0.5);
        gl_FragColor=vec4(col,a); }`,
  });
  const lines = new THREE.LineSegments(lgeo, lmat);
  lines.renderOrder = -6; lines.frustumCulled = false;
  lines.visible = FX.linesOn;
  scene.add(lines);
  pmat.uniforms.uTwinkle.value = (FX.twinkleOn && !PREFERS_REDUCED) ? 1 : 0;
  function update(t, driftOn, ptN, vel) {
    pmat.uniforms.uTime.value = t; lmat.uniforms.uTime.value = t;
    pmat.uniforms.uDrift.value = driftOn; lmat.uniforms.uDrift.value = driftOn;
    pmat.uniforms.uPtN.value.copy(ptN); pmat.uniforms.uVel.value = vel;
  }
  const setTint = (hex, amt) => { pmat.uniforms.uTint.value.set(hex); pmat.uniforms.uTintAmt.value = amt; lmat.uniforms.uTint.value.set(hex); lmat.uniforms.uTintAmt.value = amt; };
  const setWarp = (v) => { pmat.uniforms.uWarp.value = v; lmat.uniforms.uWarp.value = v; };
  return { N, L, nodes, lines, pgeo, lgeo, pmat, lmat, update, setTint, setWarp, base, amp, fre, pha, aColor };
}

// ---- Cursor links (ENVIRONMENT.md Layer 3) — the network reaches toward the
//  cursor: up to K thin threads from nearby nodes to a point along the cursor
//  ray, brightening with pointer speed and melting away when idle. Deliberately
//  NOT a glowing cursor blob (BACKGROUND.md lock) — no endpoint sprite, just
//  faint filaments. CPU cost: re-derive the K nodes' drift + project ~900
//  points once per frame (same math the demo ran for every node every frame).
const cursorLinks = (() => {
  if (IS_TOUCH) return { update: () => {} };   // no cursor exists on touch — skip the geometry + per-frame projection entirely
  const K = 8, NDC_R = 0.30;
  const pos = new Float32Array(K * 6), col = new Float32Array(K * 8);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
  const obj = new THREE.LineSegments(geo, mat);
  obj.renderOrder = -5; obj.frustumCulled = false; obj.visible = false;
  scene.add(obj);
  const _v = new THREE.Vector3(), _anchor = new THREE.Vector3();
  const near = [];                              // scratch: { d, x, y, z }
  let strength = 0;
  function update(t, active, ptN, vel, driftOn) {
    const net = network;
    // links live while the pointer is in the scene, swell with its speed
    const target = (active && ptN.x > -2 && ptN.x < 2) ? Math.min(1, 0.42 + vel * 0.9) : 0;
    strength += (target - strength) * 0.10;
    obj.visible = strength > 0.02 && !PREFERS_REDUCED && !!net;
    if (!obj.visible) return;
    near.length = 0;
    const { base, amp, fre, pha, aColor, N } = net;
    let meanDepth = 0;
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      const x = base[o] + driftOn * amp[o] * Math.sin(t * fre[o] + pha[o]);
      const y = base[o + 1] + driftOn * amp[o + 1] * Math.sin(t * fre[o + 1] + pha[o + 1]);
      const z = base[o + 2] + driftOn * amp[o + 2] * Math.sin(t * fre[o + 2] + pha[o + 2]);
      _v.set(x, y, z).project(camera);
      if (_v.z < 0 || _v.z > 1) continue;                     // behind the camera / past far
      const dx = _v.x - ptN.x, dy = _v.y - ptN.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > NDC_R) continue;
      near.push({ d, x, y, z, i });
    }
    near.sort((a, b) => a.d - b.d);
    const n = Math.min(K, near.length);
    // anchor just in front of the picked cluster so the threads have real length
    for (let k = 0; k < n; k++) { _v.set(near[k].x, near[k].y, near[k].z); meanDepth += camera.position.distanceTo(_v); }
    meanDepth = n ? (meanDepth / n) * 0.82 : 150;
    _anchor.set(ptN.x, ptN.y, 0.5).unproject(camera).sub(camera.position).normalize();
    _anchor.multiplyScalar(meanDepth).add(camera.position);
    for (let k = 0; k < K; k++) {
      const p6 = k * 6, c8 = k * 8;
      if (k < n) {
        const nd = near[k], co = nd.i * 3;
        const a = Math.min(0.85, strength * Math.pow(1 - nd.d / NDC_R, 0.6));   // nearest = brightest
        pos[p6] = _anchor.x; pos[p6 + 1] = _anchor.y; pos[p6 + 2] = _anchor.z;
        pos[p6 + 3] = nd.x; pos[p6 + 4] = nd.y; pos[p6 + 5] = nd.z;
        col[c8] = aColor[co]; col[c8 + 1] = aColor[co + 1]; col[c8 + 2] = aColor[co + 2]; col[c8 + 3] = 0; // cursor end: transparent
        col[c8 + 4] = aColor[co]; col[c8 + 5] = aColor[co + 1]; col[c8 + 6] = aColor[co + 2]; col[c8 + 7] = a; // node end: lit
      } else {
        for (let m = 0; m < 6; m++) pos[p6 + m] = 0;
        for (let m = 0; m < 8; m++) col[c8 + m] = 0;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }
  return { update };
})();

// ---- Default path (used until the user edits / loads saved) -----------------
const mkPanel = (x, y, z, w, h, rot = [0, 0, 0]) => ({ pos: [x, y, z], size: [w, h], rot, billboard: false });
// the opening hero shot — a framed camera looking at a big title panel
const makeHeroBeat = () => ({
  name: 'Hero', cam: [0, 2, 120], look: [0, 2, 40], up: UP_NORMAL.slice(),
  fov: 70, dur: 1.8, desc: 'Landing pages & SaaS interfaces — fly through the work.',
  img: '', link: '', panel: mkPanel(0, 2, 35, 120, 64),
});
// Baked from the user's exported path (Copy config) — kept exactly as-is.
// Real content per CONTENT.md (Phase B). Cameras kept exactly as authored.
const DEFAULT_BEATS = [
  { name: 'Opening', cam: [-56, 2, 120], look: [-11, 59, 42], up: [0, 1, 0], fov: 25, dur: 1.4, desc: 'Landing pages & SaaS interfaces — fly through the work.', img: '', link: '', panel: null },
  { name: 'Hero', cam: [1, 53, 33], look: [192, -55, -56], up: [0, 1, 0], fov: 41, dur: 1.6, desc: '', img: '', link: '', panel: null },
  { name: 'My Projects', cam: [9, 10, -69], look: [15, 4, -119], up: [-0.66418640324206, 0.7376001166578326, -0.1216654825935754], fov: 83, dur: 1.6, desc: 'Four featured builds ahead — plus Worldiez, Mentorship, AeroCy, SecScan, BodyLoop, and a daily practice of motion labs.', cap: { desc: 'A glimpse of the full body of work — keep flying.' }, img: '', link: '', panel: { pos: [15, 4, -119], size: [70, 44], billboard: false, rot: [0, 0, 0] } },
  { name: 'SHADIEZ', cam: [0, 2, -190], look: [-22, 0, -235], up: [0, 1, 0], fov: 87, dur: 1.6, desc: 'Client e-commerce landing for a premium beach shade — 3D product hero, scroll-driven storytelling, live lead capture.', img: '/previews/shadiez.jpg', link: 'https://shadiez.vercel.app', fx: { bloomStrength: 0.5 }, panel: { pos: [-22, 0, -235], size: [70, 44], billboard: false, rot: [0, 0, 0] } },
  { name: 'TEEPO', cam: [0, 2, -310], look: [22, 0, -355], up: [0, 1, 0], fov: 80, dur: 1.6, desc: 'Full SaaS study platform for Israeli students — Hebrew RTL, Moodle scraping via a Chrome extension, Google Drive as the datastore, a Claude-powered assistant.', img: '/previews/teepo.jpg', link: 'https://bgu-study-organizer.vercel.app', fx: { bloomStrength: 0.5 }, panel: { pos: [22, 0, -355], size: [70, 44], billboard: false, rot: [0, 0, 0] } },
  { name: 'LifeRPG & Kiara’s Club', cam: [0, 35, -410], look: [0, 60, -475], up: [0, 1, 0], fov: 68, dur: 1.6, desc: 'A desktop life-RPG where real habits grow a 3D world — and a dachshund-first store brand, built from palette to cart.', img: '/previews/liferpg.jpg', img2: '/previews/kiaras-club.jpg', link: 'https://kiaras-club.vercel.app', fx: { bloomStrength: 0.5 }, panel: { pos: [0, 60, -475], size: [70, 44], billboard: false, rot: [0, 0, 0] } },
  { name: 'Let’s build something', cam: [0, 49, -560], look: [1, 290, -560], up: [0, 0, -1], fov: 52, dur: 3, desc: 'Have a landing page or product interface in mind? I reply fast.', cap: { desc: 'yarinlevin18@gmail.com — or hit the button.' }, img: '', link: 'mailto:yarinlevin18@gmail.com', panel: { pos: [1, 290, -560], size: [70, 44], billboard: false, rot: [89, 0, 180] } },
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
// selectable transition easing (driven by the Transitions panel)
const EASINGS = {
  easeInOut,
  easeOut: (x) => 1 - Math.pow(1 - x, 3),
  easeInOutQuint: (x) => (x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2),
  linear: (x) => x,
};
let transitionEase = easeInOut;
let txEaseName = 'easeInOut';
// global (non-keyframed) state that Save must persist alongside the beats
const GLOBAL_KEYS = ['starFrac', 'nodeFrac', 'lineFrac', 'nebFrac', 'driftOn', 'fovPunch', 'warpStrength', 'warpLength', 'twinkleOn', 'linesOn', 'nebVisible', 'uiHud', 'uiWaypoints', 'uiCaption', 'uiHint', 'uiScale', 'waveAmp', 'waveSpd', 'waveCoil', 'waveOn', 'waveGrid', 'nebSpd', 'nebWarp', 'nebHue', 'nebEmber', 'nebVig', 'nebGlow', 'lightning', 'glowSpots', 'lightInt', 'lightReach', 'lightRate', 'glowBright', 'glowFlick', 'cursorDrive', 'waterStr', 'waterRad', 'waterAtt', 'waterDisp', 'waterSheen', 'openFit', 'openSize', 'openGlow', 'openForm', 'openShatterR', 'openPush', 'openSpring', 'openColor'];
let activePunch = 0;   // 0..1 across a transition, peaks at the midpoint (for FOV punch)
const DEF_FOV = 68, DEF_DUR = 1.6;
// a sensible starter panel for a section: sits at its aim point, fixed orientation
const defaultPanelFor = (b) => ({ pos: b.look.slice(), size: [70, 44], rot: [0, 0, 0], billboard: false });

const SAVE_KEY = 'voidConfig';
// fill in fields that didn't exist in earlier saved versions
function backfillBeat(b) {
  b.fov ??= DEF_FOV; b.dur ??= DEF_DUR;
  b.desc ??= ''; b.img ??= ''; b.img2 ??= ''; b.link ??= '';
  b.water ??= false;   // per-section water swipe (enable per asset)
  if (b.panel === undefined) b.panel = defaultPanelFor(b);
  if (b.panel) {
    if (b.panel.spin !== undefined) { if (b.panel.rot === undefined) b.panel.rot = [0, b.panel.spin, 0]; delete b.panel.spin; } // migrate old single-axis spin
    b.panel.rot ??= [0, 0, 0];
    b.panel.billboard ??= false;
  }
  ensureBeatFX(b);
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
        if (d.g) { for (const k of GLOBAL_KEYS) if (d.g[k] != null) FX[k] = d.g[k]; if (d.g.ease) txEaseName = d.g.ease; } // restore global FX/UX/transition state
        let migrated = false;
        if (!(d.version >= 2)) { beats.forEach((b) => { if (b.panel) b.panel.billboard = false; }); migrated = true; } // stop the old auto-facing default
        if (!(d.version >= 3)) { beats.unshift(makeHeroBeat()); migrated = true; }      // add a hero opening shot before everything
        if (!(d.version >= 4)) {
          beats.forEach((b) => { if (b.name === 'New section') { b.name = 'Transition'; b.panel = null; } }); // drop the leftover panel, keep its camera
          const fin = beats.find((b) => /final/i.test(b.name)) || beats[beats.length - 1];
          if (fin) fin.dur = 3;                                                          // slow the last transition into the finale
          migrated = true;
        }
        if (!(d.version >= 6)) {
          if (beats[0]) { beats[0].name = 'Opening'; beats[0].panel = null; }     // Frame 1: opening = wordmark only, drop the empty panel
          const tr = beats.find((b) => /^transition$/i.test((b.name || '').trim()));
          if (tr) tr.name = 'Hero';                                               // Frame 2: the statement beat
          migrated = true;
        }
        if (!(d.version >= 7)) {
          // Phase B: pour the real content into saved paths (authored cameras stay;
          // only rename the generic beats and fill EMPTY content fields).
          const fill = (re, src) => {
            const b = beats.find((x) => re.test((x.name || '').trim())); if (!b) return;
            b.name = src.name;
            if (!b.desc) b.desc = src.desc;
            if (!b.img) b.img = src.img;
            if (src.img2 && !b.img2) b.img2 = src.img2;
            if (!b.link) b.link = src.link;
          };
          fill(/^my projects$/i, DEFAULT_BEATS[2]);
          fill(/^project ?1$/i, DEFAULT_BEATS[3]);
          fill(/^project ?2$/i, DEFAULT_BEATS[4]);
          fill(/^project ?3 ?& ?4$/i, DEFAULT_BEATS[5]);
          fill(/^final/i, DEFAULT_BEATS[6]);
          migrated = true;
        }
        if (!(d.version >= 8)) {
          // Kiara's Club went live after v7 — fill the twin beat's empty link.
          const tw = beats.find((x) => /liferpg/i.test(x.name || ''));
          if (tw && !tw.link) tw.link = 'https://kiaras-club.vercel.app';
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
function save() {
  const g = {}; for (const k of GLOBAL_KEYS) g[k] = FX[k]; g.ease = txEaseName;
  localStorage.setItem(SAVE_KEY, JSON.stringify({ beats, speed: speedMul, smooth, g, version: 8 }));
}
// push the global (saved) FX/UX/transition state into the live scene + DOM
function applyGlobals() {
  applyVoidDensity();
  livingVoid.smat.uniforms.uTwinkle.value = FX.twinkleOn ? 1 : 0;
  if (network) { network.pmat.uniforms.uTwinkle.value = (FX.twinkleOn && !PREFERS_REDUCED) ? 1 : 0; network.lines.visible = FX.linesOn; }
  livingVoid.composite.visible = FX.nebVisible;
  livingVoid.nebMat.uniforms.uSpd.value = FX.nebSpd;
  livingVoid.nebMat.uniforms.uWarp.value = FX.nebWarp;
  livingVoid.nebMat.uniforms.uHue.value = FX.nebHue;
  livingVoid.nebMat.uniforms.uEmber.value = FX.nebEmber;
  livingVoid.nebMat.uniforms.uGlow.value = FX.nebGlow;
  livingVoid.spots.visible = FX.glowSpots;
  transitionEase = EASINGS[txEaseName] || easeInOut;
  captionsOn = FX.uiCaption;
  const hud = document.querySelector('#hud'); if (hud) hud.style.display = FX.uiHud ? '' : 'none';
  if (wpEl) wpEl.style.display = FX.uiWaypoints ? '' : 'none';
  const hint = document.querySelector('#overlay .hint'); if (hint) hint.style.display = FX.uiHint ? '' : 'none';
  applyRootFont();
}
// Width-derived UI shrink for phones — a runtime-only multiplier layered UNDER
// the saved uiScale (save() never sees it). Both writers (applyGlobals + the
// U-panel slider) must route through applyRootFont or one silently drops it.
let uiMobileMul = 1;
function computeUiMul() { uiMobileMul = (IS_TOUCH && window.innerWidth < 640) ? 0.85 : 1; }
function applyRootFont() { document.documentElement.style.fontSize = (16 * (FX.uiScale || 1) * uiMobileMul) + 'px'; }
computeUiMul();
load();
beats.forEach(ensureBeatFX);   // ensure every beat (incl. defaults) carries a full FX keyframe set
{ // anchor the wave ribbon around the "My Projects" section (now that beats exist)
  const _ai = Math.max(0, beats.findIndex((b) => /projects/i.test(b.name)));
  const la = beats[_ai] && beats[_ai].look;
  if (la) { waveRibbon.group.userData.anchor.set(la[0], la[1], la[2]); waveRibbon.group.position.copy(waveRibbon.group.userData.anchor); }
}
network = buildNetwork();      // the data network hubs around the loaded path (edit path → refresh to re-seed)
applyVoidDensity();            // apply saved node/line density now that the network exists

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
  ctx.fillStyle = 'rgba(8,16,26,0.93)'; ctx.fillRect(0, 0, W, H);   // near-opaque: the next beat's panel must not ghost through
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(79,210,255,0.5)'; ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  const pad = 26; let y = pad;
  const img = getImage(b.img), img2 = getImage(b.img2);
  // Screens in a dark void run dim: a dark multiply keeps bright site pixels
  // (~1.0 luminance) under control so UnrealBloom halos the preview instead of
  // detonating it — same rule as the card header.
  const meanLum = (im) => {                // sampled once per image, cached on it
    if (im._lum != null) return im._lum;
    try {
      const c = document.createElement('canvas'); c.width = 32; c.height = 20;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0, 32, 20);
      const d = x.getImageData(0, 0, 32, 20).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      im._lum = s / (d.length / 4) / 255;
    } catch (e) { im._lum = 0.5; }
    return im._lum;
  };
  const drawDimmed = (im, x0, y0, w0, h0) => {
    drawImageCover(ctx, im, x0, y0, w0, h0);
    // adaptive: pale screenshots (cream dashboards, skies) get dimmed harder so
    // no preview can hand bloom a giant über-threshold surface
    const dim = clamp(0.30 + (meanLum(im) - 0.30) * 0.85, 0.30, 0.66);
    ctx.fillStyle = `rgba(6,14,22,${dim.toFixed(2)})`; ctx.fillRect(x0, y0, w0, h0);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(79,210,255,0.3)'; ctx.strokeRect(x0, y0, w0, h0);
  };
  if (img && img2) {                       // twin-project beat: two previews side by side
    const iw = (W - pad * 2 - 14) / 2, ih = Math.min(H * 0.52, iw * 0.68);
    drawDimmed(img, pad, y, iw, ih);
    drawDimmed(img2, pad + iw + 14, y, iw, ih);
    y += ih + 18;
  } else if (img) {
    const iw = W - pad * 2, ih = Math.min(H * 0.5, iw * (img.height / img.width));
    drawDimmed(img, pad, y, iw, ih);
    y += ih + 18;
  }
  // mid-luminance header: bright enough to read, dim enough that UnrealBloom
  // (threshold .22) halos it gently instead of smearing it to a white blob —
  // the big glowing title is the kinetic caption's job, not the card's.
  ctx.shadowColor = 'rgba(79,210,255,0.35)'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#9cc0d8'; ctx.font = `700 ${Math.round(W * 0.062)}px Inter, system-ui, sans-serif`;
  y = drawWrapped(ctx, b.name || '', pad, y, W - pad * 2, Math.round(W * 0.075));
  ctx.shadowBlur = 0;
  if (b.desc && !img) {                    // cards with a preview let the image speak — the kinetic caption carries the story
    y += 8; ctx.fillStyle = '#9fc2e0'; ctx.font = `400 ${Math.round(W * 0.044)}px Inter, system-ui, sans-serif`;
    y = drawWrapped(ctx, b.desc, pad, y, W - pad * 2, Math.round(W * 0.06));
  }
  if (b.link) {
    const mail = /^mailto:/i.test(b.link), label = mail ? 'GET IN TOUCH' : 'VISIT LIVE';
    const ph = Math.round(W * 0.085), pw = Math.round(W * (mail ? 0.42 : 0.34)), px = pad, py = H - pad - ph;
    ctx.fillStyle = '#1f9fd6';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fill(); }
    else ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = '#ffffff'; ctx.font = `700 ${Math.round(W * 0.04)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, px + pw / 2, py + ph / 2 + 1);
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
// Every input path (wheel / keys / swipe / waypoint tap) funnels through goTo:
// one cooldown means hybrid devices can't double-step (e.g. a wheel event
// trailing a touch swipe).
const NAV_COOLDOWN = 300;
function goTo(i) {
  if (editMode || freeRoam) return;
  if (performance.now() - lastNav < NAV_COOLDOWN) return;
  const n = clamp(i, 0, lastIdx());
  if (n === index) return;
  index = n; lastNav = performance.now();
  // start a timed flight into the new section (per-shot duration, scaled by speed)
  const target = index / Math.max(1, lastIdx());
  const dur = (beats[index]?.dur ?? DEF_DUR) / Math.max(0.05, speedMul);
  tween = { from: progress, to: target, t: 0, dur: Math.max(0.15, dur) };
  freeBtn.hidden = index !== lastIdx();
}
function step(dir) { goTo(index + dir); }
// One section per scroll GESTURE: a trackpad swipe fires dozens of wheel events,
// so we step once on the first event, then stay locked until the scroll has
// fully stopped (no wheel events for `idle` ms). You must scroll again to advance.
let navLock = false, wheelIdle = null;
window.addEventListener('wheel', (e) => {
  if (editMode || freeRoam) return;   // editor uses orbit zoom
  e.preventDefault();
  if (Math.abs(e.deltaY) < 6) return;
  clearTimeout(wheelIdle);
  wheelIdle = setTimeout(() => { navLock = false; }, 180);  // gesture ended → re-arm
  if (navLock) return;                                       // already stepped this gesture
  navLock = true;
  step(e.deltaY > 0 ? 1 : -1);
}, { passive: false });
// Touch: one section per swipe GESTURE — the touch mirror of the wheel's
// navLock. Distance fires mid-gesture (feels immediate); a velocity check on
// touchend catches short fast flicks. Taps produce almost no touchmove, so the
// browser's synthesized click still reaches the panel-link handler — touchend
// must therefore NEVER be preventDefault'd. Multi-touch (pinch) is ignored,
// and free-roam keeps OrbitControls' own touch handling.
const SWIPE_DIST = 70;    // px — a deliberate drag
const FLICK_DIST = 30;    // px — minimum travel for a velocity-fired flick
const FLICK_VEL = 0.45;   // px/ms
let _tX = 0, _tY = 0, _tT = 0, _tAxis = null, _tFired = false;
window.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) { _tAxis = 'multi'; return; }
  _tX = e.touches[0].clientX; _tY = e.touches[0].clientY;
  _tT = performance.now(); _tAxis = null; _tFired = false;
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (editMode || freeRoam || _tAxis === 'multi') return;
  if (isTextEntry(e.target)) return;
  e.preventDefault();                                        // the reliable iOS pull-to-refresh / overscroll kill
  const dx = e.touches[0].clientX - _tX, dy = e.touches[0].clientY - _tY;
  if (!_tAxis && Math.hypot(dx, dy) > 12) _tAxis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x';   // axis lock
  if (_tAxis === 'y' && !_tFired && Math.abs(dy) > SWIPE_DIST) { _tFired = true; step(dy < 0 ? 1 : -1); }   // swipe up = advance
}, { passive: false });
window.addEventListener('touchend', (e) => {
  if (editMode || freeRoam || _tFired || _tAxis !== 'y') return;
  const dy = e.changedTouches[0].clientY - _tY, dt = performance.now() - _tT;
  if (Math.abs(dy) > FLICK_DIST && Math.abs(dy) / Math.max(1, dt) > FLICK_VEL) step(dy < 0 ? 1 : -1);
}, { passive: true });
window.addEventListener('keydown', (e) => {
  if (isTextEntry(e.target)) return;
  if (editMode || e.repeat) return;   // ignore key auto-repeat → one section per press
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
      goTo(i);
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
const HERO_SUBLINE = true;   // Frame 2: set false to show the headline alone (no sub-line)
function resolveCaption(i) {                      // per-section caption text — beat.cap override wins, else the default
  const b = beats[i] || {};
  const isHero = /^hero$/i.test((b.name || '').trim());
  const baseTitle = isHero ? 'From knowing nothing about coding and design.' : (b.name || '');
  const baseDesc = isHero ? (HERO_SUBLINE ? 'Self-taught — everything here, I built.' : '') : (b.desc || '');
  const ov = b.cap || {};
  return { label: '', title: (ov.title !== undefined && ov.title !== '') ? ov.title : baseTitle, desc: ov.desc !== undefined ? ov.desc : baseDesc };
}
let _capShown = -1;
let captionsOn = true;   // UI/UX panel toggle
function setCaption(i) {
  if (!capEl || !captionsOn || i === _capShown) return;
  _capShown = i;
  const c = resolveCaption(i);
  capLabel.textContent = c.label;
  requestAnimationFrame(() => {                 // set text → replay each asset's in-animation
    capTitle.textContent = c.title;
    capDesc.textContent = c.desc;
    capEl.classList.add('show');
    if (assetCfg.capTitle && assetCfg.capTitle.mesh3d) hideAsset(assetDef('capTitle'));   // 3D mesh shows the title instead
    else replayAsset(assetDef('capTitle'));
    replayAsset(assetDef('capDesc'));
  });
}
function hideCaption() {
  if (!capEl || _capShown === -1) return;
  _capShown = -1;
  capEl.classList.remove('show');
  hideAsset(assetDef('capTitle'));
  hideAsset(assetDef('capDesc'));
}

// subtle parallax (play mode only)
const mouse = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  const nx = (e.clientX / window.innerWidth) * 2 - 1, nyTop = -((e.clientY / window.innerHeight) * 2 - 1);
  mouse.x = nx; mouse.y = (e.clientY / window.innerHeight) * 2 - 1;        // parallax (unchanged convention)
  if (_pPX !== null) _cVelRaw = Math.min(Math.hypot(nx - _pPX, nyTop - _pPY) * 6.0, 2.5);  // cursor speed
  _pPX = nx; _pPY = nyTop; _cN.set(nx, nyTop);                            // pointer NDC (y-up) for the reactive FX
  _wUV.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);  // 0..1 uv for the water sim
});

// ---- HUD --------------------------------------------------------------------
const overlay = document.querySelector('#overlay');
const hudBeat = document.querySelector('#hud-beat');
const hudProgress = document.querySelector('#hud-progress');
const visitBtn = document.querySelector('#visitlive');

// ---- Text assets: per-asset content + in/out animation + DOF blur -------------
//  Every text box on the site is an "asset" you can re-word and re-time. The reveal
//  (opacity + rise + blur) runs off each asset's in/out config; the depth-of-field
//  blur is layered onto the group containers while flying. Editable live in the A panel.
const ASSET_DEFS = [
  { id: 'wordmark', label: 'Wordmark',      sel: '#overlay h1',         group: 'overlay', editable: true },
  { id: 'tagline',  label: 'Tagline',       sel: '#overlay .sub',       group: 'overlay', editable: true },
  { id: 'hint',     label: 'Scroll hint',   sel: '#overlay .hint',      group: 'overlay', editable: true },
  { id: 'capTitle', label: 'Caption title', sel: '#caption .cap-title', group: 'caption', editable: false },
  { id: 'capDesc',  label: 'Caption sub',   sel: '#caption .cap-desc',  group: 'caption', editable: false },
  { id: 'card_shadiez',  label: 'Screen · Shadiez',  group: 'hero' },
  { id: 'card_smartcut', label: 'Screen · SmartCut', group: 'hero' },
];
const HERO_DEFAULTS = {       // local layout in the Hero cluster (x right, y up, z negative = into scene)
  card_shadiez:  { x: 13, y: 9, z: -60, scale: 0.8, blur: 0, ein: 'depth', eout: 'fade' },
  card_smartcut: { x: 17, y: -10, z: -52, scale: 0.8, blur: 0, ein: 'rise', eout: 'fade' },
};
const ASSET_KEY = 'voidAssets';
const _aDefault = () => ({ text: null, size: 1, font: '', depth: 0, mesh3d: false, in: { dur: 900, delay: 120, y: 26, blur: 7, ease: 'out' }, out: { dur: 500, delay: 0, y: -12, blur: 6, ease: 'inout' } });
let assetCfg = {}; ASSET_DEFS.forEach((a) => { assetCfg[a.id] = a.group === 'hero' ? { ...HERO_DEFAULTS[a.id] } : _aDefault(); });
let assetDof = 6;            // DOF → text blur amount (px) at full defocus
let _domDefocus = 0;
const A_EASE = { out: 'cubic-bezier(0.22,1,0.36,1)', inout: 'cubic-bezier(0.65,0,0.35,1)', back: 'cubic-bezier(0.34,1.56,0.64,1)', linear: 'linear' };
function assetDef(id) { return ASSET_DEFS.find((a) => a.id === id); }
function assetEl(a) { return document.querySelector(typeof a === 'string' ? assetDef(a).sel : a.sel); }
try {
  const raw = localStorage.getItem(ASSET_KEY);
  if (raw) {
    const d = JSON.parse(raw);
    if (d.cfg) for (const id in d.cfg) if (assetCfg[id]) {                       // merge saved over defaults (works for text + hero assets)
      const base = assetCfg[id], sv = d.cfg[id];
      assetCfg[id] = { ...base, ...sv };
      if (base.in) assetCfg[id].in = { ...base.in, ...(sv.in || {}) };
      if (base.out) assetCfg[id].out = { ...base.out, ...(sv.out || {}) };
    }
    if (typeof d.dof === 'number') assetDof = d.dof;
  }
} catch (e) { /* keep defaults */ }
function saveAssets() { try { localStorage.setItem(ASSET_KEY, JSON.stringify({ cfg: assetCfg, dof: assetDof })); } catch (e) {} }
function applyAssetText(a) { if (!a.editable) return; const el = assetEl(a), t = assetCfg[a.id].text; if (el && t != null && t !== '') el.textContent = t; }
function extrudeShadow(depth) {                   // CSS faux-3D: stacked dark shadows = extruded type, + a faint glow
  if (!depth || depth <= 0) return '';
  const steps = Math.min(Math.round(depth), 16), s = [];
  for (let i = 1; i <= steps; i++) { const a = (0.5 * (1 - i / (steps + 2))).toFixed(3); s.push(`${i}px ${i}px 0 rgba(8,16,28,${a})`); }
  s.push('0 0 22px rgba(120,200,255,0.20)');
  return s.join(', ');
}
function applyAssetStyle(a) {                     // size / font / 3D-depth — independent of the in/out animation props
  const el = assetEl(a); if (!el) return; const c = assetCfg[a.id];
  if (el._baseFontPx == null) el._baseFontPx = parseFloat(getComputedStyle(el).fontSize) || 16;   // capture responsive base once
  el.style.fontSize = (el._baseFontPx * (c.size || 1)).toFixed(1) + 'px';
  el.style.fontFamily = c.font || '';
  el.style.textShadow = extrudeShadow(c.depth || 0);
}
function showAsset(a) {
  const el = assetEl(a); if (!el || el._as === 'in') return; el._as = 'in';
  if (PREFERS_REDUCED) { el.style.transition = 'none'; el.style.opacity = '1'; el.style.transform = 'none'; el.style.filter = 'none'; return; }
  const i = assetCfg[a.id].in;
  el.style.transition = 'none'; el.style.opacity = '0'; el.style.transform = `translateY(${i.y}px)`; el.style.filter = `blur(${i.blur}px)`;
  void el.offsetWidth;                                     // commit the start state, then transition in
  const tr = `${i.dur}ms ${A_EASE[i.ease] || 'ease'} ${i.delay}ms`;
  el.style.transition = `opacity ${tr}, transform ${tr}, filter ${tr}`;
  el.style.opacity = '1'; el.style.transform = 'translateY(0)'; el.style.filter = 'blur(0px)';
}
function hideAsset(a) {
  const el = assetEl(a); if (!el || el._as === 'out') return; el._as = 'out';
  if (PREFERS_REDUCED) { el.style.transition = 'none'; el.style.opacity = '0'; el.style.transform = 'none'; el.style.filter = 'none'; return; }
  const o = assetCfg[a.id].out;
  const tr = `${o.dur}ms ${A_EASE[o.ease] || 'ease'} ${o.delay}ms`;
  el.style.transition = `opacity ${tr}, transform ${tr}, filter ${tr}`;
  el.style.opacity = '0'; el.style.transform = `translateY(${o.y}px)`; el.style.filter = `blur(${o.blur}px)`;
}
function replayAsset(a) { const el = assetEl(a); if (el) el._as = null; showAsset(a); }   // force the in-animation again
function initAssets() {
  for (const a of ASSET_DEFS) { const el = assetEl(a); if (!el) continue; applyAssetText(a); applyAssetStyle(a); el._as = 'out'; el.style.transition = 'none'; el.style.opacity = '0'; el.style.transform = `translateY(${assetCfg[a.id].out.y}px)`; }
}
function updateAssetDOF(flying) {            // depth-of-field blur layered on the group containers
  if (PREFERS_REDUCED) { if (overlay) overlay.style.filter = ''; if (capEl) capEl.style.filter = ''; return; }
  _domDefocus += ((flying ? 1 : 0) - _domDefocus) * 0.07;
  const db = _domDefocus * assetDof;
  const f = db > 0.03 ? `blur(${db.toFixed(2)}px)` : '';
  if (overlay) overlay.style.filter = f;
  if (capEl) capEl.style.filter = f;
}
try { initAssets(); } catch (e) { console.error('[initAssets]', e); }

// ---- 3D mesh headline — a section's caption title rendered as a real extruded
//  Ogg mesh (via text3d), framed left-of-center in the beat view, with grouped
//  scale/fade/rise in & out. The DOM title is hidden while this is on. Best for
//  short titles ("My Projects", project names) — long statements stay DOM text.
const headline3D = (() => {
  let mesh = null, op = 0, curKey = '';
  const C = new THREE.Vector3(), f = new THREE.Vector3(), rt = new THREE.Vector3(), uu = new THREE.Vector3(), zc = new THREE.Vector3(), pos = new THREE.Vector3();
  const baseQ = new THREE.Quaternion(), basis = new THREE.Matrix4();
  function pose(b) {
    C.set(b.cam[0], b.cam[1], b.cam[2]);
    f.set(b.look[0] - C.x, b.look[1] - C.y, b.look[2] - C.z).normalize();
    uu.set(b.up?.[0] ?? 0, b.up?.[1] ?? 1, b.up?.[2] ?? 0);
    rt.copy(f).cross(uu).normalize(); uu.copy(rt).cross(f).normalize();
    zc.copy(rt).cross(uu); basis.makeBasis(rt, uu, zc); baseQ.setFromRotationMatrix(basis);
  }
  function dispose() { if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; } }
  function rebuild(title) {
    dispose();
    const c = assetCfg.capTitle;
    mesh = text3d.buildHeadline(title, { size: 13 * (c.size || 1), depth: Math.max(2, (c.depth || 0) * 0.6 + 3), bevel: 1.0, color: '#eaf4ff', glow: 1.7 });
    if (mesh) { mesh.material.opacity = 0; mesh.visible = false; scene.add(mesh); }
  }
  function update(on, t, b, title) {
    op += ((on ? 1 : 0) - op) * 0.08;
    if (on && b && b.cam && title && text3d.fontReady()) {
      const c = assetCfg.capTitle, key = title + '|' + (c.size || 1) + '|' + (c.depth || 0);
      if (key !== curKey) { rebuild(title); curKey = key; }
      pose(b);
    }
    if (!mesh) return;
    if (op < 0.01) { mesh.visible = false; return; }
    mesh.visible = true;
    const RM = PREFERS_REDUCED, e = op * op * (3 - 2 * op);
    pos.copy(C).addScaledVector(f, 72).addScaledVector(rt, -22).addScaledVector(uu, -1 + (RM ? 0 : (1 - e) * -5));
    mesh.position.copy(pos); mesh.quaternion.copy(baseQ);
    mesh.scale.setScalar(RM ? 1 : (0.86 + 0.14 * e));
    mesh.material.opacity = e;
    if (mesh.material.userData && mesh.material.userData.shader) mesh.material.userData.shader.uniforms.uSweep.value = RM ? 0 : t * 0.3;
  }
  return { update };
})();

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
function commit(msg) { beats.forEach(ensureBeatFX); rebuildDerived(); rebuildGizmos(); rebuildPanels(); buildWaypoints(); reattach(); pushHistory(); save(); if (msg) flash(msg); }
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
  const b = beats[i]; if (!b || !thumbRenderer) return;   // no thumb context outside DEV_TOOLS
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
  edDofBlur.value = beatFX(sel, 'dofBlur'); edDofBlurV.textContent = (+edDofBlur.value).toFixed(3);
  edDofAp.value = beatFX(sel, 'dofAperture'); edDofApV.textContent = (+edDofAp.value).toFixed(4);
  edWater.checked = !!beats[sel].water;
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
// Depth of field — edits the SELECTED section's keyframe (previews in play; DOF is off in Director Mode)
const edDofBlur = document.querySelector('#ed-dofblur'), edDofBlurV = document.querySelector('#ed-dofblur-v');
const edDofAp = document.querySelector('#ed-dofap'), edDofApV = document.querySelector('#ed-dofap-v');
const _edDof = (inp, key, out, dp) => {
  inp.addEventListener('input', () => { const v = parseFloat(inp.value); const b = beats[sel]; if (b) { if (!b.fx) ensureBeatFX(b); b.fx[key] = v; } if (out) out.textContent = v.toFixed(dp); });
  inp.addEventListener('change', () => commit(''));
};
_edDof(edDofBlur, 'dofBlur', edDofBlurV, 3);
_edDof(edDofAp, 'dofAperture', edDofApV, 4);
const edWater = document.querySelector('#ed-water');
edWater.addEventListener('change', () => { if (beats[sel]) beats[sel].water = edWater.checked; commit(''); });
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
document.querySelector('#ed-save').addEventListener('click', () => { save(); text3d.save(); flash('Saved — everything'); });
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
  if (on) { if (txEl) txEl.hidden = true; if (uxEl) uxEl.hidden = true; if (textEl) textEl.hidden = true; }  // hide the extra panels too
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
  if (k === 'e' && !typing && DEV_TOOLS) { setEdit(!editMode); }   // preview-only: no Director Mode
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
// Debounced: mobile URL-bar show/hide fires resize storms; height-only changes
// take the cheap path (no render-target reallocation — a ~60px-stale nebula RT
// during a bar transition is invisible on a soft raymarched cloud).
function applyResize(full) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  if (css3d) css3d.renderer.setSize(window.innerWidth, window.innerHeight);
  computeUiMul(); applyRootFont();
  if (!full) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_CAP)); // cap retina: fewer fragments, big fill-rate win
  if (bloom) bloom.setSize((window.innerWidth / 2) | 0, (window.innerHeight / 2) | 0);
  livingVoid.nebMat.uniforms.uA.value = window.innerWidth / window.innerHeight;
  livingVoid.sizeRT();                            // keep the half-res raymarch target in sync
  if (water) water.sizeSim();
}
let _rzTimer = 0, _rzW = window.innerWidth;
window.addEventListener('resize', () => {
  clearTimeout(_rzTimer);
  _rzTimer = setTimeout(() => {
    const heightOnly = IS_TOUCH && window.innerWidth === _rzW;   // iOS URL-bar collapse/expand
    _rzW = window.innerWidth;
    applyResize(!heightOnly);
  }, 200);
});
window.addEventListener('orientationchange', () => {   // rotation always takes the full path, after the viewport settles
  clearTimeout(_rzTimer);
  _rzTimer = setTimeout(() => { _rzW = window.innerWidth; applyResize(true); }, 300);
});

// ---- Depth-of-field + gentle motion blur (kept subtle to avoid sickness) ----
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (!IS_TOUCH) {   // full-res DOF pass is the biggest mobile fill-rate cost; bloom (half-res) IS the look, so it stays
    bokeh = new BokehPass(scene, camera, { focus: 200, aperture: FX.dofAperture, maxblur: FX.dofBlur });
    composer.addPass(bokeh);
  }
  bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), FX.bloomStrength, 0.7, 0.22); // threshold .22 → only bright nodes glow, not the nebula
  composer.addPass(bloom);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.setSize((window.innerWidth / 2) | 0, (window.innerHeight / 2) | 0);  // half-res bloom — ~4x cheaper, looks ~identical (it's blurred anyway)
} catch (e) { composer = null; console.warn('Postprocessing disabled:', e); }

// ---- Water swipe — GPU wave-equation sim refracting the scene, per-section ----
//  (ported 1:1 from demo-water-trail.html). Half-float ping-pong sim; the final
//  composer pass refracts the rendered scene by the wave gradient. Calm = passthrough.
if (composer && !PREFERS_REDUCED && !IS_TOUCH) try {   // cursor-driven — pointless and pricey on touch
  const SIM = 0.5;
  const wq = new THREE.PlaneGeometry(2, 2), wOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let simA, simB;
  const simU = {
    tPrev: { value: null }, uDelta: { value: new THREE.Vector2(1, 1) }, uA: { value: window.innerWidth / window.innerHeight },
    uM: { value: new THREE.Vector2(-9, -9) }, uPM: { value: new THREE.Vector2(-9, -9) },
    uRad: { value: FX.waterRad }, uStr: { value: FX.waterStr }, uDown: { value: 0 }, uAtt: { value: FX.waterAtt },
    uRect: { value: new THREE.Vector4(2, 2, 2, 2) },
  };
  const simMat = new THREE.ShaderMaterial({ uniforms: simU,
    vertexShader: `varying vec2 v; void main(){ v=uv; gl_Position=vec4(position.xy,0.,1.); }`,
    fragmentShader: `varying vec2 v; uniform sampler2D tPrev; uniform vec2 uDelta,uM,uPM; uniform float uA,uRad,uStr,uDown,uAtt; uniform vec4 uRect;
      float segd(vec2 p,vec2 a,vec2 b){ vec2 pa=p-a,ba=b-a; float t=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.); return length(pa-ba*t); }
      void main(){
        vec2 info=texture2D(tPrev,v).rg;
        vec2 dx=vec2(uDelta.x,0.), dy=vec2(0.,uDelta.y);
        float avg=(texture2D(tPrev,v-dx).r+texture2D(tPrev,v+dx).r+texture2D(tPrev,v-dy).r+texture2D(tPrev,v+dy).r)*0.25;
        info.g += (avg-info.r)*2.0; info.g *= uAtt; info.r += info.g;        // verlet + damping
        vec2 p=v; p.x*=uA; vec2 a=uM; a.x*=uA; vec2 b=uPM; b.x*=uA;
        float d=segd(p,a,b); float dd=1.0-clamp(d/uRad,0.0,1.0); float drop=0.5-0.5*cos(dd*3.14159265);
        float inSec=step(uRect.x,v.x)*step(v.x,uRect.z)*step(uRect.y,v.y)*step(v.y,uRect.w);  // splash only inside the section rect
        info.r += drop*uStr*uDown*inSec;
        gl_FragColor=vec4(info,0.,1.); }` });
  const simScene = new THREE.Scene(); simScene.add(new THREE.Mesh(wq, simMat));
  const sizeSim = () => {
    const sw = Math.max(2, (window.innerWidth * SIM) | 0), sh = Math.max(2, (window.innerHeight * SIM) | 0);
    if (simA) simA.dispose(); if (simB) simB.dispose();
    const o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, type: THREE.HalfFloatType, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
    simA = new THREE.WebGLRenderTarget(sw, sh, o); simB = new THREE.WebGLRenderTarget(sw, sh, o);
    renderer.setRenderTarget(simA); renderer.setClearColor(0x000000, 1); renderer.clear();
    renderer.setRenderTarget(simB); renderer.clear(); renderer.setRenderTarget(null);
    simU.uDelta.value.set(1 / sw, 1 / sh);
  };
  sizeSim();
  const waterPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tSim: { value: null }, uDelta: { value: new THREE.Vector2(1, 1) }, uDisp: { value: FX.waterDisp }, uSheen: { value: FX.waterSheen }, uRect: { value: new THREE.Vector4(2, 2, 2, 2) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse,tSim; uniform vec2 uDelta; uniform float uDisp,uSheen; uniform vec4 uRect;
      void main(){
        vec2 dx=vec2(uDelta.x,0.), dy=vec2(0.,uDelta.y);
        float hl=texture2D(tSim,vUv-dx).r, hr=texture2D(tSim,vUv+dx).r, hd=texture2D(tSim,vUv-dy).r, hu=texture2D(tSim,vUv+dy).r;
        vec2 grad=vec2(hr-hl,hu-hd);
        float msk=smoothstep(uRect.x,uRect.x+0.03,vUv.x)*smoothstep(uRect.z,uRect.z-0.03,vUv.x)*smoothstep(uRect.y,uRect.y+0.03,vUv.y)*smoothstep(uRect.w,uRect.w-0.03,vUv.y);  // soft-clip to the section
        vec2 off=grad*uDisp*msk;
        vec3 col;
        col.r=texture2D(tDiffuse,vUv-off*1.05).r;
        col.g=texture2D(tDiffuse,vUv-off).g;
        col.b=texture2D(tDiffuse,vUv-off*0.95).b;
        vec3 nrm=normalize(vec3(-grad*120.0,1.0));
        float spec=pow(max(dot(nrm,normalize(vec3(-0.5,0.6,1.0))),0.0),16.0)*msk;
        col+=vec3(0.65,0.85,1.0)*spec*uSheen;
        col+=vec3(0.3,0.6,1.0)*length(grad)*30.0*uSheen*0.15*msk;           // faint cool wake edge (clipped)
        gl_FragColor=vec4(col,1.0); }` });
  waterPass.uniforms.uDelta.value.copy(simU.uDelta.value);
  composer.addPass(waterPass);
  water = {
    sizeSim, prev: { x: -9, y: -9 },
    setRect(x, y, z, w) { simU.uRect.value.set(x, y, z, w); waterPass.uniforms.uRect.value.set(x, y, z, w); },
    step(mx, my, down) {
      simU.tPrev.value = simB.texture; simU.uPM.value.set(this.prev.x, this.prev.y); simU.uM.value.set(mx, my); simU.uDown.value = down;
      simU.uStr.value = FX.waterStr; simU.uRad.value = FX.waterRad; simU.uAtt.value = FX.waterAtt;
      renderer.setRenderTarget(simA); renderer.render(simScene, wOrtho);
      const tmp = simA; simA = simB; simB = tmp;                           // simB now holds the latest
      this.prev.x = mx; this.prev.y = my;
      waterPass.uniforms.tSim.value = simB.texture; waterPass.uniforms.uDelta.value.copy(simU.uDelta.value);
      waterPass.uniforms.uDisp.value = FX.waterDisp; waterPass.uniforms.uSheen.value = FX.waterSheen;
    },
  };
} catch (e) { water = null; console.warn('Water disabled:', e); }

// ---- Dev profiling handle + ?prof FPS/drawcall probe ------------------------
const PROF = new URLSearchParams(location.search).has('prof');
let _pf = { n: 0, t: 0, last: 0 };
if (DEV_TOOLS) window.__void = { renderer, scene, camera, composer, bokeh, bloom, livingVoid, get info() { return renderer.info; } };

// ---- FX control panel (toggle with B) — live-edits every effect -------------
(() => {
  if (!fxEl || !DEV_TOOLS) return;          // preview-only build: no FX panel for visitors
  fxEl.hidden = false;                       // dev: show it by default as before
  const f4 = (v) => v.toFixed(4), f3 = (v) => v.toFixed(3), f2 = (v) => v.toFixed(2), f0 = (v) => String(Math.round(v));
  const secEl = document.querySelector('#fx-sec');
  const focusIdx = () => clamp(editMode ? sel : index, 0, Math.max(0, beats.length - 1));

  // KEYFRAMED sliders — [slider id, beat.fx key, formatter] — edit the FOCUSED section's keyframe.
  const KEYROWS = [
    ['dofblur', 'dofBlur', f4], ['dofap', 'dofAperture', f4],
    ['dim', 'panelDimFloor', f2], ['range', 'panelLightRange', f0],
    ['colint', 'colorIntensity', f2], ['colreach', 'colorReach', f0],
    ['bloom', 'bloomStrength', f2], ['nebula', 'nebula', f2],
  ];
  const refs = [];
  for (const [id, key, fmt] of KEYROWS) {
    const inp = document.querySelector('#fx-' + id), out = document.querySelector('#fx-' + id + '-v');
    if (!inp) continue;
    refs.push({ inp, out, key, fmt });
    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value), i = focusIdx(), b = beats[i];
      if (b) { if (!b.fx) ensureBeatFX(b); b.fx[key] = v; }
      if (out) out.textContent = fmt(v);
    });
    inp.addEventListener('change', save);     // persist on release, not on every drag tick
  }
  let _shownIdx = -1;
  fxSync = () => {
    const i = focusIdx();
    for (const r of refs) { const v = beatFX(i, r.key); r.inp.value = v; if (r.out) r.out.textContent = r.fmt(v); }
    if (secEl) secEl.textContent = beats[i] ? ('▸ ' + (beats[i].name || ('Section ' + (i + 1)))) : '';
    _shownIdx = i;
  };
  fxMaybeSync = () => { if (focusIdx() !== _shownIdx) fxSync(); };
  fxSync();

  // GLOBAL sliders — structural density (not keyframed; also bakes into the published build).
  const globalRows = [
    ['warpstr', () => FX.warpStrength, (v) => { FX.warpStrength = v; }, f2],
    ['warplen', () => FX.warpLength, (v) => { FX.warpLength = v; }, f3],
    ['waveamp', () => FX.waveAmp, (v) => { FX.waveAmp = v; }, f0],
    ['wavespd', () => FX.waveSpd, (v) => { FX.waveSpd = v; }, f2],
    ['wavecoil', () => FX.waveCoil, (v) => { FX.waveCoil = v; }, f0],
    ['stars', () => FX.starFrac, (v) => { FX.starFrac = v; applyVoidDensity(); }, f2],
    ['nodes', () => FX.nodeFrac, (v) => { FX.nodeFrac = v; applyVoidDensity(); }, f2],
    ['links', () => FX.lineFrac, (v) => { FX.lineFrac = v; applyVoidDensity(); }, f2],
    ['clouds', () => FX.nebFrac, (v) => { FX.nebFrac = v; applyVoidDensity(); }, f2],
    ['nebspd', () => FX.nebSpd, (v) => { FX.nebSpd = v; livingVoid.nebMat.uniforms.uSpd.value = v; }, f2],
    ['nebwarp', () => FX.nebWarp, (v) => { FX.nebWarp = v; livingVoid.nebMat.uniforms.uWarp.value = v; }, f2],
    ['nebhue', () => FX.nebHue, (v) => { FX.nebHue = v; livingVoid.nebMat.uniforms.uHue.value = v; }, f2],
    ['nebember', () => FX.nebEmber, (v) => { FX.nebEmber = v; livingVoid.nebMat.uniforms.uEmber.value = v; }, f2],
    ['nebglow', () => FX.nebGlow, (v) => { FX.nebGlow = v; livingVoid.nebMat.uniforms.uGlow.value = v; }, f2],
    ['waterstr', () => FX.waterStr, (v) => { FX.waterStr = v; }, f2],
    ['waterrad', () => FX.waterRad, (v) => { FX.waterRad = v; }, f3],
    ['wateratt', () => FX.waterAtt, (v) => { FX.waterAtt = v; }, f3],
    ['waterdisp', () => FX.waterDisp, (v) => { FX.waterDisp = v; }, f2],
    ['watersheen', () => FX.waterSheen, (v) => { FX.waterSheen = v; }, f2],
    ['lightint', () => FX.lightInt, (v) => { FX.lightInt = v; }, f2],
    ['lightreach', () => FX.lightReach, (v) => { FX.lightReach = v; }, f0],
    ['lightrate', () => FX.lightRate, (v) => { FX.lightRate = v; }, f2],
    ['glowbright', () => FX.glowBright, (v) => { FX.glowBright = v; }, f2],
    ['glowflick', () => FX.glowFlick, (v) => { FX.glowFlick = v; }, f2],
    ['cursordrive', () => FX.cursorDrive, (v) => { FX.cursorDrive = v; }, f2],
    ['openfit', () => FX.openFit, (v) => { FX.openFit = v; }, f2],
    ['opensize', () => FX.openSize, (v) => { FX.openSize = v; }, f2],
    ['openglow', () => FX.openGlow, (v) => { FX.openGlow = v; }, f2],
    ['openform', () => FX.openForm, (v) => { FX.openForm = v; }, f2],
    ['openshatterr', () => FX.openShatterR, (v) => { FX.openShatterR = v; }, f2],
    ['openpush', () => FX.openPush, (v) => { FX.openPush = v; }, f2],
    ['openspring', () => FX.openSpring, (v) => { FX.openSpring = v; }, f3],
  ];
  for (const [id, get, set, fmt] of globalRows) {
    const inp = document.querySelector('#fx-' + id), out = document.querySelector('#fx-' + id + '-v');
    if (!inp) continue;
    inp.value = get();
    if (out) out.textContent = fmt(parseFloat(inp.value));
    inp.addEventListener('input', () => { const v = parseFloat(inp.value); set(v); if (out) out.textContent = fmt(v); });
  }

  const _ocol = document.querySelector('#fx-opencolor');
  if (_ocol) { _ocol.value = FX.openColor; _ocol.addEventListener('input', () => { FX.openColor = _ocol.value; }); }
  const chk = (id, key, fn) => { const el = document.querySelector('#fx-' + id); if (!el) return; el.checked = !!FX[key]; el.addEventListener('change', () => { FX[key] = el.checked; fn(el.checked); }); };
  chk('twinkle', 'twinkleOn', (v) => { livingVoid.smat.uniforms.uTwinkle.value = v ? 1 : 0; if (network) network.pmat.uniforms.uTwinkle.value = (v && !PREFERS_REDUCED) ? 1 : 0; });
  chk('drift', 'driftOn', () => {});
  chk('lines', 'linesOn', (v) => { if (network) network.lines.visible = v; });
  chk('waveon', 'waveOn', () => {});
  chk('wavegrid', 'waveGrid', () => {});
  chk('nebvig', 'nebVig', () => {});   // raymarch nebula has a baked vignette; toggle is a no-op now
  chk('lightning', 'lightning', () => {});
  chk('glowspots', 'glowSpots', (v) => { livingVoid.spots.visible = v; });
  chk('neb', 'nebVisible', (v) => { livingVoid.composite.visible = v; });
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'b' && !isTextEntry(e.target) && !editMode) togglePanel(fxEl);
  });
})();

// only one side-panel open at a time (they live in overlapping corners)
function togglePanel(target) {
  if (!target) return;
  const willShow = target.hidden;
  for (const p of [fxEl, txEl, uxEl, textEl, asEl]) { if (p) p.hidden = true; }
  if (willShow) target.hidden = false;
}

// ---- Assets panel (toggle A) — per-asset text + in/out animation + DOF blur ---
const asEl = document.querySelector('#assetpanel');
let asSel = ASSET_DEFS[0].id;
let _asFrame = -1;
function curCapIdx() { return _capShown >= 0 ? _capShown : index; }   // caption text edits the section you're currently on
function frameAssets() {                          // assets that belong to the current frame
  if (index === 0) return ASSET_DEFS.filter((a) => a.group === 'overlay');
  const isHero = /^hero$/i.test((beats[index]?.name || '').trim());
  return ASSET_DEFS.filter((a) => a.group === 'caption' || (isHero && a.group === 'hero'));
}
function loadAssetFields() {
  if (!asEl) return;
  _asFrame = index;
  const defs = frameAssets();
  if (!defs.find((a) => a.id === asSel)) asSel = (defs[0] || ASSET_DEFS[0]).id;   // keep the selection valid for this frame
  const list = document.querySelector('#as-list');
  if (list) { list.innerHTML = defs.map((a) => `<option value="${a.id}">${a.label}</option>`).join(''); list.value = asSel; }
  const def = assetDef(asSel), c = assetCfg[asSel];
  const isHero = def.group === 'hero';
  const tc = document.querySelector('#as-text-ctrls'), hc = document.querySelector('#as-hero-ctrls');
  if (tc) tc.style.display = isHero ? 'none' : '';
  if (hc) hc.style.display = isHero ? '' : 'none';
  if (isHero) {                                  // floating card: position / scale / transition styles
    const setR = (id, v, fmt) => { const el = document.querySelector('#' + id); if (el) el.value = v; const o = document.querySelector('#' + id + '-v'); if (o) o.textContent = fmt ? fmt(v) : v; };
    setR('ah-x', c.x ?? 0, (v) => Math.round(v)); setR('ah-y', c.y ?? 0, (v) => Math.round(v)); setR('ah-z', c.z ?? -60, (v) => Math.round(v));
    setR('ah-scale', c.scale ?? 1, (v) => (+v).toFixed(2) + '×');
    setR('ah-blur', c.blur ?? 0, (v) => (+v).toFixed(1) + 'px');
    const ein = document.querySelector('#ah-ein'); if (ein) ein.value = c.ein || 'fade';
    const eout = document.querySelector('#ah-eout'); if (eout) eout.value = c.eout || 'fade';
    return;
  }
  const txt = document.querySelector('#as-text');
  if (txt) {
    txt.disabled = false;
    if (def.group === 'caption') {                 // per-section text (whichever section you're on)
      const cc = resolveCaption(curCapIdx());
      txt.value = def.id === 'capTitle' ? cc.title : (cc.desc || '');
      txt.placeholder = (beats[curCapIdx()]?.name || 'this section') + '…';
    } else {
      txt.value = c.text ?? (assetEl(def)?.textContent || '');
      txt.placeholder = 'text…';
    }
  }
  const szv = document.querySelector('#as-size'); if (szv) { szv.value = c.size ?? 1; const o = document.querySelector('#as-size-v'); if (o) o.textContent = (c.size ?? 1).toFixed(2) + '×'; }
  const fnv = document.querySelector('#as-font'); if (fnv) fnv.value = c.font || '';
  const dpv = document.querySelector('#as-depth'); if (dpv) { dpv.value = c.depth ?? 0; const o = document.querySelector('#as-depth-v'); if (o) o.textContent = (c.depth ?? 0) + 'px'; }
  const m3v = document.querySelector('#as-mesh3d'), m3r = document.querySelector('#as-mesh3d-row');
  if (m3r) m3r.style.display = (asSel === 'capTitle') ? '' : 'none';      // 3D mesh option only for the headline
  if (m3v) m3v.checked = !!c.mesh3d;
  const put = (id, v, fmt) => { const el = document.querySelector('#as-' + id); if (el) el.value = v; const o = document.querySelector('#as-' + id + '-v'); if (o) o.textContent = fmt ? fmt(v) : v; };
  for (const ph of ['in', 'out']) {
    put(ph + '-dur', c[ph].dur, (v) => v + 'ms'); put(ph + '-delay', c[ph].delay, (v) => v + 'ms');
    put(ph + '-y', c[ph].y, (v) => v + 'px'); put(ph + '-blur', c[ph].blur, (v) => v + 'px');
    const es = document.querySelector('#as-' + ph + '-ease'); if (es) es.value = c[ph].ease;
  }
  put('dof', assetDof, (v) => v + 'px');
}
(() => {
  if (!asEl || !DEV_TOOLS) return;
  const list = document.querySelector('#as-list');
  if (list) list.addEventListener('change', () => { asSel = list.value; loadAssetFields(); });
  const txt = document.querySelector('#as-text');
  if (txt) txt.addEventListener('input', () => {
    const def = assetDef(asSel);
    if (def.group === 'caption') {                 // write the current section's caption override + live-update
      const i = curCapIdx(), b = beats[i]; if (!b) return;
      b.cap = b.cap || {};
      b.cap[def.id === 'capTitle' ? 'title' : 'desc'] = txt.value;
      if (def.id === 'capTitle' && capTitle) capTitle.textContent = txt.value;
      if (def.id === 'capDesc' && capDesc) capDesc.textContent = txt.value;
      save();
    } else {
      assetCfg[asSel].text = txt.value; const el = assetEl(def); if (el) el.textContent = txt.value || ''; saveAssets();
    }
  });
  const bindRange = (id, ph, key, fmt) => {
    const el = document.querySelector('#as-' + id); if (!el) return;
    el.addEventListener('input', () => { const v = parseFloat(el.value); assetCfg[asSel][ph][key] = v; const o = document.querySelector('#as-' + id + '-v'); if (o) o.textContent = fmt ? fmt(v) : v; saveAssets(); });
  };
  for (const ph of ['in', 'out']) {
    bindRange(ph + '-dur', ph, 'dur', (v) => v + 'ms'); bindRange(ph + '-delay', ph, 'delay', (v) => v + 'ms');
    bindRange(ph + '-y', ph, 'y', (v) => v + 'px'); bindRange(ph + '-blur', ph, 'blur', (v) => v + 'px');
    const es = document.querySelector('#as-' + ph + '-ease'); if (es) es.addEventListener('change', () => { assetCfg[asSel][ph].ease = es.value; saveAssets(); });
  }
  const dof = document.querySelector('#as-dof');
  if (dof) dof.addEventListener('input', () => { assetDof = parseFloat(dof.value); const o = document.querySelector('#as-dof-v'); if (o) o.textContent = assetDof + 'px'; saveAssets(); });
  const szi = document.querySelector('#as-size');
  if (szi) szi.addEventListener('input', () => { assetCfg[asSel].size = parseFloat(szi.value); applyAssetStyle(assetDef(asSel)); const o = document.querySelector('#as-size-v'); if (o) o.textContent = parseFloat(szi.value).toFixed(2) + '×'; saveAssets(); });
  const fni = document.querySelector('#as-font');
  if (fni) fni.addEventListener('change', () => { assetCfg[asSel].font = fni.value; applyAssetStyle(assetDef(asSel)); saveAssets(); });
  const dpi = document.querySelector('#as-depth');
  if (dpi) dpi.addEventListener('input', () => { assetCfg[asSel].depth = parseFloat(dpi.value); applyAssetStyle(assetDef(asSel)); const o = document.querySelector('#as-depth-v'); if (o) o.textContent = parseFloat(dpi.value) + 'px'; saveAssets(); });
  const m3i = document.querySelector('#as-mesh3d');
  if (m3i) m3i.addEventListener('change', () => { assetCfg.capTitle.mesh3d = m3i.checked; saveAssets(); if (m3i.checked) hideAsset(assetDef('capTitle')); else replayAsset(assetDef('capTitle')); });
  const ahBind = (id, key, fmt) => {              // floating-card position/scale → live into heroCluster
    const el = document.querySelector('#' + id); if (!el) return;
    el.addEventListener('input', () => { const v = parseFloat(el.value); assetCfg[asSel][key] = v; const o = document.querySelector('#' + id + '-v'); if (o) o.textContent = fmt ? fmt(v) : v; saveAssets(); });
  };
  ahBind('ah-x', 'x', (v) => Math.round(v)); ahBind('ah-y', 'y', (v) => Math.round(v)); ahBind('ah-z', 'z', (v) => Math.round(v)); ahBind('ah-scale', 'scale', (v) => v.toFixed(2) + '×'); ahBind('ah-blur', 'blur', (v) => v.toFixed(1) + 'px');
  const ahEin = document.querySelector('#ah-ein'); if (ahEin) ahEin.addEventListener('change', () => { assetCfg[asSel].ein = ahEin.value; saveAssets(); });
  const ahEout = document.querySelector('#ah-eout'); if (ahEout) ahEout.addEventListener('change', () => { assetCfg[asSel].eout = ahEout.value; saveAssets(); });
  const prev = document.querySelector('#as-preview');
  if (prev) prev.addEventListener('click', () => replayAsset(assetDef(asSel)));
  loadAssetFields();
})();

// ---- Transitions panel (toggle with T) — flight feel between sections --------
const txEl = document.querySelector('#txpanel');
(() => {
  if (!txEl || !DEV_TOOLS) return;          // preview-only build
  const bind = (id, get, set, fmt) => {
    const inp = document.querySelector('#tx-' + id), out = document.querySelector('#tx-' + id + '-v');
    if (!inp) return;
    inp.value = get();
    if (out) out.textContent = fmt(parseFloat(inp.value));
    inp.addEventListener('input', () => { const v = parseFloat(inp.value); set(v); if (out) out.textContent = fmt(v); });
  };
  const f2 = (v) => v.toFixed(2), f3 = (v) => v.toFixed(3), f0 = (v) => String(Math.round(v));
  bind('speed', () => speedMul, (v) => { speedMul = v; if (typeof edSpeed !== 'undefined' && edSpeed) { edSpeed.value = v; edSpeedVal.textContent = v.toFixed(2) + '×'; } }, (v) => v.toFixed(2) + '×');
  bind('fov', () => FX.fovPunch, (v) => { FX.fovPunch = v; }, f0);
  bind('warpstr', () => FX.warpStrength, (v) => { FX.warpStrength = v; }, f2);
  bind('warplen', () => FX.warpLength, (v) => { FX.warpLength = v; }, f3);
  const sel = document.querySelector('#tx-ease');
  if (sel) { sel.value = txEaseName; sel.addEventListener('change', () => { txEaseName = sel.value; transitionEase = EASINGS[sel.value] || easeInOut; }); }
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 't' && !isTextEntry(e.target) && !editMode) togglePanel(txEl);
  });
})();

// ---- UI / UX panel (toggle with U) — the interface layer --------------------
const uxEl = document.querySelector('#uxpanel');
(() => {
  if (!uxEl || !DEV_TOOLS) return;          // preview-only build
  const hud = document.querySelector('#hud');
  const overlayHint = document.querySelector('#overlay .hint');
  const chk = (id, key, fn) => { const el = document.querySelector('#ux-' + id); if (!el) return; el.checked = !!FX[key]; el.addEventListener('change', () => { FX[key] = el.checked; fn(el.checked); }); };
  chk('hud', 'uiHud', (v) => { if (hud) hud.style.display = v ? '' : 'none'; });
  chk('waypoints', 'uiWaypoints', (v) => { if (wpEl) wpEl.style.display = v ? '' : 'none'; });
  chk('caption', 'uiCaption', (v) => { captionsOn = v; if (!v) hideCaption(); });
  chk('hint', 'uiHint', (v) => { if (overlayHint) overlayHint.style.display = v ? '' : 'none'; });
  const scale = document.querySelector('#ux-scale'), scaleOut = document.querySelector('#ux-scale-v');
  if (scale) {
    scale.value = FX.uiScale; if (scaleOut) scaleOut.textContent = (+FX.uiScale).toFixed(2) + '×';
    scale.addEventListener('input', () => { const v = parseFloat(scale.value); FX.uiScale = v; applyRootFont(); if (scaleOut) scaleOut.textContent = v.toFixed(2) + '×'; });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'u' && !isTextEntry(e.target) && !editMode) togglePanel(uxEl);
  });
})();

// ---- 3D Text panel (toggle with Y) — place & style extruded Ogg text ---------
const textEl = document.querySelector('#textpanel');
(() => {
  if (!textEl || !DEV_TOOLS) return;        // preview-only build (placed text still renders for visitors)
  let curId = null;
  const $ = (id) => document.querySelector('#text-' + id);
  const listEl = $('list');
  // [field, geometry-changing?] — geometry fields rebuild the mesh; others just re-apply
  const FIELDS = [['size', true], ['depth', true], ['bevel', true], ['glow', false], ['x', false], ['y', false], ['z', false], ['rx', false], ['ry', false], ['rz', false]];

  function renderList() {
    const items = text3d.list();
    listEl.innerHTML = items.map((d) => `<option value="${d.id}">${d.id}: ${(d.text || '').slice(0, 12) || '(empty)'}</option>`).join('');
    if (items.length && (curId == null || !items.some((d) => d.id === curId))) curId = items[items.length - 1].id;
    listEl.value = curId ?? '';
  }
  function loadFields() {
    const d = text3d.get(curId); if (!d) return;
    $('content').value = d.text;
    for (const [f] of FIELDS) { const inp = $(f), out = $(f + '-v'); if (inp) inp.value = d[f]; if (out) out.textContent = d[f]; }
    $('color').value = d.color;
  }
  function bindField(f, geo) {
    const inp = $(f), out = $(f + '-v');
    if (!inp) return;
    inp.addEventListener('input', () => {
      const d = text3d.get(curId); if (!d) return;
      d[f] = parseFloat(inp.value); if (out) out.textContent = inp.value;
      geo ? text3d.rebuild(curId) : text3d.apply(curId);
    });
    inp.addEventListener('change', () => text3d.save());
  }
  for (const [f, geo] of FIELDS) bindField(f, geo);
  $('content').addEventListener('input', () => { const d = text3d.get(curId); if (!d) return; d.text = $('content').value; text3d.rebuild(curId); renderList(); });
  $('content').addEventListener('change', () => text3d.save());
  $('color').addEventListener('input', () => { const d = text3d.get(curId); if (!d) return; d.color = $('color').value; text3d.apply(curId); });
  $('color').addEventListener('change', () => text3d.save());

  listEl.addEventListener('change', () => { curId = parseInt(listEl.value, 10); loadFields(); });
  $('add').addEventListener('click', () => { const d = text3d.add(defaultText()); curId = d.id; renderList(); loadFields(); });
  $('del').addEventListener('click', () => { if (curId == null) return; text3d.remove(curId); curId = null; renderList(); loadFields(); });
  $('place').addEventListener('click', () => {
    const d = text3d.get(curId); if (!d) return;
    const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
    const p = camera.position.clone().addScaledVector(fwd, 70);
    d.x = Math.round(p.x); d.y = Math.round(p.y); d.z = Math.round(p.z);
    const tmp = new THREE.Object3D(); tmp.position.copy(p); tmp.lookAt(camera.position);   // face the camera
    d.rx = Math.round(THREE.MathUtils.radToDeg(tmp.rotation.x));
    d.ry = Math.round(THREE.MathUtils.radToDeg(tmp.rotation.y));
    d.rz = 0;                                          // force upright — no roll/tilt, dead-center
    text3d.apply(curId); text3d.save(); loadFields();
  });

  renderList(); loadFields();
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'y' && !isTextEntry(e.target) && !editMode) { togglePanel(textEl); renderList(); loadFields(); }
    if (e.key.toLowerCase() === 'a' && !isTextEntry(e.target) && !editMode) { togglePanel(asEl); loadAssetFields(); }
  });
})();

// ---- Hotkeys legend (toggle with ?) ----------------------------------------
(() => {
  const hk = document.querySelector('#hotkeys');
  if (!hk || IS_TOUCH) return;   // keyboard-only affordance — meaningless on touch (even with a BT keyboard the legend lies)
  window.addEventListener('keydown', (e) => {
    if (isTextEntry(e.target)) return;
    if (e.key === '?') hk.hidden = !hk.hidden;
    else if (e.key === 'Escape') hk.hidden = true;
  });
})();

applyGlobals();   // apply the loaded global FX/UX/transition state before the loop starts

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
      progress = tween.from + (tween.to - tween.from) * transitionEase(k);
      activePunch = Math.sin(Math.PI * k);   // 0 at ends, 1 at the midpoint
      if (k >= 1) { progress = tween.to; tween = null; activePunch = 0; }
    } else activePunch = 0;
    const seg = progress * last;
    const i0 = clamp(Math.floor(seg), 0, lastIdx());
    const i1 = clamp(i0 + 1, 0, lastIdx());
    const f = seg - i0;
    pathPoint(progress, cp);           // straight or curved per `smooth`
    const mx = mouse.x * 3, my = mouse.y * 3;
    camera.position.set(cp.x + mx, cp.y - my, cp.z);
    camera.quaternion.copy(beatQuats[i0]).slerp(beatQuats[i1], f);
    // per-shot field-of-view (zoom), interpolated across the segment, + transition punch
    const fa = beats[i0]?.fov ?? DEF_FOV, fb = beats[i1]?.fov ?? DEF_FOV;
    const nf = fa + (fb - fa) * f + FX.fovPunch * activePunch;
    if (Math.abs(camera.fov - nf) > 0.01) { camera.fov = nf; camera.updateProjectionMatrix(); }
  }

  // keep the editor thumbnails fresh (the starfield drifts) — cheap, throttled
  if (editMode) { thumbTimer += dt; if (thumbTimer > 0.8) { thumbTimer = 0; renderAllThumbs(); } }

  resolveFX();                               // per-beat FX keyframes → interpolated live values
  livingVoid.nebMat.uniforms.uDens.value = curFX.nebula;   // per-section nebula density (keyframed)
  livingVoid.update(t);                      // advance nebula + starfield time
  if (network) network.update(t, (FX.driftOn && !PREFERS_REDUCED) ? 1 : 0, _cN, _cVel * FX.cursorDrive);   // data network: drift + cursor stir
  cursorLinks.update(t, !editMode && !freeRoam && FX.cursorDrive > 0, _cN, _cVel * FX.cursorDrive, (FX.driftOn && !PREFERS_REDUCED) ? 1 : 0);   // Layer 3: the network reaches toward the cursor
  meteors.update(dt, !editMode && !freeRoam && index === 0);   // falling stars on the start frame only
  {                                          // Frame 2 — the grouped Hero cluster (assets parallax to cursor + scroll)
    const heroOn = !editMode && !freeRoam && /^hero$/i.test(beats[index]?.name || '');
    const hsc = heroOn ? Math.max(-0.5, Math.min(0.5, progress * Math.max(1, lastIdx()) - index)) : 0;
    heroCluster.update(heroOn, t, beats[index], hsc);
  }
  headline3D.update(!editMode && !freeRoam && index !== 0 && !!(assetCfg.capTitle && assetCfg.capTitle.mesh3d), t, beats[index], resolveCaption(index).title);
  text3d.update(t, PREFERS_REDUCED);           // placed 3D text: light sweep + idle float
  try { openingFX.update(!editMode && !freeRoam && index === 0 && progress < 0.06, t); } catch (e) { if (!animate._oerr) { console.error('[opening]', e); animate._oerr = 1; } }
  {                                          // neon wave ribbon — drift + warp around its section
    const w = waveRibbon;
    w.uniforms.uTime.value = t; w.uniforms.uAmp.value = FX.waveAmp; w.uniforms.uSpd.value = FX.waveSpd; w.uniforms.uCoil.value = FX.waveCoil;
    w.group.visible = false; w.grid.visible = false;   // ribbon taken out of the build
    if (FX.waveOn) {
      const last = Math.max(1, beats.length - 1), seg = clamp(progress, 0, 1) * last;
      const i0 = clamp(Math.floor(seg), 0, last), i1 = clamp(i0 + 1, 0, last), f = seg - i0;
      const la = beats[i0].look, lb = beats[i1].look;
      _waveTgt.set(la[0] + (lb[0] - la[0]) * f, la[1] + (lb[1] - la[1]) * f, la[2] + (lb[2] - la[2]) * f);
      w.group.userData.anchor.lerp(_waveTgt, 0.06);   // ribbon glides with the camera, re-wrapping each section
      const an = w.group.userData.anchor;
      w.group.position.set(an.x + Math.sin(t * 0.18) * 18, an.y + Math.cos(t * 0.15) * 9 + 2, an.z + Math.sin(t * 0.12) * 9 - 8);
      w.group.rotation.set(Math.cos(t * 0.09) * 0.12, Math.sin(t * 0.10) * 0.5, Math.sin(t * 0.07) * 0.22);
    }
  }
  {                                          // per-chapter color world
    let bi = 0, bd = Infinity;
    for (let i = 0; i < beats.length; i++) {
      const c = beats[i].cam;
      const dx = camera.position.x - c[0], dy = camera.position.y - c[1], dz = camera.position.z - c[2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; bi = i; }
    }
    const s = clamp(1 - Math.sqrt(bd) / curFX.colorReach, 0, 1) * curFX.colorIntensity;   // 1 at a section, 0 far between
    const tint = CHAPTER_COLORS[bi % CHAPTER_COLORS.length];
    livingVoid.setTint(tint, s);
    if (network) network.setTint(tint, s);   // the network recolors with the chapter too
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
      const a = clamp(1 - (camera.position.distanceTo(m.position) - 90) / curFX.panelLightRange, 0, 1); // near = lit
      m.material.opacity = curFX.panelDimFloor + (1 - curFX.panelDimFloor) * a;
      m.scale.setScalar(0.92 + 0.08 * a);
    }
  }
  updateWaypoints();
  fxMaybeSync();                              // FX panel mirrors the focused section's keyframe
  if (!editMode && !freeRoam) {              // liquid cursor only while hovering a lit section panel
    _ray.setFromCamera(_cN, camera);
    const hit = _ray.intersectObjects(panelMeshes.filter(Boolean), false);
    document.body.classList.toggle('cursor-liquid', hit.length > 0 && hit[0].object.material.opacity > 0.4);
  } else { document.body.classList.remove('cursor-liquid'); }

  hudBeat.textContent = editMode ? 'Director mode' : (freeRoam ? 'Free roam' : (beats[index]?.name ?? ''));
  hudProgress.textContent = (editMode ? (sel + 1) : (index + 1)) + ' / ' + beats.length;
  try {                                                             // never let asset reveals break the render loop
    const showOpening = !editMode && !freeRoam && progress < 0.04;  // the Opening text lives at the very start
    for (const a of ASSET_DEFS) if (a.group === 'overlay') (showOpening ? showAsset : hideAsset)(a);
    updateAssetDOF(!editMode && !freeRoam && !!tween);              // text defocuses while flying
    if (asEl && !asEl.hidden && index !== _asFrame) loadAssetFields();   // panel follows the frame you fly to
  } catch (e) { if (!animate._aerr) { console.error('[assets]', e); animate._aerr = 1; } }

  // "visit live" button for the section currently in view (play mode only)
  const cur = beats[index];
  if (!editMode && !freeRoam && cur && cur.link) {
    visitBtn.hidden = false; visitBtn.href = cur.link;
    const lbl = /^mailto:/i.test(cur.link) ? 'Get in touch ↗' : 'Visit live ↗';
    if (visitBtn.textContent !== lbl) visitBtn.textContent = lbl;
  } else visitBtn.hidden = true;

  if (bokeh && bokeh.uniforms && bokeh.uniforms.focus) {   // lock focus onto the NEAREST section
    if (editMode || freeRoam) _focusV.copy(controls.target);
    else {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < beats.length; i++) {
        const lk = beats[i].look;
        const dx = camera.position.x - lk[0], dy = camera.position.y - lk[1], dz = camera.position.z - lk[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bd) { bd = d2; bi = i; }
      }
      _focusV.set(beats[bi].look[0], beats[bi].look[1], beats[bi].look[2]);   // smooth rack-focus to the closest one
    }
    bokeh.uniforms.focus.value = Math.max(1, camera.position.distanceTo(_focusV));
    bokeh.uniforms.maxblur.value = curFX.dofBlur;        // per-section blur (keyframed)
    bokeh.uniforms.aperture.value = curFX.dofAperture;
  }
  {                                          // warp streaks — world-anchored, stream along actual camera travel
    const { data, pos, geo, mat, R } = warp;
    if (!_prevCamPos) _prevCamPos = camera.position.clone();
    _vel.copy(camera.position).sub(_prevCamPos);
    const camSpeed = _vel.length() / Math.max(dt, 0.0001);
    _prevCamPos.copy(camera.position);
    if (_vel.lengthSq() > 1e-8) _dir.copy(_vel).normalize();
    const len = clamp(camSpeed * FX.warpLength, 0, 60);  // longer streaks the faster you move (global)
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

  if (index !== _lastBeatIdx) { voidWarp = Math.max(voidWarp, 0.9); _lastBeatIdx = index; } // warp burst on chapter change
  voidWarp *= 0.94; if (voidWarp < 0.001) voidWarp = 0;
  livingVoid.setWarp(voidWarp);
  if (network) network.setWarp(voidWarp);    // nodes swell + links flare on the burst
  if (bloom) bloom.strength = curFX.bloomStrength + voidWarp * 0.9;
  if (bokeh) bokeh.enabled = !(editMode || freeRoam);   // DOF only in play; bloom stays on in all modes
  _cVel += (_cVelRaw - _cVel) * 0.12; _cVelRaw *= 0.90;   // smoothed cursor velocity drives the FX
  camera.updateMatrixWorld();
  {                                          // electric arc follows the cursor; movement electrifies the gas
    _cWorld.set(_cN.x, _cN.y, 0.5).unproject(camera).sub(camera.position).normalize();
    const nm = livingVoid.nebMat.uniforms;
    nm.uFlash.value.copy(camera.position).addScaledVector(_cWorld, 300);   // electrified point where the cursor points
    const target = FX.lightning ? Math.min(1.6, _cVel * 1.4) * FX.cursorDrive : 0;
    _flash += (target - _flash) * 0.4;                                     // ramps with cursor speed, fades when still
    nm.uFlashAmt.value = _flash * FX.lightInt;
    nm.uFlashReach.value = 1.0 / Math.max(1, FX.lightReach * FX.lightReach);
    nm.uCrackle.value = FX.lightRate * 4.0;
  }
  { const su = livingVoid.spots.material.uniforms;        // glow spots react to the cursor + controls
    su.uPtN.value.copy(_cN); su.uVel.value = _cVel; su.uDrive.value = FX.cursorDrive; su.uBright.value = FX.glowBright; su.uFlick.value = FX.glowFlick; }
  {                                          // raymarch the volumetric nebula into its half-res target (camera-driven fly-through)
    const nm = livingVoid.nebMat.uniforms;
    camera.updateMatrixWorld();
    nm.uCamPos.value.copy(camera.position);
    nm.uInvProj.value.copy(camera.projectionMatrixInverse);
    nm.uCamWorld.value.copy(camera.matrixWorld);
    renderer.setRenderTarget(livingVoid.nebRT);
    renderer.render(livingVoid.fsScene, livingVoid.fsCam);
    renderer.setRenderTarget(null);
  }
  if (water) {                               // clip the water to the current section's on-screen rectangle
    const pn = beats[index] && beats[index].panel, pm = panelMeshes[index];
    if (!editMode && !freeRoam && beats[index] && beats[index].water && pn && pm) {
      pm.updateMatrixWorld();
      const hw = pn.size[0] / 2, hh = pn.size[1] / 2;
      let mnx = 9, mny = 9, mxx = -9, mxy = -9;
      for (let cx = -1; cx <= 1; cx += 2) for (let cy = -1; cy <= 1; cy += 2) {
        _pc.set(cx * hw, cy * hh, 0).applyMatrix4(pm.matrixWorld).project(camera);
        const ux = _pc.x * 0.5 + 0.5, uy = _pc.y * 0.5 + 0.5;
        mnx = Math.min(mnx, ux); mny = Math.min(mny, uy); mxx = Math.max(mxx, ux); mxy = Math.max(mxy, uy);
      }
      water.setRect(mnx, mny, mxx, mxy);
      water.step(_wUV.x, _wUV.y, 1);
    } else { water.setRect(2, 2, 2, 2); water.step(_wUV.x, _wUV.y, 0); }
  }
  if (composer) composer.render(); else renderer.render(scene, camera);
  if (css3d) css3d.renderer.render(css3d.scene, camera);   // live HTML assets layer (SmartCut iframe), synced to the camera
  if (PROF) {
    const now = performance.now();
    if (_pf.last) { _pf.t += now - _pf.last; _pf.n++; }
    _pf.last = now;
    if (_pf.t >= 1000) {
      const r = renderer.info.render, m = renderer.info.memory;
      console.log(`PROF fps=${(_pf.n / _pf.t * 1000).toFixed(1)} calls=${r.calls} tris=${r.triangles} geos=${m.geometries} texs=${m.textures} progs=${renderer.info.programs?.length}`);
      _pf.t = 0; _pf.n = 0;
    }
  }
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
