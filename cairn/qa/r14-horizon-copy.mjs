/**
 * Round 14 — the breaker pass over ARCHITECTURE revision 12's four rulings:
 * **A-11** (`Rule.horizonDays`; the clock may not decide membership of the un-gated set),
 * **A-12** (`detectUngatedChecked`; a crashed rule's contribution is *unknown*, not absent),
 * **A-13** (A-9 assertion 4's substituted mechanism + the `endDate`-fallback tripwire) and
 * **A-14** (`copyStopInto` re-files a copied `Place`'s `CityKey`, or the place does not travel).
 *
 * Run: node --experimental-strip-types qa/r14-horizon-copy.mjs   (from cairn/)
 *
 * Two sections need a second checkout and print SKIP without it:
 *   git worktree add /tmp/r14-pre 78b490f     # the commit BEFORE A-11/A-12/A-13
 *   git worktree add /tmp/r14-tw  fb3ff34     # a scratch tree for the A-13 tripwire red state
 *
 *   §1  A-11's property attacked far past its own six-clock sweep: 433 daily clocks over ten
 *       documents; the 60-day boundary in both sets; an injected rule at horizon 0 / negative /
 *       NaN / Infinity / 1e9; an INTEGRITY rule declaring a horizon; a horizoned and a
 *       horizon-free rule on one document; and the pre-vs-post differential that A-11
 *       assertion 5 calls "provably output-neutral".                              (R14-1)
 *   §2  KD-48's "ten, not three" re-derived from the fixture rather than from the code.
 *   §3  A-12 against multiple simultaneous crashes, a CLOCK-DEPENDENT crash, 25 rounds of
 *       dismiss/crash/recover, the discriminating genuine-fix case, and the client store.
 *   §4  A-13's tripwire: its static shape, its coverage, and (with /tmp/r14-tw) whether a real
 *       rule increment turns it red for the right reason.
 *   §5  A-14 against nastier city matching: three same-named cities, the tie-break, a
 *       WITHIN-TRIP copy that A-14 says is unchanged and is not (R14-2), Unicode folding,
 *       double-hop copies, KD-47's disclosed pre-A-14 gap, the inline-place alias (R14-3),
 *       and the reworked `lisbonWithCopiedPlaceStop` fixture measured against the one it
 *       replaced.
 *       §5.9 is R14-4: the un-fixed half of round 2's BLOCKER R2-3 — rule 4 hands the
 *       referenced `Place`'s `note` and `links` across the trip boundary unredacted.
 *   §6  Cross-cutting: copy -> horizoned conflict -> unrelated crash -> retirement.
 *   §7  The ceilings re-derived by running: 71 exports, conflicts/validation at five clocks,
 *       goldens and the sample sha, KD numbering, `test/disclosure.test.ts`.
 *
 * A FAIL line means the probe found what it was looking for. Read the finding in
 * ../docs/QA-FINDINGS.md before assuming the script is broken.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const core = await import('../packages/core/src/index.ts');
const detectMod = await import('../packages/core/src/conflict/detect.ts');
const { normalizeCityName } = await import('../packages/core/src/model/cityName.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');
const { loadEurope2026, FIXTURE_TODAY } = await import('../fixtures/loadEurope2026.mjs');

let fails = 0;
const ok = (n, c, x = '') => {
  if (!c) fails++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
};
const skip = (n, why) => console.log('  skip ' + n + ' — ' + why);
const line = (s) => console.log('\n== ' + s + ' ==');
const ctx = (p = 'p') => ({ ids: core.sequentialIds(p), now: '2026-01-01', actorUserId: core.LOCAL_OWNER });
const copyCtx = (p) => ({ ids: core.sequentialIds(p), today: '2026-04-01', actorUserId: core.LOCAL_OWNER });
const mkPorts = (storage, today) => ({
  storage: storage ?? mem.memoryStorage(),
  clock: mem.fixedClockPort(today ?? '2026-08-27'),
  ids: mem.sequentialIdPort('i'),
  file: mem.memoryFile(),
  scheduler: mem.immediateScheduler(),
});
const digestOf = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);

const PRE = '/tmp/r14-pre/cairn';
const TW = '/tmp/r14-tw/cairn';

/** Every day from 2025-11-01 for 430 days, plus four far-out clocks. */
const CLOCKS = (() => {
  const out = [];
  const d0 = Date.UTC(2025, 10, 1);
  for (let i = 0; i < 430; i++) out.push(new Date(d0 + i * 86400000).toISOString().slice(0, 10));
  return out.concat(['2019-01-01', '2027-08-30', '2030-01-01', '2099-12-31']);
})();

/** One ticketed, priced, unbooked stop on one day — the 60-day boundary is one clock step away. */
function horizonTrip(dayDate, prefix = 'h') {
  const c = ctx(prefix);
  let t = core.createTrip(
    { title: 'Horizon', startDate: dayDate, endDate: dayDate,
      cities: [{ name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }] }, c);
  const key = t.cities[0].key;
  for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: key, cities: [key] });
  return core.addStop(
    t, { kind: 'scheduled', dayId: dayDate, time: '10:00', order: 0 },
    { name: 'Ghibli Museum', category: 'sight', place: { kind: 'inline', at: { lat: 35.696, lng: 139.57 } },
      cost: { display: '€10', amounts: [{ lo: 10, hi: 10, currency: 'EUR', basis: 'per_person' }] },
      links: [{ label: 'Tickets', href: 'https://example.test/t' }] }, c);
}

/** A document whose stop id appears on TWO days — `validateTrip` calls it `duplicate_id`. */
function duplicateStopIdTrip(mod = core) {
  const c = { ids: mod.sequentialIds('d'), now: '2026-01-01', actorUserId: mod.LOCAL_OWNER };
  let t = mod.createTrip({ title: 'D', startDate: '2026-05-01', endDate: '2026-09-01',
    cities: [{ name: 'Vienna', order: 0, centre: { lat: 48.2, lng: 16.37 } }] }, c);
  const init = { id: 'stop-dup', name: 'Tick', category: 'sight', place: { kind: 'none' },
    cost: { display: '€10', amounts: [{ lo: 10, hi: 10, currency: 'EUR', basis: 'per_person' }] },
    links: [{ label: 'T', href: 'https://e.test/t' }] };
  t = mod.addStop(t, { kind: 'scheduled', dayId: '2026-05-01', time: '10:00', order: 0 }, init, c);
  return mod.addStop(t, { kind: 'scheduled', dayId: '2026-09-01', time: '10:00', order: 0 }, init, c);
}

/* ==================================================== §1  A-11's property ==== */

line('§1.1 the invariant swept over 434 clocks and ten documents, not six clocks and six');
{
  const { trip: reference } = loadEurope2026();
  const fx = await import('../packages/core/test/faultFixtures.ts');
  const docs = fx.faultFixtures().map((f) => [f.name, f.trip]);
  docs.push(['horizon-60', horizonTrip('2026-03-02')]);
  docs.push(['duplicate-stop-id', duplicateStopIdTrip()]);
  // A dismissal present, so the "it has come back" detail path is exercised too.
  const tgt = detectMod.detectUngated(reference, { today: FIXTURE_TODAY }).find((c) => c.ruleId === 'unbooked_ticketed');
  docs.push(['reference+dismissal', core.resolveConflict(reference, {
    conflictId: tgt.id, state: 'dismissed', by: core.LOCAL_OWNER, at: FIXTURE_TODAY })]);
  docs.push(['reference+retired-row', core.syncResolutions(core.resolveConflict(reference, {
    conflictId: 'nothing-matches-this', state: 'dismissed', by: core.LOCAL_OWNER, at: FIXTURE_TODAY }), FIXTURE_TODAY)]);

  let moved = 0;
  for (const [name, trip] of docs) {
    let baseline = null, firstMove = null;
    for (const today of CLOCKS) {
      const ids = detectMod.detectUngated(trip, { today }).map((c) => c.id).sort().join('|');
      if (baseline === null) baseline = ids;
      else if (ids !== baseline && firstMove === null) { firstMove = today; moved++; }
    }
    ok(`${name}: detectUngated's id set is identical at all ${CLOCKS.length} clocks`,
      firstMove === null, firstMove ? `first moved at today=${firstMove}` : '');
  }
  ok('A-11\'s property holds across every document swept', moved === 0);
}

