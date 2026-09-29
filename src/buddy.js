// buddy.js — Cursor Buddy's product loop, drawn on a 2D canvas (2026-09-29).
// Replaces a screenshot on the Cursor Buddy stop: a macOS pointer drifts over a code
// editor, the Line-bot robot follows it, listens, thinks, and answers in its bubble.
// Every shape, colour and timing comes from the Swift source (GhostCursorShape,
// GhostPalette, GhostEngine, BuddyView). Pure: drawBuddy(ctx, w, h, seconds) paints
// one frame for any time, so it serves the WebGL panel texture and the phone figure.

export const LOOP = 16;                                   // seconds per cycle

const C = {
  bg: '#0b0f16', win: '#12161f', bar: '#191e29', line: 'rgba(159,184,210,.16)', text: 'rgba(207,232,255,.55)',
  idle: '#e9eef7', listen: '#4fe0ff', think: '#9fb8ff', answer: '#7dffb0',
  head: 'rgba(28,31,39,.92)', bubble: 'rgba(17,20,27,.95)', ink: '#e9eef7',
};
const Q = 'What does this error mean?';
const A = 'It’s a null-pointer dereference in the request handler — line 42 reads `response.body` before checking the request actually succeeded. Add a guard for the failure case before that line.';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };

// The phase at loop time t (seconds): the trigger timeline from the Swift source,
// ⌥Space held 2.2 → 5.2 s, answer streaming 8.1 → 9.6 s, hold, fade.
export function phaseAt(t) {
  if (t < 2.2) return 'idle';
  if (t < 5.2) return 'listening';
  if (t < 6.5) return 'transcribing';
  if (t < 8.1) return 'thinking';
  if (t < 15.2) return 'answer';
  return 'idle';
}

// Pointer position in 0..1 of the scene. It rests on the error line from 3.0 to 15.2 s
// and loops a figure-8 out and back in between (GhostDemo's path), so the loop is seamless.
export function pointerAt(t) {
  const P = [0.36, 0.46];                               // just under line 42's squiggle
  const tau = t >= 15.2 ? t - 15.2 : t < 3.0 ? t + 0.8 : -1;
  if (tau < 0) return P;
  const u = smooth(tau / 3.8), r = 0.16;
  return [P[0] + r * Math.sin(2 * Math.PI * u), P[1] + 0.55 * r * Math.sin(4 * Math.PI * u)];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawEditor(ctx, W, H, s, t) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const x = W * 0.06, y = H * 0.08, w = W * 0.88, h = H * 0.84;
  ctx.fillStyle = C.win; roundRect(ctx, x, y, w, h, 10 * s); ctx.fill();
  ctx.fillStyle = C.bar; roundRect(ctx, x, y, w, 30 * s, 10 * s); ctx.fill(); ctx.fillRect(x, y + 20 * s, w, 10 * s);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + (18 + i * 18) * s, y + 15 * s, 5 * s, 0, 7); ctx.fill(); });
  ctx.fillStyle = C.text; ctx.font = `${11 * s}px ui-monospace, "SF Mono", Menlo, monospace`; ctx.textBaseline = 'middle';
  ctx.fillText('handler.ts', x + w / 2 - 30 * s, y + 15 * s);
  const rows = [0.5, 0.72, 0.4, 0.62, 0.3, 0.58, 0.82, 0.46, 0.66, 0.36, 0.54, 0.7, 0.28];
  const top = y + 48 * s, lh = 20 * s, errRow = 6;   // line 42 — the one the answer names
  rows.forEach((len, i) => {
    const ly = top + i * lh;
    if (ly > y + h - 16 * s) return;
    ctx.fillStyle = 'rgba(159,184,210,.35)'; ctx.fillText(String(36 + i), x + 14 * s, ly);
    ctx.fillStyle = i === errRow ? 'rgba(255,107,107,.55)' : C.line;
    roundRect(ctx, x + 52 * s, ly - 4 * s, w * 0.62 * len, 8 * s, 4 * s); ctx.fill();
    if (i === errRow) {                                 // the red squiggle the question is about
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 1.4 * s; ctx.beginPath();
      for (let k = 0; k <= 40; k++) { const px = x + 52 * s + (w * 0.62 * len) * k / 40; const py = ly + 9 * s + Math.sin(k * 1.6 + t * 0) * 1.6 * s; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
  });
  return { errY: top + errRow * lh };
}

function drawPointer(ctx, x, y, s) {                     // the macOS arrow: white fill, black edge
  const k = 1.6 * s;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.2, 13.2); ctx.lineTo(7, 19.6); ctx.lineTo(9.6, 18.5);
  ctx.lineTo(6.9, 12.2); ctx.lineTo(12.2, 12.2); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.lineWidth = 1.1; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}

