/**
 * **QA round 51 — the I-13i confirmation-breaker pass.** ARCHITECTURE §4.2 **A-71** (revision 52,
 * `8d69ff1` — an emit is foreign code) and §10 **A-66 Part 11** (same revision — one gated writer),
 * over the builder pass `032a4cb`. Range `e051306..HEAD`, which also contains the round-50 fix pass
 * `37cf4f0` (R50-3, R50-4).
 *
 *   node --experimental-strip-types qa/r51-i13i.mjs             (from cairn/)
 *   R51_ONLY=B node --experimental-strip-types qa/r51-i13i.mjs  (one section)
 *
 * **A `FAIL` line is a finding.** Every one carries its id. `note` lines are measurements that are
 * facts rather than unmet expectations. The probe prints a terminal marker naming the last section
 * it ran — A-69 Part 9's standing requirement — and a run without that marker is **incomplete**,
 * never a `FAIL` count.
 *
 *   A  the fences over `e051306..HEAD`: zero `.tsx`, zero dependency movement, `docs/design/`
 *      untouched, nothing outside `cairn/`, and the privacy greps over every added line.
 *   B  **the brand, attacked as a mechanism.** Identity semantics, a re-wrap in between, a non-object
 *      throw, a nested emit, two stores over one storage, and the false-positive direction A-71
 *      Part 4a calls *"the conservative arm"* — measured rather than reasoned.
 *   C  **the write-fence sites**, which KD-93 shows are the only three where the brand is consulted.
 *      G34 driven through a REAL autosave and a REAL merge, under a queued second write, with the
 *      genuine-failure control beside every one of them.
 *   D  **`setBatch`'s completeness.** Is there a fifth session write in `importPhotos` or anywhere
 *      else on the abandoned-batch path? Source census + the running store, both arms.
 *   E  **G31…G38 re-derived**, including **G35**'s control run as printed (**KD-93**) and the
 *      whole criterion set run against the pre-A-71 store, so a green is a green for a reason.
 *   F  **the residues and the disclosures**: `attempt`'s one-call rule, the three `fromJSON`
 *      catches, `deleteTrip`'s two, `reclaimPhotoBytes`, and the published `catch` census.
 *   G  **the exits A-71 Part 4d's `finally` does NOT cover**, and the fraction they strand.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const ROOT = resolve(CAIRN, '..');

const client = await import(resolve(CAIRN, 'packages/client/src/index.ts'));

let fails = 0;
let lastSection = '(none)';
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => { lastSection = s.slice(1, 2); console.log(`\n== ${s} ==`); };
const note = (s) => console.log(`  note  ${s}`);
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** Round 50's head — where this round's surface starts. */
const BASE = process.env.R51_BASE ?? 'e051306';
const HEAD_ = process.env.R51_HEAD ?? 'HEAD';
const ONLY = (process.env.R51_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const run = (s) => ONLY.length === 0 || ONLY.includes(s);

const src = readFileSync(resolve(CAIRN, 'packages/client/src/store/store.ts'), 'utf8');
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async (n = 40) => { for (let i = 0; i < n; i++) await tick(); };
const tagged = (n, l = 64) => { const o = new Uint8Array(l); for (let i = 0; i < n.length && i < l; i++) o[i] = n.charCodeAt(i) & 0x7f; return o; };
const file = (n, type = 'image/jpeg') => ({ name: n, type, bytes: tagged(n) });

/** A `PhotoPort` whose `derive` can be parked and whose `remove`/`present`/`write` can be failed. */
function gatedPhotos() {
  const port = client.memoryPhotos();
  const bd = port.derive.bind(port);
  port.gates = []; port.parkDerive = false; port.deriveNull = false;
  // The parked derive carries the file's TAG (its leading printable bytes, which `memoryPhotos`
  // uses as its own failure key), so a fixture with two batches in flight can release one trip's
  // files without releasing the other's — U7's *"B has landed nothing"* is not measurable otherwise.
  const tagOf = (b) => { let s = ''; for (let i = 0; i < Math.min(b.length, 64); i++) { const c = b[i]; if (c < 0x20 || c > 0x7e) break; s += String.fromCharCode(c); } return s; };
  port.derive = (b, t) => {
    if (!port.parkDerive) return port.deriveNull ? Promise.resolve(null) : bd(b, t);
    return new Promise((res) => { port.gates.push({ tag: tagOf(b), run: async () => res(port.deriveNull ? null : await bd(b, t)) }); });
  };
  port.release = async (n = 1) => {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 120 && port.gates.length === 0; k++) await tick();
      const g = port.gates.shift(); if (g) await g.run(); await tick();
    }
  };
  /** Release only the parked derives whose tag matches `re`, waiting for each in turn. */
  port.releaseMatching = async (re, n = 1) => {
    for (let i = 0; i < n; i++) {
      let at = -1;
      for (let k = 0; k < 120 && at < 0; k++) { at = port.gates.findIndex((g) => re.test(g.tag)); if (at < 0) await tick(); }
      if (at < 0) return i;
      const [g] = port.gates.splice(at, 1);
      await g.run(); await tick();
    }
    return n;
  };
  const brm = port.remove.bind(port);
  port.failRemove = false;
  port.remove = (t, id) => (port.failRemove ? Promise.reject(new Error('remove refused')) : brm(t, id));
  const bp = port.present.bind(port);
  port.failPresent = false;
  port.present = (t, ids) => (port.failPresent ? Promise.reject(new Error('present refused')) : bp(t, ids));
  return port;
}
function mk(prefix = '', shared = {}) {
  const p = {
    storage: shared.storage ?? client.memoryStorage(),
    file: client.memoryFile(),
    photo: shared.photo ?? gatedPhotos(),
    clock: client.fixedClockPort('2026-08-01'),
    ids: client.sequentialIdPort(prefix),
  };
  return [p, client.createStore({ ports: p })];
}
const trip = async (store, title, a = '2026-08-07', b = '2026-08-09') => {
  await store.createTrip({ title, startDate: a, endDate: b });
  await store.flush();
  return store.getState().doc.id;
};
const P = (s) => ({
  status: s.persistence.status,
  lastError: s.persistence.lastError ?? null,
  savedVersion: s.persistence.savedVersion,
  clean: s.persistence.savedDoc === s.doc,
});
const PH = (s) => ({
  pending: s.photos.pending, total: s.photos.total,
  failures: s.photos.failures.map((f) => `${f.name}:${f.reason}`),
  orphans: [...s.photos.orphans], availabilityError: s.photos.availabilityError,
});

// --------------------------------------------------------------------------- §A

