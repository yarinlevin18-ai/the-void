import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stampFile, readStamp, isStamped, webpSize, publicImages } from '../scripts/stamp.js';
import { PROFILE } from '../src/content/profile.js';

const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const owner = { name: 'Ada <Lovelace>', notice: '© 2026 Ada <Lovelace>. All rights reserved.', site: 'https://example.test/?a=1&b=2' };

// Minimal containers: the stamper never decodes the image data, so a header-only payload
// is enough to check that it is carried over byte for byte.
const chunk = (id, data) => { const h = Buffer.alloc(8); h.write(id, 0, 'latin1'); h.writeUInt32LE(data.length, 4); return Buffer.concat([h, data, Buffer.alloc(data.length & 1)]); };
const webp = (...chunks) => { const body = Buffer.concat(chunks), h = Buffer.alloc(12); h.write('RIFF', 0, 'latin1'); h.writeUInt32LE(body.length + 4, 4); h.write('WEBP', 8, 'latin1'); return Buffer.concat([h, body]); };
const vp8 = (w, h) => { const d = Buffer.alloc(11); d.set([0x9d, 0x01, 0x2a], 3); d.writeUInt16LE(w, 6); d.writeUInt16LE(h, 8); return d; };   // odd size: exercises the pad byte
const vp8l = (w, h, alpha) => { const d = Buffer.alloc(5); d[0] = 0x2f; d.writeUInt32LE(((w - 1) | ((h - 1) << 14) | (alpha << 28)) >>> 0, 1); return d; };
const ids = (buf) => { const out = []; for (let p = 12; p < buf.length;) { const n = buf.readUInt32LE(p + 4); out.push(buf.toString('latin1', p, p + 4)); p += 8 + n + (n & 1); } return out; };

test('a simple lossy WebP becomes extended: VP8X first, the image data untouched, EXIF then XMP last', () => {
  const src = webp(chunk('VP8 ', vp8(1000, 1600)));
  const out = stampFile(src, owner);
  assert.deepEqual(ids(out), ['VP8X', 'VP8 ', 'EXIF', 'XMP ']);
  assert.equal(out[20], 0x08 | 0x04, 'VP8X flags: EXIF + XMP, no alpha');
  assert.deepEqual(webpSize(out), { w: 1000, h: 1600 });
  assert.equal(out.readUInt32LE(4), out.length - 8, 'RIFF size');
  assert.ok(out.includes(src.subarray(12)), 'the VP8 chunk is carried over byte for byte');
});

test('a lossless WebP with alpha keeps its alpha flag', () => {
  const out = stampFile(webp(chunk('VP8L', vp8l(64, 32, 1))), owner);
  assert.equal(out[20], 0x10 | 0x08 | 0x04);
  assert.deepEqual(webpSize(out), { w: 64, h: 32 });
});

test('stamping is idempotent and replaces an earlier stamp instead of stacking one', () => {
  const once = stampFile(webp(chunk('VP8 ', vp8(8, 8))), owner);
  assert.ok(stampFile(once, owner).equals(once));
  const other = stampFile(once, { ...owner, name: 'Someone Else' });
  assert.deepEqual(ids(other), ['VP8X', 'VP8 ', 'EXIF', 'XMP ']);
  assert.equal(readStamp(other).artist, 'Someone Else');
});

test('the marks read back: XML-escaped XMP, ASCII-only EXIF', () => {
  const s = readStamp(stampFile(webp(chunk('VP8 ', vp8(8, 8))), owner));
  assert.ok(s.xmp.includes('<rdf:li>Ada &lt;Lovelace&gt;</rdf:li>'));
  assert.ok(s.xmp.includes('xmpRights:WebStatement="https://example.test/?a=1&amp;b=2"'));
  assert.ok(s.xmp.includes('<rdf:li xml:lang="x-default">© 2026 Ada &lt;Lovelace&gt;. All rights reserved.</rdf:li>'));
  assert.equal(s.artist, 'Ada <Lovelace>');
  assert.equal(s.copyright, 'Copyright 2026 Ada <Lovelace>. All rights reserved.');
  assert.ok(isStamped(stampFile(webp(chunk('VP8 ', vp8(8, 8))), owner), owner.name));
});

test('a JPEG keeps JFIF first, gains EXIF + XMP, and keeps its scan data', () => {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const dqt = Buffer.from([0xff, 0xdb, 0x00, 0x04, 0x00, 0x01]);
  const scan = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x12, 0x34, 0xff, 0xd9]);
  const src = Buffer.concat([Buffer.from([0xff, 0xd8]), app0, dqt, scan]);
  const out = stampFile(src, owner);
  assert.ok(out.subarray(0, 2 + app0.length).equals(src.subarray(0, 2 + app0.length)), 'SOI + JFIF APP0 untouched and first');
  assert.ok(out.subarray(out.length - dqt.length - scan.length).equals(Buffer.concat([dqt, scan])));
  assert.ok(stampFile(out, owner).equals(out), 'idempotent');
  assert.equal(readStamp(out).artist, owner.name);
});

test('every image the site ships carries the owner\'s name (run `npm run stamp` after adding one)', () => {
  const files = publicImages(`${root}/public`);
  assert.ok(files.length >= 15, `found ${files.length} images`);
  for (const f of files) {
    const buf = readFileSync(f), s = readStamp(buf), rel = f.slice(root.length + 1);
    assert.ok(isStamped(buf, PROFILE.name), `${rel} is not stamped — run npm run stamp`);
    assert.ok(s.copyright.includes(PROFILE.name) && s.xmp.includes(PROFILE.links.site), rel);
  }
});
