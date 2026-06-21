# PRD — Yarin Levin Portfolio Landing Page ("The Void")

> Product Requirements Document. Formalizes the concept in `PLAN.md` into
> scoped requirements. Companion to `DESIGN_WORKFLOW.md` (modern-not-traditional,
> 10-step motion roadmap). Living doc — revise as the build evolves.
> Last updated: 2026-06-21 · Owner: Yarin Levin

---

## 1. Summary

A 3D, scroll-driven portfolio where the visitor **flies forward through a dark
"void"** of drifting data-points and connecting lines. Scattered along the path
are the projects; approaching one recolors the void to that project's brand and
resolves it from a distant glint into an inspectable preview with a "visit live"
button. The flight ends at a contact CTA.

**The medium is the message:** the site doesn't claim Yarin can build slick,
motion-led interfaces — it *is* one. Skill is proven before a word is read.

## 2. Problem & opportunity

Yarin builds modern, motion-led landing pages and SaaS/product interfaces, but
has no single home that demonstrates this. A conventional scrolling portfolio
under-sells the exact skill he's hired for. The opportunity: a portfolio that is
itself a flagship piece of work — equally a hiring asset (agencies, startups,
SaaS, scaleups) and a client-acquisition asset.

## 3. Goals & success metrics

**Primary goal:** turn a cold visitor into "this person can build anything," then
into a contact / interview.

| Goal | Success signal |
|---|---|
| Prove craft instantly | Visitor reaches first project beat without bouncing |
| Showcase range | All 4 featured projects + full-work hub viewed |
| Convert | Contact CTA clicked / email sent / live links opened |
| Perform | Smooth on mid-range laptop + graceful mobile fallback |
| Get the job | Recruiters/agencies reply; used as the link on CV + LinkedIn |

**Non-goals (v1):** blog, CMS, multi-language, e-commerce, login. Free-fly /
branching navigation is post-v1.

## 4. Audience

1. **Hiring teams** — agency creative leads, startup/SaaS eng & design managers,
   recruiters. Often time-poor and on varied devices → needs a fast, legible
   path and a skimmable fallback.
2. **Potential clients** — evaluating whether Yarin can build a standout site.
3. **Peers / the motion community** — Awwwards/Dribbble-type audience; shareable.

## 5. Experience requirements

### 5.1 The flight (from `PLAN.md` storyboard — locked)
Linear path, forward (z) then upward (y):

1. **Hero** — entry / first impression. One bold line, one CTA. Sound toggle (muted by default).
2. **My Projects (hub)** — glimpse of the *full* body of work + prototypes.
3. **Project 1** — resolves + description panel + "visit live."
4. **Project 2** — same beat.
5. **Projects 3 & 4 together** — path tilts up and widens; both flank the viewer (rhythm change).
6. **Final / contact** — footer + CTA.

### 5.2 The void (atmosphere)
- Data-points + connecting lines (nod to CRM/SaaS networks) drifting with parallax.
- Base palette: cool data-space + monochrome (cyan/white/grey on near-black).
- **Adaptive palette:** on approach, void recolors to the project's brand, fades back on departure.

### 5.3 Motion principles (per `DESIGN_WORKFLOW.md`)
- Custom easing over linear; purposeful before→curve→after.
- Reveal recipe per element (headline y+16–24px / opacity 0→100; image scale 0.96→1, blur 8→0; CTA outline→filled).
- Restraint: one focal point per beat, limited concurrency, right read order.

### 5.4 Accessibility & fallback (REQUIRED, not optional)
- `prefers-reduced-motion` → static, scrollable version with the same content.
- Mobile / low-GPU → lighter particle count or a flat 2D fallback that still shows all projects + contact.
- Keyboard reachable contact + live links; readable contrast on all panels.

## 6. Content — the work to feature

**4 featured projects** (in-world preview + live button). Recommended set, picked
to show range (client work · SaaS depth · creative/3D · automation):

| # | Project | What it proves | Brand color cue |
|---|---|---|---|
| 1 | **SHADIEZ** | Client e-commerce landing, premium brand, motion-led, conversion-focused | cream / teal |
| 2 | **TEEPO** | Full SaaS product — Next.js + Flask + Supabase + AI, Hebrew RTL, real complexity | product blue |
| 3 | **LifeRPG** | Creative/3D range — Three.js TPS life-sim, 14 milestones, depth & systems | neon / dark |
| 4 | **AeroCy** *or* **Mentorship** | Shipped client/product site (bilingual / Supabase app) | brand accent |

**My Projects hub** also lists the supporting body of work: Worldiez (Remotion +
FFmpeg + Postiz video engine), Mentorship, and the R&D labs (motion-lab,
three-lab, transition-lab, AnimationStudio, design-scraper) as proof of a daily
motion practice. *Final 4 to be confirmed by Yarin.*

Each project needs: title, 1–2 line role/impact description, in-world preview
(screenshot or short loop — TBD per project), live URL, optional stack tags.

## 7. Technical requirements

| Layer | Choice | Notes |
|---|---|---|
| 3D | **Three.js** | Core void + project structures |
| Build | **Vite** | Fast HMR, push-to-deploy |
| Language | **Plain JS** first | Add React only if it earns it |
| Hosting | Vercel / Netlify / Cloudflare Pages | Free, push-to-deploy |
| Assets | Compressed screenshots/loops, lazy-loaded | Keep payload lean |

**Performance budget:** target 60fps on a mid laptop; cap particle counts;
lazy-load previews; degrade gracefully. Define a hard payload ceiling before
content placement.

## 8. Scope & phases (maps to `PLAN.md` roadmap)

- **Phase 1 — Concept lock** ✅ done (`PLAN.md`).
- **Phase 2 — Scaffold:** Vite + Three.js, orbitable empty void. *Exit:* `npm run dev` shows interactive void.
- **Phase 3 — Navigation & feel:** scroll-driven forward motion + drift + mouse-look, tuned with placeholders. *Exit:* flying feels great empty.
- **Phase 4 — The void:** data-point/line field + parallax + reactivity. *Exit:* reads as intentional on-brand atmosphere.
- **Phase 5 — Content placement:** real projects as structures along the path. *Exit:* all beats present, previews + live buttons wired.
- **Phase 6 — Polish & motion:** adaptive palette, sound, reveal recipes, reduced-motion + mobile fallback. *Exit:* QA passes on phone + laptop.
- **Phase 7 — Ship & showcase:** deploy, custom domain, record a 30–60s capture for CV/LinkedIn/Dribbble.

## 9. Open questions
- Final 4 featured projects (confirm #4: AeroCy vs Mentorship).
- Preview format per project: static screenshot vs short looping capture.
- How dramatic the per-project recolor gets; exact base hues.
- Is the contact ending its own "structure" or a hard stop?
- Custom domain name.

## 10. Definition of done (v1)
Deployed, custom domain, all 4 projects + hub + contact reachable; smooth on a
mid laptop; reduced-motion and mobile fallbacks verified; a recorded clip exists
for sharing; the live URL is on Yarin's CV and LinkedIn.
