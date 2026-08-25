/**
 * `redactForSample` — what may not reach a build artifact (ARCHITECTURE §6.6).
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

/**
 * The pattern array. **One place, exported, and every pattern is exercised by a fixture
 * string in `tools/redact.test.ts`** — a pattern that catches nothing is itself a failure.
 * That is the `closed`-rule lesson applied to redaction: a rule with no reachable input
 * reads as coverage and is not.
 *
 * Ordering matters: URLs and emails are consumed before the bare-token patterns, so a
 * reference inside a URL inside a sentence is redacted once as a URL rather than shredded.
 */
/**
 * The keyword alternation, spelled letter-by-letter so it is case-insensitive WITHOUT the
 * `i` flag. That matters: `i` would also make `[A-Z0-9]` match lowercase, which silently
 * turned "the booking is done" into a match on "is".
 */
const KEYWORD = ['pin', 'code', 'conf', 'confirmation', 'ref', 'reference', 'order', 'booking', 'seat']
  .map((w) => [...w].map((c) => `[${c.toUpperCase()}${c}]`).join(''))
  .join('|');

export const REDACTION_PATTERNS = [
  {
    id: 'url',
    why: 'A ticket URL is an access credential — ulaznice.hr and cityairporttrain.com both open with no login.',
    re: /https?:\/\/[^\s"'<>)\]]+/gi,
  },
  {
    id: 'email',
    why: 'A mailbox address is a login identifier and a spam target.',
    re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi,
  },
  {
    id: 'keyword_token',
    why: 'A keyword followed by one credential-shaped token: "PIN 0754", "PIN BGXw", "ref D8WQHO", "seat 9C".',
    // "Credential-shaped" means the token carries an uppercase letter or a digit. That is
    // what keeps this off ordinary prose — "booking recommended" and "the booking is done"
    // are left alone, "PIN BGXw" is not — without needing a digit, which would have let an
    // alphabetic door code straight through.
    // The separator excludes a bare hyphen on purpose: `booking-16` is a structural id.
    re: new RegExp(`\\b(?:${KEYWORD})\\b[\\s:#]+(?=[A-Za-z0-9]*[A-Z0-9])[A-Za-z0-9]{2,}`, 'g'),
  },
  {
    id: 'keyword_digits',
    why: 'A keyword followed by a spaced digit run: "Booking 338 441 5948".',
    re: new RegExp(`\\b(?:${KEYWORD})\\b[\\s:#]+(?=[A-Za-z0-9 -]{0,20}\\d)[A-Za-z0-9][A-Za-z0-9 -]{0,20}[A-Za-z0-9]`, 'g'),
  },
  {
    id: 'long_digits',
    why: 'Any run of 6+ digits, with optional spacing: "338 441 5948", "5814731574".',
    re: /\b\d[\d ]{4,}\d\b/g,
  },
  {
    id: 'alnum_reference',
    // §6.6 words this as "containing both letters and digits" and then gives YZGDTS as an
    // example, which contains no digits. The examples win: a 6-character all-caps booking
    // reference is exactly the shape being protected, and requiring a digit would have let
    // YZGDTS — one of the five strings the review found in the bundle — straight through.
    // The cost is that a 6+ letter ALL-CAPS word in prose is redacted too; on the reference
    // trip that is 0 strings, asserted in `tools/redact.test.ts`.
    why: 'A 6+ character all-caps alphanumeric token: YZGDTS, IU1TUY, D8WQHO, 3379864687.',
    re: /\b[A-Z0-9]{6,}\b/g,
  },
];

export const REDACTED = '[redacted]';

/** Applies every pattern to one string. Pure. */
export function redactText(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  let out = text;
  for (const p of REDACTION_PATTERNS) out = out.replace(new RegExp(p.re.source, p.re.flags), REDACTED);
  return out;
}

/** Every pattern that still matches somewhere in `text`. Pure. Used by the tests. */
export function redactionHits(text) {
  if (typeof text !== 'string') return [];
  return REDACTION_PATTERNS.filter((p) => new RegExp(p.re.source, p.re.flags).test(text)).map((p) => p.id);
}

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
