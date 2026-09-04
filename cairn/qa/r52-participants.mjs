/**
 * QA round 52 — the adversarial pass over I-9 (participants in core, ARCHITECTURE §8.3).
 *
 * Run from anywhere: `node cairn/qa/r52-participants.mjs`
 *
 * Every section is an attack, not a re-run of the builder's own tests. A `FAIL` line is a
 * finding; the script exits 1 if any section reports one. `note` lines are facts recorded
 * rather than expectations.
 *
 * Three assertions in section C are TRIPWIRES that invert when ROADMAP I-9a lands (A-73 takes
 * the duplicate-id refusal out of the parser); they are labelled inline.
 *
 * Section index
 *   A  updateParticipant's runtime allowlist — every escape shape, not just the tested one
 *   B  the type-legal corruption chain: patch -> toJSON -> fromJSON refuses; validateTrip THROWS
 *   C  fromJSON against hand-crafted hostile documents (duplicate ids, pollution, shapes)
 *   D  participation grants nothing — every read path, including the ones nobody wired
 *   E  undo/redo with participant edits INTERLEAVED with other record classes
 *   F  KD-96: the downgrade, executed rather than reasoned (needs a git worktree)
 *   G  the shipped sample really has no participant field content
 *   H  export surface: 86, counted, and every pinned site agrees
 *   I  U+200B parity with city_name_empty, measured on both
 *   J  toJSON/validateTrip against a Trip that predates the field
 *   K  the untyped action boundary, through the real store: an unopenable trip
 *   L  mergeTrips — the two-tab path (QA P2-3's shape, one record class over)
 *   M  what the two participant issues actually say
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
const ok = (n, c, x = '') => {
  if (!c) fails++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (c || x === '' ? '' : `\n         ${x}`));
};
const note = (n) => console.log('  note  ' + n);
const head = (s) => console.log(`\n== ${s}`);

const ids = () => {
  let n = 0;
  return { newId: (kind) => `${kind}-${++n}` };
};
const CTX = () => ({ ids: ids(), now: '2026-08-01', actorUserId: 'u:jacob' });
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

  // Prototype-borne `id`: hasOwnProperty is false, and a spread does not copy it either.
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

  // --- the hole: the patch is SPREAD, so any key that is not id/userId lands in the record.
  const junk = core.updateParticipant(t, id, { hacked: 'yes', ownerId: 'u:mallory' });
  ok('R52: an unenumerated key cannot reach the participant record (A-18)',
    junk.participants[0].hacked === undefined && junk.participants[0].ownerId === undefined,
    `record is now ${JSON.stringify(junk.participants[0])} — updateParticipant spreads the patch, ` +
      'while addParticipant writes field by field and cites A-18 for doing so');

  // A runtime-invalid `kind` — the parser has an enum, the build function does not.
  const badKind = core.updateParticipant(t, id, { kind: 'owner' });
  ok('R52: updateParticipant refuses a kind outside PARTICIPANT_KINDS',
    badKind.participants[0].kind === 'contact' || badKind.participants[0].kind === 'self',
    `kind is now ${JSON.stringify(badKind.participants[0].kind)}; fromJSON has an enum for this field ` +
      'and the build function does not');
}

// ---------------------------------------------------------------- B
head('B  the type-legal corruption chain');
{
  // `ParticipantPatch.displayName?: string` — passing an explicit `undefined` is legal
  // TypeScript (there is no exactOptionalPropertyTypes in cairn/tsconfig.json), so this is a
  // fully type-checked caller, not a cast.
  const [t0, id] = withOne();
  const t = core.updateParticipant(t0, id, { displayName: undefined });
  ok('displayName survives a { displayName: undefined } patch',
    typeof t.participants[0].displayName === 'string',
    `displayName is now ${JSON.stringify(t.participants[0].displayName)}`);

  const vErr = threw(() => core.validateTrip(t));
  ok('R52: validateTrip never throws (its own docstring)', vErr === null,
    `validateTrip threw ${vErr && vErr.constructor.name}: ${vErr && vErr.message}`);

  const back = threw(() => core.fromJSON(core.toJSON(t)));
  ok('R52: a document this build wrote can be read back by this build', back === null,
    `fromJSON refused its own toJSON output: ${back && back.message}`);

  // The same chain with a runtime-invalid kind.
  const [t1, id1] = withOne();
  const t2 = core.updateParticipant(t1, id1, { kind: 'owner' });
  const backKind = threw(() => core.fromJSON(core.toJSON(t2)));
  ok('R52: an invalid kind is caught before it reaches an export', backKind === null,
    `export cannot be re-imported: ${backKind && backKind.message}`);
  const issuesKind = threw(() => core.validateTrip(t2));
  const codes = Array.isArray(issuesKind) ? issuesKind.map((i) => i.code) : [];
  ok('R52: validateTrip reports the unrestorable kind (place_hours_malformed\'s shape)',
    codes.some((c) => String(c).includes('participant') || String(c).includes('kind')),
    `validateTrip is silent: ${JSON.stringify(codes)}`);
}

// ---------------------------------------------------------------- C
head('C  fromJSON against hostile documents');
{
  const [t] = withOne();
  const base = docOf(t);
  const doc = (mut) => {
    const d = JSON.parse(JSON.stringify(base));
    mut(d);
    return d;
  };
  const P = (over = {}) => ({ id: 'participant-1', displayName: 'A', kind: 'contact', userId: null, ...over });

  // TRIPWIRE. ARCHITECTURE A-73 (revision 54, queued as ROADMAP I-9a) withdraws this parser
  // refusal and gives `duplicate_participant_id` one home in `validateTrip`. These three
  // assertions are EXPECTED to invert when I-9a lands; a probe that fires for the reason it was
  // written for is working. What must stay true after I-9a is section M's validateTrip half.
  const dup = threw(() => core.fromJSON(doc((d) => { d.participants = [P(), P({ displayName: 'B' })]; })));
  ok('duplicate participant id is refused at its path (tripwire: inverts at I-9a)',
    dup !== null && /\$\.participants\[1\]\.id/.test(String(dup.path ?? dup.message)), String(dup));

  const dupFar = threw(() => core.fromJSON(doc((d) => {
    d.participants = [P(), P({ id: 'participant-2' }), P({ id: 'participant-3' }), P()];
  })));
  ok('a duplicate three rows later is still refused (tripwire: inverts at I-9a)',
    dupFar !== null && /participants\[3\]/.test(String(dupFar.path ?? dupFar.message)), String(dupFar));

  const empties = threw(() => core.fromJSON(doc((d) => {
    d.participants = [P({ id: '' }), P({ id: '', displayName: 'B' })];
  })));
  ok('two empty-string ids collide like any other duplicate (tripwire: inverts at I-9a)', empties !== null, 'accepted');

  const oneEmptyId = threw(() => core.fromJSON(doc((d) => { d.participants = [P({ id: '' })]; })));
  ok('note-worthy: a single empty-string participant id',
    true, '');
  note(`a lone id:"" ${oneEmptyId === null ? 'PARSES' : 'is refused'} — same as every other opaque id in core`);

  for (const [label, mut] of [
    ['participants: {} (not an array)', (d) => { d.participants = {}; }],
    ['participants: null', (d) => { d.participants = null; }],
    ['a null row', (d) => { d.participants = [null]; }],
    ['a string row', (d) => { d.participants = ['Zoë']; }],
    ['id: 7', (d) => { d.participants = [P({ id: 7 })]; }],
    ['displayName missing', (d) => { d.participants = [{ id: 'p', kind: 'contact' }]; }],
    ['kind: "self "', (d) => { d.participants = [P({ kind: 'self ' })]; }],
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
  const p = {
    storage: client.memoryStorage(), file: client.memoryFile(),
    clock: client.fixedClockPort('2026-08-01'), ids: client.sequentialIdPort(),
    scheduler: client.immediateScheduler(),
  };
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

  // Save/reopen the interleaved document.
  const tripId = store.getState().doc.id;
  const before = JSON.stringify(store.getState().doc.participants);
  await store.save?.();
  const store2 = client.createStore({ ports: p });
  await store2.openTrip?.(tripId);
  const after = store2.getState().doc ? JSON.stringify(store2.getState().doc.participants) : null;
  ok('the interleaved participant list survives save + reopen', after === before, `${after} !== ${before}`);
}

// ---------------------------------------------------------------- F
head('F  KD-96 — the downgrade, executed');
{
  const [t0, id] = withOne('Zoë');
  const t = core.updateParticipant(t0, id, { note: 'her mother' });
  const newDoc = docOf(core.addParticipant(t, { displayName: 'Jacob', kind: 'self' }, CTX()));
  ok('the new document carries two participants and schemaVersion 2',
    newDoc.participants.length === 2 && newDoc.schemaVersion === 2, JSON.stringify(newDoc.schemaVersion));

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
    const opened = old.fromJSON(newDoc);
    note(`the OLD build opens the new document without complaint: schemaVersion ${opened.schemaVersion}, ` +
      `participants field ${'participants' in opened ? 'present' : 'ABSENT'}`);
    const resaved = old.toJSON(opened);
    ok('R52/KD-96: an older build re-saving a newer document preserves participants',
      Array.isArray(resaved.participants) && resaved.participants.length === 2,
      `the old build wrote ${resaved.participants === undefined ? 'NO participants field at all' : JSON.stringify(resaved.participants)} — ` +
        'the user\'s record of who they travelled with is gone, silently, with no version refusal');
    const reopened = core.fromJSON(resaved);
    ok('R52/KD-96: the new build can still see them after that round trip',
      reopened.participants.length === 2, `${reopened.participants.length} participants remain`);
    note(`for contrast, photos: the same old build refuses a schemaVersion-3 document outright ` +
      `(${String(threw(() => old.fromJSON({ ...newDoc, schemaVersion: 3 })))})`);
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
    ok('no displayName, note-about-a-person or minted participant id in the shipped bytes',
      !raw.includes('displayName') && !raw.includes('participant-') && !/"participants":\s*\[[^\]]/.test(raw),
      'a participant field leaked into the bundle');
    // Fail-closed check: redact a trip that DOES have participants.
    const redact = await import(pathToFileURL(join(CAIRN, 'tools/redact.mjs')).href);
    const [t, pid] = withOne('Zoë Real-Name');
    const t2 = core.updateParticipant(t, pid, { note: 'girlfriend' });
    const out = JSON.stringify(redact.redactForSample(t2));
    ok('redactForSample fails CLOSED once a trip acquires participants',
      !out.includes('Zoë Real-Name') && !out.includes('girlfriend'), out.slice(0, 400));
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
  ok('R52: toJSON tolerates it the same way `photos` does (`trip.photos ?? []`)', jErr === null,
    `toJSON threw ${jErr && jErr.constructor.name}: ${jErr && jErr.message}`);
}

// ---------------------------------------------------------------- K
head('K  what the untyped action boundary does to a stored trip');
{
  const p = {
    storage: client.memoryStorage(), file: client.memoryFile(),
    clock: client.fixedClockPort('2026-08-01'), ids: client.sequentialIdPort(),
    scheduler: client.immediateScheduler(),
  };
  const store = client.createStore({ ports: p });
  await store.createTrip({
    title: 'Bricked?', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }],
  });
  const tripId = store.getState().doc.id;

  // The action boundary is JSON-shaped and untyped at runtime — §2.1's own premise, and the
  // reason `setTripMeta` runtime-checks `datePrecision` (QA P2-7).
  store.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoë', kind: 'owner' } });
  ok('R52: an out-of-enum kind never reaches the document through a dispatch',
    store.getState().doc.participants.length === 0
      || store.getState().doc.participants[0].kind !== 'owner',
    `stored kind is ${JSON.stringify(store.getState().doc.participants[0]?.kind)}`);

  await store.save?.();
  const store2 = client.createStore({ ports: p });
  const reopen = await store2.openTrip(tripId).then(() => null, (e) => e);
  ok('R52: the trip can still be opened after that dispatch + save', reopen === null,
    `openTrip refused the saved document: ${reopen && reopen.message} — the trip is unopenable, ` +
      'which is QA P2-7\'s harm ("a trip that writes itself into a state it cannot be opened from")');

  // A `{ displayName: undefined }` patch is legal TypeScript (no exactOptionalPropertyTypes),
  // so this is what a typed caller can do — and `computeDerived` calls `validateTrip` for the
  // Issues panel on every document change.
  const p2 = {
    storage: client.memoryStorage(), file: client.memoryFile(),
    clock: client.fixedClockPort('2026-08-01'), ids: client.sequentialIdPort(),
    scheduler: client.immediateScheduler(),
  };
  const s3 = client.createStore({ ports: p2 });
  await s3.createTrip({
    title: 'Derived', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }],
  });
  s3.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoë' } });
  const pid = s3.getState().doc.participants[0].id;
  s3.dispatch({ type: 'updateParticipant', participantId: pid, patch: { displayName: undefined } });
  const derived = threw(() => s3.getDerived());
  ok('R52: the derived cache (Issues panel) still computes after that patch', derived === null,
    `derived threw ${derived && derived.constructor.name}: ${derived && derived.message} — ` +
      'validateTrip is called by computeDerived, so every view of this trip is down');
}

// ---------------------------------------------------------------- L
head('L  mergeTrips — the two-tab path (QA P2-3\'s shape, one record class over)');
{
  const ctx = CTX();
  const base = core.addParticipant(trip(), { displayName: 'Zoë' }, ctx);
  const zoe = base.participants[0].id;

  // Tab A (local) adds a participant. Tab B (remote) adds a different one and edits Zoë.
  const local = core.addParticipant(base, { displayName: 'Jacob', kind: 'self' }, CTX());
  let remote = core.addParticipant(base, { displayName: 'Zoë\'s mother' }, (() => {
    const f = ids(); f.newId('participant'); return { ids: f, now: '2026-08-01', actorUserId: 'u:jacob' };
  })());
  remote = core.updateParticipant(remote, zoe, { note: 'drove the second leg' });

  const { trip: merged, report } = core.mergeTrips(base, local, remote);
  const names = merged.participants.map((x) => x.displayName).sort();
  ok('R52: mergeTrips keeps BOTH tabs\' participants',
    names.length === 3, `merged list is ${JSON.stringify(names)}`);
  ok('R52: a participant the merge dropped is at least REPORTED',
    names.length === 3 || JSON.stringify(report).includes('participant'),
    `the merge report says nothing about participants: ${JSON.stringify(report)}`);
  ok('R52: the remote tab\'s edit to an existing participant survives',
    merged.participants.find((x) => x.id === zoe)?.note === 'drove the second leg',
    'the note the other tab wrote is gone');

  // The same three documents, one record class over, to show the difference is participants.
  note(`for contrast, photos ARE merged: mergeTrips names them explicitly at mergeTrips.ts:243`);

  // And the reverse direction: a participant REMOVED remotely comes back.
  const removedRemotely = core.removeParticipant(base, zoe);
  const m2 = core.mergeTrips(base, local, removedRemotely).trip;
  ok('R52: a participant removed in the other tab stays removed after a merge',
    !m2.participants.some((x) => x.id === zoe),
    'the deletion the other tab made was undone by the merge, silently');
}

// ---------------------------------------------------------------- M
head('M  what the two participant issues actually SAY');
{
  const [t0] = withOne();
  const P = (o) => ({ id: 'p1', displayName: 'A', kind: 'contact', userId: null, ...o });
  const msgs = (parts) => core.validateTrip({ ...t0, participants: parts })
    .filter((i) => i.code === 'duplicate_participant_id').map((i) => i.message);

  const blankDup = msgs([P({ displayName: '' }), P({ displayName: 'Zoë' })]);
  ok('R52: a nameless participant is not described as a city',
    blankDup.every((m) => !/city/i.test(m)),
    `${JSON.stringify(blankDup)} — validateTrip's \`namePhrase\` is the CITY helper ` +
      '(its own fallback string is "a city with no name") and it is reused verbatim for people');

  const blankSelf = msgs([P({ id: 'a', kind: 'self', displayName: '  ' }), P({ id: 'b', kind: 'self', displayName: 'Zoë' })]);
  ok('R52: the duplicate-self message does not call a person a city',
    blankSelf.every((m) => !/city/i.test(m)), JSON.stringify(blankSelf));

  const three = msgs([P({ id: 'a', kind: 'self' }), P({ id: 'b', kind: 'self' }), P({ id: 'c', kind: 'self' })]);
  note(`three kind:'self' rows report ${three.length} issue(s) — the code comment says ` +
    '"reported once, on the second row, not once per row after it"');

  const threeIds = msgs([P({ displayName: 'A' }), P({ displayName: 'B' }), P({ displayName: 'C' })]);
  note(`three rows sharing one id report ${threeIds.length} issue(s)`);

  // What the two mutators do to a duplicated id — the message promises this behaviour.
  const dupTrip = { ...t0, participants: [P({ displayName: 'A' }), P({ displayName: 'B' })] };
  ok('removeParticipant on a duplicated id removes both rows, as the message says',
    core.removeParticipant(dupTrip, 'p1').participants.length === 0);
  ok('updateParticipant on a duplicated id edits only the first, as the message says',
    core.updateParticipant(dupTrip, 'p1', { displayName: 'Z' }).participants.map((x) => x.displayName).join(',') === 'Z,B');
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}`);
process.exit(fails === 0 ? 0 : 1);
