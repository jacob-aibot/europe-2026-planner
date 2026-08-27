/**
 * Round 7 — independent attack on the R3-3 fix (`chainOntoSaving`, `32a3839`).
 *
 * Not the builder's tests, and not `qa/r3-merge.mjs` re-run. Every section here asks a
 * question the two committed `merge-race.test.ts` cases do not:
 *
 *   §1  a THREE-way pile-up from ONE store: debounced autosave + explicit flush() +
 *       mergeWithStored(), all issued inside one latch. Concurrency is measured AT THE PORT
 *       (max simultaneous writers), the ORDER is recorded, and every issued write is
 *       accounted for as landed-or-refused — none silently dropped.
 *   §2  a genuine THIRD WRITER landing while the merge sits in the now-serialized queue:
 *       is the refusal still surfaced, or did serializing swallow it?
 *   §3  `.catch(() => {})` — one queued write REJECTS. Does the next one still run, and is
 *       its own outcome reported for itself rather than swallowed too?
 *   §4  the same, for a rejection raised from the merge branch's own work.
 *   §5  R5-1's drain loop (`flushForTransition`) x the chain: `await save(); await saving;`
 *       when something else chains on mid-flush.
 *   §6  LATENCY — how much longer does `mergeWithStored()` await now, and what is on screen
 *       for that whole window?
 *   §7  the "Merge and save" button pressed twice (no disabled state in App.tsx:96).
 *   §8  the deleted-trip branch, queued behind a write that resurrects the trip.
 *
 * Run: node qa/r7-chain.mjs   (from cairn/)
 * A FAIL line means the probe found what it was looking for.
 */
const fs = await import('node:fs');
const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');

let fails = 0;
const ok = (n, c, x = '') => {
  if (!c) fails++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
};
const line = (s) => console.log('\n== ' + s + ' ==');
const tick = () => new Promise((r) => setImmediate(r));
const settle = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };
const indicator = (s) => {
  const { status } = s.getState().persistence;
  if (status === 'conflict') return 'Not saved — edited elsewhere';
  if (status === 'error') return 'Not saved — retry';
  if (status === 'saving') return 'Saving…';
  return s.isDirty() ? 'Unsaved changes' : 'Saved';
};

let n = 0;
const mkPorts = (storage, sched) => ({
  storage,
  clock: mem.fixedClockPort('2026-08-25'),
  ids: mem.sequentialIdPort(`r7${++n}-`),
  file: mem.memoryFile(),
  scheduler: sched,
});

/**
 * A storage port that (a) can park every `saveIfVersion` on a latch, (b) counts how many
 * calls are inside it AT ONCE, and (c) records the order and outcome of every write.
 */
function instrument(storage) {
  const st = { inFlight: 0, maxInFlight: 0, log: [], gates: [], hold: false, calls: 0 };
  const port = {
    ...storage,
    docs: storage.docs,
    async saveIfVersion(id, expected, json, summary) {
      const seq = ++st.calls;
      st.inFlight++;
      st.maxInFlight = Math.max(st.maxInFlight, st.inFlight);
      try {
        if (st.hold) await new Promise((r) => st.gates.push(r));
        const out = await storage.saveIfVersion(id, expected, json, summary);
        st.log.push({ seq, ok: out.ok, title: JSON.parse(json).days?.[0]?.title });
        return out;
      } finally {
        st.inFlight--;
      }
    },
  };
  st.release = async () => {
    for (let i = 0; i < 8; i++) {
      st.hold = false;
      for (const g of st.gates.splice(0)) g();
      await settle(4);
    }
  };
  return { port, st };
}

const newTrip = async (store, title = 'T') => {
  await store.createTrip({ title, startDate: '2026-08-07', endDate: '2026-08-09' });
  const s = store.getState();
  return { id: s.activeTripId, d1: s.doc.days[0].id, d2: s.doc.days[1].id, d3: s.doc.days[2].id };
};

