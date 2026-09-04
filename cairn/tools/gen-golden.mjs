/**
 * gen-golden.mjs — regenerates `fixtures/golden/*.json` and `fixtures/europe2026.sha256`.
 *
 * TWO KINDS of golden file are produced, and the distinction matters:
 *
 *  1. `legacy-*.json` — produced by evaluating the LIVE PAGE'S OWN FUNCTIONS (`haversine`,
 *     `legBetween`, `dayCost`, `clusterStops`, `focusCluster`) against the live page's own
 *     `DAYS`. Nothing from `packages/core` is involved. These are the files core is checked
 *     against; a golden derived from the implementation it is meant to check is worthless.
 *
 *  2. `core-*.json` — conflicts and validation, which have no counterpart in the live app
 *     (it has neither). These are snapshots of core's output, reviewed by hand, and their
 *     job is to make a change in behaviour visible rather than to prove correctness.
 *
 * Run: node tools/gen-golden.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import { extractLegacy, lastScriptBlock, LEGACY_HTML } from './extract-legacy.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { loadEurope2026, FIXTURE_TODAY } from '../fixtures/loadEurope2026.mjs';
import * as core from '../packages/core/src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = resolve(HERE, '..', 'fixtures', 'golden');

/** Lifts a named function's source out of the page and returns it, unmodified. */
function sliceFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`gen-golden: function ${name} not found in the live page`);
  let depth = 0;
  let seenBrace = false;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      depth++;
      seenBrace = true;
    } else if (ch === '}') {
      depth--;
      if (seenBrace && depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`gen-golden: unbalanced function ${name}`);
}

const { sha256, constants } = extractLegacy();
const scriptSrc = lastScriptBlock(readFileSync(LEGACY_HTML, 'utf8'));

// Evaluate the live page's own maths in an empty context, with only its own data.
const sandbox = { DAYS: constants.DAYS, CITY_PLACES: constants.CITY_PLACES, OPTIONAL: constants.OPTIONAL };
vm.createContext(sandbox);
for (const fn of ['haversine', 'legBetween', 'dayCost', 'clusterStops', 'focusCluster']) {
  vm.runInContext(sliceFunction(scriptSrc, fn), sandbox);
}
// The min-span guard, lifted verbatim from applyDayFit().
vm.runInContext(
  `function liveSpan(pts){ let span=0; for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++)` +
    ` span = Math.max(span, haversine({lat:pts[i][0],lng:pts[i][1]},{lat:pts[j][0],lng:pts[j][1]})); return span; }`,
  sandbox,
);

