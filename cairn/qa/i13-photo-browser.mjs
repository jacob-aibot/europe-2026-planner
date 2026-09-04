/**
 * **I-13 — the `apps/web` half of the photo port, in a real browser engine.**
 *
 *   Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
 *        node --experimental-strip-types qa/i13-photo-browser.mjs      (from cairn/)
 *   Engine: `--engine=chromium` (default) or `--engine=webkit`.
 *   Faults: `--fault=p2` (the byte stores put in a SECOND database, so the cascade cannot be
 *           atomic), `--fault=p3` (`write` stores only the thumb, so `read(id,'display')` is
 *           null). **There is no `p1`, and §B explains why in a measurement rather than a
 *           sentence: on Chromium, deleting §10.4's halving loop changes nothing this probe can
 *           see, so filing it as a red fault would claim a coverage the suite has not got.**
 *
 * **QA round 45 re-cut — `--engine=webkit`.** As delivered this file said, in §B and in its own
 * header, that *"this probe cannot run WebKit"*, and I-13's BUILD-NOTES row carried the same
 * sentence as the reason for keeping §10.4's halving loop unverified. **That was wrong**:
 * `/opt/pw-browsers/webkit-2215` is installed in this environment and `pw.webkit.launch()`
 * succeeds (Safari 26 / AppleWebKit 605.1.15). §10.4's citation is a WebKit one and §10.5's
 * privacy mechanism (*"a canvas re-encode carries no metadata"*) had only ever been measured on
 * the engine Jacob does **not** use, so the engine is now a flag and both are runnable. R45-6.
 * *(WebKit-on-Linux is not iOS Safari and this probe does not claim it is — a file input's
 * EXIF-stripping behaviour, A-58 Part 2's central fact, is an iOS platform behaviour and stays
 * unmeasured here. What is now measured is the rendering/encoding engine's own behaviour.)*
 *
 * **Why this file exists at all.** `packages/client`'s photo tests run against `memoryPhotos()`,
 * which deliberately does not decode anything — there is no canvas in Node and A-58 Part 5 refuses
 * the dependency that would provide one. So three of ARCHITECTURE §10's claims are, in bare Node,
 * **unmeasured**:
 *
 *   1. §10.4's resolution discipline — that a 4000 × 3000 source really produces a ≤320 px thumb
 *      and a ≤1600 px display, that both decode, and that the thumb is at least 20× smaller than
 *      the source. ROADMAP I-13 says *"measured, not asserted"* and this is the measurement.
 *   2. §10.5's whole mechanism — that **a canvas re-encode carries no metadata**. `readExif` over
 *      the stored derivative of a photo that had GPS and a date must say `no_exif`, every field
 *      null. That is one assertion and it is the entire privacy argument.
 *   3. §10.3's storage shape — two object stores at `DB_VERSION` 4, `ArrayBuffer` values, and a
 *      trip delete that removes the document, its summary, its fence **and** both derivatives in
 *      one transaction.
 *
 * The modules under test are the **shipped files, byte for byte**, type-stripped and evaluated in
 * a blank page from an ephemeral port (IndexedDB is unavailable on `about:blank`) — the structure
 * `qa/i6a-idb.mjs` and `qa/i7a-idb-rowkeys.mjs` already use.
 *
 * **It stays out of `npm test`, deliberately and permanently**: the gate runs on bare Node
 * (`BRIEF.md`'s phasing principle, `cairn-constraints` §2/§3). No browser is a **disclosed gap**,
 * not a pass.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';

const ENGINE_ARG = process.argv.find((a) => a.startsWith('--engine='));
const ENGINE = ENGINE_ARG === undefined ? 'chromium' : ENGINE_ARG.split('=')[1].toLowerCase();
if (!['chromium', 'webkit'].includes(ENGINE)) {
  throw new Error(`unknown engine ${JSON.stringify(ENGINE)} — one of: chromium, webkit`);
}
const launcher = ENGINE === 'webkit' ? pw.webkit : pw.chromium;
const FAULT_ARG = process.argv.find((a) => a === '--fault' || a.startsWith('--fault='));
const FAULT = FAULT_ARG === undefined ? null : (FAULT_ARG.split('=')[1] ?? 'p2').toLowerCase();
if (FAULT !== null && !['p2', 'p3'].includes(FAULT)) {
  throw new Error(`unknown fault ${JSON.stringify(FAULT)} — one of: p2 (second database), p3 (thumb-only write)`);
}

let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const url = (p) => new URL(p, import.meta.url);
let storageSrc = readFileSync(url('../apps/web/src/ports/storage.ts'), 'utf8');
let photoSrc = readFileSync(url('../apps/web/src/ports/photo.ts'), 'utf8');
const exifSrc = readFileSync(url('../packages/core/src/photo/exif.ts'), 'utf8');

/** The port's own `DB_VERSION`, read rather than transcribed. §10.3 says it must be 4. */
const DB_VERSION = Number(/^const DB_VERSION = (\d+);$/m.exec(storageSrc)?.[1]);
if (!Number.isInteger(DB_VERSION)) throw new Error('DB_VERSION could not be read from the port');

