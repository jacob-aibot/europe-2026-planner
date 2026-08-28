/**
 * Round 13 — the breaker pass over ROADMAP I-3a (§2.7 **A-9**, retirement vs the clock) and
 * I-4a (§2.2 **A-10**, `CityKey` is a minted opaque id), plus the two orchestrator follow-ups
 * KD-42 (the 71 export count) and KD-44 (`geoOutlier`'s city-label fallback).
 *
 * Run: node --experimental-strip-types qa/r13-gate-citykey.mjs   (from cairn/)
 *
 *   §1  A-9's core claim, attacked: `unbooked_ticketed`'s SURVIVING clock-driven suppression
 *       (`delta > UNBOOKED_HORIZON_DAYS`) retires a dismissal on a clock step BACKWARDS across
 *       the 60-day boundary — core and through the real store.        (R13-1)
 *   §2  A-9 confirmations: gate crossings forward, backward and combined with real edits.
 *   §3  A-9 assertion 4's substitution — is `setTripMeta({endDate})` load-bearing?  (R13-2)
 *   §4  A-9 point 1's crash claim: a crashed rule retires every dismissal it owned.  (R13-3)
 *   §5  `detectUngated` off the surface, and unreachable from client/web/cli.
 *   §6  A-10 attacked: adversarial names and keys, the three new codes, `fromJSON`'s silence,
 *       and a pre-A-10 collapsed document through `importDoc`.
 *   §7  KD-42 re-derived: 71 both ways — and the stale `70` this pass left behind.   (R13-4)
 *   §8  KD-44: the composed sentence, at both label sites.                            (R13-5)
 *   §9  the byte-identity ceilings, re-derived (see the README for the worktree recipe).
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
const mkPorts = (storage, today) => ({
  storage: storage ?? mem.memoryStorage(),
  clock: mem.fixedClockPort(today ?? '2026-08-27'),
  ids: mem.sequentialIdPort('i'),
  file: mem.memoryFile(),
  scheduler: mem.immediateScheduler(),
});
/** A clock port whose reading is whatever the caller last set — a device clock, not a fixture. */
function movableClock(start) {
  let d = start;
  return { today: () => d, set: (x) => { d = x; } };
}

/* ============================================================ §1  R13-1 ==== */

/**
 * A trip with one ticketed, unbooked, priced stop, `n` days after `today0`. `unbooked_ticketed`
 * fires iff `dayNumber(day) - dayNumber(today) <= 60`.
 */
function horizonTrip(dayDate) {
  const c = ctx('h');
  let t = core.createTrip(
    { title: 'Horizon', startDate: dayDate, endDate: dayDate,
      cities: [{ name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }] }, c);
  const key = t.cities[0].key;
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: key, cities: [key] });
  t = core.addStop(
    t, { kind: 'scheduled', dayId: dayDate, time: '10:00', order: 0 },
    { name: 'Ghibli Museum', category: 'sight', place: { kind: 'inline', at: { lat: 35.696, lng: 139.57 } },
      cost: { display: '€10', amounts: [{ lo: 10, hi: 10, currency: 'EUR', basis: 'per_person' }] },
      links: [{ label: 'Tickets', href: 'https://example.test/t' }] }, c);
  return t;
}

line('§1.1 R13-1 — `delta > 60` is a SECOND clock-driven suppression, and it is inside detectUngated');
{
  // A-9: "the greppable invariant is `ctx.today` appears in exactly one rule file, and §8.2's
  // gate is the only clock-driven suppression in the system." The far-future half of
  // `unbooked_ticketed`'s guard is the counter-example, and unlike §8.2's gate it is applied
  // by `detectUngated` too — which is the set retirement reads.
  const t = horizonTrip('2026-03-02');
  const at60 = '2026-01-01';   // delta = 60 -> the rule fires
  const at61 = '2025-12-31';   // delta = 61 -> the rule withholds
  const g60 = core.detectConflicts(t, { today: at60 }).filter((x) => x.ruleId === 'unbooked_ticketed');
  const g61 = core.detectConflicts(t, { today: at61 }).filter((x) => x.ruleId === 'unbooked_ticketed');
  const u61 = detectMod.detectUngated(t, { today: at61 }).filter((x) => x.ruleId === 'unbooked_ticketed');
  ok('the rule fires at delta = 60', g60.length === 1, String(g60.length));
  ok('the rule withholds at delta = 61', g61.length === 0, String(g61.length));
  ok('...and the UN-GATED set withholds it too — the clock reaches through detectUngated',
    u61.length === 1, `detectUngated at ${at61} returned ${u61.length} — 1 would mean the gate is the only clock`);
}

