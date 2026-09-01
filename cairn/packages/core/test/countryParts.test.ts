/**
 * `countryParts` — ARCHITECTURE §4.4 **A-49** Part 2 (P), ROADMAP Phase 2 **I-8h**.
 *
 * A-48 gave the map two different answers to *"where is this country"*: C2′ decided **clustering**
 * from the country's principal ring, and C8 still fitted the **extent** over the union of every
 * index entry's box. So a pane that knew France was in France framed French Guiana anyway —
 * 81.1° × 49.1° and 1.95% land for a France-and-Greece library (QA R37-1).
 *
 * A-49 makes both answers the same rule at the same threshold. A country's geometry is its
 * **parts**: the connected components of its own rings' box centres under `clusterPoints` — the
 * one kernel (A-41 Part 6), at A-48 C3′'s connected-components semantics, with no second
 * implementation and **no distance function in `derive/country.ts`**.
 *
 * The load-bearing property is **I12**: the principal part's `key` *is* `countryKeyPoint`'s
 * answer, bit for bit, at every threshold — which is what makes A-48's C2′, I8, C4′, C5 and C6,
 * and every pane's *membership*, untouched rather than merely believed untouched.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { LatLng } from '../src/model/types.ts';
import type { CountryIndex, CountryEntry, CountryRing } from '../src/geo/countryIndex.ts';
import { COUNTRY_INDEX } from '../src/geo/countries.gen.ts';
import { countryKeyPoint, countryParts } from '../src/derive/country.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const IDX = COUNTRY_INDEX;
const CODES = [...new Set(IDX.countries.map((c) => c.code))].sort();

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

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

// ---------------------------------------------------------------------------
// Totality, and the two shapes of answer.
// ---------------------------------------------------------------------------

test('A-49 P: a code the index does not carry has NO parts — `[]`, never a guess', () => {
  assert.deepEqual(countryParts('ZZ', IDX, 4000), []);
  assert.deepEqual(countryParts('', IDX, 4000), []);
  assert.deepEqual(countryParts('france', IDX, 4000), []);
});

/**
 * **A-52 (QA R38-5) supersedes A-49 P's `ring.length >= 6` filter.** A ring the index carries is
 * a ring the frame draws. A skipped ring was dropped from `d` **and** from the part's `box`, so
 * the lost vertex sat outside the frame it was dropped from and nothing on screen hinted at it;
 * and A-49's I11 could not see it, because I11 compared `countryParts`' output to itself.
 *
 * A degenerate ring has zero spherical area, so the strict `>` in the principal-ring comparison
 * already keeps the earlier ring and a degenerate ring can never be principal. `countryParts`
 * returns `[]` **iff** the index carries no ring at all for the code, which is exactly when
 * `countryKeyPoint` returns `null` — so core's two functions stop disagreeing and
 * `worldMapFrame`'s `missing` test has one answer rather than two.
 */
test('A-52 / R38-5: a two-point ring is a part, not a silent drop — the frame draws what the index carries', () => {
  const idx = fixture([
    { code: 'ZM', rings: [square(10, 20, 2), [40, 20, 42, 20]], box: [10, 20, 42, 22] },
  ]);
  const parts = countryParts('ZM', idx, 100);
  assert.equal(parts.flatMap((p) => p.rings).length, 2, 'the two-point ring was dropped (the >= 6 filter)');
  const thin = parts.find((p) => p.rings.some((r) => r.length === 4));
  assert.ok(thin, 'the two-point ring reached no part at all');
  assert.equal(thin.principal, false, 'a zero-area ring can never be principal');
  assert.deepEqual([...thin.box], [40, 20, 42, 20], 'the ring contributes its own points to its part box');
});

test('A-52 / R38-5: `[]` means "the index carries no ring for this code", and nothing else', () => {
  const none = fixture([{ code: 'ZM', rings: [], box: [-4, -4, 6, 6] }]);
  assert.deepEqual(countryParts('ZM', none, 4000), [], 'no ring at all is still no part');
  // The only surviving `[]` shapes: no entry, and an entry with no rings.
  assert.deepEqual(countryParts('ZZ', none, 4000), []);
  // …and a code whose ONLY ring is degenerate is now drawable, so it is no longer `missing`.
  const thin = fixture([{ code: 'ZT', rings: [[10, 20, 12, 20]], box: [10, 20, 12, 20] }]);
  assert.equal(countryParts('ZT', thin, 4000).length, 1);
  assert.notEqual(countryKeyPoint('ZT', thin), null,
    'countryKeyPoint and countryParts must agree about whether the code exists');
});

