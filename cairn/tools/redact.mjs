/**
 * `redactForSample` — what may not reach a build artifact (ARCHITECTURE §6.6).
 *
 * The pattern set itself (`REDACTION_PATTERNS`, `redactText`, `redactionHits`) lives in
 * `packages/core/src/build/redactText.ts` and is re-exported here, not redefined — it is
 * also used by `copyStopInto` on a stop's `note` (BUILD-NOTES §1, KD-20). One definition of
 * "credential-shaped" for both the build artifact and the trip-to-trip copy boundary.
 *
 * `npm run web:build` embedded Jacob's hotel door PIN (`PIN 0754`), booking confirmation
 * `5814731574`, flight references `YZGDTS` and `IU1TUY`, and two live unauthenticated
 * ticket URLs in `apps/web/dist/assets/index-*.js`. Nothing was committed and nothing was
 * deployed, so there was no exposure — but §7 puts the public share-page host on that same
 * build in Phase 2.
 *
 * Jacob's answer: **Europe 2026 stays the demo trip, and credentials never reach a build.**
 * So this is a rule, applied by a function, covered by a test — not a scrub of the five
 * strings we happen to have found.
 *
 * WHERE IT RUNS: `tools/gen-sample.mjs`, between `importLegacyDays` and the JSON write. It
 * never runs inside `packages/core`, and `importLegacyDays` output is UNCHANGED — the CLI,
 * the tests and every golden keep reading the real trip, so cost and leg parity are
 * untouched. Redaction is a property of the build artifact, not of the model.
 *
 * WHAT IT DOES NOT COVER, deliberately: personal prose. *"Morning with your girlfriend's
 * family"* is not a credential. The consequence, stated so nobody is surprised by it: the
 * shipped sample remains recognisably Jacob's trip. That is fine while the build is his own
 * laptop and the Phase 2 share host serves HIS trips. The day the build serves a public
 * marketing page, the sample must be an invented trip — a Phase 2 exit condition, not a
 * Phase 1 one.
 *
 * Pure: `redactForSample` returns a new document and mutates nothing.
 *
 * BUILD-NOTES §1, KD-17 (why the reference pattern does not require a digit) and KD-18
 * (the three source comments that were shipping references, and the dropped `sourceDoc`).
 */

import { REDACTION_PATTERNS, REDACTED, redactText, redactionHits } from '../packages/core/src/index.ts';

export { REDACTION_PATTERNS, REDACTED, redactText, redactionHits };

/** Walks any JSON-ish value and collects every string. Pure. */
export function allStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) allStrings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) allStrings(v, out);
  return out;
}

/**
 * Keys whose values are structural — ids, enums, dates, currencies, coordinates, the
 * `sourceDoc` provenance path. They are not free text, they are not credentials, and
 * redacting them would break the document rather than protect anything.
 *
 * Everything NOT in this set is treated as free text and passed through `redactText`. That
 * direction matters: a field added later is redacted by default rather than leaking by
 * default, which is the same reasoning as the access predicates failing closed.
 */
export const STRUCTURAL_KEYS = new Set([
  'id', 'tripId', 'bookingId', 'placeId', 'stopId', 'dayId', 'conflictId',
  'sourceTripId', 'sourceStopId', 'friendUserId', 'mailAccountId', 'messageId', 'ruleId',
  'ownerId', 'actorUserId', 'by', 'cityKey', 'key', 'kind', 'state', 'source', 'confidence',
  'category', 'mode', 'travelRole', 'basis', 'currency', 'homeCurrency', 'countryCode',
  'status', 'severity', 'level', 'code', 'primaryCity', 'cities', 'flags', 'schemaVersion',
  'date', 'startDate', 'endDate', 'addedAt', 'acceptedAt', 'retiredAt', 'verifiedAt',
  'verifiedBy', 'at', 'time', 'order', 'lat', 'lng',
]);

/**
 * Redacts every string in a document except under a structural key. Pure.
 *
 * This is the belt to `redactForSample`'s braces: the field-by-field rules below drop the
 * things that are credentials by construction (tickets, references, hrefs), and this pass
 * catches the credential-shaped token that someone typed into a note, a booking comment or
 * a field nobody thought about.
 */
export function redactStringsDeep(value, key) {
  if (typeof value === 'string') return STRUCTURAL_KEYS.has(key) ? value : redactText(value);
  if (Array.isArray(value)) return value.map((v) => redactStringsDeep(v, key));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactStringsDeep(v, k);
    return out;
  }
  return value;
}

const redactStop = (s) => ({
  ...s,
  name: redactText(s.name),
  note: redactText(s.note),
  // A ticket is an access credential in all three kinds: a `url` opens with no login, an
  // `attachment` names a mailbox message, and a `bundled` path points at `tickets/`, which
  // is not deployed and would 404. The badge still demonstrates via the flag.
  ...(s.ticket ? { ticket: null, flags: [...new Set([...(s.flags ?? []), 'ticketed'])] } : {}),
  // Links keep their label and lose their href.
  ...(s.links ? { links: s.links.map((l) => ({ ...l, href: '' })) } : {}),
  ...(s.cost ? { cost: { ...s.cost, display: redactText(s.cost.display), note: redactText(s.cost.note) } } : {}),
});

/**
 * Redacts a `Trip` for the shipped sample. Pure — returns a new document.
 *
 * @param {object} trip a Cairn `Trip`
 * @returns {object} a `Trip` whose strings match no pattern in `REDACTION_PATTERNS`
 */
export function redactForSample(trip) {
  const dropUndefined = (o) => JSON.parse(JSON.stringify(o));
  return redactStringsDeep(dropUndefined({
    ...trip,
    title: redactText(trip.title),
    days: trip.days.map((d) => ({
      ...d,
      title: redactText(d.title),
      subtitle: redactText(d.subtitle),
      stops: d.stops.map(redactStop),
    })),
    pool: trip.pool.map(redactStop),
    places: trip.places.map((p) => ({
      ...p,
      name: redactText(p.name),
      ...(p.note !== undefined ? { note: redactText(p.note) } : {}),
      ...(p.links ? { links: p.links.map((l) => ({ ...l, href: '' })) } : {}),
    })),
    bookings: trip.bookings.map((b) => ({
      ...b,
      // The `superseded_booking` demo survives on operator + dates, which is the point:
      // the rule is still demonstrable without the reference that makes it a credential.
      reference: null,
      ticket: null,
      // `seat` is optional in the model, so remove the key rather than nulling it.
      ...(b.seat !== undefined ? { seat: undefined } : {}),
      operator: redactText(b.operator),
      // `sourceDoc` points at `docs/BOOKINGS.md`, which is not deployed. It is a provenance
      // breadcrumb for the import, not something a sample needs, and keeping it would mean
      // exempting a key from the "no string matches any pattern" check.
      sourceDoc: undefined,
      ...(b.route ? { route: { fromName: redactText(b.route.fromName), toName: redactText(b.route.toName) } } : {}),
    })),
    ...(trip.meta ? { meta: trip.meta } : {}),
  }));
}

/**
 * The five literal strings the review found in `apps/web/dist/assets/index-*.js`. Kept
 * separately from the patterns so the bundle check can assert BOTH: the general rule and
 * the specific known leaks.
 */
export const KNOWN_LEAKS = [
  'PIN 0754',
  '5814731574',
  'YZGDTS',
  'IU1TUY',
  'cityairporttrain.com/en/account/order/',
  'ulaznice.hr/web/confirmFromMailGuest/',
];
