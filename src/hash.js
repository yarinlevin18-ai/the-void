// hash.js — resolves a URL fragment or in-page anchor ("#work", "cv", "#TOP")
// to a flight-stop index, or -1. Pure: no DOM, node-tested.
//
// The table has no prototype on purpose. A plain object literal let a fragment
// like "#__proto__" reach Object.prototype, which is truthy but not callable, so
// the lookup threw at module scope and froze the site on the 0% loader
// (found by the 2026-09-12 audit). Nothing a URL can carry reaches this table now.
const TABLE = Object.assign(Object.create(null), {
  top: () => 0,
  work: (c) => c.workIndex,
  about: (c) => c.aboutIndex,
  cv: (c) => c.beats.findIndex((b) => b.stop === 'cv'),
  contact: (c) => c.beats.findIndex((b) => b.stop === 'contact'),
});

export const HASH_KEYS = Object.keys(TABLE);

// ctx: { beats, workIndex, aboutIndex } — the live flight, passed in so this
// stays pure and Director Mode reorders are honoured.
export function resolveHash(raw, ctx) {
  const key = String(raw ?? '').replace(/^#/, '').toLowerCase();
  const f = TABLE[key];
  if (typeof f !== 'function') return -1;
  let i;
  try { i = f(ctx); } catch { return -1; }
  const last = Math.max(0, (ctx?.beats?.length ?? 1) - 1);
  return Number.isInteger(i) && i >= 0 && i <= last ? i : -1;
}
