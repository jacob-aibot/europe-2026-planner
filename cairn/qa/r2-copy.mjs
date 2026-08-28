/**
 * Round 2, attack 1 — copyStopInto and provenance.
 *
 * Every path I can find to make an imported stop read as the user's own plan.
 * Run: node qa/r2-copy.mjs   (from cairn/)
 */
const core = await import('../packages/core/src/index.ts');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
// §2.10 revision 5 takes this symbol off the index; qa may import the module path directly.
const prov = await import('../packages/core/src/model/provenance.ts');

const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');

const { trip: marta } = loadEurope2026();
const martaTrip = { ...marta, id: 'trip:marta', ownerId: 'user:marta' };

const ids = core.sequentialIds('mine');
const mine = core.createTrip(
  {
    title: 'My trip',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    homeCurrency: 'EUR',
    cities: [{ key: 'lisbon', name: 'Lisbon', countryCode: 'PT', centre: { lat: 38.72, lng: -9.14 }, order: 0 }],
  },
  { ids, now: '2026-08-25', actorUserId: 'local:self' },
);
const day0 = mine.days[0].id;
const ctx = { ids, today: '2026-08-25', actorUserId: 'local:self' };
const srcStop = martaTrip.days.find((d) => d.stops.length).stops[0];

const find = (t, id) => t.days.flatMap((d) => d.stops).concat(t.pool).find((s) => s.id === id);
const newestStop = (t) => t.days.flatMap((d) => d.stops).concat(t.pool).slice(-1)[0];
const report = (t, id, label) => {
  const s = find(t, id);
  if (!s) return console.log(`  ${label}: STOP GONE`);
  const st = core.displayStatus(s);
  const at = core.attribution(s);
  console.log(`  ${label}: displayStatus=${st} attribution=${at ? at.friendUserId + '/' + at.sourceTripId : 'NULL'}`);
  return { st, at, s };
};

line('baseline: copy one of Marta\'s stops');
let t = core.copyStopInto(mine, { trip: martaTrip, stopId: srcStop.id }, { kind: 'scheduled', dayId: day0, time: '09:00', order: 0 }, ctx);
const copied = newestStop(t);
const base = report(t, copied.id, 'after copy');
ok('badged imported immediately', base.st === 'imported');
ok('attribution names marta', base.at && base.at.friendUserId === 'user:marta');
ok('bookingId dropped', copied.bookingId === null);
ok('no ticket travelled', !copied.ticket, JSON.stringify(copied.ticket ?? null));
console.log('  copied links:', JSON.stringify(copied.links ?? null));
console.log('  copied note:', JSON.stringify(copied.note.slice(0, 120)));

line('A. every updateStop key, one at a time');
const patches = {
  name: { name: 'my own idea' },
  note: { note: 'mine' },
  category: { category: 'sight' },
  cost: { cost: null },
  flags: { flags: [] },
  arrival: { arrival: null },
  travelRole: { travelRole: 'journey' },
  durationMins: { durationMins: 30 },
  bookingId: { bookingId: null },
  time: { time: '10:00' },
  place: { place: { kind: 'none' } },
  links: { links: [] },
  ticket: { ticket: null },
  'provenance (forbidden)': { provenance: prov.userProvenance('2026-08-25', 'local:self') },
  'id (forbidden)': { id: 'stop:hijack' },
  'placement (forbidden)': { placement: { kind: 'pool', cityKey: 'lisbon' } },
};
for (const [label, patch] of Object.entries(patches)) {
  let after;
  try {
    after = core.updateStop(t, copied.id, patch);
  } catch (e) {
    console.log(`  ${label}: THREW ${e.message.slice(0, 60)}`);
    continue;
  }
  const s = find(after, copied.id);
  const st = s ? core.displayStatus(s) : 'GONE';
  const at = s ? core.attribution(s) : null;
  ok(`${label} keeps imported+credit`, st === 'imported' && !!at, `status=${st} credit=${at ? 'yes' : 'NULL'}`);
}

