// agent.js — Agent Control's process, drawn on a 2D canvas (2026-10-14, Yarin: "a live demo
// non interactable to show the process and how it works"). Replaces the walkthrough clip on
// the Agent Control stop, the way buddy.js replaces a screenshot on Cursor Buddy's.
// Three requests travel the product's pipeline — agent → personal-data scrub → guardrails
// (enforced in the connector) → outcome — and each one lands in the append-only audit log:
// an invoice under the ₪5,000 auto-approve ceiling goes through, one over it waits in the
// action inbox until the manager approves it, and a supplier's payment-terms request is
// blocked with nothing sent. Every name, number and rule is the public demo's own mock data
// (agent-control-demo src/data: agents, guardrails, inbox, audit), a fictional company, and
// the scene says so. Colours from its globals.css. Pure: drawAgent(ctx, w, h, seconds) paints
// one frame for any time, so it serves the WebGL panel texture and the phone figure.

export const LOOP = 16;                                   // seconds per cycle
export const STILL = 10.6;                                // reduced motion: the held invoice in the inbox, the pointer on Approve, the next request on its way

const C = {
  bg: '#07090d', panel: '#11161f', panel2: '#161c27', line: 'rgba(255,255,255,.08)', line2: 'rgba(255,255,255,.16)',
  fg: '#eef2f7', dim: '#9aa5b4', faint: '#5c6675', mint: '#3dd6a3', ink: '#06110c', warn: '#e8b13f', danger: '#ff6b6b', cyan: '#7fd8ff',
};
const OUT = {
  approved: { col: C.mint, tag: 'APPROVED' },
  held: { col: C.warn, tag: 'HELD' },
  blocked: { col: C.danger, tag: 'BLOCKED' },
  setting: { col: C.cyan, tag: 'SETTING' },
};
const UI = '"Schibsted", -apple-system, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

// The three requests, each `at` seconds into the loop.
export const RUNS = [
  { at: 0.3, agent: 'INVOICE AGENT', title: 'Invoice 44201 · PO-2288', sub: '₪3,120', pii: ['bank details'], scrub: 'Bank details removed',
    rule: '✓ Under the ₪5,000 ceiling', out: 'approved', outText: 'Auto-approved', actor: 'Invoice agent', log: 'Invoice 44201 · ₪3,120 auto-approved', time: '09:01' },
  { at: 5.2, agent: 'INVOICE AGENT', title: 'Invoice 44192', sub: '₪8,400 over its PO', pii: ['bank details'], scrub: 'Bank details removed',
    rule: '✕ Over the ₪5,000 ceiling', out: 'held', outText: 'Waits for a manager', actor: 'Invoice agent', log: 'Invoice 44192 · over the ₪5,000 ceiling', time: '09:03' },
  { at: 10.1, agent: 'SUPPLIER EMAIL AGENT', title: 'Hangzhou Ceramics', sub: 'asks for net+60 terms', pii: ['2 phones', '1 name'], scrub: '2 phones · 1 name removed',
    rule: '✕ Payment terms: off', out: 'blocked', outText: 'Nothing sent', actor: 'Supplier email agent', log: 'Asked to change payment terms · nothing sent', time: '09:05' },
];
export const RUN_LEN = 4.9;                               // appear, travel, scrub, check, stamp, leave
export const APPROVE_AT = 10.9;                           // the manager's click on the held invoice
const INBOX_IN = RUNS[1].at + 4.0, INBOX_OUT = APPROVE_AT + 0.7, FADE = 15.2;

// Where a run is at loop time t: its index and the step it is on, or null between runs.
export function runAt(t) {
  for (let i = RUNS.length - 1; i >= 0; i--) {
    const r = t - RUNS[i].at;
    if (r >= 0 && r < RUN_LEN) return { i, r, step: r < 0.5 ? 'arrive' : r < 1.2 ? 'to-scrub' : r < 1.9 ? 'scrub' : r < 2.6 ? 'to-guard' : r < 3.3 ? 'check' : r < 4.0 ? 'to-outcome' : 'stamped' };
  }
  return null;
}

