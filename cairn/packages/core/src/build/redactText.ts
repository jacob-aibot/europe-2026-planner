/**
 * `redactText` — the one pattern set for "does this string carry a credential" (ARCHITECTURE
 * §6.6). Shared by two callers that both need it for the same reason: `tools/redact.mjs`
 * applies it to the whole sample document before a build, and `copyStopInto` (§2.14 rule 5)
 * applies it to a copied stop's `note` — free text was the leak `copyStopInto` shipped with:
 * rule 3 drops `bookingId` and refuses to let a `Ticket` travel because a booking reference
 * and a ticket URL are credentials, and then rule 5 handed the same class of credential
 * across the trip boundary as prose. One pattern set, two call sites, so the definition of
 * "credential-shaped" cannot drift between them.
 *
 * WHAT IT DOES NOT COVER, deliberately: personal prose. *"Morning with your girlfriend's
 * family"* is not a credential and is not touched.
 *
 * This module is now part of `packages/core`, which `apps/web` bundles — so unlike
 * `tools/redact.mjs` (a build-time-only script), anything written here as a runtime string
 * literal ships to the browser. The `why` explanation for each pattern is therefore a
 * comment, not a field on the pattern object: a rationale string with a real credential
 * example in it is itself exactly the kind of leak this file exists to prevent. KD-21 is the
 * record of that mistake, found in this same pass, before anything was pushed.
 *
 * BUILD-NOTES §1, KD-17 (why the reference pattern does not require a digit), KD-18 (the
 * three source comments that were shipping references), KD-20 (moved here from
 * `tools/redact.mjs` so `copyStopInto` could use it on `note`), KD-21 (the `why` field itself
 * shipping example credentials once this module was reachable from `apps/web`).
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
  // A ticket URL is an access credential — a vendor confirmation link opens with no login.
  { id: 'url', re: /https?:\/\/[^\s"'<>)\]]+/gi },
  // A mailbox address is a login identifier and a spam target.
  { id: 'email', re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi },
  {
    id: 'keyword_token',
    // A keyword followed by one credential-shaped token, e.g. "PIN <code>" or "ref <code>".
    // "Credential-shaped" means the token carries an uppercase letter or a digit — that is
    // what keeps this off ordinary prose ("the booking is done" is untouched) without
    // requiring a digit, which would let a purely alphabetic door code through.
    // The separator excludes a bare hyphen on purpose: `booking-16` is a structural id.
    re: new RegExp(`\\b(?:${KEYWORD})\\b[\\s:#]+(?=[A-Za-z0-9]*[A-Z0-9])[A-Za-z0-9]{2,}`, 'g'),
  },
  {
    id: 'keyword_digits',
    // A keyword followed by a spaced digit run, e.g. "Booking 000 000 0000". The example
    // used to be a real FlixBus reference of Jacob's, which a sourcemap then shipped into
    // `apps/web/dist` — BUILD-NOTES KD-27.
    re: new RegExp(`\\b(?:${KEYWORD})\\b[\\s:#]+(?=[A-Za-z0-9 -]{0,20}\\d)[A-Za-z0-9][A-Za-z0-9 -]{0,20}[A-Za-z0-9]`, 'g'),
  },
  // Any run of 6+ digits, with optional spacing — a booking or hotel confirmation number.
  { id: 'long_digits', re: /\b\d[\d ]{4,}\d\b/g },
  {
    id: 'alnum_reference',
    // A 6+ character all-caps alphanumeric token. §6.6 words this as "containing both
    // letters and digits", but the reference case that motivated it was six letters with no
    // digit at all — the examples win: a 6-character all-caps booking reference is exactly
    // the shape being protected, and requiring a digit would let that case straight through.
    // The cost is that a 6+ letter ALL-CAPS word in prose is redacted too; on the reference
    // trip that is 0 strings, asserted in `tools/redact.test.ts`.
    re: /\b[A-Z0-9]{6,}\b/g,
  },
] as const;

export const REDACTED = '[redacted]';

/** Applies every pattern to one string. Pure. */
export function redactText(text: unknown): unknown {
  if (typeof text !== 'string' || text.length === 0) return text;
  let out = text;
  for (const p of REDACTION_PATTERNS) out = out.replace(new RegExp(p.re.source, p.re.flags), REDACTED);
  return out;
}

/** Every pattern that still matches somewhere in `text`. Pure. Used by the tests. */
export function redactionHits(text: unknown): string[] {
  if (typeof text !== 'string') return [];
  return REDACTION_PATTERNS.filter((p) => new RegExp(p.re.source, p.re.flags).test(text)).map((p) => p.id);
}
