// live.js — the live data layer (2026-09-17): a real public event stream flowing
// through the void, and the small data structures that account for it.
//
//  · createLiveModel() is pure and node-tested: a fixed ring buffer of the last
//    N events, a sliding-window rate (events / s over the last W ms), and a
//    top-k of the busiest sources kept with a binary min-heap.
//  · parseRecentChange() turns one Wikimedia "recentchange" event into the
//    compact shape the model stores.
//  · connectLive() is the only impure part: an EventSource on Wikimedia's public
//    EventStreams (CORS-open, no key). If the stream can't connect within a few
//    seconds — offline, blocked, or unsupported — it falls back to a synthetic
//    generator and says so through `state`, so the strip never lies about the
//    source. The site stays offline-capable: this is the one optional request.

export const STREAM_URL = 'https://stream.wikimedia.org/v2/stream/recentchange';

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

// ---- Wikimedia recentchange → compact event ----------------------------------
// Keeps edits and new pages from real wikis; drops bots, log noise and anything
// without a title. `delta` is bytes added (negative = removed).
export function parseRecentChange(rc) {
  if (!rc || typeof rc !== 'object') return null;
  if (rc.bot) return null;
  if (rc.type !== 'edit' && rc.type !== 'new') return null;
  if (!rc.title || !rc.wiki) return null;
  const delta = rc.length && typeof rc.length.new === 'number' ? rc.length.new - (rc.length.old || 0) : 0;
  return { source: String(rc.wiki), title: String(rc.title), delta, kind: rc.type, at: (rc.timestamp || 0) * 1000 };
}

// ---- connection with fallback ------------------------------------------------
// onEvent(evt) for each accepted event; onState('connecting' | 'live' | 'simulated').
// Returns { stop() }.
export function connectLive({ onEvent, onState, url = STREAM_URL, timeout = 6000, EventSourceImpl = globalThis.EventSource, setTimer = setTimeout, clearTimer = clearTimeout, setTick = setInterval, clearTick = clearInterval } = {}) {
  let es = null, sim = null, dead = false, gotOne = false;
  const state = (s) => { if (!dead) onState?.(s); };
  const startSim = () => {                            // the honest fallback: synthetic edits, labelled as such
    if (sim || dead) return;
    if (es) { try { es.close(); } catch { /* ignore */ } es = null; }
    state('simulated');
    const wikis = ['enwiki', 'dewiki', 'wikidatawiki', 'frwiki', 'jawiki', 'commonswiki', 'eswiki', 'itwiki'];
    const titles = ['Talk:Main Page', 'Q42', 'Kraków', '2026 in film', 'Category:Stubs', 'Module:Arguments', 'Sandbox', 'User talk:Example'];
    const tick = () => onEvent({ source: wikis[Math.floor(Math.random() ** 1.6 * wikis.length)], title: titles[Math.floor(Math.random() * titles.length)], delta: Math.round((Math.random() - 0.35) * 600), kind: Math.random() < 0.9 ? 'edit' : 'new', at: Date.now(), simulated: true });
    sim = setTick(tick, 140);
  };
  state('connecting');
  if (typeof EventSourceImpl !== 'function') { startSim(); return { stop }; }
  let guard = setTimer(() => { if (!gotOne) startSim(); }, timeout);
  try {
    es = new EventSourceImpl(url);
    es.onmessage = (m) => {
      if (dead) return;
      let evt = null;
      try { evt = parseRecentChange(JSON.parse(m.data)); } catch { evt = null; }
      if (!evt) return;
      if (!gotOne) { gotOne = true; clearTimer(guard); state('live'); }
      onEvent(evt);
    };
    es.onerror = () => { if (!gotOne) { clearTimer(guard); startSim(); } };   // once live, EventSource reconnects on its own
  } catch { clearTimer(guard); startSim(); }
  function stop() { dead = true; clearTimer(guard); if (es) { try { es.close(); } catch { /* ignore */ } es = null; } if (sim) { clearTick(sim); sim = null; } }
  return { stop };
}
