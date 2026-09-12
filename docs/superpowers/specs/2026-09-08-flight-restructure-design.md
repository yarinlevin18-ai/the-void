# The Void — flight restructure design (v15)

Date: 2026-09-08. Status: approved in brainstorm, pending user review of this file.
Supersedes the v13/v14 nine-beat "person-first" flight. Source brief: Yarin's
`portfolio-layout-spec.md` (2026-09-08), reference tone Dennis Snellenberg.

## 1. Goal

Fix the two complaints about the live site: the work is buried, and the flight is
too slow to get to the point. Keep what Yarin likes: the camera flying into depth,
the section-to-section motion, the animations. Drop the flat "page over the void"
idea explored earlier; it was rejected for feeling like dead scrolling.

## 2. Decisions locked

- **Flight stays.** Camera path, section snapping, wheel / keys / swipe input,
  300 ms cooldown, per-beat FOV and duration, `fitFov`, Director Mode.
- **Order** (from the spec): Hero as built → Intro → CV → How I Build →
  Selected Work (Landing pages, then SaaS) → Contact. CV stays before Work.
- **Selected Work = one camera stop per project**, one full-width block each,
  alternating image side. No grid, no expanding rows, no dossier index.
- **Groups.** Landing pages: TEEPO, AeroCy, SHADIEZ, SmartCut. SaaS: LLM Gateway
  (lead), Focus, Thailand trip app. Drift Ghost (Unity mobile drifting game)
  and Atlas Command Center are not stops; they stay in `profile.js` and may
  count toward the proof numbers, nothing more.
- **Repo links:** only where the repo is public (the four landing pages). SaaS
  blocks show a live link where one exists, otherwise a "private build" label.
- **Language:** English only.
- **Type:** Bricolage Grotesque (display) · Schibsted Grotesk (body) · Doto
  (labels, counters). All OFL, self-hosted, subset to Latin woff2. Source Code
  Pro remains only for the extruded 3D wordmark (`text3d.js`).
- **Removed:** dossier overlay, in-world projects hub, waypoint rail, free-roam
  (`V`), hotkeys legend, caption system, "Who / Road / Work With / Where This
  Goes / My Projects / The Work" beats. Their JS, CSS and HTML go too.
- **Kept dev-only:** Director Mode and the FX/Transitions/UI/3D-Text/Assets
  panels behind `DEV_TOOLS`.

## 3. The stops (DEFAULT_BEATS, 13 beats)

| # | Beat | Camera | Dur | DOM panel content (all from `profile.js`) |
|---|---|---|---|---|
| 0 | Opening | as today | 1.4 | Wordmark decodes from particles. Fixed bar fades in with it. |
| 1 | Hero | as today | 2.1 | Untouched: the two floating app screens. |
| 2 | Intro | new, slow "exhale" | 2.4, softest ease | 2–3 first-person sentences, `intro.lines[]`, max-width 24–30ch, clamp(2rem→3.5rem). One small context line: location · availability. No image, no button. |
| 3 | CV | new | 1.6 | 5 rows: years left, `role · org` + one line right. Thin dividers. BGU is one row. Fits one screen at 390×844. |
| 4 | How I Build | new | 1.6 | (a) method, 2–3 sentences at Intro scale; (b) proof row, 3 true numbers from `proof[]`, count up once; (c) repo block: LLM Gateway card (name, one-line problem, live link, stack line in Doto), plus TEEPO and SHADIEZ compact rows with repo + live. |
| 5 | TEEPO | project hop | 1.35 | Project block, image left. |
| 6 | AeroCy | project hop | 1.35 | Project block, image right. |
| 7 | SHADIEZ | project hop | 1.35 | Image left. |
| 8 | SmartCut | project hop | 1.35 | Image right. |
| 9 | LLM Gateway | project hop, SaaS group label appears | 1.35 | Image left. |
| 10 | Focus | project hop | 1.35 | Image right. "Private build" label, no live. |
| 11 | Thailand trip app | project hop | 1.35 | Image left. |
| 12 | Contact | as today (tilt up) | 3 | One first-person line, full email as `mailto:` at hero scale, small text links GitHub · LinkedIn · X, availability line, footer "Yarin Levin · 2026". |

Project block, fixed slot order: **Problem** (one sentence) · **Decision** (what
was built and what was deliberately not) · **Outcome** (plain language) · live
link · stack line (Doto). One or two real screenshots on the existing WebGL
image panel of that beat, hairline frame, no device mockups. Title large, body
small, two type sizes per block.

Hero and Contact camera/FX values are copied verbatim from the v14 beats. New
beats are authored in Director Mode and baked into `DEFAULT_BEATS` via Copy
config. Every beat keeps the existing `fx` override shape.

## 4. Fixed bar

Visible from the Opening onward, DOM, top of viewport: name (Bricolage) ·
green availability dot + "Available" · **Work** → `goTo(5)` · **About** →
`goTo(2)` · **Copy email** button (clipboard, label flips to "Copied" 1.8 s).
On phones the bar shows name + Copy email only. It replaces the waypoint rail
as the only navigation chrome. `hud-beat` / `hud-progress` stay as they are.

