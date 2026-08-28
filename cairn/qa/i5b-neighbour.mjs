/**
 * QA round 23 — the two filters attacked with data the filters never saw.
 *
 * A-27 Part 4's filter 2 asks "does this candidate ring overlap any OTHER entry of the
 * **coverage-only index**?" — and 175 of those 239 entries are drawn at **1:110m**, the coarsest
 * layer in the pinned family. So the question the filter actually answers is *"does this ring
 * reach a neighbour as the 1:110m layer draws them"*, not *"does this ring reach a neighbour"*.
 * This probe re-asks it against the **1:10m** layer — the finest one, the one the fill itself
 * uses — for every one of the 141 rings filter 2 admits (142 before I-5c refused MO's).
 *
 * Filter 1 gets the mirror attack: the two rings it dropped are checked against the *raw* layers
 * to see whether the drop refused a genuine piece of that country's territory.
 *
 * NEEDS THE NETWORK (three pinned Natural Earth layers, ~17 MB, checksums verified). Prints SKIP
 * rather than a false pass if the fetch is blocked. Run from `cairn/`:
 *
 *   node --experimental-strip-types qa/i5b-neighbour.mjs
 *
 * A "FAIL" line means the probe found what it was looking for.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';

import { COUNTRY_INDEX } from '../packages/core/src/index.ts';
import { overlapsRings, prepRing, prepSet, overlaps } from '../tools/forgiveness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const DROPS = JSON.parse(readFileSync(resolve(CAIRN, 'fixtures/golden/forgiveness-drops.json'), 'utf8'));

const PINS = {
  '110m': { bytes: 838726, sha: '6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f' },
  '50m': { bytes: 3083490, sha: '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb' },
  '10m': { bytes: 13287234, sha: '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255' },
};
const CACHE = resolve(tmpdir(), 'cairn-qa-ne');

let fails = 0;
let checks = 0;
const ok = (cond, label, detail = '') => {
  checks++;
  console.log(`  ${cond ? 'OK  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!cond) fails++;
};
const note = (s) => console.log(`        ${s}`);

async function layer(key) {
  mkdirSync(CACHE, { recursive: true });
  const path = resolve(CACHE, `ne_${key}_admin_0_countries.geojson`);
  let buf;
  if (existsSync(path)) buf = readFileSync(path);
  else {
    const url = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_${key}_admin_0_countries.geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(path, buf);
  }
  const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== PINS[key].sha || buf.length !== PINS[key].bytes) {
    console.log(`  SKIP  ${key}: checksum does not match the generator's pin — refusing to reason from it`);
    return null;
  }
  return JSON.parse(buf.toString('utf8'));
}

/** The generator's own quantisation, reproduced: 4 dp, degenerate rings dropped. */
const DECIMALS = 4;
const q = (n) => Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS;
function ringsByCode(geo) {
  const out = new Map();
  for (const f of geo.features) {
    const code = f.properties.ISO_A2_EH;
    if (!(typeof code === 'string' && /^[A-Z]{2}$/.test(code))) continue;
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const list = out.get(code) ?? [];
    for (const poly of polys) {
      for (const ring of poly) {
        const flat = [];
        let px = null;
        let py = null;
        for (const [lng, lat] of ring) {
          const x = q(lng);
          const y = q(lat);
          if (x === px && y === py) continue;
          flat.push(x, y);
          px = x;
          py = y;
        }
        while (flat.length >= 4 && flat[0] === flat[flat.length - 2] && flat[1] === flat[flat.length - 1]) flat.length -= 2;
        if (flat.length < 6) continue;
        list.push(flat);
      }
    }
    out.set(code, list);
  }
  return out;
}

const g10 = await layer('10m');
const g50 = await layer('50m');
const g110 = await layer('110m');
if (!g10 || !g50 || !g110) {
  console.log('\nSKIP — the pinned layers are not reachable; nothing is asserted.\n');
  process.exit(0);
}

const fine = ringsByCode(g10);
const mid = ringsByCode(g50);
const coarse = ringsByCode(g110);
note(`1:10m carries ${fine.size} codes, 1:50m ${mid.size}, 1:110m ${coarse.size}`);

