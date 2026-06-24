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

// ---- Renderer / scene / camera --------------------------------------------
const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false }); // composer renders the scene to its own targets — MSAA on the canvas is wasted
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap retina: fewer fragments, big fill-rate win
let composer = null, bokeh = null, bloom = null;   // post-FX (set up below)
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
  let _res = 0.5;                              // half-res raymarch (the big perf lever)
  const nebRT = new THREE.WebGLRenderTarget(2, 2, { magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, depthBuffer: false });
  const sizeRT = () => nebRT.setSize(Math.max(2, (window.innerWidth * _res) | 0), Math.max(2, (window.innerHeight * _res) | 0));
  sizeRT();
  const nebMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uA: { value: window.innerWidth / window.innerHeight }, uSteps: { value: _reduced ? 18 : 40 },
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
  const SPOT_N = 70;
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
        fl*=1.0+near*(1.5+uVel*3.0)*uDrive;                 // cursor proximity + speed brighten the flicker
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

// ---- FRAME 2: frosted-glass UI fragments orbiting the Hero statement -----------
const heroFragments = (() => {
  const group = new THREE.Group(); scene.add(group);
  const ACCENT = 'rgba(95,210,255,';
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function glass(x, w, h) {
    x.clearRect(0, 0, w, h); rr(x, 8, 8, w - 16, h - 16, 22);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(20,30,44,0.66)'); g.addColorStop(1, 'rgba(7,11,19,0.66)');
    x.fillStyle = g; x.fill(); x.lineWidth = 2.5; x.strokeStyle = ACCENT + '0.5)'; x.stroke();
  }
  function dashboard(x, w, h) {                       // (a) mini SaaS dashboard + glowing line chart
    glass(x, w, h);
    x.fillStyle = 'rgba(150,195,228,0.85)'; x.font = '600 24px "source-code-pro", monospace'; x.fillText('DASHBOARD', 34, 56);
    x.fillStyle = ACCENT + '0.16)'; rr(x, 34, 74, 150, 38, 8); x.fill(); rr(x, 198, 74, 110, 38, 8); x.fill();
    x.strokeStyle = ACCENT + '0.95)'; x.lineWidth = 4; x.shadowColor = ACCENT + '0.9)'; x.shadowBlur = 16; x.beginPath();
    const ys = [0.2, 0.5, 0.32, 0.7, 0.55, 0.92, 0.78];
    for (let i = 0; i < ys.length; i++) { const px = 40 + i * (w - 96) / (ys.length - 1), py = h - 46 - ys[i] * (h - 170); i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke(); x.shadowBlur = 0;
  }
  function landing(x, w, h) {                         // (b) landing-page hero card
    glass(x, w, h);
    x.fillStyle = ACCENT + '0.14)'; rr(x, 34, 34, w - 68, 92, 12); x.fill();
    x.fillStyle = 'rgba(235,244,255,0.92)'; x.font = '600 36px "ogg", Georgia, serif'; x.fillText('Build. Ship.', 52, 96);
    x.fillStyle = 'rgba(150,190,220,0.7)'; x.font = '17px "acumin-pro", sans-serif'; x.fillText('A landing page that moves.', 52, 150);
    x.fillStyle = ACCENT + '0.85)'; rr(x, 34, h - 80, 134, 46, 23); x.fill();
    x.fillStyle = 'rgba(150,190,220,0.45)'; rr(x, 182, h - 80, 134, 46, 23); x.fill();
  }
  function component(x, w, h) {                       // (c) small UI component (toggle + button)
    glass(x, w, h);
    x.strokeStyle = ACCENT + '0.55)'; x.lineWidth = 3; rr(x, 34, 38, 100, 46, 23); x.stroke();
    x.fillStyle = ACCENT + '0.95)'; x.shadowColor = ACCENT + '0.9)'; x.shadowBlur = 14; x.beginPath(); x.arc(111, 61, 16, 0, 7); x.fill(); x.shadowBlur = 0;
    x.fillStyle = ACCENT + '0.85)'; rr(x, 34, h - 66, 150, 38, 10); x.fill();
  }
  function makeTex(cw, ch, draw, blur) {
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
    if (blur) x.filter = `blur(${blur}px)`; draw(x, cw, ch);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const cards = [];
  function add(draw, w, h, cw, ch, blur, depth, ox, oy, drift) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: makeTex(cw, ch, draw, blur), transparent: true, opacity: 0, depthWrite: false }));
    m.renderOrder = 1; group.add(m);
    cards.push({ m, depth, ox, oy, drift, base: new THREE.Vector3() });
  }
  add(dashboard, 32, 20, 520, 325, 0, 58, 14, 9, { ax: 1.3, ay: 0.9, sp: 0.5, ph: 0 });      // mid depth, crisp
  add(landing, 27, 18, 480, 320, 1.4, 80, 31, -9, { ax: 1.7, ay: 1.1, sp: 0.42, ph: 1.7 });  // far, soft depth-blur
  add(component, 15, 9, 300, 170, 0, 46, 4, -15, { ax: 1.0, ay: 1.4, sp: 0.6, ph: 3.1 });     // near, crisp
  const lineGeo = new THREE.BufferGeometry(); const lp = new Float32Array(12);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const line = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x3a86a8, transparent: true, opacity: 0, depthWrite: false }));
  line.renderOrder = 0; group.add(line);
  const C = new THREE.Vector3(), f = new THREE.Vector3(), rt = new THREE.Vector3(), uu = new THREE.Vector3(), tmp = new THREE.Vector3(), anchor = new THREE.Vector3();
  let placed = false, op = 0;
  function place(b) {                                  // frame the cards in the Hero beat's camera view
    if (!b || !b.cam || !b.look) return;
    C.set(b.cam[0], b.cam[1], b.cam[2]);
    f.set(b.look[0] - C.x, b.look[1] - C.y, b.look[2] - C.z).normalize();
    uu.set(b.up?.[0] ?? 0, b.up?.[1] ?? 1, b.up?.[2] ?? 0);
    rt.copy(f).cross(uu).normalize(); uu.copy(rt).cross(f).normalize();
    for (const cd of cards) cd.base.copy(C).addScaledVector(f, cd.depth).addScaledVector(rt, cd.ox).addScaledVector(uu, cd.oy);
    anchor.copy(C).addScaledVector(f, 60).addScaledVector(rt, -20).addScaledVector(uu, -3);   // the statement, lower-left
    placed = true;
  }
  function update(active, t, b) {
    op += ((active ? 1 : 0) - op) * 0.06; group.visible = op > 0.01;
    if (!group.visible) return;
    if (active && !placed) place(b);
    if (!placed) return;
    const mx = PREFERS_REDUCED ? 0 : mouse.x, my = PREFERS_REDUCED ? 0 : mouse.y;
    for (const cd of cards) {
      const dx = PREFERS_REDUCED ? 0 : Math.sin(t * cd.drift.sp + cd.drift.ph) * cd.drift.ax;
      const dy = PREFERS_REDUCED ? 0 : Math.cos(t * cd.drift.sp * 0.8 + cd.drift.ph) * cd.drift.ay;
      const pf = cd.depth / 58;
      tmp.copy(cd.base).addScaledVector(rt, dx + mx * 3.0 * pf).addScaledVector(uu, dy - my * 3.0 * pf);
      cd.m.position.copy(tmp); cd.m.lookAt(C); cd.m.material.opacity = op * 0.95;
    }
    const a = cards[0].m.position, c = cards[2].m.position;
    lp.set([anchor.x, anchor.y, anchor.z, a.x, a.y, a.z, anchor.x, anchor.y, anchor.z, c.x, c.y, c.z]);
    lineGeo.attributes.position.needsUpdate = true; line.material.opacity = op * 0.3;
  }
  return { update };
})();

