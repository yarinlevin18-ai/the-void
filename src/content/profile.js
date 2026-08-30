// profile.js — single source of truth for the person behind The Void.
// Feeds: the Dossier overlay (all four tabs), the in-world beats, the
// printable CV (Phase 4), and the JSON-LD structured data (Phase 7).
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

  links: {
    email: 'yarinlevin18@gmail.com',
    phone: '054-8029820', // Yarin approved publishing (site + PDF), 2026-08-29
    linkedin: 'https://www.linkedin.com/in/yarin-levin-78a783247/',
    github: 'https://github.com/yarinlevin18-ai',
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

  // ⏳ Placeholder — Yarin's own words pending (PORTFOLIO_PLAN §4b).
  ambitions: {
    line: '',
    full: '',
  },

  // The work — three tiers, 17 projects. Every entry answers:
  // what it is · what I built · the hard part. GitHub links where public.
  work: {
    featured: [
      {
        name: 'SHADIEZ',
        tag: 'Client work · paid',
        what: 'Storytelling e-commerce landing for a premium beach sun-shade brand.',
        built: '3D GLB hero, scroll-driven motion, lead capture — Next.js 16, R3F/Three.js, Tailwind v4, Framer Motion, Lenis.',
        hard: 'Making a 3D product hero feel premium on mid hardware — payload budget, lazy loads, easing discipline.',
        url: 'https://shadiez.vercel.app',
        repo: 'https://github.com/yarinlevin18-ai/shadiez',
        year: 2026,
      },
      {
        name: 'TEEPO',
        tag: 'Product · live',
        what: 'Hebrew-RTL study platform for Israeli university students.',
        built: 'Next.js + Supabase auth, Moodle/grades scraping via a Chrome extension, Google-Drive-as-datastore, Claude AI assistant.',
        hard: 'Real auth, a scraper that survives Moodle, and full RTL — a product, not a page.',
        url: 'https://bgu-study-organizer.vercel.app',
        repo: 'https://github.com/yarinlevin18-ai/TEEPO',
        year: 2026,
      },
      {
        name: 'Sabai',
        tag: 'Personal product',
        what: 'Offline-first trip companion built for a real Thailand journey.',
        built: 'Schedule, weather, stays, flights, maps, budget, emergency info, AI assistant — Next.js 16, React 19, Tesseract.js OCR.',
        hard: 'Offline-first data flow and OCR ingestion of real bookings.',
        url: '',
        year: 2026,
      },
      {
        name: 'Kiara’s Club',
        tag: 'Brand + storefront · live',
        what: 'Dachshund-first pet storefront — brand, shop and cart.',
        built: 'Palette sampled from a real dog; Next.js 16, React 19, Tailwind v4, client-side cart.',
        hard: 'A complete brand voice and shop UX shipped end-to-end, solo.',
        url: 'https://kiaras-club.vercel.app',
        year: 2026,
      },
    ],
    shipped: [
      { name: 'Worldiez', what: 'Automated YouTube Shorts pipeline — clip in, branded 9:16 short out, scheduled to YouTube.', built: 'FFmpeg prep, Remotion compositions, Postiz scheduling, agent-orchestrated.', year: 2026 },
      { name: 'AeroCy', what: 'Bilingual business site, shipped for a real brand.', built: 'Next.js, i18n, motion polish.', repo: 'https://github.com/yarinlevin18-ai/aerocy', year: 2026 },
      { name: 'Mentorship', what: 'Shared app for a mentor and mentee — sessions, summaries, homework.', built: 'Next.js 16 Server Actions + Supabase Postgres, role-per-device.', year: 2026 },
      { name: 'dira-lease', what: 'Hebrew-RTL landing page that ranks apartment-sublease leads.', built: 'Next.js + Framer Motion, three-step funnel into Google Sheets.', year: 2026 },
      { name: 'SecScan', what: 'Passive domain-security “report card” SaaS for freelancers.', built: 'Next.js 16, one scanner module per milestone — learning security by building it.', year: 2026 },
      { name: 'LifeRPG', what: 'Local habit/goal RPG — real-life effort earns in-game progress.', built: 'Three.js third-person life-sim, spec-driven across 14 milestones.', year: 2026 },
      { name: 'BodyLoop', what: 'Adaptive fitness app — weekly webcam scans drive a 3D avatar and self-recalibrating projections.', built: 'Next.js + react-three-fiber, node:sqlite, local-first.', year: 2026 },
      { name: 'שערAI (llm-gateway)', what: 'Local control plane between apps and LLM providers.', built: 'Provider abstraction, routing, cost tracking, live stats dashboard; Hebrew landing page.', year: 2026 },
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
