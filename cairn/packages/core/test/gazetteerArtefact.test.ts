/**
 * **ROADMAP `I-32` parts 3 and 4 — ARCHITECTURE §8.4 A-94 Parts 5 and 6, read with A-90 whole.
 * QA R68-3, R68-4, R68-9, BUILD-NOTES KD-127.**
 *
 * `packages/core/src/geo/gazetteer/` is **the artefact of record**: GeoNames rebuilds every dump
 * daily, retains one day of `modifications`/`deletes` and archives nothing, so **nobody, including
 * us, can rebuild this corpus from source** (A-90 clause 1). Everything asserted here is asserted
 * against the committed bytes, offline.
 *
 * Three properties, each of which was claimed by a mechanism that could not hold it:
 *
 * 1. **Append-only is a claim about the PAST, and the past must be pinned by something the writer
 *    cannot rewrite** (A-94 Part 5 clause 1). `gazetteer-source-log.json` chains each entry to the
 *    previous one for the same source, and that chain is **provenance, not a witness**: it is
 *    green for a tail truncation, green for a heads-only rewrite — byte-for-byte what the old
 *    re-seed produced — and it was vacuous at five entries and zero links. The witness is the
 *    literal below, in a test file **the generator does not write**, asserted as a **prefix** so a
 *    genuine `--repin` appends and stays green.
 * 2. **A number only a 625 MB run can produce goes into a committed golden the offline tests
 *    read** (A-94 Part 6, KD-127). `I-31`'s four audit numbers were asserted against the
 *    generator's *source text*, which catches a deleted line and cannot catch a line printing a
 *    wrong number. They are now in the refusals golden's header, derived there from the lists
 *    beside them, and re-derived here.
 * 3. **The corpus has a digest over its own bytes.** A length-preserving hand edit to a shipped
 *    row's population and coordinate passed every test, the byte total and the row count — the
 *    corpus was guarded off one field (`indexSays`) and not the others.
 *    `fixtures/golden/gazetteer-manifest.json` is one sha256, row count and byte length per file,
 *    recomputed here from disk. **It is a golden and deliberately not `meta.json`**: 967 hashes
 *    would be ~70 KB on a file every client fetches, which A-82's byte discipline forbids for a
 *    check no client performs. **It raises the cost of a silent edit from one file to two that
 *    must agree; it does not make one impossible, and nothing here pretends otherwise.** The
 *    guarantee is still A-90 clause 1's — 967 reviewable, diffable documents in git.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { COUNTRY_INDEX } from '../src/index.ts';
import { writeCorpusAtomically } from '../../../tools/corpus-write.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(HERE, '..', 'src', 'geo', 'gazetteer');
const GOLDEN = resolve(HERE, '..', '..', '..', 'fixtures', 'golden');
const sha256 = (buf: Buffer | string): string => createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------------------------
// A-94 Part 5 — the append-only witness, in a file the generator cannot write.
// ---------------------------------------------------------------------------------------------

type LogEntry = { fetched: string; source: string; bytes: number; sha256: string; previousSha256: string | null };
type SourceLog = { $what: string; entries: LogEntry[] };
const sourceLog = (): SourceLog =>
  JSON.parse(readFileSync(resolve(GOLDEN, 'gazetteer-source-log.json'), 'utf8')) as SourceLog;

/**
 * **The committed log's history, as a literal.** Extending this list is the reviewed act; a run
 * that shortens, reorders or rewrites the past reddens.
 *
 * **A monotonic entry count is not enough** — it survives a heads-only rewrite that keeps the
 * count, which is exactly what the old ordinary-path re-seed produced — and a count is the shape
 * §0 position 12 (a) rejects.
 *
 * **ALL FIVE FIELDS OF EVERY ENTRY, not three (QA R69-6).** This literal used to carry
 * `{fetched, source, sha256}`, and `bytes` and `previousSha256` could then be rewritten anywhere
 * in the committed history with every test green — executed by the breaker. A-94 Part 5 clause 1
 * keeps the chain **in the file as provenance** and A-90 clause 2 publishes **each source's byte
 * length** beside the hash *"so a mismatch can be diagnosed rather than merely detected"*: two
 * claims about the past that nothing pinned. The witness pins the whole entry, so the one thing
 * the chain still claims to do cannot be silently falsified. *(A-94 Part 5 clause 2's own
 * sentence still names the three-tuple; correcting it is the architect's, and the wider literal
 * is not narrowed by the narrower sentence.)*
 *
 * **When a `--repin` appends entries, add them to the END of this list in the same commit** — all
 * five fields, including the `previousSha256` the appended entry replaces. That is A-90 clause 3's
 * reviewed act, and A-94 Part 11 residue 5 names the failure if it is skipped: a re-pin that
 * appends and does not extend this literal is green and leaves the newest entries unpinned.
 */
