// exhibit.js — wires a project stop's exhibit (render.js renderExhibit / renderExhibitFigure):
// the scenario buttons, the outcome line and the clip. main.js calls tick(open) every frame,
// like the lab card's loop: the clip loads on the first arrival, plays while the stop is
// open, pauses when the visitor leaves or the tab hides, and restarts on the next arrival.
// One <video> serves both screens — the phone figure shows it, the desktop panel draws it
// (main.js). Reduced motion: the poster (the verdict frame) and the words; the clip plays
// only when asked for.
import { gatewayOutcome } from './gateway.js';

const NOTE = { loading: 'Loading clip…', error: 'Clip unavailable — the outcome below is the result.', denied: 'Autoplay is off.' };

export function initExhibit(sec, ex, { reduced = false } = {}) {
  const box = sec.querySelector('.exhibit'), video = sec.querySelector('video[data-exhibit-video]');
  if (!box || !video) return null;
  const note = box.querySelector('.ex-media'), replay = box.querySelector('.ex-replay');
  let cur = ex.scenarios[0], open = false, gen = 0, resumeOnShow = false;

  // idle | loading | playing | ended | denied | error. The replay button offers what makes
  // sense next; under reduced motion it is how the clip starts at all.
  function setMedia(m) {
    box.dataset.media = m;
    note.textContent = NOTE[m] || '';
    const label = m === 'ended' ? 'Replay' : m === 'denied' ? 'Play clip' : reduced && m === 'idle' ? 'Play clip' : '';
    replay.hidden = !label;
    if (label) replay.textContent = label;
  }
  function play() {
    const g = gen, p = video.play();
    // A newer scenario or a departure superseded this call (AbortError) — not a refusal.
    if (p && p.catch) p.catch((e) => { if (g === gen && e?.name !== 'AbortError') setMedia('denied'); });
  }
  function start() {
    gen++;
    video.setAttribute('poster', cur.poster);
    if (video.getAttribute('src') !== cur.clip) video.src = cur.clip;
    else video.currentTime = 0;
    setMedia('loading');
    play();
  }
  function choose(id) {
    const next = ex.scenarios.find((s) => s.id === id);
    if (!next || next === cur) return;
    cur = next;
    const o = gatewayOutcome(cur);
    for (const b of box.querySelectorAll('button[data-scenario]')) b.setAttribute('aria-pressed', String(b.dataset.scenario === id));
    box.dataset.scenario = id; box.dataset.verdict = o.verdict;
    box.querySelector('.ex-verdict').textContent = o.label;
    box.querySelector('.ex-reason').textContent = o.reason;
    // Never let the previous scenario's frames stand under the new outcome: drop its
    // source, show the new poster, and play only where a clip would play anyway.
    gen++; video.pause(); video.removeAttribute('src'); video.load();
    video.setAttribute('poster', cur.poster);
    if (open && !reduced && !document.hidden) start(); else setMedia('idle');
  }

  const onClick = (e) => {
    const b = e.target.closest('button[data-scenario]');
    if (b) choose(b.dataset.scenario);
    else if (e.target.closest('.ex-replay')) start();
  };
  const on = {
    playing: () => setMedia('playing'),
    waiting: () => { if (!video.ended) setMedia('loading'); },
    ended: () => setMedia('ended'),
    error: () => { if (video.getAttribute('src')) setMedia('error'); },   // removeAttribute('src') + load() fires one too
  };
  const onVis = () => {
    if (document.hidden) { if (!video.paused) { resumeOnShow = true; video.pause(); } }
    else if (resumeOnShow) { resumeOnShow = false; if (open) play(); }
  };
  box.addEventListener('click', onClick);
  for (const k in on) video.addEventListener(k, on[k]);
  document.addEventListener('visibilitychange', onVis);
  setMedia('idle');

  return {
    tick(isOpen) {
      if (isOpen === open) return;
      open = isOpen;
      if (open) {
        video.setAttribute('poster', cur.poster);
        if (!reduced && !document.hidden) start(); else setMedia(box.dataset.media === 'ended' ? 'ended' : 'idle');
      } else { gen++; resumeOnShow = false; video.pause(); }
    },
    // What the desktop panel should draw: the clip once it has a frame of the current
    // scenario, else that scenario's poster.
    frameReady: () => video.readyState >= 2 && video.getAttribute('src') === cur.clip && !video.error,
    poster: () => cur.poster,
    scenario: () => cur.id,
    video,
    destroy() {
      box.removeEventListener('click', onClick);
      for (const k in on) video.removeEventListener(k, on[k]);
      document.removeEventListener('visibilitychange', onVis);
      gen++; video.pause(); video.removeAttribute('src'); video.load();
    },
  };
}

// A walkthrough (profile.js `clip`, render.js renderClipFigure): one muted loop of the live
// site, no controls. It loads on the first arrival, starts from the top on every arrival,
// pauses on leave or when the tab hides, and fades in over its poster (the first frame) once
// it plays, so a refused autoplay or a failed load leaves the poster standing. Reduced motion:
// the poster only. Same surface as initExhibit, so main.js draws either on the panel.
export function initClip(sec, clip, { reduced = false } = {}) {
  const fig = sec.querySelector('.stop-img.clip'), video = sec.querySelector('video[data-clip-video]');
  if (!fig || !video) return null;
  let open = false, resumeOnShow = false;
  const play = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
  const on = {
    playing: () => fig.classList.add('playing'),
    error: () => fig.classList.remove('playing'),
  };
  const onVis = () => {
    if (document.hidden) { if (!video.paused) { resumeOnShow = true; video.pause(); } }
    else if (resumeOnShow) { resumeOnShow = false; if (open) play(); }
  };
  for (const k in on) video.addEventListener(k, on[k]);
  document.addEventListener('visibilitychange', onVis);
  return {
    tick(isOpen) {
      if (isOpen === open) return;
      open = isOpen;
      if (open) {
        if (reduced) return;
        video.setAttribute('poster', clip.poster);
        if (video.getAttribute('src') !== clip.src) video.src = clip.src;
        else video.currentTime = 0;
        if (!document.hidden) play();
      } else { resumeOnShow = false; video.pause(); fig.classList.remove('playing'); }
    },
    frameReady: () => video.readyState >= 2 && video.getAttribute('src') === clip.src && !video.error,
    poster: () => clip.poster,
    scenario: () => '',
    video,
    destroy() {
      for (const k in on) video.removeEventListener(k, on[k]);
      document.removeEventListener('visibilitychange', onVis);
      video.pause(); video.removeAttribute('src'); video.load();
    },
  };
}
