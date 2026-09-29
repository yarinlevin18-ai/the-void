# FX-IDEAS.md — explored atmosphere / centerpiece demos (catalog)

Standalone HTML demos we built while exploring the look. Open any in a browser.
Each is self-contained (Three.js + bloom via CDN). Status notes what we keep.

| Demo file | What it is | Status |
|---|---|---|
| `sketches/demo-living-void.html` | Drifting nodes + energy lines + animated **nebula** + bloom | ✅ adopted → `BACKGROUND.md` |
| `sketches/demo-atmosphere.html` | **Curl-noise flow currents** + pulsing core + color world | partial (core rejected; flow currents = keep) |
| `sketches/demo-worm.html` | Codrops "infinite tube" **color worm** you fly through/around | parked |
| `sketches/demo-wave.html` | **Neon electric wave corridor** (synthwave grid, fly between two waves) | ⭐ SAVED FOR FUTURE — liked the neon-wave look, not as a full corridor |
| `sketches/demo-asset-reveal.html` | One project beat: media plane + DOM text + GSAP reveal | ✅ pattern for content |
| `sketches/demo-effects.html` | Reveal/cursor/transition style playground | ✅ vocabulary |

## Current direction (this session)
A **single moving neon wave ribbon** that warps and drifts *within a section*
(not a full-screen corridor) — a living band of neon energy that moves around the
content. See `sketches/demo-wave-ribbon.html`. If adopted, fold into `BACKGROUND.md` /
`ENVIRONMENT.md` and wire via `/fx`.

## Rejected
- Flat glowing-sprite "core" (too simple).

## ✅ APPROVED — Neon wave ribbon (liquid-glass / holographic chrome)
- File: `sketches/demo-wave-ribbon.html` (locked snapshot: `sketches/demo-wave-ribbon.APPROVED.html`)
- Look: single-sided additive chrome band — analytic surface normals, fresnel rim,
  thin-film iridescence, sweeping specular glint. Neon wireframe grid optional (off by default).
- Blends into the void: feathered edges+ends, palette tied to nebula, calm drift, bloom 1.1/0.7.
- Next: fold into BACKGROUND.md once the nebula it sits in is locked.
