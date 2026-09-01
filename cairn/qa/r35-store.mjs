/**
 * QA round 35 — `store.exportStoredDoc` attacked in bare Node, past the nine tests the
 * builder wrote. ARCHITECTURE §2.9 **A-46** Part 4.
 *
 *   Run: node --experimental-strip-types qa/r35-store.mjs   (from cairn/)
 *
 *   A  Does the rescue export hand back **stale** bytes? A-46 said "no flush", so a document
 *      with an in-flight debounced write exported its previous version — measured, not argued.
 *      **Re-pointed at revision 32 (§2.9 A-47 Part 5, ROADMAP I-8f).** The ruling is a
 *      *precondition*, not a flush: `exportStoredDoc(id)` now refuses `id === activeTripId` as a
 *      programmer error, because `exportActive()` is the correct export for the open document
 *      and, by construction, the active document parsed. So §A asserts the refusal instead of
 *      recording a FAIL, and it re-drives the staleness underneath it, on a trip that is NOT
 *      active, to show that "no flush" is intact.
 *   B  Can it be pointed at a trip other than the one whose card carried the control?
 *      (No ownership check is deliberate; no *identity* check is the question.)
 *   C  Does it survive a storage port that fails, and does it leak the failure sanely?
 *      Does it queue behind / interleave with the save chain?
 *   D  `rowDatesReadable` totality against hostile row shapes.
 *   E  The A-46 Part 7 residue 1 claim in the store layer: for a document whose ROW is
 *      readable but whose `days[n].date` is not, what does the client offer?
 *
 * A "FAIL" line means the probe found what it was looking for.
 */
import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort,
  immediateScheduler, manualScheduler, core, rowDatesReadable, rowLifecycle, rowUnopenable,
} from '../packages/client/src/index.ts';

let fails = 0;
const ok = (c, label, extra) => {
  if (c) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const TODAY = '2026-08-01';
const mkPorts = (scheduler = immediateScheduler()) => {
  const storage = memoryStorage();
  const file = memoryFile();
  return { storage, file, clock: fixedClockPort(TODAY), ids: sequentialIdPort(), scheduler };
};
const INIT = {
  title: 'Europe 2026', startDate: '2026-08-07', endDate: '2026-08-10',
  cities: [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }],
};

// ===========================================================================
head('A — A-47 Part 5: the active trip is REFUSED, and "no flush" survives underneath it');
{
  const sched = manualScheduler();
  const p = mkPorts(sched);
  const store = createStore({ ports: p });
  const s0 = await store.createTrip(INIT);
  const id = s0.doc.id;
  await store.flush();
  const before = (await p.storage.load(id)).doc;
  note('stored title before the edit: ' + JSON.parse(before).title);

  // An edit that debounces — nothing has landed in storage yet. This is R35-5's exact setup.
  store.dispatch({ type: 'setTripMeta', patch: { title: 'Renamed while the export runs' } });
  const pending = (await p.storage.load(id)).doc;
  note('stored title with the write still pending: ' + JSON.parse(pending).title);

  let refusal = null;
  try { await store.exportStoredDoc(id); } catch (e) { refusal = e.message; }
  note('refusal: ' + JSON.stringify(refusal));
  ok(refusal !== null, 'exportStoredDoc no longer refuses the active trip — R35-5 is reachable again');
  ok(refusal !== null && refusal.includes('exportActive()'),
     'the refusal does not name the export that IS correct for an open document', { refusal });
  ok(p.file.exported.length === 0, 'the refused export still handed bytes to the FilePort',
     p.file.exported.map((f) => f.name));

  sched.runAll?.();
  await store.flush();
  note('after flush, stored title: ' + JSON.parse((await p.storage.load(id)).doc).title);

  // …and the property A-47 declined to trade away: this is still a plain read with no flush.
  // Driven on a trip that is NOT active, which is the only shape the precondition now allows.
  await store.closeTrip();
  const other = (await store.createTrip({ ...INIT, title: 'Japan 2027' })).doc.id;
  await store.flush();
  const savesBefore = p.storage.saveCount;
  const rescued = await store.exportStoredDoc(id);
  ok(p.storage.saveCount === savesBefore, 'the rescue export queued behind / triggered the save chain',
     { savesBefore, after: p.storage.saveCount });
  ok(store.getState().activeTripId === other, 'the rescue export moved the active trip');
  ok(JSON.parse(rescued).id === id, 'the rescue export returned the wrong document');
}

