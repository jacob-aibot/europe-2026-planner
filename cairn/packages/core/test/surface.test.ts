/**
 * ARCHITECTURE §2.10 — the public API surface, asserted as **set equality in both
 * directions** against ONE list transcribed from the document.
 *
 * The previous shape of this file is the reason the criterion is now written the way it is.
 * It held two lists — one of 50 names transcribed from §2.10 and one of 60 "beyond the
 * section" names, each with a per-symbol justification — and asserted equality against their
 * union, which is 110 = 110 for *any*
 * 110 exports. QA R2-12 then found 42 of the 60 justifications did not hold, and six of them
 * said, in the builder's own words, that the symbol was private. A criterion that cannot fail is not a
 * criterion, and a boundary the Phase 2 server and the Phase 4 native app are written
 * against cannot be "110 against 50, enumerated". BUILD-NOTES KD-33, which supersedes
 * KD-19 — the entry that recorded the gap as enumerated rather than narrowed.
 *
 * So: one array, 71 entries, set equality both ways. (69 in revision 5; `reassertRetirements`
 * joins in revision 6 under §2.7 A-5; `lifecycle` joins in revision 10 under §8.1/§8.9,
 * Phase 2 I-1.) A symbol added to `index.ts` without
 * being added to §2.10 fails; a symbol in §2.10 that is not exported fails. Widening the
 * surface is a documentation change first — add the caller or add the section that names
 * it, then add the line.
 *
 * Type-only exports are excluded by construction: they do not exist at runtime.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve, sep } from 'node:path';
import * as core from '../src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..', '..', '..');

/** §2.10, transcribed. Runtime symbols only — 71 of them, grouped as the section groups them. */
const THE_LIST = [
  // model (7)
  'LOCAL_OWNER', 'SCHEMA_VERSION', 'sequentialIds', 'formatRange', 'costFromDisplay',
  'TripParseError', 'ForeignDocumentError',
  // build (17)
  'createTrip', 'ensureDays', 'setTripMeta', 'setDayMeta',
  'addStop', 'updateStop', 'removeStop', 'moveStop', 'reorderStop',
  'scheduleFromPool', 'returnToPool', 'poolFor',
  'acceptCandidate', 'rejectCandidate', 'copyStopInto', 'upsertBooking', 'linkBooking',
  // derive (22)
  'computeLegs', 'dayMovingMinutes', 'dayDistanceKm', 'fmtMins',
  'clusterStops', 'focusCluster', 'fitSpanKm', 'MIN_SPAN_KM', 'mapBounds', 'stopPoints', 'stopLatLng',
  'rollUpCost', 'displayStatus', 'attribution',
  'cityRange', 'daysForCity', 'orderedCities', 'weekdayOf', 'tripSummary',
  'geoCheck', 'GEO_LIMIT_KM', 'lifecycle',
  // conflict (6)
  'detectConflicts', 'RULES', 'resolveConflict', 'unresolveConflict', 'syncResolutions',
  'reassertRetirements',
  // validate (2)
  'validateTrip', 'issueCounts',
  // merge (2)
  'mergeTrips', 'describeMerge',
  // access (7)
  'canView', 'canComment', 'canEdit', 'canShare', 'canDelete', 'can', 'effectiveRole',
  // serialize (3)
  'toJSON', 'fromJSON', 'migrateDoc',
  // import (1)
  'importLegacyDays',
  // redact (4) — §6.6
  'REDACTION_PATTERNS', 'REDACTED', 'redactText', 'redactionHits',
];

const runtimeExports = () =>
  Object.keys(core).filter((k) => typeof (core as Record<string, unknown>)[k] !== 'undefined');

test('§2.10 is 71 symbols, and the list in this file is exactly that long', () => {
  assert.equal(THE_LIST.length, 71, 'the transcribed list is no longer §2.10\'s stated size');
  assert.equal(new Set(THE_LIST).size, 71, 'the list has a duplicate');
});

test('the index exports exactly §2.10\'s list — set equality, both directions', () => {
  const actual = runtimeExports().sort();
  const expected = [...THE_LIST].sort();
  const extra = actual.filter((n) => !THE_LIST.includes(n));
  const missing = expected.filter((n) => !actual.includes(n));
  assert.deepEqual(
    extra,
    [],
    'a symbol reaches the index without being in §2.10 — add the caller or the section that names it, then add the line',
  );
  assert.deepEqual(missing, [], '§2.10 names a symbol the index does not export');
  assert.deepEqual(actual, expected);
});

