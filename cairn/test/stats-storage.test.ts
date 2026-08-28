/**
 * ROADMAP Phase 2 **exit criterion 6**, in its **revision-25** form.
 * ARCHITECTURE §8.4 **A-33** (QA **R28-2**, MAJOR), which supersedes A-31 Part 6's mechanism.
 *
 * The rule is unchanged and is the whole point:
 *
 * > **A count may be stored only if it is a property of exactly one document, minted inside the
 * > write that carries that document (§8.4 clause 1) and stamped with `SUMMARY_VERSION`
 * > (clause 3). Everything else — every number that summarises more than one trip — is computed
 * > on read and has no storage representation at all.**
 *
 * That is why `cityCount` is legitimate and `countriesVisited: 47` is not, and the distinction is
 * mechanical: the first can be recomputed from a document that exists and repaired by the rescan;
 * the second summarises a *set* of documents, has no document to be recomputed from, and drifts
 * with nothing to notice. It is §0.6 applied one level up.
 *
 * **What changed, and why.** The revision-24 form was two halves: an allow-list of the row's
 * *count-shaped* fields, and a regex — `/([A-Za-z$_][\w$]*)\??\s*:\s*number\b/` — over source
 * text. That regex matches a **declaration**; the danger is a **value**. QA round 28 made both
 * `SUMMARIES.put(summary, id)` call sites in `apps/web/src/ports/storage.ts` write
 * `{ ...summary, countriesVisited, daysTravelled }` into IndexedDB, on every write, forever —
 * and the criterion, the 795-test suite and `tsc` were **all green** (a spread widens the object
 * type, so excess-property checking never fires). A second fault, `daysAbroad: number` on the row
 * and minted, walked past the classifier by choosing a name. §0.5: *a rule that cannot catch its
 * own bug does not ship.*
 *
 * So, six parts, and the first one that has teeth ends at a value in a store rather than at text
 * in a file:
 *
 *   **6a′** the row's **whole key set**, compile-time and runtime, and every leaf path
 *   **6b-1** the rows a real port actually holds, read back after a real write
 *   **6b-2** every port hands its summary store the bare identifier it was given
 *   **6b-3** the port census — a third implementation cannot appear unpoliced
 *   **6b-5** nothing that persists anything imports `travelStats`
 *   **6b′′′′** the old source sweep, demoted to a secondary **tripwire**
 *
 * (**6b-4**, reading the real IndexedDB bytes back in Chromium, is deliberately **not** a gate:
 * it needs a browser. It lives in `qa/` — A-33 Part 3 names it so the next round runs it.)
 *
 * **Widening `ROW_KEYS`, `ROW_PATHS` or either allow-list is an architect's ruling**, exactly as
 * §2.10's export list works — a field on the row is a field in storage and `SUMMARY_VERSION` has
 * to move with it. A builder who finds a new hit has found a design question, not a chore.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve, sep } from 'node:path';
import { COUNTRY_INDEX, SUMMARY_VERSION, tripSummary, createTrip, sequentialIds } from '../packages/core/src/index.ts';
import type { Trip, TripSummaryRow } from '../packages/core/src/index.ts';
import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
} from '../packages/client/src/index.ts';
import type { MemoryStorage, Ports } from '../packages/client/src/index.ts';
import { loadEurope2026 } from '../fixtures/loadEurope2026.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const rel = (p: string) => relative(CAIRN, p).split(sep).join('/');

// ===========================================================================
// (6a′) The row's key set is pinned IN FULL — every field, not the count-shaped ones.
// ===========================================================================

/**
 * **Compile-time.** A field added to `TripSummaryRow` without a line here is a `tsc` error,
 * which is the earliest this can possibly fail. No `Partial`, no index signature.
 */
