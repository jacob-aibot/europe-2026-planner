/**
 * QA round 55 — the adversarial pass over ROADMAP **I-15** / §2.1 **A-76**
 * (*a build door asks the parser what a record may hold*), commit `6687118`.
 *
 *   node --experimental-strip-types cairn/qa/r55-a76.mjs
 *
 * A-76's claim is not "eight fields are guarded" — it is that **the class is closed**: *"what a
 * door accepts and what the parser accepts are the same set by construction — at every field,
 * including the ones nobody enumerated, and at every field added later."* This probe attacks that
 * claim rather than re-confirming the eight.
 *
 * A `FAIL` line is a finding. `gap` is a routed, open design question. `note` records a
 * measurement. The run always ends with `COMPLETE`.
 *
 * **RE-CUT AT QA ROUND 56 (`97f1fc1`, I-16 / §2.1 A-77).** A-77 supersedes parts of A-76, and six
 * sections of this file encoded A-76's world. Each was re-cut to what A-77 actually specifies, and
 * each carries a vacuity control so the new green is not the assertion being weakened:
 *
 *   §C1  `assertDatePrecision` is DELETED (A-77 Part 4). The property that survives is that the
 *        door still refuses a bad `datePrecision` — now through `parseTripEnvelope`, at
 *        `$.datePrecision`, with *"cannot be stored"*. `undefined` is the one value that changed
 *        verdict and it is a `gap` (R56-5 / KD-104), not a FAIL.
 *   §D3  KD-102: `copyStopInto`'s own stop guard is deleted, so the stop refusal now names
 *        `addStop`. The refusal, its path and the harm it prevents are unchanged; only the
 *        attribution moved, and that is a `gap` (R56-8), not a FAIL.
 *   §E1  the source-text collector A-76 Part 6 owned no longer exists. What survives here is the
 *        MODULE census (a new FILE in `build/`), which is cheap; the syntax half is the
 *        compiler's now and is measured in `qa/r56-census.sh`, with R56-1 and R56-2.
 *   §H1a/§H3  A-77 Part 3 rule 5 rules the OPPOSITE of what round 55 asserted: the getter is read
 *        ONCE and the value it returned is what is stored, so `clean` is correct and the check is
 *        that the STORED value is the READ value.
 *   §H2  round 55 asserted `doc.bookings[0] === shared` — *"the door stores the caller's own
 *        object"*. That assertion IS the R55-5 defect; A-77 substitutes, so it is now inverted.
 *
 * Section index
 *   A  **KD-100** — `kind: null` vs `kind: undefined` at `addParticipant`/`updateParticipant`
 *   B  the three DELETED guards, re-attacked with the exact inputs they were built to catch
 *   C  the two KEPT guards — unchanged refusals, and `assertBuiltAttach`'s ordering
 *   D  `copyStopInto`'s double guard — both checks necessary, and which fires first
 *   E  the two standing censuses — three export forms that evade the directory census, and the
 *      per-door/per-field gap the behavioural census cannot see
 *   F  **the eleventh-door hunt** — every exempt row and every trip-level scalar, driven
 *      door → `toJSON` → `fromJSON`, in round 54 §M6's shape
 *   G  the blast radius of F's survivors, through the REAL store (round 54 §M8's shape)
 *   H  the TOCTOU window the builder disclosed — is it exploitable, or theoretical?
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

let fails = 0, notes = 0;
const failLines = [];
const ok = (l, c, d) => {
  if (c) console.log(`ok   ${l}`);
  else { fails++; failLines.push(l); console.log(`FAIL ${l}${d === undefined ? '' : ` — ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); }
};
const eq = (l, a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); ok(l, x === y, x === y ? undefined : `got ${x} want ${y}`); };
const note = (l, d) => { notes++; console.log(`note ${l}${d === undefined ? '' : ` — ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); };
/** A routed, open design question — never a FAIL. Added in the round-56 re-cut. */
let gaps = 0;
const gap = (l, d) => { gaps++; console.log(`gap  ${l}${d === undefined ? '' : ` — ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); };
const section = (n) => console.log(`\n=== ${n} ===`);
const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };
const threwAsync = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };

const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
const client = await import(resolve(CAIRN, 'packages/client/src/index.ts'));
// `addPlace` is NOT on §2.10's surface; the door is reachable only in-process, exactly as
// `packages/core/test/storable.test.ts` reaches it.
const buildStops = await import(resolve(CAIRN, 'packages/core/src/build/stops.ts'));

