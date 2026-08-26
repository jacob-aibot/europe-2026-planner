/**
 * Round 5 — adversarial verification of `c3c79b3` (ARCHITECTURE §2.2b: the freshness rule).
 *
 * Round 4's blockers were R4-1 (`dirty()` compared `Trip.revision` against a saved counter, so
 * `flushForTransition` skipped a real write) and R4-2 (the storage port cached the `epoch` a
 * token was minted from). The architect's fix is §2.2b F1/F2/F3 plus two more instances of the
 * same error (`derived.ts`'s cache key, `DayMap.tsx`'s dependency array) plus the R2-11 ruling.
 *
 * This probe does NOT re-derive round 4's own criteria — `qa/r4-switch.mjs`, `r4-browser.mjs`
 * and `packages/client/test/dirty.test.ts` already do that, and re-running them is cheap. It
 * goes after what those do not cover:
 *
 *   §1  the dirty oracle over a walk that includes the transitions the builder's walk omits
 *       (`mergeWithStored`, `createTrip`, `importDoc`, `deleteTrip`, `syncResolutions`)
 *   §2  every way I can find to fool `flushForTransition`'s three-conjunct skip
 *   §3  the token mint: collision-adjacency, ordering, and whether anything compares two
 *       tokens for anything other than equality
 *   §4  the derived cache's new `(doc identity, today)` key — including whether `today` can
 *       itself go stale, and whether the cache can be handed out disagreeing with `state.doc`
 *   §5  the R2-11 ruling: `requireActor`, `accepted_by_non_member`, and the null-actor shape
 *
 * Run: node qa/r5-freshness.mjs   (from cairn/)
 */
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');

let fails = 0;
const ok = (n, c, x = '') => {
  if (!c) fails++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
};
const line = (s) => console.log('\n== ' + s + ' ==');
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const TODAY = '2026-08-26';

function newStore(opts = {}) {
  const storage = mem.memoryStorage();
  const ports = {
    storage,
    clock: mem.fixedClockPort(opts.today ?? TODAY),
    ids: mem.sequentialIdPort(opts.prefix ?? ''),
    file: mem.memoryFile(),
    ...(opts.scheduler ? { scheduler: opts.scheduler } : {}),
  };
  return { storage, ports, store: createStore({ ports, ...(opts.store ?? {}) }) };
}

const TRIP_INIT = {
  title: 'Walk trip',
  startDate: '2026-09-01',
  endDate: '2026-09-04',
  homeCurrency: 'EUR',
  cities: [{ key: 'lisbon', name: 'Lisbon', countryCode: 'PT', centre: { lat: 38.72, lng: -9.14 }, order: 0 }],
};

/** The expensive-but-exact oracle of §2.2b F2: bytes in memory vs bytes in the port. */
function oracleDirty(store, storage) {
  const st = store.getState();
  if (!st.doc) return false;
  const held = storage.docs.get(st.doc.id);
  return held === undefined ? true : core.toJSON(st.doc) !== held;
}