// ---------------------------------------------------------------------------
line('static: `saving = ` appears exactly once, at chainOntoSaving');
{
  const src = fs.readFileSync(new URL('../packages/client/src/store/store.ts', import.meta.url), 'utf8');
  // Statement position only — `^\s*saving = `. A doc comment quoting the old form is not an
  // assignment, and neither is the `let saving` declaration.
  const hits = [];
  src.split('\n').forEach((l, i) => {
    if (/^\s*saving\s*=\s/.test(l)) hits.push(`${i + 1}: ${l.trim()}`);
  });
  hits.forEach((h) => console.log('  store.ts:' + h));
  ok('exactly one assignment to `saving`', hits.length === 1, `${hits.length} found`);
  ok('and it is `saving = run` inside chainOntoSaving', /saving = run;$/.test(hits[0] ?? ''), hits[0]);
  // REPAIRED, Phase 2 I-0. Two faults, both in the counting rather than in the product:
  //   (1) `/chainOntoSaving\(/g` also matched the *doc comment* at store.ts:106 that names the
  //       function in prose, so the count was one too high from the day the comment was written;
  //   (2) the expected value was hardcoded at 3, and `deleteTrip` legitimately became a fourth
  //       call site when QA R7-3 put the delete ON the chain (store.ts:971). The probe therefore
  //       reported FAIL for a change that is the fix to a finding it itself filed.
  // The claim worth asserting is not "there are exactly N" but "every call site is a call, and
  // the declaration is the only non-call", so the count is derived and printed, and the
  // assertion is the structural one: at least the three write paths plus the delete link.
  const callSites = [];
  src.split('\n').forEach((l, i) => {
    if (/(?:^|[^\w.])(?:await\s+|return\s+)?chainOntoSaving\(/.test(l) && !/^\s*\*/.test(l) && !/function chainOntoSaving/.test(l)) {
      callSites.push(`${i + 1}: ${l.trim()}`);
    }
  });
  callSites.forEach((h) => console.log('  store.ts:' + h));
  ok('every chainOntoSaving call site is a statement, not a comment', callSites.length >= 3, `${callSites.length} call sites`);
}

// ---------------------------------------------------------------------------
line('§1 three-way pile-up: debounced autosave + flush() + mergeWithStored, one store');
{
  const storage = mem.memoryStorage();
  const { port, st } = instrument(storage);
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(port, sched) });
  const { id, d1, d2, d3 } = await newTrip(store);

  // Another tab moves storage on so this store is in 'conflict' and the merge is legitimate.
  const other = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: d2, patch: { title: 'OTHER-D2' } });
  await other.flush();

  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE-A' } });
  sched.runAll();
  await store.flush();
  ok('precondition: this tab is in conflict', store.getState().persistence.status === 'conflict',
     store.getState().persistence.status);

  // Now the pile-up. All three issued while the port is latched shut.
  st.hold = true;
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE-B' } });
  sched.runAll();                       // (1) debounced autosave fires -> parked at the latch
  const flushP = store.flush();         // (2) explicit flush
  await tick();
  store.dispatch({ type: 'setDayMeta', dayId: d3, patch: { title: 'MINE-C' } });
  const mergeP = store.mergeWithStored(); // (3) the button
  await settle(8);

  console.log(`  max writes in flight at the port: ${st.maxInFlight}`);
  ok('never more than ONE write in flight from one store', st.maxInFlight === 1, `max=${st.maxInFlight}`);

  await st.release();
  await Promise.allSettled([flushP, mergeP]);
  sched.runAll();
  await settle(8);
  await st.release();
  sched.runAll();
  await settle(8);

  console.log('  port call log: ' + st.log.map((l) => `#${l.seq}${l.ok ? '+' : '-'}(${l.title})`).join(' '));
  const stored = core.fromJSON(storage.docs.get(id).doc ?? storage.docs.get(id));
  const s = store.getState();
  console.log(`  stored: d1=${stored.days[0].title} d2=${stored.days[1].title} d3=${stored.days[2].title}`);
  console.log(`  status=${s.persistence.status} indicator="${indicator(store)}" dirty=${store.isDirty()}`);

  ok('the merge landed: BOTH tabs\' edits survive', stored.days[1].title === 'OTHER-D2',
     `d2=${stored.days[1].title}`);
  ok('this tab\'s latest edit on d1 survives', stored.days[0].title === 'MINE-B',
     `d1=${stored.days[0].title}`);
  ok('the edit dispatched DURING the pile-up (d3) is not silently dropped',
     stored.days[2].title === 'MINE-C' || store.isDirty(),
     `stored d3=${stored.days[2].title} dirty=${store.isDirty()}`);
  ok('the store settles clean, indicator agrees with storage',
     (s.persistence.status === 'idle') === !store.isDirty(),
     `status=${s.persistence.status} dirty=${store.isDirty()}`);
  // Informational: refusals of stale autosaves against the other tab's write are CORRECT in
  // this scenario. What matters is the line above — the store converges and the indicator
  // agrees. Printed so a future round can see the shape change.
  console.log(`  (refusals: ${st.log.filter((l) => !l.ok).length} of ${st.log.length} port calls — expected, the pre-merge autosaves)`);
}

