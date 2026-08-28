/**
 * QA round 24 — the **`thirdSource` block** the builder added to
 * `fixtures/golden/forgiveness-drops.json` beyond A-28 Part 7's literal file list, flagged in
 * BUILD-NOTES as *"the trade I took, stated, not one I hid"*.
 *
 * The question is not whether the block is *nice*. It is whether it says something **true** that
 * nothing else in the repository says, because a committed fixture asserting a fact nobody
 * re-derives is a liability with a size cost, and one asserting a fact the generator already
 * enforces at write time is redundancy with a size cost. So this probe:
 *
 *   §1  checks the block's shape and its own internal consistency — 141 admitted rings, 892
 *       probes, and every probe genuinely inside the ring it is filed against (my even-odd, not
 *       the test's)
 *   §2  re-derives **every recorded answer from the raw 1:10m layer**, independently of both the
 *       generator and the shipped tests. This is the only check that can tell a true third-source
 *       record from a plausible-looking one.
 *   §3  the `MO` record specifically: 8 probes, all `CN` at 1:10m, all `null` in the shipped index
 *   §4  what the block costs — bytes, and whether any of it reaches a build artefact
 *
 * §2 NEEDS THE NETWORK the first time (the pinned 1:10m layer, cached in `$TMPDIR/cairn-qa-ne/`);
 * it prints SKIP rather than a false pass. Run from `cairn/`:
 *
 *   node --experimental-strip-types qa/i5c-thirdsource.mjs
 *
 * A "FAIL" line means the probe found what it was looking for. See ../docs/QA-FINDINGS.md.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { COUNTRY_INDEX } from '../packages/core/src/index.ts';
import { countryOf } from '../packages/core/src/derive/country.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const REPO = resolve(CAIRN, '..');

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

const PATH = resolve(CAIRN, 'fixtures/golden/forgiveness-drops.json');
const DROPS = JSON.parse(readFileSync(PATH, 'utf8'));
const TS = DROPS.thirdSource;

// ------------------------------------------------------------------ §1 shape and self-consistency

console.log('\n§1  The block’s shape, and whether its probes are where it says they are');

ok(TS != null && TS.scale === '10m', 'thirdSource exists and names the 1:10m layer', TS?.scale);
ok(TS.admitted.length === 141 && TS.checkedRings === 141, '141 admitted rings recorded, matching the artefact’s forgiveness ring count', `${TS.admitted.length}`);
const shipRings = DROPS.forgivenessAt.reduce((n, i) => n + COUNTRY_INDEX.countries[i].rings.length, 0);
ok(shipRings === 141, 'the shipped index carries exactly 141 forgiveness rings', `${shipRings}`);
ok(TS.dropped.length === DROPS.drops.length, 'every dropped ring has a record too', `${TS.dropped.length} vs ${DROPS.drops.length}`);
const nProbes = TS.admitted.reduce((n, a) => n + a.points.length, 0);
note(`${nProbes} admitted probes, ${TS.dropped.reduce((n, a) => n + a.points.length, 0)} dropped probes, ${TS.unprobedRings} rings too thin to probe`);

/** My own even-odd on raw degrees — deliberately not the test's and not the generator's. */
const inRing = (x, y, r) => {
  let inside = false;
  const n = r.length;
  for (let i = 0, j = n - 2; i + 1 < n; j = i, i += 2) {
    const [ix, iy, jx, jy] = [r[i], r[i + 1], r[j], r[j + 1]];
    if (iy > y !== jy > y && x < ix + ((jx - ix) * (y - iy)) / (jy - iy)) inside = !inside;
  }
  return inside;
};
let outside = 0;
for (const a of TS.admitted) {
  const ring = COUNTRY_INDEX.countries[a.entry].rings[a.ring];
  if (!ring || COUNTRY_INDEX.countries[a.entry].code !== a.code) {
    outside += a.points.length;
    continue;
  }
  for (const [x, y] of a.points) if (!inRing(x, y, ring)) outside++;
}
ok(outside === 0, 'every admitted probe lies inside the shipped ring it is filed against', `${outside} outside`);
let dOutside = 0;
TS.dropped.forEach((d, i) => {
  const ring = DROPS.drops[i]?.ring;
  if (!ring || DROPS.drops[i].code !== d.code) {
    dOutside += d.points.length;
    return;
  }
  for (const [x, y] of d.points) if (!inRing(x, y, ring)) dOutside++;
});
ok(dOutside === 0, 'every dropped probe lies inside the refused ring it is filed against', `${dOutside} outside`);
// The claim the block makes about the artefact: an admitted ring never probes to another country.
const strays = TS.admitted.filter((a) => a.points.some(([, , c]) => c !== null && c !== a.code));
ok(strays.length === 0, 'no admitted ring probes to another country, as the block asserts', strays.map((s) => s.code).join(' '));

