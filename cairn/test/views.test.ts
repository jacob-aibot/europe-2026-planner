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
  // I-8a registered two and said the third was *"a registration, not a second shell"*. I-8b is
  // the registration. Three is also the ceiling: I-8's "no DISCOVER tab" is asserted below.
  assert.deepEqual(ids, ['trips', 'map', 'profile'], 'the shell registers Trips, Map and Profile, and nothing else');
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
test('I-8f / A-47 Part 4: the card carries TWO gates — the wide `rowUnopenable` and the narrow `rowDatesReadable`', () => {
  const src = stripComments(readFileSync(resolve(VIEWS, 'Library.tsx'), 'utf8'));
  assert.match(
    src,
    /import\s*\{[^}]*\browDatesReadable\b[^}]*\}\s*from\s*'@cairn\/client'/,
    'rowDatesReadable must come from @cairn/client — a hand-rolled calendar in a view is the defect A-46 closes',
  );
  assert.match(
    src,
    /import\s*\{[^}]*\browUnopenable\b[^}]*\}\s*from\s*'@cairn\/client'/,
    'rowUnopenable must come from @cairn/client — A-47 Part 3: the union lives in ONE place',
  );
  assert.match(
    src,
    /const\s+unopenable\s*=\s*rowUnopenable\(state,\s*row\)/,
    'the wide gate is not A-47 Part 3\'s selector, called once per row',
  );
  assert.match(
    src,
    /const\s+datesReadable\s*=\s*rowDatesReadable\(row\)/,
    'the narrow gate is gone — A-47 Part 4 keeps the meta line on `rowDatesReadable`',
  );
  // A-46's single boolean is withdrawn (A-47 Part 3). Its NAME going is not the point; its
  // being the thing that gates the chip, the control and Delete is.
  assert.ok(
    !/unreadableRow/.test(src),
    'A-46\'s single `unreadableRow` boolean survives — A-47 Part 3 withdraws it: it did three jobs with one predicate',
  );
  // The wrong predicates, named so the fault is red rather than merely absent.
  assert.ok(
    !/(unopenable|unreadableRow)\s*=[^;]*rowLifecycle\(/.test(src),
    'the card signal is rowLifecycle-based — A-46 Part 1: `2026-02-30` classifies as `completed` and the chip goes silent',
  );
  assert.ok(
    !/isIsoDate\s*\(/.test(src),
    'the view calls isIsoDate itself instead of the client selector — the predicate is asked once, in one place',
  );
});

/**
 * **A-47 Part 3, the centralisation clause, as a ceiling rather than a spot check.** *"After
 * this there is exactly one expression in the codebase that decides whether a card is
 * flagged."* The injected fault is inlining the union in `Library.tsx`, which is what a builder
 * reaching for `state.openFailures` directly would produce.
 *
 * `ScanNote`'s header count is the one exemption, and it is `scan.unreadable.length` — a
 * statement about a *pass*, not about a card. A-47 Part 4 states explicitly that it does not
 * widen: *"their details are the last ones we managed to work out"* is true only of the rescan
 * population, and widening it would make it false.
 */
