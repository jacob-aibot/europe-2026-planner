/**
 * QA round 56 — the mandatory adversarial pass over ROADMAP **I-16** / §2.1 **A-77**
 * (*a door does not say what it wrote; the document says what changed*), commit `97f1fc1`.
 *
 *   node --experimental-strip-types cairn/qa/r56-a77.mjs
 *
 * This is the **third** attempt at one class of bug. R54-1 found 8 unguarded doors; A-76/I-15
 * built one mechanism and **enumerated where to call it**, and round 55 found 13 more plus an
 * entire record class in a directory the enumeration could not see. A-77 deletes the enumeration:
 * `commit(where, before, after)` walks the real document diff **by object identity** and parses
 * every record that is new.
 *
 * So the claim under attack is not *"sixteen cases are fixed"* — round 55's own §F already
 * measures that, and it is green. The claim is **structural**: *a door that writes a record
 * nobody thought of is covered, because the record is new*, and *the one thing still declared by
 * hand is which functions are doors, and that is not prose — it is "returns a `Trip`", which the
 * compiler computes.* Both halves of that sentence are what this probe attacks.
 *
 * A `FAIL` line is a finding. `gap` is a routed, open design question — never a FAIL. `note` is a
 * measurement. The run always ends with `COMPLETE`.
 *
 * Section index
 *   A  the induction's unstated premise — a record already in the document, mutated in place
 *   B  the classifier's scope — `Trip | null` and `Promise<Trip>` inside a censused file
 *      (the tsc half lives in `r56-census.sh`; §B drives the HARM those signatures let through)
 *   C  `resolveConflict` and the other three `conflict/` doors, attacked field by field
 *   D  TOCTOU re-derived independently at EVERY door that takes a caller record
 *   E  `commit`'s own read-once discipline — the collection ARRAY, one level above R55-5
 *   F  the eight-collection walk — completeness, order, and what a ninth would cost
 *   G  `setDayMeta`'s new allowlist, attacked with every key-smuggling shape
 *   H  the envelope: shape preservation, `schemaVersion`, KD-101 and KD-104 measured
 *   I  cost, measured independently, plus the worst case the builder did not run
 *   J  `assertBuiltAttach` / `isIsoDate` ordering, and `assertStorable`'s single caller
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

let fails = 0, gaps = 0, notes = 0;
const failLines = [];
const ok = (l, c, d) => {
  if (c) console.log(`ok   ${l}`);
  else { fails++; failLines.push(l); console.log(`FAIL ${l}${d === undefined ? '' : ` — ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); }
};
const note = (l, d) => { notes++; console.log(`note ${l}${d === undefined ? '' : ` — ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); };
const gap = (l, d) => { gaps++; console.log(`gap  ${l}${d === undefined ? '' : ` — ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); };
const section = (n) => console.log(`\n=== ${n} ===`);
const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };

const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
const buildStops = await import(resolve(CAIRN, 'packages/core/src/build/stops.ts'));
const buildCommit = await import(resolve(CAIRN, 'packages/core/src/build/commit.ts'));
const buildStorable = await import(resolve(CAIRN, 'packages/core/src/build/storable.ts'));
const coreIds = await import(resolve(CAIRN, 'packages/core/src/model/ids.ts'));
const fromJson = await import(resolve(CAIRN, 'packages/core/src/serialize/fromJSON.ts'));

const TODAY = '2026-08-01';
let seq = 0;
const CTX = () => ({ ids: core.sequentialIds(`r56-${++seq}-`), now: TODAY, actorUserId: 'local:self' });
const mk = (over = {}) => core.createTrip({
  title: 'Door', startDate: '2026-08-07', endDate: '2026-08-09',
  cities: [{ key: 'v', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
  ...over,
}, CTX());
const sched = (t, i = 0) => ({ kind: 'scheduled', dayId: t.days[i].id, time: null, order: 0 });
const PROV = {
  source: 'user', state: 'accepted', confidence: 'confirmed',
  addedAt: TODAY, acceptedAt: TODAY, actorUserId: 'local:self',
};
const DERIV = { w: 120, h: 90, bytes: 4096 };
const photoInit = (over = {}) => ({
  attach: { kind: 'day', dayId: '2026-08-07' }, caption: 'A photo',
  capturedAt: { date: '2026-08-07', time: '10:00' }, at: null, metaSource: 'exif',
  source: { w: 4000, h: 3000 }, thumb: DERIV, display: DERIV, ...over,
});
const bk = (over = {}) => ({
  id: 'bk-1', tripId: 't', kind: 'train', operator: 'ÖBB', reference: 'R1',
  startsAt: { date: '2026-08-07', time: '08:00' }, price: null, party: 2, status: 'active',
  ticket: null, provenance: PROV, ...over,
});

/**
 * Round 54 §M6's oracle, unchanged: call the door, serialise what it returned, try to open it.
 *   REFUSED        — the door threw. The mechanism working.
 *   UNSERIALISABLE — `toJSON` threw. Degrades honestly.
 *   UNOPENABLE     — it saved and can never be opened again. **The defect class.**
 */