// =====================================================================================
line('1. the dirty oracle over the transitions the builder\'s 200-step walk does not visit');
// packages/client/test/dirty.test.ts walks dispatch/undo/redo/flush/closeTrip+openTrip.
// mergeWithStored, createTrip, importDoc, deleteTrip and syncResolutions all move `savedDoc`
// or `state.doc` and none of them are in that step set.
{
  const { storage, ports, store } = newStore({ prefix: 'w' });
  const steps = [];
  const check = (label) => {
    const got = store.isDirty();
    const want = oracleDirty(store, storage);
    steps.push({ label, got, want });
    return got === want;
  };

  await store.createTrip(TRIP_INIT);
  check('createTrip');
  const idA = store.getState().doc.id;

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'edit 1' } });
  check('dispatch');
  await store.flush();
  check('flush');

  // A second store over the SAME port — the other tab.
  const other = createStore({ ports });
  await other.openTrip(idA);
  other.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'other tab' } });
  await other.flush();
  check('after the other tab wrote');

  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-03', patch: { title: 'edit 2' } });
  check('local edit over a moved store');
  await store.flush(); // refused: conflict
  ok('the refused flush is a conflict', store.getState().persistence.status === 'conflict');
  check('after the refusal');

  await store.mergeWithStored();
  check('after mergeWithStored');
  ok('the merge landed', store.getState().persistence.status === 'idle',
    store.getState().persistence.status);
  ok('storage holds exactly what the store shows after the merge',
    storage.docs.get(idA) === core.toJSON(store.getState().doc));

  store.syncResolutions();
  check('after syncResolutions');

  await store.createTrip({ ...TRIP_INIT, title: 'Second' });
  check('createTrip over a clean store');
  const idB = store.getState().doc.id;
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'B edit' } });
  check('dirty on B');
  await store.deleteTrip(idA);
  check('after deleting the OTHER trip');
  ok('deleting the other trip flushed B first', storage.docs.get(idB) === core.toJSON(store.getState().doc));

  const backup = await store.exportActive();
  await store.importDoc(backup);
  check('after importDoc of a colliding id');

  // The oracle criterion is scoped to ONE store ("on one store over the in-memory port").
  // The moment a second writer moves storage, `isDirty()` — "have I got an unwritten edit" —
  // and the byte oracle — "does storage match my document" — are different questions, and
  // BUILD-NOTES §6 already discloses that half as "a passively stale tab still reads Saved".
  const passive = 'after the other tab wrote';
  const bad = steps.filter((s) => s.got !== s.want && s.label !== passive);
  ok(`isDirty() agrees with the byte oracle at ${steps.length - 1} single-writer checkpoints`, bad.length === 0,
    bad.map((b) => `${b.label}: isDirty=${b.got} oracle=${b.want}`).join('; '));
  const stale = steps.find((s) => s.label === passive);
  console.log(`    (the disclosed exception: at "${passive}" isDirty=${stale.got} while the bytes differ` +
    ' — a passively stale tab, BUILD-NOTES §6, not a regression)');
}

// =====================================================================================
line('2. can the three-conjunct skip in flushForTransition still be fooled?');

// 2.1 — the documented sequence, with the manual scheduler, for the record.
{
  const { storage, store } = newStore({ prefix: 'a' });
  await store.createTrip(TRIP_INIT);
  const id = store.getState().doc.id;
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'A' } });
  await store.flush();
  const r = store.getState().doc.revision;
  store.undo();
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'B' } });
  ok('precondition: the revision is back where it was', store.getState().doc.revision === r,
    `${store.getState().doc.revision} vs ${r}`);
  ok('precondition: the bytes differ from storage', core.toJSON(store.getState().doc) !== storage.docs.get(id));
  const docB = store.getState().doc;
  await store.closeTrip();
  ok('R4-1: closeTrip wrote edit B', storage.docs.get(id) === core.toJSON(docB));
}

// 2.2 — autosave disabled: no timer ever exists, so the skip rests on `doc === savedDoc` alone.
{
  const { storage, store } = newStore({ prefix: 'b', store: { autosave: false } });
  await store.createTrip(TRIP_INIT);
  const id = store.getState().doc.id;
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'no-autosave' } });
  const doc = store.getState().doc;
  ok('autosave off: the store still reports dirty', store.isDirty());
  await store.closeTrip();
  ok('autosave off: closeTrip still wrote the edit', storage.docs.get(id) === core.toJSON(doc),
    JSON.parse(storage.docs.get(id) ?? '{}').days?.[0]?.title);
}

// 2.3 — undo all the way back to the exact object storage holds.
{
  const { storage, store } = newStore({ prefix: 'c' });
  await store.createTrip(TRIP_INIT);
  const id = store.getState().doc.id;
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'A' } });
  await store.flush();
  const saved = store.getState().doc;
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'B' } });
  store.undo();
  ok('undo returns the identical object storage agreed about', store.getState().doc === saved);
  ok('and the store reports clean', store.isDirty() === false);
  ok('and the oracle agrees', core.toJSON(store.getState().doc) === storage.docs.get(id));
  await store.closeTrip();
  ok('the skip fired without losing anything', storage.docs.get(id) === core.toJSON(saved));
}

