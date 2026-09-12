# Flight Restructure (v15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the void's camera flight as 13 stops in the order Hero → Intro → CV → How I Build → 7 project stops (Landing pages, SaaS) → Contact, each stop carrying a real DOM content block rendered from `profile.js`, in a new self-hosted type system, with the dossier, rail, free-roam, hub and caption system removed.

**Architecture:** `src/main.js` keeps the scene, path, snapping, perf tiers and Director Mode untouched. Content moves into two new small modules: `src/render.js` (pure functions: profile data → HTML strings, unit-tested in Node) and `src/panels.js` (DOM: mounts one hidden `<section class="stop">` per beat, `show(i)`/`hide(i)` toggle it with one reveal recipe per stop). `src/bar.js` is the fixed top bar. `src/printcv.js` takes the print-only CV out of the deleted `dossier.js`. `DEFAULT_BEATS` becomes 13 beats, save version 15 replaces old saved paths.

**Tech Stack:** Vanilla JS (ES modules), Three.js 0.169, Vite 8, `node --test` for pure modules, Playwright MCP / Browser pane for visual checks, `pyftsubset` (fonttools) for font subsetting.

**Spec:** `docs/superpowers/specs/2026-09-08-flight-restructure-design.md`

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/content/profile.js` | modify | Add `intro`, `method`, `proof`, `contact`, `links.x`, new projects, `group` / `private` / `problem` / `decision` / `outcome` / `tint` per featured project |
| `src/render.js` | create | Pure renderers: `renderIntro`, `renderCV`, `renderBuild`, `renderProject`, `renderContact`, `esc` |
| `src/panels.js` | create | DOM layer: `initPanels({ beats, profile, root })` → `{ show(i), hide(i), hideAll() }` |
| `src/bar.js` | create | Fixed bar: `initBar({ profile, goTo, workIndex, aboutIndex })` |
| `src/printcv.js` | create | `mountPrintCV(profile)` moved verbatim from `dossier.js` |
| `src/dossier.js` | delete | Dossier overlay + work hub |
| `src/main.js` | modify | New `DEFAULT_BEATS`, v15 migration, wire panels/bar, delete caption/waypoints/freeroam/hotkeys/dossier/visitlive code |
| `index.html` | modify | Remove dossier/waypoints/hotkeys/caption/freeroam/visitlive markup; add `#stops` and `#bar` mounts; new font preloads; refresh noscript + JSON-LD |
| `src/style.css` | modify | New `@font-face` + type tokens; delete caption/waypoint/hotkeys/freeroam/visitlive/dossier/workhub CSS; add bar + stops CSS (mobile-first) |
| `public/fonts/*.woff2` | create | Bricolage Grotesque, Schibsted Grotesk, Doto (Latin subsets) |
| `public/previews/{smartcut,llm-gateway,focus,thailand}.jpg` | create | Screenshots for the four new project stops |
| `tests/*.test.js` | create | Node tests for profile shape, renderers, bar copy label |
| `CLAUDE.md`, `BUILD_PLAN.md`, `PORTFOLIO_PLAN.md` | modify | v15 docs |

Conventions: 2-space indent, single quotes, no semicolonless lines (match `main.js`). All Yarin-specific text lives in `profile.js`. Commit after every task; the branch is `flight-v15`.

---

### Task 0: Branch and baseline

**Files:** none

- [ ] **Step 1: Create the branch and confirm a clean build**

```bash
cd /Users/yarin/Projects/the-void
git checkout -b flight-v15
npm run build 2>&1 | tail -3
```
Expected: last line `✓ built in …`, `dist/` exists.

- [ ] **Step 2: Add the test script to package.json**

Edit `package.json` scripts:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "node --test tests/"
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add node --test script for the v15 restructure"
```

---

### Task 1: Self-hosted type system (Bricolage · Schibsted · Doto)

**Files:**
- Create: `public/fonts/BricolageGrotesque.woff2`, `public/fonts/SchibstedGrotesk.woff2`, `public/fonts/Doto.woff2`
- Modify: `src/style.css:1-20`, `index.html:24`

- [ ] **Step 1: Get the source TTFs (variable, OFL)**

The brainstorm session already downloaded them. Copy, or re-download if missing:
```bash
mkdir -p /tmp/claude/fonts && cd /tmp/claude/fonts
S=/Users/yarin/Projects/the-void/.superpowers/brainstorm/62697-1788852364/content
cp $S/bricolage.ttf $S/schibsted.ttf $S/doto.ttf . 2>/dev/null || {
  curl -L -o bricolage.ttf 'https://github.com/google/fonts/raw/main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz,wdth,wght%5D.ttf'
  curl -L -o schibsted.ttf 'https://github.com/google/fonts/raw/main/ofl/schibstedgrotesk/SchibstedGrotesk%5Bwght%5D.ttf'
  curl -L -o doto.ttf 'https://github.com/google/fonts/raw/main/ofl/doto/Doto%5BROND,wght%5D.ttf'
}
ls -la
```
Expected: three `.ttf` files, 170–460 KB each.

- [ ] **Step 2: Install fonttools and subset to Latin woff2**

```bash
python3 -m pip install --user fonttools brotli 2>&1 | tail -1
cd /tmp/claude/fonts
for f in bricolage:BricolageGrotesque schibsted:SchibstedGrotesk doto:Doto; do
  src=${f%%:*}; out=${f##*:}
  python3 -m fontTools.subset $src.ttf --flavor=woff2 \
    --unicodes='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2197,U+2212,U+2215,U+FEFF,U+FFFD' \
    --layout-features='*' --output-file=/Users/yarin/Projects/the-void/public/fonts/$out.woff2
done
ls -la /Users/yarin/Projects/the-void/public/fonts/*.woff2 | awk '{s+=$5; print $5, $9} END {print "total", s}'
```
Expected: three woff2 files; total under 200 000 bytes. If Doto is over 90 KB, add `--drop-tables+=ROND` is NOT allowed (it is an axis, not a table); instead re-run Doto with `--instancer ROND=60` via `python3 -m fontTools.varLib.instancer doto.ttf ROND=60 -o doto-r60.ttf` first, then subset `doto-r60.ttf`.

- [ ] **Step 3: Replace the font block at the top of `src/style.css`**

Replace lines 4–20 (the Source Code Pro comment, `@font-face`, and `:root { --f … }`) with:
```css
/* Type system (v15) — three self-hosted OFL faces, Latin-subset woff2, no external requests.
   Display: Bricolage Grotesque (condensed-black at display sizes, calm at small).
   Body:    Schibsted Grotesk.
   Labels:  Doto (dot-matrix) for eyebrows, stack lines, counters.
   Source Code Pro remains ONLY for the extruded 3D wordmark (text3d.js). */
@font-face {
  font-family: "Bricolage";
  src: url("/fonts/BricolageGrotesque.woff2") format("woff2");
  font-weight: 200 800; font-stretch: 75% 100%; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "Schibsted";
  src: url("/fonts/SchibstedGrotesk.woff2") format("woff2");
  font-weight: 400 900; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "Doto";
  src: url("/fonts/Doto.woff2") format("woff2");
  font-weight: 100 900; font-style: normal; font-display: swap;
}
:root {
  --f-display: "Bricolage", "Helvetica Neue", Arial, sans-serif;
  --f-body: "Schibsted", "Helvetica Neue", Arial, sans-serif;
  --f-mono: "Doto", ui-monospace, Menlo, monospace;
  --f: var(--f-body);   /* legacy alias: dev panels, HUD, loader, print CV keep working */
}
```

- [ ] **Step 4: Replace the preload in `index.html`**

Replace the line `<link rel="preload" href="/fonts/SourceCodePro-Variable.ttf" as="font" type="font/ttf" crossorigin />` with:
```html
<link rel="preload" href="/fonts/BricolageGrotesque.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/SchibstedGrotesk.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/Doto.woff2" as="font" type="font/woff2" crossorigin />
```

- [ ] **Step 5: Delete the DOM copy of Source Code Pro (the 3D one stays)**

```bash
git rm -q public/fonts/SourceCodePro-Variable.ttf
ls public/fonts
```
Expected: `BricolageGrotesque.woff2 Doto.woff2 SchibstedGrotesk.woff2 SourceCodePro-Medium.ttf`.

- [ ] **Step 6: Verify in the browser**

Start `void-dev` via the Browser pane (`preview_start`, name `void-dev`), then run in the page:
```js
await document.fonts.ready; [...document.fonts].map(f => f.family + ':' + f.status).join(', ')
```
Expected: `Bricolage:loaded, Schibsted:loaded, Doto:loaded` (unused faces may say `unloaded`; none say `error`). Network tab: no request to `SourceCodePro-Variable.ttf`.

- [ ] **Step 7: Commit**

```bash
git add public/fonts src/style.css index.html
git commit -m "feat(type): self-host Bricolage Grotesque, Schibsted Grotesk and Doto; retire Source Code Pro for the DOM"
```

---

### Task 2: Content model in `profile.js`

**Files:**
- Modify: `src/content/profile.js`
- Test: `tests/profile.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/profile.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE } from '../src/content/profile.js';

