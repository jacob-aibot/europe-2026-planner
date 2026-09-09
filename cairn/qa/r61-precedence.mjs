/**
 * QA round 61 — the precedence half of the adversarial pass over I-22 / §8.4 A-83 Part 8,
 * against commit `3b21a63`.
 *
 * Run from `cairn/`:  `node --experimental-strip-types qa/r61-precedence.mjs`
 *
 * A-83 Part 8 lets a PICKED city's country outrank `countryOf`, and stakes the whole ruling on
 * `placeId` being *"what a human picked, never what a system matched"*. This probe attacks that
 * claim from the outside: with a hand-typed code, with a `placeId` that names no shipped row,
 * with a `placeId` that names a row whose country the city then contradicts, and across every
 * transport a `City` takes (round trip, merge, `copyStopInto`, `setTripMeta`, the client store's
 * undo/redo).
 *
 * A `FAIL` line is a finding, a `note` line a recorded fact, a `GAP` line a design question
 * routed rather than asserted. The run ends with a `COMPLETE` line.
 *
 *   A  a hand-typed country code can never beat a coordinate
 *   B  the headline: a picked Geneva reports CH, the same city typed reports FR
 *   C  a DANGLING placeId — no such row, empty string, whitespace, a future dataset's id
 *   D  a placeId that names a REAL row the city then contradicts
 *   E  placeId's transports: round trip, merge, copyStopInto, setTripMeta, undo/redo
 *   F  §0.6 — is any country STRING persisted onto the city as a result of this change?
 *   G  the census: located / unattributed / unlocated over typed, picked and null-centre cities
 *   H  geoCheck takes no anchor from a city with no centre
 *   I  the step-4 drawability fall-through the builder disclosed: can it fire on the corpus?
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CAIRN = dirname(dirname(fileURLToPath(import.meta.url)));
const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);
const gz = await import(pathToFileURL(join(CAIRN, 'packages/core/src/geo/gazetteer.gen.ts')).href);
const client = await import(pathToFileURL(join(CAIRN, 'packages/client/src/index.ts')).href);

let fails = 0, gaps = 0;
const ok = (c, m, x) => { if (c) console.log(`  ok   ${m}`); else { fails++; console.log(`  FAIL ${m}${x === undefined ? '' : `  — ${x}`}`); } };
const note = (m) => console.log(`  note ${m}`);
const gap = (m) => { gaps++; console.log(`  GAP  ${m}`); };
const head = (s) => console.log(`\n== ${s}`);
const J = (v) => JSON.stringify(v);

const ctx = () => ({ ids: core.sequentialIds('r61'), now: '2026-01-01', actorUserId: 'local:self' });
const IDX = core.COUNTRY_INDEX;

/** Build a one-city trip through the real door and read its summary city row back. */
function summaryOf(cityInit) {
  const trip = core.createTrip(
    { title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [cityInit] },
    ctx(),
  );
  const row = core.tripSummary(trip, IDX);
  return { trip, row, city: row.cities[0] };
}
/** The same, but the `City` is written straight into the document (what storage holds). */
function summaryOfRaw(cityPatch) {
  const trip = core.createTrip(
    { title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [{ name: 'X' }] },
    ctx(),
  );
  const doc = JSON.parse(core.toJSON(trip));
  doc.cities[0] = { ...doc.cities[0], ...cityPatch };
  const reopened = core.fromJSON(doc);
  return { trip: reopened, city: core.tripSummary(reopened, IDX).cities[0] };
}

const VIENNA = { lat: 48.2082, lng: 16.3738 };
const GENEVA = gz.GAZETTEER.rows.find((r) => r.fold === 'geneva' && r.countryCode === 'CH');
note(`the shipped Geneva row: ${J(GENEVA)}`);
note(`countryOf(Geneva) = ${J(core.countryOf(GENEVA.centre, IDX))} — the coarse ring's answer`);

