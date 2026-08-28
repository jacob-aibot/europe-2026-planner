/**
 * Round 9 — the A-5 / A-5a retirement ledger, attacked past what
 * `packages/client/test/retirement-ledger.test.ts` already covers. Run from `cairn/`:
 *
 *     node qa/r9-ledger.mjs
 *
 * Three sections, matching the three ledger items of the gate:
 *   §1  R8-1 with the veto present — multi undo/redo cycles, redo of a released dismissal,
 *       undo past the point the conflictId was first created (stale-mark leak).
 *   §2  KD-36 case 1 — a second dismissal surviving MANY further edits, edits on the SAME
 *       subject, an undo after the second dismissal, and a THIRD dismissal.
 *   §3  KD-36 case 2 — the reseed path: repeated close/reopen, an A -> B -> A trip switch,
 *       and `mergeWithStored`'s reseed (not just `openTrip`).
 *
 * A "FAIL" means the probe found something. Every assertion here is a claim the two rulings
 * make, not a claim about an implementation detail.
 */
const client = await import('../packages/client/src/index.ts');
const core = await import('../packages/core/src/index.ts');

let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? '\n         ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');

const TODAY = '2026-08-01';
const TRIP_INIT = {
  title: 'Ledger trip',
  startDate: '2026-08-07',
  endDate: '2026-08-09',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
};

const mk = (storage = client.memoryStorage(), debounceMs = 5) => client.createStore({
  ports: { storage, clock: client.fixedClockPort(TODAY), ids: client.sequentialIdPort() },
  debounceMs,
});

const rows = (store, id) => store.getState().doc.resolutions
  .filter((r) => r.conflictId === id).map((r) => `${r.state}@${r.at} retiredAt=${r.retiredAt}`);
const rowAt = (store, id, at) => store.getState().doc.resolutions.find((r) => r.conflictId === id && r.at === at) ?? null;
const rendered = (store, id) => {
  const c = store.getDerived().conflicts.find((x) => x.id === id);
  return c ? (c.resolution ? c.resolution.state : 'unresolved') : 'gone';
};

/** dismiss -> edit away -> render retires. The exact R8-1 setup. */
async function dismissedThenRetired(storage = client.memoryStorage()) {
  const store = mk(storage);
  await store.createTrip(TRIP_INIT);
  const dayId = store.getState().doc.days[0].id;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { legacyFlag: true } });
  const conflict = store.getDerived().conflicts.find((c) => c.ruleId === 'legacy_flag');
  store.dispatch({ type: 'resolveConflict', resolution: { conflictId: conflict.id, state: 'dismissed', by: 'local:self', at: TODAY } });
  store.dispatch({ type: 'setDayMeta', dayId, patch: { legacyFlag: false } });
  store.getDerived();
  return { store, conflictId: conflict.id, dayId };
}

/** ...then undo (conflict live again) and dismiss a SECOND time with a plain resolveConflict. */
async function secondDismissal(storage = client.memoryStorage()) {
  const r = await dismissedThenRetired(storage);
  r.store.undo();
  r.store.dispatch({ type: 'resolveConflict', resolution: { conflictId: r.conflictId, state: 'dismissed', by: 'local:self', at: '2026-08-02' } });
  return r;
}

