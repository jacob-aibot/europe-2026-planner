/**
 * QA round 33 — re-derive I-8a's min-span criterion from the shipped index, independently.
 *
 * The builder substituted `VA` for the ROADMAP's `AT` in I-8a's second criterion, on the
 * ground that AT's box is 631 km wide and MIN_SPAN_KM is 1.2 km so AT never clamps. This
 * script does not take that on trust: it sweeps EVERY code in the shipped index through the
 * exact corner-collection `worldMapFrame` performs, calls core's own `mapBounds`, and reports
 * which codes clamp. It then checks the injected fault (raw box instead of mapBounds) is
 * genuinely red for the clamping code and green for AT.
 *
 *   cd cairn && node --experimental-strip-types qa/r33-minspan.mjs
 */
import * as core from '../packages/core/src/index.ts';

const idx = core.COUNTRY_INDEX;
let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++; };

// The exact corner collection worldMapFrame does, for one code.
function cornersFor(code) {
  const out = [];
  for (const e of idx.countries.filter((c) => c.code === code)) {
    const [minLng, minLat, maxLng, maxLat] = e.box;
    out.push({ lat: minLat, lng: minLng }, { lat: minLat, lng: maxLng },
             { lat: maxLat, lng: maxLng }, { lat: maxLat, lng: minLng });
  }
  return out;
}

console.log(`# index: scale=${idx.scale} source=${idx.source} entries=${idx.countries.length}`);
const codes = [...new Set(idx.countries.map((c) => c.code))].sort();
console.log(`# distinct codes: ${codes.length}`);
console.log(`# MIN_SPAN_KM = ${core.MIN_SPAN_KM}`);

// --- 1. Sweep every code: which ones clamp? ---
const clamping = [];
const spans = [];
for (const code of codes) {
  const b = core.mapBounds(cornersFor(code));
  spans.push({ code, spanKm: b.spanKm, clamped: b.clamped, empty: b.empty });
  if (b.clamped) clamping.push({ code, spanKm: b.spanKm });
}
spans.sort((a, b) => a.spanKm - b.spanKm);
console.log('# ten smallest one-country spans, as worldMapFrame would compute them:');
for (const s of spans.slice(0, 10)) {
  console.log(`#   ${s.code}  ${s.spanKm.toFixed(4)} km  clamped=${s.clamped}`);
}
console.log(`# codes that clamp: ${clamping.length ? clamping.map((c) => c.code).join(', ') : '(none)'}`);

ok(clamping.length > 0, 'at least one shipped code exercises the MIN_SPAN_KM guard');
ok(clamping.length === 1 && clamping[0].code === 'VA',
   `VA is the ONLY clamping code (builder's claim). got: [${clamping.map((c) => c.code).join(',')}]`);

// --- 2. VA's actual numbers ---
const vaEntries = idx.countries.filter((c) => c.code === 'VA');
console.log(`# VA entries: ${vaEntries.length}`);
for (const e of vaEntries) console.log(`#   box=${JSON.stringify(e.box)} rings=${e.rings.length}`);
const vaB = core.mapBounds(cornersFor('VA'));
console.log(`# VA mapBounds: ${JSON.stringify(vaB)}`);
// raw span, un-clamped
const vaRaw = core.fitSpanKm(cornersFor('VA'));
console.log(`# VA fitSpanKm (already max'd with MIN_SPAN_KM) = ${vaRaw}`);
ok(vaB.clamped === true, 'VA clamps');
ok(vaB.spanKm === core.MIN_SPAN_KM, `VA spanKm is exactly MIN_SPAN_KM (${vaB.spanKm})`);

// --- 3. AT's actual numbers — is the builder's 631 km right? ---
const atB = core.mapBounds(cornersFor('AT'));
console.log(`# AT mapBounds spanKm=${atB.spanKm.toFixed(2)} km clamped=${atB.clamped}`);
ok(atB.clamped === false, 'AT does NOT clamp — the ROADMAP criterion as written is unsatisfiable');
ok(Math.abs(atB.spanKm - 631) < 5, `AT span is ~631 km as BUILD-NOTES reports (got ${atB.spanKm.toFixed(1)})`);

// --- 4. The injected fault, both codes. ---
// The fault A-40's criterion names: build the extent from the country box directly instead of
// through mapBounds. Model it exactly, and compare the derived viewBox both ways.
function viewBoxVia(code, useMapBounds) {
  const cs = cornersFor(code);
  let n, s, e, w;
  if (useMapBounds) {
    const b = core.mapBounds(cs);
    ({ north: n, south: s, east: e, west: w } = b);
  } else {
    n = Math.max(...cs.map((p) => p.lat)); s = Math.min(...cs.map((p) => p.lat));
    e = Math.max(...cs.map((p) => p.lng)); w = Math.min(...cs.map((p) => p.lng));
  }
  const f = (x) => { const r = Math.round(x * 1e4) / 1e4; return Object.is(r, -0) ? '0' : String(r); };
  return `${f(w)} ${f(-n)} ${f(e - w)} ${f(n - s)}`;
}

const vaGood = viewBoxVia('VA', true), vaBad = viewBoxVia('VA', false);
const atGood = viewBoxVia('AT', true), atBad = viewBoxVia('AT', false);
console.log(`# VA viewBox via mapBounds : ${vaGood}`);
console.log(`# VA viewBox via raw box   : ${vaBad}`);
console.log(`# AT viewBox via mapBounds : ${atGood}`);
console.log(`# AT viewBox via raw box   : ${atBad}`);
ok(vaGood !== vaBad, 'the injected fault CHANGES the answer for VA (so a VA assertion can be red)');
ok(atGood === atBad, 'the injected fault does NOT change the answer for AT (so the ROADMAP fault is green as written)');

// --- 5. How wide is the VA frame actually, in degrees, both ways? ---
const vaSpanDegBad = (() => { const cs = cornersFor('VA'); return Math.max(...cs.map(p=>p.lng)) - Math.min(...cs.map(p=>p.lng)); })();
const vaSpanDegGood = vaB.east - vaB.west;
console.log(`# VA lng span raw = ${vaSpanDegBad.toFixed(6)}°, clamped = ${vaSpanDegGood.toFixed(6)}°  (ratio ${(vaSpanDegGood/vaSpanDegBad).toFixed(2)}x)`);
ok(vaSpanDegGood > vaSpanDegBad, 'the guard genuinely widens VA (i.e. it is a rooftop-zoom guard, not a no-op)');

// --- 6. Is the guard MEANINGFUL at world-map scale? A 1.2 km frame is still rooftop zoom. ---
// I-8's own sentence is "a history containing one country must not open at a rooftop zoom".
// Measure what the clamped frame actually shows.
console.log(`# VA clamped frame is ${(vaSpanDegGood * 111.32 * Math.cos(vaB.centre.lat*Math.PI/180)).toFixed(3)} km wide`);
ok(true, `(informational) the clamped VA frame spans ${core.MIN_SPAN_KM} km — see finding text`);

console.log(fail === 0 ? '\n# ALL GREEN' : `\n# ${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