// ---------------------------------------------------------------------------
head('A — a hand-typed country code can never beat a coordinate (A-29 Part 3 item 3)');
{
  const cases = [
    ['HU on Vienna', 'HU'], ['lowercase hu', 'hu'], ['padded " HU "', ' HU '],
    ['XX (not in the index)', 'XX'], ['empty', ''],
  ];
  for (const [label, code] of cases) {
    const { city } = summaryOf({ name: 'Vienna', countryCode: code, centre: VIENNA });
    ok(city.countryCode === 'AT' && city.countrySource === 'coordinate',
      `typed ${label}: the coordinate wins (AT/coordinate)`, J({ countryCode: city.countryCode, countrySource: city.countrySource }));
  }
  // The same through storage, where a hand-edited document is the realistic producer.
  const { city } = summaryOfRaw({ name: 'Vienna', countryCode: 'HU', centre: VIENNA, placeId: null });
  ok(city.countryCode === 'AT' && city.countrySource === 'coordinate',
    'a STORED typed city with a mistyped HU still reports AT/coordinate', J(city));
  // And in the coordinate's silence, A-29's gate admits the stated code — unchanged by I-22.
  const nullCentre = summaryOfRaw({ name: 'Vienna', countryCode: 'HU', centre: null, placeId: null });
  note(`a typed city with NO centre and a mistyped HU reports ${J({ c: nullCentre.city.countryCode, s: nullCentre.city.countrySource })} — A-29 Part 3's own arm, unchanged by I-22`);
}

// ---------------------------------------------------------------------------
head('B — the headline: a picked Geneva reports CH, the same city typed reports the ring');
{
  const picked = summaryOfRaw({ name: 'Geneva', countryCode: 'CH', centre: GENEVA.centre, placeId: GENEVA.id });
  ok(picked.city.countryCode === 'CH' && picked.city.countrySource === 'picked',
    'picked Geneva → {CH, picked}', J(picked.city));
  const typed = summaryOfRaw({ name: 'Geneva', countryCode: 'CH', centre: GENEVA.centre, placeId: null });
  ok(typed.city.countrySource === 'coordinate' && typed.city.countryCode === core.countryOf(GENEVA.centre, IDX),
    `the same city typed → {${core.countryOf(GENEVA.centre, IDX)}, coordinate}`, J(typed.city));
  // What the LIFETIME MAP is told, which is the surface A-29 item 3's objection is about.
  const t = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [{ name: 'X' }] }, ctx());
  const mk = (patch) => {
    const d = JSON.parse(core.toJSON(t));
    d.cities[0] = { ...d.cities[0], ...patch };
    return core.tripSummary(core.fromJSON(d), IDX);
  };
  note(`countryCodes with a picked Geneva:   ${J(mk({ name: 'Geneva', countryCode: 'CH', centre: GENEVA.centre, placeId: GENEVA.id }).countryCodes)}`);
  note(`countryCodes with a typed Geneva:    ${J(mk({ name: 'Geneva', countryCode: 'CH', centre: GENEVA.centre, placeId: null }).countryCodes)}`);
  const forged = mk({ name: 'Vienna', countryCode: 'HU', centre: VIENNA, placeId: 'ne:zzzzzzzz' }).countryCodes;
  ok(!forged.includes('HU'),
    'a DANGLING placeId cannot put a mistyped country on the lifetime map',
    `it does: countryCodes = ${J(forged)} for a city at Vienna's coordinate`);
}

