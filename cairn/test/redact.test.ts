/**
 * ARCHITECTURE §6.6, enforced. Two tests, both in `npm test`, plus the dependency rule that
 * makes the whole class harder to reintroduce.
 *
 * The failure this exists for: `npm run web:build` embedded Jacob's hotel door PIN, a
 * booking confirmation number, two flight references and two live unauthenticated ticket
 * URLs into `apps/web/dist/assets/index-*.js`. Nothing was committed and nothing was
 * deployed — but §7 puts the public share-page host on that same build in Phase 2.
 *
 * Jacob's answer: Europe 2026 stays the demo trip, and credentials never reach a build. So
 * this is a rule with a test, not a scrub of the five strings we happened to find.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

import * as redact from '../tools/redact.mjs';

/**
 * One fixture string per pattern, taken from the real data wherever possible. §6.6: *every
 * pattern is exercised by a fixture string, so a pattern that matches nothing is itself a
 * failure* — the `closed`-rule lesson applied to redaction.
 */
const FIXTURES: Record<string, string> = {
  url: 'Ticket: https://www.ulaznice.hr/web/confirmFromMailGuest/fcvbimxq — opens with no login.',
  email: 'Forward it to jacobseemann1@gmail.com and it lands in the right inbox.',
  keyword_token: 'Door code is PIN 0754 — keypad by the lift, PIN BGXw for the street door.',
  keyword_digits: 'FlixBus, Booking 338 441 5948, seat 9C, platform 5.',
  long_digits: 'Vienna hotel confirmation 5814731574 for two nights.',
  alnum_reference: 'Ryanair references IU1TUY and I54C9A; the reissued Smartwings one is YZGDTS.',
};

/** Prose that is not a credential and MUST survive — §6.6's "what it does not cover". */
const MUST_SURVIVE = [
  "Morning with your girlfriend's family",
  'Blue Cave, Hvar & the 5-island speedboat run',
  'No booking needed — walk up.',
  'Booking recommended in summer.',
  'Vyšehrad, Széchenyi, Jiráskovo náměstí',
  'Schönbrunn gardens & Gloriette',
];

test('every redaction pattern is exercised by a fixture string', () => {
  const unexercised = redact.REDACTION_PATTERNS.filter((p) => {
    const fixture = FIXTURES[p.id];
    if (fixture === undefined) return true;
    return !new RegExp(p.re.source, p.re.flags).test(fixture);
  }).map((p) => p.id);
  assert.deepEqual(unexercised, [], 'a pattern that catches nothing is a failure, not coverage');

  // And the fixture list has no entries for patterns that no longer exist.
  const ids = new Set(redact.REDACTION_PATTERNS.map((p) => p.id));
  assert.deepEqual(Object.keys(FIXTURES).filter((k) => !ids.has(k)), []);
});

test('every fixture string is fully redacted — no pattern still matches afterwards', () => {
  for (const [id, fixture] of Object.entries(FIXTURES)) {
    const after = redact.redactText(fixture);
    assert.deepEqual(redact.redactionHits(after), [], `${id}: "${after}"`);
    assert.notEqual(after, fixture, `${id}: nothing was redacted`);
  }
});

test('the five known leaks are gone from a redacted string', () => {
  const sentence =
    'Hotel PIN 0754, conf 5814731574, Ryanair IU1TUY, Smartwings YZGDTS, ticket ' +
    'https://www.cityairporttrain.com/en/account/order/9zusk and ' +
    'https://www.ulaznice.hr/web/confirmFromMailGuest/fcvbimxq';
  const after = redact.redactText(sentence);
  for (const leak of redact.KNOWN_LEAKS) {
    assert.equal(after.includes(leak), false, `"${leak}" survived redaction`);
  }
});

test('ordinary prose is not redacted — a sample nobody can read is not a sample', () => {
  for (const s of MUST_SURVIVE) {
    assert.equal(redact.redactText(s), s, `redaction damaged "${s}"`);
  }
});

test('a reference inside a URL inside a sentence is redacted, once', () => {
  const s = 'Show the driver https://ticket.example.com/order/YZGDTS?seat=9C when you board.';
  const after = redact.redactText(s);
  assert.equal(after.includes('YZGDTS'), false);
  assert.deepEqual(redact.redactionHits(after), []);
  assert.match(after, /^Show the driver \[redacted\] when you board\.$/);
});

test('redactForSample output contains no match for any pattern, walked recursively', () => {
  const out = redact.redactForSample(sampleSource());
  const offenders: string[] = [];
  for (const s of redact.allStrings(out)) {
    const hits = redact.redactionHits(s);
    if (hits.length) offenders.push(`${hits.join(',')}: ${s.slice(0, 90)}`);
  }
  assert.deepEqual(offenders.slice(0, 12), [], `${offenders.length} strings still match`);
});

