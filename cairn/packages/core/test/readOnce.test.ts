/**
 * **A-23 (ARCHITECTURE revision 17) — the standing census.**
 *
 * `build/copyStop.ts` produced a finding in five consecutive breaker rounds, and since round 17
 * every one of them had the same shape: *a ruling printed a claim that its search was complete,
 * and the search had missed a site.* A-21 said "file-wide" and missed five. A-21a said "total",
 * searched the same file for exactly this shape, and missed four — including one printed inside
 * A-21's own body, in the sibling branch of the `if` it was fixing.
 *
 * So the rule stops being checked by the next reviewer's eyes:
 *
 * > Within one traversal, a field of a caller-supplied value is read exactly **once**. The value
 * > that was checked is the value that is used, compared, redacted and emitted.
 *
 * This file **measures** that, mechanically, over every control-flow path through `copyStopInto`.
 * Every own enumerable field of every caller-supplied record — recursively, through plain objects
 * and arrays — is wrapped in a counting accessor that returns a **stable** value. Nothing here is
 * a fault injection: the values never change, so a red line is never a false alarm about a value
 * that was never read. It reports the field, the count and the scenario.
 *
 * **Why a census and not a grep.** A grep over property-access counts cannot tell `p.at` inside a
 * `find` predicate that runs once from one that runs N times, cannot see through a helper, and
 * false-positives on the first legitimate pattern it does not know — a test that removes itself
 * the first time it is wrong.
 *
 * **What this does NOT claim** (A-23, so nobody over-trusts it):
 *
 *   - It is not the `flipping` fixtures' replacement. This proves *how many times* a value is
 *     read; `copyStop.test.ts`'s A-21/A-21a/A-22 accessor fixtures prove *which value crosses*
 *     and that nothing throws. A function that read one field once and emitted a different field
 *     entirely would pass this file and fail those.
 *   - It is scoped to `copyStopInto`, deliberately. `fromJSON` is full of the **safe** double
 *     read A-21 Part 2 blessed in writing, so a census there would be red by design. The trigger
 *     to widen it is the one A-20, A-21 Part 6 and A-21a all name: the day something other than a
 *     person's own hand builds a `Trip` in memory (a native bridge, an ingest worker §5.1, a
 *     vendor feed).
 *   - It measures the paths the matrix reaches. That is why the matrix is specified in A-23
 *     rather than left to the builder, and why **adding a branch means adding a row**.
 *
 * **The maintenance rule, as A-25 Part 1 finally makes it mechanical.** A new branch in
 * `copyStopInto` adds a scenario row — **that one stays a maintenance rule, honestly**, because
 * *"a branch"* is a property of the code and no `Record<keyof T, true>` reaches it. A new field on
 * `Trip`, `Stop`, `Place` or `City` fails `npm run typecheck` in the four `CENSUS_*_FIELDS` maps
 * below, and the key-set test then stays **red until the fixture actually carries it** — because the
 * census enumerates `Object.keys` of the fixture INSTANCE, so a field the fixture omits is
 * invisible, which is how `Stop.ticket` stayed invisible through round 19 (R19-5) and how any next
 * field would have (R20-1). A new entry in `ALLOWED` — or a raised `max` — is **an architect's
 * ruling, not a builder's judgment**: it is the written form of *"this value may be read twice and
 * here is why the second read cannot leak"*. A builder who needs one stops and routes it. The
 * converse is a builder's **obligation**: **deleting an entry that a fix in the same pass made dead
 * is not widening the allow-list**, and assertion 2 will demand it.
 *
 * **A-24 (revision 18, QA R19-3…R19-5) — three claims A-23 made about its own reach, all smaller
 * than stated, all corrected here.** The `opaque` set held both whole `Trip` records on the ground
 * that they are *"the document skeleton rather than values that cross"*, which is false for `Trip.id`
 * and `Trip.ownerId`; the matrix assigned row 5 two covers that are mutually exclusive; and *"a new
 * field is covered automatically"* was true only of fields the fixture instance carried. Seven roots,
 * fourteen rows, seven `ALLOWED` entries, and a fixture stop carrying 15 of `Stop`'s 15 fields.
 *
 * **A-25 (revision 19, QA R20-1…R20-3) — the last of the three dimensions, and the last site.**
 * A census can be wrong about its **roots**, its **matrix** or its **fixtures**; A-23 closed the
 * first for `Stop`/`Place`, A-24 closed it for `Trip`, and the third was pure prose. Part 1 makes it
 * structural (four compile-time maps, a runtime key-set assertion, and a `DECLARED_NULLS` list,
 * because a key set cannot see a field that is `null` — which is exactly how `homeBase` stayed
 * invisible). Part 2 adds **both documents' `City` rows** as roots, on the rule that *a value which
 * decides where a crossed record is FILED is in scope exactly as a value that crosses is* — a
 * `Place` carries no provenance (A-6), so a mis-filing is as unbadged as a leak. Part 4 adds row 15.
 * **Nine roots, fifteen rows, eight `ALLOWED` entries, four tests.**
 *
 * This does not replace `qa/r18-readonce.mjs` §1.1, which is QA's own copy of the mechanism at
 * its own scope. **A divergence between the two is itself a finding.**
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// §2.10's "tests do not create surface": the four public symbols come from the index, and
// `addPlace` / `TRANSIT_CITY_KEY` are internals imported by module path. Nothing here widens the
// surface — §2.10 is 73 since Phase 2 I-5, and none of the six below is one of them.
import { addStop, copyStopInto, createTrip, sequentialIds } from '../src/index.ts';
import type {
  BuildCtx, City, LatLng, Place, PlaceLink, Stop, StopPlacement, Trip,
} from '../src/index.ts';
import { addPlace } from '../src/build/stops.ts';
import { TRANSIT_CITY_KEY } from '../src/model/ids.ts';

// ---------------------------------------------------------------------------
// The census
// ---------------------------------------------------------------------------

type Counts = Record<string, number>;

/**
 * Wraps every own enumerable property of `v` — recursively, through plain objects and arrays — in
 * a counting accessor that returns a STABLE value. Recursion stops at `opaque` (the `IdFactory`,
 * which is a callable core owns, and the two censused `Trip` records, which `censusTrip` has
 * already wrapped at their own granularity).
 */
