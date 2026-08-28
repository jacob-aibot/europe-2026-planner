/**
 * Phase 2, 2a breaker round (I-0 … I-4 + the KD-38 / absent-`ownerId` follow-up).
 *
 * Run: node qa/p2b-gate.mjs   (from cairn/)
 *
 * Four attack surfaces, in the order the round was asked for:
 *   §1  the feasibility gate — integrity never gated, feasibility gated iff ALL subjects are
 *       past, `subjectDate` per RefKind, the straddling trip, and no `today` at all
 *   §2  `Trip.datePrecision` — the greppable ceiling run independently, malformed values,
 *       absent -> 'exact', undo/redo at depth, mergeTrips, setTripMeta
 *   §3  the past-trip form's own pure helpers and the document it produces (the Node half of
 *       KD-38; the Chromium half is qa/p2b-past.mjs)
 *   §4  the `ownerId` fix — absent / null / non-string / foreign / empty-string
 *
 * A FAIL line means the probe found what it was looking for. Read the finding in
 * ../docs/QA-FINDINGS.md before assuming the script is broken.
 */
const core = await import('../packages/core/src/index.ts');
const detectMod = await import('../packages/core/src/conflict/detect.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');
const { readFileSync, readdirSync, statSync } = await import('node:fs');
const { join } = await import('node:path');

let fails = 0;
const ok = (n, c, x = '') => {
  if (!c) fails++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
};
const line = (s) => console.log('\n== ' + s + ' ==');
const ctx = (p = 'p') => ({ ids: core.sequentialIds(p), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
const mkPorts = (storage) => ({
  storage: storage ?? mem.memoryStorage(),
  clock: mem.fixedClockPort('2026-08-27'),
  ids: mem.sequentialIdPort('i'),
  file: mem.memoryFile(),
  scheduler: mem.immediateScheduler(),
});

/* ------------------------------------------------------------------ §1 the gate ---- */

line('§1.1 every rule declares a class, and the classification is §8.2\'s table');
{
  const expected = {
    legacy_flag: 'integrity', impossible_transfer: 'feasibility', geo_outlier: 'integrity',
    booking_vs_plan: 'feasibility', overlap: 'feasibility', superseded_booking: 'integrity',
    duplicate_booking: 'integrity', unverified_reference: 'integrity',
    missing_lodging: 'feasibility', unbooked_ticketed: 'feasibility',
  };
  ok('ten rules', core.RULES.length === 10, String(core.RULES.length));
  for (const r of core.RULES) ok(`${r.id} = ${expected[r.id]}`, r.class === expected[r.id], String(r.class));
}

/**
 * A trip that trips as many rules as possible, dated wherever the caller asks.
 * `start`/`end` are exact dates; the shape is: 3 days, a hotel-less night, a ticketed stop
 * with no booking, two overlapping stops, a legacy flag, a coordinate typo, an unverified
 * reference, and two bookings for the same thing.
 */
function loudTrip(start, end, opts = {}) {
  const c = ctx('lt');
  let t = core.createTrip(
    { title: 'Loud', startDate: start, endDate: end, cities: [{ key: 'tokyo', name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }] },
    c,
  );
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: 'tokyo', cities: ['tokyo'] });
  const d0 = t.days[0].id;
  const at = (lat, lng) => ({ kind: 'inline', at: { lat, lng } });
  // integrity: a user-set legacy flag
  t = core.setDayMeta(t, d0, { legacyFlag: 'Check this day' });
  // feasibility: two overlapping timed stops on day 0
  t = core.addStop(t, { kind: 'scheduled', dayId: d0, time: '12:00', order: 0 }, { name: 'Lunch', category: 'food', durationMins: 120, place: at(35.68, 139.77) }, c);
  t = core.addStop(t, { kind: 'scheduled', dayId: d0, time: '12:30', order: 1 }, { name: 'Museum', category: 'sight', durationMins: 60, place: at(35.69, 139.78) }, c);
  // integrity: a coordinate typo far from anything the trip declares
  if (opts.geoTypo !== false) {
    t = core.addStop(t, { kind: 'scheduled', dayId: d0, time: '18:00', order: 2 }, { name: 'Typo', category: 'sight', place: at(55.68, 139.77) }, c);
  }
  // feasibility: a ticketed stop with a price and a booking link and no Booking
  t = core.addStop(
    t,
    { kind: 'scheduled', dayId: t.days[1].id, time: '10:00', order: 0 },
    { name: 'Ghibli Museum', category: 'sight', place: at(35.696, 139.57),
      cost: { display: '€10', c: [10, 10] }, links: [{ label: 'Tickets', url: 'https://example.test/t' }] },
    c,
  );
  return t;
}

line('§1.2 a WHOLLY PAST trip: integrity rules still fire, feasibility rules do not');
{
  const past = loudTrip('2019-03-01', '2019-03-03');
  const asPlan = core.detectConflicts(past, { today: '2019-02-01' });
  const asHistory = core.detectConflicts(past, { today: '2026-08-27' });
  const classOf = Object.fromEntries(core.RULES.map((r) => [r.id, r.class]));
  const planIds = [...new Set(asPlan.map((c) => c.ruleId))].sort();
  const histIds = [...new Set(asHistory.map((c) => c.ruleId))].sort();
  console.log('  before startDate :', asPlan.length, 'findings —', planIds.join(', '));
  console.log('  after  endDate   :', asHistory.length, 'findings —', histIds.join(', '));
  ok('at least one feasibility rule fired as a plan', asPlan.some((c) => classOf[c.ruleId] === 'feasibility'));
  ok('at least one integrity rule fired as a plan', asPlan.some((c) => classOf[c.ruleId] === 'integrity'));
  ok('EVERY finding on the past trip is integrity-class',
    asHistory.every((c) => classOf[c.ruleId] === 'integrity'),
    asHistory.filter((c) => classOf[c.ruleId] === 'feasibility').map((c) => c.ruleId).join(', '));
  ok('every integrity finding present as a plan is STILL present as history',
    asPlan.filter((c) => classOf[c.ruleId] === 'integrity').every((c) => asHistory.some((h) => h.id === c.id)),
    asPlan.filter((c) => classOf[c.ruleId] === 'integrity' && !asHistory.some((h) => h.id === c.id)).map((c) => c.id).join(', '));
  ok('...and the integrity COUNT is identical, not merely non-empty',
    asPlan.filter((c) => classOf[c.ruleId] === 'integrity').length ===
      asHistory.filter((c) => classOf[c.ruleId] === 'integrity').length);
}