// --------------------------------------------------------------------------- faults

/**
 * **P2 — the byte stores moved into a second database.** The exact design §10.3 refuses: *"IndexedDB
 * transactions do not span databases … two databases means an orphan window on every delete."*
 * Everything still works; only the cascade stops being atomic, and §D is what sees it.
 */
function applyP2(s) {
  const open = "    const req = indexedDB.open(DB_NAME, DB_VERSION);";
  if (!s.includes(open)) throw new Error('the open() call moved — re-derive the fault');
  // A second `open` used only by the byte half, plus the byte stores removed from the delete
  // transaction — the two halves of the same mistake.
  s = s.replace(
    "export function indexedDbPhotoBytes()",
    "function openPhotoDb() {\n" +
    "  return new Promise((resolve, reject) => {\n" +
    "    const req = indexedDB.open('cairn-photos', 1);\n" +
    "    req.onupgradeneeded = () => {\n" +
    "      const db = req.result;\n" +
    "      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS);\n" +
    "      if (!db.objectStoreNames.contains(PHOTO_THUMBS)) db.createObjectStore(PHOTO_THUMBS);\n" +
    "    };\n" +
    "    req.onsuccess = () => resolve(req.result);\n" +
    "    req.onerror = () => reject(req.error);\n" +
    "  });\n" +
    "}\n\nexport function indexedDbPhotoBytes()",
    1,
  );
  const marker = 'export function indexedDbPhotoBytes()';
  const i = s.indexOf(marker);
  s = s.slice(0, i) + s.slice(i).replaceAll('const db = await open();', 'const db = await openPhotoDb();');
  return s;
}

/**
 * **P3 — `write` stores the thumb and drops the display derivative.**
 *
 * It is deliberately NOT the fault this arm originally carried. That one split `write` into two
 * transactions, so a quota failure on the second put would leave a half-written pair — and it
 * measured **GREEN**, because there is no way to induce a real `QuotaExceededError` in headless
 * Chromium on demand, so both puts simply succeeded and nothing observable differed. Filing it
 * would have claimed a coverage this probe has not got. **`write`'s atomicity under a failing put
 * is therefore NOT measured here**; what is measured is that both derivatives really are stored
 * and really are read back, which is what §D's read-back assertions are for. The saga's behaviour
 * given a rejecting port is `packages/client`'s **P9**, in plain Node.
 */
function applyP3(s) {
  const put = '        tx.objectStore(PHOTOS).put(detach(display), [tripId, id]);';
  if (!s.includes(put)) throw new Error('the write puts moved — re-derive the fault');
  return s.replace(put, '        // FAULT P3: the display derivative is never stored.', 1);
}

if (FAULT === 'p2') { storageSrc = applyP2(storageSrc); note('P2 (byte stores in a second database) applied to the shipped source'); }
if (FAULT === 'p3') { storageSrc = applyP3(storageSrc); note('P3 (thumb-only write) applied to the shipped source'); }

// --------------------------------------------------------------------------- injection

/**
 * The three modules, type-stripped, with their imports of each other rewritten to globals.
 * Nothing is re-implemented: the bodies are the shipped bytes.
 */
const strip = (s) => stripTypeScriptTypes(s, { mode: 'strip' });

