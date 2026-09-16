# CLAUDE.md — context for "The Void" portfolio

Read this first. It captures the locked decisions and where everything lives so
you can pick up the build with full context. Last synced to code: **v18 + contact door / loader loop, 2026-09-14**.

## What this is
A 3D, scroll-driven portfolio for **Yarin Levin — AI-native developer**. The
visitor flies through a dark "void" (a 900-node data network with living energy
links, star parallax, volumetric nebula); sections are camera "beats" along a
flight path. The **v18 flight** (2026-09-14) puts the person first: Hi → About
→ Timeline → How I Build → five project stops (SaaS first, then Landing pages)
→ Contact, each project stop pairing the existing WebGL image panel with a DOM
text block from `profile.js`. v18 replaced the Hero/Intro/CV stops with Hi
(portrait panel + greeting), About (three speaking-photo panels + story) and
Timeline (dated rows on a rail, the two old hero screens floating beside it) —
see `docs/superpowers/specs/2026-09-14-person-chapter-design.md` for the full
design. v16 (2026-09-12) had already replaced v15's seven project hops: seven
identical 1.35s hops flattened the rhythm, so AeroCy and SmartCut ride along as
compact `also` rows on the TEEPO and SHADIEZ stops. The dossier overlay, hub,
waypoint rail and free-roam are gone — see
`docs/superpowers/specs/2026-09-08-flight-restructure-design.md` for that
design. Audience: hiring teams (part-time student position) + clients.

**Live:** https://yarinlevin.com is the canonical address (since 2026-09-14)
but **the domain is not registered yet** (no NS records on 2026-09-16). Until
Yarin buys it in Vercel the old `the-void-khaki-pi.vercel.app` host serves the
site directly: the 308 redirect in `vercel.json` was pulled on 2026-09-16 so
the site isn't a dead link. **Restore it once the domain resolves:**
`{ "source": "/(.*)", "has": [{ "type": "host", "value": "the-void-khaki-pi.vercel.app" }], "destination": "https://yarinlevin.com/$1", "permanent": true }` —
Vercel project `the-void`,
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
  no text or CTA baked in. They must read sharp and bright on arrival
  (2026-09-14): the DOF pass racks focus onto the stop's panel (not the look
  point 100 units out; nearest beat by camera pose, not look point), the
  screenshot is drawn undimmed (2026-09-15: every dim curve is gone), and
  every stop with a panel (Hi, About, projects) lifts the bloom threshold .22 → 1.0 in the render loop —
  otherwise bloom paints a blurred copy of any bright screenshot over itself,
  which read as "the panels are blurry". Screenshot whites top out at exactly
  1.0; the additive node cores exceed it, so they still glow. An unlit panel is
  fully invisible (2026-09-16): the Opening's default `panelDimFloor` .1 used
  to ghost the Hi portrait under the wordmark. Panel textures
  use `NoColorSpace` (2026-09-16): the composer has no OutputPass, nothing
  re-encodes to sRGB, so a decoded photo hit the screen linear and crushed. A DOM text block (`src/panels.js` + `src/render.js`)
  sits on the opposite side and owns the words; one focal point and one CTA
  per screen. Beats with no imagery have no panel.
- **Flight:** 13 stops (see below), section-snapping. Per-shot FOV + duration
  with a deliberate rhythm (Hero 2.1s breath · Hero→Intro 2.4s exhale · CV/How
  I Build 1.6s · project hops 1.35s · finale 3s held). `fitFov()` widens
  vertical FOV on portrait screens so composed shots don't crop. Quaternion-
  slerp orientation, finale looks straight up. The path never flies through a
  panel: `rebuildAvoid()` adds a perpendicular arc to any hop whose straight
  line would cross a panel mesh (2026-09-14).
- **Inputs:** wheel · ↑/↓/Space · touch swipe (one section per swipe). Everything
  funnels through `goTo(i)` with a 300ms cooldown. No free-roam, no hotkeys
  legend — the fixed bar is the only navigation chrome for visitors.
- **Stops:** `src/panels.js` (`initPanels({ beats, profile, root })`) builds one
  `<section class="stop">` per beat from `profile.js` (hidden, `inert` +
  `aria-hidden`), shows/hides on arrival/departure, and runs one reveal recipe
  per stop (≤600ms, disabled under reduced-motion). Flight keys (Space/arrows)
  yield to a focused button or link inside a stop or the bar. A beat may carry
  a `panels[]` array (extra WebGL image meshes beyond its single `panel`, e.g.
  About's three photos) and a `screens: true` flag (the CSS3D hero-screen
  layer now anchors to whichever beat carries it, not to a stop named
  `hero`). `src/render.js` holds the pure `(data) => HTMLElement` renderers
  (hi, about, timeline, build, project, contact) — no Three.js imports,
  node-tested.
