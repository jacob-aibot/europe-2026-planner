/**
 * Round 26 — I-6, part 7: **the end-of-pass `listTrips()` is off the chain.**
 *
 *   Run: node --experimental-strip-types qa/i6-ghostrow.mjs      (from cairn/)
 *
 * `runRescan` ends every pass with
 *
 *     const library = await ports.storage.listTrips();
 *     set({ ...state, library, rescan: { running: true, unreadable: report() } });
 *
 * outside any `chainOntoSaving` callback (store.ts:806-807). §4.3 permits that — `listTrips`
 * and `load` are exempt from the chain because they are reads. But the `set` that follows is
 * a **write to `state.library`**, and it replaces the whole array with a snapshot taken at
 * some earlier moment. `deleteTrip` removes a row from `state.library` *inside* a chain link
 * it holds for the whole delete (store.ts:1143-1150), and the rescan's read is not ordered
 * against that link at all.
 *
 * So: park the pass's `listTrips()`, delete a trip while it is parked, release. Does the
 * deleted trip's row come back?
 *
 * `refreshLibrary()` has the same shape and predates I-6 — but it is a method the app calls
 * when the user asks for it. The rescan calls it once per pass, unprompted, on every boot.
 */
import {
  createStore, summaryScan, memoryStorage, memoryFile,
  fixedClockPort, sequentialIdPort, immediateScheduler, core,
} from '../packages/client/src/index.ts';

let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const TODAY = '2026-08-01';
let seq = 0;
const ports = (storage) => ({
  storage, file: memoryFile(), clock: fixedClockPort(TODAY),
  ids: sequentialIdPort(`h${++seq}-`), scheduler: immediateScheduler(),
});
const CITY = { vienna: { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } } };
const makeTrip = (id) =>
  core.createTrip(
    { id, title: `Trip ${id}`, startDate: '2026-08-07', endDate: '2026-08-09', homeCurrency: 'EUR', cities: [CITY.vienna] },
    { ids: core.sequentialIds(`${id}-`), now: TODAY, actorUserId: core.LOCAL_OWNER },
  );
const preI6Row = (doc) => ({
  id: doc.id, title: doc.title, startDate: doc.startDate, endDate: doc.endDate,
  datePrecision: doc.datePrecision, cityCount: doc.cities.length, dayCount: doc.days.length,
  stopCount: 0, poolCount: 0, revision: doc.revision,
});

head('a delete lands while the pass\'s end-of-pass listTrips() is in flight');
const storage = memoryStorage();
for (const id of ['keep', 'doomed']) {
  const d = makeTrip(id);
  await storage.saveIfVersion(id, null, core.toJSON(d), preI6Row(d));
}

// Park `listTrips` on its SECOND call — the first is `refreshLibrary`'s.
let calls = 0;
let release = null;
const origList = storage.listTrips.bind(storage);
storage.listTrips = async () => {
  calls++;
  // Read FIRST, then park: this models a slow port whose result was computed before the
  // delete and delivered after it, which is what an IndexedDB cursor round trip does.
  const rows = await origList();
  if (calls === 2) await new Promise((r) => { release = r; });
  return rows;
};

const store = createStore({ ports: ports(storage) });
await store.refreshLibrary();
const pass = store.rescanSummaries();
for (let i = 0; i < 200 && release === null; i++) await new Promise((r) => setImmediate(r));
ok(release !== null, 'the pass parked on its end-of-pass listTrips()');

await store.deleteTrip('doomed');
const afterDelete = store.getState();
ok(!afterDelete.library.some((r) => r.id === 'doomed'), 'deleteTrip removed the row from the in-memory library',
  afterDelete.library.map((r) => r.id));
ok((await storage.load('doomed')) === null, 'and the document is gone from storage');

release();
await pass;

const s = store.getState();
note(`in-memory library after the pass resumed: ${JSON.stringify(s.library.map((r) => r.id))}`);
note(`storage listTrips now: ${JSON.stringify((await origList()).map((r) => r.id))}`);
ok(!s.library.some((r) => r.id === 'doomed'),
  'REPRODUCED IF FAILING: the deleted trip\'s row is back in the library the user is looking at',
  s.library.map((r) => r.id));

if (s.library.some((r) => r.id === 'doomed')) {
  let err = null;
  try { await store.openTrip('doomed'); } catch (e) { err = e; }
  note(`clicking the ghost row: ${err ? `${err.constructor.name}: ${err.message}` : 'IT OPENED'}`);
  note(`summaryScan: ${JSON.stringify(summaryScan(s))}`);
  note('`Library.tsx` renders the row from `state.library` alone, so the card is on screen with');
  note('its title, dates and counts. The document behind it does not exist.');
  // Does it heal?
  await store.refreshLibrary();
  note(`after an explicit refreshLibrary(): ${JSON.stringify(store.getState().library.map((r) => r.id))}`);
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}`);
process.exitCode = fails === 0 ? 0 : 1;