// The audit log at time t, newest first: two standing rows, then a row per stamped outcome
// and the manager's approval. Empty of new rows at the loop's start, so the loop is seamless.
export function auditAt(t) {
  const rows = [
    { at: -1, time: '08:47', tag: 'held', actor: 'Order agent', log: 'KX-42 substitute for PO-2291 · waits for a manager' },
    { at: -2, time: 'Yesterday', tag: 'setting', actor: 'Noa Berman · admin', log: 'Auto-approve ceiling set to ₪5,000' },
  ];
  const live = t < FADE + 0.6;                            // the loop's new rows are gone once it resets
  for (const r of RUNS) if (live && t >= r.at + 4.0) rows.push({ at: r.at + 4.0, time: r.time, tag: r.out, actor: r.actor, log: r.log });
  if (live && t >= APPROVE_AT + 0.1) rows.push({ at: APPROVE_AT + 0.1, time: '09:04', tag: 'approved', actor: 'Dana Levi · manager', log: 'Invoice 44192 approved for payment' });
  return rows.sort((a, b) => b.at - a.at);
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const outCubic = (v) => 1 - Math.pow(1 - clamp01(v), 3);
const lerp = (a, b, k) => a + (b - a) * k;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function alpha(hex, a) {                                  // '#rrggbb' → rgba at a
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function pill(ctx, x, y, text, col, s, size = 8.5) {      // the demo's tags: 12 % tint, 30 % border, mono caps
  ctx.font = `600 ${size * s}px ${MONO}`; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 12 * s, h = (size + 7) * s;
  ctx.fillStyle = alpha(col, 0.12); roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = alpha(col, 0.3); ctx.lineWidth = s; ctx.stroke();
  ctx.fillStyle = col; ctx.fillText(text, x + 6 * s, y + h / 2 + 0.5 * s);
  return w;
}
function fit(ctx, text, maxW) {                           // ellipsis past maxW
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text; while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
function panelBox(ctx, x, y, w, h, s) {
  ctx.fillStyle = C.panel; roundRect(ctx, x, y, w, h, 14 * s); ctx.fill();
  ctx.strokeStyle = C.line; ctx.lineWidth = s; ctx.stroke();
}

function drawTop(ctx, W, s, t) {
  ctx.fillStyle = 'rgba(17,22,31,.85)'; ctx.fillRect(0, 0, W, 36 * s);
  ctx.fillStyle = C.line; ctx.fillRect(0, 36 * s - s, W, s);
  // the brand mark: a gate (two posts and a bar) in mint
  ctx.save(); ctx.translate(20 * s, 11 * s); ctx.strokeStyle = C.mint; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(1 * s, 14 * s); ctx.lineTo(1 * s, 1 * s); ctx.moveTo(13 * s, 14 * s); ctx.lineTo(13 * s, 1 * s); ctx.moveTo(1 * s, 6 * s); ctx.lineTo(13 * s, 6 * s); ctx.stroke(); ctx.restore();
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${13 * s}px ${UI}`; ctx.fillStyle = C.fg; ctx.fillText('Agent Control', 42 * s, 18 * s);
  const bw = ctx.measureText('Agent Control').width;
  ctx.font = `${10 * s}px ${UI}`; ctx.fillStyle = C.faint; ctx.fillText('Livne Imports · demo data, fictional company', 52 * s + bw, 18.5 * s);
  // right: the live dot and the signed-in manager
  ctx.font = `600 ${10 * s}px ${UI}`; const who = 'Dana Levi · Manager', ww = ctx.measureText(who).width;
  let x = W - 20 * s - ww; ctx.fillStyle = C.dim; ctx.fillText(who, x, 18 * s);
  ctx.font = `600 ${9 * s}px ${MONO}`; const lw = ctx.measureText('LIVE').width; x -= 22 * s + lw;
  ctx.fillStyle = C.mint; ctx.fillText('LIVE', x + 12 * s, 18.5 * s);
  const ph = (t % 1.6) / 1.6;
  ctx.beginPath(); ctx.arc(x + 4 * s, 18 * s, (3 + 6 * ph) * s, 0, Math.PI * 2); ctx.strokeStyle = alpha(C.mint, 0.5 * (1 - ph)); ctx.lineWidth = s; ctx.stroke();
  ctx.beginPath(); ctx.arc(x + 4 * s, 18 * s, 3 * s, 0, Math.PI * 2); ctx.fillStyle = C.mint; ctx.fill();
}

function drawKpis(ctx, W, s, t) {
  const handled = 128 + (t >= RUNS[0].at + 4.0 && t < FADE + 0.6 ? 1 : 0) + (t >= APPROVE_AT && t < FADE + 0.6 ? 1 : 0);
  const blocked = 4 + (t >= RUNS[2].at + 4.0 && t < FADE + 0.6 ? 1 : 0);
  const fade = t >= FADE ? Math.abs(1 - clamp01((t - FADE) / 0.6) * 2) : 1;   // the numbers dip out and back as the loop resets
  const tiles = [
    ['Handled automatically today', String(handled), C.mint, [RUNS[0].at + 4.0, APPROVE_AT]],
    ['Blocked', String(blocked), C.danger, [RUNS[2].at + 4.0]],
    ['Time saved', '6.2 h', C.fg, []],
  ];
  const gap = 12 * s, x0 = 20 * s, w = (W - 2 * x0 - 2 * gap) / 3, y = 48 * s, h = 52 * s;
  tiles.forEach(([label, val, col, bumps], i) => {
    const x = x0 + i * (w + gap);
    panelBox(ctx, x, y, w, h, s);
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${10 * s}px ${UI}`; ctx.fillStyle = C.dim; ctx.fillText(label, x + 14 * s, y + 19 * s);
    const bump = Math.max(0, ...bumps.map((b) => (t >= b && t < b + 0.6 ? 1 - (t - b) / 0.6 : 0)));
    ctx.save(); ctx.globalAlpha = fade;
    ctx.font = `800 ${(22 + 3 * bump) * s}px ${UI}`; ctx.fillStyle = col; ctx.fillText(val, x + 14 * s, y + 43 * s);
    ctx.restore();
  });
}

// pipeline geometry (reference units; scaled by s)
const NODE_X = [122, 308, 494, 680], NODE_Y = 220, CARD_W = 164, CARD_H = 62;
const NODES = [
  ['Agent', 'reads mail, matches invoices'],
  ['Personal-data scrub', 'names · phones · IDs · bank'],
  ['Guardrails', 'enforced in the connector'],
  ['Outcome', 'every action on the record'],
];

function nodeGlyph(ctx, i, x, y, s, col, verdict) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (i === 0) { roundRect(ctx, -7 * s, -5 * s, 14 * s, 11 * s, 3 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -5 * s); ctx.lineTo(0, -8 * s); ctx.stroke(); ctx.fillRect(-3.6 * s, -1.5 * s, 2 * s, 3 * s); ctx.fillRect(1.6 * s, -1.5 * s, 2 * s, 3 * s); }
  else if (i === 1) { for (const [yy, w] of [[-4, 12], [0, 8], [4, 12]]) { ctx.beginPath(); ctx.moveTo(-6 * s, yy * s); ctx.lineTo((-6 + w) * s, yy * s); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-7 * s, 6 * s); ctx.lineTo(7 * s, -6 * s); ctx.stroke(); }
  else if (i === 2) { ctx.beginPath(); ctx.moveTo(0, -8 * s); ctx.lineTo(7 * s, -5 * s); ctx.lineTo(6 * s, 3 * s); ctx.lineTo(0, 8 * s); ctx.lineTo(-6 * s, 3 * s); ctx.lineTo(-7 * s, -5 * s); ctx.closePath(); ctx.stroke(); }
  else if (verdict === 'blocked') { ctx.beginPath(); ctx.moveTo(-4.5 * s, -4.5 * s); ctx.lineTo(4.5 * s, 4.5 * s); ctx.moveTo(4.5 * s, -4.5 * s); ctx.lineTo(-4.5 * s, 4.5 * s); ctx.stroke(); }
  else if (verdict === 'held') { ctx.beginPath(); ctx.moveTo(-2.5 * s, -5 * s); ctx.lineTo(-2.5 * s, 5 * s); ctx.moveTo(2.5 * s, -5 * s); ctx.lineTo(2.5 * s, 5 * s); ctx.stroke(); }   // waiting
  else { ctx.beginPath(); ctx.moveTo(-5 * s, 0); ctx.lineTo(-1.5 * s, 4 * s); ctx.lineTo(5.5 * s, -4 * s); ctx.stroke(); }
  ctx.restore();
}