const injected = [
  strip(exifSrc)
    .replace(/^import[^\n]*\n/gm, '')
    // `readExif` calls two core predicates. They are transcribed here ONLY because this page has
    // no module loader; both are copied from their own sources verbatim below.
    .replace('export function readExif', 'function readExif')
    .replace('export type', '// export type'),
  'globalThis.readExif = readExif;',
  strip(storageSrc)
    .replace(/^import[^\n]*\n/gm, '')
    .replace('export function indexedDbStorage', 'function indexedDbStorage')
    .replace('export function indexedDbPhotoBytes', 'function indexedDbPhotoBytes')
    // I-13b (R45-16) added `export async function requestPersistentStorage`. Every export has to
    // go — the page evaluates this as a script — and the assertion below is what says so.
    .replace(/^export (async )?function /gm, '$1function '),
  'globalThis.indexedDbStorage = indexedDbStorage; globalThis.indexedDbPhotoBytes = indexedDbPhotoBytes;',
  strip(photoSrc)
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/^export (function|async function)/gm, '$1'),
  'globalThis.derive = derive;',
].join('\n');

// `readExif` imports `isIsoDate` and `isClockTime`; the page has no loader, so the two predicates
// are pulled from their own source files rather than retyped here — a second copy is exactly the
// defect A-20 treats, even in a probe.
const idsSrc = readFileSync(url('../packages/core/src/model/ids.ts'), 'utf8');
const hoursSrc = readFileSync(url('../packages/core/src/model/openingHours.ts'), 'utf8');
const lift = (src, name) => {
  const m = new RegExp(`export function ${name}\\([\\s\\S]*?\\n\\}`, 'm').exec(strip(src));
  if (!m) throw new Error(`${name} could not be lifted from its source`);
  return m[0].replace('export function', 'function');
};
const liftHelper = (src, name) => {
  const m = new RegExp(`(?<!export )function ${name}\\([\\s\\S]*?\\n\\}`, 'm').exec(strip(src));
  if (!m) throw new Error(`${name} could not be lifted`);
  return m[0];
};
const prelude = [
  'const ISO_DATE_RE = /^(\\d{4})-(\\d{2})-(\\d{2})$/;',
  liftHelper(idsSrc, 'daysInMonth'),
  lift(idsSrc, 'isIsoDate'),
  lift(hoursSrc, 'isClockTime'),
].join('\n');

const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<!doctype html><meta charset=utf-8><title>i13-photo-browser</title>');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await launcher.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`  page error: ${e.message}`));
await page.goto(`http://127.0.0.1:${port}/`);
note(`engine: ${ENGINE} — ${await page.evaluate(() => navigator.userAgent)}`);
await page.evaluate(prelude + '\n' + injected);

// --------------------------------------------------------------------------- the source image

/**
 * A **4000 × 3000 JPEG with a real EXIF block** — a date, an orientation and a GPS coordinate —
 * built in the page from a canvas plus a hand-assembled APP1 segment.
 *
 * It is generated rather than committed because `fixtures/photo/` is deliberately *headers, not
 * photographs* (A-58 Part 7) and a 4000 × 3000 photograph is not a header. The pixels are a
 * high-frequency checkerboard-and-gradient pattern, chosen because **that is what aliases**: a
 * flat image downscales identically with and without the halving loop, so P1 would be green
 * against one.
 *
 * The coordinate baked into it is invented (12.3456 N, 65.4321 E) and never printed.
 */