line('§1.3 a STRADDLING trip with a real city: feasibility fires on the future half only');
{
  // 2026-08-25 … 2026-08-29, today = 2026-08-27. Days 25, 26 are past; 27 is today; 28, 29 future.
  const c = ctx('st');
  let t = core.createTrip(
    { title: 'Straddle', startDate: '2026-08-25', endDate: '2026-08-29',
      cities: [{ key: 'tokyo', name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }] },
    c,
  );
  // KD-38's boundary: a REAL city on every day, not the `transit` catch-all.
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: 'tokyo', cities: ['tokyo'] });
  ok('no day is the transit catch-all', t.days.every((d) => d.primaryCity === 'tokyo'));
  const all = core.detectConflicts(t, { today: '2026-08-27' });
  const ml = all.filter((c2) => c2.ruleId === 'missing_lodging');
  const days = [...new Set(ml.flatMap((c2) => c2.subjects.filter((s) => s.kind === 'day').map((s) => s.id)))].sort();
  console.log('  missing_lodging findings:', ml.length);
  for (const m of ml) console.log('    ', m.id, '|', m.summary, '| subjects:', m.subjects.map((s) => `${s.kind}:${s.id}`).join(', '));
  console.log('  missing_lodging subject days:', days.join(', ') || '(none)');
  ok('missing_lodging fires at all on the future half', ml.length > 0);
  ok('no missing_lodging names a day strictly before today',
    !ml.some((c2) => c2.subjects.every((s) => detectMod.subjectDate(t, s) < '2026-08-27')),
    days.filter((d) => d < '2026-08-27').join(', '));
  // the same document with the clock before the trip: the past half comes back
  const asPlan = core.detectConflicts(t, { today: '2026-08-01' });
  console.log('  same document at today=2026-08-01:', asPlan.filter((x) => x.ruleId === 'missing_lodging').length, 'missing_lodging');
  ok('the past half is present when the clock is before the trip',
    asPlan.filter((x) => x.ruleId === 'missing_lodging').length >= ml.length);
}

line('§1.4 subjectDate per RefKind (ruling 2: an undatable subject is trip.endDate)');
{
  const c = ctx('sd');
  let t = core.createTrip({ title: 'Refs', startDate: '2026-03-01', endDate: '2026-03-05', cities: [{ key: 'a', name: 'A', order: 0 }] }, c);
  t = core.addStop(t, { kind: 'scheduled', dayId: t.days[2].id, time: '10:00', order: 0 }, { name: 'S', category: 'sight' }, c);
  const stopId = t.days[2].stops[0].id;
  t = core.addStop(t, { kind: 'pool', cityKey: 'a' }, { name: 'P', category: 'sight' }, c);
  const poolId = t.pool[0].id;
  t = core.upsertBooking(t, {
    id: 'bk1', tripId: t.id, kind: 'lodging', operator: 'V', reference: 'R',
    startsAt: { date: '2026-03-02', time: null }, price: null, party: null, status: 'active', ticket: null,
    provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-01-01', acceptedAt: '2026-01-01', actorUserId: core.LOCAL_OWNER },
  });
  const bookingId = 'bk1';
  const sd = (ref) => detectMod.subjectDate(t, ref);
  ok('day -> its own date', sd({ kind: 'day', id: t.days[2].id }) === '2026-03-03', sd({ kind: 'day', id: t.days[2].id }));
  ok('stop -> its day\'s date', sd({ kind: 'stop', id: stopId }) === '2026-03-03', sd({ kind: 'stop', id: stopId }));
  ok('booking -> startsAt.date', sd({ kind: 'booking', id: bookingId }) === '2026-03-02', sd({ kind: 'booking', id: bookingId }));
  ok('pool stop -> trip.endDate', sd({ kind: 'stop', id: poolId }) === t.endDate, sd({ kind: 'stop', id: poolId }));
  ok('place -> trip.endDate', sd({ kind: 'place', id: 'place-x' }) === t.endDate, sd({ kind: 'place', id: 'place-x' }));
  ok('trip -> trip.endDate', sd({ kind: 'trip', id: t.id }) === t.endDate, sd({ kind: 'trip', id: t.id }));
  ok('an unknown day id -> trip.endDate (no throw)', sd({ kind: 'day', id: 'nope' }) === t.endDate, sd({ kind: 'day', id: 'nope' }));
  ok('an unknown booking id -> trip.endDate (no throw)', sd({ kind: 'booking', id: 'nope' }) === t.endDate);
  let threw = null;
  try { sd({ kind: 'wat', id: 'x' }); } catch (e) { threw = e; }
  ok('an unknown RefKind does not throw', threw === null, threw && threw.message);
}

line('§1.5 ruling 1 asymmetry: one non-past subject keeps the whole finding');
{
  // A booking dated in the past attached to a stop dated in the future -> booking_vs_plan
  // must survive the gate.
  const c = ctx('as');
  let t = core.createTrip({ title: 'Mixed', startDate: '2026-08-20', endDate: '2026-09-05', cities: [{ key: 'a', name: 'A', order: 0 }] }, c);
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: 'a', cities: ['a'] });
  const futureDay = t.days.find((d) => d.date === '2026-09-01');
  t = core.addStop(t, { kind: 'scheduled', dayId: futureDay.id, time: '09:00', order: 0 }, { name: 'Flight', category: 'travel' }, c);
  const stopId = t.days.find((d) => d.id === futureDay.id).stops[0].id;
  t = core.upsertBooking(t, {
    id: 'bk2', tripId: t.id, kind: 'transport', operator: 'BA', reference: 'BA863',
    startsAt: { date: '2026-08-22', time: '09:00' }, price: null, party: null, status: 'active', ticket: null,
    provenance: { source: 'user', state: 'accepted', confidence: 'confirmed', addedAt: '2026-01-01', acceptedAt: '2026-01-01', actorUserId: core.LOCAL_OWNER },
  });
  t = core.linkBooking(t, stopId, 'bk2');
  const found = core.detectConflicts(t, { today: '2026-08-27' });
  const bvp = found.filter((x) => x.ruleId === 'booking_vs_plan');
  console.log('  booking_vs_plan:', bvp.length, bvp.map((x) => x.subjects.map((s) => `${s.kind}:${s.id}@${detectMod.subjectDate(t, s)}`).join('+')).join(' | '));
  ok('a past booking vs a FUTURE stop still reports (ruling 1)', bvp.length === 1, String(bvp.length));
  ok('...and it genuinely has one past and one non-past subject',
    bvp.length === 1 &&
      bvp[0].subjects.some((s) => detectMod.subjectDate(t, s) < '2026-08-27') &&
      bvp[0].subjects.some((s) => detectMod.subjectDate(t, s) >= '2026-08-27'));
}