// ---------------------------------------------------------------------------
line('§2 a genuine THIRD writer lands while the merge waits in the serialized queue');
{
  const storage = mem.memoryStorage();
  const { port, st } = instrument(storage);
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(port, sched) });
  const { id, d1, d2 } = await newTrip(store);

  const other = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: d2, patch: { title: 'OTHER-1' } });
  await other.flush();

  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE-A' } });
  sched.runAll();
  await store.flush();
  ok('precondition: conflict', store.getState().persistence.status === 'conflict');

  st.hold = true;
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE-B' } });
  sched.runAll();                        // autosave parked (will be refused: stale expectation)
  const mergeP = store.mergeWithStored();  // loads stored@V2, then queues behind the autosave
  await settle(6);

  // While the merge sits in the queue, a THIRD writer (the other tab) moves storage again.
  other.dispatch({ type: 'setDayMeta', dayId: d2, patch: { title: 'OTHER-2' } });
  await other.flush();
  console.log('  third writer landed while the merge was queued');

  await st.release();
  await mergeP.catch((e) => console.log('  merge rejected: ' + e.message.slice(0, 60)));
  await settle(6);

  const s = store.getState();
  const stored = core.fromJSON(storage.docs.get(id).doc ?? storage.docs.get(id));
  console.log('  port call log: ' + st.log.map((l) => `#${l.seq}${l.ok ? '+' : '-'}`).join(' '));
  console.log(`  status=${s.persistence.status} indicator="${indicator(store)}" dirty=${store.isDirty()}`);
  console.log(`  stored d1=${stored.days[0].title} d2=${stored.days[1].title}`);

  ok('the third writer\'s work was NOT clobbered', stored.days[1].title === 'OTHER-2',
     `d2=${stored.days[1].title}`);
  ok('the refusal IS surfaced — serializing did not swallow it',
     s.persistence.status === 'conflict',
     `status=${s.persistence.status}`);
  ok('the in-memory edit is still held', store.getState().doc.days[0].title === 'MINE-B');
  ok('the indicator does not say Saved over an unwritten edit',
     !(indicator(store) === 'Saved' && stored.days[0].title !== 'MINE-B'),
     `indicator="${indicator(store)}" stored d1=${stored.days[0].title}`);
}

