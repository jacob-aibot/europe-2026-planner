/**
 * QA round 57 — the harm behind R57-1, driven rather than argued.
 *
 * Called by `qa/r57-doorforms.sh` §C **while `TripArchiver` is injected into
 * `packages/core/src/derive/lifecycle.ts`**. On a clean tree it prints `skip` and exits 0.
 *
 * Round 56's oracle, unchanged (`qa/r56-a77.mjs`'s `census`):
 *   REFUSED    — the door threw. The mechanism working.
 *   UNOPENABLE — it saved and can never be opened again. **The defect class.**
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAIRN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
const lifecycle = await import(resolve(CAIRN, 'packages/core/src/derive/lifecycle.ts'));

if (typeof lifecycle.TripArchiver !== 'function') {
  console.log('skip r57 §C — TripArchiver is not injected (clean tree)');
  process.exit(0);
}

const ctx = { ids: core.sequentialIds('r57-'), now: '2026-08-01', actorUserId: 'local:self' };
const trip = core.createTrip({
  title: 'Harm', startDate: '2026-08-07', endDate: '2026-08-09',
  cities: [{ key: 'v', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
}, ctx);

const bogus = {
  conflictId: 'c-1', state: 'bogus', at: '2026-08-01', by: 'local:self',
  note: null, retiredAt: null,
};

const out = new lifecycle.TripArchiver().archive(trip, bogus);
let verdict = 'clean', detail = '';
try {
  const bytes = core.toJSON(out);
  try { core.fromJSON(bytes); } catch (e) { verdict = 'UNOPENABLE'; detail = e.message.slice(0, 90); }
} catch (e) { verdict = 'UNSERIALISABLE'; detail = e.message.slice(0, 60); }

console.log(`class-method door verdict: ${verdict}${detail ? ` — ${detail}` : ''}`);
process.exit(verdict === 'UNOPENABLE' ? 0 : 1);
