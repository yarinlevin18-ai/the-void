// stamp.js — the owner's name inside every image the site ships (2026-09-29, Yarin:
// "make sure that everything is watermarked to my name"). The panels carry no text on
// purpose (CLAUDE.md), so the mark goes into the files' metadata instead: an XMP packet
// (creator, credit, copyright notice, rights URL — what Google Images and Adobe tools show)
// and EXIF Artist + Copyright (what Finder and Preview show). The pixels are never touched:
// WebP and JPEG chunks are rewritten around the untouched image data.
//
//   node scripts/stamp.js           stamp every image under public/ that isn't stamped yet
//   node scripts/stamp.js --force   re-stamp all of them (e.g. after the notice changes)
//
// tests/stamp.test.js fails the build on any unstamped image, so a new screenshot can't ship
// without the name.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function xmpPacket({ name, notice, site }) {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    photoshop:Credit="${escXml(name)}"
    xmpRights:Marked="True"
    xmpRights:WebStatement="${escXml(site)}">
   <dc:creator><rdf:Seq><rdf:li>${escXml(name)}</rdf:li></rdf:Seq></dc:creator>
   <dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${escXml(notice)}</rdf:li></rdf:Alt></dc:rights>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="r"?>`;
}

// EXIF is ASCII only, so the © becomes "Copyright". A little-endian TIFF block with one IFD:
// Artist (0x013B) and Copyright (0x8298), both stored after the IFD.
export function exifTiff({ name, notice }) {
  const ascii = (s) => Buffer.from(String(s).replace(/©\s*/g, 'Copyright ').replace(/[^\x20-\x7e]/g, '') + '\0', 'latin1');
  const tags = [[0x013b, ascii(name)], [0x8298, ascii(notice)]];
  const ifdAt = 8, dataAt = ifdAt + 2 + tags.length * 12 + 4;
  const head = Buffer.alloc(dataAt);
  head.write('II', 0, 'latin1'); head.writeUInt16LE(42, 2); head.writeUInt32LE(ifdAt, 4);
  head.writeUInt16LE(tags.length, ifdAt);
  let off = dataAt;
  tags.forEach(([tag, val], i) => {
    const e = ifdAt + 2 + i * 12;
    head.writeUInt16LE(tag, e); head.writeUInt16LE(2, e + 2); head.writeUInt32LE(val.length, e + 4); head.writeUInt32LE(off, e + 8);
    off += val.length;
  });
  return Buffer.concat([head, ...tags.map(([, v]) => v)]);
}

// ---- WebP (RIFF) ----
function riffChunks(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') throw new Error('not a WebP file');
  const out = [];
  for (let p = 12; p + 8 <= buf.length;) {
    const id = buf.toString('latin1', p, p + 4), size = buf.readUInt32LE(p + 4);
    out.push({ id, data: buf.subarray(p + 8, p + 8 + size) });
    p += 8 + size + (size & 1);
  }
  return out;
}

function riff(chunks) {
  const parts = chunks.flatMap(({ id, data }) => {
    const h = Buffer.alloc(8); h.write(id, 0, 'latin1'); h.writeUInt32LE(data.length, 4);
    return data.length & 1 ? [h, data, Buffer.alloc(1)] : [h, data];
  });
  const body = Buffer.concat(parts), head = Buffer.alloc(12);
  head.write('RIFF', 0, 'latin1'); head.writeUInt32LE(body.length + 4, 4); head.write('WEBP', 8, 'latin1');
  return Buffer.concat([head, body]);
}

export function webpSize(buf) {
  const [first] = riffChunks(buf), d = first.data;
  if (first.id === 'VP8X') return { w: d.readUIntLE(4, 3) + 1, h: d.readUIntLE(7, 3) + 1 };
  if (first.id === 'VP8 ') return { w: d.readUInt16LE(6) & 0x3fff, h: d.readUInt16LE(8) & 0x3fff };
  if (first.id === 'VP8L') { const b = d.readUInt32LE(1); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
  throw new Error(`unknown first WebP chunk ${first.id}`);
}

export function stampWebp(buf, { xmp, exif }) {
  let chunks = riffChunks(buf).filter((c) => c.id !== 'XMP ' && c.id !== 'EXIF');
  if (chunks[0].id !== 'VP8X') {
    const { w, h } = webpSize(buf), x = Buffer.alloc(10);
    const vp8l = chunks[0].id === 'VP8L' && (chunks[0].data.readUInt32LE(1) >>> 28) & 1;   // alpha_is_used
    x[0] = vp8l ? 0x10 : 0; x.writeUIntLE(w - 1, 4, 3); x.writeUIntLE(h - 1, 7, 3);
    chunks = [{ id: 'VP8X', data: x }, ...chunks];
  }
  const x = Buffer.from(chunks[0].data); x[0] |= 0x08 | 0x04;   // EXIF + XMP present
  chunks[0] = { id: 'VP8X', data: x };
  return riff([...chunks, { id: 'EXIF', data: exif }, { id: 'XMP ', data: Buffer.from(xmp, 'utf8') }]);   // spec order: image data, EXIF, XMP
}

// ---- JPEG ----
const XMP_NS = Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1');
const EXIF_ID = Buffer.from('Exif\0\0', 'latin1');

function jpegSegments(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('not a JPEG file');
  const segs = [];
  let p = 2;
  while (p < buf.length) {
    if (buf[p] !== 0xff) throw new Error(`bad JPEG marker at ${p}`);
    const m = buf[p + 1];
    if (m === 0xda) { segs.push({ m, raw: buf.subarray(p) }); break; }   // start of scan: the rest is image data
    const len = buf.readUInt16BE(p + 2);
    segs.push({ m, raw: buf.subarray(p, p + 2 + len), data: buf.subarray(p + 4, p + 2 + len) });
    p += 2 + len;
  }
  return segs;
}

const app1 = (payload) => { const h = Buffer.from([0xff, 0xe1, 0, 0]); h.writeUInt16BE(payload.length + 2, 2); return Buffer.concat([h, payload]); };

export function stampJpeg(buf, { xmp, exif }) {
  const segs = jpegSegments(buf).filter((s) => !(s.m === 0xe1 && s.data && (s.data.subarray(0, XMP_NS.length).equals(XMP_NS) || s.data.subarray(0, 6).equals(EXIF_ID))));
  const mine = [app1(Buffer.concat([EXIF_ID, exif])), app1(Buffer.concat([XMP_NS, Buffer.from(xmp, 'utf8')]))];
  const at = segs[0]?.m === 0xe0 ? 1 : 0;   // after the JFIF APP0, which must stay first
  const out = [...segs.slice(0, at).map((s) => s.raw), ...mine, ...segs.slice(at).map((s) => s.raw)];
  return Buffer.concat([Buffer.from([0xff, 0xd8]), ...out]);
}

// What a file says about its owner: { xmp: string|null, artist, copyright }.
export function readStamp(buf) {
  let xmp = null, tiff = null;
  if (buf.toString('latin1', 0, 4) === 'RIFF') {
    for (const c of riffChunks(buf)) { if (c.id === 'XMP ') xmp = c.data.toString('utf8'); if (c.id === 'EXIF') tiff = c.data; }
  } else {
    for (const s of jpegSegments(buf)) {
      if (s.m !== 0xe1 || !s.data) continue;
      if (s.data.subarray(0, XMP_NS.length).equals(XMP_NS)) xmp = s.data.subarray(XMP_NS.length).toString('utf8');
      if (s.data.subarray(0, 6).equals(EXIF_ID)) tiff = s.data.subarray(6);
    }
  }
  const tags = {};
  if (tiff && tiff.toString('latin1', 0, 2) === 'II') {
    const ifd = tiff.readUInt32LE(4), n = tiff.readUInt16LE(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12, len = tiff.readUInt32LE(e + 4), at = len > 4 ? tiff.readUInt32LE(e + 8) : e + 8;
      if (tiff.readUInt16LE(e + 2) === 2) tags[tiff.readUInt16LE(e)] = tiff.toString('latin1', at, at + len).replace(/\0+$/, '');
    }
  }
  return { xmp, artist: tags[0x013b] ?? null, copyright: tags[0x8298] ?? null };
}

export const IMAGE = /\.(webp|jpe?g)$/i;

export function stampFile(buf, owner) {
  const marks = { xmp: xmpPacket(owner), exif: exifTiff(owner) };
  return buf.toString('latin1', 0, 4) === 'RIFF' ? stampWebp(buf, marks) : stampJpeg(buf, marks);
}

export const isStamped = (buf, name) => {
  const s = readStamp(buf);
  return s.artist === name && !!s.xmp && s.xmp.includes(`<rdf:li>${escXml(name)}</rdf:li>`);
};

export function publicImages(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(p).isDirectory() ? publicImages(p) : IMAGE.test(f) ? [p] : [];
  });
}

// ---- CLI ----
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { PROFILE } = await import('../src/content/profile.js');
  const { notice } = await import('./owner.js');
  const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
  const owner = { name: PROFILE.name, notice: `${notice(PROFILE, new Date().getFullYear())}. All rights reserved.`, site: PROFILE.links.site };
  const force = process.argv.includes('--force');
  for (const f of publicImages(`${root}/public`)) {
    const buf = readFileSync(f);
    if (!force && isStamped(buf, owner.name)) continue;
    const out = stampFile(buf, owner);
    writeFileSync(f, out);
    console.log(`stamped ${f.slice(root.length + 1)} (+${out.length - buf.length} bytes)`);
  }
}
