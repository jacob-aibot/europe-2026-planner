/**
 * **QA round 45 — the I-13 breaker pass.** ARCHITECTURE §10 (**A-57**, **A-58**, **A-61**),
 * ROADMAP **I-13**, `master` @ `497c116` (`1820813` → `7e8c0f3` → `497c116`).
 *
 *   node --experimental-strip-types qa/r45-i13.mjs           (from cairn/)
 *   node --experimental-strip-types qa/r45-i13.mjs --fast    (skips §K's suite measurement)
 *
 * **A `FAIL` line is a finding, not a broken probe.** Every `FAIL` below carries its finding id
 * in the label, and `docs/QA-FINDINGS.md` round 45 names each one. `note` lines are measurements
 * that are facts rather than unmet expectations.
 *
 * ---
 *
 * **RE-CUT at QA round 46, and the re-cut is the breaker's own work rather than a builder's.**
 * Six of this probe's lines asserted the fix this round *proposed*; ARCHITECTURE revision 44 ruled
 * differently on three findings, and a probe that keeps asserting pre-ruling behaviour is round
 * 44's **R44-3** repeating (`qa/r43-a56.mjs`, the same class). Maintaining a prior round's
 * adversarial probes is this project's breaker convention, so round 46 re-cut them here:
 *
 *   §C line 1  wanted `importDoc` to re-mint photo ids. **A-62 Part 3 clause 3 refuses it by
 *              name** — the ids stay stable and the byte KEY gains the tenancy instead. It now
 *              asserts the ruling, plus the parenthetical A-62 attaches to it (the restored
 *              copy's photos read `missing`). §C's other two lines — the actual data loss — are
 *              unchanged and were red at `9635207`.
 *   §E guard   wanted `phase === 'loading'` for a rejected `present()`. **A-63 replaced that
 *              value with `'unreadable'`.** The guard's job is unchanged; its value moved.
 *   §G ×3      wanted `acceptCandidate`/`rejectCandidate` to work on a photo and `RefKind` to
 *              carry a `'photo'` arm. **A-64 Part 3 defers both and Part 5's S5 forbids the
 *              arm.** They now assert A-64 Part 4's three corrected strings and S5's grep.
 *   §K R45-17  pinned the literal `1316`. It measures the suite now.
 *
 * The I-13b builder raised exactly this in `BUILD-NOTES.md` and was right on every count; round 46
 * verified the reading against A-62 Part 3, A-64 Part 3 and A-64 Part 5 before touching anything.
 * **§K's R45-14 line is deliberately still red** — revision 44 did not rule it, so it is open.
 *
 * Twelve sections, all in **plain Node** against `memoryPhotos()`/`memoryStorage()` — which is
 * the property `cairn-constraints` §5 exists for, and it is why the two BLOCKERs below need no
 * browser to reproduce. The browser half of I-13 is `qa/i13-photo-browser.mjs`, re-cut in this
 * round to take `--engine=webkit` (R45-7).
 *
 *   A  the fences: no `.tsx`, no dependency, no root-planner edit, determinism, no DOM in
 *      `packages/client` — over the ADDED production lines of `git diff 598cd7f 497c116`.
 *   B  **R45-1, BLOCKER.** `SCHEMA_VERSION` 1 → 2 with `migrateDoc` wired to nothing: a genuine
 *      pre-I-13 document, minted by a build at `598cd7f`, is refused by `openTrip`, by
 *      `browseTrip`, by `importDoc` and by the summary rescan.
 *   C  **R45-2, BLOCKER.** Deleting a restored backup destroyed the original trip's
 *      photographs, because the byte stores were keyed by bare `PhotoId`. Re-cut at round 46
 *      against A-62: the ids stay, the KEY carries the tenancy.
 *   D  **R45-3, MAJOR.** Deleting a NON-active trip cascades no photo bytes, and
 *      `orphanPhotoBytes` reports none, so the bytes are unreachable AND unreportable.
 *   E  **R45-4, MAJOR.** One import after a failed availability read marks every OTHER photo of
 *      the trip `'missing'` — a false *"no longer stored on this device"* over bytes that are
 *      there.
 *   F  **R45-5, MAJOR.** `photosFor` could not express *"availability could not be read"*: a
 *      rejecting `present()` was `phase:'loading'` with no retry method on the store. A-63.
 *   G  **R45-6, MAJOR.** A photo's `Provenance` has no transition and A-57 Part 4 said it did.
 *      Re-cut at round 46 against A-64: the claim is WITHDRAWN, not implemented, so what is
 *      checkable is the three corrected messages and S5's `RefKind` grep.
 *   H  `readExif`: totality and boundedness re-derived at 200,000 inputs (**holds**), then the
 *      three parsing findings — **R45-8** (a bad sub-IFD pointer discards a readable date),
 *      **R45-9** (the scan runs past EOI), **R45-10** (`24:00` reaches `capturedAt`).
 *   I  the import saga's remaining edges — **R45-11** (concurrent imports drop a failure
 *      report), **R45-12** (an empty MIME type is refused undecoded) — and the P8/P9/P5 arms
 *      that hold.
 *   J  what I could NOT break: P12 redaction with a planted photo, `copyStopInto`, the
 *      round trip, A-61's two criteria re-derived, `cli photos`' no-decimal rule.
 *   K  **R45-13** to **R45-17**: the five small ones, each measured.
 *   L  the shape of Jacob's actual trip — overnight legs, a day in two cities, a stop with no
 *      coordinates, a zero-length trip, a duplicate import — carrying photos.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const ROOT = resolve(CAIRN, '..');

const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
const client = await import(resolve(CAIRN, 'packages/client/src/index.ts'));
const { readExif } = await import(resolve(CAIRN, 'packages/core/src/photo/exif.ts'));
const { redactForSample } = await import(resolve(CAIRN, 'tools/redact.mjs'));

let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const BASE = '598cd7f';
const HEAD_ = '497c116';

// --------------------------------------------------------------------------- helpers

const tagged = (name, n = 64) => {
  const out = new Uint8Array(n);
  for (let i = 0; i < name.length && i < n; i++) out[i] = name.charCodeAt(i) & 0x7f;
  return out;
};
const file = (name, type = 'image/jpeg', n = 64) => ({ name, type, bytes: tagged(name, n) });

function ports() {
  return {
    storage: client.memoryStorage(),
    file: client.memoryFile(),
    photo: client.memoryPhotos(),
    clock: client.fixedClockPort('2026-08-01'),
    ids: client.sequentialIdPort(),
    scheduler: client.immediateScheduler(),
  };
}

// --------------------------------------------------------------------------- §A the fences

head('§A — the fences, over `git diff 598cd7f 497c116`');
{
  const names = git('diff', '--name-only', `${BASE}..${HEAD_}`).trim().split('\n');
  ok(names.filter((n) => n.endsWith('.tsx')).length === 0,
    'zero `.tsx` files across all four commits (ROADMAP I-13\'s own fence criterion)',
    names.filter((n) => n.endsWith('.tsx')));
  const manifests = names.filter((n) => /package(-lock)?\.json$/.test(n));
  ok(manifests.length === 0, 'zero `package.json` / `package-lock.json` movement — A-58 as a mechanical check', manifests);
  ok(names.filter((n) => n.startsWith('cairn/docs/design/')).length === 0, '`docs/design/` untouched', null);
  ok(names.every((n) => n.startsWith('cairn/')), 'nothing outside `cairn/` — the root planner is read-only', names.filter((n) => !n.startsWith('cairn/')));

  // The ADDED production lines only. A grep over the whole file would hit the prose.
  const added = git('diff', `${BASE}..${HEAD_}`, '--',
    'cairn/packages/core/src', 'cairn/packages/client/src', 'cairn/apps/web/src', 'cairn/cli.ts')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
  // Comments carry the words; code does not. Strip `//` and ` * ` lines before grepping.
  const code = added.split('\n').filter((l) => !/^\+\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const forbidden = [
    ['console.', /\bconsole\.(log|warn|error|info|debug)\b/],
    ['fetch/XHR/sendBeacon', /\b(fetch\(|XMLHttpRequest|sendBeacon)\b/],
    ['localStorage/sessionStorage', /\b(localStorage|sessionStorage)\b/],
    ['geolocation', /\b(geolocation|watchPosition)\b/],
    ['ambient clock', /\b(Date\.now\(|new Date\()/],
    ['ambient randomness', /\b(Math\.random|crypto\.randomUUID)\b/],
    ['mailbox', /\b(imap|gmail|oauth|mailbox)\b/i],
  ];
  for (const [what, re] of forbidden) {
    const hits = code.split('\n').filter((l) => re.test(l));
    ok(hits.length === 0, `no ${what} in any added production line`, hits.slice(0, 3));
  }
  // `packages/client` may not touch the DOM (`cairn-constraints` §5). `apps/web` may.
  const clientAdded = git('diff', `${BASE}..${HEAD_}`, '--', 'cairn/packages/core/src', 'cairn/packages/client/src')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++') && !/^\+\s*(\/\/|\*|\/\*)/.test(l));
  const dom = clientAdded.filter((l) => /\b(document\.|window\.|navigator\.|HTMLElement|createElement|Blob\()/.test(l));
  ok(dom.length === 0, 'no DOM reference in any added `packages/core` or `packages/client` line', dom.slice(0, 3));

  const surface = Object.keys(core).length;
  note(`core's runtime export surface: ${surface} symbols (was 79 at ${BASE} — +4: addPhoto, removePhoto, updatePhoto, readExif)`);
  ok(surface === 83, 'the export surface grew by exactly the four symbols A-57 Part 6 lists', { surface });
  ok(core.SCHEMA_VERSION === 2, '`SCHEMA_VERSION` is 2');
}

// --------------------------------------------------------------------------- §B R45-1

head('§B — **R45-1, BLOCKER**: `SCHEMA_VERSION` 1 → 2, and `migrateDoc` is wired to nothing');
{
  // Every production `fromJSON` call site, counted from the source rather than asserted.
  const storeSrc = readFileSync(resolve(CAIRN, 'packages/client/src/store/store.ts'), 'utf8');
  const readPaths = storeSrc.split('\n')
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => /core\.fromJSON\(/.test(l));
  note(`production \`core.fromJSON\` call sites in store.ts: ${readPaths.map(([n]) => n).join(', ')}`);
  const migrateCallers = [];
  for (const dir of ['packages/core/src', 'packages/client/src', 'apps/web/src']) {
    const walk = (d) => {
      for (const e of readdirSync(resolve(CAIRN, d), { withFileTypes: true })) {
        if (e.isDirectory()) walk(`${d}/${e.name}`);
        else if (/\.tsx?$/.test(e.name)) {
          const src = readFileSync(resolve(CAIRN, d, e.name), 'utf8');
          // A call, not the definition and not a comment.
          for (const line of src.split('\n')) {
            if (/migrateDoc\s*\(/.test(line) && !/^\s*(\*|\/\/)/.test(line) && !/export function migrateDoc/.test(line)) {
              migrateCallers.push(`${d}/${e.name}: ${line.trim().slice(0, 70)}`);
            }
          }
        }
      }
    };
    walk(dir);
  }
  ok(migrateCallers.length > 0,
    'FINDING R45-1: `migrateDoc` has at least one production call site',
    { callers: migrateCallers });

  // A GENUINE v1 document, minted by a build at 598cd7f — not a hand-aged one.
  const v1 = {
    schemaVersion: 1, id: 'trip-legacy', title: 'Europe 2026', ownerId: 'local:self',
    startDate: '2026-08-07', endDate: '2026-08-09', datePrecision: 'exact', homeCurrency: 'EUR',
    homeBase: null, party: { adults: 1, children: 0 }, cities: [], days: [], pool: [], places: [],
    bookings: [], resolutions: [], revision: 1,
    // A pre-I-13 build wrote no `photos` key at all — that is what `schemaVersion: 1` means.
  };
  // Round it through a real document rather than a literal: mint one with THIS build, then age
  // it exactly as a v1 build would have written it (drop `photos`, stamp the version).
  const mintCtx = { ids: core.sequentialIds(), now: '2026-08-01', actorUserId: 'local:self' };
  const real = core.createTrip({ title: 'Europe 2026', startDate: '2026-08-07', endDate: '2026-08-22', ownerId: 'local:self' }, mintCtx);
  const aged = JSON.parse(core.toJSON(real));
  delete aged.photos;
  aged.schemaVersion = 1;
  const agedText = JSON.stringify(aged, null, 2);
  ok(!('photos' in aged) && aged.schemaVersion === 1, 'the fixture really is the shape a pre-I-13 build wrote', { keys: 'photos' in aged });

  let parsed = null, parseErr = null;
  try { parsed = core.fromJSON(agedText); } catch (e) { parseErr = e; }
  ok(parsed !== null,
    'FINDING R45-1: `core.fromJSON` reads a document written by the previous release',
    { message: parseErr?.message });

  let migrated = null, migErr = null;
  try { migrated = core.fromJSON(core.migrateDoc(JSON.parse(agedText))); } catch (e) { migErr = e; }
  ok(migrated !== null && migrated.photos.length === 0,
    'the migration ITSELF is correct — `fromJSON(migrateDoc(v1))` works, so only the wiring is missing',
    { message: migErr?.message });

  // Through the client store: `openTrip`, the summary rescan, and `importDoc`.
  const p = ports();
  p.storage.docs.set(aged.id, agedText);
  p.storage.summaries.set(aged.id, core.tripSummary(real, core.COUNTRY_INDEX));
  const store = client.createStore({ ports: p });
  await store.refreshLibrary();
  ok(store.getState().library.some((r) => r.id === aged.id),
    'the trip is still LISTED in the library — the row is a summary and summaries did not move');
  let opened = null, openErr = null;
  try { opened = await store.openTrip(aged.id); } catch (e) { openErr = e; }
  ok(opened?.doc != null,
    'FINDING R45-1: `openTrip` opens the previous release\'s trip',
    { message: openErr?.message, openFailures: store.getState().openFailures });

  const p2 = ports();
  const store2 = client.createStore({ ports: p2, actorUserId: 'local:self' });
  let importErr = null;
  try { await store2.importDoc(agedText); } catch (e) { importErr = e; }
  ok(importErr === null,
    'FINDING R45-1: `importDoc` restores the user\'s own backup file from before this release',
    { message: importErr?.message });

  note('the rendered face: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r3-upcast.mjs`');
  note('(with `npm run web:build && node tools/serve.mjs`) — an EXISTING probe that plants a');
  note('schemaVersion-1 document in a real IndexedDB. It now shows "One trip\'s file could not be');
  note('read" in the real app and times out waiting for "Add a stop". It was not re-run by I-13.');
}

// --------------------------------------------------------------------------- §C R45-2

head('§C — **R45-2, BLOCKER**: restoring a backup destroys the original trip\'s photographs');
{
  const p = ports();
  const store = client.createStore({ ports: p });
  await store.createTrip({ title: 'Europe', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = ['a', 'b', 'c'].map((n) => file(`${n}.jpg`));
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const A = store.getState().doc;
  const backup = await store.exportActive();
  await store.importDoc(backup);          // restore my own backup beside the original
  const B = store.getState().doc;
  ok(A.id !== B.id, 'INCONCLUSIVE guard: `importDoc` did mint a fresh TRIP id on the collision', { a: A.id, b: B.id });
  // **RE-CUT at round 46.** This line asserted *"the restored copy has photo ids of its own"* —
  // which was round 45's PROPOSED fix and is the one **A-62 Part 3 clause 3 refuses by name**:
  // *"`importDoc` re-mints nothing new, and its diff for this finding is zero lines. A restored
  // copy's photo records keep their own ids because they are the document's own facts and
  // rewriting them buys nothing once tenancy is in the key."* Round 44 hit this exact class with
  // `qa/r43-a56.mjs` (R44-3): a probe asserting pre-ruling behaviour is a probe that will be
  // waived. So the line now asserts the ruling — the ids are STABLE, and what makes the finding
  // closed is the byte KEY, which the two lines below measure.
  const shared = A.photos.map((x) => x.id).filter((id) => B.photos.some((y) => y.id === id));
  ok(shared.length === A.photos.length,
    'A-62 Part 3 clause 3: the restored copy keeps its own photo ids — tenancy moved into the byte key, not into `importDoc`',
    { sharedPhotoIds: shared, originalIds: A.photos.map((x) => x.id) });
  const restored = client.photosFor(store.getState(), { kind: 'trip' });
  ok(restored.phase === 'ready' && restored.missing === A.photos.length,
    'A-62 Part 3 clause 3, its parenthetical: the restored copy\'s photos read `missing` — §7 has always said an export carries metadata without bytes',
    { phase: restored.phase, missing: restored.missing, of: restored.items.length });

  await store.flush();
  await store.deleteTrip(B.id);           // "that restored copy was a mistake"
  await store.openTrip(A.id);
  const listing = client.photosFor(store.getState(), { kind: 'trip' });
  ok(listing.missing === 0,
    'FINDING R45-2: deleting the RESTORED copy left the ORIGINAL trip\'s photographs intact',
    { missing: listing.missing, of: listing.items.length, items: listing.items.map((i) => `${i.asset.id}:${i.availability}`) });

  // The same edge through `removePhoto`, which is the one-photo version of the same defect.
  const q = ports();
  const s2 = client.createStore({ ports: q });
  await s2.createTrip({ title: 'Europe', startDate: '2026-08-07', endDate: '2026-08-09' });
  q.photo.next = [file('a.jpg'), file('b.jpg')];
  await s2.importPhotos({ kind: 'trip' });
  await s2.flush();
  const A2 = s2.getState().doc;
  await s2.importDoc(await s2.exportActive());
  await s2.flush();
  await s2.removePhoto(A2.photos[0].id);  // deleted from the RESTORED copy
  await s2.openTrip(A2.id);
  const l2 = client.photosFor(s2.getState(), { kind: 'trip' });
  ok(l2.missing === 0,
    'FINDING R45-2: removing one photo from the restored copy left the original\'s copy of it',
    { missing: l2.missing, items: l2.items.map((i) => `${i.asset.id}:${i.availability}`) });

  note('§6.2 rule 1 already stated the shape that prevents this: *"an object key is');
  note('`trip/{tripId}/photo/{photoId}`, so a blob\'s owner is recoverable from its key alone."*');
  note('A-62 applied it on-device: the byte key is `[tripId, photoId]` as of `DB_VERSION` 5.');
}

// --------------------------------------------------------------------------- §D R45-3

head('§D — **R45-3, MAJOR**: the store\'s delete cascade only fires for the ACTIVE trip');
{
  const p = ports();
  const store = client.createStore({ ports: p });
  await store.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = ['a', 'b', 'c'].map((n) => file(`${n}.jpg`));
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const tripA = store.getState().doc.id;
  ok(p.photo.thumbs.size === 3, 'INCONCLUSIVE guard: three byte pairs landed', { thumbs: p.photo.thumbs.size });
  await store.createTrip({ title: 'B', startDate: '2026-08-10', endDate: '2026-08-11' });
  await store.deleteTrip(tripA);          // A is now a library row, not the open document
  ok(p.photo.thumbs.size === 0 && p.photo.displays.size === 0,
    'FINDING R45-3: deleting a NON-active trip removes its photo bytes (§10.3\'s third table row)',
    { thumbs: [...p.photo.thumbs.keys()], displays: p.photo.displays.size });
  ok(client.orphanPhotoBytes(store.getState()).length === 3 || p.photo.thumbs.size === 0,
    'FINDING R45-3: …or, failing that, reports them as reclaimable orphans rather than losing them',
    { orphans: client.orphanPhotoBytes(store.getState()) });
  note('`apps/web` is covered one layer down — `indexedDbStorage.delete` re-reads the document');
  note('and sweeps. What is broken is `store.ts`\'s own belt, whose comment claims *"the in-memory');
  note('port and any future port get the cascade whether or not their storage can span it."*');
}

// --------------------------------------------------------------------------- §E R45-4

head('§E — **R45-4, MAJOR**: one import after a failed availability read calls the rest of the trip `missing`');
{
  const p = ports();
  const store = client.createStore({ ports: p });
  await store.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = ['a', 'b', 'c'].map((n) => file(`${n}.jpg`));
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const id = store.getState().doc.id;
  const good = p.photo.present.bind(p.photo);
  p.photo.present = async () => { throw new Error('IndexedDB: UnknownError'); };
  await store.openTrip(id);
  // **RE-CUT at round 46.** This guard asserted `phase === 'loading'`, which is the value **A-63
  // replaced**: a read that was attempted and failed is `'unreadable'`, and `'loading'` now means
  // *"no answer yet"* and nothing else. The guard's JOB — "the port really did refuse, so the
  // finding line below is measuring something" — is unchanged; only the value it looks for moved.
  const guard = client.photosFor(store.getState(), { kind: 'trip' });
  ok(guard.phase === 'unreadable' && guard.message !== null,
    'INCONCLUSIVE guard: a rejected `present()` leaves availability UNREAD and says so (A-63)',
    { phase: guard.phase, message: guard.message });
  p.photo.next = [file('d.jpg')];
  await store.importPhotos({ kind: 'trip' });
  const l = client.photosFor(store.getState(), { kind: 'trip' });
  const reallyThere = [...p.photo.thumbs.keys()];
  ok(l.missing === 0,
    'FINDING R45-4: after one import, no photo whose bytes are on disk is reported `missing`',
    { missing: l.missing, of: l.items.length, storedIds: reallyThere, items: l.items.map((i) => `${i.asset.id}:${i.availability}`) });
  note('§10.6 property 3: a `missing` item renders as *"this photo\'s image is no longer stored on');
  note('this device"* and offers re-import. Three photographs that are on disk get that sentence.');
  p.photo.present = good;
}

// --------------------------------------------------------------------------- §F R45-5

head('§F — **R45-5, MAJOR**: `photosFor` cannot say *"availability could not be read"*');
{
  const p = ports();
  const store = client.createStore({ ports: p });
  await store.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' });
  await store.flush();
  const id = store.getState().doc.id;
  p.photo.present = async () => { throw new Error('IndexedDB: UnknownError'); };
  const st = await store.openTrip(id);
  const l = client.photosFor(st, { kind: 'trip' });
  const retries = ['retryPhotoAvailability', 'refreshPhotoAvailability', 'readPhotoAvailability']
    .filter((k) => typeof store[k] === 'function');
  ok(l.phase !== 'loading' || retries.length > 0,
    'FINDING R45-5: an unreadable availability is distinguishable from "not yet", or is retryable',
    { phase: l.phase, retryMethods: retries, storeMethods: Object.keys(store).filter((k) => /photo/i.test(k)) });
  note(`§10.6's own opening sentence names the failure this produces: "a spinner that never resolves".`);
  note(`the only recovery is closing the trip and re-opening it, which a UI has no signal to offer.`);
}

// --------------------------------------------------------------------------- §G R45-6

head('§G — **R45-6, MAJOR**: A-57 Part 4\'s transition claim, withdrawn by A-64 rather than implemented');
{
  const ctx = { ids: core.sequentialIds(), now: '2026-08-07', actorUserId: 'u1' };
  let trip = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09', ownerId: 'u1' }, ctx);
  const suggested = {
    source: 'system', state: 'candidate', confidence: 'likely', createdAt: '2026-08-07',
    createdBy: null, origin: null, acceptedAt: null, acceptedBy: null,
  };
  trip = core.addPhoto(trip, {
    thumb: { w: 320, h: 240, bytes: 1 }, display: { w: 1600, h: 1200, bytes: 2 }, provenance: suggested,
  }, ctx);
  const photo = trip.photos[0];
  ok(core.displayStatus(photo.provenance) === 'suggested',
    'INCONCLUSIVE guard: a `{system, candidate}` photo does read as `suggested` — A-57 Part 4 reason 1');

  // **RE-CUT at round 46.** These three lines asserted that `acceptCandidate`/`rejectCandidate`
  // work on a photo and that `RefKind` carries a `'photo'` arm — round 45's PROPOSED fix, and the
  // one **A-64 Part 3 refuses**: *"`RefKind` does not gain a `'photo'` arm in Phase 2"*, with
  // Part 5's **S5** requiring `grep "'photo'"` against `RefKind` to find nothing, so a builder who
  // adds the arm has taken an architect's decision. What A-64 Part 4 rules IS a change — three
  // strings — and that is what these lines measure now. The finding is closed by a correction to
  // A-57 Part 4's second reason, not by a mechanism, and the probe says which.
  let acceptErr = null;
  try { core.acceptCandidate(trip, { kind: 'photo', id: photo.id }, 'u1', '2026-08-08'); }
  catch (e) { acceptErr = e; }
  ok(acceptErr !== null && acceptErr.message.startsWith('acceptCandidate:')
    && /A-64/.test(acceptErr.message) && !/unsupported ref kind/.test(acceptErr.message),
    'A-64 Part 4 item 2 (**S2**): a photo ref refuses by naming this ruling and its trigger, not *"unsupported ref kind"*',
    { message: acceptErr?.message });

  let rejectErr = null;
  try { core.rejectCandidate(trip, { kind: 'photo', id: photo.id }, 'u1', '2026-08-08'); }
  catch (e) { rejectErr = e; }
  ok(rejectErr !== null && rejectErr.message.startsWith('rejectCandidate:') && /A-64/.test(rejectErr.message),
    'A-64 Part 4 item 1 (**S1**): and `rejectCandidate` names ITSELF, never `acceptCandidate`',
    { message: rejectErr?.message });

  let patchErr = null;
  try { core.updatePhoto(trip, photo.id, { provenance: suggested }); } catch (e) { patchErr = e; }
  ok(patchErr !== null && !/acceptCandidate|rejectCandidate/.test(patchErr.message),
    'A-64 Part 4 item 3 (**S3**): `updatePhoto` still refuses `provenance`, and no longer points at two functions that throw',
    { message: patchErr?.message });
  const typesSrc = readFileSync(resolve(CAIRN, 'packages/core/src/model/types.ts'), 'utf8');
  const refKind = /export type RefKind = ([^\n;]+);/.exec(typesSrc)?.[1] ?? '?';
  ok(!/'photo'/.test(refKind),
    'A-64 Part 5 (**S5**): `RefKind` has NO `photo` arm — the deferral is checkable, and adding it is an architect\'s decision',
    { refKind });
}

// --------------------------------------------------------------------------- §H readExif

head('§H — `readExif`: totality and boundedness hold; three parsing findings');
{
  // --- the JPEG/TIFF builder, so the adversarial shapes are constructed rather than described.
  const cat = (...ps) => { const t = ps.reduce((n, x) => n + x.length, 0); const o = new Uint8Array(t); let a = 0; for (const x of ps) { o.set(x, a); a += x.length; } return o; };
  const u16 = (v, be = true) => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v, !be); return b; };
  const u32 = (v, be = true) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v, !be); return b; };
  const ascii = (s) => { const b = new Uint8Array(s.length + 1); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff; return b; };
  const entry = (tag, type, count, bytes) => ({ tag, type, count, bytes });
  const eLong = (t, v, be = true) => entry(t, 4, 1, u32(v, be));
  const eAscii = (t, s) => { const b = ascii(s); return entry(t, 2, b.length, b); };
  const eRat = (t, pairs, be = true) => entry(t, 5, pairs.length, cat(...pairs.flatMap(([n, d]) => [u32(n, be), u32(d, be)])));
  function makeIfd(entries, ifdOffset, be = true, nextIfd = 0) {
    const n = entries.length, dirSize = 2 + n * 12 + 4;
    const dir = new Uint8Array(dirSize), dv = new DataView(dir.buffer);
    dv.setUint16(0, n, !be);
    let cursor = ifdOffset + dirSize; const values = [];
    entries.forEach((e, i) => {
      const off = 2 + i * 12;
      dv.setUint16(off, e.tag, !be); dv.setUint16(off + 2, e.type, !be); dv.setUint32(off + 4, e.count, !be);
      if (e.bytes.length <= 4) dir.set(e.bytes, off + 8);
      else { dv.setUint32(off + 8, cursor, !be); values.push(e.bytes); cursor += e.bytes.length; if (e.bytes.length % 2) { values.push(new Uint8Array(1)); cursor += 1; } }
    });
    dv.setUint32(2 + n * 12, nextIfd, !be);
    return { bytes: cat(dir, ...values), end: cursor };
  }
  const SOI = new Uint8Array([0xff, 0xd8]), SOS = new Uint8Array([0xff, 0xda, 0x00, 0x02]);
  const EXIF_ID = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0, 0]);
  const TH = cat(new Uint8Array([0x4d, 0x4d]), u16(42), u32(8));
  const app1Of = (tiff) => { const pl = cat(EXIF_ID, tiff); return cat(new Uint8Array([0xff, 0xe1]), u16(pl.length + 2), pl); };
  const jpeg = (tiff) => cat(SOI, app1Of(tiff), SOS);
  /** IFD0 with an Exif sub-IFD and (optionally) a GPS one, at real offsets. */
  function tiffWith({ exif = [], gps = null, exifPtr = null, gpsPtr = null }) {
    const dir0 = [];
    if (exif) dir0.push(eLong(0x8769, 0));
    if (gps) dir0.push(eLong(0x8825, 0));
    const probe = makeIfd(dir0, 8);
    const exifAt = probe.end;
    const exifBlk = makeIfd(exif, exifAt);
    const gpsAt = exifBlk.end;
    const gpsBlk = gps ? makeIfd(gps, gpsAt) : null;
    const real = [];
    if (exif) real.push(eLong(0x8769, exifPtr ?? exifAt));
    if (gps) real.push(eLong(0x8825, gpsPtr ?? gpsAt));
    return cat(TH, makeIfd(real, 8).bytes, exifBlk.bytes, ...(gpsBlk ? [gpsBlk.bytes] : []));
  }

  // --- H1: totality and boundedness, re-derived at 200,000 inputs (the builder ran 12,000).
  const corpus = readdirSync(resolve(CAIRN, 'fixtures/photo'))
    .map((f) => new Uint8Array(readFileSync(resolve(CAIRN, 'fixtures/photo', f))));
  let seed = 20260904; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  let threw = 0, worstMs = 0, badReason = 0, badCoord = 0;
  const N = 200000;
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    let b;
    const mode = i % 4;
    if (mode === 0) { const n = 1 + Math.floor(rnd() * 400); b = new Uint8Array(n); for (let j = 0; j < n; j++) b[j] = Math.floor(rnd() * 256); }
    else if (mode === 1) { const n = 2 + Math.floor(rnd() * 400); b = new Uint8Array(n); b[0] = 0xff; b[1] = 0xd8; for (let j = 2; j < n; j++) b[j] = rnd() < 0.4 ? 0xff : Math.floor(rnd() * 256); }
    else if (mode === 2) { const s = corpus[Math.floor(rnd() * corpus.length)]; b = s.slice(0, 1 + Math.floor(rnd() * s.length)); }
    else { const s = corpus[Math.floor(rnd() * corpus.length)]; b = s.slice(); const k = 1 + Math.floor(rnd() * 6); for (let j = 0; j < k; j++) b[Math.floor(rnd() * b.length)] = Math.floor(rnd() * 256); }
    const t = process.hrtime.bigint();
    let r;
    try { r = readExif(b); } catch { threw++; continue; }
    const ms = Number(process.hrtime.bigint() - t) / 1e6;
    if (ms > worstMs) worstMs = ms;
    if (!['ok', 'unsupported_container', 'no_exif', 'malformed', 'truncated'].includes(r.reason)) badReason++;
    if (r.at && (Math.abs(r.at.lat) > 90 || Math.abs(r.at.lng) > 180)) badCoord++;
  }
  note(`fuzz: ${N} inputs in ${Date.now() - t0} ms, worst single call ${worstMs.toFixed(2)} ms`);
  ok(threw === 0, `A-58 Part 7: **total** — no input threw, over ${N} (16× the builder's sweep)`, { threw });
  ok(badReason === 0 && badCoord === 0, 'every answer is a stated reason and every coordinate is in range', { badReason, badCoord });
  // Boundedness, structurally: the largest directory an APP1 can hold, and 2,000 segments.
  {
    const entries = []; for (let i = 0; i < 5000; i++) entries.push(eLong(0xf000 + (i % 1000), i));
    const t1 = Date.now(); const r = readExif(jpeg(cat(TH, makeIfd(entries, 8).bytes)));
    ok(Date.now() - t1 < 200 && r.reason === 'ok', 'a 5,000-entry IFD (60 KB directory) terminates fast', { ms: Date.now() - t1, reason: r.reason });
    const segs = []; for (let i = 0; i < 2000; i++) segs.push(cat(new Uint8Array([0xff, 0xe1]), u16(32), new Uint8Array(30)));
    const t2 = Date.now(); const r2 = readExif(cat(SOI, ...segs, SOS));
    ok(Date.now() - t2 < 200 && r2.reason === 'no_exif', '2,000 APP1 segments terminate fast', { ms: Date.now() - t2, reason: r2.reason });
  }

  // --- H2 / R45-8: `malformed` poisons every field, including one that read cleanly.
  {
    const good = readExif(jpeg(tiffWith({ exif: [eAscii(0x9003, '2024:05:11 08:14:02')] })));
    ok(good.capturedAt?.date === '2024-05-11', 'INCONCLUSIVE guard: the same file WITHOUT a GPS block reads its date', good);
    const zeroed = readExif(jpeg(tiffWith({
      exif: [eAscii(0x9003, '2024:05:11 08:14:02')],
      gps: [eAscii(0x0001, 'N'), eRat(0x0002, [[48, 1], [12, 1], [0, 1]]), eAscii(0x0003, 'E'), eRat(0x0004, [[16, 1], [22, 1], [0, 1]])],
      gpsPtr: 0,                                    // the shape an EXIF stripper leaves behind
    })));
    ok(zeroed.capturedAt?.date === '2024-05-11',
      'FINDING R45-8: a zeroed GPS sub-IFD pointer drops the ONE entry, not the file — `exif.ts:130` says so in as many words',
      { reason: zeroed.reason, capturedAt: zeroed.capturedAt });
    const outOfRange = readExif(jpeg(tiffWith({
      exif: [eAscii(0x9003, '2024:05:11 08:14:02')],
      gps: [eAscii(0x0001, 'N')], gpsPtr: 0x7fffffff,
    })));
    ok(outOfRange.capturedAt?.date === '2024-05-11',
      'FINDING R45-8: an OUT-OF-RANGE GPS sub-IFD pointer likewise keeps the readable date',
      { reason: outOfRange.reason, capturedAt: outOfRange.capturedAt });
    note('P4 states the principle for a zero denominator — *"one bad field is not a bad file"* —');
    note('and `exif.ts:312`\'s `if (malformed) return empty(...)` applies the opposite rule to a');
    note('pointer. A camera or a stripping tool that writes a bad GPS IFD loses the date too.');
  }

  // --- H3 / R45-9: the scan runs past EOI, so an appended trailer supplies the metadata.
  {
    const trailerExif = tiffWith({ exif: [eAscii(0x9003, '2031:01:02 03:04:05')] });
    const withTrailer = cat(SOI, new Uint8Array([0xff, 0xd9]), app1Of(trailerExif), new Uint8Array([0xff, 0xd9]));
    const r = readExif(withTrailer);
    ok(r.capturedAt === null,
      'FINDING R45-9: EXIF appended AFTER the EOI marker is not read as the photograph\'s own metadata',
      { reason: r.reason, capturedAt: r.capturedAt });
    note('`exif.ts:207`\'s comment says *"SOS: image data begins and no EXIF was found. EOI');
    note('likewise."* — but `0xd9` falls into the standalone-marker branch at `:203` and the scan');
    note('continues. §10.1 point 3: `at`/`capturedAt` are *"what the FILE said"* and *"never inferred"*.');
  }

  // --- H4 / R45-10: an impossible clock time reaches `capturedAt.time`.
  {
    for (const [raw, want] of [['2024:05:11 24:00:00', null], ['2024:05:11 23:60:00', null], ['2024:05:11 99:99:99', null]]) {
      const r = readExif(jpeg(tiffWith({ exif: [eAscii(0x9003, raw)] })));
      ok(r.capturedAt === want,
        `FINDING R45-10: \`${raw}\` is refused, as \`0000:00:00 00:00:00\` is (P5)`,
        { got: r.capturedAt });
    }
    note('§10.2 rule 3 validates the time through *"the existing time pattern"*, and `isClockTime`');
    note('is `/^\\d{1,2}:\\d{2}$/` — shape only. `isIsoDate` validates the CALENDAR (A-45), so the');
    note('date half of `capturedAt` is checked and the time half is not, on attacker-supplied bytes.');
    // P5 itself still holds, which is what makes the asymmetry the finding rather than a regression.
    const p5 = readExif(jpeg(tiffWith({ exif: [eAscii(0x9003, '0000:00:00 00:00:00')] })));
    ok(p5.capturedAt === null, 'P5 holds: the never-set-clock date is still refused', p5);
  }
}