// ---- Placeable extruded 3D text (Ogg) ---------------------------------------
// Lights are added only for the standard-material text — the particle shaders
// ignore them. Emissive + bloom make the letters glow; the directional light
// catches the bevels/extrusion so they read as solid 3D.
scene.add(new THREE.AmbientLight(0x4a5a6a, 1.1));
const _textKey = new THREE.DirectionalLight(0xbfe6ff, 1.6); _textKey.position.set(40, 80, 120); scene.add(_textKey);
const text3d = createText3D();
scene.add(text3d.group);
text3d.restore();                 // re-place saved texts (meshes build once the font loads)
text3d.loadFont().then((r) => { const el = document.querySelector('#text-status'); if (el) el.textContent = r.ogg ? 'Ogg loaded ✓' : 'Fallback serif (drop Ogg in public/fonts/)'; });

// Live density control for every void layer — uses draw ranges (instant, no
// rebuild) so you can dial the amount of stars / nodes / energy lines / nebula.
// Runs at startup too, so editing the FX defaults also tunes the published build.
function applyVoidDensity() {
  livingVoid.sgeo.setDrawRange(0, Math.max(0, Math.floor(livingVoid.STAR_N * FX.starFrac)));
  livingVoid.nebMat.uniforms.uNebFrac.value = FX.nebFrac;   // Clouds = nebula density (smooth fade)
}
applyVoidDensity();

