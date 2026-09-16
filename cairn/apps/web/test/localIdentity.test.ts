import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_IDENTITY, IDENTITY_KEY, identityInitials, parseIdentity, readIdentity, writeIdentity } from '../src/localIdentity.ts';

test('an absent local identity begins fresh and optional', () => {
  assert.deepEqual(parseIdentity(null), EMPTY_IDENTITY);
});

test('identity parsing rejects corruption, versions, shapes and limits', () => {
  for (const raw of ['{', '{}', JSON.stringify({ ...EMPTY_IDENTITY, version: 2 }), ...Object.entries({ displayName: 80, homeCity: 120, bio: 240 }).map(([field, limit]) => JSON.stringify({ ...EMPTY_IDENTITY, [field]: 'x'.repeat(limit + 1) }))]) {
    assert.throws(() => parseIdentity(raw), /profile saved on this device/);
  }
});

test('all field limits accept the boundary and refuse longer writes without replacing stored data', () => {
  let raw = JSON.stringify(EMPTY_IDENTITY);
  const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } };
  const limits = { displayName: 80, homeCity: 120, bio: 240 };
  const full = { ...EMPTY_IDENTITY, displayName: 'n'.repeat(80), homeCity: 'h'.repeat(120), bio: 'b'.repeat(240) };
  writeIdentity(full, storage);
  for (const [field, limit] of Object.entries(limits)) {
    assert.throws(() => writeIdentity({ ...full, [field]: 'x'.repeat(limit + 1) }, storage), /longer/);
    assert.deepEqual(readIdentity(storage), full);
  }
});

test('identity writes a trimmed versioned record and remembers skip', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const written = writeIdentity({ version: 1, displayName: '  Jacob Miller ', homeCity: ' Phoenix ', bio: ' Curious. ', welcomeDismissed: true }, storage);
  assert.deepEqual(written, { version: 1, displayName: 'Jacob Miller', homeCity: 'Phoenix', bio: 'Curious.', welcomeDismissed: true });
  assert.deepEqual(readIdentity(storage), written);
  assert.ok(values.has(IDENTITY_KEY));
});

test('storage failures are surfaced and initials remain polished', () => {
  const unavailable = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
  assert.throws(() => readIdentity(unavailable), /blocked/);
  assert.throws(() => writeIdentity(EMPTY_IDENTITY, unavailable), /full/);
  assert.equal(identityInitials(' Jacob  Miller '), 'JM');
  assert.equal(identityInitials('sarah'), 'S');
});
