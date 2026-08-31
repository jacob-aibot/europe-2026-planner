/**
 * ARCHITECTURE §2.14 rule 7, as a **ceiling** rather than a spot check (QA R2-8).
 *
 * *"Any view that renders a record with a non-null `attribution` renders the credit."* That
 * is the mechanical form of `CLAUDE.md`'s oldest rule — never present my suggestions as
 * Jacob's plan — applied to the path where it will actually be exercised.
 *
 * It was checked by hand, four views at a time, and two of the four did not do it: the
 * Optional panel rendered the badge *from a friend* and no credit, and the stop editor
 * rendered neither. Four hand checks cannot notice a fifth view; a grep can. So the rule
 * here is: **a view that renders the provenance BADGE renders the CREDIT**, with a short
 * exemption list whose justification is itself asserted at runtime rather than argued.
 *
 * `apps/web` cannot be imported from here — §3's dependency test forbids it, and that is the
 * boundary that keeps the live planner's data out of a bundle. So the views are read as
 * text. That is a weaker instrument than rendering them, and the pass records it as such:
 * the rendered strings are asserted in Chromium, in `qa/`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const VIEWS = resolve(CAIRN, 'apps/web/src/views');

const RENDERS_BADGE = /displayStatus\(|STATUS_BADGE\[/;
const RENDERS_CREDIT = /attribution\(|creditLabel\(/;

/**
 * Views that render a badge and are exempt from rendering a credit, with the claim that
 * makes them exempt. Every claim is proved below by construction, not accepted.
 */
const CANNOT_BE_ATTRIBUTED: Record<string, string> = {
  'Sidebar.tsx': 'renders a Day chip, never a Stop. `copyStopInto` is the only producer of ' +
    'attributed records in Phase 1 and it produces Stops only, so no Day can carry a ' +
    'non-null attribution — asserted below over the reference trip and over a fresh copy.',
};

const viewFiles = () => readdirSync(VIEWS).filter((n) => n.endsWith('.tsx'));

test('every view that renders the provenance badge also renders the credit line', () => {
  const offenders: string[] = [];
  for (const name of viewFiles()) {
    const src = readFileSync(resolve(VIEWS, name), 'utf8');
    if (!RENDERS_BADGE.test(src)) continue;
    if (name in CANNOT_BE_ATTRIBUTED) continue;
    if (!RENDERS_CREDIT.test(src)) offenders.push(name);
  }
  assert.deepEqual(
    offenders,
    [],
    '§2.14 rule 7: a view badges a record "from a friend" and then does not say whose it was',
  );
});

test('the badge-rendering views are a known set — a fifth cannot appear silently', () => {
  const badged = viewFiles()
    .filter((n) => RENDERS_BADGE.test(readFileSync(resolve(VIEWS, n), 'utf8')))
    .sort();
  assert.deepEqual(
    badged,
    ['BrowsePane.tsx', 'DayTimeline.tsx', 'Panels.tsx', 'Sidebar.tsx', 'StopEditor.tsx'],
    'a view started rendering provenance without being held to rule 7 — add it here and to the check above',
  );
});

test('the stop editor renders both the badge and the credit — it edits the record itself', () => {
  // Named on its own because it is the view where the rule matters most: it is where a user
  // changes a record's fields, and changing a friend's stop without being told it is a
  // friend's stop is the whole failure mode rule 7 exists for.
  const src = readFileSync(resolve(VIEWS, 'StopEditor.tsx'), 'utf8');
  assert.match(src, RENDERS_BADGE, 'StopEditor renders no provenance badge');
  assert.match(src, RENDERS_CREDIT, 'StopEditor renders no credit line');
});

test('the Optional panel renders the credit, not just the badge', () => {
  const src = readFileSync(resolve(VIEWS, 'Panels.tsx'), 'utf8');
  assert.match(src, RENDERS_CREDIT, 'PoolPanel badges a copied stop and drops its credit');
});

