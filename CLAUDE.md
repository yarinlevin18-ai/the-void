# CLAUDE.md — context for "The Void" portfolio

Read this first. It captures the locked decisions and where everything lives so
you can pick up the build with full context. Last synced to code: **v22 — wrap-up review + owner's mark (2026-09-29); every phone size, landscape included, and the recounted counters (2026-09-30)**.

## What this is
A 3D, scroll-driven portfolio for **Yarin Levin — AI-native developer**. The
visitor flies through a dark "void" (a 900-node data network with living energy
links, star parallax, volumetric nebula); sections are camera "beats" along a
flight path. The **v18 flight** (2026-09-14) puts the person first: Hi → About
→ Timeline → How I Build → five project stops (SaaS first, then Landing pages)
→ Contact, each project stop pairing the existing WebGL image panel with a DOM
text block from `profile.js`. v18 replaced the Hero/Intro/CV stops with Hi
(portrait panel + greeting), About (speaking-photo panels + story) and
Timeline (dated rows on a rail) —
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
  preloaded, ~142KB total. No external requests. (The extruded 3D text tool —
  `text3d.js`, the Y panel and its Source Code Pro TTF — was deleted 2026-09-29.)
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
  **Desktop laptop heights (2026-09-22):** How I Build is the one stop with no
  image panel, so on desktop its column widens to 46ch and the stop tightens its
  frame — at 30ch the three paragraphs ran to three lines each and the block
  stood 1154 px inside a 900 px viewport, hiding the repo cards below the fold
  where the wheel (bound to the flight) can't reach them. A second block at
  `(max-height: 820px)` covers 1366x768. Both carry `(min-height: 560px)` so
  landscape phones keep their own tuning. The live feed's box was `3.3em`, two
  rows at a 1.65 line-height, while three rows render — the third was sliced in
  half; it is now three rows plus the padding `border-box` folds in.
  **Portrait screens don't use the WebGL panels at all** (2026-09-17): every
  panel is zeroed in the render loop and the stop's imagery comes from DOM
  `<figure class="stop-img">` elements that `render.js` emits into the stop
  (Hi portrait, About stage + memorial side by side, project screenshot) and
  `style.css` shows under `@media (orientation: portrait)` **or `(max-height:
  520px)`** — landscape phones count too (2026-09-21, `isCompact()` in
  `main.js`: the panels projected onto the words at 874×402 and the hero
  screens sat on the Timeline rows). Since 2026-09-30 landscape phones have their
  own layout — the figure beside the words, not above them (see **Phone sizes**).
  The WebGL
  version rendered soft through the touch tier's 1.25× DPR cap and, with
  Safari's URL bar shortening the viewport, landed on the words. Verified in
  the iOS Simulator (iPhone 17, Safari) — the Chrome phone emulation never
  showed either problem, so phone checks go through the simulator now.
- **Flight:** 13 stops, seven of them projects (see below), section-snapping. Per-shot FOV + duration
  with a deliberate rhythm (Hero 2.1s breath · Hero→Intro 2.4s exhale · CV/How
  I Build 1.6s · project hops 1.35s · finale 3s held). `fitFov()` widens
  vertical FOV on portrait screens so composed shots don't crop. Quaternion-
  slerp orientation, finale looks straight up. The path never flies through a
  panel: `rebuildAvoid()` adds a perpendicular arc to any hop whose straight
  line would cross a panel mesh (2026-09-14).