function census(label, fn) {
  let doc = null;
  const doorErr = threw(() => { doc = fn(); });
  if (doorErr) return { label, verdict: 'REFUSED', detail: doorErr.message.slice(0, 90) };
  let bytes = null;
  const serErr = threw(() => { bytes = core.toJSON(doc); });
  if (serErr) return { label, verdict: 'UNSERIALISABLE', detail: serErr.message.slice(0, 60) };
  const parseErr = threw(() => core.fromJSON(bytes));
  if (parseErr) return { label, verdict: 'UNOPENABLE', detail: parseErr.message.slice(0, 90) };
  return { label, verdict: 'clean', doc };
}

// =================================================================================================
section('A — the induction\'s unstated premise: a committed record, mutated in place');
// A-77 Part 3 states the invariant as an induction: *"every record object in a committed document
// has already been parsed once."* That is true at the instant `commit` returns. It is not a
// property of the object — nothing freezes it, and `Trip`'s arrays and fields are all mutable. If
// anything writes through a reference into a document record, every LATER commit skips that record
// by identity, forever: the diff sees an object it was handed, so it does not parse it.
// =================================================================================================
{
  let t = core.upsertBooking(mk(), bk());
  ok('A0  the document opens before the attack', census('pre', () => t).verdict === 'clean');

  // Read the record off the document the door returned — after substitution, this IS the object
  // the document holds.
  t.bookings[0].kind = 'teleport';
  const r = census('A1', () => core.setTripMeta(t, { title: 'renamed' }));
  ok('A1  a booking mutated in place, then ANY door: the mutation is caught', r.verdict !== 'UNOPENABLE',
    `${r.verdict} ${r.detail ?? ''}`);
  note('A1a what the oracle says', `${r.verdict} — ${r.detail ?? ''}`);

  let t2 = core.addStop(mk(), sched(mk()), { name: 'Belvedere', category: 'sight' }, CTX());
  t2 = core.addStop(t2, { kind: 'scheduled', dayId: '2026-08-07', time: null, order: 0 }, { name: 'B', category: 'sight' }, CTX());
  t2.days[0].stops[0].category = 'nonsense';
  const r2 = census('A2', () => core.setDayMeta(t2, '2026-08-08', { title: 'x' }));
  ok('A2  a stop mutated in place, then an edit on ANOTHER day', r2.verdict !== 'UNOPENABLE',
    `${r2.verdict} ${r2.detail ?? ''}`);

  // The same shape one level up: the day itself.
  const t3 = core.addStop(mk(), sched(mk()), { name: 'S', category: 'sight' }, CTX());
  t3.days[0].primaryCity = 42;
  const r3 = census('A3', () => core.setTripMeta(t3, { title: 'y' }));
  ok('A3  a day mutated in place, then setTripMeta', r3.verdict !== 'UNOPENABLE', `${r3.verdict} ${r3.detail ?? ''}`);

  // Vacuity control: the SAME poisoned value written as a NEW object IS caught. If this fails the
  // three above prove nothing.
  const t4 = core.upsertBooking(mk(), bk());
  const r4 = census('A4', () => core.upsertBooking(t4, bk({ kind: 'teleport' })));
  ok('A4  CONTROL: the same bad value in a NEW object is refused at the door', r4.verdict === 'REFUSED', r4.verdict);

  // And the reachability question, answered rather than argued: does any SHIPPED path write
  // through a reference into a document record?
  note('A5  shipped in-place writes into a Trip record', 'none found by grep over packages/core/src and packages/client/src');
}

// =================================================================================================
section('B — the classifier\'s scope: which functions the compiler counts as doors');
// A-77 Part 6.1: *"a door is an exported function whose return type is `Trip`"*, and the census is
// `IsExact<DoorsOf<Censused>, DOORS | 'commit'>` with `ReturnsTrip` an EXACT match both ways. Two
// consequences the ruling does not state, both reproduced with tsc in `qa/r56-census.sh`:
//   1. a `Trip`-returning export in a file outside `build/*.ts` + `conflict/resolve.ts` is
//      invisible to BOTH census halves — which is the `resolveConflict` failure verbatim;
//   2. inside a censused file, `Trip | null` and `Promise<Trip>` are not exact matches, so a door
//      with either signature is invisible too.
// §B here drives the HARM those two let through, so the tsc result is not the only evidence.
// =================================================================================================
{
  // The exact body a `Trip | null` door would have, run as if it had been written in build/pool.ts.
  const sneakNullable = (trip, r) => (r ? { ...trip, resolutions: [...trip.resolutions, r], revision: trip.revision + 1 } : null);
  const t = mk();
  const bad = { conflictId: 'c1', state: 'bogus', by: 'local:self', note: null, at: TODAY, retiredAt: null };
  const r = census('B1', () => sneakNullable(t, bad));
  // Not a FAIL: this door is not in the tree. It is the harm a censused file WOULD ship, and the
  // census result itself is `r56-census.sh`'s, run against tsc.
  note('B1  the harm a `(t: Trip) => Trip | null` door would write', `${r.verdict} — ${r.detail ?? ''}`);
  gap('B1a the classifier cannot see that signature',
    'ReturnsTrip is an EXACT match both ways, so `Trip | null` and `Promise<Trip>` are not doors — and a Phase 3 ingest worker is async by construction. R56-2');
  note('B1b the census result itself', 'bash qa/r56-census.sh — 12 injected doors, 4 evade `npm run typecheck` AND the module census');
  // CONTROL: written `(t: Trip) => Trip`, the identical body IS a door and IS caught by the
  // compiler — so R56-2 is about the signature and nothing else.
  ok('B1c CONTROL: the same body returning `Trip` is refused when routed through commit',
    census('B1c', () => buildCommit.commit('sneak', t, sneakNullable(t, bad))).verdict === 'REFUSED');
}

