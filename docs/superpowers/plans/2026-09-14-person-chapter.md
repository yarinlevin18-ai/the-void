# Person Chapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Hero, Intro and CV stops with Hi (portrait + greeting), About (three speaking photos + story) and Timeline (dated rows + the two hero screens), per `docs/superpowers/specs/2026-09-14-person-chapter-design.md`.

**Architecture:** Copy lives in `src/content/profile.js`, pure renderers in `src/render.js`, the DOM stop layer in `src/panels.js`. `src/main.js` owns the flight (`DEFAULT_BEATS`, save v18), the WebGL panels (one `panel` per beat today; this adds an optional `panels[]` array) and the CSS3D hero screens (re-keyed from the `hero` stop to a `screens` flag). Tests run under `node --test` with happy-dom for the DOM ones.

**Tech Stack:** Vanilla JS, Vite 8, Three.js 0.169, `node --test`, Pillow for placeholder WebPs.

---

### Task 1: Placeholder photos

**Files:**
- Create: `public/assets/me/portrait.webp`, `public/assets/me/speaking-1.webp`, `speaking-2.webp`, `speaking-3.webp`
- Test: `tests/profile.test.js` (Task 2 asserts they exist)

- [ ] **Step 1: Generate the four placeholders**

```bash
mkdir -p public/assets/me && python3 - <<'EOF'
from PIL import Image, ImageDraw
def ph(path, w, h, label):
    im = Image.new('RGB', (w, h), '#0b1a26'); d = ImageDraw.Draw(im)
    d.rectangle([8, 8, w-9, h-9], outline='#1f3a4e', width=2)
    d.text((w//2-30, h//2-6), label, fill='#2c4d66')
    im.save(path, 'WEBP', quality=82)
ph('public/assets/me/portrait.webp', 900, 1200, 'PORTRAIT')
for i in range(1, 4): ph(f'public/assets/me/speaking-{i}.webp', 1400, 875, f'SPEAKING {i}')
EOF
ls -la public/assets/me/
```

Expected: four files, each under 10 KB.

- [ ] **Step 2: Commit**

```bash
git add public/assets/me && git commit -m "assets: placeholder portrait and speaking photos for the person chapter"
```

### Task 2: Profile content model

**Files:**
- Modify: `src/content/profile.js` (bio.full line 23, cvStop block lines 79–87, cv.experience org line 150, add `hi`/`about`/`timeline`, delete `hero`/`intro`/`cvStop`)
- Modify: `tests/profile.test.js` (replace the intro test at line 8 and the cvStop test at line 44)

- [ ] **Step 1: Write the failing tests** — replace the two tests:

```js
test('hi, about and timeline carry the person chapter', () => {
  assert.ok(PROFILE.hi.greeting.startsWith('Hi, I’m'));
  assert.ok(PROFILE.hi.status.includes('AI-native developer'));
  assert.equal(PROFILE.hi.lines.length, 2);
  assert.equal(PROFILE.about.paragraphs.length, 3);
  assert.equal(PROFILE.about.photos.length, 3);
  assert.ok(PROFILE.timeline.rows.length >= 5);
  for (const r of PROFILE.timeline.rows) { assert.ok(r.when); assert.ok(r.what); assert.ok(r.line); }
  assert.equal(PROFILE.hero, undefined); assert.equal(PROFILE.intro, undefined); assert.equal(PROFILE.cvStop, undefined);
});

test('every person-chapter photo path exists under public/', () => {
  for (const p of [PROFILE.hi.portrait, ...PROFILE.about.photos.map((x) => x.src)]) {
    assert.match(p, /^\/assets\/me\/.+\.webp$/, p);
    assert.ok(existsSync(new URL(`../public${p}`, import.meta.url)), p);
  }
});
```

Run: `node --test tests/profile.test.js 2>&1 | grep -E "not ok"` — expected: both new tests fail (`PROFILE.hi` undefined).

- [ ] **Step 2: Edit the profile**

Delete the `hero: {...}` line (50) and its comment, the `intro: {...}` block (52–58) and the `cvStop: [...]` block with its comment (79–87). Insert after `status: {...}`:

