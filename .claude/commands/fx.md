---
description: Build the interaction & effects layer for "The Void" — cursor, headline, panels, and the background void — per the agreed plan.
argument-hint: "[layer/task, e.g. 'cursor system', 'panel reveals', 'background reactivity', or 'all']"
---

Implement the **interaction & effects system** for "The Void". Make effects act on
THREE targets together so the whole scene feels alive: the **cursor**, the
**content panels**, and the **background void itself**.

## 1. Load context first
- `CLAUDE.md`, `ENVIRONMENT.md`, `BACKGROUND.md`, `PRD.md`, `BUILD_PLAN.md` (source of truth).
- `src/main.js` (current v0.7 Director Mode build).
- The two demos define the INTENDED FEEL — mirror them, don't reinvent:
  `demo-asset-reveal.html` (one project beat), `demo-effects.html` (reveal/
  cursor/transition styles), and `demo-living-void.html` (the background — see BACKGROUND.md).
- `references/` is study-only (git-ignored). `npm install` real packages; never import from `references/`.

## 2. Locked direction (don't drift)
Dark void · type: Ogg / Acumin Pro / Source Code Pro (kit in index.html) ·
vanilla JS + Vite + Three.js · editor (E) must NOT ship in production ·
restraint: one focal point per beat.

## 3. The effect targets

### A. Cursor (reacts to everything)
- Custom **ring + dot** follower (dot instant, ring eased) with grow-on-hover and
  **magnetic** pull on interactive elements (CTAs, project panels).
- Model on **Cuberto `mouse-follower`** (`references/mouse-follower`, `references/customcursor`).
- The cursor also drives the panel and background reactions below.

### B. Panels (the content)
- Reveal on beat-enter (pick per the playground; default: title **Decode**, image
  **scan-line sweep** or displacement). Headline split + masked reveal via **GSAP
  SplitText** (free in GSAP 3.13+). Image distortion via `references/hover-effect`
  or `references/curtainsjs`.
- Cursor reactivity: panel parallax-tilts toward the cursor; subtle hover glow;
  magnetic CTA. On departure, reverse the reveal.

### C. Background void (reacts too — this is the new ask)
- **Cursor-reactive field:** points/lines near the cursor brighten and lean
  toward it; the whole field parallax-tilts a few degrees to the mouse; a soft
  "cursor light" ripples through nearby nodes.
- **Energy lines:** glowing connections (`meshline`) with light flowing along
  them; nearby lines reach toward the cursor and toward the active panel.
- **Bloom** (`postprocessing` UnrealBloom/SelectiveBloom) so all of the above glows.
- **Chapter reactivity:** lerp the void's color to the active project's brand on
  approach; density/turbulence rises near a project, calm at the Hero.

### D. Section transitions (between beats)
- Flash + camera punch + the void **swirls and recolors**, then settles — exactly
  the `demo-effects.html` "Section transition" button. Pair with a particle
  dissolve (`three.quarks`).

## 4. Libraries (npm — install as needed)
`gsap` (incl. free SplitText), `postprocessing`, `meshline`, `three.quarks`,
optionally `@cuberto/mouse-follower`, `curtainsjs`, `splitting`. Study the matching
folders in `references/`.

## 5. How to work
- Do only what `$ARGUMENTS` asks; if empty, propose the order (suggest: cursor →
  background reactivity + bloom → panel reveals → transitions) and stop.
- One layer per pass, keep it runnable (`npm run dev`), QA, report, stop for review.
- Respect the **performance budget** (instanced points, pixelRatio ≤ 2, 60fps mid
  laptop, lighter on mobile) and **accessibility** (`prefers-reduced-motion`
  disables heavy motion; keep a hidden native-cursor fallback; content reachable).
- Keep all of this out of the production editor build.

Task: **$ARGUMENTS**
