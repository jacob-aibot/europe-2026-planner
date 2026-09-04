/**
 * **QA round 46 — the I-13b confirmation-breaker pass.** ARCHITECTURE §10 **A-62**, **A-63**,
 * **A-64** (revision 44), over `9635207..70b9ee6` — architect revision 44, the round-45 fix pass
 * and the I-13b build.
 *
 *   node --experimental-strip-types qa/r46-i13b.mjs                     (from cairn/)
 *
 * The browser half is `qa/r46-idb-keys.mjs` (A-62's key range in a real engine, both engines).
 * The round-45 probe `qa/r45-i13.mjs` is re-cut in this round rather than replaced — its §C, §E
 * and §G asserted the fixes round 45 *proposed*, and revision 44 ruled otherwise on three of them.
 *
 * **A `FAIL` line is a finding.** Every one carries its id.
 *
 *   A  the fences over the WHOLE arc, not round 45's surface: `.tsx`, dependencies, the root
 *      planner, `docs/design/`, determinism, no DOM in `packages/{core,client}`, no leak.
 *   B  **A-62 held.** Tenancy in the key, re-derived independently of `qa/i13b-gate.mjs`:
 *      interleaved trips sharing `PhotoId`s, Q3/Q4/Q5, the delete cascade for an active AND a
 *      non-active trip, and `reclaimPhotoBytes` across the trip boundary.
 *   C  **A-62 held.** The import path end to end — R45-2's exact repro, plus restore-after-delete.
 *   D  **R46-1, MAJOR (a REGRESSION).** `importPhotos` files the bytes under the trip that was
 *      open when the picker returned and the record under whatever trip is open when the decode
 *      finishes. Three faces.
 *   E  **R46-2, MAJOR.** The two-tab merge takes in the other tab's photo records and never
 *      re-reads availability, so §10.6 property 3's *"no longer stored on this device"* fires
 *      over bytes that are on disk. R45-4's defect on the one path the fix pass did not cover.
 *   F  **R46-3, MAJOR.** `'loading'` is not transient: two overlapping `openTrip` calls leave it
 *      permanently — the unresolving spinner A-63 was written to forbid.
 *   G  **A-62 Part 8 residue 4** (was R46-4). RE-CUT at round 47: the finding is RULED at revision
 *      45 — the delete is not blocked, the orphan is not reported, and residue 2's unbuilt sweep
 *      is the only recovery. §G asserts that, not round 46's refused proposal.
 *   H  **R46-5, MINOR.** The shipped port cites a `qa/i7a-idb-rowkeys.mjs` *phase 5* that does
 *      not exist as the measurement behind A-62's platform claim.
 *   I  **R46-6, MINOR.** `memoryPhotos`'s flattened key diverges from the shipped array key for a
 *      `tripId` holding U+0000, and `fromJSON` accepts one.
 *   J  **R46-7, MINOR.** `qa/i13b-gate.mjs` carries a literal NUL byte, so the increment's own
 *      ship-gate probe is `Bin 0 -> 17304 bytes` in `git diff`.
 *   K  **A-65 T1** (was R45-14). RE-CUT at round 47: revision 46 ruled it and REFUSED the
 *      deferred byte delete, so §K asserts T1 — record back, bytes gone, `{ready, missing:1}`.
 *
 * **RE-CUT at round 47 (§G and §K), by the breaker, on A-65 Part 8's own instruction.** Both
 * lines asserted a fix an architect has since refused by name. This probe is now green end to
 * end; a `FAIL` here is a regression, not an open finding.
 *   L  **A-63 held** where it is not §F: `refreshPhotoAvailability` really re-reads, R5 holds.
 *   M  **A-64 held**, re-derived from the sources rather than from the gate probe.
 *   N  the previous release's document (`fixtures/legacy/trip-598cd7f.v1.json`) end to end.
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

/** Round 45's own head — the commit this arc starts from. */
const BASE = '9635207';
/** The I-13b build. Overridable so a later pass can re-aim the fence without editing it. */
const HEAD_ = process.env.R46_HEAD ?? '70b9ee6';
const NUL = String.fromCharCode(0);

const tagged = (n, l = 64) => { const o = new Uint8Array(l); for (let i = 0; i < n.length && i < l; i++) o[i] = n.charCodeAt(i) & 0x7f; return o; };
const file = (n, type = 'image/jpeg') => ({ name: n, type, bytes: tagged(n) });
function mk(prefix = '', shared) {
  const p = {
    storage: shared?.storage ?? client.memoryStorage(),
    file: client.memoryFile(),
    photo: shared?.photo ?? client.memoryPhotos(),
    clock: client.fixedClockPort('2026-08-01'),
    ids: client.sequentialIdPort(prefix),
    scheduler: client.immediateScheduler(),
  };
  return [p, client.createStore({ ports: p })];
}
const listing = (store, ref = { kind: 'trip' }) => client.photosFor(store.getState(), ref);
const shape = (l) => ({ phase: l.phase, missing: l.missing, items: l.items.map((i) => `${i.asset.id}:${i.availability}`) });
const keys = (p) => [...p.photo.thumbs.keys()].map((k) => k.replace(NUL, '/'));

// --------------------------------------------------------------------------- §A

