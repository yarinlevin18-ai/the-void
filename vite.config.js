import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { read as readBuildLog } from './scripts/buildlog.js';
import { noscriptPlugin } from './scripts/noscript.js';
import { ownerPlugin } from './scripts/owner.js';
import { PROFILE } from './src/content/profile.js';

// Build stamp (2026-09-14): the UTC date of this build, baked into the bundle
// as the global __BUILT__ = { label: '14 Sep 2026', iso: '2026-09-14' }. Every
// push to main re-bakes it; the contact card and print CV show `label`.
const now = new Date();
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BUILT = {
  label: `${now.getUTCDate()} ${MON[now.getUTCMonth()]} ${now.getUTCFullYear()}`,
  iso: now.toISOString().slice(0, 10),
};

// Build log (2026-09-29): the How I Build strip reads this repo's own git history,
// baked in as __BUILDLOG__ (scripts/buildlog.js; snapshot + merge on shallow clones).
// Read-only here — only `npm run build` refreshes the committed snapshot.
const ROOT = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
const BUILDLOG = readBuildLog(ROOT);

// Owner's mark (2026-09-29): banners, humans.txt and the no-JS copyright line
// (scripts/owner.js); the runtime dependencies are named in humans.txt.
const DEPS = Object.keys(JSON.parse(readFileSync(`${ROOT}/package.json`, 'utf8')).dependencies);

// `vite preview` sends the same headers as Vercel (vercel.json's catch-all rule), so the
// Content-Security-Policy is exercised locally before it ships.
const VERCEL_HEADERS = Object.fromEntries(
  JSON.parse(readFileSync(`${ROOT}/vercel.json`, 'utf8')).headers
    .find((r) => r.source === '/(.*)').headers.map(({ key, value }) => [key, value]),
);

export default defineConfig({
  define: { __BUILT__: JSON.stringify(BUILT), __BUILDLOG__: JSON.stringify(BUILDLOG) },
  plugins: [
    noscriptPlugin(ROOT, PROFILE),        // the no-JS Work list, from profile.js in flight order
    ownerPlugin(PROFILE, BUILT, DEPS),    // the owner's name on every shipped file
  ],
  // Bundled libraries (three.js, meshline) keep their MIT notices: the minifier strips the
  // comments that carried them, so the build lists every license in /licenses.txt.
  build: { license: { fileName: 'licenses.txt' } },
  preview: { headers: VERCEL_HEADERS },
  optimizeDeps: {
    entries: ['index.html'],
  },
});
