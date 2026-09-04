/**
 * QA rounds 52 and 53 — the adversarial pass over I-9 (participants in core, ARCHITECTURE §8.3),
 * re-cut at round 53 against `17da01a` (I-9a: A-72/A-73) and `20c1cd7` (round 52's repair pass).
 *
 * Run from anywhere: `node --experimental-strip-types cairn/qa/r52-participants.mjs`
 *
 * Every section is an attack, not a re-run of the builder's own tests. A `FAIL` line is a
 * finding; the script exits 1 if any section reports one. `note` lines are facts recorded
 * rather than expectations. A `GAP` line is a **known, routed, open** design question — it is
 * not a round-53 finding and does not fail the run; the terminal marker prints the count
 * separately so a reader can never confuse the two.
 *
 * The run always ends with a `COMPLETE` line (A-69 Part 9 / QA R49-2 / R51-5). **A run without
 * that line is INCOMPLETE and its counts may not be quoted.**
 *
 * ## What round 53 re-cut, and why
 *
 * 1. **Five call sites now wrapped in `threw()`.** R52-3 and R52-2 turned an out-of-enum `kind`
 *    and a `{displayName: undefined}` patch into throws at the build door. The round-52 probe
 *    called them bare, so the fixed product ABORTED the probe. §A, §B (×2) and §K (×2) now
 *    assert the refusal, which is what the finding asked for.
 * 2. **§C's three tripwires are INVERTED, as they were labelled to be.** A-73 removed the
 *    parser's duplicate-id refusal; §C now asserts that `fromJSON` OPENS such a document and
 *    that `validateTrip` is the one place that reports it.
 * 3. **§F is re-cut for A-72.** KD-96's downgrade channel is closed by `SCHEMA_VERSION = 3`, so
 *    the old build no longer silently drops participants — it refuses the document. §F asserts
 *    the refusal (and would have aborted the probe otherwise, a sixth abort site).
 * 4. **§L's fixture defect is fixed.** §L advanced the id factory for `remote` and not for
 *    `local`, so its own local document carried one id twice and the merge's rule 5 (an edit
 *    outranks a delete) fired on a collision the probe had minted. Every side now draws from a
 *    distinct id namespace, which is what the shipped `browserIds()` port gives.
 * 5. **`store.save?.()` is `store.flush()`.** There is no `save` method on the store; the
 *    optional call was a silent no-op in §E and §K, so neither section was testing the save it
 *    named. (It passed anyway because `immediateScheduler` had already written.)
 *
 * Section index
 *   A  updateParticipant's runtime allowlist — every escape shape, not just the tested one
 *   B  the type-legal corruption chain, now refused at the door (R52-2, R52-3) + KD-99's residue
 *   C  fromJSON against hand-crafted hostile documents (A-73's inverted tripwires, shapes)
 *   D  participation grants nothing — every read path, including the ones nobody wired
 *   E  undo/redo with participant edits INTERLEAVED with other record classes
 *   F  KD-96 / A-72: the downgrade, executed (needs a git worktree)
 *   G  the shipped sample really has no participant field content
 *   H  export surface: 86, counted, and every pinned site agrees
 *   I  U+200B parity with city_name_empty, measured on both
 *   J  a Trip that predates the field, on every reader (R52-5 and its disclosed residue)
 *   K  the untyped action boundary, through the real store
 *   L  mergeTrips — the two-tab path (QA P2-3's shape, one record class over) — R52-1
 *   M  what the two participant issues actually say (R52-4, R52-7)
 *   N  round 53: mergeById<Participant>'s COMPLETENESS — all five rules, three-way divergence,
 *      and the same scenario through the real store's conflict → mergeWithStored path
 *   O  round 53: assertParticipantKind's coverage — every other door that could write a `kind`
 *   P  round 53: participantName()'s coercion — does `''` ever reach storage?
 *   Q  round 53: R52-6's exact adversarial patches — `{note: undefined}` and `{note: {}}`
 *   R  round 53: A-72's migration ladder as an attack
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const REPO = resolve(CAIRN, '..');

const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);
const client = await import(pathToFileURL(join(CAIRN, 'packages/client/src/index.ts')).href);

let fails = 0;
let gaps = 0;
const ok = (n, c, x = '') => {
  if (!c) fails++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (c || x === '' ? '' : `\n         ${x}`));
};
/**
 * A known, routed, OPEN design question — not a round-53 finding. `gap()` never fails the run;
 * it exists so the assertion the probe was written for stays visible instead of being deleted
 * when it turns out to need a ruling rather than a fix.
 */
const gap = (id, n, c, x = '') => {
  if (!c) gaps++;
  console.log((c ? '  ok   ' : `  GAP  [${id}] `) + n + (c || x === '' ? '' : `\n         ${x}`));
};
const note = (n) => console.log('  note  ' + n);
const head = (s) => console.log(`\n== ${s}`);

/** A deterministic id factory. `start` gives each side of a merge its own namespace (see §L). */
const ids = (start = 0) => {
  let n = start;
  return { newId: (kind) => `${kind}-${++n}` };
};
const CTX = (start = 0) => ({ ids: ids(start), now: '2026-08-01', actorUserId: 'u:jacob' });
/** `toJSON` returns a string; every section here wants the object. */
const docOf = (t) => JSON.parse(core.toJSON(t));

function trip() {
  return core.createTrip(
    {
      title: 'T',
      startDate: '2026-08-07',
      endDate: '2026-08-09',
      cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }],
      ownerId: 'u:jacob',
    },
    CTX(),
  );
}
function withOne(name = 'Zoë') {
  const ctx = CTX();
  const t = core.addParticipant(trip(), { displayName: name }, ctx);
  return [t, t.participants[0].id];
}
const threw = (fn) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
};
const memPorts = (prefix = '') => ({
  storage: client.memoryStorage(),
  file: client.memoryFile(),
  clock: client.fixedClockPort('2026-08-01'),
  ids: client.sequentialIdPort(prefix),
  scheduler: client.immediateScheduler(),
});

// ---------------------------------------------------------------- A
head('A  updateParticipant — every escape shape');
{
  const [t, id] = withOne();

  for (const [label, patch] of [
    ['plain id', { id: 'participant-999' }],
    ['id: undefined', { id: undefined }],
    ['userId', { userId: 'u:victim' }],
    ['userId: null', { userId: null }],
    ['id via Object.defineProperty (enumerable)', (() => { const p = {}; Object.defineProperty(p, 'id', { value: 'x', enumerable: true }); return p; })()],
  ]) {
    const e = threw(() => core.updateParticipant(t, id, patch));
    ok(`refused: ${label}`, e !== null && /may not be patched/.test(String(e && e.message)), String(e));
  }

  // A non-enumerable own `id` is still an own property, so hasOwnProperty catches it — but a
  // spread would not have copied it anyway. Recorded so the next reader knows it was tried.
  const nonEnum = {};
  Object.defineProperty(nonEnum, 'id', { value: 'x', enumerable: false });
  const eNE = threw(() => core.updateParticipant(t, id, nonEnum));
  ok('refused: id as a non-enumerable own property', eNE !== null, 'accepted');

  // Prototype-borne `id`: hasOwnProperty is false, and the record is written by name anyway.
  const proto = Object.create({ id: 'participant-999', userId: 'u:victim' });
  proto.displayName = 'Mallory';
  const viaProto = core.updateParticipant(t, id, proto);
  ok('an inherited id/userId neither throws nor reaches the record',
    viaProto.participants[0].id === id && viaProto.participants[0].userId === null,
    JSON.stringify(viaProto.participants[0]));

  // JSON.parse puts `__proto__` on as an OWN property.
  const polluted = JSON.parse('{"displayName":"M","__proto__":{"polluted":true}}');
  const after = core.updateParticipant(t, id, polluted);
  ok('no prototype pollution through updateParticipant',
    ({}).polluted === undefined && Object.prototype.polluted === undefined);
  ok('participant id/userId survive a __proto__ patch',
    after.participants[0].id === id && after.participants[0].userId === null);

  // R52-6: the patch used to be SPREAD, so any key that is not id/userId landed in the record.
  const junk = core.updateParticipant(t, id, { hacked: 'yes', ownerId: 'u:mallory' });
  ok('R52-6: an unenumerated key cannot reach the participant record (A-18)',
    junk.participants[0].hacked === undefined && junk.participants[0].ownerId === undefined,
    `record is now ${JSON.stringify(junk.participants[0])}`);
  ok('R52-6: and the record still carries exactly the five stored fields',
    Object.keys(junk.participants[0]).sort().join(',') === 'displayName,id,kind,userId',
    JSON.stringify(Object.keys(junk.participants[0])));

  // R52-3, RE-CUT AT ROUND 53. This used to be a bare call and it is now a throw, which is
  // exactly what the finding asked for — so the probe wraps it instead of aborting on it.
  const eKind = threw(() => core.updateParticipant(t, id, { kind: 'owner' }));
  ok('R52-3: updateParticipant refuses a kind outside PARTICIPANT_KINDS',
    eKind !== null && /kind must be one of/.test(String(eKind.message)), String(eKind));
  ok('R52-3: and the refusal names the legal values, so the caller can fix it',
    eKind !== null && /"self"/.test(String(eKind.message)) && /"contact"/.test(String(eKind.message)),
    String(eKind && eKind.message));
  const eKindU = threw(() => core.updateParticipant(t, id, { kind: undefined }));
  ok('R52-3: a patch that HAS the key with an undefined value is refused too (key presence)',
    eKindU !== null, 'a spread-away required field is as unreadable a document as an out-of-enum one');
  ok('a legal kind still goes through',
    core.updateParticipant(t, id, { kind: 'self' }).participants[0].kind === 'self');
}