// ---------------------------------------------------------------------------
line('§3 a queued write REJECTS — does the next one still run and report for itself?');
{
  // `attemptSave` catches storage errors, so to make a chained link genuinely REJECT we make
  // `set()` throw: a subscriber that throws propagates out of `emit()` -> `set()` ->
  // attemptSave's pre-try `set({status:'saving'})`. That is the one un-caught statement on
  // the write path, and it is exactly what `.catch(() => {})` claims to contain.
  const storage = mem.memoryStorage();
  const { port, st } = instrument(storage);
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(port, sched) });
  const { id, d1 } = await newTrip(store);

  // Fire on the Nth transition into 'saving' — that is `attemptSave`'s opening set(), the one
  // statement on the write path outside a try. Link 1's already fired by the time we queue,
  // so target 3 = the THIRD queued link (p2's).
  let savingSeen = 0;
  let target = Infinity;
  const unsub = store.subscribe((s) => {
    if (s.persistence.status !== 'saving') return;
    savingSeen++;
    if (savingSeen === target) { target = Infinity; throw new Error('BOOM from a subscriber'); }
  });

  st.hold = true;
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'FIRST' } });
  sched.runAll();
  await settle(2);
  console.log(`  link 1 parked; 'saving' transitions so far: ${savingSeen}`);
  target = savingSeen + 2;   // link 3's opening set('saving') throws
  // Handlers attached IMMEDIATELY — attaching them after `release()` would make the
  // rejection momentarily unhandled and that is the probe's bug, not the store's.
  const outcome = (p) => p.then(() => 'fulfilled', (e) => 'rejected:' + e.message);
  const p1 = outcome(store.flush());
  const p2 = outcome(store.flush());
  const p3 = outcome(store.flush());
  await st.release();
  const r = (await Promise.all([p1, p2, p3])).map((s) => ({ status: s.split(':')[0], why: s }));
  await settle(4);
  unsub();

  console.log('  outcomes: ' + r.map((x, i) => `p${i + 1}=${x.why}`).join(' '));
  console.log('  port call log: ' + st.log.map((l) => `#${l.seq}${l.ok ? '+' : '-'}(${l.title})`).join(' '));
  ok('the failing link reports its OWN failure (it rejects, not silently resolved)',
     r[1].status === 'rejected', `p2=${r[1].why}`);
  ok('a failed link does not poison the queue: the NEXT link still ran',
     r[2].status === 'fulfilled' && st.log.length >= 2,
     `p3=${r[2].status} port calls=${st.log.length}`);
  const stored = core.fromJSON(storage.docs.get(id).doc ?? storage.docs.get(id));
  ok('the edit reached storage despite the failed link', stored.days[0].title === 'FIRST',
     `stored=${stored.days[0].title}`);
  ok('the store is not wedged: a later save still works',
     await (async () => {
       store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'AFTER' } });
       await store.flush();
       const s2 = core.fromJSON(storage.docs.get(id).doc ?? storage.docs.get(id));
       return s2.days[0].title === 'AFTER' && store.getState().persistence.status === 'idle';
     })());
}

// ---------------------------------------------------------------------------
line('§3b the same rejection, but issued by the DEBOUNCE (`void save()`) — unhandled?');
{
  const storage = mem.memoryStorage();
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(storage, sched) });
  const { d1 } = await newTrip(store);
  const seen = [];
  const onUnhandled = (e) => seen.push(String(e && e.message));
  process.on('unhandledRejection', onUnhandled);

  let armed = false;
  const unsub = store.subscribe(() => { if (armed) { armed = false; throw new Error('BOOM in a subscriber'); } });
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'X' } });
  armed = true;
  sched.runAll();                 // the debounced `void save(...)` -> rejects, unhandled
  await settle(10);
  await new Promise((r) => setTimeout(r, 30));
  unsub();
  process.off('unhandledRejection', onUnhandled);
  console.log('  unhandledRejection events: ' + JSON.stringify(seen));
  ok('the debounced autosave path does not emit an unhandled rejection',
     seen.length === 0, seen.join(' | '));
}

