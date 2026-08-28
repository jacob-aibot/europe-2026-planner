/**
 * QA round 29 — I-7a: **the trip-span the forms do not bound, and A-32 Part 5's "unbounded
 * work" trigger.**
 *
 *   node --experimental-strip-types --max-old-space-size=3000 qa/i7a-span.mjs
 *   node --experimental-strip-types qa/i7a-span.mjs --fast    (skips the 266 MB case)
 *
 * ARCHITECTURE §2.1 **A-32 Part 5** refuses a plausibility floor on `PastTripForm`'s Year field
 * and names the triggers that would reopen it, the first being:
 *
 *   > "any evidence that an out-of-era trip costs something beyond the user's own typo —
 *   >  unbounded work (**it is not: a `year` trip is 365 days at any year**) …"
 *
 * That parenthesis is true for the **year** branch of `rangeFor` and only for it. The **exact**
 * branch — `PastTripForm` precision `'exact'` (`views/PastTripForm.tsx:62-65`) and the new-trip
 * form (`views/Library.tsx:209`) — validates `/^\d{4}-\d{2}-\d{2}$/` on each endpoint plus
 * `end >= start`, and nothing else. `build/days.ts:50-56`'s `ensureDays` then mints one `Day`
 * object per day of the span with no bound at all.
 *
 * The same single-character mistype R28-1 was filed for — `0202` where `2020` was meant — is
 * typeable in the START field of the exact branch, and `0202-01-01 → 2020-12-31` is a span of
 * 664,377 days.
 */
import * as core from '../packages/core/src/index.ts';
import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
} from '../packages/client/src/index.ts';

const FAST = process.argv.includes('--fast');
let fails = 0;
const ok = (c, m, extra) => {
  if (c) console.log(`  ok    ${m}`);
  else { fails++; console.log(`  FAIL  ${m}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

/** `rangeFor(precision:'exact')`, transcribed from PastTripForm.tsx:62-65. */
const rangeForExact = (a, b) =>
  (/^\d{4}-\d{2}-\d{2}$/.test(a) && /^\d{4}-\d{2}-\d{2}$/.test(b) && b >= a
    ? { startDate: a, endDate: b } : null);

const ids = (() => { let n = 0; return { newId: (p) => `${p}-${++n}` }; })();

function measure(start, end) {
  const t0 = Date.now();
  const trip = core.createTrip(
    { title: 'a past trip', startDate: start, endDate: end, cities: [{ name: 'Vienna', order: 0 }] },
    { ids, now: '2026-08-28' },
  );
  const t1 = Date.now();
  const json = core.toJSON(trip);
  const t2 = Date.now();
  return { days: trip.days.length, createMs: t1 - t0, toJsonMs: t2 - t1, bytes: json.length };
}

head('1. the exact branch accepts what the year branch cannot express');
{
  ok(rangeForExact('0202-01-01', '2020-12-31') !== null,
    'rangeFor(\'exact\') accepts 0202-01-01 → 2020-12-31 — one mistyped digit in the start year');
  ok(rangeForExact('0000-01-01', '9999-12-31') !== null,
    'and 0000-01-01 → 9999-12-31, the whole IsoDate domain');
  ok(rangeForExact('2020-12-31', '0202-01-01') === null, 'but not an inverted range');
}

head('2. what ensureDays does with it');
{
  const small = measure('2019-01-01', '2019-12-31');
  note(`2019-01-01 → 2019-12-31: ${small.days} days, ${small.createMs} ms, ${(small.bytes / 1048576).toFixed(2)} MB`);
  const century = measure('1920-01-01', '2020-12-31');
  note(`1920-01-01 → 2020-12-31: ${century.days} days, ${century.createMs} ms, ${(century.bytes / 1048576).toFixed(1)} MB`);
  ok(century.days < 5000,
    `a 100-year exact range is ${century.days} days and ${(century.bytes / 1048576).toFixed(1)} MB of JSON for ONE trip`, century);

  if (!FAST) {
    const typo = measure('0202-01-01', '2020-12-31');
    note(`0202-01-01 → 2020-12-31: ${typo.days} days, create ${typo.createMs} ms, ` +
      `toJSON ${typo.toJsonMs} ms, ${(typo.bytes / 1048576).toFixed(1)} MB`);
    ok(typo.days < 100000,
      'THE FINDING: the R28-1 mistype on the EXACT branch mints a document a browser tab cannot ' +
      'hold — no bound anywhere between the form and ensureDays', {
        days: typo.days, megabytes: +(typo.bytes / 1048576).toFixed(1),
        totalMs: typo.createMs + typo.toJsonMs,
      });
  } else {
    note('(--fast: the 664,377-day case skipped)');
  }
}

head('3. through the real store and the real port');
{
  // A 40-year span: big enough to be obviously wrong, small enough to run in seconds.
  const storage = memoryStorage();
  const store = createStore({
    ports: {
      storage, file: memoryFile(), clock: fixedClockPort('2026-08-28'),
      ids: sequentialIdPort('s-'), scheduler: immediateScheduler(),
    },
  });
  const t0 = Date.now();
  await store.createTrip({
    title: 'mistyped', startDate: '1986-01-01', endDate: '2026-01-01',
    cities: [{ name: 'Vienna', order: 0 }],
  });
  await store.flush?.();
  const doc = store.getState().doc;
  const ms = Date.now() - t0;
  note(`store.createTrip over a 40-year exact range: ${doc.days.length} days in ${ms} ms`);
  const rows = await storage.listTrips();
  note(`the library row for it: dayCount=${rows[0]?.dayCount}, ${JSON.stringify(rows[0]?.title)}`);
  const stored = await storage.load(doc.id);
  note(`bytes written to the port: ${(stored.doc.length / 1048576).toFixed(1)} MB`);
  ok(doc.days.length === 14611, 'the store accepts it without complaint and writes it', doc.days.length);
  const issues = core.validateTrip(doc, '2026-08-28');
  ok(issues.length === 0,
    'and validateTrip reports NOTHING — the document is internally consistent, just absurd',
    issues.map((i) => i.code).slice(0, 5));
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`} — a FAIL here is the finding, not a broken probe`);
process.exit(0);
