/**
 * **ROADMAP Phase 2 exit criterion 4 part (e)** — the forgiveness filters, exercised directly.
 *
 * ARCHITECTURE §8.4 **A-28** states one predicate and three filters — filter 1, and filter 2's two
 * arms — and the criterion asks for **three injected faults**: remove filter 1 and Vatican City
 * gains the 1:50m polygon that lies about a kilometre west of the state; remove *both* arms of
 * filter 2 and `AD`, `HK`, `LI`, `MC`, `MO`, `SG`, `SM`, `SX` gain forgiveness entries; and remove
 * **arm 2b alone** and `MO` alone gains one, with a street in Zhuhai attributing to Macao. A test
 * that only reads the shipped artefact cannot inject any of them, so this file imports the
 * generator's own filter module — `tools/forgiveness.mjs`, which exists as a separate file for
 * exactly this reason — and runs it with each filter switched off.
 *
 * **What the fixture is, and what it is not.** The candidate rings the filters *rejected* are, by
 * definition, not in `countries.gen.ts`; they cannot be recovered from the shipped index. So
 * `gen-countries.mjs` writes every rejected candidate ring to
 * `fixtures/golden/forgiveness-drops.json` in the same run that emits the module — a generated
 * artefact, never hand-typed, exactly as I-5's dependency clause requires of every polygon in this
 * repository. Everything *else* arm **2a** needs — the code's own coverage rings, and every other
 * entry's rings — is read out of the committed `COUNTRY_INDEX`, so this file cannot drift from the
 * artefact it is asserting about.
 *
 * **Arm 2b is the exception, and it is a deliberate one.** Its population is every other ISO code
 * at the pinned family's *finest* scale — 13 MB of GeoJSON that this repository must never commit
 * a copy of, and 1.2 MB of polygon even reduced to the neighbour rings whose bounding boxes meet a
 * candidate. So the tests below run the shipped configuration as `{ filter2b: false }` — which
 * reproduces every decision except the one arm 2b makes — and the *third source* is carried into
 * the suite a different way: `forgiveness-drops.json` records the finest layer's own **answer** at
 * deterministic probe points inside every admitted ring and every refused one, and the tests
 * re-check both that each probe really lies inside the ring it is recorded against and that no
 * admitted ring's ground is another country's. That is criterion 4(e)'s comparison against a third
 * source, and it is the one check in this file that is not the index measured against itself.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { COUNTRY_INDEX, countryOf } from '../packages/core/src/index.ts';
import type { CountryEntry, CountryIndex } from '../packages/core/src/index.ts';
import { forgivenessFor, overlapsRings, prepRing, prepSet, overlaps } from '../tools/forgiveness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

type Probe = [number, number, string | null];
type Drops = {
  candidateScales: string[];
  candidates: number;
  kept: number;
  dropped: number;
  entries: number;
  codes: string[];
  refusedCodes: string[];
  noCandidates: string[];
  forgivenessAt: number[];
  drops: Array<{
    code: string;
    scale: string;
    filter: 1 | 2;
    against: 'coverage' | 'finest' | null;
    takenFrom: string | null;
    ring: number[];
  }>;
  thirdSource: {
    scale: string;
    checkedRings: number;
    unprobedRings: number;
    admitted: Array<{ entry: number; ring: number; code: string; points: Probe[] }>;
    dropped: Array<{
      drop: number;
      code: string;
      filter: 1 | 2;
      against: 'coverage' | 'finest' | null;
      takenFrom: string | null;
      points: Probe[];
    }>;
  };
};

const DROPS: Drops = JSON.parse(
  readFileSync(resolve(CAIRN, 'fixtures', 'golden', 'forgiveness-drops.json'), 'utf8'),
);

/** Every entry of the shipped index carrying this ISO code. A filled code may carry two. */
const entriesFor = (code: string) => COUNTRY_INDEX.countries.filter((c) => c.code === code);
/** Every other entry, as the filters take them. */
const othersOf = (code: string) =>
  COUNTRY_INDEX.countries.filter((c) => c.code !== code).map((c) => ({ code: c.code, rings: c.rings }));

/**
 * The shipped filter configuration minus arm 2b — see the header. Every drop the fixture records
 * against `'coverage'` or filter 1 must reproduce exactly under this; `MO`'s, recorded against
 * `'finest'`, must *not*, and that is the injected fault the increment exists for.
 */
const asShippedWithout2b = (
  cands: number[][],
  coverage: number[][],
  others: ReturnType<typeof othersOf>,
  extra: Record<string, boolean> = {},
) => forgivenessFor(cands, coverage, others, [], { filter2b: false, ...extra });

/** One `CountryEntry` with its bounding box derived the way `countryIndex()` derives it. */
function boxed(code: string, rings: number[][]): CountryEntry {
  let a = Infinity;
  let b = Infinity;
  let c = -Infinity;
  let d = -Infinity;
  for (const r of rings) {
    for (let i = 0; i + 1 < r.length; i += 2) {
      if (r[i] < a) a = r[i];
      if (r[i] > c) c = r[i];
      if (r[i + 1] < b) b = r[i + 1];
      if (r[i + 1] > d) d = r[i + 1];
    }
  }
  return { code, rings, box: [a, b, c, d] } as CountryEntry;
}

/** Even-odd containment for one flat ring, written here so a probe point is checked against the
 *  shipped geometry by this file's own arithmetic rather than by the module under test. */
function insideFlatRing(lng: number, lat: number, ring: readonly number[]): boolean {
  let inside = false;
  const n = ring.length;
  let jx = ring[n - 2];
  let jy = ring[n - 1];
  for (let i = 0; i + 1 < n; i += 2) {
    const ix = ring[i];
    const iy = ring[i + 1];
    if (iy > lat !== jy > lat && lng < ((jx - ix) * (lat - iy)) / (jy - iy) + ix) inside = !inside;
    jx = ix;
    jy = iy;
  }
  return inside;
}

// ---------------------------------------------------------------- the predicate itself