type WitnessRow = readonly [string, string, number, string, string | null];
const COMMITTED_LOG: ReadonlyArray<WitnessRow> = [
  ['2026-09-10', 'allCountries', 421190719, '8864727474760039d91b60137fbe81fe203ae399a13289be4cf21afd0ebec826', null],
  ['2026-09-10', 'alternateNames', 204011299, '14386dea2d574f807d6e69fa269531ea427db2f61ebd59cf9b4d0e19e1aa40cf', null],
  ['2026-09-10', 'admin1', 151536, '590651498043f674accda2b7f46d21286cda0e290b02f8561c5005eee9a5448c', null],
  ['2026-09-10', 'countryInfo', 31678, '93bafc525813f22e4711ff9ed6d626343094ce48c26388dc7c49189b3d7d5512', null],
  ['2026-09-10', 'admin0', 13287234, '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255', null],
];

/** Every field of every entry, in order — the shape the witness compares. */
const witnessRows = (entries: readonly LogEntry[]): unknown[][] =>
  entries.map((e) => [e.fetched, e.source, e.bytes, e.sha256, e.previousSha256]);

/**
 * **N4, injected — restore the seed branch the generator used to carry** (a bare `catch {}` around
 * the parse, re-seeding whenever the file was missing, empty or unparseable, on the ORDINARY write
 * path): the prefix assertion reddens naming the first entry that moved, as soon as the committed
 * history is longer than one re-pin. The generator's own stop-and-report is what makes that branch
 * unreachable, and it was executed rather than asserted here (**KD-130**, which also records why
 * this assertion cannot redden on a five-entry history: a re-seed of THAT history is byte-identical
 * to it, and the witness becomes the instrument A-94 designed at the first re-pin).
 */
test('A-94 Part 5: the source log STARTS WITH the committed history, entry for entry', () => {
  const got = sourceLog().entries;
  assert.ok(
    got.length >= COMMITTED_LOG.length,
    `the source log has ${got.length} entries and the committed history has ${COMMITTED_LOG.length}. ` +
      'A-94 Part 5: an append-only claim is a claim about the past, and the past may not shorten.',
  );
  assert.deepEqual(
    witnessRows(got.slice(0, COMMITTED_LOG.length)),
    COMMITTED_LOG.map((e) => [...e]),
    'the source log\'s history has changed. A truncation, a reorder or a re-seed reddens here — ' +
      'this literal is in packages/core/test/, which the generator does not write, and it is a ' +
      'PREFIX assertion so a genuine --repin appends and stays green.',
  );
});

/**
 * **R69-6, EXECUTED rather than argued: the breaker's own mutation, run as a test case.** The
 * witness used to pin three of the entry's five fields, so rewriting `bytes` and `previousSha256`
 * anywhere in the committed history was green. Here that rewrite is applied to a COPY of the
 * committed entries and the witness is required to see it — which is the difference between a
 * literal that got wider and a literal that is known to bite.
 */
test('A-94 Part 5: rewriting bytes or previousSha256 in the committed history reddens (R69-6)', () => {
  const entries = sourceLog().entries.slice(0, COMMITTED_LOG.length).map((e) => ({ ...e }));
  const pinned = COMMITTED_LOG.map((e) => [...e]);
  assert.deepEqual(witnessRows(entries), pinned, 'the control failed: the unmutated copy already differs');
  for (const mutate of [
    (e: LogEntry) => { e.bytes = 1; },
    (e: LogEntry) => { e.previousSha256 = 'f'.repeat(64); },
  ]) {
    const copy = entries.map((e) => ({ ...e }));
    mutate(copy[0]!);
    assert.notDeepEqual(
      witnessRows(copy),
      pinned,
      'a rewritten bytes/previousSha256 in the committed history is invisible to the witness (R69-6)',
    );
  }
});

