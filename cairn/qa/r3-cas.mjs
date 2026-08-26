/**
 * Round 3 — attacks on the NEW atomic compare-and-set save path (a746d75, R2-1).
 * Everything below is plain Node against the in-memory port.
 * Run: node qa/r3-cas.mjs   (from cairn/)
 *
 * A "FAIL" line means the probe found what it was looking for.
 */
const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');

const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');

let tabN = 0;
const mkPorts = (storage, sched, prefix) => ({
  storage: storage ?? mem.memoryStorage(),
  clock: mem.fixedClockPort('2026-08-25'),
  // Distinct per store, or two "tabs" mint the same trip id and the probe tests nothing.
  ids: mem.sequentialIdPort(prefix ?? `t${++tabN}-`),
  file: mem.memoryFile(),
  scheduler: sched ?? mem.immediateScheduler(),
});

/** A storage port whose saveIfVersion can be held open, so a real in-flight window exists. */
function latchable(base) {
  const gates = [];
  return {
    ...base,
    docs: base.docs,
    gates,
    /** Hold the next N saves open until released. */
    hold: false,
    async saveIfVersion(id, exp, doc, summary) {
      if (this.hold) {
        await new Promise((res) => gates.push(res));
      }
      return base.saveIfVersion(id, exp, doc, summary);
    },
    release() { const g = gates.splice(0); for (const r of g) r(); },
  };
}

const TRIP = (id, title = 'T') => ({
  title, startDate: '2026-08-07', endDate: '2026-08-09', id,
});

async function freshStore(storage, sched, prefix) {
  const p = mkPorts(storage, sched, prefix);
  const store = createStore({ ports: p });
  await store.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  return { store, p };
}

// ---------------------------------------------------------------------------
line('A. mergeWithStored replaces `saving` instead of chaining onto it');
// store.ts:266 and :288 both do `saving = (async () => ...)()` — an ASSIGNMENT, not
// `saving = saving.then(...)`. save() chains; mergeWithStored does not. So an autosave
// in flight and a merge can be issued concurrently from ONE store, which is exactly
// what the fix's own comment ("One store never races ITSELF") says cannot happen.
{
  const src = await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('../packages/client/src/store/store.ts', import.meta.url), 'utf8'));
  const assigns = [...src.matchAll(/^\s*saving = \(async/gm)].length;
  const chains = [...src.matchAll(/^\s*saving = saving/gm)].length;
  ok(`mergeWithStored chains onto the in-flight save (found ${assigns} bare assignments)`, assigns === 0);

  // And prove it behaviourally.
  const base = mem.memoryStorage();
  const storage = latchable(base);
  const { store } = await freshStore(storage);
  const id = store.getState().activeTripId;
  const dayId = store.getState().doc.days[0].id;

  // Put the store into 'conflict' by writing from a second store.
  const other = createStore({ ports: mkPorts(storage) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'OTHER' } });
  await other.flush();

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'MINE' } });
  await store.flush();
  ok('store is in conflict', store.getState().persistence.status === 'conflict',
     store.getState().persistence.status);

  // Now: keep typing (schedules + issues an autosave), then press "Merge and save"
  // in the same turn — the exact sequence a user produces.
  storage.hold = true;
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'MINE2' } });
  const auto = store.flush();               // in flight, held
  const merge = store.mergeWithStored();    // issued while `auto` is unsettled
  storage.hold = false;
  storage.release();
  await new Promise((r) => setTimeout(r, 5));
  storage.release();
  const [, mres] = await Promise.allSettled([auto, merge]);
  const st = store.getState().persistence;
  const stored = core.fromJSON(storage.docs.get(id));
  console.log('  merge outcome:', mres.status, '| status:', st.status,
              '| stored title:', stored.days[0].title,
              '| in-memory title:', store.getState().doc.days[0].title);
  ok('a merge issued while an autosave is in flight still settles clean',
     st.status === 'idle' && stored.days[0].title === 'MINE2',
     `status=${st.status} stored=${stored.days[0].title}`);
}