// ---------------------------------------------------------------------------
line('§4 a rejection raised from the MERGE branch\'s own work');
{
  const storage = mem.memoryStorage();
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(storage, sched) });
  const { id, d1, d2 } = await newTrip(store);
  const other = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: d2, patch: { title: 'OTHER' } });
  await other.flush();
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE' } });
  sched.runAll();
  await store.flush();
  ok('precondition: conflict', store.getState().persistence.status === 'conflict');

  let armed = false;
  const unsub = store.subscribe(() => { if (armed) { armed = false; throw new Error('BOOM during merge'); } });
  armed = true;
  const res = await store.mergeWithStored().then(() => 'fulfilled', (e) => 'rejected: ' + e.message);
  unsub();
  await settle(4);
  console.log('  mergeWithStored() -> ' + res);
  console.log(`  status=${store.getState().persistence.status} indicator="${indicator(store)}"`);
  // Either outcome is defensible; what is NOT is a silent success over an unwritten merge.
  const stored = core.fromJSON(storage.docs.get(id).doc ?? storage.docs.get(id));
  const landed = stored.days[0].title === 'MINE' && stored.days[1].title === 'OTHER';
  ok('the merge either landed, or the caller was told it did not',
     landed || res.startsWith('rejected') || ['conflict', 'error'].includes(store.getState().persistence.status),
     `landed=${landed} res=${res} status=${store.getState().persistence.status}`);
  ok('the store is not left claiming Saved over an unmerged document',
     landed || indicator(store) !== 'Saved',
     `landed=${landed} indicator="${indicator(store)}"`);
  // and the chain is not wedged
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'AFTER-MERGE-FAIL' } });
  await store.flush().catch(() => {});
  await settle(4);
  ok('the chain still accepts writes afterwards',
     ['idle', 'conflict'].includes(store.getState().persistence.status),
     store.getState().persistence.status);
}

// ---------------------------------------------------------------------------
line('§5 flushForTransition (R5-1 drain loop) x the chain: `await save(); await saving;`');
{
  const storage = mem.memoryStorage();
  const { port, st } = instrument(storage);
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(port, sched) });
  const { id, d1 } = await newTrip(store, 'A');

  // Edit, then close the trip WHILE another write is chained on mid-flush.
  st.hold = true;
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'EDIT-1' } });
  sched.runAll();                     // autosave parked
  const closeP = store.closeTrip();   // flushForTransition -> save() chains behind it
  await settle(4);
  ok('one write in flight during the transition\'s own flush', st.maxInFlight === 1, `max=${st.maxInFlight}`);
  // A user edit lands mid-flush — R5-1's case, now through the chain.
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'EDIT-2' } });
  await st.release();
  sched.runAll();
  await settle(8);
  await st.release();
  await closeP;
  await settle(6);

  const stored = core.fromJSON(storage.docs.get(id).doc ?? storage.docs.get(id));
  console.log(`  stored d1=${stored.days[0].title}  active=${store.getState().activeTripId}  maxInFlight=${st.maxInFlight}`);
  console.log('  port call log: ' + st.log.map((l) => `#${l.seq}${l.ok ? '+' : '-'}(${l.title})`).join(' '));
  ok('the mid-flush edit reached storage before the trip was abandoned (R5-1 still closed)',
     stored.days[0].title === 'EDIT-2', `stored=${stored.days[0].title}`);
  ok('still never two writes in flight', st.maxInFlight === 1, `max=${st.maxInFlight}`);
}

// ---------------------------------------------------------------------------
line('§6 LATENCY: how much longer does mergeWithStored() await, and what is on screen?');
{
  const storage = mem.memoryStorage();
  const sched = mem.manualScheduler();
  // A port where every write takes a measurable 40 ms.
  const slow = {
    ...storage,
    docs: storage.docs,
    async saveIfVersion(...a) {
      await new Promise((r) => setTimeout(r, 40));
      return storage.saveIfVersion(...a);
    },
  };
  const store = createStore({ ports: mkPorts(slow, sched) });
  const { id, d1, d2 } = await newTrip(store);
  const other = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: d2, patch: { title: 'OTHER' } });
  await other.flush();
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE-A' } });
  sched.runAll();
  await store.flush();

  // Baseline: merge with nothing queued.
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE-B' } });
  let t0 = Date.now();
  await store.mergeWithStored().catch(() => {});
  const alone = Date.now() - t0;

  // Now: an autosave already in flight when the button is pressed.
  const other2 = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other2.openTrip(id);
  other2.dispatch({ type: 'setDayMeta', dayId: d2, patch: { title: 'OTHER-2' } });
  await other2.flush();
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE-C' } });
  sched.runAll();                       // autosave in flight (40 ms)
  await tick();
  const seen = new Set();
  const unsub = store.subscribe((s) => seen.add(s.persistence.status));
  t0 = Date.now();
  await store.mergeWithStored().catch(() => {});
  const queued = Date.now() - t0;
  unsub();

  console.log(`  mergeWithStored: alone=${alone} ms, queued behind one 40 ms write=${queued} ms`);
  console.log(`  statuses seen during the queued merge: ${[...seen].join(', ')}`);
  ok('a queued merge is slower than a lone one (serialization is real, and measurable)',
     queued > alone, `${queued} vs ${alone}`);
  ok('SOMETHING other than "conflict" is on screen for the whole wait (no silent hang)',
     seen.has('saving') || seen.has('idle'), [...seen].join(','));
  ok('the merge button has no in-flight guard in App.tsx (recorded, not asserted)',
     !/disabled=/.test(fs.readFileSync(new URL('../apps/web/src/App.tsx', import.meta.url), 'utf8')
       .split('\n').slice(92, 101).join('\n')) === true ? true : true,
     'see §7');
}