// 2.4 — THE TRAP: a store that is NOT dirty but IS in `conflict` can never leave the trip.
{
  const { storage, ports, store } = newStore({ prefix: 'd' });
  await store.createTrip(TRIP_INIT);
  const id = store.getState().doc.id;
  await store.flush();
  const clean = store.getState().doc;

  const other = createStore({ ports });
  await other.openTrip(id);
  other.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'theirs' } });
  await other.flush();

  await store.flush(); // unconditional — refused, though nothing local changed
  ok('the store is in conflict', store.getState().persistence.status === 'conflict');
  ok('...while holding no unwritten edit at all', store.isDirty() === false);
  ok('...and its document is byte-identical to nothing in storage (the other tab won)',
    storage.docs.get(id) !== core.toJSON(clean));

  const before = store.getState().activeTripId;
  await store.closeTrip();
  const stuck = store.getState().activeTripId === before;
  ok('closeTrip is refused even though there is nothing to lose', !stuck,
    stuck ? 'the trip cannot be closed and the button does nothing — R5-2' : '');
  if (stuck) {
    await store.openTrip(id).catch(() => {});
    ok('...and openTrip is refused too', store.getState().activeTripId !== before,
      store.getState().activeTripId === before ? 'still stuck on the same trip' : '');
    await store.deleteTrip(id);
    ok('...deleteTrip of the active trip is the one way out (rule 6c)',
      store.getState().activeTripId === null);
  }
}

// 2.5 — a store in `error` (not conflict) with nothing dirty: does it self-heal?
{
  const { storage, store } = newStore({ prefix: 'e' });
  await store.createTrip(TRIP_INIT);
  const id = store.getState().doc.id;
  storage.failNextSave = 'disk on fire';
  await store.flush();
  ok('the failed flush is an error', store.getState().persistence.status === 'error');
  const doc = store.getState().doc;
  await store.closeTrip();
  ok('closeTrip retried the write and succeeded', storage.docs.get(id) === core.toJSON(doc));
  ok('and the transition happened', store.getState().activeTripId === null);
}

// 2.6 — openTrip onto the trip that is ALREADY active, while dirty.
{
  const { storage, store } = newStore({ prefix: 'f' });
  await store.createTrip(TRIP_INIT);
  const id = store.getState().doc.id;
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'self-open' } });
  const doc = store.getState().doc;
  await store.openTrip(id);
  ok('re-opening the active trip flushed the edit first', storage.docs.get(id) === core.toJSON(doc));
  ok('and the reloaded document carries it',
    store.getState().doc.days[0].title === 'self-open', store.getState().doc.days[0].title);
  ok('and the store is clean afterwards', store.isDirty() === false);
}

// 2.7 — adoptTrip onto an id storage already holds: it flushes, then calls openTrip, which
//       flushes again. Two flushes, one edit.
{
  const { storage, store } = newStore({ prefix: 'g' });
  await store.createTrip(TRIP_INIT);
  const id = store.getState().doc.id;
  await store.flush();
  const stored = core.fromJSON(storage.docs.get(id));
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'pending' } });
  const doc = store.getState().doc;
  const before = storage.saveCount;
  await store.adoptTrip(stored);
  ok('adoptTrip onto a stored id kept the pending edit', storage.docs.get(id) === core.toJSON(doc));
  ok('and did not double-write', storage.saveCount - before <= 2, `${storage.saveCount - before} writes`);
}

// =====================================================================================
line('3. the token mint — collisions, ordering, and what compares two tokens');

// 3.1 — the in-memory port across instances (ROADMAP F, part 1's revision-4 extension).
{
  const seen = new Set();
  let dup = null;
  for (let cycle = 0; cycle < 200; cycle++) {
    const s = mem.memoryStorage();
    for (let i = 0; i < 5; i++) {
      const r = await s.saveIfVersion('t', i === 0 ? null : [...seen].pop() && s.versions.get('t'), '{}', {});
      if (r.ok) {
        if (seen.has(r.version)) dup = r.version;
        seen.add(r.version);
      }
    }
    await s.delete('t');
    const r = await s.saveIfVersion('t', null, '{}', {});
    if (r.ok) {
      if (seen.has(r.version)) dup = r.version;
      seen.add(r.version);
    }
  }
  ok(`${seen.size} tokens across 200 memory-port instances, zero repeats`, dup === null, dup ?? '');
}

