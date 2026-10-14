import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { installDom, click } from './_dom.js';
import { PROFILE } from '../src/content/profile.js';
import { gatewayVerdict, gatewayOutcome, money } from '../src/gateway.js';
import { renderProject } from '../src/render.js';

const GW = PROFILE.work.featured.find((p) => p.id === 'llm-gateway');
const S = Object.fromEntries(GW.exhibit.scenarios.map((s) => [s.id, s]));

// The rule is the real gateway's (llm-gateway src/index.ts): spend >= cap blocks, checked before the call.
test('the gateway rule: under the cap runs, reaching it blocks, over it blocks', () => {
  assert.equal(gatewayVerdict({ dailyCap: 10, spentToday: 9.99 }), 'allowed');
  assert.equal(gatewayVerdict({ dailyCap: 10, spentToday: 10 }), 'blocked');   // equality blocks
  assert.equal(gatewayVerdict({ dailyCap: 10, spentToday: 10.4 }), 'blocked');
  assert.equal(gatewayVerdict({ dailyCap: 0.3, spentToday: 0.1 + 0.2 }), 'blocked');   // compared in cents: 0.30000000000000004 is the cap
});

test('the request cost is logged, never decides the verdict', () => {
  assert.equal(gatewayOutcome({ dailyCap: 10, spentToday: 9.9, requestCost: 5 }).verdict, 'allowed');
  assert.equal(gatewayOutcome({ dailyCap: 10, spentToday: 10, requestCost: 0 }).verdict, 'blocked');
});

test('missing, negative or non-finite numbers are refused, not guessed', () => {
  for (const bad of [undefined, NaN, Infinity, -1, '8'])
    assert.throws(() => gatewayVerdict({ dailyCap: 10, spentToday: bad }), /spentToday/, String(bad));
  for (const bad of [0, -5, NaN]) assert.throws(() => gatewayVerdict({ dailyCap: bad, spentToday: 1 }), /dailyCap/, String(bad));
  assert.throws(() => gatewayOutcome({ dailyCap: 10, spentToday: 1, requestCost: -1 }), /requestCost/);
});

test('the outcome names the verdict in words and the numbers that decided it', () => {
  const a = gatewayOutcome(S.allowed), b = gatewayOutcome(S.blocked);
  assert.equal(a.label, 'Allowed'); assert.equal(b.label, 'Blocked');
  for (const [o, s] of [[a, S.allowed], [b, S.blocked]]) {
    assert.ok(o.reason.includes(money(s.spentToday)) && o.reason.includes(money(s.dailyCap)), o.reason);
  }
  assert.ok(a.reason.includes(money(S.allowed.requestCost)));
  assert.equal(money(8), '$8.00'); assert.equal(money(0.42), '$0.42');
});