// ---------------------------------------------------------------------------
line('§7 "Merge and save" pressed twice — App.tsx:96 has no disabled/in-flight guard');
{
  const storage = mem.memoryStorage();
  const { port, st } = instrument(storage);
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(port, sched) });
  const { id, d1, d2 } = await newTrip(store);
  const other = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: d2, patch: { title: 'OTHER' } });
  await other.flush();
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE' } });
  sched.runAll();
  await store.flush();
  ok('precondition: conflict banner is up', store.getState().persistence.status === 'conflict');

  st.hold = true;
  const a = store.mergeWithStored();      // click
  const b = store.mergeWithStored();      // click again, before the first settles
  await settle(6);
  await st.release();
  const r = await Promise.allSettled([a, b]);
  await settle(6);

  const s = store.getState();
  const stored = core.fromJSON(storage.docs.get(id).doc ?? storage.docs.get(id));
  console.log('  port call log: ' + st.log.map((l) => `#${l.seq}${l.ok ? '+' : '-'}`).join(' '));
  console.log(`  outcomes: ${r.map((x) => x.status).join(', ')}`);
  console.log(`  status=${s.persistence.status} indicator="${indicator(store)}" dirty=${store.isDirty()}`);
  console.log(`  stored d1=${stored.days[0].title} d2=${stored.days[1].title}`);
  const merged = stored.days[0].title === 'MINE' && stored.days[1].title === 'OTHER';
  ok('the merge landed correctly', merged, `d1=${stored.days[0].title} d2=${stored.days[1].title}`);
  ok('the indicator does not lie: it says Saved over a fully-saved document',
     !(merged && !store.isDirty() && s.persistence.status === 'conflict'),
     `merged=${merged} dirty=${store.isDirty()} status=${s.persistence.status} indicator="${indicator(store)}"`);
  ok('never two writes in flight', st.maxInFlight === 1, `max=${st.maxInFlight}`);
}

// ---------------------------------------------------------------------------
line('§8 the deleted-trip branch, queued behind a write that resurrects the trip');
{
  const storage = mem.memoryStorage();
  const { port, st } = instrument(storage);
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(port, sched) });
  const { id, d1, d2 } = await newTrip(store);
  const other = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: d2, patch: { title: 'OTHER' } });
  await other.flush();
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE' } });
  sched.runAll();
  await store.flush();
  ok('precondition: conflict', store.getState().persistence.status === 'conflict');

  // The other tab now DELETES the trip.
  await other.deleteTrip(id);
  ok('the trip is gone from storage', !storage.docs.has(id));

  st.hold = true;
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE-2' } });
  sched.runAll();                            // autosave parked, will be refused (nothing stored)
  const mergeP = store.mergeWithStored();    // load() -> null -> the deleted-trip branch, queued
  await settle(6);
  ok('never two writes in flight in the deleted-trip branch', st.maxInFlight === 1, `max=${st.maxInFlight}`);
  await st.release();
  await mergeP.catch((e) => console.log('  merge rejected: ' + e.message.slice(0, 60)));
  await settle(6);

  const s = store.getState();
  const back = storage.docs.get(id);
  console.log('  port call log: ' + st.log.map((l) => `#${l.seq}${l.ok ? '+' : '-'}`).join(' '));
  console.log(`  status=${s.persistence.status} indicator="${indicator(store)}" restored=${!!back}`);
  ok('the user\'s document was written back after the delete (what the button promises)',
     !!back, `restored=${!!back}`);
  if (back) {
    const doc = core.fromJSON(back.doc ?? back);
    console.log(`  restored d1=${doc.days[0].title}`);
    ok('the restored document carries the latest in-memory edit',
       doc.days[0].title === 'MINE-2' || store.isDirty(),
       `restored d1=${doc.days[0].title} dirty=${store.isDirty()}`);
  }
  ok('the indicator agrees with storage',
     (s.persistence.status === 'idle') === !store.isDirty(),
     `status=${s.persistence.status} dirty=${store.isDirty()}`);
}

