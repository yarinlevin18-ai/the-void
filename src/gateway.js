// gateway.js — the LLM Gateway exhibit's rule and words. Pure: runs in node --test too.
// The rule mirrors the real gateway (llm-gateway src/index.ts): today's spend is checked
// BEFORE the call, and reaching the cap blocks it (`spend >= dailyUsdCap` → 429). The
// call's own cost is only known afterwards, so it never decides the verdict; an allowed
// call logs it. The numbers are fictional (profile.js `exhibit.scenarios`), and so is
// everything the exhibit shows: no request leaves the page.

const cents = (n) => Math.round(n * 100);
export const money = (n) => `$${(cents(n) / 100).toFixed(2)}`;

const amount = (v, name, min) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min) throw new Error(`gateway: ${name} must be a finite number ≥ ${min}, got ${v}`);
  return v;
};

// 'allowed' | 'blocked'. Compared in cents, so 0.1 + 0.2 can't tip a boundary case.
export function gatewayVerdict({ dailyCap, spentToday }) {
  amount(dailyCap, 'dailyCap', 0.01); amount(spentToday, 'spentToday', 0);
  return cents(spentToday) >= cents(dailyCap) ? 'blocked' : 'allowed';
}

// The outcome line the stop shows under the scenario buttons: a verdict word (never
// colour alone) and the reason, in the gateway's own terms.
export function gatewayOutcome(s) {
  const verdict = gatewayVerdict(s);
  const cost = amount(s.requestCost, 'requestCost', 0);
  const spent = `Spent ${money(s.spentToday)} of the ${money(s.dailyCap)} cap`;
  return verdict === 'allowed'
    ? { verdict, label: 'Allowed', reason: `${spent}, so the call runs and logs ${money(cost)}.` }
    : { verdict, label: 'Blocked', reason: `${spent}, so it is rejected before any model is called.` };
}
