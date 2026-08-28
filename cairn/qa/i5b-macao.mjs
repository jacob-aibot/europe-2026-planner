/**
 * QA round 23 — **R23-1**, isolated and measured.
 *
 * A-27 Part 4 filter 2: *"Keep a surviving ring only if `overlaps(ring, E.rings)` is false for
 * every other entry `E` of the coverage-only index."* 175 of those 239 entries are drawn at
 * **1:110m**. `CN` is one of them. So the question filter 2 actually answered for Macao's 1:50m
 * ring was *"does this reach China as the 1:110m layer draws China"* — and the 1:110m coastline
 * near the Pearl River delta is generalised far enough inland that the answer was no.
 *
 * A-27 Part 4 names the codes filter 2 rejected as *"`AD`, `HK`, `LI`, `MC`, `SG`, `SM` and `SX`
 * — i.e. every bordered filled code"*. **`MO` is a bordered filled code and is not on that list.**
 * A-27 Part 5 and BUILD-NOTES both assert *"Zhuhai across the border is still `null`"*; that is
 * true of the coordinate they spot-checked and false a few kilometres away.
 *
 * **Round 24: R23-1 is CLOSED, and this probe is now its regression guard.** ARCHITECTURE §8.4
 * **A-28** gave filter 2 a second arm — 2b, against every neighbour's drawing at the pinned
 * family's *finest* scale — and it refuses `MO[0]`, the only ring in the whole pass it refuses.
 * Every assertion below is inverted accordingly: the ground this probe measured as wrongly
 * attributed is measured again, against the **I-5b artefact** (`git show 38d23c9:…`) as the
 * "before", and must now answer `null`. If `MO` ever regains a forgiveness entry this file goes
 * red again, which is the point of keeping it.
 *
 * NEEDS THE NETWORK (the pinned 1:10m layer). Prints SKIP if it is blocked. Run from `cairn/`:
 *
 *   node --experimental-strip-types qa/i5b-macao.mjs
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { COUNTRY_INDEX } from '../packages/core/src/index.ts';
import { countryOf } from '../packages/core/src/derive/country.ts';
import { countryIndex, decodeCountryIndex } from '../packages/core/src/geo/countryIndex.ts';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const DROPS = JSON.parse(readFileSync(resolve(CAIRN, 'fixtures/golden/forgiveness-drops.json'), 'utf8'));
const at = new Set(DROPS.forgivenessAt);
const entries = COUNTRY_INDEX.countries;

/** The index exactly as it shipped before I-5b, reconstructed from the recorded positions. */
const PRE = countryIndex({
  scale: 'ne_110m+10m',
  source: 'pre-I-5b, reconstructed by removing the 53 forgiveness entries',
  countries: entries.filter((_, i) => !at.has(i)),
});

/** The I-5b artefact — the one that carried the defect. This is the "before" everything below is
 *  measured against, because the ground R23-1 named is ground only I-5b ever attributed to MO. */
const I5BSRC = execFileSync('git', ['show', '38d23c9:cairn/packages/core/src/geo/countries.gen.ts'], {
  cwd: resolve(CAIRN, '..'),
  maxBuffer: 64 * 1024 * 1024,
}).toString('utf8');
const OLD = decodeCountryIndex(
  { scale: 'I-5b', source: 'git show 38d23c9 — the artefact R23-1 was filed against' },
  /'(\[\[".*\]\])'/s.exec(I5BSRC)[1],
);

