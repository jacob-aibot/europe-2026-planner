/**
 * QA round 34 — A-45 (`fromJSON`'s calendar gate), re-derived from scratch.
 * Run: node qa/r34-a45.mjs   (from cairn/)
 *
 * Sections:
 *   A  every one of the five claimed date sites refuses a calendar-invalid date, with a real
 *      TripParseError naming the JSON path
 *   B  leap-year and domain-boundary edges, both directions
 *   C  the date fields the parser reads that do NOT go through the gate
 *   D  A-32 did not move: parseIsoDate/dayNumber stay total, month normalisation unchanged
 *   E  store.importDoc end to end, and the old behaviour reproduced by hand
 *   F  the residue: a document already in storage that now cannot be read
 */
const core = await import('../packages/core/src/index.ts');
const ids = await import('../packages/core/src/model/ids.ts');
const summary = await import('../packages/core/src/derive/summary.ts');
const { createStore } = await import('../packages/client/src/store/store.ts');
const mem = await import('../packages/client/src/ports/memory.ts');

let fails = 0;
const ok = (label, cond, extra = '') => {
  if (!cond) fails++;
  console.log((cond ? '  ok    ' : '  FAIL  ') + label + (extra ? '  -> ' + extra : ''));
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log('  note  ' + s);

const mkPorts = (storage) => ({
  storage: storage ?? mem.memoryStorage(),
  clock: mem.fixedClockPort('2026-08-31'),
  ids: mem.sequentialIdPort('i'),
  file: mem.memoryFile(),
  scheduler: mem.immediateScheduler(),
});

// --- a minimal, hand-built, valid document -------------------------------------------------
const prov = () => ({
  source: 'user', state: 'accepted', confidence: 'confirmed',
  addedAt: '2026-01-01', acceptedAt: '2026-01-01', actorUserId: null,
});
function baseDoc() {
  return {
    schemaVersion: 1,
    id: 't1',
    title: 'probe',
    ownerId: 'local:self',
    startDate: '2026-08-07',
    endDate: '2026-08-08',
    datePrecision: 'exact',
    homeCurrency: 'EUR',
    homeBase: null,
    party: { adults: 1, children: 0 },
    revision: 1,
    cities: [],
    days: [
      { id: '2026-08-07', date: '2026-08-07', primaryCity: 'transit', cities: ['transit'], title: '', subtitle: '', stops: [], provenance: prov() },
      { id: '2026-08-08', date: '2026-08-08', primaryCity: 'transit', cities: ['transit'], title: '', subtitle: '', stops: [], provenance: prov() },
    ],
    pool: [],
    places: [],
    bookings: [
      {
        id: 'b1', tripId: 't1', kind: 'flight', operator: 'AA', reference: null,
        startsAt: { date: '2026-08-07', time: '09:00' },
        endsAt: { date: '2026-08-07', time: '12:00' },
        price: null, party: null, status: 'active', ticket: null, provenance: prov(),
      },
    ],
    resolutions: [],
  };
}
const at = (mut) => { const d = baseDoc(); mut(d); return JSON.stringify(d); };

// sanity: the base document parses
try { core.fromJSON(JSON.stringify(baseDoc())); note('base document parses clean'); }
catch (e) { fails++; console.log('  FAIL  base document does not parse: ' + e.message); }

// -------------------------------------------------------------------------------------------
head('A — the five claimed date sites, each hit individually');
const SITES = [
  ['$.startDate',                 (d, v) => { d.startDate = v; }],
  ['$.endDate',                   (d, v) => { d.endDate = v; }],
  ['$.days[1].date',              (d, v) => { d.days[1].date = v; }],
  ['$.bookings[0].startsAt.date', (d, v) => { d.bookings[0].startsAt.date = v; }],
  ['$.bookings[0].endsAt.date',   (d, v) => { d.bookings[0].endsAt.date = v; }],
];
// shape-valid, calendar-invalid
const BAD = ['2026-02-30', '2026-13-01', '2026-00-15', '2026-01-32', '2026-04-31',
             '2027-02-29', '1900-02-29', '2100-02-29', '0100-02-29', '2026-99-99', '2026-00-00'];
for (const [path, set] of SITES) {
  for (const v of BAD) {
    let got = null, cls = null, msgPath = null;
    try { core.fromJSON(at((d) => set(d, v))); }
    catch (e) { got = e.message; cls = e.constructor.name; msgPath = e.path ?? null; }
    const refused = cls === 'TripParseError';
    const named = typeof got === 'string' && got.includes(path);
    if (!refused || !named) {
      ok(`${path} refuses ${v}`, false, JSON.stringify({ cls, got, msgPath }));
    }
  }
  ok(`${path} refuses all ${BAD.length} calendar-invalid dates with a path-naming TripParseError`, true);
}
// and the shape-invalid ones it already refused
for (const v of ['202-01-01', '10000-01-04', '2026-8-7', '', 'March 2019', 'not-a-date', '2026-08-07 ', ' 2026-08-07', '2026-08-07T00:00:00Z']) {
  let cls = null;
  try { core.fromJSON(at((d) => { d.startDate = v; })); } catch (e) { cls = e.constructor.name; }
  ok(`$.startDate still refuses shape-invalid ${JSON.stringify(v)}`, cls === 'TripParseError', String(cls));
}
// non-string
for (const v of [20260807, null, ['2026-08-07'], { toString: () => '2026-08-07' }]) {
  let cls = null;
  try { core.fromJSON(at((d) => { d.startDate = v; })); } catch (e) { cls = e.constructor.name; }
  ok(`$.startDate refuses non-string ${JSON.stringify(v)}`, cls === 'TripParseError', String(cls));
}

// -------------------------------------------------------------------------------------------
head('B — leap-year and domain-boundary edges, both directions');
const ACCEPT = ['2000-02-29', '2024-02-29', '0400-02-29', '0000-02-29', '2400-02-29',
                '0000-01-01', '9999-12-31', '0001-01-01', '0099-12-31', '0100-01-01', '0999-12-31'];
for (const v of ACCEPT) {
  // put it in both range ends so the range stays sane, and in a day
  let err = null;
  try {
    const doc = baseDoc();
    doc.startDate = v; doc.endDate = v;
    doc.days = [{ ...doc.days[0], id: v, date: v }];
    doc.bookings[0].startsAt.date = v; doc.bookings[0].endsAt.date = v;
    core.fromJSON(JSON.stringify(doc));
  } catch (e) { err = e.message; }
  ok(`accepts real date ${v} at every site`, err === null, String(err));
}
const REJECT_EDGE = ['1900-02-29', '2100-02-29', '0100-02-29', '0200-02-29', '0300-02-29',
                     '2023-02-29', '2026-02-29', '0000-02-30', '9999-02-29'];
for (const v of REJECT_EDGE) {
  let cls = null;
  try { core.fromJSON(at((d) => { d.startDate = v; })); } catch (e) { cls = e.constructor.name; }
  ok(`refuses non-leap ${v}`, cls === 'TripParseError', String(cls));
}
// isIsoDate itself, differential against a naive independent oracle
{
  const naive = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    if (mo < 1 || mo > 12 || d < 1) return false;
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
    return d <= dim;
  };
  let mismatches = 0, checked = 0;
  for (let y = 0; y <= 9999; y += 7) {
    for (let mo = 0; mo <= 13; mo++) {
      for (const d of [0, 1, 28, 29, 30, 31, 32]) {
        const s = `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        checked++;
        if (ids.isIsoDate(s) !== naive(s)) { mismatches++; if (mismatches < 4) note('mismatch ' + s); }
      }
    }
  }
  ok(`isIsoDate agrees with an independent calendar oracle over ${checked} sampled dates`, mismatches === 0, String(mismatches));
}
// unicode digit / regex escape probes — \d must not admit non-ASCII digits
for (const v of ['٢٠٢٦-٠٨-٠٧', '2026-08-07\n', '\n2026-08-07', '2026-08-0７']) {
  let cls = null;
  try { core.fromJSON(at((d) => { d.startDate = v; })); } catch (e) { cls = e.constructor.name; }
  ok(`refuses ${JSON.stringify(v)}`, cls === 'TripParseError', String(cls));
}

// -------------------------------------------------------------------------------------------
head('C — the date fields the parser reads that do NOT go through the gate');
// A-45: "Every date field the parser reads goes through it — one predicate, every site."
// BUILD-NOTES: "every date field the parser reads inherits it".
const UNGATED = [
  ['$.days[0].provenance.addedAt',     (d, v) => { d.days[0].provenance.addedAt = v; }],
  ['$.days[0].provenance.acceptedAt',  (d, v) => { d.days[0].provenance.acceptedAt = v; }],
  ['$.bookings[0].issuedAt',           (d, v) => { d.bookings[0].issuedAt = v; }],
  ['$.bookings[0].ticket.verifiedAt',  (d, v) => { d.bookings[0].ticket = { kind: 'url', href: 'https://x/', label: 'T', verifiedAt: v, verifiedBy: 'user' }; }],
  ['$.resolutions[0].at',              (d, v) => { d.resolutions = [{ conflictId: 'c1', state: 'dismissed', by: 'local:self', at: v, retiredAt: null }]; }],
  ['$.resolutions[0].retiredAt',       (d, v) => { d.resolutions = [{ conflictId: 'c1', state: 'dismissed', by: 'local:self', at: '2026-01-01', retiredAt: v }]; }],
  ['$.days[0].id (MUST equal the date, §2.2)', (d, v) => { d.days[0].id = v; }],
];
for (const [path, set] of UNGATED) {
  let cls = null, msg = null;
  try { core.fromJSON(at((d) => set(d, 'not-a-date'))); } catch (e) { cls = e.constructor.name; msg = e.message; }
  ok(`${path} is GATED (expected by A-45's sentence)`, cls === 'TripParseError', `accepted "not-a-date"; ${cls ?? 'no throw'}`);
}

// -------------------------------------------------------------------------------------------
head('D — A-32 did not move');
ok('parseIsoDate is still shape-only: 2026-02-30 parses', (() => {
  try { return JSON.stringify(summary.parseIsoDate('2026-02-30')) === JSON.stringify({ y: 2026, m: 2, d: 30 }); }
  catch { return false; }
})(), '');
ok('dayNumber("2026-02-30") === dayNumber("2026-03-02")  (A-32 roll-over)',
   summary.dayNumber('2026-02-30') === summary.dayNumber('2026-03-02'));
ok('dayNumber("2026-13-45") === dayNumber("2027-02-14")  (A-32 roll-over)',
   summary.dayNumber('2026-13-45') === summary.dayNumber('2027-02-14'));
ok('dayNumber stays total on a calendar-invalid date (no throw)', (() => {
  try { summary.dayNumber('9999-13-45'); return true; } catch { return false; }
})());
ok('fromDayNumber still renders out-of-domain honestly', summary.fromDayNumber(summary.dayNumber('9999-13-45')) === '10000-02-14',
   summary.fromDayNumber(summary.dayNumber('9999-13-45')));
ok('weekdayOf("0001-01-01") === "Mon"', summary.weekdayOf('0001-01-01') === 'Mon', summary.weekdayOf('0001-01-01'));
{
  // exhaustive-ish round trip over the domain endpoints and the two fault-band edges
  let bad = 0;
  for (const d of ['0000-01-01', '0099-12-31', '0100-01-01', '0999-12-31', '1000-01-01', '9999-12-31']) {
    if (summary.fromDayNumber(summary.dayNumber(d)) !== d) { bad++; note('round-trip fail ' + d); }
  }
  ok('dayNumber/fromDayNumber round-trip at the six boundary dates', bad === 0);
}
// validateTrip's invalid_calendar_date still exists for a Trip built directly
{
  const trip = core.createTrip({ title: 'x', startDate: '2026-08-07', endDate: '2026-08-08', cities: [] },
    { ids: core.sequentialIds('v'), today: '2026-08-31' });
  const mangled = { ...trip, days: trip.days.map((d, i) => (i === 0 ? { ...d, date: '2026-02-30' } : d)) };
  const issues = core.validateTrip(mangled);
  ok('validateTrip still reports invalid_calendar_date on a hand-built Trip',
     issues.some((i) => i.code === 'invalid_calendar_date'), JSON.stringify(issues.map((i) => i.code)));
}

// -------------------------------------------------------------------------------------------
head('E — store.importDoc end to end, and the OLD behaviour reproduced');
{
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage), autosave: false });
  const good = JSON.stringify(baseDoc());
  await store.importDoc(good);
  await store.flush();
  const before = (await storage.listTrips()).length;
  note(`library after a good import: ${before}`);

  for (const [label, text] of [
    ['startDate 2026-13-01', at((d) => { d.startDate = '2026-13-01'; d.endDate = '2026-13-02'; d.id = 'x1'; })],
    ['days[1].date 2026-02-30', at((d) => { d.days[1].date = '2026-02-30'; d.id = 'x2'; })],
    ['bookings[0].endsAt.date 2027-02-29', at((d) => { d.bookings[0].endsAt.date = '2027-02-29'; d.id = 'x3'; })],
  ]) {
    let cls = null, msg = null;
    try { await store.importDoc(text); } catch (e) { cls = e.constructor.name; msg = e.message; }
    ok(`importDoc refuses ${label}`, cls === 'TripParseError', `${cls}: ${msg}`);
    if (cls === 'TripParseError') note(`  message: ${msg}`);
  }
  const after = (await storage.listTrips()).length;
  ok('storage is unchanged after the three refusals', after === before, `${before} -> ${after}`);
  ok('the open trip is untouched', store.getState().doc?.id === 't1', String(store.getState().doc?.id));
}
// the old behaviour, by hand: a shape-only regex accepts every one of them
{
  const shapeOnly = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const slips = BAD.filter(shapeOnly);
  ok(`the pre-A-45 shape-only regex would have accepted ${slips.length}/${BAD.length} of section A's dates`,
     slips.length === BAD.length, JSON.stringify(slips));
}

// -------------------------------------------------------------------------------------------
head('F — the residue: a stored document that can no longer be read');
{
  const storage = mem.memoryStorage();
  const store = createStore({ ports: mkPorts(storage), autosave: false });
  // Plant a document that a PRE-A-45 build would have written happily.
  const legacy = at((d) => { d.id = 'legacy'; d.startDate = '2026-02-30'; d.endDate = '2026-03-05'; });
  await storage.saveIfVersion('legacy', null, legacy, {
    id: 'legacy', title: 'legacy', startDate: '2026-02-30', endDate: '2026-03-05',
    datePrecision: 'exact', cityCount: 0, dayCount: 5, stopCount: 0, poolCount: 0,
    revision: 1, countryCodes: [], cities: [],
    attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
    summaryVersion: core.SUMMARY_VERSION,
  });
  const store2 = createStore({ ports: mkPorts(storage), autosave: false });
  await store2.hydrate?.();
  note('library rows visible: ' + JSON.stringify((await storage.listTrips()).map((r) => r.id)));
  let openErr = null;
  try { await store2.openTrip('legacy'); } catch (e) { openErr = `${e.constructor.name}: ${e.message}`; }
  ok('openTrip on such a document refuses rather than crashing silently', openErr !== null, String(openErr));
  note('open error: ' + openErr);
  note('store methods: ' + Object.keys(store2).filter((k) => typeof store2[k] === 'function').join(', '));
  ok('there is NO store method that exports a trip without opening it first',
     typeof store2.exportTrip === 'function',
     'only exportActive() exists, and it needs openTrip(), which now throws — the trip is delete-only');
  // Does the library even SAY the row is unreadable? summaryScan.unreadable is populated by
  // the rescan, and the rescan only visits rows below SUMMARY_VERSION.
  await store2.refreshLibrary();
  const sel = await import('../packages/client/src/selectors/index.ts');
  const scan = sel.summaryScan(store2.getState());
  note('summaryScan: ' + JSON.stringify({ phase: scan.phase, unreadable: scan.unreadable.map((u) => u.id), outdated: scan.outdated }));
  ok('the library marks the row unreadable without a version-triggered rescan',
     scan.unreadable.some((u) => u.id === 'legacy'),
     'row is at current SUMMARY_VERSION so no rescan runs; it looks like a healthy row until you click it');
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}`);
process.exit(fails === 0 ? 0 : 1);