// ---------------------------------------------------------------- B
head('B  the type-legal corruption chain, now refused at the door');
{
  // `ParticipantPatch.displayName?: string` — passing an explicit `undefined` is legal
  // TypeScript (there is no exactOptionalPropertyTypes in cairn/tsconfig.json), so this is a
  // fully type-checked caller, not a cast. R52-2, RE-CUT AT ROUND 53: it is now a throw.
  const [t0, id] = withOne();
  const eName = threw(() => core.updateParticipant(t0, id, { displayName: undefined }));
  ok('R52-2: { displayName: undefined } is refused at the door',
    eName !== null && /displayName must be a string/.test(String(eName.message)), String(eName));
  ok('R52-2: addParticipant has the same guard (the sibling door)',
    threw(() => core.addParticipant(trip(), { displayName: undefined }, CTX())) !== null,
    'addParticipant accepted a non-string displayName');
  ok('R52-2: `\'\'` is NOT refused — an empty name is validateTrip\'s to report (§2.9)',
    threw(() => core.addParticipant(trip(), { displayName: '' }, CTX())) === null);

  // The residual population §2.9 names: a Trip built PAST the type system. The door cannot
  // reach it, so `validateTrip` must survive it — that is the other half of R52-2's fix.
  const cast = { ...t0, participants: [{ ...t0.participants[0], displayName: undefined }] };
  const vErr = threw(() => core.validateTrip(cast));
  ok('R52-2: validateTrip never throws on a cast-built undefined displayName', vErr === null,
    `validateTrip threw ${vErr && vErr.constructor.name}: ${vErr && vErr.message}`);
  ok('R52-2: and it reports it as participant_name_empty',
    core.validateTrip(cast).map((i) => i.code).includes('participant_name_empty'),
    JSON.stringify(core.validateTrip(cast).map((i) => i.code)));
  note('a cast-built undefined displayName still serializes to a document fromJSON refuses ' +
    `(${String(threw(() => core.fromJSON(core.toJSON(cast))))}) — the door is the fix, and the ` +
    'validator keeps the trip OPEN so the user can repair it');

  // The same chain with a runtime-invalid kind. RE-CUT AT ROUND 53: also a throw now.
  const [t1, id1] = withOne();
  const eKind = threw(() => core.updateParticipant(t1, id1, { kind: 'owner' }));
  ok('R52-3: an invalid kind cannot reach an export, because it cannot reach the record',
    eKind !== null, 'updateParticipant accepted kind:"owner"');

  // KD-99, WITHDRAWN AND RE-POINTED AT ROUND 53 — §8.3 **A-74** Part 5 item 4 routes this line
  // to the breaker by name. Round 52's assertion was *"validateTrip reports the unrestorable
  // kind"*; A-74 rules there is no such `Issue` and there will not be one, because the parser
  // has refused `kind` through `oneOf(o.kind, PARTICIPANT_KINDS, …)` since I-9 and the producer
  // census is closed. **The replacement assertion is Part 1's, and it is the parser's.**
  const castKind = { ...t1, participants: [{ ...t1.participants[0], kind: 'owner' }] };
  const parseRefusal = threw(() => core.fromJSON(core.toJSON(castKind)));
  ok('A-74 Part 1: the parser is where an out-of-enum kind is refused, at its path',
    parseRefusal !== null && String(parseRefusal.path) === '$.participants[0].kind',
    `${String(parseRefusal)} @ ${parseRefusal && parseRefusal.path}`);
  ok('A-74 Part 3: and validateTrip is SILENT about it by ruling, not by omission',
    core.validateTrip(castKind).length === 0, JSON.stringify(core.validateTrip(castKind).map((i) => i.code)));
  note('A-74 Part 7 residue, measured rather than argued: a cast-built out-of-enum kind validates ' +
    'clean and then cannot be re-opened from its own toJSON. General to all eighteen `oneOf` fields; ' +
    'the answer at the first REACHABLE caller is another door guard on R52-3\'s model, not an Issue.');
}

// ---------------------------------------------------------------- C
head('C  fromJSON against hostile documents (A-73 inverted the first three)');
{
  const [t] = withOne();
  const base = docOf(t);
  const doc = (mut) => {
    const d = JSON.parse(JSON.stringify(base));
    mut(d);
    return d;
  };
  const P = (over = {}) => ({ id: 'participant-1', displayName: 'A', kind: 'contact', userId: null, ...over });

  // INVERTED AT ROUND 53. These three were tripwires labelled "expected to invert at I-9a", and
  // I-9a (A-73) landed: a duplicate id is a `Trip` saying something wrong, not a document
  // failing to be a `Trip`, so it OPENS and `validateTrip` reports it. That is P2-7's lesson —
  // a parser refusal offers a JSON path against a file the user has no way to edit.
  const dupDoc = doc((d) => { d.participants = [P(), P({ displayName: 'B' })]; });
  const dup = threw(() => core.fromJSON(dupDoc));
  ok('A-73: a duplicate participant id now OPENS rather than being refused at the parser',
    dup === null, `fromJSON still refuses: ${String(dup)}`);
  const dupIssues = dup === null ? core.validateTrip(core.fromJSON(dupDoc)) : [];
  const dupCodes = dupIssues.map((i) => i.code);
  ok('A-73: and validateTrip is the one home that reports it',
    dupCodes.filter((c) => c === 'duplicate_participant_id').length === 1, JSON.stringify(dupCodes));
  // ROADMAP I-9's verification bullet as REPLACED at revision 56, asserted literally: *"fromJSON
  // OPENS a document with a duplicate participant id and validateTrip reports
  // duplicate_participant_id at level:'error' naming both people."*
  const dupIssue = dupIssues.find((i) => i.code === 'duplicate_participant_id');
  ok('I-9 (rev-56 bullet): the issue is level:"error" and names BOTH people',
    dupIssue?.level === 'error' && /"A"/.test(dupIssue.message) && /"B"/.test(dupIssue.message),
    JSON.stringify(dupIssue));
  ok('I-9 (rev-56 bullet): the ids are in `params`, not in the sentence',
    dupIssue?.params?.participantId === 'participant-1' && !dupIssue.message.includes('participant-1'),
    JSON.stringify(dupIssue?.params));
  ok('A-73: the opened document round-trips, so the user can export and repair it',
    dup === null && core.toJSON(core.fromJSON(dupDoc)) === core.toJSON(core.fromJSON(core.toJSON(core.fromJSON(dupDoc)))));

  const farDoc = doc((d) => {
    d.participants = [P(), P({ id: 'participant-2' }), P({ id: 'participant-3' }), P()];
  });
  const dupFar = threw(() => core.fromJSON(farDoc));
  ok('A-73: a duplicate three rows later opens too', dupFar === null, String(dupFar));
  ok('A-73: and is reported once, against the second occurrence',
    dupFar === null &&
      core.validateTrip(core.fromJSON(farDoc)).filter((i) => i.code === 'duplicate_participant_id').length === 1);

  const emptyDoc = doc((d) => { d.participants = [P({ id: '' }), P({ id: '', displayName: 'B' })]; });
  const empties = threw(() => core.fromJSON(emptyDoc));
  ok('A-73: two empty-string ids collide like any other duplicate, and are reported not refused',
    empties === null &&
      core.validateTrip(core.fromJSON(emptyDoc)).some((i) => i.code === 'duplicate_participant_id'),
    String(empties));

  const oneEmptyId = threw(() => core.fromJSON(doc((d) => { d.participants = [P({ id: '' })]; })));
  note(`a lone id:"" ${oneEmptyId === null ? 'PARSES' : 'is refused'} — same as every other opaque id in core`);

  for (const [label, mut] of [
    ['participants: {} (not an array)', (d) => { d.participants = {}; }],
    ['participants: null', (d) => { d.participants = null; }],
    ['a null row', (d) => { d.participants = [null]; }],
    ['a string row', (d) => { d.participants = ['Zoë']; }],
    ['id: 7', (d) => { d.participants = [P({ id: 7 })]; }],
    ['displayName missing', (d) => { d.participants = [{ id: 'p', kind: 'contact' }]; }],
    ['displayName: null', (d) => { d.participants = [P({ displayName: null })]; }],
    ['kind: "self "', (d) => { d.participants = [P({ kind: 'self ' })]; }],
    ['kind: "owner"', (d) => { d.participants = [P({ kind: 'owner' })]; }],
    ['kind missing', (d) => { d.participants = [{ id: 'p', displayName: 'A' }]; }],
    ['userId: 7', (d) => { d.participants = [P({ userId: 7 })]; }],
    ['note: {}', (d) => { d.participants = [P({ note: {} })]; }],
  ]) {
    const e = threw(() => core.fromJSON(doc(mut)));
    ok(`refused: ${label}`, e !== null && e.constructor.name === 'TripParseError', String(e));
  }

  const extra = core.fromJSON(doc((d) => { d.participants = [P({ evil: 'x', ownerId: 'u:mallory' })]; }));
  ok('an unenumerated key does not survive the parser',
    extra.participants[0].evil === undefined && extra.participants[0].ownerId === undefined,
    JSON.stringify(extra.participants[0]));

  const pollute = threw(() => core.fromJSON(JSON.stringify(base).replace(
    '"participants":[',
    '"participants":[{"id":"p9","displayName":"x","kind":"contact","__proto__":{"pwned":true}},',
  )));
  ok('no prototype pollution through the participants parser',
    ({}).pwned === undefined && Object.prototype.pwned === undefined, 'polluted');
  void pollute;

  // A `userId` a later build wrote, plus a `self` — parsed, carried, and granting nothing (§D).
  const linked = core.fromJSON(doc((d) => {
    d.participants = [P({ id: 'p1', kind: 'self', userId: 'u:jacob' }), P({ id: 'p2', userId: 'u:mallory' })];
  }));
  ok('a linked userId round-trips unchanged',
    linked.participants[1].userId === 'u:mallory' && docOf(linked).participants[1].userId === 'u:mallory');

  // 200 participants, and the round trip.
  const many = doc((d) => {
    d.participants = Array.from({ length: 200 }, (_, i) => P({ id: `p${i}`, displayName: `N${i}` }));
  });
  const parsed = core.fromJSON(many);
  ok('200 participants round-trip byte-identically',
    core.toJSON(parsed) === core.toJSON(core.fromJSON(core.toJSON(parsed))));
}

