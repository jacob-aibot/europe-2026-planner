/**
 * **QA round 50 — the I-13g/I-13h confirmation-breaker pass.** ARCHITECTURE §4.2 **A-69**
 * (revision 50, `3de0251`) and **A-70** (revision 51, `63dbd29`), over the builder passes
 * `ae075db` (I-13g) and `e051306` (I-13h). Range `4398de5..HEAD`.
 *
 *   node --experimental-strip-types qa/r50-i13h.mjs             (from cairn/)
 *   R50_ONLY=C node --experimental-strip-types qa/r50-i13h.mjs  (one section)
 *
 * **A `FAIL` line is a finding.** Every one carries its id. `note` lines are measurements that
 * are facts rather than unmet expectations. The probe prints a terminal marker naming the last
 * section it ran — A-69 Part 9's standing requirement — and a run without that marker is
 * **incomplete**, never a `FAIL` count.
 *
 *   A  the fences over `4398de5..HEAD`: zero `.tsx`, zero dependency movement, `docs/design/`
 *      untouched, nothing outside `cairn/`, and the privacy greps over every added line.
 *   B  **site S1 attacked as a MECHANISM, not as a list.** Is `settling(...)` applied to every
 *      method of the returned object? Proved by runtime identity over all 29 keys, plus the
 *      prototype/symbol census, the non-native-thenable hole, and the `this`-binding residue.
 *   C  **A-70's eaten retry, under real concurrent conditions.** The exact trace KD-84 face 1
 *      describes, in six orderings, plus the freshness oracle: an `availabilityError` on display
 *      must be the message of the store's OWN most recent read.
 *   D  **KD-89 assessed independently** — the transient `'missing'` during import, measured per
 *      emitted state rather than taken on report, with its three would-be escalations tried.
 *   E  **the type fence, verified by exhaustive grep** across `packages/`, `apps/web` and
 *      `cli.ts` rather than trusted, plus the excess-property escape hatches.
 *   F  **long chains against the NEW mechanism**: sequences of 5–8 gestures with the freshness
 *      oracle applied after every drain, and the two-store fixture against `availabilityAt`.
 *   G  **termination and cost**, including the subscriber-driven bump A-69's termination
 *      argument does not cover.
 *   H  the published grep counts, run **literally** as A-70 Part 7 item 3 prints them.
 *   I  `qa/r48-i13d.mjs`'s new `FAIL` lines, attributed.
 *   K  **R49-5's throwing subscriber** on the installing transitions, and **G12's**
 *      stale-but-present answer — the one case a narrowed predicate could have broken.
 *   J  **the session block A-69 Part 5 does NOT fence** — `failures`, `pending`, `orphans` across
 *      a transition, which is §10 A-66 Part 3's rule at three ungated sites.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const ROOT = resolve(CAIRN, '..');

const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
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

const BASE = process.env.R50_BASE ?? '43d0d20';
const HEAD_ = process.env.R50_HEAD ?? 'e051306';
const ONLY = (process.env.R50_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const run = (s) => ONLY.length === 0 || ONLY.includes(s);
const NUL = String.fromCharCode(0);

const tagged = (n, l = 64) => { const o = new Uint8Array(l); for (let i = 0; i < n.length && i < l; i++) o[i] = n.charCodeAt(i) & 0x7f; return o; };
const file = (n, type = 'image/jpeg') => ({ name: n, type, bytes: tagged(n) });
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async (n = 60) => { for (let i = 0; i < n; i++) await tick(); };
const listing = (store, ref = { kind: 'trip' }) => client.photosFor(store.getState(), ref);
const src = readFileSync(resolve(CAIRN, 'packages/client/src/store/store.ts'), 'utf8');

/**
 * The round-48/49 gated `PhotoPort`, plus the two things this round needs: a `present` whose
 * FAILURES carry a monotone id (the freshness oracle in §C/§F reads it) and a `derive` that can
 * be made to fail or to park.
 */
