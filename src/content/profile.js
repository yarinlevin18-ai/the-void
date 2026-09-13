// profile.js — single source of truth for the person behind The Void.
// Feeds: the v15 flight stops (Intro, CV, How I Build, project stops, Contact),
// the printable CV, and the JSON-LD structured data.
// Nothing about Yarin should be hard-coded anywhere else.
// Interview answers locked 2026-08-29 — see PORTFOLIO_PLAN.md §4b.

export const PROFILE = {
  name: 'Yarin Levin',
  title: 'AI-Native Builder',

  // Three lengths — pick per surface, never rewrite in place.
  bio: {
    line: 'AI-native builder. Student position, part-time — available now.',
    short:
      'AI-native builder with a rare output rate: in five months of directing ' +
      'AI I shipped a dozen products — client e-commerce, a Hebrew-RTL study ' +
      'platform with real auth and a Chrome-extension scraper, this 3D portfolio, ' +
      'and a daily practice of motion labs. I don’t type every line — I direct, ' +
      'review, and ship. Before code: four years of IDF command and a year of ' +
      'public speaking across the US. B.A. student at Ben-Gurion University, ' +
      'looking for a part-time student position.',
    full:
      'I came to development the long way. Four years in the IDF’s Rescue & ' +
      'Training Division — deputy company commander, operations officer through ' +
      'Operation Guardian of Walls — then a year giving 35+ talks across the US ' +
      'and Panama to audiences of 10 to 700. Both jobs taught the same thing: ' +
      'own the outcome, communicate clearly, stay calm when it’s loud.\n\n' +
      'In April 2026 I started building for the web — self-taught, working ' +
      'with AI from day one. I direct Claude the way I once directed a ' +
      'company: clear intent, high standards, full ownership of the outcome. ' +
      'And I haven’t stopped: paid client work (SHADIEZ), a full ' +
      'product with real users’ problems in mind (TEEPO — Hebrew-RTL study ' +
      'platform: Supabase auth, Moodle scraping via a Chrome extension, ' +
      'Google-Drive-as-datastore, Claude AI assistant), and a long tail of ' +
      'shipped experiments, including the 3D site you’re flying through. ' +
      'I study Politics & Government and Entrepreneurship at Ben-Gurion ' +
      'University and I’m looking for a part-time student position building ' +
      'with AI, where the bar is high and the feedback is honest.',
  },

  status: {
    seeking: 'Student position · part-time · AI-native building',
    availability: 'Available now',
    location: 'Israel · flexible, open to relocation',
    responseTime: 'I reply fast.',
  },

  // v16 — stop 01 "Hero": the one line under the floating screens, so the
  // visitor knows who this is before the Intro.
  hero: { line: 'I build web products by directing AI end-to-end — from spec to production.' },

  // stop 02 "Intro". First person, facts only, no self-adjectives. Two lines:
  // the strongest claim first, the evidence second (v16 trim — it was three).
  intro: {
    lines: [
      'I build for clients who need a site that ships, and for teams that want someone who owns the outcome.',
      'Since April 2026: paid client landing pages, a Hebrew-RTL study platform with real users, and an LLM gateway my own agents run through.',
    ],
    context: 'Israel · available now for a part-time student position',
  },

  // stop 04 "How I Build"
  method: {
    lines: [
      'Spec first: every build starts as a written plan with the decisions locked before code.',
      'Then Claude Code does the typing while I direct, review and test, in small chunks that ship in days, not weeks.',
      'Each project leaves behind a lab: the easing curves, transitions and patterns get extracted so the next build starts further ahead.',
    ],
  },
  // ⏳ Yarin confirms these three numbers before launch. Only true numbers ship.
  proof: [
    { n: 17, label: 'products built since April 2026' },
    { n: 7, label: 'live on the web today' },
    { n: 1, label: 'paid client site in production' },
  ],
  // stop 04 repo block: which featured ids get the lead card and the two compact rows
  buildStop: { lead: 'llm-gateway', rows: ['teepo', 'shadiez'] },

  // stop 03 "CV" — 5 rows, years left, role + one line right. Fits one screen.
  // cv.* below is the canonical record; cvStop is the edited five-row cut for the CV stop.
  cvStop: [
    { years: '2026 –', role: 'Freelance web developer & solo founder', line: 'Landing pages and products for clients, every build directed end-to-end with Claude Code.' },
    { years: '2023 – 24', role: 'Public speaker · FIDF / Faces of October Seventh', line: '35+ lectures across the US and Panama, audiences of 10 to 700.' },
    { years: '2023', role: 'Warehouse project manager · Paloma Dead Sea', line: 'Inventory, quality and process control; managed staff and external storage sites.' },
    { years: '2018 – 22', role: 'IDF · Rescue & Training Division', line: 'Deputy company commander; led the battalion into emergency deployment during Guardian of Walls.' },
    { years: '– 2028', role: 'B.A. Politics & Government + Entrepreneurship · BGU', line: 'Ben-Gurion University of the Negev, in progress.' },
  ],

  // stop 12 "Contact"
  contact: {
    line: 'Building something? Write to me.',
    availability: 'Taking on one or two projects this quarter, alongside a part-time student position',   // no full stop: Doto renders it as a stray dot
  },

  links: {
    email: 'yarinlevin18@gmail.com',
    phone: '054-8029820', // Yarin approved publishing (site + PDF), 2026-08-29
    linkedin: 'https://www.linkedin.com/in/yarin-levin-78a783247/',
    github: 'https://github.com/yarinlevin18-ai',
    // x: 'https://x.com/yarinlevin18',   // ⏳ confirm handle with Yarin, then uncomment
    site: 'https://the-void-khaki-pi.vercel.app',
  },

  cv: {
    experience: [
      {
        role: 'Freelance Web Developer & Solo Founder',
        org: 'Self-employed',
        period: 'Apr 2026 – present',
        lines: [
          'Landing pages and web products for freelance clients; independent product ventures end-to-end.',
          'Every product built by directing AI (Claude Code) end-to-end — self-taught, spec-driven, full ownership from idea to production.',
        ],
      },
      {
        role: 'Public Speaker — Advocacy & Testimony',
        org: 'FIDF / Faces of October Seventh',
        period: 'Nov 2023 – Nov 2024',
        lines: [
          '35+ lectures across the US and Panama, audiences of 10 to 700.',
          'Presented to communities, students, Federation leaders and donors; keynote speaker at FIDF galas; hosted by the Israeli Embassy in Panama and the Israeli Consul in Chicago.',
        ],
      },
      {
        role: 'Warehouse Project Manager',
        org: 'Paloma Dead Sea Ltd.',
        period: 'May 2023 – Oct 2023',
        lines: [
          'Ran inventory, quality and process control; managed warehouse staff and forklift operators; coordinated stock across external storage sites.',
        ],
      },
      {
        role: 'Instructor, Emergency Management',
        org: 'Magen Disaster & Emergency Management Ltd.',
        period: 'Oct – Dec 2022',
        lines: [
          'Professional emergency-management training; audience-adapted public speaking.',
        ],
      },
      {
        role: 'Operations Officer, Kfar Hamelech Shlomo',
        org: 'Maccabiah Games',
        period: 'Jul 2022',
        lines: [
          'Commanded logistics and daily operations; managed a team of officials, ran briefings, coordinated with senior entities.',
        ],
      },
    ],
    service: {
      org: 'IDF — Rescue & Training Division (Home Front Command)',
      period: '2018 – 2022',
      lines: [
        'Deputy Company Commander (trainees) · Operational Operations Officer · Platoon Leader · Class Commander.',
        'Managed battalion defensive and offensive operations; led the battalion from routine to emergency deployment during Operation Guardian of Walls, including combat management and coordination with civilian entities.',
        'Awarded a Certificate of Excellence as Platoon Commander during the cross-Samaria line of operations.',
      ],
    },
    education: [
      {
        degree: 'B.A. Politics & Government + B.A. Entrepreneurship and Innovation',
        org: 'Ben-Gurion University of the Negev',
        period: 'expected 2028',
      },
      {
        degree: 'Full Matriculation — 5u Biology, 5u English, 4u Mathematics',
        org: 'Ramot Yam High School',
        period: '2012 – 2018',
      },
    ],
    skills: {
      'AI-native building': ['directing Claude Code end-to-end', 'agentic workflows & tool use', 'spec-driven development', 'rapid prototype → production'],
      Frontend: ['JavaScript / TypeScript', 'React 19 / Next.js 16', 'Tailwind CSS v4', 'HTML / CSS', 'Hebrew RTL interfaces'],
      'Motion & 3D': ['Three.js / react-three-fiber', 'Framer Motion', 'GLSL shaders', 'custom easing & choreography'],
      'Product & backend': ['Supabase (auth + Postgres)', 'Chrome extensions', 'REST APIs', 'Node.js', 'SQLite', 'Vercel'],
      Working: ['team leadership under pressure', 'public speaking', 'operational planning'],
    },
    languages: [
      { lang: 'Hebrew', level: 'native' },
      { lang: 'English', level: 'near-native — lived in the US, Spain and Russia' },
    ],
  },

  // The work — three tiers. featured = the 7 flight stops, each with a full
  // problem/decision/outcome writeup; shipped and labs are the index (dossier
  // "full index" + in-world work hub), each a shorter what/built summary.
  work: {
    featured: [
      {
        id: 'teepo', name: 'TEEPO', group: 'landing', kind: 'Study platform', tag: 'Product · live', year: 2026,
        tint: '#3fc978', img: '/previews/teepo.webp',
        problem: 'Israeli students juggle Moodle, grades and deadlines across sites that never talk to each other.',
        decision: 'One Hebrew-RTL platform with real auth and a Chrome-extension scraper; Google Drive as the datastore instead of a backend nobody asked for.',
        outcome: 'Students sign in and use it all semester. A product with users, not a demo.',
        stack: 'Next.js · Supabase · Chrome extension · Claude',
        url: 'https://bgu-study-organizer.vercel.app', repo: 'https://github.com/yarinlevin18-ai/TEEPO',
      },
      {
        id: 'aerocy', name: 'AeroCy', group: 'landing', kind: 'Business site', tag: 'Client work', year: 2026,
        tint: '#9fd8ff', img: '/previews/aerocy.webp',
        problem: 'An aviation-security company had no credible bilingual web presence.',
        decision: 'One Next.js site in English and Hebrew, one motion idea per section, no CMS.',
        outcome: 'Shipped and live for the brand within days.',
        stack: 'Next.js · i18n · Framer Motion',
        url: 'https://aerocy-landing.vercel.app', repo: 'https://github.com/yarinlevin18-ai/aerocy-landing',
      },
      {
        id: 'shadiez', name: 'SHADIEZ', group: 'landing', kind: 'E-commerce', tag: 'Client work · paid', year: 2026,
        tint: '#9fd8ff', img: '/previews/shadiez.webp',
        problem: 'A premium beach-shade brand needed a page that sells the feel of the product, not a spec sheet.',
        decision: 'A storytelling page around one 3D hero with scroll-driven motion and lead capture. No checkout until the brand needs it.',
        outcome: 'Paid client work, in production.',
        stack: 'Next.js 16 · R3F · Tailwind v4 · Framer Motion · Lenis',
        url: 'https://shadiez.vercel.app', repo: 'https://github.com/yarinlevin18-ai/shadiez',
      },
      {
        id: 'smartcut', name: 'SmartCut', group: 'landing', kind: 'Booking site + admin', tag: 'Client work', year: 2026,
        tint: '#eab04e', img: '/previews/smartcut.webp',
        problem: 'A grooming studio paid for Wix Bookings and still handled reschedules by phone.',
        decision: 'Self-hosted slot booking on Supabase with an approval workflow and customer self-service.',
        outcome: 'The studio dropped Wix Bookings and stopped rescheduling by phone.',
        stack: 'Next.js 14 · TypeScript · Supabase · Tailwind',
        url: '', offline: true, // ⏳ smart-cut-gamma.vercel.app 404s (2026-09-08, still 2026-09-13); restore the URL and drop `offline` once redeployed
        repo: 'https://github.com/yarinlevin18-ai/smartcut',
      },
      {
        id: 'llm-gateway', name: 'LLM Gateway', group: 'saas', kind: 'Control plane', tag: 'SaaS · main focus', year: 2026,
        tint: '#4fd2ff', img: '/previews/llm-gateway.webp', private: true,
        problem: 'Every app I build calls a model provider, and none of them shared routing, budgets or logs.',
        decision: 'A local control plane: one route endpoint, a budget check before every call, a log row after it, and an agent layer for policies and approvals. No hosted service, no billing.',
        outcome: 'Every agent I run goes through it. Spend and latency visible per model, per day.',
        stack: 'Node · Fastify · SQLite · Anthropic SDK',
        url: 'https://shaar-ai-landing.vercel.app',
      },
      {
        id: 'focus', name: 'Focus', group: 'saas', kind: 'WIP-capped board', tag: 'SaaS · private build', year: 2026,
        tint: '#4fd2ff', img: '/previews/focus.webp', private: true,
        problem: 'I kept starting projects while the last three sat half-finished.',
        decision: 'A board with one capped lane: at most three active projects, enforced in the CLI, the API and the dashboard.',
        outcome: 'The tool I plan my own work in.',
        stack: 'Node · SQLite · Astro dashboard',
        url: '',
      },
      {
        id: 'sabai', name: 'Sabai', group: 'saas', kind: 'Trip companion', tag: 'Product', year: 2026,
        tint: '#eab04e', img: '/previews/sabai.webp', private: true,
        problem: 'A real Thailand trip meant bookings across five inboxes and no signal in half the places I was going.',
        decision: 'Offline-first: schedule, stays, flights, maps, budget and emergency info in one app, with OCR of the actual booking PDFs. No accounts, no sync server.',
        outcome: 'Used every day of the trip.',
        stack: 'Next.js 16 · React 19 · Tesseract.js',
        url: 'https://thailand-trip-app-phi.vercel.app',
      },
    ],
    shipped: [
      { name: 'Worldiez', what: 'Automated YouTube Shorts pipeline — clip in, branded 9:16 short out, scheduled to YouTube.', built: 'FFmpeg prep, Remotion compositions, Postiz scheduling, agent-orchestrated.', year: 2026 },
      { name: 'Mentorship', what: 'Shared app for a mentor and mentee — sessions, summaries, homework.', built: 'Next.js 16 Server Actions + Supabase Postgres, role-per-device.', year: 2026 },
      { name: 'dira-lease', what: 'Hebrew-RTL landing page that ranks apartment-sublease leads.', built: 'Next.js + Framer Motion, three-step funnel into Google Sheets.', year: 2026 },
      { name: 'SecScan', what: 'Passive domain-security “report card” SaaS for freelancers.', built: 'Next.js 16, one scanner module per milestone — learning security by building it.', year: 2026 },
      { name: 'LifeRPG', what: 'Local habit/goal RPG — real-life effort earns in-game progress.', built: 'Three.js third-person life-sim, spec-driven across 14 milestones.', year: 2026 },
      { name: 'BodyLoop', what: 'Adaptive fitness app — weekly webcam scans drive a 3D avatar and self-recalibrating projections.', built: 'Next.js + react-three-fiber, node:sqlite, local-first.', year: 2026 },
      { name: 'Kiara’s Club', what: 'Dachshund-first pet storefront — brand, shop and cart.', built: 'Next.js 16, React 19, Tailwind v4, client-side cart.', url: 'https://kiaras-club.vercel.app', year: 2026 },
      { name: 'Drift Ghost', what: 'Unity mobile drifting game, PvP and PvE.', built: 'Meshy-generated assets, Unity, built with Claude Code.', year: 2026 },
      { name: 'Atlas Command Center', what: 'Personal cross-device command center with AI agents — schedule, email, tasks, academics.', built: 'Vite + React, Fastify, Supabase, EN + RTL Hebrew.', year: 2026 },
    ],
    labs: [
      { name: 'motion-lab', what: 'Parametric pattern library for animated React components.' },
      { name: 'three-lab', what: 'react-three-fiber pattern catalog — code recipes for 3D scenes.' },
      { name: 'transition-lab', what: 'Studio for section transitions and UI motion.' },
      { name: 'AnimationStudio', what: 'Local-first Remotion studio — scenes as React, rendered to MP4.' },
      { name: 'design-scraper', what: 'Scrapes design galleries into a browsable palette-tagged index.' },
    ],
    labsNote: 'The labs are the daily practice — every easing curve on this site was tuned in one of them first.',
  },
};
