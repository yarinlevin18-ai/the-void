// buddy.js — Cursor Buddy's product loop, drawn on a 2D canvas (2026-09-29).
// Replaces a screenshot on the Cursor Buddy stop: a macOS pointer drifts over a code
// editor, the Line-bot robot follows it, listens, thinks, and answers in its bubble.
// Every shape, colour and timing comes from the Swift source (GhostCursorShape,
// GhostPalette, GhostEngine, BuddyView). Pure: drawBuddy(ctx, w, h, seconds) paints
// one frame for any time, so it serves the WebGL panel texture and the phone figure.
// The scene (2026-10-14, Yarin: "a better image of illustration"): a Mac desktop, with a
// wallpaper, the menu bar carrying Cursor Buddy's own icon (lit in the state colour) and an
// editor window with a file tree, real highlighted TypeScript (line 42 is the bug the answer
// names) and a status bar. It used to be grey bars in a flat window with empty edges.

export const LOOP = 16;                                   // seconds per cycle

const C = {
  win: '#10151e', bar: '#171d28', side: '#0d1219',
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
  const P = [0.46, 0.425];                              // on line 42's squiggle (drawDesktop's layout)
  const tau = t >= 15.2 ? t - 15.2 : t < 3.0 ? t + 0.8 : -1;
  if (tau < 0) return P;
  const u = smooth(tau / 3.8), r = 0.16;
  return [P[0] + r * Math.sin(2 * Math.PI * u), P[1] + 0.55 * r * Math.sin(4 * Math.PI * u)];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const UI = '-apple-system, "SF Pro Text", "Schibsted", "Segoe UI", sans-serif';
// handler.ts, lines 36-56, as [text, colour] runs. Line 42 reads `response.body` before
// anything checks that the call worked: the answer's null-pointer dereference.
const K = '#82aaff', F = '#4fd2ff', S = '#a6e3a1', N = '#f5c56b', T = '#ffcb8b', X = '#cfe0f0', M = 'rgba(159,184,210,.5)';
const CODE = [
  [['// GET /orders/:id: one order and its items', M]],
  [['export async function ', K], ['handler', F], ['(req: ', X], ['Request', T], [') {', X]],
  [['  const ', K], ['id = ', X], ['new ', K], ['URL', T], ['(req.url).searchParams.', X], ['get', F], ['(', X], ["'id'", S], [');', X]],
  [['  if ', K], ['(!id) ', X], ['return ', K], ['json', F], ['({ error: ', X], ["'missing id'", S], [' }, ', X], ['400', N], [');', X]],
  [],
  [['  const ', K], ['response = ', X], ['await ', K], ['api.', X], ['get', F], ['(', X], ['`/orders/${id}`', S], [');', X]],
  [['  const ', K], ['items = response.body.items;', X]],
  [['  return ', K], ['json', F], ['({ id, items, count: items.length });', X]],
  [['}', X]],
  [],
  [['function ', K], ['json', F], ['(data: ', X], ['unknown', T], [', status = ', X], ['200', N], [') {', X]],
  [['  return new ', K], ['Response', T], ['(', X], ['JSON', T], ['.', X], ['stringify', F], ['(data), {', X]],
  [['    status, headers: { ', X], ["'content-type'", S], [': ', X], ["'application/json'", S], [' },', X]],
  [['  });', X]],
  [['}', X]],
  [],
  [['export function ', K], ['toOrder', F], ['(row: ', X], ['OrderRow', T], ['): ', X], ['Order', T], [' {', X]],
  [['  return ', K], ['{ id: row.id, items: row.items ?? [], total: row.cents / ', X], ['100', N], [' };', X]],
  [['}', X]],
  [],
  [['export const ', K], ['config = { runtime: ', X], ["'edge'", S], [', maxDuration: ', X], ['10', N], [' };', X]],
];
const ERR_ROW = 6, ERR_COL = 16, ERR_LEN = 19;            // `response.body.items`
// [name, depth, folder, selected]
const FILES = [['src', 0, 1], ['api.ts', 1], ['handler.ts', 1, 0, 1], ['orders.ts', 1], ['utils.ts', 1], ['tests', 0, 1], ['package.json', 0], ['tsconfig.json', 0]];

function drawWallpaper(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0a2236'); g.addColorStop(0.55, '#071624'); g.addColorStop(1, '#0d1b33');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, c] of [[0.12, 0.95, 0.55, 'rgba(79,210,255,.22)'], [0.92, 0.12, 0.5, 'rgba(110,120,255,.2)'], [0.6, 1.05, 0.45, 'rgba(234,176,78,.12)']]) {
    const rg = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * W);
    rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
}