// ---------------------------------------------------------------------------
head('C — a DANGLING placeId: evidence of a pick, or evidence of nothing?');
{
  const dangling = [
    ['no such row', 'ne:zzzzzzzz'],
    ['a future dataset', 'gn:2761369'],
    ['no source prefix', 'x'],
    ['the empty string', ''],
    ['whitespace only', '   '],
    ['a colon alone', ':'],
    ['a 4 kB string', 'ne:' + 'a'.repeat(4096)],
    ['the literal "null"', 'null'],
  ];
  for (const [label, pid] of dangling) {
    const { city } = summaryOfRaw({ name: 'Vienna', countryCode: 'HU', centre: VIENNA, placeId: pid });
    const won = city.countryCode === 'HU' && city.countrySource === 'picked';
    console.log(`  ${won ? 'WON ' : 'lost'} placeId ${label.padEnd(18)} → ${J({ c: city.countryCode, s: city.countrySource })}`);
  }
  const { city: e } = summaryOfRaw({ name: 'Vienna', countryCode: 'HU', centre: VIENNA, placeId: '' });
  ok(!(e.countryCode === 'HU' && e.countrySource === 'picked'),
    'an EMPTY-STRING placeId does not fire the picked arm',
    `it does: ${J(e)} — '' is the value A-29 already refuses for countryCode, and it is not a pick`);
  const { city: w } = summaryOfRaw({ name: 'Vienna', countryCode: 'HU', centre: VIENNA, placeId: '   ' });
  ok(!(w.countryCode === 'HU' && w.countrySource === 'picked'),
    'a WHITESPACE placeId does not fire the picked arm', `it does: ${J(w)}`);
  const { city: z } = summaryOfRaw({ name: 'Vienna', countryCode: 'HU', centre: VIENNA, placeId: 'ne:zzzzzzzz' });
  if (z.countryCode === 'HU' && z.countrySource === 'picked') {
    gap('a placeId naming NO shipped row still wins over the coordinate. A-83 Part 8 says the pair '
      + 'came from "ONE shipped gazetteer row" and that "the ROW\'s code is the answer"; nothing '
      + 'checks that the row exists or that it says HU. Routed to the architect, not asserted.');
  }
  // Does anything anywhere validate the shape of a placeId?
  const shapes = ['', '   ', ':', 'ne:', 'nope', 'ne:zzzz'];
  const refused = [];
  for (const s of shapes) {
    try {
      const t = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [{ name: 'V', placeId: s }] }, ctx());
      core.toJSON(t);
    } catch (err) { refused.push(`${J(s)}: ${err.message}`); }
  }
  ok(refused.length === 0, 'createTrip accepts every placeId shape (recorded, not a defect on its own)', refused.join('; '));
  const issues = (() => {
    const t = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [{ name: 'V', placeId: '', centre: VIENNA, countryCode: 'HU' }] }, ctx());
    return core.validateTrip(t).map((i) => i.code);
  })();
  note(`validateTrip on a city with placeId '' and a contradicting code: ${J(issues)}`);
}

// ---------------------------------------------------------------------------
head('D — a placeId that names a REAL row the city then contradicts');
{
  const { city } = summaryOfRaw({ name: 'Geneva', countryCode: 'HU', centre: GENEVA.centre, placeId: GENEVA.id });
  console.log(`  a city carrying Geneva's real row id but countryCode HU → ${J({ c: city.countryCode, s: city.countrySource })}`);
  ok(!(city.countryCode === 'HU'),
    'the ROW\'s code (CH) is the answer, not the city\'s stored string',
    `it is the stored string: A-83 Part 8 clause 2 says "the row's code is the answer"; `
    + `summary.ts reads c.countryCode and never looks the row up`);
  // The same defect reached through a shipped door rather than a hand edit.
  const t0 = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
    cities: [{ key: 'gva', name: 'Geneva', countryCode: 'CH', centre: GENEVA.centre, placeId: GENEVA.id }] }, ctx());
  const before = core.tripSummary(t0, IDX).cities[0];
  const t1 = core.setTripMeta(t0, { cities: [{ ...t0.cities[0], countryCode: 'HU' }] }, ctx());
  const after = core.tripSummary(t1, IDX).cities[0];
  console.log(`  setTripMeta re-typed the code: ${J({ c: before.countryCode, s: before.countrySource })} → ${J({ c: after.countryCode, s: after.countrySource })}`);
  ok(after.countryCode !== 'HU',
    'a shipped door cannot make a TYPED code win by leaving placeId in place',
    'setTripMeta({cities}) replaces countryCode and keeps placeId, so the typed HU is reported as `picked`');
  const t2 = core.setTripMeta(t0, { cities: [{ ...t0.cities[0], centre: VIENNA }] }, ctx());
  const moved = core.tripSummary(t2, IDX).cities[0];
  console.log(`  setTripMeta moved the centre to Vienna, keeping Geneva's placeId → ${J({ c: moved.countryCode, s: moved.countrySource, at: moved.centre })}`);
}

