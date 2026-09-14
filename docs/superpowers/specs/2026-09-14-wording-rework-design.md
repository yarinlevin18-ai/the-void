# Wording rework — design (2026-09-14)

Status: approved in conversation, 2026-09-14. Copy only; no flight, save or
layout change.

## Goal

Every line in the flight is a fact a hiring manager could check. The
positioning term is **AI-native developer** everywhere. Two claims that were
not true are retired: TEEPO "students use it all semester / real users" and
SmartCut "the studio dropped Wix Bookings".

## Facts (confirmed by Yarin, 2026-09-14)

- TEEPO works and is live; nobody but Yarin has used it. Say nothing about users.
- SmartCut is a booking CRM designed for a real grooming studio. Say nothing
  about adoption either way. Deployment is still down (see `offline` flag).
- SHADIEZ: paid, and the client's live production site.
- AeroCy: the company's live web presence.
- Counters 17 products built / 7 live / 1 paid client site are accurate.
- The method stop (`profile.method`) stays exactly as it is.

## Voice rules

1. Every line is checkable.
2. First person, no self-adjectives.
3. No claim about other people's use unless it happened.
4. Term: spelled "AI-native developer" everywhere, titles included. The old
   "AI-Native Builder" title-case form is retired.

## Copy (`src/content/profile.js`)

| Field | New text |
|---|---|
| `hero.line` | AI-native developer. Every build directed end-to-end with Claude Code, from spec to production. |
| `intro.lines[0]` | I write the spec, direct Claude Code through the build, and ship it myself. That is the whole job, and I do it for clients and for my own products. |
| `intro.lines[1]` | Since April 2026: two client sites live, one of them paid, a Hebrew-RTL study platform I run my own semester in, and an LLM gateway every agent I use goes through. |
| `intro.context` | unchanged |
| `status.seeking` | Student position · part-time · AI-native developer |
| `cvStop[0].role` | Freelance AI-native developer |
| `cvStop[0].line` | Client sites and my own products, every build directed end-to-end with Claude Code. |
| `proof[]` | unchanged: 17 products built since April 2026 · 7 live on the web today · 1 paid client site in production |
| `method` | unchanged |
| `contact` | unchanged |

Featured projects — only the listed fields change:

| id | field | New text |
|---|---|---|
| teepo | outcome | Live all semester, with real auth and the real Moodle data. |
| aerocy | outcome | The company's live site, shipped in days. |
| shadiez | outcome | unchanged: Paid client work, in production. |
| smartcut | kind | Booking CRM |
| smartcut | outcome | A booking CRM designed for a grooming studio: slots, approvals and customer self-service. |
| smartcut | tag | unchanged: Client work |
| llm-gateway | — | unchanged |
| focus | — | unchanged |
| sabai | outcome | I used it every day of the trip. |

`problem` and `decision` lines are untouched.

Bio and canonical CV record (the print CV renders `bio.short`; `bio.full`
has no consumer today but is the record):

| Field | New text |
|---|---|
| `title` | AI-native developer |
| `bio.line` | AI-native developer. Student position, part-time — available now. |
| `bio.short` | AI-native developer: I write the spec, direct Claude Code through the build, and ship it myself. Since April 2026: 17 products built, 7 live, one paid client site — client e-commerce, a Hebrew-RTL study platform with real auth and a Chrome-extension scraper, an LLM gateway, this 3D portfolio. Before code: four years of IDF command and a year of public speaking across the US. B.A. student at Ben-Gurion University, looking for a part-time student position. |
| `bio.full` | second paragraph only: "paid client work (SHADIEZ)" stays; "a full product with real users' problems in mind (TEEPO — …)" becomes "a full product (TEEPO — Hebrew-RTL study platform: …)"; "I direct Claude the way I once directed a company" stays. First paragraph unchanged. |
| `cv.experience[0].role` | Freelance AI-native developer |

## Outside `profile.js`

- `index.html`: `<title>`, `og:title`, `twitter:title` → "Yarin Levin —
  AI-native developer". `meta description`, `og:description`,
  `twitter:description` and the JSON-LD `description` → "AI-native developer.
  I direct Claude Code end-to-end and ship: two live client sites, a
  Hebrew-RTL study platform, an LLM gateway. Available now for a part-time
  student position." JSON-LD `jobTitle` → "AI-native developer".
- Noscript skim path in `index.html` regenerated from the new profile lines so
  the no-JS reader sees identical claims (TEEPO and SmartCut lines included).
- `public/og.jpg` re-captured from the opening frame with the subtitle
  "AI-native developer" (same method as 2026-09-13: 1200×630, cursor and dev
  chrome hidden, q82 JPEG).
- Any other "AI-Native Builder" / "web developer" occurrence in `src/`,
  `index.html` or `src/printcv.js` follows the term.

## Guard test

`tests/profile.test.js` gains one test: a list of retired phrases that must
not appear, case-insensitively, in any string of `PROFILE` (deep walk) or in
`index.html`:

`AI-Native Builder`, `real users`, `with users`, `dropped Wix`,
`stopped rescheduling`, `one user`, `not a demo`.

## Docs

- `CLAUDE.md`: the "What this is" line and the open-work list (content hold
  closed, positioning term noted). `BUILD_PLAN.md`: open-work item 2 closed
  with the date; a Phase J line for this rework.
- Memory note `v15-launch-holds` updated: proof numbers confirmed, wording
  rework shipped.

## Out of scope

Flight, cameras, save version, layout, the method stop, the X handle, the
SmartCut redeploy, and the LLM Gateway panel image (its landing-page
screenshot versus control-plane copy is a separate call).

## Verification

`npm test` green including the guard test; dev-server walk-through of Hero,
Intro, CV, How I Build, TEEPO, SHADIEZ (SmartCut also-row) at 1440×900;
`npm run build` clean; live site title and og.jpg checked after deploy.
