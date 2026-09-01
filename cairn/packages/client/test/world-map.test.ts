/**
 * `worldMapFrame` — ARCHITECTURE §4.4 **A-40** Part 3, and ROADMAP I-8a.
 *
 * A-40's ruling is that the lifetime map is **a plain component over a pure function**, and
 * that everything geometric happens in this selector so that `node --test` can hold it with
 * no browser at all. These tests are that hold. Each of A-40's four clauses gets an
 * assertion, and both of `CLAUDE.md`'s inherited map bugs get one *as an assertion rather
 * than a comment* — the cluster/min-span half here, the never-fit-while-hidden half as
 * A-40 Part 4's W1 ceiling in `test/views.test.ts` (this function cannot express that bug,
 * which is the whole point of the ruling).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as core from '../src/deps.ts';
import { worldMapFrame, WORLD_CLUSTER_THRESHOLD_KM } from '../src/selectors/worldMap.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Fixtures. Hand-written rings, so the projection is checkable by eye.
// ---------------------------------------------------------------------------

/** A closed square ring, `[lng, lat, …]`, corners anticlockwise from the SW. */
const square = (lng: number, lat: number, size: number): number[] => [
  lng, lat,
  lng + size, lat,
  lng + size, lat + size,
  lng, lat + size,
];

/**
 * `countryIndex()` is not on core's §2.10 export surface and I-8a may not add to it, so the
 * fixture is assembled here — the box is what `countryIndex` would have derived, computed
 * from the same rings, which is the whole of what the builder does.
 */
function entry(code: string, rings: number[][]): core.CountryEntry {
  const lngs = rings.flatMap((r) => r.filter((_, i) => i % 2 === 0));
  const lats = rings.flatMap((r) => r.filter((_, i) => i % 2 === 1));
  return {
    code,
    rings,
    box: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
  };
}

const FIXTURE: core.CountryIndex = {
  scale: 'test',
  source: 'hand-written',
  countries: [
    entry('AA', [square(10, 40, 2)]),
    entry('BB', [square(-30, -10, 4)]),
    // A code with TWO entries — §8.4 A-27's union. One row, one `d`.
    entry('CC', [square(100, 0, 1)]),
    entry('CC', [square(120, 0, 1)]),
    // A country far smaller than `MIN_SPAN_KM` — 0.001° ≈ 111 m.
    entry('TT', [square(5, 5, 0.001)]),
  ],
};

function statsOf(
  rows: Array<{ code: string; provisional?: boolean; tripIds?: string[] }>,
): core.TravelStats {
  return {
    countries: rows.map((r) => ({
      code: r.code,
      firstVisit: '2020-01-01' as core.IsoDate,
      lastVisit: '2020-01-10' as core.IsoDate,
      tripIds: r.tripIds ?? ['t1'],
      provisional: r.provisional ?? false,
    })),
    cities: [],
    trips: { planned: 0, active: 0, completed: 1 },
    daysTravelled: 10,
    located: { cities: 0, places: 0, stops: 0 },
    unattributed: { cities: 0, places: 0, stops: 0 },
    unnamedCities: 0,
  };
}

// ---------------------------------------------------------------------------
// Clause 1 — the projection is equirectangular: x = lng, y = -lat.
// ---------------------------------------------------------------------------

test('A-40 clause 1: the projection is equirectangular — x = lng, y = -lat', () => {
  const frame = worldMapFrame(statsOf([{ code: 'AA' }]), FIXTURE);
  assert.equal(frame.countries.length, 1);
  // The ring is (10,40) (12,40) (12,42) (10,42); y is the NEGATED latitude, so
  // north (lat 42) is the SMALLER y — which is what makes the map the right way up.
  assert.equal(frame.countries[0].d, 'M10,-40L12,-40L12,-42L10,-42Z');
});

test('A-40 clause 1: no scaling constant — a southern-hemisphere ring keeps its own numbers', () => {
  const frame = worldMapFrame(statsOf([{ code: 'BB' }]), FIXTURE);
  assert.equal(frame.countries[0].d, 'M-30,10L-26,10L-26,6L-30,6Z');
});

test('every ring of every entry for a code lands in one `d`, as one row (A-27 union)', () => {
  const frame = worldMapFrame(statsOf([{ code: 'CC' }]), FIXTURE);
  assert.equal(frame.countries.length, 1, 'two entries, one country row');
  assert.equal(frame.countries[0].d.split('M').length - 1, 2, 'two subpaths');
  assert.ok(frame.countries[0].d.startsWith('M100,0L'));
  assert.ok(frame.countries[0].d.includes('M120,0L'));
});

// ---------------------------------------------------------------------------
// Clause 2 — the extent comes from core's `mapBounds` and nothing else.
// This is CLAUDE.md's SECOND inherited map bug (cluster/guard before fitting),
// as an assertion.
// ---------------------------------------------------------------------------

test('A-40 clause 2: `bounds` is exactly `core.mapBounds` over the visited boxes\' corners', () => {
  const frame = worldMapFrame(statsOf([{ code: 'AA' }, { code: 'BB' }]), FIXTURE);
  const want = core.mapBounds([
    { lat: 40, lng: 10 }, { lat: 40, lng: 12 }, { lat: 42, lng: 12 }, { lat: 42, lng: 10 },
    { lat: -10, lng: -30 }, { lat: -10, lng: -26 }, { lat: -6, lng: -26 }, { lat: -6, lng: -30 },
  ]);
  assert.deepEqual(frame.bounds, want);
});

/**
 * **Moved at I-8d**, and named in advance as a moved test: A-41 Part 4 adds the padding term,
 * so the `viewBox` is no longer the bare box. What the test is *for* is unchanged — the
 * extent comes from `bounds` and never from the raw path coordinates — and the padding is
 * asserted independently below ("A-41 Part 4").
 */
