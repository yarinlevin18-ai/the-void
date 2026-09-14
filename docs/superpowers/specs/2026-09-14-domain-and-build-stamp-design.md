# Custom domain + build stamp — design (2026-09-14)

Status: approved in conversation, 2026-09-14.

## Decisions

- Canonical domain: **yarinlevin.com** (available on 2026-09-14; .dev/.io/.me/.co
  also free, the brand names thevoid.dev / intothevoid.dev / the-void.dev are
  taken). No brand domain for now; flythevoid.dev / thevoid.page were free
  if that changes.
- Bought **through Vercel** (project `the-void` → Settings → Domains → Buy).
  Yarin does the purchase; Claude never enters payment details.
- The site shows a **build date**, baked in by Vite at build time, so every
  push updates it with no manual step.

## 1. Domain (Vercel, Yarin's steps)

1. Buy `yarinlevin.com` in Settings → Domains. Vercel attaches it to the
   production deployment and issues the certificate.
2. Add `www.yarinlevin.com` in the same tab and tick "Redirect to
   yarinlevin.com".
3. Nothing else. DNS lives at Vercel.

`vercel.json` (new) redirects the old production host to the new one, same
path, 308, so old links and the Google index carry over. Preview deployments
have other hosts and are untouched:

```json
{
  "redirects": [
    { "source": "/(.*)", "has": [{ "type": "host", "value": "the-void-khaki-pi.vercel.app" }],
      "destination": "https://yarinlevin.com/$1", "permanent": true }
  ]
}
```

## 2. The site's references

- `index.html`: `canonical`, `og:url`, `og:image`, `twitter:image`, JSON-LD
  `url` → `https://yarinlevin.com/` (image URLs keep `/og.jpg`).
- `src/content/profile.js`: `links.site: 'https://yarinlevin.com'` (feeds
  the print CV).
- `public/robots.txt`:
  ```
  User-agent: *
  Allow: /
  Sitemap: https://yarinlevin.com/sitemap.xml
  ```
- `public/sitemap.xml`: the single URL `https://yarinlevin.com/` (fragments
  are not pages).
- Guard test (`tests/domain.test.js`): `index.html`, every file under `src/`
  and `public/robots.txt` / `public/sitemap.xml` contain no
  `the-void-khaki-pi.vercel.app`; `index.html` canonical and `profile.links.site`
  agree on the host. `vercel.json` is exempt (it names the old host on purpose).
- Docs: CLAUDE.md "Live" line + open-work item 6 → done; BUILD_PLAN.md item.

## 3. Build stamp

- `vite.config.js` adds `define: { __BUILT__: JSON.stringify(<date>) }` where
  `<date>` is the build's UTC date formatted `D Mon YYYY` in English
  (`14 Sep 2026`), computed in the config at build/dev start. A `declare`-style
  comment documents the global; `tests/globals.test.js` is unaffected (it
  guards module-scope bindings, not injected globals).
- `renderContact(p, built)` appends, when `built` is a non-empty string,
  `<div class="card-row card-built">Updated <time datetime="…">14 Sep 2026</time></div>`
  as the last row inside the card, styled like `.card-foot` (Doto, 12 px,
  `#68859e`). The `datetime` attribute is the ISO date (`2026-09-14`), so the
  config injects both: `__BUILT__` = `{ label, iso }` as a JSON object.
- `src/panels.js` passes `typeof __BUILT__ !== 'undefined' ? __BUILT__ : null`
  (keeps happy-dom tests and any non-Vite runtime working).
- `src/printcv.js`: `mountPrintCV(p, built)` appends `Updated 14 Sep 2026`
  to the contact line; `main.js` passes the same object.
- `index.html` noscript: a `<span id="built"></span>` after the contact
  paragraph, and a one-line module script in `main.js` startup fills it. With
  scripting off it stays empty (acceptable for the skim path).
- Tests: `renderContact(PROFILE, { label: '14 Sep 2026', iso: '2026-09-14' })`
  includes the row and the `datetime`; without `built` no row;
  `mountPrintCV(PROFILE, built)` includes the label. Total 52.

## Out of scope

The brand domain, an analytics pixel, an RSS feed, email on the domain.
