# CLAUDE.md — context for "The Void" portfolio

Read this first. It captures the locked decisions and where everything lives so
you can pick up the build with full context. Last synced to code: **v14, 2026-09-05**.

## What this is
A 3D, scroll-driven portfolio for **Yarin Levin — AI-Native Builder**. The
visitor flies through a dark "void" (a 900-node data network with living energy
links, star parallax, volumetric nebula); sections are camera "beats" along a
flight path. Since the v13 restructure the flight is **about the person**, and
the projects are one chapter of it. A DOM overlay, **the Dossier**, carries the
skimmable portfolio (about · CV · full work index · ambitions) for time-poor
recruiters. Audience: hiring teams (part-time student position) + clients.

**Live:** https://the-void-khaki-pi.vercel.app — Vercel project `the-void`,
repo connected, **push to main auto-deploys** (verified 2026-08-30; the old
`build.sh` bootstrap deploy is gone).

**Source-of-truth docs (read in this order):**
- `PORTFOLIO_PLAN.md` — the current plan (showreel → portfolio). Phases 2–4, 6, 7
  built; §4b holds the locked interview answers. **Start here.**
- `BUILD_PLAN.md` — the original A→G plan, now a status ledger of what shipped.
- `CONTENT.md` — locked featured-project table (SHADIEZ · TEEPO · Sabai · Kiara's Club).
- `PRD.md`, `PLAN.md` — original requirements / concept / storyboard (historic).
- `BACKGROUND.md`, `ENVIRONMENT.md`, `FX-IDEAS.md`, `ARSENAL.md` — atmosphere
  layers, environment ideas, effects backlog, tooling notes.

## Locked decisions
- **Visual direction: DARK void**, one color story — navy/cyan is *the* palette.
  Chapter tints per beat carry brand hue (SHADIEZ coastal blue, TEEPO green,
  Sabai/Kiara mustard); the contact beat's ember is the single warm accent.
  Final grade pass = vignette (0.45) + fine grain on every device.
- **ONE typeface: Source Code Pro** everywhere (DOM, canvas loader, extruded 3D
  text). Hierarchy comes from weight/size/tracking. CSS uses `var(--f)`; 3D text
  loads self-hosted `public/fonts/SourceCodePro-Medium.ttf` (OFL, weight 500 only).
  **The DOM gets Source Code Pro (400/500/600/700) from the Adobe Fonts kit**
  `use.typekit.net/xan5bdy.css` in `index.html` — do NOT remove it; offline it
  falls back to Menlo. To go fully self-hosted, add the OFL variable TTF +
  `@font-face` for `"source-code-pro"` first.
- **Panels are pure image artifacts** — full-bleed screenshot(s), hairline frame,
  no text or CTA baked in. Captions (DOM) own the words; one focal point and one
  CTA per screen. Beats with no imagery have no panel.
- **Flight:** 9 beats (see below), section-snapping. Per-shot FOV + duration
  with a deliberate rhythm (Hero 2.1s breath · project hops 1.35s · finale 3s
  held). `fitFov()` widens vertical FOV on portrait screens so composed shots
  don't crop. Quaternion-slerp orientation, finale looks straight up.
- **Inputs:** wheel · ↑/↓/Space · touch swipe (one section per swipe) · waypoint
  rail dots. `V` free-roam, `C` dossier, `?` hotkeys. Everything funnels
  through `goTo(i)` with a 300ms cooldown.
- **Dossier:** `src/dossier.js` — summoned by button / `C` / deep links
  `#about #cv #work #ambitions`. Tabs About · CV · Work · Ambitions, focus trap,
  arrow-key tabs, mobile full-height sheet. **Download PDF** = print stylesheet
  over the same data (verified one page). All content from `src/content/profile.js`.
- **Director Mode** (`E`) and the FX/Transitions/UI/3D-Text/Assets panels
  (`B T U Y A`) are **dev-only**: gated by `DEV_TOOLS = import.meta.env.DEV ||
  ?edit` in the URL. Visitors never see them; the hotkeys legend strips dev rows.

## The flight (DEFAULT_BEATS, `src/main.js`)
1. **Opening** — wordmark decodes from particles (loader hands straight into it).
2. **Hero** — the two live hero screens (Shadiez landing jpg + SmartCut CRM iframe;
   static png on touch since 3D-transformed iframes blank on iOS).
3. **Who** — five months of directing AI, a dozen shipped products.
4. **The Road Here** — IDF command → US speaking tour → self-taught April 2026.
5. **What I Work With** — stack / method.
6. **My Projects** — in-world work hub (Shipped + Labs index, "full index" → dossier).
7. **The Work** — SHADIEZ + TEEPO panels (the featured pair; Sabai + Kiara's Club
   live in the hub/dossier).
8. **Where This Goes** — ambitions. ⏳ Copy is a stand-in until Yarin writes his own.
9. **Let's build something** — contact, GET IN TOUCH mailto, camera tilts up.

## Code map
| File | Lines | What |
|---|---|---|
| `src/main.js` | ~3,220 | Scene, network, nebula, flight, Director Mode, perf tiers, save/migrate |
| `src/dossier.js` | 333 | Dossier overlay + in-world work hub |
| `src/content/profile.js` | 203 | **Single source of truth** for bio, CV, 17 projects (3 tiers), links, status |
| `src/text3d.js` | 190 | Extruded 3D text (Source Code Pro) |
| `src/cursor.js` | 57 | Magnetic cursor |
| `src/style.css` | 747 | All styling incl. @media phone layout + print CV |
| `index.html` | 417 | Shell, loader, hotkeys legend, editor panels, JSON-LD, noscript skim path |
| `public/previews/*.jpg` | | shadiez · teepo · sabai · kiaras-club (42–118KB each) |
| `public/assets/hero/` | | Hero screens (SmartCut html + png, Shadiez jpg) |

Deps: `three` 0.169, `meshline`, `three.quarks`, `vite` 8. No React.

### Persistence / migrations
Path + FX config persists in **localStorage** `voidConfig`, currently **save
version 14**. Any change to `DEFAULT_BEATS` shape or defaults needs a migration
step in the load block (~`src/main.js:980–1070`) and a version bump, because
visitors carry old beat arrays. Use Director Mode → **Copy config** to export
tuned `BEATS` and paste into `DEFAULT_BEATS`.

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
```
`.claude/launch.json` has a `void-dev` config for the browser preview.
Offline: the Adobe kit fails silently and DOM type falls back to Menlo. HMR can be flaky —
hard-refresh if a change doesn't show.

## Open work (authoritative checklist in PORTFOLIO_PLAN.md + BUILD_PLAN.md)
1. **Ambitions copy** in Yarin's own words (PORTFOLIO_PLAN §4b — the one Phase 1
   blocker) → `profile.js` + "Where This Goes" beat. Optional: the portrait
   photo for the Who beat.
2. **Phase 9 ship items:** 30–60s capture with the dossier in shot; live URL on
   CV PDF / LinkedIn / GitHub profile.
3. **Housekeeping:** optionally self-host Source Code Pro (variable OFL TTF +
   `@font-face`) so the site has no external requests; decide whether the preserved
   branch `local-phase-b-d-2026-07` (sound module, brand recolor-on-approach)
   has anything worth porting — sound is otherwise **not** in v14.
4. Optional trust signal: one real line from the SHADIEZ client, or skip.

## Conventions / guardrails
- Keep it vanilla JS + Vite + Three.js. No React.
- Nothing about Yarin is hard-coded outside `src/content/profile.js`.
- Don't gold-plate Director Mode — it's dev-only and done.
- Every `DEFAULT_BEATS` change ships with a save migration + version bump.
- Verify on an emulated phone (390×844, CPU throttle) before pushing — mobile
  perf has been the recurring regression.
- Root-level `demo-*.html` and `font-specimen*.html` are scratch/reference —
  not part of the shipped site. The `references/` folder no longer exists.