// ---------------------------------------------------------------------------
line('§1 R8-1 with the A-5a veto present — does the veto ever cause the OPPOSITE failure?');
{
  // 1.1 — many undo/redo cycles over the retirement boundary. The retired blocker must never
  // render "Marked dismissed" at any depth, on any pass.
  const { store, conflictId, dayId } = await dismissedThenRetired();
  let bad = [];
  for (let i = 0; i < 6; i++) {
    store.undo(); store.getDerived();
    if (rendered(store, conflictId) === 'dismissed') bad.push(`undo #${i + 1}`);
    store.redo(); store.getDerived();
    if (rendered(store, conflictId) === 'dismissed') bad.push(`redo #${i + 1}`);
  }
  ok('1.1 six undo/redo cycles over the retirement never re-render "dismissed"', bad.length === 0, bad.join(', '));
}
{
  // 1.2 — undo PAST the resolveConflict that created the row at all. The ledger keeps a mark
  // for a conflictId the document no longer has any row for. Is the stale mark inert?
  const { store, conflictId } = await dismissedThenRetired();
  store.undo();                     // back to legacyFlag:true, row live -> re-asserted retired
  store.undo();                     // back past the dismissal: no row for the id at all
  const none = store.getState().doc.resolutions.filter((r) => r.conflictId === conflictId);
  ok('1.2a undo past the dismissal leaves no resolution row for the id', none.length === 0, JSON.stringify(rows(store, conflictId)));
  store.getDerived();
  ok('1.2b the conflict renders unresolved there', rendered(store, conflictId) === 'unresolved', rendered(store, conflictId));

  // 1.2c — REDO the user's own dismissal. `redo` does not release, so a stale mark held from
  // before the undo is re-asserted onto the restored live row: the redone dismissal is
  // stillborn. This is KD-36's symptom through the redo door.
  store.redo();
  store.getDerived();
  ok('1.2c redo of the user\'s own dismissal is NOT stamped retired', rowAt(store, conflictId, TODAY)?.retiredAt === null,
     `rows=${JSON.stringify(rows(store, conflictId))} renders "${rendered(store, conflictId)}"`);
  ok('1.2d ...and it renders dismissed, not unresolved', rendered(store, conflictId) === 'dismissed', rendered(store, conflictId));
}
{
  // 1.3 — the second dismissal interleaved with undo/redo. After a second dismissal (which
  // releases the mark) an undo/redo pair must not un-retire the FIRST, genuinely retired row.
  const { store, conflictId, dayId } = await secondDismissal();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'x' } });
  store.undo(); store.getDerived();
  store.redo(); store.getDerived();
  const retiredRows = store.getState().doc.resolutions.filter((r) => r.conflictId === conflictId && r.retiredAt !== null);
  ok('1.3 the first, genuinely retired row stays retired across undo/redo after a second dismissal',
     retiredRows.length === 1 && retiredRows[0].at === TODAY, JSON.stringify(rows(store, conflictId)));
}
{
  // 1.4 — a genuine retirement that happens WHILE a live row for the same id sits in the
  // document. Reachable: [retired, live] then edit the condition away -> syncResolutions
  // retires the live row too -> the doc is [retired, retired]. The mark must be acquired
  // then (the veto is on acquisition from a doc with a LIVE row; there is none now), or the
  // next undo un-retires the second answer with no user action.
  const { store, conflictId, dayId } = await secondDismissal();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { legacyFlag: false } });
  store.getDerived();               // retires the second (live) row
  const allRetired = store.getState().doc.resolutions.filter((r) => r.conflictId === conflictId).every((r) => r.retiredAt);
  ok('1.4a both rows are retired once the conflict goes away again', allRetired, JSON.stringify(rows(store, conflictId)));
  store.undo(); store.getDerived();  // pre-retirement snapshot: [retired, live]
  ok('1.4b undo does NOT bring the second dismissal back as "dismissed"', rendered(store, conflictId) !== 'dismissed',
     `renders "${rendered(store, conflictId)}" rows=${JSON.stringify(rows(store, conflictId))}`);
}