line('§1.2 the 60-day boundary itself, in both sets');
{
  const t = horizonTrip('2026-03-02');
  const rows = [['2026-01-02', 59], ['2026-01-01', 60], ['2025-12-31', 61], ['2025-12-30', 62]];
  const g = {}, u = {};
  for (const [today, delta] of rows) {
    g[delta] = core.detectConflicts(t, { today }).filter((c) => c.ruleId === 'unbooked_ticketed').length;
    u[delta] = detectMod.detectUngated(t, { today }).filter((c) => c.ruleId === 'unbooked_ticketed').length;
  }
  ok('gated: fires at delta 59 and 60, withheld at 61 and 62 — `> horizonDays`, strictly',
    g[59] === 1 && g[60] === 1 && g[61] === 0 && g[62] === 0, JSON.stringify(g));
  ok('un-gated: present at every delta — the horizon is a gate, not a rule guard',
    u[59] === 1 && u[60] === 1 && u[61] === 1 && u[62] === 1, JSON.stringify(u));
  const ids = new Set(rows.map(([today]) => detectMod.detectUngated(t, { today })
    .find((c) => c.ruleId === 'unbooked_ticketed').id));
  ok('...and it is ONE conflict id across the boundary', ids.size === 1);
}

line('§1.3 an injected rule: horizon 0, negative, NaN, Infinity, 1e9, and an INTEGRITY class');
{
  const RULES = detectMod.RULES;
  const t = horizonTrip('2026-03-02', 'ij');
  const dayId = t.days[0].id;
  const mkRule = (horizonDays, klass = 'feasibility', subjects = [{ kind: 'day', id: dayId }]) => ({
    id: 'legacy_flag', // a real RuleId; the probe swaps `run` on a clone below
    description: 'probe',
    class: klass,
    ...(horizonDays === undefined ? {} : { horizonDays }),
    run: () => [{ id: 'probe-1', kind: 'editorial', ruleId: 'legacy_flag', severity: 'note',
      subjects, summary: 's', params: {}, resolution: null }],
  });
  const withRule = (rule, fn) => {
    RULES.push(rule);
    try { return fn(); } finally { RULES.pop(); }
  };
  const seen = (trip, opts, gate) => (gate ? core.detectConflicts : detectMod.detectUngated)(trip, opts)
    .some((c) => c.id === 'probe-1');

  for (const [label, h, expectGatedAt61] of [
    ['horizon 0', 0, false],       // the day is 60 days out: 60 > 0 -> suppressed
    ['horizon -1', -1, false],
    ['horizon 1e9', 1e9, true],
    ['horizon NaN', NaN, true],    // NaN comparisons are false -> never suppressed
    ['horizon Infinity', Infinity, true],
  ]) {
    const r = mkRule(h);
    const gated = withRule(r, () => seen(t, { today: '2026-01-01' }, true));
    const ungated = withRule(r, () => seen(t, { today: '2026-01-01' }, false));
    ok(`${label}: un-gated ALWAYS contains the finding`, ungated === true, `ungated=${ungated}`);
    ok(`${label}: gated behaviour is the declared one`, gated === expectGatedAt61,
      `gated=${gated}, expected ${expectGatedAt61}`);
  }
  // An integrity rule declaring a horizon: A-11 forbids it by assertion, not by type. What
  // does the mechanism actually do?
  const integ = mkRule(0, 'integrity');
  const gI = withRule(integ, () => seen(t, { today: '2026-01-01' }, true));
  const uI = withRule(integ, () => seen(t, { today: '2026-01-01' }, false));
  ok('an INTEGRITY rule\'s horizon is applied by detect.ts anyway (documented as forbidden, not enforced)',
    gI === false && uI === true, `gated=${gI} ungated=${uI}`);
  ok('...and the shipped RULES table still declares exactly one horizon, on a feasibility rule',
    RULES.filter((r) => r.horizonDays !== undefined).map((r) => `${r.id}:${r.class}`).join() === 'unbooked_ticketed:feasibility');

  // Two rules on one document, one horizoned and one not.
  const plain = { ...mkRule(undefined), run: () => [{ id: 'probe-2', kind: 'editorial', ruleId: 'legacy_flag',
    severity: 'note', subjects: [{ kind: 'day', id: dayId }], summary: 's', params: {}, resolution: null }] };
  const both = withRule(mkRule(0), () => withRule(plain, () => ({
    gated: core.detectConflicts(t, { today: '2026-01-01' }).map((c) => c.id),
    ungated: detectMod.detectUngated(t, { today: '2026-01-01' }).map((c) => c.id),
  })));
  ok('a horizon-free rule beside a horizoned one is unaffected in the GATED set',
    both.gated.includes('probe-2') && !both.gated.includes('probe-1'), JSON.stringify(both.gated));
  ok('...and both are present un-gated',
    both.ungated.includes('probe-1') && both.ungated.includes('probe-2'), JSON.stringify(both.ungated));

  // A finding with a mixed subject set: one subject inside the horizon keeps it (§8.2 ruling 1).
  const far = core.createTrip({ title: 'M', startDate: '2026-01-05', endDate: '2026-06-05',
    cities: [{ name: 'X', order: 0, centre: { lat: 0, lng: 0 } }] }, ctx('m'));
  const mixed = { ...mkRule(60), run: () => [{ id: 'probe-3', kind: 'editorial', ruleId: 'legacy_flag',
    severity: 'note', subjects: [{ kind: 'day', id: '2026-01-06' }, { kind: 'day', id: '2026-06-05' }],
    summary: 's', params: {}, resolution: null }] };
  const kept = withRule(mixed, () => core.detectConflicts(far, { today: '2026-01-01' }).some((c) => c.id === 'probe-3'));
  ok('§8.2 ruling 1\'s asymmetry holds for the horizon: one subject inside keeps the finding', kept === true);
  const allFar = { ...mixed, run: () => [{ ...mixed.run()[0], id: 'probe-4',
    subjects: [{ kind: 'day', id: '2026-06-04' }, { kind: 'day', id: '2026-06-05' }] }] };
  const dropped = withRule(allFar, () => core.detectConflicts(far, { today: '2026-01-01' }).some((c) => c.id === 'probe-4'));
  ok('...and every subject beyond it drops the finding', dropped === false);
  // An EMPTY subject list is never suppressed by either gate.
  const noSubj = { ...mixed, run: () => [{ ...mixed.run()[0], id: 'probe-5', subjects: [] }] };
  const kept0 = withRule(noSubj, () => core.detectConflicts(far, { today: '2026-01-01' }).some((c) => c.id === 'probe-5'));
  ok('a subject-less finding is never suppressed by the horizon', kept0 === true);
}

line('§1.4 R14-1 — A-11 assertion 5\'s "provably output-neutral" differential, pre vs post');
if (!existsSync(`${PRE}/packages/core/src/index.ts`)) {
  skip('the pre-A-11 differential', `no checkout at ${PRE} — see this file's header`);
} else {
  const old = {
    core: await import(`${PRE}/packages/core/src/index.ts`),
    fx: await import(`${PRE}/fixtures/loadEurope2026.mjs`),
  };
  const pairs = [
    ['reference', loadEurope2026().trip, old.fx.loadEurope2026().trip],
    ['horizon-60', horizonTrip('2026-03-02'), (() => {
      const c = { ids: old.core.sequentialIds('h'), now: '2026-01-01', actorUserId: old.core.LOCAL_OWNER };
      let t = old.core.createTrip({ title: 'Horizon', startDate: '2026-03-02', endDate: '2026-03-02',
        cities: [{ name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }] }, c);
      const key = t.cities[0].key;
      for (const d of t.days) t = old.core.setDayMeta(t, d.id, { primaryCity: key, cities: [key] });
      return old.core.addStop(t, { kind: 'scheduled', dayId: '2026-03-02', time: '10:00', order: 0 },
        { name: 'Ghibli Museum', category: 'sight', place: { kind: 'inline', at: { lat: 35.696, lng: 139.57 } },
          cost: { display: '€10', amounts: [{ lo: 10, hi: 10, currency: 'EUR', basis: 'per_person' }] },
          links: [{ label: 'Tickets', href: 'https://example.test/t' }] }, c);
    })()],
    ['duplicate-stop-id', duplicateStopIdTrip(), duplicateStopIdTrip(old.core)],
  ];
  for (const [name, tNew, tOld] of pairs) {
    let diverged = null, n = 0;
    for (const today of CLOCKS.concat([undefined])) {
      const opts = today === undefined ? {} : { today };
      const a = digestOf(core.detectConflicts(tNew, opts));
      const b = digestOf(old.core.detectConflicts(tOld, opts));
      if (a !== b) { n++; if (!diverged) diverged = today ?? '(no clock)'; }
    }
    if (name === 'duplicate-stop-id') {
      // A-17 (revision 13) narrowed A-11 assertion 5 to *"provably output-neutral on every
      // document `validateTrip` accepts"*. This document carries a `duplicate_id` ERROR, so a
      // non-zero differential here is now a documented, expected divergence — over-reporting
      // only, bounded to documents this system already reports as invalid. The line stays as
      // the MEASUREMENT of that divergence (QA measured 123 of 435 clocks), not as a failure.
      console.log(`  ${name}: ${n}/${CLOCKS.length + 1} clocks diverge from pre-A-11` +
        `${n ? `, first at ${diverged}` : ''} — expected and documented (A-17), not a failure`);
      continue;
    }
    ok(`${name}: detectConflicts is byte-identical to pre-A-11 at all ${CLOCKS.length + 1} clocks`,
      n === 0, n ? `${n} clocks diverge, first at ${diverged}` : '');
  }
  const dupOld = duplicateStopIdTrip(old.core);
  const at = '2026-06-20';
  const b = old.core.detectConflicts(dupOld, { today: at }).filter((c) => c.ruleId === 'unbooked_ticketed');
  console.log(`  pre-A-11 @${at}: ${b.length} note(s) daysOut=${JSON.stringify(b.map((x) => x.params.daysOut))}`);
}

