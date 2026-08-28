/**
 * QA round 22 — I-5 / I-5a: the mixed-resolution country index, offline half.
 *
 *   cd cairn && node --experimental-strip-types qa/i5-order.mjs
 *
 * Everything here runs from the committed artefact and `git show 897b928:…`. No network.
 * The network half — the fill-scale measurement and the `country-holes.json` re-derivation
 * against raw Natural Earth — is `qa/i5-fillscale.mjs`.
 *
 * A "FAIL" line means the probe found what it was looking for. Read the finding in
 * `../docs/QA-FINDINGS.md` before assuming the script is broken.
 *
 * Sections:
 *   §1  the emitted order, re-derived with a DIFFERENT area formula than the generator's
 *   §2  the generator's ordering determinism — total order, ties, permutation-invariance
 *   §3  the structural non-regression proof: the 175 base entries are byte-identical
 *   §4  a global grid sweep at MY parameters (0.31°, offset 0.07), not the builder's 0.25°
 *   §5  double coverage: every pair of countries that claims the same ground, and who wins
 *   §6  ray-casting correctness: reversed-ray cross-check, holes, antimeridian, poles, hygiene
 *   §7  KD-52 — the Vatican sliver, mapped rather than asserted
 *   §8  the budget test's two structural guards, and how much headroom they have
 */
import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const REPO = resolve(CAIRN, '..');

const { COUNTRY_INDEX: IX, countryOf } = await import(resolve(CAIRN, 'packages/core/src/index.ts'));

let fails = 0;
const ok = (cond, label, detail = '') => {
  if (!cond) fails++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};
const note = (label, detail = '') => console.log(`  ---- ${label}${detail ? ` — ${detail}` : ''}`);
const h = (s) => console.log(`\n== ${s} ==`);

// ---------------------------------------------------------------- shared geometry

const RAD = Math.PI / 180;

/**
 * Area, by a DIFFERENT route than `tools/gen-countries.mjs`'s Chamberlain–Duquette line
 * integral: the shoelace of the ring projected onto the Lambert cylindrical equal-area
 * projection (x = λ, y = sin φ). Proportional to true spherical area, so it induces the same
 * ordering — which is the point: if the two formulas agree on the order, the order is a
 * property of the polygons and not of one implementation.
 */
function ringAreaLCEA(r) {
  let s = 0;
  const n = r.length;
  let jx = r[n - 2] * RAD;
  let jy = Math.sin(r[n - 1] * RAD);
  for (let i = 0; i + 1 < n; i += 2) {
    const ix = r[i] * RAD;
    const iy = Math.sin(r[i + 1] * RAD);
    s += jx * iy - ix * jy;
    jx = ix;
    jy = iy;
  }
  return Math.abs(s / 2);
}
const areaOf = (c) => c.rings.reduce((t, r) => t + ringAreaLCEA(r), 0);

/** `derive/country.ts`'s ray cast, but toward −∞ longitude. Must agree on any simple ring. */
function oddLeft(lng, lat, r) {
  let inside = false;
  const n = r.length;
  let jx = r[n - 2];
  let jy = r[n - 1];
  for (let i = 0; i + 1 < n; i += 2) {
    const ix = r[i];
    const iy = r[i + 1];
    if (iy > lat !== jy > lat) {
      const x = ((jx - ix) * (lat - iy)) / (jy - iy) + ix;
      if (lng > x) inside = !inside;
    }
    jx = ix;
    jy = iy;
  }
  return inside;
}
const pickLeft = (lng, lat) => {
  for (const c of IX.countries) {
    const b = c.box;
    if (lng < b[0] || lng > b[2] || lat < b[1] || lat > b[3]) continue;
    let inside = false;
    for (const r of c.rings) if (oddLeft(lng, lat, r)) inside = !inside;
    if (inside) return c.code;
  }
  return null;
};

/** Point-in-entry, forward ray, box-rejected — the shipped semantics, per entry. */
function hasPoint(c, lng, lat) {
  const b = c.box;
  if (lng < b[0] || lng > b[2] || lat < b[1] || lat > b[3]) return false;
  let inside = false;
  for (const r of c.rings) {
    let ins = false;
    const n = r.length;
    let jx = r[n - 2];
    let jy = r[n - 1];
    for (let i = 0; i + 1 < n; i += 2) {
      const ix = r[i];
      const iy = r[i + 1];
      if (iy > lat !== jy > lat) {
        const x = ((jx - ix) * (lat - iy)) / (jy - iy) + ix;
        if (lng < x) ins = !ins;
      }
      jx = ix;
      jy = iy;
    }
    if (ins) inside = !inside;
  }
  return inside;
}

