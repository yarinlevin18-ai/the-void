# BACKGROUND.md — the "living void" environment spec

> How the background should look & behave. Reference implementation:
> **`demo-living-void.html`** (open it — it IS the spec; match its feel).
> Built into the real scene via `/fx background reactivity`. Companion to ENVIRONMENT.md.

## Goal
The void must feel alive, never flat-black and never static. Achieved by layering
several slow, out-of-phase motions + glow + a colored nebula. Restraint still
applies: the background supports the content; nodes/lines stay the focal read.

## Locked decisions
- **No cursor-follower light.** (Removed — the bright sprite was distracting.)
  The field may still gently *lean* toward the mouse (subtle parallax), but draws
  no glowing cursor blob.
- Palette stays cool data-space: cyan / white nodes with ~12% **ember-orange**
  accents; nebula in teal + a touch of violet + ember.

## Layers (all run together)

### 1. Animated nebula background (replaces flat black)
- Full-screen quad rendered FIRST (renderOrder -10, depthTest/Write off), living
  INSIDE the main scene so post-processing composes it correctly.
- Fragment shader = layered value-noise **fbm** (5 octaves) drifting slowly over
  time; mixes a dark base with teal / violet / ember bands; soft radial vignette
  so edges fall to dark.
- Colors (linear-ish): base `vec3(0.012,0.020,0.030)` · teal `(0.05,0.17,0.24)` ·
  violet `(0.11,0.06,0.20)` · ember `(0.22,0.09,0.03)`.
- Drift speed ~ `uTime*0.03`. **Keep it subtle** — it's a backdrop, not the star.

### 2. Nodes (points)
- Custom ShaderMaterial, additive, soft round dots. Per-node **twinkle**
  (`0.55+0.45*sin(uTime*1.6 + aPhase)`), random scale, size-attenuated.
- ~750 nodes in the demo; in production use **instancing** and cap by device.

### 3. Organic drift
- Each node orbits its home position via layered sines (per-axis random
  amplitude 4–18, freq 0.2–0.8, phase). Reads as a churning nebula, not a
  rotating block. (Production: prefer GPU/curl-noise so the CPU loop scales.)

### 4. Energy lines
- Connections between nearby nodes (threshold ~70u, max ~3 per node). Custom
  shader: slow **form/dissolve** alpha (`0.10+0.18*sin(uTime*0.35+phase)`) + a
  bright **pulse travelling A→B** (`fract(uTime*0.22+phase)`). Endpoints follow
  the moving nodes. Use `meshline` for thickness in production.

### 5. Bloom
- `postprocessing` UnrealBloom. **threshold ≈ 0.22** so only bright nodes glow —
  the nebula must NOT bloom (keeps it clean). Strength ~1.0 default.

### 6. Warp burst (section transitions)
- On beat change: nodes grow + stretch, bloom spikes (+~0.9), camera punches
  forward, then decays (`warp *= 0.94`). This is the "flying" feel; tie it to the
  flight's beat-enter, plus the void recolor toward the project's brand.

## Tunables (expose while authoring; bake final values after)
| Control        | Range      | Default |
|----------------|-----------|---------|
| bloom strength | 0 – 2.5   | ~1.0    |
| nebula intensity | 0 – 1.6 | ~1.0 (start lower if it competes) |
| twinkle        | on/off    | on      |
| organic drift  | on/off    | on      |
| energy lines   | on/off    | on      |

## Performance & accessibility
- Instanced points; `pixelRatio ≤ 2`; cap node/line counts on mobile/low-GPU.
- `prefers-reduced-motion` → freeze drift/twinkle/warp, keep a static nebula.
- Target 60fps on a mid laptop; profile after wiring bloom (it's the heaviest pass).

## Do / Don't
- DO layer multiple slow out-of-phase motions; DO keep the nebula dim and the
  nodes bright.
- DON'T re-add a cursor-follower light; DON'T let the nebula bloom; DON'T make
  drift fast/uniform (kills the organic feel).