// --------------------------------------------------------------------------- §I the saga

head('§I — the import saga\'s remaining edges');
{
  // I1 / R45-11: two overlapping imports lose the first batch's failure report.
  const p = ports();
  const store = client.createStore({ ports: p });
  await store.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.failDeriveFor.add('bad1.jpg');
  p.photo.next = [file('a.jpg'), file('bad1.jpg')];
  const first = store.importPhotos({ kind: 'trip' });
  p.photo.next = [file('x.jpg'), file('y.jpg')];
  const second = store.importPhotos({ kind: 'trip' });
  await Promise.all([first, second]);
  const report = client.photoImport(store.getState());
  ok(report.failures.some((f) => f.name === 'bad1.jpg'),
    'FINDING R45-11: a failure from an overlapping batch is still reported — §10.6: *"never silently dropped"*',
    { report, filesProcessed: 4 });
  ok(report.total === 4,
    'FINDING R45-11: `total` counts the files actually processed, so `pending`/`total` is honest',
    { total: report.total });

  // I2 / R45-12: an empty MIME type is refused without asking the decoder.
  const q = ports();
  const s2 = client.createStore({ ports: q });
  await s2.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  q.photo.next = [{ name: 'photo.jpg', type: '', bytes: tagged('photo.jpg') }];
  await s2.importPhotos({ kind: 'trip' });
  const r2 = client.photoImport(s2.getState());
  const photoSrc = readFileSync(resolve(CAIRN, 'apps/web/src/ports/photo.ts'), 'utf8');
  ok(q.photo.deriveCount > 0,
    'FINDING R45-12: a file the picker gave no MIME type for is at least offered to the decoder',
    { deriveCount: q.photo.deriveCount, report: r2, portHandlesIt: /type \|\| 'image\/jpeg'/.test(photoSrc) });
  note('`apps/web/src/ports/photo.ts:88` writes `new Blob([bytes], { type: type || \'image/jpeg\' })`,');
  note('so the port is explicitly built for an empty type that `store.ts:1393` guarantees never arrives.');

  // I3 — the arms that HOLD, so the section is not one-sided.
  const r = ports();
  const s3 = client.createStore({ ports: r });
  await s3.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  r.photo.failDeriveFor.add('c.jpg');
  r.photo.next = ['a', 'b', 'c', 'd', 'e'].map((n) => file(`${n}.jpg`));
  await s3.importPhotos({ kind: 'trip' });
  const p8 = client.photoImport(s3.getState());
  ok(s3.getState().doc.photos.length === 4 && p8.failures.length === 1 && p8.failures[0].name === 'c.jpg',
    'P8 holds: 4 assets, 1 failure reported BY NAME, the import completed', { photos: s3.getState().doc.photos.length, p8 });

  const t = ports();
  const s4 = client.createStore({ ports: t });
  await s4.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  t.photo.failWriteFor.add('a.jpg'); t.photo.failWriteAs = 'QuotaExceededError';
  t.photo.next = [file('a.jpg'), file('b.jpg')];
  await s4.importPhotos({ kind: 'trip' });
  const p9 = client.photoImport(s4.getState());
  ok(s4.getState().doc.photos.length === 1 && t.photo.thumbs.size === 1
    && p9.failures[0]?.reason === 'quota_exceeded',
    'P9 holds: no asset, no orphaned byte record, no partial document write, and the name survives', { p9, thumbs: t.photo.thumbs.size });

  const u = ports();
  const s5 = client.createStore({ ports: u });
  await s5.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  u.photo.next = [
    { name: 'huge.jpg', type: 'image/jpeg', bytes: new Uint8Array(client.PHOTO_MAX_INPUT_BYTES + 1) },
    { name: 'clip.mov', type: 'video/quicktime', bytes: tagged('clip.mov') },
  ];
  await s5.importPhotos({ kind: 'trip' });
  ok(u.photo.deriveCount === 0,
    'the byte ceiling and the type check are enforced BEFORE the decode — a ceiling after `createImageBitmap` is not one',
    { deriveCount: u.photo.deriveCount, report: client.photoImport(s5.getState()) });

  // P10 — bytes evicted between opens read as `missing`, not `empty`, and nothing throws.
  const v = ports();
  const s6 = client.createStore({ ports: v });
  await s6.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  v.photo.next = [file('a.jpg'), file('b.jpg')];
  await s6.importPhotos({ kind: 'trip' });
  await s6.flush();
  const docId = s6.getState().doc.id;
  const gone = s6.getState().doc.photos[0].id;
  v.photo.thumbs.delete(gone); v.photo.displays.delete(gone);
  await s6.openTrip(docId);
  const l = client.photosFor(s6.getState(), { kind: 'trip' });
  ok(l.phase === 'ready' && l.missing === 1, 'P10 holds: eviction is `missing` on a `ready` listing, never `empty`', l);
}

