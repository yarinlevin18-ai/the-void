---
description: Build the section "water swipe" ripple effect into The Void — a real wave-equation sim the cursor disturbs, with a tuning panel. Port 1:1 from the approved demo.
argument-hint: "[target, e.g. 'My Projects section' | 'demo only' | 'integrate into src/main.js']"
---

You are continuing **"The Void"** (Yarin's 3D scroll portfolio). Build the **interactive water
ripple** that disturbs a section when the cursor swipes over it. It is APPROVED — port it
exactly, do not redesign the look or the math.

## 0. Load context first (always)
- `CLAUDE.md`, `BACKGROUND.md`, `ENVIRONMENT.md`, `FX-IDEAS.md`.
- **Source of truth (copy the shaders + values verbatim):** `demo-water-trail.html`.
- Study-only reference it was ported from (do NOT import — jQuery/raw-WebGL):
  `references/jquery.ripples/src/main.js`.
- Then read `src/main.js` to see where it integrates.

## 1. The technique (must match the demo exactly)
A GPU **wave-equation simulation** in a ping-pong render target, refracting the section behind it.

- **Sim buffer:** two `WebGLRenderTarget`s, `type: THREE.HalfFloatType`, `LinearFilter`,
  `ClampToEdgeWrapping`. Channels: **R = height, G = velocity**. Run the sim at **half-res**
  (`SIM = 0.5`) for performance; clear both buffers to zero on init/resize.
- **Update shader** (ported from jquery.ripples): neighbour-average of R over ±delta in x/y, then
  `info.g += (avg - info.r) * 2.0;  info.g *= uAtt;  info.r += info.g;` (verlet + damping →
  ripples propagate, interfere, reflect off edges, settle).
- **Drop injection:** a smooth cosine splash along the cursor **stroke segment** (distance to the
  segment prevPointer→pointer, aspect-corrected), added to R while the pointer is inside:
  `dd = 1 - clamp(d/uRad,0,1); drop = 0.5 - 0.5*cos(dd*PI); info.r += drop*uStr*uDown;`
- **Display shader:** sample the section to a texture, take the sim's height **gradient**
  (`vec2(hr-hl, hu-hd)`), refract the section by it with a slight **chromatic split**
  (`r:1.05, g:1.0, b:0.95`), and add a **specular sheen** from the wave normal
  (`normalize(vec3(-grad*120.,1.))`, light dir `(-0.5,0.6,1.)`, `pow(...,16)`) plus a faint cool
  wake edge `vec3(0.3,0.6,1.0)*length(grad)`.
- Render order per frame: **1)** section → texture, **2)** sim step (read B → write A → swap),
  **3)** display to screen.

## 2. EXACT default settings (preserve these — they are the approved tuning)
| param | uniform | default | range |
|---|---|---|---|
| drop strength | `uStr`   | **0.18**  | 0.02 – 0.5 |
| drop radius   | `uRad`   | **0.018** | 0.004 – 0.05 |
| damping/trail | `uAtt`   | **0.992** | 0.95 – 0.999 |
| distortion    | `uDisp`  | **0.22**  | 0 – 0.6 |
| sheen         | `uSheen` | **1.0**   | 0 – 2 |
| sim res scale | `SIM`    | **0.5**   | (perf) |

Chromatic split `1.05 / 1.0 / 0.95`, specular exponent `16`, accel `*2.0`. Do not change these
unless Yarin asks.

## 3. Build a tuning PANEL (required)
Reproduce the demo's panel — a fixed top-right card (mono `source-code-pro` labels, `#9fd0ff`
accent) with range sliders wired to the live uniforms, exactly these five:
**drop strength, drop radius, damping (trail), distortion, sheen.** Keep it a self-contained,
easily-removable block (same pattern as Director Mode) — it must NOT ship in the production build,
but stays available in the demo / dev.

## 4. Direction & guardrails (do not drift)
- Vanilla JS + Vite + Three.js (r0.169), no React. `references/` is study-only — never import it.
- Tie the refraction/sheen tint to the **BACKGROUND.md palette** (teal/violet); the water effect
  must read as part of the void, not a generic blue ripple.
- The thing being refracted is the live **section** (nebula + content), not a static image.
- Perf: keep `SIM = 0.5`, half-float; hold 60fps. Add a `prefers-reduced-motion` / low-GPU path
  that disables the sim and renders the section flat.
- **Demo-first rule:** if `$ARGUMENTS` is empty or "demo only", reproduce/refine `demo-water-trail.html`
  and stop for review. Only integrate into `src/main.js` when explicitly asked — keep it runnable,
  report what changed and how to verify (hard-refresh if HMR is flaky).
- When locked in the real build, update `FX-IDEAS.md` / `BACKGROUND.md` to record it.

Task: **$ARGUMENTS**
