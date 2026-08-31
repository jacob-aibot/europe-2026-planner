/**
 * QA round 33 — the frame itself: the antimeridian claim, edge clipping, and the A-40 Part 5
 * payload figures, all re-derived rather than quoted from BUILD-NOTES.
 *
 *   cd cairn && node --experimental-strip-types qa/r33-frame.mjs
 */
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame } from '../packages/client/src/selectors/worldMap.ts';

let fail = 0;
const ok = (c, m, x) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${x === undefined ? '' : '  -> ' + JSON.stringify(x)}`); if (!c) fail++; };
const idx = core.COUNTRY_INDEX;
const TODAY = '2026-08-31';
const row = (id, s, e, codes) => ({
  id, title: id, startDate: s, endDate: e, datePrecision: 'exact',
  cityCount: 0, dayCount: 3, stopCount: 0, poolCount: 0, revision: 1,
  countryCodes: codes, cities: [],
  attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
  summaryVersion: core.SUMMARY_VERSION,
});

// ---------------------------------------------------------------------------
console.log('== 1. Is the reference frame actually an ANTIMERIDIAN case? ==');
const REF = ['AT', 'HR', 'CZ', 'HU', 'GB', 'US'];
const ref = worldMapFrame(core.travelStats([row('e26', '2026-08-07', '2026-08-22', REF)], TODAY), idx);
console.log(`# reference viewBox = ${ref.viewBox}`);
const [minX, , w] = ref.viewBox.split(' ').map(Number);
console.log(`# longitude extent: ${minX} .. ${(minX + w).toFixed(4)}  (${w.toFixed(4)}°)`);
for (const c of REF) {
  const e = idx.countries.filter((x) => x.code === c);
  for (const x of e) console.log(`#   ${c} box lng ${x.box[0]} .. ${x.box[2]}   lat ${x.box[1]} .. ${x.box[3]}`);
}
// A dateline case is one where a country's own box crosses ±180, or where the set would be
// narrower if longitudes were re-expressed. Test both.
const anyCross = idx.countries.filter((x) => REF.includes(x.code)).some((x) => x.box[0] <= -179.99 || x.box[2] >= 179.99);
ok(!anyCross, 'NO country in the reference set has a box touching ±180 (this is not a dateline crossing)');
// Would dateline-aware bounds (re-express to [0,360)) actually help?
const lngs = idx.countries.filter((x) => REF.includes(x.code)).flatMap((x) => [x.box[0], x.box[2]]);
const spanA = Math.max(...lngs) - Math.min(...lngs);
const shifted = lngs.map((l) => (l < 0 ? l + 360 : l));
const spanB = Math.max(...shifted) - Math.min(...shifted);
console.log(`# span as-is = ${spanA.toFixed(2)}°, span re-expressed to [0,360) = ${spanB.toFixed(2)}°`);
ok(spanB >= spanA, 'DATELINE-AWARE BOUNDS WOULD NOT NARROW THIS FRAME — the cause is the US being 106° wide, not the dateline', { spanA, spanB });

// ---------------------------------------------------------------------------
console.log('\n== 2. Edge clipping: does the frame leave ANY padding around the extremes? ==');
const east = minX + w;
const maxLng = Math.max(...idx.countries.filter((x) => REF.includes(x.code)).map((x) => x.box[2]));
const minLng = Math.min(...idx.countries.filter((x) => REF.includes(x.code)).map((x) => x.box[0]));
console.log(`# frame east ${east.toFixed(4)} vs easternmost country edge ${maxLng}`);
console.log(`# frame west ${minX.toFixed(4)} vs westernmost country edge ${minLng}`);
ok(east - maxLng > 0.001, 'the frame leaves padding on the east edge', { east, maxLng });
ok(minLng - minX > 0.001, 'the frame leaves padding on the west edge', { minX, minLng });
console.log('# (a country flush against the viewBox edge has the outer half of its non-scaling stroke clipped)');

// ---------------------------------------------------------------------------
console.log('\n== 3. A-40 Part 5 payload — re-measured, not quoted ==');
const bytes = (f) => f.countries.reduce((s, c) => s + Buffer.byteLength(c.d, 'utf8'), 0);
const refBytes = bytes(ref);
console.log(`# reference library (${REF.join(' ')}): ${refBytes} B = ${(refBytes / 1024).toFixed(1)} KB`);
for (const c of ref.countries) console.log(`#   ${c.code} ${Buffer.byteLength(c.d, 'utf8')}`);
ok(refBytes === 11090, 'BUILD-NOTES reports 11,090 B for the reference library', refBytes);

