/**
 * QA round 28 (I-7) — the two things BUILD-NOTES' I-7 addendum lists as **not verified**:
 *
 *   (1) the `SUMMARY_VERSION` 3 -> 4 rescan against a **real stored version-3 row**, not a
 *       seeded client test;
 *   (2) `travelStats` with **more than one row** outside a unit test.
 *
 * Both are driven through the shipped client store and the shipped memory port. Section 3 is
 * mine: the window between `refreshLibrary()` and `rescanSummaries()` finishing, in which the
 * library holds version-3 rows and `travelStats` is the function I-8's Profile will call.
 *
 *   node --experimental-strip-types qa/i7-rescan.mjs
 */
import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler, core,
} from '../packages/client/src/index.ts';

let fails = 0;
const ok = (c, m, extra) => {
  if (c) console.log(`  ok    ${m}`);
  else { fails++; console.log(`  FAIL  ${m}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const TODAY = '2026-08-28';
let seq = 0;
const ports = (storage) => ({
  storage, file: memoryFile(), clock: fixedClockPort(TODAY),
  ids: sequentialIdPort(`c${++seq}-`), scheduler: immediateScheduler(),
});

const CITY = {
  vienna: { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } },
  tokyo: { key: 'tokyo', name: 'Tokyo', countryCode: 'JP', centre: { lat: 35.6762, lng: 139.6503 } },
  split: { key: 'split', name: 'Split', countryCode: 'HR', centre: { lat: 43.5081, lng: 16.4402 } },
};
const makeTrip = (id, cityKey, startDate, endDate) =>
  core.createTrip(
    { id, title: `Trip ${id}`, startDate, endDate, homeCurrency: 'EUR', cities: [CITY[cityKey]] },
    { ids: core.sequentialIds(`${id}-`), now: TODAY, actorUserId: core.LOCAL_OWNER },
  );

/**
 * **A real version-3 row.** Built by calling the shipped `tripSummary` and then deleting
 * exactly what I-7 added — `attribution` — and setting the stamp back to 3. That is what a
 * build one commit older wrote, field for field, rather than a hand-typed approximation.
 */
function versionThreeRow(doc) {
  const row = core.tripSummary(doc, core.COUNTRY_INDEX);
  delete row.attribution;
  row.summaryVersion = 3;
  return row;
}

async function seed(storage, doc) {
  const r = await storage.saveIfVersion(doc.id, null, core.toJSON(doc), versionThreeRow(doc));
  if (!r.ok) throw new Error(`seed ${doc.id} failed`);
}

// ---------------------------------------------------------------------------
head('1. a REAL stored version-3 row is rescanned to 4 and gains `attribution`');
{
  const storage = memoryStorage();
  const docs = [
    makeTrip('t-at', 'vienna', '2024-05-01', '2024-05-10'),
    makeTrip('t-jp', 'tokyo', '2023-03-01', '2023-03-14'),
    makeTrip('t-hr', 'split', '2026-08-25', '2026-09-05'),   // active on TODAY
  ];
  for (const d of docs) await seed(storage, d);

  const before = await storage.listTrips();
  ok(before.every((r) => r.summaryVersion === 3), 'seeded rows are version 3',
    before.map((r) => r.summaryVersion));
  ok(before.every((r) => r.attribution === undefined), 'seeded rows carry no `attribution`');

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const scanBefore = store.getState().library;
  note(`library after refreshLibrary(): ${scanBefore.length} rows, versions ` +
    JSON.stringify(scanBefore.map((r) => r.summaryVersion)));

  await store.rescanSummaries();
  const after = await storage.listTrips();
  ok(after.every((r) => r.summaryVersion === core.SUMMARY_VERSION),
    `every stored row reached SUMMARY_VERSION ${core.SUMMARY_VERSION}`, after.map((r) => r.summaryVersion));
  ok(after.every((r) => r.attribution && typeof r.attribution.places.located === 'number'),
    'every stored row now carries a real `attribution` census',
    after.map((r) => r.attribution));
  // The census must be the one `tripSummary` would mint from the same document.
  for (const d of docs) {
    const want = core.tripSummary(d, core.COUNTRY_INDEX);
    const got = after.find((r) => r.id === d.id);
    ok(JSON.stringify(got.attribution) === JSON.stringify(want.attribution),
      `${d.id}'s rescanned census equals a fresh mint`, { got: got.attribution, want: want.attribution });
  }
  // A-30: the rescan is a summary refresh, not a document write.
  ok(storage.saveCount === 3, `the rescan wrote no document (saveCount ${storage.saveCount}, 3 from the seed)`);
  ok(storage.refreshCount === 3, `three summary refreshes (${storage.refreshCount})`);

  head('2. `travelStats` over a REAL multi-row library, from storage');
  const lib = store.getState().library;
  ok(lib.length === 3, `three rows in the library (${lib.length})`);
  const st = core.travelStats(lib, TODAY);
  note(JSON.stringify({
    countries: st.countries.map((c) => `${c.code}:${c.firstVisit}..${c.lastVisit}`),
    cities: st.cities.map((c) => `${c.nameKey}/${c.countryCode}`),
    trips: st.trips, daysTravelled: st.daysTravelled, located: st.located, unattributed: st.unattributed,
  }));
  ok(st.trips.completed === 2 && st.trips.active === 1 && st.trips.planned === 0,
    'two completed, one active', st.trips);
  // 2023-03-01..14 = 14 days; 2024-05-01..10 = 10 days; active 2026-08-25..TODAY = 4 days.
  ok(st.daysTravelled === 28, `daysTravelled is 14+10+4 = 28 (got ${st.daysTravelled})`);
  ok(st.countries.map((c) => c.code).join(',') === 'AT,HR,JP', 'countries sorted by code',
    st.countries.map((c) => c.code));
  const hr = st.countries.find((c) => c.code === 'HR');
  ok(hr.lastVisit === TODAY, `the active trip's HR lastVisit is clamped to today (${hr.lastVisit})`);
  ok(st.cities.map((c) => c.nameKey).join(',') === 'split,tokyo,vienna', 'cities sorted by nameKey',
    st.cities.map((c) => c.nameKey));
  // Purity against a real library array.
  const snapshot = JSON.stringify(lib);
  core.travelStats(lib, TODAY);
  ok(JSON.stringify(lib) === snapshot, 'the store\'s own library array is untouched by the call');
}

// ---------------------------------------------------------------------------
head('3. the window: `travelStats` between refreshLibrary() and the rescan finishing');
{
  const storage = memoryStorage();
  const past = makeTrip('t-old', 'tokyo', '2019-03-01', '2019-03-14');
  await seed(storage, past);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();          // rows are read; the rescan has NOT run
  const lib = store.getState().library;
  note(`library holds ${lib.length} row(s) at summaryVersion ${lib.map((r) => r.summaryVersion)}`);
  let threw = null;
  try { core.travelStats(lib, TODAY); } catch (e) { threw = e.message; }
  ok(threw === null,
    'travelStats over a library that has not been rescanned yet does not throw', threw);
  if (threw) {
    console.log('        ^^ I-8\'s Profile calls this. Between refreshLibrary() and the rescan');
    console.log('           finishing, a *completed* version-3 row makes it throw. A-31 Part 4');
    console.log('           lists exactly two throws (duplicate id, malformed date); this is a third.');
  }
  // ...and the same stale row is silently accepted when it happens to be `planned`.
  const future = makeTrip('t-soon', 'vienna', '2027-01-01', '2027-01-10');
  const storage2 = memoryStorage();
  await seed(storage2, future);
  const store2 = createStore({ ports: ports(storage2) });
  await store2.refreshLibrary();
  let threw2 = null;
  try { core.travelStats(store2.getState().library, TODAY); } catch (e) { threw2 = e.message; }
  ok(threw2 === threw,
    'the version-3 guard fires uniformly, not only for trips that happen to be in the past',
    { completedRow: threw, plannedRow: threw2 });
}

console.log(fails === 0 ? '\nALL OK' : `\n${fails} FAIL(S)`);
process.exit(fails === 0 ? 0 : 1);