const TODAY = '2026-08-01';
let seq = 0;
const CTX = () => ({ ids: core.sequentialIds(`r55-${++seq}-`), now: TODAY, actorUserId: 'local:self' });
const mk = (over = {}) => core.createTrip({
  title: 'Door', startDate: '2026-08-07', endDate: '2026-08-09',
  cities: [{ key: 'v', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
  ...over,
}, CTX());
const sched = (t, i = 0) => ({ kind: 'scheduled', dayId: t.days[i].id, time: null, order: 0 });
const withStop = (over = {}) => {
  const t0 = mk();
  return core.addStop(t0, sched(t0), { name: 'Belvedere', category: 'sight', ...over }, CTX());
};

/**
 * The round-54 §M6 oracle, which is the one this whole increment exists to satisfy: call the
 * door, serialise what it returned, and try to open it again.
 *
 *   REFUSED       — the door threw. A-76 working.
 *   UNSERIALISABLE— `toJSON` threw. Degrades honestly (A-76 Part 1's ninth case).
 *   UNOPENABLE    — it saved and can never be opened again. **This is the defect class.**
 */
function census(label, fn) {
  let doc = null;
  const doorErr = threw(() => { doc = fn(); });
  if (doorErr) return { label, verdict: 'REFUSED', detail: doorErr.message.slice(0, 70) };
  let bytes = null;
  const serErr = threw(() => { bytes = core.toJSON(doc); });
  if (serErr) return { label, verdict: 'UNSERIALISABLE', detail: serErr.message.slice(0, 50) };
  const parseErr = threw(() => core.fromJSON(bytes));
  if (parseErr) return { label, verdict: 'UNOPENABLE', detail: parseErr.path ?? parseErr.message.slice(0, 50) };
  // `doc` added in the round-56 re-cut: §H now asserts WHAT was stored, not only that it opened.
  return { label, verdict: 'clean', detail: '', doc };
}

// =============================================================================================
section('A — KD-100: `kind: null` is a value the caller supplied, not an absent key');
// =============================================================================================
{
  const eNull = threw(() => core.addParticipant(mk(), { displayName: 'Marta', kind: null }, CTX()));
  ok('A1  addParticipant REFUSES `kind: null` (the deleted guard\'s behaviour, preserved)',
    eNull !== null && /\$\.kind/.test(String(eNull?.message)), String(eNull?.message).slice(0, 120));
  ok('A1a and it is a plain Error, never a TripParseError (A-76 Part 3\'s hard prohibition)',
    eNull instanceof Error && !(eNull instanceof core.TripParseError));
  const und = core.addParticipant(mk(), { displayName: 'Marta', kind: undefined }, CTX());
  eq('A2  `kind: undefined` still takes the default', und.participants[0].kind, 'contact');
  const abs = core.addParticipant(mk(), { displayName: 'Marta' }, CTX());
  eq('A2a an ABSENT key still takes the default', abs.participants[0].kind, 'contact');
  ok('A3  the `??` A-76 Part 4 states would have COERCED null — measured, not argued',
    (null ?? 'contact') === 'contact' && (undefined === undefined ? 'contact' : undefined) === 'contact');
  // The sibling door: `updateParticipant` writes on key PRESENCE, so `null` reaches the record.
  const t = core.addParticipant(mk(), { displayName: 'Marta' }, CTX());
  const pid = t.participants[0].id;
  ok('A4  updateParticipant refuses `{kind: null}` too',
    threw(() => core.updateParticipant(t, pid, { kind: null })) !== null);
  ok('A4a ...and `{kind: undefined}` (key present, no value) — R52-3\'s presence rule, unmoved',
    threw(() => core.updateParticipant(t, pid, { kind: undefined })) !== null);
  eq('A5  a null kind never reaches a stored document',
    census('addParticipant kind:null', () => core.addParticipant(mk(), { displayName: 'M', kind: null }, CTX())).verdict,
    'REFUSED');
}

// =============================================================================================
section('B — the three DELETED guards, attacked with the inputs they were built to catch');
// =============================================================================================
{
  // R52-3's list (assertParticipantKind), R52-2's list (assertDisplayName), R52-6's list
  // (assertNote). A-76 Part 4 claims each is SUBSUMED. Subsumed means every one of these is
  // still refused — the message may move, the refusal may not.
  const KIND = ['owner', 'OWNER', '', 7, true, {}, [], null, 'self ', 'Self'];
  const NAME = [undefined, 7, {}, [], null, true];
  const NOTE = [{}, [], 7, null, true, () => 1];
  const t = core.addParticipant(mk(), { displayName: 'Marta' }, CTX());
  const pid = t.participants[0].id;

  const kindSurvivors = KIND.filter((k) => threw(() => core.addParticipant(mk(), { displayName: 'M', kind: k }, CTX())) === null);
  eq('B1  assertParticipantKind: every value it refused is still refused at addParticipant', kindSurvivors, []);
  const kindSurvivors2 = KIND.filter((k) => threw(() => core.updateParticipant(t, pid, { kind: k })) === null);
  eq('B1a ...and at updateParticipant', kindSurvivors2, []);
  ok('B1b `self` and `contact` still go through — agreement, not strictness',
    threw(() => core.updateParticipant(t, pid, { kind: 'self' })) === null &&
    threw(() => core.updateParticipant(t, pid, { kind: 'contact' })) === null);

  const nameSurvivors = NAME.filter((n) => threw(() => core.addParticipant(mk(), { displayName: n }, CTX())) === null);
  eq('B2  assertDisplayName: every value it refused is still refused at addParticipant', nameSurvivors, []);
  const nameSurvivors2 = NAME.filter((n) => threw(() => core.updateParticipant(t, pid, { displayName: n })) === null);
  eq('B2a ...and at updateParticipant (R52-2\'s own repro)', nameSurvivors2, []);
  ok('B2b `\'\'` is still NOT refused — an empty name is validateTrip\'s to report (§2.9)',
    threw(() => core.addParticipant(mk(), { displayName: '' }, CTX())) === null);

  const noteSurvivors = NOTE.filter((n) => threw(() => core.updateParticipant(t, pid, { note: n })) === null);
  eq('B3  assertNote: every value it refused is still refused (R52-6\'s list)', noteSurvivors, []);
  ok('B3a `{note: undefined}` still REMOVES the note rather than being refused (the asymmetry)',
    core.updateParticipant(t, pid, { note: undefined }).participants[0].note === undefined);
  ok('B3b an empty-string note is still legal',
    core.updateParticipant(t, pid, { note: '' }).participants[0].note === '');
  note('B4  the refusal MESSAGE moved, which is what reddens the round-52/53 probes',
    String(threw(() => core.updateParticipant(t, pid, { kind: 'owner' }))?.message).slice(0, 100));
}

// =============================================================================================
section('C — the two KEPT guards: identical refusals, and the ordering claim');
// =============================================================================================
{
  // RE-CUT AT ROUND 56. `assertDatePrecision` is deleted (A-77 Part 4: its premise was cost, and
  // `parseTripEnvelope` is O(1) and asks exactly the parser). The property that must survive is
  // the REFUSAL, not the guard's own sentence — so this asserts the refusal, its path and its
  // shape, and pins the message that replaced it.
  const t = mk({ datePrecision: 'month' });
  for (const v of ['fortnight', '', 7, null, {}, 'EXACT']) {
    const e = threw(() => core.setTripMeta(t, { datePrecision: v }, CTX()));
    ok(`C1  a bad datePrecision is still refused at the door: ${JSON.stringify(v) ?? 'undefined'}`,
      e !== null && /cannot be stored/.test(String(e.message)) && /\$\.datePrecision/.test(String(e.message)),
      String(e?.message).slice(0, 100));
  }
  ok('C1a ...and every legal value still passes',
    ['exact', 'month', 'year'].every((v) => threw(() => core.setTripMeta(t, { datePrecision: v }, CTX())) === null));
  ok('C1b createTrip keeps the same refusal',
    /cannot be stored/.test(String(threw(() => core.createTrip({ title: 'x', startDate: '2026-08-07', endDate: '2026-08-08', datePrecision: 'fortnight', cities: [] }, CTX()))?.message)));
  ok('C1c the refusal is a plain Error, never a TripParseError (A-76 Part 3\'s hard prohibition)',
    !(threw(() => core.setTripMeta(t, { datePrecision: 'fortnight' }, CTX())) instanceof core.TripParseError));
  // The seventh value of round 55's list, which changed verdict rather than message.
  const undef = threw(() => core.setTripMeta(t, { datePrecision: undefined }, CTX()));
  note('C1d setTripMeta({datePrecision: undefined}) on a month trip',
    undef ? `REFUSED: ${String(undef.message).slice(0, 60)}` : `accepted → ${core.setTripMeta(t, { datePrecision: undefined }, CTX()).datePrecision}`);
  gap('C1e a present-but-undefined patch key silently resets a stated precision',
    'KD-104 / R56-5. No document becomes unopenable; the user\'s "I only know the month" becomes "exact" with no refusal and no notice, and the three other patch doors refuse a present-but-undefined key. The fix is TripMetaPatch joining the patch-allowlist family, which is a ruling');

  const D = { w: 10, h: 10, bytes: 100 };
  const ePlace = threw(() => core.addPhoto(t, { attach: { kind: 'place', placeId: 'p1' }, thumb: D, display: D }, CTX()));
  ok('C2  assertBuiltAttach still refuses a place attachment',
    ePlace !== null && /not built/.test(String(ePlace.message)), String(ePlace?.message).slice(0, 90));
  const legit = core.addPhoto(t, { thumb: D, display: D }, CTX());
  ok('C2a and the PARSER still accepts one — the guard is the opposite property, not a copy',
    threw(() => core.fromJSON(core.toJSON({
      ...legit, photos: [{ ...legit.photos[0], attach: { kind: 'place', placeId: 'p1' } }],
    }))) === null);
  // Ordering: a photo that is BOTH place-attached AND unparseable must report the deferral.
  const both = threw(() => core.addPhoto(t, { attach: { kind: 'place', placeId: 'p1' }, caption: 42, thumb: D, display: D }, CTX()));
  ok('C2b when both guards would fire, the DEFERRAL is the message the caller sees (Part 5\'s "first")',
    /not built/.test(String(both?.message)), String(both?.message).slice(0, 90));
  const upd = core.addPhoto(t, { id: 'ph-2', thumb: D, display: D }, CTX());
  ok('C2c updatePhoto keeps it too',
    /not built/.test(String(threw(() => core.updatePhoto(upd, 'ph-2', { attach: { kind: 'place', placeId: 'p1' } }))?.message)));
}

// =============================================================================================
section('D — copyStopInto\'s double guard: necessity and order');
// =============================================================================================
{
  const friend = (mutate) => {
    const c = CTX();
    let t = core.createTrip({
      id: 'trip-marta', title: 'Marta', startDate: '2026-08-07', endDate: '2026-08-09', ownerId: 'user:marta',
      cities: [{ key: 'wien-m', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
    }, c);
    t = buildStops.addPlace(t, { id: 'pl-m', cityKey: 'wien-m', name: 'Belvedere', at: { lat: 48.19, lng: 16.38 }, category: 'sight' });
    t = core.addStop(t, { kind: 'scheduled', dayId: t.days[0].id, time: '10:00', order: 0 },
      { id: 'stop-m', name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'pl-m' } }, c);
    return mutate ? mutate(t) : t;
  };
  const poisonStop = (field, value) => (t) => ({
    ...t, days: t.days.map((d) => ({ ...d, stops: d.stops.map((s) => (s.id === 'stop-m' ? { ...s, [field]: value } : s)) })),
  });
  const poisonPlace = (field, value) => (t) => ({ ...t, places: t.places.map((p) => ({ ...p, [field]: value })) });
  const copy = (src) => {
    const target = mk();
    const c = CTX();
    return core.copyStopInto(target, { trip: src, stopId: 'stop-m' },
      { kind: 'scheduled', dayId: target.days[0].id, time: '10:00', order: 0 },
      { ids: c.ids, today: TODAY, actorUserId: 'local:self' });
  };

  ok('D1  a clean copy still works', threw(() => copy(friend())) === null);
  // The PLACE check, with the stop itself entirely valid — this is the check `addStop` could
  // never have made, because `addStop` never sees the place row.
  const ePlace = threw(() => copy(friend(poisonPlace('category', 'transport'))));
  ok('D2  an invalid PLACE is refused even when the copied stop is fully valid',
    ePlace !== null && /copyStopInto: this place/.test(String(ePlace?.message)), String(ePlace?.message).slice(0, 110));
  const eHours = threw(() => copy(friend(poisonPlace('hours', 'mon-fri 9-5'))));
  note('D2a a friend\'s malformed `hours` string', eHours ? `REFUSED: ${String(eHours.message).slice(0, 80)}` : 'copied (sanitised by placeForCopy)');
  // The STOP check, which `addStop` would also have caught — it exists so the refusal names the
  // door the caller actually called.
  const eStop = threw(() => copy(friend(poisonStop('category', 'transport'))));
  // RE-CUT AT ROUND 56 (KD-102). A-77 deletes `copyStopInto`'s own stop guard, so the refusal is
  // raised by `addStop`'s own `commit`. What must hold is the REFUSAL and the harm it prevents;
  // the door NAME is the part that moved.
  ok('D3  an invalid STOP copied from a friend is still refused, at the parser\'s own path',
    eStop !== null && /this stop cannot be stored/.test(String(eStop?.message)) && /\$\.category/.test(String(eStop?.message)),
    String(eStop?.message).slice(0, 110));
  ok('D3a the refusal still carries a locator naming where in the document it sat',
    /\(days\[\d+\]\.stops\[\d+\]\)/.test(String(eStop?.message)), String(eStop?.message).slice(-40));
  gap('D3b the refusal names `addStop`, a door the caller never called',
    'KD-102 / R56-8. `copyStopInto` delegates to `addStop`, which is itself a door and commits first. `apps/web/src/views/BrowsePane.tsx:28` renders this message verbatim, so it is user-visible — but nothing pattern-matches the door name, so the consequence is diagnostic, not functional. Same open question at reorderStop / returnToPool / scheduleFromPool');
  // Ordering: both poisoned at once. The place is minted first, so the place must be the message.
  const both = threw(() => copy(friend((t) => poisonStop('category', 'transport')(poisonPlace('category', 'transport')(t)))));
  ok('D4  when both are poisoned the PLACE refusal comes first (it is minted first)',
    /this place/.test(String(both?.message)), String(both?.message).slice(0, 110));
  // Purity: a refusal leaves the recipient's document untouched and consumes no visible state.
  const target = mk();
  const before = core.toJSON(target);
  const c2 = CTX();
  threw(() => core.copyStopInto(target, { trip: friend(poisonStop('category', 'transport')), stopId: 'stop-m' },
    { kind: 'scheduled', dayId: target.days[0].id, time: '10:00', order: 0 },
    { ids: c2.ids, today: TODAY, actorUserId: 'local:self' }));
  eq('D5  a refused copy leaves the recipient\'s document byte-identical', core.toJSON(target), before);
}

// =============================================================================================
section('E — the two standing censuses: what still gets past them');
// =============================================================================================
{
  // RE-CUT AT ROUND 56. A-76's source-text collector — the `/^export\s+function/` regex round 55
  // evaded three ways — **no longer exists**: A-77 Part 6 replaces it with a type-level census the
  // COMPILER enforces plus a runtime MODULE census that reads the directory. So the syntax half is
  // not a test any more and is not measurable here; it is `npm run typecheck`, driven in
  // `qa/r56-census.sh` over nine declaration syntaxes (round 55's three, the builder's four and
  // five more), all of which go red.
  //
  // What IS still a test, and is what this section keeps: the MODULE census, i.e. a new FILE.
  const { spawnSync } = await import('node:child_process');
  const censusGreen = () => /\n# fail 0\n/.test(
    spawnSync(process.execPath, ['--test', 'packages/core/test/storable.test.ts'], { cwd: CAIRN, encoding: 'utf8' }).stdout,
  );
  ok('E1  CONTROL: with nothing injected the module census is green', censusGreen());
  const NEWFILE = resolve(CAIRN, 'packages/core/src/build/__r55_sneaky.ts');
  let greenWithNewFile = null;
  try {
    writeFileSync(NEWFILE, 'import type { Trip } from "../model/types.ts";\nexport function sneakyDoor(t: Trip): Trip { return t; }\n');
    greenWithNewFile = censusGreen();
  } finally {
    rmSync(NEWFILE, { force: true });
  }
  ok('E1a a NEW FILE in packages/core/src/build/ reddens the module census (A-77 Part 6.2 / N3)',
    greenWithNewFile === false, 'the module census stayed green');
  note('E1b the syntax half is the compiler\'s now', 'bash qa/r56-census.sh — 14 rows, one full typecheck each');
  gap('E1c the census still enumerates FILES by hand',
    'R56-1. Half 2 reads build/*.ts plus EXTRA_DOOR_FILES = [conflict/resolve.ts]; a door in any other file under packages/core/src is invisible to BOTH halves, which is the conflict/resolve.ts failure that decided A-77 Part 2, one level up');
  gap('E1d the classifier is an EXACT return type',
    'R56-2. `(t: Trip) => Trip | null` and `async (t: Trip) => Promise<Trip>` are not doors to `ReturnsTrip`, and a Phase 3 ingest worker is async by construction');

  // E2 — the behavioural census is one hostile value per DOOR. A door whose `assertStorable`
  // call is present but does not cover one of the fields it writes is invisible to it. Part 5's
  // `setDayMeta` elision is exactly such a field.
  const t0 = mk();
  const t = core.addStop(t0, sched(t0), { name: 'Real work', category: 'sight' }, CTX());
  const good = t.days[0].stops[0];
  const poisoned = threw(() => core.setDayMeta(t, t.days[0].id, { stops: [{ ...good, category: 'transport' }] }));
  ok('E2  setDayMeta refuses a `stops` key carrying a record the parser refuses',
    poisoned !== null,
    'the `stops: []` elision hides the injected stops from parseDay, and the merged Day is committed with them');
  note('E2a and the census stays green while it does — one hostile value per door cannot see this',
    'storable.test.ts fires $.legacyFlag at setDayMeta and passes');
}

// =============================================================================================
section('F — the eleventh-door hunt: every exempt row, and every trip-level scalar');
// =============================================================================================
{
  const stopOf = (t) => t.days[0].stops[0];
  const tWithStop = withStop();
  const rows = [
    // --- Part 5's EXEMPT rows, attacked at the caller value each one actually reads.
    ['acceptCandidate · at (stop)', () => core.acceptCandidate(tWithStop, { kind: 'stop', id: stopOf(tWithStop).id }, 'local:self', 42)],
    ['acceptCandidate · at (day)', () => core.acceptCandidate(mk(), { kind: 'day', id: mk().days[0].id }, 'local:self', 42)],
    ['rejectCandidate · at (stop)', () => core.rejectCandidate(tWithStop, { kind: 'stop', id: stopOf(tWithStop).id }, 'local:self', 42)],
    ['ensureDays/blankDay · ctx.now', () => core.createTrip({ title: 'x', startDate: '2026-08-07', endDate: '2026-08-08', cities: [] }, { ids: core.sequentialIds('n'), now: 42, actorUserId: 'local:self' })],
    ['ensureDays · ctx.now on a range change', () => core.setTripMeta(mk(), { endDate: '2026-08-20' }, { ids: core.sequentialIds('n2'), now: 42, actorUserId: 'local:self' })],
    ['linkBooking · bookingId', () => core.linkBooking(tWithStop, stopOf(tWithStop).id, null)],
    ['returnToPool · cityKey', () => core.returnToPool(tWithStop, stopOf(tWithStop).id, 42)],
    ['scheduleFromPool · hint.time', () => {
      const pooled = core.moveStop(tWithStop, stopOf(tWithStop).id, { kind: 'pool', cityKey: 'v' });
      return core.scheduleFromPool(pooled, pooled.pool[0].id, { dayId: pooled.days[0].id, time: 42, order: 0 });
    }],
    // --- Part 5's ELISION, which is a checked row with one field the check cannot see.
    ['setDayMeta · stops (the elision)', () => {
      const t = withStop();
      return core.setDayMeta(t, t.days[0].id, { stops: [{ ...t.days[0].stops[0], category: 'transport' }] });
    }],
    ['setDayMeta · stops non-array', () => core.setDayMeta(mk(), mk().days[0].id, { stops: 'nope' })],
    // --- trip-level scalars. A-76 Part 2: *"a trip-level scalar is not a record class and keeps
    //     its own guard."* Only `datePrecision` and the two dates have one.
    ['setTripMeta · title', () => core.setTripMeta(mk(), { title: 42 }, CTX())],
    ['setTripMeta · homeCurrency', () => core.setTripMeta(mk(), { homeCurrency: 7 }, CTX())],
    ['setTripMeta · ownerId', () => core.setTripMeta(mk(), { ownerId: 7 }, CTX())],
    ['setTripMeta · party', () => core.setTripMeta(mk(), { party: 'two' }, CTX())],
    ['setTripMeta · homeBase', () => core.setTripMeta(mk(), { homeBase: { lat: 'north', lng: 16 } }, CTX())],
    ['setTripMeta · meta', () => core.setTripMeta(mk(), { meta: 7 }, CTX())],
    ['createTrip · title', () => core.createTrip({ title: 42, startDate: '2026-08-07', endDate: '2026-08-08', cities: [] }, CTX())],
    ['createTrip · homeCurrency', () => core.createTrip({ title: 'x', homeCurrency: 7, startDate: '2026-08-07', endDate: '2026-08-08', cities: [] }, CTX())],
    ['createTrip · party', () => core.createTrip({ title: 'x', party: 'two', startDate: '2026-08-07', endDate: '2026-08-08', cities: [] }, CTX())],
    // --- controls: the ten fields A-76 was written for. These must all say REFUSED.
    ['CONTROL addStop · category', () => { const t = mk(); return core.addStop(t, sched(t), { name: 'x', category: 'transport' }, CTX()); }],
    ['CONTROL updateStop · category', () => core.updateStop(tWithStop, stopOf(tWithStop).id, { category: 'transport' })],
    ['CONTROL setDayMeta · legacyFlag', () => core.setDayMeta(mk(), mk().days[0].id, { legacyFlag: 'maybe' })],
    ['CONTROL upsertBooking · kind', () => core.upsertBooking(mk(), { id: 'b', tripId: 't', kind: 'spaceship', operator: 'o', reference: 'r', startsAt: { date: '2026-08-07', time: null }, price: null, party: null, status: 'active', ticket: null, provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: TODAY, acceptedAt: TODAY, actorUserId: 'local:self' } })],
    ['CONTROL setTripMeta · cities[].centre', () => core.setTripMeta(mk(), { cities: [{ key: 'v', name: 'V', countryCode: 'AT', order: 0, centre: { lat: 'north', lng: 16 } }] }, CTX())],
    ['CONTROL moveStop · placement.cityKey', () => core.moveStop(tWithStop, stopOf(tWithStop).id, { kind: 'pool', cityKey: 42 })],
    ['CONTROL addParticipant · kind', () => core.addParticipant(mk(), { displayName: 'M', kind: 'goldfish' }, CTX())],
  ];
  const unopenable = [];
  for (const [label, fn] of rows) {
    const r = census(label, fn);
    note(`F   ${label}`, r.verdict === 'clean' ? 'accepted; the saved document still reopens' :
      r.verdict === 'REFUSED' ? 'REFUSED at the door' :
      r.verdict === 'UNSERIALISABLE' ? `accepted; toJSON THROWS (${r.detail})` :
      `accepted; the SAVED document is UNOPENABLE at ${r.detail}`);
    if (r.verdict === 'UNOPENABLE') unopenable.push(`${label} → ${r.detail}`);
  }
  eq('F1  ZERO build doors write a document that cannot be opened again (A-76\'s whole claim)', unopenable, []);
  note('F1a A-76 Part 1 measured EIGHT such fields and the architect found two more while ruling.',
    `this pass finds ${unopenable.length} still standing after the fix`);
}

// =============================================================================================
section('G — the blast radius of F\'s survivors, through the REAL store (round 54 §M8\'s shape)');
// =============================================================================================
{
  const mkPorts = () => ({
    storage: client.memoryStorage(), file: client.memoryFile(), photo: client.memoryPhotos(),
    clock: client.fixedClockPort(TODAY), ids: client.sequentialIdPort('r55-'),
    scheduler: client.immediateScheduler(),
  });
  const p = mkPorts();
  const s = client.createStore({ ports: p });
  await s.createTrip({ title: 'Two weeks of planning', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ key: 'v', name: 'V' }] });
  const id = s.getState().activeTripId;
  const dayId = s.getState().doc.days[0].id;
  s.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId, time: '09:00', order: 0 }, stop: { name: 'Work the user already did', category: 'sight' } });
  await s.flush();
  const goodBytes = p.storage.docs.get(id);
  ok('G0  the saved document parses before the bad edit', threw(() => core.fromJSON(goodBytes)) === null);

  // The one action in the shipped set that can carry F's worst survivor: `setDayMeta`, whose
  // patch is `any`-shaped at the action boundary exactly as `upsertBooking`'s booking was.
  const goodStop = s.getState().doc.days[0].stops[0];
  const dispatchErr = threw(() => s.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'Arrival', stops: [{ ...goodStop, category: 'transport' }] } }));
  ok('G1  the door REFUSES a setDayMeta patch carrying a stop the parser refuses', dispatchErr !== null,
    'accepted: the elision hid the injected stops from parseDay');
  await s.flush();
  note('G2  what the user is told after the write', s.getState().persistence.status);
  const stored = p.storage.docs.get(id);
  const reparse = threw(() => core.fromJSON(stored));
  note('G2a can the stored document be parsed?', reparse ? `NO — ${reparse.path}` : 'yes');
  ok('G3  the user is NOT told "saved" over a trip that can no longer be opened',
    !(s.getState().persistence.status === 'idle' && reparse !== null),
    `persistence.status is '${s.getState().persistence.status}' while the stored bytes no longer parse`);
  await s.closeTrip();
  const openErr = await threwAsync(() => s.openTrip(id));
  note('G4  openTrip after a reload', openErr ? `refuses: ${String(openErr.message).slice(0, 80)}` : 'opens');
  ok('G5  the whole trip — including the earlier work — is still reachable', openErr === null,
    openErr ? 'the trip cannot be opened; the only recovery is the A-46 rescue export' : undefined);
}