test('A-40 clause 2: the viewBox is derived from `bounds`, not from the raw path coordinates', () => {
  const frame = worldMapFrame(statsOf([{ code: 'AA' }]), FIXTURE);
  const b = frame.bounds;
  const pad = 0.02 * Math.max(b.east - b.west, b.north - b.south);
  assert.equal(
    frame.viewBox,
    `${b.west - pad} ${-(b.north + pad)} ${b.east - b.west + 2 * pad} ${b.north - b.south + 2 * pad}`,
  );
  assert.equal(frame.viewBox, '9.96 -42.04 2.08 2.08');
});

test(
  'inherited map bug 2 — the min-span guard: a country smaller than MIN_SPAN_KM is clamped, ' +
  'and the viewBox is the CLAMPED box, not the raw one',
  () => {
    const frame = worldMapFrame(statsOf([{ code: 'TT' }]), FIXTURE);
    assert.equal(frame.bounds.clamped, true, 'core widened the box');
    assert.equal(frame.bounds.spanKm, core.MIN_SPAN_KM);
    // The raw box is 0.001° wide; the clamped one is MIN_SPAN_KM/2 either side of centre.
    const width = Number(frame.viewBox.split(' ')[2]);
    assert.ok(width > 0.001, `viewBox width ${width} must exceed the raw 0.001° box`);
    // The injected fault A-40 names — building the extent from the box directly — produces
    // exactly 0.001, so this is the number that separates the two implementations.
    assert.ok(Math.abs(width - 0.001) > 1e-4, 'a raw-box extent would be 0.001');
  },
);

test('the shipped index: VA clamps and AT does not — the guard is live on real geometry', () => {
  const va = worldMapFrame(statsOf([{ code: 'VA' }]), core.COUNTRY_INDEX);
  assert.equal(va.bounds.clamped, true, 'Vatican City is under MIN_SPAN_KM across');
  const at = worldMapFrame(statsOf([{ code: 'AT' }]), core.COUNTRY_INDEX);
  assert.equal(at.bounds.clamped, false, 'Austria is 631 km across — the guard must NOT fire');
  assert.ok(at.bounds.spanKm > 600);
});

// ---------------------------------------------------------------------------
// Clause 3 — `missing` is populated, never dropped.
// ---------------------------------------------------------------------------

test('A-40 clause 3: a code the index cannot fill is reported in `missing`, in row order', () => {
  const frame = worldMapFrame(statsOf([{ code: 'AA' }, { code: 'ZZ' }, { code: 'QQ' }]), FIXTURE);
  assert.deepEqual(frame.missing, ['ZZ', 'QQ']);
  assert.deepEqual(frame.countries.map((c) => c.code), ['AA']);
});

test('A-40 clause 3: countries + missing account for every row — nothing is dropped silently', () => {
  const rows = [{ code: 'ZZ' }, { code: 'AA' }, { code: 'QQ' }, { code: 'BB' }];
  const frame = worldMapFrame(statsOf(rows), FIXTURE);
  assert.equal(frame.countries.length + frame.missing.length, rows.length);
});

test('a frame with nothing drawable still carries the missing codes', () => {
  const frame = worldMapFrame(statsOf([{ code: 'ZZ' }]), FIXTURE);
  assert.deepEqual(frame.countries, []);
  assert.deepEqual(frame.missing, ['ZZ']);
  assert.equal(frame.bounds.empty, true);
});

// ---------------------------------------------------------------------------
// The two flags A-40 forbids being dropped between core and the surface.
// ---------------------------------------------------------------------------

test('A-34: `provisional` is carried verbatim from the TravelStatsCountry row', () => {
  const frame = worldMapFrame(
    statsOf([{ code: 'AA', provisional: false }, { code: 'BB', provisional: true }]),
    FIXTURE,
  );
  // `countries` is emitted in C9's paint order (A-48 Part 5), so this is BB before AA in the
  // fixture's index order; the flag each row carries is the assertion.
  assert.deepEqual(
    frame.countries.map((c) => [c.code, c.provisional]).sort(),
    [['AA', false], ['BB', true]],
  );
});

test('`tripIds` is carried verbatim, in canonical row order — it drives "tap for its trips"', () => {
  const frame = worldMapFrame(statsOf([{ code: 'AA', tripIds: ['b', 'a', 'c'] }]), FIXTURE);
  assert.deepEqual(frame.countries[0].tripIds, ['b', 'a', 'c']);
});

/**
 * **Changed at I-8g by A-48 C9** — and the change is the fix, not a side effect. `countries`
 * used to be canonical row order, which paints the alphabetically later code on top of the
 * earlier one and left `AD` with no self-hit-testable pixel anywhere inside France (QA R36-7).
 * It is now **descending index position**, and the index is ordered by ascending ring area, so
 * the large paint first and the small end up on top. `pane.codes` is what stayed canonical (I2).
 */
test('A-48 C9: country rows are emitted in paint order — descending index position', () => {
  const frame = worldMapFrame(statsOf([{ code: 'CC' }, { code: 'AA' }, { code: 'BB' }]), FIXTURE);
  // FIXTURE's entry order is AA, BB, CC, CC, TT; CC's LAST entry is the latest of the three.
  assert.deepEqual(frame.countries.map((c) => c.code), ['CC', 'BB', 'AA']);
  assert.deepEqual(frame.panes[0].codes, ['CC', 'AA', 'BB'], 'pane.codes stays canonical row order');
});

// ---------------------------------------------------------------------------
// The empty history, and purity.
// ---------------------------------------------------------------------------