line('§1.2 R13-1 — a clock step BACKWARDS across the boundary retires a live dismissal');
{
  const t0 = horizonTrip('2026-03-02');
  const at60 = '2026-01-01';
  const at61 = '2025-12-31';
  const target = core.detectConflicts(t0, { today: at60 }).find((x) => x.ruleId === 'unbooked_ticketed');
  const t = core.resolveConflict(t0, { conflictId: target.id, state: 'dismissed', by: core.LOCAL_OWNER, at: at60 });
  ok('the dismissal is stored live', !t.resolutions[0].retiredAt);

  // The user's device date moves back one day. No edit of any kind.
  const back = core.syncResolutions(t, at61);
  console.log('  after syncResolutions at', at61, ': retiredAt =', JSON.stringify(back.resolutions[0].retiredAt),
    '| revision', t.revision, '->', back.revision, '| same reference:', back === t);
  ok('a backwards clock alone does not retire the dismissal', !back.resolutions[0].retiredAt,
    `retiredAt = ${back.resolutions[0].retiredAt}`);
  ok('...and does not mutate the document with no user action', back === t, `${t.revision} -> ${back.revision}`);

  // ...and because retirement is monotone, the damage does not stop at one write.
  const restored = core.syncResolutions(back, at60);
  const again = core.detectConflicts(restored, { today: at60 }).find((x) => x.id === target.id);
  console.log('  once the clock is right again: retiredAt =', JSON.stringify(restored.resolutions[0].retiredAt),
    '| renders with resolution:', JSON.stringify(again && again.resolution), '| detail:', JSON.stringify(again && again.detail));
  ok('the correct clock un-does nothing (retirement is monotone) — the dismissal is gone for good',
    !restored.resolutions[0].retiredAt, `retiredAt = ${restored.resolutions[0].retiredAt}`);
  ok('...and the conflict does not accuse the user of a dismissal the CLOCK undid',
    !/come back/.test(String((again && again.detail) || '')), String((again && again.detail) || ''));
}

line('§1.3 R13-1 through the REAL store — a westward timezone step dirties storage');
{
  // `apps/web`'s `systemClock()` returns the LOCAL date. Flying west (Budapest UTC+2 ->
  // London UTC+1 -> LA UTC-7 — this app's own reference itinerary) steps the local date back
  // by one for part of the day. Nothing else changes.
  const t0 = horizonTrip('2026-03-02');
  const at60 = '2026-01-01';
  const target = core.detectConflicts(t0, { today: at60 }).find((x) => x.ruleId === 'unbooked_ticketed');
  const doc = core.resolveConflict(t0, { conflictId: target.id, state: 'dismissed', by: core.LOCAL_OWNER, at: at60 });

  const storage = mem.memoryStorage();
  const clock = movableClock(at60);
  const store = createStore({ ports: { ...mkPorts(storage), clock }, autosave: false });
  await store.adoptTrip(doc);
  store.getDerived();
  await store.flush();
  const before = core.fromJSON((await storage.load(doc.id)).doc);
  ok('stored with the dismissal live', !before.resolutions[0].retiredAt);

  clock.set('2025-12-31');           // the plane lands; the device date steps back
  store.getDerived();                // the panel re-renders. That is the whole user action.
  await store.flush();
  const after = core.fromJSON((await storage.load(doc.id)).doc);
  console.log('  after one render at the stepped-back clock: stored retiredAt =',
    JSON.stringify(after.resolutions[0].retiredAt), '| stored revision', before.revision, '->', after.revision);
  ok('rendering at the stepped-back clock leaves the stored dismissal live',
    !after.resolutions[0].retiredAt, `retiredAt = ${after.resolutions[0].retiredAt}`);
  ok('...and does not rewrite the stored document', after.revision === before.revision,
    `${before.revision} -> ${after.revision}`);
}

/* ================================================ §2  A-9 confirmations ==== */

function dismissedLodging() {
  const c = ctx('rl');
  let t = core.createTrip({ title: 'R', startDate: '2026-08-25', endDate: '2026-08-29',
    cities: [{ key: 'tokyo', name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }] }, c);
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: 'tokyo', cities: ['tokyo'] });
  const target = core.detectConflicts(t, { today: '2026-08-24' }).find((x) => x.ruleId === 'missing_lodging');
  t = core.resolveConflict(t, { conflictId: target.id, state: 'dismissed', by: core.LOCAL_OWNER, at: '2026-08-24' });
  return { trip: t, target, c };
}