// ---------------------------------------------------------------------------
line('B. a save in flight for trip A, then openTrip(B): whose revision lands in persistence?');
{
  const base = mem.memoryStorage();
  const storage = latchable(base);
  const { store } = await freshStore(storage);
  const idA = store.getState().activeTripId;
  const dayA = store.getState().doc.days[0].id;

  // A second, unrelated trip, saved by a different store so it exists in storage
  // with a revision far from A's.
  const other = createStore({ ports: mkPorts(storage) });
  await other.createTrip({ title: 'B', startDate: '2026-09-01', endDate: '2026-09-03' });
  const idB = other.getState().activeTripId;
  for (let i = 0; i < 6; i++) other.dispatch({ type: 'setTripMeta', patch: { title: `B${i}` } });
  await other.flush();
  const revB = core.fromJSON(storage.docs.get(idB)).revision;

  storage.hold = true;
  store.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'A EDIT' } });
  const inflight = store.flush();          // held open
  // §4.2 rule 6a: openTrip now AWAITS the pending write before switching, so this probe
  // has to let the latch go while the switch is in flight rather than after it — holding
  // both open deadlocks the PROBE, not the app.
  const switching = store.openTrip(idB);   // user switches trips mid-save
  await new Promise((r) => setTimeout(r, 5));
  storage.hold = false; storage.release();
  await switching;
  const savedAfterOpen = store.getState().persistence.savedVersion;
  await inflight.catch(() => {});
  await new Promise((r) => setTimeout(r, 5));

  const st = store.getState();
  console.log(`  active=${st.activeTripId} (B=${idB}) savedVersion=${st.persistence.savedVersion}` +
              ` (B stored version=${storage.versions.get(idB)}, at openTrip=${savedAfterOpen}) status=${st.persistence.status}`);
  ok('persistence still describes the trip that is actually open',
     st.activeTripId === idB && st.persistence.savedVersion === storage.versions.get(idB),
     `savedVersion ${st.persistence.savedVersion} != B's ${storage.versions.get(idB)}`);
  ok('the store does not falsely claim B has unsaved work', !store.isDirty(),
     `doc.revision=${st.doc.revision} doc===savedDoc=${st.doc === st.persistence.savedDoc}`);
  ok('no bogus "edited elsewhere" conflict on a trip nobody else touched',
     st.persistence.status !== 'conflict', st.persistence.lastError ?? '');
}

// ---------------------------------------------------------------------------
line('C. a DEBOUNCED autosave for trip A fires after openTrip(B)');
{
  const storage = mem.memoryStorage();
  const sched = mem.manualScheduler();
  const { store } = await freshStore(storage, sched);
  const idA = store.getState().activeTripId;
  const dayA = store.getState().doc.days[0].id;

  const other = createStore({ ports: mkPorts(storage) });
  await other.createTrip({ title: 'B', startDate: '2026-09-01', endDate: '2026-09-03' });
  const idB = other.getState().activeTripId;

  store.dispatch({ type: 'setDayMeta', dayId: dayA, patch: { title: 'A UNSAVED EDIT' } });
  // The debounce has NOT fired. The user switches trips.
  await store.openTrip(idB);
  sched.runAll();                       // the pending autosave for A now runs
  await new Promise((r) => setTimeout(r, 10));

  const a = core.fromJSON(storage.docs.get(idA));
  ok("trip A's unsaved edit reached storage, or the user was told it did not",
     a.days[0].title === 'A UNSAVED EDIT',
     `stored A day title is "${a.days[0].title}" — the edit is gone and nothing said so`);
}

