/**
 * QA round 39 — the independent breaker pass over I-8i (ARCHITECTURE §4.4 **A-51** + **A-52**
 * + **A-53**, revisions 35–36).
 *
 *   Run: node qa/r39-a51.mjs           (bare Node, no browser, no server)
 *
 * Written from A-51/A-52/A-53 and the shipped source. **It does not re-point, re-run or trust
 * `qa/i8i-*`, and it does not use `r38-a49.mjs`'s `myFrameA51`** — that second implementation was
 * written by the builder of this increment, so comparing the shipped frame to it compares one
 * author to himself. Every number below comes from primitives written in this file: my own
 * haversine, my own union-find connected components (a different algorithm from core's kernel),
 * my own Lambert equal-area ring area, my own bounds + padding, and my own G1…G8.
 *
 * Sections:
 *   A  A-52 attacked at its own boundary — what `countryParts` now does with a ring the index
 *      carries that has no points, and whether its stated "[] iff no ring at all" iff holds.
 *   B  the shipped frame vs. MY G1…G5, string for string, over 24 libraries.
 *   C  Jacob's #1 — `FR` alone. Order, and whether I18's key is load-bearing or decorative.
 *   D  Jacob's #2 — `FR`+`US`. Four panes, weights, spans, home-before-extent.
 *   E  Jacob's #3 — the Europe 2026 fixture, from the REAL sample library, byte-identity.
 *   F  Jacob's #4 — sparse multi-region histories, five of my own construction.
 *   G  Jacob's #5 — the 239-code ceiling, and a sweep for a library between sparse and
 *      everything that produces an unreasonable pane count or a degenerate pane.
 *   H  I18, I5, I1, I2, I13, L4 over 239 single + all 28,441 two-country libraries.
 *   I  the extent-pane census, recomputed from the raw index rather than from `countryParts`.
 *   J  the ">120° panes all contain AQ/FJ/KI/RU/UM" recount.
 *   K  KD-74 — is `clusterPoints`' output order really what the third key assumes, and is the
 *      key a no-op? Measured, then stressed with a permuted kernel.
 *   L  I17 locality, and I6/L5 determinism (row permutation, ISO-code permutation).
 *   M  the `cairn-constraints` greps: zero-dep core/client, no DOM in packages/client,
 *      no ambient clock or randomness.
 *
 * A `FAIL` is a claim of A-51/A-52/A-53, of BUILD-NOTES, or of the shipped source's own
 * comments that does not hold when re-derived. `NOTE` is a measurement for the writeup.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame, WORLD_CLUSTER_THRESHOLD_KM } from '../packages/client/src/selectors/worldMap.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

let fails = 0;
const ok = (c, l, x) => {
  if (c) console.log(`  ok     ${l}`);
  else { fails++; console.log(`  FAIL   ${l}${x === undefined ? '' : `  -> ${JSON.stringify(x)}`}`); }
};
const note = (s) => console.log(`  NOTE   ${s}`);
const head = (s) => console.log(`\n== ${s} ==`);

const IDX = core.COUNTRY_INDEX;
const CODES = [...new Set(IDX.countries.map((c) => c.code))].sort();
const T = WORLD_CLUSTER_THRESHOLD_KM;

// ---------------------------------------------------------------------------
// My own primitives.
// ---------------------------------------------------------------------------
const D2R = Math.PI / 180;
const R_KM = 6371;

/** Great-circle km. Mine. */
const km = (a, b) => {
  const s1 = Math.sin(((b.lat - a.lat) * D2R) / 2);
  const s2 = Math.sin(((b.lng - a.lng) * D2R) / 2);
  const h = s1 * s1 + Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * s2 * s2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * |area| of a ring, km², by the shoelace of the Lambert cylindrical EQUAL-AREA projection
 * (x = λ·R, y = R·sin φ) — a different route from core's spherical-excess formula, so a bug in
 * one does not hide in the other. Only the RANKING of rings matters here, and equal-area
 * projections preserve it.
 */
const myRingArea = (ring) => {
  let s = 0;
  const n = Math.floor(ring.length / 2);
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = ring[2 * i] * D2R * R_KM, y1 = R_KM * Math.sin(ring[2 * i + 1] * D2R);
    const x2 = ring[2 * j] * D2R * R_KM, y2 = R_KM * Math.sin(ring[2 * j + 1] * D2R);
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
};

/**
 * Single-linkage connected components by **union-find with path compression**, over a threshold
 * graph. Core's kernel is a BFS/label sweep; this is a disjoint-set forest, so the two agree only
 * if the partition itself is right. Output convention here is deliberately DIFFERENT — components
 * keyed by root, emitted in ascending lowest-member order only after an explicit sort — so §K can
 * ask whether the shipped code depends on the kernel's convention.
 */
const myComponents = (points, thresholdKm) => {
  const n = points.length;
  const p = [...Array(n).keys()];
  const find = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
  const uni = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) p[ra] = rb; };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (km(points[i], points[j]) < thresholdKm) uni(i, j);
  const by = new Map();
  for (let i = 0; i < n; i++) { const r = find(i); if (!by.has(r)) by.set(r, []); by.get(r).push(i); }
  return [...by.values()].sort((a, b) => a[0] - b[0]);
};

/** My ringBox. */
const myRingBox = (ring) => {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    if (ring[i] < w) w = ring[i];
    if (ring[i] > e) e = ring[i];
    if (ring[i + 1] < s) s = ring[i + 1];
    if (ring[i + 1] > n) n = ring[i + 1];
  }
  return [w, s, e, n];
};

/** My countryParts — A-49 Part 2 + A-52, from the ruling text. */
const myParts = (code, index, t) => {
  const rings = [];
  for (const e of index.countries) if (e.code === code) for (const r of e.rings) rings.push(r);
  if (rings.length === 0) return [];
  const boxes = rings.map(myRingBox);
  const pts = boxes.map((b) => ({ lat: (b[1] + b[3]) / 2, lng: (b[0] + b[2]) / 2 }));
  const areas = rings.map(myRingArea);
  let pr = 0;
  for (let i = 1; i < rings.length; i++) if (areas[i] > areas[pr]) pr = i;
  return myComponents(pts, t).map((g) => {
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity, key = g[0];
    for (const i of g) {
      const b = boxes[i];
      if (b[0] < w) w = b[0]; if (b[1] < s) s = b[1];
      if (b[2] > e) e = b[2]; if (b[3] > n) n = b[3];
      if (areas[i] > areas[key]) key = i;
    }
    return { box: [w, s, e, n], key: pts[key], rings: g.map((i) => rings[i]), principal: g.includes(pr) };
  });
};

const num = (x) => { const r = Math.round(x * 1e4) / 1e4; return Object.is(r, -0) ? '0' : String(r); };

/**
 * MY worldMapFrame, straight off A-51 G1…G5 and A-53. `mapBounds` is core's own — A-51 G4 says
 * the extent IS `core.mapBounds` over the box corners, so re-implementing it would be testing a
 * different contract. Everything that decides membership, `home`, `weight` and ORDER is mine.
 */