const legacyLegs = {};
const legacyDayCost = {};
const legacyClusters = {};
for (const d of constants.DAYS) {
  legacyLegs[d.id] = d.stops.map((s, i) => {
    const leg = vm.runInContext(`legBetween(P,S)`, Object.assign(sandbox, { P: i ? d.stops[i - 1] : null, S: s }));
    return leg ? { mode: leg.mode, mins: leg.mins, km: leg.km == null ? null : round6(leg.km) } : null;
  });
  legacyDayCost[d.id] = vm.runInContext(`dayCost(D)`, Object.assign(sandbox, { D: d }));
  const foc = vm.runInContext(`focusCluster(D.stops)`, Object.assign(sandbox, { D: d }));
  const pts = foc.pts.map((p) => [p.lat, p.lng]);
  legacyClusters[d.id] = {
    split: foc.split,
    groupSizes: foc.groups.map((g) => g.length),
    focusNames: foc.pts.map((p) => p.n),
    focusSpanKm: round6(vm.runInContext(`liveSpan(PTS)`, Object.assign(sandbox, { PTS: pts }))),
    /** The live app's own branch: below 0.6 km it abandons fitBounds for setView(centre, 16). */
    liveUsesCentreView: vm.runInContext(`liveSpan(PTS) < 0.6`, Object.assign(sandbox, { PTS: pts })),
  };
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

mkdirSync(GOLDEN, { recursive: true });
const header = (what) => ({
  $generatedBy: 'cairn/tools/gen-golden.mjs',
  $source: 'europe-2026-itinerary.html (read-only)',
  $sourceSha256: sha256,
  $what: what,
});

writeJson('legacy-legs.json', {
  ...header("legBetween() from the live page, run over the live page's DAYS. Index-aligned with day.stops."),
  legs: legacyLegs,
});
writeJson('legacy-daycost.json', {
  ...header('dayCost() from the live page. Sums s.c pairs, assumed EUR, badge-only stops contribute nothing.'),
  dayCost: legacyDayCost,
});
writeJson('legacy-clusters.json', {
  ...header('focusCluster() from the live page, plus the span guard lifted from applyDayFit().'),
  clusters: legacyClusters,
});
writeJson('legacy-cityrange.json', {
  ...header('The hardcoded CITY_RANGE map. cityRange() must reproduce every string.'),
  cityRange: constants.CITY_RANGE,
});

// ---- core-derived snapshots -------------------------------------------------
const { trip, issues, cityRangeCheck } = loadEurope2026();

const coreCost = {};
for (const day of trip.days) {
  const roll = core.rollUpCost(day.stops);
  const eur = roll.byCurrency.EUR;
  const coreString = eur ? `≈ ${core.formatRange('EUR', eur.lo, eur.hi)}` : null;
  const legacyString = legacyDayCost[day.date.slice(5)];
  coreCost[day.id] = {
    byCurrency: roll.byCurrency,
    missingRates: roll.missingRates,
    basisWarnings: roll.basisWarnings,
    coreEurString: coreString,
    legacyString,
    parity: coreString === legacyString ? 'exact' : 'divergent',
  };
}

writeJson('core-daycost.json', {
  ...header(
    'rollUpCost() per day, compared with the live dayCost() string. "divergent" days are ' +
      'explained in BUILD-NOTES \u00a71 KD-3: they are the four money defects ARCHITECTURE \u00a72.6 lists. ' +
      'NOTE: core-*.json files are SELF-SNAPSHOTS of this code, not independent goldens \u2014 KD-14.',
  ),
  days: coreCost,
});

/**
 * ROADMAP rule 1: a blocker in this file MUST carry one line saying why Jacob has to act on
 * it. Revision 1 recorded "12 blockers" as a bare count; nine of them were noise, and nine
 * cries of wolf would not have survived writing this line nine times. A blocker whose id is
 * absent from this table fails `npm test` — see `conflict.test.ts`.
 */
const BLOCKER_JUSTIFICATIONS = {
  legacy_flag:
    'Jacob hand-flagged this day red in his own planner and wrote why. The flag is his, not ours; ' +
    'it stays a blocker until he clears it.',
  geo_outlier:
    'A coordinate more than 35 km from everything else this trip knows about. The historical ' +
    'Fisherman\u2019s Bastion bug \u2014 one digit of latitude, 111 km north, nothing visibly broken \u2014 ' +
    'looks exactly like this, and a map that opens on the wrong country is not recoverable in the field.',
  impossible_transfer:
    'The journey into this stop takes longer than the gap before it, and the stop\u2019s travelRole says ' +
    'its time is an ARRIVAL. Jacob cannot be in two places, so the plan has to change.',
  booking_vs_plan:
    'A ticket he holds says something different from the plan. This is the class of disagreement that ' +
    'put a wrong flight time in front of him twice.',
};

const conflicts = core.detectConflicts(trip, { today: FIXTURE_TODAY });
for (const c of conflicts) {
  if (c.severity === 'blocker' && !BLOCKER_JUSTIFICATIONS[c.ruleId]) {
    throw new Error(
      `gen-golden: blocker "${c.ruleId}" has no justification line. ROADMAP rule 1: a blocker Jacob is ` +
        `asked to act on must come with one line saying why. Write it in BLOCKER_JUSTIFICATIONS, or ` +
        `work out why the rule fired and stop it.`,
    );
  }
}

writeJson('core-conflicts.json', {
  ...header(`detectConflicts() with today=${FIXTURE_TODAY}. No live-app counterpart exists.`),
  today: FIXTURE_TODAY,
  blockerCount: conflicts.filter((c) => c.severity === 'blocker').length,
  conflicts: conflicts.map((c) => ({
    id: c.id,
    ruleId: c.ruleId,
    severity: c.severity,
    subjects: c.subjects,
    summary: c.summary,
    params: c.params,
    ...(c.severity === 'blocker' ? { whyJacobMustAct: BLOCKER_JUSTIFICATIONS[c.ruleId] } : {}),
  })),
});

writeJson('core-validation.json', {
  ...header('validateTrip() on the unmodified fixture. No live-app counterpart exists.'),
  issues: core.validateTrip(trip),
});

writeJson('core-import.json', {
  ...header('importLegacyDays() report: counts, the CITY_RANGE parity check and every import warning.'),
  counts: {
    days: trip.days.length,
    scheduledStops: trip.days.reduce((n, d) => n + d.stops.length, 0),
    poolStops: trip.pool.length,
    places: trip.places.length,
    bookings: trip.bookings.length,
    ticketStops: trip.days.flatMap((d) => d.stops).filter((s) => s.ticket).length,
    bundledTicketStops: trip.days.flatMap((d) => d.stops).filter((s) => s.ticket?.kind === 'bundled').length,
    arrivalOverrides: trip.days.flatMap((d) => d.stops).filter((s) => s.arrival).length,
    costedStops: trip.days.flatMap((d) => d.stops).filter((s) => s.cost).length,
    suggestedStops: trip.days.flatMap((d) => d.stops).filter((s) => core.displayStatus(s) === 'suggested').length,
    candidateDays: trip.days.filter((d) => d.provenance.state === 'candidate').length,
  },
  cityRangeCheck,
  issues,
});

/**
 * ---- countries.json — ROADMAP Phase 2 I-5's attribution golden ---------------
 *
 * Exit criterion 4's shape, and the reason it is shaped that way: **every distinct country names
 * the stop that produced it.** A country code appearing in a summary row with nothing behind it
 * is precisely the failure the lifetime map cannot survive — a pin on a map with no travel under
 * it — so the golden refuses to record a code it cannot attribute to a named record.
 *
 * **No coordinate is written here.** The root `CLAUDE.md` boundary is that no copy of the live
 * planner's `DAYS` is committed under `cairn/`, and a list of 132 latitudes is a copy of the part
 * of `DAYS` that matters most. `core-conflicts.json` already carries a test asserting no float
 * reached it; `countries.json` carries the same one. Ids and names, which the other goldens
 * already hold, are enough to name a producing record.
 */
const stopRows = [];
for (const day of trip.days) for (const stop of day.stops) stopRows.push({ dayId: day.id, stop });
for (const stop of trip.pool) stopRows.push({ dayId: null, stop });

const byCountry = new Map();
const unattributedStops = [];
let stopsWithCoords = 0;
for (const { dayId, stop } of stopRows) {
  const at = core.stopLatLng(stop, trip);
  if (!at) continue;
  stopsWithCoords++;
  const code = core.countryOf(at, core.COUNTRY_INDEX);
  if (code === null) {
    unattributedStops.push({ dayId, stopId: stop.id, name: stop.name });
    continue;
  }
  const row = byCountry.get(code) ?? { code, stops: 0, places: 0, namedBy: null };
  row.stops++;
  // First in document order. Stable, so the golden does not churn on an unrelated edit.
  if (!row.namedBy) row.namedBy = { dayId, stopId: stop.id, name: stop.name };
  byCountry.set(code, row);
}

const unattributedPlaces = [];
let placesWithCoords = 0;
for (const place of trip.places) {
  if (!place.at) continue;
  placesWithCoords++;
  const code = core.countryOf(place.at, core.COUNTRY_INDEX);
  if (code === null) {
    unattributedPlaces.push({ placeId: place.id, name: place.name });
    continue;
  }
  const row = byCountry.get(code) ?? { code, stops: 0, places: 0, namedBy: null };
  row.places++;
  byCountry.set(code, row);
}

for (const [code, row] of byCountry) {
  if (!row.namedBy) {
    throw new Error(
      `gen-golden: country "${code}" is attributed by ${row.places} place(s) and NO stop. ` +
        'ROADMAP exit criterion 4: a country with no stop named for it fails the run. Either a ' +
        'stop resolves to it and the walk above missed it, or the country does not belong on the ' +
        "trip's map at all.",
    );
  }
}

writeJson('countries.json', {
  ...header(
    'countryOf() over every coordinate-bearing record of the reference trip, using the bundled ' +
      'COUNTRY_INDEX. Each country names the first stop, in document order, that produced it. ' +
      'NO COORDINATES: ids and names only — see the note in gen-golden.mjs.',
  ),
  index: {
    scale: core.COUNTRY_INDEX.scale,
    source: core.COUNTRY_INDEX.source,
    countries: core.COUNTRY_INDEX.countries.length,
    rings: core.COUNTRY_INDEX.countries.reduce((n, c) => n + c.rings.length, 0),
  },
  stops: {
    total: stopRows.length,
    withCoordinates: stopsWithCoords,
    attributed: stopsWithCoords - unattributedStops.length,
    unattributed: unattributedStops.length,
  },
  places: {
    total: trip.places.length,
    withCoordinates: placesWithCoords,
    attributed: placesWithCoords - unattributedPlaces.length,
    unattributed: unattributedPlaces.length,
  },
  countries: [...byCountry.values()].sort((a, b) => (a.code < b.code ? -1 : 1)),
  unattributedStops,
  unattributedPlaces,
});

/**
 * ---- travel-stats.json — ROADMAP Phase 2 I-7's lifetime-statistics golden -----
 *
 * **Derived, never hand-written**: this is `travelStats` called on the reference trip's single
 * summary row. Two clocks, because A-31 Part 3's population rule is the half of the design that
 * a one-clock golden cannot show — at `FIXTURE_TODAY` (2026-08-01) the trip has not started, so
 * it is `planned` and contributes no country, no city and no day; after `endDate` it is
 * `completed` and everything it holds is on the map. One trip is a thin exercise of a multi-trip
 * function, and that is deliberate: the multi-trip cases live in `travelStats.test.ts`, and this
 * file's job is to make a change in behaviour on the only REAL trip we have visible.
 *
 * **No coordinate is written here** — same rule as `countries.json`, and a test asserts it:
 * codes, names, ids and counts only.
 *
 * **Two clocks, and that is a documented divergence from A-31 Part 7's literal "the fixture clock"
 * — BUILD-NOTES KD-63.** At `FIXTURE_TODAY` alone the golden is all zeros, which pins the
 * population rule and nothing else and leaves Part 7's own cross-check with no numbers to compare.
 *
 * `countries.json` above is the far more valuable check and it is unchanged: it carries the same
 * four record-census numbers computed by a *different* program (the walk over the document at
 * the top of this section), so `travelStats` and `tripSummary` can be caught walking different
 * records. See A-31 Part 7's last paragraph.
 */
const AFTER_THE_TRIP = '2026-08-24';
const statsRows = [core.tripSummary(trip, core.COUNTRY_INDEX)];
writeJson('travel-stats.json', {
  ...header(
    'travelStats() over the reference trip\'s single summary row, at two clocks. DERIVED by ' +
      'calling travelStats — never hand-written. NO COORDINATES: codes, names, ids and counts only.',
  ),
  tripIds: statsRows.map((r) => r.id),
  summaryVersion: core.SUMMARY_VERSION,
  clocks: {
    fixtureToday: {
      today: FIXTURE_TODAY,
      why: 'before startDate — the trip is `planned`, so A-31 Part 3 gives it nothing but +1 planned',
      stats: core.travelStats(statsRows, FIXTURE_TODAY),
    },
    afterTheTrip: {
      today: AFTER_THE_TRIP,
      why: 'after endDate — the trip is `completed` and contributes everything it holds',
      stats: core.travelStats(statsRows, AFTER_THE_TRIP),
    },
  },
});

writeFileSync(resolve(HERE, '..', 'fixtures', 'europe2026.sha256'), `${sha256}  europe-2026-itinerary.html\n`);

function writeJson(name, value) {
  writeFileSync(resolve(GOLDEN, name), `${JSON.stringify(value, null, 2)}\n`);
  process.stdout.write(`wrote fixtures/golden/${name}\n`);
}
process.stdout.write(`wrote fixtures/europe2026.sha256 (${sha256})\n`);

/**
 * `readExif()` over the committed corpus in `fixtures/photo/` — ARCHITECTURE §10.2, A-58 Part 7.
 *
 * A **third** kind of golden, and its header says so: its source is not the live planner, so it
 * carries no `$sourceSha256`. What it snapshots is a hand-rolled parser's answer for a fixed set
 * of bytes, which is exactly what A-58 Part 7 calls *"the price of this verdict"*.
 *
 * **NO COORDINATES.** The two fixtures with a GPS block reduce to `hasCoordinate: true|false`
 * and no number is written — §10.5's *"no coordinate in any log line, ever"*, and this file's
 * own standing discipline. `packages/core/test/photoExif.test.ts` asserts the absence by grep,
 * so weakening this line fails the suite rather than passing quietly.
 */
{
  const dir = resolve(HERE, '..', 'fixtures', 'photo');
  const names = readdirSync(dir).sort();
  writeJson('photo-exif.json', {
    $generatedBy: 'cairn/tools/gen-golden.mjs',
    $source: 'cairn/fixtures/photo/ — JPEG headers, not photographs (tools/gen-photo-fixtures.mjs)',
    $what:
      'readExif() over the committed corpus. NO COORDINATES: a GPS read is recorded as a ' +
      'boolean and never as a number (§10.5, A-58 Part 7).',
    files: names.map((name) => {
      const r = core.readExif(new Uint8Array(readFileSync(resolve(dir, name))));
      return {
        name,
        bytes: readFileSync(resolve(dir, name)).length,
        reason: r.reason,
        capturedAt: r.capturedAt,
        orientation: r.orientation,
        pixel: r.pixel,
        hasCoordinate: r.at !== null,
      };
    }),
  });
}