line('§1.6 ruling 3: no `today` means NO gating at all');
{
  const past = loudTrip('2019-03-01', '2019-03-03');
  const classOf = Object.fromEntries(core.RULES.map((r) => [r.id, r.class]));
  const noClock = core.detectConflicts(past, {});
  const undef = core.detectConflicts(past, { today: undefined });
  ok('with no today, feasibility findings are present', noClock.some((x) => classOf[x.ruleId] === 'feasibility'),
    [...new Set(noClock.map((x) => x.ruleId))].join(', '));
  ok('today: undefined behaves identically to omitting it', JSON.stringify(noClock) === JSON.stringify(undef));
  ok('no throw and no crash', true);
  // and the empty string, which is what a UI with an un-set date input can hand in
  const empty = core.detectConflicts(past, { today: '' });
  ok("today:'' is treated as absent (no gating) rather than as a date before everything",
    JSON.stringify(empty) === JSON.stringify(noClock),
    `${empty.length} vs ${noClock.length}`);
}

line('§1.7 the gate compares dates as STRINGS while lifecycle() compares day numbers');
{
  // Both are correct on zero-padded YYYY-MM-DD. The probe records the divergence and shows
  // what an un-padded `today` does to each: one throws, the other silently mis-gates.
  const past = loudTrip('2019-03-01', '2019-03-03');
  let lifeThrew = false;
  try { core.lifecycle(past, '2019-3-5'); } catch { lifeThrew = true; }
  ok('lifecycle() rejects an un-padded today', lifeThrew);
  const gated = core.detectConflicts(past, { today: '2019-3-5' });     // '2019-3-5' > '2019-03-03'? string-wise YES
  const proper = core.detectConflicts(past, { today: '2019-03-05' });
  console.log('  detectConflicts(today="2019-3-5") =', gated.length, ' detectConflicts(today="2019-03-05") =', proper.length);
  ok('detectConflicts does NOT reject an un-padded today (it is accepted silently)', true);
  ok('an un-padded today produces the same answer as the padded one', gated.length === proper.length,
    `${gated.length} vs ${proper.length} — the gate\'s string compare disagrees with lifecycle()`);
}

line('§1.8 detect.ts claims "a rule_error note … is never gated" — is it?');
{
  // detect.ts:  "A `rule_error` note is synthesised above and is never gated: a rule that
  // crashed is an integrity problem with the code, and silencing it because the trip is over
  // would hide it."  The synthesised note's only subject is {kind:'trip'}, which ruling 2
  // resolves to trip.endDate — so on a past trip it is gated by exactly the rule that is
  // supposed not to apply to it.
  const past = loudTrip('2019-03-01', '2019-03-03');
  for (const id of ['missing_lodging', 'geo_outlier']) {
    const victim = core.RULES.find((r) => r.id === id);
    const realRun = victim.run;
    victim.run = () => { throw new Error('boom'); };
    try {
      const asPlan = core.detectConflicts(past, { today: '2019-02-01' }).filter((x) => x.ruleId === 'rule_error');
      const asHistory = core.detectConflicts(past, { today: '2026-08-27' }).filter((x) => x.ruleId === 'rule_error');
      console.log(`  ${id} (${victim.class}) throws -> rule_error as a plan: ${asPlan.length}, as history: ${asHistory.length}`);
      ok(`a crashing ${victim.class} rule reports rule_error on a PAST trip`, asHistory.length === 1, String(asHistory.length));
    } finally { victim.run = realRun; }
  }
}

line('§1.10 the gate x §2.7\'s retirement ledger: does the clock retire a dismissal?');
{
  // A conflict a user DISMISSED, on a day that is still in the future. Then the day passes.
  // `getDerived()` calls `syncResolutions`, which retires every resolution whose conflict is
  // not in the freshly-detected set — and the gate has just removed this one for being past.
  // Retirement is monotone and permanent (`reassertRetirements` never un-retires).
  const c = ctx('rl');
  let t = core.createTrip({ title: 'R', startDate: '2026-08-25', endDate: '2026-08-29',
    cities: [{ key: 'tokyo', name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }] }, c);
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: 'tokyo', cities: ['tokyo'] });

  const before = core.detectConflicts(t, { today: '2026-08-24' });   // the whole trip is future
  const target = before.find((x) => x.ruleId === 'missing_lodging');
  ok('there is a missing_lodging to dismiss', !!target, before.map((x) => x.ruleId).join(', '));
  t = core.resolveConflict(t, { conflictId: target.id, state: 'dismissed', by: core.LOCAL_OWNER, at: '2026-08-24' });
  ok('the dismissal is stored live', t.resolutions.length === 1 && !t.resolutions[0].retiredAt);

  // Day 1 of the trip: the clock moves, nothing else. The run's subjects are all still >= today.
  //
  // ARCHITECTURE §2.7 A-9 ruled on this section: the three-argument call below WAS the defect
  // — handing `syncResolutions` the gated set is the natural call and it is the wrong one —
  // so `syncResolutions` now detects its own un-gated set and takes `(trip, at)`. Every
  // assertion in this block is kept verbatim; only the calls changed, and A-9 says in writing
  // that no correct fix can leave the three-argument form meaning what it meant.
  const dayOne = core.detectConflicts(t, { today: '2026-08-25' });
  const t1 = core.syncResolutions(t, '2026-08-25');
  ok('on day 1 the dismissal is untouched', !t1.resolutions[0].retiredAt, String(t1.resolutions[0].retiredAt));

  // The trip ends. Nothing the user did; only the clock.
  const after = core.detectConflicts(t1, { today: '2026-08-30' });
  const t2 = core.syncResolutions(t1, '2026-08-30');
  console.log('  after the trip ended: conflicts =', after.length, '| resolution.retiredAt =', JSON.stringify(t2.resolutions[0].retiredAt),
    '| revision', t1.revision, '->', t2.revision);
  ok('merely opening the completed trip does not RETIRE the user\'s dismissal', !t2.resolutions[0].retiredAt,
    `retiredAt = ${t2.resolutions[0].retiredAt}`);
  ok('...and does not mutate the document (bump its revision) with no user action', t2.revision === t1.revision,
    `${t1.revision} -> ${t2.revision}`);

  // And the consequence: extend the trip so the same conflict comes back.
  const t3 = core.setTripMeta(t2, { endDate: '2026-09-30' }, c);
  const back = core.detectConflicts(t3, { today: '2026-08-30' });
  const again = back.find((x) => x.id === target.id);
  if (again) {
    console.log('  the same conflict id, after the dates were extended:', JSON.stringify(again.detail || ''));
    ok('the returning conflict does not accuse the user of a dismissal the CLOCK undid',
      !/came back/.test(String(again.detail || '')), String(again.detail || ''));
  } else {
    console.log('  (the conflict id changed with the date range; the retirement is still permanent)');
  }
}