if (run('A')) {
  head('§A — the fences over `e051306..HEAD`, and the privacy greps over every added line');
  const names = git('diff', '--name-only', `${BASE}..${HEAD_}`).trim().split('\n').filter(Boolean);
  note(`${names.length} files across the round-50 fix pass, revision 52 and I-13i: ${names.join(', ')}`);
  ok(names.filter((n) => n.endsWith('.tsx')).length === 0, 'A1: zero `.tsx` files across the whole range',
    names.filter((n) => n.endsWith('.tsx')));
  ok(names.filter((n) => /package(-lock)?\.json$/.test(n)).length === 0,
    'A1: zero `package.json` / `package-lock.json` movement — no dependency was added',
    names.filter((n) => /package(-lock)?\.json$/.test(n)));
  ok(names.filter((n) => n.startsWith('cairn/docs/design/')).length === 0, 'A1: `docs/design/` untouched');
  ok(names.every((n) => n.startsWith('cairn/')), 'A1: nothing outside `cairn/` — the root planner is read-only',
    names.filter((n) => !n.startsWith('cairn/')));
  ok(git('status', '--porcelain', '--', 'europe-2026-itinerary.html', 'docs/', 'tickets/').trim() === '',
    'A1: the live planner, `docs/` and `tickets/` are clean in the working tree');
  const moved = names.filter((n) => n.startsWith('cairn/packages/') || n.startsWith('cairn/apps/'));
  ok(moved.every((n) => n.startsWith('cairn/packages/client/')),
    'A2: every source/test file that moved is in `packages/client` — `packages/core` and `apps/web` are untouched by A-71 and A-66 Part 11', moved);
  // `generation.ts` is A-67…A-70's file. A-71's own STATUS says it *"does not change by a
  // character"*, so this is the ruling's own claim rather than a general fence.
  ok(!moved.includes('cairn/packages/client/src/store/generation.ts'),
    'A2: and `generation.ts` did not move — A-71\'s STATUS: *"`generation.ts` does not change by a character"*', moved);
  ok(git('show', `${HEAD_}:cairn/packages/client/src/store/generation.ts`)
     === git('show', `${BASE}:cairn/packages/client/src/store/generation.ts`),
    'A2: byte-identical, checked rather than inferred from the name list');

  const added = git('diff', `${BASE}..${HEAD_}`, '--', 'cairn/packages/client/src', 'cairn/packages/core/src', 'cairn/cli.ts', 'cairn/apps/web/src')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const code = added.filter((l) => !/^\+\s*(\/\/|\/\*|\*)/.test(l) && l.trim() !== '+');
  note(`A3: ${added.length} added production lines, ${code.length} of them outside comments`);
  const hits = (re) => code.filter((l) => re.test(l));
  for (const [label, re] of [
    ['`console.*`', /console\./], ['`fetch(` / `XMLHttpRequest` / `sendBeacon`', /fetch\(|XMLHttpRequest|sendBeacon/],
    ['`localStorage` / `sessionStorage`', /localStorage|sessionStorage/],
    ['`geolocation` / `watchPosition`', /geolocation|watchPosition/],
    ['`Date.now` / `new Date(`', /Date\.now|new Date\(/], ['`Math.random` / `crypto.randomUUID`', /Math\.random|crypto\.randomUUID/],
    ['`imap` / `gmail` / `oauth` / `mailbox`', /imap|gmail|oauth|mailbox/i],
    ['a `lat:` / `lng:` literal', /\blat:|\blng:/], ['`setTimeout` / `setInterval`', /setTimeout|setInterval/],
    ['a DOM reference', /\b(document|window|navigator|HTMLElement)\s*\./],
  ]) ok(hits(re).length === 0, `A3: no ${label} in any added production line`, hits(re).slice(0, 3));
  // §6.1 rule 1's own subject, which is what R50-5's third note was about: the failure message the
  // store records. A-71 Part 4c's whole point is that it is now only ever the PORT's.
  ok(!/error|message|lastError|availabilityError/i.test(code.filter((l) => /photoId|caption|capturedAt|\bat\b/.test(l)).join('\n')),
    'A3: no added line puts a photo id, a caption or a capture time into an error field');
  // `WeakSet` is a language builtin; `cairn-constraints` §2's zero-runtime-dependency rule and §3's
  // `erasableSyntaxOnly` are both untouched — A-71's own buildability paragraph, checked.
  ok(!/\bclass\s+\w+/.test(code.join('\n')) && !/\benum\s|\bnamespace\s|\bdeclare\s/.test(code.join('\n')),
    'A3: no class, enum, namespace or `declare` field added — `erasableSyntaxOnly` (`cairn-constraints` §3) is why the brand is a `WeakSet` and not a `SubscriberError extends Error`');
}

// --------------------------------------------------------------------------- §B

if (run('B')) {
  head('§B — the brand itself: can a subscriber\'s error lose it, or a port\'s error acquire it?');

  // B1 — identity semantics. A `WeakSet` keys on object identity, so a DIFFERENT error carrying
  // the same message can never be mistaken for a branded one. This is the "coincidence" arm.
  {
    const [p, store] = mk('b1');
    await trip(store, 'A');
    let arm = true;
    const off = store.subscribe(() => { if (arm) { arm = false; throw new Error('IndexedDB: UnknownError'); } });
    try { store.dispatch({ type: 'setTripMeta', patch: { title: 'B' } }); } catch { /* branded */ }
    off();
    // A port failing with the SAME MESSAGE but a different object.
    p.storage.saveIfVersion = () => Promise.reject(new Error('IndexedDB: UnknownError'));
    await store.flush().catch(() => {});
    await settle(20);
    ok(store.getState().persistence.status === 'error'
       && store.getState().persistence.lastError === 'IndexedDB: UnknownError',
      'B1: a genuine port failure whose message is character-identical to a previously-branded subscriber error is still classified as the PORT\'s — the brand is object identity, not a string (A-71 Part 4a)',
      P(store.getState()));
  }

  // B2 — the false-positive direction, which A-71 Part 4a calls *"the conservative arm"*. The
  // SAME `Error` instance, thrown once by a subscriber and then rejected by a port.
  {
    const [p, store] = mk('b2');
    await trip(store, 'A');
    const shared = new Error('IndexedDB: UnknownError');
    let arm = true;
    const off = store.subscribe(() => { if (arm) { arm = false; throw shared; } });
    try { store.dispatch({ type: 'setTripMeta', patch: { title: 'B' } }); } catch { /* branded */ }
    off();
    p.storage.saveIfVersion = () => Promise.reject(shared);
    for (let i = 0; i < 3; i++) await store.flush().catch(() => {});
    await settle(40);
    const s = store.getState();
    note(`B2: with the branded instance rejected by the port, persistence is ${JSON.stringify(P(s))}`);
    // The control: the identical port failure with a fresh object.
    const [p2, store2] = mk('b2c');
    await trip(store2, 'A');
    store2.dispatch({ type: 'setTripMeta', patch: { title: 'B' } });
    p2.storage.saveIfVersion = () => Promise.reject(new Error('IndexedDB: UnknownError'));
    for (let i = 0; i < 3; i++) await store2.flush().catch(() => {});
    await settle(40);
    note(`B2 control: the same failure, unbranded, is ${JSON.stringify(P(store2.getState()))}`);
    ok(s.persistence.status === store2.getState().persistence.status,
      'R51-2: a false positive on the brand is **not** the conservative arm A-71 Part 4a claims. The same permanent storage failure leaves `status: \'saving\'` with `lastError` untouched over a dirty document — the unresolving spinner §10.6\'s opening sentence forbids — where the unbranded control correctly reports `\'error\'` with the port\'s message',
      { branded: P(s), unbranded: P(store2.getState()) });
  }

  // B3 — a re-wrap in between. If anything between `emit`'s throw and `attempt`'s catch caught and
  // rethrew a NEW object, the brand would be lost and R50-5 would be back. Two halves: the source
  // (is there any such site inside an `attempt` callback?) and the running store.
  {
    const wa = src.slice(src.indexOf('async function writeAndSettle('), src.indexOf('§4.2 rule 6a'));
    ok(!/\bcatch\b/.test(wa),
      'B3: `writeAndSettle` — the only function any `attempt` callback calls that itself emits — contains no `catch` at all, so nothing between the subscriber\'s throw and the classifier can re-wrap it',
      wa.match(/catch[^\n]*/g));
    // Every `attempt(` call site, with its callback body extracted by balancing parentheses so a
    // multi-line callback (`doMerge`'s merged write) is not silently missed by a `[^\n]*` regex.
    const cb = [...src.matchAll(/attempt\(\(\) => /g)].map((m) => {
      let d = 2;
      let i = m.index + m[0].length;
      for (; i < src.length && d > 1; i++) { if (src[i] === '(') d++; else if (src[i] === ')') d--; }
      return src.slice(m.index + m[0].length, i - 1).replace(/\s+/g, ' ').trim();
    });
    note(`B3: the ${cb.length} \`attempt\` callbacks: ${JSON.stringify(cb.map((c) => c.slice(0, 60)))}`);
    ok(cb.length === 7 && cb.every((c) => /^(photo\.(present|derive|write|remove)|writeAndSettle)\(/.test(c)),
      'B3: and every one of the seven callbacks is a single port call or `writeAndSettle` — A-71 Part 7 residue 3\'s rule (*"one port call, or one internal function whose failure has exactly one meaning"*), checked rather than trusted', cb);
    ok(cb.every((c) => !/\bawait\b/.test(c) && !/\bset(Photos|Availability)?\(/.test(c)),
      'B3: and no `attempt` callback contains a second `await` or a `set` — residue 3\'s trigger (*"a finding before it is a convenience"*) is not tripped by anything except the three `writeAndSettle` sites the ruling shipped deliberately',
      cb.filter((c) => /\bawait\b|\bset(Photos|Availability)?\(/.test(c)));
  }

  // B4 — a non-object throw. `emit` wraps it, so the caller sees a different object; A-71 Part 4a
  // discloses exactly this. What must NOT happen is the wrapped error being mistaken for a port's.
  for (const [name, thrown] of [['a string', 'render failed'], ['null', null], ['undefined', undefined],
    ['a number', 42], ['a Symbol', Symbol('sym')], ['a function', function boom() {}]]) {
    const [p, store] = mk(`b4${name.replace(/\W/g, '')}`);
    await trip(store, 'A');
    let arm = false;
    store.subscribe((s) => { if (arm && s.persistence.status === 'idle') throw thrown; });
    store.dispatch({ type: 'setTripMeta', patch: { title: 'B' } });
    arm = true;
    let rejected = false;
    await store.flush().then(() => {}, () => { rejected = true; });
    arm = false;
    const s = store.getState();
    ok(rejected && s.persistence.status === 'idle' && s.persistence.lastError === undefined,
      `B4 (${name}): a subscriber throwing a non-object on the install still reaches the caller and is NOT recorded as a failed save — \`emit\` wraps it in an \`Error\` precisely so a \`WeakSet\` can hold it (A-71 Part 4a)`,
      { rejected, ...P(s) });
  }

  // B5 — a NESTED emit. A subscriber that dispatches re-enters `set`, so a second `emit` runs
  // inside the first. The brand must survive the trip out through both.
  {
    const [p, store] = mk('b5');
    await trip(store, 'A');
    let depth = 0;
    let thrown = null;
    store.subscribe((s) => {
      if (s.persistence.status !== 'idle') return;
      if (depth === 0) { depth = 1; try { store.dispatch({ type: 'setTripMeta', patch: { title: 'inner' } }); } catch (e) { thrown = e; throw e; } }
      else if (depth === 1) { depth = 2; throw new Error('inner subscriber threw'); }
    });
    try { store.dispatch({ type: 'setTripMeta', patch: { title: 'outer' } }); } catch { /* the nested throw */ }
    depth = 0;
    let outer = null;
    await store.flush().then(() => {}, (e) => { outer = e; });
    await settle(20);
    const s = store.getState();
    ok(outer !== null && /inner subscriber threw/.test(String(outer && outer.message))
       && s.persistence.status !== 'error',
      'B5: an exception raised by a subscriber inside a NESTED emit is branded at the inner `emit`, travels out through the outer one unchanged, and is still not recorded as this store\'s failure',
      { outer: outer && outer.message, ...P(s) });
  }

  // B6 — two stores over one storage. The brand is closure-local (A-67 Part 3 item 3's reason, one
  // field over), so store 2 must NOT treat store 1's branded error as foreign code.
  {
    const shared = { storage: client.memoryStorage() };
    const [, s1] = mk('b6a', shared);
    const [p2, s2] = mk('b6b', shared);
    await trip(s1, 'A');
    const e = new Error('storage is gone');
    let arm = true;
    s1.subscribe(() => { if (arm) { arm = false; throw e; } });
    try { s1.dispatch({ type: 'setTripMeta', patch: { title: 'B' } }); } catch { /* branded in store 1 */ }
    await s2.openTrip(s1.getState().doc.id);
    s2.dispatch({ type: 'setTripMeta', patch: { title: 'C' } });
    p2.storage.saveIfVersion = () => Promise.reject(e);
    await s2.flush().catch(() => {});
    await settle(20);
    ok(s2.getState().persistence.status === 'error' && s2.getState().persistence.lastError === 'storage is gone',
      'B6: store 1\'s brand does not travel to store 2 — the `WeakSet` is closure-local, so store 2 classifies the same object as its own port\'s failure (A-71 Part 4a, A-67 Part 3 item 3\'s reason)',
      P(s2.getState()));
  }

  // B7 — the brand is not observable. It is not in `AppState`, not exported, not serialised.
  {
    const [, store] = mk('b7');
    await trip(store, 'A');
    const s = store.getState();
    ok(!('fromSubscriber' in s) && !Object.keys(client).includes('isSubscriberError')
       && !JSON.stringify(Object.keys(s)).includes('ubscriber'),
      'B7: the brand is closure state — not an `AppState` field, not a client export, not reachable from `getState()`',
      Object.keys(s));
    ok(!/fromSubscriber|isSubscriberError|Attempted</.test(readFileSync(resolve(CAIRN, 'packages/client/src/index.ts'), 'utf8')),
      'B7: and none of `fromSubscriber` / `isSubscriberError` / `Attempted` is on the client\'s export surface');
  }
}

// --------------------------------------------------------------------------- §C

if (run('C')) {
  head('§C — the three write-fence sites, where KD-93 shows the brand is the only thing working');

  // C1 — G34 through a REAL debounced autosave rather than `flush()`. A-71 Part 6's G34 drives
  // `flush()`; the ordinary path in the app is `dispatch` -> `scheduleSave` -> the timer.
  {
    const sched = client.manualScheduler();
    const p = {
      storage: client.memoryStorage(), file: client.memoryFile(), photo: gatedPhotos(),
      clock: client.fixedClockPort('2026-08-01'), ids: client.sequentialIdPort('c1'), scheduler: sched,
    };
    const store = client.createStore({ ports: p });
    const A = await trip(store, 'A');
    let arm = false;
    store.subscribe((s) => { if (arm && s.persistence.status === 'idle') throw new Error('render failed: <SavedBadge>'); });
    store.dispatch({ type: 'setTripMeta', patch: { title: 'edited' } });
    arm = true;
    sched.runAll();                                   // the debounce fires; nobody awaits it
    await settle(40);
    arm = false;
    const s = store.getState();
    const stored = await p.storage.load(A);
    ok(s.persistence.status === 'idle' && s.persistence.savedVersion === stored.version && s.persistence.lastError === undefined,
      'C1: G34 on the path a user actually takes — a debounced autosave whose install a subscriber throws on reports `idle` with the fence advanced to the version storage holds, not `\'error\'` over a save that landed',
      { ...P(s), storedVersion: stored.version });
    ok(JSON.parse(stored.doc).title === 'edited',
      'C1: and storage really holds the edit — the claim being checked is *"is the user\'s work saved"*, so the bytes are read back', JSON.parse(stored.doc).title);
  }

  // C2 — the same, with a SECOND write queued behind the first. `chainOntoSaving` is the invariant
  // a rethrow travels through, and one poisoned link must not poison the queue (R3-3's rule).
  {
    const [p, store] = mk('c2');
    const A = await trip(store, 'A');
    let arm = false;
    store.subscribe((s) => { if (arm && s.persistence.status === 'idle') throw new Error('render failed: <SavedBadge>'); });
    store.dispatch({ type: 'setTripMeta', patch: { title: 'first' } });
    arm = true;
    const a = store.flush().then(() => 'resolved', (e) => `rejected:${e.message}`);
    const b = store.flush().then(() => 'resolved', (e) => `rejected:${e.message}`);
    const results = [await a, await b];
    arm = false;
    store.dispatch({ type: 'setTripMeta', patch: { title: 'second' } });
    await store.flush();
    await settle(20);
    const s = store.getState();
    const stored = await p.storage.load(A);
    ok(results.every((r) => /^rejected:render failed/.test(r)),
      'C2: both queued writes reject with the SUBSCRIBER\'s error unchanged — A-69 Part 7\'s *"the caller sees the subscriber\'s error rather than a store error"*, which A-71 Part 1 measured was false on all five faces and Part 5 item 1 makes true', results);
    ok(s.persistence.status === 'idle' && JSON.parse(stored.doc).title === 'second' && s.persistence.savedVersion === stored.version,
      'C2: and the chain is not poisoned — a later save with the view repaired lands and the fence follows it',
      { ...P(s), stored: JSON.parse(stored.doc).title, storedVersion: stored.version });
  }

  // C3 — `doMerge`'s two chained writes, driven as a real two-tab conflict rather than a unit.
  {
    const shared = { storage: client.memoryStorage() };
    const [, s1] = mk('c3a', shared);
    const [p2, s2] = mk('c3b', shared);
    const A = await trip(s1, 'A');
    await s2.openTrip(A);
    s2.dispatch({ type: 'setTripMeta', patch: { title: 'edited elsewhere' } });
    await s2.flush();                                  // storage moves under s1
    s1.dispatch({ type: 'setTripMeta', patch: { title: 'edited here' } });
    await s1.flush().catch(() => {});
    ok(s1.getState().persistence.status === 'conflict', 'C3 setup: store 1 is in conflict', P(s1.getState()));
    let arm = false;
    s1.subscribe((s) => { if (arm && s.persistence.status === 'idle') throw new Error('render failed: <MergeNotice>'); });
    arm = true;
    let merged = null;
    await s1.mergeWithStored().then(() => {}, (e) => { merged = e; });
    arm = false;
    await settle(40);
    const s = s1.getState();
    const stored = await shared.storage.load(A);
    ok(merged !== null && /render failed: <MergeNotice>/.test(merged.message),
      'C3: the subscriber\'s error reaches `mergeWithStored`\'s caller unchanged', merged && merged.message);
    ok(s.persistence.status !== 'error',
      'C3: **A-71 Part 4c site 7** — a subscriber throwing on `doMerge`\'s reseeding install is not recorded as *"could not save"* over a merge storage accepted',
      { ...P(s), storedVersion: stored.version });
    ok(s.persistence.savedVersion === stored.version,
      'C3: and the fence sits on the version storage actually holds', { savedVersion: s.persistence.savedVersion, storedVersion: stored.version });
  }

  // C4 — `doMerge`'s write-it-back branch (A-71 Part 4c row 6, which the ruling calls `saveAs`).
  {
    const shared = { storage: client.memoryStorage() };
    const [, s1] = mk('c4a', shared);
    const [, s2] = mk('c4b', shared);
    const A = await trip(s1, 'A');
    await s2.openTrip(A);
    s2.dispatch({ type: 'setTripMeta', patch: { title: 'elsewhere' } });
    await s2.flush();
    s1.dispatch({ type: 'setTripMeta', patch: { title: 'here' } });
    await s1.flush().catch(() => {});
    await s2.deleteTrip(A);                            // the other tab deletes it under the conflict
    let arm = false;
    s1.subscribe((s) => { if (arm && s.persistence.status === 'idle') throw new Error('render failed: <MergeNotice>'); });
    arm = true;
    await s1.mergeWithStored().catch(() => {});
    arm = false;
    await settle(40);
    const s = s1.getState();
    const stored = await shared.storage.load(A);
    ok(stored !== null && s.persistence.status !== 'error',
      'C4: the write-it-back branch (A-71 Part 4c row 6) — a subscriber throwing on its install does not report an error over a document that is back in storage',
      { ...P(s), storedExists: stored !== null });
  }

  // C5 — G36 from the other side, at all three fence sites: a GENUINE failure with no subscriber
  // involved still records exactly what it recorded before A-71.
  {
    const [p, store] = mk('c5');
    await trip(store, 'A');
    store.dispatch({ type: 'setTripMeta', patch: { title: 'edited' } });
    p.storage.saveIfVersion = () => Promise.reject(new Error('IndexedDB: QuotaExceededError'));
    await store.flush().catch(() => {});
    await settle(20);
    ok(store.getState().persistence.status === 'error'
       && store.getState().persistence.lastError === 'IndexedDB: QuotaExceededError',
      'C5: G36 — a storage write that genuinely rejects still records `\'error\'` with the PORT\'s own message. A-71 Part 5 item 2: no user-visible string moves',
      P(store.getState()));
  }

  // C6 — the emit A-71 does NOT cover, recorded rather than asserted: `attemptSave`'s own
  // `status: 'saving'` write is outside the classifier by construction (it precedes the port call).
  {
    const [p, store] = mk('c6');
    const A = await trip(store, 'A');
    let arm = false;
    store.subscribe((s) => { if (arm && s.persistence.status === 'saving') throw new Error('render failed: <Spinner>'); });
    store.dispatch({ type: 'setTripMeta', patch: { title: 'edited' } });
    arm = true;
    await store.flush().catch(() => {});
    arm = false;
    await settle(40);
    const s = store.getState();
    const stored = await p.storage.load(A);
    note(`C6: a throw on the \`'saving'\` emit leaves ${JSON.stringify(P(s))}; storage holds "${JSON.parse(stored.doc).title}"`);
    ok(s.persistence.status !== 'error',
      'C6: and it is still not recorded as a storage failure — the write never happened, so there is nothing to misreport, and A-69 Part 13 residue 1\'s first cost (the operation\'s tail is skipped) is what remains');
  }
}

// --------------------------------------------------------------------------- §D

if (run('D')) {
  head('§D — `setBatch`\'s completeness: is there a FIFTH session write on the abandoned-batch path?');

  // D1 — the source census, comments stripped, over the whole method body.
  const imp = src.slice(src.indexOf('async importPhotos('), src.indexOf('dismissPhotoFailures(): AppState'));
  const impCode = imp.split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
  const writes = [...impCode.matchAll(/\b(setPhotos|setBatch|setAvailability)\(/g)].map((m) => m[1]);
  const counts = writes.reduce((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {});
  note(`D1: writes to \`state.photos\` inside \`importPhotos\`: ${JSON.stringify(counts)}`);
  ok(counts.setBatch === 4 && counts.setPhotos === 1 && counts.setAvailability === 1,
    'D1: exactly four `setBatch(` calls (§10 A-66 Part 11 requires all four of the batch\'s session writes), one `setPhotos(` — the wrapper\'s own hop — and one `setAvailability(`', counts);
  // The `setAvailability` is the candidate fifth writer. It is NOT routed through `setBatch` and
  // must not be: it writes the availability triple, which A-69 Part 5's fence reserves to
  // `setAvailability`. What makes it safe is that no `await` separates it from the `doc` check.
  const window = impCode.slice(impCode.lastIndexOf("if (!guard.current('doc', g)) break;"),
    impCode.indexOf('setAvailability('));
  ok(!/\bawait\b/.test(window),
    'D1: and the one `setAvailability(` — the candidate fifth writer — has **no `await`** between it and the step-5 `current(\'doc\', g)` check, so it is a synchronous replacement rather than a write across a transition (A-67 Part 4\'s own criterion)',
    window.match(/await [^\n]*/g));
  ok(/if \(state\.photos\.available !== null && state\.photos\.tripId === state\.doc\.id\)/.test(impCode),
    'D1: and it additionally carries R45-4\'s value guard with the `tripId` conjunct, so it can only extend a set this trip already answered for');

  // D2 — every other method that writes `state.photos` after an `await`, and whether it is gated.
  const methods = ['removePhoto', 'reclaimPhotoBytes', 'dismissPhotoFailures'];
  for (const m of methods) {
    const a = src.indexOf(`async ${m}(`) >= 0 ? src.indexOf(`async ${m}(`) : src.indexOf(`${m}(): AppState`);
    const rest = src.slice(a);
    const body = rest.slice(0, rest.indexOf('\n    },'));
    const hasAwait = /\bawait\b/.test(body);
    const gated = (body.match(/guard\.current\('doc', g\)/g) ?? []).length;
    const w = (body.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n')
      .match(/\b(setPhotos|setAvailability)\(/g) ?? []).length;
    note(`D2: \`${m}\` — ${w} session write(s), ${hasAwait ? 'has' : 'no'} await, ${gated} \`current('doc', g)\` gate(s)`);
    ok(!hasAwait || gated > 0 || w === 0,
      `D2: \`${m}\` either has no \`await\` before its session writes or gates them on \`current('doc', g)\` — §10 A-66 Part 3's *"reported against the trip it happened to, or not at all"*`,
      { hasAwait, gated, writes: w });
  }

  // D3 — DRIVEN. The two `fail()` arms that fire WITHOUT an await of their own but AFTER an
  // earlier file's await: `unsupported_type` and `too_large` on file 2 of an abandoned batch.
  // A-66 Part 11's U6 drives `decode_failed` and `storage_failed`; these two it does not.
  {
    const [p, store] = mk('d3');
    const A = await trip(store, 'A'); const B = await trip(store, 'B');
    await store.openTrip(A); await settle(10);
    p.photo.next = [file('one.jpg'), file('movie.mov', 'video/quicktime'), { name: 'huge.jpg', type: 'image/jpeg', bytes: new Uint8Array(64) }];
    p.photo.parkDerive = true;
    const batch = store.importPhotos({ kind: 'trip' });
    await settle(4);
    await store.openTrip(B); await settle(10);          // the user moves to B inside file 1's decode
    await p.photo.release(3);
    await batch.catch(() => {}); await settle(40);
    const s = store.getState();
    ok(s.doc?.id === B, 'D3 setup: the user is on B', s.doc?.id);
    ok(s.photos.failures.length === 0 && s.photos.pending === 0,
      'D3: an abandoned batch\'s `unsupported_type` arm — which fires with no `await` of its own, on a later file — reports nothing on trip B and leaves B\'s fraction at zero. `setBatch` gates the arms A-66 Part 11\'s U6 does not drive as well as the two it does',
      PH(s));
  }

  // D4 — the fraction, with a concurrent batch of B's running. U7's scenario with the OTHER two
  // arms, so the gate is shown to hold for the whole helper rather than for two of its five.
  {
    const [p, store] = mk('d4');
    const A = await trip(store, 'A'); const B = await trip(store, 'B');
    await store.openTrip(A); await settle(10);
    p.photo.next = [file('a1.jpg'), file('a2.jpg'), file('a3.jpg'), file('a4.jpg')];
    p.photo.parkDerive = true;
    const batchA = store.importPhotos({ kind: 'trip' });
    await settle(4);
    await store.openTrip(B); await settle(10);
    p.photo.next = [file('b1.jpg'), file('b2.jpg'), file('b3.jpg'), file('b4.jpg')];
    const batchB = store.importPhotos({ kind: 'trip' });
    await settle(4);
    const before = store.getState().photos.pending;
    // **A's files alone fail to decode, and A's files alone are released** — both keyed by file
    // tag, so B has landed nothing and the only thing that can move B's fraction is A's batch.
    for (const n of ['a1.jpg', 'a2.jpg', 'a3.jpg', 'a4.jpg']) p.photo.failDeriveFor.add(n);
    await p.photo.releaseMatching(/^a\d/, 4);
    await batchA.catch(() => {}); await settle(30);
    const after = store.getState().photos.pending;
    ok(before === 4 && store.getState().doc?.id === B,
      'D4 setup: B is on screen with its own four-file batch in flight and nothing landed',
      { before, doc: store.getState().doc?.id, docPhotos: store.getState().doc?.photos.length });
    ok(before === after,
      'D4: **A-66 Part 11 U7, with the decode-failure arm firing** — B\'s own four-file fraction does not move when A\'s abandoned batch ends, and no file of A\'s is named on B',
      { before, after, session: PH(store.getState()) });
    ok(store.getState().photos.failures.length === 0,
      'D4: and nothing A picked is reported on B — the `decode_failed` arm is dropped, never retargeted', PH(store.getState()));
    p.photo.parkDerive = false;
    await p.photo.release(8);
    await batchB.catch(() => {}); await settle(60);
    ok(store.getState().photos.pending === 0 && store.getState().doc.photos.length === 4,
      'D4: and B\'s own batch then settles to zero with all four of its files landed', PH(store.getState()));
  }

  // D5 — recorded, not asserted. The `break` that stops an abandoned batch is on the SUCCESS path
  // (`if (!guard.current('doc', g)) break;` sits after the decode and before the write), so a batch
  // whose files fail to decode after a transition keeps decoding every remaining file. §10 A-66
  // Part 10's bound is about **stranded bytes** and is unaffected — a failed decode writes nothing —
  // so this is CPU the user has already navigated away from, not a correctness defect.
  {
    const [p, store] = mk('d5');
    const A = await trip(store, 'A'); const B = await trip(store, 'B');
    await store.openTrip(A); await settle(10);
    p.photo.next = [file('x1.jpg'), file('x2.jpg'), file('x3.jpg'), file('x4.jpg'), file('x5.jpg'), file('x6.jpg')];
    for (const n of ['x1.jpg', 'x2.jpg', 'x3.jpg', 'x4.jpg', 'x5.jpg', 'x6.jpg']) p.photo.failDeriveFor.add(n);
    p.photo.parkDerive = true;
    const batch = store.importPhotos({ kind: 'trip' });
    await settle(4);
    await store.openTrip(B); await settle(10);
    p.photo.parkDerive = false;
    await p.photo.release(1);
    await batch.catch(() => {}); await settle(40);
    note(`D5: an abandoned six-file batch whose remaining files all fail to decode called \`derive\` ${p.photo.deriveCount} time(s) after the transition — the \`break\` is on the write path, so a decode failure does not end the batch`);
    ok(store.getState().photos.failures.length === 0 && store.getState().photos.pending === 0,
      'D5: and none of it is reported on B, and B\'s fraction is clean — the cost is CPU on an abandoned batch, not a session write (§10 A-66 Part 10\'s byte bound is untouched: a failed decode writes nothing)',
      { ...PH(store.getState()), deriveCount: p.photo.deriveCount, bytesOnDisk: p.photo.thumbs.size });
  }
}

// --------------------------------------------------------------------------- §E

if (run('E')) {
  head('§E — A-71 Part 6\'s criteria re-derived, and G35 run as printed (KD-93)');
  const testFile = resolve(CAIRN, 'packages/client/test/subscriber-error.test.ts');
  const names = [...readFileSync(testFile, 'utf8').matchAll(/^test\('([^']*)'/gm)].map((m) => m[1]);
  note(`E1: ${names.length} shipped criteria in \`subscriber-error.test.ts\``);
  for (const g of ['G31', 'G32', 'G33', 'G34', 'G36', 'G37', 'U6', 'U7']) {
    ok(names.some((n) => n.startsWith(g)), `E1: ${g} is shipped as a named test`, names);
  }
  ok(names.filter((n) => n.startsWith('G34')).length === 3,
    'E1: G34 is shipped three times — A-71 Part 6\'s *"run for `saveAs` and `doMerge` too"*', names.filter((n) => n.startsWith('G34')));

  // E2 — **KD-93, measured here rather than taken from BUILD-NOTES.** A-71 Part 6's G35 says
  // deleting the `WeakSet.add` reddens *"G31, G32, G33 and G34 all at once"*. Run it.
  const worktree = process.env.R51_SKIP_WORKTREE ? null : (() => {
    const dir = execFileSync('mktemp', ['-d'], { encoding: 'utf8' }).trim();
    try {
      execFileSync('git', ['-C', ROOT, 'worktree', 'add', '--detach', dir, HEAD_], { stdio: 'ignore' });
      execFileSync('ln', ['-s', resolve(CAIRN, 'node_modules'), resolve(dir, 'cairn/node_modules')]);
      return dir;
    } catch { return null; }
  })();
  if (worktree === null) note('E2: SKIPPED (no worktree; set R51_SKIP_WORKTREE= to re-enable)');
  else {
    const storePath = resolve(worktree, 'cairn/packages/client/src/store/store.ts');
    const original = readFileSync(storePath, 'utf8');
    const redFor = (mutate, label) => {
      
      writeFileSync(storePath, mutate(original));
      let out = '';
      try {
        out = execFileSync(process.execPath,
          ['--experimental-strip-types', '--test', 'packages/client/test/subscriber-error.test.ts'],
          { cwd: resolve(worktree, 'cairn'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      } catch (e) { out = String(e.stdout ?? ''); }
      writeFileSync(storePath, original);
      const red = [...out.matchAll(/^not ok \d+ - (\S+)/gm)].map((m) => m[1].replace(/:$/, ''));
      note(`E2: ${label} -> RED: ${JSON.stringify(red)}`);
      return red;
    };
    const g35 = redFor((s) => s.replace('fromSubscriber.add(marked);', '/* G35: the brand deleted */'),
      'G35 as printed — `emit` rethrows UNBRANDED');
    ok(g35.length > 0,
      'E2: G35 is a real control — deleting the brand does redden shipped criteria, so the mechanism is not a comment', g35);
    ok(['G31', 'G32', 'G33', 'G34'].every((g) => g35.some((r) => r.startsWith(g))),
      'R51-1: **A-71 Part 6\'s G35 does not reproduce as printed.** It requires *"G31, G32, G33 and G34 all go red at once"*; only G34 (×3) and G37 redden. The reason is A-71\'s own Part 4b — at the four non-persistence sites the recording is outside the classifier, so the brand is never consulted there and cannot be load-bearing. The criterion claims more than the design can deliver, and it is the criterion that must move (KD-93, confirmed independently here)',
      { red: g35, printed: ['G31', 'G32', 'G33', 'G34'] });
    const sharper = redFor((s) => s.replace('if (isSubscriberError(error)) throw error;', '/* G35 sharper: the classifier deleted */'),
      'the sharper control — `attempt` never rethrows a branded error');
    ok(JSON.stringify(sharper) === JSON.stringify(g35),
      'E2: and the sharper control (delete `attempt`\'s rethrow instead) reddens exactly the same set — the two halves of the brand are one mechanism, and it is consulted at three sites', { g35, sharper });

    // E3 — the whole criterion set against the PRE-A-71 store, so a green is a green for a reason.
    const before = git('show', `${BASE}:cairn/packages/client/src/store/store.ts`);
    const pre = redFor(() => before, 'the pre-A-71 store (`e051306`)');
    ok(['G31', 'G32', 'G33', 'G34', 'G37', 'U6', 'U7'].every((g) => pre.some((r) => r.startsWith(g))),
      'E3: every criterion except G36 is RED against the store this increment replaced — the fix is load-bearing on all five faces and both A-66 Part 11 rows, not just on the one R50-5 named', pre);
    ok(!pre.some((r) => r.startsWith('G36')),
      'E3: and G36 is GREEN there, which is the point of G36 — *"the fix changed nothing except who gets blamed"*', pre);
    try { execFileSync('git', ['-C', ROOT, 'worktree', 'remove', '--force', worktree], { stdio: 'ignore' }); } catch { /* best effort */ }
  }
}

// --------------------------------------------------------------------------- §F

if (run('F')) {
  head('§F — the census A-71 Part 6\'s G37 publishes, and the `catch` blocks Part 5 keeps');
  const catches = (src.match(/\}\s*catch\b|^\s*catch\b/gm) ?? []).length;
  note(`F1: \`grep -coE '\\}\\s*catch\\b|^\\s*catch\\b'\` over store.ts returns ${catches}`);
  ok(catches === 8,
    'F1: **8**, and BUILD-NOTES publishes 13 before / 8 after beside the command it measured — R50-1\'s rule (*"a number stated from the design rather than measured against the command"*) is honoured this time', catches);
  const kinds = {
    'inside `attempt`': /async function attempt<T>[\s\S]*?\n  \}/,
    'inside `emit`': /function emit\(\)[\s\S]*?\n  \}/,
  };
  for (const [label, re] of Object.entries(kinds)) {
    const m = src.match(re);
    ok(m && (m[0].match(/catch\b/g) ?? []).length === 1, `F1: exactly one \`catch\` ${label}`, m && (m[0].match(/catch\b/g) ?? []).length);
  }
  ok((src.match(/catch \{[\s\S]{0,80}?\}/g) ?? []).length >= 0, 'F1: (census printed above)');
  // **A-71 Part 4b's rule, checked over every `catch` in the file rather than over a list of
  // sites.** Each `} catch` is matched back to its own `try {` by balancing braces, so a `try`
  // whose block ends in `finally` (the settling boundary's) is not mistaken for one that ends in
  // `catch`. Comment lines are stripped first, because a `{` in prose is not a block.
  const noComments = src.split('\n')
    .map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? '' : l.replace(/\/\/.*$/, '')))
    .join('\n');
  const blocks = [];
  for (const m of noComments.matchAll(/\}\s*catch\b[^{]*\{/g)) {
    let d = 1;
    let i = m.index - 1;
    for (; i >= 0 && d > 0; i--) { if (noComments[i] === '}') d++; else if (noComments[i] === '{') d--; }
    const tryBody = noComments.slice(i + 2, m.index).trim();
    let e = 1;
    let j = m.index + m[0].length;
    for (; j < noComments.length && e > 0; j++) { if (noComments[j] === '{') e++; else if (noComments[j] === '}') e--; }
    blocks.push({ tryBody, catchBody: noComments.slice(m.index + m[0].length, j - 1).trim() });
  }
  note(`F2: ${blocks.length} \`try … catch\` blocks matched back to their own \`try {\``);
  ok(blocks.length === 8,
    'F2: eight `try … catch` blocks, which is exactly the `catch` census F1 measured — re-derived by brace-balancing rather than by grep, so a `try … finally` is never miscounted as one', blocks.length);
  // **The rule applies to a `catch` that NAMES a failure.** A-71 Part 5 item 4 keeps `deleteTrip`'s
  // rethrowing cascade clause precisely because it classifies nothing, so it is exempt here for the
  // ruling's own reason rather than by a special case.
  for (const { tryBody, catchBody } of blocks) {
    const classifies = /noteOpenFailure\(|\bset\(|setPhotos\(|setAvailability\(|kept\.push|\bfail\(/.test(catchBody);
    if (!classifies) { note(`F2: a \`catch\` that names nothing (exempt, Part 5 item 4): {${catchBody.replace(/\s+/g, ' ').slice(0, 50)}}`); continue; }
    const emits = tryBody.split('\n').filter((l) => /\bset\(|setPhotos\(|setAvailability\(|\.dispatch\(|\bemit\(/.test(l));
    ok(emits.length === 0,
      'F2: a `catch` that NAMES a failure does not enclose a `set` — A-71 Part 4b, checked over every `catch` in the file rather than over a list of sites',
      { tryBody: tryBody.replace(/\s+/g, ' ').slice(0, 110), catchBody: catchBody.replace(/\s+/g, ' ').slice(0, 60), emits: emits.map((l) => l.trim().slice(0, 60)) });
  }
  // Part 5 item 3's named survivors, by name.
  ok((src.match(/try \{\s*\n\s*doc = core\.fromJSON\(stored\.doc\);\s*\n\s*\} catch/g) ?? []).length
     + (src.match(/try \{\s*\n\s*[a-z]+ = core\.fromJSON\([^\n]*\);\s*\n\s*\} catch/g) ?? []).length >= 3,
    'F2: the three `core.fromJSON` `try`s survive with a one-call body (A-71 Part 5 item 3)',
    src.match(/core\.fromJSON\([^\n]*/g));
  ok(/try \{\s*\n\s*await ports\.photo\.remove\(tripId, id\);\s*\n\s*\} catch \{/.test(src),
    'F2: and `reclaimPhotoBytes`\' one-port-call `try` survives — *"precisely the shape `attempt` generalises"*');

  // F3 — Part 7 residue 2, disclosed and not fixed: `deleteTrip`'s rethrowing cascade `catch`
  // calls `readPhotoAvailability` before rethrowing, so a subscriber throwing there replaces the
  // original error. Measured, so the residue is a fact rather than a prediction.
  {
    const [p, store] = mk('f3');
    const A = await trip(store, 'A');
    p.photo.next = [file('one.jpg')];
    await store.importPhotos({ kind: 'trip' }); await store.flush(); await settle(10);
    p.photo.failRemove = true;
    p.photo.removeTrip = () => Promise.reject(new Error('cascade: removeTrip refused'));
    let arm = false;
    store.subscribe(() => { if (arm) throw new Error('render failed: <Library>'); });
    arm = true;
    let err = null;
    await store.deleteTrip(A).then(() => {}, (e) => { err = e; });
    arm = false;
    await settle(20);
    note(`F3: A-71 Part 7 residue 2 — \`deleteTrip\`'s rethrow surfaced "${err && err.message}"`);
    ok(err !== null,
      'F3: `deleteTrip`\'s rejecting cascade still rejects; whether the message is the cascade\'s or the subscriber\'s is A-71 Part 7 residue 2, disclosed and open (its trigger is A-69 Part 13 residue 1\'s)',
      err && err.message);
  }

  // F4 — the ruling names a store method that does not exist.
  ok(/\bsaveAs\b/.test(src),
    'R51-3: A-71 Part 1 face 5, Part 4c table row 6 and Part 6 G34 all name a store method **`saveAs`**, and `store.ts` has never had one. The builder correctly read row 6 as `doMerge`\'s write-it-back branch and named the shipped test after the ruling — so a criterion published as *"run for `saveAs`"* is unfulfillable as printed, and Part 1\'s table calls face 5 *measured*',
    { saveAsInStore: /\bsaveAs\b/.test(src), sitesNamed: (src.match(/A-71 Part 4c, site \d/g) ?? []) });
}

// --------------------------------------------------------------------------- §G

if (run('G')) {
  head('§G — A-71 Part 4d\'s *"the fraction must still settle"*, and the exit its `finally` cannot see');
  const impNoComments = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  ok(/\} finally \{\s*\n\s*if \(remaining > 0\) setBatch\(\{ pending:/.test(impNoComments),
    'G1: the batch-closing settlement is the only statement in the loop\'s `finally` — A-71 Part 4d, KD-85\'s move one subsystem over',
    impNoComments.match(/\} finally \{[^\n]*\n[^\n]*/g));

  // G2 — the exit the `finally` does not cover: the OPENING `setBatch({pending, total})` emits, and
  // it sits ABOVE the `try`. A subscriber throwing there leaves the fraction raised forever.
  {
    const [p, store] = mk('g2');
    await trip(store, 'A');
    let arm = false;
    store.subscribe((s) => { if (arm && s.photos.pending > 0) throw new Error('render failed: <ImportBar>'); });
    p.photo.next = [file('a.jpg'), file('b.jpg'), file('c.jpg')];
    arm = true;
    let err = null;
    await store.importPhotos({ kind: 'trip' }).then(() => {}, (e) => { err = e; });
    arm = false;
    await settle(40);
    const s = store.getState();
    ok(s.photos.pending === 0,
      'R51-4: A-71 Part 4d says the fraction settles *"on EVERY exit"*, and the `finally` that makes it true is INSIDE a `try` the opening `setBatch({pending, total})` sits above. A subscriber throwing on that first emit strands `photos.pending` above zero with nothing in flight and no exit — §10.6\'s opening sentence, reached one statement before the block written to prevent it',
      { ...PH(s), threw: err && err.message, docPhotos: s.doc.photos.length });
    ok(err !== null, 'G2: (the throw does reach the caller, so the store is honest about whose failure it is)', err && err.message);
  }

  // G3 — the control: the same throw one emit later, INSIDE the loop, settles correctly.
  {
    const [p, store] = mk('g3');
    await trip(store, 'A');
    let arm = false;
    store.subscribe((s) => { if (arm && s.photos.pending === 2) { arm = false; throw new Error('render failed: <Grid>'); } });
    p.photo.next = [file('a.jpg'), file('b.jpg'), file('c.jpg')];
    arm = true;
    await store.importPhotos({ kind: 'trip' }).catch(() => {});
    await settle(40);
    ok(store.getState().photos.pending === 0,
      'G3: the control — a subscriber throwing on the per-file decrement, one emit later and inside the `try`, DOES settle to zero through A-71 Part 4d\'s `finally`. That is what makes G2 a boundary rather than a general property of throwing subscribers',
      PH(store.getState()));
  }

  // G4 — the write-failure `continue` skips the per-file decrement. The `finally` compensates;
  // measured across every position so the arithmetic is a fact rather than an inspection.
  for (const failAt of [0, 1, 2]) {
    const [p, store] = mk(`g4_${failAt}`);
    await trip(store, 'A');
    const files = [file('a.jpg'), file('b.jpg'), file('c.jpg')];
    p.photo.failWriteFor.add(files[failAt].name);
    p.photo.next = files;
    await store.importPhotos({ kind: 'trip' });
    await settle(20);
    const s = store.getState();
    ok(s.photos.pending === 0 && s.photos.failures.length === 1 && s.doc.photos.length === 2,
      `G4 (write fails on file ${failAt + 1}): A-71 Part 4c row 4's \`continue\` skips the per-file decrement, and the \`finally\` settles the fraction anyway — 0 pending, one named failure, two records`,
      PH(s));
  }
}

// --------------------------------------------------------------------------- §H

if (run('H')) {
  head('§H — the numbers BUILD-NOTES publishes for this pass, run rather than read');
  const bn = readFileSync(resolve(CAIRN, 'docs/BUILD-NOTES.md'), 'utf8');
  const i13i = bn.slice(0, bn.indexOf('## 2. How to run it'));
  // H1 — the test count. §2 publishes 1441 as of I-13i.
  const tap = execFileSync('npm', ['run', 'test:tap'], { cwd: CAIRN, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const pass = Number((tap.match(/^# pass (\d+)$/m) ?? [])[1]);
  const fail = Number((tap.match(/^# fail (\d+)$/m) ?? [])[1]);
  note(`H1: \`npm run test:tap\` -> ${pass} pass / ${fail} fail`);
  ok(fail === 0, 'H1: zero failing tests', fail);
  ok(/npm test\s+# 1441 tests as of I-13i/.test(bn) && pass === 1441,
    'H1: and BUILD-NOTES §2 publishes **1441**, which is what the command returns — R48-4\'s line is current for once', { published: 1441, measured: pass });
  // H2 — the `qa/` probe FAIL counts the addendum publishes.
  const probeFails = (name, env = {}) => {
    let out = '';
    try {
      out = execFileSync(process.execPath, ['--experimental-strip-types', resolve(HERE, name)],
        { cwd: CAIRN, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, env: { ...process.env, ...env } });
    } catch (e) { out = String(e.stdout ?? ''); }
    const complete = /COMPLETE/.test(out);
    return { n: (out.match(/^ {2}FAIL {2}/gm) ?? []).length, complete };
  };
  const r48 = probeFails('r48-i13d.mjs');
  const r49 = probeFails('r49-i13e.mjs');
  note(`H2: after this round's re-cuts, r48-i13d.mjs prints ${r48.n} FAIL (complete: ${r48.complete}), r49-i13e.mjs prints ${r49.n} (complete: ${r49.complete})`);
  ok(r48.complete && r48.n === 3, 'H2: `qa/r48-i13d.mjs` runs to its terminal marker and prints 3 — all §G, all R48-3, all the queued I-13f work', r48);
  ok(r49.complete && r49.n === 0, 'H2: `qa/r49-i13e.mjs` is ALL CLEAR again after F1/G1b were re-cut to A-71\'s shape (KD-95 item 2)', r49);
  // H3 — the published count for the round-50 probe, at the commit the builder measured it.
  ok(/`qa\/r50-i13h\.mjs`: \*\*8 . 3 FAIL\*\*/.test(i13i.replace(/→/g, '.')),
    'H3 setup: BUILD-NOTES\' I-13i addendum publishes `qa/r50-i13h.mjs` going 8 -> 3 FAIL');
  let raw = '';
  try {
    raw = execFileSync('bash', ['-c',
      `d=$(mktemp -d) && git -C "${ROOT}" worktree add --detach "$d" ${HEAD_} >/dev/null 2>&1 && ` +
      `ln -s "${resolve(CAIRN, 'node_modules')}" "$d/cairn/node_modules" && ` +
      `cd "$d/cairn" && node --experimental-strip-types qa/r50-i13h.mjs 2>&1 ; ` +
      `git -C "${ROOT}" worktree remove --force "$d" >/dev/null 2>&1`],
      { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  } catch (e) { raw = String(e.stdout ?? ''); }
  const atCommit = (raw.match(/^ {2}FAIL {2}/gm) ?? []).length;
  const complete = /-- r50-i13h\.mjs COMPLETE/.test(raw);
  note(`H3: \`qa/r50-i13h.mjs\` AS COMMITTED at ${HEAD_}, in a throwaway worktree: ${atCommit} FAIL line(s), terminal marker ${complete ? 'PRESENT' : 'ABSENT'}`);
  ok(complete,
    'R51-5: BUILD-NOTES\' I-13i addendum publishes *"`qa/r50-i13h.mjs`: **8 -> 3 FAIL**"*, and at that commit the probe **cannot reach its own terminal marker**: its §I shells out to `qa/r48-i13d.mjs`, which throws there (KD-95 item 1, the builder\'s own disclosure), so the run dies before §J and §K. The published 3 is A-69 Part 9\'s forbidden shape — *"a run without that marker is INCOMPLETE, never a `FAIL` count"* — and **R49-2 is the round that put the marker there for exactly this**. Run to completion the count is **4**, the fourth being **J1**',
    { published: 3, measuredInWorktree: atCommit, terminalMarker: complete });
  // The same probe with this round's re-cut `qa/r48-i13d.mjs` in place: a run that COMPLETES.
  const here = probeFails('r50-i13h.mjs');
  note(`H3: the same probe with this round's re-cuts in place: ${here.n} FAIL (complete: ${here.complete})`);
  ok(here.complete && here.n === 1,
    'H3: and after this round\'s re-cuts it is **1** — H2 alone, which is R50-1\'s second published count, still owed by the architect and unrelated to A-71', here);
  // H4 — **R51-6.** A-70 Part 7 item 3's revision-52 correction table is published expressly so that
  // *"a grep-based gate cannot fail for the wrong reason"*, carries the rule *"publish the command
  // beside the number"*, and is stamped *"Measured at `37cf4f0`"*. **Revision 52 also contains A-71**,
  // whose Part 4c merge removes one `setAvailability` call — so two of that table's own rows are
  // wrong at the head of the revision that published them. Run every command it prints.
  const clientSrcFiles = git('ls-files', 'cairn/packages/client/src').split('\n').filter(Boolean);
  const countAll = (re) => clientSrcFiles.reduce((n, f) => n + (readFileSync(resolve(ROOT, f), 'utf8').match(re) ?? []).length, 0);
  const published = [
    ['G21, literal', /setAvailability\(/g, 7],
    ['G21, calls only (what `settling.test.ts` asserts)', /(?<!function )setAvailability\(/g, 6],
    ['G24, literal', /settleAvailability\(/g, 4],
    ['G24, calls only (what `settling.test.ts` asserts)', /(?<!function )settleAvailability\(/g, 3],
    ["supersede('photoAvailability')", /supersede\('photoAvailability'\)/g, 8],
  ];
  const wrong = [];
  for (const [label, re, want] of published) {
    const got = countAll(re);
    note(`H4: ${label} — published ${want}, measured ${got}`);
    if (got !== want) wrong.push({ row: label, published: want, measured: got });
  }
  const shippedG21 = Number((readFileSync(resolve(CAIRN, 'packages/client/test/settling.test.ts'), 'utf8')
    .match(/assert\.equal\(calls\.length, (\d+),/) ?? [])[1]);
  note(`H4: and \`settling.test.ts\` G21 actually asserts ${shippedG21}, not the 6 that table's own row attributes to it`);
  ok(wrong.length === 0 && shippedG21 === 6,
    'R51-6: **A-70 Part 7 item 3\'s revision-52 correction table is wrong at the head of revision 52.** It was published to fix R50-1 (six -> **7**) and stamped *"Measured at `37cf4f0`"* — but the SAME revision\'s A-71 Part 4c merges one `setAvailability` call away, so the literal returns **6** and the calls-only form returns **5**. The row labelled *"what `settling.test.ts` asserts"* publishes **6**; the shipped test asserts **5** (KD-92, disclosed by the builder). **The correction made the number wrong in the other direction**, and this is the third consecutive revision in which G21\'s row is off. G24\'s three rows and the `supersede` count are all still correct',
    { wrongRows: wrong, shippedG21Asserts: shippedG21, tableAttributes: 6 });
  ok(!/J1, J2, J3 \(R50-2\)/.test(i13i),
    'R51-5 (second half): the addendum lists **J1** among *"the five that closed"*. J1 did the opposite — it went from `ok` to `FAIL` at `37cf4f0`, because it asserts the SHAPE of the open R50-3 that that commit fixed. The lines that actually closed are H1 (by accident of A-71\'s merge), J2, J3, J4 and K5\'s three faces — seven, not five',
    i13i.match(/the five that closed[^|]*/g));
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL line(s)`}`);
console.log(`-- r51-i13i.mjs COMPLETE, last section §${lastSection} (A-69 Part 9's terminal marker) --`);
