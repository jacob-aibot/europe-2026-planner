/**
 * Round 10 — found while probing A-5b's `redo` path, OUTSIDE that item's scope and reported
 * as its own finding: **`mergeWithStored` does not clear the undo history, so one Ctrl+Z
 * after a merge destroys the other tab's edit — in storage, silently.** Run from `cairn/`:
 *
 *     node qa/r10-mergeundo.mjs
 *
 * `writeAndSettle` installs the merged document with `{ reseed: true }` (`store.ts:379-411`)
 * but spreads `...state`, so `history.past` / `history.future` still hold PRE-merge snapshots
 * of the same trip. §4.2 rule 5's undo is a snapshot restore, so it restores a document that
 * predates the merge — and the debounced autosave then writes it with the post-merge
 * `savedVersion` as its expectation, which storage accepts.
 *
 * Two writers, one trip, disjoint fields: the merge is correct (both survive). One keystroke
 * later, neither does.
 */
const client = await import('../packages/client/src/index.ts');
const core = await import('../packages/core/src/index.ts');

let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? '\n         ' + x : '')); };

const TODAY = '2026-08-01';
const mk = (storage) => client.createStore({
  ports: { storage, clock: client.fixedClockPort(TODAY), ids: client.sequentialIdPort() },
  debounceMs: 5,
});

const storage = client.memoryStorage();
const mine = mk(storage);
await mine.createTrip({
  title: 'Shared trip', startDate: '2026-08-07', endDate: '2026-08-09',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
});
const id = mine.getState().doc.id;
const dayId = mine.getState().doc.days[0].id;
await mine.flush();

// The other tab edits the day's TITLE and saves.
const other = mk(storage);
await other.openTrip(id);
other.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'OTHER TAB' } });
await other.flush();

// This tab edits the day's NOTE — a disjoint field — and hits the version fence.
mine.dispatch({ type: 'setDayMeta', dayId, patch: { note: 'mine' } });
await mine.flush();
ok('1 precondition: the save is refused, so the merge button is reachable',
   mine.getState().persistence.status === 'conflict', mine.getState().persistence.status);

await mine.mergeWithStored();
const merged = mine.getState().doc.days[0];
ok('2 the merge itself is correct — both writers\' edits survive',
   merged.title === 'OTHER TAB' && merged.note === 'mine', `title=${JSON.stringify(merged.title)} note=${JSON.stringify(merged.note)}`);
ok('3 ...but the pre-merge undo history was NOT cleared by the reseed',
   mine.getState().history.past.length === 0, `past=${mine.getState().history.past.length}`);

mine.undo();
await mine.flush();
const stored = core.fromJSON((await storage.load(id)).doc);
ok('4 one Ctrl+Z after the merge does not destroy the other tab\'s edit IN STORAGE',
   stored.days[0].title === 'OTHER TAB',
   `persisted title=${JSON.stringify(stored.days[0].title)} note=${JSON.stringify(stored.days[0].note)}, `
   + `save status=${mine.getState().persistence.status} — the merged document was replaced by a PRE-merge `
   + 'snapshot and written over storage with the post-merge expectation, which the port accepts');

console.log(`\n${fails} FAIL`);