// Per-chapter "color world": the network recolors toward the nearest section's
// hue on approach, fading back to neutral cyan between beats. (Placeholder
// palette — swap to real project brand colors in Phase A/C.)
const CHAPTER_COLORS = [0x4fd2ff, 0x9b8cff, 0x36e0c0, 0xff9e7a, 0x7fb4ff, 0xff8fb0, 0xffd27f];

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
  { name: 'Opening', cam: [-56, 2, 120], look: [-11, 59, 42], up: [0, 1, 0], fov: 25, dur: 1.4, desc: 'Landing pages & SaaS interfaces — fly through the work.', img: '', link: '', panel: null },
  { name: 'Hero', cam: [1, 53, 33], look: [192, -55, -56], up: [0, 1, 0], fov: 41, dur: 1.6, desc: '', img: '', link: '', panel: null },
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
const GLOBAL_KEYS = ['starFrac', 'nodeFrac', 'lineFrac', 'nebFrac', 'driftOn', 'fovPunch', 'warpStrength', 'warpLength', 'twinkleOn', 'linesOn', 'nebVisible', 'uiHud', 'uiWaypoints', 'uiCaption', 'uiHint', 'uiScale', 'waveAmp', 'waveSpd', 'waveCoil', 'waveOn', 'waveGrid', 'nebSpd', 'nebWarp', 'nebHue', 'nebEmber', 'nebVig', 'nebGlow', 'lightning', 'glowSpots', 'lightInt', 'lightReach', 'lightRate', 'glowBright', 'glowFlick', 'cursorDrive', 'waterStr', 'waterRad', 'waterAtt', 'waterDisp', 'waterSheen'];
let activePunch = 0;   // 0..1 across a transition, peaks at the midpoint (for FOV punch)
const DEF_FOV = 68, DEF_DUR = 1.6;
// a sensible starter panel for a section: sits at its aim point, fixed orientation
const defaultPanelFor = (b) => ({ pos: b.look.slice(), size: [70, 44], rot: [0, 0, 0], billboard: false });