test('an empty history fits the whole world rather than a zero-area box', () => {
  const frame = worldMapFrame(statsOf([]), FIXTURE);
  assert.deepEqual(frame.countries, []);
  assert.deepEqual(frame.missing, []);
  assert.equal(frame.bounds.empty, true);
  assert.equal(frame.viewBox, '-180 -90 360 180');
});

test('A-40 clause 4: no memoisation — two calls return equal, independent frames', () => {
  const stats = statsOf([{ code: 'AA' }]);
  const a = worldMapFrame(stats, FIXTURE);
  const b = worldMapFrame(stats, FIXTURE);
  assert.notEqual(a, b, 'no cached object is handed back');
  assert.deepEqual(a, b, 'and the answer does not drift between calls');
});

test('the frame mutates neither the stats nor the index', () => {
  const stats = statsOf([{ code: 'AA' }, { code: 'ZZ' }]);
  const before = JSON.stringify(stats);
  const indexBefore = JSON.stringify(FIXTURE);
  worldMapFrame(stats, FIXTURE);
  assert.equal(JSON.stringify(stats), before);
  assert.equal(JSON.stringify(FIXTURE), indexBefore);
});

test('it never throws for a stats row the index cannot serve', () => {
  assert.doesNotThrow(() => worldMapFrame(statsOf([{ code: '--' }, { code: '' }]), FIXTURE));
});

// ---------------------------------------------------------------------------
// A-40 Part 5 — the payload ceiling. Measured, not assumed.
// ---------------------------------------------------------------------------

test('A-40 Part 5: the reference library\'s emitted `d` payload is under the 512 KB ceiling', () => {
  // Europe 2026 plus the return leg: the countries the shipped sample can produce.
  const frame = worldMapFrame(
    statsOf([{ code: 'AT' }, { code: 'HR' }, { code: 'CZ' }, { code: 'HU' }, { code: 'GB' }, { code: 'US' }]),
    core.COUNTRY_INDEX,
  );
  const bytes = frame.countries.reduce((n, c) => n + Buffer.byteLength(c.d, 'utf8'), 0);
  assert.ok(bytes < 512 * 1024, `emitted d payload ${bytes} B exceeds the 512 KB ceiling`);
});

// ===========================================================================
// I-8d — ARCHITECTURE §4.4 **A-41** (the atlas frame) and **A-42**.
//
// A-41 Part 3 is a contract, not a suggestion: one key point per country (C2), a
// single-linkage first-fit partition at 4,000 km (C3/C4), a strict-weight-majority
// dominance test that keeps the rule from over-firing (C5), a total deterministic ranking
// (C6), at most three panes with nothing dropped (C7), and every pane's extent from
// `core.mapBounds` (C8). Part 4 adds the padding term, Part 5 the seven invariants.
//
// Every test below names the clause it holds.
// ===========================================================================

/** A second index, positioned so the 4,000 km threshold is exercised on real distances. */
const ATLAS: core.CountryIndex = {
  scale: 'test',
  source: 'hand-written',
  countries: [
    entry('EA', [square(9, 49, 2)]),     // key point (50, 10)
    entry('EB', [square(15, 47, 2)]),    // key point (48, 16)   ~ 490 km from EA
    entry('EC', [square(13, 44, 2)]),    // key point (45, 14)   ~ 610 km from EA
    entry('NA', [square(-78, 38, 2)]),   // key point (39, -77)  ~ 6,900 km from EA
    entry('NB', [square(-100, 38, 2)]),  // key point (39, -99)  ~ 1,900 km from NA
    entry('JP', [square(138, 34, 2)]),   // key point (35, 139)
    entry('AU', [square(150, -34, 2)]),  // key point (-33, 151) ~ 7,800 km from JP
    entry('KE', [square(35, -2, 2)]),    // key point (-1, 36)
  ],
};

/** The shipped reference library — the row A-41 Part 1 measured. */
const REFERENCE = ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US'];

/** `n` trips on a code, so `weight` (Σ tripIds.length) can be set per country. */
const trips = (code: string, n: number) => ({ code, tripIds: Array.from({ length: n }, (_, i) => `${code}-${i}`) });

/** Every vertex of an emitted `d`, in frame coordinates. */
function vertices(d: string): Array<{ x: number; y: number }> {
  const out = [...d.matchAll(/[ML](-?[\d.eE+]+),(-?[\d.eE+]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
  const commands = (d.match(/[ML]/g) ?? []).length;
  assert.equal(out.length, commands, `the vertex parser missed a command in ${d.slice(0, 80)}…`);
  return out;
}

function box(viewBox: string): { minX: number; minY: number; w: number; h: number } {
  const [minX, minY, w, h] = viewBox.split(' ').map(Number);
  return { minX, minY, w, h };
}

// ---------------------------------------------------------------------------
// C5 — the headline case. The shipped sample splits, and the arithmetic says why.
// ---------------------------------------------------------------------------

test('A-41 C5: the reference library splits into a main pane and one inset', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 2);
  assert.deepEqual(frame.panes[0].codes, ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU']);
  assert.deepEqual(frame.panes[1].codes, ['US']);
  assert.equal(frame.panes[0].weight, 6, 'Σ tripIds.length over the six European codes');
  assert.equal(frame.panes[1].weight, 1);
  // 2 × 6 > 7 — a strict majority of the traveller's own record.
  assert.ok(2 * frame.panes[0].weight > frame.panes.reduce((n, p) => n + p.weight, 0));
});

test('A-41 C8: the reference main pane frames Europe, not the world', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  const b = frame.panes[0].bounds;
  const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
  assert.equal(round4(b.east - b.west), 30.2827, 'A-41 Part 1 measured 30.2827° of longitude');
  assert.equal(round4(b.north - b.south), 16.155, 'and 16.155° of latitude');
  // The frame it replaces was one contiguous 194.5016° span.
  assert.ok(b.east - b.west < 194, 'the main pane must not still be the whole 194.5° extent');
});

test('A-41 Part 5: panes are identified positionally, and panes[0] is the main one', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  assert.deepEqual(frame.panes.map((p) => p.id), ['main', 'inset-1']);
  assert.deepEqual(frame.panes.map((p) => p.role), ['main', 'inset']);
});