function gatedPhotos() {
  const port = client.memoryPhotos();
  const bd = port.derive.bind(port);
  port.gates = []; port.parkDerive = false; port.deriveNull = false;
  // `deriveNull` is read at RESOLUTION time, not at call time, so a decode can be made to fail
  // after a transition has landed inside it — which is §J's whole fixture.
  port.derive = (b, t) => {
    if (!port.parkDerive) return port.deriveNull ? Promise.resolve(null) : bd(b, t);
    return new Promise((res) => { port.gates.push(async () => res(port.deriveNull ? null : await bd(b, t))); });
  };
  port.release = async (n = 1) => {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 80 && port.gates.length === 0; k++) await tick();
      const g = port.gates.shift(); if (g) await g(); await tick();
    }
  };
  const bp = port.present.bind(port);
  port.presentGates = []; port.slowPresent = false; port.presentCalls = 0;
  port.failPresent = false; port.failSeq = 0; port.lastFailMessage = null;
  port.present = (t, ids) => {
    port.presentCalls++;
    if (port.failPresent) {
      port.failSeq++;
      const msg = `present refused #${port.failSeq}`;
      port.lastFailMessage = msg;
      const rejected = Promise.reject(new Error(msg));
      if (!port.slowPresent) return rejected;
      rejected.catch(() => {});
      return new Promise((res, rej) => { port.presentGates.push({ run: async () => rej(new Error(msg)), fail: rej }); });
    }
    if (!port.slowPresent) return bp(t, ids);
    const answer = bp(t, ids);
    return new Promise((res, rej) => { port.presentGates.push({ run: async () => res(await answer), fail: (e) => rej(e) }); });
  };
  const brm = port.remove.bind(port);
  port.removeGates = []; port.slowRemove = false; port.failRemove = false;
  port.remove = (t, id) => {
    if (port.failRemove) return Promise.reject(new Error('remove refused'));
    return port.slowRemove
      ? new Promise((res, rej) => { port.removeGates.push({ run: async () => res(await brm(t, id)), fail: rej }); })
      : brm(t, id);
  };
  port.releaseRemove = async (n = 1) => {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 80 && port.removeGates.length === 0; k++) await tick();
      const g = port.removeGates.shift(); if (g) await g.run(); await tick();
    }
  };
  const bwt = port.removeTrip.bind(port);
  port.removedTrips = [];
  port.removeTrip = async (id) => { port.removedTrips.push(id); return bwt(id); };
  return port;
}
function gatedStorage() {
  const s = client.memoryStorage();
  const bl = s.load.bind(s);
  s.loadGates = []; s.slowLoad = false; s.failLoadFor = new Set();
  s.load = (id) => {
    if (s.failLoadFor.has(id)) return Promise.reject(new Error(`load refused for ${id}`));
    return s.slowLoad ? new Promise((res) => { s.loadGates.push(async () => res(await bl(id))); }) : bl(id);
  };
  const bdel = s.delete.bind(s);
  s.failDeleteFor = new Set();
  s.delete = (id) => (s.failDeleteFor.has(id) ? Promise.reject(new Error(`delete refused for ${id}`)) : bdel(id));
  return s;
}
function mk(prefix = '', shared = {}) {
  const p = {
    storage: shared.storage ?? gatedStorage(),
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
const liveState = (store) => {
  const s = store.getState();
  return {
    doc: s.doc?.id ?? null,
    available: s.photos.available === null ? null : [...s.photos.available],
    availabilityError: s.photos.availabilityError,
    phase: s.doc ? client.photosFor(s, { kind: 'trip' }).phase : 'n/a',
  };
};
/** A-69 Part 11's claim, as a predicate over public state. */
const isLive = (store) => {
  const s = store.getState();
  return s.doc === null || s.photos.available !== null || s.photos.availabilityError !== null;
};

/**
 * **The freshness oracle — this round's own, and it is A-70's third face made mechanical.**
 *
 * A-70 Part 1: *"the message is not merely stale, it is about a different subject."* So: at rest,
 * if the store is showing an `availabilityError`, it must be the message its OWN most recent
 * failing read produced. A displayed message older than the last read this store issued is the
 * store answering a question it was not asked. Returns `null` when clean, or the mismatch.
 */
const staleAnswer = (store, port) => {
  const s = store.getState();
  if (s.doc === null) return null;
  if (s.photos.availabilityError === null) return null;
  if (port.lastFailMessage === null) return { shown: s.photos.availabilityError, lastRead: null };
  return s.photos.availabilityError === port.lastFailMessage
    ? null
    : { shown: s.photos.availabilityError, lastRead: port.lastFailMessage };
};

/** Trip A open, one photograph on disk, availability read **failed** — the A-70 fixture. */
async function failedRead(prefix) {
  const [p, store] = mk(prefix);
  const A = await trip(store, 'A');
  const B = await trip(store, 'B');
  await store.openTrip(A);
  p.photo.next = [file('seed.jpg')];
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  p.photo.failPresent = true;
  await store.refreshPhotoAvailability();
  p.photo.failPresent = false;
  return { p, store, A, B };
}

// --------------------------------------------------------------------------- §A

if (run('A')) {
  head('§A — the fences over `43d0d20..HEAD` (revisions 50 + 51, the I-13g and I-13h builds)');
  const names = git('diff', '--name-only', `${BASE}..${HEAD_}`).split('\n').filter(Boolean);
  ok(names.filter((n) => n.endsWith('.tsx')).length === 0, 'zero `.tsx` files in the range', names.filter((n) => n.endsWith('.tsx')));
  ok(names.filter((n) => n.startsWith('cairn/docs/design/')).length === 0, '`cairn/docs/design/` untouched');
  ok(names.filter((n) => !n.startsWith('cairn/')).length === 0, 'nothing outside `cairn/` moved',
    names.filter((n) => !n.startsWith('cairn/')));
  ok(git('status', '--porcelain', '--', 'europe-2026-itinerary.html', 'docs/', 'tickets/').trim() === '',
    'the live planner, `docs/` and `tickets/` are clean in the working tree');
  ok(git('diff', '--stat', `${BASE}..${HEAD_}`, '--', 'cairn/package.json', 'cairn/package-lock.json').trim() === '',
    '`package.json` / `package-lock.json` zero-line diff — no new dependency');
  const moved = names.filter((n) => n.startsWith('cairn/packages/') || n.startsWith('cairn/apps/'));
  ok(moved.join() === ['cairn/packages/client/src/store/generation.ts', 'cairn/packages/client/src/store/store.ts',
    'cairn/packages/client/test/generation.test.ts', 'cairn/packages/client/test/liveness.test.ts',
    'cairn/packages/client/test/settled-invariant.ts', 'cairn/packages/client/test/settling.test.ts'].join(),
    'exactly six files under `packages/`, all in `packages/client`; `packages/core` and `apps/web` untouched', moved);
  // A-70's STATUS: `generation.ts` moves for the first time in four revisions, by ONE read-only
  // method and nothing else. Measured, not taken from the STATUS line.
  const gd = git('diff', `${BASE}..${HEAD_}`, '--', 'cairn/packages/client/src/store/generation.ts')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const gcode = gd.filter((l) => !/^\+\s*(\/\/|\/\*|\*)/.test(l) && l.trim() !== '+');
  ok(gcode.length === 2 && gcode.every((l) => /sequenceOf/.test(l)),
    'A-70 STATUS: `generation.ts` gains exactly two executable lines — the interface member and the one-line implementation — and both are `sequenceOf`', gcode);
  ok(!/removed|deleted/.test(git('diff', '--stat', `${BASE}..${HEAD_}`, '--', 'cairn/packages/client/src/store/generation.ts')) &&
     git('diff', '--numstat', `${BASE}..${HEAD_}`, '--', 'cairn/packages/client/src/store/generation.ts').trim().split('\t')[1] === '0',
    'A-70 Part 4a: and it DELETES nothing — `claim`/`release`/`observe`/`current`/`supersede` are byte-identical',
    git('diff', '--numstat', `${BASE}..${HEAD_}`, '--', 'cairn/packages/client/src/store/generation.ts').trim());

  const added = git('diff', `${BASE}..${HEAD_}`, '--', 'cairn/packages/client/src', 'cairn/packages/core/src', 'cairn/apps/web/src', 'cairn/cli.ts')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  // Trailing `// …` is stripped as well as whole comment lines: a ban that fires on the word
  // `document` inside a trailing comment is R49-3's shape in a fence.
  const code = added.filter((l) => !/^\+\s*(\/\/|\/\*|\*)/.test(l) && l.trim() !== '+')
    .map((l) => l.replace(/\s*\/\/.*$/, ''));
  note(`${added.length} added production lines, ${code.length} of them outside comments`);
  const bans = [
    ['console.', /console\s*\./], ['fetch(', /\bfetch\s*\(/], ['XMLHttpRequest/sendBeacon', /XMLHttpRequest|sendBeacon/],
    ['localStorage/sessionStorage', /localStorage|sessionStorage/], ['geolocation/watchPosition', /geolocation|watchPosition/],
    ['Date.now / new Date(', /Date\.now|new Date\(/], ['Math.random / randomUUID', /Math\.random|randomUUID/],
    ['imap/gmail/oauth/mailbox', /imap|gmail|oauth|mailbox/i], ['a lat:/lng: literal', /\b(lat|lng)\s*:\s*-?\d/],
    ['setTimeout/setInterval', /setTimeout|setInterval/],
    ['a DOM reference', /\b(document|window|navigator|HTMLElement)\s*\.|createElement\(/],
  ];
  for (const [label, re] of bans) {
    const hits = code.filter((l) => re.test(l));
    ok(hits.length === 0, `no ${label} in any added production line`, hits.slice(0, 3));
  }
  ok(Object.keys(core).length === 83, 'core\'s runtime export surface is still 83', Object.keys(core).length);
  ok(core.SCHEMA_VERSION === 2 && core.SUMMARY_VERSION === 5, '`SCHEMA_VERSION` 2, `SUMMARY_VERSION` 5', { s: core.SCHEMA_VERSION, u: core.SUMMARY_VERSION });
  ok(names.filter((n) => n.startsWith('cairn/qa/')).length === 0,
    'the builder touched no `qa/` probe across this range — A-69 Part 9 and A-70 give those to this round',
    names.filter((n) => n.startsWith('cairn/qa/')));
}

// --------------------------------------------------------------------------- §B

if (run('B')) {
  head('§B — site S1 attacked as a MECHANISM: is `settling(...)` total over the returned object?');
  const [, store] = mk('b0');

  // B1 — the census. Every own key of the returned object, and nothing reachable past it.
  const keys = Object.keys(store);
  const own = Object.getOwnPropertyNames(store);
  ok(keys.length === own.length && own.length === 29,
    `B1: the store has exactly 29 own enumerable keys and no non-enumerable ones`, { keys: keys.length, own: own.length });
  ok(Object.getOwnPropertySymbols(store).length === 0,
    'B1: no symbol-keyed method — `settling`\'s `Object.keys` loop would silently drop one',
    Object.getOwnPropertySymbols(store).map(String));
  ok(Object.getPrototypeOf(store) === Object.prototype,
    'B1: the returned object\'s prototype is `Object.prototype` — no method is reachable past `Object.keys`');

  // B2 — **the mechanism itself**: every function property must BE the wrapper, not the original.
  // `settling` closes over `fn`, so the wrapper's own source is the tell, and it is exhaustive:
  // a method that bypassed the loop would still be its original `async name(...)` form.
  const unwrapped = keys.filter((k) => typeof store[k] === 'function')
    .filter((k) => !/^function \(\.\.\.args\s*\)/.test(store[k].toString()) || !/const result = fn\.apply\(out, args\);/.test(store[k].toString()) || !/settleAvailability\(\); return v;/.test(store[k].toString()));
  ok(unwrapped.length === 0,
    'B2: **every** function on the returned object is `settling`\'s wrapper — checked by source identity over all 29 keys, not by reading the literal', unwrapped);
  const asyncish = keys.filter((k) => store[k].constructor?.name === 'AsyncFunction');
  ok(asyncish.length === 0,
    'B2: and NONE of them is still an `AsyncFunction` — an un-wrapped `async` method would be', asyncish);

  // B3 — the hole a future method could fall through: a non-native thenable is not
  // `instanceof Promise`, so the wrapper would return it unsettled. Measured on the one method
  // that builds its promise by hand rather than with `async`.
  const [, s3] = mk('b3');
  const merged = s3.mergeWithStored();
  ok(merged instanceof Promise,
    'B3: `mergeWithStored` — the one method that is not `async` and still returns a promise — returns a NATIVE promise, so `result instanceof Promise` sees it');
  await merged.catch(() => {});
  const nonAsyncReturningPromise = [...src.matchAll(/\n {4}([A-Za-z]\w*)\([^)]*\): Promise</g)]
    .map((m) => m[1])
    .filter((n) => !new RegExp(`\\n {4}async ${n}\\(`).test(src));
  ok(nonAsyncReturningPromise.join() === 'mergeWithStored',
    'B3: and it is the ONLY one — every other `Promise`-returning method is declared `async`, so its result is native by construction', nonAsyncReturningPromise);

  // B4 — A-69 Part 13 residue 6, measured: the wrapper binds `this`, so a destructured method
  // works where it previously would have thrown. Confirm it is strictly more forgiving.
  const [, s4] = mk('b4');
  const A4 = await trip(s4, 'A');
  const { openTrip, getState } = s4;
  await openTrip(A4);
  ok(getState().doc?.id === A4,
    'B4: A-69 residue 6 — a destructured `openTrip`/`getState` still works; the wrapper is strictly more forgiving than the literal was');

  // B5 — the sync half of A-69 Part 4's argument, ATTACKED rather than accepted: *"none of them
  // writes the availability triple"*. Both bump sites and the one writer are counted, and every
  // one of them is inside an `async` method or an internal `async function`.
  const syncMethods = keys.filter((k) => !/\basync \w+\(/.test('') && true)
    .filter((k) => new RegExp(`\\n {4}${k}\\([^)]*\\): (AppState|boolean|void|\\(\\) =>|DerivedCache)`).test(src));
  note(`the ${syncMethods.length} synchronous methods: ${syncMethods.join(', ')}`);
  const bodyOf = (name) => {
    const i = src.indexOf(`\n    ${name}(`);
    if (i < 0) return '';
    const j = src.indexOf('\n    },', i);
    return src.slice(i, j < 0 ? i + 4000 : j);
  };
  const offenders = syncMethods.filter((k) => /setAvailability\(|supersede\('photoAvailability'\)|claim\('photoAvailability'\)|initialState\(\)/.test(bodyOf(k)));
  ok(offenders.length === 0,
    'B5: no synchronous method writes the availability triple, bumps `photoAvailability`, or reseeds — so A-69 Part 4\'s *"synchronous methods are passed through untouched"* is sound rather than assumed', offenders);

  // B6 — and the same claim from the other side: every `supersede('photoAvailability')` and
  // every reseed lives lexically inside an `async` body.
  const lines = src.split('\n');
  const asyncStarts = lines.map((l, i) => (/^\s*(async function |    async \w+\(|  async function )/.test(l) ? i : -1)).filter((i) => i >= 0);
  const topLevelSync = lines.map((l, i) => [l, i])
    .filter(([l]) => /guard\.supersede\('photoAvailability'\)|\.\.\.initialState\(\)/.test(l) && !/^\s*(\/\/|\*)/.test(l))
    .filter(([, i]) => {
      // the nearest enclosing declaration above must be an async one
      let k = i;
      while (k >= 0 && !/^\s{0,4}(async )?(function )?\w+[({]/.test(lines[k])) k--;
      return !asyncStarts.some((a) => a < i && i - a < 400);
    });
  ok(topLevelSync.length === 0,
    'B6: every `supersede(\'photoAvailability\')` and every `...initialState()` reseed sits inside an `async` body, which is what makes B5 a proof rather than a spot check',
    topLevelSync.map(([l, i]) => `${i + 1}: ${l.trim().slice(0, 60)}`));

  // B7 — the structural fence that stops a method being added OUTSIDE the literal.
  ok((src.match(/\n {2}return settling\(\{/g) ?? []).length === 1 && (src.match(/\n {2}return \{/g) ?? []).length === 0,
    'B7: `createStore` has exactly one `return` of its literal and it is `return settling(`, with no bare `return {` at that indent');
  ok(!/\bstore\.\w+\s*=|Object\.assign\(\s*out|Object\.defineProperty\(\s*out/.test(src),
    'B7: and nothing is bolted onto the wrapped object after the fact — no `Object.assign`, no `defineProperty`');
}

// --------------------------------------------------------------------------- §C

if (run('C')) {
  head('§C — **A-70\'s eaten retry**, built as KD-84 face 1 describes it and driven concurrently');

  // C1 — the trace, verbatim: a `present()` fails, the user taps *Try again*, and an unrelated
  // import's `supersede` fires while the retry is in flight. Under A-69 the retry is eaten and the
  // PREVIOUS failure's message stands. Under A-70 the boundary re-reads.
  {
    const { p, store } = await failedRead('c1');
    const before = liveState(store);
    ok(before.availabilityError === 'present refused #1' && before.available === null,
      'C1 setup: the listing carries the failed read\'s message', before);
    p.photo.slowPresent = true;
    const retry = store.refreshPhotoAvailability();     // the user's own *Try again*
    await settle(4);
    ok(p.photo.presentGates.length === 1, 'C1: the retry is genuinely in flight when the import starts', p.photo.presentGates.length);
    p.photo.next = [file('later.jpg')];
    const imp = store.importPhotos({ kind: 'trip' });   // the interloper, concurrently
    await settle(4);
    // Let the retry's own read arrive — it SUCCEEDS, and the import's supersede has dropped it.
    p.photo.slowPresent = false;
    while (p.photo.presentGates.length > 0) { await p.photo.presentGates.shift().run(); await tick(); }
    await retry; await imp; await settle(40);
    const after = liveState(store);
    ok(after.phase === 'ready' && after.availabilityError === null,
      'C1: **the retry is not eaten** — the listing reaches `ready` rather than re-displaying the previous failure (A-70 Part 4, KD-84 face 1)', after);
    ok(after.available?.length === 2,
      'C1: and the answer covers BOTH the seed and the file imported underneath the retry', after.available);
    ok(staleAnswer(store, p.photo) === null, 'C1: freshness oracle — no message older than this store\'s last read is on display', staleAnswer(store, p.photo));
  }

  // C2 — the SAME race, opposite order: the import's supersede lands FIRST and the retry is issued
  // into the invalidated window.
  {
    const { p, store } = await failedRead('c2');
    p.photo.next = [file('later.jpg')];
    p.photo.parkDerive = true;
    const imp = store.importPhotos({ kind: 'trip' });
    await settle(4);
    const retry = store.refreshPhotoAvailability();
    await settle(2);
    await p.photo.release(1);
    await imp; await retry; await settle(40);
    const st = liveState(store);
    ok(st.phase === 'ready' && st.available?.length === 2,
      'C2: import-then-retry, overlapping, both land and the listing is `ready` over both photographs', st);
    ok(staleAnswer(store, p.photo) === null, 'C2: freshness oracle clean', staleAnswer(store, p.photo));
  }

  // C3 — the retry that FAILS AGAIN under an import. A-70's counter-argument: nothing is masked,
  // and the message must be the FRESH one, not the first failure's.
  {
    const { p, store } = await failedRead('c3');
    p.photo.failPresent = true;
    p.photo.slowPresent = true;
    const retry = store.refreshPhotoAvailability();
    await settle(4);
    p.photo.next = [file('later.jpg')];
    const imp = store.importPhotos({ kind: 'trip' });
    await settle(4);
    p.photo.slowPresent = false;
    while (p.photo.presentGates.length > 0) { await p.photo.presentGates.shift().run().catch(() => {}); await tick(); }
    await retry.catch(() => {}); await imp; await settle(40);
    const st = liveState(store);
    ok(st.phase === 'unreadable', 'C3: a persistently failing port still reports `unreadable` — nothing is masked (A-70 Part 2\'s counter-argument)', st);
    ok(staleAnswer(store, p.photo) === null,
      'C3: **and the message on display is the store\'s OWN most recent read**, not the first failure\'s — A-70 Part 1\'s third face',
      { shown: st.availabilityError, lastRead: p.photo.lastFailMessage });
    note(`C3: ${p.photo.presentCalls} present() calls in total for one seed read, one failed retry and a one-file import`);
  }

  // C4 — the cost bound A-70 Part 2 states: **one** extra `present()` per import batch, whatever
  // the file count, on the previously-failed fixture. G26 asserts three files; five here.
  {
    const { p, store } = await failedRead('c4');
    const base = p.photo.presentCalls;
    p.photo.next = [file('a.jpg'), file('b.jpg'), file('c.jpg'), file('d.jpg'), file('e.jpg')];
    await store.importPhotos({ kind: 'trip' });
    await settle(40);
    ok(p.photo.presentCalls - base === 1,
      'C4: **exactly one** extra `present()` for a FIVE-file batch after a failed read — the repair is per batch, not per file', p.photo.presentCalls - base);
    ok(listing(store).phase === 'ready' && liveState(store).available.length === 6,
      'C4: and all six photographs read `ready`', liveState(store));
  }

  // C5 — three-way: retry in flight, an import, and a `removePhoto` of the seed, all overlapping.
  {
    const { p, store } = await failedRead('c5');
    const seedId = store.getState().doc.photos[0].id;
    p.photo.slowPresent = true;
    const retry = store.refreshPhotoAvailability();
    await settle(4);
    p.photo.next = [file('later.jpg')];
    const imp = store.importPhotos({ kind: 'trip' });
    await settle(2);
    const rm = store.removePhoto(seedId);
    await settle(2);
    p.photo.slowPresent = false;
    while (p.photo.presentGates.length > 0) { await p.photo.presentGates.shift().run(); await tick(); }
    await Promise.allSettled([retry, imp, rm]);
    await settle(60);
    const st = liveState(store);
    ok(st.phase !== 'loading' && st.availabilityError === null,
      'C5: retry + import + remove, all three overlapping — the listing still reaches a terminal, non-error state', st);
    const docIds = store.getState().doc.photos.map((x) => x.id);
    ok(st.available !== null && docIds.every((id) => st.available.includes(id)) && st.available.every((id) => docIds.includes(id)),
      'C5: **and the availability set exactly equals the document\'s records** — no ghost, no photograph on disk reading `missing`',
      { docIds, available: st.available });
  }

  // C6 — §10 A-65 T1 on the previously-failed fixture, which is G27, driven from a DIFFERENT
  // direction: remove, undo, and then a second remove/undo pair, with no refresh anywhere.
  {
    const { p, store } = await failedRead('c6');
    const seedId = store.getState().doc.photos[0].id;
    await store.removePhoto(seedId); await settle(30);
    store.undo(); await settle(30);
    const first = listing(store).items?.[0]?.availability ?? `phase:${listing(store).phase}`;
    await store.removePhoto(seedId); await settle(30);
    store.undo(); await settle(30);
    const second = listing(store).items?.[0]?.availability ?? `phase:${listing(store).phase}`;
    ok(first === 'missing' && second === 'missing',
      'C6: A-65 T1 holds on the failed fixture across TWO remove/undo cycles — never `unreadable`, never a throw', { first, second });
    ok(staleAnswer(store, p.photo) === null, 'C6: freshness oracle clean after both cycles', staleAnswer(store, p.photo));
  }
}

// --------------------------------------------------------------------------- §D

if (run('D')) {
  head('§D — **KD-89 assessed independently**: the transient `\'missing\'` during import');
  const [p, store] = mk('d0');
  const A = await trip(store, 'A');
  await store.openTrip(A);
  p.photo.next = [file('seed.jpg')];
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  await settle(10);
  ok(listing(store).phase === 'ready', 'D setup: availability is a real answer before the batch under test', liveState(store));

  // D1 — record EVERY emitted state during a three-file import and count, per record, how many
  // consecutive emits read `'missing'` over bytes that are already on disk.
  const emits = [];
  const off = store.subscribe((s) => emits.push(client.photosFor(s, { kind: 'trip' })));
  p.photo.next = [file('one.jpg'), file('two.jpg'), file('three.jpg')];
  await store.importPhotos({ kind: 'trip' });
  await settle(20);
  off();
  const perRecord = new Map();
  for (const l of emits) for (const it of l.items ?? []) {
    if (!perRecord.has(it.asset.id)) perRecord.set(it.asset.id, []);
    perRecord.get(it.asset.id).push(it.availability);
  }
  const misreports = [...perRecord.entries()].map(([id, states]) => [id, states.filter((s) => s === 'missing').length]);
  note(`D1: ${emits.length} emitted states during the three-file batch; per-record 'missing' counts: ${JSON.stringify(misreports)}`);
  const worst = Math.max(0, ...misreports.map(([, n]) => n));
  ok(worst <= 1,
    'D1: KD-89 measured — a record misreports `\'missing\'` for **at most one** emitted state, which is the builder\'s disclosure',
    misreports.filter(([, n]) => n > 1));
  const seedStates = [...perRecord.entries()].find(([id]) => id === store.getState().doc.photos[0].id)?.[1] ?? [];
  ok(!seedStates.includes('missing'),
    'D1: and the PRE-EXISTING photograph never misreports — that is R48-1\'s actual subject and it is clean', seedStates);

  // D2 — the escalation that would make KD-89 more than a transient: is there an `await` between
  // the `addPhoto` dispatch and the optimistic `setAvailability`? If there is, the window is a
  // real interval a surface can render inside rather than two statements in one job.
  const imp = src.slice(src.indexOf('async importPhotos('), src.indexOf('dismissPhotoFailures(): AppState'));
  const between = imp.slice(imp.indexOf('this.dispatch({'), imp.indexOf("guard.supersede('photoAvailability');"));
  ok(between.length > 0 && !/\bawait\b/.test(between.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n')),
    'D2: there is **no `await`** between `importPhotos`\' `addPhoto` dispatch and the optimistic `setAvailability` beside it — the two emits are one synchronous job, so no timer, no port and no other gesture can interleave',
    between.match(/await [^\n]*/g));

  // D3 — the escalation that would make it a defect rather than a transient: can the batch END
  // between the two emits, stranding the `'missing'`? Drive a transition to land in every await
  // the loop has, and check the final state of every record in whichever trip holds it.
  {
    const [p3, s3] = mk('d3');
    const A3 = await trip(s3, 'A'); const B3 = await trip(s3, 'B');
    await s3.openTrip(A3);
    p3.photo.next = [file('seed.jpg')];
    await s3.importPhotos({ kind: 'trip' }); await s3.flush(); await settle(10);
    p3.photo.next = [file('x.jpg'), file('y.jpg')];
    p3.photo.parkDerive = true;
    const batch = s3.importPhotos({ kind: 'trip' });
    await settle(4);
    await s3.openTrip(B3);            // the transition lands inside file 1's `derive`
    await p3.photo.release(2);
    await batch; await settle(40);
    ok(listing(s3).phase !== 'loading', 'D3: the trip the user moved to reaches a terminal state', liveState(s3));
    await s3.openTrip(A3); await settle(40);
    const back = listing(s3);
    ok(back.phase === 'ready' && (back.items ?? []).every((x) => x.availability !== 'missing'),
      'D3: **and back in A, no record is stranded at `\'missing\'`** — the transient cannot outlive the batch that produced it',
      (back.items ?? []).map((x) => [x.asset.id, x.availability]));
  }

  // D4 — the third escalation: a WRITE that fails after the record would have been dispatched.
  // If `addPhoto` ran before the write, a failed write would strand a permanent `'missing'`.
  {
    const [p4, s4] = mk('d4');
    const A4 = await trip(s4, 'A');
    await s4.openTrip(A4);
    p4.photo.next = [file('seed.jpg')];
    await s4.importPhotos({ kind: 'trip' }); await settle(10);
    const beforeCount = s4.getState().doc.photos.length;
    const bw = p4.photo.write.bind(p4.photo);
    p4.photo.write = () => Promise.reject(new Error('QuotaExceededError'));
    p4.photo.next = [file('doomed.jpg')];
    await s4.importPhotos({ kind: 'trip' }); await settle(20);
    p4.photo.write = bw;
    ok(s4.getState().doc.photos.length === beforeCount,
      'D4: a failed byte `write` creates **no record** — the dispatch is after the write, so KD-89\'s ordering cannot strand a permanent `\'missing\'`',
      { before: beforeCount, after: s4.getState().doc.photos.length });
    ok(s4.getState().photos.failures.length === 1 && listing(s4).phase === 'ready',
      'D4: the failure is reported once and the listing stays terminal', { failures: s4.getState().photos.failures, phase: listing(s4).phase });
  }
}

// --------------------------------------------------------------------------- §E

if (run('E')) {
  head('§E — the type fence: is the writer set of `photos.available` really closed?');
  const files = git('ls-files', 'cairn/packages', 'cairn/apps', 'cairn/cli.ts').split('\n')
    .filter((f) => /\.(ts|tsx|mts)$/.test(f) && !/\/test\//.test(f) && !/\.test\.ts$/.test(f));
  note(`${files.length} non-test source files searched`);
  const hits = [];
  for (const f of files) {
    const t = readFileSync(resolve(ROOT, f), 'utf8').split('\n');
    t.forEach((l, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
      if (/\bavailable\s*:|availabilityError\s*:/.test(l)) hits.push(`${f}:${i + 1}  ${l.trim().slice(0, 90)}`);
    });
  }
  hits.forEach((h) => note(h));
  // **Classified rather than range-matched**, so a new site cannot slip in by landing on a line
  // number the filter happens to allow. A hit is legitimate iff it is (a) a TYPE declaration,
  // (b) an argument to a `setAvailability(` call — i.e. it goes THROUGH the fence, (c) inside
  // `setAvailability`'s own body, or (d) inside `initialState()`'s reseed, which A-69 Part 5's
  // last paragraph hands to the boundary rather than to the fence.
  const bodyRange = (f, decl) => {
    const t = readFileSync(resolve(ROOT, f), 'utf8').split('\n');
    const a = t.findIndex((l) => l.includes(decl));
    if (a < 0) return [-1, -1];
    let d = 0;
    for (let i = a; i < t.length; i++) {
      d += (t[i].match(/\{/g) ?? []).length - (t[i].match(/\}/g) ?? []).length;
      if (i > a && d <= 0) return [a + 1, i + 1];
    }
    return [a + 1, t.length];
  };
  const [sa0, sa1] = bodyRange('cairn/packages/client/src/store/store.ts', 'function setAvailability(answer: AvailabilityAnswer)');
  const [is0, is1] = bodyRange('cairn/packages/client/src/store/reducer.ts', 'export function initialState()');
  note(`\`setAvailability\` body is store.ts:${sa0}-${sa1}; \`initialState\` is reducer.ts:${is0}-${is1}`);
  // **RE-CUT AT ROUND 51** (BUILD-NOTES KD-95 item 3). `^setAvailability\(` recognised a call only
  // when the whole argument started on the call's own line. §4.2 **A-71** Part 4c merges
  // `readAvailabilityOnce`'s two branches into ONE call over a ternary whose `'ready'` arm is on
  // the *next* line, so a site that goes through the fence read as `**UNCLASSIFIED**` — a probe
  // failing for the shape of the argument rather than for where it is written. The class E1 exists
  // to allow is *"an argument to a `setAvailability(` call"*, so the span of every such call is
  // computed by balancing parentheses and a hit inside one is inside the fence, however the
  // argument is laid out. **This is strictly narrower than a line-range allowance**: a write that is
  // not lexically inside a `setAvailability(...)` argument list still reads UNCLASSIFIED.
  const callSpans = (file) => {
    const t = readFileSync(resolve(ROOT, file), 'utf8');
    const code = t.split('\n').map((l) => l.replace(/^(\s*)\/\/.*$/, '$1')).join('\n');
    const spans = [];
    for (const m of code.matchAll(/(?<!function )setAvailability\(/g)) {
      let d = 1;
      let i = m.index + m[0].length;
      for (; i < code.length && d > 0; i++) {
        if (code[i] === '(') d++;
        else if (code[i] === ')') d--;
      }
      spans.push([code.slice(0, m.index).split('\n').length, code.slice(0, i).split('\n').length]);
    }
    return spans;
  };
  const fenceSpans = { 'cairn/packages/client/src/store/store.ts': callSpans('cairn/packages/client/src/store/store.ts') };
  note(`\`setAvailability(\` call spans in store.ts: ${JSON.stringify(fenceSpans['cairn/packages/client/src/store/store.ts'])}`);
  const classify = (h) => {
    const [f, n] = [h.slice(0, h.indexOf(':')), Number(h.slice(h.indexOf(':') + 1, h.indexOf('  ')))];
    const body = h.slice(h.indexOf('  ') + 2).trim();
    if (/^(\||readonly )?\s*(available|availabilityError)\??: (ReadonlySet<string> \| null|string \| null)|kind: 'ready'; tripId: string; available: ReadonlySet<string>/.test(body)) return 'declaration';
    if (/^setAvailability\(/.test(body)) return 'through the fence';
    if ((fenceSpans[f] ?? []).some(([a, b]) => n >= a && n <= b)) return 'through the fence (a later line of the same call)';
    if (f.endsWith('store/store.ts') && n >= sa0 && n <= sa1) return 'setAvailability body';
    if (f.endsWith('store/reducer.ts') && n >= is0 && n <= is1) return 'initialState reseed';
    return null;
  };
  const outside = hits.filter((h) => classify(h) === null);
  hits.forEach((h) => note(`    ${classify(h) ?? '**UNCLASSIFIED**'}`));
  ok(outside.length === 0,
    'E1: every `available`/`availabilityError` site in non-test source classifies as a declaration, a call THROUGH `setAvailability`, `setAvailability`\'s own body, or `initialState()`\'s reseed — the closed set is really closed', outside);

  // E2 — the escape hatch a `Partial<Omit<…>>` parameter does NOT close: excess-property checking
  // only fires on object LITERALS. A `setPhotos(someVariable)` would compile with `available` on it.
  //
  // **RE-CUT AT ROUND 51** (BUILD-NOTES **KD-94**, judgement re-derived rather than taken).
  // §10 **A-66 Part 11** adds `setBatch` — `(patch: Parameters<typeof setPhotos>[0]) => { if
  // (!guard.current('doc', g)) return; setPhotos(patch); }` — which is the file's **one**
  // `setPhotos(` call taking a variable, and the round-50 form of this line read that as the fence
  // breaking. It is not: `patch` **is** `setPhotos`' own parameter type, so a `setBatch({available:
  // …})` call site fails to compile exactly as `setPhotos({available: …})` does. Verified by
  // compiling it, not by reading it — adding `available: new Set<string>()` to `importPhotos`'
  // opening `setBatch({…})` yields `TS2353: 'available' does not exist in type
  // 'Partial<Omit<PhotoSession, "tripId" | "available" | "availabilityError">>'`. So the property
  // is re-cut in two halves: **every `setPhotos(` argument is a literal EXCEPT the one hop inside a
  // wrapper whose parameter carries the fence's own type**, and **every call to that wrapper passes
  // a literal**. Comments are stripped first — the round-50 form counted a `setPhotos(` inside a
  // block comment as a call site.
  const codeOnly = src.split('\n').map((l) => l.replace(/^(\s*)(\/\/|\*|\/\*).*$/, '$1')).join('\n');
  const argOf = (text, from) => {
    let d = 1;
    let i = from;
    for (; i < text.length && d > 0; i++) { if (text[i] === '(') d++; else if (text[i] === ')') d--; }
    return text.slice(from, i - 1).trim();
  };
  const setPhotosCalls = [...codeOnly.matchAll(/(?<!function )setPhotos\(/g)].map((m) => argOf(codeOnly, m.index + m[0].length));
  const nonLiteral = setPhotosCalls.filter((a) => !a.startsWith('{'));
  ok(nonLiteral.length === 1 && nonLiteral[0] === 'patch',
    'E2: exactly one `setPhotos(` call passes something other than an object **literal**, and it is `setBatch`\'s wrapper hop — every other argument is a literal, so excess-property checking fires on it',
    { calls: setPhotosCalls.map((a) => a.slice(0, 40)), nonLiteral });
  ok(/const setBatch = \(patch: Parameters<typeof setPhotos>\[0\]\): void => \{\s*\n\s*if \(!guard\.current\('doc', g\)\) return;\s*\n\s*setPhotos\(patch\);/.test(src),
    'E2: and that wrapper\'s parameter IS `setPhotos`\' parameter type (`Parameters<typeof setPhotos>[0]`), so the fence is re-imposed at every one of its call sites — the unchecked hop is the one whose argument has already been checked (KD-94)',
    src.match(/const setBatch = [^\n]*/g));
  const setBatchCalls = [...codeOnly.matchAll(/(?<!const )setBatch\(/g)].map((m) => argOf(codeOnly, m.index + m[0].length));
  ok(setBatchCalls.length === 4 && setBatchCalls.every((a) => a.startsWith('{')),
    'E2: and all four `setBatch(` call sites — A-66 Part 11 requires exactly the four session writes `importPhotos` makes — pass object literals, so a fifth writer or a variable argument is a red line',
    setBatchCalls.map((a) => a.replace(/\s+/g, ' ').slice(0, 50)));
  ok(!/setPhotos\([^)]*as (any|unknown|Partial)/.test(src) && !/as unknown as PhotoSession/.test(src)
     && !/setBatch\([^)]*as (any|unknown|Partial)/.test(src),
    'E2: and no call launders its argument through an assertion');

  // E3 — the OTHER way into the triple: a whole-state `set` outside the six reseeds.
  const wholeStateSets = [...src.matchAll(/set\(\{[^\n]*photos:/g)].map((m) => m[0].slice(0, 60));
  ok(wholeStateSets.length === 4,
    'E3: exactly four `set({ … photos: … })` sites in the file and all four are inside `setPhotos`/`setAvailability`', wholeStateSets);
  ok((src.match(/\.\.\.initialState\(\)/g) ?? []).length === 6 || (src.match(/\.\.\.initialState\(\),/g) ?? []).length === 6,
    'E3: and exactly six `...initialState()` reseeds — A-69 Part 5\'s *"the fence closes the incremental writers; the boundary closes the installs"*',
    (src.match(/\.\.\.initialState\(\)/g) ?? []).length);

  // E4 — `AppState` cannot be written from outside: `getState` hands back the live object, so a
  // surface could mutate `state.photos.available` in place. Measured, because it is the one way
  // past both mechanisms and it decides whether the fence is a fence or a convention.
  const [, s4] = mk('e4');
  const A4 = await trip(s4, 'A');
  await s4.openTrip(A4); await settle(10);
  const st = s4.getState();
  let mutated = false;
  try { st.photos.available = null; mutated = st.photos.available === null; } catch { mutated = false; }
  note(`E4: \`getState().photos.available = null\` from outside ${mutated ? 'SUCCEEDS' : 'is refused'} — ${mutated
    ? 'the triple is protected by discipline (`Treat as immutable`), not by a runtime freeze; A-69 Part 5\'s fence is a COMPILE-time fence and says so'
    : 'the object is frozen'}`);
  ok(true, `E4: recorded rather than asserted — no ruling in A-69/A-70 claims a runtime freeze (${mutated ? 'writable' : 'frozen'})`);
}

// --------------------------------------------------------------------------- §F

if (run('F')) {
  head('§F — long chains against the NEW mechanism, with the freshness oracle after every drain');

  /** One gesture, by name, tolerant of every refusal the store is entitled to make. */
  async function gesture(name, ctx) {
    const { p, store, A, B } = ctx;
    const s = store.getState();
    const first = s.doc?.photos?.[0]?.id ?? null;
    try {
      switch (name) {
        case 'openA': return await store.openTrip(A);
        case 'openB': return await store.openTrip(B);
        case 'close': return await store.closeTrip();
        case 'browseB': return await store.browseTrip(B);
        case 'closeBrowse': return await store.closeBrowse();
        case 'import': p.photo.next = [file(`f${ctx.n++}.jpg`)]; return await store.importPhotos({ kind: 'trip' });
        case 'import2': p.photo.next = [file(`g${ctx.n++}.jpg`), file(`h${ctx.n++}.jpg`)]; return await store.importPhotos({ kind: 'trip' });
        case 'remove': return first ? await store.removePhoto(first) : null;
        case 'undo': return store.undo();
        case 'refresh': return await store.refreshPhotoAvailability();
        case 'merge': return await store.mergeWithStored();
        case 'failOn': p.photo.failPresent = true; return null;
        case 'failOff': p.photo.failPresent = false; return null;
        case 'reclaim': return await store.reclaimPhotoBytes(s.photos.orphans);
        case 'rescan': return await store.rescanSummaries();
        case 'flush': return await store.flush();
        default: throw new Error(`no gesture ${name}`);
      }
    } catch { return null; }
  }

  const NAMES = ['openA', 'openB', 'close', 'browseB', 'closeBrowse', 'import', 'import2', 'remove',
    'undo', 'refresh', 'merge', 'failOn', 'failOff', 'reclaim', 'rescan', 'flush'];

  // F1 — a deterministic sweep: every ordered pair of gestures appended to a fixed 3-gesture
  // prefix, on the previously-FAILED fixture, with the oracle after each. 16 x 16 = 256 chains of
  // length 5, all driven to rest.
  let checked = 0; const broken = [];
  for (const a of NAMES) for (const b of NAMES) {
    const { p, store, A, B } = await failedRead(`f-${checked}`);
    const ctx = { p, store, A, B, n: 0 };
    await gesture('import', ctx);
    await gesture(a, ctx);
    await gesture(b, ctx);
    await settle(30);
    checked++;
    const st = store.getState();
    if (!isLive(store)) { broken.push({ chain: ['import', a, b], why: 'not live', st: liveState(store) }); continue; }
    const stale = staleAnswer(store, p.photo);
    if (stale) { broken.push({ chain: ['import', a, b], why: 'stale message', ...stale }); continue; }
    // A-70's strengthened invariant, as a user sees it: with a document open and an answer on
    // display, the answer must match what a fresh read would say.
    if (st.doc && st.photos.available !== null) {
      const docIds = new Set(st.doc.photos.map((x) => x.id));
      const shown = new Set(st.photos.available);
      const ghost = [...shown].filter((i) => !docIds.has(i));
      const absent = [...docIds].filter((i) => !shown.has(i));
      // A ghost is a byte record with no document record and is legitimate (A-65 undo). An
      // ABSENT id is a photograph the document holds that the store says is not on disk — the
      // R48-1 shape, and the one this arc exists for. Only flag it when the bytes really are there.
      const reallyThere = absent.filter((i) => p.photo.thumbs.has(`${st.doc.id}${NUL}${i}`));
      if (reallyThere.length) broken.push({ chain: ['import', a, b], why: 'missing over bytes on disk', reallyThere, ghost });
    }
  }
  ok(broken.length === 0,
    `F1: **${checked} chains of five gestures** on the previously-failed fixture — every one reaches a live, fresh, byte-accurate answer`,
    broken.slice(0, 4));

  // F2 — longer and dirtier: 120 pseudo-random chains of eight, deterministic seed so a failure
  // reproduces. The oracle is the same; the point is depth, which is where this arc's bugs live.
  let seed = 20260904;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const deep = [];
  for (let i = 0; i < 120; i++) {
    const { p, store, A, B } = await failedRead(`d-${i}`);
    const ctx = { p, store, A, B, n: 0 };
    const chain = [];
    for (let k = 0; k < 8; k++) { const g = NAMES[Math.floor(rnd() * NAMES.length)]; chain.push(g); await gesture(g, ctx); }
    await settle(40);
    if (!isLive(store)) { deep.push({ chain, why: 'not live', st: liveState(store) }); continue; }
    const stale = staleAnswer(store, p.photo);
    if (stale) deep.push({ chain, why: 'stale message', ...stale });
  }
  ok(deep.length === 0, 'F2: **120 pseudo-random chains of eight gestures** — every one live, none showing a message older than its own last read', deep.slice(0, 4));

  // F3 — two stores over one storage, against `availabilityAt`. A-70 Part 5 item 4: the stamp is
  // per instance. Store 2's bumps must not make store 1 repair, and must not make it NOT repair.
  {
    const storage = gatedStorage(); const photo = gatedPhotos();
    const [p1, s1] = mk('t1', { storage, photo });
    const [, s2] = mk('t2', { storage, photo });
    const A = await trip(s1, 'A');
    await s1.openTrip(A);
    p1.photo.next = [file('seed.jpg')];
    await s1.importPhotos({ kind: 'trip' }); await s1.flush(); await settle(10);
    await s2.refreshLibrary(); await s2.openTrip(A); await settle(20);
    p1.photo.failPresent = true; await s1.refreshPhotoAvailability(); p1.photo.failPresent = false;
    ok(liveState(s1).phase === 'unreadable', 'F3 setup: store 1 has a failed read', liveState(s1));
    // Store 2 imports. Its supersede is on ITS OWN guard, so store 1's stamp must be untouched.
    p1.photo.next = [file('other.jpg')];
    await s2.importPhotos({ kind: 'trip' }); await settle(30);
    ok(liveState(s1).phase === 'unreadable',
      'F3: store 2\'s byte write does **not** make store 1 repair — `availabilityAt` and the guard are per instance (A-70 Part 5 item 4)', liveState(s1));
    // And store 1's own next write does.
    p1.photo.next = [file('mine.jpg')];
    await s1.importPhotos({ kind: 'trip' }); await settle(30);
    ok(liveState(s1).phase === 'ready',
      'F3: while store 1\'s own byte write **does** — the bump that matters is the one this store took', liveState(s1));
  }

  // F4 — the merge transient (A-68 Part 11) against the new predicate: a merge install writes the
  // triple through a whole-`AppState` set with no stamp. `current(slot, null)` is false, so it must
  // read as unanswered and the boundary must answer it.
  {
    const storage = gatedStorage(); const photo = gatedPhotos();
    const [p1, s1] = mk('m1', { storage, photo });
    const [, s2] = mk('m2', { storage, photo });
    const A = await trip(s1, 'A');
    await s1.openTrip(A);
    p1.photo.next = [file('seed.jpg')];
    await s1.importPhotos({ kind: 'trip' }); await s1.flush(); await settle(10);
    await s2.refreshLibrary(); await s2.openTrip(A);
    s2.dispatch({ type: 'setTripMeta', patch: { title: 'edited elsewhere' } }); await s2.flush();
    await s1.mergeWithStored(); await settle(40);
    ok(isLive(s1) && listing(s1).phase !== 'loading',
      'F4: after a merge install the listing still reaches a terminal state — an UNSTAMPED reseed reads as unanswered and the boundary answers it', liveState(s1));
  }
}

// --------------------------------------------------------------------------- §G

if (run('G')) {
  head('§G — termination and cost: A-69 Part 4\'s *"no artificial bound ships"*, attacked');

  // G1 — the ordinary path costs zero, which is A-69 G23. Re-derived at ten files rather than three.
  {
    const [p, store] = mk('g1');
    const A = await trip(store, 'A');
    await store.openTrip(A); await settle(10);
    const base = p.photo.presentCalls;
    p.photo.next = Array.from({ length: 10 }, (_, i) => file(`n${i}.jpg`));
    await store.importPhotos({ kind: 'trip' }); await settle(30);
    ok(p.photo.presentCalls - base === 0,
      'G1: **zero** extra `present()` for a ten-file import after a successful open — the boundary costs nothing in ordinary use', p.photo.presentCalls - base);
  }

  // G2 — a persistently broken port, twenty gestures. A-70 residue 1 bounds the cost at one read
  // per gesture; a store that loops would be unbounded, and a store that gives up would go quiet.
  {
    const { p, store } = await failedRead('g2');
    p.photo.failPresent = true;
    const base = p.photo.presentCalls;
    for (let i = 0; i < 20; i++) { p.photo.next = [file(`b${i}.jpg`)]; await store.importPhotos({ kind: 'trip' }); }
    await settle(60);
    const extra = p.photo.presentCalls - base;
    ok(extra === 20,
      'G2: twenty imports against a permanently failing port cost **exactly twenty** reads — one per gesture, A-70 residue 1\'s stated bound, neither a loop nor a give-up', extra);
    ok(staleAnswer(store, p.photo) === null, 'G2: and the message on display is the twentieth read\'s, not the first\'s', staleAnswer(store, p.photo));
  }

  // G3 — A-69 Part 4's termination argument names GESTURES as the source of bumps. A subscriber
  // that supersedes on every emit is a bump per ANSWER, which the argument does not cover. Is it
  // reachable, and does the store survive it? Driven with a hard cap so the probe cannot hang.
  {
    const [p, store] = mk('g3');
    const A = await trip(store, 'A');
    await store.openTrip(A);
    p.photo.next = [file('seed.jpg')];
    await store.importPhotos({ kind: 'trip' }); await settle(10);
    let emitCount = 0; let reentrant = 0;
    const off = store.subscribe(() => {
      emitCount++;
      // The only public gesture that bumps `photoAvailability` is a byte write or delete, and
      // both are `async` — so a subscriber cannot bump SYNCHRONOUSLY from inside `emit`.
      if (emitCount < 5) { reentrant++; p.photo.next = [file(`r${emitCount}.jpg`)]; void store.importPhotos({ kind: 'trip' }).catch(() => {}); }
    });
    p.photo.next = [file('trigger.jpg')];
    await store.importPhotos({ kind: 'trip' });
    await settle(80);
    off();
    ok(listing(store).phase !== 'loading',
      'G3: a subscriber that re-enters `importPhotos` on every emit still leaves a terminal listing — the store does not spin', { emitCount, reentrant, ...liveState(store) });
    note(`G3: ${emitCount} emits, ${reentrant} re-entrant imports, ${p.photo.presentCalls} present() calls — bounded, because a bump needs an \`await\` and a subscriber runs synchronously inside \`emit\``);
  }

  // G4 — S2's own re-issue, chained: a read dropped by a bump whose owner has already returned,
  // three times in a row. Each replacement must consume a bump rather than create one.
  {
    const { p, store } = await failedRead('g4');
    const base = p.photo.presentCalls;
    p.photo.slowPresent = true;
    const r1 = store.refreshPhotoAvailability();
    await settle(4);
    for (let i = 0; i < 3; i++) { p.photo.next = [file(`s${i}.jpg`)]; void store.importPhotos({ kind: 'trip' }).catch(() => {}); await settle(3); }
    p.photo.slowPresent = false;
    while (p.photo.presentGates.length > 0) { await p.photo.presentGates.shift().run(); await tick(); }
    await r1.catch(() => {}); await settle(80);
    ok(listing(store).phase === 'ready', 'G4: three overlapping imports behind one parked retry all settle', liveState(store));
    note(`G4: ${p.photo.presentCalls - base} reads for one retry + three imports — A-69's *"each replacement consumes a bump that has already happened"*`);
    ok(p.photo.presentCalls - base <= 5,
      'G4: and the read count is bounded by the gestures, not by the repairs', p.photo.presentCalls - base);
  }
}

// --------------------------------------------------------------------------- §H

if (run('H')) {
  head('§H — A-70 Part 7 item 3\'s published grep counts, run LITERALLY as the ruling prints them');
  const clientSrc = git('ls-files', 'cairn/packages/client/src').split('\n').filter(Boolean);
  const total = (tok) => clientSrc.reduce((n, f) =>
    n + (readFileSync(resolve(ROOT, f), 'utf8').match(new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length, 0);
  const setA = total('setAvailability(');
  const setl = total('settleAvailability(');
  note(`a literal grep over \`packages/client/src\` finds ${setA} × \`setAvailability(\` and ${setl} × \`settleAvailability(\``);
  ok(setA === 6,
    'H1: A-70 Part 7 item 3 publishes *"a literal `grep -c \'setAvailability(\'` over `packages/client/src` returns **six**"* — measured', setA);
  note('**H1 went from RED to GREEN at I-13i without anybody fixing it, and it is a hazard rather');
  note('than a relief** (round 51, **R51-6**). R50-1 filed the published **six** as one short of the');
  note('literal **seven**; revision 52 applied that correction — and the SAME revision\'s §4.2 A-71');
  note('Part 4c merged `readAvailabilityOnce`\'s two branches into one call. So the literal now');
  note('returns **six** again, the corrected **7** is wrong, and the correction table\'s calls-only');
  note('row (**6**, labelled *"what `settling.test.ts` asserts"*) disagrees with the shipped test,');
  note('which asserts **5** after KD-92\'s re-cut. This line quotes the number as A-70 ORIGINALLY');
  note('published it, which is why it reads green; `qa/r51-i13i.mjs` §H4 runs the corrected table.');
  ok(setl === 3,
    'H2: A-70 Part 7 item 3 publishes *"a literal `grep -c \'settleAvailability(\'` returns **three**"* — measured', setl);
  note('The shipped tests (`settling.test.ts` G21/G24) assert 6 and 3 with a `(?<!function )` lookbehind,');
  note('i.e. they count CALLS and exclude each function\'s own declaration. Both test assertions are');
  note('correct about the design. What the ruling publishes as the *token* count is the call count.');
  ok(total('.sequenceOf(') === 1, 'H3: A-70 G28 — `sequenceOf(` has exactly one call site', total('.sequenceOf('));
  ok(total('availabilityOwed') === 0, 'H4: A-69 Part 6 item 1 — `availabilityOwed` appears nowhere', total('availabilityOwed'));
}

// --------------------------------------------------------------------------- §I

if (run('I')) {
  head('§I — `qa/r48-i13d.mjs`\'s current FAIL lines, attributed');
  const out = execFileSync(process.execPath, ['--experimental-strip-types', resolve(HERE, 'r48-i13d.mjs')],
    { cwd: CAIRN, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const failLines = out.split('\n').filter((l) => /^ {2}FAIL {2}/.test(l));
  const r483 = failLines.filter((l) => /R48-3/.test(l));
  const census = failLines.filter((l) => /source\/test files moved/.test(l));
  note(`r48-i13d.mjs prints ${failLines.length} FAIL line(s)`);
  ok(r483.length === 3 && r483.every((l) => /App\.tsx|keydown handler|removePhoto/.test(l)),
    'I1: three of them are R48-3 and every one names `apps/web/src/App.tsx` — the queued I-13f work, correctly attributed and not a new defect', r483.map((l) => l.slice(0, 70)));
  ok(census.length === 0,
    'I2: and §A\'s file census is no longer among them — the range grew it from five files to seven at I-13g/I-13h and to eight at the round-50 fix pass + I-13i, and it was re-cut at round 50 (R50-4) and again at round 51',
    census.map((l) => l.slice(0, 60)));
  ok(failLines.length === 3, 'I3: three and no more — nothing else in the I-13d probe regressed under A-69/A-70', failLines.length);
  ok(/-- r48-i13d\.mjs COMPLETE/.test(out),
    'I4: and the probe printed its terminal marker, so the count above is a finished run rather than a run that stopped early (A-69 Part 9\'s standing requirement)');
}


// --------------------------------------------------------------------------- §J

if (run('J')) {
  head('§J — the session block A-69 Part 5 does NOT fence: `failures`, `pending` and `orphans` across a transition');
  note('A-69 Part 5 closes the writers of the availability TRIPLE. The other four fields of');
  note('`PhotoSession` are written by `setPhotos`, which the fence deliberately still allows — and');
  note('§10 A-66 Part 3\'s rule is the same rule the triple has: *"reported against the trip it');
  note('happened to, or not at all."* `importPhotos`\' own comments state it twice. These are the');
  note('sites where that rule is enforced by a `guard.current(\'doc\', g)` check, and the sites where');
  note('it is not — measured, on the shipped source and then on the running store.');

  // J1 — the source census. Every `setPhotos(` call that sits AFTER an `await` in a method that
  // captured a `doc` observation, and whether it is inside a `current('doc', g)` gate.
  //
  // **RE-CUT AT ROUND 51 — all three lines asserted the shape of the OPEN finding, and all three
  // findings are now closed** (`37cf4f0` for R50-3, §10 **A-66 Part 11** for R50-2). Left as they
  // were, two of them passed *vacuously* — the closing-settlement line's own anchor
  // (`if (remaining > 0) setPhotos(`) stopped matching when the write moved to `setBatch`, so
  // `lastIndexOf` returned −1 and the regex was run against a single space — and the third went red
  // for the fix rather than for a defect. **A probe that reads its own silence as a pass is R49-2 in
  // the probe layer**; each line now asserts the mechanism that replaced what it was watching, and
  // carries the old expectation in its message so an empty set is never read as a measurement.
  const imp = src.slice(src.indexOf('async importPhotos('), src.indexOf('dismissPhotoFailures(): AppState'));
  const failFn = imp.slice(imp.indexOf('const fail = (reason'), imp.indexOf('};', imp.indexOf('const fail = (reason')));
  ok(/setBatch\(\{ failures:/.test(failFn) && !/setPhotos\(/.test(failFn),
    'J1 (re-cut): `importPhotos`\' `fail()` helper writes `photos.failures` through **`setBatch`** — which is `setPhotos` gated on `current(\'doc\', g)` (§10 A-66 Part 11). It used to call `setPhotos` directly with no gate at all, which is what J2 measured',
    failFn.replace(/\s+/g, ' ').slice(0, 140));
  const tailSet = imp.slice(imp.lastIndexOf('} finally {'));
  ok(/if \(remaining > 0\) setBatch\(\{ pending:/.test(tailSet) && /\} finally \{/.test(tailSet),
    'J1 (re-cut): and the batch\'s closing settlement is now in the loop\'s `finally` and goes through `setBatch` too — it used to be an ungated `setPhotos({ pending })` below the loop, which is what J3 measured (A-71 Part 4d + A-66 Part 11)',
    tailSet.replace(/\s+/g, ' ').slice(0, 160));
  ok(/const setBatch = \(patch[^\n]*\n\s*if \(!guard\.current\('doc', g\)\) return;/.test(imp),
    'J1 (re-cut): and `setBatch` is the gate itself — one writer, checked once, so a fifth `setPhotos` added to this loop next year inherits the rule (A-66 Part 11\'s *"a gate here and not at each caller"*)',
    imp.match(/const setBatch = [^\n]*\n[^\n]*/g));
  const rec = src.slice(src.indexOf('async reclaimPhotoBytes('), src.indexOf('async exportActive('));
  ok(/const g = guard\.observe\('doc'\);/.test(rec) && /if \(guard\.current\('doc', g\)\) setPhotos\(\{ orphans: kept \}\);/.test(rec),
    'J1 (re-cut): `reclaimPhotoBytes` now takes a `doc` observation and gates its `setPhotos({ orphans })` on it — **R50-3 is CLOSED** at `37cf4f0`. It had neither, and that is what J4 measured',
    rec.match(/guard\.(observe|current)\('doc'[^\n]*/g));

  // J2 — DRIVEN. A file that fails to decode, with the transition landing inside its `derive`.
  {
    const [p, store] = mk('j2');
    const A = await trip(store, 'A'); const B = await trip(store, 'B');
    await store.openTrip(A); await settle(10);
    p.photo.next = [file('holiday.jpg')];
    p.photo.parkDerive = true;
    const batch = store.importPhotos({ kind: 'trip' });
    await settle(4);
    await store.openTrip(B);                 // the user moves to B while file 1 is decoding
    p.photo.deriveNull = true;               // and the decode then fails
    await p.photo.release(1);
    await batch; await settle(40);
    const st = store.getState();
    ok(st.doc?.id === B, 'J2 setup: the user is on B', st.doc?.id);
    ok(st.photos.failures.length === 0,
      'J2 (re-cut at round 51): **R50-2 is CLOSED** — a file picked in trip A that fails to decode after the user moves to B is reported **nowhere**, which is §10 A-66 Part 3\'s *"nothing is reported at all"* and Part 11\'s `setBatch`. It used to land on B by name',
      { reportedAgainstB: st.photos.failures, tripOnScreen: st.doc?.id });
  }

  // J3 — the same shape on the fraction: an abandoned batch decrements the INCOMING trip's
  // pending count, which is R45-11's rule (*"two overlapping imports must not write over each
  // other's reports"*) across a trip boundary rather than within one.
  {
    const [p, store] = mk('j3');
    const A = await trip(store, 'A'); const B = await trip(store, 'B');
    await store.openTrip(A); await settle(10);
    p.photo.next = [file('a1.jpg'), file('a2.jpg'), file('a3.jpg')];
    p.photo.parkDerive = true;
    const batchA = store.importPhotos({ kind: 'trip' });
    await settle(4);
    await store.openTrip(B); await settle(10);
    p.photo.next = [file('b1.jpg'), file('b2.jpg'), file('b3.jpg'), file('b4.jpg')];
    const batchB = store.importPhotos({ kind: 'trip' });   // B's own batch: pending 4
    await settle(4);
    const pendingBefore = store.getState().photos.pending;
    let zeroWhileFilesRemain = false;
    const offJ3 = store.subscribe((st) => {
      if (st.photos.pending === 0 && (st.doc?.photos.length ?? 0) < 4) zeroWhileFilesRemain = true;
    });
    await p.photo.release(1);                              // A's file 1 decodes; the batch breaks
    await settle(10);
    const pendingAfter = store.getState().photos.pending;
    await p.photo.release(8); await batchA; await batchB; await settle(40);
    offJ3();
    note(`J3: B's import spinner reported \`pending: 0\` with files still to land: ${zeroWhileFilesRemain}`);
    ok(pendingAfter >= pendingBefore - 1,
      'J3 (re-cut at round 51): **R50-2 is CLOSED** — trip A\'s abandoned batch no longer subtracts its remaining file count from **trip B\'s** progress fraction (§10 A-66 Part 11 U7). It used to take four off a four-file batch of B\'s that had landed nothing',
      { pendingBefore, pendingAfter, delta: pendingAfter - pendingBefore });
    ok(store.getState().photos.pending === 0, 'J3: both fractions do reach zero in the end', store.getState().photos.pending);
  }

  // J4 — `reclaimPhotoBytes`: an orphan of trip A reported against trip B.
  {
    const [p, store] = mk('j4');
    const A = await trip(store, 'A'); const B = await trip(store, 'B');
    await store.openTrip(A);
    p.photo.next = [file('seed.jpg')];
    await store.importPhotos({ kind: 'trip' }); await store.flush(); await settle(10);
    const id = store.getState().doc.photos[0].id;
    p.photo.failRemove = true;
    await store.removePhoto(id); await settle(20);
    p.photo.failRemove = false;
    ok(store.getState().photos.orphans.length === 1, 'J4 setup: A has one orphan', store.getState().photos.orphans);
    p.photo.slowRemove = true;
    const reclaim = store.reclaimPhotoBytes([id]);
    await settle(4);
    await store.openTrip(B); await settle(10);              // the user moves to B mid-reclaim
    while (p.photo.removeGates.length) p.photo.removeGates.shift().fail(new Error('still refused'));
    await reclaim.catch(() => {}); await settle(40);
    const st = store.getState();
    ok(st.doc?.id === B, 'J4 setup: the user is on B', st.doc?.id);
    ok(st.photos.orphans.length === 0,
      'J4 (re-cut at round 51): **R50-3 is CLOSED** at `37cf4f0` — a failed reclaim of trip A\'s orphan is no longer reported against trip B, because `reclaimPhotoBytes` gained the `doc` observation and the `current(\'doc\', g)` gate A-68 Part 5c already gave `removePhoto`\'s tail',
      { orphansShownOnB: st.photos.orphans, tripOnScreen: st.doc?.id });
  }

  // J5 — and the consequence, so the severity is measured rather than argued: does the
  // misattributed orphan let a user destroy bytes in the wrong trip?
  {
    const [p, store] = mk('j5');
    const A = await trip(store, 'A'); const B = await trip(store, 'B');
    await store.openTrip(B);
    p.photo.next = [file('bees.jpg')];
    await store.importPhotos({ kind: 'trip' }); await store.flush(); await settle(10);
    const bId = store.getState().doc.photos[0].id;
    await store.openTrip(A);
    p.photo.next = [file('ants.jpg')];
    await store.importPhotos({ kind: 'trip' }); await store.flush(); await settle(10);
    const aId = store.getState().doc.photos[0].id;
    note(`J5: A's photo is ${aId}, B's is ${bId} — ${aId === bId ? 'the SAME id under two tenancies' : 'different ids'}`);
    const before = [...p.photo.thumbs.keys()].length;
    // Reclaim, from trip A, an id that only trip B holds bytes for.
    await store.reclaimPhotoBytes([bId]); await settle(20);
    ok([...p.photo.thumbs.keys()].length === before,
      'J5: reclaiming an id from the wrong trip destroys **no** bytes — §10 A-62\'s `[tripId, photoId]` key is what keeps R50-3 a wrong REPORT rather than a wrong DELETE, and it is why R50-2/R50-3 are MINOR',
      { before, after: [...p.photo.thumbs.keys()].length });
  }

  // J6 — A-69 Part 8 / G22, verified independently: R49-4's browse pane, and its control.
  {
    const [, store] = mk('j6');
    const A = await trip(store, 'A'); const B = await trip(store, 'B'); const C = await trip(store, 'C');
    await store.openTrip(A);
    await store.browseTrip(B); await settle(10);
    ok(store.getState().browsing?.id === B, 'J6 setup: B\'s pane is open');
    await store.deleteTrip(B); await settle(20);
    ok(store.getState().browsing === null,
      'J6: **R49-4 is FIXED** — deleting the browsed trip clears its pane (A-69 Part 8)', store.getState().browsing?.id);
    ok(!store.getState().library.some((r) => r.id === B), 'J6: and the row is gone');
    await store.browseTrip(C); await settle(10);
    await store.deleteTrip(A === store.getState().doc?.id ? C : A);
    await settle(20);
    note(`J6 control: after deleting an unrelated trip the pane is ${store.getState().browsing === null ? 'GONE (the active-branch reseed)' : 'INTACT'}`);
  }
}


// --------------------------------------------------------------------------- §K

if (run('K')) {
  head('§K — R49-5\'s throwing subscriber and G12\'s stale-but-present answer, verified independently');

  /** A store whose subscriber throws on the Nth emit from now. */
  const armThrow = (store, after) => {
    let n = 0;
    return store.subscribe(() => { if (++n > after) throw new Error('subscriber exploded'); });
  };

  // K1 — R49-5, on all four installing transitions. The document installs, the subscriber's OWN
  // error reaches the caller unchanged, and the listing still reaches a terminal state (A-69 Part 7,
  // criterion G20). Measured here rather than read off the builder's table.
  for (const kind of ['openTrip', 'createTrip', 'adoptTrip', 'importDoc']) {
    const [p, store] = mk(`k1${kind}`);
    const A = await trip(store, 'A');
    await store.openTrip(A);
    p.photo.next = [file('seed.jpg')];
    await store.importPhotos({ kind: 'trip' }); await store.flush(); await settle(10);
    await store.closeTrip(); await settle(10);
    const base = p.photo.presentCalls;
    const off = armThrow(store, 0);
    let err = null;
    try {
      if (kind === 'openTrip') await store.openTrip(A);
      else if (kind === 'createTrip') await store.createTrip({ title: 'N', startDate: '2026-08-07', endDate: '2026-08-08' });
      else if (kind === 'adoptTrip') await store.adoptTrip(core.toJSON(await store.exportStoredDoc(A).then(() => store.getState().doc ?? null).catch(() => null)) ?? '{}');
      else await store.importDoc();
    } catch (e) { err = e; }
    off();
    await settle(40);
    if (kind === 'adoptTrip' || kind === 'importDoc') { note(`K1 ${kind}: skipped — needs a fixture this probe does not carry; G20 covers it`); continue; }
    ok(err !== null && /subscriber exploded/.test(err.message),
      `K1 ${kind}: the subscriber's OWN error reaches the caller unchanged (A-69 Part 7)`, err?.message);
    ok(store.getState().doc !== null,
      `K1 ${kind}: the document is installed — \`set\` assigns before it notifies`, store.getState().doc?.id);
    // The count is not the criterion: a trip with no photographs answers on
    // `readAvailabilityOnce`'s `ids.length === 0` branch and calls no port at all, which is
    // §10.6 property 2's own *"a trip with no photos still records an answer"*.
    ok(isLive(store) && listing(store).phase !== 'loading',
      `K1 ${kind}: **and the listing reaches a terminal state anyway** — S1's REJECTION arm, which is the whole of R49-5`,
      { ...liveState(store), reads: p.photo.presentCalls - base });
  }

  // K2 — the twist the ruling does not name: a subscriber that throws only on the REPAIR's own
  // emit. The boundary's read then throws out of `settleAvailability` inside S1's arm, which
  // converts a successful method into a rejection. Does the answer still land?
  {
    const [p, store] = mk('k2');
    const A = await trip(store, 'A');
    await store.openTrip(A);
    p.photo.next = [file('seed.jpg')];
    await store.importPhotos({ kind: 'trip' }); await store.flush(); await settle(10);
    await store.closeTrip(); await settle(10);
    let n = 0;
    const off = store.subscribe(() => { if (++n === 2) throw new Error('exploded on emit 2'); });
    let err = null;
    try { await store.openTrip(A); } catch (e) { err = e; }
    off(); await settle(40);
    note(`K2: openTrip ${err ? `rejected with "${err.message}"` : 'resolved'}; final state ${JSON.stringify(liveState(store))}`);
    ok(isLive(store),
      'K2: a subscriber that throws on the repair\'s own emit still leaves the listing terminal — `set` assigns before `emit`, so the answer is written even when notifying it throws', liveState(store));
  }

  // K3 — **A-69 Part 6 item 3 / A-70 Part 5 item 2, the one thing a narrowed predicate could
  // plausibly have broken**: the boundary must repair an ABSENT answer and never a WRONG one.
  // `deleteTrip` of the ACTIVE trip whose storage delete rejects — G12's own scenario.
  {
    const [p, store] = mk('k3');
    const A = await trip(store, 'A'); await trip(store, 'B');
    await store.openTrip(A);
    p.photo.next = [file('seed.jpg')];
    await store.importPhotos({ kind: 'trip' }); await store.flush(); await settle(20);
    ok(listing(store).phase === 'ready', 'K3 setup: A reads `ready` over bytes on disk', liveState(store));
    const readsBefore = p.photo.presentCalls;
    p.storage.failDeleteFor.add(A);
    const threw = await store.deleteTrip(A).then(() => null).catch((e) => e.message);
    await settle(40);
    ok(threw !== null, 'K3: the delete fails loudly', threw);
    ok(store.getState().doc?.id === A, 'K3: and the trip is still open — the cascade failed', store.getState().doc?.id);
    ok(listing(store).phase !== 'loading',
      'K3: the listing is terminal', liveState(store));
    ok(p.photo.presentCalls - readsBefore === 1,
      'K3: **exactly one** read — A-68 Part 6\'s `catch` read, and NOT a second one from the boundary: the answer was present and stamped, so the predicate is false and A-69 Part 6 item 3 holds under A-70\'s narrowing',
      p.photo.presentCalls - readsBefore);
    ok(listing(store).items.every((x) => x.availability === 'missing'),
      'K3: and it reports `missing` over the bytes `removeTrip` took, rather than `ready` over gone bytes (§10 A-65 T1)',
      listing(store).items.map((x) => x.availability));
  }


  // K5 — **FINDING R50-5.** `readAvailabilityOnce`'s `catch` wraps its own `setAvailability` as
  // well as the port call, so an exception thrown by a SUBSCRIBER while rendering a SUCCESSFUL
  // answer is caught there and recorded as the photo store's failure message.
  {
    const [p, store] = mk('k5');
    const A = await trip(store, 'A');
    await store.openTrip(A);
    p.photo.next = [file('seed.jpg')];
    await store.importPhotos({ kind: 'trip' }); await store.flush(); await settle(20);
    ok(listing(store).phase === 'ready', 'K5 setup: the port works and the listing is `ready`', liveState(store));
    await store.closeTrip(); await settle(10);
    const MSG = 'render failed: <PhotoGrid> cannot read property of undefined';
    const off = store.subscribe((st) => {
      if (st.photos.available !== null && st.photos.available.size > 0) throw new Error(MSG);
    });
    const readsBefore = p.photo.presentCalls;
    let err = null;
    try { await store.openTrip(A); } catch (e) { err = e; }
    off(); await settle(40);
    const st = store.getState();
    ok(p.photo.presentCalls - readsBefore >= 1 && p.photo.failSeq === 0,
      'K5 setup: the photo port was called and **never failed**', { reads: p.photo.presentCalls - readsBefore, portFailures: p.photo.failSeq });
    ok(st.photos.availabilityError !== MSG,
      'K5: **FINDING R50-5** — the SUBSCRIBER\'s error is recorded as `photos.availabilityError`, so a read that SUCCEEDED renders as *"the photo store could not be read"*: `readAvailabilityOnce`\'s `catch` wraps its own `setAvailability`, not just `ports.photo.present`',
      { availabilityError: st.photos.availabilityError, phase: client.photosFor(st, { kind: 'trip' }).phase, available: st.photos.available === null ? null : [...st.photos.available] });
    ok(err !== null,
      'K5: **FINDING R50-5 (second face)** — and the exception is SWALLOWED: `openTrip` resolves, so no caller, no error boundary and nothing else ever learns the view threw. A-69 Part 7\'s disclosure (*"the caller sees the subscriber\'s error"*) is not true on this path',
      { openTripRejected: err === null ? 'no — it resolved' : err.message });
    // The third face: §10.6 property 6's exit does not exit.
    const off2 = store.subscribe((stt) => {
      if (stt.photos.available !== null && stt.photos.available.size > 0) throw new Error(MSG);
    });
    await store.refreshPhotoAvailability().catch(() => {});
    off2(); await settle(30);
    ok(store.getState().photos.availabilityError === null,
      'K5: **FINDING R50-5 (third face)** — and *Try again* is a trap: the retry reads successfully, the same subscriber throws on the same emit, and the same message comes back, so §10.6 property 6\'s action can never resolve the state it is offered for',
      { afterRetry: store.getState().photos.availabilityError });
    note('K5: the comment above this `catch` (`store.ts` ~:632) reads *"The port\'s own words … It carries');
    note('K5: no photo id, no caption and no coordinate (§6.1 rule 1)"*. That is a claim about the PORT\'s');
    note('K5: message and it is not a claim the FIELD satisfies: any string any subscriber throws lands');
    note('K5: here, and a subscriber that renders a caption can throw one containing it.');
  }

  // K4 — the same rule from the other side: a stale-but-present answer that NOTHING bumped must
  // survive untouched across an arbitrary number of settles. Ten no-op gestures over it.
  {
    const [p, store] = mk('k4');
    const A = await trip(store, 'A');
    await store.openTrip(A);
    p.photo.next = [file('seed.jpg')];
    await store.importPhotos({ kind: 'trip' }); await store.flush(); await settle(20);
    // Evict the bytes behind the store's back — A-57 Part 9 residue 5's own scenario.
    p.photo.thumbs.clear(); p.photo.displays.clear();
    const base = p.photo.presentCalls;
    for (let i = 0; i < 10; i++) { await store.refreshLibrary(); await store.flush(); await store.rescanSummaries(); }
    await settle(30);
    ok(p.photo.presentCalls === base,
      'K4: ten settling gestures over an answer nothing bumped issue **zero** reads — the boundary never repairs a merely stale answer (A-69 Part 6 item 3), which is also why A-57 Part 9 residue 5 is unchanged',
      p.photo.presentCalls - base);
    ok(listing(store).phase === 'ready', 'K4: and the stale `ready` is still what is on display, which is the disclosed cost rather than a defect', liveState(store));
  }
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL line(s)`}`);
console.log(`-- r50-i13h.mjs COMPLETE, last section §${lastSection} (A-69 Part 9's terminal marker) --`);
process.exit(0);