// =================================================================================================
section('C — resolveConflict and the other three conflict/ doors, field by field');
// A-77 Part 3 rule 8 makes `ConflictResolution` the eighth record class and `conflict/resolve.ts`
// four doors. The architect verified three fields; this drives every field of the record, plus the
// shapes an `any`-shaped caller actually produces.
// =================================================================================================
{
  const base = () => mk();
  // The base is a resolution the parser ACCEPTS — `note` is optional and `null` is not a string,
  // so a `note: null` base would have made every row below refuse for the fixture's own reason.
  const res = (over = {}) => ({ conflictId: 'cf-1', state: 'dismissed', by: 'local:self', at: TODAY, ...over });
  ok('C0  CONTROL: the base fixture is one the parser accepts',
    census('C0', () => core.resolveConflict(base(), res())).verdict === 'clean');
  const rows = [
    ['state bogus', { state: 'bogus' }], ['state null', { state: null }], ['state undefined', { state: undefined }],
    ['state object', { state: {} }], ['state number', { state: 3 }], ['state uppercase', { state: 'DISMISSED' }],
    ['by number', { by: 42 }], ['by object', { by: {} }], ['by array', { by: [] }], ['by null', { by: null }],
    ['note object', { note: {} }], ['note number', { note: 7 }], ['note array', { note: ['x'] }], ['note null', { note: null }],
    ['at number', { at: 42 }], ['at null', { at: null }], ['at malformed calendar', { at: '2026-13-45' }],
    ['retiredAt object', { retiredAt: {} }], ['retiredAt number', { retiredAt: 42 }],
    ['conflictId number', { conflictId: 42 }],
    ['undeclared key', { somethingElse: { deep: 1 } }],
    ['__proto__ from JSON', JSON.parse('{"conflictId":"cf-1","state":"dismissed","by":"u","at":"2026-08-01","__proto__":{"state":"bogus"}}')],
  ];
  let unopenable = 0, refused = 0, clean = 0;
  for (const [label, over] of rows) {
    const r = census(label, () => core.resolveConflict(base(), label === '__proto__ from JSON' ? over : res(over)));
    if (r.verdict === 'UNOPENABLE') { unopenable++; ok(`C   resolveConflict · ${label}`, false, r.detail); }
    else { if (r.verdict === 'REFUSED') refused++; else clean++; note(`C   resolveConflict · ${label}`, r.verdict); }
  }
  ok('C1  resolveConflict writes no document that cannot be re-opened', unopenable === 0, `${unopenable} unopenable`);
  note('C1a breakdown', `${refused} refused at the door, ${clean} accepted-and-reopenable, ${unopenable} unopenable`);
  ok('C1b CONTROL: the refusals are real, not vacuous', refused >= 15, `${refused} refusals`);

  // A-77 Part 3's message contract at the eighth record class.
  const e = threw(() => core.resolveConflict(base(), res({ state: 'bogus' })));
  ok('C2  the refusal names the door', e !== null && /^resolveConflict:/.test(e.message), e && e.message.slice(0, 70));
  ok('C2a it names the record class and the parser path', e !== null && /this resolution cannot be stored/.test(e.message) && /\$\.state/.test(e.message), e && e.message);
  ok('C2b it carries the locator A-77 Part 3 rule 7 adds', e !== null && /\(resolutions\[\d+\]\)/.test(e.message), e && e.message.slice(-40));
  ok('C2c it is a plain Error, never a TripParseError', e !== null && !(e instanceof core.TripParseError), e && e.constructor.name);

  // Substitution at the eighth class (rule 5): the document does not hold the caller's object.
  const handed = res({ state: 'dismissed' });
  const after = core.resolveConflict(base(), handed);
  ok('C3  the stored resolution is the parser\'s object, not the caller\'s', after.resolutions[0] !== handed);
  handed.state = 'bogus';
  ok('C3a mutating the handed object afterwards cannot corrupt the document',
    census('C3a', () => after).verdict === 'clean');

  // The other three doors of the file.
  const withRes = core.resolveConflict(base(), res({ conflictId: 'cf-9' }));
  ok('C4  unresolveConflict is a door and returns a re-openable document',
    census('C4', () => core.unresolveConflict(withRes, 'cf-9')).verdict === 'clean');
  const same = mk();
  ok('C5  syncResolutions on a trip with no live rows returns the SAME object (it returns before commit)',
    core.syncResolutions(same, TODAY) === same);
  ok('C5a syncResolutions on a trip WITH a live row still returns a re-openable document',
    census('C5a', () => core.syncResolutions(withRes, TODAY)).verdict === 'clean');
  const e6 = threw(() => core.reassertRetirements(same, []));
  ok('C6  reassertRetirements with nothing to reassert returns the same object', e6 === null,
    e6 && e6.message.slice(0, 70));
}