function drawBuddyGlyph(ctx, x, y, k, col) {              // the menu-bar icon: Line bot's head, small
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.lineWidth = 1.6; ctx.strokeStyle = col; ctx.fillStyle = col;
  roundRect(ctx, 0, 3, 14, 10, 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7, 3); ctx.lineTo(7, 0.5); ctx.stroke();
  ctx.fillRect(3.6, 6.4, 2, 3); ctx.fillRect(8.4, 6.4, 2, 3);
  ctx.restore();
}

function drawMenuBar(ctx, W, s, phase) {
  const h = 22 * s;
  ctx.fillStyle = 'rgba(8,14,22,.72)'; ctx.fillRect(0, 0, W, h);
  ctx.fillStyle = 'rgba(207,232,255,.08)'; ctx.fillRect(0, h - s, W, s);
  ctx.textBaseline = 'middle'; ctx.font = `600 ${10.5 * s}px ${UI}`; ctx.fillStyle = '#eef4fb';
  let x = 16 * s; ctx.fillText('Code', x, h / 2); x += ctx.measureText('Code').width + 16 * s;
  ctx.font = `${10.5 * s}px ${UI}`; ctx.fillStyle = 'rgba(238,244,251,.82)';
  for (const m of ['File', 'Edit', 'Selection', 'View', 'Go', 'Window', 'Help']) { ctx.fillText(m, x, h / 2); x += ctx.measureText(m).width + 14 * s; }
  const clock = 'Tue 14:32'; let rx = W - 16 * s - ctx.measureText(clock).width;
  ctx.fillText(clock, rx, h / 2);
  rx -= 30 * s;                                          // battery
  ctx.strokeStyle = 'rgba(238,244,251,.75)'; ctx.lineWidth = s; roundRect(ctx, rx, h / 2 - 4.5 * s, 18 * s, 9 * s, 2.5 * s); ctx.stroke();
  ctx.fillStyle = 'rgba(238,244,251,.8)'; ctx.fillRect(rx + 2 * s, h / 2 - 2.5 * s, 11 * s, 5 * s); ctx.fillRect(rx + 18.6 * s, h / 2 - 2 * s, 1.4 * s, 4 * s);
  rx -= 22 * s;                                          // wi-fi
  ctx.lineWidth = 1.4 * s; ctx.lineCap = 'round';
  for (const r of [3, 6, 9]) { ctx.beginPath(); ctx.arc(rx + 7 * s, h / 2 + 4.5 * s, r * s, -2.4, -0.74); ctx.stroke(); }
  rx -= 30 * s;                                          // Cursor Buddy, lit in the state colour while it works
  const on = phase !== 'idle', col = phase === 'answer' ? C.answer : phase === 'thinking' ? C.think : on ? C.listen : 'rgba(238,244,251,.85)';
  if (on) { ctx.fillStyle = 'rgba(207,232,255,.14)'; roundRect(ctx, rx - 5 * s, 3 * s, 25 * s, h - 6 * s, 4 * s); ctx.fill(); }
  drawBuddyGlyph(ctx, rx + 0.5 * s, h / 2 - 6.5 * s, s, col);
  return h;
}