const SOURCE = await page.evaluate(async () => {
  const W = 4000, H = 3000;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // 1-pixel checkerboard: the highest spatial frequency the image can hold, so a naive
      // large-ratio downscale point-samples it into noise and a halving loop averages it to grey.
      const check = ((x + y) & 1) ? 255 : 0;
      img.data[i] = check;
      img.data[i + 1] = (x * 255 / W) | 0;
      img.data[i + 2] = (y * 255 / H) | 0;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
  const plain = new Uint8Array(await blob.arrayBuffer());

  // Splice a real APP1 Exif segment in after SOI. Big-endian TIFF, IFD0 (orientation) + Exif
  // sub-IFD (DateTimeOriginal) + GPS IFD (an invented coordinate).
  const be16 = (v) => [(v >> 8) & 0xff, v & 0xff];
  const be32 = (v) => [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
  const asciiBytes = (s) => [...s].map((ch) => ch.charCodeAt(0) & 0xff).concat(0);
  const DATE = '2024:05:11 08:14:02';
  const dateBytes = asciiBytes(DATE);                       // 20 bytes
  // Layout, hand-computed: header 8 | IFD0 at 8 (3 entries → 2+36+4 = 42) | values |
  // Exif IFD | GPS IFD.
  const ifd0At = 8, ifd0Size = 2 + 3 * 12 + 4;              // 42
  const exifAt = ifd0At + ifd0Size;                          // 50
  const exifSize = 2 + 1 * 12 + 4;                           // 18
  const dateAt = exifAt + exifSize;                          // 68
  const gpsAt = dateAt + dateBytes.length;                   // 88
  const gpsSize = 2 + 4 * 12 + 4;                            // 54
  const latAt = gpsAt + gpsSize;                             // 142
  const lngAt = latAt + 24;                                  // 166
  const t = [];
  t.push(0x4d, 0x4d, ...be16(42), ...be32(ifd0At));
  // IFD0: orientation=1 (upright — the derive path bakes it in either way and this probe is not
  // about rotation), the Exif pointer and the GPS pointer.
  t.push(...be16(3));
  t.push(...be16(0x0112), ...be16(3), ...be32(1), ...be16(1), 0, 0);
  t.push(...be16(0x8769), ...be16(4), ...be32(1), ...be32(exifAt));
  t.push(...be16(0x8825), ...be16(4), ...be32(1), ...be32(gpsAt));
  t.push(...be32(0));
  // Exif sub-IFD: DateTimeOriginal.
  t.push(...be16(1));
  t.push(...be16(0x9003), ...be16(2), ...be32(dateBytes.length), ...be32(dateAt));
  t.push(...be32(0));
  t.push(...dateBytes);
  // GPS IFD: N 12.3456…, E 65.4321… — invented, and never printed by anything.
  t.push(...be16(4));
  t.push(...be16(0x0001), ...be16(2), ...be32(2), 0x4e, 0, 0, 0);
  t.push(...be16(0x0002), ...be16(5), ...be32(3), ...be32(latAt));
  t.push(...be16(0x0003), ...be16(2), ...be32(2), 0x45, 0, 0, 0);
  t.push(...be16(0x0004), ...be16(5), ...be32(3), ...be32(lngAt));
  t.push(...be32(0));
  t.push(...be32(12), ...be32(1), ...be32(20), ...be32(1), ...be32(4416), ...be32(100));
  t.push(...be32(65), ...be32(1), ...be32(25), ...be32(1), ...be32(5556), ...be32(100));
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...t];
  const app1 = [0xff, 0xe1, ...be16(payload.length + 2), ...payload];
  const out = new Uint8Array(2 + app1.length + (plain.length - 2));
  out.set(plain.subarray(0, 2), 0);
  out.set(app1, 2);
  out.set(plain.subarray(2), 2 + app1.length);
  return { bytes: [...out], plainLength: plain.length, w: W, h: H };
});

head('§A — the source image is what the probe claims it is');
ok(SOURCE.w === 4000 && SOURCE.h === 3000, 'a 4000 × 3000 source was generated', { w: SOURCE.w, h: SOURCE.h });
ok(SOURCE.bytes.length > 200_000, 'the source is a real photograph-sized JPEG', { bytes: SOURCE.bytes.length });
const sourceMeta = await page.evaluate((b) => {
  const r = readExif(new Uint8Array(b));
  return { reason: r.reason, capturedAt: r.capturedAt, hasCoordinate: r.at !== null, orientation: r.orientation };
}, SOURCE.bytes);
ok(sourceMeta.reason === 'ok', 'readExif reads the source\'s own EXIF block', sourceMeta);
ok(sourceMeta.capturedAt && sourceMeta.capturedAt.date === '2024-05-11', 'the source carries a capture date', sourceMeta);
ok(sourceMeta.hasCoordinate === true, 'the source carries a GPS coordinate — which is the point of §C', sourceMeta);

// --------------------------------------------------------------------------- §B resolution

head('§B — §10.4, measured rather than asserted (ROADMAP I-13)');
const derived = await page.evaluate(async (b) => {
  const d = await derive(new Uint8Array(b), 'image/jpeg');
  if (!d) return null;
  // Decode both back, so "it produced bytes" is not mistaken for "it produced an image".
  const decodeSize = async (bytes) => {
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
    const out = { w: bmp.width, h: bmp.height };
    bmp.close();
    return out;
  };
  return {
    source: d.source,
    thumb: { w: d.thumb.w, h: d.thumb.h, bytes: d.thumb.bytes.length, decoded: await decodeSize(d.thumb.bytes) },
    display: { w: d.display.w, h: d.display.h, bytes: d.display.bytes.length, decoded: await decodeSize(d.display.bytes) },
    thumbBytes: [...d.thumb.bytes],
    displayBytes: [...d.display.bytes],
  };
}, SOURCE.bytes);

