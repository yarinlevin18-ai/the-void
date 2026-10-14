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

export const LOOP = 18;                                   // seconds per cycle
export const STILL = 13.8;                                // reduced motion: the browser, the drawing and the steps

const C = {
  win: '#10151e', bar: '#171d28', side: '#0d1219',
  idle: '#e9eef7', listen: '#4fe0ff', think: '#9fb8ff', answer: '#7dffb0',
  head: 'rgba(28,31,39,.92)', bubble: 'rgba(17,20,27,.95)', ink: '#e9eef7',
};
const Q = 'What does this error mean?';
const A = 'A null-pointer dereference: line 42 reads `response.body` before checking the request succeeded. Guard the failure case first.';
// The second ask (2026-10-14, Yarin: "show he can open the browser and show the prompt I gave him,
// and afterwards that he can draw on the screen"): the words typed into the browser are the words
// asked for (tested), and the drawing marks the fix on the page it found.
export const Q2 = 'Search the web: check a fetch response';
export const SEARCH = Q2.slice(Q2.indexOf(':') + 2);
const NOTE = 'add this before line 42';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };

// The phase at loop time t (seconds). Two asks: ⌥Space held 1.0 → 2.6 s, the answer streams
// 3.7 → 4.7 s; ⌥Space again 7.4 → 8.6 s, then the buddy works the browser (acting, 9.3 s) and
// draws over it (11.9 s) until everything closes at 15.0 s.
const PHASES = [[1.0, 'idle'], [2.6, 'listening'], [3.1, 'transcribing'], [3.7, 'thinking'], [7.4, 'answer'],
  [8.6, 'listening'], [8.9, 'transcribing'], [9.3, 'thinking'], [11.9, 'acting'], [15.0, 'drawing'], [Infinity, 'idle']];
export function phaseAt(t) { return PHASES.find(([end]) => t < end)[1]; }

// Pointer position in 0..1 of the scene. It rests on the error line from 1.0 to 16.2 s
// and loops a figure-8 out and back in between (GhostDemo's path), so the loop is seamless.
// The visitor's pointer never moves while the buddy works the browser: it acts on its own.
export function pointerAt(t) {
  const P = [0.46, 0.425];                              // on line 42's squiggle (drawDesktop's layout)
  const tau = t >= 16.2 ? t - 16.2 : t < 1.0 ? t + 1.8 : -1;
  if (tau < 0) return P;
  const u = smooth(tau / 2.8), r = 0.16;
  return [P[0] + r * Math.sin(2 * Math.PI * u), P[1] + 0.55 * r * Math.sin(4 * Math.PI * u)];
}

// The browser window and what the buddy touches in it, in scene units (800 wide, H = 800·17.6/28 tall).
const BX = 384, BY = 44, BW = 398;                        // right of the resting pointer, so it never covers the page
const BAR = [BX + 80, BY + 9, BW - 100, 24];               // address field
const BOX = [BX + 30, BY + 177, 296, 22];                  // around the snippet's guard line
const LBL = [BX + 150, BY + 262, 150];                     // the note: x, baseline, width
const ARROW = [[BX + 306, BY + 256], [BX + 336, BY + 230], [BX + 302, BY + 204]];   // note → box (quadratic)
export const typedAt = (t) => Math.floor(clamp01((t - 10.1) / 0.9) * SEARCH.length);
const barTip = (n) => [BAR[0] + 12 + n * 5.4, BAR[1] + BAR[3] / 2];
function rectPoint([x, y, w, h], k) {                      // clockwise from the top-left corner
  let d = clamp01(k) * 2 * (w + h);
  if (d <= w) return [x + d, y]; d -= w;
  if (d <= h) return [x + w, y + d]; d -= h;
  if (d <= w) return [x + w - d, y + h]; d -= w;
  return [x, y + h - d];
}
function quadPoint([a, c, b], k) { const u = 1 - k; return [u * u * a[0] + 2 * u * k * c[0] + k * k * b[0], u * u * a[1] + 2 * u * k * c[1] + k * k * b[1]]; }
// Where the drawing's tip is: the box 11.9 → 12.5 s, over to the note, the note 12.7 → 13.1 s,
// the arrow from the note's end to the box 13.1 → 13.5 s.
export function drawTipAt(t) {
  if (t < 12.5) return rectPoint(BOX, (t - 11.9) / 0.6);
  if (t < 12.7) return mix(rectPoint(BOX, 1), [LBL[0], LBL[1] - 4], (t - 12.5) / 0.2);
  if (t < 13.1) return [LBL[0] + LBL[2] * clamp01((t - 12.7) / 0.4), LBL[1] - 4];
  return quadPoint(ARROW, clamp01((t - 13.1) / 0.4));
}
function mix(a, b, k) { k = smooth(k); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }

// The robot, in scene units: it trails the pointer, except from 9.7 to 15.6 s, when it flies
// to the browser's address field, types the search, flies to the result, draws and steps aside.
export function robotAt(t, H = 800 * 17.6 / 28) {
  const [lx, ly] = pointerAt((((t - 0.07) % LOOP) + LOOP) % LOOP), trail = [lx * 800 + 34.2, ly * H + 38];   // a stiff spring
  const on = (p) => [p[0] + 8, p[1] + 8];
  if (t < 9.7 || t >= 15.6) return trail;
  if (t < 10.1) return mix(trail, on(barTip(0)), (t - 9.7) / 0.4);
  if (t < 11.3) return on(barTip(typedAt(t)));
  if (t < 11.9) return mix(on(barTip(SEARCH.length)), on(drawTipAt(11.9)), (t - 11.3) / 0.6);
  if (t < 13.5) return on(drawTipAt(t));
  const rest = [BX + 336, BY + 252];                     // stepped aside, so the arrowhead shows
  if (t < 15.0) return mix(on(drawTipAt(13.5)), rest, (t - 13.5) / 0.3);
  return mix(rest, trail, (t - 15.0) / 0.6);
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

function drawMenuBar(ctx, W, s, phase, browser) {
  const h = 22 * s;
  ctx.fillStyle = 'rgba(8,14,22,.72)'; ctx.fillRect(0, 0, W, h);
  ctx.fillStyle = 'rgba(207,232,255,.08)'; ctx.fillRect(0, h - s, W, s);
  ctx.textBaseline = 'middle'; ctx.font = `600 ${10.5 * s}px ${UI}`; ctx.fillStyle = '#eef4fb';
  const app = browser ? 'Browser' : 'Code';             // the frontmost app
  let x = 16 * s; ctx.fillText(app, x, h / 2); x += ctx.measureText(app).width + 16 * s;
  ctx.font = `${10.5 * s}px ${UI}`; ctx.fillStyle = 'rgba(238,244,251,.82)';
  for (const m of browser ? ['File', 'Edit', 'View', 'History', 'Bookmarks', 'Window', 'Help'] : ['File', 'Edit', 'Selection', 'View', 'Go', 'Window', 'Help']) { ctx.fillText(m, x, h / 2); x += ctx.measureText(m).width + 14 * s; }
  const clock = 'Tue 14:32'; let rx = W - 16 * s - ctx.measureText(clock).width;
  ctx.fillText(clock, rx, h / 2);
  rx -= 30 * s;                                          // battery
  ctx.strokeStyle = 'rgba(238,244,251,.75)'; ctx.lineWidth = s; roundRect(ctx, rx, h / 2 - 4.5 * s, 18 * s, 9 * s, 2.5 * s); ctx.stroke();
  ctx.fillStyle = 'rgba(238,244,251,.8)'; ctx.fillRect(rx + 2 * s, h / 2 - 2.5 * s, 11 * s, 5 * s); ctx.fillRect(rx + 18.6 * s, h / 2 - 2 * s, 1.4 * s, 4 * s);
  rx -= 22 * s;                                          // wi-fi
  ctx.lineWidth = 1.4 * s; ctx.lineCap = 'round';
  for (const r of [3, 6, 9]) { ctx.beginPath(); ctx.arc(rx + 7 * s, h / 2 + 4.5 * s, r * s, -2.4, -0.74); ctx.stroke(); }
  rx -= 30 * s;                                          // Cursor Buddy, lit in the state colour while it works
  const on = phase !== 'idle', col = phase === 'answer' || phase === 'acting' || phase === 'drawing' ? C.answer : phase === 'thinking' ? C.think : on ? C.listen : 'rgba(238,244,251,.85)';
  if (on) { ctx.fillStyle = 'rgba(207,232,255,.14)'; roundRect(ctx, rx - 5 * s, 3 * s, 25 * s, h - 6 * s, 4 * s); ctx.fill(); }
  drawBuddyGlyph(ctx, rx + 0.5 * s, h / 2 - 6.5 * s, s, col);
  return h;
}

function drawDesktop(ctx, W, H, s, phase, t) {
  drawWallpaper(ctx, W, H);
  const mb = drawMenuBar(ctx, W, s, phase, t >= 9.5 && t < 15.3);
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
  const col = phase === 'listening' || phase === 'transcribing' ? C.listen : phase === 'thinking' ? C.think : phase === 'idle' ? C.idle : C.answer;
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

// BuddyView: a sharp box, a 2 pt state-colour border, mono text. `right` anchors its right edge.
function drawBubble(ctx, { x, y, right = false, s, col, hdr, body, alpha, maxW, dim = false }) {
  if (alpha <= 0) return;
  const pad = 14 * s, fs = 13 * s, lh = fs + 6 * s, hdrH = 11 * s + 8 * s;
  ctx.font = `${fs}px ${MONO}`;
  const lines = body.flatMap((b) => (typeof b === 'string' ? wrap(ctx, b, maxW - pad * 2).map((l) => [l, C.ink]) : [b]));
  let w = Math.max(...lines.map(([l]) => ctx.measureText(l).width));
  ctx.font = `${11 * s}px ${MONO}`; w = Math.min(maxW, Math.max(w, ctx.measureText(hdr).width) + pad * 2);
  const h = pad * 1.6 + hdrH + lines.length * lh, bx = right ? x - w : x, by = y;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 2 * s;
  ctx.fillStyle = C.bubble; roundRect(ctx, bx, by, w, h, 2 * s); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = col; ctx.lineWidth = 2 * s; roundRect(ctx, bx + s, by + s, w - 2 * s, h - 2 * s, 2 * s); ctx.stroke();
  ctx.textBaseline = 'top';
  ctx.font = `${11 * s}px ${MONO}`; ctx.fillStyle = 'rgba(233,238,247,.45)';
  ctx.fillText(hdr, bx + pad, by + pad * 0.8);
  ctx.font = `${fs}px ${MONO}`;
  lines.forEach(([ln, c], i) => { ctx.fillStyle = dim ? 'rgba(233,238,247,.65)' : c; ctx.fillText(ln, bx + pad, by + pad * 0.8 + hdrH + i * lh); });
  ctx.restore();
}

// The first ask's bubble, right of the robot: "thinking…", then the answer streams in.
function drawAnswer(ctx, rx, ry, s, t, W) {
  if (t < 3.1 || t >= 7.4) return;
  const alpha = Math.min(clamp01((t - 3.1) / 0.15), 1 - clamp01((t - 7.0) / 0.4));
  const thinking = t < 3.7, maxW = Math.min(330 * s, W - rx - 94 * s);
  const body = thinking ? ['thinking…'] : [A.slice(0, Math.max(1, Math.floor(clamp01((t - 3.7) / 1.0) * A.length)))];
  ctx.font = `${13 * s}px ${MONO}`;
  const h = 14 * s * 1.6 + 19 * s + (thinking ? 1 : wrap(ctx, A, maxW - 28 * s).length) * 19 * s;   // centred on the final height
  drawBubble(ctx, { x: rx + 70 * s, y: ry + 24 * s - h / 2 + (1 - alpha) * 4 * s, s, col: thinking ? C.think : C.answer, hdr: `> ${Q}`, body, alpha, maxW: thinking ? 400 * s : maxW, dim: thinking });
}

// The second ask's bubble, under the pointer and left of the browser: its steps, live.
const STEPS = [[9.3, 9.7, 'opening the browser', 'opened the browser'], [9.7, 11.0, 'typing your search', 'typed your search'],
  [11.0, 11.9, 'reading the results', 'found the fix'], [11.9, 13.5, 'drawing where it goes', 'drew where it goes']];
function drawSteps(ctx, px, py, s, t) {
  if (t < 8.9 || t >= 15.4) return;
  const alpha = Math.min(clamp01((t - 8.9) / 0.15), 1 - clamp01((t - 15.0) / 0.4));
  const body = t < 9.3 ? ['thinking…'] : STEPS.filter(([a]) => t >= a).map(([, b, doing, done]) => (t >= b ? [`✓ ${done}`, C.ink] : [`› ${doing}`, C.answer]));
  drawBubble(ctx, { x: (BX - 10) * s, y: py + 56 * s, right: true, s, col: t < 9.3 ? C.think : C.answer, hdr: `> ${Q2}`, body, alpha, maxW: 300 * s, dim: t < 9.3 });
}

// The browser: it opens 9.3 → 9.7 s, the buddy types the search 10.1 → 11.0 s, the results load
// 11.0 → 11.3 s, and it closes 15.0 → 15.5 s. Dark mode, fictional pages (*.example).
const SNIP = [
  [['const ', K], ['res = ', X], ['await ', K], ['fetch', F], ['(url);', X]],
  [['if ', K], ['(!res.ok) ', X], ['throw new ', K], ['Error', T], ['(res.status);', X]],
  [['const ', K], ['data = ', X], ['await ', K], ['res.', X], ['json', F], ['();', X]],
];
function drawBrowser(ctx, W, H, s, t) {
  if (t < 9.3 || t >= 15.5) return;
  const open = smooth((t - 9.3) / 0.4) * (1 - smooth((t - 15.0) / 0.5));
  const bh = H / s - BY - 20, u = (v) => v * s;
  ctx.save(); ctx.globalAlpha = open;
  const k = 0.94 + 0.06 * open, ox = u(BX + BW / 2), oy = u(BY + bh / 2);
  ctx.translate(ox, oy); ctx.scale(k, k); ctx.translate(-ox, -oy);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = u(30); ctx.shadowOffsetY = u(12);
  ctx.fillStyle = '#0f141c'; roundRect(ctx, u(BX), u(BY), u(BW), u(bh), u(10)); ctx.fill(); ctx.restore();
  ctx.save(); roundRect(ctx, u(BX), u(BY), u(BW), u(bh), u(10)); ctx.clip();
  ctx.fillStyle = '#1a212d'; ctx.fillRect(u(BX), u(BY), u(BW), u(42));           // toolbar
  ctx.fillStyle = 'rgba(207,232,255,.08)'; ctx.fillRect(u(BX), u(BY + 42), u(BW), s);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(u(BX + 16 + i * 17), u(BY + 21), u(5.2), 0, 7); ctx.fill(); });
  const [fx, fy, fw, fh] = BAR, n = typedAt(t), focus = t >= 9.9 && t < 11.0;
  ctx.fillStyle = '#0d121a'; roundRect(ctx, u(fx), u(fy), u(fw), u(fh), u(7)); ctx.fill();
  if (focus) { ctx.strokeStyle = 'rgba(79,210,255,.7)'; ctx.lineWidth = 1.5 * s; ctx.stroke(); }
  ctx.textBaseline = 'middle'; ctx.font = `${11 * s}px ${UI}`;
  const text = t >= 11.0 ? SEARCH : SEARCH.slice(0, n);
  if (!text) { ctx.fillStyle = 'rgba(207,232,255,.38)'; ctx.fillText('Search or enter website name', u(fx + 12), u(fy + fh / 2)); }
  else { ctx.fillStyle = '#eef4fb'; ctx.fillText(text, u(fx + 12), u(fy + fh / 2)); }
  if (focus && (t % 0.5) < 0.3) { const cx = u(fx + 12) + ctx.measureText(text).width + s; ctx.fillStyle = '#4fd2ff'; ctx.fillRect(cx, u(fy + 6), 1.2 * s, u(fh - 12)); }
  if (t >= 11.0 && t < 11.4) { ctx.fillStyle = '#4f9dff'; ctx.fillRect(u(fx + 4), u(fy + fh - 2.5), u((fw - 8) * smooth((t - 11.0) / 0.3)), 2 * s); }   // loading
  const res = smooth((t - 11.2) / 0.2);
  if (res < 1) {                                          // the start page: favourites
    ctx.globalAlpha = open * (1 - res);
    ctx.font = `600 ${10 * s}px ${UI}`; ctx.fillStyle = 'rgba(207,232,255,.6)'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Favourites', u(BX + 28), u(BY + 82));
    ['Docs', 'Mail', 'Notes', 'Repo', 'News'].forEach((name, i) => {
      const tx = BX + 28 + i * 66;
      ctx.fillStyle = ['#2a4a6b', '#3b3a6b', '#5a4a2a', '#24523f', '#4a2f4a'][i]; roundRect(ctx, u(tx), u(BY + 94), u(48), u(48), u(10)); ctx.fill();
      ctx.fillStyle = '#eef4fb'; ctx.textAlign = 'center'; ctx.font = `700 ${18 * s}px ${UI}`; ctx.fillText(name[0], u(tx + 24), u(BY + 124));
      ctx.font = `${9.5 * s}px ${UI}`; ctx.fillStyle = 'rgba(207,232,255,.7)'; ctx.fillText(name, u(tx + 24), u(BY + 158)); ctx.textAlign = 'left';
    });
  }
  if (res > 0) {                                          // the results
    ctx.globalAlpha = open * res; ctx.textBaseline = 'alphabetic';
    ctx.font = `${10 * s}px ${UI}`; ctx.fillStyle = 'rgba(207,232,255,.5)';
    ctx.fillText(`Results for “${SEARCH}”`, u(BX + 28), u(BY + 70));
    const result = (y, url, title, snippet) => {
      ctx.font = `${9.5 * s}px ${UI}`; ctx.fillStyle = 'rgba(160,214,190,.75)'; ctx.fillText(url, u(BX + 28), u(y));
      ctx.font = `600 ${14 * s}px ${UI}`; ctx.fillStyle = '#8ab4ff'; ctx.fillText(title, u(BX + 28), u(y + 20));
      if (snippet) { ctx.font = `${10.5 * s}px ${UI}`; ctx.fillStyle = 'rgba(207,232,255,.7)'; ctx.fillText(snippet, u(BX + 28), u(y + 38)); }
      else { ctx.fillStyle = 'rgba(207,232,255,.14)'; ctx.fillRect(u(BX + 28), u(y + 30), u(330), u(6)); ctx.fillRect(u(BX + 28), u(y + 44), u(250), u(6)); }
    };
    result(BY + 96, 'docs.example › fetch › errors', 'Check the response before you read it', 'A failed request still resolves. Check ok before the body.');
    ctx.fillStyle = '#0a0f16'; roundRect(ctx, u(BX + 28), u(BY + 152), u(BW - 56), u(72), u(6)); ctx.fill();
    ctx.strokeStyle = 'rgba(207,232,255,.1)'; ctx.lineWidth = s; ctx.stroke();
    ctx.font = `${11 * s}px ${MONO}`; ctx.textBaseline = 'middle';
    const cw = ctx.measureText('0').width;
    SNIP.forEach((runs, i) => { let col = 0; for (const [txt, c] of runs) { ctx.fillStyle = c; ctx.fillText(txt, u(BX + 40) + col * cw, u(BY + 170 + i * 18)); col += txt.length; } });
    ctx.textBaseline = 'alphabetic';
    result(BY + 292, 'guides.example › async › errors', 'Handling errors in async handlers');
    result(BY + 372, 'forum.example › t › fetch-ok', 'Why does fetch not throw on a 404?');
  }
  ctx.restore(); ctx.restore();
}