function censusDeep<T>(v: T, counts: Counts, path: string, opaque: ReadonlySet<unknown>): T {
  if (v === null || typeof v !== 'object' || opaque.has(v)) return v;
  const from = v as unknown as Record<string, unknown>;
  const out = (Array.isArray(v) ? [] : {}) as Record<string, unknown>;
  for (const k of Object.keys(from)) {
    const key = `${path}.${k}`;
    const child = censusDeep(from[k], counts, key, opaque);
    Object.defineProperty(out, k, {
      enumerable: true, configurable: true,
      get() { counts[key] = (counts[key] ?? 0) + 1; return child; },
    });
  }
  return out as unknown as T;
}

/**
 * A-24 Part 1 (QA R19-3). The `Trip` is a root, not an opaque box. Core legitimately SCANS the six
 * collections — those are the document skeleton — but `Trip.id` and `Trip.ownerId` cross the person
 * boundary verbatim into `provenance.origin`, so they are censused like any other value. The
 * collections are handed back BARE (their rows are already censused as their own roots), which is
 * why they are a key list here rather than members of `opaque`: `opaque` stops recursion at an
 * OBJECT, and what has to stop here is six NAMED FIELDS of one object.
 *
 * A-23 held both whole `Trip`s opaque on the stated ground that they are *"the document skeleton
 * rather than values that cross"*. That is false for exactly the two fields the credit is made of,
 * and it is why R19-1 — `source.trip.id` read twice, once for the credit and once for A-16 step 2's
 * identity test — survived A-22's own hoist of the container and had to be found by widening the
 * guard rather than by running it, for the sixth round in a row.
 */
const TRIP_SKELETON: ReadonlySet<string> = new Set([
  'days', 'cities', 'places', 'pool', 'bookings', 'resolutions',
  // §10.1, Phase 2 I-13. `photos` joins the collections for the same reason the other six are
  // here: a `{...trip}` anywhere on the copy path reads every enumerable field, so a counted
  // getter on a collection measures the spread and not a decision about a row. §10.5 states the
  // property this file would otherwise be asserting — *"copyStopInto copies no photo, and this
  // needs no change to `copyStop.ts`"* — and `packages/core/test/photos.test.ts` asserts it
  // directly, on the output, which is strictly stronger than a read count.
  'photos',
  // §8.3, Phase 2 I-9. `participants` joins on `photos`' terms exactly: it is a collection of the
  // document skeleton, a `{...trip}` on the copy path reads it, and what would be censused is the
  // spread rather than a decision about a row. The property this file would otherwise be
  // asserting — that `copyStopInto` carries no participant — is stated directly on the OUTPUT in
  // `packages/core/test/participants.test.ts` (the copy target's `participants` stays `[]`),
  // which is strictly stronger than a read count.
  'participants',
]);

function censusTrip(trip: Trip, counts: Counts, path: string, opaque: ReadonlySet<unknown>): Trip {
  const from = trip as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(from)) {
    const raw = from[k];
    if (TRIP_SKELETON.has(k)) { out[k] = raw; continue; }   // bare, uncounted
    const key = `${path}.${k}`;
    const child = censusDeep(raw, counts, key, opaque);
    Object.defineProperty(out, k, {
      enumerable: true, configurable: true,
      get() { counts[key] = (counts[key] ?? 0) + 1; return child; },
    });
  }
  return out as unknown as Trip;
}

/**
 * **The allow-list is the ruling, written in the test** (A-23). Exactly **eight** entries after
 * A-25 Part 2 — the five A-22 left, the two irreducible structural counts narrowing `opaque` made
 * visible (A-24 Part 1), and the one bounded exception opening the `City` rows produced. Adding
 * one, or raising a `max`, is an architect's decision; see the maintenance rule in this file's
 * header.
 *
 * **The discriminator A-24 Part 1 states, so a builder never guesses which is which:**
 *
 * > A field of a document the function *spreads* has an irreducible floor of one read, from the
 * > spread itself. A field of a document the function only *reads* has no floor.
 *
 * `copyStopInto` spreads the **target** — `{ ...target }`, then `withDay`'s and `addStop`'s
 * `{ ...trip }` / `{ ...next }` — because its result *is* the recipient's own document rebuilt. It
 * never spreads the **source**. So `srcTrip.id ×2` was a defect (R19-1, fixed: one hoist, no entry
 * here) while `tgtTrip.id ×2` and `tgtTrip.revision ×2` are floors.
 */
