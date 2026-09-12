# BUILD PLAN — "The Void" Portfolio

> Execution plan derived from `PRD.md`. Phases A→G below are **complete** as of
> v14 (2026-08-30); this file is now the status ledger for that original plan.
> Phase H (below) is the v15 flight restructure, superseding the v13/v14
> person-first flight described in Phases B–C. Design doc:
> `docs/superpowers/specs/2026-09-08-flight-restructure-design.md`.
> Last updated: 2026-09-08 (synced to code on branch `flight-v15`, save v15).

---

## Current state (audited from code, 2026-09-05)
`src/main.js` ≈ 3,220 lines + `dossier.js` · `content/profile.js` · `text3d.js`
· `cursor.js`. **Live at https://the-void-khaki-pi.vercel.app, push-to-deploy.**
- ✅ The void: 900-node data network with living energy links, star parallax
  depth ladder, volumetric nebula, bloom, vignette + grain grade.
- ✅ 9-beat flight (Opening · Hero · Who · The Road Here · What I Work With ·
  My Projects · The Work · Where This Goes · Let's build something).
- ✅ Inputs: wheel / keys / touch swipe / waypoint rail; `V` free roam; `C` dossier.
- ✅ The Dossier overlay (About · CV · Work · Ambitions) + printable one-page CV.
- ✅ One typeface (Source Code Pro), rebuilt constellation loader, OG cards,
  JSON-LD, noscript skim path.
- ✅ Mobile: phone layout, perf tiers, adaptive governor, aspect-fit FOV.
- ✅ Director Mode + FX panels exist but are dev-only (`DEV_TOOLS`).

---

## Phase A — Lock content & decisions ✅ (2026-08-13, see CONTENT.md)
- [x] Featured 4 confirmed: **SHADIEZ · TEEPO · Sabai · Kiara's Club** (Kiara's
      Club chosen over AeroCy/Mentorship; Sabai replaced LifeRPG 2026-08-23).
- [x] Per project: title · impact line · stack · live URL · brand colors.
- [x] Preview format: static screenshots.
- [x] Assets captured → `public/previews/*.jpg` (42–118KB).
- [x] Hero copy kept; contact CTA "Let's build something" + mailto.
- [x] Final beat = its own in-world moment (camera ends looking up).

## Phase B — Content placement ✅ (2026-08-13 → 08-30)
- [x] Real content lives in `DEFAULT_BEATS` (desc / img / img2 / link) with save
      migrations (v7+). A separate `PROJECTS` array was superseded by
      `src/content/profile.js` (17 projects, 3 tiers) in the dossier work.
- [x] Panels render on approach; **pure image artifacts**, captions own the words.
- [x] Previews lazy-drawn onto panel canvases, textures pre-uploaded.
- [x] `#visitlive` wired per beat (relabels to GET IN TOUCH for mailto).
- [x] **My Projects hub** = in-world Shipped + Labs index → "full index" opens
      the dossier Work tab.
- [x] **Contact** beat: headline + one GET IN TOUCH pill, keyboard reachable.
- Note: v13 compressed the project chapter to **one "The Work" beat** (SHADIEZ +
  TEEPO panels); Sabai + Kiara's Club are reached via the hub/dossier.

## Phase C — Brand reactivity & motion polish ✅
- [x] Chapter tints per beat carry brand hue; one navy/cyan color story
      (restraint pass 2026-08-23). The fuller "recolor the whole void on
      approach" experiment lives only on branch `local-phase-b-d-2026-07`.
- [x] Reveal recipes: caption enter/exit asymmetry (title leads 60ms, sub 200ms,
      reversed on exit; `gravity` departure curve), rise 22px / 10px.
- [x] Timing rhythm: Hero 2.1s · hub 1.8s · project hops 1.35s · finale 3s; per-
      beat easing selectable.
- [x] Connecting lines → the data network (`buildNetwork()`), link traffic with
      per-link cycles, rare node flares, idle camera breath.

## Phase D — Sound ⏸ NOT SHIPPED
- [ ] Ambient hum + approach whoosh, muted by default, persisted toggle.
- A working Web Audio implementation exists on branch `local-phase-b-d-2026-07`
  (commit `7b59fdd`) against an older `main.js`; porting it is optional and
  not blocking. Decide, don't drift.

## Phase E — Accessibility & fallback ✅ (partial by design)
- [x] `prefers-reduced-motion`: signs of life off, nebula cheapened, CSS blur
      tweens skipped. **The full static/flat fallback was replaced by the
      noscript skim path + dossier** (all content readable without flying).
- [x] Mobile / low-GPU: `IS_TOUCH` / `LOW_END` tiers + adaptive governor.
- [x] Keyboard: sections, dossier tabs, focus trap, focus-visible rings,
      waypoint aria-labels + aria-current, canvas role/label.
- [x] Director Mode + dev panels hidden in prod (`DEV_TOOLS`), legend strips dev rows.
- [ ] Formal contrast audit of captions over bright panels (TEEPO cream) — the
      dim floor was tuned by eye (.15–.58); worth one pass with a checker.

