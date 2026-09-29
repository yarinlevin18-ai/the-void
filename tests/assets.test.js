import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';

// The loader shows the Higgsfield loop's poster as a still. The clip itself stopped being
// fetched on 2026-09-29 and left the repo in the wrap-up pass (1.8 MB nobody downloaded).
test('the loader keeps its poster, and the unused loop clip stays out of public/', () => {
  const webp = statSync(new URL('../public/assets/loader/void-loop.webp', import.meta.url));
  assert.ok(webp.size > 0 && webp.size < 80 * 1024, `void-loop.webp is ${webp.size} bytes`);
  assert.ok(!existsSync(new URL('../public/assets/loader/void-loop.mp4', import.meta.url)));
});