line('§1.11 the same, through the real store (getDerived calls syncResolutions)');
{
  const c = ctx('rs');
  let t = core.createTrip({ title: 'RS', startDate: '2026-08-25', endDate: '2026-08-29',
    cities: [{ key: 'tokyo', name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }] }, c);
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: 'tokyo', cities: ['tokyo'] });
  const target = core.detectConflicts(t, { today: '2026-08-24' }).find((x) => x.ruleId === 'missing_lodging');
  t = core.resolveConflict(t, { conflictId: target.id, state: 'dismissed', by: core.LOCAL_OWNER, at: '2026-08-24' });

  const storage = mem.memoryStorage();
  const during = createStore({ ports: { ...mkPorts(storage), clock: mem.fixedClockPort('2026-08-24') }, autosave: false });
  await during.adoptTrip(t);
  during.getDerived();
  await during.flush();
  const midRev = JSON.parse((await storage.load(t.id)).doc).revision;

  // The user comes back a fortnight later. Same document, later clock.
  const later = createStore({ ports: { ...mkPorts(storage), clock: mem.fixedClockPort('2026-09-10') }, autosave: false });
  await later.openTrip(t.id);
  const d = later.getDerived();
  const row = later.getState().doc.resolutions[0];
  console.log('  conflicts on reopen:', d.conflicts.length, '| resolutions[0].retiredAt =', JSON.stringify(row.retiredAt),
    '| revision', midRev, '->', later.getState().doc.revision, '| dirty:', later.isDirty());
  ok('reopening the finished trip leaves the dismissal live', !row.retiredAt, `retiredAt = ${row.retiredAt}`);
  ok('...and leaves the store clean (no write scheduled by merely looking at it)', !later.isDirty());
}

line('§1.9 the Phase 1 ceiling: the reference trip at FIXTURE_TODAY is unmoved');
{
  const { trip } = loadEurope2026();
  const at = core.detectConflicts(trip, { today: FIXTURE_TODAY });
  const bySev = at.reduce((a, c) => ((a[c.severity] = (a[c.severity] || 0) + 1), a), {});
  ok('2 blockers / 4 warnings / 11 notes at FIXTURE_TODAY',
    bySev.blocker === 2 && bySev.warning === 4 && bySev.note === 11, JSON.stringify(bySev));
  const now = core.detectConflicts(trip, { today: '2026-08-27' });
  const classOf = Object.fromEntries(core.RULES.map((r) => [r.id, r.class]));
  console.log('  the real trip at the real clock:', now.length, 'findings —',
    [...new Set(now.map((x) => x.ruleId))].join(', '));
  ok('at today the completed reference trip shows NO feasibility finding',
    !now.some((x) => classOf[x.ruleId] === 'feasibility'),
    now.filter((x) => classOf[x.ruleId] === 'feasibility').map((x) => x.ruleId).join(', '));
  ok('...and lifecycle agrees it is completed', core.lifecycle(trip, '2026-08-27') === 'completed');
}

/* ------------------------------------------------------- §2 datePrecision ---- */

line('§2.1 the greppable ceiling, walked independently of the builder\'s test');
{
  const walk = (dir, out = []) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(p)) out.push(p);
    }
    return out;
  };
  const hits = [];
  for (const f of walk('packages/core/src')) {
    if (!/\/(conflict|derive|validate)\//.test(f)) continue;
    const src = readFileSync(f, 'utf8');
    if (src.includes('datePrecision')) hits.push(f);
  }
  ok('no occurrence of datePrecision under core conflict/ derive/ validate/', hits.length === 0, hits.join(', '));
  const clientHits = walk('packages/client/src').filter((f) => readFileSync(f, 'utf8').includes('datePrecision'));
  console.log('  packages/client occurrences:', clientHits.length ? clientHits.join(', ') : '(none)');
  const required = ['packages/core/src/model/types.ts', 'packages/core/src/build/createTrip.ts',
    'packages/core/src/serialize/toJSON.ts', 'packages/core/src/serialize/fromJSON.ts',
    'packages/core/src/serialize/migrate.ts'];
  for (const f of required) ok(`present in ${f}`, readFileSync(f, 'utf8').includes('datePrecision'));
}

line('§2.2 malformed values through fromJSON');
{
  const { trip } = loadEurope2026();
  const base = JSON.parse(core.toJSON(trip));
  const bad = ['fortnight', 'EXACT', 'Exact', '', 'exact ', 42, true, {}, [], ['exact']];
  for (const v of bad) {
    const o = { ...base, datePrecision: v };
    let e = null;
    try { core.fromJSON(JSON.stringify(o)); } catch (err) { e = err; }
    ok(`rejected: ${JSON.stringify(v)}`, e !== null && e.constructor.name === 'TripParseError' && e.path === '$.datePrecision',
      e ? `${e.constructor.name} @ ${e.path}` : 'ACCEPTED');
  }
  // null is the interesting one: absent -> 'exact', but null is a present wrong type
  const withNull = { ...base, datePrecision: null };
  let nullE = null;
  try { core.fromJSON(JSON.stringify(withNull)); } catch (err) { nullE = err; }
  console.log('  datePrecision:null ->', nullE ? `${nullE.constructor.name} @ ${nullE.path}` : 'ACCEPTED');
  ok('datePrecision:null is refused (it is a present wrong type, not absence)', nullE !== null);
}

