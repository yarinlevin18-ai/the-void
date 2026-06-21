import { defineConfig } from 'vite';

// Keep the bundled reference repos (references/) out of Vite's watcher and dep
// scan — they're just for inspection, and their tsconfigs/demos were causing
// constant cache-clears and full reloads.
export default defineConfig({
  server: {
    watch: { ignored: ['**/references/**'] },
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
});
