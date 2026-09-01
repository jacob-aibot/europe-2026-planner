/**
 * QA round 40 — I-8j (§4.4 **A-54**) attacked in bare Node, independently of the builder's
 * `countryParts.test.ts` / `countryKeyPoint.test.ts` / `world-map.test.ts` and of
 * `qa/r39-a51.mjs`.
 *
 *   Run: node --experimental-strip-types qa/r40-a54.mjs   (from cairn/)
 *
 *   A  **D**, attacked at its own edges, with fixtures the builder did not use: `-0`, a string
 *      coordinate, `null`, a length-2 ring, a 1-element ring, `Infinity`, `-Infinity`, a
 *      subnormal, and the all-or-stated case in BOTH entry orders.
 *   B  **I19** end to end through `worldMapFrame`: no `NaN` may appear anywhere in the emitted
 *      frame for any malformed index, and the code must land in `missing` exactly once.
 *   C  The shipped `COUNTRY_INDEX` census, RECOMPUTED (292 / 1,033 / shortest 8 / 0 odd /
 *      0 non-finite), plus predicate D applied to every ring of every entry.
 *   D  **Byte-neutrality of the D change on the shipped artefact**: `countryKeyPoint` and
 *      `countryParts` compared code-by-code against the pre-I-8j implementations, re-derived
 *      here rather than trusted (the `< 6` filter + entry-box fallback, and the unfiltered
 *      gather), over all 239 codes and 8 thresholds.
 *   E  **G5′**, read as a comparator: the exact key order, and a library where the WITHDRAWN
 *      key and the NEW key give DIFFERENT answers — the load-bearing test.
 *   F  Determinism / I6 under an order-destroying ISO relabel, and totality of the comparator
 *      (no `NaN` may ever reach it).
 *
 * A `FAIL` line is the finding.
 */
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame } from '../packages/client/src/selectors/worldMap.ts';
import { COUNTRY_INDEX } from '../packages/core/src/geo/countries.gen.ts';
import { countryIndex } from '../packages/core/src/geo/countryIndex.ts';
import { readFileSync } from 'node:fs';