test('redactForSample drops the things that are credentials by construction', () => {
  const trip = sampleSource() as {
    days: Array<{ stops: Array<{ ticket?: unknown; flags: string[]; links?: Array<{ href: string }> }> }>;
    bookings: Array<{ reference: string | null; seat?: string; ticket: unknown }>;
  };
  const before = trip.days.flatMap((d) => d.stops).filter((s) => s.ticket).length;
  assert.ok(before > 0, 'the source trip must carry tickets or this proves nothing');
  assert.ok(trip.bookings.some((b) => b.reference), 'the source trip must carry references');

  const out = redact.redactForSample(trip);
  const stops = out.days.flatMap((d) => d.stops);
  assert.deepEqual(stops.filter((s) => s.ticket).map((s) => s.ticket), [], 'a Ticket travelled');
  assert.equal(
    stops.filter((s) => s.flags.includes('ticketed')).length,
    before,
    'the badge must still demonstrate — §6.6 keeps flags += ticketed',
  );
  for (const s of stops) for (const l of s.links ?? []) assert.equal(l.href, '', 'a link href survived');
  for (const b of out.bookings) {
    assert.equal(b.reference, null);
    assert.equal(b.seat ?? null, null);
    assert.equal(b.ticket, null);
  }
  // The superseded_booking demo survives on operator + dates.
  assert.ok(out.bookings.some((b) => b.reference === null), 'bookings must still exist');
});

/**
 * **P12** — ARCHITECTURE §10.5, and A-57 Part 6's `tools/redact.mjs` row.
 *
 * *"`Trip.photos` → `[]` in `redactForSample`. The build artifact ships no photo, no caption, no
 * coordinate and no timestamp. This lands **before** the reference trip has a photo, which is the
 * only moment it is free, and it fails closed thereafter."*
 *
 * The fixture therefore plants a photo the reference trip does not have, with all three of the
 * things that may not ship: a captioned, placed, dated asset. A rule that only ever runs over
 * data with nothing in it is a rule nobody has tested.
 */
test('P12: redactForSample emits photos: [] — no caption, no coordinate, no timestamp', () => {
  const trip = sampleSource() as Record<string, unknown>;
  const planted = {
    ...trip,
    photos: [
      {
        id: 'photo-1',
        attach: { kind: 'trip' },
        caption: 'Door code is PIN 0754 — the courtyard gate',
        capturedAt: { date: '2026-08-13', time: '18:40' },
        // An INVENTED coordinate, never one transcribed from the live planner (KD-27's rule):
        // a real city's centre also appears legitimately elsewhere in the sample, so a grep for
        // it would be green for the wrong reason.
        at: { lat: 12.3456, lng: -65.4321 },
        metaSource: 'exif',
        source: { w: 4032, h: 3024 },
        thumb: { w: 320, h: 240, bytes: 18000 },
        display: { w: 1600, h: 1200, bytes: 240000 },
        provenance: {
          source: 'user', state: 'accepted', confidence: 'confirmed',
          addedAt: '2026-08-13', acceptedAt: '2026-08-13', actorUserId: 'local:self',
        },
      },
    ],
  };
  const out = redact.redactForSample(planted) as { photos: unknown[] };
  assert.deepEqual(out.photos, [], 'a photo reached the sample');

  // The §6.6 recursive string walk finds nothing of it. Asserted on the WHOLE output rather
  // than on `photos` alone: a field dropped from one place and copied into another is exactly
  // the shape this walk exists to catch.
  const text = JSON.stringify(out);
  assert.equal(text.includes('the courtyard'), false, 'the caption survived somewhere else');
  assert.equal(text.includes('PIN 0754'), false);
  assert.equal(text.includes('-65.4321'), false, 'a coordinate from a photo reached the sample');
  assert.equal(text.includes('12.3456'), false);
  // The capture TIME is asserted structurally rather than by value: `HH:MM` strings are all
  // over a legitimate itinerary, so a grep for one would be green for the wrong reason. What
  // must not appear is the FIELD — and with it every other key only a `PhotoAsset` has.
  // (`"display"` is deliberately NOT in this list: `CostEstimate.display` is a legitimate,
  // unrelated field of every priced stop, and asserting on it would fail for the wrong reason.)
  for (const key of ['"capturedAt"', '"metaSource"', '"thumb"', '"attach"']) {
    assert.equal(text.includes(key), false, `${key} reached the sample`);
  }
  for (const s of redact.allStrings(out)) assert.deepEqual(redact.redactionHits(s), [], s.slice(0, 90));
});

