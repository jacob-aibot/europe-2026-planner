/**
 * Round 6 — independent verification of R5-2 (`accepted_by_non_member` exempting a missing
 * actor) and R5-5 (`accept`/`reject` on the public export surface).
 *
 * Written from ARCHITECTURE §2.9 / §2.14 rather than from the builder's test file: the point
 * is to construct the fault myself, over every ref kind the rule claims to cover, with actor
 * values the builder's cases do not contain (a number, an object, an array, `true`), and to
 * re-derive the reference-trip ceiling from the real fixture rather than quoting it.
 *
 * Run: node qa/r6-actor.mjs   (from cairn/)
 * A "FAIL" line means the probe found something.
 */
const core = await import('../packages/core/src/index.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');

let fails = 0;
const ok = (n, c, x = '') => {
  if (!c) fails++;
  console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
};
const line = (s) => console.log('\n== ' + s + ' ==');

const ids = core.sequentialIds('r6');
const base = core.createTrip(
  {
    title: 'R6',
    startDate: '2026-09-01',
    endDate: '2026-09-02',
    homeCurrency: 'EUR',
    cities: [{ key: 'lisbon', name: 'Lisbon', countryCode: 'PT', centre: { lat: 38.72, lng: -9.14 }, order: 0 }],
  },
  { ids, now: '2026-09-01', actorUserId: core.LOCAL_OWNER },
);

/** An ATTRIBUTED, accepted provenance whose actor is whatever the caller says. */
const credited = (actor) => ({
  source: 'friend',
  state: 'accepted',
  confidence: 'asserted',
  addedAt: '2026-09-01',
  acceptedAt: '2026-09-01',
  actorUserId: actor,
  origin: { friendUserId: 'user:marta', sourceTripId: 'trip:marta', sourceStopId: 'stop:m1' },
});

const codes = (t) => core.validateTrip(t).filter((i) => i.code === 'accepted_by_non_member');

const baseIssues = core.validateTrip(base).length;

// The actor values. `null`/`undefined`/`''` are R5-2's own three; the rest are shapes a
// hand-built in-memory Trip can carry that `fromJSON` would never mint.
const ACTORS = [
  ['null', null],
  ['undefined', undefined],
  ["''", ''],
  ['0 (number)', 0],
  ['12345 (number)', 12345],
  ['true (boolean)', true],
  ['{} (object)', {}],
  ['["user:marta"] (array)', ['user:marta']],
  ["'user:marta' (a real non-member)", 'user:marta'],
  ['" " (a space)', ' '],
];