// ---------------------------------------------------------------- D
head('D  participation grants nothing');
{
  const NOW = '2026-08-01';
  const rel = { tripId: 't', ownerId: 'u:jacob' };
  const mallory = { kind: 'user', userId: 'u:mallory' };
  const ops = ['view', 'comment', 'edit', 'share', 'delete'];

  ok('a stranger is denied all five operations with no participants in play',
    ops.every((o) => core.can(o, mallory, rel, NOW) === false));

  // The strongest form: bolt a participant list onto the Relationship in every plausible shape.
  const shapes = {
    participants: [{ id: 'p1', displayName: 'Mallory', kind: 'contact', userId: 'u:mallory' }],
    participantIds: ['u:mallory'],
    memberIds: undefined,
  };
  for (const key of Object.keys(shapes)) {
    if (shapes[key] === undefined) continue;
    const relP = { ...rel, [key]: shapes[key] };
    ok(`Relationship.${key} changes no answer`,
      ops.every((o) => core.can(o, mallory, relP, NOW) === false));
  }

  // A participant whose userId is the owner's is still not the owner of anything else.
  const relSelf = { ...rel, participants: [{ id: 'p', displayName: 'J', kind: 'self', userId: 'u:mallory' }] };
  ok('a kind:"self" row does not make its userId the owner',
    ops.every((o) => core.can(o, mallory, relSelf, NOW) === false));

  // validateTrip's own member set: accepting a stop as a participant is still not-a-member.
  const [t0] = withOne();
  const t = {
    ...t0,
    participants: [{ id: 'p1', displayName: 'Mallory', kind: 'contact', userId: 'u:mallory' }],
  };
  const ctx = CTX();
  let withStop = core.addStop(t, { kind: 'scheduled', dayId: t.days[0].id }, {
    name: 'Dinner', category: 'food',
  }, ctx);
  const stop = withStop.days[0].stops[0];
  withStop = {
    ...withStop,
    days: withStop.days.map((d, i) => (i === 0 ? {
      ...d,
      stops: d.stops.map((s) => (s.id === stop.id
        ? { ...s, provenance: { ...s.provenance, source: 'friend', state: 'accepted', actorUserId: 'u:mallory', acceptedAt: '2026-08-01',
            origin: { friendUserId: 'u:zoe', sourceTripId: 'trip-9', sourceStopId: 'stop-9' } } }
        : s)),
    } : d)),
  };
  const codes = core.validateTrip(withStop).map((i) => i.code);
  ok('a participant accepting a suggestion is still accepted_by_non_member',
    codes.includes('accepted_by_non_member'), JSON.stringify(codes));

  // No participant reaches a summary row or a statistic.
  const summary = core.tripSummary(withStop, core.COUNTRY_INDEX);
  ok('no participant field on a TripSummaryRow',
    !JSON.stringify(summary).includes('Mallory') && !('participants' in summary),
    JSON.stringify(Object.keys(summary)));
  const stats = core.travelStats([summary], '2026-08-20');
  ok('no participant reaches travelStats', !JSON.stringify(stats).includes('Mallory'));

  // Copying a stop between trips carries no participant.
  const other = core.createTrip({ title: 'Other', startDate: '2026-09-01', endDate: '2026-09-02',
    cities: [{ key: 'paris', name: 'Paris', centre: { lat: 48.86, lng: 2.35 } }], ownerId: 'u:zoe' }, CTX());
  const copied = core.copyStopInto(other, { trip: withStop, stopId: stop.id },
    { kind: 'pool', cityKey: 'paris' }, { ids: ids(), today: '2026-08-01', actorUserId: 'u:zoe' });
  ok('copyStopInto carries no participant into the target trip',
    copied.participants.length === 0 && !JSON.stringify(copied).includes('Mallory'));

  // §6.6: nothing about a participant may reach a rendered issue message.
  const dupT = { ...t0, participants: [
    { id: 'p1', displayName: 'Zoë', kind: 'contact', userId: null },
    { id: 'p1', displayName: 'Zoë M', kind: 'contact', userId: null },
  ] };
  const msgs = core.validateTrip(dupT).filter((i) => i.code === 'duplicate_participant_id').map((i) => i.message);
  ok('no participant id appears in a rendered message', msgs.length > 0 && msgs.every((m) => !m.includes('p1')), JSON.stringify(msgs));
}

// ---------------------------------------------------------------- E
head('E  undo/redo, participant edits INTERLEAVED with other record classes');
{
  const p = memPorts();
  const store = client.createStore({ ports: p });
  await store.createTrip({
    title: 'Interleaved', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }],
  });
  const dayId = store.getState().doc.days[0].id;

  const snaps = [];
  const pids = [];
  for (let i = 0; i < 30; i++) {
    const mod = i % 5;
    if (mod === 0) {
      store.dispatch({ type: 'addParticipant', participant: { displayName: `P${i}`, note: `n${i}` } });
      pids.push(store.getState().doc.participants.at(-1).id);
    } else if (mod === 1) {
      store.dispatch({ type: 'addStop', placement: { kind: 'pool', cityKey: 'vienna' }, stop: { name: `S${i}`, category: 'sight' } });
    } else if (mod === 2 && pids.length) {
      store.dispatch({ type: 'updateParticipant', participantId: pids[pids.length - 1], patch: { displayName: `P${i}!` } });
    } else if (mod === 3) {
      store.dispatch({ type: 'setTripMeta', patch: { title: `t${i}` } });
    } else if (pids.length > 1) {
      store.dispatch({ type: 'removeParticipant', participantId: pids.shift() });
    } else {
      store.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId }, stop: { name: `S${i}b`, category: 'sight' } });
    }
    snaps.push(JSON.stringify(store.getState().doc.participants));
  }

  let allGood = true;
  for (let i = snaps.length - 1; i >= 0; i--) {
    const seen = JSON.stringify(store.getState().doc.participants);
    if (seen !== snaps[i]) { allGood = false; note(`  undo step ${i}: ${seen} !== ${snaps[i]}`); break; }
    store.undo();
  }
  ok('undo walks back through every interleaved participant state exactly', allGood);

  let redoGood = true;
  for (let i = 0; i < snaps.length; i++) {
    store.redo();
    if (JSON.stringify(store.getState().doc.participants) !== snaps[i]) {
      redoGood = false; note(`  redo step ${i} diverged`); break;
    }
  }
  ok('redo walks forward through every interleaved participant state exactly', redoGood);

  // A new edit after undoing into the middle must not resurrect a removed participant.
  for (let i = 0; i < 10; i++) store.undo();
  const midway = JSON.stringify(store.getState().doc.participants);
  store.dispatch({ type: 'setTripMeta', patch: { title: 'branch' } });
  ok('a branch edit does not disturb the participant list',
    JSON.stringify(store.getState().doc.participants) === midway);
  store.redo();
  ok('redo after a branch cannot resurrect a future participant list',
    JSON.stringify(store.getState().doc.participants) === midway);

  // Save/reopen the interleaved document. ROUND 53: `store.save?.()` was a no-op — there is no
  // `save` method — so this section was reopening whatever the debounced writer happened to
  // have left. `flush()` is the real one.
  const tripId = store.getState().doc.id;
  const before = JSON.stringify(store.getState().doc.participants);
  await store.flush();
  const store2 = client.createStore({ ports: p });
  await store2.openTrip(tripId);
  const after = store2.getState().doc ? JSON.stringify(store2.getState().doc.participants) : null;
  ok('the interleaved participant list survives flush + reopen', after === before, `${after} !== ${before}`);
}

