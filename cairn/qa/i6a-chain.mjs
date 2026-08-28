/**
 * Round 27 — I-6a, part 2: **a RUNTIME backstop for §4.3, and therefore for KD-62.**
 *
 *   Run: node --experimental-strip-types qa/i6a-chain.mjs      (from cairn/)
 *
 * BUILD-NOTES **KD-62** discloses that `switch.test.ts`'s structural grep asserts *lexical*
 * position, so a write wrapped in a thunk created inside a `chainOntoSaving` callback and
 * invoked after it returns passes the grep while running off the chain — and that *"there is
 * no behavioural backstop, which I checked rather than hoped: under the thunk mutation the
 * whole client suite is 216 pass / 0 fail"*. The builder's conclusion is that closing the hole
 * *"needs dataflow analysis rather than a regex, which is an architect's call."*
 *
 * That conclusion is right about the **grep** and wrong about the **suite**. §4.3's property is
 * an ordering property, and an ordering property is observable at the port with no dataflow
 * analysis at all:
 *
 *   > **While one link of the serialization chain is parked inside a `ports.storage` mutation,
 *   > no other `ports.storage` mutation may reach the port.**
 *
 * That is what "the chain serializes writes" *means*, it is checkable from outside the store
 * with a wrapped `MemoryStorage` and no knowledge of the store's internals, and it is exactly
 * the property the thunk mutation breaks. `qa/i6a-kd62.sh` runs this file under that mutation
 * and watches it go red while the grep and the whole client suite stay green.
 *
 *   §1  a parked `refreshSummary` (the rescan's link) must block a concurrent `deleteTrip`
 *   §2  a parked `saveIfVersion` (the autosave link) must block a concurrent `deleteTrip`
 *   §3  a parked `delete` must block a concurrent rescan's `refreshSummary`
 *   §4  the control: with nothing parked, all three writes DO reach the port (so §1–§3 cannot
 *       be satisfied by a store that simply never writes)
 */
import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler, core,
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
  ids: sequentialIdPort(`c${++seq}-`), scheduler: immediateScheduler(),
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

/** The row a pre-I-6 build wrote: no `summaryVersion` field at all, so `needsRescan` selects it. */
const preI6Row = (doc) => ({
  id: doc.id, title: doc.title, startDate: doc.startDate, endDate: doc.endDate,
  datePrecision: doc.datePrecision, cityCount: doc.cities.length, dayCount: doc.days.length,
  stopCount: 0, poolCount: 0, revision: doc.revision,
});
async function seed(storage, doc) {
  const r = await storage.saveIfVersion(doc.id, null, core.toJSON(doc), preI6Row(doc));
  if (!r.ok) throw new Error(`seed ${doc.id} failed`);
}

/**
 * Wraps a `MemoryStorage`: every mutation is recorded in `calls` at the moment it REACHES the
 * port, and any of them can be parked. Deliberately knows nothing about the store — the whole
 * point is that this is checkable from outside.
 */
function watch(storage) {
  const calls = [];
  const parked = [];
  const gates = new Set();
  for (const name of ['saveIfVersion', 'refreshSummary', 'delete', 'load', 'listTrips']) {
    const orig = storage[name].bind(storage);
    storage[name] = async (...args) => {
      calls.push({ name, id: args[0] });
      if (gates.has(name)) await new Promise((res) => parked.push({ name, res }));
      return orig(...args);
    };
  }
  return {
    calls, parked,
    open: (n) => gates.add(n),
    close: (n) => gates.delete(n),
    releaseAll() { for (const p of parked.splice(0)) p.res(); },
    mutations: () => calls.filter((c) => c.name !== 'load' && c.name !== 'listTrips'),
    async waitFor(name, tries = 400) {
      for (let i = 0; i < tries; i++) {
        if (parked.some((p) => p.name === name)) return true;
        await new Promise((r) => setImmediate(r));
      }
      return false;
    },
  };
}

/** Lets every pending microtask AND macrotask settle, several times over. */
const settle = async (n = 30) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

