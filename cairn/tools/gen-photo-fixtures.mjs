/**
 * Builds `fixtures/photo/` — the committed corpus `readExif` is tested against.
 *
 * **Headers, not photographs** (ARCHITECTURE §10, A-58 Part 7). Every file here is a handful
 * of bytes: a JPEG SOI, one APP1 segment, and an SOS marker with no entropy-coded data behind
 * it. Nothing here is a picture of anything, nothing here came off a camera, and the two files
 * that carry a GPS block carry coordinates that were invented for this file and are asserted
 * about only as *"a coordinate was read"* — the golden records no number (§10.5's
 * *"no coordinate in any log line, ever"*, and `tools/gen-golden.mjs`'s NO COORDINATES rule).
 *
 * Deterministic: no clock, no randomness. Re-running it must produce byte-identical files, and
 * `packages/core/test/photoExif.test.ts` asserts the committed bytes still hash the same.
 *
 *   node tools/gen-photo-fixtures.mjs        (from cairn/)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..', 'fixtures', 'photo');

const cat = (...parts) => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

const u16 = (v, be) => {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, v, !be);
  return b;
};
const u32 = (v, be) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, v, !be);
  return b;
};
const ascii = (s) => {
  const b = new Uint8Array(s.length + 1);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b; // NUL-terminated, as EXIF ASCII is
};
const rationals = (pairs, be) => cat(...pairs.flatMap(([n, d]) => [u32(n, be), u32(d, be)]));

const TYPE = { ASCII: 2, SHORT: 3, LONG: 4, RATIONAL: 5 };

const entry = (tag, type, count, bytes) => ({ tag, type, count, bytes });
const eShort = (tag, v, be) => entry(tag, TYPE.SHORT, 1, u16(v, be));
const eLong = (tag, v, be) => entry(tag, TYPE.LONG, 1, u32(v, be));
const eAscii = (tag, s) => {
  const b = ascii(s);
  return entry(tag, TYPE.ASCII, b.length, b);
};
const eRational = (tag, pairs, be) => entry(tag, TYPE.RATIONAL, pairs.length, rationals(pairs, be));

/**
 * One IFD at `ifdOffset`, with any value longer than 4 bytes placed immediately after the
 * directory. Returns the bytes and the offset one past the last value written.
 */
function makeIfd(entries, ifdOffset, be, nextIfd = 0) {
  const n = entries.length;
  const dirSize = 2 + n * 12 + 4;
  const dir = new Uint8Array(dirSize);
  const dv = new DataView(dir.buffer);
  dv.setUint16(0, n, !be);
  let cursor = ifdOffset + dirSize;
  const values = [];
  entries.forEach((e, i) => {
    const off = 2 + i * 12;
    dv.setUint16(off, e.tag, !be);
    dv.setUint16(off + 2, e.type, !be);
    dv.setUint32(off + 4, e.count, !be);
    if (e.bytes.length <= 4) {
      dir.set(e.bytes, off + 8); // left-justified in the 4-byte field, both endiannesses
    } else {
      dv.setUint32(off + 8, cursor, !be);
      values.push(e.bytes);
      cursor += e.bytes.length;
      if (e.bytes.length % 2 === 1) {
        values.push(new Uint8Array(1));
        cursor += 1;
      }
    }
  });
  dv.setUint32(2 + n * 12, nextIfd, !be);
  return { bytes: cat(dir, ...values), end: cursor };
}

/**
 * A whole TIFF block: header, IFD0, then the Exif sub-IFD and the GPS IFD if given.
 *
 * Built in two passes because IFD0's pointer entries name offsets that are only known once
 * IFD0's own value area has been sized. The pointers are LONG/count-1 and therefore inline, so
 * the second pass is byte-for-byte the same size as the first — which is what makes this safe.
 */
function makeTiff({ be = true, ifd0 = [], exif = null, gps = null, exifPointerOverride = null }) {
  const build = (exifOff, gpsOff) => {
    const dir0 = [...ifd0];
    if (exif) dir0.push(eLong(0x8769, exifOff, be));
    if (gps) dir0.push(eLong(0x8825, gpsOff, be));
    const first = makeIfd(dir0, 8, be);
    return { first, dir0 };
  };
  // Pass 1 — sizes only.
  const probe = build(0, 0);
  const exifOffset = probe.first.end;
  const exifBlock = exif ? makeIfd(exif, exifOffset, be) : null;
  const gpsOffset = exifBlock ? exifBlock.end : exifOffset;
  const gpsBlock = gps ? makeIfd(gps, gpsOffset, be) : null;
  // Pass 2 — with the real pointers. `exifPointerOverride` is how the self-reference fault
  // is built: the sub-IFD pointer is made to name IFD0's own offset.
  const final = build(exifPointerOverride ?? exifOffset, gpsOffset);
  const header = cat(be ? new Uint8Array([0x4d, 0x4d]) : new Uint8Array([0x49, 0x49]), u16(42, be), u32(8, be));
  return cat(header, final.first.bytes, ...(exifBlock ? [exifBlock.bytes] : []), ...(gpsBlock ? [gpsBlock.bytes] : []));
}

const SOI = new Uint8Array([0xff, 0xd8]);
const SOS = new Uint8Array([0xff, 0xda, 0x00, 0x02]);
const EXIF_ID = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]); // "Exif\0\0"

/** SOI + APP1(Exif + tiff) + SOS. `lengthOverride` builds the truncated fault. */
function jpegWithExif(tiff, lengthOverride = null) {
  const payload = cat(EXIF_ID, tiff);
  const len = lengthOverride ?? payload.length + 2;
  return cat(SOI, new Uint8Array([0xff, 0xe1]), u16(len, true), payload, SOS);
}