// ---------------------------------------------------------------- F
head('F  KD-96 / A-72 — the downgrade, executed');
{
  const [t0, id] = withOne('Zoë');
  const t = core.updateParticipant(t0, id, { note: 'her mother' });
  const newDoc = docOf(core.addParticipant(t, { displayName: 'Jacob', kind: 'self' }, CTX()));
  // RE-CUT AT ROUND 53: A-72 moved SCHEMA_VERSION 2 -> 3. This assertion read `=== 2`.
  ok('A-72: the new document carries two participants and schemaVersion 3',
    newDoc.participants.length === 2 && newDoc.schemaVersion === 3, JSON.stringify(newDoc.schemaVersion));

  let dir = process.env.R52_OLD_BUILD ?? null;
  let temp = null;
  if (!dir) {
    try {
      temp = mkdtempSync(join(tmpdir(), 'r52-old-'));
      dir = join(temp, 'wt');
      execFileSync('git', ['-C', REPO, 'worktree', 'add', '--detach', dir, '4b02206'], { stdio: 'pipe' });
    } catch (e) {
      note(`could not create a pre-I-9 worktree (${e.message.split('\n')[0]}); set R52_OLD_BUILD to a checkout of 4b02206`);
      dir = null;
    }
  }
  if (dir && existsSync(join(dir, 'cairn/packages/core/src/index.ts'))) {
    const old = await import(pathToFileURL(join(dir, 'cairn/packages/core/src/index.ts')).href);
    // RE-CUT AT ROUND 53. Round 52 called `old.fromJSON(newDoc)` bare and asserted that the
    // re-saved document kept its participants; at `17da01a` that call THROWS, which is A-72's
    // fix, and left unwrapped it is a sixth abort site for this probe.
    const refusal = threw(() => old.fromJSON(newDoc));
    ok('A-72/KD-96: a pre-I-9 build now REFUSES a v3 document instead of silently dropping its people',
      refusal !== null, 'the old build opened it, which is the KD-96 loss still open');
    ok('A-72/KD-96: and the refusal is the loud, specific one, at $.schemaVersion',
      refusal !== null && /schemaVersion 3/.test(String(refusal.message)) &&
        /Update the app/.test(String(refusal.message)) &&
        String(refusal.path ?? '') === '$.schemaVersion',
      `${String(refusal)} @ ${refusal && refusal.path}`);
    // The control that makes the above mean something: the SAME old build, on the SAME
    // document with the version number rolled back, still loses the people. So the refusal is
    // the whole of the fix, and nothing else in the stack notices.
    const spoofed = { ...newDoc, schemaVersion: 2 };
    const opened = threw(() => old.fromJSON(spoofed)) === null ? old.fromJSON(spoofed) : null;
    if (opened) {
      const resaved = old.toJSON(opened);
      const back = typeof resaved === 'string' ? JSON.parse(resaved) : resaved;
      note('CONTROL — the same old build, version number spoofed back to 2: participants field ' +
        `${'participants' in opened ? 'present' : 'ABSENT'} on open, ` +
        `${back.participants === undefined ? 'NO participants key at all' : JSON.stringify(back.participants)} on re-save. ` +
        'SCHEMA_VERSION is the only thing standing there — there is no DB_VERSION in front of it.');
    }
  }
  if (temp) {
    try { execFileSync('git', ['-C', REPO, 'worktree', 'remove', '--force', dir], { stdio: 'pipe' }); } catch { /* best effort */ }
    rmSync(temp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- G
head('G  the shipped sample');
{
  const path = join(CAIRN, 'apps/web/src/sample/europe2026.json');
  if (!existsSync(path)) {
    note('no generated sample present — run `npm run sample` from cairn/');
  } else {
    const raw = readFileSync(path, 'utf8');
    const doc = JSON.parse(raw);
    ok('the sample carries an explicit empty participants array',
      Array.isArray(doc.participants) && doc.participants.length === 0, JSON.stringify(doc.participants));
    ok('the sample is regenerated at schemaVersion 3 (A-72)', doc.schemaVersion === 3, String(doc.schemaVersion));
    ok('no displayName, note-about-a-person or minted participant id in the shipped bytes',
      !raw.includes('displayName') && !raw.includes('participant-') && !/"participants":\s*\[[^\]]/.test(raw),
      'a participant field leaked into the bundle');
    // Fail-closed check: redact a trip that DOES have participants.
    const redact = await import(pathToFileURL(join(CAIRN, 'tools/redact.mjs')).href);
    const [t, pid] = withOne('Zoë Real-Name');
    let t2 = core.updateParticipant(t, pid, { note: 'girlfriend' });
    t2 = core.addParticipant(t2, { displayName: 'JacobSecret', kind: 'self' }, CTX(50));
    const out = JSON.stringify(redact.redactForSample(t2));
    ok('redactForSample fails CLOSED once a trip acquires participants',
      !out.includes('Zoë Real-Name') && !out.includes('girlfriend') && !out.includes('JacobSecret'),
      out.slice(0, 400));
    ok('and it drops them wholesale rather than blanking fields',
      JSON.parse(out).participants.length === 0, JSON.stringify(JSON.parse(out).participants));
  }
}

// ---------------------------------------------------------------- H
head('H  export surface');
{
  const names = Object.keys(core);
  ok('index.ts exports exactly 86 runtime symbols', names.length === 86, `${names.length}`);
  for (const n of ['addParticipant', 'updateParticipant', 'removeParticipant']) {
    ok(`${n} is exported`, typeof core[n] === 'function');
  }
  ok('PARTICIPANT_KINDS is NOT exported (BUILD-NOTES claim)', core.PARTICIPANT_KINDS === undefined);

  const grep = (file, re) => {
    const txt = readFileSync(join(CAIRN, file), 'utf8');
    return [...txt.matchAll(re)].map((m) => m[1]);
  };
  ok('index.ts header says 86', grep('packages/core/src/index.ts', /\*\*(\d+) runtime symbols/g)[0] === '86');
  const surfaceTxt = readFileSync(join(CAIRN, 'packages/core/test/surface.test.ts'), 'utf8');
  ok('surface.test.ts pins 86', /\b86\b/.test(surfaceTxt) && !/\bexpected\D{0,12}83\b/.test(surfaceTxt));
  const archTxt = readFileSync(join(CAIRN, 'docs/ARCHITECTURE.md'), 'utf8');
  ok('ARCHITECTURE.md no longer claims 79 exports',
    !/\b79 runtime symbols|surface is 79|79 exports/.test(archTxt));
  // Round 53: the fix pass claims "no export symbol" — the three new guards are module-private.
  for (const n of ['assertParticipantKind', 'assertDisplayName', 'assertNote', 'personPhrase', 'participantName']) {
    ok(`${n} is module-private, as the fix pass claims`, core[n] === undefined);
  }
}

// ---------------------------------------------------------------- I
head('I  U+200B parity with city_name_empty');
{
  const ZWSP = '​';
  const [t0] = withOne();
  const tP = { ...t0, participants: [{ id: 'p1', displayName: ZWSP, kind: 'contact', userId: null }] };
  const pCodes = core.validateTrip(tP).map((i) => i.code);
  const tC = { ...t0, cities: t0.cities.map((c) => ({ ...c, name: ZWSP })) };
  const cCodes = core.validateTrip(tC).map((i) => i.code);
  const pSilent = !pCodes.includes('participant_name_empty');
  const cSilent = !cCodes.includes('city_name_empty');
  note(`U+200B name: participant_name_empty ${pSilent ? 'SILENT' : 'fires'}; city_name_empty ${cSilent ? 'SILENT' : 'fires'}`);
  ok('the U+200B gap is identical on both codes (the builder\'s consistency claim)',
    pSilent === cSilent, 'the two codes disagree, so the "matches an existing gap" defence does not hold');
}

// ---------------------------------------------------------------- J
head('J  a Trip that predates the field');
{
  const [t] = withOne();
  const legacy = { ...t };
  delete legacy.participants;
  const vErr = threw(() => core.validateTrip(legacy));
  ok('validateTrip tolerates a Trip with no participants field', vErr === null, String(vErr));
  const jErr = threw(() => core.toJSON(legacy));
  ok('R52-5: toJSON tolerates it the same way `photos` does (`trip.participants ?? []`)', jErr === null,
    `toJSON threw ${jErr && jErr.constructor.name}: ${jErr && jErr.message}`);
  ok('R52-5: and it writes an empty array rather than omitting the key',
    jErr === null && Array.isArray(JSON.parse(core.toJSON(legacy)).participants),
    JSON.stringify(jErr === null ? JSON.parse(core.toJSON(legacy)).participants : null));
  ok('R52-1: mergeTrips tolerates it too', threw(() => core.mergeTrips(legacy, legacy, legacy)) === null);
  ok('R52-1: and produces an empty list rather than undefined',
    Array.isArray(core.mergeTrips(legacy, legacy, legacy).trip.participants));

  // The builder's own disclosed residue: the three BUILD functions still read `trip.participants`
  // bare. Nothing in core produces such a Trip (createTrip, fromJSON and migrateDoc all write
  // the field, and importLegacyDays writes `[]`), so this is recorded, not filed.
  note('disclosed residue (R52-5): the three build functions read `trip.participants` bare — ' +
    `addParticipant on a fieldless Trip ${threw(() => core.addParticipant(legacy, { displayName: 'X' }, CTX())) ? 'throws' : 'works'}, ` +
    `removeParticipant ${threw(() => core.removeParticipant(legacy, 'p')) ? 'throws' : 'works'}. ` +
    'No core path produces such a Trip.');

  // The uniform pre-existing shape, measured rather than argued: validateTrip's "never throws"
  // docstring does not survive a cast-built COLLECTION on any record class, not just this one.
  const shapes = { '{} (not iterable)': {}, '[null]': [null] };
  for (const [label, v] of Object.entries(shapes)) {
    const line = ['participants', 'photos', 'cities']
      .map((f) => `${f}:${threw(() => core.validateTrip({ ...t, [f]: v })) ? 'throws' : 'ok'}`)
      .join(' ');
    note(`validateTrip against a cast-built ${label}: ${line}`);
  }
}

// ---------------------------------------------------------------- K
head('K  what the untyped action boundary does to a stored trip');
{
  const p = memPorts();
  const store = client.createStore({ ports: p });
  await store.createTrip({
    title: 'Bricked?', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }],
  });
  const tripId = store.getState().doc.id;
  const revBefore = store.getState().doc.revision;

  // The action boundary is JSON-shaped and untyped at runtime — §2.1's own premise, and the
  // reason `setTripMeta` runtime-checks `datePrecision` (QA P2-7). RE-CUT AT ROUND 53: the
  // dispatch now throws, so it is wrapped.
  const eDispatch = threw(() => store.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoë', kind: 'owner' } }));
  ok('R52-3: an out-of-enum kind never reaches the document through a dispatch',
    eDispatch !== null && store.getState().doc.participants.length === 0,
    `stored kind is ${JSON.stringify(store.getState().doc.participants[0]?.kind)}`);
  ok('R52-3: and the refused dispatch leaves the document untouched — no half-applied edit',
    store.getState().doc.revision === revBefore && store.getState().persistence.status !== 'error',
    `revision ${revBefore} -> ${store.getState().doc.revision}, status ${store.getState().persistence.status}`);
  store.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoë' } });
  ok('R52-3: and the store is still usable afterwards',
    store.getState().doc.participants.length === 1 && threw(() => store.getDerived()) === null);

  await store.flush();
  const store2 = client.createStore({ ports: p });
  const reopen = await store2.openTrip(tripId).then(() => null, (e) => e);
  ok('R52-3: the trip can still be opened after that dispatch + flush', reopen === null,
    `openTrip refused the saved document: ${reopen && reopen.message}`);
  ok('R52-3: and the good participant is the only one in it',
    reopen === null && store2.getState().doc.participants.length === 1
      && store2.getState().doc.participants[0].kind === 'contact',
    JSON.stringify(reopen === null ? store2.getState().doc.participants : null));

  // A `{ displayName: undefined }` patch is legal TypeScript (no exactOptionalPropertyTypes),
  // so this is what a typed caller can do — and `computeDerived` calls `validateTrip` for the
  // Issues panel on every document change. RE-CUT AT ROUND 53: refused at the door now.
  const s3 = client.createStore({ ports: memPorts('d:') });
  await s3.createTrip({
    title: 'Derived', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }],
  });
  s3.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoë' } });
  const pid = s3.getState().doc.participants[0].id;
  const ePatch = threw(() => s3.dispatch({ type: 'updateParticipant', participantId: pid, patch: { displayName: undefined } }));
  ok('R52-2: the dispatch is refused rather than corrupting the document', ePatch !== null, 'accepted');
  ok('R52-2: the name is intact after the refusal',
    s3.getState().doc.participants[0].displayName === 'Zoë', JSON.stringify(s3.getState().doc.participants[0]));
  const derived = threw(() => s3.getDerived());
  ok('R52-2: the derived cache (Issues panel) still computes', derived === null,
    `derived threw ${derived && derived.constructor.name}: ${derived && derived.message}`);
  await s3.flush();
  const s4 = client.createStore({ ports: { ...memPorts('e:'), storage: s3 && undefined } });
  void s4;
}

