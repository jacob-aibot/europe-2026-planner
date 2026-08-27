/**
 * Round 10 — A-5b (`redo` releases the retirement ledger) attacked past
 * `packages/client/test/retirement-ledger.test.ts`. Run from `cairn/`:
 *
 *     node qa/r10-redo.mjs
 *
 *   §1  the four-clause rule's OWN preconditions — redo with an empty future, redo of an
 *       unrelated action, undo of an `unresolveConflict` (the one shape a rowsFor rule would
 *       fire on if it were ever added to `undo`).
 *   §2  R9-1 residual: dismiss -> retire -> undo -> UNDO -> redo. Two undos, not one.
 *   §3  two conflicts interleaved: does the row-count delta attribute the release to the
 *       right conflictId, and can one redo step ever raise two ids' counts at once?
 *   §4  the history limit (50): the dismissal at the floor of `past`, redone from depth.
 *   §5  a trip round trip (A -> B -> A) and a `mergeWithStored` reseed with a live future.
 *   §6  the §2.7 A-5b invariant, asserted after every step of every sequence above.
 *
 * A "FAIL" means the probe found something.
 */
const client = await import('../packages/client/src/index.ts');

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
const rendered = (store, id) => {
  const c = store.getDerived().conflicts.find((x) => x.id === id);
  return c ? (c.resolution ? c.resolution.state : 'unresolved') : 'gone';
};
const marks = (store) => [...(store.getState().retired?.marks.keys() ?? [])];

/** §2.7 A-5b's own invariant: no held mark may have a LIVE row in the document. */
function invariant(store, where, bad) {
  const st = store.getState();
  if (!st.retired || !st.doc) return;
  for (const id of st.retired.marks.keys()) {
    if (st.doc.resolutions.some((r) => r.conflictId === id && !r.retiredAt)) bad.push(`${where}: ${id}`);
  }
}

/** dismiss -> edit away -> render retires. The R8-1/R9-1 setup. */
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

// ---------------------------------------------------------------------------
line('§1 the rule\'s preconditions — nothing to redo, unrelated redo, undo of an unresolve');
{
  // 1.1 — redo() with an empty future. `redo(state)` returns the same state, so `next.doc ===
  // state.doc` and clause 1 must decline. It must not throw and must not touch the ledger.
  const { store, conflictId } = await dismissedThenRetired();
  const before = marks(store).join(',');
  let threw = null;
  try { store.redo(); store.redo(); store.redo(); } catch (e) { threw = e.message; }
  ok('1.1a redo with an empty future does not throw', threw === null, threw ?? '');
  ok('1.1b ...and releases nothing', marks(store).join(',') === before, `${before} -> ${marks(store).join(',')}`);
  ok('1.1c ...and the retired row stays retired', rendered(store, conflictId) !== 'dismissed' && rows(store, conflictId).every((r) => !r.endsWith('retiredAt=null')),
     `renders "${rendered(store, conflictId)}" rows=${JSON.stringify(rows(store, conflictId))}`);
}
{
  // 1.2 — a redo of an UNRELATED action while a mark is held. R8-1 at redo depth: the
  // restored live row must still be stamped.
  const { store, conflictId, dayId } = await dismissedThenRetired();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'A' } });
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'B' } });
  store.undo(); store.getDerived();
  store.redo(); store.getDerived();
  ok('1.2 redo of an unrelated action releases nothing (R8-1 at redo depth)',
     marks(store).includes(conflictId) && rendered(store, conflictId) !== 'dismissed',
     `marks=${marks(store).join(',')} rows=${JSON.stringify(rows(store, conflictId))} renders "${rendered(store, conflictId)}"`);
}
{
  // 1.3 — the one shape a rowsFor rule WOULD fire on inside `undo`: undoing an
  // `unresolveConflict` restores rows (count rises) with a live row present. `undo` must
  // stay silent: the restored live row is stamped and the conflict renders unresolved.
  const { store, conflictId } = await dismissedThenRetired();
  store.dispatch({ type: 'unresolveConflict', conflictId });   // drops every row for the id
  store.getDerived();
  store.undo();                                                // restores [live] -> must stamp
  store.getDerived();
  ok('1.3a undo of an unresolveConflict does NOT release (rows restored, still stamped)',
     rows(store, conflictId).every((r) => !r.endsWith('retiredAt=null')),
     JSON.stringify(rows(store, conflictId)));
  ok('1.3b ...and it never renders "Marked dismissed"', rendered(store, conflictId) !== 'dismissed', rendered(store, conflictId));
}