test('A-41 Part 5: `viewBox` and `bounds` still mean panes[0], so the old consumer is unbroken', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  assert.equal(frame.viewBox, frame.panes[0].viewBox);
  assert.deepEqual(frame.bounds, frame.panes[0].bounds);
});

// ---------------------------------------------------------------------------
// C4 — the threshold is a measured value, and it is load-bearing.
// ---------------------------------------------------------------------------

test('A-41 C4: the threshold is 4,000 km and it lives in the client, not in core', () => {
  assert.equal(WORLD_CLUSTER_THRESHOLD_KM, 4000);
  assert.equal((core as Record<string, unknown>).WORLD_CLUSTER_THRESHOLD_KM, undefined,
    'the threshold is framing policy; core owns the algorithm and not the number');
});

test('A-41 C4: at 4,000 km the reference key points are 2 groups; at 8,000 km they are 1', () => {
  // The injected fault the ROADMAP names, measured on the kernel rather than by rebuilding
  // the frame: raise the threshold and the split disappears. The key points come from core's
  // own `countryKeyPoint` (A-48 C2′) — the client has no second way to derive one.
  const keys = REFERENCE.map((code) => core.countryKeyPoint(code, core.COUNTRY_INDEX) as core.LatLng);
  assert.ok(keys.every((k) => k !== null));
  assert.equal(core.clusterPoints(keys, WORLD_CLUSTER_THRESHOLD_KM).length, 2);
  assert.equal(core.clusterPoints(keys, 8000).length, 1);
});

// ---------------------------------------------------------------------------
// C2 — one key point per COUNTRY, from the union of its entries' boxes.
// ---------------------------------------------------------------------------

/**
 * **A-48 C2′ (supersedes C2).** A country's key point is the box centre of its **principal
 * ring** — the ring of greatest absolute spherical area — and not the centre of the union of
 * its boxes, which is a point about a rectangle and can be in the open ocean (QA R36-1).
 *
 * `DD` here is the `FR` shape: an 8° mainland plus a 2° territory a hemisphere away. Under C2
 * its key is the union-box centre, 4,700 km from `EE` — which sits 550 km off the mainland —
 * and the frame splits, exiling the near neighbour to an inset. Under C2′ it is one pane.
 */
test('A-48 C2′: a code keys off its PRINCIPAL RING, so a distant territory cannot move it', () => {
  const index: core.CountryIndex = {
    scale: 'test', source: 'hand-written',
    countries: [
      entry('DD', [square(0, 42, 8), square(-100, -30, 2)]),   // mainland + a far territory
      entry('EE', [square(10, 45, 2)]),                        // 550 km from the mainland's centre
    ],
  };
  const frame = worldMapFrame(statsOf([trips('DD', 6), trips('EE', 1)]), index);
  assert.equal(frame.panes.length, 1, 'the key point is on the mainland, and EE is 550 km from it');
  assert.deepEqual(frame.panes[0].codes, ['DD', 'EE']);
  // The client does not derive the key itself: it is core's answer, verbatim.
  assert.deepEqual(core.countryKeyPoint('DD', index), { lat: 46, lng: 4 });
});