const lodgingBooking = (t, id = 'b-1') => core.upsertBooking(t, {
  id, tripId: t.id, kind: 'lodging', operator: 'Hotel Tokyo', reference: null,
  startsAt: { date: '2026-08-25', time: null }, endsAt: { date: '2026-08-29', time: null },
  price: null, party: null, status: 'active', ticket: null,
  provenance: { source: 'user', state: 'accepted', confidence: 'confirmed',
    addedAt: '2026-08-24', acceptedAt: '2026-08-24', actorUserId: null },
});

line('§2 the gate boundary crossed in both directions, alone and combined with a real edit');
{
  const { trip } = dismissedLodging();
  // forward across §8.2's gate, no edit
  const fwd = core.syncResolutions(trip, '2026-08-30');
  ok('forward across the gate, no edit: nothing retired, same reference', fwd === trip);
  // backward across it, no edit
  const bwd = core.syncResolutions(fwd, '2026-08-01');
  ok('backward across the gate, no edit: nothing retired, same reference', bwd === fwd);
  // every clock from before the trip to a year after, in one sweep
  let sweep = trip;
  for (const at of ['2026-08-01', '2026-08-25', '2026-08-27', '2026-08-30', '2027-08-30', '2019-01-01', '2026-08-26'])
    sweep = core.syncResolutions(sweep, at);
  ok('a seven-step clock sweep across the gate in both directions retires nothing', sweep === trip,
    JSON.stringify(sweep.resolutions[0].retiredAt));

  // a REAL fix, at a post-gate clock — retirement must still happen (A-9 assertion 3)
  const fixed = core.syncResolutions(lodgingBooking(trip), '2026-08-30');
  ok('a genuine fix still retires, at a post-gate clock', fixed.resolutions[0].retiredAt === '2026-08-30',
    String(fixed.resolutions[0].retiredAt));
  // an edit and a clock crossing in the SAME call
  const both = core.syncResolutions(lodgingBooking(trip), '2026-08-01');
  ok('...and at a pre-trip clock too', both.resolutions[0].retiredAt === '2026-08-01', String(both.resolutions[0].retiredAt));
  // an UNRELATED edit at a post-gate clock must retire nothing
  const unrelated = core.syncResolutions(core.setTripMeta(trip, { title: 'Renamed' }, ctx('u')), '2026-08-30');
  ok('an unrelated edit at a post-gate clock retires nothing', !unrelated.resolutions[0].retiredAt,
    String(unrelated.resolutions[0].retiredAt));
}

line('§2b through the store: a genuine fix at a post-gate clock reaches storage');
{
  const { trip } = dismissedLodging();
  const storage = mem.memoryStorage();
  const store = createStore({ ports: { ...mkPorts(storage, '2026-09-10') }, autosave: false });
  await store.adoptTrip(trip);
  store.getDerived();
  await store.flush();
  ok('reopening a finished trip leaves the dismissal live and the store clean',
    !core.fromJSON((await storage.load(trip.id)).doc).resolutions[0].retiredAt && !store.isDirty());
  // The genuine fix, in a store of its own (`adoptTrip` re-opens the STORED copy when the id
  // already exists — §4.2 rule 6a — so re-adopting the edited document is a no-op by design).
  const storage2 = mem.memoryStorage();
  const fixedStore = createStore({ ports: { ...mkPorts(storage2, '2026-09-10') }, autosave: false });
  await fixedStore.adoptTrip(lodgingBooking(trip));
  fixedStore.getDerived();
  await fixedStore.flush();
  const row = core.fromJSON((await storage2.load(trip.id)).doc).resolutions[0];
  ok('...and the genuine fix retires, in storage', row.retiredAt === '2026-09-10', String(row.retiredAt));
}

/* ============================================== §3  A-9 assertion 4 ======== */