line('§2.3 an old document (no datePrecision) loads as exact, both ways in');
{
  const { trip } = loadEurope2026();
  const o = JSON.parse(core.toJSON(trip));
  delete o.datePrecision;
  const back = core.fromJSON(JSON.stringify(o));
  ok('fromJSON supplies exact', back.datePrecision === 'exact', String(back.datePrecision));
  const migrated = (await import('../packages/core/src/serialize/migrate.ts')).migrateDoc(o);
  ok('migrateDoc supplies exact', migrated.datePrecision === 'exact', String(migrated.datePrecision));
  // round trip parity, with the field present and absent
  const t2 = core.setTripMeta(trip, { datePrecision: 'month' }, ctx('rt'));
  ok('toJSON(fromJSON(toJSON(t))) is byte-identical with the field present',
    core.toJSON(core.fromJSON(core.toJSON(t2))) === core.toJSON(t2));
  ok('...and with it absent on the way in',
    core.toJSON(core.fromJSON(JSON.stringify(o))) === core.toJSON(core.fromJSON(core.toJSON(trip))));
}

line('§2.4 undo/redo carries datePrecision at depth 50');
{
  const store = createStore({ ports: mkPorts(), autosave: false });
  const c = ctx('ur');
  let t = core.createTrip({ title: 'D', startDate: '2019-03-01', endDate: '2019-03-03', cities: [{ key: 'a', name: 'A', order: 0 }] }, c);
  await store.adoptTrip(t);
  store.dispatch({ type: 'setTripMeta', patch: { datePrecision: 'month' } });
  ok('set to month', store.getState().doc.datePrecision === 'month', String(store.getState().doc.datePrecision));
  for (let i = 0; i < 50; i++) store.dispatch({ type: 'setDayMeta', dayId: '2019-03-01', patch: { title: `t${i}` } });
  ok('still month after 50 edits', store.getState().doc.datePrecision === 'month', String(store.getState().doc.datePrecision));
  for (let i = 0; i < 50; i++) store.undo();
  console.log('  after 50 undos: datePrecision =', store.getState().doc.datePrecision, ', title =', store.getState().doc.days[0].title);
  ok('still month after 50 undos', store.getState().doc.datePrecision === 'month', String(store.getState().doc.datePrecision));
  for (let i = 0; i < 50; i++) store.redo();
  ok('still month after 50 redos', store.getState().doc.datePrecision === 'month', String(store.getState().doc.datePrecision));
  store.undo(); store.undo(); store.undo();
  for (let i = 0; i < 60; i++) store.undo();
  console.log('  undone past the setTripMeta itself: datePrecision =', store.getState().doc.datePrecision);
  ok('undoing PAST the precision edit returns exact (the history limit permitting)',
    ['exact', 'month'].includes(store.getState().doc.datePrecision), String(store.getState().doc.datePrecision));
}

line('§2.5 mergeTrips — does a remote-only datePrecision change survive?');
{
  const c = ctx('mg');
  const base = core.createTrip({ title: 'M', startDate: '2019-03-01', endDate: '2019-03-03', cities: [{ key: 'a', name: 'A', order: 0 }] }, c);
  // Tab A (remote / storage): the user picked "a month"
  const remote = core.setTripMeta(base, { datePrecision: 'month' }, c);
  // Tab B (local): a completely unrelated edit
  const local = core.setDayMeta(base, '2019-03-02', { title: 'A day' }, c);
  const { trip: merged, report } = core.mergeTrips(base, local, remote);
  console.log('  remote.datePrecision =', remote.datePrecision, '| local =', local.datePrecision, '| merged =', merged.datePrecision);
  console.log('  report.fromRemote =', JSON.stringify(report.fromRemote), '| overwritten =', JSON.stringify(report.overwritten));
  ok('the other tab\'s datePrecision survives the merge', merged.datePrecision === 'month', String(merged.datePrecision));
  ok('...or, failing that, the loss is REPORTED (nothing here is silent)',
    merged.datePrecision === 'month' ||
      report.overwritten.some((n) => n.field === 'datePrecision') ||
      report.fromRemote.some((n) => n.field === 'datePrecision'),
    JSON.stringify(report));
  // control: the same shape with `title`, which IS on TRIP_FIELDS
  const remoteT = core.setTripMeta(base, { title: 'Renamed' }, c);
  const m2 = core.mergeTrips(base, local, remoteT);
  ok('control — a remote-only TITLE change does survive', m2.trip.title === 'Renamed', m2.trip.title);
  // and homeBase, for the record (pre-existing, Phase 1)
  const remoteH = core.setTripMeta(base, { homeBase: { name: 'LA', at: { lat: 34, lng: -118 } } }, c);
  const m3 = core.mergeTrips(base, local, remoteH);
  console.log('  (context) remote-only homeBase survives merge:', m3.trip.homeBase !== null);
}

line('§2.6 setTripMeta does not validate datePrecision at runtime');
{
  const c = ctx('sv');
  const t = core.createTrip({ title: 'V', startDate: '2019-03-01', endDate: '2019-03-03', cities: [{ key: 'a', name: 'A', order: 0 }] }, c);
  let threw = null;
  let bad = null;
  try { bad = core.setTripMeta(t, { datePrecision: 'fortnight' }, c); } catch (e) { threw = e; }
  console.log('  setTripMeta({datePrecision:"fortnight"}) ->', threw ? threw.message : `accepted, doc now ${JSON.stringify(bad.datePrecision)}`);
  ok('setTripMeta refuses a value fromJSON would refuse', threw !== null,
    bad ? 'accepted — the document can be written but not read back' : '');
  if (bad) {
    const text = core.toJSON(bad);
    let readBack = null;
    try { core.fromJSON(text); } catch (e) { readBack = e; }
    ok('...and the resulting document IS re-readable', readBack === null,
      readBack ? `${readBack.constructor.name} @ ${readBack.path} — the trip cannot be loaded again` : '');
    const issues = core.validateTrip(bad);
    ok('...or validateTrip at least reports it', issues.some((i) => JSON.stringify(i).includes('recision')),
      `${issues.length} issues, none about datePrecision`);
  }
}