// ---------------------------------------------------------------------------
line('§2 R9-1 residual — two undos, then a redo of the user\'s own dismissal');
{
  const bad = [];
  const { store, conflictId } = await dismissedThenRetired();
  invariant(store, 'setup', bad);
  store.undo(); store.getDerived(); invariant(store, 'undo1', bad);
  const afterUndo1 = JSON.stringify(rows(store, conflictId));
  store.undo(); store.getDerived(); invariant(store, 'undo2', bad);
  ok('2.0 two undos land past the dismissal — no row for the id',
     rows(store, conflictId).length === 0, JSON.stringify(rows(store, conflictId)));
  store.redo(); store.getDerived(); invariant(store, 'redo1', bad);
  const row = store.getState().doc.resolutions.find((r) => r.conflictId === conflictId) ?? null;
  ok('2.1 the redone dismissal row is LIVE (retiredAt === null)', row !== null && row.retiredAt === null,
     `after undo1 the doc read ${afterUndo1}; after redo it reads ${JSON.stringify(rows(store, conflictId))}`);
  ok('2.2 ...and the conflict renders "dismissed"', rendered(store, conflictId) === 'dismissed', rendered(store, conflictId));
  ok('2.3 the A-5b invariant holds at every step (it does NOT catch this)', bad.length === 0, bad.join(', '));

  // Root cause: which of the four clauses declined? Clause 4 (row count rose) holds; clause 2
  // (the redone doc has a LIVE row) does not, because the document `undo` pushed into
  // `future` is the RE-ASSERTED one — `set` step 5 replaced it before it was ever stored.
  const st = store.getState();
  console.log(`         clause 2 (live row in the redone doc): ${st.doc.resolutions.some((r) => r.conflictId === conflictId && !r.retiredAt)}`);
  console.log(`         clause 3 (ledger holds the mark):      ${marks(store).includes(conflictId)}`);
}
{
  // 2.4 — is it recoverable? Pressing "Not a problem" again goes through `dispatch`, which
  // does release. If even that fails the finding is worse than R9-1 was.
  const { store, conflictId } = await dismissedThenRetired();
  store.undo(); store.undo(); store.redo(); store.getDerived();
  store.dispatch({ type: 'resolveConflict', resolution: { conflictId, state: 'dismissed', by: 'local:self', at: '2026-08-02' } });
  store.getDerived();
  ok('2.4 dismissing again after the dead redo does work (recoverable, as R9-1 was)',
     rendered(store, conflictId) === 'dismissed', `${rendered(store, conflictId)} rows=${JSON.stringify(rows(store, conflictId))}`);
}
{
  // 2.5 — the same shape with THREE undos and two redos: does the second redo ever revive it?
  const { store, conflictId, dayId } = await dismissedThenRetired();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'A' } });
  store.undo(); store.getDerived();   // back to the retired state
  store.undo(); store.getDerived();   // back to legacyFlag:true, row present
  store.undo(); store.getDerived();   // past the dismissal
  store.redo(); store.getDerived();   // redo the dismissal
  store.redo(); store.getDerived();   // redo the edit-away
  store.undo(); store.getDerived();   // back to the conflict-present state again
  const live = store.getState().doc.resolutions.some((r) => r.conflictId === conflictId && !r.retiredAt);
  ok('2.5 a deeper undo/redo round trip does not revive the dismissal either',
     live && rendered(store, conflictId) === 'dismissed', `live=${live} renders "${rendered(store, conflictId)}" rows=${JSON.stringify(rows(store, conflictId))}`);
}
{
  // 2.6 — the builder's own 6-action sequence, re-derived here as the control: it must pass.
  const { store, conflictId } = await dismissedThenRetired();
  store.undo();                                                  // live row -> re-asserted
  store.dispatch({ type: 'resolveConflict', resolution: { conflictId, state: 'dismissed', by: 'local:self', at: '2026-08-02' } });
  store.undo();
  store.redo(); store.getDerived();
  ok('2.6 CONTROL — the 6-action sequence A-5b names is fixed (this one works)',
     rendered(store, conflictId) === 'dismissed', `${rendered(store, conflictId)} rows=${JSON.stringify(rows(store, conflictId))}`);
}

