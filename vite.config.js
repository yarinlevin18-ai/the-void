import { defineConfig } from 'vite';

// Build stamp (2026-09-14): the UTC date of this build, baked into the bundle
// as the global __BUILT__ = { label: '14 Sep 2026', iso: '2026-09-14' }. Every
// push to main re-bakes it; the contact card and print CV show `label`.
const now = new Date();
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BUILT = {
  label: `${now.getUTCDate()} ${MON[now.getUTCMonth()]} ${now.getUTCFullYear()}`,
  iso: now.toISOString().slice(0, 10),
};

// Keep the bundled reference repos (references/) out of Vite's watcher and dep
// scan — they're just for inspection, and their tsconfigs/demos were causing
// constant cache-clears and full reloads.
export default defineConfig({
  define: { __BUILT__: JSON.stringify(BUILT) },
  server: {
    watch: { ignored: ['**/references/**'] },
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
});