// ---------------------------------------------------------------------------
line('1 — a credited accepted STOP on a day, over ten actor shapes');
for (const [label, actor] of ACTORS) {
  const t = {
    ...base,
    days: base.days.map((d, i) =>
      i === 0
        ? {
            ...d,
            stops: [
              {
                id: 'stop:x',
                placement: { kind: 'scheduled', dayId: d.id, time: null, order: 0 },
                name: 'Copied thing',
                category: 'sight',
                place: { kind: 'none' },
                note: '',
                cost: null,
                arrival: null,
                travelRole: 'transfer',
                bookingId: null,
                flags: [],
                provenance: credited(actor),
                durationMins: null,
              },
            ],
          }
        : d,
    ),
  };
  const hits = codes(t);
  const st = core.displayStatus(t.days[0].stops[0].provenance);
  const attr = core.attribution(t.days[0].stops[0].provenance);
  ok(
    `actorUserId=${label} is flagged exactly once`,
    hits.length === 1,
    `hits=${hits.length} displayStatus=${st} attribution=${attr ? 'non-null' : 'null'}`,
  );
  if (hits.length === 1) {
    const p = hits[0].params;
    const paramsWellTyped = Object.values(p).every((v) => typeof v === 'string' || typeof v === 'number');
    ok(`  ...its params are all string|number (§2.1)`, paramsWellTyped, JSON.stringify(p));
    ok(`  ...level=error, ref=stop:x`, hits[0].level === 'error' && hits[0].ref.id === 'stop:x', `${hits[0].level}/${hits[0].ref.kind}:${hits[0].ref.id}`);
    ok(`  ...the message does not print "null"/"undefined"/"[object"`, !/null|undefined|\[object/.test(hits[0].message), hits[0].message);
    // Fidelity: a PRESENT but wrong actor should be nameable in params. R6 checks whether a
    // non-string wrong actor is reported as "nobody" and its value dropped.
    if (actor !== null && actor !== undefined && actor !== '') {
      const named = String(p.actorUserId) !== '' ;
      ok(`  ...a PRESENT wrong actor is named in params`, named, `params.actorUserId=${JSON.stringify(p.actorUserId)} for actor ${label}`);
    }
  }
}

// ---------------------------------------------------------------------------
line('2 — the same fault on every ref kind the rule claims (§2.9: day, stop, pool stop, booking)');
{
  // DAY
  const tDay = { ...base, days: base.days.map((d, i) => (i === 0 ? { ...d, provenance: credited(null) } : d)) };
  ok('a credited accepted DAY with no actor is flagged', codes(tDay).length === 1, `${codes(tDay).length}`);

  // POOL stop (not on a day)
  const tPool = {
    ...base,
    pool: [
      {
        id: 'stop:p',
        placement: { kind: 'pool', cityKey: 'lisbon' },
        name: 'Pooled copy',
        category: 'sight',
        place: { kind: 'none' },
        note: '',
        cost: null,
        arrival: null,
        travelRole: 'transfer',
        bookingId: null,
        flags: [],
        provenance: credited(undefined),
        durationMins: null,
      },
    ],
  };
  ok('a credited accepted POOL stop with no actor is flagged', codes(tPool).length === 1, `${codes(tPool).length}`);

  // BOOKING
  const tBook = {
    ...base,
    bookings: [
      {
        id: 'booking:b',
        tripId: base.id,
        kind: 'train',
        operator: 'CD',
        reference: null,
        startsAt: { date: '2026-09-01', time: null },
        price: null,
        party: null,
        status: 'active',
        ticket: null,
        provenance: credited(''),
      },
    ],
  };
  const bh = codes(tBook);
  ok('a credited accepted BOOKING with no actor is flagged', bh.length === 1, `${bh.length}`);
  if (bh.length === 1) ok('  ...with ref.kind === "booking"', bh[0].ref.kind === 'booking', bh[0].ref.kind);
}

// ---------------------------------------------------------------------------
line('3 — the exemptions §2.14 actually states must survive');
{
  // source:'user' with actorUserId:null — unattributed, explicitly legal.
  const tUser = {
    ...base,
    days: base.days.map((d, i) =>
      i === 0 ? { ...d, provenance: { ...core.userProvenance('2026-09-01'), actorUserId: null } } : d,
    ),
  };
  ok('source:"user" / actorUserId:null stays OUTSIDE the rule', codes(tUser).length === 0, `${codes(tUser).length}`);

  // The OWNER accepting is legitimate.
  const tOwner = { ...base, days: base.days.map((d, i) => (i === 0 ? { ...d, provenance: credited(base.ownerId) } : d)) };
  ok('the owner accepting is NOT flagged', codes(tOwner).length === 0, `${codes(tOwner).length}`);

  // A candidate (not yet accepted) is outside the rule regardless of actor.
  const tCand = {
    ...base,
    days: base.days.map((d, i) => (i === 0 ? { ...d, provenance: { ...credited(null), state: 'candidate', acceptedAt: null } } : d)),
  };
  ok('an unaccepted candidate with no actor is NOT flagged', codes(tCand).length === 0, `${codes(tCand).length}`);

  // No extra issues introduced on the untouched trip.
  ok('the untouched trip is unchanged', core.validateTrip(base).length === baseIssues, `${core.validateTrip(base).length} vs ${baseIssues}`);
}

// ---------------------------------------------------------------------------
line('4 — the reference-trip ceiling, re-derived from the real fixture');
{
  const { trip } = loadEurope2026();
  const all = core.validateTrip(trip);
  const hits = all.filter((i) => i.code === 'accepted_by_non_member');
  ok('Europe 2026 produces ZERO accepted_by_non_member issues', hits.length === 0, `${hits.length}: ${hits.slice(0, 2).map((h) => h.message).join(' | ')}`);

  // The ceiling is only meaningful if the rule can fire on this document at all.
  let attributed = 0;
  let accepted = 0;
  const every = [];
  for (const d of trip.days) { every.push(d.provenance); for (const s of d.stops) every.push(s.provenance); }
  for (const s of trip.pool) every.push(s.provenance);
  for (const b of trip.bookings) every.push(b.provenance);
  for (const p of every) {
    if (p && core.attribution(p)) attributed++;
    if (p && p.state === 'accepted') accepted++;
  }
  console.log(`         (${every.length} provenance records · ${accepted} accepted · ${attributed} attributed)`);
  ok('the ceiling is not vacuous: injecting ONE fault produces exactly one issue', (() => {
    const faulted = {
      ...trip,
      days: trip.days.map((d, i) => (i === 0 ? { ...d, stops: d.stops.map((s, j) => (j === 0 ? { ...s, provenance: credited(null) } : s)) } : d)),
    };
    return core.validateTrip(faulted).length === all.length + 1;
  })(), `${core.validateTrip({ ...trip }).length} base issues`);

  // The overall counts BUILD-NOTES §4 reports, re-derived.
  const errs = all.filter((i) => i.level === 'error').length;
  const warns = all.filter((i) => i.level === 'warn').length;
  console.log(`         validateTrip(Europe 2026) = ${errs} error, ${warns} warn`);
}

// ---------------------------------------------------------------------------
line('5 — R5-5: accept/reject are gone from the public runtime surface');
{
  ok('core.accept is not a runtime export', typeof core.accept === 'undefined', typeof core.accept);
  ok('core.reject is not a runtime export', typeof core.reject === 'undefined', typeof core.reject);
  ok('the checked wrappers survive', typeof core.acceptCandidate === 'function' && typeof core.rejectCandidate === 'function');
  ok(
    "'accept' is not reachable under any other exported name",
    !Object.keys(core).some((k) => /^(accept|reject)$/.test(k)),
    Object.keys(core).filter((k) => /accept|reject/i.test(k)).join(','),
  );

  // The remaining public paths to an attributed accepted record with no actor.
  const stopInit = {
    name: 'Sneaky',
    category: 'sight',
    place: { kind: 'none' },
    provenance: credited(null),
  };
  let minted = null;
  try {
    minted = core.addStop(base, { kind: 'scheduled', dayId: base.days[0].id, time: null, order: 0 }, stopInit, {
      ids,
      now: '2026-09-01',
      actorUserId: core.LOCAL_OWNER,
    });
  } catch (e) {
    minted = 'threw: ' + e.message;
  }
  if (typeof minted === 'string') {
    ok('addStop(StopInit.provenance) still mints the shape', false, minted);
  } else {
    const hits = codes(minted);
    ok('addStop can still mint the shape — but validateTrip now catches it', hits.length === 1, `${hits.length} issues`);
    const s = minted.days[0].stops.find((x) => x.name === 'Sneaky');
    ok('  ...and it still renders as "own" with no badge (displayStatus is untouched, by design)', core.displayStatus(s.provenance) === 'own', core.displayStatus(s.provenance));
  }

  // acceptCandidate's gate.
  for (const [label, actor] of [['null', null], ['undefined', undefined], ["''", '']]) {
    let threw = false;
    try {
      core.acceptCandidate(base, { kind: 'day', id: base.days[0].id }, actor, '2026-09-01');
    } catch { threw = true; }
    ok(`acceptCandidate refuses actor=${label}`, threw);
  }
  // A non-string actor that requireActor might let through.
  for (const [label, actor] of [['0', 0], ['{}', {}], ['true', true]]) {
    let outcome = 'accepted';
    try {
      const t = core.acceptCandidate(base, { kind: 'day', id: base.days[0].id }, actor, '2026-09-01');
      outcome = 'accepted → actor now ' + JSON.stringify(t.days[0].provenance.actorUserId);
    } catch { outcome = 'threw'; }
    ok(`acceptCandidate with a non-string actor=${label}: ${outcome}`, outcome === 'threw', outcome);
  }
}

console.log('\n' + (fails ? `${fails} FAIL` : 'all ok'));