// =============================================================================================
section('H — the TOCTOU window the builder disclosed: exploitable, or theoretical?');
// =============================================================================================
{
  // `assertStorable` returns `void`, so a door that stores the CALLER'S object keeps no copy of
  // what the parser validated. Two doors do: `addPlace` and `upsertBooking`. No async gap and no
  // concurrency is needed — a getter is enough, and so is an ordinary shared reference.
  const GOOD_BOOKING = {
    id: 'b1', tripId: 't', kind: 'train', operator: 'o', reference: 'r',
    startsAt: { date: '2026-08-07', time: null }, price: null, party: null, status: 'active', ticket: null,
    provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: TODAY, acceptedAt: TODAY, actorUserId: 'local:self' },
  };
  // RE-CUT AT ROUND 56. Round 55 asserted `REFUSED` for a flip-on-second-read getter and
  // `doc.bookings[0] === shared` for a shared reference. A-77 Part 3 rule 5 rules the other way on
  // both: the parser rebuilds the record field by field, the getter is read ONCE, and `commit`
  // stores the parser's object. So the property to assert is *the stored value is the value that
  // was read*, and *the document does not hold the caller's object at all*.
  let n = 0;
  const getterBooking = { ...GOOD_BOOKING, get kind() { return n++ === 0 ? 'train' : 'spaceship'; } };
  const r1 = census('upsertBooking, flip-on-second-read getter', () => core.upsertBooking(mk(), getterBooking));
  note('H1  a getter that flips after the parse', `${r1.verdict} ${r1.detail ?? ''}`);
  ok('H1a the stored value is the value the parser READ, not a later read', r1.verdict === 'clean' && r1.doc.bookings[0].kind === 'train',
    `${r1.verdict} ${r1.verdict === 'clean' ? r1.doc.bookings[0].kind : (r1.detail ?? '')}`);
  let n2 = 0;
  const badFirst = { ...GOOD_BOOKING, id: 'b1x', get kind() { return n2++ === 0 ? 'spaceship' : 'train'; } };
  ok('H1b CONTROL: bad on the FIRST read is still refused, so H1a is not vacuous',
    census('bad first', () => core.upsertBooking(mk(), badFirst)).verdict === 'REFUSED');

  const shared = { ...GOOD_BOOKING, id: 'b2' };
  const doc = core.upsertBooking(mk(), shared);
  ok('H2  upsertBooking does NOT store the caller\'s own object — R55-5\'s defect, inverted',
    doc.bookings[0] !== shared);
  shared.kind = 'spaceship';                       // the form the user is still editing
  const r2 = census('upsertBooking, caller mutates after the check', () => doc);
  ok('H2a mutating the caller\'s object afterwards cannot corrupt the document', r2.verdict === 'clean',
    `${r2.verdict} at ${r2.detail}`);

  let m = 0;
  const getterPlace = { id: 'pl-1', cityKey: 'v', name: 'X', at: null, get category() { return m++ === 0 ? 'sight' : 'transport'; } };
  const r3 = census('addPlace, flip-on-second-read getter', () => buildStops.addPlace(mk(), getterPlace));
  ok('H3  addPlace stores what the parser read, and does not hold the caller\'s object',
    r3.verdict === 'clean' && r3.doc.places[r3.doc.places.length - 1].category === 'sight'
      && r3.doc.places[r3.doc.places.length - 1] !== getterPlace,
    `${r3.verdict} ${r3.detail ?? ''}`);
  let m2 = 0;
  const badPlace = { id: 'pl-2', cityKey: 'v', name: 'X', at: null, get category() { return m2++ === 0 ? 'transport' : 'sight'; } };
  ok('H3a CONTROL: addPlace still refuses bad-on-the-first-read',
    census('bad first place', () => buildStops.addPlace(mk(), badPlace)).verdict === 'REFUSED');
  gap('H3b commit\'s own reads are not once-per-slot',
    'R56-4. `commitList` reads `after[i]` for the aligned test and then `after.slice()` for its output — two reads of every index it did not parse. Reproduced in qa/r56-a77.mjs §E');
  note('H4  the doors that are NOT exposed build a fresh record field by field',
    'addStop/updateStop/moveStop/addPhoto/updatePhoto/addParticipant/updateParticipant/copyStopInto');
}

console.log(`\nCOMPLETE  fails=${fails} gaps=${gaps} notes=${notes}`);
if (failLines.length) console.log('FAILING:\n  ' + failLines.join('\n  '));
process.exitCode = fails ? 1 : 0;