/**
 * **R23-3, and it is the point of these three tests.** Round 23 deleted each of `overlaps()`'s
 * clauses in turn and the suite stayed green: every fixture it had was answerable by the two
 * *vertex-mean* probes, which A-28 Part 5 has now removed. The three tests below are one fixture
 * per surviving clause, each built so that **the other two clauses are false on it** — so deleting
 * the clause it names is the only way to make it fail. Each is mutation-verified, not argued.
 */
test('I-5c: clause (a) alone — R lies wholly inside S, and only a vertex of R is contained', () => {
  // `small` is strictly inside `big`: every vertex of R is inside S (clause a); no vertex of S is
  // inside R, because S surrounds it (clause b is false); no pair of segments meets (clause c is
  // false). Deleting clause (a) is therefore the only edit that can make this line fail, and
  // `qa/` mutation runs are what prove that rather than this comment.
  const big = [0, 0, 10, 0, 10, 10, 0, 10];
  const small = [4, 4, 6, 4, 6, 6, 4, 6];
  assert.equal(overlapsRings(small, [big]), true, 'a vertex of R is inside S');
});

test('I-5c: clause (b) alone — S lies wholly inside R, so no vertex of R is inside S', () => {
  // The same pair with the roles swapped. Now R surrounds S: no vertex of R is inside S (clause a
  // is false), the rings do not cross (clause c is false), and only clause (b) — a vertex of S
  // inside R — can answer.
  const big = [0, 0, 10, 0, 10, 10, 0, 10];
  const small = [4, 4, 6, 4, 6, 6, 4, 6];
  assert.equal(overlapsRings(big, [small]), true, 'a vertex of S is inside R');
});

test('I-5c: clause (c) alone — crossing edges with no vertex of either ring inside the other', () => {
  // A plus sign. Each of the eight vertices lies in one of the four outer quadrants, so it is
  // outside the other rectangle: clauses (a) and (b) are both false and only the segment
  // crossings can answer.
  const horizontal = [0, 4, 10, 4, 10, 6, 0, 6];
  const vertical = [4, 0, 6, 0, 6, 10, 4, 10];
  assert.equal(overlapsRings(horizontal, [vertical]), true, 'clause (c) — segments cross');
});

/**
 * **R23-2 — the two vertex-mean probes are gone, and this is the fixture that says why.**
 *
 * A-27 claimed the predicate was *"exact for simple rings"*; the mean of a **concave** ring's
 * vertices can lie outside that ring, so a probe at the mean can report an overlap where the two
 * rings share no ground at all. That direction is the harmful one: a false positive in filter 1
 * is the Vatican failure filter 1 exists to stop. A-28 Part 5 removes both probes and narrows the
 * claim to the theorem that (a)–(c) actually prove.
 *
 * `U` is a concave ring whose vertex mean is (5, 5.75) — in the notch, outside the ring. `S` is a
 * square that lives entirely in that notch and touches `U` nowhere. Before A-28 this pair answered
 * **true**, in both directions, from the mean probes alone.
 */
test('I-5c: overlaps() is false for disjoint rings whose vertex mean lies inside the other', () => {
  const U = [0, 0, 10, 0, 10, 10, 7, 10, 7, 3, 3, 3, 3, 10, 0, 10];
  const inNotch = [4, 4, 6, 4, 6, 7, 4, 7];
  assert.equal(overlapsRings(inNotch, [U]), false, "the notch is outside the U — R's ground is not S's");
  assert.equal(overlapsRings(U, [inNotch]), false, "and the same in the other direction — S's mean is not S");
});

test('I-5b: overlaps() is false for disjoint rings, and the box reject does not change that', () => {
  const a = [0, 0, 1, 0, 1, 1, 0, 1];
  const far = [50, 50, 51, 50, 51, 51, 50, 51];
  const nearMiss = [1.5, 0, 2.5, 0, 2.5, 1, 1.5, 1];
  assert.equal(overlapsRings(a, [far]), false, 'boxes disjoint');
  assert.equal(overlapsRings(a, [nearMiss]), false, 'boxes disjoint on lng alone');
  // Boxes that meet but rings that do not: two staircases in one bounding box.
  const l1 = [0, 0, 4, 0, 4, 1, 0, 1];
  const l2 = [0, 2, 4, 2, 4, 3, 0, 3];
  assert.equal(overlapsRings(l1, [l2]), false, 'boxes meet in lng, rings do not touch');
});

test('I-5b: overlaps() treats a shared edge and a shared vertex as an overlap', () => {
  const left = [0, 0, 1, 0, 1, 1, 0, 1];
  const right = [1, 0, 2, 0, 2, 1, 1, 1];
  const corner = [1, 1, 2, 1, 2, 2, 1, 2];
  assert.equal(overlapsRings(left, [right]), true, 'a shared edge is not disjoint');
  assert.equal(overlapsRings(left, [corner]), true, 'a shared vertex is not disjoint');
});

test('I-5b: overlaps() honours holes — a ring inside a hole of S is not inside S', () => {
  // S is a square with a square hole; R sits inside the hole and touches nothing.
  const outer = [0, 0, 10, 0, 10, 10, 0, 10];
  const hole = [2, 2, 8, 2, 8, 8, 2, 8];
  const inHole = [4, 4, 5, 4, 5, 5, 4, 5];
  assert.equal(overlapsRings(inHole, [outer, hole]), false, 'even-odd: inside the hole is outside S');
  const inRim = [0.5, 0.5, 1.5, 0.5, 1.5, 1.5, 0.5, 1.5];
  assert.equal(overlapsRings(inRim, [outer, hole]), true, 'the rim between the rings is inside S');
});

test('I-5b: overlaps() is exact on the shipped lattice — a 1e-4 gap is a miss, 0 is a hit', () => {
  const a = [0, 0, 0.001, 0, 0.001, 0.001, 0, 0.001];
  const touching = [0.001, 0, 0.002, 0, 0.002, 0.001, 0.001, 0.001];
  const apart = [0.0011, 0, 0.002, 0, 0.002, 0.001, 0.0011, 0.001];
  assert.equal(overlapsRings(a, [touching]), true);
  assert.equal(overlapsRings(a, [apart]), false, 'one lattice step of clear water is a miss');
});

