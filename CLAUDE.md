# CLAUDE.md — context for "The Void" portfolio

Read this first. It captures the locked decisions and where everything lives so
you can pick up the build with full context. Last synced to code: **v16, 2026-09-12**.

## What this is
A 3D, scroll-driven portfolio for **Yarin Levin — AI-Native Builder**. The
visitor flies through a dark "void" (a 900-node data network with living energy
links, star parallax, volumetric nebula); sections are camera "beats" along a
flight path. The **v16 flight** (2026-09-12) puts the work first: 11 stops from Hero
straight into Intro → CV → How I Build → five project stops (SaaS first, then
Landing pages) → Contact, each project stop pairing the existing WebGL image
panel with a DOM text block from `profile.js`. v16 replaced v15's seven project
hops: seven identical 1.35s hops flattened the rhythm, so AeroCy and SmartCut
now ride along as compact `also` rows on the TEEPO and SHADIEZ stops. The
dossier overlay, hub, waypoint rail and free-roam are gone — see
`docs/superpowers/specs/2026-09-08-flight-restructure-design.md` for the full
design. Audience: hiring teams (part-time student position) + clients.

**Live:** https://the-void-khaki-pi.vercel.app — Vercel project `the-void`,
repo connected, **push to main auto-deploys** (verified 2026-08-30; the old
`build.sh` bootstrap deploy is gone).

**Source-of-truth docs (read in this order):**
- `docs/superpowers/specs/2026-09-08-flight-restructure-design.md` — the v15
  flight restructure design (approved). **Start here for the current flight.**
- `PORTFOLIO_PLAN.md` — the v13/v14 "person-first" plan, superseded by v15
  (dossier/hub/rail phases marked accordingly); §4b still holds locked bio/CV facts.