const myFrame = (stats, index, t = T) => {
  const drawn = [], missing = [];
  for (const row of stats.countries) {
    const parts = myParts(row.code, index, t);
    if (parts.length === 0) { missing.push(row.code); continue; }
    drawn.push({ code: row.code, trips: row.tripIds.length, parts });
  }
  const atoms = [];
  drawn.forEach((d, k) => d.parts.forEach((part) => atoms.push({ owner: k, part })));
  const comps = myComponents(atoms.map((a) => a.part.key), t);
  const built = comps.map((members) => {
    const owners = [...new Set(members.map((i) => atoms[i].owner))].sort((a, b) => a - b);
    const home = owners.filter((k) => members.some((i) => atoms[i].owner === k && atoms[i].part.principal));
    return {
      members, lowest: Math.min(...members),
      codes: owners.map((k) => drawn[k].code),
      home: home.map((k) => drawn[k].code),
      weight: home.reduce((n, k) => n + drawn[k].trips, 0),
    };
  });
  built.sort((a, b) => (b.weight - a.weight) || (b.home.length - a.home.length) || (a.lowest - b.lowest));
  const panes = built.map((g, i) => {
    const corners = g.members.flatMap((m) => {
      const [w, s, e, n] = atoms[m].part.box;
      return [{ lat: s, lng: w }, { lat: s, lng: e }, { lat: n, lng: e }, { lat: n, lng: w }];
    });
    const b = core.mapBounds(corners);
    if (b.empty) return { id: `p${i}`, viewBox: '-180 -90 360 180', aspect: 2, bounds: b, codes: g.codes, home: g.home, weight: g.weight };
    const w = b.east - b.west, h = b.north - b.south;
    const pad = 0.02 * Math.max(w, h);
    const W = num(w + 2 * pad), H = num(h + 2 * pad);
    return {
      id: `p${i}`, viewBox: `${num(b.west - pad)} ${num(-(b.north + pad))} ${W} ${H}`,
      aspect: Number(W) / Number(H), bounds: b, codes: g.codes, home: g.home, weight: g.weight,
    };
  });
  if (panes.length === 0) {
    const b = core.mapBounds([]);
    panes.push({ id: 'p0', viewBox: '-180 -90 360 180', aspect: 2, bounds: b, codes: [], home: [], weight: 0 });
  }
  return { panes, missing, codes: drawn.map((d) => d.code) };
};

/** A `TravelStats` shaped exactly as the map's input, from a list of codes (canonical order). */
const stats = (codes, tripsPer = {}) => {
  const cs = [...new Set(codes)].sort();
  return {
    countries: cs.map((c) => ({
      code: c, firstVisit: '2020-01-01', lastVisit: '2020-01-05',
      tripIds: Array.from({ length: tripsPer[c] ?? 1 }, (_, i) => `t${i}`), provisional: false,
    })),
    cities: [], trips: { completed: 1, active: 0, planned: 0 }, daysTravelled: 5,
    located: { stops: 0, places: 0 }, unattributed: { stops: 0, places: 0 },
  };
};

const spanOf = (p) => {
  const [, , w, h] = p.viewBox.split(' ').map(Number);
  return { w, h };
};

// ===========================================================================
head('A  A-52 at its own boundary — a ring the index carries with no points in it');
// ===========================================================================
{
  let minRing = Infinity, zeroRingEntries = 0, odd = 0, n = 0;
  for (const e of IDX.countries) {
    if (e.rings.length === 0) zeroRingEntries++;
    for (const r of e.rings) { n++; minRing = Math.min(minRing, r.length); if (r.length % 2) odd++; }
  }
  note(`shipped index: ${IDX.countries.length} entries, ${n} rings, shortest ${minRing} numbers ` +
    `(${minRing / 2} points), ${zeroRingEntries} entries with no ring, ${odd} odd-length rings`);
  ok(n === 1033 && minRing === 8, 'BUILD-NOTES\' index census re-derived: 1,033 rings, smallest 4 points', [n, minRing]);
  ok(zeroRingEntries === 0 && odd === 0, 'the SHIPPED artefact cannot reach any of the cases below', [zeroRingEntries, odd]);

  const S = stats(['ZZ']);

  // A-52's own "iff": `[]` iff the index carries no ring at all, "which is exactly when
  // countryKeyPoint returns null, so the two functions stop disagreeing".
  const noRings = { countries: [{ code: 'ZZ', box: [0, 0, 10, 10], rings: [] }] };
  const pNo = core.countryParts('ZZ', noRings, T), kNo = core.countryKeyPoint('ZZ', noRings);
  note(`entry with a finite box and NO rings: countryParts=${JSON.stringify(pNo)} countryKeyPoint=${JSON.stringify(kNo)}`);
  ok(pNo.length === 0 && kNo === null,
    'A-52: `countryParts` === [] IFF `countryKeyPoint` === null — the two functions agree',
    { parts: pNo.length, key: kNo });

  // The filter A-52 removed from `countryParts` is STILL in `countryKeyPoint` (country.ts:184).
  const twoPt = { countries: [{ code: 'ZZ', box: [-50, -50, 50, 50], rings: [[5, 5, 6, 6]] }] };
  const pr = core.countryParts('ZZ', twoPt, T).find((p) => p.principal);
  const kp = core.countryKeyPoint('ZZ', twoPt);
  note(`only a 2-point ring: principal part key=${JSON.stringify(pr?.key)} countryKeyPoint=${JSON.stringify(kp)}`);
  ok(pr && kp && Object.is(pr.key.lat, kp.lat) && Object.is(pr.key.lng, kp.lng),
    'I12 on an index A-52 now admits: the principal part\'s key IS countryKeyPoint', [pr?.key, kp]);

  // The zero-point ring: `ringBox` returns [Inf, Inf, -Inf, -Inf], so the part's key is NaN.
  for (const [label, rings] of [['a ring with no points `[]`', [[]]], ['an odd-length ring `[7]`', [[7]]]]) {
    const idx = { countries: [{ code: 'ZZ', box: [0, 0, 10, 10], rings }] };
    const parts = core.countryParts('ZZ', idx, T);
    const f = worldMapFrame(S, idx);
    note(`${label}: parts=${parts.length}, frame.viewBox=${JSON.stringify(f.viewBox)}, ` +
      `missing=${JSON.stringify(f.missing)}, aspect=${f.panes[0].aspect}, d=${JSON.stringify(f.countries.map((c) => c.d))}`);
    ok(!f.viewBox.includes('NaN') && Number.isFinite(f.panes[0].aspect),
      `${label}: the frame is a frame — no NaN in the viewBox or the aspect`, f.viewBox);
    ok(f.missing.includes('ZZ') || f.countries.some((c) => c.d !== ''),
      `${label}: A-40 clause 3 — the code is either DRAWN or STATED in \`missing\`, never silently blank`,
      { missing: f.missing, d: f.countries.map((c) => c.d) });
  }

  // The same two inputs under I-8h's rule, to show which side of the increment this is on.
  note('under I-8h\'s `ring.length >= 6` filter both inputs yielded `[]` -> `missing` -> stated in words');
}

