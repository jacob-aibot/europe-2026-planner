/**
 * Phase 2 I-0 — the measured baseline. The six numbers every later increment is measured
 * against, re-derived by RUNNING rather than quoted from any document (ROADMAP Phase 2, "four
 * rules that apply to every increment": *ceilings are re-derived by running, never quoted*).
 *
 * Run: node qa/baseline.mjs   (from cairn/)
 *
 * It prints, and asserts, exactly six things:
 *   1. `detectConflicts` blocker count on the unmodified reference trip at `FIXTURE_TODAY`
 *   2. the full severity split behind it
 *   3-4. `geoCheck` on the CLEAN trip: 0/112 scheduled stops, 0/94 places
 *   5-6. `geoCheck` detection rate under a +1° latitude fault injected on each record in turn:
 *        112/112 scheduled stops, 92/94 places (the two permitted misses are named)
 *
 * `geoCheck` is reached by module path on purpose: `qa/` attacking an internal is what
 * ARCHITECTURE §2.10 exempts, and `geoCheck` is on the index anyway.
 */
const core = await import('../packages/core/src/index.ts');
const gc = await import('../packages/core/src/derive/geoCheck.ts');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');

let fails = 0;
const ok = (n, c, x = '') => {
  if (!c) fails++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
};

const { trip } = loadEurope2026();

console.log('== the fixed clock ==');
console.log('  FIXTURE_TODAY =', FIXTURE_TODAY, '(before the trip starts, so §8.2\'s feasibility gate is a no-op here)');

console.log('\n== detectConflicts on the unmodified reference trip ==');
const conf = core.detectConflicts(trip, { today: FIXTURE_TODAY });
const bySev = conf.reduce((a, c) => ((a[c.severity] = (a[c.severity] || 0) + 1), a), {});
const blockers = conf.filter((c) => c.severity === 'blocker');
for (const b of blockers) console.log(`  blocker: ${b.ruleId} @ ${b.subjects.map((s) => `${s.kind}:${s.id}`).join(', ')}`);
console.log('  severities:', JSON.stringify(bySev));
ok('exactly 2 blockers (ROADMAP §C: the legacy_flag days Aug 18 and Aug 20)', blockers.length === 2, String(blockers.length));
ok('...and both are legacy_flag on Aug 18 / Aug 20',
  blockers.every((b) => b.ruleId === 'legacy_flag') &&
    ['2026-08-18', '2026-08-20'].every((d) => blockers.some((b) => b.subjects.some((s) => s.id === d))),
  JSON.stringify(blockers.map((b) => [b.ruleId, b.subjects.map((s) => s.id)])));
ok('4 warnings, 11 notes', bySev.warning === 4 && bySev.note === 11, JSON.stringify(bySev));

console.log('\n== geoCheck on the CLEAN trip ==');
const schedWithCoord = trip.days.flatMap((d) => d.stops).filter((s) => core.stopLatLng(s, trip));
const coordPlaces = trip.places.filter((p) => p.at && Number.isFinite(p.at.lat));
const clean = gc.geoCheck(trip).filter((f) => f.confidence === 'certain');
const cleanStops = clean.filter((f) => f.ref.kind === 'stop').length;
const cleanPlaces = clean.filter((f) => f.ref.kind === 'place').length;
console.log(`  ${cleanStops}/${schedWithCoord.length} scheduled stops · ${cleanPlaces}/${coordPlaces.length} places`);
ok('0/112 scheduled stops', cleanStops === 0 && schedWithCoord.length === 112, `${cleanStops}/${schedWithCoord.length}`);
ok('0/94 places', cleanPlaces === 0 && coordPlaces.length === 94, `${cleanPlaces}/${coordPlaces.length}`);

console.log('\n== geoCheck detection rate under a +1° latitude fault, one record at a time ==');
const moveStop = (t, id, d) => ({
  ...t,
  days: t.days.map((day) => ({
    ...day,
    stops: day.stops.map((s) => {
      if (s.id !== id) return s;
      const at = core.stopLatLng(s, t);
      return at ? { ...s, place: { kind: 'inline', at: { lat: at.lat + d, lng: at.lng } } } : s;
    }),
  })),
});
const movePlace = (t, id, d) => ({
  ...t,
  places: t.places.map((p) => (p.id === id ? { ...p, at: { lat: p.at.lat + d, lng: p.at.lng } } : p)),
});

let hitStops = 0;
const missedStops = [];
for (const day of trip.days) {
  for (const s of day.stops) {
    if (!core.stopLatLng(s, trip)) continue;
    if (gc.geoCheck(moveStop(trip, s.id, 1)).some((f) => f.confidence === 'certain')) hitStops++;
    else missedStops.push(`${day.id} ${s.name}`);
  }
}
let hitPlaces = 0;
const missedPlaces = [];
for (const p of coordPlaces) {
  if (gc.geoCheck(movePlace(trip, p.id, 1)).some((f) => f.confidence === 'certain' && f.ref.id === p.id)) hitPlaces++;
  else missedPlaces.push(p.name);
}
console.log(`  ${hitStops}/${schedWithCoord.length} scheduled stops · ${hitPlaces}/${coordPlaces.length} places`);
console.log('  permitted misses:', JSON.stringify(missedPlaces));
ok('112/112 scheduled stops', hitStops === 112 && schedWithCoord.length === 112, `${hitStops}/${schedWithCoord.length}`);
ok('92/94 places, and the two misses are the ones §2.13 names', hitPlaces === 92 &&
  JSON.stringify([...missedPlaces].sort()) === JSON.stringify(['Blue Cave, Biševo', 'Stiniva Cove, Vis'].sort()),
  `${hitPlaces}/${coordPlaces.length} misses=${JSON.stringify(missedPlaces)}`);
ok('no scheduled stop went undetected', missedStops.length === 0, JSON.stringify(missedStops));

console.log(`\n== baseline: ${fails} FAIL ==\n`);
