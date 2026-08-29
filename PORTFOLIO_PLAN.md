# PORTFOLIO_PLAN.md — from showreel to professional portfolio

> Plan to turn "The Void" into a portfolio that carries **Yarin, his CV, his full
> body of work, and his ambitions** — without killing the thing that makes it
> work. Companion to `PRD.md` (which this extends) and `BUILD_PLAN.md` (which is
> complete through Phase G except the notes at the bottom).
> Drafted 2026-08-29 · Status: **Phases 2–4, 6, 7 BUILT (2026-08-30). Phase 5 blocked
> on the photo + ambitions text; Phase 8 largely covered by the dossier; Phase 9 next.**

---

## 1. The honest diagnosis

The Void is currently a **showreel, not a portfolio.**

It proves one thing, brilliantly: this person can build a motion-led 3D
interface. That is a genuinely strong opening argument and we should not touch
it. But a hiring team asks five questions, and right now the site answers one:

| What a visitor asks | Can the site answer it today? |
|---|---|
| Can they build? | ✅ **Emphatically.** The site *is* the answer. |
| Who is this person? | ❌ No bio, no face, no location, no availability. |
| What have they done — for whom, when, in what role? | ⚠️ Four previews. No dates, no roles, no context. *Is SHADIEZ client work or a spec piece?* A visitor cannot tell. |
| What do they want next? | ❌ Nothing. |
| Can I skim this in 40 seconds and forward it to my boss? | ❌ You must fly through 7 beats. No text, no PDF, nothing to paste in Slack. |

That last row is the expensive one. `PRD.md` §4 names the primary audience as
"**time-poor and on varied devices → needs a fast, legible path and a skimmable
fallback**". We built the fast legible path. We never built the fallback. A
recruiter with 30 seconds currently gets atmosphere and no facts.

**So the work is four additions — Me, CV, Work (in full), Ambitions — plus the
skim path that makes all four usable by someone in a hurry.**

---

## 2. The architectural call (the one decision that matters)

**Recommendation: two layers, one content source.**

### Layer 1 — The Flight (stays the proof, grows by two beats)

The flight keeps doing what it does. We add the *human* story to it, told in the
void's own vocabulary — not paragraphs pasted onto a camera move:

- **"Who"** beat, after Hero — a portrait that **resolves out of the node field
  itself** (the same 900-point network, briefly arranged into a face, then
  released back to drift). One line of who he is. Reuses `buildNetwork()`'s
  existing per-vertex drift attributes, so it costs almost nothing.
- **"Ambitions"** beat, before Contact — the forward-looking one, placed where
  the path already tilts upward toward the finale. The camera literally rises
  while the copy says where he's going. That rhyme is free and it's the reason
  this beat goes *here* and not anywhere else.
- **My Projects hub** upgraded from a single caption line into a real in-world
  index of the whole body of work.

### Layer 2 — The Dossier (new)

A DOM overlay summoned over the void — a persistent button, the `C` hotkey, and
deep links (`/#about`, `/#cv`, `/#work`, `/#ambitions`). Four tabs:

> **About · CV · Work · Ambitions**

Real HTML text: selectable, Ctrl+F-able, indexable, screen-reader navigable,
identical on a phone, and correct under `prefers-reduced-motion`. It holds the
full CV with dates, a **Download PDF** button, the complete project index, and
the ambitions statement in long form.

### Why a dossier and not more beats

A CV is a **reference document** — people read it non-linearly, jump to a date,
copy an email, hit Ctrl+F for "React". A camera flight is **linear and paced**.
Forcing one into the other ruins both: the flight becomes a slideshow of
paragraphs, and the CV becomes unreadable. Keeping them separate lets each be
excellent.

It also collapses four problems into one solution. The dossier *is* the
skimmable fallback, *is* the reduced-motion content path, *is* the SEO surface,
and *is* the thing you paste into a Slack DM.