line('§1.5 R14-1 standalone — the horizon on a document whose stop id is on two days (A-17)');
{
  // `beyondHorizon` resolves a `{kind:'stop'}` subject through `subjectDate`, which returns the
  // FIRST day containing that id — not the day the rule was iterating. The finding minted on
  // the far day therefore has one subject inside the horizon and survives a gate the deleted
  // `delta > 60` would have closed. No second checkout needed for this half.
  const dup = duplicateStopIdTrip();
  const at = '2026-06-20';
  const a = core.detectConflicts(dup, { today: at }).filter((c) => c.ruleId === 'unbooked_ticketed');
  console.log(`  post-A-11 @${at}: ${a.length} note(s) daysOut=${JSON.stringify(a.map((x) => x.params.daysOut))}`);
  // The original assertion here — *"no `unbooked_ticketed` note survives the gate more than 60
  // days out"* — is RETIRED BY **A-17**, not fixed: it asserts the claim A-17 has just narrowed.
  // `subjectDate` is the right resolver and on a `duplicate_id` document there is no correct
  // answer for it to return, so the ruling buys the safe half only and says so in writing. The
  // measurement above stays, because the surviving `daysOut` values are the interesting number.
  // What replaces it is A-17 point 3's DIRECTION: the gate may over-report, never withhold.
  const horizons = new Map(detectMod.RULES.filter((r) => r.horizonDays !== undefined)
    .map((r) => [r.id, r.horizonDays]));
  let withheld = null, checked = 0;
  for (const [name, trip] of [['duplicate-stop-id', dup], ['horizon-60', horizonTrip('2026-03-02', 'a17')]]) {
    for (const today of CLOCKS) {
      const gated = new Set(core.detectConflicts(trip, { today }).map((c) => c.id));
      for (const c of detectMod.detectUngated(trip, { today })) {
        const h = horizons.get(c.ruleId);
        if (h === undefined) continue;
        const d = Number(c.params.daysOut);
        // `daysOut >= 0` excludes §8.2's PAST gate, which A-11 never touched: inside this band
        // the horizon is the only gate left that could withhold the finding.
        if (!Number.isFinite(d) || d < 0 || d > h) continue;
        checked++;
        if (!gated.has(c.id) && !withheld) withheld = `${name} @${today}: ${c.id} at ${d} days out`;
      }
    }
  }
  ok(`A-17: the gate never WITHHOLDS a finding inside its own horizon (${checked} checked)`,
    withheld === null && checked > 0,
    withheld ?? (checked === 0 ? 'nothing was checked — the sweep is vacuous' : ''));
  const codes = core.validateTrip(dup).filter((i) => i.level === 'error').map((i) => i.code);
  const parses = (() => { try { core.fromJSON(JSON.parse(JSON.stringify(core.toJSON(dup)))); return true; } catch { return false; } })();
  console.log('  reachability: validateTrip says', JSON.stringify(codes), '| fromJSON accepts it:', parses);
}

/* ============================================================= §2  KD-48 ==== */

line('§2 KD-48: "ten, not three" re-derived from the fixture, not from the rule');
{
  const { trip } = loadEurope2026();
  // Counted independently of the rule: a scheduled stop with no bookingId, a cost, and a link.
  let byHand = 0;
  const names = [];
  for (const d of trip.days) {
    for (const s of d.stops) {
      if (s.bookingId) continue;
      if (!s.cost) continue;
      if (!((s.links && s.links.length > 0) || s.ticket)) continue;
      byHand++; names.push(`${d.date} ${s.name}`);
    }
  }
  const fired = detectMod.detectUngated(trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'unbooked_ticketed');
  ok('the rule fires exactly as often as the fixture has ticketed-unbooked scheduled stops',
    fired.length === byHand, `rule ${fired.length}, hand count ${byHand}`);
  ok('and that number is 10, which is what KD-48 measured', byHand === 10, `${byHand}`);
  console.log('  ' + names.join('\n  '));
  ok('the three named fixture cases are among them',
    ['Széchenyi', 'Prague Castle', 'Windsor'].every((w) => names.some((n) => n.includes(w))));
  const eleven = core.detectConflicts(trip, { today: FIXTURE_TODAY }).filter((c) => c.severity === 'note').length;
  ok('the shipped ceiling of 11 notes still holds, 10 of them from this rule', eleven === 11, `${eleven}`);
}

/* =============================================================== §3  A-12 ==== */