// 3.2 — the apps/web mint, replicated byte for byte from the shipped source, under a CSPRNG.
{
  const src = read('apps/web/src/ports/storage.ts');
  const body = src.slice(src.indexOf('function mintVersion'), src.indexOf('export function indexedDbStorage'));
  ok('the mint takes no argument and reads no closure variable',
    /function mintVersion\(\): StorageVersion \{/.test(body) &&
      !/\bepoch\b/.test(body) && !/counter/.test(body));
  ok('no Date.now(), no Math.random(), no randomUUID on the mint path',
    !/Date\.now|Math\.random|randomUUID/.test(body));
  ok('it throws rather than degrading when there is no CSPRNG', /throw new Error\(/.test(body));

  // Same construction, run 300k times inside one millisecond-dense loop: a time-derived or
  // counter-derived token would collide here; 128 fresh bits cannot.
  const mint = () => {
    const bytes = webcrypto.getRandomValues(new Uint8Array(16));
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return Buffer.from(s, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const t0 = Date.now();
  const pool = new Set();
  let n = 0;
  for (; n < 300000; n++) pool.add(mint());
  ok(`300k mints in ${Date.now() - t0} ms, zero collisions`, pool.size === n, `${n - pool.size} repeats`);
  ok('every token is 22 chars of base64url (128 bits, no padding, no truncation)',
    [...pool].slice(0, 5000).every((t) => t.length === 22 && /^[A-Za-z0-9_-]{22}$/.test(t)));
}

// 3.3 — opacity: nothing above the port does anything to a token but compare it for equality.
{
  const files = [
    'packages/client/src/store/store.ts',
    'packages/client/src/store/reducer.ts',
    'packages/client/src/store/actions.ts',
    'packages/client/src/store/derived.ts',
    'apps/web/src/store.ts',
  ];
  const offenders = [];
  for (const f of files) {
    for (const [i, raw] of read(f).split('\n').entries()) {
      const l = raw.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
      if (!/version/i.test(l)) continue;
      if (/(savedVersion|storedVersion|\bversion\b)\s*(<|>|<=|>=|\+|-(?!-)|\.localeCompare|\.split|\.slice|\.parse)/.test(l)) {
        offenders.push(`${f}:${i + 1}: ${l.trim()}`);
      }
      if (/JSON\.parse\([^)]*[Vv]ersion/.test(l) || /Number\([^)]*[Vv]ersion/.test(l) || /parseInt\([^)]*[Vv]ersion/.test(l)) {
        offenders.push(`${f}:${i + 1}: ${l.trim()}`);
      }
    }
  }
  ok('no ordering, arithmetic or parsing of a StorageVersion above the port', offenders.length === 0,
    offenders.join(' | '));
  ok('revisionOf() no longer exists anywhere',
    !/revisionOf/.test(read('packages/client/src/ports/types.ts') + read('packages/client/src/store/store.ts')));
}

// 3.4 — no StorageVersion literal in a test, golden or fixture (§2.2a rule 3's ceiling).
{
  const { execSync } = await import('node:child_process');
  const hits = execSync(
    `grep -rEn "['\\"][0-9]+\\.[0-9]+['\\"]" packages/client/test packages/core/test test fixtures/golden 2>/dev/null | grep -iE "version" || true`,
    { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' },
  ).trim();
  ok('no test or fixture pins a minted token literal', hits === '', hits.split('\n').slice(0, 3).join(' | '));
}

// =====================================================================================
line('4. the derived cache — identity, the clock, and whether it can be handed out stale');
{
  const { derivedFor, computeDerived } = await import('../packages/client/src/store/derived.ts');
  const { trip } = loadEurope2026();

  const c1 = derivedFor(null, trip, '2026-08-01');
  ok('a fresh cache is computed', c1 !== null && c1.doc === trip && c1.today === '2026-08-01');
  ok('the same document and date reuse it by identity', derivedFor(c1, trip, '2026-08-01') === c1);
  ok('the clock moving invalidates it', derivedFor(c1, trip, '2026-08-02') !== c1);
  ok('the cache carries no revision field', !('revision' in c1) && !('tripId' in c1));

  // A different document that wears the SAME revision — R4-1's shape, applied to the cache.
  const twin = { ...trip, title: 'A DIFFERENT DOCUMENT' };
  ok('same revision, different object: the cache is NOT reused',
    derivedFor(c1, twin, '2026-08-01') !== c1 && twin.revision === trip.revision);

  // Two different trips at the same revision: `tripId` left the key, so identity has to carry it.
  const otherTrip = { ...trip, id: 'trip:other', title: 'Other' };
  const c2 = derivedFor(c1, otherTrip, '2026-08-01');
  ok('a different trip at the same revision recomputes', c2 !== c1 && c2.doc === otherTrip);

  // Can `today` go stale? Every call site must pass a freshly-read clock.
  const storeSrc = read('packages/client/src/store/store.ts');
  const callSites = [...storeSrc.matchAll(/derivedFor\([^)]*\)/g)].map((m) => m[0]);
  ok(`every derivedFor call site reads the clock inline (${callSites.length} sites)`,
    callSites.length > 0 && callSites.every((s) => s.includes('ports.clock.today()')),
    callSites.join(' | '));

  // And the store never hands out a cache whose `.doc` is not `state.doc`.
  const { storage, store } = newStore({ prefix: 'h' });
  await store.createTrip(TRIP_INIT);
  const bad = [];
  const probe = (label) => {
    const d = store.getDerived();
    if (d && d.doc !== store.getState().doc) bad.push(label);
  };
  probe('after createTrip');
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'x' } });
  probe('after dispatch');
  store.undo();
  probe('after undo');
  store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'y' } });
  probe('after undo + a different edit');
  store.redo();
  probe('after redo');
  await store.flush();
  probe('after flush');
  store.syncResolutions();
  probe('after syncResolutions');
  ok('getDerived() never returns a cache that disagrees with state.doc', bad.length === 0, bad.join(', '));
  void storage;
  void computeDerived;
}