// ---------------------------------------------------------------------------
head('E — placeId\'s transports');
{
  const PID = GENEVA.id;
  const t = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
    cities: [{ key: 'gva', name: 'Geneva', countryCode: 'CH', centre: GENEVA.centre, placeId: PID },
      { key: 'vie', name: 'Vienna', countryCode: 'AT', centre: null }] }, ctx());
  // Round trip.
  const rt = core.fromJSON(JSON.parse(core.toJSON(t)));
  ok(rt.cities[0].placeId === PID && rt.cities[1].placeId === null, 'placeId survives toJSON → fromJSON', J(rt.cities.map((c) => c.placeId)));
  ok(rt.cities[1].centre === null, 'a null centre survives the round trip', J(rt.cities[1].centre));
  const a = core.toJSON(t), b = core.toJSON(rt);
  ok(a === b, 'the emitted bytes are stable across a round trip');
  // Merge between two tabs: same base, each side edits something else.
  const local = core.setTripMeta(t, { title: 'Local edit' }, ctx());
  const remote = core.setTripMeta(t, { party: { adults: 2, children: 0 } }, ctx());
  const merged = core.mergeTrips(t, local, remote);
  const mt = merged.trip ?? merged;
  const mc = (mt.cities ?? []).find((c) => c.key === 'gva');
  ok(mc && mc.placeId === PID, 'placeId survives a three-way merge', J(mc && mc.placeId));
  ok(mt.cities.find((c) => c.key === 'vie').centre === null, 'a null centre survives the merge');
  // A merge where one side re-typed the country and the other did not.
  const reTyped = core.setTripMeta(t, { cities: [{ ...t.cities[0], countryCode: 'HU' }, t.cities[1]] }, ctx());
  const m2 = core.mergeTrips(t, reTyped, t);
  const m2t = m2.trip ?? m2;
  const m2c = m2t.cities.find((c) => c.key === 'gva');
  note(`after merging a re-typed HU against an untouched side: ${J({ countryCode: m2c.countryCode, placeId: m2c.placeId })}`);
  // copyStopInto — cities are refiled, never created, so placeId cannot cross a person boundary.
  const cctx = { ids: core.sequentialIds('cp'), today: '2026-01-01', actorUserId: 'local:self' };
  const src = core.addStop(t, { kind: 'scheduled', dayId: t.days[0].id, time: '09:00', order: 0 },
    { id: 'jet', name: "Jet d'Eau", category: 'sight' }, ctx());
  const dst = core.createTrip({ title: 'Mine', startDate: '2026-08-07', endDate: '2026-08-08',
    cities: [{ key: 'gva2', name: 'Geneva', countryCode: '', centre: null }] }, ctx());
  const out = core.copyStopInto(dst, { trip: src, stopId: 'jet' },
    { kind: 'scheduled', dayId: dst.days[0].id, time: '09:00', order: 0 }, cctx);
  const target = out.cities.find((c) => c.key === 'gva2');
  ok(target.placeId === null && target.centre === null,
    'copyStopInto does NOT carry a source city\'s placeId or centre into the recipient',
    J({ placeId: target.placeId, centre: target.centre }));
  ok(out.cities.length === dst.cities.length, 'copyStopInto minted no new city', `${out.cities.length} vs ${dst.cities.length}`);
}

