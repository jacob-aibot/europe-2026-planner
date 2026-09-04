/**
 * `readExif` — ARCHITECTURE §10.2, and **A-57 Part 7's fault matrix P1–P7**, which A-58 Part 7
 * makes the *price* of refusing a parsing dependency rather than an optional extra.
 *
 * The corpus is `fixtures/photo/` — **JPEG headers, not photographs** (A-58 Part 7). No file in
 * it is a picture, and **no coordinate appears in this file or in the golden**: the two fixtures
 * that carry a GPS block are asserted about as *"a coordinate was read"* / *"none was"*, which
 * is §10.5's cross-cutting rule (*"no coordinate in any log line, ever"*) applied to a test.
 *
 * Every case names the production change that would make it fail:
 *   - drop the segment bounds check → P1 stops saying `'truncated'`;
 *   - drop the visited-offset set → P2 loops or reports `'ok'`;
 *   - preallocate on the entry count → P3 allocates 65,535 entries against 200 bytes;
 *   - stop checking the denominator → P4 returns `Infinity`/`NaN` degrees;
 *   - reach for a second date parser → P5 reads year zero;
 *   - special-case (0,0) away → P6 pins Null Island;
 *   - accept any container → P7 reads a HEIC as a JPEG.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readExif } from '../src/photo/exif.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(HERE, '..', '..', '..', 'fixtures', 'photo');

const load = (name: string): Uint8Array => new Uint8Array(readFileSync(join(CORPUS, name)));

test('the committed corpus is present and is headers, not photographs', () => {
  const names = readdirSync(CORPUS).sort();
  assert.ok(names.length >= 10, `INCONCLUSIVE: only ${names.length} fixtures were found`);
  for (const n of names) {
    const size = readFileSync(join(CORPUS, n)).length;
    assert.ok(size < 4096, `${n} is ${size} bytes — the corpus is headers, not photographs`);
  }
});

test('a JPEG with EXIF yields its date, its orientation and its pixel dimensions', () => {
  const r = readExif(load('jpeg-exif-gps.jpg'));
  assert.equal(r.reason, 'ok');
  assert.deepEqual(r.capturedAt, { date: '2024-05-11', time: '08:14' });
  assert.equal(r.orientation, 6);
  assert.deepEqual(r.pixel, { w: 4032, h: 3024 });
  // §10.5: a coordinate was read. WHICH coordinate is deliberately not asserted here.
  assert.notEqual(r.at, null);
});

test('little-endian TIFF is read as well as big-endian', () => {
  const r = readExif(load('jpeg-exif-le.jpg'));
  assert.equal(r.reason, 'ok');
  assert.deepEqual(r.capturedAt, { date: '2019-03-02', time: '19:45' });
  assert.deepEqual(r.pixel, { w: 1600, h: 1200 });
  assert.equal(r.at, null, 'a file with no GPS block must not acquire one');
  assert.equal(r.orientation, 1);
});

test('a JPEG with no APP1 Exif segment says no_exif and guesses nothing', () => {
  const r = readExif(load('jpeg-noexif.jpg'));
  assert.equal(r.reason, 'no_exif');
  assert.deepEqual([r.capturedAt, r.at, r.pixel, r.orientation], [null, null, null, null]);
});

test('P1: a truncated APP1 segment returns truncated, every field null, and does not throw', () => {
  const r = readExif(load('jpeg-truncated-app1.jpg'));
  assert.equal(r.reason, 'truncated');
  assert.deepEqual([r.capturedAt, r.at, r.pixel, r.orientation], [null, null, null, null]);
});

test('P2: a sub-IFD offset pointing at itself terminates and reports malformed', () => {
  const r = readExif(load('jpeg-selfref-ifd.jpg'));
  assert.equal(r.reason, 'malformed');
});

test('P3: an IFD claiming 65,535 entries in a 200-byte segment terminates as malformed', () => {
  const bytes = load('jpeg-huge-ifd.jpg');
  assert.ok(bytes.length < 400, `the fixture grew to ${bytes.length} bytes; P3 needs a small one`);
  const r = readExif(bytes);
  assert.equal(r.reason, 'malformed');
  assert.deepEqual([r.capturedAt, r.at, r.pixel], [null, null, null]);
});

test('P4: a zero GPS denominator drops the coordinate and keeps the date', () => {
  const r = readExif(load('jpeg-gps-zerodenom.jpg'));
  assert.equal(r.at, null, 'a division by zero became a coordinate');
  assert.deepEqual(r.capturedAt, { date: '2022-11-09', time: '06:30' }, 'one bad field failed a good one');
  assert.equal(r.reason, 'ok');
});

test('P5: DateTimeOriginal "0000:00:00 00:00:00" is null, not year zero', () => {
  const r = readExif(load('jpeg-date-zeros.jpg'));
  assert.equal(r.capturedAt, null);
  assert.equal(r.reason, 'ok');
});

test('P6: GPS reading exactly (0, 0) is read as absent', () => {
  const r = readExif(load('jpeg-gps-nullisland.jpg'));
  assert.equal(r.at, null);
  assert.deepEqual(r.capturedAt, { date: '2023-07-04', time: '12:00' });
});

test('P7: a HEIC file is refused as an unsupported container, with no throw', () => {
  const r = readExif(load('heic-ftyp.heic'));
  assert.equal(r.reason, 'unsupported_container');
  assert.deepEqual([r.capturedAt, r.at, r.pixel, r.orientation], [null, null, null, null]);
});

test('PNG and a two-byte non-image are refused the same way', () => {
  for (const name of ['png-header.png', 'not-an-image.bin']) {
    const r = readExif(load(name));
    assert.equal(r.reason, 'unsupported_container', name);
    assert.equal(r.at, null, name);
  }
});

/**
 * Rule 1 — **total**. The strongest statement this file can make about a parser over
 * attacker-controlled bytes: a deterministic sweep of mutations over every corpus file, and
 * not one of them throws. Deterministic by construction (a fixed LCG, no `Math.random`), so a
 * failure is reproducible from the seed printed in the message.
 */