function drawPipeline(ctx, W, s, t) {
  const y0 = 112 * s, h = 160 * s;
  panelBox(ctx, 20 * s, y0, W - 40 * s, h, s);
  ctx.textBaseline = 'alphabetic'; ctx.font = `600 ${9 * s}px ${MONO}`; ctx.fillStyle = C.faint;
  ctx.fillText('HOW A REQUEST TRAVELS', 34 * s, y0 + 17 * s);
  const run = runAt(t), R = run && RUNS[run.i], out = R && OUT[R.out];
  const ny = NODE_Y * s;
  // the wires, with a pulse along the one the request is travelling
  for (let i = 0; i < 3; i++) {
    const a = (NODE_X[i] + 20) * s, b = (NODE_X[i + 1] - 20) * s;
    ctx.strokeStyle = C.line2; ctx.lineWidth = 1.2 * s; ctx.setLineDash([3 * s, 4 * s]); ctx.beginPath(); ctx.moveTo(a, ny); ctx.lineTo(b, ny); ctx.stroke(); ctx.setLineDash([]);
    const seg = run && { 0: 'to-scrub', 1: 'to-guard', 2: 'to-outcome' }[i] === run.step;
    if (seg) {
      const k = smooth(((run.r - [0.5, 1.9, 3.3][i]) / 0.7));
      const g = ctx.createLinearGradient(a, 0, b, 0), p = clamp01(k);
      g.addColorStop(Math.max(0, p - 0.25), alpha(C.cyan, 0)); g.addColorStop(p, alpha(C.cyan, 0.95)); g.addColorStop(Math.min(1, p + 0.001), alpha(C.cyan, 0));
      ctx.strokeStyle = g; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.moveTo(a, ny); ctx.lineTo(b, ny); ctx.stroke();
    }
  }
  // the nodes: lit while the request sits on them, the outcome in its verdict's colour
  const at = run ? { arrive: 0, scrub: 1, check: 2, stamped: 3 }[run.step] : undefined;
  NODES.forEach(([label, cap], i) => {
    const x = NODE_X[i] * s, on = at === i;
    let col = C.dim;
    if (on) col = i === 3 ? out.col : i === 2 ? (R.out === 'approved' ? C.mint : out.col) : C.cyan;
    if (on) { const rg = ctx.createRadialGradient(x, ny, 0, x, ny, 38 * s); rg.addColorStop(0, alpha(col, 0.28)); rg.addColorStop(1, alpha(col, 0)); ctx.fillStyle = rg; ctx.fillRect(x - 40 * s, ny - 40 * s, 80 * s, 80 * s); }
    ctx.beginPath(); ctx.arc(x, ny, 16 * s, 0, Math.PI * 2); ctx.fillStyle = C.panel2; ctx.fill();
    ctx.strokeStyle = on ? col : C.line2; ctx.lineWidth = (on ? 1.6 : 1) * s; ctx.stroke();
    nodeGlyph(ctx, i, x, ny, s, on ? col : C.dim, on && i === 3 ? R.out : '');   // the outcome shows its verdict
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `600 ${10.5 * s}px ${UI}`; ctx.fillStyle = on ? C.fg : C.dim; ctx.fillText(label, x, ny + 31 * s);
    // the caption turns into what this node just did, while the request is past it
    let c = cap, cc = C.faint;
    if (run && i === 1 && run.r >= 1.5) { c = R.scrub; cc = C.cyan; }
    if (run && i === 2 && run.r >= 2.9) { c = R.rule; cc = R.out === 'approved' ? C.mint : out.col; }
    if (run && i === 3 && run.r >= 4.0) { c = R.outText; cc = out.col; }
    ctx.font = `${9.5 * s}px ${UI}`; ctx.fillStyle = cc; ctx.fillText(c, x, ny + 44 * s);
    ctx.textAlign = 'left';
  });
  if (run) drawRequest(ctx, s, run, R, out);
}