// ---------------------------------------------------------------------------
head('F — §0.6: is any country STRING persisted onto the city by this change?');
{
  const t = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
    cities: [{ key: 'gva', name: 'Geneva', countryCode: '', centre: GENEVA.centre, placeId: GENEVA.id }] }, ctx());
  const doc = JSON.parse(core.toJSON(t));
  ok(doc.cities[0].countryCode === '', 'the picked arm writes NO country onto the stored city', J(doc.cities[0]));
  const summary = core.tripSummary(core.fromJSON(doc), IDX);
  note(`the summary derives ${J({ c: summary.cities[0].countryCode, s: summary.cities[0].countrySource })} from a city whose stored code is ''`);
  ok(summary.cities[0].countrySource !== 'picked' || summary.cities[0].countryCode !== '',
    'an empty stored code cannot be reported as a picked country', J(summary.cities[0]));
  ok(J(Object.keys(doc.cities[0]).sort()) === J(['centre', 'countryCode', 'key', 'name', 'order', 'placeId'].sort()),
    'the stored City carries exactly the six documented keys — no derived country beside them',
    J(Object.keys(doc.cities[0])));
  // And the summary row is derived on every read, never read back off the document.
  ok(!('countrySource' in doc.cities[0]) && !('countryCodeDerived' in doc.cities[0]),
    'no derivation is cached on the document');
}

// ---------------------------------------------------------------------------
head('G — the census over typed, picked and unlocated cities');
{
  const t = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-08', cities: [
    { key: 'a', name: 'Vienna', countryCode: 'AT', centre: VIENNA },
    { key: 'b', name: 'Typed', countryCode: '', centre: null },
  ] }, ctx());
  const row = core.tripSummary(t, IDX);
  ok(row.cities.length === 2, 'two city rows', String(row.cities.length));
  ok(row.cities.filter((c) => c.centre === null).length === 1, 'exactly one row with centre === null');
  const st = core.travelStats([row], '2026-12-31');
  note(`travelStats: located.cities=${st.located.cities}, unattributed.cities=${st.unattributed.cities}, rows=${row.cities.length}`);
  ok(st.located.cities === 1, 'exactly one LOCATED city', String(st.located.cities));
  const unlocated = row.cities.length - st.located.cities;
  ok(unlocated === 1, 'exactly one UNLOCATED city, as the [stated] criterion asks', String(unlocated));
  note(`ROADMAP's *user-visible outcome* prose asks for "unattributed AND unlocated, by count"; `
     + `unattributed.cities is ${st.unattributed.cities}, so the two readings differ by ${1 - st.unattributed.cities}.`);
  ok(!('unlocated' in st) && !(st.located && 'unlocatedCities' in st),
    'there is NO `unlocated` field on TravelStats — a caller must subtract it themselves',
    `TravelStats keys: ${J(Object.keys(st))}`);
  const zeros = row.cities.filter((c) => c.centre && c.centre.lat === 0 && c.centre.lng === 0);
  ok(zeros.length === 0, 'zero cities at {0,0}', J(zeros));
  // A city with no centre but an accepted stated code still reaches the lifetime map.
  const t2 = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
    cities: [{ key: 'b', name: 'Budapest', countryCode: 'HU', centre: null }] }, ctx());
  const r2 = core.tripSummary(t2, IDX);
  const s2 = core.travelStats([r2], '2026-12-31');
  note(`an UNLOCATED city with a stated HU: row=${J({ c: r2.cities[0].countryCode, s: r2.cities[0].countrySource })}, `
     + `located.cities=${s2.located.cities}, unattributed.cities=${s2.unattributed.cities}, countries=${J(s2.countries.map((c) => c.countryCode ?? c.code ?? Object.keys(c)))}`);
  // Can a SURFACE report "unlocated, by count" from what travelStats hands it? `TravelStats.cities`
  // is grouped by `nameKey` ACROSS trips, so the subtraction the criterion implies is not a count
  // of city records.
  let tn = 0;
  const trip = (title, cities) => core.tripSummary(core.createTrip({ id: `trip_${tn++}`, title, startDate: '2026-08-07', endDate: '2026-08-08', cities }, ctx()), IDX);
  const twoUnlocated = core.travelStats([
    trip('A', [{ key: 'p1', name: 'Paris', countryCode: '', centre: null }]),
    trip('B', [{ key: 'p2', name: 'Paris', countryCode: '', centre: null }]),
  ], '2026-12-31');
  note(`two trips, each with an unlocated Paris: cities=${twoUnlocated.cities.length}, located.cities=${twoUnlocated.located.cities} `
     + `⇒ the subtraction says ${twoUnlocated.cities.length - twoUnlocated.located.cities} unlocated, and there are 2 city records`);
  const mixed = core.travelStats([
    trip('A', [{ key: 'v1', name: 'Vienna', countryCode: 'AT', centre: VIENNA }]),
    trip('B', [{ key: 'v2', name: 'Vienna', countryCode: '', centre: null }]),
  ], '2026-12-31');
  ok(mixed.cities.length - mixed.located.cities === 1,
    'a located Vienna and an unlocated Vienna: the subtraction still finds the unlocated one',
    `cities=${mixed.cities.length}, located.cities=${mixed.located.cities} ⇒ ${mixed.cities.length - mixed.located.cities}, and one city record IS unlocated`);
}