// =================================================================================================
section('D — TOCTOU, re-derived independently at every door that takes a caller record');
// R55-5: a void assertion validated one value and let the door store another. A-77 Part 3 rule 5
// closes it by SUBSTITUTION. The test is not "does the builder's own repro pass" — it is: at every
// door, (i) a getter that flips on its second read cannot land the second value in the document,
// and (ii) mutating the handed-in object after the door returned cannot corrupt it.
// =================================================================================================
{
  /** A record whose `field` returns `good` on read 1 and `evil` on every read after. */
  const flip = (recordFactory, field, good, evil) => {
    const rec = recordFactory();
    let n = 0;
    Object.defineProperty(rec, field, { configurable: true, enumerable: true, get() { return ++n === 1 ? good : evil; } });
    return rec;
  };

  const doors = [
    ['upsertBooking', () => bk(), 'kind', 'train', 'teleport', (t, r) => core.upsertBooking(t, r), () => mk()],
    ['addPlace', () => ({ id: 'pl-x', cityKey: 'v', name: 'Belvedere', at: null, category: 'sight' }),
      'category', 'sight', 'nonsense', (t, r) => buildStops.addPlace(t, r), () => mk()],
  ];
  for (const [name, factory, field, good, evil, call, tripOf] of doors) {
    const rec = flip(factory, field, good, evil);
    const r = census(name, () => call(tripOf(), rec));
    ok(`D1  ${name}: a flip-on-second-read getter cannot land the second value`, r.verdict !== 'UNOPENABLE',
      `${r.verdict} ${r.detail ?? ''}`);
    if (r.verdict === 'clean') {
      const coll = name === 'upsertBooking' ? r.doc.bookings : r.doc.places;
      note(`D1a ${name}: what the document holds`, coll[coll.length - 1][field]);
      ok(`D1b ${name}: the stored value is the one the parser READ (A-77 rule 5)`,
        coll[coll.length - 1][field] === good, coll[coll.length - 1][field]);
    }
    // Vacuity control: the SAME getter returning the bad value FIRST must be refused.
    const rec2 = flip(factory, field, evil, good);
    const r2 = census(name, () => call(tripOf(), rec2));
    ok(`D1c ${name} CONTROL: bad on the FIRST read is refused`, r2.verdict === 'REFUSED', r2.verdict);
  }

  // (ii) post-return mutation of the object the caller handed in, at every record class a door takes.
  const cases = [
    ['upsertBooking', () => { const r = bk(); return [core.upsertBooking(mk(), r), r, 'kind', 'teleport']; }],
    ['addPlace', () => { const r = { id: 'pl-y', cityKey: 'v', name: 'B', at: null, category: 'sight' }; return [buildStops.addPlace(mk(), r), r, 'category', 'nope']; }],
    ['addPhoto', () => { const r = photoInit(); return [core.addPhoto(mk(), r, CTX()), r, 'caption', 42]; }],
    ['addParticipant', () => { const r = { displayName: 'Marta', kind: 'contact' }; return [core.addParticipant(mk(), r, CTX()), r, 'kind', 'bogus']; }],
    ['resolveConflict', () => { const r = { conflictId: 'cf-2', state: 'dismissed', by: 'local:self', at: TODAY }; return [core.resolveConflict(mk(), r), r, 'state', 'bogus']; }],
  ];
  for (const [name, run] of cases) {
    const e = threw(() => {
      const [doc, handed, field, evil] = run();
      handed[field] = evil;
      const r = census(name, () => doc);
      ok(`D2  ${name}: mutating the handed record afterwards cannot corrupt the document`,
        r.verdict === 'clean', `${r.verdict} ${r.detail ?? ''}`);
    });
    if (e) ok(`D2  ${name}: harness ran`, false, e.message.slice(0, 90));
  }
}