```js
  // stop 01 "Hi" — portrait panel left, greeting right. (2026-09-14 person chapter)
  hi: {
    greeting: 'Hi, I’m Yarin Levin.',
    status: 'AI-native developer · B.A. student at Ben-Gurion · open to work',
    lines: [
      'This is my CV as a landing page. Scroll to fly through it.',
      'Who I am, what I built, and how to reach me.',
    ],
    portrait: '/assets/me/portrait.webp',
  },
  // stop 02 "About" — three speaking photos right, story left. Captions feed the noscript path only.
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
  // stop 03 "Timeline" — dated rows on a rail; the two hero screens float beside it.
  // ⏳ months are Yarin's guesses to confirm; the shape does not change.
  timeline: {
    eyebrow: 'Coding experience',
    title: 'Since April 2026.',
    rows: [
      { when: 'Apr 2026', what: 'First builds', line: 'Self-taught with Claude Code from the first line; the labs start here.' },
      { when: 'May 2026', what: 'SHADIEZ', line: 'Paid client site, in production.' },
      { when: 'Jun 2026', what: 'AeroCy', line: 'The company’s live bilingual site, shipped in days.' },
      { when: 'Jul 2026', what: 'TEEPO', line: 'Hebrew-RTL study platform, live with real auth.' },
      { when: 'Aug 2026', what: 'LLM Gateway', line: 'The control plane every agent I run goes through.' },
      { when: 'Now', what: '17 built, 7 live', line: 'One or two client projects a quarter, alongside a part-time position.' },
    ],
  },
```

Rename the IDF unit: line 23 `'I came to development the long way. Four years in the IDF’s Rescue & '` + next line `'Training Division — deputy company commander...'` → `'I came to development the long way. Four years in the IDF’s Search and '` + `'Rescue — deputy company commander...'`; line 150 `org: 'IDF — Rescue & Training Division (Home Front Command)'` → `org: 'IDF — Search and Rescue (Home Front Command)'`.

- [ ] **Step 3: Run** `node --test tests/profile.test.js 2>&1 | grep -E "^# (pass|fail)"` — expected all pass (render/panels tests will fail until Task 3; that is fine at this step).

- [ ] **Step 4: Commit** `git add src/content/profile.js tests/profile.test.js && git commit -m "content: hi / about / timeline replace hero, intro and cvStop; IDF unit is Search and Rescue"`

### Task 3: Renderers

**Files:**
- Modify: `src/render.js` (replace `renderHero`, `renderIntro`, `renderCV` at lines 11–28)
- Modify: `tests/render.test.js` (imports line 3, tests at lines 10–20, 54–60, 63–67, 97–101)

- [ ] **Step 1: Write the failing tests** — change the import to `import { esc, renderHi, renderAbout, renderTimeline, renderBuild, renderProject, renderContact } from '../src/render.js';`, delete the intro, cv and hero tests, and add:

```js
test('hi renders greeting, status and two lines, side left', () => {
  const h = renderHi(PROFILE);
  assert.ok(h.includes('data-side="left"'));
  assert.ok(h.includes(esc(PROFILE.hi.greeting)));
  assert.ok(h.includes(esc(PROFILE.hi.status)));
  assert.equal((h.match(/class="line"/g) || []).length, 2);
});

test('about renders title, three paragraphs, side right, and never draws photos', () => {
  const h = renderAbout(PROFILE);
  assert.ok(h.includes('data-side="right"'));
  assert.equal((h.match(/class="para"/g) || []).length, 3);
  assert.ok(!h.includes('<img'), 'photos are WebGL panels, not DOM images');
});

test('timeline renders one row per entry, a dot each, and the print pill', () => {
  const h = renderTimeline(PROFILE);
  assert.equal((h.match(/class="tl-row"/g) || []).length, PROFILE.timeline.rows.length);
  assert.equal((h.match(/class="tl-dot"/g) || []).length, PROFILE.timeline.rows.length);
  assert.ok(h.includes('data-print-cv'));
  assert.ok(h.includes('Search and Rescue') === false, 'timeline is about code, not service');
});
```

In the escaping test (line 54) replace the `renderIntro(...)` line with `const h = renderHi({ hi: { greeting: '<script>x</script>', status: 'a & b', lines: ['<b>'] } });` and keep its assertions (`!h.includes('<script>')`, `h.includes('a &amp; b')`). In the DOM-hooks test (line 63) replace `renderCV(PROFILE)` with `renderTimeline(PROFILE)`.

