// lab.js — the easing behind every reveal on this site, as code a visitor can play
// with on the Timeline stop (2026-09-29). Pure and node-tested; labcard.js shows the
// source between the region markers verbatim, so what's on screen is what runs.

// #region cubicBezier
export function cubicBezier(x1, y1, x2, y2) {
  const at = (a, b, t) => 3*a*t*(1-t)**2
    + 3*b*t*t*(1-t) + t**3;
  const slope = (a, b, t) => 3*a*(1-t)**2
    + 6*(b-a)*t*(1-t) + 3*(1-b)*t*t;
  return (x) => {
    if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
    let t = x;                    // Newton
    for (let i = 0; i < 6; i++) {
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t -= (at(x1, x2, t) - x) / d;
    }
    if (!(t >= 0 && t <= 1)
      || Math.abs(at(x1, x2, t) - x) > 1e-5) {
      let lo = 0, hi = 1;         // bisection
      for (let i = 0; i < 30; i++) {
        t = (lo + hi) / 2;
        if (at(x1, x2, t) < x) lo = t; else hi = t;
      }
    }
    return at(y1, y2, t);
  };
}
// #endregion

// The presets the card offers. `site` is --ease-out in style.css.
export const PRESETS = {
  site: [0.22, 1, 0.36, 1],
  linear: [0, 0, 1, 1],
  overshoot: [0.34, 1.35, 0.6, 1.3],
  snap: [0.9, 0, 0.1, 1],
};

// Clamp a dragged handle: x stays in 0..1 (the curve must stay a function of time),
// y may overshoot — that's the fun part.
export const clampHandle = (x, y) => [Math.min(1, Math.max(0, x)), Math.min(1.35, Math.max(-0.35, y))];

export const fmt = (v) => (Math.round(v * 100) / 100).toFixed(2);
