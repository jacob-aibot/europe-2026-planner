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
 * A `FAIL` line is a finding. `note` records a measurement. The run always ends with `COMPLETE`.
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
import { readFileSync, writeFileSync } from 'node:fs';

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
  return { label, verdict: 'clean', detail: '' };
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
  const t = mk();
  for (const v of ['fortnight', '', 7, null, undefined, {}, 'EXACT']) {
    const e = threw(() => core.setTripMeta(t, { datePrecision: v }, CTX()));
    ok(`C1  assertDatePrecision still refuses ${JSON.stringify(v) ?? 'undefined'}`,
      e !== null && /datePrecision must be one of/.test(String(e.message)), String(e?.message).slice(0, 90));
  }
  ok('C1a ...and every legal value still passes',
    ['exact', 'month', 'year'].every((v) => threw(() => core.setTripMeta(t, { datePrecision: v }, CTX())) === null));
  ok('C1b createTrip keeps the same guard',
    threw(() => core.createTrip({ title: 'x', startDate: '2026-08-07', endDate: '2026-08-08', datePrecision: 'fortnight', cities: [] }, CTX())) !== null);

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
  ok('D3  an invalid STOP is refused and the message names copyStopInto, not addStop',
    eStop !== null && /copyStopInto: this stop/.test(String(eStop?.message)) && !/addStop/.test(String(eStop?.message)),
    String(eStop?.message).slice(0, 110));
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
  // E1 — the directory census collects `/^export\s+(?:async\s+)?function\s+(\w+)/`. Three other
  // ways to export a build door from the same directory are invisible to it. This is A-76 Part 6
  // item 1's claim — *"a new build function ... reddens it on the commit that adds it"* — and
  // Part 7 M3's criterion.
  const POOL = resolve(CAIRN, 'packages/core/src/build/pool.ts');
  const original = readFileSync(POOL, 'utf8');
  const FORMS = {
    'export const arrow': '\nexport const arrowDoor = (trip: Trip): Trip => trip;\n',
    'export { name } list': '\nfunction listedDoor(trip: Trip): Trip { return trip; }\nexport { listedDoor };\n',
    'export default function': '\nexport default function defaultDoor(trip: Trip): Trip { return trip; }\n',
  };
  const evaded = [];
  try {
    for (const [name, src] of Object.entries(FORMS)) {
      writeFileSync(POOL, original + `\n// r55 fault injection\n${src}`);
      const { spawnSync } = await import('node:child_process');
      const r = spawnSync(process.execPath, ['--test', 'packages/core/test/storable.test.ts'], { cwd: CAIRN, encoding: 'utf8' });
      const green = /\n# fail 0\n/.test(r.stdout);
      if (green) evaded.push(name);
      note(`E1  new exported build door as \`${name}\``, green ? 'census stays GREEN — evaded' : 'census goes RED');
    }
  } finally {
    writeFileSync(POOL, original);
  }
  eq('E1a A-76 Part 6.1: EVERY form of a new exported build door reddens the directory census', evaded, []);

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
  let n = 0;
  const getterBooking = { ...GOOD_BOOKING, get kind() { return n++ === 0 ? 'train' : 'spaceship'; } };
  const r1 = census('upsertBooking, flip-on-second-read getter', () => core.upsertBooking(mk(), getterBooking));
  note('H1  a getter that passes the parse and stores something else', `${r1.verdict} ${r1.detail}`);
  ok('H1a a value the parser refused cannot be stored, however it is read', r1.verdict === 'REFUSED',
    'assertStorable validated one value and the door stored another');

  const shared = { ...GOOD_BOOKING, id: 'b2' };
  const doc = core.upsertBooking(mk(), shared);
  ok('H2  upsertBooking stores the caller\'s own object by reference', doc.bookings[0] === shared);
  shared.kind = 'spaceship';                       // the form the user is still editing
  const r2 = census('upsertBooking, caller mutates after the check', () => doc);
  ok('H2a mutating the caller\'s object afterwards cannot corrupt the document', r2.verdict === 'clean',
    `${r2.verdict} at ${r2.detail}`);

  let m = 0;
  const getterPlace = { id: 'pl-1', cityKey: 'v', name: 'X', at: null, get category() { return m++ === 0 ? 'sight' : 'transport'; } };
  const r3 = census('addPlace, flip-on-second-read getter', () => buildStops.addPlace(mk(), getterPlace));
  ok('H3  addPlace has the same window', r3.verdict === 'REFUSED', `${r3.verdict} at ${r3.detail}`);
  note('H4  the doors that are NOT exposed build a fresh record field by field',
    'addStop/updateStop/moveStop/addPhoto/updatePhoto/addParticipant/updateParticipant/copyStopInto');
}

console.log(`\nCOMPLETE  fails=${fails} notes=${notes}`);
if (failLines.length) console.log('FAILING:\n  ' + failLines.join('\n  '));
process.exitCode = fails ? 1 : 0;
