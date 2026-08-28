/**
 * ROADMAP Phase 2 **exit criterion 6**, in its revision-24 form — both halves.
 * ARCHITECTURE §8.4 **A-31 Part 6**.
 *
 * The criterion used to read *"grep `packages/core`, `packages/client` and `apps/web` for a
 * persisted field whose name is a count of countries, cities, trips or days; expect **zero**"*.
 * Run honestly it finds `cityCount` and `dayCount` on `TripSummaryRow`, which have been
 * persisted since Phase 1 — so the criterion was passing only because nobody ran it as written.
 * It is withdrawn as false, not reinterpreted. The rule it was reaching for is:
 *
 * > **A count may be stored only if it is a property of exactly one document, minted inside the
 * > write that carries that document (§8.4 clause 1) and stamped with `SUMMARY_VERSION`
 * > (clause 3). Everything else — every number that summarises more than one trip — is computed
 * > on read and has no storage representation at all.**
 *
 * That is why `cityCount` is legitimate and `countriesVisited: 47` is not, and the distinction
 * is mechanical: the first can be recomputed from a document that exists and repaired by the
 * rescan; the second summarises a *set* of documents, has no document to be recomputed from,
 * and drifts with nothing to notice. It is §0.6 applied one level up.
 *
 * Two halves below. **Widening either allow-list is an architect's ruling**, exactly as §2.10's
 * export list works — a builder who finds a new hit has found a design question, not a chore.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve, sep } from 'node:path';
import { COUNTRY_INDEX, tripSummary } from '../packages/core/src/index.ts';
import { loadEurope2026 } from '../fixtures/loadEurope2026.mjs';
import type { Trip } from '../packages/core/src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

// ---------------------------------------------------------------------------
// What "count-shaped" means, once, for both halves.
// ---------------------------------------------------------------------------

/** The nouns the criterion names, plus `stop`, `place` and `pool` because the row counts those too. */
const DOMAIN = /countr(?:y|ies)|cit(?:y|ies)|trip|day|stop|place|pool/i;
/** A counting suffix. */
const SHAPE = /(?:count|total|tally|num|visited|travell?ed)$/i;
/** A bare plural domain noun. `cities: number` is a count of cities however it is spelled. */
const PLURAL = /(?:cities|countries|trips|days|stops|places)$/i;
/** The census pair A-31 Part 2 introduces. Neither name carries its noun, so both are named. */
const CENSUS = /^(?:located|attributed)$/i;

function countShaped(name: string): boolean {
  if (CENSUS.test(name)) return true;
  if (PLURAL.test(name) && DOMAIN.test(name)) return true;
  return DOMAIN.test(name) && SHAPE.test(name);
}

// ---------------------------------------------------------------------------
// (a) The row's count fields are an ALLOW-LIST — a ceiling, not a floor.
// ---------------------------------------------------------------------------

/**
 * Exactly the count-shaped fields §8.4 A-31 Part 6 permits on `TripSummaryRow`, as dotted paths
 * into a minted row. A field added to the row without being added here **fails the run**.
 */
const ROW_COUNT_FIELDS = [
  'attribution.places.attributed',
  'attribution.places.located',
  'attribution.stops.attributed',
  'attribution.stops.located',
  'cityCount',
  'dayCount',
  'poolCount',
  'stopCount',
];

/** Every numeric leaf of a value, as a dotted path. Array indices collapse to `[]`. */
function numericPaths(value: unknown, path = ''): string[] {
  if (typeof value === 'number') return [path];
  if (Array.isArray(value)) {
    const out = new Set<string>();
    for (const v of value) for (const p of numericPaths(v, `${path}[]`)) out.add(p);
    return [...out];
  }
  if (value && typeof value === 'object') {
    const out: string[] = [];
    for (const [k, v] of Object.entries(value)) out.push(...numericPaths(v, path ? `${path}.${k}` : k));
    return out;
  }
  return [];
}

const referenceRow = () => tripSummary((loadEurope2026() as { trip: Trip }).trip, COUNTRY_INDEX);

test('exit 6a: TripSummaryRow\'s count-shaped fields are EXACTLY the allow-list', () => {
  const row = referenceRow();
  const hits = numericPaths(row)
    .filter((p) => countShaped(p.split('.').pop() as string))
    .sort();
  assert.deepEqual(
    hits,
    [...ROW_COUNT_FIELDS].sort(),
    'a count-shaped field was added to (or removed from) TripSummaryRow. A count may be stored ' +
      'only if it is a property of exactly one document, minted inside the write that carries ' +
      'that document and stamped with SUMMARY_VERSION — widening this list is an ARCHITECT\'S ' +
      'ruling (ARCHITECTURE §8.4 A-31 Part 6), not a builder\'s.',
  );
});

test('exit 6a: the row still carries the two non-count numbers, so the filter is not eating them', () => {
  // `revision` and `summaryVersion` are numbers and are NOT counts. If the classifier ever
  // swallowed them the allow-list above would be vacuously satisfiable by deleting fields.
  const all = numericPaths(referenceRow());
  assert.ok(all.includes('revision'), 'revision left the row');
  assert.ok(all.includes('summaryVersion'), 'summaryVersion left the row');
  assert.equal(countShaped('revision'), false);
  assert.equal(countShaped('summaryVersion'), false);
});