// ===========================================================================
head('B  the shipped frame vs. MY OWN G1…G5, string for string');
// ===========================================================================
const LIBS = {
  'reference sample': ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US'],
  'FR': ['FR'],
  'US': ['US'],
  'UM': ['UM'],
  'FR+US': ['FR', 'US'],
  'FR+GR': ['FR', 'GR'],
  'FR+NZ': ['FR', 'NZ'],
  'GB+AU': ['GB', 'AU'],
  'US+JP': ['US', 'JP'],
  'AT CZ DE HR HU SI': ['AT', 'CZ', 'DE', 'HR', 'HU', 'SI'],
  'AT CZ DE ES FR IT JP': ['AT', 'CZ', 'DE', 'ES', 'FR', 'IT', 'JP'],
  'FR DE IT JP PE': ['FR', 'DE', 'IT', 'JP', 'PE'],
  'FR DE IT LU MC VA AD': ['FR', 'DE', 'IT', 'LU', 'MC', 'VA', 'AD'],
  'worldwide 12': ['US', 'BR', 'GB', 'FR', 'ZA', 'EG', 'IN', 'JP', 'AU', 'NZ', 'TH', 'PE'],
  'greedy 14': ['AD', 'AE', 'AG', 'AO', 'AQ', 'AR', 'AS', 'AU', 'CA', 'CN', 'FM', 'IO', 'PN', 'TF'],
  'ceiling 239': CODES,
  // mine
  'sparse: IS NZ MN': ['IS', 'NZ', 'MN'],
  'sparse: CL NO JP MG': ['CL', 'NO', 'JP', 'MG'],
  'sparse: CA AU ZA RU': ['CA', 'AU', 'ZA', 'RU'],
  'sparse: PF SH TO': ['PF', 'SH', 'TO'],
  'sparse: SG GL UY': ['SG', 'GL', 'UY'],
  'FR+SR (Guiana adopted)': ['FR', 'SR'],
  'UM+US': ['UM', 'US'],
  'FR UM US': ['FR', 'UM', 'US'],
};
const SHIPPED = {};
for (const [name, codes] of Object.entries(LIBS)) {
  const s = stats(codes);
  const f = worldMapFrame(s, IDX);
  SHIPPED[name] = f;
  const m = myFrame(s, IDX);
  const shipKey = f.panes.map((p) => [p.id, p.viewBox, p.codes.join('+'), p.home.join('+'), p.weight]);
  const mineKey = m.panes.map((p) => [p.id, p.viewBox, p.codes.join('+'), p.home.join('+'), p.weight]);
  ok(JSON.stringify(shipKey) === JSON.stringify(mineKey),
    `${name}: ${f.panes.length} pane(s) — id, viewBox, codes, home and weight all match my own derivation`,
    { shipped: shipKey, mine: mineKey });
}

// ===========================================================================
head('C  Jacob #1 — `FR` alone: is I18 load-bearing or decorative?');
// ===========================================================================
{
  const f = SHIPPED['FR'];
  const raw = core.countryParts('FR', IDX, T);
  note(`countryParts('FR') raw order: ${raw.map((p, i) => `${i}:${p.principal ? 'principal' : 'non-principal'} ` +
    `[${p.box.map((n) => n.toFixed(2)).join(',')}]`).join(' | ')}`);
  ok(raw.length === 2, '`FR` has exactly two parts at 4,000 km', raw.length);
  ok(raw[0].principal === false,
    'A-53 Part 5(3): the RAW component order really does put the NON-principal part first ' +
    '(so the ordering key is doing real work, not decorating an already-correct order)',
    raw.map((p) => p.principal));
  ok(f.panes.length === 2, '`FR` alone is two panes', f.panes.length);
  ok(f.panes[0].home.join() === 'FR' && f.panes[0].weight === 1,
    'panes[0] is the HOME pane — continental France', [f.panes[0].home, f.panes[0].weight]);
  const s0 = spanOf(f.panes[0]), s1 = spanOf(f.panes[1]);
  note(`FR panes: p0 ${s0.w.toFixed(2)}° x ${s0.h.toFixed(2)}° home=${JSON.stringify(f.panes[0].home)} ; ` +
    `p1 ${s1.w.toFixed(2)}° x ${s1.h.toFixed(2)}° home=${JSON.stringify(f.panes[1].home)}`);
  ok(s0.w > 10 && s0.w < 20 && s1.w < 5,
    'p0 is continental France (~14.4° wide) and p1 is French Guiana (~3° wide), not the other way round',
    [s0.w, s1.w]);
  ok(f.viewBox === f.panes[0].viewBox && !f.viewBox.startsWith('-54'),
    'frame.viewBox (the compatibility field) is continental France, not South America', f.viewBox);

  // Break the ordering key and watch the map open on Guiana. This is the assertion that says the
  // key is load-bearing rather than agreeing with an order that was already right.
  const src = readFileSync(join(CAIRN, 'packages/client/src/selectors/worldMap.ts'), 'utf8');
  ok(/if \(a\.weight !== b\.weight\) return b\.weight - a\.weight;/.test(src),
    'G5\'s first key is `weight` descending, in the source', undefined);
  // Simulate the mutation in MY implementation, which is the same algorithm: order by the
  // component's canonical position only (i.e. G5 deleted).
  {
    const s = stats(['FR']);
    const m = myFrame(s, IDX);
    const rawOrder = [...m.panes].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
    // rebuild without G5: components in kernel order
    const parts = myParts('FR', IDX, T);
    const comps = myComponents(parts.map((p) => p.key), T);
    const firstIsPrincipal = parts[comps[0][0]].principal;
    ok(firstIsPrincipal === false,
      'with G5 deleted the frame would open on the NON-principal part — the key is load-bearing',
      firstIsPrincipal);
    void rawOrder;
  }
}

// ===========================================================================
head('D  Jacob #2 — `FR`+`US`');
// ===========================================================================
{
  const f = SHIPPED['FR+US'];
  ok(f.panes.length === 4, 'four panes', f.panes.length);
  const shape = f.panes.map((p) => [p.codes.join('+'), p.home.join('+'), p.weight, +spanOf(p).w.toFixed(2), +spanOf(p).h.toFixed(2)]);
  note(`FR+US panes in order: ${JSON.stringify(shape)}`);
  ok(JSON.stringify(f.panes.map((p) => p.home.join('+'))) === JSON.stringify(['FR', 'US', '', '']),
    'order is FR (home) · US (home) · extent · extent — I18 holds on the case A-53 was written for',
    f.panes.map((p) => p.home));
  ok(JSON.stringify(f.panes.map((p) => p.weight)) === JSON.stringify([1, 1, 0, 0]),
    'weights are 1 · 1 · 0 · 0', f.panes.map((p) => p.weight));
  ok(f.panes.every((p) => p.codes.length > 0), 'no pane has an empty code list', shape);
  // L2/I17 in its sharpest form: FR alone vs FR+US
  const alone = SHIPPED['FR'];
  ok(alone.panes[0].viewBox === f.panes[0].viewBox,
    'I17: France\'s pane is BYTE-IDENTICAL with and without `US` in the library (R38-2\'s defect)',
    [alone.panes[0].viewBox, f.panes[0].viewBox]);
  ok(alone.panes[1].viewBox === f.panes[2].viewBox,
    'I17: French Guiana\'s pane is byte-identical too', [alone.panes[1].viewBox, f.panes[2].viewBox]);
  const usAlone = SHIPPED['US'];
  ok(usAlone.panes[0].viewBox === f.panes[1].viewBox && usAlone.panes[1].viewBox === f.panes[3].viewBox,
    'I17: and so are both of the US\'s panes', undefined);
  // and the pre-I-8i defect shape: a pane wide because of something that is not its subject.
  // The bound is L1's own theorem — Σ diam(part) + (n−1)·threshold — so a pane is allowed to be
  // as wide as its own geometry and no wider. The US at 60.0° is the contiguous US; the strip
  // R38-2 measured was 134.2° and held France AND the US.
  for (const p of f.panes) {
    const { w, h } = spanOf(p);
    ok(w <= 120 && h <= 120, `no FR+US pane recreates the 134°-wide strip (${p.codes.join('+')} is ${w.toFixed(1)}° x ${h.toFixed(1)}°)`, [w, h]);
  }
}

