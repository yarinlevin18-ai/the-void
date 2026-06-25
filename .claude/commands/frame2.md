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

## 3b. Screen design treatment (APPROVED — apply to BOTH screens)
1. **Focus rule (the big one):** only ONE screen is "awake" at a time — full color, nearest (largest
   Z toward camera), slightly larger scale. The other sits **dimmed + desaturated + pushed back**. At
   rest BOTH are slightly muted so the **headline leads**. Focus **shifts on scroll / camera approach**
   (this is the locked dim→brand-color plan): the focused screen lerps to full saturation + brightness
   + forward Z; the other lerps back to muted. Drive it with one `focus` value per screen (0→1).
   Implementation: desaturate via a grayscale/′saturation′ on the CSS3D iframe (CSS `filter:
   saturate() brightness()`) and on the Shadiez plane (material color/again a saturation factor).
2. **Liquid-glass pane OVER the whole screen (not a border ring).** Source of truth for exact CSS:
   **`demo-hero-screens.html`** (repo root) — port its `.glass` overlay 1:1. The glass is a layer laid
   on top of each screen's content (same rounded radius ~22px), giving: a bright **edge-refraction rim**
   hugging all sides, **convex shading** (inset top highlight + bottom shadow), a **top gloss + dome
   highlight**, a faint **caustic tint** in one corner, and a blurred **specular streak that sweeps
   diagonally across the surface** on a loop. The screen UI stays readable underneath. Apply identically
   to BOTH the Shadiez PNG plane and the SmartCut iframe (wrap the iframe in the same framed container;
   the glass `.glass` div sits above it). Do NOT rely on `backdrop-filter` over the opaque screen — it
   does nothing there; the glass is built from overlay gradients + inset shadows + the moving streak.
   On **focus** the glass "wets": brighter rim, stronger glow, and the specular sweep speeds up.
3. **3D tilt + depth:** rotate each a few degrees toward the viewer (small X/Y tilt) and **stagger
   their Z** so they float and parallax instead of lying flat. The focused one tilts closer to
   face-on; the unfocused one stays more raked.
4. **Tiny mono caption under each** (Source Code Pro, muted, letter-spaced): `SHADIEZ · LANDING PAGE`
   and `SMARTCUT · BOOKING CRM`. Caption brightens with its screen's focus.

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
