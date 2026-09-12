# Distinctive self-hostable fonts — research 2026-09-07

Compiled by a web-research pass for the type rethink. Constraint: no runtime cloud font kits; self-hosted open-license files or a reasonably priced commercial web licence (≈ under $100–150). Excluded the ubiquitous defaults (Inter, Roboto, Source Code Pro, JetBrains Mono, IBM Plex, Space Grotesk/Mono, Montserrat, Poppins, Satoshi, General Sans, …).

**Bottom line:** the strongest unique-but-cheap stack is entirely open-license: **Sprat** (Collletttivo, OFL, variable sharp serif) or **Bricolage Grotesque** for the wordmark, **Hanken Grotesk** or **Schibsted Grotesk** for body, and **Doto + Martian Mono** for the HUD layer. Total cost $0, all self-hostable as variable woff2. If you want one paid "signature" face, Klim's web licence starts at $60 for the first style (20k pageviews/mo) and Berkeley Mono is $75.

Uniqueness rating: 5 = nobody will recognise it, 1 = everywhere.

## 1. Display / headline candidates

| Font | Why it fits | Specs | License / price | Uniq |
|---|---|---|---|---|
| **Sprat** (Collletttivo) | Sharp Gill-inspired serif, condensed-thin to extended-black; "spooky and classy". Closest free cousin to Ogg, with a width axis for a wide "YARIN LEVIN". | 18 styles (3 widths × 6 wts) + variable wdth/wght — [collletttivo](https://www.collletttivo.it/typefaces/sprat), [fontsquirrel](https://www.fontsquirrel.com/fonts/sprat) | OFL, free | 4 |
| **Bricolage Grotesque** (Atelier Triay) | Grotesk with Antique Olive DNA; expressive at 96pt opsz, calm at 12. Only 3-axis grotesk on Google Fonts. | wght 200–800, wdth 75–100, opsz 12–96 — [fontsource](https://fontsource.org/fonts/bricolage-grotesque) | OFL, free | 3 |
| **PP Editorial New** (Pangram) | Narrow, precise editorial serif; the design-Twitter Ogg substitute. | 16 styles incl. italics, variable — [pangram](https://pangrampangram.com/products/editorial-new) | Free for personal use, "personal portfolios" explicitly listed ([FAQ](https://pangrampangram.com/pages/faq)); commercial from $40 | 2 (very popular) |
| **Chaney** (Atipo) | Regular / Wide / Extended / UltraExtended — a proper expanded display face for a cinematic wordmark. | 4 static fonts | Pay-what-you-want from €15, web licence offered — [atipo](https://www.atipofoundry.com/fonts/chaney/pay-what-you-want) | 4 |
| **Le Murmure** (Velvetyne) | Condensed, deliberately mismatched letterforms; Red Dot Grand Prix 2018. Single weight. | 1 style — [velvetyne](https://velvetyne.fr/fonts/le-murmure/) | OFL, free | 5 |
| **Mona Sans** (GitHub) | Industrial grotesk with a real width axis (75–125): wide for titles, neutral for UI from one file. | wght 200–900, wdth 75–125, ital, opsz — [github](https://github.com/github/mona-sans) | OFL, free | 3 |
| **Instrument Serif** | Condensed high-contrast display serif; the italic is the star. | Regular + Italic — [fontsinuse](https://fontsinuse.com/typefaces/219915/instrument-serif) | OFL, free | 2 (rising fast) |
| **GT Planar** (Grilli Type) | Continuous −45° "Retalic" to +45° italic axis — genuinely futuristic, unheard-of on portfolios. | 42 styles, variable — [grilli](https://www.grillitype.com/typeface/gt-planar) | Web licence by monthly uniques ([licenses](https://www.grillitype.com/licenses)); price unverified, comparable GT styles $75 | 5 |

Also (ITF Free Font License, self-host allowed — [licence](https://www.fontshare.com/licenses/itf-ffl)): Fontshare **Zodiak** (12-style serif), **Technor** (constructed sans), **Tanker**.

## 2. Body / UI candidates

- **Hanken Grotesk** — wght 100–900 + italic, variable; even texture at 14px on dark ([fontsource](https://fontsource.org/fonts/hanken-grotesk)). OFL. Uniq 3.
- **Schibsted Grotesk** — newspaper-commissioned, wght 400–900 + italic ([fontsource](https://fontsource.org/fonts/schibsted-grotesk)). Slightly editorial. OFL. Uniq 4.
- **Familjen Grotesk** — wght 400–700 + italic ([fontsource](https://fontsource.org/fonts/familjen-grotesk)). Quiet, rarely used. OFL. Uniq 4.
- **Mona Sans** at wdth 100 — display and body share one file. Uniq 3.
- **Newsreader** — serif body, opsz 6–72 ([fontsource](https://fontsource.org/fonts/newsreader)). OFL. Uniq 3.
- **Geologica** — wght 100–900, slnt, plus SHRP/CRSV axes ([fontsource](https://fontsource.org/fonts/geologica)). Engineered-feeling, a bit wide. OFL. Uniq 4.
- **Karrik** (Velvetyne) — vernacular grotesk with deliberate optical "errors" ([velvetyne](https://velvetyne.fr/fonts/karrik/)). Captions only. OFL. Uniq 5.

## 3. Mono / HUD candidates

- **Doto** — 6×10 dot-matrix, variable wght + **ROND** (dot roundness) axis ([fontsource](https://fontsource.org/fonts/doto), [github](https://github.com/oliverlalan/Doto)). Animate ROND on the loader/counter → live readout. OFL. Uniq 5.
- **Martian Mono** (Evil Martians) — wght + wdth axes, Condensed to Wide ([github](https://github.com/evilmartians/mono)). Condensed cut for dense HUD labels. OFL. Uniq 3.
- **B612 Mono** — designed for Airbus cockpit displays ([fontsource](https://fontsource.org/fonts/b612-mono)). OFL. Uniq 4.
- **Sono** — wght + **MONO** 0–1 axis, slides mono → proportional ([fontsource](https://fontsource.org/fonts/sono)). Labels can "resolve" from HUD to prose. OFL. Uniq 4.
- **Sligoil** (Velvetyne) — funky mono, big ink traps ([velvetyne](https://velvetyne.fr/fonts/sligoil/)). OFL. Uniq 5, may be too playful.
- **Berkeley Mono TX-02** (paid) — wght + wdth + slnt, variable woff2 ([datasheet](https://usgraphics.com/static/products/TX-02/datasheet/TX-02-datasheet.a43c0c7f8d8c.pdf)). $75 ([catalog](https://usgraphics.com/catalog/FX-102)). **Gotcha:** web-embed permission at the $75 tier unconfirmed — ask before buying. Uniq 2.
- Honourable: [Commit Mono](https://commitmono.com/), [Departure Mono](https://departuremono.com/), [Server Mono](https://github.com/internet-development/www-server-mono), [Monaspace](https://github.com/githubnext/monaspace), Necto Mono (Collletttivo).

## 4. Recommended pairings

**A. "Engineered editorial" — Sprat + Hanken Grotesk + Doto/Martian Mono.** Sprat's sharp serifs at extended width give the wordmark cinematic weight without reading as an Ogg clone; Hanken disappears in the good way at CV sizes; Doto for counters/loader, Martian Mono Condensed for labels. All OFL, all variable woff2, $0. Researcher's pick.

**B. "One family, many voices" — Mona Sans (wide 800) + Mona Sans (wdth 100, 400) + Sono.** Wordmark and body from one variable file; Sono's MONO axis lets HUD labels morph into prose during reveals. OFL, $0. Slightly less unique (GitHub's brand face).

**C. "Signature paid" — GT Planar Retalic (wordmark only) + Schibsted Grotesk + Berkeley Mono.** Planar's backwards slant is the one thing that feels like it belongs in the void. ≈ $150 total, with two licence details to confirm. Klim ($60 first web style, [FAQ](https://klim.co.nz/faqs/)) is an alternative signature source, e.g. Söhne Breit or Pitch Mono.

## 5. Practical notes

- **Keeping Ogg:** Sharp Type web licences are annual, priced by pageviews ([sharptype](https://www.sharptype.co/licensing/web)). Recurring cost is the reason to drop it.
- **Trial fonts are not licences:** ABC Dinamo, Displaay and Klim trials all forbid live sites. OH no Type is $599/family — out of budget.
- **Pangram gotcha:** free downloads are "selected key styles", not the full family. Fine for one wordmark weight.
- **Self-hosting source:** use **Fontsource** (npm, versioned, woff2 variable) for OFL fonts.
- **File sizes:** Latin-subset variable woff2 is typically 30–80 KB per family. Subset with `pyftsubset` + `unicode-range`.
- **Dead ends:** grillitype.com and usgraphics.com refused fetches; treat those prices/style counts as "check at checkout".
