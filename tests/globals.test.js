import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// Regression guard for a bug that shipped in v16: `let history = []` (the Director
// Mode undo stack) sat at module scope in main.js and shadowed window.history for
// the entire module, so clearHash()'s `history.replaceState(...)` called a method
// on an Array, threw, and was swallowed by its own catch. The URL never tidied and
// nothing surfaced. A module-scope binding that shadows a browser global is never
// worth the ambiguity — rename the local.
const BROWSER_GLOBALS = [
  'history', 'location', 'document', 'navigator', 'screen', 'performance',
  'window', 'self', 'top', 'parent', 'origin', 'name', 'status', 'length',
  'close', 'open', 'focus', 'blur', 'print', 'scroll', 'event',
];

const SRC = new URL('../src/', import.meta.url);
const files = readdirSync(SRC).filter((f) => f.endsWith('.js'));

test('no src module scope binding shadows a browser global', () => {
  const offences = [];
  for (const f of files) {
    const lines = readFileSync(new URL(f, SRC), 'utf8').split('\n');
    lines.forEach((line, i) => {
      // column 0 only: an indented declaration is function-scoped and harmless
      const m = /^(let|const|var|function)\s+([A-Za-z_$][\w$]*)/.exec(line);
      if (m && BROWSER_GLOBALS.includes(m[2])) offences.push(`src/${f}:${i + 1} — ${m[1]} ${m[2]}`);
    });
  }
  assert.deepEqual(offences, [], `module-scope shadowing of a browser global:\n${offences.join('\n')}`);
});

test('clearHash reaches the History API through window', () => {
  const src = readFileSync(new URL('main.js', SRC), 'utf8');
  const m = /function clearHash\(\)[\s\S]{0,400}?\n\}/.exec(src);
  assert.ok(m, 'clearHash() still exists');
  assert.match(m[0], /window\.history\.replaceState/, 'qualify it as window.history so no local can shadow it');
});
