// noscript.js — the no-JavaScript skim path's Work list, generated from profile.js in
// flight order (2026-09-29). The hand-copied list drifted: it still showed Focus and
// none of the four new project stops. vite.config.js swaps it in at the marker.
import { readFileSync } from 'node:fs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// [{ id, also }] in the order DEFAULT_BEATS flies them (read from main.js as text —
// importing it would boot Three.js).
export function flightOrder(mainSrc) {
  const start = mainSrc.indexOf('const DEFAULT_BEATS = [');
  const body = mainSrc.slice(start, mainSrc.indexOf('\n];', start));
  return [...body.matchAll(/stop: 'project', id: '([a-z-]+)'(?:, also: '([a-z-]+)')?/g)].map((m) => ({ id: m[1], also: m[2] || '' }));
}

const name = (x) => { const href = x.url || x.repo; return href ? `<a href="${esc(href)}">${esc(x.name)}</a>` : esc(x.name); };

export function workList(profile, order) {
  const byId = (id) => profile.work.featured.find((x) => x.id === id);
  return order.map(({ id, also }) => {
    const x = byId(id), y = also && byId(also);
    if (!x) return '';
    const tail = y ? ` Also ${name(y)}: ${esc(y.outcome)}` : '';
    return `          <li>${name(x)} (${esc(x.kind)}) — ${esc(x.outcome)}${tail}</li>`;
  }).filter(Boolean).join('\n');
}

// The line under the Work list: every other shipped project, then the labs (2026-09-29 —
// the hand copy had drifted too: Focus left the flight but never reached it).
export function alsoLine(profile) {
  const names = (xs) => (xs || []).map((x) => esc(x.name)).join(', ');
  return `Also: ${names(profile.work.shipped)} and the labs: ${names(profile.work.labs)}.`;
}

export function noscriptPlugin(root, profile) {
  return {
    name: 'noscript-work',
    transformIndexHtml(html) {
      const list = workList(profile, flightOrder(readFileSync(`${root}/src/main.js`, 'utf8')));
      return html.replace(/ *<!-- noscript:work[^>]*-->/, list).replace(/<!-- noscript:also[^>]*-->/, alsoLine(profile));
    },
  };
}