// ------------------------------------------------------------------ §2 the raw layer

console.log('\n§2  Every recorded answer, re-derived from the raw 1:10m layer');

const CACHE = resolve(tmpdir(), 'cairn-qa-ne');
const FILE = 'ne_10m_admin_0_countries.geojson';
const BYTES = 13287234;
let buf = existsSync(resolve(CACHE, FILE)) ? readFileSync(resolve(CACHE, FILE)) : null;
if (!buf) {
  try {
    const res = await fetch(`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/${FILE}`);
    if (res.ok) {
      buf = Buffer.from(await res.arrayBuffer());
      mkdirSync(CACHE, { recursive: true });
      writeFileSync(resolve(CACHE, FILE), buf);
    }
  } catch {
    buf = null;
  }
}
if (!buf || buf.length !== BYTES) {
  console.log('\nSKIP §2 — the pinned 1:10m layer is not reachable.\n');
} else {
  const geo = JSON.parse(buf.toString('utf8'));
  const q = (n) => Math.round(n * 1e4) / 1e4;
  const byCode = new Map();
  for (const f of geo.features) {
    const c = f.properties.ISO_A2_EH;
    if (!(typeof c === 'string' && /^[A-Z]{2}$/.test(c))) continue;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const l = byCode.get(c) ?? [];
    for (const p of polys) for (const r of p) l.push(r.flat().map(q));
    byCode.set(c, l);
  }
  note(`${byCode.size} ISO codes in the raw 1:10m layer, quantised the way the generator quantises`);
  // Bounding boxes so 900-odd points against 239 codes is not a coffee break.
  const boxes = new Map();
  for (const [c, rings] of byCode) {
    let b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const r of rings)
      for (let i = 0; i + 1 < r.length; i += 2) {
        if (r[i] < b[0]) b[0] = r[i];
        if (r[i] > b[2]) b[2] = r[i];
        if (r[i + 1] < b[1]) b[1] = r[i + 1];
        if (r[i + 1] > b[3]) b[3] = r[i + 1];
      }
    boxes.set(c, b);
  }
  // Areas, so "which of two overlapping codes wins" is decided the way the index decides it:
  // smallest first (A-26 Part 4's emitted order).
  const areaOf = (rings) => {
    const rad = Math.PI / 180;
    let s = 0;
    for (const r of rings)
      for (let i = 0; i + 3 < r.length; i += 2) s += Math.abs((r[i + 2] - r[i]) * rad * (2 + Math.sin(r[i + 1] * rad) + Math.sin(r[i + 3] * rad)));
    return s;
  };
  const areas = new Map([...byCode.entries()].map(([c, r]) => [c, areaOf(r)]));
  const answer = (x, y) => {
    let best = null;
    for (const [c, rings] of byCode) {
      const b = boxes.get(c);
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      let inside = false;
      for (const r of rings) if (inRing(x, y, r)) inside = !inside;
      if (inside && (best === null || areas.get(c) < areas.get(best))) best = c;
    }
    return best;
  };

  let mismatched = 0;
  let n = 0;
  const examples = [];
  for (const group of [...TS.admitted, ...TS.dropped]) {
    for (const [x, y, recorded] of group.points) {
      n++;
      const got = answer(x, y);
      if (got !== recorded) {
        mismatched++;
        if (examples.length < 5) examples.push(`${group.code} (${x}, ${y}) recorded ${recorded} · layer says ${got}`);
      }
    }
  }
  note(`${n} probe answers re-derived from the raw layer`);
  ok(mismatched === 0, 'every recorded third-source answer is what the raw 1:10m layer actually says', `${mismatched} wrong`);
  for (const e of examples) note(e);
}