test('A-48 C2′: the client computes no key point of its own — the union-box rule is gone', () => {
  const src = readFileSync(resolve(HERE, '..', 'src', 'selectors', 'worldMap.ts'), 'utf8');
  assert.match(src, /core\.countryKeyPoint\(/, 'the frame does not call core.countryKeyPoint');
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  for (const banned of ['(south + north) / 2', '(west + east) / 2', 'haversine', '6371']) {
    assert.ok(!stripped.includes(banned), `worldMap.ts computes geometry of its own: ${banned}`);
  }
});

// ---------------------------------------------------------------------------
// C5 — the dominance test refuses to split a tie.
// ---------------------------------------------------------------------------

test('A-41 C5: two clusters of equal weight render as ONE frame', () => {
  const frame = worldMapFrame(statsOf([trips('NA', 1), trips('JP', 1)]), ATLAS);
  assert.equal(frame.panes.length, 1, 'no cluster carries a majority, so there is no subject to prioritise');
  assert.deepEqual(frame.panes[0].codes, ['NA', 'JP'], 'canonical order is the stats row order (C1)');
  assert.equal(frame.panes[0].weight, 2);
});

test('A-41 C5: twelve more trips on one side and the same library DOES split', () => {
  const frame = worldMapFrame(statsOf([trips('NA', 13), trips('JP', 1)]), ATLAS);
  assert.equal(frame.panes.length, 2);
  assert.deepEqual(frame.panes[0].codes, ['NA'], 'the dominant cluster is primary');
  assert.deepEqual(frame.panes[1].codes, ['JP']);
});

test('A-41 C5: a bare majority is not a majority — 2 × weight(primary) must EXCEED the total', () => {
  // Weights 3 and 3: `2 × 3 > 6` is false. One frame.
  const even = worldMapFrame(statsOf([trips('NA', 3), trips('JP', 3)]), ATLAS);
  assert.equal(even.panes.length, 1);
  // Weights 4 and 3: `2 × 4 > 7` is true. Two panes.
  const odd = worldMapFrame(statsOf([trips('NA', 4), trips('JP', 3)]), ATLAS);
  assert.equal(odd.panes.length, 2);
});

test('A-41 C5: one cluster never splits, however lopsided its weights', () => {
  const frame = worldMapFrame(statsOf([trips('EA', 40), trips('EB', 1)]), ATLAS);
  assert.equal(frame.panes.length, 1);
});

// ---------------------------------------------------------------------------
// C6 — ranking: weight desc, then country count desc, then lowest ISO code asc.
// ---------------------------------------------------------------------------

test('A-41 C6: equal-weight equal-count clusters are ordered by their lowest ISO code', () => {
  // Primary {EA,EB,EC} weighs 5; {AU} and {JP} weigh 2 each with one country each.
  // 2 × 5 > 9, so it splits; the inset is the alphabetically lower of the two.
  const frame = worldMapFrame(
    statsOf([trips('AU', 2), trips('EA', 2), trips('EB', 2), trips('EC', 1), trips('JP', 2)]),
    ATLAS,
  );
  assert.deepEqual(frame.panes[0].codes, ['EA', 'EB', 'EC']);
  assert.deepEqual(frame.panes[1].codes, ['AU'], 'AU < JP, and the tie-break is the lowest code');
  assert.deepEqual(frame.panes[2].codes, ['JP']);
});

/**
 * The tie-break has to be a **property of the clusters**, not of the order they happened to
 * be discovered in. Same library as above, with the rows in a different order: `JP`'s cluster
 * is found first, and `AU` must still take the inset because `AU < JP`. A comparator that
 * returns 0 on this pair leaves `JP` there (`Array.sort` is stable), which is exactly the
 * fault A-41 I6 forbids — a ranking that is not total.
 */
test('A-41 C6/I6: the lowest-ISO tie-break beats the order the clusters were discovered in', () => {
  const frame = worldMapFrame(
    statsOf([trips('EA', 2), trips('EB', 2), trips('EC', 1), trips('JP', 2), trips('AU', 2)]),
    ATLAS,
  );
  assert.deepEqual(frame.panes[0].codes, ['EA', 'EB', 'EC']);
  assert.deepEqual(frame.panes[1].codes, ['AU'], 'AU < JP even though JP\'s cluster came first');
  assert.deepEqual(frame.panes[2].codes, ['JP']);
});

test('A-41 C6: at equal weight, the cluster with more countries ranks higher', () => {
  // {NA,NB} weighs 2 across two countries; {JP} weighs 2 across one. Primary {EA,EB} weighs 5.
  const frame = worldMapFrame(
    statsOf([trips('EA', 3), trips('EB', 2), trips('JP', 2), trips('NA', 1), trips('NB', 1)]),
    ATLAS,
  );
  assert.deepEqual(frame.panes[0].codes, ['EA', 'EB']);
  assert.deepEqual(frame.panes[1].codes, ['NA', 'NB'], 'two countries outrank one at equal weight');
  assert.deepEqual(frame.panes[2].codes, ['JP']);
});

// ---------------------------------------------------------------------------
// C7 / I3 — at most three panes, and nothing is dropped at any cluster count.
// ---------------------------------------------------------------------------

test('A-41 C7: five clusters fold into three panes, the third being the union of the rest', () => {
  const rows = [trips('AU', 1), trips('EA', 6), trips('EB', 3), trips('EC', 3), trips('JP', 1),
                trips('KE', 1), trips('NA', 1), trips('NB', 1)];
  const frame = worldMapFrame(statsOf(rows), ATLAS);
  assert.equal(frame.panes.length, 3, 'the cap is three, whatever the cluster count');
  assert.deepEqual(frame.panes[0].codes, ['EA', 'EB', 'EC']);
  assert.deepEqual(frame.panes[1].codes, ['NA', 'NB'], 'weight 2 across two countries outranks the singletons');
  assert.deepEqual(frame.panes[2].codes, ['AU', 'JP', 'KE'], 'the remaining clusters, in canonical order');
  assert.deepEqual(frame.panes.map((p) => p.id), ['main', 'inset-1', 'inset-2']);
});

test('A-41 I1/I2: every code is in exactly one pane or in `missing`, at 1, 2, 3 and 5 clusters', () => {
  const cases: Array<Array<{ code: string; tripIds?: string[] }>> = [
    [trips('EA', 3), trips('EB', 1)],                                        // 1 cluster
    [trips('EA', 6), trips('NA', 1)],                                        // 2 clusters
    [trips('EA', 6), trips('JP', 1), trips('NA', 1)],                        // 3 clusters
    [trips('AU', 1), trips('EA', 9), trips('JP', 1), trips('KE', 1), trips('NA', 1)], // 5 clusters
    [trips('EA', 6), trips('NA', 1), { code: 'ZZ' }],                        // + a missing code
  ];
  for (const rows of cases) {
    const frame = worldMapFrame(statsOf(rows), ATLAS);
    const inPanes = frame.panes.flatMap((p) => p.codes);
    const all = [...inPanes, ...frame.missing].sort();
    assert.deepEqual(all, rows.map((r) => r.code).sort(), `accounting failed for ${JSON.stringify(rows.map((r) => r.code))}`);
    assert.equal(new Set(inPanes).size, inPanes.length, 'a code is in two panes');
    for (const code of frame.missing) assert.ok(!inPanes.includes(code), `${code} is both drawn and missing`);
    assert.ok(frame.panes.length <= 3);
    // I2 (restated by A-48 Part 7): pane membership and `paneId` are the same fact, both ways —
    // but `pane.codes` is canonical row order while `frame.countries` is C9's paint order, so
    // the comparison is over the SET, plus the canonical-order assertion beside it.
    for (const pane of frame.panes) {
      const members = frame.countries.filter((c) => c.paneId === pane.id).map((c) => c.code);
      assert.deepEqual(pane.codes.slice().sort(), members.slice().sort());
      assert.deepEqual(pane.codes, rows.map((r) => r.code).filter((c) => pane.codes.includes(c)),
        'pane.codes is not in canonical row order');
      assert.equal(pane.weight, frame.countries.filter((c) => c.paneId === pane.id)
        .reduce((n, c) => n + c.tripIds.length, 0));
    }
    for (const c of frame.countries) {
      assert.ok(frame.panes.some((p) => p.id === c.paneId), `${c.code} names a pane that does not exist`);
    }
  }
});

// ---------------------------------------------------------------------------
// Part 4 / I4 — padding, and A-42's replacement guarantee.
// ---------------------------------------------------------------------------

test('A-41 Part 4: a pane\'s viewBox is its bounds expanded by 0.02 × max(w, h) on all four sides', () => {
  const frame = worldMapFrame(statsOf([trips('EA', 1), trips('EB', 1)]), ATLAS);
  assert.equal(frame.panes.length, 1);
  const b = frame.panes[0].bounds;
  const w = b.east - b.west;
  const h = b.north - b.south;
  const pad = 0.02 * Math.max(w, h);
  const round4 = (n: number) => String(Math.round(n * 1e4) / 1e4);
  assert.equal(
    frame.panes[0].viewBox,
    `${round4(b.west - pad)} ${round4(-(b.north + pad))} ${round4(w + 2 * pad)} ${round4(h + 2 * pad)}`,
  );
  // The fault A-41 names: a constant number of degrees instead of a fraction.
  assert.notEqual(frame.panes[0].viewBox, `${round4(b.west - 1)} ${round4(-(b.north + 1))} ${round4(w + 2)} ${round4(h + 2)}`);
});

test('A-42 (b) / A-41 I4: every pane strictly contains every vertex it draws — reference library', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  for (const pane of frame.panes) {
    const { minX, minY, w, h } = box(pane.viewBox);
    assert.ok(w > 0 && h > 0, `pane ${pane.id} has no area`);
    for (const c of frame.countries.filter((x) => x.paneId === pane.id)) {
      for (const v of vertices(c.d)) {
        assert.ok(v.x > minX && v.x < minX + w, `${c.code} vertex x=${v.x} outside ${pane.viewBox}`);
        assert.ok(v.y > minY && v.y < minY + h, `${c.code} vertex y=${v.y} outside ${pane.viewBox}`);
      }
    }
  }
});

