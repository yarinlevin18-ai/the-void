import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { read as readBuildLog } from './scripts/buildlog.js';
import { noscriptPlugin } from './scripts/noscript.js';
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

export default defineConfig({
  define: { __BUILT__: JSON.stringify(BUILT), __BUILDLOG__: JSON.stringify(BUILDLOG) },
  plugins: [noscriptPlugin(ROOT, PROFILE)],   // the no-JS Work list, from profile.js in flight order
  optimizeDeps: {
    entries: ['index.html'],
  },
});