// ---------------------------------------------------------------------------
line('§9 NEW COUPLING: a write that never settles now blocks the merge button too');
{
  // Before `32a3839`, `mergeWithStored` did not queue, so a stalled autosave could not hold
  // it up. It queues now — correctly — but the chain has NO bound, where
  // `flushForTransition` has `FLUSH_MAX_ATTEMPTS`. What must still be true: nothing is lost
  // and nothing claims "Saved".
  const storage = mem.memoryStorage();
  const { port, st } = instrument(storage);
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(port, sched) });
  const { id, d1, d2 } = await newTrip(store);
  const other = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: d2, patch: { title: 'OTHER' } });
  await other.flush();
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE' } });
  sched.runAll();
  await store.flush();
  ok('precondition: conflict', store.getState().persistence.status === 'conflict');

  st.hold = true;                       // and never released
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE-2' } });
  sched.runAll();                       // autosave parked forever
  let settledFlag = false;
  const mergeP = store.mergeWithStored().then(() => { settledFlag = true; }, () => { settledFlag = true; });
  void mergeP;
  await new Promise((r) => setTimeout(r, 150));
  const s = store.getState();
  console.log(`  after 150 ms with the port stalled: merge settled=${settledFlag} status=${s.persistence.status} indicator="${indicator(store)}"`);
  ok('the merge does NOT resolve while an earlier write is stalled (serialization, by design)',
     settledFlag === false, `settled=${settledFlag}`);
  ok('and nothing on screen claims "Saved" while it waits',
     indicator(store) !== 'Saved', `indicator="${indicator(store)}"`);
  ok('the in-memory edit is still held — nothing was discarded',
     store.getState().doc.days[0].title === 'MINE-2');
  ok('a stalled chain has no timeout and no attempt bound (recorded: FLUSH_MAX_ATTEMPTS does not apply here)',
     true, 'observation only');
  // Release so the process can exit.
  await st.release();
}

// ---------------------------------------------------------------------------
line('§10 the one storage mutation that is NOT on the chain: deleteTrip -> ports.storage.delete');
{
  // `saveIfVersion` is reached from exactly one place (writeAndSettle, store.ts:225) and
  // writeAndSettle from exactly three, all inside chainOntoSaving. But `deleteTrip` calls
  // `ports.storage.delete(id)` directly (store.ts:618) and, for the ACTIVE trip, rule 6c says
  // it does NOT flush — it only cancels the timer, which cannot recall a write already issued.
  // The dangerous shape is the merge's DELETED-TRIP branch, whose expectation is `null`
  // (expect-absent): a queued expect-absent write landing after a delete would RESURRECT the
  // trip the user just destroyed.
  const storage = mem.memoryStorage();
  const { port, st } = instrument(storage);
  const sched = mem.manualScheduler();
  const store = createStore({ ports: mkPorts(port, sched) });
  const { id, d1, d2 } = await newTrip(store);
  const other = createStore({ ports: mkPorts(storage, mem.immediateScheduler()) });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: d2, patch: { title: 'OTHER' } });
  await other.flush();
  store.dispatch({ type: 'setDayMeta', dayId: d1, patch: { title: 'MINE' } });
  sched.runAll();
  await store.flush();
  ok('precondition: conflict', store.getState().persistence.status === 'conflict');
  await other.deleteTrip(id);
  ok('precondition: the trip is deleted in storage', !storage.docs.has(id));

  st.hold = true;
  const mergeP = store.mergeWithStored().catch(() => {});   // queues an EXPECT-ABSENT write
  await settle(6);
  // The user changes their mind and deletes the trip while that write is parked.
  const delP = store.deleteTrip(id);
  await settle(4);
  await st.release();
  await Promise.allSettled([mergeP, delP]);
  await settle(6);

  const resurrected = storage.docs.has(id);
  const inLibrary = store.getState().library.some((r) => r.id === id);
  console.log(`  after delete-during-parked-merge: in storage=${resurrected} in library=${inLibrary}` +
              ` active=${store.getState().activeTripId}`);
  // The real invariant: an explicit delete is not silently undone by a write already queued.
  ok('a trip the user deleted stays deleted (the queued expect-absent write does not resurrect it)',
     !resurrected && !inLibrary,
     `in storage=${resurrected} in library=${inLibrary} — deleteTrip does not await \`saving\`, so the` +
     ` parked merge write lands afterwards and writeAndSettle's upsertSummary puts the row back.` +
     ` NOT reachable from apps/web: the only Delete button is in Library.tsx:101, which renders` +
     ` only when state.doc === null, and a conflicted trip cannot be closed (R5-3)`);
}

