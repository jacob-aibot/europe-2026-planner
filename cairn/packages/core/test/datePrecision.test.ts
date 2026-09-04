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
import { COUNTRY_INDEX, SCHEMA_VERSION, createTrip, fromJSON, migrateDoc, sequentialIds, setTripMeta, toJSON, tripSummary, TripParseError } from '../src/index.ts';
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

/**
 * QA P2-7. The static type forbids it; the runtime did not. §2.1's rule is that a `*Patch` is
 * enforced at runtime and not by TypeScript, because the action/JSON boundaries above core are
 * untyped in practice — and `setTripMeta` accepting a value `fromJSON` refuses produces a
 * document that **serializes but cannot be read back**. A trip that writes itself into an
 * unopenable state is worse than a throw at the call that did it.
 */
test('QA P2-7: setTripMeta refuses a datePrecision value fromJSON would refuse', () => {
  for (const bad of ['fortnight', 'EXACT', 'Exact', '', 'exact ', 'day', 42, true, null, {}, ['exact']]) {
    assert.throws(
      () => setTripMeta(base(), { datePrecision: bad as never }, ctx()),
      (err: unknown) => {
        assert.ok(err instanceof Error, `expected an Error for ${JSON.stringify(bad)}`);
        assert.match(err.message, /datePrecision/, err.message);
        return true;
      },
      `setTripMeta accepted datePrecision ${JSON.stringify(bad)}`,
    );
  }
});

test('QA P2-7: createTrip refuses the same values at the same boundary', () => {
  for (const bad of ['fortnight', '', 42, null]) {
    assert.throws(
      () => createTrip(
        { title: 'Japan', startDate: '2019-03-01', endDate: '2019-03-31', datePrecision: bad as never },
        ctx(),
      ),
      /datePrecision/,
      `createTrip accepted datePrecision ${JSON.stringify(bad)}`,
    );
  }
});

test('QA P2-7: the guard does not touch the legal values, absent included', () => {
  for (const good of ['exact', 'month', 'year'] as const) {
    assert.equal(setTripMeta(base(), { datePrecision: good }, ctx()).datePrecision, good);
    assert.equal(
      createTrip({ title: 'J', startDate: '2019-03-01', endDate: '2019-03-31', datePrecision: good }, ctx()).datePrecision,
      good,
    );
  }
  // A patch that says nothing about precision leaves it exactly as it was.
  const monthly = setTripMeta(base(), { datePrecision: 'month' }, ctx());
  assert.equal(setTripMeta(monthly, { title: 'Renamed' }, ctx()).datePrecision, 'month');
  assert.equal(base().datePrecision, 'exact');
});

test('QA P2-7: every document setTripMeta produces can be read back', () => {
  for (const good of ['exact', 'month', 'year'] as const) {
    const written = toJSON(setTripMeta(base(), { datePrecision: good }, ctx()));
    assert.equal(fromJSON(written).datePrecision, good);
  }
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

/**
 * QA P2-6. The Library — the screen a past trip mostly lives on — lists `TripSummaryRow`s
 * read back from storage, not `Trip`s, so it printed `2019-03-01 → 2019-03-31` for a trip the
 * user recorded as *"March 2019"*. That is the app stating something the user never claimed,
 * which is the one convention `CLAUDE.md` calls absolute.
 *
 * The row **carries** the precision so display can read it. Nothing in `derive/` branches on
 * it — the ceiling test below asserts that separately, by construction.
 */
test('QA P2-6: the summary row the Library lists carries datePrecision', () => {
  const t = setTripMeta(base(), { datePrecision: 'month' }, ctx());
  assert.equal(tripSummary(t, COUNTRY_INDEX).datePrecision, 'month');
  assert.equal(tripSummary(base(), COUNTRY_INDEX).datePrecision, 'exact');
});

/**
 * **`datePrecision` still earns no bump of its own** — the point of this test is unchanged, and
 * what moved is the number underneath it. `SCHEMA_VERSION` went 1 → 2 at Phase 2 I-13 for
 * `Trip.photos` (§10.3, A-57 Part 5) and 2 → 3 at I-9a for `Trip.participants` (§8.3, **A-72**);
 * both are *records* widenings. `datePrecision` is a field with a total default and would still be
 * riding version 1 if neither had arrived — that is `migrate.ts`'s **first** clause, and it is the
 * clause A-72 Part 4 left exactly as it was.
 *
 * The first two assertions are "whatever `SCHEMA_VERSION` says, and nothing of `datePrecision`'s
 * doing". The third is **A-72 S5, pin 2**, and it names a literal on purpose: it may not be relaxed
 * to compare the constant against itself, because a pin that reads the value it is pinning cannot
 * catch a records class that took no bump.
 */
test('no schemaVersion bump for datePrecision — the field is additive with a total default', () => {
  assert.equal(base().schemaVersion, SCHEMA_VERSION);
  assert.equal(JSON.parse(toJSON(base())).schemaVersion, SCHEMA_VERSION);
  // The bumps that DID happen are photos' and participants', each stated where it is decided.
  assert.equal(SCHEMA_VERSION, 3);
});

/**
 * The **greppable ceiling** §8.1 states in words: `datePrecision` is read by display and
 * nothing else. No conflict rule, no derive and no validation may branch on it. A hit here is
 * the field having grown a second meaning, which is exactly the drift the ruling forbids.
 */
/**
 * The one place under those three directories that may **name** the field, with the claim
 * that makes it exempt — proved below rather than accepted. Same shape as `test/views.test.ts`'
 * badge/credit exemption list.
 */
const MAY_CARRY_DATE_PRECISION: Record<string, string> = {
  'derive/summary.ts': 'TripSummaryRow is the row DISPLAY lists (the Library reads rows back ' +
    'from storage, never Trips), so this module is display\'s hand-off point, not a derive that ' +
    'branches. It copies the value and reads nothing out of it — asserted below.',
};

test('CEILING: the exemption is a carry, not a branch — summary.ts cannot read the value', () => {
  const src = readFileSync(resolve(CORE_SRC, 'derive/summary.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  // If it never mentions a member of the union it cannot branch on one, whatever it does.
  for (const member of ["'exact'", "'month'", "'year'"]) {
    assert.ok(!src.includes(member), `derive/summary.ts names ${member} — it is reading the value, not carrying it`);
  }
  assert.ok(
    !/datePrecision\s*(===|!==|==|!=|\?|<|>)/.test(src) && !/(===|!==|==|!=)\s*[\w.]*datePrecision/.test(src),
    'derive/summary.ts compares datePrecision — §8.1: no derive may branch on it',
  );
  // And what it does do is exactly one thing: hand the trip's own value to the row — the
  // field on the type, and `datePrecision: trip.datePrecision` on the copy. Three mentions,
  // no fourth: a fourth is a read.
  const uses = [...src.matchAll(/datePrecision/g)].length;
  assert.equal(uses, 3, `derive/summary.ts mentions datePrecision ${uses} times; the carry is the type and the copy`);
  assert.match(src, /datePrecision:\s*trip\.datePrecision,/);
});

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
      const rel = relative(CORE_SRC, f).split(sep).join('/');
      if (rel in MAY_CARRY_DATE_PRECISION) continue;
      if (/datePrecision/.test(readFileSync(f, 'utf8'))) offenders.push(rel);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'datePrecision reached a rule, a derive or a validation — §8.1: it is read by DISPLAY and nothing else',
  );
  // The exemption list may not grow silently either.
  assert.deepEqual(Object.keys(MAY_CARRY_DATE_PRECISION), ['derive/summary.ts']);
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
