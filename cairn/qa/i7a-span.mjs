/**
 * QA round 29 — I-7a: **the trip-span the forms do not bound, and A-32 Part 5's "unbounded
 * work" trigger.**
 * **RE-EXPRESSED at QA round 30**, after ARCHITECTURE revision 26 ruled §2.3 **A-35** and I-7b
 * built it. See the block at the end of this comment.
 *
 *   node --experimental-strip-types qa/i7a-span.mjs
 *   (`--fast` is retained and is now a no-op: nothing here allocates a large document any more)
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
 *
 * ---------------------------------------------------------------------------
 * **Round 30 re-expression — what changed and why this is not the probe being laundered.**
 *
 * §§2 and 3 above asserted the **presence** of R29-2 (*"a 100-year exact range is 36,891
 * days"*, *"the store accepts it without complaint"*). ARCHITECTURE §2.3 **A-35** ruled the
 * bound into `ensureDays` at `MAX_TRIP_SPAN_DAYS = 3653`, so under the shipped tree
 * `measure('1920-01-01','2020-12-31')` **throws out of the probe** — the process died with a
 * stack trace and printed no verdict at all, which is strictly worse than a FAIL.
 *
 * So both sections now assert the **refusal** rather than the allocation, and §1 is unchanged
 * and re-labelled: A-35 Part 2 reason 2 and Part 6 both require that the form-level validation
 * still says *yes* — the bound is one definition living at the mint, deliberately not a second
 * copy in a view — so §1 asserting that `rangeForExact` still accepts `0202-01-01 → 2020-12-31`
 * is now a **positive** criterion rather than the finding it was.
 *
 * Mutation-tested per the round-29 rule for a re-expressed probe: delete A-35's `if` from
 * `build/days.ts` alone, leave this file exactly as it is, and every re-expressed assertion in
 * §§2–3 goes red. `qa/r30-span.mjs` carries the fuller boundary matrix.
 * ---------------------------------------------------------------------------
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

/**
 * **Round 30:** returns `{ refused: message }` instead of throwing out of the probe. A-35 made
 * the over-cap cases a throw, and a probe that dies on the behaviour it is measuring reports
 * nothing at all.
 */
function measure(start, end) {
  const t0 = Date.now();
  let trip;
  try {
    trip = core.createTrip(
      { title: 'a past trip', startDate: start, endDate: end, cities: [{ name: 'Vienna', order: 0 }] },
      { ids, now: '2026-08-28' },
    );
  } catch (e) {
    return { refused: e instanceof Error ? e.message : String(e) };
  }
  const t1 = Date.now();
  const json = core.toJSON(trip);
  const t2 = Date.now();
  return { days: trip.days.length, createMs: t1 - t0, toJsonMs: t2 - t1, bytes: json.length };
}

head('1. the exact branch still accepts what the year branch cannot express — A-35 Part 6');
{
  // **Round 30, re-expressed in role only.** Under A-35 this is a POSITIVE criterion: the bound
  // is one definition and it lives at the mint, so the two forms' open-coded validation must
  // still say yes and the refusal must arrive from `createTrip` through their existing
  // `catch → onError`. A span check appearing here would be the second definition of what a
  // trip may be, living in a view — the shape §2.9 A-20 spent a ruling removing.
  ok(rangeForExact('0202-01-01', '2020-12-31') !== null,
    'rangeFor(\'exact\') still accepts 0202-01-01 → 2020-12-31 — the bound is NOT in the view');
  ok(rangeForExact('0000-01-01', '9999-12-31') !== null,
    'and 0000-01-01 → 9999-12-31, the whole IsoDate domain');
  ok(rangeForExact('2020-12-31', '0202-01-01') === null, 'but not an inverted range');
}

head('2. what ensureDays does with it — A-35: it refuses');
{
  const small = measure('2019-01-01', '2019-12-31');
  note(`2019-01-01 → 2019-12-31: ${small.days} days, ${small.createMs} ms, ${(small.bytes / 1048576).toFixed(2)} MB`);
  ok(small.days === 365, 'a one-year exact range is untouched by the cap', small);

  const century = measure('1920-01-01', '2020-12-31');
  ok(century.refused !== undefined,
    'a 100-year exact range (36,891 days) is REFUSED rather than minted', century);
  ok(!!century.refused && /36891 days/.test(century.refused) && /3653/.test(century.refused),
    'and the message names the span it refused and the cap', century.refused);
  note(`1920-01-01 → 2020-12-31: ${century.refused ?? `${century.days} days`}`);

  const typo = measure('0202-01-01', '2020-12-31');
  ok(typo.refused !== undefined,
    'THE FIX: the R28-1 mistype on the EXACT branch is refused instead of minting a 664,377-day ' +
    'document a browser tab cannot hold', typo);
  ok(!!typo.refused && /664377 days/.test(typo.refused) && typo.refused.includes('0202-01-01'),
    'and the message names the span and both dates, for a person', typo.refused);
  note(`0202-01-01 → 2020-12-31: ${typo.refused ?? `${typo.days} days`}`);

  // The boundary, both directions — A-35 Part 6's own pair.
  ok(measure('2020-01-01', '2029-12-31').days === 3653, 'exactly 3,653 days still creates');
  ok(measure('2020-01-01', '2030-01-01').refused !== undefined, 'exactly 3,654 days is refused');
  if (FAST) note('(--fast is now a no-op: nothing here allocates a large document)');
}

head('3. through the real store and the real port');
{
  // A 40-year span: what §3 used to measure being written. It must now be refused BEFORE
  // anything reaches the port, and the store must be left with nothing half-written.
  const storage = memoryStorage();
  const store = createStore({
    ports: {
      storage, file: memoryFile(), clock: fixedClockPort('2026-08-28'),
      ids: sequentialIdPort('s-'), scheduler: immediateScheduler(),
    },
  });
  let refused = null;
  try {
    await store.createTrip({
      title: 'mistyped', startDate: '1986-01-01', endDate: '2026-01-01',
      cities: [{ name: 'Vienna', order: 0 }],
    });
  } catch (e) { refused = e instanceof Error ? e.message : String(e); }
  await store.flush?.();
  note(`store.createTrip over a 40-year exact range: ${refused ?? 'ACCEPTED'}`);
  ok(refused !== null,
    'the store REJECTS it — this is the channel PastTripForm and Library already catch into onError');
  ok(!!refused && /14611 days/.test(refused), 'and the rejection names the span', refused);
  // Nothing half-written: no document in the store's own state, and no library row in the port.
  const doc = store.getState().doc;
  ok(doc === null || doc === undefined || doc.days.length < 3654,
    'the store holds no over-cap document afterwards', doc && doc.days.length);
  const rows = await storage.listTrips();
  ok(rows.length === 0, 'and the port holds no library row for a trip that was never created', rows.map((r) => r.title));
  // A legitimate trip through the same store still works — the store is not poisoned.
  await store.createTrip({
    title: 'fine', startDate: '2026-01-01', endDate: '2026-01-10',
    cities: [{ name: 'Vienna', order: 0 }],
  });
  await store.flush?.();
  ok((await storage.listTrips()).length === 1, 'and a legitimate trip through the same store still lands');
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`} — a FAIL here is the finding, not a broken probe`);
process.exit(0);