// ---------------------------------------------------------------------------
line('§3 two conflicts — attribution of the release, and multi-id redo steps');
{
  const store = mk();
  await store.createTrip({ ...TRIP_INIT, endDate: '2026-08-10' });
  const [d0, d1] = store.getState().doc.days;
  store.dispatch({ type: 'setDayMeta', dayId: d0.id, patch: { legacyFlag: true } });
  store.dispatch({ type: 'setDayMeta', dayId: d1.id, patch: { legacyFlag: true } });
  const cs = store.getDerived().conflicts.filter((c) => c.ruleId === 'legacy_flag');
  const [a, b] = cs.map((c) => c.id);
  ok('3.0 precondition: two distinct legacy_flag conflicts', cs.length === 2 && a !== b, cs.map((c) => c.id).join(' '));

  // Dismiss A, dismiss B, retire A only (edit A's day back), then undo the retirement-causing
  // edit and dismiss B a second time... then redo. Only B's count rises.
  store.dispatch({ type: 'resolveConflict', resolution: { conflictId: a, state: 'dismissed', by: 'local:self', at: TODAY } });
  store.dispatch({ type: 'setDayMeta', dayId: d0.id, patch: { legacyFlag: false } });
  store.getDerived();                                             // A retired, mark held for A
  store.dispatch({ type: 'resolveConflict', resolution: { conflictId: b, state: 'dismissed', by: 'local:self', at: TODAY } });
  store.getDerived();
  store.undo();  store.getDerived();                              // un-dismiss B
  store.redo();  store.getDerived();                              // re-dismiss B
  ok('3.1 redoing B\'s dismissal leaves B dismissed', rendered(store, b) === 'dismissed', `${rendered(store, b)} ${JSON.stringify(rows(store, b))}`);
  ok('3.2 ...and does NOT release A\'s mark (A stays retired/unresolved)',
     marks(store).includes(a) && rendered(store, a) !== 'dismissed' && rows(store, a).every((r) => !r.endsWith('retiredAt=null')),
     `marks=${marks(store).join(',')} A=${rendered(store, a)} ${JSON.stringify(rows(store, a))}`);
}
{
  // 3.3 — can ONE redo step raise the row count for two ids at once? Only if one history
  // entry carries two appends. `reduce` pushes one snapshot per action and `resolveConflict`
  // appends one row, so this should be unreachable through dispatch. Prove it by trying.
  const store = mk();
  await store.createTrip({ ...TRIP_INIT, endDate: '2026-08-10' });
  const [d0, d1] = store.getState().doc.days;
  store.dispatch({ type: 'setDayMeta', dayId: d0.id, patch: { legacyFlag: true } });
  store.dispatch({ type: 'setDayMeta', dayId: d1.id, patch: { legacyFlag: true } });
  const [a, b] = store.getDerived().conflicts.filter((c) => c.ruleId === 'legacy_flag').map((c) => c.id);
  store.dispatch({ type: 'resolveConflict', resolution: { conflictId: a, state: 'dismissed', by: 'local:self', at: TODAY } });
  store.dispatch({ type: 'resolveConflict', resolution: { conflictId: b, state: 'dismissed', by: 'local:self', at: TODAY } });
  const past = store.getState().history.past;
  const deltas = past.map((p, i) => {
    const nxt = i + 1 < past.length ? past[i + 1] : store.getState().doc;
    const ids = new Set([...p.resolutions, ...nxt.resolutions].map((r) => r.conflictId));
    return [...ids].filter((id) =>
      nxt.resolutions.filter((r) => r.conflictId === id).length > p.resolutions.filter((r) => r.conflictId === id).length).length;
  });
  ok('3.3 no single history step raises more than one conflictId\'s row count', deltas.every((d) => d <= 1), deltas.join(','));
}