const ROW_KEYS: Record<keyof TripSummaryRow, true> = {
  id: true,
  title: true,
  startDate: true,
  endDate: true,
  datePrecision: true,
  cityCount: true,
  dayCount: true,
  stopCount: true,
  poolCount: true,
  revision: true,
  countryCodes: true,
  cities: true,
  attribution: true,
  summaryVersion: true,
};

/**
 * **Runtime, every leaf.** The dotted leaf paths a minted row carries, with array indices
 * collapsed to `[]`, transcribed in full. This is the assertion `daysAbroad: number` could not
 * walk past, because it does not ask what a field is *called*.
 */
const ROW_PATHS = [
  'attribution.places.attributed',
  'attribution.places.located',
  'attribution.stops.attributed',
  'attribution.stops.located',
  'cities[].countryCode',
  'cities[].countrySource',
  'cities[].key',
  'cities[].name',
  'cityCount',
  'countryCodes[]',
  'datePrecision',
  'dayCount',
  'endDate',
  'id',
  'poolCount',
  'revision',
  'startDate',
  'stopCount',
  'summaryVersion',
  'title',
];

/** Every leaf of a value, as a dotted path. A leaf is anything not an array and not a plain object. */
function leafPaths(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    const out = new Set<string>();
    for (const v of value) for (const p of leafPaths(v, `${path}[]`)) out.add(p);
    return [...out];
  }
  if (value && typeof value === 'object') {
    const out: string[] = [];
    for (const [k, v] of Object.entries(value)) out.push(...leafPaths(v, path ? `${path}.${k}` : k));
    return out;
  }
  return [path];
}

// ---------------------------------------------------------------------------
// What "count-shaped" means. Kept — but as a LABEL on a set that is pinned by other means,
// which is the only job a name-based heuristic can do honestly (A-33 Part 2).
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

/** The eight count-shaped fields §8.4 A-31 Part 6 permits on the row, as dotted paths. */
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

// ---------------------------------------------------------------------------
// The three rows the leaf-path union is taken over. One row cannot cover the set, because an
// empty collection contributes no path (A-33 Part 2 assertion 3).
// ---------------------------------------------------------------------------

const referenceRow = () => tripSummary((loadEurope2026() as { trip: Trip }).trip, COUNTRY_INDEX);

/** A trip with ONE city the index cannot attribute — the `cities[].countryCode: null` leaf. */
function nullCountryRow(): TripSummaryRow {
  const trip = createTrip(
    {
      title: 'One unplaceable city',
      startDate: '2024-03-01',
      endDate: '2024-03-02',
      homeCurrency: 'EUR',
      // Deep in the South Atlantic: a real coordinate the country index has nothing for.
      cities: [{ key: 'nowhere', name: 'Nowhere', centre: { lat: -40.5, lng: -20.5 } }],
    },
    { ids: sequentialIds('null-'), now: '2026-06-15' },
  );
  return tripSummary(trip, COUNTRY_INDEX);
}

/** A trip with no city, no place and no stop — every collection empty. */
function emptyRow(): TripSummaryRow {
  const trip = createTrip(
    { title: 'Nothing at all', startDate: '2024-05-01', endDate: '2024-05-02', homeCurrency: 'EUR' },
    { ids: sequentialIds('empty-'), now: '2026-06-15' },
  );
  return tripSummary(trip, COUNTRY_INDEX);
}

const THREE_ROWS = () => [referenceRow(), nullCountryRow(), emptyRow()];

test('exit 6a: a minted row\'s TOP-LEVEL keys are exactly the type\'s — no more, no fewer', () => {
  for (const row of THREE_ROWS()) {
    assert.deepEqual(
      Object.keys(row).sort(),
      Object.keys(ROW_KEYS).sort(),
      'a field was minted but not typed, or typed but not minted. A field on TripSummaryRow is a ' +
        'field in storage and SUMMARY_VERSION has to move with it — widening ROW_KEYS is an ' +
        'ARCHITECT\'S ruling (ARCHITECTURE §8.4 A-33 Part 2), not a builder\'s.',
    );
  }
});