test('A-49 P: every code the shipped index carries has at least one part', () => {
  for (const c of CODES) assert.ok(countryParts(c, IDX, 4000).length >= 1, `${c} has no parts`);
});

test('countryParts is pure — it mutates neither the index nor its rings', () => {
  const before = JSON.stringify(IDX.countries.slice(0, 5));
  countryParts('FR', IDX, 4000);
  countryParts('US', IDX, 4000);
  assert.equal(JSON.stringify(IDX.countries.slice(0, 5)), before);
  assert.deepEqual(countryParts('FR', IDX, 4000), countryParts('FR', IDX, 4000));
});

// ---------------------------------------------------------------------------
// The rule, on hand-written fixtures where the answer is checkable by eye.
// ---------------------------------------------------------------------------

test('A-49 P: rings within the threshold are ONE part; a distant ring is its own', () => {
  // An 8° mainland at 42…50°N plus a 2° territory 55° of longitude away.
  const idx = fixture([entry('ZF', [square(0, 42, 8), square(-54, 2, 2)])]);
  const parts = countryParts('ZF', idx, 4000);
  assert.equal(parts.length, 2);
  // Parts are returned in ascending order of their lowest ring position in the index.
  assert.deepEqual(parts[0].box, [0, 42, 8, 50]);
  assert.deepEqual(parts[1].box, [-54, 2, -52, 4]);
  assert.deepEqual(parts[0].key, { lat: 46, lng: 4 });
  assert.deepEqual(parts[1].key, { lat: 3, lng: -53 });
  assert.deepEqual(parts.map((p) => p.principal), [true, false]);
});

test('A-49 P: the SAME rings at a wide enough threshold are one part — the threshold is an argument', () => {
  const idx = fixture([entry('ZF', [square(0, 42, 8), square(-54, 2, 2)])]);
  assert.equal(countryParts('ZF', idx, 20000).length, 1);
  assert.deepEqual(countryParts('ZF', idx, 20000)[0].box, [-54, 2, 8, 50]);
  // …and at a tiny threshold every ring is its own part.
  assert.equal(countryParts('ZF', idx, 1).length, 2);
});

test('A-49 P: a part is a CONNECTED COMPONENT — a chain of near rings is one part', () => {
  // Three 1° squares, each ~330 km from the next but 660 km end to end.
  const idx = fixture([entry('ZC', [square(0, 0, 1), square(3, 0, 1), square(6, 0, 1)])]);
  assert.equal(countryParts('ZC', idx, 400).length, 1, 'single linkage chains, as C3′ says');
  assert.deepEqual(countryParts('ZC', idx, 400)[0].box, [0, 0, 7, 1]);
  assert.equal(countryParts('ZC', idx, 200).length, 3);
});

test('A-49 P: `rings` are the part\'s own rings, in index order, and they partition the code', () => {
  const idx = fixture([
    entry('ZG', [square(0, 0, 2), square(60, 0, 1)]),
    entry('ZG', [square(0.5, 0.5, 1)]),
  ]);
  const parts = countryParts('ZG', idx, 4000);
  assert.equal(parts.length, 2);
  assert.deepEqual(parts[0].rings, [idx.countries[0].rings[0], idx.countries[1].rings[0]]);
  assert.deepEqual(parts[1].rings, [idx.countries[0].rings[1]]);
});

test('A-49 P: exactly one part is `principal`, and it holds the code\'s greatest-area ring', () => {
  // The bigger landmass is the SECOND entry (A-27's union), so `principal` cannot be positional.
  const idx = fixture([
    entry('ZH', [square(100, 0, 1)]),
    entry('ZH', [square(-10, 50, 6)]),
  ]);
  const parts = countryParts('ZH', idx, 4000);
  assert.equal(parts.filter((p) => p.principal).length, 1);
  assert.equal(parts[0].principal, false, 'the 1° island is not the principal part');
  assert.equal(parts[1].principal, true);
  assert.deepEqual(parts[1].key, countryKeyPoint('ZH', idx));
});

