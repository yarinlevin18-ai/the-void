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

## 2. FRAME 1 — Opening  (APPROVED — particle name formed from the void itself)
**Source of truth: `demo-opening.html` (repo root). Port its behaviour + tuned values 1:1.**
Build this from the **real atmosphere points** — do NOT spawn a separate particle system.

- **The name IS the void's matter.** Take a subset (~5,000) of the existing star/data-point field
  and give each a **target position** sampled from the Ogg glyphs of **"Yarin Levin"** (render the
  text to an offscreen canvas, sample filled pixels, map to world space — see the demo's `buildText`).
- **Form-in:** on entry, blend each chosen point from its drift position → its glyph target with one
  eased factor (`uForm` 0→1, ~2.6s, easeOutCubic). The **glow is free**: keep the existing additive
  points + UnrealBloom, **bloom threshold ~0.22**, strength tuned so the letters read (NOT blown out —
  the demo uses small dim slightly-cyan points, bloom strength ~0.55). Letters must stay legible.
- **Whisper line:** below the name, type out **"welcome to my world."** in **Source Code Pro** (muted),
  the trailing **period blinks** like a prompt. Then fade in the `SCROLL TO FLY` cue.
- **Idle = cursor shatter (the only mouse effect):** points near the cursor get gently pushed aside and
  spring back to their letter position. Tuned: radius ≈ cursor-size, gentle/slow, low jelly
  (demo: `R≈5, push≈1.7, spring≈0.028, damp≈0.9`). **No camera parallax, no nebula mouse-follow.**
- **Exit (hand-off to the flight):** on first scroll, release the points — burst outward + stream past
  the camera while fading — and continue straight into the BEATS flight to Frame 2. (In the demo it
  loops; in the real site it hands off to the camera flight instead of resetting.)
- Left dot-rail active dot `OPENING`; bottom counter `OPENING  1 / 7`. No kicker. Vast black space.
- **prefers-reduced-motion / low-GPU:** show the name already formed (no form-in, no shatter); exit is
  a simple fade, not a burst.

## 3. FRAME 2 — Hero  →  built by the dedicated **`/frame2`** command
Do NOT build the Hero from here — it has its own canonical spec with the **real** assets
(Shadiez + SmartCut, grouped + CSS3DRenderer). Use `/frame2`. (The earlier placeholder fragments —
dashboard.png / landing-card.png / component.png — are dead; ignore them.)

## 4. How to work
- Do exactly `$ARGUMENTS` (default: frames 1–2). Keep it runnable after each frame (`npm run dev`).
- Reuse existing section/beat plumbing in `src/main.js`; don't rebuild the camera/path or the editor.
- Float assets as lightweight glass planes (canvas/texture or simple shader) — keep 60fps,
  `pixelRatio ≤ 1.75`; add a `prefers-reduced-motion` path (assets static, no drift).
- After each frame: list what changed + how to verify (hard-refresh if HMR is flaky), then stop for
  review before the next frame. Don't invent project copy beyond the placeholders above — real
  project content (Frames 3–6) comes later from Yarin (Phase A).

Task: **$ARGUMENTS**