const ALLOWED: Record<string, { max: number; why: string }> = {
  'srcStop.place.kind': { max: 2, why: 'A-21: discriminant tested against a closed set; every branch builds a fresh record, so the worst an unstable kind yields is {kind:"none"} — a hole' },
  'srcPlace.at':        { max: 2, why: 'A-21a: the reuse probe reads it, placeForCopy reads it again; closing it would break A-15\'s single classification point' },
  'srcPlace.at.lat':    { max: 2, why: 'A-22 Part 2: the same exception one level down, now constant in the recipient\'s row count' },
  'srcPlace.at.lng':    { max: 2, why: 'A-22 Part 2: as above' },
  'srcPlace.name':      { max: 2, why: 'A-21a: probe + placeForCopy; A-15 has `name` crossing verbatim, so this is an inconsistency and not a crossing' },
  'tgtTrip.id':       { max: 2, why: 'A-24 Part 1: read 1 is refileCityKey\'s A-16 identity conjunct, read 2 is the record spread that rebuilds the RECIPIENT\'S OWN document — an irreducible floor, not a blessed second read. Nothing of the target Trip crosses a person boundary' },
  'tgtTrip.revision': { max: 2, why: 'A-24 Part 1: read 1 is the { ...trip } spread whose value the explicit `revision:` key immediately overwrites; read 2 is the increment. Irreducible for the same reason' },
  'tgtCity0.key': { max: 2, why: 'A-25 Part 2: read 1 is A-19 validating the POOL PLACEMENT ARGUMENT against target.cities — a boolean about the caller\'s key, emitting nothing of the row; read 2 is refileCityKey step 4 recording the re-file answer. Two independent decisions over the RECIPIENT\'S OWN row; nothing of a target City crosses a person boundary' },
};

// ---------------------------------------------------------------------------
// A-25 Part 1 (revision 19, QA R20-1, R20-2) — fixture completeness becomes STRUCTURAL.
//
// A-24 amended the maintenance rule to say the fixture must populate every field, and shipped
// nothing behind the sentence. Round 20 proved the consequence in four steps: a 16th `Stop` field
// written by `makeStop` only when truthy fails `npm run typecheck` at exactly one site
// (`copyStop.test.ts`), a builder clears it there, the suite is green, and the census's fixture
// never carried the field — so R19-5's exact plant on it is invisible all over again.
//
// These four maps are the same compile-time stop `copyStop.test.ts` has had since A-15, applied to
// the census's OWN fixtures: a new field on `Stop`, `Place`, `Trip` or `City` fails
// `npm run typecheck` HERE as well as there, and the key-set test below then stays red until the
// fixture actually carries it. The maximal fixtures get **no `filter`** — `copyStop.test.ts:1300`
// excludes `ticket` because that assertion is about what may CROSS, and this one is about what is
// WATCHED, so nothing is excluded.
// ---------------------------------------------------------------------------

const CENSUS_TRIP_FIELDS: Record<keyof Trip, true> = {
  id: true, title: true, ownerId: true, startDate: true, endDate: true, datePrecision: true,
  homeCurrency: true, homeBase: true, party: true, cities: true, days: true, pool: true,
  places: true, bookings: true, resolutions: true, photos: true, participants: true,
  revision: true, schemaVersion: true, meta: true,
};
const CENSUS_STOP_FIELDS: Record<keyof Stop, true> = {
  id: true, placement: true, name: true, category: true, place: true, note: true, cost: true,
  arrival: true, travelRole: true, bookingId: true, flags: true, provenance: true,
  durationMins: true, links: true, ticket: true,
};
const CENSUS_PLACE_FIELDS: Record<keyof Place, true> = {
  id: true, cityKey: true, name: true, at: true, category: true, note: true, links: true, hours: true,
};
const CENSUS_CITY_FIELDS: Record<keyof City, true> = {
  key: true, name: true, countryCode: true, centre: true, order: true, meta: true,
};

/** Row 14 is deliberately minimal (A-24 Part 2), and its minimality is PINNED rather than assumed:
 *  these are the keys `makeStop` / `addPlace` write only when the init carries them. A new optional
 *  field on `Stop` or `Place` reds the test below until it is either populated in the maximal
 *  fixture or named here — which is the classification, made once, out loud. */
const MINIMAL_STOP_ABSENT: ReadonlyArray<keyof Stop> = ['links', 'ticket'];
const MINIMAL_PLACE_ABSENT: ReadonlyArray<keyof Place> = ['note', 'links', 'hours'];

/** Nulls in a MAXIMAL census fixture, each with the reason it hides nothing. A `null` stops
 *  `censusDeep` dead, so an undeclared one is a subtree the census silently does not measure
 *  (R20-2: `homeBase: null` hid a named home coordinate, and R18-5's hybrid-coordinate shape one
 *  level down was then green by vacancy). Empty today, and empty is the strongest state this list
 *  can be in. */
const DECLARED_NULLS: Record<string, string> = {};

// ---------------------------------------------------------------------------
// Fixtures — the source stop carries every optional field and the source place carries `note`,
// `links` and `hours`, or the recursion has nothing to count and the census is green by vacancy.
//
// **A-24 Part 3 (QA R19-5).** `censusDeep` enumerates `Object.keys` of the fixture INSTANCE, and
// `makeStop` writes `ticket` only when `init.ticket` is truthy — so A-23's printed field list, which
// omitted it, left the censused stop carrying 14 of `Stop`'s 15 fields, and the absent one was the
// field §6.6 classifies as an access credential. A regression emitting
// `...(src.ticket && src.ticket.kind === 'bundled' ? { ticket: src.ticket } : {})` passed 615/615:
// invisible here because the field was absent, and invisible to `copyStop.test.ts` because its
// rule-3 fixture pinned a single kind. `bundled` is chosen because it is the kind that names a file
// shipped inside `apps/web/dist`, which is §6.6's own threshold. Nothing reads the field today, so
// counts are unchanged — but any future regression that TESTS the ticket and then EMITS it reads
// `srcStop.ticket` twice and goes red here.
//
// **A-24 Part 2 (QA R19-4).** *"Every optional field"* is a property of rows 1–13. Row 14 is
// deliberately MINIMAL (`minimalSourceTrip`), because a census that only ever measures a maximal
// document never measures the absent-optional arms.
// ---------------------------------------------------------------------------

