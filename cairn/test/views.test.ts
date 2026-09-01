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

// ---------------------------------------------------------------------------
// ROADMAP Phase 2 I-8d — ARCHITECTURE §4.4 **A-41** W3 and **A-42** ruling (c).

/**
 * **W3 — the renderer draws panes; it does not compute them.** *"`WorldMap.tsx` renders one
 * `<svg>` per entry of `frame.panes`, with that pane's `viewBox` verbatim, containing the
 * countries whose `paneId` equals that pane's `id` — a **string equality filter and nothing
 * else**."*
 *
 * This is W1's ceiling extended to the atlas frame: the number of panes, their `viewBox`es
 * and which country is in which pane are decided in `worldMapFrame` from data alone, never
 * from a measured figure or a media query. That is what keeps the hidden-container bug
 * absent and what makes the frame reproducible in bare Node.
 */
test('I-8d / A-41 W3: WorldMap.tsx maps over frame.panes and filters countries by paneId equality', () => {
  const src = stripComments(readFileSync(resolve(VIEWS, 'WorldMap.tsx'), 'utf8'));
  assert.match(src, /frame\.panes\.map\(/, 'the renderer does not draw one <svg> per pane');
  assert.match(src, /c\.paneId === pane\.id/, 'pane membership is not a string equality on paneId');
  // The only `viewBox` expression in the file is the pane's own, verbatim.
  const viewBoxExprs = [...src.matchAll(/viewBox=\{([^}]*)\}/g)].map((m) => m[1].trim());
  assert.deepEqual([...new Set(viewBoxExprs)], ['pane.viewBox'], 'a viewBox is computed rather than carried');
  // `frame.viewBox` and `frame.bounds` are panes[0]'s; reading them here would be a second
  // way to say the same thing, and the one the renderer must not use.
  for (const banned of ['frame.viewBox', 'frame.bounds', 'panes[0]', 'panes.length >', '.slice(1)']) {
    assert.ok(!src.includes(banned), `WorldMap.tsx re-derives the pane structure: ${banned}`);
  }
});

/**
 * **A-42 ruling (c) — the surface stops making the claim.** The legend printed *"Zoomed out
 * to a readable minimum"* on `bounds.clamped`. On this surface that asserts something the
 * geometry does not support: `MIN_SPAN_KM` is 1.2 km — itself a rooftop window — and exactly
 * one code in 239 (`VA`) ever reaches it. `bounds.clamped` stays on the frame, because it is
 * core's honest report about core's own box, and **nothing renders it**.
 */
