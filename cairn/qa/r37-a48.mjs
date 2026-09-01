/**
 * QA round 37 — the independent breaker pass over I-8g (ARCHITECTURE §4.4 **A-48**).
 *
 *   Run: node qa/r37-a48.mjs          (bare Node, no browser, no server)
 *
 * Written from A-48 and the shipped source, NOT from the builder's report and NOT by
 * re-pointing round 36's probes — the builder re-pointed `r36-atlas.mjs`/`r36-render.mjs`
 * itself and flagged that as the first thing an independent pass should re-derive. Every
 * number A-48 or BUILD-NOTES states is recomputed here from a second implementation
 * (a second spherical-area formula, a second point-in-polygon, a second connected-components
 * reference) and compared, rather than read.
 *
 * Sections:
 *   A  C2′ / I8 — countryKeyPoint re-derived from scratch over all 239 codes.
 *   B  C2′ edge cases — the exact-area tie, the fallback, degenerate and hostile input.
 *   C  C3′ / I9 — clusterPoints as connected components, order-independence exhaustively.
 *   D  Part 3 — the day map's inherited change, measured on the real Europe 2026 fixture.
 *   E  Part 6 / R36-5 — `pane.aspect`, re-derived from the emitted viewBox; R33-1's pins.
 *   F  C9 / I10 — paint order and containment, in bare geometry.
 *   G  KD-70 — the two-France-one-Greece library, with the ocean fraction measured.
 *   H  KD-69 — the chip list's order, and R36-7's reachability guarantee.
 *   I  cost — countryKeyPoint at the 239-country ceiling.
 *   J  the shipped source's own comments vs. the ruling they cite.
 *
 * A `FAIL` line is a claim (of A-48's, of BUILD-NOTES', or of the code's own comments) that
 * does not hold when re-derived. A `NOTE` line is a measurement recorded for the writeup.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame, WORLD_CLUSTER_THRESHOLD_KM } from '../packages/client/src/selectors/worldMap.ts';
import { countryIndex } from '../packages/core/src/geo/countryIndex.ts';
import { haversine as coreHaversine } from '../packages/core/src/derive/geo.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok     ${label}`);
  else { fails++; console.log(`  FAIL   ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  NOTE   ${s}`);

const IDX = core.COUNTRY_INDEX;
const CODES = [...new Set(IDX.countries.map((c) => c.code))].sort();

// ---- my own primitives, written independently of core's ---------------------
const D2R = Math.PI / 180;
/** Great-circle km. Independent of core's `haversine` (same formula, my own code). */
const km = (a, b) => {
  const s1 = Math.sin(((b.lat - a.lat) * D2R) / 2);
  const s2 = Math.sin(((b.lng - a.lng) * D2R) / 2);
  const h = s1 * s1 + Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * s2 * s2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
};
/**
 * Absolute spherical ring area, km², computed a DIFFERENT way from `ringAreaKm2`:
 * the shoelace of the ring in the Lambert cylindrical equal-area projection
 * (x = λ·R, y = R·sin φ). Mathematically the same quantity; a different expression,
 * so a transcription error in either shows up as a disagreement.
 */
const ringAreaLambert = (r) => {
  const n = r.length;
  if (n < 6) return 0;
  let s = 0;
  for (let i = 0; i + 1 < n; i += 2) {
    const j = (i + 2) % n;
    const x1 = r[i] * D2R, y1 = Math.sin(r[i + 1] * D2R);
    const x2 = r[j] * D2R, y2 = Math.sin(r[j + 1] * D2R);
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs((s / 2) * 6371 * 6371);
};
/** Even-odd point-in-ring, my own. */
const inRing = (p, r) => {
  const n = r.length;
  if (n < 6) return false;
  let inside = false;
  let jx = r[n - 2], jy = r[n - 1];
  for (let i = 0; i + 1 < n; i += 2) {
    const ix = r[i], iy = r[i + 1];
    if ((iy > p.lat) !== (jy > p.lat) && p.lng < ((jx - ix) * (p.lat - iy)) / (jy - iy) + ix) inside = !inside;
    jx = ix; jy = iy;
  }
  return inside;
};
const ringsOf = (code) => { const out = []; for (const e of IDX.countries) if (e.code === code) for (const r of e.rings) out.push(r); return out; };
/** Is p inside the code's own fill (even-odd across all its rings, holes included)? */
const insideOwn = (code, p) => { let x = false; for (const r of ringsOf(code)) if (inRing(p, r)) x = !x; return x; };
const nearestVertexKm = (code, p) => {
  let m = Infinity;
  for (const r of ringsOf(code)) for (let i = 0; i + 1 < r.length; i += 2) {
    const d = km(p, { lat: r[i + 1], lng: r[i] });
    if (d < m) m = d;
  }
  return m;
};
const boxCentreOfRing = (r) => {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (let i = 0; i + 1 < r.length; i += 2) {
    if (r[i] < w) w = r[i]; if (r[i] > e) e = r[i];
    if (r[i + 1] < s) s = r[i + 1]; if (r[i + 1] > n) n = r[i + 1];
  }
  return { lat: (s + n) / 2, lng: (w + e) / 2 };
};

// ===========================================================================
head('A  C2′ / I8 — countryKeyPoint, re-derived from scratch over all 239 codes');

/** My own principal-ring pick, ranked by the Lambert area (not core's formula). */
const myKey = {};
const unionKey = {};   // A-41 C2, the superseded rule — my own oracle
for (const c of CODES) {
  let best = null, bestA = -1;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const entry of IDX.countries) {
    if (entry.code !== c) continue;
    w = Math.min(w, entry.box[0]); s = Math.min(s, entry.box[1]);
    e = Math.max(e, entry.box[2]); n = Math.max(n, entry.box[3]);
    for (const r of entry.rings) {
      if (r.length < 6) continue;
      const a = ringAreaLambert(r);
      if (a > bestA) { bestA = a; best = r; }
    }
  }
  unionKey[c] = { lat: (s + n) / 2, lng: (w + e) / 2 };
  myKey[c] = best === null ? unionKey[c] : boxCentreOfRing(best);
}

const coreKey = {};
for (const c of CODES) coreKey[c] = core.countryKeyPoint(c, IDX);

