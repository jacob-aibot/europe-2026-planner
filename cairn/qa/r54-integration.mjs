/**
 * QA round 54 — the **Phase 2 phase gate**, cross-cutting half (ROADMAP `I-11`).
 *
 *   node --experimental-strip-types cairn/qa/r54-integration.mjs
 *
 * `r54-gate.mjs` re-derives the exit criteria one at a time. This file does the thing a
 * single-increment breaker round structurally cannot: it puts **everything Phase 2 built** into
 * one document and one store and drives them together — cities, days, stops, a pool, bookings,
 * places, photos being imported, participants, conflicts, the summary row, `travelStats`, the
 * redaction pipeline, the CLI, undo/redo across mixed record classes, a two-tab merge, a
 * `SUMMARY_VERSION` rescan under a second live store, and an export/re-import round trip.
 *
 * A `FAIL` line is a finding. `note` records a measurement. `GAP` is a known, routed item.
 * The run always ends with a `COMPLETE` marker; a run without it is INCOMPLETE.
 *
 * Section index
 *   A  the combined document — built once, and every derive function run over it
 *   B  participants × detectConflicts / geoCheck / validateTrip — the negative claim, measured
 *   C  participants × tripSummary × travelStats — no name, no count, no leak
 *   D  participants × the redaction pipeline and the shipped sample
 *   E  participants × the CLI (every command, over a participant-bearing document)
 *   F  undo / redo across MIXED record types, interleaved, at depth 50
 *   G  two tabs, four record classes edited concurrently, one merge
 *   H  export → re-import of the whole combined document
 *   I  the SUMMARY_VERSION rescan (exit criterion 8) with participants and a second live store
 *   J  the 200-step dirty walk with participant, photo, booking and stop edits in the chooser
 *   K  the photo store mechanism under combined load — generation guard, settling, the
 *      subscriber-exception brand, all at once
 *   L  the ROADMAP attack list's structural cases, run against the combined document
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

let fails = 0, gaps = 0, notes = 0;
const failLines = [];
const ok = (l, c, d) => {
  if (c) console.log(`ok   ${l}`);
  else { fails++; failLines.push(l); console.log(`FAIL ${l}${d === undefined ? '' : ` — ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); }
};
const eq = (l, a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); ok(l, x === y, x === y ? undefined : `got ${x} want ${y}`); };
const note = (l, d) => { notes++; console.log(`note ${l}${d === undefined ? '' : ` — ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); };
const gap = (l, d) => { gaps++; console.log(`GAP  ${l}${d === undefined ? '' : ` — ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); };
const section = (n) => console.log(`\n=== ${n} ===`);
const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };
const threwAsync = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };

const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
const client = await import(resolve(CAIRN, 'packages/client/src/index.ts'));

const TODAY = '2026-08-01';
const mkPorts = (over = {}) => ({
  storage: client.memoryStorage(),
  file: client.memoryFile(),
  photo: client.memoryPhotos(),
  clock: client.fixedClockPort(TODAY),
  ids: client.sequentialIdPort(`i${Math.floor(Math.random() * 1e6)}-`),
  scheduler: client.immediateScheduler(),
  ...over,
});
const taggedBytes = (name, n = 64) => {
  const out = new Uint8Array(n);
  for (let i = 0; i < name.length && i < n; i++) out[i] = name.charCodeAt(i) & 0x7f;
  return out;
};
const file = (name, type = 'image/jpeg') => ({ name, type, bytes: taggedBytes(name) });

// ---------------------------------------------------------------------------
section('A — the combined document: everything Phase 2 built, in one trip');
// ---------------------------------------------------------------------------
const P = mkPorts();
const store = client.createStore({ ports: P });
await store.createTrip({
  title: 'Europe 2026 (combined)',
  startDate: '2026-08-07',
  endDate: '2026-08-22',
  homeCurrency: 'EUR',
  cities: [
    { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } },
    { key: 'dubrovnik', name: 'Dubrovnik', countryCode: 'HR', centre: { lat: 42.6507, lng: 18.0944 } },
    { key: 'split', name: 'Split', countryCode: 'HR', centre: { lat: 43.5081, lng: 16.4402 } },
    { key: 'prague', name: 'Prague', countryCode: 'CZ', centre: { lat: 50.0755, lng: 14.4378 } },
    { key: 'budapest', name: 'Budapest', countryCode: 'HU', centre: { lat: 47.4979, lng: 19.0402 } },
    { key: 'london', name: 'London', countryCode: 'GB', centre: { lat: 51.5074, lng: -0.1278 } },
  ],
});
const TRIP_ID = store.getState().activeTripId;
const days = store.getState().doc.days.map((d) => d.id);

// Days in two cities; a day that is the overnight leg; a stop with no coordinates.
store.dispatch({ type: 'setDayMeta', dayId: days[0], patch: { primaryCity: 'vienna', title: 'LAX → VIE' } });
store.dispatch({ type: 'setDayMeta', dayId: days[6], patch: { primaryCity: 'split', title: 'Islands' } });
store.dispatch({ type: 'setDayMeta', dayId: days[11], patch: { primaryCity: 'vienna', title: 'Vienna again (non-contiguous)' } });
store.dispatch({
  type: 'addStop', placement: { kind: 'scheduled', dayId: days[0], time: '23:40', order: 0 },
  stop: { name: 'Condor DE2081 → Frankfurt (crosses midnight)', category: 'transit', travelRole: 'transfer', place: { kind: 'inline', at: { lat: 33.9425, lng: -118.4081 } } },
});
store.dispatch({
  type: 'addStop', placement: { kind: 'scheduled', dayId: days[1], time: '07:05', order: 0 },
  stop: { name: 'Arrive VIE', category: 'transit', place: { kind: 'inline', at: { lat: 48.1103, lng: 16.5697 } } },
});
store.dispatch({
  type: 'addStop', placement: { kind: 'scheduled', dayId: days[6], time: '10:00', order: 0 },
  stop: { name: 'Blue Cave, Biševo (no country at any scale)', category: 'sight', place: { kind: 'inline', at: { lat: 43.0086, lng: 16.0122 } } },
});
store.dispatch({
  type: 'addStop', placement: { kind: 'scheduled', dayId: days[6], time: '14:00', order: 1 },
  stop: { name: 'A stop with NO coordinates at all', category: 'food' },
});
store.dispatch({
  type: 'addStop', placement: { kind: 'pool', cityKey: 'prague' },
  stop: { name: 'Pool: Petřín Hill', category: 'sight', place: { kind: 'inline', at: { lat: 50.0836, lng: 14.3947 } } },
});
// Two bookings with the same reference from two emails — the duplicate case.
for (const issued of ['2026-07-16', '2026-08-04']) {
  store.dispatch({
    type: 'upsertBooking',
    booking: {
      id: `booking-${issued}`, tripId: TRIP_ID, kind: 'flight', operator: 'Smartwings', reference: 'YZGDTS',
      route: { fromName: 'Split', toName: 'Prague' },
      startsAt: { date: issued === '2026-07-16' ? '2026-08-18' : '2026-08-15', time: '14:40' },
      price: null, party: 1, status: 'active', issuedAt: issued, ticket: null,
      provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-08-04', acceptedAt: '2026-08-04', actorUserId: core.LOCAL_OWNER },
    },
  });
}
// Participants: a real name, a nameless one, a `self`.
store.dispatch({ type: 'addParticipant', participant: { displayName: 'Zoë Müller', kind: 'contact', note: 'met in Split' } });
store.dispatch({ type: 'addParticipant', participant: { displayName: '', kind: 'contact' } });
store.dispatch({ type: 'addParticipant', participant: { displayName: 'Jacob', kind: 'self' } });
// Photos, imported through the real store and the real port.
P.photo.next = [file('a.jpg'), file('b.jpg'), file('c.jpg'), file('d.jpg')];
await store.importPhotos({ kind: 'trip' });
await store.flush();

const DOC = store.getState().doc;
note('A1  the combined document', {
  days: DOC.days.length, cities: DOC.cities.length,
  scheduled: DOC.days.flatMap((d) => d.stops).length, pool: DOC.pool.length,
  bookings: DOC.bookings.length, photos: DOC.photos.length, participants: DOC.participants.length,
  schemaVersion: DOC.schemaVersion,
});
eq('A1a four photos landed', DOC.photos.length, 4);
eq('A1b three participants landed', DOC.participants.length, 3);
eq('A1c schemaVersion is 3', DOC.schemaVersion, core.SCHEMA_VERSION);

// Every derive function runs over it without throwing.
for (const [name, fn] of [
  ['detectConflicts', () => core.detectConflicts(DOC, { today: TODAY })],
  ['validateTrip', () => core.validateTrip(DOC)],
  ['geoCheck', () => core.geoCheck(DOC)],
  ['tripSummary', () => core.tripSummary(DOC, core.COUNTRY_INDEX)],
  ['toJSON', () => core.toJSON(DOC)],
  ['computeDerived', () => client.computeDerived(DOC, TODAY)],
]) {
  const e = threw(fn);
  ok(`A2  ${name} runs over the combined document`, e === null, e?.message?.slice(0, 200));
}
note('A2a conflicts on the combined document', core.detectConflicts(DOC, { today: TODAY }).map((c) => `${c.ruleId}/${c.severity}`));
note('A2b issues on the combined document', [...new Set(core.validateTrip(DOC).map((i) => i.code))]);
ok('A3  the duplicate booking reference is SURFACED, not silently resolved',
  core.detectConflicts(DOC, { today: TODAY }).some((c) => c.ruleId === 'duplicate_booking' || c.ruleId === 'superseded_booking'),
  core.detectConflicts(DOC, { today: TODAY }).map((c) => c.ruleId));

// ---------------------------------------------------------------------------
section('B — participants × detectConflicts / geoCheck / validateTrip');
// ---------------------------------------------------------------------------
{
  const stripped = { ...DOC, participants: [] };
  const c1 = core.detectConflicts(DOC, { today: TODAY });
  const c0 = core.detectConflicts(stripped, { today: TODAY });
  eq('B1  detectConflicts is byte-identical with and without participants',
    JSON.stringify(c1.map((c) => [c.id, c.ruleId, c.severity, c.summary, c.params])),
    JSON.stringify(c0.map((c) => [c.id, c.ruleId, c.severity, c.summary, c.params])));
  eq('B2  geoCheck is byte-identical with and without participants',
    JSON.stringify(core.geoCheck(DOC)), JSON.stringify(core.geoCheck(stripped)));
  const i1 = core.validateTrip(DOC).map((i) => i.code).sort();
  const i0 = core.validateTrip(stripped).map((i) => i.code).sort();
  const added = i1.filter((c, idx) => c !== i0[idx]);
  eq('B3  validateTrip differs ONLY by the participant codes',
    [...new Set(i1)].filter((c) => !new Set(i0).has(c)).sort(), ['participant_name_empty']);
  void added;
  // 200 participants must not move any of the three.
  let many = DOC;
  const bulkCtx = { ids: core.sequentialIds('bulk'), now: TODAY, actorUserId: core.LOCAL_OWNER };
  for (let i = 0; i < 200; i++) many = core.addParticipant(many, { displayName: `Person ${i}`, kind: 'contact' }, bulkCtx);
  eq('B4  203 participants', many.participants.length, 203);
  eq('B4a detectConflicts unmoved at 203 participants',
    JSON.stringify(core.detectConflicts(many, { today: TODAY }).map((c) => c.id)), JSON.stringify(c1.map((c) => c.id)));
  eq('B4b geoCheck unmoved at 203 participants', JSON.stringify(core.geoCheck(many)), JSON.stringify(core.geoCheck(DOC)));
  const e = threw(() => core.validateTrip(many));
  ok('B4c validateTrip does not throw at 203 participants', e === null, e?.message);
  // The same id twice, and two people with one name — surfaced, not resolved.
  const dupIdDoc = { ...DOC, participants: [DOC.participants[0], { ...DOC.participants[2], id: DOC.participants[0].id }] };
  const dupIssues = core.validateTrip(dupIdDoc).filter((i) => i.code === 'duplicate_participant_id');
  eq('B5  the same participant id twice is reported by validateTrip', dupIssues.length, 1);
  ok('B5a and the message names the PEOPLE, not only the id', /Zo|Jacob|no name/.test(dupIssues[0]?.message ?? ''), dupIssues[0]?.message);
  const sameName = { ...DOC, participants: [DOC.participants[0], { ...DOC.participants[0], id: 'participant-zzz' }] };
  eq('B5b two people with the same name and different ids is NOT an issue', core.validateTrip(sameName).filter((i) => i.code === 'duplicate_participant_id').length, 0);
  // `kind: 'self'` twice, and zero times.
  const twoSelf = { ...DOC, participants: [{ ...DOC.participants[2] }, { ...DOC.participants[2], id: 'participant-self2' }] };
  const eSelf = threw(() => core.validateTrip(twoSelf));
  ok('B6  two `self` rows do not throw', eSelf === null, eSelf?.message);
  note('B6a what two `self` rows report', core.validateTrip(twoSelf).map((i) => i.code));
  const noSelf = { ...DOC, participants: DOC.participants.filter((p) => p.kind !== 'self') };
  eq('B6b zero `self` rows reports nothing extra',
    core.validateTrip(noSelf).filter((i) => i.code.startsWith('participant')).map((i) => i.code).sort(),
    ['participant_name_empty']);
}

// ---------------------------------------------------------------------------
section('C — participants × tripSummary × travelStats');
// ---------------------------------------------------------------------------
{
  const row = core.tripSummary(DOC, core.COUNTRY_INDEX);
  const rowNoP = core.tripSummary({ ...DOC, participants: [] }, core.COUNTRY_INDEX);
  eq('C1  the summary row is byte-identical with and without participants', JSON.stringify(row), JSON.stringify(rowNoP));
  ok('C1a no participant name is anywhere in the row', !JSON.stringify(row).includes('Zoë') && !JSON.stringify(row).includes('Müller') && !JSON.stringify(row).includes('Jacob'));
  ok('C1b the row has no participant-shaped key', !Object.keys(row).some((k) => /particip|people|person/i.test(k)), Object.keys(row));
  // travelStats over a library of participant-bearing rows.
  const rows = [row];
  for (let i = 0; i < 3; i++) {
    const c = { ids: core.sequentialIds(`c${i}`), now: TODAY, actorUserId: core.LOCAL_OWNER };
    let t = core.createTrip({ title: `Other ${i}`, startDate: `202${5 + i}-03-01`, endDate: `202${5 + i}-03-06`, cities: [{ key: `k${i}`, name: `City ${i}`, countryCode: 'HR', centre: { lat: 43 + i, lng: 16 + i } }] }, c);
    t = core.addParticipant(t, { displayName: `Traveller ${i}`, kind: 'contact' }, c);
    rows.push(core.tripSummary(t, core.COUNTRY_INDEX));
  }
  const stats = core.travelStats(rows, '2026-12-31');
  const e = threw(() => core.travelStats(rows, '2026-12-31'));
  ok('C2  travelStats runs over a participant-bearing library', e === null, e?.message);
  ok('C2a and leaks no participant name', !JSON.stringify(stats).includes('Traveller') && !JSON.stringify(stats).includes('Zoë'));
  ok('C2b and has no participant-shaped field', !/particip|people/i.test(JSON.stringify(Object.keys(stats))), Object.keys(stats));
  note('C2c the stats', { countries: stats.countries.length, cities: stats.cities.length, daysTravelled: stats.daysTravelled, trips: stats.trips });
  // Adjacent-but-not-overlapping ranges, and today == startDate == endDate.
  const mk = (id, s, en) => ({ ...rows[1], id, startDate: s, endDate: en, title: id });
  const adjacent = [mk('t-a', '2026-05-01', '2026-05-10'), mk('t-b', '2026-05-11', '2026-05-20')];
  const adjStats = core.travelStats(adjacent, '2026-12-31');
  eq('C3  two adjacent non-overlapping ranges count every day once (10 + 10)', adjStats.daysTravelled, 20);
  const boundary = core.travelStats([mk('t-c', '2026-08-01', '2026-08-01')], '2026-08-01');
  eq('C3a today == startDate == endDate contributes exactly one day', boundary.daysTravelled, 1);
  eq('C3b …and the trip is active', boundary.trips.active, 1);
}

// ---------------------------------------------------------------------------
section('D — participants × the redaction pipeline');
// ---------------------------------------------------------------------------
{
  const redact = await import(resolve(CAIRN, 'tools/redact.mjs'));
  const fn = redact.redactForSample ?? redact.default?.redactForSample;
  if (typeof fn !== 'function') {
    gap('D0  redactForSample is not exported from tools/redact.mjs under that name', Object.keys(redact));
  } else {
    const redacted = fn(DOC);
    const bytes = JSON.stringify(redacted);
    ok('D1  redactForSample drops every participant name', !bytes.includes('Zoë') && !bytes.includes('Müller') && !bytes.includes('Jacob'));
    ok('D1a and the note about a person', !bytes.includes('met in Split'));
    eq('D1b it fails CLOSED — participants is emitted as []', redacted.participants, []);
    ok('D1c photos are emitted as [] with no caption, coordinate or timestamp', JSON.stringify(redacted.photos) === '[]', redacted.photos);
  }
  // The shipped sample really has no participant content.
  const samplePath = resolve(CAIRN, 'apps/web/src/sample/europe2026.json');
  const sample = JSON.parse(readFileSync(samplePath, 'utf8'));
  eq('D2  the shipped sample carries participants: []', sample.participants, []);
  eq('D2a and photos: []', sample.photos, []);
  eq('D2b at schemaVersion 3', sample.schemaVersion, core.SCHEMA_VERSION);
}

// ---------------------------------------------------------------------------
section('E — participants × the CLI');
// ---------------------------------------------------------------------------
{
  const COORD = /-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/;
  const cmds = [['trip'], ['day', '2026-08-13'], ['conflicts'], ['stats'], ['photos', 'fixtures/photo/jpeg-exif-gps.jpg']];
  for (const args of cmds) {
    let out = '', code = 0;
    try { out = execFileSync('node', ['--experimental-strip-types', 'cli.ts', ...args], { cwd: CAIRN, encoding: 'utf8', maxBuffer: 32e6, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { code = e.status ?? 1; out = String(e.stdout ?? '') + String(e.stderr ?? ''); }
    ok(`E1  cli ${args.join(' ')} exits 0`, code === 0, `exit ${code}: ${out.slice(0, 200)}`);
    ok(`E1a cli ${args.join(' ')} prints no coordinate`, !COORD.test(out), COORD.exec(out)?.[0]);
    ok(`E1b cli ${args.join(' ')} prints no participant name`, !/Zoë|Müller/.test(out));
  }
}

// ---------------------------------------------------------------------------
section('F — undo / redo across MIXED record types, interleaved, at depth 50');
// ---------------------------------------------------------------------------
{
  const p = mkPorts();
  const s = client.createStore({ ports: p });
  await s.createTrip({ title: 'Mixed', startDate: '2026-08-07', endDate: '2026-08-12', cities: [{ key: 'v', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }] });
  const d = s.getState().doc.days.map((x) => x.id);
  p.photo.next = [file('m1.jpg'), file('m2.jpg')];
  await s.importPhotos({ kind: 'trip' });
  const snaps = [];
  const fingerprint = () => {
    const doc = s.getState().doc;
    return JSON.stringify({
      stops: doc.days.flatMap((x) => x.stops.map((y) => y.name)),
      pool: doc.pool.map((y) => y.name),
      photos: doc.photos.map((y) => `${y.id}:${y.caption ?? ''}`),
      participants: doc.participants.map((y) => `${y.id}:${y.displayName}:${y.kind}`),
      bookings: doc.bookings.map((y) => y.reference),
      dayTitles: doc.days.map((y) => y.title ?? ''),
    });
  };
  const photoIds = s.getState().doc.photos.map((x) => x.id);
  for (let i = 0; i < 50; i++) {
    snaps.push(fingerprint());
    const which = i % 5;
    if (which === 0) s.dispatch({ type: 'addParticipant', participant: { displayName: `Mix ${i}`, kind: 'contact' } });
    else if (which === 1) s.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId: d[i % d.length], time: '09:00', order: 0 }, stop: { name: `Stop ${i}`, category: 'sight' } });
    else if (which === 2) s.dispatch({ type: 'updatePhoto', photoId: photoIds[i % photoIds.length], patch: { caption: `Caption ${i}` } });
    else if (which === 3) s.dispatch({ type: 'setDayMeta', dayId: d[i % d.length], patch: { title: `Day ${i}` } });
    else s.dispatch({ type: 'upsertBooking', booking: { id: `bk-${i}`, tripId: s.getState().activeTripId, kind: 'other', operator: 'Op', reference: `REF${i}`, startsAt: { date: '2026-08-10', time: null }, price: null, party: null, status: 'active', issuedAt: '2026-08-01', ticket: null, provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-08-01', acceptedAt: '2026-08-01', actorUserId: core.LOCAL_OWNER } } });
  }
  const top = fingerprint();
  let bad = 0, firstBad = null;
  for (let i = 49; i >= 0; i--) {
    s.undo();
    if (fingerprint() !== snaps[i]) { bad++; if (firstBad === null) firstBad = i; }
  }
  eq('F1  50 undos across five record classes restore every intermediate state exactly', bad, 0);
  if (bad) note('F1a first divergence at step', firstBad);
  for (let i = 0; i < 50; i++) s.redo();
  eq('F2  50 redos restore the top of the stack exactly', fingerprint(), top);
  // Undo past the bottom, then redo past the top — neither may corrupt.
  for (let i = 0; i < 60; i++) s.undo();
  for (let i = 0; i < 80; i++) s.redo();
  eq('F3  over-undo then over-redo lands back on the top, not on a torn state', fingerprint(), top);
  const e = threw(() => core.toJSON(s.getState().doc));
  ok('F3a and the document still serialises', e === null, e?.message);
}

// ---------------------------------------------------------------------------
section('G — two tabs, four record classes edited concurrently, one merge');
// ---------------------------------------------------------------------------
{
  const storage = client.memoryStorage();
  const pA = mkPorts({ storage, ids: client.sequentialIdPort('A-') });
  const pB = mkPorts({ storage, ids: client.sequentialIdPort('B-') });
  const A = client.createStore({ ports: pA });
  await A.createTrip({ title: 'Two tabs', startDate: '2026-08-07', endDate: '2026-08-10', cities: [{ key: 'v', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }] });
  const id = A.getState().activeTripId;
  const dayId = A.getState().doc.days[0].id;
  A.dispatch({ type: 'addParticipant', participant: { displayName: 'Shared person', kind: 'contact' } });
  A.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId, time: '09:00', order: 0 }, stop: { name: 'Shared stop', category: 'sight' } });
  pA.photo.next = [file('shared.jpg')];
  await A.importPhotos({ kind: 'trip' });
  await A.flush();

  const B = client.createStore({ ports: pB });
  await B.openTrip(id);
  // Tab B edits four record classes.
  B.dispatch({ type: 'addParticipant', participant: { displayName: 'B-only person', kind: 'contact' } });
  B.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId, time: '15:00', order: 1 }, stop: { name: 'B-only stop', category: 'food' } });
  B.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'B title' } });
  pB.photo.next = [file('b-only.jpg')];
  await B.importPhotos({ kind: 'trip' });
  await B.flush();

  // Tab A, still holding its stale document, edits four record classes too and saves.
  A.dispatch({ type: 'addParticipant', participant: { displayName: 'A-only person', kind: 'contact' } });
  A.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId, time: '18:00', order: 2 }, stop: { name: 'A-only stop', category: 'food' } });
  A.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'A title' } });
  pA.photo.next = [file('a-only.jpg')];
  await A.importPhotos({ kind: 'trip' });
  await A.flush();
  const st = A.getState();
  note('G1  tab A’s persistence status after the conflicting save', st.persistence.status);
  ok('G1a the conflict is SURFACED, not silently overwritten', st.persistence.status === 'conflict', st.persistence.status);

  if (typeof A.mergeWithStored === 'function') {
    await A.mergeWithStored();
    const merged = A.getState().doc;
    const names = merged.participants.map((x) => x.displayName).sort();
    const stops = merged.days.flatMap((x) => x.stops.map((y) => y.name)).sort();
    const photos = merged.photos.length;
    eq('G2  the merge keeps BOTH tabs’ participants', names, ['A-only person', 'B-only person', 'Shared person']);
    eq('G2a and BOTH tabs’ stops', stops, ['A-only stop', 'B-only stop', 'Shared stop']);
    ok('G2b and BOTH tabs’ photos (3)', photos === 3, photos);
    const lastMerge = A.getState().persistence.lastMerge ?? null;
    ok('G2c the store records what the merge decided', lastMerge !== null, 'no persistence.lastMerge');
    note('G2d the merge banner the user is shown (R53-1 is about this string)', lastMerge?.message);
    note('G2e the report’s own shape', lastMerge ? Object.fromEntries(Object.entries(lastMerge.report).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])) : null);
    // The overwritten day title must be reported, not silently lost.
    ok('G3  the day-title last-writer-wins is REPORTED, not silently dropped',
      (lastMerge?.report?.overwritten ?? []).length > 0, JSON.stringify(lastMerge?.report ?? {}).slice(0, 300));
    // R53-1, measured at the phase level: does the banner name a PERSON or an opaque id?
    const banner = lastMerge?.message ?? '';
    const namesPeople = /Shared person|A-only person|B-only person/.test(banner);
    note('G3a R53-1 (open, architect-routed): the banner names participants by id, not by name',
      { namesPeople, mentionsParticipant: /participant/.test(banner) });
    const parseErr = threw(() => core.fromJSON(core.toJSON(merged)));
    ok('G4  the merged document round-trips', parseErr === null, parseErr?.message);
    const dup = merged.participants.map((x) => x.id);
    eq('G4a no duplicated participant id survived the merge', dup.length, new Set(dup).size);
    const dupPhoto = merged.photos.map((x) => x.id);
    eq('G4b no duplicated photo id survived the merge', dupPhoto.length, new Set(dupPhoto).size);
    // The bytes storage actually holds.
    const stored = storage.docs.get(id);
    const storedDoc = stored ? core.fromJSON(stored) : null;
    eq('G5  storage holds the merged participants', storedDoc?.participants.map((x) => x.displayName).sort(), names);
    eq('G5a storage holds the merged photos', storedDoc?.photos.length, 3);
  } else {
    gap('G2  the store exposes no mergeWithStored — merge path not driven', Object.keys(A).filter((k) => /merge/i.test(k)));
  }
}

// ---------------------------------------------------------------------------
section('H — export → re-import of the whole combined document');
// ---------------------------------------------------------------------------
{
  const json = core.toJSON(DOC);
  const back = core.fromJSON(json);
  ok('H1  the combined document is byte-identical through toJSON∘fromJSON', core.toJSON(back) === json,
    (() => { const a = core.toJSON(back).split('\n'), b = json.split('\n'); for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) return `first diff at line ${i}: ${JSON.stringify(a[i])} vs ${JSON.stringify(b[i])}`; return 'length only'; })());
  eq('H1a photos survive', back.photos.length, DOC.photos.length);
  eq('H1b participants survive', back.participants.length, DOC.participants.length);
  eq('H1c bookings survive', back.bookings.length, DOC.bookings.length);
  eq('H1d the pool survives', back.pool.length, DOC.pool.length);
  // Through the real store's import path, into a DIFFERENT store.
  const p2 = mkPorts();
  const s2 = client.createStore({ ports: p2 });
  const e = await threwAsync(() => s2.importDoc(json));
  ok('H2  a foreign-but-own-owner export imports through the real store', e === null, e?.message?.slice(0, 200));
  if (e === null) {
    const d2 = s2.getState().doc;
    eq('H2a participants survive the store import', d2.participants.map((x) => x.displayName).sort(), DOC.participants.map((x) => x.displayName).sort());
    eq('H2b photos survive the store import', d2.photos.length, DOC.photos.length);
    // The photo BYTES do not — that is §7's stated scope line, not a defect. Recorded.
    const listing = client.photosFor(s2.getState(), { kind: 'trip' });
    note('H2c photo availability after an import with no bytes', JSON.stringify(listing).slice(0, 240));
  }
  // A foreign document must be refused, not adopted.
  const foreign = JSON.parse(json); foreign.ownerId = 'user:someone-else';
  const fe = await threwAsync(() => s2.importDoc(JSON.stringify(foreign)));
  ok('H3  a document owned by someone else is REFUSED', fe !== null, fe === null ? 'it was adopted' : fe.message.slice(0, 160));
  const stripped = JSON.parse(json); delete stripped.ownerId;
  const se = await threwAsync(() => s2.importDoc(JSON.stringify(stripped)));
  note('H3a and one with ownerId DELETED (QA P2-8 / A-2, architect-routed)', se === null ? 'ADOPTED — still open' : `refused: ${se.message.slice(0, 120)}`);
}

// ---------------------------------------------------------------------------
section('I — exit criterion 8: the SUMMARY_VERSION rescan, with a second live store');
// ---------------------------------------------------------------------------
{
  const storage = client.memoryStorage();
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const p = mkPorts({ storage, ids: client.sequentialIdPort(`r${i}-`) });
    const s = client.createStore({ ports: p });
    await s.createTrip({ title: `Rescan ${i}`, startDate: `2026-0${i + 1}-01`, endDate: `2026-0${i + 1}-05`, cities: [{ key: `c${i}`, name: `City ${i}`, countryCode: 'AT', centre: { lat: 48 + i, lng: 16 + i } }] });
    s.dispatch({ type: 'addParticipant', participant: { displayName: `Person ${i}`, kind: 'contact' } });
    await s.flush();
    ids.push(s.getState().activeTripId);
  }
  // A second store, holding one of those trips open and IDLE.
  const pIdle = mkPorts({ storage, ids: client.sequentialIdPort('idle-') });
  const idle = client.createStore({ ports: pIdle });
  await idle.openTrip(ids[0]);
  await idle.flush();
  const idleVersionBefore = await storage.load(ids[0]).then((r) => r?.version ?? null);
  const idleBytesBefore = storage.docs.get(ids[0]);
  eq('I0  the idle store starts idle', idle.getState().persistence.status, 'idle');

  // Age every row below SUMMARY_VERSION, then reopen the library.
  for (const [tid, row] of storage.summaries) storage.summaries.set(tid, { ...row, summaryVersion: core.SUMMARY_VERSION - 1 });
  const pFresh = mkPorts({ storage, ids: client.sequentialIdPort('fresh-') });
  const fresh = client.createStore({ ports: pFresh });
  await fresh.refreshLibrary();
  const midScan = client.summaryScan(fresh.getState());
  note('I1  the map’s completeness while the rescan is pending', JSON.stringify(midScan).slice(0, 200));
  await fresh.rescanSummaries();
  const after = fresh.getState().library;
  eq('I2  every row is brought current', after.filter((r) => r.summaryVersion !== core.SUMMARY_VERSION).map((r) => r.id), []);
  ok('I2a and each row still names its own trip', after.every((r) => ids.includes(r.id)), after.map((r) => r.id));
  ok('I2b and no row leaks a participant name', !JSON.stringify(after).includes('Person '), JSON.stringify(after).slice(0, 200));

  // Revision 23's half: what the rescan may COST.
  const idleVersionAfter = await storage.load(ids[0]).then((r) => r?.version ?? null);
  eq('I3  the StorageVersion of the open record is UNCHANGED by the rescan', idleVersionAfter, idleVersionBefore);
  eq('I3a and its document bytes are unchanged', storage.docs.get(ids[0]), idleBytesBefore);
  eq('I3b the idle store is still idle after the pass', idle.getState().persistence.status, 'idle');
  idle.dispatch({ type: 'setDayMeta', dayId: idle.getState().doc.days[0].id, patch: { title: 'after the rescan' } });
  await idle.flush();
  eq('I3c and its next keystroke settles without a conflict', idle.getState().persistence.status, 'idle');

  // The ceiling: a row is never computed from another row.
  const src = readFileSync(resolve(CAIRN, 'packages/client/src/store/store.ts'), 'utf8');
  const rescanFn = src.slice(src.indexOf('async function runRescan'), src.indexOf('async function runRescan') + 4000);
  ok('I4  runRescan reads the DOCUMENT, not another row', /load\(|storage\.load/.test(rescanFn));
  ok('I4a and does not call saveIfVersion on the document', !/saveIfVersion/.test(rescanFn), rescanFn.match(/saveIfVersion/g)?.length);
  // §4.3's structural grep: zero ports.storage.* mutations outside chainOntoSaving.
  const mutations = [...src.matchAll(/ports\.storage\.(save|saveIfVersion|put|delete|remove|refreshSummary)\w*\(/g)].map((m) => m[1]);
  note('I5  ports.storage mutating call sites, by method', mutations);
  const chainRegions = [...src.matchAll(/chainOntoSaving\(/g)].length;
  note('I5a chainOntoSaving call sites', chainRegions);
}

// ---------------------------------------------------------------------------
section('J — the 200-step dirty walk, with participant / photo / booking edits');
// ---------------------------------------------------------------------------
{
  // ROADMAP exit criterion 12 asks for exactly this and `packages/client/test/dirty.test.ts`
  // does not do it: its chooser dispatches `setDayMeta` and nothing else. This section is that
  // criterion, run.
  const seededRandom = (seed) => {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  for (const seed of [20260908, 4242, 987654]) {
    const rand = seededRandom(seed);
    const storage = client.memoryStorage();
    const sched = client.manualScheduler();
    const p = mkPorts({ storage, scheduler: sched, ids: client.sequentialIdPort(`w${seed}-`) });
    const s = client.createStore({ ports: p });
    await s.createTrip({ title: 'Walk', startDate: '2026-08-07', endDate: '2026-08-12', cities: [{ key: 'v', name: 'Vienna', centre: { lat: 48.2, lng: 16.37 } }] });
    const id = s.getState().activeTripId;
    const dayIds = s.getState().doc.days.map((d) => d.id);
    p.photo.next = [file('w1.jpg'), file('w2.jpg')];
    await s.importPhotos({ kind: 'trip' });
    let disagreements = 0, staleDerived = 0, firstBad = null;
    const check = (step, what) => {
      const doc = s.getState().doc;
      const oracle = doc === null ? false : core.toJSON(doc) !== (storage.docs.get(id) ?? null);
      if (s.isDirty() !== oracle) { disagreements++; if (!firstBad) firstBad = `${step}:${what}:dirty`; }
      if (doc === null) { if (s.getDerived() !== null) { staleDerived++; if (!firstBad) firstBad = `${step}:${what}:derived-outlived`; } }
      else if (JSON.stringify(s.getDerived()) !== JSON.stringify(client.computeDerived(doc, TODAY))) {
        staleDerived++; if (!firstBad) firstBad = `${step}:${what}:derived`;
      }
    };
    let n = 0;
    check(0, 'start');
    for (let step = 1; step <= 200; step++) {
      const roll = rand();
      if (s.getState().doc === null) { await s.openTrip(id); check(step, 'openTrip(reopen)'); continue; }
      const photoIds = s.getState().doc.photos.map((x) => x.id);
      if (roll < 0.12) { s.dispatch({ type: 'addParticipant', participant: { displayName: `W${++n}`, kind: 'contact' } }); check(step, 'addParticipant'); }
      else if (roll < 0.18) {
        const ps = s.getState().doc.participants;
        if (ps.length) { s.dispatch({ type: 'updateParticipant', participantId: ps[Math.floor(rand() * ps.length)].id, patch: { note: `n${++n}` } }); check(step, 'updateParticipant'); }
      } else if (roll < 0.23) {
        const ps = s.getState().doc.participants;
        if (ps.length) { s.dispatch({ type: 'removeParticipant', participantId: ps[Math.floor(rand() * ps.length)].id }); check(step, 'removeParticipant'); }
      } else if (roll < 0.3 && photoIds.length) {
        s.dispatch({ type: 'updatePhoto', photoId: photoIds[Math.floor(rand() * photoIds.length)], patch: { caption: `c${++n}` } }); check(step, 'updatePhoto');
      } else if (roll < 0.36) {
        s.dispatch({ type: 'upsertBooking', booking: { id: `wb-${++n}`, tripId: id, kind: 'other', operator: 'Op', reference: `R${n}`, startsAt: { date: '2026-08-09', time: null }, price: null, party: null, status: 'active', issuedAt: '2026-08-01', ticket: null, provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-08-01', acceptedAt: '2026-08-01', actorUserId: core.LOCAL_OWNER } } }); check(step, 'upsertBooking');
      } else if (roll < 0.5) {
        s.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId: dayIds[Math.floor(rand() * dayIds.length)], time: '09:00', order: 0 }, stop: { name: `S${++n}`, category: 'sight' } }); check(step, 'addStop');
      } else if (roll < 0.62) { s.dispatch({ type: 'setDayMeta', dayId: dayIds[Math.floor(rand() * dayIds.length)], patch: { title: `T${++n}` } }); check(step, 'setDayMeta'); }
      else if (roll < 0.72) { s.undo(); check(step, 'undo'); }
      else if (roll < 0.8) { s.redo(); check(step, 'redo'); }
      else if (roll < 0.88) { await s.flush(); check(step, 'flush'); }
      else if (roll < 0.94) { sched.runAll?.(); check(step, 'debounce fired'); }
      else { await s.closeTrip(); check(step, 'closeTrip'); await s.openTrip(id); check(step, 'openTrip'); }
    }
    eq(`J1  seed ${seed}: zero isDirty/bytes disagreements over 200 mixed steps`, disagreements, 0);
    eq(`J1a seed ${seed}: zero stale derived caches`, staleDerived, 0);
    if (firstBad) note(`J1b seed ${seed}: first divergence`, firstBad);
    // NO SILENT LOSS: close the trip and assert the bytes hold everything.
    await s.closeTrip();
    const finalBytes = storage.docs.get(id);
    const finalDoc = finalBytes ? core.fromJSON(finalBytes) : null;
    ok(`J2  seed ${seed}: closeTrip leaves the last edit in storage`, finalDoc !== null);
  }
}

// ---------------------------------------------------------------------------
section('K — the photo store mechanism under combined load');
// ---------------------------------------------------------------------------
{
  // K1. The generation guard: an import in flight while the trip is switched out from under it.
  const storage = client.memoryStorage();
  const p = mkPorts({ storage, ids: client.sequentialIdPort('k-') });
  const s = client.createStore({ ports: p });
  await s.createTrip({ title: 'Guard A', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ key: 'a', name: 'A' }] });
  const idA = s.getState().activeTripId;
  await s.flush();
  await s.closeTrip();
  await s.createTrip({ title: 'Guard B', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ key: 'b', name: 'B' }] });
  const idB = s.getState().activeTripId;
  await s.flush();

  let resolvePick;
  const slowPick = new Promise((r) => { resolvePick = r; });
  const originalPick = p.photo.pickImages.bind(p.photo);
  p.photo.pickImages = async () => { await slowPick; return originalPick(); };
  p.photo.next = [file('late.jpg')];
  const importing = s.importPhotos({ kind: 'trip' });
  await s.closeTrip();
  await s.openTrip(idA);
  resolvePick();
  await importing;
  const nowDoc = s.getState().doc;
  eq('K1  a photo import that lands after a trip switch does NOT write into the new trip',
    nowDoc.photos.length, 0);
  eq('K1a and the open trip is still the one the user switched to', s.getState().activeTripId, idA);
  const storedB = storage.docs.get(idB);
  const bDoc = storedB ? core.fromJSON(storedB) : null;
  eq('K1b …and trip B did not silently gain the photo either', bDoc?.photos.length ?? 0, 0);
  p.photo.pickImages = originalPick;

  // K2. `settling`: a save in flight while a participant edit and a photo import both land.
  const p2 = mkPorts({ ids: client.sequentialIdPort('k2-') });
  const s2 = client.createStore({ ports: p2 });
  await s2.createTrip({ title: 'Settling', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ key: 'v', name: 'V' }] });
  s2.dispatch({ type: 'addParticipant', participant: { displayName: 'During a save', kind: 'contact' } });
  p2.photo.next = [file('during.jpg')];
  const imp = s2.importPhotos({ kind: 'trip' });
  s2.dispatch({ type: 'addParticipant', participant: { displayName: 'Also during', kind: 'contact' } });
  await imp;
  await s2.flush();
  const d2 = s2.getState().doc;
  eq('K2  both participants and the photo survived a concurrent import + save', {
    participants: d2.participants.length, photos: d2.photos.length,
  }, { participants: 2, photos: 1 });
  const stored2 = p2.storage.docs.get(s2.getState().activeTripId);
  const back2 = core.fromJSON(stored2);
  eq('K2a and storage holds all three records', { participants: back2.participants.length, photos: back2.photos.length }, { participants: 2, photos: 1 });
  eq('K2b persistence is idle, not error, after all of it', s2.getState().persistence.status, 'idle');

  // K3. The subscriber-exception brand: a throwing subscriber may not be recorded as the
  // subject's own failure (A-71).
  const p3 = mkPorts({ ids: client.sequentialIdPort('k3-') });
  const s3 = client.createStore({ ports: p3 });
  await s3.createTrip({ title: 'Subscriber', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ key: 'v', name: 'V' }] });
  let calls = 0;
  const un = s3.subscribe(() => { calls++; throw new Error('subscriber exploded'); });
  p3.photo.next = [file('sub.jpg')];
  const e3 = await threwAsync(() => s3.importPhotos({ kind: 'trip' }));
  // A-71's RULED behaviour is brand-and-rethrow: the store must not record the view's
  // exception as the photo's own failure, and it does not swallow it either. So the rejection
  // is expected; what must hold is that nothing is MISREPORTED and nothing is half-written.
  note('K3  a throwing subscriber propagates out of importPhotos (A-71’s ruled brand-and-rethrow)', e3?.message);
  const st3 = s3.getState();
  ok('K3a nothing is reported as storage_failed', !st3.doc.photos.some((x) => x.status === 'storage_failed'), st3.doc.photos.map((x) => x.status));
  eq('K3b persistence is NOT "error" — the subject did not fail', st3.persistence.status === 'error', false);
  ok('K3c no orphaned byte record', JSON.stringify(client.orphanPhotoBytes(st3)) === '[]', client.orphanPhotoBytes(st3));
  note('K3d subscriber calls before it threw', calls);
  un();
  await s3.flush();
  const e3b = await threwAsync(() => s3.openTrip(s3.getState().activeTripId));
  ok('K3e the trip reopens after a subscriber threw all the way through', e3b === null, e3b?.message);
  ok('K3f and the store is usable again — a second import lands', await (async () => {
    p3.photo.next = [file('sub2.jpg')];
    await s3.importPhotos({ kind: 'trip' });
    return s3.getState().doc.photos.length >= 1;
  })());

  // K3g — the NEW attack this phase-level pass adds: the subscriber throws MID-BATCH, at each
  // `emit` in turn, so the exception lands between the byte write and the document install
  // rather than before either. A half-written batch reported as saved would be silent loss.
  for (const boomAt of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const pb = mkPorts({ ids: client.sequentialIdPort(`kb${boomAt}-`) });
    const sb = client.createStore({ ports: pb });
    await sb.createTrip({ title: 'Batch', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ key: 'v', name: 'V' }] });
    const idb = sb.getState().activeTripId;
    await sb.flush();
    let n = 0;
    const unb = sb.subscribe(() => { if (++n === boomAt) throw new Error(`boom@${boomAt}`); });
    pb.photo.next = [file('b1.jpg'), file('b2.jpg'), file('b3.jpg'), file('b4.jpg')];
    await threwAsync(() => sb.importPhotos({ kind: 'trip' }));
    unb();
    const stb = sb.getState();
    const oracle = core.toJSON(stb.doc) !== (pb.storage.docs.get(idb) ?? null);
    ok(`K3g boom@${boomAt}: isDirty() still agrees with the stored bytes`, sb.isDirty() === oracle, { isDirty: sb.isDirty(), oracle });
    ok(`K3g' boom@${boomAt}: no orphaned byte record`, JSON.stringify(client.orphanPhotoBytes(stb)) === '[]', client.orphanPhotoBytes(stb));
    ok(`K3g" boom@${boomAt}: nothing is named storage_failed`, !stb.doc.photos.some((x) => x.status === 'storage_failed'));
    await sb.flush();
    const st2 = sb.getState();
    const stored2 = threw(() => core.fromJSON(pb.storage.docs.get(idb)));
    ok(`K3h boom@${boomAt}: a later flush reconciles the document and storage`,
      stored2 === null && core.fromJSON(pb.storage.docs.get(idb)).photos.length === st2.doc.photos.length,
      { doc: st2.doc.photos.length, stored: stored2 ? 'UNPARSEABLE' : core.fromJSON(pb.storage.docs.get(idb)).photos.length });
  }

  // K4. Bytes evicted under a live trip: availability 'missing', phase stays 'ready'.
  const p4 = mkPorts({ ids: client.sequentialIdPort('k4-') });
  const s4 = client.createStore({ ports: p4 });
  await s4.createTrip({ title: 'Evict', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ key: 'v', name: 'V' }] });
  p4.photo.next = [file('e1.jpg'), file('e2.jpg')];
  await s4.importPhotos({ kind: 'trip' });
  p4.photo.thumbs.clear(); p4.photo.displays.clear();
  const e4 = await threwAsync(async () => { await s4.refreshPhotoAvailability?.(); });
  ok('K4  nothing throws when the byte stores are emptied under a live trip', e4 === null, e4?.message);
  const listing = client.photosFor(s4.getState(), { kind: 'trip' });
  note('K4a the listing after eviction', JSON.stringify(listing).slice(0, 300));
  ok('K4b nothing renders as "empty"', !/"phase"\s*:\s*"empty"/.test(JSON.stringify(listing)));
}

// ---------------------------------------------------------------------------
section('L — the ROADMAP attack list, structural cases, on the combined document');
// ---------------------------------------------------------------------------
{
  const c = () => ({ ids: core.sequentialIds(`l${Math.floor(Math.random() * 1e6)}`), now: TODAY, actorUserId: core.LOCAL_OWNER });
  // A trip with cities and ZERO days (2a's own past-trip output).
  const zero = { ...core.createTrip({ title: 'Zero days', startDate: '2019-05-01', endDate: '2019-05-02', cities: [{ key: 'z', name: 'Zagreb', countryCode: 'HR' }] }, c()), days: [] };
  for (const [n, fn] of [['detectConflicts', () => core.detectConflicts(zero, { today: TODAY })], ['validateTrip', () => core.validateTrip(zero)], ['tripSummary', () => core.tripSummary(zero, core.COUNTRY_INDEX)]]) {
    const e = threw(fn);
    ok(`L1  ${n} survives a trip with cities and zero days`, e === null, e?.message?.slice(0, 160));
  }
  const zRow = core.tripSummary(zero, core.COUNTRY_INDEX);
  eq('L1a the zero-day row states the stated country from the CITY record', zRow.countryCodes, ['HR']);
  eq('L1b …and dayCount is 0, not invented', zRow.dayCount, 0);
  // The stated-country gate: only 'hr' and '  HR  ' are admitted beside 'HR'.
  for (const [code, want] of [['hr', ['HR']], ['  HR  ', ['HR']], ['HRV', []], ['Croatia', []], ['ZZ', []], ['RE', []]]) {
    const t = { ...core.createTrip({ title: 'Gate', startDate: '2019-05-01', endDate: '2019-05-02', cities: [{ key: 'g', name: 'G', countryCode: code }] }, c()), days: [] };
    eq(`L2  stated countryCode ${JSON.stringify(code)}`, core.tripSummary(t, core.COUNTRY_INDEX).countryCodes, want);
  }
  // A Vienna city stating 'HU' — the coordinate wins.
  const wrong = core.createTrip({ title: 'Wrong', startDate: '2026-08-07', endDate: '2026-08-08', cities: [{ key: 'v', name: 'Vienna', countryCode: 'HU', centre: { lat: 48.2082, lng: 16.3738 } }] }, c());
  eq('L3  a Vienna city stating HU: the coordinate wins', core.tripSummary(wrong, core.COUNTRY_INDEX).countryCodes, ['AT']);
  // Blank / emoji city names.
  const blank = core.createTrip({ title: 'Blank', startDate: '2026-08-07', endDate: '2026-08-08', cities: [{ key: 'b1', name: '  ' }, { key: 'b2', name: '🌍' }] }, c());
  const bRow = core.tripSummary(blank, core.COUNTRY_INDEX);
  note('L4  a blank-named and an emoji-named city', { cities: bRow.cities.map((x) => x.name), cityCount: bRow.cityCount });
  const bStats = core.travelStats([bRow], '2026-12-31');
  note('L4a what travelStats says about them', { unnamedCities: bStats.unnamedCities, cities: bStats.cities.map((x) => x.name) });
  // A trip with no coordinate-bearing record at all.
  const bare = { ...core.createTrip({ title: 'Bare', startDate: '2026-08-07', endDate: '2026-08-08' }, c()), days: [] };
  const bareStats = core.travelStats([core.tripSummary(bare, core.COUNTRY_INDEX)], '2026-12-31');
  eq('L5  a trip with no coordinate-bearing record measures zero countries', bareStats.countries.length, 0);
  note('L5a …and says so through `located`/`unattributed`, not as "0 countries"', { located: bareStats.located, unattributed: bareStats.unattributed });
  // A row with 0001-01-01 → 9999-12-31 must not allocate a day per day.
  const wide = { ...core.tripSummary(bare, core.COUNTRY_INDEX), id: 'wide', startDate: '0001-01-01', endDate: '9999-12-31' };
  const t0 = Date.now();
  const wideStats = threw(() => core.travelStats([wide], '2026-12-31'));
  const ms = Date.now() - t0;
  ok('L6  a 0001→9999 row does not allocate a day per day', ms < 2000, `${ms} ms`);
  note('L6a what it reports', wideStats ? `threw: ${wideStats.message.slice(0, 120)}` : JSON.stringify(core.travelStats([wide], '2026-12-31').daysTravelled));
  // A photo attached to a stop that is then deleted, and to a day that is re-minted.
  {
    const p5 = mkPorts({ ids: client.sequentialIdPort('l7-') });
    const s5 = client.createStore({ ports: p5 });
    await s5.createTrip({ title: 'Dangling', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ key: 'v', name: 'V' }] });
    const dayId = s5.getState().doc.days[0].id;
    s5.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId, time: '09:00', order: 0 }, stop: { name: 'Doomed', category: 'sight' } });
    const stopId = s5.getState().doc.days[0].stops[0].id;
    p5.photo.next = [file('att.jpg')];
    await s5.importPhotos({ kind: 'stop', stopId });
    eq('L7  the photo is attached to the stop', s5.getState().doc.photos[0].attach.kind, 'stop');
    s5.dispatch({ type: 'removeStop', stopId });
    const after = s5.getState().doc;
    ok('L7a deleting the stop does not delete the photo', after.photos.length === 1, after.photos.length);
    note('L7b where the photo went', JSON.stringify(after.photos[0].attach));
    const e = threw(() => core.fromJSON(core.toJSON(after)));
    ok('L7c the document still round-trips after the stop is deleted', e === null, e?.message?.slice(0, 160));
    // Re-mint the day skeleton under a day-attached photo.
    p5.photo.next = [file('day.jpg')];
    await s5.importPhotos({ kind: 'day', dayId });
    s5.dispatch({ type: 'setTripMeta', patch: { startDate: '2026-08-08' } });
    const after2 = s5.getState().doc;
    ok('L7d re-minting the day skeleton leaves no photo pointing at a day that is gone',
      after2.photos.every((ph) => ph.attach.kind !== 'day' || after2.days.some((d) => d.id === ph.attach.dayId)),
      after2.photos.map((ph) => JSON.stringify(ph.attach)));
    const e2 = threw(() => core.fromJSON(core.toJSON(after2)));
    ok('L7e and the document still round-trips', e2 === null, e2?.message?.slice(0, 160));
  }
}

// ---------------------------------------------------------------------------
section('M — the last build door with no runtime shape guard: `upsertBooking`');
// ---------------------------------------------------------------------------
{
  // R52-2 and R52-3 hardened both participant doors, A-45 hardened `datePrecision`, and A-74
  // Part 4 states the general rule. `upsertBooking` takes a WHOLE `Booking` off an untyped
  // action and checks nothing. This section measures what a type-illegal one costs, end to end,
  // because a door finding is only worth filing with its blast radius attached.
  const p = mkPorts({ ids: client.sequentialIdPort('m-') });
  const s = client.createStore({ ports: p });
  await s.createTrip({ title: 'Door', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ key: 'v', name: 'V' }] });
  const id = s.getState().activeTripId;
  const dayId = s.getState().doc.days[0].id;
  s.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId, time: '09:00', order: 0 }, stop: { name: 'Work the user already did', category: 'sight' } });
  await s.flush();
  const goodBytes = p.storage.docs.get(id);

  // The shape a caller that read the old `Booking` (or an `any`-shaped form) would produce:
  // `date`/`time` at the top level instead of `startsAt`.
  const BAD = {
    id: 'bad-1', kind: 'flight', operator: 'Op', reference: 'REF',
    date: '2026-08-08', time: '10:00', route: 'A → B', issuedAt: '2026-08-01',
    cost: null, ticket: null, links: [],
    provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-08-01', acceptedAt: '2026-08-01', actorUserId: core.LOCAL_OWNER },
  };
  const dispatchErr = threw(() => s.dispatch({ type: 'upsertBooking', booking: BAD }));
  ok('M1  the door REFUSES a Booking with no `startsAt` (as both participant doors now do)',
    dispatchErr !== null,
    'it was accepted: the document now carries a record `toJSON` cannot serialise');
  eq('M1a the document took it', s.getState().doc.bookings.length, dispatchErr === null ? 1 : 0);
  const serErr = threw(() => core.toJSON(s.getState().doc));
  note('M2  toJSON on the resulting document', serErr ? `THROWS: ${serErr.message}` : 'ok');
  const flushErr = await threwAsync(() => s.flush());
  note('M2a flush()', flushErr ? `THROWS: ${flushErr.message}` : `does not throw; persistence = ${s.getState().persistence.status}`);
  // RE-CUT AT ROUND 55 (I-15 / §2.1 A-76). This row encoded the PRE-FIX world: `M1` used to
  // fail, the unserialisable booking reached the document, and the most this probe could ask for
  // was that `flush()` reported `'error'` rather than throwing. `upsertBooking` now refuses the
  // record at the door (A-76 Part 5's row covers the missing-`startsAt` case explicitly), so the
  // document is clean and `'idle'` is the truthful answer. The old assertion is kept as the
  // branch that fires if the door ever stops refusing — the finding, not the fix, is what this
  // probe is for.
  ok('M2b flush degrades rather than collapsing — and after A-76 there is nothing to degrade',
    dispatchErr !== null
      ? flushErr === null && s.getState().persistence.status === 'idle'
      : flushErr === null && s.getState().persistence.status === 'error',
    { doorRefused: dispatchErr !== null, status: s.getState().persistence.status });
  eq('M3  the user’s earlier work is still in storage, byte-identical', p.storage.docs.get(id), goodBytes);
  const derr = threw(() => client.computeDerived(s.getState().doc, TODAY));
  ok('M3a computeDerived survives — no view goes down (unlike R52-2’s class)', derr === null, derr?.message);
  const conflicts = core.detectConflicts(s.getState().doc, { today: TODAY });
  const ruleErr = conflicts.filter((c) => c.ruleId === 'rule_error');
  note('M3b if a rule crashes on the record, §2.7 A-12 names it rather than going silent',
    ruleErr.length ? ruleErr[0].summary : '(no rule reached this record with ONE booking; with two, `superseded_booking` crashes and is named — see A2a of an earlier run)');
  const twoBad = { ...s.getState().doc, bookings: [BAD, { ...BAD, id: 'bad-2', issuedAt: '2026-08-02' }] };
  const ruleErr2 = core.detectConflicts(twoBad, { today: TODAY }).filter((c) => c.ruleId === 'rule_error');
  eq('M3c with two such bookings a rule DOES crash, and A-12 names it in a note', ruleErr2.length, 1);
  note('M3d what it says', ruleErr2[0]?.summary);
  s.undo();
  await s.flush();
  eq('M4  undo recovers the store completely', s.getState().persistence.status, 'idle');
  eq('M4a and the bad record is gone', s.getState().doc.bookings.length, 0);
  // The file boundary refuses it, so the only way in is an in-process caller.
  const docObj = JSON.parse(core.toJSON(s.getState().doc));
  docObj.bookings = [{ id: 'b1', tripId: docObj.id, kind: 'flight', operator: 'Op', reference: 'R', price: null, party: null, status: 'active', ticket: null, provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-08-01', acceptedAt: '2026-08-01', actorUserId: 'local:self' } }];
  const parseErr = threw(() => core.fromJSON(JSON.stringify(docObj)));
  ok('M5  `fromJSON` refuses the same shape at the file boundary, naming the path',
    parseErr !== null && /startsAt/.test(parseErr.message), parseErr?.message?.slice(0, 160));
  // ---- M6: the census. Which build doors let a value through that the PARSER refuses?
  // The failure mode this measures is QA P2-7's, in its exact words: *a trip that writes itself
  // into a state it cannot be opened from*. R52-3's own test asserts it must not happen at the
  // participant door. This runs the same assertion at every other door.
  const c2 = () => ({ ids: core.sequentialIds(`d${Math.floor(Math.random() * 1e9)}`), now: TODAY, actorUserId: core.LOCAL_OWNER });
  const mk = () => core.createTrip({ title: 'D', startDate: '2026-08-07', endDate: '2026-08-08', cities: [{ key: 'v', name: 'V' }] }, c2());
  const bookingOf = (over) => ({ id: 'b', tripId: 't', kind: 'flight', operator: 'o', reference: 'r', startsAt: { date: '2026-08-07', time: null }, price: null, party: null, status: 'active', ticket: null, provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-08-01', acceptedAt: '2026-08-01', actorUserId: 'local:self' }, ...over });
  const sched = (t) => ({ kind: 'scheduled', dayId: t.days[0].id, time: null, order: 0 });
  const doors = [
    ['addStop · category', () => { const t = mk(); return core.addStop(t, sched(t), { name: 'x', category: 'transport' }, c2()); }],
    ['addStop · travelRole', () => { const t = mk(); return core.addStop(t, sched(t), { name: 'x', category: 'sight', travelRole: 'teleport' }, c2()); }],
    ['addStop · place.kind', () => { const t = mk(); return core.addStop(t, sched(t), { name: 'x', category: 'sight', place: { kind: 'wat' } }, c2()); }],
    ['addStop · name non-string', () => { const t = mk(); return core.addStop(t, sched(t), { name: 7, category: 'sight' }, c2()); }],
    ['updateStop · category', () => { const t0 = mk(); const t = core.addStop(t0, sched(t0), { name: 'x', category: 'sight' }, c2()); return core.updateStop(t, t.days[0].stops[0].id, { category: 'transport' }); }],
    ['setDayMeta · legacyFlag', () => { const t = mk(); return core.setDayMeta(t, t.days[0].id, { legacyFlag: 'maybe' }); }],
    ['upsertBooking · kind', () => core.upsertBooking(mk(), bookingOf({ kind: 'spaceship' }))],
    ['upsertBooking · status', () => core.upsertBooking(mk(), bookingOf({ status: 'zombie' }))],
    ['upsertBooking · no startsAt', () => core.upsertBooking(mk(), BAD)],
    ['addPhoto · attach.kind  (guarded)', () => core.addPhoto(mk(), { attach: { kind: 'galaxy' }, fileName: 'a.jpg', byteSize: 10, mimeType: 'image/jpeg' }, c2())],
    ['addParticipant · kind   (R52-3)', () => core.addParticipant(mk(), { displayName: 'x', kind: 'owner' }, c2())],
    ['setTripMeta · datePrecision (A-45)', () => core.setTripMeta(mk(), { datePrecision: 'fortnight' }, c2())],
  ];
  const unopenable = [];
  for (const [name, fn] of doors) {
    let doc = null;
    const doorErr = threw(() => { doc = fn(); });
    if (doorErr) { note(`M6  ${name}`, 'REFUSED at the door'); continue; }
    let bytes = null;
    const serErr = threw(() => { bytes = core.toJSON(doc); });
    if (serErr) { note(`M6  ${name}`, `accepted; toJSON THROWS (${serErr.message.slice(0, 50)})`); unopenable.push(`${name} (unserialisable)`); continue; }
    const parseErr = threw(() => core.fromJSON(bytes));
    if (parseErr) { note(`M6  ${name}`, `accepted; the SAVED document is UNOPENABLE at ${parseErr.path}`); unopenable.push(`${name} → ${parseErr.path}`); }
    else note(`M6  ${name}`, 'accepted; the saved document still reopens');
  }
  eq('M7  ZERO build doors write a document that cannot be opened again (QA P2-7 / R52-3’s rule)', unopenable, []);

  // M8 — the same, driven all the way through the real store, so the cost is measured and not
  // argued about: what does the user see, and what does storage hold?
  const p8 = mkPorts({ ids: client.sequentialIdPort('m8-') });
  const s8 = client.createStore({ ports: p8 });
  await s8.createTrip({ title: 'Unopenable', startDate: '2026-08-07', endDate: '2026-08-09', cities: [{ key: 'v', name: 'V' }] });
  const id8 = s8.getState().activeTripId;
  const day8 = s8.getState().doc.days[0].id;
  s8.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId: day8, time: '09:00', order: 0 }, stop: { name: 'Two weeks of planning', category: 'sight' } });
  await s8.flush();
  // RE-CUT AT ROUND 55 (I-15 / §2.1 A-76). The bad `addStop` this section needs in order to
  // MEASURE the loss is now refused at the door, so the bare dispatch threw and aborted the whole
  // probe. It is wrapped, and the section keeps both halves: the refusal is asserted where it
  // happens, and every measurement below it still runs — so this stays the standing regression
  // for A-76's harm rather than becoming a row that only ever passed once.
  const badDispatch = threw(() => s8.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId: day8, time: '10:00', order: 1 }, stop: { name: 'One bad category', category: 'transport' } }));
  ok('M8- the door refuses the bad edit before the store ever sees it (A-76, the whole point)',
    badDispatch !== null, 'the dispatch was accepted; everything below measures the loss it caused');
  await s8.flush();
  note('M8  what the user is told after the write', s8.getState().persistence.status);
  const stored8 = p8.storage.docs.get(id8);
  const reparse = threw(() => core.fromJSON(stored8));
  ok('M8a the user is NOT told "saved" over a trip that can no longer be opened',
    !(s8.getState().persistence.status === 'idle' && reparse !== null),
    `persistence.status is '${s8.getState().persistence.status}' while the stored bytes no longer parse`);
  note('M8b can the stored document be parsed?', reparse ? `NO — ${reparse.path}` : 'yes');
  await s8.closeTrip();
  const openErr = await threwAsync(() => s8.openTrip(id8));
  note('M8c openTrip after a reload', openErr ? `refuses: ${openErr.message.slice(0, 90)}` : 'opens');
  ok('M8d the whole trip — including the earlier work — is still reachable',
    openErr === null, openErr ? 'the trip cannot be opened; the only recovery is the A-46 rescue export' : undefined);
  // RE-CUT AT ROUND 55: `openTrip` now SUCCEEDS, so `id8` is the active trip and A-46's rescue
  // path correctly refuses it (`use exportActive()`). Which of the two exports applies is decided
  // by whether the document opened — the claim being kept is *"the bytes are always retrievable"*.
  const rescue = openErr === null ? await s8.exportActive() : await s8.exportStoredDoc(id8);
  ok('M8e the bytes are retrievable either way — A-46\'s rescue path, or the ordinary export',
    typeof rescue === 'string' && rescue.length > 0, rescue?.length);
  await s8.refreshLibrary();
  const fails8 = s8.getState().openFailures ?? [];
  ok('M8f the library names the row rather than hiding it', fails8.length > 0 || s8.getState().library.length > 0, { openFailures: fails8.length, library: s8.getState().library.length });
  note('M9  A-76 closes this door and NOT the class — round 55 reproduces the same loss end to end',
    'setDayMeta’s `stops: []` elision, acceptCandidate’s `at`, ensureDays’ `ctx.now` and six ' +
    'trip-level scalars: see R55-1/R55-2/R55-3 and `qa/r55-a76.mjs` §F/§G');
}

console.log(`\nCOMPLETE  fails=${fails} gaps=${gaps} notes=${notes}`);
if (failLines.length) console.log('FAILING:\n  ' + failLines.join('\n  '));
process.exitCode = fails ? 1 : 0;
void writeFileSync; void mkdtempSync; void rmSync; void tmpdir; void join;
