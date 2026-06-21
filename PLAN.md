# Interactive 3D Portfolio — Living Plan

> A navigable, experimental 3D "void you fly through" that doubles as proof-of-skill.
> This is a **living document** — we cut, reshape, and add as the idea evolves.
> Last updated: 2026-06-18

---

## 1. The Pitch (why this works)

Yarin builds **landing pages and SaaS CRM interfaces**. Instead of a normal
scrolling page that *claims* he can build slick experiences, the portfolio
**is** the experience: a prospect flies through a custom-built 3D world to
reach the work. The medium proves the skill before a single word is read.

**Audience:** potential clients / customers evaluating whether to hire him.
**Goal:** create an unforgettable "this person can build anything" impression,
then funnel to contact / project inquiry.

---

## 2. The Concept — "The Void"

- You **fly forward** through dark space.
- The void is built from faint **data points + connecting lines** (a visual nod
  to CRM/SaaS: networks, nodes, relationships) that drift and react as you pass.
- Scattered along the flight path are **glowing structures** — each one a
  **project**. From far away it's a glint; as you approach it resolves into
  something inspectable (a floating panel, a live screenshot, a portal into the
  real site).
- **Movement:** scroll drives forward momentum along a flight path; subtle
  drift/parallax + mouse-look keep it alive (not strictly on-rails).
- **Arrival = the pitch.** The journey ends at a "contact" structure — the call
  to action.

### Locked decisions (Phase 1)
- **Adaptive palette.** Base void = cool data-space + monochrome hybrid
  (cyan/white/grey on near-black). As the camera nears a project, the
  points/lines **recolor to that project's own brand identity**, then fade back
  to neutral on departure. The void "reacts" to what it's presenting.
- **Projects = both.** Each resolves into an **in-world preview**
  (screenshot/video) *plus* a **"visit live" button** to the real site.
- **Sound = subtle, opt-in.** Low ambient hum + soft whooshes on approach.
  Muted by default; visible toggle to enable (avoids autoplay issues).
- **Path = linear first.** One scroll-driven flight that passes every project
  and ends at contact. Architect it so branching/free-fly can be added later.

### Still open (revisit in polish)
- Exact base hues + how dramatic the per-project recolor gets.
- Preview as static screenshot vs. short looping capture.
- Whether the ending/contact moment is its own "structure" or a full stop.

---

## 2b. Flight Path / Storyboard  (from Yarin's sketch, 2026-06-18)

The journey is **linear**, moving **forward then upward**. Node sequence:

1. **Hero Section** — entry / first impression.
2. → *forward* → **My Projects** — a **hub** showing *all* projects & prototypes
   (the full body of work). The flight then features the 4 favorites below.
3. → *forward* → **Project 1** (+ description panel).
4. → *forward* → **Project 2** (+ description panel).
5. → *up* → the path tilts upward and **widens** so **Project 3 & Project 4**
   are **seen together**, flanking the viewer (each with a description). This is
   a deliberate rhythm change after the one-at-a-time beats.
6. → *up* → **Final section with footer** — the ending / contact CTA.

Notes:
- **4 featured projects** total; Hero + My Projects are framing beats.
- Motion: forward (z) for beats 1–4, then upward (y) for 5–6.
- Each featured project has a description + (per earlier decision) an in-world
  preview and a "visit live" button.

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| 3D engine | **Three.js** | Industry standard, huge ecosystem, runs in any browser |
| Dev server / build | **Vite** | Instant local preview, fast hot-reload, simple deploy |
| Language | **Plain JS** to start | Keep it lean; add React only if/when it earns its place |
| Hosting (later) | Vercel / Netlify / Cloudflare Pages | Free, push-to-deploy |

Built and iterated **with Claude Code** locally.

---

## 4. Phased Roadmap

Each phase ends with something runnable. We don't move on until the current
phase *feels* right.

