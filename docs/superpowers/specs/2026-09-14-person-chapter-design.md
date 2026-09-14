# Person chapter — design (2026-09-14)

Status: approved in conversation, 2026-09-14. First of three sub-projects
(person chapter → in-void contact moment → Higgsfield loader).

## Goal

The visitor meets Yarin before any work: a real photo and a greeting, the
story with public-speaking photos, then the coding timeline. Replaces the
Hero, Intro and CV stops. Everything else in the flight is untouched.

## Decisions (made in the visual companion, 2026-09-14)

- Flight order: person first (option A).
- Hi stop: portrait as a WebGL panel angled into the void, text beside it.
- About stop: three speaking photos as panels at different depths, text opposite.
- Coding experience: a dated timeline on a glowing rail, the two old hero
  screens floating beside it.
- Intro and CV stops go; their facts move into the chapter. The print CV keeps
  the full record.
- Term stays "AI-native developer" (2026-09-14 wording rework); the guard test
  keeps applying.
- IDF unit is **Search and Rescue** (Yarin, 2026-09-14). The bio and canonical
  CV record are aligned to that name in this change.

## The flight (11 stops, save v18)

| # | name | stop | panels | dur |
|---|---|---|---|---|
| 0 | Opening | — | — | 1.4 |
| 1 | Hi | `hi` | portrait, left | 2.1 |
| 2 | About | `about` | 3 photos, right | 2.4 |
| 3 | Timeline | `timeline` | hero screens (`screens: true`) | 1.6 |
| 4 | How I Build | `build` | — | 1.6 |
| 5–9 | LLM Gateway · Focus · Sabai · TEEPO · SHADIEZ | `project` | unchanged | 1.35 |
| 10 | Contact | `contact` | — | 3 |

Cameras: Hi takes the old Hero pose, About the old Intro pose, Timeline the old
CV pose, each re-tuned in Director Mode once the panels exist. Deep links:
`#about` → About, `#cv` → Timeline, `#work` and `#contact` unchanged, `#top`
unchanged. `computeStopIndices()` looks for `about` instead of `intro`.

## Content model (`src/content/profile.js`)

Added:

```js
hi: {
  greeting: 'Hi, I’m Yarin Levin.',
  status: 'AI-native developer · B.A. student at Ben-Gurion · open to work',
  lines: [
    'This is my CV as a landing page. Scroll to fly through it.',
    'Who I am, what I built, and how to reach me.',
  ],
  portrait: '/assets/me/portrait.webp',
},
about: {
  eyebrow: 'About',
  title: 'Command, then a stage, then code.',
  paragraphs: [
    'Four years in the IDF’s Search and Rescue, finishing as deputy company commander. During Guardian of Walls I led the battalion into emergency deployment.',
    'Then a year on stage for FIDF and Faces of October Seventh: 35 lectures across the US and Panama, rooms of 10 to 700.',
    'In April 2026 I started building for the web, self-taught, with AI from day one. Both earlier jobs taught the same thing I build with now: own the outcome and say it clearly.',
  ],
  photos: [
    { src: '/assets/me/speaking-1.webp', caption: 'On stage' },
    { src: '/assets/me/speaking-2.webp', caption: 'The room' },
    { src: '/assets/me/speaking-3.webp', caption: 'After the talk' },
  ],
},
timeline: {
  eyebrow: 'Coding experience',
  title: 'Since April 2026.',
  rows: [
    { when: 'Apr 2026', what: 'First builds', line: 'Self-taught with Claude Code from the first line; the labs start here.' },
    { when: 'May 2026', what: 'SHADIEZ',      line: 'Paid client site, in production.' },
    { when: 'Jun 2026', what: 'AeroCy',       line: 'The company’s live bilingual site, shipped in days.' },
    { when: 'Jul 2026', what: 'TEEPO',        line: 'Hebrew-RTL study platform, live with real auth.' },
    { when: 'Aug 2026', what: 'LLM Gateway',  line: 'The control plane every agent I run goes through.' },
    { when: 'Now',      what: '17 built, 7 live', line: 'One or two client projects a quarter, alongside a part-time position.' },
  ],
},
```

**Open item:** the months in `timeline.rows` are guesses. Yarin supplies the
real ones before launch; the shape does not change.

Removed: `hero`, `intro`, `cvStop`. Kept: `bio.*`, `cv.*` (print CV), `status`,
`method`, `proof`, `buildStop`, `contact`, `links`, `work`.

Bio and CV record: "Rescue & Training Division" → "Search and Rescue" wherever
it appears (`cv.experience`, `bio.full`, the noscript path).

Photo captions are placeholders until Yarin names them. They are never drawn
on the panels (pure image artifacts, per the locked rule); they feed the
noscript path and the `aria-label` of the About section only.

## Photos