let keyDiff = [];
for (const c of CODES) {
  const a = myKey[c], b = coreKey[c];
  if (!b || Math.abs(a.lat - b.lat) > 1e-9 || Math.abs(a.lng - b.lng) > 1e-9) keyDiff.push(c);
}
ok(keyDiff.length === 0,
  'core.countryKeyPoint == my independent principal-ring pick (Lambert area) on all 239 codes',
  keyDiff.slice(0, 10));

// the shipped index's rings: closed explicitly, or implicitly?
let openRings = 0, closedRings = 0, oddLen = 0;
for (const e of IDX.countries) for (const r of e.rings) {
  if (r.length % 2) oddLen++;
  if (r.length >= 4 && r[0] === r[r.length - 2] && r[1] === r[r.length - 1]) closedRings++; else openRings++;
}
note(`index rings: ${closedRings} explicitly closed, ${openRings} open (the (i+2)%n wrap is load-bearing for these), ${oddLen} of odd length`);

// I8 — displacement, both metrics, computed by me.
const disp0 = {}, dispRaw = {};
for (const c of CODES) {
  dispRaw[c] = nearestVertexKm(c, coreKey[c]);
  disp0[c] = insideOwn(c, coreKey[c]) ? 0 : dispRaw[c];
}
const inside = CODES.filter((c) => insideOwn(c, coreKey[c]));
const worst0 = CODES.slice().sort((a, b) => disp0[b] - disp0[a]);
const worstRaw = CODES.slice().sort((a, b) => dispRaw[b] - dispRaw[a]);
note(`I8 zero-when-inside metric, worst 6: ${worst0.slice(0, 6).map((c) => `${c} ${disp0[c].toFixed(0)}`).join(' · ')}`);
note(`raw nearest-own-vertex metric, worst 6: ${worstRaw.slice(0, 6).map((c) => `${c} ${dispRaw[c].toFixed(0)}`).join(' · ')}`);
ok(worst0[0] === 'NO' && Math.round(disp0['NO']) === 203,
  "A-48 Part 2: worst key-to-own-geometry distance is 203 km at NO (the zero-when-inside metric)",
  [worst0[0], disp0[worst0[0]]]);
ok(inside.length === 176, 'A-48 Part 2: 176 of 239 key points fall inside their own rings', inside.length);
ok(Math.abs(coreKey['FR'].lat - 46.75) < 0.005 && Math.abs(coreKey['FR'].lng - 1.75) < 0.005,
  'A-48 Part 2: FR key is 46.75°N 1.75°E', coreKey['FR']);
ok(insideOwn('FR', coreKey['FR']), "FR's key point is actually standing on France");
const dk = (a, b) => km(coreKey[a], coreKey[b]);
const frde = Math.round(dk('FR', 'DE')), frcz = Math.round(dk('FR', 'CZ')), frma = Math.round(dk('FR', 'MA'));
ok(frde === 804 && frcz === 1075 && frma === 2227,
  'A-48 Part 2: FR–DE 804 / FR–CZ 1,075 / FR–MA 2,227 km', [frde, frcz, frma]);
ok(frma > frcz, 'the R36-1 inversion is gone: Morocco is now further from France than Czechia is');
// the C2 oracle, my own: does the superseded rule still measure the failure it was ruled on?
const c2disp = {};
for (const c of CODES) c2disp[c] = insideOwn(c, unionKey[c]) ? 0 : nearestVertexKm(c, unionKey[c]);
const c2worst = CODES.slice().sort((a, b) => c2disp[b] - c2disp[a]);
ok(c2worst[0] === 'KI' && Math.round(c2disp['KI']) === 16598,
  'the superseded C2 rule still measures KI at 16,598 km (so the fix is a differential, not an assertion)',
  [c2worst[0], Math.round(c2disp[c2worst[0]])]);
const moved = CODES.filter((c) => coreKey[c].lat !== unionKey[c].lat || coreKey[c].lng !== unionKey[c].lng);
const moved100 = moved.filter((c) => km(coreKey[c], unionKey[c]) > 100);
ok(moved.length === 75 && moved100.length === 35,
  'A-48 Part 2: 75 of 239 keys move, 35 by more than 100 km', [moved.length, moved100.length]);
// C4′'s ten pinned outcome pairs, re-derived at the C2′ keys.
const pairs = [['US','IS',5707],['AU','JP',6793],['US','GB',6946],['US','BR',7182],['GB','JP',9175],
               ['US','MX',1622],['GB','GR',2555],['GB','MA',2912],['ES','FI',3365],['PT','FI',3569]];
const badPair = pairs.filter(([a, b, v]) => Math.round(dk(a, b)) !== v);
ok(badPair.length === 0, "A-48 Part 4's ten outcome pairs re-derive to the kilometre",
  badPair.map(([a, b, v]) => `${a}-${b} want ${v} got ${Math.round(dk(a, b))}`));
// R36-3's withdrawn margin, re-measured at the NEW keys (the code comment still claims 1.5x).
let widestMerge = 0, widestMergeAt = '', closestSplit = Infinity, closestSplitAt = '';
for (let i = 0; i < CODES.length; i++) for (let j = i + 1; j < CODES.length; j++) {
  const d = dk(CODES[i], CODES[j]);
  if (d < WORLD_CLUSTER_THRESHOLD_KM) { if (d > widestMerge) { widestMerge = d; widestMergeAt = `${CODES[i]}-${CODES[j]}`; } }
  else if (d < closestSplit) { closestSplit = d; closestSplitAt = `${CODES[i]}-${CODES[j]}`; }
}
note(`C4′ margin at the C2′ keys: widest merging ${widestMergeAt} ${widestMerge.toFixed(1)} km · closest splitting ${closestSplitAt} ${closestSplit.toFixed(1)} km — ratio ${(closestSplit / widestMerge).toFixed(4)}×`);

// ===========================================================================
head('B  C2′ edge cases — the tie, the fallback, degenerate and hostile input');

