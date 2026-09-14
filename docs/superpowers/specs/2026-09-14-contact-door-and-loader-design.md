# Contact door + loader loop — design (2026-09-14)

Status: approved in conversation, 2026-09-14. Second and third of the three
sub-projects that followed the person chapter (person chapter → **in-void
contact moment** → **Higgsfield loader**). Both ship together.

## Goal

1. The flight ends in a moment, not a form: on arrival at Contact the network
   parts like a door, the void's one warm ember lights the core, and a contact
   card is handed to the visitor.
2. The loader stops looking plain: a short Higgsfield-generated loop of the
   void drifts behind the decoding wordmark, so the loader and the Opening
   read as one shot.

## Decisions (2026-09-14)

- The moment is **a door** (not a signal the visitor sends, not a light they
  reach for). It opens **on arrival**, with no input required.
- Inside the door is **a card**: name, role, email, phone, GitHub · LinkedIn,
  availability. Feels like being handed a business card.
- "Back to the start" and the year footer are **dropped**. The fixed bar
  carries the name; the visitor scrolls up anyway.
- The door is a **vertex-shader displacement** on the existing node and link
  materials (not a CPU rewrite of the buffers, not a DOM scrim).
- The loader loop shows **the void itself**: a slow forward drift through a
  dark navy network with cyan links. Not abstract energy, not a portal.

## 1. The door (WebGL, `src/main.js`)

Both the node material (`pmat`) and the link material (`lmat`) route vertex
positions through the shared `drifted()` GLSL function. The door slots in
there once and moves both.

- **Uniforms** on `pmat` and `lmat`: `uDoor` (float, 0→1) and `uDoorC`
  (vec3, the door centre in world space). `uDoorC` is computed at runtime as
  the point **60 units** along the Contact beat's look axis
  (`cam + normalize(look − cam) * 60`), so a Director Mode re-pose of the
  Contact camera moves the door with it. No `DEFAULT_BEATS` change.
- **Displacement** (after the drift, before projection): with `R = 34.0`
  (world units, the panel scale) and `d` the distance from the vertex to the
  door axis (the line through `uDoorC` along the camera look direction), the
  vertex is pushed outward along the radial direction by
  `uDoor * smoothstep(R, 0.0, d) * R * 1.3`. Nodes on the axis move most,
  the edge is soft, nothing beyond `R` moves. Link vertices use the same
  formula so a strand keeps its endpoints attached to its nodes.
- **Link thinning**: in `lmat`'s fragment shader alpha is multiplied by
  `1.0 − uDoor * smoothstep(R, R * 0.4, d)` (with `d` passed as a varying),
  so strands inside the door fade instead of stretching across it.
- **Ember**: the nebula's `uEmber` lifts from its FX value (0.06) to **0.5**
  in lockstep with `uDoor`, concentrated by the existing dense-core mask.
  This is the single warm accent the palette rule allows; it returns to the
  FX value when the door closes.
- **Timing**: `goTo(i)` starts the door tween when the flight to the Contact
  beat has covered **70 %** of its duration, running **1.1 s** with the
  `easeOut` ("exhale") ease. Leaving Contact (any `goTo` away from it) closes
  the door in **0.6 s**, `easeIn`. A hash arrival on Contact (no flight)
  starts the tween the moment the loader lifts. The tween is driven from the
  render loop like the existing camera tweens (no CSS, no setTimeout).
- **Dev tuning**: one FX slider `door` (0–1) on the B panel to preview the
  open state; not a visitor control. Director Mode gets nothing new.
- **Reduced motion**: `uDoor` and the ember jump to their end state on
  arrival and back on departure.
- **Phones**: the same shader path; no extra draw calls, no extra cost.

## 2. The card (DOM, `src/render.js`, `src/panels.js`, `src/style.css`)

`renderContact(p)` returns:

```html
<div class="eyebrow">Let’s build something</div>
<article class="card" aria-label="Contact card">
  <header><h2 class="card-name">Yarin Levin</h2><p class="card-role">AI-native developer</p></header>
  <a class="card-row mail" href="mailto:…" data-copy-email>…<small>click to copy</small></a>
  <a class="card-row tel" href="tel:+972548029820">054-8029820</a>
  <div class="card-row social"><a …>GitHub</a><a …>LinkedIn</a></div>
</article>
```

