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

/**
 * **Re-pointed at I-8i.** A-51 G3 makes every connected component its own pane, so `AA` (10°E
 * 40°N) and `BB` (30°W 10°S) — 5,500 km apart — are two panes rather than one rectangle holding
 * both. The clause this test is for is unchanged and is now asserted **per pane**: a pane's
 * extent is `core.mapBounds` over its own parts' box corners and nothing else. The superseded
 * union — `mapBounds` over BOTH countries at once — is kept below as the fault's oracle.
 */
test('A-40 clause 2: each pane\'s `bounds` is exactly `core.mapBounds` over ITS OWN boxes\' corners', () => {
  const frame = worldMapFrame(statsOf([{ code: 'AA' }, { code: 'BB' }]), FIXTURE);
  assert.equal(frame.panes.length, 2, 'AA and BB are 5,500 km apart — two components, two panes');
  const aa = core.mapBounds([
    { lat: 40, lng: 10 }, { lat: 40, lng: 12 }, { lat: 42, lng: 12 }, { lat: 42, lng: 10 },
  ]);
  const bb = core.mapBounds([
    { lat: -10, lng: -30 }, { lat: -10, lng: -26 }, { lat: -6, lng: -26 }, { lat: -6, lng: -30 },
  ]);
  assert.deepEqual(frame.panes.find((p) => p.codes.join() === 'AA')?.bounds, aa);
  assert.deepEqual(frame.panes.find((p) => p.codes.join() === 'BB')?.bounds, bb);
  assert.deepEqual(frame.bounds, frame.panes[0].bounds, 'the compatibility field is panes[0]');
  // The rectangle the withdrawn model drew: one box over both, 42° wide, mostly Atlantic.
  const union = core.mapBounds([
    { lat: 40, lng: 10 }, { lat: 40, lng: 12 }, { lat: 42, lng: 12 }, { lat: 42, lng: 10 },
    { lat: -10, lng: -30 }, { lat: -10, lng: -26 }, { lat: -6, lng: -26 }, { lat: -6, lng: -30 },
  ]);
  for (const pane of frame.panes) assert.notDeepEqual(pane.bounds, union, 'a pane is a union of clusters again');
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
  // Re-pointed at I-8i: the three codes are mutually distant, so under A-51 G3 they are three
  // panes rather than one. `frame.codes` is what stayed canonical (I13) — and C9's reordering
  // is still a property of the emitted PAINT array only, which is the clause this test holds.
  assert.deepEqual(frame.codes, ['CC', 'AA', 'BB'], 'the country list stays canonical row order');
  // Re-pointed again at I-8j: all three panes tie on weight and home.length, so A-54 G5′'s third
  // key decides — north to south, AA at N 42, CC at N 1, BB at S 6. WAS `[['CC'],['AA'],['BB']]`,
  // which was the canonical row order, i.e. the order the rows were handed in.
  assert.deepEqual(frame.panes.map((p) => p.codes), [['AA'], ['CC'], ['BB']]);
  assert.deepEqual(frame.panes.map((p) => p.bounds.north > 0), [true, true, false]);
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
// C5 — WITHDRAWN by A-51 (QA R38-2). Kept as the fault's oracle.
// ---------------------------------------------------------------------------

/**
 * **A-51 withdraws C5 outright, and this test is the superseded rule kept as its own oracle.**
 * C5 split iff `2 × weight(primary) > W` — a question about how much of the *record* one cluster
 * carries, asked of a *legibility* problem. Its stated abstention (a genuine tie is not broken
 * by alphabet) was also its **majority** case: 80.0% of two-country / one-trip-each libraries
 * hold two clusters in one un-split pane, and `FR`+`US` painted France at 899 px² because of it.
 *
 * The reference library is the one where C5 fired *correctly*, so it is where the withdrawal is
 * cheapest to check: the same three panes come out, and **no dominance arithmetic decided it**.
 * The arithmetic is computed here and asserted to be a fact about the library rather than an
 * input to the frame.
 */
test('A-51 supersedes A-41 C5: the reference library is three panes, and no dominance test decided it', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 3);
  assert.deepEqual(frame.panes[0].codes, ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU']);
  assert.deepEqual(frame.panes[1].codes, ['US']);
  assert.deepEqual(frame.panes[2].home, [], 'the third pane holds only non-principal geometry');
  assert.equal(frame.panes[0].weight, 6, 'Σ tripIds.length over the six European codes');
  assert.equal(frame.panes[1].weight, 1);
  // I5: `weight` is additive again, so `W` IS the sum over panes. A-49 Part 4 consequence 2's
  // "do not re-derive W from panes" caveat goes with the detached pane rather than being managed.
  assert.equal(frame.panes.reduce((n, p) => n + p.weight, 0), 7);
  // C5's own arithmetic, computed and then NOT used: it happens to be true here, and the same
  // three panes come out on `FR`+`US`, where it is false. That is the withdrawal.
  assert.ok(2 * frame.panes[0].weight > 7, 'C5 would have fired here');
  const tie = worldMapFrame(statsOf([trips('FR', 1), trips('US', 1)]), core.COUNTRY_INDEX);
  assert.ok(2 * tie.panes[0].weight <= tie.panes.reduce((n, p) => n + p.weight, 0),
    'C5 would NOT have fired here — and the frame splits anyway');
  assert.equal(tie.panes.length, 4);
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

test('A-51 G4: panes are identified positionally — p0…pN, and there is no role to read', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  // Re-pointed at I-8i: `'main' | 'inset-1' | 'detached'` named a hierarchy A-51 removed. The
  // superseded ids are asserted absent, because a renamed hierarchy is the fault this catches.
  assert.deepEqual(frame.panes.map((p) => p.id), ['p0', 'p1', 'p2']);
  for (const p of frame.panes) {
    assert.ok(!('role' in p));
    assert.ok(!['main', 'inset-1', 'inset-2', 'detached'].includes(p.id));
  }
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
  // Re-pointed at I-8i: the CLUSTERING answer this test is for is unchanged — `DD`'s mainland
  // and `EE` are ONE pane, because `DD` keys off its principal ring rather than off the centre
  // of a rectangle that spans a hemisphere. What moves is only that the far territory's pane is
  // an ordinary pane with `home === []` rather than a `'detached'` one (A-51 G3 supersedes C8″).
  assert.equal(frame.panes.length, 2);
  assert.deepEqual(frame.panes[0].codes, ['DD', 'EE'],
    'the key point is on the mainland, and EE is 550 km from it');
  assert.deepEqual(frame.panes[0].home, ['DD', 'EE']);
  assert.deepEqual(frame.panes[1].codes, ['DD']);
  assert.deepEqual(frame.panes[1].home, [], 'the territory is an EXTENT pane, not a destination');
  assert.equal(frame.panes[1].weight, 0);
  // C2′'s content survives as a property of `countryParts` (I12), which is why core still
  // exports the function even though the frame no longer calls it (A-51 Part 6).
  assert.deepEqual(core.countryKeyPoint('DD', index), { lat: 46, lng: 4 });
  assert.deepEqual(
    core.countryParts('DD', index, WORLD_CLUSTER_THRESHOLD_KM).find((p) => p.principal)?.key,
    core.countryKeyPoint('DD', index),
  );
});

// ---------------------------------------------------------------------------
// C5 / C6 / C7 — WITHDRAWN by A-51. The withdrawn behaviour is asserted ABSENT here,
// so a future restoration of any of the three is red rather than silent.
// ---------------------------------------------------------------------------

/**
 * **The four cases C5's dominance test used to decide, run under A-51.** Each one is now a
 * question about geometry rather than about the record, and the answer no longer moves when the
 * trip counts do — which is the whole of R38-2. The old expectations are named beside each new
 * one, because a rule that comes back must be caught, not merely absent from the docs.
 */
test('A-51 supersedes C5: the pane count is geometry, and twelve more trips on one side change nothing', () => {
  // C5: "no cluster carries a majority, so there is no subject to prioritise" → ONE pane, ~130°
  // wide, mostly Pacific. A-51: two clusters are two panes, whatever the weights.
  const tie = worldMapFrame(statsOf([trips('NA', 1), trips('JP', 1)]), ATLAS);
  assert.equal(tie.panes.length, 2, 'C5 drew these two clusters as one rectangle');
  assert.deepEqual(tie.panes.map((p) => p.codes), [['NA'], ['JP']]);
  // C5: `2 × 13 > 14` fires → two panes. A-51: the SAME two panes, same viewBoxes.
  const lopsided = worldMapFrame(statsOf([trips('NA', 13), trips('JP', 1)]), ATLAS);
  assert.deepEqual(lopsided.panes.map((p) => p.viewBox), tie.panes.map((p) => p.viewBox),
    'the frame moved because the trip counts moved — that is C5');
  // C5's knife-edge: 3 vs 3 was one pane, 4 vs 3 was two. Both are two panes now.
  assert.equal(worldMapFrame(statsOf([trips('NA', 3), trips('JP', 3)]), ATLAS).panes.length, 2);
  assert.equal(worldMapFrame(statsOf([trips('NA', 4), trips('JP', 3)]), ATLAS).panes.length, 2);
  // One cluster is still one pane, however lopsided — that half of C5 was never the defect.
  assert.equal(worldMapFrame(statsOf([trips('EA', 40), trips('EB', 1)]), ATLAS).panes.length, 1);
});

/**
 * **C6's lowest-ISO tie-break is withdrawn with the hierarchy** — and §4.4 **A-54** Part 3
 * (QA R39-5) found that A-51's replacement put it straight back one indirection out: the
 * canonical part list is built from `stats.countries` in ascending ISO order, so *"the
 * component's lowest canonical position"* **is** the alphabet for two panes tied on `weight`
 * and `home.length`. G5′ inserts `bounds.north` descending and `bounds.west` ascending ahead
 * of it.
 *
 * **The observable difference, and it is why this test is kept rather than deleted:** under the
 * canonical-position key `AU` came second because its row was first; under G5′ `JP` comes second
 * because its pane is further north (N 36 against S 32), **whatever order the rows arrive in**.
 */
test('A-54 G5′ supersedes A-51 G5\'s third key: geography decides, and it does not read the row order', () => {
  const canonical = worldMapFrame(
    statsOf([trips('AU', 2), trips('EA', 2), trips('EB', 2), trips('EC', 1), trips('JP', 2)]),
    ATLAS,
  );
  // WAS `[['EA','EB','EC'], ['AU'], ['JP']]` — the canonical position, i.e. the row order, i.e.
  // the alphabet. `AU` is row 0 and led on that alone.
  assert.deepEqual(canonical.panes.map((p) => p.codes), [['EA', 'EB', 'EC'], ['JP'], ['AU']]);
  const jp = canonical.panes[1], au = canonical.panes[2];
  assert.ok(jp.weight === au.weight && jp.home.length === au.home.length,
    'the first two keys must still tie here, or this test proves nothing');
  assert.ok(jp.bounds.north > au.bounds.north, 'and the third key must be what separates them');
  // The same library with the rows in a different order. Under the withdrawn key this flipped
  // the pair; under G5′ it cannot, because the key is a property of the pane's own rectangle.
  const reordered = worldMapFrame(
    statsOf([trips('EA', 2), trips('EB', 2), trips('EC', 1), trips('JP', 2), trips('AU', 2)]),
    ATLAS,
  );
  assert.deepEqual(reordered.panes.map((p) => p.codes), [['EA', 'EB', 'EC'], ['JP'], ['AU']]);
  // …and the two frames still hold the identical partition and the identical rectangles (I9).
  assert.deepEqual(
    reordered.panes.map((p) => p.viewBox).slice().sort(),
    canonical.panes.map((p) => p.viewBox).slice().sort(),
  );
});

test('A-51 G5: at equal weight, the pane with more HOME codes ranks higher (C6\'s surviving key)', () => {
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
// C7 / I3 — the cap is WITHDRAWN, and nothing is dropped at any cluster count.
// ---------------------------------------------------------------------------

test('A-51 G6 supersedes C7: five clusters are five panes, and there is no union-of-the-rest pane', () => {
  const rows = [trips('AU', 1), trips('EA', 6), trips('EB', 3), trips('EC', 3), trips('JP', 1),
                trips('KE', 1), trips('NA', 1), trips('NB', 1)];
  const frame = worldMapFrame(statsOf(rows), ATLAS);
  assert.equal(frame.panes.length, 5, 'C7 folded these into three, the third a multi-component box');
  assert.deepEqual(frame.panes[0].codes, ['EA', 'EB', 'EC']);
  assert.deepEqual(frame.panes[1].codes, ['NA', 'NB'], 'weight 2 across two countries outranks the singletons');
  // A-54 G5′: the three weight-1 singletons tie on both surviving A-51 keys, so latitude orders
  // them — JP N 36, KE N 0, AU S 32. WAS `['AU'], ['JP'], ['KE']`, the canonical row order.
  assert.deepEqual(frame.panes.map((p) => p.codes), [['EA', 'EB', 'EC'], ['NA', 'NB'], ['JP'], ['KE'], ['AU']]);
  assert.deepEqual(frame.panes.map((p) => p.id), ['p0', 'p1', 'p2', 'p3', 'p4']);
  // C7's third pane, kept as the oracle: the union of clusters 3…N, which is a multi-component
  // rectangle by construction and is L1's violation at pane index 2.
  assert.ok(!frame.panes.some((p) => p.codes.join() === 'AU,JP,KE'),
    'the union-of-the-rest pane is back — that is C7');
});

test('A-51 I1/I2: every code is in exactly one pane or in `missing`, at 1, 2, 3 and 5 clusters', () => {
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
    // Re-pointed at I-8i: `panes.length <= 3` was C7's cap and is withdrawn (G6). What replaces
    // it is I3 — the pane count IS the component count — which the I-8i block asserts directly.
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
  assert.equal(frame.panes[0].id, 'p0');
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

test('A-51 G4: pane ids are the positional strings W3 filters on — `p0`…`pN`, one per component', () => {
  const rows = [trips('AU', 1), trips('EA', 6), trips('JP', 1), trips('KE', 1), trips('NA', 1)];
  const frame = worldMapFrame(statsOf(rows), ATLAS);
  assert.deepEqual(frame.panes.map((p) => p.id), frame.panes.map((_, i) => `p${i}`));
  assert.equal(new Set(frame.panes.map((p) => p.id)).size, frame.panes.length, 'W3\'s filter needs unique ids');
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

test('A-48 C2′ / R36-1: two France trips and one Greece trip are ONE home pane', () => {
  const frame = worldMapFrame(statsOf([trips('FR', 2), trips('GR', 1)]), core.COUNTRY_INDEX);
  assert.equal(frame.panes.filter((p) => p.home.length > 0).length, 1,
    'FR and GR are 1,900 km apart and belong in one frame');
  assert.deepEqual(frame.panes[0].codes, ['FR', 'GR']);
  assert.equal(frame.panes[0].weight, 3);
  // **The extent half of this test is superseded by A-49 C8′ (QA R37-1)** and is re-asserted
  // in the I-8h block below. It used to pin 81.1° and call that "C8 unchanged" — which is
  // exactly the defect round 37 found. The CLUSTERING half, which is what A-48 ruled, is
  // unchanged: Greece is still not captioned "Shown separately" 1,900 km from the subject.
  const w = frame.panes[0].bounds.east - frame.panes[0].bounds.west;
  assert.equal(Math.round(w * 10) / 10, 31.2, 'A-48 shipped 81.1°; A-49 C8′ frames the parts');
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
  assert.equal(frame.panes.filter((p) => p.home.length > 0).length, 1,
    'all three are one European/North-African cluster');
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
    assert.equal(frame.panes.filter((p) => p.home.length > 0).length, 1,
      `{${order.map((o) => o[0]).join(',')}} split`);
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

/**
 * **Re-pointed at I-8h, and the moved half is named rather than deleted.** A-49 changes no key
 * point, no partition and no paint order, so the MAIN pane is still byte-identical to I-8d's
 * and I-8g's — that is the assertion this test exists for and it is unchanged. What moves is
 * the US inset, from the union of every US box (104.83° wide) to CONUS (57.72°), with Alaska,
 * Hawaii and the Aleutians in a detached pane. The superseded string is kept below as the
 * injected fault's oracle: if it ever comes back, C8 was restored.
 */
test('A-48: R33-1 is not regressed — the reference EUROPEAN pane is byte-identical to I-8d\'s', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  assert.equal(frame.panes.filter((p) => p.home.length > 0).length, 2);
  assert.deepEqual(frame.panes[0].codes, ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU']);
  assert.deepEqual(frame.panes[1].codes, ['US']);
  assert.equal(frame.panes[0].weight, 6);
  assert.equal(frame.panes[1].weight, 1);
  const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
  assert.equal(round4(frame.panes[0].bounds.east - frame.panes[0].bounds.west), 30.2827);
  assert.equal(round4(frame.panes[0].bounds.north - frame.panes[0].bounds.south), 16.155);
  // The string I-8d shipped for the main pane, pinned. A key point that moved a pane would
  // move it; A-49 does not.
  assert.equal(frame.panes[0].viewBox, '-8.1779 -59.2407 31.494 17.3663');
  assert.equal(frame.viewBox, frame.panes[0].viewBox);
  // A-48 C8's inset, superseded by A-49 C8′ — kept as the oracle, asserted absent.
  assert.notEqual(frame.panes[1].viewBox, '-173.8876 -73.4543 109.0195 56.6347');
  assert.equal(frame.panes[1].viewBox, '-125.8416 -50.5435 60.0314 26.618');
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
  // Re-pointed at I-8h: `countries` is a PAINT list, one row per (code, pane), so `US` is in
  // it twice. `frame.codes` is the country list and is what stayed one-per-code and canonical.
  assert.deepEqual(frame.codes, canonical, 'the country list is canonical row order');
  assert.deepEqual([...new Set(frame.countries.map((c) => c.code))].sort(), canonical.slice().sort(),
    'a code was lost');
  assert.equal(frame.countries.filter((c) => c.code === 'US').length, 2);
});

// ===========================================================================
// I-8h — ARCHITECTURE §4.4 **A-49**. C8′ (a pane frames the parts its subject is connected
// to), C8″ (the detached pane), C7′ (1…4 panes), Part 4 (the frame shape), Part 5 (`codes`).
//
// A-48 moved the KEY POINT onto the country and left C8 fitting the extent over every entry
// box, so one pane used two different answers to "where is this country" for two different
// purposes (QA R37-1). Nothing below may cost A-48 its clustering: the reference frame's MAIN
// pane is byte-identical, and I12 lives in core's own `countryParts` test.
// ===========================================================================

/** A-48's superseded C8, kept as the injected fault's oracle: `mapBounds` over every entry box. */
function unionBoxExtent(codes: string[], index: core.CountryIndex): { w: number; h: number } {
  const corners: core.LatLng[] = [];
  for (const entry of index.countries) {
    if (!codes.includes(entry.code)) continue;
    const [minLng, minLat, maxLng, maxLat] = entry.box;
    corners.push({ lat: minLat, lng: minLng }, { lat: minLat, lng: maxLng },
                 { lat: maxLat, lng: maxLng }, { lat: maxLat, lng: minLng });
  }
  const b = core.mapBounds(corners);
  return { w: b.east - b.west, h: b.north - b.south };
}

const extent = (p: { bounds: core.MapBounds }) => ({
  w: Math.round((p.bounds.east - p.bounds.west) * 100) / 100,
  h: Math.round((p.bounds.north - p.bounds.south) * 100) / 100,
});

// ---------------------------------------------------------------------------
// The ship gate: the two-France-and-one-Greece library, as three numbers.
// ---------------------------------------------------------------------------

/**
 * **Supersedes the I-8g assertion above.** That test pinned `panes.length === 1` and an
 * 81.1°-wide extent and called the width *"C8 unchanged"*, which is exactly what R37-1 found.
 * The clustering half it was written for is untouched — FR and GR are still ONE geographic
 * pane, and Greece is still not captioned *"shown separately"*.
 */
test('A-49 C8′ / R37-1: the FR+GR library is a map of Europe — 31.20° × 16.23°, not 81.13°', () => {
  const frame = worldMapFrame(statsOf([trips('FR', 2), trips('GR', 1)]), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 2, 'one home pane, plus French Guiana\'s own');
  assert.deepEqual(frame.panes[0].codes, ['FR', 'GR']);
  assert.deepEqual(frame.panes[0].home, ['FR', 'GR']);
  assert.deepEqual(extent(frame.panes[0]), { w: 31.2, h: 16.23 });
  assert.equal(frame.panes[0].viewBox.split(' ')[2], '32.4444');
  assert.equal(frame.panes[0].viewBox.split(' ')[3], '17.4764');
  // French Guiana, which used to be a speck in the corner of that rectangle. Re-pointed at
  // I-8i: it is an ordinary pane with `home === []` — an EXTENT pane — rather than C8″'s
  // `'detached'` one, and its rectangle is byte-identical.
  assert.deepEqual(frame.panes[1].home, []);
  assert.equal(frame.panes[1].id, 'p1');
  assert.deepEqual(frame.panes[1].codes, ['FR']);
  assert.deepEqual(extent(frame.panes[1]), { w: 2.87, h: 3.7 });
});

test('the injected fault: A-48 C8 (the union of every entry box) returns the 81.13° rectangle', () => {
  const u = unionBoxExtent(['FR', 'GR'], core.COUNTRY_INDEX);
  assert.equal(Math.round(u.w * 100) / 100, 81.13);
  assert.equal(Math.round(u.h * 100) / 100, 49.1);
  const frame = worldMapFrame(statsOf([trips('FR', 2), trips('GR', 1)]), core.COUNTRY_INDEX);
  assert.ok(frame.panes[0].bounds.east - frame.panes[0].bounds.west < 32,
    'the main pane is still the union-box extent — C8 was not superseded');
});

/**
 * The ruling's own metric, computed in bare geometry: how much of the main pane's rectangle is
 * actually country. A-48 shipped **1.95%**; A-49 measures **14.02%**, and Greece's own box goes
 * from **1.009%** of the pane to **7.86%** — 7.8× the area.
 */
test('A-49 Part 1: the FR+GR main pane samples ≥ 12% land, and Greece is ≥ 7% of it', () => {
  const frame = worldMapFrame(statsOf([trips('FR', 2), trips('GR', 1)]), core.COUNTRY_INDEX);
  const pane = frame.panes[0];
  const { minX, minY, w, h } = box(pane.viewBox);
  // Even-odd sampling over the pane's own rectangle, on a 400 × 400 grid.
  const rings = frame.countries.filter((c) => c.paneId === pane.id)
    .flatMap((c) => c.d.split('Z').filter(Boolean).map((s) => vertices(s + 'Z')));
  let hits = 0, n = 0;
  for (let i = 0; i < 400; i++) {
    for (let j = 0; j < 400; j++) {
      const x = minX + (w * (i + 0.5)) / 400;
      const y = minY + (h * (j + 0.5)) / 400;
      let inside = false;
      for (const r of rings) {
        let odd = false;
        for (let k = 0, m = r.length - 1; k < r.length; m = k++) {
          if ((r[k].y > y) !== (r[m].y > y) &&
              x < ((r[m].x - r[k].x) * (y - r[k].y)) / (r[m].y - r[k].y) + r[k].x) odd = !odd;
        }
        if (odd) inside = !inside;
      }
      n++;
      if (inside) hits++;
    }
  }
  const land = (hits / n) * 100;
  assert.ok(land >= 12, `the main pane is ${land.toFixed(2)}% land; A-48 shipped 1.95%`);
  // Greece's own box as a share of the pane's area.
  const gr = core.countryParts('GR', core.COUNTRY_INDEX, WORLD_CLUSTER_THRESHOLD_KM);
  const gw = Math.max(...gr.map((p) => p.box[2])) - Math.min(...gr.map((p) => p.box[0]));
  const gh = Math.max(...gr.map((p) => p.box[3])) - Math.min(...gr.map((p) => p.box[1]));
  const share = ((gw * gh) / (w * h)) * 100;
  assert.ok(share >= 7, `Greece is ${share.toFixed(2)}% of the pane; it was 1.009% under A-48`);
});

// ---------------------------------------------------------------------------
// A-49 Part 7 — the four cases the rule had to survive.
// ---------------------------------------------------------------------------

test('A-49 Part 7: FR alone is 14.15° × 9.77° plus the same detached pane (it was 64.08°)', () => {
  const frame = worldMapFrame(statsOf([trips('FR', 1)]), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 2);
  assert.deepEqual(extent(frame.panes[0]), { w: 14.15, h: 9.77 });
  assert.deepEqual(extent(frame.panes[1]), { w: 2.87, h: 3.7 });
  assert.deepEqual(frame.panes[1].codes, ['FR']);
  assert.equal(Math.round(unionBoxExtent(['FR'], core.COUNTRY_INDEX).w * 100) / 100, 64.08);
});

test('A-49 Part 7: it generalises with no count of companions — six European codes, one rule', () => {
  const codes = ['AT', 'CZ', 'DE', 'ES', 'FR', 'IT'];
  const frame = worldMapFrame(statsOf(codes.map((code) => trips(code, 1))), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 2, 'one geographic pane and the detached one');
  assert.deepEqual(extent(frame.panes[0]), { w: 28.25, h: 19.04 });
  assert.deepEqual(extent(frame.panes[1]), { w: 2.87, h: 3.7 }, 'the identical French Guiana pane');
  assert.equal(Math.round(unionBoxExtent(codes, core.COUNTRY_INDEX).w * 100) / 100, 73.38);
});

/**
 * **The case that proves the rule is geometric rather than a France-shaped carve-out.** Alaska
 * is 1.5 M km² — 19% of the United States — and it detaches from a US-only pane and stays
 * **in frame** the moment Canada is in the same library, because it is then genuinely chained
 * to the pane's subject at the same threshold that decided the pane. Nothing here reads
 * *"overseas territory"*.
 */
test('A-49 Part 7: Alaska detaches from a US-only pane and stays IN FRAME once Canada is present', () => {
  const alone = worldMapFrame(statsOf([trips('US', 1)]), core.COUNTRY_INDEX);
  assert.equal(alone.panes.length, 2);
  assert.deepEqual(extent(alone.panes[0]), { w: 57.72, h: 24.31 }, 'CONUS');
  assert.deepEqual(extent(alone.panes[1]), { w: 41.81, h: 52.44 }, 'Alaska, Hawaii, the Aleutians');

  const withCanada = worldMapFrame(
    statsOf([trips('CA', 1), trips('MX', 1), trips('US', 1)]), core.COUNTRY_INDEX,
  );
  assert.equal(withCanada.panes.length, 1, 'no detached pane: Alaska is connected to Canada');
  assert.deepEqual(withCanada.panes[0].codes, ['CA', 'MX', 'US']);
  assert.deepEqual(extent(withCanada.panes[0]), { w: 119.14, h: 68.69 });
  // Unchanged from A-48 — the union-box extent and the part extent agree here.
  const u = unionBoxExtent(['CA', 'MX', 'US'], core.COUNTRY_INDEX);
  assert.equal(Math.round(u.w * 100) / 100, 119.14);
  assert.equal(Math.round(u.h * 100) / 100, 68.69);
});

test('A-49 Part 7: detachment is decided PER PANE, not per country', () => {
  // The injected fault: decide it per country and `CA MX US` grows a detached pane it must not
  // have. The oracle is the country-alone answer, which does have one.
  assert.equal(worldMapFrame(statsOf([trips('US', 1)]), core.COUNTRY_INDEX).panes.length, 2);
  assert.equal(
    worldMapFrame(statsOf([trips('CA', 1), trips('US', 1)]), core.COUNTRY_INDEX).panes.length, 1,
  );
});

// ---------------------------------------------------------------------------
// R33-1 — the reference frame. The main pane is byte-identical; the US inset narrows.
// ---------------------------------------------------------------------------

test('A-49: R33-1 is not regressed — the reference EUROPEAN pane is byte-identical to I-8d\'s', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  assert.deepEqual(frame.panes[0].codes, ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU']);
  assert.equal(frame.panes[0].weight, 6);
  const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
  assert.equal(round4(frame.panes[0].bounds.east - frame.panes[0].bounds.west), 30.2827);
  assert.equal(round4(frame.panes[0].bounds.north - frame.panes[0].bounds.south), 16.155);
  assert.equal(frame.panes[0].viewBox, '-8.1779 -59.2407 31.494 17.3663');
  assert.equal(frame.viewBox, frame.panes[0].viewBox);
});

test('A-49: what MOVES in the reference frame is stated, not discovered — three panes, re-pinned', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 3);
  // Re-pinned at I-8i: the ids become positional and `role` is gone. The three rectangles do not
  // move, which is the claim this test exists for.
  assert.deepEqual(frame.panes.map((p) => p.id), ['p0', 'p1', 'p2']);
  assert.deepEqual(frame.panes.map((p) => p.home.length > 0), [true, true, false]);
  assert.deepEqual(frame.panes[1].codes, ['US']);
  assert.equal(frame.panes[1].viewBox, '-125.8416 -50.5435 60.0314 26.618');
  assert.deepEqual(frame.panes[2].codes, ['US']);
  assert.equal(frame.panes[2].viewBox, '-172.8399 -72.4066 43.9088 54.5393');
  // The string A-48 shipped for the inset, kept as the superseded rule's oracle.
  assert.notEqual(frame.panes[1].viewBox, '-173.8876 -73.4543 109.0195 56.6347');
});

// ---------------------------------------------------------------------------
// I11 — nothing is cropped and nothing is drawn twice.
// ---------------------------------------------------------------------------

/** Every ring of a code, as `d` subpath strings, in index order. */
function ringSubpaths(code: string, index: core.CountryIndex): string[] {
  const out: string[] = [];
  for (const e of index.countries) {
    if (e.code !== code) continue;
    for (const r of e.rings) {
      let s = '';
      for (let i = 0; i + 1 < r.length; i += 2) {
        s += `${i === 0 ? 'M' : 'L'}${r[i]},${r[i + 1] === 0 ? 0 : -r[i + 1]}`;
      }
      if (s !== '') out.push(`${s}Z`);
    }
  }
  return out;
}

function assertI11(frame: ReturnType<typeof worldMapFrame>, index: core.CountryIndex) {
  for (const code of frame.codes) {
    const drawn = frame.countries.filter((c) => c.code === code)
      .flatMap((c) => c.d.split('Z').filter(Boolean).map((s) => `${s}Z`));
    const owned = ringSubpaths(code, index);
    assert.equal(drawn.length, owned.length, `${code}: ring count changed (I11)`);
    assert.deepEqual(drawn.slice().sort(), owned.slice().sort(), `${code}: rings differ (I11)`);
  }
}

test('A-49 I11: every ring of every drawn code is drawn exactly once — FR+GR', () => {
  assertI11(worldMapFrame(statsOf([trips('FR', 2), trips('GR', 1)]), core.COUNTRY_INDEX), core.COUNTRY_INDEX);
});

test('A-49 I11: …and over the reference sample, and over a 239-code library', () => {
  assertI11(worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX), core.COUNTRY_INDEX);
  const codes = [...new Set(core.COUNTRY_INDEX.countries.map((c) => c.code))].sort();
  assertI11(worldMapFrame(statsOf(codes.map((code) => ({ code }))), core.COUNTRY_INDEX), core.COUNTRY_INDEX);
});

// ---------------------------------------------------------------------------
// Part 4 — the frame shape. `countries` is a PAINT list; `codes` is the country list.
// ---------------------------------------------------------------------------

test('A-49 Part 4: a code drawn in two panes is one PAINT row per pane, with identical attribution', () => {
  const frame = worldMapFrame(statsOf([trips('FR', 2), trips('GR', 1)]), core.COUNTRY_INDEX);
  const fr = frame.countries.filter((c) => c.code === 'FR');
  assert.equal(fr.length, 2, 'FR is painted in two panes');
  assert.deepEqual(fr.map((c) => c.paneId).sort(), ['p0', 'p1']);
  assert.deepEqual(fr[0].tripIds, fr[1].tripIds, 'the tap and the attribution are identical');
  assert.equal(fr[0].provisional, fr[1].provisional);
  assert.notEqual(fr[0].d, fr[1].d, 'and each pane draws only its own parts');
});

test('A-49 I2: within any ONE pane a code appears exactly once — W3\'s key stays unique', () => {
  const codes = [...new Set(core.COUNTRY_INDEX.countries.map((c) => c.code))].sort();
  const frame = worldMapFrame(statsOf(codes.map((code) => ({ code }))), core.COUNTRY_INDEX);
  for (const pane of frame.panes) {
    const inPane = frame.countries.filter((c) => c.paneId === pane.id).map((c) => c.code);
    assert.equal(new Set(inPane).size, inPane.length, `${pane.id} draws a code twice`);
    assert.deepEqual(pane.codes.slice().sort(), inPane.slice().sort());
  }
});

test('A-49 Part 5 / I13: `codes` is every drawn code exactly once, canonical, disjoint from `missing`', () => {
  const frame = worldMapFrame(statsOf(REFERENCE.map((code) => ({ code }))), core.COUNTRY_INDEX);
  assert.deepEqual(frame.codes, ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US']);
  // The paint list is NOT that, and that is the whole reason `codes` exists (R37-3).
  assert.notDeepEqual(frame.countries.map((c) => c.code), frame.codes);

  const dup = worldMapFrame(statsOf([trips('FR', 2), trips('GR', 1)]), core.COUNTRY_INDEX);
  assert.deepEqual(dup.codes, ['FR', 'GR'], 'FR is one country, however many panes draw it');
  assert.equal(dup.countries.filter((c) => c.code === 'FR').length, 2);

  const withMissing = worldMapFrame(statsOf([{ code: 'AA' }, { code: 'ZZ' }]), FIXTURE);
  assert.deepEqual(withMissing.codes, ['AA']);
  assert.deepEqual(withMissing.missing, ['ZZ']);
  for (const c of withMissing.codes) assert.ok(!withMissing.missing.includes(c));
});

test('A-49 Part 5 / I13: MF and SX are each in `codes` exactly once at 239 codes', () => {
  const codes = [...new Set(core.COUNTRY_INDEX.countries.map((c) => c.code))].sort();
  const frame = worldMapFrame(statsOf(codes.map((code) => ({ code }))), core.COUNTRY_INDEX);
  assert.deepEqual(frame.codes, codes, 'canonical row order, every drawn code once');
  for (const c of ['MF', 'SX', 'AD', 'FR', 'US', 'UM']) {
    assert.equal(frame.codes.filter((x) => x === c).length, 1, `${c} is not in codes exactly once`);
  }
});

// ---------------------------------------------------------------------------
// I1 / I3 / I5 restated, and I15.
// ---------------------------------------------------------------------------

test('A-49 I1: every stats code is at least once in `countries` or exactly once in `missing`', () => {
  const rows = [trips('FR', 6), trips('GR', 1), trips('US', 1), { code: 'ZZ' }, trips('JP', 1)];
  const frame = worldMapFrame(statsOf(rows), core.COUNTRY_INDEX);
  for (const r of rows) {
    const drawn = frame.countries.filter((c) => c.code === r.code).length;
    const gone = frame.missing.filter((c) => c === r.code).length;
    assert.ok((drawn >= 1) !== (gone === 1), `${r.code}: both or neither`);
    if (gone) assert.equal(gone, 1);
  }
});

/**
 * **Re-pointed at I-8i: A-49's C7′ cap of "1…4 panes" and its single trailing `'detached'` pane
 * are withdrawn (A-51 G6, I3).** What survives, and is what this test now holds, is **I18** —
 * every extent pane is after every home pane — plus the accounting. The superseded bound is
 * asserted to be *exceeded* on the five-cluster case, because a cap that came back would be
 * invisible otherwise.
 */
test('A-51 I3/I5/I18: the pane count is the component count, and extent panes are always last', () => {
  const cases: Array<Array<{ code: string; tripIds?: string[] }>> = [
    [trips('AT', 1)],                                                  // 1 pane
    [trips('FR', 1)],                                                  // 1 home + 1 extent
    [trips('AT', 6), trips('JP', 1)],                                  // 2 panes
    [trips('AT', 6), trips('JP', 1), trips('US', 1)],                  // 3 home + 1 extent
    [trips('AT', 9), trips('AU', 1), trips('BR', 1), trips('JP', 1), trips('US', 1)],
  ];
  for (const rows of cases) {
    const frame = worldMapFrame(statsOf(rows), core.COUNTRY_INDEX);
    assert.ok(frame.panes.length >= 1, `${frame.panes.length} panes`);
    assert.ok(frame.panes[0].home.length > 0, 'panes[0] is always a home pane (I18)');
    const flags = frame.panes.map((p) => p.home.length > 0);
    const firstExtent = flags.indexOf(false);
    if (firstExtent >= 0) assert.ok(!flags.slice(firstExtent).includes(true), 'a home pane follows an extent pane');
    for (const p of frame.panes) {
      if (p.home.length === 0) assert.equal(p.weight, 0, 'an extent pane may not carry weight');
      else assert.ok(p.weight >= 1, 'a home pane carries at least one trip');
    }
    // I5: additive, so `W` is the sum over panes rather than something forbidden to derive.
    const W = rows.filter((r) => !frame.missing.includes(r.code))
      .reduce((n, r) => n + (r.tripIds?.length ?? 1), 0);
    assert.equal(frame.panes.reduce((n, p) => n + p.weight, 0), W);
  }
});

test('A-51 G6 supersedes C7′: more than four panes are reachable, and nothing folds', () => {
  const frame = worldMapFrame(
    statsOf([trips('AT', 9), trips('AU', 1), trips('BR', 1), trips('JP', 1), trips('US', 1)]),
    core.COUNTRY_INDEX,
  );
  assert.equal(frame.panes.length, 6, 'C7′ capped this library at four');
  assert.deepEqual(frame.panes.map((p) => p.home.length > 0), [true, true, true, true, true, false]);
  // A-54 G5′: the four weight-1 singletons tie on both surviving A-51 keys, so latitude orders
  // them — US N 49.4, JP N 45.5, BR N 5.3, AU S 10.7 — and Alaska's extent pane is last on
  // weight, as I18 requires. WAS `['AU'], ['BR'], ['JP'], ['US']`: the alphabet, one
  // indirection out through the canonical row order.
  assert.deepEqual(frame.panes.map((p) => p.codes),
    [['AT'], ['US'], ['JP'], ['BR'], ['AU'], ['US']]);
  const norths = frame.panes.slice(1, 5).map((p) => p.bounds.north);
  assert.deepEqual(norths, [...norths].sort((a, b) => b - a), 'the tied block reads north to south');
});

test('A-51 I5 supersedes A-49 I15: an extent pane carries weight 0, so the total IS W', () => {
  // `US` alone: CONUS is a home pane, Alaska is an extent pane. Under A-49 both panes carried
  // weight 3 and the total was 6, which is why "do not re-derive W from panes" had to be a rule.
  const frame = worldMapFrame(statsOf([trips('US', 3)]), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 2);
  assert.deepEqual(frame.panes.map((p) => p.home), [['US'], []]);
  assert.deepEqual(frame.panes.map((p) => p.weight), [3, 0]);
  assert.equal(frame.panes.reduce((n, p) => n + p.weight, 0), 3, 'Σ weight === W === 3');
});

// ---------------------------------------------------------------------------
// I4/I14 — every pane strictly contains what it draws, over the whole shipped index.
// ---------------------------------------------------------------------------

test('A-49 I14: every pane strictly contains every vertex it draws, all 239 single-country libraries', () => {
  const codes = [...new Set(core.COUNTRY_INDEX.countries.map((c) => c.code))].sort();
  assert.ok(codes.length > 200);
  for (const code of codes) {
    const frame = worldMapFrame(statsOf([{ code }]), core.COUNTRY_INDEX);
    for (const pane of frame.panes) {
      const { minX, minY, w, h } = box(pane.viewBox);
      assert.ok(w > 0 && h > 0, `${code}/${pane.id}: zero-area frame`);
      for (const c of frame.countries.filter((x) => x.paneId === pane.id)) {
        for (const v of vertices(c.d)) {
          assert.ok(v.x > minX && v.x < minX + w && v.y > minY && v.y < minY + h,
            `${code}/${pane.id}: vertex (${v.x}, ${v.y}) is not strictly inside ${pane.viewBox}`);
        }
      }
    }
  }
});

test('A-49: over all 239 single-country libraries, no pane is WIDER than A-48\'s, and 3 have an extent pane', () => {
  const codes = [...new Set(core.COUNTRY_INDEX.countries.map((c) => c.code))].sort();
  const withExtent: string[] = [];
  for (const code of codes) {
    const frame = worldMapFrame(statsOf([{ code }]), core.COUNTRY_INDEX);
    const before = unionBoxExtent([code], core.COUNTRY_INDEX);
    for (const pane of frame.panes) {
      const w = pane.bounds.east - pane.bounds.west;
      assert.ok(w <= before.w + 1e-9, `${code}/${pane.id}: ${w}° is wider than A-48's ${before.w}°`);
    }
    if (frame.panes.some((p) => p.home.length === 0)) withExtent.push(code);
  }
  assert.deepEqual(withExtent, ['FR', 'UM', 'US']);
});

// ---------------------------------------------------------------------------
// C8′'s premise, measured rather than assumed — KD-72.
// ---------------------------------------------------------------------------

/**
 * **KD-72, and A-51 is what closes it.** A-49 Part 2's justification claimed the in-frame set
 * *"is exactly one component"*; round 38 measured the `US`+`JP` pane's at **2**, because C5
 * refused to split a tie and handed C8′ a pane that was not one cluster. The implemented rule —
 * *the union of the components containing a principal part* — was well defined either way, so
 * the defect was in the model rather than in the code, and it is R38-2 one level out.
 *
 * Under A-51 the premise is a **definition**: a pane IS one component (I16), so `US`+`JP` is
 * three panes rather than one pane holding two clusters. This test keeps the superseded
 * measurement as the oracle — the one-pane answer, and its two components — and asserts it gone.
 */
test('A-51 G3 closes KD-72: a pane is exactly one component, by definition rather than by repair', () => {
  const componentsIn = (pane: { codes: string[] }): number => {
    const keys = pane.codes.flatMap((c) =>
      core.countryParts(c, core.COUNTRY_INDEX, WORLD_CLUSTER_THRESHOLD_KM)
        .filter((p) => p.principal).map((p) => p.key));
    return core.clusterPoints(keys, WORLD_CLUSTER_THRESHOLD_KM).length;
  };
  // One cluster: one component, unchanged.
  const one = worldMapFrame(statsOf([trips('FR', 2), trips('GR', 1)]), core.COUNTRY_INDEX);
  assert.equal(componentsIn(one.panes[0]), 1);
  // `US`+`JP`: C5 refused to split this tie and drew ONE 270.2°-wide pane holding two clusters,
  // in which Japan rendered 20 × 18 px. It is now three panes, each one component.
  const tie = worldMapFrame(statsOf([trips('JP', 1), trips('US', 1)]), core.COUNTRY_INDEX);
  assert.equal(tie.panes.length, 3);
  // A-54 G5′: the two home panes tie on weight and home.length, so latitude decides — the US
  // at N 49.4 before Japan at N 45.5. WAS `[['JP'], ['US'], ['US']]`, which was `J` < `U`.
  assert.deepEqual(tie.panes.map((p) => p.codes), [['US'], ['JP'], ['US']]);
  assert.deepEqual(tie.panes.map((p) => p.home), [['US'], ['JP'], []]);
  for (const pane of tie.panes.filter((p) => p.home.length > 0)) {
    assert.equal(componentsIn(pane), 1, 'a pane holds two clusters again — C5/C7 are back');
  }
  // The superseded rectangle, as the fault's oracle: one box over Japan and CONUS is 270° wide.
  const both = core.mapBounds([
    ...core.countryParts('JP', core.COUNTRY_INDEX, WORLD_CLUSTER_THRESHOLD_KM),
    ...core.countryParts('US', core.COUNTRY_INDEX, WORLD_CLUSTER_THRESHOLD_KM).filter((p) => p.principal),
  ].flatMap((p) => [{ lat: p.box[1], lng: p.box[0] }, { lat: p.box[3], lng: p.box[2] }]));
  assert.ok(both.east - both.west > 260, 'the withdrawn model\'s rectangle');
  for (const pane of tie.panes) {
    assert.ok(pane.bounds.east - pane.bounds.west < 60, `${pane.id} is ${pane.bounds.east - pane.bounds.west}° wide`);
  }
});

// ---------------------------------------------------------------------------
// I6 — determinism, with the detached pane in play.
// ---------------------------------------------------------------------------

test('A-49 / I6: a library with a detached pane is byte-identical run to run', () => {
  const stats = statsOf(rowsOf([['FR', 2], ['GR', 1], ['US', 1]]));
  assert.equal(
    JSON.stringify(worldMapFrame(stats, core.COUNTRY_INDEX)),
    JSON.stringify(worldMapFrame(stats, core.COUNTRY_INDEX)),
  );
});

test('A-49 / I9: permuting that library changes the partition, the extents and the standing by nothing', () => {
  const spec: Array<[string, number]> = [['FR', 2], ['GR', 1], ['US', 1]];
  const shape = (order: Array<[string, number]>) => {
    const f = worldMapFrame(statsOf(rowsOf(order)), core.COUNTRY_INDEX);
    return f.panes
      // Re-pointed at I-8i: `role` is withdrawn, and `home` is what carries a pane's standing.
      .map((p) => `${p.home.slice().sort().join(',')}:${p.codes.slice().sort().join(',')}@${p.viewBox}`)
      .slice().sort().join(' | ');
  };
  const answers = new Set(permutations(spec).map(shape));
  assert.equal(answers.size, 1, `six orderings gave ${answers.size} distinct frames`);
});

test('A-49: the empty history is still ONE unpadded whole-world pane, with no detached pane', () => {
  const frame = worldMapFrame(statsOf([]), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 1);
  assert.equal(frame.panes[0].viewBox, '-180 -90 360 180');
  assert.deepEqual(frame.codes, []);
  assert.deepEqual(frame.countries, []);
});

// ===========================================================================
// I-8i — ARCHITECTURE §4.4 **A-51** (one pane per geographic cluster), **A-52** (a ring the
// index carries is a ring the frame draws) and **A-53** (home panes and extent panes).
//
// A-51 reopened the framing abstraction rather than patching it a fifth time. There is no
// split test, no "main" pane, no inset hierarchy and no cap: **every connected component of
// the canonical part list is a pane**, panes are ordered by how much of the record each
// carries, and `role` is withdrawn. A-53 names the two kinds of pane that `home` already
// distinguished — a **home** pane (`home.length > 0`) is a place the record attributes travel
// to; an **extent** pane (`home.length === 0`, `weight === 0`) holds only geography belonging
// to a country visited elsewhere — and adds I18, which is what stops an `FR`-only history
// opening on French Guiana.
// ===========================================================================

/** A-53 Part 4: at least one code's PRINCIPAL part is here, so the record attributes travel to it. */
const homePanes = (f: ReturnType<typeof worldMapFrame>) => f.panes.filter((p) => p.home.length > 0);
/** A-53 Part 4: only non-principal geography of a country visited elsewhere. Never a destination. */
const extentPanes = (f: ReturnType<typeof worldMapFrame>) => f.panes.filter((p) => p.home.length === 0);

const ALL239 = [...new Set(core.COUNTRY_INDEX.countries.map((c) => c.code))].sort();

/** The libraries A-51 Part 5 and A-53 Part 5 measure, plus the two ceilings. */
const LIBRARIES: string[][] = [
  ['FR'], ['US'], ['UM'], ['GR'],
  ['FR', 'US'], ['FR', 'GR'], ['FR', 'NZ'], ['AU', 'GB'], ['JP', 'US'],
  ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US'],
  ['AT', 'CZ', 'DE', 'HR', 'HU', 'SI'],
  ['AT', 'CZ', 'DE', 'ES', 'FR', 'IT', 'JP'],
  ['DE', 'FR', 'IT', 'JP', 'PE'],
  ['AD', 'DE', 'FR', 'IT', 'LU', 'MC', 'VA'],
  ['AU', 'BR', 'EG', 'FR', 'GB', 'IN', 'JP', 'NZ', 'PE', 'TH', 'US', 'ZA'],
  ['AD', 'AE', 'AG', 'AO', 'AQ', 'AR', 'AS', 'AU', 'CA', 'CN', 'FM', 'IO', 'PN', 'TF'],
  ALL239,
];

const frameOf = (codes: string[]) =>
  worldMapFrame(statsOf(codes.map((code) => ({ code }))), core.COUNTRY_INDEX);

/**
 * **A second implementation of A-51 G2/G3, used as the tests' oracle.** The canonical part
 * list, and its connected components as sets of stable `CODE#partIndex` atom names. Nothing
 * here reads the frame, so an assertion built on it is not comparing the answer to itself.
 */
function componentsOf(codes: string[]): Array<{ atoms: string[]; codes: string[]; home: string[] }> {
  const atoms: Array<{ name: string; code: string; part: core.CountryPart }> = [];
  for (const code of codes) {
    core.countryParts(code, core.COUNTRY_INDEX, WORLD_CLUSTER_THRESHOLD_KM)
      .forEach((part, i) => atoms.push({ name: `${code}#${i}`, code, part }));
  }
  return core.clusterPoints(atoms.map((a) => a.part.key), WORLD_CLUSTER_THRESHOLD_KM).map((group) => ({
    atoms: group.map((i) => atoms[i].name),
    codes: codes.filter((c) => group.some((i) => atoms[i].code === c)),
    home: codes.filter((c) => group.some((i) => atoms[i].code === c && atoms[i].part.principal)),
  }));
}

// ---------------------------------------------------------------------------
// G4 — `role` is withdrawn. There is one kind of pane, and `home` is the claim.
// ---------------------------------------------------------------------------

test('A-51 G4: `role` is gone and every pane carries `home` — the hierarchy is not renamed, it is removed', () => {
  const frame = frameOf(REFERENCE);
  for (const pane of frame.panes) {
    assert.ok(!('role' in pane), `pane ${pane.id} still carries a role — the hierarchy came back`);
    assert.ok(Array.isArray(pane.home), `pane ${pane.id} has no home`);
    for (const c of pane.home) assert.ok(pane.codes.includes(c), `${c} is home in a pane it is not in`);
  }
  assert.deepEqual(frame.panes.map((p) => p.id), ['p0', 'p1', 'p2'], 'ids are positional, p0…pN');
});

test('A-51 G4 / I5: `weight` is Σ tripIds.length over `home`, and it sums to W exactly', () => {
  for (const codes of LIBRARIES) {
    const rows = codes.map((code, i) => trips(code, (i % 3) + 1));
    const frame = worldMapFrame(statsOf(rows), core.COUNTRY_INDEX);
    const W = rows.filter((r) => !frame.missing.includes(r.code))
      .reduce((n, r) => n + r.tripIds.length, 0);
    assert.equal(frame.panes.reduce((n, p) => n + p.weight, 0), W,
      `Σ pane.weight !== W for ${codes.length} codes — weight is not additive`);
    for (const pane of frame.panes) {
      assert.equal(pane.weight,
        pane.home.reduce((n, c) => n + (rows.find((r) => r.code === c) as { tripIds: string[] }).tripIds.length, 0));
    }
    // Every drawn code is home in EXACTLY one pane (I5).
    for (const code of frame.codes) {
      assert.equal(frame.panes.filter((p) => p.home.includes(code)).length, 1,
        `${code} is home in more or fewer than one pane`);
    }
  }
});

// ---------------------------------------------------------------------------
// R38-2's headline library. FR+US, walked exactly as A-53 Part 5 (1) walks it.
// ---------------------------------------------------------------------------

test('A-51 G3 + A-53, re-ordered by A-54 G5′: FR+US is four panes — FR · US · Alaska · Guiana', () => {
  const frame = frameOf(['FR', 'US']);
  assert.equal(frame.panes.length, 4, 'the shipped model drew ONE 134.2°-wide pane plus a detached one');
  assert.deepEqual(frame.panes.map((p) => p.id), ['p0', 'p1', 'p2', 'p3']);
  // A-54 G5′ swaps the two weight-0 panes: Alaska N 71.4 before French Guiana N 5.8. The two
  // home panes keep their order and change their reason — FR N 51.1 > US N 49.4, not `F` < `U`.
  assert.deepEqual(frame.panes.map((p) => p.codes), [['FR'], ['US'], ['US'], ['FR']]);
  assert.deepEqual(frame.panes.map((p) => p.home), [['FR'], ['US'], [], []]);
  assert.deepEqual(frame.panes.map((p) => p.weight), [1, 1, 0, 0]);
  assert.deepEqual(extent(frame.panes[0]), { w: 14.15, h: 9.77 }, 'continental France, not 134.2°');
  assert.deepEqual(extent(frame.panes[1]), { w: 57.72, h: 24.31 }, 'the contiguous United States');
  assert.deepEqual(extent(frame.panes[2]), { w: 41.81, h: 52.44 }, 'Alaska, Hawaii and the Aleutians');
  assert.deepEqual(extent(frame.panes[3]), { w: 2.87, h: 3.7 }, 'French Guiana, its own rectangle');
  // A-53 I18: both home panes come before both extent panes, strictly.
  assert.deepEqual(frame.panes.map((p) => p.home.length > 0), [true, true, false, false]);
});

/**
 * **A-51 L2 / I17, on the case that produced R38-2.** France's pane is a function of France's
 * own cluster and of nothing else in the library — adding the United States moves it by zero
 * bytes. Under the shipped model it went from 14.15° × 9.77° to 134.2° × 26.1°.
 */
test('A-51 I17 / R38-2: adding US to an FR library moves France\'s pane by nothing', () => {
  const alone = frameOf(['FR']);
  const withUs = frameOf(['FR', 'US']);
  const franceAlone = alone.panes.find((p) => p.home.includes('FR')) as { viewBox: string; bounds: core.MapBounds };
  const franceWith = withUs.panes.find((p) => p.home.includes('FR')) as { viewBox: string; bounds: core.MapBounds };
  assert.equal(franceWith.viewBox, franceAlone.viewBox);
  assert.deepEqual(franceWith.bounds, franceAlone.bounds);
  // …and French Guiana's pane too, which is R38-4's 7 × 8 px speck under the shipped model.
  const guianaAlone = alone.panes.find((p) => p.home.length === 0) as { viewBox: string };
  const guianaWith = withUs.panes.find((p) => p.codes.join() === 'FR' && p.home.length === 0) as { viewBox: string };
  assert.equal(guianaWith.viewBox, guianaAlone.viewBox);
});

// ---------------------------------------------------------------------------
// A-53 I18 — home panes come first, and the FR-only library is the proof.
// ---------------------------------------------------------------------------

/**
 * **A-53 Part 5 (3), the finding that made I18 worth writing.** The raw component order out of
 * G3 puts French Guiana at index 0, because Guiana's ring appears earlier in the index than
 * metropolitan France's. Nothing but G5's `weight`-descending key stops *"my trip to France"*
 * opening on a 2.87° × 3.70° rectangle of South America. Both halves are asserted: the raw
 * order (so the risk is real and not hypothetical) and the framed order (so it is prevented).
 */
test('A-53 I18: an FR-only library opens on continental France, not on French Guiana', () => {
  // The premise, from core rather than from the frame: raw component order is Guiana first.
  const raw = componentsOf(['FR']);
  assert.deepEqual(raw.map((c) => c.home), [[], ['FR']], 'the raw G3 order no longer leads with Guiana');
  assert.deepEqual(raw.map((c) => c.atoms), [['FR#0'], ['FR#1']]);

  const frame = frameOf(['FR']);
  assert.equal(frame.panes.length, 2);
  assert.deepEqual(frame.panes.map((p) => p.home), [['FR'], []], 'the frame opens on an extent pane');
  assert.deepEqual(extent(frame.panes[0]), { w: 14.15, h: 9.77 });
  assert.deepEqual(extent(frame.panes[1]), { w: 2.87, h: 3.7 });
  // `frame.viewBox` is `panes[0]`'s, so the compatibility field leads with France too.
  assert.equal(frame.viewBox, frame.panes[0].viewBox);
});

/**
 * **The injected fault, run rather than described.** Order panes by the component's canonical
 * position instead of by G5 and the `FR` library opens on South America — which is what the
 * *un-ordered* partition actually produces, not a hypothetical.
 */
test('A-53 I18 injected fault: ordering by canonical position instead of G5 opens FR on 2.87° × 3.70°', () => {
  const byPosition = componentsOf(['FR']);           // G3's own order, unsorted
  assert.deepEqual(byPosition[0].home, [], 'the fault must land on the extent component');
  const guiana = core.countryParts('FR', core.COUNTRY_INDEX, WORLD_CLUSTER_THRESHOLD_KM)[0];
  assert.equal(Math.round((guiana.box[2] - guiana.box[0]) * 100) / 100, 2.87);
  assert.equal(Math.round((guiana.box[3] - guiana.box[1]) * 100) / 100, 3.7);
  // The shipped frame does not do that.
  assert.deepEqual(frameOf(['FR']).panes[0].home, ['FR']);
});

test('A-53 I18: every home pane precedes every extent pane, over the fixture set and all 239 single-country libraries', () => {
  const check = (codes: string[]) => {
    const frame = frameOf(codes);
    const flags = frame.panes.map((p) => p.home.length > 0);
    const firstExtent = flags.indexOf(false);
    if (firstExtent >= 0) {
      assert.ok(!flags.slice(firstExtent).includes(true),
        `a home pane follows an extent pane for [${codes.slice(0, 6).join(',')}…]`);
    }
    if (frame.codes.length > 0) {
      assert.ok(frame.panes[0].home.length > 0,
        `[${codes.slice(0, 6).join(',')}…] opens on an extent pane`);
      assert.ok(frame.panes[0].weight >= 1, 'panes[0] carries none of the record');
    }
  };
  for (const codes of LIBRARIES) check(codes);
  for (const code of ALL239) check([code]);
});

// ---------------------------------------------------------------------------
// A-53 Part 5 (2) — territories cannot flood the grid, and the bound is a property
// of the shipped index rather than of anything a user does.
// ---------------------------------------------------------------------------

test('A-53 Part 5: the codes that can EVER produce an extent pane are exactly {FR, UM, US}', () => {
  const multi = ALL239.filter((c) =>
    core.countryParts(c, core.COUNTRY_INDEX, WORLD_CLUSTER_THRESHOLD_KM).some((p) => !p.principal));
  assert.deepEqual(multi, ['FR', 'UM', 'US'], 'a set equality over all 239 codes, not a count');
  const nonPrincipal = ALL239.reduce((n, c) =>
    n + core.countryParts(c, core.COUNTRY_INDEX, WORLD_CLUSTER_THRESHOLD_KM).filter((p) => !p.principal).length, 0);
  assert.equal(nonPrincipal, 3, 'three non-principal parts on the entire planet');
});

test('A-53 Part 5: extent panes are ≤ 3 in any library, and > 0 only with FR, UM or US in it', () => {
  const EXTENT_SOURCES = ['FR', 'UM', 'US'];
  const check = (codes: string[]) => {
    const n = extentPanes(frameOf(codes)).length;
    assert.ok(n <= 3, `[${codes.slice(0, 6).join(',')}…] produced ${n} extent panes`);
    if (n > 0) {
      assert.ok(codes.some((c) => EXTENT_SOURCES.includes(c)),
        `[${codes.join(',')}] has an extent pane without FR, UM or US`);
    }
  };
  for (const codes of LIBRARIES) check(codes);
  for (const code of ALL239) check([code]);
  // The named fixtures, re-pinned as counts rather than as a property.
  assert.equal(extentPanes(frameOf(REFERENCE)).length, 1, 'Alaska');
  assert.equal(extentPanes(frameOf(['FR', 'US'])).length, 2);
  assert.equal(extentPanes(frameOf(['AU', 'GB'])).length, 0);
  assert.equal(extentPanes(frameOf(['AT', 'CZ', 'DE', 'HR', 'HU', 'SI'])).length, 0);
  assert.equal(extentPanes(frameOf(ALL239)).length, 0, 'the world is one component, and it is home');
  assert.equal(extentPanes(frameOf(
    ['AD', 'AE', 'AG', 'AO', 'AQ', 'AR', 'AS', 'AU', 'CA', 'CN', 'FM', 'IO', 'PN', 'TF'])).length, 0,
    'the 14-pane ceiling contains zero extent panes');
});

test('A-53 Part 5: over all 28,441 two-country libraries the extent bound holds without exception', () => {
  const EXTENT_SOURCES = ['FR', 'UM', 'US'];
  let worst = 0;
  let pairs = 0;
  for (let i = 0; i < ALL239.length; i++) {
    for (let j = i + 1; j < ALL239.length; j++) {
      const codes = [ALL239[i], ALL239[j]];
      const n = extentPanes(frameOf(codes)).length;
      pairs++;
      if (n > worst) worst = n;
      assert.ok(n <= 3, `${codes.join('+')} produced ${n} extent panes`);
      if (n > 0) assert.ok(codes.some((c) => EXTENT_SOURCES.includes(c)), `${codes.join('+')}`);
      if (n === 0) continue;
    }
  }
  assert.equal(pairs, 28441, 'the census is not sweeping every pair');
  assert.equal(worst, 2, 'the worst two-country library is FR+US, at two extent panes');
});

/**
 * **The injected fault A-53 names, and the case that proves membership is geometry.** A rule
 * that counted a pane as *extent* whenever it holds any **non-principal** part would misclassify
 * the South-American pane of `FR DE IT JP PE`: French Guiana is 2,700 km from Peru, joins Peru's
 * component, and that pane's `home` is `["PE"]`. No territory table could produce that.
 */
test('A-53 Part 5 injected fault: "holds a non-principal part" is NOT what makes a pane an extent pane', () => {
  const codes = ['DE', 'FR', 'IT', 'JP', 'PE'];
  const frame = frameOf(codes);
  assert.equal(frame.panes.length, 3);
  assert.equal(extentPanes(frame).length, 0, 'Guiana is in a HOME pane here');
  const sa = frame.panes.find((p) => p.codes.includes('PE')) as { home: string[]; codes: string[] };
  assert.deepEqual(sa.home, ['PE'], 'the South-American pane is home to Peru');
  assert.deepEqual(sa.codes, ['FR', 'PE'], 'and France is in it, by geometry alone');
  // The fault's own oracle: this pane DOES hold `FR`'s non-principal part, so a rule keyed on
  // "holds a non-principal part" fires here and calls a home pane an extent pane.
  const guianaComponent = componentsOf(codes).find((c) => c.atoms.includes('FR#0'));
  assert.ok(guianaComponent, 'French Guiana is atom FR#0 of the canonical part list');
  assert.deepEqual(guianaComponent.home, ['PE'], 'the wrong rule would score this component 0-weight');
  assert.ok(guianaComponent.codes.includes('PE'),
    'Guiana is 2,700 km from Peru and joins that component, by distance and by nothing else');
});

// ---------------------------------------------------------------------------
// G5 — the order is total, and its third key is a position rather than an alphabet.
// ---------------------------------------------------------------------------

test('A-54 G5′: panes are ordered by weight desc, home.length desc, bounds.north desc, bounds.west asc', () => {
  const frame = worldMapFrame(
    statsOf([trips('AU', 2), trips('EA', 2), trips('EB', 2), trips('EC', 1), trips('JP', 2)]),
    ATLAS,
  );
  // {EA,EB,EC} weighs 5; {AU} and {JP} weigh 2 each with one code each. The third key separates
  // the tie by the pane's own NORTH EDGE — `JP` is at N 36, `AU` at S 32 — and the canonical
  // position, which is the alphabet one indirection out, survives only as the last key.
  assert.deepEqual(frame.panes.map((p) => p.codes), [['EA', 'EB', 'EC'], ['JP'], ['AU']]);
  assert.deepEqual(frame.panes.map((p) => p.weight), [5, 2, 2]);
  // Weight still outranks everything geographic.
  const heavier = worldMapFrame(
    statsOf([trips('AU', 3), trips('EA', 2), trips('EB', 2), trips('EC', 1), trips('JP', 2)]),
    ATLAS,
  );
  assert.deepEqual(heavier.panes.map((p) => p.codes), [['EA', 'EB', 'EC'], ['AU'], ['JP']],
    'weight still outranks latitude — keys 1 and 2 are unchanged by A-54');
});

test('A-51 G5: at equal weight, the pane with more home codes ranks higher', () => {
  const frame = worldMapFrame(
    statsOf([trips('EA', 3), trips('EB', 2), trips('JP', 2), trips('NA', 1), trips('NB', 1)]),
    ATLAS,
  );
  assert.deepEqual(frame.panes.map((p) => p.codes), [['EA', 'EB'], ['NA', 'NB'], ['JP']]);
  assert.deepEqual(frame.panes.map((p) => p.weight), [5, 2, 2]);
});

// ---------------------------------------------------------------------------
// G6 — no cap. `panes.length` is the component count, and nothing folds.
// ---------------------------------------------------------------------------

test('A-51 G6/I3: `panes.length` is the number of connected components, with no cap and no union pane', () => {
  for (const codes of LIBRARIES) {
    const frame = frameOf(codes);
    assert.equal(frame.panes.length, componentsOf(codes.filter((c) => !frame.missing.includes(c))).length,
      `pane count is not the component count for [${codes.slice(0, 6).join(',')}…]`);
  }
  // Five clusters used to fold into three panes with the third a union of the rest (C7).
  const five = worldMapFrame(
    statsOf([trips('AU', 1), trips('EA', 6), trips('EB', 3), trips('EC', 3), trips('JP', 1),
             trips('KE', 1), trips('NA', 1), trips('NB', 1)]),
    ATLAS,
  );
  assert.equal(five.panes.length, 5, 'the cap is withdrawn — five clusters are five panes');
  assert.deepEqual(five.panes.map((p) => p.codes),
    [['EA', 'EB', 'EC'], ['NA', 'NB'], ['JP'], ['KE'], ['AU']]);   // A-54 G5′: north to south
  assert.ok(!five.panes.some((p) => p.codes.join() === 'AU,JP,KE'), 'the union-of-the-rest pane came back');
});

/**
 * **A-54 Part 4 (QA R39-3) corrects G6's published ceiling: 18, not 14.** A-51's 14-code library
 * is kept — it still produces 14 all-home panes, so it is not wrong, only not the ceiling — and
 * the architect's own 60,000-pass greedy search found an independent 18-code library. A-53 Part
 * 5's substantive claim survives at the corrected number: **the ceiling contains zero extent
 * panes**, so the worst case is not territory-driven.
 */
test('A-54 Part 4 supersedes A-51 G6\'s 14: the greedy worst case is 18 panes, and every one of them is home', () => {
  const fourteen = ['AD', 'AE', 'AG', 'AO', 'AQ', 'AR', 'AS', 'AU', 'CA', 'CN', 'FM', 'IO', 'PN', 'TF'];
  assert.equal(frameOf(fourteen).panes.length, 14, 'A-51\'s library is still 14 panes — it is just not the ceiling');
  const worst = ['AQ', 'AU', 'CL', 'EH', 'FJ', 'GL', 'GU', 'IO', 'MS', 'MX', 'PK', 'PN', 'RO', 'RU', 'RW', 'SH', 'TF', 'VN'];
  const frame = frameOf(worst);
  assert.equal(frame.panes.length, 18);
  assert.equal(homePanes(frame).length, 18, 'A-53 Part 5: the ceiling contains zero extent panes');
  assert.equal(extentPanes(frame).length, 0);
  // A-54 Part 3's own published reading order for it — Greenland to Antarctica, not an index.
  assert.deepEqual(frame.panes.map((p) => p.codes.join()),
    ['GL', 'RU', 'RO', 'PK', 'MX', 'EH', 'VN', 'MS', 'GU', 'RW', 'IO', 'SH', 'AU', 'FJ', 'CL', 'PN', 'TF', 'AQ']);
});

// ---------------------------------------------------------------------------
// R33-1 and the two ceilings — byte-identity, asserted as literal strings.
// ---------------------------------------------------------------------------

test('A-51: R33-1 is not regressed — the reference library\'s THREE viewBoxes are byte-identical', () => {
  const frame = frameOf(REFERENCE);
  assert.equal(frame.panes.length, 3);
  assert.deepEqual(frame.panes.map((p) => p.viewBox), [
    '-8.1779 -59.2407 31.494 17.3663',
    '-125.8416 -50.5435 60.0314 26.618',
    '-172.8399 -72.4066 43.9088 54.5393',
  ]);
  assert.deepEqual(frame.panes.map((p) => p.codes), [['AT', 'CZ', 'DE', 'GB', 'HR', 'HU'], ['US'], ['US']]);
  assert.deepEqual(frame.panes.map((p) => p.home), [['AT', 'CZ', 'DE', 'GB', 'HR', 'HU'], ['US'], []]);
  assert.deepEqual(frame.panes.map((p) => p.weight), [6, 1, 0]);
  assert.equal(frame.panes.reduce((n, p) => n + p.weight, 0), 7, 'Σ weight === W === 7');
  assert.equal(frame.viewBox, frame.panes[0].viewBox);
  assert.deepEqual(frame.bounds, frame.panes[0].bounds);
});

test('A-51: a genuinely single-cluster history is ONE pane, byte-identical to I-8h\'s', () => {
  const frame = frameOf(['AT', 'CZ', 'DE', 'HR', 'HU', 'SI']);
  assert.equal(frame.panes.length, 1);
  assert.equal(frame.panes[0].viewBox, '5.6543 -55.3175 17.3907 13.172');
  assert.deepEqual(extent(frame.panes[0]), { w: 16.72, h: 12.5 });
  assert.deepEqual(frame.panes[0].home, ['AT', 'CZ', 'DE', 'HR', 'HU', 'SI']);
});

test('A-51: the 239-code ceiling is ONE honest world map, byte-identical to I-8h\'s', () => {
  const frame = frameOf(ALL239);
  assert.equal(frame.panes.length, 1, 'the world is one component at 4,000 km');
  assert.equal(frame.panes[0].viewBox, '-187.2 -90.8451 374.4 188.0451');
  assert.deepEqual(frame.panes[0].codes, ALL239);
  assert.deepEqual(frame.panes[0].home, ALL239);
});

test('A-51: FR+GR is byte-identical to I-8h\'s, and French Guiana gets a real rectangle', () => {
  const frame = worldMapFrame(statsOf([trips('FR', 2), trips('GR', 1)]), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 2);
  assert.deepEqual(extent(frame.panes[0]), { w: 31.2, h: 16.23 });
  assert.equal(frame.panes[0].viewBox.split(' ')[2], '32.4444');
  assert.equal(frame.panes[0].viewBox.split(' ')[3], '17.4764');
  assert.deepEqual(frame.panes[0].home, ['FR', 'GR']);
  assert.deepEqual(frame.panes[1].home, []);
  assert.deepEqual(frame.panes[1].codes, ['FR']);
  assert.deepEqual(extent(frame.panes[1]), { w: 2.87, h: 3.7 });
});

// ---------------------------------------------------------------------------
// I16 — tightness, as a theorem a test can hold.
// ---------------------------------------------------------------------------

/**
 * **A-51 I16 (L1).** Every pane's member parts admit a spanning tree over their key points with
 * every edge under the threshold, and every cross-pane part pair is at or beyond it. That is
 * what makes *"no pane is wide for a reason it is not showing"* mechanical rather than a
 * judgement: a pane's diameter is at most `Σ diam(part) + (n − 1) × threshold`.
 *
 * The linkage is measured with the ONE kernel — `clusterPoints` over a candidate pair returns
 * one group iff they are within the threshold — so this test hand-rolls no distance function.
 */
test('A-51 I16: every pane is one connected component, and no pane contains a jump wider than the threshold', () => {
  const near = (a: core.LatLng, b: core.LatLng) =>
    core.clusterPoints([a, b], WORLD_CLUSTER_THRESHOLD_KM).length === 1;
  for (const codes of LIBRARIES) {
    if (codes.length > 30) continue;   // the 239-code ceiling is one component; the sweep is O(n²)
    const frame = frameOf(codes);
    // Spanning-tree connectivity, over the atoms this pane actually frames. The atom set is
    // taken from the oracle rather than from the frame, so this is not self-comparison.
    for (const comp of componentsOf(codes)) {
      const keys = comp.atoms.map((name) => {
        const [code, i] = name.split('#');
        return core.countryParts(code, core.COUNTRY_INDEX, WORLD_CLUSTER_THRESHOLD_KM)[Number(i)].key;
      });
      // Connected: a spanning tree exists iff the kernel returns one group.
      assert.equal(core.clusterPoints(keys, WORLD_CLUSTER_THRESHOLD_KM).length, 1,
        `a pane of [${codes.slice(0, 6).join(',')}…] is not one component`);
    }
    // Cross-pane: every pair of parts in different components is at or beyond the threshold.
    const comps = componentsOf(codes);
    const keyOf = (name: string) => {
      const [code, i] = name.split('#');
      return core.countryParts(code, core.COUNTRY_INDEX, WORLD_CLUSTER_THRESHOLD_KM)[Number(i)].key;
    };
    for (let a = 0; a < comps.length; a++) {
      for (let b = a + 1; b < comps.length; b++) {
        for (const x of comps[a].atoms) {
          for (const y of comps[b].atoms) {
            assert.ok(!near(keyOf(x), keyOf(y)), `${x} and ${y} are in different panes but within the threshold`);
          }
        }
      }
    }
    assert.equal(frame.panes.length, comps.length);
  }
});

// ---------------------------------------------------------------------------
// I17 — locality. The invariant three adversarial rounds could not see, because
// it is a property of a PAIR of libraries.
// ---------------------------------------------------------------------------

test('A-51 I17: a pane that gains no part of a new code is byte-identical when that code is added', () => {
  // A deterministic pseudo-random sweep — no ambient randomness, so a failure is reproducible.
  let seed = 20260901;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = (n: number) => ALL239[Math.floor(next() * ALL239.length)];
  let pairsChecked = 0;
  let paneComparisons = 0;
  for (let round = 0; round < 60; round++) {
    const size = 1 + Math.floor(next() * 5);
    const a = [...new Set(Array.from({ length: size }, () => pick(0)))].sort();
    let x = pick(0);
    let guard = 0;
    while (a.includes(x) && guard++ < 50) x = pick(0);
    if (a.includes(x)) continue;
    const before = frameOf(a);
    const after = frameOf([...a, x].sort());
    const beforeComps = componentsOf(a);
    const afterComps = componentsOf([...a, x].sort());
    pairsChecked++;
    for (const comp of beforeComps) {
      const grown = afterComps.find((d) => comp.atoms.every((n) => d.atoms.includes(n)));
      assert.ok(grown, 'single linkage is monotone: a component must survive inside one of the union\'s');
      if (grown.atoms.some((n) => n.startsWith(`${x}#`))) continue;   // it gained a part of x
      const paneBefore = before.panes.find((p) =>
        p.codes.join() === comp.codes.join() && p.home.join() === comp.home.join());
      const paneAfter = after.panes.find((p) =>
        p.codes.join() === comp.codes.join() && p.home.join() === comp.home.join());
      assert.ok(paneBefore && paneAfter, `a pane vanished when ${x} joined [${a.join(',')}]`);
      assert.equal(paneAfter.viewBox, paneBefore.viewBox, `${x} moved a pane it is not in`);
      assert.deepEqual(paneAfter.bounds, paneBefore.bounds);
      assert.deepEqual(paneAfter.codes, paneBefore.codes);
      paneComparisons++;
    }
  }
  assert.ok(pairsChecked >= 50, `only ${pairsChecked} (library, code) pairs were reached`);
  assert.ok(paneComparisons >= 50, `only ${paneComparisons} panes were compared`);
});

// ---------------------------------------------------------------------------
// A-52 — a ring the index carries is a ring the frame draws, and I11's oracle is the index.
// ---------------------------------------------------------------------------

test('A-52 / I11: a fixture carrying a two-point ring is drawn, and the index is the oracle', () => {
  const idx: core.CountryIndex = {
    scale: 'test', source: 'hand-written',
    countries: [
      { code: 'ZM', rings: [square(10, 40, 2), [40, 20, 42, 20]], box: [10, 20, 42, 42] },
    ],
  };
  const frame = worldMapFrame(statsOf([{ code: 'ZM' }]), idx);
  assert.deepEqual(frame.missing, [], 'the code has a ring, so it is drawable');
  // I11 restated: the multiset of rings across the code's rows equals the INDEX's ring set.
  assertI11(frame, idx);
  // …and the dropped vertex is inside the frame it is drawn in, which is what R38-5 measured.
  for (const pane of frame.panes) {
    const { minX, minY, w, h } = box(pane.viewBox);
    for (const c of frame.countries.filter((x) => x.paneId === pane.id)) {
      for (const v of vertices(c.d)) {
        assert.ok(v.x > minX && v.x < minX + w && v.y > minY && v.y < minY + h,
          `${c.code}: (${v.x}, ${v.y}) is outside ${pane.viewBox}`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// The invariants that did not move — re-run against the new pane shape.
// ---------------------------------------------------------------------------

test('A-51 I1/I2/I13: accounting still holds at 1, 2, 3, 4, 5, 8 and 14 panes', () => {
  for (const codes of LIBRARIES) {
    const frame = frameOf(codes);
    const inPanes = frame.panes.flatMap((p) => p.codes);
    assert.deepEqual([...new Set(inPanes)].sort(), frame.codes.slice().sort(), 'a code is drawn in no pane');
    assert.deepEqual(frame.codes, codes.filter((c) => !frame.missing.includes(c)), 'codes is canonical');
    for (const pane of frame.panes) {
      const members = frame.countries.filter((c) => c.paneId === pane.id).map((c) => c.code);
      assert.equal(new Set(members).size, members.length, `${pane.id} draws a code twice`);
      assert.deepEqual(pane.codes.slice().sort(), members.slice().sort());
      assert.deepEqual(pane.codes, frame.codes.filter((c) => pane.codes.includes(c)),
        'pane.codes is not in canonical row order');
    }
    for (const c of frame.countries) {
      assert.ok(frame.panes.some((p) => p.id === c.paneId), `${c.code} names a pane that does not exist`);
    }
    assertI11(frame, core.COUNTRY_INDEX);
  }
});

test('A-51 I4: every pane strictly contains every vertex it draws, over the whole fixture set', () => {
  for (const codes of LIBRARIES) {
    const frame = frameOf(codes);
    for (const pane of frame.panes) {
      const { minX, minY, w, h } = box(pane.viewBox);
      assert.ok(w > 0 && h > 0, `${pane.id}: zero-area frame`);
      for (const c of frame.countries.filter((x) => x.paneId === pane.id)) {
        for (const v of vertices(c.d)) {
          assert.ok(v.x > minX && v.x < minX + w && v.y > minY && v.y < minY + h,
            `${c.code}: (${v.x}, ${v.y}) is not strictly inside ${pane.viewBox}`);
        }
      }
    }
  }
});

/**
 * **I6 and I9, and the one thing G5 deliberately does depend on.** The *partition* — which parts
 * share a pane, and what rectangle each is framed at — is a property of the point set and of
 * nothing else, so permuting the rows changes it by zero bytes (I9, A-48's kernel property).
 *
 * **A-54 G5′ makes the pane ORDER order-independent too, and that is a strengthening of this
 * test rather than a re-pointing of it.** Under A-51 the third key was the component's position
 * in the canonical part list — *"drawn codes in canonical row order"* (G2) — so two panes of
 * equal `weight` and equal `home.length` swapped when the caller handed the rows over in a
 * different order. G5′'s third and fourth keys are read off the pane's own rectangle, which no
 * permutation of the rows can move, so the assertion below is now on the **whole frame** and not
 * merely on the sorted partition. The canonical-position key survives as the last resort and is
 * the only thing that could reintroduce the dependency; it decides 0 pairs on this index.
 */
test('A-51 I6/I9 + A-54 G5′: the partition AND the pane order are byte-identical under every row permutation', () => {
  const spec: Array<[string, number]> = [['FR', 2], ['GR', 1], ['US', 1]];
  const shape = (order: Array<[string, number]>) =>
    JSON.stringify(worldMapFrame(statsOf(rowsOf(order)), core.COUNTRY_INDEX).panes
      .map((p) => `${p.codes.slice().sort().join(',')}/${p.home.slice().sort().join(',')}` +
        `@${p.viewBox}@${p.weight}`)
      .slice().sort());
  const answers = new Set(permutations(spec).map(shape));
  assert.equal(answers.size, 1, `six orderings gave ${answers.size} distinct partitions`);
  // A-54 G5′: the same six orderings without sorting the PANE ARRAY. Each pane's own `codes`
  // list is still canonical row order (I2) and is row-order-dependent by design, so it is sorted
  // WITHIN a pane; what is asserted invariant is the sequence the panes come back in.
  const ordered = new Set(permutations(spec).map((order) =>
    JSON.stringify(worldMapFrame(statsOf(rowsOf(order)), core.COUNTRY_INDEX).panes
      .map((p) => `${p.codes.slice().sort().join(',')}/${p.home.slice().sort().join(',')}` +
        `@${p.viewBox}@${p.weight}`))));
  assert.equal(ordered.size, 1, `six orderings gave ${ordered.size} distinct pane ORDERS — the row order is deciding again`);
  // I6: the same `(stats, index)` twice, byte for byte.
  const stats = statsOf(rowsOf(spec));
  assert.equal(JSON.stringify(worldMapFrame(stats, core.COUNTRY_INDEX)),
    JSON.stringify(worldMapFrame(stats, core.COUNTRY_INDEX)));
  // …and the order itself, pinned. The two weight-0 extent panes are separated by G5′'s third
  // key alone, so this is the assertion that would catch the key going missing. WAS
  // `'FR:0', 'US:0'` — the canonical row order; it is now Alaska N 71.4 before Guiana N 5.8.
  const canonical = worldMapFrame(statsOf(rowsOf(spec)), core.COUNTRY_INDEX);
  assert.deepEqual(canonical.panes.map((p) => `${p.codes.join(',')}:${p.weight}`),
    ['FR,GR:3', 'US:1', 'US:0', 'FR:0']);
});

test('A-51 I7: the empty history is still ONE unpadded whole-world pane, and it is not a home pane', () => {
  const frame = worldMapFrame(statsOf([]), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 1);
  assert.equal(frame.panes[0].id, 'p0');
  assert.equal(frame.panes[0].viewBox, '-180 -90 360 180');
  assert.equal(frame.panes[0].bounds.empty, true);
  assert.deepEqual(frame.panes[0].codes, []);
  assert.deepEqual(frame.panes[0].home, []);
  assert.equal(frame.panes[0].weight, 0);
  assert.equal(frame.panes[0].aspect, 2);
  assert.deepEqual(frame.codes, []);
  assert.deepEqual(frame.countries, []);
});

test('A-51 I7: a history the index cannot draw at all is still one whole-world pane', () => {
  const frame = worldMapFrame(statsOf([{ code: 'ZZ' }]), core.COUNTRY_INDEX);
  assert.equal(frame.panes.length, 1);
  assert.equal(frame.panes[0].viewBox, '-180 -90 360 180');
  assert.deepEqual(frame.missing, ['ZZ']);
});

/**
 * **A-51 Part 6 / A-53 Part 7: `countryKeyPoint` loses its production caller and stays in core.**
 * G3 clusters PARTS, and the principal part's key IS the country key point (I12), so C2′'s
 * content survives as a property of `countryParts`. The symbol stays exported as I12's oracle;
 * what may not survive is a second geometric input to the frame.
 */
test('A-51 Part 6: the frame no longer calls countryKeyPoint, and still computes no geometry of its own', () => {
  const src = readFileSync(resolve(HERE, '..', 'src', 'selectors', 'worldMap.ts'), 'utf8');
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  assert.ok(!stripped.includes('core.countryKeyPoint('),
    'the frame still calls countryKeyPoint — it has two geometric inputs again');
  assert.match(stripped, /core\.countryParts\(/, 'the frame must take its geometry from core');
  assert.equal((stripped.match(/core\.clusterPoints\(/g) ?? []).length, 1,
    'G3 is ONE clusterPoints call over the canonical part list');
  for (const banned of ['(south + north) / 2', '(west + east) / 2', 'haversine', '6371']) {
    assert.ok(!stripped.includes(banned), `worldMap.ts computes geometry of its own: ${banned}`);
  }
  // C5, C6 and C7 are withdrawn, not renamed.
  for (const banned of ['weightOf', 'lowestCode', 'totalWeight', 'paneGroups', 'inFrameOf', 'detachedParts']) {
    assert.ok(!stripped.includes(banned), `the withdrawn split/rank/cap machinery survives: ${banned}`);
  }
  assert.ok(core.countryKeyPoint('FR', core.COUNTRY_INDEX) !== null,
    'countryKeyPoint must stay exported as I12\'s oracle');
});

// ===========================================================================
// I-8j — ARCHITECTURE §4.4 **A-54**. Three clauses of A-51 move and nothing else does:
// **G5′** (the last tie is broken by latitude, and the alphabet is named where it survives),
// **D** (a ring the index cannot draw is stated rather than blanked — I19), and G7′/G7″, which
// is a stylesheet and is measured in `qa/i8j-render.mjs` rather than here.
// ===========================================================================

// ---------------------------------------------------------------------------
// G5′ — `weight` desc, `home.length` desc, `bounds.north` desc, `bounds.west` asc, then the
// canonical position, which is the alphabet, in the open, as a last resort.
// ---------------------------------------------------------------------------

test('A-54 G5′ / R39-5: FR+US reads FR · US · Alaska · Guiana — the two weight-0 panes swap', () => {
  const frame = frameOf(['FR', 'US']);
  assert.deepEqual(frame.panes.map((p) => `${p.codes.join('+')}/${p.home.join('+')}`),
    ['FR/FR', 'US/US', 'US/', 'FR/'],
    'WAS FR · US · Guiana · Alaska — the extent panes were ordered by the canonical position');
  // France still leads, and this is the assertion that says WHY: N 51.1485 > N 49.3891, not
  // `F` < `U`. The two home panes tie on `weight` (1) and on `home.length` (1).
  assert.equal(frame.panes[0].weight, frame.panes[1].weight);
  assert.equal(frame.panes[0].home.length, frame.panes[1].home.length);
  assert.ok(frame.panes[0].bounds.north > frame.panes[1].bounds.north,
    'FR leads on latitude, which is the key G5′ actually reads');
  // …and the extent pair is where the old key and the new one DISAGREE, so it is the pair that
  // proves the new key is driving rather than coincidentally agreeing.
  assert.ok(frame.panes[2].bounds.north > frame.panes[3].bounds.north,
    'Alaska N 71.4 precedes French Guiana N 5.8');
  assert.deepEqual(frame.panes.map((p) => p.weight), [1, 1, 0, 0]);
});

test('A-54 G5′: `bounds.west` ascending is the FOURTH key, reached only when `north` ties', () => {
  // Two 2° squares on the same parallel, ~11,000 km apart, so they are two components with
  // IDENTICAL `north` and different `west`. The rows are given east-first, so the withdrawn
  // canonical-position key would put the eastern pane first and G5′ puts the western one first.
  const idx: core.CountryIndex = {
    scale: 'test', source: 'hand-written',
    countries: [entry('QE', [square(100, 0, 2)]), entry('QW', [square(0, 0, 2)])],
  };
  const frame = worldMapFrame(statsOf([{ code: 'QE' }, { code: 'QW' }]), idx);
  assert.equal(frame.panes.length, 2);
  assert.equal(frame.panes[0].bounds.north, frame.panes[1].bounds.north,
    'the third key must tie here, or this test is not about the fourth');
  assert.deepEqual(frame.panes.map((p) => p.codes.join()), ['QW', 'QE'],
    'WAS QE first, on the canonical position — i.e. on the row order');
  assert.ok(frame.panes[0].bounds.west < frame.panes[1].bounds.west);
});

/**
 * **The census A-54 Part 3 publishes, re-derived here rather than quoted.** 30,680 libraries —
 * all 239 single-country, all 28,441 two-country, and 2,000 deterministic pseudo-random 2–25-code
 * libraries. The third key is reached in 24,204 of them and decides 25,454 adjacent pairs;
 * `bounds.north` resolves every one, `bounds.west` decides 0, and the canonical position decides
 * 0. That last number is the point: the code-derived key is reachable in principle and
 * **unreached in practice on any library the shipped index can produce**, which is why it stays,
 * named, instead of being claimed impossible.
 *
 * **What is asserted exactly and what is not.** The 28,680 deterministic libraries (239 single +
 * 28,441 pairs) are re-derived to the pair: **22,765 reached, 22,766 decided by `north`, 0 by
 * `west`, 0 by the alphabet** — and 22,765 is A-54 Part 3's own *"22,765 of 22,877 (99.5%)"*
 * figure arrived at from the other side, which makes it a cross-check rather than a restatement.
 * The 2,000 random libraries depend on the architect's seed, which is not published, so their
 * counts are **reported** and only the seed-independent claim is asserted on them: `west` and the
 * alphabet decide nothing. That is the load-bearing half of the ruling, and it is the half an
 * injected fault can turn red.
 */
test('A-54 G5′ census: over 30,680 libraries north decides 25,454 pairs, west 0, and the alphabet 0', () => {
  // A deterministic LCG — no ambient randomness anywhere in this repo's tests.
  let seed = 20260901;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const libs: string[][] = ALL239.map((c) => [c]);
  for (let a = 0; a < ALL239.length; a++) for (let b = a + 1; b < ALL239.length; b++) libs.push([ALL239[a], ALL239[b]]);
  for (let i = 0; i < 2000; i++) {
    const n = 2 + Math.floor(rnd() * 24);
    const pick = new Set<string>();
    while (pick.size < n) pick.add(ALL239[Math.floor(rnd() * ALL239.length)]);
    libs.push([...pick].sort());
  }
  assert.equal(libs.length, 30680);

  /** The first 28,680 libraries are seed-independent; the rest are not. */
  const DETERMINISTIC = 239 + 28441;
  const tally = { reached: 0, north: 0, west: 0, canonical: 0 };
  const all = { reached: 0, north: 0, west: 0, canonical: 0 };
  let i18Violations = 0, firstPaneNotHome = 0;
  libs.forEach((codes, n) => {
    const frame = frameOf(codes);
    let hit = false;
    for (let i = 1; i < frame.panes.length; i++) {
      const a = frame.panes[i - 1], b = frame.panes[i];
      if (a.weight !== b.weight || a.home.length !== b.home.length) continue;
      hit = true;
      const which = a.bounds.north !== b.bounds.north ? 'north'
        : a.bounds.west !== b.bounds.west ? 'west' : 'canonical';
      all[which]++;
      if (n < DETERMINISTIC) tally[which]++;
    }
    if (hit) { all.reached++; if (n < DETERMINISTIC) tally.reached++; }
    // I18 is a theorem of key 1 and G5′ cannot reach it — asserted over the same census.
    let seenExtent = false;
    for (const p of frame.panes) {
      if (p.home.length === 0) seenExtent = true;
      else if (seenExtent) i18Violations++;
    }
    if (frame.panes.some((p) => p.codes.length > 0) && frame.panes[0].home.length === 0) firstPaneNotHome++;
  });
  assert.deepEqual(tally, { reached: 22765, north: 22766, west: 0, canonical: 0 },
    'the 28,680 deterministic libraries — 22,765 is A-54 Part 3\'s own 99.5% figure from the other side');
  assert.equal(all.west, 0, '`bounds.west` decides no adjacent pair on any library the shipped index can produce');
  assert.equal(all.canonical, 0,
    'the canonical position — the alphabet — decides no adjacent pair: reachable in principle, unreached in practice');
  assert.ok(all.north >= tally.north && all.reached >= tally.reached,
    `random-library counts: reached ${all.reached}, north ${all.north} (seed-dependent; A-54 published 24,204 / 25,454)`);
  assert.equal(i18Violations, 0, 'I18: no extent pane may precede a home pane');
  assert.equal(firstPaneNotHome, 0, 'panes[0].home.length > 0 wherever any code is drawn');
});

test('A-54 G5′: the Europe 2026 reference fixture does not move — no tie, three panes, three strings', () => {
  const frame = frameOf(REFERENCE);
  assert.deepEqual(frame.panes.map((p) => p.viewBox), [
    '-8.1779 -59.2407 31.494 17.3663',
    '-125.8416 -50.5435 60.0314 26.618',
    '-172.8399 -72.4066 43.9088 54.5393',
  ]);
  assert.deepEqual(frame.panes.map((p) => p.weight), [6, 1, 0], 'weights 6 · 1 · 0 — there is no tie at all');
  assert.deepEqual(frame.panes.map((p) => p.codes), [['AT', 'CZ', 'DE', 'GB', 'HR', 'HU'], ['US'], ['US']]);
});

/**
 * **L5's corrected proof obligation (A-54 Part 3).** Round 38's and I-8i's relabel tests both use
 * an order-**preserving** map (`CODES[i] → Q000+i`), which cannot reach the question, because the
 * frame's only ordinal was canonical row order and canonical row order is ascending ISO code. The
 * relabel below is a rotation on both letters, so it destroys the order — and under G5′ pane
 * **order** is invariant under it too, not just pane geometry. **This test must fail against the
 * pre-G5′ comparator**, which is what makes it an obligation rather than a tautology.
 */
test('A-54 / L5: an ORDER-DESTROYING ISO relabel leaves pane order identical, not just pane geometry', () => {
  const rot = (c: string) =>
    String.fromCharCode(((c.charCodeAt(0) - 65 + 7) % 26) + 65) +
    String.fromCharCode(((c.charCodeAt(1) - 65 + 11) % 26) + 65);
  const relabelled: core.CountryIndex = {
    ...core.COUNTRY_INDEX,
    countries: core.COUNTRY_INDEX.countries.map((e) => ({ ...e, code: rot(e.code) })),
  };
  const key = (vb: string, cs: readonly string[], hs: readonly string[], w: number) =>
    `${vb}|${[...cs].sort().join('+')}|${[...hs].sort().join('+')}|${w}`;
  const moved: string[] = [];
  for (const codes of LIBRARIES) {
    const a = frameOf(codes);
    const b = worldMapFrame(statsOf(codes.map(rot).sort().map((code) => ({ code }))), relabelled);
    const av = a.panes.map((p) => key(p.viewBox, p.codes.map(rot), p.home.map(rot), p.weight));
    const bv = b.panes.map((p) => key(p.viewBox, p.codes, p.home, p.weight));
    assert.deepEqual([...av].sort(), [...bv].sort(), `the partition moved under a relabel: ${codes.slice(0, 4)}…`);
    if (av.join() !== bv.join()) moved.push(codes.slice(0, 4).join('+'));
  }
  assert.deepEqual(moved, [], 'pane ORDER moved under an ISO relabel — the alphabet is still deciding');
});

// ---------------------------------------------------------------------------
// I19 — no frame is non-finite, and an index that cannot be drawn is stated rather than blanked.
// ---------------------------------------------------------------------------

/** A-54 Part 6's own injected faults, each of which used to give `viewBox: "NaN NaN NaN NaN"`. */
const MALFORMED_RINGS: Array<[string, number[][]]> = [
  ['rings: []', []],
  ['[[]]', [[]]],
  ['[[7]]', [[7]]],
  ['[[1,2,3]]', [[1, 2, 3]]],
  ['[[1, NaN]]', [[1, NaN]]],
];

test('A-54 I19: a code the index cannot draw reaches `missing` exactly once and never `countries`', () => {
  for (const [label, rings] of MALFORMED_RINGS) {
    const idx: core.CountryIndex = {
      scale: 'test', source: 'hand-written',
      countries: [{ code: 'QM', rings, box: [-4, -4, 6, 6] }],
    };
    const frame = worldMapFrame(statsOf([{ code: 'QM' }]), idx);
    assert.deepEqual(frame.missing, ['QM'], `${label}: the code must be stated, not blanked`);
    assert.deepEqual(frame.codes, [], `${label}: an undrawable code is not in codes`);
    assert.deepEqual(frame.countries, [], `${label}: an undrawable code paints nothing`);
  }
});

test('A-54 I19: no viewBox contains NaN and no aspect is non-finite, on a malformed index', () => {
  for (const [label, rings] of MALFORMED_RINGS) {
    // The single-code library — the whole surface for that user — and a mixed one, where the
    // frame still has real geometry to draw and the malformed code must not poison it.
    const idx: core.CountryIndex = {
      scale: 'test', source: 'hand-written',
      countries: [{ code: 'QM', rings, box: [-4, -4, 6, 6] }, entry('AA', [square(10, 40, 2)])],
    };
    for (const lib of [['QM'], ['QM', 'AA']]) {
      const frame = worldMapFrame(statsOf(lib.map((code) => ({ code }))), idx);
      assert.ok(!JSON.stringify(frame).includes('NaN'), `${label} · ${lib}: NaN reached the frame`);
      for (const p of frame.panes) {
        assert.ok(!p.viewBox.includes('NaN'), `${label} · ${lib}: ${p.id} viewBox is ${p.viewBox}`);
        assert.ok(Number.isFinite(p.aspect) && p.aspect > 0, `${label} · ${lib}: ${p.id} aspect is ${p.aspect}`);
        for (const v of [p.bounds.north, p.bounds.south, p.bounds.east, p.bounds.west, p.bounds.spanKm]) {
          assert.ok(Number.isFinite(v), `${label} · ${lib}: a bounds component is non-finite`);
        }
      }
      assert.ok(frame.missing.includes('QM'), `${label} · ${lib}: the code must still be stated`);
    }
  }
});

test('A-54 I19: an ALL-OR-STATED code — some rings drawable, one not — is stated, not half-drawn', () => {
  const idx: core.CountryIndex = {
    scale: 'test', source: 'hand-written',
    countries: [
      { code: 'QH', rings: [square(0, 0, 10)], box: [0, 0, 10, 10] },
      { code: 'QH', rings: [[1, 2, 3]], box: [1, 2, 3, 2] },
      entry('AA', [square(10, 40, 2)]),
    ],
  };
  const frame = worldMapFrame(statsOf([{ code: 'AA' }, { code: 'QH' }]), idx);
  assert.deepEqual(frame.missing, ['QH']);
  assert.deepEqual(frame.codes, ['AA'], 'never "the good rings" — R38-5 is what that costs');
  assert.ok(!JSON.stringify(frame).includes('NaN'));
});

test('A-54 I19 + I1: `countries` ∪ `missing` still accounts for every row, on a malformed index', () => {
  const idx: core.CountryIndex = {
    scale: 'test', source: 'hand-written',
    countries: [
      { code: 'QM', rings: [[7]], box: [-4, -4, 6, 6] },
      entry('AA', [square(10, 40, 2)]),
      entry('BB', [square(-30, -10, 4)]),
    ],
  };
  const rows = ['AA', 'BB', 'QM', 'ZZ'];
  const frame = worldMapFrame(statsOf(rows.map((code) => ({ code }))), idx);
  for (const code of rows) {
    const drawn = frame.countries.some((c) => c.code === code);
    const stated = frame.missing.filter((c) => c === code).length;
    assert.ok(drawn !== (stated === 1), `${code} is neither drawn nor stated exactly once`);
  }
  assert.deepEqual(frame.missing, ['QM', 'ZZ'], 'in canonical row order');
});

/**
 * **A-54 Part 4 / R39-4.** A-51 Part 5's *"every remaining >120° pane traces to five codes"* and
 * ROADMAP I-8i's set-equality criterion are both false as written. The true statement: of the 49
 * panes containing none of `AQ FJ KI RU UM`, **48 span more than 180°** — the planar-bounding-box
 * artefact of a trans-antimeridian pair — and **exactly one is an honest wide frame, `CA`+`GL` at
 * 128.8°**, which is two genuinely large neighbours and not a defect at all.
 */
test('A-54 Part 4 / R39-4: the >120° census over all 28,441 two-country libraries, re-derived', () => {
  const FIVE = new Set(['AQ', 'FJ', 'KI', 'RU', 'UM']);
  let wide = 0, withFive = 0, without = 0, over180 = 0;
  const honest: string[] = [];
  const histogram: Record<number, number> = {};
  for (let a = 0; a < ALL239.length; a++) for (let b = a + 1; b < ALL239.length; b++) {
    const frame = frameOf([ALL239[a], ALL239[b]]);
    histogram[frame.panes.length] = (histogram[frame.panes.length] ?? 0) + 1;
    for (const p of frame.panes) {
      const w = p.bounds.east - p.bounds.west;
      if (w <= 120) continue;
      wide++;
      if (p.codes.some((c) => FIVE.has(c))) { withFive++; continue; }
      without++;
      if (w > 180) over180++; else honest.push(`${p.codes.join('+')} ${w.toFixed(1)}`);
    }
  }
  assert.deepEqual({ wide, withFive, without, over180 }, { wide: 1236, withFive: 1187, without: 49, over180: 48 });
  assert.deepEqual(honest, ['CA+GL 128.8'], 'the one honest wide frame in 28,441 libraries');
  assert.deepEqual(histogram, { 1: 5564, 2: 22360, 3: 516, 4: 1 }, 'the pane-count histogram is unchanged');
});
