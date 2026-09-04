/**
 * **A-69 Part 12's standing test-side form**, and its shape is the ruling.
 *
 * > One helper asserting the invariant, called at the end of **every** test in
 * > `generation.test.ts` and `liveness.test.ts` — **not one test per exit**, which is A-69 Part 3's
 * > defect written into a test file.
 *
 * So this is a **wrapper applied by construction** rather than a line each test opts into: `watch`
 * registers every store a fixture builds, `settlingTest` replaces `node:test`'s `test`, and a test
 * added below either file's fixture is covered without anyone remembering to cover it. A suite
 * organised as an enumeration of exits is the thing A-69 exists to stop.
 *
 * The invariant itself was A-69 Part 11's claim, and it is **strengthened at §4.2 A-70 Part 6
 * `G29`**. A-69's form was:
 *
 * > When every promise this store has made has settled, either `state.doc === null`, or
 * > `photos.available !== null`, or `photos.availabilityError !== null`.
 *
 * A-70's is:
 *
 * > When every promise this store has made has settled, either `state.doc === null`, or the
 * > availability triple holds an answer that **no bump has invalidated since it was written**.
 * > Equivalently: `!availabilityUnanswered()` at rest.
 *
 * The disjunction above is now the **weaker consequence** — it cannot see an answer that is
 * present but was written under a sequence a byte write has since bumped, which is the whole of
 * A-70's second disjunct. Both are asserted, weaker first, because the weaker one produces the
 * more legible red.
 *
 * **How the strengthened form is measured.** `availabilityUnanswered` is closure-local to
 * `createStore` and `availabilityAt` is deliberately not state (A-70 Part 5 item 4), so it is
 * asserted **through the boundary that consumes it** rather than by reaching inside: drive one
 * asynchronous store method, which makes site S1 evaluate the predicate on the way out, and
 * assert the boundary issues **no** `present()`. A read appearing there *is*
 * `availabilityUnanswered()` having been true at rest. `reclaimPhotoBytes([])` is the method,
 * chosen because it is the most inert one on the store: with no photo port or no document it is a
 * bare `return`, and otherwise it rewrites `photos.orphans` to the ids it already held.
 *
 * **What this cannot see, stated rather than implied:** it asks the store's own predicate, so a
 * fault that changes the *predicate* — A-70 G26's *"restore `availabilityError === null` as a
 * conjunct"* — leaves it green, and G26/G27 are the criteria that catch that. A fault that
 * changes the *boundary* — G27's *"make `settleAvailability` a no-op"* — reddens it here.
 *
 * Zero dependencies, no DOM — `cairn-constraints` §2 and §5.
 */
import assert from 'node:assert/strict';
import { test as nodeTest } from 'node:test';

import { photosFor } from '../src/index.ts';
import type { Store } from '../src/index.ts';

/** As much of a `PhotoPort` double as the boundary probe needs. */
type ReadCounter = { presentCount: number };

/**
 * Every store built since the current test began, with the photo double it was built over.
 * Top-level `node:test` runs sequentially.
 */
const watched = new Map<Store, ReadCounter | null>();

/**
 * Registers a store with the boundary check. Called once, inside each file's `mk`.
 *
 * `photo` is the port double the store was built over; without it only A-69's weaker disjunction
 * is asserted, because the probe has nothing to count.
 */
export function watch<S extends Store>(store: S, photo?: ReadCounter): S {
  watched.set(store, photo ?? null);
  return store;
}

/** A-70 Part 6 **G29**'s claim, over one store. A-69 Part 11's is the first half. */
export async function assertSettled(store: Store, label: string): Promise<void> {
  const s = store.getState();
  assert.ok(s.doc === null || s.photos.available !== null || s.photos.availabilityError !== null,
    `A-69 Part 11: after ${label} a store settled with a document open, no availability answer and no error — §10.6 property 5's unresolving spinner`);
  if (s.doc !== null) {
    assert.notEqual(photosFor(s, { kind: 'trip' }).phase, 'loading',
      `A-69 Part 11: after ${label} a listing is still 'loading' with nothing in flight`);
  }
  const photo = watched.get(store);
  if (!photo) return;
  const before = photo.presentCount;
  await store.reclaimPhotoBytes([]);
  assert.equal(photo.presentCount, before,
    `A-70 Part 6 G29: after ${label} the settling boundary issued a read, so \`availabilityUnanswered()\` was TRUE at rest — the answer on display was written under a sequence something has since bumped`);
}

/**
 * `node:test`'s `test`, with the invariant asserted over every watched store on the way out.
 *
 * A test that deliberately ends with a port call still parked has not reached the *"every promise
 * has settled"* the claim is about, and says so by passing `settles: false` — which is a
 * **disclosure at the one test that needs it**, not an enumeration the mechanism depends on.
 */
export function settlingTest(
  name: string,
  fn: () => Promise<void> | void,
  opts: { settles?: boolean } = {},
): void {
  nodeTest(name, async () => {
    watched.clear();
    try {
      await fn();
      if (opts.settles === false) return;
      for (const store of [...watched.keys()]) await assertSettled(store, name);
    } finally {
      watched.clear();
    }
  });
}