Run: `node --test tests/render.test.js 2>&1 | grep -E "not ok|Error"` — expected: import error, `renderHi` not exported.

- [ ] **Step 2: Implement** — replace lines 10–28 of `src/render.js` with:

```js
// 01 Hi — portrait panel on the left (WebGL), greeting on the right.
export function renderHi(p) {
  const lines = p.hi.lines.map((l, i) => `<p class="line" style="--i:${i + 1}">${esc(l)}</p>`).join('');
  return `<article class="hi" data-side="left">
    ${eyebrow('Hello')}
    <h2 class="greeting" style="--i:0">${esc(p.hi.greeting)}</h2>
    <div class="status">${esc(p.hi.status)}</div>
    ${lines}
  </article>`;
}

// 02 About — three speaking photos on the right (WebGL panels), the story on the left.
export function renderAbout(p) {
  const paras = p.about.paragraphs.map((l, i) => `<p class="para" style="--i:${i + 1}">${esc(l)}</p>`).join('');
  return `<article class="about" data-side="right">
    ${eyebrow(p.about.eyebrow)}
    <h2 class="about-title" style="--i:0">${esc(p.about.title)}</h2>
    ${paras}
  </article>`;
}

// 03 Timeline — dated rows on a glowing rail; the hero screens float beside it (main.js).
export function renderTimeline(p) {
  const rows = p.timeline.rows.map((r, i) => `
    <li class="tl-row" style="--i:${i}">
      <span class="tl-dot"></span>
      <span class="tl-when">${esc(r.when)}</span>
      <span class="tl-body"><b class="tl-what">${esc(r.what)}</b><span class="tl-line">${esc(r.line)}</span></span>
    </li>`).join('');
  return `${eyebrow(p.timeline.eyebrow)}
    <h2 class="tl-title">${esc(p.timeline.title)}</h2>
    <ol class="timeline">${rows}</ol>
    <button type="button" class="pill" data-print-cv>Download CV ↓</button>`;
}
```

- [ ] **Step 3: Run** `node --test tests/render.test.js 2>&1 | grep -E "^# (pass|fail)"` — expected all pass.

- [ ] **Step 4: Commit** `git add src/render.js tests/render.test.js && git commit -m "render: hi, about and timeline stops"`

### Task 4: Stop layer

**Files:**
- Modify: `src/panels.js` (import line 5, dispatch lines 20–23)
- Modify: `tests/panels.test.js` (fixture lines 10–13, assertions lines 29, 52–61)

- [ ] **Step 1: Failing tests** — fixture becomes:

```js
  { name: 'Opening' },
  { name: 'Hi', stop: 'hi' },
  { name: 'About', stop: 'about' },
  { name: 'Timeline', stop: 'timeline', screens: true },
```

Line 29: `assert.ok(panels.el(I.hi).querySelector('.greeting'), 'hi stop carries the greeting');` and add after it:

```js
  assert.equal(panels.el(I.hi).dataset.side, 'left');
  assert.equal(panels.el(I.about).dataset.side, 'right');
  assert.equal(panels.el(I.about).getAttribute('aria-label'), 'About · On stage · The room · After the talk');
```

Lines 52–61: replace every `I.intro` with `I.about` and the variable `intro` with `about`.

Run: `node --test tests/panels.test.js 2>&1 | grep -E "not ok"` — expected: unknown stop type "hi".

- [ ] **Step 2: Implement** — import becomes `import { renderHi, renderAbout, renderTimeline, renderBuild, renderProject, renderContact, esc } from './render.js';` and the dispatch:

```js
    if (b.stop === 'hi') { sec.innerHTML = renderHi(profile); sec.dataset.side = 'left'; }
    else if (b.stop === 'about') {
      sec.innerHTML = renderAbout(profile); sec.dataset.side = 'right';
      sec.setAttribute('aria-label', [profile.about.eyebrow, ...profile.about.photos.map((x) => x.caption)].join(' · '));
    }
    else if (b.stop === 'timeline') sec.innerHTML = renderTimeline(profile);
    else if (b.stop === 'build') sec.innerHTML = renderBuild(profile);
```

(The `aria-label` set at the top of the loop is overwritten for About on purpose.)

- [ ] **Step 3: Run** `node --test tests/panels.test.js 2>&1 | grep -E "^# (pass|fail)"` — expected all pass.