/**
 * **The second half, and it exists because a prefix test alone would be green for `I-32`'s fault
 * N5** — dropping the newest entry for one source keeps the file a prefix of itself.
 *
 * Every source the corpus was built from has an entry carrying **the sha256 in use**, and *in
 * use* is derived rather than copied: `meta.json`'s `$sourceSha256` is sha256 over the five
 * source checksums and the country index's own hash (R67-7), so re-combining the newest log entry
 * per source with `COUNTRY_INDEX` must reproduce it exactly. Drop the newest entry for a source
 * and the older sha goes into the combination and the digest no longer matches.
 */
test('A-94 Part 5: the log\'s newest sha per source RE-DERIVES the corpus\'s own $sourceSha256', () => {
  const meta = JSON.parse(readFileSync(resolve(CORPUS, 'meta.json'), 'utf8')) as Record<string, string>;
  const newest = new Map<string, string>();
  for (const e of sourceLog().entries) newest.set(e.source, e.sha256);
  const indexSha = sha256(JSON.stringify(COUNTRY_INDEX));
  assert.equal(indexSha, meta['$countryIndexSha256'], 'the shipped country index is not the one meta.json names');
  const combined = sha256([
    ...[...newest.keys()].sort().map((k) => `${k}:${newest.get(k)}`),
    `countryIndex:${indexSha}`,
  ].join('\n'));
  assert.equal(
    combined,
    meta['$sourceSha256'],
    'the source log\'s newest entries do not combine to the corpus\'s own $sourceSha256. Either ' +
      'an entry for a source in use is missing (N5: the newest entry was dropped), or the log ' +
      'describes a build this corpus is not.',
  );
});

/**
 * **A-94 Part 5 clause 1 — the `$what` string stops claiming the chain is the witness.** The chain
 * stays in the file as provenance: it says which bytes an entry replaced. It cannot witness its
 * own history, because every truncation and every rewrite produces a *consistent* file.
 */
test('A-94 Part 5: the log says where its witness lives, and does not claim the chain is it', () => {
  const what = sourceLog().$what;
  assert.match(
    what,
    /packages\/core\/test/,
    'the source log does not say where its append-only witness lives. A-94 Part 5 clause 2: it ' +
      'is a prefix literal in a test file, because the generator writes goldens and does not ' +
      'write packages/core/test/.',
  );
  assert.equal(
    /a test walks the previousSha256 chain/.test(what),
    false,
    'the source log still claims a test walks the previousSha256 chain as its append-only ' +
      'witness. That test is GREEN for a tail truncation and GREEN for a heads-only rewrite ' +
      '(A-90 Part 5 residue 2, fired; QA R68-3).',
  );
  assert.match(
    what,
    /--repin/,
    'the source log does not say it is written only under --repin (A-94 Part 5 clause 3)',
  );
});

/**
 * **A-94 Part 5 clause 3 — the ordinary path does not write the log at all.** A run that finds it
 * missing, empty or unparseable **stops and reports**: the artefact of record is incomplete and
 * that is a finding, not a condition to repair silently. Seeding happened once, in the increment
 * that created the file, and never again.
 *
 * Asserted over the generator's source, which is the weaker instrument KD-127 names — the strong
 * form is the executed run, and it WAS executed: the log was deleted, the generator run with no
 * `--repin`, and it stopped before building, writing nothing (BUILD-NOTES `I-32`).
 */