test('exit 6a: the union of three rows\' LEAF PATHS is exactly ROW_PATHS', () => {
  const union = new Set<string>();
  for (const row of THREE_ROWS()) for (const p of leafPaths(row)) union.add(p);
  assert.deepEqual(
    [...union].sort(),
    [...ROW_PATHS].sort(),
    'the row grew or lost a leaf. Not the count-shaped ones — EVERY key: `daysAbroad: number` ' +
      'carries no counting suffix and no plural domain noun, and that is exactly how a minted ' +
      'lifetime count walked past the revision-24 classifier (§8.4 A-33 Part 1).',
  );
  // Each row individually is a SUBSET, which is what catches an injection into a row that is
  // not the reference one.
  for (const row of THREE_ROWS()) {
    const extra = leafPaths(row).filter((p) => !ROW_PATHS.includes(p));
    assert.deepEqual(extra, [], `a row carries leaves the type does not: ${extra.join(', ')}`);
  }
});

test('exit 6a: the three rows are genuinely different, so the union is not one row three times', () => {
  const [ref, nul, empty] = THREE_ROWS();
  assert.ok(leafPaths(ref).includes('cities[].countryCode'));
  assert.equal(nul.cities.length, 1, 'the null-country row lost its city');
  assert.equal(nul.cities[0].countryCode, null, 'the "unplaceable" city was placed after all');
  assert.deepEqual(empty.cities, [], 'the empty row is not empty');
  assert.deepEqual(empty.countryCodes, []);
  assert.equal(leafPaths(empty).includes('cities[].name'), false, 'an empty collection contributed a path');
});

test('exit 6a: the count-shaped fields are exactly the eight — an assertion ABOUT the set, not the filter that decides it', () => {
  assert.deepEqual(
    ROW_PATHS.filter((p) => countShaped(p.split('.').pop() as string)).sort(),
    [...ROW_COUNT_FIELDS].sort(),
    'a count-shaped field was added to (or removed from) TripSummaryRow. A count may be stored ' +
      'only if it is a property of exactly one document, minted inside the write that carries ' +
      'that document and stamped with SUMMARY_VERSION (§8.4 A-31 Part 6).',
  );
  // `revision` and `summaryVersion` are numbers and are NOT counts. If the classifier ever
  // swallowed them, the list above would be satisfiable by a filter that eats everything.
  assert.equal(countShaped('revision'), false);
  assert.equal(countShaped('summaryVersion'), false);
  assert.ok(ROW_PATHS.includes('revision') && ROW_PATHS.includes('summaryVersion'));
});

// ===========================================================================
// (6b-1) The rows a REAL PORT actually holds, read back after a real write.
//
// This is the check with teeth: it asserts what is in the store, not what a file says.
// `packages/client/src/ports/memory.ts` is a real `StoragePort` and runs in plain Node, which
// is the whole reason §1.3 requires the client to be attackable there.
// ===========================================================================

const TODAY = '2026-06-15';
let seq = 0;
function ports(storage: MemoryStorage): Ports {
  return {
    storage,
    file: memoryFile(),
    clock: fixedClockPort(TODAY),
    ids: sequentialIdPort(`s${++seq}-`),
    scheduler: immediateScheduler(),
  };
}

function assertRowsAreClean(rows: readonly TripSummaryRow[], where: string): void {
  assert.ok(rows.length > 0, `INCONCLUSIVE: ${where} returned no rows`);
  for (const row of rows) {
    assert.deepEqual(
      Object.keys(row).sort(),
      Object.keys(ROW_KEYS).sort(),
      `${where}: a field reached the store that is not on TripSummaryRow. A number that ` +
        'summarises more than one trip has no storage representation at all (§8.4 A-33 6b-1).',
    );
    const extra = leafPaths(row).filter((p) => !ROW_PATHS.includes(p));
    assert.deepEqual(extra, [], `${where}: leaves reached the store that the type does not have`);
  }
}