const featured = PROFILE.work.featured;

test('intro has 2–3 lines and a context line', () => {
  assert.ok(PROFILE.intro.lines.length >= 2 && PROFILE.intro.lines.length <= 3);
  assert.ok(PROFILE.intro.context.length > 0);
});

test('method and proof are present, proof has exactly 3 numbers', () => {
  assert.ok(PROFILE.method.lines.length >= 2);
  assert.equal(PROFILE.proof.length, 3);
  for (const p of PROFILE.proof) { assert.equal(typeof p.n, 'number'); assert.ok(p.label); }
});

test('featured projects: 4 landing then 3 saas, in spec order', () => {
  assert.deepEqual(featured.map((p) => p.id), ['teepo', 'aerocy', 'shadiez', 'smartcut', 'llm-gateway', 'focus', 'thailand']);
  assert.deepEqual(featured.map((p) => p.group), ['landing', 'landing', 'landing', 'landing', 'saas', 'saas', 'saas']);
});

test('every featured project has problem/decision/outcome, image, tint, stack', () => {
  for (const p of featured) {
    for (const k of ['problem', 'decision', 'outcome', 'img', 'tint', 'stack']) assert.ok(p[k], `${p.id} missing ${k}`);
    assert.match(p.tint, /^#[0-9a-f]{6}$/i);
  }
});

test('repo links only on public repos; private builds flagged', () => {
  for (const p of featured) {
    if (p.private) assert.equal(p.repo, undefined, `${p.id} is private but has a repo link`);
  }
  assert.equal(featured.find((p) => p.id === 'focus').url, '');
});

test('contact block', () => {
  assert.ok(PROFILE.contact.line);
  assert.ok(PROFILE.contact.availability);
  assert.match(PROFILE.links.x, /^https:\/\//);
});

test('cv rows for the CV stop: 5 entries', () => {
  assert.equal(PROFILE.cvStop.length, 5);
  for (const r of PROFILE.cvStop) { assert.ok(r.years); assert.ok(r.role); assert.ok(r.line); }
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test
```
Expected: FAIL — `Cannot read properties of undefined (reading 'lines')` and similar.

- [ ] **Step 3: Add the new fields to `src/content/profile.js`**

Inside `PROFILE`, after `status`, add:
```js
  // v15 flight — stop 02 "Intro". First person, facts only, no self-adjectives.
  intro: {
    lines: [
      'I build web products by directing AI end-to-end, from spec to production.',
      'Since April 2026 that has meant paid client landing pages, a Hebrew-RTL study platform with real users, and an LLM gateway I run my own agents through.',
      'I build for clients who need a site that ships, and for teams that want someone who owns the outcome.',
    ],
    context: 'Israel · available now for a part-time student position',
  },

  // stop 04 "How I Build"
  method: {
    lines: [
      'Spec first: every build starts as a written plan with the decisions locked before code.',
      'Then Claude Code does the typing while I direct, review and test, in small chunks that ship in days, not weeks.',
      'Each project leaves behind a lab: the easing curves, transitions and patterns get extracted so the next build starts further ahead.',
    ],
  },
  // ⏳ Yarin confirms these three numbers before launch. Only true numbers ship.
  proof: [
    { n: 17, label: 'products built since April 2026' },
    { n: 7, label: 'live on the web today' },
    { n: 1, label: 'paid client site in production' },
  ],

  // stop 03 "CV" — 5 rows, years left, role + one line right. Fits one screen.
  cvStop: [
    { years: '2026 –', role: 'Freelance web developer & solo founder', line: 'Landing pages and products for clients, every build directed end-to-end with Claude Code.' },
    { years: '2023 – 24', role: 'Public speaker · FIDF / Faces of October Seventh', line: '35+ lectures across the US and Panama, audiences of 10 to 700.' },
    { years: '2023', role: 'Warehouse project manager · Paloma Dead Sea', line: 'Inventory, quality and process control; managed staff and external storage sites.' },
    { years: '2018 – 22', role: 'IDF · Rescue & Training Division', line: 'Deputy company commander; led the battalion into emergency deployment during Guardian of Walls.' },
    { years: '– 2028', role: 'B.A. Politics & Government + Entrepreneurship · BGU', line: 'Ben-Gurion University of the Negev, in progress.' },
  ],

  // stop 12 "Contact"
  contact: {
    line: 'Building something? Write to me.',
    availability: 'Taking on one or two projects this quarter, alongside a part-time student position.',
  },
```

In `links`, add after `github`:
```js
    x: 'https://x.com/yarinlevin18',   // ⏳ confirm handle with Yarin; remove the key to hide the link
```

Replace the whole `work.featured` array with the seven stops (keep `shipped`, `labs`, `labsNote`; move Sabai and Kiara's Club entries into `shipped` with their existing fields, and add Drift Ghost and Atlas to `shipped`):
```js
    featured: [
      {
        id: 'teepo', name: 'TEEPO', group: 'landing', kind: 'Study platform', tag: 'Product · live', year: 2026,
        tint: '#3fc978', img: '/previews/teepo.jpg',
        problem: 'Israeli university students juggle Moodle, grades and deadlines across sites that were never designed to talk to each other.',
        decision: 'One Hebrew-RTL platform with real auth and a Chrome-extension scraper, using Google Drive as the datastore instead of building a backend nobody asked for.',
        outcome: 'A live product students sign into every week, not a demo.',
        stack: 'Next.js · Supabase · Chrome extension · Claude',
        url: 'https://bgu-study-organizer.vercel.app', repo: 'https://github.com/yarinlevin18-ai/TEEPO',
      },
      {
        id: 'aerocy', name: 'AeroCy', group: 'landing', kind: 'Business site', tag: 'Client work', year: 2026,
        tint: '#9fd8ff', img: '/previews/aerocy.jpg',
        problem: 'An aviation-security company needed a credible bilingual presence and had none.',
        decision: 'A single Next.js site with English and Hebrew, motion kept to one idea per section, no CMS.',
        outcome: 'Shipped and live for the brand within days.',
        stack: 'Next.js · i18n · Framer Motion',
        url: 'https://aerocy-landing.vercel.app', repo: 'https://github.com/yarinlevin18-ai/aerocy-landing',
      },
      {
        id: 'shadiez', name: 'SHADIEZ', group: 'landing', kind: 'E-commerce', tag: 'Client work · paid', year: 2026,
        tint: '#9fd8ff', img: '/previews/shadiez.jpg',
        problem: 'A premium beach sun-shade brand needed a landing page that sells the product’s feel, not a spec sheet.',
        decision: 'A storytelling page around one 3D GLB hero with scroll-driven motion and lead capture, and no checkout until the brand needed it.',
        outcome: 'Paid client work, in production.',
        stack: 'Next.js 16 · R3F · Tailwind v4 · Framer Motion · Lenis',
        url: 'https://shadiez.vercel.app', repo: 'https://github.com/yarinlevin18-ai/shadiez',
      },
      {
        id: 'smartcut', name: 'SmartCut', group: 'landing', kind: 'Booking site + admin', tag: 'Client work', year: 2026,
        tint: '#eab04e', img: '/previews/smartcut.jpg',
        problem: 'A grooming studio was paying for Wix Bookings and still handling reschedules by phone.',
        decision: 'A self-hosted slot booking system with approval workflow and customer self-service, on Supabase, instead of another SaaS subscription.',
        outcome: 'Bookings, gallery and admin in one site the owner runs alone.',
        stack: 'Next.js 14 · TypeScript · Supabase · Tailwind',
        url: 'https://smart-cut-gamma.vercel.app', repo: 'https://github.com/yarinlevin18-ai/smartcut',
      },
      {
        id: 'llm-gateway', name: 'LLM Gateway', group: 'saas', kind: 'Control plane', tag: 'SaaS · main focus', year: 2026,
        tint: '#4fd2ff', img: '/previews/llm-gateway.jpg', private: true,
        problem: 'Every app I build calls a model provider, and none of them shared routing, budgets or logs.',
        decision: 'A local control plane: one /v1/route endpoint, provider abstraction, budget check before every call, a log row after it, and an agent platform on top with policies, scrubbing and an approval queue.',
        outcome: 'Every agent I run goes through it; spend and latency are visible per model, per day.',
        stack: 'Node · Fastify · SQLite · Anthropic SDK',
        url: 'https://shaar-ai-landing.vercel.app',
      },
      {
        id: 'focus', name: 'Focus', group: 'saas', kind: 'WIP-capped board', tag: 'SaaS · private build', year: 2026,
        tint: '#4fd2ff', img: '/previews/focus.jpg', private: true,
        problem: 'Starting projects is easy; the cost is the ones already open.',
        decision: 'A board with one capped lane. At most three active projects, enforced in the CLI, the API and the dashboard: to start something you must ship or shelve something.',
        outcome: 'The tool I plan my own work in.',
        stack: 'Node · SQLite · Astro dashboard',
        url: '',
      },
      {
        id: 'thailand', name: 'Sabai', group: 'saas', kind: 'Trip companion', tag: 'Product', year: 2026,
        tint: '#eab04e', img: '/previews/thailand.jpg', private: true,
        problem: 'A real Thailand trip: bookings in five inboxes, no signal in half the places.',
        decision: 'Offline-first: schedule, stays, flights, maps, budget and emergency info in one app, with OCR ingestion of the actual booking PDFs.',
        outcome: 'Used every day of the trip.',
        stack: 'Next.js 16 · React 19 · Tesseract.js',
        url: 'https://thailand-trip-app-phi.vercel.app',
      },
    ],
```

Append to `shipped`:
```js
      { name: 'Kiara’s Club', what: 'Dachshund-first pet storefront — brand, shop and cart.', built: 'Next.js 16, React 19, Tailwind v4, client-side cart.', url: 'https://kiaras-club.vercel.app', year: 2026 },
      { name: 'Drift Ghost', what: 'Unity mobile drifting game, PvP and PvE.', built: 'Meshy-generated assets, Unity, built with Claude Code.', year: 2026 },
      { name: 'Atlas Command Center', what: 'Personal cross-device command center with AI agents — schedule, email, tasks, academics.', built: 'Vite + React, Fastify, Supabase, EN + RTL Hebrew.', year: 2026 },
```
and remove the old `Sabai` featured entry (it is now `thailand`). Delete the `ambitions` object (no stop reads it).

- [ ] **Step 4: Run the tests**

```bash
npm test
```
Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/content/profile.js tests/profile.test.js
git commit -m "feat(content): v15 profile model — intro, method, proof, cv rows, 7 featured stops in two groups"
```

---

### Task 3: Pure renderers (`src/render.js`)

**Files:**
- Create: `src/render.js`
- Test: `tests/render.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/render.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, renderIntro, renderCV, renderBuild, renderProject, renderContact } from '../src/render.js';
import { PROFILE } from '../src/content/profile.js';

test('esc escapes html', () => {
  assert.equal(esc('<a & b>'), '&lt;a &amp; b&gt;');
});

test('intro renders one .line per sentence plus context', () => {
  const h = renderIntro(PROFILE);
  assert.equal((h.match(/class="line"/g) || []).length, PROFILE.intro.lines.length);
  assert.ok(h.includes(PROFILE.intro.context));
});

test('cv renders 5 rows with years and role', () => {
  const h = renderCV(PROFILE);
  assert.equal((h.match(/class="cv-row"/g) || []).length, 5);
  assert.ok(h.includes('Rescue &amp; Training'));
});

test('build renders method, 3 proof numbers with data-n, and the gateway card', () => {
  const h = renderBuild(PROFILE);
  assert.equal((h.match(/data-n="\d+"/g) || []).length, 3);
  assert.ok(h.includes('LLM Gateway'));
  assert.ok(h.includes('shaar-ai-landing.vercel.app'));
  assert.ok(h.includes('github.com/yarinlevin18-ai/TEEPO'));
});

test('project: public repo gets a repo link, private build gets the label and no repo', () => {
  const teepo = PROFILE.work.featured.find((p) => p.id === 'teepo');
  const focus = PROFILE.work.featured.find((p) => p.id === 'focus');
  const ht = renderProject(teepo, 'left');
  assert.ok(ht.includes('href="https://github.com/yarinlevin18-ai/TEEPO"'));
  assert.ok(ht.includes('data-side="left"'));
  const hf = renderProject(focus, 'right');
  assert.ok(hf.includes('Private build'));
  assert.ok(!hf.includes('github.com'));
  assert.ok(!hf.includes('Visit live'));
});

test('contact renders mailto, availability and text links', () => {
  const h = renderContact(PROFILE);
  assert.ok(h.includes('href="mailto:' + PROFILE.links.email + '"'));
  assert.ok(h.includes(PROFILE.contact.availability));
  assert.ok(h.includes('>GitHub<') && h.includes('>LinkedIn<') && h.includes('>X<'));
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test
```
Expected: FAIL — `Cannot find module '../src/render.js'`.

- [ ] **Step 3: Write `src/render.js`**

```js
// render.js — pure functions: PROFILE data → HTML strings for each flight stop.
// No DOM, no Three.js, no side effects: runs in node --test as well as the browser.

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const eyebrow = (t) => `<div class="eyebrow">${esc(t)}</div>`;

export function renderIntro(p) {
  const lines = p.intro.lines.map((l, i) => `<p class="line" style="--i:${i}">${esc(l)}</p>`).join('');
  return `<div class="intro">${lines}<div class="context">${esc(p.intro.context)}</div></div>`;
}

export function renderCV(p) {
  const rows = p.cvStop.map((r, i) => `
    <div class="cv-row" style="--i:${i}">
      <span class="cv-years">${esc(r.years)}</span>
      <span class="cv-body"><b>${esc(r.role)}</b><span>${esc(r.line)}</span></span>
    </div>`).join('');
  return `${eyebrow('CV')}<div class="cv">${rows}</div>
    <button type="button" class="pill" data-print-cv>Download CV ↓</button>`;
}

export function renderBuild(p) {
  const method = p.method.lines.map((l, i) => `<p class="line" style="--i:${i}">${esc(l)}</p>`).join('');
  const proof = p.proof.map((x) => `<div class="proof-item"><b class="num" data-n="${x.n}">0</b><span>${esc(x.label)}</span></div>`).join('');
  const lead = p.work.featured.find((x) => x.id === 'llm-gateway');
  const rows = p.work.featured.filter((x) => x.id === 'teepo' || x.id === 'shadiez');
  const link = (href, label) => href ? `<a href="${href}" target="_blank" rel="noopener">${label} ↗</a>` : '';
  return `${eyebrow('How I build')}
    <div class="method">${method}</div>
    <div class="proof">${proof}</div>
    <div class="repos">
      <div class="repo lead">
        <b>${esc(lead.name)}</b>
        <p>${esc(lead.problem)}</p>
        <div class="stack">${esc(lead.stack)}</div>
        <div class="links">${link(lead.url, 'Live')}${lead.repo ? link(lead.repo, 'GitHub') : '<span class="muted">private repo</span>'}</div>
      </div>
      ${rows.map((r) => `<div class="repo"><b>${esc(r.name)}</b><span class="stack">${esc(r.stack)}</span><div class="links">${link(r.url, 'Live')}${link(r.repo, 'GitHub')}</div></div>`).join('')}
    </div>`;
}

export function renderProject(x, side) {
  const live = x.url ? `<a class="pill" href="${x.url}" target="_blank" rel="noopener">Visit live ↗</a>` : '<span class="pill ghost">Private build</span>';
  const repo = x.repo ? `<a class="pill ghost" href="${x.repo}" target="_blank" rel="noopener">GitHub ↗</a>` : '';
  return `<article class="project" data-side="${side}" data-tint="${x.tint}">
    ${eyebrow(`${x.group === 'saas' ? 'SaaS' : 'Landing page'} · ${x.tag}`)}
    <h2 class="title">${esc(x.name)}</h2>
    <dl>
      <dt>Problem</dt><dd>${esc(x.problem)}</dd>
      <dt>Decision</dt><dd>${esc(x.decision)}</dd>
      <dt>Outcome</dt><dd>${esc(x.outcome)}</dd>
    </dl>
    <div class="stack">${esc(x.stack)}</div>
    <div class="links">${live}${repo}</div>
  </article>`;
}

export function renderContact(p) {
  const l = p.links;
  const social = [['GitHub', l.github], ['LinkedIn', l.linkedin], ['X', l.x]].filter(([, h]) => h)
    .map(([n, h]) => `<a href="${h}" target="_blank" rel="noopener">${n}</a>`).join('');
  return `${eyebrow('Let’s build something')}
    <p class="contact-line">${esc(p.contact.line)}</p>
    <a class="mail" href="mailto:${l.email}" data-copy-email>${esc(l.email)}<small>click to copy</small></a>
    <div class="social">${social}</div>
    <div class="availability">${esc(p.contact.availability)}</div>
    <footer class="foot">${esc(p.name)} · ${new Date().getFullYear()}</footer>`;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: 13 passing.

- [ ] **Step 5: Commit**

```bash
git add src/render.js tests/render.test.js
git commit -m "feat(render): pure HTML renderers for the five stop types"
```

---

### Task 4: Print CV module (out of dossier.js)

**Files:**
- Create: `src/printcv.js`
- Modify: `src/main.js:3110-3111` (later, Task 8 wires it)

- [ ] **Step 1: Create `src/printcv.js`**

Move `buildPrintCV` from `src/dossier.js:286-333` verbatim, renamed and exported, with its own `esc`:
```js
// printcv.js — hidden, print-only CV rendered from PROFILE. The "Download CV"
// button calls window.print(); @media print (style.css) hides the site and
// shows #print-cv, so the PDF can never drift from the web version.
import { esc } from './render.js';

export function mountPrintCV(p) {
  if (document.getElementById('print-cv')) return;
  const el = document.createElement('div');
  el.id = 'print-cv';
  el.setAttribute('aria-hidden', 'true');
  const exp = p.cv.experience.map((e) => `
      <div class="pcv-item">
        <div class="pcv-row"><b>${esc(e.role)}</b><span>${esc(e.period)}</span></div>
        <div class="pcv-org">${esc(e.org)}</div>
        <ul>${e.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      </div>`).join('');
  const s = p.cv.service;
  const edu = p.cv.education.map((e) => `
      <div class="pcv-item">
        <div class="pcv-row"><b>${esc(e.degree)}</b><span>${esc(e.period)}</span></div>
        <div class="pcv-org">${esc(e.org)}</div>
      </div>`).join('');
  const skills = Object.entries(p.cv.skills)
    .map(([g, items]) => `<div class="pcv-skill"><b>${esc(g)}:</b> ${items.map(esc).join(' · ')}</div>`).join('');
  el.innerHTML = `
    <header>
      <h1>${esc(p.name)}</h1>
      <div class="pcv-sub">${esc(p.title)} · ${esc(p.status.seeking)} · ${esc(p.status.availability)}</div>
      <div class="pcv-contact">
        ${p.links.email} · ${esc(p.links.phone)} · ${p.links.linkedin.replace('https://www.', '')} · ${p.links.github.replace('https://', '')} · ${p.links.site.replace('https://', '')}
      </div>
    </header>
    <p class="pcv-profile">${esc(p.bio.short)}</p>
    <h2>Experience</h2>${exp}
    <h2>Military service</h2>
    <div class="pcv-item">
      <div class="pcv-row"><b>${esc(s.org)}</b><span>${esc(s.period)}</span></div>
      <ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    </div>
    <h2>Education</h2>${edu}
    <h2>Skills</h2>${skills}
    <h2>Languages</h2>
    <div class="pcv-skill">${p.cv.languages.map((l) => `<b>${esc(l.lang)}:</b> ${esc(l.level)}`).join(' · ')}</div>`;
  document.body.appendChild(el);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/printcv.js
git commit -m "refactor: move the print-only CV out of dossier.js into printcv.js"
```

---

### Task 5: Panels DOM layer (`src/panels.js`) + stop CSS

**Files:**
- Create: `src/panels.js`
- Modify: `src/style.css` (append), `index.html` (add mount)

- [ ] **Step 1: Write `src/panels.js`**

```js
// panels.js — the DOM content block of every flight stop.
// initPanels mounts one hidden <section class="stop"> per beat (beat.stop names
// the renderer). show(i)/hide(i) toggle .in; CSS owns the reveal recipe, JS only
// owns the two things CSS can't: the proof count-up and the print/copy buttons.
import { renderIntro, renderCV, renderBuild, renderProject, renderContact } from './render.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initPanels({ beats, profile, root, onTint }) {
  root.innerHTML = '';
  const els = beats.map((b, i) => {
    if (!b.stop) return null;
    const sec = document.createElement('section');
    sec.className = `stop stop-${b.stop}`;
    sec.id = `stop-${b.id || i}`;
    sec.setAttribute('aria-hidden', 'true');
    if (b.stop === 'intro') sec.innerHTML = renderIntro(profile);
    else if (b.stop === 'cv') sec.innerHTML = renderCV(profile);
    else if (b.stop === 'build') sec.innerHTML = renderBuild(profile);
    else if (b.stop === 'project') {
      const x = profile.work.featured.find((p) => p.id === b.id);
      if (!x) throw new Error(`panels: no featured project with id "${b.id}"`);
      sec.innerHTML = renderProject(x, b.side || 'left');
      sec.dataset.side = b.side || 'left';
      if (b.groupLabel) sec.insertAdjacentHTML('afterbegin', `<div class="group-label">${b.groupLabel}</div>`);
    } else if (b.stop === 'contact') sec.innerHTML = renderContact(profile);
    else throw new Error(`panels: unknown stop type "${b.stop}"`);
    root.appendChild(sec);
    return sec;
  });

  // buttons that need JS
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-print-cv], [data-copy-email]');
    if (!t) return;
    if (t.hasAttribute('data-print-cv')) window.print();
    else {
      e.preventDefault();
      navigator.clipboard?.writeText(profile.links.email);
      const s = t.querySelector('small'); if (s) { s.textContent = 'copied'; setTimeout(() => { s.textContent = 'click to copy'; }, 1800); }
    }
  });

  const counted = new Set();
  function countUp(sec) {
    if (counted.has(sec)) return; counted.add(sec);
    for (const el of sec.querySelectorAll('.num[data-n]')) {
      const n = +el.dataset.n; if (REDUCED) { el.textContent = n; continue; }
      const t0 = performance.now(), dur = 500;
      (function tick(now) { const k = Math.min(1, (now - t0) / dur); el.textContent = Math.round(n * k); if (k < 1) requestAnimationFrame(tick); })(t0);
    }
  }

  let shown = -1;
  return {
    show(i) {
      if (i === shown) return;
      if (shown >= 0 && els[shown]) { els[shown].classList.remove('in'); els[shown].setAttribute('aria-hidden', 'true'); }
      shown = i;
      const sec = els[i]; if (!sec) return;
      sec.classList.add('in'); sec.setAttribute('aria-hidden', 'false');
      if (sec.classList.contains('stop-build')) countUp(sec);
      if (onTint && sec.dataset.side) onTint(sec.querySelector('.project')?.dataset.tint || null);
    },
    hide() {
      if (shown < 0) return;
      const sec = els[shown]; if (sec) { sec.classList.remove('in'); sec.setAttribute('aria-hidden', 'true'); }
      shown = -1;
      if (onTint) onTint(null);
    },
    el: (i) => els[i],
  };
}
```

- [ ] **Step 2: Add the mount in `index.html`**

After `<div id="whisper"></div>` add:
```html
    <div id="stops" aria-live="polite"></div>
```

- [ ] **Step 3: Append the stops CSS to `src/style.css`** (mobile-first, one motion idea per stop, ≤ 600 ms)

```css
/* ---- v15 flight stops: one DOM block per beat, revealed on arrival ---- */
#stops { position: fixed; inset: 0; z-index: 3; pointer-events: none; }
.stop {
  position: absolute; left: 0; right: 0; top: 0; bottom: 0;
  display: flex; flex-direction: column; justify-content: center;
  padding: 18vh 6vw 12vh; pointer-events: none; opacity: 0; visibility: hidden;
  font-family: var(--f-body); color: #cfe8ff;
  transition: opacity .4s ease, visibility 0s linear .4s;
}
.stop.in { opacity: 1; visibility: visible; pointer-events: auto; transition: opacity .4s ease; }
.stop a { color: #7fe0ff; text-decoration: none; }
.eyebrow, .stack, .context, .cv-years, .group-label, .availability, .foot, .proof-item span, .repo .links, .mail small {
  font-family: var(--f-mono); font-weight: 700; font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; color: #4fd2ff;
}
.eyebrow { margin-bottom: 1rem; }
.stack, .context, .availability, .foot { color: #7fa8c8; }
.pill { display: inline-flex; align-items: center; gap: .5rem; padding: .55rem 1rem; border-radius: 999px; border: 1px solid rgba(79,210,255,.55); background: rgba(79,210,255,.08); color: #eaf4ff; font: inherit; font-size: .8rem; cursor: pointer; }
.pill:hover { background: rgba(79,210,255,.18); border-color: #4fd2ff; }
.pill.ghost { background: transparent; border-color: rgba(159,216,255,.25); color: #9fc2e0; }
.links { display: flex; gap: .6rem; flex-wrap: wrap; margin-top: 1.1rem; }

/* 02 Intro — lines fade + rise, stagger 60ms. The whole effect is restraint. */
.intro .line { font-family: var(--f-display); font-weight: 500; font-stretch: 90%; font-size: clamp(1.5rem, 4.2vw, 3.2rem); line-height: 1.15; letter-spacing: -0.01em; color: #eaf4ff; max-width: 26ch; margin: 0 0 .7em;
  opacity: 0; transform: translateY(12px); transition: opacity .5s ease, transform .5s cubic-bezier(.22,1,.36,1); transition-delay: calc(var(--i) * 60ms); }
.stop.in .intro .line { opacity: 1; transform: none; }
.intro .context { margin-top: 1.6rem; }

/* 03 CV — rows slide from their divider, stagger 40ms. Quiet, small. */
.cv { border-top: 1px solid rgba(159,216,255,.18); max-width: 60rem; }
.cv-row { display: grid; grid-template-columns: 1fr; gap: .2rem .6rem; padding: .8rem 0; border-bottom: 1px solid rgba(159,216,255,.14);
  opacity: 0; transform: translateX(-10px); transition: opacity .35s ease, transform .35s ease; transition-delay: calc(var(--i) * 40ms); }
.stop.in .cv-row { opacity: 1; transform: none; }
.cv-body b { display: block; font-weight: 600; color: #eaf4ff; font-size: .95rem; }
.cv-body span { display: block; font-size: .82rem; color: #9fc2e0; line-height: 1.45; }
@media (min-width: 720px) { .cv-row { grid-template-columns: 7rem 1fr; } }

/* 04 How I Build — method as Intro; proof counts up (JS); repo cards lift on hover */
.method .line { font-family: var(--f-display); font-weight: 500; font-stretch: 90%; font-size: clamp(1.1rem, 2.4vw, 1.8rem); line-height: 1.25; color: #eaf4ff; max-width: 30ch; margin: 0 0 .5em;
  opacity: 0; transform: translateY(12px); transition: opacity .5s ease, transform .5s ease; transition-delay: calc(var(--i) * 60ms); }
.stop.in .method .line { opacity: 1; transform: none; }
.proof { display: grid; grid-template-columns: 1fr; gap: .8rem; margin: 1.6rem 0; }
.proof-item .num { display: block; font-family: var(--f-mono); font-weight: 800; font-size: clamp(2.2rem, 6vw, 4rem); color: #eaf4ff; font-variant-numeric: tabular-nums; }
.repos { display: grid; grid-template-columns: 1fr; gap: .6rem; max-width: 60rem; }
.repo { border: 1px solid rgba(159,216,255,.16); border-radius: 8px; padding: .8rem 1rem; background: rgba(8,16,26,.55); transition: transform .3s ease, border-color .3s ease; }
.repo:hover { transform: translateY(-4px); border-color: rgba(79,210,255,.6); }
.repo b { font-family: var(--f-mono); font-size: .85rem; letter-spacing: .06em; color: #eaf4ff; }
.repo p { font-size: .82rem; color: #9fc2e0; margin: .4rem 0; line-height: 1.45; }
.repo .stack { display: block; margin-top: .3rem; }
.repo .links { margin-top: .5rem; }
.muted { color: #5b768f; }
@media (min-width: 720px) { .proof { grid-template-columns: repeat(3, 1fr); } .repos { grid-template-columns: 1.4fr 1fr 1fr; } }

/* 05 Projects — text block on the side opposite the WebGL image panel; image first, text 150ms later */
.stop-project { justify-content: flex-end; }
.project { max-width: 34rem; opacity: 0; transform: translateY(14px); transition: opacity .45s ease .15s, transform .45s ease .15s; }
.stop.in .project { opacity: 1; transform: none; }
.project .title { font-family: var(--f-display); font-weight: 800; font-stretch: 78%; font-size: clamp(2.4rem, 8vw, 5.5rem); line-height: .9; letter-spacing: -0.02em; text-transform: uppercase; color: #eaf4ff; margin: 0 0 1rem; }
.project dl { margin: 0; display: grid; gap: .55rem; }
.project dt { font-family: var(--f-mono); font-weight: 700; font-size: .66rem; letter-spacing: .14em; text-transform: uppercase; color: #4fd2ff; }
.project dd { margin: 0 0 .2rem; font-size: .9rem; line-height: 1.5; color: #b8d4ea; max-width: 52ch; }
.project .stack { margin-top: .8rem; }
.group-label { position: absolute; top: 12vh; left: 6vw; }
@media (min-width: 900px) {
  .stop-project { justify-content: center; }
  .stop-project[data-side="left"]  .project { margin-left: auto; margin-right: 0; }   /* image panel sits left → text right */
  .stop-project[data-side="right"] .project { margin-right: auto; margin-left: 0; }
}

/* 12 Contact — email scales in, hero scale */
.contact-line { font-family: var(--f-display); font-weight: 500; font-stretch: 90%; font-size: clamp(1.4rem, 3.6vw, 2.6rem); color: #eaf4ff; margin: 0 0 .6rem; }
.mail { display: block; font-family: var(--f-display); font-weight: 800; font-stretch: 78%; font-size: clamp(1.6rem, 6.4vw, 5.2rem); line-height: 1; color: #eaf4ff; overflow-wrap: anywhere; margin: .4rem 0 1.4rem;
  opacity: 0; transform: scale(.96); transition: opacity .5s ease, transform .5s cubic-bezier(.22,1,.36,1); }
.stop.in .mail { opacity: 1; transform: none; }
.mail:hover { color: #4fd2ff; }
.mail small { display: block; margin-top: .6rem; }
.social { display: flex; gap: 1.4rem; font-size: .9rem; }
.availability { margin-top: 1rem; }
.foot { margin-top: 3rem; }

@media (prefers-reduced-motion: reduce) {
  .stop, .stop *, .stop.in * { transition: none !important; transform: none !important; }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/panels.js src/style.css index.html
git commit -m "feat(panels): DOM stop layer with per-stop reveal recipes"
```

---

### Task 6: Fixed bar (`src/bar.js`)

**Files:**
- Create: `src/bar.js`
- Test: `tests/bar.test.js`
- Modify: `index.html`, `src/style.css`

- [ ] **Step 1: Write the failing test** (the pure part: label flip timing helper)

Create `tests/bar.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyLabel } from '../src/bar.js';

test('copyLabel returns Copied then reverts', async () => {
  let label = 'Copy email';
  const set = (v) => { label = v; };
  copyLabel(set, 'Copy email', 10);
  assert.equal(label, 'Copied');
  await new Promise((r) => setTimeout(r, 25));
  assert.equal(label, 'Copy email');
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test
```
Expected: FAIL — `Cannot find module '../src/bar.js'`.

- [ ] **Step 3: Write `src/bar.js`**

```js
// bar.js — the fixed top bar: name · availability · Work · About · Copy email.
// The only navigation chrome on the site (replaces the waypoint rail).
export function copyLabel(set, original, ms = 1800) {
  set('Copied');
  setTimeout(() => set(original), ms);
}

export function initBar({ profile, goTo, workIndex, aboutIndex, root }) {
  root.innerHTML = `
    <span class="bar-name">${profile.name}</span>
    <span class="bar-avail"><i></i>${profile.status.availability}</span>
    <button type="button" class="bar-link" data-go="${workIndex}">Work</button>
    <button type="button" class="bar-link" data-go="${aboutIndex}">About</button>
    <button type="button" class="bar-copy">Copy email</button>`;
  root.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { goTo(+go.dataset.go); return; }
    const cp = e.target.closest('.bar-copy');
    if (cp) { navigator.clipboard?.writeText(profile.links.email); copyLabel((v) => { cp.textContent = v; }, 'Copy email'); }
  });
  return { show() { root.classList.add('show'); }, hide() { root.classList.remove('show'); } };
}
```

- [ ] **Step 4: Add the mount and CSS**

`index.html`, right after `<div id="whisper"></div>`:
```html
    <nav id="bar" aria-label="Primary"></nav>
```

Append to `src/style.css`:
```css
/* ---- v15 fixed bar ---- */
#bar { position: fixed; top: 14px; left: 14px; right: 14px; z-index: 6; display: flex; align-items: center; gap: .2rem;
  padding: .35rem .4rem .35rem .9rem; border-radius: 999px; background: rgba(10,18,29,.55); border: 1px solid rgba(159,216,255,.16);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  font-family: var(--f-mono); font-weight: 700; font-size: .66rem; letter-spacing: .12em; text-transform: uppercase; color: #9fc2e0;
  opacity: 0; transform: translateY(-10px); transition: opacity .5s ease, transform .5s ease; pointer-events: none; }
#bar.show { opacity: 1; transform: none; pointer-events: auto; }
#bar .bar-name { font-family: var(--f-display); font-weight: 700; font-stretch: 85%; font-size: .9rem; letter-spacing: 0; text-transform: none; color: #eaf4ff; margin-right: auto; }
#bar .bar-avail { display: none; align-items: center; gap: .45rem; margin-right: .6rem; }
#bar .bar-avail i { width: 6px; height: 6px; border-radius: 50%; background: #3fc978; box-shadow: 0 0 8px #3fc978; }
#bar .bar-link { display: none; font: inherit; color: inherit; background: none; border: 0; padding: .5rem .6rem; border-radius: 999px; cursor: pointer; }
#bar .bar-link:hover { color: #eaf4ff; background: rgba(159,216,255,.08); }
#bar .bar-copy { font: inherit; color: #eaf4ff; background: rgba(79,210,255,.1); border: 1px solid rgba(79,210,255,.45); padding: .5rem .8rem; border-radius: 999px; cursor: pointer; }
#bar .bar-copy:hover { background: rgba(79,210,255,.2); }
@media (min-width: 720px) {
  #bar { left: 50%; right: auto; transform: translate(-50%, -10px); }
  #bar.show { transform: translate(-50%, 0); }
  #bar .bar-avail, #bar .bar-link { display: inline-flex; }
  #bar .bar-name { margin-right: .9rem; }
}
```

- [ ] **Step 5: Run tests and commit**

```bash
npm test
git add src/bar.js tests/bar.test.js index.html src/style.css
git commit -m "feat(bar): fixed top bar with Work / About / Copy email"
```
Expected: 14 passing.

---

### Task 7: Screenshots for the four new project stops

**Files:**
- Create: `public/previews/aerocy.jpg`, `public/previews/smartcut.jpg`, `public/previews/llm-gateway.jpg`, `public/previews/thailand.jpg`, `public/previews/focus.jpg`

- [ ] **Step 1: Capture the three live sites and the gateway landing with Playwright**

Use the Playwright MCP (`browser_resize` 1440×900, `browser_navigate`, `browser_take_screenshot` with `type: "jpeg"`, `filename`), one per URL:

| id | URL | file |
|---|---|---|
| aerocy | https://aerocy-landing.vercel.app | aerocy.jpg |
| smartcut | https://smart-cut-gamma.vercel.app | smartcut.jpg |
| llm-gateway | https://shaar-ai-landing.vercel.app | llm-gateway.jpg |
| thailand | https://thailand-trip-app-phi.vercel.app | thailand.jpg |

Then move and compress:
```bash
cd /Users/yarin/Projects/the-void
for f in aerocy smartcut llm-gateway thailand; do sips -Z 1400 -s formatOptions 72 $f.jpg --out public/previews/$f.jpg >/dev/null && rm $f.jpg; done
ls -la public/previews
```
Expected: each new jpg 40–130 KB.

- [ ] **Step 2: Focus has no deployment: run it locally and capture**

```bash
cd /Users/yarin/Projects/focus && npm install >/dev/null 2>&1 && (npm run dev > /tmp/claude/focus.log 2>&1 &) && sleep 4 && tail -2 /tmp/claude/focus.log
```
Expected: a `http://localhost:4321` line. Screenshot it with Playwright as `focus.jpg`, then compress as in step 1 and stop the server:
```bash
pkill -f "focus.*astro|astro dev" || true
```
If Focus fails to run, use a 1400×900 dark placeholder and add `⏳ focus.jpg is a placeholder` to the PR notes:
```bash
python3 -c "
from PIL import Image, ImageDraw; im=Image.new('RGB',(1400,900),(8,16,26)); d=ImageDraw.Draw(im); d.text((60,60),'FOCUS — WIP-capped board',fill=(159,216,255)); im.save('public/previews/focus.jpg',quality=72)" 2>/dev/null || sips -s format jpeg public/og.jpg --out public/previews/focus.jpg
```

- [ ] **Step 3: Commit**

```bash
git add public/previews
git commit -m "assets: previews for AeroCy, SmartCut, LLM Gateway, Thailand, Focus"
```

---

### Task 8: `main.js` — new beats, v15 migration, wiring, deletions

**Files:**
- Modify: `src/main.js` (lines cited from the v14 file; re-grep after each edit, numbers shift)
- Delete: `src/dossier.js`
- Modify: `index.html`, `src/style.css`

- [ ] **Step 1: Replace imports (`main.js:15-17`)**

Replace:
```js
import { initDossier, initWorkHub } from './dossier.js';
let workHub = null; // assigned at bootstrap; setCaption may run first
```
with:
```js
import { PROFILE } from './content/profile.js';
import { initPanels } from './panels.js';
import { initBar } from './bar.js';
import { mountPrintCV } from './printcv.js';
let panels = null, bar = null;   // assigned at bootstrap, after the scene exists
```

- [ ] **Step 2: Replace `DEFAULT_BEATS` (`main.js:905-919`)**

Keep `mkPanel` and `makeHeroBeat`. Replace the array with (cameras for stops 2–11 are provisional and get re-authored in Task 10; Opening, Hero and Contact are the v14 values verbatim, copy them from the current file, including their `fx` objects):
```js
// v15 (2026-09-08): 13 stops — Hero as built → Intro → CV → How I Build →
// Landing pages ×4 → SaaS ×3 → Contact. Each beat's `stop` names its DOM block
// (panels.js); `id` picks the featured project; `side` is where the WebGL image
// panel sits, the text block takes the other side. Cameras 2–11 authored in
// Director Mode (E → Copy config) and baked here.
const P = (z, side) => mkPanel(side === 'left' ? -34 : 34, 4, z - 48, 70, 44);
const DEFAULT_BEATS = [
  /* 0 */ { ...<v14 Opening beat, verbatim> },
  /* 1 */ { ...<v14 Hero beat, verbatim> },
  /* 2 */ { name: 'Intro', stop: 'intro', cam: [3, 8, -8], look: [-30, 20, -70], up: [0, 1, 0], fov: 55, dur: 2.4, desc: '', img: '', link: '', panel: null },
  /* 3 */ { name: 'CV', stop: 'cv', cam: [-10, 14, -60], look: [35, -10, -130], up: [0, 1, 0], fov: 62, dur: 1.6, desc: '', img: '', link: '', panel: null },
  /* 4 */ { name: 'How I Build', stop: 'build', cam: [9, 10, -69], look: [15, 4, -119], up: [0, 1, 0], fov: 70, dur: 1.6, desc: '', img: '', link: '', panel: null },
  /* 5 */ { name: 'TEEPO', stop: 'project', id: 'teepo', side: 'left', groupLabel: 'Landing pages', cam: [0, 2, -130], look: [0, 2, -178], up: [0, 1, 0], fov: 70, dur: 1.35, desc: '', img: '/previews/teepo.jpg', link: '', panel: P(-130, 'left') },
  /* 6 */ { name: 'AeroCy', stop: 'project', id: 'aerocy', side: 'right', cam: [0, 2, -180], look: [0, 2, -228], up: [0, 1, 0], fov: 70, dur: 1.35, desc: '', img: '/previews/aerocy.jpg', link: '', panel: P(-180, 'right') },
  /* 7 */ { name: 'SHADIEZ', stop: 'project', id: 'shadiez', side: 'left', cam: [0, 2, -230], look: [0, 2, -278], up: [0, 1, 0], fov: 70, dur: 1.35, desc: '', img: '/previews/shadiez.jpg', link: '', panel: P(-230, 'left') },
  /* 8 */ { name: 'SmartCut', stop: 'project', id: 'smartcut', side: 'right', cam: [0, 2, -280], look: [0, 2, -328], up: [0, 1, 0], fov: 70, dur: 1.35, desc: '', img: '/previews/smartcut.jpg', link: '', panel: P(-280, 'right') },
  /* 9 */ { name: 'LLM Gateway', stop: 'project', id: 'llm-gateway', side: 'left', groupLabel: 'SaaS', cam: [0, 2, -330], look: [0, 2, -378], up: [0, 1, 0], fov: 70, dur: 1.35, desc: '', img: '/previews/llm-gateway.jpg', link: '', panel: P(-330, 'left') },
  /* 10 */ { name: 'Focus', stop: 'project', id: 'focus', side: 'right', cam: [0, 2, -380], look: [0, 2, -428], up: [0, 1, 0], fov: 70, dur: 1.35, desc: '', img: '/previews/focus.jpg', link: '', panel: P(-380, 'right') },
  /* 11 */ { name: 'Sabai', stop: 'project', id: 'thailand', side: 'left', cam: [0, 2, -430], look: [0, 2, -478], up: [0, 1, 0], fov: 70, dur: 1.35, desc: '', img: '/previews/thailand.jpg', link: '', panel: P(-430, 'left') },
  /* 12 */ { ...<v14 "Let’s build something" beat, verbatim>, name: 'Contact', stop: 'contact', link: '', cap: undefined },
];
const WORK_INDEX = 5, ABOUT_INDEX = 2;
```
`<v14 … verbatim>` means paste the existing object literal for that beat from the current file; do not retype camera numbers by hand.

- [ ] **Step 3: Carry `stop`/`id`/`side`/`groupLabel` through `backfillBeat` (`main.js:961`)**

These are plain fields on the beat and survive `structuredClone`; nothing to add. Confirm `backfillBeat` does not strip unknown keys:
```bash
sed -n 961,972p src/main.js
```
Expected: it only fills `panel`, `fx`, `up` and similar defaults.

- [ ] **Step 4: Add the v15 migration and bump `save()` (`main.js:1067-1083`)**

After the `if (!(d.version >= 14)) {…}` block add:
```js
        if (!(d.version >= 15)) {
          // v15: the flight restructure — 13 stops, DOM content blocks, new order.
          // The beat shape changed (stop/id/side), so re-adopt DEFAULT_BEATS wholesale;
          // the visitor's global FX / speed / ease settings are kept.
          beats = structuredClone(DEFAULT_BEATS);
          beats.forEach(backfillBeat);
          migrated = true;
        }
```
In `save()` change `version: 14` to `version: 15`.

- [ ] **Step 5: Remove free-roam, waypoints, hotkeys legend, dossier, visit-live, captions**

Do these edits, re-grepping for each symbol afterwards until `grep -n` returns nothing:

1. `main.js:1546` `const freeBtn = …` → delete. `main.js:1563` `freeBtn.hidden = …` in `goTo` → delete. `main.js:1614-1630` `freeBtn.addEventListener…` and the whole `setFreeRoam` function → delete. Replace every remaining `setFreeRoam(...)` call (`grep -n setFreeRoam`) with nothing, and every `freeRoam` read with `false` is NOT allowed: keep the `let freeRoam = false` declaration so the existing guards compile, and delete the `V` key branch in the keydown handler near `main.js:2330-2336` (`if (e.key === 'v' …)` block).
2. `main.js:1632-1670` waypoint rail (`wpEl`, `wpDots`, `wpFill`, `buildWaypoints`, `updateWaypoints`, `buildWaypoints();`) → delete. Remove the `updateWaypoints();` call in `animate()` (~`main.js:2972`), the `buildWaypoi…` call inside `commit()` (`main.js:2915`), and the UI-panel line `chk('waypoints', 'uiWaypoints', …)` (`main.js:2744`).
3. `main.js:1672-1704` captions (`capEl`, `capLabel`, `capTitle`, `capDesc`, `HERO_SUBLINE`, `resolveCaption`, `_capShown`, `captionsOn`, `setCaption`, `hideCaption`) → delete. Remove `chk('caption', 'uiCaption', …)` (`main.js:2745`). In `ASSET_DEFS` remove the two `capTitle` / `capDesc` entries; then `grep -n "capTitle\|capDesc\|'caption'" src/main.js` and delete each remaining reference (they are in `frameAssets`, `curCapIdx` and the Assets panel; `curCapIdx()` becomes `function curCapIdx() { return index; }`).
4. `main.js:2817-2827` hotkeys legend IIFE → delete.
5. `main.js:1720` `const visitBtn = …` and the "visit live" block in `animate()` (`main.js:2992-2998`) → delete.
6. `main.js:3110-3111` `const dossier = initDossier(); workHub = initWorkHub(…)` → replace with:
```js
panels = initPanels({ beats, profile: PROFILE, root: document.querySelector('#stops'),
  onTint: (hex) => { /* per-project brand tint: CHAPTER_COLORS already handles the chapter; hover tint is CSS-only for now */ } });
bar = initBar({ profile: PROFILE, goTo, workIndex: WORK_INDEX, aboutIndex: ABOUT_INDEX, root: document.querySelector('#bar') });
mountPrintCV(PROFILE);
```
7. Replace the caption block in `animate()` (`main.js:2952-2962`) with:
```js
  {                                          // stop content: reveal on arrival, hide while moving / in editor
    if (editMode || freeRoam) { panels.hide(); bar.hide(); }
    else {
      const c = beats[index].cam;
      const dx = camera.position.x - c[0], dy = camera.position.y - c[1], dz = camera.position.z - c[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (!tween && dist < 26) panels.show(index);   // arrived & parked (Opening/Hero have no stop → no-op)
      else if (tween || dist > 70) panels.hide();
      if (progress > 0.02) bar.show(); else bar.hide();
    }
  }
```
Guard the first frames: `panels` is assigned after `animate()` starts, so add `if (panels && bar)` around that block.
8. `commit()` (`main.js:2915`) rebuilds derived state after Director Mode edits; append `panels = initPanels({ beats, profile: PROFILE, root: document.querySelector('#stops') });` so a reordered path rebuilds its stops.

- [ ] **Step 6: Delete `src/dossier.js` and the markup**

```bash
git rm -q src/dossier.js
```
In `index.html` delete: `#freeroam` button, `#visitlive` link, `#waypoints` nav, the whole `#hotkeys` div, the whole `#caption` div, and any `#dossier-btn` element (`grep -n dossier index.html`). Update the noscript comment to drop the dossier mention.

- [ ] **Step 7: Delete the dead CSS**

In `src/style.css` delete these blocks (grep the headers, delete through the next `/* ---- ` header): "Free-roam button", "Waypoint rail", "Hotkeys legend", "Kinetic section caption", `#visitlive` rules (lines ~275-284 and ~376), `#dossier-btn` through the last `#dossier …` rule (~582-679), `#workhub` rules (~732-757). Keep `@media print`, the loader, HUD, dev panels.

- [ ] **Step 8: Build and smoke-test**

```bash
npm test && npm run build 2>&1 | tail -2
grep -n "dossier\|workHub\|setCaption\|hideCaption\|buildWaypoints\|updateWaypoints\|visitBtn\|freeBtn\|setFreeRoam" src/main.js index.html src/style.css
```
Expected: tests pass, build succeeds, grep prints nothing.

Then in the Browser pane (`void-dev`): clear storage (`localStorage.clear()`), reload, press ↓ through all 13 stops. Expected: HUD reads `1 / 13` … `13 / 13`; Intro, CV, How I Build, 7 project blocks and Contact appear on arrival and vanish while flying; bar appears after the Opening; no console errors.

- [ ] **Step 9: Returning-visitor migration check**

In the page console:
```js
localStorage.setItem('voidConfig', JSON.stringify({ version: 14, beats: [{ name: 'Opening' }, { name: 'Hero' }, { name: 'Who' }], speed: 1, smooth: 0.5 })); location.reload();
```
After reload:
```js
JSON.parse(localStorage.getItem('voidConfig')).version + ' / ' + JSON.parse(localStorage.getItem('voidConfig')).beats.length
```
Expected: `15 / 13`.

- [ ] **Step 10: Commit**

```bash
git add -A src index.html
git commit -m "feat(flight): v15 — 13 stops with DOM content blocks; remove dossier, rail, free-roam, captions, hotkeys"
```

---

### Task 9: Hero softening, Hero/Opening polish, per-project void tint

**Files:**
- Modify: `src/main.js` (Intro beat `dur`/ease), `src/panels.js` (tint hook)

- [ ] **Step 1: The "exhale" into Intro**

`DEFAULT_BEATS[2].dur` is already 2.4. The global transition ease is `txEaseName`; per the spec the Hero→Intro move uses the softest curve. Add a per-beat ease override: in `goTo` (after computing `dur`) add
```js
  const easeOverride = beats[index]?.ease;   // v15: per-beat easing name (Intro uses the softest)
  tween = { from: progress, to: target, t: 0, dur: Math.max(0.15, dur), ease: easeOverride };
```
and where `transitionEase(k)` is applied in `animate()` (`main.js:2875`) use `(tween.ease ? EASES[tween.ease] : transitionEase)(k)`. Check the name of the ease table with `grep -n "txEaseName\|EASES\|const EASE" src/main.js` and use the actual identifier. Set `ease: 'gravity'` (or the softest name present in that table) on the Intro beat.

- [ ] **Step 2: Void tint per project on arrival**

`CHAPTER_COLORS[bi % …]` already tints by beat index. Replace that lookup (around `main.js:2948`) with:
```js
    const tint = (beats[bi]?.stop === 'project' && beats[bi].tintColor) || CHAPTER_COLORS[bi % CHAPTER_COLORS.length];
```
and in `rebuildDerived()` (or right after `load()`), compute once:
```js
  for (const b of beats) if (b.stop === 'project') { const x = PROFILE.work.featured.find((p) => p.id === b.id); if (x) b.tintColor = new THREE.Color(x.tint); }
```
Check what type `CHAPTER_COLORS` entries are (`grep -n "CHAPTER_COLORS =" src/main.js`) and match it (if they are `THREE.Color`, the above is right; if hex numbers, use `parseInt(x.tint.slice(1), 16)`).

- [ ] **Step 3: Verify and commit**

Fly Hero→Intro: the move takes ~2.4 s and decelerates gently. Arrive at TEEPO: the void tints green; at SmartCut: mustard.
```bash
git add src/main.js
git commit -m "feat(flight): soft ease into Intro; void tints toward each project's brand"
```

---

### Task 10: Author the cameras in Director Mode

**Files:**
- Modify: `src/main.js` `DEFAULT_BEATS` (bake)

- [ ] **Step 1: Author** — in the dev build press `E`, walk stops 2–11 and set each shot so the WebGL image panel sits on the `side` named in the beat and the text block has clear space on the other side; keep the path monotonic in z (deeper each stop). Use "Set cam from view" per stop, then **Copy config**.

- [ ] **Step 2: Bake** — paste the exported `BEATS` array over `DEFAULT_BEATS` entries 2–11, keeping the `stop` / `id` / `side` / `groupLabel` / `img` / `panel` fields (Copy config exports them since they are on the beat objects; verify with `grep -c '"stop"' <(pbpaste)` → 11).

- [ ] **Step 3: Verify the phone** — Browser pane `resize_window` mobile preset, 6× CPU throttle in devtools if available; walk all 13 stops. `fitFov()` must keep each panel in frame; text blocks sit at the bottom.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat(flight): bake authored cameras for the v15 stops"
```

---

### Task 11: Meta, noscript, JSON-LD, docs

**Files:**
- Modify: `index.html` (noscript + JSON-LD), `CLAUDE.md`, `BUILD_PLAN.md`, `PORTFOLIO_PLAN.md`

- [ ] **Step 1: Regenerate the noscript block** from the new content (order: intro line, CV rows, the seven projects with live links where present, contact). Keep it plain text, same styling wrapper.

- [ ] **Step 2: JSON-LD** — add `"https://x.com/…"` to `sameAs` only if `links.x` was confirmed; description stays.

- [ ] **Step 3: Docs** — `CLAUDE.md`: replace "The flight (DEFAULT_BEATS)" with the 13 stops, save version 15, type system (three faces), code map (add `render.js`, `panels.js`, `bar.js`, `printcv.js`; remove `dossier.js`), remove dossier/rail/free-roam mentions, add `npm test`. `BUILD_PLAN.md`: add "Phase H — v15 flight restructure ✅" with the ledger. `PORTFOLIO_PLAN.md`: mark the dossier phase superseded by v15.

- [ ] **Step 4: Commit**

```bash
git add index.html CLAUDE.md BUILD_PLAN.md PORTFOLIO_PLAN.md
git commit -m "docs: v15 flight — noscript, JSON-LD, CLAUDE.md, ledgers"
```

---

### Task 12: Verification pass (spec §7)

**Files:** none (fixes go into the files they belong to, committed as `fix:` commits)

- [ ] **Step 1: Unit + build**
```bash
npm test && npm run build 2>&1 | tail -2 && du -sh dist && ls -la public/fonts/*.woff2
```
Expected: all tests pass; `dist` ≤ 4.2 MB; fonts total < 200 KB.

- [ ] **Step 2: Phone** — Browser pane, mobile preset (390×844), reload; walk all 13 stops with swipes; watch `read_console_messages` for errors and the HUD for `13 / 13`. No arrival hitch longer than a frame drop.

- [ ] **Step 3: Keyboard only** — desktop: Tab reaches bar buttons, Enter on "Work" flies to TEEPO; ↓/↑/Space step; "Copy email" flips to "Copied".

- [ ] **Step 4: Reduced motion** — `resize_window` has no toggle; emulate via devtools "prefers-reduced-motion" or run in console `matchMedia('(prefers-reduced-motion: reduce)').matches` on a system with it enabled. Expected: blocks appear without transitions; proof numbers show final values immediately.

- [ ] **Step 5: Returning visitor** — repeat Task 8 Step 9 on the production build (`npm run preview`).

- [ ] **Step 6: Print** — `window.print()` from the CV stop's button: preview shows `#print-cv` only, one page.

- [ ] **Step 7: Lighthouse** — push the branch, open the Vercel preview URL, run Lighthouse (mobile). Expected: Performance ≥ 90, Accessibility ≥ 90. Record the scores in the PR body.

- [ ] **Step 8: Finish** — invoke `finishing-a-development-branch` to merge `flight-v15` into `main` (push to main deploys).

---

## Self-review

**Spec coverage.** §2 decisions: flight kept (Task 8 leaves navigation untouched), order (Task 8 Step 2), one stop per project (beats 5–11), groups and labels (`groupLabel`), repo links only where public (render.js), English only, type (Task 1), removals (Task 8 Steps 5–7), Director Mode kept (Task 10 uses it). §3 stops: every row has a renderer (Task 3) and a beat (Task 8). §4 bar: Task 6. §5 motion: CSS recipes in Task 5, exhale + tint in Task 9. §6 code: file map matches; `curCapIdx` and Assets panel cleanup covered in Task 8 Step 5.3. §7 testing: Task 12. §9 open content: proof numbers and X handle carry ⏳ markers in `profile.js`.

**Gaps fixed while reviewing:** the spec's "About → goTo(2)" is `ABOUT_INDEX = 2` (Intro); `panels.js` `onTint` is a no-op hook and the real tint lives in Task 9 Step 2 (main.js), so the hook is documented as such rather than left dangling.

**Type consistency.** `initPanels({ beats, profile, root, onTint })` returns `{ show(i), hide(), el(i) }`; `main.js` calls `panels.show(index)` and `panels.hide()`. `initBar({ profile, goTo, workIndex, aboutIndex, root })` returns `{ show(), hide() }`. `renderProject(x, side)`; beats carry `stop`, `id`, `side`, `groupLabel`, `tintColor`. `PROFILE.cvStop`, `PROFILE.intro.lines`, `PROFILE.method.lines`, `PROFILE.proof[].n`, `PROFILE.contact.line/availability`, `PROFILE.links.x` are used with the same names in tests, renderers and content.