test('I-8d / A-42 (c): the world map makes no "readable minimum" claim', () => {
  const src = readFileSync(resolve(VIEWS, 'WorldMap.tsx'), 'utf8');
  assert.ok(!/readable minimum/i.test(src), 'the withdrawn min-span claim is still on screen');
  assert.ok(!src.includes('clamped'), 'the renderer still reads bounds.clamped');
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

// ---------------------------------------------------------------------------
// ROADMAP Phase 2 I-8e — the row that says it cannot be read, and the trip you can save but
// not open (ARCHITECTURE §2.9 **A-46**), plus QA **R34-1**'s ordering fix in the boundary.
//
// Same instrument and same caveat as the I-8c block above: `apps/web` cannot be imported from
// here, so these are source-level floors under criteria whose real oracle is rendered output,
// in `qa/i8e-render.mjs`.

/**
 * **A-46 Part 3: one boolean per row, and it is the core predicate — not `rowLifecycle`.**
 *
 * The routed proposal was *"treat `rowLifecycle() === null` as the unreadable signal"*, which
 * A-46 Part 1 measured as right in shape and **wrong in predicate**: it is strictly weaker
 * than what `fromJSON` now refuses, and every row in QA R34-2's table (`2026-02-30`,
 * `2026-13-01`, `0000-00-00`) still renders as a healthy card under it. This is the injected
 * fault I-8e names — *"the fix a reasonable builder would have written"* — so it is asserted
 * against here, at the one place a builder would write it.
 */
test('I-8e / A-46: the card\'s unreadable signal is `scan.unreadable || !rowDatesReadable(row)`', () => {
  const src = stripComments(readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8'));
  assert.match(
    src,
    /import\s*\{[^}]*\browDatesReadable\b[^}]*\}\s*from\s*'@cairn\/client'/,
    'rowDatesReadable must come from @cairn/client — a hand-rolled calendar in a view is the defect A-46 closes',
  );
  assert.match(
    src,
    /unreadableRow\s*=\s*unreadable\.has\(row\.id\)\s*\|\|\s*!rowDatesReadable\(row\)/,
    'the row boolean is not A-46 Part 3\'s: both sources, one signal',
  );
  // The two wrong predicates, named so the fault is red rather than merely absent.
  assert.ok(
    !/unreadableRow\s*=[^;]*rowLifecycle\(/.test(src),
    'the card signal is rowLifecycle-based — A-46 Part 1: `2026-02-30` classifies as `completed` and the chip goes silent',
  );
  assert.ok(
    !/isIsoDate\s*\(/.test(src),
    'the view calls isIsoDate itself instead of the client selector — the predicate is asked once, in one place',
  );
});

/**
 * **A-46 Part 3 clause 2 / QA R34-4: the meta line stops stating a range it cannot read.**
 *
 * Round 34 measured the card printing `not-a-date → 2019-05-08`, or — for month/year
 * precision — the plausible-looking nonsense `a not` and `not`, from `MONTHS[NaN-1] ?? 'not'`,
 * directly under a chip saying the dates could not be read. A-44's scope note said
 * *"`dateRangeLabel` is a string split and cannot throw (checked)"* — true, and checked for
 * the wrong property: not throwing is not the same as not stating something false.
 *
 * So on an unreadable row the card does **not** call `dateRangeLabel`; it prints the two
 * stored strings verbatim, with no month-name lookup and no `datePrecision` branch. That is
 * `storedDatesLabel`, which exists so this file's P2-6 ceiling above stays a ceiling: the raw
 * `{row.startDate} → {row.endDate}` shape it forbids never appears in a view.
 */
test('I-8e / A-46 / R34-4: an unreadable row prints its stored strings, a readable one prints the honest label', () => {
  const src = stripComments(readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8'));
  assert.match(
    src,
    /unreadableRow\s*\?\s*storedDatesLabel\(row\)\s*:\s*dateRangeLabel\(row\)/,
    'the meta line does not branch A-46 Part 3 clause 2\'s way',
  );
  const fmt = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/format.ts'), 'utf8'));
  const fn = /export function storedDatesLabel\(([\s\S]*?)\n}\n/.exec(fmt);
  assert.ok(fn, 'format.ts has no storedDatesLabel');
  for (const banned of [/MONTHS/, /datePrecision/, /split\(/]) {
    assert.ok(!banned.test(fn[1]), `storedDatesLabel matches ${banned} — it must print what is stored, nothing else`);
  }
});

/**
 * **A-46 Part 4: a trip that cannot be opened gets an export, on that branch only.**
 *
 * R34-2 measured a card whose only affordance was Delete, with the bytes intact in IndexedDB.
 * A readable trip already has an export (open → Export), and putting a second one on every
 * card is a Trips-list redesign A-46 does not make — so the control is gated on the same
 * boolean as the chip, and it goes through `store.exportStoredDoc`, which does not parse.
 */
test('I-8e / A-46 Part 4: the rescue export is offered on the unreadable branch and nowhere else', () => {
  const src = stripComments(readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8'));
  assert.match(src, /store\.exportStoredDoc\(row\.id\)/, 'the card offers no way to save an unopenable trip');
  assert.match(
    src,
    /unreadableRow\s*&&[\s\S]{0,600}store\.exportStoredDoc/,
    'the rescue export is not gated on the unreadable branch',
  );
  assert.ok(
    !/store\.exportActive\(/.test(src),
    'the Library reaches for exportActive, which requires openTrip — the exact thing that fails here',
  );
});

/**
 * **A-46 Part 4: it is a rescue copy, not a backup, and the control says so.** Handing the
 * user something that looks like a restorable backup, when restore is guaranteed to refuse
 * it, would be the promise broken one screen later.
 */
test('I-8e / A-46 Part 4: the control says Cairn cannot re-read the file', () => {
  const src = stripComments(readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8'));
  assert.match(src, /Save a copy/, 'the rescue control is not named');
  assert.match(src, /cannot re-?read/i, 'nothing on the card says the copy is not restorable');
});

/**
 * **A-46 Part 3 clause 4: Delete's confirmation says what Delete costs.** *"Nothing you type
 * ever silently vanishes"*, applied to the one screen where the only affordance was
 * destructive. R34-2 was one step from BLOCKER for exactly this: no warning before the Delete
 * that destroys the only copy.
 */
test('I-8e / A-46 Part 3: Delete on an unreadable row says the stored copy is the only one', () => {
  const src = stripComments(readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8'));
  assert.match(src, /if \(confirm\(/, 'Library.tsx no longer confirms a delete at all');
  const ask = /const ask =([\s\S]{0,900}?);\n/.exec(src);
  assert.ok(ask, 'the delete confirmation is no longer built from a branch this test can read');
  assert.match(ask[1], /unreadableRow\s*\?/, 'the confirmation does not distinguish the unreadable case');
  assert.match(ask[1], /only one/i, 'the confirmation does not say the stored copy is the only one');
  assert.match(ask[1], /save a copy first/i, 'the confirmation does not point at the rescue export');
  assert.match(ask[1], /cannot be undone/, 'the ordinary confirmation lost its own warning');
});

/**
 * **QA R34-2, the builder half.** The banner on tapping such a row was the raw
 * `TripParseError` string — `expected a real calendar date in YYYY-MM-DD (at $.startDate)` —
 * as user-facing prose. `onImport` already does the right thing one control away (*"That file
 * is not a Cairn trip: …"*), so this is the same shape applied to `openTrip`: a sentence
 * first, the parser's path kept after it because it is the only thing that says *where*.
 */
test('R34-2 (builder half): opening a trip that will not parse reports a sentence, not a bare JSON path', () => {
  const src = stripComments(readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8'));
  assert.ok(
    !/onClick=\{\(\)\s*=>\s*run\(store\.openTrip\(row\.id\)\)\}/.test(src),
    'the card still routes openTrip through the bare `run`, so a TripParseError reaches the banner verbatim',
  );
  assert.match(src, /could not be (read|opened)/i, 'no sentence wraps the parser message');
});

/**
 * **QA R34-1 — BLD-3's *"Close this trip"* recovery must actually recover.**
 *
 * The bug was ordering, not the recovery: `recovery.run()` fires the **async**
 * `store.closeTrip()` and the boundary cleared `message` **synchronously in the same
 * handler**. React re-rendered the children immediately, `state.doc` was still the open trip
 * because the promise had not settled, `TripView` threw again, `getDerivedStateFromError`
 * re-latched — and when `closeTrip` finally landed there was nothing left to clear `message`.
 * Round 34 measured the banner still up, `.tripcard` count `0`, and a further unassisted
 * *"Try again"* recovering completely.
 *
 * So the reset waits for the act to take effect. The mechanical floor is that the boundary
 * does not call `setState` on the same statement list as `recovery.run()` without awaiting it;
 * the rendered oracle is `qa/i8e-render.mjs` §A, which clicks the button.
 */
test('R34-1: the boundary clears its banner only after the recovery has actually landed', () => {
  const src = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/App.tsx'), 'utf8'));
  const cls = /class TabBoundary([\s\S]*?)\n}\n/.exec(src);
  assert.ok(cls, 'App.tsx has no TabBoundary class');
  const body = cls[1];
  // The shipped bug, verbatim: run() and the clear in one synchronous statement list.
  assert.ok(
    !/recovery\.run\(\);\s*this\.setState\(\{\s*message:\s*null\s*\}\)/.test(body.replace(/\s+/g, ' ')),
    'the boundary still clears `message` synchronously after an async recovery — R34-1',
  );
  assert.match(body, /Promise\.resolve\(/, 'nothing in the boundary waits for the recovery to settle');
  // …and the recovery's own type has to permit that, or the wait is unobservable.
  assert.match(
    src,
    /type Recovery = \{[^}]*run:\s*\(\)\s*=>\s*[^;}]*Promise/,
    'Recovery.run cannot report when it has landed — the boundary has nothing to await',
  );
  // The async recovery actually returns its promise rather than firing and forgetting.
  assert.match(src, /run:\s*\(\)\s*=>\s*\{[^}]*return run\(store\.closeTrip\(\)\)/,
    '"Close this trip" does not hand its promise back to the boundary');
});

// ---------------------------------------------------------------------------
// ROADMAP Phase 2 I-8h — ARCHITECTURE §4.4 **A-49** Part 5 (the chip list) and **A-50**
// (the pane box, in both directions).
//
// Same instrument as the rest of this file: a source-level floor under criteria whose real
// oracle is rendered output, which lives in `qa/i8h-render.mjs`.

/**
 * **A-49 Part 5 / R37-3 — the chip list renders `frame.codes`, and the view derives nothing.**
 *
 * A-48 C9 reordered `frame.countries` into paint order, the chip list rendered that array
 * verbatim, and the rendered chips went from `AT CZ DE GB HR HU US` to `US DE GB HU AT CZ HR`.
 * A-49 then makes `frame.countries` a **paint list** with one row per (code, pane), so a
 * country with a detached part is in it twice — a country list derived from it would print
 * `FR` twice and hand React two identical keys.
 *
 * The fix is in the contract, not in the view, so the ceiling is greppable: the frame carries
 * `codes`, the list renders that, and the view neither sorts nor dedupes.
 */
test('I-8h / A-49 Part 5: the code-chip list renders frame.codes and derives no order of its own', () => {
  const raw = readFileSync(resolve(VIEWS, 'WorldMap.tsx'), 'utf8');
  const src = stripComments(raw);
  assert.match(src, /frame\.codes\.map\(/, 'the chip list is not rendered from frame.codes');
  assert.ok(!/frame\.countries\.map\(/.test(src),
    'something still renders the PAINT list as a list of countries');
  // The ceiling is over the RAW file, comments included: a ceiling that a comment can satisfy
  // is a ceiling nobody can grep for. `qa/r37-a48.mjs` §H asserts the same three tokens.
  for (const banned of ['.sort(', 'new Set(', 'Object.keys(']) {
    assert.ok(!raw.includes(banned), `WorldMap.tsx re-derives a canonical order: ${banned}`);
  }
});

/**
 * **I-8i / A-51 G8 + A-53 Part 4 — three `role` branches collapse into two, keyed on
 * `pane.home.length`, and EVERY pane gets a caption.**
 *
 * Under C7 the main pane had no caption because it was *"the"* map; A-51 withdraws the
 * hierarchy, so there is no *"the"* map any more and a pane that names nothing is a pane whose
 * countries are unattributable. The one branch that survives is the one A-49 Part 4 consequence
 * 3 ruled on, now derived from `home` rather than from a `role` string: an **extent** pane
 * (`home.length === 0`) is captioned *"Distant parts of"* and may **never** say *"shown
 * separately"*, because that phrase asserts the country is a distant part of the traveller's
 * *record* when it is a distant part of the country's own *geometry*.
 *
 * `pane.home.length === 0` is a length check, not arithmetic over coordinates: A-40 Part 2 and
 * W1 are intact and W3 is unchanged.
 */
test('I-8i / A-51 G8: the caption is derived from `home.length`, and `role` is gone from the view', () => {
  const raw = readFileSync(resolve(VIEWS, 'WorldMap.tsx'), 'utf8');
  const src = stripComments(raw);
  assert.ok(!raw.includes('pane.role'), 'the withdrawn `role` field is still read by the view');
  // The role STRINGS may be named in a comment that explains the withdrawal — that is the
  // record, not the mechanism — but not in code the renderer runs.
  assert.ok(!src.includes("'main'") && !src.includes("'inset'") && !src.includes("'detached'"),
    'the withdrawn role strings survive in the renderer');
  assert.match(src, /pane\.home\.length === 0/, 'the caption is not derived from `home`');
  // The extent branch specifically, on the CAPTION and not just the aria-label: A-41 constraint
  // 3 is about what is on screen beside the frame.
  assert.match(
    src,
    /pane\.home\.length === 0 \? \(\s*<span className="worldmap__panecap-label">Distant parts of<\/span>\s*\) : null/,
    'the extent pane has no caption of its own, or is captioned as an ordinary pane',
  );
  assert.match(src, /Distant parts of \$\{pane\.codes\.join/, 'the aria-label has no extent branch');
  assert.ok(!/shown separately/i.test(src),
    'a pane says "shown separately" — A-49 Part 4 consequence 3, unchanged by A-51');
  assert.match(raw, /may never say "shown separately"/,
    'the rule is no longer stated where the branch that obeys it lives');
  // Every pane carries the caption element, unconditionally — there is no `role` test around it.
  assert.match(src, /<p className="worldmap__panecap">/);
  assert.equal((src.match(/<p className="worldmap__panecap">/g) ?? []).length, 1,
    'there is more than one caption path — that is the hierarchy coming back');
  // …and every caption is still written from `pane.codes`, never re-derived. Four: the
  // `data-pane-codes` attribute, the two `aria-label` branches, and the one caption.
  assert.equal((src.match(/pane\.codes\.join/g) ?? []).length, 4,
    'a pane caption or label stopped being written from pane.codes');
});

/**
 * **A-50 — the pane box is the map, in both directions (QA R37-4).**
 *
 * A-48 Part 6's `aspect-ratio` + static `max-height` fixed only the **wide** direction. At
 * 390 px the box is 356 wide and clamped at 460 tall, so a pane fills it exactly when
 * `aspect ≥ 356/460 = 0.774`; **50 of 239** single-country libraries do not (`MV` 0.170,
 * `CL` 0.258), and the same clamp letterboxes the shipped sample **horizontally** on a
 * desktop (76.8% at 1440 × 700).
 *
 * A-50 is one declaration: the height cap moves into `--pane-cap`, and the `<svg>` is sized
 * `width: min(100%, calc(var(--pane-cap) * var(--pane-aspect)))`. It is still
 * measurement-free — `min()` and `calc()` over a custom property resolve at layout and measure
 * nothing — so W1 and A-41 Part 7's *"no per-screen-size rule"* are untouched, and the frame
 * is byte-identical in bare Node. The rendered oracle is `qa/i8h-render.mjs`.
 */
test('I-8h / A-50: the pane box is sized from the pane\'s own aspect in BOTH directions', () => {
  const css = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8'));
  const rule = /\.worldmap__svg\s*\{([^}]*)\}/.exec(css);
  assert.ok(rule, 'there is no .worldmap__svg rule');
  const body = rule[1].replace(/\s+/g, ' ');
  assert.match(body, /width:\s*min\(100%,\s*calc\(var\(--pane-cap\)\s*\*\s*var\(--pane-aspect[^)]*\)\)\)/,
    'the box is still full-width, so a tall pane still letterboxes horizontally');
  assert.match(body, /aspect-ratio:\s*var\(--pane-aspect/, 'the aspect ratio is no longer the box');
  assert.match(body, /max-height:\s*var\(--pane-cap\)/, 'the height cap is not the custom property');
  assert.match(body, /margin-inline:\s*auto/, 'a narrow box is not centred');
  assert.ok(!/max-height:\s*min\(/.test(body), 'the static max-height clamp is still there');
  // Still measurement-free: no media query decides a pane's size.
  const paneRules = [...css.matchAll(/@media[^{]*\{[\s\S]*?\}\s*\}/g)].map((m) => m[0]);
  for (const q of paneRules) {
    assert.ok(!/worldmap__svg|--pane-cap|--pane-aspect/.test(q),
      'a media query decides the pane box — that is the per-screen-size rule A-41 Part 7 forbids');
  }
});

/**
 * **I-8i / A-51 G7 (QA R38-3) — the panes are an equal grid, and one `--pane-cap` replaces the
 * two role-keyed ones.**
 *
 * A flex row stretches every cell to its tallest sibling, so the shipped sample's US inset
 * filled **44.1%** of its bordered cell at 390 px and a four-pane `inset-2` filled **21.3%** —
 * A-50 measured the `<svg>` and not the cell. `align-items: start` on a grid does not stretch,
 * and one uniform cap removes the asymmetry that made the stretch large.
 *
 * `min()`, `calc()` and `auto-fill` resolve at layout and measure nothing: no `viewBox`, pane
 * count or pane membership varies with screen size, so the frame is byte-identical in bare Node
 * and A-41 Part 7's *"no per-screen-size **frame** rule"* is untouched. The rendered oracle is
 * `qa/i8i-render.mjs`.
 */
test('I-8i / A-51 G7: the pane container is a grid of equal cells, with ONE height cap', () => {
  const css = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8'));
  const panes = /\.worldmap__panes\s*\{([^}]*)\}/.exec(css);
  assert.ok(panes, 'there is no .worldmap__panes rule');
  const body = panes[1].replace(/\s+/g, ' ');
  assert.match(body, /display:\s*grid/, 'the container is still a flex row — R38-3 comes back');
  assert.match(body, /grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(var\(--pane-min[^)]*\),\s*1fr\)\)/,
    'the columns are not equal-weight auto-fill cells');
  assert.match(body, /align-items:\s*start/, 'a grid without `align-items: start` stretches like flex did');
  assert.ok(!/display:\s*flex/.test(body), 'display: flex survives on the pane container');
  // ONE cap, and it is the pane's, not the role's.
  assert.match(css, /\.worldmap__pane[^{-][^{]*\{[^}]*--pane-cap:\s*min\(38vh,\s*300px\)/,
    'the single uniform pane cap is missing');
  assert.ok(!/min\(58vh,\s*460px\)/.test(css), 'the main pane\'s role-keyed cap survives');
  assert.ok(!/min\(22vh,\s*170px\)/.test(css), 'the inset\'s role-keyed cap survives');
  // The three role modifiers are withdrawn with `role` — a stylesheet rule for one is a
  // hierarchy the frame no longer computes.
  for (const banned of ['worldmap__pane--main', 'worldmap__pane--inset', 'worldmap__pane--detached']) {
    assert.ok(!css.includes(banned), `a withdrawn role modifier survives in the stylesheet: ${banned}`);
  }
  // The caption carries no margin of its own. `qa/i8i-render.mjs` measured 8 px of dead space
  // under every caption — the global `p` bottom margin — which a stretching flex row used to
  // hide and `align-items: start` exposes. It is 8 px of slack inside the bordered cell, which
  // is exactly what R38-3's criterion is written to catch.
  const cap = /\.worldmap__panecap\s*\{([^}]*)\}/.exec(css);
  assert.ok(cap, 'there is no .worldmap__panecap rule');
  assert.match(cap[1].replace(/\s+/g, ' '), /margin:\s*0/,
    'the pane caption inherits a bottom margin, so every cell has slack under it');
});
