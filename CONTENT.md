# CONTENT.md — Phase A content lock ("The Void")

> The filled content table BUILD_PLAN Phase A requires. Drives Phase B wiring.
> Status: **LOCKED & WIRED 2026-08-13** — Yarin confirmed Kiara's Club for
> slot #4; Phase B content is in `DEFAULT_BEATS` (src/main.js, save v7).
> Previews captured to `public/previews/*.jpg` (42–115KB each).
> OPEN: deploy Kiara's Club to Vercel (its beat has no live link until then);
> optional: retake LifeRPG preview with a more dramatic in-game moment.

## Locked decisions (defaults — confirm)

| Decision | Choice | Notes |
|---|---|---|
| Featured 4 | **SHADIEZ · TEEPO · LifeRPG · Kiara's Club** ⚠ | PRD said "AeroCy vs Mentorship" for #4; Kiara's Club chosen instead. NOTE: Kiara's Club is NOT deployed yet (see below) — if a live URL matters for #4, reconsider. |
| Preview format | **Static screenshots** (upgrade individual ones to loops later) | Lightest payload; PRD open Q resolved. |
| Hero copy | **Keep current** — "Yarin Levin / I build landing pages & SaaS interfaces" / "scroll to fly" | |
| Final beat | **Own structure** — contact CTA as an in-world moment (camera already ends looking straight up) | |

## The content table (repo-audited 2026-08-13)

| Beat | Project | Role/impact line (draft — Yarin to approve) | Stack tags | Live URL | Brand colors | Preview asset |
|---|---|---|---|---|---|---|
| Project 1 | SHADIEZ | Storytelling e-commerce landing for a premium beach sun-shade — 3D GLB hero, scroll-driven motion, lead capture. | Next.js 16 · R3F/three.js · Tailwind v4 · Framer Motion · Lenis | `https://shadiez.vercel.app` (certain) · `https://www.shadiez.com` (intended, unverified) | cream `#FBF7F0` · wood `#8E5330` · amber CTA `#E8A04A` · dusty blue `#C3D6DC`/`#768D9F` | `previews/shadiez.png` ✅ (2.1MB — compress) |
| Project 2 | TEEPO | Hebrew-RTL study platform for Israeli students — Moodle/grades scraping via Chrome extension, Google-Drive-as-datastore, Claude AI assistant. | Next.js 14 · Supabase auth · Google Drive DB · Claude API · Chrome extension | `https://bgu-study-organizer.vercel.app` (live) · `teepo.app` (branded) | cream `#f5ead2` · ink `#2d1810` · green `#16a34a` · lime `#84cc16` — **NOT product blue** | `previews/teepo.png` — TODO |
| Project 3 | LifeRPG | Local-first desktop life-RPG — real habits tracked at OS level grow a 3D character and homestead (Electron + R3F + SQLite). | Electron 42 · Next.js 15 · R3F/three.js · better-sqlite3 | none (desktop app, not in git) ⚠ decide: repo link / case study / no link | near-black `#0a0a0b` · panel `#141416` · amber accent `#f5a623` — **amber, not neon** | `previews/liferpg.png` — TODO (run local, screenshot) |
| Project 4 | Kiara's Club | Dachshund-first pet storefront — brand + shop + cart built from a real palette (sampled from Kiara the dapple dachshund). | Next.js 16 · React 19 · Tailwind v4 · client cart | **NOT DEPLOYED** ⚠ — kiarasclub.com is footer text only; deploy before ship or swap #4 | cream `#faf6ee` · chocolate `#3e2a20` · mustard `#e8b04b` · tan `#c67b45` | `previews/kiaras-club.png` — TODO (local dev, screenshot) |

## My Projects hub (supporting body of work)
Worldiez · Mentorship · AeroCy · dira-lease · SecScan · BodyLoop · R&D labs
(motion-lab, three-lab, transition-lab, AnimationStudio, design-scraper).
⚠ Confirm which to show; keep it a compact list/grid.

## Contact beat
- CTA copy: **TODO** (default: "Let's build something" + email button)
- Email: yarinlevin18@gmail.com
- Links: LinkedIn ⚠ (URL?), GitHub (yarinlevin18-ai)

## Asset conventions
- `public/previews/<slug>.png` — 16:10-ish, ≤300KB after compression, captured at 1600px wide.
- Panel aspect in-world is 70×44 (≈16:10) per DEFAULT_BEATS.

## Resume checklist (when we un-pause)
1. Yarin signs off the ⚠ decisions (esp. #4 given Kiara's Club isn't deployed).
2. Capture previews: TEEPO from live URL; LifeRPG + Kiara's Club from local dev servers.
3. Compress all previews ≤300KB.
4. → Phase B (PROJECTS array + wiring).
