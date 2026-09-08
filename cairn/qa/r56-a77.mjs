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
  // **RE-CUT BY QA ROUND 57.** This was a FAIL; §2.1 **A-78** Part 7 (revision 59) RULED it and
  // deliberately did not close it. What ships is: the premise stated as **Invariant R** (*records
  // are replaced, never rewritten*) in `commit.ts`'s header, the DOOR half proved mechanically by
  // a frozen-input census over every door, and the CALLER half left as a written invariant with a
  // Phase 3 trigger (option 1, a production deep-freeze, is refused with its reasons). So the
  // behaviour below is the ruling's own accepted residue and belongs on the `gap` channel, not the
  // `FAIL` one — it is re-asserted here so that a future round which closes the caller half sees
  // this line change, and so that the residue is measured rather than remembered.
  if (r.verdict === 'UNOPENABLE') {
    gap('A1  a booking mutated in place, then ANY door: still UNOPENABLE — A-78 Part 7\'s caller half', r.detail);
  } else {
    ok('A1  the caller half of Invariant R is now enforced somewhere', true, r.verdict);
  }
  note('A1a what the oracle says', `${r.verdict} — ${r.detail ?? ''}`);

  let t2 = core.addStop(mk(), sched(mk()), { name: 'Belvedere', category: 'sight' }, CTX());
  t2 = core.addStop(t2, { kind: 'scheduled', dayId: '2026-08-07', time: null, order: 0 }, { name: 'B', category: 'sight' }, CTX());
  t2.days[0].stops[0].category = 'nonsense';
  const r2 = census('A2', () => core.setDayMeta(t2, '2026-08-08', { title: 'x' }));
  if (r2.verdict === 'UNOPENABLE') gap('A2  a stop mutated in place, then an edit on ANOTHER day — same residue', r2.detail);
  else ok('A2  the caller half of Invariant R is now enforced at `day.stops`', true, r2.verdict);

  // The same shape one level up: the day itself.
  const t3 = core.addStop(mk(), sched(mk()), { name: 'S', category: 'sight' }, CTX());
  t3.days[0].primaryCity = 42;
  const r3 = census('A3', () => core.setTripMeta(t3, { title: 'y' }));
  if (r3.verdict === 'UNOPENABLE') gap('A3  a day mutated in place, then setTripMeta — same residue', r3.detail);
  else ok('A3  the caller half of Invariant R is now enforced at `days`', true, r3.verdict);

  // **ADDED BY QA ROUND 57 (R57-3).** The ARRAY arm of the same premise, which Invariant R's text
  // does NOT cover: its record list is City/Place/Day/Stop/Booking/PhotoAsset/Participant/
  // ConflictResolution "and any object nested inside one", and a `Trip`'s own collection arrays are
  // not records. Nothing is mutated here — an unparsed record object is APPENDED to a committed
  // array, and `commitList`'s index-aligned test then reads `aligned === after` and skips it.
  const t5 = core.upsertBooking(mk(), bk());
  t5.bookings.push(bk({ id: 'bk-2', kind: 'teleport' }));
  const r5 = census('A5', () => core.setTripMeta(t5, { title: 'z' }));
  if (r5.verdict === 'UNOPENABLE') {
    gap('A5  a record APPENDED to a committed array is never parsed — Invariant R is silent on arrays (R57-3)', r5.detail);
  } else {
    ok('A5  the array arm of Invariant R is enforced', true, r5.verdict);
  }

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
  // **RE-CUT BY QA ROUND 57.** R56-2 was ruled and built: §2.1 **A-78** Part 2 widens the
  // classifier to `IsDoor<F> = IsExact<Exclude<Awaited<R>, null | undefined>, Trip>`, so `Trip`,
  // `Trip | null`, `Promise<Trip>` and `Promise<Trip | null>` are all doors, and `Trip | Day` is
  // refused MECHANICALLY by a second census line. The gap becomes the source assertion that the
  // widening is really there, in the order the ruling says is load-bearing.
  const censusRaw = readFileSync(resolve(CAIRN, 'packages/core/test/storable.test.ts'), 'utf8');
  // Comments stripped: the docstring PRINTS the wrong order as the thing not to write.
  const censusSrc = censusRaw.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  ok('B1a the classifier admits `Trip | null` and a `Promise` of either (R56-2 closed)',
    /Exclude<Awaited<R>, null \| undefined>/.test(censusSrc) && /IsDoor<F> = IsExact<TripishReturn<F>, Trip>/.test(censusSrc));
  ok('B1a2 ...in the order A-78 Part 2 calls load-bearing, not `Awaited<Exclude<…>>`',
    !/Awaited<Exclude</.test(censusSrc));
  ok('B1a3 ...and the illegal-shape line refuses a `Trip | Day` union mechanically',
    /const ILLEGAL_SHAPE_CENSUS: IsExact<AllIllegal, never> = true/.test(censusSrc));
  note('B1b the census result itself', 'bash qa/r57-doorforms.sh and qa/r57-kd106.sh — the four rows that evaded at 97f1fc1 all redden now; SEVEN NEW declaration forms do not (R57-1)');
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
  // **RE-CUT BY QA ROUND 57**, at both lines, for one ruling: §2.1 **A-78** Part 5 (R56-7) takes
  // `provenance` OUT of `DayMetaPatch`'s `Pick` and out of `DAY_META_PATCH_KEYS`, and puts it into
  // `FORBIDDEN_DAY_META_PATCH_KEYS` with `updateStop`'s reason verbatim — *"provenance turns a
  // system suggestion into the user's own plan"*. So the control's key list loses `provenance`, and
  // gains the assertion that it is now REFUSED with the stop door's own sentence.
  ok('G4  CONTROL: every legal DayMetaPatch key is still accepted',
    threw(() => core.setDayMeta(t, '2026-08-08', {
      primaryCity: 'v', cities: ['v'], title: 'A', subtitle: 'B', legacyFlag: true, tzId: 'Europe/Vienna',
    })) === null);
  const provE = threw(() => core.setDayMeta(t, '2026-08-08', { provenance: PROV }));
  ok('G4a ...and `provenance` is now refused, with updateStop\'s reason verbatim (A-78 Part 5)',
    provE !== null && /acceptCandidate/.test(provE.message) && /rejectCandidate/.test(provE.message),
    provE ? provE.message.slice(0, 100) : 'ACCEPTED');
  // The runtime allowlist WAS a hand-maintained second copy of the `Pick`; R56-6's fix pinned it to
  // the type (`Record<keyof DayMetaPatch, true>`), so the compiler now holds the two together and
  // this line reads the new shape rather than the old array literal.
  const daysSrc = readFileSync(resolve(CAIRN, 'packages/core/src/build/days.ts'), 'utf8');
  const pick = (daysSrc.match(/DayMetaPatch = Partial<Pick<Day, ([^>]*)>>/) || [])[1] || '';
  const picked = [...pick.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
  const listedBlock = (daysSrc.match(/DAY_META_PATCH_KEYS: Record<keyof DayMetaPatch, true> = \{([^}]*)\}/s) || ['', ''])[1];
  const listed = [...listedBlock.matchAll(/(\w+):\s*true/g)].map((m) => m[1]).sort();
  ok('G5  the runtime allowlist and the compile-time Pick agree TODAY', JSON.stringify(picked) === JSON.stringify(listed), { picked, listed });
  ok('G5a ...and `provenance` is in neither', !picked.includes('provenance') && !listed.includes('provenance'), { picked, listed });
  // **RE-CUT BY QA ROUND 57** — both gaps were ruled and built. R56-6's fix (commit `ba6f1e9`)
  // pins the constant to the type; R56-7 / A-78 Part 5 takes `provenance` out of the `Pick`.
  ok('G5a the constant is pinned to the type, so the two cannot drift (R56-6 closed)',
    /DAY_META_PATCH_KEYS: Record<keyof DayMetaPatch, true>/.test(daysSrc));
  ok('G5b `provenance` is forbidden on a Day patch by name, as it is on a stop (R56-7 closed)',
    /FORBIDDEN_DAY_META_PATCH_KEYS[\s\S]{0,400}provenance/.test(daysSrc));
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
  // **RE-CUT BY QA ROUND 57.** These three lines are the ones that MEASURED R56-5, and their
  // verdict has changed by ruling rather than by regression: §2.1 **A-78** Part 4 (revision 59,
  // ROADMAP I-17) gives `setTripMeta` an `assertPatchable` on `setDayMeta`'s model, refusing (a) a
  // key outside `TripMetaPatch`'s `Pick` and (b) any key of it PRESENT with the value `undefined`.
  // So the old `gap` is gone and what replaces it asserts the NEW correct behaviour — including
  // the half the old lines only `note`d, which is that the tolerance hole was never about
  // `datePrecision` alone but about every field with a parser default.
  const undef = threw(() => core.setTripMeta(monthTrip, { datePrecision: undefined }));
  ok('H5a setTripMeta({datePrecision: undefined}) is REFUSED (was: silently wrote `exact`)', undef !== null,
    'R56-5 has regressed — a stated precision is being reset with no refusal and no notice');
  ok('H5b ...with A-78 Part 4 clause (b)\'s reason, and it is a plain Error',
    undef !== null && undef instanceof Error && !(undef instanceof core.TripParseError)
      && /may not be patched to `undefined`/.test(undef.message) && /omit the key/.test(undef.message),
    undef && undef.message.slice(0, 110));
  ok('H5b2 ...and the trip the caller still holds reads `month`', monthTrip.datePrecision === 'month');
  // Clause (b) is a FAMILY rule, not a guard for one field: every field with a parser tolerance is
  // a hole of the same shape. All ten keys of the `Pick`, both directions.
  const TEN = ['title', 'startDate', 'endDate', 'datePrecision', 'homeCurrency', 'homeBase', 'party', 'cities', 'ownerId', 'meta'];
  const accepted = TEN.filter((k) => threw(() => core.setTripMeta(monthTrip, { [k]: undefined })) === null);
  ok('H5c all ten TripMetaPatch keys are refused when present with `undefined`', accepted.length === 0, accepted);
  // Clause (a), and the vacuity control that a REAL value still goes through.
  const outside = threw(() => core.setTripMeta(monthTrip, { revision: 99 }));
  ok('H5d a key outside the `Pick` is refused by name', outside !== null && /not a field of TripMetaPatch/.test(outside.message),
    outside && outside.message.slice(0, 90));
  ok('H5e control — a real value is still accepted at every one of the ten keys',
    core.setTripMeta(monthTrip, { datePrecision: 'exact' }).datePrecision === 'exact'
      && core.setTripMeta(monthTrip, { title: 'Renamed' }).title === 'Renamed');
  // The `cities` `Array.isArray` half A-78 Part 4 keeps: the one shape `commit`'s per-collection
  // walk cannot see, because it walks a collection rather than parsing the `Trip` whole.
  const nonArray = threw(() => core.setTripMeta(monthTrip, { cities: 'nope' }));
  ok('H5f the `cities` Array.isArray check survives beside the new allowlist',
    nonArray !== null && /must be an array/.test(nonArray.message), nonArray && nonArray.message.slice(0, 80));
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
  // **RE-CUT BY QA ROUND 57.** This line asserted A-77 Part 9's sentence, which §2.1 **A-78**
  // Part 6 (R56-9) has since STRUCK: *"the pointer comparisons … allocate nothing"* is false and
  // the ruling replaces it with a measured bound rather than rebuilding the mechanism —
  // *"a door that appends to a collection pays one allocation linear in that collection"*, with a
  // stated **reopening trigger** of any door above **10 ms** on a document inside A-35's cap. So
  // what is asserted is the bound that now stands, and the trigger, instead of the withdrawn claim.
  note('I3a addStop IS linear in the collection, per A-78 Part 6\'s corrected bound',
    `${stopRatio.toFixed(0)}× the stops → ${growth.toFixed(1)}× the time`);
  ok('I3a2 and A-78 Part 6\'s reopening trigger is NOT tripped: no door above 10 ms inside A-35\'s cap',
    last.addStop < 10 && last.setDayMeta < 10, curve);
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
  // **RE-CUT BY QA ROUND 57.** R56-3 was ruled and built: §2.1 **A-78** Part 3 DELETES `isIsoDate`
  // at both trip doors (`isIsoDate` itself is untouched and still has seven callers). What the gap
  // becomes is the assertion that the deletion happened AND that the caller now reads the parser's
  // own sentence — including KD-108's ordering, which is what makes that sentence the one that wins.
  const ctSrc = readFileSync(resolve(CAIRN, 'packages/core/src/build/createTrip.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  ok('J2d `isIsoDate` is deleted at both trip doors and the import with it (R56-3 closed)', !/isIsoDate/.test(ctSrc));
  ok('J2d2 ...and a mistyped month is answered by the PARSER, naming `$.startDate`',
    roll !== null && /expected a real calendar date in YYYY-MM-DD/.test(roll.message) && roll.message.includes('$.startDate'),
    roll && roll.message.slice(0, 110));
  ok('J2d3 ...with neither A-35\'s span cap nor the ordering check pre-empting it (KD-108)',
    roll !== null && !/would cover/.test(roll.message) && !/precedes startDate/.test(roll.message),
    roll && roll.message.slice(0, 110));

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
