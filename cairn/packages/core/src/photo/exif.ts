/**
 * The EXIF metadata reader (ARCHITECTURE §10.2, **A-58**).
 *
 * **Pure, total, bounded.** No DOM, no clock, no randomness, no dependency — which is why it is
 * in `packages/core` and not in `apps/web`. A-58 Part 3: *"the dependency is refused because of
 * where the code belongs. That argument does not depend on any measurement and does not
 * expire."* Putting it above the port boundary would give `apps/mobile` a second implementation
 * of the same parse, which sequencing rule 1 calls a design defect.
 *
 * **What it reads**, and the list is short on purpose: JPEG `APP1` carrying the `Exif\0\0`
 * marker, a TIFF header in either endianness, then IFD0, the Exif sub-IFD (`0x8769`) and the
 * GPS IFD (`0x8825`). Tags: `0x9003 DateTimeOriginal` (falling back to `0x0132 DateTime`),
 * `0x0112 Orientation`, `0xA002`/`0xA003 PixelXDimension`/`PixelYDimension`, and GPS
 * `0x0001`…`0x0004`.
 *
 * **What it refuses, honestly.** HEIC/HEIF, AVIF, PNG, WebP and bare TIFF all come back
 * `reason: 'unsupported_container'` with every field `null`. XMP, IPTC, ICC and maker notes are
 * not read at all — which is also how they are kept out of storage (§10.5: everything else in
 * the block *"is discarded by never being read"*). **A refusal is a first-class answer**: a
 * system that guesses a photo's date or place is a system whose memory map is quietly wrong.
 *
 * The five rules of §10.2, each because the input is a file a user picked:
 *
 *   1. **Total.** No input throws. Every failure path sets `reason` and returns nulls.
 *   2. **Bounded.** The APP1 segment is capped at its own 16-bit length; nothing outside it is
 *      read. An IFD's claimed entry count is range-checked against the segment *before* a
 *      single entry is touched and nothing is allocated in proportion to the claim. Every
 *      offset is range-checked before it is followed, and each IFD offset is followed **at most
 *      once**, so a self-referential offset terminates rather than looping.
 *   3. **One calendar.** `"YYYY:MM:DD HH:MM:SS"` is rewritten to `YYYY-MM-DD` + `HH:MM` and
 *      validated through core's EXISTING `isIsoDate` (§2.9 A-45) and `isClockTime` (A-20).
 *      There is no second date parser here, and a value those refuse becomes `null` — not a
 *      clamp, not a guess. `"0000:00:00 00:00:00"` falls out of that for free.
 *   4. **GPS is rationals plus a reference character.** A zero denominator, a ref outside
 *      `NSEW`, or a value out of range yields `at: null`. **Exact (0, 0) reads as absent** —
 *      A-57 Part 9 residue 3.
 *   5. **Deterministic.** No `Date`, no `Math.random`, no ambient anything.
 */
import type { LatLng } from '../model/types.ts';
import type { ClockTime, IsoDate } from '../model/ids.ts';
import { isIsoDate } from '../model/ids.ts';
import { isClockTime } from '../model/openingHours.ts';

/** §10.2. `orientation` is the raw TIFF tag value; `null` means 1 for every consumer. */
export type ExifRead = {
  capturedAt: { date: IsoDate; time: ClockTime } | null;
  at: LatLng | null;
  pixel: { w: number; h: number } | null;
  orientation: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;
  /** Why the answer is as thin as it is. Always set, including on success. */
  reason: 'ok' | 'unsupported_container' | 'no_exif' | 'malformed' | 'truncated';
};

type Reason = ExifRead['reason'];

/** Every field null, with a stated reason. The only shape a failure ever takes. */
function empty(reason: Reason): ExifRead {
  return { capturedAt: null, at: null, pixel: null, orientation: null, reason };
}

/**
 * A bounded view over the TIFF block. Every read goes through it, and every read that would
 * leave the block returns `null` rather than reading whatever is next in the buffer.
 */
type Tiff = { bytes: Uint8Array; base: number; end: number; be: boolean };

function u8(t: Tiff, at: number): number | null {
  const abs = t.base + at;
  return abs >= t.base && abs < t.end ? t.bytes[abs] : null;
}

function u16(t: Tiff, at: number): number | null {
  const a = u8(t, at);
  const b = u8(t, at + 1);
  if (a === null || b === null) return null;
  return t.be ? (a << 8) | b : (b << 8) | a;
}

function u32(t: Tiff, at: number): number | null {
  const a = u16(t, at);
  const b = u16(t, at + 2);
  if (a === null || b === null) return null;
  // `>>> 0` keeps a top-bit-set offset a positive number rather than a negative int32.
  return (t.be ? (a * 0x10000 + b) : (b * 0x10000 + a)) >>> 0;
}

