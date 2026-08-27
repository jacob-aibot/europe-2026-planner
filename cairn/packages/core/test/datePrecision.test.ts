/**
 * `Trip.datePrecision` — ARCHITECTURE §8.1, ROADMAP Phase 2 I-2.
 *
 * The one new stored field: `'exact' | 'month' | 'year'`, default `'exact'`. `startDate` and
 * `endDate` stay **real calendar dates**, so no rule, derive or golden moves; the field
 * records only that the user did not know the exact days — *"Japan, March 2019"* is stored as
 * `2019-03-01 … 2019-03-31, precision:'month'`.
 *
 * **It is read by display and nothing else.** The last test in this file is the greppable
 * ceiling that enforces that: a hit under `conflict/`, `derive/` or `validate/` is the field
 * having grown a second meaning, and §8.1 forbids it in writing.
 *
 * No `schemaVersion` bump: the field is additive with a total default and `migrateDoc`
 * supplies it, which is the treatment every additive field gets. A bump is reserved for a
 * *value* widening an older client would silently drop (§8.1, §8.5).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve, sep } from 'node:path';
import { createTrip, fromJSON, migrateDoc, sequentialIds, setTripMeta, toJSON, TripParseError } from '../src/index.ts';
import type { BuildCtx, Trip } from '../src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE_SRC = resolve(HERE, '..', 'src');

const ctx = (): BuildCtx => ({ ids: sequentialIds('p'), now: '2026-01-01', actorUserId: 'local:self' });
const base = (): Trip =>
  createTrip({ title: 'Japan', startDate: '2019-03-01', endDate: '2019-03-31', homeCurrency: 'EUR', cities: [] }, ctx());

test('createTrip defaults datePrecision to "exact"', () => {
  assert.equal(base().datePrecision, 'exact');
});

test('createTrip accepts an explicit precision', () => {
  const t = createTrip(
    { title: 'Japan', startDate: '2019-03-01', endDate: '2019-03-31', homeCurrency: 'EUR', cities: [], datePrecision: 'month' },
    ctx(),
  );
  assert.equal(t.datePrecision, 'month');
});

test('setTripMeta carries datePrecision — it is on the patch allowlist (§8.1)', () => {
  const t = setTripMeta(base(), { datePrecision: 'year' }, ctx());
  assert.equal(t.datePrecision, 'year');
  assert.equal(t.revision, base().revision + 1, 'setTripMeta bumps revision');
  // The dates themselves are untouched: precision is not a second copy of the range.
  assert.equal(t.startDate, '2019-03-01');
  assert.equal(t.endDate, '2019-03-31');
});

test('round trip is byte-identical WITH the field, for all three values', () => {
  for (const precision of ['exact', 'month', 'year'] as const) {
    const t = setTripMeta(base(), { datePrecision: precision }, ctx());
    const once = toJSON(t);
    assert.equal(toJSON(fromJSON(once)), once, `datePrecision:'${precision}' did not round-trip`);
    assert.equal(fromJSON(once).datePrecision, precision);
  }
});

test('round trip is byte-identical WITHOUT the field — an older document loads as "exact"', () => {
  const t = base();
  const doc = JSON.parse(toJSON(t));
  assert.ok('datePrecision' in doc, 'toJSON must write the field');
  delete doc.datePrecision;
  const older = JSON.stringify(doc, null, 2);
  const parsed = fromJSON(older);
  assert.equal(parsed.datePrecision, 'exact', 'a pre-I-2 document must load as exact');
  // And re-serialising it is stable from there on: the default is total, so the second write
  // carries the field and every write after that is identical to it.
  const written = toJSON(parsed);
  assert.equal(toJSON(fromJSON(written)), written);
});

test('migrateDoc supplies the default for a document that predates the field', () => {
  const doc = JSON.parse(toJSON(base())) as Record<string, unknown>;
  delete doc.datePrecision;
  const migrated = migrateDoc(doc) as Record<string, unknown>;
  assert.equal(migrated.datePrecision, 'exact');
  // Present values are left exactly alone.
  const withMonth = { ...JSON.parse(toJSON(base())), datePrecision: 'month' };
  assert.equal((migrateDoc(withMonth) as Record<string, unknown>).datePrecision, 'month');
});

test('fromJSON rejects datePrecision:"fortnight" with a JSON path', () => {
  const doc = JSON.parse(toJSON(base()));
  doc.datePrecision = 'fortnight';
  assert.throws(
    () => fromJSON(JSON.stringify(doc)),
    (err: unknown) => {
      assert.ok(err instanceof TripParseError, `expected TripParseError, got ${String(err)}`);
      assert.equal(err.path, '$.datePrecision');
      return true;
    },
  );
});

test('fromJSON rejects every non-member value, not just the one the criterion names', () => {
  for (const bad of ['', 'EXACT', 'day', 'decade', 1, null, true, {}, ['month']]) {
    const doc = JSON.parse(toJSON(base()));
    doc.datePrecision = bad;
    assert.throws(() => fromJSON(JSON.stringify(doc)), TripParseError, `accepted ${JSON.stringify(bad)}`);
  }
});

test('no schemaVersion bump — the field is additive with a total default', () => {
  assert.equal(base().schemaVersion, 1);
  assert.equal(JSON.parse(toJSON(base())).schemaVersion, 1);
});

/**
 * The **greppable ceiling** §8.1 states in words: `datePrecision` is read by display and
 * nothing else. No conflict rule, no derive and no validation may branch on it. A hit here is
 * the field having grown a second meaning, which is exactly the drift the ruling forbids.
 */
test('CEILING: datePrecision appears nowhere under conflict/, derive/ or validate/', () => {
  const walk = (dir: string): string[] => {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return []; }
    return entries.flatMap((n) => {
      const full = resolve(dir, n);
      return statSync(full).isDirectory() ? walk(full) : /\.ts$/.test(full) ? [full] : [];
    });
  };
  const offenders: string[] = [];
  for (const sub of ['conflict', 'derive', 'validate']) {
    for (const f of walk(resolve(CORE_SRC, sub))) {
      if (/datePrecision/.test(readFileSync(f, 'utf8'))) {
        offenders.push(relative(CORE_SRC, f).split(sep).join('/'));
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'datePrecision reached a rule, a derive or a validation — §8.1: it is read by DISPLAY and nothing else',
  );
});

test('CEILING: and it DOES appear where §8.1 says it lives', () => {
  const expected = [
    'model/types.ts',
    'serialize/fromJSON.ts',
    'serialize/toJSON.ts',
    'serialize/migrate.ts',
    'build/createTrip.ts',
  ];
  for (const rel of expected) {
    assert.match(
      readFileSync(resolve(CORE_SRC, rel), 'utf8'),
      /datePrecision/,
      `${rel} does not mention datePrecision, but §8.1 says the field lives there`,
    );
  }
});
