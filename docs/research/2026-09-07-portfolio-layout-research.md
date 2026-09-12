# Portfolio layout research — 2026-09-07

Compiled by a web-research pass for the layout rethink. Sources cited inline.

**Bottom line:** The best-regarded 2024–2026 portfolios split into two camps — "the 3D world *is* the site" (Bruno Simon, Heffernan, Zhou, Breton, Lempens) and "normal skimmable page with one restrained 3D/motion moment" (Minh Pham, Snellenberg, Elliott Mangham, Huy Phan, Rauno/Paco/Emil). Recruiter-side sources consistently describe a ~15–30 second first pass and flag splash screens, scroll-jacking, and buried contact as interview-losers. For a part-time student role plus freelance clients, the evidence points to the second camp with the void kept as a persistent background, not a gate.

Several sites (Snellenberg, Lempens, Iventions, samsy.ninja, Zhou's Medium case study) returned 403/blank to the fetcher; for those the report relies on award pages and secondary descriptions.

## 1. Concrete sites (verified live unless noted)

| Site | Structure / where 3D stops | Projects | Contact/CV | Memorable because |
|---|---|---|---|---|
| **Bruno Simon** — [bruno-simon.com](https://bruno-simon.com/) (folio-2025, [GitHub](https://github.com/brunosimon/folio-2025), MIT) | Entire site is a drivable WebGPU/TSL world; text menu overlays it. No text-only fallback found. | Discovered in-world by driving to zones | Discord links inside the world; About text in-canvas | The benchmark "3D world = site"; also the cautionary case: nothing is skimmable without driving. |
| **Jordan Breton** — [jordan-breton.com](https://jordan-breton.com/) (FWA SOTD Oct 2 2025) | Floating-island Three.js scene with fixed-point camera nav; HTML nav Explore/About/Contact and real text. Loading: "0% Start / Initializing…". | In-world, fixed camera stops | Email, LinkedIn, X, YouTube as plain HTML in the Contact section | Hybrid: full 3D world but About/Contact are real DOM text — close to our architecture. |
| **Sébastien Lempens** — [sebastien-lempens.com](https://sebastien-lempens.com/) (Awwwards SOTD Mar 29 2024, [award page](https://www.awwwards.com/sites/sebastien-lempens)) | Scroll-driven camera tour through 3D Paris per [CreativeDevJobs](https://www.creativedevjobs.com/blog/best-threejs-portfolio-examples-2025); About (video), Project gallery, Mini-game, Contact form sections. | Gallery section along the scroll path | Contact form at path end | Closest precedent for "scroll = camera flight with beats". |
| **Henry Heffernan** — [henryheffernan.com](https://henryheffernan.com/) ([repo](https://github.com/henryjeff/portfolio-website)) | 3D desk/CRT scene; you "zoom into" a 2D Win95-style OS where all content lives as windows. | Windows inside the fake OS | Inside the OS | The 3D is a frame; the content layer is ordinary 2D UI — the cleanest "3D shell, HTML content" split. |
| **Jesse Zhou** — [jesse-zhou.com](https://www.jesse-zhou.com/) ([FWA](https://thefwa.com/cases/jesses-ramen-portfolio)) | 3D ramen shop; loader + START button. Content on in-scene screens/signs. | In-scene screens | In-scene | Charming, but gated behind loader + START — exactly what recruiter sources penalize. |
| **Minh Pham** — [minhpham.design](https://minhpham.design/) (Awwwards SOTD, per [Hon Tran](https://www.hontran.dev/blog/best-award-winning-websites-2026)) | Normal single scroll: Hero → About → Skills → Experience timeline → Client work → Testimonials → Footer. Three.js sits *under* GSAP; "3D never overwhelms the work it's meant to frame". | Six one-line client entries | Footer socials + contact; top nav About/Work/Contact | Proof that a WebGL portfolio can be read top-to-bottom in 30s. |
| **Dennis Snellenberg** — [dennissnellenberg.com](https://dennissnellenberg.com/) ([Awwwards](https://www.awwwards.com/sites/dennis-snellenberg)) | Pages: Home / Work / About / Contact. GSAP + Lenis + Barba, parallax, two-colour palette; no WebGL. Work page lists 18 projects by Design/Development with dates. | Big typographic rows with hover image previews | Contact page + form | The most-cloned "motion without 3D" freelancer layout. |
| **Elliott Mangham** — [elliott.mangham.dev](https://elliott.mangham.dev/) (Awwwards SOTD + Dev Award Nov 2025) | Hero (headshot, title, availability) → Credentials (role, price ranges, history) → Awards → Client logos → Stats → 18+ project thumbnail grid → Footer. No WebGL. | Thumbnail grid | Email, LinkedIn, GitHub, WhatsApp, Calendly | Freelance-optimized: price ranges and availability above the fold. |
| **Huy Phan Vol.2** — [huyml.co](https://huyml.co/) (Awwwards nominee Sep 2026) | GSAP + Three.js + Framer; loading → project gallery → case-study pages → About/Contact. | Gallery + dedicated case studies | About/Contact pages | Freshest example of "3D accents on a conventional case-study site". |
| **Rauno Freiberg** — [rauno.me](https://rauno.me/) | One-screen intro: bio line, nav (Craft / Projects / Field Notes), archived versions, manifesto bullets. Motion lives in `/craft` demos. | Craft entries as interaction demos | One-click "Email → Copied" button | Contact is one click, zero scrolling. |
| **Paco Coursey** — [paco.me](https://paco.me/) / **Emil Kowalski** — [emilkowal.ski](https://emilkowal.ski/) | Plain text lists: intro → Projects → Writing → Connect. | Linked list, one line each | Bottom Connect / socials | The "design engineer" minimal pattern; craft shown in the details. |
| **Brittany Chiang** — [brittanychiang.com](https://brittanychiang.com/) | Header nav About/Experience/Projects; Experience rows (dates, role, tags), project cards, "View Full Résumé" PDF. | Cards with tags | PDF résumé link + header socials | The most-imitated "recruiter-first" dev layout. |

Also: [samsy.ninja](https://samsy.ninja/) (WebGPU cyberpunk world), [iventions.com](https://iventions.com/) (Three.js "spotlit installation" gallery).

## 2. Recurring layout patterns

- **3D world as the whole site, content in-scene** — Bruno Simon, Zhou, Heffernan, Breton, samsy. Highest wow, lowest skimmability; typically loader + "Start".
- **Scroll-as-camera-path with HTML beats** — Lempens, [bilal.show](https://bilal.show/), Shopify Editions per [Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026). Our current model.
- **3D shell → 2D UI for content** — Heffernan (OS windows), Breton (DOM About/Contact).
- **Conventional page with WebGL under it** — Minh Pham, Huy Phan, Iventions. "Restraint" is what judges praised.
- **Typographic project rows + hover preview, case-study subpages** — Snellenberg, Huy Phan.
- **Credentials-first freelancer page** (availability, price band, logos, Calendly) — Mangham.
- **Text-list minimalism with craft demos in a sub-route** — Rauno, Paco, Emil.
- **Sticky index / résumé-shaped page** — Brittany Chiang.

## 3. What recruiters say they want (2024–2026)

- ~30 seconds per portfolio before a reject decision; first-pass kills are pixelated images, generic titles, weak opening line — [ADPList / Matej Latin, Mar 2025](https://adplist.substack.com/p/only-30-seconds-to-reject-your-portfolio).
- 3–5 polished projects beat 10+; working apps not repos; must be mobile-friendly — [TieTalent 2025](https://tietalent.com/en/blog/220/beyond-the-ats-how-to-build-a-tech-portfolio), [Hakia](https://hakia.com/skills/building-portfolio/) (stats uncited, directional only).
- Juniors: projects section is "your most important section"; skip buzzword summaries and 20-tech skill dumps — [DEV, Nov 2025](https://dev.to/dhruvjoshi9/junior-dev-resume-portfolio-in-the-age-of-ai-what-recruiters-care-about-in-2025-26c7).
- "Simple and straightforward is best… put the work at the top" — [Elliot Dahl](https://elliotdahl.substack.com/p/get-noticed).

## 4. Anti-patterns named by sources

- Splash/loading screens, "scroll to begin", animated intros — [UX Companion 2026](https://uxcompanion.co.uk/ux-portfolio-mistakes).
- Contact hidden in footer or behind a nav link "silently loses interviews" — same source.
- Scroll-jacking: breaks keyboard/space-bar scrolling, hurts SEO — [Zach Sean, Apr 2025](https://www.zachsean.com/post/scroll-hijacking-how-this-web-design-trend-can-make-or-break-your-business-website), [Healy](https://healywebdesign.co.uk/news/what-is-scrolljacking-and-should-you-ever-do-it/).
- Sub-16px text, low contrast, broken mobile breakpoints; no way to deep-link — UX Companion.
- Mobile perf: "18fps on mid-range Android", "9MB page… six seconds" — [Hon Tran, Jun 2026](https://www.hontran.dev/blog/best-award-winning-websites-2026).

## 5. Three directions proposed

**A. "Breton/Heffernan split": void as persistent background, dossier as the real site.** Keep the fly-through, but make the DOM dossier the primary, always-reachable layer: a fixed top bar (Name · Student dev · Available · Email-copy button) visible from frame one, no loader gate. Collapse 9 beats to 5 (Hero → Work → About/Stack → Road/Ambitions → Contact); each beat's HTML block is a full, scrollable, mobile-readable section. Contact is first-and-last on screen. The camera flight becomes the transition between sections, but native scroll is never captured.

**B. "Minh Pham" conventional page with the void underneath.** A standard long-scroll page (Hero → 3–4 project rows in Snellenberg-style big typography with hover previews → Experience timeline → Contact) rendered over a slowly drifting void that recolors per project. Camera beats trigger from intersection observers rather than snap-scroll, so keyboard, space bar and find-in-page all work. Project rows link to short case-study pages. Safest for the 30-second recruiter pass, least engineering.

**C. "Two doors": skimmable front, optional flight.** Land on a résumé-shaped page (sticky left index: About / Experience / Projects / Résumé PDF) with a small live void preview and a single "Take the flight" button that launches the full 9-beat experience at `/flight`. Hiring teams get the 15-second version; clients and devs get the showpiece; reduced-motion and mobile default to the front door. Keeps the existing build intact.

Researcher's recommendation: B, with A's fixed contact bar.
