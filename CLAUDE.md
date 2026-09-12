# CLAUDE.md — context for "The Void" portfolio

Read this first. It captures the locked decisions and where everything lives so
you can pick up the build with full context. Last synced to code: **v15, 2026-09-08**.

## What this is
A 3D, scroll-driven portfolio for **Yarin Levin — AI-Native Builder**. The
visitor flies through a dark "void" (a 900-node data network with living energy
links, star parallax, volumetric nebula); sections are camera "beats" along a
flight path. The **v15 flight restructure** (2026-09-08) puts the work first:
13 stops from Hero straight into Intro → CV → How I Build → seven project
stops (Landing pages, then SaaS) → Contact, each project stop pairing the
existing WebGL image panel with a DOM text block from `profile.js`. The
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
- **Stops:** `src/panels.js` builds one `<section class="stop">` per beat from
  `profile.js` (hidden by default), shows/hides on arrival/departure, and runs
  one reveal recipe per stop (≤600ms, disabled under reduced-motion).
  `src/render.js` holds the pure `(data) => HTMLElement` renderers (intro, cv,
  build, project, contact) — no Three.js imports, node-tested.
- **Fixed bar:** `src/bar.js` — name, availability dot, Work (`goTo(5)`), About
  (`goTo(2)`), Copy email. Visible from Opening onward; phones show name +
  Copy email only. Replaces the old dossier button / waypoint rail.
- **Director Mode** (`E`) and the FX/Transitions/UI/3D-Text/Assets panels
  (`B T U Y A`) are **dev-only**: gated by `DEV_TOOLS = import.meta.env.DEV ||
  ?edit` in the URL. Visitors never see them.

## The flight (DEFAULT_BEATS, `src/main.js`)
0. **Opening** — wordmark decodes from particles (loader hands straight into it).
1. **Hero** — the two live hero screens (Shadiez landing jpg + SmartCut CRM iframe;
   static png on touch since 3D-transformed iframes blank on iOS).
2. **Intro** — 2–3 first-person lines on directing AI end-to-end + location/availability.
3. **CV** — 5 rows, years · role/org · one line, from `profile.js` `cvStop`.
4. **How I Build** — method (2–3 sentences), proof numbers count up once, repo
   block (LLM Gateway lead card + TEEPO/SHADIEZ compact rows).
5. **TEEPO** — project stop, image left, Landing pages group label.
6. **AeroCy** — project stop, image right.
7. **SHADIEZ** — project stop, image left.
8. **SmartCut** — project stop, image right.
9. **LLM Gateway** — project stop, image left, SaaS group label.
10. **Focus** — project stop, image right, private build (no live link).
11. **Sabai** — project stop, image left.
12. **Contact** — mailto at hero scale, GitHub · LinkedIn links, camera tilts up.

## Code map
| File | Lines | What |
|---|---|---|
| `src/main.js` | ~3,076 | Scene, network, nebula, flight, Director Mode, perf tiers, save/migrate |
| `src/panels.js` | 79 | DOM stop layer: builds/shows/hides stops, reveal recipes |
| `src/render.js` | 74 | Pure HTML renderers (intro, cv, build, project, contact), node-tested |
| `src/bar.js` | 38 | Fixed top bar: name, availability, Work, About, Copy email |
| `src/printcv.js` | 54 | Print-only CV (moved out of the old dossier.js) |
| `src/content/profile.js` | 269 | **Single source of truth** for bio, CV, intro/method/proof, 7 featured + shipped/labs projects, links, status |
| `src/text3d.js` | 193 | Extruded 3D text (Source Code Pro, dev-only) |
| `src/cursor.js` | 57 | Magnetic cursor |
| `src/style.css` | 596 | All styling incl. @media phone layout + print CV |
| `index.html` | 378 | Shell, loader, editor panels, JSON-LD, noscript skim path |
| `public/previews/*.jpg` | | teepo · aerocy · shadiez · smartcut · llm-gateway · focus · sabai · kiaras-club |
| `public/assets/hero/` | | Hero screens (SmartCut html + png, Shadiez jpg) |

Deps: `three` 0.169, `meshline`, `three.quarks`, `vite` 8. No React.

### Persistence / migrations
Path + FX config persists in **localStorage** `voidConfig`, currently **save
version 15**. The v15 migration (`main.js` ~1090) replaces the saved beat array
wholesale with `DEFAULT_BEATS` (structure changed too much to patch) while
keeping the visitor's global FX/speed/ease settings. Any future
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
npm test         # node --test tests/*.test.js — profile, render, bar
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
- Every `DEFAULT_BEATS` change ships with a save migration + version bump.
- Verify on an emulated phone (390×844, CPU throttle) before pushing — mobile
  perf has been the recurring regression.
- Root-level `demo-*.html` and `font-specimen*.html` are scratch/reference —
  not part of the shipped site. The `references/` folder no longer exists.