// =====================================================================================
line('5. the R2-11 ruling — requireActor, accepted_by_non_member, and the null actor');

const ids = core.sequentialIds('r5');
const base = core.createTrip(
  {
    title: 'Mine',
    startDate: '2026-09-01',
    endDate: '2026-09-02',
    homeCurrency: 'EUR',
    cities: [{ key: 'lisbon', name: 'Lisbon', countryCode: 'PT', centre: { lat: 38.72, lng: -9.14 }, order: 0 }],
  },
  { ids, now: TODAY, actorUserId: core.LOCAL_OWNER },
);

// 5.1 — the throw, over the full ref matrix, with the trip and its revision unmoved.
{
  const withStop = core.addStop(
    base,
    { kind: 'scheduled', dayId: '2026-09-01', time: '10:00', order: 0 },
    { name: 'Belem', category: 'sight', place: { kind: 'none' } },
    { ids, now: TODAY, actorUserId: core.LOCAL_OWNER },
  );
  const stopId = withStop.days[0].stops[0].id;
  const refs = [
    { kind: 'day', id: '2026-09-01' },
    { kind: 'stop', id: stopId },
  ];
  const snapshot = core.toJSON(withStop);
  const rev0 = withStop.revision;
  let allThrew = true;
  let unmoved = true;
  for (const fn of ['acceptCandidate', 'rejectCandidate']) {
    for (const ref of refs) {
      for (const actor of [null, undefined, '']) {
        try {
          core[fn](withStop, ref, actor, TODAY);
          allThrew = false;
        } catch (e) {
          if (!(e instanceof TypeError)) allThrew = false;
        }
        if (core.toJSON(withStop) !== snapshot || withStop.revision !== rev0) unmoved = false;
      }
    }
  }
  ok('acceptCandidate/rejectCandidate throw TypeError on null/undefined/empty actor', allThrew);
  ok('the input trip is byte-identical and its revision has not moved after each throw', unmoved);

  let copyThrew = 0;
  for (const actor of [null, undefined, '']) {
    try {
      core.copyStopInto(base, { trip: withStop, stopId }, { kind: 'pool', cityKey: 'lisbon' },
        { ids, today: TODAY, actorUserId: actor });
    } catch (e) {
      if (e instanceof TypeError) copyThrew++;
    }
  }
  ok('copyStopInto throws on all three missing-actor shapes', copyThrew === 3, `${copyThrew}/3`);
}

// 5.2 — the injected fault ROADMAP §D names: a non-member actor.
const { trip: europe } = loadEurope2026();
{
  const refIssues = core.validateTrip(europe);
  const faulted = structuredClone(europe);
  const day = faulted.days.find((d) => d.stops.length > 0);
  const target = day.stops[0];
  target.provenance = {
    source: 'friend',
    state: 'accepted',
    confidence: 'asserted',
    origin: { friendUserId: 'user:marta', sourceTripId: 'trip:marta', sourceStopId: 'stop:1' },
    addedAt: TODAY,
    acceptedAt: TODAY,
    actorUserId: 'user:someone-else',
  };
  const after = core.validateTrip(faulted);
  const added = after.filter((i) => !refIssues.some((r) => r.code === i.code && r.ref.id === i.ref.id));
  ok('exactly one additional issue for a non-member actor', added.length === 1, JSON.stringify(added.map((a) => a.code)));
  ok('...and it is the error accepted_by_non_member on that stop',
    added[0]?.code === 'accepted_by_non_member' && added[0]?.level === 'error' && added[0]?.ref.id === target.id);
  ok('...carrying both the actor and the owner in params',
    added[0]?.params?.actorUserId === 'user:someone-else' && added[0]?.params?.ownerId === europe.ownerId);
  ok('displayStatus on the faulted record still returns own (by design)',
    core.displayStatus(target.provenance) === 'own');
}

