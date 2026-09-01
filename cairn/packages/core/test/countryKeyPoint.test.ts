/**
 * `countryKeyPoint` — ARCHITECTURE §4.4 **A-48** Part 2 (C2′), ROADMAP Phase 2 **I-8g**.
 *
 * A-41 C2 keyed a country's cluster off the centre of the **union of its index boxes**, which
 * is a point about a *rectangle*: QA R36-1 measured `FR`'s key 2,633 km out in the Atlantic
 * (metropolitan France ∪ French Guiana is a 64.08°-wide box), which made France nearer to
 * Morocco (1,339 km) than to Czechia (4,137 km) and framed a French traveller's map on the
 * open ocean.
 *
 * C2′ replaces it: the key point is the bounding-box centre of the code's **principal ring** —
 * the ring of greatest absolute spherical area across all of that code's index entries, ties
 * by index order — with the union-box centre only as a fallback for a code carrying no ring of
 * three points (zero of the 239 shipped codes; it exists to make the function total).
 *
 * The numbers below are A-48's own measurements over the shipped index, re-derived here rather
 * than quoted: they are the acceptance criterion, and the injected fault A-48 names (key off
 * the union of the boxes again) puts the worst displacement back at 16,598 km.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { LatLng } from '../src/model/types.ts';
import type { CountryIndex, CountryEntry, CountryRing } from '../src/geo/countryIndex.ts';
import { COUNTRY_INDEX } from '../src/geo/countries.gen.ts';
import { countryKeyPoint } from '../src/derive/country.ts';
import { haversine } from '../src/derive/geo.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

const IDX = COUNTRY_INDEX;
const CODES = [...new Set(IDX.countries.map((c) => c.code))].sort();

/** Every vertex of every ring the code carries, as points. */
function ownVertices(code: string): LatLng[] {
  const out: LatLng[] = [];
  for (const e of IDX.countries) {
    if (e.code !== code) continue;
    for (const r of e.rings) for (let i = 0; i + 1 < r.length; i += 2) out.push({ lat: r[i + 1], lng: r[i] });
  }
  return out;
}

/**
 * How far a key point is from its own country: the great-circle distance to the nearest vertex
 * of that code's geometry, and **zero when the point is inside its own rings** (ROADMAP I-8g's
 * criterion 1, verbatim). `RU`'s key is 873 km from the nearest boundary vertex and sits in the
 * Siberian interior, so it scores 0.
 */
function displacement(code: string, key: LatLng): number {
  return inOwnRings(code, key) ? 0 : nearestOwnVertexKm(code, key);
}

/** Distance to the nearest vertex of the code's own geometry, whether or not the key is inside. */
function nearestOwnVertexKm(code: string, key: LatLng): number {
  let m = Infinity;
  for (const v of ownVertices(code)) {
    const d = haversine(key, v);
    if (d < m) m = d;
  }
  return m;
}

/** Even-odd crossing test over one flat `[lng, lat, …]` ring — the test's own copy. */
function inRing(p: LatLng, ring: CountryRing): boolean {
  const n = ring.length;
  if (n < 6) return false;
  let inside = false;
  let jx = ring[n - 2];
  let jy = ring[n - 1];
  for (let i = 0; i + 1 < n; i += 2) {
    const ix = ring[i];
    const iy = ring[i + 1];
    if (iy > p.lat !== jy > p.lat) {
      const x = ((jx - ix) * (p.lat - iy)) / (jy - iy) + ix;
      if (p.lng < x) inside = !inside;
    }
    jx = ix;
    jy = iy;
  }
  return inside;
}

/** Is the point inside the code's own geometry (odd crossings over all its rings)? */
function inOwnRings(code: string, p: LatLng): boolean {
  let inside = false;
  for (const e of IDX.countries) {
    if (e.code !== code) continue;
    for (const r of e.rings) if (inRing(p, r)) inside = !inside;
  }
  return inside;
}

/** A-41 C2, the superseded rule — kept here as the injected fault's oracle. */
function unionBoxCentre(code: string): LatLng | null {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  let seen = false;
  for (const entry of IDX.countries) {
    if (entry.code !== code) continue;
    seen = true;
    w = Math.min(w, entry.box[0]); s = Math.min(s, entry.box[1]);
    e = Math.max(e, entry.box[2]); n = Math.max(n, entry.box[3]);
  }
  return seen ? { lat: (s + n) / 2, lng: (w + e) / 2 } : null;
}

const key = (code: string): LatLng => {
  const k = countryKeyPoint(code, IDX);
  assert.ok(k !== null, `${code} has no key point`);
  return k;
};

// ---------------------------------------------------------------------------
// Totality and the two shapes of answer.
// ---------------------------------------------------------------------------