- [ ] **Step 4: Commit** `git add src/panels.js tests/panels.test.js && git commit -m "panels: mount hi, about and timeline stops"`

### Task 5: Deep links

**Files:**
- Modify: `src/hash.js` line 13; `tests/hash.test.js` fixture lines 5–10

- [ ] **Step 1: Failing test** — fixture:

```js
const beats = [
  { name: 'Opening' }, { name: 'Hi', stop: 'hi' }, { name: 'About', stop: 'about' },
  { name: 'Timeline', stop: 'timeline' }, { name: 'Build', stop: 'build' },
  { name: 'LLM', stop: 'project' }, { name: 'Contact', stop: 'contact' },
];
```

Run: `node --test tests/hash.test.js 2>&1 | grep "not ok"` — expected: `#CV` resolves to -1 instead of 3.

- [ ] **Step 2: Implement** — `cv: (c) => c.beats.findIndex((b) => b.stop === 'timeline'),`

- [ ] **Step 3: Run** `node --test tests/hash.test.js` — all pass. **Commit** `git add src/hash.js tests/hash.test.js && git commit -m "hash: #cv flies to the timeline stop"`

### Task 6: Flight, panels array, hero screens, save v18 (`src/main.js`)

**Files:**
- Modify: `src/main.js` — `applyPortraitPoses` (883), `DEFAULT_BEATS` (887–901), `computeStopIndices` (907), `load()` v16 guard comment + new v18 block (after the v17 block, ~995), `save()` version (1008), `stopTints` (1046), `rebuildPanels` (1202), `disposePanels` (1195), hero `heroOn` (2713)
- Modify: `tests/save.test.js` (no change needed; the guard test reads the numbers)

- [ ] **Step 1: DEFAULT_BEATS** — replace rows 1–3 with:

```js
  // v18 (2026-09-14): person chapter — Hi / About / Timeline replace Hero / Intro / CV.
  /* 1 */ { name: 'Hi', stop: 'hi', side: 'left', cam: [1, 53, 33], look: [192, -55, -56], up: [0, 1, 0], fov: 41, dur: 2.1, desc: '', img: '/assets/me/portrait.webp', link: '', fx: { ...VOID_FX }, panel: (() => { const p = P(1, 53, 33, 'left'); p.size = [20, 26.7]; return p; })() },
  /* 2 */ { name: 'About', stop: 'about', side: 'right', ease: 'easeOut', cam: [6, 12, 5], look: [-30, 26, -55], up: [0, 1, 0], fov: 55, dur: 2.4, desc: '', img: '', link: '', fx: { ...VOID_FX }, panel: null,
           panels: [
             { img: '/assets/me/speaking-1.webp', ...P(6, 12, 5, 'right') },
             { img: '/assets/me/speaking-2.webp', ...mkPanel(6 + PANEL_DX - 9, 12 + PANEL_DY - 7, 5 - PANEL_DZ + 12, 17, 10.6, [0, -12, 0]) },
             { img: '/assets/me/speaking-3.webp', ...mkPanel(6 + PANEL_DX + 8, 12 + PANEL_DY - 9, 5 - PANEL_DZ + 20, 12.6, 7.9, [0, -18, 0]) },
           ] },
  /* 3 */ { name: 'Timeline', stop: 'timeline', screens: true, cam: [-8, 8, -21], look: [26, 20, -71], up: [0, 1, 0], fov: 60, dur: 1.6, desc: '', img: '', link: '', fx: { ...VOID_FX }, panel: null },
```

These cameras are the old Hero/Intro/CV poses; Task 9 re-tunes them in Director Mode.

- [ ] **Step 2: Portrait poses and stop indices**

```js
function applyPortraitPoses() {
  for (const b of beats) if ((b.stop === 'project' || b.stop === 'hi' || b.stop === 'about') && b.cam && b.side) b.portrait = PP(b.cam[0], b.cam[1], b.cam[2], b.side);
}
```

`ABOUT_INDEX = Math.max(0, beats.findIndex((b) => b.stop === 'about'));`

- [ ] **Step 3: Tints** — replace `if (b.stop === 'hero') return null;   // Hero keeps...` with `if (b.screens) return null;   // the screens stop keeps the chapter fallback like the Opening` and the trailing comment `// intro / cv / build` with `// hi / about / timeline / build`.