ok(derived !== null, 'derive() produced two derivatives from a real 4000 × 3000 JPEG');
if (derived) {
  ok(Math.max(derived.thumb.w, derived.thumb.h) <= 320,
    'the thumb\'s long edge is ≤ 320 px', derived.thumb);
  ok(Math.max(derived.display.w, derived.display.h) <= 1600,
    'the display derivative\'s long edge is ≤ 1600 px', derived.display);
  ok(derived.thumb.decoded.w === derived.thumb.w && derived.thumb.decoded.h === derived.thumb.h,
    'the stored thumb DECODES, at the dimensions the record claims', derived.thumb);
  ok(derived.display.decoded.w === derived.display.w && derived.display.decoded.h === derived.display.h,
    'the stored display derivative DECODES, at the dimensions the record claims', derived.display);
  ok(derived.thumb.bytes * 20 <= SOURCE.bytes.length,
    'the thumb is at least 20× smaller than the source (ROADMAP I-13)',
    { thumb: derived.thumb.bytes, source: SOURCE.bytes.length, ratio: +(SOURCE.bytes.length / derived.thumb.bytes).toFixed(1) });
  ok(derived.source.w === 4000 && derived.source.h === 3000,
    'the record\'s `source` is the file\'s own pixel dimensions', derived.source);

  /**
   * **§10.4 step 2, measured directly rather than through a source mutation — and the measurement
   * does not say what the ruling assumes.**
   *
   * A 1-pixel checkerboard is the highest spatial frequency an image can hold: under a correct
   * box-filter chain it averages to flat mid-grey (low variance), and under naive point-sampling
   * it becomes high-variance noise. So the number below is the discriminator, and the probe
   * computes it **both ways in the same page** — the shipped halving loop, and a single
   * large-ratio `drawImage` — instead of deleting the loop from the source and hoping.
   *
   * **On Chromium the two are indistinguishable.** `imageSmoothingQuality: 'high'` already
   * performs a proper multi-step downscale, so the loop buys nothing measurable *on this engine*.
   * That is reported as a fact rather than dressed up as a passing fault: §10.4's ruling is about
   * `drawImage` across engines and its own citation is a WebKit one, and **this probe cannot run
   * WebKit**. So the assertion here is the one that is actually true and actually checkable —
   * *the shipped path averages* — and the comparison is printed beside it so a reader can see
   * that it is not the loop that achieved it here.
   */
  const quality = await page.evaluate(async ({ src, w, h }) => {
    const varianceOf = async (bytes) => {
      const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }));
      const c = document.createElement('canvas');
      c.width = bmp.width; c.height = bmp.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let n = 0, sum = 0, sumSq = 0;
      for (let i = 0; i < d.length; i += 4) { n++; sum += d[i]; sumSq += d[i] * d[i]; }
      return sumSq / n - (sum / n) ** 2;
    };
    // The naive path: one draw, 4000 → 320, no intermediate steps.
    const bmp = await createImageBitmap(new Blob([new Uint8Array(src)], { type: 'image/jpeg' }));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const naive = new Uint8Array(await (await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.72))).arrayBuffer());
    return { naive: await varianceOf(naive), naiveBytes: naive.length };
  }, { src: SOURCE.bytes, w: derived.thumb.w, h: derived.thumb.h });

  const variance = await page.evaluate(async (bytes) => {
    const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }));
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0, sum = 0, sumSq = 0;
    for (let i = 0; i < d.length; i += 4) { n++; sum += d[i]; sumSq += d[i] * d[i]; }
    return sumSq / n - (sum / n) ** 2;
  }, derived.thumbBytes);

  note(`thumb red-channel variance on ${ENGINE} — shipped (halving loop): ${variance.toFixed(2)}; single large-ratio draw: ${quality.naive.toFixed(2)}`);
  // R45-6: run this with `--engine=webkit` as well. §10.4's own citation is a WebKit one, so a
  // number measured only on Chromium says nothing about the ruling it is supposed to support.
  note(`ratio naive/shipped on ${ENGINE}: ${(quality.naive / Math.max(variance, 1e-9)).toFixed(2)} (1.00 = the loop bought nothing measurable on this engine)`);
  ok(variance < 1500,
    'the shipped path AVERAGES a 1-px checkerboard rather than point-sampling it (§10.4)',
    { variance, naive: quality.naive });
}

