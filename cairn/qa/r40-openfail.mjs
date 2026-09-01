/**
 * QA round 40 — I-8f (§2.9 **A-47**) attacked in bare Node, independently of the builder's
 * `packages/client/test/open-failures.test.ts` and of `qa/r35-store.mjs`.
 *
 *   Run: node --experimental-strip-types qa/r40-openfail.mjs   (from cairn/)
 *
 *   A  `rowUnopenable`'s three disjuncts, one at a time, and the DIVERGENCE A-47 Part 4 exists
 *      to create: a row that is `rowDatesReadable` **and** `rowUnopenable`. If nothing ever
 *      exercises that split, the two predicates might as well be one.
 *   B  The carry across every transition that spreads `initialState()`, driven through the real
 *      store rather than asserted from the source: create / adopt / open / close / delete / import.
 *   C  The clear sites, and the ones A-47 says must NOT exist.
 *   D  `browseTrip`'s failure path — the half the builder says is bare-Node only.
 *   E  `exportStoredDoc`'s precondition, both arms, and the id-shape edges around it.
 *   F  Hostile / concurrent shapes: two opens in flight, an id that leaves the library another
 *      way, a huge `openFailures`, a thrown non-Error.
 *   G  R35-1's exact repro at the store layer: `days[3].date = "2026-02-30"`, and the rescue
 *      copy compared BYTE FOR BYTE against what storage holds.
 *
 * A `FAIL` line is the finding.
 */
import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort,
  immediateScheduler, core, rowDatesReadable, rowUnopenable,
} from '../packages/client/src/index.ts';