const idxOf = (entries) => countryIndex({ scale: 't', source: 't', countries: entries });
// Two rings of EXACTLY equal area, in two entry orders. A-48: "ties break by first occurrence
// in index order (entry order, then ring order)".
const sq = (lng, lat, s) => [lng, lat, lng + s, lat, lng + s, lat + s, lng, lat + s];
// Same size, same latitude band -> identical spherical area to the last bit.
const ringA = sq(0, 10, 2);      // ring "A" at lng 0
const ringB = sq(50, 10, 2);     // ring "B" at lng 50, same shape/latitudes => same area
ok(core.countryKeyPoint('XX', idxOf([{ code: 'XX', rings: [ringA, ringB] }])).lng === 1,
  'exact ring-area tie inside ONE entry: the FIRST ring wins (ring order)',
  core.countryKeyPoint('XX', idxOf([{ code: 'XX', rings: [ringA, ringB] }])));
ok(core.countryKeyPoint('XX', idxOf([{ code: 'XX', rings: [ringB, ringA] }])).lng === 51,
  'the same two rings swapped: the other one wins — so the tie-break really is index order, not geometry');
ok(core.countryKeyPoint('XX', idxOf([{ code: 'XX', rings: [ringA] }, { code: 'XX', rings: [ringB] }])).lng === 1,
  'exact tie across TWO entries of one code: the earlier ENTRY wins (entry order)');
ok(core.countryKeyPoint('XX', idxOf([{ code: 'XX', rings: [ringB] }, { code: 'XX', rings: [ringA] }])).lng === 51,
  'the same two entries swapped: the other one wins');
{ // is the tie exact, or am I testing two unequal areas?
  const src = readFileSync(resolve(CAIRN, 'packages/core/src/derive/country.ts'), 'utf8');
  ok(/if \(area > principalArea\)/.test(src),
    'the tie-break is implemented as a STRICT `>` (keep-earlier), as C2′ specifies');
  // Core's own formula, transcribed from `ringAreaKm2`, so "is this an exact tie" is answered
  // in the arithmetic the tie-break actually runs in. (My Lambert reference differs in the last
  // two bits here — a translation in longitude is exact for the spec form and not for the
  // shoelace — which is itself the reason the tie-break has to be specified at all.)
  const ringAreaSpec = (r) => {
    const n = r.length; if (n < 6) return 0; let s = 0;
    for (let i = 0; i + 1 < n; i += 2) { const j = (i + 2) % n;
      s += (r[j] - r[i]) * D2R * (2 + Math.sin(r[i + 1] * D2R) + Math.sin(r[j + 1] * D2R)); }
    return Math.abs((s * 6371 * 6371) / 2);
  };
  ok(ringAreaSpec(ringA) === ringAreaSpec(ringB),
    "the two test rings have bit-identical area under core's OWN area formula, so the tie above is a real tie",
    [ringAreaSpec(ringA), ringAreaSpec(ringB)]);
  note(`the same two rings under an independent Lambert shoelace differ in the last 2 bits (${ringAreaLambert(ringA)} vs ${ringAreaLambert(ringB)}) — exact ties are formula-dependent, which is why C2′ has to name a tie-break`);
}
// fallback + totality
ok(core.countryKeyPoint('ZZ', IDX) === null, 'a code the index does not carry -> null (first-class, not a guess)');
ok(core.countryKeyPoint('XX', idxOf([{ code: 'XX', rings: [[5, 5, 7, 9]] }])) !== null,
  'a code with only a 2-point ring falls back to the union box rather than returning null');
{
  const f = core.countryKeyPoint('XX', idxOf([{ code: 'XX', rings: [[5, 5, 7, 9]] }]));
  ok(f.lng === 6 && f.lat === 7, 'the fallback really is the union-box centre', f);
}
ok(core.countryKeyPoint('XX', idxOf([{ code: 'XX', rings: [] }])) !== null,
  'a code with NO rings at all still answers (the union box is [Inf,Inf,-Inf,-Inf] -> NaN, not a throw)');
{
  const f = core.countryKeyPoint('XX', idxOf([{ code: 'XX', rings: [] }]));
  note(`a code with zero rings yields ${JSON.stringify(f)} — totality kept, but the answer is not a coordinate`);
  ok(Number.isNaN(f.lat) && Number.isNaN(f.lng), 'and it is NaN rather than a plausible wrong point', f);
}
// a degenerate (zero-area, 3 collinear points) ring beats the fallback — is that C2′?
{
  const f = core.countryKeyPoint('XX', idxOf([{ code: 'XX', rings: [[0, 0, 1, 0, 2, 0]] }]));
  ok(f.lat === 0 && f.lng === 1,
    'a zero-area ring of 3 points is still a "ring of at least three points", so no fallback — matches C2′ as worded', f);
}
// hostile
let threw = null;
try { core.countryKeyPoint(null, IDX); } catch (e) { threw = String(e); }
ok(threw === null, 'countryKeyPoint(null, index) does not throw', threw);
threw = null;
try { core.countryKeyPoint('FR', { scale: '', source: '', countries: [] }); } catch (e) { threw = String(e); }
ok(threw === null, 'countryKeyPoint against an empty index does not throw', threw);
// odd-length ring (a malformed generator) — total?
threw = null;
let oddAns;
try { oddAns = core.countryKeyPoint('XX', idxOf([{ code: 'XX', rings: [[0, 0, 1, 0, 2, 2, 9]] }])); } catch (e) { threw = String(e); }
ok(threw === null, 'an odd-length (malformed) ring does not throw', threw);
note(`odd-length ring answer: ${JSON.stringify(oddAns)}`);
// purity / determinism
ok(JSON.stringify(core.countryKeyPoint('FR', IDX)) === JSON.stringify(core.countryKeyPoint('FR', IDX)),
  'two calls, byte-identical answer (I6)');
{
  const before = JSON.stringify(IDX.countries[0]);
  core.countryKeyPoint('FR', IDX);
  ok(JSON.stringify(IDX.countries[0]) === before, 'the index is not mutated');
}

// ===========================================================================
head('C  C3′ / I9 — connected components, and order-independence exhaustively');

/** My own reference: BFS over the threshold graph. Nothing shared with core. */
const refComponents = (pts, t) => {
  const n = pts.length;
  const adj = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (km(pts[i], pts[j]) < t) { adj[i].push(j); adj[j].push(i); }
  const seen = new Array(n).fill(false);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    const q = [i]; seen[i] = true; const g = [];
    while (q.length) { const v = q.shift(); g.push(v); for (const w of adj[v]) if (!seen[w]) { seen[w] = true; q.push(w); } }
    out.push(g.sort((a, b) => a - b));
  }
  return out.sort((a, b) => a[0] - b[0]);
};
const canon = (groups, names) => groups.map((g) => g.map((i) => names[i]).sort().join('+')).sort().join(' | ');

