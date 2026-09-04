/**
 * The store's **generation guard** — ARCHITECTURE §4.2 rule **6d** and **A-67**.
 *
 * §4.2 rule 6a guarantees that a pending write is flushed *before* the active document
 * changes. It says nothing about the awaits that sit **between** the flush and the install —
 * `openTrip`'s `ports.storage.load(id)` is one, `importDoc`'s id-minting loop is another — and
 * everything dispatched inside that window used to be discarded by the install with
 * `persistence.status` reading `'idle'` over it (QA **R47-1**). The same shape one subsystem
 * over let an older `present()` answer land after a newer one for the *same* trip (QA
 * **R47-2**).
 *
 * Both are one defect: **an actor captures a fact about the store, awaits, and then writes on
 * the strength of the captured fact.** Trip identity is not that fact — it is a proxy for it,
 * and a proxy that is true of two different states (the outgoing document and the incoming one
 * for the same id; the older read's subject and the newer read's) is a guarantee that reads
 * true and measures false. This module is §0.6 applied to the store's own in-flight
 * operations: *a fact about a resource is only valid at the moment, and in the place, the
 * resource itself stated it.*
 *
 * No dependency, no DOM, no `Date`, no `Math.random` — `cairn-constraints` §2 and §4.
 */

/** A slot of store state whose replacement must be ordered. See A-67 Part 4 for the criterion. */
export type GuardedSlot = 'doc' | 'browsing' | 'photoAvailability';

/** Opaque, monotone, per slot, per store instance. Ephemeral — A-67 Part 9. */
export type Ticket = number;

export interface GenerationGuard {
  /** "I am going to REPLACE this slot." Invalidates every ticket issued for it before now.
   *  Pair with `release` in a `finally`. */
  claim(slot: GuardedSlot): Ticket;
  /** Ends a claim. ALWAYS in a `finally`, on every exit including the throws. */
  release(slot: GuardedSlot): void;
  /** "I am going to write THROUGH this slot, not replace it." `null` while a claim is open —
   *  a ticket taken inside somebody else's window would not be invalidated by their install. */
  observe(slot: GuardedSlot): Ticket | null;
  /** THE predicate. Is this ticket still the newest issued for its slot? */
  current(slot: GuardedSlot, t: Ticket | null): boolean;
  /** A SYNCHRONOUS replacement of a slot, which has no window: invalidate, then write. */
  supersede(slot: GuardedSlot): void;
}

/**
 * One guard per store instance. **Never module state** — A-67 Part 3 item 3: two stores over
 * one `memoryStorage` is this project's standard two-tab fixture and they must not share a
 * sequence.
 *
 * Four things about the body below that are the ruling and not the implementation:
 *
 *   1. **`current` is one comparison and does not consult `busy`, and that is a proof rather
 *      than an oversight.** An observation is only ever issued when `busy === 0`, and every
 *      claim increments `seq`, so if any claim has been made since an observation was taken
 *      then `seq !== t` **whether or not that claim has settled**. `busy` is needed by
 *      `observe` and by nothing else. Adding `busy[s] === 0` to `current` breaks the claimer's
 *      own write, because a claimer's window is open at the moment it checks its own ticket.
 *   2. **`observe` returning `null` is load-bearing, not defensive.** An operation that takes a
 *      ticket *inside* a transition's window would capture the value that transition has
 *      already minted, would still hold it after the install, and would write into a document
 *      it never saw. `null` makes that unrepresentable; `current(slot, null)` is `false` by the
 *      first clause.
 *   3. Created inside `createStore`, held as closure state beside `merging`, `rescanning`,
 *      `saving` and `cancelPending`.
 *   4. **`Number.MAX_SAFE_INTEGER` is not a bound anyone reaches** — at one transition per
 *      millisecond for the life of the process it is ~285,000 years. Stated so it is a checked
 *      assumption; no wraparound handling ships.
 *
 * The one assumption the whole mechanism rests on is ECMAScript run-to-completion: between a
 * synchronous `current(...)` check and the synchronous statement after it, nothing else in this
 * agent runs. That is why **every check is the last statement before its write, with no `await`
 * between them** — a check separated from its act by an await is the check-then-act §0.6
 * forbids.
 */
export function createGenerationGuard(): GenerationGuard {
  const seq: Record<GuardedSlot, number> = { doc: 0, browsing: 0, photoAvailability: 0 };
  const busy: Record<GuardedSlot, number> = { doc: 0, browsing: 0, photoAvailability: 0 };
  return {
    claim: (s) => { busy[s]++; return ++seq[s]; },
    release: (s) => { busy[s]--; },
    observe: (s) => (busy[s] > 0 ? null : seq[s]),
    current: (s, t) => t !== null && seq[s] === t,
    supersede: (s) => { seq[s]++; },
  };
}