test('A-48 C2′: a code the index does not carry has no key point — `null`, never a guess', () => {
  assert.equal(countryKeyPoint('ZZ', IDX), null);
  assert.equal(countryKeyPoint('', IDX), null);
  assert.equal(countryKeyPoint('france', IDX), null);
});

test('A-48 C2′: every code the index carries has a key point', () => {
  for (const c of CODES) assert.ok(countryKeyPoint(c, IDX) !== null, `${c} returned null`);
});

test('countryKeyPoint is pure — it mutates neither the index nor its rings', () => {
  const before = JSON.stringify(IDX.countries.slice(0, 5));
  countryKeyPoint('FR', IDX);
  countryKeyPoint('AT', IDX);
  assert.equal(JSON.stringify(IDX.countries.slice(0, 5)), before);
  assert.deepEqual(countryKeyPoint('FR', IDX), countryKeyPoint('FR', IDX));
});

// ---------------------------------------------------------------------------
// I8 — the key point is a point of the country. A-48 Part 7.
// ---------------------------------------------------------------------------

/** The principal ring, recomputed independently of the implementation. */
function principalRing(code: string): CountryRing | null {
  const R = 6371;
  const D = Math.PI / 180;
  const area = (ring: CountryRing): number => {
    const n = ring.length;
    if (n < 6) return 0;
    let sum = 0;
    for (let i = 0; i + 1 < n; i += 2) {
      const j = (i + 2) % n;
      sum += (ring[j] - ring[i]) * D * (2 + Math.sin(ring[i + 1] * D) + Math.sin(ring[j + 1] * D));
    }
    return Math.abs((sum * R * R) / 2);
  };
  let best: CountryRing | null = null;
  let bestArea = -1;
  for (const e of IDX.countries) {
    if (e.code !== code) continue;
    for (const r of e.rings) {
      if (r.length < 6) continue;
      const a = area(r);
      if (a > bestArea) { bestArea = a; best = r; }
    }
  }
  return best;
}

test('A-48 I8: every key point lies within the bounding box of its own principal ring', () => {
  for (const c of CODES) {
    const ring = principalRing(c);
    assert.ok(ring !== null, `${c} has no ring of three points — the shipped index has none`);
    const lngs: number[] = [];
    const lats: number[] = [];
    for (let i = 0; i + 1 < ring.length; i += 2) { lngs.push(ring[i]); lats.push(ring[i + 1]); }
    const k = key(c);
    assert.ok(k.lng >= Math.min(...lngs) && k.lng <= Math.max(...lngs), `${c} key lng outside its principal ring`);
    assert.ok(k.lat >= Math.min(...lats) && k.lat <= Math.max(...lats), `${c} key lat outside its principal ring`);
  }
});

test('A-48 Part 2, measured: the worst key point is 203 km from its own country (NO), and none exceeds 250', () => {
  let worst = { code: '', km: -1 };
  for (const c of CODES) {
    const d = displacement(c, key(c));
    if (d > worst.km) worst = { code: c, km: d };
  }
  assert.equal(worst.code, 'NO', `the worst displacement is ${worst.code} at ${worst.km.toFixed(0)} km, not NO`);
  assert.equal(Math.round(worst.km), 203, `NO is ${worst.km.toFixed(1)} km out`);
  assert.ok(worst.km <= 250, 'A-48 Part 2 / ROADMAP I-8g: no key point may be more than 250 km from its country');
});

test('A-48 Part 2, measured: 176 of 239 key points fall INSIDE their own rings', () => {
  const inside = CODES.filter((c) => inOwnRings(c, key(c)));
  assert.equal(CODES.length, 239, 'the shipped index no longer carries 239 codes');
  assert.equal(inside.length, 176, `${inside.length} of ${CODES.length} keys are inside their own rings`);
});

/**
 * A-48 Part 2's table, reproduced with its two metrics kept apart — the doc's row prints
 * `KI 3 · FJ 37 · UM 1 · SH 4` as **nearest-vertex** distances and `FR 0 · RU 0` under the
 * criterion's *"zero when the point is inside its own rings"* rule, and both halves are true of
 * the same six keys. The four that are not inside a ring are within 37 km of their own coast;
 * the two that were 2,633 km and 1,358 km out under C2 are now on their own ground.
 */
