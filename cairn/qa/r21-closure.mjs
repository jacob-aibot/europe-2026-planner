/**
 * Round 21 — the closure round. ARCHITECTURE revision 19's **A-25 Part 6** does not ask for a
 * fresh hunt; it states a **criterion** in six clauses and says the arc is *"closed for I-4a's
 * ship gate once round 21 confirms the criterion."* This probe confirms or refutes each clause by
 * running it, plus the fresh adversarial attempt the ruling's own re-opening condition calls for.
 *
 * Run: node --experimental-strip-types qa/r21-closure.mjs   (from cairn/)
 *
 *   §1  **Clause 1 — ceilings.** 71 exports, 2/4/11, 11 `validateTrip` issues, sample sha
 *       `40955ca0b182`, and the shipped `readOnce.test.ts`'s own shape (9 roots, 15 rows, 8
 *       `ALLOWED` entries, 4 tests, 0 exports).
 *   §2  **Clause 2 — Part 3 two-sided.** Reverting `refileCityKey`'s step-4 hoist must red
 *       assertion 1 naming **exactly** `15 · … : tgtCity1.order ×2` and nothing else; with the
 *       hoist applied, all **eight** `ALLOWED` entries observed at exactly their max. Also
 *       re-derives the builder's own disclosure: **before** the eighth entry existed the same
 *       revert named `tgtCity0.key ×2` as well.
 *   §3  **Clause 3 — R20-1's four-step mutation.** The structural preconditions are asserted here;
 *       the mutation itself is `qa/r21-clause3.sh`, which runs all four steps in a throwaway
 *       `git worktree` and discards it.
 *   §4  **Clause 4 — the null clause, two-sided.** The `Trip.meta` double read and the
 *       `Trip.homeBase` hybrid shape are **green** against `3d1be3b`'s census and **red** against
 *       A-25's, and `DECLARED_NULLS` is empty with nothing silently excused — checked by sweeping
 *       every root of every row for nulls, not just the seven the shipped test visits.
 *   §5  **Clause 5 — no ninth entry, no raised max.** Eight entries, all `max: 2`, and A-24's
 *       seven byte-identical to `3d1be3b`.
 *   §6  **Clause 6 — the residue, re-derived.** A fully-opened census (nothing opaque but the
 *       `IdFactory`) over all fifteen shipped rows must print classes A, B and C and nothing else.
 *       Includes the classification check A-25's own builder routed: is `tgtTrip.cities.<n> ×2` —
 *       a `City` ROW on the recipient's document, read twice — the accepted class A, or worse?
 *   §7  **The fresh attack**, calibrated against the ruling's re-opening condition: 22 document
 *       shapes no row of the fifteen builds, through both censuses, looking for a multi-read that
 *       is NOT in the disclosed residue and NOT inside the watched roots.
 *
 * **This probe reads the shipped `packages/core/test/readOnce.test.ts` and derives an importable
 * module from it in `os.tmpdir()`**, rather than keeping a local copy of the fixtures. That is
 * deliberate: `r19-census-gaps.mjs` and `r20-census-reach.mjs` both went stale in exactly that
 * way, and A-19 assertion 7 keeps assigning QA the re-expression. Nothing under `cairn/` is
 * written. Deterministic call sequences only, no races and no sleeps.
 *
 * **1 FAIL by design — R21-1, in §6**, the only finding this round produced: A-25 Part 5's class-A
 * enumeration is complete by *class* and incomplete by *instance* (three class-A paths it does not
 * list). Every other line is a confirmation that must stay at 0; a FAIL on any of them is a
 * refutation of the clause it sits under and re-opens the arc.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const QA = dirname(fileURLToPath(import.meta.url));
const ROOT = normalize(join(QA, '..'));
const CORE = join(ROOT, 'packages/core');
const RO = join(CORE, 'test/readOnce.test.ts');
const CS = join(CORE, 'src/build/copyStop.ts');

let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');
const note = (s) => console.log('  ' + s);

const TMP = mkdtempSync(join(tmpdir(), 'cairn-r21-'));
const core = await import('../packages/core/src/index.ts');

/** Rewrites a module's relative import specifiers to absolute `file://` URLs so it can be
 *  imported from outside the tree. `from` is the file the source was read from. */
const absolutize = (src, from) =>
  src.replace(/from '(\.\.?\/[^']+)'/g, (_, spec) => `from 'file://${normalize(join(dirname(from), spec))}'`);

/**
 * Derives an importable module from the shipped `readOnce.test.ts`: everything above the first
 * `test(` — the census, `TRIP_SKELETON`, `ALLOWED`, the four `CENSUS_*_FIELDS` maps, the fixtures
 * and the fifteen-row `MATRIX` — with `node:test` dropped and the symbols exported.
 * `copyStopIntoFrom`, when given, replaces the `copyStopInto` binding, which is how §2 and §4 run
 * the SHIPPED census over a MUTATED `copyStop.ts`.
 */
function deriveCensus(readOnceSrc, name, copyStopIntoFrom = null) {
  const cut = readOnceSrc.indexOf("test('");
  let head = readOnceSrc.slice(0, cut)
    .replace("import { test } from 'node:test';", '')
    .replace("import assert from 'node:assert/strict';", '');
  head = absolutize(head, RO);
  if (copyStopIntoFrom !== null) {
    head = head.replace(
      /import \{ ([^}]*)copyStopInto,?\s*([^}]*)\} from ('file:[^']+index\.ts');/,
      (_, a, b, idx) => `import { ${a}${b}} from ${idx};\nimport { copyStopInto } from 'file://${copyStopIntoFrom}';`,
    );
  }
  // `3d1be3b`'s census (§4's pre-A-25 direction) has neither the four maps nor the two lists, so
  // the export list is built from what the file actually declares rather than assumed.
  const WANT = ['censusDeep', 'censusTrip', 'TRIP_SKELETON', 'ALLOWED', 'MATRIX', 'runScenario',
    'copyStopInto', 'CENSUS_TRIP_FIELDS', 'CENSUS_STOP_FIELDS', 'CENSUS_PLACE_FIELDS',
    'CENSUS_CITY_FIELDS', 'DECLARED_NULLS', 'MINIMAL_STOP_ABSENT', 'MINIMAL_PLACE_ABSENT',
    'sourceTrip', 'minimalSourceTrip', 'targetTrip', 'VIENNA', 'BELVEDERE', 'SRC_CITY', 'TGT_CITY',
    'SCHEDULED', 'CTX'];
  const have = WANT.filter((s) => new RegExp(`(?:(?:const|function)\\s+${s}\\b)|(?:import \\{[^}]*\\b${s}\\b)`).test(head));
  head += `\nexport { ${have.join(', ')} };\n`;
  const p = join(TMP, name);
  writeFileSync(p, head);
  return p;
}