line('§3 A-12 — "unknown, not absent" under multiple, clock-dependent and repeated crashes');
{
  const RULES = detectMod.RULES;
  const saved = RULES.map((r) => r.run);
  const restore = () => RULES.forEach((r, i) => { r.run = saved[i]; });
  const crash = (ids) => RULES.forEach((r, i) => {
    r.run = ids.includes(r.id) ? () => { throw new Error('boom ' + r.id); } : saved[i];
  });

  // A five-night Tokyo trip with nothing booked to sleep in — `missing_lodging` fires once,
  // and one lodging Booking is the genuine fix. Lifted from `qa/r13-gate-citykey.mjs` §2.
  const CLOCK = '2026-08-24';
  const base = (() => {
    const c = ctx('rl');
    let t = core.createTrip({ title: 'R', startDate: '2026-08-25', endDate: '2026-08-29',
      cities: [{ key: 'tokyo', name: 'Tokyo', order: 0, centre: { lat: 35.68, lng: 139.77 } }] }, c);
    for (const d of t.days) t = core.setDayMeta(t, d.id, { primaryCity: 'tokyo', cities: ['tokyo'] });
    return t;
  })();
  const target = core.detectConflicts(base, { today: CLOCK }).find((x) => x.ruleId === 'missing_lodging');
  const dismissed = core.resolveConflict(base, {
    conflictId: target.id, state: 'dismissed', by: core.LOCAL_OWNER, at: CLOCK });
  const lodgingBooking = (t) => core.upsertBooking(t, {
    id: 'b-1', tripId: t.id, kind: 'lodging', operator: 'Hotel Tokyo', reference: null,
    startsAt: { date: '2026-08-25', time: null }, endsAt: { date: '2026-08-29', time: null },
    price: null, party: null, status: 'active', ticket: null,
    provenance: { source: 'user', state: 'accepted', confidence: 'confirmed',
      addedAt: CLOCK, acceptedAt: CLOCK, actorUserId: null },
  });

  try {
    for (const set of [['missing_lodging'], ['geo_outlier'], ['missing_lodging', 'geo_outlier'],
      ['missing_lodging', 'geo_outlier', 'overlap', 'legacy_flag'], RULES.map((r) => r.id)]) {
      crash(set);
      const out = core.syncResolutions(dismissed, CLOCK);
      const reported = detectMod.detectUngatedChecked(dismissed, { today: CLOCK }).crashed;
      restore();
      ok(`${set.length} simultaneous crash(es): same reference, nothing stamped`,
        out === dismissed && out.resolutions[0].retiredAt === null);
      ok(`...and every crashing rule is reported, in RULES order`,
        reported.join() === RULES.filter((r) => set.includes(r.id)).map((r) => r.id).join(),
        reported.join());
    }

    // A crash that only happens at SOME clocks, over a document whose dismissal is GENUINELY
    // fixed — so the un-gated set legitimately lacks it and retirement is due.
    const fixed = lodgingBooking(dismissed);
    ok('precondition: the dismissed finding is genuinely gone after the repair',
      !detectMod.detectUngated(fixed, { today: CLOCK }).some((c) => c.id === target.id));
    const clean = core.syncResolutions(fixed, CLOCK);
    ok('with no crash, the genuine fix retires — §2.7 is not lost',
      clean.resolutions.find((r) => r.conflictId === target.id).retiredAt === CLOCK);

    const idx = RULES.findIndex((r) => r.id === 'geo_outlier');
    RULES[idx].run = (c) => { if (c.today >= '2026-08-20') throw new Error('late boom'); return saved[idx](c); };
    const early = core.syncResolutions(fixed, '2026-08-01');
    const late = core.syncResolutions(fixed, '2026-08-25');
    restore();
    ok('a CLOCK-DEPENDENT crash in another rule defers the genuine retirement at the crashing clock',
      late === fixed, `retiredAt=${late.resolutions.find((r) => r.conflictId === target.id).retiredAt}`);
    ok('...and does not defer it at a clock where the rule works',
      early !== fixed && early.resolutions.find((r) => r.conflictId === target.id).retiredAt === '2026-08-01');

    // 25 rounds of crash / recover on the SAME document — nothing leaks across calls.
    let s = dismissed, leaked = 0;
    for (let i = 0; i < 25; i++) {
      crash(['missing_lodging']);
      const before = s;
      s = core.syncResolutions(s, CLOCK);
      if (s !== before) leaked++;
      restore();
      s = core.syncResolutions(s, CLOCK);
      if (s.resolutions[0].retiredAt !== null) leaked++;
    }
    ok('25 rounds of dismiss/crash/recover leak nothing across calls', leaked === 0, `${leaked} leaks`);
    ok('...and the revision is unmoved after all 50 calls', s.revision === dismissed.revision,
      `${dismissed.revision} -> ${s.revision}`);

    // Through the real store: a crash while the panel renders must not dirty storage.
    const storage = mem.memoryStorage();
    const store = createStore({ ports: mkPorts(storage, CLOCK), autosave: false });
    await store.adoptTrip(fixed);
    crash(['geo_outlier']);
    store.getDerived();
    await store.flush();
    restore();
    const stored = core.fromJSON((await storage.load(fixed.id)).doc);
    ok('store: one render during a crash does not stamp the retirement into storage',
      stored.resolutions.find((r) => r.conflictId === target.id).retiredAt === null,
      String(stored.resolutions.find((r) => r.conflictId === target.id).retiredAt));
    // A-12's cost, stated: retirement runs only on a `derivedFor` cache MISS
    // (`getDerived` passes `cache !== prev`), and a rule is a pure function of the document,
    // so a crash is deterministic for that document. A second render at the same
    // (document, clock) therefore does NOT retry — and does not need to.
    store.getDerived();
    await store.flush();
    const same = core.fromJSON((await storage.load(fixed.id)).doc);
    ok('store: a second render at the SAME (document, clock) does not retry — the derived cache holds',
      same.resolutions.find((r) => r.conflictId === target.id).retiredAt === null);
    // The recompute A-12 leans on: anything that invalidates the cache. An explicit
    // `store.syncResolutions()` is the request form of exactly that.
    store.syncResolutions();
    await store.flush();
    const after = core.fromJSON((await storage.load(fixed.id)).doc);
    ok('store: retirement RESUMES on the next real recompute once the rule works again',
      after.resolutions.find((r) => r.conflictId === target.id).retiredAt !== null,
      String(after.resolutions.find((r) => r.conflictId === target.id).retiredAt));
  } finally {
    restore();
  }
}

/* =============================================================== §4  A-13 ==== */

line('§4 A-13\'s tripwire: shape, coverage, and whether a real increment turns it red');
{
  const src = readFileSync(new URL('../packages/core/test/retirementGate.test.ts', import.meta.url), 'utf8');
  ok('the inert `setTripMeta({endDate})` call is gone from the A-9(4) test',
    !/setTripMeta\([^)]*endDate/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));
  ok('the A-9(4) test\'s NAME describes the clock crossing it runs',
    /test\('A-9 \(4\)[^']*crossing the gate boundary/.test(src));
  ok('the tripwire measures the UN-gated set', /A-13 tripwire[\s\S]{0,900}?detectUngated\(/.test(src));
  ok('the tripwire asserts every feasibility rule was actually seen',
    /produced no finding on any fixture/.test(src));
  // Its coverage: how many feasibility findings does it actually inspect?
  const fx = await import('../packages/core/test/faultFixtures.ts');
  const feasibility = new Set(detectMod.RULES.filter((r) => r.class === 'feasibility').map((r) => r.id));
  let inspected = 0; const seen = new Set();
  for (const { trip } of fx.faultFixtures()) {
    for (const c of detectMod.detectUngated(trip, { today: FIXTURE_TODAY })) {
      if (!feasibility.has(c.ruleId)) continue;
      inspected++; seen.add(c.ruleId);
    }
  }
  console.log(`  the tripwire inspects ${inspected} feasibility findings covering ${seen.size}/${feasibility.size} rules`);
  ok('every feasibility rule is covered by the fixtures the tripwire sweeps',
    seen.size === feasibility.size, [...feasibility].filter((r) => !seen.has(r)).join());
}

if (!existsSync(`${TW}/package.json`)) {
  skip('the tripwire RED state', `no scratch checkout at ${TW} — see this file's header`);
} else {
  // A plausible next increment: `unbooked_ticketed` also covers a ticketed POOL stop. A pool
  // stop has no day of its own, so its only subject resolves through §8.2 ruling 2's fallback.
  const file = `${TW}/packages/core/src/conflict/rules/unbookedTicketed.ts`;
  const original = readFileSync(file, 'utf8');
  const patched = original.replace('    return out;\n  },', `    for (const stop of ctx.trip.pool) {
      if (stop.bookingId) continue;
      if (!stop.cost) continue;
      if (!((stop.links && stop.links.length > 0) || !!stop.ticket)) continue;
      out.push(makeConflict({ ruleId: 'unbooked_ticketed', kind: 'coverage', severity: 'note',
        subjects: [{ kind: 'stop', id: stop.id }],
        summary: \`“\${stop.name}” is pooled, costs money and has a booking link, but nothing is booked.\`,
        params: { stopName: stop.name, date: ctx.trip.endDate, cost: stop.cost.display ?? '', daysOut: 0 },
        values: { stop: stop.name, pool: true, cost: stop.cost.display } }));
    }
    return out;
  },`);
  const { writeFileSync } = await import('node:fs');
  let out = '';
  try {
    writeFileSync(file, patched);
    try {
      execFileSync('node', ['--test', 'packages/core/test/retirementGate.test.ts'],
        { cwd: TW, encoding: 'utf8', stdio: 'pipe' });
    } catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? ''); }
  } finally { writeFileSync(file, original); }
  ok('a real rule increment (a ticketed POOL stop) turns the A-13 tripwire RED',
    /not ok \d+ - A-13 tripwire/.test(out),
    /not ok \d+ - A-13 tripwire/.test(out) ? '' : (out ? 'the suite failed, but not on the tripwire' : 'the suite passed'));
  ok('...and it fails with A-13\'s own instruction, naming the ruling',
    /LITERAL mechanism has just become achievable/.test(out) && /A-13/.test(out));
}

/* =============================================================== §5  A-14 ==== */

/** A trip with `cities`, and optionally one `Place` filed under `cities[placeCityIdx]`. */
function cityTrip(prefix, cities, opts = {}) {
  const c = ctx(prefix);
  let t = core.createTrip({ title: prefix, startDate: '2026-05-01', endDate: '2026-05-04', cities }, c);
  if (opts.place) {
    const key = t.cities[opts.placeCityIdx ?? 0].key;
    t = { ...t, places: [...t.places, { id: `${prefix}-place`, name: opts.place.name ?? 'Prater',
      cityKey: opts.place.cityKey ?? key, at: opts.place.at === null ? null : (opts.place.at ?? { lat: 48.21, lng: 16.4 }),
      category: 'sight' }] };
    t = core.addStop(t, { kind: 'scheduled', dayId: t.days[0].id, time: '10:00', order: 0 },
      { name: 'Prater ride', category: 'sight', place: { kind: 'place', placeId: `${prefix}-place` } }, c);
  }
  return { trip: t, ctx: c, stopId: opts.place ? t.days[0].stops[0].id : null };
}
const V = (name, order, lat = 48.2, lng = 16.37) => ({ name, order, centre: { lat, lng } });

