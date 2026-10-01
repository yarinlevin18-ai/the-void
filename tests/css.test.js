import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// style.css had no test at all, which is how two bugs shipped (2026-09-29 review): the
// desktop Abilities/Potential strip used var(--ease-out), defined only inside a portrait
// media block, so its whole transition was invalid on desktop; and reduced motion's
// `transform: none !important` also removed the transforms that place the lab card.
const root = new URL('../', import.meta.url);
const css = readFileSync(new URL('src/style.css', root), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const js = [...readdirSync(new URL('src/', root)).filter((f) => f.endsWith('.js')).map((f) => `src/${f}`), 'index.html']
  .map((f) => readFileSync(new URL(f, root), 'utf8')).join('\n');

// Every "--name:" declaration, with whether it sits at the top level (applies everywhere)
// or inside an @media / @supports block (applies only sometimes).
function customProps(src) {
  const out = [];
  let depth = 0, atDepth = [];
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') { const head = src.slice(src.lastIndexOf('}', i - 1) + 1, i); atDepth.push(/^\s*@/.test(head.split(';').pop())); depth++; }
    else if (ch === '}') { depth--; atDepth.pop(); }
    else if (ch === '-' && src[i + 1] === '-' && /[{;\s]/.test(src[i - 1] || ' ')) {
      const m = /^--([\w-]+)\s*:/.exec(src.slice(i));
      if (m) out.push({ name: m[1], conditional: atDepth.includes(true) });
    }
  }
  return out;
}

test('every var() without a fallback names a property that is always defined', () => {
  const always = new Set(customProps(css).filter((d) => !d.conditional).map((d) => d.name));
  const bare = [...css.matchAll(/var\(--([\w-]+)\s*\)/g)].map((m) => m[1]);
  for (const name of new Set(bare)) {
    const setByScript = new RegExp(`--${name}\\s*:|'--${name}'`).test(js);   // style="--i:0", setProperty('--x', …)
    assert.ok(always.has(name) || setByScript, `var(--${name}) has no fallback and --${name} is only defined inside a media query`);
  }
});

test('reduced motion drops entrance transforms but keeps the ones that place things', () => {
  const rm = css.split('@media (prefers-reduced-motion: reduce)').slice(1).map((b) => b.slice(0, b.indexOf('}\n}') + 3));
  const killers = rm.flatMap((b) => [...b.matchAll(/([^{}]*\.stop \*[^{}]*)\{[^}]*transform:\s*none\s*!important/g)].map((m) => m[1]));
  assert.ok(killers.length > 0, 'the reduced-motion rule that resets stop transforms is still there');
  for (const sel of killers) for (const keep of ['.lab', '.tl-dot']) assert.ok(sel.includes(':not(') && sel.includes(keep), `${sel.trim()} must spare ${keep}`);
});

// The landscape-phone tier (2026-09-30) overrides the width tiers by source order, so it must stay
// last: a block added after it would win over it on a phone held sideways, unmeasured.
test('the landscape-phone tier stays at the end of style.css', () => {
  const at = css.indexOf('@media (orientation: landscape) and (max-height: 520px) {');
  assert.ok(at > 0, 'the tier is there');
  const after = [...css.slice(at).matchAll(/@media[^{]+\{/g)].map((m) => m[0].replace(/\s+/g, ' ').trim());
  assert.deepEqual(after, ['@media (orientation: landscape) and (max-height: 520px) {', '@media (orientation: landscape) and (max-height: 520px) and (max-width: 719px) {']);
  assert.ok(/#hud \.hud-arrows \{[^}]*flex-direction: column/.test(css.slice(at)), 'the chevrons stand in their own lane on the right');
});

// The CV is read by machines too: in the PDF a browser saves, wide tracking turns a heading
// into spaced letters ("M I L I TA R Y S E R V I C E" from pdftotext at .14em, every heading at
// .1em), and a job portal parsing the CV would miss its sections. .08em and below read clean.
test('the print CV keeps its headings machine-readable', () => {
  for (const sel of ['#print-cv h1', '#print-cv h2']) {
    const block = new RegExp(`${sel.replace(/ /g, '\\s+')}\\s*\\{([^}]*)\\}`).exec(css);
    assert.ok(block, `${sel} is styled`);
    const ls = /letter-spacing:\s*([\d.]+)em/.exec(block[1]);
    assert.ok(!ls || +ls[1] <= 0.08, `${sel} letter-spacing ${ls && ls[1]}em is at most .08em`);
  }
});
