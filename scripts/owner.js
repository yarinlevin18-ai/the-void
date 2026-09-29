// owner.js — the owner's mark on everything the build ships (2026-09-29, Yarin: "make sure
// that everything is watermarked to my name"). profile.js is the only source. The page
// already carries the name in its head, the contact card and the print CV; this plugin covers the
// files a visitor can open on their own:
//   - a /*! banner */ on every JS and CSS file (minifiers keep /*! comments; this runs after them)
//   - an HTML comment at the top of index.html, and the copyright line of the no-JS path
//   - /humans.txt — who made the site, and with what
// Third-party code keeps its own notices: vite.config.js emits /licenses.txt (build.license).

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const notice = (p, year) => `© ${year} ${p.name}`;

export const banner = (p, year) =>
  `/*! The Void — ${notice(p, year)} (${p.links.site}). All rights reserved. ` +
  `Open-source code inside keeps its own license: /licenses.txt */`;

export function humans(p, built, deps = []) {
  const host = (u) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return [
    '/* TEAM */',
    `Design and code: ${p.name}`,
    `Role: ${p.title}`,
    `Site: ${p.links.site}`,
    `GitHub: ${host(p.links.github)}`,
    `LinkedIn: ${host(p.links.linkedin)}`,
    `Location: ${p.status.location.split(' · ')[0]}`,
    '',
    '/* SITE */',
    `Last update: ${built.iso}`,
    'Standards: HTML, CSS, JavaScript, WebGL',
    `Components: ${deps.join(', ')}, Vite`,
    'Fonts: Bricolage Grotesque, Schibsted Grotesk, Doto (SIL Open Font License)',
    'Built with: Claude Code',
    'Licenses: /licenses.txt',
    '',
    `${notice(p, built.iso.slice(0, 4))}. All rights reserved.`,
    '',
  ].join('\n');
}

export function ownerPlugin(p, built, deps = []) {
  const year = built.iso.slice(0, 4);
  return {
    name: 'owner-mark',
    transformIndexHtml(html) {
      return html
        .replace('<!-- owner:banner -->', `<!-- The Void — ${esc(notice(p, year))} · ${esc(p.links.site)} · All rights reserved. -->`)
        .replace(/<!-- owner:notice[^>]*-->/, `${esc(notice(p, year))}. All rights reserved.`);
    },
    generateBundle(_, bundle) {
      const mark = banner(p, year) + '\n';
      for (const f of Object.values(bundle)) {
        if (f.type === 'chunk') f.code = mark + f.code;
        else if (f.fileName.endsWith('.css')) f.source = mark + f.source;
      }
      this.emitFile({ type: 'asset', fileName: 'humans.txt', source: humans(p, built, deps) });
    },
  };
}