// ---------------------------------------------------------------- L
head('L  mergeTrips — the two-tab path (QA P2-3\'s shape, one record class over) — R52-1');
{
  // ROUND-53 FIXTURE FIX. Round 52 advanced the id factory for `remote` and NOT for `local`, so
  // its local document carried `participant-1` twice (Zoë and Jacob) and the merge's rule 5 —
  // an edit outranks a delete — fired on a collision the probe itself had minted. Every side
  // now draws from its own id namespace, which is what `browserIds()` gives in the shipped app.
  const base = core.addParticipant(trip(), { displayName: 'Zoë' }, CTX(0));
  const zoe = base.participants[0].id;
  const localCtx = () => CTX(100);
  const remoteCtx = () => CTX(200);
  ok('fixture: the base participant id is distinct from anything either side will mint',
    zoe === 'participant-1' && core.addParticipant(base, { displayName: 'x' }, localCtx()).participants[1].id === 'participant-101',
    `${zoe} / ${core.addParticipant(base, { displayName: 'x' }, localCtx()).participants[1].id}`);

  // Tab A (local) adds a participant. Tab B (remote) adds a different one and edits Zoë.
  const local = core.addParticipant(base, { displayName: 'Jacob', kind: 'self' }, localCtx());
  let remote = core.addParticipant(base, { displayName: 'Zoë\'s mother' }, remoteCtx());
  remote = core.updateParticipant(remote, zoe, { note: 'drove the second leg' });

  const { trip: merged, report } = core.mergeTrips(base, local, remote);
  const names = merged.participants.map((x) => x.displayName).sort();
  ok('R52-1: mergeTrips keeps BOTH tabs\' participants',
    names.length === 3, `merged list is ${JSON.stringify(names)}`);
  ok('R52-1: the addition is REPORTED as coming from the other tab',
    report.fromRemote.some((n) => n.entity === 'participant' && n.field === 'added'),
    `the merge report says nothing about participants: ${JSON.stringify(report)}`);
  ok('R52-1: the remote tab\'s edit to an existing participant survives',
    merged.participants.find((x) => x.id === zoe)?.note === 'drove the second leg',
    'the note the other tab wrote is gone');
  ok('R52-1: and the edit is reported too',
    report.fromRemote.some((n) => n.entity === 'participant' && n.id === zoe && n.field === undefined),
    JSON.stringify(report.fromRemote));

  note('for contrast, photos ARE merged: mergeTrips names them explicitly one line above participants');

  // And the reverse direction: a participant REMOVED remotely must stay removed. With the
  // fixture fixed, this is the same scenario `merge.test.ts` pins.
  const removedRemotely = core.removeParticipant(base, zoe);
  const m2 = core.mergeTrips(base, local, removedRemotely);
  ok('R52-1: a participant removed in the other tab stays removed after a merge',
    !m2.trip.participants.some((x) => x.id === zoe),
    `the deletion the other tab made was undone: ${JSON.stringify(m2.trip.participants.map((x) => x.id))}`);
  ok('R52-1: the local addition is still there beside it',
    m2.trip.participants.length === 1 && m2.trip.participants[0].displayName === 'Jacob',
    JSON.stringify(m2.trip.participants.map((x) => x.displayName)));
  ok('R52-1: and the deletion is reported as coming from the other tab',
    m2.report.fromRemote.some((n) => n.entity === 'participant' && n.id === zoe && n.field === 'deleted'),
    JSON.stringify(m2.report));

  // The collision the old fixture minted by accident, kept ON PURPOSE as its own case: a
  // document that already carries a duplicate id (which A-73 now lets `fromJSON` open) still
  // merges, and rule 5 is what it does. Nothing is silent.
  const collided = { ...local, participants: local.participants.map((x) => ({ ...x, id: zoe })) };
  const m3 = core.mergeTrips(base, collided, removedRemotely);
  ok('a local document already carrying a duplicate id merges without throwing, and reports',
    m3.report.overwritten.some((n) => n.entity === 'participant' && n.field === 'deleted_remotely'),
    JSON.stringify(m3.report));
}

// ---------------------------------------------------------------- M
head('M  what the two participant issues actually SAY');
{
  const [t0] = withOne();
  const P = (o) => ({ id: 'p1', displayName: 'A', kind: 'contact', userId: null, ...o });
  const issues = (parts) => core.validateTrip({ ...t0, participants: parts })
    .filter((i) => i.code === 'duplicate_participant_id');
  const msgs = (parts) => issues(parts).map((i) => i.message);

  const blankDup = msgs([P({ displayName: '' }), P({ displayName: 'Zoë' })]);
  ok('R52-4: a nameless participant is not described as a city',
    blankDup.length > 0 && blankDup.every((m) => !/city/i.test(m)), JSON.stringify(blankDup));
  ok('R52-4: it says "someone with no name"',
    blankDup.every((m) => /someone with no name/.test(m)), JSON.stringify(blankDup));

  const blankSelf = msgs([P({ id: 'a', kind: 'self', displayName: '  ' }), P({ id: 'b', kind: 'self', displayName: 'Zoë' })]);
  ok('R52-4: the duplicate-self message does not call a person a city',
    blankSelf.length > 0 && blankSelf.every((m) => !/city/i.test(m)), JSON.stringify(blankSelf));
  ok('R52-4: a city with no name still says so, so the helper was split and not renamed',
    core.validateTrip({ ...t0, cities: [{ ...t0.cities[0], name: '' }],
      days: t0.days.map((d) => ({ ...d, primaryCity: 'nope' })) })
      .some((i) => /city/i.test(i.message)));

  // R52-7: the comment used to promise a suppression the code does not do. The code is right —
  // one issue per offending row — and this pins both counts so neither can drift to the other.
  const three = issues([P({ id: 'a', kind: 'self' }), P({ id: 'b', kind: 'self' }), P({ id: 'c', kind: 'self' })]);
  ok('R52-7: three kind:"self" rows report exactly 2 issues — one per offending row',
    three.length === 2, `${three.length}`);
  const threeIds = issues([P({ displayName: 'A' }), P({ displayName: 'B' }), P({ displayName: 'C' })]);
  ok('R52-7: and three rows sharing one id report exactly 2, which is the same rule',
    threeIds.length === 2, `${threeIds.length}`);
  const srcTxt = readFileSync(join(CAIRN, 'packages/core/src/validate/validateTrip.ts'), 'utf8');
  ok('R52-7: and the comment no longer claims the suppression the code does not implement',
    !/Reported once, on the second row, not once per row after it/.test(srcTxt),
    'the corrected sentence is still the old one');

  // What the two mutators do to a duplicated id — the message promises this behaviour.
  const dupTrip = { ...t0, participants: [P({ displayName: 'A' }), P({ displayName: 'B' })] };
  ok('removeParticipant on a duplicated id removes both rows, as the message says',
    core.removeParticipant(dupTrip, 'p1').participants.length === 0);
  ok('updateParticipant on a duplicated id edits only the first, as the message says',
    core.updateParticipant(dupTrip, 'p1', { displayName: 'Z' }).participants.map((x) => x.displayName).join(',') === 'Z,B');
}