test('each scenario is what its id says, and its clip and poster ship', () => {
  assert.deepEqual(Object.keys(S), ['allowed', 'blocked']);
  for (const s of GW.exhibit.scenarios) {
    assert.equal(gatewayVerdict(s), s.id, s.id);
    for (const f of [s.clip, s.poster]) {
      assert.match(f, /^\/exhibits\//, `${f}: not under public/assets/ (its top level is cached for a year)`);
      assert.ok(existsSync(new URL(`../public${f}`, import.meta.url)), `public${f}`);
    }
    assert.match(s.clip, /\.mp4$/); assert.match(s.poster, /\.webp$/);
    const kb = readFileSync(new URL(`../public${s.clip}`, import.meta.url)).length / 1024;
    assert.ok(kb < 2048, `${s.clip} is ${Math.round(kb)} KB — re-encode it (the site's whole first load is ~600 KB)`);
  }
});

test('the exhibit renders in the text column: buttons, the first scenario pressed, its verdict in words', () => {
  const h = renderProject(GW, 'left');
  const txt = h.slice(h.indexOf('<div class="stop-txt">'));
  assert.ok(txt.includes('class="exhibit"'), 'inside .stop-txt');
  assert.ok(h.indexOf('class="exhibit"') > h.indexOf('class="outcome"') && h.indexOf('class="exhibit"') < h.indexOf('<dl>'));
  assert.ok(h.includes('<button type="button" data-scenario="allowed" aria-pressed="true">Under the cap</button>'));
  assert.ok(h.includes('<button type="button" data-scenario="blocked" aria-pressed="false">Cap reached</button>'));
  assert.ok(h.includes('role="group" aria-label="Budget scenario"'));
  assert.ok(h.includes('role="status"><b class="ex-verdict">Allowed</b>'));
  // The figure: a video with no src (exhibit.js sets it on arrival), muted + inline for iOS.
  const fig = h.slice(h.indexOf('<figure'), h.indexOf('</figure>'));
  assert.match(fig, /class="stop-img shot exhibit-fig"/);
  assert.match(fig, /<video data-exhibit-video muted playsinline preload="none"/);
  assert.ok(!/\ssrc=|\sposter=|autoplay/.test(fig), 'nothing loads before the stop opens');
  // a project without an exhibit is untouched
  const other = renderProject(PROFILE.work.featured.find((p) => p.id === 'thesis'), 'left');
  assert.ok(!other.includes('exhibit'));
});

// ---- the controller (happy-dom): buttons, outcome text and the clip's lifecycle ----
installDom();
const { initExhibit } = await import('../src/exhibit.js');

function mount({ reduced = false } = {}) {
  const sec = document.createElement('section');
  sec.innerHTML = renderProject(GW, 'left');
  document.body.appendChild(sec);
  const video = sec.querySelector('video');
  const calls = [];
  video.play = () => { calls.push('play'); return Promise.resolve(); };
  video.pause = () => { calls.push('pause'); };
  video.load = () => { calls.push('load'); };
  const ctl = initExhibit(sec, GW.exhibit, { reduced });
  return { sec, video, calls, ctl, box: sec.querySelector('.exhibit') };
}

test('nothing loads until the stop opens; arriving loads and plays the first scenario', () => {
  const { video, calls, ctl } = mount();
  ctl.tick(false);
  assert.equal(video.getAttribute('src'), null); assert.deepEqual(calls, []);
  ctl.tick(true);
  assert.equal(video.getAttribute('src'), S.allowed.clip);
  assert.ok(video.getAttribute('poster').endsWith(S.allowed.poster));
  assert.deepEqual(calls, ['play']);
  ctl.tick(true); assert.deepEqual(calls, ['play'], 'tick is idempotent');
  ctl.tick(false); assert.deepEqual(calls, ['play', 'pause'], 'leaving pauses');
  ctl.destroy();
});

test('switching scenario updates the buttons, the verdict and the clip together — no stale source', () => {
  const { video, ctl, box, calls } = mount();
  ctl.tick(true);
  click(box.querySelector('[data-scenario="blocked"]'));
  assert.equal(box.querySelector('[data-scenario="blocked"]').getAttribute('aria-pressed'), 'true');
  assert.equal(box.querySelector('[data-scenario="allowed"]').getAttribute('aria-pressed'), 'false');
  assert.equal(box.dataset.scenario, 'blocked'); assert.equal(box.dataset.verdict, 'blocked');
  assert.equal(box.querySelector('.ex-verdict').textContent, 'Blocked');
  assert.equal(box.querySelector('.ex-reason').textContent, gatewayOutcome(S.blocked).reason);
  assert.equal(video.getAttribute('src'), S.blocked.clip);
  assert.equal(ctl.scenario(), 'blocked'); assert.equal(ctl.poster(), S.blocked.poster);
  // the old source was dropped before the new one went in
  assert.deepEqual(calls.slice(1, 3), ['pause', 'load']);
  // fast switching back and forth lands on the last choice
  click(box.querySelector('[data-scenario="allowed"]')); click(box.querySelector('[data-scenario="blocked"]')); click(box.querySelector('[data-scenario="allowed"]'));
  assert.equal(video.getAttribute('src'), S.allowed.clip); assert.equal(box.querySelector('.ex-verdict').textContent, 'Allowed');
  ctl.destroy();
});

test('switching while away changes the words and the poster but plays nothing', () => {
  const { video, ctl, box, calls } = mount();
  click(box.querySelector('[data-scenario="blocked"]'));
  assert.equal(box.querySelector('.ex-verdict').textContent, 'Blocked');
  assert.equal(video.getAttribute('src'), null);
  assert.ok(!calls.includes('play'));
  ctl.destroy();
});

test('reduced motion: poster and words only, the clip plays when asked', () => {
  const { video, ctl, box, calls } = mount({ reduced: true });
  ctl.tick(true);
  assert.equal(video.getAttribute('src'), null); assert.ok(!calls.includes('play'));
  assert.ok(video.getAttribute('poster').endsWith(S.allowed.poster));
  const replay = box.querySelector('.ex-replay');
  assert.equal(replay.hidden, false); assert.equal(replay.textContent, 'Play clip');
  click(replay);
  assert.equal(video.getAttribute('src'), S.allowed.clip); assert.ok(calls.includes('play'));
  ctl.destroy();
});

test('a clip that ends offers a replay; a refused autoplay says so and offers play', async () => {
  const { video, ctl, box } = mount();
  ctl.tick(true);
  video.dispatchEvent(new window.Event('ended'));
  assert.equal(box.dataset.media, 'ended');
  assert.equal(box.querySelector('.ex-replay').textContent, 'Replay');
  ctl.destroy();

  const m = mount();
  m.video.play = () => Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
  m.ctl.tick(true);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(m.box.dataset.media, 'denied');
  assert.equal(m.box.querySelector('.ex-media').textContent, 'Autoplay is off.');
  assert.equal(m.box.querySelector('.ex-replay').textContent, 'Play clip');
  m.ctl.destroy();
});

test('a clip that fails keeps the words and says the outcome stands', () => {
  const { video, ctl, box } = mount();
  ctl.tick(true);
  video.dispatchEvent(new window.Event('error'));
  assert.equal(box.dataset.media, 'error');
  assert.match(box.querySelector('.ex-media').textContent, /outcome below is the result/);
  assert.equal(box.querySelector('.ex-verdict').textContent, 'Allowed');
  ctl.destroy();
});

test('destroy releases the clip and stops listening', () => {
  const { video, ctl, box, calls } = mount();
  ctl.tick(true);
  ctl.destroy();
  assert.equal(video.getAttribute('src'), null);
  assert.deepEqual(calls.slice(-2), ['pause', 'load']);
  click(box.querySelector('[data-scenario="blocked"]'));
  assert.equal(box.dataset.scenario, 'allowed', 'a destroyed controller ignores clicks');
});

// ---- walkthrough clips (profile.js `clip`: SHADIEZ) ----
const CLIPS = PROFILE.work.featured.filter((p) => p.clip);
const { initClip } = await import('../src/exhibit.js');

test('each walkthrough ships its clip and a first-frame poster, small enough for a phone', () => {
  assert.deepEqual(CLIPS.map((p) => p.id).sort(), ['shadiez']);   // Agent Control's clip became agent.js's loop (2026-10-14)
  for (const { id, clip } of CLIPS) {
    assert.ok(clip.alt, `${id}: alt`);
    assert.match(clip.src, /^\/exhibits\/.+\.mp4$/); assert.match(clip.poster, /^\/exhibits\/.+\.webp$/);
    for (const f of [clip.src, clip.poster]) assert.ok(existsSync(new URL(`../public${f}`, import.meta.url)), `public${f}`);
    const kb = readFileSync(new URL(`../public${clip.src}`, import.meta.url)).length / 1024;
    assert.ok(kb < 2048, `${clip.src} is ${Math.round(kb)} KB — re-encode it`);
  }
});

test('a walkthrough renders as the poster with an unloaded muted loop over it', () => {
  const h = renderProject(CLIPS[0], 'right');
  const fig = h.slice(h.indexOf('<figure'), h.indexOf('</figure>'));
  assert.match(fig, /class="stop-img shot clip"/);
  assert.ok(fig.includes(`<img src="${CLIPS[0].clip.poster}"`), 'the poster holds the layout and the reveal');
  assert.match(fig, /<video data-clip-video muted playsinline loop preload="none" aria-hidden="true">/);
  assert.ok(!/<video[^>]*\s(src|poster|autoplay)=?/.test(fig), 'the clip loads on arrival, not with the page');
  assert.ok(!h.includes('class="exhibit"'), 'no scenario block');
});

function mountClip({ reduced = false } = {}) {
  const sec = document.createElement('section');
  sec.innerHTML = renderProject(CLIPS[0], 'right');
  document.body.appendChild(sec);
  const video = sec.querySelector('video'), calls = [];
  video.play = () => { calls.push('play'); return Promise.resolve(); };
  video.pause = () => { calls.push('pause'); };
  video.load = () => { calls.push('load'); };
  return { sec, video, calls, fig: sec.querySelector('figure'), ctl: initClip(sec, CLIPS[0].clip, { reduced }) };
}

test('a walkthrough loads on arrival, restarts on every arrival, pauses on leave', () => {
  const { video, calls, fig, ctl } = mountClip(), { clip } = CLIPS[0];
  ctl.tick(false); assert.equal(video.getAttribute('src'), null); assert.deepEqual(calls, []);
  ctl.tick(true);
  assert.equal(video.getAttribute('src'), clip.src); assert.deepEqual(calls, ['play']);
  video.dispatchEvent(new window.Event('playing')); assert.ok(fig.classList.contains('playing'), 'fades in once it plays');
  ctl.tick(false); assert.deepEqual(calls, ['play', 'pause']); assert.ok(!fig.classList.contains('playing'));
  video.currentTime = 7; ctl.tick(true);
  assert.equal(video.currentTime, 0, 'from the top'); assert.deepEqual(calls, ['play', 'pause', 'play']);
  assert.equal(ctl.poster(), clip.poster);
  ctl.destroy(); assert.equal(video.getAttribute('src'), null);
});

test('a walkthrough under reduced motion is the poster only', () => {
  const { video, calls, ctl } = mountClip({ reduced: true });
  ctl.tick(true);
  assert.equal(video.getAttribute('src'), null); assert.deepEqual(calls, []);
  assert.equal(ctl.frameReady(), false, 'the panel draws the poster');
  ctl.destroy();
});
