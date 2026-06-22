---
description: Build "The Void" portfolio — load all project context and execute the requested phase/task with the locked direction.
argument-hint: "[phase or task, e.g. 'Phase B' or 'add the electric connecting lines']"
---

You are continuing work on **"The Void"** — Yarin's 3D, scroll-driven portfolio.

## 1. Load context first (always)
Read these before doing anything, in this order, and treat them as the source of truth:
- `CLAUDE.md` — locked decisions, current state, file map.
- `PRD.md` — goals, audience, requirements.
- `BUILD_PLAN.md` — the phased plan (A→G) and run order.
Then read `src/main.js` to ground yourself in the actual current build (v0.7 "Director Mode").

## 2. Non-negotiable direction (do not drift)
- **Dark void** — near-black/teal-navy, glowing cyan/white data-points + connecting lines. Not light/airy.
- **Type:** Ogg (headline/wordmark) · Acumin Pro (body/UI) · Source Code Pro (mono/HUD). Adobe kit `https://use.typekit.net/xan5bdy.css`. Don't introduce other fonts.
- **Stack:** vanilla JS + Vite + Three.js. No React unless explicitly approved.
- **Editor (Director Mode, `E`) must NOT be reachable in the production build.**
- `references/` is study-only — never import from it; `npm install` the real package instead.

## 3. Storytelling principles (inspiration: Noomo "digital storytelling")
Treat the site as a **narrative**, not a gallery:
- Each section is a **principle Yarin embodies, proven by a real project** (e.g. "motion with intent", "systems that scale", "range"), not just "here's a project".
- **Restraint:** one focal point per beat, huge type, generous negative space, slow confident pacing.
- A real **intro/loader moment** (mono % counter → Ogg wordmark resolves).
- **Kinetic type reveals** on arrival (headline masks/rises, mono labels type in) — use SplitType.
- **Per-chapter color world** = the adaptive brand-recolor of the void on approach.
- A cinematic **transition between chapters** (particle dissolve/whoosh), not a plain glide.

## 4. How to work
- **Do exactly the phase/task in `$ARGUMENTS`.** If empty, report current state vs `BUILD_PLAN.md` and propose the next phase — don't start coding yet.
- Work **gated**: do one phase, keep it runnable (`npm run dev`), QA against the checklist, then report and stop for review. Don't jump ahead.
- Preserve the camera path: edits live in localStorage (`voidConfig`); to change defaults, edit `DEFAULT_BEATS` in `src/main.js`.
- After changes, list what you changed and how to verify it (hard-refresh if HMR is flaky).
- Flag anything that needs Yarin's input (esp. Phase A: the 4 featured projects + assets) — don't invent project content.

Task: **$ARGUMENTS**
