/**
 * QA round 68 — a source-side reader for the cached pinned GeoNames dump.
 *
 * Round 68's subject (A-93 clause 4) is a predicate over `allCountries.txt` columns 7, 8, 9, 10
 * and 11. Every round before this one measured the corpus; the sixteen refusals can only be
 * falsified from the SOURCE, because the refused rows are precisely the ones the corpus no
 * longer contains. This streams the pinned zip once (~2 min) and caches the rows that can
 * possibly matter to a scratch JSONL, so every later probe is offline and instant.
 *
 * Cached rows: every `ISL`/`ISLS` row, and every class-`P` row with a non-empty `cc2`.
 * That is a superset of clause 4's input by construction — clause 4 reads no other population.
 *
 * Writes ONLY to `$CAIRN_R68_CACHE` (default `$TMPDIR/cairn-r68`), never to the repo.
 *
 *   node qa/r68-source.mjs            # build/refresh the cache, print counts
 *   import { sourceRows } from './r68-source.mjs'
 */
import { createReadStream, openSync, readSync, closeSync, statSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createInflateRaw } from 'node:zlib';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const SRC = process.env.CAIRN_GAZETTEER_CACHE ?? '/tmp/cairn-gazetteer-src';
export const CACHE = process.env.CAIRN_R68_CACHE ?? join(tmpdir(), 'cairn-r68');
const OUT = join(CACHE, 'src-rows.jsonl');

/** Locate a deflated entry inside a (possibly ZIP64) archive — same technique the generator uses. */
function zipEntry(path, wanted) {
  const fd = openSync(path, 'r');
  try {
    const size = statSync(path).size;
    const tailLen = Math.min(size, 66 * 1024);
    const tail = Buffer.alloc(tailLen);
    readSync(fd, tail, 0, tailLen, size - tailLen);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i -= 1) if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error(`${path}: no EOCD`);
    let count = tail.readUInt16LE(eocd + 10);
    let cdSize = tail.readUInt32LE(eocd + 12);
    let cdOff = tail.readUInt32LE(eocd + 16);
    if (cdOff === 0xffffffff || cdSize === 0xffffffff || count === 0xffff) {
      let loc = -1;
      for (let i = eocd - 20; i >= 0; i -= 1) if (tail.readUInt32LE(i) === 0x07064b50) { loc = i; break; }
      if (loc < 0) throw new Error(`${path}: ZIP64 sizes with no locator`);
      const z64 = Buffer.alloc(56);
      readSync(fd, z64, 0, 56, Number(tail.readBigUInt64LE(loc + 8)));
      count = Number(z64.readBigUInt64LE(32));
      cdSize = Number(z64.readBigUInt64LE(40));
      cdOff = Number(z64.readBigUInt64LE(48));
    }
    const cd = Buffer.alloc(cdSize);
    readSync(fd, cd, 0, cdSize, cdOff);
    let at = 0;
    for (let i = 0; i < count; i += 1) {
      const nameLen = cd.readUInt16LE(at + 28);
      const extraLen = cd.readUInt16LE(at + 30);
      const commentLen = cd.readUInt16LE(at + 32);
      let compressed = cd.readUInt32LE(at + 20);
      let localOff = cd.readUInt32LE(at + 42);
      let uncompressed = cd.readUInt32LE(at + 24);
      const name = cd.subarray(at + 46, at + 46 + nameLen).toString('utf8');
      if (uncompressed === 0xffffffff || compressed === 0xffffffff || localOff === 0xffffffff) {
        const extra = cd.subarray(at + 46 + nameLen, at + 46 + nameLen + extraLen);
        let e = 0;
        while (e + 4 <= extra.length) {
          const tag = extra.readUInt16LE(e); const len = extra.readUInt16LE(e + 2);
          if (tag === 0x0001) {
            let o = e + 4;
            if (uncompressed === 0xffffffff) { uncompressed = Number(extra.readBigUInt64LE(o)); o += 8; }
            if (compressed === 0xffffffff) { compressed = Number(extra.readBigUInt64LE(o)); o += 8; }
            if (localOff === 0xffffffff) { localOff = Number(extra.readBigUInt64LE(o)); o += 8; }
          }
          e += 4 + len;
        }
      }
      if (name === wanted) {
        const lh = Buffer.alloc(30);
        readSync(fd, lh, 0, 30, localOff);
        return { dataOff: localOff + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28), compressed };
      }
      at += 46 + nameLen + extraLen + commentLen;
    }
    throw new Error(`${path}: no entry ${wanted}`);
  } finally { closeSync(fd); }
}

export function eachLine(path, entry, onLine) {
  const { dataOff, compressed } = zipEntry(path, entry);
  return new Promise((res, rej) => {
    const s = createReadStream(path, { start: dataOff, end: dataOff + compressed - 1, highWaterMark: 1 << 22 })
      .pipe(createInflateRaw({ chunkSize: 1 << 22 }));
    let tail = '';
    s.setEncoding('utf8');
    s.on('data', (chunk) => {
      const lines = (tail + chunk).split('\n');
      tail = lines.pop();
      for (const line of lines) if (line !== '') onLine(line);
    });
    s.on('end', () => { if (tail !== '') onLine(tail); res(); });
    s.on('error', rej);
  });
}

/**
 * Every source row that clause 4 could possibly read, cached.
 * Columns (0-based): 0 id, 1 name, 2 asciiname, 3 alternatenames, 4 lat, 5 lng,
 * 6 fclass, 7 fcode, 8 cc, 9 cc2, 10 admin1, 14 population.
 */
export async function sourceRows({ rebuild = false } = {}) {
  if (!rebuild && existsSync(OUT)) {
    return readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  }
  mkdirSync(CACHE, { recursive: true });
  const rows = [];
  let total = 0;
  await eachLine(join(SRC, 'allCountries.zip'), 'allCountries.txt', (line) => {
    total += 1;
    const f = line.split('\t');
    const cls = f[6], code = f[7], cc2 = f[9];
    const terrain = code === 'ISL' || code === 'ISLS';
    if (!terrain && !(cls === 'P' && cc2 !== '')) return;
    rows.push({
      gid: Number(f[0]), name: f[1], lat: Number(f[4]), lng: Number(f[5]),
      cls, code, cc: f[8], cc2, admin1: f[10], pop: Number(f[14] || 0),
    });
  });
  writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return Object.assign(rows, { total });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = await sourceRows({ rebuild: process.argv.includes('--rebuild') });
  const terrain = rows.filter((r) => r.code === 'ISL' || r.code === 'ISLS');
  console.log(`cache      ${OUT}`);
  console.log(`rows       ${rows.length}`);
  console.log(`  ISL/ISLS ${terrain.length} (${terrain.filter((r) => r.cc2 !== '').length} with cc2)`);
  console.log(`  P w/ cc2 ${rows.length - terrain.length}`);
  if (rows.total) console.log(`source lines ${rows.total}`);
}