// ---------------------------------------------------------------- N
head('N  round 53 — mergeById<Participant>\'s COMPLETENESS, not just its presence');
{
  // Three participants in the base, so every one of mergeTrips' five documented rules can be
  // driven at once against the SAME merge rather than one at a time.
  let base = core.addParticipant(trip(), { displayName: 'Zoe' }, CTX(0));
  const zoe = base.participants[0].id;
  base = core.addParticipant(base, { displayName: 'Ana' }, CTX(10));
  const ana = base.participants[1].id;
  base = core.addParticipant(base, { displayName: 'Bo' }, CTX(20));
  const bo = base.participants[2].id;
  base = core.addParticipant(base, { displayName: 'Cy' }, CTX(30));
  const cy = base.participants[3].id;
  ok('fixture: four distinct base ids', new Set([zoe, ana, bo, cy]).size === 4, JSON.stringify([zoe, ana, bo, cy]));

  //  rule 1  Cy: neither side touches it
  //  rule 2  Ana: only local edits it
  //  rule 3  Zoe: BOTH sides edit the same field differently -> local wins, reported
  //  rule 4  (mirrored) Cy deleted remotely, untouched locally -> the delete stands
  //  rule 5  Bo: deleted locally, EDITED remotely -> the edit stands, reported
  let local = core.addParticipant(base, { displayName: 'Lucy' }, CTX(100));
  local = core.updateParticipant(local, zoe, { note: 'local-note' });
  local = core.updateParticipant(local, ana, { displayName: 'Ana-local' });
  local = core.removeParticipant(local, bo);

  let remote = core.addParticipant(base, { displayName: 'Rex' }, CTX(200));
  remote = core.updateParticipant(remote, zoe, { note: 'remote-note' });
  remote = core.updateParticipant(remote, bo, { note: 'remote-edited-bo' });
  remote = core.removeParticipant(remote, cy);

  const { trip: m, report } = core.mergeTrips(base, local, remote);
  const by = (id) => m.participants.find((x) => x.id === id);
  ok('rule 3 (both edited): the saving side wins on the contested field',
    by(zoe)?.note === 'local-note', JSON.stringify(by(zoe)));
  ok('rule 3: and the loss is in `overwritten`, so describeMerge can say it',
    report.overwritten.some((n) => n.entity === 'participant' && n.id === zoe), JSON.stringify(report.overwritten));
  ok('rule 2 (only local edited): local\'s version stands, and nothing is reported for it',
    by(ana)?.displayName === 'Ana-local'
      && !report.fromRemote.some((n) => n.id === ana) && !report.overwritten.some((n) => n.id === ana),
    JSON.stringify(by(ana)));
  ok('rule 5 (local deleted, remote edited): the EDIT stands — a delete never destroys a live edit',
    by(bo)?.note === 'remote-edited-bo', JSON.stringify(by(bo)));
  ok('rule 5: and it is reported as `deleted_locally`',
    report.overwritten.some((n) => n.entity === 'participant' && n.id === bo && n.field === 'deleted_locally'),
    JSON.stringify(report.overwritten));
  ok('rule 4 (remote deleted, local untouched): the delete stands',
    by(cy) === undefined, JSON.stringify(m.participants.map((x) => x.id)));
  ok('rule 4: and it is reported as `deleted`',
    report.fromRemote.some((n) => n.entity === 'participant' && n.id === cy && n.field === 'deleted'),
    JSON.stringify(report.fromRemote));
  ok('both sides\' additions survive',
    m.participants.some((x) => x.displayName === 'Lucy') && m.participants.some((x) => x.displayName === 'Rex'),
    JSON.stringify(m.participants.map((x) => x.displayName)));
  ok('the remote-only addition is reported as `added`',
    report.fromRemote.some((n) => n.entity === 'participant' && n.field === 'added'), JSON.stringify(report.fromRemote));
  ok('order follows the LOCAL document with remote-only rows appended, like every other collection',
    m.participants.map((x) => x.displayName).join(',') === 'Zoe,Ana-local,Lucy,Bo,Rex',
    m.participants.map((x) => x.displayName).join(','));
  ok('no participant is duplicated by the merge',
    new Set(m.participants.map((x) => x.id)).size === m.participants.length,
    JSON.stringify(m.participants.map((x) => x.id)));
  ok('`revision` is max(local, remote) + 1, as the file\'s own docstring says',
    m.revision === Math.max(local.revision, remote.revision) + 1, `${m.revision}`);
  ok('the merged trip is still parseable — the merge cannot mint an unopenable document',
    threw(() => core.fromJSON(core.toJSON(m))) === null, String(threw(() => core.fromJSON(core.toJSON(m)))));
  ok('neither input document was mutated (§2.1 immutability)',
    local.participants.length === 4 && remote.participants.length === 4
      && base.participants.length === 4,
    `${local.participants.length}/${remote.participants.length}/${base.participants.length}`);

  // Symmetry: swapping local and remote must swap only rule 3's winner, never lose anybody.
  const swapped = core.mergeTrips(base, remote, local);
  ok('swapping the two sides loses nobody — only the last-writer-wins field flips',
    new Set(swapped.trip.participants.map((x) => x.id)).size === new Set(m.participants.map((x) => x.id)).size
      && swapped.trip.participants.find((x) => x.id === zoe)?.note === 'remote-note',
    JSON.stringify(swapped.trip.participants.map((x) => [x.id, x.note])));

  // `participants` is a record array and belongs in `mergeById`, NOT in TRIP_FIELDS. If it were
  // listed there it would be picked whole, so the two tabs' lists would never interleave.
  const mergeSrc = readFileSync(join(CAIRN, 'packages/core/src/merge/mergeTrips.ts'), 'utf8');
  const tripFields = /const TRIP_FIELDS = \[([^\]]*)\]/.exec(mergeSrc)?.[1] ?? '';
  ok('participants is NOT in TRIP_FIELDS (it is a record array, not a scalar)',
    !/participants/.test(tripFields), tripFields);
  ok('every record array on Trip is named in mergeTrips — nothing added since',
    ['cities', 'days', 'pool', 'places', 'bookings', 'resolutions', 'photos', 'participants']
      .every((f) => new RegExp(`out\\.${f}\\s*=|const ${f} =`).test(mergeSrc)));

  // …and the same divergence through the REAL store, so this is not a claim about a pure
  // function only. Two stores over one memoryStorage, with DISTINCT id namespaces — which is
  // the fixture defect §L used to have, and which `browserIds()` gives for free in the app.
  const storage = client.memoryStorage();
  const mk = (pfx) => client.createStore({ ports: { ...memPorts(pfx), storage } });
  const a = mk('a:');
  await a.createTrip({ title: 'Two tabs', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }] });
  a.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoe' } });
  a.dispatch({ type: 'addParticipant', participant: { displayName: 'Doomed' } });
  await a.flush();
  const tripId = a.getState().doc.id;

  const b = mk('b:');
  await b.openTrip(tripId);
  b.dispatch({ type: 'addParticipant', participant: { displayName: 'RemoteOnly' } });
  b.dispatch({ type: 'updateParticipant',
    participantId: b.getState().doc.participants.find((x) => x.displayName === 'Zoe').id,
    patch: { note: 'edited in tab B' } });
  b.dispatch({ type: 'removeParticipant',
    participantId: b.getState().doc.participants.find((x) => x.displayName === 'Doomed').id });
  await b.flush();

  a.dispatch({ type: 'addParticipant', participant: { displayName: 'LocalOnly' } });
  await a.flush();
  ok('the storage-version guard fires when the other tab has saved',
    a.getState().persistence.status === 'conflict', a.getState().persistence.status);
  await a.mergeWithStored();
  const finalNames = a.getState().doc.participants.map((x) => x.displayName).sort().join(',');
  ok('through the real store: both tabs\' people survive and the remote deletion stands',
    finalNames === 'LocalOnly,RemoteOnly,Zoe', finalNames);
  ok('through the real store: the remote tab\'s note survives',
    a.getState().doc.participants.find((x) => x.displayName === 'Zoe')?.note === 'edited in tab B',
    JSON.stringify(a.getState().doc.participants));
  const lastMerge = a.getState().persistence.lastMerge;
  ok('and the user is TOLD about all three participant decisions',
    lastMerge !== null && lastMerge.report.fromRemote.filter((n) => n.entity === 'participant').length === 3
      && /kept 3 changes/.test(lastMerge.message),
    JSON.stringify(lastMerge));
  const c = mk('c:');
  await c.openTrip(tripId);
  ok('and the merged list is what storage actually holds afterwards',
    c.getState().doc.participants.map((x) => x.displayName).sort().join(',') === 'LocalOnly,RemoteOnly,Zoe',
    JSON.stringify(c.getState().doc.participants.map((x) => x.displayName)));

  // R53-1. `describeMerge` names an overwritten participant by its OPAQUE ID, in a sentence
  // shown to the user — while `validateTrip`'s two participant issues deliberately spell the
  // person's name out through `personPhrase` and keep the id in `params` (§2.1, A-10/R13-7,
  // and R52-4 is the round that fixed exactly this legibility class one string over). The
  // convention is pre-existing (a stop reads `poolStop:stop-51`), so this is not a regression;
  // it is the pre-existing convention arriving at the one record class that has a human name.
  const conflictReport = core.mergeTrips(base, local, remote).report;
  const banner = core.describeMerge(conflictReport);
  note(`describeMerge on a participant conflict: ${banner}`);
  ok('R53-1: the merge banner identifies an overwritten person by name, not by opaque id',
    !/participant:[^,)]+/.test(banner) || /Zoë/.test(banner),
    `${banner} — validateTrip says "${core.validateTrip({ ...local, participants: [local.participants[0], { ...local.participants[0] }] })
      .find((i) => i.code === 'duplicate_participant_id')?.message}" for the same person`);
  // The control that makes it a design question rather than a participants defect.
  const ws = core.addStop(base, { kind: 'pool', cityKey: 'vienna' }, { name: 'A stop', category: 'sight' }, CTX(500));
  const sid = ws.pool[0].id;
  note('control, one record class over: ' +
    core.describeMerge(core.mergeTrips(ws, core.updateStop(ws, sid, { name: 'MINE' }),
      core.updateStop(ws, sid, { name: 'THEIRS' })).report));
}

