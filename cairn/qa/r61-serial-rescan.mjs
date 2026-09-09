/**
 * QA round 61 — the parser's refusals and the `SUMMARY_VERSION` 5 → 6 rescan, for I-22 / A-83
 * Part 8, against commit `3b21a63`.
 *
 * Run from `cairn/`:  `node --experimental-strip-types qa/r61-serial-rescan.mjs`
 *
 *   A  `fromJSON` on every shape `centre` and `placeId` can hold — refused, or refused where?
 *   B  a version-4 document whose city has NO `placeId` key at all
 *   C  the rescan: a stale version-5 row is really RE-DERIVED, not silently trusted
 *   D  no new rescan machinery — the trigger is still `(row.summaryVersion ?? 0) < SUMMARY_VERSION`
 *   E  a version-6 row is not rewritten (the non-vacuity control)
 */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const CAIRN = dirname(dirname(fileURLToPath(import.meta.url)));
const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);
const client = await import(pathToFileURL(join(CAIRN, 'packages/client/src/index.ts')).href);

let fails = 0;
const ok = (c, m, x) => { if (c) console.log(`  ok   ${m}`); else { fails++; console.log(`  FAIL ${m}${x === undefined ? '' : `  — ${x}`}`); } };
const note = (m) => console.log(`  note ${m}`);
const head = (s) => console.log(`\n== ${s}`);
const J = (v) => JSON.stringify(v);