line('B. copy then accept (acceptCandidate), several actors');
// R2-11's ruling, ARCHITECTURE revision 4 §2.14: `displayStatus` is a pure function of one
// `Provenance`, cannot see the trip, and does NOT learn to. The invariant is enforced at the
// two places documents come from — the call throws on a missing actor, and a non-member actor
// is `validateTrip`'s `accepted_by_non_member` error on the document.
for (const actor of ['local:self', 'user:someone-else']) {
  const after = core.acceptCandidate(t, { kind: 'stop', id: copied.id }, actor, '2026-08-26');
  const s = find(after, copied.id);
  const iss = core.validateTrip(after).filter((i) => i.ref.id === copied.id);
  console.log(
    `  actor=${JSON.stringify(actor)} -> status=${core.displayStatus(s)} credit=${core.attribution(s) ? 'kept' : 'LOST'}` +
      ` acceptedAt=${s.provenance.acceptedAt} issues=[${iss.map((i) => i.code).join(',')}]`,
  );
}
for (const actor of [null, undefined, '']) {
  let threw = null;
  try { core.acceptCandidate(t, { kind: 'stop', id: copied.id }, actor, '2026-08-26'); }
  catch (e) { threw = e; }
  ok(`acceptCandidate refuses actor=${JSON.stringify(actor)}`, threw !== null && /actor/i.test(threw.message),
     'an acceptance with no accepter is unfalsifiable forever after — §2.14');
}
console.log('  §2.14 invariant: a credited record may read "own" only when accepted AND acceptedAt AND actorUserId is a member');
const acceptedByStranger = core.acceptCandidate(t, { kind: 'stop', id: copied.id }, 'user:someone-else', '2026-08-26');
const sB = find(acceptedByStranger, copied.id);
const strangerIssues = core.validateTrip(acceptedByStranger).filter((i) => i.code === 'accepted_by_non_member');
console.log(`  accepted by a stranger -> displayStatus=${core.displayStatus(sB)} (a badge function cannot see the trip)`);
ok(
  'accept by a non-member is an error ON THE DOCUMENT',
  strangerIssues.length === 1 && strangerIssues[0].level === 'error' && strangerIssues[0].ref.id === copied.id,
  `validateTrip reported [${strangerIssues.map((i) => i.code).join(',')}] for actor=${sB.provenance.actorUserId} owner=${acceptedByStranger.ownerId}`,
);
ok('and the credit is still there', !!core.attribution(sB));

line('C. JSON export/import round trip of a copied stop');
const json = core.toJSON(t);
const back = core.fromJSON(json);
const rt = report(back, copied.id, 'after toJSON->fromJSON');
ok('round trip keeps imported+credit', rt && rt.st === 'imported' && !!rt.at);
ok('byte-identical re-serialisation', core.toJSON(back) === json);
const acceptedJson = core.toJSON(core.acceptCandidate(t, { kind: 'stop', id: copied.id }, 'local:self', '2026-08-26'));
const backAcc = core.fromJSON(acceptedJson);
const ra = report(backAcc, copied.id, 'accepted, after round trip');
ok('credit survives acceptance through JSON', !!ra.at);

line('D. copy the same stop twice');
const t2 = core.copyStopInto(t, { trip: martaTrip, stopId: srcStop.id }, { kind: 'scheduled', dayId: day0, time: '09:00', order: 0 }, ctx);
const secondIds = t2.days.flatMap((d) => d.stops).map((s) => s.id);
ok('two distinct stop ids', new Set(secondIds).size === secondIds.length, secondIds.join(','));
ok('place is reused, not duplicated', t2.places.length === t.places.length, `places ${t.places.length} -> ${t2.places.length}`);
console.log('  validate:', core.validateTrip(t2).map((i) => i.code).join(',') || '(clean)');

