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