// =================================================================================================
section('E — commit\'s own read-once discipline: the collection ARRAY');
// A-77 rule 5 makes the RECORD read-once. `commitList` reads `after[i]` for the aligned test, then
// calls `after.slice()` to build its output — a SECOND read of every index. Only the index it just
// parsed is overwritten, so for any other index the value tested and the value stored are two
// different reads. That is R55-5's shape one level up, and it is `commit`'s own code, not a door's.
// =================================================================================================
{
  let base = core.upsertBooking(mk(), bk({ id: 'bk-1', kind: 'train' }));
  base = core.upsertBooking(base, bk({ id: 'bk-2', kind: 'bus' }));
  const good0 = base.bookings[0], good1 = base.bookings[1];
  const evil = { ...good1, kind: 'teleport' };
  const results = [];
  for (let flipAt = 1; flipAt <= 5; flipAt++) {
    let reads = 0;
    const hostile = [good0, good1];
    Object.defineProperty(hostile, '1', {
      configurable: true, enumerable: true,
      get() { return ++reads === flipAt ? evil : good1; },
    });
    const r = census(`flipAt=${flipAt}`, () => core.setTripMeta({ ...base, bookings: hostile }, { title: `r${flipAt}` }));
    results.push({ flipAt, reads, verdict: r.verdict });
    note(`E   collection-array flip at read ${flipAt}`, `${reads} reads → ${r.verdict}`);
  }
  const bad = results.filter((r) => r.verdict === 'UNOPENABLE');
  ok('E1  commit reads each collection slot ONCE, so no read but the tested one can be stored',
    bad.length === 0, `unopenable at flipAt=${bad.map((b) => b.flipAt).join(',')}`);
  ok('E1a CONTROL: the harness really is exercising more than one read per slot',
    results.some((r) => r.reads > 2), results.map((r) => r.reads));
}

