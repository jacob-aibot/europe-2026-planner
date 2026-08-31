/**
 * QA round 35 — `store.exportStoredDoc` attacked in bare Node, past the nine tests the
 * builder wrote. ARCHITECTURE §2.9 **A-46** Part 4.
 *
 *   Run: node --experimental-strip-types qa/r35-store.mjs   (from cairn/)
 *
 *   A  Does the rescue export hand back **stale** bytes? A-46 says "no flush", so a document
 *      with an in-flight debounced write exports its previous version — measured, not argued.
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
  immediateScheduler, manualScheduler, core, rowDatesReadable, rowLifecycle,
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
head('A — stale bytes: the export explicitly does not flush');
{
  const sched = manualScheduler();
  const p = mkPorts(sched);
  const store = createStore({ ports: p });
  const s0 = await store.createTrip(INIT);
  const id = s0.doc.id;
  await store.flush();
  const before = (await p.storage.load(id)).doc;
  note('stored title before the edit: ' + JSON.parse(before).title);

  // An edit that debounces — nothing has landed in storage yet.
  store.dispatch({ type: 'setTripMeta', patch: { title: 'Renamed while the export runs' } });
  const pending = (await p.storage.load(id)).doc;
  note('stored title with the write still pending: ' + JSON.parse(pending).title);

  const exported = await store.exportStoredDoc(id);
  const exportedTitle = JSON.parse(exported).title;
  const inMemoryTitle = store.getState().doc.title;
  note(`in memory: ${JSON.stringify(inMemoryTitle)}  exported: ${JSON.stringify(exportedTitle)}`);
  ok(exportedTitle === inMemoryTitle,
     'the rescue export returns what the user is looking at, not a superseded copy',
     { inMemoryTitle, exportedTitle });
  // Whatever the answer, record whether the debounce is still pending afterwards.
  sched.runAll?.();
  await store.flush();
  note('after flush, stored title: ' + JSON.parse((await p.storage.load(id)).doc).title);
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
  let openErr = null;
  try { await store.openTrip(id); } catch (e) { openErr = e.message; }
  note('openTrip: ' + JSON.stringify(openErr));
  ok(openErr !== null, 'and the DOCUMENT will not open');
  ok(/days\[1\]\.date/.test(openErr ?? ''), 'the refusal names the field', openErr);
  // The store CAN rescue it; the question is whether any surface offers it.
  const rescued = await store.exportStoredDoc(id);
  ok(rescued === mangled, 'store.exportStoredDoc rescues it perfectly well — the gap is the SURFACE');
  note('so: `unreadableRow` is false for this row, and Library.tsx gates BOTH the rescue control');
  note('    and Delete\'s warning on `unreadableRow`. See qa/r35-render.mjs §A for the rendered proof.');
}

console.log(fails === 0 ? '\nALL CLEAR' : `\n${fails} FAIL(S)`);
process.exit(fails === 0 ? 0 : 1);