test('I-8f / A-47 Part 3: no view re-derives the union — `openFailures` and `rescan.unreadable` are read once, in the selector', () => {
  const offenders: string[] = [];
  for (const name of readdirSync(resolve(CAIRN, 'apps/web/src'), { recursive: true, encoding: 'utf8' })) {
    if (!/\.tsx?$/.test(name)) continue;
    const src = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src', name), 'utf8'));
    if (/openFailures|rescan\.unreadable/.test(src)) offenders.push(name);
  }
  assert.deepEqual(offenders, [], 'a view reaches past `rowUnopenable` for the raw facts');

  const client = stripComments(readFileSync(resolve(CAIRN, 'packages/client/src/selectors/index.ts'), 'utf8'));
  assert.equal(
    (client.match(/export function rowUnopenable/g) ?? []).length,
    1,
    'rowUnopenable has more than one definition',
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
  // **A-47 Part 4 keeps this clause on the NARROW predicate**, and that is the whole finding
  // here: a row with good dates over a document with a bad `days[3].date` has a perfectly good
  // range, and printing it raw would be a regression R34-4 does not ask for. Pointing this at
  // `unopenable` is I-8f's third injected fault.
  assert.match(
    src,
    /datesReadable\s*\?\s*dateRangeLabel\(row\)\s*:\s*storedDatesLabel\(row\)/,
    'the meta line does not branch A-46 Part 3 clause 2\'s way, on A-47 Part 4\'s narrow predicate',
  );
  assert.ok(
    !/unopenable\s*\?\s*storedDatesLabel/.test(src),
    'the meta line is gated on the WIDE predicate — A-47 Part 4: a readable row must keep its proper label',
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
  // A-47 Part 4: *"the unreadable branch"* now means `rowUnopenable(state, row)`. Gating it on
  // `rowDatesReadable` alone — I-8e's shipped predicate — is I-8f's first injected fault.
  assert.match(
    src,
    /\{unopenable\s*&&[\s\S]{0,900}store\.exportStoredDoc/,
    'the rescue export is not gated on A-47\'s wide predicate',
  );
  assert.ok(
    !/datesReadable\s*&&[\s\S]{0,900}store\.exportStoredDoc/.test(src),
    'the rescue export is gated on the narrow predicate — R35-1 measured exactly that gap',
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
  // A-47 Part 4, stated plainly because R35-1 asked: Delete's warning and the rescue control
  // share ONE wide boolean. They are two halves of one sentence — a warning that says "save a
  // copy first" on a card with no save control is a lie, and a save control with a silent
  // Delete beside it is R34-2 unchanged. Gating this on `datesReadable` is I-8f's second
  // injected fault: the ordinary sentence with the rescue control still on screen beside it.
  assert.match(ask[1], /\bunopenable\s*\?/, 'the confirmation is not on A-47\'s wide predicate');
  assert.ok(
    !/\bdatesReadable\s*\?/.test(ask[1]),
    'Delete\'s warning is on the narrow predicate — the exact conflation R35-1 measured',
  );
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
 * **I-8j / A-54 G7′ + G7″ (manager's I-8i gate, MGR-1) — the panes are a wrapping flex line box
 * whose cells fill their line, and no cell draws a boundary of its own.**
 *
 * **A-51 G7's grid is SUPERSEDED IN FULL and its criterion is named here rather than deleted.**
 * G7 made this a column grid with `align-items: start`; that fixed R38-3 (no cell letterboxes)
 * and introduced a worse defect one box out — a grid row is as tall as its tallest cell and a
 * grid's last row has as many cells as it has items, so anything the cells did not cover painted
 * in `var(--line)`, the separator ink. Measured: **29.0%** of the Europe 2026 card, **45.6%** of
 * `FR`+`US`, and **66.7%** of any one-pane library at ≥ 960 px. At 320 px the same rule
 * overflowed its container by 12 px, because `minmax(300px, 1fr)` has a hard floor and the inner
 * box is 288 px.
 *
 * A flex line is always full (every item grows), its items are all its height (`stretch`, the
 * default), and `min-width: 0` with a shrink factor of 1 lets a lone cell go below `--pane-min` —
 * so `Σ cell area = container area − gaps`, **by construction rather than below a threshold**.
 *
 * **G7″ is what keeps R38-3 fixed** now that R38-3's own cell criterion is withdrawn: the cell
 * has no border, outline or box-shadow and keeps `var(--card)`, so the residual slack reads as
 * whitespace around a map rather than as a letterbox in a delimited box. The rendered oracle is
 * `qa/i8j-render.mjs`; this is its source-level floor.
 */
test('I-8j / A-54 G7′: the pane container is a wrapping flex line box, and G7″ leaves the cell unbordered', () => {
  const css = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8'));
  const panes = /\.worldmap__panes\s*\{([^}]*)\}/.exec(css);
  assert.ok(panes, 'there is no .worldmap__panes rule');
  const body = panes[1].replace(/\s+/g, ' ');
  assert.match(body, /display:\s*flex/, 'the container is not a flex line box — MGR-1 comes back');
  assert.match(body, /flex-wrap:\s*wrap/, 'a flex line that cannot wrap is one row of squeezed cells');
  // The superseded rule, named: any of these three coming back IS the defect A-54 fixed.
  assert.ok(!/display:\s*grid/.test(body), 'A-51 G7\'s grid is back — up to 66.7% of the card paints as separator ink');
  assert.ok(!/grid-template-columns/.test(body), 'the auto-fill track list is back, with its 300 px hard floor');
  assert.ok(!/align-items:\s*start/.test(body),
    '`align-items: start` is back — a cell shorter than its line leaves a hole in the container');
  // The separator and the container ink are unchanged by A-54, verbatim.
  assert.match(body, /gap:\s*1px/, 'the 1 px separator gap is not the separator any more');
  assert.match(body, /background:\s*var\(--line\)/, 'the container no longer shows the separator colour');

  // G7′ on the cell: grow 1, shrink 1, basis --pane-min, and a min-width that permits the shrink.
  const pane = /\.worldmap__pane\s*\{([^}]*)\}/.exec(css);
  assert.ok(pane, 'there is no .worldmap__pane rule');
  const cell = pane[1].replace(/\s+/g, ' ');
  assert.match(cell, /flex:\s*1 1 var\(--pane-min,\s*300px\)/,
    'the cell does not grow to fill its line, or cannot shrink below --pane-min (the 320 px overflow)');
  assert.match(cell, /min-width:\s*0/, 'without `min-width: 0` a flex item cannot shrink below its basis');

  // **G7″** — no cell may draw a boundary of its own.
  for (const banned of [/border\s*:/, /border-(top|right|bottom|left)\s*:/, /outline\s*:/, /box-shadow\s*:/]) {
    assert.ok(!banned.test(cell), `G7″: the cell draws a boundary of its own — ${banned}`);
  }
  assert.match(cell, /background:\s*var\(--card\)/,
    'G7″: the cell background must equal .worldmap__figure\'s, or the slack reads as a hole');

  // ONE cap, and it is the pane's, not the role's — A-51 G7's surviving half, unchanged by A-54.
  // I-8b / DESIGN §3.3 R3 changes the UNIT and nothing else: `38vh` → `38svh`. See the dedicated
  // greppable ceiling further down, which is the criterion with the injected fault behind it.
  assert.match(css, /\.worldmap__pane[^{-][^{]*\{[^}]*--pane-cap:\s*min\(38svh,\s*300px\)/,
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
  // hide and `align-items: start` exposed. Under G7′ that space is inside a card-coloured,
  // unbordered cell, so it is no longer visible ink; the rule stays because 8 px of dead space
  // under a caption is still 8 px the map could have had.
  const cap = /\.worldmap__panecap\s*\{([^}]*)\}/.exec(css);
  assert.ok(cap, 'there is no .worldmap__panecap rule');
  assert.match(cap[1].replace(/\s+/g, ' '), /margin:\s*0/,
    'the pane caption inherits a bottom margin, so every cell has slack under it');
});

// ---------------------------------------------------------------------------
// ROADMAP Phase 2 **I-8b** — the Profile, the shell's five bounded changes, and the
// mobile-first responsive contract. `docs/DESIGN.md` §3, §5 and §6; `ARCHITECTURE.md` §9.1
// makes that document binding, so a rule below is a clause of it and not a preference.
//
// Everything here is a SOURCE-LEVEL ceiling, in the shape A-40's W1 grep established: it is the
// floor under the rendered matrix, not a substitute for it. What a stylesheet says and what a
// browser computes are different claims, and §6's whole first line is *"a design decision that
// was not rendered was not verified."* The rendered half is `qa/i8b-render.mjs`.

/** Every `@media` prelude in the stylesheet, comments stripped. */
function mediaQueries(css: string): string[] {
  return [...stripComments(css).matchAll(/@media([^{]+)\{/g)].map((m) => m[1].trim());
}

test('I-8b / DESIGN §3.2: the stylesheet is mobile-first — `min-width` only, and four breakpoints', () => {
  const css = readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8');
  const queries = mediaQueries(css);

  // The measured starting point §3.1 states plainly: the entire shipped layout system was **two
  // `max-width: 900px` rules**, i.e. a desktop-first stylesheet with one breakpoint. A single
  // `max-width` anywhere is that pattern coming back, because a `max-width` rule is by
  // construction an exception carved out of a desktop base.
  const maxWidth = queries.filter((q) => /max-width/.test(q));
  assert.deepEqual(maxWidth, [], 'a `max-width` media query is back — the base case is not the phone');

  // §3.2: four breakpoints, named once, and **no new breakpoint without a measured reason
  // recorded there**. 900 is kept deliberately: it is the threshold `.trip` already shipped with.
  const widths = [...new Set(
    queries.flatMap((q) => [...q.matchAll(/min-width:\s*(\d+)px/g)].map((m) => Number(m[1]))),
  )].sort((a, b) => a - b);
  assert.deepEqual(widths, [600, 900, 1280],
    'the breakpoint set is not §3.2\'s — a new one needs a measured reason in DESIGN.md first');

  // The two feature queries that are not layout. They are allowed and they are the whole
  // remainder: a third kind of `@media` would be a layout mechanism nobody named.
  const features = queries.filter((q) => !/min-width/.test(q));
  assert.deepEqual(
    [...new Set(features)].sort(),
    ['(prefers-color-scheme: dark)', '(prefers-reduced-motion: reduce)'],
    'an unnamed media feature is deciding layout',
  );

  // §3.5 / §3.4: no layout may depend on `orientation` — the breakpoints are width-only, so a
  // landscape phone is simply a **wide phone**.
  assert.ok(!/orientation/.test(stripComments(css)), 'a rule branches on orientation');
});

test('I-8b / §9.2 fence 1: no media query reaches the world map\'s pane grid', () => {
  // A-41 Part 7 and W1 forbid a per-screen-size FRAME rule; §3.3 forbids adding any media query
  // to `.worldmap__panes`, because a per-screen-size CELL rule is one refactor away from being
  // one. Asserted over the block bodies, not the preludes.
  const css = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8'));
  const blocks = [...css.matchAll(/@media[^{]+\{((?:[^{}]|\{[^{}]*\})*)\}/g)].map((m) => m[1]);
  const offenders = blocks.filter((b) => /\.worldmap__panes?\b/.test(b));
  assert.deepEqual(offenders, [], 'a media query sizes the atlas frame — §9.2 fence 1');
});

test('I-8b / DESIGN §3.3 R3: no `vh` or `dvh` survives on a fixed-height scroll container', () => {
  // ROADMAP I-8b criterion 2, verbatim: *"`38vh` may not appear on `--pane-cap` and `100dvh` may
  // not appear on `.spine`'s `max-height`."* The rule of thumb behind both, written once in
  // §3.3: **`svh` for anything with a fixed/sticky height that must not move while scrolling;
  // `dvh` only for a full-bleed element that should follow the chrome.**
  const css = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8'));

  const cap = /--pane-cap:\s*([^;]+);/.exec(css);
  assert.ok(cap, 'there is no `--pane-cap` declaration');
  assert.match(cap[1], /38svh/, '`--pane-cap` is not the small viewport unit');
  assert.ok(!/\d\s*vh\b/.test(cap[1]), '`--pane-cap` is back on `vh` — it moves when Safari\'s chrome does');

  // Every `max-height` in the file, wherever it is: a scroll container's cap is the case R3 is
  // about, and there is no `max-height` in this stylesheet that is not one.
  const caps = [...css.matchAll(/max-height:\s*([^;}]+)/g)].map((m) => m[1].trim());
  const bad = caps.filter((v) => /\bdvh\b/.test(v) || /\d\s*vh\b/.test(v));
  assert.deepEqual(bad, [], 'a capped-height container is sized in `vh`/`dvh` and will resize mid-scroll');

  // `.app`'s `min-height: 100dvh` is the ONE correct `dvh` and it stays — it is the full-bleed
  // case, not a scroll container. Asserting it present keeps the fix from being "delete all dvh".
  assert.match(css, /\.app\s*\{[^}]*min-height:\s*100dvh/,
    '`.app`\'s `min-height: 100dvh` is gone — R3 keeps it; it is the full-bleed case');
});

test('I-8b / DESIGN §3.3 R1+R2: the tab bar is a bottom bar at base, and the chrome is one sticky stack', () => {
  const css = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8'));
  const app = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/App.tsx'), 'utf8'));

  // R2. The number this replaces, named so it cannot come back by hand.
  assert.ok(!/top:\s*2\.7rem/.test(css),
    '`.tabbar`\'s hardcoded `top: 2.7rem` is back — a topbar wrap stacks the two bars');
  assert.match(css, /\.chrome\s*\{[^}]*position:\s*sticky[^}]*top:\s*0/s,
    'there is no single sticky wrapper over the topbar and the tab bar');
  // The topbar must NOT be sticky in its own right any more — two sticky bars is the defect.
  const topbar = /\.topbar\s*\{([^}]*)\}/.exec(css);
  assert.ok(topbar, 'there is no .topbar rule');
  assert.ok(!/position:\s*sticky/.test(topbar[1]), 'the topbar is sticky inside a sticky wrapper');
  // The input that made the old number wrong: a topbar that can wrap is a topbar whose height is
  // not the token claiming to be its height.
  assert.match(topbar[1], /flex-wrap:\s*nowrap/, 'the topbar can wrap, so `--chrome-h` is a guess');

  // R1, base. Bottom-anchored, opaque, above the home-indicator inset.
  const bar = /\n\.tabbar\s*\{([^}]*)\}/.exec(css);
  assert.ok(bar, 'there is no .tabbar rule');
  assert.match(bar[1], /position:\s*fixed/, 'the tab bar is not bottom-anchored at base (R1)');
  assert.match(bar[1], /bottom:\s*0|inset:\s*auto 0 0 0/, 'the fixed tab bar is not at the bottom');
  assert.match(bar[1], /padding-bottom:\s*env\(safe-area-inset-bottom/,
    'the bottom bar does not clear the home indicator');
  assert.match(bar[1], /background:\s*var\(--paper\)/, 'the bottom bar is not opaque (P8)');
  assert.ok(!/backdrop-filter/.test(bar[1]), 'the bottom bar is blurred — I-8a removal 1 is permanent');

  // R1's consequence: the page clears the bar, so the last row of any list is reachable.
  assert.match(css, /\.app\s*\{[^}]*padding-bottom:\s*calc\(var\(--tabbar-h\)\s*\+\s*env\(safe-area-inset-bottom/s,
    'the page does not reserve room for the fixed bottom bar');

  // R1, split. **Same DOM, same tablist** — the reposition is CSS, so there is exactly one
  // `role="tablist"` in the shell and exactly one `.tabbar` element.
  assert.equal((app.match(/role="tablist"/g) ?? []).length, 1, 'a second navigation appeared');
  assert.equal((app.match(/className="tabbar"/g) ?? []).length, 1, 'the bar is rendered twice');
  const split = [...css.matchAll(/@media \(min-width: 900px\) \{((?:[^{}]|\{[^{}]*\})*)\}/g)]
    .map((m) => m[1]).join('\n');
  assert.ok(split.length > 0, 'there is no split breakpoint block');
  assert.match(split, /\.tabbar\s*\{[^}]*position:\s*static/,
    'the bar does not return to the sticky stack from split up');
});

test('I-8b / DESIGN §3.1 defect 1: `viewport-fit=cover` is paid for with real safe-area padding', () => {
  const html = readFileSync(resolve(CAIRN, 'apps/web/index.html'), 'utf8');
  const css = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8'));

  // The combination §3.1 measured: the meta tag opts into the display cutout and the stylesheet
  // used `env(safe-area-inset-*)` **zero** times, which is what puts content under the home
  // indicator and behind the notch in landscape.
  assert.match(html, /viewport-fit=cover/, 'the viewport meta no longer opts into the cutout');
  const uses = [...css.matchAll(/env\(safe-area-inset-(top|right|bottom|left)/g)].map((m) => m[1]);
  for (const side of ['top', 'right', 'bottom', 'left']) {
    assert.ok(uses.includes(side), `no rule pads for the ${side} safe-area inset`);
  }
  // Every one carries a fallback, so a browser that does not support `env()` gets `0px` rather
  // than an invalid declaration that drops the whole property.
  const bare = [...css.matchAll(/env\(safe-area-inset-[a-z]+\s*\)/g)].map((m) => m[0]);
  assert.deepEqual(bare, [], 'an `env(safe-area-inset-*)` has no fallback value');
});

test('I-8b / DESIGN §3.4: the four named touch targets clear the 44 px primary floor', () => {
  const css = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8'));
  assert.match(css, /--tap:\s*44px/, 'the primary touch target is not declared once as a token');

  // §5.6 item 4 names exactly these, and §3.1 defect 3 has the measured numbers: `.icon` 26 × 26,
  // `.tabbar__tab` ≈ 35 px, `.btn`/`.chip` ≈ 31 px.
  for (const sel of ['\\.tabbar__tab', '\\.btn', 'button\\.chip, label\\.chip']) {
    const rule = new RegExp(`${sel}\\s*\\{[^}]*min-height:\\s*var\\(--tap\\)`);
    assert.ok(rule.test(css), `${sel} does not carry the 44 px floor`);
  }
  // `.icon` is the named failure and the named FIX is different in kind: *"its hit area grows to
  // 44 × 44 (padding or a pseudo-element), its visual box may stay 26."*
  assert.match(css, /\.icon\s*\{[^}]*width:\s*26px[^}]*height:\s*26px/s, '`.icon`\'s visual box moved — §3.4 says it may stay 26');
  assert.match(css, /\.icon::after\s*\{[^}]*width:\s*var\(--tap\)[^}]*height:\s*var\(--tap\)/s,
    '`.icon` has no 44 × 44 hit area');
  // The grown hit area is only safe over §3.4's ≥ 8 px adjacent spacing; the shipped gap was 2.4.
  const tools = /\.stop__tools\s*\{([^}]*)\}/.exec(css);
  assert.ok(tools, 'there is no .stop__tools rule');
  const gap = /gap:\s*([\d.]+)rem/.exec(tools[1]);
  assert.ok(gap && Number(gap[1]) * 16 >= 8, `adjacent icon targets are ${gap?.[1]}rem apart — §3.4 wants ≥ 8 px`);
});

test('I-8b / DESIGN §3.4: the tablist takes arrow keys, Home and End, with a roving tabindex', () => {
  const src = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/App.tsx'), 'utf8'));
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
    assert.ok(src.includes(`'${key}'`), `the tablist does not handle ${key}`);
  }
  assert.match(src, /tabIndex=\{t\.id === tab \? 0 : -1\}/,
    'the tablist is not a single tab stop — every tab is in the tab order');
  assert.match(src, /aria-selected=\{t\.id === tab\}/, 'the tabs lost their selected state');
});

test('I-8b / DESIGN §1 P6: the motion budget holds in the stylesheet', () => {
  const css = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8'));

  // Every duration in the file, in ms. §6.2: **≤ 300 ms** for anything, and §5.5 caps the one
  // animation on the Profile at **180 ms**.
  const durations = [...css.matchAll(/(?:transition|animation)[^;{}]*?([\d.]+)(m?s)/g)]
    .map((m) => (m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1])));
  assert.ok(durations.length > 0, 'no duration was found at all — the parser is wrong, not the CSS');
  assert.deepEqual(durations.filter((d) => d > 300), [], 'a transition is over P6\'s 300 ms ceiling');
  assert.match(css, /--dur-row:\s*(\d+)ms/, 'the row expansion has no named duration');
  assert.ok(Number(/--dur-row:\s*(\d+)ms/.exec(css)![1]) <= 180, 'the row expansion is over §5.5\'s 180 ms');

  // P6: *"easing is a named curve, never `ease`/`ease-in-out` defaults, and never bounce or
  // elastic."* `ease-in` is the one §6.2 names outright — it delays the moment the user is
  // watching. The `--ease-out` value is the vendored `animate` skill's table entry, not an
  // approximation, which is that skill's own hard rule 2.
  assert.ok(!/\bease-in\b/.test(css), 'a bare `ease-in` timing function is in the stylesheet');
  assert.match(css, /--ease-out:\s*cubic-bezier\(0\.23,\s*1,\s*0\.32,\s*1\)/,
    'the named easing curve is missing or was re-approximated');
  // Nothing bounces, overshoots or springs: a negative or >1 control point on the Y axis is what
  // an elastic curve looks like, and P6 forbids the family rather than one instance.
  for (const [, y1, y2] of css.matchAll(/cubic-bezier\(\s*[\d.-]+\s*,\s*([\d.-]+)\s*,\s*[\d.-]+\s*,\s*([\d.-]+)\s*\)/g)) {
    for (const y of [Number(y1), Number(y2)]) {
      assert.ok(y >= 0 && y <= 1.001, `a curve overshoots (${y}) — P6 forbids bounce and elastic`);
    }
  }

  // Every animated selector has a reduced-motion reset. Asserted per selector rather than as a
  // count, because *"the stylesheet already honours it in two places and must honour it
  // everywhere"* is the clause, and a count passes while a third selector goes unhandled.
  const reduced = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{((?:[^{}]|\{[^{}]*\})*)\}/g)]
    .map((m) => m[1]).join('\n');
  const animated = [...css.matchAll(/([^{}]+)\{[^}]*\btransition:\s*(?!none)[^;}]+/g)]
    .map((m) => m[1].trim().split(/\s*,\s*/)).flat()
    .map((s) => s.replace(/:{1,2}[a-z-]+(\([^)]*\))?/g, '').trim())
    .filter((s) => s && !s.startsWith('@') && !s.startsWith(':root'));
  for (const sel of new Set(animated)) {
    assert.ok(reduced.includes(sel), `${sel} animates and has no prefers-reduced-motion reset`);
  }
});

