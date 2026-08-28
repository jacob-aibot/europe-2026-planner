/**
 * **ROADMAP Phase 2 exit criterion 4 part (e)** — the forgiveness filters, exercised directly.
 *
 * ARCHITECTURE §8.4 **A-27** Part 4 states one predicate and two filters, and the criterion asks
 * for two *injected faults*: remove filter 2 and `AD`, `HK`, `LI`, `MC`, `SG`, `SM`, `SX` gain
 * forgiveness entries; remove filter 1 and Vatican City gains the 1:50m polygon that lies about a
 * kilometre west of the state. A test that only reads the shipped artefact cannot inject either
 * fault, so this file imports the generator's own filter module — `tools/forgiveness.mjs`, which
 * exists as a separate file for exactly this reason — and runs it with each filter switched off.
 *
 * **What the fixture is, and what it is not.** The candidate rings the filters *rejected* are, by
 * definition, not in `countries.gen.ts`; they cannot be recovered from the shipped index. So
 * `gen-countries.mjs` writes every rejected candidate ring to
 * `fixtures/golden/forgiveness-drops.json` in the same run that emits the module — a generated
 * artefact, never hand-typed, exactly as I-5's dependency clause requires of every polygon in this
 * repository. Everything *else* the filters need — the code's own coverage rings, and every other
 * entry's rings — is read out of the committed `COUNTRY_INDEX`, so this file cannot drift from the
 * artefact it is asserting about.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { COUNTRY_INDEX } from '../packages/core/src/index.ts';
import { forgivenessFor, overlapsRings, prepRing, prepSet, overlaps } from '../tools/forgiveness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

type Drops = {
  candidateScales: string[];
  candidates: number;
  kept: number;
  dropped: number;
  entries: number;
  codes: string[];
  refusedCodes: string[];
  noCandidates: string[];
  drops: Array<{ code: string; scale: string; filter: 1 | 2; takenFrom: string | null; ring: number[] }>;
};

const DROPS: Drops = JSON.parse(
  readFileSync(resolve(CAIRN, 'fixtures', 'golden', 'forgiveness-drops.json'), 'utf8'),
);

/** Every entry of the shipped index carrying this ISO code. A filled code may carry two. */
const entriesFor = (code: string) => COUNTRY_INDEX.countries.filter((c) => c.code === code);
/** Every other entry, as the filters take them. */
const othersOf = (code: string) =>
  COUNTRY_INDEX.countries.filter((c) => c.code !== code).map((c) => ({ code: c.code, rings: c.rings }));

// ---------------------------------------------------------------- the predicate itself

test('I-5b: overlaps() is true when one ring contains the other, in either direction', () => {
  const big = [0, 0, 10, 0, 10, 10, 0, 10];
  const small = [4, 4, 6, 4, 6, 6, 4, 6];
  assert.equal(overlapsRings(small, [big]), true, 'small inside big');
  assert.equal(overlapsRings(big, [small]), true, 'big around small — clause (b)');
});