function drawDesktop(ctx, W, H, s, phase) {
  drawWallpaper(ctx, W, H);
  const mb = drawMenuBar(ctx, W, s, phase);
  const x = W * 0.035, y = mb + 12 * s, w = W * 0.93, h = H - y - 14 * s;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 28 * s; ctx.shadowOffsetY = 10 * s;
  ctx.fillStyle = C.win; roundRect(ctx, x, y, w, h, 10 * s); ctx.fill(); ctx.restore();
  ctx.save(); roundRect(ctx, x, y, w, h, 10 * s); ctx.clip();
  const tb = 28 * s, sw = w * 0.2;
  ctx.fillStyle = C.bar; ctx.fillRect(x, y, w, tb);         // title bar
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + (16 + i * 17) * s, y + tb / 2, 5.2 * s, 0, 7); ctx.fill(); });
  ctx.textBaseline = 'middle'; ctx.font = `${10.5 * s}px ${UI}`; ctx.fillStyle = 'rgba(207,232,255,.6)'; ctx.textAlign = 'center';
  ctx.fillText('handler.ts — orders-api', x + w / 2, y + tb / 2); ctx.textAlign = 'left';
  ctx.fillStyle = C.side; ctx.fillRect(x, y + tb, sw, h - tb);   // file tree
  ctx.font = `600 ${8.5 * s}px ${UI}`; ctx.fillStyle = 'rgba(207,232,255,.42)';
  ctx.fillText('EXPLORER', x + 14 * s, y + tb + 16 * s);
  ctx.font = `${10.5 * s}px ${UI}`;
  FILES.forEach(([name, depth, folder, sel], i) => {
    const fy = y + tb + 36 * s + i * 19 * s;
    if (sel) { ctx.fillStyle = 'rgba(79,210,255,.14)'; ctx.fillRect(x, fy - 9 * s, sw, 18 * s); ctx.fillStyle = '#4fd2ff'; ctx.fillRect(x, fy - 9 * s, 2 * s, 18 * s); }
    const fx = x + (14 + depth * 14) * s;
    ctx.fillStyle = folder ? 'rgba(207,232,255,.5)' : name.endsWith('.ts') ? '#4f9dff' : '#f5c56b';
    if (folder) { ctx.beginPath(); ctx.moveTo(fx, fy - 3 * s); ctx.lineTo(fx + 6 * s, fy - 3 * s); ctx.lineTo(fx + 3 * s, fy + 2 * s); ctx.closePath(); ctx.fill(); }
    else { roundRect(ctx, fx, fy - 4 * s, 7 * s, 8 * s, 1.5 * s); ctx.fill(); }
    ctx.fillStyle = sel ? '#eef4fb' : 'rgba(207,232,255,.72)'; ctx.fillText(name, fx + 13 * s, fy);
  });
  const cx = x + sw, ct = y + tb;                        // tab strip
  ctx.fillStyle = '#0d121a'; ctx.fillRect(cx, ct, w - sw, 26 * s);
  ctx.fillStyle = C.win; ctx.fillRect(cx, ct, 112 * s, 26 * s); ctx.fillStyle = '#4fd2ff'; ctx.fillRect(cx, ct, 112 * s, 1.5 * s);
  ctx.fillStyle = '#4f9dff'; roundRect(ctx, cx + 12 * s, ct + 9 * s, 7 * s, 8 * s, 1.5 * s); ctx.fill();
  ctx.fillStyle = '#eef4fb'; ctx.fillText('handler.ts', cx + 25 * s, ct + 13 * s);
  ctx.fillStyle = 'rgba(207,232,255,.45)'; ctx.fillText('orders.ts', cx + 130 * s, ct + 13 * s);
  // code on the font's own column grid, so line 42's squiggle sits under its token in any monospace font
  ctx.font = `${11 * s}px ${MONO}`;
  const fs = 11 * s, cw = ctx.measureText('0').width, lh = 17.5 * s, top = ct + 26 * s + 16 * s, gx = cx + 14 * s, codeX = cx + 50 * s;
  ctx.font = `${fs}px ${MONO}`;
  CODE.forEach((runs, i) => {
    const ly = top + i * lh;
    if (ly > y + h - 34 * s) return;
    if (i === ERR_ROW) { ctx.fillStyle = 'rgba(255,107,107,.07)'; ctx.fillRect(cx, ly - lh / 2, w - sw, lh); }
    ctx.textAlign = 'right'; ctx.fillStyle = i === ERR_ROW ? 'rgba(238,244,251,.85)' : 'rgba(159,184,210,.38)';
    ctx.fillText(String(36 + i), gx + 22 * s, ly); ctx.textAlign = 'left';
    let col = 0;
    for (const [txt, c] of runs) { ctx.fillStyle = c; ctx.fillText(txt, codeX + col * cw, ly); col += txt.length; }
    if (i === ERR_ROW) {                                 // the red squiggle the question is about
      ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(gx + 30 * s, ly, 2.6 * s, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 1.2 * s; ctx.beginPath();
      const x0 = codeX + ERR_COL * cw, len = ERR_LEN * cw;
      for (let k = 0; k <= 48; k++) { const px = x0 + len * k / 48, py = ly + 7.5 * s + (k % 2 ? -1.3 : 1.3) * s; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
  });
  const sb = 20 * s, sy = y + h - sb;                    // status bar
  ctx.fillStyle = '#0b1a2a'; ctx.fillRect(x, sy, w, sb);
  ctx.font = `${9.5 * s}px ${UI}`; ctx.fillStyle = 'rgba(207,232,255,.7)';
  ctx.fillText('main', x + 26 * s, sy + sb / 2);
  ctx.strokeStyle = 'rgba(207,232,255,.7)'; ctx.lineWidth = s; ctx.beginPath(); ctx.arc(x + 16 * s, sy + sb / 2, 3 * s, 0, 7); ctx.stroke();
  ctx.fillStyle = '#ff8a8a'; ctx.fillText('⊗ 1', x + 66 * s, sy + sb / 2);
  ctx.fillStyle = 'rgba(207,232,255,.55)'; ctx.fillText('⚠ 0', x + 96 * s, sy + sb / 2);
  ctx.textAlign = 'right'; ctx.fillText('Ln 42, Col 31    UTF-8    TypeScript', x + w - 14 * s, sy + sb / 2); ctx.textAlign = 'left';
  ctx.restore();
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
  const label = 'holding option + space', w = ctx.measureText(label).width + 28 * s, x = W * 0.948 - 16 * s - w, y = H - 66 * s;   // bottom right of the editor
  ctx.fillStyle = 'rgba(79,224,255,.12)'; roundRect(ctx, x, y, w, 26 * s, 13 * s); ctx.fill();
  ctx.strokeStyle = 'rgba(79,224,255,.6)'; ctx.lineWidth = 1 * s; ctx.stroke();
  ctx.fillStyle = C.listen; ctx.fillText(label, x + 14 * s, y + 13 * s);
  ctx.restore();
}

// One frame at absolute time `sec` (loops every LOOP s). w/h in canvas pixels.
export function drawBuddy(ctx, w, h, sec) {
  const t = ((sec % LOOP) + LOOP) % LOOP, s = w / 800;
  const phase = phaseAt(t);
  drawDesktop(ctx, w, h, s, phase);
  const [px, py] = pointerAt(t), [lx, ly] = pointerAt(Math.max(0, t - 0.07));   // the robot trails on a stiff spring
  const cx = px * w, cy = py * h;
  const rx = lx * w + 18 * s * 1.9, ry = ly * h + 20 * s * 1.9;
  drawKeycap(ctx, w, h, s, t);
  drawRobot(ctx, rx, ry, s, phase, t);
  drawPointer(ctx, cx, cy, s);
  drawBubble(ctx, rx + 70 * s, ry + 24 * s, s, phase, t, w);
}