// ---------------------------------------------------------------- O
head('O  round 53 — assertParticipantKind\'s coverage: is there another door?');
{
  // The fix covers addParticipant/updateParticipant. Every OTHER way a `kind` could reach a
  // stored document, enumerated from the source rather than from the fix's own claim.
  for (const [label, fn] of [
    ['addParticipant, value out of enum', () => core.addParticipant(trip(), { displayName: 'X', kind: 'owner' }, CTX())],
    ['addParticipant, kind: null', () => core.addParticipant(trip(), { displayName: 'X', kind: null }, CTX())],
    ['addParticipant, kind: ""', () => core.addParticipant(trip(), { displayName: 'X', kind: '' }, CTX())],
    ['addParticipant, kind: 0', () => core.addParticipant(trip(), { displayName: 'X', kind: 0 }, CTX())],
    ['addParticipant, kind: "Self" (case)', () => core.addParticipant(trip(), { displayName: 'X', kind: 'Self' }, CTX())],
    ['addParticipant, kind: " self "', () => core.addParticipant(trip(), { displayName: 'X', kind: ' self ' }, CTX())],
    // An INHERITED `kind` is read by `init.kind` (property access walks the prototype chain), so
    // the guard sees it and refuses it. That is the safe direction and it is worth pinning: the
    // guard is not defeated by moving the bad value onto a prototype.
    ['addParticipant, kind via prototype', () => core.addParticipant(trip(), Object.assign(Object.create({ kind: 'owner' }), { displayName: 'X' }), CTX())],
  ]) {
    ok(`${label}: refused`, threw(fn) !== null, 'accepted');
  }
  ok('an inherited LEGAL kind is read and written — the guard is on the value, not the key\'s owner',
    core.addParticipant(trip(), Object.assign(Object.create({ kind: 'self' }), { displayName: 'X' }), CTX())
      .participants[0].kind === 'self');
  ok('addParticipant with kind absent defaults to "contact"',
    core.addParticipant(trip(), { displayName: 'X' }, CTX()).participants[0].kind === 'contact');
  ok('addParticipant with an EXPLICIT kind: undefined also takes the default (init, not patch)',
    core.addParticipant(trip(), { displayName: 'X', kind: undefined }, CTX()).participants[0].kind === 'contact');

  // fromJSON — A-73 removed the duplicate-id refusal and kept every per-field one. This is the
  // door a hand-crafted document would come through, and it is guarded as a SHAPE violation.
  const [t] = withOne();
  const d = docOf(t);
  for (const k of ['owner', 'SELF', '', null, 7, ['self'], { v: 'self' }, 'self ']) {
    const dd = JSON.parse(JSON.stringify(d));
    dd.participants[0].kind = k;
    const e = threw(() => core.fromJSON(dd));
    ok(`fromJSON refuses kind=${JSON.stringify(k)} at its path`,
      e !== null && e.constructor.name === 'TripParseError' && String(e.path) === '$.participants[0].kind',
      `${String(e)} @ ${e && e.path}`);
  }

  // migrateDoc is the only layer between the bytes and the parser. A v2 document carrying a bad
  // kind must not sneak past on the way up the ladder.
  const v2bad = JSON.parse(JSON.stringify(d));
  v2bad.schemaVersion = 2;
  v2bad.participants = [{ id: 'p1', displayName: 'X', kind: 'owner', userId: null }];
  ok('a v2 document carrying an out-of-enum kind is still refused after migration',
    threw(() => core.fromJSON(v2bad)) !== null);

  // importLegacyDays writes `participants: []`, so the legacy bridge cannot mint one.
  const legacySrc = readFileSync(join(CAIRN, 'packages/core/src/import/legacyDays.ts'), 'utf8');
  ok('importLegacyDays writes an empty participant list and no kind',
    /participants:\s*\[\]/.test(legacySrc) && !/kind:\s*['"](?:self|contact|owner)['"]/.test(legacySrc));

  // §8.3 **A-74** Part 2's producer census, re-derived from source rather than read from the
  // table. A-74's whole ruling — "no new Issue code" — rests on this census being CLOSED, and
  // its own Part 6 K1 says nothing else in the suite would notice the day it stops being true.
  const CORE_SRC = join(CAIRN, 'packages/core/src');
  const censusLines = execFileSync('grep', ['-rn', '--include=*.ts', '-E',
    'participants\\s*[:=]|participants,', CORE_SRC], { encoding: 'utf8' })
    .split('\n')
    .filter((l) => l.trim() && !/^\S+:\s*\d+:\s*(\*|\/\/)/.test(l))
    .map((l) => l.replace(CORE_SRC + '/', ''));
  const files = [...new Set(censusLines.map((l) => l.split(':')[0]))].sort();
  ok('A-74 Part 2: exactly these files mention a `participants` field in core, and no others',
    files.join(' ') === [
      'build/createTrip.ts', 'build/participants.ts', 'import/legacyDays.ts',
      'merge/mergeTrips.ts', 'model/types.ts', 'serialize/fromJSON.ts',
      'serialize/migrate.ts', 'serialize/toJSON.ts',
    ].join(' '), files.join(' '));
  const src = (f) => readFileSync(join(CORE_SRC, f), 'utf8');
  ok('A-74 rung 1: createTrip emits the literal []', /participants:\s*\[\]/.test(src('build/createTrip.ts')));
  ok('A-74 rung 2: importLegacyDays emits the literal [] (the rung ROADMAP I-9b pins)',
    /participants:\s*\[\]/.test(src('import/legacyDays.ts')));
  ok('A-74 rung 3: fromJSON reads kind through oneOf(PARTICIPANT_KINDS)',
    /oneOf\(o\.kind,\s*PARTICIPANT_KINDS/.test(src('serialize/fromJSON.ts')));
  ok('A-74 rung 4: both build doors call assertParticipantKind',
    (src('build/participants.ts').match(/assertParticipantKind\(/g) ?? []).length === 3,
    String((src('build/participants.ts').match(/assertParticipantKind\(/g) ?? []).length));
  ok('A-74 rung 5: removeParticipant only filters — it mints nothing',
    /participants:\s*trip\.participants\.filter/.test(src('build/participants.ts')));
  ok('A-74 rung 6: copyStop names no participant at all', !/participants/.test(src('build/copyStop.ts')));
  ok('A-74 rung 7: mergeTrips writes no `kind` of its own — it moves whole records',
    !/kind:\s*['"]/.test(src('merge/mergeTrips.ts')));
  ok('A-74 rung 8: migrateDoc returns `unknown`, so it is not a producer of a Trip',
    /migrateDoc\(\s*doc:\s*unknown\s*\):\s*unknown/.test(src('serialize/migrate.ts')),
    (src('serialize/migrate.ts').match(/export function migrateDoc[^{]*/) ?? [''])[0]);
  ok('A-74 rung 8: …and it is called INSIDE fromJSON, in front of the parse',
    /migrateDoc\(/.test(src('serialize/fromJSON.ts')));
  ok('toJSON is a consumer, not a producer — its participant writer copies `kind` by name',
    /\(trip\.participants \?\? \[\]\)/.test(src('serialize/toJSON.ts'))
      && /id: p\.id, displayName: p\.displayName, kind: p\.kind, userId: p\.userId \?\? null, note: p\.note/
        .test(src('serialize/toJSON.ts')),
    (src('serialize/toJSON.ts').match(/omitUndef\(\{ id: p\.id[^)]*\)/) ?? [''])[0]);
  note('the census is CLOSED for `packages/core`. The one producer outside it is the client\'s ' +
    '`adoptTrip(doc: Trip)`, which installs a Trip without parsing — checked below.');

  // The store's own adopt path takes a `Trip` object, not bytes. Checked because it is the one
  // public method that installs a document without parsing it — i.e. a ninth rung A-74's census
  // does not cover, because its scope is `packages/core`.
  const libSrc = readFileSync(join(CAIRN, 'apps/web/src/views/Library.tsx'), 'utf8');
  const sampleSrc = readFileSync(join(CAIRN, 'apps/web/src/sample.ts'), 'utf8');
  ok('the only shipped adoptTrip caller feeds it a fromJSON-parsed document',
    /adoptTrip\(trip\)/.test(libSrc) && /fromJSON\(/.test(sampleSrc));
  ok('and no other apps/web or client source calls adoptTrip',
    execFileSync('grep', ['-rl', '--include=*.ts', '--include=*.tsx', 'adoptTrip',
      join(CAIRN, 'apps/web/src'), join(CAIRN, 'packages/client/src')], { encoding: 'utf8' })
      .trim().split('\n').sort().join(' ')
      === [join(CAIRN, 'apps/web/src/views/Library.tsx'), join(CAIRN, 'packages/client/src/store/store.ts')].sort().join(' '));
}

// ---------------------------------------------------------------- P
head('P  round 53 — participantName()\'s coercion: does `\'\'` ever reach storage?');
{
  const [t0] = withOne('Zoë');
  for (const v of [undefined, null, 7, {}, [], true]) {
    const cast = { ...t0, participants: [{ ...t0.participants[0], displayName: v }] };
    const snapshot = JSON.stringify(cast.participants[0]);
    const e = threw(() => core.validateTrip(cast));
    ok(`validateTrip survives displayName=${String(v)} and reports it`,
      e === null && core.validateTrip(cast).map((i) => i.code).includes('participant_name_empty'),
      e ? String(e) : JSON.stringify(core.validateTrip(cast).map((i) => i.code)));
    ok(`…and does not WRITE the coerced '' back onto the record (displayName=${String(v)})`,
      JSON.stringify(cast.participants[0]) === snapshot
        && cast.participants[0].displayName !== '' === (v !== ''),
      `${snapshot} -> ${JSON.stringify(cast.participants[0])}`);
    const written = JSON.parse(core.toJSON(cast)).participants[0];
    ok(`…and toJSON writes the raw value, not the coercion (displayName=${String(v)})`,
      written.displayName === undefined ? v === undefined : JSON.stringify(written.displayName) === JSON.stringify(v),
      JSON.stringify(written));
  }
  // The one that matters: a legal empty name is still an empty name after a round trip — the
  // coercion must not turn a REPORTED problem into a silently-repaired one.
  const empty = core.addParticipant(trip(), { displayName: '' }, CTX());
  ok('a legally-empty displayName survives the round trip as `""`, still reported',
    core.fromJSON(core.toJSON(empty)).participants[0].displayName === ''
      && core.validateTrip(core.fromJSON(core.toJSON(empty))).some((i) => i.code === 'participant_name_empty'));
  // And through the real store, which is the path that would persist a repair if one happened.
  const s = client.createStore({ ports: memPorts('p:') });
  await s.createTrip({ title: 'Coerce', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }] });
  s.dispatch({ type: 'addParticipant', participant: { displayName: '' } });
  s.getDerived();
  await s.flush();
  ok('the derived cache computes over an empty name without repairing it',
    s.getState().doc.participants[0].displayName === '',
    JSON.stringify(s.getState().doc.participants[0]));
  ok('and the Issues panel carries participant_name_empty',
    s.getDerived().issues.some((i) => i.code === 'participant_name_empty'),
    JSON.stringify(s.getDerived().issues.map((i) => i.code)));
}

// ---------------------------------------------------------------- Q
head('Q  round 53 — R52-6\'s exact adversarial patches');
{
  const t = core.addParticipant(trip(), { displayName: 'Zoë', note: 'her mother' }, CTX());
  const id = t.participants[0].id;

  const removed = core.updateParticipant(t, id, { note: undefined });
  ok('R52-6: { note: undefined } REMOVES the note, as claimed',
    !Object.prototype.hasOwnProperty.call(removed.participants[0], 'note'),
    JSON.stringify(removed.participants[0]));
  ok('R52-6: and the removal is not an `undefined` hole in the serialized document',
    !('note' in JSON.parse(core.toJSON(removed)).participants[0]),
    JSON.stringify(JSON.parse(core.toJSON(removed)).participants[0]));
  ok('R52-6: and the document still round-trips after the removal',
    threw(() => core.fromJSON(core.toJSON(removed))) === null);

  for (const v of [{}, [], 7, null, true, Object.create(null)]) {
    const e = threw(() => core.updateParticipant(t, id, { note: v }));
    ok(`R52-6: { note: ${JSON.stringify(v) ?? String(v)} } THROWS, as claimed`,
      e !== null && /note must be a string/.test(String(e.message)), String(e));
  }
  ok('R52-6: a legal note still writes', core.updateParticipant(t, id, { note: 'ok' }).participants[0].note === 'ok');
  ok('R52-6: an ABSENT note key leaves the existing note alone',
    core.updateParticipant(t, id, { displayName: 'Z' }).participants[0].note === 'her mother');
  ok('R52-6: addParticipant refuses the same non-string notes',
    [{}, 7, null].every((v) => threw(() => core.addParticipant(trip(), { displayName: 'X', note: v }, CTX())) !== null));
  ok('R52-6: addParticipant with note: undefined writes no key at all',
    !Object.prototype.hasOwnProperty.call(
      core.addParticipant(trip(), { displayName: 'X', note: undefined }, CTX()).participants[0], 'note'));
  ok('R52-6: an empty-string note is legal and is stored (emptiness is not the rule for notes)',
    core.updateParticipant(t, id, { note: '' }).participants[0].note === '');
}

// ---------------------------------------------------------------- R
head('R  round 53 — A-72\'s migration ladder, attacked');
{
  const [t] = withOne();
  const d = docOf(t);
  ok('a freshly written document is schemaVersion 3', d.schemaVersion === 3, String(d.schemaVersion));

  const at = (v, strip = false) => {
    const dd = JSON.parse(JSON.stringify(d));
    dd.schemaVersion = v;
    if (strip) { delete dd.photos; delete dd.participants; }
    return dd;
  };
  const v1 = core.fromJSON(at(1, true));
  ok('a v1 document walks the WHOLE ladder and arrives at 3, not at 2',
    v1.schemaVersion === 3 && Array.isArray(v1.photos) && Array.isArray(v1.participants),
    JSON.stringify({ sv: v1.schemaVersion, photos: v1.photos, participants: v1.participants }));
  const v2 = core.fromJSON(at(2, true));
  ok('a v2 document gains participants and arrives at 3',
    v2.schemaVersion === 3 && v2.participants.length === 0, String(v2.schemaVersion));
  ok('a v2 document that ALREADY carries participants keeps them (v1ToV2\'s own clause)',
    core.fromJSON(at(2)).participants.length === 1, JSON.stringify(core.fromJSON(at(2)).participants));

  for (const [label, v] of [['4 (a future build)', 4], ['0', 0], ['1.5', 1.5], ['NaN', NaN], ['-1', -1], ['"3" (a string)', '3']]) {
    const e = threw(() => core.fromJSON(at(v)));
    ok(`schemaVersion ${label} is refused loudly at $.schemaVersion`,
      e !== null && String(e.path) === '$.schemaVersion', `${String(e)} @ ${e && e.path}`);
  }
  const forward = threw(() => core.fromJSON(at(4)));
  ok('a forward version says "update the app" rather than "no migration path"',
    /Update the app/.test(String(forward && forward.message)), String(forward));
  const noPath = threw(() => core.fromJSON(at(0)));
  ok('and a below-floor version names the ORIGINAL version it could not start from',
    /no migration path from schemaVersion 0/.test(String(noPath && noPath.message)), String(noPath));
  const missing = threw(() => { const dd = JSON.parse(JSON.stringify(d)); delete dd.schemaVersion; return core.fromJSON(dd); });
  ok('a missing schemaVersion is its own refusal', /missing schemaVersion/.test(String(missing && missing.message)), String(missing));

  // The rule the ladder exists to keep: `SCHEMA_VERSION` is the only downgrade-safety mechanism
  // for a record array, because nothing carries unknown keys across the copy path.
  const migSrc = readFileSync(join(CAIRN, 'packages/core/src/serialize/migrate.ts'), 'utf8');
  ok('the ladder is a version-indexed table, not a chain of `if`s',
    /UPGRADES/.test(migSrc) && /while\s*\(/.test(migSrc), 'the ladder was rebuilt as a second `if`');
  ok('and the rule that decides a bump is written down where the next builder will read it',
    /array of records/.test(migSrc) && /no exception/i.test(migSrc));
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}${gaps ? ` — plus ${gaps} known open GAP (KD-99, routed to the architect; not a round-53 finding)` : ''}`);
console.log('COMPLETE');
process.exit(fails === 0 ? 0 : 1);
