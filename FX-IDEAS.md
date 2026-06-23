# FX-IDEAS.md — explored atmosphere / centerpiece demos (catalog)

Standalone HTML demos we built while exploring the look. Open any in a browser.
Each is self-contained (Three.js + bloom via CDN). Status notes what we keep.

| Demo file | What it is | Status |
|---|---|---|
| `demo-living-void.html` | Drifting nodes + energy lines + animated **nebula** + bloom | ✅ adopted → `BACKGROUND.md` |
| `demo-atmosphere.html` | **Curl-noise flow currents** + pulsing core + color world | partial (core rejected; flow currents = keep) |
| `demo-worm.html` | Codrops "infinite tube" **color worm** you fly through/around | parked |
| `demo-wave.html` | **Neon electric wave corridor** (synthwave grid, fly between two waves) | ⭐ SAVED FOR FUTURE — liked the neon-wave look, not as a full corridor |
| `demo-asset-reveal.html` | One project beat: media plane + DOM text + GSAP reveal | ✅ pattern for content |
| `demo-effects.html` | Reveal/cursor/transition style playground | ✅ vocabulary |

## Current direction (this session)
A **single moving neon wave ribbon** that warps and drifts *within a section*
(not a full-screen corridor) — a living band of neon energy that moves around the
content. See `demo-wave-ribbon.html`. If adopted, fold into `BACKGROUND.md` /
`ENVIRONMENT.md` and wire via `/fx`.

## Rejected
- Flat glowing-sprite "core" (too simple).

## ✅ APPROVED — Neon wave ribbon (liquid-glass / holographic chrome)
- File: `demo-wave-ribbon.html` (locked snapshot: `demo-wave-ribbon.APPROVED.html`)
- Look: single-sided additive chrome band — analytic surface normals, fresnel rim,
  thin-film iridescence, sweeping specular glint. Neon wireframe grid optional (off by default).
- Blends into the void: feathered edges+ends, palette tied to nebula, calm drift, bloom 1.1/0.7.
- Next: fold into BACKGROUND.md once the nebula it sits in is locked.
