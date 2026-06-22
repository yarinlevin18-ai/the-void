# ENVIRONMENT.md — making the void feel alive, cohesive & interactive

> How to evolve the void from a static point/line field into a living world.
> Companion to PRD.md / BUILD_PLAN.md. Build in layers, in order; tune each one
> alone in Director Mode (E) before moving on. (PRD Phase 4.)

## The principle
- **Cohesion = one rulebook.** Everything obeys the same palette, depth model,
  motion cadence, and reactivity. Don't add effects ad-hoc.
- **Interactivity = reacting to a few inputs, consistently.** Drive the whole
  environment from just these:
  1. **Flight progress / chapter** → palette, density, calm↔busy energy.
  2. **Cursor** (live) → proximity glow, parallax tilt, ripple.
  3. **Idle baseline** → drift/twinkle so it's alive even when still.
- **Restraint** (per the Noomo storytelling read): one focal point per beat; the
  environment supports the content, never fights it.

## Build order (each layer = one `/void` session; keep it runnable)

### Layer 1 — Depth & atmosphere
Parallax point layers (near / mid / far) moving at different rates; exponential
fog for falloff; **UnrealBloom** so bright points/lines glow.
**Done when:** it reads as deep space with real depth, not a flat starfield.
Powered by: `postprocessing` (bloom), `maath` (distributions).

### Layer 2 — Living lines (the "electric" connections)
Replace static lines with **MeshLine** + a scrolling gradient/UV so energy flows
along them; lines fade/draw-in as the camera approaches; gentle pulse.
**Done when:** the lines read as moving energy, not static wires.
Powered by: `meshline`, bloom from Layer 1.

### Layer 3 — Cursor reactivity (biggest "interactive" win)
Nodes near the cursor brighten and link to it; subtle attract/repel + ripple on
move; the whole field parallax-tilts a few degrees toward the mouse.
**Done when:** moving the mouse visibly stirs the void.
Powered by: raycaster/proximity + `maath` lerp; (study `references/cursor-magnetic-demo`).

### Layer 4 — Chapter reactivity (the adaptive palette)
On approach to a project, lerp the void's point/line colors to that project's
brand, then fade back on departure; density/turbulence rises near a project,
calm at the Hero.
**Done when:** each chapter has its own distinct "climate."

### Layer 5 — Idle life
Slow drift, twinkle, and an occasional **lightning arc** between nearby nodes.
**Done when:** the scene never looks frozen when the user is still.
Powered by: `three.quarks`, three.js `LightningStrike` addon.

### Layer 6 — Transitions between chapters
A particle dissolve / whoosh hand-off between beats instead of a plain glide.
**Done when:** chapter changes feel cinematic, not mechanical.
Powered by: `three.quarks`, bloom.

### Layer 7 — Sound (optional, opt-in)
Low ambient hum that swells on transitions; muted by default, visible toggle.
**Done when:** sound deepens the dive and never autoplays/annoys.

## Performance budget (don't skip — it gates ship)
- GPU **instanced** points; cap particle counts; `pixelRatio ≤ 2`.
- Target 60fps on a mid laptop; lighter particle count / simpler shaders on
  mobile + low-GPU. Profile after each layer.

## How to judge "fitting"
- Fly the whole path in Director Mode after each layer — does the new layer serve
  the story, or distract? Cut anything that fights the focal point.
- Keep comparing against the references (Noomo storytelling, Codrops demos).