- Name and role come from `profile.name` and the existing `profile.title`
  ("AI-native developer"), the same string the JSON-LD and noscript carry. Email,
  phone, links from `profile.links`; the `tel:` href is the phone with
  spaces/dashes stripped and the leading 0 replaced by `+972`. X joins the
  social row automatically when `links.x` is uncommented.
- `profile.contact` is removed entirely (the eyebrow says it; the
  availability footer was dropped on 2026-09-14 after review).
- **Removed**: the "Back to the start" pill, the year footer, and the
  in-page-anchor intercept in `main.js` that routed `href="#top"` clicks
  through `goTo` (the card has no in-page anchors). `#top` as a deep link is
  untouched (`src/hash.js`).
- **Style**: hairline frame like the panels (1px, `rgba(79,210,255,.28)`),
  dark glass fill `rgba(6,20,28,.55)`, `backdrop-filter: blur(10px)` on
  non-touch only (the existing no-CSS-blur rule on touch holds), centred in
  the viewport under the tilted-up camera, `max-width: 30rem`, full width
  minus the 16px gutters under 640px. Rows are separated by 1px hairlines.
  Colours are the audited tokens only (`#eaf4ff` text, `#68859e` secondary,
  cyan accent); the availability footer is Doto at the 12px phone floor.
- **Reveal recipe**: the section mounts hidden as today; when the door tween
  passes **0.75** the card scales 0.96→1 and fades in over **500 ms**, rows
  staggered **60 ms** via `--i`. Off under reduced motion (card appears at
  once with the door). Departure hides it exactly as other stops.
- Copy-to-clipboard on the email keeps its toast (`data-copy-email` handler
  in `panels.js` unchanged).

## 3. The loader loop (`index.html`, `src/main.js`, `public/assets/loader/`)

- **Generation**: one 6–8 s clip, 16:9, through the Higgsfield tools in the
  session. Prompt intent: a slow forward drift through a dark navy void,
  small cyan nodes joined by thin links, faint teal nebula, no text, no
  lens flare, no camera shake, near-black blacks, the last frame matching
  the first so it loops. Two or three takes; Yarin picks one.
- **Encode**: `void-loop.mp4` (H.264, yuv420p, 1920×1080, ≤ 2.5 MB, no
  audio track) and `void-loop.webp` poster (first frame, q80). Both under
  `public/assets/loader/`. Encoding is done locally with ffmpeg; the source
  render is not committed.
- **Markup**: inside `#loader`, before `#ld-canvas`:
  `<video id="ld-loop" autoplay muted loop playsinline preload="auto"
  poster="/assets/loader/void-loop.webp" aria-hidden="true">
  <source src="/assets/loader/void-loop.mp4" type="video/mp4"></video>`.
  The poster paints immediately; the video fades from 0 to 1 over 400 ms on
  `canplay`. If it never plays (data saver, blocked autoplay) the poster
  stays and nothing else changes.
- **Constellation**: `#ld-canvas` stays on top at opacity **0.5** so the
  wordmark decode keeps its nodes wiring up. Wordmark, meter, label and the
  600 ms exit warp are unchanged; the video fades out with the panel.
- **Reduced motion**: the `<video>` is paused and removed from the flow on
  `PREFERS_REDUCED` (poster only).
- **Touch**: same file. If the 390×844 CPU-throttled check shows the loader
  dropping frames, the fallback is a 720p encode behind
  `<source media="(max-width: 640px)">`; not built unless measured.

## 4. Migration, tests, docs

- No `DEFAULT_BEATS` shape change → save version stays **18**.
- `tests/render.test.js`: card rows (name, role, mail, tel, social,
  footer), the `tel:` href normalisation, no `href="#top"`, escaping.
- `tests/profile.test.js`: `profile.title` exists; `contact.line` gone.
- `tests/assets.test.js` (new): `public/assets/loader/void-loop.mp4` and
  `.webp` exist and the mp4 is ≤ 2.5 MB.
- `tests/panels.test.js`: copy-email still wired on the card.
- Target: **50** passing.
- `CLAUDE.md`: flight entry 10, code map (render.js, main.js door), loader
  paragraph. `BUILD_PLAN.md`: Phase L. `index.html` noscript contact block
  regenerated to the card’s rows; the JSON-LD stays as it is (it already says
  "AI-native developer" and the guard test keeps the strings aligned).

## Out of scope

Any form or backend, sound, the X handle, SmartCut redeploy, the real-phone
pass.