/**
 * **The lattice is reached by rounding, and rounding is not a detail** *(QA R23-3's third
 * arithmetic mutant)*. A shipped coordinate is an exact multiple of 1e-4 in decimal but not in
 * binary: `0.0003 * 10000` is `2.9999999999999996`, so truncating puts it on lattice column **2**
 * and rounding puts it on **3**. These two rings are one clear lattice step apart under `round`
 * and share an edge under `trunc` — the difference between "a miss" and "an overlap", decided by
 * one character in `prepRing`.
 */
test('I-5c: overlaps() reaches the lattice by rounding — truncating would merge two disjoint rings', () => {
  const left = [0.0001, 0, 0.0002, 0, 0.0002, 0.0001, 0.0001, 0.0001];
  const right = [0.0003, 0, 0.0004, 0, 0.0004, 0.0001, 0.0003, 0.0001];
  assert.equal(prepRing(left).box[2], 2, 'the left ring should end on lattice column 2');
  assert.equal(prepRing(right).box[0], 3, 'the right ring should start on lattice column 3 — round, not trunc');
  assert.equal(overlapsRings(left, [right]), false, 'one lattice step of clear water is a miss');
});

test('I-5b: overlaps() is symmetric on the cases the filters actually meet', () => {
  const cases: Array<[number[], number[]]> = [
    [[0, 0, 10, 0, 10, 10, 0, 10], [4, 4, 6, 4, 6, 6, 4, 6]],
    [[0, 4, 10, 4, 10, 6, 0, 6], [4, 0, 6, 0, 6, 10, 4, 10]],
    [[0, 0, 1, 0, 1, 1, 0, 1], [5, 5, 6, 5, 6, 6, 5, 6]],
    [[0, 0, 1, 0, 1, 1, 0, 1], [1, 0, 2, 0, 2, 1, 1, 1]],
  ];
  for (const [a, b] of cases) {
    assert.equal(overlapsRings(a, [b]), overlapsRings(b, [a]), `asymmetric on ${JSON.stringify(a)}`);
  }
});

// ---------------------------------------------------------------- the filters, synthetically

/**
 * A non-empty finest population that touches nothing in these fixtures. Arm 2b **throws** on an
 * empty one (A-28 Part 7: an accidentally-empty finest population *is* R23-1), so a test that
 * wants to exercise some other part of the pass has to hand it a real one.
 */
const FAR_FINEST = [{ code: 'QQ', rings: [[80, 80, 81, 80, 81, 81, 80, 81]] }];

test('I-5c: filter 1 keeps a coarser drawing of the same place and drops a disjoint claim', () => {
  const own = [[0, 0, 1, 0, 1, 1, 0, 1]];
  const coarserSamePlace = [-0.2, -0.2, 1.2, -0.2, 1.2, 1.2, -0.2, 1.2];
  const somewhereElse = [50, 50, 51, 50, 51, 51, 50, 51];
  const r = forgivenessFor([coarserSamePlace, somewhereElse], own, [], FAR_FINEST);
  assert.deepEqual(r.kept, [0]);
  assert.deepEqual(r.drops, [{ index: 1, filter: 1, code: null, against: null }]);
  // …and with filter 1 removed, the disjoint claim survives. That is the fault, in miniature.
  const noF1 = forgivenessFor([coarserSamePlace, somewhereElse], own, [], FAR_FINEST, { filter1: false });
  assert.deepEqual(noF1.kept, [0, 1]);
});

test('I-5c: arm 2a drops a ring that reaches into another entry of the shipped index, naming which', () => {
  const own = [[0, 0, 1, 0, 1, 1, 0, 1]];
  const neighbour = { code: 'ZZ', rings: [[2, 0, 4, 0, 4, 2, 2, 2]] };
  const spillsOver = [-0.2, -0.2, 3, -0.2, 3, 1.2, -0.2, 1.2];
  const staysHome = [-0.2, -0.2, 1.2, -0.2, 1.2, 1.2, -0.2, 1.2];
  const r = forgivenessFor([spillsOver, staysHome], own, [neighbour], FAR_FINEST);
  assert.deepEqual(r.kept, [1]);
  assert.deepEqual(r.drops, [{ index: 0, filter: 2, code: 'ZZ', against: 'coverage' }]);
  const noArms = forgivenessFor([spillsOver, staysHome], own, [neighbour], FAR_FINEST, {
    filter2a: false,
    filter2b: false,
  });
  assert.deepEqual(noArms.kept, [0, 1]);
});

/**
 * **Arm 2b, in miniature — this is R23-1's mechanism with the geography taken out.**
 *
 * `ZZ` ships in the coverage-only index at a *coarse* resolution that stops short of the ground it
 * actually owns (China at 1:110m, generalised kilometres inland of the Pearl River delta). The
 * candidate reaches into the ground `ZZ` owns at the **finest** scale but not into the coarse
 * drawing, so arm 2a — which compares against the index as it ships — sees nothing and admits it.
 * That is exactly how ~22.1 km² of Guangdong came to answer `MO`. Arm 2b, which compares against
 * every other code at the finest scale the pinned family carries, is what refuses it.
 */
test('I-5c: arm 2b drops a ring that arm 2a admits, because the shipped neighbour is drawn coarse', () => {
  const own = [[0, 0, 1, 0, 1, 1, 0, 1]];
  const coarseNeighbour = { code: 'ZZ', rings: [[5, 0, 6, 0, 6, 1, 5, 1]] };
  const finestNeighbour = { code: 'ZZ', rings: [[1.5, 0, 6, 0, 6, 1, 1.5, 1]] };
  const overTheBorder = [-0.2, -0.2, 2, -0.2, 2, 1.2, -0.2, 1.2];

  const both = forgivenessFor([overTheBorder], own, [coarseNeighbour], [finestNeighbour]);
  assert.deepEqual(both.kept, [], 'the ring claims ZZ ground and must be refused');
  assert.deepEqual(both.drops, [{ index: 0, filter: 2, code: 'ZZ', against: 'finest' }]);

  // Arm 2a alone — the A-27 filter — admits it. That is the defect, reproduced.
  const armAOnly = forgivenessFor([overTheBorder], own, [coarseNeighbour], [finestNeighbour], {
    filter2b: false,
  });
  assert.deepEqual(armAOnly.kept, [0], 'arm 2a alone does not see the neighbour at the finest scale');

  // And arm 2b alone catches it, so neither arm is doing the other's work here.
  const armBOnly = forgivenessFor([overTheBorder], own, [coarseNeighbour], [finestNeighbour], {
    filter2a: false,
  });
  assert.deepEqual(armBOnly.drops, [{ index: 0, filter: 2, code: 'ZZ', against: 'finest' }]);
});