// ---------------------------------------------------------------------------
line('§4 the history limit (50) — the release rule at the floor of `past`');
{
  const store = mk();
  await store.createTrip(TRIP_INIT);
  const dayId = store.getState().doc.days[0].id;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { legacyFlag: true } });
  const conflictId = store.getDerived().conflicts.find((c) => c.ruleId === 'legacy_flag').id;
  store.dispatch({ type: 'resolveConflict', resolution: { conflictId, state: 'dismissed', by: 'local:self', at: TODAY } });
  for (let i = 0; i < 48; i++) store.dispatch({ type: 'setDayMeta', dayId, patch: { title: `t${i}` } });
  ok('4.0 precondition: history is at its 50-entry limit', store.getState().history.past.length === 50, String(store.getState().history.past.length));
  for (let i = 0; i < 50; i++) { store.undo(); store.getDerived(); }
  const atFloor = rows(store, conflictId);
  for (let i = 0; i < 50; i++) { store.redo(); store.getDerived(); }
  ok('4.1 50 undos then 50 redos leave the dismissal live and rendered dismissed',
     rendered(store, conflictId) === 'dismissed',
     `floor=${JSON.stringify(atFloor)} top=${JSON.stringify(rows(store, conflictId))} renders "${rendered(store, conflictId)}"`);
  ok('4.2 ...and `past` never exceeded the limit through redo',
     store.getState().history.past.length <= 50, String(store.getState().history.past.length));
}

// ---------------------------------------------------------------------------
line('§5 a trip round trip and a merge reseed with a live future stack');
{
  // 5.1 — dismiss on A, undo, switch to B and back, then redo on A. `openTrip` reseeds, so
  // the future stack should be gone; the redo must be a harmless no-op and must not touch
  // the other trip's ledger or install the wrong document.
  const storage = client.memoryStorage();
  const { store, conflictId } = await dismissedThenRetired(storage);
  const aId = store.getState().doc.id;
  await store.flush();
  await store.createTrip({ ...TRIP_INIT, title: 'Trip B' });
  const bId = store.getState().doc.id;
  await store.flush();
  await store.openTrip(aId);
  let threw = null;
  try { store.redo(); store.redo(); } catch (e) { threw = e.message; }
  store.getDerived();
  ok('5.1a redo after an A -> B -> A round trip does not throw', threw === null, threw ?? '');
  ok('5.1b ...and the active document is still trip A', store.getState().doc.id === aId, `${store.getState().doc.id} (B=${bId})`);
  ok('5.1c ...and the ledger is trip A\'s', store.getState().retired?.tripId === aId, String(store.getState().retired?.tripId));
  ok('5.1d ...and the retired dismissal is still retired', rows(store, conflictId).every((r) => !r.endsWith('retiredAt=null')),
     `renders "${rendered(store, conflictId)}" rows=${JSON.stringify(rows(store, conflictId))}`);
}
{
  // 5.2 — a `mergeWithStored` reseed does NOT clear history. Redo afterwards compares the
  // merged document against a pre-merge snapshot. Does the release rule misfire, and does
  // the redo install a document that is still trip A's?
  const storage = client.memoryStorage();
  const { store, conflictId, dayId } = await dismissedThenRetired(storage);
  await store.flush();
  const id = store.getState().doc.id;
  // A second writer moves storage on.
  const other = mk(storage);
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'from the other tab' } });
  await other.flush();
  store.dispatch({ type: 'setDayMeta', dayId, patch: { note: 'mine' } });
  await store.flush();                                            // -> conflict
  const conflicted = store.getState().persistence.status === 'conflict';
  ok('5.2a precondition: the store is in conflict, so merge is reachable', conflicted, store.getState().persistence.status);
  if (conflicted) {
    store.undo();                                                 // put something in `future`
    await store.mergeWithStored();
    let threw = null;
    try { store.redo(); } catch (e) { threw = e.message; }
    store.getDerived();
    ok('5.2b redo after a merge reseed does not throw', threw === null, threw ?? '');
    ok('5.2c ...and does not un-retire the retired dismissal', rows(store, conflictId).every((r) => !r.endsWith('retiredAt=null')),
       `${rendered(store, conflictId)} rows=${JSON.stringify(rows(store, conflictId))}`);
    const bad = [];
    invariant(store, 'after merge+redo', bad);
    ok('5.2d ...and the A-5b invariant still holds', bad.length === 0, bad.join(', '));
  }
}

console.log(`\n${fails} FAIL`);