/**
 * **Every call site, wherever on its line it sits — QA R69-6's sibling, R69-2.**
 *
 * This used to be `/^\s*(?:if \(repin\) )?writeSourceLog\(/gm` counted to 1: a regex anchored to
 * the START of a line, so a second call that does not begin one was invisible to **both** halves
 * of it. `if (repin) writeSourceLog(…); else writeSourceLog(…, []);` on one line restored the
 * ordinary-path write with the test green, executed by the breaker.
 *
 * The instrument is still a grep — KD-127's weakness, and the generator streams 625 MB on import
 * so nothing under `node --test` can call it — but it is a grep with **no anchor**: it finds every
 * occurrence of the call, classifies each by the sixteen characters in front of it, and requires
 * exactly one declaration and exactly one call, that call prefixed by `if (repin) `. A site
 * anywhere on any line is a site.
 */
const repinOnlyWriteFailures = (gen: string): string[] => {
  const sites = [...gen.matchAll(/(.{0,16})\bwriteSourceLog\s*\(/g)]
    .map((m) => ({ before: m[1] ?? '', at: m.index ?? 0 }));
  const declarations = sites.filter((c) => /function\s*$/.test(c.before));
  const calls = sites.filter((c) => !/function\s*$/.test(c.before));
  const bad: string[] = [];
  if (declarations.length !== 1) bad.push(`writeSourceLog is declared ${declarations.length} times, not once`);
  if (calls.length !== 1) {
    bad.push(
      `writeSourceLog is CALLED ${calls.length} times, not once. A-94 Part 5 clause 3: the log is ` +
        'written ONLY under --repin. Sites: ' + calls.map((c) => JSON.stringify(c.before.trimStart())).join(', '),
    );
  }
  for (const c of calls) {
    if (!/if \(repin\)\s*$/.test(c.before)) {
      bad.push(`a writeSourceLog call is not gated on --repin: …${JSON.stringify(c.before)}writeSourceLog(`);
    }
  }
  if (/catch \{ \/\* first write \*\/ \}/.test(gen)) {
    bad.push('the bare catch that re-seeded the log on an unparseable read is back (QA R68-3)');
  }
  return bad;
};

test('A-94 Part 5 clause 3: the generator writes the source log only under --repin', () => {
  const gen = readFileSync(resolve(HERE, '..', '..', '..', 'tools', 'gen-gazetteer.mjs'), 'utf8');
  assert.deepEqual(repinOnlyWriteFailures(gen), [], `\n  ${repinOnlyWriteFailures(gen).join('\n  ')}\n`);
});

/**
 * **R69-2, EXECUTED: the breaker's own defeat, run as a test case.** The mutation is the exact
 * one that was green — a second call on the same line as the gated one — plus two neighbours a
 * line-anchored grep also missed. Each must be seen; and the unmutated source must not be.
 */
test('A-94 Part 5 clause 3: a second writeSourceLog call ANYWHERE on a line is seen (R69-2)', () => {
  const gen = readFileSync(resolve(HERE, '..', '..', '..', 'tools', 'gen-gazetteer.mjs'), 'utf8');
  const gated = '  if (repin) writeSourceLog(sourceLog, fetched, moved);';
  assert.ok(gen.includes(gated), 'the gated call site has moved; this mutation no longer applies');
  const mutants: ReadonlyArray<readonly [string, string]> = [
    ['the breaker\'s own: an else arm on the same line',
      `${gated} else writeSourceLog(sourceLog, fetched, []);`],
    ['a trailing call after a statement on one line',
      `${gated} if (!repin) { writeSourceLog(sourceLog, fetched, []); }`],
    ['an ungated call indented behind another statement',
      `${gated}\n  if (true) writeSourceLog(sourceLog, fetched, []);`],
  ];
  for (const [what, replacement] of mutants) {
    const bad = repinOnlyWriteFailures(gen.replace(gated, replacement));
    assert.notDeepEqual(bad, [], `the pin is blind to ${what} (QA R69-2)`);
  }
});

// ---------------------------------------------------------------------------------------------
// A-94 Part 6 (a) — the manifest: a digest over the artefact's own bytes.
// ---------------------------------------------------------------------------------------------

type ManifestFile = { file: string; bytes: number; rows: number; sha256: string };
type Manifest = { fileCount: number; totalBytes: number; totalRows: number; files: ManifestFile[] };
const manifest = (): Manifest =>
  JSON.parse(readFileSync(resolve(GOLDEN, 'gazetteer-manifest.json'), 'utf8')) as Manifest;

/**
 * **The audit, as a function of a directory and a manifest, so the mutant can be executed over a
 * temp directory rather than over the artefact of record.**
 *
 * **It lists the DIRECTORY, not `*.json` in it — QA R69-5.** This used to be
 * `readdirSync(CORPUS).filter((n) => n.endsWith('.json'))`, which made it a digest over the
 * corpus's JSON *documents* and left the corpus *directory* unaudited: a `.mjs` parked inside
 * `packages/core/src/geo/gazetteer/` was invisible to it. That matters because round 67's **M8**
 * is still open — the A-78 shard-map guard passes a `.mjs` in that directory whose name appears in
 * a doc comment — and a tripwire that reads as though it closes an old hole and does not is worse
 * than no tripwire. **Every byte of every file in the directory**, with no qualifier: a file that
 * is not a JSON document is covered by its sha256 and byte length and carries `rows: 0`.
 */
const manifestMismatches = (dir: string, doc: Manifest): string[] => {
  const wrong: string[] = [];
  const onDisk = readdirSync(dir).sort();
  const named = doc.files.map((f) => f.file);
  if (JSON.stringify(named) !== JSON.stringify(onDisk)) {
    wrong.push(
      'the manifest and the corpus DIRECTORY do not hold the same files. ' +
        `only on disk: [${onDisk.filter((n) => !named.includes(n)).join(', ')}]; ` +
        `only in the manifest: [${named.filter((n) => !onDisk.includes(n)).join(', ')}]`,
    );
  }
  for (const f of doc.files) {
    let bytes: Buffer;
    try {
      bytes = readFileSync(resolve(dir, f.file));
    } catch {
      wrong.push(`${f.file}: named by the manifest and not on disk`);
      continue;
    }
    const got = sha256(bytes);
    if (got !== f.sha256) wrong.push(`${f.file}: sha256 ${got}, manifest says ${f.sha256}`);
    if (bytes.length !== f.bytes) wrong.push(`${f.file}: ${bytes.length} bytes, manifest says ${f.bytes}`);
    if (rowsIn(bytes) !== f.rows) wrong.push(`${f.file}: ${rowsIn(bytes)} rows, manifest says ${f.rows}`);
  }
  return wrong;
};

/** A shard's own row array, meta's declared total, or 0 for a file that is not a corpus document. */
const rowsIn = (bytes: Buffer): number => {
  let doc: { r?: unknown[]; rows?: number };
  try {
    doc = JSON.parse(bytes.toString('utf8')) as { r?: unknown[]; rows?: number };
  } catch {
    return 0;
  }
  return Array.isArray(doc.r) ? doc.r.length : Number(doc.rows ?? 0);
};

/**
 * **N6, injected: a length-preserving edit to one shipped row's population** → this reddens
 * **naming the shard**. The control from R68-4 stays: the same edit to the row's *country code* is
 * caught by the `indexSays` cross-check, which is one field of one row — this covers every byte of
 * every file **in the corpus directory**, JSON or not (R69-5).
 */
test('A-94 Part 6: the manifest is one sha256 per corpus file, recomputed from disk', () => {
  const wrong = manifestMismatches(CORPUS, manifest());
  assert.deepEqual(wrong, [], `\n  ${wrong.slice(0, 12).join('\n  ')}\n`);
});

/**
 * **R69-5, EXECUTED: the breaker's own plant, run over a temp corpus rather than over the artefact
 * of record.** A `.mjs` parked inside the corpus directory was invisible while the audit filtered
 * on `.json`; the `.json` control was seen. Both are asserted here, against a synthetic corpus of
 * two files, so the property is pinned by something other than the shape of today's directory.
 */
test('A-94 Part 6: a NON-JSON file planted in the corpus directory reddens (R69-5)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cairn-manifest-'));
  const shard = '{"k":"a","r":["x"]}\n';
  writeFileSync(join(dir, 'a.json'), shard);
  const doc: Manifest = {
    fileCount: 1,
    totalBytes: Buffer.byteLength(shard),
    totalRows: 1,
    files: [{ file: 'a.json', bytes: Buffer.byteLength(shard), rows: 1, sha256: sha256(shard) }],
  };
  assert.deepEqual(manifestMismatches(dir, doc), [], 'the control failed: a clean corpus already mismatches');

  writeFileSync(join(dir, 'loader.mjs'), 'export const x = 1;\n');
  const planted = manifestMismatches(dir, doc);
  assert.notDeepEqual(planted, [], 'a .mjs planted INSIDE the corpus directory is invisible to the manifest (R69-5)');
  assert.match(planted[0] ?? '', /loader\.mjs/, 'the mismatch does not name the planted file');
  rmSync(dir, { recursive: true, force: true });

  // …and the generator would cover it: its own listing is the directory, unfiltered.
  const gen = readFileSync(resolve(HERE, '..', '..', '..', 'tools', 'gen-gazetteer.mjs'), 'utf8');
  assert.equal(
    /readdirSync\(CORPUS_DIR\)\.filter\(\(n\) => n\.endsWith\('\.json'\)\)/.test(gen),
    false,
    'writeManifest still filters the corpus directory on .json (QA R69-5)',
  );
});

