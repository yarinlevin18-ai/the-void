// workflow.js — How I Build's motion graphic (2026-10-14, Yarin: "a motion graphic animation for
// this section … illustrating my workflow and how I think"; it replaced the build-log strip).
// One real feature from this site — the name set in the void, built the same day — goes round
// the loop in 16 s: a spec whose decisions lock before any code, small chunks Claude Code types
// while Yarin directs, a review that passes two chunks and sends one back (the real note: the
// letters read soft, so the bloom lifts), the test suite (its real count) and the push, and the
// lab the build leaves behind, which the next spec starts from. Pure: drawWorkflow(ctx, w, h, t,
// opts) paints one frame for any time, at the canvas's device pixels, so it stays sharp at any
// size. Two layouts: the stage (aspect ≤ 2.4, desktop) and a five-step rail (phones, short screens).

export const LOOP = 16;
export const STILL = 14.6;                                  // reduced motion: the loop closed, everything on screen
export const SCENES = [
  { id: 'spec', label: 'Spec', at: 0, cap: 'Spec first. Decisions locked.' },
  { id: 'build', label: 'Build', at: 3.4, cap: 'Claude Code types. I direct.' },
  { id: 'review', label: 'Review', at: 7.2, cap: 'Every chunk reviewed. Some go back.' },
  { id: 'ship', label: 'Ship', at: 10.0, cap: 'Tested, then shipped.' },
  { id: 'lab', label: 'Lab', at: 12.6, cap: 'Each build leaves a lab for the next.' },
];
const END = 15.2;                                           // the loop holds, then fades into its own start
export const sceneAt = (t) => { let i = 0; for (let k = 0; k < SCENES.length; k++) if (t >= SCENES[k].at) i = k; return i; };
const sceneEnd = (i) => (i + 1 < SCENES.length ? SCENES[i + 1].at : END);

// the spec of the feature that goes round (src/name3d.js, 2026-10-14)
export const SPEC = [
  ['Goal', 'The name lives in the void', 'goal'],
  ['Decided', 'Glyph planes, not DOM text', 'lock'],
  ['Decided', 'Parts by camera position', 'lock'],
  ['Decided', 'Reduced motion: a fade', 'lock'],
  ['Out', 'Particles', 'out'],
];
export const CHUNKS = [
  { name: 'Measure glyphs', code: ['r = range.getClientRects()[0];', 'g.ox = (mx - W / 2) * wpp;'] },
  { name: 'Planes in scene', code: ['m.position.copy(frame.pos)', '  .addScaledVector(ff, D);'] },
  { name: 'Part on fly-by', code: ['p = partAt(s);  // 16 → 72', 'mat.opacity = a * (1 - p);'] },
];
export const REVIEW = { back: 1, note: 'Soft letters → lift bloom', fix: 'bloom.threshold = .94;' };
// review verdicts: [chunk, time, ok]
const VERDICTS = [[0, 7.6, true], [1, 8.1, false], [1, 9.1, true], [2, 9.45, true]];
export const LAB = ['ease-out curve', 'random entrances', 'glass pill'];

// chunk i's state at time t: queued → typing → typed → back (sent back) → retyping → ok
export function chunkAt(t, i) {
  const start = 4.0 + i * 1.0;
  let s = t < 3.7 + i * 0.15 ? 'hidden' : t < start ? 'queued' : t < start + 0.9 ? 'typing' : 'typed';
  for (const [c, at, ok] of VERDICTS) if (c === i && t >= at) s = ok ? 'ok' : 'back';
  if (i === REVIEW.back && s === 'back' && t >= 8.5) s = 'retyping';
  return s;
}