line('§3 R13-2 — A-9(4)\'s mechanism, after A-13 retired the literal one');
{
  // A-13 (ARCHITECTURE §2.7, revision 12) rules on this section rather than on the code. The
  // FIRST assertion here — "extending `endDate` makes the conflict return" — is **retired, not
  // fixed**: it asserts a mechanism the model does not have, for any Phase 1 rule, and the
  // ruling authorises replacing that line with the tripwire below. The SECOND — "the
  // substituted test's `setTripMeta` is load-bearing" — measured a call A-13 orders deleted, so
  // it is replaced by the two things A-13 actually requires of `retirementGate.test.ts`. The
  // third is kept verbatim. See docs/BUILD-NOTES.md KD-49.
  const { trip, target } = dismissedLodging();
  const t2 = core.syncResolutions(core.syncResolutions(trip, '2026-08-25'), '2026-08-30');

  // A-13's tripwire, in the probe's own words: extending `endDate` can un-gate a finding only
  // if some subject resolves through §8.2 ruling 2's fallback, and no feasibility rule emits
  // one. When this line starts failing, A-9(4)'s literal mechanism has become achievable and
  // must be written as a test in the same commit.
  const feasibility = new Set(core.RULES.filter((r) => r.class === 'feasibility').map((r) => r.id));
  const unpinned = [];
  for (const [name, doc] of [['reference', loadEurope2026().trip], ['lodging', t2]]) {
    for (const cf of core.detectConflicts(doc, { today: '2026-08-26' })) {
      if (!feasibility.has(cf.ruleId)) continue;
      const pinned = cf.subjects.some((s) =>
        (s.kind === 'day' && doc.days.some((d) => d.id === s.id)) ||
        (s.kind === 'stop' && doc.days.some((d) => d.stops.some((x) => x.id === s.id))) ||
        (s.kind === 'booking' && doc.bookings.some((b) => b.id === s.id)));
      if (!pinned) unpinned.push(`${name}:${cf.id}`);
    }
  }
  ok('A-13 tripwire: no feasibility finding resolves ONLY through §8.2 ruling 2\'s endDate fallback',
    unpinned.length === 0,
    `${unpinned.join(', ')} — A-9(4)'s literal mechanism is now achievable; write that test`);

  // A-13 (1): the inert call is gone, and the test's name describes the clock crossing.
  const gateTest = readFileSync('packages/core/test/retirementGate.test.ts', 'utf8');
  const a9_4 = /test\('([^']*A-9 \(4\)[^']*)'/.exec(gateTest);
  // Comments stripped: the ruling deletes the CALL, and the header is allowed to say why.
  const gateCode = gateTest.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok('the inert `setTripMeta({endDate})` is gone from retirementGate.test.ts',
    !/setTripMeta/.test(gateCode), 'the call round 13 measured byte-inert is still there');
  ok('...and A-9(4)\'s test now names the clock crossing it actually runs',
    !!a9_4 && /clock|boundary/i.test(a9_4[1]) && !/extended trip/i.test(a9_4[1]),
    a9_4 && a9_4[1]);

  // What the substituted mechanism DOES prove, kept verbatim from round 13:
  const withExt = core.detectConflicts(t2, { today: '2026-08-26' }).find((x) => x.id === target.id);
  console.log('  the clock crossing   :', !!withExt, '| resolution =', withExt && withExt.resolution && withExt.resolution.state,
    '| detail =', JSON.stringify(withExt && withExt.detail));
  ok('(what it does prove) a clock crossing leaves the dismissal live and the finding un-accused',
    !!withExt && !!withExt.resolution && !/come back/.test(String(withExt.detail ?? '')));
}

/* ==================================================== §4  R13-3 ============ */

line('§4 R13-3 — A-9 point 1: can a crashed rule be "the thing that retires a resolution"?');
{
  const { trip, target } = dismissedLodging();
  const rule = core.RULES.find((r) => r.id === 'missing_lodging');
  const original = rule.run;
  rule.run = () => { throw new Error('transient'); };
  let after;
  try { after = core.syncResolutions(trip, '2026-08-24'); } finally { rule.run = original; }
  console.log('  one crashed detection, SAME clock, no edit: retiredAt =',
    JSON.stringify(after.resolutions[0].retiredAt), '| revision', trip.revision, '->', after.revision);
  ok('a crashing rule does not retire the dismissals it owned', !after.resolutions[0].retiredAt,
    `retiredAt = ${after.resolutions[0].retiredAt} — A-9 point 1 says a crash "can never be the thing that retires a resolution"`);
  const back = core.detectConflicts(after, { today: '2026-08-24' }).find((x) => x.id === target.id);
  ok('...and once the rule works again the user is not accused',
    !/come back/.test(String((back && back.detail) || '')), String((back && back.detail) || ''));

  // Reachability, measured: every content route into a rule crash that I could find is
  // refused at the document door. This is what keeps R13-3 a MINOR.
  const { trip: ref } = loadEurope2026();
  const raw = JSON.parse(core.toJSON(ref));
  const routes = {
    'bookings: null': (o) => { o.bookings = null; },
    'bookings[0].startsAt = null': (o) => { o.bookings[0].startsAt = null; },
    'days[0].stops = null': (o) => { o.days[0].stops = null; },
    'days[0].cities = null': (o) => { o.days[0].cities = null; },
    'places[0].at = "x"': (o) => { o.places[0].at = 'x'; },
  };
  for (const [label, mut] of Object.entries(routes)) {
    const o = JSON.parse(JSON.stringify(raw));
    mut(o);
    let parsed = null;
    try { parsed = core.fromJSON(JSON.stringify(o)); } catch { /* refused — the good case */ }
    const crashed = parsed
      ? core.detectConflicts(parsed, { today: FIXTURE_TODAY }).filter((x) => x.ruleId === 'rule_error').map((x) => x.params.ruleId)
      : [];
    ok(`no rule crash reachable through fromJSON: ${label}`, parsed === null || crashed.length === 0, crashed.join(','));
  }
}

/* ==================================================== §5  the surface ====== */

line('§5 `detectUngated` stays internal, and nothing outside core reaches it');
{
  const keys = Object.keys(core);
  ok('detectUngated is not a runtime export of index.ts', !keys.includes('detectUngated'));
  ok('subjectDate / UNBOOKED_HORIZON_DAYS / TRANSIT_CITY_KEY are not either',
    !keys.includes('subjectDate') && !keys.includes('UNBOOKED_HORIZON_DAYS') && !keys.includes('TRANSIT_CITY_KEY'));
  const walk = (dir, out = []) => {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules' || e === 'dist' || e === '.vite') continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx|mjs)$/.test(p)) out.push(p);
    }
    return out;
  };
  const outside = [...walk('packages/client/src'), ...walk('apps/web/src'), 'cli.ts'];
  const reach = outside.filter((f) => /detectUngated/.test(readFileSync(f, 'utf8')));
  ok('no file in packages/client, apps/web or cli.ts names detectUngated', reach.length === 0, reach.join(', '));
  const deep = outside.filter((f) => /from ['"].*packages\/core\/src\/(?!index)/.test(readFileSync(f, 'utf8')));
  ok('no consumer outside core deep-imports a core module path', deep.length === 0, deep.join(', '));
  // ...and the built bundle does not carry the name either.
  try {
    const dist = readdirSync('apps/web/dist/assets').filter((f) => f.endsWith('.js'));
    const hit = dist.filter((f) => readFileSync(join('apps/web/dist/assets', f), 'utf8').includes('detectUngated'));
    ok('the built web bundle does not contain detectUngated', hit.length === 0, hit.join(', '));
  } catch { console.log('  (skipped the dist check — run `npm run web:build` first)'); }
}

/* ==================================================== §6  A-10 ============= */

const mkCities = (cities, p = 'c') =>
  core.createTrip({ title: 'T', startDate: '2026-01-01', endDate: '2026-01-02', cities }, ctx(p));
const codes = (t) => core.validateTrip(t).map((i) => i.code);

line('§6.1 adversarial city NAMES: nothing collides, nothing is reserved, blanks are reported');
{
  const names = ['東京', '京都', '日本 2019', 'transit', 'Transit', 'TRANSIT', 'TrAnSiT',
    'Zürich', 'Zürich', 'Paris', 'Paris, Texas', '__proto__', 'constructor', 'toString',
    '{"key":"city-0"}', 'city-0', 'city-1', '-', '  ', 'A'.repeat(4096), '🇯🇵 Tokyo', 'Ø'];
  const t = mkCities(names.map((n, i) => ({ name: n, order: i })), 'z');
  const keys = t.cities.map((c) => c.key);
  ok(`${names.length} adversarial names -> ${new Set(keys).size} distinct keys`,
    new Set(keys).size === names.length, JSON.stringify(keys.slice(0, 4)));
  ok('none of them is the reserved sentinel', !keys.includes('transit'));
  ok('none of them is the "-" P2-2 collapsed everything to', !keys.includes('-'));
  const c = codes(t);
  ok('only the whitespace-only name is reported, and it is city_name_empty',
    c.length === 1 && c[0] === 'city_name_empty', c.join(', '));
  ok('a city NAMED "Transit" no longer shadows the sentinel', !c.includes('reserved_city_key'));
  ok('the document round-trips', (() => { try { core.fromJSON(core.toJSON(t)); return true; } catch { return false; } })());
}

line('§6.2 the three new codes fire on the shapes only import / hand-edit can produce');
{
  ok('duplicate_city_key', codes(mkCities([{ key: 'k', name: 'A', order: 0 }, { key: 'k', name: 'B', order: 1 }], 'd'))
    .includes('duplicate_city_key'));
  ok('reserved_city_key', codes(mkCities([{ key: 'transit', name: 'Transit Town', order: 0 }], 'r'))
    .includes('reserved_city_key'));
  ok('city_name_empty on ""', codes(mkCities([{ name: '', order: 0 }], 'e1')).includes('city_name_empty'));
  ok('city_name_empty on whitespace', codes(mkCities([{ name: ' \t\n ', order: 0 }], 'e2')).includes('city_name_empty'));
  ok('a differently-cased "Transit" key is NOT reserved (equality, not normalisation)',
    !codes(mkCities([{ key: 'Transit', name: 'T', order: 0 }], 'r2')).includes('reserved_city_key'));
  // an explicit key is honoured verbatim — including shapes nothing validates
  const empty = mkCities([{ key: '', name: 'Nowhere', order: 0 }], 'k');
  ok('an explicit empty-string key is honoured verbatim and reported by nothing',
    empty.cities[0].key === '' && codes(empty).length === 0,
    `key=${JSON.stringify(empty.cities[0].key)} issues=${codes(empty).join(',')}`);
}

line('§6.3 `fromJSON` stays silent on all three, and nothing upstream chokes');
{
  // The pre-A-10 casualty: a document already carrying the "-" collision must still OPEN.
  const c = ctx('j');
  let t = core.createTrip({ title: '日本 2019', startDate: '2019-06-01', endDate: '2019-06-03',
    cities: [{ key: '-', name: '東京', order: 0 }, { key: '-', name: '京都', order: 1 }] }, c);
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: '-', cities: ['-'] });
  const doc = core.toJSON(t);
  let parsed = null;
  try { parsed = core.fromJSON(doc); } catch (e) { /* handled below */ }
  ok('a collapsed pre-A-10 document parses', parsed !== null);
  ok('...and validateTrip is what reports it', codes(parsed).includes('duplicate_city_key'), codes(parsed).join(', '));
  ok('...and migrateDoc does not refuse it either',
    (() => { try { core.migrateDoc(JSON.parse(doc)); return true; } catch { return false; } })());
  for (const [label, mk] of Object.entries({
    reserved: () => mkCities([{ key: 'transit', name: 'Transit Town', order: 0 }], 'rr'),
    blankName: () => mkCities([{ name: '   ', order: 0 }], 'nn'),
  })) {
    ok(`fromJSON is silent on ${label}`,
      (() => { try { core.fromJSON(core.toJSON(mk())); return true; } catch { return false; } })());
  }
  // through the real store: importDoc, open, derive, and the Library row
  const store = createStore({ ports: mkPorts(), autosave: false });
  let threw = null;
  try {
    await store.importDoc(doc);
    const d = store.getDerived();
    console.log('  importDoc of the collapsed document: issues =', d.issues.map((i) => i.code).join(', '),
      '| conflicts =', d.conflicts.length, '| library cityCount =', store.getState().library[0].cityCount);
    ok('importDoc opens it and surfaces the error rather than refusing it',
      d.issues.some((i) => i.code === 'duplicate_city_key'));
  } catch (e) { threw = e; }
  ok('importDoc did not throw on a previously-tolerated document', threw === null, threw && threw.message);
}