/**
 * QA R5-5, kept as a named case because it is the argument the whole un-export pass rests
 * on. `accept`/`reject` take `UserId | null` and check nothing, so exporting them published
 * a bypass around §2.14's gate — an acceptance with no accepter, mintable in one public
 * call. Revision 5 extends the same reasoning to the four provenance constructors.
 */
test('R5-5: no unchecked way to mint provenance is exported', () => {
  const exported = new Set(runtimeExports());
  for (const name of ['accept', 'reject', 'userProvenance', 'systemSuggestion', 'emailCandidate', 'friendImport']) {
    assert.equal(
      exported.has(name),
      false,
      `core.${name} is public — it stamps provenance with no gate, which publishes a way to ` +
        'mint an attributed record without going through copyStopInto\'s seven rules (§2.14)',
    );
  }
  // The checked ways in are still there — this is a narrowing, not a removal of capability.
  for (const name of ['createTrip', 'addStop', 'copyStopInto', 'acceptCandidate', 'rejectCandidate']) {
    assert.equal(typeof (core as Record<string, unknown>)[name], 'function', `${name} went missing`);
  }
});

test('one list, and neither banned identifier occurs anywhere in this file', () => {
  // ROADMAP E's own mechanical check, run against this file: the shape that made the old
  // criterion unfalsifiable must not be able to come back without failing the run. The two
  // banned tokens are assembled from pieces so that a plain `grep` over this file — which is
  // how the criterion is worded — finds ZERO occurrences of either.
  const src = readFileSync(resolve(HERE, 'surface.test.ts'), 'utf8');
  const banned = [['BEYOND', '2', '10'].join('_'), ['INTER', 'NAL'].join('')];
  for (const token of banned) {
    const occurrences = src.split(token).length - 1;
    // The two assembled literals above are the only textual near-misses, and they are not
    // the token itself, so the expected count really is zero.
    assert.equal(occurrences, 0, `"${token}" occurs ${occurrences} times; the criterion says zero`);
  }
  const arrays = [...src.matchAll(/^const [A-Z_0-9]+\s*=\s*\[/gm)].length;
  assert.equal(arrays, 1, `${arrays} symbol arrays in this file; §2.10 is one list`);
});

/**
 * Ceiling (1) from ROADMAP E: nothing outside `packages/core` may import a core module path
 * directly. That is what makes the index a boundary rather than a suggestion, and it is what
 * `tools/redact.mjs`'s deep import into `build/redactText.ts` used to violate — which is why
 * the redaction four are on the index now.
 *
 * `cairn/test/` and `cairn/qa/` are exempt **by design**: tests do not create surface, and
 * attacking an internal is their job.
 */
test('nothing outside packages/core imports a core module path directly', () => {
  const roots = ['packages/client/src', 'apps/web/src', 'fixtures', 'tools'].map((d) => resolve(CAIRN, d));
  const walk = (dir: string): string[] => {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return []; }
    return entries.flatMap((n) => {
      if (n === 'node_modules' || n === 'dist' || n === 'golden') return [];
      const full = resolve(dir, n);
      return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx|mts|mjs|js)$/.test(full) ? [full] : [];
    });
  };
  const files = roots.flatMap(walk);
  files.push(resolve(CAIRN, 'cli.ts'));

  const offenders: string[] = [];
  const deep = /from\s+['"]([^'"]*packages\/core\/src\/[^'"]+)['"]|import\(\s*['"]([^'"]*packages\/core\/src\/[^'"]+)['"]/g;
  for (const f of files) {
    const rel = relative(CAIRN, f).split(sep).join('/');
    // `packages/client/src/deps.ts` is the single sanctioned re-export of the index (§4.1).
    if (rel === 'packages/client/src/deps.ts') continue;
    for (const m of readFileSync(f, 'utf8').matchAll(deep)) {
      const spec = m[1] ?? m[2];
      if (/packages\/core\/src\/index\.ts$/.test(spec)) continue;
      offenders.push(`${rel}: ${spec}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'a consumer reaches past the index into a core module path — widen §2.10 or stop reaching',
  );
});