// ---------------------------------------------------------------------------
// (b) The grep, re-aimed: no persisted count of countries/cities/trips/days
//     ANYWHERE outside `TripSummaryRow`.
// ---------------------------------------------------------------------------

const ROOTS = ['packages/core/src', 'packages/client/src', 'apps/web/src'];

/**
 * The only count-shaped numeric declarations permitted in the three source trees, as
 * `<path>::<name>`, each with the reason it is not a stored lifetime statistic.
 */
const SOURCE_ALLOW: Record<string, string> = {
  // TripSummaryRow's own fields — a property of exactly one document, minted inside the write
  // that carries it (§8.4 clause 1) and stamped with SUMMARY_VERSION (clause 3).
  'packages/core/src/derive/summary.ts::cityCount': 'TripSummaryRow, clause 1 + clause 3',
  'packages/core/src/derive/summary.ts::dayCount': 'TripSummaryRow, clause 1 + clause 3',
  'packages/core/src/derive/summary.ts::stopCount': 'TripSummaryRow, clause 1 + clause 3',
  'packages/core/src/derive/summary.ts::poolCount': 'TripSummaryRow, clause 1 + clause 3',
  'packages/core/src/derive/summary.ts::located': 'AttributionCensus on TripSummaryRow (A-31 Part 2)',
  'packages/core/src/derive/summary.ts::attributed': 'AttributionCensus on TripSummaryRow (A-31 Part 2)',
  // `TravelStats` is the RETURN TYPE of a pure function. It summarises a set of documents, which
  // is exactly the thing that may not be stored — and it is not: it has no storage
  // representation at all, which the second assertion below pins mechanically.
  'packages/core/src/derive/travelStats.ts::cities': 'TravelRecordCensus — derived, never stored',
  'packages/core/src/derive/travelStats.ts::places': 'TravelRecordCensus — derived, never stored',
  'packages/core/src/derive/travelStats.ts::stops': 'TravelRecordCensus — derived, never stored',
  'packages/core/src/derive/travelStats.ts::daysTravelled': 'TravelStats — derived, never stored',
  'packages/core/src/derive/travelStats.ts::unnamedCities': 'TravelStats — derived, never stored',
  // A rule's look-ahead WINDOW, in days (§2.7 A-17). A duration, not a count of anything a
  // traveller did, and it is a compile-time property of a `RuleSpec` — it is never written to a
  // document, a summary row or `AppState`. The classifier is deliberately wide enough to catch
  // it, because a classifier narrow enough to miss it would miss `daysVisited` too.
  'packages/core/src/conflict/rules/types.ts::horizonDays': 'RuleSpec look-ahead window — a duration, not a tally',
  'packages/core/src/conflict/detect.ts::horizonDays': 'RuleSpec look-ahead window — a duration, not a tally',
};

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const p = resolve(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(p)) out.push(p);
    }
  };
  for (const r of ROOTS) walk(resolve(CAIRN, r));
  return out.sort();
}

const rel = (p: string) => relative(CAIRN, p).split(sep).join('/');

test('exit 6b: no persisted count of countries, cities, trips or days outside TripSummaryRow', () => {
  const hits: string[] = [];
  for (const file of sourceFiles()) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/([A-Za-z$_][\w$]*)\??\s*:\s*number\b/g)) {
      const name = m[1];
      if (!countShaped(name)) continue;
      const key = `${rel(file)}::${name}`;
      if (!(key in SOURCE_ALLOW)) hits.push(key);
    }
  }
  assert.deepEqual(
    [...new Set(hits)].sort(),
    [],
    'a count of countries, cities, trips or days was declared outside TripSummaryRow. Every ' +
      'number that summarises more than one trip is computed on read and has no storage ' +
      'representation at all (ARCHITECTURE §8.4 A-31 Part 6). A stored countriesVisited: 47 is ' +
      'a second source of truth a user can inflate by typing.',
  );
});

test('exit 6b: the allow-list is a ceiling — every entry is still present in the source', () => {
  // Without this, deleting a field would leave a stale entry that silently permits its return.
  const seen = new Set<string>();
  for (const file of sourceFiles()) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/([A-Za-z$_][\w$]*)\??\s*:\s*number\b/g)) {
      seen.add(`${rel(file)}::${m[1]}`);
    }
  }
  assert.deepEqual(
    Object.keys(SOURCE_ALLOW).filter((k) => !seen.has(k)),
    [],
    'the allow-list names a declaration that no longer exists — remove the line',
  );
});

/**
 * The one thing the allow-list's `travelStats.ts` entries rest on, asserted rather than assumed:
 * `TravelStats` **never reaches a persisted record**. If a storage port, a serializer or the
 * store ever imported it, its counts would be exactly the `countriesVisited: 47` the rule
 * refuses — a number summarising a set of documents, with nothing to recompute it from.
 */
test('exit 6b: nothing that persists anything imports travelStats', () => {
  const persisters = sourceFiles().filter((f) => {
    const r = rel(f);
    return /\/(?:ports|serialize)\//.test(r) || /\/store(?:\/|\.ts$)/.test(r);
  });
  assert.ok(persisters.length >= 5, `INCONCLUSIVE: only ${persisters.length} persistence files found`);
  const offenders = persisters.filter((f) => /travelStats|TravelStats/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders.map(rel), [], 'a lifetime statistic reached the persistence layer');
});