const all = [...new Set(idx.countries.map((c) => c.code))];
const worst = worldMapFrame(core.travelStats([row('all', '2019-01-01', '2019-01-10', all)], TODAY), idx);
const worstBytes = bytes(worst);
console.log(`# worst case the shipped index can produce (${all.length} codes): ${worstBytes} B = ${(worstBytes / 1024).toFixed(1)} KB`);
ok(worstBytes === 374268, 'BUILD-NOTES reports 374,268 B for the index worst case', worstBytes);
ok(worstBytes < 512 * 1024, 'and it is under A-40 Part 5\'s 512 KB ceiling', (worstBytes / 1024).toFixed(1));
ok(worst.missing.length === 0, 'every code in the index draws (missing is empty for the whole index)', worst.missing);
ok(worst.countries.length === all.length, 'one row per code, even for A-27 union codes', { rows: worst.countries.length, codes: all.length });

// ---------------------------------------------------------------------------
console.log('\n== 4. worldMapFrame never throws, on hostile input ==');
const hostile = [
  ['unknown code', ['ZZ']],
  ['not an ISO code at all', ['__proto__']],
  ['empty string', ['']],
  ['lowercase', ['at']],
  ['a very long string', ['A'.repeat(5000)]],
  ['duplicate codes on one row', ['AT', 'AT']],
];
for (const [label, codes] of hostile) {
  let e = null, f = null;
  try { f = worldMapFrame(core.travelStats([row('h', '2019-01-01', '2019-01-10', codes)], TODAY), idx); }
  catch (er) { e = er.message; }
  ok(e === null, `never throws: ${label}`, e);
  if (f) console.log(`#   ${label}: viewBox=${f.viewBox} drawn=${f.countries.length} missing=${JSON.stringify(f.missing)}`);
}
// Empty library
{
  const f = worldMapFrame(core.travelStats([], TODAY), idx);
  console.log(`# empty library viewBox = ${f.viewBox}`);
  ok(f.viewBox === '-180 -90 360 180', 'an empty library frames the whole world rather than 0 0 0 0', f.viewBox);
}
// A code that is in `missing` still counts toward the visible total
{
  const f = worldMapFrame(core.travelStats([row('m', '2019-01-01', '2019-01-10', ['AT', 'ZZ'])], TODAY), idx);
  ok(f.countries.length + f.missing.length === 2, 'drawn + missing accounts for every row', f);
  ok(!f.countries.some((c) => c.code === 'ZZ'), 'and nothing is drawn for the missing one');
}

// ---------------------------------------------------------------------------
console.log('\n== 5. Purity / determinism (cairn-constraints §4) ==');
{
  const stats = core.travelStats([row('p', '2019-01-01', '2019-01-10', REF)], TODAY);
  const a = worldMapFrame(stats, idx);
  const b = worldMapFrame(stats, idx);
  ok(a.viewBox === b.viewBox && JSON.stringify(a.countries) === JSON.stringify(b.countries),
     'two calls with the same input return the same frame');
  ok(a.countries !== b.countries, 'and it is not memoised (A-40 clause 4)');
  const frozenStats = JSON.parse(JSON.stringify(stats));
  worldMapFrame(stats, idx);
  ok(JSON.stringify(stats) === JSON.stringify(frozenStats), 'the input stats are not mutated');
  const idxBefore = JSON.stringify(idx.countries.slice(0, 3));
  worldMapFrame(stats, idx);
  ok(JSON.stringify(idx.countries.slice(0, 3)) === idxBefore, 'the index is not mutated');
  // Row order is stats.countries' canonical order, verbatim.
  ok(a.countries.map((c) => c.code).join() ===
     stats.countries.filter((c) => idx.countries.some((x) => x.code === c.code)).map((c) => c.code).join(),
     'row order is stats.countries verbatim');
}

// ---------------------------------------------------------------------------
console.log('\n== 6. A-40 clause 1: the projection is x=lng, y=-lat with NO scaling constant ==');
{
  const f = worldMapFrame(core.travelStats([row('x', '2019-01-01', '2019-01-10', ['AT'])], TODAY), idx);
  const at = idx.countries.find((c) => c.code === 'AT');
  const first = f.countries[0].d.match(/^M(-?[\d.]+),(-?[\d.]+)/);
  ok(Number(first[1]) === at.rings[0][0], 'the first x is the raw longitude', { got: first[1], want: at.rings[0][0] });
  ok(Number(first[2]) === -at.rings[0][1], 'the first y is the negated latitude', { got: first[2], want: -at.rings[0][1] });
  // No rounding of geometry.
  ok(/\d\.\d{4,}/.test(f.countries[0].d), 'geometry coordinates are emitted verbatim, not rounded');
}

console.log(fail === 0 ? '\n# all green' : `\n# ${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
