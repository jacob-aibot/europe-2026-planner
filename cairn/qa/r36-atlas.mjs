/**
 * QA round 36 — the breaker pass over I-8d (the atlas frame). ARCHITECTURE §4.4 **A-41**
 * (C1–C8, Part 4, Part 5 I1–I7, Part 6, Part 7) and **A-42** (a)/(b)/(c).
 *
 *   Run: node qa/r36-atlas.mjs          (bare Node, no browser, no server)
 *
 * This is the adversarial counterpart of the builder's own `qa/i8d-frame.mjs`. That probe
 * asks "does the shipped sample come out the way A-41 predicted"; this one asks "over the
 * whole shipped country index, is any clause of A-41 false, and can a realistic library make
 * the atlas frame produce a map of the wrong subject again".
 *
 * Sections:
 *   A  C2 — the key point, swept over all 239 codes: how far is a country's cluster key from
 *      the country? A-41 residue 1' discloses five (FJ, AQ, RU, KI, UM). It does not disclose
 *      the sixth.
 *   B  C3/C4 — is the partition genuinely single-linkage first-fit, and does the first-fit
 *      half separate real neighbours? Plus the threshold's actual margin, re-measured over the
 *      whole index rather than over the ten pairs A-41 C4 tabulates.
 *   C  C5 — the dominance test, at the exact integer boundary, in both directions.
 *   D  C6 — the ranking keys, one observable test per key.
 *   E  C7 / I1-I7 — the accounting, at 1, 2, 3, 5 and 239 countries.
 *   F  Part 4 / A-42 (b) — containment with margin, every code, and the reference numbers.
 *   G  Part 6 — the extraction, and what it costs the day map.
 *   H  W1/W2/W3, Part 7's do-not-build list, and A-42 (c).
 *
 * A "FAIL" line is a clause of the ruling that does not hold. A "FOUND" line is an
 * adversarial result: the code does what the ruling says and the ruling is wrong.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame, WORLD_CLUSTER_THRESHOLD_KM } from '../packages/client/src/selectors/worldMap.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

let fails = 0;
let founds = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok     ${label}`);
  else { fails++; console.log(`  FAIL   ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const found = (label) => { founds++; console.log(`  FOUND  ${label}`); };
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note   ${s}`);

const IDX = core.COUNTRY_INDEX;
const CODES = [...new Set(IDX.countries.map((c) => c.code))].sort();

// The same key point C2 specifies, computed independently of the selector.
const KEY = {};
const BOX = {};
for (const c of CODES) {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const entry of IDX.countries) {
    if (entry.code !== c) continue;
    const [a, b, cc, d] = entry.box;
    w = Math.min(w, a); s = Math.min(s, b); e = Math.max(e, cc); n = Math.max(n, d);
  }
  BOX[c] = [w, s, e, n];
  KEY[c] = { lat: (s + n) / 2, lng: (w + e) / 2 };
}
const T = Math.PI / 180;
const hav = (a, b) => {
  const dl = (b.lat - a.lat) * T, dg = (b.lng - a.lng) * T;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin(dg / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(x)));
};
const dist = (a, b) => hav(KEY[a], KEY[b]);

const rowOf = (code, n = 1) => ({
  code, firstVisit: '2020-01-01', lastVisit: '2020-01-10',
  tripIds: Array.from({ length: n }, (_, i) => `${code}-t${i}`), provisional: false,
});
const statsFor = (rows) => ({
  countries: rows, cities: [], trips: { planned: 0, active: 0, completed: 1 },
  daysTravelled: 10, located: { cities: 0, places: 0, stops: 0 },
  unattributed: { cities: 0, places: 0, stops: 0 }, unnamedCities: 0,
});
const frameOf = (spec) => worldMapFrame(statsFor(spec.map(([c, n]) => rowOf(c, n))), IDX);
const shape = (f) => f.panes.map((p) => `${p.id}[${p.codes.join(',')}]w${p.weight}`).join(' ');

// ---------------------------------------------------------------------------
head('A  C2 — ONE KEY POINT PER COUNTRY, AND HOW FAR IT IS FROM THE COUNTRY');

const displacement = {};
for (const c of CODES) {
  let m = Infinity;
  for (const e of IDX.countries) {
    if (e.code !== c) continue;
    for (const r of e.rings) for (let i = 0; i + 1 < r.length; i += 2) {
      const d = hav(KEY[c], { lat: r[i + 1], lng: r[i] });
      if (d < m) m = d;
    }
  }
  displacement[c] = m;
}
const worst = CODES.slice().sort((a, b) => displacement[b] - displacement[a]);
console.log('  the ten worst key points (km from the nearest vertex of their own country):');
for (const c of worst.slice(0, 10)) {
  console.log(`    ${c}  ${displacement[c].toFixed(0).padStart(6)} km   key=(${KEY[c].lat.toFixed(3)}, ${KEY[c].lng.toFixed(3)})  box width ${(BOX[c][2] - BOX[c][0]).toFixed(2)}°`);
}
const DISCLOSED = ['FJ', 'AQ', 'RU', 'KI', 'UM'];   // A-41 Part 8 residue 1′, the box>180° five
ok(CODES.filter((c) => BOX[c][2] - BOX[c][0] > 180).sort().join(' ') === DISCLOSED.slice().sort().join(' '),
  "residue 1′'s five wide-box codes are exactly the codes with a box wider than 180°",
  CODES.filter((c) => BOX[c][2] - BOX[c][0] > 180));
ok(Math.abs(KEY.RU.lat - 61.2) < 0.01 && Math.abs(KEY.RU.lng) < 1e-9,
  "A-41 residue 1′'s own claim: RU's key computes to 0.00°E, 61.20°N", KEY.RU);
// The sixth. Everything above 1000 km that residue 1′ does not name.
const undisclosed = worst.filter((c) => !DISCLOSED.includes(c) && displacement[c] > 1000);
if (undisclosed.length) {
  found(`${undisclosed.length} code(s) with a key point > 1000 km outside their own territory are NOT covered by residue 1′: ` +
    undisclosed.map((c) => `${c} ${displacement[c].toFixed(0)} km`).join(', '));
  note("residue 1′ is scoped to 'a box wider than 180°'; FR's box is 64.08° and its key is in the Atlantic.");
}

// ---------------------------------------------------------------------------
head('B  C3/C4 — THE PARTITION, AND WHAT THE THRESHOLD ACTUALLY SEPARATES');

// B1. `clusterPoints` is single-linkage FIRST-FIT and not the transitive closure. Differential
//     against a reference union-find over the same points.
function trueSingleLinkage(points, t) {
  const p = points.map((_, i) => i);
  const find = (i) => (p[i] === i ? i : (p[i] = find(p[i])));
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    if (hav(points[i], points[j]) < t) p[find(i)] = find(j);
  }
  const by = new Map();
  for (let i = 0; i < points.length; i++) {
    const r = find(i);
    if (!by.has(r)) by.set(r, []);
    by.get(r).push(i);
  }
  return [...by.values()].map((g) => g.sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]);
}
const allPts = CODES.map((c) => KEY[c]);
const ff = core.clusterPoints(allPts, WORLD_CLUSTER_THRESHOLD_KM).map((g) => g.slice()).sort((a, b) => a[0] - b[0]);
const sl = trueSingleLinkage(allPts, WORLD_CLUSTER_THRESHOLD_KM);
note(`over all 239 key points at ${WORLD_CLUSTER_THRESHOLD_KM} km: first-fit -> ${ff.length} groups, transitive single-linkage -> ${sl.length} groups`);
ok(JSON.stringify(ff) !== JSON.stringify(sl) || ff.length === sl.length,
  'clusterPoints is the documented first-fit (C3), not a re-implementation with different semantics');
// The kernel really is first-fit: a hand case A-B far, A-C near, B-C near.
const fixture = [{ lat: 0, lng: 0 }, { lat: 0, lng: 80 }, { lat: 0, lng: 40 }];
ok(JSON.stringify(core.clusterPoints(fixture, 5000)) === '[[0,2],[1]]',
  'C3, exactly: the third point joins the FIRST group in range, it does not merge the two',
  core.clusterPoints(fixture, 5000));

// B2. What that costs on real data: real neighbours put in different clusters by the alphabet.
const COMMON = ['US', 'CA', 'MX', 'GB', 'FR', 'DE', 'ES', 'IT', 'PT', 'NL', 'BE', 'CH', 'AT', 'CZ', 'HU',
  'HR', 'PL', 'GR', 'TR', 'SE', 'NO', 'FI', 'DK', 'IS', 'IE', 'MA', 'EG', 'ZA', 'JP', 'CN', 'KR', 'TH',
  'VN', 'IN', 'AU', 'NZ', 'BR', 'AR', 'CL', 'PE', 'RU', 'SG', 'AE', 'ID', 'MY', 'PH', 'KE', 'NG', 'IL',
  'JO', 'CU', 'JM', 'DO', 'CR', 'PA', 'CO', 'EC', 'SK', 'SI', 'RO', 'BG', 'RS', 'UA', 'EE', 'LV', 'LT',
  'LU', 'MT', 'CY'].filter((c) => KEY[c]).sort();
const separated = [];
for (let a = 0; a < COMMON.length; a++) for (let b = a + 1; b < COMMON.length; b++) {
  if (dist(COMMON[a], COMMON[b]) < WORLD_CLUSTER_THRESHOLD_KM) continue;
  for (let c = b + 1; c < COMMON.length; c++) {
    if (dist(COMMON[a], COMMON[c]) < WORLD_CLUSTER_THRESHOLD_KM &&
        dist(COMMON[b], COMMON[c]) < WORLD_CLUSTER_THRESHOLD_KM &&
        dist(COMMON[b], COMMON[c]) < 1600) separated.push([COMMON[a], COMMON[b], COMMON[c], dist(COMMON[b], COMMON[c])]);
  }
}
separated.sort((x, y) => x[3] - y[3]);
if (separated.length) {
  found(`${separated.length} three-country libraries of well-travelled codes put two NEIGHBOURS in different clusters, because of row order`);
  for (const [a, b, c, d] of separated.slice(0, 6)) {
    note(`  {${a},${b},${c}}: ${b}–${c} are ${d.toFixed(0)} km apart and land in different clusters (${a}–${c} is ${dist(a, c).toFixed(0)} km, under the threshold)`);
  }
}
// Driven end to end, and shown to be an ORDER effect rather than a geometry one.
const aeAtGr = frameOf([['AE', 1], ['AT', 1], ['GR', 3]]);
ok(aeAtGr.panes.length === 2 && String(aeAtGr.panes[0].codes) === 'AE,GR' && String(aeAtGr.panes[1].codes) === 'AT',
  'the {AE,AT,GR} library frames the UAE and Greece together and exiles Austria to the inset', shape(aeAtGr));
if (aeAtGr.panes.length === 2 && String(aeAtGr.panes[1].codes) === 'AT') {
  found(`{AE 1 trip, AT 1 trip, GR 3 trips} -> ${shape(aeAtGr)} — Austria (1326 km from Greece) is the "outlier"; the UAE (3281 km) is not`);
}
const reordered = worldMapFrame(statsFor([rowOf('AT', 1), rowOf('GR', 3), rowOf('AE', 1)]), IDX);
if (reordered.panes.length === 1) {
  found(`the SAME three rows in a different order -> ${shape(reordered)}: the partition is a function of the alphabet as well as of coordinates (A-41 constraint 2 says it is a function of coordinates)`);
}

// B3. The threshold's real margin, over the whole index rather than C4's ten hand-picked pairs.
let maxMerge = { d: -Infinity }, minSplit = { d: Infinity };
for (let i = 0; i < CODES.length; i++) for (let j = i + 1; j < CODES.length; j++) {
  const d = dist(CODES[i], CODES[j]);
  if (d < WORLD_CLUSTER_THRESHOLD_KM && d > maxMerge.d) maxMerge = { d, p: `${CODES[i]}–${CODES[j]}` };
  if (d >= WORLD_CLUSTER_THRESHOLD_KM && d < minSplit.d) minSplit = { d, p: `${CODES[i]}–${CODES[j]}` };
}
note(`C4's table claims a ≥1.5× margin on the split side (US–IS 5,998 vs an intra-continental ceiling of 3,569).`);
note(`Measured over all ${CODES.length * (CODES.length - 1) / 2} pairs in the shipped index:`);
note(`  widest pair that still MERGES: ${maxMerge.p} at ${maxMerge.d.toFixed(1)} km  (${(100 * (WORLD_CLUSTER_THRESHOLD_KM - maxMerge.d) / WORLD_CLUSTER_THRESHOLD_KM).toFixed(3)}% below the threshold)`);
note(`  closest pair that SPLITS:      ${minSplit.p} at ${minSplit.d.toFixed(1)} km  (${(100 * (minSplit.d - WORLD_CLUSTER_THRESHOLD_KM) / WORLD_CLUSTER_THRESHOLD_KM).toFixed(3)}% above it)`);
if (minSplit.d / WORLD_CLUSTER_THRESHOLD_KM < 1.5) {
  found(`the "≥1.5× margin on the split side" is a property of C4's ten-pair sample, not of the index: the real nearest splitting pair is ${minSplit.p} at ${minSplit.d.toFixed(0)} km, ${(minSplit.d / WORLD_CLUSTER_THRESHOLD_KM).toFixed(3)}× the threshold`);
}
// Two well-known pairs sitting on either side of the line.
note(`  FR–HR ${dist('FR', 'HR').toFixed(1)} km (merges)   FR–CZ ${dist('FR', 'CZ').toFixed(1)} km (splits)   FR–DE ${dist('FR', 'DE').toFixed(1)} km (merges)   FR–MA ${dist('FR', 'MA').toFixed(1)} km (merges)`);

// B4. The frame that A-41 exists to remove, produced by A-41.
const frGr = frameOf([['FR', 2], ['GR', 1]]);
const w0 = frGr.panes[0].bounds.east - frGr.panes[0].bounds.west;
if (frGr.panes.length === 2 && String(frGr.panes[0].codes) === 'FR' && w0 > 60) {
  found(`{FR 2 trips, GR 1 trip} -> ${shape(frGr)}; the MAIN pane spans ${w0.toFixed(1)}° of longitude for one country, because FR's box reaches French Guiana. Greece is in the inset.`);
}
const usCu = frameOf([['US', 3], ['CU', 1]]);
if (usCu.panes.length === 2 && String(usCu.panes[1].codes) === 'CU') {
  found(`{US 3 trips, CU 1 trip} -> ${shape(usCu)}: Cuba, 150 km from Florida, is framed as a distant outlier (US–CU key distance ${dist('US', 'CU').toFixed(0)} km)`);
}

// ---------------------------------------------------------------------------
head('C  C5 — THE DOMINANCE TEST AT THE EXACT BOUNDARY');

// Three far-apart anchors, so cluster membership is never in doubt: AU, DE, US.
const c5 = (a, b, c) => frameOf(c === undefined ? [['AU', a], ['US', b]] : [['AU', a], ['DE', c], ['US', b]]);
ok(c5(1, 1).panes.length === 1, 'a genuine tie (1 v 1) NEVER splits — 2·1 > 2 is false');
ok(c5(3, 3).panes.length === 1, 'a genuine tie at 3 v 3 never splits either');
ok(c5(4, 3).panes.length === 2, '4 v 3: 2·4 = 8 > 7, the closest split there is');
ok(c5(3, 4).panes.length === 2 && String(c5(3, 4).panes[0].codes) === 'US', '3 v 4: the heavier cluster is primary regardless of ISO order');
ok(c5(4, 3, 1).panes.length === 1, '4 v 3 v 1: 2·4 = 8 is NOT > 8 — one vote short of a split, and it does not split');
ok(c5(5, 3, 1).panes.length === 3, '5 v 3 v 1: 2·5 = 10 > 9 — the very next step does split, into all three panes');
ok(c5(3, 3, 3).panes.length === 1, 'three roughly-equal clusters do not split (A-41 C5: nothing to prioritise)');
{ const f = c5(3, 3, 3); note(`  and the honest frame that leaves is ${(f.panes[0].bounds.east - f.panes[0].bounds.west).toFixed(1)}° × ${(f.panes[0].bounds.north - f.panes[0].bounds.south).toFixed(1)}° — one pane holding everything`); }
// A single trip that touched two distant places.
const oneTrip = worldMapFrame(statsFor([
  { code: 'JP', firstVisit: '2020-01-01', lastVisit: '2020-01-10', tripIds: ['solo'], provisional: false },
  { code: 'US', firstVisit: '2020-01-01', lastVisit: '2020-01-10', tripIds: ['solo'], provisional: false },
]), IDX);
ok(oneTrip.panes.length === 1, 'a single trip with two distant countries never splits (weights 1 and 1)');
// C5's weight is Σ tripIds.length, so it counts country-attributions and NOT trips: a cluster's
// weight rises with the number of countries in it. A-41 residue 4 discloses that weight ignores
// duration ("a weekend and a month count the same"); it does not disclose this.
const oneTripSixCountries = ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU'].map((code) => ({
  code, firstVisit: '2020-01-01', lastVisit: '2020-01-14', tripIds: ['euro-tour'], provisional: false,
}));
const fiveJapanTrips = [{
  code: 'JP', firstVisit: '2015-01-01', lastVisit: '2020-01-10',
  tripIds: ['jp1', 'jp2', 'jp3', 'jp4', 'jp5'], provisional: false,
}];
const oneVsFive = worldMapFrame(statsFor([...oneTripSixCountries, ...fiveJapanTrips].sort((a, b) => (a.code < b.code ? -1 : 1))), IDX);
ok(oneVsFive.panes.length === 2, 'one 6-country trip vs five Japan trips: the frame splits', shape(oneVsFive));
if (oneVsFive.panes.length === 2 && String(oneVsFive.panes[0].codes) !== 'JP') {
  found(`ONE trip to six European countries (weight 6) outranks FIVE separate trips to Japan (weight 5): ${shape(oneVsFive)} — Japan goes to the inset. C5's weight counts country-attributions, not trips; A-41 residue 4 discloses only that it ignores duration.`);
}

// Can the top two ever tie AND split? Algebraically no; asserted so nobody re-derives it.
ok(!frameOf([['AU', 4], ['DE', 4], ['US', 1]]).panes.length !== 1 && frameOf([['AU', 4], ['DE', 4], ['US', 1]]).panes.length === 1,
  'when the top two clusters tie on weight the frame can never split (2w > 2w+rest is unsatisfiable)');

// ---------------------------------------------------------------------------
head('D  C6 — THE THREE RANKING KEYS, ONE OBSERVABLE TEST EACH');

const k1 = frameOf([['AU', 2], ['US', 5]]);
ok(String(k1.panes[0].codes) === 'US', 'key 1 (weight desc) decides the primary', shape(k1));
// key 2 (country count desc) is only observable at ranked[1] vs ranked[2]: the two runners-up
// must tie on weight and differ on count, with a dominant primary above them.
const k2 = frameOf([['AU', 2], ['BR', 1], ['CL', 1], ['DE', 7], ['JP', 2]]);
note(`  key-2 fixture: ${shape(k2)}`);
ok(k2.panes.length === 3 && String(k2.panes[1].codes) === 'BR,CL',
  'key 2 (country count desc) puts the 2-country runner-up in inset-1 ahead of the 1-country one of equal weight', shape(k2));
// key 3 (lowest ISO asc). With canonical rows it is unobservable — assert THAT, since it is
// what makes the builder's own fault matrix need a non-canonical input.
const canonicalAgrees = core.clusterPoints(CODES.map((c) => KEY[c]), WORLD_CLUSTER_THRESHOLD_KM)
  .every((g) => CODES[g[0]] === g.map((i) => CODES[i]).reduce((a, b) => (b < a ? b : a)));
ok(canonicalAgrees,
  'key 3 (lowest ISO asc) is VACUOUS on canonical rows: a cluster\'s first member is always its lowest code');
note('  so C6\'s third key can only be exercised by rows travelStats cannot emit — the builder found this too (BUILD-NOTES, "came back green on the first run")');

// ---------------------------------------------------------------------------
head('E  C7 AND I1–I7 — THE ACCOUNTING');

function invariants(label, spec) {
  const rows = spec.map(([c, n]) => rowOf(c, n));
  const f = worldMapFrame(statsFor(rows), IDX);
  const inPanes = f.panes.flatMap((p) => p.codes);
  const claimed = rows.map((r) => r.code);
  // I1
  ok(claimed.every((c) => (inPanes.filter((x) => x === c).length + f.missing.filter((x) => x === c).length) === 1) &&
     inPanes.length + f.missing.length === claimed.length,
    `${label} · I1: every claimed code is in exactly one pane or exactly once in missing`,
    { inPanes, missing: f.missing });
  // I2
  ok(f.countries.every((c) => f.panes.some((p) => p.id === c.paneId)) &&
     f.panes.every((p) => String(p.codes) === String(f.countries.filter((c) => c.paneId === p.id).map((c) => c.code))),
    `${label} · I2: paneId names a pane and pane.codes is exactly its members, in canonical order`);
  // I5
  ok(f.panes[0].role === 'main' && f.panes.slice(1).every((p) => p.role === 'inset'),
    `${label} · I5: panes[0] is main, the rest are insets`);
  // I6 — recompute and compare bytes
  ok(JSON.stringify(f) === JSON.stringify(worldMapFrame(statsFor(rows), IDX)),
    `${label} · I6: the same (stats, index) yields a byte-identical frame`);
  // I4
  const verts = (d) => [...d.matchAll(/[ML](-?[\d.eE+]+),(-?[\d.eE+]+)/g)].map((m) => [+m[1], +m[2]]);
  let allIn = true, tight = Infinity;
  for (const p of f.panes) {
    const [mx, my, w, h] = p.viewBox.split(' ').map(Number);
    if (!(w > 0 && h > 0)) allIn = false;
    for (const c of f.countries.filter((x) => x.paneId === p.id)) for (const [x, y] of verts(c.d)) {
      const m = Math.min(x - mx, mx + w - x, y - my, my + h - y);
      if (!(m > 0)) allIn = false;
      if (m < tight) tight = m;
    }
  }
  ok(allIn, `${label} · I4: every pane strictly contains every vertex it draws (tightest ${Number.isFinite(tight) ? tight.toFixed(6) : 'n/a'}°)`);
  // aliases
  ok(f.viewBox === f.panes[0].viewBox && f.bounds === f.panes[0].bounds,
    `${label} · Part 5: frame.viewBox / frame.bounds alias panes[0]`);
  return f;
}
invariants('1 cluster  ', [['AT', 1], ['CZ', 1], ['HU', 1]]);
invariants('2 clusters ', [['AT', 3], ['US', 1]]);
invariants('3 clusters ', [['AT', 6], ['JP', 1], ['US', 1]]);
const five = invariants('5 clusters ', [['AT', 6], ['AU', 1], ['BR', 1], ['JP', 1], ['US', 1], ['ZA', 1]]);
ok(five.panes.length === 3, 'I3/C7: ≥4 clusters give exactly three panes', five.panes.length);
ok(String(five.panes[2].codes) === five.panes[2].codes.slice().sort().join(','),
  'C7: pane 3 folds every remaining cluster, re-sorted into canonical row order', five.panes[2].codes);
const withMissing = invariants('+ missing  ', [['AT', 1], ['ZZ', 1], ['US', 2]]);
ok(String(withMissing.missing) === 'ZZ', 'a code the index cannot fill is stated, not dropped', withMissing.missing);

// I7
const empty = worldMapFrame(statsFor([]), IDX);
ok(empty.panes.length === 1 && empty.panes[0].viewBox === '-180 -90 360 180' && empty.bounds.empty === true,
  'I7: an empty library is exactly one unpadded WHOLE_WORLD pane', empty.panes.map((p) => p.viewBox));
const allMissing = worldMapFrame(statsFor([rowOf('ZZ'), rowOf('QQ')]), IDX);
ok(allMissing.panes.length === 1 && allMissing.panes[0].viewBox === '-180 -90 360 180',
  'I7 also holds when every claimed code is missing');

// The maximal library: every code the index carries.
const all = worldMapFrame(statsFor(CODES.map((c) => rowOf(c))), IDX);
const payload = all.countries.reduce((n, c) => n + Buffer.byteLength(c.d, 'utf8'), 0);
ok(all.panes.length === 3 && all.panes.flatMap((p) => p.codes).length === CODES.length,
  `all ${CODES.length} codes: 3 panes, nothing lost`, all.panes.map((p) => p.codes.length));
ok(payload < 512 * 1024, `all ${CODES.length} codes: d payload ${(payload / 1024).toFixed(1)} KB is under A-40 Part 5's 512 KB ceiling`, payload);
note(`  pane spans at 239 codes: ${all.panes.map((p) => `${p.id} ${(p.bounds.east - p.bounds.west).toFixed(1)}°×${(p.bounds.north - p.bounds.south).toFixed(1)}°`).join('  ')}`);

// Never throws — A-40's own claim, over inputs travelStats would not emit.
const hostile = [
  ['empty', []],
  ['duplicate code', [rowOf('AT'), rowOf('AT')]],
  ['zero tripIds', [{ code: 'AT', tripIds: [], provisional: false }]],
  ['code null', [{ code: null, tripIds: ['a'], provisional: false }]],
  ['tripIds not an array', [{ code: 'AT', tripIds: 5, provisional: false }]],
];
for (const [label, rows] of hostile) {
  let threw = null;
  try { worldMapFrame(statsFor(rows), IDX); } catch (e) { threw = e; }
  ok(threw === null, `never throws: ${label}`, threw && threw.message);
}
{
  const dup = worldMapFrame(statsFor([rowOf('AT'), rowOf('AT')]), IDX);
  if (dup.countries.length === 2 && dup.countries[0].code === dup.countries[1].code) {
    note('  (a duplicated row code produces two `countries` entries with the same code, which the renderer would use as a duplicate React `key`; travelStats groups by code, so it is not reachable from the product today)');
  }
}

// ---------------------------------------------------------------------------
head('F  PART 4 / A-42 (b) — CONTAINMENT WITH MARGIN, RE-DERIVED');

const verts = (d) => [...d.matchAll(/[ML](-?[\d.eE+]+),(-?[\d.eE+]+)/g)].map((m) => [+m[1], +m[2]]);
let sweepBad = [], tightestAll = { m: Infinity };
for (const c of CODES) {
  const f = worldMapFrame(statsFor([rowOf(c)]), IDX);
  for (const p of f.panes) {
    const [mx, my, w, h] = p.viewBox.split(' ').map(Number);
    if (!(w > 0 && h > 0)) sweepBad.push(`${c}: zero-area viewBox`);
    for (const cc of f.countries.filter((x) => x.paneId === p.id)) for (const [x, y] of verts(cc.d)) {
      const m = Math.min(x - mx, mx + w - x, y - my, my + h - y);
      if (!(m > 0)) sweepBad.push(`${c}: vertex on or outside the frame (${m})`);
      if (m < tightestAll.m) tightestAll = { m, c };
    }
  }
}
ok(sweepBad.length === 0, `all ${CODES.length} single-country libraries: positive area and strict containment`, sweepBad.slice(0, 3));
note(`  tightest margin anywhere in the sweep: ${tightestAll.m.toExponential(4)}° at ${tightestAll.c}`);
// Every ring vertex is inside its own index box — the premise I4 rests on.
let outside = 0;
for (const e of IDX.countries) {
  const [a, b, cc, d] = e.box;
  for (const r of e.rings) for (let i = 0; i + 1 < r.length; i += 2) {
    if (r[i] < a || r[i] > cc || r[i + 1] < b || r[i + 1] > d) outside++;
  }
}
ok(outside === 0, "I4's premise: no ring vertex lies outside its own entry's `box`", outside);
// The reference numbers, re-derived rather than quoted.
const doc = JSON.parse(readFileSync(resolve(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8'));
const refStats = core.travelStats([core.tripSummary(core.fromJSON(doc), IDX)], '2026-08-31');
const ref = worldMapFrame(refStats, IDX);
for (const p of ref.panes) {
  const [mx, my, w, h] = p.viewBox.split(' ').map(Number);
  let m = Infinity, at = '';
  for (const c of ref.countries.filter((x) => x.paneId === p.id)) for (const [x, y] of verts(c.d)) {
    const v = Math.min(x - mx, mx + w - x, y - my, my + h - y);
    if (v < m) { m = v; at = c.code; }
  }
  console.log(`  note   ${p.id}: tightest inset ${m.toFixed(6)}° at ${at}`);
}
ok(ref.panes.length === 2 && ref.panes[0].viewBox === '-8.1779 -59.2407 31.494 17.3663' &&
   ref.panes[1].viewBox === '-173.8876 -73.4543 109.0195 56.6347',
  "BUILD-NOTES' reference viewBoxes re-derived byte-for-byte", ref.panes.map((p) => p.viewBox));

// ---------------------------------------------------------------------------
head('G  PART 6 — ONE CLUSTERING KERNEL');

const clusterSrc = readFileSync(resolve(CAIRN, 'packages/core/src/derive/cluster.ts'), 'utf8');
ok((clusterSrc.match(/haversine\(/g) || []).length === 2,
  '`haversine(` occurs exactly twice in cluster.ts (the partition, and rawSpanKm)',
  (clusterSrc.match(/haversine\(/g) || []).length);
ok((clusterSrc.match(/\.find\(\(gr\b/g) || []).length === 1,
  'the first-fit `groups.find(...)` loop is written out exactly once (it was twice before I-8d)',
  (clusterSrc.match(/\.find\(\(gr\b/g) || []).length);
ok(/export function clusterStops[\s\S]{0,600}?clusterPoints\(/.test(clusterSrc) &&
   /export function focusCluster[\s\S]{0,600}?clusterPoints\(/.test(clusterSrc),
  'clusterStops and focusCluster both delegate to clusterPoints (A-41 Part 6)');
const wmSrc = readFileSync(resolve(CAIRN, 'packages/client/src/selectors/worldMap.ts'), 'utf8');
ok(!/haversine|Math\.asin|6371/.test(wmSrc), 'packages/client hand-rolls no haversine');
ok(/core\.clusterPoints\(/.test(wmSrc) && /core\.mapBounds\(/.test(wmSrc),
  'C3/C8: the client calls core.clusterPoints and core.mapBounds and adds no third geometry');
// The delegation is behaviour-neutral for the day map: differential against the pre-extraction
// bodies, replayed here rather than imported from a worktree.
function oldClusterIdx(points, t) {
  const groups = [];
  for (let i = 0; i < points.length; i++) {
    const g = groups.find((gr) => gr.some((j) => hav(points[j], points[i]) < t));
    if (g) g.push(i); else groups.push([i]);
  }
  return groups;
}
let mismatch = 0;
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (let trial = 0; trial < 2000; trial++) {
  const n = 2 + Math.floor(rnd() * 12);
  const pts = Array.from({ length: n }, () => ({ lat: rnd() * 160 - 80, lng: rnd() * 360 - 180 }));
  const t = [1.2, 90, 400, 4000][Math.floor(rnd() * 4)];
  if (JSON.stringify(core.clusterPoints(pts, t)) !== JSON.stringify(oldClusterIdx(pts, t))) mismatch++;
}
ok(mismatch === 0, 'clusterPoints matches the pre-extraction loop over 2,000 randomised point sets', mismatch);

// ---------------------------------------------------------------------------
head('H  W1/W2/W3, PART 7, AND A-42 (c)');

const view = readFileSync(resolve(CAIRN, 'apps/web/src/views/WorldMap.tsx'), 'utf8');
for (const id of ['getBoundingClientRect', 'offsetWidth', 'offsetHeight', 'ResizeObserver',
  'innerWidth', 'innerHeight', 'clientWidth', 'clientHeight', 'matchMedia', 'getComputedStyle']) {
  ok(!view.includes(id), `W1: \`${id}\` does not appear in WorldMap.tsx`);
}
ok(!/Math\.(min|max|abs|round|floor)\s*\(|[^=!<>]=[^=]*\b(lat|lng)\b/.test(view.replace(/\/\*[\s\S]*?\*\//g, '')),
  'W1/W2: no arithmetic over coordinates in WorldMap.tsx');
const viewBoxExprs = [...view.matchAll(/viewBox=\{([^}]*)\}/g)].map((m) => m[1].trim());
ok(viewBoxExprs.length === 1 && viewBoxExprs[0] === 'pane.viewBox',
  'W3: the only viewBox expression in the file is `pane.viewBox`', viewBoxExprs);
ok(/\.filter\(\(c\) => c\.paneId === pane\.id\)/.test(view),
  'W3: pane membership is a string equality on paneId and nothing else');
for (const banned of ['frame.viewBox', 'frame.bounds', 'panes[0]', '.slice(1)']) {
  ok(!view.includes(banned), `W3 ceiling: \`${banned}\` does not appear in WorldMap.tsx`);
}
ok(!view.includes('clamped'), 'A-42 (c): nothing in the renderer reads `bounds.clamped`');
const css = readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8');
// Comments are stripped for every ceiling below: a docstring that NAMES the forbidden thing
// (`"a zoom-to-country animation"`, `"a simplifier is the second geometry implementation"`) is
// the ruling being quoted, not the ruling being broken.
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');
const viewCode = strip(view), cssCode = strip(css), wmCode = strip(wmSrc);
ok(!/readable minimum/i.test(viewCode) && !/readable minimum/i.test(cssCode),
  'A-42 (c): the "Zoomed out to a readable minimum" string is gone from the view and the stylesheet');
ok(!/legend__note/.test(cssCode), 'A-42 (c): the `.legend__note` rule went with it');
// Part 7 — the do-not-build list, as greps over the whole surface it could have landed on.
const surface = viewCode + cssCode + wmCode;
for (const [label, re] of [
  ['no threshold control', /<input|<select|<slider|onThreshold|setThreshold/i],
  ['no re-clustering control', /recluster|re-cluster|onReframe/i],
  ['no "zoom to" button', /zoomTo|onZoom|>\s*Zoom/],
  ['no continuous zoom or pan', /onWheel|onPointerMove|panBy|useTransform/],
  ['no per-screen-size frame rule', /@media[^{]*\{[^}]*viewBox/],
  ['no projection change', /mercator|albers|proj4|d3-geo/i],
  ['no dateline-aware bounds', /antimeridian|dateline|lng \+ 360|\+ 360\)/i],
  ['no geometry simplifier', /simplif(y|ied)\(|douglasPeucker|ramerDouglas/i],
  ['no fourth pane', /inset-3/],
  ['no drop-the-outlier option', /dropOutlier|hideOutlier|excludeCountry/i],
]) ok(!re.test(surface), `Part 7: ${label}`);
ok(/panes\.slice\(2\)|ranked\.slice\(2\)/.test(wmSrc) && !/inset-3/.test(wmCode),
  'Part 7: cluster 3…N folds into pane 3 rather than into a fourth pane');
// The media queries the stylesheet does have, so the reading of Part 7 is checked rather than assumed.
const mqs = [...css.matchAll(/@media[^{]*\{/g)].map((m) => m[0].trim());
note(`  media queries in styles.css: ${mqs.join(' | ')}`);
ok(!mqs.some((m) => /worldmap__pane|viewBox/.test(m)), 'Part 7: no media query decides a pane or a viewBox');

console.log(`\n${fails} FAIL, ${founds} FOUND\n`);
// A FAIL is a clause of A-41/A-42 that does not hold as implemented. A FOUND is a finding:
// the code does what the ruling says and the ruling produces the wrong map. Either exits 1.
process.exit(fails === 0 && founds === 0 ? 0 : 1);