/** The manifest's own totals are the sums of its own rows — a header a file cannot check is a hole. */
test('A-94 Part 6: the manifest\'s totals are its own file list\'s sums', () => {
  const doc = manifest();
  assert.equal(doc.fileCount, doc.files.length, 'fileCount is not the length of files');
  assert.equal(
    doc.totalBytes,
    doc.files.reduce((n, f) => n + f.bytes, 0),
    'totalBytes is not the sum of the manifest\'s own byte lengths',
  );
  const shardRows = doc.files.filter((f) => f.file !== 'meta.json').reduce((n, f) => n + f.rows, 0);
  assert.equal(doc.totalRows, shardRows, 'totalRows is not the sum of the shards\' own row counts');
  const meta = doc.files.find((f) => f.file === 'meta.json');
  assert.ok(meta, 'the manifest does not cover meta.json');
  assert.equal(
    meta.rows,
    JSON.parse(readFileSync(resolve(CORPUS, 'meta.json'), 'utf8')).rows,
    'the manifest\'s meta.json row count is not the corpus row total meta.json declares',
  );
});

// ---------------------------------------------------------------------------------------------
// A-94 Part 6 (b) / KD-127 — the four audit numbers, in a golden rather than in a grep.
// ---------------------------------------------------------------------------------------------