const boxOf = (rings) => {
  let a = Infinity;
  let b = Infinity;
  let c = -Infinity;
  let d = -Infinity;
  for (const r of rings)
    for (let i = 0; i + 1 < r.length; i += 2) {
      if (r[i] < a) a = r[i];
      if (r[i] > c) c = r[i];
      if (r[i + 1] < b) b = r[i + 1];
      if (r[i + 1] > d) d = r[i + 1];
    }
  return [a, b, c, d];
};

console.log(`index: ${IX.scale}  ${IX.countries.length} codes  ${IX.countries.reduce((n, c) => n + c.rings.length, 0)} rings`);

// ---------------------------------------------------------------- §1 the emitted order

h('§1 the emitted order — ascending area, re-derived with a different area formula');

const areas = IX.countries.map((c) => ({ code: c.code, a: areaOf(c) }));
const violations = [];
const ties = [];
for (let i = 1; i < areas.length; i++) {
  const p = areas[i - 1];
  const q = areas[i];
  const rel = Math.abs(q.a - p.a) / Math.max(p.a, q.a, 1e-30);
  if (q.a < p.a && rel > 1e-9) violations.push(`${p.code}(${p.a.toExponential(3)}) before ${q.code}(${q.a.toExponential(3)})`);
  if (rel <= 1e-9) ties.push(`${p.code}/${q.code}`);
}
ok(violations.length === 0, 'the shipped order is ascending summed absolute ring area', `${violations.length} violation(s) ${JSON.stringify(violations.slice(0, 5))}`);
ok(IX.countries[0].code === 'VA', 'the smallest entry is VA and it is tested first', `index 0 = ${IX.countries[0].code}`);
ok(IX.countries[IX.countries.length - 1].code === 'RU', 'the largest entry is RU and it is tested last', `index ${IX.countries.length - 1} = ${IX.countries[IX.countries.length - 1].code}`);
note('smallest eight', areas.slice(0, 8).map((x) => x.code).join(' '));
note('area ties (rel <= 1e-9), i.e. rows where the ISO tie-break decides', String(ties.length) + (ties.length ? ` ${JSON.stringify(ties)}` : ' — the tie-break is never exercised on this dataset'));

// ---------------------------------------------------------------- §2 ordering determinism

h('§2 the generator\'s ordering is deterministic — total order, permutation-invariant');

// `orderEntries`'s comparator, verbatim from tools/gen-countries.mjs.
const cmp = (a, b) => a.area - b.area || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
const withArea = IX.countries.map((c) => ({ code: c.code, area: areaOf(c) }));
const codes = withArea.map((x) => x.code);
ok(new Set(codes).size === codes.length, 'ISO codes are unique, so the comparator is a TOTAL order and Array.sort stability is irrelevant');

// seeded shuffle, so the run is reproducible
let seed = 20260828;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
let identical = true;
for (let trial = 0; trial < 20; trial++) {
  const shuffled = [...withArea];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const sorted = shuffled.sort(cmp).map((x) => x.code);
  if (sorted.join(',') !== codes.join(',')) identical = false;
}
ok(identical, '20 seeded permutations of the entry list re-sort to the committed order exactly');
ok(
  withArea.every((x) => Number.isFinite(x.area)),
  'no entry has a NaN/Infinity area, which would make the comparator return NaN and the sort order engine-defined',
);

// ---------------------------------------------------------------- §3 the structural non-regression

h('§3 structural non-regression — I-5a can only ADD polygons, so no answer can regress to null');

const oldSrc = execSync('git show 897b928:cairn/packages/core/src/geo/countries.gen.ts', { cwd: REPO, maxBuffer: 1e9 }).toString();
const oldRaw = JSON.parse(/const PACKED =\n\s*'([\s\S]*?)';/.exec(oldSrc)[1]);
const newRings = new Map(IX.countries.map((c) => [c.code, JSON.stringify(c.rings)]));
const changed = [];
const absent = [];
for (const [code, rings] of oldRaw) {
  const n = newRings.get(code);
  if (n === undefined) absent.push(code);
  else if (n !== JSON.stringify(rings)) changed.push(code);
}
ok(oldRaw.length === 175, 'the pre-I-5a module carried 175 codes', String(oldRaw.length));
ok(absent.length === 0, 'every pre-I-5a code is still in the index', JSON.stringify(absent));
ok(changed.length === 0, 'every pre-I-5a code\'s rings are BYTE-IDENTICAL — only the order moved', JSON.stringify(changed));
ok(IX.countries.length - oldRaw.length === 64, '64 codes were added and nothing was removed', String(IX.countries.length - oldRaw.length));
note(
  'therefore, structurally',
  'the set of countries containing any point is a SUPERSET of the pre-I-5a set, so `country -> null` is impossible and `country -> other country` can only happen where >1 country contains the point',
);

