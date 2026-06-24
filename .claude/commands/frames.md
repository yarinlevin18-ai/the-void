---
description: Build the real per-section content for The Void, frame by frame, from the approved Higgsfield mockups. Match the live build's dark/minimal look exactly. Start with Frames 1–2.
argument-hint: "[frame, e.g. 'frame 1' | 'frame 2' | 'frames 1-2']"
---

You are continuing **"The Void"** (Yarin's 3D scroll portfolio). Build the **content** for each
section beat into the real app. The look is APPROVED via mockups — match it, don't redesign.

## 0. Load context first (always)
- `CLAUDE.md`, `PRD.md`, `BUILD_PLAN.md`, `BACKGROUND.md`, `ENVIRONMENT.md`.
- Then read `src/main.js` — the v0.7 build with the section system, BEATS, panels, and the
  per-section FX editor. You're placing content INTO existing section beats.

## 1. House style (match the live build — non-negotiable)
- Very dark near-black void; nebula only faint at the **edges/corners**; vast black negative space;
  content is the focal point. Restrained, cinematic (Noomo principle: one focal point per beat).
- Type: **Ogg** (display serif headlines), **Acumin Pro** (body/sub-lines), **Source Code Pro**
  (mono labels/counters). Palette per `BACKGROUND.md` (teal/violet/cyan accents).
- **No "CH.0x" kicker.** Chapter identity shows only on the **left vertical dot-rail** (active dot
  + label) and the **bottom counter** `LABEL  n / 7`.
- Glass is our signature material (per Noomo) — floating content uses translucent dark-glass
  panels/fragments with thin cyan accent edges + faint bloom, reusing the look of our approved
  liquid-glass work. Keep depth (parallax + soft depth-blur).
- Vanilla JS + Vite + Three.js, no React. The FX editor / Director Mode must NOT ship in prod.

## 2. FRAME 1 — Opening  (mostly done; polish to match)
- Centered very large **Ogg** wordmark **"Yarin Levin"**, white, subtle glow.
- Beneath: thin **mono** tagline `I BUILD LANDING PAGES & SAAS INTERFACES` (muted).
- Bottom center: faint mono cue `SCROLL TO FLY`; bottom-left counter `OPENING  1 / 7`.
- Left dot-rail with the active dot labelled `OPENING`. No kicker. Lots of black, nebula barely there.

## 3. FRAME 2 — Hero  (the change: remove the big empty panel)
- **Delete the large dark content box/panel.** This beat is a statement floating in the void with a
  few product fragments orbiting it.
- Headline (left-of-center, **Ogg**, multi-line, humble): **"From knowing nothing about coding and design."**
- Quiet sub-line beneath (**Acumin Pro**, muted grey-blue, small): **"Self-taught — everything here, I built."**
  (Make it easy to toggle off — Yarin may want the single sentence alone.)
- **3 floating frosted dark-glass UI fragments** drifting around the text at different depths with
  parallax + soft depth-blur, thin cyan edges, faint glow:
  (a) a mini **SaaS dashboard** with a tiny glowing line chart,
  (b) a **landing-page hero** card,
  (c) a small **UI component** (toggle/button).
  Link one or two to the text with a thin faint line. They drift gently (idle motion), parallax to
  cursor/scroll — they are placeholders for real project thumbnails later.
- Left dot-rail active dot `HERO`; bottom counter `HERO  2 / 7`. No kicker.

## 4. How to work
- Do exactly `$ARGUMENTS` (default: frames 1–2). Keep it runnable after each frame (`npm run dev`).
- Reuse existing section/beat plumbing in `src/main.js`; don't rebuild the camera/path or the editor.
- Float assets as lightweight glass planes (canvas/texture or simple shader) — keep 60fps,
  `pixelRatio ≤ 1.75`; add a `prefers-reduced-motion` path (assets static, no drift).
- After each frame: list what changed + how to verify (hard-refresh if HMR is flaky), then stop for
  review before the next frame. Don't invent project copy beyond the placeholders above — real
  project content (Frames 3–6) comes later from Yarin (Phase A).

Task: **$ARGUMENTS**