## Phase F — Performance pass ✅
- [x] Payload: dead assets removed (~5MB), hero png → 156KB jpg, fallback-serif
      typeface json dropped; dist ≈ 3.9MB.
- [x] DPR cap 1.25 on touch, density halved, nebula res/steps by tier.
- [x] Flight-start hitch fixed (initTexture + renderer.compile behind loader).
- [x] Verified: emulated phone 6×/20× CPU throttle, governor tiers fire, no
      mid-flight uploads.

## Phase G — Ship & showcase ✅ / partly open
- [x] Production build clean; editor stripped for visitors.
- [x] Vercel, repo connected, **push to main deploys** (2026-08-30).
- [x] `<title>`/meta/OG/canonical/theme-color; `public/og.jpg`.
- [ ] Custom domain (still on `the-void-khaki-pi.vercel.app`).
- [ ] 30–60s capture for CV / LinkedIn — with the dossier in shot.
- [ ] Live URL onto CV PDF + LinkedIn + GitHub profile.

## Phase H — v15 flight restructure ✅ (2026-09-08)
Design: `docs/superpowers/specs/2026-09-08-flight-restructure-design.md`.
Supersedes the v13/v14 nine-beat "person-first" flight (Phases B–C above);
work moves to the front of the flight instead of being one chapter of it.
- [x] 13 stops in order: Opening, Hero, Intro, CV, How I Build, TEEPO, AeroCy,
      SHADIEZ, SmartCut, LLM Gateway, Focus, Sabai, Contact.
- [x] Save version 15; migration replaces the beat array wholesale, keeps
      global FX/speed/ease settings for returning visitors.
- [x] `src/render.js` — pure, node-tested HTML renderers (intro, cv, build,
      project, contact); `src/panels.js` — DOM stop layer, show/hide, reveal
      recipes; `src/bar.js` — fixed top bar (name, availability, Work, About,
      Copy email), the only nav chrome; `src/printcv.js` — print-only CV
      split out of the deleted `dossier.js`.
- [x] Removed: dossier overlay, in-world work hub, waypoint rail, free-roam
      (`V`), hotkeys legend (`?`), caption system, visit-live pill — JS, CSS
      and HTML all gone. Director Mode + dev panels stay dev-only.
- [x] Type: Bricolage Grotesque (display) · Schibsted Grotesk (body) · Doto
      (labels), OFL, self-hosted Latin-subset woff2, ~142KB total, preloaded.
      Source Code Pro Medium TTF kept only for the dev-only extruded 3D text.
- [x] Content model in `profile.js`: `intro`, `cvStop`, `method`, `proof`,
      `buildStop`, `contact`, `work.featured` (7 projects, `landing`/`saas`
      groups, problem/decision/outcome), `links.x` held back pending handle.
- [x] Tests: `npm test` (node --test) — profile, render, bar, 19 passing.
      Previews added: aerocy, smartcut, llm-gateway, focus.
- [x] Inputs unchanged: wheel / ↑↓ / Space / touch swipe, 300ms cooldown,
      `goTo(i)`; a tall stop scrolls natively.
- [x] **Review pass 2026-09-12** (two read-only reviews of the merged code):
      `save()` guarded (private-mode boot), flight keys yield to focused
      controls, stops `inert` while hidden, migration blocks reordered
      ascending, `load()` logs its fallback, dead wave ribbon / `freeRoam` /
      `mesh3d` / `onTint` removed, bokeh focus portrait-aware, `.muted`
      contrast ≥ 4.5:1, printcv escaping, copy-failure label fixed, Assets
      font select relabelled. Tests 20 → 35 (happy-dom for panels/printcv/bar).

---

## Open work (2026-09-08) — in priority order
1. ~~Camera authoring for stops 2–11~~ ✅ 2026-09-12 — desktop shots baked
   into `DEFAULT_BEATS`; phones get a derived portrait pose per project stop
   (`applyPortraitPoses`). Re-tune in Director Mode → Copy config if needed.
2. **Confirm the three proof numbers** in `profile.js` `proof[]` before launch.
3. **X handle** — `links.x` is commented out pending confirmation with Yarin.
4. **SmartCut redeploy** — `smart-cut-gamma.vercel.app` returned 404 on 2026-09-08.
5. **Formal contrast pass** on the new DOM text blocks over the void / panels
   (carried over from Phase E; `.muted` fixed 2026-09-12, rest still open). Lighthouse mobile on the local
   production build, 2026-09-12: perf 89 / a11y 100 (main was 81 / 100).
6. **Phase G leftovers:** capture video, custom domain, URL on CV/LinkedIn/GitHub.
7. **Housekeeping:** decide on porting sound from `local-phase-b-d-2026-07`.
8. Optional trust signal: one genuine SHADIEZ client line, or none.

## Risks / watch-items
- **Save migrations** — every `DEFAULT_BEATS` change needs a version bump +
  migration or returning visitors get a broken path.
- **Mobile perf** is the recurring regression; test on emulated phone with CPU
  throttle before pushing.
- **Two doc plans** — this file is a ledger; `PORTFOLIO_PLAN.md` is the plan.
  Don't let them disagree.
