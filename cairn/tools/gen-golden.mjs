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
      'explained in BUILD-NOTES: they are the four money defects ARCHITECTURE §2.6 lists.',
  ),
  days: coreCost,
});

writeJson('core-conflicts.json', {
  ...header(`detectConflicts() with today=${FIXTURE_TODAY}. No live-app counterpart exists.`),
  today: FIXTURE_TODAY,
  conflicts: core.detectConflicts(trip, { today: FIXTURE_TODAY }).map((c) => ({
    id: c.id,
    ruleId: c.ruleId,
    severity: c.severity,
    subjects: c.subjects,
    summary: c.summary,
    params: c.params,
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