/** NUL-trimmed ASCII of `len` bytes, or `null` if any of it lies outside the block. */
function asciiAt(t: Tiff, at: number, len: number): string | null {
  if (len <= 0 || len > 64) return null; // nothing this reader wants is longer
  let s = '';
  for (let i = 0; i < len; i++) {
    const c = u8(t, at + i);
    if (c === null) return null;
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

type Entry = { tag: number; type: number; count: number; valueAt: number; inline: boolean };

/**
 * Reads one IFD's directory entries. `null` means the directory does not fit in the block —
 * which is P3's fault shape, and it is caught **before** anything is allocated: the entry count
 * is a claim, and this function refuses the claim rather than trusting it.
 */
function readIfd(t: Tiff, at: number): Entry[] | null {
  const count = u16(t, at);
  if (count === null) return null;
  // The whole directory — 2 bytes of count, 12 per entry, 4 for the next-IFD pointer — must
  // fit inside the block we already bounded. Nothing is pushed until this passes.
  if (t.base + at + 2 + count * 12 + 4 > t.end) return null;
  const out: Entry[] = [];
  for (let i = 0; i < count; i++) {
    const off = at + 2 + i * 12;
    const tag = u16(t, off);
    const type = u16(t, off + 2);
    const n = u32(t, off + 4);
    if (tag === null || type === null || n === null) return null;
    const size = TYPE_SIZE[type];
    if (size === undefined) continue; // an unknown type is skipped, not a failure
    const total = size * n;
    if (total <= 4) {
      out.push({ tag, type, count: n, valueAt: off + 8, inline: true });
    } else {
      const valueAt = u32(t, off + 8);
      if (valueAt === null) return null;
      // Range-checked before it is ever followed. An out-of-range value offset drops the ONE
      // entry, not the file: a camera that writes a bad thumbnail pointer still has a date.
      if (t.base + valueAt + total > t.end) continue;
      out.push({ tag, type, count: n, valueAt, inline: false });
    }
  }
  return out;
}

/** A SHORT or LONG scalar, whichever the entry claims to be. `null` if it is neither. */
function scalar(t: Tiff, e: Entry): number | null {
  if (e.type === 3) return u16(t, e.valueAt);
  if (e.type === 4 || e.type === 9) return u32(t, e.valueAt);
  return null;
}

/**
 * `"YYYY:MM:DD HH:MM:SS"` → `{date, time}`, or `null`.
 *
 * Rule 3: the two predicates are core's own — `isIsoDate` (the ONE date validator, §2.9 A-45)
 * and `isClockTime` (§2.14 A-20). There is deliberately no arithmetic and no normalisation
 * here, which is what makes `"0000:00:00 00:00:00"` come back `null` (P5) instead of year zero.
 */
function parseExifDateTime(raw: string | null): { date: IsoDate; time: ClockTime } | null {
  if (raw === null) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  const time = `${m[4]}:${m[5]}`;
  if (!isIsoDate(date) || !isClockTime(time)) return null;
  return { date, time };
}

/** Three `[num, den]` rationals → decimal degrees. `null` on any zero denominator (P4). */
function degrees(t: Tiff, e: Entry | undefined): number | null {
  if (!e || e.type !== 5 || e.count < 3 || e.inline) return null;
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const num = u32(t, e.valueAt + i * 8);
    const den = u32(t, e.valueAt + i * 8 + 4);
    if (num === null || den === null || den === 0) return null;
    total += num / den / (i === 0 ? 1 : i === 1 ? 60 : 3600);
  }
  return Number.isFinite(total) ? total : null;
}

/** The Exif block of one JPEG's bytes. Pure, total and bounded — never throws, for any input. */
export function readExif(bytes: Uint8Array): ExifRead {
  try {
    return read(bytes);
  } catch {
    // Rule 1 is structural above; this is the belt to that braces. A throw escaping `read`
    // would be a defect, and it still may not become the caller's problem.
    return empty('malformed');
  }
}

function read(bytes: Uint8Array): ExifRead {
  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return empty('unsupported_container');

  // --- find the APP1 Exif segment, without reading past any segment's own length ---------
  let at = 2;
  let seg: { start: number; end: number } | null = null;
  while (at + 1 < bytes.length) {
    if (bytes[at] !== 0xff) return empty('malformed');
    let marker = bytes[at + 1];
    let cursor = at + 2;
    // Fill bytes: any number of 0xFF may precede a marker.
    while (marker === 0xff && cursor < bytes.length) {
      marker = bytes[cursor];
      cursor++;
    }
    // Standalone markers carry no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      at = cursor;
      continue;
    }
    // SOS: image data begins and no EXIF was found. EOI likewise.
    if (marker === 0xda) return empty('no_exif');
    if (cursor + 1 >= bytes.length) return empty('truncated');
    const len = (bytes[cursor] << 8) | bytes[cursor + 1];
    if (len < 2) return empty('malformed');
    const segStart = cursor + 2;
    const segEnd = cursor + len;
    // §10.2 rule 2. The segment's own 16-bit length is the cap, and a claim the buffer cannot
    // satisfy is `'truncated'` — P1 — rather than a read into whatever follows.
    if (segEnd > bytes.length) return empty('truncated');
    if (marker === 0xe1 && segEnd - segStart >= 6) {
      const id = String.fromCharCode(bytes[segStart], bytes[segStart + 1], bytes[segStart + 2], bytes[segStart + 3]);
      if (id === 'Exif' && bytes[segStart + 4] === 0 && bytes[segStart + 5] === 0) {
        seg = { start: segStart + 6, end: segEnd };
        break;
      }
    }
    at = segEnd;
  }
  if (seg === null) return empty(at >= bytes.length ? 'no_exif' : 'truncated');

  // --- the TIFF block ---------------------------------------------------------------------
  if (seg.end - seg.start < 8) return empty('truncated');
  const order = (bytes[seg.start] << 8) | bytes[seg.start + 1];
  if (order !== 0x4d4d && order !== 0x4949) return empty('malformed');
  const t: Tiff = { bytes, base: seg.start, end: seg.end, be: order === 0x4d4d };
  if (u16(t, 2) !== 42) return empty('malformed');
  const ifd0At = u32(t, 4);
  if (ifd0At === null || ifd0At < 8 || t.base + ifd0At >= t.end) return empty('malformed');

  // Rule 2's termination guarantee: an offset is followed at most once, ever. P2's
  // self-referential pointer therefore stops here rather than recursing.
  const visited = new Set<number>([ifd0At]);
  let malformed = false;

  const ifd0 = readIfd(t, ifd0At);
  if (ifd0 === null) return empty('malformed');

  const byTag = (entries: Entry[]): Map<number, Entry> => {
    const m = new Map<number, Entry>();
    for (const e of entries) if (!m.has(e.tag)) m.set(e.tag, e);
    return m;
  };
  const dir0 = byTag(ifd0);

  /** Follows a sub-IFD pointer, once. Returns `[]` and marks the file malformed otherwise. */
  const sub = (tag: number): Map<number, Entry> => {
    const ptr = dir0.get(tag);
    if (!ptr) return new Map();
    const off = scalar(t, ptr);
    if (off === null || off < 8 || t.base + off >= t.end) {
      malformed = true;
      return new Map();
    }
    if (visited.has(off)) {
      malformed = true; // P2 — a cycle is a broken file, and it is reported as one
      return new Map();
    }
    visited.add(off);
    const entries = readIfd(t, off);
    if (entries === null) {
      malformed = true;
      return new Map();
    }
    return byTag(entries);
  };

  const dirExif = sub(0x8769);
  const dirGps = sub(0x8825);

  // --- the four values, each independently ------------------------------------------------
  const dateEntry = dirExif.get(0x9003) ?? dir0.get(0x0132);
  const capturedAt = parseExifDateTime(
    dateEntry && dateEntry.type === 2 ? asciiAt(t, dateEntry.valueAt, Math.min(dateEntry.count, 32)) : null,
  );

  const orientationRaw = dir0.get(0x0112) ? scalar(t, dir0.get(0x0112) as Entry) : null;
  const orientation =
    orientationRaw !== null && orientationRaw >= 1 && orientationRaw <= 8
      ? (orientationRaw as ExifRead['orientation'])
      : null;

  const px = dirExif.get(0xa002) ? scalar(t, dirExif.get(0xa002) as Entry) : null;
  const py = dirExif.get(0xa003) ? scalar(t, dirExif.get(0xa003) as Entry) : null;
  const pixel = px !== null && py !== null && px > 0 && py > 0 ? { w: px, h: py } : null;

  let atLatLng: LatLng | null = null;
  const latRefE = dirGps.get(0x0001);
  const lngRefE = dirGps.get(0x0003);
  const latRef = latRefE && latRefE.type === 2 ? asciiAt(t, latRefE.valueAt, Math.min(latRefE.count, 4)) : null;
  const lngRef = lngRefE && lngRefE.type === 2 ? asciiAt(t, lngRefE.valueAt, Math.min(lngRefE.count, 4)) : null;
  const lat = degrees(t, dirGps.get(0x0002));
  const lng = degrees(t, dirGps.get(0x0004));
  if (lat !== null && lng !== null && (latRef === 'N' || latRef === 'S') && (lngRef === 'E' || lngRef === 'W')) {
    const signedLat = latRef === 'S' ? -lat : lat;
    const signedLng = lngRef === 'W' ? -lng : lng;
    // Rule 4, and A-57 Part 9 residue 3: exact (0, 0) is read as ABSENT. A zeroed GPS block is
    // overwhelmingly more common than a photograph taken in the Gulf of Guinea, and the cost of
    // the rule is one false negative against many false pins.
    const nullIsland = signedLat === 0 && signedLng === 0;
    if (!nullIsland && Math.abs(signedLat) <= 90 && Math.abs(signedLng) <= 180) {
      atLatLng = { lat: signedLat, lng: signedLng };
    }
  }

  if (malformed) return empty('malformed');
  return { capturedAt, at: atLatLng, pixel, orientation, reason: 'ok' };
}
