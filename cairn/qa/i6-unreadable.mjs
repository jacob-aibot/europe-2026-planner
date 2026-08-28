/**
 * Round 26 — I-6, part 6: **the `unreadable` report's own lifecycle.**
 *
 *   Run: node --experimental-strip-types qa/i6-unreadable.mjs      (from cairn/)
 *
 * `RescanState.unreadable` is documented as *"cleared and re-derived at the start of every
 * pass, so a record another writer repairs stops being reported without anything having to
 * remember that it was."* That clearing lives in `startRescan`, **after** its early return:
 *
 *     function startRescan(): Promise<void> {
 *       if (rescanning) return rescanning;
 *       if (!state.library.some(needsRescan)) return Promise.resolve();   // <- no clearing
 *       set({ ...state, rescan: { running: true, unreadable: [] } });
 *
 * So the guarantee holds only when a pass actually runs. This probe asks what happens on the
 * two paths where one does not:
 *
 *   1  a corrupt document is repaired by another writer, and the repaired row is written at
 *      the current `SUMMARY_VERSION` — so nothing is left to rescan and no pass starts
 *   2  the corrupt trip is deleted outright
 *
 * In both, the library must stop saying a file could not be read. Does it?
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
  ids: sequentialIdPort(`u${++seq}-`), scheduler: immediateScheduler(),
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

async function seedCorrupt(storage, id) {
  const doc = makeTrip(id);
  const r = await storage.saveIfVersion(id, null, { id, nope: true }, preI6Row(doc));
  if (!r.ok) throw new Error('seed failed');
  return doc;
}

// ---------------------------------------------------------------------------
head('setup — one good row, one whose document will not parse');
const storage = memoryStorage();
{
  const good = makeTrip('good');
  await storage.saveIfVersion('good', null, core.toJSON(good), preI6Row(good));
}
const badDoc = await seedCorrupt(storage, 'bad');

const store = createStore({ ports: ports(storage) });
await store.refreshLibrary();
await store.rescanSummaries();
{
  const scan = summaryScan(store.getState());
  note(`after pass 1: ${JSON.stringify(scan)}`);
  ok(scan.phase === 'stale', 'the corrupt row keeps the library out of date');
  ok(scan.unreadable.length === 1 && scan.unreadable[0].id === 'bad', 'and names it', scan.unreadable);
  ok(scan.current === 1 && scan.total === 2, 'the good row still converged — one bad record does not take the view down', scan);
}

// ---------------------------------------------------------------------------
head('1 — another writer REPAIRS the document AND writes a current row');
{
  // Exactly what a second tab that could open and re-save the trip would leave behind.
  const cur = storage.versions.get('bad');
  const fixed = core.toJSON(badDoc);
  const r = await storage.saveIfVersion('bad', cur, fixed, core.tripSummary(badDoc, core.COUNTRY_INDEX));
  ok(r.ok, 'the repair landed');
  const stored = await storage.load('bad');
  ok(core.fromJSON(stored.doc).id === 'bad', 'the document parses again');

  await store.refreshLibrary();
  await store.rescanSummaries();          // no row is below the version, so NO pass runs
  const scan = summaryScan(store.getState());
  note(`after the repair + refresh + rescan: ${JSON.stringify(scan)}`);
  ok(scan.outdated.length === 0, 'nothing is outdated any more', scan.outdated);
  ok(scan.unreadable.length === 0,
    'REPRODUCED IF FAILING: a repaired record is still reported as unreadable', scan.unreadable);
  ok(scan.phase === 'complete',
    'REPRODUCED IF FAILING: the library still refuses to say it is complete', scan.phase);
  note('`Library.tsx` renders this as a per-row chip: "This trip’s file could not be read"');
  note('on a row whose file reads perfectly, plus the ScanNote header. It clears only if some');
  note('OTHER row later drops below SUMMARY_VERSION and a pass actually runs.');
}

// ---------------------------------------------------------------------------
head('2 — and what makes it clear again: any pass at all');
{
  // Push the good row back below the version so a pass has something to do.
  const cur = storage.versions.get('good');
  const g = await storage.load('good');
  await storage.saveIfVersion('good', cur, g.doc, preI6Row(makeTrip('good')));
  await store.refreshLibrary();
  await store.rescanSummaries();
  const scan = summaryScan(store.getState());
  note(`after an unrelated row forced a pass: ${JSON.stringify(scan)}`);
  ok(scan.unreadable.length === 0, 'the stale report is cleared by the next pass that runs', scan.unreadable);
  ok(scan.phase === 'complete', 'and the library says complete', scan.phase);
  note('So the defect is bounded: it is a stale report, not a stuck rescan, and any later');
  note('version bump clears it. It is still a false "could not be read" on a good file.');
}

// ---------------------------------------------------------------------------
head('3 — the same shape when the corrupt trip is DELETED instead of repaired');
{
  const storage2 = memoryStorage();
  const good = makeTrip('good');
  await storage2.saveIfVersion('good', null, core.toJSON(good), preI6Row(good));
  await seedCorrupt(storage2, 'bad');
  const s2 = createStore({ ports: ports(storage2) });
  await s2.refreshLibrary();
  await s2.rescanSummaries();
  ok(summaryScan(s2.getState()).unreadable.length === 1, 'precondition: reported unreadable');
  await s2.deleteTrip('bad');
  const scan = summaryScan(s2.getState());
  note(`after deleteTrip('bad'): ${JSON.stringify(scan)}`);
  ok(scan.total === 1, 'the row is gone from the library', scan.total);
  ok(scan.unreadable.length === 0,
    'REPRODUCED IF FAILING: a deleted trip is still counted in the unreadable report', scan.unreadable);
  ok(scan.phase === 'complete',
    'REPRODUCED IF FAILING: the library will not say complete because of a trip that no longer exists', scan.phase);
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}`);
process.exitCode = fails === 0 ? 0 : 1;