test('A-49 P: area is SPHERICAL — an equal-degree square nearer the pole is not the principal part', () => {
  const idx = fixture([entry('ZJ', [square(0, 60, 10), square(40, 0, 10)])]);
  const parts = countryParts('ZJ', idx, 1000);
  assert.equal(parts.length, 2);
  assert.deepEqual(parts.map((p) => p.principal), [false, true]);
  assert.deepEqual(parts[1].key, { lat: 5, lng: 45 });
});

test('A-49 P: a hole rides with the ring that contains it and never becomes the principal part', () => {
  const outer = square(0, 0, 10);
  const hole = square(4, 4, 2);
  const idx = fixture([entry('ZK', [outer, hole])]);
  const parts = countryParts('ZK', idx, 4000);
  assert.equal(parts.length, 1, 'a hole is inside its outer ring, so it is never a separate part');
  assert.deepEqual(parts[0].key, { lat: 5, lng: 5 });
  assert.equal(parts[0].principal, true);
});

test('A-49 P: `box` is the union of the part\'s own rings, never of the whole code', () => {
  const idx = fixture([entry('ZB', [square(0, 0, 4), square(80, 0, 2)])]);
  const parts = countryParts('ZB', idx, 4000);
  assert.deepEqual(parts[0].box, [0, 0, 4, 4]);
  assert.deepEqual(parts[1].box, [80, 0, 82, 2]);
  // The union-box — what C8 fitted — is 82° wide, and that is the defect A-49 exists to remove.
  assert.equal(idx.countries[0].box[2] - idx.countries[0].box[0], 82);
});

// ---------------------------------------------------------------------------
// I12 — the key point is preserved bit-for-bit. A-49 Part 8.
// ---------------------------------------------------------------------------

/**
 * **R38-1 widens this sweep from five thresholds to eight, `900` among them.** Round 38's
 * finding was that a five-point sample was asserting a property of the whole index; `900` is the
 * threshold at which `ID` splits three ways and the two candidate ranking rules disagree, so it
 * is the one that turns I12's own injected fault red (below) rather than leaving it vacuous.
 */
test('A-49 I12 / R38-1: the principal part\'s key IS countryKeyPoint, 239 codes × 8 thresholds, 0 mismatches', () => {
  assert.equal(CODES.length, 239, 'the shipped index no longer carries 239 codes');
  let checked = 0;
  const mismatches: string[] = [];
  for (const t of [1, 100, 500, 900, 1000, 4000, 12000, 20000]) {
    for (const code of CODES) {
      const principal = countryParts(code, IDX, t).find((p) => p.principal);
      const key = countryKeyPoint(code, IDX) as LatLng;
      checked++;
      if (!principal || !Object.is(principal.key.lat, key.lat) || !Object.is(principal.key.lng, key.lng)) {
        mismatches.push(`${code}@${t}`);
      }
    }
  }
  assert.equal(checked, 239 * 8);
  assert.deepEqual(mismatches, [], `${mismatches.length} codes disagree with countryKeyPoint`);
});

/** The standard closed-form spherical ring area, recomputed independently of the module. */
function ringArea(ring: CountryRing): number {
  const R = 6371, D = Math.PI / 180;
  const n = ring.length;
  if (n < 6) return 0;
  let sum = 0;
  for (let i = 0; i + 1 < n; i += 2) {
    const j = (i + 2) % n;
    sum += (ring[j] - ring[i]) * D * (2 + Math.sin(ring[i + 1] * D) + Math.sin(ring[j + 1] * D));
  }
  return Math.abs((sum * R * R) / 2);
}

/**
 * **The injected fault, run as a differential.** The plausible mis-implementation of `key` is
 * *"the centre of the part's own box"* — which is A-41 C2's rule one level down, and it is
 * wrong for the same reason: a part with two rings has a box that is not where either of them
 * is. `FR`'s principal part is metropolitan France **plus Corsica**, so the two answers differ
 * and I12 goes red.
 */
test('the injected fault: keying a part off its own BOX rather than its greatest ring breaks I12', () => {
  const parts = countryParts('FR', IDX, 4000);
  const metro = parts.find((p) => p.principal) as { box: readonly number[]; key: LatLng; rings: readonly unknown[] };
  assert.equal(metro.rings.length, 2, 'the principal part is metropolitan France PLUS Corsica');
  const boxCentre = { lat: (metro.box[1] + metro.box[3]) / 2, lng: (metro.box[0] + metro.box[2]) / 2 };
  assert.deepEqual(metro.key, countryKeyPoint('FR', IDX), 'the shipped rule agrees with C2′');
  assert.notDeepEqual(boxCentre, metro.key, 'the box-centre rule must be observably different');
  assert.equal(round4(boxCentre.lat), 46.2643);
  assert.equal(round4(boxCentre.lng), 2.4839);
});