type Audit = {
  keptByS: string[];
  keptByPC: string[];
  sovereignPairsUsed: string[];
  sovereignPairsAvailable: number;
  classPExempt: { rows: number; groups: Array<{ key: string; rows: number }> };
};
type Refusals = {
  audit: Audit;
  refusals: Array<{ id: string; name: string; statedCode: string | null; reason: string; cls: string }>;
};
const refusals = (): Refusals =>
  JSON.parse(readFileSync(resolve(GOLDEN, 'gazetteer-refusals.json'), 'utf8')) as Refusals;

/**
 * **The two inert subtractions, PUBLISHED rather than asserted against the generator's source.**
 * A-93 Part 3: both are predicted zero on this corpus and both stay in the rule, because the
 * rule's sentence is *"neither the country it states, nor the country we attribute it to, nor the
 * sovereign of either"* and a rule that does not say what it means is the next round's finding.
 * **A non-zero count is a result to REPORT** — so the golden carries the rows, not a number, and
 * the number is the rows' length.
 */
test('KD-127: the S and P(C) subtractions are published as (empty) row lists, not as counts', () => {
  const { keptByS, keptByPC } = refusals().audit;
  assert.deepEqual(keptByS, [], 'rows kept ONLY by the S subtraction — A-93 Part 3 predicts none');
  assert.deepEqual(keptByPC, [], 'rows kept ONLY by P(C) beyond P(S) — A-93 Part 3 predicts none');
});