// ===========================================================================
head('B — can it be pointed at a different trip than the one asked for?');
{
  const p = mkPorts();
  const store = createStore({ ports: p });
  const a = (await store.createTrip({ ...INIT, title: 'Trip A' })).doc.id;
  await store.flush(); await store.closeTrip();
  const b = (await store.createTrip({ ...INIT, title: 'Trip B' })).doc.id;
  await store.flush(); await store.closeTrip();
  await store.refreshLibrary();

  const textA = await store.exportStoredDoc(a);
  const textB = await store.exportStoredDoc(b);
  ok(JSON.parse(textA).id === a, 'exportStoredDoc(a) returns a', { got: JSON.parse(textA).id });
  ok(JSON.parse(textB).id === b, 'exportStoredDoc(b) returns b', { got: JSON.parse(textB).id });
  const names = p.file.exported.map((f) => f.name);
  note('filenames written: ' + JSON.stringify(names));
  ok(new Set(names).size === names.length,
     'two different trips get two different rescue filenames', names);

  // The title used in the filename comes from the LIBRARY ROW, not the document. Desync them.
  const lib = store.getState().library;
  note('library titles: ' + JSON.stringify(lib.map((r) => r.title)));
  const foreign = JSON.stringify({ ...JSON.parse(textA), ownerId: 'user:someone-else' });
  p.storage.docs.set(a, foreign);
  const textForeign = await store.exportStoredDoc(a);
  ok(textForeign === foreign,
     'a document owned by someone else exports without a check (A-46 Part 4, deliberate)');
  ok(core.LOCAL_OWNER !== 'user:someone-else', 'and LOCAL_OWNER is what makes that safe today');
  let refused = null;
  try { await store.importDoc(foreign); } catch (e) { refused = e.constructor.name; }
  ok(refused === 'ForeignDocumentError',
     'because importDoc is the only way in and it refuses a foreign owner', { refused });
}

// ===========================================================================
head('C — failure modes: storage that throws, and interleaving with the save chain');
{
  const p = mkPorts();
  const store = createStore({ ports: p });
  const id = (await store.createTrip(INIT)).doc.id;
  await store.flush(); await store.closeTrip(); await store.refreshLibrary();

  // C1 — the storage port throws mid-export.
  const realLoad = p.storage.load.bind(p.storage);
  p.storage.load = async () => { throw new Error('disk on fire'); };
  let err = null;
  try { await store.exportStoredDoc(id); } catch (e) { err = e.message; }
  p.storage.load = realLoad;
  note('storage failure surfaced as: ' + JSON.stringify(err));
  ok(err !== null, 'a storage failure rejects rather than exporting an empty file', { err });
  ok(store.getState().library.length === 1, 'and the library is intact afterwards');

  // C2 — the FilePort throws (a user cancelling a save dialog is this shape).
  const realExport = p.file.exportDoc.bind(p.file);
  p.file.exportDoc = async () => { throw new Error('user cancelled the save'); };
  let err2 = null;
  try { await store.exportStoredDoc(id); } catch (e) { err2 = e.message; }
  p.file.exportDoc = realExport;
  note('FilePort failure surfaced as: ' + JSON.stringify(err2));
  ok(err2 !== null, 'a FilePort failure rejects rather than silently succeeding', { err2 });
  ok(store.getState().persistence.status !== 'error',
     'and a failed EXPORT is not reported as a failed SAVE', store.getState().persistence);

  // C3 — an unknown id.
  let err3 = null;
  try { await store.exportStoredDoc('trip:does-not-exist'); } catch (e) { err3 = e.message; }
  ok(/nothing is stored/i.test(err3 ?? ''), 'an unknown id throws with a sane message', { err3 });
  ok(p.file.exported.filter((f) => f.name.includes('does-not-exist')).length === 0,
     'and writes no file');

  // C4 — an id that is not a string at all.
  for (const bad of [null, undefined, 0, {}, []]) {
    let threw = false;
    try { await store.exportStoredDoc(bad); } catch { threw = true; }
    ok(threw, `exportStoredDoc(${JSON.stringify(bad)}) refuses rather than exporting something`);
  }
}