// --------------------------------------------------------------------------- §C re-encode

head('§C — §10.5: a canvas re-encode carries no metadata. One assertion, the whole mechanism');
if (derived) {
  for (const [which, bytes] of [['thumb', derived.thumbBytes], ['display', derived.displayBytes]]) {
    const r = await page.evaluate((b) => {
      const x = readExif(new Uint8Array(b));
      return { reason: x.reason, capturedAt: x.capturedAt, hasCoordinate: x.at !== null, pixel: x.pixel, orientation: x.orientation };
    }, bytes);
    ok(r.reason === 'no_exif' && r.capturedAt === null && r.hasCoordinate === false
      && r.pixel === null && r.orientation === null,
      `the stored ${which} carries NO EXIF: no date, no coordinate, no orientation, no maker note`, r);
  }
  // …and the raw bytes carry no Exif marker at all, which is the same claim one level below the
  // parser, so a parser bug cannot make this green.
  const markers = await page.evaluate((b) => {
    const s = new Uint8Array(b);
    let app1 = 0, exif = 0;
    for (let i = 0; i + 5 < s.length; i++) {
      if (s[i] === 0xff && s[i + 1] === 0xe1) app1++;
      if (s[i] === 0x45 && s[i + 1] === 0x78 && s[i + 2] === 0x69 && s[i + 3] === 0x66 && s[i + 4] === 0 && s[i + 5] === 0) exif++;
    }
    return { app1, exif };
  }, derived.displayBytes);
  ok(markers.app1 === 0 && markers.exif === 0,
    'the raw derivative bytes contain no APP1 segment and no "Exif\\0\\0" marker at all', markers);
}

// --------------------------------------------------------------------------- §D storage

head('§D — §10.3: two stores at DB_VERSION 5, `[tripId, photoId]` keys, ArrayBuffer values, one atomic cascade');
ok(DB_VERSION === 5, 'the shipped port is at DB_VERSION 5 — §10 A-62 re-keyed the byte stores', { DB_VERSION });