line('§2.7 the storage round trip, and what the LIBRARY can say about a fuzzy range');
{
  const storage = mem.memoryStorage();
  const a = createStore({ ports: mkPorts(storage), autosave: false });
  await a.createTrip({ title: 'Japan', startDate: '2019-03-01', endDate: '2019-03-31', cities: [{ key: 'tokyo', name: 'Tokyo', order: 0 }] });
  a.dispatch({ type: 'setTripMeta', patch: { datePrecision: 'month' } });
  await a.flush();
  const id = a.getState().doc.id;
  const b = createStore({ ports: mkPorts(storage), autosave: false });
  await b.openTrip(id);
  ok('datePrecision survives save -> reopen', b.getState().doc.datePrecision === 'month', String(b.getState().doc.datePrecision));
  const row = (await storage.listTrips()).find((r) => r.id === id) ?? core.tripSummary(b.getState().doc);
  console.log('  the TripSummaryRow the Library renders:', JSON.stringify(row));
  ok('the summary row the Library lists carries the precision, so a past trip is not listed as an exact claim',
    row && 'datePrecision' in row,
    `Library.tsx renders "${row.startDate} → ${row.endDate}" for a trip the user only claimed a month for`);
  const src = readFileSync('apps/web/src/views/Library.tsx', 'utf8');
  ok('Library.tsx uses the honest range label', /dateRangeLabel/.test(src),
    'Library.tsx prints row.startDate/row.endDate raw; dateRangeLabel is called only from TripView.tsx');
}

/* ---------------------------------------------- §3 the past-trip form, in Node ---- */

const { rangeFor } = await import('../apps/web/src/views/PastTripForm.tsx').catch(() => ({ rangeFor: null }));

line('§3.1 rangeFor — the pure half of the form');
if (!rangeFor) { console.log('  (skipped: PastTripForm.tsx is TSX and not importable here)'); }
else {
  ok('month 2019-03 -> 01..31', JSON.stringify(rangeFor('month', { month: '2019-03' })) === '{"startDate":"2019-03-01","endDate":"2019-03-31"}');
  ok('month 2019-02 -> 01..28', rangeFor('month', { month: '2019-02' }).endDate === '2019-02-28');
  ok('month 2020-02 -> 01..29 (leap)', rangeFor('month', { month: '2020-02' }).endDate === '2020-02-29');
  ok('month 1900-02 -> 01..28 (century, not leap)', rangeFor('month', { month: '1900-02' }).endDate === '1900-02-28');
  ok('month 2000-02 -> 01..29 (400-year, leap)', rangeFor('month', { month: '2000-02' }).endDate === '2000-02-29');
  ok('year 2019 -> 365 days', rangeFor('year', { year: '2019' }).endDate === '2019-12-31');
  ok('month 2019-13 rejected', rangeFor('month', { month: '2019-13' }) === null);
  ok('month 2019-00 rejected', rangeFor('month', { month: '2019-00' }) === null);
  ok('year 0000 accepted?', rangeFor('year', { year: '0000' }) !== null, JSON.stringify(rangeFor('year', { year: '0000' })));
}

line('§3.2 the document the form produces, rebuilt through the same three dispatches');
{
  const store = createStore({ ports: mkPorts(), autosave: false });
  const created = await store.createTrip({
    title: 'Japan', startDate: '2019-03-01', endDate: '2019-03-31',
    cities: [{ key: 'tokyo', name: 'Tokyo', order: 0 }],
  });
  store.dispatch({ type: 'setTripMeta', patch: { datePrecision: 'month' } });
  for (const day of created.doc.days) store.dispatch({ type: 'setDayMeta', dayId: day.id, patch: { primaryCity: 'tokyo', cities: ['tokyo'] } });
  const doc = store.getState().doc;
  ok('31 dense days', doc.days.length === 31, String(doc.days.length));
  ok('Day.id === Day.date throughout', doc.days.every((d) => d.id === d.date));
  ok('every day carries the city, not the transit catch-all', doc.days.every((d) => d.primaryCity === 'tokyo' && d.cities.join() === 'tokyo'));
  ok('datePrecision month', doc.datePrecision === 'month');
  const conf = core.detectConflicts(doc, { today: '2026-08-27' });
  const iss = core.validateTrip(doc);
  console.log('  conflicts:', conf.length, '| validation:', iss.length, iss.map((i) => i.code).join(', '));
  ok('criterion 3: ZERO conflicts at today', conf.length === 0, conf.map((c2) => `${c2.ruleId}@${c2.severity}`).join(', '));
  ok('criterion 3: ZERO validation issues', iss.length === 0, iss.map((i) => i.code).join(', '));
  // the ceiling half: the silence must be the GATE, not the city assignment
  const asPlan = core.detectConflicts(doc, { today: '2019-02-01' });
  console.log('  the same document as a PLAN:', asPlan.length, 'findings —', [...new Set(asPlan.map((x) => x.ruleId))].join(', '));
  ok('the ceiling half: the same document is LOUD before its start date', asPlan.length > 0, String(asPlan.length));
}

