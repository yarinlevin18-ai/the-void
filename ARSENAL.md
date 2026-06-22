# ARSENAL — vetted tools & techniques for "The Void"

> Research distilled from a web/GitHub sweep (2026-06). Stack target: **vanilla JS
> + Vite + Three.js r0.169**, dark data-void, no React. Versions/licenses verified.
> Pairs with `fx.md` (the effects-layer plan).

## ⚠️ License flags (read before shipping)
- **LYGIA** shader lib → **Prosperity 3.0.0 = NON-commercial** (30-day commercial trial). Don't ship it. Lift the *math* or use permissive equivalents.
- **Theatre.js** `@theatre/studio` = **AGPL-3.0** (core is Apache-2.0). Avoid — Director Mode already covers it.
- **Codrops pixel-reveal repo** (J0SUKE) = **no stated license** → reimplement, don't copy verbatim.
- **Codrops dreamy-particles** → MIT by convention, **verify the LICENSE file** before lifting.
- ✅ Confirmed permissive & safe to use: `postprocessing` (Zlib), `meshline` (MIT), `three.quarks` (MIT), GSAP + all plugins (free as of 3.13), Lenis (MIT), camera-controls (MIT), troika-three-text (MIT), Line2/LineSegments2 + GPUComputationRenderer (MIT, built into three).

## Version pins (safe with three@0.169)
```
postprocessing@6.39.1      # peer: three >=0.168 <0.185  ✅
three.quarks@0.16.0        # 0.17+ needs three >=0.182 — DO NOT bump
meshline@3.3.1             # MIT
gsap@^3.13                 # SplitText/ScrambleText now FREE, commercial OK
troika-three-text@^0.52    # peer: three >=0.125  ✅ (needs .woff binary, not Typekit CSS)
```

---

## Camera / scroll / feel
- **Lenis (MIT)** — highest-ROI feel upgrade; smooth momentum scroll over wheel+touch. Drives our `progress` value; doesn't touch the slerp. Also handles `prefers-reduced-motion`.
- **GSAP + ScrollTrigger (free)** — `scrub`+`snap` for pro per-beat easing. **Rule: drive a single `progress` scalar and run our `quaternion.slerp` in `onUpdate`** — never tween quaternion x/y/z/w directly (gimbal/wobble).
- **GSAP `Observer`** — unifies wheel + touch + trackpad into one input → **fixes the open mobile/touch-nav TODO** in one pass.
- **camera-controls (MIT)** — for Director free-fly + "click a project → eased `setLookAt`". Use only for editor/discrete jumps; never run it on the main flight camera at the same time as the slerp.
- **CatmullRomCurve3 (built-in)** — zero-dep path-flight; matches our current model.

## Post-FX stack (fixes the BokehPass problem)
Use **pmndrs `postprocessing`** with an HDR HalfFloat buffer:
1. `RenderPass`
2. **`DepthOfFieldEffect`** (own pass) — CoC-from-depth DOF; `bokehScale 3–5`, tight `worldFocusRange`, drive `worldFocusDistance` from the current beat. *This keeps the focal cluster sharp — the thing BokehPass failed at.*
3. **`EffectPass`** merging (one fullscreen shader): `SelectiveBloomEffect` (emissive >1, `luminanceThreshold ~1.0`, `mipmapBlur`, only points/lines glow) → tiny `ChromaticAberrationEffect` → `VignetteEffect` (~0.5) → `NoiseEffect` (~0.08, kills banding on dark gradients).
4. Optional: `GodRaysEffect` at the final beat only.
- `renderer.toneMapping = ACESFilmicToneMapping`. Reduced-motion/low-GPU: drop to bloom-only + lower `resolutionScale`.
- `npm i postprocessing@6.39.1` (do NOT also run a second `three/addons` composer).

## Lines / particles / data-flow
- **`LineSegments2` + `LineMaterial` (built-in, MIT, zero dep)** — render the *entire* ~480-edge network as ONE instanced draw call with real thickness + glow. **Biggest line win.** Remember `material.resolution.set(w,h)` and update on resize, or width breaks.
- **`meshline@3.3.1` (MIT)** — surgical use on a *few* hero edges needing taper + animated `dashOffset` ("data flowing"). One mesh per edge = heavy, so don't use for all edges. Same `resolution` Vector2 gotcha.
- **`three.quarks@0.16.0`** — `BatchedRenderer` for richer sprite/trail pulses + hero energy bursts. Pinned (0.17+ off-limits).
- **Curl-noise offset** in the Points vertex shader → organic "breathing" drift for ~zero CPU (lift `curl()` math; don't ship LYGIA).
- **`GPUComputationRenderer` (built-in)** — in reserve for a GPGPU flow-field background if CPU drift bottlenecks.

## Kinetic type
- **GSAP SplitText (free, 3.13+)** — backbone for DOM hero + section captions. `mask:"lines"` + `autoSplit`/`onSplit` fixes the Adobe-Fonts late-load reflow bug. Fire from beat-arrival callbacks.
- **soulwire `TextScramble`** (or GSAP `ScrambleTextPlugin`) — decode/type-in for Source Code Pro mono/HUD labels. On-theme.
- **troika-three-text (MIT)** — for 1–2 "wow" in-scene 3D text moments (fogged/bloomed/recolored, flies with the camera). Needs a real `.woff` of Ogg, not the Typekit CSS. Keep body/UI text as DOM overlay.
- Reference: **ScrollBlurTypography (MIT)** — the blur-reveal pattern we already use.

## Steal-these-moments (ranked, impact-for-effort)
1. **Per-beat palette → background/fog/line lerp** (Codrops depth-gallery, MIT) = the Phase-C adaptive recolor, ready to lift.
2. **GSAP cinematic easing presets** (Codrops cinematic-scroll, MIT) on the beat-to-beat camera.
3. **GPGPU flow-field points + selective bloom** (dreamy-particles + three.js selective-bloom example) = the void atmosphere.
4. **`uProgress` shader reveal** — panels resolve from noise/glint on approach (pixel-reveal; reimplement).
5. **GSAP `Observer`** input unification → mobile/touch nav.
- Architecture reference: **Bruno Simon folio-2019 (MIT)** for splitting `main.js` into modules without a framework.

## Source links
- Lenis https://github.com/darkroomengineering/lenis · GSAP https://gsap.com/docs · camera-controls https://github.com/yomotsu/camera-controls
- postprocessing https://github.com/pmndrs/postprocessing (DOF discussion: https://discourse.threejs.org/t/depth-of-field-pmndrs-post-processing/55849)
- meshline https://github.com/pmndrs/meshline · three.quarks https://github.com/Alchemist0823/three.quarks · troika https://github.com/protectwise/troika
- Codrops depth-gallery https://github.com/houmahani/codrops-depth-gallery · cinematic-scroll https://github.com/JosephASG/codrops-cinematic-scroll-animations · dreamy-particles https://github.com/DGFX/codrops-dreamy-particles
- Selective bloom example https://threejs.org/examples/webgl_postprocessing_unreal_bloom_selective.html · folio-2019 https://github.com/brunosimon/folio-2019