- [ ] **Step 4: Panels array** — `rebuildPanels` becomes:

```js
const extraPanelMeshes = [];   // About's photo cluster etc. — not index-aligned; disposed with the rest
function rebuildPanels() {
  disposePanels();
  beats.forEach((b, i) => {
    if (!b.panel) panelMeshes.push(null);
    else { const mesh = makePanelMesh(b, i); panelGroup.add(mesh); panelMeshes.push(mesh); }
    for (const x of b.panels || []) {
      if (IS_TOUCH && x !== b.panels[0]) continue;   // phones: the largest photo only
      const mesh = makePanelMesh({ img: x.img, img2: '', panel: x }, i);
      panelGroup.add(mesh); extraPanelMeshes.push(mesh);
    }
  });
  for (const m of [...panelMeshes, ...extraPanelMeshes]) if (m && m.material.map) renderer.initTexture(m.material.map);
}
```

and `disposePanels` disposes `extraPanelMeshes` the same way it disposes `panelMeshes` (loop, `geometry.dispose()`, map + material dispose, then `extraPanelMeshes.length = 0`). The per-frame "light up as the camera arrives" loop (line ~2741) runs over `[...panelMeshes, ...extraPanelMeshes]` with the same opacity formula (skip the `beats[i]?.panel?.billboard` branch for extras).

- [ ] **Step 5: Hero screens** — `const heroOn = !editMode && !!beats[index]?.screens;`

- [ ] **Step 6: Save v18** — after the v17 block:

```js
        if (!(d.version >= 18)) {
          // v18 (2026-09-14): person chapter — Hi / About / Timeline replace Hero /
          // Intro / CV, beats gain `panels[]` and `screens`. Wholesale re-adopt;
          // global FX / speed / ease stay.
          beats = structuredClone(DEFAULT_BEATS);
          migrated = true;
        }
```

and `save()` stamps `version: 18`. Update the v16 comment's "Future shape changes: add `if (!(d.version >= 18))`" to `>= 19`.

- [ ] **Step 7: Run** `npm test 2>&1 | grep -E "^# (pass|fail)|not ok"` — expected all pass (save test sees 18/18; DEFAULT_BEATS image test finds `/assets/me/portrait.webp`). Note the save test's image regex only matches `img:` keys, so the `panels[]` images are covered by the profile test instead.

- [ ] **Step 8: Commit** `git add src/main.js && git commit -m "flight(v18): hi / about / timeline stops, panels[] per beat, hero screens keyed by screens flag"`

### Task 7: Styles

**Files:**
- Modify: `src/style.css` — replace the `/* 01 Hero */`, `/* 02 Intro */`, `/* 03 CV */` blocks (lines 509–529)

- [ ] **Step 1: Replace with**