/**
 * **A-49's own named injected fault IS reachable, and this is the test that makes it red —
 * QA R38-1.** KD-71 claimed *"the two rankings choose the same part every time"* and asserted it
 * as `differ === []` over `{1, 100, 1000, 4000, 20000}` km. Round 38 swept 32 thresholds and
 * found **seven** (code, threshold) pairs where they disagree; the sharpest is **`ID`@900 km**,
 * where the greatest-ring rule picks Borneo (533,066 km² summed) and the summed-area rule picks
 * the 11-ring Papua/Sulawesi/Maluku part (852,459 km²) — **2,481 km apart**. KD-71's claim was
 * true only of `US` and only at 4,000 km, which is why it read as vacuous.
 *
 * **The one-line fix is `900` in the threshold list**, and the assertion flips: A-49's ruling
 * *"rank parts by summed area instead of by their greatest ring and the key moves"* is the fault,
 * it is red, and `ID` is what names it. No behaviour follows at 4,000 km — the frame's only
 * caller — where `FR`/`UM`/`US` are the only multi-part codes and all three agree; what this
 * buys is a tripwire that can actually fail if the index is ever regenerated.
 */
test('R38-1: A-49\'s "rank by summed area" injected fault is REACHABLE, and ID@900 is what names it', () => {
  const differ: string[] = [];
  for (const t of [1, 100, 900, 1000, 4000, 20000]) {
    for (const code of CODES) {
      const parts = countryParts(code, IDX, t);
      if (parts.length < 2) continue;
      const summed = parts.map((p) => p.rings.reduce((n, r) => n + ringArea(r), 0));
      let best = 0;
      for (let i = 1; i < parts.length; i++) if (summed[i] > summed[best]) best = i;
      if (!parts[best].principal) differ.push(`${code}@${t}`);
    }
  }
  assert.deepEqual(differ, ['ID@900'],
    'the summed-area fault stopped being reachable at the thresholds this test samples');
  // The two keys the fault moves between, so the red is a measurement rather than a label.
  const id = countryParts('ID', IDX, 900);
  const idSummed = id.map((p) => p.rings.reduce((n, r) => n + ringArea(r), 0));
  const principal = id.findIndex((p) => p.principal);
  let best = 0;
  for (let i = 1; i < id.length; i++) if (idSummed[i] > idSummed[best]) best = i;
  assert.notEqual(principal, best, 'ID@900 no longer distinguishes the two rankings');
  assert.equal(round4(id[principal].key.lat), 0.0998, 'the greatest-ring rule keys off Borneo');
  assert.equal(round4(id[best].key.lat), -4.7437, 'the summed-area rule keys off Papua/Sulawesi/Maluku');
  assert.equal(Math.round(idSummed[principal]), 533066);
  assert.equal(Math.round(idSummed[best]), 852459);
  // `US` at 4,000 km — the case A-49's wording named, where the two rankings DO agree. This is
  // what KD-71 generalised from, and it is kept so the correction is legible rather than erased.
  const us = countryParts('US', IDX, 4000);
  const summed = us.map((p) => p.rings.reduce((n, r) => n + ringArea(r), 0));
  assert.equal(Math.round(summed[0]), 7976690, 'CONUS');
  assert.equal(Math.round(summed[1]), 1516703, 'Alaska + Hawaii + the Aleutians');
  assert.ok(summed[0] > summed[1]);
});

// ---------------------------------------------------------------------------
// I11's half that lives in core — nothing is lost, and nothing is duplicated.
// ---------------------------------------------------------------------------

test('A-49 I11 (core half): a code\'s parts partition its ring set exactly, over all 239 codes', () => {
  for (const code of CODES) {
    const own: CountryRing[] = [];
    for (const e of IDX.countries) if (e.code === code) for (const r of e.rings) own.push(r);
    const fromParts = countryParts(code, IDX, 4000).flatMap((p) => p.rings);
    assert.equal(fromParts.length, own.length, `${code}: ring count changed`);
    // Identity, not equality — the parts carry the index's own ring objects, not copies.
    assert.deepEqual(new Set(fromParts).size, fromParts.length, `${code}: a ring is in two parts`);
    for (const r of own) assert.ok(fromParts.includes(r), `${code}: a ring is in no part`);
  }
});