// ---------------------------------------------------------------------------
line('§2 KD-36 case 1 — a second dismissal vs. further edits, undo, and a third dismissal');
{
  // 2.1 — TEN further edits, not one.
  const { store, conflictId, dayId } = await secondDismissal();
  let firstBad = null;
  for (let i = 0; i < 10; i++) {
    store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'edit ' + i } });
    store.getDerived();
    if (rowAt(store, conflictId, '2026-08-02')?.retiredAt !== null && firstBad === null) firstBad = i;
  }
  ok('2.1 the fresh dismissal survives ten further unrelated edits', firstBad === null, `died at edit #${firstBad}`);
  ok('2.1b ...and still renders dismissed', rendered(store, conflictId) === 'dismissed', rendered(store, conflictId));
}
{
  // 2.2 — a further edit that touches the SAME day (the conflict's own subject) but not the
  // fields its id is content-addressed over. `legacy_flag`'s id is over {date, subtitle}.
  const { store, conflictId, dayId } = await secondDismissal();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'same subject' } });
  store.dispatch({ type: 'setDayMeta', dayId, patch: { notes: 'still the same day' } });
  store.getDerived();
  ok('2.2 the fresh dismissal survives edits on the conflict\'s OWN subject day',
     rowAt(store, conflictId, '2026-08-02')?.retiredAt === null, JSON.stringify(rows(store, conflictId)));
  ok('2.2b ...and renders dismissed', rendered(store, conflictId) === 'dismissed', rendered(store, conflictId));
}
{
  // 2.3 — an edit that DOES move the conflict id (subtitle is in legacy_flag's id), then back.
  const { store, conflictId, dayId } = await secondDismissal();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { subtitle: 'moves the id' } });
  store.getDerived();               // the old id is no longer live -> both rows retire
  store.dispatch({ type: 'setDayMeta', dayId, patch: { subtitle: '' } });
  store.getDerived();               // the old id is back
  ok('2.3 an id-moving edit and back does NOT resurrect either dismissal', rendered(store, conflictId) !== 'dismissed',
     `renders "${rendered(store, conflictId)}" rows=${JSON.stringify(rows(store, conflictId))}`);
}
{
  // 2.4 — undo AFTER the second dismissal. It should return to the state before that
  // dismissal: the first row retired, no live row, the conflict unresolved.
  const { store, conflictId } = await secondDismissal();
  store.undo();
  store.getDerived();
  const live = store.getState().doc.resolutions.filter((r) => r.conflictId === conflictId && r.retiredAt === null);
  ok('2.4a undo after the second dismissal leaves no live row', live.length === 0, JSON.stringify(rows(store, conflictId)));
  ok('2.4b ...and the blocker renders unresolved, not dismissed', rendered(store, conflictId) === 'unresolved', rendered(store, conflictId));
  // 2.4c — redo it. The user asked for that dismissal back.
  store.redo();
  store.getDerived();
  ok('2.4c redo restores the second dismissal live (not stamped retired)',
     rowAt(store, conflictId, '2026-08-02')?.retiredAt === null, JSON.stringify(rows(store, conflictId)));
}
{
  // 2.5 — a THIRD dismissal: retire the second, bring it back, dismiss again. Now up to 3
  // rows for one conflictId.
  const { store, conflictId, dayId } = await secondDismissal();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { legacyFlag: false } });
  store.getDerived();               // second row retires
  store.dispatch({ type: 'setDayMeta', dayId, patch: { legacyFlag: true } });
  store.getDerived();               // conflict live again, both rows retired
  ok('2.5a the conflict is live and unresolved before the third dismissal', rendered(store, conflictId) === 'unresolved', rendered(store, conflictId));
  store.dispatch({ type: 'resolveConflict', resolution: { conflictId, state: 'dismissed', by: 'local:self', at: '2026-08-03' } });
  ok('2.5b the third dismissal is not stillborn', rowAt(store, conflictId, '2026-08-03')?.retiredAt === null, JSON.stringify(rows(store, conflictId)));
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'after the third' } });
  store.getDerived();
  ok('2.5c ...and survives a further edit', rowAt(store, conflictId, '2026-08-03')?.retiredAt === null, JSON.stringify(rows(store, conflictId)));
  ok('2.5d ...and renders dismissed', rendered(store, conflictId) === 'dismissed', rendered(store, conflictId));
  ok('2.5e the document holds exactly three rows for the id, two retired',
     rows(store, conflictId).length === 3 && store.getState().doc.resolutions.filter((r) => r.conflictId === conflictId && r.retiredAt).length === 2,
     JSON.stringify(rows(store, conflictId)));
}

