# The Void

Yarin Levin's portfolio: a 3D flight through a living data network. Each stop
tells part of the story: the person, the way of building, seven projects, and
how to get in touch. Built by directing Claude Code end to end.

**Live:** https://yarinlevin.com (until the domain goes live:
https://the-void-khaki-pi.vercel.app)

## Stack

Vanilla JavaScript, [three.js](https://threejs.org) and [Vite](https://vite.dev),
with no framework. The fonts are self-hosted and the site makes no external
requests; its Content-Security-Policy (`vercel.json`) keeps it that way.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # the node --test suites
npm run build    # runs the tests, then builds dist/
npm run stamp    # writes the owner's name into any new image under public/
```

## Where things live

| Path | What |
| --- | --- |
| `src/content/profile.js` | Every fact about Yarin; the one place to edit copy |
| `src/main.js` | Scene, flight, render loop, performance tiers, save migrations |
| `src/render.js`, `src/panels.js`, `src/bar.js` | The text of each stop and the top bar |
| `src/style.css` | All styling, the phone layouts and the print CV |
| `scripts/` | Build helpers: the git build log, the no-JS page, the owner marks, image stamping |
| `tests/` | `node --test` suites, run by every build |
| `sketches/` | Early standalone demos and font specimens; not part of the site |
| `CLAUDE.md` | Design decisions and conventions |

## License

© 2026 Yarin Levin. All rights reserved; see [LICENSE](LICENSE). three.js and
the fonts keep their own open-source licenses.
