/**
 * QA round 24 — **A-28 Part 3's two-arm filter 2**, attacked directly.
 *
 * §1 is synthetic and offline: ring pairs I built for this probe, not the builder's or the
 * architect's fixtures, that isolate each arm. The cases that matter are the ones where the two
 * arms *disagree*, because the ruling's whole claim is that neither substitutes for the other and
 * that a drop is booked against the first arm that fires:
 *
 *   - a ring only **2a** can catch (the shipped index draws the neighbour generously)
 *   - a ring only **2b** can catch (the finest layer draws the neighbour generously) — Macao
 *   - a ring **both** would catch: exactly one drop record, booked against 2a
 *   - filter 1 outranks both, and books `against: null`
 *   - the guard: arm 2b enabled with an empty finest population must throw, not admit
 *
 * §2 is the real thing, from the pinned layers, and re-derives A-28 Part 4's census independently:
 * all 153 candidate rings, each arm run alone, and the set of rings the two arms disagree on.
 *
 * §2 NEEDS THE NETWORK the first time (the three pinned layers, cached in `$TMPDIR/cairn-qa-ne/`);
 * it prints SKIP rather than a false pass if they cannot be had. Run from `cairn/`:
 *
 *   node --experimental-strip-types qa/i5c-filter2.mjs
 *
 * A "FAIL" line means the probe found what it was looking for. See ../docs/QA-FINDINGS.md.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { COUNTRY_INDEX } from '../packages/core/src/index.ts';
import { forgivenessFor } from '../tools/forgiveness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

let fails = 0;
let checks = 0;
const ok = (cond, label, detail = '') => {
  checks++;
  if (cond) console.log(`  OK    ${label}${detail ? `  — ${detail}` : ''}`);
  else {
    fails++;
    console.log(`  FAIL  ${label}${detail ? `  — ${detail}` : ''}`);
  }
};
const note = (s) => console.log(`        ${s}`);

// ------------------------------------------------------------------ §1 synthetic

console.log('\n§1  The two arms in isolation — rings built for this probe, on a clean lattice');

/** An axis-aligned box as a closed flat ring. Degrees; every corner lands on the 1e-4 lattice. */
const box = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1, x0, y0];

// The candidate's own country: a square at the origin. Every candidate below overlaps it, so
// filter 1 passes and the verdict is filter 2's alone (except in case E, which is filter 1's).
const OWN = [box(0, 0, 1, 1)];
// The candidate: our square, nudged east so it reaches into the neighbour's ground at x ∈ [1, 1.5].
const CAND = box(0.5, 0.25, 1.5, 0.75);

// Case A — only 2a can see it. The shipped index draws NB generously (it reaches back to x=1.2);
// NB's finest drawing is the honest, smaller one and stops at x=1.8, clear of the candidate.
const A = {
  others: [{ code: 'NB', rings: [box(1.2, -1, 3, 2)] }],
  finest: [{ code: 'NB', rings: [box(1.8, -1, 3, 2)] }],
};
// Case B — only 2b can see it. This is Macao's shape: the index's own drawing of NB is coarse and
// sits away from the border (x ≥ 1.8), while NB's finest drawing owns the ground at x ≥ 1.2 that
// the candidate reaches into. Arm 2a has nothing to reject it with.
const B = {
  others: [{ code: 'NB', rings: [box(1.8, -1, 3, 2)] }],
  finest: [{ code: 'NB', rings: [box(1.2, -1, 3, 2)] }],
};
// Case C — both arms would reject it independently.
const C = {
  others: [{ code: 'NB', rings: [box(1.2, -1, 3, 2)] }],
  finest: [{ code: 'NB', rings: [box(1.1, -1, 3, 2)] }],
};
// Case D — neither arm sees it: both drawings of NB stop east of the candidate.
const D = {
  others: [{ code: 'NB', rings: [box(1.8, -1, 3, 2)] }],
  finest: [{ code: 'NB', rings: [box(1.9, -1, 3, 2)] }],
};

const run = (c, opts = {}) => forgivenessFor([CAND], OWN, c.others, c.finest, opts);