// C1: the kernel IS connected components, over 3,000 randomised sets.
let seed = 20260901;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
let bad = 0, orderConvention = 0;
for (let t = 0; t < 3000; t++) {
  const n = 1 + Math.floor(rnd() * 12);
  const pts = Array.from({ length: n }, () => ({ lat: rnd() * 170 - 85, lng: rnd() * 360 - 180 }));
  const th = [1.2, 90, 400, 4000, 12000][Math.floor(rnd() * 5)];
  const got = core.clusterPoints(pts, th);
  if (JSON.stringify(got) !== JSON.stringify(refComponents(pts, th))) bad++;
  // the output-order convention: members ascending, groups by smallest member
  for (const g of got) for (let i = 1; i < g.length; i++) if (g[i] <= g[i - 1]) orderConvention++;
  for (let i = 1; i < got.length; i++) if (got[i][0] <= got[i - 1][0]) orderConvention++;
}
ok(bad === 0, 'clusterPoints == an independent BFS connected-components reference on 3,000 random sets', bad);
ok(orderConvention === 0, 'output-order convention holds on all 3,000: members ascending, groups by smallest member', orderConvention);

// haversine's exact symmetry — the only way a permutation could change the EDGE SET.
let asym = 0;
for (let t = 0; t < 200000; t++) {
  const a = { lat: rnd() * 170 - 85, lng: rnd() * 360 - 180 };
  const b = { lat: rnd() * 170 - 85, lng: rnd() * 360 - 180 };
  if (coreHaversine(a, b) !== coreHaversine(b, a)) asym++;
}
ok(asym === 0, 'core.haversine is BIT-exactly symmetric over 200,000 random pairs (the precondition for I9)', asym);

// I9, exhaustively. {AE,AT,GR} over all 6 orderings, then all permutations of larger sets.
const perms = (a) => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
const permTest = (names, th) => {
  const set = new Set();
  for (const p of perms(names)) set.add(canon(core.clusterPoints(p.map((c) => coreKey[c]), th), p));
  return set;
};
{
  const s = permTest(['AE', 'AT', 'GR'], WORLD_CLUSTER_THRESHOLD_KM);
  ok(s.size === 1, '{AE,AT,GR}: ONE partition across all 6 orderings', [...s]);
  note(`{AE,AT,GR} -> ${[...s][0]}`);
}
// every 3-subset of a 24-code well-travelled set, all 6 orderings each (2,024 libraries x 6).
const POOL = ['AE','AR','AT','AU','BR','CA','CH','CZ','DE','DK','EG','ES','FI','FR','GB','GR','HR','HU','IN','IS','IT','JP','MA','US'];
let multi = 0, libs = 0;
for (let i = 0; i < POOL.length; i++) for (let j = i + 1; j < POOL.length; j++) for (let k = j + 1; k < POOL.length; k++) {
  libs++;
  if (permTest([POOL[i], POOL[j], POOL[k]], WORLD_CLUSTER_THRESHOLD_KM).size !== 1) multi++;
}
ok(multi === 0, `I9 over every 3-subset of 24 well-travelled codes (${libs} libraries x 6 orderings)`, multi);
// all 24 orderings of every 4-subset of a 12-code set; all 120 of a few 5-subsets; all 720 of one 6-subset.
const P12 = POOL.slice(0, 12);
let m4 = 0, n4 = 0;
for (let a = 0; a < 12; a++) for (let b = a + 1; b < 12; b++) for (let c = b + 1; c < 12; c++) for (let d = c + 1; d < 12; d++) {
  n4++; if (permTest([P12[a], P12[b], P12[c], P12[d]], WORLD_CLUSTER_THRESHOLD_KM).size !== 1) m4++;
}
ok(m4 === 0, `I9 over every 4-subset of 12 codes (${n4} libraries x 24 orderings)`, m4);
ok(permTest(['US','CA','GL','IS','GB'], WORLD_CLUSTER_THRESHOLD_KM).size === 1,
  "I9 on A-48 residue 5's own chaining example US CA GL IS GB (all 120 orderings)");
note(`US CA GL IS GB -> ${[...permTest(['US','CA','GL','IS','GB'], WORLD_CLUSTER_THRESHOLD_KM)][0]}`);
ok(permTest(['FR','DE','CZ','MA','GR','JP'], WORLD_CLUSTER_THRESHOLD_KM).size === 1,
  'I9 on a 6-code library across all 720 orderings');
