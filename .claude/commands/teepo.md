---
description: Build the TEEPO project beat (Project 1) — mount the two live TEEPO HTML assets on the section's screen/panel, cross-fading between them, with the TEEPO write-up. Use the provided assets; do not invent copy.
argument-hint: "[optional: 'layout only' | 'with crossfade']"
---

You are continuing **"The Void"** (Yarin's 3D scroll portfolio). Build the **TEEPO** project beat
(the Project 1 section that already exists in `src/main.js`). Look + content APPROVED.

## 0. Load first
- `CLAUDE.md`, `BACKGROUND.md`, then `src/main.js` (the Project 1 beat + how its panel renders).
- House style: dark void, Ogg headline / Acumin body / Source Code Pro mono, cyan accents, no kicker,
  left dot-rail + bottom counter. Vanilla JS + Three.js, no React.

## 1. The text (verbatim — do not change)
- Headline (**Ogg**): **TEEPO**
- Body (**Acumin Pro**): "TEEPO unifies Moodle, the campus portal, Google Calendar, and an AI study
  assistant into one Hebrew, right-to-left platform for Israeli university students. Built end to end —
  Next.js front end, Flask + Claude agents on the back — so everything a student needs lives in one
  place, and the AI 'brain' remembers the rest."
- Mono micro-label: `NEXT.JS · FLASK · CLAUDE AGENTS · SUPABASE`
- Left dot-rail active `TEEPO`; bottom counter `TEEPO  4 / 7` (match the live numbering).

## 2. The REAL assets (in the repo)
The section's screen/panel shows TEEPO's actual product, as two live, self-animating, transparent
HTML assets:
- `public/assets/teepo/teepo-brain.html`     — the "second brain" Drive view
- `public/assets/teepo/teepo-dashboard.html` — the weekly study dashboard
Both already animate themselves and have transparent backgrounds. Do NOT regenerate or restyle them.

## 3. How to render on the panel
Display each HTML asset on the Project 1 screen as a **live iframe via `CSS3DRenderer`**
(three/addons/renderers/CSS3DRenderer.js), positioned/sized to match the panel in 3D and synced to the
same camera. **LOCKED: CSS3DRenderer is THE method — do not substitute a static image/canvas.** Use the
SAME shared CSS3D layer set up for the Hero (`/frame2`) so there is one CSS3D pass for the whole site.
The ONLY exception is the `prefers-reduced-motion` / low-GPU path (below).

## 4. Cross-fade between the two views
The panel cycles **teepo-brain → teepo-dashboard → back**, cross-fading every ~6s (opacity tween on the
two CSS3D layers, or swap the texture with a fade). Add a tiny mono caption under the panel that updates
with the active view: `SECOND BRAIN` / `WEEKLY DASHBOARD`. Pause cycling when the beat isn't active.

## 5. Animate / behave
- Entrance: headline rises from clip-mask, body fades; the panel scales/fades in.
- Idle: gentle panel parallax to cursor/scroll; the HTML content animates on its own.
- `prefers-reduced-motion` / low-GPU: no cross-fade cycling (show `teepo-brain` only), static panel,
  swap live iframes for a single static frame.

## 6. Rules
- Keep runnable (`npm run dev`); 60fps, `pixelRatio ≤ 1.75`; FX editor / Director Mode out of prod.
- `layout only` → place the text + one static panel and stop. Else include the crossfade + animation.
- After building: list changes + how to verify (hard-refresh if HMR flaky), then stop for review.
  Don't touch other frames.

Task: **$ARGUMENTS**