line('E. copy a stop that was itself copied (chain or flatten?)');
const jacobsTrip = { ...t, id: 'trip:jacob', ownerId: 'user:jacob' };
const sam = core.createTrip(
  { title: 'Sam', startDate: '2026-09-01', endDate: '2026-09-02', homeCurrency: 'EUR', cities: [] },
  { ids, now: '2026-08-25', actorUserId: 'user:sam' },
);
const samT = core.copyStopInto({ ...sam, ownerId: 'user:sam' }, { trip: jacobsTrip, stopId: copied.id }, { kind: 'scheduled', dayId: sam.days[0].id, time: null, order: 0 }, ctx);
const samStop = newestStop(samT);
console.log('  sam credit:', JSON.stringify(core.attribution(samStop)));
console.log('  sam origin:', JSON.stringify(samStop.provenance.origin));
ok('credit names the intermediary (documented flatten)', core.attribution(samStop).friendUserId === 'user:jacob');
ok('original author (marta) is not recoverable', !JSON.stringify(samStop.provenance).includes('marta'));

line('F. copy into the POOL');
const tp = core.copyStopInto(mine, { trip: martaTrip, stopId: srcStop.id }, { kind: 'pool', cityKey: 'lisbon' }, ctx);
const pooled = tp.pool.slice(-1)[0];
console.log(`  pooled: status=${core.displayStatus(pooled)} credit=${JSON.stringify(core.attribution(pooled))}`);
const back2 = core.scheduleFromPool(tp, pooled.id, { dayId: day0 });
report(back2, pooled.id, 'pool -> schedule');

line('G. copy into a day that already has a conflict + geo/validate effects');
const gj = core.validateTrip(t).map((i) => `${i.level}:${i.code}`);
console.log('  validate after copy:', gj.join(', ') || '(clean)');
console.log('  geoCheck findings:', core.geoCheck(t).map((f) => `${f.ref.id}:${f.km}km:${f.confidence}`).join(', ') || '(none)');
const conflicts = core.detectConflicts(t, { today: '2026-08-25' });
console.log('  conflicts after copy:', conflicts.map((c) => `${c.severity}:${c.ruleId}`).join(', ') || '(none)');

line('H. does a copy carry credentials? (tickets, links, notes)');
const withTicket = martaTrip.days.flatMap((d) => d.stops).filter((s) => s.ticket);
console.log(`  source stops carrying a Ticket: ${withTicket.length}`);
for (const s of withTicket) {
  const tt = core.copyStopInto(mine, { trip: martaTrip, stopId: s.id }, { kind: 'scheduled', dayId: day0, time: null, order: 0 }, ctx);
  const c = newestStop(tt);
  const blob = JSON.stringify({ ticket: c.ticket ?? null, links: c.links ?? null, note: c.note });
  const leak = /https?:\/\//.test(blob) || /\b[A-Z0-9]{6,}\b/.test(blob) || /PIN\s*\d/i.test(blob);
  ok(`"${s.name.slice(0, 34)}" copies no credential`, !leak, leak ? blob.slice(0, 220) : '');
}
const linky = martaTrip.days.flatMap((d) => d.stops).filter((s) => s.links && s.links.length);
console.log(`  source stops carrying links: ${linky.length}`);
let linkLeaks = 0;
for (const s of linky) {
  const tt = core.copyStopInto(mine, { trip: martaTrip, stopId: s.id }, { kind: 'scheduled', dayId: day0, time: null, order: 0 }, ctx);
  const c = newestStop(tt);
  for (const l of c.links ?? []) if (/order|ticket|account|[a-z0-9]{8,}$/i.test(l.href)) { linkLeaks++; console.log('    carried:', s.name, '->', l.href); }
}
console.log(`  links carrying an order/ticket-shaped URL across the copy: ${linkLeaks}`);
const pinny = martaTrip.days.flatMap((d) => d.stops).filter((s) => /PIN\s*\d|\b\d{6,}\b/.test(s.note));
console.log(`  source stops whose NOTE contains a PIN/long digit run: ${pinny.length}`);
for (const s of pinny.slice(0, 5)) console.log('    ', s.name, '::', s.note.match(/.{0,40}(PIN\s*\d+|\b\d{6,}\b).{0,20}/i)?.[0]);