- `BUILD_PLAN.md` — the original A→G plan plus the Phase H v15 ledger.
- `CONTENT.md` — locked featured-project table (SHADIEZ · TEEPO · Sabai · Kiara's Club).
- `PRD.md`, `PLAN.md` — original requirements / concept / storyboard (historic).
- `BACKGROUND.md`, `ENVIRONMENT.md`, `FX-IDEAS.md`, `ARSENAL.md` — atmosphere
  layers, environment ideas, effects backlog, tooling notes.

## Locked decisions
- **Visual direction: DARK void**, one color story — navy/cyan is *the* palette.
  Chapter tints per beat carry brand hue (SHADIEZ coastal blue, TEEPO green,
  Sabai/Kiara mustard); the contact beat's ember is the single warm accent.
  Final grade pass = vignette (0.45) + fine grain on every device.
- **Three typefaces:** Bricolage Grotesque (display, `--f-display`), Schibsted
  Grotesk (body, `--f-body`, also aliased `--f`), Doto (labels/counters,
  `--f-mono`) — all OFL, self-hosted Latin-subset woff2 in `public/fonts`,
  preloaded, ~142KB total. Source Code Pro Medium TTF survives only for the
  extruded 3D wordmark (`text3d.js`), dev-only, font load gated. No external
  requests.
- **Panels are pure image artifacts** — full-bleed screenshot(s), hairline frame,
  no text or CTA baked in. A DOM text block (`src/panels.js` + `src/render.js`)
  sits on the opposite side and owns the words; one focal point and one CTA
  per screen. Beats with no imagery have no panel.
- **Flight:** 13 stops (see below), section-snapping. Per-shot FOV + duration
  with a deliberate rhythm (Hero 2.1s breath · Hero→Intro 2.4s exhale · CV/How
  I Build 1.6s · project hops 1.35s · finale 3s held). `fitFov()` widens
  vertical FOV on portrait screens so composed shots don't crop. Quaternion-
  slerp orientation, finale looks straight up.
- **Inputs:** wheel · ↑/↓/Space · touch swipe (one section per swipe). Everything
  funnels through `goTo(i)` with a 300ms cooldown. No free-roam, no hotkeys
  legend — the fixed bar is the only navigation chrome for visitors.
- **Stops:** `src/panels.js` (`initPanels({ beats, profile, root })`) builds one
  `<section class="stop">` per beat from `profile.js` (hidden, `inert` +
  `aria-hidden`), shows/hides on arrival/departure, and runs one reveal recipe
  per stop (≤600ms, disabled under reduced-motion). Flight keys (Space/arrows)
  yield to a focused button or link inside a stop or the bar.
  `src/render.js` holds the pure `(data) => HTMLElement` renderers (intro, cv,
  build, project, contact) — no Three.js imports, node-tested.
- **Deep links:** `#work` `#about` `#cv` `#contact` `#top` fly to that stop
  (`HASH_STOPS` in `main.js`); a hash on first load lands there without the
  flight. In-page anchors inside `#stops` are intercepted and routed through
  `goTo`, so they work even where `history.replaceState` is unavailable.
- **Fixed bar:** `src/bar.js` — name, availability dot, Work, About, Copy email.
  `initBar({ profile, onWork, onAbout, root })`; the target indices are derived
  live by `computeStopIndices()` (first `project` / first `intro` stop), not
  hard-coded, so Director Mode reorders stay correct. The bar fades in once the
  flight leaves the Opening; phones keep Work / About and hide only the
  availability text. Replaces the old dossier button / waypoint rail.
- **Director Mode** (`E`) and the FX/Transitions/UI/3D-Text/Assets panels
  (`B T U Y A`) are **dev-only**: gated by `DEV_TOOLS = import.meta.env.DEV ||
  ?edit` in the URL. Visitors never see them.

## The flight (DEFAULT_BEATS, `src/main.js`)
0. **Opening** — wordmark decodes from particles (loader hands straight into it).
1. **Hero** — the two live hero screens (Shadiez landing jpg + SmartCut CRM iframe;
   static png on touch since 3D-transformed iframes blank on iOS), plus one
   centred line (`profile.hero.line`) so the visitor knows who this is.
2. **Intro** — 2 first-person lines (claim first, evidence second) + location/availability.
3. **CV** — 5 rows, years · role/org · one line, from `profile.js` `cvStop`.
4. **How I Build** — method (2–3 sentences), proof numbers count up once, repo
   block (LLM Gateway lead card + TEEPO/SHADIEZ compact rows).
5. **LLM Gateway** — project stop, image left, SaaS group label. The strongest
   screen leads the work.
6. **Focus** — project stop, image right, private build (no live link).
7. **Sabai** — project stop, image left.
8. **TEEPO** — project stop, image right, Landing pages group label, **also** AeroCy.
9. **SHADIEZ** — project stop, image left, **also** SmartCut.
10. **Contact** — mailto at hero scale, GitHub · LinkedIn, "Back to the start", camera tilts up.

Project blocks lead with **Outcome** (display size, the line the eye lands on),
then Problem and Decision as one sentence each. A beat's optional `also: '<id>'`
folds a second featured project in as a compact row under the links.

## Code map
| File | Lines | What |
|---|---|---|
| `src/main.js` | ~3,071 | Scene, network, nebula, flight, Director Mode, perf tiers, save/migrate |
| `src/panels.js` | 83 | DOM stop layer: builds/shows/hides stops (inert + aria-hidden), count-up, print/copy |
| `src/render.js` | 74 | Pure HTML renderers (intro, cv, build, project, contact), node-tested |
| `src/bar.js` | 43 | Fixed top bar: name, availability, Work, About, Copy email |
| `src/printcv.js` | 54 | Print-only CV (moved out of the old dossier.js) |
| `src/content/profile.js` | 269 | **Single source of truth** for bio, CV, intro/method/proof, 7 featured + shipped/labs projects, links, status |
| `src/text3d.js` | 193 | Extruded 3D text (Source Code Pro, dev-only) |
| `src/cursor.js` | 57 | Magnetic cursor |
| `src/style.css` | 596 | All styling incl. @media phone layout + print CV |
| `index.html` | 390 | Shell, loader, editor panels, JSON-LD, noscript skim path |
| `public/previews/*.jpg` | | teepo · aerocy · shadiez · smartcut · llm-gateway · focus · sabai · kiaras-club |
| `public/assets/hero/` | | Hero screens (SmartCut html + png, Shadiez jpg) |

Deps: `three` 0.169, `meshline`, `three.quarks`, `vite` 8. No React.

### Persistence / migrations
Path + FX config persists in **localStorage** `voidConfig`, currently **save
version 16**. Any save below 16 has its beat array replaced wholesale with
`DEFAULT_BEATS` (the shape changed too much to patch) while the visitor's
global FX/speed/ease settings are kept. The v2–v14 patch migrations were
deleted on 2026-09-12: they only ever ran on beats the v14/v15 reset was about
to discard. Any future
`DEFAULT_BEATS` shape change needs its own migration step + version bump,
because visitors carry old beat arrays. Use Director Mode → **Copy config** to
export tuned `BEATS` and paste into `DEFAULT_BEATS`.

### Perf tiers (all in `main.js`, top)
- `IS_TOUCH` — DPR cap 1.25, nebula res 0.33 / fewer steps, halved star/node/link
  density, no water sim / bokeh / cursor links, no CSS blur tweens, static
  SmartCut capture.
- `LOW_END` (touch + ≤4GB or ≤480px) — also skips the whole CSS3D layer.
- **Adaptive governor** (touch only, one-way): fps EMA < 45 → tier 1 (smaller
  raymarch) → tier 2 (DPR 1, nebula every 3rd frame, bloom at 1/3 res).
- `PREFERS_REDUCED` — turns off "signs of life" (link traffic, node flares,
  idle camera breath) and cheapens the nebula.
- Flight-start hitch fixed: textures pre-uploaded (`initTexture`) and shaders
  pre-compiled behind the loader.

## Run
```
npm install
npm run dev      # http://localhost:5173  (DEV_TOOLS on → E/B/T/U/Y/A work)
npm run build    # dist/
npm test         # node --test tests/*.test.js — profile, render, bar, panels, printcv (happy-dom for the DOM ones), 39 passing
```
`.claude/launch.json` has a `void-dev` config for the browser preview.
Fully offline-capable: fonts are self-hosted, no external requests. HMR can be flaky —
hard-refresh if a change doesn't show.

## Open work (authoritative checklist in BUILD_PLAN.md Phase H)
1. ~~Camera authoring for stops 2–11~~ done 2026-09-12; phones use a derived
   portrait pose per project stop (`applyPortraitPoses` in `main.js`).
2. **Confirm the three proof numbers** in `profile.js` `proof[]` before launch.
3. **X handle** — `links.x` is commented out pending confirmation.
4. **SmartCut redeploy** — `smart-cut-gamma.vercel.app` returned 404 on 2026-09-08.
5. **Lighthouse + phone pass on the Vercel preview** — local production build
   passed on 2026-09-12 (mobile perf 89 / a11y 100, v14→v15 migration, 390×844
   walk); repeat on the deployed preview and on a real phone before merging.
6. **Housekeeping:** decide whether the preserved
   branch `local-phase-b-d-2026-07` (sound module, brand recolor-on-approach)
   has anything worth porting — sound is otherwise **not** in v15.

## Conventions / guardrails
- Keep it vanilla JS + Vite + Three.js. No React.
- Nothing about Yarin is hard-coded outside `src/content/profile.js`.
- Don't gold-plate Director Mode — it's dev-only and done.
- `load()` migration blocks stay in ascending version order. `save()` and
  `saveAssets()` swallow storage errors on purpose (private mode must still boot).
- Gone for good (2026-09-12 review): the neon wave ribbon, `freeRoam`, the
  `onTint`/`data-tint` hover channel. Don't reintroduce dead channels.
- Every `DEFAULT_BEATS` change ships with a save migration + version bump.
- Verify on an emulated phone (390×844, CPU throttle) before pushing — mobile
  perf has been the recurring regression.
- Root-level `demo-*.html` and `font-specimen*.html` are scratch/reference —
  not part of the shipped site. The `references/` folder no longer exists.
