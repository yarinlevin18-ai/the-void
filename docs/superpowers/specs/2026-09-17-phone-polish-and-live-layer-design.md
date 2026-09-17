# Phone polish + live layer — design (2026-09-17)

Status: **proposed, awaiting Yarin's call on B and E.** Everything here is
visitor-facing; Director Mode is untouched.

Inputs: the per-stop phone entrances agreed on 2026-09-17, plus reviewer
feedback relayed the same day (Hebrew, paraphrased): the particle background
fights the text; use arrows instead of a page counter; put the contact details
in the top bar; show something *running* on the site (a data structure or a
live data flow) so the work speaks for itself.

## A. Per-stop entrances on phones (agreed)

Portrait screens only, ≤ 600 ms, off under `prefers-reduced-motion`, desktop
unchanged. Project effects are assigned by position among project stops
(`data-reveal` set in `panels.js`), never by project name.

| Stop | Entrance |
|---|---|
| Hi | portrait "develops": cyan-tinted, blurred → full colour, then the lines rise |
| About | stage slides in from the left, memorial from the right, small tilt settles |
| Timeline | keeps the rail draw + row stagger |
| How I Build | proof panel lights first (numbers count), repo cards deal in from below |
| project 1 (`scan`) | a cyan scanline sweeps down, uncovering the screenshot |
| project 2 (`iris`) | the screenshot opens from its centre |
| project 3 (`deal`) | rises from below with a perspective tilt, lands flat |
| project 4 (`wipe`) | left-to-right wipe with a glowing edge |
| project 5 (`shutter`) | overexposed frame settles to the real image |
| Contact | keeps the door + staggered rows |

Files: `src/style.css` (one portrait + no-preference media block),
`src/panels.js` (`data-reveal`), `tests/panels.test.js` (reveal assignment).

## B. Text over the void — needs a decision

The reviewer said "get rid of the particle background". The network *is* the
concept (the flight between stops happens through it), so three options:

1. **Recommended — clear the void behind the words.** While a stop is shown,
   the network and nebula fade to ~35 % brightness and the link traffic pauses;
   they come back up during the flight. The void stays the transition, the
   text owns the stop. One uniform (`uDim`) driven from the render loop, plus
   a touch of extra weight on body text (`#cfe8ff` → `#eaf4ff`, 1.5 → 1.55
   line-height on phones).
2. Local glass: a `backdrop-filter` slab behind each text block (like the
   proof panel). Reads as cards; heavier on phone GPUs.
3. Literal: drop the network entirely on stops. The site becomes a dark page
   with a fly-through between pages. Not recommended.

## C. Arrows instead of the page counter

Replace the bottom-left `HI 2 / 11` HUD with two chevrons (▲ ▼) bottom-centre
that call `goTo(index ∓ 1)`, the down one pulsing once on arrival at the
Opening (replaces "scroll / swipe to fly"). Progress becomes a 2 px hairline
along the bottom edge instead of a number. Keep the stop name for screen
readers (`aria-live` region), hide it visually. The `ux-hud` Director toggle
keeps working. Files: `index.html`, `src/style.css`, `src/main.js`
(`updateHud`), `tests/globals`/`bar` untouched.

## D. Details in the top bar

Today: name · availability · Work · About · Copy email. Add the role line
under the name and a details cluster: phone (`tel:`), LinkedIn, GitHub, as
compact mono links. Phones: two rows — name + role, then Work · About ·
Copy email · phone · in · gh. Everything from `profile.js`. Files:
`src/bar.js`, `src/style.css`, `tests/bar.test.js`.

## E. Something running — needs a decision

The ask is "live data flow / a data structure at work". Two credible options:

1. **Recommended — live feed on the void.** Subscribe to Wikimedia's public
   recent-changes EventStream (SSE, CORS-open, ~10 events/s). Each event
   becomes a packet travelling a link of the network; a compact strip on the
   How I Build stop shows the *data structure*: a ring buffer of the last 64
   events, a sliding-window rate counter (events/s), and a top-k of the busiest
   wikis kept in a small min-heap — all real, all updating live. Offline or
   blocked → falls back to option 2 silently.
   Cost: one external request (the site is otherwise offline-capable — this
   would be the one exception, opt-in by the visitor's connectivity).
2. **Gateway replay, no network.** An in-browser model of the LLM Gateway
   pipeline: synthetic requests → sliding-window rate limiter → LRU response
   cache → budget ledger, rendered as a live console strip with counters.
   Honest (labelled "simulation"), always works, ties to the lead project.

Either way: `src/live.js` (pure model, node-tested) + a renderer in
`render.js`, mounted on How I Build; the void's link traffic is driven from
the same event stream so the network visibly reacts.

## Order

1. A — entrances (half a day, simulator-verified).
2. C + D — chrome (small, one commit each).
3. B — once Yarin picks 1/2/3.
4. E — once Yarin picks 1/2; the largest piece.

Each lands as its own commit, verified in the iOS Simulator and at 1440×900
before pushing.