/**
 * **The six sovereign pairs clause 4 actually used, cross-checked against the corpus itself.**
 * A-93 Part 3(b): the layer names a distinct sovereign for **41** codes and exactly six are
 * load-bearing here. The politically loaded pairs it also carries — `PS→IL`, `HK→CN`, `MO→CN`,
 * `GI→GB`, `FK→GB`, `IO→GB`, `NC→FR` — are measured inert, and one becoming load-bearing arrives
 * as a golden diff rather than silently.
 *
 * The cross-check is what makes this a re-derivation rather than a header compared with itself:
 * **the domain of the used pairs is exactly the set of country codes carried by the twelve terrain
 * rows the subtraction keeps**, read out of the committed corpus.
 *
 * **N7, injected: change one header number** → the pair count no longer matches the named list,
 * or the domain no longer matches the corpus, and the assertion names the number.
 */
test('KD-127: the sovereign pairs used are named, counted from the list, and match the corpus', () => {
  const { sovereignPairsUsed, sovereignPairsAvailable } = refusals().audit;
  assert.deepEqual(
    [...sovereignPairsUsed].sort(),
    ['AX->FI', 'FO->DK', 'GG->GB', 'JE->GB', 'NF->AU', 'TF->FR'],
    'the pairs clause 4 used are not A-93 Part 3(b)\'s own six',
  );
  assert.equal(sovereignPairsAvailable, 41, 'the layer names a distinct sovereign for 41 codes (A-93 Part 3(b))');
  assert.ok(
    sovereignPairsUsed.length < sovereignPairsAvailable,
    'every pair the layer names is load-bearing — the audit has stopped distinguishing them',
  );
});

/**
 * **The population the class restriction exempts, countable and nameable** (A-93 Part 3(a)):
 * 139 class-`P` rows in 56 groups whose `cc2` names a country that is neither the one they state
 * nor the one they ship under, and which keep shipping under their stated code. **That is not a
 * claim that their attribution is right; it is a claim that this ruling does not touch it.**
 *
 * **The predicate is A-89's `X \ {S, C}`, not A-93 Part 2's `X \ {S, C, P(S), P(C)}` — QA
 * R69-4.** This docstring named the wrong one, and the wrong one is a different number: measured,
 * `X \ {S, C, P(S), P(C)}` yields **84**, because `FO+DK` (16) and `AX+FI` (15) — two of the four
 * largest groups asserted below — are kept by the **sovereign** subtraction rather than by the
 * class restriction. The generator groups on A-89's form deliberately and says so in place
 * (`gen-gazetteer.mjs`, clause 4's exempt block): *"it is the cost of the class restriction, and
 * the sovereign subtraction is the other half of the rule, priced separately."* **139 was always
 * right; the sentence describing how to get it was not**, and a future re-derivation from the
 * sentence gets 84.
 *
 * The header's total is **derived from the groups beside it**, so an edited number reddens (N7).
 * The four largest groups are stated: A-93 Part 3(a)'s own `FO+DK` 16, `AX+FI` 15, `AR+AQ` 11,
 * `EH+MA` 8.
 */
test('KD-127: the class-P exempt total is the sum of its own published groups', () => {
  const { classPExempt } = refusals().audit;
  assert.equal(
    classPExempt.rows,
    classPExempt.groups.reduce((n, g) => n + g.rows, 0),
    'the exempt total is not the sum of the groups published beside it',
  );
  // **139 in 56, NOT the 141 in 57 A-93 Part 3(a) and ROADMAP `I-32` state — and the difference
  // is A-94's own doing, measured here and disclosed as a build note.** The exempt set is the
  // class-`P` rows for which **A-89's `X \ {S, C}`** is non-empty (R69-4: NOT A-93 Part 2's
  // `X \ {S, C, P(S), P(C)}`, which measures 84). `Atafu Village` and
  // `Nukunonu` are `P/PPLA` with `cc2 = NZ`; `P(TK)` is `null` (the layer carries no feature
  // spelled `TK`), so before this ruling `C` was `null` and `NZ` survived every subtraction and
  // both rows were exempt. **Under A-94 `C` is `NZ`**, the `C` subtraction reaches them, and they
  // leave — taking the two-row `TK+NZ` group with them (**KD-128**). 141 - 2 = 139, 57 - 1 = 56. The five `CC`
  // rows never entered this set: **all five carry an EMPTY `cc2`** (A-94 Part 2's sentence says
  // three do; four of them are non-`P` and all five are empty), so clause 4 never sees them.
  assert.equal(classPExempt.rows, 139, 'A-93 Part 3(a) as A-94 leaves it: 139 class-P rows are exempt');
  assert.equal(classPExempt.groups.length, 56, 'A-93 Part 3(a) as A-94 leaves it: in 56 groups (cc + foreign codes)');
  assert.equal(
    classPExempt.groups.some((g) => g.key.startsWith('TK')),
    false,
    'the TK+NZ exempt group is back: the C subtraction should now reach Atafu Village and ' +
      'Nukunonu, because TK elects NZ',
  );
  assert.deepEqual(
    [...classPExempt.groups].sort((a, b) => b.rows - a.rows || (a.key < b.key ? -1 : 1)).slice(0, 4),
    [{ key: 'FO+DK', rows: 16 }, { key: 'AX+FI', rows: 15 }, { key: 'AR+AQ', rows: 11 }, { key: 'EH+MA', rows: 8 }],
    'the four largest exempt groups are not the ruling\'s own',
  );
});

