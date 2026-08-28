const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);
const ctx = (p = 'p') => ({ ids: core.sequentialIds(p), now: '2026-08-24', actorUserId: 'u1' });
const { trip } = loadEurope2026();

const sugg = trip.days.flatMap((d) => d.stops).find((s) => core.displayStatus(s) === 'suggested');
const suggDay = trip.days.find((d) => d.stops.some((s) => s.id === sugg.id));
console.log('suggested stop:', suggDay.id, sugg.name, JSON.stringify(sugg.provenance));

const statusOf = (t, id) => {
  const s = t.days.flatMap((d) => d.stops).concat(t.pool).find((x) => x.id === id);
  return s ? core.displayStatus(s) + ' ' + JSON.stringify(s.provenance) : 'GONE';
};

console.log('');
console.log('== can a build function turn a suggestion into "own"? ==');
const tries = {
  'updateStop(name)': (t) => core.updateStop(t, sugg.id, { name: 'My own idea' }, ctx()),
  'updateStop(note+cost)': (t) => core.updateStop(t, sugg.id, { note: 'mine', cost: null }, ctx()),
  'updateStop(provenance patch)': (t) => {
    try { return core.updateStop(t, sugg.id, { provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-01-01', acceptedAt: '2026-01-02', actorUserId: 'u1' } }, ctx()); }
    catch (e) { return null; }
  },
  'moveStop(to another day)': (t) => core.moveStop(t, sugg.id, { kind: 'scheduled', dayId: '2026-08-13', time: '09:00', order: 0 }, ctx()),
  'returnToPool': (t) => core.returnToPool(t, sugg.id, ctx()),
  'returnToPool+scheduleFromPool': (t) => core.scheduleFromPool(core.returnToPool(t, sugg.id, ctx()), sugg.id, { dayId: suggDay.id }, ctx()),
  'reorderStop': (t) => core.reorderStop(t, sugg.id, 1, ctx()),
  'linkBooking': (t) => core.linkBooking(t, sugg.id, t.bookings[0].id, ctx()),
  'JSON round trip': (t) => core.fromJSON(core.toJSON(t)),
  'setDayMeta on its day': (t) => core.setDayMeta(t, suggDay.id, { title: 'Mine' }, ctx()),
  'rejectCandidate': (t) => core.rejectCandidate(t, { kind: 'stop', id: sugg.id }, 'u1', '2026-08-24'),
  'acceptCandidate (legit)': (t) => core.acceptCandidate(t, { kind: 'stop', id: sugg.id }, 'u1', '2026-08-24'),
};
for (const [name, fn] of Object.entries(tries)) {
  let r;
  try { r = fn(trip); } catch (e) { console.log('   ' + name.padEnd(30) + ' threw ' + e.message.slice(0, 60)); continue; }
  if (!r) { console.log('   ' + name.padEnd(30) + ' rejected'); continue; }
  const st = statusOf(r, sugg.id);
  const bad = st.startsWith('own') && name !== 'acceptCandidate (legit)';
  console.log((bad ? '   *** ' : '   ') + name.padEnd(30) + ' -> ' + st);
}

console.log('');
console.log('== accepted suggestion: does acceptance carry a timestamp and an actor? ==');
const accepted = core.acceptCandidate(trip, { kind: 'stop', id: sugg.id }, 'u1', '2026-08-24');
const as = accepted.days.flatMap((d) => d.stops).find((s) => s.id === sugg.id);
console.log('   ', JSON.stringify(as.provenance));
ok('acceptedAt set', !!as.provenance.acceptedAt);
ok('actorUserId set', !!as.provenance.actorUserId);
ok('origin/source preserved (credit survives)', as.provenance.source === 'system');
ok('validateTrip clean about it', !core.validateTrip(accepted).some((i) => i.code === 'accepted_without_timestamp' && i.params.stopId === sugg.id));

console.log('');
console.log('== undo an accept: does it go back to "suggested"? ==');
{
  const st = mem.memoryStorage();
  const s = createStore({ ports: { storage: st, clock: mem.fixedClockPort('2026-08-24'), ids: mem.sequentialIdPort('c'), scheduler: mem.immediateScheduler() }, autosave: false });
  await s.adoptTrip(trip);
  s.dispatch({ type: 'acceptCandidate', ref: { kind: 'stop', id: sugg.id } });
  console.log('   after accept:', statusOf(s.getState().doc, sugg.id));
  s.undo();
  console.log('   after undo:  ', statusOf(s.getState().doc, sugg.id));
  ok('undo restores the suggestion badge', core.displayStatus(s.getState().doc.days.flatMap((d) => d.stops).find((x) => x.id === sugg.id)) === 'suggested');
  s.redo();
  ok('redo re-accepts', core.displayStatus(s.getState().doc.days.flatMap((d) => d.stops).find((x) => x.id === sugg.id)) === 'own');
}

console.log('');
console.log('== a friend\'s exported trip, imported as JSON ==');
{
  const friend = core.setTripMeta(trip, { title: "Marta's Europe" }, ctx());
  const text = core.toJSON({ ...friend, ownerId: 'user:marta' });
  const st = mem.memoryStorage();
  const s = createStore({ ports: { storage: st, clock: mem.fixedClockPort('2026-08-24'), ids: mem.sequentialIdPort('c'), scheduler: mem.immediateScheduler() } });
  await s.refreshLibrary();
  // REPAIRED, Phase 2 I-0. This probe filed the finding that importing a friend's document
  // rendered their stops as Jacob's own plan. The fix (BRIEF, 2026-08-25; §2.14) was to make
  // `importDoc` **backup/restore of the user's own exports only** — it now throws
  // `ForeignDocumentError` on a document owned by someone else, which crashed this probe at
  // the `await` below and stopped everything after it running.
  // The claim is unchanged and stronger: a friend's document cannot get in at all.
  let refused = null;
  try { await s.importDoc(text); } catch (e) { refused = e; }
  console.log('   importDoc(a document owned by user:marta):', refused ? refused.constructor.name : 'ACCEPTED');
  ok("a friend's trip cannot be imported at all — it is not a sharing channel (§2.14)",
    refused !== null && refused.constructor.name === 'ForeignDocumentError',
    refused ? `threw ${refused.constructor.name}` : 'it was accepted, and its stops are now in the library');
  ok('...and nothing was installed as a side effect of the refusal',
    s.getState().doc === null && s.getState().library.length === 0,
    `doc=${s.getState().doc ? s.getState().doc.id : 'null'} library=${s.getState().library.length}`);
  console.log('   canEdit(local self on a trip with ownerId user:marta)?',
    (() => { try { return core.canEdit({ userId: core.LOCAL_OWNER }, { ownerId: 'user:marta' }); } catch (e) { return 'threw: ' + e.message; } })());
}

console.log('');
console.log('== email-derived booking: silent write? ==');
{
  const b = {
    id: 'bk-email', tripId: trip.id, kind: 'flight', operator: 'Smartwings', reference: 'YZGDTS',
    startsAt: { date: '2026-08-15', time: '09:00' }, price: null, party: null, status: 'active', ticket: null,
    provenance: { source: 'email', state: 'candidate', confidence: 'confirmed', addedAt: '2026-08-24', acceptedAt: null, actorUserId: null },
  };
  const t = core.upsertBooking(trip, b, ctx());
  const got = t.bookings.find((x) => x.id === 'bk-email');
  console.log('   upsertBooking accepted an email candidate:', core.displayStatus(got));
  ok('it does not display as own', core.displayStatus(got) !== 'own');
  const t2 = core.upsertBooking(trip, { ...b, provenance: { ...b.provenance, state: 'accepted', acceptedAt: null } }, ctx());
  const g2 = t2.bookings.find((x) => x.id === 'bk-email');
  console.log('   state:accepted with acceptedAt:null ->', core.displayStatus(g2));
  const iss = core.validateTrip(t2).filter((i) => i.code === 'accepted_without_timestamp');
  ok('validateTrip catches accepted-without-timestamp on a booking', iss.length > 0, 'issues=' + JSON.stringify(iss.map((i) => i.ref)));
}