// The drawing, over the browser: a box round the guard line, the note, an arrow from the note
// to the box, each stroked as the robot's tip passes (drawTipAt). Gone with the browser.
function drawMarks(ctx, s, t) {
  if (t < 11.9 || t >= 15.3) return;
  const a = 1 - smooth((t - 15.0) / 0.3), u = (v) => v * s;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.answer; ctx.fillStyle = C.answer;
  ctx.lineWidth = 2.5 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(125,255,176,.55)'; ctx.shadowBlur = 8 * s;
  const kb = clamp01((t - 11.9) / 0.6), N = 64;           // the box
  ctx.beginPath(); for (let i = 0; i <= N; i++) { const [x, y] = rectPoint(BOX, kb * i / N); i ? ctx.lineTo(u(x), u(y)) : ctx.moveTo(u(x), u(y)); } ctx.stroke();
  const kl = clamp01((t - 12.7) / 0.4);                    // the note, revealed left to right
  if (kl > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(u(LBL[0] - 4), u(LBL[1] - 18), u((LBL[2] + 12) * kl), u(26)); ctx.clip();
    ctx.shadowBlur = 0; ctx.font = `600 ${12.5 * s}px ${UI}`; ctx.textBaseline = 'alphabetic'; ctx.fillText(NOTE, u(LBL[0]), u(LBL[1]));
    ctx.restore();
  }
  const ka = clamp01((t - 13.1) / 0.4);                    // the arrow, note → box
  if (ka > 0) {
    ctx.beginPath(); for (let i = 0; i <= 32; i++) { const [x, y] = quadPoint(ARROW, ka * i / 32); i ? ctx.lineTo(u(x), u(y)) : ctx.moveTo(u(x), u(y)); } ctx.stroke();
    if (ka > 0.9) {
      const [x, y] = quadPoint(ARROW, 1), [qx, qy] = quadPoint(ARROW, 0.85), ang = Math.atan2(y - qy, x - qx), L = 9;
      ctx.beginPath(); ctx.moveTo(u(x - L * Math.cos(ang - 0.5)), u(y - L * Math.sin(ang - 0.5))); ctx.lineTo(u(x), u(y));
      ctx.lineTo(u(x - L * Math.cos(ang + 0.5)), u(y - L * Math.sin(ang + 0.5))); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawKeycap(ctx, W, H, s, t) {                    // "option + space" held, bottom right of the editor, while listening
  const a = Math.max(...[[1.0, 2.6], [7.4, 8.6]].map(([on, off]) => Math.min(clamp01((t - on) / 0.15), 1 - clamp01((t - off) / 0.2))));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a * 0.9;
  ctx.font = `${12 * s}px ${MONO}`; ctx.textBaseline = 'middle';
  const label = 'holding option + space', w = ctx.measureText(label).width + 28 * s, x = W * 0.948 - 16 * s - w, y = H - 66 * s;
  ctx.fillStyle = 'rgba(79,224,255,.12)'; roundRect(ctx, x, y, w, 26 * s, 13 * s); ctx.fill();
  ctx.strokeStyle = 'rgba(79,224,255,.6)'; ctx.lineWidth = 1 * s; ctx.stroke();
  ctx.fillStyle = C.listen; ctx.fillText(label, x + 14 * s, y + 13 * s);
  ctx.restore();
}

// One frame at absolute time `sec` (loops every LOOP s). w/h in canvas pixels.
export function drawBuddy(ctx, w, h, sec) {
  const t = ((sec % LOOP) + LOOP) % LOOP, s = w / 800;
  const phase = phaseAt(t);
  drawDesktop(ctx, w, h, s, phase, t);
  const [px, py] = pointerAt(t), cx = px * w, cy = py * h;
  const [rx, ry] = robotAt(t, h / s).map((v) => v * s);
  drawKeycap(ctx, w, h, s, t);
  drawBrowser(ctx, w, h, s, t);
  drawMarks(ctx, s, t);
  drawSteps(ctx, cx, cy, s, t);
  drawRobot(ctx, rx, ry, s, phase, t);
  drawPointer(ctx, cx, cy, s);
  drawAnswer(ctx, rx, ry, s, t, w);
}