// ---------------------------------------------------------------------------
line('§3 KD-36 case 2 — the reseed paths: repeated round trips, a trip switch, and merge');
{
  // 3.1 — close/reopen FIVE times in a row, with an edit after each.
  const storage = client.memoryStorage();
  const { store, conflictId, dayId } = await secondDismissal(storage);
  const tripId = store.getState().doc.id;
  let firstBad = null;
  for (let i = 0; i < 5; i++) {
    await store.flush();
    await store.closeTrip();
    await store.openTrip(tripId);
    store.getDerived();
    if (rowAt(store, conflictId, '2026-08-02')?.retiredAt !== null && firstBad === null) firstBad = `reopen #${i + 1}`;
    store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'round ' + i } });
    store.getDerived();
    if (rowAt(store, conflictId, '2026-08-02')?.retiredAt !== null && firstBad === null) firstBad = `edit after reopen #${i + 1}`;
  }
  ok('3.1 the fresh dismissal survives five close/reopen round trips with edits between',
     firstBad === null, `${firstBad}: ${JSON.stringify(rows(store, conflictId))}`);
  ok('3.1b ...and renders dismissed at the end', rendered(store, conflictId) === 'dismissed', rendered(store, conflictId));
}
{
  // 3.2 — switch to a DIFFERENT trip and back. The ledger is per trip; trip A's must be
  // rebuilt from A's own document (with the veto) when A is reopened.
  const storage = client.memoryStorage();
  const { store, conflictId, dayId } = await secondDismissal(storage);
  const tripA = store.getState().doc.id;
  await store.flush();
  await store.createTrip({ ...TRIP_INIT, title: 'Trip B' });
  const tripB = store.getState().doc.id;
  store.dispatch({ type: 'setTripMeta', patch: { title: 'B edited' } });
  await store.flush();
  await store.openTrip(tripA);
  store.getDerived();
  ok('3.2a A -> B -> A: the fresh dismissal is still live after coming back',
     rowAt(store, conflictId, '2026-08-02')?.retiredAt === null, JSON.stringify(rows(store, conflictId)));
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'back on A' } });
  store.getDerived();
  ok('3.2b ...and survives the next edit on A', rowAt(store, conflictId, '2026-08-02')?.retiredAt === null, JSON.stringify(rows(store, conflictId)));
  ok('3.2c ...and renders dismissed', rendered(store, conflictId) === 'dismissed', rendered(store, conflictId));
  // and the R8-1 half must still hold on A after the switch: the FIRST row stays retired.
  store.undo(); store.getDerived();
  const firstRow = store.getState().doc.resolutions.find((r) => r.conflictId === conflictId && r.at === TODAY);
  ok('3.2d ...and the first, genuinely retired row is still retired after undo on the reopened trip',
     firstRow?.retiredAt === TODAY, JSON.stringify(rows(store, conflictId)));
}
{
  // 3.3 — the merge reseed path. A-5 names `doMerge`'s result as the seventh reseeding path;
  // A-5a says the veto governs EVERY point the ledger reads marks out of a document. Put the
  // store into 'conflict' and press merge, with the [retired, live] pair in hand.
  const storage = client.memoryStorage();
  const { store, conflictId, dayId } = await secondDismissal(storage);
  const tripId = store.getState().doc.id;
  await store.flush();
  // Move storage on underneath the store, so the next save is refused -> status 'conflict'.
  const stored = await storage.load(tripId);
  const other = core.setTripMeta(core.fromJSON(stored.doc), { title: 'the other tab' });
  await storage.saveIfVersion(tripId, stored.version, core.toJSON(other), core.tripSummary(other, core.COUNTRY_INDEX));
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'mine' } });
  await store.flush().catch(() => {});
  ok('3.3a the store is in conflict, so merge is reachable', store.getState().persistence.status === 'conflict',
     store.getState().persistence.status);
  await store.mergeWithStored();
  store.getDerived();
  ok('3.3b the fresh dismissal survives the merge reseed',
     rowAt(store, conflictId, '2026-08-02')?.retiredAt === null, JSON.stringify(rows(store, conflictId)));
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'after the merge' } });
  store.getDerived();
  ok('3.3c ...and the next edit after the merge (absorb on the reseeded ledger)',
     rowAt(store, conflictId, '2026-08-02')?.retiredAt === null, JSON.stringify(rows(store, conflictId)));
  ok('3.3d ...and renders dismissed', rendered(store, conflictId) === 'dismissed', rendered(store, conflictId));
}
{
  // 3.4 — R8-1 across a round trip: the plain single-dismissal case, reopened, then undone.
  // The reseed must acquire the mark from the stored retired row, or reopening a trip
  // re-arms the R8-1 defect.
  const storage = client.memoryStorage();
  const { store, conflictId } = await dismissedThenRetired(storage);
  const tripId = store.getState().doc.id;
  await store.flush();
  await store.closeTrip();
  await store.openTrip(tripId);
  store.getDerived();
  // history is empty after a reopen, so drive the un-retirement the other way: a fresh edit
  // that brings the conflict back must not attach the retired resolution.
  const dayId = store.getState().doc.days[0].id;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { legacyFlag: true } });
  store.getDerived();
  ok('3.4 after a reopen, the returning blocker still does not render "Marked dismissed"',
     rendered(store, conflictId) !== 'dismissed', `renders "${rendered(store, conflictId)}" rows=${JSON.stringify(rows(store, conflictId))}`);
}

// ---------------------------------------------------------------------------
line('§4 root cause of §1.2c / §2.4c — `redo` does not release, `dispatch` does');
{
  // Identical state, two ways to put the same live row back. If only the dispatch survives,
  // the cause is `dispatch`'s `releaseRetirement` and nothing else in `set`.
  const viaRedo = await secondDismissal();
  viaRedo.store.undo();             // mark for the id is (re-)acquired here: doc is [retired] only
  viaRedo.store.redo();
  const redoRow = rowAt(viaRedo.store, viaRedo.conflictId, '2026-08-02');

  const viaDispatch = await secondDismissal();
  viaDispatch.store.undo();
  viaDispatch.store.dispatch({ type: 'resolveConflict', resolution: { conflictId: viaDispatch.conflictId, state: 'dismissed', by: 'local:self', at: '2026-08-02' } });
  const dispatchRow = rowAt(viaDispatch.store, viaDispatch.conflictId, '2026-08-02');

  console.log(`  via redo:     retiredAt=${redoRow?.retiredAt}`);
  console.log(`  via dispatch: retiredAt=${dispatchRow?.retiredAt}`);
  ok('4.1 the same live row, restored by redo, is stamped exactly as the dispatched one is not',
     redoRow?.retiredAt === dispatchRow?.retiredAt,
     'isolated: `dispatch` calls releaseRetirement for resolveConflict (store.ts:659); `redo` (store.ts:672-676) does not, '
     + 'so the mark re-acquired by the intervening `undo` is re-asserted onto the redone row');
}

console.log('\n' + (fails === 0 ? 'ALL OK' : fails + ' FAIL'));