// random point sets, all permutations, at n=6 and n=7 — including sets seeded ON the threshold.
let permBad = 0;
for (let t = 0; t < 400; t++) {
  const n = 6;
  const pts = Array.from({ length: n }, () => ({ lat: rnd() * 170 - 85, lng: rnd() * 360 - 180 }));
  const th = [90, 4000, 9000][Math.floor(rnd() * 3)];
  const names = pts.map((_, i) => `p${i}`);
  const set = new Set();
  for (const order of perms([0, 1, 2, 3, 4, 5])) {
    set.add(canon(core.clusterPoints(order.map((i) => pts[i]), th), order.map((i) => names[i])));
  }
  if (set.size !== 1) permBad++;
}
ok(permBad === 0, 'I9 over 400 random 6-point sets x all 720 orderings each (288,000 partitions)', permBad);
// adversarial: pairs sitting exactly ON the threshold, where a strict `<` and a permutation could disagree.
{
  const base = { lat: 0, lng: 0 };
  let onEdge = 0, edgeBad = 0;
  for (let t = 0; t < 500; t++) {
    // binary-search a longitude whose distance from base is as close to 4000 as a double gets
    let lo = 0, hi = 90;
    for (let s = 0; s < 200; s++) { const mid = (lo + hi) / 2; if (km(base, { lat: 0, lng: mid }) < 4000) lo = mid; else hi = mid; }
    const pts = [base, { lat: 0, lng: t % 2 ? lo : hi }, { lat: 40 + rnd(), lng: 20 + rnd() }];
    onEdge++;
    const set = new Set();
    for (const order of perms([0, 1, 2])) set.add(canon(core.clusterPoints(order.map((i) => pts[i]), 4000), order.map((i) => `q${i}`)));
    if (set.size !== 1) edgeBad++;
  }
  ok(edgeBad === 0, `I9 holds for ${onEdge} triples with a pair sitting on the exact 4,000 km threshold`, edgeBad);
}
// C3′ is not a no-op: it must DIFFER from first-fit somewhere, or the "fix" proves nothing.
const firstFit = (pts, t) => {
  const g = [];
  for (let i = 0; i < pts.length; i++) {
    const h = g.find((gr) => gr.some((j) => km(pts[j], pts[i]) < t));
    if (h) h.push(i); else g.push([i]);
  }
  return g;
};
{
  let differs = 0;
  for (let t = 0; t < 2000; t++) {
    const n = 3 + Math.floor(rnd() * 8);
    const pts = Array.from({ length: n }, () => ({ lat: rnd() * 170 - 85, lng: rnd() * 360 - 180 }));
    const th = [400, 4000, 9000][Math.floor(rnd() * 3)];
    const names = pts.map((_, i) => `${i}`);
    if (canon(core.clusterPoints(pts, th), names) !== canon(firstFit(pts, th), names)) differs++;
  }
  ok(differs > 0, `the kernel really is not first-fit: it differs on ${differs} of 2,000 random sets`, differs);
}
// The whole 239-code library: first-fit gave 9 groups in round 36; components should give 1.
{
  const all = CODES.map((c) => coreKey[c]);
  const cc = core.clusterPoints(all, WORLD_CLUSTER_THRESHOLD_KM);
  const ff = firstFit(all, WORLD_CLUSTER_THRESHOLD_KM);
  note(`all 239 codes at 4,000 km: connected components -> ${cc.length} group(s); first-fit -> ${ff.length}`);
  ok(cc.length === 1, 'A-48 residue 5: a 239-code library is ONE component (single-linkage chains the world)', cc.length);
}

// ===========================================================================
head('D  Part 3 — what the day map inherited, on the real Europe 2026 fixture');

