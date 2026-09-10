/**
 * **The modal-parent election, in a module a test can call** — ARCHITECTURE §8.4 **A-94** Part 2
 * (an abstention is not a vote) with **A-89** Part 4, QA **R69-3**.
 *
 * This rule used to sit inline in `gen-gazetteer.mjs`, and one arm of it — **the tie-break** —
 * could not be exercised by anything. A-94 Part 9 **fault 3** says *"resolve a tie by highest code
 * instead of lowest → no shipped row moves on this corpus and the assertion that the tally is
 * published, per code, with its abstention count, is what catches it."* **A published tally with
 * no tie in it catches nothing**: all twelve tallies have a single top answer, so inverting the
 * comparator in the generator *and* in the test's own re-derivation left all 1,880 tests green
 * (executed, R69-3). A green tick that means nothing is worse than a disclosed gap.
 *
 * It lives here for the same reason `corpus-write.mjs` does — **an injected fault has to be
 * executable.** `gen-gazetteer.mjs` runs `main()` on import and streams 625 MB of pinned dumps, so
 * nothing under `node --test` can reach a function inside it. Here, `packages/core/test/
 * gazetteerElection.test.ts` calls the real rule on a **synthetic ballot that does contain a tie**,
 * and inverting the comparator reddens.
 *
 * **It is not a substitute for the published tally**, which is what re-derives the twelve real
 * elections from the artefact and what catches a generator that publishes one election and
 * performs another. The test keeps its own independent re-derivation for that; this pins the arm
 * the corpus cannot reach.
 *
 * Zero dependencies, no ambient clock, no ambient randomness — it is `tools/`, not
 * `packages/core`, but nothing here would violate either rule if it moved.
 */

/**
 * Elect the modal parent of one stated code from its ballot's **answers**.
 *
 * The plurality is over the answers alone — an abstention is not a vote (A-94 Part 2) — and the
 * caller has already excluded them. **A tie is broken by the lowest ISO code**, which is a rule
 * rather than an accident of `Map` order. A winner the shipped index cannot draw elects `null`,
 * as does an empty ballot: the code's rows then ship `countryCode: null`, which is A-94 Part 3's
 * arm, unoccupied on this corpus rather than deleted.
 *
 * Pure. Throws nothing. Mutates nothing — `answers` is copied before it is sorted.
 *
 * @param {Iterable<readonly [string, number]>} answers  code → how many candidate rows answered it
 * @param {ReadonlySet<string>} draws  the country codes `COUNTRY_INDEX` can draw
 * @returns {{ parent: string | null, ranked: Array<[string, number]> }} the elected parent, and
 *   the answers in the order the tally publishes them (descending count, lowest code first)
 */
export function electParent(answers, draws) {
  const ranked = [...answers].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const best = ranked.length > 0 ? ranked[0][0] : null;
  return { parent: best !== null && draws.has(best) ? best : null, ranked };
}
