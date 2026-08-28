/**
 * ARCHITECTURE §4.2 rule 6, "Leaving the page is the same case, and the platform will not
 * fully cooperate" — the `apps/web` half of R3-2.
 *
 * ROADMAP F: "Assert the listeners are registered and that the visibility handler calls
 * flush() (jsdom or a spy is enough)". No jsdom here (zero dependencies), so the module
 * takes its targets as arguments and this test hands it two fake ones.
 *
 * **The criterion explicitly does not claim the edit survives an arbitrary tab close** — an
 * unload handler cannot await an asynchronous IndexedDB write. Nothing below asserts that,
 * deliberately.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { registerPageExit } from '../src/store/pageExit.ts';

type Handler = (e: unknown) => void;

function fakeTarget() {
  const handlers = new Map<string, Set<Handler>>();
  return {
    handlers,
    addEventListener(type: string, fn: Handler) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      (handlers.get(type) as Set<Handler>).add(fn);
    },
    removeEventListener(type: string, fn: Handler) {
      handlers.get(type)?.delete(fn);
    },
    fire(type: string, e: unknown = {}) {
      for (const fn of [...(handlers.get(type) ?? [])]) fn(e);
    },
    types() {
      return [...handlers.entries()].filter(([, s]) => s.size > 0).map(([t]) => t).sort();
    },
  };
}

function harness(opts: { dirty?: boolean } = {}) {
  const win = fakeTarget();
  const doc = fakeTarget() as ReturnType<typeof fakeTarget> & { visibilityState: string };
  doc.visibilityState = 'visible';
  let flushes = 0;
  const off = registerPageExit({
    win,
    doc,
    flush: async () => { flushes += 1; },
    isDirty: () => opts.dirty ?? false,
  });
  return { win, doc, off, flushed: () => flushes };
}

test('the three page-exit listeners are registered', () => {
  const { win, doc } = harness();
  assert.deepEqual(doc.types(), ['visibilitychange']);
  assert.deepEqual(win.types(), ['beforeunload', 'pagehide']);
});

test('visibilitychange to hidden flushes the store', () => {
  const { doc, flushed } = harness();
  doc.visibilityState = 'hidden';
  doc.fire('visibilitychange');
  assert.equal(flushed(), 1);
});

test('visibilitychange back to visible does not flush', () => {
  const { doc, flushed } = harness();
  doc.fire('visibilitychange');
  assert.equal(flushed(), 0);
});

test('pagehide flushes the store', () => {
  const { win, flushed } = harness();
  win.fire('pagehide');
  assert.equal(flushed(), 1);
});

test('a real exit fires both events and flushes ONCE — the handlers are deduped', () => {
  const { win, doc, flushed } = harness();
  doc.visibilityState = 'hidden';
  doc.fire('visibilitychange');
  win.fire('pagehide');
  assert.equal(flushed(), 1, 'the page-exit flush ran twice');
});

test('coming back to a visible page re-arms the flush for the next exit', () => {
  const { win, doc, flushed } = harness();
  doc.visibilityState = 'hidden';
  doc.fire('visibilitychange');
  doc.visibilityState = 'visible';
  doc.fire('visibilitychange');
  doc.visibilityState = 'hidden';
  doc.fire('visibilitychange');
  assert.equal(flushed(), 2, 'the second exit did not flush');
});

test('beforeunload calls preventDefault only while there are unsaved edits', () => {
  for (const dirty of [true, false]) {
    const { win } = harness({ dirty });
    let prevented = false;
    win.fire('beforeunload', { preventDefault: () => { prevented = true; } });
    // `dirty` here is INJECTED into the harness, not read from a store: this test is about
    // `registerPageExit` wiring, not about the dirty predicate itself. R4-1's own criterion
    // ("no test proves a write with the dirty predicate") is asserted in `dirty.test.ts`, on
    // the port's stored bytes.
    assert.equal(prevented, dirty, `beforeunload with an unsaved edit = ${dirty} was wrong`);
  }
});

test('unregistering removes every listener', () => {
  const { win, doc, off, flushed } = harness();
  off();
  assert.deepEqual(doc.types(), []);
  assert.deepEqual(win.types(), []);
  win.fire('pagehide');
  assert.equal(flushed(), 0);
});