```css
/* 01 Hi / 02 About — text block opposite the photo panel(s); lines rise with a 60ms stagger */
.stop-hi, .stop-about { justify-content: safe flex-end; }
.hi, .about { max-width: 34rem; }
.hi .greeting, .about .about-title { font-family: var(--f-display); font-weight: 800; font-stretch: 78%; font-size: clamp(2rem, 6vw, 4.2rem); line-height: .95; letter-spacing: -0.02em; color: #eaf4ff; margin: 0 0 .8rem; }
.hi .status { font-family: var(--f-mono); font-weight: 700; font-size: .75rem; letter-spacing: .14em; text-transform: uppercase; color: #4fd2ff; margin-bottom: 1.4rem; }
.hi .line { font-family: var(--f-display); font-weight: 500; font-stretch: 90%; font-size: clamp(1.15rem, 2.4vw, 1.8rem); line-height: 1.25; color: #eaf4ff; max-width: 28ch; margin: 0 0 .5em; }
.about .para { font-size: clamp(.95rem, 1.5vw, 1.05rem); line-height: 1.55; color: #b8d4ea; max-width: 46ch; margin: 0 0 .9em; }
.hi .greeting, .hi .line, .about .about-title, .about .para { opacity: 0; transform: translateY(12px); transition: opacity .45s ease, transform .45s cubic-bezier(.22,1,.36,1); transition-delay: calc(var(--i) * 60ms); }
.stop.in .hi .greeting, .stop.in .hi .line, .stop.in .about .about-title, .stop.in .about .para { opacity: 1; transform: none; }
@media (min-width: 900px) {
  .stop-hi, .stop-about { justify-content: safe center; }
  .stop-hi[data-side="left"] .hi { margin-left: auto; margin-right: 0; }
  .stop-about[data-side="right"] .about { margin-right: auto; margin-left: 0; }
}

/* 03 Timeline — rows on a rail that grows top to bottom; dots light with their row */
.tl-title { font-family: var(--f-display); font-weight: 800; font-stretch: 78%; font-size: clamp(2rem, 6vw, 4.2rem); line-height: .95; letter-spacing: -0.02em; color: #eaf4ff; margin: 0 0 1.2rem; }
.timeline { list-style: none; margin: 0; padding: 0 0 0 1.4rem; position: relative; max-width: 40rem; }
.timeline::before { content: ""; position: absolute; left: .3rem; top: .4rem; bottom: .4rem; width: 1px; background: linear-gradient(#4fd2ff, rgba(79,210,255,.15)); transform: scaleY(0); transform-origin: top; transition: transform .6s cubic-bezier(.22,1,.36,1); }
.stop.in .timeline::before { transform: scaleY(1); }
.tl-row { position: relative; display: grid; grid-template-columns: 1fr; gap: .15rem .8rem; padding: .7rem 0; opacity: 0; transform: translateX(-10px); transition: opacity .35s ease, transform .35s ease; transition-delay: calc(var(--i) * 70ms + 120ms); }
.stop.in .tl-row { opacity: 1; transform: none; }
.tl-dot { position: absolute; left: -1.4rem; top: 1.05rem; width: 7px; height: 7px; margin-left: .3rem; transform: translateX(-50%); border-radius: 50%; background: #4fd2ff; box-shadow: 0 0 10px #4fd2ff; opacity: 0; transition: opacity .3s ease; transition-delay: calc(var(--i) * 70ms + 200ms); }
.stop.in .tl-dot { opacity: 1; }
.tl-when { font-family: var(--f-mono); font-weight: 700; font-size: .75rem; letter-spacing: .14em; text-transform: uppercase; color: #4fd2ff; }
.tl-what { display: block; font-weight: 600; color: #eaf4ff; font-size: .95rem; }
.tl-line { display: block; font-size: .82rem; color: #9fc2e0; line-height: 1.45; }
.stop-timeline .pill { margin-top: 1.2rem; align-self: flex-start; }
@media (min-width: 720px) { .tl-row { grid-template-columns: 6rem 1fr; } }
@media (prefers-reduced-motion: reduce) { .timeline::before, .tl-row, .tl-dot, .hi .greeting, .hi .line, .about .about-title, .about .para { transition: none; } }
```

Also update the stop layout comment that mentions "12 Contact" numbering only if it references Intro/CV (it does not).

- [ ] **Step 2: Sweep** `grep -n "hero-line\|\.intro \|\.cv-row\|stop-cv\|stop-hero\|stop-intro" src/style.css` — expected: no output.

- [ ] **Step 3: Commit** `git add src/style.css && git commit -m "style: hi, about and timeline stops with reveal recipes"`

### Task 8: Noscript path and docs

