---
description: Build "The Void" atmosphere — port the approved chrome wave ribbon + reactive volumetric nebula from the demos into the real Three.js site.
argument-hint: "[which layer, e.g. 'nebula' | 'stars' | 'wave ribbon' | 'cursor reactivity' | 'all']"
---

You are continuing **"The Void"** (Yarin's 3D scroll portfolio). This command captures
the atmosphere work locked in today. Build it into the real app — do not redesign it.

## 0. Load context first (always)
- `CLAUDE.md` (locked decisions, file map), `BACKGROUND.md`, `ENVIRONMENT.md`, `FX-IDEAS.md`.
- The **source-of-truth demos** (study, then port their shaders/values 1:1):
  - `demo-wave-ribbon.APPROVED.html` — the locked neon wave ribbon (chrome).
  - `demo-nebula.html` — the reactive volumetric nebula + starfield.
- Then read `src/main.js` to see the current v0.7 build you're integrating into.

## 1. Non-negotiable direction (do not drift)
- Dark void; palette = `BACKGROUND.md` (base `vec3(0.012,0.020,0.030)`, teal `(0.05,0.17,0.24)`,
  violet `(0.12,0.06,0.22)`, ember `(0.22,0.09,0.03)`). Bloom **threshold 0.22** (nebula must NOT bloom, only bright cores/stars/wave).
- Vanilla JS + Vite + Three.js (r0.169). No React. `references/` is study-only.
- Type: Ogg / Acumin Pro / Source Code Pro (kit `xan5bdy`).
- Director Mode (`E`) must NOT ship in production.

## 2. What was locked TODAY (port exactly from the demos)

### A. Neon wave ribbon — `demo-wave-ribbon.APPROVED.html`
- A contained band (`PlaneGeometry(620,80,240,14)`) that displaces by traveling sines
  (`uAmp`/`uSpd`/`uCoil`) and **drifts in a bounded Lissajous path** around a section.
- **Liquid-glass / holographic chrome interior** (`FILL_FRAG`): analytic surface normal
  from the displacement → **fresnel rim**, **thin-film iridescence**, sweeping **specular glint**;
  cool steel base `mix(chrome,irid,0.7)`. `side:FrontSide` + additive (single-sided — no front/back pile-up).
- Optional crisp neon **wireframe grid** (`FRAG`) — OFF by default (toggle).
- Blends into the void: feathered long-edges AND ends, palette tied to nebula, bloom `1.1/0.7`.
- Perf guardrails learned today: single-sided fill, lighter mesh, narrow bloom radius, `pixelRatio ≤ 1.75`, calm drift.

### B. Volumetric nebula + starfield — `demo-nebula.html`
- **Nebula**: full-screen quad, `renderOrder -10`, depthTest off. **Domain-warped fbm** (folds through
  itself) in the locked palette; ember veins on the warp field; soft bright cores that bloom; vignette.
  Controls: density / drift / warp / hue(teal↔violet) / ember.
- **Stars = a 3D VOLUME you fly through** (the key fix — not a 2D layer):
  distributed through `DEPTH=1800`, streamed toward the camera and **wrapped endlessly** in the
  vertex shader; depth-driven size + fade (near = big/bright, far = small → haze).
  Per-star **magnitude spread** (rare bright), **colour temperature** (warm/white/cool),
  sharp core + halo, **4-point diffraction spike on the brightest only**, de-synced twinkle.

### C. Cursor reactivity (one smoothed velocity value drives everything)
- Cloud **flows toward** the cursor (domain-warp offset) + glows there; **velocity raises turbulence**.
- **Ripple**: fast flick fires an expanding ring (decays ~2.5s).
- **Stars** near the pointer brighten + scatter outward (scaled by velocity).
- **Camera** parallax toward cursor + subtle shake on fast motion.
- **All of it is exposed in a "Cursor FX" panel**: master toggle + `cloud flow+glow`, `star reaction`,
  `ripple on flick`, `parallax/shake`. Preserve these as tunable params (config object, not magic numbers).

## 3. How to work
- **Do `$ARGUMENTS`.** If empty, port the whole atmosphere (nebula → stars → wave ribbon → cursor reactivity), one layer at a time, runnable after each.
- Lift shader code/values **verbatim** from the demos; only adapt wiring to `src/main.js`
  (single scene, the existing bloom composer, the BEATS camera — the nebula stars stream in *addition* to flight).
- Expose the tunables (wave: amp/spd/coil/grid; nebula: density/drift/warp/hue/ember; cursor: the 4 sliders)
  as a small config object so they're easy to set per-chapter later (chapter recolor = lerp the climate).
- Keep 60fps on a mid laptop: instanced/point stars, `pixelRatio ≤ 1.75`, bloom threshold 0.22, radius ~0.7.
  Add `prefers-reduced-motion` + low-GPU fallback (fewer stars, drop ripple/shake).
- After each layer: say what changed + how to verify (hard-refresh if HMR is flaky). Flag anything needing Yarin.
- When a layer is locked in the real build, update `BACKGROUND.md`/`FX-IDEAS.md` to match.

Task: **$ARGUMENTS**