line('§3.3 city names the form accepts, and the keys they become');
{
  // ARCHITECTURE §2.2 A-10 ruled on this section (P2-2). The form no longer computes a key:
  // `CityInit.key` is optional and `createTrip` mints `ctx.ids.newId('city')`. `legacySlug`
  // below is the DELETED expression, kept only so the record shows what it did; every
  // assertion is kept verbatim and now measures what the product actually stores.
  const legacySlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const keyOf = (name) => {
    const t = core.createTrip({ title: 'k', startDate: '2019-03-01', endDate: '2019-03-01', cities: [{ name }] }, ctx('k'));
    return t.cities[0].key;
  };
  const cases = ['Tokyo', 'tokyo', '東京', 'Кыив', 'München', 'São Paulo', 'Transit', '...', "  "];
  for (const n of cases) {
    console.log(`    ${JSON.stringify(n)} -> key ${JSON.stringify(keyOf(n))}  (the deleted slug said ${JSON.stringify(legacySlug(n))})`);
  }
  ok('a non-Latin city name does NOT collapse to a meaningless key', keyOf('東京') !== '-' && keyOf('東京') !== '', keyOf('東京'));
  // Two cities in ONE trip, because a minted id is only unique within the factory that mints it.
  const jp = core.createTrip({ title: 'JP', startDate: '2019-03-01', endDate: '2019-03-02',
    cities: [{ name: '東京', order: 0 }, { name: '京都', order: 1 }] }, ctx('jp'));
  ok('two different non-Latin city names do not collide', jp.cities[0].key !== jp.cities[1].key,
    `${jp.cities[0].key} === ${jp.cities[1].key}`);
  ok('a city literally named "Transit" does not become the reserved catch-all key', keyOf('Transit') !== 'transit', keyOf('Transit'));
  // and what the trip does with it
  let t = jp;
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: t.cities[0].key, cities: [t.cities[0].key] });
  const iss = core.validateTrip(t);
  console.log('  a two-city Japanese trip validates as:', iss.length, 'issues —', iss.map((i) => i.code).join(', '));
  ok('a two-city Japanese trip is now CLEAN — the collision is unreachable by construction',
    iss.length === 0, iss.map((i) => i.code).join(', '));
  // The document that already collapsed: it must OPEN and it must say so (A-10, P2-7).
  const collapsed = { ...jp, cities: jp.cities.map((x) => ({ ...x, key: '-' })),
    days: jp.days.map((d) => ({ ...d, primaryCity: '-', cities: ['-'] })) };
  const collapsedIssues = core.validateTrip(collapsed).map((i) => i.code);
  ok('two colliding city keys are reported by validateTrip', collapsedIssues.includes('duplicate_city_key'),
    collapsedIssues.join(', ') || 'no issue reported for duplicate city keys');
  let opened = null;
  try { opened = core.fromJSON(core.toJSON(collapsed)); } catch (e) { opened = e; }
  ok('...and the already-collapsed document still OPENS', opened && opened.cities && opened.cities.length === 2,
    String(opened && opened.message));
  // "Transit" — reachable only by import/hand-edit now, and an error when it is.
  const shadow = { ...jp, cities: [{ ...jp.cities[0], key: 'transit' }, jp.cities[1]] };
  ok('a city keyed with the transit sentinel is an error',
    core.validateTrip(shadow).some((i) => i.code === 'reserved_city_key'));
  ok('a city with an empty name is an error',
    core.validateTrip({ ...jp, cities: [{ ...jp.cities[0], name: '' }, jp.cities[1]] })
      .some((i) => i.code === 'city_name_empty'));
  let t2 = core.createTrip({ title: 'T', startDate: '2019-03-01', endDate: '2019-03-21',
    cities: [{ name: 'Transit' }] }, ctx('tr'));
  for (const d of t2.days) t2 = core.setDayMeta(t2, d.id, { primaryCity: t2.cities[0].key, cities: [t2.cities[0].key] });
  console.log('  a trip whose only city is named "Transit": missing_lodging as a plan =',
    core.detectConflicts(t2, { today: '2018-01-01' }).filter((x) => x.ruleId === 'missing_lodging').length);
}

line('§3.4 the "a year" path: how long does 365 days of dispatches take?');
{
  const store = createStore({ ports: mkPorts(), autosave: false });
  const t0 = Date.now();
  const created = await store.createTrip({ title: 'Y', startDate: '2019-01-01', endDate: '2019-12-31', cities: [{ key: 'a', name: 'A', order: 0 }] });
  const tCreate = Date.now() - t0;
  const t1 = Date.now();
  store.dispatch({ type: 'setTripMeta', patch: { datePrecision: 'year' } });
  for (const day of created.doc.days) store.dispatch({ type: 'setDayMeta', dayId: day.id, patch: { primaryCity: 'a', cities: ['a'] } });
  const tLoop = Date.now() - t1;
  console.log(`  createTrip(365 days) ${tCreate} ms · ${created.doc.days.length} days · then ${created.doc.days.length} setDayMeta dispatches ${tLoop} ms`);
  ok('365 days minted', store.getState().doc.days.length === 365, String(store.getState().doc.days.length));
  ok('every day carries the city', store.getState().doc.days.every((d) => d.primaryCity === 'a'));
  ok('the whole flow is under 3 s in plain Node', tCreate + tLoop < 3000, `${tCreate + tLoop} ms`);
  const t2 = Date.now();
  const conf = core.detectConflicts(store.getState().doc, { today: '2026-08-27' });
  console.log(`  detectConflicts on the 365-day record: ${Date.now() - t2} ms, ${conf.length} findings`);
  ok('a 365-day past trip is silent', conf.length === 0, conf.map((x) => x.ruleId).join(', '));
  // undo depth: the form fires 366 dispatches, the history limit is 50
  let undone = 0;
  for (let i = 0; i < 400; i++) if (store.undo()) undone++;
  const after = store.getState().doc;
  console.log('  undos accepted:', undone, '| days still carrying the city:', after.days.filter((d) => d.primaryCity === 'a').length, 'of', after.days.length);
  ok('Ctrl+Z after recording a one-year trip does not leave a half-assigned record',
    after.days.every((d) => d.primaryCity === 'a') || after.days.every((d) => d.primaryCity !== 'a'),
    `${after.days.filter((d) => d.primaryCity === 'a').length} of ${after.days.length} days still carry the city`);
}

/* ------------------------------------------------------------- §4 ownerId ---- */

line('§4.1 an ABSENT ownerId imports and is adopted as the local user');
{
  const { trip } = loadEurope2026();
  const store = createStore({ ports: mkPorts(), autosave: false });
  const o = JSON.parse(core.toJSON(trip));
  delete o.ownerId;
  const parsed = core.fromJSON(JSON.stringify(o));
  ok('fromJSON carries absence through as \'\'', parsed.ownerId === '', JSON.stringify(parsed.ownerId));
  await store.importDoc(JSON.stringify(o));
  ok('importDoc adopts it as the local owner', store.getState().doc.ownerId === core.LOCAL_OWNER, JSON.stringify(store.getState().doc.ownerId));
  ok('...and the installed document validates clean of owner_missing',
    !core.validateTrip(store.getState().doc).some((i) => i.code === 'owner_missing'));
}

line('§4.2 a NULL ownerId behaves the same as absent');
{
  const { trip } = loadEurope2026();
  const store = createStore({ ports: mkPorts(), autosave: false });
  const o = { ...JSON.parse(core.toJSON(trip)), ownerId: null };
  await store.importDoc(JSON.stringify(o));
  ok('null is adopted, exactly as absent is', store.getState().doc.ownerId === core.LOCAL_OWNER, JSON.stringify(store.getState().doc.ownerId));
}