const VIENNA: LatLng = { lat: 48.2082, lng: 16.3738 };
const BELVEDERE: LatLng = { lat: 48.1915, lng: 16.3806 };
/** A-25 Part 1: `Trip.homeBase` is a NAMED HOME COORDINATE — a `geoCheck` anchor (§2.13) and
 *  precisely the class `BRIEF.md` calls data that must not leak. It was `null` in every census
 *  fixture, so `censusDeep` stopped at the null and the field the guard most needed to watch was
 *  one of the two it could not see (R20-2). */
const LAX: LatLng = { lat: 33.9416, lng: -118.4085 };

const CTX = (prefix: string): BuildCtx => ({
  ids: sequentialIds(prefix), now: '2026-08-01', actorUserId: 'user:marta',
});

const SRC_CITY = 'src-vienna';
const TGT_CITY = 'tgt-city';

/**
 * A-25 Part 1. The two `Trip` fields A-24's own roots could not see, populated on **all three**
 * `Trip` fixtures. `meta.poolNotes` is KD-20's free-text carrier class and `homeBase.at` is the
 * coordinate §2.13 anchors on, so these are the two `Trip` fields worth watching and not two
 * arbitrary ones.
 */
const HOME_BASE = (): { name: string; at: LatLng } => ({ name: 'Los Angeles', at: { ...LAX } });
const TRIP_META = (cityKey: string) => ({
  poolNotes: { [cityKey]: { title: 'Optional in Vienna', note: 'ordinary prose about the pool' } },
  sourceHash: '0000deadbeef',
});

/** A-25 Part 1. Both documents' `City` rows carry `countryCode` and `meta` — a `City` row is a
 *  census root now (Part 2), and a root whose fixture is partial is the R20-1 gap one record over. */
const CITY_META = { flagEmoji: '\u{1F1E6}\u{1F1F9}', color: '#c8102e' };