const SAVE_KEY = 'voidConfig';
// fill in fields that didn't exist in earlier saved versions
function backfillBeat(b) {
  b.fov ??= DEF_FOV; b.dur ??= DEF_DUR;
  b.desc ??= ''; b.img ??= ''; b.link ??= '';
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
  localStorage.setItem(SAVE_KEY, JSON.stringify({ beats, speed: speedMul, smooth, g, version: 6 }));
}
// push the global (saved) FX/UX/transition state into the live scene + DOM
function applyGlobals() {
  applyVoidDensity();
  livingVoid.smat.uniforms.uTwinkle.value = FX.twinkleOn ? 1 : 0;
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
  document.documentElement.style.fontSize = (16 * (FX.uiScale || 1)) + 'px';
}
load();
beats.forEach(ensureBeatFX);   // ensure every beat (incl. defaults) carries a full FX keyframe set
{ // anchor the wave ribbon around the "My Projects" section (now that beats exist)
  const _ai = Math.max(0, beats.findIndex((b) => /projects/i.test(b.name)));
  const la = beats[_ai] && beats[_ai].look;
  if (la) { waveRibbon.group.userData.anchor.set(la[0], la[1], la[2]); waveRibbon.group.position.copy(waveRibbon.group.userData.anchor); }
}

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
  const n = clamp(index + dir, 0, lastIdx());
  if (n === index) return;
  index = n; lastNav = performance.now();
  // start a timed flight into the new section (per-shot duration, scaled by speed)
  const target = index / Math.max(1, lastIdx());
  const dur = (beats[index]?.dur ?? DEF_DUR) / Math.max(0.05, speedMul);
  tween = { from: progress, to: target, t: 0, dur: Math.max(0.15, dur) };
  freeBtn.hidden = index !== lastIdx();
}
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
const HERO_SUBLINE = true;   // Frame 2: set false to show the headline alone (no sub-line)
function resolveCaption(i) {                      // per-section caption text — beat.cap override wins, else the default
  const b = beats[i] || {};
  const isHero = /^hero$/i.test((b.name || '').trim());
  const baseTitle = isHero ? 'From knowing nothing about coding and design.' : (b.name || '');
  const baseDesc = isHero ? (HERO_SUBLINE ? 'Self-taught — everything here, I built.' : '') : 'Placeholder copy — real section content drops in here.';
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
    replayAsset(assetDef('capTitle'));
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
];
const ASSET_KEY = 'voidAssets';
const _aDefault = () => ({ text: null, in: { dur: 900, delay: 120, y: 26, blur: 7, ease: 'out' }, out: { dur: 500, delay: 0, y: -12, blur: 6, ease: 'inout' } });
let assetCfg = {}; ASSET_DEFS.forEach((a) => { assetCfg[a.id] = _aDefault(); });
let assetDof = 6;            // DOF → text blur amount (px) at full defocus
let _domDefocus = 0;
const A_EASE = { out: 'cubic-bezier(0.22,1,0.36,1)', inout: 'cubic-bezier(0.65,0,0.35,1)', back: 'cubic-bezier(0.34,1.56,0.64,1)', linear: 'linear' };
function assetDef(id) { return ASSET_DEFS.find((a) => a.id === id); }
function assetEl(a) { return document.querySelector(typeof a === 'string' ? assetDef(a).sel : a.sel); }
try {
  const raw = localStorage.getItem(ASSET_KEY);
  if (raw) {
    const d = JSON.parse(raw);
    if (d.cfg) for (const id in d.cfg) if (assetCfg[id]) assetCfg[id] = { text: d.cfg[id].text ?? null, in: { ...assetCfg[id].in, ...(d.cfg[id].in || {}) }, out: { ...assetCfg[id].out, ...(d.cfg[id].out || {}) } };
    if (typeof d.dof === 'number') assetDof = d.dof;
  }
} catch (e) { /* keep defaults */ }
function saveAssets() { try { localStorage.setItem(ASSET_KEY, JSON.stringify({ cfg: assetCfg, dof: assetDof })); } catch (e) {} }
function applyAssetText(a) { if (!a.editable) return; const el = assetEl(a), t = assetCfg[a.id].text; if (el && t != null && t !== '') el.textContent = t; }
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
  for (const a of ASSET_DEFS) { const el = assetEl(a); if (!el) continue; applyAssetText(a); el._as = 'out'; el.style.transition = 'none'; el.style.opacity = '0'; el.style.transform = `translateY(${assetCfg[a.id].out.y}px)`; }
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
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap retina: fewer fragments, big fill-rate win
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  if (bloom) bloom.setSize((window.innerWidth / 2) | 0, (window.innerHeight / 2) | 0);
  livingVoid.nebMat.uniforms.uA.value = window.innerWidth / window.innerHeight;
  livingVoid.sizeRT();                            // keep the half-res raymarch target in sync
  if (water) water.sizeSim();
});