/**
 * **The other direction, which A-28 Part 2 measures and is why the simple fix was rejected.** A
 * neighbour's *coarse* drawing can legitimately cover ground its finest drawing does not — `CN` at
 * 1:110m covers Lantau, `MY` at 1:110m covers Singapore Island. Arm 2a is what refuses those, and
 * a finest-only filter 2 would admit `HK[1]`, `HK[2]` and `SG[0]`. So arm 2a is not redundant.
 */
test('I-5c: arm 2a catches a ring arm 2b passes — the coarse neighbour owns ground the fine one does not', () => {
  const own = [[0, 0, 1, 0, 1, 1, 0, 1]];
  const coarseNeighbour = { code: 'ZZ', rings: [[1.5, 0, 6, 0, 6, 1, 1.5, 1]] };
  const finestNeighbour = { code: 'ZZ', rings: [[5, 0, 6, 0, 6, 1, 5, 1]] };
  const overTheBorder = [-0.2, -0.2, 2, -0.2, 2, 1.2, -0.2, 1.2];

  const both = forgivenessFor([overTheBorder], own, [coarseNeighbour], [finestNeighbour]);
  assert.deepEqual(both.drops, [{ index: 0, filter: 2, code: 'ZZ', against: 'coverage' }]);
  const armBOnly = forgivenessFor([overTheBorder], own, [coarseNeighbour], [finestNeighbour], {
    filter2a: false,
  });
  assert.deepEqual(armBOnly.kept, [0], 'arm 2b alone cannot see the coarse drawing — 2a is not surplus');
});

test('I-5c: the arms run 1, 2a, 2b and a drop is booked against the first that fires', () => {
  const own = [[0, 0, 1, 0, 1, 1, 0, 1]];
  const neighbour = { code: 'ZZ', rings: [[50, 50, 60, 50, 60, 60, 50, 60]] };
  const finest = [{ code: 'ZZ', rings: [[50, 50, 60, 50, 60, 60, 50, 60]] }];
  const elsewhereAndTaken = [51, 51, 52, 51, 52, 52, 51, 52];
  const r = forgivenessFor([elsewhereAndTaken], own, [neighbour], finest);
  assert.deepEqual(r.drops, [{ index: 0, filter: 1, code: null, against: null }]);
  const noF1 = forgivenessFor([elsewhereAndTaken], own, [neighbour], finest, { filter1: false });
  assert.deepEqual(noF1.drops, [{ index: 0, filter: 2, code: 'ZZ', against: 'coverage' }]);
  const noF1NoA = forgivenessFor([elsewhereAndTaken], own, [neighbour], finest, {
    filter1: false,
    filter2a: false,
  });
  assert.deepEqual(noF1NoA.drops, [{ index: 0, filter: 2, code: 'ZZ', against: 'finest' }]);
});

/**
 * **An empty finest population is R23-1 exactly, so it is not reachable by forgetting an
 * argument** (A-28 Part 7). Arm 2b with nothing to compare against admits every ring it sees,
 * silently — which is the bug, not a degenerate case of the fix.
 */
test('I-5c: forgivenessFor throws if arm 2b is on and the finest population is missing or empty', () => {
  const own = [[0, 0, 1, 0, 1, 1, 0, 1]];
  const cands = [[-0.2, -0.2, 1.2, -0.2, 1.2, 1.2, -0.2, 1.2]];
  assert.throws(() => forgivenessFor(cands, own, [], []), /finest/i, 'an empty finest population must throw');
  assert.throws(
    () => (forgivenessFor as (...a: unknown[]) => unknown)(cands, own, []),
    /finest/i,
    'an absent finest population must throw',
  );
  // …and it is a *call*, not a code edit, that removes the arm.
  const off = forgivenessFor(cands, own, [], [], { filter2b: false });
  assert.deepEqual(off.kept, [0]);
});

test('I-5c: the filters are pure — the same call twice gives the same answer and mutates nothing', () => {
  const own = [[0, 0, 1, 0, 1, 1, 0, 1]];
  const cands = [[-0.2, -0.2, 1.2, -0.2, 1.2, 1.2, -0.2, 1.2]];
  const before = JSON.stringify([own, cands, FAR_FINEST]);
  const a = forgivenessFor(cands, own, [], FAR_FINEST);
  const b = forgivenessFor(cands, own, [], FAR_FINEST);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify([own, cands, FAR_FINEST]), before, 'the filters mutated their input');
});

// ---------------------------------------------------------------- the drops fixture is honest

test('I-5b: the drops fixture agrees with the shipped index about who was refused', () => {
  assert.deepEqual(DROPS.candidateScales, ['110m', '50m'], 'the scales strictly coarser than the fill');
  assert.deepEqual([...new Set(DROPS.drops.map((d) => d.scale))], ['50m'], 'only 1:50m produced candidates');
  assert.equal(DROPS.dropped, DROPS.drops.length);
  assert.equal(DROPS.candidates, DROPS.kept + DROPS.dropped);
  // The artefact's own arithmetic: 64 filled codes, 53 with an entry, 11 refused (I-5c: was 54/10).
  assert.equal(DROPS.codes.length + DROPS.refusedCodes.length, 64);
  assert.equal(DROPS.entries, DROPS.codes.length);
  assert.equal(
    COUNTRY_INDEX.countries.length - new Set(COUNTRY_INDEX.countries.map((c) => c.code)).size,
    DROPS.entries,
    'the number of duplicate-code entries in the index is not the number of forgiveness entries',
  );
  // Exactly the codes that ended with no forgiveness entry.
  const single = new Set(
    COUNTRY_INDEX.countries.map((c) => c.code).filter((c, _i, all) => all.filter((x) => x === c).length === 1),
  );
  for (const code of DROPS.refusedCodes) {
    assert.ok(single.has(code), `${code} is listed as refused but has more than one shipped entry`);
  }
  // The ceiling: no forgiveness entry may introduce a code the coverage pass did not emit, and no
  // code may acquire an entry the generator did not report.
  const seen = new Set<string>();
  for (const c of COUNTRY_INDEX.countries) {
    if (seen.has(c.code)) assert.ok(!DROPS.refusedCodes.includes(c.code));
    seen.add(c.code);
  }
});