// --------------------------------------------------------------------------- §J what holds

head('§J — what I attacked and could not break');
{
  const ctx = { ids: core.sequentialIds(), now: '2026-08-07', actorUserId: 'u1' };
  const CITY = [{ key: 'vienna', name: 'Vienna', centre: { lat: 48.2082, lng: 16.3738 } }];
  let src = core.createTrip({ title: 'A', startDate: '2026-08-07', endDate: '2026-08-09', ownerId: 'u1', cities: CITY }, ctx);
  src = core.addPhoto(src, {
    caption: 'door PIN 4471 at the flat', at: { lat: 48.20817, lng: 16.37381 },
    capturedAt: { date: '2026-08-08', time: '21:14' }, metaSource: 'exif', source: { w: 4032, h: 3024 },
    thumb: { w: 320, h: 240, bytes: 12000 }, display: { w: 1600, h: 1200, bytes: 180000 },
  }, ctx);

  // P12 — with a PLANTED photo, because a rule that only runs over empty data is untested.
  const redacted = JSON.stringify(redactForSample(src));
  ok(!/4471|door PIN/.test(redacted) && !/48\.2081|16\.3738[01]/.test(redacted) && !/21:14/.test(redacted)
    && /"photos":\[\]/.test(redacted.replace(/\s/g, '')),
    'P12: `redactForSample` drops a captioned, placed, dated photo whole — no caption, no coordinate, no time');

  // §2.14 rule 3 applied to a heavier object — and `copyStop.ts` has a zero-line diff.
  src = core.addStop(src, { kind: 'day', dayId: '2026-08-08' }, { name: 'S', category: 'sight', cityKey: 'vienna' }, ctx);
  const sid = src.days.find((d) => d.id === '2026-08-08').stops[0].id;
  let tgt = core.createTrip({ title: 'B', startDate: '2026-08-07', endDate: '2026-08-09', ownerId: 'u1', cities: CITY }, ctx);
  tgt = core.copyStopInto(tgt, { trip: src, stopId: sid }, { kind: 'scheduled', dayId: '2026-08-08' }, ctx);
  ok(tgt.photos.length === 0 && !/4471|48\.2081/.test(core.toJSON(tgt)),
    '§10.5: `copyStopInto` carries no photo, no caption and no coordinate across a person boundary');

  const once = core.toJSON(src);
  ok(once === core.toJSON(core.fromJSON(once)), 'a trip with photos survives `toJSON`→`fromJSON` byte-identically');

  // A-61's two replacement criteria, re-derived rather than read.
  const gctx = { ids: core.sequentialIds(), now: '2026-08-07', actorUserId: 'u1' };
  const base = core.createTrip({ title: 'G', startDate: '2026-08-07', endDate: '2026-08-09', ownerId: 'u1' }, gctx);
  let grown = base;
  for (let i = 0; i < 20; i++) {
    grown = core.addPhoto(grown, {
      caption: `photo ${i}`, at: { lat: 48.2, lng: 16.3 }, capturedAt: { date: '2026-08-08', time: '10:00' },
      metaSource: 'exif', source: { w: 4032, h: 3024 },
      thumb: { w: 320, h: 240, bytes: 12000 }, display: { w: 1600, h: 1200, bytes: 180000 },
    }, gctx);
  }
  const delta = core.toJSON(grown).length - core.toJSON(base).length;
  let longest = 0;
  const walk = (v) => { if (typeof v === 'string') longest = Math.max(longest, v.length); else if (v && typeof v === 'object') for (const k of Object.keys(v)) { longest = Math.max(longest, k.length); walk(v[k]); } };
  walk(JSON.parse(core.toJSON(grown)));
  note(`A-61: 20 photos add ${delta} B at indent 2 = ${(delta / 20).toFixed(1)} B/photo (stated 768, ceiling 1024)`);
  ok(delta < 20480, 'A-61 criterion 2: the growth ceiling holds, measured and recorded', { delta });
  ok(longest < 128, 'A-61 criterion 1: the longest string in the document is under 128 chars', { longest });

  // §10.5's three checks on `PhotoAsset.at`, on the one surface that exists.
  const cli = execFileSync('node', ['cli.ts', 'photos', 'fixtures/photo/jpeg-exif-gps.jpg'], { cwd: CAIRN, encoding: 'utf8' });
  ok(!/\d+\.\d+/.test(cli), '`cli photos` prints no decimal at all over a file that HAS a coordinate', { cli: cli.split('\n').filter((l) => /location/.test(l)) });
  const golden = readFileSync(resolve(CAIRN, 'fixtures/golden/photo-exif.json'), 'utf8');
  ok(!/"lat"|"lng"/.test(golden), 'the `readExif` golden records `hasCoordinate` and no number');

  // The `place` deferral is enforced, not merely typed.
  let placeErr = null;
  try { core.addPhoto(src, { attach: { kind: 'place', placeId: 'p1' }, thumb: { w: 1, h: 1, bytes: 1 }, display: { w: 1, h: 1, bytes: 1 } }, ctx); }
  catch (e) { placeErr = e; }
  ok(placeErr !== null && /not built/.test(placeErr.message), 'A-57 Part 3\'s deferral throws rather than being advertised by the type alone');

  // §10.3's second table row, through core, at the one function that can orphan a `dayId`.
  const dctx = { ids: core.sequentialIds(), now: '2026-08-07', actorUserId: 'u1' };
  let dtrip = core.createTrip({ title: 'D', startDate: '2026-08-07', endDate: '2026-08-09', ownerId: 'u1' }, dctx);
  dtrip = core.addPhoto(dtrip, { attach: { kind: 'day', dayId: '2026-08-09' }, thumb: { w: 1, h: 1, bytes: 1 }, display: { w: 1, h: 1, bytes: 1 } }, dctx);
  dtrip = core.setTripMeta(dtrip, { endDate: '2026-08-08' });
  dtrip = core.ensureDays(dtrip, dctx);
  ok(dtrip.photos.length === 1 && dtrip.photos[0].attach.kind === 'trip',
    '§10.3: deleting a day re-attaches its photos to the trip rather than destroying a memory to tidy a plan',
    dtrip.photos[0]?.attach);
}