test('A-48 Part 2: the six worst keys under C2 are all on their own ground under C2′', () => {
  const nearestVertex = Object.fromEntries(
    ['KI', 'FJ', 'UM', 'SH'].map((c) => [c, Math.round(nearestOwnVertexKm(c, key(c)))]),
  );
  assert.deepEqual(nearestVertex, { KI: 3, FJ: 37, UM: 1, SH: 4 });
  assert.ok(inOwnRings('FR', key('FR')), 'FR was 2,633 km out under C2 and must now be inside France');
  assert.ok(inOwnRings('RU', key('RU')), 'RU was 1,358 km out under C2 and must now be inside Russia');
  assert.equal(Math.round(nearestOwnVertexKm('RU', key('RU'))), 873, "RU's key is in the Siberian interior");
  assert.equal(displacement('FR', key('FR')), 0);
  assert.equal(displacement('RU', key('RU')), 0);
});

/**
 * The injected fault A-48's criterion names, run as a differential rather than described:
 * key off the union of the code's boxes — A-41 C2, exactly — and the worst displacement is
 * `KI` at 16,598 km. If this ever agrees with the rule above, C2′ was not implemented.
 */
test('the injected fault: A-41 C2 (union-box centres) puts the worst key 16,598 km out, at KI', () => {
  let worst = { code: '', km: -1 };
  for (const c of CODES) {
    const u = unionBoxCentre(c);
    assert.ok(u !== null);
    const d = displacement(c, u);
    if (d > worst.km) worst = { code: c, km: d };
  }
  assert.equal(worst.code, 'KI');
  assert.equal(Math.round(worst.km), 16598);
});

// ---------------------------------------------------------------------------
// R36-1, the finding itself: France, and the inversion of near and far.
// ---------------------------------------------------------------------------

test('R36-1: FR keys at 46.75°N 1.75°E — inside France, not 2,633 km out in the Atlantic', () => {
  const k = key('FR');
  assert.equal(Math.round(k.lat * 100) / 100, 46.75);
  assert.equal(Math.round(k.lng * 100) / 100, 1.75);
  assert.ok(inOwnRings('FR', k), 'the key point is not inside France');
  // A-41 C2's answer, for contrast: 26.60°N, 22.48°W.
  const u = unionBoxCentre('FR');
  assert.equal(Math.round((u as LatLng).lat * 100) / 100, 26.6);
  assert.equal(Math.round((u as LatLng).lng * 100) / 100, -22.48);
});

test('R36-1: near and far are no longer inverted — FR–DE 804, FR–CZ 1,075, FR–MA 2,227 km', () => {
  const km = (a: string, b: string) => Math.round(haversine(key(a), key(b)));
  assert.equal(km('FR', 'DE'), 804);
  assert.equal(km('FR', 'CZ'), 1075);
  assert.equal(km('FR', 'MA'), 2227);
  assert.ok(km('FR', 'DE') < km('FR', 'MA'), 'Germany must be nearer to France than Morocco is');
  assert.ok(km('FR', 'CZ') < km('FR', 'MA'), 'Czechia must be nearer to France than Morocco is');
});

test('A-48 C4′: the threshold outcomes it is chosen for, re-derived under C2′', () => {
  const km = (a: string, b: string) => Math.round(haversine(key(a), key(b)));
  // Separates (≥ 4,000 km).
  assert.deepEqual(
    [km('US', 'IS'), km('AU', 'JP'), km('US', 'GB'), km('US', 'BR'), km('GB', 'JP')],
    [5707, 6793, 6946, 7182, 9175],
  );
  // Merges (< 4,000 km).
  assert.deepEqual(
    [km('US', 'MX'), km('GB', 'GR'), km('GB', 'MA'), km('ES', 'FI'), km('PT', 'FI')],
    [1622, 2555, 2912, 3365, 3569],
  );
});

test('A-48 Part 2: 75 of 239 keys move at all, and only 35 move more than 100 km', () => {
  let moved = 0;
  let far = 0;
  for (const c of CODES) {
    const k = key(c);
    const u = unionBoxCentre(c) as LatLng;
    if (k.lat !== u.lat || k.lng !== u.lng) {
      moved++;
      if (haversine(k, u) > 100) far++;
    }
  }
  assert.equal(moved, 75);
  assert.equal(far, 35);
});

// ---------------------------------------------------------------------------
// The rule itself, on hand-written fixtures where the answer is checkable by eye.
// ---------------------------------------------------------------------------

/** A closed square ring, `[lng, lat, …]`, anticlockwise from the SW corner. */
const square = (lng: number, lat: number, size: number): number[] => [
  lng, lat, lng + size, lat, lng + size, lat + size, lng, lat + size,
];

function entry(code: string, rings: number[][]): CountryEntry {
  const lngs = rings.flatMap((r) => r.filter((_, i) => i % 2 === 0));
  const lats = rings.flatMap((r) => r.filter((_, i) => i % 2 === 1));
  return {
    code,
    rings,
    box: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
  };
}

const fixture = (countries: CountryEntry[]): CountryIndex =>
  ({ scale: 'test', source: 'hand-written', countries });

