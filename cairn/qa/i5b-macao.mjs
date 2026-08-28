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
import { countryIndex } from '../packages/core/src/geo/countryIndex.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const DROPS = JSON.parse(readFileSync(resolve(CAIRN, 'fixtures/golden/forgiveness-drops.json'), 'utf8'));
const at = new Set(DROPS.forgivenessAt);
const entries = COUNTRY_INDEX.countries;

/** The index exactly as it shipped before I-5b, reconstructed from the recorded positions. */
const OLD = countryIndex({
  scale: 'ne_110m+10m',
  source: 'pre-I-5b, reconstructed by removing the 54 forgiveness entries',
  countries: entries.filter((_, i) => !at.has(i)),
});

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

console.log('\n§1  A-27 Part 4 filter 2 names "every bordered filled code". MO is bordered and absent.');
const filter2Codes = [...new Set(DROPS.drops.filter((d) => d.filter === 2).map((d) => d.code))].sort();
note(`filter 2 rejected: ${filter2Codes.join(' ')}`);
note('MO — Macao — has a land border with Zhuhai, Guangdong, PRC, and is not on that list.');
ok(DROPS.codes.includes('MO'), 'MO was ADMITTED a forgiveness entry', `${DROPS.codes.includes('MO')}`);

console.log('\n§2  The ground that entry claims, as the 1:10m layer — the layer the fill uses — draws it');
const mo = entries.filter((e, i) => at.has(i) && e.code === 'MO')[0];
note(`MO forgiveness entry: ${mo.rings.length} ring, box ${mo.box.map((n) => n.toFixed(4)).join(', ')}`);
const [x0, y0, x1, y1] = mo.box;
const N = 400;
let cn = 0;
let cnNowMO = 0;
let cnWasNull = 0;
for (let i = 0; i <= N; i++) {
  for (let j = 0; j <= N; j++) {
    const lng = x0 + ((x1 - x0) * i) / N;
    const lat = y0 + ((y1 - y0) * j) / N;
    if (!inSet(lng, lat, raw.get('CN'))) continue;
    cn++;
    const before = countryOf({ lat, lng }, OLD);
    if (countryOf({ lat, lng }, COUNTRY_INDEX) === 'MO') {
      cnNowMO++;
      if (before === null) cnWasNull++;
    }
  }
}
// Cell area, at ~22.2 N.
const cellKm2 = (((x1 - x0) / N) * 111.32 * Math.cos((22.2 * Math.PI) / 180)) * (((y1 - y0) / N) * 110.57);
note(`${cn} sample cells inside CN at 1:10m fall in MO's forgiveness box; ${cnNowMO} of them now answer MO`);
note(`≈ ${(cnNowMO * cellKm2).toFixed(1)} km² of Chinese mainland attributes to MO — against Macao's own ~33 km²`);
note(`${cnWasNull} of those ${cnNowMO} were null before I-5b, which is why every "country → another country" sweep passes`);
ok(cnNowMO === 0, 'no ground the 1:10m layer calls China attributes to MO', `${cnNowMO} cells do`);

console.log('\n§3  Named coordinates, before and after');
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
  'Zhuhai Nanping — Chinese mainland at 1:10m — is still null after I-5b',
  `it is ${countryOf({ lat: 22.221, lng: 113.503 }, COUNTRY_INDEX)}`,
);

console.log('\n§4  Why filter 2 missed it: CN is drawn at 1:110m in the coverage index');
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
note('The 1:110m China polygon does not reach the Macao border at all, so filter 2 had nothing to');
note('compare against. Had CN been a *filled* code — drawn at 1:10m — the ring would have been');
note('rejected exactly as HK\'s three rings were.');

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`}\n`);
process.exit(0);