test('exit 6b-1: the rows the store\'s own write path leaves in a real port are clean', async () => {
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage) });
  await store.createTrip({
    title: 'Written through the store',
    startDate: '2026-03-01',
    endDate: '2026-03-04',
    cities: [{ name: 'Vienna', order: 0 }],
  });
  await store.flush();
  assertRowsAreClean(await storage.listTrips(), 'the store write path');
});

test('exit 6b-1: the rows the RESCAN leaves in a real port are clean', async () => {
  const storage = memoryStorage();
  const store = createStore({ ports: ports(storage) });
  await store.createTrip({
    title: 'Rescanned',
    startDate: '2026-03-01',
    endDate: '2026-03-04',
    cities: [{ name: 'Split', order: 0 }],
  });
  await store.flush();
  // Knock the row back so the rescan has something to do, exactly as a pre-I-7 build left it.
  const before = await storage.listTrips();
  const stale = { ...before[0], summaryVersion: SUMMARY_VERSION - 1 };
  const stored = await storage.load(stale.id);
  assert.ok(stored, 'the document vanished');
  await storage.refreshSummary(stale.id, stored.version, stale as TripSummaryRow);
  const refreshCountBefore = storage.refreshCount;

  const reader = createStore({ ports: ports(storage) });
  await reader.refreshLibrary();
  await reader.rescanSummaries();
  assert.ok(storage.refreshCount > refreshCountBefore, 'INCONCLUSIVE: the rescan wrote nothing');
  const rows = await storage.listTrips();
  assert.equal(rows[0].summaryVersion, SUMMARY_VERSION, 'INCONCLUSIVE: the row was not brought current');
  assertRowsAreClean(rows, 'the rescan path');
});

test('exit 6b-1: the rows a DIRECT port call leaves are clean, for both mutating methods', async () => {
  const storage = memoryStorage();
  const trip = createTrip(
    {
      title: 'Straight at the port',
      startDate: '2026-03-01',
      endDate: '2026-03-04',
      homeCurrency: 'EUR',
      cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
    },
    { ids: sequentialIds('direct-'), now: TODAY },
  );
  const summary = tripSummary(trip, COUNTRY_INDEX);
  const saved = await storage.saveIfVersion(trip.id, null, JSON.stringify(trip), summary);
  assert.equal(saved.ok, true);
  assertRowsAreClean(await storage.listTrips(), 'saveIfVersion');

  const stored = await storage.load(trip.id);
  assert.ok(stored);
  const refreshed = await storage.refreshSummary(trip.id, stored.version, tripSummary(trip, COUNTRY_INDEX));
  assert.equal(refreshed.ok, true);
  assertRowsAreClean(await storage.listTrips(), 'refreshSummary');
});

// ===========================================================================
// (6b-2) Every port hands its summary store the value it was given, unmodified.
//
// The one port 6b-1 cannot reach is `apps/web/src/ports/storage.ts`: it is IndexedDB and does
// not run in Node, and building a fake IndexedDB to test a two-line property is a second
// implementation of a database. So assert the property directly — **the expression written to
// the summary store is the bare parameter identifier and nothing else** — which is exactly what
// the spread fault violates. Static, and a *value*-shaped check rather than a type annotation.
// ===========================================================================

const PORT_WRITES: Array<{
  file: string;
  /** Captures the first argument of each write to the summary store. */
  capture: RegExp;
  /** Every write to that store, so a THIRD site fails even if it passes the identifier test. */
  all: RegExp;
  sites: number;
  /** The parameter declaration, so `const summary = {...spread}` above the put cannot pass. */
  param: RegExp;
}> = [
  {
    file: 'apps/web/src/ports/storage.ts',
    capture: /objectStore\(SUMMARIES\)\s*\.\s*put\(\s*([^,)]*?)\s*,/g,
    all: /objectStore\(SUMMARIES\)\s*\.\s*put/g,
    sites: 2,
    param: /summary:\s*TripSummaryRow/,
  },
  {
    file: 'packages/client/src/ports/memory.ts',
    capture: /summaries\.set\(\s*[^,)]*?\s*,\s*([^,)]*?)\s*\)/g,
    all: /summaries\.set\(/g,
    sites: 2,
    param: /async\s+saveIfVersion\([^)]*\bsummary\b[^)]*\)|async\s+refreshSummary\([^)]*\bsummary\b[^)]*\)/,
  },
];