// ===========================================================================
head('E  Jacob #3 — the Europe 2026 fixture, from the REAL sample');
// ===========================================================================
{
  const f = SHIPPED['reference sample'];
  const want = ['-8.1779 -59.2407 31.494 17.3663', '-125.8416 -50.5435 60.0314 26.618', '-172.8399 -72.4066 43.9088 54.5393'];
  ok(JSON.stringify(f.panes.map((p) => p.viewBox)) === JSON.stringify(want),
    'the three viewBox strings are byte-identical to what I-8d/I-8g/I-8h shipped', f.panes.map((p) => p.viewBox));
  ok(JSON.stringify(f.panes.map((p) => p.codes.join(' '))) === JSON.stringify(['AT CZ DE GB HR HU', 'US', 'US']),
    'codes per pane', f.panes.map((p) => p.codes));
  ok(JSON.stringify(f.panes.map((p) => p.home.join(' '))) === JSON.stringify(['AT CZ DE GB HR HU', 'US', '']),
    'home per pane — the third pane is an EXTENT pane (Alaska)', f.panes.map((p) => p.home));
  ok(JSON.stringify(f.panes.map((p) => p.weight)) === JSON.stringify([6, 1, 0]), 'weights 6 · 1 · 0', f.panes.map((p) => p.weight));
  ok(f.panes.reduce((n, p) => n + p.weight, 0) === 7, 'I5: Σ weight === W === 7', undefined);

  // the same, but through the ACTUAL generated sample document rather than a hand-made stats
  try {
    const sample = JSON.parse(readFileSync(join(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8'));
    const codes = [...new Set((sample.cities ?? []).map((c) => c.countryCode))].filter(Boolean).sort();
    note(`the generated sample document names countries: ${codes.join(' ')}`);
    const g = worldMapFrame(stats(codes), IDX);
    ok(g.panes[0].viewBox === want[0],
      'the frame built from the REAL sample\'s own country codes has the same first pane', g.panes[0].viewBox);
    ok(g.missing.length === 0, 'no sample country is unfillable', g.missing);
  } catch (e) {
    note(`sample document not readable (${e.message}) — run \`npm run sample\` first`);
  }

  // the compact-regional and ceiling baselines
  ok(SHIPPED['AT CZ DE HR HU SI'].panes.length === 1 &&
    SHIPPED['AT CZ DE HR HU SI'].panes[0].viewBox === '5.6543 -55.3175 17.3907 13.172',
    '`AT CZ DE HR HU SI` is one pane, `5.6543 -55.3175 17.3907 13.172`',
    SHIPPED['AT CZ DE HR HU SI'].panes.map((p) => p.viewBox));
  ok(SHIPPED['FR+GR'].panes[0].viewBox.split(' ')[2] === '32.4444',
    'FR+GR\'s European pane is unchanged (viewBox width 32.4444)', SHIPPED['FR+GR'].panes[0].viewBox);
}

// ===========================================================================
head('F  Jacob #4 — sparse multi-region histories of my own construction');
// ===========================================================================
for (const name of ['sparse: IS NZ MN', 'sparse: CL NO JP MG', 'sparse: CA AU ZA RU', 'sparse: PF SH TO', 'sparse: SG GL UY']) {
  const codes = LIBS[name];
  const f = SHIPPED[name];
  const shape = f.panes.map((p) => `${p.codes.join('+')}${p.home.length === 0 ? '(extent)' : ''} ${spanOf(p).w.toFixed(1)}x${spanOf(p).h.toFixed(1)}°`);
  note(`${name}: ${f.panes.length} panes — ${shape.join(' | ')}`);
  // nothing lost
  const drawnCodes = new Set(f.codes);
  ok(codes.every((c) => drawnCodes.has(c) || f.missing.includes(c)),
    `${name}: every code is drawn or stated missing (I1)`, { codes: f.codes, missing: f.missing });
  ok(f.missing.length === 0, `${name}: nothing is unfillable`, f.missing);
  // every code is home in exactly one pane
  for (const c of f.codes) {
    const n = f.panes.filter((p) => p.home.includes(c)).length;
    ok(n === 1, `${name}: ${c} is home in exactly one pane (I5)`, n);
  }
  // I18
  const kinds = f.panes.map((p) => (p.home.length === 0 ? 0 : 1));
  ok(kinds.join('').indexOf('01') === -1, `${name}: I18 — no extent pane precedes a home pane`, kinds);
  // nothing merged that should not be: every cross-pane part pair is >= threshold (I16)
  const partsOf = f.codes.map((c) => core.countryParts(c, IDX, T));
  const paneOfPart = new Map();
  f.panes.forEach((p, pi) => p.codes.forEach((c) => paneOfPart.set(c + '@' + pi, pi)));
  const flat = [];
  f.codes.forEach((c, ci) => partsOf[ci].forEach((part) => flat.push({ c, part })));
  let minCross = Infinity, maxIn = 0;
  const paneIndexOf = (c, part) => f.panes.findIndex((p) => {
    if (!p.codes.includes(c)) return false;
    const [w, s, e, n] = part.box;
    return p.bounds.west <= w + 1e-9 && p.bounds.east >= e - 1e-9 && p.bounds.south <= s + 1e-9 && p.bounds.north >= n - 1e-9;
  });
  for (let i = 0; i < flat.length; i++) for (let j = i + 1; j < flat.length; j++) {
    const d = km(flat[i].part.key, flat[j].part.key);
    const pi = paneIndexOf(flat[i].c, flat[i].part), pj = paneIndexOf(flat[j].c, flat[j].part);
    if (pi !== pj) minCross = Math.min(minCross, d); else maxIn = Math.max(maxIn, d);
  }
  ok(!Number.isFinite(minCross) || minCross >= T,
    `${name}: I16 — every cross-pane part pair is at or beyond 4,000 km (closest ${minCross.toFixed(0)} km)`, minCross);
  // no pane is wide because of something it is not showing. A-51 residue 3 is the disclosed
  // exception: `AQ FJ KI RU UM` produce a globe-wide box from their OWN planar geometry, and
  // that is unchanged by this increment and out of its scope.
  const RESIDUE3 = ['AQ', 'FJ', 'KI', 'RU', 'UM'];
  for (const p of f.panes) {
    const { w } = spanOf(p);
    const disclosed = p.codes.some((c) => RESIDUE3.includes(c));
    if (disclosed && w > 120) { note(`${name}: ${p.codes.join('+')} is ${w.toFixed(1)}° wide — A-51 residue 3, disclosed and unchanged`); continue; }
    ok(w <= 120, `${name}: ${p.codes.join('+')} pane is ${w.toFixed(1)}° wide, not a globe-wide strip`, w);
  }
}

// ===========================================================================
head('G  Jacob #5 — the ceiling, and the space between sparse and everything');
// ===========================================================================
{
  const f = SHIPPED['ceiling 239'];
  ok(f.panes.length === 1, 'all 239 codes collapse to ONE pane', f.panes.length);
  ok(f.panes[0].viewBox === '-187.2 -90.8451 374.4 188.0451', 'the ceiling viewBox is byte-identical', f.panes[0].viewBox);
  ok(f.panes[0].home.length === 239 && f.panes[0].weight === 239, 'and it is a HOME pane holding all 239', [f.panes[0].home.length, f.panes[0].weight]);
  ok(f.missing.length === 0, 'no code in the index is unfillable by the index', f.missing);

  // sweep the middle ground for an unreasonable pane count.
  let seed = 39_2026;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let worst = { n: 0 }, hist = {};
  for (let trial = 0; trial < 3000; trial++) {
    const n = 2 + Math.floor(rnd() * 40);
    const pick = new Set();
    while (pick.size < n) pick.add(CODES[Math.floor(rnd() * CODES.length)]);
    const codes = [...pick].sort();
    const fr = worldMapFrame(stats(codes), IDX);
    hist[fr.panes.length] = (hist[fr.panes.length] ?? 0) + 1;
    if (fr.panes.length > worst.n) worst = { n: fr.panes.length, codes };
    // invariants on every one
    const kinds = fr.panes.map((p) => (p.home.length === 0 ? 0 : 1));
    if (kinds.join('').includes('01')) { ok(false, `I18 violated on ${codes.join(' ')}`, kinds); break; }
    const W = fr.codes.reduce((a, c) => a + 1, 0);
    if (fr.panes.reduce((a, p) => a + p.weight, 0) !== W) { ok(false, `I5 violated on ${codes.join(' ')}`); break; }
    if (fr.panes.some((p) => p.viewBox.includes('NaN'))) { ok(false, `NaN viewBox on ${codes.join(' ')}`); break; }
  }
  note(`3,000 random libraries of 2–41 codes: pane-count histogram ${JSON.stringify(hist)}`);
  note(`worst pane count observed: ${worst.n} on ${worst.codes.join(' ')}`);
  ok(worst.n <= 14, 'no random library beats A-51 G6\'s stated greedy worst case of 14 panes', worst);
  ok(SHIPPED['greedy 14'].panes.length === 14, 'the stated greedy worst case really is 14 panes', SHIPPED['greedy 14'].panes.length);
  ok(SHIPPED['greedy 14'].panes.every((p) => p.home.length > 0), 'and all 14 are HOME panes (A-53 Part 5)', SHIPPED['greedy 14'].panes.map((p) => p.home));

  // …and search for a WORSE one. A-51 G6 publishes 14 as "the greedy worst case"; if a library
  // exists with more panes, residue 7's ~4,200 px scroll cost is understated. 4,000 randomised
  // greedy runs over the code adjacency graph (a code joins only if all its parts are >= the
  // threshold from every part already chosen).
  const PARTS = new Map(CODES.map((c) => [c, core.countryParts(c, IDX, T)]));
  let best = { n: 0, codes: [] };
  let s2 = 777;
  const r2 = () => { s2 = (s2 * 1103515245 + 12345) & 0x7fffffff; return s2 / 0x7fffffff; };
  for (let run = 0; run < 4000; run++) {
    const order = [...CODES];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r2() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const chosen = [], keys = [];
    for (const c of order) {
      const ps = PARTS.get(c);
      if (ps.some((p) => keys.some((k) => km(p.key, k) < T))) continue;
      chosen.push(c);
      for (const p of ps) keys.push(p.key);
    }
    if (chosen.length > best.n) best = { n: chosen.length, codes: chosen.sort() };
  }
  const bestFrame = worldMapFrame(stats(best.codes), IDX);
  note(`4,000 randomised greedy searches: best independent library has ${best.n} codes -> ` +
    `${bestFrame.panes.length} panes: ${best.codes.join(' ')}`);
  note(`  at 390 css px that is roughly ${bestFrame.panes.length} x 300 px of map = ` +
    `~${bestFrame.panes.length * 300} px of scroll (A-51 residue 7 discloses ~4,200 px for 14)`);
  ok(bestFrame.panes.length <= 14,
    'A-51 G6\'s "greedy worst case: 14" is the real ceiling — no randomised search beats it',
    { panes: bestFrame.panes.length, codes: best.codes });
  ok(bestFrame.panes.every((p) => p.home.length > 0),
    'and the worst case is still all HOME panes: the ceiling is not territory-driven', bestFrame.panes.map((p) => p.home));
}

// ===========================================================================
head('H  I18 / I5 / I1 / I2 / I13 / L4 over 239 singles and all 28,441 pairs');
// ===========================================================================
{
  const ringsOf = (code) => {
    const out = [];
    for (const e of IDX.countries) if (e.code === code) for (const r of e.rings) out.push(r.join(','));
    return out.sort();
  };
  const RINGS = new Map(CODES.map((c) => [c, ringsOf(c)]));

  let i18 = 0, i5 = 0, i2 = 0, i13 = 0, l4 = 0, nanv = 0, panes0extent = 0, checked = 0;
  const check = (codes) => {
    checked++;
    const f = worldMapFrame(stats(codes), IDX);
    const kinds = f.panes.map((p) => (p.home.length === 0 ? 0 : 1));
    if (kinds.join('').includes('01')) i18++;
    if (f.panes[0].home.length === 0) panes0extent++;
    if (f.panes.reduce((a, p) => a + p.weight, 0) !== f.codes.length) i5++;
    if (f.panes.some((p) => p.viewBox.includes('NaN'))) nanv++;
    // I2: pane.codes is canonical, each code once per pane, and equals the codes carrying that paneId
    for (const p of f.panes) {
      const sorted = [...p.codes].sort();
      if (p.codes.join() !== sorted.join() || new Set(p.codes).size !== p.codes.length) i2++;
      const carrying = [...new Set(f.countries.filter((c) => c.paneId === p.id).map((c) => c.code))].sort();
      if (carrying.join() !== sorted.join()) i2++;
    }
    // I13: frame.codes is canonical, once each, disjoint from missing
    if (f.codes.join() !== [...f.codes].sort().join() || new Set(f.codes).size !== f.codes.length ||
      f.codes.some((c) => f.missing.includes(c))) i13++;
    // L4/I11 with the INDEX as oracle: the multiset of rings drawn for a code === the index's set
    for (const c of f.codes) {
      const drawn = [];
      for (const row of f.countries) {
        if (row.code !== c) continue;
        for (const m of row.d.matchAll(/M([^Z]*)Z/g)) {
          drawn.push(m[1].split('L').map((pt) => { const [x, y] = pt.split(','); return `${x},${Object.is(Number(y), -0) || Number(y) === 0 ? 0 : -Number(y)}`; })
            .flatMap((s) => s.split(',')).join(','));
        }
      }
      const want = RINGS.get(c);
      if (drawn.length !== want.length) { l4++; continue; }
      if (drawn.map((s) => s).sort().join('|') !== want.join('|')) l4++;
    }
  };

  for (const c of CODES) check([c]);
  ok(i18 === 0 && i5 === 0 && i2 === 0 && i13 === 0 && l4 === 0 && nanv === 0 && panes0extent === 0,
    `all 239 single-country libraries: I18 ${i18} · I5 ${i5} · I2 ${i2} · I13 ${i13} · L4 ${l4} · NaN ${nanv} · panes[0] extent ${panes0extent}`,
    { i18, i5, i2, i13, l4, nanv, panes0extent });

  // all 28,441 pairs, without the (costly) L4 ring compare
  let pi18 = 0, pi5 = 0, pnan = 0, p0e = 0, pairs = 0, extentHist = {}, paneHist = {};
  for (let a = 0; a < CODES.length; a++) for (let b = a + 1; b < CODES.length; b++) {
    pairs++;
    const f = worldMapFrame(stats([CODES[a], CODES[b]]), IDX);
    const kinds = f.panes.map((p) => (p.home.length === 0 ? 0 : 1));
    if (kinds.join('').includes('01')) pi18++;
    if (f.panes[0].home.length === 0) p0e++;
    if (f.panes.reduce((x, p) => x + p.weight, 0) !== 2) pi5++;
    if (f.panes.some((p) => p.viewBox.includes('NaN'))) pnan++;
    const ext = f.panes.filter((p) => p.home.length === 0).length;
    extentHist[ext] = (extentHist[ext] ?? 0) + 1;
    paneHist[f.panes.length] = (paneHist[f.panes.length] ?? 0) + 1;
  }
  note(`${pairs} two-country libraries: pane-count histogram ${JSON.stringify(paneHist)}`);
  note(`extent-pane histogram ${JSON.stringify(extentHist)}`);
  ok(pairs === 28441, '28,441 pairs enumerated', pairs);
  ok(pi18 === 0, 'I18 holds on every one of them', pi18);
  ok(p0e === 0, 'panes[0] is a HOME pane in every one of them', p0e);
  ok(pi5 === 0, 'I5 (Σ weight === W) holds on every one', pi5);
  ok(pnan === 0, 'no pair produces a NaN viewBox', pnan);
  ok(JSON.stringify(paneHist) === JSON.stringify({ 1: 5564, 2: 22360, 3: 516, 4: 1 }),
    'A-51 Part 5\'s pane-count census {1:5564, 2:22360, 3:516, 4:1} re-derived', paneHist);
  ok(Math.max(...Object.keys(extentHist).map(Number)) <= 3, 'extent-pane count is <= 3 in every library', extentHist);
  ok(Math.max(...Object.keys(extentHist).map(Number)) === 2, 'and its measured maximum is 2', extentHist);
}

// ===========================================================================
head('I  the extent-pane set, recomputed from the raw index');
// ===========================================================================
{
  // Which codes have more than one part at 4,000 km — computed with MY components, over the
  // whole index, not sampled.
  const multi = CODES.filter((c) => myParts(c, IDX, T).length > 1);
  const nonPrincipal = CODES.reduce((n, c) => n + myParts(c, IDX, T).filter((p) => !p.principal).length, 0);
  note(`codes with more than one part at ${T} km: ${JSON.stringify(multi)}; non-principal parts planet-wide: ${nonPrincipal}`);
  ok(JSON.stringify(multi) === JSON.stringify(['FR', 'UM', 'US']),
    'A-53 Part 5(2): the set is EXACTLY {FR, UM, US}, computed over all 239 codes', multi);
  ok(nonPrincipal === 3, 'and there are exactly 3 non-principal parts on the planet', nonPrincipal);
  // an extent pane can only exist if one of those three is present
  let violations = 0;
  for (const [name, codes] of Object.entries(LIBS)) {
    const f = SHIPPED[name];
    const ext = f.panes.filter((p) => p.home.length === 0);
    if (ext.length > 0 && !codes.some((c) => multi.includes(c))) violations++;
    for (const p of ext) {
      if (!p.codes.every((c) => multi.includes(c))) violations++;
    }
  }
  ok(violations === 0, 'no library produces an extent pane without one of {FR, UM, US}', violations);
  // and the threshold sensitivity, so the bound is understood rather than assumed
  for (const t of [1000, 2000, 4000, 8000]) {
    const m = CODES.filter((c) => myParts(c, IDX, t).length > 1);
    note(`  at ${t} km the multi-part set has ${m.length} codes${t === T ? ' (the shipped threshold)' : ''}`);
  }
}

// ===========================================================================
head('J  the ">120° panes" recount');
// ===========================================================================
{
  // A-51 Part 5 counts the PANE's own span (`bounds.east - bounds.west`), not the padded
  // `viewBox`. Both are reported, because the two answers differ and only one of them is the
  // one the ruling's 1,229 refers to.
  const FIVE = ['AQ', 'FJ', 'KI', 'RU', 'UM'];
  let wideB = 0, withFiveB = 0, withoutFiveB = [], wideV = 0, pairsWide = 0;
  for (let a = 0; a < CODES.length; a++) for (let b = a + 1; b < CODES.length; b++) {
    const f = worldMapFrame(stats([CODES[a], CODES[b]]), IDX);
    let any = false;
    for (const p of f.panes) {
      if (spanOf(p).w > 120) wideV++;
      const w = p.bounds.east - p.bounds.west;
      if (w > 120) {
        wideB++; any = true;
        if (p.codes.some((c) => FIVE.includes(c))) withFiveB++;
        else withoutFiveB.push({ pair: [CODES[a], CODES[b]], pane: p.codes, w: +w.toFixed(1) });
      }
    }
    if (any) pairsWide++;
  }
  note(`panes wider than 120° by UNPADDED bounds: ${wideB}; by PADDED viewBox: ${wideV}; ` +
    `two-country libraries holding at least one such pane: ${pairsWide}`);
  note(`of the ${wideB}: containing one of AQ/FJ/KI/RU/UM: ${withFiveB}; not: ${withoutFiveB.length}`);
  ok(pairsWide === 1229,
    'A-51 Part 5\'s "8,364 pairs -> 1,229" is a count of LIBRARIES holding a >120° pane, and it re-derives', pairsWide);
  note(`(the same quantity counted as PANES rather than libraries is ${wideB}, which is the number ` +
    `BUILD-NOTES and ROADMAP I-8i both attach the word "panes" to)`);
  ok(withoutFiveB.length === 0,
    'ROADMAP I-8i\'s own claim: EVERY >120° pane contains one of AQ/FJ/KI/RU/UM',
    { withFiveB, counterexamples: withoutFiveB.slice(0, 6) });
  const seen = {};
  for (const x of withoutFiveB) seen[x.pane.join('+')] = (seen[x.pane.join('+')] ?? 0) + 1;
  note(`counterexample panes by code set (${withoutFiveB.length} total): ${JSON.stringify(seen)}`);
  const antimeridian = withoutFiveB.filter((x) => x.w > 180).length;
  note(`of the counterexamples, ${antimeridian} span more than 180° (the planar-bbox / trans-antimeridian artefact) ` +
    `and ${withoutFiveB.length - antimeridian} do not: ${JSON.stringify(withoutFiveB.filter((x) => x.w <= 180))}`);
  ok(withoutFiveB.length === 49 && antimeridian === 48,
    'BUILD-NOTES\' recount re-derived in SHAPE: the counterexamples are 48 trans-antimeridian Pacific pairs plus one honest CA+GL',
    { counterexamples: withoutFiveB.length, antimeridian });
  note(`BUILD-NOTES says 1,180 of the 1,229 contain one of the five; on the same >120° unpadded ` +
    `pane definition I count ${withFiveB} of ${wideB} panes — the decomposition is the same shape, the totals differ ` +
    `because "1,229" counts libraries and "1,180" counts panes`);
}

// ===========================================================================
head('K  KD-74 — the third ordering key');
// ===========================================================================
{
  // (1) is `clusterPoints`' output really ascending-lowest-member?
  let bad = 0, samples = 0;
  let seed = 4141;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let trial = 0; trial < 500; trial++) {
    const n = 2 + Math.floor(rnd() * 30);
    const pts = Array.from({ length: n }, () => ({ lat: rnd() * 180 - 90, lng: rnd() * 360 - 180 }));
    const comps = core.clusterPoints(pts, 1500);
    samples++;
    const lows = comps.map((c) => Math.min(...c));
    if (lows.join() !== [...lows].sort((a, b) => a - b).join()) bad++;
    if (comps.some((c) => c.join() !== [...c].sort((a, b) => a - b).join())) bad++;
  }
  ok(bad === 0, `KD-74's premise: over ${samples} random point sets \`clusterPoints\` emits ascending members and ascending lowest-member components`, bad);

  // (2) is the third key therefore a no-op on every library the frame can see?
  //     Re-run each library with the third key replaced by `return 0` — in MY implementation,
  //     which is the same algorithm — and compare.
  const myFrameNoKey = (s) => {
    const drawn = [];
    for (const row of s.countries) { const p = myParts(row.code, IDX, T); if (p.length) drawn.push({ code: row.code, trips: row.tripIds.length, parts: p }); }
    const atoms = [];
    drawn.forEach((d, k) => d.parts.forEach((part) => atoms.push({ owner: k, part })));
    const comps = core.clusterPoints(atoms.map((a) => a.part.key), T); // the SHIPPED kernel's order
    const built = comps.map((members) => {
      const owners = [...new Set(members.map((i) => atoms[i].owner))].sort((a, b) => a - b);
      const home = owners.filter((k) => members.some((i) => atoms[i].owner === k && atoms[i].part.principal));
      return { lowest: Math.min(...members), codes: owners.map((k) => drawn[k].code), home: home.map((k) => drawn[k].code), weight: home.reduce((n, k) => n + drawn[k].trips, 0) };
    });
    const withKey = [...built].sort((a, b) => (b.weight - a.weight) || (b.home.length - a.home.length) || (a.lowest - b.lowest));
    const noKey = [...built].sort((a, b) => (b.weight - a.weight) || (b.home.length - a.home.length) || 0);
    return { withKey: withKey.map((g) => g.codes.join('+')).join('|'), noKey: noKey.map((g) => g.codes.join('+')).join('|') };
  };
  let differs = 0, tried = 0;
  for (const [, codes] of Object.entries(LIBS)) { const r = myFrameNoKey(stats(codes)); tried++; if (r.withKey !== r.noKey) differs++; }
  for (let a = 0; a < CODES.length; a += 7) for (let b = a + 1; b < CODES.length; b += 11) {
    const r = myFrameNoKey(stats([CODES[a], CODES[b]])); tried++; if (r.withKey !== r.noKey) differs++;
  }
  note(`third key vs \`return 0\`: ${differs} of ${tried} libraries differ`);
  ok(differs === 0, 'KD-74 is honest: on the shipped kernel the third key changes NO library (so `return 0` cannot be a red fault)', differs);

  // (3) the latent risk KD-74 names: if the kernel's output order changed, does the key save it?
  const permutedKernelOrder = (s) => {
    const drawn = [];
    for (const row of s.countries) { const p = myParts(row.code, IDX, T); if (p.length) drawn.push({ code: row.code, trips: row.tripIds.length, parts: p }); }
    const atoms = [];
    drawn.forEach((d, k) => d.parts.forEach((part) => atoms.push({ owner: k, part })));
    const comps = [...core.clusterPoints(atoms.map((a) => a.part.key), T)].reverse(); // a DIFFERENT convention
    const built = comps.map((members) => {
      const owners = [...new Set(members.map((i) => atoms[i].owner))].sort((a, b) => a - b);
      const home = owners.filter((k) => members.some((i) => atoms[i].owner === k && atoms[i].part.principal));
      return { lowest: Math.min(...members), codes: owners.map((k) => drawn[k].code), home: home.map((k) => drawn[k].code), weight: home.reduce((n, k) => n + drawn[k].trips, 0) };
    });
    const withKey = [...built].sort((a, b) => (b.weight - a.weight) || (b.home.length - a.home.length) || (a.lowest - b.lowest));
    const noKey = [...built].sort((a, b) => (b.weight - a.weight) || (b.home.length - a.home.length) || 0);
    return { withKey: withKey.map((g) => g.codes.join('+')).join('|'), noKey: noKey.map((g) => g.codes.join('+')).join('|') };
  };
  let saved = 0, wouldBreak = 0;
  for (const [, codes] of Object.entries(LIBS)) {
    const s = stats(codes);
    const truth = myFrameNoKey(s).withKey;
    const p = permutedKernelOrder(s);
    if (p.withKey === truth) saved++;
    if (p.noKey !== truth) wouldBreak++;
  }
  note(`with the kernel's output order reversed: the third key restores the right order in ${saved}/${Object.keys(LIBS).length} libraries; without it ${wouldBreak} would be wrong`);
  ok(saved === Object.keys(LIBS).length,
    'the key IS load-bearing against a future change to `clusterPoints`\' convention — it is insurance, not decoration', saved);
}

// ===========================================================================
head('L  I17 locality, I6 determinism, L5 code-blindness');
// ===========================================================================
{
  // I17 on pairs I chose, not the builder's 60
  const BASES = [['FR'], ['US'], ['JP'], ['AT', 'CZ', 'DE'], ['AU', 'NZ'], ['BR', 'PE'], ['GB'], ['ZA'], CODES.slice(0, 40)];
  const ADDS = ['US', 'FR', 'NZ', 'RU', 'CA', 'MG', 'IS', 'UM', 'AQ', 'KI'];
  let viol = 0, pairsChecked = 0;
  for (const base of BASES) for (const add of ADDS) {
    if (base.includes(add)) continue;
    pairsChecked++;
    const A = worldMapFrame(stats(base), IDX);
    const B = worldMapFrame(stats([...base, add]), IDX);
    const addParts = core.countryParts(add, IDX, T);
    for (const pa of A.panes) {
      // does any part of `add` join this component? approximate by "within threshold of a member"
      const joins = addParts.some((ap) => base.some((c) => core.countryParts(c, IDX, T).some((cp) =>
        pa.codes.includes(c) && km(ap.key, cp.key) < T)));
      if (joins) continue;
      const same = B.panes.find((pb) => pb.codes.join() === pa.codes.join() && pb.home.join() === pa.home.join());
      if (!same || same.viewBox !== pa.viewBox || JSON.stringify(same.bounds) !== JSON.stringify(pa.bounds)) {
        viol++;
        note(`  I17 violation: base ${base.join('+')} + ${add}, pane ${pa.codes.join('+')} ${pa.viewBox} -> ${same ? same.viewBox : 'GONE'}`);
      }
    }
  }
  ok(viol === 0, `I17: ${pairsChecked} (library, code) pairs of my own — every untouched pane is byte-identical`, viol);

  // I6: same input twice, and with the country rows given in a scrambled array
  const f1 = JSON.stringify(worldMapFrame(stats(LIBS['worldwide 12']), IDX));
  const f2 = JSON.stringify(worldMapFrame(stats(LIBS['worldwide 12']), IDX));
  ok(f1 === f2, 'I6: two calls with the same input are byte-identical', undefined);

  // L5: "permuting every ISO code in the index leaves every pane byte-identical" — the ruling's
  // OWN stated proof obligation, run with a genuinely order-DESTROYING permutation. Round 38's
  // and I-8i's relabel tests both use an order-PRESERVING map (`CODES[i] -> Q000+i`), which
  // cannot reach the question, because the frame's only ordinal is *canonical row order* and
  // canonical row order is ascending ISO code.
  const rot = (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + 7) % 26) + 65) + String.fromCharCode(((c.charCodeAt(1) - 65 + 11) % 26) + 65);
  const relabelled = { ...IDX, countries: IDX.countries.map((e) => ({ ...e, code: rot(e.code) })) };
  let setSame = 0, orderSame = 0, tried = 0;
  const offenders = [];
  for (const [name, codes] of Object.entries(LIBS)) {
    if (name === 'ceiling 239') continue;
    tried++;
    const a = worldMapFrame(stats(codes), IDX);
    const b = worldMapFrame(stats(codes.map(rot)), relabelled);
    const key = (vb, cs, hs, w) => `${vb}|${[...cs].sort().join('+')}|${[...hs].sort().join('+')}|${w}`;
    const av = a.panes.map((p) => key(p.viewBox, p.codes.map(rot), p.home.map(rot), p.weight));
    const bv = b.panes.map((p) => key(p.viewBox, p.codes, p.home, p.weight));
    if ([...av].sort().join() === [...bv].sort().join()) setSame++;
    if (av.join() === bv.join()) orderSame++; else offenders.push(name);
  }
  note(`order-destroying ISO relabel over ${tried} libraries: same pane SET in ${setSame}, same pane ORDER in ${orderSame}`);
  note(`libraries whose pane ORDER moves under an ISO relabel: ${JSON.stringify(offenders)}`);
  ok(setSame === tried, 'L5 holds for the partition and the rectangles — nothing reads a code to decide GEOMETRY', setSame);
  ok(orderSame === tried,
    'L5 as A-51 states it ("permuting every ISO code leaves every pane byte-identical") also holds for pane ORDER',
    offenders);

  // How big is that? Count the two-country libraries whose pane order is decided by nothing but
  // the alphabet — i.e. two panes tied on `weight` AND on `home.length`.
  let alphaDecided = 0, twoPlus = 0;
  for (let a = 0; a < CODES.length; a++) for (let b = a + 1; b < CODES.length; b++) {
    const f = worldMapFrame(stats([CODES[a], CODES[b]]), IDX);
    if (f.panes.length < 2) continue;
    twoPlus++;
    for (let i = 1; i < f.panes.length; i++) {
      if (f.panes[i].weight === f.panes[i - 1].weight && f.panes[i].home.length === f.panes[i - 1].home.length) { alphaDecided++; break; }
    }
  }
  note(`two-country libraries with 2+ panes: ${twoPlus}; of those, ${alphaDecided} ` +
    `(${(100 * alphaDecided / twoPlus).toFixed(1)}%) have at least one adjacent pane pair separated ONLY by G5's third key`);
}