test('rule 1: no input throws — 12,000 deterministic mutations over the whole corpus', () => {
  const names = readdirSync(CORPUS).sort();
  let seed = 20260904;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  };
  let checked = 0;
  for (const name of names) {
    const base = load(name);
    for (let i = 0; i < 1000; i++) {
      const bytes = base.slice(0, 1 + (next() % base.length));
      const flips = next() % 4;
      for (let f = 0; f <= flips; f++) bytes[next() % bytes.length] = next() & 0xff;
      try {
        const r = readExif(bytes);
        assert.ok(
          ['ok', 'unsupported_container', 'no_exif', 'malformed', 'truncated'].includes(r.reason),
          `unknown reason ${r.reason}`,
        );
        if (r.at) {
          assert.ok(Number.isFinite(r.at.lat) && Math.abs(r.at.lat) <= 90, 'latitude out of range');
          assert.ok(Number.isFinite(r.at.lng) && Math.abs(r.at.lng) <= 180, 'longitude out of range');
        }
        if (r.pixel) assert.ok(Number.isFinite(r.pixel.w) && Number.isFinite(r.pixel.h));
      } catch (e) {
        assert.fail(`readExif threw on a mutation of ${name} (seed ${seed}): ${(e as Error).message}`);
      }
      checked++;
    }
  }
  assert.ok(checked >= 12000, `INCONCLUSIVE: only ${checked} mutations ran`);
});

test('rule 5: deterministic — the same bytes give the same answer twice', () => {
  for (const name of readdirSync(CORPUS)) {
    assert.deepEqual(readExif(load(name)), readExif(load(name)), name);
  }
});

/**
 * §10.5, and A-58 Part 7's *"its golden carries no coordinate"*. The golden is generated by
 * `tools/gen-golden.mjs`; this asserts the committed file both matches today's reader and holds
 * no number that could be a coordinate.
 */
test('the readExif golden matches, and carries no coordinate', () => {
  const path = resolve(HERE, '..', '..', '..', 'fixtures', 'golden', 'photo-exif.json');
  const golden = JSON.parse(readFileSync(path, 'utf8')) as {
    files: Array<{ name: string; reason: string; capturedAt: unknown; hasCoordinate: boolean; pixel: unknown; orientation: unknown }>;
  };
  assert.ok(golden.files.length >= 10, `INCONCLUSIVE: the golden holds ${golden.files.length} entries`);
  for (const row of golden.files) {
    const r = readExif(load(row.name));
    assert.equal(r.reason, row.reason, row.name);
    assert.deepEqual(r.capturedAt, row.capturedAt, row.name);
    assert.deepEqual(r.pixel, row.pixel, row.name);
    assert.deepEqual(r.orientation, row.orientation, row.name);
    assert.equal(r.at !== null, row.hasCoordinate, row.name);
  }
  // The grep is over the DATA, not the header: the header cites section numbers ("§10.5") and
  // a section number is not a coordinate. Every value in `files` is a name, an integer, an ISO
  // date, an `HH:MM`, a `reason` or a boolean — a decimal there could only be a coordinate.
  const data = JSON.stringify(golden.files);
  assert.equal(/-?\d+\.\d+/.test(data), false, `a decimal reached the readExif golden:\n${data}`);
  for (const key of ['"lat"', '"lng"', '"at"']) {
    assert.equal(data.includes(key), false, `${key} reached the readExif golden`);
  }
});