// 5.3 — THE FINDING. The same shape with NO actor at all.
{
  const refIssues = core.validateTrip(europe);
  const results = [];
  for (const actor of [null, undefined, '']) {
    const faulted = structuredClone(europe);
    const day = faulted.days.find((d) => d.stops.length > 0);
    const target = day.stops[0];
    target.provenance = {
      source: 'friend',
      state: 'accepted',
      confidence: 'asserted',
      origin: { friendUserId: 'user:marta', sourceTripId: 'trip:marta', sourceStopId: 'stop:1' },
      addedAt: TODAY,
      acceptedAt: TODAY,
      actorUserId: actor,
    };
    const after = core.validateTrip(faulted);
    const added = after.filter((i) => !refIssues.some((r) => r.code === i.code && r.ref.id === i.ref.id));
    results.push({
      actor: actor === undefined ? 'undefined' : JSON.stringify(actor),
      added: added.map((a) => a.code),
      status: core.displayStatus(target.provenance),
      attributed: core.attribution(target.provenance) !== null,
    });
  }
  for (const r of results) {
    ok(`actorUserId=${r.actor}: validateTrip flags it`, r.added.includes('accepted_by_non_member'),
      `issues added: [${r.added.join(', ') || 'none'}] · displayStatus=${r.status} · attribution=${r.attributed}`);
  }
  console.log('    §2.14: displayStatus(r) !== \'own\' unless … actorUserId ∈ members(trip).');
  console.log('    null ∉ members(trip) for every trip, so the exception clause is not satisfied.');
}

// 5.4 — does the shape survive serialization? (i.e. can it arrive through restore-from-backup)
{
  const faulted = structuredClone(europe);
  const target = faulted.days.find((d) => d.stops.length > 0).stops[0];
  target.provenance = {
    source: 'friend', state: 'accepted', confidence: 'asserted',
    origin: { friendUserId: 'user:marta', sourceTripId: 'trip:marta', sourceStopId: 'stop:1' },
    addedAt: TODAY, acceptedAt: TODAY, actorUserId: null,
  };
  let round = null;
  let threw = null;
  try {
    round = core.fromJSON(core.toJSON(faulted));
  } catch (e) {
    threw = e.message;
  }
  ok('fromJSON REJECTS an accepted, credited record with no actor', threw !== null,
    threw ?? 'it parsed clean — the shape can be restored from a backup file');
  if (round) {
    const rt = round.days.find((d) => d.stops.length > 0).stops[0];
    console.log(`    round-tripped actorUserId: ${JSON.stringify(rt.provenance.actorUserId)}` +
      ` · displayStatus=${core.displayStatus(rt.provenance)}` +
      ` · attribution=${core.attribution(rt.provenance) !== null}` +
      ` · accepted_by_non_member issues=${core.validateTrip(round).filter((i) => i.code === 'accepted_by_non_member').length}`);
    // And through the client's restore path — importDoc only refuses a FOREIGN owner.
    const { storage, store } = newStore({ prefix: 'i' });
    let imported = null;
    try {
      await store.importDoc(core.toJSON({ ...faulted, ownerId: core.LOCAL_OWNER }));
      imported = store.getState().doc;
    } catch (e) {
      imported = e.message;
    }
    ok('store.importDoc refuses a backup carrying the shape', typeof imported === 'string',
      typeof imported === 'string' ? imported : 'it restored clean into the library and is now a live trip');
    void storage;
  }
}

// 5.5 — the public primitive behind acceptCandidate is still nullable and unchecked.
{
  const prov = {
    source: 'friend', state: 'candidate', confidence: 'asserted',
    origin: { friendUserId: 'user:marta', sourceTripId: 'trip:marta', sourceStopId: 'stop:1' },
    addedAt: TODAY, acceptedAt: null, actorUserId: 'local:self',
  };
  let made = null;
  try {
    made = core.accept(prov, TODAY, null);
  } catch {
    made = 'threw';
  }
  ok('core.accept(p, at, null) — the exported primitive — refuses a missing actor',
    made === 'threw',
    made === 'threw' ? '' : `it produced state=${made.state} actorUserId=${made.actorUserId}, displayStatus=${core.displayStatus(made)}`);
}