function drawRobot(ctx, x, y, s, phase, t) {             // GhostCursorShape "Line bot", reference units
  const col = phase === 'listening' || phase === 'transcribing' ? C.listen : phase === 'thinking' ? C.think : phase === 'answer' ? C.answer : C.idle;
  const k = 1.9 * s;
  const bob = phase === 'idle' ? [0, 1, 0, -1][Math.floor(t / 0.25) % 4] : 0;
  ctx.save(); ctx.translate(x, y - bob * k); ctx.scale(k, k);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  roundRect(ctx, 2, 6, 26, 20, 6); ctx.fillStyle = C.head; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 3.2; ctx.stroke();
  ctx.strokeStyle = C.idle; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(15, 6); ctx.lineTo(15, 0); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(15, -1, 2.6, 0, 7); ctx.fill();
  if (phase === 'answer') {                               // "^ ^"
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    for (const e of [9, 21]) { ctx.beginPath(); ctx.moveTo(e - 3, 16); ctx.lineTo(e, 13); ctx.lineTo(e + 3, 16); ctx.stroke(); }
  } else {
    const think = phase === 'transcribing' || phase === 'thinking';
    const scan = think ? [2, 2, 1, 0, -1, -2, -2, -2, -1, 0, 1, 2, 2][Math.floor((t % 1.57) / 1.57 * 13)] : 0;
    const blink = !think && (t % 3.7) < 0.12;             // a blink every few seconds
    const eh = blink ? 1 : 5, cy = think ? 12 : 14;
    ctx.fillStyle = col;
    for (const e of [9, 21]) { roundRect(ctx, e - 2 + scan, cy - eh / 2, 4, eh, Math.min(1.8, eh / 2)); ctx.fill(); }
    if (phase === 'listening') {                          // five level bars, updated at 10 Hz
      const q = Math.floor(t * 10) / 10, level = 0.45 + 0.45 * Math.abs(Math.sin(5 * q));
      [9, 12, 15, 18, 21].forEach((bx, i) => {
        const L = Math.max(1, Math.min(4, Math.round(level * (0.55 + 0.45 * Math.sin(6 * q + 1.7 * i)) * 4)));
        ctx.fillRect(bx - 1, 23 - 1.6 * L, 2, 1.6 * L);
      });
    }
  }
  ctx.restore();
}

function wrap(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const next = cur ? cur + ' ' + w : w; if (ctx.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next; }
  if (cur) lines.push(cur);
  return lines;
}

function drawBubble(ctx, x, y, s, phase, t, W) {         // BuddyView: sharp box, 2pt state-colour border, mono text
  if (phase !== 'thinking' && phase !== 'answer') return;
  const fadeIn = clamp01((t - 6.5) / 0.18), fadeOut = 1 - clamp01((t - 14.6) / 0.6);
  const a = Math.min(fadeIn, fadeOut); if (a <= 0) return;
  const pad = 14 * s, maxW = Math.min(330 * s, W - x - 24 * s), fs = 13 * s, lh = fs + 6 * s;
  ctx.font = `${fs}px ui-monospace, "SF Mono", Menlo, monospace`;
  let body;
  if (phase === 'thinking') body = ['thinking…'];
  else { const n = Math.floor(clamp01((t - 8.1) / 1.5) * A.length); body = wrap(ctx, A.slice(0, Math.max(1, n)), maxW - pad * 2); }
  const hdr = `> ${Q}`, hdrH = 11 * s + 8 * s;
  const w = phase === 'thinking' ? Math.max(ctx.measureText('thinking…').width, (ctx.font = `${11 * s}px ui-monospace, Menlo, monospace`, ctx.measureText(hdr).width)) + pad * 2 : maxW;
  const h = pad * 1.6 + hdrH + body.length * lh;
  const bx = x, by = y - h / 2 + (1 - fadeOut) * 4 * s;
  ctx.save(); ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 2 * s;
  ctx.fillStyle = C.bubble; roundRect(ctx, bx, by, w, h, 2 * s); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = phase === 'answer' ? C.answer : C.think; ctx.lineWidth = 2 * s; roundRect(ctx, bx + s, by + s, w - 2 * s, h - 2 * s, 2 * s); ctx.stroke();
  ctx.textBaseline = 'top';
  ctx.font = `${11 * s}px ui-monospace, "SF Mono", Menlo, monospace`; ctx.fillStyle = 'rgba(233,238,247,.45)';
  ctx.fillText(hdr, bx + pad, by + pad * 0.8);
  ctx.font = `${fs}px ui-monospace, "SF Mono", Menlo, monospace`;
  ctx.fillStyle = phase === 'thinking' ? 'rgba(233,238,247,.65)' : C.ink;
  body.forEach((ln, i) => ctx.fillText(ln, bx + pad, by + pad * 0.8 + hdrH + i * lh));
  ctx.restore();
}

function drawKeycap(ctx, W, H, s, t) {                    // "option + space" held, bottom-left, while listening
  const a = Math.min(clamp01((t - 2.2) / 0.15), 1 - clamp01((t - 5.2) / 0.2));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a * 0.9;
  ctx.font = `${12 * s}px ui-monospace, "SF Mono", Menlo, monospace`; ctx.textBaseline = 'middle';
  const label = 'holding option + space', w = ctx.measureText(label).width + 28 * s, x = W * 0.06 + 16 * s, y = H * 0.92 - 34 * s;
  ctx.fillStyle = 'rgba(79,224,255,.12)'; roundRect(ctx, x, y, w, 26 * s, 13 * s); ctx.fill();
  ctx.strokeStyle = 'rgba(79,224,255,.6)'; ctx.lineWidth = 1 * s; ctx.stroke();
  ctx.fillStyle = C.listen; ctx.fillText(label, x + 14 * s, y + 13 * s);
  ctx.restore();
}

// One frame at absolute time `sec` (loops every LOOP s). w/h in canvas pixels.
export function drawBuddy(ctx, w, h, sec) {
  const t = ((sec % LOOP) + LOOP) % LOOP, s = w / 800;
  const phase = phaseAt(t);
  drawEditor(ctx, w, h, s, t);
  const [px, py] = pointerAt(t), [lx, ly] = pointerAt(Math.max(0, t - 0.07));   // the robot trails on a stiff spring
  const cx = px * w, cy = py * h;
  const rx = lx * w + 18 * s * 1.9, ry = ly * h + 20 * s * 1.9;
  drawKeycap(ctx, w, h, s, t);
  drawRobot(ctx, rx, ry, s, phase, t);
  drawPointer(ctx, cx, cy, s);
  drawBubble(ctx, rx + 70 * s, ry + 24 * s, s, phase, t, w);
}
