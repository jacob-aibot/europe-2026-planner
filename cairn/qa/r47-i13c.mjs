/**
 * **QA round 47 — the I-13c confirmation-breaker pass.** ARCHITECTURE §10 **A-62 Part 8 residue
 * 4** (revision 45), **A-65** and **A-66** (revision 46), over `7cb5965..HEAD` — the round-46 fix
 * pass (`a6c5d04`), architect revisions 45 and 46 (`9bd8418`, `4105bb8`) and I-13c group 3
 * (`c440170`).
 *
 *   node --experimental-strip-types qa/r47-i13c.mjs            (from cairn/)
 *   node --experimental-strip-types qa/r47-i13c.mjs --fast     (skips §A's suite measurement)
 *
 * **A `FAIL` line is a finding.** Every one carries its id. `note` lines are measurements that
 * are facts rather than unmet expectations.
 *
 * The two round-46 probes are re-cut by this round rather than replaced (`qa/r45-i13.mjs` §K and
 * `qa/r46-i13b.mjs` §G/§K asserted proposals A-62 Part 8 residue 4 and A-65 have since refused by
 * name — A-65 Part 8 says so and says whose job it is). Both are green end to end now.
 *
 *   A  the fences over `7cb5965..HEAD`, plus the suite and the typecheck.
 *   B  **R46-1's fix attacked, not re-run**: a THIRD trip switch mid-decode (A → B → C), and
 *      A → B → A, which is the one interleaving the guard's `!==` cannot distinguish.
 *   C  the mid-batch abort's unwind: files that already landed stay attached to the ORIGINAL
 *      trip, and are persisted.
 *   D  **R47-1, MAJOR.** `flushForTransition` is not the last thing `openTrip` does before it
 *      replaces the document: `storage.load` sits between them, and a dispatch landing in that
 *      window is discarded with `persistence.status: 'idle'`. Two faces — an ordinary edit, and
 *      a photo record whose guard passed. Costs **two** orphaned derivative pairs, against A-66
 *      Part 7's *"exactly one"*.
 *   E  **R47-2, MAJOR.** R46-3's guard orders availability reads by TRIP, not by TIME, so two
 *      overlapping reads **for the same trip** still let the older answer land last. Three
 *      faces, one of which is R46-2's own measured end state on R46-2's own fix.
 *   F  **R46-2's fix held** where §E does not reach: the two-tab merge, under a race of my own.
 *   G  **R46-3's fix held** for the cross-trip case it was written for.
 *   H  **R47-3, MINOR.** `deleteTrip` still carries the comment A-62 Part 8 residue 4a rules
 *      false and orders removed (I-13c group 1 item 1, still owed).
 *   I  A-62 Part 8 residue 2's sweep — is the sole safety net for residue 4 real, runnable code?
 *   J  **A-65 T1 … T5**, re-derived independently of the two re-cut probes.
 *   K  **A-66 U1 … U5**, the same.
 *   L  the double's escaped compound key, fuzzed for injectivity and prefix-freeness, and
 *      `fromJSON`'s new NUL refusal — including what it deliberately does not cover.
 *   M  A-62 Part 8 residue 4f's third route, reached and recorded as a DOCUMENTED RESIDUE
 *      rather than filed as a defect.
 *   N  vacuity controls for this round's own re-cuts: each planted fault turns the line red.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const ROOT = resolve(CAIRN, '..');

const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
const client = await import(resolve(CAIRN, 'packages/client/src/index.ts'));

let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** Round 46's own head — where this round's surface starts. */
const BASE = process.env.R47_BASE ?? '7cb5965';
const HEAD_ = process.env.R47_HEAD ?? 'HEAD';
const NUL = String.fromCharCode(0);

const tagged = (n, l = 64) => { const o = new Uint8Array(l); for (let i = 0; i < n.length && i < l; i++) o[i] = n.charCodeAt(i) & 0x7f; return o; };
const file = (n, type = 'image/jpeg') => ({ name: n, type, bytes: tagged(n) });
const tick = () => new Promise((r) => setTimeout(r, 0));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const keys = (port) => [...port.thumbs.keys()].map((k) => k.replace(NUL, '/')).sort();
const shape = (l) => ({ phase: l.phase, missing: l.missing, items: l.items.map((i) => `${i.asset.id}:${i.availability}`) });
const listing = (store, ref = { kind: 'trip' }) => client.photosFor(store.getState(), ref);

/**
 * A `PhotoPort` whose `derive` and `present` park until released.
 *
 * `derive` is the interesting one: §10.4's halving loop makes it *deliberately* seconds of
 * canvas work per file, which is the whole reason a trip transition can land inside it. Nothing
 * about the timing here is injected beyond "the decode has not finished yet".
 */
function gatedPhotos() {
  const port = client.memoryPhotos();
  const bd = port.derive.bind(port);
  port.gates = [];
  port.derive = (b, t) => new Promise((res) => { port.gates.push(async () => res(await bd(b, t))); });
  port.release = async (n = 1) => { for (let i = 0; i < n; i++) { const g = port.gates.shift(); if (g) await g(); await tick(); } };
  const bp = port.present.bind(port);
  port.presentGates = [];
  port.slowPresent = false;
  port.present = (t, ids) => port.slowPresent
    ? new Promise((res, rej) => { port.presentGates.push({ run: async () => res(await bp(t, ids)), fail: (e) => rej(e) }); })
    : bp(t, ids);
  return port;
}
/** A `StoragePort` whose `load` parks — one IndexedDB read, which is all `openTrip` needs. */
function gatedStorage() {
  const s = client.memoryStorage();
  const base = s.load.bind(s);
  s.loadGate = null; s.slowLoad = false;
  s.load = (id) => s.slowLoad ? new Promise((res) => { s.loadGate = async () => res(await base(id)); }) : base(id);
  return s;
}
/**
 * `scheduler` is left OUT by default, so the store uses its own `defaultScheduler` —
 * `setTimeout(fn, AUTOSAVE_DEBOUNCE_MS)`, which is exactly what `apps/web` runs on
 * (`apps/web/src/store.ts` passes no scheduler). §D depends on the debounce being real.
 */
function mk(prefix = '', shared = {}) {
  const p = {
    storage: shared.storage ?? gatedStorage(),
    file: client.memoryFile(),
    photo: shared.photo ?? gatedPhotos(),
    clock: client.fixedClockPort('2026-08-01'),
    ids: client.sequentialIdPort(prefix),
    ...(shared.scheduler ? { scheduler: shared.scheduler } : {}),
  };
  return [p, client.createStore({ ports: p, ...(shared.debounceMs !== undefined ? { debounceMs: shared.debounceMs } : {}) })];
}
const stored = async (p, id) => {
  const rec = await p.storage.load(id);
  return rec === null ? null : core.fromJSON(rec.doc);
};

// --------------------------------------------------------------------------- §A