for (const port of PORT_WRITES) {
  test(`exit 6b-2: ${port.file} writes the bare identifier \`summary\`, at exactly ${port.sites} sites`, () => {
    const src = readFileSync(resolve(CAIRN, port.file), 'utf8');
    const captures = [...src.matchAll(port.capture)].map((m) => m[1]);
    const writes = [...src.matchAll(port.all)].length;
    assert.equal(
      writes,
      port.sites,
      `${port.file}: ${writes} writes to the summary store, expected ${port.sites}. A new write ` +
        'site needs an A-33 6b-2 recipe, and adding one is an architect\'s ruling. (A renamed ' +
        'constant lands here too, rather than silently matching nothing.)',
    );
    assert.deepEqual(
      captures,
      new Array(port.sites).fill('summary'),
      `${port.file}: the summary store was handed something other than the bare parameter it was ` +
        'given. `put({ ...summary, countriesVisited }, id)` is a lifetime count in storage, on ' +
        'every write, forever, with nothing to recompute it from (§8.4 A-33 6b-2).',
    );
    assert.match(
      src,
      port.param,
      `${port.file}: the identifier written to the summary store is no longer a parameter of the ` +
        'enclosing method — a local `const summary = { ...spread }` would pass the check above.',
    );
  });
}

// ===========================================================================
// (6b-3) The port census, so a third implementation cannot appear unpoliced.
// ===========================================================================

/** The two implementations, the interface, and the one caller — the same four §4.3 reasons about. */
const PORT_CENSUS = [
  'apps/web/src/ports/storage.ts',
  'packages/client/src/ports/memory.ts',
  'packages/client/src/ports/types.ts',
  'packages/client/src/store/store.ts',
];

test('exit 6b-3: exactly four source files mention refreshSummary', () => {
  const hits = sourceFiles().filter((f) => /refreshSummary/.test(readFileSync(f, 'utf8'))).map(rel);
  assert.deepEqual(
    hits.sort(),
    [...PORT_CENSUS].sort(),
    'the StoragePort population moved. A new implementation needs a 6b-2 recipe of its own — ' +
      '6b-2 is a per-file check and a per-file check drifts the moment a fourth port exists — ' +
      'and adding one is an ARCHITECT\'S ruling (§8.4 A-33 6b-3).',
  );
});

// ===========================================================================
// (6b-5) Nothing that persists anything imports `travelStats`. Unchanged from revision 24,
// including its inconclusiveness guard: it is the one existing check that already asserts a
// property of the persistence layer rather than of a name.
// ===========================================================================

test('exit 6b-5: nothing that persists anything imports travelStats', () => {
  const persisters = sourceFiles().filter((f) => {
    const r = rel(f);
    return /\/(?:ports|serialize)\//.test(r) || /\/store(?:\/|\.ts$)/.test(r);
  });
  assert.ok(persisters.length >= 5, `INCONCLUSIVE: only ${persisters.length} persistence files found`);
  const offenders = persisters.filter((f) => /travelStats|TravelStats/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders.map(rel), [], 'a lifetime statistic reached the persistence layer');
});

// ===========================================================================
// The source sweep, demoted to a SECONDARY TRIPWIRE (A-33 Part 4).
//
// Not deleted: it is the only check that can see a lifetime count **before** it is written —
// `countriesVisited: number` on `Trip`, and an exported `lifetimeTotals` object literal in the
// store, are caught here and nowhere else — and a check that catches an intent one commit early
// is worth keeping once it has stopped being the thing that was supposed to catch a value.
// Its being name-based is now acceptable *because it is not load-bearing*: everything that
// reaches storage is covered by 6a′ and 6b-1/6b-2.
// ===========================================================================