// ---------------------------------------------------------------- §4 the grid sweep

h('§4 global grid sweep at 0.31° / offset 0.07 — deliberately NOT the builder\'s 0.25°');

const OLD = {
  scale: 'ne_110m',
  source: '897b928',
  countries: [...oldRaw]
    .sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)) // pre-I-5a countryIndex() sorted by code
    .map(([code, rings]) => ({ code, rings, box: boxOf(rings) })),
};
let cells = 0;
let nullToC = 0;
let cToC = 0;
const regressions = [];
const upgrades = [];
for (let lat = -89.86; lat < 90; lat += 0.31) {
  for (let lng = -179.86; lng < 180; lng += 0.31) {
    cells++;
    const o = countryOf({ lat, lng }, OLD);
    const n = countryOf({ lat, lng }, IX);
    if (o === n) continue;
    if (o === null) nullToC++;
    else if (n === null) regressions.push([+lat.toFixed(3), +lng.toFixed(3), o]);
    else {
      cToC++;
      upgrades.push(`${o}->${n}`);
    }
  }
}
note('cells swept', String(cells));
ok(regressions.length === 0, 'ZERO cells go country -> null', JSON.stringify(regressions.slice(0, 5)));
note('cells null -> a country', String(nullToC));
note('cells a country -> another country', `${cToC} ${JSON.stringify([...new Set(upgrades)])}`);
ok(
  upgrades.every((u) => ['MY->SG', 'CN->HK', 'FR->AD', 'FR->MC', 'AT->LI', 'ES->AD', 'ES->GI', 'IT->SM', 'CH->LI', 'IT->VA'].includes(u)),
  'every country -> country change is an encloser yielding to the enclave it contains',
  JSON.stringify([...new Set(upgrades)]),
);

// ---------------------------------------------------------------- §5 double coverage

h('§5 double coverage — every pair of entries that claims the same ground, and who wins');

const overlapBox = (a, b) => !(a.box[2] < b.box[0] || b.box[2] < a.box[0] || a.box[3] < b.box[1] || b.box[3] < a.box[1]);
const pairs = new Map();
for (const e of IX.countries) {
  const cands = IX.countries.filter((x) => x !== e && overlapBox(x, e));
  if (!cands.length) continue;
  const [x0, y0, x1, y1] = e.box;
  // fine enough to see the 110 m x 130 m Vatican patch; coarse enough that RU finishes
  const step = Math.max(Math.max(x1 - x0, y1 - y0) / 250, 0.00005);
  const kmPerCell = (step * 110.574) * (step * 111.32 * Math.cos(((y0 + y1) / 2) * RAD));
  for (let lat = y0; lat <= y1; lat += step) {
    for (let lng = x0; lng <= x1; lng += step) {
      if (!hasPoint(e, lng, lat)) continue;
      for (const o of cands) {
        if (!hasPoint(o, lng, lat)) continue;
        const key = [e.code, o.code].sort().join('+');
        const rec = pairs.get(key) ?? { n: 0, km2: 0 };
        rec.n++;
        rec.km2 += kmPerCell / 2; // each pair is visited from both sides
        pairs.set(key, rec);
      }
    }
  }
}
const pos = new Map(IX.countries.map((c, i) => [c.code, i]));
const smallerWins = [];
for (const [key, v] of [...pairs].sort((a, b) => b[1].km2 - a[1].km2)) {
  const [a, b] = key.split('+');
  const first = pos.get(a) < pos.get(b) ? a : b;
  const smaller = areaOf(IX.countries[pos.get(a)]) < areaOf(IX.countries[pos.get(b)]) ? a : b;
  smallerWins.push(first === smaller);
  note(`${key.padEnd(8)} contested ~${v.km2.toFixed(2)} km²`, `countryOf answers ${first}`);
}
ok(pairs.size === 10, 'exactly ten pairs of entries overlap anywhere on Earth', `${pairs.size} pair(s)`);
ok(smallerWins.every(Boolean), 'in EVERY overlapping pair the smaller-area entry is the one countryOf returns');
ok(
  [...pairs.keys()].every((k) => k.split('+').some((c) => !oldRaw.some(([oc]) => oc === c))),
  'every overlapping pair has exactly one 1:10m filled member — there is no 110m-vs-110m or 10m-vs-10m overlap',
);

