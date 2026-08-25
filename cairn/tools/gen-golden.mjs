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
import { readFileSync } from 'node:fs';
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

writeFileSync(resolve(HERE, '..', 'fixtures', 'europe2026.sha256'), `${sha256}  europe-2026-itinerary.html\n`);

function writeJson(name, value) {
  writeFileSync(resolve(GOLDEN, name), `${JSON.stringify(value, null, 2)}\n`);
  process.stdout.write(`wrote fixtures/golden/${name}\n`);
}
process.stdout.write(`wrote fixtures/europe2026.sha256 (${sha256})\n`);