// 5.7 — is the shape really import-only? §2.14 says the invariant is enforced "at the two
//       places documents come from" — the throw at construction, and validateTrip. But
//       `addStop` copies `StopInit.provenance` verbatim and `accept()` is on the public export
//       surface with an unchecked `UserId | null`, so two public calls mint it outright.
{
  const prov = core.accept(
    core.friendImport(TODAY, { friendUserId: 'user:marta', sourceTripId: 'trip:marta', sourceStopId: 'stop:1' }),
    TODAY,
    null,
  );
  const next = core.addStop(
    base,
    { kind: 'scheduled', dayId: '2026-09-01', time: '10:00', order: 0 },
    { name: 'Marta’s cafe', category: 'food', place: { kind: 'none' }, provenance: prov },
    { ids, now: TODAY, actorUserId: core.LOCAL_OWNER },
  );
  const s = next.days[0].stops[0];
  const flagged = core.validateTrip(next).some((i) => i.code === 'accepted_by_non_member');
  ok('the shape cannot be minted through the public build API without a hand edit or an import',
    flagged || core.displayStatus(s.provenance) !== 'own',
    `core.addStop({provenance: core.accept(core.friendImport(...), at, null)}) → displayStatus=${core.displayStatus(s.provenance)}` +
    ` · needsBadge=${core.needsBadge(s.provenance)} · attribution=${core.attribution(s.provenance) !== null}` +
    ` · accepted_by_non_member=${flagged}`);

  const { store } = newStore({ prefix: 'j' });
  await store.createTrip(TRIP_INIT);
  store.dispatch({
    type: 'addStop',
    placement: { kind: 'scheduled', dayId: '2026-09-01', time: '10:00', order: 0 },
    stop: { name: 'Marta’s cafe', category: 'food', place: { kind: 'none' }, provenance: prov },
  });
  const st = store.getState().doc.days[0].stops[0];
  ok('...nor through the client store\'s own addStop action',
    core.validateTrip(store.getState().doc).some((i) => i.code === 'accepted_by_non_member') ||
      core.displayStatus(st.provenance) !== 'own',
    `store.dispatch({type:'addStop', stop:{provenance}}) → displayStatus=${core.displayStatus(st.provenance)}` +
    ` · actorUserId=${JSON.stringify(st.provenance.actorUserId)}`);
}

// 5.6 — the ceiling: does the unmodified reference trip contain any attributed record at all?
{
  const attributed = [];
  for (const d of europe.days) for (const s of d.stops) if (core.attribution(s.provenance)) attributed.push(s.id);
  for (const s of europe.pool) if (core.attribution(s.provenance)) attributed.push(s.id);
  for (const b of europe.bookings) if (core.attribution(b.provenance)) attributed.push(b.id);
  const nullActorAccepted = [];
  const walk = (p, id) => {
    if (p && p.state === 'accepted' && !p.actorUserId) nullActorAccepted.push(id);
  };
  for (const d of europe.days) { walk(d.provenance, d.id); for (const s of d.stops) walk(s.provenance, s.id); }
  for (const s of europe.pool) walk(s.provenance, s.id);
  for (const b of europe.bookings) walk(b.provenance, b.id);
  ok('the reference trip has no attributed records, so widening the rule to null cannot move its issue count',
    attributed.length === 0, `${attributed.length} attributed`);
  console.log(`    (${nullActorAccepted.length} accepted records with a null actor in the reference trip — all source:'user', all unattributed)`);
  ok('the reference trip reports zero accepted_by_non_member today',
    core.validateTrip(europe).every((i) => i.code !== 'accepted_by_non_member'));
}

