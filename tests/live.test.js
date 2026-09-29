import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLiveModel, heapTopK, parseJetstream, connectLive } from '../src/live.js';

test('ring buffer keeps the last N events, newest first', () => {
  const m = createLiveModel({ ring: 4, window: 1000 });
  for (let i = 1; i <= 6; i++) m.push({ source: 'w', title: 't' + i, delta: 0 }, i * 10);
  assert.equal(m.total, 6);
  assert.equal(m.filled(), 4);
  assert.deepEqual(m.recent().map((e) => e.title), ['t6', 't5', 't4', 't3']);
  assert.deepEqual(m.recent(2).map((e) => e.title), ['t6', 't5']);
});

test('sliding window rate counts only the last W ms', () => {
  const m = createLiveModel({ ring: 8, window: 10000 });
  for (let i = 0; i < 20; i++) m.push({ source: 'w', title: 't', delta: 0 }, i * 1000);   // one per second for 20 s
  assert.equal(m.rate(19000), 1.1);      // 11 events inside (9000..19000] / 10 s
  assert.equal(m.rate(60000), 0);        // everything aged out
});

test('heap top-k returns the k busiest sources, descending, ties by name', () => {
  const counts = new Map([['a', 5], ['b', 9], ['c', 1], ['d', 9], ['e', 3]]);
  assert.deepEqual(heapTopK(counts, 3), [{ source: 'b', count: 9 }, { source: 'd', count: 9 }, { source: 'a', count: 5 }]);
  assert.deepEqual(heapTopK(new Map(), 3), []);
  assert.deepEqual(heapTopK(counts, 10).length, 5);
});

test('model top-k tracks pushes', () => {
  const m = createLiveModel({ ring: 8, window: 1000, k: 2 });
  for (const s of ['en', 'de', 'en', 'fr', 'en', 'de']) m.push({ source: s, title: 't', delta: 0 }, 1);
  assert.deepEqual(m.topK(), [{ source: 'en', count: 3 }, { source: 'de', count: 2 }]);
});

test('parseJetstream keeps new posts as language / kind / length / embed, never text or author', () => {
  const post = parseJetstream({ did: 'did:plc:x', time_us: 1790068134793077, kind: 'commit', commit: { operation: 'create', collection: 'app.bsky.feed.post', record: { text: 'hello world', langs: ['en-US'], embed: { $type: 'app.bsky.embed.images', images: [] } } } });
  assert.deepEqual(post, { source: 'en', kind: 'post', chars: 11, embed: 'image', at: 1790068134793 });
  assert.equal(JSON.stringify(post).includes('hello'), false, 'no post text leaves the parser');
  assert.equal(JSON.stringify(post).includes('did:'), false, 'no author leaves the parser');
  assert.equal(parseJetstream({ kind: 'commit', commit: { operation: 'create', collection: 'app.bsky.feed.post', record: { text: 'r', reply: { parent: {} } } } }).kind, 'reply');
  assert.equal(parseJetstream({ kind: 'commit', commit: { operation: 'create', collection: 'app.bsky.feed.post', record: { text: 'q', embed: { $type: 'app.bsky.embed.record' } } } }).kind, 'quote');
  assert.equal(parseJetstream({ kind: 'commit', commit: { operation: 'create', collection: 'app.bsky.feed.post', record: { text: 'x' } } }).source, 'und');
  assert.equal(parseJetstream({ kind: 'commit', commit: { operation: 'delete', collection: 'app.bsky.feed.post' } }), null);
  assert.equal(parseJetstream({ kind: 'commit', commit: { operation: 'create', collection: 'app.bsky.feed.like', record: {} } }), null);
  assert.equal(parseJetstream({ kind: 'identity' }), null);
  assert.equal(parseJetstream(null), null);
});

const POST = JSON.stringify({ kind: 'commit', time_us: 1, commit: { operation: 'create', collection: 'app.bsky.feed.post', record: { text: 'A', langs: ['en'] } } });

test('connectLive goes live on the first parsed message and stops cleanly', () => {
  const states = [], events = [];
  let inst = null;
  class FakeWS { constructor(url) { this.url = url; inst = this; } close() { this.closed = true; } }
  const timers = [];
  const c = connectLive({ onEvent: (e) => events.push(e), onState: (s) => states.push(s), WebSocketImpl: FakeWS,
    setTimer: (fn) => { timers.push(fn); return 1; }, clearTimer: () => {}, setTick: () => 2, clearTick: () => {} });
  assert.deepEqual(states, ['connecting']);
  inst.onmessage({ data: POST });
  inst.onmessage({ data: 'not json' });
  inst.onmessage({ data: JSON.stringify({ kind: 'commit', commit: { operation: 'create', collection: 'app.bsky.feed.like', record: {} } }) });
  assert.deepEqual(states, ['connecting', 'live']);
  assert.equal(events.length, 1);
  c.stop();
  assert.equal(inst.closed, true);
});

test('connectLive tries the next host on failure, then falls back to the simulator', () => {
  const states = [], events = [], urls = [];
  let inst = null, ticker = null;
  class FakeWS { constructor(url) { urls.push(url); inst = this; } close() { this.closed = true; } }
  const timers = [];
  const c = connectLive({ onEvent: (e) => events.push(e), onState: (s) => states.push(s), WebSocketImpl: FakeWS, urls: ['wss://a', 'wss://b'],
    setTimer: (fn) => { timers.push(fn); return 1; }, clearTimer: () => {}, setTick: (fn) => { ticker = fn; return 2; }, clearTick: () => { ticker = null; } });
  const first = inst;
  first.onerror();                                 // host a dies before delivering
  assert.equal(first.closed, true);
  assert.deepEqual(urls, ['wss://a', 'wss://b'], 'the next host is tried');
  assert.deepEqual(states, ['connecting']);
  timers[0]();                                     // the guard fires with nothing received from b either
  assert.deepEqual(states, ['connecting', 'simulated']);
  assert.equal(inst.closed, true, 'the dead stream is closed');
  ticker(); ticker();
  assert.equal(events.length, 2);
  assert.equal(events[0].simulated, true, 'synthetic events are labelled');
  assert.ok(['post', 'reply', 'quote'].includes(events[0].kind));
  c.stop();
  assert.equal(ticker, null);
});

test('connectLive simulates when WebSocket does not exist', () => {
  const states = [];
  connectLive({ onEvent: () => {}, onState: (s) => states.push(s), WebSocketImpl: null, setTick: () => 1, clearTick: () => {} });
  assert.deepEqual(states, ['connecting', 'simulated']);
});
