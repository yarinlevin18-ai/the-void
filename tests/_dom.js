// Minimal browser globals for node --test, via happy-dom. Call installDom()
// BEFORE dynamically importing a module that touches window/document/matchMedia
// at load time (panels.js reads prefers-reduced-motion on import).
import { Window } from 'happy-dom';

export function installDom({ reducedMotion = false } = {}) {
  const win = new Window({ url: 'http://localhost/' });
  const def = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  def('window', win);
  def('document', win.document);
  for (const k of ['Element', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Node', 'MouseEvent', 'Event']) def(k, win[k]);
  def('matchMedia', () => ({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} }));
  win.matchMedia = globalThis.matchMedia;
  def('requestAnimationFrame', (fn) => setTimeout(() => fn(performance.now()), 16));
  def('navigator', { clipboard: undefined });
  return win;
}

// Dispatch a bubbling, cancelable click; returns false when preventDefault() was called.
export function click(el) {
  return el.dispatchEvent(new globalThis.MouseEvent('click', { bubbles: true, cancelable: true }));
}

export const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