// ---------------------------------------------------------------- §6 ray-casting correctness

h('§6 ray-casting correctness');

// 6.1 reversed ray
let n61 = 0;
let dis = 0;
const disEx = [];
for (let lat = -89.87; lat < 90; lat += 0.23) {
  for (let lng = -179.87; lng < 180; lng += 0.23) {
    n61++;
    const a = countryOf({ lat, lng }, IX);
    const b = pickLeft(lng, lat);
    if (a !== b) {
      dis++;
      if (disEx.length < 8) disEx.push([+lat.toFixed(4), +lng.toFixed(4), a, b]);
    }
  }
}
ok(dis === 0, `a ray toward −∞ longitude agrees with the shipped +∞ ray on all ${n61} cells`, JSON.stringify(disEx));

// 6.2 holes — the ring-with-hole case, tested against a SINGLE-country index so the
//     enclave's own polygon cannot mask a broken hole.
const only = (code) => ({ scale: 't', source: 't', countries: IX.countries.filter((c) => c.code === code) });
ok(countryOf({ lat: -29.6, lng: 28.2 }, only('ZA')) === null, 'a point in Lesotho is OUTSIDE South Africa alone — the Lesotho-shaped hole is honoured by the even-odd rule');
ok(countryOf({ lat: -28.5, lng: 25.0 }, only('ZA')) === 'ZA', '…and a point in South Africa proper is still ZA');
ok(countryOf({ lat: -29.6, lng: 28.2 }, IX) === 'LS', '…and against the whole index it is LS');
ok(countryOf({ lat: 43.9424, lng: 12.4578 }, only('IT')) === 'IT', 'the 1:110m base has NO San Marino hole in Italy — which is why the emission order has to decide it');
ok(countryOf({ lat: 47.141, lng: 9.5209 }, only('AT')) === 'AT', '…and no Liechtenstein hole in Austria');

// 6.3 antimeridian
let outOfRange = 0;
for (const c of IX.countries) for (const r of c.rings) for (let i = 0; i + 1 < r.length; i += 2) if (Math.abs(r[i]) > 180 || Math.abs(r[i + 1]) > 90) outOfRange++;
ok(outOfRange === 0, 'no ring vertex lies outside ±180 / ±90 — the rings really are clipped, as derive/country.ts claims', String(outOfRange));
const at180 = IX.countries.filter((c) => c.rings.some((r) => { for (let i = 0; i < r.length; i += 2) if (Math.abs(Math.abs(r[i]) - 180) < 1e-9) return true; return false; })).map((c) => c.code);
note('codes with a vertex at exactly ±180', JSON.stringify(at180));
ok(countryOf({ lat: 66, lng: -175 }, IX) === 'RU', 'Chukotka east of the antimeridian resolves RU from its own negative-longitude polygon');
ok(countryOf({ lat: -18.1416, lng: 178.4419 }, IX) === 'FJ', 'Suva (west of 180) is FJ');
ok(countryOf({ lat: -16.6, lng: 179.3 }, IX) === 'FJ', 'Vanua Levu is FJ');
ok(countryOf({ lat: 1.87, lng: -157.4 }, IX) === 'KI', 'Kiritimati, 27° of longitude and an antimeridian away from Kiribati\'s other islands, is KI');
const wide = IX.countries.filter((c) => c.box[2] - c.box[0] > 180).map((c) => c.code);
note('entries whose reject box spans >180° of longitude (box prunes nothing for them)', JSON.stringify(wide));