line('§5.1 A-14 assertion 1/2/3 re-derived, and the tie-break with THREE same-named cities');
{
  const s = cityTrip('src', [V('Vienna', 0)], { place: {} });
  const tgt = cityTrip('tgt', [V('Vienna', 0)]);
  const after = core.copyStopInto(tgt.trip, { trip: s.trip, stopId: s.stopId },
    { kind: 'scheduled', dayId: tgt.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('c1'));
  const np = after.places[after.places.length - 1];
  ok('a cross-trip copy re-files onto the TARGET\'s key', np.cityKey === after.cities[0].key);
  ok('...and mints no unknown_city_key', !core.validateTrip(after).some((i) => i.code === 'unknown_city_key'));

  // Three cities that all fold to the same name, in a document order that disagrees with `order`.
  let tb = 0;
  for (const [label, cities, wantIdx] of [
    ['orders 2,1,1 -> the second (lowest order, earliest position)', [V('Vienna', 2), V('  vienna ', 1), V('VIENNA', 1)], 1],
    ['orders 1,1,0 -> the third (lowest order, LAST position)', [V('Vienna', 1), V('vienna', 1), V('VIENNA ', 0)], 2],
    ['all order 0 -> document position wins', [V('Vienna', 0), V('vienna', 0), V('VIENNA', 0)], 0],
    ['negative orders -> the most negative wins', [V('Vienna', 0), V('vienna', -5), V('VIENNA', -1)], 1],
    ['fractional orders still order', [V('Vienna', 1.5), V('vienna', 0.25), V('VIENNA', 3)], 1],
  ]) {
    const t3 = cityTrip(`t3${tb++}`, cities);
    const res = core.copyStopInto(t3.trip, { trip: s.trip, stopId: s.stopId },
      { kind: 'scheduled', dayId: t3.trip.days[0].id, time: '11:00', order: 0 }, copyCtx(`c3${tb}`));
    const p = res.places[res.places.length - 1];
    ok(`tie-break, ${label}`, p && p.cityKey === t3.trip.cities[wantIdx].key,
      `landed on ${p && p.cityKey} (${res.cities.find((c) => c.key === (p && p.cityKey))?.name}), wanted index ${wantIdx}`);
  }

  // Reuse across trips (assertion 2) and byte-identity of two identical runs (assertion 4).
  const tgt2 = cityTrip('t2', [V('Vienna', 0)], { place: {} });
  const reused = core.copyStopInto(tgt2.trip, { trip: s.trip, stopId: s.stopId },
    { kind: 'scheduled', dayId: tgt2.trip.days[1].id, time: '11:00', order: 0 }, copyCtx('c2'));
  ok('assertion 2: an equivalent place in the target is reused, not duplicated',
    reused.places.length === tgt2.trip.places.length, `${tgt2.trip.places.length} -> ${reused.places.length}`);
  const r1 = core.copyStopInto(tgt.trip, { trip: s.trip, stopId: s.stopId },
    { kind: 'scheduled', dayId: tgt.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('z'));
  const r2 = core.copyStopInto(tgt.trip, { trip: s.trip, stopId: s.stopId },
    { kind: 'scheduled', dayId: tgt.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('z'));
  ok('assertion 4: two identical runs are byte-identical', digestOf(core.toJSON(r1)) === digestOf(core.toJSON(r2)));

  // Assertion 3: the no-match case.
  const prague = cityTrip('pr', [V('Prague', 0, 50.08, 14.44)]);
  const nomatch = core.copyStopInto(prague.trip, { trip: s.trip, stopId: s.stopId },
    { kind: 'scheduled', dayId: prague.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('c4'));
  ok('assertion 3: no city of that name -> no Place row added',
    nomatch.places.length === prague.trip.places.length);
  ok('...the stop keeps a resolvable coordinate',
    nomatch.days[0].stops[0].place.kind === 'inline' && nomatch.days[0].stops[0].place.at.lat === 48.21);
  ok('...and adds no unknown_city_key / place_ref_dangling / geo_outlier',
    !core.validateTrip(nomatch).some((i) => ['unknown_city_key', 'place_ref_dangling'].includes(i.code)) &&
    !core.detectConflicts(nomatch, { today: '2026-04-01' }).some((c) => c.ruleId === 'geo_outlier'));
  ok('...and target.cities is untouched', nomatch.cities.length === prague.trip.cities.length);

  // Assertion 5: a blank source name never matches a blank target name.
  const blankSrc = cityTrip('bs', [{ name: '   ', order: 0, centre: { lat: 1, lng: 1 } }], { place: {} });
  const blankTgt = cityTrip('bt', [{ name: '  ', order: 0, centre: { lat: 1, lng: 1 } }]);
  const blank = core.copyStopInto(blankTgt.trip, { trip: blankSrc.trip, stopId: blankSrc.stopId },
    { kind: 'scheduled', dayId: blankTgt.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('c5'));
  ok('assertion 5: two blank city names do not match — step 3',
    blank.places.length === blankTgt.trip.places.length && blank.days[0].stops[0].place.kind === 'inline');
}

line('§5.2 R14-2 — A-14 says copying WITHIN one trip is unchanged. With two same-named cities it is not');
{
  const t0 = cityTrip('w', [V('Vienna', 0, 48.2, 16.37), V('Vienna', 1, 48.3, 16.4)],
    { place: {}, placeCityIdx: 1 });
  const originalKey = t0.trip.places[0].cityKey;
  const lowest = t0.trip.cities[0].key;
  const after = core.copyStopInto(t0.trip, { trip: t0.trip, stopId: t0.stopId },
    { kind: 'scheduled', dayId: t0.trip.days[1].id, time: '11:00', order: 0 }, copyCtx('w1'));
  const np = after.places[after.places.length - 1];
  ok('R14-2: a within-trip copy keeps the place\'s own city key (A-14: "the key comes back identical")',
    np.cityKey === originalKey, `re-filed from ${originalKey} onto ${np.cityKey} (the lowest-order Vienna is ${lowest})`);
  ok('R14-2: ...and rule 4\'s reuse search matches the original place exactly as today',
    after.places.length === t0.trip.places.length, `${t0.trip.places.length} -> ${after.places.length} place rows`);
  // Repeat: does it stabilise, or grow?
  let grow = after;
  for (let i = 0; i < 3; i++) {
    grow = core.copyStopInto(grow, { trip: grow, stopId: t0.stopId },
      { kind: 'scheduled', dayId: grow.days[2].id, time: `1${i}:00`, order: i }, copyCtx(`w${i + 2}`));
  }
  console.log(`  three further copies of the same stop leave ${grow.places.length} place rows (bounded, not unbounded)`);
  const errs = core.validateTrip(grow).filter((i) => i.level === 'error').map((i) => i.code);
  ok('the resulting document is at least still valid', errs.length === 0, JSON.stringify(errs));
  // What a reader of the Places panel sees: the copy is filed under the OTHER Vienna.
  console.log(`  the copy is filed under city "${grow.cities.find((c) => c.key === np.cityKey)?.name}"` +
    ` order ${grow.cities.find((c) => c.key === np.cityKey)?.order}, the original under order` +
    ` ${grow.cities.find((c) => c.key === originalKey)?.order}`);
}

line('§5.3 R14-3 — a step-3 / inline source place is ALIASED into the target document');
{
  const c = ctx('al');
  let t = core.createTrip({ title: 'Inline', startDate: '2026-05-01', endDate: '2026-05-03',
    cities: [V('Vienna', 0)] }, c);
  t = core.addStop(t, { kind: 'scheduled', dayId: t.days[0].id, time: '10:00', order: 0 },
    { name: 'Inline', category: 'sight', place: { kind: 'inline', at: { lat: 1, lng: 2 } } }, c);
  const after = core.copyStopInto(t, { trip: t, stopId: t.days[0].stops[0].id },
    { kind: 'scheduled', dayId: t.days[1].id, time: '11:00', order: 0 }, copyCtx('al1'));
  const srcPlace = t.days[0].stops[0].place, dstPlace = after.days[1].stops[0].place;
  ok('R14-3: the copied stop\'s `place` is a clone, not the source object',
    srcPlace !== dstPlace, 'source and target stops share ONE PlaceLink object');
  ok('R14-3: ...and its `at` is a clone (KD-47\'s own argument for cloning in step 3)',
    srcPlace.at !== dstPlace.at, 'source and target documents share ONE mutable LatLng');
  // A-14's own step 3 DOES clone — so the two paths disagree.
  const s = cityTrip('s3', [V('Vienna', 0)], { place: {} });
  const pr = cityTrip('p3', [V('Prague', 0, 50.08, 14.44)]);
  const step3 = core.copyStopInto(pr.trip, { trip: s.trip, stopId: s.stopId },
    { kind: 'scheduled', dayId: pr.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('al2'));
  ok('control: A-14\'s own step-3 path DOES clone the coordinate',
    step3.days[0].stops[0].place.at !== s.trip.places[0].at);
}

line('§5.4 Unicode and whitespace folding at the copy boundary');
{
  const cases = [
    ['NFC vs NFD', 'Zürich', 'Zürich', true],
    ['non-breaking space collapses', 'New York', 'New York', true],
    ['newline / tab collapse and trim', '\tWien\n', 'Wien', true],
    ['case fold', 'KÖLN', 'köln', true],
    ['zero-width space does NOT collapse', 'Wi​en', 'Wien', false],
    ['fullwidth V is a different letter', 'Ｖienna', 'Vienna', false],
    ['dotted capital I vs plain I', 'İstanbul', 'Istanbul', false],
    ['eszett vs ss', 'Gießen', 'Giessen', false],
  ];
  for (const [label, a, b, want] of cases) {
    const s = cityTrip(`u${label.length}`, [{ name: a, order: 0, centre: { lat: 48.2, lng: 16.37 } }], { place: {} });
    const t = cityTrip(`v${label.length}`, [{ name: b, order: 0, centre: { lat: 48.2, lng: 16.37 } }]);
    const res = core.copyStopInto(t.trip, { trip: s.trip, stopId: s.stopId },
      { kind: 'scheduled', dayId: t.trip.days[0].id, time: '11:00', order: 0 }, copyCtx(`u${label.length}`));
    const travelled = res.places.length > t.trip.places.length;
    ok(`${label}: the place ${want ? 'travels' : 'does not travel'} (folding says ${normalizeCityName(a) === normalizeCityName(b)})`,
      travelled === want, `travelled=${travelled}`);
  }
}

line('§5.5 double-hop copies, A -> B -> C');
{
  const a = cityTrip('A', [V('Vienna', 0)], { place: {} });
  const b = cityTrip('B', [V('Vienna', 0)]);
  const cTrip = cityTrip('C', [V('Vienna', 0)]);
  const b1 = core.copyStopInto(b.trip, { trip: a.trip, stopId: a.stopId },
    { kind: 'scheduled', dayId: b.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('h1'));
  const bStop = b1.days[0].stops[0].id;
  const c1 = core.copyStopInto(cTrip.trip, { trip: b1, stopId: bStop },
    { kind: 'scheduled', dayId: cTrip.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('h2'));
  ok('step-2 double hop: the place still travels and is filed under C\'s own Vienna',
    c1.places.length === cTrip.trip.places.length + 1 &&
    c1.places[c1.places.length - 1].cityKey === c1.cities[0].key);
  ok('...and C reports no unknown_city_key', !core.validateTrip(c1).some((i) => i.code === 'unknown_city_key'));
  ok('...and the credit points at B, not at A (§2.14: the trip you got it from)',
    core.attribution(c1.days[0].stops.find((s) => core.attribution(s))).sourceTripId === b1.id);

  // The step-3 flavour: A -> (Prague, no match) -> C. The place is gone by hop 2.
  const pr = cityTrip('P3', [V('Prague', 0, 50.08, 14.44)]);
  const p1 = core.copyStopInto(pr.trip, { trip: a.trip, stopId: a.stopId },
    { kind: 'scheduled', dayId: pr.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('h3'));
  const c2 = core.copyStopInto(cTrip.trip, { trip: p1, stopId: p1.days[0].stops[0].id },
    { kind: 'scheduled', dayId: cTrip.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('h4'));
  ok('step-3 double hop: the place is not resurrected at hop 2 — the coordinate survives, the record does not',
    c2.places.length === cTrip.trip.places.length && c2.days[0].stops[0].place.kind === 'inline');
  console.log('  (the named loss A-14 states: place-level note/links/hours/category do not come back)');
}

line('§5.6 KD-47\'s disclosed gap — a PRE-A-14 copy already in the target');
{
  const s = cityTrip('K', [V('Vienna', 0)], { place: {} });
  const t = cityTrip('L', [V('Vienna', 0)]);
  // A row that can only have got there from a copy made before this fix: the SOURCE's key.
  const stale = { ...s.trip.places[0], id: 'old-copy' };
  const withStale = { ...t.trip, places: [...t.trip.places, stale] };
  const before = core.validateTrip(withStale).filter((i) => i.code === 'unknown_city_key').length;
  const after = core.copyStopInto(withStale, { trip: s.trip, stopId: s.stopId },
    { kind: 'scheduled', dayId: withStale.days[0].id, time: '11:00', order: 0 }, copyCtx('k1'));
  ok('KD-47: the stale row is NOT matched and the place is duplicated once',
    after.places.length === withStale.places.length + 1, `${withStale.places.length} -> ${after.places.length}`);
  const afterErr = core.validateTrip(after).filter((i) => i.code === 'unknown_city_key').length;
  ok('KD-47: the pre-existing error count is unchanged by the copy — no NEW error is minted',
    afterErr === before, `${before} -> ${afterErr}`);
  // Re-copying the same stop again reuses the NEW row, so the duplication is bounded at one.
  const twice = core.copyStopInto(after, { trip: s.trip, stopId: s.stopId },
    { kind: 'scheduled', dayId: after.days[1].id, time: '11:00', order: 0 }, copyCtx('k2'));
  ok('KD-47: the duplication is bounded at one row, not one per copy',
    twice.places.length === after.places.length, `${after.places.length} -> ${twice.places.length}`);
  ok('KD-47 is therefore MINOR, as disclosed', afterErr === before && twice.places.length === after.places.length);
}

line('§5.7 a source place whose cityKey the SOURCE cannot resolve');
{
  const t0 = cityTrip('DG', [V('Vienna', 0)], { place: { cityKey: 'city_gone' } });
  const within = core.copyStopInto(t0.trip, { trip: t0.trip, stopId: t0.stopId },
    { kind: 'scheduled', dayId: t0.trip.days[1].id, time: '11:00', order: 0 }, copyCtx('dg'));
  ok('a place filed under a key the source has not got takes step 3, even within one trip',
    within.places.length === t0.trip.places.length && within.days[1].stops[0].place.kind === 'inline');
  ok('...and no NEW unknown_city_key is minted by the copy',
    core.validateTrip(within).filter((i) => i.code === 'unknown_city_key').length ===
    core.validateTrip(t0.trip).filter((i) => i.code === 'unknown_city_key').length);
  // Same class as R14-2: a blank city name is "no name to match on" even when the source IS
  // the target, so a within-trip copy loses the place there too.
  const tb0 = cityTrip('DB', [{ name: '   ', order: 0, centre: { lat: 1, lng: 1 } }], { place: { at: { lat: 1.1, lng: 1.1 } } });
  const tb1 = core.copyStopInto(tb0.trip, { trip: tb0.trip, stopId: tb0.stopId },
    { kind: 'scheduled', dayId: tb0.trip.days[1].id, time: '11:00', order: 0 }, copyCtx('db'));
  ok('R14-2 (same root): a within-trip copy under a blank-named city keeps the place link',
    tb1.days[1].stops[0].place.kind === 'place',
    `became {kind:'${tb1.days[1].stops[0].place.kind}'} — A-14 says within-trip copying is unchanged`);

  // `at: null` on a step-3 place.
  const t1 = cityTrip('DN', [V('Vienna', 0)], { place: { at: null } });
  const pr = cityTrip('DP', [V('Prague', 0, 50.08, 14.44)]);
  const none = core.copyStopInto(pr.trip, { trip: t1.trip, stopId: t1.stopId },
    { kind: 'scheduled', dayId: pr.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('dn'));
  ok('a source place with at: null yields {kind:\'none\'} and no place_ref_dangling',
    none.days[0].stops[0].place.kind === 'none' &&
    !core.validateTrip(none).some((i) => i.code === 'place_ref_dangling'));
}

line('§5.8 the reworked `lisbonWithCopiedPlaceStop` fixture vs the one it replaced');
{
  const { trip: europe } = loadEurope2026();
  const src = europe.days.flatMap((d) => d.stops).find((s) => s.place.kind === 'place');
  const srcPlace = europe.places.find((p) => p.id === src.place.placeId);
  const srcCity = europe.cities.find((c) => c.key === srcPlace.cityKey);
  const build = (extraCity) => {
    const c = { ids: core.sequentialIds('d'), now: '2026-08-25', actorUserId: 'local:self' };
    let t = core.createTrip({ id: 'trip-lisbon', title: 'Lisbon', ownerId: 'local:self',
      startDate: '2026-09-01', endDate: '2026-09-03',
      homeBase: { name: 'Lisbon', at: { lat: 38.7223, lng: -9.1393 } },
      cities: [{ key: 'lisbon', name: 'Lisbon', countryCode: 'PT', centre: { lat: 38.7223, lng: -9.1393 } }]
        .concat(extraCity ? [{ key: 'stub', name: srcCity.name }] : []) }, c);
    t = core.addStop(t, { kind: 'scheduled', dayId: t.days[0].id, time: '10:00', order: 0 },
      { name: 'Jerónimos Monastery', category: 'sight', place: { kind: 'inline', at: { lat: 38.6979, lng: -9.2065 } } }, c);
    const before = new Set(t.places.map((p) => p.id));
    t = core.copyStopInto(t, { trip: europe, stopId: src.id },
      { kind: 'scheduled', dayId: t.days[0].id, time: null, order: 9 },
      { ids: core.sequentialIds('c'), today: '2026-09-01', actorUserId: 'local:self' });
    return { trip: t, copied: t.places.find((p) => !before.has(p.id)) };
  };
  const now = build(true), old = build(false);
  ok('the OLD fixture (Lisbon only) now takes A-14 step 3 — no place travels, so 14 A-6 tests lose their subject',
    old.copied === undefined, 'the pre-A-14 fixture still drags a Place across');
  ok('the NEW fixture keeps the copy on step 2 — a Place does travel',
    now.copied !== undefined);
  const f = core.geoCheck(now.trip).find((x) => x.ref.kind === 'place' && x.ref.id === now.copied.id);
  ok('the copy-borne Place is still MEASURED, not skipped', f && f.nearest !== null);
  ok('...still `unanchored` — A-6\'s exemption is what is being exercised', f && f.confidence === 'unanchored');
  ok('...and still a genuine outlier, well past the 35 km bar', f && f.km > 35, `km=${f && f.km}`);
  console.log(`  new fixture: km=${f.km} nearest=${JSON.stringify(f.nearest)}`);
  ok('...and one Browse-and-copy click still mints no geo_outlier',
    core.detectConflicts(now.trip, { today: FIXTURE_TODAY }).filter((c) => c.ruleId === 'geo_outlier').length === 0);
  // The clause that matters: `every`, not `some`. Point a user-authored stop at the copied place.
  const linked = { ...now.trip, days: now.trip.days.map((d, i) => i !== 0 ? d : { ...d, stops: d.stops.map((s, j) =>
    j !== 0 ? s : { ...s, place: { kind: 'place', placeId: now.copied.id } }) }) };
  const f2 = core.geoCheck(linked).find((x) => x.ref.kind === 'place' && x.ref.id === now.copied.id);
  ok('a user-authored stop pointing at the copied Place ENDS the exemption (`every`, not `some`)',
    f2 && f2.confidence === 'certain', `confidence=${f2 && f2.confidence}`);
  ok('...and that is what mints the blocker the exemption was holding back',
    core.detectConflicts(linked, { today: FIXTURE_TODAY }).some((c) => c.ruleId === 'geo_outlier'));
  const stubOrder = now.trip.cities.find((c) => c.key === 'stub');
  console.log(`  the stub city's centre is ${JSON.stringify(stubOrder.centre)} (createTrip's default)`);
}

line('§5.9 R14-4 (BLOCKER) — rule 4 hands the referenced Place\'s note and links across the trip boundary, unredacted');
{
  // R2-3 (round 2, BLOCKER) named this exact residue: *"Two `Stop.links` hrefs also travel
  // (`Place.note` and `Place.links` copy with the place)."* The status table records R2-3 as
  // "Fixed and verified closed (b5c742b)". Only the STOP-note half was fixed: rule 5 runs
  // `redactText(src.note)`, and rule 4 still copies the Place with `{...original}`.
  const c1 = ctx('L1'), c2 = ctx('L2');
  let src = core.createTrip({ title: 'Mine', startDate: '2026-05-01', endDate: '2026-05-03',
    cities: [V('Vienna', 0)] }, c1);
  src = { ...src, places: [...src.places, { id: 'sp', name: 'Habyt Vienna',
    cityKey: src.cities[0].key, at: { lat: 48.21, lng: 16.4 }, category: 'stay',
    note: 'Front door PIN 0754, conf 5814731574 - ask for jacob@example.com',
    links: [{ label: 'Voucher', href: 'https://vendor.example/booking/GYGG45MLA9Q9' }] }] };
  src = core.addStop(src, { kind: 'scheduled', dayId: src.days[0].id, time: '10:00', order: 0 },
    { name: 'Check in', category: 'stay', place: { kind: 'place', placeId: 'sp' },
      note: 'PIN 0754 conf 5814731574' }, c1);
  const friend = core.createTrip({ title: 'Theirs', ownerId: 'user:friend',
    startDate: '2026-06-01', endDate: '2026-06-03', cities: [V('Vienna', 0)] }, c2);
  const after = core.copyStopInto(friend, { trip: src, stopId: src.days[0].stops[0].id },
    { kind: 'scheduled', dayId: friend.days[0].id, time: '11:00', order: 0 },
    { ids: c2.ids, today: '2026-04-01', actorUserId: 'user:friend' });
  const stop = after.days[0].stops[0];
  const place = after.places[after.places.length - 1];
  console.log(`  stop.note   -> ${JSON.stringify(stop.note)}`);
  console.log(`  place.note  -> ${JSON.stringify(place.note)}`);
  console.log(`  place.links -> ${JSON.stringify(place.links)}`);
  ok('rule 5 redacts the STOP note — the half b5c742b fixed', core.redactionHits(stop.note).length === 0);
  ok('R14-4: rule 4 redacts the copied PLACE note',
    core.redactionHits(place.note ?? '').length === 0,
    `${core.redactionHits(place.note ?? '').map((h) => h.id ?? h).join(',')} survive the copy`);
  ok('R14-4: ...and the copied PLACE links carry no vendor voucher URL',
    !(place.links ?? []).some((l) => core.redactionHits(l.href).length > 0),
    JSON.stringify((place.links ?? []).map((l) => l.href)));
  const doc = JSON.stringify(core.toJSON(after));
  for (const [what, needle] of [['a door PIN', '0754'], ['a confirmation number', '5814731574'],
    ['a voucher URL', 'GYGG45MLA9Q9'], ['a mailbox address', 'jacob@example.com']]) {
    ok(`R14-4: ${what} is absent from the recipient's whole document`, !doc.includes(needle));
  }
  // Exposure today: no shipped write path puts a note on a Place, and the one data source
  // that does (`import/legacyDays.ts`) carries no credential-shaped place note.
  const { trip: ref } = loadEurope2026();
  const hits = ref.places.filter((p) => p.note && core.redactionHits(p.note).length > 0);
  console.log(`  exposure today: ${ref.places.filter((p) => p.note).length}/${ref.places.length}` +
    ` reference places carry a note and ${hits.length} of them are credential-shaped;` +
    ` \`addPlace\` is ${'addPlace' in core ? 'ON' : 'NOT on'} index.ts, so the app cannot write one yet`);
  // ...but `importDoc`/`fromJSON` can, and the copy then carries it.
  const round = core.fromJSON(JSON.parse(JSON.stringify(core.toJSON(src))));
  ok('a place note survives a full toJSON/fromJSON round trip, so import is a live write path',
    round.places.find((p) => p.id === 'sp').note === src.places[0].note);
}

line('§5.10 R14-2 through the real store and the reducer, as a user Browse-and-copies');
{
  const t0 = cityTrip('SU', [V('Vienna', 0, 48.2, 16.37), V('Vienna', 1, 48.3, 16.4)],
    { place: {}, placeCityIdx: 1 });
  const originalKey = t0.trip.places[0].cityKey;
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage, '2026-04-01'), autosave: false });
  await store.adoptTrip(t0.trip);
  store.dispatch({ type: 'copyStopInto', source: { trip: t0.trip, stopId: t0.stopId },
    placement: { kind: 'scheduled', dayId: t0.trip.days[1].id, time: '11:00', order: 0 } });
  await store.flush();
  const stored = core.fromJSON((await storage.load(t0.trip.id)).doc);
  const np = stored.places[stored.places.length - 1];
  ok('R14-2 through the store: one Copy click leaves the place on its own city',
    np.cityKey === originalKey, `re-filed onto ${np.cityKey}, was ${originalKey}`);
  ok('R14-2 through the store: ...and adds no duplicate place row',
    stored.places.length === t0.trip.places.length, `${t0.trip.places.length} -> ${stored.places.length}`);
}

/* ======================================================== §6 cross-cutting ==== */

line('§6 A-11 x A-14 x A-12: copy a ticketed stop across trips, then crash a different rule');
{
  const RULES = detectMod.RULES;
  const saved = RULES.map((r) => r.run);
  const restore = () => RULES.forEach((r, i) => { r.run = saved[i]; });
  try {
    // A source trip with a ticketed, unbooked, priced, place-linked stop 60 days out.
    const day = '2026-03-02';
    const c = ctx('x1');
    let s = core.createTrip({ title: 'S', startDate: day, endDate: day, cities: [V('Vienna', 0)] }, c);
    s = { ...s, places: [...s.places, { id: 'xp', name: 'Prater', cityKey: s.cities[0].key,
      at: { lat: 48.21, lng: 16.4 }, category: 'sight' }] };
    s = core.addStop(s, { kind: 'scheduled', dayId: day, time: '10:00', order: 0 },
      { name: 'Prater', category: 'sight', place: { kind: 'place', placeId: 'xp' },
        cost: { display: '€10', amounts: [{ lo: 10, hi: 10, currency: 'EUR', basis: 'per_person' }] },
        links: [{ label: 'T', href: 'https://e.test/t' }] }, c);
    const tgt0 = cityTrip('X2', [V('Vienna', 0)]);
    let t = core.copyStopInto(tgt0.trip, { trip: s, stopId: s.days[0].stops[0].id },
      { kind: 'scheduled', dayId: tgt0.trip.days[0].id, time: '11:00', order: 0 }, copyCtx('x2'));
    const conf = detectMod.detectUngated(t, { today: '2026-04-01' }).find((x) => x.ruleId === 'unbooked_ticketed');
    ok('the copied ticketed stop mints a horizoned finding in the target', !!conf);
    t = core.resolveConflict(t, { conflictId: conf.id, state: 'dismissed', by: core.LOCAL_OWNER, at: '2026-04-01' });

    // The clock steps backwards across the horizon AND a different rule crashes.
    RULES.find((r) => r.id === 'geo_outlier').run = () => { throw new Error('boom'); };
    const back = core.syncResolutions(t, '2026-03-02');
    ok('clock step + unrelated crash together retire nothing', back === t && back.resolutions[0].retiredAt === null);
    restore();
    const still = core.syncResolutions(t, '2026-03-02');
    ok('and the clock step alone retires nothing either (A-11)', still === t);
    // A genuine fix (book it) still retires, with no crash.
    const booked = core.updateStop(t, t.days[0].stops[0].id, { cost: null });
    const done = core.syncResolutions(booked, '2026-04-01');
    ok('a genuine fix still retires once the crash is gone',
      done.resolutions[0].retiredAt === '2026-04-01', String(done.resolutions[0].retiredAt));
  } finally { restore(); }
}

/* ============================================================ §7 ceilings ==== */

line('§7 the ceilings, re-derived by running');
{
  // Round 22: the pin moves 71 -> 73. Phase 2 I-5 (`897b928`) added `countryOf` and
  // `COUNTRY_INDEX` to §2.10's surface; I-5a added nothing. Re-expressed by QA, never relaxed.
  // I-7a (QA R28-8, BUILD-NOTES KD-65): 73 -> 75, re-derived by running rather than
  // quoted. `SUMMARY_VERSION` joined at I-6 and `travelStats` at I-7, and neither commit
  // updated this line. Strict equality on purpose — never relaxed to `>=`.
  ok('§2.10 export surface is 76', Object.keys(core).length === 76, String(Object.keys(core).length));
  ok('detectUngated / detectUngatedChecked / normalizeCityName are NOT on it',
    !('detectUngated' in core) && !('detectUngatedChecked' in core) && !('normalizeCityName' in core));
  const { trip } = loadEurope2026();
  const at = (t) => {
    const cs = core.detectConflicts(trip, { today: t });
    return [cs.filter((c) => c.severity === 'blocker').length, cs.filter((c) => c.severity === 'warning').length,
      cs.filter((c) => c.severity === 'note').length].join('/');
  };
  const counts = { [FIXTURE_TODAY]: at(FIXTURE_TODAY), '2026-08-14': at('2026-08-14'),
    '2026-08-27': at('2026-08-27'), '2027-01-01': at('2027-01-01'), '2019-01-01': at('2019-01-01') };
  console.log('  blocker/warning/note by clock:', JSON.stringify(counts));
  ok('2/4/11 at FIXTURE_TODAY', counts[FIXTURE_TODAY] === '2/4/11', counts[FIXTURE_TODAY]);
  const iss = core.validateTrip(trip);
  const byCode = {};
  for (const i of iss) byCode[`${i.level}:${i.code}`] = (byCode[`${i.level}:${i.code}`] ?? 0) + 1;
  ok('validateTrip on the reference trip: the known 11 issues, unmoved',
    iss.length === 11 && byCode['warn:cost_basis_mixed'] === 10 && byCode['error:lat_lng_out_of_range'] === 1,
    JSON.stringify(byCode));
  const g = core.geoCheck(trip);
  ok('geoCheck: no record past the limit on the clean fixture',
    g.filter((f) => f.km > f.limitKm && f.confidence === 'certain').length === 0);
  // Goldens + sample, regenerated in place and diffed by git.
  const root = new URL('..', import.meta.url).pathname;
  try {
    execFileSync('node', ['tools/gen-golden.mjs'], { cwd: root, stdio: 'pipe' });
    execFileSync('node', ['tools/gen-sample.mjs'], { cwd: root, stdio: 'pipe' });
    const dirty = execFileSync('git', ['status', '--porcelain', 'fixtures', 'apps'], { cwd: root, encoding: 'utf8' });
    ok('goldens and sample regenerate byte-identically', dirty.trim() === '', dirty.trim());
  } catch (e) { ok('goldens and sample regenerate byte-identically', false, String(e.message).slice(0, 200)); }
  // KD numbering + the disclosure test.
  const notes = readFileSync(new URL('../docs/BUILD-NOTES.md', import.meta.url), 'utf8');
  const kds = [...notes.matchAll(/^### (KD-(\d+))\b/gm)].map((m) => Number(m[2]));
  const contiguous = kds.every((n, i) => n === i + 1);
  // Round 21 (R20-5, A-19 assertion 7): the ceiling moves 49 -> 50 because the A-24 pass minted
  // KD-50. The ceiling is deliberately load-bearing — a pass that mints a KD must run this probe
  // and say so — so it is re-expressed by QA, never relaxed to `>=`.
  // Round 22: 50 -> 53. I-5 minted KD-51; I-5a minted KD-52 and KD-53.
  // I-7a (QA R28-8, BUILD-NOTES KD-67): 53 -> 68, re-derived by counting `### KD-n` headings in
  // BUILD-NOTES rather than quoted. The pin was stale from I-5b onward — I-5b/I-5c/I-6/I-6a/I-7
  // each minted KDs without moving it — and I-7a itself minted KD-66, KD-67 and KD-68. Strict
  // equality on purpose: a pass that mints a KD must run this probe and say so.
  ok(`KD ids are contiguous 1..${kds.length} with no duplicates`, contiguous && kds.length === 68,
    kds.join(','));
  try {
    execFileSync('node', ['--test', 'test/disclosure.test.ts'], { cwd: root, stdio: 'pipe' });
    ok('test/disclosure.test.ts passes', true);
  } catch (e) { ok('test/disclosure.test.ts passes', false, String(e.stdout ?? '').slice(-400)); }
}

console.log(`\n${fails === 0 ? 'ALL OK' : fails + ' FAIL'}`);