// ===========================================================================
head('N  zero-trip rows, and the pane aspects the stylesheet has to size');
// ===========================================================================
{
  // A-53's I18 proof leans on "a code in `stats.countries` has `tripIds.length >= 1`". Break it.
  const zero = { ...stats(['FR', 'US']), countries: stats(['FR', 'US']).countries.map((r) => ({ ...r, tripIds: [] })) };
  const f = worldMapFrame(zero, IDX);
  note(`all-zero-trip library: ${JSON.stringify(f.panes.map((p) => [p.codes.join('+'), p.home.join('+'), p.weight]))}`);
  ok(f.panes.map((p) => (p.home.length === 0 ? 0 : 1)).join('').indexOf('01') === -1,
    'I18 survives the case its proof does not cover: every weight is 0, and the second key (home.length) still puts home panes first',
    f.panes.map((p) => [p.home, p.weight]));
  ok(f.panes[0].home.length > 0, 'and panes[0] — which `frame.viewBox` aliases — is still a home pane', f.panes[0]);

  // The aspects the stylesheet must size. A-50's rule: svg width = min(cellW, cap * aspect),
  // height = width / aspect. At 390 css px the content column is 356 and the cap is 300.
  const CELL = 356, CAP = 300;
  const rows = CODES.map((c) => {
    const fr = worldMapFrame(stats([c]), IDX);
    return fr.panes.map((p) => {
      const w = Math.min(CELL, CAP * p.aspect);
      return { code: c, pane: p.codes.join('+'), home: p.home.length > 0, aspect: p.aspect, w, h: w / p.aspect };
    });
  }).flat();
  rows.sort((a, b) => a.aspect - b.aspect);
  note(`239 single-country libraries, ${rows.length} panes: narrowest aspect ${rows[0].aspect.toFixed(3)} (${rows[0].code}) ` +
    `-> ${rows[0].w.toFixed(0)}x${rows[0].h.toFixed(0)} px; widest ${rows.at(-1).aspect.toFixed(3)} (${rows.at(-1).code}) ` +
    `-> ${rows.at(-1).w.toFixed(0)}x${rows.at(-1).h.toFixed(0)} px`);
  const tiny = rows.filter((r) => r.w < 24 || r.h < 24);
  note(`panes whose rendered <svg> box would be under 24 px in a dimension at 390 css px: ` +
    `${JSON.stringify(tiny.map((r) => [r.code, r.pane, +r.w.toFixed(0), +r.h.toFixed(0), r.home ? 'home' : 'extent']))}`);
  ok(tiny.filter((r) => r.home).length === 0,
    'A-51 L3: no HOME pane of a single-country library renders below WCAG 2.5.8\'s 24 px in either dimension', tiny.filter((r) => r.home));
  ok(tiny.length === 0, 'and no EXTENT pane does either', tiny);
}

