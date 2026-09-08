/**
 * QA round 57 — the wrapper-return residue (A-78 Part 2), measured rather than assumed.
 * Called by `qa/r57-kd106.sh` §C while `ingestInto` is injected into `derive/lifecycle.ts`.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAIRN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
const lifecycle = await import(resolve(CAIRN, 'packages/core/src/derive/lifecycle.ts'));

if (typeof lifecycle.ingestInto !== 'function') {
  console.log('skip — ingestInto is not injected (clean tree)');
  process.exit(0);
}

const ctx = { ids: core.sequentialIds('r57k-'), now: '2026-08-01', actorUserId: 'local:self' };
const trip = core.createTrip({
  title: 'KD106', startDate: '2026-08-07', endDate: '2026-08-09',
  cities: [{ key: 'v', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
}, ctx);
const withBooking = core.upsertBooking(trip, {
  id: 'bk-1', tripId: trip.id, kind: 'train', operator: 'ÖBB', reference: 'R1',
  startsAt: { date: '2026-08-07', time: '08:00' }, price: null, party: 2, status: 'active',
  ticket: null,
  provenance: {
    source: 'user', state: 'accepted', confidence: 'confirmed',
    addedAt: '2026-08-01', acceptedAt: '2026-08-01', actorUserId: 'local:self',
  },
});

const { trip: out } = lifecycle.ingestInto(withBooking, 'teleport');
let verdict = 'clean', detail = '';
try {
  const bytes = core.toJSON(out);
  try { core.fromJSON(bytes); } catch (e) { verdict = 'UNOPENABLE'; detail = e.message.slice(0, 90); }
} catch (e) { verdict = 'UNSERIALISABLE'; detail = e.message.slice(0, 60); }
console.log(`wrapper-producer verdict: ${verdict}${detail ? ` — ${detail}` : ''}`);
