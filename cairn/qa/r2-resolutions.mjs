/**
 * Round 2 — F-10 revisited. `syncResolutions` exists in core AND on the store, and
 * NOTHING calls it: `grep -rn syncResolutions apps/web packages/client` finds only its own
 * definition. So the defect it was written for is still live in the product.
 *
 * Run: node qa/r2-resolutions.mjs   (from cairn/)
 */
const core = await import('../packages/core/src/index.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');

const ports = {
  storage: mem.memoryStorage(),
  clock: mem.fixedClockPort('2026-08-25'),
  ids: mem.sequentialIdPort('r'),
  file: mem.memoryFile(),
  scheduler: mem.immediateScheduler(),
};
const store = createStore({ ports, autosave: false });
await store.createTrip({
  title: 'Overlap', startDate: '2026-09-01', endDate: '2026-09-02', homeCurrency: 'EUR',
  cities: [{ key: 'lisbon', name: 'Lisbon', countryCode: 'PT', centre: { lat: 38.72, lng: -9.14 }, order: 0 }],
});
const dayId = store.getState().doc.days[0].id;
const mk = (name, time, dur) => store.dispatch({
  type: 'addStop',
  placement: { kind: 'scheduled', dayId, time, order: 99 },
  stop: { name, category: 'sight', place: { kind: 'inline', at: { lat: 38.72, lng: -9.14 } }, durationMins: dur },
});
mk('Museum', '10:00', 120);
mk('Lunch', '10:30', 60);
const conflicts = () => store.getDerived().conflicts;
line('1. an overlap warning exists');
console.log('  ', conflicts().map((c) => `${c.severity}:${c.ruleId}:${c.id.slice(0, 24)}`).join(' | '));
const target = conflicts().find((c) => c.ruleId === 'overlap');
ok('overlap fires', !!target);

line('2. the user dismisses it');
store.dispatch({ type: 'resolveConflict', resolution: { conflictId: target.id, state: 'dismissed', by: 'local:self', at: '2026-08-25' } });
console.log('  resolution attached:', conflicts().find((c) => c.id === target.id)?.resolution?.state ?? 'none');

line('3. the user edits the value that made it a conflict — the conflict goes away');
const lunch = store.getState().doc.days[0].stops.find((s) => s.name === 'Lunch');
store.dispatch({ type: 'updateStop', stopId: lunch.id, patch: { time: '14:00' } });
console.log('  overlap conflicts now:', conflicts().filter((c) => c.ruleId === 'overlap').length);
console.log('  stored resolutions:', store.getState().doc.resolutions.length,
  JSON.stringify(store.getState().doc.resolutions.map((r) => [r.state, r.retiredAt])));

line('4. the user changes their mind and puts it back — is the conflict live or still dismissed?');
store.dispatch({ type: 'updateStop', stopId: lunch.id, patch: { time: '10:30' } });
const back = conflicts().find((c) => c.ruleId === 'overlap');
console.log('  conflict id identical to the dismissed one:', back?.id === target.id);
console.log('  resolution attached:', back?.resolution?.state ?? 'none');
ok('a conflict the user dismissed once is LIVE again after the data returns to that value',
  !back?.resolution,
  'it comes back already dismissed, with no user action — §2.7 is what syncResolutions exists to prevent, and nothing in the app calls it');

line('5. calling store.syncResolutions() by hand at the right moment DOES fix it');
const s2 = createStore({ ports: { ...ports, storage: mem.memoryStorage(), ids: mem.sequentialIdPort('q') }, autosave: false });
await s2.createTrip({ title: 'Overlap2', startDate: '2026-09-01', endDate: '2026-09-02', homeCurrency: 'EUR', cities: [] });
const d2 = s2.getState().doc.days[0].id;
const add = (name, time, dur) => s2.dispatch({ type: 'addStop', placement: { kind: 'scheduled', dayId: d2, time, order: 99 }, stop: { name, category: 'sight', place: { kind: 'none' }, durationMins: dur } });
add('A', '10:00', 120); add('B', '10:30', 60);
const c2 = s2.getDerived().conflicts.find((c) => c.ruleId === 'overlap');
s2.dispatch({ type: 'resolveConflict', resolution: { conflictId: c2.id, state: 'dismissed', by: 'local:self', at: '2026-08-25' } });
const b2 = s2.getState().doc.days[0].stops.find((s) => s.name === 'B');
s2.dispatch({ type: 'updateStop', stopId: b2.id, patch: { time: '14:00' } });
s2.syncResolutions();                       // <- the call nothing in apps/web makes
console.log('  after syncResolutions, retiredAt:', JSON.stringify(s2.getState().doc.resolutions.map((r) => r.retiredAt)));
s2.dispatch({ type: 'updateStop', stopId: b2.id, patch: { time: '10:30' } });
const back2 = s2.getDerived().conflicts.find((c) => c.ruleId === 'overlap');
console.log('  resolution attached after revert:', back2?.resolution?.state ?? 'none (correct)');

line('6. who calls syncResolutions in the shipped app?');
const { readFileSync, readdirSync, statSync } = await import('node:fs');
const { resolve } = await import('node:path');
const walk = (d) => readdirSync(d).flatMap((n) => {
  const f = resolve(d, n);
  return statSync(f).isDirectory() ? walk(f) : /\.(ts|tsx)$/.test(f) ? [f] : [];
});
const callers = [];
for (const f of [...walk(resolve(import.meta.dirname, '../apps/web/src')), ...walk(resolve(import.meta.dirname, '../packages/client/src'))]) {
  const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  src.split('\n').forEach((l, i) => { if (/syncResolutions\s*\(/.test(l) && !/function |^\s*\*/.test(l)) callers.push(`${f.split('/cairn/')[1]}:${i + 1} ${l.trim().slice(0, 70)}`); });
}
console.log('  call sites:', callers.length ? callers.join('\n   ') : 'NONE');
