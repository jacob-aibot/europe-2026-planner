/**
 * QA round 54 — the **Phase 2 phase gate** breaker pass (ROADMAP `I-11`).
 *
 * Run from anywhere:
 *   node --experimental-strip-types cairn/qa/r54-gate.mjs
 *
 * This is not an increment probe. It re-derives EVERY exit criterion in ROADMAP's
 * *"Exit criteria — the Phase 2 ship gate"* section from the code, independently of the
 * `npm test` suite that implements them — the criterion's own words are *"re-derived rather
 * than quoted"*, and a suite assertion is a quote until something outside the suite computes
 * the same number.
 *
 * A `FAIL` line is a finding. A `note` line is a fact recorded rather than an expectation.
 * A `GAP` line is a known, routed, open item that this round confirms is still open and does
 * not count as a new finding.
 *
 * The run always ends with a `COMPLETE` marker (A-69 Part 9 / R49-2 / R51-5). **A run without
 * that line is INCOMPLETE and its counts may not be quoted.**
 *
 * Section index
 *   A  EC-1  Phase 1's §A–§F numbers, re-derived: 2 blockers, the warning/note set, 0/112,
 *            0/94, 112/112, 92/94, and the rule `class` of every one of them
 *   B  EC-2  the rule-class injected fault at both clock boundaries
 *   C  EC-3  a past trip is silent, and its injected fault
 *   D  EC-4  country attribution, four parts (a producers, b holes, c ISO fill, d/e faults)
 *   E  EC-5  the generated index is inside its budget, measured not quoted
 *   F  EC-6  statistics cannot be stored (a′ b′ b″ b‴ b⁗ c)
 *   G  EC-7  the day skeleton cap, at both edges and through the product path
 *   H  EC-8  the summary is only as fresh as the write that minted it, plus revision 23's cost
 *   I  EC-9  participation grants nothing — the §6.2 conformance double-run
 *   J  EC-10 round-trip and undo parity over participants and datePrecision
 *   K  EC-11 every action maps 1:1 onto a core build function
 *   L  EC-12 NO SILENT LOSS — the closed list of six `state.doc` assignments
 *   M  EC-13 the row is exactly the allow-list: 24 leaves, 14 keys, 8 count fields
 *   N  EC-14 no coordinate leaves the device's own storage
 *   O  EC-15 the photo subsystem with no browser; no package.json / lockfile movement
 *   P  EC-E  the export surface, counted rather than assumed, against §2.10
 *   Q  the phase attack list, run end to end (the country/edge cases named in ROADMAP)
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

let fails = 0;
let gaps = 0;
let notes = 0;
const failLines = [];

function ok(label, cond, detail) {
  if (cond) {
    console.log(`ok   ${label}`);
  } else {
    fails++;
    failLines.push(label);
    console.log(`FAIL ${label}${detail === undefined ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
  }
}
function eq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(label, a === e, a === e ? undefined : `got ${a} want ${e}`);
}
function note(label, detail) {
  notes++;
  console.log(`note ${label}${detail === undefined ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
}
function gap(label, detail) {
  gaps++;
  console.log(`GAP  ${label}${detail === undefined ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
}
function section(name) {
  console.log(`\n=== ${name} ===`);
}
function threw(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
}

const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
const { loadEurope2026, FIXTURE_TODAY, FIXTURE_NOW } = await import(resolve(CAIRN, 'fixtures/loadEurope2026.mjs'));
const goldenFile = (n) => JSON.parse(readFileSync(resolve(CAIRN, 'fixtures/golden', n), 'utf8'));

const REF = loadEurope2026();
const TRIP = REF.trip;

// ---------------------------------------------------------------------------
section('A — EC-1: Phase 1’s carried-forward numbers, re-derived from the code');
// ---------------------------------------------------------------------------
{
  // A1. detectConflicts at the goldens' fixed clock: exactly 2 blockers, both legacy_flag,
  // on Aug 18 and Aug 20. Derived from the function, then compared with the golden — the
  // golden is the artefact under test here, not the source of the number.
  const conflicts = core.detectConflicts(TRIP, { today: FIXTURE_TODAY });
  const blockers = conflicts.filter((c) => c.severity === 'blocker');
  eq('A1  detectConflicts @ 2026-08-01 returns exactly 2 blockers', blockers.length, 2);
  eq('A1a both blockers are legacy_flag', [...new Set(blockers.map((c) => c.ruleId))], ['legacy_flag']);
  eq(
    'A1b the two blocker days are 2026-08-18 and 2026-08-20',
    blockers.flatMap((c) => c.subjects.map((s) => `${s.kind}:${s.id}`)).sort(),
    ['day:2026-08-18', 'day:2026-08-20'],
  );

  const bySeverity = {};
  for (const c of conflicts) bySeverity[c.severity] = (bySeverity[c.severity] ?? 0) + 1;
  note('A1c the full severity census at the fixed clock', bySeverity);
  const byRule = {};
  for (const c of conflicts) byRule[c.ruleId] = (byRule[c.ruleId] ?? 0) + 1;
  note('A1d the full rule census at the fixed clock', byRule);

  // A2. The golden file agrees with what the function just produced, byte for byte on the
  // fields the criterion names.
  const g = goldenFile('core-conflicts.json');
  eq('A2  the golden’s blockerCount matches the re-derived count', g.blockerCount, blockers.length);
  eq('A2a the golden’s today is the fixed clock', g.today, FIXTURE_TODAY);
  eq(
    'A2b the golden’s conflict ids are exactly the re-derived ids',
    g.conflicts.map((c) => c.id).sort(),
    conflicts.map((c) => c.id).sort(),
  );
  eq(
    'A2c the golden’s (ruleId, severity) pairs match the re-derived ones',
    g.conflicts.map((c) => `${c.ruleId}/${c.severity}`).sort(),
    conflicts.map((c) => `${c.ruleId}/${c.severity}`).sort(),
  );

  // A3. §8.2's rule table, re-derived from RULES rather than transcribed. The criterion's
  // ceiling is "a run in which the rule `class` moved any of them has classified a rule
  // wrongly" — so the class of every rule that produced a finding above is checked.
  const CLASSES = {
    impossible_transfer: 'feasibility', overlap: 'feasibility', missing_lodging: 'feasibility',
    unbooked_ticketed: 'feasibility', booking_vs_plan: 'feasibility',
    legacy_flag: 'integrity', geo_outlier: 'integrity', unverified_reference: 'integrity',
    duplicate_booking: 'integrity', superseded_booking: 'integrity',
  };
  eq('A3  RULES is ten rules', core.RULES.length, 10);
  const wrong = core.RULES.filter((r) => r.class !== CLASSES[r.id]).map((r) => `${r.id}=${r.class}`);
  eq('A3a every rule carries §8.2’s class', wrong, []);
  const producing = [...new Set(conflicts.map((c) => c.ruleId))];
  note('A3b the rules that produce a finding on the reference trip', producing);

  // A4. geoCheck on the unmodified trip: 0 findings over 112 scheduled stops and 0 over 94
  // coordinate-bearing places. Both denominators are re-counted here.
  const scheduled = TRIP.days.flatMap((d) => d.stops);
  const schedWithCoord = scheduled.filter((s) => {
    if (s.place.kind === 'inline') return Number.isFinite(s.place.at?.lat);
    if (s.place.kind === 'place') {
      const p = TRIP.places.find((x) => x.id === s.place.placeId);
      return !!(p && p.at && Number.isFinite(p.at.lat));
    }
    return false;
  });
  const coordPlaces = TRIP.places.filter((p) => p.at && Number.isFinite(p.at.lat));
  eq('A4  112 scheduled stops carry a coordinate', schedWithCoord.length, 112);
  eq('A4a 94 places carry a coordinate', coordPlaces.length, 94);
  const clean = core.geoCheck(TRIP).filter((f) => f.confidence === 'certain');
  eq('A4b geoCheck on the unmodified trip: 0 certain findings (0/112 and 0/94)', clean.length, 0);

  // A5. 112/112 scheduled stops detected under a +1° latitude fault.
  const movePlace = (trip, placeId, d) => ({
    ...trip,
    places: trip.places.map((p) => (p.id === placeId && p.at ? { ...p, at: { ...p.at, lat: p.at.lat + d } } : p)),
  });
  const moveStop = (trip, stopId, d) => {
    let hit = null;
    const days = trip.days.map((day) => ({
      ...day,
      stops: day.stops.map((s) => {
        if (s.id !== stopId) return s;
        if (s.place.kind === 'inline') { hit = 'inline'; return { ...s, place: { kind: 'inline', at: { ...s.place.at, lat: s.place.at.lat + d } } }; }
        if (s.place.kind === 'place') { hit = s.place.placeId; }
        return s;
      }),
    }));
    if (hit === null) return null;
    if (hit === 'inline') return { ...trip, days };
    return movePlace(trip, hit, d);
  };
  const missedStops = [];
  let checkedStops = 0;
  for (const day of TRIP.days) {
    for (const stop of day.stops) {
      const faulted = moveStop(TRIP, stop.id, 1);
      if (!faulted) continue;
      checkedStops++;
      if (!core.geoCheck(faulted).some((f) => f.confidence === 'certain')) missedStops.push(`${day.id} ${stop.name}`);
    }
  }
  eq('A5  the +1° sweep checked 112 scheduled stops', checkedStops, 112);
  eq('A5a 112/112 scheduled stops detected', missedStops, []);

  // A6. 92/94 places, and the two misses are the named ones.
  const missedPlaces = [];
  for (const p of coordPlaces) {
    const faulted = movePlace(TRIP, p.id, 1);
    if (!core.geoCheck(faulted).some((f) => f.confidence === 'certain' && f.ref.id === p.id)) missedPlaces.push(p.name);
  }
  eq('A6  92/94 places detected under +1° (2 permitted misses)', coordPlaces.length - missedPlaces.length, 92);
  note('A6a the two misses, named', missedPlaces.sort());
  const PERMITTED = readFileSync(resolve(CAIRN, 'packages/core/test/geoCheck.test.ts'), 'utf8');
  const permittedBlock = /PERMITTED_PLACE_MISSES[^=]*=\s*\[([^\]]*)\]/s.exec(PERMITTED);
  const permitted = permittedBlock ? [...permittedBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort() : null;
  eq('A6b the misses are exactly §2.13’s permitted list', missedPlaces.sort(), permitted);
}

// ---------------------------------------------------------------------------
section('B — EC-2: the rule class does what it claims, at both clock boundaries');
// ---------------------------------------------------------------------------
{
  const FEASIBILITY = ['impossible_transfer', 'overlap', 'missing_lodging', 'unbooked_ticketed', 'booking_vs_plan'];
  const after = core.detectConflicts(TRIP, { today: '2027-01-01' });
  const afterRules = [...new Set(after.map((c) => c.ruleId))].sort();
  const leaked = after.filter((c) => FEASIBILITY.includes(c.ruleId));
  eq('B1  at today AFTER endDate, zero feasibility findings', leaked.map((c) => c.ruleId), []);
  const classOf = Object.fromEntries(core.RULES.map((r) => [r.id, r.class]));
  eq(
    'B1a every finding after endDate comes from an integrity rule',
    after.filter((c) => classOf[c.ruleId] !== 'integrity').map((c) => c.ruleId),
    [],
  );
  note('B1b the exact count after endDate', after.length);
  note('B1c one line per finding', after.map((c) => `${c.ruleId}/${c.severity}/${c.subjects.map((s) => s.id).join('+')}`));

  // "A rule that is silent at both clocks has been deleted, not classified."
  ok('B1d at least one finding survives the post-endDate clock', after.length > 0, after.length);

  // Move today back before startDate: the original set returns exactly. FIXTURE_TODAY
  // (2026-08-01) is itself before startDate (2026-08-07), which is the reading `ruleClass.test.ts`
  // documents in its own comment; the "original set" is the Phase 1 set at that clock.
  const original = core.detectConflicts(TRIP, { today: FIXTURE_TODAY });
  ok('B2  FIXTURE_TODAY is before startDate (the criterion’s own second clock)', FIXTURE_TODAY < TRIP.startDate, `${FIXTURE_TODAY} < ${TRIP.startDate}`);
  const before = core.detectConflicts(TRIP, { today: FIXTURE_TODAY });
  eq(
    'B2a the original set returns exactly (id set)',
    before.map((c) => c.id).sort(),
    original.map((c) => c.id).sort(),
  );
  eq('B2b and byte-identical on summary+params', JSON.stringify(before.map((c) => [c.id, c.summary, c.params]).sort()), JSON.stringify(original.map((c) => [c.id, c.summary, c.params]).sort()));
  ok('B2c a feasibility rule DOES fire at that clock (else the gate is unmeasurable here)',
    before.some((c) => FEASIBILITY.includes(c.ruleId)), [...new Set(before.filter((c) => FEASIBILITY.includes(c.ruleId)).map((c) => c.ruleId))]);
  // What a DIFFERENT pre-startDate clock gives. Recorded, not asserted: the criterion's
  // second half is only true at the goldens' own clock, because `unbooked_ticketed` carries a
  // booking horizon (§2.7 A-11) and is silent 7 months out. Not a defect — a fact about the
  // criterion's wording that a reader taking "any clock before startDate" would trip on.
  const veryEarly = core.detectConflicts(TRIP, { today: '2026-01-01' });
  note('B2d at today=2026-01-01 (also before startDate) the set is NOT the original',
    { count: veryEarly.length, originalCount: original.length, missing: original.filter((c) => !veryEarly.some((v) => v.id === c.id)).map((c) => c.ruleId) });

  // The golden states the count and one line per finding.
  const rc = existsSync(resolve(CAIRN, 'fixtures/golden/core-conflicts.json'));
  ok('B3  the conflicts golden exists', rc);
  const gtext = readFileSync(resolve(CAIRN, 'packages/core/test/ruleClass.test.ts'), 'utf8');
  ok('B3a the criterion is implemented in ruleClass.test.ts (post-endDate arm)', /2027|after\s+`?endDate/i.test(gtext));

  // The injected fault the criterion asks for: delete the gate and a feasibility rule speaks
  // after endDate. Driven through detectConflictsUngated, which is the same rules with the
  // gate disabled (§2.7 A-9) — the shipped implementation of "the gate removed".
  const detect = await import(resolve(CAIRN, 'packages/core/src/conflict/detect.ts'));
  if (typeof detect.detectUngated === 'function') {
    const ungated = detect.detectUngated(TRIP, { today: '2027-01-01' });
    const leakedUngated = ungated.filter((c) => FEASIBILITY.includes(c.ruleId));
    ok('B4  INJECTED FAULT: with the gate disabled, feasibility rules DO speak after endDate', leakedUngated.length > 0, `${leakedUngated.length} findings from ${[...new Set(leakedUngated.map((c) => c.ruleId))].join(',')}`);
  } else {
    note('B4  detectUngated is not exported from detect.ts — fault not run this way');
  }
  note('B5  rules producing findings after endDate', afterRules);
}

// ---------------------------------------------------------------------------
section('C — EC-3: a past trip is silent, and its injected fault');
// ---------------------------------------------------------------------------
{
  const ctx = { ids: core.sequentialIds('past'), now: '2026-09-01', actorUserId: core.LOCAL_OWNER };
  const past = core.createTrip({
    title: 'Portugal 2019',
    startDate: '2019-05-01',
    endDate: '2019-05-21',
    datePrecision: 'month',
    cities: [{ key: 'lisbon', name: 'Lisbon' }],
  }, ctx);
  eq('C1  21 days, dense over the range', past.days.length, 21);
  eq('C1a Day.id === Day.date throughout', past.days.filter((d) => d.id !== d.date).length, 0);
  const dates = past.days.map((d) => d.date);
  const denseOk = dates[0] === '2019-05-01' && dates[dates.length - 1] === '2019-05-21'
    && dates.every((d, i) => i === 0 || (new Date(d) - new Date(dates[i - 1])) === 86400000);
  ok('C1b the day skeleton is dense with no gaps', denseOk);
  eq('C1c zero stops', past.days.flatMap((d) => d.stops).length + past.pool.length, 0);
  eq('C1d datePrecision is month', past.datePrecision, 'month');

  const TODAY = '2026-09-01';
  const findings = core.detectConflicts(past, { today: TODAY });
  eq('C2  detectConflicts returns ZERO findings of any severity', findings.map((c) => `${c.ruleId}:${c.severity}`), []);
  const issues = core.validateTrip(past);
  eq('C2a validateTrip returns ZERO issues', issues.map((i) => i.code), []);

  // Injected fault: one stop dated AFTER today. The feasibility rules return for that day only.
  const ctx2 = { ids: core.sequentialIds('fut'), now: '2026-09-01', actorUserId: core.LOCAL_OWNER };
  const widened = core.setTripMeta(past, { endDate: '2019-05-21' }, ctx2);
  // Keep the past trip past; the fault is a stop dated after `today`, which requires a day
  // after `today`. Widen the range instead — same document, one extra day.
  const stretched = core.setTripMeta(past, { endDate: '2026-09-20' }, ctx2);
  const futureDay = stretched.days.find((d) => d.date === '2026-09-15');
  ok('C3  the stretched trip has a day after today', !!futureDay, futureDay?.date);
  void widened;
  if (futureDay) {
    const withStop = core.addStop(stretched, { kind: 'scheduled', dayId: futureDay.id, time: '10:00', order: 0 }, {
      name: 'A ticketed thing',
      category: 'sight',
      flags: ['ticketed'],
      // RE-CUT AT ROUND 55 (I-15 / §2.1 A-76). Both of these were the WRONG SHAPE and had been
      // since round 54: `Link` is `{label, href}` (not `url`) and `CostEstimate` is
      // `{amounts: Money[], display}` (not a flat `{amount, currency, basis}`). Pre-A-76 the door
      // took them silently and this probe was building a stop that could never have been saved;
      // `addStop` now refuses at `$.links[0].href`, which aborted the whole gate probe. The fix is
      // the probe's — this is A-76 catching a real defect in the QA fixture, not a regression.
      cost: { amounts: [{ lo: 20, hi: 20, currency: 'EUR', basis: 'per_person' }], display: '€20' },
      links: [{ label: 'Book', href: 'https://example.test/book' }],
    }, ctx2);
    const f2 = core.detectConflicts(withStop, { today: TODAY });
    const feas = ['impossible_transfer', 'overlap', 'missing_lodging', 'unbooked_ticketed', 'booking_vs_plan'];
    const feasFindings = f2.filter((c) => feas.includes(c.ruleId));
    ok('C3a INJECTED FAULT: feasibility rules now speak', feasFindings.length > 0, feasFindings.map((c) => c.ruleId));
    const subjectDays = new Set(feasFindings.flatMap((c) => c.subjects.map((s) => s.id)));
    note('C3b the days they speak about', [...subjectDays]);
    // "for that day only": every feasibility finding must resolve to a day on/after today.
    const daysBeforeToday = [...subjectDays].filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(id) && id < TODAY);
    eq('C3c no feasibility finding lands on a day before today', daysBeforeToday, []);
  }
}

// ---------------------------------------------------------------------------
section('D — EC-4: country attribution is measured, and its holes are visible');
// ---------------------------------------------------------------------------
{
  const { countryOf, COUNTRY_INDEX } = core;

  // d.a — the golden names its producers. Re-derived from countryOf, then compared.
  const latLngOf = (link) => {
    if (link.kind === 'inline') return link.at;
    if (link.kind === 'place') { const p = TRIP.places.find((x) => x.id === link.placeId); return p?.at ?? null; }
    return null;
  };
  const producers = new Map();
  let stopsWithCoord = 0, stopsAttributed = 0;
  const unattributedStops = [];
  for (const day of TRIP.days) {
    for (const s of day.stops) {
      const at = latLngOf(s.place);
      if (!at || !Number.isFinite(at.lat)) continue;
      stopsWithCoord++;
      const c = countryOf(at, COUNTRY_INDEX);
      if (c === null) { unattributedStops.push({ dayId: day.id, stopId: s.id, name: s.name }); continue; }
      stopsAttributed++;
      if (!producers.has(c)) producers.set(c, { dayId: day.id, stopId: s.id, name: s.name });
    }
  }
  const g = goldenFile('countries.json');
  eq('D-a  every distinct country in the golden is re-derived', g.countries.map((c) => c.code).sort(), [...producers.keys()].sort());
  const namedByMismatch = g.countries.filter((c) => JSON.stringify(producers.get(c.code)) !== JSON.stringify(c.namedBy));
  eq('D-a1 every country names the stop that produced it, in document order', namedByMismatch.map((c) => c.code), []);
  eq('D-a2 no country in the golden is unnamed', g.countries.filter((c) => !c.namedBy || !c.namedBy.stopId).map((c) => c.code), []);
  eq('D-a3 the golden’s unattributed stop list is re-derived', g.unattributedStops.map((s) => s.stopId).sort(), unattributedStops.map((s) => s.stopId).sort());
  note('D-a4 the re-derived producer census', Object.fromEntries([...producers].map(([k, v]) => [k, v.name])));

  // d.b — every hole is named, and says whether a scale would fix it.
  const holes = goldenFile('country-holes.json');
  const indexNulls = new Set([
    ...unattributedStops.map((s) => `stop:${s.stopId}`),
    ...TRIP.places.filter((p) => p.at && Number.isFinite(p.at.lat) && countryOf(p.at, COUNTRY_INDEX) === null).map((p) => `place:${p.id}`),
  ]);
  const holeSet = new Set(holes.holes.map((h) => `${h.kind}:${h.id}`));
  eq('D-b  the holes file names EXACTLY the records the committed index leaves null',
    [...holeSet].sort(), [...indexNulls].sort());
  const nonNullHoles = holes.holes.filter((h) => h.resolvesAt !== null);
  eq('D-b1 the ceiling: holes with a non-null resolvesAt is 2, and may not grow', nonNullHoles.length, 2);
  eq('D-b2 and they are Hvar Town’s stop and place at 10m',
    nonNullHoles.map((h) => `${h.kind}:${h.name}@${h.resolvesAt}`).sort(),
    ['place:Hvar Town@10m', 'stop:Hvar Town@10m']);
  eq('D-b3 the three stated resolvesAt:null landforms are still null',
    holes.holes.filter((h) => h.resolvesAt === null).map((h) => h.name).sort(),
    ['Blue Cave, Biševo', 'Blue Cave, Biševo', 'Budikovac / Blue Lagoon — snorkel stop', 'Stiniva Cove, Vis', 'Stiniva Cove, Vis']);

  // d.c — every ISO code the base scale omits is filled; a filled country wins its own ground.
  const ENTRIES = COUNTRY_INDEX.countries;
  const codes = new Set(ENTRIES.map((c) => c.code));
  eq('D-c  the semantic claim is over DISTINCT codes (A-27/rev 21), not entries', codes.size, 239);
  eq('D-c1 the artefact length is a separate measured number', ENTRIES.length, 292);
  const pins = [
    ['Vaduz, LI', { lat: 47.141, lng: 9.5209 }, 'LI'],
    ['Singapore', { lat: 1.3521, lng: 103.8198 }, 'SG'],
    ['Hong Kong', { lat: 22.3193, lng: 114.1694 }, 'HK'],
    ['Monaco', { lat: 43.7384, lng: 7.4246 }, 'MC'],
    ['San Marino', { lat: 43.9424, lng: 12.4578 }, 'SM'],
    ['Andorra la Vella', { lat: 42.5063, lng: 1.5218 }, 'AD'],
    ['Gibraltar', { lat: 36.1408, lng: -5.3536 }, 'GI'],
    ['Macao', { lat: 22.1987, lng: 113.5439 }, 'MO'],
    ['Malta (Valletta)', { lat: 35.8989, lng: 14.5146 }, 'MT'],
    ['Maldives (Malé)', { lat: 4.1755, lng: 73.5093 }, 'MV'],
  ];
  for (const [name, at, want] of pins) eq(`D-c2 ${name}`, countryOf(at, COUNTRY_INDEX), want);
  // Criterion 4c's one pinned known-wrong answer, as WRITTEN: "Vatican City returns `IT` at
  // every scale". Measured against the shipped artefact rather than quoted.
  const vaticanSweep = {};
  for (let la = 41.900; la <= 41.908; la += 0.0005) {
    for (let ln = 12.445; ln <= 12.460; ln += 0.0005) {
      const a = countryOf({ lat: la, lng: ln }, COUNTRY_INDEX);
      vaticanSweep[String(a)] = (vaticanSweep[String(a)] ?? 0) + 1;
    }
  }
  ok('D-c2v CRITERION 4c AS WRITTEN: "Vatican City returns IT at every scale"',
    !Object.keys(vaticanSweep).includes('VA'),
    `a 480-cell sweep of the Vatican returns ${JSON.stringify(vaticanSweep)} — the seven-point VA sliver answers itself (BUILD-NOTES KD-52, still open)`);
  eq('D-c2v1 what the shipped code actually gives — St Peter’s Basilica', countryOf({ lat: 41.9022, lng: 12.4539 }, COUNTRY_INDEX), 'IT');
  eq('D-c2v2 …and a coordinate inside the 110 m × 130 m patch', countryOf({ lat: 41.9033, lng: 12.4533 }, COUNTRY_INDEX), 'VA');
  note('D-c2v3 the Vatican sweep census', vaticanSweep);
  const nullPins = [
    ['mid-Atlantic', { lat: 30, lng: -40 }, null],
    ['St Helier, Jersey (stays null at every scale)', { lat: 49.1805, lng: -2.1041 }, null],
    ['Zhuhai Nanping (A-28 / R23-1)', { lat: 22.221, lng: 113.503 }, null],
    ['Zhuhai across the border', { lat: 22.2769, lng: 113.5678 }, null],
  ];
  for (const [name, at, want] of nullPins) eq(`D-c3 ${name}`, countryOf(at, COUNTRY_INDEX), want);
  // The two injected faults, RUN rather than quoted.
  const withoutLI = { ...COUNTRY_INDEX, countries: ENTRIES.filter((c) => c.code !== 'LI') };
  eq('D-c4 INJECTED FAULT: drop LI from the fill and Vaduz returns AT', countryOf({ lat: 47.141, lng: 9.5209 }, withoutLI), 'AT');
  const isoOrder = { ...COUNTRY_INDEX, countries: [...ENTRIES].sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0)) };
  eq('D-c5 INJECTED FAULT: ISO-ascending order — Vaduz returns AT', countryOf({ lat: 47.141, lng: 9.5209 }, isoOrder), 'AT');
  eq('D-c5a INJECTED FAULT: ISO-ascending order — Singapore returns MY', countryOf({ lat: 1.3521, lng: 103.8198 }, isoOrder), 'MY');
  eq('D-c5b INJECTED FAULT: ISO-ascending order — Hong Kong returns CN', countryOf({ lat: 22.3193, lng: 114.1694 }, isoOrder), 'CN');

  // d.d — the two original injected faults.
  eq('D-d  a mid-Atlantic coordinate is null, never the nearest country', countryOf({ lat: 25, lng: -45 }, COUNTRY_INDEX), null);
  const bastion = TRIP.places.find((p) => p.id === 'place-68');
  ok('D-d1 place-68 is Fisherman’s Bastion', /Fisherman|Bastion/i.test(bastion?.name ?? ''), bastion?.name);
  const beforeCountry = countryOf(bastion.at, COUNTRY_INDEX);
  const typoTrip = { ...TRIP, places: TRIP.places.map((p) => (p.id === 'place-68' ? { ...p, at: { ...p.at, lat: p.at.lat + 1 } } : p)) };
  const afterCountry = countryOf(typoTrip.places.find((p) => p.id === 'place-68').at, COUNTRY_INDEX);
  ok('D-d2 the typo CHANGES the attributed country', beforeCountry !== afterCountry, `${beforeCountry} → ${afterCountry}`);
  const beforeC = core.detectConflicts(TRIP, { today: FIXTURE_TODAY });
  const afterC = core.detectConflicts(typoTrip, { today: FIXTURE_TODAY });
  const added = afterC.filter((c) => !beforeC.some((b) => b.id === c.id));
  eq('D-d3 and it still produces exactly one new geo_outlier blocker',
    added.map((c) => `${c.ruleId}/${c.severity}/${c.subjects.map((s) => s.id).join()}`),
    ['geo_outlier/blocker/place-68']);

  // d.e — forgiveness at the waterline, and never taken from a neighbour.
  const forgiven = [
    ["Nuku'alofa, TO", { lat: -21.139, lng: -175.204 }, 'TO'],
    ["St John's, AG", { lat: 17.1274, lng: -61.8468 }, 'AG'],
    ["St George's, GD", { lat: 12.0561, lng: -61.7488 }, 'GD'],
    ['Diego Garcia, IO', { lat: -7.3133, lng: 72.4111 }, 'IO'],
  ];
  for (const [name, at, want] of forgiven) eq(`D-e  ${name}`, countryOf(at, COUNTRY_INDEX), want);
  // (ii) additive by construction: every pre-I-5b ring is present byte-identical.
  const gitShow = (rev, path) => {
    try { return execFileSync('git', ['show', `${rev}:${path}`], { cwd: CAIRN, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' }); }
    catch { return null; }
  };
  const preI5b = gitShow('897b928', 'cairn/packages/core/src/geo/countries.gen.ts');
  if (preI5b) {
    const ringsOf = (src) => {
      const out = [];
      for (const m of src.matchAll(/"([A-Z]{2})",\s*(\[\[[^\]]*?\]\])/g)) out.push(m[0]);
      return out;
    };
    note('D-e1 pre-I-5b artefact found at 897b928, bytes', preI5b.length);
    // Structural, not textual: assert every DISTINCT code of the old artefact is still a code
    // of the new one, and that no coordinate the old one attributed now answers differently.
    const oldCodes = [...new Set([...preI5b.matchAll(/code:\s*'([A-Z]{2})'/g)].map((m) => m[1]))];
    const missing = oldCodes.filter((c) => !codes.has(c));
    eq('D-e2 no ISO code of the pre-I-5b index was lost (additive)', missing, []);
    void ringsOf;
  } else {
    note('D-e1 pre-I-5b artefact not reachable from this checkout — additivity checked by sweep only');
  }
  // (iii) a sweep over each forgiveness entry's bbox: zero cells go country → null or → another
  // country, compared against the SAME index with forgiveness entries removed.
  const forgivenessEntries = ENTRIES.filter((c, i) => ENTRIES.findIndex((x) => x.code === c.code) !== i);
  eq('D-e3 the forgiveness entries are the 53 second entries A-28 counts', forgivenessEntries.length, 53);
  const baseList = [];
  const seen = new Set();
  for (const c of ENTRIES) { if (!seen.has(c.code)) { seen.add(c.code); baseList.push(c); } }
  const base = { ...COUNTRY_INDEX, countries: baseList };
  let regressions = 0, gains = 0, cells = 0;
  for (const e of forgivenessEntries) {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (const ring of e.rings ?? []) for (let i = 0; i + 1 < ring.length; i += 2) {
      const lng = ring[i], lat = ring[i + 1];
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
    }
    if (minLat > maxLat) continue;
    const stepLat = Math.max((maxLat - minLat) / 12, 0.01);
    const stepLng = Math.max((maxLng - minLng) / 12, 0.01);
    for (let la = minLat; la <= maxLat; la += stepLat) {
      for (let ln = minLng; ln <= maxLng; ln += stepLng) {
        cells++;
        const b = countryOf({ lat: la, lng: ln }, base);
        const f = countryOf({ lat: la, lng: ln }, COUNTRY_INDEX);
        if (b !== null && f === null) regressions++;
        else if (b !== null && f !== null && b !== f) regressions++;
        else if (b === null && f !== null) gains++;
      }
    }
  }
  eq('D-e4 sweep over every forgiveness bbox: ZERO country→null or country→other', regressions, 0);
  note('D-e5 sweep cells / null→country gains', { cells, gains });
}

// ---------------------------------------------------------------------------
section('E — EC-5: the generated index is inside its budget, measured not quoted');
// ---------------------------------------------------------------------------
{
  const gen = resolve(CAIRN, 'packages/core/src/geo/countries.gen.ts');
  const bytes = statSync(gen).size;
  const budgetSrc = readFileSync(resolve(CAIRN, 'packages/core/test/0-countryBudget.test.ts'), 'utf8');
  const emitted = Number(/const EMITTED_BYTES\s*=\s*([\d_]+)/.exec(budgetSrc)?.[1].replace(/_/g, ''));
  const ceiling = Number(/const TYPE_STRIPPING_CEILING\s*=\s*([\d_]+)/.exec(budgetSrc)?.[1].replace(/_/g, ''));
  eq('E1  the artefact on disk is exactly EMITTED_BYTES', bytes, emitted);
  ok('E2  the budget is under the type-stripping ceiling', emitted < ceiling, { emitted, ceiling });
  ok('E3  the number lives in the TEST, not in a document', /const EMITTED_BYTES/.test(budgetSrc));
  const docHits = execFileSync('bash', ['-c', `grep -rn "374,659\\|374659" ${CAIRN}/docs/*.md | head -5 || true`], { encoding: 'utf8' });
  note('E4  where the byte figure also appears in docs (a quote is allowed; the TEST is the source)', docHits.trim().split('\n').filter(Boolean).length);
  // The generator's own arithmetic, re-derived from the artefact rather than from its output.
  const rings = COUNTRY_RINGS();
  function COUNTRY_RINGS() {
    let r = 0, pts = 0;
    for (const c of core.COUNTRY_INDEX.countries) for (const ring of c.rings ?? []) { r++; pts += ring.length / 2; }
    return { rings: r, points: pts };
  }
  eq('E5  1,033 rings, re-counted from the shipped artefact', rings.rings, 1033);
  note('E5a points, re-counted', rings.points);
}

// ---------------------------------------------------------------------------
section('F — EC-6: statistics cannot be stored');
// ---------------------------------------------------------------------------
{
  const client = await import(resolve(CAIRN, 'packages/client/src/index.ts'));
  const { COUNTRY_INDEX, tripSummary } = core;
  const ctx = { ids: core.sequentialIds('f'), now: '2026-01-01', actorUserId: core.LOCAL_OWNER };
  const t = core.createTrip({ title: 'F', startDate: '2026-03-01', endDate: '2026-03-05', cities: [{ key: 'v', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }] }, ctx);
  const row = tripSummary(t, COUNTRY_INDEX);

  const leafPaths = (o, prefix = '') => {
    const out = [];
    for (const [k, v] of Object.entries(o)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...leafPaths(v, p));
      else if (Array.isArray(v)) { if (v.length === 0) out.push(`${p}[]`); else for (const item of v) { if (item && typeof item === 'object') out.push(...leafPaths(item, `${p}[]`)); else out.push(`${p}[]`); } }
      else out.push(p);
    }
    return [...new Set(out)];
  };
  note('F1  a minted row’s top-level keys', Object.keys(row).sort());
  eq('F1a the row has 14 top-level keys (A-33 Part 2)', Object.keys(row).length, 14);

  // c. travelStats is pure and order-independent.
  const rows = [];
  for (let i = 0; i < 5; i++) {
    const ti = core.createTrip({ title: `T${i}`, startDate: `2026-0${i + 1}-01`, endDate: `2026-0${i + 1}-05`, cities: [{ key: `c${i}`, name: `City${i}`, centre: { lat: 40 + i, lng: 10 + i } }] }, { ids: core.sequentialIds(`t${i}`), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
    rows.push(tripSummary(ti, COUNTRY_INDEX));
  }
  const frozen = JSON.stringify(rows);
  const s1 = core.travelStats(rows, '2026-12-31');
  const s2 = core.travelStats(rows, '2026-12-31');
  eq('F-c1 called twice on one input, deep-equal', JSON.stringify(s1), JSON.stringify(s2));
  eq('F-c2 the input array and its rows are byte-identical after the call', JSON.stringify(rows), frozen);
  const shuffled = [rows[3], rows[0], rows[4], rows[1], rows[2]];
  eq('F-c3 the same rows in a different order give a deep-equal result', JSON.stringify(core.travelStats(shuffled, '2026-12-31')), JSON.stringify(s1));
  const mutated = rows.map((r, i) => (i === 0 ? { ...r, countryCodes: ['ZZ'], endDate: '2026-01-20' } : r));
  ok('F-c4 once on a mutated copy, DIFFERENT', JSON.stringify(core.travelStats(mutated, '2026-12-31')) !== JSON.stringify(s1));
  note('F-c4a a row field travelStats does NOT read (dayCount) changes nothing — recorded, not a defect',
    JSON.stringify(core.travelStats(rows.map((r, i) => (i === 0 ? { ...r, dayCount: r.dayCount + 7 } : r)), '2026-12-31')) === JSON.stringify(s1));
  const dup = threw(() => core.travelStats([rows[0], rows[0]], '2026-12-31'));
  ok('F-c5 one row passed twice throws and names the id', dup !== null && String(dup.message).includes(rows[0].id), dup?.message);
  const empty = threw(() => core.travelStats([], '2026-12-31'));
  ok('F-c6 an empty summaries array does not throw', empty === null, empty?.message);
  if (empty === null) note('F-c6a empty travelStats', JSON.stringify(core.travelStats([], '2026-12-31')).slice(0, 200));

  // b‴. Nothing that persists anything imports travelStats.
  const grepImports = execFileSync('bash', ['-c',
    `cd ${CAIRN} && grep -rln "travelStats\\|TravelStats" packages/client/src/ports apps/web/src/ports 2>/dev/null || true`], { encoding: 'utf8' }).trim();
  eq('F-b3 no storage port imports travelStats', grepImports === '' ? [] : grepImports.split('\n'), []);
  const portFiles = execFileSync('bash', ['-c', `cd ${CAIRN} && ls packages/client/src/ports apps/web/src/ports 2>/dev/null | tr '\\n' ' '`], { encoding: 'utf8' }).trim();
  ok('F-b3a inconclusiveness guard: there ARE port files to grep', portFiles.length > 0, portFiles);

  // b″. The port census: the set of source files mentioning refreshSummary is exactly four.
  const census = execFileSync('bash', ['-c',
    `cd ${CAIRN} && grep -rl "refreshSummary" packages apps cli.ts --include=*.ts --include=*.tsx 2>/dev/null | grep -v "/test/" | sort`], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  eq('F-b2 the refreshSummary census is exactly four source files', census.length, 4);
  note('F-b2a the four', census);
  const putSites = execFileSync('bash', ['-c',
    `cd ${CAIRN} && grep -rn "SUMMARIES.put\\|summaries.set" packages/client/src apps/web/src --include=*.ts 2>/dev/null | wc -l`], { encoding: 'utf8' }).trim();
  note('F-b2b summary-store write sites (pinned at 2+2)', putSites);

  // b′. Execute the memory port: every value that reaches the summary store is ROW_KEYS-shaped.
  const storage = client.memoryStorage();
  const ports = { storage, file: client.memoryFile(), clock: client.fixedClockPort('2026-01-01'), ids: client.sequentialIdPort(), scheduler: client.immediateScheduler() };
  const store = client.createStore({ ports });
  await store.createTrip({ title: 'Ported', startDate: '2026-04-01', endDate: '2026-04-03', cities: [{ name: 'Prague', centre: { lat: 50.08, lng: 14.44 } }] });
  await store.flush?.();
  const listed = await ports.storage.listTrips();
  const badKeys = listed.filter((r) => JSON.stringify(Object.keys(r).sort()) !== JSON.stringify(Object.keys(row).sort()));
  eq('F-b1 every row listTrips() returns has exactly the type’s top-level keys', badKeys.map((r) => Object.keys(r).sort()), []);
  const extraLeaves = listed.flatMap((r) => leafPaths(r)).filter((p) => !leafPaths(row).includes(p) && !/^cities\[\]/.test(p));
  eq('F-b1a and no leaf path outside the minted row’s', [...new Set(extraLeaves)], []);
}

// ---------------------------------------------------------------------------
section('G — EC-7: the day skeleton is bounded, in core, at the function that mints it');
// ---------------------------------------------------------------------------
{
  const ctx = { ids: core.sequentialIds('g'), now: '2026-01-01', actorUserId: core.LOCAL_OWNER };
  const okTrip = threw(() => core.createTrip({ title: 'edge', startDate: '2020-01-01', endDate: '2029-12-31' }, { ids: core.sequentialIds('g1'), now: '2026-01-01', actorUserId: core.LOCAL_OWNER }));
  ok('G1  2020-01-01 → 2029-12-31 succeeds at exactly 3,653', okTrip === null, okTrip?.message);
  const built = core.createTrip({ title: 'edge', startDate: '2020-01-01', endDate: '2029-12-31' }, { ids: core.sequentialIds('g2'), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
  eq('G1a and it really is 3,653 days', built.days.length, 3653);
  const over = threw(() => core.createTrip({ title: 'edge', startDate: '2020-01-01', endDate: '2030-01-01' }, { ids: core.sequentialIds('g3'), now: '2026-01-01', actorUserId: core.LOCAL_OWNER }));
  ok('G2  2020-01-01 → 2030-01-01 throws at 3,654', over !== null, over?.message);
  const typo = threw(() => core.createTrip({ title: 'typo', startDate: '0202-01-01', endDate: '2020-12-31' }, ctx));
  ok('G3  the product path: 0202-01-01 → 2020-12-31 throws instead of 664,377 days', typo !== null);
  const msg = String(typo?.message ?? '');
  ok('G3a the message names the span, the cap and the dates',
    /664,?377|664377/.test(msg) && /3,?653/.test(msg) && msg.includes('0202-01-01') && msg.includes('2020-12-31'), msg);
  // Every caller: setTripMeta, the legacy importer, ensureDays itself.
  const small = core.createTrip({ title: 'small', startDate: '2026-01-01', endDate: '2026-01-02' }, { ids: core.sequentialIds('g4'), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
  const viaMeta = threw(() => core.setTripMeta(small, { endDate: '2099-01-01' }, ctx));
  ok('G4  setTripMeta cannot mint an unbounded skeleton either', viaMeta !== null, viaMeta?.message?.slice(0, 120));
  const viaEnsure = threw(() => core.ensureDays({ ...small, endDate: '2099-01-01' }, ctx));
  ok('G4a ensureDays refuses directly', viaEnsure !== null, viaEnsure?.message?.slice(0, 120));
}

// ---------------------------------------------------------------------------
section('I — EC-9: participation grants nothing, asserted mechanically');
// ---------------------------------------------------------------------------
{
  const pred = await import(resolve(CAIRN, 'packages/core/src/access/predicates.ts'));
  const NOW = '2026-08-01';
  const OPS = ['view', 'comment', 'edit', 'share', 'delete'];
  // `qa/access.mjs`'s conformance set, transcribed — the SAME twelve principals and the SAME
  // relationship the §6.2 probe uses, plus a `participant-only` thirteenth and four extra
  // relationship shapes so the criterion's "(principal × relationship × operation)" is a real
  // product rather than one row.
  const ed = { kind: 'user', userId: 'u:editor' }, cm = { kind: 'user', userId: 'u:commenter' };
  const vw = { kind: 'user', userId: 'u:viewer' }, rv = { kind: 'user', userId: 'u:revoked' };
  const link = { kind: 'link', token: 'tok-live' }, expiredLink = { kind: 'link', token: 'tok-expired' };
  const revokedLink = { kind: 'link', token: 'tok-revoked' };
  const principals = [
    ['owner', { kind: 'user', userId: 'u:owner' }],
    ['co-owner', { kind: 'user', userId: 'u:co' }],
    ['editor', ed], ['commenter', cm], ['viewer', vw],
    ['friend', { kind: 'user', userId: 'u:friend' }],
    ['revoked editor', rv],
    ['stranger', { kind: 'user', userId: 'u:stranger' }],
    ['anonymous', { kind: 'anonymous' }],
    ['live link', link], ['expired link', expiredLink], ['revoked link', revokedLink],
    ['participant-only', { kind: 'user', userId: 'u:zoe' }],
  ];
  const fullRel = {
    tripId: 't', ownerId: 'u:owner', memberIds: ['u:co'], friendIds: ['u:friend'],
    shares: [
      { principal: ed, role: 'editor' }, { principal: cm, role: 'commenter' },
      { principal: vw, role: 'viewer' }, { principal: rv, role: 'editor', revokedAt: '2026-07-01' },
      { principal: link, role: 'viewer', expiresAt: '2026-12-31' },
      { principal: expiredLink, role: 'viewer', expiresAt: '2026-07-01' },
      { principal: revokedLink, role: 'viewer', revokedAt: '2026-07-01' },
    ],
  };
  const relationships = [
    ['full', fullRel],
    ['bare', { tripId: 't', ownerId: 'u:owner' }],
    ['no shares', { tripId: 't', ownerId: 'u:owner', memberIds: ['u:co'], friendIds: ['u:friend'] }],
    ['owner is zoe', { ...fullRel, ownerId: 'u:zoe' }],
    ['empty shares', { tripId: 't', ownerId: 'u:owner', shares: [] }],
  ];
  const PEOPLE = [
    { id: 'participant-1', displayName: 'Zoë', kind: 'contact', userId: 'u:zoe' },
    { id: 'participant-2', displayName: 'Jacob', kind: 'self', userId: 'u:owner' },
    { id: 'participant-3', displayName: '', kind: 'contact', userId: 'u:stranger' },
  ];
  const matrix = (withParticipants) => {
    const out = [];
    for (const [pl, p] of principals) {
      for (const [rl, rel] of relationships) {
        // "with participants added to every trip": the participant list rides on the
        // relationship AND on a trip document handed to the same predicates.
        const r = withParticipants ? { ...rel, participants: PEOPLE } : rel;
        for (const op of OPS) {
          let v;
          try { v = pred.can(op, p, r, NOW); } catch (e) { v = `THREW:${e.message}`; }
          out.push(`${pl}|${rl}|${op}=${v}`);
        }
      }
    }
    return out;
  };
  const without = matrix(false);
  const withP = matrix(true);
  eq('I1  the §6.2 conformance set is IDENTICAL with and without participants (diff = 0)',
    withP.filter((c, i) => c !== without[i]), []);
  eq('I1a the product is 13 principals × 5 relationships × 5 operations', without.length, 13 * 5 * 5);
  const partCells = without.filter((c) => c.startsWith('participant-only|full|') || c.startsWith('participant-only|no shares|') || c.startsWith('participant-only|bare|') || c.startsWith('participant-only|empty shares|'));
  eq('I2  a participant who is not a member or share holder is denied EVERY operation, including view',
    partCells.filter((c) => !c.endsWith('=false')), []);
  // The one relationship where zoe DOES get access is the one where she owns the trip — which
  // is ownership, not participation. Asserted so I2 is not passing for the wrong reason.
  const zoeOwner = withP.filter((c) => c.startsWith('participant-only|owner is zoe|'));
  eq('I2a …and she is granted everything only when she is the OWNER', zoeOwner.filter((c) => !c.endsWith('=true')), []);
  // The predicates take a TripRelationship and a clock, never a rendered surface.
  const src = readFileSync(resolve(CAIRN, 'packages/core/src/access/predicates.ts'), 'utf8');
  ok('I3  predicates.ts mentions no participant field at all', !/participant/i.test(src));
  ok('I3a and no DOM / view reference', !/document\.|window\.|render/i.test(src));
  // Does a SHIPPED artefact perform the double-run the criterion demands? ROADMAP I-11 names
  // `packages/core/test/access.test.ts` and `qa/access.mjs` as its implementation.
  const confSrc = readFileSync(resolve(CAIRN, 'packages/core/test/access.test.ts'), 'utf8');
  const qaAccess = readFileSync(resolve(CAIRN, 'qa/access.mjs'), 'utf8');
  ok('I4  the criterion’s named implementation runs the set TWICE, with and without participants',
    /participant/i.test(confSrc) || /participant/i.test(qaAccess),
    'neither packages/core/test/access.test.ts nor qa/access.mjs mentions participants at all — the shipped mechanism is two hand-written cases in participants.test.ts covering ONE principal and ONE relationship, not the (principal × relationship × operation) double-run');
  const partTest = readFileSync(resolve(CAIRN, 'packages/core/test/participants.test.ts'), 'utf8');
  note('I4a what participants.test.ts does assert', {
    deniedEveryOp: /denied every operation/.test(partTest),
    stuffedRelationship: /stuffed/.test(partTest),
    principalsCovered: 1, relationshipsCovered: 1,
  });
}

// ---------------------------------------------------------------------------
section('J — EC-10: round-trip and undo parity over the new fields');
// ---------------------------------------------------------------------------
{
  const ctx = { ids: core.sequentialIds('j'), now: '2026-01-01', actorUserId: core.LOCAL_OWNER };
  let t = core.createTrip({ title: 'RT', startDate: '2026-05-01', endDate: '2026-05-03', datePrecision: 'month', cities: [{ key: 'x', name: 'X' }] }, ctx);
  t = core.addParticipant(t, { displayName: 'Zoë', kind: 'contact' }, ctx);
  t = core.addParticipant(t, { displayName: '', kind: 'self' }, ctx);
  const json1 = core.toJSON(t);
  const json2 = core.toJSON(core.fromJSON(json1));
  eq('J1  toJSON(fromJSON(toJSON(trip))) is byte-identical with participants + datePrecision', json2 === json1, true);
  ok('J1a and the participants survived', core.fromJSON(json1).participants.length === 2);
  eq('J1b datePrecision survived', core.fromJSON(json1).datePrecision, 'month');

  const bad = JSON.parse(json1); bad.datePrecision = 'fortnight';
  const e1 = threw(() => core.fromJSON(JSON.stringify(bad)));
  ok('J2  fromJSON rejects datePrecision:"fortnight"', e1 !== null, e1?.message?.slice(0, 140));

  const dup = JSON.parse(json1);
  dup.participants[1].id = dup.participants[0].id;
  const e2 = threw(() => core.fromJSON(JSON.stringify(dup)));
  if (e2 === null) {
    const parsed = core.fromJSON(JSON.stringify(dup));
    const issues = core.validateTrip(parsed).filter((i) => i.code === 'duplicate_participant_id');
    ok('J3  EXIT CRITERION AS WRITTEN: fromJSON rejects a participant with a duplicate id', false,
      `fromJSON OPENED the document (A-73 removed the parser refusal); validateTrip reports ${issues.length} duplicate_participant_id issue(s) instead`);
    note('J3a what actually happens', { fromJSONThrew: false, validateTripIssues: issues.map((i) => i.code) });
  } else {
    ok('J3  fromJSON rejects a participant with a duplicate id', true, e2.message.slice(0, 140));
  }

  // Undo/redo at depth 50, over participants.
  const client = await import(resolve(CAIRN, 'packages/client/src/index.ts'));
  const storage = client.memoryStorage();
  const ports = { storage, file: client.memoryFile(), clock: client.fixedClockPort('2026-01-01'), ids: client.sequentialIdPort(), scheduler: client.immediateScheduler() };
  const store = client.createStore({ ports });
  await store.createTrip({ title: 'Undo', startDate: '2026-05-01', endDate: '2026-05-03', cities: [{ name: 'X' }] });
  const snapshots = [];
  for (let i = 0; i < 50; i++) {
    snapshots.push(JSON.stringify(store.getState().doc.participants ?? []));
    store.dispatch({ type: 'addParticipant', participant: { displayName: `P${i}`, kind: 'contact' } });
  }
  const top = JSON.stringify(store.getState().doc.participants);
  eq('J4  50 participant additions land', store.getState().doc.participants.length, 50);
  let mismatches = 0;
  for (let i = 49; i >= 0; i--) {
    store.undo();
    if (JSON.stringify(store.getState().doc.participants ?? []) !== snapshots[i]) mismatches++;
  }
  eq('J4a undo restores participants exactly at depth 50', mismatches, 0);
  for (let i = 0; i < 50; i++) store.redo();
  eq('J4b redo restores the top of the stack exactly', JSON.stringify(store.getState().doc.participants), top);
}

// ---------------------------------------------------------------------------
section('K — EC-11: every action maps 1:1 onto a core build function');
// ---------------------------------------------------------------------------
{
  const client = await import(resolve(CAIRN, 'packages/client/src/index.ts'));
  const specs = client.ACTION_SPECS;
  const names = Object.keys(specs);
  const fns = names.map((n) => specs[n].coreFn);
  const missing = fns.filter((f) => typeof core[f] !== 'function');
  eq('K1  every ACTION_SPECS entry names a function that exists on the core index', missing, []);
  const dupFns = fns.filter((f, i) => fns.indexOf(f) !== i);
  note('K1a core functions named by more than one action', [...new Set(dupFns)]);
  eq('K2  the three participant actions are present',
    ['addParticipant', 'updateParticipant', 'removeParticipant'].filter((a) => !names.includes(a)), []);
  eq('K2a and each names a DISTINCT core function',
    [...new Set(['addParticipant', 'updateParticipant', 'removeParticipant'].map((a) => specs[a].coreFn))].length, 3);
  note('K3  action count', names.length);
  // The reducer holds no domain logic: it may not import a build function by name.
  const reducerSrc = readFileSync(resolve(CAIRN, 'packages/client/src/store/reducer.ts'), 'utf8');
  const buildNames = ['addStop', 'updateStop', 'removeStop', 'addParticipant', 'updateParticipant', 'removeParticipant', 'addPhoto', 'removePhoto', 'updatePhoto', 'upsertBooking', 'scheduleFromPool'];
  const leaked = buildNames.filter((b) => new RegExp(`\\bcore\\.${b}\\b|\\b${b}\\(`).test(reducerSrc));
  eq('K4  the reducer calls no core build function by name', leaked, []);
}

// ---------------------------------------------------------------------------
section('L — EC-12: NO SILENT LOSS — the closed list of six state.doc assignments');
// ---------------------------------------------------------------------------
{
  const sources = execFileSync('bash', ['-c',
    `cd ${CAIRN} && grep -rn "state\\.doc\\s*=\\|doc:\\s*" packages/client/src/store/*.ts | grep -c "" || true`], { encoding: 'utf8' }).trim();
  const assigns = execFileSync('bash', ['-c',
    `cd ${CAIRN} && grep -rn "doc:" packages/client/src/store/reducer.ts packages/client/src/store/store.ts | grep -v "^.*//" | wc -l`], { encoding: 'utf8' }).trim();
  note('L0  raw grep counts (context only)', { sources, assigns });
  const walkSrc = readFileSync(resolve(CAIRN, 'packages/client/test/dirty.test.ts'), 'utf8');
  ok('L1  the 200-step dirty walk exists', /200/.test(walkSrc));
  ok('L1a and participant edits are in the step chooser', /articipant/.test(walkSrc));
  const sixMatch = /closed list of six|six\b[^\n]*state\.doc|state\.doc[^\n]*six/i.test(walkSrc)
    || /closed list of six/i.test(readFileSync(resolve(CAIRN, 'packages/client/src/store/store.ts'), 'utf8'));
  note('L1b the "closed list of six" phrase is documented in the store or the walk', sixMatch);
  // Run the walk at three seeds, not just the default.
  for (const seed of ['20260826', '54001', '99991']) {
    const r = execFileSync('bash', ['-c',
      `cd ${CAIRN} && CAIRN_WALK_SEED=${seed} node --experimental-strip-types --test packages/client/test/dirty.test.ts 2>&1 | tail -6`], { encoding: 'utf8' });
    const pass = /# fail 0/.test(r);
    ok(`L2  the 200-step dirty walk passes at seed ${seed}`, pass, pass ? undefined : r.slice(0, 400));
  }
}