const doc = JSON.parse(readFileSync(resolve(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8'));
const trip = core.fromJSON(doc);
const dayStops = trip.days.map((d) => ({ id: d.id, stops: d.stops }));
const allStops = trip.days.flatMap((d) => d.stops);
note(`fixture: ${trip.days.length} days, ${allStops.length} scheduled stops`);
const locatedPts = (stops) => core.stopPoints(stops, trip);
const clusterKeyOf = (stops, th) => {
  const pts = locatedPts(stops);
  return canon(core.clusterPoints(pts, th), pts.map((_, i) => `${i}`));
};
const firstFitKeyOf = (stops, th) => {
  const pts = locatedPts(stops);
  return canon(firstFit(pts, th), pts.map((_, i) => `${i}`));
};
for (const th of [90, 60]) {
  let differing = [];
  let multiDays = 0;
  for (const d of dayStops) {
    if (locatedPts(d.stops).length < 2) continue;
    multiDays++;
    if (clusterKeyOf(d.stops, th) !== firstFitKeyOf(d.stops, th)) differing.push(d.id);
  }
  const whole = clusterKeyOf(allStops, th) === firstFitKeyOf(allStops, th);
  const nGroups = core.clusterPoints(locatedPts(allStops), th).length;
  note(`at ${th} km: ${multiDays} days with 2+ located stops · ${differing.length} differ from first-fit${differing.length ? ' (' + differing.join(', ') + ')' : ''} · whole-set agree=${whole} · ${nGroups} groups over all ${locatedPts(allStops).length} located stops`);
  if (th === 90) {
    ok(multiDays === 16 && differing.length === 0 && whole && nGroups === 8,
      'A-48 Part 3 at 90 km: all 16 multi-stop days agree with first-fit, 8 groups over the 112-stop set',
      [multiDays, differing, whole, nGroups]);
  } else {
    ok(differing.length === 1, 'A-48 Part 3 at 60 km: EXACTLY one day differs (the vacuity control)', differing);
  }
}
// clusterStops / focusCluster really inherit it, and no longer depend on Stop.order.
{
  const day = trip.days.find((d) => locatedPts(d.stops).length >= 4);
  const fwd = core.clusterStops(day.stops, trip).map((g) => g.map((s) => s.id).sort().join('+')).sort().join('|');
  const rev = core.clusterStops(day.stops.slice().reverse(), trip).map((g) => g.map((s) => s.id).sort().join('+')).sort().join('|');
  ok(fwd === rev, `clusterStops is order-independent on ${day.id} (forward vs reversed Stop order)`, [fwd, rev]);
  let orderBad = 0;
  for (const d of trip.days) {
    const a = core.clusterStops(d.stops, trip).map((g) => g.map((s) => s.id).sort().join('+')).sort().join('|');
    const b = core.clusterStops(d.stops.slice().reverse(), trip).map((g) => g.map((s) => s.id).sort().join('+')).sort().join('|');
    if (a !== b) orderBad++;
  }
  ok(orderBad === 0, 'clusterStops: reversing every day\'s stop order changes no partition (the latent day-map defect A-48 names)', orderBad);
  // focusCluster's own answer, which is order-SENSITIVE by design ("the cluster containing the LAST stop")
  let focusMoved = 0;
  for (const d of trip.days) {
    if (locatedPts(d.stops).length < 2) continue;
    const f1 = core.focusCluster(d.stops, trip);
    const f2 = core.focusCluster(d.stops.slice().reverse(), trip);
    if (f1.groups.length !== f2.groups.length) focusMoved++;
  }
  ok(focusMoved === 0, 'focusCluster\'s GROUP COUNT is now order-independent on every fixture day', focusMoved);
}
// goldens: the day-map clustering golden must be byte-neutral.
{
  const g = JSON.parse(readFileSync(resolve(CAIRN, 'fixtures/golden/legacy-clusters.json'), 'utf8'));
  note(`legacy-clusters golden present (${JSON.stringify(g).length} bytes) — regeneration neutrality is checked by \`npm run golden\` below`);
}

// ===========================================================================
head('E  Part 6 / R36-5 — pane.aspect, and R33-1\'s pinned frame');

const rowOf = (code, n = 1) => ({ code, firstVisit: '2020-01-01', lastVisit: '2020-01-10',
  tripIds: Array.from({ length: n }, (_, i) => `${code}-t${i}`), provisional: false });
const statsFor = (rows) => ({ countries: rows, cities: [], trips: { planned: 0, active: 0, completed: 1 },
  daysTravelled: 10, located: { cities: 0, places: 0, stops: 0 },
  unattributed: { cities: 0, places: 0, stops: 0 }, unnamedCities: 0 });
const frameOf = (spec) => worldMapFrame(statsFor(spec.map(([c, n]) => rowOf(c, n))), IDX);

const refStats = core.travelStats([core.tripSummary(trip, IDX)], '2026-08-31');
const ref = worldMapFrame(refStats, IDX);
ok(ref.panes.length === 2 &&
   ref.panes[0].viewBox === '-8.1779 -59.2407 31.494 17.3663' &&
   ref.panes[1].viewBox === '-173.8876 -73.4543 109.0195 56.6347',
  'R33-1 not regressed: the two reference viewBox strings are byte-identical to I-8d\'s',
  ref.panes.map((p) => p.viewBox));
ok(JSON.stringify(ref.panes[0].codes) === '["AT","CZ","DE","GB","HR","HU"]' &&
   JSON.stringify(ref.panes[1].codes) === '["US"]',
  'pane.codes is still canonical row order (I2)', ref.panes.map((p) => p.codes));
// aspect: re-derived from the emitted viewBox string, not read off the field.
let aspBad = 0, aspMin = Infinity, aspMax = 0, aspMaxAt = '', aspMinAt = '';
const checkAspect = (f, label) => {
  for (const p of f.panes) {
    const [, , w, h] = p.viewBox.split(' ').map(Number);
    if (!(Math.abs(p.aspect - w / h) < 1e-12)) { aspBad++; console.log(`  FAIL   aspect != viewBox w/h at ${label}/${p.id}`); fails++; }
    if (p.aspect > aspMax) { aspMax = p.aspect; aspMaxAt = `${label}/${p.id}`; }
    if (p.aspect < aspMin) { aspMin = p.aspect; aspMinAt = `${label}/${p.id}`; }
    if (!Number.isFinite(p.aspect) || p.aspect <= 0) { fails++; console.log(`  FAIL   non-finite/non-positive aspect at ${label}/${p.id}: ${p.aspect}`); }
  }
};
checkAspect(ref, 'reference');
for (const c of CODES) checkAspect(frameOf([[c, 1]]), c);
checkAspect(frameOf([]), 'empty');
checkAspect(frameOf([['ZZ', 1]]), 'all-missing');
ok(aspBad === 0, 'pane.aspect === width/height of the emitted viewBox, over the reference + all 239 single-country libraries');
note(`aspect range over 239 single-country libraries: min ${aspMin.toFixed(3)} at ${aspMinAt}, max ${aspMax.toFixed(3)} at ${aspMaxAt}`);
ok(frameOf([]).panes[0].viewBox === '-180 -90 360 180' && frameOf([]).panes[0].aspect === 2,
  'I7: the empty library is one unpadded whole-world pane with aspect 2');
{ // the disclosed no-min-height case, quantified
  const ru = frameOf([['RU', 1]]);
  note(`RU-only library: viewBox ${ru.panes[0].viewBox}, aspect ${ru.panes[0].aspect.toFixed(2)} -> at a 356 px wide box the map paints ${(356 / ru.panes[0].aspect).toFixed(0)} px tall`);
}
{ // the tallest pane — does aspect-ratio + a static max-height clamp lose anything?
  const tall = CODES.map((c) => [c, frameOf([[c, 1]]).panes[0].aspect]).sort((a, b) => a[1] - b[1])[0];
  note(`narrowest single-country pane: ${tall[0]} aspect ${tall[1].toFixed(3)} -> at max-height 460 px it paints ${(460 * tall[1]).toFixed(0)} px wide inside a 356 px box`);
}

// ===========================================================================
head('F  C9 / I10 — paint order and containment, in bare geometry');

const all239 = frameOf(CODES.map((c) => [c, 1]));
const paintOrder = all239.countries.map((c) => c.code);
const lastEntryAt = new Map();
IDX.countries.forEach((e, i) => lastEntryAt.set(e.code, i));
let po = 0;
for (let i = 1; i < paintOrder.length; i++) if (lastEntryAt.get(paintOrder[i]) > lastEntryAt.get(paintOrder[i - 1])) po++;
ok(po === 0, 'C9: frame.countries is in strictly descending last-entry index position', po);
ok(paintOrder.length === 239, 'every code is emitted exactly once', paintOrder.length);
ok(JSON.stringify([...paintOrder].sort()) === JSON.stringify(CODES), 'the paint-order array is a permutation of the canonical set');

// I10, my own even-odd sweep: is any country's fill entirely inside a LATER-painted country's fill?
const gridPoints = (code, n = 24) => {
  let w = Infinity, s = Infinity, e = -Infinity, nn = -Infinity;
  for (const r of ringsOf(code)) for (let i = 0; i + 1 < r.length; i += 2) {
    if (r[i] < w) w = r[i]; if (r[i] > e) e = r[i];
    if (r[i + 1] < s) s = r[i + 1]; if (r[i + 1] > nn) nn = r[i + 1];
  }
  const out = [];
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    const p = { lng: w + ((e - w) * (a + 0.5)) / n, lat: s + ((nn - s) * (b + 0.5)) / n };
    if (insideOwn(code, p)) out.push(p);
  }
  return out;
};
const rank = new Map(paintOrder.map((c, i) => [c, i]));   // 0 = painted first (bottom)
const stolen = [];
for (const code of CODES) {
  const pts = gridPoints(code);
  if (pts.length === 0) continue;
  let free = 0;
  for (const p of pts) {
    let covered = false;
    for (const other of CODES) {
      if (other === code) continue;
      if (rank.get(other) > rank.get(code) && insideOwn(other, p)) { covered = true; break; }
    }
    if (!covered) free++;
  }
  if (free === 0) stolen.push(`${code} (${pts.length} interior samples, 0 free)`);
}
ok(stolen.length === 0, 'I10: no country\'s fill is entirely contained in a later-painted country\'s fill', stolen);
// the specific host/enclave pairs, and the one C9 relies on
for (const [small, host] of [['AD','FR'],['MC','FR'],['VA','IT'],['SM','IT'],['LI','AT'],['GI','ES']]) {
  const r = rank.get(small) > rank.get(host);
  ok(r, `C9 paints ${small} after ${host} (so ${small} is on top)`, [small, rank.get(small), host, rank.get(host)]);
}
// A-48 residue 6: MF/SX is NOT a containment, so C9 cannot help. MF is the larger of the two
// halves of the island, so C9 paints it FIRST and SX ends up on top of the shared pixel — the
// same loser round 36 measured, unchanged. Recorded so "residue 6 is not worse" is a number.
ok(rank.get('MF') < rank.get('SX'),
  'A-48 residue 6 unchanged: MF is the larger half, so C9 paints it BEFORE SX and SX still owns the shared pixel',
  ['MF', rank.get('MF'), 'SX', rank.get('SX')]);
{
  const mfPts = gridPoints('MF'), sxPts = gridPoints('SX');
  let mfUnderSx = 0;
  for (const p of mfPts) if (insideOwn('SX', p)) mfUnderSx++;
  note(`MF: ${mfPts.length} interior samples, ${mfUnderSx} of them also inside SX's fill — so it is a PIXEL collision at frame scale, not a containment (C9 cannot reach it, as residue 6 says)`);
}
// and the SUPERSEDED canonical order still fails, so the fix is a differential
{
  const canonOrder = [...CODES];
  const crank = new Map(canonOrder.map((c, i) => [c, i]));
  let lostUnderCanonical = [];
  for (const code of ['AD', 'MF', 'MC', 'VA', 'SM', 'LI', 'GI']) {
    const pts = gridPoints(code);
    let free = 0;
    for (const p of pts) {
      let covered = false;
      for (const other of CODES) if (other !== code && crank.get(other) > crank.get(code) && insideOwn(other, p)) { covered = true; break; }
      if (!covered) free++;
    }
    if (free === 0 && pts.length) lostUnderCanonical.push(code);
  }
  ok(lostUnderCanonical.includes('AD'),
    'the superseded canonical paint order still loses AD in bare geometry (the oracle)', lostUnderCanonical);
  note(`under canonical ISO paint order these lose their whole interior: ${lostUnderCanonical.join(', ') || 'none'}`);
}
// C9's proof rests on the index being area-ordered. Is it, entry by entry?
{
  const areaOf = (e) => e.rings.reduce((a, r) => a + ringAreaLambert(r), 0);
  let inversions = 0;
  for (let i = 1; i < IDX.countries.length; i++) if (areaOf(IDX.countries[i]) < areaOf(IDX.countries[i - 1]) - 1e-6) inversions++;
  ok(inversions === 0, "C9's premise: index entries are in ascending summed absolute ring area (A-26 Part 4)", inversions);
  // multi-entry codes: C9 ranks by the LAST entry. Does that keep the proof?
  const counts = new Map();
  for (const e of IDX.countries) counts.set(e.code, (counts.get(e.code) || 0) + 1);
  const multiEntry = [...counts].filter(([, n]) => n > 1);
  note(`${multiEntry.length} codes carry more than one index entry; C9 ranks each by its LAST entry's position`);
}

// ===========================================================================
head('G  KD-70 — the two-France-one-Greece library, with the ocean measured');

const frgr = frameOf([['FR', 2], ['GR', 1]]);
ok(frgr.panes.length === 1, "I-8g's literal ship criterion: ONE pane", frgr.panes.map((p) => p.codes));
ok(JSON.stringify(frgr.panes[0].codes) === '["FR","GR"]', 'and it contains both FR and GR', frgr.panes[0].codes);
{
  const [x, y, w, h] = frgr.panes[0].viewBox.split(' ').map(Number);
  const bw = frgr.panes[0].bounds.east - frgr.panes[0].bounds.west;
  const bh = frgr.panes[0].bounds.north - frgr.panes[0].bounds.south;
  note(`KD-70 pane: viewBox ${frgr.panes[0].viewBox} -> PAINTED ${w.toFixed(1)}° x ${h.toFixed(1)}°, aspect ${frgr.panes[0].aspect.toFixed(3)}`);
  ok(Math.abs(bw - 81.1) < 0.05 && Math.abs(bh - 49.1) < 0.05,
    "BUILD-NOTES' 81.1° x 49.1° re-derived — but that is the UNPADDED `bounds`; the viewBox the user actually sees is "
    + `${w.toFixed(1)}° x ${h.toFixed(1)}°`, [bw, bh]);
  // how much of that rectangle is actually drawn land?
  const N = 220;
  let land = 0, total = 0;
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
    const lng = x + (w * (a + 0.5)) / N;
    const lat = -(y + (h * (b + 0.5)) / N);
    total++;
    if (insideOwn('FR', { lat, lng }) || insideOwn('GR', { lat, lng })) land++;
  }
  note(`KD-70: ${((100 * land) / total).toFixed(2)}% of the main pane's area is drawn country; ${(100 - (100 * land) / total).toFixed(2)}% is empty`);
  // and the comparison the builder makes: I-8d framed FR alone in the main pane. Same measurement.
  {
    const frOnly = frameOf([['FR', 2]]);
    const [x2, y2, w2, h2] = frOnly.panes[0].viewBox.split(' ').map(Number);
    let land2 = 0, tot2 = 0;
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const lng = x2 + (w2 * (a + 0.5)) / N, lat = -(y2 + (h2 * (b + 0.5)) / N);
      tot2++; if (insideOwn('FR', { lat, lng })) land2++;
    }
    note(`for comparison, I-8d's main pane for this library (FR alone) is ${w2.toFixed(1)}° x ${h2.toFixed(1)}° and ${((100 * land2) / tot2).toFixed(2)}% land — so I-8g's single pane is WIDER and a smaller fraction of it is country`);
  }
  // what a frame over metropolitan France + Greece WOULD be (the extent fix C8 does not do)
  const principalBox = (code) => {
    let best = null, bestA = -1;
    for (const e of IDX.countries) { if (e.code !== code) continue; for (const r of e.rings) { const a = ringAreaLambert(r); if (a > bestA) { bestA = a; best = r; } } }
    let W = Infinity, S = Infinity, E = -Infinity, Nn = -Infinity;
    for (let i = 0; i + 1 < best.length; i += 2) { W = Math.min(W, best[i]); E = Math.max(E, best[i]); S = Math.min(S, best[i + 1]); Nn = Math.max(Nn, best[i + 1]); }
    return [W, S, E, Nn];
  };
  const [fw, fs, fe, fn] = principalBox('FR'), [gw, gs, ge, gn] = principalBox('GR');
  note(`for comparison, a principal-ring extent over FR+GR would be ${(Math.max(fe, ge) - Math.min(fw, gw)).toFixed(1)}° x ${(Math.max(fn, gn) - Math.min(fs, gs)).toFixed(1)}° — that is a C8 change and is NOT built`);
  // is Greece legible? measure GR's drawn width as a fraction of the pane
  let gwmin = Infinity, gwmax = -Infinity, ghmin = Infinity, ghmax = -Infinity;
  for (const r of ringsOf('GR')) for (let i = 0; i + 1 < r.length; i += 2) {
    gwmin = Math.min(gwmin, r[i]); gwmax = Math.max(gwmax, r[i]);
    ghmin = Math.min(ghmin, r[i + 1]); ghmax = Math.max(ghmax, r[i + 1]);
  }
  note(`GR occupies ${(((gwmax - gwmin) / w) * 100).toFixed(1)}% of the pane's width and ${(((ghmax - ghmin) / h) * 100).toFixed(1)}% of its height`);
}
// R36-2's own worked example, end to end
{
  const f = frameOf([['AE', 1], ['AT', 1], ['GR', 3]]);
  ok(f.panes.length === 1 && JSON.stringify(f.panes[0].codes) === '["AE","AT","GR"]',
    'R36-2 fixed end to end: {AE 1, AT 1, GR 3} is one pane, Austria no longer "shown separately"',
    f.panes.map((p) => p.codes));
}

