---
description: Build The Void's Frame 2 (HERO) as ONE animatable group — the statement text + 3 floating glass UI assets parented together so they can drift, parallax, and reveal as a unit. Use the provided assets; do not invent copy or extra elements.
argument-hint: "[optional: 'layout only' | 'with entrance animation']"
---

You are continuing **"The Void"** (Yarin's 3D scroll portfolio). Build **Frame 2 — HERO** into
`src/main.js`. The look + content are APPROVED. Do NOT make anything up: use the exact text and the
exact assets below. Remove the old empty content panel on this beat.

## 0. Load first
- `CLAUDE.md`, `BACKGROUND.md`, then `src/main.js` (the section/beat system you're placing into).
- House style: very dark void, nebula faint at edges, Ogg headlines / Acumin sub-text / Source Code
  Pro mono, cyan accents, no "CH.0x" kicker, left dot-rail + bottom counter. Vanilla JS + Three.js.

## 1. Assets (already generated — placed by Yarin)
Load these as textured planes (PNG, alpha):
- `public/assets/hero/dashboard.png`      — mini SaaS dashboard glass card
- `public/assets/hero/landing-card.png`   — landing-page hero glass card
- `public/assets/hero/component.png`      — UI component cluster glass card
If a PNG isn't transparent, key out its dark background or use `transparent:true` with an alpha map.
Do NOT generate or substitute other art.

## 2. The content (verbatim — do not change)
- Headline (**Ogg**, multi-line, left-of-center): **"From knowing nothing about coding and design."**
- Sub-line (**Acumin Pro**, small, muted grey-blue, directly beneath; make it toggleable):
  **"Self-taught — everything here, I built."**
- Left dot-rail active dot label `HERO`; bottom counter `HERO  2 / 7`. No kicker.

## 3. GROUP them (this is the point of the task)
Create a single parent `THREE.Group` named **`heroCluster`** that contains BOTH the text and the 3
asset planes, so all animation is applied to the group (and each child can also have its own subtle
local motion). Suggested local layout (origin = the headline anchor; units are scene-relative —
tune to match the live framing, keep generous negative space):

| child            | position (x, y, z) | scale | note |
|------------------|--------------------|-------|------|
| text (headline+sub) | (-0.30, 0.00, 0.0) | —   | left-of-center, the focal point |
| dashboard.png    | ( 0.42,  0.22, -0.15) | 1.0 | upper-right, slightly back |
| landing-card.png | ( 0.30, -0.20,  0.10) | 0.9 | lower-right, slightly forward |
| component.png    | ( 0.55, -0.02, -0.30) | 0.7 | far-right, furthest back (smallest) |

Add one or two thin faint cyan lines linking the text to the nearest asset(s). Billboard the planes
softly toward camera (or keep a small fixed tilt) so they read as floating glass.

## 4. Animation (the reason it's grouped)
- **Entrance (on this beat becoming active):** headline rises out of a clip-mask, sub-line fades in
  after; the 3 assets fade in + drift to their positions, staggered (~80ms apart). Use the project's
  existing easing.
- **Idle:** each asset drifts on its own slow Lissajous path (small amplitude) + a few degrees of
  rotation; the **whole `heroCluster` parallaxes** to cursor and to scroll progress (a few degrees /
  small offset). The text stays the calm anchor (minimal motion).
- **Exit:** cluster eases back / fades as the camera leaves the beat.
- **`prefers-reduced-motion` / low-GPU:** assets static at their positions, no drift/parallax.

## 5. Work rules
- Keep it runnable (`npm run dev`); 60fps, `pixelRatio ≤ 1.75`. The FX editor / Director Mode stays
  out of production.
- If `$ARGUMENTS` is "layout only", place + group the text and assets statically and stop. Otherwise
  include the entrance + idle animation.
- After building: report what changed and how to verify (hard-refresh if HMR is flaky), then stop for
  review. Don't touch other frames.

Task: **$ARGUMENTS**