const files = {};

// 1 — the ordinary case: big-endian, orientation, a date and a coordinate.
files['jpeg-exif-gps.jpg'] = jpegWithExif(
  makeTiff({
    be: true,
    ifd0: [eShort(0x0112, 6, true), eAscii(0x0132, '2024:05:11 08:14:02')],
    exif: [eAscii(0x9003, '2024:05:11 08:14:02'), eLong(0xa002, 4032, true), eLong(0xa003, 3024, true)],
    gps: [
      eAscii(0x0001, 'N'),
      eRational(0x0002, [[48, 1], [12, 1], [2996, 100]], true),
      eAscii(0x0003, 'E'),
      eRational(0x0004, [[16, 1], [22, 1], [2320, 100]], true),
    ],
  }),
);

// 2 — little-endian, a date, pixel dimensions, no GPS at all.
files['jpeg-exif-le.jpg'] = jpegWithExif(
  makeTiff({
    be: false,
    ifd0: [eShort(0x0112, 1, false)],
    exif: [eAscii(0x9003, '2019:03:02 19:45:00'), eLong(0xa002, 1600, false), eLong(0xa003, 1200, false)],
  }),
);

// 3 — a JPEG with no EXIF at all. This is what a canvas re-encode produces (§10.5).
files['jpeg-noexif.jpg'] = cat(
  SOI,
  new Uint8Array([0xff, 0xe0]),
  u16(16, true),
  new Uint8Array([0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]),
  SOS,
);

// 4 — P1. The APP1 length claims 4,000 bytes; the buffer holds ~900.
{
  const tiff = makeTiff({ be: true, ifd0: [eAscii(0x0132, '2024:05:11 08:14:02')] });
  // Padded so the cut at 900 is a cut through a segment that really was going to be long:
  // the header claims 4,000 bytes and the file stops at 900, which is P1's exact shape.
  const full = jpegWithExif(cat(tiff, new Uint8Array(3800)), 4000);
  files['jpeg-truncated-app1.jpg'] = full.slice(0, 900);
}

// 5 — P2. IFD0's Exif sub-IFD pointer names IFD0's own offset.
files['jpeg-selfref-ifd.jpg'] = jpegWithExif(
  makeTiff({
    be: true,
    ifd0: [eShort(0x0112, 1, true)],
    exif: [eAscii(0x9003, '2024:05:11 08:14:02')],
    exifPointerOverride: 8,
  }),
);

// 6 — P3. An IFD claiming 65,535 entries inside a ~200-byte segment.
{
  const header = cat(new Uint8Array([0x4d, 0x4d]), u16(42, true), u32(8, true));
  const dir = cat(u16(0xffff, true), new Uint8Array(180));
  files['jpeg-huge-ifd.jpg'] = jpegWithExif(cat(header, dir));
}

// 7 — P4. GPS rationals with a zero denominator, beside a date that IS readable.
files['jpeg-gps-zerodenom.jpg'] = jpegWithExif(
  makeTiff({
    be: true,
    ifd0: [],
    exif: [eAscii(0x9003, '2022:11:09 06:30:00')],
    gps: [
      eAscii(0x0001, 'N'),
      eRational(0x0002, [[48, 0], [12, 1], [0, 1]], true),
      eAscii(0x0003, 'E'),
      eRational(0x0004, [[16, 1], [22, 1], [0, 1]], true),
    ],
  }),
);

// 8 — P5. The date every camera emits when its clock was never set.
files['jpeg-date-zeros.jpg'] = jpegWithExif(
  makeTiff({ be: true, ifd0: [], exif: [eAscii(0x9003, '0000:00:00 00:00:00')] }),
);

// 9 — P6. GPS reading exactly (0, 0).
files['jpeg-gps-nullisland.jpg'] = jpegWithExif(
  makeTiff({
    be: true,
    ifd0: [],
    exif: [eAscii(0x9003, '2023:07:04 12:00:00')],
    gps: [
      eAscii(0x0001, 'N'),
      eRational(0x0002, [[0, 1], [0, 1], [0, 1]], true),
      eAscii(0x0003, 'E'),
      eRational(0x0004, [[0, 1], [0, 1], [0, 1]], true),
    ],
  }),
);

// 10 — P7. Real HEIC container bytes: the `ftyp` box every HEIC file opens with. This is the
// EXPECTED iOS case (A-58 Part 2), not an exotic one.
files['heic-ftyp.heic'] = cat(
  u32(24, true),
  new Uint8Array([0x66, 0x74, 0x79, 0x70]), // 'ftyp'
  new Uint8Array([0x68, 0x65, 0x69, 0x63]), // 'heic'
  u32(0, true),
  new Uint8Array([0x6d, 0x69, 0x66, 0x31]), // 'mif1'
  new Uint8Array([0x68, 0x65, 0x69, 0x63]), // 'heic'
);

// 11 — PNG signature + an IHDR chunk. Another honest refusal.
files['png-header.png'] = cat(
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  u32(13, true),
  new Uint8Array([0x49, 0x48, 0x44, 0x52]),
  u32(64, true),
  u32(64, true),
  new Uint8Array([8, 2, 0, 0, 0]),
  u32(0, true),
);

// 12 — two bytes that are not a container at all.
files['not-an-image.bin'] = new Uint8Array([0x00, 0x01]);

mkdirSync(OUT, { recursive: true });
for (const [name, bytes] of Object.entries(files)) {
  writeFileSync(join(OUT, name), bytes);
  process.stdout.write(`${name}  ${bytes.length} bytes\n`);
}