const entries = COUNTRY_INDEX.countries;
const at = new Set(DROPS.forgivenessAt);
const coverage = entries.filter((_, i) => !at.has(i));
const forgiven = entries.filter((_, i) => at.has(i));

// ------------------------------------------------------------------ §1 filter 2's blind spot

console.log('\n§1  Filter 2 asked the 1:110m base. Ask the 1:10m layer instead.');
console.log('    For every one of the 141 ADMITTED forgiveness rings: does it reach ground that the');
console.log('    finest layer says belongs to another ISO code?');

const finePrep = new Map();
for (const [code, rings] of fine) finePrep.set(code, prepSet(rings));

let admitted = 0;
const encroach = [];
for (const e of forgiven) {
  for (const ring of e.rings) {
    admitted++;
    const R = prepRing(ring.slice());
    for (const [code, S] of finePrep) {
      if (code === e.code) continue;
      if (overlaps(R, S)) encroach.push({ code: e.code, other: code, box: R.box });
    }
  }
}
// I-5c (A-28): 142 -> 141. The ring that left is MO's, and §1's `MO->CN at 1:10m` line — this
// probe's own R23-1 finding — is green as a result. That is the closure, measured by the probe
// that filed it.
ok(admitted === 141, 'all 141 admitted rings tested', `${admitted}`);
ok(
  encroach.length === 0,
  'no admitted forgiveness ring reaches another country as the 1:10m layer draws it',
  encroach.map((x) => `${x.code}→${x.other}`).join(' '),
);
for (const x of encroach.slice(0, 20)) {
  note(
    `${x.code} forgiveness ring overlaps ${x.other} at 1:10m; box ` +
      `${(x.box[0] / 1e4).toFixed(3)},${(x.box[1] / 1e4).toFixed(3)}..${(x.box[2] / 1e4).toFixed(3)},${(x.box[3] / 1e4).toFixed(3)}`,
  );
}

// And the same at 1:50m — the layer the forgiveness rings themselves come from, which is the
// scale at which "this ring is my neighbour's" is a same-scale question rather than a mixed one.
const midPrep = new Map();
for (const [code, rings] of mid) midPrep.set(code, prepSet(rings));
const encroach50 = [];
for (const e of forgiven) {
  for (const ring of e.rings) {
    const R = prepRing(ring.slice());
    for (const [code, S] of midPrep) {
      if (code === e.code) continue;
      if (overlaps(R, S)) encroach50.push(`${e.code}→${code}`);
    }
  }
}
ok(encroach50.length === 0, 'no admitted forgiveness ring overlaps another code at its OWN 1:50m scale', [...new Set(encroach50)].join(' '));

// ------------------------------------------------------------------ §2 the codes with no coverage overlap at all

console.log('\n§2  A sharper version: does an admitted ring cover a populated place of another country?');
console.log('    (Natural Earth admin-0 alone cannot answer "is this sea"; a settlement can.)');