function drawRequest(ctx, s, run, R, out) {               // the request card riding above the nodes
  const r = run.r;
  const legs = [[0.5, 1.2, 0], [1.9, 2.6, 1], [3.3, 4.0, 2]];
  let xi = 0;
  for (const [a, b, i] of legs) { if (r >= b) xi = i + 1; else if (r > a) { xi = i + smooth((r - a) / (b - a)); break; } }
  const cx = (xi % 1 ? lerp(NODE_X[Math.floor(xi)], NODE_X[Math.ceil(xi)], xi % 1) : NODE_X[xi]) * s;
  const a = Math.min(outCubic(r / 0.5), 1 - clamp01((r - 4.55) / 0.35));
  const w = CARD_W * s, h = CARD_H * s, x = cx - w / 2, y = (134 + 8 * (1 - outCubic(r / 0.5))) * s;
  ctx.save(); ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 14 * s; ctx.shadowOffsetY = 4 * s;
  ctx.fillStyle = C.panel2; roundRect(ctx, x, y, w, h, 11 * s); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = r >= 4.0 ? alpha(out.col, 0.7) : C.line2; ctx.lineWidth = s; roundRect(ctx, x, y, w, h, 11 * s); ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${8 * s}px ${MONO}`; ctx.fillStyle = C.faint; ctx.fillText(R.agent, x + 11 * s, y + 14 * s);
  ctx.font = `700 ${11.5 * s}px ${UI}`; ctx.fillStyle = C.fg; ctx.fillText(fit(ctx, R.title, w - 22 * s), x + 11 * s, y + 30 * s);
  ctx.font = `${10 * s}px ${UI}`; ctx.fillStyle = C.dim; ctx.fillText(R.sub, x + 11 * s, y + 43 * s);
  // the personal data riding along: amber pills that the scrub strikes out
  const k = clamp01((r - 1.2) / 0.6);
  let px = x + 11 * s;
  for (const p of R.pii) {
    ctx.save(); ctx.globalAlpha = a * (1 - 0.75 * k);
    const pw = pill(ctx, px, y + 47 * s, p, k > 0 ? C.faint : C.warn, s, 7.5);
    if (k > 0) { ctx.strokeStyle = C.cyan; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(px + 3 * s, y + 54 * s); ctx.lineTo(px + 3 * s + (pw - 6 * s) * k, y + 54 * s); ctx.stroke(); }
    ctx.restore();
    px += pw + 4 * s;
  }
  if (k >= 1) { ctx.font = `600 ${7.5 * s}px ${MONO}`; ctx.fillStyle = C.cyan; ctx.textBaseline = 'middle'; ctx.fillText('REMOVED', px + 2 * s, y + 54.5 * s); }
  // the verdict stamps in at the outcome
  if (r >= 4.0) {
    const st = outCubic((r - 4.0) / 0.25);
    ctx.save(); ctx.font = `700 ${8.5 * s}px ${MONO}`;
    const tw = ctx.measureText(out.tag).width + 12 * s;
    ctx.translate(x + w - tw / 2 - 9 * s, y + 13 * s); ctx.scale(1.35 - 0.35 * st, 1.35 - 0.35 * st); ctx.globalAlpha = a * st;
    pill(ctx, -tw / 2, -7.75 * s, out.tag, out.col, s);
    ctx.restore();
  }
  ctx.restore();
}

function drawInbox(ctx, s, t) {
  const x0 = 20 * s, y0 = 284 * s, w = 372 * s, h = 206 * s;
  panelBox(ctx, x0, y0, w, h, s);
  const shown = t >= INBOX_IN && t < INBOX_OUT + 0.4;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${12 * s}px ${UI}`; ctx.fillStyle = C.fg; ctx.fillText('Action inbox', x0 + 14 * s, y0 + 21 * s);
  const n = t >= INBOX_IN && t < APPROVE_AT ? 'One thing needs you' : 'Nothing needs you';
  ctx.font = `${10 * s}px ${UI}`; ctx.fillStyle = n.startsWith('One') ? C.warn : C.faint; ctx.textAlign = 'right';
  ctx.fillText(n, x0 + w - 14 * s, y0 + 21 * s); ctx.textAlign = 'left';
  // the empty state, under the card
  const e = 1 - (shown ? clamp01(Math.min((t - INBOX_IN) / 0.3, 1 - (t - INBOX_OUT) / 0.4)) : 0);
  if (e > 0.01) {
    ctx.save(); ctx.globalAlpha = e; ctx.textAlign = 'center';
    ctx.font = `${10.5 * s}px ${UI}`; ctx.fillStyle = C.faint;
    ctx.fillText('Under the ceiling, agents finish on their own.', x0 + w / 2, y0 + 82 * s);
    ctx.fillText('Anything past it waits here for a person.', x0 + w / 2, y0 + 98 * s);
    ctx.restore(); ctx.textAlign = 'left';
  }
  if (shown) {
    const inK = outCubic((t - INBOX_IN) / 0.45), outK = clamp01((t - INBOX_OUT) / 0.4);
    const cx = x0 + 12 * s, cy = y0 + 34 * s + 10 * s * (1 - inK), cw = w - 24 * s, ch = 104 * s * (1 - smooth(outK));
    const done = t >= APPROVE_AT + 0.05;
    ctx.save(); ctx.globalAlpha = inK * (1 - outK);
    ctx.beginPath(); ctx.rect(cx - 2 * s, cy - 2 * s, cw + 4 * s, ch + 4 * s); ctx.clip();
    ctx.fillStyle = C.panel2; roundRect(ctx, cx, cy, cw, 104 * s, 11 * s); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = s; ctx.stroke();
    ctx.fillStyle = done ? C.mint : C.warn; roundRect(ctx, cx, cy, 3 * s, 104 * s, 1.5 * s); ctx.fill();   // the 3 px start border
    pill(ctx, cx + 14 * s, cy + 10 * s, done ? 'APPROVED' : 'NEEDS YOU', done ? C.mint : C.warn, s);
    ctx.textBaseline = 'alphabetic'; ctx.font = `${9.5 * s}px ${UI}`; ctx.fillStyle = C.dim; ctx.fillText('Invoice agent', cx + 100 * s, cy + 22 * s);
    ctx.font = `${9 * s}px ${MONO}`; ctx.fillStyle = C.faint; ctx.textAlign = 'right'; ctx.fillText('09:03', cx + cw - 12 * s, cy + 22 * s); ctx.textAlign = 'left';
    ctx.font = `700 ${12 * s}px ${UI}`; ctx.fillStyle = C.fg; ctx.fillText('Invoice 44192 is ₪8,400 over its PO', cx + 14 * s, cy + 44 * s);
    ctx.font = `${10 * s}px ${UI}`; ctx.fillStyle = C.dim; ctx.fillText('Above the ₪5,000 auto-approve ceiling.', cx + 14 * s, cy + 59 * s);
    if (!done) {
      const press = t >= APPROVE_AT - 0.15 && t < APPROVE_AT + 0.05 ? 0.96 : 1;
      const bx = cx + 14 * s, by = cy + 70 * s, bw = 118 * s, bh = 24 * s;
      ctx.save(); ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(press, press);
      ctx.fillStyle = C.mint; roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 9 * s); ctx.fill();
      ctx.font = `700 ${10 * s}px ${UI}`; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Approve payment', 0, 0.5 * s);
      ctx.restore();
      ctx.strokeStyle = C.line2; ctx.lineWidth = s; roundRect(ctx, bx + bw + 8 * s, by, 124 * s, bh, 9 * s); ctx.stroke();
      ctx.font = `600 ${10 * s}px ${UI}`; ctx.fillStyle = C.dim; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Return to supplier', bx + bw + 70 * s, by + bh / 2 + 0.5 * s);
      ctx.textAlign = 'left';
    } else {
      const k = outCubic((t - APPROVE_AT) / 0.3);
      ctx.globalAlpha *= k; ctx.font = `600 ${10.5 * s}px ${UI}`; ctx.fillStyle = C.mint; ctx.textBaseline = 'alphabetic';
      ctx.fillText('Approved for payment · logged', cx + 14 * s, cy + 87 * s);
    }
    ctx.restore();
  }
  // the four agents, the active one's dot lit
  const run = runAt(t), active = run && run.r < 1.2 ? RUNS[run.i].actor : '';
  const agents = [['Supplier mail', 41, 'Supplier email agent'], ['Invoices', 63, 'Invoice agent'], ['Orders', 18, ''], ['Weekly report', 1, '']];
  let ax = x0 + 14 * s; const ay = y0 + h - 34 * s;
  ctx.font = `600 ${9 * s}px ${MONO}`; ctx.fillStyle = C.faint; ctx.textBaseline = 'alphabetic'; ctx.fillText('AGENTS TODAY', ax, ay - 8 * s);
  for (const [name, n, id] of agents) {
    ctx.font = `${9.5 * s}px ${UI}`;
    const label = `${name} ${n}`, lw = ctx.measureText(label).width + 22 * s;
    ctx.fillStyle = C.panel2; roundRect(ctx, ax, ay, lw, 20 * s, 10 * s); ctx.fill();
    const on = id && id === active;
    ctx.beginPath(); ctx.arc(ax + 9 * s, ay + 10 * s, (on ? 3.4 : 2.6) * s, 0, Math.PI * 2); ctx.fillStyle = on ? C.cyan : alpha(C.mint, 0.7); ctx.fill();
    ctx.fillStyle = on ? C.fg : C.dim; ctx.textBaseline = 'middle'; ctx.fillText(label, ax + 16 * s, ay + 10.5 * s);
    ax += lw + 6 * s;
  }
}