/** Derives a mutated `copyStop.ts` in the temp dir. `mutate` is applied to its source. */
function deriveCopyStop(name, mutate) {
  const src = mutate(readFileSync(CS, 'utf8'));
  const p = join(TMP, name);
  writeFileSync(p, absolutize(src, CS));
  return p;
}

/** Runs the fifteen shipped rows through a derived census and returns the offender list that
 *  assertion 1 would print, plus the observed maxima assertion 2 checks. */
function runMatrix(mod) {
  const offenders = [];
  const observed = {};
  const threw = [];
  for (const { name, build } of mod.MATRIX) {
    const r = mod.runScenario(build);
    if (r.threw) threw.push(`${name}: ${r.threw.message}`);
    for (const [f, c] of Object.entries(r.counts)) {
      if (f in mod.ALLOWED) observed[f] = Math.max(observed[f] ?? 0, c);
      if (c <= 1) continue;
      const a = mod.ALLOWED[f];
      if (a === undefined || c > a.max) offenders.push(`${name}: ${f} ×${c}`);
    }
  }
  return { offenders, observed, threw };
}

const roSrc = readFileSync(RO, 'utf8');
const csSrc = readFileSync(CS, 'utf8');
const shipped = await import(`file://${deriveCensus(roSrc, 'shipped.ts')}`);

/* ===== §1 clause 1 — the ceilings ============================================== */