test('every exemption\'s justification holds: no Day can carry an attribution', async () => {
  // The exemption list is only worth having if its reason is checked. `copyStopInto` is the
  // only thing that mints `source:'friend'` with an `origin`, and it mints Stops.
  const core = await import('../packages/core/src/index.ts');
  const { loadEurope2026 } = (await import('../fixtures/loadEurope2026.mjs')) as {
    loadEurope2026: () => { trip: import('../packages/core/src/index.ts').Trip };
  };
  const { trip } = loadEurope2026();

  const ctx = { ids: core.sequentialIds('v'), now: '2026-08-25', actorUserId: 'local:self' };
  let target = core.createTrip(
    {
      id: 'trip-views', title: 'Views', ownerId: 'local:self',
      startDate: '2026-09-01', endDate: '2026-09-02',
      cities: [{ key: 'lisbon', name: 'Lisbon', centre: { lat: 38.72, lng: -9.14 } }],
    },
    ctx,
  );
  const source = trip.days.flatMap((d) => d.stops)[0];
  target = core.copyStopInto(
    target,
    { trip, stopId: source.id },
    { kind: 'scheduled', dayId: target.days[0].id, time: null, order: 0 },
    { ids: core.sequentialIds('c'), today: '2026-09-01', actorUserId: 'local:self' },
  );
  assert.equal(
    target.days[0].stops.filter((s) => core.attribution(s) !== null).length,
    1,
    'INCONCLUSIVE: the copy produced no attributed stop, so the exemption proves nothing',
  );

  for (const t of [trip, target]) {
    const attributedDays = t.days.filter((d) => core.attribution(d) !== null).map((d) => d.id);
    assert.deepEqual(
      attributedDays,
      [],
      `a Day carries an attribution, so ${Object.keys(CANNOT_BE_ATTRIBUTED).join(', ')} is no longer exempt`,
    );
  }
});

// ---------------------------------------------------------------------------
// ROADMAP Phase 2 I-4 — the past-trip flow and the lifecycle chips.

/**
 * §4.2 rule 1, as a grep rather than a promise: the past-trip form dispatches `createTrip`,
 * `setTripMeta` and `setDayMeta`, and invents no domain logic. Every store method and action
 * it names is checked against a closed list, so a fourth one cannot appear silently.
 *
 * `setDayMeta` joined the list when **KD-38** was closed: a past trip whose days were all
 * `primaryCity:'transit'` (what `ensureDays` mints) is attributable to no city at all, so
 * I-6's `cityKeys` widening — the lifetime map — would find nothing on the very trips this
 * form exists to record. It is the existing action, unchanged, and the reducer gained
 * nothing: `setDayMeta` is a core build function and was already on `ACTION_SPECS`.
 */