/**
 * **The arm the artefact records is the arm that fires, re-run here.** Everything except the one
 * `'finest'` drop is reproducible from the shipped index alone — which is A-28 Part 1's finding
 * turned into an assertion: `MO`'s ring is the one the shipped index *cannot* refuse, and if it
 * ever became reproducible from the index this test would say so.
 */
test('I-5c: every dropped ring is re-dropped by the arm recorded against it', () => {
  assert.ok(DROPS.drops.length > 0, 'the fixture records no drops at all');
  for (const d of DROPS.drops) {
    const own = entriesFor(d.code);
    assert.equal(own.length >= 1, true, `${d.code} has no entry in the shipped index`);
    const coverage = own[0].rings.map((r) => [...r]);
    const r = asShippedWithout2b([d.ring], coverage, othersOf(d.code));
    if (d.against === 'finest') {
      // Arm 2a cannot see it — that is the defect A-28 fixed, and it must stay visible here.
      assert.deepEqual(r.kept, [0], `${d.code}: a 'finest' drop should be invisible to arm 2a`);
      continue;
    }
    assert.deepEqual(r.kept, [], `${d.code}: a ring the generator dropped survives here`);
    assert.equal(r.drops[0].filter, d.filter, `${d.code}: dropped by a different filter than recorded`);
    assert.equal(r.drops[0].against, d.against, `${d.code}: dropped by a different arm than recorded`);
    assert.equal(r.drops[0].code, d.takenFrom, `${d.code}: names a different neighbour than recorded`);
  }
  // The census A-28 Part 4 measured: 2 by filter 1, 9 by arm 2a, exactly 1 by arm 2b — Macao's.
  const by = (f: 1 | 2, a: string | null) => DROPS.drops.filter((d) => d.filter === f && d.against === a);
  assert.equal(by(1, null).length, 2, 'filter 1 no longer drops exactly two rings');
  assert.equal(by(2, 'coverage').length, 9, 'arm 2a no longer drops exactly nine rings');
  assert.deepEqual(
    by(2, 'finest').map((d) => `${d.code}->${d.takenFrom}`),
    ['MO->CN'],
    "arm 2b's one drop is Macao's ring, against China, and nothing else",
  );
});

// ---------------------------------------------------------------- criterion 4(e), injected fault 1

/**
 * **Injected fault 1 — remove *both arms* of filter 2 and the bordered codes gain forgiveness
 * entries.**
 *
 * A-27 Part 4 filter 2: *"A forgiveness ring's whole purpose is to claim ground beyond the
 * waterline; where that ground is another country's, the claim is a wrong answer, not a
 * tolerance."* These **eight** are the filled codes that have a land neighbour, and their 1:50m
 * polygons all reach into it. With filter 2 in place every one of them is refused; with it deleted
 * every one of them is admitted, which is what makes the filter load-bearing rather than
 * decorative.
 *
 * **`MO` is the eighth, added at I-5c (§8.4 A-28 Part 1).** A-27's enumeration said *"every
 * bordered filled code"* and listed seven; Macao is bordered, and its absence from that list was
 * the defect QA R23-1 found. Seven of the eight are refused by arm **2a**; Macao is refused by arm
 * **2b** and by nothing else, which is why this test asserts the arm and not just the outcome.
 */
test('I-5c injected fault: deleting filter 2 gives AD HK LI MC MO SG SM SX the entries they were refused', () => {
  const bordered = ['AD', 'HK', 'LI', 'MC', 'MO', 'SG', 'SM', 'SX'];
  for (const code of bordered) {
    const cands = DROPS.drops.filter((d) => d.code === code).map((d) => d.ring);
    assert.ok(cands.length > 0, `${code} has no recorded candidate rings — the fixture is stale`);
    const coverage = entriesFor(code)[0].rings.map((r) => [...r]);
    const others = othersOf(code);
    const arms = DROPS.drops.filter((d) => d.code === code).map((d) => d.against);

    // With arm 2a on — the only arm this file can run — the seven `'coverage'` codes are refused
    // and Macao is not. Both halves are asserted, because "Macao is not refused by 2a" is the
    // finding.
    const shipped = asShippedWithout2b(cands, coverage, others);
    if (arms.every((a) => a === 'coverage')) {
      assert.deepEqual(shipped.kept, [], `${code} was NOT refused by arm 2a`);
      assert.deepEqual(
        shipped.drops.map((d) => d.filter),
        cands.map(() => 2),
        `${code} was refused by filter 1, not filter 2`,
      );
    } else {
      assert.deepEqual(arms, ['finest'], `${code} should be arm 2b's, and it is the only one`);
      assert.deepEqual(shipped.kept, [0], 'Macao slips past arm 2a — that is QA R23-1');
    }

    const faulted = forgivenessFor(cands, coverage, others, [], { filter2a: false, filter2b: false });
    assert.equal(
      faulted.kept.length,
      cands.length,
      `${code} gains nothing with filter 2 deleted — filter 2 is not what refuses it`,
    );
  }
  // And it is exactly these eight: every code filter 2 refused is on the list above.
  const byFilter2 = [...new Set(DROPS.drops.filter((d) => d.filter === 2).map((d) => d.code))].sort();
  assert.deepEqual(byFilter2, bordered);
  // Each names the neighbour it would have taken from — the answer that would have been wrong.
  for (const d of DROPS.drops.filter((x) => x.filter === 2)) {
    assert.ok(d.takenFrom && d.takenFrom !== d.code, `${d.code} was refused without naming an encloser`);
  }
});