// ===========================================================================
head('H  KD-69 — the chip list\'s order, and R36-7\'s reachability fallback');

{
  const codes = ref.countries.map((c) => c.code);
  const alpha = [...codes].sort();
  ok(JSON.stringify(codes) !== JSON.stringify(alpha),
    "KD-69 confirmed: frame.countries (what the chip list renders) is NOT alphabetical", codes);
  note(`reference library chip order: ${codes.join(' ')}  (alphabetical would be ${alpha.join(' ')})`);
  ok(codes.length === alpha.length && new Set(codes).size === codes.length,
    'the list is still COMPLETE and duplicate-free — R36-7\'s fallback is intact');
  const big = all239.countries.map((c) => c.code);
  ok(big.includes('MF') && big.includes('SX') && big.includes('AD'),
    'MF, SX and AD are all still in the emitted list at 239 codes');
  const view = readFileSync(resolve(CAIRN, 'apps/web/src/views/WorldMap.tsx'), 'utf8');
  ok(!/\.sort\(/.test(view), 'WorldMap.tsx still sorts nothing (A-40 Part 2 / the "renderer computes nothing" ceiling)');
  const m = view.match(/codelist[\s\S]{0,400}/);
  note(`.codelist source: ${(m ? m[0] : '').replace(/\s+/g, ' ').slice(0, 220)}`);
}

// ===========================================================================
head('I  cost — countryKeyPoint at the 239-country ceiling');

{
  const t0 = process.hrtime.bigint();
  for (const c of CODES) core.countryKeyPoint(c, IDX);
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;
  note(`239 countryKeyPoint calls over the shipped index: ${ms.toFixed(1)} ms (${(ms / 239).toFixed(2)} ms each)`);
  const t2 = process.hrtime.bigint();
  frameOf(CODES.map((c) => [c, 1]));
  const t3 = process.hrtime.bigint();
  note(`a full 239-code worldMapFrame: ${(Number(t3 - t2) / 1e6).toFixed(1)} ms`);
  const t4 = process.hrtime.bigint();
  worldMapFrame(refStats, IDX);
  const t5 = process.hrtime.bigint();
  note(`the shipped sample's 7-code frame: ${(Number(t5 - t4) / 1e6).toFixed(1)} ms`);
  let verts = 0;
  for (const e of IDX.countries) for (const r of e.rings) verts += r.length / 2;
  note(`index size: ${IDX.countries.length} entries, ${IDX.countries.reduce((a, e) => a + e.rings.length, 0)} rings, ${verts} vertices — countryKeyPoint walks all of them once PER CODE`);
}

// ===========================================================================
head('J  the shipped source vs. the ruling it cites');

{
  const wm = readFileSync(resolve(CAIRN, 'packages/client/src/selectors/worldMap.ts'), 'utf8');
  ok(!/1\.5×|1\.5x/.test(wm),
    "worldMap.ts no longer claims C4's withdrawn \"≥1.5× margin on the split side\" (A-48 Part 4 withdrew it as false)",
    (wm.match(/[^\n]*1\.5×[^\n]*/g) || []).map((s) => s.trim()));
  ok(!/5,998|5998/.test(wm),
    'worldMap.ts no longer quotes US–IS at 5,998 km (a C2-era number; under C2′ it is 5,707)',
    (wm.match(/[^\n]*5,998[^\n]*/g) || []).map((s) => s.trim()));
  ok(!/first-fit/.test(wm),
    'worldMap.ts no longer describes core\'s kernel as "first-fit" (C3′ replaced it with connected components)',
    (wm.match(/[^\n]*first-fit[^\n]*/g) || []).map((s) => s.trim()));
  const cl = readFileSync(resolve(CAIRN, 'packages/core/src/derive/cluster.ts'), 'utf8');
  ok(/connected components/.test(cl), 'cluster.ts documents the connected-components rule');
  const idx = readFileSync(resolve(CAIRN, 'packages/core/src/index.ts'), 'utf8');
  ok(/countryKeyPoint/.test(idx), 'countryKeyPoint is on the export surface');
  const surface = Object.keys(core).length;
  note(`packages/core export surface: ${surface} symbols (Object.keys on the built namespace)`);
  ok(surface === 78, 'export surface is 78 (77 -> 78 for countryKeyPoint)', surface);
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}`);
process.exit(fails === 0 ? 0 : 1);
