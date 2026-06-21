# BUILD PLAN — "The Void" Portfolio

> Execution plan derived from `PRD.md`. Grounded in the **actual current build**
> (not greenfield). Action-first, gated: do one phase, QA, report, advance.
> Checkboxes are the tasks. Follow `DESIGN_WORKFLOW.md` for all motion.
> Last updated: 2026-06-21

---

## Current state (audited from code, 2026-06-21)
`src/main.js` ≈ 1,130 lines — **v0.7 "Director Mode."** Already working:
- ✅ Vite + Three.js scaffold (`package.json`, `index.html`, `src/`).
- ✅ The void: 4,500-point drifting data field, fog, cyan/white palette.
- ✅ PLAY mode: scroll / arrow keys snap between sections.
- ✅ 6-beat path + HUD (beat name + progress), Hero overlay.
- ✅ EDIT mode ("Director Mode", **E**): free-fly, add/delete/reorder sections,
  capture cam from view, numeric fields, undo/redo, save/reset, copy config,
  per-section thumbnails. Edits persist in localStorage.
- ✅ `visit live` button + free-roam button hooks exist in DOM.

**So PRD Phases 2–4 are effectively DONE.** Remaining real work is **content,
brand reactivity, polish, accessibility, and ship.** This plan starts there.

---

## Phase A — Lock content & decisions  (no code; unblocks everything)
- [ ] Confirm the **4 featured projects** + order (PRD §6). Decide #4: **AeroCy vs Mentorship**.
- [ ] For each project gather: title · 1–2 line role/impact line · stack tags · **live URL** · brand color(s).
- [ ] Decide preview format per project: **static screenshot vs short looping capture** (PRD open Q).
- [ ] Capture assets: clean screenshot/loop per project → `public/previews/` (compressed).
- [ ] Confirm hero line + contact CTA copy (email / link targets).
- [ ] Confirm final beat: its own "structure" vs hard stop.
- **Exit:** a filled content table + assets on disk, ready to wire in.

## Phase B — Content placement  (PRD Phase 5)
- [ ] Define a single `PROJECTS` data array (title, desc, tags, url, color, previewSrc, beatId).
- [ ] Bind each featured project to its path beat (reuse Director Mode beats).
- [ ] Render the **in-world structure** per project (panel/frame that resolves on approach).
- [ ] Wire **live preview** (image/loop) onto the structure, lazy-loaded.
- [ ] Wire the existing `#visitlive` button to the focused project's URL.
- [ ] Build the **"My Projects" hub** beat: compact list/grid of the full body of work (incl. labs, Worldiez).
- [ ] Build the **contact** beat: CTA + email/links, reachable by keyboard.
- **Exit:** all 6 beats show real content; every project opens its live site.

## Phase C — Brand reactivity & motion polish  (PRD Phase 6, part 1)
- [ ] **Adaptive palette:** lerp void point/line colors to the focused project's brand on approach; fade to neutral on departure.
- [ ] Apply **reveal recipes** to panel content (headline y+16–24 / opacity 0→100; image scale 0.96→1 blur 8→0; CTA outline→filled) — per `DESIGN_WORKFLOW` Step 5.
- [ ] Tune **timing & easing** (custom curves over linear); one focal point per beat, limit concurrency.
- [ ] Rhythm change at beats 5–6 (path tilts up, Projects 3 & 4 flank) feels deliberate.
- [ ] Optional: connecting **lines** between nearby points for the "network/CRM" read.
- **Exit:** approaching a project feels cinematic and on-brand; read order is correct.

## Phase D — Sound  (PRD Phase 6, part 2)
- [ ] Low ambient hum + soft whoosh on approach; **muted by default**, visible toggle (no autoplay).
- [ ] Persist mute choice; ensure no console/autoplay errors.
- **Exit:** sound deepens the dive, never annoys, never blocks.

## Phase E — Accessibility & fallback  (REQUIRED — PRD §5.4)
- [ ] `prefers-reduced-motion` → static, scrollable version with the **same content** (projects + contact).
- [ ] Mobile / low-GPU path: reduce particle count, or a **flat 2D fallback** that still shows all projects + contact.
- [ ] Keyboard reachable: advance, focus a project, open live link, hit contact.
- [ ] Contrast pass on every panel; readable type sizes.
- [ ] Hide/disable Director Mode (`E`) and editor UI in production build.
- **Exit:** verified on a phone + a reduced-motion desktop; nothing is unreachable.

## Phase F — Performance pass
- [ ] Set a hard payload ceiling; lazy-load previews; compress assets.
- [ ] Cap particle count / pixel ratio for 60fps on a mid laptop.
- [ ] Quick profile (frame time) on the slowest target device available.
- **Exit:** smooth on mid hardware; payload under ceiling.

## Phase G — Ship & showcase  (PRD Phase 7)
- [ ] Production build (`npm run build`); strip dev/editor affordances.
- [ ] Deploy to Vercel/Netlify/Cloudflare Pages; push-to-deploy wired.
- [ ] Custom domain + HTTPS; basic `<title>`/meta/OG for link previews.
- [ ] Record a **30–60s capture** for CV / LinkedIn / Dribbble (per workflow Step 7).
- [ ] Put the live URL on CV + LinkedIn + the agency outreach email.
- **Exit:** PRD §10 Definition of Done met.

---

## Run order & gating
A → B → C → D → E → F → G. Each phase ends runnable; don't advance until it
*feels* right (QA the checklist). **E (accessibility) and F (performance) are not
optional and not "later" — they gate ship.**

## Risks / watch-items
- **Scope creep** from Director Mode — it's a great authoring tool; don't keep gold-plating it instead of shipping content.
- **Mobile** is the biggest risk for a 3D site — prototype the fallback early (don't leave it to the end).
- **Asset weight** — previews can blow the payload; compress and lazy-load from the start.
- **Editor in prod** — make sure `E`/director UI can't be opened by visitors.

## First action when we resume
Phase A, item 1: lock the 4 featured projects (decide AeroCy vs Mentorship for #4),
then fill the content table. That single decision unblocks Phases B–C.