/**
 * **The three rings A-28 Part 2 says a finest-only filter 2 would wrongly admit.** `CN`'s and
 * `MY`'s **1:110m** rings cover Lantau and Singapore Island wholesale; their 1:10m rings do not.
 * So arm 2b passes `HK[1]`, `HK[2]` and `SG[0]`, and only arm 2a refuses them — admitting them
 * would move 23 cells `CN`→`HK` and 42 `MY`→`SG`, which is the `country → other country` class
 * A-27 Part 3 property 2 declares impossible.
 *
 * **This is the regression the obvious remedy causes**, so it is asserted rather than trusted: the
 * three rings are refused with arm 2b *switched off*, which is a state only arm 2a can produce.
 */
test('I-5c: HK and SG are refused by arm 2a specifically — a finest-only filter 2 would admit them', () => {
  for (const code of ['HK', 'SG']) {
    const rings = DROPS.drops.filter((d) => d.code === code);
    assert.ok(rings.length > 0, `${code} has no recorded candidate rings — the fixture is stale`);
    for (const d of rings) {
      assert.equal(d.against, 'coverage', `${code}'s ring is not recorded against arm 2a`);
      const coverage = entriesFor(code)[0].rings.map((r) => [...r]);
      // Arm 2a alone, with 2b removed: still refused, and still against the same neighbour.
      const only2a = forgivenessFor([d.ring], coverage, othersOf(code), [], { filter2b: false });
      assert.deepEqual(only2a.kept, [], `${code} survives arm 2a alone — the non-regression guard is gone`);
      assert.equal(only2a.drops[0].code, d.takenFrom);
    }
  }
  assert.equal(DROPS.drops.filter((d) => d.code === 'HK').length, 3, 'HK should have three refused rings');
  assert.equal(DROPS.drops.filter((d) => d.code === 'SG').length, 1, 'SG should have one refused ring');
});

// ---------------------------------------------------------------- criterion 4(e), injected fault 2

/**
 * **Injected fault 2 — remove filter 1 and Vatican City gains a polygon a kilometre west of
 * itself.**
 *
 * A-26 Part 5 residue 1 held `VA` as a hand-written exception. A-27 Part 4 filter 1 replaces the
 * assertion with a measurement: Natural Earth's 1:50m `VA` polygon does not touch its own 1:10m
 * one, so it is not a coarser drawing of the Vatican — it is a different claim about where the
 * Vatican is. Removing filter 1 admits it, and its box lies west of the state.
 *
 * **One correction to the criterion's wording, measured rather than assumed** (recorded in
 * BUILD-NOTES): the ring is refused by filter 1 *first*, and filter 2 would refuse it second,
 * because the ground it claims is Italy's. The assertion below therefore states both — which
 * filter fires first, and what is gained when neither does.
 */
test('I-5b injected fault: deleting filter 1 gives VA the 1:50m polygon that sits west of the state', () => {
  const cands = DROPS.drops.filter((d) => d.code === 'VA').map((d) => d.ring);
  assert.equal(cands.length, 1, 'VA should have exactly one refused candidate ring');
  const vaEntries = entriesFor('VA');
  assert.equal(vaEntries.length, 1, 'VA must ship exactly one entry — the coverage one');
  const coverage = vaEntries[0].rings.map((r) => [...r]);
  const others = othersOf('VA');

  // Shipped: refused, and refused by filter 1 — "this is not the same place".
  const shipped = asShippedWithout2b(cands, coverage, others);
  assert.deepEqual(shipped.kept, []);
  assert.equal(shipped.drops[0].filter, 1, 'VA is refused by filter 1, not by filter 2');
  assert.equal(shipped.drops[0].against, null, "a filter 1 drop is against neither arm");
  assert.equal(overlapsRings(cands[0], coverage), false, 'the 1:50m VA polygon does not touch the 1:10m one');

  // Fault: filter 1 deleted. Arm 2a then catches it — against Italy, which is where it is.
  const noF1 = asShippedWithout2b(cands, coverage, others, { filter1: false });
  assert.equal(noF1.kept.length, 0, 'with filter 1 gone the ring is still caught, by arm 2a');
  assert.equal(noF1.drops[0].filter, 2);
  assert.equal(noF1.drops[0].against, 'coverage');
  assert.equal(noF1.drops[0].code, 'IT', 'the ground the 1:50m VA polygon claims is Italy');

  // Fault: every filter deleted — this is the polygon VA would gain, and where it is.
  const none = forgivenessFor(cands, coverage, others, [], {
    filter1: false,
    filter2a: false,
    filter2b: false,
  });
  assert.deepEqual(none.kept, [0]);
  const gained = prepRing(cands[0]).box;
  const shippedBox = prepRing(coverage[0]).box;
  assert.ok(
    gained[2] < shippedBox[0],
    `the gained polygon (${gained[0]}..${gained[2]}) should lie entirely west of the state (${shippedBox[0]}..${shippedBox[2]})`,
  );
  // ~1 km west, in lattice units: 1e-4° of longitude at 42°N is ~8.3 m.
  const gapDegrees = (shippedBox[0] - gained[2]) / 10_000;
  assert.ok(gapDegrees > 0.005 && gapDegrees < 0.05, `the gap is ${gapDegrees}°, not the ~1 km A-27 measured`);
});

// ---------------------------------------------------------------- criterion 4(e), injected fault 3

/**
 * **Injected fault 3 — remove arm 2b alone and `MO` alone gains an entry, and Zhuhai attributes to
 * Macao.** *(ROADMAP exit criterion 4 part e, revision 22. A-28: "the assertion whose absence let
 * R23-1 ship … it is not optional.")*
 *
 * This is the whole increment in one test. Macao's 1:50m ring reaches ~2 km into Guangdong. Arm 2a
 * compares it against China **as the shipped index draws China** — at 1:110m, generalised
 * kilometres inland of the Pearl River delta — and finds nothing to reject it. So with arm 2b
 * removed the ring is admitted, `MO` gains a second entry, and (22.221 N, 113.503 E), a street in
 * Zhuhai Nanping, answers `MO` instead of `null`.
 *
 * **The assertion is on the coordinate, not only on the entry count**, because an entry count is
 * what A-27's tests already had and they all stayed green.
 */
