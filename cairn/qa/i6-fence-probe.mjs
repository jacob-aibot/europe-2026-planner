/**
 * Round 26 — the probe `qa/i6-fence.sh` runs inside its mutated worktree. **Do not run this
 * against the shipped tree** — against the shipped tree it passes trivially, which is the
 * point: it is the evidence that KD-57's refused option really does corrupt the write fence.
 *
 * Scenario, exactly as KD-57 describes it:
 *   - trip X (`t-at`) is the active document; the store holds X's fence
 *   - a background rescan brings trip Y (`t-hr`) — a row the store does NOT have open — up to
 *     the current `SUMMARY_VERSION`
 *   - under the mutation that write goes through `writeAndSettle(Y, Y, null, versionY)`
 *
 * A-7's guard is `if (!stillOurs && toWrite !== startedFrom)`. Here `stillOurs` is false
 * (`state.doc` is X, the write began from Y) but `toWrite === startedFrom` (both are Y), so
 * the guard does **not** fire and the fence advances to Y.
 */
import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler, core,
} from '../packages/client/src/index.ts';

let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const note = (s) => console.log(`  note  ${s}`);

const TODAY = '2026-08-01';
let seq = 0;
const ports = (storage) => ({
  storage, file: memoryFile(), clock: fixedClockPort(TODAY),
  ids: sequentialIdPort(`f${++seq}-`), scheduler: immediateScheduler(),
});
const CITY = {
  vienna: { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } },
  dubrovnik: { key: 'dubrovnik', name: 'Dubrovnik', countryCode: 'HR', centre: { lat: 42.6507, lng: 18.0944 } },
};
const makeTrip = (id, city) =>
  core.createTrip(
    { id, title: `Trip ${id}`, startDate: '2026-08-07', endDate: '2026-08-09', homeCurrency: 'EUR', cities: [CITY[city]] },
    { ids: core.sequentialIds(`${id}-`), now: TODAY, actorUserId: core.LOCAL_OWNER },
  );
const preI6Row = (doc) => ({
  id: doc.id, title: doc.title, startDate: doc.startDate, endDate: doc.endDate,
  datePrecision: doc.datePrecision, cityCount: doc.cities.length, dayCount: doc.days.length,
  stopCount: 0, poolCount: 0, revision: doc.revision,
});

const storage = memoryStorage();
const X = makeTrip('t-at', 'vienna');       // the ACTIVE trip
const Y = makeTrip('t-hr', 'dubrovnik');    // the trip the rescan rewrites
for (const d of [X, Y]) {
  const r = await storage.saveIfVersion(d.id, null, core.toJSON(d), preI6Row(d));
  if (!r.ok) throw new Error('seed failed');
}
// Bring X's row current so the pass only has Y left to do, and X is a settled active trip.
const store = createStore({ ports: ports(storage) });
await store.refreshLibrary();
await store.openTrip('t-at');
await store.dispatch({ type: 'setTripMeta', patch: { title: 'X, edited and saved' } });
await store.flush();

const before = store.getState();
const fenceBefore = before.persistence.savedVersion;
const versionX = storage.versions.get('t-at');
note(`before the rescan: state.doc = ${before.doc.id}, savedDoc = ${before.persistence.savedDoc.id}, savedVersion = ${fenceBefore}`);
note(`storage: t-at @ ${versionX}, t-hr @ ${storage.versions.get('t-hr')}`);
ok(fenceBefore === versionX, 'precondition: the fence is X\'s own version');

await store.rescanSummaries();

const after = store.getState();
const versionY = storage.versions.get('t-hr');
note(`after the rescan:  state.doc = ${after.doc.id}, savedDoc = ${after.persistence.savedDoc.id}, savedVersion = ${after.persistence.savedVersion}`);
note(`storage now: t-at @ ${storage.versions.get('t-at')}, t-hr @ ${versionY}`);

// --- the corruption itself ------------------------------------------------
ok(after.persistence.savedDoc.id === 't-at',
   'A-7 rule 4a: savedDoc is still about the ACTIVE document', after.persistence.savedDoc.id);
ok(after.persistence.savedVersion === storage.versions.get('t-at'),
   'A-7 rule 4a: savedVersion is the ACTIVE document\'s stored version',
   { fence: after.persistence.savedVersion, storedX: storage.versions.get('t-at'), storedY: versionY });
ok(after.persistence.savedVersion !== versionY,
   'the fence is NOT a version minted for trip Y', { fence: after.persistence.savedVersion, versionY });

// --- consequence 1: the store now believes it is dirty --------------------
note(`store reports dirty (doc !== savedDoc): ${after.doc !== after.persistence.savedDoc}`);
ok(after.doc === after.persistence.savedDoc,
   'the store does not spuriously believe it has an unwritten edit');

// --- consequence 2: the next keystroke -----------------------------------
await store.dispatch({ type: 'setTripMeta', patch: { title: 'X, typed again' } });
await store.flush();
const s2 = store.getState();
note(`after one more keystroke + flush: status = ${s2.persistence.status}`);
const storedX = core.fromJSON((await storage.load('t-at')).doc);
note(`t-at in storage now reads: ${JSON.stringify(storedX.title)}`);
ok(s2.persistence.status === 'idle', 'the next ordinary save is NOT spuriously refused', s2.persistence.status);
ok(storedX.title === 'X, typed again', 'and the user\'s edit reaches storage', storedX.title);

// --- consequence 3: the one KD-57 does not state -------------------------
// `savedDoc` is `doMerge`'s three-way ancestor (§2.2a, the Merge row + A-7's own argument).
// A fence pointing at trip Y means the next *Merge and save* on trip X computes
// mergeTrips(Y, X, remoteX) — an ancestor that is a DIFFERENT TRIP.
note('--- consequence 3: savedDoc is doMerge\'s three-way ancestor ---');
const ancestor = store.getState().persistence.savedDoc;
ok(ancestor.id === 't-at',
   'the merge ancestor for trip X is a document with trip X\'s id', ancestor.id);
if (ancestor.id !== 't-at') {
  const remote = core.fromJSON((await storage.load('t-at')).doc);
  try {
    const merged = core.mergeTrips(ancestor, store.getState().doc, remote);
    note(`mergeTrips(ancestorY, X, remoteX) -> id ${merged.trip.id}, ` +
         `${merged.trip.days.reduce((n, d) => n + d.stops.length, 0)} stops, ` +
         `cities ${JSON.stringify(merged.trip.cities.map((c) => c.key))}`);
    note(`report: ${JSON.stringify(merged.report).slice(0, 240)}`);
  } catch (e) {
    note(`mergeTrips(ancestorY, X, remoteX) THREW: ${e.constructor.name}: ${e.message}`);
    note('So the store is in `conflict`, the only offered escape is *Merge and save*, and that');
    note('button throws. The user has a banner, a dead button, and an edit only in memory.');
  }
}

console.log(`\n${fails === 0 ? 'ALL OK — the mutation did NOT corrupt the fence' : `${fails} FAIL(S) — KD-57's failure mode REPRODUCED`}`);
process.exitCode = 0;