// ---------------------------------------------------------------------------
line('D. §2.2a: the fence no longer PARSES the record — a corrupt record still refuses');
{
  const storage = mem.memoryStorage();
  // A truncated / corrupt record already in storage under the id the store will mint.
  const store = createStore({ ports: mkPorts(storage, undefined, 'D-') });
  // A truncated record already sits under the id `createTrip` is about to mint.
  storage.docs.set('D-trip-1', '{"id":"D-trip-1","revision":');   // corrupt / truncated
  storage.summaries.set('D-trip-1', { id: 'D-trip-1', title: 'PRECIOUS', startDate: '2026-01-01', endDate: '2026-01-02', cityCount: 0, dayCount: 2, stopCount: 0, poolCount: 0, revision: 3 });
  const before = storage.docs.get('D-trip-1');
  await store.createTrip({ title: 'New', startDate: '2026-08-07', endDate: '2026-08-09' });
  const after = storage.docs.get('D-trip-1');
  console.log('  stored before:', JSON.stringify(before).slice(0, 40));
  console.log('  stored after :', JSON.stringify(after).slice(0, 60));
  ok('a corrupt record is NOT silently overwritten by an expect-absent write',
     before === after, 'expectedVersion null compared EQUAL to a corrupt record');

  // Direct port-level statement of the same thing.
  const s2 = mem.memoryStorage();
  s2.docs.set('x', 'not json at all');
  const out = await s2.saveIfVersion('x', null, '{"id":"x","revision":0}', { id: 'x', title: 'x', startDate: '2026-01-01', endDate: '2026-01-01', cityCount: 0, dayCount: 1, stopCount: 0, poolCount: 0, revision: 0 });
  ok('saveIfVersion(id, null, ...) refuses when SOMETHING is stored under id', out.ok === false,
     `it returned ok:${out.ok} and clobbered the record`);
}

// ---------------------------------------------------------------------------
line('E. delete-and-recreate: a coincidentally equal revision passes the compare');
{
  const storage = mem.memoryStorage();
  const a = createStore({ ports: mkPorts(storage) });
  await a.createTrip({ title: 'Shared trip', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = a.getState().activeTripId;
  const dayId = a.getState().doc.days[0].id;
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'A' } });
  await a.flush();
  const revAtAgreement = a.getState().doc.revision;
  const versionAtAgreement = a.getState().persistence.savedVersion;

  // Tab B deletes the trip and restores a DIFFERENT document under the same id, which
  // importDoc permits once the id is free. Its revision happens to match.
  const b = createStore({ ports: mkPorts(storage) });
  await b.openTrip(id);
  await b.deleteTrip(id);
  const restored = { ...core.fromJSON(core.toJSON(a.getState().doc)) };
  restored.days = restored.days.map((d, i) => (i === 0 ? { ...d, title: 'RESTORED FROM BACKUP' } : d));
  await b.importDoc(core.toJSON({ ...restored, revision: revAtAgreement }));
  const idAfter = b.getState().activeTripId;
  console.log('  restored under id:', idAfter, '(original', id + ')',
              'revision', core.fromJSON(storage.docs.get(idAfter)).revision);

  // Tab A, which never noticed, autosaves its own edit.
  a.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'A LATER' } });
  await a.flush();
  const now = core.fromJSON(storage.docs.get(id));
  console.log('  A status:', a.getState().persistence.status, '| stored day title:', now.days[0].title);
  ok("tab B's restored document was not silently replaced by tab A's stale lineage",
     now.days[0].title === 'RESTORED FROM BACKUP' || a.getState().persistence.status === 'conflict',
     'revision equality alone let a different document pass the compare');
}

// ---------------------------------------------------------------------------
line('F. rapid-fire dispatches while a save is in flight');
{
  const base = mem.memoryStorage();
  const storage = latchable(base);
  const { store } = await freshStore(storage);
  const id = store.getState().activeTripId;
  const dayId = store.getState().doc.days[0].id;

  storage.hold = true;
  const f1 = store.flush();
  for (let i = 0; i < 20; i++) store.dispatch({ type: 'setDayMeta', dayId, patch: { title: `E${i}` } });
  storage.hold = false; storage.release();
  await f1;
  await store.flush();
  await new Promise((r) => setTimeout(r, 20));
  const stored = core.fromJSON(storage.docs.get(id));
  const st = store.getState();
  console.log('  status:', st.persistence.status, '| stored:', stored.days[0].title,
              '| memory:', st.doc.days[0].title, '| dirty:', store.isDirty());
  ok('the last edit is what is stored, and the store is settled',
     stored.days[0].title === 'E19' && st.persistence.status === 'idle' && !store.isDirty(),
     `stored=${stored.days[0].title} status=${st.persistence.status} dirty=${store.isDirty()}`);
}

