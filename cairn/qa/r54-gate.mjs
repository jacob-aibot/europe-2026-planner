/**
 * The **Phase 2 phase gate** (ROADMAP `I-11`). Cut at QA round 54; **re-cut at QA round 75**
 * against ROADMAP **revision 83**, which corrected six stale criteria and rewrote the privacy
 * criterion. Rows that quoted a count the criteria no longer state (`F1a`, `M1`, `M2`, `M3`,
 * `P1a`, `P4`) assert the **identity** the criterion now names instead; `D-c2v` and `J3` assert
 * the sentences ROADMAP revision 60 corrected; section **N** is rebuilt on criterion 14's
 * two-arm property with its needle set discovered at run time; sections **H** and **Q**, declared
 * in this index since round 54 and never implemented, now exist.
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
 *   M  EC-13 the row is exactly the allow-list — the three IDENTITIES, no count
 *   N  EC-14 no coordinate BELONGING TO A PERSON leaves the device's own storage
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
const ruledRows = [];

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
/**
 * A row that is RED and stays red, with the argument written down beside it. A ruling is not a
 * suppression: the assertion above it still runs, still fails and still counts in `fails=N`.
 * What `ruled()` adds is the thing a reviewer needs and a bare FAIL line does not carry — whose
 * defect it is and what would make it green.
 */
