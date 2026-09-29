// buildlog.js — the How I Build strip's data, read from this repo's own git history
// at build time (2026-09-29; replaced the Bluesky firehose strip). summarize() and
// merge() are pure and node-tested; read() shells out to git.
//
// Vercel clones shallow, so a full history is only available locally. `npm run build`
// runs `node scripts/buildlog.js --write` first, which refreshes the committed
// snapshot (src/content/buildlog.json) when the full history is there — commit it.
// On a shallow clone read() takes that snapshot and merges in the commits it doesn't
// know yet (by hash), so the deploying commit itself shows. The test count is always
// counted from tests/ at build time.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DAY = 86400000;
const KEEP_HASHES = 40;                         // how far back a shallow merge can dedupe
const isoDay = (t) => new Date(t).toISOString().slice(0, 10);
const dayIndex = (first, d) => Math.round((Date.parse(d) - Date.parse(first)) / DAY);

// One commit subject → one short line: the part before the first " — ", cut at a
// word boundary. The full messages run to paragraphs; the strip shows the headline.
export function shortSubject(s, max = 64) {
  let t = String(s).split(' — ')[0].trim();
  if (t.length <= max) return t;
  t = t.slice(0, max + 1);
  return t.slice(0, t.lastIndexOf(' ') > 20 ? t.lastIndexOf(' ') : max).replace(/[,;:]$/, '') + '…';
}

const parse = (lines) => lines.map((l) => { const [h, d, ...s] = String(l).split('|'); return { h, d, s: s.join('|') }; })
  .filter((c) => c.h && /^\d{4}-\d{2}-\d{2}$/.test(c.d));

function finish(first, today, days, commits, recent, hashes, tests) {
  let streak = 0, run = 0;
  for (const v of days) { run = v ? run + 1 : 0; if (run > streak) streak = run; }
  return { first, today, commits, activeDays: days.filter(Boolean).length, streak, tests, days, recent, head: hashes[0] || '', hashes };
}

// lines: "hash|YYYY-MM-DD|subject", newest first (git log order). today: YYYY-MM-DD.
export function summarize(lines, today, tests = 0) {
  const commits = parse(lines);
  if (!commits.length) return null;
  const first = commits.reduce((m, c) => (c.d < m ? c.d : m), commits[0].d);
  const days = Array(Math.max(1, dayIndex(first, today) + 1)).fill(0);
  for (const c of commits) { const i = dayIndex(first, c.d); if (i >= 0 && i < days.length) days[i]++; }
  return finish(first, today, days, commits.length,
    commits.slice(0, 3).map((c) => ({ h: c.h, d: c.d, s: shortSubject(c.s) })),
    commits.slice(0, KEEP_HASHES).map((c) => c.h), tests);
}

// A snapshot plus whatever a shallow clone's `git log` shows that the snapshot doesn't
// know (matched by hash), stretched to `today`.
export function merge(snap, lines, today, tests = 0) {
  if (!snap || !Array.isArray(snap.days)) return null;
  const known = new Set(snap.hashes || []);
  const fresh = parse(lines).filter((c) => !known.has(c.h) && c.d >= snap.first);
  const n = Math.max(snap.days.length, dayIndex(snap.first, today) + 1);
  const days = Array.from({ length: n }, (_, i) => snap.days[i] || 0);
  for (const c of fresh) { const i = dayIndex(snap.first, c.d); if (i >= 0 && i < n) days[i]++; }
  return finish(snap.first, today > snap.today ? today : snap.today, days, snap.commits + fresh.length,
    [...fresh.map((c) => ({ h: c.h, d: c.d, s: shortSubject(c.s) })), ...(snap.recent || [])].slice(0, 3),
    [...fresh.map((c) => c.h), ...(snap.hashes || [])].slice(0, KEEP_HASHES), tests);
}

export const countTests = (dir) => readdirSync(dir).filter((f) => f.endsWith('.test.js'))
  .reduce((n, f) => n + (readFileSync(`${dir}/${f}`, 'utf8').match(/^test\(/gm) || []).length, 0);

const snapPath = (root) => `${root}/src/content/buildlog.json`;
const git = (root, a) => execSync(`git ${a}`, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const gitLog = (root) => git(root, "log '--format=%h|%ad|%s' --date=short").trim().split('\n');
const shallow = (root) => git(root, 'rev-parse --is-shallow-repository').trim() === 'true';

// Never throws: no git and no snapshot → null, and the strip simply isn't rendered.
export function read(root, today = isoDay(Date.now())) {
  let tests = 0;
  try { tests = countTests(`${root}/tests`); } catch { /* no tests dir */ }
  try {
    if (!shallow(root)) return summarize(gitLog(root), today, tests);
  } catch { /* no git at all: fall through to the snapshot */ }
  try {
    const snap = JSON.parse(readFileSync(snapPath(root), 'utf8'));
    let lines = [];
    try { lines = gitLog(root); } catch { /* snapshot only */ }
    return merge(snap, lines, today, tests);
  } catch { return null; }
}

// `node scripts/buildlog.js --write`: refresh the snapshot from the full history.
// A shallow clone (Vercel) leaves it alone — it has nothing better to write.
export function write(root) {
  try { if (shallow(root)) return false; } catch { return false; }
  const log = read(root);
  if (!log) return false;
  const out = JSON.stringify(log) + '\n';
  let prev = '';
  try { prev = readFileSync(snapPath(root), 'utf8'); } catch { /* first write */ }
  if (prev !== out) writeFileSync(snapPath(root), out);
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv.includes('--write')) {
  const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
  console.log(write(root) ? '[buildlog] snapshot refreshed' : '[buildlog] shallow clone: snapshot kept');
}