// --------------------------------------------------------------------------- §K the small ones

head('§K — R45-13 … R45-16');
{
  // R45-13: §10.6 says failures are "kept until the user dismisses them". Nothing dismisses.
  const p = ports();
  const store = client.createStore({ ports: p });
  ok(typeof store.dismissPhotoFailures === 'function',
    'FINDING R45-13: a store method exists to dismiss the import failure report (§10.6)',
    { photoMethods: Object.keys(store).filter((k) => /photo/i.test(k)) });

  // R45-14: undo restores the record; the bytes are gone for good.
  await store.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09' });
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'trip' });
  const pid = store.getState().doc.photos[0].id;
  await store.removePhoto(pid);
  store.undo();
  ok(p.photo.thumbs.has(pid),
    'FINDING R45-14: undoing a photo removal restores the photograph, not only the record',
    { recordBack: store.getState().doc.photos.length === 1, bytesBack: p.photo.thumbs.has(pid),
      listing: client.photosFor(store.getState(), { kind: 'trip' }).items.map((i) => i.availability) });
  note('§10.1 point 1: *"attaching a photo is undoable for free because history is a `Trip`');
  note('snapshot."* Detaching one is not undoable at all, and A-57 Part 9 does not disclose it.');

  // R45-15: the id census claims day/place/booking/stop and not photo.
  const ctx = { ids: core.sequentialIds(), now: '2026-08-07', actorUserId: 'u1' };
  let t = core.createTrip({ title: 'T', startDate: '2026-08-07', endDate: '2026-08-09', ownerId: 'u1' }, ctx);
  const D = { thumb: { w: 1, h: 1, bytes: 1 }, display: { w: 1, h: 1, bytes: 1 } };
  t = core.addPhoto(t, { id: 'dup', caption: 'first', ...D }, ctx);
  t = core.addPhoto(t, { id: 'dup', caption: 'second', ...D }, ctx);
  ok(core.validateTrip(t).some((i) => i.code === 'duplicate_id' && i.params?.kind === 'photo'),
    'FINDING R45-15: `validateTrip`\'s id census claims photo ids as it claims day/place/booking/stop ids',
    { codes: core.validateTrip(t).map((i) => i.code) });
  note(`and \`removePhoto('dup')\` removes BOTH records while \`updatePhoto\` edits only the first —`);
  note('a duplicate `PhotoId` now also names two documents\' worth of bytes in one global key space.');

  // R45-16: §10.3 quota consequence 2.
  let persistFound = false;
  const walk = (d) => {
    for (const e of readdirSync(resolve(CAIRN, d), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${d}/${e.name}`);
      else if (/\.tsx?$/.test(e.name) && /storage\.persist\s*\(/.test(readFileSync(resolve(CAIRN, d, e.name), 'utf8'))) persistFound = true;
    }
  };
  walk('apps/web/src'); walk('packages/client/src');
  ok(persistFound,
    'FINDING R45-16: `navigator.storage.persist()` is called somewhere — §10.3 quota consequence 2',
    { found: persistFound });
  note('without it, WebKit\'s ITP non-interaction rule evicts script-created storage after seven');
  note('days. §10.2 designs `availability: "missing"` for that, so it degrades honestly — but no');
  note('ROADMAP increment owns the call, and "recorded so it is not lost" is not a mechanism.');

  // BUILD-NOTES §2's own run instruction, against the suite.
  //
  // **RE-CUT at round 46.** This line pinned the literal `'1316'`, which was the suite's size at
  // `9635207` and can never match a suite that has grown — a probe that goes red whenever the
  // number it polices is *corrected* is a probe that measures its own age. It MEASURES now: the
  // same `npm run test:tap | grep '^# pass'` BUILD-NOTES §2 tells a reader to run. That costs
  // ~30 s, so `--fast` skips it and says so rather than asserting silently.
  const bn = readFileSync(resolve(CAIRN, 'docs/BUILD-NOTES.md'), 'utf8');
  // §2's own code block, not the R44-4 row that quotes the old figure.
  const stated = /^npm test\s+# (\d+) tests/m.exec(bn)?.[1];
  if (process.argv.includes('--fast')) {
    note(`R45-17 skipped (--fast). BUILD-NOTES §2 states ${stated}; run \`npm run test:tap | grep '^# pass'\` to check it.`);
  } else {
    const tap = execFileSync('npm', ['run', '--silent', 'test:tap'], { cwd: CAIRN, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    const measured = /^# pass (\d+)$/m.exec(tap)?.[1] ?? null;
    const failed = /^# fail (\d+)$/m.exec(tap)?.[1] ?? null;
    ok(stated === measured && failed === '0',
      'FINDING R45-17: BUILD-NOTES §2\'s `npm test` count matches the suite, and the suite is green',
      { statedInSection2: stated, measured, failing: failed });
  }
}

// --------------------------------------------------------------------------- §L real data

head('§L — the shape of Jacob\'s actual trip, carrying photos');
{
  // Zero-length trip, a day in two cities, an overnight leg, a stop with no coordinates, and a
  // duplicate import — every one of them with a photo attached.
  const p = ports();
  const store = client.createStore({ ports: p });
  await store.createTrip({ title: 'One day', startDate: '2026-08-07', endDate: '2026-08-07' });
  p.photo.next = [file('a.jpg')];
  await store.importPhotos({ kind: 'day', dayId: '2026-08-07' });
  ok(store.getState().doc.photos.length === 1, 'a one-day trip takes a photo on its only day');

  // A day in two cities — the case the planner's own map bug came from.
  const ctx = { ids: core.sequentialIds(), now: '2026-08-07', actorUserId: 'u1' };
  const CITIES = [
    { key: 'dubrovnik', name: 'Dubrovnik', centre: { lat: 42.6507, lng: 18.0944 } },
    { key: 'split', name: 'Split', centre: { lat: 43.5081, lng: 16.4402 } },
  ];
  let t = core.createTrip({ title: 'HR', startDate: '2026-08-10', endDate: '2026-08-12', ownerId: 'u1', cities: CITIES }, ctx);
  t = core.addStop(t, { kind: 'day', dayId: '2026-08-12' }, { name: 'Old Town', category: 'sight', cityKey: 'dubrovnik', at: { lat: 42.6407, lng: 18.1102 } }, ctx);
  t = core.addStop(t, { kind: 'day', dayId: '2026-08-12' }, { name: 'Riva', category: 'sight', cityKey: 'split' }, ctx);      // no coordinates
  const two = t.days.find((d) => d.id === '2026-08-12').stops;
  t = core.addPhoto(t, { attach: { kind: 'stop', stopId: two[1].id }, thumb: { w: 1, h: 1, bytes: 1 }, display: { w: 1, h: 1, bytes: 1 } }, ctx);
  ok(t.photos[0].at === null && t.photos[0].metaSource === null,
    '§10.1 point 3: a photo on a coordinate-less stop infers NOTHING from the stop, the day or the city',
    { at: t.photos[0].at, metaSource: t.photos[0].metaSource });
  const issues = core.validateTrip(t).filter((i) => i.code.startsWith('photo_'));
  ok(issues.length === 0, 'and it raises no photo issue — the attachment resolves', issues);

  // The stop is then deleted: §10.3's loosening, through the action that causes it.
  const after = core.removeStop(t, two[1].id);
  ok(after.photos[0].attach.kind === 'trip',
    '§10.3: removing the stop re-attaches its photo to the trip rather than deleting a memory',
    after.photos[0].attach);

  // An overnight leg — a stop whose time crosses midnight — carrying a photo.
  let o = core.createTrip({ title: 'Night train', startDate: '2026-08-13', endDate: '2026-08-14', ownerId: 'u1' }, ctx);
  o = core.addStop(o, { kind: 'day', dayId: '2026-08-13' }, { name: 'Wien → Praha', category: 'transit', time: '23:40' }, ctx);
  const leg = o.days.find((d) => d.id === '2026-08-13').stops[0];
  o = core.addPhoto(o, {
    attach: { kind: 'stop', stopId: leg.id },
    capturedAt: { date: '2026-08-14', time: '02:11' },   // taken on the NEXT day, on the same leg
    metaSource: 'exif', thumb: { w: 1, h: 1, bytes: 1 }, display: { w: 1, h: 1, bytes: 1 },
  }, ctx);
  ok(o.photos[0].capturedAt.date === '2026-08-14' && core.validateTrip(o).filter((i) => i.code.startsWith('photo_')).length === 0,
    'a photo taken after midnight on an overnight leg keeps its own date and raises nothing — `capturedAt` is not a placement');

  // A duplicate import of the same file twice in one batch.
  const q = ports();
  const s2 = client.createStore({ ports: q });
  await s2.createTrip({ title: 'Dupe', startDate: '2026-08-07', endDate: '2026-08-09' });
  q.photo.next = [file('same.jpg'), file('same.jpg')];
  await s2.importPhotos({ kind: 'trip' });
  const dp = s2.getState().doc.photos;
  ok(dp.length === 2 && dp[0].id !== dp[1].id && q.photo.thumbs.size === 2,
    'the same file picked twice becomes two assets with two ids — no id collision, no overwrite',
    { ids: dp.map((x) => x.id), thumbs: q.photo.thumbs.size });
}

// --------------------------------------------------------------------------- exit

console.log(fails === 0 ? '\nALL OK' : `\n${fails} FAIL(S) — each carries its finding id; see docs/QA-FINDINGS.md round 45`);
process.exit(fails === 0 ? 0 : 1);