// 6.4 poles, (0,0), malformed input
ok(countryOf({ lat: 90, lng: 0 }, IX) === null, 'the north pole is null');
ok(countryOf({ lat: -90, lng: 0 }, IX) === 'AQ', 'the south pole is AQ (not special-cased — Antarctica\'s ring simply contains it)');
ok(countryOf({ lat: 0, lng: 0 }, IX) === null, 'exactly (0,0) is null');
for (const at of [{ lat: NaN, lng: 0 }, { lat: 0, lng: NaN }, { lat: Infinity, lng: 0 }, { lat: 91, lng: 0 }, { lat: 0, lng: 181 }, { lat: -0, lng: -0 }])
  ok(countryOf(at, IX) === null, `malformed/out-of-range input is null: ${JSON.stringify(at)}`);

// 6.5 ring hygiene
let oddLen = 0;
let nonFinite = 0;
let unclosed = 0;
let dupConsec = 0;
let minPts = Infinity;
let maxPts = 0;
let ringCount = 0;
for (const c of IX.countries)
  for (const r of c.rings) {
    ringCount++;
    if (r.length % 2) oddLen++;
    for (const v of r) if (!Number.isFinite(v)) nonFinite++;
    const n = r.length / 2;
    if (n < minPts) minPts = n;
    if (n > maxPts) maxPts = n;
    if (r[0] !== r[r.length - 2] || r[1] !== r[r.length - 1]) unclosed++;
    for (let i = 2; i + 1 < r.length; i += 2) if (r[i] === r[i - 2] && r[i + 1] === r[i - 1]) dupConsec++;
  }
ok(oddLen === 0, 'every ring has an even number of numbers');
ok(nonFinite === 0, 'no NaN/Infinity in any ring');
ok(minPts >= 3, 'no ring has fewer than three points', `min ${minPts}, max ${maxPts}`);
ok(dupConsec === 0, 'no consecutive duplicate vertices survived quantisation');
note('rings whose first vertex ≠ last (the type says the closing point may be omitted)', String(unclosed));

// 6.6 self-intersection
function properCross(p1, p2, p3, p4) {
  const d = (p4[1] - p3[1]) * (p2[0] - p1[0]) - (p4[0] - p3[0]) * (p2[1] - p1[1]);
  if (d === 0) return false;
  const ua = ((p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0])) / d;
  const ub = ((p2[0] - p1[0]) * (p1[1] - p3[1]) - (p2[1] - p1[1]) * (p1[0] - p3[0])) / d;
  return ua > 0 && ua < 1 && ub > 0 && ub < 1;
}
const selfInt = [];
for (const c of IX.countries)
  for (const r of c.rings) {
    const n = r.length / 2;
    if (n > 1500) continue;
    const pts = [];
    for (let i = 0; i + 1 < r.length; i += 2) pts.push([r[i], r[i + 1]]);
    if (pts[0][0] !== pts[n - 1][0] || pts[0][1] !== pts[n - 1][1]) pts.push(pts[0]);
    let hit = 0;
    for (let i = 0; i + 1 < pts.length; i++)
      for (let j = i + 2; j + 1 < pts.length; j++) {
        if (i === 0 && j === pts.length - 2) continue;
        if (properCross(pts[i], pts[i + 1], pts[j], pts[j + 1])) hit++;
      }
    if (hit) selfInt.push(`${c.code}(${n}pts)`);
  }
note(`self-intersecting rings in the shipped index (of ${ringCount})`, `${selfInt.length} ${JSON.stringify(selfInt)}`);
note(
  'provenance',
  'R22-3: SD\'s is present in raw Natural Earth 1:110m; MV\'s eight are INTRODUCED by the generator\'s 4-dp quantisation and the quantisation guard\'s 1.7° lattice cannot see them. qa/i5-fillscale.mjs re-derives both from the raw layers and bounds the damage.',
);

// ---------------------------------------------------------------- §7 KD-52

h('§7 KD-52 — the Vatican residue, mapped rather than asserted');