// ===========================================================================
head('M  the constraint greps');
// ===========================================================================
{
  const pkg = (p) => JSON.parse(readFileSync(join(CAIRN, p), 'utf8'));
  for (const p of ['packages/core/package.json', 'packages/client/package.json']) {
    const j = pkg(p);
    const third = Object.keys(j.dependencies ?? {}).filter((d) => !d.startsWith('@cairn/'));
    ok(third.length === 0, `${p}: zero third-party runtime dependencies (constraint 2)`, third);
  }
  const readAll = (dir) => {
    const out = [];
    const walk = (d) => {
      for (const e of readdirSync(d)) {
        const f = join(d, e);
        if (statSync(f).isDirectory()) walk(f); else if (/\.tsx?$/.test(f)) out.push([f, readFileSync(f, 'utf8')]);
      }
    };
    walk(join(CAIRN, dir));
    return out;
  };
  const clientSrc = readAll('packages/client/src');
  const coreSrc = readAll('packages/core/src');
  // Strip comments AND string literals, so the greps see code and not prose.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/`(?:\\.|[^`\\])*`/g, '``');
  const domHits = clientSrc.filter(([, s]) => /\b(document|window|navigator|HTMLElement|getBoundingClientRect|ResizeObserver|localStorage)\s*[.[]/.test(strip(s))
    || /\b(HTMLElement|ResizeObserver|MutationObserver)\b/.test(strip(s)));
  ok(domHits.length === 0, 'packages/client/src touches no DOM identifier (constraint 5)', domHits.map(([f]) => f));
  const ambient = coreSrc.concat(clientSrc).filter(([, s]) => /\b(Date\.now|Math\.random|crypto\.randomUUID|new Date\()/.test(strip(s)));
  ok(ambient.length === 0, 'no ambient clock or randomness in core or client (constraint 4)', ambient.map(([f]) => f));
  const wmRaw = readFileSync(join(CAIRN, 'apps/web/src/views/WorldMap.tsx'), 'utf8');
  const wm = wmRaw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ');
  for (const id of ['getBoundingClientRect', 'offsetWidth', 'offsetHeight', 'ResizeObserver', 'clientWidth', 'clientHeight', 'innerWidth', 'innerHeight', 'matchMedia', 'getComputedStyle']) {
    ok(!wm.includes(id), `W1: WorldMap.tsx does not use \`${id}\``);
  }
  ok(!/\brole\s*[:=]\s*['"](main|inset|detached)/.test(wm), 'the withdrawn `role` values are gone from the view');
  ok(!wm.includes('shown separately'), 'no EMITTED string in the view says "shown separately" (A-49 Part 4 consequence 3)');
  const aria = (wm.match(/`Distant parts of [^`]*`/) ?? ['<none>'])[0];
  note(`the view's extent-pane aria-label template: ${aria}`);
  ok(!/shown in a separate|separate frame|separately/.test(aria),
    'and the extent pane\'s aria-label does not say the geometry is "shown separately" in another form either — ' +
    'the sighted caption is "Distant parts of X" and the screen-reader label should carry the same claim and no more',
    aria);
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}`);