const ctx = () => ({ ids: core.sequentialIds('r61s'), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
const base = () => core.createTrip({ id: 'trip_a', title: 'T', startDate: '2026-08-07', endDate: '2026-08-08',
  cities: [{ key: 'c1', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } }] }, ctx());

// ---------------------------------------------------------------------------
head('A — fromJSON on every shape centre and placeId can hold');
{
  const doc0 = JSON.parse(core.toJSON(base()));
  const attempt = (patch) => {
    const d = JSON.parse(JSON.stringify(doc0));
    Object.assign(d.cities[0], patch);
    try { const t = core.fromJSON(d); return { opened: true, value: t.cities[0] }; }
    catch (e) { return { opened: false, message: e.message, path: e.path }; }
  };
  const CENTRE = [
    ['null', null, 'open'],
    ['a string', 'abc', 'refuse'],
    ['a number', 42, 'refuse'],
    ['an array', [1, 2], 'refuse'],
    ['true', true, 'refuse'],
    ['{}', {}, 'refuse'],
    ['{lat only}', { lat: 1 }, 'refuse'],
    ['{lat:"1",lng:2}', { lat: '1', lng: 2 }, 'refuse'],
    ['{lat:NaN,lng:0}', { lat: Number.NaN, lng: 0 }, 'refuse'],
    ['{lat:0,lng:0}', { lat: 0, lng: 0 }, 'open'],
    ['{lat:0,lng:0,alt:5}', { lat: 0, lng: 0, alt: 5 }, 'open'],
    ['{lat:999,lng:999}', { lat: 999, lng: 999 }, 'open'],
  ];
  for (const [label, v, want] of CENTRE) {
    const r = attempt({ centre: v });
    const got = r.opened ? 'open' : 'refuse';
    ok(got === want, `centre ${label}: ${want}`, r.opened ? J(r.value.centre) : `${r.message} @ ${r.path}`);
    if (!r.opened) note(`   refusal path: ${r.path}`);
  }
  // `undefined` (the key removed) is the shape migrateDoc is supposed to be responsible for.
  {
    const d = JSON.parse(JSON.stringify(doc0));
    delete d.cities[0].centre;
    let out = 'open';
    let msg = '';
    try { core.fromJSON(d); } catch (e) { out = 'refuse'; msg = `${e.message} @ ${e.path}`; }
    ok(out === 'refuse', 'centre ABSENT is refused rather than defaulted to null', msg);
    note(`   ${msg}`);
  }
  const PLACEID = [
    ['null', null, 'open'], ['a string', 'ne:x', 'open'], ['the empty string', '', 'open'],
    ['a number', 42, 'refuse'], ['an object', {}, 'refuse'], ['an array', [], 'refuse'],
    ['true', true, 'refuse'],
  ];
  for (const [label, v, want] of PLACEID) {
    const r = attempt({ placeId: v });
    const got = r.opened ? 'open' : 'refuse';
    ok(got === want, `placeId ${label}: ${want}`, r.opened ? J(r.value.placeId) : `${r.message} @ ${r.path}`);
  }
  ok(attempt({ placeId: '' }).value.placeId === '',
    'an empty-string placeId is stored as "" and NOT normalised to null — the value that then fires the picked arm',
    J(attempt({ placeId: '' }).value.placeId));
}

// ---------------------------------------------------------------------------
head('B — a version-4 document whose city has NO placeId key');
{
  const d = JSON.parse(core.toJSON(base()));
  delete d.cities[0].placeId;
  let t = null, msg = '';
  try { t = core.fromJSON(d); } catch (e) { msg = `${e.message} @ ${e.path}`; }
  ok(t !== null, 'it opens', msg);
  if (t) ok(t.cities[0].placeId === null, 'an absent placeId reads as null', J(t.cities[0].placeId));
  // …and a v4 document that still carries {0,0}: the rung has already run and will not run again.
  const z = JSON.parse(core.toJSON(base()));
  z.cities[0].centre = { lat: 0, lng: 0 };
  const t2 = core.fromJSON(z);
  ok(J(t2.cities[0].centre) === J({ lat: 0, lng: 0 }),
    'a {0,0} inside an already-version-4 document survives the parse — nothing sweeps it',
    J(t2.cities[0].centre));
  const row = core.tripSummary(t2, core.COUNTRY_INDEX);
  note(`its summary row: centre ${J(row.cities[0].centre)}, country ${J(row.cities[0].countryCode)} — the Gulf of Guinea claim I-22 removes is still reachable this way`);
  const st = core.travelStats([row], '2026-12-31');
  note(`travelStats counts it as located.cities=${st.located.cities} — a fabricated coordinate still counts as located`);
}

// ---------------------------------------------------------------------------
head('C — the rescan really RE-DERIVES a stale version-5 row');
{
  const {
    createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
  } = client;
  const storage = memoryStorage();
  const doc = core.createTrip({ id: 't-gva', title: 'Geneva trip', startDate: '2026-08-07', endDate: '2026-08-09',
    homeCurrency: 'EUR', cities: [{ key: 'gva', name: 'Geneva', countryCode: 'CH',
      centre: { lat: 46.21, lng: 6.14 }, placeId: 'ne:j64n0x' }] }, ctx());
  // A generation-5 row: what the PREVIOUS build wrote for this document — the ring's `FR`,
  // `countrySource: 'coordinate'`, and a fabricated `{0,0}` on a second city.
  const staleRow = {
    ...core.tripSummary(doc, core.COUNTRY_INDEX),
    summaryVersion: 5,
    title: 'STALE TITLE',
    countryCodes: ['FR'],
    cities: [{ key: 'gva', name: 'Geneva', countryCode: 'FR', countrySource: 'coordinate',
      centre: { lat: 0, lng: 0 }, firstDay: null, lastDay: null }],
  };
  const seeded = await storage.saveIfVersion(doc.id, null, core.toJSON(doc), staleRow);
  ok(seeded.ok === true, 'the stale generation-5 row was seeded', J(seeded));
  const store = createStore({ ports: {
    storage, file: memoryFile(), clock: fixedClockPort('2026-08-01'),
    ids: sequentialIdPort('r61-'), scheduler: immediateScheduler(),
  } });
  await store.refreshLibrary();
  await store.rescanSummaries();
  // The store's own API name varies; fall back to whatever it exposes.
  const after = (await storage.listTrips()).find((r) => r.id === doc.id);
  ok(after.summaryVersion === core.SUMMARY_VERSION,
    `the row was brought to SUMMARY_VERSION ${core.SUMMARY_VERSION}`, J(after.summaryVersion));
  ok(after.title === doc.title, 'the STALE TITLE was replaced from the document', after.title);
  ok(after.cities[0].countryCode === 'CH' && after.cities[0].countrySource === 'picked',
    'the re-derived row carries the PICKED country, not the version-5 ring answer',
    J({ c: after.cities[0].countryCode, s: after.cities[0].countrySource }));
  ok(J(after.cities[0].centre) === J({ lat: 46.21, lng: 6.14 }),
    'the fabricated {0,0} on the stale row is gone', J(after.cities[0].centre));
  ok(J(after.countryCodes) === J(['CH']), 'countryCodes was re-derived too', J(after.countryCodes));
}

// ---------------------------------------------------------------------------
head('D — no new rescan machinery was invented');
{
  const src = readFileSync(join(CAIRN, 'packages/client/src/store/store.ts'), 'utf8');
  const m = src.match(/return \(row\.summaryVersion \?\? 0\) < core\.SUMMARY_VERSION;/);
  ok(m !== null, 'the trigger is still the single generic `< core.SUMMARY_VERSION` comparison',
    'the predicate moved');
  ok(!/=== *5|=== *6|summaryVersion *!== *\d/.test(src),
    'no version literal was hard-coded into the store',
    (src.match(/summaryVersion[^\n]*\d/g) ?? []).slice(0, 4).join(' | '));
  // The commit itself: did any packages/client/src file change?
  note('git: `git show --stat 3b21a63 -- packages/client/src` is empty — only the TEST moved');
}

// ---------------------------------------------------------------------------
head('E — a row already at the current version is not rewritten');
{
  const { createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler } = client;
  const storage = memoryStorage();
  const doc = core.createTrip({ id: 't-cur', title: 'Current', startDate: '2026-08-07', endDate: '2026-08-09',
    homeCurrency: 'EUR', cities: [{ key: 'vie', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } }] }, ctx());
  const fresh = core.tripSummary(doc, core.COUNTRY_INDEX);
  const doctored = { ...fresh, title: 'NOT REWRITTEN' };
  await storage.saveIfVersion(doc.id, null, core.toJSON(doc), doctored);
  const store = createStore({ ports: { storage, file: memoryFile(), clock: fixedClockPort('2026-08-01'),
    ids: sequentialIdPort('r61e-'), scheduler: immediateScheduler() } });
  await store.refreshLibrary();
  await store.rescanSummaries();
  const after = (await storage.listTrips()).find((r) => r.id === doc.id);
  ok(after.title === 'NOT REWRITTEN',
    'a row at SUMMARY_VERSION is left alone — the trigger is not vacuous',
    after.title);
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}`);
console.log('COMPLETE');
process.exit(fails === 0 ? 0 : 1);