const va = IX.countries.find((c) => c.code === 'VA');
ok(IX.countries.findIndex((c) => c.code === 'VA') === 0, 'VA is entry 0 — the smallest polygon in the index, so it is tested before Italy');
ok(va.rings.length === 1 && va.rings[0].length / 2 === 7, 'VA is a single seven-point ring', `${va.rings.length} ring(s), ${va.rings[0].length / 2} points`);
note('VA box', JSON.stringify(va.box) + ` ≈ ${((va.box[2] - va.box[0]) * 111320 * Math.cos(41.903 * RAD)).toFixed(0)} m × ${((va.box[3] - va.box[1]) * 110574).toFixed(0)} m`);
ok(va.box[0] >= 12.4527 && va.box[2] <= 12.454 && va.box[1] >= 41.9028 && va.box[3] <= 41.9039, 'the patch is exactly A-26 Part 5\'s 12.4527–12.4540 E / 41.9028–41.9039 N');
ok(countryOf({ lat: 41.9033, lng: 12.4533 }, IX) === 'VA', 'a point INSIDE the patch is VA');
ok(countryOf({ lat: 41.9029, lng: 12.4534 }, IX) === 'VA', '…as is the coordinate the pre-I-5a test labelled "Vatican City" and which then returned IT');
for (const [lat, lng, where] of [[41.9033, 12.4526, 'one 0.0002° step west'], [41.9033, 12.4541, 'east'], [41.9027, 12.4535, 'south'], [41.904, 12.4535, 'north']])
  ok(countryOf({ lat, lng }, IX) === 'IT', `${where} of the patch (~17–22 m) is IT, never null`);
ok(countryOf({ lat: 41.9022, lng: 12.4539 }, IX) === 'IT', 'St Peter\'s Basilica is IT — the residue A-26 Part 5 describes');
ok(countryOf({ lat: 41.9042, lng: 12.4568 }, IX) === 'IT', 'the Vatican Museums entrance is IT');
const vtx = [];
for (let i = 0; i + 1 < va.rings[0].length; i += 2) vtx.push(countryOf({ lat: va.rings[0][i + 1], lng: va.rings[0][i] }, IX));
note('the seven ring VERTICES themselves', JSON.stringify(vtx) + ' — arbitrary but deterministic, exactly as derive/country.ts documents');
ok(new Set(vtx).size <= 2 && vtx.every((v) => v === 'VA' || v === 'IT'), 'a point exactly ON a boundary vertex is one of the two neighbours, never null and never a third country');
let patchCells = 0;
for (let lat = 41.9024; lat <= 41.9044; lat += 0.00002) for (let lng = 12.452; lng <= 12.4548; lng += 0.00002) if (countryOf({ lat, lng }, IX) === 'VA') patchCells++;
note('VA-answering area', `~${(patchCells * 0.00002 * 110574 * 0.00002 * 111320 * Math.cos(41.903 * RAD) / 1000).toFixed(3)} × 10³ m² against the real state's 440,000 m² — about a thirtieth, as KD-52 says`);

// ---------------------------------------------------------------- §8 the budget guards

h('§8 the budget test\'s structural guards, and their headroom');

const GEN = resolve(CAIRN, 'packages/core/src/geo/countries.gen.ts');
const src = readFileSync(GEN, 'utf8');
const packed = /const PACKED =\n\s*'([\s\S]*?)';/.exec(src);
const outside = src.replace(packed[1], '');
const bytes = statSync(GEN).size;
note('EMITTED_BYTES', `test pins 346_455; file is ${bytes}`);
ok(bytes <= 346455, 'the file is within its measured budget');
ok((outside.match(/\[/g) ?? []).length === 0, 'guard 2: zero "[" outside the packed literal');
ok(packed[1].length / src.length > 0.98, 'guard 3: the packed literal is >98% of the file', (packed[1].length / src.length).toFixed(6));
note('guard 1: bytes outside the packed literal', `${outside.length} against a limit of 3600 — HEADROOM ${3600 - outside.length} bytes`);
ok(
  3600 - outside.length > 500,
  'R22-4: guard 1 has more than 500 bytes of headroom, so an ordinary header-comment edit will not trip it',
  `${3600 - outside.length} bytes left; the limit was already raised 3000 -> 3600 in this increment for comment growth, and its failure message still blames "data leaked into syntax"`,
);
note(
  'guard 3 is a RATIO, so it does not bound the comment in absolute terms',
  `at today's payload it permits ${Math.round(packed[1].length / 0.98 - packed[1].length)} bytes outside — nearly twice guard 1's 3,600 — and that allowance grows with the dataset`,
);
// what the budget test alone cannot see
const shrunk = `${outside.slice(0, outside.indexOf("'") + 1)}${packed[1].slice(0, 1000)}';`;
note(
  'and what the budget test alone cannot detect',
  'EMITTED_BYTES is a <= ceiling, so an index that silently SHRANK (a lost fill, a dropped layer) passes every assertion in 0-countryBudget.test.ts; only country.test.ts:715\'s `countries.length === 239` catches it, and that file must load the module the budget test refuses to load',
);
void shrunk;

// ---------------------------------------------------------------- done

console.log(`\n${fails} FAIL`);