function sourceTrip(opts: { link?: PlaceLink; at?: LatLng | null; pool?: boolean } = {}): Trip {
  let t = createTrip(
    {
      id: 'trip-src', title: 'Marta in Vienna', ownerId: 'user:marta',
      startDate: '2026-08-07', endDate: '2026-08-09',
      homeBase: HOME_BASE(), meta: TRIP_META(SRC_CITY),
      cities: [{ key: SRC_CITY, name: 'Vienna', countryCode: 'AT', centre: VIENNA, order: 0, meta: { ...CITY_META } }],
    },
    CTX('src-'),
  );
  t = addPlace(t, {
    id: 'p-src', cityKey: SRC_CITY, name: 'Habyt Vienna',
    at: opts.at === undefined ? BELVEDERE : opts.at,
    category: 'stay',
    note: 'ordinary prose about the entrance',
    links: [{ label: 'Site', href: 'https://example.test/habyt' }],
    hours: { weekly: [{ day: 1, open: '09:00', close: '17:00' }], note: 'closed in winter' },
  });
  return addStop(
    t,
    opts.pool
      ? { kind: 'pool', cityKey: SRC_CITY }
      : { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    {
      id: 's-src', name: 'Check in', category: 'stay',
      place: opts.link ?? { kind: 'place', placeId: 'p-src' },
      // A-25 Part 1, the one judgment inside it: `bookingId` is POPULATED, not declared in
      // `DECLARED_NULLS`. It is a scalar and a null scalar hides no subtree, so a declaration
      // would have been cheaper — but the regression shape this arc keeps meeting is
      // `...(src.x && … ? { x: src.x } : {})`, and against a `null` that expression short-circuits
      // after ONE read and is invisible exactly as `ticket` was. A maximal fixture means values
      // that make the test-then-emit shape MEASURABLE, not merely keys that are present.
      bookingId: 'bk-src',
      note: 'Go early', flags: ['free'], durationMins: 90, travelRole: 'transfer',
      cost: {
        amounts: [{ lo: 10, hi: 20, currency: 'EUR', basis: 'per_person' }],
        display: '€10–20', note: 'tickets at the door',
      },
      arrival: { mode: 'metro', mins: 12, label: 'Bus 8' },
      links: [{ label: 'Menu', href: 'https://example.test/menu' }],
      // A-24 Part 3: the 15th field. §6.6 calls a ticket an access credential and rule 3 says none
      // travels; `bundled` names a file shipped inside `apps/web/dist` — §6.6's own threshold.
      ticket: { kind: 'bundled', path: 'tickets/entry.pdf', label: 'Entry' },
    },
    CTX('src2-'),
  );
}

/**
 * A-24 Part 2, row 14: the same document with **no** optional field populated — `cost === null`,
 * `arrival === null`, `links` absent, `ticket` absent, and a source `Place` with no `note`, no
 * `links` and no `hours`. A-23 populates the fixture maximally so the recursion has something to
 * count; the cost is that it only ever measured a maximal document, and the honest fix is one row
 * that is not maximal rather than a weaker fixture everywhere.
 */
function minimalSourceTrip(): Trip {
  let t = createTrip(
    {
      id: 'trip-src', title: 'Marta in Vienna', ownerId: 'user:marta',
      startDate: '2026-08-07', endDate: '2026-08-09',
      // A-25 Part 1: row 14 is minimal in its STOP and its PLACE, never in its `Trip` — a `Trip`
      // field the fixture omits is invisible to the census on every row this document appears in.
      homeBase: HOME_BASE(), meta: TRIP_META(SRC_CITY),
      cities: [{ key: SRC_CITY, name: 'Vienna', countryCode: 'AT', centre: VIENNA, order: 0, meta: { ...CITY_META } }],
    },
    CTX('min-'),
  );
  t = addPlace(t, { id: 'p-src', cityKey: SRC_CITY, name: 'Habyt Vienna', at: BELVEDERE, category: 'stay' });
  return addStop(
    t,
    { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
    { id: 's-src', name: 'Check in', category: 'stay', place: { kind: 'place', placeId: 'p-src' } },
    CTX('min2-'),
  );
}

/**
 * `cities` (A-25 Part 4, row 15) overrides the single default city with a list — the only row that
 * needs one is the three-same-named-cities tie-break, and every other row keeps the one-city shape
 * rows 1–14 were written against.
 */
function targetTrip(cfg: {
  city?: string;
  cities?: Array<{ key: string; name: string; order: number }>;
  places?: Array<{ name: string; at: LatLng | null }>;
} = {}): Trip {
  let t = createTrip(
    {
      id: 'trip-tgt', title: 'Jacob', ownerId: 'user:jacob',
      startDate: '2026-08-07', endDate: '2026-08-09',
      homeBase: HOME_BASE(), meta: TRIP_META(TGT_CITY),
      cities: (cfg.cities ?? [{ key: TGT_CITY, name: cfg.city ?? 'Vienna', order: 0 }]).map((c) => ({
        key: c.key, name: c.name, countryCode: 'AT', centre: VIENNA, order: c.order,
        meta: { ...CITY_META },
      })),
    },
    CTX('tgt-'),
  );
  for (const [i, p] of (cfg.places ?? []).entries()) {
    t = addPlace(t, {
      id: `p-tgt-${i}`, cityKey: TGT_CITY, name: p.name, at: p.at, category: 'stay',
      // A-25 Part 1: `tgtPlace0…n` are roots (R18-4), so the RECIPIENT's rows are populated as
      // fully as the source's — a root whose fixture is partial is the R20-1 gap one record over.
      note: 'ordinary prose about the target row',
      links: [{ label: 'Site', href: 'https://example.test/tgt' }],
      hours: { weekly: [{ day: 2, open: '10:00', close: '18:00' }], note: 'shorter on Sundays' },
    });
  }
  return t;
}

const SCHEDULED: StopPlacement = { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 0 };

// ---------------------------------------------------------------------------
// The scenario matrix — **fifteen** rows, one per control-flow path through `copyStopInto`
// (A-23, extended by A-24 Part 2 and A-25 Part 4). Rows 1–14 are unchanged in construction and in
// numbering, so `qa/`'s row-by-row cross-check survives. A census only measures what the scenarios
// reach, so the matrix
// is part of the contract, and rows 1–10 are unchanged in construction and in numbering so that
// `qa/`'s cross-check of the two censuses stays a row-by-row comparison.
//
// **Row 5's second cover is WITHDRAWN, not repaired** (A-24 Part 2, QA R19-4). Its A-23 table entry
// claimed *"`samePlace`'s `null` arm, `placeForCopy`'s `at === null`"* and the two are mutually
// exclusive by construction: a same-named target row whose `at` is `null` makes `samePlace` return
// **true** (`aAt === bAt`), so the copy takes the reuse branch and `placeForCopy` is never called.
// Renaming row 5's target row would trade one cover for the other, which is why rows 11–14 are new
// rows rather than an edit.
// ---------------------------------------------------------------------------

type Case = { source: Trip; target: Trip; placement: StopPlacement };

const MATRIX: Array<{ n: number; name: string; build: () => Case }> = [
  {
    n: 1, name: "1 · {kind:'place'} · re-filed · NEW row",
    build: () => ({ source: sourceTrip(), target: targetTrip(), placement: SCHEDULED }),
  },
  {
    n: 2, name: "2 · {kind:'place'} · re-filed · row REUSED",
    build: () => ({
      source: sourceTrip(),
      target: targetTrip({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] }),
      placement: SCHEDULED,
    }),
  },
  {
    n: 3, name: "3 · {kind:'place'} · re-filed · 3 same-name target rows, new row",
    build: () => ({
      source: sourceTrip(),
      target: targetTrip({
        places: [
          { name: 'Habyt Vienna', at: { lat: 40, lng: 40 } },
          { name: 'Habyt Vienna', at: { lat: 41, lng: 41 } },
          { name: 'Habyt Vienna', at: { lat: 42, lng: 42 } },
        ],
      }),
      placement: SCHEDULED,
    }),
  },
  {
    n: 4, name: "4 · {kind:'place'} · A-14 step 3 (target cannot re-file)",
    build: () => ({ source: sourceTrip(), target: targetTrip({ city: 'Prague' }), placement: SCHEDULED }),
  },
  {
    // Covers `samePlace`'s `null` arm AND NOTHING ELSE — see the note above the matrix. Row 11 is
    // the cover this row's A-23 table entry wrongly claimed as its second.
    n: 5, name: "5 · {kind:'place'} · null coordinate, target row also null",
    build: () => ({
      source: sourceTrip({ at: null }),
      target: targetTrip({ places: [{ name: 'Habyt Vienna', at: null }] }),
      placement: SCHEDULED,
    }),
  },
  {
    n: 6, name: "6 · {kind:'place'} · dangling placeId",
    build: () => ({
      source: sourceTrip({ link: { kind: 'place', placeId: 'no-such-place' } }),
      target: targetTrip(), placement: SCHEDULED,
    }),
  },
  {
    n: 7, name: "7 · {kind:'inline'}",
    build: () => ({
      source: sourceTrip({ link: { kind: 'inline', at: { lat: 1, lng: 2 } } }),
      target: targetTrip(), placement: SCHEDULED,
    }),
  },
  {
    n: 8, name: "8 · {kind:'none'}",
    build: () => ({
      source: sourceTrip({ link: { kind: 'none' } }), target: targetTrip(), placement: SCHEDULED,
    }),
  },
  {
    n: 9, name: "9 · {kind:'pool'} placement with a LIVE hint",
    build: () => ({
      source: sourceTrip(), target: targetTrip(),
      placement: { kind: 'pool', cityKey: TGT_CITY, hint: { dayId: '2026-08-08', time: '11:00', order: 0 } },
    }),
  },
  {
    n: 10, name: "10 · {kind:'pool'} placement with TRANSIT_CITY_KEY and a STALE hint",
    build: () => ({
      source: sourceTrip(), target: targetTrip(),
      placement: { kind: 'pool', cityKey: TRANSIT_CITY_KEY, hint: { dayId: '2099-01-01', time: '11:00', order: 0 } },
    }),
  },
  {
    // A-24 Part 2. `placeForCopy`'s `at === null` arm — row 5's withdrawn second cover. **This is
    // the shape of Jacob's own data**: the live planner has exactly one place with no coordinates
    // (Windsor Great Park / Long Walk) and the copy path for it is exactly "no matching row in the
    // target". The row written is `{name:'Habyt Vienna', cityKey:'tgt-city', at:null}`.
    n: 11, name: "11 · {kind:'place'} · null coordinate, NO matching target row",
    build: () => ({ source: sourceTrip({ at: null }), target: targetTrip(), placement: SCHEDULED }),
  },
  {
    // A-24 Part 2. **A-16 step 2** — `source.id === target.id && target.cities.some(…)`, the branch
    // R19-1 subverts and the one §2.14 says Phase 1 exercises ("copying between two of your own
    // trips"). Built by calling the source fixture TWICE: same `Trip.id`, same city key, distinct
    // object graphs — which is A-16's own stated reason for `source.id === target.id` rather than
    // `source === target`. No serializer in the loop.
    n: 12, name: '12 · the SAME document, two distinct objects (A-16 step 2)',
    build: () => ({ source: sourceTrip(), target: sourceTrip(), placement: SCHEDULED }),
  },
  {
    // A-24 Part 2. `findAnywhere`'s second arm. The reference trip carries 31 pool stops, so this
    // is the ordinary shape and not an exotic one.
    n: 13, name: "13 · the source stop is taken from the source's POOL",
    build: () => ({ source: sourceTrip({ pool: true }), target: targetTrip(), placement: SCHEDULED }),
  },
  {
    // A-24 Part 2. The absent-optional arms: `cost === null`, `arrival === null`, `links` absent,
    // `ticket` absent, and a source `Place` with no `note` and no `hours`.
    n: 14, name: '14 · a MINIMAL source stop — the absent-optional arms',
    build: () => ({ source: minimalSourceTrip(), target: targetTrip(), placement: SCHEDULED }),
  },
  {
    // A-25 Part 4 (QA R20-3). `refileCityKey`'s step-4 tie-break run MORE THAN ONCE — the branch
    // R20-3 subverts. Two candidates never reach it (`best === null` short-circuits the first), which
    // is why no row of the 14 could see this. Orders 5 / 3 / 4: the stable answer files the copied
    // `Place` under the order-3 city; with the compared `order` and the recorded `order` being two
    // separate reads, a flipping middle candidate wins the comparison and is filed under the loser —
    // and `validateTrip` reports 0, because a `Place` carries no provenance (A-6). A trip may
    // legitimately hold two cities of one name (A-10), so this is an ordinary document.
    n: 15, name: '15 · three same-named target cities — the step-4 order tie-break',
    build: () => ({
      source: sourceTrip(),
      target: targetTrip({
        cities: [
          { key: TGT_CITY, name: 'Vienna', order: 5 },
          { key: 'tgt-city-b', name: 'Vienna', order: 3 },
          { key: 'tgt-city-c', name: 'Vienna', order: 4 },
        ],
      }),
      placement: SCHEDULED,
    }),
  },
];

/**
 * Runs one scenario with every caller-supplied record censused, and snapshots the counts
 * **immediately after `copyStopInto` returns** and before anything inspects the result, so
 * nothing but the copy is measured.
 *
 * **Nine roots** (A-24 Part 1, A-25 Part 2), named by the path prefix a failure prints: `srcStop`
 * (the source stop, substituted into its day **and into the pool**, because row 13 takes it from
 * there), `srcPlace` (the source's `places` row), `tgtPlace0…n` (the **recipient's** own rows —
 * R18-4 was a multi-read of one of those), `srcCity0…n` and `tgtCity0…n` (A-25 Part 2: a `City`
 * row's `key` is the answer to *where is this crossed `Place` filed* and its `order` is the
 * tie-break), `srcTrip` and `tgtTrip` (every own field of each **except** the six collections),
 * `source`, `placement`, and `ctx` (with `ctx.ids` opaque, because an `IdFactory` is a callable
 * core owns).
 */
function runScenario(build: () => Case): { counts: Counts; threw: unknown } {
  const { source: srcTrip0, target: tgtTrip0, placement } = build();
  const counts: Counts = {};
  const ids = sequentialIds('copy-');
  const opaque = new Set<unknown>([ids]);

  // The row substitution happens FIRST and `censusTrip` wraps the result, so the collections still
  // hand out the already-wrapped `srcStop` / `srcPlace` / `tgtPlaceN` rows and nothing is counted
  // twice.
  const srcSub: Trip = {
    ...srcTrip0,
    days: srcTrip0.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => (s.id === 's-src' ? censusDeep(s, counts, 'srcStop', opaque) : s)),
    })),
    // A-24 Part 2 row 13: the source stop may live in the POOL, so it is substituted there too.
    pool: srcTrip0.pool.map((s) => (s.id === 's-src' ? censusDeep(s, counts, 'srcStop', opaque) : s)),
    places: srcTrip0.places.map((p, i) => censusDeep(p, counts, i === 0 ? 'srcPlace' : `srcPlace${i}`, opaque)),
    // A-25 Part 2 (QA R20-3): a `City` row decides where a crossed `Place` is FILED — `key` is the answer
    // and `order` is the tie-break — so its rows are roots for the same reason `tgtPlace0…n` are.
    cities: srcTrip0.cities.map((c, i) => censusDeep(c, counts, `srcCity${i}`, opaque)),
  };
  const tgtSub: Trip = {
    ...tgtTrip0,
    places: tgtTrip0.places.map((p, i) => censusDeep(p, counts, `tgtPlace${i}`, opaque)),
    cities: tgtTrip0.cities.map((c, i) => censusDeep(c, counts, `tgtCity${i}`, opaque)),
  };
  const srcTrip = censusTrip(srcSub, counts, 'srcTrip', opaque);
  const tgtTrip = censusTrip(tgtSub, counts, 'tgtTrip', opaque);
  // Only the collections are the skeleton: `findAnywhere`, `refileCityKey` and the reuse search
  // legitimately scan `days`, `cities` and `places`. `Trip.id` and `Trip.ownerId` are not skeleton
  // — they cross into `provenance.origin` verbatim (A-24 Part 1). These two entries stop the
  // `source` root from re-wrapping a document `censusTrip` has already wrapped.
  opaque.add(srcTrip);
  opaque.add(tgtTrip);

  const source = censusDeep({ trip: srcTrip, stopId: 's-src' }, counts, 'source', opaque);
  const ctx = censusDeep(
    { ids, today: '2026-08-25', actorUserId: 'user:jacob' }, counts, 'ctx', opaque,
  );
  const placed = censusDeep(placement, counts, 'placement', opaque);

  let threw: unknown = null;
  try {
    copyStopInto(tgtTrip, source, placed, ctx);
  } catch (e) {
    threw = e;
  }
  return { counts: { ...counts }, threw };
}