// ---------------------------------------------------------------------------
line('G. storage failure mid-chain: does the queue recover?');
{
  const storage = mem.memoryStorage();
  const sched = mem.manualScheduler();
  const { store } = await freshStore(storage, sched);
  const dayId = store.getState().doc.days[0].id;
  const id = store.getState().activeTripId;

  storage.failNextSave = 'disk on fire';
  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'DURING FAILURE' } });
  await store.flush();
  ok("a failing save is 'error'", store.getState().persistence.status === 'error',
     store.getState().persistence.status);

  store.dispatch({ type: 'setDayMeta', dayId, patch: { title: 'AFTER FAILURE' } });
  await store.flush();
  const stored = core.fromJSON(storage.docs.get(id));
  console.log('  status:', store.getState().persistence.status, '| stored:', stored.days[0].title);
  ok('the next save recovers and stores the edit',
     store.getState().persistence.status === 'idle' && stored.days[0].title === 'AFTER FAILURE',
     `status=${store.getState().persistence.status} stored=${stored.days[0].title}`);
}

// ---------------------------------------------------------------------------
line('H. three-way race: three tabs at one revision');
{
  const storage = mem.memoryStorage();
  const seed = createStore({ ports: mkPorts(storage) });
  await seed.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = seed.getState().activeTripId;
  const dayId = seed.getState().doc.days[0].id;

  const tabs = [];
  for (const n of ['A', 'B', 'C']) {
    const s = createStore({ ports: mkPorts(storage) });
    await s.openTrip(id);
    s.dispatch({ type: 'setDayMeta', dayId, patch: { title: `TAB ${n}` } });
    tabs.push({ n, s });
  }
  await Promise.all(tabs.map((t) => t.s.flush()));
  const stored = core.fromJSON(storage.docs.get(id));
  const winners = tabs.filter((t) => stored.days[0].title === `TAB ${t.n}`);
  const told = tabs.filter((t) => t.s.getState().persistence.status === 'conflict');
  console.log('  stored:', stored.days[0].title, '| winners:', winners.map((w) => w.n).join(',') || 'none',
              '| told:', told.map((t) => t.n).join(',') || 'none');
  ok('exactly one winner and two losers, all told', winners.length === 1 && told.length === 2,
     `${winners.length} winner(s), ${told.length} told`);
}

// ---------------------------------------------------------------------------
line('I. a save issued BEFORE openTrip finishes');
{
  const storage = mem.memoryStorage();
  const seed = createStore({ ports: mkPorts(storage) });
  await seed.createTrip({ title: 'Seed', startDate: '2026-08-07', endDate: '2026-08-09' });
  const id = seed.getState().activeTripId;
  seed.dispatch({ type: 'setTripMeta', patch: { title: 'SEED SAVED' } });
  await seed.flush();

  const store = createStore({ ports: mkPorts(storage) });
  await store.createTrip({ title: 'Local', startDate: '2026-08-07', endDate: '2026-08-09' });
  const localId = store.getState().activeTripId;
  store.dispatch({ type: 'setTripMeta', patch: { title: 'LOCAL EDIT' } });
  // Issue the save and the open in the same turn, without awaiting the save.
  const p1 = store.flush();
  const p2 = store.openTrip(id);
  await Promise.allSettled([p1, p2]);
  await new Promise((r) => setTimeout(r, 10));
  const st = store.getState();
  const seedDoc = core.fromJSON(storage.docs.get(id));
  const localDoc = storage.docs.get(localId) ? core.fromJSON(storage.docs.get(localId)) : null;
  console.log('  active:', st.activeTripId, '| seed title now:', seedDoc.title,
              '| local title stored:', localDoc?.title, '| status:', st.persistence.status);
  ok('the seed trip was not overwritten by the other trip\'s in-flight save',
     seedDoc.title === 'SEED SAVED', `seed is now "${seedDoc.title}"`);
  ok('the open trip is described by persistence',
     !store.isDirty() || st.persistence.status !== 'idle',
     `doc===savedDoc=${st.doc === st.persistence.savedDoc} doc.revision=${st.doc.revision} status=${st.persistence.status}`);
}

console.log('');