const pp = await (async () => {
  const url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_populated_places.geojson';
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return JSON.parse(Buffer.from(await res.arrayBuffer()).toString('utf8'));
  } catch {
    return null;
  }
})();
if (!pp) {
  console.log('  SKIP  ne_10m_populated_places is not reachable');
} else {
  const insideEntry = (lng, lat, rings) => {
    let inside = false;
    for (const ring of rings) {
      const n = ring.length;
      if (n < 6) continue;
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
  let wrongPlace = 0;
  let placesInForgiveness = 0;
  const wrong = [];
  for (const f of pp.features) {
    const [lng, lat] = f.geometry.coordinates;
    const iso = f.properties.ISO_A2 ?? f.properties.ADM0_A3;
    for (const e of forgiven) {
      if (lng < e.box[0] || lng > e.box[2] || lat < e.box[1] || lat > e.box[3]) continue;
      if (!insideEntry(lng, lat, e.rings)) continue;
      placesInForgiveness++;
      if (typeof iso === 'string' && /^[A-Z]{2}$/.test(iso) && iso !== e.code) {
        wrongPlace++;
        if (wrong.length < 20) wrong.push(`${f.properties.NAME} (${iso}) falls inside ${e.code}'s forgiveness entry`);
      }
    }
  }
  note(`${placesInForgiveness} Natural Earth populated places fall inside a forgiveness entry`);
  ok(wrongPlace === 0, 'no populated place of another country falls inside a forgiveness entry', `${wrongPlace}`);
  for (const w of wrong) note(w);
}

// ------------------------------------------------------------------ §3 filter 1's two drops

console.log('\n§3  Filter 1 dropped two rings. Was either a genuine piece of that country?');

for (const d of DROPS.drops.filter((x) => x.filter === 1)) {
  const cov = coverage.find((e) => e.code === d.code);
  const R = prepRing(d.ring);
  const box = R.box.map((n) => n / 1e4);
  note(`--- ${d.code}: dropped 1:50m ring, box ${box[0].toFixed(4)},${box[1].toFixed(4)}..${box[2].toFixed(4)},${box[3].toFixed(4)}`);
  note(`    ${d.code}'s coverage entry (1:10m) has ${cov.rings.length} rings, box ${cov.box.map((n) => n.toFixed(4)).join(',')}`);
  // Nearest coverage ring, by box-to-box distance in degrees.
  let best = Infinity;
  let bestBox = null;
  for (const r of cov.rings) {
    const b = prepRing(r.slice()).box.map((n) => n / 1e4);
    const dx = Math.max(0, Math.max(box[0] - b[2], b[0] - box[2]));
    const dy = Math.max(0, Math.max(box[1] - b[3], b[1] - box[3]));
    const dist = Math.hypot(dx, dy);
    if (dist < best) {
      best = dist;
      bestBox = b;
    }
  }
  note(`    nearest own 1:10m ring is ${best.toFixed(4)}° (~${(best * 111).toFixed(1)} km) away, box ${bestBox.map((n) => n.toFixed(4)).join(',')}`);
  // Does the RAW (unquantised) 1:50m ring touch the RAW 1:10m rings? i.e. is the drop an artefact
  // of quantisation, or is the coarse polygon genuinely somewhere else?
  const rawTouch = overlapsRings(d.ring, fine.get(d.code) ?? []);
  ok(rawTouch === false, `${d.code}: the drop is not a quantisation artefact — the 1:50m ring misses every 1:10m ring of ${d.code}`, `overlaps=${rawTouch}`);
  // What does the shipped index say about the ground the dropped ring covers?
  const cx = (box[0] + box[2]) / 2;
  const cy = (box[1] + box[3]) / 2;
  const anyOther = [];
  for (const [code, S] of finePrep) if (code !== d.code && overlaps(R, S)) anyOther.push(code);
  note(`    at 1:10m the dropped ring's ground belongs to: ${anyOther.join(' ') || 'nobody (open water / no admin-0 polygon)'}`);
  note(`    its centre (${cy.toFixed(4)}, ${cx.toFixed(4)}) is ${anyOther.length ? 'contested' : 'sea at the finest scale'}`);
}

// ------------------------------------------------------------------ §4 the codes the pass never reached

console.log('\n§4  The 11 refused codes and the 2 with no 1:50m polygon');
ok(
  DROPS.noCandidates.every((c) => !mid.has(c)),
  'GI and UM genuinely have no 1:50m polygon in the pinned layer',
  DROPS.noCandidates.map((c) => `${c}:${mid.has(c) ? 'PRESENT' : 'absent'}`).join(' '),
);
const filledCodes = DROPS.codes.concat(DROPS.refusedCodes);
ok(filledCodes.length === 64, '64 filled codes accounted for', `${filledCodes.length}`);
const missingAt50 = filledCodes.filter((c) => !mid.has(c));
ok(
  missingAt50.length === 2 && missingAt50.sort().join(' ') === 'GI UM',
  'exactly two filled codes are absent from 1:50m',
  missingAt50.join(' '),
);
// The 1:110m layer carries none of the filled codes — A-27 Part 3 property 4, asserted.
const filledAt110 = filledCodes.filter((c) => coarse.has(c));
ok(filledAt110.length === 0, 'the 1:110m layer carries none of the 64 filled codes (A-27 Part 3 property 4)', filledAt110.join(' '));

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`} — ${checks} checks, ${fails} failed\n`);
process.exit(0);