type Run = { name: string; counts: Counts; threw: unknown };

let cached: Run[] | null = null;
function matrix(): Run[] {
  if (cached === null) {
    cached = MATRIX.map(({ name, build }) => {
      const { counts, threw } = runScenario(build);
      return { name, counts, threw };
    });
  }
  return cached;
}

// ---------------------------------------------------------------------------
// Two assertions, and the second one is not decoration.
// ---------------------------------------------------------------------------

test('A-23: no unnamed multi-read — every field `copyStopInto` reads twice is in ALLOWED and within its max', () => {
  // Every scenario must complete without throwing: a stable-valued document that makes
  // `copyStopInto` throw is a §2.1 violation on its own (R15-2's rule).
  const threw = matrix()
    .filter((r) => r.threw !== null)
    .map((r) => `${r.name}: ${(r.threw as Error)?.message ?? String(r.threw)}`);
  assert.deepEqual(threw, [], 'a scenario threw out of copyStopInto — §2.1: core throws on programmer error, never on what a document contains');

  // Accumulated across the WHOLE matrix, then asserted once, so a builder sees the full set in
  // one run rather than the first offender.
  const offenders: string[] = [];
  for (const { name, counts } of matrix()) {
    for (const [field, count] of Object.entries(counts)) {
      if (count <= 1) continue;
      const allowed = ALLOWED[field];
      if (allowed === undefined || count > allowed.max) offenders.push(`${name}: ${field} ×${count}`);
    }
  }
  assert.deepEqual(
    offenders, [],
    'a field of a caller-supplied value is read more than once and no ruling names it. ' +
    'The value that was checked is then not necessarily the value that crosses — §2.14 A-21. ' +
    'Fix the read, or route an ALLOWED entry to the architect; do not add one here.',
  );
});