// A — 2a catches it, and it stays caught with both arms on (2a runs first).
{
  const both = run(A);
  const only2a = run(A, { filter2b: false });
  const only2b = run(A, { filter2a: false });
  ok(both.kept.length === 0 && both.drops.length === 1, 'A: one drop, booked once, no double-counting');
  ok(both.drops[0].filter === 2 && both.drops[0].against === 'coverage' && both.drops[0].code === 'NB', 'A: booked against arm 2a naming NB', JSON.stringify(both.drops[0]));
  ok(only2a.drops.length === 1 && only2a.drops[0].against === 'coverage', 'A: arm 2a alone still catches it');
  ok(only2b.kept.length === 1 && only2b.drops.length === 0, 'A: arm 2b alone does NOT catch it — the arms genuinely differ here');
}
// B — Macao's case. Only 2b catches it; with both on, the drop is booked against 'finest'.
{
  const both = run(B);
  const only2a = run(B, { filter2b: false });
  const only2b = run(B, { filter2a: false });
  ok(both.kept.length === 0 && both.drops.length === 1, 'B: one drop, booked once');
  ok(both.drops[0].filter === 2 && both.drops[0].against === 'finest' && both.drops[0].code === 'NB', 'B: booked against arm 2b naming NB — 2a running first does not mask it', JSON.stringify(both.drops[0]));
  ok(only2a.kept.length === 1 && only2a.drops.length === 0, 'B: arm 2a alone ADMITS it — this is QA R23-1 exactly');
  ok(only2b.drops.length === 1 && only2b.drops[0].against === 'finest', 'B: arm 2b alone catches it');
}
// C — both would reject. Exactly one record, and it belongs to the first arm.
{
  const both = run(C);
  ok(both.drops.length === 1, 'C: both arms would reject and exactly ONE drop is recorded', `${both.drops.length}`);
  ok(both.drops[0].against === 'coverage', 'C: the record belongs to the first arm that fires, not the last', `${both.drops[0].against}`);
  ok(run(C, { filter2b: false }).drops.length === 1 && run(C, { filter2a: false }).drops.length === 1, 'C: each arm alone rejects it too — the disagreement set excludes it');
}
// D — neither. Kept, and `kept` indexes back into `candidates`.
{
  const both = run(D);
  ok(both.kept.length === 1 && both.kept[0] === 0 && both.drops.length === 0, 'D: neither arm fires, the ring is kept and indexed by position');
}
// E — filter 1 outranks both arms and books `against: null`.
{
  const far = box(50, 50, 51, 51);
  const r = forgivenessFor([far], OWN, C.others, C.finest);
  ok(r.drops.length === 1 && r.drops[0].filter === 1 && r.drops[0].against === null && r.drops[0].code === null, 'E: filter 1 fires first and books {filter:1, code:null, against:null}', JSON.stringify(r.drops[0]));
}
// F — the guard. Arm 2b on with nothing to compare against must throw, never admit.
{
  let threw = 0;
  for (const arg of [[], undefined, null]) {
    try {
      forgivenessFor([CAND], OWN, A.others, arg);
    } catch {
      threw++;
    }
  }
  ok(threw === 3, 'F: an empty / missing / null finest population throws when arm 2b is on', `${threw}/3`);
  let okDisabled = false;
  try {
    const r = forgivenessFor([CAND], OWN, D.others, [], { filter2b: false });
    okDisabled = r.kept.length === 1;
  } catch {
    okDisabled = false;
  }
  ok(okDisabled, 'F: disabling arm 2b deliberately makes an empty finest population legal');
}
// G — the arms do not read each other's population. If 2a's population is empty but 2b's is not,
//     2b must still fire; the reverse must hold too.
{
  const r1 = forgivenessFor([CAND], OWN, [], B.finest);
  ok(r1.drops.length === 1 && r1.drops[0].against === 'finest', 'G: an empty coverage population does not disable arm 2b');
  const r2 = forgivenessFor([CAND], OWN, A.others, A.finest, { filter2b: false });
  ok(r2.drops.length === 1 && r2.drops[0].against === 'coverage', 'G: arm 2a is unaffected by 2b being off');
}
// H — the candidate's own code is excluded from both populations by the CALLER, not the callee.
//     Stated because it is the one place a caller can reintroduce the bug: if `others` or
//     `finestOthers` still carried the candidate's own code, every ring would be refused.
{
  const self = forgivenessFor([CAND], OWN, [{ code: 'SELF', rings: OWN }], [{ code: 'SELF', rings: OWN }]);
  ok(self.drops.length === 1, 'H: forgivenessFor does NOT exclude a self-named entry — the generator must, and does');
}

// ------------------------------------------------------------------ §2 the real census

console.log('\n§2  A-28 Part 4’s census, re-derived from the pinned layers rather than read');