**Files:**
- Modify: `index.html` lines 350–364 (the h1's first `<p>`, the status `<p>`, the `<h2>CV</h2>` list)
- Modify: `CLAUDE.md` (flight list, code map, persistence paragraph), `BUILD_PLAN.md` (Phase K)

- [ ] **Step 1: Noscript** — replace from the `<p>AI-native developer. Every build…</p>` through the end of the CV `</ul>` with:

```html
        <p><strong>Hi, I’m Yarin Levin.</strong> AI-native developer · B.A. student at Ben-Gurion · open to work.
           This is my CV as a landing page. Who I am, what I built, and how to reach me.</p>
        <h2>About</h2>
        <p>Four years in the IDF’s Search and Rescue, finishing as deputy company commander. During Guardian of Walls I led the battalion into emergency deployment.
           Then a year on stage for FIDF and Faces of October Seventh: 35 lectures across the US and Panama, rooms of 10 to 700.
           In April 2026 I started building for the web, self-taught, with AI from day one.</p>
        <h2>Coding experience</h2>
        <ul>
          <li>Apr 2026 — First builds: self-taught with Claude Code from the first line; the labs start here.</li>
          <li>May 2026 — SHADIEZ: paid client site, in production.</li>
          <li>Jun 2026 — AeroCy: the company’s live bilingual site, shipped in days.</li>
          <li>Jul 2026 — TEEPO: Hebrew-RTL study platform, live with real auth.</li>
          <li>Aug 2026 — LLM Gateway: the control plane every agent I run goes through.</li>
          <li>Now — 17 built, 7 live. One or two client projects a quarter, alongside a part-time position.</li>
        </ul>
        <h2>Before code</h2>
        <ul>
          <li>2023 – 24 — Public speaker · FIDF / Faces of October Seventh: 35+ lectures across the US and Panama, audiences of 10 to 700.</li>
          <li>2023 — Warehouse project manager · Paloma Dead Sea: Inventory, quality and process control; managed staff and external storage sites.</li>
          <li>2018 – 22 — IDF · Search and Rescue: Deputy company commander; led the battalion into emergency deployment during Guardian of Walls.</li>
          <li>– 2028 — B.A. Politics &amp; Government + Entrepreneurship · BGU: Ben-Gurion University of the Negev, in progress.</li>
        </ul>
```

Run `npm test` — the retired-phrase guard must still pass.

- [ ] **Step 2: CLAUDE.md** — rewrite "The flight (DEFAULT_BEATS)" to the 11 stops of the spec table; in "Stops" note `panels[]` and `screens`; save version 18 in Persistence; code map: `render.js` "(hi, about, timeline, build, project, contact)"; add `public/assets/me/` row "portrait + 3 speaking photos (placeholders until Yarin's files land)"; deep links `#about` → About, `#cv` → Timeline. Update the "What this is" paragraph: "The **v18 flight** (2026-09-14) puts the person first: Hi → About → Timeline → How I Build → five project stops → Contact."

- [ ] **Step 3: BUILD_PLAN.md** — add before `## Open work`:

```markdown
## Phase K — Person chapter ✅ (2026-09-14)
Spec: `docs/superpowers/specs/2026-09-14-person-chapter-design.md`. Hi (portrait
panel + greeting), About (three speaking-photo panels at different depths +
story), Timeline (dated rows on a rail + the two hero screens) replace Hero /
Intro / CV. Beats gain `panels[]` and `screens`; save v18 re-adopts wholesale.
Photos are placeholders in `public/assets/me/` until Yarin's files land.
Open: timeline months, photo captions, real photos.
```

and open-work items: `9. **Person chapter holds:** real photos into public/assets/me/, timeline months, captions.`

- [ ] **Step 4: Commit** `git add index.html CLAUDE.md BUILD_PLAN.md && git commit -m "docs+noscript: person chapter (v18)"`

### Task 9: Camera and panel tuning, verification, deploy

**Files:** `src/main.js` `DEFAULT_BEATS` rows 1–3 (numbers only)

- [ ] **Step 1: Dev server** — `preview_start` with `void-dev`, viewport 1440×900, clear `localStorage`, reload, hide the FX panel (`b`).
- [ ] **Step 2: Walk Hi → About → Timeline.** Check: the portrait panel sits left of the greeting with no overlap; About shows three panels at visibly different depths right of the text; Timeline shows the rail, six rows, the pill, and the two hero screens on the right. If a panel is off-frame, press `E` (Director Mode), select the beat, use the panel sliders, **Copy config**, and paste the tuned `cam`/`look`/`panel`/`panels` numbers into `DEFAULT_BEATS`. Re-run `npm test`.
- [ ] **Step 3: Phone** — `resize_window` mobile, reload with cleared storage, walk the same three stops: photo above text, About shows only the stage panel, labels ≥ 12px. Reset to desktop.
- [ ] **Step 4: Console** — `read_console_messages` errors only: none from shipped code.
- [ ] **Step 5: Build** `npm run build 2>&1 | tail -3` — clean.
- [ ] **Step 6: Commit and push** `git add src/main.js && git commit -m "flight(v18): cameras and panel poses tuned for hi / about / timeline" && git push origin main`
- [ ] **Step 7: Live check** after ~60 s: open the deployed URL, tab title unchanged, fly to About, no console errors, `#cv` lands on Timeline.