test('A-42 (b) / A-41 I4: containment holds for VA — the one code in 239 that clamps', () => {
  const frame = worldMapFrame(statsOf([{ code: 'VA' }]), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 1);
  assert.equal(frame.panes[0].bounds.clamped, true, 'the degeneracy guard is what this case exists for');
  const { minX, minY, w, h } = box(frame.panes[0].viewBox);
  assert.ok(w > 0 && h > 0);
  for (const v of vertices(frame.countries[0].d)) {
    assert.ok(v.x > minX && v.x < minX + w, `VA vertex x=${v.x} outside ${frame.panes[0].viewBox}`);
    assert.ok(v.y > minY && v.y < minY + h, `VA vertex y=${v.y} outside ${frame.panes[0].viewBox}`);
  }
});

test('A-42 (b): containment holds for EVERY code the shipped index carries, one at a time', () => {
  const codes = [...new Set(core.COUNTRY_INDEX.countries.map((c) => c.code))];
  assert.ok(codes.length > 200, `only ${codes.length} codes — the sweep is not sweeping`);
  for (const code of codes) {
    const frame = worldMapFrame(statsOf([{ code }]), core.COUNTRY_INDEX);
    const { minX, minY, w, h } = box(frame.panes[0].viewBox);
    assert.ok(w > 0 && h > 0, `${code}: zero-area frame`);
    for (const v of vertices(frame.countries[0].d)) {
      assert.ok(v.x > minX && v.x < minX + w && v.y > minY && v.y < minY + h,
        `${code}: vertex (${v.x}, ${v.y}) is not strictly inside ${frame.panes[0].viewBox}`);
    }
  }
});

// ---------------------------------------------------------------------------
// I7 — the empty history, unchanged. I6 — determinism.
// ---------------------------------------------------------------------------

test('A-41 I7: an empty history is one unpadded WHOLE_WORLD pane', () => {
  const frame = worldMapFrame(statsOf([]), ATLAS);
  assert.equal(frame.panes.length, 1);
  assert.equal(frame.panes[0].viewBox, '-180 -90 360 180');
  assert.equal(frame.viewBox, '-180 -90 360 180');
  assert.equal(frame.panes[0].bounds.empty, true);
  assert.deepEqual(frame.panes[0].codes, []);
  assert.equal(frame.panes[0].weight, 0);
  assert.equal(frame.panes[0].role, 'main');
});

test('A-41 I7: a history the index cannot draw at all is still one whole-world pane', () => {
  const frame = worldMapFrame(statsOf([{ code: 'ZZ' }]), ATLAS);
  assert.equal(frame.panes.length, 1);
  assert.equal(frame.panes[0].viewBox, '-180 -90 360 180');
  assert.deepEqual(frame.missing, ['ZZ']);
});

test('A-41 I6: the same (stats, index) yields a byte-identical frame', () => {
  const rows = [trips('AU', 1), trips('EA', 6), trips('JP', 1), trips('KE', 1), trips('NA', 1)];
  const a = JSON.stringify(worldMapFrame(statsOf(rows), ATLAS));
  const b = JSON.stringify(worldMapFrame(statsOf(rows), ATLAS));
  assert.equal(a, b);
});

test('A-41 Part 5: pane ids are exactly the three positional strings W3 filters on', () => {
  const rows = [trips('AU', 1), trips('EA', 6), trips('JP', 1), trips('KE', 1), trips('NA', 1)];
  const frame = worldMapFrame(statsOf(rows), ATLAS);
  for (const p of frame.panes) assert.ok(['main', 'inset-1', 'inset-2'].includes(p.id), `bad pane id ${p.id}`);
  for (const c of frame.countries) assert.equal(typeof c.paneId, 'string');
});