**Single source of truth:** one `src/content/profile.js` feeds the dossier, the
in-world beats, the PDF, and the structured data. Nothing can drift out of sync.

**Rejected alternatives** (recorded so we don't relitigate):
- *CV as flight beats* — dense text on camera moves; unskimmable; breaks the
  restraint principle in `BACKGROUND.md`.
- *A separate `/cv` page* — a second design system to maintain, and it throws
  away the visitor you already earned. The dossier keeps them in the world.

---

## 3. Phases

Gated the same way `BUILD_PLAN.md` is: do one, QA, report, advance.

### Phase 1 — The interview  *(no code; blocks Phases 2–6)*
Gather the facts in §4 below. Nothing about a CV can be invented, and a
portfolio with a vague CV is worse than one with none.
**Exit:** §4 fully answered.

### Phase 2 — Content architecture + copy
- [ ] `src/content/profile.js` — the single source:
      `bio` (three lengths: one line / one paragraph / full), `cv{ experience[],
      education[], skills{}, languages[], service }`, `work[]` (every project,
      tiered), `ambitions{}`, `links{}`, `status{}`.
- [ ] Copy pass in the site's voice — plain, specific, no agency filler. Every
      project line answers *what it is · what I built · what it proves*.
- [ ] Curate the 36 folders in `D:\Yarin\Projects` down to a shown set
      (~12) across three tiers: **Featured (4)** · **Shipped** · **Labs & R&D**.
**Exit:** all copy written and approved; no lorem, no TODO.

### Phase 3 — The Dossier shell
- [ ] Overlay + four tabs + hash routing + deep links.
- [ ] Keyboard: `C` to open, `Esc` to close, focus trap, restore focus on close,
      tabs reachable by arrow keys.
- [ ] Mobile: full-height sheet, not a shrunken desktop panel.
- [ ] Motion: curtain easing `cubic-bezier(0.76,0,0.24,1)` on the way in — it's
      a panel sliding over a world, which is exactly what that curve is for.
      Fully static under `prefers-reduced-motion`.
- [ ] Typeset in the one face (Source Code Pro) — hierarchy from weight and
      tracking, per the type system now locked in `style.css`.
**Exit:** opens from any beat, closes cleanly, keyboard-complete, no console errors.

### Phase 4 — CV + PDF
- [ ] CV tab rendered from `profile.js`: experience with dates and roles,
      education, skills grouped (not a 40-item word cloud), languages.
- [ ] **Download PDF** via a real print stylesheet + `window.print()` — no
      server, no PDF library, and structurally impossible to drift from the web
      version. Verify A4 and Letter.
- [ ] Direct link `/#cv` opens the site with the dossier already on that tab.
**Exit:** a clean one-page PDF; `/#cv` deep-links correctly.

### Phase 5 — The two new beats
- [ ] **Who** beat: portrait resolving from the node field; recompose cameras.
- [ ] **Ambitions** beat before Contact.
- [ ] Re-time the flight 7 → 9 beats; update waypoint rail, HUD count, and the
      `voidConfig` save migration (bump the save version — visitors carry an old
      `localStorage` beat array and it must migrate, not break).
**Exit:** the flight still reads as composed, not padded. If a beat feels like
filler, cut it — nine beats is not a target.

### Phase 6 — The work hub
- [ ] In-world index at the My Projects beat (compact, legible at speed).
- [ ] Full tiered index in the dossier's Work tab, each with role, stack, year,
      live link where one exists.
**Exit:** the full body of work is reachable; the featured four still lead.

### Phase 7 — The skim path & findability
- [ ] Server-rendered/static text in `index.html` so crawlers and no-JS visitors
      get the bio, work list and contact — the site currently ships an empty
      shell to Google.
- [ ] JSON-LD: `Person` + `ProfilePage`.
- [ ] Meta/OG rewritten around the person, not the effect.
- [ ] A quiet "**read it instead →**" affordance visible in the first seconds,
      for the visitor who does not want to fly.
**Exit:** a stranger with 30 seconds and no patience still leaves knowing who
you are and how to reach you.

### Phase 8 — Trust signals
- [ ] Availability + location + response time (`status` in `profile.js`).
- [ ] LinkedIn · GitHub · email, everywhere they're expected.
- [ ] Optional: one real line from the SHADIEZ client. One genuine sentence
      beats five invented ones — skip entirely if there isn't one.
**Exit:** contactable without hunting.

### Phase 9 — Ship
- [ ] **Fix the bootstrap deploy** — connect the repo in Vercel Settings → Git
      and drop the custom `build.sh`, so pushing to main deploys. Right now every
      release needs a manual dashboard click, which will cost us a stale site.
- [ ] The 30–60s capture (`BUILD_PLAN` Phase G, still open) — now with the
      dossier in shot, because that's the part a recruiter needs to see exists.
- [ ] Live URL onto the CV PDF, LinkedIn, and GitHub profile.
**Exit:** `PRD.md` §10 met, plus the four new sections.

---

## 4. What I need from you  *(Phase 1 — everything below blocks content)*

I found no CV, résumé, or bio file anywhere in `D:\Yarin\Projects`. All of this
has to come from you:

**The facts**
1. **Education** — institution, degree, years. (TEEPO is `bgu-study-organizer` —
   Ben-Gurion? Currently enrolled, or finished?)
2. **Work history** — every role: company, title, dates, one line on what you
   actually did. Include freelance clients (SHADIEZ — paid client, or spec?).
3. **Current status** — student · freelancing · employed · looking. Available
   from when?
4. **Military service** — years/role, if you want it listed.
5. **Languages** — and level.
6. **Location** — city; open to relocation? remote-only?

**The person**
7. **Photo** — do you want your face on it? (A portrait resolving out of the
   node field is the single strongest "who" beat available to us — but it needs
   a real photo, front-lit, plain background. Saying no is a valid answer; we'd
   use a typographic beat instead.)
8. **Ambitions, in your own words.** Don't polish it — I'll do that. What do you
   want to be building in two years, and who do you want to be building it with?
9. **Job or clients?** The CV framing, the ambitions copy, and the CTA all fork
   here. Both is a valid answer but it costs sharpness.

**The links**
10. LinkedIn URL · GitHub (`yarinlevin18-ai`?) · anything else public.

**The work**
11. Of these 36 folders, which are *yours to show*? Flagging the ones I'd
    default to including in the tiered list — confirm or cut:
    **Shipped:** Worldiez · AeroCy · Mentorship · dira-lease · SecScan ·
    LifeRPG · BodyLoop · llm-gateway (שערAI)
    **Labs:** motion-lab · three-lab · transition-lab · AnimationStudio ·
    design-scraper
    (Excluded by default as client-confidential, personal, or scratch: `thailand
    app` beyond the existing Sabai beat, `KiKi Jewlery`, `Drop Shipping`, `18th`,
    `Brand Project`, `Camera Project`, `Focus`, `Solution House`, `3D Sahar`.)

---

## 4b. Phase 1 answers — LOCKED (interview, 2026-08-29)

Source: Yarin's CV PDF ("Yarin Levin CV 2026.pdf", extracted) + interview.

| # | Question | Answer | Consequence |
|---|---|---|---|
| Audience | Job or clients? | **A job / employment** | CV tab framed as the career; CTA = "let's talk" + download CV |
| Role | What role? | **Frontend developer (generalist)** | Lead with TEEPO / SecScan / llm-gateway; every project gets a GitHub link + a short "how it's built / the hard part" blurb — screenshots alone don't pass a generalist screen |
| Status | Availability | **Student position, part-time, available now** | Kills the "graduates 2028" objection up front |
| Photo | Face on the site? | **Yes — particle portrait beat** | Needs ONE photo: front-lit, plain background, looking at camera |
| Location | Based where? | **Flexible / will relocate** — "Based in Israel, flexible" | No city filter on the site |
| Email | Which one? | **yarinlevin18@gmail.com** (dotless) everywhere | Update the CV PDF copy in Phase 4 |
| Phone | Publish 054-8029820? | **Yes — site + PDF** | Goes in contact + CV tab |
| SHADIEZ | Paid or spec? | **Paid client work** | Label it "Client work" proudly |
| LinkedIn | URL | https://www.linkedin.com/in/yarin-levin-78a783247/ | Wire into contact + JSON-LD |
| Work index | Which of 36 folders? | **Featured 4** (SHADIEZ · TEEPO · Sabai · Kiara's Club) + **Shipped 8** (Worldiez · AeroCy · Mentorship · dira-lease · SecScan · LifeRPG · BodyLoop · llm-gateway/שערAI) + **Labs 5** (motion-lab · three-lab · transition-lab · AnimationStudio · design-scraper) = 17 shown | Everything else stays private |
| Ambitions | In his own words | **⏳ STILL OPEN — the only Phase 1 blocker** | Blocks the Ambitions tab + beat copy |

CV facts now on file (from the PDF — use for the CV tab):
- IDF Rescue & Training Division 2018–2022: Deputy Company Commander, Operational
  Operations Officer (led battalion through Operation Guardian of Walls), Platoon
  Leader, Class Commander; Certificate of Excellence as Platoon Commander.
- FIDF / Faces of October Seventh, Nov 2023–Nov 2024: 35+ lectures across the US
  & Panama, audiences 10–700, gala keynotes.
- Paloma Dead Sea (Warehouse Project Manager, 2023) · Magen (Instructor, 2022) ·
  Maccabiah Operations Officer (2022).
- BGU double B.A. — Politics & Government + Entrepreneurship and Innovation,
  expected 2028. Freelance dev + solo founder since April 2026.
- Languages: Hebrew native, English near-native (lived in US, Spain, Russia).

**The framing (decided):** not "5 months' experience" — *five months produced
SHADIEZ, TEEPO, Sabai, Kiara's Club and eight more shipped products; the output
rate is the argument, and the command/speaking record explains it.*

---

## 5. Risks & watch-items

- **Bloat is the main threat.** Every phase adds DOM to a project whose locked
  design principle is *restraint* ("the network is the one busy layer",
  `BACKGROUND.md`). The dossier must be **summoned, never ambient** — one quiet
  button, and the void stays the void.
- **A thin CV can weaken a strong portfolio.** Right now the site reads as
  "someone who can build anything". If the experience section turns out to be
  short, a prominent CV tab invites a comparison the work currently wins without.
  *Mitigation:* lead with the work, frame the CV tab as "the facts" rather than
  the headline, and let Ambitions carry the weight that years of experience
  can't yet. This is worth deciding consciously — tell me what's actually there
  and I'll frame it honestly. Honest and specific always beats padded.
- **Curation, not accumulation.** 36 folders is not a flex; 12 well-chosen ones
  are. A long list of unfinished experiments reads as unfocused.
- **The flight must not become a lecture.** Two new beats is the ceiling. If
  either one feels like homework at 60fps, cut it and let the dossier carry it.
- **Save migration.** Changing the beat count breaks returning visitors'
  `localStorage` unless the version migration is written. This has bitten us
  before; it's on the Phase 5 checklist for that reason.
- **The bootstrap deploy** (Phase 9) is a standing hazard — the live site has
  already been a commit or two behind more than once.

---

## 6. Run order

`1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9`

Phases 3–4 (dossier + CV) deliver most of the value on their own and are worth
shipping before 5–6 touch the flight. If you want a fast partial: **1 → 2 → 3 →
4 → 9** gets you a portfolio that answers all five visitor questions, with the
flight untouched.