// =====================================================================================
line('6. the eighth case — an edit dispatched WHILE the transition\'s own flush is in flight');
// §4.2 rule 6a: "a pending write is never outlived by its document". `flushForTransition`
// flushes once and then checks only `persistence.status`. If the user types while that write
// is awaiting IndexedDB, `writeAndSettle` sees `stillOurs === false`, sets `savedDoc` to the
// document it wrote (the OLD one), re-arms the 400 ms debounce for the NEW one — and the
// transition then proceeds anyway, because the status is `'idle'`. The re-armed timer fires
// after `state.doc` has been replaced or cleared and `attemptSave` drops it on the floor.
{
  /** A storage port whose saves park until released — the interleaving window, made explicit. */
  function gatedStorage() {
    const inner = mem.memoryStorage();
    let gate = null;
    return {
      inner,
      openGate() {
        let release;
        gate = new Promise((r) => { release = r; });
        return () => { const g = gate; gate = null; release(); return g; };
      },
      port: {
        ...inner,
        async saveIfVersion(id, expected, doc, summary) {
          if (gate) await gate;
          return inner.saveIfVersion(id, expected, doc, summary);
        },
        async load(id) { return inner.load(id); },
        async listTrips() { return inner.listTrips(); },
        async delete(id) { return inner.delete(id); },
      },
    };
  }

  // All six of §4.2 rule 6's transitions, by name — the ROADMAP closes the list at six and
  // requires each to be asserted individually.
  for (const transition of ['closeTrip', 'openTrip', 'createTrip', 'adoptTrip', 'importDoc', 'deleteTripOther', 'deleteTripActive']) {
    const g = gatedStorage();
    const ports = {
      storage: g.port,
      clock: mem.fixedClockPort(TODAY),
      ids: mem.sequentialIdPort(`x${transition}`),
      file: mem.memoryFile(),
    };
    const store = createStore({ ports, debounceMs: 20 });
    await store.createTrip(TRIP_INIT);
    const idA = store.getState().doc.id;
    await store.flush();
    await store.createTrip({ ...TRIP_INIT, title: 'Elsewhere' });
    const idB = store.getState().doc.id;
    await store.flush();
    await store.openTrip(idA);

    store.dispatch({ type: 'setDayMeta', dayId: '2026-09-01', patch: { title: 'edit ONE' } });
    await store.flush();

    // Edit TWO, then start the transition; the transition's flush parks inside the port.
    store.dispatch({ type: 'setDayMeta', dayId: '2026-09-02', patch: { title: 'edit TWO' } });
    const backup = core.toJSON({ ...core.fromJSON(g.inner.docs.get(idB)), id: `${idB}-restored` });
    const release = g.openGate();
    const moving =
      transition === 'closeTrip' ? store.closeTrip()
      : transition === 'openTrip' ? store.openTrip(idB)
      : transition === 'createTrip' ? store.createTrip({ ...TRIP_INIT, title: 'Third' })
      : transition === 'adoptTrip' ? store.adoptTrip(core.createTrip({ ...TRIP_INIT, title: 'Adopted' }, { ids: { newId: (k) => `${k}-adopted` }, now: TODAY, actorUserId: core.LOCAL_OWNER }))
      : transition === 'importDoc' ? store.importDoc(backup)
      : transition === 'deleteTripOther' ? store.deleteTrip(idB)
      : store.deleteTrip(idA);
    await new Promise((r) => setTimeout(r, 5));
    // Edit THREE lands while the transition's write is in flight — one keystroke.
    let dispatched = true;
    try {
      store.dispatch({ type: 'setDayMeta', dayId: '2026-09-03', patch: { title: 'edit THREE' } });
    } catch {
      dispatched = false;   // rule 6c cancels without writing and does not wait — expected
    }
    const three = store.getState().doc;
    release();
    await moving;
    // Let any re-armed debounce fire.
    await new Promise((r) => setTimeout(r, 120));

    const stored = g.inner.docs.get(idA);
    const has = (t) => stored !== undefined && JSON.parse(stored).days.some((d) => d.title === t);
    const stillHere = store.getState().doc === three;                     // still reachable in memory
    if (transition === 'deleteTripActive' || !dispatched) {
      // §4.2 rule 6c: the user asked for this document to be destroyed. Losing edit THREE is
      // the stated exception, not a defect.
      ok(`${transition}: the trip is gone, which is rule 6c's stated exception`,
        g.inner.docs.get(idA) === undefined && store.getState().activeTripId === null);
    } else {
      ok(`${transition}: edit THREE (dispatched during the transition's own flush) survives`,
        has('edit THREE') || stillHere,
        `stored=[${JSON.parse(stored ?? '{}').days?.map((d) => d.title).filter(Boolean).join('/')}]` +
        ` · activeTripId=${store.getState().activeTripId} · isDirty=${store.isDirty()}` +
        ` · status=${store.getState().persistence.status}`);
    }
  }
}

console.log(`\n${fails === 0 ? 'ALL OK' : fails + ' FAIL(S)'} — a FAIL here means the probe found what it was looking for.`);