- **Inputs:** wheel · ↑/↓/Space · touch swipe (one section per swipe). Everything
  funnels through `goTo(i)` with a 300ms cooldown. No free-roam, no hotkeys
  legend. Visitor chrome (2026-09-17, reviewer feedback): the fixed bar, two
  chevrons bottom-centre (bottom-right and stacked on a landscape phone) (`#hud-up/#hud-down` → `goTo(index ∓ 1)`, the down
  one pulses once on the Opening) and a 2px progress hairline along the
  bottom edge (`#hud-rail`, `scaleX(index/last)`). The stop name + count
  survive only in an `sr-only` `aria-live` region — no visible page counter.
  **Input rules (2026-09-29 review):** a pinch / Ctrl+wheel is the browser's
  zoom, never a flight (`e.ctrlKey`). Space yields to a button or link only
  when the visitor *tabbed* to it (`_kbdFocus`: Tab sets it, any pointerdown
  clears it) — Chrome keeps focus on a clicked button and turns `:focus-visible`
  on at the first key press, so the old "any focused control keeps the keys"
  rule stranded the flight after one click on ▼ / Work / About, and Space after
  ▲ flew backwards. Arrows always fly unless a control handled them
  (`defaultPrevented`: the lab's sliders) or it is a select / slider. A stop
  taller than the window reads first — wheel (even over the void: it lands on
  the canvas, so the stop is scrolled by hand), ↑/↓/PageUp/PageDown/Space and a
  touch drag all scroll it, and a gesture that scrolled never flies: reaching
  the end takes a fresh one. `#hud` sits above `#stops` (z 4 vs 3) so the
  chevrons stay tappable on an overflowing stop.
- **Abilities / Potential (2026-09-29, Yarin):** Cursor Buddy lists eight abilities
  (`abilities` in `profile.js`, each checked in the Swift source, v2.0.11); LLM Gateway
  and Agent Control list three products each could become (`potential`, always framed
  as potential). `renderProject` emits the list twice: `.xl-flow`, titles only, in the
  text column (phones, narrow screens), and `.xl-strip`, cards with one-liners, as a
  sibling of the article that sits under the image panel from 1100 × 600 (`top: 65vh`,
  from `max(48vw, 6vw + 30rem)` on the panel's side, so it never reaches the text column;
  `pointer-events: none`, it has no links and sits above the chevrons in z-order). One-liners
  only where the cards clear the chevrons, from a measured 1100-1600 × 600-860 grid: eight
  cards need 1360 × 820, three cards 640 px of height (720 below 1200 wide). Under 720 px
  tall on a window too narrow for the strip the flow list hides (the column is full). Phones:
  PROBLEM / DECISION / the list are run-in labels on every project stop (each label +
  sentence is its own `<div>` inside the `<dl>` — Safari only balances real blocks),
  and the three list stops show a 52 % screenshot (42 % under 690 px tall). The under-690
  portrait tier also shrinks the Hi portrait, How I Build's method lines and drops the build
  log's commit counts; How I Build's top padding is `max(12.5vh, 6.1rem)` because the bar is a
  fixed 94 px. Since 2026-09-30 every stop fits every phone size, the iPhone SE and landscape
  included (see **Phone sizes**). The
  same audit fixed the gateway copy: Hono not Fastify, and "every agent I run goes
  through it" is a retired phrase (some apps only report usage; local calls skip it).
  Stack lines use `segments()`: an item never breaks inside, a line never starts with ·.
- **Phone composition (2026-09-22):** Hi and About are centred on portrait
  instead of hugging the top (they left 230-300 px of dead void below the last
  line); project stops carry 11.5vh of bottom padding so the links row clears
  the chevrons by ~34 px rather than 12; the stack/context line drops to .06em
  tracking in `#9fc2e0` (it kept the 12 px floor but was the least legible
  thing on a phone). The desktop contact card, the last thing a hiring team
  sees, widens to 36rem with roomier rows and a larger name/mail — scoped to
  `(min-width: 900px) and (min-height: 560px)` and placed after the base card
  rules, since a tie on specificity is decided by source order.
- **Phone notice (2026-09-20):** touch + narrow screens (`min(innerWidth,
  innerHeight) < 640`) get one loud amber card (`#phone-note`, `index.html`)
  over the chevrons once the loader lifts: "Best on a desktop browser". "Got
  it" or the first flight (`goTo`) hides it; `localStorage` `voidPhoneNote`
  (a timestamp) keeps it away for 12 hours. CSS also kills it at ≥ 640 px. Yarin asked for
  it to be very visible — don't quiet it down.
- **Void dimming (2026-09-17):** while a stop is open (`_stopOpen`: landed,
  not tweening, beat has a `stop`) the network eases to `uDim` = .32
  (portrait) / .55 (landscape) — node alpha and brightness, link alpha, link
  traffic (`smoothstep(.35,1,uDim)`) and nebula density (`.45 + .55·uDim`) all
  follow — and back to 1 during the flight. Eased in the render loop
  (`_dimV`, .6s down / .45s up; instant under reduced motion). The void stays
  the transition, the words own the stop. Body text is `#d6e8f7` on phones.
- **Minimal void, no mouse tracking (2026-09-29, Yarin):** the cursor trail
  (`cursor.js`), the threads that reached from nodes to the cursor and the
  cursor stir are gone (`cursorDrive` 0); stars .45, nodes .55, links .45 of
  the built density, link traffic and node flares halved. Don't bring cursor
  effects back.
- **Line breaks (2026-09-29, Yarin):** no sentence may drop a lone word onto
  its own line. `render.js` `sentences()` puts each sentence of the Hi lines,
  the About story and the Timeline lines in a `.sent` block (balanced), the Hi
  status breaks only between its ` · ` items (`.seg`), and every other short
  block in `#stops` is `text-wrap: balance`. Headings are left alone.
- **Reduced motion (2026-09-29):** flights run at 0.55× duration, no warp
  streaks, no camera parallax; the mouse parallax is desktop-only (on touch the
  last swipe's point stuck as an offset). The Opening wordmark still shatters
  around the pointer — the one cursor interaction left, by choice (a touch no
  longer leaves a dent in it: `_cN` resets on pointerup). Since the wrap-up
  review the stars neither stream nor twinkle, no meteors fall, a stop change
  fires no warp swell or bloom flare, and the loader leaves on a plain fade.
  The CSS kill-switch drops entrance transforms only: `.stop *:not(.lab, .lab *,
  .tl-dot)` — it used to strip the lab card's centring and its handles' inline
  positions too (`tests/css.test.js` guards it).
- **Bloom across a flight (2026-09-29):** `index` jumps to the destination as
  a flight starts, so the threshold stays at 1.0 while any panel is still lit
  (`_panelLit`); About's photos used to flare solid white leaving for the
  Timeline. A `panels[]` cluster is gone 40 % into the hop.
- **Shortest laptops (≤ 720 px of viewport, 2026-09-29 sweep):** at 1280 × 690 and 1366 × 657
  the Timeline's Download CV pill sat 28-47 px under the bottom edge, How I Build's eyebrow
  under the bar and the contact card's last rows under the chevrons; one `max-height: 720px`
  tier tightens those three (desktop-width only). Seven laptop sizes 1024-1536 wide now clear
  every stop.
- **Per-stop entrances on phones (2026-09-17):** portrait + no-preference
  only, ≤600ms, one easing (`--ease-out`). Hi "develops" (blur/tint → colour),
  About slides in from both sides, How I Build lights the proof panel then
  deals the repo cards, project stops get a recipe by position among project
  stops (`PROJECT_REVEALS` in `panels.js` → `data-reveal` = scan / iris / deal
  / wipe / shutter — by position, never by project name). Desktop unchanged.
  Scan and wipe start from a 1-px sliver, never a full clip (2026-09-29): Chrome won't
  lazy-load a fully clipped image, and once 6aa7fa6 stopped the panel textures from
  warming the cache, those screenshots only began downloading on arrival.
- **Build log (2026-09-29; replaced the live layer):** the How I Build strip is
  this repo's own git history, read at build time by `scripts/buildlog.js`
  (`summarize()` node-tested) and baked in as `__BUILDLOG__` from
  `vite.config.js`: a GitHub-style heatmap since the first commit, commits /
  days shipped / longest streak, the three latest commit headlines, and "N
  tests passing". That claim is kept honest by `npm run build` running the test
  suite first. Vercel clones shallow, so `read()` falls back to the committed
  snapshot `src/content/buildlog.json` (a local build refreshes it — commit it).
  The Bluesky Jetstream layer (`live.js`, the packets riding the links) is gone:
  **the site makes no external requests at all** — and since 2026-09-29 the
  Content-Security-Policy in `vercel.json` (`default-src 'self'`, no inline
  scripts) enforces it; `vite preview` sends the same headers, so check any
  new asset or library there before it ships.
- **Lab card (2026-09-29, `src/lab.js` + `src/labcard.js`):** on the Timeline,
  desktop only (≥ 1100 × 600): the site's `--ease-out` as live code. Drag the
  two control points (or arrow keys on them), a dot runs the curve, presets,
  and a code tab that shows `lab.js`'s `cubicBezier` region verbatim via Vite
  `?raw` — the code on screen is the code that runs. `[data-own-gestures]`
  keeps touch drags on it from flying the camera. Its loop runs only while the
  Timeline is open.
- **Cursor Buddy is animated, not a screenshot (2026-09-29, `src/buddy.js`):**
  a beat/featured entry with `anim: 'buddy'` gets a 16 s product loop drawn on
  a canvas — a code editor, the macOS pointer, the Line-bot robot following it
  (idle → listening bars → thinking → green "^^" answer bubble streaming "What
  does this error mean?"). Shapes, colours and timings come from the Swift
  source (GhostCursorShape, GhostPalette, GhostEngine, BuddyView). Desktop:
  the panel texture is redrawn ≤ 30 fps at 1024 px while lit
  (`tickAnimPanels`); phones: a `<canvas data-anim>` figure. Reduced motion:
  one still frame with the answer.
- **Finale lead-in (2026-09-29):** "That's the tour. / Have a role or a
  project? Let's build it." types in per character above the contact card as
  the door parts (`profile.finale`; screen readers get the whole sentence).
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
  3D chrome so the skim path at the end of `<body>` is readable. Its Work list and
  its Timeline rows are generated from `profile.js` at build time
  (`scripts/noscript.js`, a Vite `transformIndexHtml` plugin filling
  `<!-- noscript:work -->` in flight order and `<!-- noscript:timeline -->`) — the
  hand copies had drifted, the Timeline's with a stale counter; `tests/noscript.test.js`
  also holds the JSON-LD and noscript contact details to `profile.links`, and the
  head's four description copies (`description`, `og:`, `twitter:`, JSON-LD) to
  `profile.bio.meta` (≤ 160 characters; since 2026-09-30 it names the tour's stops —
  it used to lead with TEEPO and the client sites).
- **Fixed bar:** `src/bar.js` — name + role (`profile.title`), availability
  dot, Work, About, details (phone `tel:`, LinkedIn, GitHub with inline SVG
  icons — from `profile.links`), Copy email.
  `initBar({ profile, onWork, onAbout, root })`; the target indices are derived
  live by `computeStopIndices()` (first `project` / first `intro` stop), not
  hard-coded, so Director Mode reorders stay correct. The bar fades in once the
  flight leaves the Opening. Phones: a two-row CSS grid (`grid-template-areas`
  — name/role + Copy email, then Work · About · icon links), availability
  text hidden, icons only. Replaces the old dossier button / waypoint rail.
- **Director Mode** (`E`) and the FX/Transitions/UI/Assets panels
  (`B T U A`) are **dev-only**: gated by `DEV_TOOLS = import.meta.env.DEV ||
  ?edit` in the URL. Visitors never see them.

## The flight (DEFAULT_BEATS, `src/main.js`)
0. **Opening** — wordmark decodes from particles (loader hands straight into it).
1. **Hi** — 4:5 portrait as a WebGL panel turned 8° into the void (left),
   greeting + status + two lines beside it (`profile.js` `hi`).
2. **About** — two photos side by side (right): FIDF stage 4:3 and the Nova
   memorial 3:4; the story (command → stage → code) opposite (`profile.js` `about`).
3. **Timeline** — dated rows on a glowing rail (`profile.js` `timeline`), the
   "Download CV" pill, and the lab card on the right (desktop). The two old hero screens beside it were removed
   2026-09-29 (Yarin: "an old scrap"); no beat carries `screens` now.
4. **How I Build** — the build-log strip, method (2–3 sentences), proof numbers
   count up once, repo block (LLM Gateway lead card + TEEPO/SHADIEZ compact rows).
5. **LLM Gateway** — project stop, image left, SaaS group label. The strongest
   screen leads the work.
6. **Cursor Buddy** — animated panel right (`buddy.js`, no screenshot), macOS menu-bar agent, private repo (replaced Focus 2026-09-29).
7. **Sabai** — image left, **no live link** (2026-09-29): the app needs no login
   and shows real booking codes and phone numbers, so `url` stays empty (guarded in
   `tests/profile.test.js`) until Yarin gates it. Its pill reads "Personal app"
   (`pill` in `profile.js`) — "Private build" wasn't true of a live app.
8. **Agent Control** — image right, the cyber-security stop (live demo at
   agent-control-demo.vercel.app), **also** AeroCy.
9. **Thesis Agent** — image left, private build (his dad's M.A. thesis advisor).
10. **Gate Opener** — image right, private build (geofenced gate PWA). Its panel
    is 5:8 (15×24, save v22), filled by a 3× phone capture — in the default 16:10
    frame the app was a narrow column adrift in empty space. `phone: true` in
    `profile.js` caps its phone figure at 26vh so the stop clears the bar.
11. **SHADIEZ** — image left, Landing pages group label, **also** SmartCut.
    TEEPO left the flight 2026-09-29 but stays in the Timeline and How I Build.
12. **Contact** — the door (2026-09-14): the network parts around the look
    axis (vertex-shader push, `uDoor`, R = 34), the nebula ember warms, and a
    contact card (name, role, mail, tel, GitHub · LinkedIn, build stamp)
    fades in once the door is ¾ open. Leaving, the door eases shut where it opened
    (`_doorC` / `_doorAx` follow the Contact beat only; they used to jump to the next
    stop's axis and slam shut in one frame). No "Back to the start", no availability
    line (dropped 2026-09-14; `profile.contact` is gone). Camera tilts up.

**Loader:** the poster of the Higgsfield void loop (`void-loop.webp`, 46 KB)
sits under the constellation canvas as a still; reduced motion drops it. The
clip itself stopped being fetched on 2026-09-29 (the loop fades out at 62 % of
the loader, so it showed for ~190 ms on a warm localhost and rarely reached
`canplay` over a real network, while Lighthouse mobile counted it as half the
page) and left the repo in the wrap-up pass. **No WebGL 2** (three r169 throws):
a boot guard in `main.js` — an `error` listener that comes off on the module's
last line — swaps the 3D chrome for the no-JS skim path (the `<noscript>`
markup, which a scripting browser keeps as text) instead of leaving the visitor
on "0% · initialising" forever. Spec:
`docs/superpowers/specs/2026-09-14-contact-door-and-loader-design.md`.

Project blocks lead with **Outcome** (display size, the line the eye lands on),
then Problem and Decision as one sentence each. A beat's optional `also: '<id>'`
folds a second featured project in as a compact row under the links.

## Code map
| File | Lines | What |
|---|---|---|
| `src/main.js` | ~3,300 | Scene, network, nebula, flight, Director Mode, perf tiers, save/migrate, void dimming, HUD, animated panels, lab mount |
| `src/buddy.js` | ~190 | Cursor Buddy's product loop on a canvas (panel texture + phone figure), node-tested timeline |
| `src/lab.js` / `src/labcard.js` | ~45 / ~115 | Timeline lab card: `cubicBezier` (node-tested) and the drag/loop/code-tab wiring |
| `scripts/buildlog.js` | ~55 | Build-time git-history summary for the How I Build strip, node-tested; snapshot in `src/content/buildlog.json`. Dates are UTC (`TZ=UTC`, `format-local`), like `today`; the heatmap shows the last 26 weeks, the counts stay all-time |
| `scripts/owner.js` / `scripts/stamp.js` | ~60 / ~170 | The owner's mark: bundle banners, humans.txt, the no-JS notice / XMP + EXIF in every image (see Owner's mark) |
| `src/panels.js` | 96 | DOM stop layer: builds/shows/hides stops (inert + aria-hidden), count-up, print/copy |
| `src/render.js` | ~210 | Pure HTML renderers (hi, about, timeline + lab card, build + build log, project + abilities / potential list, contact + finale) incl. the portrait-only `stop-img` figures, node-tested |
| `src/bar.js` | 53 | Fixed top bar: name + role, availability, Work, About, phone / LinkedIn / GitHub, Copy email |
| `src/hash.js` | 28 | Deep-link resolver: fragment/anchor → stop index, prototype-free, node-tested |
| `src/printcv.js` | 54 | Print-only CV (moved out of the old dossier.js) |
| `src/content/profile.js` | 269 | **Single source of truth** for bio, CV, intro/method/proof, 10 featured (7 flight stops + AeroCy/SmartCut rows + TEEPO for How I Build) + shipped/labs projects, links, status |
| `src/style.css` | ~1,200 | All styling incl. the phone tiers (portrait, small, SE, landscape — last in the file) + print CV |
| `index.html` | ~410 | Shell, loader, editor panels, JSON-LD, noscript skim path |
| `public/previews/*.webp` | | teepo · aerocy · shadiez · smartcut · llm-gateway · sabai · agent-control · thesis · gate-opener · kiaras-club (1400–2400 px wide, except gate-opener: a 1000×1600 phone capture; panel canvases take a 1600 px long side on desktop, 1024 on touch). Cursor Buddy has none — `buddy.js` draws it |
| `public/assets/me/` | | portrait 4:5 (1000×1250, centred, head to knees; 19.2×24 panel) + 2 About panels: FIDF stage 4:3 (logo + speaker, no black rig band; 18×13.5) and the Nova memorial at Re’im 3:4 (10.5×14). Re-cut 2026-09-29 from the originals in `~/.claude/uploads/…` (mild grade + unsharp, q88); the lectern shot was a crop of the stage and is gone. Panel textures keep the panel's aspect (long side 1600, 1024 on touch) — until 2026-09-29 the height was capped at 1024, so every portrait panel was a stretched square |

Deps: `three` 0.169 and `vite` 8 (+ `happy-dom` for tests). No React.
`meshline` and `three.quarks` were never imported and left on 2026-09-29.

### Phone sizes (2026-09-30, Yarin: "go for" the wrap-up items)
Every stop now fits between the bar and the chevrons at every size swept (Chrome, true
viewports): portrait 360 × 640, 375 × 553 (iPhone SE), 375 × 629, 390 × 664, 402 × 714,
440 × 790; landscape 640 × 360, 667 × 320 / 331, 750 × 340, 874 × 370, 932 × 400; desktop
1024 × 700 up to 1920 × 1080, incl. 1366 × 657 and 1280 × 690. Safari (iPhone 17 Pro) checked.
- **Portrait frame:** phone stops start at `max(12.5vh, 14px + 5.5rem)` and end at
  `max(…vh, 4rem)`: the bar ends at 94 px, and 12.5vh (69-79 px on short phones) let a
  full stop slide its first line under it.
- **Small phones** (≤ 640 px tall): smaller portrait and photos, the proof counters one line
  each, and the stack line leaves the three stops that carry a list. **iPhone SE** (≤ 600):
  screenshots become a 13.5vh strip, the stack line and the abilities / potential list go,
  the Timeline's CV pill joins its title row, an Also row keeps one line ("Also · AeroCy").
  How I Build's lines and project outcomes lost the 30ch desktop measure on every phone.
- **Landscape phones** (`(orientation: landscape) and (max-height: 520px)`, last in
  `style.css`, guarded by `tests/css.test.js`): the figure beside the words — render.js
  wraps each stop's words in one `.stop-txt` after the figure; `data-side` still names the
  picture's side — the bar one row (name and role side by side), ▲▼ stacked bottom-right
  in a 4.4rem lane, the Timeline rows in two columns with the CV pill beside the title, How
  I Build in a method | log + proof grid over one row of repo cards, Contact's lead-in
  beside the card. The abilities / potential list hides there, as on 1024 × 700. Under
  720 px wide (the SE on its side) the picture column narrows, the stack line and the
  role in the bar go. Stacked, these stops ran 150-800 px past the fold.
- **Short laptops** (≤ 720 px tall) got smaller heatmap cells, no commit feed and a
  tighter project frame (1366 × 657 ran 8-20 px off before, production included).
- Two bugs on the way: two quick taps on ▼ zoomed the page in iOS Safari
  (`touch-action: manipulation` on `html`, buttons and links; pinch-zoom still works),
  and on a short screen the contact card (`overflow: hidden`, so a flex item may shrink)
  clipped its © row instead of letting the stop scroll (`flex-shrink: 0`).

### Owner's mark (2026-09-29, Yarin: "make sure that everything is watermarked to my name")
Every file the site ships names him, all from `profile.js`:
- **Page:** `<meta name="author">`, `<link rel="author" href="/humans.txt">`,
  JSON-LD `author` / `copyrightHolder` / `copyrightNotice` pointing at the Person
  (`@id`), an HTML comment on the first line, the sr-only h1, the contact card's
  last row (`© 2026 Yarin Levin · Updated …`), the print CV's footer (and its
  contact line is links now, so a saved PDF opens mail / LinkedIn / GitHub),
  the no-JS path's closing line, and a styled line in the DevTools console.
- **Code:** `scripts/owner.js` (Vite plugin) puts a `/*! … */` banner on every JS
  and CSS file after minification and emits `/humans.txt`; `build.license` emits
  `/licenses.txt` with three.js's MIT notice (the minifier had stripped every
  license comment). `LICENSE` (all rights reserved; three.js and the OFL fonts
  keep their own), `package.json` `author` / `license: UNLICENSED`.
- **Images:** `scripts/stamp.js` (`npm run stamp`) writes XMP (dc:creator,
  photoshop:Credit, dc:rights, xmpRights) and EXIF Artist / Copyright into every
  WebP / JPEG under `public/` by rewriting chunks around the untouched image data
  (pixels verified identical). The panels carry no text on purpose, so the mark
  is metadata, not a visible stamp. `tests/stamp.test.js` fails the build on
  any unstamped image — run `npm run stamp` after adding one.
- `tests/owner.test.js` holds all of it to `profile.js`, and no source file may
  spell the name out (the loader and Opening wordmarks used to).

### Headers (`vercel.json`, 2026-09-29)
CSP (`default-src 'self'`; styles allow inline attributes; `frame-ancestors
'none'`), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`,
COOP. Hashed build files (`/assets/<name>-<hash>.*`) cache for a year,
immutable; `/fonts/*` for 30 days; everything else revalidates (the unhashed
`public/assets/me/*` must stay revalidated — the rule's `[^/]+` keeps it out).
Safari won't match `'self'` on an IPv6-literal origin: test the preview on the
Mac's LAN IP (`http://10.x.x.x:4173`), not `http://[::1]:4173`.

### Persistence / migrations
Path + FX config persists in **localStorage** `voidConfig`, currently **save
version 22**. Any save below 16 has its beat array replaced wholesale with
`DEFAULT_BEATS` (the shape changed too much to patch) while the visitor's
global FX/speed/ease settings are kept; v17 (2026-09-12) then rewrites
`/previews/*.jpg` → `.webp` in whatever beat array survived (the JPGs are
gone), leaving any URL pasted in Director Mode alone; v18 (2026-09-14) — Hi /
About / Timeline replace Hero / Intro / CV, beats gain `panels[]` and
`screens` — wholesale re-adopts `DEFAULT_BEATS` again (any save `< 18`), same
global-settings carve-out; v19 (2026-09-16) re-adopts only the About beat's
`panels[]` (photo panels sized to their real aspect); v20 (2026-09-16) re-adopts
the About `panels[]` (re-laid so the three never overlap) and the Hi `panel`
(18×24); v21 (2026-09-29) — seven project stops, no Timeline screens, two About
photos — wholesale re-adopts `DEFAULT_BEATS` and resets the minimal-void globals
(`starFrac`, `nodeFrac`, `lineFrac`, `pulse`, `flare`, `cursorDrive`) from
`FX_DEFAULTS`; v22 (2026-09-29) re-adopts only the Gate Opener beat's `panel`
(16:10 → 5:8). The v2–v14 patch migrations were
deleted on 2026-09-12: they only ever ran on beats the v14/v15 reset was about
to discard. Any future
`DEFAULT_BEATS` shape change needs its own migration step + version bump,
because visitors carry old beat arrays. Use Director Mode → **Copy config** to
export tuned `BEATS` and paste into `DEFAULT_BEATS`.

### Perf tiers (all in `main.js`, top)
- `IS_TOUCH` — DPR cap 1.25, nebula res 0.33 / fewer steps, halved star/node/link
  density, no water sim / bokeh, no CSS blur tweens.
- Compact screens (`isCompact()`: portrait or ≤ 520 px tall — the same line as the CSS
  `(max-height: 520px)`; at exactly 520 both the figures and the panels showed) get 2-px stand-in
  panel textures — no panel image fetch, draw or upload, since those screens only
  show the DOM figures; crossing the compact line on resize rebuilds them, and
  Director Mode swaps real textures in while it's open (`setEdit`).
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
npm run dev      # http://localhost:5173  (DEV_TOOLS on → E/B/T/U/A work)
npm run build    # runs the test suite, then vite build → dist/
npm test         # node --test tests/*.test.js — profile, render, bar, panels, printcv, globals, hash, save, assets, domain, lab, buddy, buildlog, owner, stamp, css (happy-dom for the DOM ones), 98 passing
npm run stamp    # the owner's name into any new image under public/ (the test suite fails until it's done)
npx vite preview --host   # the production build with vercel.json's headers (CSP) — `void-preview` in .claude/launch.json
```
`.claude/launch.json` has a `void-dev` config for the browser preview.
Offline-capable: fonts are self-hosted and the site makes no external requests. HMR can be flaky —
hard-refresh if a change doesn't show.

## Open work (authoritative checklist in BUILD_PLAN.md Phase H)
1. ~~Camera authoring for stops 2–11~~ done 2026-09-12; phones use a derived
   portrait pose per project stop (`applyPortraitPoses` in `main.js`).
2. ~~Confirm the three proof numbers~~ confirmed 2026-09-14 with the wording
   rework (spec `docs/superpowers/specs/2026-09-14-wording-rework-design.md`):
   the term is "AI-native developer" everywhere, every claim is checkable, and
   `tests/profile.test.js` blocks the retired phrases. **Recounted 2026-09-30:
   21 built, 7 live** (was 17 / 7). Yarin's 09-14 numbers were exactly this rule:
   built = every project in `work.featured` + `work.shipped`, plus this site; live =
   the ones with a public link, plus this site (all seven answered 200 on 09-30;
   Sabai runs but stays unlinked, so it doesn't count). The four stops added 09-29
   made it 21. `tests/profile.test.js` recounts the proof counters, `bio.short` and
   the Timeline row, so adding a project fails the build until the copy follows.
3. ~~X handle~~ dropped 2026-09-22 — no X link anywhere; `tests/profile.test.js` keeps `links.x` out.
4. ~~SmartCut redeploy~~ decided 2026-09-22: **GitHub only, permanently**.
   `url: '', offline: true` in `profile.js` is the final shape (the SHADIEZ
   "also" row shows the repo link only); `tests/profile.test.js` knows the flag.
5. **Real-phone pass** — deployed site (contrast audit done 2026-09-13, all
   visitor text ≥ 4.5:1 on the void), Lighthouse mobile 2026-09-12 (after
   WebP + label fix): perf 84–88 / a11y 100 / best-practices 100 / SEO 100,
   100 % legible text, 610 KiB total. Still to do on a physical phone.
   ~~Landscape phones~~ got their own layout 2026-09-30 (they overflowed 150-800 px
   on every stop); Safari landscape and the SE simulator still want a look, the
   Chrome sweep passes (see **Phone sizes**).
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
  `onTint`/`data-tint` hover channel; (2026-09-29) the extruded 3D text tool
  (`text3d.js`, Y panel, the lights and glass environment only it used). Don't
  reintroduce dead channels.
- Every `DEFAULT_BEATS` change ships with a save migration + version bump
  (`tests/save.test.js` fails if `save()`'s version lags the newest guard, and
  pins a fingerprint of the `DEFAULT_BEATS` block per save version — edit a beat
  and it fails until you bump, migrate and re-pin).
- **No root-font multiplier for phones.** `applyRootFont()` once scaled the
  root to 13.6 px under 640 px, which put every rem label at 8–9 px
  (Lighthouse: 20 % legible). Phone sizing lives in `style.css`; the
  visitor-facing label tier is `.75rem` = 12 px and should not go lower.
- Verify on a phone before pushing — mobile has been the recurring regression.
  Use the iOS Simulator (Safari on iPhone 17 via the `Claude_Code_iOS_Simulator`
  tool; `xcode-select` is set) rather than Chrome's 390×844 emulation, which
  hid both the soft-panel and the panel-on-text bugs of 2026-09-17. Safari sets
  the stop text a little wider than Chrome (How I Build had 5 pt where Chrome
  measured 19 px), so leave Chrome-measured fits some slack. The simulator runs
  headless: it can't be rotated from here, and each new device (the SE was added
  2026-09-30) asks Yarin for access in the simulator panel.
- **Measure desktop sizes on `[::1]` or the LAN IP, never `localhost:5173`:** the
  Playwright browser keeps an 80 % zoom for that origin, so a "1366×657" run there
  lays out at 1707×821 (found 2026-09-30; earlier desktop fits measured there were
  optimistic). Mobile-emulated contexts ignore it. `.playwright-mcp/phones.js`
  (gitignored) is the stop-fit sweep: every stop against the bar and the chevrons
  per viewport.
- `sketches/` holds the June–July `demo-*.html` pages and the two font specimens
  (moved out of the repo root 2026-09-30) — scratch/reference, not part of the
  shipped site; `main.js` comments point there where a shader was ported. The seven
  June slash commands in `.claude/commands/` (`/void`, `/atmosphere`, `/fx`, …) are
  just as stale — they ask for the Typekit fonts, the wave ribbon, cursor effects
  and a TEEPO beat — so don't follow them (the sandbox won't let Claude move them;
  Yarin can `git mv .claude/commands/*.md sketches/commands/`). `*.code-workspace`
  is gitignored. The `references/` folder no longer exists.