line('§6.4 the form paths construct no key, and the reference trip keeps the keys it has');
{
  const walk = (dir, out = []) => {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules' || e === 'dist' || e === '.vite') continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(p)) out.push(p);
    }
    return out;
  };
  const slug = /toLowerCase\(\)\s*\.\s*replace\(\s*\/\[\^a-z0-9\]\+\/g/;
  // `cityKey.test.ts` holds the same regex as its own ship-gate assertion — exclude the test
  // that IS the gate, exactly as the builder's version of this grep does.
  const hits = [...walk('apps'), ...walk('packages')]
    .filter((f) => !/cityKey\.test\.ts$/.test(f))
    .filter((f) => slug.test(readFileSync(f, 'utf8')));
  ok('the slug expression appears nowhere under apps/ or packages/', hits.length === 0, hits.join(', '));
  const { trip } = loadEurope2026();
  ok('the reference trip still carries its hand-authored keys verbatim',
    trip.cities.map((c) => c.key).join(',') === 'vienna,dubrovnik,split,prague,budapest,london',
    trip.cities.map((c) => c.key).join(','));
  ok('...and its validation issue count is unmoved at 11', core.validateTrip(trip).length === 11,
    String(core.validateTrip(trip).length));
}

/* ==================================================== §7  KD-42 ============ */

