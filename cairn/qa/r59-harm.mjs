/**
 * QA round 59 — the harm behind R59-1, driven rather than argued. The successor to
 * `qa/r58-harm.mjs`, at exactly the same bar (R56-1's oracle).
 *
 * Called by `qa/r59-harm.sh` **while the union-member carriers are injected into
 * `packages/core/src/derive/lifecycle.ts`**. On a clean tree it prints `skip` and exits 0.
 *
 *   REFUSED    — the door threw. The mechanism working.
 *   UNOPENABLE — it saved and can never be opened again. **The defect class.**
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAIRN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
const lifecycle = await import(resolve(CAIRN, 'packages/core/src/derive/lifecycle.ts'));

const carriers = [
  ['Rule.autofix?: Door | Inert   (N9/N11, a THIRD shape sideways)', () => lifecycle.r59rule?.autofix],
  ['{ archive: Door | Inert }     (union member in a property)', () => lifecycle.r59ops?.archive],
  ['Map<string, Door | Inert>     (union member in a Map)', () => lifecycle.r59map?.get('a')],
];

const live = carriers.filter(([, get]) => {
  try { return typeof get() === 'function'; } catch { return false; }
});
if (live.length === 0) {
  console.log('skip r59 harm — no carrier is injected (clean tree)');
  process.exit(0);
}

const bogus = {
  conflictId: 'c-1', state: 'bogus', at: '2026-08-01', by: 'local:self',
  note: null, retiredAt: null,
};

let worst = 0;
for (const [label, get] of live) {
  const ctx = { ids: core.sequentialIds('r59-'), now: '2026-08-01', actorUserId: 'local:self' };
  const trip = core.createTrip({
    title: 'Harm', startDate: '2026-08-07', endDate: '2026-08-09',
    cities: [{ key: 'v', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
  }, ctx);

  let verdict = 'clean'; let detail = '';
  try {
    const out = get()(trip, bogus);
    try {
      const bytes = core.toJSON(out);
      try { core.fromJSON(bytes); } catch (e) { verdict = 'UNOPENABLE'; detail = e.message.slice(0, 90); }
    } catch (e) { verdict = 'UNSERIALISABLE'; detail = e.message.slice(0, 60); }
  } catch (e) { verdict = 'REFUSED'; detail = e.message.slice(0, 60); }
  if (verdict === 'UNOPENABLE') worst = 1;
  console.log(`hidden-door verdict [${label}]: ${verdict}${detail ? ` — ${detail}` : ''}`);
}
process.exit(worst === 1 ? 0 : 1);
