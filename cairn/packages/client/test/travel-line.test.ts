/**
 * `travelLine` — ARCHITECTURE §2.12's consumer row for the day view (QA R2-10).
 *
 * The model half of `travelRole` shipped and was correct (21 journey / 81 transfer / 10
 * unknown on the reference trip), and **no view read it**. So Aug 8 rendered
 *
 *     14:30
 *     Condor … → Vienna (VIE)
 *     ✈️ Flight · 1h 20m · 621 km
 *
 * — a leg drawn INTO the stop, with 14:30 reading as an arrival. It is not: 14:30 is when
 * the aircraft leaves Frankfurt. That is the exact misreading §2.12 was written to correct,
 * and it is the single thing most likely to mislead on a travel day.
 *
 * The string-shaping lives here rather than in `apps/web` for two reasons: it is testable in
 * plain Node (which `apps/web` is not, by §3's dependency rule), and `apps/mobile` inherits
 * it, which is §4.3's "web and mobile differ only in port implementations and view
 * components". The wall-clock arithmetic is display-only and carries no timezone — §7, and
 * the reason `journey_overrun` is deferred to Phase 4.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { travelLine } from '../src/index.ts';
import type { MoveOverride, Stop } from '../src/deps.ts';

function stop(patch: Partial<Stop> & { time?: string | null }): Stop {
  const { time, ...rest } = patch;
  return {
    id: 'stop-1',
    placement: { kind: 'scheduled', dayId: '2026-08-08', time: time ?? null, order: 0 },
    name: 'A stop',
    category: 'transit',
    place: { kind: 'none' },
    note: '',
    cost: null,
    arrival: null,
    travelRole: 'transfer',
    bookingId: null,
    flags: [],
    provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-08-01', acceptedAt: '2026-08-01', actorUserId: 'local:self' },
    durationMins: null,
    ...rest,
  } as Stop;
}

const FLIGHT: MoveOverride = { mode: 'flight', mins: 80 };

test('a journey stop says departs, how long, and arrives — the Aug 8 Condor case', () => {
  const line = travelLine(stop({ travelRole: 'journey', arrival: FLIGHT, time: '14:30' }));
  assert.equal(line.kind, 'journey');
  assert.equal(line.text, 'departs 14:30 · 1h 20m · arrives 15:50');
  assert.equal(line.departs, '14:30');
  assert.equal(line.arrives, '15:50');
  assert.equal(line.nextDay, false);
});

test('a journey stop says departs, how long, and arrives — the Aug 18 airport bus case', () => {
  const line = travelLine(stop({ travelRole: 'journey', arrival: { mode: 'bus', mins: 40 }, time: '05:30' }));
  assert.equal(line.text, 'departs 05:30 · 40 min · arrives 06:10');
});

test('a journey that lands the next day says so rather than pretending it is the same day', () => {
  // The Aug 7 LAX run is 660 minutes off a late-afternoon departure. Wrapping silently to
  // "arrives 05:20" with no marker would be a new version of the bug this rule fixes.
  const line = travelLine(stop({ travelRole: 'journey', arrival: { mode: 'flight', mins: 660 }, time: '18:20' }));
  assert.equal(line.arrives, '05:20');
  assert.equal(line.nextDay, true);
  assert.match(line.text, /arrives 05:20 \(\+1 day\)/);
});

test('a journey with no time falls back to the duration alone — it never invents a clock', () => {
  const line = travelLine(stop({ travelRole: 'journey', arrival: FLIGHT, time: null }));
  assert.equal(line.kind, 'journey');
  assert.equal(line.departs, null);
  assert.equal(line.arrives, null);
  assert.equal(line.text, '1h 20m');
});

test('a journey with no duration says only when it departs', () => {
  const line = travelLine(stop({ travelRole: 'journey', arrival: null, time: '14:30' }));
  assert.equal(line.arrives, null);
  assert.equal(line.text, 'departs 14:30');
});

test('a transfer stop keeps today\'s string unchanged — the time on its own', () => {
  const line = travelLine(stop({ travelRole: 'transfer', arrival: { mode: 'metro', mins: 20 }, time: '09:15' }));
  assert.equal(line.kind, 'transfer');
  assert.equal(line.text, '09:15');
  assert.equal(line.departs, null);
  assert.equal(line.arrives, null);
});

test('an unknown stop keeps the time and is marked as needing the user to say', () => {
  const line = travelLine(stop({ travelRole: 'unknown', arrival: { mode: 'boat', mins: 30 }, time: '11:00' }));
  assert.equal(line.kind, 'unknown');
  assert.equal(line.text, '11:00');
  assert.equal(line.arrives, null, 'an unknown role may not be rendered as if it were a journey');
});

test('a pooled stop has no time at all and does not crash', () => {
  const pooled = stop({ travelRole: 'journey', arrival: FLIGHT });
  const line = travelLine({ ...pooled, placement: { kind: 'pool', cityKey: 'vienna' } } as Stop);
  assert.equal(line.departs, null);
  assert.equal(line.text, '1h 20m');
});

test('a malformed time is not arithmetic — it is passed through, never guessed', () => {
  const line = travelLine(stop({ travelRole: 'journey', arrival: FLIGHT, time: 'lunchtime' }));
  assert.equal(line.arrives, null, 'the model stores HH:MM or null; anything else is not a clock');
  assert.equal(line.departs, 'lunchtime');
});

test('every travelRole produces a line — the switch is total', () => {
  for (const role of ['transfer', 'journey', 'unknown'] as const) {
    const line = travelLine(stop({ travelRole: role, arrival: FLIGHT, time: '08:00' }));
    assert.equal(line.kind, role);
    assert.ok(line.text.length > 0, `${role} rendered nothing`);
  }
});