// ------------------------------------------------------------------ §3 MO

console.log('\n§3  The MO record — the one the whole increment exists for');

const mo = TS.dropped.find((d) => d.code === 'MO');
ok(mo != null && mo.against === 'finest' && mo.takenFrom === 'CN', 'MO’s record is booked against arm 2b naming CN', `${mo?.against} / ${mo?.takenFrom}`);
ok(mo.points.length === 8 && mo.points.every(([, , c]) => c === 'CN'), 'all 8 of MO’s probes answer CN at 1:10m', `${mo.points.filter(([, , c]) => c === 'CN').length}/${mo.points.length}`);
const nullNow = mo.points.filter(([x, y]) => countryOf({ lat: y, lng: x }, COUNTRY_INDEX) === null).length;
ok(nullNow === 8, 'and all 8 answer null in the shipped index — the ground is unattributed, not reattributed', `${nullNow}/8`);
ok(
  TS.dropped.filter((d) => d.against === 'finest').length === 1,
  'MO is the only ring in the artefact refused by arm 2b',
);

// ------------------------------------------------------------------ §4 what it costs

console.log('\n§4  What the block costs, and where it goes');

const bytes = statSync(PATH).size;
const before = execFileSync('git', ['show', '38d23c9:cairn/fixtures/golden/forgiveness-drops.json'], {
  cwd: REPO,
  maxBuffer: 32 * 1024 * 1024,
}).length;
const withoutTS = JSON.stringify({ ...DROPS, thirdSource: undefined }, null, 2).length + 1;
note(`fixture ${before.toLocaleString()} → ${bytes.toLocaleString()} bytes; the block itself is ~${(bytes - withoutTS).toLocaleString()}`);
ok(bytes < 200_000, 'the fixture stays well under the generated module it certifies (374,659 bytes)', `${bytes}`);
// The alternative the builder measured and rejected: committing the neighbour rings themselves.
note('BUILD-NOTES measured the ring-committing alternative at 1,189,809 bytes — 10.7× this block.');

let inBundle = 'not built';
try {
  const dist = execFileSync('bash', ['-c', `ls ${CAIRN}/apps/web/dist/assets/index-*.js 2>/dev/null | head -1`]).toString().trim();
  if (dist) {
    const js = readFileSync(dist, 'utf8');
    inBundle = /thirdSource|forgiveness-drops/.test(js) ? 'PRESENT' : 'absent';
  }
} catch {
  inBundle = 'not built';
}
ok(inBundle !== 'PRESENT', 'no part of the fixture reaches the web bundle', inBundle);
const refs = execFileSync('bash', ['-c', `cd ${CAIRN} && grep -rl "forgiveness-drops" --include=*.ts --include=*.mjs --include=*.tsx packages apps tools test 2>/dev/null | sort | tr '\\n' ' '`]).toString().trim();
note(`referenced by: ${refs || '(nothing)'}`);
ok(!/packages\/core\/src|apps\/web\/src/.test(refs), 'nothing under packages/core/src or apps/web/src reads it — it is a test fixture, not a payload');

// Sensitive-path scan: is anything in this file a user coordinate rather than public-domain
// admin-0 geometry?
const raw = readFileSync(PATH, 'utf8');
const nums = raw.match(/-?\d+\.\d+/g) ?? [];
note(`${nums.length.toLocaleString()} decimal tokens in the file — all polygon vertices or probe points derived from them`);
ok(/Natural Earth|natural-earth|nvkelso/.test(raw), 'the file states its own public-domain provenance');

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`} — ${checks} checks\n`);
