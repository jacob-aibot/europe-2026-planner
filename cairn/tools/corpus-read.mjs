/**
 * **The previously committed corpus is read HERE, and a corpus that does not read is a FINDING** —
 * ARCHITECTURE §8.4 **A-90** clause 3 (the row-level diff) and **A-94** Part 10 (the named-set
 * gate), QA **R69-1** (MAJOR).
 *
 * ## What was wrong
 *
 * `gen-gazetteer.mjs` used to open its diff with a bare catch:
 *
 * ```js
 * try { previous = readCommittedCorpus().rows; }
 * catch { return null; }   // no previous corpus — a first build, and there is nothing to diff.
 * ```
 *
 * and the gate opened with `if (diff === null) return;`. **A bare `catch` reinterprets any read
 * failure as a first build**, and the gate treats a first build as nothing to check — so
 * **anything** that stopped the previous corpus being read silently disabled *both* A-90 clause
 * 3's row-level diff *and* A-94 Part 10's named-set gate, and the run **wrote the corpus, wrote
 * the manifest and exited 0**. Executed by the breaker: one edited field in one shard of a
 * 963-document corpus, one real generator run, *"no previously committed corpus to diff against
 * (first build)"*, no named-set line at all, corpus written.
 *
 * Three ways in, none of them adversarial:
 *
 *  1. **the corpus directory is absent** — exactly what an interruption between
 *     `corpus-write.mjs`'s two renames leaves, which is the one interruption point fault **N8**
 *     does not cover, because `beforeSwap` fires before the first rename;
 *  2. **a shard is truncated or unparseable**;
 *  3. **a shard's `s` disagrees with `meta.json`'s `$sourceSha256`**, which makes the generator's
 *     own decoder throw.
 *
 * **The asymmetry was the finding.** The source log's stop-and-report, added in the same commit,
 * fails **closed** — *"a missing, empty or unparseable log is a FINDING, not a condition to repair
 * silently."* The corpus's gates failed **open**, on precisely the condition under which an
 * unreviewed change to the artefact of record is most likely and least visible. A-90 clause 1's
 * whole premise is that **nobody, including us, can rebuild this corpus**.
 *
 * ## What a genuine first build is
 *
 * **A distinguishable state, not "any exception while reading":** the corpus directory is absent
 * or empty **and no manifest golden sits beside it**. The manifest
 * (`fixtures/golden/gazetteer-manifest.json`, A-94 Part 6 item 2) is written by the same run that
 * writes the corpus, so a repository that ships one and cannot read the other is **broken, not
 * new**. Everything else stops and reports, writing nothing.
 *
 * It lives in its own module, rather than inside `gen-gazetteer.mjs`, for the reason
 * `corpus-write.mjs` does: **an injected fault has to be executable**, and `gen-gazetteer.mjs`
 * runs `main()` on import and streams 625 MB of pinned dumps, so nothing under `node --test` can
 * reach a function inside it. `packages/core/test/gazetteerArtefact.test.ts` runs all four states
 * over a temp directory — which is also A-90 clause 1's own rule, that no test may require the
 * generator to run.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read the previously committed corpus, or decide — on evidence — that there is not one yet.
 *
 * Pure but for the file system. Returns whatever `read()` returns, or `null` **only** on a genuine
 * first build. **Throws** on every other way of not having a previous corpus: the caller is
 * expected to let that reach the top and stop the run.
 *
 * @template T
 * @param {object} args
 * @param {string} args.corpusDir   the corpus directory — the artefact of record
 * @param {string} args.witnessPath a file the same run always writes beside the corpus; its
 *   presence is what says a corpus is EXPECTED here (the manifest golden)
 * @param {() => T} args.read       reads and decodes the committed corpus; may throw
 * @returns {T | null} the previous corpus, or `null` for a genuine first build
 */
export function readPreviousCorpus({ corpusDir, witnessPath, read }) {
  const stop = (why) => new Error(
    `${why}\n  packages/core/src/geo/gazetteer/ is the ARTEFACT OF RECORD — nobody, including us, ` +
    'can rebuild it from source (§8.4 A-90 clause 1) — and a run that cannot read the previously ' +
    'committed corpus cannot compute A-90 clause 3\'s row-level diff or A-94 Part 10\'s named-set ' +
    'gate. A run that cannot check what it is about to change STOPS AND REPORTS, writing nothing ' +
    '(QA R69-1). This is NOT a first build: a first build has no corpus AND no manifest golden ' +
    'beside it. Restore the corpus from git, or if this really is a fresh tree, remove the ' +
    'manifest golden too and say so in the commit.',
  );

  let listing;
  try {
    listing = readdirSync(corpusDir);
  } catch {
    listing = []; // absent directory — an empty corpus, which may or may not be a first build.
  }
  if (listing.length === 0) {
    if (!existsSync(witnessPath)) return null; // genuine first build: no corpus, no witness.
    throw stop(
      `the corpus directory ${corpusDir} is absent or empty, and the manifest golden ${witnessPath} ` +
        'is not.',
    );
  }

  try {
    return read();
  } catch (err) {
    throw stop(`the previously committed corpus does not read: ${err.message}`);
  }
}

/** The corpus's own presence test, exported so a caller need not re-spell `meta.json`. */
export function corpusExists(corpusDir) {
  return existsSync(join(corpusDir, 'meta.json'));
}