test('C2′: a mainland plus a small distant territory keys off the MAINLAND — the FR shape', () => {
  // 8° of mainland at 45°N, plus a 2° territory 55° away: A-41 C2 keys at the midpoint of the
  // two, which is in neither.
  const idx = fixture([entry('ZF', [square(0, 42, 8), square(-54, 2, 2)])]);
  assert.deepEqual(countryKeyPoint('ZF', idx), { lat: 46, lng: 4 });
});

test('C2′: the principal ring may live on the SECOND entry of a two-entry code (A-27 union)', () => {
  const idx = fixture([
    entry('ZG', [square(100, 0, 1)]),
    entry('ZG', [square(-10, 50, 6)]),
  ]);
  assert.deepEqual(countryKeyPoint('ZG', idx), { lat: 53, lng: -7 });
});

test('C2′: ties break by index order — entry order first, then ring order', () => {
  // Two identical squares at the same latitude have identical spherical area.
  const idx = fixture([entry('ZH', [square(0, 10, 2), square(60, 10, 2)])]);
  assert.deepEqual(countryKeyPoint('ZH', idx), { lat: 11, lng: 1 }, 'the first ring wins a tie');
  const idx2 = fixture([entry('ZI', [square(0, 10, 2)]), entry('ZI', [square(60, 10, 2)])]);
  assert.deepEqual(countryKeyPoint('ZI', idx2), { lat: 11, lng: 1 }, 'the first entry wins a tie');
});

test('C2′: area is SPHERICAL — a square nearer the pole loses to an equal-degree square at the equator', () => {
  const idx = fixture([entry('ZJ', [square(0, 60, 10), square(40, 0, 10)])]);
  // Same 10° × 10° in degrees; the equatorial one covers far more of the sphere.
  assert.deepEqual(countryKeyPoint('ZJ', idx), { lat: 5, lng: 45 });
});

test('C2′: a hole can never be the principal ring — it is strictly inside its own outer ring', () => {
  const outer = square(0, 0, 10);
  const hole = square(4, 4, 2);
  const idx = fixture([entry('ZK', [outer, hole])]);
  assert.deepEqual(countryKeyPoint('ZK', idx), { lat: 5, lng: 5 });
  // …and the winding order is not trusted: reverse the hole and the answer is the same.
  const reversed: number[] = [];
  for (let i = hole.length - 2; i >= 0; i -= 2) reversed.push(hole[i], hole[i + 1]);
  const idx2 = fixture([entry('ZL', [outer, reversed])]);
  assert.deepEqual(countryKeyPoint('ZL', idx2), { lat: 5, lng: 5 });
});

test('C2′ fallback: a code with no ring of three points keys off the UNION box (0 shipped codes)', () => {
  const idx = fixture([
    { code: 'ZM', rings: [[10, 20, 12, 20]], box: [10, 20, 12, 20] },      // a 2-point ring
    { code: 'ZM', rings: [[100, -5]], box: [100, -5, 100, -5] },           // a 1-point ring
  ]);
  assert.deepEqual(countryKeyPoint('ZM', idx), { lat: 7.5, lng: 55 });
});

test('C2′ fallback: an entry with no rings at all still answers, from its box', () => {
  const idx = fixture([{ code: 'ZN', rings: [], box: [-4, -4, 6, 6] }]);
  assert.deepEqual(countryKeyPoint('ZN', idx), { lat: 1, lng: 1 });
});

test('C2′: a code whose only ring has three points is a real ring, not a fallback', () => {
  const idx = fixture([entry('ZO', [[0, 0, 4, 0, 0, 3]]), entry('ZO', [[100, 80, 100.1, 80]])]);
  assert.deepEqual(countryKeyPoint('ZO', idx), { lat: 1.5, lng: 2 });
});

// ---------------------------------------------------------------------------
// The standing guard on `derive/country.ts` — A-48 Part 2 extends it, never weakens it.
// ---------------------------------------------------------------------------

test('A-48 Part 2: `derive/country.ts` still holds no distance function, and the area helper is private', () => {
  const src = readFileSync(resolve(HERE, '..', 'src', 'derive', 'country.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  for (const banned of ['haversine', 'Math.asin', 'Math.atan2', 'nearest', 'closest']) {
    assert.ok(!src.includes(banned), `a distance function reached derive/country.ts: ${banned}`);
  }
  const exported = [...src.matchAll(/export function (\w+)/g)].map((m) => m[1]).sort();
  // `countryParts` joins at I-8h under §4.4 A-49 Part 9, on the same terms; the ring-area and
  // ring-box helpers stay module-private.
  assert.deepEqual(exported, ['countryKeyPoint', 'countryOf', 'countryParts'],
    'a geometry helper escaped derive/country.ts');
});