// ---------------------------------------------------------------------------
head('H — geoCheck takes no anchor from a city with no centre');
{
  const t = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
    cities: [{ key: 'a', name: 'Typed', countryCode: '', centre: null }] }, ctx());
  const withStop = core.addStop(t, { kind: 'scheduled', dayId: t.days[0].id, time: '09:00', order: 0 },
    { id: 's1', name: 'Somewhere', category: 'sight',
      place: { kind: 'inline', name: 'Somewhere', at: { lat: 48.2, lng: 16.4 } } }, ctx());
  const findings = core.geoCheck(withStop);
  ok(findings.every((f) => f.anchor?.kind !== 'city_centre' || f.anchor?.cityKey !== 'a'),
    'no finding is anchored on a city with no centre', J(findings.map((f) => f.anchor)));
  note(`geoCheck findings: ${J(findings.map((f) => f.code ?? f.kind ?? Object.keys(f)))}`);
}

// ---------------------------------------------------------------------------
head('I — the step-4 drawability fall-through the builder disclosed');
{
  const rows = gz.GAZETTEER.rows;
  const drawable = new Set(IDX.countries.map((e) => e.code));
  const codes = new Set(rows.map((r) => r.countryCode));
  const outside = [...codes].filter((c) => c !== '' && !drawable.has(c));
  note(`the index draws ${drawable.size} codes; the corpus carries ${codes.size} distinct codes`);
  ok(outside.length === 0, 'zero shipped rows carry a code the index cannot draw — the builder\'s claim',
    J(outside));
  const affected = rows.filter((r) => outside.includes(r.countryCode));
  note(`${affected.length} shipped rows carry one of those codes: ${J(outside.map((c) => `${c}=${rows.filter((r) => r.countryCode === c).length}`))}`);
  for (const c of outside) {
    const r = rows.find((x) => x.countryCode === c);
    const { city } = summaryOfRaw({ name: r.name, countryCode: r.countryCode, centre: r.centre, placeId: r.id });
    console.log(`  picking ${String(r.name).padEnd(18)} (${c}) → ${J({ c: city.countryCode, s: city.countrySource })}  — the fall-through FIRES`);
  }
  const blank = rows.filter((r) => r.countryCode === '');
  note(`${blank.length} shipped rows carry countryCode '': ${J(blank.slice(0, 12).map((r) => r.name))}`);
  if (blank.length) {
    const b = blank[0];
    const { city } = summaryOfRaw({ name: b.name, countryCode: b.countryCode, centre: b.centre, placeId: b.id });
    console.log(`  picking ${b.name} (countryCode '') → ${J({ c: city.countryCode, s: city.countrySource })} — the fall-through, LIVE on the committed corpus`);
  }
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}, ${gaps} GAP(S)`);
console.log('COMPLETE');
process.exit(fails === 0 ? 0 : 1);