line('§4.3 a NON-STRING ownerId still fails the parse cleanly');
{
  const { trip } = loadEurope2026();
  const base = JSON.parse(core.toJSON(trip));
  for (const v of [42, 0, true, false, {}, [], ['user:marta'], { id: 'user:marta' }]) {
    let e = null;
    try { core.fromJSON(JSON.stringify({ ...base, ownerId: v })); } catch (err) { e = err; }
    ok(`refused: ownerId = ${JSON.stringify(v)}`, e !== null && e.constructor.name === 'TripParseError' && e.path === '$.ownerId',
      e ? `${e.constructor.name} @ ${e.path}` : 'ACCEPTED — coerced silently');
  }
}

line('§4.4 a DIFFERENT real owner is still refused — the check that must not have weakened');
{
  const { trip } = loadEurope2026();
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage), autosave: false });
  const before = (await storage.listTrips()).length;
  const foreign = core.toJSON({ ...trip, ownerId: 'user:marta' });
  let e = null;
  try { await store.importDoc(foreign); } catch (err) { e = err; }
  ok('ForeignDocumentError', e !== null && e.constructor.name === 'ForeignDocumentError', e ? e.constructor.name : 'ACCEPTED');
  ok('nothing was installed', store.getState().doc === null && store.getState().activeTripId === null);
  ok('nothing was written to storage', (await storage.listTrips()).length === before);
  // and with a non-default local owner, which is what Phase 3 will have
  const store2 = createStore({ ports: mkPorts(), autosave: false, ownerId: 'user:jacob' });
  let e2 = null;
  try { await store2.importDoc(core.toJSON({ ...trip, ownerId: core.LOCAL_OWNER })); } catch (err) { e2 = err; }
  ok('a local:self document is refused for a signed-in user:jacob', e2 !== null && e2.constructor.name === 'ForeignDocumentError',
    e2 ? e2.constructor.name : 'ADOPTED');
}

line('§4.5 the EMPTY STRING ownerId — is it "absent" or "a different (empty) owner"?');
{
  const { trip } = loadEurope2026();
  const store = createStore({ ports: mkPorts(), autosave: false });
  const o = { ...JSON.parse(core.toJSON(trip)), ownerId: '' };
  await store.importDoc(JSON.stringify(o));
  ok("ownerId:'' is treated as absent and adopted", store.getState().doc.ownerId === core.LOCAL_OWNER, JSON.stringify(store.getState().doc.ownerId));
  // Can '' ever be a REAL UserId anywhere in the system?
  const c = ctx('eo');
  const t = core.createTrip({ title: 'E', startDate: '2019-03-01', endDate: '2019-03-02', cities: [{ key: 'a', name: 'A', order: 0 }], ownerId: '' }, c);
  console.log('  createTrip({ownerId:\'\'}) ->', JSON.stringify(t.ownerId));
  const iss = core.validateTrip(t);
  ok("a trip with ownerId '' is an ERROR state already (owner_missing), so '' is not a real UserId",
    iss.some((i) => i.code === 'owner_missing' && i.level === 'error'),
    JSON.stringify(iss.filter((i) => i.code === 'owner_missing')));
  // whitespace is the asymmetric case
  const store3 = createStore({ ports: mkPorts(), autosave: false });
  let e3 = null;
  try { await store3.importDoc(JSON.stringify({ ...JSON.parse(core.toJSON(trip)), ownerId: ' ' })); } catch (err) { e3 = err; }
  console.log("  ownerId:' ' (one space) ->", e3 ? e3.constructor.name : `adopted as ${JSON.stringify(store3.getState().doc.ownerId)}`);
}

line('§4.6 the bypass: delete one key from a FOREIGN export and it is adopted whole');
{
  const { trip } = loadEurope2026();
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage), autosave: false });
  // Marta's own trip: her ownerId, and every stop authored by her.
  const hers = JSON.parse(core.toJSON(trip));
  hers.ownerId = 'user:marta';
  let stamped = 0;
  for (const d of hers.days) for (const s of d.stops) {
    if (s.provenance && s.provenance.state === 'accepted') { s.provenance.actorUserId = 'user:marta'; stamped++; }
  }
  console.log('  stops stamped as accepted by user:marta:', stamped);
  // Refused, as designed.
  let e = null;
  try { await store.importDoc(JSON.stringify(hers)); } catch (err) { e = err; }
  ok('with her ownerId present it is refused', e !== null && e.constructor.name === 'ForeignDocumentError', e ? e.constructor.name : 'ACCEPTED');
  // One key deleted.
  delete hers.ownerId;
  let e2 = null;
  try { await store.importDoc(JSON.stringify(hers)); } catch (err) { e2 = err; }
  const doc = store.getState().doc;
  console.log('  after deleting the ownerId key:', e2 ? `refused (${e2.constructor.name})` : `ADOPTED as ${doc.ownerId}`);
  ok('deleting one key does not turn a refusal into an adoption', e2 !== null,
    doc ? `adopted as ${doc.ownerId}, ${stamped} stops still authored by user:marta` : '');
  if (doc) {
    const foreignAuthored = doc.days.flatMap((d) => d.stops).filter((s) => s.provenance && s.provenance.actorUserId === 'user:marta');
    console.log('  stops in the adopted document still accepted by user:marta:', foreignAuthored.length);
    const iss = core.validateTrip(doc);
    const flagged = iss.filter((i) => /member|actor|owner/.test(i.code));
    console.log('  validateTrip codes touching ownership:', flagged.length, flagged.length ? flagged[0].message : '');
    ok('...and something in the product says the content is not the importer\'s own',
      flagged.length > 0 || foreignAuthored.length === 0,
      `${foreignAuthored.length} foreign-accepted stops, ${flagged.length} ownership issues reported`);
    const badged = doc.days.flatMap((d) => d.stops).filter((s) => core.displayStatus(s) !== 'own');
    console.log('  stops NOT rendering as the importer\'s own (displayStatus):', badged.length, 'of',
      doc.days.flatMap((d) => d.stops).length);
  }
}

console.log(`\n${fails === 0 ? 'ALL OK' : fails + ' FAIL'}`);