test('P12: the rule fails CLOSED — a trip with no photos still emits the field as []', () => {
  const out = redact.redactForSample(sampleSource()) as { photos: unknown[] };
  assert.deepEqual(out.photos, []);
});

test('importLegacyDays output is UNCHANGED by redaction — parity is untouched', async () => {
  const { loadEurope2026 } = (await import('../fixtures/loadEurope2026.mjs')) as {
    loadEurope2026: () => { trip: unknown };
  };
  const { toJSON } = await import('../packages/core/src/index.ts');
  const a = loadEurope2026().trip;
  const before = toJSON(a as never);
  redact.redactForSample(a);
  assert.equal(toJSON(a as never), before, 'redaction mutated the imported trip');
  assert.ok(before.includes('YZGDTS'), 'the CLI and the goldens must still see the real trip');
});

// ---------------------------------------------------------------------------
// §6.6 enforcement clause 2, as a RULE rather than a scrub (QA R2-4).
//
// The old check grepped `apps/web/dist` for six hardcoded literals and never applied
// `redactionHits` at all, so a seventh credential simply was not looked for — and a
// seventh had crept in: a real FlixBus booking reference written as the example in a
// source comment, shipped through the sourcemap's `sourcesContent`.
//
// The rule instead DERIVES the credential set: run the redactor over the *unredacted*
// trip, keep every token it removes, and assert none of them appears in any emitted
// asset. That set grows with the data. Applying `REDACTION_PATTERNS` to a minified
// bundle directly is not implementable — minified JS is wall-to-wall short uppercase
// identifiers and long digit runs — which is why the patterns are applied to the DATA
// and the resulting tokens are what the bundle is grepped for. BUILD-NOTES KD-27.
// ---------------------------------------------------------------------------

/**
 * Every credential-shaped token the redactor removes from the real trip. Pure.
 *
 * Tokens shorter than six characters are dropped: below that they are not distinguishable
 * from ordinary text and a `.js.map` will contain every one of them by chance.
 */
function credentialTokens(trip: unknown): Set<string> {
  const out = new Set<string>();
  for (const s of redact.allStrings(trip)) {
    for (const p of redact.REDACTION_PATTERNS) {
      for (const m of s.matchAll(new RegExp(p.re.source, p.re.flags))) {
        const tok = m[0].trim();
        if (tok.length >= 6) out.add(tok);
      }
    }
  }
  return out;
}

/**
 * Tokens the derivation picks up that are demonstrably not credentials, each with the
 * claim a reviewer can check. Kept to the two the over-broad all-caps pattern produces —
 * §6.6 accepts that cost explicitly (KD-17), and the alternative is a second pattern class.
 *
 * Both entries are asserted live below: an entry the derivation no longer produces is a
 * dead line and fails, the same discipline the pattern fixtures are held to.
 */
const NOT_CREDENTIALS: Record<string, string> = {
  OPTIONAL: 'an English word in Jacob\'s own day note ("still in the Budapest OPTIONAL list"), ' +
    'caught by the deliberately digit-free all-caps pattern (KD-17). In the bundle it is ' +
    '`LegacyConstants.OPTIONAL`, a property name of the importer\'s input type.',
  BOOKINGS: 'part of the repo path `docs/BOOKINGS.md`, carried on the dropped `sourceDoc` ' +
    'provenance field. In the bundle it is a doc comment naming that file.',
};

/** Every emitted build asset, or `null` when there is no build to check. */
function distAssets(): Array<[string, string]> | null {
  const dist = resolve(CAIRN, 'apps/web/dist');
  if (!existsSync(dist)) return null;
  const files: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, n.name);
      if (n.isDirectory()) walk(full);
      // `.map` is included on purpose: a sourcemap embeds `sourcesContent`, so a booking
      // reference sitting in a SOURCE COMMENT ships in the artifact just as surely as one
      // in the data. That is exactly how the seventh leak got in.
      else if (/\.(js|css|html|json|map)$/.test(n.name)) files.push(full);
    }
  };
  walk(dist);
  return files.map((f) => [f, readFileSync(f, 'utf8')] as [string, string]);
}

/** Every derived credential token that appears verbatim in `text`. Pure. */
function leaksIn(text: string, tokens: Iterable<string>): string[] {
  const out: string[] = [];
  for (const tok of tokens) {
    if (tok in NOT_CREDENTIALS) continue;
    if (text.includes(tok)) out.push(tok);
  }
  return out;
}