let fails = 0;
const ok = (c, label, extra) => {
  if (c) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const TODAY = '2026-08-01';
const mkPorts = () => ({
  storage: memoryStorage(), file: memoryFile(),
  clock: fixedClockPort(TODAY), ids: sequentialIdPort(), scheduler: immediateScheduler(),
});
const INIT = (title = 'Europe 2026') => ({
  title, startDate: '2026-08-07', endDate: '2026-08-22',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
});

/** Rewrite the stored bytes of `id` through `f`, with no parse on the way back in. */
async function poison(ports, id, f) {
  const rec = await ports.storage.load(id);
  const obj = JSON.parse(rec.doc);
  f(obj);
  // Write the bytes back with no version mint and no parse — exactly what a pre-A-45 build
  // left behind. `memoryStorage` exposes its map, which is how every prior probe does this.
  ports.storage.docs.set(id, JSON.stringify(obj));
}

// ===========================================================================
head('A — the three disjuncts, and A-47 Part 4\'s divergence');
{
  const p = mkPorts();
  const store = createStore({ ports: p });
  const s0 = await store.createTrip(INIT());
  const id = s0.doc.id;
  await store.flush();
  await store.closeTrip();

  const row = store.getState().library.find((r) => r.id === id);
  note(`row dates: ${row.startDate} → ${row.endDate}`);

  // 1. baseline: nothing established.
  ok(rowDatesReadable(row) === true, 'a healthy row is not rowDatesReadable');
  ok(rowUnopenable(store.getState(), row) === false, 'a healthy row is already rowUnopenable');

  // 2. F-C alone — the row's own dates.
  const badRow = { ...row, startDate: '2026-02-30' };
  ok(rowDatesReadable(badRow) === false, 'a calendar-invalid startDate is still rowDatesReadable');
  ok(rowUnopenable(store.getState(), badRow) === true, 'F-C does not reach rowUnopenable');

  // 3. F-A alone — a rescan's `unreadable`, injected as a state literal.
  const withRescan = { ...store.getState(), rescan: { running: false, unreadable: [{ id, message: 'x' }] } };
  ok(rowUnopenable(withRescan, row) === true, 'F-A does not reach rowUnopenable');
  ok(rowDatesReadable(row) === true, 'F-A leaked into the NARROW predicate');

  // 4. F-D alone — a real open attempt, driven through the store.
  await poison(p, id, (o) => { o.days[3].date = '2026-02-30'; });
  let threw = null;
  try { await store.openTrip(id); } catch (e) { threw = e; }
  ok(threw !== null, 'openTrip did not throw on a document with days[3].date = 2026-02-30');
  note(`banner text: ${threw && threw.message}`);
  const st = store.getState();
  ok(st.openFailures.length === 1 && st.openFailures[0].id === id,
     'the failure was not recorded in openFailures', st.openFailures);
  ok(st.openFailures[0].message === threw.message,
     'the recorded message is not the thrown one', { rec: st.openFailures[0].message, thrown: threw.message });
  ok(st.doc === null, 'a failed open left a document installed');
  ok(st.activeTripId === null, 'a failed open moved activeTripId', st.activeTripId);

  // ---- THE DIVERGENCE. This row's own two dates are perfect; its document is not. ----
  const liveRow = store.getState().library.find((r) => r.id === id);
  const narrow = rowDatesReadable(liveRow);
  const wide = rowUnopenable(store.getState(), liveRow);
  note(`divergence: rowDatesReadable=${narrow}  rowUnopenable=${wide}`);
  ok(narrow === true && wide === true,
     'A-47 Part 4\'s divergence is not reachable — the two predicates never disagree',
     { narrow, wide });

  // The narrow predicate is what the meta line reads, so it must still format.
  ok(core.isIsoDate(liveRow.startDate) && core.isIsoDate(liveRow.endDate),
     'the row the divergence rests on does not actually carry formattable dates');

  // 5. `rowUnopenable` must not open anything.
  let loads = 0;
  const counting = { ...store.getState(), rescan: store.getState().rescan };
  const t0 = p.storage.load;
  p.storage.load = async (...a) => { loads++; return t0.call(p.storage, ...a); };
  rowUnopenable(counting, liveRow);
  p.storage.load = t0;
  ok(loads === 0, 'rowUnopenable performed a storage read', loads);

  // 6. totality — hostile rows.
  const hostile = [
    { id: 'x' }, { id: 'x', startDate: null, endDate: null },
    { id: 'x', startDate: 1, endDate: 2 }, { id: 'x', startDate: {}, endDate: [] },
    { id: 'x', startDate: '2026-08-07', endDate: '2026-08-22' },
  ];
  let threwOnHostile = null;
  for (const h of hostile) {
    try { rowUnopenable(store.getState(), h); } catch (e) { threwOnHostile = `${JSON.stringify(h)}: ${e.message}`; }
  }
  ok(threwOnHostile === null, 'rowUnopenable is not total over hostile rows', threwOnHostile);
}

// ===========================================================================
head('B — the carry, driven through every transition that spreads initialState()');
{
  const p = mkPorts();
  const store = createStore({ ports: p });
  const a = (await store.createTrip(INIT('A'))).doc.id;
  await store.flush(); await store.closeTrip();
  const b = (await store.createTrip(INIT('B'))).doc.id;
  await store.flush(); await store.closeTrip();

  await poison(p, a, (o) => { o.days[3].date = '2026-02-30'; });
  try { await store.openTrip(a); } catch { /* recorded */ }
  const has = () => store.getState().openFailures.some((f) => f.id === a);
  ok(has(), 'openTrip did not record');

  // createTrip
  await store.createTrip(INIT('C'));
  ok(has(), 'createTrip DROPPED openFailures');
  await store.flush();
  // closeTrip
  await store.closeTrip();
  ok(has(), 'closeTrip DROPPED openFailures');
  // openTrip (a DIFFERENT, healthy trip)
  await store.openTrip(b);
  ok(has(), 'openTrip(other) DROPPED openFailures');
  await store.closeTrip();
  // importDoc
  const exported = await store.exportStoredDoc(b);
  await store.importDoc(exported);
  ok(has(), 'importDoc DROPPED openFailures');
  await store.flush();
  await store.closeTrip();
  // adoptTrip (the sample path)
  const sample = core.toJSON(core.fromJSON(exported));
  try {
    await store.adoptTrip(core.fromJSON(sample));
    ok(has(), 'adoptTrip DROPPED openFailures');
    await store.flush(); await store.closeTrip();
  } catch (e) { note(`adoptTrip not driven: ${e.message}`); }
  // deleteTrip of an UNRELATED trip
  await store.deleteTrip(b);
  ok(has(), 'deleteTrip(other) DROPPED openFailures for a different id');
  // deleteTrip of the failing trip — must clear
  await store.deleteTrip(a);
  ok(!has(), 'deleteTrip(a) did NOT clear a\'s openFailure');
}

// ===========================================================================
head('C — the clear sites, and the one A-47 says must not exist');
{
  const p = mkPorts();
  const store = createStore({ ports: p });
  const id = (await store.createTrip(INIT())).doc.id;
  await store.flush(); await store.closeTrip();
  const good = (await p.storage.load(id)).doc;

  await poison(p, id, (o) => { o.days[3].date = '2026-02-30'; });
  try { await store.openTrip(id); } catch { /* */ }
  ok(store.getState().openFailures.length === 1, 'not recorded');

  // Repair the bytes behind the app's back, then open again: the clear must be automatic.
  p.storage.docs.set(id, good);
  await store.openTrip(id);
  ok(store.getState().openFailures.length === 0,
     'a successful open did NOT clear the id — R26-2 all over again', store.getState().openFailures);

  // The failing entry must be replaced, never accumulated.
  await store.closeTrip();
  await poison(p, id, (o) => { o.days[3].date = '2026-02-30'; });
  for (let i = 0; i < 5; i++) { try { await store.openTrip(id); } catch { /* */ } }
  ok(store.getState().openFailures.length === 1,
     'repeated failures accumulate entries for one id', store.getState().openFailures.length);

  // `stored === null` is NOT recorded (A-47 Part 2: an absent document has no bytes to rescue).
  const before = store.getState().openFailures.length;
  try { await store.openTrip('no-such-trip'); } catch { /* */ }
  ok(store.getState().openFailures.length === before,
     'a MISSING document was recorded as an open failure', store.getState().openFailures);
}

// ===========================================================================
head('D — browseTrip: the failure path the builder did not drive');
{
  const p = mkPorts();
  const store = createStore({ ports: p });
  const host = (await store.createTrip(INIT('Host'))).doc.id;
  await store.flush(); await store.closeTrip();
  const guest = (await store.createTrip(INIT('Guest'))).doc.id;
  await store.flush(); await store.closeTrip();

  await store.openTrip(host);
  await poison(p, guest, (o) => { o.days[3].date = '2026-02-30'; });

  let e = null;
  try { await store.browseTrip(guest); } catch (err) { e = err; }
  ok(e !== null, 'browseTrip did not throw on an unopenable document');
  ok(store.getState().openFailures.some((f) => f.id === guest),
     'browseTrip did not record F-D', store.getState().openFailures);
  ok(store.getState().doc !== null && store.getState().doc.id === host,
     'a failed browse disturbed the OPEN document', store.getState().doc && store.getState().doc.id);
  ok(store.getState().browsing === null,
     'a failed browse installed something in `browsing`', store.getState().browsing);

  // A successful browse of the SAME id after repair clears it.
  const grec = await p.storage.load(guest);
  const fixed = JSON.parse(grec.doc); fixed.days[3].date = '2026-08-10';
  p.storage.docs.set(guest, JSON.stringify(fixed));
  await store.browseTrip(guest);
  ok(!store.getState().openFailures.some((f) => f.id === guest),
     'a successful browse did NOT clear the id');
  ok(store.getState().doc !== null && store.getState().doc.id === host,
     'a successful browse replaced the open document');
}

// ===========================================================================
head('E — exportStoredDoc\'s precondition, both arms');
{
  const p = mkPorts();
  const store = createStore({ ports: p });
  const a = (await store.createTrip(INIT('A'))).doc.id;
  await store.flush(); await store.closeTrip();
  const b = (await store.createTrip(INIT('B'))).doc.id;
  await store.flush();
  // b is ACTIVE here.
  ok(store.getState().activeTripId === b, 'setup: b is not active');

  let refused = null;
  try { await store.exportStoredDoc(b); } catch (err) { refused = err.message; }
  ok(refused !== null, 'exportStoredDoc did NOT refuse the active trip');
  ok(refused && refused.includes('exportActive()'), 'the refusal does not name exportActive()', refused);
  ok(p.file.exported.length === 0, 'the refused export still wrote a file', p.file.exported.length);

  // the NON-throw arm, with a trip open.
  const bytes = await store.exportStoredDoc(a);
  ok(typeof bytes === 'string' && bytes.length > 0, 'exportStoredDoc refused a non-active trip');
  ok(store.getState().activeTripId === b, 'exportStoredDoc moved activeTripId');
  ok(store.getState().doc !== null && store.getState().doc.id === b, 'exportStoredDoc disturbed the open doc');

  // …and with NOTHING open, activeTripId is null: no id may accidentally equal it.
  await store.closeTrip();
  ok(store.getState().activeTripId === null, 'closeTrip left activeTripId set');
  const bytes2 = await store.exportStoredDoc(a);
  ok(bytes2 === bytes, 'the same stored document exported differently with nothing open');
  let miss = null;
  try { await store.exportStoredDoc('nope'); } catch (err) { miss = err.message; }
  ok(miss !== null && miss.includes('nothing is stored'), 'an unknown id no longer reports honestly', miss);
}

// ===========================================================================
head('F — concurrency and hostile shapes');
{
  const p = mkPorts();
  const store = createStore({ ports: p });
  const a = (await store.createTrip(INIT('A'))).doc.id;
  await store.flush(); await store.closeTrip();
  const b = (await store.createTrip(INIT('B'))).doc.id;
  await store.flush(); await store.closeTrip();
  await poison(p, a, (o) => { o.days[3].date = '2026-02-30'; });
  await poison(p, b, (o) => { o.days[2].date = '2026-04-31'; });

  // two failing opens raced
  const rs = await Promise.allSettled([store.openTrip(a), store.openTrip(b)]);
  note(`raced opens: ${rs.map((r) => r.status).join(', ')}`);
  const ids = store.getState().openFailures.map((f) => f.id).sort();
  ok(ids.length === 2 && ids[0] === a && ids[1] === b,
     'a raced pair of failing opens lost one of the two records', ids);

  // a non-Error throw from the storage port must not crash noteOpenFailure's message read
  const p2 = mkPorts();
  const store2 = createStore({ ports: p2 });
  const c = (await store2.createTrip(INIT('C'))).doc.id;
  await store2.flush(); await store2.closeTrip();
  p2.storage.docs.set(c, '{"not":"a trip"}');
  let e2 = null;
  try { await store2.openTrip(c); } catch (err) { e2 = err; }
  ok(e2 !== null, 'a structurally wrong document did not throw');
  ok(store2.getState().openFailures.length === 1, 'a structurally wrong document was not recorded');
  ok(typeof store2.getState().openFailures[0].message === 'string',
     'the recorded message is not a string', typeof store2.getState().openFailures[0].message);

  // openFailures survives dispatch/undo/redo/setUi on an unrelated open document
  const p3 = mkPorts();
  const store3 = createStore({ ports: p3 });
  const d = (await store3.createTrip(INIT('D'))).doc.id;
  await store3.flush(); await store3.closeTrip();
  const e3 = (await store3.createTrip(INIT('E'))).doc.id;
  await store3.flush(); await store3.closeTrip();
  await poison(p3, d, (o) => { o.days[1].date = '2026-02-30'; });
  try { await store3.openTrip(d); } catch { /* */ }
  await store3.openTrip(e3);
  store3.dispatch({ type: 'setTripMeta', patch: { title: 'Renamed' } });
  ok(store3.getState().openFailures.some((f) => f.id === d), 'dispatch dropped openFailures');
  store3.undo();
  ok(store3.getState().openFailures.some((f) => f.id === d), 'undo dropped openFailures');
  store3.redo();
  ok(store3.getState().openFailures.some((f) => f.id === d), 'redo dropped openFailures');
  store3.setUi({ activeTab: 'map' });
  ok(store3.getState().openFailures.some((f) => f.id === d), 'setUi dropped openFailures');
  ok(!JSON.stringify(store3.getState().history ?? {}).includes('openFailures'),
     'openFailures leaked into history');
  const dump = await store3.exportActive();
  ok(!dump.includes('openFailures'), 'openFailures leaked into an export');
}

// ===========================================================================
head('G — R35-1\'s exact repro, and the rescue copy byte for byte');
{
  const p = mkPorts();
  const store = createStore({ ports: p });
  const id = (await store.createTrip(INIT())).doc.id;
  await store.flush(); await store.closeTrip();

  await poison(p, id, (o) => { o.days[3].date = '2026-02-30'; });
  const stored = (await p.storage.load(id)).doc;
  const row0 = store.getState().library.find((r) => r.id === id);
  note(`before the tap: rowUnopenable=${rowUnopenable(store.getState(), row0)}`);
  ok(rowUnopenable(store.getState(), row0) === false,
     'A-47 Part 8 residue 1 is not what ships — the card is flagged BEFORE any open attempt');

  let banner = null;
  try { await store.openTrip(id); } catch (e) { banner = e.message; }
  const row1 = store.getState().library.find((r) => r.id === id);
  ok(rowUnopenable(store.getState(), row1) === true, 'after the tap the card is still not flagged');
  ok(banner.includes('$.days[3].date'), 'the banner does not name the failing JSON path', banner);

  const rescued = await store.exportStoredDoc(id);
  ok(rescued === stored, 'the rescue copy is NOT byte-identical to the stored bytes',
     { rescuedLen: rescued.length, storedLen: stored.length });
  ok(JSON.parse(rescued).days[3].date === '2026-02-30',
     'the rescue copy silently REPAIRED the malformed date', JSON.parse(rescued).days[3].date);
  let stillRefuses = false;
  try { core.fromJSON(rescued); } catch { stillRefuses = true; }
  ok(stillRefuses, 'the rescue copy now parses — it was re-serialised, not handed back raw');

  // The file the FilePort would have been handed, if any surface asked.
  note(`rescued ${rescued.length} bytes; stored ${stored.length} bytes`);
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}`);
process.exit(fails === 0 ? 0 : 1);