test('I-8b / DESIGN §1 P3: the completed lifecycle chip is not the quietest ink on the screen', () => {
  const css = stripComments(readFileSync(resolve(CAIRN, 'apps/web/src/styles.css'), 'utf8'));
  const chip = (stage: string) => {
    const m = new RegExp(`\\.chip--life-${stage}\\s*\\{([^}]*)\\}`).exec(css);
    assert.ok(m, `there is no .chip--life-${stage} rule`);
    return /(?:^|;)\s*color:\s*var\((--[a-z-]+)\)/.exec(m[1])?.[1] ?? null;
  };
  // P3: *"`completed` is a dashed outline, never lower contrast, never lower ink."* The ink
  // ladder, quietest first — `completed` may not sit below `planned` on it. The rendered
  // assertion (computed contrast, both colour schemes) is `qa/i8b-render.mjs`.
  const LADDER = ['--ink-faint', '--ink-dim', '--ink-soft', '--ink'];
  const completed = chip('completed');
  const planned = chip('planned');
  assert.ok(completed && planned, 'a lifecycle chip has no ink of its own');
  assert.ok(
    LADDER.indexOf(completed) >= LADDER.indexOf(planned),
    `completed (${completed}) is quieter than planned (${planned}) — the past is being archived`,
  );
  // The distinction that carries the meaning is a channel neither other stage uses.
  assert.match(css, /\.chip--life-completed\s*\{[^}]*border-style:\s*dashed/s,
    'completed lost its dashed outline, which is what distinguishes it without dimming it');
});

