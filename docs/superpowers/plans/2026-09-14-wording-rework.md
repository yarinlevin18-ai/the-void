# Wording Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the copy in `docs/superpowers/specs/2026-09-14-wording-rework-design.md`: "AI-native developer" everywhere, every claim checkable, retired claims blocked by a test.

**Architecture:** All visitor copy lives in `src/content/profile.js` and is rendered by pure functions in `src/render.js`; `index.html` duplicates the story for crawlers (meta, JSON-LD, noscript). A guard test in `tests/profile.test.js` walks every profile string and `index.html` for retired phrases. The share card is a screenshot of the opening frame.

**Tech Stack:** Vanilla JS, Vite 8, `node --test`, Playwright MCP for the og.jpg capture, Pillow for the JPEG encode.

---

### Task 1: Guard test for retired phrases

**Files:**
- Modify: `tests/profile.test.js` (append at end)

- [ ] **Step 1: Append the failing test**

```js
// Claims that were retired in the 2026-09-14 wording rework. They must not
// come back anywhere a visitor or crawler can read them.
const RETIRED = ['ai-native builder', 'real users', 'with users', 'dropped wix', 'stopped rescheduling', 'one user', 'not a demo'];

function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

test('retired claims do not appear in the profile or index.html', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').toLowerCase();
  const all = strings(PROFILE).map((s) => s.toLowerCase());
  for (const phrase of RETIRED) {
    const hit = all.find((s) => s.includes(phrase));
    assert.equal(hit, undefined, `profile contains "${phrase}": ${hit}`);
    assert.ok(!html.includes(phrase), `index.html contains "${phrase}"`);
  }
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test tests/profile.test.js 2>&1 | grep -E "not ok|contains"`
Expected: `not ok` with `profile contains "ai-native builder": AI-Native Builder`.

### Task 2: Profile copy

**Files:**
- Modify: `src/content/profile.js` — `title` (line 9), `bio.line/short/full` (13–38), `status.seeking` (41), `hero.line` (50), `intro.lines` (55–56), `cvStop[0]` (82), `cv.experience[0].role` (107), featured `teepo/aerocy/smartcut/sabai` (183–252).

- [ ] **Step 1: Apply the copy exactly as the spec tables state**

Field by field:

```js
title: 'AI-native developer',

bio.line: 'AI-native developer. Student position, part-time — available now.',
bio.short:
  'AI-native developer: I write the spec, direct Claude Code through the ' +
  'build, and ship it myself. Since April 2026: 17 products built, 7 live, ' +
  'one paid client site — client e-commerce, a Hebrew-RTL study platform with ' +
  'real auth and a Chrome-extension scraper, an LLM gateway, this 3D portfolio. ' +
  'Before code: four years of IDF command and a year of public speaking across ' +
  'the US. B.A. student at Ben-Gurion University, looking for a part-time ' +
  'student position.',
// bio.full, second paragraph: replace
//   'product with real users’ problems in mind (TEEPO — Hebrew-RTL study '
// with
//   'product (TEEPO — Hebrew-RTL study '
// and 'And I haven’t stopped: paid client work (SHADIEZ), a full ' stays.

status.seeking: 'Student position · part-time · AI-native developer',

hero: { line: 'AI-native developer. Every build directed end-to-end with Claude Code, from spec to production.' },

intro.lines: [
  'I write the spec, direct Claude Code through the build, and ship it myself. That is the whole job, and I do it for clients and for my own products.',
  'Since April 2026: two client sites live, one of them paid, a Hebrew-RTL study platform I run my own semester in, and an LLM gateway every agent I use goes through.',
],

cvStop[0]: { years: '2026 –', role: 'Freelance AI-native developer', line: 'Client sites and my own products, every build directed end-to-end with Claude Code.' },

cv.experience[0].role: 'Freelance AI-native developer',

teepo.outcome:    'Live all semester, with real auth and the real Moodle data.',
aerocy.outcome:   'The company’s live site, shipped in days.',
smartcut.kind:    'Booking CRM',
smartcut.outcome: 'A booking CRM designed for a grooming studio: slots, approvals and customer self-service.',
sabai.outcome:    'I used it every day of the trip.',
```

Also delete the stale comment above `proof[]` (`// ⏳ Yarin confirms these three numbers…`) and replace it with `// Confirmed by Yarin 2026-09-14.`

- [ ] **Step 2: Run the profile tests**

Run: `node --test tests/profile.test.js 2>&1 | grep -E "^# (pass|fail)|not ok"`
Expected: the guard test still fails, but only on `index.html contains "ai-native builder"` (and the other index.html phrases). No `profile contains` failure.

- [ ] **Step 3: Commit**

```bash
git add src/content/profile.js tests/profile.test.js
git commit -m "copy: AI-native developer, checkable outcomes for TEEPO/AeroCy/SmartCut/Sabai; guard test for retired claims"
```

### Task 3: index.html — title, meta, JSON-LD, noscript

**Files:**
- Modify: `index.html:6-7`, `16-17`, `23-24`, `38`, `48`, `350-380`

- [ ] **Step 1: Titles and descriptions**

Replace every `Yarin Levin — AI-Native Builder` (title, og:title, twitter:title, noscript h1) with `Yarin Levin — AI-native developer`. Replace the JSON-LD `"jobTitle": "AI-Native Builder"` with `"jobTitle": "AI-native developer"`. Replace all four description strings (meta description, og:description, twitter:description, JSON-LD description) with:

```
AI-native developer. I direct Claude Code end-to-end and ship: two live client sites, a Hebrew-RTL study platform, an LLM gateway. Available now for a part-time student position.
```

- [ ] **Step 2: Noscript body**

Replace the first `<p>` under the h1 with:

```html
        <p>AI-native developer. Every build directed end-to-end with Claude Code, from spec to production.
           I write the spec, direct Claude Code through the build, and ship it myself. That is the whole job,
           and I do it for clients and for my own products.
           Since April 2026: two client sites live, one of them paid, a Hebrew-RTL study platform I run my own
           semester in, and an LLM gateway every agent I use goes through.</p>
```

Replace the first CV `<li>` with:

```html
          <li>2026 – — Freelance AI-native developer: Client sites and my own products, every build directed end-to-end with Claude Code.</li>
```

Replace the Sabai, TEEPO and SHADIEZ work `<li>`s with:

```html
          <li><a href="https://thailand-trip-app-phi.vercel.app">Sabai</a> — Offline-first Thailand trip companion. I used it every day of the trip.</li>
          <li><a href="https://bgu-study-organizer.vercel.app">TEEPO</a> — Hebrew-RTL study platform, live all semester with real auth and the real Moodle data.
              Also <a href="https://aerocy-landing.vercel.app">AeroCy</a>, the company’s live bilingual site, shipped in days.</li>
          <li><a href="https://shadiez.vercel.app">SHADIEZ</a> — Paid client landing page for a premium beach-shade brand, in production.
              Also <a href="https://github.com/yarinlevin18-ai/smartcut">SmartCut</a>, a booking CRM designed for a grooming studio: slots, approvals and customer self-service.</li>
```

- [ ] **Step 3: Sweep**

Run: `grep -n -i "builder\|web developer\|real users\|replaced wix" index.html src/*.js src/content/profile.js`
Expected: no output.

- [ ] **Step 4: Full test run**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# pass 48` / `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "copy(html): AI-native developer in title, meta, JSON-LD and the noscript path"
```

### Task 4: Share card

**Files:**
- Replace: `public/og.jpg`

- [ ] **Step 1: Capture** — start the `void-dev` preview, then with Playwright: resize 1200×630, navigate `http://localhost:5173/`, wait 8 s, evaluate:

```js
() => { ['fxpanel','editor'].forEach(k => { const e = document.getElementById(k); if (e) e.style.display='none'; });
  document.querySelectorAll('.sidepanel, #hud, #overlay .hint, #whisper, .cursor-dot, .cursor-ring').forEach(e => e.style.display='none');
  const s = document.createElement('div'); s.textContent = 'AI-native developer';
  s.style.cssText = 'position:fixed;left:0;right:0;top:64%;text-align:center;font-family:var(--f-mono, monospace);font-size:22px;letter-spacing:.5em;text-transform:uppercase;color:#9fe8ff;text-shadow:0 0 18px rgba(79,210,255,.55);z-index:9999;pointer-events:none';
  document.body.appendChild(s); return document.querySelector('#hud')?.textContent?.trim(); }
```

Expected return: `Opening 1 / 11` (still on the opening; the page auto-advances after ~30 s, so screenshot immediately). Screenshot to `og-capture.png` (lands at the repo root), then:

```bash
mv og-capture.png "$TMPDIR/og-capture.png" && python3 -c "
from PIL import Image; im = Image.open('$TMPDIR/og-capture.png').convert('RGB')
im.save('public/og.jpg', quality=82, optimize=True, progressive=True)"
```

- [ ] **Step 2: Check** — Read `public/og.jpg`: wordmark centred, subtitle reads AI-NATIVE DEVELOPER, no cursor ring, no bar, no panels. Size 1200×630, under 60 KB.

- [ ] **Step 3: Commit**

```bash
git add public/og.jpg
git commit -m "share: og card re-captured with the AI-native developer line"
```

### Task 5: Docs, memory, deploy, verify

**Files:**
- Modify: `CLAUDE.md` (the "What this is" paragraph, open-work item 2), `BUILD_PLAN.md` (open-work item 2, new Phase J), memory `v15-launch-holds.md`

- [ ] **Step 1: CLAUDE.md** — in "What this is", `Yarin Levin — AI-Native Builder` → `Yarin Levin — AI-native developer`. Open-work item 2 becomes `2. ~~Confirm the three proof numbers~~ confirmed 2026-09-14 with the wording rework (spec docs/superpowers/specs/2026-09-14-wording-rework-design.md); every claim is checkable and tests/profile.test.js blocks the retired ones.`

- [ ] **Step 2: BUILD_PLAN.md** — same for open-work item 2; add before `## Open work`:

```markdown
## Phase J — Wording rework ✅ (2026-09-14)
Spec: `docs/superpowers/specs/2026-09-14-wording-rework-design.md`. Term is
"AI-native developer" everywhere (title, meta, JSON-LD, og.jpg, bio, CV row).
TEEPO's "real users" and SmartCut's "dropped Wix" claims retired; SmartCut is
"a booking CRM designed for a grooming studio". Counters 17 / 7 / 1 confirmed.
Guard test blocks the retired phrases. Method stop untouched. Tests 47 → 48.
```

- [ ] **Step 3: Memory** — rewrite `~/.claude/projects/-Users-yarin-Projects-the-void/memory/v15-launch-holds.md` body: proof numbers confirmed and wording rework shipped 2026-09-14; only the X handle and the SmartCut redeploy remain. Keep the frontmatter, update `description`. Update its MEMORY.md line to match.

- [ ] **Step 4: Test, commit, push**

```bash
npm test 2>&1 | grep -E "^# (pass|fail)" && git add -A && git commit -m "docs: wording rework shipped; proof numbers confirmed" && git push origin main
```

- [ ] **Step 5: Verify live** — after ~60 s open `https://the-void-khaki-pi.vercel.app/` in the browser pane: tab title reads `Yarin Levin — AI-native developer`; `/og.jpg` shows the new subtitle; fly to Intro and TEEPO and read the new lines; console has no errors. Reset the viewport and stop the dev server.
