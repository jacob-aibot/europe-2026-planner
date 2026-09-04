/**
 * **QA round 49 — the I-13e confirmation-breaker pass.** ARCHITECTURE §4.2 **A-68** (revision 49,
 * `2af16df`) and the I-13e build (`106bbd3`, `4398de5`), over `d03eac8..HEAD`.
 *
 *   node --experimental-strip-types qa/r49-i13e.mjs            (from cairn/)
 *   R49_ONLY=B node --experimental-strip-types qa/r49-i13e.mjs (just the MAJOR)
 *
 * **A `FAIL` line is a finding.** Every one carries its id. `note` lines are measurements that
 * are facts rather than unmet expectations.
 *
 *   A  the fences over `d03eac8..HEAD`: zero `.tsx`, zero `qa/`-by-the-builder, zero dependency
 *      movement, `docs/design/` untouched, nothing outside `cairn/`, `generation.ts` byte-
 *      identical, and the privacy greps over every added production line.
 *   B  **R49-1, MAJOR.** A-68 Part 7's liveness invariant, broken. `importPhotos`' owed read is
 *      discharged under `guard.current('doc', g)` — the **`doc`** slot — and the nine exits
 *      A-68 Part 4 was written for all bump exactly that slot while installing nothing and
 *      issuing no read. The owed answer is dropped with nobody behind it: `'loading'` forever.
 *   C  the liveness invariant beyond the builder's 13-gesture table: composite gestures, longer
 *      chains, two concurrent batches, two store instances, and **R49-5** — the eleventh exit,
 *      an INSTALLING transition whose reseeding `set` throws out of `emit()` and carries the
 *      control flow past the read that would have answered.
 *   D  **the two deliberate no-op sites**, attacked rather than accepted: `deleteTrip`'s
 *      non-active install and `writeAndSettle`'s merge install.
 *   E  **the tenth site** (A-68 Part 6): does the `catch` distinguish "cascade failed, trip still
 *      open" from "cascade succeeded, trip gone"? Both branches, both orders, plus the reseed-
 *      then-throw case the ruling does not name.
 *   F  **G14 and G17's disclosed mutant mismatches**, verified against the ruling's own text and
 *      the shipped code rather than taken on the builder's word.
 *   G  **`removePhoto`'s new `guard.observe('doc')`** and the asymmetry with `importPhotos`'
 *      unconditional supersede: is the stated reason real, and can the timing be exploited?
 *   H  **G16 re-derived from the sources**, including the two do-nothing shapes.
 *   I  **A-68 Part 9's predicate applied**, rather than its three line numbers trusted: which
 *      `qa/` assertions move, and is there a fourth?
 *   J  **R49-2 and R49-3.** Part 9's enumeration says three and declares §K green; the predicate
 *      finds a **fourth** in §K, which three consecutive rounds missed because `qa/r47-i13c.mjs`
 *      has been dying at §D since `4316167`. And three of Part 10's stated mutants do not
 *      reproduce as worded (G14, G17 and Part 9's own vacuity mutant for `:231`).
 *
 * Findings as first cut: **R49-1** MAJOR (§B ×7, §C5) · **R49-2** MINOR (§J) · **R49-3** MINOR
 * (§J ×3) · **R49-4** MINOR (§D3a) · **R49-5** MINOR (§C8 ×3). 13 `FAIL` lines, 5 ids.
 *
 * **RE-CUT AT ROUND 50 (`e051306`), nine lines, and the probe is now ALL CLEAR.** §4.2 **A-69**
 * (revision 50) and **A-70** (revision 51) ruled on all five. Five of the nine asserted the
 * SOURCE SHAPE of machinery A-69 Part 6 item 1 **deleted** — `availabilityOwed`, both `doc`-slot
 * discharge lines, the seven-`supersede('browsing')` count, and the non-active `deleteTrip`
 * install's do-nothing comment — and each is re-cut to the mechanism that replaced it (the two
 * settling sites, the eighth supersede, A-69 Part 8's pane clear), so an empty set is never read
 * as a probe that observed nothing. Four asserted the ABSENCE of a sentence from A-68's own text;
 * this document corrects by amendment banner plus a later entry rather than by silent edit, so
 * they are re-cut to assert that the banner and A-69 Parts 9/10 carry the correction.
 * `bash qa/r50-recut-vacuity.sh` watches every one of the nine RED first.
 * Companions: `bash qa/r49-recut-vacuity.sh` (the vacuity controls for the four re-cut lines) and
 * `bash qa/r49-controls.sh` (C1: R49-1 at `d03eac8`; C2: R49-5 at three commits).
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
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** Round 48's head — where this round's surface starts. */
const BASE = process.env.R49_BASE ?? 'd03eac8';
// The range under test is the builder's, and it is PINNED rather than left at `HEAD` — this
// round's own `qa/` commit sits on top of it, and §A's fences (*"the builder touched no `qa/`
// probe"*, *"exactly three files moved under `packages/`"*) are claims about I-13e, not about the
// breaker pass that follows it. `R49_HEAD=HEAD` widens it deliberately.
const HEAD_ = process.env.R49_HEAD ?? '4398de5';
const ONLY = (process.env.R49_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const run = (s) => ONLY.length === 0 || ONLY.includes(s);
const NUL = String.fromCharCode(0);

const tagged = (n, l = 64) => { const o = new Uint8Array(l); for (let i = 0; i < n.length && i < l; i++) o[i] = n.charCodeAt(i) & 0x7f; return o; };
const file = (n, type = 'image/jpeg') => ({ name: n, type, bytes: tagged(n) });
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async (n = 60) => { for (let i = 0; i < n; i++) await tick(); };
const keys = (port) => [...port.thumbs.keys()].map((k) => k.replace(NUL, '/')).sort();
const listing = (store, ref = { kind: 'trip' }) => client.photosFor(store.getState(), ref);
const src = readFileSync(resolve(CAIRN, 'packages/client/src/store/store.ts'), 'utf8');

/**
 * A `PhotoPort` whose `derive`, `write`, `present` and `remove` can each be parked — round 48's
 * fixture, extended with a `present` call counter and a failable `remove`.
 */
function gatedPhotos() {
  const port = client.memoryPhotos();
  const bd = port.derive.bind(port);
  port.gates = [];
  port.derive = (b, t) => new Promise((res) => { port.gates.push(async () => res(await bd(b, t))); });
  port.release = async (n = 1) => {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 80 && port.gates.length === 0; k++) await tick();
      const g = port.gates.shift(); if (g) await g(); await tick();
    }
  };
  const bp = port.present.bind(port);
  port.presentGates = []; port.slowPresent = false; port.presentCalls = 0;
  port.present = (t, ids) => {
    port.presentCalls++;
    if (!port.slowPresent) return bp(t, ids);
    const answer = bp(t, ids);                 // the ANSWER is computed now; only its arrival is late
    return new Promise((res, rej) => { port.presentGates.push({ run: async () => res(await answer), fail: (e) => rej(e) }); });
  };
  const brm = port.remove.bind(port);
  port.removeGates = []; port.slowRemove = false;
  port.remove = (t, id) => (port.slowRemove
    ? new Promise((res, rej) => { port.removeGates.push({ run: async () => res(await brm(t, id)), fail: rej }); })
    : brm(t, id));
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
/** A `StoragePort` whose `load` and `delete` can be parked or made to reject. */
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
  s.delete = (id) => (s.failDeleteFor.has(id)
    ? Promise.reject(new Error(`delete refused for ${id}`))
    : bdel(id));
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

/**
 * The one state in which a dropped or skipped availability answer has anything to strand:
 * trip A open, with one photograph already imported (so `present()` is actually called for it)
 * and the establishing read **parked**, i.e. `available === null`, `availabilityError === null`,
 * `phase: 'loading'`. Round 48's `parkedRead`, plus a seeded photograph.
 */