// ===========================================================================
// I-8g — ARCHITECTURE §4.4 **A-48**. C2′ (the key point is a point of the country),
// C3′ (the partition is the connected components), C9 (paint order) and Part 6 (`aspect`).
//
// A-41's C1, C5, C6, C7, C8, Part 4 and Part 5's I1/I3–I7 are unchanged and are still held by
// the tests above; nothing below may cost one of them.
// ===========================================================================

/** The stats rows of a library, in whatever order the caller hands them over. */
const rowsOf = (spec: Array<[string, number]>) => spec.map(([code, n]) => trips(code, n));

/** Pane membership as a comparable string, independent of pane order. */
const membership = (frame: ReturnType<typeof worldMapFrame>): string =>
  frame.panes.map((p) => p.codes.slice().sort().join(',')).sort().join(' | ');

// ---------------------------------------------------------------------------
// R36-1 — France. The library A-41's own frame got wrong.
// ---------------------------------------------------------------------------

test('A-48 C2′ / R36-1: two France trips and one Greece trip are ONE pane, not FR + an inset', () => {
  const frame = worldMapFrame(statsOf([trips('FR', 2), trips('GR', 1)]), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 1, 'FR and GR are 1,900 km apart and belong in one frame');
  assert.deepEqual(frame.panes[0].codes, ['FR', 'GR']);
  assert.equal(frame.panes[0].weight, 3);
  // **A-48 residue 1′, made visible rather than assumed away.** C2′ fixes the KEY, not the
  // EXTENT: C8 is unchanged, so the pane still spans every corner of FR's own index box —
  // French Guiana included, because French Guiana is drawn — and the frame is 81.1° wide.
  // What changed is that Greece is no longer captioned "Shown separately" while sitting 1,900
  // km from the country the frame is built around.
  const w = frame.panes[0].bounds.east - frame.panes[0].bounds.west;
  assert.equal(Math.round(w * 10) / 10, 81.1, 'the extent is FR box ∪ GR box, per C8 unchanged');
});

test('A-48 C2′ / R36-1: France clusters with Europe, and no longer with Morocco alone', () => {
  const km = (a: string, b: string) => {
    const ka = core.countryKeyPoint(a, core.COUNTRY_INDEX) as core.LatLng;
    const kb = core.countryKeyPoint(b, core.COUNTRY_INDEX) as core.LatLng;
    // The kernel's own answer, not a hand-rolled distance: one point apart at the threshold.
    return core.clusterPoints([ka, kb], WORLD_CLUSTER_THRESHOLD_KM).length;
  };
  assert.equal(km('FR', 'DE'), 1, 'FR–DE is 804 km and must merge');
  assert.equal(km('FR', 'CZ'), 1, 'FR–CZ is 1,075 km and must merge (it was 4,137 km under C2)');
  assert.equal(km('FR', 'MA'), 1, 'FR–MA is 2,227 km and still merges — the fix is the ORDER, not the set');
  const frame = worldMapFrame(statsOf([trips('CZ', 1), trips('FR', 2), trips('MA', 1)]), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 1, 'all three are one European/North-African cluster');
});

// ---------------------------------------------------------------------------
// R36-2 / I9 — the partition is a function of the point set, not of the row order.
// ---------------------------------------------------------------------------

/** Every ordering of a list, as arrays. */
function permutations<T>(xs: T[]): T[][] {
  return xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

test('A-48 I9 / R36-2: {AE, AT, GR} gives the identical partition under all six orderings', () => {
  const spec: Array<[string, number]> = [['AE', 1], ['AT', 1], ['GR', 3]];
  const answers = new Set(
    permutations(spec).map((order) => membership(worldMapFrame(statsOf(rowsOf(order)), core.COUNTRY_INDEX))),
  );
  assert.equal(answers.size, 1, `six orderings gave ${answers.size} partitions: ${[...answers].join(' / ')}`);
  // And the answer itself: one pane. Under first-fit the canonical order framed the UAE
  // (3,281 km from Greece) with Greece and exiled Austria (1,326 km) to the inset.
  const canonical = worldMapFrame(statsOf(rowsOf(spec)), core.COUNTRY_INDEX);
  assert.equal(canonical.panes.length, 1);
  assert.deepEqual(canonical.panes[0].codes, ['AE', 'AT', 'GR']);
});

test('A-48 I9 / R36-2: HU and SI — 350 km apart — are never separated, in any ordering', () => {
  const spec: Array<[string, number]> = [['FR', 1], ['HU', 1], ['SI', 1]];
  for (const order of permutations(spec)) {
    const frame = worldMapFrame(statsOf(rowsOf(order)), core.COUNTRY_INDEX);
    assert.equal(frame.panes.length, 1, `{${order.map((o) => o[0]).join(',')}} split`);
    const pane = frame.panes.find((p) => p.codes.includes('HU')) as { codes: string[] };
    assert.ok(pane.codes.includes('SI'), 'Hungary and Slovenia are in different panes');
  }
});

test('A-48 I9: permuting a five-country library changes nothing but the row order', () => {
  const spec: Array<[string, number]> = [['AU', 1], ['DE', 6], ['FR', 2], ['JP', 1], ['US', 1]];
  const answers = new Set(
    permutations(spec).map((order) => membership(worldMapFrame(statsOf(rowsOf(order)), core.COUNTRY_INDEX))),
  );
  assert.equal(answers.size, 1, `120 orderings gave ${answers.size} distinct partitions`);
});

// ---------------------------------------------------------------------------
// R33-1 — the reference frame, byte for byte. A-48 may not cost I-8d its fix.
// ---------------------------------------------------------------------------

test('A-48: R33-1 is not regressed — the reference frame is byte-identical to I-8d\'s', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 2);
  assert.deepEqual(frame.panes[0].codes, ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU']);
  assert.deepEqual(frame.panes[1].codes, ['US']);
  assert.equal(frame.panes[0].weight, 6);
  assert.equal(frame.panes[1].weight, 1);
  assert.ok(2 * frame.panes[0].weight > 7, 'C5 dominance: 12 > 7');
  const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
  assert.equal(round4(frame.panes[0].bounds.east - frame.panes[0].bounds.west), 30.2827);
  assert.equal(round4(frame.panes[0].bounds.north - frame.panes[0].bounds.south), 16.155);
  // The two strings I-8d shipped, pinned. A key point that moved a pane would move these.
  assert.equal(frame.panes[0].viewBox, '-8.1779 -59.2407 31.494 17.3663');
  assert.equal(frame.panes[1].viewBox, '-173.8876 -73.4543 109.0195 56.6347');
  assert.equal(frame.viewBox, frame.panes[0].viewBox);
});

