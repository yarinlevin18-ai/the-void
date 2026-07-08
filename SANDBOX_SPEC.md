# SANDBOX_SPEC.md — "The Void" Sandbox

A build spec for Claude Code. Goal: a single combined sandbox where Yarin can
(a) tune the void's visuals/interactions live and (b) stage real assets/content
inside the void before committing anything to the production site.

This is a **scratch tool**, not part of the shipped site (same status as
`demo-*.html` and `font-specimen*.html`). Keep it out of the production build.

---

## 1. What it is

One self-contained page — `void-sandbox.html` at the repo root — served by Vite
(`npm run dev` → http://localhost:5173/void-sandbox.html). It renders the living
void and exposes a control panel that does two jobs at once:

1. **Live FX/scene playground** — sliders + toggles retune the data-points,
   lines, bloom, nebula, fog, color, and camera in real time.
2. **Asset staging** — load Yarin's own images (drag-drop or file picker, plus
   the bundled `public/*.png`) and float them in the void as project panels with
   a glowing frame and a chosen reveal animation.

Everything is driven by a single `state` object that can be exported as JSON
("Copy config") and saved/restored as named presets in `localStorage`.

## 2. Reuse — don't reinvent

The FX already exist in the repo. Lift, don't rewrite:

- **`demo-living-void.html`** — the canonical living void. Take from it:
  - Full-screen animated **nebula** background shader (fbm, teal/violet/ember).
  - **Node field** as a custom `ShaderMaterial` `THREE.Points` with per-point
    `aPhase/aScale/aColor`, additive blending, twinkle, warp uniform.
  - **Connection lines** built by nearest-neighbour pairing (`TH` distance,
    ≤3 links/node) as `LineSegments` with a flowing-pulse fragment shader.
  - **UnrealBloom** via `EffectComposer` (low threshold so only bright nodes
    bloom, not the nebula).
  - Mouse-lean rotation; warp-burst that dollies the camera and spikes bloom.
- **`demo-effects.html`** — asset/content layer. Take from it:
  - Floating **project panel** = textured `PlaneGeometry` + `EdgesGeometry`
    frame + additive radial **glow sprite** + scan **sweep** plane.
  - GSAP **reveal styles**: `resolve / sweep / drop / rise` (panel) and the
    headline reveals if we add a title later.
  - **Recolor-on-approach**: lerp every node color toward a brand color and back
    (the `transition()` tween) — this is the "adaptive brand recolor" from
    CLAUDE.md Phase C.
  - Custom cursor (ring+dot) and magnetic CTA, idle float.

Keep the same stack the rest of the repo uses: **vanilla JS + Three.js r0.169 +
Vite**, no React. The two demos use a CDN importmap; in the sandbox prefer
`import * as THREE from 'three'` and `three/addons/...` so Vite bundles it (the
package is already a dep). GSAP via CDN `<script>` is fine.

## 3. Controls — required set

Group the panel into three collapsible sections.

**A. Void / particles**
- Particle **count** (e.g. 100–3000) — rebuilds the field + lines on change.
- Particle **size**.
- Field **spread**.
- **Drift** on/off + drift **amount**.
- **Twinkle** on/off.
- Link **distance** (`TH`) + **max links/node** — rebuilds lines.
- Line **flow speed**.
- **Nebula** on/off + **intensity**.
- **Fog** density.
- Color **mix** — cyan / white / orange ratios (or 2–3 color pickers).

**B. Bloom / camera / interaction**
- **Bloom** on/off + **strength** + **radius** + **threshold**.
- **Camera mode**: `mouse-lean` · `auto-orbit` · `fly-forward` · `look-up`
  (the final-beat straight-up shot). One active at a time.
- Camera **FOV** + base **distance**.
- **Warp burst** button.
- **Recolor on approach**: brand **color picker** + "Pulse recolor" button
  (and an "auto recolor when asset is centered" toggle).

**C. Assets / content**
- Buttons to load bundled `electric.png`, `particle.png`, `plexus.png`.
- **Drag-drop zone** + file `<input type=file accept=image/*>` for Yarin's own
  images → adds a floating panel.
- Per-asset: **reveal style** dropdown (`resolve/sweep/drop/rise`), **scale**,
  **X/Y/Z position**, **Play reveal**, **Remove**.
- Optional text fields (kicker / title / desc) rendered as an HTML overlay
  beside the panel, to mock a real project section.
- **Idle float** toggle for the active panel.

**Global**
- **Copy config** → JSON of `state` to clipboard.
- **Save preset** (name) / **Load preset** / **Delete preset** via
  `localStorage` key `voidSandbox.presets`. Auto-restore last session.
- **Reset to defaults**.
- FPS / particle-count / link-count **readout**.

## 4. Architecture

- Single `state` object is the source of truth; every control writes into it and
  calls a small `apply*()` function. Reading `state` back out is what "Copy
  config" serializes.
- Split the heavy rebuilds: `buildField()` (count/spread/colors) and
  `buildLinks()` (distance/max) so a slider only rebuilds what it must — don't
  rebuild the whole scene every frame.
- Keep asset panels in an array of small objects
  `{ mesh, frame, glow, sweep, state, reveal() }` so multiple can coexist.
- Render path: `composer.render()` when bloom on, else `renderer.render()`.
- Guard performance: cap `pixelRatio` at 2; warn in the readout if count is high.

## 5. Out of scope (for now)

- No section-snapping flight path (that's the real site / `src/main.js`).
- No Director Mode.
- Don't wire it into `index.html` or the Vite production build — it's a
  standalone scratch page. Add it to `.gitignore`-able scratch if preferred, or
  just leave it alongside the other `demo-*.html` files.

## 6. Done when

- Page loads the living void at 60fps with default settings.
- Every control in §3 visibly changes the scene live.
- Yarin can drag in one of his own images and see it float + reveal in the void.
- "Pulse recolor" repaints the field toward a brand color and settles back.
- "Copy config" yields JSON that, pasted back as defaults, reproduces the look.
- Presets persist across reloads.

---

## 7. Kickoff prompt for Claude Code

> Build `void-sandbox.html` per `SANDBOX_SPEC.md` in this repo. It's a standalone
> Vite-served scratch page (not part of the production build) that combines a
> live FX playground and an asset-staging area for the void.
>
> Reuse the existing code: take the nebula shader, shader-based node field,
> connection-line pulse shader, bloom, and warp from `demo-living-void.html`, and
> the floating project panel (textured plane + frame + glow + sweep), GSAP reveal
> styles, and the brand-recolor tween from `demo-effects.html`. Keep the repo
> stack — vanilla JS, Three.js r0.169 via the installed `three` package + addons,
> Vite, GSAP via CDN. No React.
>
> Implement all controls in §3 (Void/particles, Bloom/camera/interaction,
> Assets/content) driven by one `state` object, with `buildField()` /
> `buildLinks()` split so sliders only rebuild what they must. Support drag-drop
> + file-picker image loading into floating panels with per-asset reveal/scale/
> position/remove. Add Copy-config (JSON to clipboard), named localStorage
> presets with auto-restore, reset, and an FPS/count readout.
>
> Start by reading `SANDBOX_SPEC.md`, `demo-living-void.html`, and
> `demo-effects.html`. Build incrementally and confirm 60fps at defaults. Verify
> against the §6 "Done when" checklist.