// ---------------------------------------------------------------------------
head('§1 — a parked `refreshSummary` must block a concurrent `deleteTrip`');
{
  const storage = memoryStorage();
  const a = makeTrip('t-at', 'vienna');
  const b = makeTrip('t-hr', 'dubrovnik');
  await seed(storage, a);
  await seed(storage, b);
  const w = watch(storage);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();

  w.open('refreshSummary');
  const pass = store.rescanSummaries();
  ok(await w.waitFor('refreshSummary'), 'the rescan reached its write and is parked there');
  const parkedOn = w.parked[0]?.id;
  const other = parkedOn === 't-at' ? 't-hr' : 't-at';

  const before = w.mutations().length;
  const del = store.deleteTrip(other);
  await settle();
  const during = w.mutations().filter((c) => c.name === 'delete');
  ok(
    during.length === 0,
    `no \`delete\` reached the port while a \`refreshSummary\` link was parked (§4.3)`,
    { parkedOn, tried: other, sawAtPort: w.mutations().slice(before) },
  );

  w.close('refreshSummary');
  w.releaseAll();
  await settle();
  w.releaseAll();
  await pass;
  await del;
  ok(w.calls.some((c) => c.name === 'delete' && c.id === other), 'and the delete DID land once the link released');
  const ids = (await storage.listTrips()).map((r) => r.id);
  ok(!ids.includes(other) && ids.length === 1, 'storage ends with exactly the surviving trip', ids);
}

// ---------------------------------------------------------------------------
head('§2 — a parked `saveIfVersion` must block a concurrent `deleteTrip`');
{
  const storage = memoryStorage();
  const a = makeTrip('t-at', 'vienna');
  const b = makeTrip('t-hr', 'dubrovnik');
  await seed(storage, a);
  await seed(storage, b);
  const w = watch(storage);
  const store = createStore({ ports: ports(storage), autosave: false });
  await store.refreshLibrary();
  await store.openTrip('t-at');
  store.dispatch({ type: 'setTripMeta', patch: { title: 'edited' } });

  w.open('saveIfVersion');
  const flush = store.flush();
  ok(await w.waitFor('saveIfVersion'), 'the autosave reached its write and is parked there');

  const del = store.deleteTrip('t-hr');
  await settle();
  ok(
    w.mutations().filter((c) => c.name === 'delete').length === 0,
    'no `delete` reached the port while a `saveIfVersion` link was parked (§4.3)',
    w.mutations(),
  );

  w.close('saveIfVersion');
  w.releaseAll();
  await settle();
  w.releaseAll();
  await flush;
  await del;
  const ids = (await storage.listTrips()).map((r) => r.id);
  ok(ids.length === 1 && ids[0] === 't-at', 'storage ends with the edited trip only', ids);
}

// ---------------------------------------------------------------------------
head('§3 — a parked `delete` must block a concurrent rescan write');
{
  const storage = memoryStorage();
  const a = makeTrip('t-at', 'vienna');
  const b = makeTrip('t-hr', 'dubrovnik');
  await seed(storage, a);
  await seed(storage, b);
  const w = watch(storage);
  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();

  w.open('delete');
  const del = store.deleteTrip('t-hr');
  ok(await w.waitFor('delete'), 'the delete reached the port and is parked there');

  const pass = store.rescanSummaries();
  await settle();
  ok(
    w.mutations().filter((c) => c.name === 'refreshSummary').length === 0,
    'no `refreshSummary` reached the port while a `delete` link was parked (§4.3)',
    w.mutations(),
  );

  w.close('delete');
  w.releaseAll();
  await settle();
  w.releaseAll();
  await del;
  await pass;
  const rows = await storage.listTrips();
  ok(rows.length === 1 && rows[0].id === 't-at', 'storage ends with one row', rows.map((r) => r.id));
  ok(rows[0].summaryVersion === core.SUMMARY_VERSION, 'and it converged', rows[0].summaryVersion);
  ok(
    store.getState().library.map((r) => r.id).join() === 't-at',
    'the on-screen library has no ghost row (R26-1)',
    store.getState().library.map((r) => r.id),
  );
}

// ---------------------------------------------------------------------------
head('§4 — the control: with nothing parked, all three writes DO reach the port');
{
  const storage = memoryStorage();
  await seed(storage, makeTrip('t-at', 'vienna'));
  await seed(storage, makeTrip('t-hr', 'dubrovnik'));
  const w = watch(storage);
  const store = createStore({ ports: ports(storage), autosave: false });
  await store.refreshLibrary();
  await store.rescanSummaries();
  await store.openTrip('t-at');
  store.dispatch({ type: 'setTripMeta', patch: { title: 'x' } });
  await store.flush();
  await store.deleteTrip('t-hr');
  const names = new Set(w.mutations().map((c) => c.name));
  ok(names.has('refreshSummary'), 'refreshSummary was observed');
  ok(names.has('saveIfVersion'), 'saveIfVersion was observed');
  ok(names.has('delete'), 'delete was observed');
  note(`port mutations: ${w.mutations().map((c) => `${c.name}(${c.id})`).join(' ')}`);
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL`}`);
process.exit(fails === 0 ? 0 : 1);