// =================================================================================================
section('F — the eight-collection walk: completeness and order');
// =================================================================================================
{
  const t = mk();
  const declared = Object.entries(t).filter(([, v]) => Array.isArray(v)).map(([k]) => k).sort();
  const walked = ['bookings', 'cities', 'days', 'participants', 'photos', 'places', 'pool', 'resolutions'];
  ok('F1  every array-valued field of a Trip is walked by commit', JSON.stringify(declared) === JSON.stringify(walked.slice().sort()),
    `document has ${JSON.stringify(declared)}`);
  note('F1a the eight collections', walked.join(', '));

  // Nested record lists: is any validatable record more than one level deep?
  const nested = [];
  const seen = new Set();
  const walk = (v, path, depth) => {
    if (depth > 6 || v === null || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`, depth + 1)); return; }
    for (const [k, x] of Object.entries(v)) {
      if (Array.isArray(x) && x.length && typeof x[0] === 'object' && x[0] !== null && 'id' in x[0]) nested.push(`${path}.${k}`);
      walk(x, `${path}.${k}`, depth + 1);
    }
  };
  const sample = core.fromJSON(readFileSync(resolve(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8'));
  walk(sample, '$', 0);
  const deeper = nested.filter((p) => !/^\$\.(cities|days|pool|places|bookings|photos|participants|resolutions)$/.test(p) && p !== '$.days[0].stops' && !/^\$\.days\[\d+\]\.stops$/.test(p));
  ok('F2  no id-bearing record list is nested deeper than days[].stops', deeper.length === 0, deeper.slice(0, 5));
  note('F2a id-bearing lists found in the reference document', [...new Set(nested.map((p) => p.replace(/\[\d+\]/g, '[]')))].join(', '));

  // Order: `places` before `days` is what gives copyStopInto its stated precedence.
  const src = readFileSync(resolve(CAIRN, 'packages/core/src/build/commit.ts'), 'utf8');
  const order = [...src.matchAll(/commitList\(\s*\n?\s*where, '(\w+)', '(\w+)'/g)].map((m) => m[2]);
  const withDays = [];
  for (const c of order) { if (c === 'pool' && !withDays.includes('days')) withDays.push('days'); withDays.push(c); }
  note('F3  the walk order, read off the source', withDays.join(' → '));
  ok('F3a places is walked before days (A-77 rule 2\'s stated precedence)',
    withDays.indexOf('places') < withDays.indexOf('days'));
}

// =================================================================================================
section('G — setDayMeta\'s new allowlist, attacked with every key-smuggling shape');
// =================================================================================================
{
  let t = core.addStop(mk(), sched(mk()), { name: 'Belvedere', category: 'sight' }, CTX());
  const existing = t.days[0].stops[0];

  const shapes = [
    ['plain stops key', { stops: [existing] }],
    ['stops: undefined', { stops: undefined }],
    ['stops non-array', { stops: 42 }],
    ['id', { id: 'x' }],
    ['date', { date: '2026-08-09' }],
    ['undeclared key', { nobodyDeclaredThis: 1 }],
    ['__proto__ literal from JSON', JSON.parse('{"__proto__":{"stops":[]}}')],
    ['defineProperty enumerable', (() => { const p = {}; Object.defineProperty(p, 'stops', { value: [existing], enumerable: true }); return p; })()],
  ];
  for (const [label, patch] of shapes) {
    const e = threw(() => core.setDayMeta(t, '2026-08-08', patch));
    ok(`G1  ${label} is refused`, e !== null && /may not be patched/.test(e.message), e ? e.message.slice(0, 70) : 'ACCEPTED');
  }
  // The two shapes `Object.keys` cannot see — they must be harmless BY SYMMETRY, because the
  // spread that builds the merged day cannot see them either. Asserted, not assumed.
  const nonEnum = {}; Object.defineProperty(nonEnum, 'stops', { value: [existing], enumerable: false });
  const inherited = Object.create({ stops: [existing] });
  for (const [label, patch] of [['non-enumerable own', nonEnum], ['inherited', inherited]]) {
    const r = census(label, () => core.setDayMeta(t, '2026-08-08', patch));
    ok(`G2  ${label} \`stops\` is invisible to the merge too, so no stop is smuggled`,
      r.verdict === 'clean' && r.doc.days[1].stops.length === 0, `${r.verdict} ${r.verdict === 'clean' ? r.doc.days[1].stops.length : ''}`);
  }
  const symPatch = { [Symbol('stops')]: [existing], title: 'ok' };
  const rs = census('symbol', () => core.setDayMeta(t, '2026-08-08', symPatch));
  ok('G3  a symbol-keyed patch key cannot reach a parsed field', rs.verdict === 'clean' && rs.doc.days[1].stops.length === 0, rs.verdict);

  // CONTROL: the legal keys still work, so G1 is not vacuously green.
  ok('G4  CONTROL: every legal DayMetaPatch key is still accepted',
    threw(() => core.setDayMeta(t, '2026-08-08', {
      primaryCity: 'v', cities: ['v'], title: 'A', subtitle: 'B', legacyFlag: true, tzId: 'Europe/Vienna', provenance: PROV,
    })) === null);
  // The runtime allowlist is a SECOND COPY of `DayMetaPatch`'s Pick, hand-maintained.
  const daysSrc = readFileSync(resolve(CAIRN, 'packages/core/src/build/days.ts'), 'utf8');
  const pick = (daysSrc.match(/DayMetaPatch = Partial<Pick<Day, ([^>]*)>>/) || [])[1] || '';
  const picked = [...pick.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
  const listed = [...(daysSrc.match(/DAY_META_PATCH_KEYS: readonly string\[\] = \[([^\]]*)\]/s) || ['', ''])[1].matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
  ok('G5  the runtime allowlist and the compile-time Pick agree TODAY', JSON.stringify(picked) === JSON.stringify(listed), { picked, listed });
  gap('G5a nothing pins them together', 'a field added to DayMetaPatch and not to DAY_META_PATCH_KEYS is silently unpatchable — R56-6');
  gap('G5b `provenance` is patchable on a Day', 'updateStop forbids it by name (§5.1, "never present a suggestion as the user\'s own plan"); setDayMeta allows it because DayMetaPatch picks it — R56-7');
}

// =================================================================================================
section('H — the envelope: shape, schemaVersion, and KD-101 / KD-104 measured');
// =================================================================================================
{
  const t = mk();
  const after = core.setTripMeta(t, { title: 'renamed' });
  ok('H1  commit does not change the Trip\'s key set',
    JSON.stringify(Object.keys(t).sort()) === JSON.stringify(Object.keys(after).sort()),
    { before: Object.keys(t).sort(), after: Object.keys(after).sort() });
  ok('H1a a trip with no `meta` does not gain an own `meta` key', !('meta' in t) ? !('meta' in after) : true,
    { hadMeta: 'meta' in t, hasMeta: 'meta' in after });
  ok('H2  commit always returns a NEW Trip object (rule 6)', after !== t);
  ok('H2a `party` is substituted, not the caller\'s object', core.setTripMeta(t, { party: { adults: 3, children: 1 } }).party.adults === 3);

  // rule 1's added check: a door may only ever produce a current-version document.
  const stale = { ...t, schemaVersion: 2 };
  const e = threw(() => core.setTripMeta(stale, { title: 'x' }));
  ok('H3  a door refuses to produce a non-current schemaVersion', e !== null && /schemaVersion/.test(e.message), e ? e.message.slice(0, 90) : 'ACCEPTED');
  ok('H3a and it is the storability refusal, not a TripParseError', e !== null && !(e instanceof core.TripParseError) && /cannot be stored/.test(e.message), e && e.message.slice(0, 60));

  // KD-101: `null` is a caller's value and must reach the record, where the parser refuses it.
  for (const [label, v, want] of [
    ['createTrip datePrecision null', null, 'REFUSED'],
    ['createTrip datePrecision undefined', undefined, 'exact'],
    ['createTrip datePrecision "fortnight"', 'fortnight', 'REFUSED'],
    ['createTrip datePrecision "month"', 'month', 'month'],
  ]) {
    const r = census(label, () => mk({ datePrecision: v }));
    const got = r.verdict === 'REFUSED' ? 'REFUSED' : r.doc.datePrecision;
    ok(`H4  ${label} → ${want}`, got === want, got);
  }

  // KD-104, measured rather than argued: what a `*Patch` key present with `undefined` now does.
  const monthTrip = mk({ datePrecision: 'month' });
  ok('H5  the base trip really is month-precision', monthTrip.datePrecision === 'month');
  const patched = core.setTripMeta(monthTrip, { datePrecision: undefined });
  note('H5a setTripMeta({datePrecision: undefined}) on a month trip', patched.datePrecision);
  gap('H5b a stated precision is silently reset to the default',
    'no document becomes unopenable, but the user\'s "I only know the month" becomes "exact" with no refusal and no notice. Every other patch door refuses a present-but-undefined key — R56-5');
  for (const [label, key] of [['ownerId', 'ownerId'], ['homeBase', 'homeBase'], ['title', 'title'], ['party', 'party'], ['homeCurrency', 'homeCurrency']]) {
    const r = census(label, () => core.setTripMeta(monthTrip, { [key]: undefined }));
    note(`H5c setTripMeta({${label}: undefined})`, r.verdict === 'clean' ? `accepted → ${JSON.stringify(r.doc[key])}` : r.verdict);
  }
}

// =================================================================================================
section('I — cost, measured independently, plus the worst case the builder did not run');
// A-77 Part 9: *"one pointer comparison per record in the collections a door touched … they
// allocate nothing"*. The identity `Set` is the cost that sentence does not name: it spans EVERY
// day stop and the whole pool, and it is built whenever a single stop fails the index-aligned
// test — which an append at the tail of a day always does.
// =================================================================================================
{
  const bench = (fn, reps) => { for (let i = 0; i < Math.min(20, reps); i++) fn(); const t0 = performance.now(); for (let i = 0; i < reps; i++) fn(); return (performance.now() - t0) / reps; };
  const ref = core.fromJSON(readFileSync(resolve(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8'));
  const refStop = ref.days.flatMap((d) => d.stops)[5];
  const a = bench(() => core.setDayMeta(ref, ref.days[3].id, { title: 'x' }), 200);
  const b = bench(() => core.updateStop(ref, refStop.id, { name: 'x' }), 200);
  ok(`I1  setDayMeta on the reference trip is under the 2 ms budget (${a.toFixed(4)} ms)`, a < 2, a);
  ok(`I1a updateStop on the reference trip is under the 2 ms budget (${b.toFixed(4)} ms)`, b < 2, b);
  const bigInit = { title: 'Big', startDate: '2026-01-01', endDate: '2035-12-31', cities: [{ key: 'v', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }] };
  const c = bench(() => core.createTrip(bigInit, CTX()), 10);
  const big = core.createTrip(bigInit, CTX());
  const d = bench(() => core.setTripMeta(big, { endDate: '2035-12-25' }), 10);
  ok(`I2  createTrip over A-35's ten-year cap is under the 1 s budget (${c.toFixed(2)} ms, ${big.days.length} days)`, c < 1000, c);
  ok(`I2a setTripMeta with a range change on the same trip is under 1 s (${d.toFixed(2)} ms)`, d < 1000, d);

  // The worst case: cost per edit against TOTAL stops in the document, not stops the door wrote.
  const curve = [];
  for (const perDay of [0, 5, 25, 50]) {
    let t = core.createTrip({ title: 'S', startDate: '2026-01-01', endDate: '2027-02-04', cities: bigInit.cities }, CTX());
    const c2 = CTX();
    for (const day of t.days) for (let i = 0; i < perDay; i++) t = core.addStop(t, { kind: 'scheduled', dayId: day.id, time: null, order: i }, { name: `S${i}`, category: 'sight' }, c2);
    const total = t.days.reduce((acc, dd) => acc + dd.stops.length, 0);
    const day0 = t.days[0].id;
    const ms = bench(() => core.addStop(t, { kind: 'scheduled', dayId: day0, time: null, order: perDay }, { name: 'Z', category: 'sight' }, CTX()), 60);
    const dm = bench(() => core.setDayMeta(t, day0, { title: 'x' }), 60);
    curve.push({ stops: total, addStop: +ms.toFixed(4), setDayMeta: +dm.toFixed(4) });
  }
  note('I3  cost per edit vs TOTAL stops in the document', JSON.stringify(curve));
  const first = curve[1], last = curve[curve.length - 1];
  const growth = last.addStop / Math.max(first.addStop, 1e-9);
  const stopRatio = last.stops / Math.max(first.stops, 1);
  ok('I3a addStop is linear in what the door WROTE, not in the whole document', growth < stopRatio / 2,
    `${stopRatio.toFixed(0)}× the stops → ${growth.toFixed(1)}× the time`);
  ok('I3b setDayMeta (which mints no stop, so builds no identity Set) really is flat',
    last.setDayMeta < first.setDayMeta * 4, curve.map((x) => x.setDayMeta));
  note('I3c root cause', 'commit.ts:152 lazySet spans every day stop AND the pool; commitList calls it the first time any slot fails the index-aligned test, which an append at a day\'s tail always does');
}

// =================================================================================================
section('J — the two kept guards, their ordering, and assertStorable\'s single caller');
// =================================================================================================
{
  const t = mk();
  const photo = photoInit;
  // `assertBuiltAttach` asserts what the parser deliberately does NOT, and must run BEFORE commit.
  const both = threw(() => core.addPhoto(t, photo({ attach: { kind: 'place', placeId: 'pl-1' }, caption: 42 }), CTX()));
  ok('J1  a place-attached photo with ALSO a bad caption reports the DEFERRAL, not the storability refusal',
    both !== null && !/cannot be stored/.test(both.message), both && both.message.slice(0, 80));
  note('J1a the message', both && both.message.slice(0, 100));
  const builtPhoto = core.addPhoto(t, photo(), CTX()).photos[0];
  ok('J1b CONTROL: the parser really does accept a place-attached photo',
    threw(() => core.fromJSON(core.toJSON({ ...t, photos: [{ ...builtPhoto, attach: { kind: 'place', placeId: 'pl-1' } }] }))) === null);
  ok('J1c CONTROL: the caption alone IS a storability refusal',
    /cannot be stored/.test(threw(() => core.addPhoto(t, photo({ caption: 42 }), CTX())).message));

  // A-77 Part 4's OTHER kept guard, and its stated reason: *"It is stricter than the parser on
  // purpose: `fromJSON`'s `isoDate` takes the SHAPE, and `2026-13-45` matches it, rolls through
  // `Date.UTC` and yields a trip starting 2027-02-14 (F-11, KD-12)."* That sentence is the
  // criterion for keeping it — so it is the sentence to attack.
  const roll = threw(() => mk({ startDate: '2026-13-45' }));
  ok('J2  a calendar-invalid startDate is still refused at the trip doors', roll !== null, 'ACCEPTED');
  note('J2a which guard raises it', roll && roll.message.slice(0, 70));
  ok('J2b the PARSER refuses it too, so it is not a property only the guard has',
    threw(() => core.fromJSON(core.toJSON({ ...t, startDate: '2026-13-45' }))) !== null,
    'the parser accepted it — A-77 Part 4\'s premise would hold');
  const DATES = ['2026-08-07', '2026-13-45', '2026-02-30', '2026-00-10', '2026-1-1', '2026-08-32',
    '20260807', '', 'x', '2026-12-31', '2024-02-29', '2025-02-29', '2026-08-07T00:00:00Z',
    ' 2026-08-07', '2026-08-07 ', null, 42, '+026-08-07', '2026-08-0'];
  const disagree = [];
  for (const v of DATES) {
    const guard = coreIds.isIsoDate(v);
    const parses = threw(() => fromJson.parseTripEnvelope({
      id: 't', title: 'T', ownerId: 'o', startDate: v, endDate: '2026-08-09', datePrecision: 'exact',
      homeCurrency: 'EUR', homeBase: null, party: { adults: 1, children: 0 }, revision: 1, schemaVersion: 3,
    }, '$')) === null;
    if (guard !== parses) disagree.push(v);
  }
  note('J2c isIsoDate vs the parser over 19 values', disagree.length === 0 ? 'identical verdicts, 19/19' : JSON.stringify(disagree));
  gap('J2d A-77 Part 4\'s reason for KEEPING isIsoDate is false against the code',
    '§2.9 A-45 made the parser calendar-checking at all five date sites; measured, the two predicates agree on every value, and ensureDays refuses a calendar-invalid range through `commit` with or without the guard. By A-77\'s own R16-2 test this is one property with two guards — R56-3');

  // A-77 Part 4: after this ruling `build/` holds exactly TWO guards that are not the parser.
  const files = ['bookings', 'candidates', 'commit', 'copyStop', 'createTrip', 'days', 'participants', 'photos', 'pool', 'redactText', 'stops', 'storable'];
  // Source lines only — a `*` continuation line is a doc comment, and the declaration is not a call.
  const callSites = (src) => src.split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l) && !/function assertStorable/.test(l))
    .reduce((n, l) => n + [...l.matchAll(/(?<![A-Za-z])assertStorable\(/g)].length, 0);
  let callers = 0;
  for (const f of files) callers += callSites(readFileSync(resolve(CAIRN, `packages/core/src/build/${f}.ts`), 'utf8'));
  callers += callSites(readFileSync(resolve(CAIRN, 'packages/core/src/conflict/resolve.ts'), 'utf8'));
  ok('J3  assertStorable is called only from build/commit.ts (2 sites: commitList, commitDays)',
    callers === 2, `${callers} call sites across build/ and conflict/resolve.ts`);
  ok('J3a assertDatePrecision is gone', !readFileSync(resolve(CAIRN, 'packages/core/src/build/createTrip.ts'), 'utf8').includes('function assertDatePrecision'));
  ok('J4  commit is NOT on §2.10\'s public surface', !('commit' in core) && typeof buildCommit.commit === 'function');
  ok('J4a assertStorable is not on it either', !('assertStorable' in core) && typeof buildStorable.assertStorable === 'function');
  note('J5  §2.10 export count', Object.keys(core).length);
  ok('J5a the surface is still 86', Object.keys(core).length === 86, Object.keys(core).length);
}

console.log(`\nCOMPLETE  fails=${fails} gaps=${gaps} notes=${notes}`);
if (failLines.length) { console.log('FAILING:'); for (const l of failLines) console.log(`  ${l}`); }