// ===========================================================================
head('D — rowDatesReadable totality against hostile row shapes');
{
  const shapes = [
    { startDate: undefined, endDate: '2026-01-01' },
    { startDate: '2026-01-01', endDate: undefined },
    { startDate: null, endDate: null },
    { startDate: 20260101, endDate: 20260102 },
    { startDate: {}, endDate: [] },
    { startDate: { toString: () => '2026-01-01' }, endDate: '2026-01-01' },
    { startDate: '2026-01-01\n', endDate: '2026-01-01' },
    { startDate: ' 2026-01-01', endDate: '2026-01-01' },
    { startDate: '٢٠٢٦-٠١-٠١', endDate: '2026-01-01' },
    { startDate: '2026-02-30', endDate: '2026-03-05' },
    { startDate: '0000-02-29', endDate: '0000-03-01' },
    { startDate: '2026-01-01', endDate: '2026-01-01' },
  ];
  for (const s of shapes) {
    let v, threw = null;
    try { v = rowDatesReadable(s); } catch (e) { threw = e.message; }
    ok(threw === null && typeof v === 'boolean',
       `total on ${JSON.stringify(s, (k, x) => (typeof x === 'function' ? 'fn' : x))} -> ${v}`, threw);
  }
  ok(rowDatesReadable({ startDate: '2026-01-01', endDate: '2026-01-01' }) === true, 'a real pair is readable');
  ok(rowDatesReadable({ startDate: '2026-02-30', endDate: '2026-03-05' }) === false, '2026-02-30 is not');
  ok(rowDatesReadable({ startDate: '2026-09-01', endDate: 'not-a-date' }) === false,
     'R34-5 is discharged: the endDate blind spot is gone');
  ok(rowLifecycle({ startDate: '2026-09-01', endDate: 'not-a-date' }, TODAY) === 'planned',
     '(premise: rowLifecycle still says "planned" for it — A-44 unchanged)');
  // The containment claim A-46 Part 2 makes.
  const shapeInvalid = ['not-a-date', '', '2026-1-1', '20260101', '2026-01-01T00:00:00Z', 'x', '99999-01-01'];
  let contained = true;
  for (const s of shapeInvalid) {
    if (rowLifecycle({ startDate: s, endDate: '2026-01-01' }, TODAY) === null
        && rowDatesReadable({ startDate: s, endDate: '2026-01-01' }) !== false) contained = false;
  }
  ok(contained, 'rowDatesReadable strictly contains rowLifecycle(...) === null');
}

// ===========================================================================
head('E — the readable ROW / unopenable DOCUMENT population, at the client layer');
{
  const p = mkPorts();
  const store = createStore({ ports: p });
  const id = (await store.createTrip(INIT)).doc.id;
  await store.flush(); await store.closeTrip();
  // The realistic pre-A-45 record: a bad `days[n].date`, a perfectly good startDate/endDate.
  const doc = JSON.parse((await p.storage.load(id)).doc);
  doc.days[1].date = '2026-02-30';
  const mangled = JSON.stringify(doc);
  p.storage.docs.set(id, mangled);
  await store.refreshLibrary();

  const row = store.getState().library.find((r) => r.id === id);
  note('row dates: ' + JSON.stringify({ s: row.startDate, e: row.endDate }));
  ok(rowDatesReadable(row) === true, 'the ROW is readable — nothing on the card can know', row.startDate);
  // **A-47 Part 8 residue 1, the stated floor**: before anything tries to open it, the card is
  // honestly unflagged. Closing that would need a full-library parse at boot (refused, A-46
  // Part 2) or a durable flag (refused, A-47 Part 2 — a reader's inference that goes stale).
  ok(rowUnopenable(store.getState(), row) === false,
     'something claims to know this document will not open before anything has tried');
  let openErr = null;
  try { await store.openTrip(id); } catch (e) { openErr = e.message; }
  note('openTrip: ' + JSON.stringify(openErr));
  ok(openErr !== null, 'and the DOCUMENT will not open');
  ok(/days\[1\]\.date/.test(openErr ?? ''), 'the refusal names the field', openErr);
  // **A-47 Part 2/3, and the closure of R35-1**: the failure was recorded where it happened, so
  // immediately after the tap the same row is flagged — chip, rescue control and Delete's
  // warning all follow this one boolean.
  const after = store.getState();
  ok(after.openFailures.some((f) => f.id === id), 'the parse failure was not recorded', after.openFailures);
  ok(rowUnopenable(after, row) === true,
     'the card still looks healthy after the refusal — R35-1 unchanged');
  ok(rowDatesReadable(row) === true,
     'the narrow predicate widened, so the meta line would lose its proper label (R34-4 regression)');
  // The store CAN rescue it, and now the surface offers it.
  const rescued = await store.exportStoredDoc(id);
  ok(rescued === mangled, 'store.exportStoredDoc rescues it byte-perfectly');
  note('so: `rowUnopenable` is TRUE for this row after the tap and `rowDatesReadable` is still true —');
  note('    the two-gate split A-47 Part 4 rules. See qa/i8f-render.mjs for the rendered proof.');
}

console.log(fails === 0 ? '\nALL CLEAR' : `\n${fails} FAIL(S)`);
process.exit(fails === 0 ? 0 : 1);