// ---------------------------------------------------------------------------
// The shipped index, measured. A-49 Part 6 and Part 7.
// ---------------------------------------------------------------------------

test('A-49 Part 6: exactly 3 of 239 codes have more than one part at 4,000 km — UM, FR, US', () => {
  const multi = CODES.filter((c) => countryParts(c, IDX, 4000).length > 1);
  assert.deepEqual(multi, ['FR', 'UM', 'US']);
  assert.equal(CODES.reduce((n, c) => n + countryParts(c, IDX, 4000).length, 0), 242,
    'the 239-code ceiling is 242 parts');
});

test('A-49 Part 7: FR is metropolitan France + Corsica, and French Guiana on its own', () => {
  const parts = countryParts('FR', IDX, 4000);
  assert.equal(parts.length, 2);
  const guiana = parts.find((p) => !p.principal) as { box: readonly number[] };
  const metro = parts.find((p) => p.principal) as { box: readonly number[] };
  assert.equal(round4(metro.box[2] - metro.box[0]), 14.1523, 'metropolitan France is 14.15° wide');
  assert.equal(round4(metro.box[3] - metro.box[1]), 9.7685);
  assert.equal(round4(guiana.box[2] - guiana.box[0]), 2.867, 'French Guiana is 2.87° wide');
  assert.equal(round4(guiana.box[3] - guiana.box[1]), 3.7031);
  // The union box C8 fitted — the whole defect, in one number.
  const union = IDX.countries.filter((e) => e.code === 'FR');
  const west = Math.min(...union.map((e) => e.box[0]));
  const east = Math.max(...union.map((e) => e.box[2]));
  assert.equal(round4(east - west), 64.0848);
});

test('A-49 Part 7: US is CONUS + a 1.5 M km² detached part — Alaska is not a special case', () => {
  const parts = countryParts('US', IDX, 4000);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].principal, true);
  assert.equal(round4(parts[0].box[2] - parts[0].box[0]), 57.7225, 'CONUS is 57.72° wide');
  assert.equal(round4(parts[0].box[3] - parts[0].box[1]), 24.3091);
  assert.equal(round4(parts[1].box[2] - parts[1].box[0]), 41.8111, 'Alaska/Hawaii/the Aleutians');
  assert.equal(round4(parts[1].box[3] - parts[1].box[1]), 52.4416);
  assert.equal(parts[1].rings.length, 9);
});

// ---------------------------------------------------------------------------
// R37-5 — the union-box fallback stops returning a coordinate that is not one.
// ---------------------------------------------------------------------------

test('R37-5: a code whose entries carry ZERO rings has no key point — `null`, not NaN', () => {
  // `countryIndex()` derives `[Infinity, Infinity, -Infinity, -Infinity]` for an entry with no
  // rings, and the union-box fallback used to average those into `{lat: NaN, lng: NaN}`.
  const idx = fixture([{ code: 'ZP', rings: [], box: [Infinity, Infinity, -Infinity, -Infinity] }]);
  assert.equal(countryKeyPoint('ZP', idx), null);
  assert.deepEqual(countryParts('ZP', idx, 4000), []);
});

test('R37-5: a finite box with no ring of three points still answers — the fallback is not removed', () => {
  const idx = fixture([{ code: 'ZN', rings: [], box: [-4, -4, 6, 6] }]);
  assert.deepEqual(countryKeyPoint('ZN', idx), { lat: 1, lng: 1 });
});

// ---------------------------------------------------------------------------
// The standing guard on `derive/country.ts` — A-49 Part 9 extends it, never weakens it.
// ---------------------------------------------------------------------------

test('A-49 Part 9: still no distance function in `derive/country.ts`, and the area helper is private', () => {
  const src = readFileSync(resolve(HERE, '..', 'src', 'derive', 'country.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  for (const banned of ['haversine', 'Math.asin', 'Math.atan2', 'nearest', 'closest']) {
    assert.ok(!src.includes(banned), `a distance function reached derive/country.ts: ${banned}`);
  }
  assert.match(src, /clusterPoints/, 'the linkage must be the ONE kernel, imported, not re-written');
  const exported = [...src.matchAll(/export function (\w+)/g)].map((m) => m[1]).sort();
  assert.deepEqual(exported, ['countryKeyPoint', 'countryOf', 'countryParts'],
    'the ring-area helper must stay module-private');
});
