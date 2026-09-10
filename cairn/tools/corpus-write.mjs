/**
 * **The corpus is written by REPLACEMENT, never by delete-then-write** — ARCHITECTURE §8.4 A-94
 * Part 6 / ROADMAP `I-32` part 4, QA **R68-9**.
 *
 * The generator used to `rmSync` every `.json` under `packages/core/src/geo/gazetteer/` and *then*
 * write 963 documents into the hole it had just made. **That directory is the artefact of record**
 * (A-90 clause 1): nobody, including us, can rebuild it from source, so an interrupted run left an
 * empty or half-written corpus recoverable only from git — and a `git checkout` is a recovery
 * step, not a property of the tool.
 *
 * The shape here is the one A-90's own reasoning asks for: **the new corpus is built completely,
 * in a sibling directory, before the old one stops existing.** The swap is two renames within one
 * parent directory. At every point at which this function can be interrupted, one complete corpus
 * is reachable — the old one before the swap, the new one after it.
 *
 * It lives in its own module, rather than inside `gen-gazetteer.mjs`, for one reason: **an
 * injected fault has to be executable.** `gen-gazetteer.mjs` runs `main()` on import and streams
 * 625 MB of pinned dumps, so nothing in `node --test` can reach the write path inside it.
 * `packages/core/test/gazetteerArtefact.test.ts` imports this module, throws from `beforeSwap`
 * over a temp directory, and asserts the old corpus is still complete — which is `I-32`'s fault
 * **N8**, executed rather than greppped for.
 */
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Replace `dir`'s contents with `files`, atomically enough that no interruption is observed as a
 * missing or partial corpus.
 *
 * @param {string} dir           the corpus directory, replaced whole
 * @param {ReadonlyArray<{ name: string, text: string }>} files  every file the new corpus contains
 * @param {{ beforeSwap?: () => void }} [hooks]  fault injection point; production passes nothing
 * @returns {{ written: number, removed: string[] }} what was written, and the stale files dropped
 */
export function writeCorpusAtomically(dir, files, hooks = {}) {
  const staging = `${dir}.staging`;
  const previous = `${dir}.previous`;
  rmSync(staging, { recursive: true, force: true });
  rmSync(previous, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  for (const f of files) writeFileSync(join(staging, f.name), f.text);

  // Everything above is reversible by deleting one directory nobody reads. Everything below is
  // two renames. The fault hook sits exactly here because this is the last moment at which the
  // old corpus is still the corpus.
  hooks.beforeSwap?.();

  let existing = null;
  try {
    existing = readdirSync(dir);
  } catch {
    existing = null; // no corpus yet — a first build
  }
  if (existing !== null) {
    renameSync(dir, previous);
    renameSync(staging, dir);
    rmSync(previous, { recursive: true, force: true });
  } else {
    renameSync(staging, dir);
  }
  const kept = new Set(files.map((f) => f.name));
  return {
    written: files.length,
    removed: (existing ?? []).filter((n) => !kept.has(n)).sort(),
  };
}