let fails = 0;
const ok = (cond, label, detail = '') => {
  console.log(`  ${cond ? 'OK  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!cond) fails++;
};
const note = (s) => console.log(`        ${s}`);

const PIN = { bytes: 13287234, sha: '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255' };
const CACHE = resolve(tmpdir(), 'cairn-qa-ne');
const path = resolve(CACHE, 'ne_10m_admin_0_countries.geojson');
let buf = null;
if (existsSync(path)) buf = readFileSync(path);
else {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson',
    );
    if (res.ok) {
      buf = Buffer.from(await res.arrayBuffer());
      mkdirSync(CACHE, { recursive: true });
      writeFileSync(path, buf);
    }
  } catch {
    buf = null;
  }
}
if (!buf || createHash('sha256').update(buf).digest('hex') !== PIN.sha || buf.length !== PIN.bytes) {
  console.log('\nSKIP — the pinned 1:10m layer is not reachable or does not match the pin.\n');
  process.exit(0);
}
const geo = JSON.parse(buf.toString('utf8'));
const raw = new Map();
for (const f of geo.features) {
  const c = f.properties.ISO_A2_EH;
  if (!(typeof c === 'string' && /^[A-Z]{2}$/.test(c))) continue;
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const l = raw.get(c) ?? [];
  for (const p of polys) for (const r of p) l.push(r.flat());
  raw.set(c, l);
}
const inSet = (lng, lat, rs) => {
  let inside = false;
  for (const ring of rs) {
    const n = ring.length;
    let jx = ring[n - 2];
    let jy = ring[n - 1];
    let c = false;
    for (let i = 0; i + 1 < n; i += 2) {
      const ix = ring[i];
      const iy = ring[i + 1];
      if (iy > lat !== jy > lat) {
        const x = ((jx - ix) * (lat - iy)) / (jy - iy) + ix;
        if (lng < x) c = !c;
      }
      jx = ix;
      jy = iy;
    }
    if (c) inside = !inside;
  }
  return inside;
};

console.log('\n§1  A-27 Part 4 filter 2 named "every bordered filled code" and was short by MO. A-28 fixed it.');
const filter2Codes = [...new Set(DROPS.drops.filter((d) => d.filter === 2).map((d) => d.code))].sort();
note(`filter 2 rejected: ${filter2Codes.join(' ')}`);
note('MO — Macao — has a land border with Zhuhai, Guangdong, PRC, and is now on that list.');
ok(!DROPS.codes.includes('MO'), 'MO is REFUSED a forgiveness entry — R23-1 closed', `admitted: ${DROPS.codes.includes('MO')}`);
const moDrop = DROPS.drops.find((d) => d.code === 'MO');
ok(
  moDrop != null && moDrop.filter === 2 && moDrop.against === 'finest' && moDrop.takenFrom === 'CN',
  'and it is arm 2b that refused it, naming CN — the arm A-28 Part 3 added for exactly this',
  moDrop ? `${moDrop.filter}${moDrop.against} / ${moDrop.takenFrom}` : 'no MO drop',
);

console.log('\n§2  The ground that entry CLAIMED at I-5b, as the 1:10m layer draws it');
// From the I-5b artefact, because the shipped one no longer carries it. Two MO entries there: the
// forgiveness one is the one whose rings are not the coverage rings.
const moShipped = JSON.stringify(entries.find((e) => e.code === 'MO').rings);
const mo = OLD.countries.filter((e) => e.code === 'MO' && JSON.stringify(e.rings) !== moShipped)[0];
note(`MO forgiveness entry: ${mo.rings.length} ring, box ${mo.box.map((n) => n.toFixed(4)).join(', ')}`);
const [x0, y0, x1, y1] = mo.box;
const N = 400;
let cn = 0;
let cnNowMO = 0;
let cnWasNull = 0;
// Round 25: the same sweep, without the "inside CN at 1:10m" restriction, so the two numbers on
// record for this ground can be compared as the two different quantities they are. See below.
let lostAll = 0;
let lostNeither = 0;
let lostToCountry = 0;
for (let i = 0; i <= N; i++) {
  for (let j = 0; j <= N; j++) {
    const lng = x0 + ((x1 - x0) * i) / N;
    const lat = y0 + ((y1 - y0) * j) / N;
    const wasMO = countryOf({ lat, lng }, OLD) === 'MO';
    const isMO = countryOf({ lat, lng }, COUNTRY_INDEX) === 'MO';
    const inCN = inSet(lng, lat, raw.get('CN'));
    if (wasMO && !isMO) {
      lostAll++;
      if (countryOf({ lat, lng }, COUNTRY_INDEX) !== null) lostToCountry++;
      if (!inCN && !inSet(lng, lat, raw.get('MO'))) lostNeither++;
    }
    if (!inCN) continue;
    cn++;
    if (wasMO) {
      cnWasNull++;
      if (isMO) cnNowMO++;
    }
  }
}
// Cell area, at ~22.2 N.
const cellKm2 = (((x1 - x0) / N) * 111.32 * Math.cos((22.2 * Math.PI) / 180)) * (((y1 - y0) / N) * 110.57);
note(`${cn} sample cells inside CN at 1:10m fall in MO's I-5b forgiveness box`);
note(`at I-5b, ${cnWasNull} of them answered MO — ≈ ${(cnWasNull * cellKm2).toFixed(1)} km² of Chinese mainland`);
note(`in the shipped index, ${cnNowMO} of them do — and every one of those cells is also null in the PRE-I-5b index`);
ok(cnNowMO === 0, 'no ground the 1:10m layer calls China attributes to MO', `${cnNowMO} cells do`);
ok(cnWasNull > 0, 'the defect this probe was written for was real and is measured here, not asserted', `${cnWasNull} cells`);

/**
 * **Round 25 — the other half of the 22.6-vs-22.1 reconciliation** (`qa/i5c-sweep.mjs` §4 has the
 * shoelace half). The two figures on record are not two measurements of one quantity and there is
 * no measurement error between them:
 *
 *   • **22.1 km²** — round 24 and A-28: the ground **the 1:10m layer calls China** that stopped
 *     answering `MO`. That is the line immediately above, and it is the number R23-1 is *about*.
 *   • **22.6 km²** — BUILD-NOTES: **all** ground that stopped answering `MO`, whatever the 1:10m
 *     layer calls it.
 *
 * The difference is the part of the removed ring that the 1:10m layer attributes to neither `CN`
 * nor `MO` — Pearl-estuary water inside a coarse 1:50m coastline. Both are right; neither party
 * was measuring badly; the builder's "~2 % gap, unresolved" is this definition and nothing else.
 * Asserted rather than narrated, so a future round does not open it a third time.
 */
note(`without the "inside CN" restriction: ${lostAll} cells stopped answering MO — ≈ ${(lostAll * cellKm2).toFixed(2)} km²`);
note(`of those, ${cnWasNull} are CN at 1:10m (≈ ${(cnWasNull * cellKm2).toFixed(2)} km²) and ${lostNeither} are neither CN nor MO (≈ ${(lostNeither * cellKm2).toFixed(2)} km² of estuary)`);
ok(lostToCountry === 0, 'every cell that stopped answering MO answers null now, not another country', `${lostToCountry}`);
ok(
  lostAll === cnWasNull + lostNeither,
  'the 22.6 and 22.1 figures differ by exactly the non-CN part of the ring — a difference of question, not of method',
  `${lostAll} = ${cnWasNull} + ${lostNeither}`,
);
ok(
  lostNeither / lostAll > 0.01 && lostNeither / lostAll < 0.03,
  'and that part is the ~2 % the builder could not account for',
  `${((100 * lostNeither) / lostAll).toFixed(2)} %`,
);
{
  let differsFromPre = 0;
  for (let i = 0; i <= 60; i++)
    for (let j = 0; j <= 60; j++) {
      const lng = x0 + ((x1 - x0) * i) / 60;
      const lat = y0 + ((y1 - y0) * j) / 60;
      if (countryOf({ lat, lng }, PRE) !== countryOf({ lat, lng }, COUNTRY_INDEX)) differsFromPre++;
    }
  ok(differsFromPre === 0, 'over MO’s old box the shipped index and the PRE-I-5b index agree cell for cell', `${differsFromPre}`);
}

console.log('\n§3  Named coordinates — I-5b as "before", the shipped index as "after"');
const pts = {
  'Senado Square, Macao (MO)': [22.1936, 113.5397],
  'Zhuhai Nanping, Guangdong (CN)': [22.221, 113.503],
  'Zhuhai Wanzai, Guangdong (CN)': [22.2036, 113.5175],
  'Zhuhai city centre (CN)': [22.2707, 113.5767],
  'Zhuhai Jida (CN)': [22.256, 113.582],
};
for (const [name, [lat, lng]] of Object.entries(pts)) {
  const before = countryOf({ lat, lng }, OLD);
  const after = countryOf({ lat, lng }, COUNTRY_INDEX);
  const isCN = inSet(lng, lat, raw.get('CN'));
  const isMO = inSet(lng, lat, raw.get('MO'));
  console.log(
    `        ${name.padEnd(32)} before=${String(before).padEnd(5)} after=${String(after).padEnd(5)} ` +
      `1:10m says ${isCN ? 'CN' : isMO ? 'MO' : 'neither'}`,
  );
}
ok(
  countryOf({ lat: 22.221, lng: 113.503 }, COUNTRY_INDEX) === null,
  'Zhuhai Nanping — Chinese mainland at 1:10m — answers null again after I-5c',
  `it is ${countryOf({ lat: 22.221, lng: 113.503 }, COUNTRY_INDEX)}`,
);

console.log('\n§4  Why A-27’s ONE-ARM filter 2 missed it: CN is drawn at 1:110m in the coverage index');
const cnEntry = entries.find((e) => e.code === 'CN');
note(`CN's coverage entry has ${cnEntry.rings.length} rings — the 1:110m base (1:10m CN has ${raw.get('CN').length})`);
let inCoarse = 0;
let inFine = 0;
for (let i = 0; i <= 120; i++) {
  for (let j = 0; j <= 120; j++) {
    const lng = x0 + ((x1 - x0) * i) / 120;
    const lat = y0 + ((y1 - y0) * j) / 120;
    if (inSet(lng, lat, cnEntry.rings.map((r) => [...r]))) inCoarse++;
    if (inSet(lng, lat, raw.get('CN'))) inFine++;
  }
}
note(`inside MO's forgiveness box: ${inCoarse} cells are CN at 1:110m, ${inFine} at 1:10m (of ${121 * 121})`);
note('The 1:110m China polygon does not reach the Macao border at all, so ARM 2A had nothing to');
note('compare against — and it still has nothing. What refuses the ring is ARM 2B, which asks CN');
note('at 1:10m regardless of the scale CN\'s own coverage entry is drawn at (A-28 Part 3).');
note('Note that arm 2a is NOT redundant: it is what refuses HK[1], HK[2] and SG[0], which arm 2b');
note('passes. See qa/i5c-filter2.mjs §2 for the census.');

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`}\n`);
process.exit(0);