test('I-5b: overlaps() is true for crossing edges with no vertex inside either ring', () => {
  // A plus sign: neither rectangle has a vertex inside the other, but eight edges cross.
  const horizontal = [0, 4, 10, 4, 10, 6, 0, 6];
  const vertical = [4, 0, 6, 0, 6, 10, 4, 10];
  assert.equal(overlapsRings(horizontal, [vertical]), true, 'clause (c) — segments cross');
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

// ---------------------------------------------------------------- the two filters, synthetically

test('I-5b: filter 1 keeps a coarser drawing of the same place and drops a disjoint claim', () => {
  const own = [[0, 0, 1, 0, 1, 1, 0, 1]];
  const coarserSamePlace = [-0.2, -0.2, 1.2, -0.2, 1.2, 1.2, -0.2, 1.2];
  const somewhereElse = [50, 50, 51, 50, 51, 51, 50, 51];
  const r = forgivenessFor([coarserSamePlace, somewhereElse], own, []);
  assert.deepEqual(r.kept, [0]);
  assert.deepEqual(r.drops, [{ index: 1, filter: 1, code: null }]);
  // …and with filter 1 removed, the disjoint claim survives. That is the fault, in miniature.
  const noF1 = forgivenessFor([coarserSamePlace, somewhereElse], own, [], { filter1: false });
  assert.deepEqual(noF1.kept, [0, 1]);
});

test('I-5b: filter 2 drops a ring that reaches into another entry, naming which', () => {
  const own = [[0, 0, 1, 0, 1, 1, 0, 1]];
  const neighbour = { code: 'ZZ', rings: [[2, 0, 4, 0, 4, 2, 2, 2]] };
  const spillsOver = [-0.2, -0.2, 3, -0.2, 3, 1.2, -0.2, 1.2];
  const staysHome = [-0.2, -0.2, 1.2, -0.2, 1.2, 1.2, -0.2, 1.2];
  const r = forgivenessFor([spillsOver, staysHome], own, [neighbour]);
  assert.deepEqual(r.kept, [1]);
  assert.deepEqual(r.drops, [{ index: 0, filter: 2, code: 'ZZ' }]);
  const noF2 = forgivenessFor([spillsOver, staysHome], own, [neighbour], { filter2: false });
  assert.deepEqual(noF2.kept, [0, 1]);
});

test('I-5b: filter 1 runs before filter 2 — a ring that fails both is reported against filter 1', () => {
  const own = [[0, 0, 1, 0, 1, 1, 0, 1]];
  const neighbour = { code: 'ZZ', rings: [[50, 50, 60, 50, 60, 60, 50, 60]] };
  const elsewhereAndTaken = [51, 51, 52, 51, 52, 52, 51, 52];
  const r = forgivenessFor([elsewhereAndTaken], own, [neighbour]);
  assert.deepEqual(r.drops, [{ index: 0, filter: 1, code: null }]);
  const noF1 = forgivenessFor([elsewhereAndTaken], own, [neighbour], { filter1: false });
  assert.deepEqual(noF1.drops, [{ index: 0, filter: 2, code: 'ZZ' }]);
});

test('I-5b: the filters are pure — the same call twice gives the same answer and mutates nothing', () => {
  const own = [[0, 0, 1, 0, 1, 1, 0, 1]];
  const cands = [[-0.2, -0.2, 1.2, -0.2, 1.2, 1.2, -0.2, 1.2]];
  const before = JSON.stringify([own, cands]);
  const a = forgivenessFor(cands, own, []);
  const b = forgivenessFor(cands, own, []);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify([own, cands]), before, 'the filters mutated their input');
});

// ---------------------------------------------------------------- the drops fixture is honest

test('I-5b: the drops fixture agrees with the shipped index about who was refused', () => {
  assert.deepEqual(DROPS.candidateScales, ['110m', '50m'], 'the scales strictly coarser than the fill');
  assert.deepEqual([...new Set(DROPS.drops.map((d) => d.scale))], ['50m'], 'only 1:50m produced candidates');
  assert.equal(DROPS.dropped, DROPS.drops.length);
  assert.equal(DROPS.candidates, DROPS.kept + DROPS.dropped);
  // The artefact's own arithmetic: 64 filled codes, 54 with an entry, 10 refused.
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

test('I-5b: every dropped ring is re-dropped by the same filter, run here from the shipped index', () => {
  assert.ok(DROPS.drops.length > 0, 'the fixture records no drops at all');
  for (const d of DROPS.drops) {
    const own = entriesFor(d.code);
    assert.equal(own.length >= 1, true, `${d.code} has no entry in the shipped index`);
    const coverage = own[0].rings.map((r) => [...r]);
    const r = forgivenessFor([d.ring], coverage, othersOf(d.code));
    assert.deepEqual(r.kept, [], `${d.code}: a ring the generator dropped survives here`);
    assert.equal(r.drops[0].filter, d.filter, `${d.code}: dropped by a different filter than recorded`);
  }
});

// ---------------------------------------------------------------- criterion 4(e), injected fault 1

/**
 * **Injected fault 1 — remove filter 2 and the bordered codes gain forgiveness entries.**
 *
 * A-27 Part 4 filter 2: *"A forgiveness ring's whole purpose is to claim ground beyond the
 * waterline; where that ground is another country's, the claim is a wrong answer, not a
 * tolerance."* These seven are the filled codes that have a land neighbour, and their 1:50m
 * polygons all reach into it. With filter 2 in place every one of them is refused; with it deleted
 * every one of them is admitted, which is what makes the filter load-bearing rather than
 * decorative.
 */
test('I-5b injected fault: deleting filter 2 gives AD HK LI MC SG SM SX the entries they were refused', () => {
  const bordered = ['AD', 'HK', 'LI', 'MC', 'SG', 'SM', 'SX'];
  for (const code of bordered) {
    const cands = DROPS.drops.filter((d) => d.code === code).map((d) => d.ring);
    assert.ok(cands.length > 0, `${code} has no recorded candidate rings — the fixture is stale`);
    const coverage = entriesFor(code)[0].rings.map((r) => [...r]);
    const others = othersOf(code);

    const shipped = forgivenessFor(cands, coverage, others);
    assert.deepEqual(shipped.kept, [], `${code} was NOT refused with both filters on`);
    assert.deepEqual(
      shipped.drops.map((d) => d.filter),
      cands.map(() => 2),
      `${code} was refused by filter 1, not filter 2`,
    );

    const faulted = forgivenessFor(cands, coverage, others, { filter2: false });
    assert.equal(
      faulted.kept.length,
      cands.length,
      `${code} gains nothing with filter 2 deleted — filter 2 is not what refuses it`,
    );
  }
  // And it is exactly these seven: every code filter 2 refused is on the list above.
  const byFilter2 = [...new Set(DROPS.drops.filter((d) => d.filter === 2).map((d) => d.code))].sort();
  assert.deepEqual(byFilter2, bordered);
  // Each names the neighbour it would have taken from — the answer that would have been wrong.
  for (const d of DROPS.drops.filter((x) => x.filter === 2)) {
    assert.ok(d.takenFrom && d.takenFrom !== d.code, `${d.code} was refused without naming an encloser`);
  }
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
  const shipped = forgivenessFor(cands, coverage, others);
  assert.deepEqual(shipped.kept, []);
  assert.equal(shipped.drops[0].filter, 1, 'VA is refused by filter 1, not by filter 2');
  assert.equal(overlapsRings(cands[0], coverage), false, 'the 1:50m VA polygon does not touch the 1:10m one');

  // Fault: filter 1 deleted. Filter 2 then catches it — against Italy, which is where it is.
  const noF1 = forgivenessFor(cands, coverage, others, { filter1: false });
  assert.equal(noF1.kept.length, 0, 'with filter 1 gone the ring is still caught, by filter 2');
  assert.equal(noF1.drops[0].filter, 2);
  assert.equal(noF1.drops[0].code, 'IT', 'the ground the 1:50m VA polygon claims is Italy');

  // Fault: both filters deleted — this is the polygon VA would gain, and where it is.
  const none = forgivenessFor(cands, coverage, others, { filter1: false, filter2: false });
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