- **Deep links:** `#work` `#about` `#cv` `#contact` `#top` fly to that stop
  (`#about` → About, `#cv` → Timeline). `src/hash.js` owns the table
  (`resolveHash(raw, { beats, workIndex, aboutIndex })`, pure, node-tested,
  prototype-free so `#__proto__` can't throw).
  A hash on first load lands there without the flight and the stop reveals
  only once the loader lifts (`loaderDone`); a handled hash is tidied with
  `window.history.replaceState`, an unrecognised one is left alone. There are
  no in-page anchors inside `#stops` any more (the Contact card has no "Back
  to the start"). With scripting off, a `<noscript><style>` in `<head>` hides the fixed
  3D chrome so the skim path at the end of `<body>` is readable.
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
1. **Hi** — portrait as a WebGL panel angled into the void (left), greeting +
   status + two lines beside it (`profile.js` `hi`).
2. **About** — three speaking photos as panels at different depths (right),
   the story (command → stage → code) opposite (`profile.js` `about`).
3. **Timeline** — dated rows on a glowing rail (`profile.js` `timeline`), the
   two old hero screens (Shadiez landing jpg + SmartCut CRM iframe; static png
   on touch since 3D-transformed iframes blank on iOS) floating beside it —
   carries `screens: true`, the "Download CV" pill.
4. **How I Build** — method (2–3 sentences), proof numbers count up once, repo
   block (LLM Gateway lead card + TEEPO/SHADIEZ compact rows).
5. **LLM Gateway** — project stop, image left, SaaS group label. The strongest
   screen leads the work.
6. **Focus** — project stop, image right, private build (no live link).
7. **Sabai** — project stop, image left.
8. **TEEPO** — project stop, image right, Landing pages group label, **also** AeroCy.
9. **SHADIEZ** — project stop, image left, **also** SmartCut.
10. **Contact** — the door (2026-09-14): the network parts around the look
    axis (vertex-shader push, `uDoor`, R = 34), the nebula ember warms, and a
    contact card (name, role, mail, tel, GitHub · LinkedIn, build stamp)
    fades in once the door is ¾ open. No "Back to the start", no availability
    line (dropped 2026-09-14; `profile.contact` is gone). Camera tilts up.

**Loader:** a 6–8 s Higgsfield loop of the void
(`public/assets/loader/void-loop.mp4`, ≤ 2.5 MB, poster webp) plays under the
constellation canvas (opacity .5); poster only under reduced motion. Spec:
`docs/superpowers/specs/2026-09-14-contact-door-and-loader-design.md`.

Project blocks lead with **Outcome** (display size, the line the eye lands on),
then Problem and Decision as one sentence each. A beat's optional `also: '<id>'`
folds a second featured project in as a compact row under the links.

## Code map
| File | Lines | What |
|---|---|---|
| `src/main.js` | ~3,023 | Scene, network, nebula, flight, Director Mode, perf tiers, save/migrate |
| `src/panels.js` | 83 | DOM stop layer: builds/shows/hides stops (inert + aria-hidden), count-up, print/copy |
| `src/render.js` | 74 | Pure HTML renderers (hi, about, timeline, build, project, contact), node-tested |
| `src/bar.js` | 43 | Fixed top bar: name, availability, Work, About, Copy email |
| `src/hash.js` | 28 | Deep-link resolver: fragment/anchor → stop index, prototype-free, node-tested |
| `src/printcv.js` | 54 | Print-only CV (moved out of the old dossier.js) |
| `src/content/profile.js` | 269 | **Single source of truth** for bio, CV, intro/method/proof, 7 featured + shipped/labs projects, links, status |
| `src/text3d.js` | 193 | Extruded 3D text (Source Code Pro, dev-only) |
| `src/cursor.js` | 70 | Cursor light trail (native pointer, 2D canvas comet tail; off on touch / reduced motion) |
| `src/style.css` | 613 | All styling incl. @media phone layout + print CV |
| `index.html` | 390 | Shell, loader, editor panels, JSON-LD, noscript skim path |
| `public/previews/*.webp` | | teepo · aerocy · shadiez · smartcut · llm-gateway · focus · sabai · kiaras-club (q82, 1400–1600 px wide; the panel canvas is 1024) |
| `public/assets/hero/` | | Hero screens (SmartCut html + png, Shadiez webp) |
| `public/assets/me/` | | portrait (beach, tight crop, 18×24 panel) + 3 About panels: FIDF stage 3:2 (tighter edit of the original, 24×16), Nova memorial at Re’im 3:4 (9.6×12.8, portrait), lectern detail 16:10 (native-res crop, 12×7.5). All regenerated 2026-09-16 from the originals in `~/.claude/uploads/…` with a mild grade (autocontrast, +8% contrast, +10% saturation, unsharp) — panels match the photo aspect and never overlap |

Deps: `three` 0.169, `meshline`, `three.quarks`, `vite` 8. No React.

### Persistence / migrations
Path + FX config persists in **localStorage** `voidConfig`, currently **save
version 20**. Any save below 16 has its beat array replaced wholesale with
`DEFAULT_BEATS` (the shape changed too much to patch) while the visitor's
global FX/speed/ease settings are kept; v17 (2026-09-12) then rewrites
`/previews/*.jpg` → `.webp` in whatever beat array survived (the JPGs are
gone), leaving any URL pasted in Director Mode alone; v18 (2026-09-14) — Hi /
About / Timeline replace Hero / Intro / CV, beats gain `panels[]` and
`screens` — wholesale re-adopts `DEFAULT_BEATS` again (any save `< 18`), same
global-settings carve-out; v19 (2026-09-16) re-adopts only the About beat's
`panels[]` (photo panels sized to their real aspect); v20 (2026-09-16) re-adopts
the About `panels[]` (re-laid so the three never overlap) and the Hi `panel`
(18×24). The v2–v14 patch migrations were
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
npm test         # node --test tests/*.test.js — profile, render, bar, panels, printcv, globals, hash, save, assets, domain (happy-dom for the DOM ones), 54 passing
```
`.claude/launch.json` has a `void-dev` config for the browser preview.
Fully offline-capable: fonts are self-hosted, no external requests. HMR can be flaky —
hard-refresh if a change doesn't show.

## Open work (authoritative checklist in BUILD_PLAN.md Phase H)
1. ~~Camera authoring for stops 2–11~~ done 2026-09-12; phones use a derived
   portrait pose per project stop (`applyPortraitPoses` in `main.js`).
2. ~~Confirm the three proof numbers~~ confirmed 2026-09-14 with the wording
   rework (spec `docs/superpowers/specs/2026-09-14-wording-rework-design.md`):
   the term is "AI-native developer" everywhere, every claim is checkable, and
   `tests/profile.test.js` blocks the retired phrases.
3. **X handle** — `links.x` is commented out pending confirmation.
4. **SmartCut redeploy** — `smart-cut-gamma.vercel.app` returned 404 on
   2026-09-08 (still on 09-13). Shipped as `url: '', offline: true` in
   `profile.js` (no live link, GitHub only); restore the URL and drop `offline`
   once redeployed. `tests/profile.test.js` knows the flag.
5. **Real-phone pass** — deployed site (contrast audit done 2026-09-13, all
   visitor text ≥ 4.5:1 on the void), Lighthouse mobile 2026-09-12 (after
   WebP + label fix): perf 84–88 / a11y 100 / best-practices 100 / SEO 100,
   100 % legible text, 610 KiB total. Still to do on a physical phone.
6. ~~Custom domain~~ decided 2026-09-14: **yarinlevin.com**, bought through
   Vercel (Settings → Domains; `www` redirects to the apex). Code, canonical,
   OG, JSON-LD, robots, sitemap and `links.site` already point there;
   `tests/domain.test.js` keeps the old host out. Spec:
   `docs/superpowers/specs/2026-09-14-domain-and-build-stamp-design.md`.
   The site shows a build stamp (`__BUILT__` from `vite.config.js`) on the
   contact card and the print CV.
7. ~~Housekeeping~~ done 2026-09-13: sound is **dropped** for good. The old
   Web Audio commit survives only as tag `archive/phase-b-d-sound-2026-07`;
   the stale branches were deleted. Don't reintroduce it.

## Conventions / guardrails
- Keep it vanilla JS + Vite + Three.js. No React.
- Nothing about Yarin is hard-coded outside `src/content/profile.js`.
- Don't gold-plate Director Mode — it's dev-only and done.
- `load()` migration blocks stay in ascending version order. `save()` and
  `saveAssets()` swallow storage errors on purpose (private mode must still boot).
- **Never shadow a browser global at module scope.** `let history = []` (the
  Director Mode undo stack, now `undoStack`) shadowed `window.history` for the
  whole of `main.js` and silently broke `clearHash()` in every browser — the
  `try/catch` ate the TypeError. `tests/globals.test.js` now fails the build on
  any module-scope `history`/`location`/`document`/… binding.
- Gone for good (2026-09-12 review): the neon wave ribbon, `freeRoam`, the
  `onTint`/`data-tint` hover channel. Don't reintroduce dead channels.
- Every `DEFAULT_BEATS` change ships with a save migration + version bump
  (`tests/save.test.js` fails if `save()`'s version lags the newest guard).
- **No root-font multiplier for phones.** `applyRootFont()` once scaled the
  root to 13.6 px under 640 px, which put every rem label at 8–9 px
  (Lighthouse: 20 % legible). Phone sizing lives in `style.css`; the
  visitor-facing label tier is `.75rem` = 12 px and should not go lower.
- Verify on an emulated phone (390×844, CPU throttle) before pushing — mobile
  perf has been the recurring regression.
- Root-level `demo-*.html` and `font-specimen*.html` are scratch/reference —
  not part of the shipped site. The `references/` folder no longer exists.
