// QA round 32 — A-39 verification, BUILD-NOTES deviation (1).
//
//   Run: node --experimental-strip-types qa/r32-revision0.mjs      (from cairn/)
//
// The builder's disclosed deviation (1) drops A-39 Part 4's `revision: 0` from the degenerate
// Axis-C fixture on the ground that it is UNREACHABLE — *"`createTrip` ends in `ensureDays`,
// which bumps `revision` to 1 for any valid range, so no storable document has `revision: 0`"* —
// and `test/stats-storage.test.ts:1075` asserts `revision === 1` with that reasoning in a
// comment. A-39 Part 4's admission rule is *"a state is admitted only if a real deployed
// database can actually be in it"*, so the deviation stands or falls on that reachability claim.
//
// This probe asks the question the claim is about: can a REAL DEPLOYED DATABASE hold a summary
// row with `revision: 0`? `createTrip` is not the only way a document reaches storage.
// `importDoc` (packages/client/src/store/store.ts:1218) is the second write path: it takes a
// document from `fromJSON`, adopts ownership, and calls `save()` — and it never touches
// `revision`. Backup/restore of the user's own export is a supported, shipped feature
// (BRIEF: *"importDoc is backup/restore of the user's own exports"*).
//
// A "FAIL" line means the probe found what it was looking for.
import { readFileSync } from 'node:fs';
import * as core from '../packages/core/src/index.ts';
import { createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler } from '../packages/client/src/index.ts';

let fails = 0;
const ok = (cond, msg, extra) => {
  if (cond) console.log(`  ok   ${msg}`);
  else { fails++; console.log(`  FAIL ${msg}`); if (extra !== undefined) console.log(`       ${JSON.stringify(extra)}`); }
};

const TODAY = '2026-06-15';
const mkPorts = (storage) => ({
  storage,
  file: memoryFile(),
  clock: fixedClockPort(TODAY),
  ids: sequentialIdPort('r32-'),
  scheduler: immediateScheduler(),
});

console.log('\n== step 1: does core preserve `revision: 0` through a document round trip? ==');
const ctx = { ids: (() => { let i = 0; return () => `c${i++}`; })(), now: TODAY };
const minted = core.createTrip(
  { id: 'r32-trip', title: 'degenerate', startDate: '2024-05-01', endDate: '2024-05-02', homeCurrency: 'EUR', datePrecision: 'month' },
  ctx,
);
console.log(`  createTrip mints revision = ${minted.revision}   (the builder's premise: never 0)`);

const doc = JSON.parse(core.toJSON(minted));
doc.revision = 0;
delete doc.ownerId; // an ownerless export, which importDoc adopts — BRIEF's backup/restore case
const imported = core.fromJSON(JSON.stringify(doc));
ok(imported.revision === 0, 'core.fromJSON PRESERVES `revision: 0` — it is not normalised away', { revision: imported.revision });

console.log('\n== step 2: does it survive the shipped import path into STORAGE? ==');
const storage = memoryStorage();
const store = createStore({ ports: mkPorts(storage) });

await store.importDoc(JSON.stringify(doc));
await store.flush();

const rows = await storage.listTrips();
const row = rows.find((r) => r.revision === 0) ?? rows[0];
console.log(`  listTrips() returned ${rows.length} row(s); revision = ${JSON.stringify(rows.map((r) => r.revision))}`);
ok(
  row !== undefined && row.revision === 0,
  'a PERSISTED summary row carries `revision: 0` — reached through importDoc, the shipped ' +
    'backup/restore path, with no fault injected and no hand-written row',
  row === undefined ? null : { id: row.id, revision: row.revision, summaryVersion: row.summaryVersion },
);

console.log('\n== step 3: what the covering set holds for Axis C\'s `revision` cell ==');
const src = readFileSync(new URL('../test/stats-storage.test.ts', import.meta.url), 'utf8');
const asserts1 = /assert\.equal\(degenerate\.revision, 1,/.test(src);
ok(
  !asserts1,
  'the degenerate Axis-C fixture does NOT pin `revision === 1` — i.e. some fixture in the ' +
    'covering set can reach `revision`\'s zero cell (A-39 Part 4 lists `revision` among the ' +
    'count-shaped fields whose {zero, non-zero} cells Axis C must cover)',
  { 'test/stats-storage.test.ts:1075': 'assert.equal(degenerate.revision, 1, ...)' },
);

console.log(`\n${fails === 0 ? 'ALL OK' : `${fails} FAIL(S)`}`);
process.exit(fails === 0 ? 0 : 1);