function drawAudit(ctx, W, s, t) {
  const x0 = 404 * s, y0 = 284 * s, w = W - x0 - 20 * s, h = 206 * s;
  panelBox(ctx, x0, y0, w, h, s);
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${12 * s}px ${UI}`; ctx.fillStyle = C.fg; ctx.fillText('Audit log', x0 + 14 * s, y0 + 21 * s);
  ctx.font = `600 ${8.5 * s}px ${MONO}`; ctx.fillStyle = C.faint; ctx.textAlign = 'right';
  ctx.fillText('APPEND-ONLY · KEPT 365 DAYS', x0 + w - 14 * s, y0 + 21 * s); ctx.textAlign = 'left';
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0 + 30 * s, w, h - 34 * s); ctx.clip();
  const rows = auditAt(t), rh = 32 * s, fade = 1 - clamp01((t - FADE) / 0.6);
  let y = y0 + 34 * s;
  rows.forEach((row) => {
    const age = t - row.at, k = row.at < 0 ? 1 : outCubic(age / 0.4);
    const a = (row.at < 0 ? 1 : fade) * k;
    y += (rh) * (row.at < 0 ? 1 : k) - rh;                 // a new row opens its slot as it stamps in
    ctx.save(); ctx.globalAlpha = a;
    if (row.at >= 0 && age < 1.2) { ctx.fillStyle = alpha(OUT[row.tag].col, 0.07 * (1 - age / 1.2)); ctx.fillRect(x0 + 6 * s, y, w - 12 * s, rh - 2 * s); }
    pill(ctx, x0 + 14 * s, y + rh / 2 - 7.5 * s, OUT[row.tag].tag, OUT[row.tag].col, s, 7.5);
    ctx.textBaseline = 'alphabetic'; ctx.font = `${8.5 * s}px ${MONO}`; ctx.fillStyle = C.faint; ctx.textAlign = 'right';
    ctx.fillText(row.time, x0 + w - 14 * s, y + 13 * s); ctx.textAlign = 'left';
    ctx.font = `600 ${10 * s}px ${UI}`; ctx.fillStyle = C.fg; ctx.fillText(row.actor, x0 + 92 * s, y + 13 * s);
    ctx.font = `${9.5 * s}px ${UI}`; ctx.fillStyle = C.dim; ctx.fillText(fit(ctx, row.log, w - 106 * s), x0 + 92 * s, y + 26 * s);
    ctx.restore();
    ctx.fillStyle = C.line; ctx.fillRect(x0 + 14 * s, y + rh - 1 * s, w - 28 * s, s);
    y += rh;
  });
  ctx.restore();
}

// The manager's pointer: in from the bottom right, onto Approve, a click, away.
export function pointerAt(t) {
  const target = [20 + 12 + 14 + 59, 284 + 34 + 70 + 13];  // Approve's centre (drawInbox's layout)
  const from = [760, 540], away = [330, 520];
  const t0 = APPROVE_AT - 1.3, t1 = APPROVE_AT - 0.3, t2 = APPROVE_AT + 0.4, t3 = APPROVE_AT + 1.5;
  if (t < t0 || t > t3) return null;
  if (t < t1) { const k = smooth((t - t0) / (t1 - t0)); return [lerp(from[0], target[0], k), lerp(from[1], target[1], k) - Math.sin(Math.PI * k) * 40]; }
  if (t < t2) return target;
  const k = smooth((t - t2) / (t3 - t2)); return [lerp(target[0], away[0], k), lerp(target[1], away[1], k)];
}
function drawPointer(ctx, x, y, s) {                     // the macOS arrow: white fill, black edge
  const k = 1.4 * s;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.2, 13.2); ctx.lineTo(7, 19.6); ctx.lineTo(9.6, 18.5);
  ctx.lineTo(6.9, 12.2); ctx.lineTo(12.2, 12.2); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.lineWidth = 1.1; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}

// One frame at absolute time `sec` (loops every LOOP s). w/h in canvas pixels.
export function drawAgent(ctx, w, h, sec) {
  const t = ((sec % LOOP) + LOOP) % LOOP, s = w / 800;
  ctx.save();
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
  const rg = ctx.createRadialGradient(w * 0.9, 0, 0, w * 0.9, 0, w * 0.55);   // the demo's faint mint bloom, top right
  rg.addColorStop(0, 'rgba(61,214,163,.10)'); rg.addColorStop(1, 'rgba(61,214,163,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
  ctx.scale(1, h / (503 * s));                            // the layout is authored at 800 × 503 (the 28 × 17.6 panel)
  drawTop(ctx, w, s, t);
  drawKpis(ctx, w, s, t);
  drawPipeline(ctx, w, s, t);
  drawInbox(ctx, s, t);
  drawAudit(ctx, w, s, t);
  const p = pointerAt(t);
  if (p) {
    if (t >= APPROVE_AT - 0.15 && t < APPROVE_AT + 0.35) {   // the click ring
      const k = clamp01((t - APPROVE_AT + 0.15) / 0.5);
      ctx.beginPath(); ctx.arc(p[0] * s, p[1] * s, (6 + 16 * k) * s, 0, Math.PI * 2); ctx.strokeStyle = alpha(C.mint, 0.7 * (1 - k)); ctx.lineWidth = 1.5 * s; ctx.stroke();
    }
    drawPointer(ctx, p[0] * s, p[1] * s, s);
  }
  ctx.restore();
}