## 5. Motion

One motion idea per stop, every panel animation ≤ 600 ms, reduced-motion
disables all of them (content appears static and immediately):

- Intro: lines fade + 12 px rise, stagger 60 ms.
- CV: rows slide in from their divider, stagger 40 ms.
- How I Build: method as Intro; proof numbers count up once in 500 ms, linear;
  repo cards lift 4 px on hover, no 3D.
- Project blocks: image panel reveals first (existing panel approach), text
  block 150 ms later. Hover on the block tints the void toward the project's
  brand color (existing per-beat tint).
- Contact: email scales 0.96 → 1 with fade.

Camera rhythm: Hero→Intro 2.4 s with the softest available ease (the "exhale");
CV and How I Build 1.6 s; project hops 1.35 s; Contact 3 s tilt-up, as today.

## 6. Code changes

### `src/main.js`
- Replace `DEFAULT_BEATS` with the 13 beats above. Bump save to **version 15**;
  the migration branch `if (!(d.version >= 15))` **replaces** the saved beat
  array with `DEFAULT_BEATS` (structure changed too much to patch) while
  keeping the visitor's global FX/speed settings.
- Delete: dossier wiring, hub, waypoints (`buildWaypoints`, `updateWaypoints`),
  `setFreeRoam` and the `V` key, hotkeys legend toggle, caption functions
  (`resolveCaption`, `setCaption`, `hideCaption`). `#visitlive` and
  `#freeroam` elements go; the project block owns its live link.
- On arrival at beat `i` call `panels.show(i)`; on departure `panels.hide(i)`.
  Nothing else about panels lives in `main.js`.
- Bar: `src/bar.js`, exports `initBar({ goTo, email })`.

### `src/panels.js` (new)
- `init({ beats, profile, container })` builds one `<section class="stop">` per
  beat from `profile.js`, hidden by default, plus the group label for SaaS.
- `show(i)` / `hide(i)` toggle `.in` and run the stop's single reveal recipe.
- Renderers: `intro`, `cv`, `build`, `project`, `contact`. Each is a pure
  function `(data) => HTMLElement`. No Three.js imports.

### `src/content/profile.js`
Add: `intro { lines[], context }`, `method { lines[] }`, `proof [{ n, label }]`
(only true numbers; the plan lists candidates for Yarin to confirm),
`projects[]` entries for SmartCut, Focus, Thailand trip app, Drift Ghost,
Atlas; per featured project `problem`, `decision`, `outcome`, `group`
(`landing` | `saas`), `private: true` where applicable; `contact.line`,
`contact.availability`, `links.x`. Remove dossier-only fields once nothing reads
them. The print CV keeps reading `cv.*`.

### `index.html` / `src/style.css`
- Remove dossier, waypoints, hotkeys, caption, freeroam, visitlive markup and
  CSS (`#dossier*`, `#waypoints`, `#hotkeys`, `#caption`). Keep loader, scene,
  hud, dev panels, JSON-LD, noscript skim path (regenerated from the new
  content), print stylesheet.
- New `@font-face` for Bricolage / Schibsted / Doto woff2 in `public/fonts`,
  preloaded. `--f` becomes `--f-display`, `--f-body`, `--f-mono`.
- Mobile-first CSS for stops 2, 4 and 5–11; desktop is the adaptation.

### Docs
`CLAUDE.md` flight section, `BUILD_PLAN.md` ledger and `PORTFOLIO_PLAN.md`
updated to v15 in the same change.

## 7. Performance and testing

Budgets: full load < 2 s on the emulated phone; fonts ≤ 200 KB total
(Latin subset, woff2); no new WebGL work; panel animations ≤ 600 ms.

Before each merge:
1. Emulated 390×844, 6× CPU throttle, walk all 13 stops; no hitch on arrival.
2. Keyboard-only: arrows / space through the flight, bar buttons, Copy email.
3. `prefers-reduced-motion`: content visible, no reveals, flight still works.
4. Returning visitor: seed `localStorage.voidConfig` with a version-14 save,
   reload, confirm 13 beats and the new order, no console errors.
5. Print CV still one page.
6. Lighthouse on the Vercel preview: performance and accessibility both ≥ 90.

## 8. Out of scope

Hebrew/RTL, a contact form, sound, thumbnail grid, expanding rows, live GitHub
API counts (optional later), Figma sync, custom domain.

## 9. Open content items for Yarin (do not block the build)

- Three true proof numbers for How I Build.
- Problem / decision / outcome lines for the seven featured projects (first
  drafts will be written from existing `what` / `built` copy and marked).
- Screenshots for SmartCut, LLM Gateway, Focus, Thailand (none exist in
  `public/previews`).
- Ambitions paragraph is no longer a stop; it can live in Intro's third
  sentence if wanted.