// ---------------------------------------------------------------------------
// A-48 Part 6 — a pane carries its own aspect ratio (R36-5).
// ---------------------------------------------------------------------------

test('A-48 Part 6: every pane carries `aspect` = width / height of its PADDED viewBox', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  for (const pane of frame.panes) {
    const [, , w, h] = pane.viewBox.split(' ').map(Number);
    assert.equal(pane.aspect, w / h, `${pane.id}: aspect must equal the viewBox's own w / h`);
    assert.ok(pane.aspect > 0 && Number.isFinite(pane.aspect));
  }
  // The main pane at 390 px painted 356 × 196 inside a 356 × 460 box — 42.6% — because the
  // stylesheet had a fixed height and the view may not derive a ratio (A-40 Part 2).
  assert.equal(Math.round(frame.panes[0].aspect * 1e4) / 1e4, Math.round((31.494 / 17.3663) * 1e4) / 1e4);
});

test('A-48 Part 6: the empty frame\'s aspect is the whole world\'s, 2', () => {
  assert.equal(worldMapFrame(statsOf([]), FIXTURE).panes[0].aspect, 2);
});

test('A-48 Part 6: a single clamped country still has a positive, finite aspect', () => {
  const va = worldMapFrame(statsOf([{ code: 'VA' }]), core.COUNTRY_INDEX);
  assert.ok(va.panes[0].aspect > 0 && Number.isFinite(va.panes[0].aspect));
  const tt = worldMapFrame(statsOf([{ code: 'TT' }]), FIXTURE);
  assert.ok(tt.panes[0].aspect > 0 && Number.isFinite(tt.panes[0].aspect));
});

// ---------------------------------------------------------------------------
// A-48 C9 / I10 — nothing is painted out of reach.
// ---------------------------------------------------------------------------

test('A-48 C9: `countries` is emitted in descending index position over the shipped index', () => {
  const codes = [...new Set(core.COUNTRY_INDEX.countries.map((c) => c.code))].sort();
  const frame = worldMapFrame(statsOf(codes.map((code) => ({ code }))), core.COUNTRY_INDEX);
  const lastPos = new Map<string, number>();
  core.COUNTRY_INDEX.countries.forEach((c, i) => lastPos.set(c.code, i));
  const emitted = frame.countries.map((c) => lastPos.get(c.code) as number);
  assert.equal(emitted.length, codes.length);
  for (let i = 1; i < emitted.length; i++) {
    assert.ok(emitted[i] < emitted[i - 1], `paint order is not descending at ${frame.countries[i].code}`);
  }
});

/**
 * **I10 — nothing is painted out of reach.** The index is ordered by ascending summed absolute
 * spherical ring area (§8.4 A-26 Part 4), so if A's fill contains B's then `area(A) > area(B)`,
 * A is later in the index, and C9 paints A **first** — leaving B on top and hit-testable. These
 * six pairs are the containments QA R36-7 measured in the browser; `AD` under `FR` is the case
 * that had 0 self-hits under canonical order.
 */
test('A-48 I10 / R36-7: a contained microstate is emitted AFTER the country that surrounds it', () => {
  const pairs: Array<[string, string]> = [
    ['AD', 'FR'], ['MC', 'FR'], ['VA', 'IT'], ['SM', 'IT'], ['LI', 'AT'], ['GI', 'ES'],
  ];
  const codes = [...new Set(pairs.flat())].sort();
  const frame = worldMapFrame(statsOf(codes.map((code) => ({ code }))), core.COUNTRY_INDEX);
  const at = (code: string) => frame.countries.findIndex((c) => c.code === code);
  for (const [small, host] of pairs) {
    assert.ok(at(host) >= 0 && at(small) >= 0, `${small}/${host} missing from the frame`);
    assert.ok(at(host) < at(small), `${host} must paint before ${small}, or ${small} is unreachable`);
  }
});

test('A-48 C9: paint order is a property of the emitted array only — pane.codes stays canonical', () => {
  const rows = [trips('AT', 6), trips('AU', 1), trips('JP', 1), trips('US', 1)];
  const frame = worldMapFrame(statsOf(rows), core.COUNTRY_INDEX);
  const canonical = rows.map((r) => r.code);
  for (const pane of frame.panes) {
    assert.deepEqual(pane.codes, canonical.filter((c) => pane.codes.includes(c)));
  }
  assert.notDeepEqual(frame.countries.map((c) => c.code), canonical, 'the emitted array is not paint-ordered');
  assert.deepEqual(frame.countries.map((c) => c.code).sort(), canonical.slice().sort(), 'a code was lost');
});
