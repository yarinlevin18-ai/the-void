---
description: Build The Void's Frame 2 (HERO) as ONE animatable group — the statement text + the real project assets (Shadiez + SmartCut) floating around it, parented together so they drift/parallax/reveal as a unit. Use the provided assets; do not invent copy or art.
argument-hint: "[optional: 'layout only' | 'with entrance animation']"
---

You are continuing **"The Void"** (Yarin's 3D scroll portfolio). Build **Frame 2 — HERO** into
`src/main.js`. Look + content are APPROVED. Remove the old empty content panel on this beat.
Do NOT use the old placeholder art (dashboard.png / landing-card.png / component.png) — it is dead.

## 0. Load first
- `CLAUDE.md`, `BACKGROUND.md`, then `src/main.js` (section/beat system + how panels currently render).
- House style: very dark void, nebula faint at edges, Ogg headline / Acumin sub / Source Code Pro mono,
  cyan accents, NO "CH.0x" kicker, left dot-rail + bottom counter. Vanilla JS + Three.js, no React.

## 1. The content (verbatim)
- Headline (**Ogg**, left-of-center, multi-line): **"From knowing nothing about coding and design."**
- Sub-line (**Acumin Pro**, small, muted, toggleable): **"Self-taught — everything here, I built."**
- Left dot-rail active `HERO`; bottom counter `HERO  2 / 7`.

## 2. The REAL assets (in the repo — use exactly these)
Two floating "project screens" (these are the proof for the headline):
- **Shadiez** — `public/assets/hero/shadiez-landing.png`  (a real screenshot → textured plane)
- **SmartCut** — `public/assets/hero/smartcut-crm.html`   (a live, self-animating transparent HTML asset)
TEEPO is NOT here — it lives in its own Project section.
**LOCKED: exactly TWO assets in the Hero. Do not add a third.**

## 3. How to render each asset on a floating glass "screen"
Each asset sits in a frosted-glass frame (thin cyan edge + faint bloom), tilted slightly, at depth.
- **Shadiez (PNG):** standard `TextureLoader` plane inside the glass frame.
- **SmartCut (HTML):** render it as a **live iframe via `CSS3DRenderer`**
  (three/addons/renderers/CSS3DRenderer.js), positioned to match the glass frame in 3D and synced to
  the same camera. **LOCKED: CSS3DRenderer is THE method — do not substitute a static image/canvas.**
  Set up a single CSS3D layer shared with the TEEPO panel. The ONLY exception is the
  `prefers-reduced-motion` / low-GPU path (see below), which may swap to a static frame.

## 4. GROUP + animate (the point of the task)
Parent the text + both screens under one `THREE.Group` **`heroCluster`**. Suggested local layout
(origin = headline anchor; tune to live framing, keep generous black negative space):

| child            | position (x, y, z)   | scale | note |
|------------------|----------------------|-------|------|
| text (headline+sub) | (-0.34, 0.00, 0.0) | —   | left, focal point |
| shadiez (PNG)    | ( 0.34,  0.20, -0.10) | 1.0 | upper-right |
| smartcut (HTML)  | ( 0.30, -0.22,  0.12) | 0.95| lower-right, slightly forward |

Thin faint cyan line from the text to the nearest screen. Each screen: dim/desaturated at rest →
warms to its brand color on approach (Shadiez warm-orange, SmartCut gold) — the adaptive recolor.
- **Entrance:** headline rises from a clip-mask, sub-line fades; the two screens fade + drift to place,
  staggered (~90ms).
- **Idle:** each screen drifts on its own slow Lissajous path + a few degrees rotation; whole
  `heroCluster` parallaxes to cursor + scroll. Text stays the calm anchor.
- **prefers-reduced-motion / low-GPU:** screens static at position, no drift/parallax; for SmartCut use
  a static frame instead of the live iframe.

## 5. Rules
- Keep runnable (`npm run dev`); 60fps, `pixelRatio ≤ 1.75`; FX editor / Director Mode out of prod.
- `layout only` → place + group statically and stop. Else include entrance + idle.
- After building: list changes + how to verify (hard-refresh if HMR flaky), then stop for review.

Task: **$ARGUMENTS**