test('A-23: no dead allowance — every ALLOWED entry is observed at EXACTLY its max somewhere in the matrix', () => {
  // An exception nobody exercises has stopped being an exception and has become a licence. This
  // is also what turns A-21a's sentence — "a builder who drives that 2 to 1 has changed
  // `placeForCopy`'s contract" — into pinned behaviour rather than prose.
  const observed: Counts = {};
  for (const { counts } of matrix()) {
    for (const [field, count] of Object.entries(counts)) {
      if (field in ALLOWED) observed[field] = Math.max(observed[field] ?? 0, count);
    }
  }
  const dead = Object.entries(ALLOWED)
    .filter(([field, { max }]) => (observed[field] ?? 0) !== max)
    .map(([field, { max }]) => `${field}: allowed ${max}, observed ${observed[field] ?? 0} — ${ALLOWED[field]!.why}`);
  assert.deepEqual(
    dead, [],
    'an ALLOWED entry is never observed at its max: either the exception is dead (delete it — ' +
    'route it) or the matrix stopped reaching the branch that exercises it (add the scenario row).',
  );
});

// ---------------------------------------------------------------------------
// A-25 Part 1 — the third dimension. A census can be wrong in three ways: its ROOTS (what is
// watched — A-24 Part 1, A-25 Part 2), its MATRIX (which branches are reached — a maintenance
// rule, honestly, because "a branch" is a property of the code and no `Record<keyof T, true>`
// reaches it), and its FIXTURES (whether a watched record is populated). The third was pure prose
// until now, and R19-5, R20-1 and R20-2 are all instances of it.
// ---------------------------------------------------------------------------