line('§7 KD-42 re-derived: 73 runtime symbols, and §2.10\'s own list says 73');
{
  // Round 22: 71 -> 73. Phase 2 I-5 (`897b928`) added `countryOf` and `COUNTRY_INDEX`.
  ok('Object.keys(core).length === 73', Object.keys(core).length === 73, String(Object.keys(core).length));
  const arch = readFileSync('docs/ARCHITECTURE.md', 'utf8');
  const block = arch.match(/packages\/core\/src\/index\.ts re-exports exactly this and nothing else[\s\S]*?\n```/);
  const groups = [...block[0].matchAll(/^\s{2}\w+\s+\((\d+)\)/gm)].map((m) => Number(m[1]));
  const sum = groups.reduce((a, b) => a + b, 0);
  ok('§2.10\'s enumerated group counts sum to 73', sum === 73, `${groups.join('+')} = ${sum}`);
  // R13-4: the correction did not reach the code comment the same pass wrote.
  const stale = [];
  for (const f of ['packages/core/src/conflict/detect.ts', 'packages/core/src/conflict/resolve.ts'])
    if (/symbol count stays at 70|count stays at 70/.test(readFileSync(f, 'utf8'))) stale.push(f);
  ok('R13-4: no source comment still claims the count "stays at 70"', stale.length === 0, stale.join(', '));
}

/* ==================================================== §8  KD-44 ============ */

line('§8 R13-5 — KD-44\'s fallback phrase, composed into the sentence a person reads');
{
  const { trip } = loadEurope2026();
  const place = trip.places.find((p) => p.cityKey === 'vienna' && p.at !== null);
  const bad = (cityKey) => ({
    ...trip,
    places: trip.places.map((p) => (p.id === place.id
      ? { ...p, cityKey, at: { lat: place.at.lat + 9, lng: place.at.lng } } : p)),
  });
  const good = core.detectConflicts(bad('vienna'), { today: FIXTURE_TODAY })
    .find((c) => c.ruleId === 'geo_outlier' && c.subjects.some((s) => s.id === place.id));
  const miss = core.detectConflicts(bad('no-such-city'), { today: FIXTURE_TODAY })
    .find((c) => c.ruleId === 'geo_outlier' && c.subjects.some((s) => s.id === place.id));
  console.log('  resolvable :', good.summary);
  console.log('  fallback   :', miss.summary);
  ok('the raw opaque key does not reach the sentence (KD-44\'s actual fix)',
    !/no-such-city/.test(miss.summary));
  ok('params.cityKey still carries the id for anything structured', typeof miss.params.cityKey === 'string');
  // R13-5: the phrase is substituted where a noun phrase for a PLACE belongs, so the sentence
  // no longer parses, and the map/optional-list distinction `whereOf` exists to draw is lost.
  ok('R13-5a: the fallback sentence still reads as English',
    !/ on a city this trip does not have is /.test(miss.summary),
    '"… on a city this trip does not have is 9030 km from …"');

  // the pool label site, which composes the same phrase from a different branch
  const pooled = trip.pool.find((s) => s.placement.kind === 'pool');
  const orphanPool = {
    ...trip,
    pool: trip.pool.map((s) => (s.id === pooled.id
      ? { ...s, placement: { ...s.placement, cityKey: 'no-such-city' }, place: { kind: 'inline', at: { lat: 58.2, lng: 16.4 } } }
      : s)),
  };
  const poolMiss = core.detectConflicts(orphanPool, { today: FIXTURE_TODAY })
    .find((c) => c.ruleId === 'geo_outlier' && c.subjects.some((s) => s.id === pooled.id));
  console.log('  pool fallbk:', poolMiss.summary);
  ok('R13-5b: the two label sites stay distinguishable (map vs optional list)',
    poolMiss.params.where !== miss.params.where,
    `both render "${miss.params.where}" — a reader cannot tell a city map from an optional list`);
}

/* ==================================================== §9  ceilings ========= */

line('§9 the ceilings, re-derived by running');
{
  const { trip } = loadEurope2026();
  const bySev = core.detectConflicts(trip, { today: FIXTURE_TODAY })
    .reduce((a, c) => ((a[c.severity] = (a[c.severity] || 0) + 1), a), {});
  ok('2 blockers / 4 warnings / 11 notes at FIXTURE_TODAY',
    bySev.blocker === 2 && bySev.warning === 4 && bySev.note === 11, JSON.stringify(bySev));
  const ungated = detectMod.detectUngated(trip, { today: '2026-08-30' });
  const gated = core.detectConflicts(trip, { today: '2026-08-30' });
  console.log('  the completed reference trip at 2026-08-30: gated', gated.length, '| un-gated', ungated.length);
  ok('the un-gated set is strictly larger on a completed trip — that is A-9\'s whole difference',
    ungated.length > gated.length, `${ungated.length} vs ${gated.length}`);
  ok('and every gated finding is in the un-gated set',
    gated.every((c) => ungated.some((u) => u.id === c.id)));
  const rulesDir = 'packages/core/src/conflict/rules';
  const clockFiles = readdirSync(rulesDir).filter((f) => readFileSync(join(rulesDir, f), 'utf8').includes('ctx.today'));
  ok('`ctx.today` appears in exactly one rule file', clockFiles.length === 1 && clockFiles[0] === 'unbookedTicketed.ts',
    clockFiles.join(', '));
}

/* ==================================================== §10 R13-6 =========== */

line('§10 R13-6 — A-10 x `copyStopInto`: the social primitive now imports a key the target has not got');
{
  // §2.14's own scenario, in Jacob's words: "they could even look at mine and just add a
  // certain activity." Two trips, both to Vienna, both created by the product. Before A-10
  // both carried the slug `vienna`, so a copied `Place` landed on a city the target had.
  const mkTrip = (title, p, key) => {
    const c = ctx(p);
    let t = core.createTrip({ title, startDate: '2026-05-01', endDate: '2026-05-03',
      cities: [key
        ? { key, name: 'Vienna', order: 0, centre: { lat: 48.21, lng: 16.37 } }
        : { name: 'Vienna', order: 0, centre: { lat: 48.21, lng: 16.37 } }] }, c);
    const k = t.cities[0].key;
    for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: k, cities: [k] });
    return { t, k, c };
  };
  const copyRun = (keyA, keyB) => {
    const A = mkTrip('Marta’s Vienna', 'a', keyA);
    const B = mkTrip('Jacob’s Vienna', 'b', keyB);
    let a = { ...A.t, places: [{ id: 'place-a1', cityKey: A.k, name: 'Belvedere', at: { lat: 48.1915, lng: 16.3806 }, category: 'sight' }] };
    a = core.addStop(a, { kind: 'scheduled', dayId: a.days[0].id, time: '10:00', order: 0 },
      { name: 'Belvedere', category: 'sight', place: { kind: 'place', placeId: 'place-a1' } }, A.c);
    const stopId = a.days[0].stops[0].id;
    const copyCtx = { ids: core.sequentialIds('cp'), now: '2026-01-01', today: '2026-01-01', actorUserId: 'user:jacob' };
    const b = core.copyStopInto(B.t, { trip: a, stopId }, { kind: 'scheduled', dayId: B.t.days[0].id, time: '11:00', order: 0 }, copyCtx);
    return { A, B, b, issues: core.validateTrip(b) };
  };

  const minted = copyRun(null, null);
  const slugged = copyRun('vienna', 'vienna');
  console.log('  post-A-10 (minted keys):', JSON.stringify(minted.A.k), '->', JSON.stringify(minted.B.k),
    '| copied place cityKey =', JSON.stringify(minted.b.places[0].cityKey),
    '| issues =', minted.issues.map((i) => `${i.code}:${i.level}`).join(', ') || '(none)');
  console.log('  pre-A-10 shape (both "vienna"):',
    '| issues =', slugged.issues.map((i) => `${i.code}:${i.level}`).join(', ') || '(none)');
  ok('copying a place-linked stop between two Vienna trips leaves the target valid',
    !minted.issues.some((i) => i.code === 'unknown_city_key'),
    minted.issues.filter((i) => i.code === 'unknown_city_key').map((i) => i.message).join(' | '));
  ok('(control) the same copy under the pre-A-10 slug was clean',
    !slugged.issues.some((i) => i.code === 'unknown_city_key'));
  const msg = minted.issues.find((i) => i.code === 'unknown_city_key');
  ok('R13-6b: the issue a person reads does not print the raw opaque key',
    !msg || !new RegExp(minted.A.k).test(msg.message), msg && msg.message);
  // ...and the same key then reaches geo_outlier's label helper, so KD-44's fallback is
  // reachable on an ORDINARY copy rather than only on a corrupt document.
  const far = {
    ...minted.b,
    places: minted.b.places.map((p) => ({ ...p, at: { lat: p.at.lat + 9, lng: p.at.lng } })),
  };
  const geo = core.detectConflicts(far, { today: '2026-01-01' }).filter((x) => x.ruleId === 'geo_outlier');
  if (geo.length) console.log('  geo_outlier on the copied place:', JSON.stringify(geo[0].params.where));
  ok('a copied place does not render KD-44\'s "no such city" fallback',
    !geo.some((g) => g.params.where === 'a city this trip does not have'),
    geo.map((g) => g.params.where).join(', '));
}

console.log(`\n== r13-gate-citykey: ${fails} FAIL ==`);