head('§A — the fences over `7cb5965..HEAD`, and the numbers BUILD-NOTES publishes');
{
  const names = git('diff', '--name-only', `${BASE}..${HEAD_}`).trim().split('\n').filter(Boolean);
  note(`${names.length} files across the round-46 fix pass, revisions 45 and 46, and I-13c group 3`);
  ok(names.filter((n) => n.endsWith('.tsx')).length === 0, 'zero `.tsx` files across the whole range', names.filter((n) => n.endsWith('.tsx')));
  ok(names.filter((n) => /package(-lock)?\.json$/.test(n)).length === 0,
    'zero `package.json` / `package-lock.json` movement — no dependency was added',
    names.filter((n) => /package(-lock)?\.json$/.test(n)));
  ok(names.filter((n) => n.startsWith('cairn/docs/design/')).length === 0, '`docs/design/` untouched');
  ok(names.every((n) => n.startsWith('cairn/')), 'nothing outside `cairn/` — the root planner is read-only',
    names.filter((n) => !n.startsWith('cairn/')));
  ok(git('status', '--porcelain', '--', 'europe-2026-itinerary.html', 'docs/', 'tickets/').trim() === '',
    'the root planner, `docs/` and `tickets/` are unmodified in the working tree');

  const added = git('diff', `${BASE}..${HEAD_}`, '--',
    'cairn/packages/core/src', 'cairn/packages/client/src', 'cairn/apps/web/src', 'cairn/cli.ts')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const code = added.filter((l) => !/^\+\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  note(`${added.length} added production lines, ${code.split('\n').length} of them outside comments`);
  for (const [label, re] of [
    ['console.*', /console\s*\./], ['fetch(', /\bfetch\s*\(/], ['XMLHttpRequest/sendBeacon', /XMLHttpRequest|sendBeacon/],
    ['localStorage/sessionStorage', /localStorage|sessionStorage/], ['geolocation/watchPosition', /geolocation|watchPosition/],
    ['Date.now / new Date(', /Date\.now|new Date\s*\(/], ['Math.random / randomUUID', /Math\.random|crypto\.randomUUID/],
    ['imap/gmail/oauth/mailbox', /\b(imap|gmail|oauth|mailbox)\b/i], ['a lat:/lng: literal', /\b(lat|lng)\s*:\s*-?\d/],
    ['setTimeout / setInterval', /set(Timeout|Interval)\s*\(/],
  ]) {
    const hits = code.split('\n').filter((l) => re.test(l));
    ok(hits.length === 0, `no \`${label}\` in any added production line`, hits.slice(0, 3));
  }
  const pkgAdded = git('diff', `${BASE}..${HEAD_}`, '--', 'cairn/packages/core/src', 'cairn/packages/client/src')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++') && !/^\+\s*(\/\/|\*|\/\*)/.test(l));
  const dom = pkgAdded.filter((l) => /\b(document|window|navigator)\s*\.|HTMLElement|createObjectURL|\bBlob\b/.test(l));
  ok(dom.length === 0, 'no DOM reference in any added `packages/core` or `packages/client` line (`cairn-constraints` §5)', dom.slice(0, 3));

  // Core's runtime export surface has not moved: A-65 and A-66 both rule "no new anything".
  const exportCount = Object.keys(core).filter((k) => typeof core[k] !== 'undefined').length;
  note(`core's runtime export surface: ${exportCount}`);
  ok(core.SCHEMA_VERSION === 2, '`SCHEMA_VERSION` is still 2 — A-65 and A-66 move no schema', core.SCHEMA_VERSION);

  if (process.argv.includes('--fast')) {
    note('suite measurement skipped (--fast). `npm run test:tap | grep \'^# pass\'` is the check.');
  } else {
    const tap = execFileSync('npm', ['run', '--silent', 'test:tap'], { cwd: CAIRN, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    const pass = /^# pass (\d+)$/m.exec(tap)?.[1] ?? null;
    const fail = /^# fail (\d+)$/m.exec(tap)?.[1] ?? null;
    const bn = readFileSync(resolve(CAIRN, 'docs/BUILD-NOTES.md'), 'utf8');
    const statedIn2 = /^npm test\s+# (\d+) tests/m.exec(bn)?.[1] ?? null;
    ok(fail === '0', 'the suite is green', { pass, fail });
    ok(statedIn2 === pass, 'BUILD-NOTES §2\'s published `npm test` count matches the suite', { statedInSection2: statedIn2, measured: pass });
  }
}

// --------------------------------------------------------------------------- §B

head('§B — R46-1\'s fix ATTACKED: a third trip mid-decode, and the return trip the `!==` cannot see');
{
  // Face 1 — A -> B -> C, all three before the first decode resolves. The guard was written
  // against a two-state transition; this is a three-state one.
  const [p, store] = mk();
  for (const t of ['A', 'B', 'C']) await store.createTrip({ title: t, startDate: '2026-08-07', endDate: '2026-08-09' });
  await store.flush();
  const [A, B, C] = store.getState().library.map((r) => r.id).sort();
  await store.openTrip(A);
  p.photo.next = [file('1.jpg'), file('2.jpg'), file('3.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick(); await tick();
  await store.openTrip(B);
  await store.openTrip(C);
  await p.photo.release(3);
  await imp;
  await store.flush();
  const docs = { A: await stored(p, A), B: await stored(p, B), C: await stored(p, C) };
  ok(docs.B.photos.length === 0 && docs.C.photos.length === 0,
    'A → B → C mid-decode files NO record into either trip the batch did not belong to',
    { B: docs.B.photos.map((x) => x.id), C: docs.C.photos.map((x) => x.id) });
  ok(keys(p.photo).every((k) => k.startsWith(`${A}/`)),
    'every byte record the abandoned batch wrote is under the ORIGINAL trip\'s key',
    keys(p.photo));
  ok(store.getState().photos.failures.length === 0,
    'A-66: the abandoned files are reported as nothing — no `storage_failed`, no sixth arm',
    store.getState().photos.failures);
  // **RE-CUT AT ROUND 49 — §4.2 A-68 Part 9, whose predicate clause (i) names this line.** It used
  // to require `keys(p.photo).length === 1` — *one* stranded derivative pair. That count was the
  // OLD guard's collateral: `isLiveTrip(tripId)` fired AFTER `ports.photo.write`, so the file the
  // transition landed on had already created its byte pair before it was refused. A-67's step-4
  // `guard.current('doc', g)` fires BEFORE the write, so the abandoned file writes nothing at all
  // and A-66 **Part 10** item 2 states the new bound. Asserted over **both** derivative stores,
  // for A-67 Part 7a's own stated reason: one `ports.photo.write` fills thumb and display, and
  // checking one alone is how a half-write goes unseen. Vacuity control: `bash qa/r49-recut-vacuity.sh`
  // watches this line RED against the mutant that restores `isLiveTrip`, where it reports
  // `["<A>/photo-1"]` — the old assertion's exact expected value.
  ok(keys(p.photo).length === 0 && [...p.photo.displays.keys()].length === 0,
    'A-66 Part 10 item 2 (re-cut at round 49): the guard precedes the `write`, so the abandoned file strands NO derivative pair — neither thumb nor display',
    { thumbs: keys(p.photo), displays: [...p.photo.displays.keys()].map((k) => k.replace(NUL, '/')) });

  // Face 2 — A -> B -> A, the return trip. **RE-CUT AT ROUND 49 — A-68 Part 9, predicate clause
  // (ii).** Round 47 measured that the batch *completed into A* and asserted it as correct. It was
  // the right outcome produced by the wrong mechanism: `state.doc?.id !== tripId` passed on the
  // return because id-identity is true of two different document *instances* — which is R47-1 face
  // 3 in one sentence, the same false positive that on `A -> A` silently lost three photographs of
  // four while reporting `failures: []`. A-67 chose generation identity, and this assertion is the
  // bill: the intermediate transition ends the batch and the return trip does not revive it.
  // What replaces it is strictly better as a STATE — a stopped batch, not a half-lost one — and
  // A-67 Part 11 residue 3 (widened by A-68 Part 9) discloses the cost.
  const [q, s2] = mk('q');
  for (const t of ['A', 'B']) await s2.createTrip({ title: t, startDate: '2026-08-07', endDate: '2026-08-09' });
  await s2.flush();
  const [qA, qB] = s2.getState().library.map((r) => r.id).sort();
  await s2.openTrip(qA);
  q.photo.next = [file('1.jpg'), file('2.jpg')];
  const imp2 = s2.importPhotos({ kind: 'day', dayId: '2026-08-07' });
  await tick(); await tick();
  await s2.openTrip(qB);
  await s2.openTrip(qA);
  await q.photo.release(2);
  await imp2;
  await s2.flush();
  const dA = await stored(q, qA); const dB = await stored(q, qB);
  ok(dA.photos.length === 0 && dB.photos.length === 0
     && keys(q.photo).length === 0 && [...q.photo.displays.keys()].length === 0
     && s2.getState().photos.failures.length === 0
     && s2.getState().photos.pending === 0 && s2.getState().photos.total === 0,
    'A → B → A (re-cut at round 49): the intermediate transition STOPS the batch and the return trip does not revive it — zero records anywhere, zero bytes, `failures: []`, 0/0 (A-67 Part 11 residue 3, widened by A-68 Part 9)',
    { A: dA.photos.map((x) => x.id), B: dB.photos.map((x) => x.id), thumbs: keys(q.photo),
      displays: [...q.photo.displays.keys()].map((k) => k.replace(NUL, '/')),
      failures: s2.getState().photos.failures,
      fraction: `${s2.getState().photos.pending}/${s2.getState().photos.total}` });
  ok(core.validateTrip(dA).length === 0,
    'and the document A validates clean — a stopped batch leaves no `photo_attach_dangling` for the `{kind:\'day\'}` ref it never filed',
    core.validateTrip(dA).map((i) => i.code));
}

// --------------------------------------------------------------------------- §C

head('§C — the abort\'s unwind: files that already landed stay attached to the ORIGINAL trip');
{
  const [p, store] = mk();
  for (const t of ['A', 'B']) await store.createTrip({ title: t, startDate: '2026-08-07', endDate: '2026-08-09' });
  await store.flush();
  const [A, B] = store.getState().library.map((r) => r.id).sort();
  await store.openTrip(A);
  p.photo.next = [1, 2, 3, 4, 5].map((n) => file(`${n}.jpg`));
  const imp = store.importPhotos({ kind: 'trip' });
  await tick(); await tick();
  await p.photo.release(2);                       // files 1 and 2 land while A is open
  const inMemory = store.getState().doc.photos.map((x) => x.id);
  await store.openTrip(B);                        // the user leaves, mid-batch
  await p.photo.release(3);                       // 3, 4, 5 arrive late
  await imp;
  await store.flush();
  const dA = await stored(p, A);
  ok(inMemory.length === 2 && dA.photos.map((x) => x.id).join() === inMemory.join(),
    'A-66 **U1**: the two files that landed before the transition are still trip A\'s, and are PERSISTED',
    { inMemoryBeforeTheSwitch: inMemory, storedAfter: dA.photos.map((x) => x.id) });
  ok((await stored(p, B)).photos.length === 0, 'trip B holds none of them');
  const orphans = keys(p.photo).filter((k) => !dA.photos.some((x) => k === `${A}/${x.id}`));
  const dOrphans = [...p.photo.displays.keys()].map((k) => k.replace(NUL, '/'))
    .filter((k) => !dA.photos.some((x) => k === `${A}/${x.id}`));
  // **RE-CUT AT ROUND 49 — A-68 Part 9, predicate clause (i), the same inversion one section over.**
  // **U4's contract is unchanged and unedited** — *"the store never claims to have observed a
  // stranded pair it cannot name"*, asserted below and green on both sides of A-67. Only the COUNT
  // of pairs the old guard created moves, from one to none, because the generation check fires
  // before `ports.photo.write` instead of after it (A-66 Part 10 item 2).
  ok(orphans.length === 0 && dOrphans.length === 0,
    'A-66 **U4** (re-cut at round 49): the abandoned files strand NO derivative pair at all — neither thumb nor display',
    { thumbs: orphans, displays: dOrphans });
  const st = store.getState();
  ok(st.photos.pending === 0 && st.photos.total === 0 && st.photos.failures.length === 0,
    'A-66 **U2**: the abandoned batch leaves no fraction and no failure on the trip it did not belong to',
    { pending: st.photos.pending, total: st.photos.total, failures: st.photos.failures });
  ok(client.orphanPhotoBytes(st).length === 0,
    'and `orphanPhotoBytes` does not pretend to have observed it (A-66 U4\'s second clause)',
    client.orphanPhotoBytes(st));
}

// --------------------------------------------------------------------------- §D

head('§D — **R47-1, MAJOR**: the window between `flushForTransition()` and the reseed');
{
  // The store's own `defaultScheduler` (a real `setTimeout`) and its real debounce — which is
  // what `apps/web` runs on, because `apps/web/src/store.ts` passes no scheduler port. Under
  // `immediateScheduler` this window is invisible, which is why the shipped tests do not see it.
  const D = 40;

  // Face 1 — an ORDINARY edit. This is the root cause, and it has nothing to do with photos.
  const [p, store] = mk('', { debounceMs: D });
  for (const t of ['A', 'B']) await store.createTrip({ title: t, startDate: '2026-08-07', endDate: '2026-08-09' });
  await store.flush();
  const [A, B] = store.getState().library.map((r) => r.id).sort();
  await store.openTrip(A);
  p.storage.slowLoad = true;
  const open = store.openTrip(B);
  await tick(); await tick();
  const parked = p.storage.loadGate !== null;
  // **RE-CUT AT ROUND 49.** A-67 Part 6 made this `dispatch` THROW inside a transition window —
  // `TRANSITION_IN_PROGRESS_MESSAGE`, the fence R48-3 is filed against. Round 47 wrote this line
  // when the dispatch merely returned, so from `4316167` onwards the probe **died here with an
  // uncaught error and §E…§N never ran at all** (QA R49-2). The throw is caught and recorded, and
  // the assertion below is widened to R47-1's actual contract, which holds on both sides of A-67:
  // an edit dispatched into the window is preserved **or refused loudly** — never silently
  // discarded with `persistence.status: 'idle'` over it, which is what R47-1 measured.
  let refused = null;
  try { store.dispatch({ type: 'setTripMeta', patch: { title: 'EDITED IN THE WINDOW' } }); }
  catch (e) { refused = e?.message ?? String(e); }
  const inMemory = store.getState().doc?.title;
  p.storage.slowLoad = false;
  await p.storage.loadGate();
  await open;
  await sleep(D * 4);
  await store.flush();
  const afterA = await stored(p, A);
  ok(!parked || afterA.title === 'EDITED IN THE WINDOW' || refused !== null,
    'FINDING R47-1 face 1 (re-cut at round 49): an edit dispatched after `flushForTransition()` returned is preserved OR refused loudly — never silently discarded',
    { parkedInsideStorageLoad: parked, refusedWith: refused, inMemoryTitleAtTheTime: inMemory, titleInStorageAfter: afterA.title,
      persistenceStatus: store.getState().persistence.status });
  note('§4.2 rule 6a is *"a pending write is never outlived by its document"*, and R5-1 already');
  note('established that *"a flush is not a moment — it is an `await` long enough for the user to');
  note('type into"* — which is why `flushForTransition`\'s own loop re-asserts `dirty()` after');
  note('every write. `openTrip` then awaits `ports.storage.load(id)` AFTER that loop and before');
  note('the reseeding `set`, and nothing re-asserts `dirty()` across it. `persistence.status`');
  note('reads `\'idle\'` over an edit storage does not hold, which is R2-1\'s own harm.');
  note('`adoptTrip` (`:1233`) and `importDoc` (`:1826`) have the same shape and the same window.');

  // Face 2 — the reachable producer. `importPhotos` is the one thing in this app that dispatches
  // from a promise the user did not just create, and `derive` is seconds long by design (§10.4).
  const [q, s2] = mk('q', { debounceMs: D });
  for (const t of ['A', 'B']) await s2.createTrip({ title: t, startDate: '2026-08-07', endDate: '2026-08-09' });
  await s2.flush();
  const [qA, qB] = s2.getState().library.map((r) => r.id).sort();
  await s2.openTrip(qA);
  q.photo.next = [file('1.jpg'), file('2.jpg'), file('3.jpg')];
  const imp = s2.importPhotos({ kind: 'trip' });
  await tick(); await tick();
  q.storage.slowLoad = true;
  const open2 = s2.openTrip(qB);
  await tick(); await tick();
  await q.photo.release(1);                       // the decode lands INSIDE the load window
  const acceptedInMemory = s2.getState().doc?.photos.map((x) => x.id) ?? [];
  q.storage.slowLoad = false;
  await q.storage.loadGate();
  await open2;
  await q.photo.release(3);
  await imp;
  await sleep(D * 4);
  await s2.flush();
  const dA = await stored(q, qA);
  const strandedPairs = keys(q.photo).filter((k) => !dA.photos.some((x) => k === `${qA}/${x.id}`));
  ok(dA.photos.length === acceptedInMemory.length,
    'FINDING R47-1 face 2: a photo record the dispatch guard ACCEPTED is not discarded by the transition',
    { acceptedIntoTheDocument: acceptedInMemory, persistedAfterwards: dA.photos.map((x) => x.id),
      failuresReported: s2.getState().photos.failures });
  ok(strandedPairs.length <= 1,
    'FINDING R47-1 face 2b: A-66 Part 7\'s *"exactly one derivative pair per abandoned batch"* holds',
    { strandedPairs, allKeys: keys(q.photo), recordsInA: dA.photos.map((x) => x.id) });
  note('A-66 Part 7: *"When the loop breaks at the dispatch guard, exactly one file has written');
  note('derivatives with no record — every later file breaks before its `write`."* Two files here');
  note('have written derivatives with no record: the one whose dispatch the reseed threw away,');
  note('and the one that broke at the guard. The bound is a fact about the loop and it is right');
  note('about the loop; the window above adds a second producer the loop cannot see.');

  // Face 3 — the bound is not just off by one, it is UNBOUNDED. The batch only ends when the
  // dispatch guard fails, and re-opening the SAME trip never fails it: `state.doc?.id ===
  // tripId` on both sides of the transition. So every re-open whose `storage.load` swallows a
  // decode costs one more record and one more stranded pair, and the loop runs on.
  const [w, s3] = mk('w', { debounceMs: D });
  await s3.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
  const wA = s3.getState().doc.id;
  await s3.flush();
  w.photo.next = [1, 2, 3, 4].map((n) => file(`${n}.jpg`));
  const imp3 = s3.importPhotos({ kind: 'trip' });
  await tick(); await tick();
  for (let i = 0; i < 3; i++) {
    w.storage.slowLoad = true;
    const reopen = s3.openTrip(wA);                 // the library card, tapped again
    await tick(); await tick();
    await w.photo.release(1);                       // one decode lands inside this load window
    w.storage.slowLoad = false;
    await w.storage.loadGate();
    await reopen;
  }
  await w.photo.release(1);
  await imp3;
  await sleep(D * 4);
  await s3.flush();
  const dW = await stored(w, wA);
  const strandedW = keys(w.photo).filter((k) => !dW.photos.some((x) => k === `${wA}/${x.id}`));
  ok(strandedW.length <= 1,
    'FINDING R47-1 face 3: repeated re-opens of the SAME trip mid-batch do not multiply the stranded pairs',
    { strandedPairs: strandedW, recordsInA: dW.photos.map((x) => x.id),
      failuresReported: s3.getState().photos.failures, importedFiles: 4 });
  note('Four files picked, four decoded, four written, and the document ends with what the last');
  note('one alone put there. Nothing is reported, `pending` settles to zero, and the stranded');
  note('pairs are outside `orphanPhotoBytes` (nothing observed them) and outside A-62 Part 8');
  note('residue 2\'s predicate (trip A has a document). A-66 Part 7\'s *"bounded at one derivative');
  note('pair per abandoned batch"* is the sentence that makes the leak acceptable, and this is');
  note('the counterexample to it.');
}

// --------------------------------------------------------------------------- §E

head('§E — **R47-2, MAJOR**: R46-3\'s guard orders availability reads by TRIP, never by TIME');
{
  // Face 1 — two `openTrip` calls for the SAME trip (a double-tap on one library card), the
  // earlier read landing last. `state.doc?.id !== doc.id` is false for both, so both stamp.
  const [p, store] = mk();
  await store.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
  const A = store.getState().doc.id;
  p.photo.next = [file('1.jpg')];
  const i0 = store.importPhotos({ kind: 'trip' });
  await tick(); await p.photo.release(1); await i0;
  await store.flush();
  await store.closeTrip();

  p.photo.slowPresent = true;
  const o1 = store.openTrip(A);
  await tick(); await tick();
  const o2 = store.openTrip(A);
  await tick(); await tick();
  const queued = p.photo.presentGates.length;
  await p.photo.presentGates.splice(1, 1)[0].run();      // the SECOND read lands first
  await tick();
  p.photo.slowPresent = false;
  await o2.catch(() => {});
  p.photo.next = [file('2.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick(); await p.photo.release(1); await imp;
  const before = shape(listing(store));
  if (p.photo.presentGates.length) await p.photo.presentGates.shift().run();   // the FIRST read lands last
  await tick();
  await o1.catch(() => {});
  const after = shape(listing(store));
  const onDisk = keys(p.photo);
  ok(after.missing === 0,
    'FINDING R47-2 face 1: an older availability read for the SAME trip cannot overwrite a newer one',
    { presentReadsQueued: queued, listingBeforeTheStaleAnswer: before, listingAfter: after, bytesActuallyOnDisk: onDisk });
  note('§10.6 property 3 renders `\'missing\'` as *"this photo\'s image is no longer stored on this');
  note('device"*. Both photographs are on disk under `[A, …]`. This is **R45-4\'s exact defect**,');
  note('reached through `readPhotoAvailability` rather than through `importPhotos`.');

  // Face 2 — R46-2's own end state, on R46-2's own fix. Two tabs; the merge's fresh read is
  // correct and an older `refreshPhotoAvailability` for the same trip lands after it.
  const storage = client.memoryStorage();
  const photo = gatedPhotos();
  const [pa, TA] = mk('a', { storage, photo });
  const [, TB] = mk('b', { storage, photo });
  await TA.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  photo.next = [file('a.jpg')];
  const ia = TA.importPhotos({ kind: 'trip' });
  await tick(); await photo.release(1); await ia;
  await TA.flush();
  const T = TA.getState().doc.id;
  await TB.openTrip(T);
  photo.next = [file('b.jpg')];
  const ib = TB.importPhotos({ kind: 'trip' });
  await tick(); await photo.release(1); await ib;
  await TB.flush();

  photo.slowPresent = true;
  const refresh = TA.refreshPhotoAvailability();          // tab A's read, parked
  await tick(); await tick();
  photo.slowPresent = false;
  TA.dispatch({ type: 'setTripMeta', patch: { title: 'A edit' } });
  await TA.flush().catch(() => {});
  const conflicted = TA.getState().persistence.status;
  await TA.mergeWithStored();
  const afterMerge = shape(listing(TA));
  await photo.presentGates.shift().run();                 // the pre-merge answer lands last
  await tick(); await refresh;
  const afterStale = shape(listing(TA));
  ok(afterStale.missing === 0,
    'FINDING R47-2 face 2: `doMerge`\'s fresh read (the R46-2 fix) is not overwritten by an older read for the same trip',
    { statusBeforeMerge: conflicted, listingAfterMerge: afterMerge, listingAfterTheStaleAnswer: afterStale,
      bytesActuallyOnDisk: keys(photo) });
  note('R46-2 measured `{phase:\'ready\', missing:1, items:[\'bphoto-1:missing\']}` over bytes held');
  note('under the trip\'s own key. That is this line\'s `-> …` when it fails, on the fix for it.');

  // Face 3 — A-63 property 6's action defeated: "Try again" succeeds, then the earlier FAILING
  // read lands and re-arms `'unreadable'` with its message. The button has no in-flight flag,
  // by `refreshPhotoAvailability`'s own docstring, so two taps is one gesture.
  const [r, s3] = mk('r');
  await s3.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  r.photo.next = [file('a.jpg')];
  const i3 = s3.importPhotos({ kind: 'trip' });
  await tick(); await r.photo.release(1); await i3;
  await s3.flush();
  r.photo.slowPresent = true;
  const t1 = s3.refreshPhotoAvailability();
  await tick();
  const t2 = s3.refreshPhotoAvailability();
  await tick();
  await r.photo.presentGates.splice(1, 1)[0].run(); await tick(); await t2;
  const afterRetry = shape(listing(s3));
  r.photo.presentGates.shift().fail(new Error('IndexedDB: UnknownError'));
  await tick(); await t1.catch(() => {});
  const afterFailure = listing(s3);
  ok(afterFailure.phase !== 'unreadable',
    'FINDING R47-2 face 3: a retry that SUCCEEDED is not reverted to `\'unreadable\'` by an older read that failed',
    { afterTheSuccessfulRetry: afterRetry, afterTheOlderFailingRead: shape(afterFailure), message: afterFailure.message });
  note('§10.6 property 6: *"an `\'unreadable\'` listing carries an action, not just a diagnosis."*');
  note('The action ran and worked. Both guards at `store.ts:427` and `:435` compare trip ids, and');
  note('R46-3\'s own finding offered the alternative that closes this: *"or carry a generation');
  note('counter."* The tenancy half shipped; the ordering half did not.');
}

// --------------------------------------------------------------------------- §F

head('§F — **R46-2\'s fix HELD** under a two-tab merge of my own construction');
{
  const storage = client.memoryStorage();
  const photo = client.memoryPhotos();
  const [, TA] = mk('a', { storage, photo });
  const [, TB] = mk('b', { storage, photo });
  await TA.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  photo.next = [file('a.jpg'), file('a2.jpg')];
  await TA.importPhotos({ kind: 'trip' });
  await TA.flush();
  const T = TA.getState().doc.id;
  await TB.openTrip(T);
  photo.next = [file('b.jpg'), file('b2.jpg'), file('b3.jpg')];
  await TB.importPhotos({ kind: 'trip' });
  await TB.flush();
  // Tab A has been sitting on a stale availability set the whole time.
  TA.dispatch({ type: 'setTripMeta', patch: { title: 'A edit' } });
  await TA.flush().catch(() => {});
  ok(TA.getState().persistence.status === 'conflict', 'tab A\'s own save is refused by the fence first', TA.getState().persistence.status);
  await TA.mergeWithStored();
  const l = shape(listing(TA));
  ok(l.phase === 'ready' && l.missing === 0 && l.items.length === 5,
    'a merge that takes in three of another tab\'s photographs re-reads availability and reports none missing',
    { listing: l, bytesOnDisk: keys(photo) });
  // …and the same for a merge that takes in NO photo, which must not disturb the answer.
  const [, TC] = mk('c', { storage, photo });
  await TC.openTrip(T);
  TC.dispatch({ type: 'setTripMeta', patch: { title: 'C edit' } });
  await TC.flush().catch(() => {});
  TA.dispatch({ type: 'setTripMeta', patch: { title: 'A edit 2' } });
  await TA.flush().catch(() => {});
  await TA.mergeWithStored();
  ok(listing(TA).missing === 0, 'and a merge that carries no photo change leaves the answer alone', shape(listing(TA)));
}

// --------------------------------------------------------------------------- §G

head('§G — **R46-3\'s fix HELD** for the cross-trip case it was written for');
{
  const [p, store] = mk();
  for (const t of ['A', 'B']) await store.createTrip({ title: t, startDate: '2026-08-07', endDate: '2026-08-09' });
  await store.flush();
  const [A, B] = store.getState().library.map((r) => r.id).sort();
  // Both trips need a photo, or `readPhotoAvailability` short-circuits without a port call and
  // there is no read to race.
  for (const [t, n] of [[A, '1.jpg'], [B, '2.jpg']]) {
    await store.openTrip(t);
    p.photo.next = [file(n)];
    const i = store.importPhotos({ kind: 'trip' });
    await tick(); await p.photo.release(1); await i;
    await store.flush();
  }
  await store.closeTrip();

  p.photo.slowPresent = true;
  const oA = store.openTrip(A);
  await tick(); await tick();
  const oB = store.openTrip(B);
  await tick(); await tick();
  // B's read lands first, then A's — the earlier trip's answer arriving last, which is R46-3.
  await p.photo.presentGates.splice(1, 1)[0].run(); await tick();
  p.photo.slowPresent = false;
  await oB.catch(() => {});
  if (p.photo.presentGates.length) await p.photo.presentGates.shift().run();
  await tick(); await oA.catch(() => {});
  const st = store.getState();
  const l = listing(store);
  ok(st.doc?.id === B && st.photos.tripId === B && l.phase !== 'loading',
    'R46-3: the earlier trip\'s answer is DROPPED, not stamped — `\'loading\'` is still transient',
    { doc: st.doc?.id, photosTripId: st.photos.tripId, listing: shape(l) });
  await sleep(20);
  ok(listing(store).phase !== 'loading', 'and it is still not `\'loading\'` a moment later', shape(listing(store)));
}

// --------------------------------------------------------------------------- §H

head('§H — **R47-3, MINOR**: `deleteTrip` still carries the comment residue 4a rules false');
{
  const src = readFileSync(resolve(CAIRN, 'packages/client/src/store/store.ts'), 'utf8');
  ok(!/orphaned bytes are reclaimable/.test(src),
    'FINDING R47-3: `deleteTrip`\'s `catch` no longer claims the stranded bytes are reclaimable (A-62 Part 8 residue 4a)',
    { line: src.split('\n').findIndex((l) => /orphaned bytes are reclaimable/.test(l)) + 1 });
  ok(!/A failure here leaves reclaimable orphans/.test(src),
    'FINDING R47-3b: and the paragraph above `chainOntoSaving` no longer says the same thing (ROADMAP I-13c group 1 item 1)',
    { line: src.split('\n').findIndex((l) => /A failure here leaves reclaimable orphans/.test(l)) + 1 });
  note('Residue 4a: *"The **first** is false on this path and has to come out of the code."*');
  note('ROADMAP I-13c group 1 item 3 rules it NON-BLOCKING and says so in advance — *"if it');
  note('slipped a pass it would be a tracked residue and not a ship condition"* — and I-13c\'s own');
  note('revision-46 status line already records it as owed. It is filed because it is still true,');
  note('not because it gates anything.');
}

// --------------------------------------------------------------------------- §I

head('§I — A-62 Part 8 residue 2\'s sweep: is the sole safety net real, runnable code?');
{
  const port = client.memoryPhotos();
  const surface = Object.keys(port).filter((k) => typeof port[k] === 'function').sort();
  note(`\`PhotoPort\` methods on the double: ${surface.join(', ')}`);
  const canEnumerate = surface.some((m) => /^(allKeys|keysFor|scan|sweep|orphanKeys)$/.test(m));
  ok(!canEnumerate || true, 'recorded, not asserted');
  const clientSrc = readdirSync(resolve(CAIRN, 'packages/client/src'), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts'))
    .map((e) => readFileSync(resolve(e.parentPath ?? e.path, e.name), 'utf8')).join('\n');
  const webSrc = readdirSync(resolve(CAIRN, 'apps/web/src'), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
    .map((e) => readFileSync(resolve(e.parentPath ?? e.path, e.name), 'utf8')).join('\n');
  const sweeper = /sweepOrphan|reclaimAllOrphan|orphanKeyRanges|keyRangesWithNoDocument/.test(clientSrc + webSrc);
  note(`a residue-2 sweeper exists in code: ${sweeper}`);
  ok(!sweeper, 'residue 2\'s sweep is DELIBERATELY unbuilt, exactly as A-62 Part 8 residue 2 and A-65 Part 4(b) both state', sweeper);
  note('This is a **confirmed-by-design** line, not a defect. Residue 4e names the sweep as the');
  note('ONLY recovery for a trip-delete orphan, and A-66 Part 9 residue 2 already records that');
  note('the sweep\'s stated predicate (*"a key range whose trip has no document"*) is narrower');
  note('than the orphan population, because the mid-flight orphan\'s trip is alive. Both are');
  note('disclosed in writing before this round reached them, which is the difference between a');
  note('ruling that leans on an unbuilt mechanism and one that hides behind it. What is true and');
  note('worth stating plainly: **today, nothing in the shipped product can reclaim either class');
  note('of orphan except deleting the whole trip.** `PhotoPort` cannot even enumerate a trip\'s');
  note('stored keys — `present(tripId, ids)` answers only about ids the caller already holds —');
  note('so the sweep is a port change when it is built, which A-66 Part 9 residue 2 says too.');
}

// --------------------------------------------------------------------------- §J

head('§J — **A-65 T1 … T5**, re-derived here rather than read off the two re-cut probes');
{
  /** No decode gate is needed here — nothing in A-65 is about a race. */
  const plain = () => ({ photo: client.memoryPhotos() });
  // T1 — the criterion, in full.
  const [p, store] = mk('', plain());
  await store.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const T = store.getState().doc.id;
  const pid = store.getState().doc.photos[0].id;
  await store.removePhoto(pid);
  store.undo();
  let threw = null;
  try { await store.refreshPhotoAvailability(); } catch (e) { threw = String(e); }
  const l = listing(store);
  ok(store.getState().doc.photos.length === 1 && (await p.photo.read(T, pid, 'thumb')) === null
     && (await p.photo.read(T, pid, 'display')) === null && threw === null
     && l.phase === 'ready' && l.missing === 1 && l.items[0].availability === 'missing',
    'A-65 **T1**: record back, both derivatives gone, `{ready, missing:1}` after a FRESH read — never `empty`, never `unreadable`, never a throw',
    { photos: store.getState().doc.photos.length, threw, listing: shape(l) });
  const asset = store.getState().doc.photos[0];
  ok(asset.caption !== undefined && asset.thumb && asset.display && asset.provenance && 'at' in asset && 'capturedAt' in asset,
    'A-65 Part 3 clause 2: every field of the record survives the undo — the whole memory except the picture',
    Object.keys(asset).sort());

  // T2 — the same WITHOUT the refresh, on the in-session set.
  const [q, s2] = mk('q', plain());
  await s2.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  q.photo.next = [file('a.jpg')];
  await s2.importPhotos({ kind: 'trip' });
  await s2.flush();
  const pid2 = s2.getState().doc.photos[0].id;
  await s2.removePhoto(pid2);
  s2.undo();
  ok(listing(s2).missing === 1,
    'A-65 **T2**: the in-session set agrees with a fresh read rather than contradicting it',
    shape(listing(s2)));

  // T3 — remove, undo, redo: exactly one port `remove`, and no orphan entry.
  const [r, s3] = mk('r', plain());
  await s3.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  r.photo.next = [file('a.jpg')];
  await s3.importPhotos({ kind: 'trip' });
  await s3.flush();
  const pid3 = s3.getState().doc.photos[0].id;
  let removes = 0;
  const baseRemove = r.photo.remove.bind(r.photo);
  r.photo.remove = async (t, i) => { removes++; return baseRemove(t, i); };
  await s3.removePhoto(pid3);
  s3.undo();
  s3.redo();
  await tick();
  ok(removes === 1 && s3.getState().doc.photos.length === 0 && s3.getState().photos.orphans.length === 0,
    'A-65 **T3**: `remove` is called exactly once across remove → undo → redo; `redo` issues no port call',
    { removeCalls: removes, photos: s3.getState().doc.photos.length, orphans: s3.getState().photos.orphans });

  // T4 — a rejecting `remove`, then undo, then `reclaimPhotoBytes`.
  const [s, s4] = mk('s', plain());
  await s4.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  s.photo.next = [file('a.jpg')];
  await s4.importPhotos({ kind: 'trip' });
  await s4.flush();
  const T4 = s4.getState().doc.id;
  const pid4 = s4.getState().doc.photos[0].id;
  s.photo.failRemoveFor.add(pid4);
  await s4.removePhoto(pid4);
  const orphanedAfterFailure = [...s4.getState().photos.orphans];
  s4.undo();
  await s4.reclaimPhotoBytes([pid4]);
  ok(orphanedAfterFailure.join() === pid4
     && (await s.photo.read(T4, pid4, 'thumb')) !== null
     && s4.getState().photos.orphans.length === 0
     && listing(s4).missing === 0,
    'A-65 **T4**: the failed delete is recorded, and after the undo `reclaimPhotoBytes` refuses it AND drops it from the report',
    { orphanedAfterFailure, orphansNow: s4.getState().photos.orphans, listing: shape(listing(s4)) });

  // T5 — the refusal, checkable.
  const storeSrc = readFileSync(resolve(CAIRN, 'packages/client/src/store/store.ts'), 'utf8');
  // Executable lines only: the docstring A-65 Part 5 item 1 asks for necessarily NAMES the
  // things it refuses, so a grep over prose would go red on the disclosure itself.
  const photoBlock = storeSrc.slice(storeSrc.indexOf('---- photos'))
    .split('\n').filter((x) => !/^\s*(\*|\/\/|\/\*)/.test(x));
  const timerish = photoBlock.filter((x) => /setTimeout|setInterval|pendingDelete|tombstone|deferredDelete/i.test(x));
  ok(timerish.length === 0,
    'A-65 **T5**: no timer, no pending-delete queue, no tombstone in any executable line of the photo path',
    timerish.slice(0, 3));
  const removeDoc = storeSrc.slice(storeSrc.lastIndexOf('/**', storeSrc.indexOf('async removePhoto')), storeSrc.indexOf('async removePhoto'));
  ok(!/is not written here because|Trigger:\s*that ruling|The fix is a \*\*deferred\*\*/.test(removeDoc),
    'A-65 **T5** second clause: `removePhoto`\'s docstring names no future ruling that will change when the bytes go',
    removeDoc.split('\n').filter((x) => /deferred/.test(x)).slice(0, 3));
  ok(/A-65/.test(removeDoc) && /refused/i.test(removeDoc),
    'and it cites the ruling that refused the deferral, rather than re-arguing it (A-65 Part 5 item 1)');
  const types = readFileSync(resolve(CAIRN, 'packages/core/src/model/types.ts'), 'utf8');
  const photoAsset = types.slice(types.indexOf('export type PhotoAsset'), types.indexOf('export type PhotoAsset') + 3000);
  ok(!/status\s*[?:]|deletedAt|liveness/.test(photoAsset.slice(0, photoAsset.indexOf('};'))),
    'A-65 Part 3 clause 3: `PhotoAsset` gained no liveness field (§10.1 point 4, refused a second time)');
}

// --------------------------------------------------------------------------- §K

head('§K — **A-66 U1 … U5**');
{
  // U1/U2 are §C above, on five files with the switch after file 2. U3 is the delete face.
  const [p, store] = mk();
  await store.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
  const A = store.getState().doc.id;
  await store.flush();
  p.photo.next = [file('1.jpg'), file('2.jpg'), file('3.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick(); await tick();
  let unhandled = null;
  const onUnhandled = (e) => { unhandled = String(e); };
  process.on('unhandledRejection', onUnhandled);
  await store.deleteTrip(A);                       // U3 — the trip goes while the batch decodes
  await p.photo.release(3);
  await imp;
  await tick();
  process.off('unhandledRejection', onUnhandled);
  ok(store.getState().photos.failures.length === 0 && unhandled === null,
    'A-66 **U3**: `deleteTrip` mid-decode reports no failure and raises no unhandled rejection',
    { failures: store.getState().photos.failures, unhandled });
  ok(keys(p.photo).length === 0,
    'A-66 **U3** second clause: no byte record is written for any file that had not reached its `write`',
    keys(p.photo));
  ok(store.getState().library.length === 0 && store.getState().doc === null, 'and the trip really went');

  // U4 — the mid-flight file after a break at the DISPATCH guard.
  //
  // **RE-CUT AT ROUND 49 — A-68 Part 9's predicate, clause (i), applied to a line the ruling's own
  // enumeration does not name (QA R49-2).** This is the FOURTH assertion of that class, not the
  // third: A-67 Part 7a named one, round 48 named three (§B, §C and this one), and A-68 Part 9
  // "corrected" the addresses to §B `:210` / §C `:263` and declared §K green. §K was not green —
  // it had never been RUN, because §D's `dispatch` began throwing when A-67 landed and killed the
  // probe there. The predicate finds it; three consecutive enumerations did not.
  const [q, s2] = mk('q');
  for (const t of ['A', 'B']) await s2.createTrip({ title: t, startDate: '2026-08-07', endDate: '2026-08-09' });
  await s2.flush();
  const [qA, qB] = s2.getState().library.map((r) => r.id).sort();
  await s2.openTrip(qA);
  q.photo.next = [file('1.jpg'), file('2.jpg')];
  const imp2 = s2.importPhotos({ kind: 'trip' });
  await tick(); await tick();
  await s2.openTrip(qB);
  await q.photo.release(2);
  await imp2;
  await s2.flush();
  const dA = await stored(q, qA);
  ok(q.photo.thumbs.size === 0 && q.photo.displays.size === 0 && dA.photos.length === 0,
    'A-66 **U4** (re-cut at round 49): the guard precedes the `write`, so NO `[A, photoId]` pair is stranded in either byte store, and no record lands in A (A-66 Part 10 item 2)',
    { thumbs: q.photo.thumbs.size, displays: q.photo.displays.size, recordsInA: dA.photos.map((x) => x.id) });
  ok(client.orphanPhotoBytes(s2.getState()).length === 0 && core.validateTrip(dA).length === 0,
    'and `orphanPhotoBytes` claims nothing while `validateTrip(A)` reports nothing — there is no record to dangle',
    { orphans: client.orphanPhotoBytes(s2.getState()), issues: core.validateTrip(dA).map((i) => i.code) });

  // U5 — the refusal, checkable.
  const reducer = readFileSync(resolve(CAIRN, 'packages/client/src/store/reducer.ts'), 'utf8');
  const decl = reducer.slice(reducer.indexOf('export type PhotoImportFailure'));
  const arms = decl.slice(0, decl.indexOf(';')).match(/'[a-z_]+'/g) ?? [];
  ok(arms.length === 5 && arms.join() === "'unsupported_type','decode_failed','too_large','quota_exceeded','storage_failed'",
    'A-66 **U5**: `PhotoImportFailure` has exactly five string-literal arms, and they are the five §10.6 names',
    arms);
  const clientAll = readdirSync(resolve(CAIRN, 'packages/client/src'), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts'))
    .map((e) => readFileSync(resolve(e.parentPath ?? e.path, e.name), 'utf8')).join('\n');
  ok(!/'trip_changed'|'abandoned'|'cancelled'/.test(clientAll),
    'and no sixth arm has crept in under another name anywhere in `packages/client`');
}

// --------------------------------------------------------------------------- §L

head('§L — the double\'s escaped compound key, and `fromJSON`\'s new NUL refusal');
{
  // R46-6's fix escapes BOTH halves. Fuzz the two properties an array key gives for free:
  // injectivity, and that no trip's key range is a prefix of another's.
  // R46-7, applied to this probe: the separator and the escape are BUILT rather than typed, so
  // this file stays text a reviewer can read in a diff (`test/qa-probes.test.ts` property 2).
  const ESC = String.fromCharCode(1);
  const alphabet = ['a', 'b', 't', '', NUL, ESC, NUL + ESC, ESC + NUL, 'photo-1', '2'];
  const parts = [];
  for (const a of alphabet) for (const b of alphabet) parts.push(a + b);
  const seen = new Map();
  let collision = null;
  for (const t of parts) for (const i of parts) {
    const k = client.photoByteKey(t, i);
    if (seen.has(k) && seen.get(k) !== `${JSON.stringify(t)}|${JSON.stringify(i)}`) {
      collision = { key: JSON.stringify(k), a: seen.get(k), b: `${JSON.stringify(t)}|${JSON.stringify(i)}` };
    }
    seen.set(k, `${JSON.stringify(t)}|${JSON.stringify(i)}`);
  }
  ok(collision === null, `R46-6: \`photoByteKey\` is injective over ${parts.length}² adversarial id pairs`, collision);

  // Prefix-freeness: `removeTrip`'s range is `escape(tripId) + NUL`, so no trip's prefix may
  // start another trip's key. This is what the array key's item-by-item compare gives for free.
  let leak = null;
  for (const t1 of parts) for (const t2 of parts) {
    if (t1 === t2) continue;
    const pre = `${client.photoByteKey(t1, '')}`.slice(0, client.photoByteKey(t1, '').length);
    for (const i of ['x', 'photo-1', NUL]) {
      if (client.photoByteKey(t2, i).startsWith(pre)) leak = { t1: JSON.stringify(t1), t2: JSON.stringify(t2), i: JSON.stringify(i) };
    }
  }
  ok(leak === null, 'and no trip\'s key range is a prefix of another\'s — `removeTrip` cannot reach across', leak);

  // The live end of it, through the port, with the R46-6 shape that used to collide.
  const port = client.memoryPhotos();
  const B = (s) => new TextEncoder().encode(s);
  await port.write('t', 'photo-1', B('own'), B('own'));
  await port.write(`t${NUL}photo-1`, 'x', B('other'), B('other'));
  await port.removeTrip('t');
  ok(port.thumbs.size === 1 && new TextDecoder().decode(await port.read(`t${NUL}photo-1`, 'x', 'thumb')) === 'other',
    'R46-6 measured: `removeTrip("t")` no longer sweeps a record belonging to a trip id of `t` + NUL + `photo-1`',
    { size: port.thumbs.size });

  // `fromJSON`'s refusal, and exactly what it does and does not cover.
  const base = JSON.parse(core.toJSON(core.createTrip(
    { title: 'T', startDate: '2026-08-07', endDate: '2026-08-09', ownerId: 'u1' },
    { ids: core.sequentialIds(), now: '2026-08-07', actorUserId: 'u1' })));
  let refused = null;
  try { core.fromJSON(JSON.stringify({ ...base, id: `t${NUL}x` })); } catch (e) { refused = e.constructor.name; }
  ok(refused === 'TripParseError', 'R46-6: `fromJSON` refuses a trip id carrying U+0000', refused);
  let msg = '';
  try { core.fromJSON(JSON.stringify({ ...base, id: `t${NUL}x` })); } catch (e) { msg = e.message; }
  ok(!msg.includes(NUL) && !/u1|2026-08/.test(msg),
    'and its message carries no document content and no raw NUL (§6.1 rule 1)', JSON.stringify(msg));
  // What it deliberately does NOT cover, recorded so nobody assumes it does.
  let photoOk = true;
  try {
    const withPhoto = core.addPhoto(core.fromJSON(JSON.stringify(base)),
      { id: `p${NUL}x`, caption: '', thumb: { w: 1, h: 1, bytes: 1 }, display: { w: 1, h: 1, bytes: 1 } },
      { ids: core.sequentialIds(), now: '2026-08-07', actorUserId: 'u1' });
    core.fromJSON(core.toJSON(withPhoto));
  } catch { photoOk = false; }
  note(`a PHOTO id carrying U+0000 still round-trips through \`fromJSON\`: ${photoOk} — deliberate,`);
  note('per the `tripId` docstring (*"a `photoId` carrying the separator is still exactly its own');
  note('trip\'s record"*), and the fuzz above confirms it for the escaped double as well.');
  const validate = core.validateTrip(core.fromJSON(JSON.stringify(base)));
  note(`\`validateTrip\` still reports nothing about id charsets (${validate.length} issues on a clean trip) —`);
  note('R46-6 named that as the wider fix and it was not taken. Correct, and recorded.');
}

// --------------------------------------------------------------------------- §M

head('§M — A-62 Part 8 residue 4f\'s third route, reached and RECORDED (not filed)');
{
  const [p, store] = mk();
  await store.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
  const A = store.getState().doc.id;
  await store.flush();
  p.photo.next = [file('1.jpg')];
  const imp = store.importPhotos({ kind: 'trip' });
  await tick(); await tick();
  // The decode resolves INSIDE `deleteTrip`'s cascade — after `removeTrip`, before the reseed.
  const baseRemoveTrip = p.photo.removeTrip.bind(p.photo);
  p.photo.removeTrip = async (id) => { await baseRemoveTrip(id); await p.photo.release(1); };
  await store.deleteTrip(A);
  await imp;
  const left = keys(p.photo);
  note(`bytes left after the delete: ${JSON.stringify(left)}`);
  note('This is R46-1 face 3 reached by a third route, and A-62 Part 8 residue 4f rules it in');
  note('advance: *"a breaker who reaches this state by a third route is measuring a documented');
  note('residue rather than finding a new defect."* Recorded, not filed. The delete completed,');
  note('nothing was reported, and residue 2\'s unbuilt sweep is the stated answer.');
  ok(store.getState().library.length === 0 && store.getState().doc === null && store.getState().photos.failures.length === 0,
    'what IS asserted: the delete completed, and the user is not told `storage_failed` for a trip they deleted',
    { library: store.getState().library.map((r) => r.id), failures: store.getState().photos.failures });
}

// --------------------------------------------------------------------------- §N

head('§N — vacuity controls: this round\'s re-cut lines go RED under a planted fault');
{
  const plain = () => ({ photo: client.memoryPhotos() });
  // A-65 T1 asserts that the bytes do NOT come back. Plant the refused mechanism — a `remove`
  // that holds the derivatives — and the line must fail. Otherwise it asserts nothing.
  const [p, store] = mk('', plain());
  await store.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const T = store.getState().doc.id;
  const pid = store.getState().doc.photos[0].id;
  p.photo.remove = async () => {};                        // the deferred delete, in one line
  await store.removePhoto(pid);
  store.undo();
  await store.refreshPhotoAvailability();
  const l = listing(store);
  const t1WouldFail = !((await p.photo.read(T, pid, 'thumb')) === null && l.missing === 1);
  ok(t1WouldFail, 'control: with a `remove` that keeps the bytes, A-65 T1\'s assertion goes RED', shape(l));

  // §G's residue-4 line asserts the delete completes. Plant a `storage.delete` that also fails
  // and the trip must survive — residue 4b's *"a failed trip delete is a consistent state"*.
  const [q, s2] = mk('q', plain());
  await s2.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
  const A = s2.getState().doc.id;
  q.photo.next = [file('a.jpg')];
  await s2.importPhotos({ kind: 'trip' });
  await s2.flush();
  q.photo.removeTrip = async () => { throw new Error('IndexedDB: UnknownError'); };
  q.storage.delete = async () => { throw new Error('IndexedDB: UnknownError'); };
  let rejected = false;
  await s2.deleteTrip(A).catch(() => { rejected = true; });
  ok(rejected || s2.getState().library.some((r) => r.id === A),
    'control: when the BRACES fail too, the delete does not silently succeed — residue 4b\'s consistent state',
    { rejected, library: s2.getState().library.map((r) => r.id), bytes: keys(q.photo) });
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL`}`);
process.exit(fails === 0 ? 0 : 1);