/** A-33 Part 5: every source tree this repo ships. `packages/tokens/src` joins at revision 25. */
const ROOTS = ['packages/core/src', 'packages/client/src', 'apps/web/src', 'packages/tokens/src'];

/**
 * The only count-shaped numeric declarations permitted in the source trees, as `<path>::<name>`,
 * each with the reason it is not a stored lifetime statistic.
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
  // representation at all, which 6b-5 above pins mechanically.
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

/**
 * Comments stripped — **required, not cosmetic**: without it the numeric-literal sweep below
 * hits `derive/travelStats.ts`'s own docstring quoting A-31's rule (`countriesVisited: 47`),
 * which would be a false positive on prose that must stay in the file.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/** Every count-shaped name declared or initialised as a number in one file. */
function countShapedHits(src: string): string[] {
  const clean = stripComments(src);
  // Widening 2: a local `type X = number` alias counts as `number`.
  const aliases = [...clean.matchAll(/^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=\s*number\s*;/gm)]
    .map((m) => m[1]);
  const typed = new RegExp(`([A-Za-z$_][\\w$]*)\\??\\s*:\\s*(?:number${aliases.map((a) => `|${a}`).join('')})\\b`, 'g');
  const names = [...clean.matchAll(typed)].map((m) => m[1]);
  // Widening 3: a count-shaped property initialised to a numeric literal is a count whether or
  // not anyone annotated it.
  names.push(...[...clean.matchAll(/([A-Za-z$_][\w$]*)\s*:\s*(-?\d)/g)].map((m) => m[1]));
  return names.filter(countShaped);
}

test('tripwire: no count of countries, cities, trips or days is declared outside TripSummaryRow', () => {
  const hits: string[] = [];
  for (const file of sourceFiles()) {
    for (const name of countShapedHits(readFileSync(file, 'utf8'))) {
      const key = `${rel(file)}::${name}`;
      if (!(key in SOURCE_ALLOW)) hits.push(key);
    }
  }
  assert.deepEqual(
    [...new Set(hits)].sort(),
    [],
    'a count of countries, cities, trips or days was declared outside TripSummaryRow. Every ' +
      'number that summarises more than one trip is computed on read and has no storage ' +
      'representation at all (§8.4 A-31 Part 6). A stored countriesVisited: 47 is a second ' +
      'source of truth a user can inflate by typing.',
  );
});

test('tripwire: the allow-list is a ceiling — every entry is still present in the source', () => {
  // Without this, deleting a field would leave a stale entry that silently permits its return.
  const seen = new Set<string>();
  for (const file of sourceFiles()) {
    for (const name of countShapedHits(readFileSync(file, 'utf8'))) seen.add(`${rel(file)}::${name}`);
  }
  assert.deepEqual(
    Object.keys(SOURCE_ALLOW).filter((k) => !seen.has(k)),
    [],
    'the allow-list names a declaration that no longer exists — remove the line',
  );
});

test('tripwire: every root resolves to a real directory with sources in it', () => {
  // A renamed package must fail loudly rather than silently scanning nothing.
  for (const r of ROOTS) {
    const dir = resolve(CAIRN, r);
    assert.ok(statSync(dir).isDirectory(), `${r} is not a directory`);
  }
  const byRoot = new Map<string, number>();
  for (const f of sourceFiles()) {
    const root = ROOTS.find((r) => rel(f).startsWith(`${r}/`)) as string;
    byRoot.set(root, (byRoot.get(root) ?? 0) + 1);
  }
  for (const r of ROOTS) assert.ok((byRoot.get(r) ?? 0) > 0, `${r} contributed no source files`);
});
