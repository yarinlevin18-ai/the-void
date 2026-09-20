import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLiveModel, heapTopK, parseRecentChange, connectLive } from '../src/live.js';

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

test('parseRecentChange keeps human edits and new pages, drops bots and log noise', () => {
  const edit = parseRecentChange({ type: 'edit', wiki: 'enwiki', title: 'Kraków', bot: false, length: { old: 100, new: 160 }, timestamp: 1700000000 });
  assert.deepEqual(edit, { source: 'enwiki', title: 'Kraków', delta: 60, kind: 'edit', at: 1700000000000 });
  assert.equal(parseRecentChange({ type: 'edit', wiki: 'enwiki', title: 'x', bot: true }), null);
  assert.equal(parseRecentChange({ type: 'log', wiki: 'enwiki', title: 'x' }), null);
  assert.equal(parseRecentChange({ type: 'new', wiki: 'enwiki' }), null);
  assert.equal(parseRecentChange(null), null);
  assert.equal(parseRecentChange({ type: 'new', wiki: 'dewiki', title: 'Neu' }).delta, 0);
});

test('connectLive goes live on the first parsed message and stops cleanly', () => {
  const states = [], events = [];
  let inst = null;
  class FakeES { constructor(url) { this.url = url; inst = this; } close() { this.closed = true; } }
  const timers = [];
  const c = connectLive({ onEvent: (e) => events.push(e), onState: (s) => states.push(s), EventSourceImpl: FakeES,
    setTimer: (fn) => { timers.push(fn); return 1; }, clearTimer: () => {}, setTick: () => 2, clearTick: () => {} });
  assert.deepEqual(states, ['connecting']);
  inst.onmessage({ data: JSON.stringify({ type: 'edit', wiki: 'enwiki', title: 'A', length: { old: 1, new: 3 } }) });
  inst.onmessage({ data: 'not json' });
  inst.onmessage({ data: JSON.stringify({ type: 'log', wiki: 'enwiki', title: 'B' }) });
  assert.deepEqual(states, ['connecting', 'live']);
  assert.equal(events.length, 1);
  c.stop();
  assert.equal(inst.closed, true);
});

test('connectLive falls back to the simulator when the stream never delivers', () => {
  const states = [], events = [];
  let inst = null, ticker = null;
  class FakeES { constructor() { inst = this; } close() { this.closed = true; } }
  const timers = [];
  const c = connectLive({ onEvent: (e) => events.push(e), onState: (s) => states.push(s), EventSourceImpl: FakeES,
    setTimer: (fn) => { timers.push(fn); return 1; }, clearTimer: () => {}, setTick: (fn) => { ticker = fn; return 2; }, clearTick: () => { ticker = null; } });
  timers[0]();                                    // the guard fires with nothing received
  assert.deepEqual(states, ['connecting', 'simulated']);
  assert.equal(inst.closed, true, 'the dead stream is closed');
  ticker(); ticker();
  assert.equal(events.length, 2);
  assert.equal(events[0].simulated, true, 'synthetic events are labelled');
  c.stop();
  assert.equal(ticker, null);
});

test('connectLive simulates when EventSource does not exist', () => {
  const states = [];
  connectLive({ onEvent: () => {}, onState: (s) => states.push(s), EventSourceImpl: undefined, setTick: () => 1, clearTick: () => {} });
  assert.deepEqual(states, ['connecting', 'simulated']);
});