const storage = await page.evaluate(async ({ thumb, display }) => {
  await new Promise((r) => { const q = indexedDB.deleteDatabase('cairn'); q.onsuccess = q.onerror = q.onblocked = r; });
  await new Promise((r) => { const q = indexedDB.deleteDatabase('cairn-photos'); q.onsuccess = q.onerror = q.onblocked = r; });
  const port = indexedDbStorage();
  const photos = indexedDbPhotoBytes();
  const row = {
    id: 't1', title: 'T', startDate: '2026-08-07', endDate: '2026-08-09', datePrecision: 'exact',
    cityCount: 0, dayCount: 3, stopCount: 0, poolCount: 0, revision: 1, countryCodes: [],
    cities: [], attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
    summaryVersion: 5,
  };
  const doc = JSON.stringify({
    schemaVersion: 2, id: 't1', title: 'T', ownerId: 'local:self',
    startDate: '2026-08-07', endDate: '2026-08-09', datePrecision: 'exact', homeCurrency: 'EUR',
    homeBase: null, party: { adults: 1, children: 0 }, cities: [], days: [], pool: [], places: [],
    bookings: [], resolutions: [], revision: 1,
    photos: [
      { id: 'photo-1', attach: { kind: 'trip' }, caption: '', capturedAt: null, at: null,
        metaSource: null, source: null, thumb: { w: 320, h: 240, bytes: 1 }, display: { w: 1600, h: 1200, bytes: 1 },
        provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-01-01', acceptedAt: '2026-01-01', actorUserId: 'local:self' } },
      { id: 'photo-2', attach: { kind: 'trip' }, caption: '', capturedAt: null, at: null,
        metaSource: null, source: null, thumb: { w: 320, h: 240, bytes: 1 }, display: { w: 1600, h: 1200, bytes: 1 },
        provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-01-01', acceptedAt: '2026-01-01', actorUserId: 'local:self' } },
    ],
  });
  const saved = await port.saveIfVersion('t1', null, doc, row);
  // **§10 A-62 (revision 44): the owning `TripId` comes first, and the key is `[tripId, id]`.**
  await photos.write('t1', 'photo-1', new Uint8Array(thumb), new Uint8Array(display));
  await photos.write('t1', 'photo-2', new Uint8Array(thumb), new Uint8Array(display));
  // A byte record belonging to ANOTHER trip: it must survive `t1`'s cascade. Under the bare key
  // this was "a record no trip references"; under the compound key the sharper case is a record
  // that is a DIFFERENT trip's, because the cascade is now a key range and a range that reached
  // one trip too far would be the R45-2 defect in a second place.
  await photos.write('t2', 'photo-orphan', new Uint8Array(thumb), new Uint8Array(display));

  const before = [
    ...(await photos.present('t1', ['photo-1', 'photo-2'])),
    ...(await photos.present('t2', ['photo-orphan'])),
  ];
  const readBack = await photos.read('t1', 'photo-1', 'display');
  const missing = await photos.read('t1', 'photo-nope', 'thumb');

  // The raw persisted VALUE type, read outside the port — the only place in this repo where the
  // actual stored bytes of the actual shipped port are checked.
  const raw = await new Promise((resolve, reject) => {
    const req = indexedDB.open('cairn');
    req.onsuccess = () => {
      const db = req.result;
      const names = [...db.objectStoreNames];
      const tx = db.transaction(['photos', 'photoThumbs'], 'readonly');
      const a = tx.objectStore('photos').get(['t1', 'photo-1']);
      const b = tx.objectStore('photoThumbs').get(['t1', 'photo-1']);
      tx.oncomplete = () => {
        resolve({
          names, version: db.version,
          displayIsArrayBuffer: a.result instanceof ArrayBuffer,
          thumbIsArrayBuffer: b.result instanceof ArrayBuffer,
          displayBytes: a.result ? a.result.byteLength : null,
          thumbBytes: b.result ? b.result.byteLength : null,
        });
        db.close();
      };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });

  await port.delete('t1');
  const after = [
    ...(await photos.present('t1', ['photo-1', 'photo-2'])),
    ...(await photos.present('t2', ['photo-orphan'])),
  ];
  const docAfter = await port.load('t1');

  return {
    savedOk: saved.ok === true,
    before: before.sort(),
    after: after.sort(),
    readBackLength: readBack ? readBack.length : null,
    readBackIsUint8: readBack instanceof Uint8Array,
    missingIsNull: missing === null,
    docAfter,
    raw,
  };
}, { thumb: derived ? derived.thumbBytes : [1, 2, 3], display: derived ? derived.displayBytes : [4, 5, 6, 7] });

ok(storage.savedOk, 'a v2 document with two photos saved through the shipped storage port');
ok(storage.raw.version === DB_VERSION, 'the real database opened at the port\'s DB_VERSION', storage.raw);
ok(storage.raw.names.includes('photos') && storage.raw.names.includes('photoThumbs'),
  'the `photos` and `photoThumbs` stores exist in the SAME database as `docs`', storage.raw.names);
ok(storage.raw.displayIsArrayBuffer && storage.raw.thumbIsArrayBuffer,
  'both derivatives persist as bare ArrayBuffers, not Blobs (§10.3)', storage.raw);
ok(storage.raw.displayBytes > storage.raw.thumbBytes,
  'the display derivative really is the larger of the two in storage', storage.raw);
ok(storage.readBackIsUint8 && storage.readBackLength === storage.raw.displayBytes,
  'read() hands back a Uint8Array of exactly the stored length', storage);
ok(storage.missingIsNull, 'read() of an id that is not there is null, not a throw');
ok(storage.before.join() === 'photo-1,photo-2,photo-orphan', 'present() found all three before the delete', storage.before);
ok(storage.after.join() === 'photo-orphan',
  'deleting the trip removed BOTH of its photos\' byte records — one key-range delete, in the same '
    + 'transaction as the document (§10 A-62) — and left the OTHER trip\'s record alone',
  { after: storage.after });
ok(storage.docAfter === null, 'the document itself is gone');

await browser.close();
server.close();
console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}${FAULT === null ? '' : `  (fault: ${FAULT})`}`);
process.exit(0);