const PINS = {
  '110m': { file: 'ne_110m_admin_0_countries.geojson', bytes: 838726, sha: 'ec50fa3e6b9b8ff4d5bb1e5d2d9b0e4a' },
  '50m': { file: 'ne_50m_admin_0_countries.geojson', bytes: 3083490 },
  '10m': { file: 'ne_10m_admin_0_countries.geojson', bytes: 13287234 },
};
const CACHE = resolve(tmpdir(), 'cairn-qa-ne');
const layer = async (key) => {
  const p = resolve(CACHE, PINS[key].file);
  let buf = existsSync(p) ? readFileSync(p) : null;
  if (!buf) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/${PINS[key].file}`,
      );
      if (res.ok) {
        buf = Buffer.from(await res.arrayBuffer());
        mkdirSync(CACHE, { recursive: true });
        writeFileSync(p, buf);
      }
    } catch {
      buf = null;
    }
  }
  if (!buf || buf.length !== PINS[key].bytes) return null;
  return JSON.parse(buf.toString('utf8'));
};

const geo = { '110m': await layer('110m'), '50m': await layer('50m'), '10m': await layer('10m') };
if (!geo['110m'] || !geo['50m'] || !geo['10m']) {
  console.log('\nSKIP §2 — the pinned layers are not reachable or do not match their byte counts.\n');
  console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`} — ${checks} checks (§2 skipped)\n`);
  process.exit(fails === 0 ? 0 : 0);
}

/** The generator's own quantisation, re-implemented here rather than imported. */
const q = (n) => Math.round(n * 1e4) / 1e4;
const buildLayer = (g) => {
  const byCode = new Map();
  for (const f of g.features) {
    const c = f.properties.ISO_A2_EH;
    if (!(typeof c === 'string' && /^[A-Z]{2}$/.test(c))) continue;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const l = byCode.get(c) ?? [];
    for (const p of polys) for (const r of p) l.push(r.flat().map(q));
    byCode.set(c, l);
  }
  return byCode;
};
const L110 = buildLayer(geo['110m']);
const L50 = buildLayer(geo['50m']);
const L10 = buildLayer(geo['10m']);
note(`layers: 110m ${L110.size} codes, 50m ${L50.size}, 10m ${L10.size}`);

// The coverage-only index, from the shipped artefact minus the recorded forgiveness positions.
const DROPS = JSON.parse(readFileSync(resolve(CAIRN, 'fixtures/golden/forgiveness-drops.json'), 'utf8'));
const at = new Set(DROPS.forgivenessAt);
const coverage = COUNTRY_INDEX.countries
  .filter((_, i) => !at.has(i))
  .map((e) => ({ code: e.code, rings: e.rings.map((r) => [...r]) }));
ok(coverage.length === 239 && new Set(coverage.map((e) => e.code)).size === 239, 'the coverage-only index is 239 entries over 239 codes', `${coverage.length}`);
const filled = coverage.map((e) => e.code).filter((c) => !L110.has(c));
ok(filled.length === 64, 'the base omits 64 codes — those are the filled ones', `${filled.length}`);

const finestAll = coverage.map((e) => ({ code: e.code, rings: L10.get(e.code) ?? [] }));
ok(finestAll.every((e) => e.rings.length > 0), 'every coverage code has a 1:10m drawing — A-28’s “selects one layer today”');

const byCode = new Map(coverage.map((e) => [e.code, e]));
const verdicts = new Map(); // `${code}[${i}]` -> {a, b}
let candidates = 0;
let survived1 = 0;
for (const code of filled) {
  const cand = (L50.get(code) ?? []).concat(L110.get(code) ?? []);
  if (!cand.length) continue;
  candidates += cand.length;
  const others = coverage.filter((e) => e.code !== code);
  const finest = finestAll.filter((e) => e.code !== code);
  const only2a = forgivenessFor(cand, byCode.get(code).rings, others, finest, { filter2b: false });
  const only2b = forgivenessFor(cand, byCode.get(code).rings, [], finest, { filter2a: false });
  const both = forgivenessFor(cand, byCode.get(code).rings, others, finest);
  for (let i = 0; i < cand.length; i++) {
    const da = only2a.drops.find((d) => d.index === i);
    const db = only2b.drops.find((d) => d.index === i);
    const dboth = both.drops.find((d) => d.index === i);
    if (da?.filter === 1) continue; // filter 1's, in every row
    survived1++;
    verdicts.set(`${code}[${i}]`, {
      a: da ? da.code : null,
      b: db ? db.code : null,
      both: dboth ? `${dboth.against}:${dboth.code}` : 'kept',
    });
  }
}
note(`${candidates} candidate rings, ${survived1} of them survive filter 1`);
ok(candidates === 153, 'exactly 153 candidate rings, as A-28 Part 2 counts them', `${candidates}`);
ok(survived1 === 151, '151 survive filter 1', `${survived1}`);

const disagree = [...verdicts.entries()].filter(([, v]) => (v.a === null) !== (v.b === null));
note(`rings the two arms disagree on: ${disagree.map(([k, v]) => `${k} (2a ${v.a ?? 'pass'}, 2b ${v.b ?? 'pass'})`).join('; ') || 'none'}`);
ok(disagree.length === 4, 'exactly four rings get different verdicts from the two arms', `${disagree.length}`);
const dmap = Object.fromEntries(disagree.map(([k, v]) => [k, `${v.a ?? 'pass'}/${v.b ?? 'pass'}`]));
ok(dmap['MO[0]'] === 'pass/CN', 'MO[0]: arm 2a passes it, arm 2b rejects it naming CN', dmap['MO[0]']);
ok(dmap['HK[1]'] === 'CN/pass' && dmap['HK[2]'] === 'CN/pass', 'HK[1] and HK[2]: arm 2a rejects naming CN, arm 2b passes', `${dmap['HK[1]']} ${dmap['HK[2]']}`);
ok(dmap['SG[0]'] === 'MY/pass', 'SG[0]: arm 2a rejects naming MY, arm 2b passes', dmap['SG[0]']);
ok(
  [...verdicts.values()].filter((v) => v.a !== null && v.b !== null).length + [...verdicts.values()].filter((v) => v.a === null && v.b === null).length === survived1 - 4,
  'the other 147 rings receive the same verdict from both arms',
);
// And the shipped run's own bookkeeping agrees with the per-arm one, ring by ring.
const wrongArm = [...verdicts.entries()].filter(([, v]) => {
  const want = v.a !== null ? `coverage:${v.a}` : v.b !== null ? `finest:${v.b}` : 'kept';
  return v.both !== want;
});
ok(wrongArm.length === 0, 'every drop the two-arm run books names the arm the per-arm runs predict', wrongArm.map(([k]) => k).join(' '));
ok(
  [...verdicts.values()].filter((v) => v.both.startsWith('finest')).length === 1,
  'exactly one ring in the whole pass is booked against arm 2b',
);

// ------------------------------------------------------------------ §3 the population's own edge

console.log('\n§3  What neither arm can see: the finest layer’s code-LESS features');

// A-28 defines arm 2b's population as "any ISO code `c` … that the coverage-only index carries".
// Natural Earth's 1:10m layer also carries features with no ISO alpha-2 at all — `build()` drops
// them by design (§8.4: a disputed area is reported as unattributed, not given an invented code).
// So ground the finest layer attributes to N. Cyprus or Somaliland is invisible to BOTH arms. That
// is a correct consequence of the `null` rule, but it is a hole in the filter's population and
// nobody has measured whether any admitted ring falls in it.
const codeless = [];
for (const f of geo['10m'].features) {
  const c = f.properties.ISO_A2_EH;
  if (typeof c === 'string' && /^[A-Z]{2}$/.test(c)) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const rings = [];
  for (const p of polys) for (const r of p) rings.push(r.flat().map(q));
  codeless.push({ name: f.properties.NAME, sovereign: f.properties.SOVEREIGNT, rings });
}
note(`${codeless.length} code-less features at 1:10m: ${codeless.map((c) => c.name).join(', ') || 'none'}`);
const admittedRings = [];
for (const i of DROPS.forgivenessAt) for (const r of COUNTRY_INDEX.countries[i].rings) admittedRings.push({ code: COUNTRY_INDEX.countries[i].code, ring: [...r] });
const hits = [];
for (const cl of codeless) {
  const set = { code: cl.name, rings: cl.rings };
  for (const a of admittedRings) {
    const r = forgivenessFor([a.ring], [a.ring], [], [set], { filter1: false, filter2a: false });
    if (r.drops.length) hits.push(`${a.code} → ${cl.name}`);
  }
}
ok(hits.length === 0, 'no admitted forgiveness ring claims ground the 1:10m layer gives a code-LESS entity', hits.join('; '));
note('If one ever did, neither arm would refuse it: both populations are keyed by ISO code.');

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`} — ${checks} checks\n`);