// ---- Depth-of-field + gentle motion blur (kept subtle to avoid sickness) ----
try {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bokeh = new BokehPass(scene, camera, { focus: 200, aperture: FX.dofAperture, maxblur: FX.dofBlur });
  composer.addPass(bokeh);
  bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), FX.bloomStrength, 0.7, 0.22); // threshold .22 → only bright nodes glow, not the nebula
  composer.addPass(bloom);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.setSize((window.innerWidth / 2) | 0, (window.innerHeight / 2) | 0);  // half-res bloom — ~4x cheaper, looks ~identical (it's blurred anyway)
} catch (e) { composer = null; console.warn('Postprocessing disabled:', e); }

// ---- Water swipe — GPU wave-equation sim refracting the scene, per-section ----
//  (ported 1:1 from demo-water-trail.html). Half-float ping-pong sim; the final
//  composer pass refracts the rendered scene by the wave gradient. Calm = passthrough.
if (composer && !PREFERS_REDUCED) try {
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
  ];
  for (const [id, get, set, fmt] of globalRows) {
    const inp = document.querySelector('#fx-' + id), out = document.querySelector('#fx-' + id + '-v');
    if (!inp) continue;
    inp.value = get();
    if (out) out.textContent = fmt(parseFloat(inp.value));
    inp.addEventListener('input', () => { const v = parseFloat(inp.value); set(v); if (out) out.textContent = fmt(v); });
  }

  const chk = (id, key, fn) => { const el = document.querySelector('#fx-' + id); if (!el) return; el.checked = !!FX[key]; el.addEventListener('change', () => { FX[key] = el.checked; fn(el.checked); }); };
  chk('twinkle', 'twinkleOn', (v) => { livingVoid.smat.uniforms.uTwinkle.value = v ? 1 : 0; });
  chk('drift', 'driftOn', () => {});
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
function curCapIdx() { return _capShown >= 0 ? _capShown : index; }   // caption text edits the section you're currently on
function loadAssetFields() {
  if (!asEl) return;
  const list = document.querySelector('#as-list');
  if (list && !list._filled) { list.innerHTML = ASSET_DEFS.map((a) => `<option value="${a.id}">${a.label}</option>`).join(''); list._filled = true; }
  if (list) list.value = asSel;
  const def = assetDef(asSel), c = assetCfg[asSel];
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
    scale.addEventListener('input', () => { const v = parseFloat(scale.value); FX.uiScale = v; document.documentElement.style.fontSize = (16 * v) + 'px'; if (scaleOut) scaleOut.textContent = v.toFixed(2) + '×'; });
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
    d.rz = Math.round(THREE.MathUtils.radToDeg(tmp.rotation.z));
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
  if (!hk) return;
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
  meteors.update(dt, !editMode && !freeRoam && index === 0);   // falling stars on the start frame only
  heroFragments.update(!editMode && !freeRoam && /^hero$/i.test(beats[index]?.name || ''), t, beats[index]);   // glass fragments at the Hero beat
  {                                          // neon wave ribbon — drift + warp around its section
    const w = waveRibbon;
    w.uniforms.uTime.value = t; w.uniforms.uAmp.value = FX.waveAmp; w.uniforms.uSpd.value = FX.waveSpd; w.uniforms.uCoil.value = FX.waveCoil;
    w.group.visible = FX.waveOn; w.grid.visible = FX.waveOn && FX.waveGrid;
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
    livingVoid.setTint(CHAPTER_COLORS[bi % CHAPTER_COLORS.length], s);
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
  } catch (e) { if (!animate._aerr) { console.error('[assets]', e); animate._aerr = 1; } }

  // "visit live" button for the section currently in view (play mode only)
  const cur = beats[index];
  if (!editMode && !freeRoam && cur && cur.link) { visitBtn.hidden = false; visitBtn.href = cur.link; }
  else visitBtn.hidden = true;

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
