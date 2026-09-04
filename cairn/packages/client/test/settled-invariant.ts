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
 * The invariant itself is A-69 Part 11's claim, unchanged from A-68 Part 7:
 *
 * > When every promise this store has made has settled, either `state.doc === null`, or
 * > `photos.available !== null`, or `photos.availabilityError !== null`.
 *
 * Zero dependencies, no DOM — `cairn-constraints` §2 and §5.
 */
import assert from 'node:assert/strict';
import { test as nodeTest } from 'node:test';

import { photosFor } from '../src/index.ts';
import type { Store } from '../src/index.ts';

/** Every store built since the current test began. Top-level `node:test` runs sequentially. */
const watched = new Set<Store>();

/** Registers a store with the boundary check. Called once, inside each file's `mk`. */
export function watch<S extends Store>(store: S): S {
  watched.add(store);
  return store;
}

/** A-69 Part 11's claim, over one store. */
export function assertSettled(store: Store, label: string): void {
  const s = store.getState();
  assert.ok(s.doc === null || s.photos.available !== null || s.photos.availabilityError !== null,
    `A-69 Part 11: after ${label} a store settled with a document open, no availability answer and no error — §10.6 property 5's unresolving spinner`);
  if (s.doc !== null) {
    assert.notEqual(photosFor(s, { kind: 'trip' }).phase, 'loading',
      `A-69 Part 11: after ${label} a listing is still 'loading' with nothing in flight`);
  }
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
      for (const store of watched) assertSettled(store, name);
    } finally {
      watched.clear();
    }
  });
}
