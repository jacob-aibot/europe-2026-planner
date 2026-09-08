/**
 * QA round 57 — the harm behind R57-2, driven rather than argued.
 *
 * Called by `qa/r57-nondoors.sh` §C, with `addPlace`'s `commit` call deleted from
 * `packages/core/src/build/stops.ts`. Round 54's oracle: does the door write a document that can
 * never be opened again?
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAIRN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
const stops = await import(resolve(CAIRN, 'packages/core/src/build/stops.ts'));

const ctx = { ids: core.sequentialIds('r57n-'), now: '2026-08-01', actorUserId: 'local:self' };
const trip = core.createTrip({
  title: 'NonDoors', startDate: '2026-08-07', endDate: '2026-08-09',
  cities: [{ key: 'v', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
}, ctx);

let verdict = 'clean', detail = '';
try {
  const out = stops.addPlace(trip, {
    id: 'pl-1', cityKey: 'v', name: 'Belvedere', at: { lat: 48.19, lng: 16.38 },
    category: 'transport',   // outside Place['category'] — `fromJSON` refuses it
  });
  try {
    const bytes = core.toJSON(out);
    try { core.fromJSON(bytes); } catch (e) { verdict = 'UNOPENABLE'; detail = e.message.slice(0, 90); }
  } catch (e) { verdict = 'UNSERIALISABLE'; detail = e.message.slice(0, 60); }
} catch (e) { verdict = 'REFUSED'; detail = e.message.slice(0, 90); }

console.log(`addPlace verdict: ${verdict}${detail ? ` — ${detail}` : ''}`);