test('the credential set is derived from the data, and every token in it really is a redaction hit', () => {
  const tokens = credentialTokens(sampleSource());
  assert.ok(
    tokens.size > redact.KNOWN_LEAKS.length,
    `the derived set is ${tokens.size} tokens against ${redact.KNOWN_LEAKS.length} hardcoded ` +
      'literals — if it is not bigger, the rule has degenerated back into the scrub it replaced',
  );
  // §6.6 clause 2 requires `redactionHits` to be the thing that decides, and this is where
  // it decides: a token only enters the set because a pattern claims it, and every token is
  // re-checked against the pattern array.
  const notHits = [...tokens].filter((t) => redact.redactionHits(t).length === 0);
  assert.deepEqual(notHits, [], 'a token in the credential set is not matched by any pattern');
});

test('the NOT_CREDENTIALS exceptions are live, justified and are not known leaks', () => {
  const tokens = credentialTokens(sampleSource());
  const dead = Object.keys(NOT_CREDENTIALS).filter((t) => !tokens.has(t));
  assert.deepEqual(dead, [], 'an exception the derivation no longer produces — delete the line');
  for (const [tok, why] of Object.entries(NOT_CREDENTIALS)) {
    assert.ok(why.length > 40, `${tok} has no justification`);
    assert.equal(
      redact.KNOWN_LEAKS.some((l) => l.includes(tok)),
      false,
      `${tok} is on the known-leak list; it cannot also be excused`,
    );
  }
});

test('the derived rule catches a credential the six-literal grep would have missed', () => {
  // Red-green, in one test. Pick a token the redactor removes from the real trip that is
  // NOT one of the hardcoded literals, plant it in a synthetic asset, and check both rules.
  const tokens = [...credentialTokens(sampleSource())].filter(
    (t) => !(t in NOT_CREDENTIALS) && !redact.KNOWN_LEAKS.some((l) => l.includes(t) || t.includes(l)),
  );
  assert.ok(tokens.length > 0, 'no token outside the hardcoded list — the rule proves nothing');
  const planted = tokens[0];
  const asset = `/*! built asset */\nconst n="ref ${planted}";export{n};\n`;

  assert.deepEqual(
    redact.KNOWN_LEAKS.filter((l) => asset.includes(l)),
    [],
    'the OLD six-literal grep was supposed to miss this; pick a different planted token',
  );
  assert.deepEqual(
    leaksIn(asset, credentialTokens(sampleSource())),
    [planted],
    'the derived rule failed to catch a planted credential',
  );
});

test('the built bundle carries no token the redactor removes from the real trip', () => {
  const assets = distAssets();
  if (assets === null) {
    // The criterion is conditional on the artifact existing; say so rather than passing quietly.
    assert.ok(true, 'apps/web/dist is absent — run `npm run web:build` to exercise this');
    return;
  }
  assert.ok(assets.length > 0, 'no assets found in apps/web/dist');
  const tokens = credentialTokens(sampleSource());

  const offenders: string[] = [];
  for (const [f, text] of assets) {
    for (const leak of leaksIn(text, tokens)) offenders.push(`${f.replace(`${CAIRN}/`, '')}: ${leak}`);
    // The literal list stays as a floor. It is not the rule any more, but a regression on
    // one of the six that the derivation somehow stopped producing must still be loud.
    for (const leak of redact.KNOWN_LEAKS) if (text.includes(leak)) offenders.push(`${f}: ${leak}`);
  }
  assert.deepEqual(offenders, [], 'the build artifact carries a credential');
});

test('nothing under apps/ imports tools/extract-legacy.mjs — trip data reaches a bundle one way only', () => {
  const offenders: string[] = [];
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const n of readdirSync(d, { withFileTypes: true })) {
      if (n.name === 'node_modules' || n.name === 'dist') continue;
      const full = join(d, n.name);
      if (n.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mts|mjs|js)$/.test(n.name)) {
        const src = readFileSync(full, 'utf8');
        if (/extract-legacy|loadEurope2026|europe-2026-itinerary/.test(src)) offenders.push(full);
      }
    }
  };
  walk(resolve(CAIRN, 'apps'));
  assert.deepEqual(offenders, [],
    'apps/ may import trip data only from the generated, redacted sample file (§6.6)');
});

// ---------------------------------------------------------------------------

/** The real trip, unredacted — the only honest input for these tests. */
function sampleSource(): unknown {
  const cached = (globalThis as { __cairnSample?: unknown }).__cairnSample;
  if (cached) return cached;
  throw new Error('sampleSource: not loaded');
}

// Loaded once, at module scope, because `node --test` has no beforeAll across files.
{
  const { loadEurope2026 } = (await import('../fixtures/loadEurope2026.mjs')) as {
    loadEurope2026: () => { trip: unknown };
  };
  (globalThis as { __cairnSample?: unknown }).__cairnSample = loadEurope2026().trip;
}