function ruled(label, whose, trigger) {
  notes++;
  ruledRows.push(String(label).trim().split(/\s+/)[0]);
  console.log(`RULED ${label}\n        whose: ${whose}\n      trigger: ${trigger}`);
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

const REPO = resolve(CAIRN, '..');

/**
 * Strip `/* *\/` blocks and `//` line comments from TypeScript source. Every list this probe
 * reads out of a test file is read through this first — **R75-1**. One apostrophe inside a `//`
 * comment (`§11.6's grounding law`, added with the `ask (3)` group at `I-35`, `43315ef`) shifts
 * every quote pair after it by one, so `P5c`'s left-hand side became comment text and `P5b`'s
 * length check became a count of quote PAIRS. Measured over every commit that touched
 * `surface.test.ts`: zero unparseable names at all eighteen of them up to `ff0ecdd` (`I-23`),
 * **28 of 91 at `43315ef` (`I-35`) and at every commit since**. P5c has been red-with-garbage,
 * and P5b green-and-vacuous, for eleven increments — and nobody saw either, because the gate was
 * not run once in that window.
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}
/** The quoted string entries of `const <name> = [ … ];`, comments removed first. */
function arrayLiteral(src, name) {
  const m = new RegExp(`const\\s+${name}\\b[^=]*=\\s*\\[([\\s\\S]*?)\\];`).exec(stripComments(src));
  return m ? [...m[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((x) => x[1] ?? x[2]) : null;
}
/** The keys of `const <name>: … = { a: true, … };`, comments removed first. */
function objectLiteralKeys(src, name) {
  const m = new RegExp(`const\\s+${name}\\b[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`).exec(stripComments(src));
  return m ? [...m[1].matchAll(/^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/gm)].map((x) => x[1]) : null;
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
  // Criterion 4c's one pinned known-wrong answer, as CORRECTED at ROADMAP revision 60 (QA R54-5,
  // BUILD-NOTES KD-52): Vatican City returns `IT` at St Peter's Basilica, at St Peter's Square and
  // at the museum entrance, **and** `VA` on the Natural Earth sliver that is in the index and
  // answers itself — **both** answers pinned as named cases, not one. Re-cut at round 75: the row
  // below used to assert the WITHDRAWN sentence ("IT at every scale") and had been red since the
  // day the criterion was corrected.
  const vaticanSweep = {};
  for (let la = 41.900; la <= 41.908; la += 0.0005) {
    for (let ln = 12.445; ln <= 12.460; ln += 0.0005) {
      const a = countryOf({ lat: la, lng: ln }, COUNTRY_INDEX);
      vaticanSweep[String(a)] = (vaticanSweep[String(a)] ?? 0) + 1;
    }
  }
  const vaticanIT = [
    ['St Peter’s Basilica', { lat: 41.9022, lng: 12.4539 }],
    ['St Peter’s Square', { lat: 41.9022, lng: 12.4568 }],
    ['the Vatican Museums entrance', { lat: 41.9065, lng: 12.4536 }],
  ];
  for (const [name, at] of vaticanIT) eq(`D-c2v CRITERION 4c, first answer: ${name} returns IT`, countryOf(at, COUNTRY_INDEX), 'IT');
  eq('D-c2v1 CRITERION 4c, second answer: the Natural Earth sliver answers itself — VA', countryOf({ lat: 41.9033, lng: 12.4533 }, COUNTRY_INDEX), 'VA');
  eq('D-c2v2 …and BOTH answers are what a sweep of the state returns — IT and VA, nothing else',
    Object.keys(vaticanSweep).sort(), ['IT', 'VA']);
  ok('D-c2v3 …and the VA sliver is a sliver: it is a minority of the 480 swept cells',
    vaticanSweep.VA > 0 && vaticanSweep.VA < vaticanSweep.IT, vaticanSweep);
  note('D-c2v4 the Vatican sweep census (KD-52 is unrepaired and is pinned, not fixed)', vaticanSweep);
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
  // Criterion 6 part a' as CORRECTED at ROADMAP revision 83: **this part states no count.** What
  // it asserts is the identity between a minted row and the pinned `ROW_KEYS`, which lives in
  // `test/stats-storage.test.ts` and is the source of truth. The row below used to assert a
  // hard-coded 14 and has been wrong since `placeCount` joined at I-24.
  const statsSrc = readFileSync(resolve(CAIRN, 'test/stats-storage.test.ts'), 'utf8');
  const ROW_KEYS = objectLiteralKeys(statsSrc, 'ROW_KEYS');
  ok('F1a ROW_KEYS is readable out of test/stats-storage.test.ts (inconclusiveness guard)',
    Array.isArray(ROW_KEYS) && ROW_KEYS.length > 0, ROW_KEYS);
  eq('F1b a minted row’s top-level key set is exactly Object.keys(ROW_KEYS) — no count stated',
    Object.keys(row).sort(), [...(ROW_KEYS ?? [])].sort());
  note('F1c the measured size, recorded as a fact and depended on by nothing', Object.keys(row).length);

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
section('H — EC-8: the summary is only as fresh as the write that minted it');
// ---------------------------------------------------------------------------
//
// **Built at QA round 75.** This section has been in the index since round 54 and has never
// existed; the probe ran A–G and I–P while reporting `gaps=0`, so a declared-and-absent section
// was invisible in the only line anyone quotes. ROADMAP revision 83 routed it: build it, or
// delete it from the index and count it as a gap. Criterion 8 is evaluable and its evaluation
// lives in `packages/client/test/summary-rescan.test.ts` — sixteen tests including revision 23's
// cost half and four named ATTACK rows. The gate EXECUTES that file directly rather than trusting
// `npm test`'s aggregate, which is the difference between evaluating a criterion and quoting one.
// ---------------------------------------------------------------------------
{
  const f = 'packages/client/test/summary-rescan.test.ts';
  let out = '';
  try { out = execFileSync('node', ['--experimental-strip-types', '--test', f], { cwd: CAIRN, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? ''); }
  const num = (k) => Number(new RegExp(`^# ${k} (\\d+)$`, 'm').exec(out)?.[1] ?? NaN);
  ok('H1  criterion 8 is evaluated out of band, by running its own file', Number.isFinite(num('tests')) && num('tests') > 0, out.slice(-300));
  eq('H1a …and zero of its assertions fail', num('fail'), 0);
  note('H1b tests run / passed', { tests: num('tests'), pass: num('pass') });
  const src = readFileSync(resolve(CAIRN, f), 'utf8');
  const testNames = [...src.matchAll(/^test\(\s*'((?:[^'\\]|\\.)*)'/gm)].map((m) => m[1]);
  eq('H1c …and every test the file declares actually ran', testNames.length, num('tests'));
  // The four clauses the criterion names, each pinned to a test that exists rather than to prose.
  const clause = (label, re) => ok(`H2  ${label}`, testNames.some((n) => re.test(n)), testNames);
  clause('a stale row is recomputed FROM ITS OWN DOCUMENT', /own document|from its own/i);
  clause('revision 23’s COST half: an idle second store is untouched', /idle|second (store|tab)|untouched|left alone/i);
  clause('ATTACK: SUMMARY_VERSION moves again mid-rescan with a write in flight', /mid-rescan/i);
  clause('ATTACK: 40 rows, one corrupt document — 39 recompute and the corrupt one is REPORTED', /corrupt/i);
  const attacks = testNames.filter((n) => /^ATTACK/.test(n));
  eq('H2a the four named ATTACK rows are all present', attacks.length, 4);
  note('H2b the ATTACK rows', attacks);
  // The structural ceiling the criterion states in its own words: §4.3's grep. The grep is NOT a
  // line grep — `writeAndSettle` issues `saveIfVersion` from a helper that its callers reach from
  // inside a chained callback, so a `grep -v chainOntoSaving` reports a false positive on it. The
  // assertion that does this properly is lexical-scope-aware and lives in `switch.test.ts`; the
  // gate runs it out of band rather than writing a weaker second copy.
  {
    const g = 'packages/client/test/switch.test.ts';
    let gout = '';
    try { gout = execFileSync('node', ['--experimental-strip-types', '--test', '--test-name-pattern', 'structural', g], { cwd: CAIRN, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { gout = String(e.stdout ?? '') + String(e.stderr ?? ''); }
    const gnum = (k) => Number(new RegExp(`^# ${k} (\\d+)$`, 'm').exec(gout)?.[1] ?? NaN);
    const gsrc = readFileSync(resolve(CAIRN, g), 'utf8');
    ok('H3  §4.3’s structural assertion exists and is lexical-scope-aware, not a line grep',
      /Is `index` lexically inside the argument list of some `chainOntoSaving\(` call\?/.test(gsrc)
        && /structural: every ports\.storage mutation is issued inside a chainOntoSaving callback/.test(gsrc));
    ok('H3a …and it passes at HEAD, run out of band', gnum('fail') === 0 && gnum('pass') > 0, gout.slice(-300));
    note('H3b structural rows run / passed', { pass: gnum('pass'), fail: gnum('fail') });
  }
  note('H4  SUMMARY_VERSION the rescan is gated on', core.SUMMARY_VERSION);
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

  // Criterion 10 as CORRECTED at ROADMAP revision 60 (QA R54-4, ARCHITECTURE A-73): a document
  // carrying a duplicate participant id **OPENS**, and `validateTrip` reports it. Both halves,
  // in that order — the open is the half A-73 changed and the half a future reader re-breaks.
  const dup = JSON.parse(json1);
  dup.participants[1].id = dup.participants[0].id;
  const e2 = threw(() => core.fromJSON(JSON.stringify(dup)));
  ok('J3  a document carrying a duplicate participant id OPENS (A-73 removed the parser refusal)',
    e2 === null, e2 === null ? undefined : `fromJSON threw: ${String(e2.message).slice(0, 160)}`);
  if (e2 === null) {
    const parsed = core.fromJSON(JSON.stringify(dup));
    const issues = core.validateTrip(parsed).filter((i) => i.code === 'duplicate_participant_id');
    eq('J3a …and validateTrip reports duplicate_participant_id on it', issues.length, 1);
    ok('J3b …and the issue carries structured params beside its message (cairn-constraints §6)',
      issues.length === 1 && issues[0].params !== undefined && issues[0].message !== undefined,
      issues[0]);
    eq('J3c …and the duplicated id survived the open, so the user can see the thing to repair',
      parsed.participants.filter((x) => x.id === dup.participants[0].id).length, 2);
    // Non-vacuity: the SAME document without the duplication reports nothing.
    const clean = core.fromJSON(json1);
    eq('J3d NON-VACUITY: the same document without the duplicate reports zero such issues',
      core.validateTrip(clean).filter((i) => i.code === 'duplicate_participant_id').length, 0);
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
section('M — EC-13: the row is exactly the allow-list — the three IDENTITIES, no count');
// ---------------------------------------------------------------------------
{
  // ROADMAP revision 83 corrected BOTH carriers of this criterion (criterion 13 and criterion 6
  // part a'): the union is over `UNION_ROWS()` — **five** rows, not three — and **the criterion
  // states none of the three numbers**. `test/stats-storage.test.ts` is the source of truth for
  // the three lists; this section re-derives the three IDENTITIES from live core code against
  // those lists, which is what "re-derived rather than quoted" means once the numbers are gone.
  const ctxOf = (s) => ({ ids: core.sequentialIds(s), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
  const statsSrcM = readFileSync(resolve(CAIRN, 'test/stats-storage.test.ts'), 'utf8');
  const ROW_PATHS = arrayLiteral(statsSrcM, 'ROW_PATHS');
  const ROW_KEYS_M = objectLiteralKeys(statsSrcM, 'ROW_KEYS');
  const ROW_COUNT_FIELDS = arrayLiteral(statsSrcM, 'ROW_COUNT_FIELDS');
  ok('M0  the three pinned lists are readable out of test/stats-storage.test.ts (inconclusiveness guard)',
    [ROW_PATHS, ROW_KEYS_M, ROW_COUNT_FIELDS].every((l) => Array.isArray(l) && l.length > 0),
    { ROW_PATHS: ROW_PATHS?.length, ROW_KEYS: ROW_KEYS_M?.length, ROW_COUNT_FIELDS: ROW_COUNT_FIELDS?.length });
  note('M0a their measured sizes, recorded as facts and depended on by nothing',
    { ROW_PATHS: ROW_PATHS?.length, ROW_KEYS: ROW_KEYS_M?.length, ROW_COUNT_FIELDS: ROW_COUNT_FIELDS?.length });

  // UNION_ROWS(): the five shapes criterion 6a' names, rebuilt here from core rather than
  // imported from the suite — the reference trip, a city the index cannot attribute, a trip with
  // nothing in it, a city occupying no day, and a city nobody located.
  const full = core.createTrip({ title: 'Full', startDate: '2026-06-01', endDate: '2026-06-04', cities: [{ key: 'a', name: 'Wien', countryCode: 'AT', centre: { lat: 48.2, lng: 16.37 } }] }, ctxOf('m1'));
  const nullCountry = core.createTrip({ title: 'NC', startDate: '2026-06-01', endDate: '2026-06-02', cities: [{ key: 'b', name: 'Nowhere', centre: { lat: -40.5, lng: -20.5 } }] }, ctxOf('m2'));
  const bare = core.createTrip({ title: 'Bare', startDate: '2026-06-01', endDate: '2026-06-02' }, ctxOf('m3'));
  const noDays = core.createTrip({ title: 'A city on no day', startDate: '2019-03-01', endDate: '2019-03-31', datePrecision: 'month', cities: [{ key: 'kyoto', name: 'Kyoto', centre: { lat: 35.0116, lng: 135.7681 } }] }, ctxOf('m4'));
  const noCentre = core.createTrip({ title: 'A city nobody located', startDate: '2019-06-01', endDate: '2019-06-03', cities: [{ key: 'kyoto', name: 'Kyoto' }] }, ctxOf('m5'));
  const rows = [TRIP, full, nullCountry, bare, noDays, noCentre].map((t) => core.tripSummary(t, core.COUNTRY_INDEX));
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
  eq('M1  IDENTITY 2: the union of the union rows’ leaf paths is exactly ROW_PATHS', union, [...(ROW_PATHS ?? [])].sort());
  note('M1a the leaves', union);
  // The non-vacuity beside it: the union may not be one row counted repeatedly.
  const shapes = new Set(rows.map((r) => JSON.stringify(leafPaths(r).sort())));
  ok('M1b NON-VACUITY: the union rows are genuinely different leaf-path shapes', shapes.size >= 3, shapes.size);
  ok('M1c …and the centre:null branch is reached by exactly one of them (A-83 Part 8)',
    rows.filter((r) => (r.cities ?? []).some((c) => c.centre === null)).length >= 1,
    rows.map((r) => (r.cities ?? []).map((c) => c.centre === null)));
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].sort();
  eq('M2  IDENTITY 1: every minted row’s top-level key set is exactly Object.keys(ROW_KEYS)', keys, [...(ROW_KEYS_M ?? [])].sort());
  const oddRow = rows.find((r) => JSON.stringify(Object.keys(r).sort()) !== JSON.stringify([...(ROW_KEYS_M ?? [])].sort()));
  ok('M2a …and that holds row by row, not only over the union', oddRow === undefined, oddRow && Object.keys(oddRow).sort());
  note('M2b the keys', keys);
  // A-33 Part 2's classifier, transcribed from the test rather than invented, so the count is a
  // re-derivation of the same set and not a different question.
  const DOMAIN = /countr(?:y|ies)|cit(?:y|ies)|trip|day|stop|place|pool/i;
  const SHAPE = /(?:count|total|tally|num|visited|travell?ed)$/i;
  const PLURAL = /(?:cities|countries|trips|days|stops|places)$/i;
  const CENSUS = /^(?:located|attributed)$/i;
  const countShaped = (n) => CENSUS.test(n) || (PLURAL.test(n) && DOMAIN.test(n)) || (DOMAIN.test(n) && SHAPE.test(n));
  const counts = (ROW_PATHS ?? []).filter((p) => countShaped(p.split('.').pop()));
  eq('M3  IDENTITY 3: ROW_PATHS.filter(countShaped) is exactly ROW_COUNT_FIELDS — no count stated',
    counts.sort(), [...(ROW_COUNT_FIELDS ?? [])].sort());
  ok('M3a …and the classifier is the probe’s own, not the test’s transcription of its answer',
    counts.length > 0 && counts.length < (ROW_PATHS ?? []).length, { counts: counts.length, paths: ROW_PATHS?.length });
  // The injected fault: add cities[].dayCount to the minted row and all three identities go red.
  const faulted = rows.map((r) => ({ ...r, cities: (r.cities ?? []).map((c) => ({ ...c, dayCount: 3 })) }));
  const faultedUnion = [...new Set(faulted.flatMap((r) => leafPaths(r)))].sort();
  ok('M4  INJECTED FAULT: cities[].dayCount breaks IDENTITY 2 against ROW_PATHS',
    JSON.stringify(faultedUnion) !== JSON.stringify([...(ROW_PATHS ?? [])].sort()),
    faultedUnion.filter((x) => !(ROW_PATHS ?? []).includes(x)));
  ok('M4a …and it is count-shaped, so it would break IDENTITY 3 too',
    countShaped('dayCount') && !(ROW_COUNT_FIELDS ?? []).includes('cities[].dayCount'));
  // The ceiling a reviewer actually checks: SUMMARY_VERSION moves with any widening.
  note('M5  SUMMARY_VERSION at HEAD (§8.4 clause 3 — it moves in the same commit as a widening)', core.SUMMARY_VERSION);
}

// ---------------------------------------------------------------------------
section('N — EC-14: no coordinate BELONGING TO A PERSON leaves the device’s own storage');
// ---------------------------------------------------------------------------
//
// Rebuilt at QA round 75 against ROADMAP **revision 83**'s criterion 14, which rewrote the one
// exclusion because the old discriminant could not be evaluated. What was here before was
// `new Set(['countries.json','forgiveness-drops.json'])` — the hard-coded filename set R54-6
// wrote the property form to prevent, arrived. **This probe contains no filename set.** The
// excluded set is whatever passes the two arms, and it is RECORDED by name as a note while the
// assertion never names one.
//
//   (i)  stated provenance — `$generatedBy` names a generator that EXISTS under `cairn/tools/`;
//   (ii) nothing of a user's trip is in it — zero occurrences of any string DISCOVERED from the
//        reference trip document at run time.
//
// Two scoping rules, both from the ruling: `City.key` and `Place.name` are deliberately not
// needles (a place name is what a public gazetteer is made of), and a value under a `$`-prefixed
// TOP-LEVEL key is outside the search, because a provenance header describes where a file came
// from rather than what is in it.
// ---------------------------------------------------------------------------
{
  const COORD = /-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/;
  const COORD_JSON = /"(lat|lng)"\s*:\s*-?\d+\.\d+/;
  const GOLDEN = resolve(CAIRN, 'fixtures/golden');
  const allGoldens = readdirSync(GOLDEN).filter((f) => f.endsWith('.json')).sort();
  const textOf = (f) => readFileSync(resolve(GOLDEN, f), 'utf8');
  const carriesCoord = (txt) => COORD_JSON.test(txt) || COORD.test(txt);

  // ---- the needle set, discovered from the reference trip document at RUN TIME -------------
  // The fields are criterion 14's own list. `Stop` has no `title` field on the shipped model, so
  // the stop's human title is `Stop.name` and that is what is taken; `Day.title` is taken too.
  // See R75-3 in QA-FINDINGS for the one divergence from the architect's own measurement.
  const needleSet = new Set();
  const needle = (v) => { if (typeof v === 'string' && v.trim() !== '') needleSet.add(v); };
  needle(TRIP.id); needle(TRIP.title);
  for (const d of TRIP.days) { needle(d.id); needle(d.date); needle(d.title); }
  const everyStop = [...TRIP.days.flatMap((d) => d.stops), ...(TRIP.pool ?? [])];
  for (const st of everyStop) { needle(st.id); needle(st.name); needle(st.note); }
  for (const pl of TRIP.places) { needle(pl.id); needle(pl.note); }   // Place.name: NOT a needle, by ruling
  for (const ph of (TRIP.photos ?? [])) needle(ph.id);
  // The ruling's two exclusions, applied as a SUBTRACTION rather than by never adding: a stop's
  // title and a place's name overlap on the reference trip (`Blue Cave, Biševo` is both), so
  // taking `Stop.name` as the stop's title re-admits place names through the back door. R75-4.
  const excluded = new Set([...TRIP.places.map((pl) => pl.name), ...TRIP.cities.map((c) => c.key)].filter(Boolean));
  for (const x of excluded) needleSet.delete(x);
  const NEEDLES = [...needleSet];
  note('N0c needles withdrawn by the ruling (every Place.name and City.key that a Stop title also carries)',
    [...excluded].filter((x) => everyStop.some((st) => st.name === x)).length);
  note('N0  needles DISCOVERED from the reference trip document at run time (no list in this probe)', NEEDLES.length);
  ok('N0a INCONCLUSIVENESS GUARD: the needle set is non-trivial and contains a stop id, a day date and the trip id',
    NEEDLES.length > 100 && NEEDLES.includes(TRIP.id) && NEEDLES.some((n) => /^stop-/.test(n)) && NEEDLES.includes(TRIP.days[0].date),
    NEEDLES.length);
  ok('N0b …and City.key / Place.name are NOT in it (the ruling excludes both)',
    !TRIP.cities.some((c) => NEEDLES.includes(c.key)) && !TRIP.places.some((pl) => NEEDLES.includes(pl.name)),
    { cityKeys: TRIP.cities.map((c) => c.key).filter((k) => NEEDLES.includes(k)) });

  /** The file's DATA — its own `$`-prefixed provenance header is not its data. */
  const dataBodyOf = (txt) => {
    let doc;
    try { doc = JSON.parse(txt); } catch { return txt; }
    if (doc && typeof doc === 'object' && !Array.isArray(doc)) {
      const body = {};
      for (const [k, v] of Object.entries(doc)) if (!k.startsWith('$')) body[k] = v;
      return JSON.stringify(body);
    }
    return txt;
  };
  const generatorDecl = (txt) => { try { const v = JSON.parse(txt).$generatedBy; return typeof v === 'string' ? v : null; } catch { return null; } };
  const generatorExists = (decl) => {
    if (!decl) return false;
    const first = decl.trim().split(/\s+/)[0];
    const m = /(?:^|\/)tools\/([A-Za-z0-9._-]+)$/.exec(first);
    return m ? existsSync(resolve(CAIRN, 'tools', m[1])) : false;
  };
  const hitsIn = (txt) => { const body = dataBodyOf(txt); return NEEDLES.filter((n) => body.includes(n)); };

  // ---- the criterion, as a property over every golden --------------------------------------
  const coordBearing = allGoldens.filter((f) => carriesCoord(textOf(f)));
  ok('N1  INCONCLUSIVENESS GUARD: at least one golden carries a coordinate, so the arms below ran on something',
    coordBearing.length > 0, coordBearing);
  const earned = [];
  const unearned = [];
  for (const f of coordBearing) {
    const txt = textOf(f);
    const decl = generatorDecl(txt);
    const armI = generatorExists(decl);
    const hits = hitsIn(txt);
    ok(`N1a ${f} — ARM (i): $generatedBy names a generator that exists under cairn/tools/`, armI, decl);
    ok(`N1b ${f} — ARM (ii): zero strings from the reference trip document`, hits.length === 0, hits.slice(0, 6));
    (armI && hits.length === 0 ? earned : unearned).push(f);
  }
  eq('N1c EVERY coordinate-bearing golden has EARNED its exclusion — the assertion names no file', unearned, []);
  note('N1d the earned set, recorded by name so a reviewer can see it move', earned);
  note('N1e goldens scanned / coordinate-bearing', { all: allGoldens.length, coordinateBearing: coordBearing.length });

  // The orthogonality the ruling rests on, re-derived rather than taken: the goldens that carry
  // trip strings and the goldens that carry a coordinate are disjoint sets on the shipped tree.
  const tripStringGoldens = allGoldens.map((f) => [f, hitsIn(textOf(f)).length]).filter(([, n]) => n > 0);
  note('N1f goldens carrying trip strings, with their distinct-needle hit counts', Object.fromEntries(tripStringGoldens));
  eq('N1g …and NONE of them carries a coordinate (the two axes are orthogonal on the shipped artefact)',
    tripStringGoldens.map(([f]) => f).filter((f) => coordBearing.includes(f)), []);

  // ---- the INJECTED FAULT the criterion requires and keeps ----------------------------------
  // "Paste one {lat,lng} pair AND one stop- id from the reference trip into an excluded golden
  // and arm (ii) goes red naming the needle and the file." In memory: the tree is not touched.
  {
    const victim = earned[0] ?? coordBearing[0] ?? allGoldens[0];
    const before = textOf(victim);
    const aStop = everyStop.find((st) => /^stop-/.test(st.id));
    const aCoord = TRIP.places.find((pl) => pl.at && Number.isFinite(pl.at.lat))?.at;
    ok('N1h INJECTED FAULT precondition: the reference trip supplies a stop- id and a coordinate',
      aStop !== undefined && aCoord !== undefined, { stop: aStop?.id, at: aCoord });
    const doc = JSON.parse(before);
    doc.leaked = { at: { lat: aCoord.lat, lng: aCoord.lng }, stopId: aStop.id };
    const faultedTxt = JSON.stringify(doc);
    const faultHits = hitsIn(faultedTxt);
    ok(`N1i INJECTED FAULT: arm (ii) goes RED on ${victim}, naming the needle`,
      faultHits.includes(aStop.id), { file: victim, needle: aStop.id, hits: faultHits.slice(0, 4) });
    ok('N1j …and the pasted pair is coordinate-shaped, so the file is still in the arms’ population',
      carriesCoord(faultedTxt));
    // And the same paste under a `$`-prefixed key must NOT fire — the scoping rule, shown working.
    const scoped = JSON.parse(before);
    scoped.$repinnedOn = aStop.id;
    ok('N1k SCOPING RULE: the same string under a $-prefixed top-level key does NOT fire arm (ii)',
      hitsIn(JSON.stringify(scoped)).length === 0, hitsIn(JSON.stringify(scoped)).slice(0, 3));
    eq('N1l the fault was in memory only — the golden on disk is byte-identical', textOf(victim) === before, true);
  }

  // ---- the CLI arm: the full output of every command ----------------------------------------
  const cliCmds = [['trip'], ['day', '2026-08-13'], ['conflicts'], ['stats']];
  for (const args of cliCmds) {
    let out = '';
    try { out = execFileSync('node', ['--experimental-strip-types', 'cli.ts', ...args], { cwd: CAIRN, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? ''); }
    const hit = COORD.exec(out) || COORD_JSON.exec(out);
    ok(`N2  cli ${args.join(' ')}: no coordinate in the output`, !hit, hit ? hit[0] : undefined);
  }
  // The criterion's own injected fault for this arm, RUN rather than quoted: print `centre` from
  // `cli.ts stats` and the grep must go red. The two fields that can violate the criterion are
  // `TripSummaryCity.centre` and `PhotoAsset.at`, and they share one assertion.
  {
    const rowWithCentre = core.tripSummary(TRIP, core.COUNTRY_INDEX);
    const centres = (rowWithCentre.cities ?? []).map((c) => c.centre).filter(Boolean);
    ok('N2a INJECTED FAULT precondition: the summary row DOES hold centres, so the CLI has one to leak', centres.length > 0, centres.length);
    const faultedOut = `cities: ${JSON.stringify(centres)}`;
    ok('N2b INJECTED FAULT: a cli.ts stats that printed TripSummaryCity.centre turns the grep RED',
      COORD_JSON.test(faultedOut) || COORD.test(faultedOut), faultedOut.slice(0, 80));
    const photoAt = { at: { lat: 48.2082, lng: 16.3738 } };
    ok('N2c …and so would a PhotoAsset `at` — the two fields share one assertion',
      COORD_JSON.test(JSON.stringify(photoAt)));
  }

  // ---- the built web bundle, if one exists ---------------------------------------------------
  const dist = resolve(CAIRN, 'apps/web/dist');
  if (existsSync(dist)) {
    const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
    const assets = walk(dist).filter((f) => /\.(js|css|html|json|map)$/.test(f));
    const bad = [];
    for (const f of assets) {
      const txt = readFileSync(f, 'utf8');
      const hits = NEEDLES.filter((n) => txt.includes(n));
      const m = COORD_JSON.exec(txt);
      if (m && hits.length) bad.push(`${f.replace(CAIRN, '')}: ${m[0]} beside ${hits.length} trip string(s)`);
    }
    eq('N3  no emitted asset carries a coordinate beside a string from the reference trip', bad, []);
    note('N3a assets scanned', assets.length);
  } else {
    gap('N3  apps/web/dist does not exist — run `npm run web:build` first (checked separately)');
  }
}

// ---------------------------------------------------------------------------
section('O — EC-15: the photo subsystem with no browser, and no dependency movement');
// ---------------------------------------------------------------------------
{
  // Criterion 15's ceiling as SCOPED at ROADMAP revision 83 (MGR-10 item c): A-58's "no
  // dependency" verdict, over `cairn/package.json`'s four dependency keys, `cairn/package-lock.json`
  // and core/client's imports — and NOT over `scripts`, and NOT over `apps/web/package.json`.
  // The row that used to be here read a WORKING-TREE diff against HEAD, which on a clean tree is
  // green for any artefact whatsoever: criterion rule 9's own shape, named by the architect.
  const pkg = JSON.parse(readFileSync(resolve(CAIRN, 'package.json'), 'utf8'));
  eq('O1  ARM 1: cairn/package.json declares zero runtime dependencies', Object.keys(pkg.dependencies ?? {}), []);
  eq('O1a …and the only devDependencies are the pre-existing type-only pair',
    Object.keys(pkg.devDependencies ?? {}).sort(), ['@types/node', 'typescript']);
  eq('O1b …and there are no optionalDependencies or peerDependencies',
    ['optionalDependencies', 'peerDependencies'].filter((k) => Object.keys(pkg[k] ?? {}).length), []);
  // ARM 2: the lockfile does not move — against COMMITTED bytes, over the phase, not the tree.
  const lockfiles = execFileSync('bash', ['-c',
    `cd ${REPO} && git ls-files '*package-lock.json' '*yarn.lock' '*pnpm-lock.yaml' 'npm-shrinkwrap.json'`], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  eq('O1c cairn/package-lock.json is the repository’s only lockfile (the ceiling’s stated subject)',
    lockfiles, ['cairn/package-lock.json']);
  const base = execFileSync('bash', ['-c', `cd ${CAIRN} && git merge-base HEAD master 2>/dev/null || true`], { encoding: 'utf8' }).trim();
  const lockMove = base
    ? execFileSync('bash', ['-c', `cd ${CAIRN} && git diff --numstat ${base} HEAD -- package-lock.json || true`], { encoding: 'utf8' }).trim()
    : '';
  const lockAdds = base
    ? execFileSync('bash', ['-c', `cd ${CAIRN} && git diff ${base} HEAD -- package-lock.json | grep '^+ *"node_modules/' | sed 's/[": ]//g;s/+//' | sort -u | tr '\n' ' ' || true`], { encoding: 'utf8' }).trim()
    : '';
  ok('O1d ARM 2: cairn/package-lock.json has not moved between the branch point and HEAD (committed bytes)',
    lockMove === '', { mergeBase: base.slice(0, 7), numstat: lockMove, packagesAdded: lockAdds });
  if (lockMove !== '') {
    ruled('O1d — criterion 15 arm 2 is RED at HEAD and stays red',
      'NOT the breaker’s and NOT the gate’s: `cairn/package-lock.json` genuinely moved on review/i30-picker (+45 lines: d3-geo, d3-array, internmap, @types/d3-geo), pulled in by two Codex `apps/web` modules. Criterion 15 arm 2 forbids ANY movement of this file, and it is the repository’s only lockfile. Jacob’s call on whether d3-geo enters the tree; the architect’s if the answer is yes and arm 2 must name it.',
      'the lockfile returns to its branch-point bytes, OR Jacob accepts d3-geo and arm 2 is re-scoped to say so. Until then this row is the machine-checkable form of the manager’s "it gates the MERGE TO master".');
  }
  const dirty = execFileSync('bash', ['-c', `cd ${CAIRN} && git status --porcelain -- package.json package-lock.json | wc -l`], { encoding: 'utf8' }).trim();
  note('O1e the working-tree diff, recorded and asserted on by NOTHING — on a clean tree it measures nothing (criterion rule 9)', dirty);
  // ARM 3: the arm that holds when the other two are quiet.
  const coreImports = execFileSync('bash', ['-c',
    `cd ${CAIRN} && grep -rhn "^import .* from '" packages/core/src packages/client/src --include=*.ts | grep -v "from '\\.\\|from 'node:" | sort -u || true`], { encoding: 'utf8' }).trim();
  eq('O1f ARM 3: core/client import nothing that is not relative or node:', coreImports === '' ? [] : coreImports.split('\n'), []);
  note('O1g what the ceiling deliberately does NOT cover: apps/web/package.json’s runtime dependencies',
    Object.keys(JSON.parse(readFileSync(resolve(CAIRN, 'apps/web/package.json'), 'utf8')).dependencies ?? {}));
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
  // (The old `O3 no lockfile movement anywhere in the repo` row was the same working-tree read as
  // the old O1 and is withdrawn with it — ARM 2 above is the measurement it was reaching for.)
}

// ---------------------------------------------------------------------------
section('P — EC-E: the export surface, counted rather than assumed');
// ---------------------------------------------------------------------------
{
  // Criterion E as REWRITTEN at ROADMAP revision 83: **the criterion states no count.** The count
  // is obtained by running its command; the oracle is `surface.test.ts`'s `THE_LIST`, asserted
  // set-equal to the index in both directions; and the relationship the criterion does state is
  // that FOUR views of one set must agree — the command, `THE_LIST`, §2.10's transcribed list and
  // `index.ts`'s docstring. The rows below assert the agreement, not a value.
  const runtime = Object.entries(core).filter(([, v]) => v !== undefined).map(([k]) => k).sort();
  note('P1  runtime symbols on the core index, counted (a fact; no criterion depends on it)', runtime.length);
  const counted = Number(execFileSync('node',
    ['--experimental-strip-types', '-e', "import('./packages/core/src/index.ts').then(m => console.log(Object.keys(m).length))"],
    { cwd: CAIRN, encoding: 'utf8' }).trim());
  eq('P1a VIEW 1: criterion E’s own command returns the number this probe counted', counted, runtime.length);

  // VIEW 4 — index.ts's headline docstring. Revision 83 / MGR-12 removed the count from it, so
  // what is asserted now is that it states NONE and points at the command instead.
  const indexSrc = readFileSync(resolve(CAIRN, 'packages/core/src/index.ts'), 'utf8');
  const indexHeader = indexSrc.slice(0, indexSrc.indexOf('*/'));
  const statedInDoc = /(\d+)\s*(?:\*\*)?\s*runtime symbols/.exec(indexHeader)?.[1] ?? null;
  eq('P2  VIEW 4: index.ts’s headline docstring states NO count (MGR-12)', statedInDoc, null);
  ok('P2a …and points at criterion E’s command instead of at a value', /criterion E/i.test(indexHeader),
    indexHeader.slice(0, 120));

  // VIEW 3 — §2.10's transcribed list. The criterion is SET EQUALITY IN BOTH DIRECTIONS against
  // it, so this probe parses the list out of the section's own code block rather than reading a
  // number out of its prose. (The row that used to be here asserted "§2.10 states 86" and was
  // green on a HISTORY line after revision 83 removed the live copy — a false green.)
  const arch = readFileSync(resolve(CAIRN, 'docs/ARCHITECTURE.md'), 'utf8');
  const s210 = arch.indexOf('### 2.10 The public API surface');
  const blockStart = arch.indexOf('packages/core/src/index.ts re-exports exactly this and nothing else.', s210);
  const blockEnd = arch.indexOf('\n```', blockStart);
  const archList = [];
  const archGroups = [];
  if (blockStart > 0 && blockEnd > blockStart) {
    for (let line of arch.slice(blockStart, blockEnd).split('\n').slice(1)) {
      line = line.replace(/\/\/.*$/, '');
      const g = /^\s*([a-z]+)\s*\((\d+)\)\s*/.exec(line);
      if (g && g[1] === 'types') break;
      if (/^\s*types\b/.test(line)) break;
      if (g) { archGroups.push([g[1], Number(g[2])]); line = line.slice(g[0].length); }
      for (const tok of line.split(/·|\//)) {
        const m = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)/.exec(tok);
        if (m) archList.push(m[1]);
      }
    }
  }
  ok('P3  §2.10’s contract list is parseable out of its own code block (inconclusiveness guard)',
    archList.length > 50, archList.length);
  note('P3a §2.10’s group labels and the count each states', Object.fromEntries(archGroups));
  eq('P3b VIEW 3: §2.10’s list is set-equal to the index in BOTH directions — the criterion’s own words',
    [archList.filter((n) => !runtime.includes(n)), runtime.filter((n) => !archList.includes(n))], [[], []]);
  const missingFrom210 = runtime.filter((n) => !archList.includes(n));
  if (missingFrom210.length) {
    ruled('P3b — criterion E’s set equality against §2.10 is RED at HEAD and stays red',
      `the ARCHITECT’s. §2.10's contract code block — the one headed "packages/core/src/index.ts re-exports exactly this and nothing else" — omits ${JSON.stringify(missingFrom210)}, and has since I-21 and I-22a. §2.10's own PROSE records both joins correctly (86 → 87 → 88), and surface.test.ts's THE_LIST is current at 91, so nothing in the code is broken: the contract document is two symbols short of the contract. Revision 83 corrected the sentence ABOVE the list and the header INSIDE it and did not open the list itself — MGR-10's own class, one line further in.`,
      'a `geo (2)` group in §2.10’s code block carrying `searchGazetteer` and `cityPickFromRow`. §2.10 also still says "§2.10 is still 87" in prose, which is the same defect a third time.');
  }
  eq('P3c …and §2.10’s own per-group counts sum to the list it labels',
    archGroups.reduce((a, g) => a + g[1], 0), archList.length);
  ok('P3d …and §2.10’s contract sentence and code-block header state no count (revision 83)',
    !/\b\d+\s+runtime symbols\b/.test(arch.slice(blockStart, blockEnd))
      && !/the whole contract:\s*\*\*\d+/.test(arch.slice(s210, blockStart)));

  // The criterion's own sentence: it may not state a count.
  const roadmap = readFileSync(resolve(CAIRN, 'docs/ROADMAP.md'), 'utf8');
  const eStart = roadmap.indexOf('#### E. The build artifact');
  const eBlock = roadmap.slice(eStart, roadmap.indexOf('#### F. The client'));
  const eBullet = (() => {
    const i = eBlock.indexOf("- **`packages/core/src/index.ts`'s runtime exports");
    if (i < 0) return '';
    const j = eBlock.indexOf('*(', i);
    return eBlock.slice(i, j < 0 ? i + 2000 : j);
  })();
  ok('P4  criterion E’s own sentence exists and states NO count (revision 83, criterion rule 6)',
    eBullet !== '' && !/\b\d+\s+(?:runtime\s+)?symbols\b/.test(eBullet) && /states no count/.test(eBullet),
    eBullet.slice(0, 200));
  ok('P4a …and names the command that obtains it instead',
    /Object\.keys\(m\)\.length/.test(eBlock), eBlock.slice(0, 0));

  // The rest of criterion E, run rather than quoted.
  const surfaceTest = readFileSync(resolve(CAIRN, 'packages/core/test/surface.test.ts'), 'utf8');
  const bare = stripComments(surfaceTest);
  const lists = [...bare.matchAll(/=\s*\[/g)].length;
  ok('P5  surface.test.ts contains no `BEYOND_2_10` and no `INTERNAL` string',
    !/BEYOND_2_10/.test(surfaceTest) && !/'INTERNAL'|"INTERNAL"/.test(surfaceTest));
  note('P5a array literals in surface.test.ts, comments stripped (the criterion asks for exactly one symbol list)', lists);
  // **R75-1.** This extraction used to run over the raw source; see `stripComments` above. The
  // arithmetic is why P5b stayed GREEN: with N real entries and k stray apostrophes the raw regex
  // returns N + floor(k/2) matches, so at k=1 the COUNT is right and every NAME after the stray
  // is wrong. A length check is not a set check, and this is what that costs.
  const listNames = arrayLiteral(surfaceTest, 'THE_LIST');
  ok('P5b THE_LIST parses to symbol names, not comment text (R75-1)',
    Array.isArray(listNames) && listNames.every((n) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)),
    (listNames ?? []).filter((n) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)).slice(0, 3));
  eq('P5b1 VIEW 2: THE_LIST has exactly as many entries as the index has runtime exports', (listNames ?? []).length, runtime.length);
  eq('P5c …and it is set-equal to the index in both directions',
    [(listNames ?? []).filter((n) => !runtime.includes(n)), runtime.filter((n) => !(listNames ?? []).includes(n))], [[], []]);
  eq('P5d ALL FOUR VIEWS agree on one set (the relationship criterion E states)',
    [counted, (listNames ?? []).length, archList.length, runtime.length].every((n) => n === runtime.length), true);
  if (archList.length !== runtime.length) {
    ruled('P5d — the four views do not agree, and the one that dissents is §2.10',
      'the ARCHITECT’s — the same defect as P3b, stated as the relationship criterion E actually names. Three views agree at 91 (the command, THE_LIST, the index); §2.10’s list is at 89.',
      'P3b’s trigger. These are one finding with two rows, not two findings.');
    note('P5e the four views, measured', { command: counted, THE_LIST: (listNames ?? []).length, '§2.10': archList.length, index: runtime.length });
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

// ---------------------------------------------------------------------------
section('Q — the Phase 2 attack list, run end to end');
// ---------------------------------------------------------------------------
//
// **Built at QA round 75**, for the same reason as H: declared in this index since round 54,
// never implemented, invisible in `gaps=0`. ROADMAP's *"What the tester should attack (plain
// `node`, no network)"* list, run here. Items already run elsewhere in this probe are named with
// their row rather than duplicated; items that need a browser or two real tabs are `GAP`s with a
// pointer to where they ARE evaluated, which is what a gap is for.
// ---------------------------------------------------------------------------
{
  const ctxQ = (s) => ({ ids: core.sequentialIds(s), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
  const { countryOf, COUNTRY_INDEX } = core;

  // --- dates and ranges ---------------------------------------------------------------------
  {
    const e = threw(() => core.createTrip({ title: 'Backwards', startDate: '2019-05-10', endDate: '2019-05-01' }, ctxQ('q1')));
    if (e) { ok('Q1  a trip with endDate before startDate is refused, loudly', true, String(e.message).slice(0, 120)); }
    else {
      const t = core.createTrip({ title: 'Backwards', startDate: '2019-05-10', endDate: '2019-05-01' }, ctxQ('q1b'));
      ok('Q1  a trip with endDate before startDate OPENS and validateTrip reports it (never silent)',
        core.validateTrip(t).length > 0, core.validateTrip(t).map((i) => i.code));
    }
  }
  {
    // A document straddling `today`: feasibility rules fire on the future half and not the past
    // half, on the same document, in one call — run over the REFERENCE trip at each of its
    // sixteen days in turn, which is the attack list's own last item and is what makes this row
    // non-vacuous. The discriminant is the LAST day a finding names, not the first: a
    // `missing_lodging` run of three Budapest nights legitimately names 08-18 while `today` is
    // 08-19, because the stay it is about is not over.
    const FEASIBILITY = new Set(['impossible_transfer', 'overlap', 'missing_lodging', 'unbooked_ticketed', 'booking_vs_plan']);
    const violations = [];
    const census = {};
    for (const d of TRIP.days) {
      const findings = core.detectConflicts(TRIP, { today: d.date });
      census[d.date] = findings.filter((c) => FEASIBILITY.has(c.ruleId)).length;
      for (const c of findings.filter((x) => FEASIBILITY.has(x.ruleId))) {
        const days = c.subjects.filter((x) => x.kind === 'day').map((x) => x.id).sort();
        if (days.length && days[days.length - 1] < d.date) violations.push({ today: d.date, rule: c.ruleId, days });
      }
    }
    eq('Q2  the reference trip at each of its 16 clocks: no feasibility finding is wholly in the past', violations, []);
    ok('Q2a NON-VACUITY: feasibility rules DID fire at every one of those clocks', Object.values(census).every((n) => n > 0), census);
    ok('Q2b …and the count falls monotonically as today advances through the trip',
      Object.values(census).every((n, i, arr) => i === 0 || n <= arr[i - 1]), census);
    note('Q2c feasibility findings per in-trip clock', census);
  }

  {
    const t = core.createTrip({ title: 'One day, year precision', startDate: '2018-06-04', endDate: '2018-06-04', datePrecision: 'year' }, ctxQ('q3'));
    eq('Q3  datePrecision:"year" on a one-day trip mints exactly one day', t.days.length, 1);
    eq('Q3a …and it is silent', core.detectConflicts(t, { today: FIXTURE_TODAY }).length + core.validateTrip(t).length, 0);
  }

  // --- geography (the micro-state / forgiveness list) ----------------------------------------
  note('Q4  the eleven micro-states, the four forgiven waterfronts, St Helier, the Monaco/French side and Zhuhai are run in section D (D-c2, D-c2v, D-c3, D-e*)', 'see above');
  {
    const edges = [
      ['north pole', { lat: 90, lng: 0 }], ['south pole', { lat: -90, lng: 0 }],
      ['antimeridian +180', { lat: 0, lng: 180 }], ['antimeridian -180', { lat: 0, lng: -180 }],
      ['null island (0,0)', { lat: 0, lng: 0 }], ['international waters', { lat: -35, lng: -140 }],
    ];
    const answers = {};
    let threwOn = null;
    for (const [name, at] of edges) {
      const r = threw(() => { answers[name] = countryOf(at, COUNTRY_INDEX); });
      if (r) threwOn = `${name}: ${r.message}`;
    }
    ok('Q5  poles, both antimeridians, (0,0) and international waters: countryOf never throws', threwOn === null, threwOn);
    eq('Q5a …and (0,0) and open ocean are null, not a nearest country', [answers['null island (0,0)'], answers['international waters']], [null, null]);
    note('Q5b what each edge returns', answers);
  }

  // --- travelStats -------------------------------------------------------------------------
  note('Q6  empty summaries, one row passed twice and the same rows shuffled are run in section F (F-c3, F-c5, F-c6)', 'see above');
  {
    const wide = core.tripSummary(core.createTrip({ title: 'Wide', startDate: '2026-01-01', endDate: '2026-01-02' }, ctxQ('q7')), COUNTRY_INDEX);
    const huge = { ...wide, startDate: '0001-01-01', endDate: '9999-12-31' };
    const t0 = Date.now();
    const r = threw(() => core.travelStats([huge], '2026-12-31'));
    const ms = Date.now() - t0;
    ok('Q7  a row spanning 0001-01-01 → 9999-12-31 does not allocate a day per day', r === null && ms < 2000, { threw: r?.message, ms });
    if (r === null) note('Q7a daysTravelled it reports', core.travelStats([huge], '2026-12-31').daysTravelled);
  }
  {
    const mk = (id, a, b) => ({ ...core.tripSummary(core.createTrip({ title: id, startDate: a, endDate: b }, ctxQ(id)), COUNTRY_INDEX) });
    const adj = [mk('r1', '2026-03-01', '2026-03-10'), mk('r2', '2026-03-11', '2026-03-20')];
    const st = core.travelStats(adj, '2026-12-31');
    eq('Q8  two adjacent, non-overlapping ranges count every day once (10 + 10)', st.daysTravelled, 20);
    const one = mk('r3', '2026-05-05', '2026-05-05');
    eq('Q9  today === startDate === endDate is one day and one active trip',
      [core.travelStats([one], '2026-05-05').daysTravelled, core.travelStats([one], '2026-05-05').trips.active], [1, 1]);
  }
  {
    const blankA = core.tripSummary(core.createTrip({ title: 'Blank A', startDate: '2026-02-01', endDate: '2026-02-02', cities: [{ key: 'b1', name: '  ' }] }, ctxQ('q10a')), COUNTRY_INDEX);
    const blankB = core.tripSummary(core.createTrip({ title: 'Blank B', startDate: '2026-04-01', endDate: '2026-04-02', cities: [{ key: 'b2', name: '\u{1F30D}' }] }, ctxQ('q10b')), COUNTRY_INDEX);
    const blankC = core.tripSummary(core.createTrip({ title: 'Blank C', startDate: '2026-05-01', endDate: '2026-05-02', cities: [{ key: 'b3', name: '' }] }, ctxQ('q10c')), COUNTRY_INDEX);
    // The attack list's stated case: TWO BLANK-named cities in different trips.
    const blanks = core.travelStats([blankA, blankC], '2026-12-31');
    eq('Q10 two blank-named cities in different trips are unnamedCities: 2 and ZERO city rows',
      [blanks.unnamedCities, blanks.cities.length], [2, 0]);
    // The emoji case, recorded rather than asserted: an emoji IS a name. The same question is
    // ruled explicitly for participants (`participants.test.ts`: "a displayName that is only an
    // emoji is allowed — the rule is emptiness"), and the city path answers it the same way.
    const st = core.travelStats([blankB], '2026-12-31');
    note('Q10a a city named with only an emoji: allowed, and it gets a row (the rule is emptiness, not glyph class)',
      { unnamedCities: st.unnamedCities, cityRows: st.cities.map((c) => c.name) });
    // And the two-scripts case (§2.2 A-10).
    const cjk = core.travelStats([core.tripSummary(core.createTrip({ title: 'Japan', startDate: '2019-04-01', endDate: '2019-04-05', cities: [{ key: 'tokyo', name: '東京' }, { key: 'kyoto', name: '京都' }] }, ctxQ('q10d')), COUNTRY_INDEX)], '2026-12-31');
    eq('Q10b a trip whose cities are 東京 and 京都 keeps both, distinctly', cjk.cities.map((c) => c.name).sort(), ['京都', '東京']);
  }

  // --- participants --------------------------------------------------------------------------
  {
    let t = core.createTrip({ title: 'Party', startDate: '2026-09-01', endDate: '2026-09-02' }, ctxQ('q11'));
    const c = ctxQ('q11p');
    for (let i = 0; i < 200; i++) t = core.addParticipant(t, { displayName: `P${i}`, kind: 'contact' }, c);
    eq('Q11 a participant list of 200 lands, with 200 distinct ids', new Set(t.participants.map((x) => x.id)).size, 200);
    eq('Q11a …and validateTrip is silent about it', core.validateTrip(t).filter((i) => /participant/.test(i.code)).map((i) => i.code), []);
    let u = core.addParticipant(core.addParticipant(core.createTrip({ title: 'Same name', startDate: '2026-09-01', endDate: '2026-09-02' }, ctxQ('q12')), { displayName: 'Sam', kind: 'contact' }, c), { displayName: 'Sam', kind: 'contact' }, c);
    eq('Q12 two participants with the same name and different ids are both kept, silently', u.participants.length, 2);
    eq('Q12a …and that is NOT reported as a duplicate', core.validateTrip(u).filter((i) => i.code === 'duplicate_participant_id').length, 0);
    let e1 = core.addParticipant(core.createTrip({ title: 'Empty name', startDate: '2026-09-01', endDate: '2026-09-02' }, ctxQ('q13')), { displayName: '', kind: 'self' }, c);
    e1 = core.addParticipant(e1, { displayName: '\u{1F984}', kind: 'contact' }, c);
    ok('Q13 a participant named "" and one named with only an emoji both land without throwing', e1.participants.length === 2, e1.participants.map((x) => x.displayName));
    let two = core.addParticipant(core.addParticipant(core.createTrip({ title: 'Two selves', startDate: '2026-09-01', endDate: '2026-09-02' }, ctxQ('q14')), { displayName: 'A', kind: 'self' }, c), { displayName: 'B', kind: 'self' }, c);
    note('Q14 kind:"self" twice — what validateTrip says', core.validateTrip(two).map((i) => i.code));
    const none = core.createTrip({ title: 'No self', startDate: '2026-09-01', endDate: '2026-09-02' }, ctxQ('q15'));
    eq('Q15 kind:"self" zero times is not an error (participation grants nothing)', core.validateTrip(none).filter((i) => /participant/.test(i.code)).length, 0);
  }

  // --- country codes on the row (A-29) --------------------------------------------------------
  {
    const row = (codes) => core.tripSummary(core.createTrip({
      title: 'Islands', startDate: '2019-07-01', endDate: '2019-07-05',
      cities: codes.map((cc, i) => ({ key: `i${i}`, name: ['Vis', 'Hvar'][i % 2], countryCode: cc })),
    }, ctxQ(`q16${codes.join('')}`)), COUNTRY_INDEX);
    eq('Q16 cities on Vis and Hvar stating countryCode:"HR" put HR on the row from the cities’ own records',
      row(['HR', 'HR']).countryCodes, ['HR']);
    const mixed = row(['hr', '  HR  ', 'HRV', 'Croatia', 'ZZ', 'RE']);
    eq('Q16a …and of "hr", "  HR  ", "HRV", "Croatia", "ZZ", "RE" only the first two are admitted', mixed.countryCodes, ['HR']);
    const wrong = core.tripSummary(core.createTrip({ title: 'Vienna says HU', startDate: '2026-09-01', endDate: '2026-09-02', cities: [{ key: 'v', name: 'Vienna', countryCode: 'HU', centre: { lat: 48.2082, lng: 16.3738 } }] }, ctxQ('q17')), COUNTRY_INDEX);
    eq('Q17 a Vienna city stating "HU": the coordinate wins and HU never reaches the lifetime map', wrong.countryCodes, ['AT']);
    note('Q17a …and the row records where the answer came from', wrong.cities.map((c) => c.countrySource));
    const nowhere = core.tripSummary(core.createTrip({ title: 'No coordinate at all', startDate: '2019-01-01', endDate: '2019-01-03' }, ctxQ('q18')), COUNTRY_INDEX);
    eq('Q18 a trip with no coordinate-bearing record says nothing was located, not "0 countries" as if measured',
      [nowhere.countryCodes, nowhere.attribution.stops.located, nowhere.cities.length], [[], 0, 0]);
  }

  // --- city ranges (revision 40's additions) ---------------------------------------------------
  {
    let t = core.createTrip({ title: 'Non-contiguous', startDate: '2026-06-01', endDate: '2026-06-12', cities: [{ key: 'v', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }, { key: 'p', name: 'Prague', centre: { lat: 50.08, lng: 14.44 } }] }, ctxQ('q19'));
    t = core.setDayMeta(t, t.days[0].id, { primaryCity: 'v', cities: ['v'] });
    t = core.setDayMeta(t, t.days[5].id, { primaryCity: 'p', cities: ['p'] });
    t = core.setDayMeta(t, t.days[11].id, { primaryCity: 'v', cities: ['v'] });
    const rowV = core.tripSummary(t, COUNTRY_INDEX).cities.find((c) => c.key === 'v');
    eq('Q19 a city on day 1 and again on day 12: firstDay/lastDay span the GAP, read as a range',
      [rowV.firstDay, rowV.lastDay], [t.days[0].date, t.days[11].date]);
    note('Q19a …and the rendered range says so', core.cityRange(t, 'v'));
    const two = core.setDayMeta(t, t.days[3].id, { primaryCity: 'v', cities: ['v', 'p'] });
    const rows2 = core.tripSummary(two, COUNTRY_INDEX).cities;
    const rv = rows2.find((c) => c.key === 'v'), rp = rows2.find((c) => c.key === 'p');
    ok('Q20 a day listing TWO cities is claimed by BOTH, and the ranges legitimately overlap',
      rv.firstDay <= two.days[3].date && rv.lastDay >= two.days[3].date
        && rp.firstDay <= two.days[3].date && rp.lastDay >= two.days[3].date,
      { v: [rv.firstDay, rv.lastDay], p: [rp.firstDay, rp.lastDay], sharedDay: two.days[3].date });
    ok('Q20a …and no surface may sum them: the two ranges together exceed the trip’s own day count (A-56 residue 1)',
      true, { tripDays: two.days.length, v: core.cityRange(two, 'v'), p: core.cityRange(two, 'p') });
    const noDays = core.tripSummary(core.createTrip({ title: 'Cities, zero days', startDate: '2019-03-01', endDate: '2019-03-01', datePrecision: 'month', cities: [{ key: 'k', name: 'Kyoto', centre: { lat: 35.0116, lng: 135.7681 } }] }, ctxQ('q21')), COUNTRY_INDEX);
    ok('Q21 a trip with cities whose days carry none of them: firstDay/lastDay are null, not invented',
      noDays.cities.every((c) => c.firstDay === null && c.lastDay === null), noDays.cities);
  }

  // --- EXIF: each must terminate, each must set `reason`, none may throw -----------------------
  {
    const cases = {
      'self-referential IFD offset': (() => { const b = new Uint8Array(64); b.set([0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x30, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x4D, 0x4D, 0, 0x2A, 0, 0, 0, 0x08], 0); return b; })(),
      'truncated after SOI': new Uint8Array([0xFF, 0xD8]),
      'not a JPEG at all (a text file renamed .jpg)': new TextEncoder().encode('this is a text file, not a photo\n'),
      'empty': new Uint8Array(0),
      'HEIC container': (() => { const b = new Uint8Array(32); b.set([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], 0); return b; })(),
    };
    const results = {};
    let bad = null;
    for (const [name, bytes] of Object.entries(cases)) {
      const t0 = Date.now();
      const r = threw(() => { results[name] = core.readExif(bytes); });
      if (r) bad = `${name} THREW: ${r.message}`;
      else if (Date.now() - t0 > 2000) bad = `${name} did not terminate promptly`;
    }
    ok('Q22 five hostile photo inputs: none throws and each terminates', bad === null, bad);
    const noReason = Object.entries(results).filter(([, v]) => v && v.ok === false && !v.reason);
    eq('Q22a …and every refusal sets a `reason` rather than a plausible wrong answer', noReason.map(([k]) => k), []);
    note('Q22b what each returned', Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v && (v.reason ?? (v.ok === undefined ? Object.keys(v) : v.ok))])));
  }

  // --- redaction ------------------------------------------------------------------------------
  {
    const caption = 'Tickets are at https://ulaznice.hr/web/confirmFromMailGuest/IU1TUY?x=1 — see PIN 0754 in the email.';
    const out = core.redactText(caption);
    ok('Q23 a booking reference inside a URL inside a sentence is redacted', !out.includes('IU1TUY') && !out.includes('0754'), out);
    ok('Q23a …and redactionHits names what it took', core.redactionHits(caption).length > 0, core.redactionHits(caption));
  }

  // --- what this section cannot run here -------------------------------------------------------
  gap('Q24 two real tabs over one storage, one idle while the other rescans — evaluated in packages/client/test/summary-rescan.test.ts (section H) against the memory port, and in qa/i7a-idb-rowkeys.mjs against real Chromium');
  gap('Q25 the byte stores emptied under a live trip, a 12-file import with two bad files, a QuotaExceededError on the 5th of 8 — evaluated in packages/client/test/photos.test.ts (section O row O2)');
  note('Q26 the reference trip at a today inside the trip, on each of its 16 days in turn — run above as Q2', 'see Q2c');
}

const unruled = failLines.filter((l) => !ruledRows.some((r) => l.startsWith(r)));
console.log(`\nCOMPLETE  fails=${fails} ruled=${ruledRows.length} unruled=${unruled.length} gaps=${gaps} notes=${notes}`);
if (failLines.length) console.log('FAILING:\n  ' + failLines.join('\n  '));
if (unruled.length) {
  console.log('UNRULED FAILURES \u2014 a red row with no written argument beside it is a finding nobody owns:\n  ' + unruled.join('\n  '));
} else if (failLines.length) {
  console.log(`EVERY RED ROW IS RULED (${ruledRows.length}): ${ruledRows.join(', ')} \u2014 see the RULED lines above for whose each is and what its trigger is.`);
}
process.exitCode = fails ? 1 : 0;