// ---------------------------------------------------------------------------
// I-8b — the Profile surface itself.

const PROFILE = () => readFileSync(resolve(VIEWS, 'Profile.tsx'), 'utf8');

test('I-8b / DESIGN §5.2: the Profile renders all four movements, and no fifth thing', () => {
  const src = stripComments(PROFILE());

  // 1. the claim — one typographic statement, marked up as pairs (§3.5) rather than three tiles.
  assert.match(src, /<dl className="claim"/, 'the identity line is not a `<dl>` — a stat reads as a pair');
  assert.ok(!/statrow/.test(src), '`.statrow`\'s three boxes are what §5.3 replaces');
  // 2. the record — hairline rows, no card, no chevron.
  assert.match(src, /className="crlist"/, 'there is no country record');
  assert.ok(!/\bcard\b/.test(src), 'a section of this screen is a card — §5.3: no section on this screen is a card');
  assert.ok(!/chevron|›|▸|▾/.test(src), 'a disclosure chevron appeared — §5.3 forbids it');
  // 3. its shape over time — the lifecycle counts, `completed` FIRST (P3).
  const stages = [...src.matchAll(/\{ stage: '(completed|active|planned)', label:/g)].map((m) => m[1]);
  assert.deepEqual(stages, ['completed', 'active', 'planned'], 'the lifecycle counts do not lead with `completed`');
  // 4. what we do not know — content, in the shipped gap idiom.
  assert.match(src, /className="profile__gap"/, 'the unattributed block is missing');

  // §5.1's fence, as a grep. **A screen that needs one of these to look good has failed §0 rule
  // B**, and the failure mode is a builder adding a slot for a thing the roadmap has not built.
  for (const forbidden of [
    'photo', 'avatar', 'achievement', 'badge', 'streak', 'goal', 'participant',
    'distance', 'discover', 'coming soon', 'placeholder',
  ]) {
    assert.ok(!new RegExp(forbidden, 'i').test(src), `the Profile invents ${forbidden} — DESIGN §0 rule B / §5.1`);
  }
});

test('I-8b / DESIGN §5.1: the Profile computes no statistic of its own', () => {
  const src = stripComments(PROFILE());
  // Every number on this screen is read off `TravelStats`. §8.4 clause 2 and §0.7 one layer up:
  // a count assembled in a view is a second answer to a question core already answers — and
  // `state.library.length` is NOT the number of trips this record is made of, because a
  // `planned` trip contributes nothing to it.
  assert.ok(!/state\.library\.length/.test(src), 'the Profile counts the library itself');
  assert.ok(!/\.filter\([^)]*\)\.length/.test(src.replace(/unplacedCities|cities\.length/g, '')),
    'the Profile derives a count by filtering instead of reading TravelStats');
  assert.match(src, /travelHistory\(/, 'the Profile does not read `travelStats` through its gate');
  // The refusal boundary — ROADMAP I-8's own criterion, on this surface.
  assert.match(src, /history\.ok/, 'the Profile does not branch on the read gate');
  assert.match(src, /HistoryRefusal/, 'the Profile has no refusal path');
  // The I-6 rescan indicator, on screen and not merely in state.
  assert.match(src, /summaryScan\(/, 'the Profile never asks how current its rows are');
  assert.match(src, /Recomputing/, 'nothing on the Profile says a rescan is running');
});

test('I-8b / DESIGN §5.5: "could not be read" is one vocabulary across both surfaces', () => {
  // §5.5 asks for *"the same component and the same words"* as the world map; §5.6 fences
  // `WorldMap.tsx` as a zero-line diff for this increment. The mechanical fence wins and the
  // duplication is kept honest by this assertion rather than by intent — see `Refusal.tsx`.
  const refusal = readFileSync(resolve(VIEWS, 'Refusal.tsx'), 'utf8');
  const map = readFileSync(resolve(VIEWS, 'WorldMap.tsx'), 'utf8');
  const sentences = [
    'We could not read your travel history.',
    'is not readable.',
    'One of the stored trip records is not readable.',
  ];
  for (const s of sentences) {
    assert.ok(refusal.includes(s), `the shared refusal lost the sentence: ${s}`);
    assert.ok(map.includes(s), `the world map's refusal drifted from the shared one: ${s}`);
  }
  assert.match(readFileSync(resolve(VIEWS, 'Profile.tsx'), 'utf8'), /HistoryRefusal/,
    'the Profile writes its own refusal instead of using the shared one');
});

test('I-8b / DESIGN §5.5: the country drill-down is an inline expansion, not a dialog', () => {
  const src = stripComments(PROFILE());
  // §5.5 rules it as an inline expansion, *"which is both the better interaction and the reason
  // the standing shadcn revisit trigger is not hit"* (A-55). A dialog here would be a component
  // library decision made by a builder.
  assert.ok(!/role="dialog"|<dialog|Modal|createPortal/.test(src), 'the drill-down opens a dialog');
  assert.match(src, /aria-expanded=\{isOpen\}/, 'the row does not report its own expanded state');
  assert.match(src, /aria-controls=\{`crow-trips-/, 'the expanded panel is not associated with its row');
  // A collapsed panel may not hold a tab stop.
  assert.match(src, /tabIndex=\{isOpen \? 0 : -1\}/, 'a collapsed row still holds focusable controls');
});

test('I-8b: `WorldMap.tsx` is a zero-line diff, and `packages/` is untouched by this surface', () => {
  // §5.6's *"Explicitly not in I-8b"* list, as far as a test in this repo can see it: the Profile
  // imports the map's renderer nowhere, adds no dependency, and bumps no version.
  const src = stripComments(PROFILE());
  assert.ok(!/WorldMap|worldMapFrame|COUNTRY_INDEX/.test(src),
    'the Profile draws a map — A-40 Part 5: `TripSummaryRow` carries no city coordinate');
  const pkg = JSON.parse(readFileSync(resolve(CAIRN, 'apps/web/package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ['leaflet', 'react', 'react-dom'],
    'a runtime dependency was added to apps/web — that is an architect decision (A-55 Part 0)');
});
