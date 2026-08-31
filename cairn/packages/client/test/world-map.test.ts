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
import * as core from '../src/deps.ts';
import { worldMapFrame } from '../src/selectors/worldMap.ts';

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

test('A-40 clause 2: the viewBox is derived from `bounds`, not from the raw path coordinates', () => {
  const frame = worldMapFrame(statsOf([{ code: 'AA' }]), FIXTURE);
  const b = frame.bounds;
  assert.equal(frame.viewBox, `${b.west} ${-b.north} ${b.east - b.west} ${b.north - b.south}`);
  assert.equal(frame.viewBox, '10 -42 2 2');
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
  assert.deepEqual(
    frame.countries.map((c) => [c.code, c.provisional]),
    [['AA', false], ['BB', true]],
  );
});

test('`tripIds` is carried verbatim, in canonical row order — it drives "tap for its trips"', () => {
  const frame = worldMapFrame(statsOf([{ code: 'AA', tripIds: ['b', 'a', 'c'] }]), FIXTURE);
  assert.deepEqual(frame.countries[0].tripIds, ['b', 'a', 'c']);
});

test('country rows keep the canonical stats order', () => {
  const frame = worldMapFrame(statsOf([{ code: 'CC' }, { code: 'AA' }, { code: 'BB' }]), FIXTURE);
  assert.deepEqual(frame.countries.map((c) => c.code), ['CC', 'AA', 'BB']);
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