test('I-4: PastTripForm dispatches only createTrip + setTripMeta + setDayMeta', () => {
  const src = readFileSync(resolve(VIEWS, 'PastTripForm.tsx'), 'utf8');
  const storeCalls = [...new Set([...src.matchAll(/store\.(\w+)\(/g)].map((m) => m[1]))].sort();
  assert.deepEqual(storeCalls, ['createTrip', 'dispatch'], `store calls: ${storeCalls.join(', ')}`);
  const actions = [...new Set([...src.matchAll(/type:\s*'(\w+)'/g)].map((m) => m[1]))].sort();
  assert.deepEqual(actions, ['setDayMeta', 'setTripMeta'], `dispatched actions: ${actions.join(', ')}`);
});

/**
 * KD-38, closed. The grep half of "a recorded past trip has at least one city, and its days
 * reflect it": the form may not submit without a city, and what it assigns to the day is the
 * trip's own city key — not a literal, and not `'transit'`.
 */
test('I-4: PastTripForm requires a city and assigns it as the days\' primaryCity', () => {
  const src = readFileSync(resolve(VIEWS, 'PastTripForm.tsx'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  assert.match(code, /primaryCity:/, 'the form assigns no primaryCity');
  assert.ok(!/primaryCity:\s*'/.test(code), 'the form hardcodes a city key instead of using the trip\'s own');
  assert.ok(!/'transit'/.test(code), 'the form names the transit catch-all');
  // The submit gate names the cities the form parsed, so "Record it" cannot fire with none.
  assert.match(code, /const valid =[^;]*cit/i, 'a trip with no city can still be submitted');
});

/**
 * §8.1: there is no stored status field and a builder must not add one. The stage is derived
 * from `(dates, today)` on every render, so the chip must *call* for it and must not read a
 * field off the trip. `stage`/`status` as a *local* name is fine; `trip.status` is not.
 *
 * **I-8c moved the call one level, and this assertion with it.** §8.4 **A-44** rules that the
 * chip goes through `packages/client`'s `rowLifecycle` — which is `core.lifecycle` behind a
 * read gate — and the companion test below now forbids the direct call this line used to
 * require. The property is unchanged: derived on every render, from the dates, by one
 * implementation. Only the route is.
 */
test('I-4: the lifecycle chip derives its stage and reads no stored status field', () => {
  const src = readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8');
  assert.match(src, /rowLifecycle\(/, 'the chip does not derive its stage from the dates at all');
  for (const banned of [/\.status\b/, /\bdatePrecision\b.*===/]) {
    assert.ok(!banned.test(src), `Library.tsx matches ${banned} — a stored stage, or a branch on precision`);
  }
});

/**
 * Sequencing rule 1: a second implementation of trip state anywhere is a design defect. The
 * chip is one component used by both surfaces, and nothing in `apps/web` re-derives a stage
 * from dates by hand.
 */
test('I-4: one lifecycle implementation — no view compares dates to today itself', () => {
  const offenders: string[] = [];
  for (const f of readdirSync(VIEWS).filter((n) => n.endsWith('.tsx'))) {
    const src = readFileSync(resolve(VIEWS, f), 'utf8');
    // A view deriving a stage would have to compare a date to today somewhere.
    if (/(startDate|endDate)\s*[<>]=?\s*(today|now)\b/.test(src)) offenders.push(f);
    if (/(today|now)\s*[<>]=?\s*\w*\.(startDate|endDate)\b/.test(src)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], 'a view re-derives the lifecycle instead of calling core.lifecycle');
});

/**
 * QA P2-6, as a ceiling rather than a spot check. `dateRangeLabel` existed and was correct,
 * and it was wired into exactly one of the two screens a trip appears on — so the Library
 * printed `2019-03-01 → 2019-03-31` for a trip the user recorded as *"March 2019"*, stating
 * something the user never claimed. Four hand checks cannot notice a third screen; a grep can.
 *
 * The rule: **a view that renders a trip's own date range renders it through
 * `dateRangeLabel`**, with a short exemption list whose justification is stated.
 */
const RAW_RANGE = /\{[^{}]*\.startDate\s*\}[\s\S]{0,12}\{[^{}]*\.endDate\s*\}/;

const MAY_PRINT_A_RAW_RANGE: Record<string, string> = {
  'PastTripForm.tsx': 'the "Stored as …" line is the disclosure of what the chosen precision ' +
    'will be written to the document as, shown beside the fuzzy label the user picked. It is ' +
    'the stored representation quoted as such, not the trip presented by its dates.',
};

test('QA P2-6: every view that prints a trip date range prints it through dateRangeLabel', () => {
  const offenders: string[] = [];
  for (const name of viewFiles()) {
    if (name in MAY_PRINT_A_RAW_RANGE) continue;
    if (RAW_RANGE.test(readFileSync(resolve(VIEWS, name), 'utf8'))) offenders.push(name);
  }
  assert.deepEqual(
    offenders,
    [],
    'a view states exact dates for a trip whose datePrecision may be month or year — use dateRangeLabel',
  );
});

test('QA P2-6: the Library reads the honest range label, and the exemption still applies', () => {
  assert.match(
    readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8'),
    /dateRangeLabel\(/,
    'Library.tsx does not call dateRangeLabel — the screen a past trip mostly lives on',
  );
  // The exemption is not a free pass: the line it covers must still be the one it describes.
  const past = readFileSync(resolve(VIEWS, 'PastTripForm.tsx'), 'utf8');
  assert.ok(RAW_RANGE.test(past), 'PastTripForm.tsx no longer prints a raw range — drop the exemption');
  assert.match(past, /Stored as/, 'the exemption\'s justification names a "Stored as" disclosure that is gone');
});

/** §2.1: `Date` is read in `ports/env.ts` and nowhere else in `apps/web`. */
test('I-4: no view calls new Date() — the clock comes from the port', () => {
  const offenders: string[] = [];
  for (const f of readdirSync(VIEWS).filter((n) => n.endsWith('.tsx'))) {
    const src = readFileSync(resolve(VIEWS, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    if (/\bnew Date\s*\(|\bDate\.now\s*\(/.test(src)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], 'a view reads the ambient clock instead of the ClockPort');
});

// ---------------------------------------------------------------------------
// ROADMAP Phase 2 I-6 — the SUMMARY_VERSION rescan reaches the screen.

/**
 * §8.4 clause 3's last sentence, at the view layer: *"the map says 'recomputing' while it
 * does."* The library is the surface that ships in I-6 (the Map arrives at I-8), and the rule
 * is the same one either way — **a row that has not been recomputed yet must not be rendered
 * as though it had.**
 *
 * Three things are asserted, all as greps, because `apps/web` cannot be imported from here
 * (§3's dependency test). The rendered strings are asserted in Chromium, in `qa/`.
 */
test('I-6: the Library derives its scan state and says "recomputing" while it runs', () => {
  const src = readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8');
  // 1. It asks the selector, rather than deciding for itself what "complete" means.
  assert.match(src, /summaryScan\(/, 'Library.tsx never asks summaryScan how current its rows are');
  // 2. It renders the word while a pass is in flight.
  assert.match(src, /Recomputing/, 'nothing on the library says a rescan is running');
  // 3. A document that could not be read is reported, not silently dropped or left looking fine.
  assert.match(src, /unreadable/i, 'an unreadable trip is not reported on the library');
  assert.match(src, /could not be read/i, 'the unreadable case has no sentence a reader would understand');
});

/**
 * The one thing the view may NOT do: decide completeness from its own arithmetic. Counting
 * `state.library.length` and calling it "40 trips, 6 countries" is exactly the stored-count
 * failure §8.4 clause 2 and §0.7 forbid, one layer up — the row's own `summaryVersion` is the
 * only fact about whether the row is current, and `summaryScan` is the only place that reads it.
 */
test('I-6: no view compares summaryVersion itself — summaryScan is the one reader', () => {
  const offenders: string[] = [];
  for (const f of readdirSync(VIEWS).filter((n) => n.endsWith('.tsx'))) {
    const src = readFileSync(resolve(VIEWS, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    if (/summaryVersion|SUMMARY_VERSION/.test(src)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], 'a view re-implements the freshness comparison instead of calling summaryScan');
});

// ---------------------------------------------------------------------------
// ROADMAP Phase 2 I-8a — ARCHITECTURE §4.4 A-40 Part 4's two binding clauses, and the
// tab shell's own ceiling.

/**
 * **W1 — `WorldMap.tsx` reads no layout geometry.** This is A-40's own greppable ceiling,
 * quoted: *"those four identifiers do not appear in the file."*
 *
 * It is the whole reason CLAUDE.md's *"never fit a hidden container"* bug is **absent** from
 * this surface rather than re-solved on it. Leaflet's bug is a measurement bug — a zoom
 * computed from a 0×0 container is nonsense and is cached — and an SVG `viewBox` is not
 * measured. The moment someone adds a pixel-measured label placement, a zoom-to-country
 * animation or a canvas fallback, the bug is back and they need `pendingFit`. A-40 names that
 * as the trigger to reopen the ruling; this test is what makes the trigger fire.
 *
 * Asserted over the raw file including comments **on purpose**: a commented-out
 * `getBoundingClientRect` is a line someone uncomments.
 */
/** Comments stripped, so a rule can quote the identifier it forbids without tripping itself. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const W1_FORBIDDEN = ['getBoundingClientRect', 'offsetWidth', 'offsetHeight', 'ResizeObserver', 'innerWidth'];

test('I-8a / A-40 W1: WorldMap.tsx reads no layout geometry', () => {
  const src = readFileSync(resolve(VIEWS, 'WorldMap.tsx'), 'utf8');
  const found = W1_FORBIDDEN.filter((id) => src.includes(id));
  assert.deepEqual(found, [], `WorldMap.tsx measures layout: ${found.join(', ')}`);
});

/**
 * **W1, the other half.** *"It contains no arithmetic over coordinates. Not a projection, not
 * a bounds calculation, not a point-in-polygon test."* The renderer's only geometry is the
 * two strings the frame handed it, so neither `worldMapFrame`'s inputs — `travelStats` rows
 * and the country index — may be re-derived here.
 */
test('I-8a / A-40 Part 3: WorldMap.tsx does no geometry of its own', () => {
  const src = readFileSync(resolve(VIEWS, 'WorldMap.tsx'), 'utf8');
  assert.match(src, /worldMapFrame\(/, 'the map does not go through the frame selector at all');
  for (const banned of ['mapBounds(', 'MIN_SPAN_KM', 'Math.min(', 'Math.max(', 'Math.cos(', '.rings']) {
    assert.ok(!src.includes(banned), `WorldMap.tsx computes geometry itself: ${banned}`);
  }
});

/**
 * **W2 — hit testing is the renderer's own.** *"Tap a country for its trips"* is a handler on
 * the `<path>`; the browser hit-tests the filled path. A hand-rolled point-in-polygon over
 * screen coordinates is forbidden **because it needs a measurement** and would re-introduce
 * W1's bug by the back door. So: a click handler on a path, and no pointer coordinates read.
 */
test('I-8a / A-40 W2: the map hit-tests through the DOM, not through coordinates', () => {
  const src = readFileSync(resolve(VIEWS, 'WorldMap.tsx'), 'utf8');
  assert.match(src, /<path\b[\s\S]*?onClick=/, 'no click handler on the rendered <path>');
  for (const banned of ['clientX', 'clientY', 'pageX', 'pageY', 'elementFromPoint', 'e.nativeEvent']) {
    assert.ok(!src.includes(banned), `WorldMap.tsx reads pointer coordinates: ${banned}`);
  }
});

/**
 * A-40 Part 5, as a ceiling rather than a promise: **city pins are not in the world map**,
 * because `TripSummaryRow.cities[]` carries no coordinate and manufacturing one is a
 * `SUMMARY_VERSION` ruling. If a later pass adds one it will have to delete this test, which
 * is the point — the deferral is in writing and the code holds it.
 */
test('I-8a / A-40 Part 5: the world map draws no city pins', () => {
  const src = readFileSync(resolve(VIEWS, 'WorldMap.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  // `stats.cities` is the `TravelStatsCity[]` a pin would have to come from; the *counts* on
  // `stats.unattributed` are not geometry and are exactly what the surface must state.
  for (const banned of ['<circle', 'stats.cities', 'MapPoint', 'MapPort']) {
    assert.ok(!src.includes(banned), `WorldMap.tsx reaches for city geometry or the Leaflet port: ${banned}`);
  }
});

/**
 * **A-40 Part 2: `MapPort` and `apps/web/src/ports/map.ts` do not change, and no interface is
 * shared between the two maps.** The trip map keeps its tiles, its handle table, its
 * `ResizeObserver` and its `pendingFit`, *"all unread by this surface"* — and, symmetrically,
 * the Leaflet port never learns what a `viewBox` is.
 */
test('I-8a / A-40 Part 2: the two maps share no interface', () => {
  const port = readFileSync(resolve(CAIRN, 'apps/web/src/ports/map.ts'), 'utf8');
  for (const banned of ['worldMapFrame', 'WorldMapFrame', 'viewBox', 'WorldMap']) {
    assert.ok(!port.includes(banned), `ports/map.ts was widened for the world map: ${banned}`);
  }
  // And the port still solves its own bug, which A-40 leaves untouched.
  assert.match(port, /pendingFit/);
  assert.match(port, /ResizeObserver/);
});

/**
 * **The tab shell: three slots, and no fourth.** ROADMAP I-8 — *"Navigation becomes Trips ·
 * Map · Profile — three tabs, not four. **No DISCOVER tab**: a slot that exists to promise
 * something is the opposite of what this product's conventions say about presenting things
 * that are not yet true."* I-8a registers the two that have content; I-8b registers Profile.
 *
 * So the assertion is on the *registry*, not on a count of rendered buttons: a tab exists
 * exactly when something is registered for it, and an empty tab cannot be added without
 * adding a component to render in it.
 */
test('I-8a: the tab shell registers only tabs that have content — no empty slot', () => {
  const src = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/App.tsx'), 'utf8'));
  const registry = /const TABS: TabSpec\[\] = \[([\s\S]*?)\n\];/.exec(src);
  assert.ok(registry, 'App.tsx has no `TABS` registry — the shell is not a registry');
  const ids = [...registry[1].matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['trips', 'map'], 'I-8a registers Trips and Map, and nothing else');
  for (const id of ids) {
    assert.match(
      registry[1],
      new RegExp(`id: '${id}'[\\s\\S]*?render:`),
      `the ${id} tab is registered without anything to render`,
    );
  }
  assert.ok(!/discover/i.test(src), 'a DISCOVER slot appeared in the shell');
});

// ---------------------------------------------------------------------------
// ROADMAP Phase 2 I-8a — the signal-collision fix.

/**
 * **Provenance and severity are orthogonal channels and must be carried by orthogonal
 * means.** ROADMAP I-8a names this a *design defect*, not polish: `.stop--dim { opacity: .72 }`
 * was the only mechanism for *"not yet accepted"*, and it composed on the same element with
 * `.stop--flag`, so a copied stop that also has a conflict rendered **both** signals degraded
 * — opacity multiplies the blocker's own colour. With A-34's `provisional` arriving as a
 * *third* signal on the same surface, one opacity multiplier cannot carry them.
 *
 * The rule, mechanically: **no provenance class may set `opacity`.** The rendered proof — a
 * copied, unaccepted stop that also carries a blocker, with the blocker at full strength — is
 * in Chromium, in `qa/i8a-signals.mjs`, because computed opacity is a rendering fact.
 */
test('I-8a: no provenance signal is carried by opacity', () => {
  const css = readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8');
  const rules = [...stripComments(css).matchAll(/([^{}]+)\{([^}]*)\}/g)];
  const offenders: string[] = [];
  for (const [, selector, body] of rules) {
    // The provenance and provisional channels by name. `.conflict--done` is deliberately not
    // here: "you have already resolved this" retires the SEVERITY channel and composes with
    // nothing, which is the case opacity is still the right tool for.
    if (!/--unaccepted|--provisional|--suggested|--imported|--candidate|stop--dim|is-dim/.test(selector)) continue;
    if (/(^|[;\s])opacity\s*:/.test(body)) offenders.push(selector.trim());
  }
  assert.deepEqual(offenders, [], 'a provenance/provisional class attenuates with opacity');
});

/**
 * And the mark still exists — the fix is *"carry it by another channel"*, never *"drop it"*.
 * `CLAUDE.md`'s oldest rule is that nothing the system added is shown as Jacob's own plan.
 */
test('I-8a: the unaccepted mark is still applied to the row, by a non-opacity channel', () => {
  const src = stripComments(readFileSync(resolve(VIEWS, 'DayTimeline.tsx'), 'utf8'));
  assert.match(src, /stop--unaccepted/, 'the day timeline no longer marks an unaccepted stop at all');
  assert.ok(!src.includes('stop--dim'), 'the old shared-opacity class is still applied');
  // The spine carries the identical pair — a provenance mark on a row that also shows an
  // unresolved blocker as a dot — and had the identical defect.
  const spine = stripComments(readFileSync(resolve(VIEWS, 'Sidebar.tsx'), 'utf8'));
  assert.match(spine, /is-unaccepted/, 'the spine no longer marks an unaccepted day');
  assert.ok(!spine.includes("'is-dim'"), 'the spine still dims a whole row for provenance');
  const css = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8'));
  assert.match(css, /\.stop--unaccepted\s*\{/, 'no rule draws the unaccepted mark');
  assert.ok(!/\.stop--dim\s*\{/.test(css), '.stop--dim survived in the stylesheet');
});

/**
 * **Two named removals** (ROADMAP I-8a, `docs/VISUAL-TELLS.md` §1). Both were independently
 * identified by the project and by the tell list, which is the agreement that made the list
 * worth writing down. The computed-style form of these two assertions is the first two probes
 * in `qa/i8a-signals.mjs`; this is the source-level floor under them.
 */
test('I-8a: neither named removal comes back', () => {
  const css = readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/backdrop-filter/.test(css), 'backdrop-filter is back in the stylesheet');
  assert.ok(!/linear-gradient|radial-gradient/.test(css), 'a gradient is back in the stylesheet');
});

// ---------------------------------------------------------------------------
// ROADMAP Phase 2 I-8c — the lifecycle read gate (A-44) and the boundary's way out (BLD-3).
//
// `apps/web` cannot be imported from here (§3's dependency test), so these are source-level
// floors under criteria whose real oracle is rendered output, in `qa/`. Same instrument as
// every other test in this file, and stated as such.

/**
 * **A-44: one gate, in `packages/client`, and no copy of it in a view.** `core.lifecycle`
 * throws on a stored row whose date is not shape-valid (§8.4 A-37 Part 2), and QA R33-3
 * measured one such row taking the entire Trips tab down. The ruling is explicit that the
 * cheap fix — a `try/catch` at the call site — is the wrong place by one level, because
 * `LifecycleChip` already has three callers and I-8b adds a fourth.
 *
 * So: no view calls `core.lifecycle`, and the chip reads `rowLifecycle` instead.
 */
test('I-8c / A-44: no view calls core.lifecycle directly — the gate is the client selector', () => {
  const offenders: string[] = [];
  for (const name of viewFiles()) {
    const src = stripComments(readFileSync(resolve(VIEWS, name), 'utf8'));
    // The import is the mechanical form: nothing in `apps/web` may pull the ungated function.
    if (/import\s*\{[^}]*\blifecycle\b[^}]*\}\s*from\s*'@cairn\/core'/.test(src)) offenders.push(name);
    if (/\bcore\.lifecycle\s*\(/.test(src)) offenders.push(`${name} (core.lifecycle call)`);
  }
  assert.deepEqual(offenders, [], 'a view reads the ungated `lifecycle` — one bad row takes the tab down');
  const chip = stripComments(readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8'));
  assert.match(chip, /rowLifecycle/, 'LifecycleChip no longer goes through the A-44 gate');
  assert.match(
    chip,
    /import\s*\{[^}]*\browLifecycle\b[^}]*\}\s*from\s*'@cairn\/client'/,
    'rowLifecycle must come from @cairn/client, not be re-implemented in a view',
  );
});

/**
 * **A-44: `null` renders as an explicit unreadable chip.** *"…in the vocabulary the Library
 * already uses for a row it could not read (`summaryScan`'s `unreadable`), rather than a stage
 * it cannot justify."* Omitting the chip silently is the other wrong answer: a row whose dates
 * could not be read must not look like a row that is fine.
 */
test('I-8c / A-44: an unreadable row gets a chip that says so, not silence and not a stage', () => {
  const src = stripComments(readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8'));
  const chip = /export function LifecycleChip\(([\s\S]*?)\n}\n/.exec(src);
  assert.ok(chip, 'LifecycleChip is no longer a top-level function in Library.tsx');
  const body = chip[1];
  assert.ok(!/return null/.test(body), 'the chip omits itself for an unreadable row');
  assert.match(body, /chip--warn/, 'the unreadable chip does not use the established warn vocabulary');
  assert.match(body, /could not be read/, 'the unreadable chip does not say what happened');
  assert.match(body, /data-stage="unreadable"/, 'nothing distinguishes the unreadable chip in the DOM');
  // `lifecycleLabel` takes a `Lifecycle`; a `null` reaching it would print "Past trip".
  assert.ok(
    !/lifecycleLabel\(stage as/.test(body),
    'a null stage is being cast into `lifecycleLabel` — that prints a stage for a row with none',
  );
});

/**
 * **BLD-3 — the boundary has a way out.** Round 33: `TabBoundary` latched `message` for the
 * session with no reset, and with the Trips tab down the complete set of visible controls was
 * `["BUTTON:CAIRN","BUTTON:TRIPS","BUTTON:MAP"]` — the Library is the only surface with
 * delete, export or restore, and the Library is the surface that threw.
 *
 * Two things, therefore: a reset that clears `message`, and one recovery control rendered by
 * the **shell** rather than by the surface that failed. The rendered form is `qa/`'s; this is
 * the floor.
 */
test('I-8c / BLD-3: the tab boundary can be reset and offers a recovery outside the failed tab', () => {
  const src = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/App.tsx'), 'utf8'));
  const cls = /class TabBoundary([\s\S]*?)\n}\n/.exec(src);
  assert.ok(cls, 'App.tsx has no TabBoundary class');
  const body = cls[1];
  assert.match(body, /setState\(\{\s*message:\s*null\s*\}\)/, 'the boundary has no reset — the banner outlives its cause');
  assert.match(body, /Try again/, 'the reset control is not named "Try again"');
  assert.match(body, /recovery\.run|recovery\.label/, 'the boundary renders no shell-provided recovery');
  // …and the shell actually supplies one, per rendered tab.
  assert.match(src, /<TabBoundary[\s\S]{0,200}recovery=\{/, 'App renders TabBoundary without a recovery');
});