test('I-5c injected fault: removing arm 2b alone gives MO the ring that claims Zhuhai', () => {
  const ZHUHAI_NANPING = { lat: 22.221, lng: 113.503 };
  const mo = DROPS.drops.filter((d) => d.code === 'MO');
  assert.equal(mo.length, 1, 'MO should have exactly one refused candidate ring');
  assert.equal(mo[0].against, 'finest', "MO's ring is arm 2b's drop and nobody else's");
  assert.equal(entriesFor('MO').length, 1, 'MO must ship exactly one entry — the coverage one');

  const coverage = entriesFor('MO')[0].rings.map((r) => [...r]);
  const faultedRun = asShippedWithout2b([mo[0].ring], coverage, othersOf('MO'));
  assert.deepEqual(faultedRun.kept, [0], 'arm 2a alone admits it — that is the defect, reproduced');

  // The index as it would have shipped with arm 2b removed: the committed one plus that ring, in
  // front of it — an enclave-sized entry sorts first under the emitted order, and `countryOf`
  // returns on the first ENTRY that contains the point. Built here as a plain value rather than
  // through `countryIndex()`, which is not on §2.10's export surface and which nothing outside
  // `packages/core` may reach past `index.ts` to get at.
  const faultedIndex: CountryIndex = {
    scale: 'faulted',
    source: 'COUNTRY_INDEX plus the forgiveness ring arm 2b refuses — ARCHITECTURE §8.4 A-28',
    countries: [boxed('MO', [mo[0].ring]), ...COUNTRY_INDEX.countries],
  };
  assert.equal(countryOf(ZHUHAI_NANPING, faultedIndex), 'MO', 'the fault must actually mis-attribute Zhuhai');
  assert.equal(countryOf(ZHUHAI_NANPING, COUNTRY_INDEX), null, 'and the shipped index must not');
  // Macao itself is unharmed by the refusal — the ring that left cost it none of its own ground.
  assert.equal(countryOf({ lat: 22.1936, lng: 113.5397 }, COUNTRY_INDEX), 'MO', 'Senado Square is still MO');

  // …and MO *alone*. Every other refused ring is still refused with arm 2b removed.
  for (const d of DROPS.drops) {
    if (d.code === 'MO') continue;
    const own = entriesFor(d.code)[0].rings.map((r) => [...r]);
    assert.deepEqual(
      asShippedWithout2b([d.ring], own, othersOf(d.code)).kept,
      [],
      `${d.code} also gains a ring when arm 2b is removed — the fault is not MO's alone`,
    );
  }
});

// ------------------------------------------------- criterion 4(e), the comparison to a third source

/**
 * **The one check in this file that is not the index measured against itself** — ROADMAP exit
 * criterion 4 part **e**, revision 22:
 *
 * > *"every sweep it asks for compares the index against **itself**, which is exactly why 22.1 km²
 * > of Guangdong could be gained without any of them noticing — a cell going `null → MO` books as a
 * > gain. So part e now also requires **one comparison against a third source**: for every ring a
 * > forgiveness entry admits, the finest layer in the pinned family must not attribute that ring's
 * > ground to another ISO code."*
 *
 * The generator runs the exact form of this — `overlaps` against all 238 other codes at 1:10m, over
 * the *emitted* entries — and refuses to write if any ring fails it. What it commits for the suite
 * is the finest layer's own **answer** at deterministic points inside each admitted ring. Both
 * halves are checked here: that each probe really lies inside the ring it is recorded against (so
 * the sample cannot pass by sitting in open water), and that no admitted ring's ground belongs to
 * anyone else.
 */
test('I-5c criterion 4e: the finest layer attributes no admitted forgiveness ring to another country', () => {
  const ts = DROPS.thirdSource;
  assert.equal(ts.scale, '10m', "the third source must be the pinned family's finest layer");
  const shippedRings = DROPS.forgivenessAt.reduce((n, i) => n + COUNTRY_INDEX.countries[i].rings.length, 0);
  assert.equal(ts.admitted.length, shippedRings, 'the sample does not cover every shipped forgiveness ring');
  assert.equal(ts.checkedRings, shippedRings, 'the generator checked a different number of rings');
  assert.equal(ts.unprobedRings, 0, 'a ring was too thin to probe — the sample has a blind spot');

  let probes = 0;
  let ownCode = 0;
  for (const a of ts.admitted) {
    const entry = COUNTRY_INDEX.countries[a.entry];
    assert.ok(DROPS.forgivenessAt.includes(a.entry), `entry ${a.entry} is not a forgiveness entry`);
    assert.equal(entry.code, a.code, `entry ${a.entry} is ${entry.code}, not ${a.code}`);
    const ring = entry.rings[a.ring];
    assert.ok(ring, `${a.code} has no ring ${a.ring}`);
    assert.ok(a.points.length > 0, `${a.code}[${a.ring}] was sampled at no points at all`);
    for (const [lng, lat, answer] of a.points) {
      probes++;
      assert.ok(insideFlatRing(lng, lat, ring), `${a.code}[${a.ring}]: (${lat}, ${lng}) is not inside the ring`);
      assert.ok(
        answer === null || answer === a.code,
        `${a.code}[${a.ring}]: the finest layer calls (${lat}, ${lng}) ${answer} — forgiveness taken from a neighbour`,
      );
      if (answer === a.code) ownCode++;
    }
  }
  assert.ok(probes > 500, `only ${probes} probe points — the sample is too thin to mean anything`);
  assert.ok(ownCode > 0, 'not one probe landed on the country itself: the third source is answering nothing');
});

/**
 * **And the third source's counterexample, which is what makes the check above non-vacuous.** If
 * every probe in this fixture came back `null`, the test above would pass on a fixture that had
 * simply lost its answers. Macao's *refused* ring is the control: the finest layer calls its ground
 * `CN`, at every point sampled, and those same points are `null` in the shipped index and `MO` in
 * the faulted one. That chain — third source says China, shipped index says nothing, the fault says
 * Macao — is R23-1 stated end to end.
 */