const C = {
  bg0: '#08111c', bg1: '#050b13', line: 'rgba(79,210,255,.28)', cyan: '#4fd2ff', ink: '#eaf4ff', body: '#d6e8f7',
  dim: '#9fc2e0', faint: 'rgba(159,194,224,.42)', ghost: 'rgba(159,194,224,.14)', green: '#3fc978', amber: '#eab04e',
  card: 'rgba(10,20,32,.92)', card2: 'rgba(14,27,42,.95)', term: 'rgba(4,9,15,.96)',
};
const DISPLAY = '"Bricolage", "Helvetica Neue", Arial, sans-serif';
const BODY = '"Schibsted", "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const k = (t, a, b) => clamp01((t - a) / (b - a));
const eo = (v) => 1 - Math.pow(1 - clamp01(v), 3);                 // ease out
const eio = (v) => { v = clamp01(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const lerp = (a, b, v) => a + (b - a) * v;

function rr(ctx, x, y, w, h, r) {
  w = Math.max(0, w); h = Math.max(0, h); r = Math.max(0, Math.min(r, w / 2, h / 2));   // arcTo throws on a negative radius
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function font(ctx, f, track = 0) { ctx.font = f; if ('letterSpacing' in ctx) ctx.letterSpacing = `${track}px`; }
function fit(ctx, s, w) { if (ctx.measureText(s).width <= w) return s; while (s.length > 1 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }
function card(ctx, x, y, w, h, fill = C.card, stroke = C.line, r = 8) {
  rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = stroke; ctx.stroke();
}
function lock(ctx, x, y, a, col = C.cyan) {                          // a padlock that snaps shut as a goes 0 → 1
  ctx.save(); ctx.globalAlpha *= clamp01(a * 3); ctx.translate(x, y);
  const sc = 0.6 + 0.4 * eo(a) + Math.sin(Math.PI * clamp01(a)) * 0.25; ctx.scale(sc, sc);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, -3 - 2.5 * (1 - eo(a)), 3.4, Math.PI, 0); ctx.stroke();
  rr(ctx, -5, -3, 10, 8, 1.6); ctx.fill();
  ctx.restore();
}
function tick(ctx, x, y, r, a, col = C.green) {                    // a check that draws itself
  ctx.save(); ctx.globalAlpha *= clamp01(a * 2); ctx.strokeStyle = col; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const p = eo(a), pts = [[-0.5, 0], [-0.12, 0.38], [0.55, -0.4]];
  ctx.beginPath(); ctx.moveTo(x + pts[0][0] * r, y + pts[0][1] * r);
  const seg = p * 2;
  for (let i = 1; i < 3; i++) {
    const q = clamp01(seg - (i - 1)); if (q <= 0) break;
    ctx.lineTo(x + lerp(pts[i - 1][0], pts[i][0], q) * r, y + lerp(pts[i - 1][1], pts[i][1], q) * r);
  }
  ctx.stroke(); ctx.restore();
}
function cross(ctx, x, y, r, a, col = C.amber) {
  ctx.save(); ctx.globalAlpha *= clamp01(a * 2); ctx.strokeStyle = col; ctx.lineWidth = r * 0.26; ctx.lineCap = 'round';
  const p = eo(a) * r * 0.42;
  ctx.beginPath(); ctx.moveTo(x - p, y - p); ctx.lineTo(x + p, y + p); ctx.moveTo(x + p, y - p); ctx.lineTo(x - p, y + p); ctx.stroke(); ctx.restore();
}
function pointer(ctx, x, y, s = 1) {                                // the reviewer's pointer
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.lineTo(3.8, 11.4); ctx.lineTo(6.4, 17); ctx.lineTo(8.6, 16); ctx.lineTo(6.1, 10.6); ctx.lineTo(11, 10.6); ctx.closePath();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#05080d'; ctx.lineWidth = 1.2; ctx.fill(); ctx.stroke(); ctx.restore();
}
function labGlyph(ctx, i, x, y, col) {                              // the three lab chips' glyphs
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  if (i === 0) { ctx.beginPath(); ctx.moveTo(x - 5, y + 4); ctx.bezierCurveTo(x - 2.5, y - 5, x - 1, y - 4.5, x + 5, y - 4.5); ctx.stroke(); }
  else if (i === 1) { for (const [dx, dy, r] of [[-3, 2, 1.6], [2.5, -2.5, 2], [3, 3.5, 1.1]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); } }
  else { rr(ctx, x - 6, y - 3.5, 12, 7, 3.5); ctx.stroke(); }
  ctx.restore();
}

// ---- the stage (desktop) ------------------------------------------------------------------
// authored in virtual units: 300 tall, W = 300 × aspect wide (480-720)
function stage(ctx, W, t, o) {
  const H = 300, m = 22, si = sceneAt(t);
  const fadeIn = k(t, 0, 0.35), fadeOut = 1 - k(t, END + 0.2, LOOP);
  // the panel
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
  rr(ctx, 0.5, 0.5, W - 1, H - 1, 10); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); rr(ctx, 0.5, 0.5, W - 1, H - 1, 10); ctx.clip();
  // a faint dot grid: the void's network, flattened
  ctx.fillStyle = 'rgba(79,210,255,.07)';
  ctx.beginPath();                                       // one path, one fill: ~400 dots
  for (let y = 54; y < 262; y += 18) for (let x = m + 6; x < W - m; x += 18) { ctx.moveTo(x + 0.9, y); ctx.arc(x, y, 0.9, 0, Math.PI * 2); }
  ctx.fill();

  // the rail: five story bars, which drain with everything else at the loop's end (they used to
  // sit full until the wrap, then snap empty)
  ctx.globalAlpha = fadeOut;
  const segW = (W - 2 * m - 4 * 10) / 5;
  SCENES.forEach((s, i) => {
    const x = m + i * (segW + 10), p = t >= END ? 1 : k(t, s.at, sceneEnd(i)), on = i === si && t < END;
    font(ctx, `600 9.5px ${BODY}`, 0.9); ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = on ? C.ink : p >= 1 ? C.cyan : C.faint;
    ctx.fillText(`0${i + 1}  ${s.label.toUpperCase()}`, x, 22);
    rr(ctx, x, 29, segW, 2.5, 1.25); ctx.fillStyle = C.ghost; ctx.fill();
    if (p > 0) { rr(ctx, x, 29, segW * p, 2.5, 1.25); ctx.fillStyle = C.cyan; ctx.fill(); }
  });

  ctx.globalAlpha = fadeIn * fadeOut;
  const L = m, R = W - m, cx = W / 2;
  const dw = Math.min(250, W * 0.46), dh = 192;

  // ---- spec card: centre-stage in 01, then off to the left as the work begins
  const toLeft = eio(k(t, 3.4, 3.95)), docOut = eio(k(t, 10.0, 10.4));
  if (docOut < 1) {
    const sc = lerp(1, 0.56, toLeft), x = lerp(cx - dw / 2, L, toLeft) - docOut * 60, y = lerp(50, 56, toLeft);
    ctx.save(); ctx.globalAlpha *= 1 - docOut; ctx.translate(x, y); ctx.scale(sc, sc);
    specCard(ctx, dw, dh, t, 'spec · the name in the void', true);
    ctx.restore();
  }

  // ---- chunks + Claude Code (02-03)
  const workOut = eio(k(t, 10.0, 10.4));
  if (t >= 3.6 && workOut < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - workOut;
    const tw = Math.min(232, W * 0.37), tx = R - tw + workOut * 60, ty = 50, th = 200;
    const termIn = eo(k(t, 3.6, 4.0));
    ctx.save(); ctx.globalAlpha *= termIn; ctx.translate(0, (1 - termIn) * 10);
    terminal(ctx, tx, ty, tw, th, t);
    ctx.restore();
    const cxs = L + dw * 0.56 + 14 - workOut * 60, cw = Math.min(170, tx - cxs - 22);
    CHUNKS.forEach((c, i) => {
      const st = chunkAt(t, i); if (st === 'hidden') return;
      const a = eo(k(t, 3.7 + i * 0.15, 4.0 + i * 0.15)), y = 66 + i * 44;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate((1 - a) * -18, 0);
      const live = st === 'typing' || st === 'retyping';
      const stroke = st === 'ok' ? 'rgba(63,201,120,.7)' : st === 'back' ? 'rgba(234,176,78,.8)' : live ? C.cyan : C.line;
      card(ctx, cxs, y, cw, 32, live ? C.card2 : C.card, stroke, 7);
      font(ctx, `600 8.5px ${BODY}`, 0.6); ctx.fillStyle = C.faint; ctx.fillText(`CHUNK ${i + 1}/3`, cxs + 10, y + 13);
      font(ctx, `500 11px ${BODY}`); ctx.fillStyle = st === 'queued' ? C.dim : C.ink; ctx.fillText(fit(ctx, c.name, cw - 36), cxs + 10, y + 26);
      const bx = cxs + cw - 14, by = y + 16;
      if (st === 'ok') { const v = VERDICTS.filter((q) => q[0] === i && q[2]).at(-1); tick(ctx, bx, by, 11, k(t, v[1], v[1] + 0.3)); }
      if (st === 'back') cross(ctx, bx, by, 11, k(t, 8.1, 8.35));
      if (live) {                                           // the line to Claude Code, with a packet riding it
        const x0 = cxs + cw, x1 = tx, yy = y + 16, ty1 = ty + 50;
        ctx.strokeStyle = 'rgba(79,210,255,.45)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.bezierCurveTo(x0 + 24, yy, x1 - 24, ty1, x1, ty1); ctx.stroke(); ctx.setLineDash([]);
        const q = (t * 1.6) % 1, mt = 1 - q;
        const px = mt ** 3 * x0 + 3 * mt * mt * q * (x0 + 24) + 3 * mt * q * q * (x1 - 24) + q ** 3 * x1;
        const py = mt ** 3 * yy + 3 * mt * mt * q * yy + 3 * mt * q * q * ty1 + q ** 3 * ty1;
        ctx.fillStyle = C.cyan; ctx.shadowColor = C.cyan; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      ctx.restore();
    });
    // the review note on the chunk that goes back
    const nA = k(t, 8.15, 8.4) * (1 - k(t, 9.0, 9.3));
    if (nA > 0) {
      ctx.save(); ctx.globalAlpha *= eo(nA);
      const ny = 66 + 3 * 44 + 2, nw = Math.max(cw, tx - cxs - 10);
      card(ctx, cxs, ny, nw, 30, 'rgba(40,28,8,.92)', 'rgba(234,176,78,.7)', 7);
      font(ctx, `600 8.5px ${BODY}`, 0.6); ctx.fillStyle = C.amber; ctx.fillText('REVIEW NOTE · CHUNK 2', cxs + 10, ny + 12);
      font(ctx, `500 10.5px ${BODY}`); ctx.fillStyle = '#ffe2ad'; ctx.fillText(fit(ctx, REVIEW.note, nw - 18), cxs + 10, ny + 25);
      ctx.restore();
    }
    // the reviewer's pointer visits each chunk
    if (t >= 7.2 && t < 9.9) {
      const stops = [[7.25, 7.55, 0], [7.75, 8.05, 1], [8.85, 9.05, 1], [9.2, 9.4, 2]];
      let px = cxs + cw - 6, py = 66 + 30;
      for (let j = 0; j < stops.length; j++) {
        const [a, b, ci] = stops[j], yT = 66 + ci * 44 + 22, prev = j ? 66 + stops[j - 1][2] * 44 + 22 : 66 + 24;
        if (t >= a) py = lerp(prev, yT, eio(k(t, a, b)));
      }
      ctx.save(); ctx.globalAlpha *= k(t, 7.2, 7.35) * (1 - k(t, 9.7, 9.9)); pointer(ctx, px, py); ctx.restore();
    }
    ctx.restore();
  }

  // ---- 04: the tests and the push
  if (t >= 10.1 && t < 13.2) {
    const a = eo(k(t, 10.15, 10.5)) * (1 - eo(k(t, 12.6, 13.0)));
    ctx.save(); ctx.globalAlpha *= a;
    const cols = 16, rows = 4, gap = 12, gw = (cols - 1) * gap, gx = cx - gw / 2 - 70, gy = 98;
    const filled = Math.floor(eo(k(t, 10.3, 11.3)) * cols * rows);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const n = r * cols + c, on = n < filled;
      ctx.beginPath(); ctx.arc(gx + c * gap, gy + r * gap, on ? 3.2 : 2.4, 0, Math.PI * 2);
      ctx.fillStyle = on ? C.green : C.ghost; ctx.fill();
    }
    const n = Math.round(eo(k(t, 10.3, 11.3)) * o.tests);
    font(ctx, `800 46px ${DISPLAY}`, -1); ctx.fillStyle = C.ink; ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(n), gx, gy + rows * gap + 46);
    const nw = ctx.measureText(String(n)).width;
    font(ctx, `600 9.5px ${BODY}`, 0.9); ctx.fillStyle = C.green; ctx.fillText('TESTS PASSING', gx + nw + 10, gy + rows * gap + 30);
    font(ctx, `500 10px ${BODY}`); ctx.fillStyle = C.dim; ctx.fillText('the whole suite, on every build', gx + nw + 10, gy + rows * gap + 45);
    // git push → live
    const px = gx + gw + 70, py = gy + 32, pA = eo(k(t, 11.4, 11.7));
    ctx.save(); ctx.globalAlpha *= pA;
    ctx.strokeStyle = 'rgba(79,210,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx + gw + 14, py); ctx.lineTo(px - 8, py); ctx.stroke();
    const live = k(t, 11.75, 12.0);
    card(ctx, px, py - 15, 104, 30, live > 0 ? 'rgba(10,34,24,.95)' : C.card, live > 0 ? 'rgba(63,201,120,.8)' : C.line, 15);
    ctx.fillStyle = live > 0 ? C.green : C.cyan; ctx.beginPath(); ctx.arc(px + 15, py, 3.2, 0, Math.PI * 2); ctx.fill();
    font(ctx, `600 11px ${BODY}`); ctx.fillStyle = C.ink; ctx.fillText(live > 0 ? 'Shipped' : 'git push', px + 25, py + 4);
    if (live > 0 && live < 1 || (t > 12.0 && t < 12.6)) {
      const q = k(t, 11.8, 12.5);
      ctx.strokeStyle = `rgba(63,201,120,${0.7 * (1 - q)})`; ctx.lineWidth = 1.5; rr(ctx, px - 8 * q, py - 15 - 8 * q, 104 + 16 * q, 30 + 16 * q, 15 + 8 * q); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  // ---- 05: the lab, and the next spec starting from it
  if (t >= 12.7) {
    const shelfW = Math.min(200, W * 0.36), sx = R - shelfW, sy = 66;
    const sA = eo(k(t, 12.7, 13.0));
    ctx.save(); ctx.globalAlpha *= sA;
    font(ctx, `600 9.5px ${BODY}`, 0.9); ctx.fillStyle = C.cyan; ctx.fillText('LAB · KEPT FOR NEXT TIME', sx, sy - 6);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy + 3 * 40 + 4); ctx.lineTo(R, sy + 3 * 40 + 4); ctx.stroke();
    ctx.restore();
    LAB.forEach((name, i) => {
      const a = eio(k(t, 12.85 + i * 0.18, 13.35 + i * 0.18)), x = lerp(cx - 70, sx, a), y = lerp(150, sy + 6 + i * 40, a);
      ctx.save(); ctx.globalAlpha *= clamp01(a * 2.5);
      card(ctx, x, y, shelfW, 30, C.card2, a >= 1 ? 'rgba(79,210,255,.55)' : C.cyan, 15);
      labGlyph(ctx, i, x + 17, y + 15, C.cyan);
      font(ctx, `500 11px ${BODY}`); ctx.fillStyle = C.ink; ctx.fillText(name, x + 32, y + 19);
      ctx.restore();
    });
    // the next spec slides in and takes the lab with it
    const nA = eo(k(t, 13.8, 14.2));
    if (nA > 0) {
      const w2 = Math.min(250, W * 0.46);
      ctx.save(); ctx.globalAlpha *= nA; ctx.translate(L - (1 - nA) * 30, 56);
      specCard(ctx, w2, 192, t, 'spec · the next build', false);
      ctx.restore();
      LAB.forEach((name, i) => {                           // copies arc from the shelf into the new spec
        const a = eio(k(t, 14.05 + i * 0.12, 14.5 + i * 0.12)); if (a <= 0) return;
        const x0 = sx + 10, y0 = sy + 6 + i * 40 + 15, x1 = L + 18 + i * ((w2 - 36) / 3), y1 = 56 + 150;
        const x = lerp(x0, x1, a), y = lerp(y0, y1, a) - Math.sin(Math.PI * a) * 40;
        ctx.save(); ctx.globalAlpha *= a < 1 ? 1 : 0.95;
        if (a < 1) { ctx.fillStyle = C.cyan; ctx.shadowColor = C.cyan; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
        else {
          const cw = (w2 - 36) / 3 - 6;
          card(ctx, x1, y1 - 12, cw, 24, C.card2, 'rgba(79,210,255,.55)', 12);
          labGlyph(ctx, i, x1 + 12, y1, C.cyan);
          font(ctx, `500 9px ${BODY}`); ctx.fillStyle = C.ink; ctx.fillText(fit(ctx, name, cw - 26), x1 + 22, y1 + 3.5);
        }
        ctx.restore();
      });
    }
  }
  ctx.globalAlpha = 1;

  // ---- the caption, and the real numbers
  const capA = t >= END ? 1 - k(t, END + 0.2, LOOP) : eo(k(t, SCENES[si].at + 0.1, SCENES[si].at + 0.45));
  ctx.save(); ctx.globalAlpha = capA; ctx.translate(0, (1 - capA) * 6);
  font(ctx, `800 19px ${DISPLAY}`, -0.3); ctx.fillStyle = C.ink;
  ctx.fillText(fit(ctx, SCENES[si].cap, W - 2 * m - 150), m, 282);
  ctx.restore();
  font(ctx, `600 9.5px ${BODY}`, 0.9); ctx.textAlign = 'right'; ctx.fillStyle = C.green;
  ctx.fillText(`● ${o.tests} TESTS PASSING`, R, 268);
  font(ctx, `500 9.5px ${BODY}`, 0.2); ctx.fillStyle = C.faint;
  ctx.fillText(`this site: ${o.commits} commits · ${o.days} days shipped`, R, 283);
  ctx.textAlign = 'left';
  ctx.restore();
}

function specCard(ctx, w, h, t, title, live) {
  card(ctx, 0, 0, w, h, C.card, live ? C.line : 'rgba(79,210,255,.45)', 9);
  ctx.fillStyle = 'rgba(255,255,255,.03)'; rr(ctx, 0, 0, w, 24, 9); ctx.fill();
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.globalAlpha *= 0.85; ctx.beginPath(); ctx.arc(12 + i * 10, 12, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= 0.85; });
  font(ctx, `500 9.5px ${MONO}`); ctx.fillStyle = C.dim; ctx.fillText(fit(ctx, title, w - 56), 46, 15.5);
  if (!live) {                                              // the next build: blank rows, and its head start
    for (let i = 0; i < 3; i++) { rr(ctx, 14, 40 + i * 24, (w - 28) * [0.7, 0.5, 0.6][i], 6, 3); ctx.fillStyle = C.ghost; ctx.fill(); }
    font(ctx, `600 8.5px ${BODY}`, 0.7); ctx.fillStyle = C.cyan; ctx.fillText('STARTS WITH', 14, 128);
    return;
  }
  SPEC.forEach(([lab, txt, kind], i) => {
    const y = 46 + i * 28, a0 = 0.35 + i * 0.5, typed = k(t, a0, a0 + 0.42);
    if (t < a0 - 0.1) return;
    ctx.save(); ctx.globalAlpha *= k(t, a0 - 0.1, a0 + 0.05);
    font(ctx, `600 8px ${BODY}`, 0.7); ctx.fillStyle = kind === 'out' ? C.faint : C.cyan; ctx.fillText(lab.toUpperCase(), 14, y + 4);
    font(ctx, `500 11.5px ${BODY}`); ctx.fillStyle = kind === 'out' ? C.dim : C.body;
    const shown = txt.slice(0, Math.round(typed * txt.length)), tx = 70;
    ctx.fillText(fit(ctx, shown, w - tx - 30), tx, y + 4);
    if (typed < 1 && typed > 0) { const cw = ctx.measureText(shown).width; ctx.fillStyle = C.cyan; ctx.fillRect(tx + cw + 1, y - 6, 1.5, 12); }
    if (kind === 'lock') lock(ctx, w - 18, y, k(t, a0 + 0.45, a0 + 0.7));
    if (kind === 'out') {                                   // out of scope: struck through
      const sw = ctx.measureText(txt).width * eo(k(t, 2.85, 3.1));
      ctx.strokeStyle = C.amber; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(tx - 2, y); ctx.lineTo(tx - 2 + sw + 4, y); ctx.stroke();
    }
    ctx.restore();
  });
}

function terminal(ctx, x, y, w, h, t) {
  card(ctx, x, y, w, h, C.term, C.line, 9);
  ctx.fillStyle = 'rgba(255,255,255,.035)'; rr(ctx, x, y, w, 24, 9); ctx.fill();
  font(ctx, `600 9.5px ${BODY}`, 0.8); ctx.fillStyle = C.cyan; ctx.fillText('CLAUDE CODE', x + 12, y + 16);
  // the prompt follows the chunk being built
  const ci = t < 5.0 ? 0 : t < 6.0 ? 1 : 2, retype = t >= 8.5 && t < 9.1;
  font(ctx, `500 9.5px ${MONO}`); ctx.fillStyle = C.dim;
  const prompt = retype ? '› chunk 2: lift the bloom' : t < 4.0 ? '› read spec.md' : `› build chunk ${ci + 1}/3`;
  ctx.fillText(fit(ctx, prompt, w - 24), x + 12, y + 42);
  // every typed line so far, newest at the bottom
  const lines = [];
  CHUNKS.forEach((c, i) => {
    const start = 4.0 + i * 1.0;
    c.code.forEach((ln, j) => { const a = start + j * 0.4; if (t >= a) lines.push({ ln, p: k(t, a, a + 0.38), col: C.body }); });
  });
  if (t >= 8.5) lines.push({ ln: REVIEW.fix, p: k(t, 8.55, 8.95), col: '#ffe2ad' });
  const lh = 15, max = Math.floor((h - 64) / lh), view = lines.slice(-max);
  font(ctx, `400 9.5px ${MONO}`);
  view.forEach((l, i) => {
    const s = l.ln.slice(0, Math.round(l.p * l.ln.length));
    ctx.fillStyle = l.col; ctx.fillText(fit(ctx, s, w - 24), x + 12, y + 62 + i * lh);
    if (l.p < 1) { const cw = ctx.measureText(s).width; ctx.fillStyle = C.cyan; ctx.fillRect(x + 12 + cw + 1, y + 54 + i * lh, 5, 10); }
  });
}

// ---- the rail (phones, short screens) ------------------------------------------------------
// authored 100 tall, W = 100 × aspect wide
const ICON = [
  (ctx, x, y) => { ctx.strokeRect(x - 4, y - 5, 8, 10); ctx.beginPath(); ctx.moveTo(x - 2, y - 1.5); ctx.lineTo(x + 2, y - 1.5); ctx.moveTo(x - 2, y + 1.5); ctx.lineTo(x + 2, y + 1.5); ctx.stroke(); },
  (ctx, x, y) => { ctx.beginPath(); ctx.moveTo(x - 4.5, y - 3); ctx.lineTo(x - 1, y); ctx.lineTo(x - 4.5, y + 3); ctx.moveTo(x, y + 3.5); ctx.lineTo(x + 4.5, y + 3.5); ctx.stroke(); },
  (ctx, x, y) => { ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 1, y + 3); ctx.lineTo(x + 4.5, y - 3.5); ctx.stroke(); },
  (ctx, x, y) => { ctx.beginPath(); ctx.moveTo(x, y + 5); ctx.lineTo(x, y - 4.5); ctx.moveTo(x - 3.5, y - 1); ctx.lineTo(x, y - 4.5); ctx.lineTo(x + 3.5, y - 1); ctx.stroke(); },
  (ctx, x, y) => { ctx.beginPath(); ctx.moveTo(x - 2, y - 5); ctx.lineTo(x - 2, y - 1); ctx.lineTo(x - 5, y + 5); ctx.lineTo(x + 5, y + 5); ctx.lineTo(x + 2, y - 1); ctx.lineTo(x + 2, y - 5); ctx.stroke(); },
];
function rail(ctx, W, t, o) {
  const H = 100, m = 14, si = sceneAt(t), fade = t >= END ? 1 - k(t, END + 0.2, LOOP) : 1;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
  rr(ctx, 0.5, 0.5, W - 1, H - 1, 8); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
  const x0 = m + 22, x1 = W - m - 22, step = (x1 - x0) / 4, ny = 32;
  // the track, filled to the current step, with a packet riding the live segment
  ctx.strokeStyle = C.ghost; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, ny); ctx.lineTo(x1, ny); ctx.stroke();
  const p = t >= END ? 4 * fade : si + k(t, SCENES[si].at, sceneEnd(si));   // drains back at the loop's end
  ctx.strokeStyle = C.cyan; ctx.beginPath(); ctx.moveTo(x0, ny); ctx.lineTo(x0 + step * Math.min(4, p), ny); ctx.stroke();
  SCENES.forEach((s, i) => {
    const x = x0 + i * step, on = i === si && t < END, done = t >= END ? i <= p + 0.01 : i < si;
    if (on) { const q = (t * 0.9) % 1; ctx.strokeStyle = `rgba(79,210,255,${0.6 * (1 - q)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, ny, 13 + q * 8, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, ny, 13, 0, Math.PI * 2);
    ctx.fillStyle = on ? '#0d3346' : done ? '#0b2231' : '#08121c'; ctx.fill();
    ctx.strokeStyle = on || done ? C.cyan : C.line; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = on ? C.ink : done ? C.cyan : C.faint; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ICON[i](ctx, x, ny);
    font(ctx, `600 12.5px ${BODY}`, 0.9); ctx.textAlign = 'center'; ctx.fillStyle = on ? C.ink : done ? C.cyan : C.faint;
    ctx.fillText(s.label.toUpperCase(), x, 63);   // 12.5 / 13.5 units: ≥ 12 px on a phone's rail
  });
  // the caption: what is happening now (and in 04 the real test count)
  ctx.save(); ctx.globalAlpha = fade * eo(k(t, SCENES[si].at + 0.05, SCENES[si].at + 0.35));
  font(ctx, `500 13.5px ${BODY}`); ctx.fillStyle = C.body; ctx.textAlign = 'center';
  const cap = si === 3 ? `${Math.round(eo(k(t, 10.2, 11.2)) * o.tests)} tests passing, then shipped.` : SCENES[si].cap;
  ctx.fillText(fit(ctx, cap, W - 2 * m), W / 2, 88);
  ctx.restore(); ctx.textAlign = 'left';
}

// One frame. w, h: the canvas's device pixels; opts.scale: device pixels per CSS pixel;
// opts.tests / commits / days: the real numbers from the build log (scripts/buildlog.js).
export function drawWorkflow(ctx, w, h, t, opts = {}) {
  const o = { scale: 1, tests: 0, commits: 0, days: 0, ...opts };
  t = ((t % LOOP) + LOOP) % LOOP;
  const cssW = w / o.scale, cssH = h / o.scale, aspect = cssW / cssH;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
  if (aspect <= 2.4) {
    const s = h / 300; ctx.setTransform(s, 0, 0, s, 0, 0); stage(ctx, w / s, t, o);
  } else {
    const vs = Math.min(1.25, cssH / 100) * o.scale, H = 100 * vs;
    ctx.setTransform(vs, 0, 0, vs, 0, (h - H) / 2); rail(ctx, w / vs, t, o);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