### Phase 1 — Concept & mood lock  ✅ DONE
- **North star:** *You fly forward through a dark, living void built from drifting
  data-points and connecting lines. Scattered along the path are glowing
  structures — Yarin's projects. As you approach one, the void recolors to that
  project's own brand identity and the structure resolves from a distant glint
  into an in-world preview you can inspect, with a button to visit the live site.
  Subtle ambient sound deepens the dive. The flight is linear and ends at a
  contact moment. The experience itself is the proof of skill.*

### Phase 2 — Scaffold
- Claude Code sets up Vite + Three.js.
- A blank scene you can already orbit/look around. Confirms toolchain works.
- **Output:** `npm run dev` shows an interactive empty void.

### Phase 3 — Navigation & feel
- Build the flight: scroll-driven forward motion + drift + mouse-look.
- Tune speed, easing, field-of-view, fog/depth.
- Get the *motion* feeling good with placeholder boxes — before real content.
- **Output:** flying through the void feels great empty.

### Phase 4 — The void itself
- The data-point/line field that makes the space feel like *something*.
- Parallax, subtle reactivity as you pass.
- **Output:** the void reads as intentional, on-brand atmosphere.

### Phase 5 — Content placement
- Drop real projects in as structures along the path.
- Approach behavior (glint → resolve → inspect), titles, descriptions, links.
- **Output:** the actual portfolio is in the world.

### Phase 6 — Polish
- Lighting, materials, transitions, intro moment, the contact/CTA ending, sound.
- **Output:** the "wow."

### Phase 7 — Performance & deploy
- Make it smooth on phones / weaker GPUs (this is the real risk with 3D).
- Fallback for devices that can't handle it.
- Deploy online, custom domain.
- **Output:** it's live.

---

## 5. Asset Checklist (Yarin has assets ready)

For each project we'll want:
- [ ] Title
- [ ] One-line description
- [ ] Screenshot(s) or short screen-capture
- [ ] Live URL (if it's a portal)
- [ ] Role / tech used (optional flavor)

Plus global: name, tagline, contact method (email/form/calendar), socials.

---

## 6. Known Risks / Watch-outs
- **Performance on mobile** — biggest one. Plan a graceful fallback early.
- **Scope creep** — the void is fun to polish forever. Phases keep us honest.
- **Usability vs. art** — even "fully experimental," a prospect must still find
  the work and the contact button. We'll keep an escape hatch / clear CTA.
- **Load time** — heavy 3D = slow first paint. Need a good loading moment.

---

## 7. Decisions Log
- 2026-06-18 — Work = landing pages + SaaS CRM. World metaphor = "abstract void
  you fly through." Stack = Three.js + Vite + plain JS. Build with Claude Code.
  Boldness = fully experimental.
- 2026-06-18 — Phase 1 locked: adaptive per-project palette (cool-data/monochrome
  base), projects = preview + visit-live, subtle opt-in sound, linear path first
  (branching kept as future option). North star written.
- 2026-06-18 — Storyboard locked (see §2b): Hero → My Projects (hub of ALL work)
  → P1 → P2 → P3&P4 seen together → Final/footer. Motion forward-then-up. 4
  featured projects.
- 2026-06-18 — Navigation = section-snapping: each scroll/arrow press flies to
  the next composed camera shot (the BEATS positions) and settles; not analog
  scrubbing. Final beat: camera looks straight up at a far-overhead footer, and
  a "free roam" button unlocks OrbitControls to explore the void. (Touch/swipe
  support still TODO.)
- 2026-06-18 — Built "Director Mode" editor (v0.7): press E to free-fly the void
  (orbit/zoom/pan, adjustable look-sensitivity), manage sections as an editable
  list (add-from-view / delete / reorder), capture shots via "Set cam from view",
  precise typed numeric cam/look fields, Undo/Redo (Ctrl+Z / Ctrl+Shift+Z),
  Save/Reset, Copy config, Preview. Edits persist in localStorage. 3D gizmos
  show the path (cyan=camera, magenta=aim, white=selected, line=path).