// ---------------------------------------------------------------------------
line('§11 structural: no write path can reach storage without the chain');
{
  const src = fs.readFileSync(new URL('../packages/client/src/store/store.ts', import.meta.url), 'utf8');
  const saveIfVersionCalls = [...src.matchAll(/ports\.storage\.saveIfVersion\(/g)].length;
  const writeAndSettleCalls = [...src.matchAll(/await writeAndSettle\(/g)].length;
  // REPAIRED, Phase 2 I-0. `/ports\.storage\.delete\(/g` counted the two doc-comment mentions
  // at store.ts:956/960 as call sites, and the expectation was hardcoded at 1. Worse, the
  // *claim* is stale: R7-3 was fixed by putting the delete ON the chain (store.ts:971), so the
  // assertion "delete is NOT on the chain" now fails for the reason the finding was closed.
  // Statement position only, and the claim inverted to the one the product now makes.
  const deleteSites = [];
  src.split('\n').forEach((l, i) => {
    const code = l.replace(/^\s*(\/\/|\*).*$/, '');   // drop whole-line `//` and `*` comments
    if (/ports\.storage\.delete\(/.test(code)) deleteSites.push({ line: i + 1, text: l.trim() });
  });
  console.log(`  ports.storage.saveIfVersion call sites: ${saveIfVersionCalls}` +
              ` · writeAndSettle call sites: ${writeAndSettleCalls} · ports.storage.delete: ${deleteSites.length}`);
  deleteSites.forEach((d) => console.log(`  store.ts:${d.line}: ${d.text}`));
  ok('saveIfVersion has exactly ONE call site (inside writeAndSettle)', saveIfVersionCalls === 1,
     String(saveIfVersionCalls));
  ok('every writeAndSettle call site is inside a chainOntoSaving work function',
     writeAndSettleCalls === 3, `${writeAndSettleCalls} — check by hand if this moves`);
  ok('ports.storage.delete has exactly ONE call site', deleteSites.length === 1,
     `${deleteSites.length} call site(s)`);
  // §10's finding is closed: the delete is now a link of the chain ("drain, delete, forget").
  // Assert it by locating the nearest enclosing `chainOntoSaving(` above the call.
  const linesBefore = src.split('\n').slice(0, (deleteSites[0]?.line ?? 1) - 1);
  const nearestChain = linesBefore.map((l, i) => (/chainOntoSaving\(async/.test(l) ? i + 1 : 0)).filter(Boolean).pop() ?? 0;
  ok('and it is INSIDE a chainOntoSaving link (R7-3 closed — was "NOT on the chain")',
     nearestChain > 0 && (deleteSites[0].line - nearestChain) < 5,
     `nearest chainOntoSaving(async at ${nearestChain}, delete at ${deleteSites[0]?.line}`);
}

console.log(`\n== r7-chain: ${fails} FAIL ==\n`);
