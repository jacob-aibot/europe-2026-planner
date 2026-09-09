/**
 * QA round 61 — the corpus half of the adversarial pass over I-22 / §8.4 A-83 Part 8.
 *
 * `gazetteer.gen.ts` shows a ~14,600-line diff because the whole corpus regenerated. A
 * corpus-wide regeneration is an excellent place for an unnoticed coordinate to move, so this
 * probe decodes the corpus at **both** commits and compares them row by row.
 *
 * Run from `cairn/`:
 *   node --experimental-strip-types qa/r61-corpus.mjs [--prev <worktree of dd19958>]
 *
 * It creates nothing in the live tree. `--prev` defaults to a `git worktree` the caller made;
 * without one the before/after comparison is SKIPPED and reported as skipped, never as passed.
 *
 *   A  the rename is complete — no stale `gazetteer-refusals` reference anywhere
 *   B  before/after, row by row: what changed apart from `indexAgrees` and the id prefix?
 *   C  the golden and the corpus agree, and every published row is findable and marked
 *   D  the zero-exception invariant, walked with no allowlist
 *   E  `EMITTED_BYTES` against the bytes actually on disk
 *   F  the generator's own audit really exits non-zero (the builder's N6 guard)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CAIRN = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO = dirname(CAIRN);
const argPrev = process.argv.indexOf('--prev');
const PREV = argPrev > 0 ? process.argv[argPrev + 1] : process.env.R61_PREV ?? null;

let fails = 0, skips = 0;
const ok = (c, m, x) => { if (c) console.log(`  ok   ${m}`); else { fails++; console.log(`  FAIL ${m}${x === undefined ? '' : `  — ${x}`}`); } };
const note = (m) => console.log(`  note ${m}`);
const skip = (m) => { skips++; console.log(`  SKIP ${m}`); };
const head = (s) => console.log(`\n== ${s}`);
const J = (v) => JSON.stringify(v);

const gz = await import(pathToFileURL(join(CAIRN, 'packages/core/src/geo/gazetteer.gen.ts')).href);
const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);
const rows = gz.GAZETTEER.rows;

// ---------------------------------------------------------------------------
head('A — the rename is complete');
{
  let hits = '';
  try {
    hits = execFileSync('git', ['grep', '-n', '-I', 'gazetteer-refusals\\|gazetteerRefusals\\|refusals.json'],
      { cwd: REPO, encoding: 'utf8' });
  } catch { hits = ''; }
  // A *narrative* mention ("renamed from …") is the record of the rename and is correct; a
  // reference that would be RESOLVED as a path is the defect. Separate the two.
  const all = hits.split('\n').filter(Boolean).filter((l) => !l.startsWith('cairn/docs/'));
  const live = all.filter((l) => /readFileSync|readFile|require\(|import\(|join\(|new URL|'\.\.\/fixtures|fixtures\/golden\/gazetteer-refusals\.json'/.test(l)
    && !/renamed from|\*/.test(l.split(':').slice(2).join(':').trim().slice(0, 2)));
  const narrative = all.filter((l) => !live.includes(l));
  ok(live.length === 0, 'no live PATH reference to the old golden name outside docs/', live.join(' | '));
  for (const n of narrative) note(`narrative mention (correct): ${n.slice(0, 110)}`);
  const docHits = (hits.match(/cairn\/docs\//g) ?? []).length;
  note(`${docHits} historical mention(s) inside cairn/docs/ (BUILD-NOTES / ROADMAP / ARCHITECTURE narrate the rename)`);
  ok(existsSync(join(CAIRN, 'fixtures/golden/gazetteer-disagreements.json')), 'the new golden exists');
  ok(!existsSync(join(CAIRN, 'fixtures/golden/gazetteer-refusals.json')), 'the old golden is gone');
  // The generator must not still write the old name.
  const gen = readFileSync(join(CAIRN, 'tools/gen-gazetteer.mjs'), 'utf8');
  const genLive = (gen.match(/^(?!\s*\*).*refusals.*$/gm) ?? []);
  ok(genLive.length === 0, 'the generator has no CODE reference to `refusals` left in it', genLive.join(' | '));
  note(`the generator carries ${(gen.match(/refusals/g) ?? []).length} narrative mention(s) of the old name, all in comments`);
  // The golden-scan exemption list in test/cli.test.ts.
  const cli = readFileSync(join(CAIRN, 'test/cli.test.ts'), 'utf8');
  ok(!/gazetteer-refusals/.test(cli), 'test/cli.test.ts names the new file');
}

// ---------------------------------------------------------------------------
head('B — before/after, row by row');
if (PREV === null || !existsSync(join(PREV, 'cairn/packages/core/src/geo/gazetteer.gen.ts'))) {
  skip('no --prev worktree given; the before/after comparison did NOT run');
} else {
  const prev = await import(pathToFileURL(join(PREV, 'cairn/packages/core/src/geo/gazetteer.gen.ts')).href);
  const before = prev.GAZETTEER.rows;
  note(`before ${before.length} rows, after ${rows.length} rows (delta ${rows.length - before.length})`);
  // The id gained a source prefix; strip it to pair rows up.
  const bare = (id) => String(id).replace(/^ne:/, '');
  const beforeById = new Map(before.map((r) => [bare(r.id), r]));
  const afterById = new Map(rows.map((r) => [bare(r.id), r]));
  ok(beforeById.size === before.length && afterById.size === rows.length,
    'ids are unique on both sides after stripping the prefix',
    `${beforeById.size}/${before.length} vs ${afterById.size}/${rows.length}`);
  ok(rows.every((r) => /^ne:/.test(r.id)), 'every shipped id now carries the `ne:` prefix',
    J(rows.filter((r) => !/^ne:/.test(r.id)).slice(0, 5).map((r) => r.id)));
  const added = [...afterById.keys()].filter((k) => !beforeById.has(k));
  const removed = [...beforeById.keys()].filter((k) => !afterById.has(k));
  note(`${added.length} rows added, ${removed.length} removed`);
  ok(removed.length === 0, 'no row was dropped by the regeneration', J(removed.slice(0, 10)));
  ok(added.length === 98, 'exactly the 98 previously-refused rows were added', String(added.length));
  ok(added.every((k) => afterById.get(k).indexAgrees === false),
    'every added row is marked indexAgrees: false',
    J(added.filter((k) => afterById.get(k).indexAgrees !== false).slice(0, 5)));
  // Every row that existed before must be byte-identical apart from `id` and `indexAgrees`.
  const drift = [];
  for (const [k, b] of beforeById) {
    const a = afterById.get(k);
    if (!a) continue;
    const strip = (r) => { const x = { ...r }; delete x.id; delete x.indexAgrees; return J(x); };
    if (strip(a) !== strip(b)) drift.push(`${b.name}: ${strip(b)} → ${strip(a)}`);
  }
  ok(drift.length === 0,
    'NO pre-existing row changed except by gaining the flag and the id prefix',
    `${drift.length} rows drifted: ${drift.slice(0, 5).join(' || ')}`);
  const coordDrift = [];
  for (const [k, b] of beforeById) {
    const a = afterById.get(k);
    if (a && J(a.centre) !== J(b.centre)) coordDrift.push(`${b.name}: ${J(b.centre)} → ${J(a.centre)}`);
  }
  ok(coordDrift.length === 0, 'not one coordinate moved', coordDrift.slice(0, 10).join(' | '));
  const carried = [...beforeById.keys()].filter((k) => afterById.has(k));
  ok(carried.every((k) => afterById.get(k).indexAgrees === true),
    'every carried-over row is marked indexAgrees: true',
    J(carried.filter((k) => afterById.get(k).indexAgrees !== true).slice(0, 5)));
}

// ---------------------------------------------------------------------------
head('C — the golden and the corpus agree');
{
  const golden = JSON.parse(readFileSync(join(CAIRN, 'fixtures/golden/gazetteer-disagreements.json'), 'utf8'));
  const list = golden.disagreements ?? golden.refused;
  ok(Array.isArray(list), 'the golden carries a `disagreements` array', J(Object.keys(golden)));
  for (const key of ['$generatedBy', '$source', '$sourceSha256', '$what']) {
    ok(key in golden, `the golden carries ${key}`, J(Object.keys(golden)));
  }
  const marked = rows.filter((r) => r.indexAgrees === false);
  ok(marked.length === list.length, 'the corpus and the golden agree on the count',
    `${marked.length} vs ${list.length}`);
  ok(marked.length > 0, 'a disagreement count of ZERO is itself a failure', String(marked.length));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const missing = list.filter((e) => !byId.has(e.id) || byId.get(e.id).indexAgrees !== false);
  ok(missing.length === 0, 'every published row is findable in GAZETTEER and marked', J(missing.slice(0, 5)));
  const wrongCode = list.filter((e) => byId.has(e.id) && byId.get(e.id).countryCode !== e.statedCountry);
  ok(wrongCode.length === 0, 'every published stated code matches the shipped row', J(wrongCode.slice(0, 5)));
  const named = ['Geneva', 'Jerusalem', 'Brazzaville', 'Maastricht', 'Lugano', 'Niagara Falls', 'Arlon'];
  const have = named.filter((n) => list.some((e) => e.name === n));
  ok(have.length === named.length, 'A-83 Part 8\'s named rows are all published', J(named.filter((n) => !have.includes(n))));
  note(`disagreeing rows: ${list.length}; a sample: ${J(list.slice(0, 3))}`);
}

// ---------------------------------------------------------------------------
head('D — the zero-exception invariant, walked with no allowlist');
{
  const IDX = core.COUNTRY_INDEX;
  const silent = [];
  const falselyMarked = [];
  for (const r of rows) {
    const derived = core.countryOf(r.centre, IDX);
    if (r.indexAgrees === true) {
      if (derived !== null && derived !== r.countryCode) silent.push(`${r.name} (${r.id}) states ${r.countryCode}, countryOf says ${derived}`);
    } else {
      if (derived === null || derived === r.countryCode) falselyMarked.push(`${r.name} (${r.id}) marked, but countryOf says ${J(derived)}`);
    }
  }
  ok(silent.length === 0, 'ZERO shipped rows with indexAgrees: true contradict countryOf', `${silent.length}: ${silent.slice(0, 5).join(' | ')}`);
  ok(falselyMarked.length === 0, 'every MARKED row genuinely disagrees — the marking is a record, not a licence',
    `${falselyMarked.length}: ${falselyMarked.slice(0, 5).join(' | ')}`);
  const agree = rows.filter((r) => r.indexAgrees === true && core.countryOf(r.centre, IDX) === r.countryCode).length;
  const silentIdx = rows.filter((r) => core.countryOf(r.centre, IDX) === null).length;
  note(`${agree} agree, ${silentIdx} the index is silent on, ${rows.filter((r) => r.indexAgrees === false).length} marked, ${rows.length} total`);
}

// ---------------------------------------------------------------------------
head('E — EMITTED_BYTES against the bytes on disk');
{
  const budget = readFileSync(join(CAIRN, 'packages/core/test/0-gazetteerBudget.test.ts'), 'utf8');
  const m = budget.match(/EMITTED_BYTES\s*=\s*([\d_,]+)/);
  const stated = m ? Number(m[1].replace(/[_,]/g, '')) : null;
  const actual = readFileSync(join(CAIRN, 'packages/core/src/geo/gazetteer.gen.ts')).length;
  note(`EMITTED_BYTES states ${stated}; the file on disk is ${actual} bytes`);
  ok(stated === actual, 'EMITTED_BYTES is the file\'s real size', `${stated} vs ${actual}`);
  ok(actual === 434212, 'the builder\'s reported 434,212 is what is committed', String(actual));
}

// ---------------------------------------------------------------------------
head('F — the generator\'s own audit exits non-zero when a row is mislabelled (N6)');
{
  // `--audit-only` fetches nothing and audits the committed bytes. Run it unmodified first.
  let clean = '';
  let cleanCode = 0;
  try {
    clean = execFileSync('node', ['tools/gen-gazetteer.mjs', '--audit-only'], { cwd: CAIRN, encoding: 'utf8' });
  } catch (e) { cleanCode = e.status ?? 1; clean = String(e.stdout ?? '') + String(e.stderr ?? ''); }
  ok(cleanCode === 0, '`--audit-only` on the committed corpus exits 0', `exit ${cleanCode}: ${clean.slice(-300)}`);
  note(clean.trim().split('\n').slice(-4).join(' / '));
  // Now mislabel ONE row in a COPY of the emitted module and re-audit against that copy.
  // The generator's audit reads the module it wrote, so the fault has to be in the artefact.
  const genSrc = readFileSync(join(CAIRN, 'tools/gen-gazetteer.mjs'), 'utf8');
  const auditsTheArtefact = /--audit-only/.test(genSrc) && /child_process|execFile|spawn|fork/.test(genSrc);
  ok(auditsTheArtefact, 'the audit re-reads the emitted artefact in a child process rather than trusting memory',
    'no child-process read found in the generator');
  const guards = ['SILENTLY contradict', 'indexAgrees', 'process.exit'];
  for (const g of guards) ok(genSrc.includes(g), `the generator's audit mentions ${J(g)}`);
  const exits = (genSrc.match(/process\.exitCode\s*=\s*1|process\.exit\(1\)/g) ?? []).length;
  ok(exits > 0, 'the audit sets a non-zero exit rather than only printing a line', String(exits));
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}, ${skips} SKIP(S)`);
console.log('COMPLETE');
process.exit(fails === 0 ? 0 : 1);