`public/assets/me/portrait.webp` (~900×1200, q82) and `speaking-1..3.webp`
(1400 wide, q82). Not on this machine yet. Until they land the repo ships a
dark placeholder WebP at each path (same dimensions, `#0b1a26` with a hairline)
so the layout can be tuned; a profile test asserts each path exists and will
keep passing with the placeholders. Replacing a placeholder needs no code
change.

## Rendering

- `src/render.js`: `renderHi(p)`, `renderAbout(p)`, `renderTimeline(p)`; delete
  `renderHero`, `renderIntro`, `renderCV`. Pure, node-tested.
- `src/panels.js`: map `hi`, `about`, `timeline` to the renderers; Hi and About
  set `dataset.side` (`left` for Hi so the text sits right of the portrait,
  `right` for About). Timeline carries the "Download CV" pill (`data-print-cv`).
- Hi markup: `<article class="hi" data-side="left">` with `.eyebrow` "Hello",
  `.greeting` at the project-title size, `.status` as a Doto label, two
  `.line`s at Intro size.
- About markup: `<article class="about" data-side="right">` with eyebrow,
  title at display size, three `.para`s.
- Timeline markup: eyebrow, title, `<ol class="timeline">` with one
  `.tl-row` per row (`.tl-when` Doto, `.tl-what` bold, `.tl-line`), a
  `.tl-rail` pseudo-element and a `.tl-dot` per row; then the print pill.

## Panels (`src/main.js`)

- A beat may carry `panels: [{ img, pos, size, rot }]` in addition to `panel`.
  `rebuildPanels()` builds one mesh per entry through the existing
  `drawPanelCanvas` path (bloom-safe dimming, hairline frame). `panelMeshes`
  keeps its 1:1 index with beats for the single `panel`; extra meshes go into
  the same `panelGroup` with `userData.type = 'panel'` and `userData.i` set to
  the beat index so hover and Director Mode picking keep working.
- Hi beat: `panel` = portrait via `P(cx, cy, cz, 'left')` with size 20×26.7
  (3:4).
- About beat: `panels` = stage 28×17.6 at the usual `P(...,'right')` spot;
  audience 17×10.6 nearer the camera (`z + 12`) and lower-left of stage;
  close-up 12.6×7.9 nearer still (`z + 20`) and lower-right. Rotations mirror
  the side. Exact numbers are tuned in Director Mode and pasted back into
  `DEFAULT_BEATS`.
- Hero screens: the visibility test `b.stop === 'hero'` becomes
  `!!b.screens`; the CSS3D cards anchor to the Timeline beat's camera. The
  chapter-fallback line (`if (b.stop === 'hero') return null`) becomes
  `if (b.screens) return null`.
- `applyPortraitPoses()` also derives poses for `hi` and `about` (`side` set).

## Reveal recipes (`src/style.css`)

Hi and About: the Intro's line rise (`--i` stagger, 22px, ≤600ms). Timeline:
the CV row stagger plus the rail growing top to bottom (`scaleY` 0→1 over
600ms), dots light as their row reveals. All off under reduced motion. New
text uses only tokens audited on 2026-09-13; no new colors.

## Phones

- `hi` and `about` get portrait poses like projects (photo above text).
- Touch skips About's two smaller panels (stage only).
- Timeline: rows only; hero screens keep today's rules (static SmartCut
  capture on touch, whole CSS3D layer skipped on `LOW_END`).
- Labels keep the 12px floor.

## Migration and tests

- Save version 18: any save `< 18` replaces the beat array with
  `DEFAULT_BEATS`, keeps global FX/speed/ease; the v17 WebP rewrite runs on
  whatever survives. `tests/save.test.js` guard moves to 18.
- `tests/render.test.js`: tests for the three new renderers (greeting, status,
  paragraph count, row count, print pill, escaping); Hero/Intro/CV tests removed.
- `tests/profile.test.js`: `hi.portrait` and every `about.photos[].src` exist
  under `public/`; retired-phrase guard unchanged.
- `tests/hash.test.js`: `#about` → the `about` stop, `#cv` → the `timeline`
  stop (resolver takes the indices; `computeStopIndices()` feeds them).
- `tests/panels.test.js`: Hi and About sections carry `data-side`.

## Noscript path, JSON-LD, docs

- `index.html` noscript regenerated: greeting + status, About paragraphs,
  Timeline rows, then the unchanged How I Build / Work / Contact blocks.
- JSON-LD unchanged except the IDF unit name if present.
- `CLAUDE.md`: flight table → the 11 new stops, save version 18, code map
  lines for the new renderers. `BUILD_PLAN.md`: Phase K.

## Out of scope

The in-void contact moment (next spec), the Higgsfield loader (spec after
that), the X handle, the SmartCut redeploy, timeline months (Yarin's).
