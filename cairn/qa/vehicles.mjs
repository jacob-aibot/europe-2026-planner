/**
 * Adjudicating `impossible_transfer` on vehicle stops.
 *
 * Question: the builder names three artifact cases (LAX, LHR, Dubrovnik->Split). Is three the
 * true count, or is the rule silent on the others by luck rather than by design?
 */
const core = await import('../packages/core/src/index.ts');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');
const { trip } = loadEurope2026();
const T = { today: FIXTURE_TODAY };

const VEHICLE_MODES = new Set(['flight', 'bus', 'train', 'ferry', 'boat', 'speedboat', 'coach', 'tram', 'metro', 'funicular', 'cablecar', 'car', 'taxi', 'walk', 'transit']);
const VEHICLE_OWN_JOURNEY = new Set(['flight', 'bus', 'train', 'ferry', 'boat', 'speedboat', 'coach']);

const fired = new Set(
  core.detectConflicts(trip, T)
    .filter((c) => c.ruleId === 'impossible_transfer')
    .map((c) => c.params.dayId + '|' + c.params.toName),
);

console.log('Every stop whose `arrival` describes a vehicle journey rather than a transfer');
console.log('(mode in flight/bus/train/ferry/boat/speedboat/coach), across all 16 days:');
console.log('');
console.log('  day        mode        mins  prev->this gap  fires?  stop');
console.log('  ---------- ---------- -----  --------------  ------  -------------------------------------');

let candidates = 0, firing = 0, silentBecauseGapIsBigger = 0, silentNoTime = 0, silentFirstStop = 0;
for (const day of trip.days) {
  const legs = core.computeLegs(day, trip);
  for (let i = 0; i < day.stops.length; i++) {
    const s = day.stops[i];
    if (!s.arrival || !VEHICLE_OWN_JOURNEY.has(s.arrival.mode)) continue;
    candidates++;
    const prev = i > 0 ? day.stops[i - 1] : null;
    if (!prev) { silentFirstStop++; console.log(`  ${day.id}  ${s.arrival.mode.padEnd(10)} ${String(s.arrival.mins).padStart(5)}  first stop      —       ${s.name.slice(0, 40)}`); continue; }
    const t0 = core.timeVal(prev.placement.time);
    const t1 = core.timeVal(s.placement.time);
    if (t0 >= 99999 || t1 >= 99999) { silentNoTime++; console.log(`  ${day.id}  ${s.arrival.mode.padEnd(10)} ${String(s.arrival.mins).padStart(5)}  no clock time   —       ${s.name.slice(0, 40)}`); continue; }
    const gap = t1 - t0;
    const f = fired.has(day.id + '|' + s.name);
    if (f) firing++; else silentBecauseGapIsBigger++;
    console.log(`  ${day.id}  ${s.arrival.mode.padEnd(10)} ${String(s.arrival.mins).padStart(5)}  ${String(gap).padStart(5)} min       ${f ? 'FIRES ' : '  -   '}  ${s.name.slice(0, 40)}`);
  }
}

console.log('');
console.log(`  vehicle-journey stops in the trip : ${candidates}`);
console.log(`  currently firing                  : ${firing}`);
console.log(`  silent only because the printed gap happens to exceed the journey : ${silentBecauseGapIsBigger}`);
console.log(`  silent because a clock time is missing : ${silentNoTime}`);
console.log(`  silent because they are the day's first stop : ${silentFirstStop}`);

console.log('');
console.log('The same question for every OTHER arrival mode (transfers proper):');
const byMode = {};
for (const day of trip.days) {
  for (const s of day.stops) {
    if (!s.arrival) continue;
    byMode[s.arrival.mode] = byMode[s.arrival.mode] ?? { n: 0, fires: 0 };
    byMode[s.arrival.mode].n++;
    if (fired.has(day.id + '|' + s.name)) byMode[s.arrival.mode].fires++;
  }
}
for (const [m, v] of Object.entries(byMode).sort((a, b) => b[1].n - a[1].n)) {
  console.log(`  ${m.padEnd(12)} ${String(v.n).padStart(3)} stops, ${v.fires} firing${VEHICLE_OWN_JOURNEY.has(m) ? '   <- vehicle-journey mode' : ''}`);
}

console.log('');
console.log('Fragility check — how close are the silent vehicle stops to firing?');
for (const day of trip.days) {
  const stops = day.stops;
  for (let i = 1; i < stops.length; i++) {
    const s = stops[i];
    if (!s.arrival || !VEHICLE_OWN_JOURNEY.has(s.arrival.mode)) continue;
    const t0 = core.timeVal(stops[i - 1].placement.time);
    const t1 = core.timeVal(s.placement.time);
    if (t0 >= 99999 || t1 >= 99999) continue;
    const gap = t1 - t0;
    if (s.arrival.mins <= gap) {
      console.log(`  ${day.id} "${s.name.slice(0, 38)}" would start firing if its previous stop moved ${gap - s.arrival.mins + 1} min later`);
    }
  }
}
