/**
 * `normalizeCityName` (ARCHITECTURE §2.2 A-10, hoisted into `model/` by A-14).
 *
 * A `CityKey` is a minted opaque id, so the only thing two trips can compare a city by is
 * its display name. This is that comparison, in one place: NFC, whitespace collapsed,
 * trimmed, lowercased. It is deliberately NOT exported from `packages/core/src/index.ts`
 * (§2.10 is 73 runtime symbols since Phase 2 I-5) — it is an internal shared by `build/` and `derive/`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeCityName } from '../src/model/cityName.ts';

const COMPOSED = 'Zürich';        // ü as one code point
const DECOMPOSED = 'Zürich';     // u + combining diaeresis

test('case, surrounding whitespace and internal runs of whitespace all collapse', () => {
  assert.equal(normalizeCityName('Vienna'), 'vienna');
  assert.equal(normalizeCityName('  VIENNA  '), 'vienna');
  assert.equal(normalizeCityName('New\t \nYork  City'), 'new york city');
  assert.equal(normalizeCityName('Ho Chi Minh  City'), 'ho chi minh city');
});

test('NFC: two composition forms of the same name compare equal', () => {
  assert.notEqual(COMPOSED, DECOMPOSED, 'the fixture is not actually two forms');
  assert.equal(normalizeCityName(COMPOSED), normalizeCityName(DECOMPOSED));
  assert.equal(normalizeCityName(' SPLIT '), normalizeCityName('split'));
});

test('non-Latin names survive: nothing is stripped, only folded', () => {
  assert.equal(normalizeCityName(' 東京 '), '東京');
  assert.equal(normalizeCityName('Dubrovnik'), 'dubrovnik');
});

test('a blank or whitespace-only name normalizes to the empty string', () => {
  assert.equal(normalizeCityName(''), '');
  assert.equal(normalizeCityName('   '), '');
  assert.equal(normalizeCityName(' '), '', 'NBSP is whitespace to \\s');
});

test('A-14: it degrades rather than throws on a runtime with no String.prototype.normalize', () => {
  // A-10 left "does Hermes ship String.prototype.normalize" unverified and A-14 kept it
  // unverified (a Phase 5 check) but made its absence harmless: two spellings that differ
  // only in composition form stop matching, so a copy takes step 3 and the place does not
  // travel. Never a throw, never a wrong filing.
  const desc = Object.getOwnPropertyDescriptor(String.prototype, 'normalize');
  assert.ok(desc, 'this runtime has no normalize at all — the guard is untestable here');
  Object.defineProperty(String.prototype, 'normalize', {
    value: undefined, writable: true, enumerable: false, configurable: true,
  });
  try {
    assert.equal(normalizeCityName('  Wien  '), 'wien');
    assert.equal(normalizeCityName(COMPOSED), 'zürich', 'no folding, but no throw either');
    assert.notEqual(normalizeCityName(COMPOSED), normalizeCityName(DECOMPOSED),
      'the named loss: without NFC the two forms stop matching, which is step 3, not a throw');
  } finally {
    Object.defineProperty(String.prototype, 'normalize', desc);
  }
  assert.equal(normalizeCityName(COMPOSED), normalizeCityName(DECOMPOSED), 'restored');
});