head('§A — the fences over the WHOLE arc, `9635207..70b9ee6`');
{
  const names = git('diff', '--name-only', `${BASE}..${HEAD_}`).trim().split('\n');
  note(`${names.length} files across the three commits`);
  ok(names.filter((n) => n.endsWith('.tsx')).length === 0, 'zero `.tsx` files, all three commits', names.filter((n) => n.endsWith('.tsx')));
  ok(names.filter((n) => /package(-lock)?\.json$/.test(n)).length === 0,
    'zero `package.json` / `package-lock.json` movement — no dependency was added',
    names.filter((n) => /package(-lock)?\.json$/.test(n)));
  ok(names.filter((n) => n.startsWith('cairn/docs/design/')).length === 0, '`docs/design/` untouched');
  ok(names.every((n) => n.startsWith('cairn/')), 'nothing outside `cairn/` — the root planner is read-only',
    names.filter((n) => !n.startsWith('cairn/')));

  const added = git('diff', `${BASE}..${HEAD_}`, '--',
    'cairn/packages/core/src', 'cairn/packages/client/src', 'cairn/apps/web/src', 'cairn/cli.ts')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const code = added.filter((l) => !/^\+\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  note(`${added.length} added lines, ${code.split('\n').length} of them outside comments`);
  for (const [label, re] of [
    ['console.*', /console\s*\./], ['fetch(', /\bfetch\s*\(/], ['XMLHttpRequest/sendBeacon', /XMLHttpRequest|sendBeacon/],
    ['localStorage/sessionStorage', /localStorage|sessionStorage/], ['geolocation/watchPosition', /geolocation|watchPosition/],
    ['Date.now / new Date(', /Date\.now|new Date\s*\(/], ['Math.random / randomUUID', /Math\.random|crypto\.randomUUID/],
    ['imap/gmail/oauth/mailbox', /\b(imap|gmail|oauth|mailbox)\b/i], ['a lat:/lng: literal', /\b(lat|lng)\s*:\s*-?\d/],
  ]) {
    const hits = code.split('\n').filter((l) => re.test(l));
    ok(hits.length === 0, `no \`${label}\` in any added production line`, hits.slice(0, 3));
  }
  const pkgAdded = git('diff', `${BASE}..${HEAD_}`, '--', 'cairn/packages/core/src', 'cairn/packages/client/src')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++') && !/^\+\s*(\/\/|\*|\/\*)/.test(l));
  const dom = pkgAdded.filter((l) => /\b(document|window|navigator)\s*\.|HTMLElement|createObjectURL|\bBlob\b/.test(l));
  ok(dom.length === 0, 'no DOM reference in any added `packages/core` or `packages/client` line (`cairn-constraints` §5)', dom.slice(0, 3));
  ok(git('status', '--porcelain', '--', 'europe-2026-itinerary.html', 'docs/', 'tickets/').trim() === '',
    'the root planner, `docs/` and `tickets/` are unmodified in the working tree');
}

// --------------------------------------------------------------------------- §B

head('§B — **A-62 held**: tenancy in the key, re-derived independently of `qa/i13b-gate.mjs`');
{
  // Three trips, the SAME two photo ids each, interleaved in one store.
  const port = client.memoryPhotos();
  const B = (s) => new TextEncoder().encode(s);
  for (const t of ['t', 't2', 'trip-x']) for (const id of ['photo-1', 'photo-2']) await port.write(t, id, B(`${t}/${id}`), B('d'));
  ok(port.thumbs.size === 6, 'three trips × two shared `PhotoId`s = six distinct byte records', port.thumbs.size);
  await port.removeTrip('t');
  const left = [...port.thumbs.keys()].map((k) => k.replace(NUL, '/')).sort();
  ok(left.join() === 't2/photo-1,t2/photo-2,trip-x/photo-1,trip-x/photo-2',
    'Q4/Q5: `removeTrip("t")` took exactly `t`\'s two and left the string-prefix neighbour `t2` whole', left);
  ok(new TextDecoder().decode(await port.read('t2', 'photo-1', 'thumb')) === 't2/photo-1',
    'and `read` still answers for its own trip across a shared `PhotoId`');
  let threw = null;
  try { await port.removeTrip('nobody-at-all'); } catch (e) { threw = String(e); }
  ok(threw === null && port.thumbs.size === 4, 'Q3: `removeTrip` over a trip with no records resolves and deletes nothing', threw);

  // The delete cascade for a NON-active trip — R45-3's subject, now A-62's mechanism.
  const [p, store] = mk();
  await store.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = ['a', 'b', 'c'].map((n) => file(`${n}.jpg`));
  await store.importPhotos({ kind: 'trip' }); await store.flush();
  const A = store.getState().doc.id;
  await store.createTrip({ title: 'B', startDate: '2026-08-10', endDate: '2026-08-11' });
  p.photo.next = [file('d.jpg')];
  await store.importPhotos({ kind: 'trip' }); await store.flush();
  const Bt = store.getState().doc.id;
  ok(p.photo.thumbs.size === 4, 'four byte pairs across two trips', keys(p));
  await store.deleteTrip(A); // A is a library row, not the open document
  ok(keys(p).join() === `${Bt}/photo-4`,
    'deleting a NON-ACTIVE trip removes exactly its byte records and none of the open trip\'s', keys(p));
  await store.deleteTrip(Bt); // and the ACTIVE one
  ok(p.photo.thumbs.size === 0 && p.photo.displays.size === 0,
    'deleting the ACTIVE trip removes the rest', keys(p));

  // `reclaimPhotoBytes` across the trip boundary — R45-2's third face, A-62 Part 4's third claim.
  const [q, s2] = mk();
  await s2.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
  q.photo.next = [file('a.jpg')];
  await s2.importPhotos({ kind: 'trip' }); await s2.flush();
  const A2 = s2.getState().doc.id;
  const pid = s2.getState().doc.photos[0].id;
  await s2.importDoc(await s2.exportActive()); await s2.flush();
  q.photo.failRemoveFor.add(pid);
  await s2.removePhoto(pid);                       // an orphan observed while the RESTORED copy is open
  q.photo.failRemoveFor.delete(pid);
  await s2.openTrip(A2);
  await s2.reclaimPhotoBytes([pid]);
  ok((await q.photo.read(A2, pid, 'thumb')) !== null,
    'an orphan recorded against the restored copy cannot be reclaimed against the original\'s bytes',
    keys(q));
}

// --------------------------------------------------------------------------- §C

head('§C — **A-62 held**: the import path end to end');
{
  // R45-2's exact repro: back up, restore beside the original, delete the restored copy.
  const [p, store] = mk();
  await store.createTrip({ title: 'Europe', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = ['a', 'b', 'c'].map((n) => file(`${n}.jpg`));
  await store.importPhotos({ kind: 'trip' }); await store.flush();
  const A = store.getState().doc.id;
  const backup = await store.exportActive();
  await store.importDoc(backup);
  const B = store.getState().doc.id;
  ok(A !== B, 'INCONCLUSIVE guard: `importDoc` minted a fresh TRIP id on the collision', { A, B });
  ok(shape(listing(store)).phase !== 'loading',
    'the restored copy establishes availability without a re-open — A-63 property 5 on the restore path',
    shape(listing(store)));
  ok(shape(listing(store)).missing === 3,
    'and its three photographs read `missing`, because §7 says an export carries metadata without bytes',
    shape(listing(store)));
  await store.flush();
  await store.deleteTrip(B);
  await store.openTrip(A);
  ok(listing(store).missing === 0 && listing(store).items.length === 3,
    'R45-2: deleting the RESTORED copy left all three of the ORIGINAL trip\'s photographs', shape(listing(store)));

  // …and through `removePhoto` on the restored copy.
  const [q, s2] = mk();
  await s2.createTrip({ title: 'Europe', startDate: '2026-08-07', endDate: '2026-08-09' });
  q.photo.next = [file('a.jpg'), file('b.jpg')];
  await s2.importPhotos({ kind: 'trip' }); await s2.flush();
  const A2 = s2.getState().doc.id;
  const doomed = s2.getState().doc.photos[0].id;
  await s2.importDoc(await s2.exportActive()); await s2.flush();
  await s2.removePhoto(doomed);
  await s2.openTrip(A2);
  ok(listing(s2).missing === 0, 'R45-2: removing one photo from the restored copy left the original\'s copy of it', shape(listing(s2)));

  // The other direction: delete the original, THEN restore the backup.
  const [r, s3] = mk();
  await s3.createTrip({ title: 'Europe', startDate: '2026-08-07', endDate: '2026-08-09' });
  r.photo.next = [file('a.jpg')];
  await s3.importPhotos({ kind: 'trip' }); await s3.flush();
  const A3 = s3.getState().doc.id;
  const back3 = await s3.exportActive();
  await s3.deleteTrip(A3);
  ok(r.photo.thumbs.size === 0, 'the delete swept the bytes', keys(r));
  await s3.importDoc(back3);
  ok(s3.getState().doc.id === A3, 'restoring after a delete keeps the trip\'s own id — nothing collides', s3.getState().doc.id);
  ok(shape(listing(s3)).phase === 'ready' && shape(listing(s3)).missing === 1,
    'and the photograph reads `missing`, honestly and terminally — never `loading`, never a throw',
    shape(listing(s3)));
}

// --------------------------------------------------------------------------- §D

head('§D — **R46-1, MAJOR (a regression)**: an import that spans a trip transition');
{
  const slow = (p, ms) => { const d = p.photo.derive.bind(p.photo); p.photo.derive = async (b, t) => { await new Promise((z) => setTimeout(z, ms)); return d(b, t); }; };

  // Face 1 — the record lands in the trip the user switched TO; the bytes stay with the one they
  // picked from. The decode is where the app is interactive: `pickImages` is a modal, `derive` is
  // not, and two canvas passes over a batch of 12 MP photographs are seconds, not milliseconds.
  const [p, store] = mk();
  await store.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' }); await store.flush();
  const A = store.getState().doc.id;
  await store.createTrip({ title: 'B', startDate: '2026-09-01', endDate: '2026-09-02' }); await store.flush();
  const B = store.getState().doc.id;
  await store.openTrip(A);
  slow(p, 60);
  p.photo.next = [file('holiday.jpg')];
  const inflight = store.importPhotos({ kind: 'trip' });
  await new Promise((z) => setTimeout(z, 10));
  await store.openTrip(B);               // "back to all trips", then the other trip
  await inflight; await store.flush();

  const landedIn = store.getState().doc.photos.length === 1 ? B : A;
  // **RE-CUT at round 48, by the breaker, on A-67 Part 7a's own instruction** (revision 48;
  // ROADMAP **G3**). This line used to require `keys(p).join() === `${A}/photo-1`` — *one* stranded
  // derivative pair, under the trip the files were picked from. That was the OLD guard's collateral
  // damage, not the contract: R46-1's `isLiveTrip(tripId)` fired *after* `ports.photo.write`, so an
  // abandoned decode always paid for a pair of derivatives nothing could ever name. §4.2 **A-67**
  // moved the check to the statement immediately BEFORE the `write`, so the pair is never created —
  // no write, no cleanup, no window (A-66 Part 10 item 2). The empty set is therefore the PROOF that
  // A-67 landed, and the reason is spelled out here so a reader does not mistake it for the probe
  // failing to observe anything: watched RED against a build with `isLiveTrip(tripId)` restored at
  // the step-4 guard — G3's own mutant — where it reports `["trip-1/photo-1"]`.
  // Both derivative stores are asserted, because one `write` call produces both and an assertion
  // over one store only is how a half-write goes unseen (Part 7a's own reason, applied here too).
  ok(landedIn === A && keys(p).length === 0 && [...p.photo.displays.keys()].length === 0,
    'FINDING R46-1 (re-cut at round 48 — A-67 Part 7a / G3): the record does not land in the trip the user switched to, and NO derivative bytes are written at all for a decode that outlives its trip — the generation check precedes the `write` where `isLiveTrip` followed it',
    { recordLandedIn: landedIn, thumbKeys: keys(p), displayKeys: [...p.photo.displays.keys()], activeWhenSettled: store.getState().doc.id });
  ok(shape(listing(store)).items.every((s) => !s.endsWith(':ready')) || landedIn === A,
    'FINDING R46-1: no listing reports `ready` for a photo whose bytes are under another trip\'s key',
    { listing: shape(listing(store)), byteKeys: keys(p), read: await p.photo.read(B, 'photo-1', 'thumb') });
  await store.openTrip(B);
  ok(listing(store).missing === 0,
    'FINDING R46-1: and after a re-open it does not report §10.6 property 3\'s *"no longer stored on this device"* over bytes that are on this device',
    { listing: shape(listing(store)), byteKeys: keys(p) });
  ok(client.orphanPhotoBytes(store.getState()).length > 0 || landedIn === A,
    'FINDING R46-1: …or, failing that, reports the stranded derivative as a reclaimable orphan',
    { orphans: client.orphanPhotoBytes(store.getState()) });
  note('at `9635207` this same sequence produced a VIEWABLE photo in the wrong trip: the byte key');
  note('was a bare `PhotoId`, so the record found its bytes. A-62 put tenancy in the key and');
  note('turned a misfiling into a lost photograph. That is the regression half of this finding.');

  // Face 2 — a day attachment from trip A written into trip B: `validateTrip` calls it dangling.
  const [q, s2] = mk();
  await s2.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' }); await s2.flush();
  const dayA = s2.getState().doc.days[0].id;
  await s2.createTrip({ title: 'B', startDate: '2026-09-01', endDate: '2026-09-02' }); await s2.flush();
  const B2 = s2.getState().doc.id;
  await s2.openTrip(s2.getState().library.find((r) => r.id !== B2).id);
  slow(q, 60);
  q.photo.next = [file('day.jpg')];
  const f2 = s2.importPhotos({ kind: 'day', dayId: dayA });
  await new Promise((z) => setTimeout(z, 10));
  await s2.openTrip(B2);
  await f2; await s2.flush();
  const codes = core.validateTrip(s2.getState().doc).map((i) => i.code);
  ok(!codes.includes('photo_attach_dangling'),
    'FINDING R46-1: the store does not write a document its own validator calls invalid',
    { codes, photos: s2.getState().doc.photos.map((x) => x.attach) });

  // Face 3 — the trip is DELETED mid-decode: the byte write lands after the cascade.
  const [r, s3] = mk();
  await s3.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' }); await s3.flush();
  const A3 = s3.getState().doc.id;
  slow(r, 60);
  r.photo.next = [file('del.jpg')];
  const f3 = s3.importPhotos({ kind: 'trip' });
  await new Promise((z) => setTimeout(z, 10));
  await s3.deleteTrip(A3);
  await f3;
  ok(r.photo.thumbs.size === 0,
    'FINDING R46-1: deleting a trip mid-import leaves no blob without a live tenancy reference (§6.3)',
    { byteKeys: keys(r), library: s3.getState().library.map((x) => x.id), failures: s3.getState().photos.failures });
  ok(s3.getState().photos.failures.every((f) => f.reason !== 'storage_failed'),
    'FINDING R46-1: and a trip transition is not reported to the user as a storage failure',
    s3.getState().photos.failures);
}

// --------------------------------------------------------------------------- §E

head('§E — **R46-2, MAJOR**: the two-tab merge takes in photos and never re-reads availability');
{
  const storage = client.memoryStorage();
  const photo = client.memoryPhotos();
  const [, A] = mk('a', { storage, photo });
  const [, Btab] = mk('b', { storage, photo });
  await A.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  await A.flush();
  const id = A.getState().doc.id;
  await Btab.openTrip(id);
  photo.next = [file('b1.jpg')];
  await Btab.importPhotos({ kind: 'trip' });     // the other tab adds a photograph and saves it
  await Btab.flush();
  A.dispatch({ type: 'setDayMeta', dayId: A.getState().doc.days[0].id, patch: { title: 'MINE' } });
  await A.flush();
  ok(A.getState().persistence.status === 'conflict', 'INCONCLUSIVE guard: this tab is in conflict', A.getState().persistence.status);
  await A.mergeWithStored();
  const l = shape(listing(A));
  ok(l.missing === 0,
    'FINDING R46-2: after a merge, no photo taken in from the other tab is reported `missing` over bytes on disk',
    { listing: l, byteKeys: [...photo.thumbs.keys()].map((k) => k.replace(NUL, '/')), session: { tripId: A.getState().photos.tripId, available: [...(A.getState().photos.available ?? [])] } });
  note('§10.6 property 3 renders `missing` as *"this photo\'s image is no longer stored on this');
  note('device"* with an offer to re-import. `importDoc` gained `readPhotoAvailability` for exactly');
  note('this reason at `70b9ee6`; `doMerge` is the same shape and did not.');
}

// --------------------------------------------------------------------------- §F

head('§F — **R46-3, MAJOR**: `\'loading\'` is not transient, which is the one guarantee A-63 added');
{
  const [p, store] = mk();
  await store.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' }); await store.flush();
  const A = store.getState().doc.id;
  await store.createTrip({ title: 'B', startDate: '2026-09-01', endDate: '2026-09-02' });
  p.photo.next = [file('b.jpg')];
  await store.importPhotos({ kind: 'trip' }); await store.flush();
  const B = store.getState().doc.id;
  await store.closeTrip();

  // An ordinary latency difference between two reads. Nothing is injected but the delay.
  const real = p.photo.present.bind(p.photo);
  const delay = { [A]: 40, [B]: 0 };
  p.photo.present = async (t, ids) => { const r = await real(t, ids); await new Promise((z) => setTimeout(z, delay[t] ?? 0)); return r; };

  await Promise.allSettled([store.openTrip(A), store.openTrip(B)]);   // tap trip A, then trip B
  await new Promise((z) => setTimeout(z, 250));
  const l = shape(listing(store));
  ok(l.phase !== 'loading',
    'FINDING R46-3: exactly one of `empty`/`ready`/`unreadable` follows every `loading` — §10.6 property 5',
    { phase: l.phase, activeDoc: store.getState().doc?.id, stampedTripId: store.getState().photos.tripId });
  await store.refreshPhotoAvailability();
  note(`the ruled-in retry does recover it: phase after \`refreshPhotoAvailability()\` = ${listing(store).phase}`);
  note('but §10.6 property 6 attaches **Try again** to `unreadable`, not to `loading`, so a surface');
  note('built to the stated contract renders a spinner and offers nothing. `readPhotoAvailability`');
  note('claims property 5 is *"true by construction rather than by inspection"*; it is not.');
}

// --------------------------------------------------------------------------- §G

head('§G — **A-62 Part 8 residue 4** (R46-4, RULED at revision 45): the trip goes either way, and nothing reports');
{
  // **RE-CUT at QA round 47, by the breaker, on A-65 Part 8's own instruction** — it names this
  // line as *"the same shape"* as §K, one section over. The old assertion was *"either leaves
  // nothing behind or REPORTS what it left"*, which is round 46's proposed fix; **A-62 Part 8
  // residue 4 refuses both halves of it** — 4c refuses the abort/rollback, 4d refuses the report
  // ("not for economy"), and 4e rules that residue 2's unbuilt key-range sweep is the only
  // recovery. What is checkable is therefore the RULED behaviour, and it is asserted here.
  const [p, store] = mk();
  await store.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = [file('a.jpg'), file('b.jpg')];
  await store.importPhotos({ kind: 'trip' }); await store.flush();
  const A = store.getState().doc.id;
  p.photo.removeTrip = async () => { throw new Error('IndexedDB: UnknownError'); };
  let threw = null;
  try { await store.deleteTrip(A); } catch (e) { threw = String(e); }
  const orphans = client.orphanPhotoBytes(store.getState());
  const st = store.getState();
  ok(threw === null && st.library.every((r) => r.id !== A) && st.doc === null
     && (await p.storage.load(A)) === null && orphans.length === 0,
    'residue 4c/4d: a rejected `removeTrip` does NOT block the delete, and no orphan is reported (the report would need a document that is gone)',
    { threw, byteKeys: keys(p), orphansReported: orphans, library: st.library.map((r) => r.id),
      docAfter: st.doc, storedDoc: await p.storage.load(A) });
  note('The bytes DO stay — residue 4e: `reclaimPhotoBytes` needs an active document and an');
  note('observed id and a deleted trip has neither, so **residue 2\'s unbuilt sweep is the only');
  note('recovery**. That is ruled, disclosed and non-blocking; what is still owed in CODE is the');
  note('comment (see `qa/r47-i13c.mjs` §H) and nothing else.');
}

// --------------------------------------------------------------------------- §H

head('§H — **R46-5, MINOR**: the port cites a probe phase that does not exist');
{
  const probe = readFileSync(resolve(CAIRN, 'qa/i7a-idb-rowkeys.mjs'), 'utf8');
  const port = readFileSync(resolve(CAIRN, 'apps/web/src/ports/storage.ts'), 'utf8');
  const phases = [...probe.matchAll(/^head\(`?phase (\d)/gm)].map((m) => Number(m[1]));
  note(`\`qa/i7a-idb-rowkeys.mjs\` runs phases: ${phases.join(', ')}`);
  const cited = [...port.matchAll(/i7a-idb-rowkeys\.mjs`? phase (\d)/g)].map((m) => Number(m[1]));
  ok(cited.every((n) => phases.includes(n)),
    'FINDING R46-5: every `qa/i7a-idb-rowkeys.mjs` phase the shipped port cites as its evidence exists',
    { citedByThePort: cited, phasesThatExist: phases });
  ok(!/Phase 5 asserts/.test(probe),
    'FINDING R46-5: and the probe\'s own header does not describe a phase it does not run',
    (/^.*Phase 5 asserts.*$/m.exec(probe) ?? [])[0]);
  note('A-62 Part 5 is explicit that the ordering claim is a SEARCH RESULT and that Part 7\'s');
  note('executable check is *"the one that settles it"*. `qa/r46-idb-keys.mjs` §A now measures it');
  note('directly with `indexedDB.cmp`, on Chromium and on WebKit, and every one of the five');
  note('ordering facts A-62 Part 5 asserts is confirmed.');
}

// --------------------------------------------------------------------------- §I

head('§I — **R46-6, MINOR**: the double\'s flattened key vs. the shipped array key');
{
  const p = client.memoryPhotos();
  const B = (s) => new TextEncoder().encode(s);
  await p.write('t', 'photo-1', B('real'), B('real'));
  await p.write(`t${NUL}photo-1`, 'x', B('forged'), B('forged'));
  await p.removeTrip('t');
  ok(p.thumbs.size === 1,
    'FINDING R46-6: `removeTrip` in the double takes only its own trip, as `IDBKeyRange.bound` does in the engine',
    { left: [...p.thumbs.keys()].map((k) => k.replaceAll(NUL, '/')) });
  note('in a real engine `["t\\u0000photo-1", "x"]` is NOT in `bound([\'t\'], [\'t\', []])`, and');
  note('`qa/r46-idb-keys.mjs` §B measures exactly that on both engines. The double sweeps it.');

  const ctx = { ids: core.sequentialIds(), now: '2026-08-07', actorUserId: 'u1' };
  const t = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09', ownerId: 'u1' }, ctx);
  const j = JSON.parse(core.toJSON(t));
  j.id = `t${NUL}photo-1`;
  let parsed = null, err = null;
  try { parsed = core.fromJSON(JSON.stringify(j)); } catch (e) { err = String(e); }
  ok(err !== null || core.validateTrip(parsed).length > 0,
    'FINDING R46-6: a trip id carrying the double\'s own separator is refused, or at least reported',
    { fromJSON: err ?? `accepted ${JSON.stringify(parsed.id)}`, validateTrip: parsed ? core.validateTrip(parsed).map((i) => i.code) : null });
  note('`photoByteKey`\'s docstring rests the separator\'s safety on *"nothing in this system mints');
  note('one"* — true of `IdFactory`, false of `fromJSON`, which takes the id from the file and is');
  note('what `importDoc` calls on a backup the user can hand-edit.');
}

// --------------------------------------------------------------------------- §J

head('§J — **R46-7, MINOR**: the increment\'s own ship-gate probe is a binary file to git');
{
  const bytes = readFileSync(resolve(CAIRN, 'qa/i13b-gate.mjs'));
  const nulAt = bytes.indexOf(0);
  ok(nulAt === -1,
    'FINDING R46-7: `qa/i13b-gate.mjs` holds no literal NUL byte, so `git diff` can show it',
    { nulByteAtOffset: nulAt, gitDiffStat: git('diff', '--stat', `${BASE}..${HEAD_}`, '--', 'cairn/qa/i13b-gate.mjs').trim() });
  note('`String.fromCharCode(0)` or `\\u0000` inside a template is the same value with a diff a');
  note('reviewer can read. This is the file ROADMAP I-13b names as the record of its own gate.');
}

// --------------------------------------------------------------------------- §K

head('§K — **A-65 T1** (R45-14, RULED at revision 46): undo restores the record, never the photograph');
{
  // **RE-CUT at QA round 47, by the breaker, per A-65 Part 8.** This line asserted
  // `bytesBack === true` — round 45's own PROPOSED fix (a deferred byte delete), which **A-65
  // Part 3 clause 1 refuses by name** and A-65 Part 4 argues out in four reasons. A probe that
  // keeps asserting a since-ruled-away proposal is round 44's **R44-3** repeating, and A-65
  // Part 8 says in as many words that re-cutting it is *"the confirming breaker's job, not the
  // builder's"*. What it asserts now is **A-65 Part 6's T1**, verbatim from the criterion:
  // the record is back, `read(tripId, id, 'thumb')` is `null`, and a FRESH availability read
  // says `{phase:'ready', missing:1}` with that item `'missing'` — never `'empty'`, never
  // `'unreadable'`, never a throw, never a `'ready'` item over bytes that are gone.
  const [p, store] = mk();
  await store.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' }); await store.flush();
  const trip = store.getState().doc.id;
  const pid = store.getState().doc.photos[0].id;
  const before = keys(p);
  await store.removePhoto(pid);
  const during = keys(p);
  store.undo();
  const recordBack = store.getState().doc.photos.length === 1;
  const bytesBack = (await p.photo.read(trip, pid, 'thumb')) !== null;
  let threw = null;
  try { await store.refreshPhotoAvailability(); } catch (e) { threw = String(e); }  // a FRESH read, not a stale set
  const l = shape(listing(store));
  ok(recordBack && !bytesBack && threw === null
     && l.phase === 'ready' && l.missing === 1 && l.items.join() === `${pid}:missing`,
    'A-65 **T1**: `removePhoto` + `undo` + a fresh `refreshPhotoAvailability()` — record back, bytes gone, `{ready, missing:1}`',
    { keysBefore: before, keysAfterRemove: during, recordBack, bytesBack, threw, listingAfterAFreshRead: l });
  note('R45-14 was routed design → architect at round 45 and is RULED at revision 46 as **A-65**:');
  note('§10.3\'s synchronous cascade is upheld and the deferred delete is REFUSED (A-65 Part 4).');
  note('`\'missing\'` with §10.6 property 3\'s offer to re-import is the honest state, not a defect.');
}

// --------------------------------------------------------------------------- §L

head('§L — **A-63 held** everywhere §F does not reach');
{
  // The retry re-reads the STORE, not a cached answer.
  const [p, store] = mk();
  await store.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = [file('a.jpg'), file('b.jpg')];
  await store.importPhotos({ kind: 'trip' }); await store.flush();
  const evicted = [...p.photo.thumbs.keys()][0];
  Map.prototype.delete.call(p.photo.thumbs, evicted);
  Map.prototype.delete.call(p.photo.displays, evicted);
  const beforeCount = p.photo.presentCount;
  await store.refreshPhotoAvailability();
  ok(p.photo.presentCount === beforeCount + 1 && listing(store).missing === 1,
    '`refreshPhotoAvailability()` issues a real `present()` and reports what the store now holds — never a cached answer',
    { presentCalls: p.photo.presentCount - beforeCount, listing: shape(listing(store)) });

  // R1/R3 — a rejecting `present()`, then a retry against a port that is still failing.
  const [q, s2] = mk();
  await s2.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  q.photo.next = [file('a.jpg'), file('b.jpg')];
  await s2.importPhotos({ kind: 'trip' }); await s2.flush();
  const id2 = s2.getState().doc.id;
  q.photo.present = async () => { throw new Error('IndexedDB: UnknownError'); };
  await s2.openTrip(id2);
  const u = shape(listing(s2));
  ok(u.phase === 'unreadable' && u.missing === 0 && u.items.every((s) => s.endsWith(':unknown')) && listing(s2).message !== null,
    'R1: a rejected `present()` is `unreadable`, 2 items, both `unknown`, `missing: 0`, `message` non-null', { ...u, message: listing(s2).message });
  await s2.refreshPhotoAvailability();
  ok(listing(s2).phase === 'unreadable' && listing(s2).items.length === 2,
    'R3: a retry against a still-failing port stays `unreadable` and does not throw', shape(listing(s2)));
  // R4 — an import after a failed read reports nothing `missing`.
  q.photo.next = [file('c.jpg')];
  await s2.importPhotos({ kind: 'trip' });
  ok(shape(listing(s2)).items.every((s) => !s.endsWith(':missing')),
    'R4: one import after a failed read reports NO item `missing` over bytes that are on disk', shape(listing(s2)));

  // R5 — the two paths that skip the port.
  const [, s3] = mk();
  await s3.createTrip({ title: 'no photos', startDate: '2026-08-07', endDate: '2026-08-08' });
  ok(listing(s3).phase === 'empty', 'R5: a trip with no photos is `empty`, never `loading`', shape(listing(s3)));
  const s4 = client.createStore({ ports: { storage: client.memoryStorage(), file: client.memoryFile(), clock: client.fixedClockPort('2026-08-01'), ids: client.sequentialIdPort(), scheduler: client.immediateScheduler() } });
  await s4.createTrip({ title: 'no port', startDate: '2026-08-07', endDate: '2026-08-08' });
  ok(listing(s4).phase === 'empty', 'R5: a host with no photo port is `empty` too', shape(listing(s4)));

  // R6 — the port's error text reaches no log, no golden, no CLI.
  const cli = readFileSync(resolve(CAIRN, 'cli.ts'), 'utf8');
  ok(!/availabilityError|photosFor/.test(cli), 'R6: the listing `message` is not reachable from `cli.ts`');
  const storeSrc = readFileSync(resolve(CAIRN, 'packages/client/src/store/store.ts'), 'utf8');
  ok(!/console\s*\.\s*\w+\([^)]*availabilityError/.test(storeSrc), 'R6: and nothing logs it');
}

// --------------------------------------------------------------------------- §M

head('§M — **A-64 held**, re-derived from the sources rather than from the gate probe');
{
  const types = readFileSync(resolve(CAIRN, 'packages/core/src/model/types.ts'), 'utf8');
  const refKind = /export type RefKind = ([^\n;]+);/.exec(types)?.[1] ?? '?';
  ok(!/'photo'/.test(refKind),
    'S5: `RefKind` has NO `photo` arm — A-64 Part 3 defers it and Part 5 makes the deferral checkable', { refKind });

  const ctx = { ids: core.sequentialIds(), now: '2026-08-07', actorUserId: 'u1' };
  let trip = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09', ownerId: 'u1' }, ctx);
  // The candidate block is derived from a REAL one rather than hand-typed, so this section
  // cannot go green against a `Provenance` shape that has moved (round 45's copy had a
  // `confidence` value `fromJSON` refuses, which its §G never round-tripped and so never saw).
  trip = core.addPhoto(trip, { thumb: { w: 320, h: 240, bytes: 1 }, display: { w: 1600, h: 1200, bytes: 2 } }, ctx);
  const suggested = { ...trip.photos[0].provenance, source: 'system', state: 'candidate' };
  trip = { ...trip, photos: [{ ...trip.photos[0], provenance: suggested }] };
  const photo = trip.photos[0];
  ok(core.displayStatus(photo.provenance) === 'suggested', 'A-64 Part 2: a `{system, candidate}` photo still badges `suggested`');

  const grab = (f) => { try { f(); return null; } catch (e) { return e.message; } };
  const acc = grab(() => core.acceptCandidate(trip, { kind: 'photo', id: photo.id }, 'u1', '2026-08-08'));
  const rej = grab(() => core.rejectCandidate(trip, { kind: 'photo', id: photo.id }, 'u1', '2026-08-08'));
  const upd = grab(() => core.updatePhoto(trip, photo.id, { provenance: suggested }));
  ok(acc !== null && acc.startsWith('acceptCandidate:') && /A-64/.test(acc) && !/unsupported ref kind/.test(acc),
    'S2: `acceptCandidate` on a photo names A-64 and its trigger, not *"unsupported ref kind"*', acc);
  ok(rej !== null && rej.startsWith('rejectCandidate:') && /A-64/.test(rej),
    'S1/S2: and `rejectCandidate` names ITSELF, never `acceptCandidate`', rej);
  ok(upd !== null && !/acceptCandidate|rejectCandidate/.test(upd),
    'S3: `updatePhoto` still refuses `provenance`, and stops pointing at two functions that throw', upd);
  const other = grab(() => core.rejectCandidate(trip, { kind: 'nonsense', id: 'x' }, 'u1', '2026-08-08'));
  ok(other !== null && other.startsWith('rejectCandidate:'), 'S1: an unsupported kind from `rejectCandidate` names `rejectCandidate`', other);
  // S4 — the round trip.
  const round = core.fromJSON(core.toJSON(trip));
  ok(core.toJSON(round) === core.toJSON(trip) && core.displayStatus(round.photos[0].provenance) === 'suggested',
    'S4: a candidate photo round-trips byte-identically and reads `suggested` on both sides');
}

// --------------------------------------------------------------------------- §N

head('§N — the previous release\'s document, end to end');
{
  const v1 = readFileSync(resolve(CAIRN, 'fixtures/legacy/trip-598cd7f.v1.json'), 'utf8');
  const parsed = JSON.parse(v1);
  ok(parsed.schemaVersion === 1 && !('photos' in parsed),
    'the fixture really is a version-1 document with no `photos` key at all',
    { schemaVersion: parsed.schemaVersion, hasPhotos: 'photos' in parsed });
  const [p, seed] = mk('seed-');
  await seed.createTrip({ title: 'other', startDate: '2026-08-07', endDate: '2026-08-08' });
  await seed.flush();
  // Seeded into the port's maps directly, exactly as a previous release left them: the document
  // as it was written, a fence token, and a library row. No re-serialisation anywhere.
  p.storage.docs.set(parsed.id, v1);
  p.storage.versions.set(parsed.id, 'seeded-fence');
  p.storage.summaries.set(parsed.id, { ...p.storage.summaries.values().next().value, id: parsed.id, title: parsed.title });
  const store = client.createStore({ ports: p });
  await store.refreshLibrary();
  let err = null;
  try { await store.openTrip(parsed.id); } catch (e) { err = String(e); }
  ok(err === null, 'R45-1: `openTrip` reads it — `migrateDoc` runs inside `fromJSON`', err);
  ok(store.getState().doc.photos.length === 0 && listing(store).phase === 'empty',
    'and its listing is terminal at `empty` — never `loading`, never a throw', shape(listing(store)));
  await store.rescanSummaries();
  ok(store.getState().rescan.unreadable.length === 0, 'the summary rescan does not call it unreadable', store.getState().rescan.unreadable);
  let ierr = null;
  try { await store.importDoc(v1); } catch (e) { ierr = String(e); }
  ok(ierr === null && store.getState().doc.id !== parsed.id,
    'and restoring it as a backup mints a fresh trip id rather than overwriting the stored copy',
    { err: ierr, restoredAs: store.getState().doc?.id, original: parsed.id });
  // A document from the FUTURE still refuses, with the message written for that case.
  const future = JSON.stringify({ ...parsed, schemaVersion: 99 });
  const fut = (() => { try { core.fromJSON(future); return null; } catch (e) { return e.message; } })();
  ok(fut !== null && /Update the app/.test(fut), 'a document from a newer build still refuses, and says what to do', fut);
  const noVer = (() => { try { core.fromJSON(JSON.stringify({ ...parsed, schemaVersion: undefined })); return null; } catch (e) { return e.message; } })();
  ok(noVer !== null && /schemaVersion/.test(noVer), 'a document with no `schemaVersion` at all still refuses', noVer);
}

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`} — each carries its finding id; see docs/QA-FINDINGS.md round 46`);
process.exit(0);