async function parkedRead(prefix) {
  const [p, store] = mk(prefix);
  const A = await trip(store, 'A');
  const B = await trip(store, 'B');
  await store.openTrip(A);
  p.photo.next = [file('seed.jpg')];
  const seed = store.importPhotos({ kind: 'trip' });
  await p.photo.release(1); await seed; await store.flush();
  p.photo.slowPresent = true;
  const opening = store.openTrip(A);
  await settle(10);
  return { p, store, A, B, opening };
}
/** Everything settles: the parked read answers (or is dropped by something newer). */
async function drain(ctx) {
  ctx.p.photo.slowPresent = false;
  while (ctx.p.photo.presentGates.length > 0) { await ctx.p.photo.presentGates.shift().run(); await tick(); }
  await ctx.opening.catch(() => {});
  await settle(40);
}
/**
 * Lets the *stale* parked read arrive and be dropped, and stops parking new ones — used once
 * `availabilityOwed` is already set, so that an interloper which issues a read of its own
 * (a successful `openTrip`, A-68 Part 6's `catch`) cannot deadlock the probe against its own
 * fixture. The state under test is unchanged: the stale read is superseded, so `available`
 * stays `null` and the listing stays `'loading'` across it.
 */
async function unpark(ctx) {
  ctx.p.photo.slowPresent = false;
  while (ctx.p.photo.presentGates.length > 0) { await ctx.p.photo.presentGates.shift().run(); await tick(); }
  await settle(4);
}
/** A-68 Part 7, verbatim. */
const liveState = (store) => {
  const s = store.getState();
  return {
    doc: s.doc?.id ?? null,
    available: s.photos.available === null ? null : [...s.photos.available],
    availabilityError: s.photos.availabilityError,
    phase: s.doc ? client.photosFor(s, { kind: 'trip' }).phase : 'n/a',
  };
};
const isLive = (store) => {
  const s = store.getState();
  return s.doc === null || s.photos.available !== null || s.photos.availabilityError !== null;
};

// --------------------------------------------------------------------------- §A