line('§1 A-25 Part 6 clause 1 — the ceilings, re-derived by running');
{
  // Round 22: 71 -> 73. Phase 2 I-5 (`897b928`) added `countryOf` and `COUNTRY_INDEX`.
  ok('§2.10 export surface is 73', Object.keys(core).length === 73, String(Object.keys(core).length));

  const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');
  const { trip } = loadEurope2026();
  const cf = core.detectConflicts(trip, { today: FIXTURE_TODAY });
  const by = (sev) => cf.filter((x) => x.severity === sev).length;
  ok('reference trip: 2 / 4 / 11 conflicts at FIXTURE_TODAY',
    by('blocker') === 2 && by('warning') === 4 && by('note') === 11,
    `${by('blocker')}/${by('warning')}/${by('note')}`);
  ok('...and `validateTrip` is unmoved at 11 issues', core.validateTrip(trip).length === 11,
    String(core.validateTrip(trip).length));

  const sample = readFileSync(join(ROOT, 'apps/web/src/sample/europe2026.json'), 'utf8');
  ok('the sample sha is unmoved at `40955ca0b182`', sample.includes('40955ca0b182'));

  // The shipped census's own shape — the three dimensions A-25 Part 6 makes mechanical.
  const allowedEntries = roSrc.match(/\{ max: \d+, why:/g) ?? [];
  ok('`readOnce.test.ts` holds exactly EIGHT `ALLOWED` entries', allowedEntries.length === 8, String(allowedEntries.length));
  ok('...and fifteen matrix rows', shipped.MATRIX.length === 15, String(shipped.MATRIX.length));
  ok('...and four tests', (roSrc.match(/^test\(/gm) ?? []).length === 4, String((roSrc.match(/^test\(/gm) ?? []).length));
  ok('...and exports nothing itself (§2.10: tests do not create surface)', !/^export /m.test(roSrc));
  ok('...and nine roots — srcStop, srcPlace, srcCityN, tgtPlaceN, tgtCityN, srcTrip, tgtTrip, source, ctx/placement',
    /cities: srcTrip0\.cities\.map/.test(roSrc) && /cities: tgtTrip0\.cities\.map/.test(roSrc) &&
    /places: tgtTrip0\.places\.map/.test(roSrc));
  ok('determinism (`cairn-constraints`): neither changed file uses `Date.now`, `Math.random` or `crypto.randomUUID`',
    !/Date\.now|Math\.random|crypto\.randomUUID/.test(csSrc + roSrc));
  ok('...and neither logs, fetches nor persists',
    !/console\.\w|fetch\(|localStorage|indexedDB|writeFileSync/.test(csSrc + roSrc));
  ok('zero-dep core: `copyStop.ts` imports only relative core modules',
    (csSrc.match(/from '([^']+)'/g) ?? []).every((m) => /from '\.\.?\//.test(m)));

  // The generated build must not carry the new fixture's strings. `readOnce.test.ts` is not in
  // `apps/web`'s build graph, and this is that claim measured rather than assumed.
  let dist = '';
  try { dist = execFileSync('sh', ['-c', `cat ${join(ROOT, 'apps/web/dist/assets')}/*.js 2>/dev/null || true`], { encoding: 'utf8', maxBuffer: 64e6 }); } catch { /* no build */ }
  if (dist === '') note('apps/web/dist not built — skipping the fixture-leak check (run `npm run web:build`)');
  else ok('none of the A-25 fixture\'s new literals reaches `apps/web/dist`',
    !['0000deadbeef', 'ordinary prose about the pool', '33.9416', 'bk-src', 'tickets/entry.pdf'].some((s) => dist.includes(s)));
}

/* ===== §2 clause 2 — Part 3, two-sided ========================================= */

line('§2 A-25 Part 6 clause 2 — the `City.order` hoist, both directions');
{
  // The GREEN direction, from the shipped tree.
  const { offenders, observed, threw } = runMatrix(shipped);
  ok('applied: no scenario throws', threw.length === 0, JSON.stringify(threw));
  ok('applied: no unnamed multi-read across the fifteen rows', offenders.length === 0, JSON.stringify(offenders));
  const dead = Object.entries(shipped.ALLOWED).filter(([f, { max }]) => (observed[f] ?? 0) !== max);
  ok('applied: all EIGHT `ALLOWED` entries observed at exactly their max, none dead',
    dead.length === 0 && Object.keys(shipped.ALLOWED).length === 8,
    Object.entries(shipped.ALLOWED).map(([f, { max }]) => `${f} ${observed[f] ?? 0}/${max}`).join(', '));

  // The RED direction: A-25 Part 3's hoist reverted, verbatim.
  const HOISTED = '    const order: number = c.order;\n    if (best === null || order < best.order) best = { key: c.key, order };';
  const REVERTED = '    if (best === null || c.order < best.order) best = { key: c.key, order: c.order };';
  ok('the shipped `refileCityKey` carries A-25 Part 3\'s hoist verbatim', csSrc.includes(HOISTED));
  const revertedPath = deriveCopyStop('copyStopReverted.ts', (s) => s.replace(HOISTED, REVERTED));
  const rev = await import(`file://${deriveCensus(roSrc, 'censusReverted.ts', revertedPath)}`);
  const red = runMatrix(rev);
  ok('reverted: assertion 1 reds naming EXACTLY `15 · … : tgtCity1.order ×2` and nothing else',
    red.offenders.length === 1 && /^15 · .*: tgtCity1\.order ×2$/.test(red.offenders[0]),
    JSON.stringify(red.offenders));

  // The builder's own disclosure, re-derived rather than trusted: before the eighth entry existed,
  // the same revert also named `tgtCity0.key ×2` (row 9), and nothing else.
  const noEighth = await import(`file://${deriveCensus(
    roSrc.replace(/^ {2}'tgtCity0\.key': \{ max: 2, why:.*$\n/m, ''), 'censusNoEighth.ts', revertedPath)}`);
  const red2 = runMatrix(noEighth);
  ok('...and, with the eighth `ALLOWED` entry removed, exactly TWO offenders — the builder\'s ' +
    'disclosed `tgtCity0.key ×2` on row 9 as well, and still nothing else',
    red2.offenders.length === 2 &&
    red2.offenders.some((o) => /^9 · .*: tgtCity0\.key ×2$/.test(o)) &&
    red2.offenders.some((o) => /^15 · .*: tgtCity1\.order ×2$/.test(o)),
    JSON.stringify(red2.offenders));

  // The eighth entry is tight in BOTH directions — not a licence.
  for (const [m, expect] of [[1, 'assertion 1 AND 2 red'], [3, 'assertion 2 red']]) {
    const mod = await import(`file://${deriveCensus(
      roSrc.replace("'tgtCity0.key': { max: 2,", `'tgtCity0.key': { max: ${m},`), `tight${m}.ts`)}`);
    const r = runMatrix(mod);
    const dead2 = Object.entries(mod.ALLOWED).filter(([f, { max }]) => (r.observed[f] ?? 0) !== max);
    ok(`...and \`tgtCity0.key\` is tight at max ${m} (${expect})`,
      m === 1 ? r.offenders.length > 0 && dead2.length > 0 : r.offenders.length === 0 && dead2.length > 0,
      `offenders ${r.offenders.length}, dead ${dead2.length}`);
  }
}

/* ===== §3 clause 3 — R20-1's four-step mutation ================================ */

line('§3 A-25 Part 6 clause 3 — the structural preconditions of the four-step mutation');
{
  const cpSrc = readFileSync(join(CORE, 'test/copyStop.test.ts'), 'utf8');
  ok('`readOnce.test.ts` carries the compile-time map for all FOUR censused records',
    /Record<keyof Trip, true>/.test(roSrc) && /Record<keyof Stop, true>/.test(roSrc) &&
    /Record<keyof Place, true>/.test(roSrc) && /Record<keyof City, true>/.test(roSrc));
  ok('...so a 16th `Stop` field fails `npm run typecheck` at TWO sites, not one',
    /Record<keyof Stop, true>/.test(cpSrc) && /Record<keyof Stop, true>/.test(roSrc));
  ok('...and the maximal maps carry NO `filter` — `copyStop.test.ts` excludes `ticket` because ' +
    'that assertion is about what may CROSS; this one is about what is WATCHED',
    /keys\(srcStopOf\(src\)\), keys\(CENSUS_STOP_FIELDS\)/.test(roSrc) &&
    /filter\(\(k\) => k !== 'ticket'\)/.test(cpSrc));
  ok('...and the minimal row\'s absences are CLASSIFIED rather than assumed',
    /MINIMAL_STOP_ABSENT: ReadonlyArray<keyof Stop> = \['links', 'ticket'\]/.test(roSrc) &&
    /MINIMAL_PLACE_ABSENT: ReadonlyArray<keyof Place> = \['note', 'links', 'hours'\]/.test(roSrc));
  note('The mutation itself — add `voucher?: { code: string }` to `Stop`, written by `makeStop`');
  note('only when truthy; typecheck; satisfy both maps; observe the fixture test RED; populate it;');
  note('plant R19-5\'s shape — is `qa/r21-clause3.sh`, which runs all four steps in a throwaway');
  note('`git worktree` and discards it. Round 21 ran it: TS2741 at `copyStop.test.ts(1256,7)` AND');
  note('`readOnce.test.ts(197,7)`; satisfying both leaves `not ok 3` naming `voucher` on `srcStop`;');
  note('populating it is 4/4 green; R19-5\'s plant then reds assertion 1 with `srcStop.voucher ×3`');
  note('on 14 of 15 rows (row 14 is the minimal fixture and carries no `voucher` by construction).');
}

/* ===== §4 clause 4 — the null clause, two-sided ================================= */

line('§4 A-25 Part 6 clause 4 — `Trip.meta` / `Trip.homeBase`, and `DECLARED_NULLS`');
{
  ok('`DECLARED_NULLS` is empty — the strongest state the list can be in',
    Object.keys(shipped.DECLARED_NULLS).length === 0 &&
    /const DECLARED_NULLS: Record<string, string> = \{\};/.test(roSrc));

  // Nothing silently excused: sweep EVERY root of EVERY row, not the seven the shipped test visits.
  const SKEL = shipped.TRIP_SKELETON;
  const nullPaths = (v, path, out) => {
    if (v === null || v === undefined) { out.push(path); return; }
    if (typeof v !== 'object') return;
    for (const k of Object.keys(v)) nullPaths(v[k], `${path}.${k}`, out);
  };
  const tripNulls = (t, path, out) => { for (const k of Object.keys(t)) { if (!SKEL.has(k)) nullPaths(t[k], `${path}.${k}`, out); } };
  const srcStopOf = (t) => [...t.days.flatMap((d) => d.stops), ...t.pool].find((s) => s.id === 's-src');
  const found = new Map();
  for (const { n, build } of shipped.MATRIX) {
    const { source: s, target: t } = build();
    const out = [];
    tripNulls(s, 'srcTrip', out); tripNulls(t, 'tgtTrip', out);
    const ss = srcStopOf(s); if (ss) nullPaths(ss, 'srcStop', out);
    s.places.forEach((p, i) => nullPaths(p, i === 0 ? 'srcPlace' : `srcPlace${i}`, out));
    t.places.forEach((p, i) => nullPaths(p, `tgtPlace${i}`, out));
    s.cities.forEach((c, i) => nullPaths(c, `srcCity${i}`, out));
    t.cities.forEach((c, i) => nullPaths(c, `tgtCity${i}`, out));
    for (const p of out) found.set(p, [...(found.get(p) ?? []), n]);
  }
  // Rows 5, 11 and 14 are the DELIBERATELY non-maximal rows: `samePlace`'s null arm,
  // `placeForCopy`'s `at === null` arm, and the minimal fixture. Every other row must be null-free.
  const NON_MAXIMAL = new Set([5, 11, 14]);
  const leaked = [...found.entries()].filter(([, rows]) => rows.some((r) => !NON_MAXIMAL.has(r)));
  for (const [p, rows] of [...found.entries()].sort()) note(`null ${p.padEnd(22)} rows=[${rows.join(',')}]`);
  ok('...and no MAXIMAL fixture on any of the fifteen rows carries an undeclared null — every one ' +
    'found is on row 5, 11 or 14, the three rows that exist to cover an absent-optional arm',
    leaked.length === 0, JSON.stringify(leaked.map(([p]) => p)));

  // The key-set half, over every root of every row rather than index 0 only.
  const keys = (o) => Object.keys(o).sort();
  const without = (m, absent) => Object.keys(m).filter((k) => !absent.includes(k)).sort();
  const bad = [];
  for (const { n, build } of shipped.MATRIX) {
    const { source: s, target: t } = build();
    const min = n === 14;
    for (const [lbl, tr] of [['srcTrip', s], ['tgtTrip', t]]) {
      if (String(keys(tr)) !== String(keys(shipped.CENSUS_TRIP_FIELDS))) bad.push(`row ${n} ${lbl}`);
    }
    const ss = srcStopOf(s);
    const expStop = min ? without(shipped.CENSUS_STOP_FIELDS, shipped.MINIMAL_STOP_ABSENT) : keys(shipped.CENSUS_STOP_FIELDS);
    if (ss && String(keys(ss)) !== String(expStop)) bad.push(`row ${n} srcStop`);
    const expPlace = min ? without(shipped.CENSUS_PLACE_FIELDS, shipped.MINIMAL_PLACE_ABSENT) : keys(shipped.CENSUS_PLACE_FIELDS);
    s.places.forEach((p, i) => { if (String(keys(p)) !== String(expPlace)) bad.push(`row ${n} srcPlace${i}`); });
    t.places.forEach((p, i) => { if (String(keys(p)) !== String(keys(shipped.CENSUS_PLACE_FIELDS))) bad.push(`row ${n} tgtPlace${i}`); });
    [...s.cities.map((c, i) => [`srcCity${i}`, c]), ...t.cities.map((c, i) => [`tgtCity${i}`, c])]
      .forEach(([lbl, c]) => { if (String(keys(c)) !== String(keys(shipped.CENSUS_CITY_FIELDS))) bad.push(`row ${n} ${lbl}`); });
  }
  ok('every root of every row carries its full key set — including `tgtCity1`/`tgtCity2` (row 15) ' +
    'and `tgtPlace1…3` (row 3), which the shipped assertion pins only at index 0',
    bad.length === 0, JSON.stringify(bad));

  // The R20-2 vacancy, one shape over: an EMPTY container hides a subtree exactly as a null does.
  const empties = (v, path, out) => {
    if (v === null || typeof v !== 'object') return;
    const ks = Object.keys(v);
    if (ks.length === 0) { out.push(path + (Array.isArray(v) ? ' []' : ' {}')); return; }
    for (const k of ks) empties(v[k], `${path}.${k}`, out);
  };
  const s0 = shipped.sourceTrip();
  const t0 = shipped.targetTrip({ places: [{ name: 'Habyt Vienna', at: shipped.BELVEDERE }] });
  const em = [];
  for (const k of Object.keys(s0)) if (!SKEL.has(k)) empties(s0[k], `srcTrip.${k}`, em);
  for (const k of Object.keys(t0)) if (!SKEL.has(k)) empties(t0[k], `tgtTrip.${k}`, em);
  empties(srcStopOf(s0), 'srcStop', em);
  empties(s0.places[0], 'srcPlace', em);
  empties(t0.places[0], 'tgtPlace0', em);
  empties(s0.cities[0], 'srcCity0', em);
  empties(t0.cities[0], 'tgtCity0', em);
  ok('...and no MAXIMAL fixture carries an EMPTY container either — the same vacancy R20-2 found ' +
    'in a `null`, one shape over: `censusDeep` has nothing to count below an `[]` or a `{}`',
    em.length === 0, JSON.stringify(em));

  // Two-sided, live: R20-2's two plants against A-25's census and against `3d1be3b`'s.
  const PLANT = (s) => s.replace(
    '  const src = findAnywhere(sourceTrip, stopId);',
    `  const _metaHash = sourceTrip.meta ? String(sourceTrip.meta.sourceHash) : '';
  const _home = sourceTrip.homeBase === null ? null
    : { lat: sourceTrip.homeBase.at.lat, lng: sourceTrip.homeBase.at.lng, n: sourceTrip.homeBase.name };
  void _metaHash; void _home;
  const src = findAnywhere(sourceTrip, stopId);`);
  const plantedPath = deriveCopyStop('copyStopPlanted.ts', PLANT);
  const nowMod = await import(`file://${deriveCensus(roSrc, 'censusPlantedNow.ts', plantedPath)}`);
  const nowRed = runMatrix(nowMod);
  ok('the `meta` + `homeBase` plants are RED against A-25\'s census on every row',
    nowRed.offenders.length >= shipped.MATRIX.length &&
    nowRed.offenders.some((o) => /srcTrip\.meta ×2/.test(o)) &&
    nowRed.offenders.some((o) => /srcTrip\.homeBase ×4/.test(o)) &&
    nowRed.offenders.some((o) => /srcTrip\.homeBase\.at ×2/.test(o)),
    `${nowRed.offenders.length} offenders; e.g. ${JSON.stringify(nowRed.offenders.slice(0, 3))}`);
  let oldRoSrc = null;
  try { oldRoSrc = execFileSync('git', ['show', '3d1be3b:cairn/packages/core/test/readOnce.test.ts'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16e6 }); } catch { /* shallow clone */ }
  if (oldRoSrc === null) note('`git show 3d1be3b:…` unavailable — skipping the pre-A-25 direction');
  else {
    const thenMod = await import(`file://${deriveCensus(oldRoSrc, 'censusPlantedThen.ts', plantedPath)}`);
    const thenRed = runMatrix(thenMod);
    ok('...and GREEN against `3d1be3b`\'s census — both plants invisible, which is R20-2 reproduced ' +
      'and is what makes clause 4 a two-sided check rather than an assertion',
      thenRed.offenders.length === 0, JSON.stringify(thenRed.offenders.slice(0, 3)));
  }
}

/* ===== §5 clause 5 — no ninth entry, no raised max ============================= */

line('§5 A-25 Part 6 clause 5 — the allow-list is eight entries, all at max 2');
{
  const entries = roSrc.match(/\{ max: \d+, why:/g) ?? [];
  ok('eight entries, not nine', entries.length === 8, String(entries.length));
  ok('...and every one is `max: 2` — no `max` was raised', entries.every((e) => /max: 2,/.test(e)),
    `${entries.filter((e) => /max: 2,/.test(e)).length}/${entries.length} at max 2`);
  let old = null;
  try { old = execFileSync('git', ['show', '3d1be3b:cairn/packages/core/test/readOnce.test.ts'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16e6 }); } catch { /* shallow clone */ }
  if (old === null) note('`git show 3d1be3b:…` unavailable — skipping the byte-identity check');
  else {
    const grab = (s) => (s.match(/^ {2}'[\w.]+': *\{ max: \d+, why: .*$/gm) ?? []);
    const before = grab(old), after = grab(roSrc);
    const added = after.filter((l) => !before.includes(l));
    const removed = before.filter((l) => !after.includes(l));
    ok('...and A-24\'s seven entries are byte-identical to `3d1be3b` — exactly one line added, ' +
      'none removed and none modified', added.length === 1 && removed.length === 0 &&
      /'tgtCity0\.key'/.test(added[0] ?? ''), `+${added.length} −${removed.length}`);
  }
}

/* ===== §6 clause 6 — the residue, re-derived from a fully opened census ========= */

const NORM = (p) => p.replace(/\.\d+(?=\.|$)/g, '.<n>');
/** Every path A-25 Part 5 accounts for: the ones the shipped census + `ALLOWED` already cover,
 *  then classes A, B and C. Round 21 adds the three class-A instances Part 5's own enumeration
 *  omits, marked so they are visible rather than absorbed. */
const PART5 = new Map([
  ['srcTrip.days.<n>.stops.<n>.place.kind', 'watched (srcStop.place.kind, ALLOWED)'],
  ['srcTrip.pool.<n>.place.kind', 'watched (srcStop.place.kind on row 13, ALLOWED)'],
  ['srcTrip.places.<n>.at', 'watched (srcPlace.at, ALLOWED)'],
  ['srcTrip.places.<n>.at.lat', 'watched (srcPlace.at.lat, ALLOWED)'],
  ['srcTrip.places.<n>.at.lng', 'watched (srcPlace.at.lng, ALLOWED)'],
  ['srcTrip.places.<n>.name', 'watched (srcPlace.name, ALLOWED)'],
  ['tgtTrip.cities.<n>.key', 'watched (tgtCity0.key, ALLOWED)'],
  ['tgtTrip.id', 'watched (ALLOWED)'],
  ['tgtTrip.revision', 'watched (ALLOWED)'],
  ['tgtTrip.days', 'class A — enumerated'],
  ['tgtTrip.days.<n>', 'class A — enumerated'],
  ['tgtTrip.days.<n>.stops', 'class A — enumerated'],
  ['tgtTrip.places', 'class A — enumerated'],
  ['tgtTrip.places.<n>', 'class A — enumerated'],
  ['tgtTrip.cities', 'class A — enumerated'],
  ['tgtTrip.cities.<n>', 'class A — NOT enumerated in Part 5 (the builder routed this one)'],
  ['tgtTrip.pool', 'class A — NOT enumerated in Part 5 (round 21; needs pool placement + a reused/absent Place row)'],
  ['tgtTrip.days.<n>.stops.<n>', 'class A/C container — NOT enumerated in Part 5 (round 21; needs `insertionIndex`)'],
  ['tgtTrip.days.<n>.id', 'class B — the withDay findIndex + { ...day } spread floor'],
  ['tgtTrip.days.<n>.stops.<n>.placement', 'class C — build/stops.ts, out of scope with a trigger'],
  ['tgtTrip.days.<n>.stops.<n>.placement.kind', 'class C — build/stops.ts, out of scope with a trigger'],
]);

/** A fully opened census: nothing opaque but the `IdFactory`. */
function runOpen(mod, build) {
  const { source: s0, target: t0, placement } = build();
  const counts = {};
  const ids = core.sequentialIds('copy-');
  const opaque = new Set([ids]);
  const srcTrip = mod.censusDeep(s0, counts, 'srcTrip', opaque);
  const tgtTrip = mod.censusDeep(t0, counts, 'tgtTrip', opaque);
  opaque.add(srcTrip); opaque.add(tgtTrip);
  const source = mod.censusDeep({ trip: srcTrip, stopId: 's-src' }, counts, 'source', opaque);
  const ctx = mod.censusDeep({ ids, today: '2026-08-25', actorUserId: 'user:jacob' }, counts, 'ctx', opaque);
  const placed = mod.censusDeep(placement, counts, 'placement', opaque);
  let threw = null;
  try { mod.copyStopInto(tgtTrip, source, placed, ctx); } catch (e) { threw = e; }
  return { counts, threw };
}

line('§6 A-25 Part 6 clause 6 — a fully opened census over all fifteen rows');
{
  const agg = new Map();
  for (const { n, build } of shipped.MATRIX) {
    const { counts, threw } = runOpen(shipped, build);
    if (threw) note(`row ${n} threw: ${threw.message}`);
    for (const [f, c] of Object.entries(counts)) {
      if (c <= 1) continue;
      const k = NORM(f);
      const e = agg.get(k) ?? { max: 0, rows: [] };
      e.max = Math.max(e.max, c); if (!e.rows.includes(n)) e.rows.push(n); agg.set(k, e);
    }
  }
  for (const [k, v] of [...agg.entries()].sort()) note(`${k.padEnd(44)} ×${v.max}  rows=[${v.rows.join(',')}]  ${PART5.get(k) ?? '*** UNACCOUNTED ***'}`);
  const unaccounted = [...agg.keys()].filter((k) => !PART5.has(k));
  ok('clause 6: the fully opened census prints classes A, B and C and nothing else',
    unaccounted.length === 0, JSON.stringify(unaccounted));
  ok('...and `tgtTrip.cities.<n>.order` is absent — A-25 Part 3\'s hoist, measured from the other side',
    ![...agg.keys()].includes('tgtTrip.cities.<n>.order'), JSON.stringify([...agg.keys()]));
  const notEnumerated = [...agg.keys()].filter((k) => (PART5.get(k) ?? '').includes('NOT enumerated'));
  ok('...and Part 5\'s class-A enumeration is COMPLETE by instance, not only by class ' +
    '(R21-1: it is not — the classes are right, three instances are missing)',
    notEnumerated.length === 0,
    `${notEnumerated.length} class-A instance(s) Part 5 does not list: ${JSON.stringify(notEnumerated)} ` +
    '— see R21-1. Every one is the RECIPIENT\'S OWN container or row; nothing crosses a person ' +
    'boundary on any of them, so the CLASS is correctly bounded and the arc does not re-open');
}

/* ===== §6b the classification check A-25's own builder routed =================== */

line('§6b is `tgtTrip.cities.<n> ×2` the accepted class A, or worse?');
{
  // A-25 Part 2 already ALLOWS `tgtCity0.key ×2` — read 1 is A-19 validating the pool placement
  // argument, read 2 is `refileCityKey`'s step-4 fold — over the recipient's own row. The open
  // question is whether flipping the whole ROW, and therefore its `name` and `order` too, is
  // worse than flipping only the `key`. Measured, not argued.
  const V = { lat: 48.2082, lng: 16.3738 }, B = { lat: 48.1915, lng: 16.3806 };
  const C1 = (p) => ({ ids: core.sequentialIds(p), now: '2026-08-01', actorUserId: 'user:marta' });
  const C2 = (p) => ({ ids: core.sequentialIds(p), today: '2026-08-25', actorUserId: 'user:jacob' });
  const { addPlace } = await import('../packages/core/src/build/stops.ts');
  const mkSrc = () => {
    let t = core.createTrip({ id: 'trip-src', title: 'Marta', ownerId: 'user:marta',
      startDate: '2026-08-07', endDate: '2026-08-09',
      cities: [{ key: 'src-vienna', name: 'Vienna', centre: V, order: 0 }] }, C1('s-'));
    t = addPlace(t, { id: 'p-src', cityKey: 'src-vienna', name: 'Habyt Vienna', at: B, category: 'stay' });
    return core.addStop(t, { kind: 'scheduled', dayId: '2026-08-08', time: '10:00', order: 0 },
      { id: 's-src', name: 'Check in', category: 'stay', place: { kind: 'place', placeId: 'p-src' } }, C1('s2-'));
  };
  const city = (key, name, order) => ({ key, name, centre: V, order });
  const mkTgt = (rows) => core.createTrip({ id: 'trip-tgt', title: 'Jacob', ownerId: 'user:jacob',
    startDate: '2026-08-07', endDate: '2026-08-09', cities: rows }, C1('t-'));
  const runOne = (trip, pfx) => {
    let out = trip, threw = null;
    try { out = core.copyStopInto(trip, { trip: mkSrc(), stopId: 's-src' }, { kind: 'pool', cityKey: 'tgt-city' }, C2(pfx)); } catch (e) { threw = e; }
    return threw ? { err: threw.message } : {
      filedUnder: out.places.map((p) => p.cityKey).join(','),
      issues: core.validateTrip(out, '2026-08-01').map((i) => i.code).join(','),
    };
  };
  // (a) the ROW flips: cities[0] hands out the other real Vienna on its SECOND read.
  const base = mkTgt([city('tgt-city', 'Vienna', 0), city('tgt-city-2', 'Vienna', 1)]);
  const real = base.cities.slice();
  const arr = new Array(real.length);
  for (let k = 1; k < real.length; k++) arr[k] = real[k];
  let i = 0;
  Object.defineProperty(arr, '0', { enumerable: true, configurable: true,
    get() { const v = i === 1 ? real[1] : real[0]; i += 1; return v; } });
  const rowFlip = runOne({ ...base, cities: arr }, 'row-');
  // (b) the FIELD flips: only `key`, which is the shape `tgtCity0.key: { max: 2 }` already allows.
  const base2 = mkTgt([city('tgt-city', 'Vienna', 0), city('tgt-city-2', 'Vienna', 1)]);
  const row0 = { ...base2.cities[0] };
  delete row0.key;
  let j = 0;
  Object.defineProperty(row0, 'key', { enumerable: true, configurable: true,
    get() { const v = j === 1 ? 'tgt-city-2' : 'tgt-city'; j += 1; return v; } });
  const fieldFlip = runOne({ ...base2, cities: [row0, base2.cities[1]] }, 'fld-');
  note(`row flip   : ${JSON.stringify(rowFlip)}  (cities[0] read ${i}×)`);
  note(`field flip : ${JSON.stringify(fieldFlip)}  (cities[0].key read ${j}×)`);
  ok('the ROW flip\'s outcome is IDENTICAL to the already-ALLOWED FIELD flip\'s — the copied ' +
    '`Place` lands under the same wrong city of the RECIPIENT\'S OWN document, with the same ' +
    '`validateTrip` result. So `tgtTrip.cities.<n> ×2` is the accepted class and not a worse one: ' +
    'read 1 (`target.cities.some((c) => c.key === cityKey)`) consults ONLY `.key`, so a flipping ' +
    'row can diverge from the validation in no dimension the eighth `ALLOWED` entry does not ' +
    'already cover',
    JSON.stringify(rowFlip) === JSON.stringify(fieldFlip),
    `row ${JSON.stringify(rowFlip)} vs field ${JSON.stringify(fieldFlip)}`);
  // And the strictly-less-harmful variant, for the bound.
  const base3 = mkTgt([city('tgt-city', 'Vienna', 0)]);
  const real3 = base3.cities.slice();
  const arr3 = new Array(1);
  let k3 = 0;
  Object.defineProperty(arr3, '0', { enumerable: true, configurable: true,
    get() { const v = k3 === 1 ? city('ghost-city', 'Vienna', -1) : real3[0]; k3 += 1; return v; } });
  const ghost = runOne({ ...base3, cities: arr3 }, 'gho-');
  ok('...and flipping to a city the target does NOT hold is strictly MORE visible, not less — ' +
    '`validateTrip` reports `unknown_city_key`, an error, where the accepted case reports 0',
    String(ghost.issues ?? '').includes('unknown_city_key'), JSON.stringify(ghost));
}

/* ===== §7 the fresh attack ===================================================== */

line('§7 the fresh attack — 22 document shapes no row of the fifteen builds');
{
  const { addPlace } = await import('../packages/core/src/build/stops.ts');
  const { TRANSIT_CITY_KEY } = await import('../packages/core/src/model/ids.ts');
  const { sourceTrip, minimalSourceTrip, targetTrip, BELVEDERE, VIENNA, SRC_CITY, TGT_CITY, SCHEDULED, CTX } = shipped;
  const cities = (list) => targetTrip({ cities: list });
  const patchStop = (t, patch) => ({ ...t, days: t.days.map((d) => ({ ...d, stops: d.stops.map((s) => (s.id === 's-src' ? { ...s, ...patch } : s)) })) });
  const patchPlace = (t, patch) => ({ ...t, places: t.places.map((p, i) => (i === 0 ? { ...p, ...patch } : p)) });
  const tgtWithStop = () => addStopOwn(targetTrip());
  const addStopOwn = (t) => core.addStop(t, { kind: 'scheduled', dayId: '2026-08-08', time: '09:00', order: 0 },
    { id: 's-tgt-own', name: 'Own breakfast', category: 'food' }, CTX('own-'));

  const NEW = [
    ['N1  target city name folds to ""', () => ({ source: sourceTrip(), target: cities([{ key: TGT_CITY, name: '   ', order: 0 }]), placement: SCHEDULED })],
    ['N2  source place `hours.weekly` is a string (R15-2 shape)', () => ({ source: patchPlace(sourceTrip(), { hours: { weekly: 'mon-fri', note: 'x' } }), target: targetTrip(), placement: SCHEDULED })],
    ['N3  three weekly entries, the middle one malformed', () => ({ source: patchPlace(sourceTrip(), { hours: { weekly: [{ day: 1, open: '09:00', close: '17:00' }, { day: 2, open: 'nope', close: '17:00' }, { day: 3, open: '08:00', close: '12:00' }] } }), target: targetTrip(), placement: SCHEDULED })],
    ['N4  cost.display null, no cost.note, no arrival.label', () => ({ source: patchStop(sourceTrip(), { cost: { amounts: [{ lo: 5, hi: 5, currency: 'EUR', basis: 'total' }], display: null }, arrival: { mode: 'walk', mins: 4 } }), target: targetTrip(), placement: SCHEDULED })],
    ['N5  pool placement, NO hint', () => ({ source: sourceTrip(), target: targetTrip(), placement: { kind: 'pool', cityKey: TGT_CITY } })],
    ['N6  pool placement, hint with `order` undefined', () => ({ source: sourceTrip(), target: targetTrip(), placement: { kind: 'pool', cityKey: TGT_CITY, hint: { dayId: '2026-08-08', time: '11:00' } } })],
    ['N7  three same-named target cities, TWO tied at the lowest order', () => ({ source: sourceTrip(), target: cities([{ key: TGT_CITY, name: 'Vienna', order: 5 }, { key: 'b', name: 'Vienna', order: 3 }, { key: 'c', name: 'Vienna', order: 3 }]), placement: SCHEDULED })],
    ['N8  FIVE same-named target cities, the minimum in the middle', () => ({ source: sourceTrip(), target: cities([{ key: TGT_CITY, name: 'Vienna', order: 9 }, { key: 'b', name: 'Vienna', order: 7 }, { key: 'c', name: 'Vienna', order: 2 }, { key: 'd', name: 'Vienna', order: 8 }, { key: 'e', name: 'Vienna', order: 4 }]), placement: SCHEDULED })],
    ['N9  source place filed under a cityKey the SOURCE lacks (step 1 → null)', () => ({ source: patchPlace(sourceTrip(), { cityKey: 'ghost-city' }), target: targetTrip(), placement: SCHEDULED })],
    ['N10 same document, target LACKS the key (A-16 step 2 falls through)', () => { const s = sourceTrip(); return { source: s, target: { ...s, cities: [{ key: 'other', name: 'Vienna', countryCode: 'AT', centre: VIENNA, order: 0, meta: {} }] }, placement: SCHEDULED }; }],
    ['N11 scheduled `order` beyond day.stops.length → insertionIndex', () => ({ source: sourceTrip(), target: tgtWithStop(), placement: { kind: 'scheduled', dayId: '2026-08-08', time: '11:00', order: 99 } })],
    ['N12 target day already holds a stop, scheduled at order 0', () => ({ source: sourceTrip(), target: tgtWithStop(), placement: SCHEDULED })],
    ['N13 target holds a same-NAMED place in a DIFFERENT city', () => { let t = targetTrip({ cities: [{ key: TGT_CITY, name: 'Vienna', order: 0 }, { key: 'z', name: 'Zagreb', order: 1 }] }); t = addPlace(t, { id: 'p-z', cityKey: 'z', name: 'Habyt Vienna', at: BELVEDERE, category: 'stay' }); return { source: sourceTrip(), target: t, placement: SCHEDULED }; }],
    ['N14 pool → pool, TRANSIT_CITY_KEY with no hint', () => ({ source: sourceTrip({ pool: true }), target: targetTrip(), placement: { kind: 'pool', cityKey: TRANSIT_CITY_KEY } })],
    ['N15 same document + pool placement (A-16 step 2, pool, reuse)', () => { const s = sourceTrip(); return { source: s, target: s, placement: { kind: 'pool', cityKey: SRC_CITY } }; }],
    ['N16 scheduled `time` null', () => ({ source: sourceTrip(), target: targetTrip(), placement: { kind: 'scheduled', dayId: '2026-08-08', time: null, order: 0 } })],
    ['N17 source stop carries three `links`', () => ({ source: patchStop(sourceTrip(), { links: [{ label: 'a', href: 'https://a.test' }, { label: 'b', href: 'https://b.test' }, { label: 'c', href: 'https://c.test' }] }), target: targetTrip(), placement: SCHEDULED })],
    ['N18 minimal source + pool placement with a live hint', () => ({ source: minimalSourceTrip(), target: targetTrip(), placement: { kind: 'pool', cityKey: TGT_CITY, hint: { dayId: '2026-08-08', time: '11:00', order: 0 } } })],
    ['N19 target with FOUR places, the match at index 3', () => ({ source: sourceTrip(), target: targetTrip({ places: [{ name: 'A', at: { lat: 1, lng: 1 } }, { name: 'B', at: { lat: 2, lng: 2 } }, { name: 'C', at: { lat: 3, lng: 3 } }, { name: 'Habyt Vienna', at: BELVEDERE }] }), placement: SCHEDULED })],
    ['N20 target with three cities, the match at index 2', () => ({ source: sourceTrip(), target: cities([{ key: 'a', name: 'Prague', order: 0 }, { key: 'b', name: 'Split', order: 1 }, { key: TGT_CITY, name: 'Vienna', order: 2 }]), placement: SCHEDULED })],
    ['N21 source place `at` null + target same-named row WITH a coordinate', () => ({ source: sourceTrip({ at: null }), target: targetTrip({ places: [{ name: 'Habyt Vienna', at: BELVEDERE }] }), placement: SCHEDULED })],
    ['N22 source place `note` and `hours.note` carrying a door PIN', () => ({ source: patchPlace(sourceTrip(), { note: 'door PIN 0754, conf 5814731574', hours: { weekly: [{ day: 1, open: '09:00', close: '17:00' }], note: 'ring 4809' } }), target: targetTrip(), placement: SCHEDULED })],
  ];

  // (a) through the SHIPPED census: an unnamed multi-read INSIDE the roots is a normal regression.
  const unnamed = [];
  const threw = [];
  for (const [n, build] of NEW) {
    const r = shipped.runScenario(build);
    if (r.threw) threw.push(`${n}: ${r.threw.message}`);
    for (const [f, c] of Object.entries(r.counts)) {
      if (c <= 1) continue;
      const a = shipped.ALLOWED[f];
      if (a === undefined || c > a.max) unnamed.push(`${n}: ${f} ×${c}`);
    }
  }
  ok(`no scenario of the ${NEW.length} throws — §2.1: core throws on programmer error, never on ` +
    'what a document contains', threw.length === 0, JSON.stringify(threw));
  ok(`no unnamed multi-read INSIDE the census's roots across ${NEW.length} new document shapes`,
    unnamed.length === 0, JSON.stringify(unnamed));

  // (b) through a FULLY OPENED census: anything outside the disclosed residue would be the
  // ruling's own re-opening condition.
  const outside = new Map();
  for (const [n, build] of NEW) {
    const { counts } = runOpen(shipped, build);
    for (const [f, c] of Object.entries(counts)) {
      if (c <= 1) continue;
      const k = NORM(f);
      if (PART5.has(k)) continue;
      const e = outside.get(k) ?? { max: 0, rows: [] };
      e.max = Math.max(e.max, c); e.rows.push(n.slice(0, 4).trim()); outside.set(k, e);
    }
  }
  for (const [k, v] of [...outside.entries()].sort()) note(`OUTSIDE ${k} ×${v.max}  ${v.rows.join(',')}`);
  // R21-1's other two instances: class-A paths Part 5's enumeration omits that NO row of the
  // fifteen reaches, so §6 alone cannot see them. `tgtTrip.pool` needs a pool placement whose
  // `Place` is REUSED (so `withPlace === target` and `addStop`'s `{ ...trip, pool: [...trip.pool] }`
  // lands on the censused object — the same spread floor as the ALLOWED `tgtTrip.revision`);
  // `tgtTrip.days.<n>.stops.<n>` needs `insertionIndex`, i.e. an `order` past the day's length.
  const lateA = new Set();
  for (const [n, build] of NEW) {
    const { counts } = runOpen(shipped, build);
    for (const [f, c] of Object.entries(counts)) {
      if (c > 1 && (PART5.get(NORM(f)) ?? '').includes('NOT enumerated')) lateA.add(`${NORM(f)} (${n.slice(0, 3)})`);
    }
  }
  note(`class-A instances Part 5 does not enumerate, reached only by these new shapes: ${JSON.stringify([...lateA].sort())}`);
  ok('...and nothing outside A-25 Part 5\'s accounted set — the ruling\'s re-opening condition is ' +
    'a multi-read the shipped census structurally cannot see, OF A VALUE THAT CROSSES A PERSON ' +
    'BOUNDARY OR DECIDES WHERE A CROSSED RECORD IS FILED. Nothing found qualifies',
    outside.size === 0, JSON.stringify([...outside.keys()]));

  // (c) the source side, which is the side values cross FROM. Nothing of the source is read twice
  // outside the four A-21/A-21a entries, on any of the 37 shapes run in this file.
  const srcMulti = new Set();
  for (const [, build] of NEW) {
    const { counts } = runOpen(shipped, build);
    for (const [f, c] of Object.entries(counts)) if (c > 1 && f.startsWith('srcTrip.')) srcMulti.add(NORM(f));
  }
  const SRC_OK = new Set(['srcTrip.days.<n>.stops.<n>.place.kind', 'srcTrip.pool.<n>.place.kind',
    'srcTrip.places.<n>.at', 'srcTrip.places.<n>.at.lat', 'srcTrip.places.<n>.at.lng', 'srcTrip.places.<n>.name']);
  const srcBad = [...srcMulti].filter((f) => !SRC_OK.has(f));
  // (d) the sensitive-path check the new fixture makes possible for the first time. A-25 Part 1
  // populates `Trip.homeBase` (a named home coordinate, a `geoCheck` anchor, §2.13) and
  // `Trip.meta.poolNotes` (free text, KD-20's carrier class) on the SOURCE. `copyStopInto` must
  // not read either — count 0, not 1 — and nothing of either may appear in the recipient.
  {
    const { counts } = runOpen(shipped, shipped.MATRIX[0].build);
    const touched = Object.keys(counts).filter((f) => /^srcTrip\.(homeBase|meta)\b/.test(f));
    ok('the source\'s `homeBase` (a named home coordinate) and `meta.poolNotes` (free text) are ' +
      'read ZERO times by the copy path — not once, not twice', touched.length === 0, JSON.stringify(touched));
    // The two fixtures share `HOME_BASE()` and `TRIP_META()`, so the source's values are given
    // distinctive ones here — otherwise a hit would be the RECIPIENT'S OWN data, not a crossing.
    const srcSensitive = {
      ...shipped.sourceTrip(),
      homeBase: { name: 'SRC-HOMEBASE-MARKER', at: { lat: 11.2233, lng: -44.5566 } },
      meta: { poolNotes: { 'src-vienna': { title: 'x', note: 'SRC-POOLNOTE-MARKER' } }, sourceHash: 'srcdeadbeef99' },
    };
    const out = core.copyStopInto(shipped.targetTrip(), { trip: srcSensitive, stopId: 's-src' },
      shipped.SCHEDULED, { ids: core.sequentialIds('sens-'), today: '2026-08-25', actorUserId: 'user:jacob' });
    const doc = core.toJSON(out);
    ok('...and no part of the SOURCE\'s home coordinate, its name, or its free-text `poolNotes` ' +
      'appears anywhere in the recipient\'s serialized document',
      !['SRC-HOMEBASE-MARKER', '11.2233', '-44.5566', 'srcdeadbeef99', 'SRC-POOLNOTE-MARKER']
        .some((s) => doc.includes(s)));
  }

  ok('...and on the SOURCE document — the only side anything crosses FROM — the only multi-reads ' +
    'are the four A-21/A-21a entries and the discriminant carve-out, at every depth including ' +
    '`bookings` and `resolutions`, which nothing on this path reads at all',
    srcBad.length === 0, JSON.stringify(srcBad));
}

console.log('\n' + (fails === 0 ? 'ALL OK' : `${fails} FAIL`));
process.exitCode = 0;