// ---------------------------------------------------------------------------
section('M — EC-13: the row is exactly the allow-list — 24 leaves, 14 keys, 8 count fields');
// ---------------------------------------------------------------------------
{
  const ctxOf = (s) => ({ ids: core.sequentialIds(s), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
  const full = core.createTrip({ title: 'Full', startDate: '2026-06-01', endDate: '2026-06-04', cities: [{ key: 'a', name: 'Wien', countryCode: 'AT', centre: { lat: 48.2, lng: 16.37 } }] }, ctxOf('m1'));
  const nullCountry = core.createTrip({ title: 'NC', startDate: '2026-06-01', endDate: '2026-06-02', cities: [{ key: 'b', name: 'Nowhere' }] }, ctxOf('m2'));
  const bare = core.createTrip({ title: 'Bare', startDate: '2026-06-01', endDate: '2026-06-02' }, ctxOf('m3'));
  const rows = [full, nullCountry, bare].map((t) => core.tripSummary(t, core.COUNTRY_INDEX));
  // A-33's own leaf semantics: an EMPTY array contributes no leaf (there is no value to name),
  // so `countryCodes[]` appears only when a row has one.
  const leafPaths = (value, path = '') => {
    if (Array.isArray(value)) {
      const out = new Set();
      for (const v of value) for (const p of leafPaths(v, `${path}[]`)) out.add(p);
      return [...out];
    }
    if (value && typeof value === 'object') {
      const out = [];
      for (const [k, v] of Object.entries(value)) out.push(...leafPaths(v, path ? `${path}.${k}` : k));
      return out;
    }
    return [path];
  };
  const union = [...new Set(rows.flatMap((r) => leafPaths(r)))].sort();
  eq('M1  the union of the three rows’ leaf paths is exactly 24', union.length, 24);
  note('M1a the 24 leaves', union);
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].sort();
  eq('M2  the row has exactly 14 top-level keys', keys.length, 14);
  note('M2a the 14 keys', keys);
  // A-33 Part 2's classifier, transcribed from the test rather than invented, so the count is a
  // re-derivation of the same set and not a different question.
  const DOMAIN = /countr(?:y|ies)|cit(?:y|ies)|trip|day|stop|place|pool/i;
  const SHAPE = /(?:count|total|tally|num|visited|travell?ed)$/i;
  const PLURAL = /(?:cities|countries|trips|days|stops|places)$/i;
  const CENSUS = /^(?:located|attributed)$/i;
  const countShaped = (n) => CENSUS.test(n) || (PLURAL.test(n) && DOMAIN.test(n)) || (DOMAIN.test(n) && SHAPE.test(n));
  const counts = union.filter((p) => countShaped(p.split('.').pop()));
  eq('M3  ROW_PATHS.filter(countShaped) is exactly the EIGHT ROW_COUNT_FIELDS', counts.sort(), [
    'attribution.places.attributed', 'attribution.places.located',
    'attribution.stops.attributed', 'attribution.stops.located',
    'cityCount', 'dayCount', 'poolCount', 'stopCount',
  ]);
  // The injected fault: add cities[].dayCount to the minted row and all three go red.
  const faulted = rows.map((r) => ({ ...r, cities: (r.cities ?? []).map((c) => ({ ...c, dayCount: 3 })) }));
  const faultedUnion = [...new Set(faulted.flatMap((r) => leafPaths(r)))];
  ok('M4  INJECTED FAULT: cities[].dayCount widens the leaf set past 24', faultedUnion.length > 24, faultedUnion.length);
}

// ---------------------------------------------------------------------------
section('N — EC-14: no coordinate leaves the device’s own storage');
// ---------------------------------------------------------------------------
{
  const COORD = /-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/;
  const COORD_JSON = /"(lat|lng)"\s*:\s*-?\d+\.\d+/;
  const allGoldens = readdirSync(resolve(CAIRN, 'fixtures/golden')).filter((f) => f.endsWith('.json'));
  const dirtyAll = [];
  for (const f of allGoldens) {
    const txt = readFileSync(resolve(CAIRN, 'fixtures/golden', f), 'utf8');
    if (COORD_JSON.test(txt) || COORD.test(txt)) dirtyAll.push(f);
  }
  // The criterion AS WRITTEN: "Grep fixtures/golden/*.json … expect zero."
  ok('N1  CRITERION AS WRITTEN: zero coordinate-shaped pairs in fixtures/golden/*.json',
    dirtyAll.length === 0,
    `${JSON.stringify(dirtyAll)} — both are generated Natural Earth admin-0 geometry (the index and the rings its own injected faults need), not trip data; the criterion states no exclusion`);
  // The criterion's INTENT: the two fields it names, and any trip coordinate at all.
  const GENERATED_GEOMETRY = new Set(['countries.json', 'forgiveness-drops.json']);
  const tripGoldens = allGoldens.filter((f) => !GENERATED_GEOMETRY.has(f));
  const dirtyTrip = tripGoldens.filter((f) => {
    const txt = readFileSync(resolve(CAIRN, 'fixtures/golden', f), 'utf8');
    return COORD_JSON.test(txt) || COORD.test(txt) || /"centre"|"at"\s*:\s*\{/.test(txt);
  });
  eq('N1a THE INTENT: no trip-data golden carries a coordinate, a `centre` or a photo `at`', dirtyTrip, []);
  note('N1b goldens scanned / generated-geometry excluded', { all: allGoldens.length, trip: tripGoldens.length });
  // The CLI: the full output of every command.
  const cliCmds = [['trip'], ['day', '2026-08-13'], ['conflicts'], ['stats']];
  for (const args of cliCmds) {
    let out = '';
    try { out = execFileSync('node', ['--experimental-strip-types', 'cli.ts', ...args], { cwd: CAIRN, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? ''); }
    const hit = COORD.exec(out) || COORD_JSON.exec(out);
    ok(`N2  cli ${args.join(' ')}: no coordinate in the output`, !hit, hit ? hit[0] : undefined);
  }
  // The built web bundle, if one exists.
  const dist = resolve(CAIRN, 'apps/web/dist');
  if (existsSync(dist)) {
    const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
    const assets = walk(dist).filter((f) => /\.(js|css|html|json|map)$/.test(f));
    const bad = [];
    for (const f of assets) {
      const txt = readFileSync(f, 'utf8');
      // The country index is geometry by design and is the one legitimate carrier.
      const m = COORD_JSON.exec(txt);
      if (m) bad.push(`${f.replace(CAIRN, '')}:${m[0]}`);
    }
    eq('N3  no emitted asset carries a {"lat":…,"lng":…} pair', bad, []);
    note('N3a assets scanned', assets.length);
  } else {
    gap('N3  apps/web/dist does not exist — run `npm run web:build` first (checked separately)');
  }
}

// ---------------------------------------------------------------------------
section('O — EC-15: the photo subsystem with no browser, and no dependency movement');
// ---------------------------------------------------------------------------
{
  const pkgDiff = execFileSync('bash', ['-c', `cd ${CAIRN} && git diff --stat HEAD -- package.json package-lock.json | wc -l`], { encoding: 'utf8' }).trim();
  eq('O1  package.json / package-lock.json have a zero-line working diff', pkgDiff, '0');
  const depCount = Object.keys(JSON.parse(readFileSync(resolve(CAIRN, 'package.json'), 'utf8')).dependencies ?? {}).length;
  eq('O1a zero runtime dependencies', depCount, 0);
  const coreImports = execFileSync('bash', ['-c',
    `cd ${CAIRN} && grep -rhn "^import .* from '" packages/core/src packages/client/src --include=*.ts | grep -v "from '\\.\\|from 'node:" | sort -u || true`], { encoding: 'utf8' }).trim();
  eq('O1b core/client import nothing outside themselves and node:', coreImports === '' ? [] : coreImports.split('\n'), []);
  // P1–P13 run under node --test against memoryPhotos().
  const testFiles = execFileSync('bash', ['-c',
    `cd ${CAIRN} && ls packages/core/test/*.test.ts packages/client/test/*.test.ts test/*.test.ts`], { encoding: 'utf8' }).trim().split('\n');
  const owners = {};
  for (const f of testFiles) {
    const txt = readFileSync(resolve(CAIRN, f), 'utf8');
    for (const m of txt.matchAll(/test\(\s*['"`]P(\d{1,2})\s*[::]/g)) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 13) (owners[n] ??= []).push(f);
    }
  }
  const found = Object.keys(owners).map(Number).sort((a, b) => a - b);
  eq('O2  P1–P13 each has a named test under `node --test`', found, [1,2,3,4,5,6,7,8,9,10,11,12,13]);
  note('O2a which file owns each', Object.fromEntries(Object.entries(owners).map(([k, v]) => [k, v[0]])));
  const photoSrc = readFileSync(resolve(CAIRN, 'packages/client/test/photos.test.ts'), 'utf8');
  ok('O2b and the store-side ones run against memoryPhotos()', /memoryPhotos/.test(photoSrc));
  const browsery = testFiles.filter((f) => {
    const txt = readFileSync(resolve(CAIRN, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    return /require\(['"]playwright|from ['"]playwright|puppeteer|\bchromium\.launch\b|\bglobalThis\.document\b|\bnew Worker\(/i.test(txt);
  });
  eq('O2c no test in the suite reaches for a browser', browsery, []);
  // The ceiling: `npm test` and `npm run typecheck` green with no package.json diff — measured
  // by the caller (recorded here so the probe is not the only evidence).
  const gitStatus = execFileSync('bash', ['-c', `cd ${CAIRN} && git status --porcelain -- package.json package-lock.json | wc -l`], { encoding: 'utf8' }).trim();
  eq('O3  no lockfile movement anywhere in the repo', gitStatus, '0');
}

// ---------------------------------------------------------------------------
section('P — EC-E: the export surface, counted rather than assumed');
// ---------------------------------------------------------------------------
{
  const runtime = Object.entries(core).filter(([, v]) => v !== undefined).map(([k]) => k).sort();
  note('P1  runtime symbols on the core index, counted', runtime.length);
  eq('P1a the counted surface is 86', runtime.length, 86);
  const indexSrc = readFileSync(resolve(CAIRN, 'packages/core/src/index.ts'), 'utf8');
  const stated = /(\d+)\s+runtime symbols/.exec(indexSrc)?.[1];
  eq('P2  index.ts’s own docstring states the counted number', Number(stated), runtime.length);
  const arch = readFileSync(resolve(CAIRN, 'docs/ARCHITECTURE.md'), 'utf8');
  const s210 = arch.slice(arch.indexOf('## 2.10') >= 0 ? arch.indexOf('## 2.10') : arch.indexOf('### 2.10'));
  const archNums = [...s210.slice(0, 6000).matchAll(/\b(8[0-9])\b\s*(?:runtime\s*)?symbols?/g)].map((m) => m[1]);
  note('P3  §2.10’s own stated symbol counts near the top of the section', archNums);
  ok('P3a §2.10 states 86', archNums.includes('86') || /\*\*86\*\*/.test(s210.slice(0, 8000)), archNums);
  const roadmap = readFileSync(resolve(CAIRN, 'docs/ROADMAP.md'), 'utf8');
  const eStart = roadmap.indexOf('#### E. The build artifact');
  const eBlock = roadmap.slice(eStart, roadmap.indexOf('#### F. The client'));
  ok('P4  ROADMAP criterion E states the counted number (86)', /exactly — 86 symbols/.test(eBlock), eBlock.slice(0, 0));
  // Criterion E's own mechanical block quote still says "75 entries", four increments stale.
  const staleInE = [...eBlock.matchAll(/\*\*(\d{2,3}) entries\*\*/g)].map((m) => m[1]);
  ok('P4a …and criterion E’s mechanical block quote agrees with it',
    staleInE.every((n) => n === String(runtime.length)),
    `the block quote says ${JSON.stringify(staleInE)} entries while the criterion above it says ${runtime.length}`);

  // The rest of criterion E, run rather than quoted.
  const surfaceTest = readFileSync(resolve(CAIRN, 'packages/core/test/surface.test.ts'), 'utf8');
  const lists = [...surfaceTest.matchAll(/=\s*\[/g)].length;
  ok('P5  surface.test.ts contains no `BEYOND_2_10` and no `INTERNAL` string',
    !/BEYOND_2_10/.test(surfaceTest) && !/'INTERNAL'|"INTERNAL"/.test(surfaceTest));
  note('P5a array literals in surface.test.ts (the criterion asks for exactly one symbol list)', lists);
  const theList = /const\s+THE_LIST[^=]*=\s*\[([\s\S]*?)\];/.exec(surfaceTest);
  const listNames = theList ? [...theList[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : null;
  if (listNames) {
    eq('P5b THE_LIST has exactly as many entries as the index has runtime exports', listNames.length, runtime.length);
    eq('P5c and it is set-equal to the index in both directions',
      [listNames.filter((n) => !runtime.includes(n)), runtime.filter((n) => !listNames.includes(n))], [[], []]);
  } else {
    note('P5b THE_LIST could not be parsed out of surface.test.ts');
  }
  // Ceiling (1): nothing outside packages/core imports a core module path other than index.ts.
  const deepImports = execFileSync('bash', ['-c',
    `cd ${CAIRN} && grep -rnE "(^|[^a-zA-Z])(import|export)[^;]*from ['\\"][^'\\"]*packages/core/src/" packages/client/src apps/web/src cli.ts fixtures tools --include=*.ts --include=*.tsx --include=*.mjs 2>/dev/null | grep -v "core/src/index.ts" || true`], { encoding: 'utf8' }).trim();
  eq('P6  no deep import into packages/core/src/** outside index.ts', deepImports === '' ? [] : deepImports.split('\n'), []);
  // Criterion E's bundle-cleanliness bullet, run against the freshly built dist.
  const SECRETS = ['PIN 0754', '5814731574', 'YZGDTS', 'IU1TUY', 'cityairporttrain.com/en/account/order/', 'ulaznice.hr/web/confirmFromMailGuest/'];
  const distDir = resolve(CAIRN, 'apps/web/dist');
  if (existsSync(distDir)) {
    const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
    const assets = walk(distDir).filter((f) => !/\.woff2?$/.test(f));
    const leaks = [];
    for (const f of assets) { const txt = readFileSync(f, 'utf8'); for (const s of SECRETS) if (txt.includes(s)) leaks.push(`${f.replace(CAIRN, '')}:${s}`); }
    eq('P7  criterion E: the built bundle carries none of the six pinned secrets', leaks, []);
    note('P7a assets scanned', assets.length);
  } else gap('P7  no dist to scan');
  // `cli export` refuses a path outside cairn/.
  for (const bad of ['../europe-2026-itinerary.html', '/etc/passwd', '../docs/BOOKINGS.md']) {
    let refused = false;
    try { execFileSync('node', ['--experimental-strip-types', 'cli.ts', 'export', bad], { cwd: CAIRN, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch { refused = true; }
    ok(`P8  cli export refuses ${bad}`, refused);
  }
}

console.log(`\nCOMPLETE  fails=${fails} gaps=${gaps} notes=${notes}`);
if (failLines.length) console.log('FAILING:\n  ' + failLines.join('\n  '));
process.exitCode = fails ? 1 : 0;
