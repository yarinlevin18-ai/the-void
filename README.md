# The Void — Interactive 3D Portfolio

An experimental, navigable 3D "void you fly through" that showcases Yarin's work
(landing pages & SaaS CRM builds). The experience itself is the proof of skill.

See **[PLAN.md](./PLAN.md)** for the full concept, decisions, and roadmap.

## Run it locally

You need [Node.js](https://nodejs.org) installed (you have it ✅).

```bash
npm install      # one time — downloads Three.js + Vite
npm run dev      # starts the local dev server
```

Then open the URL it prints (usually **http://localhost:5173**).
You should see the title over a dark field of glowing points — **drag to look
around, scroll to zoom**. That confirms everything works (Phase 2 ✅).

## Other commands

```bash
npm run build    # bundle for production into /dist
npm run preview  # preview the production build locally
```

## Project structure

```
index.html        # entry page + HTML overlay
src/main.js       # the Three.js scene (the void) — heavily commented
src/style.css     # base styling + overlay
PLAN.md           # living plan / roadmap
```

## Where we are

- ✅ Phase 1 — concept & mood locked
- ✅ Phase 2 — scaffold — empty navigable void
- ✅ Phase 3 — flight navigation (scroll-driven forward-then-up flight)
- ⬜ Phase 4 — the void atmosphere (data-lines, parallax, reactivity)
- ⬜ Phase 5 — drop in real projects
- ⬜ Phase 6 — polish (lighting, sound, transitions, contact ending)
- ⬜ Phase 7 — performance + deploy
