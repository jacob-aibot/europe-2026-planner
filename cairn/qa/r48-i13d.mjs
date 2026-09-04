/**
 * **QA round 48 — the I-13d confirmation-breaker pass.** ARCHITECTURE §4.2 **A-67** (revision 47)
 * with **Part 7a** (revision 48), and §10 **A-66 Part 10**, over `4430e34..HEAD` — round 47's
 * head, the I-13d build (`4316167`), revision 48 (`43cfa23`) and the builder's group-5 test fix
 * (`ae62326`).
 *
 *   node --experimental-strip-types qa/r48-i13d.mjs                      (from cairn/)
 *   R48_ONLY=E,F node --experimental-strip-types qa/r48-i13d.mjs         (selected sections)
 *
 * `R48_ONLY` exists so `qa/r48-controls.sh` can run one section inside a worktree at another
 * commit — that is how §F is shown to be a **regression** rather than a standing hole.
 *
 * **A `FAIL` line is a finding.** Every one carries its id.
 *
 *   A  the fences over the I-13d range: `.tsx`, dependencies, `docs/design/`, the root planner,
 *      determinism, no DOM in `packages/{core,client}`, and the privacy greps over EVERY added
 *      production line.
 *   B  **A-67 held** under sequences its own G1–G9 do not drive: A → B → C → A around a live
 *      4-file import; three `openTrip`s resolving out of order; two browses; a browse against
 *      `closeBrowse`; a browse against a trip transition; two DIFFERENT async writers
 *      (`importPhotos` and `importDoc`) racing the same `doc` slot.
 *   C  **A-67 held.** The release battery: nine throwing exits, and after each one the slot is
 *      still usable. A skipped `release` would make every later operation stale forever.
 *   D  **A-67 held.** `deleteTrip` against `openTrip`, both orders and both branches.
 *   E  **R48-1, MAJOR.** A-67 Part 4's *"a write that changes the subject an in-flight read is
 *      reading must invalidate that read"* is implemented **conditionally**: both `supersede`
 *      calls sit INSIDE R45-4's `state.photos.available !== null` guard, which Part 7 itself says
 *      answers a different question. With `available === null` a byte `write` or `remove` does
 *      not invalidate the read, and the older answer lands over it. Two faces.
 *   F  **R48-2, MAJOR (a REGRESSION).** An availability read invalidated by a claim is dropped and
 *      **never re-issued**, so `photos.available` stays `null` and the listing sits at `'loading'`
 *      permanently — A-63's unresolving spinner, which §10.6 property 5 forbids and which
 *      `readPhotoAvailability`'s own docstring says is impossible *"by construction"*. Three
 *      producers. Green at `4430e34`; red here.
 *   G  **R48-3, MINOR.** A-67 Part 11 residue 4 says the `dispatch`/`undo`/`redo` refusal is
 *      *"unreachable from today's `apps/web`"*. It is not: `App.tsx:233-244` binds Ctrl/Cmd+Z to
 *      `store.undo()` on `window`, uncaught, with no window check — and `deleteTrip` holds a `doc`
 *      claim across its whole cascade while the active trip stays open and interactive.
 *   H  **A-66 Part 10 item 3's residual, measured**: a transition landing inside `ports.photo.write`
 *      itself strands exactly one derivative pair, and nothing else.
 *   I  **A-67 Part 4's criterion re-derived** against the current code rather than read off the
 *      table: is there a fourth field that needs a slot?
 *   J  **G8 and G9**, the two "still true" greps, re-derived from the sources.
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

/** Round 47's head — where this round's surface starts. */
const BASE = process.env.R48_BASE ?? '4430e34';
const HEAD_ = process.env.R48_HEAD ?? 'HEAD';
const ONLY = (process.env.R48_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const run = (s) => ONLY.length === 0 || ONLY.includes(s);
const NUL = String.fromCharCode(0);

const tagged = (n, l = 64) => { const o = new Uint8Array(l); for (let i = 0; i < n.length && i < l; i++) o[i] = n.charCodeAt(i) & 0x7f; return o; };
const file = (n, type = 'image/jpeg') => ({ name: n, type, bytes: tagged(n) });
const tick = () => new Promise((r) => setTimeout(r, 0));
const keys = (port) => [...port.thumbs.keys()].map((k) => k.replace(NUL, '/')).sort();
const dkeys = (port) => [...port.displays.keys()].map((k) => k.replace(NUL, '/')).sort();
const shape = (l) => ({ phase: l.phase, missing: l.missing, items: l.items.map((i) => `${i.asset.id}:${i.availability}`) });
const listing = (store, ref = { kind: 'trip' }) => client.photosFor(store.getState(), ref);

/**
 * A `PhotoPort` whose `derive`, `write`, `present` and `remove` can each be parked.
 *
 * `derive` is §10.4's halving loop — *deliberately* seconds of canvas work per file, which is why
 * a transition landing inside it is the ordinary case and not a contrivance. `present` is the one
 * that matters for §E and §F, and it is parked **after** computing its answer: the whole subject
 * is an answer that was true when it was issued and is not true when it lands.
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
  port.presentGates = []; port.slowPresent = false;
  port.present = (t, ids) => {
    if (!port.slowPresent) return bp(t, ids);
    const answer = bp(t, ids);                       // the ANSWER is computed now; only its arrival is late
    return new Promise((res, rej) => { port.presentGates.push({ run: async () => res(await answer), fail: (e) => rej(e) }); });
  };
  const bw = port.write.bind(port);
  port.writeGates = []; port.slowWrite = false;
  port.write = (...a) => (port.slowWrite
    ? new Promise((res) => { port.writeGates.push(async () => res(await bw(...a))); })
    : bw(...a));
  port.releaseWrite = async (n = 1) => {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 80 && port.writeGates.length === 0; k++) await tick();
      const g = port.writeGates.shift(); if (g) await g(); await tick();
    }
  };
  return port;
}
/** A `StoragePort` whose `load` and `delete` can be parked — one IndexedDB round trip each. */
function gatedStorage() {
  const s = client.memoryStorage();
  const bl = s.load.bind(s);
  s.loadGates = []; s.slowLoad = false;
  s.load = (id) => (s.slowLoad ? new Promise((res) => { s.loadGates.push(async () => res(await bl(id))); }) : bl(id));
  const bdel = s.delete.bind(s);
  s.delGates = []; s.slowDelete = false;
  s.delete = (id) => (s.slowDelete ? new Promise((res) => { s.delGates.push(async () => res(await bdel(id))); }) : bdel(id));
  return s;
}
function mk(prefix = '') {
  const p = {
    storage: gatedStorage(), file: client.memoryFile(), photo: gatedPhotos(),
    clock: client.fixedClockPort('2026-08-01'), ids: client.sequentialIdPort(prefix),
  };
  return [p, client.createStore({ ports: p })];
}
const trip = async (store, title, a, b) => {
  await store.createTrip({ title, startDate: a, endDate: b });
  await store.flush();
  return store.getState().doc.id;
};

// --------------------------------------------------------------------------- §A

if (run('A')) {
  head('§A — the fences over the I-13d range, and the privacy greps over every added line');
  const names = git('diff', '--name-only', `${BASE}..${HEAD_}`).trim().split('\n').filter(Boolean);
  note(`${names.length} files across I-13d, revision 48 and the group-5 test fix`);
  ok(names.filter((n) => n.endsWith('.tsx')).length === 0, 'zero `.tsx` files across the whole range',
    names.filter((n) => n.endsWith('.tsx')));
  ok(names.filter((n) => /package(-lock)?\.json$/.test(n)).length === 0,
    'zero `package.json` / `package-lock.json` movement — no dependency was added',
    names.filter((n) => /package(-lock)?\.json$/.test(n)));
  ok(names.filter((n) => n.startsWith('cairn/docs/design/')).length === 0, '`docs/design/` untouched');
  ok(names.every((n) => n.startsWith('cairn/')), 'nothing outside `cairn/` — the root planner is read-only',
    names.filter((n) => !n.startsWith('cairn/')));
  ok(git('status', '--porcelain', '--', 'europe-2026-itinerary.html', 'docs/', 'tickets/').trim() === '',
    'the live planner, `docs/` and `tickets/` are clean in the working tree');
  // **Widened at round 49**, again at **round 50**, and again at **round 51**: with `R48_HEAD` left
  // at its default the range now also spans I-13e (`test/liveness.test.ts`, A-68 Part 7's
  // invariant), I-13g (`test/settling.test.ts` and `test/settled-invariant.ts`, A-69's boundary),
  // I-13h (A-70), the round-50 fix pass (`test/photos.test.ts`, R50-3) and I-13i
  // (`test/subscriber-error.test.ts`, A-71's brand + A-66 Part 11's `setBatch`).
  // The claim this line makes — **the whole photo arc stays inside `packages/client`, and neither
  // `packages/core` nor `apps/web` is touched by any of it** — is unchanged across all six
  // increments; only the census grew, so the constant is re-cut rather than the claim weakened.
  // **The number is deliberately not in the message** (R50-4): a census that names its claim
  // survives the next increment, a census that names its count does not.
  ok(names.filter((n) => n.startsWith('cairn/packages/') || n.startsWith('cairn/apps/')).join() ===
     ['cairn/packages/client/src/store/generation.ts', 'cairn/packages/client/src/store/store.ts',
      'cairn/packages/client/test/generation.test.ts', 'cairn/packages/client/test/liveness.test.ts',
      'cairn/packages/client/test/photos.test.ts', 'cairn/packages/client/test/settled-invariant.ts',
      'cairn/packages/client/test/settling.test.ts',
      'cairn/packages/client/test/subscriber-error.test.ts'].join(),
    'the whole photo arc stays inside `packages/client` across I-13d…I-13i — `packages/core` and `apps/web` are untouched, and no file outside that one package moved',
    names.filter((n) => n.startsWith('cairn/packages/') || n.startsWith('cairn/apps/')));

  const added = git('diff', `${BASE}..${HEAD_}`, '--', 'cairn/packages/client/src', 'cairn/cli.ts', 'cairn/apps/web/src')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const code = added.filter((l) => !/^\+\s*(\/\/|\/\*|\*)/.test(l) && l.trim() !== '+');
  note(`${added.length} added production lines, ${code.length} of them outside comments`);
  const hits = (re) => code.filter((l) => re.test(l));
  for (const [label, re] of [
    ['`console.*`', /console\./], ['`fetch(` / `XMLHttpRequest` / `sendBeacon`', /fetch\(|XMLHttpRequest|sendBeacon/],
    ['`localStorage` / `sessionStorage`', /localStorage|sessionStorage/],
    ['`geolocation` / `watchPosition`', /geolocation|watchPosition/],
    ['`Date.now` / `new Date(`', /Date\.now|new Date\(/], ['`Math.random` / `crypto.randomUUID`', /Math\.random|crypto\.randomUUID/],
    ['`imap` / `gmail` / `oauth` / `mailbox`', /imap|gmail|oauth|mailbox/i],
    ['a `lat:` / `lng:` literal', /\blat:|\blng:/], ['`setTimeout` / `setInterval`', /setTimeout|setInterval/],
    ['a DOM reference', /\b(document|window|navigator|HTMLElement)\s*\./],
  ]) ok(hits(re).length === 0, `no ${label} in any added production line`, hits(re).slice(0, 3));

  const gen = readFileSync(resolve(CAIRN, 'packages/client/src/store/generation.ts'), 'utf8');
  ok(!/^\s*import /m.test(gen), '`generation.ts` imports nothing at all — zero-dependency by inspection');
  ok(Object.keys(core).length === 83, `core's runtime export surface is still 83`, Object.keys(core).length);
  ok(core.SCHEMA_VERSION === 2, '`SCHEMA_VERSION` is still 2', core.SCHEMA_VERSION);
  const idx = readFileSync(resolve(CAIRN, 'packages/client/src/index.ts'), 'utf8');
  ok(!/generation/.test(idx) && !/Ticket|GenerationGuard/.test(idx),
    'the guard is not on `packages/client`\'s export surface — A-67 Part 9, G9');
}

// --------------------------------------------------------------------------- §B

if (run('B')) {
  head('§B — the guard under sequences G1–G9 do not drive');
  {
    // A -> B -> C -> A, four transitions in one turn, around a live four-file import. R47-1 face 3
    // was measured as four picked / four written / three lost; the ticket is supposed to make the
    // batch stop at the first decode that completes on or after the FIRST of those transitions.
    const [p, store] = mk('t');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    const B = await trip(store, 'B', '2026-09-01', '2026-09-02');
    const C = await trip(store, 'C', '2026-10-01', '2026-10-02');
    await store.openTrip(A);
    p.photo.next = [file('one.jpg'), file('two.jpg'), file('three.jpg'), file('four.jpg')];
    const inflight = store.importPhotos({ kind: 'trip' });
    await p.photo.release(1);
    await store.openTrip(B); await store.openTrip(C); await store.openTrip(A);
    await p.photo.release(3);
    await inflight; await store.flush();
    const s = store.getState();
    const persisted = core.fromJSON((await p.storage.load(A)).doc).photos.map((x) => x.id);
    ok(s.doc.id === A && s.doc.photos.map((x) => x.id).join() === 'tphoto-1',
      'A -> B -> C -> A: the one file that landed before the first transition is in the document', s.doc.photos.map((x) => x.id));
    ok(persisted.join() === 'tphoto-1', 'and it is IN STORAGE — the transition\'s own flush wrote it', persisted);
    ok(keys(p.photo).join() === `${A}/tphoto-1`, 'no byte pair was written for any abandoned file', keys(p.photo));
    ok(s.photos.pending === 0 && s.photos.total === 0 && s.photos.failures.length === 0,
      'the fraction settles at 0/0 with no failure reported (A-66 U2)', { p: s.photos.pending, t: s.photos.total, f: s.photos.failures });
    ok(shape(listing(store)).missing === 0, 'and nothing reads `missing` over bytes that are on disk', shape(listing(store)));
  }
  {
    // Three openTrip calls whose `load`s resolve in the worst possible order (C, A, B). The
    // NEWEST CLAIM must win, on all three fields, whatever order storage answers in.
    const [p, store] = mk('u');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    const B = await trip(store, 'B', '2026-09-01', '2026-09-02');
    const C = await trip(store, 'C', '2026-10-01', '2026-10-02');
    p.storage.slowLoad = true;
    const oa = store.openTrip(A); await tick();
    const ob = store.openTrip(B); await tick();
    const oc = store.openTrip(C); await tick();
    const g = p.storage.loadGates;
    await g[2](); await tick(); await g[0](); await tick(); await g[1](); await tick();
    p.storage.slowLoad = false;
    await Promise.allSettled([oa, ob, oc]);
    const s = store.getState();
    ok(s.doc?.id === C && s.activeTripId === C && s.photos.tripId === C,
      'three `openTrip`s answered out of order: `doc`, `activeTripId` and `photos.tripId` all name the newest (G7, widened to three)',
      { doc: s.doc?.id, active: s.activeTripId, photos: s.photos.tripId });
  }
  {
    const [p, store] = mk('v');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    const B = await trip(store, 'B', '2026-09-01', '2026-09-02');
    p.storage.slowLoad = true;
    const b1 = store.browseTrip(A); await tick();
    const b2 = store.browseTrip(B); await tick();
    await p.storage.loadGates[1](); await tick(); await p.storage.loadGates[0](); await tick();
    p.storage.slowLoad = false;
    await Promise.allSettled([b1, b2]);
    ok(store.getState().browsing?.id === B, 'two browses answered out of order: the NEWER pane wins', store.getState().browsing?.id);
  }
  {
    const [p, store] = mk('w');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    p.storage.slowLoad = true;
    const b1 = store.browseTrip(A); await tick();
    await store.closeBrowse();
    await p.storage.loadGates[0](); await tick();
    p.storage.slowLoad = false; await b1;
    ok(store.getState().browsing === null, 'a browse in flight does not install its pane over a `closeBrowse`', store.getState().browsing?.id);
  }
  {
    const [p, store] = mk('x');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    const B = await trip(store, 'B', '2026-09-01', '2026-09-02');
    const C = await trip(store, 'C', '2026-10-01', '2026-10-02');
    await store.openTrip(A);
    p.storage.slowLoad = true;
    const b1 = store.browseTrip(B); await tick();
    p.storage.slowLoad = false;
    const oc = store.openTrip(C); await tick();
    await p.storage.loadGates[0](); await tick();
    await Promise.allSettled([b1, oc]);
    ok(store.getState().doc?.id === C && store.getState().browsing === null,
      'a trip transition invalidates an in-flight browse: B\'s pane never lands beside C (`claimTransition` claims `browsing` too)',
      { doc: store.getState().doc?.id, browsing: store.getState().browsing?.id ?? null });
  }
  {
    // Two DIFFERENT async writers against the SAME slot. A single ticket-based guard has to be
    // right for a pair of operations that do not know about each other.
    const [p, store] = mk('y');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    await store.openTrip(A);
    const backup = await store.exportActive();
    p.photo.next = [file('one.jpg')];
    const imp = store.importPhotos({ kind: 'trip' });
    await tick(); await tick();
    const doc = store.importDoc(backup);
    await tick();
    await p.photo.release(1);
    await Promise.allSettled([imp, doc]);
    await store.flush();
    ok(store.getState().doc.photos.length === 0 && keys(p.photo).length === 0 && dkeys(p.photo).length === 0,
      '`importPhotos` and `importDoc` racing one `doc` slot: the import writes neither a record nor a byte',
      { photos: store.getState().doc.photos.map((x) => x.id), thumbs: keys(p.photo), displays: dkeys(p.photo) });
  }
}

// --------------------------------------------------------------------------- §C

if (run('C')) {
  head('§C — the release battery: does any throwing exit skip `releaseTransition()`?');
  note('a skipped release leaves `busy > 0` forever, so `observe` returns `null` forever, so EVERY');
  note('later `dispatch` throws and every later import silently no-ops. Nine exits, one at a time.');
  /** After a failure, is the slot still usable? `dispatch` must not throw and an import must land. */
  const alive = async (store, p, label) => {
    let disp = 'ok';
    try { store.dispatch({ type: 'setTripMeta', patch: { title: `alive-${label}` } }); }
    catch (e) { disp = e.message; }
    p.photo.next = [file(`${label}.jpg`)];
    const before = store.getState().doc ? store.getState().doc.photos.length : -1;
    let threw = null;
    const run_ = store.getState().doc ? store.importPhotos({ kind: 'trip' }).catch((e) => { threw = e.message; }) : null;
    if (run_) { await p.photo.release(1); await run_; }
    const after = store.getState().doc ? store.getState().doc.photos.length : -1;
    ok(disp === 'ok' && threw === null && (before < 0 || after === before + 1),
      `after ${label}: the \`doc\` slot is still usable — \`dispatch\` works and an import lands`,
      { dispatch: disp, import: threw ?? `${before} -> ${after}` });
  };
  {
    const [p, store] = mk('c1');
    await trip(store, 'A', '2026-08-07', '2026-08-09');
    try { await store.openTrip('nope'); } catch { /* expected */ }
    await alive(store, p, 'openTrip(missing id)');
  }
  {
    const [p, store] = mk('c2');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    await trip(store, 'B', '2026-09-01', '2026-09-02');
    p.storage.docs.set(A, { ...(await p.storage.load(A)), doc: '{"nonsense":true}' });
    try { await store.openTrip(A); } catch { /* expected */ }
    await alive(store, p, 'openTrip(corrupt document)');
  }
  {
    const [p, store] = mk('c3');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    await trip(store, 'B', '2026-09-01', '2026-09-02');
    p.storage.docs.set(A, { ...(await p.storage.load(A)), doc: '{"nonsense":true}' });
    try { await store.browseTrip(A); } catch { /* expected */ }
    await alive(store, p, 'browseTrip(corrupt document)');
  }
  {
    const [p, store] = mk('c4');
    await trip(store, 'A', '2026-08-07', '2026-08-09');
    try { await store.importDoc('not json at all'); } catch { /* expected */ }
    await alive(store, p, 'importDoc(garbage)');
  }
  {
    const [p, store] = mk('c5');
    await trip(store, 'A', '2026-08-07', '2026-08-09');
    const text = await store.exportActive();
    try { await store.importDoc(JSON.stringify({ ...JSON.parse(text), ownerId: 'somebody-else', id: 'other' })); }
    catch { /* expected */ }
    await alive(store, p, 'importDoc(a document owned by somebody else)');
  }
  {
    const [p, store] = mk('c6');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    await trip(store, 'B', '2026-09-01', '2026-09-02');
    const bdel = p.storage.delete.bind(p.storage);
    p.storage.delete = async () => { throw new Error('IndexedDB: delete refused'); };
    try { await store.deleteTrip(A); } catch { /* expected */ }
    p.storage.delete = bdel;
    await alive(store, p, 'deleteTrip(non-active) whose `storage.delete` rejects');
  }
  {
    const [p, store] = mk('c7');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    const bdel = p.storage.delete.bind(p.storage);
    p.storage.delete = async () => { throw new Error('IndexedDB: delete refused'); };
    try { await store.deleteTrip(A); } catch { /* expected */ }
    p.storage.delete = bdel;
    await alive(store, p, 'deleteTrip(ACTIVE) whose `storage.delete` rejects');
  }
  {
    const [p, store] = mk('c8');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    await trip(store, 'B', '2026-09-01', '2026-09-02');
    let armed = true;
    const un = store.subscribe(() => { if (armed) { armed = false; throw new Error('a subscriber blew up mid-render'); } });
    try { await store.openTrip(A); } catch { /* expected */ }
    un();
    await alive(store, p, 'a subscriber that throws inside the reseeding `set`');
  }
  {
    const [p, store] = mk('c9');
    await trip(store, 'A', '2026-08-07', '2026-08-09');
    const r = await Promise.allSettled([
      store.createTrip({ title: 'X', startDate: '2026-08-07', endDate: '2026-08-09' }),
      store.createTrip({ title: 'Y', startDate: '2026-08-07', endDate: '2026-08-09' }),
    ]);
    ok(r.filter((x) => x.status === 'rejected').length === 1 &&
       /Another trip was opened/.test(r.find((x) => x.status === 'rejected').reason.message),
      'two racing `createTrip`s: exactly one is refused, and by name (`TRANSITION_SUPERSEDED_MESSAGE`)',
      r.map((x) => (x.status === 'rejected' ? x.reason.message.slice(0, 40) : 'ok')));
    await alive(store, p, 'a `createTrip` refused as superseded');
  }
}

// --------------------------------------------------------------------------- §D

if (run('D')) {
  head('§D — `deleteTrip` against `openTrip`, both orders, both branches');
  {
    const [p, store] = mk('d1');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    const B = await trip(store, 'B', '2026-09-01', '2026-09-02');
    await store.openTrip(A);
    p.storage.slowDelete = true;
    const del = store.deleteTrip(A);
    await tick(); await tick();
    const open = store.openTrip(A);                 // the row is still on screen
    await tick(); await tick();
    await p.storage.delGates.shift()();
    p.storage.slowDelete = false;
    await Promise.allSettled([del, open]);
    const s = store.getState();
    ok(s.doc === null && s.activeTripId === null && !s.library.some((r) => r.id === A) && (await p.storage.load(A)) === null,
      'tapping the row of the ACTIVE trip you are deleting does not leave a deleted trip open',
      { doc: s.doc?.id ?? null, library: s.library.map((r) => r.id) });
  }
  {
    const [p, store] = mk('d2');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    const B = await trip(store, 'B', '2026-09-01', '2026-09-02');
    await store.openTrip(B);
    p.storage.slowLoad = true;
    const open = store.openTrip(A);
    await tick(); await tick();
    p.storage.slowLoad = false;
    const del = store.deleteTrip(A);
    await tick(); await tick();
    await p.storage.loadGates.shift()();
    const r = await Promise.allSettled([open, del]);
    ok(r[0].status === 'rejected' && !store.getState().library.some((x) => x.id === A),
      'an `openTrip` parked in `storage.load` when the trip is deleted under it fails loudly rather than installing a ghost',
      r.map((x) => (x.status === 'rejected' ? x.reason.message : 'ok')));
  }
}

// --------------------------------------------------------------------------- §E

if (run('E')) {
  head('§E — R48-1\'s two faces, RE-CUT AT ROUND 49 to assert the fix (A-68 Part 5)');
  note('**Re-cut, not re-run.** A-68 Part 5 hoisted both `supersede(\'photoAvailability\')` calls out of');
  note('R45-4\'s value guard and gave each an owed read, so this section\'s two lines now assert the');
  note('CLOSED behaviour rather than the open finding. The adversarial pressure is unchanged and the');
  note('ordering is still the worst one available: the OLDER answer is released LAST in both faces, so');
  note('a re-nested supersede would let it land and both lines would go red again. The owed read adds');
  note('one parked `present()` per face, which is why the gates are drained newest-first.');
  note('**Re-timed at round 51 (BUILD-NOTES KD-95 item 1, diagnosis re-derived rather than taken).**');
  note('§4.2 A-71\'s `attempt()` adds one promise hop per classified port call, so the owed read is now');
  note('issued one microtask LATER than it was — the face-1 drain used to find its gate parked and now');
  note('finds the array empty for exactly one hop. Measured at `8d69ff1` and at HEAD side by side: same');
  note('three `present()` calls, same final listing, same bytes; only the hop at which gate 3 appears');
  note('moves. So the wait is on the GATE and no longer on a tick count — `gate()` below.');
  {
    // Face 1 — an import lands while a "Try again" read is in flight. The read was issued before
    // the bytes existed; it lands after them and reports the new photograph as `missing`.
    const [p, store] = mk('e1');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    p.photo.next = [file('one.jpg')];
    const first = store.importPhotos({ kind: 'trip' });
    await p.photo.release(1); await first; await store.flush();

    p.photo.slowPresent = true;
    const bad = store.refreshPhotoAvailability();
    p.photo.presentGates.shift().fail(new Error('IndexedDB: UnknownError'));
    await bad;
    ok(store.getState().photos.available === null && listing(store).phase === 'unreadable',
      'INCONCLUSIVE unless a failed read really leaves `available === null`', shape(listing(store)));

    p.photo.next = [file('two.jpg')];
    const inflight = store.importPhotos({ kind: 'trip' });   // seconds of `derive`
    await tick();
    const retry = store.refreshPhotoAvailability();          // the user taps *Try again* while it decodes
    await tick();
    await p.photo.release(1);
    // **Wait for the gate, not for a fixed number of ticks** (round 51). `pick` keeps the ordering
    // this face exists to apply — newest gate first, then the one left behind — and a gate that
    // never arrives is an explicit INCONCLUSIVE rather than a `TypeError` on `undefined.run()`.
    const gate = async (pick, why) => {
      for (let k = 0; k < 200 && p.photo.presentGates.length === 0; k++) await tick();
      const g = pick(p.photo.presentGates);
      ok(g !== undefined, `INCONCLUSIVE unless a parked \`present()\` gate arrives for: ${why}`,
        { parked: p.photo.presentGates.length });
      if (g) { await g.run(); await tick(); }
    };
    await gate((gs) => gs.pop(), 'A-68 Part 5b\'s owed read answers');
    await inflight;                                          // bytes written, record dispatched
    await gate((gs) => gs.shift(), 'the older answer lands last — and is DROPPED');
    await retry;
    p.photo.slowPresent = false;
    const s = store.getState();
    const onDisk = (await p.photo.read(A, 'e1photo-2', 'thumb')) !== null;
    ok(!(onDisk && shape(listing(store)).items.includes('e1photo-2:missing')),
      'R48-1 face 1 CLOSED (re-cut at round 49): an import that races a *Try again* with availability unknown does not read `missing` over bytes that are on disk — the hoisted supersede drops the older answer and the owed read replaces it (A-68 Part 5a/5b)',
      { listing: shape(listing(store)), available: [...(s.photos.available ?? [])], bytesOnDisk: onDisk, byteKeys: keys(p.photo) });
  }
  {
    // Face 2 — the mirror, on `removePhoto`. The read says the photograph is present; the `remove`
    // that happened after it was issued does not invalidate it; `undo` then brings the record back
    // and A-65 T1's `missing` reads `ready` over bytes that no longer exist.
    const [p, store] = mk('e2');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    p.photo.next = [file('one.jpg')];
    const first = store.importPhotos({ kind: 'trip' });
    await p.photo.release(1); await first; await store.flush();
    p.photo.slowPresent = true;
    const bad = store.refreshPhotoAvailability();
    p.photo.presentGates.shift().fail(new Error('IndexedDB: UnknownError'));
    await bad;
    const retry = store.refreshPhotoAvailability();
    await tick();
    const rm = store.removePhoto('e2photo-1');
    await tick(); await tick();
    // A-68 Part 5c's owed read needs NO port call here: the record it removed was the trip's only
    // photograph, so `readPhotoAvailability` takes its `ids.length === 0` branch and writes an
    // empty set synchronously. That is the answer the supersede owed.
    await rm;
    // Same round-51 re-timing as face 1: wait for the gate rather than for a tick count, so a hop
    // added anywhere under this call is INCONCLUSIVE and not a `TypeError`.
    for (let k = 0; k < 200 && p.photo.presentGates.length === 0; k++) await tick();
    const g2 = p.photo.presentGates.shift();                 // the older answer lands last — and is DROPPED
    ok(g2 !== undefined, 'INCONCLUSIVE unless the older `present()` answer is still parked in face 2');
    if (g2) await g2.run();
    await retry;
    p.photo.slowPresent = false;
    store.undo();                                            // A-65: the record comes back, the bytes do not
    ok(keys(p.photo).length === 0 && shape(listing(store)).items.includes('e2photo-1:missing'),
      'R48-1 face 2 CLOSED (re-cut at round 49): after `removePhoto` + `undo` with availability unknown the restored record reads **`missing`** — §10 A-65 **T1**, over bytes that really are gone',
      { listing: shape(listing(store)), byteKeys: keys(p.photo), available: [...(store.getState().photos.available ?? [])] });
  }
}

// --------------------------------------------------------------------------- §F

if (run('F')) {
  head('§F — **R48-2, MAJOR (a REGRESSION)**: an invalidated availability read is never re-issued');
  note('`readPhotoAvailability`\'s docstring (`store.ts:441`): *"Every branch writes an answer, which');
  note('is what makes property 5\'s \'exactly one terminal state follows every loading\' true BY');
  note('CONSTRUCTION rather than by inspection."* A-67 put a `return` in front of every one of those');
  note('branches. Any claim on `photoAvailability` that is not followed by a NEW read now strands the');
  note('listing at `loading` with `available: null` — A-63\'s unresolving spinner, which R46-3 (§F of');
  note('`qa/r46-i13b.mjs`) was filed for and which the R46-3 guard this replaced did not produce.');

  /** Trip B, with one photograph whose bytes are on disk, closed, ready to be re-opened slowly. */
  const primed = async (prefix) => {
    const [p, store] = mk(prefix);
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    const B = await trip(store, 'B', '2026-09-01', '2026-09-02');
    p.photo.next = [file('one.jpg')];
    const i = store.importPhotos({ kind: 'trip' });
    await p.photo.release(1); await i; await store.flush();
    await store.closeTrip();
    return [p, store, A, B];
  };
  const strand = async (prefix, label, interlope) => {
    const [p, store, A, B] = await primed(prefix);
    p.photo.slowPresent = true;
    const open = store.openTrip(B);
    await tick(); await tick();
    const during = shape(listing(store));
    await interlope(store, A, p);
    await p.photo.presentGates.shift().run();
    p.photo.slowPresent = false;
    await open;
    await new Promise((r) => setTimeout(r, 20));            // nothing else is coming
    const after = shape(listing(store));
    ok(after.phase !== 'loading',
      `FINDING R48-2: ${label} — the trip that stayed open is left at \`phase: 'loading'\` permanently. §10.6 property 5 owes exactly one terminal state after every \`'loading'\`, and no second read is ever issued`,
      { whileReading: during, after, available: store.getState().photos.available, doc: store.getState().doc?.id, presentCount: p.photo.presentCount });
    return store;
  };
  await strand('f1', 'a `deleteTrip` of ANOTHER trip claims `photoAvailability` and issues no read of its own',
    async (store, A) => { await store.deleteTrip(A); });
  await strand('f2', 'an `openTrip` of an id that is not in storage claims, fails, and leaves the active document unchanged',
    async (store) => { try { await store.openTrip('does-not-exist'); } catch { /* the banner path */ } });
  await strand('f3', 'an `openTrip` of a CORRUPT document — §2.9 A-47\'s own banner path (R34-2)',
    async (store, A, p) => {
      p.storage.docs.set(A, { ...(await p.storage.load(A)), doc: '{"nonsense":true}' });
      try { await store.openTrip(A); } catch { /* TripParseError, rethrown by design */ }
    });
  {
    // The control: the identical sequence with no interloper settles, so the three above are about
    // the claim and not about the harness.
    const [p, store, A, B] = await primed('f4');
    p.photo.slowPresent = true;
    const open = store.openTrip(B);
    await tick(); await tick();
    await p.photo.presentGates.shift().run();
    p.photo.slowPresent = false;
    await open;
    ok(shape(listing(store)).phase === 'ready',
      'the control: the same slow read with NO interloper reaches `ready` — §F is about the claim, not the gate',
      shape(listing(store)));
  }
  note('At `4430e34` all three producers end at `{phase:"ready", missing:0}` — `qa/r48-controls.sh`');
  note('runs this section in a worktree there. That is what makes R48-2 a regression and not a hole.');
}

// --------------------------------------------------------------------------- §G

if (run('G')) {
  head('§G — **R48-3, MINOR**: A-67 Part 11 residue 4\'s "unreachable" is false');
  {
    const [p, store] = mk('g1');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    const B = await trip(store, 'B', '2026-09-01', '2026-09-02');
    store.dispatch({ type: 'setTripMeta', patch: { title: 'B, edited' } });
    await store.flush();
    p.storage.slowDelete = true;
    const del = store.deleteTrip(A);                   // the OTHER trip; B stays open and interactive
    await tick(); await tick();
    const outcome = {};
    for (const [name, fn] of [
      ['undo', () => store.undo()], ['redo', () => store.redo()],
      ['dispatch', () => store.dispatch({ type: 'setTripMeta', patch: { title: 'x' } })],
      ['removePhoto', () => store.removePhoto('nope')],
    ]) { try { await fn(); outcome[name] = 'ok'; } catch (e) { outcome[name] = e.message; } }
    const live = store.getState().doc?.id === B;
    ok(!(live && /A trip is being opened or closed/.test(outcome.undo)),
      'FINDING R48-3: `undo()` throws `TRANSITION_IN_PROGRESS_MESSAGE` while a DIFFERENT trip is being deleted and the open trip is fully interactive — `App.tsx:233-244` binds Ctrl/Cmd+Z to `store.undo()` on `window`, uncaught and with no window check, so residue 4\'s *"unreachable from today\'s apps/web"* is false',
      { outcome, activeTripStillOpen: live, title: store.getState().doc?.title });
    ok(!/A trip is being opened or closed/.test(outcome.removePhoto),
      'FINDING R48-3 (message re-cut at round 49): `removePhoto` throws the same refusal. **The `@throws` half is CLOSED** — A-68 Part 8 routed it to I-13e and the builder landed it — so this line now carries only the open half: the throw itself, which A-68 Part 8 rules correct and hands to I-13f\'s `.tsx` catch',
      { removePhoto: outcome.removePhoto });
    await p.storage.delGates.shift()();
    p.storage.slowDelete = false;
    await del;
    let after = 'ok'; try { store.undo(); } catch (e) { after = e.message; }
    ok(after === 'ok', 'the refusal is confined to the window — `undo` works again once the delete settles', after);
    const app = readFileSync(resolve(CAIRN, 'apps/web/src/App.tsx'), 'utf8');
    ok(/window\.addEventListener\('keydown'/.test(app) && /store\.undo\(\)/.test(app),
      'INCONCLUSIVE unless `App.tsx` really binds undo to a window-level keydown', false);
    ok(/try\s*\{[\s\S]{0,240}store\.undo\(\)/.test(app) || /store\.undo\(\)[\s\S]{0,120}catch/.test(app),
      'FINDING R48-3: the keydown handler does not catch, so the refusal surfaces as an uncaught error inside a DOM event listener — where no React error boundary can see it — instead of as the message it was written to be',
      { line: (app.split('\n').find((l) => /store\.undo\(\)/.test(l)) ?? '').trim() });
  }
}

// --------------------------------------------------------------------------- §H

if (run('H')) {
  head('§H — A-66 Part 10 item 3\'s residual window, measured rather than asserted');
  const [p, store] = mk('h1');
  const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
  p.photo.slowWrite = true;
  // ONE file, so the section reads the same under `qa/r48-controls.sh`'s C2 mutant, which lets
  // the loop continue past this file where the shipped build breaks out of it.
  p.photo.next = [file('one.jpg')];
  const inflight = store.importPhotos({ kind: 'trip' });
  await p.photo.release(1);                     // the decode finishes; its `write` parks
  await store.openTrip(A);                      // the SAME trip, from the Map or Profile tab
  await p.photo.releaseWrite(1);
  p.photo.slowWrite = false;
  await inflight; await store.flush();
  const s = store.getState();
  ok(keys(p.photo).length === 1 && dkeys(p.photo).length === 1,
    'a transition landing inside `ports.photo.write` itself strands EXACTLY ONE pair — the residual A-66 Part 10 item 3 names, and no more',
    { thumbs: keys(p.photo), displays: dkeys(p.photo) });
  ok(s.doc.photos.length === 0 && core.fromJSON((await p.storage.load(A)).doc).photos.length === 0,
    'and no record is filed for it, in memory or in storage', s.doc.photos.map((x) => x.id));
  ok(s.photos.failures.length === 0 && s.photos.pending === 0 && s.photos.total === 0,
    'nothing is reported (A-66 Part 4/U2) and the fraction settles', { f: s.photos.failures, p: s.photos.pending, t: s.photos.total });
  ok(client.orphanPhotoBytes(s).length === 0,
    '`orphanPhotoBytes` does not pretend to have observed it — A-66 Part 7\'s disclosure holds', client.orphanPhotoBytes(s));
}

// --------------------------------------------------------------------------- §I

if (run('I')) {
  head('§I — A-67 Part 4\'s criterion re-derived against the current code: is a fourth slot owed?');
  const src = readFileSync(resolve(CAIRN, 'packages/client/src/store/store.ts'), 'utf8');
  note('the criterion: a field needs a slot when an ASYNC operation installs a value into it that');
  note('was computed from a snapshot taken BEFORE an await. Applied to every `set`/`setPhotos` in');
  note('the file, the only candidates that are not already `doc`/`browsing`/`photoAvailability` are');
  note('`library` (three writers) and `persistence` (one).');
  {
    // residue 1: `refreshLibrary` installs a pre-await `listTrips()`. Disclosed and out of scope
    // BECAUSE it has one caller. That premise is a fact about `apps/web`, so it is checked here.
    const callers = execFileSync('grep', ['-rn', 'refreshLibrary', resolve(CAIRN, 'apps/web/src')], { encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);
    ok(callers.length === 1 && /App\.tsx/.test(callers[0]),
      'A-67 Part 11 residue 1\'s premise still holds: `refreshLibrary` has exactly ONE caller in `apps/web` (boot), so its trigger has not fired',
      callers);
  }
  {
    // `writeAndSettle`'s `persistence` install IS a pre-await snapshot, and it is the one place a
    // stale `savedVersion` would manufacture §4.2 rule 4's unresolvable conflict. Rule 6a's
    // three-conjunct skip is what stops it: no write can be in flight when a transition claims.
    const [p, store] = mk('i1');
    const A = await trip(store, 'A', '2026-08-07', '2026-08-09');
    const B = await trip(store, 'B', '2026-09-01', '2026-09-02');
    await store.openTrip(A);
    store.dispatch({ type: 'setTripMeta', patch: { title: 'A, mid-edit' } });
    let saves = 0;
    const bsave = p.storage.saveIfVersion.bind(p.storage);
    p.storage.saveIfVersion = async (...a) => { saves++; await tick(); await tick(); return bsave(...a); };
    const open = store.openTrip(B);                       // must flush A first — rule 6a
    await open;
    const s = store.getState();
    ok(s.doc.id === B && s.persistence.savedDoc?.id === B && s.persistence.status === 'idle',
      '`persistence` needs no slot: rule 6a\'s flush means no `writeAndSettle` is ever in flight when a transition claims, so `savedDoc`/`savedVersion` cannot land for the outgoing trip',
      { doc: s.doc.id, savedDoc: s.persistence.savedDoc?.id, status: s.persistence.status, saves });
    const stored = core.fromJSON((await p.storage.load(A)).doc);
    ok(stored.title === 'A, mid-edit', 'and the edit that was in flight is IN STORAGE (rule 6a, unbroken)', stored.title);
  }
  {
    // A-67 Part 8 item 5 rules `reclaimPhotoBytes` out of the `supersede` obligation because its
    // subject is ids that are NOT in `state.doc.photos`, so no `present()` query set holds them.
    // That is checkable: the query set is `doc.photos.map(p => p.id)` and nothing else.
    ok(/const ids = doc\.photos\.map\(\(p\) => p\.id\);/.test(src),
      'A-67 Part 8 item 5\'s premise is literal: `present()`\'s query set is exactly `doc.photos`, so a reclaimed orphan cannot be in it');
  }
  note('No fourth field found that meets the criterion and lacks a slot. The two gaps this round');
  note('files are not missing SLOTS — they are Part 4\'s second-half rule (§E) and Part 5\'s');
  note('unconditional claim (§F) applied to a field that already has one.');
}

// --------------------------------------------------------------------------- §J

if (run('J')) {
  head('§J — G8 and G9, the two "still true" greps, re-derived from the sources');
  const src = readFileSync(resolve(CAIRN, 'packages/client/src/store/store.ts'), 'utf8');
  const nonComment = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const count = (s, re) => (s.match(re) ?? []).length;
  ok(count(nonComment, /claimTransition\(\)/g) === 3,
    'G8: `claimTransition()` has exactly two call sites plus its own declaration — the flush\'s success exit and `deleteTrip`\'s rule-6c branch',
    count(nonComment, /claimTransition\(\)/g));
  ok(count(nonComment, /\{ reseed: true \}/g) === 7,
    'G8: exactly SEVEN reseeding `set`s — six transitions plus `writeAndSettle`\'s merge install',
    count(nonComment, /\{ reseed: true \}/g));
  ok(!/isLiveTrip/.test(nonComment) && !/state\.doc\?\.id !== tripId/.test(nonComment) && !/state\.doc\?\.id !== doc\.id/.test(nonComment),
    'A-67 Part 7: both point-fixes and `isLiveTrip` are DELETED, not layered under the guard');
  ok(/forTripId !== null && doc\.id !== forTripId/.test(nonComment) && /state\.doc !== doc/.test(nonComment) &&
     /state\.photos\.available !== null/.test(nonComment),
    'A-67 Part 7: the four guards it says stay kept are all still there (R3-2\'s timer, R11-1\'s merge link, R45-4\'s value guard)');
  note('G9\'s grep for `Ticket` cannot be literal: `core.Ticket` is a BOOKING\'s ticket and predates');
  note('this ruling by twenty revisions. The guard\'s own names are what the fence is over.');
  for (const f of ['packages/core/src/index.ts', 'packages/client/src/index.ts']) {
    const t = readFileSync(resolve(CAIRN, f), 'utf8');
    ok(!/GenerationGuard|createGenerationGuard|GuardedSlot/.test(t), `G9: no guard type on \`${f}\`'s export surface`);
  }
  const red = readFileSync(resolve(CAIRN, 'packages/client/src/store/reducer.ts'), 'utf8');
  ok(!/GenerationGuard|GuardedSlot|guard\.|supersede\(/.test(red),
    'G9: nothing about the guard in `reducer.ts`, which is where `AppState`/`initialState()` live — A-67 Part 9\'s classification holds');
  ok(!/generation/.test(readFileSync(resolve(CAIRN, 'packages/core/src/serialize/toJSON.ts'), 'utf8').slice(0, 4000)),
    'G9: nothing about the guard in the serializer — no ticket is ever persisted');
}

console.log('');
console.log(fails === 0
  ? 'ALL OK — each line carries its finding id; see docs/QA-FINDINGS.md round 48'
  : `${fails} FAIL(S) — each carries its finding id; see docs/QA-FINDINGS.md round 48`);
// **A-69 Part 9's standing requirement** (added at round 50): a probe's silence is not evidence
// unless the probe says it finished. A run without the line below is INCOMPLETE, never a count.
console.log('-- r48-i13d.mjs COMPLETE (ran through §J) --');
