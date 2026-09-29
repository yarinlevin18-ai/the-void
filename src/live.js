// live.js — the live data layer (2026-09-17, Bluesky since 2026-09-22): a real
// public event stream flowing through the void, and the small data structures
// that account for it.
//
//  · createLiveModel() is pure and node-tested: a fixed ring buffer of the last
//    N events, a sliding-window rate (events / s over the last W ms), and a
//    top-k of the busiest sources kept with a binary min-heap.
//  · parseJetstream() turns one Bluesky Jetstream commit into the compact shape
//    the model stores — language, kind, length, embed. Never the text, never
//    the author: a stranger's words don't belong on a hiring page.
//  · connectLive() is the only impure part: a WebSocket on Bluesky's public
//    Jetstream (no key, no auth; posts only — likes/reposts/follows would push
//    it to ~170 events and ~90 KB a second). If no post arrives within a few
//    seconds — offline, blocked, no WebSocket — it tries the next host, then
//    falls back to a synthetic generator and says so through `state`, so the
//    strip never lies about the source. The site stays offline-capable: this
//    is the one optional request.

export const STREAM_URLS = [
  'wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post',
  'wss://jetstream1.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post',
  'wss://jetstream2.us-west.bsky.network/subscribe?wantedCollections=app.bsky.feed.post',
];
export const STREAM_URL = STREAM_URLS[0];

// ---- pure model --------------------------------------------------------------
export function createLiveModel({ ring = 64, window = 10000, k = 3 } = {}) {
  const buf = new Array(ring).fill(null);
  let head = 0, total = 0;
  const times = [];                     // sliding window of event timestamps (ms)
  const counts = new Map();             // source → count, for the top-k

  function push(evt, now = Date.now()) {
    buf[head] = evt; head = (head + 1) % ring; total++;
    times.push(now);
    while (times.length && now - times[0] > window) times.shift();
    counts.set(evt.source, (counts.get(evt.source) || 0) + 1);
    return total;
  }
  const recent = (n = ring) => {          // newest first
    const out = [];
    for (let i = 1; i <= Math.min(n, ring); i++) { const e = buf[(head - i + ring) % ring]; if (!e) break; out.push(e); }
    return out;
  };
  const rate = (now = Date.now()) => {
    while (times.length && now - times[0] > window) times.shift();
    return times.length / (window / 1000);
  };
  const topK = () => heapTopK(counts, k);
  const filled = () => Math.min(total, ring);
  return { push, recent, rate, topK, filled, size: ring, window, get total() { return total; }, get head() { return head; } };
}

// Top-k by count with a size-k binary min-heap: O(n log k) instead of sorting
// every source on every tick. Returns [{ source, count }] descending.
export function heapTopK(counts, k) {
  const heap = [];                                   // min-heap on count
  const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (heap[p].count <= heap[i].count) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const down = (i) => { for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
    if (l < heap.length && heap[l].count < heap[m].count) m = l;
    if (r < heap.length && heap[r].count < heap[m].count) m = r;
    if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } };
  for (const [source, count] of counts) {
    if (heap.length < k) { heap.push({ source, count }); up(heap.length - 1); }
    else if (count > heap[0].count) { heap[0] = { source, count }; down(0); }
  }
  return heap.sort((a, b) => b.count - a.count || (a.source < b.source ? -1 : 1));
}

// ---- Bluesky Jetstream commit → compact event ---------------------------------
// Keeps newly created posts; drops deletes, updates and every other collection.
// `source` is the post's declared language (or `und`), `chars` its length,
// `kind` post / reply / quote, `embed` image / video / link / null.
const EMBEDS = { 'app.bsky.embed.images': 'image', 'app.bsky.embed.video': 'video', 'app.bsky.embed.external': 'link', 'app.bsky.embed.record': 'quote', 'app.bsky.embed.recordWithMedia': 'quote' };
export function parseJetstream(j) {
  if (!j || typeof j !== 'object' || j.kind !== 'commit') return null;
  const c = j.commit;
  if (!c || c.operation !== 'create' || c.collection !== 'app.bsky.feed.post') return null;
  const r = c.record;
  if (!r || typeof r !== 'object') return null;
  const lang = Array.isArray(r.langs) && typeof r.langs[0] === 'string' ? r.langs[0].split('-')[0].toLowerCase() : 'und';
  const embed = r.embed && typeof r.embed.$type === 'string' ? EMBEDS[r.embed.$type] || null : null;
  const kind = r.reply ? 'reply' : embed === 'quote' ? 'quote' : 'post';
  return { source: lang || 'und', kind, chars: typeof r.text === 'string' ? r.text.length : 0, embed: embed === 'quote' ? null : embed, at: Number.isFinite(j.time_us) ? Math.floor(j.time_us / 1000) : 0 };
}

// ---- connection with fallback ------------------------------------------------
// onEvent(evt) for each accepted event; onState('connecting' | 'live' | 'simulated').
// Returns { stop() }.
export function connectLive({ onEvent, onState, urls = STREAM_URLS, timeout = 6000, WebSocketImpl = globalThis.WebSocket, setTimer = setTimeout, clearTimer = clearTimeout, setTick = setInterval, clearTick = clearInterval } = {}) {
  let ws = null, sim = null, dead = false, gotOne = false, guard = null, attempt = 0;
  const state = (s) => { if (!dead) onState?.(s); };
  const closeWs = () => { if (ws) { const w = ws; ws = null; w.onmessage = w.onerror = w.onclose = null; try { w.close(); } catch { /* ignore */ } } };
  const startSim = () => {                            // the honest fallback: synthetic posts, labelled as such
    if (sim || dead) return;
    closeWs();
    state('simulated');
    const langs = ['en', 'ja', 'pt', 'es', 'de', 'ko', 'fr', 'tr', 'und'];
    const embeds = [null, null, null, 'image', 'image', 'link', 'video'];
    const tick = () => { const embed = embeds[Math.floor(Math.random() * embeds.length)]; const r = Math.random();
      onEvent({ source: langs[Math.floor(Math.random() ** 1.7 * langs.length)], kind: r < 0.45 ? 'reply' : r < 0.55 ? 'quote' : 'post', chars: Math.floor(8 + Math.random() ** 2 * 292), embed, at: Date.now(), simulated: true }); };
    sim = setTick(tick, 45);
  };
  const open = () => {                                // one host at a time; the next on failure, the simulator after the last
    if (dead || gotOne) return;
    closeWs();
    if (typeof WebSocketImpl !== 'function' || attempt >= urls.length) { if (guard) { clearTimer(guard); guard = null; } startSim(); return; }
    const url = urls[attempt++];
    try { ws = new WebSocketImpl(url); } catch { ws = null; open(); return; }
    const mine = ws;
    mine.onmessage = (m) => {
      if (dead || mine !== ws) return;
      let evt = null;
      try { evt = parseJetstream(JSON.parse(m.data)); } catch { evt = null; }
      if (!evt) return;
      if (!gotOne) { gotOne = true; if (guard) { clearTimer(guard); guard = null; } state('live'); }
      onEvent(evt);
    };
    mine.onerror = mine.onclose = () => { if (mine !== ws) return; if (!gotOne) open(); else { ws = null; state('connecting'); gotOne = false; attempt = 0; guard = setTimer(() => { if (!gotOne) startSim(); }, timeout); open(); } };
  };
  state('connecting');
  guard = setTimer(() => { if (!gotOne) startSim(); }, timeout);
  open();
  function stop() { dead = true; if (guard) { clearTimer(guard); guard = null; } closeWs(); if (sim) { clearTick(sim); sim = null; } }
  return { stop };
}