let fails = 0;
const ok = (c, label, extra) => {
  if (c) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const T = 4000; // WORLD_CLUSTER_THRESHOLD_KM

/** A hand-built index; `buildCountryIndex` derives each box, exactly as the real one is built. */
const idx = (entries) => countryIndex({ scale: 'test', source: 'r40', countries: entries });
/** A square ring around (lng, lat). */
const sq = (lng, lat, d = 1) => [lng - d, lat - d, lng + d, lat - d, lng + d, lat + d, lng - d, lat + d];

const stats = (codes) => ({
  countries: codes.map((c, i) => ({
    code: c, cityCount: 1, tripIds: [`t${i}`], firstVisit: '2026-01-01', lastVisit: '2026-01-02',
  })),
});

// ===========================================================================
head('A — D at its own edges, with fixtures distinct from the builder\'s');
{
  const cases = [
    ['a 1-element ring [7]',              [[7]],                       false],
    ['an empty ring []',                  [[]],                        false],
    ['an odd 3-element ring',             [[1, 2, 3]],                 false],
    ['an odd 5-element ring',             [[1, 2, 3, 4, 5]],           false],
    ['a ring holding NaN',                [[1, 2, NaN, 4]],            false],
    ['a ring holding Infinity',           [[1, 2, Infinity, 4]],       false],
    ['a ring holding -Infinity',          [[-Infinity, 2, 3, 4]],      false],
    ['a ring holding the STRING "3"',     [[1, 2, '3', 4]],            false],
    ['a ring holding null',               [[1, 2, null, 4]],           false],
    ['a ring holding undefined',          [[1, 2, undefined, 4]],      false],
    ['a ring holding a boolean',          [[1, 2, true, 4]],           false],
    ['NO rings at all',                   [],                          false],
    ['a length-2 ring (one point)',       [[5, 5]],                    true],
    ['a length-4 ring (two points)',      [[5, 5, 6, 6]],              true],
    ['-0 as a coordinate',                [[-0, 0, 1, 1]],             true],
    ['a subnormal coordinate',            [[5e-324, 0, 1, 1]],         true],
    ['a real square',                     [sq(10, 50)],                true],
    ['good ring FIRST, bad ring second',  [sq(10, 50), [1, 2, 3]],     false],
    ['bad ring FIRST, good ring second',  [[1, 2, 3], sq(10, 50)],     false],
    ['good ring + NaN ring',              [sq(10, 50), [1, NaN]],      false],
  ];
  for (const [label, rings, drawable] of cases) {
    const i = idx([{ code: 'XA', rings }]);
    const parts = core.countryParts('XA', i, T);
    const key = core.countryKeyPoint('XA', i);
    const partsOk = drawable ? parts.length > 0 : parts.length === 0;
    const keyOk = drawable ? key !== null : key === null;
    ok(partsOk, `countryParts is wrong for: ${label}`, { parts: parts.length, expected: drawable });
    ok(keyOk, `countryKeyPoint is wrong for: ${label}`, { key, expected: drawable });
    // I12's biconditional, on every one of them.
    ok((parts.length === 0) === (key === null),
       `I12's biconditional breaks for: ${label}`, { parts: parts.length, key });
    // No part may ever carry a non-finite box.
    const bad = parts.filter((p) => !p.box.every(Number.isFinite));
    ok(bad.length === 0, `a non-finite part box survived: ${label}`, bad);
    if (drawable && key) {
      ok(Number.isFinite(key.lat) && Number.isFinite(key.lng),
         `the key point is non-finite for: ${label}`, key);
    }
  }
  // A code the index does not carry at all.
  const i0 = idx([{ code: 'XA', rings: [sq(0, 0)] }]);
  ok(core.countryParts('ZZ', i0, T).length === 0, 'an absent code returned parts');
  ok(core.countryKeyPoint('ZZ', i0) === null, 'an absent code returned a key point');
  // Two ENTRIES for one code, one of them undrawable — all-or-stated across entries.
  const i1 = idx([{ code: 'XA', rings: [sq(0, 0)] }, { code: 'XA', rings: [[9]] }]);
  ok(core.countryParts('XA', i1, T).length === 0,
     'all-or-stated does not hold ACROSS entries — the good entry was drawn alone');
  ok(core.countryKeyPoint('XA', i1) === null, 'countryKeyPoint drew from the good entry alone');
}

// ===========================================================================
head('B — I19 through worldMapFrame: no NaN in any emitted field, and `missing` states it');
{
  const malformed = [
    ['[]',            []],
    ['[[]]',          [[]]],
    ['[[7]]',         [[7]]],
    ['[[1,2,3]]',     [[1, 2, 3]]],
    ['[[1,NaN]]',     [[1, NaN]]],
    ['[[1,2,Inf,4]]', [[1, 2, Infinity, 4]]],
  ];
  for (const [label, rings] of malformed) {
    // Alone, which for a single-code library is the WHOLE surface.
    const i = idx([{ code: 'XA', rings }]);
    const f = worldMapFrame(stats(['XA']), i);
    const json = JSON.stringify(f);
    ok(!json.includes('NaN') && !json.includes('null,null'),
       `a NaN survived into the frame for a single-code library, rings = ${label}`, json.slice(0, 200));
    ok(f.missing.length === 1 && f.missing[0] === 'XA',
       `the code did not land in \`missing\` exactly once, rings = ${label}`, f.missing);
    ok(f.countries.length === 0, `an undrawable code was still drawn, rings = ${label}`, f.countries.length);
    ok(f.panes.every((p) => p.viewBox.split(/\s+/).every((n) => Number.isFinite(Number(n)))),
       `a viewBox carries a non-finite number, rings = ${label}`, f.panes.map((p) => p.viewBox));
    ok(f.panes.every((p) => Number.isFinite(p.aspect)),
       `a pane aspect is non-finite, rings = ${label}`, f.panes.map((p) => p.aspect));

    // …and beside a HEALTHY code, where a NaN would poison the shared pane's bounds.
    const i2 = idx([{ code: 'XA', rings }, { code: 'XB', rings: [sq(10, 50)] }]);
    const f2 = worldMapFrame(stats(['XA', 'XB']), i2);
    const j2 = JSON.stringify(f2);
    ok(!j2.includes('NaN'), `a NaN survived beside a healthy code, rings = ${label}`, j2.slice(0, 200));
    ok(f2.missing.length === 1 && f2.missing[0] === 'XA',
       `the undrawable code was not stated beside a healthy one, rings = ${label}`, f2.missing);
    ok(f2.countries.length === 1 && f2.countries[0].code === 'XB',
       `the healthy code was lost, rings = ${label}`, f2.countries.map((c) => c.code));
    // I1: exactly one of countries / missing, never both, never neither.
    const drawn = new Set(f2.countries.map((c) => c.code));
    ok(!drawn.has('XA') && !f2.missing.includes('XB'), `I1 broken, rings = ${label}`);
  }
  // The empty library — I7's WHOLE_WORLD arm must still hold with D in place.
  const fe = worldMapFrame(stats([]), idx([{ code: 'XA', rings: [sq(0, 0)] }]));
  ok(fe.panes.length === 1 && !JSON.stringify(fe).includes('NaN'), 'the empty library is not I7-clean', fe);
}

// ===========================================================================
head('C — the shipped COUNTRY_INDEX census, recomputed');
{
  const entries = COUNTRY_INDEX.countries;
  let ringCount = 0, shortest = Infinity, odd = 0, nonFinite = 0, noRing = 0, under6 = 0;
  const codes = new Set();
  for (const e of entries) {
    codes.add(e.code);
    if (e.rings.length === 0) noRing++;
    for (const r of e.rings) {
      ringCount++;
      if (r.length < shortest) shortest = r.length;
      if (r.length % 2 !== 0) odd++;
      if (r.length < 6) under6++;
      for (const v of r) if (!Number.isFinite(v)) nonFinite++;
    }
  }
  note(`entries ${entries.length} · distinct codes ${codes.size} · rings ${ringCount} · shortest ${shortest} · odd ${odd} · non-finite ${nonFinite} · ring-less entries ${noRing} · rings under 6 elements ${under6}`);
  ok(entries.length === 292, 'the entry count is not 292', entries.length);
  ok(ringCount === 1033, 'the ring count is not 1,033', ringCount);
  ok(shortest === 8, 'the shortest ring is not 8 elements', shortest);
  ok(odd === 0, 'the index carries an ODD-LENGTH ring', odd);
  ok(nonFinite === 0, 'the index carries a NON-FINITE coordinate', nonFinite);
  ok(noRing === 0, 'the index carries an entry with no ring at all', noRing);
  ok(codes.size === 239, 'the distinct-code count is not 239', codes.size);
  // The census that actually matters: predicate D, applied.
  let rejected = 0;
  for (const c of codes) if (core.countryParts(c, COUNTRY_INDEX, T).length === 0) rejected++;
  ok(rejected === 0, 'a SHIPPED code is rejected by predicate D', rejected);
  // …and the one A-54 Part 7 residue 13 says is now redundant, measured rather than assumed.
  ok(under6 === 0, 'a shipped ring is under 6 elements, so the generator filter is NOT redundant', under6);
}

// ===========================================================================
head('D — byte-neutrality of the D change on the shipped artefact, against re-derived pre-I-8j code');
{
  // The pre-I-8j `countryKeyPoint`, re-implemented here from the diff, as the oracle.
  const EARTH_R_KM = 6371.0088;
  const ringAreaKm2 = (ring) => {
    // Same shoelace-on-a-sphere the module uses; only used for the ordering, so any monotone
    // equivalent would do — this is copied to keep the comparison exact.
    let sum = 0;
    const n = Math.floor(ring.length / 2);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const l1 = (ring[2 * i] * Math.PI) / 180, p1 = (ring[2 * i + 1] * Math.PI) / 180;
      const l2 = (ring[2 * j] * Math.PI) / 180, p2 = (ring[2 * j + 1] * Math.PI) / 180;
      sum += (l2 - l1) * (2 + Math.sin(p1) + Math.sin(p2));
    }
    return Math.abs((sum * EARTH_R_KM * EARTH_R_KM) / 2);
  };
  const oldKeyPoint = (code, index) => {
    let principal = null, principalArea = -1, seen = false;
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    for (const entry of index.countries) {
      if (entry.code !== code) continue;
      seen = true;
      const b = entry.box;
      if (b[0] < west) west = b[0];
      if (b[1] < south) south = b[1];
      if (b[2] > east) east = b[2];
      if (b[3] > north) north = b[3];
      for (const ring of entry.rings) {
        if (ring.length < 6) continue;
        const a = ringAreaKm2(ring);
        if (a > principalArea) { principalArea = a; principal = ring; }
      }
    }
    if (!seen) return null;
    if (principal === null) {
      if (![west, south, east, north].every(Number.isFinite)) return null;
      return { lat: (south + north) / 2, lng: (west + east) / 2 };
    }
    let rw = Infinity, rs = Infinity, re = -Infinity, rn = -Infinity;
    for (let i = 0; i + 1 < principal.length; i += 2) {
      if (principal[i] < rw) rw = principal[i];
      if (principal[i] > re) re = principal[i];
      if (principal[i + 1] < rs) rs = principal[i + 1];
      if (principal[i + 1] > rn) rn = principal[i + 1];
    }
    return { lat: (rs + rn) / 2, lng: (rw + re) / 2 };
  };

  const allCodes = [...new Set(COUNTRY_INDEX.countries.map((e) => e.code))].sort();
  let keyMoved = 0;
  for (const c of allCodes) {
    const a = core.countryKeyPoint(c, COUNTRY_INDEX), b = oldKeyPoint(c, COUNTRY_INDEX);
    if (JSON.stringify(a) !== JSON.stringify(b)) { keyMoved++; note(`key moved: ${c} ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); }
  }
  ok(keyMoved === 0, `${keyMoved} shipped codes' key points MOVED under the D change`, keyMoved);

  // `countryParts` at 8 thresholds vs. I12, which is the invariant that binds the two.
  let i12 = 0, partsBad = 0;
  for (const t of [0, 1, 100, 500, 900, 2000, 4000, 20000]) {
    for (const c of allCodes) {
      const parts = core.countryParts(c, COUNTRY_INDEX, t);
      const p = parts.find((x) => x.principal);
      const k = core.countryKeyPoint(c, COUNTRY_INDEX);
      if (!p || !k || !Object.is(p.key.lat, k.lat) || !Object.is(p.key.lng, k.lng)) i12++;
      if (parts.some((x) => !x.box.every(Number.isFinite))) partsBad++;
    }
  }
  ok(i12 === 0, `I12 breaks on the shipped index at ${i12} (code, threshold) pairs`, i12);
  ok(partsBad === 0, 'a shipped part carries a non-finite box', partsBad);
}

// ===========================================================================
head('E — G5′: the key order, and the library where the WITHDRAWN key disagrees');
{
  // Two panes, tied on weight and home.length, with `north` DISAGREEING with canonical (ISO)
  // order: `AA` is south of `ZB`. Under A-51's withdrawn third key `AA` leads; under G5′ `ZB`
  // does. This is the load-bearing test: the two rules give different answers.
  const i = idx([
    { code: 'AA', rings: [sq(0, -40)] },     // far south
    { code: 'ZB', rings: [sq(0, 60)] },      // far north
  ]);
  const f = worldMapFrame(stats(['AA', 'ZB']), i);
  note(`panes: ${f.panes.map((p) => `${p.codes.join('+')}@N${p.bounds.north.toFixed(2)}`).join(' · ')}`);
  ok(f.panes.length === 2, 'the fixture did not produce two panes', f.panes.length);
  ok(f.panes[0].codes[0] === 'ZB',
     'the NEW geographic key is NOT load-bearing — the pane order still matches the alphabet',
     f.panes.map((p) => p.codes));
  ok(f.panes[0].bounds.north > f.panes[1].bounds.north, 'panes are not ordered north-first',
     f.panes.map((p) => p.bounds.north));

  // …and the same fixture with the ISO codes SWAPPED, so the alphabet would invert. G5′ must
  // give the same GEOGRAPHIC answer: north first, whatever it is called.
  const i2 = idx([
    { code: 'ZA', rings: [sq(0, -40)] },
    { code: 'AB', rings: [sq(0, 60)] },
  ]);
  const f2 = worldMapFrame(stats(['AB', 'ZA']), i2);
  ok(f2.panes[0].codes[0] === 'AB', 'the order flipped when only the NAMES changed', f2.panes.map((p) => p.codes));
  ok(Math.abs(f2.panes[0].bounds.north - f.panes[0].bounds.north) < 1e-9,
     'the leading pane is not the same rectangle under a relabel');

  // Key 4: `north` ties, `west` decides — and the rows are given EAST-first so the withdrawn
  // canonical key would invert the answer.
  const i3 = idx([
    { code: 'AE', rings: [sq(80, 10)] },   // east, first in canonical order
    { code: 'ZW', rings: [sq(-80, 10)] },  // west, second
  ]);
  const f3 = worldMapFrame(stats(['AE', 'ZW']), i3);
  note(`west test: ${f3.panes.map((p) => `${p.codes.join('+')}@W${p.bounds.west.toFixed(2)}`).join(' · ')}`);
  ok(f3.panes.length === 2 && f3.panes[0].codes[0] === 'ZW',
     'key 4 (`bounds.west` ascending) is not load-bearing', f3.panes.map((p) => p.codes));

  // Key 1 still outranks the new keys: I18 may not be reachable by latitude.
  const i4 = idx([
    { code: 'AA', rings: [sq(0, -40)] },
    { code: 'ZB', rings: [sq(0, 60)] },
  ]);
  const s4 = { countries: [
    { code: 'AA', cityCount: 1, tripIds: ['t1', 't2'], firstVisit: '2026-01-01', lastVisit: '2026-01-02' },
    { code: 'ZB', cityCount: 1, tripIds: ['t3'], firstVisit: '2026-01-01', lastVisit: '2026-01-02' },
  ] };
  const f4 = worldMapFrame(s4, i4);
  ok(f4.panes[0].codes[0] === 'AA',
     'the latitude key OVERTOOK `weight` — I18 and G5 key 1 are reachable by geography',
     f4.panes.map((p) => [p.codes, p.weight]));

  // The comparator is read directly, not inferred: the exact key sequence in the source.
  const src = readFileSync('packages/client/src/selectors/worldMap.ts', 'utf8');
  const cmp = src.slice(src.indexOf('built.sort('), src.indexOf('built.sort(') + 2000);
  const order = [...cmp.matchAll(/^\s*(?:if \(a\.|return a\.)(weight|home\.length|bounds\.north|bounds\.west|members\[0\])/gm)].map((m) => m[1]);
  note(`comparator keys, in source order: ${order.join(' → ')}`);
  ok(JSON.stringify(order) === JSON.stringify(['weight', 'home.length', 'bounds.north', 'bounds.west', 'members[0]']),
     'the comparator does not implement G5′\'s exact key order', order);
  ok(/b\.weight - a\.weight/.test(cmp) && /b\.home\.length - a\.home\.length/.test(cmp)
     && /b\.bounds\.north - a\.bounds\.north/.test(cmp) && /a\.bounds\.west - b\.bounds\.west/.test(cmp)
     && /a\.members\[0\] - b\.members\[0\]/.test(cmp),
     'a key is sorted in the wrong DIRECTION', cmp);
}

// ===========================================================================
head('F — FR+US, determinism, and the comparator\'s totality');
{
  const f = worldMapFrame(stats(['FR', 'US']), COUNTRY_INDEX);
  note(`FR+US panes: ${f.panes.map((p) => `${p.codes.join('+')} home=[${p.home}] w=${p.weight} N=${p.bounds.north.toFixed(1)}`).join(' · ')}`);
  ok(f.panes[0].home[0] === 'FR' && f.panes[1].home[0] === 'US',
     'France no longer precedes the US', f.panes.map((p) => p.home));
  ok(f.panes[0].bounds.north > f.panes[1].bounds.north,
     'France precedes the US for a reason OTHER than latitude', [f.panes[0].bounds.north, f.panes[1].bounds.north]);
  const extents = f.panes.filter((p) => p.home.length === 0);
  note(`extent panes: ${extents.map((p) => `${p.codes.join('+')} N=${p.bounds.north.toFixed(1)}`).join(' · ')}`);
  ok(extents.length === 2 && extents[0].bounds.north > extents[1].bounds.north,
     'the two extent panes are not north-ordered (Alaska before French Guiana)',
     extents.map((p) => p.bounds.north));

  // I18 over a wide sweep: no extent pane may precede a home pane.
  const CODES = [...new Set(COUNTRY_INDEX.countries.map((e) => e.code))].sort();
  let i18 = 0, nan = 0, panes = 0;
  for (let a = 0; a < CODES.length; a += 7) {
    for (let b = a + 1; b < CODES.length; b += 31) {
      const fr = worldMapFrame(stats([CODES[a], CODES[b]]), COUNTRY_INDEX);
      let seenExtent = false;
      for (const p of fr.panes) {
        panes++;
        if (!Number.isFinite(p.bounds.north) || !Number.isFinite(p.bounds.west)
            || !Number.isFinite(p.aspect) || p.viewBox.includes('NaN')) nan++;
        if (p.home.length === 0) seenExtent = true;
        else if (seenExtent) i18++;
      }
    }
  }
  note(`swept ${panes} panes over sampled two-country libraries`);
  ok(i18 === 0, 'I18 is violated — an extent pane precedes a home pane', i18);
  ok(nan === 0, 'a non-finite bound/aspect/viewBox reached a pane on the SHIPPED index', nan);

  // Determinism, and independence from the ISO NAME: an order-destroying relabel.
  const rot = (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + 7) % 26) + 65)
                   + String.fromCharCode(((c.charCodeAt(1) - 65 + 11) % 26) + 65);
  const relabelled = countryIndex({
    scale: COUNTRY_INDEX.scale, source: COUNTRY_INDEX.source,
    countries: COUNTRY_INDEX.countries.map((e) => ({ code: rot(e.code), rings: e.rings })),
  });
  let moved = 0, checked = 0;
  const LIBS = [['FR', 'US'], ['AT', 'CZ', 'DE', 'HR', 'HU', 'SI'], ['CL', 'NO', 'JP', 'MG'],
                ['FR', 'GR'], ['GB', 'AU'], ['US', 'JP'], ['FR', 'DE', 'IT', 'JP', 'PE'],
                ['AQ', 'FJ'], ['CA', 'GL'], ['RU', 'US']];
  for (const lib of LIBS) {
    checked++;
    const a = worldMapFrame(stats(lib), COUNTRY_INDEX);
    const b = worldMapFrame(stats(lib.map(rot)), relabelled);
    const sameOrder = JSON.stringify(a.panes.map((p) => [p.viewBox, p.weight, p.home.length]))
                   === JSON.stringify(b.panes.map((p) => [p.viewBox, p.weight, p.home.length]));
    if (!sameOrder) { moved++; note(`order moved under relabel: ${lib.join('+')}`); }
  }
  ok(moved === 0, `pane ORDER moved under an order-destroying relabel in ${moved} of ${checked} libraries`, moved);

  // Byte-identity of the reference sample's three viewBoxes across BOTH increments.
  const ref = worldMapFrame(stats(['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US']), COUNTRY_INDEX);
  note(`reference viewBoxes: ${ref.panes.map((p) => p.viewBox).join(' | ')}`);
  ok(ref.panes.map((p) => p.viewBox).join('|') ===
     ['-8.1779 -59.2407 31.494 17.3663', '-125.8416 -50.5435 60.0314 26.618',
      '-172.8399 -72.4066 43.9088 54.5393'].join('|'),
     'the reference sample\'s three viewBox strings MOVED', ref.panes.map((p) => p.viewBox));
}

// ===========================================================================
head('G — I19 vs D: predicate D bounds the INPUTS, and I19 is a claim about the OUTPUTS');
{
  // A-54 Part 6 states I19 as **"for every library and every index"**: no `pane.viewBox`
  // contains `NaN`, no `pane.aspect` is non-finite. D admits any FINITE coordinate — Part 2 is
  // explicit that there is "no other test" — but `paneFrame` (worldMap.ts:281) computes
  // `east - west`, which overflows to `Infinity` for a span above `Number.MAX_VALUE`, and then
  // `Infinity - Infinity` is `NaN`. So D is not sufficient for I19 and the boundary is findable.
  const bad = [];
  for (const m of [1e6, 1e100, 1e300, 1e306, 1e307, 1e308, 1.7e308]) {
    const ring = [-m, -m, m, -m, m, m, -m, m];
    const i = idx([{ code: 'XA', rings: [ring] }]);
    const parts = core.countryParts('XA', i, T);
    const f = worldMapFrame(stats(['XA']), i);
    const vb = f.panes.map((p) => p.viewBox).join(' ');
    const finiteBoxes = parts.every((p) => p.box.every(Number.isFinite));
    const i19 = !vb.includes('NaN') && !vb.includes('Infinity') && f.panes.every((p) => Number.isFinite(p.aspect));
    note(`|coord| = ${m}: D accepts (part boxes finite: ${finiteBoxes}) · viewBox ${JSON.stringify(vb)} · aspect ${JSON.stringify(f.panes.map((p) => p.aspect))} · missing ${JSON.stringify(f.missing)}`);
    if (!i19) bad.push({ m, vb, aspect: f.panes.map((p) => p.aspect), missing: f.missing });
  }
  ok(bad.length === 0,
     'I19 does NOT hold "for every index": a finite-coordinate ring D accepts still produces a non-finite frame with `missing: []` — R39-1\'s exact symptom',
     bad);
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}`);
process.exit(fails === 0 ? 0 : 1);