// ---------------------------------------------------------------------------------------------
// R68-9 — the corpus is replaced, never deleted-then-written. `I-32` fault N8, EXECUTED.
// ---------------------------------------------------------------------------------------------

/**
 * **The generator used to `rmSync` every `.json` and then write 963 documents into the hole.** An
 * interrupted run left an empty or partial corpus recoverable only from git — and the corpus is
 * the artefact of record precisely because it cannot be recovered from anywhere else.
 *
 * This is the fault **executed**, not greppped for: `writeCorpusAtomically` is its own module so a
 * test can reach it, and `beforeSwap` throws at the last moment at which the old corpus is still
 * the corpus. **N8, injected: restore the delete-then-write order** → the surviving-corpus
 * assertion reddens, because the old files are gone before the new ones exist.
 */
test('R68-9: an interrupted write leaves the previous corpus complete', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cairn-corpus-'));
  const corpus = join(dir, 'gazetteer');
  mkdirSync(corpus);
  const before = [
    { name: 'meta.json', text: '{"v":1,"rows":2}\n' },
    { name: 'a.json', text: '{"k":"a","r":[1]}\n' },
    { name: 'b.json', text: '{"k":"b","r":[2]}\n' },
  ];
  for (const f of before) writeFileSync(join(corpus, f.name), f.text);

  const next = [
    { name: 'meta.json', text: '{"v":1,"rows":3}\n' },
    { name: 'a.json', text: '{"k":"a","r":[1,9]}\n' },
  ];
  assert.throws(
    () => writeCorpusAtomically(corpus, next, { beforeSwap: () => { throw new Error('killed mid-run'); } }),
    /killed mid-run/,
  );
  assert.deepEqual(
    readdirSync(corpus).sort(),
    ['a.json', 'b.json', 'meta.json'],
    'an interrupted write left the corpus directory incomplete',
  );
  assert.deepEqual(
    before.map((f) => readFileSync(join(corpus, f.name), 'utf8')),
    before.map((f) => f.text),
    'an interrupted write changed a file of the previous corpus',
  );

  // And the control: a completed write replaces the corpus whole, stale shards included.
  const result = writeCorpusAtomically(corpus, next);
  assert.equal(result.written, 2);
  assert.deepEqual(result.removed, ['b.json'], 'the stale shard was not reported as removed');
  assert.deepEqual(readdirSync(corpus).sort(), ['a.json', 'meta.json'], 'a stale shard survived the swap');
  assert.equal(readFileSync(join(corpus, 'meta.json'), 'utf8'), next[0].text);
  assert.equal(statSync(corpus).isDirectory(), true);
  rmSync(dir, { recursive: true, force: true });
});

/** The staging and backup directories are not left behind — a sibling of the corpus is a shipped file. */
test('R68-9: the swap leaves no staging or backup directory beside the corpus', () => {
  const parent = resolve(CORPUS, '..');
  const strays = readdirSync(parent).filter((n) => n === 'gazetteer.staging' || n === 'gazetteer.previous');
  assert.deepEqual(strays, [], 'a staging or backup directory survived a generator run');
});