function keys(o: object): string[] { return Object.keys(o).sort(); }

function without<T extends string>(all: Record<string, true>, absent: ReadonlyArray<T>): string[] {
  return Object.keys(all).filter((k) => !(absent as ReadonlyArray<string>).includes(k)).sort();
}

function nullPaths(v: unknown, path: string, out: string[]): void {
  if (v === null || v === undefined) { out.push(path); return; }
  if (typeof v !== 'object') return;
  const from = v as Record<string, unknown>;
  for (const k of Object.keys(from)) nullPaths(from[k], `${path}.${k}`, out);
}

/** The seven collections are handed back bare by `censusTrip`, so they are not watched and their
 *  nulls are not this test's business — their ROWS are separate roots with their own sweep. */
function tripNullPaths(t: Trip, path: string, out: string[]): void {
  const from = t as unknown as Record<string, unknown>;
  for (const k of Object.keys(from)) {
    if (TRIP_SKELETON.has(k)) continue;
    nullPaths(from[k], `${path}.${k}`, out);
  }
}

const srcStopOf = (t: Trip): Stop =>
  [...t.days.flatMap((d) => d.stops), ...t.pool].find((s) => s.id === 's-src')!;

test('A-25: the census fixtures populate every field of every censused record', () => {
  const src = sourceTrip();
  const tgt = targetTrip({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] });
  const min = minimalSourceTrip();
  assert.deepEqual(keys(src), keys(CENSUS_TRIP_FIELDS), 'srcTrip: a Trip field the fixture omits is invisible to the census (R20-2)');
  assert.deepEqual(keys(tgt), keys(CENSUS_TRIP_FIELDS), 'tgtTrip: as above, on the recipient');
  assert.deepEqual(keys(min), keys(CENSUS_TRIP_FIELDS), 'minimal srcTrip: row 14 is minimal in its STOP and PLACE, never in its Trip');
  assert.deepEqual(keys(srcStopOf(src)), keys(CENSUS_STOP_FIELDS), 'srcStop: this is R19-5 — `ticket` was absent and a kind-gated leak was invisible');
  assert.deepEqual(keys(srcStopOf(sourceTrip({ pool: true }))), keys(CENSUS_STOP_FIELDS), 'srcStop (row 13 takes it from the pool)');
  assert.deepEqual(keys(src.places[0]!), keys(CENSUS_PLACE_FIELDS), 'srcPlace');
  assert.deepEqual(keys(tgt.places[0]!), keys(CENSUS_PLACE_FIELDS), 'tgtPlace0: the RECIPIENT\'s rows are roots too — R18-4');
  assert.deepEqual(keys(src.cities[0]!), keys(CENSUS_CITY_FIELDS), 'srcCity0');
  assert.deepEqual(keys(tgt.cities[0]!), keys(CENSUS_CITY_FIELDS), 'tgtCity0');
  assert.deepEqual(keys(srcStopOf(min)), without(CENSUS_STOP_FIELDS, MINIMAL_STOP_ABSENT), 'minimal stop');
  assert.deepEqual(keys(min.places[0]!), without(CENSUS_PLACE_FIELDS, MINIMAL_PLACE_ABSENT), 'minimal place');
});

test('A-25: every null a maximal census fixture carries is declared', () => {
  const src = sourceTrip();
  const tgt = targetTrip({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] });
  const found: string[] = [];
  tripNullPaths(src, 'srcTrip', found);          // skips TRIP_SKELETON, exactly as `censusTrip` does
  tripNullPaths(tgt, 'tgtTrip', found);
  nullPaths(srcStopOf(src), 'srcStop', found);
  nullPaths(src.places[0], 'srcPlace', found);
  nullPaths(tgt.places[0], 'tgtPlace0', found);
  nullPaths(src.cities[0], 'srcCity0', found);
  nullPaths(tgt.cities[0], 'tgtCity0', found);
  assert.deepEqual(
    found.sort(), Object.keys(DECLARED_NULLS).sort(),
    'a null in a maximal census fixture hides its whole subtree (R20-2: `homeBase: null` hid a named home ' +
    'coordinate). Populate it, or declare it with the reason it hides nothing.',
  );
});