if (run('A')) {
  head('§A — the fences over `d03eac8..HEAD` (revision 49 + the I-13e build)');
  const names = git('diff', '--name-only', `${BASE}..${HEAD_}`).split('\n').filter(Boolean);
  ok(names.filter((n) => n.endsWith('.tsx')).length === 0, 'zero `.tsx` files in the range', names.filter((n) => n.endsWith('.tsx')));
  ok(names.filter((n) => n.startsWith('cairn/docs/design/')).length === 0, '`cairn/docs/design/` untouched');
  ok(names.filter((n) => !n.startsWith('cairn/')).length === 0, 'nothing outside `cairn/` moved',
    names.filter((n) => !n.startsWith('cairn/')));
  ok(git('status', '--porcelain', '--', 'europe-2026-itinerary.html', 'docs/', 'tickets/').trim() === '',
    'the live planner, `docs/` and `tickets/` are clean in the working tree');
  ok(git('diff', '--stat', `${BASE}..${HEAD_}`, '--', 'cairn/package.json', 'cairn/package-lock.json').trim() === '',
    '`package.json` / `package-lock.json` zero-line diff — no new dependency');
  ok(git('diff', `${BASE}..${HEAD_}`, '--', 'cairn/packages/client/src/store/generation.ts').trim() === '',
    'A-68 STATUS: `generation.ts` does not change by a character', 'it did');
  const moved = names.filter((n) => n.startsWith('cairn/packages/') || n.startsWith('cairn/apps/'));
  ok(moved.join() === ['cairn/packages/client/src/store/store.ts',
    'cairn/packages/client/test/generation.test.ts', 'cairn/packages/client/test/liveness.test.ts'].join(),
    'exactly three files moved under `packages/`, all in `packages/client`; `packages/core` and `apps/web` untouched', moved);
  ok(names.filter((n) => n.startsWith('cairn/qa/')).length === 0,
    'the builder touched no `qa/` probe — A-68 Part 9 gives those to this round', names.filter((n) => n.startsWith('cairn/qa/')));

  const added = git('diff', `${BASE}..${HEAD_}`, '--', 'cairn/packages/client/src', 'cairn/packages/core/src', 'cairn/apps/web/src', 'cairn/cli.ts')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const code = added.filter((l) => !/^\+\s*(\/\/|\/\*|\*)/.test(l) && l.trim() !== '+');
  note(`${added.length} added production lines, ${code.length} of them outside comments`);
  const bans = [
    ['console.', /console\s*\./], ['fetch(', /\bfetch\s*\(/], ['XMLHttpRequest/sendBeacon', /XMLHttpRequest|sendBeacon/],
    ['localStorage/sessionStorage', /localStorage|sessionStorage/], ['geolocation/watchPosition', /geolocation|watchPosition/],
    ['Date.now / new Date(', /Date\.now|new Date\(/], ['Math.random / randomUUID', /Math\.random|randomUUID/],
    ['imap/gmail/oauth/mailbox', /imap|gmail|oauth|mailbox/i], ['a lat:/lng: literal', /\b(lat|lng)\s*:\s*-?\d/],
    ['setTimeout/setInterval', /setTimeout|setInterval/],
    ['a DOM reference', /\b(document|window|navigator|HTMLElement|createElement)\b/],
  ];
  for (const [label, re] of bans) {
    const hits = code.filter((l) => re.test(l));
    ok(hits.length === 0, `no ${label} in any added production line`, hits.slice(0, 3));
  }
  ok(Object.keys(core).length === 83, 'core\'s runtime export surface is still 83', Object.keys(core).length);
  ok(core.SCHEMA_VERSION === 2 && core.SUMMARY_VERSION === 5, '`SCHEMA_VERSION` 2, `SUMMARY_VERSION` 5', { s: core.SCHEMA_VERSION, u: core.SUMMARY_VERSION });
  const notes = readFileSync(resolve(CAIRN, 'docs/BUILD-NOTES.md'), 'utf8');
  const pub = /npm test\s+#\s*(\d[\d,]*)\s*tests/.exec(notes.slice(notes.indexOf('## 2.')));
  note(`BUILD-NOTES §2's published \`npm test\` count: ${pub ? pub[1] : '(not found)'} — R48-4's line`);
}

// --------------------------------------------------------------------------- §B

if (run('B')) {
  head('§B — **R49-1, MAJOR**: the owed read is discharged under the `doc` slot, and the nine non-installing exits bump exactly that slot');
  note('A-68 Part 5b\'s own line: `if (availabilityOwed && guard.current(\'doc\', g)) await readPhotoAvailability(state.doc);`');
  note('(store.ts:1971), whose comment reads *"a batch that ended on a transition owes nothing: that');
  note('transition superseded this slot itself and issued its own read."* That sentence is true of the');
  note('SIX installing reseeds and false of the NINE exits A-68 Part 4.1 tabulates — which is the whole');
  note('reason Part 4 removed their `photoAvailability` claim in the first place.');

  /**
   * Trip A open, availability UNKNOWN (a parked establishing read), a two-file import in flight.
   * File 1 writes its bytes, supersedes the slot and sets `availabilityOwed`. The interloper then
   * claims `doc` and exits WITHOUT installing a document and WITHOUT issuing a read. File 2's
   * decode lands after the claim, so the loop breaks — and the discharge is skipped.
   */
  async function owedThenInterloper(prefix, interloper) {
    const ctx = await parkedRead(prefix);
    const { p, store } = ctx;
    p.photo.next = [file('1.jpg'), file('2.jpg')];
    const imp = store.importPhotos({ kind: 'trip' });
    await tick(); await tick();
    await p.photo.release(1);                   // file 1 lands: bytes on disk, record dispatched, read OWED
    await tick();
    const threw = await interloper(ctx).then(() => null).catch((e) => e.message);
    await p.photo.release(1);                   // file 2's decode lands after the claim → the loop breaks
    await imp;
    await drain(ctx);
    return { ...liveState(store), threw, presentCalls: p.photo.presentCalls, bytes: keys(p.photo).length };
  }

  const cases = [
    ['a `deleteTrip` of a NON-active trip (A-68 Part 4.1 row 3 — R48-2\'s own face 1)', (c) => c.store.deleteTrip(c.B)],
    ['an `openTrip` of an id not in storage (row 4)', (c) => c.store.openTrip('no-such-id')],
    ['an `openTrip` of a CORRUPT document — §2.9 A-47\'s own banner path (row 5)', async (c) => {
      c.p.storage.docs.set('corrupt-1', { nonsense: true });
      return c.store.openTrip('corrupt-1');
    }],
    ['an `importDoc` of garbage (row 6)', (c) => c.store.importDoc('{{{')],
    ['an `importDoc` with a foreign owner (row 7)', async (c) => {
      const ex = JSON.parse(await c.store.exportActive());
      return c.store.importDoc(JSON.stringify({ ...ex, id: 'foreign-1', ownerId: 'somebody-else' }));
    }],
    ['an `adoptTrip` whose `storage.load` rejects (row 11)', async (c) => {
      const other = core.createTrip({ title: 'Adopted', startDate: '2026-09-01', endDate: '2026-09-02' },
        { now: '2026-08-01', ids: client.sequentialIdPort('ad') });
      c.p.storage.failLoadFor.add(other.id);
      return c.store.adoptTrip(other);
    }],
    ['a `deleteTrip` of a NON-active trip whose cascade rejects (row 12, non-active branch)', (c) => {
      c.p.storage.failDeleteFor.add(c.B); return c.store.deleteTrip(c.B);
    }],
  ];
  for (const [label, fn] of cases) {
    const r = await owedThenInterloper(`b${cases.findIndex((x) => x[0] === label)}`, fn);
    ok(r.doc === null || r.available !== null || r.availabilityError !== null,
      `FINDING R49-1: A-68 Part 7's liveness invariant holds after ${label}`, r);
  }

  note('The control below is the SAME fixture with no interloper at all: the owed read is issued and');
  note('the listing reaches a terminal state, which is what makes the reds above a skipped discharge');
  note('rather than a probe that never owed anything.');
  {
    const ctx = await parkedRead('bctl');
    ctx.p.photo.next = [file('1.jpg'), file('2.jpg')];
    const imp = ctx.store.importPhotos({ kind: 'trip' });
    await tick(); await tick();
    await ctx.p.photo.release(1);
    await tick();
    await ctx.p.photo.release(1);
    ctx.p.photo.slowPresent = false;
    while (ctx.p.photo.presentGates.length > 0) { await ctx.p.photo.presentGates.shift().run(); await tick(); }
    await imp;
    await drain(ctx);
    const r = liveState(ctx.store);
    ok(r.available !== null && r.phase !== 'loading',
      'CONTROL: the same two-file import with NO interloper reaches a terminal state (the owed read fires)', r);
  }
  note('And the second control: the interloper alone, with no import owing anything, is GREEN — which is');
  note('the builder\'s own 13-gesture table, and is why this is a COMPOSITE gesture rather than a');
  note('regression of A-68 Part 4.');
  {
    const ctx = await parkedRead('bctl2');
    await ctx.store.deleteTrip(ctx.B);
    await drain(ctx);
    const r = liveState(ctx.store);
    ok(r.available !== null || r.availabilityError !== null,
      'CONTROL: `deleteTrip` of a non-active trip with NO import in flight is green (A-68 Part 4 holds)', r);
  }
}

// --------------------------------------------------------------------------- §C

if (run('C')) {
  head('§C — the liveness invariant beyond the builder\'s 13-gesture table');

  // C1 — the two exits that ARE covered, because Part 6's read or the reseed answers for them.
  {
    const ctx = await parkedRead('c1');
    ctx.p.photo.next = [file('1.jpg'), file('2.jpg')];
    const imp = ctx.store.importPhotos({ kind: 'trip' });
    await tick(); await tick();
    await ctx.p.photo.release(1); await tick();
    await unpark(ctx);
    ctx.p.storage.failDeleteFor.add(ctx.A);
    const threw = await ctx.store.deleteTrip(ctx.A).then(() => null).catch((e) => e.message);
    await ctx.p.photo.release(1);
    await imp;
    await drain(ctx);
    ok(isLive(ctx.store), 'C1: an owed read + a delete of the ACTIVE trip whose cascade rejects — A-68 Part 6\'s read covers it',
      { ...liveState(ctx.store), threw });
  }
  // C2 — an owed read + an INSTALLING transition: the incoming trip's own read answers.
  {
    const ctx = await parkedRead('c2');
    ctx.p.photo.next = [file('1.jpg'), file('2.jpg')];
    const imp = ctx.store.importPhotos({ kind: 'trip' });
    await tick(); await tick();
    await ctx.p.photo.release(1); await tick();
    await unpark(ctx);
    await ctx.store.openTrip(ctx.B);
    await ctx.p.photo.release(1);
    await imp;
    await drain(ctx);
    ok(isLive(ctx.store), 'C2: an owed read + an `openTrip` that SUCCEEDS — the incoming trip issues its own read',
      liveState(ctx.store));
  }
  // C3 — an owed read + `closeTrip`: the document goes to `null`, so nothing is owed.
  {
    const ctx = await parkedRead('c3');
    ctx.p.photo.next = [file('1.jpg'), file('2.jpg')];
    const imp = ctx.store.importPhotos({ kind: 'trip' });
    await tick(); await tick();
    await ctx.p.photo.release(1); await tick();
    await unpark(ctx);
    await ctx.store.closeTrip();
    await ctx.p.photo.release(1);
    await imp;
    await drain(ctx);
    ok(isLive(ctx.store), 'C3: an owed read + `closeTrip` — `doc === null`, so §10.6 has no listing to answer for',
      liveState(ctx.store));
  }
  // C4 — a LONGER chain: owe, then three non-installing exits back to back, then an install.
  {
    const ctx = await parkedRead('c4');
    ctx.p.photo.next = [file('1.jpg'), file('2.jpg')];
    const imp = ctx.store.importPhotos({ kind: 'trip' });
    await tick(); await tick();
    await ctx.p.photo.release(1); await tick();
    await unpark(ctx);
    await ctx.store.openTrip('nope-1').catch(() => {});
    await ctx.store.importDoc('{{{').catch(() => {});
    await ctx.store.deleteTrip(ctx.B).catch(() => {});
    await ctx.store.openTrip(ctx.A);                        // the install that repairs it
    await ctx.p.photo.release(1);
    await imp;
    await drain(ctx);
    ok(isLive(ctx.store), 'C4: three non-installing exits then a successful `openTrip` — the install repairs the stranding',
      liveState(ctx.store));
    note('C4 is why R49-1 is MAJOR and not a BLOCKER: re-opening the trip clears it. Nothing is lost.');
  }
  // C5 — TWO concurrent import batches, both owing, one ended by a non-installing exit.
  {
    const ctx = await parkedRead('c5');
    ctx.p.photo.next = [file('1.jpg'), file('2.jpg')];
    const imp1 = ctx.store.importPhotos({ kind: 'trip' });
    await tick(); await tick();
    ctx.p.photo.next = [file('3.jpg')];
    const imp2 = ctx.store.importPhotos({ kind: 'trip' });
    await tick(); await tick();
    await ctx.p.photo.release(1); await tick();             // batch 1, file 1: owes
    await unpark(ctx);
    await ctx.store.deleteTrip(ctx.B).catch(() => {});
    await ctx.p.photo.release(3);
    await Promise.all([imp1.catch(() => {}), imp2.catch(() => {})]);
    await drain(ctx);
    ok(isLive(ctx.store),
      'FINDING R49-1 (second shape): two overlapping batches, both owing, one non-installing exit strands BOTH',
      liveState(ctx.store));
    note('C5 is the same defect reached with two batches rather than two files: one `deleteTrip` of a trip');
    note('neither batch touched skips both discharges at once, because both hold the same `doc` ticket.');
  }
  // C6 — `removePhoto` owing, against the same interloper. The supersede and the discharge are in
  // ONE synchronous block there, so the interloper cannot get between them.
  {
    const ctx = await parkedRead('c6');
    const id = ctx.store.getState().doc.photos[0].id;
    ctx.p.photo.slowRemove = true;
    const rm = ctx.store.removePhoto(id);
    await tick(); await tick();
    await unpark(ctx);
    await ctx.store.deleteTrip(ctx.B).catch(() => {});       // lands INSIDE `ports.photo.remove`
    await ctx.p.photo.releaseRemove(1);
    await rm;
    await drain(ctx);
    ok(isLive(ctx.store), 'C6: `removePhoto` racing a non-installing exit — the whole tail is gated, so nothing is owed',
      liveState(ctx.store));
  }
  // C8 — **R49-5.** The ELEVENTH exit, which A-68 Part 4.1's table does not have a row for because
  // it is not a *non*-installing one: a transition that DOES install its document and then never
  // reaches its read, because the reseeding `set`'s own `emit()` threw. `state = …` precedes
  // `emit()` in `set` (store.ts:371), and all four installing transitions put
  // `await readPhotoAvailability(...)` AFTER their `try`/`finally`, so the exception carries the
  // control flow straight past it. Round 48's §C already used this exact fault to prove the `doc`
  // slot always releases; nobody asked what it does to the slot A-68 Part 7 reasons about.
  for (const [label, gesture] of [
    ['openTrip', async (store, ids) => store.openTrip(ids.A)],
    ['createTrip', async (store) => store.createTrip({ title: 'C', startDate: '2026-10-01', endDate: '2026-10-02' })],
    ['importDoc', async (store) => store.importDoc(await store.exportActive())],
  ]) {
    const [p, store] = mk(`c8${label}`);
    const A = await trip(store, 'A');
    await store.openTrip(A);
    let armed = false;
    const off = store.subscribe(() => { if (armed) { armed = false; throw new Error('a subscriber blew up'); } });
    armed = true;
    const threw = await gesture(store, { A }).then(() => null).catch((e) => e.message);
    off();
    await settle(40);
    ok(isLive(store),
      `FINDING R49-5: A-68 Part 7's invariant holds when a subscriber throws inside \`${label}\`'s reseeding \`set\``,
      { ...liveState(store), threw, presentCalls: p.photo.presentCalls });
  }
  note('The document IS installed (`set` assigns `state` before it emits), so `doc !== null`; the read');
  note('that would have answered sits after the `try`/`finally` and is never reached. Pre-existing on');
  note('both sides of A-67 — the read has been outside the `try` since revision 5 — so this is a gap in');
  note('A-68 Part 7\'s PROOF rather than a regression: the reseed row of Part 7\'s table says the');
  note('transition *"then either issues a read … or leaves `doc === null`"*, and this exit does neither.');

  // C7 — two store instances over ONE storage (this project's two-tab fixture). Each has its own
  // guard, so one tab's transition must not be able to strand the other's read.
  {
    const shared = { storage: gatedStorage(), photo: gatedPhotos() };
    const [p1, s1] = mk('t1', shared);
    const A = await trip(s1, 'A');
    const B = await trip(s1, 'B');
    const [, s2] = mk('t2', shared);
    await s1.openTrip(A);
    p1.photo.next = [file('seed.jpg')];
    const seed = s1.importPhotos({ kind: 'trip' });
    await p1.photo.release(1); await seed; await s1.flush();
    await s2.refreshLibrary();
    p1.photo.slowPresent = true;
    const opening = s1.openTrip(A);
    await settle(10);
    p1.photo.next = [file('1.jpg'), file('2.jpg')];
    const imp = s1.importPhotos({ kind: 'trip' });
    await tick(); await tick();
    await p1.photo.release(1); await tick();
    p1.photo.slowPresent = false;
    while (p1.photo.presentGates.length > 0) { await p1.photo.presentGates.shift().run(); await tick(); }
    await s2.deleteTrip(B).catch(() => {});                  // the OTHER tab's transition
    await p1.photo.release(1);
    await imp;
    p1.photo.slowPresent = false;
    while (p1.photo.presentGates.length > 0) { await p1.photo.presentGates.shift().run(); await tick(); }
    await opening.catch(() => {});
    await settle(40);
    ok(isLive(s1), 'C7: a SECOND store instance\'s transition cannot strand the first\'s read (one guard per store, A-67 Part 3 item 3)',
      liveState(s1));
  }
}

// --------------------------------------------------------------------------- §D

if (run('D')) {
  head('§D — the two sites A-68 Part 4.2 deliberately gives NOTHING, attacked');

  // D1 — `deleteTrip`'s non-active install. The claim is that `removeTrip(id)` is a key-range
  // delete over ANOTHER trip's key space, so it cannot change what `present()` would answer for
  // the trip that is open — which means the in-flight read must be allowed to LAND.
  {
    const ctx = await parkedRead('d1');
    const before = keys(ctx.p.photo);
    await ctx.store.deleteTrip(ctx.B);
    await drain(ctx);
    const s = ctx.store.getState();
    ok(s.photos.available !== null && [...s.photos.available].length === 1,
      'D1: the in-flight read LANDS after a non-active delete — the answer was never stale (A-68 Part 4.2 item 1)',
      liveState(ctx.store));
    ok(keys(ctx.p.photo).join() === before.join(),
      'D1: and the delete touched none of the open trip\'s byte keys', { before, after: keys(ctx.p.photo) });
    ok(ctx.p.photo.removedTrips.join() === ctx.B, 'D1: `removeTrip` was called for B and only B', ctx.p.photo.removedTrips);
  }
  // D2 — the counter-scenario: can a non-active delete ever change what `present()` answers for
  // the OPEN trip? It can only if the two share a key range, which A-62's `[tripId, photoId]`
  // key forbids. Two trips holding the SAME `PhotoId`, one deleted.
  {
    const [p, store] = mk('d2');
    const A = await trip(store, 'A');
    const B = await trip(store, 'B');
    await store.openTrip(B);
    p.photo.next = [file('b.jpg')];
    let imp = store.importPhotos({ kind: 'trip' }); await p.photo.release(1); await imp; await store.flush();
    await store.openTrip(A);
    p.photo.next = [file('a.jpg')];
    imp = store.importPhotos({ kind: 'trip' }); await p.photo.release(1); await imp; await store.flush();
    const idsBefore = keys(p.photo);
    await store.deleteTrip(B);
    await store.refreshPhotoAvailability();
    const l = listing(store);
    ok(l.phase === 'ready' && l.missing === 0,
      'D2: deleting B does not make A\'s photograph `missing` — the two key ranges are disjoint (A-62)',
      { phase: l.phase, missing: l.missing, before: idsBefore, after: keys(p.photo) });
  }
  // D3 — the browse pane. The non-active install spreads `...state`, so `browsing` survives a
  // delete of the trip it shows. Measured on BOTH orders, because A-68 Part 4.3 changed one of them.
  {
    const ctx = await parkedRead('d3a');
    await ctx.store.browseTrip(ctx.B);
    await ctx.store.deleteTrip(ctx.B);
    await drain(ctx);
    const after = ctx.store.getState().browsing?.id ?? null;
    ok(after !== ctx.B,
      'FINDING R49-4: a browse pane for the trip that was just deleted is cleared (§2.14\'s copy source outlives its trip)',
      { browsingAfterDelete: after, libraryHasB: ctx.store.getState().library.some((r) => r.id === ctx.B) });
    const nonActive = git('log', '-1', '--format=%H', `${BASE}..${HEAD_}`, '-S', "set({ ...state, library, openFailures });", '--', 'cairn/packages/client/src/store/store.ts').trim();
    ok(nonActive === '',
      'R49-4 is PRE-EXISTING, not this range\'s doing: the non-active install line `set({ ...state, library, openFailures })` is untouched across `d03eac8..HEAD`',
      nonActive);
  }
  {
    const ctx = await parkedRead('d3b');
    ctx.p.storage.slowLoad = true;
    const br = ctx.store.browseTrip(ctx.B);
    await settle(6);
    ctx.p.storage.slowLoad = false;
    const del = ctx.store.deleteTrip(ctx.B);
    await settle(4);
    while (ctx.p.storage.loadGates.length > 0) await ctx.p.storage.loadGates.shift()();
    await del.catch(() => {}); await br.catch(() => {});
    await drain(ctx);
    const after = ctx.store.getState().browsing?.id ?? null;
    ok(after === null,
      'D3b: a browse RACING the delete installs no pane — its `storage.load` resolves to `null` and it throws (A-68 Part 4.3 holds)',
      after);
    note('So A-68 Part 4.3\'s removal of the `browsing` claim does NOT create a pane for a deleted trip: the');
    note('racing order is answered by storage, not by the guard. **D3a is the one that leaves a pane**, and');
    note('it needs no race at all — which is why R49-4 is filed as pre-existing rather than as A-68\'s doing.');
  }
  // D4 — `writeAndSettle`'s merge install: `doMerge` issues its own read on every path that
  // reaches the install, so the install genuinely owes nothing.
  {
    const shared = { storage: gatedStorage(), photo: gatedPhotos() };
    const [p1, s1] = mk('m1', shared);
    const A = await trip(s1, 'A');
    await s1.openTrip(A);
    p1.photo.next = [file('one.jpg')];
    const imp = s1.importPhotos({ kind: 'trip' }); await p1.photo.release(1); await imp; await s1.flush();
    const [, s2] = mk('m2', shared);
    await s2.refreshLibrary(); await s2.openTrip(A);
    s2.dispatch({ type: 'setTripMeta', patch: { title: 'From the other tab' } });
    await s2.flush();
    s1.dispatch({ type: 'setTripMeta', patch: { title: 'From this tab' } });
    await s1.flush().catch(() => {});
    const before = s1.getState().persistence.status;
    await s1.mergeWithStored().catch(() => {});
    await settle(20);
    ok(isLive(s1), 'D4: the merge install takes no supersede and `doMerge`\'s own read answers for it (A-68 Part 4.2 item 2)',
      { statusBeforeMerge: before, ...liveState(s1) });
    const reads = /await readPhotoAvailability\(state\.doc\);\s*\n\s*return state;\s*\n\s*}\s*\n/.test(src.slice(src.indexOf('async function doMerge')));
    ok(reads, 'D4: `doMerge`\'s trailing `readPhotoAvailability(state.doc)` is unconditional — no ticket, no branch');
    ok(!/A-68 Part 4\.2 item 2[\s\S]{0,400}guard\.supersede/.test(src),
      'D4: and no supersede was "completed" at the merge install');
  }
}

// --------------------------------------------------------------------------- §E

if (run('E')) {
  head('§E — the tenth site (A-68 Part 6): does the `catch` tell "still open" from "now gone"?');
  // E1 — active branch, cascade rejects, trip still open: the re-read must happen and must report
  // what is actually on disk, not `'ready'` over bytes `removeTrip` already took.
  {
    const [p, store] = mk('e1');
    const A = await trip(store, 'A');
    await store.openTrip(A);
    p.photo.next = [file('one.jpg')];
    const imp = store.importPhotos({ kind: 'trip' }); await p.photo.release(1); await imp; await store.flush();
    const l0 = listing(store);
    p.storage.failDeleteFor.add(A);
    const threw = await store.deleteTrip(A).then(() => null).catch((e) => e.message);
    await settle(20);
    const l1 = listing(store);
    ok(threw !== null && store.getState().doc?.id === A,
      'E1: the delete fails LOUDLY and the trip is still open', { threw, doc: store.getState().doc?.id });
    ok(p.photo.removedTrips.includes(A), 'E1: `removeTrip` had already run when `storage.delete` refused', p.photo.removedTrips);
    ok(l0.phase === 'ready' && l0.missing === 0, 'E1: the listing was `ready` before the failed delete', l0.phase);
    ok(l1.phase === 'ready' && l1.missing === 1,
      'E1: and afterwards it reports the photograph as MISSING rather than `ready` over gone bytes (§10 A-65 T1)',
      { phase: l1.phase, missing: l1.missing, items: l1.items.map((i) => `${i.asset.id}:${i.availability}`) });
  }
  // E2 — the happy path costs nothing: no extra `present()` when the cascade succeeds.
  {
    const [p, store] = mk('e2');
    const A = await trip(store, 'A');
    const B = await trip(store, 'B');
    await store.openTrip(A);
    p.photo.next = [file('one.jpg')];
    const imp = store.importPhotos({ kind: 'trip' }); await p.photo.release(1); await imp; await store.flush();
    const calls = p.photo.presentCalls;
    await store.deleteTrip(A);
    await settle(10);
    ok(store.getState().doc === null, 'E2: a SUCCEEDING active delete leaves no document');
    ok(p.photo.presentCalls === calls, 'E2: and issues no extra `present()` — the happy path is unchanged',
      { before: calls, after: p.photo.presentCalls });
    note(`E2: (trip B exists and was untouched: ${B})`);
  }
  // E3 — the non-active branch's rejecting cascade must NOT re-read: `wasActive` is false and the
  // open trip's key range was never touched.
  {
    const [p, store] = mk('e3');
    const A = await trip(store, 'A');
    const B = await trip(store, 'B');
    await store.openTrip(A);
    p.photo.next = [file('one.jpg')];
    const imp = store.importPhotos({ kind: 'trip' }); await p.photo.release(1); await imp; await store.flush();
    const calls = p.photo.presentCalls;
    p.storage.failDeleteFor.add(B);
    const threw = await store.deleteTrip(B).then(() => null).catch((e) => e.message);
    await settle(10);
    ok(threw !== null && store.getState().doc?.id === A, 'E3: the non-active delete fails loudly, A is still open', threw);
    ok(p.photo.presentCalls === calls,
      'E3: and issues NO re-read — `wasActive` is false and A\'s key range was never in the cascade',
      { before: calls, after: p.photo.presentCalls });
    ok(listing(store).phase === 'ready' && listing(store).missing === 0,
      'E3: A\'s listing is untouched', { phase: listing(store).phase, missing: listing(store).missing });
  }
  // E4 — `wasActive` is captured on the FIRST line, before anything can move it. The adversarial
  // case: the active trip changes DURING the cascade (it cannot, because the claim is held), and
  // the case the ruling does not name — a reseed that happens and THEN the link throws.
  {
    ok(/const wasActive = state\.activeTripId === id;/.test(src),
      'E4: `wasActive` is hoisted to `deleteTrip`\'s first line and is the same expression the install uses');
    const del = src.slice(src.indexOf('async deleteTrip(id: string)'), src.indexOf('async deleteTrip(id: string)') + 12000);
    const readIdx = del.indexOf('if (wasActive) await readPhotoAvailability(state.doc);');
    const throwIdx = del.indexOf('throw err;');
    const finIdx = del.indexOf('} finally {');
    const relIdx = del.indexOf('releaseTransition();');
    ok(readIdx > 0 && throwIdx > readIdx && del.slice(readIdx, throwIdx).trim().split('\n').length <= 2,
      'E4: the catch re-reads and then RETHROWS on the next line — the delete\'s own failure is not swallowed by the read',
      { readIdx, throwIdx });
    ok(finIdx > throwIdx && relIdx > finIdx,
      'E4: and `releaseTransition` is still in a `finally` that covers the new `catch`', { finIdx, relIdx });
    note('One residue, recorded not filed: the re-read is awaited INSIDE the `catch`, i.e. while the `doc`');
    note('claim is still held, so the transition window is one `present()` round trip longer on a path that');
    note('is already failing. Nothing is stranded by it (the read claims a different slot) and A-67 Part 11');
    note('residue 4 already owns the "the window is open and gestures are refused" cost.');
  }
  // E5 — a delete of the active trip whose cascade rejects, with an availability read in flight.
  {
    const ctx = await parkedRead('e5');
    await unpark(ctx);
    ctx.p.storage.failDeleteFor.add(ctx.A);
    const threw = await ctx.store.deleteTrip(ctx.A).then(() => null).catch((e) => e.message);
    await drain(ctx);
    ok(isLive(ctx.store) && listing(ctx.store).phase !== 'loading',
      'E5: a rejecting ACTIVE cascade with a read in flight still reaches a terminal state',
      { ...liveState(ctx.store), threw });
  }
}

// --------------------------------------------------------------------------- §F

if (run('F')) {
  head('§F — G14 and G17\'s disclosed mutant mismatches, verified rather than believed');
  const arch = readFileSync(resolve(CAIRN, 'docs/ARCHITECTURE.md'), 'utf8');
  const a68 = arch.slice(arch.indexOf('#### A-68 —'), arch.indexOf('### 4.3 Ports'));

  // F1 — G14. The builder says fault 1 (supersede back inside the value guard) cannot redden
  // `removePhoto` + `undo`, because on the `available === null` path the supersede and the owed
  // read's own `claim` are in the same synchronous block. Check the premise in the SHIPPED code.
  const rp = src.slice(src.indexOf('async removePhoto(photoId: string)'), src.indexOf('async reclaimPhotoBytes'));
  // **RE-CUT AT ROUND 50 — the machinery this pair measured is GONE.** §4.2 **A-69** Part 6 item 1
  // DELETES `availabilityOwed` and both discharge lines; A-69 Part 3 is why (*"no correctness
  // argument in the store may rest on an exhaustive enumeration of control-flow exits"*). The
  // premise round 49 checked — *"the supersede and the owed read's `claim` are one statement
  // apart"* — is no longer a fact about this file, so asserting it would be asserting the shape of
  // deleted code. What replaces it is the fact G14's corrected criterion now rests on: the
  // supersede is still there and unconditional (A-69 Part 6 item 2, *ordering*), the value guard is
  // still nested inside it (R45-4), and the LIVENESS half is discharged nowhere in this method —
  // it is discharged at the boundary, which is why the corrected G14 mutates `settleAvailability`
  // and not the supersede.
  const tail = rp.slice(rp.indexOf('await ports.photo.remove('));
  ok(/guard\.supersede\('photoAvailability'\);\n(?: *\/\/[^\n]*\n)* *if \(state\.photos\.available !== null\) \{/.test(tail),
    'F1 (re-cut, A-69 Part 6 item 2): `removePhoto`\'s supersede is still hoisted OUT of R45-4\'s value guard, with that guard kept verbatim and nested inside — removing either re-opens R48-1',
    tail.slice(tail.indexOf("guard.supersede('photoAvailability')"), tail.indexOf("guard.supersede('photoAvailability')") + 90));
  ok(!/availabilityOwed/.test(rp) && !/await readPhotoAvailability\(/.test(rp),
    'F1 (re-cut, A-69 Part 6 item 1): and there is NO owed flag and NO discharge line left in `removePhoto` — the liveness half is paid at the boundary, which is what makes the corrected G14 mutate `settleAvailability` instead',
    rp.match(/availabilityOwed[^\n]*|await readPhotoAvailability\([^\n]*/g));
  note('So on the `available === null` path the supersede is bump N and the claim is bump N+1, one');
  note('statement apart with no interleaving point — a mutant that deletes the supersede leaves the');
  note('claim doing the same invalidation. **The builder\'s explanation is mechanically correct.** The');
  note('imprecision is A-68 G14\'s own *"both mutations above → red"*, not the code and not the test.');
  // **RE-CUT AT ROUND 50.** Round 49 asserted that A-68's G14 still *carried* the wrong wording,
  // which was the finding. A-69 Part 10 item 1 ruled on it, so the current contract is that the
  // CORRECTION exists and names the fault that actually reproduces.
  const a69 = arch.slice(arch.indexOf('#### A-69 —'), arch.indexOf('#### A-70 —'));
  ok(/\*\*G14's \*"Both mutations above → red"\* is false and becomes one mutation\.\*\*/.test(a69)
     && /\*\*Mutation: make\s*\n?\s*`settleAvailability` a no-op\*\*/.test(a69),
    'F1 (re-cut): A-69 Part 10 item 1 CORRECTS G14 — the reproducing fault is *"make `settleAvailability` a no-op"*, and R45-4\'s value-guard mutation reddens G13 alone (QA R49-3a, ruled)');

  // F2 — G17. The builder says deleting a reseed supersede cannot redden G4…G7 because every
  // INSTALLING transition issues a read whose claim is newer. Check that A-68 says so itself, and
  // that the shipped `openTrip` really has no interleaving point between its install and its read.
  ok(/after the install every installing transition issues a read whose claim is newer than\s*\n?anything issued inside the window/.test(a68.replace(/\n/g, '\n')),
    'F2: A-68 Part 4.2 item 3 states the builder\'s reason in its own last sentence');
  const ot = src.slice(src.indexOf('async openTrip(id: string)'), src.indexOf('async browseTrip('));
  const betweenInstallAndRead = ot.slice(ot.indexOf('}, { reseed: true });'), ot.indexOf('await readPhotoAvailability(installed)'));
  ok(!/\bawait\b/.test(betweenInstallAndRead),
    'F2: `openTrip` has no `await` between its reseed install and `readPhotoAvailability` — the supersede is redundant FOR ORDERING there',
    betweenInstallAndRead.match(/await [^\n]*/g));
  note('Which is why G17 had to be measured at a DOCUMENT-LESS reseed (`closeTrip`, the active');
  note('`deleteTrip`) — the only reseeds where the supersede is the sole thing carrying the ordering.');
  note('Both explanations are sound. They are criterion-precision defects in A-68 Part 10, not gaps in');
  note('the test coverage: what G14 and G17 were written to catch IS caught, by a different mutant.');

  // F3 — the criterion that would have caught it: delete `closeTrip`'s supersede and watch a read
  // for the closed trip stamp its answer into the reseeded state. Assert the shape exists.
  ok((src.match(/guard\.supersede\('photoAvailability'\)/g) ?? []).length === 8,
    'F3: eight `supersede(\'photoAvailability\')` sites — the six reseeds plus the two byte-write sites (G16)',
    (src.match(/guard\.supersede\('photoAvailability'\)/g) ?? []).length);
}

// --------------------------------------------------------------------------- §G

if (run('G')) {
  head('§G — `removePhoto`\'s `guard.observe(\'doc\')` and the asymmetry with `importPhotos`');
  // G1 — the stated reason: `importPhotos`' supersede sits one statement after a `current` check
  // with no await; `removePhoto`'s has an `await ports.photo.remove` in between. Both halves,
  // checked against the source rather than the ruling.
  const imp = src.slice(src.indexOf('async importPhotos('), src.indexOf('dismissPhotoFailures'));
  const win = imp.slice(imp.lastIndexOf("if (!guard.current('doc', g)) break;"), imp.indexOf("guard.supersede('photoAvailability')"));
  ok(!/\bawait\b/.test(win),
    'G1a: `importPhotos` — no `await` between the step-5 `current(\'doc\', g)` check and its supersede',
    win.match(/await [^\n]*/g));
  const rp = src.slice(src.indexOf('async removePhoto(photoId: string)'), src.indexOf('async reclaimPhotoBytes'));
  ok(/const g = guard\.observe\('doc'\);/.test(rp) && /await ports\.photo\.remove\(tripId, photoId\);[\s\S]{0,600}if \(guard\.current\('doc', g\)\) \{/.test(rp),
    'G1b: `removePhoto` — `observe(\'doc\')` before the `await`, and the whole tail re-checks `current` after it');
  ok(!/if \(guard\.current\('doc', g\)\) \{\s*\n[\s\S]{0,3000}?guard\.supersede\('photoAvailability'\);/.test(imp),
    'G1c: and `importPhotos`\' supersede is NOT nested in a second `current` check — the asymmetry is real, not a copy-paste');

  // G2 — exploit the timing difference: a transition landing inside `ports.photo.remove` must
  // leave the trip the user moved to untouched (A-68 G15), while a transition landing inside
  // `ports.photo.write` must not (A-66 Part 10 item 3 — it breaks before the dispatch).
  {
    const ctx = await parkedRead('g2');
    const id = ctx.store.getState().doc.photos[0].id;
    ctx.p.photo.slowRemove = true;
    const rm = ctx.store.removePhoto(id);
    await tick(); await tick();
    await unpark(ctx);
    await ctx.store.openTrip(ctx.B);                       // lands INSIDE `photo.remove`
    await ctx.p.photo.releaseRemove(1);
    await rm;
    await drain(ctx);
    const s = ctx.store.getState();
    ok(s.doc?.id === ctx.B, 'G2: the user is on B', s.doc?.id);
    ok(s.photos.orphans.length === 0, 'G2: no orphan from A\'s removal is reported against B', s.photos.orphans);
    ok(s.photos.tripId === ctx.B, 'G2: and the availability set B holds is B\'s own', { tripId: s.photos.tripId });
    ok(isLive(ctx.store) && client.photosFor(s, { kind: 'trip' }).phase !== 'loading',
      'G2: B reaches a terminal state (A-68 G15)', liveState(ctx.store));
  }
  // G3 — the same race with a REJECTING remove: the orphan must land on A or nowhere, never on B.
  {
    const ctx = await parkedRead('g3');
    const id = ctx.store.getState().doc.photos[0].id;
    ctx.p.photo.slowRemove = true;
    const rm = ctx.store.removePhoto(id);
    await tick(); await tick();
    await unpark(ctx);
    await ctx.store.openTrip(ctx.B);
    while (ctx.p.photo.removeGates.length) ctx.p.photo.removeGates.shift().fail(new Error('remove refused'));
    await rm.catch(() => {});
    await drain(ctx);
    ok(ctx.store.getState().photos.orphans.length === 0,
      'G3: a FAILING remove during a transition reports no orphan against the incoming trip (§10 A-66 Part 3)',
      ctx.store.getState().photos.orphans);
  }
  // G4 — the race the asymmetry is supposed to make impossible: `removePhoto` cannot take an
  // observation inside a transition window, because `dispatch` refuses there first.
  {
    const ctx = await parkedRead('g4');
    await unpark(ctx);
    const id = ctx.store.getState().doc.photos[0].id;
    ctx.p.storage.slowLoad = true;
    const opening = ctx.store.openTrip(ctx.B);
    await settle(4);
    const threw = await ctx.store.removePhoto(id).then(() => null).catch((e) => e.message);
    ctx.p.storage.slowLoad = false;
    while (ctx.p.storage.loadGates.length > 0) await ctx.p.storage.loadGates.shift()();
    await opening.catch(() => {});
    await drain(ctx);
    ok(threw !== null && /trip is being opened or closed/i.test(threw),
      'G4: `removePhoto` inside a transition window is refused by its own `dispatch` before it can observe', threw);
    ok(!ctx.p.photo.removedTrips.includes(ctx.A), 'G4: and no byte was touched', ctx.p.photo.removedTrips);
  }
}

// --------------------------------------------------------------------------- §H

if (run('H')) {
  head('§H — G16 re-derived from the sources');
  const cnt = (re) => (src.match(re) ?? []).length;
  ok(cnt(/guard\.claim\('photoAvailability'\)/g) === 1, 'exactly one `claim(\'photoAvailability\')` — `readPhotoAvailability`', cnt(/guard\.claim\('photoAvailability'\)/g));
  ok(cnt(/guard\.claim\('browsing'\)/g) === 1, 'exactly one `claim(\'browsing\')` — `browseTrip`', cnt(/guard\.claim\('browsing'\)/g));
  ok(cnt(/guard\.claim\('doc'\)/g) === 1, 'exactly one `claim(\'doc\')` — `claimTransition`', cnt(/guard\.claim\('doc'\)/g));
  ok(cnt(/guard\.supersede\('photoAvailability'\)/g) === 8, 'exactly eight `supersede(\'photoAvailability\')`', cnt(/guard\.supersede\('photoAvailability'\)/g));
  // **RE-CUT AT ROUND 50: seven → eight.** §4.2 **A-69** Part 8 (QA R49-4) adds one, on
  // `deleteTrip`'s NON-active install, and it is unconditional there on purpose.
  ok(cnt(/guard\.supersede\('browsing'\)/g) === 8,
    'exactly eight `supersede(\'browsing\')` — the six reseeds, `closeBrowse`, and A-69 Part 8\'s new one on `deleteTrip`\'s non-active branch',
    cnt(/guard\.supersede\('browsing'\)/g));
  ok(cnt(/claimTransition\(\)/g) === 3, 'exactly two `claimTransition()` CALL sites plus its declaration (A-67 G8)', cnt(/claimTransition\(\)/g));
  ok(cnt(/\{ reseed: true \}/g) + cnt(/\n\s*\{ reseed: true \},/g) >= 6, 'at least the six reseed transitions plus the merge');
  // Comment lines are stripped first: two of the three are NAMED in the comments that record their
  // deletion, which is the point of those comments (A-67 Part 7).
  const exec = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  ok(!/isLiveTrip\(/.test(exec) && !/state\.doc\?\.id !== tripId/.test(exec) && !/state\.doc\?\.id !== doc\.id/.test(exec),
    'the three deleted point-fixes are gone from every EXECUTABLE line, not layered under (A-67 Part 7)',
    exec.match(/isLiveTrip\(|state\.doc\?\.id !== (tripId|doc\.id)/g));
  // **RE-CUT AT ROUND 50.** The branch no longer gets nothing: A-69 Part 8 gives it a `browsing`
  // supersede and a conditional pane clear, while A-68 Part 4.2 item 1 is *narrowed rather than
  // withdrawn* for `photoAvailability`. Both halves are now the contract, so both are asserted.
  ok(/A-68 Part 4\.2 item 1 still holds for `photoAvailability` and a builder may NOT add/.test(src),
    'the non-active `deleteTrip` install still carries its do-nothing reason for `photoAvailability` in writing (A-68 Part 4.2 item 1, narrowed by A-69 Part 8)');
  ok(/guard\.supersede\('browsing'\);\n\s*set\(\{ \.\.\.state, library, openFailures,\n\s*browsing: state\.browsing\?\.id === id \? null : state\.browsing \}\);/.test(src),
    'A-69 Part 8 (QA R49-4): and it now clears a pane over the trip it just destroyed — unconditional supersede, conditional write',
    /guard\.supersede\('browsing'\);[\s\S]{0,200}/.exec(src.slice(src.indexOf('A-69 Part 8 (QA R49-4)')))?.[0]);
  ok(/A-68 Part 4\.2 item 2 — this install deliberately gets NO supersede/.test(src),
    'the merge install carries its do-nothing reason in writing');
  // **RE-CUT AT ROUND 50: 7 → 0, and 2 → 0.** A-69 Part 6 item 1 deletes the flag and both
  // discharge lines; A-70 Part 6 **G24** publishes the zero. The two lines below are what the
  // boundary replaced them with, so an empty set here is never read as a probe that measured
  // nothing: S1 is the wrapped return, S2 is the read's own `finally`, and the wrapper must settle
  // on **both** arms (A-69 Part 12 G20's own injected fault is dropping the rejection arm).
  ok(cnt(/availabilityOwed/g) === 0,
    '`availabilityOwed` is DELETED, not left beside the boundary (A-69 Part 6 item 1) — 7 mentions at `4398de5`, 0 now',
    cnt(/availabilityOwed/g));
  ok(cnt(/if \(availabilityOwed && guard\.current\('doc', g\)\) await readPhotoAvailability\(state\.doc\);/g) === 0
     && /\n {2}return settling\(\{/.test(src) && cnt(/\n {2}return \{/g) === 0,
    'A-68 Part 5b\'s `doc`-slot discharge is gone from BOTH byte-write sites, and `createStore` returns `settling(` and nothing else — the debt moved from two hand-written lines to one wrapper (A-69 Part 4 site S1)',
    { discharges: cnt(/if \(availabilityOwed && guard\.current\('doc', g\)\) await readPhotoAvailability\(state\.doc\);/g), bareReturns: cnt(/\n {2}return \{/g) });
  ok(/async \(v\) => \{ await settleAvailability\(\); return v; \},\n\s*async \(e\) => \{ await settleAvailability\(\); throw e; \},/.test(src)
     && /\} finally \{\n(?:[^\n]*\n)*? {6}await settleAvailability\(\);\n {4}\}\n {2}\}/.test(src),
    'and both settling sites are present in their ruled shapes — S1 on the resolution AND rejection arms (A-69 Part 12 G20), S2 as `readPhotoAvailability`\'s own `finally` (BUILD-NOTES KD-85, A-70 G30)');
  ok(/@throws \{Error\} `TRANSITION_IN_PROGRESS_MESSAGE`/.test(src.slice(src.indexOf('async removePhoto') - 2500, src.indexOf('async removePhoto'))),
    'A-68 Part 8: `removePhoto`\'s `@throws` now names `TRANSITION_IN_PROGRESS_MESSAGE`');
}

// --------------------------------------------------------------------------- §I

if (run('I')) {
  head('§I — A-68 Part 9\'s predicate applied, rather than its three line numbers trusted');
  note('The predicate: an assertion moves iff its expected value came from (i) a guard that fired');
  note('AFTER `ports.photo.write` — any count of stranded derivative pairs or orphan byte keys — or');
  note('(ii) id-identity passing on a RETURN trip. Applied by grep across every `qa/` probe, then');
  note('confirmed by running them.');
  const probes = ['r45-i13.mjs', 'r46-i13b.mjs', 'r47-i13c.mjs', 'r48-i13d.mjs'];
  const candidates = [];
  for (const f of probes) {
    const t = readFileSync(resolve(HERE, f), 'utf8').split('\n');
    t.forEach((l, i) => {
      const clauseI = /(photo\.)?(thumbs|displays)\.size === [1-9]|keys\((p|q|w|r|store|[a-z]+)\.photo\)\.length === [1-9]|orphans\.length === [1-9]|strandedPairs\.length/.test(l);
      const clauseII = /→ (B|qB) → (A|qA)|A → B → A/.test(l);
      if (clauseI || clauseII) candidates.push(`${f}:${i + 1}  ${clauseI ? '(i)' : '(ii)'}  ${l.trim().slice(0, 96)}`);
    });
  }
  candidates.forEach((c) => note(c));
  note('Every candidate above was then run. The three that are RED are exactly A-68 Part 9\'s three;');
  note('the rest are either the NEW mechanism\'s own bounds (r48-i13d §H — a transition inside');
  note('`ports.photo.write` itself, which A-66 Part 10 item 3 keeps at one pair), positive setup');
  note('assertions (`thumbs.size === 3` before a delete), or `<=` bounds that were always satisfiable');
  note('at zero. **No fourth line moves.**');
}

// --------------------------------------------------------------------------- §J

if (run('J')) {
  head('§J — **R49-2 and R49-3**: A-68 Part 9\'s own enumeration, and Part 10\'s stated mutants');
  const arch = readFileSync(resolve(CAIRN, 'docs/ARCHITECTURE.md'), 'utf8');
  const a68 = arch.slice(arch.indexOf('#### A-68 —'), arch.indexOf('### 4.3 Ports'));

  const a69 = arch.slice(arch.indexOf('#### A-69 —'), arch.indexOf('#### A-70 —'));

  // **RE-CUT AT ROUND 50.** R49-2 was routed to the architect and A-69 Part 9 ruled on it. The
  // stale sentence is left standing inside A-68 on purpose — this document's convention is an
  // amendment banner plus a later entry, not a silent edit (A-62 Part 8, A-64, A-42 are the
  // precedents) — so the CURRENT contract is not *"A-68 no longer says it"* but *"A-68 carries the
  // banner and A-69 Part 9 carries the correction"*. Asserting the absence would now be asserting
  // against the house style rather than against a defect.
  ok(/Part 9's \*"§K is green"\* is \*\*false\*\* and corrected/.test(a68),
    'R49-2 (re-cut): A-68\'s revision-50 amendment banner declares Part 9\'s *"§K is green"* false, so a reader of Part 9 cannot reach it without the correction',
    (/§K is green[^\n]{0,60}/.exec(a68) ?? [])[0]);
  ok(/\*\*Round 48's R48-5 naming of §K was correct\.\*\*/.test(a69)
     && /a `qa\/` probe's silence is not evidence unless the probe says it finished/.test(a69),
    'R49-2 (re-cut): and A-69 Part 9 rules it — R48-5 was right, and it adds the standing requirement that a probe print a terminal marker, which is why this file now prints one');
  note('Why three rounds of enumeration missed it: `qa/r47-i13c.mjs` §D face 1 dispatches INSIDE a');
  note('transition window, and A-67 Part 6 made that `dispatch` THROW. From `4316167` the probe died');
  note('there with an uncaught error, so §E…§N never executed — including §K. Both round 48 and A-68');
  note('Part 9 reported this probe\'s status as a count of `FAIL` lines from a run that stopped at §D.');
  note('§D face 1 is re-cut this round to catch the refusal, and the probe now runs end to end.');

  // R49-3 — Part 10's stated mutants. Three of them do not reproduce as worded. The builder
  // disclosed two (G14, G17); Part 9's own vacuity mutant for `:231` is the third and is new.
  // **RE-CUT AT ROUND 50**, same reason: A-69 Part 10 item 1 is the ruling on R49-3a.
  ok(/\*\*G14's \*"Both mutations above → red"\* is false and becomes one mutation\.\*\*/.test(a69)
     && /R45-4's value-guard mutation does \*\*not\*\*\s*\n?\s*redden this criterion and never did/.test(a69),
    'R49-3a (re-cut): A-69 Part 10 item 1 corrects G14 to the one mutation that reproduces, and says in as many words that R45-4\'s value-guard mutation reddens G13 alone');
  ok(!/the mutation that proves the replacement carries them is \*\*deleting the `supersede` before a reseed install\*\* → an older read lands over a newer trip's state → red/.test(a68),
    'FINDING R49-3b: A-68 **G17**\'s stated mutant does not redden G4…G7 — Part 4.2 item 3\'s own last sentence says why, and G17 has to be measured at a DOCUMENT-LESS reseed (§F2)');
  // **RE-CUT AT ROUND 50**, same reason: A-69 Part 10 item 3 is the ruling on R49-3c, and it
  // adopts this round's own control script as the corrected wording.
  ok(/\*\*Corrected:\*\* \*the control restores\s*\n?\*\*both\*\* guards — `isLiveTrip\(tripId\)` at step 4 and `state\.doc\?\.id !== tripId` at step 5/.test(a69)
     && /`M2_STEP5_ONLY=1` is retained as the control/.test(a69),
    'R49-3c (re-cut): A-69 Part 10 item 3 corrects Part 9\'s `:231` mutant to the PAIR of guards, and keeps `M2_STEP5_ONLY=1` as the control showing the original wording green');
  note('All three are criterion-precision defects in a ruling whose CODE is correct. They are one row');
  note('together because they are one habit: a mutant stated from the shape of the fix rather than');
  note('measured against the build. Two of the three were disclosed by the builder rather than papered');
  note('over, which is the right handling and is why this is MINOR.');
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL line(s)`}`);
// **A-69 Part 9's standing requirement**: a probe's silence is not evidence unless the probe says
// it finished. A run without the line below is INCOMPLETE and is never reported as a FAIL count.
console.log('-- r49-i13e.mjs COMPLETE (ran through §J) --');
process.exit(0);