test('I-5c criterion 4e: the finest layer calls the ring MO was refused Chinese ground', () => {
  const mo = DROPS.thirdSource.dropped.find((d) => d.code === 'MO');
  assert.ok(mo, 'the third-source sample has no record for MO');
  assert.equal(mo.against, 'finest');
  assert.equal(mo.takenFrom, 'CN');
  assert.ok(mo.points.length > 0, "MO's refused ring was sampled at no points");
  const ring = DROPS.drops[mo.drop].ring;
  assert.equal(DROPS.drops[mo.drop].code, 'MO', 'the drop index does not point at MO');
  for (const [lng, lat, answer] of mo.points) {
    assert.ok(insideFlatRing(lng, lat, ring), `(${lat}, ${lng}) is not inside the ring MO was refused`);
    assert.equal(answer, 'CN', `the finest layer calls (${lat}, ${lng}) ${answer}, not CN`);
    assert.equal(countryOf({ lat, lng }, COUNTRY_INDEX), null, `(${lat}, ${lng}) is not null in the shipped index`);
  }
});

// ---------------------------------------------------------------- the codes with no candidate

test('I-5b: GI and UM are refused for having no coarser polygon at all, not by a filter', () => {
  assert.deepEqual([...DROPS.noCandidates].sort(), ['GI', 'UM']);
  for (const code of DROPS.noCandidates) {
    assert.equal(DROPS.drops.filter((d) => d.code === code).length, 0, `${code} should have no dropped rings`);
    assert.equal(entriesFor(code).length, 1, `${code} should ship exactly one entry`);
  }
  // All ten refusals accounted for, and no eleventh.
  const refusedByFilter = [...new Set(DROPS.drops.map((d) => d.code))];
  const refused = new Set([...DROPS.noCandidates, ...refusedByFilter.filter((c) => entriesFor(c).length === 1)]);
  assert.deepEqual([...refused].sort(), [...DROPS.refusedCodes].sort());
});

// ------------------------------------------------- the generator's constants, and what guards them

/**
 * **QA R24-3 — the guard on `FILL`/`FAMILY`, exercised rather than read.**
 *
 * Both arms' populations are decided by two constants in `tools/gen-countries.mjs`: `FAMILY`,
 * documented *"Coarsest first"*, and `FILL`, documented as the family's finest scale. A-28 Part 3's
 * trigger is asserted there — `FILL === FAMILY[FAMILY.length - 1]` — but that equality is only the
 * same statement as *"the fill is the finest scale"* while `FAMILY` really is ordered coarsest-first,
 * and until R24-3 nothing checked the ordering. Reorder it to `['110m', '10m', '50m']` with
 * `FILL = '50m'` and the equality still holds while arm 2b — which takes "the finest scale carrying
 * this code" to be the *last* one that does — starts comparing 1:10m candidates against 1:50m
 * neighbours. That is R23-1's class, inside the arm A-28 added to prevent it.
 *
 * Both guards run at module top level, **before any fetch**, so the assertion is cheap: a mutated
 * copy of the generator that reaches the network has already failed it. The copy is written to a
 * temporary directory outside the repository and removed again; the checkout is never mutated.
 * Out of tree the copy cannot *finish* a run — its `../packages/core` import does not resolve from
 * `/tmp` — so what is asserted is the guard's own exit code and message, never a completed
 * generation. `qa/i5c-family.sh` runs the same mutations against a git worktree, where a run that
 * gets past the constants completes; this is the half of it that `npm test` can afford.
 */
function runMutatedGenerator(mutate: (src: string) => string): { status: number | null; stderr: string } {
  const dir = mkdtempSync(join(tmpdir(), 'cairn-genfamily-'));
  try {
    copyFileSync(resolve(CAIRN, 'tools', 'forgiveness.mjs'), join(dir, 'forgiveness.mjs'));
    const src = readFileSync(resolve(CAIRN, 'tools', 'gen-countries.mjs'), 'utf8');
    const mutated = mutate(src);
    assert.notEqual(mutated, src, 'the mutation did not apply — the generator’s constants have moved');
    writeFileSync(join(dir, 'gen-countries.mjs'), mutated);
    const r = spawnSync(process.execPath, [join(dir, 'gen-countries.mjs'), '--dry-run'], {
      encoding: 'utf8',
      timeout: 30_000,
    });
    return { status: r.status, stderr: r.stderr ?? '' };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('I-5c: the generator refuses to run when FILL is not the family’s last scale', () => {
  const { status, stderr } = runMutatedGenerator((src) => src.replace("const FILL = '10m';", "const FILL = '50m';"));
  assert.equal(status, 2, `A-28 Part 3’s trigger did not fire (exit ${status}). stderr: ${stderr.slice(0, 300)}`);
  assert.match(stderr, /finest scale/, 'the message does not say which invariant broke');
});

test('I-5c (R24-3): the generator refuses to run when FAMILY is not ordered coarsest-first', () => {
  const { status, stderr } = runMutatedGenerator((src) =>
    src
      .replace("const FAMILY = ['110m', '50m', '10m'];", "const FAMILY = ['110m', '10m', '50m'];")
      .replace("const FILL = '10m';", "const FILL = '50m';"),
  );
  assert.equal(
    status,
    2,
    `FAMILY was reordered so FILL is still its LAST scale but no longer its FINEST, and the ` +
      `generator ran anyway (exit ${status}) — arm 2b would compare 1:10m candidates against 1:50m ` +
      `neighbours. stderr: ${stderr.slice(0, 300)}`,
  );
  assert.match(stderr, /coarsest/, 'the message does not say which invariant broke');
});

// ---------------------------------------------------------------- prep/box sanity

test('I-5b: prepSet unions its rings boxes and overlaps() rejects on it before anything else', () => {
  const s = prepSet([
    [0, 0, 1, 0, 1, 1, 0, 1],
    [10, 10, 11, 10, 11, 11, 10, 11],
  ]);
  assert.deepEqual([...s.box], [0, 0, 110_000, 110_000]);
  assert.equal(overlaps(prepRing([5, 5, 6, 5, 6, 6, 5, 6]), s), false, 'between the two rings is not inside either');
  assert.equal(overlaps(prepRing([20, 20, 21, 20, 21, 21, 20, 21]), s), false, 'outside the union box');
});
