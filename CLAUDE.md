# CLAUDE.md — context for "The Void" portfolio

Read this first. It captures the locked decisions and where everything lives so
you can pick up the build with full context.

## What this is
A 3D, scroll-driven portfolio — the visitor **flies through a dark "void"** of
drifting data-points + connecting lines; sections (Hero → My Projects hub →
Project 1 → Project 2 → Projects 3&4 → Final/Contact) are camera "beats" along a
flight path. The medium IS the message: it proves Yarin can build motion-led
landing pages & SaaS interfaces. Audience: hiring teams + clients.

**Source-of-truth docs (read these):**
- `PRD.md` — product requirements, goals, audience, content plan.
- `BUILD_PLAN.md` — phased execution plan (A→G). Start work from here.
- `PLAN.md` — original concept + decisions log + storyboard.

## Locked decisions
- **Visual direction: DARK void** (near-black/teal-navy), glowing cyan/white
  data-points + lines. (Not the earlier light/airy variant.)
- **Type system (Adobe Fonts):**
  - Headline / wordmark → **Ogg** (luxury calligraphic serif)
  - Body / UI → **Acumin Pro**
  - Mono / HUD labels → **Source Code Pro**
  - Embed kit (one link): `https://use.typekit.net/xan5bdy.css`
  - CSS stacks: `"ogg",serif` · `"acumin-pro",sans-serif` · `"source-code-pro",monospace`
  - NOTE: `src/style.css` currently also has a local `@font-face` for "Ogg"
    pointing at `/fonts/Ogg-Roman.woff2`. Pick ONE approach — the Adobe kit link
    (no files needed) OR drop real Ogg files in `public/fonts/`. Don't ship both.
- **Navigation:** section-snapping flight (scroll/arrows fly to the next composed
  camera shot). Per-shot FOV + duration; straight-between-beats position with
  quaternion-slerp orientation; final beat looks straight up.
- **Editor:** a built-in "Director Mode" (press **E**) — free-fly, manage
  sections, drag camera/aim gizmos, timeline, undo/redo, save/copy config.

## Current state
- `src/main.js` (~1,140 lines) = v0.7 "Director Mode". Vanilla JS + Three.js + Vite.
- Path/camera config persists in **localStorage** (`voidConfig`). Use the editor's
  **Copy config** to export the `BEATS` array and paste it into `DEFAULT_BEATS`
  in `src/main.js` to make tuning permanent in the repo.
- `package.json` deps: `three`, `meshline`, `three.quarks`, `vite`.

## Run
```
npm install
npm run dev      # http://localhost:5173
```
HMR can be flaky over this drive — hard-refresh (Ctrl+Shift+R) if a change
doesn't show.

## references/  (read-only — study & lift, do NOT import as project deps)
Cloned libraries/source for reference. For the big ones, `npm install` the
package instead of importing from here.
- Camera/flight: `three-story-controls`, `camera-controls`, `theatre`, `lenis`
- Look/FX: `postprocessing` (bloom), `THREE.MeshLine`, `three.quarks`,
  `ShaderParticleEngine`, `lygia` (shaders)
- Text: `troika` (in-3D text), `SplitType` (text reveals)
- Interaction: `hover-effect` (panel distortion), `cursor-magnetic-demo`
- Helpers: `maath`, `tweakpane`
(Three of them carry a stray empty `.git` that can't be deleted from the mount —
ignore.)

## Next work (from BUILD_PLAN — do in order)
1. **Phase A — content:** confirm the 4 featured projects + assets (see PRD §6).
2. **Phase B:** place real content (panels/previews/live links + My Projects hub + contact).
3. **Phase C:** the void atmosphere — connecting **lines + flowing energy
   (MeshLine) + UnrealBloom**, and the **adaptive brand-color recolor** on approach.
4. **Mobile/touch** navigation (currently wheel+keys only — unusable on phones).
5. **Accessibility:** `prefers-reduced-motion` + low-GPU fallback.
6. **Before ship:** strip/disable Director Mode (`E`) so visitors can't open it.

## Conventions / guardrails
- Keep it vanilla JS + Vite + Three.js unless there's a strong reason to add React.
- Don't gold-plate Director Mode further — prioritize content + ship.
- Keep the editor out of the production build.
- `font-specimen*.html` and `references/` are scratch/reference — not part of the site.
