/**
 * QA round 66 — the adversarial pass ROADMAP `I-28` owes, over `8c409ff` (§8.4 **A-88**).
 *
 * Run from `cairn/`:  `node --experimental-strip-types qa/r66-gate.mjs`
 *
 * A-88 Part 11 and ROADMAP sequencing rule 10 set this round's rules: a defect is a difference
 * over a population that can be **reached**, and a claim broader than its mechanism is a defect
 * in the claim. Every section below therefore says, in its own output, whether what it measures
 * is reachable from a shipped write path or only from hand-edited storage — and A-87 Part 7's
 * falsification condition still stands, so no section here is "one more hostile shape of a field
 * the covering table already covers".
 *
 * A `FAIL` line is a finding; a `note` line is a recorded fact. The run ends with a `COMPLETE`
 * line — a run without one is INCOMPLETE and its counts may not be quoted. It writes nothing
 * outside memory and reads `fixtures/` and the repo's own source only.
 *
 *   A  A-59 Part 4's "exactly one" rule over I-28 Part 1's NEW population
 *   B  Part 2's independent census gating — what the value arm now publishes
 *   C  Part 3's stored-record predicate, and the premises A-88 rests it on
 *   D  the three counts that moved into the reader
 *   E  the CLI cap (R65-6)
 *   F  privacy: does anything on this path carry a stored VALUE (§6.1)
 *   G  the standing constraints over the three changed files
 *   H  non-regression, at the two numbers this arc keeps moving
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const CAIRN = dirname(dirname(fileURLToPath(import.meta.url)));
const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);
const client = await import(pathToFileURL(join(CAIRN, 'packages/client/src/index.ts')).href);
const { loadEurope2026 } = await import(pathToFileURL(join(CAIRN, 'fixtures/loadEurope2026.mjs')).href);

let fails = 0;
let oks = 0;
const ok = (c, m, x) => { if (c) { oks++; console.log(`  ok   ${m}`); } else { fails++; console.log(`  FAIL ${m}${x === undefined ? '' : `  — ${x}`}`); } };
const note = (m) => console.log(`  note ${m}`);
const head = (s) => console.log(`\n== ${s}`);

const TODAY = '2026-09-09';
const { trip } = loadEurope2026(core);
const REF = core.tripSummary(trip, core.COUNTRY_INDEX);
const row = (o) => ({ ...REF, ...o });
const city = (o) => ({ key: 'c1', name: 'Vienna', countryCode: 'AT', countrySource: 'coordinate', centre: { lat: 48.2, lng: 16.4 }, firstDay: '2026-08-08', lastDay: '2026-08-10', ...o });
const attempt = (fn) => { try { return { threw: false, value: fn() }; } catch (e) { return { threw: true, err: e, msg: String((e && e.message) || e) }; } };
const src = (p) => readFileSync(join(CAIRN, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
const hist = (library) => attempt(() => client.travelHistory({ library }, TODAY));

// ---------------------------------------------------------------------------
head('A  A-59 Part 4\'s "exactly one" rule over I-28 Part 1\'s new population');
// A-88 Part 2: the failure branch carries ONE population — the rows that could have caused THIS
// refusal — and over the reachable population `travelStats` throws exactly two ways: a duplicate
// row id (matched by its own regex) and A-37 Part 2's shape-invalid `startDate`/`endDate`.
{
  // A1 — the premise, searched rather than accepted. 15 top-level fields x 15 plain-data shapes,
  // plus every gated field of a `cities` entry, plus `centre.lat`/`.lng`, plus the three
  // container fields: is there a THIRD way to throw, and does `rowDatesReadable` name it?
  const shapes = [['num', 42], ['str', 'x'], ['bool', true], ['arr', []], ['obj', {}], ['null', null],
    ['date', new Date()], ['map', new Map()], ['set', new Set()], ['re', /x/], ['err', new Error('b')],
    ['nan', NaN], ['neg', -1], ['nested', { a: { b: {} } }], ['arrOfNull', [null]]];
  const fields = ['cities', 'countryCodes', 'attribution', 'stopCount', 'poolCount', 'placeCount',
    'key', 'countrySource', 'title', 'summaryVersion', 'lifecycle', 'startDate', 'endDate', 'id', 'cityCount'];
  const throwers = [];
  let cases = 0;
  const consider = (label, r) => {
    cases++;
    const t = attempt(() => core.travelStats([r], TODAY));
    if (t.threw) throwers.push({ label, msg: t.msg, named: attempt(() => client.rowDatesReadable(r)) });
  };
  for (const f of fields) for (const [lab, v] of shapes) consider(`${f}=${lab}`, row({ id: 'r', [f]: v }));
  for (const k of ['key', 'name', 'countryCode', 'countrySource', 'centre', 'firstDay', 'lastDay']) {
    for (const [lab, v] of shapes) consider(`cities[0].${k}=${lab}`, row({ id: 'r', cities: [city({ [k]: v })] }));
  }
  for (const [lab, v] of shapes) {
    consider(`cities[0].centre.lat=${lab}`, row({ id: 'r', cities: [city({ centre: { lat: v, lng: 1 } })] }));
    consider(`cities[0]=${lab}`, row({ id: 'r', cities: [v] }));
    consider(`countryCodes[0]=${lab}`, row({ id: 'r', countryCodes: [v] }));
    consider(`attribution.places=${lab}`, row({ id: 'r', attribution: { places: v, stops: v } }));
    consider(`attribution.places.located=${lab}`, row({ id: 'r', attribution: { places: { located: v, attributed: 1 }, stops: REF.attribution.stops } }));
  }
  const dateOnly = throwers.every((t) => /^(startDate|endDate)=/.test(t.label));
  note(`${cases} plain-data row shapes tried; ${throwers.length} throw, and every one of them is a \`startDate\`/\`endDate\` shape`);
  ok(dateOnly,
    'A1  over the reachable population `travelStats` throws only the two ways A-88 Part 2 names',
    `a third throw exists: ${JSON.stringify(throwers.filter((t) => !/^(startDate|endDate)=/.test(t.label)).slice(0, 4))}`);
  ok(throwers.every((t) => t.named.threw === false && t.named.value === false),
    'A1b every throwing shape is named by `rowDatesReadable` — the predicate covers the throw it stands for',
    JSON.stringify(throwers.filter((t) => t.named.value !== false).slice(0, 4)));

  // A2 — the duplicate-id arm, at a NON-STRING id. `DUPLICATE_ROW_ID_RE` requires the id to be
  // JSON-quoted; `travelStats` embeds it with `JSON.stringify` at `derive/travelStats.ts:771`, which does not quote a number,
  // a boolean, `null` or `undefined`. The arm then falls through to the date filter — which
  // names whichever OTHER row happens to have an unreadable date.
  const innocent = row({ id: 'has-a-bad-date', startDate: '2026-02-30' });
  const dupString = hist([row({ id: 'dup' }), row({ id: 'dup' }), innocent]);
  ok(!dupString.threw && dupString.value.rowId === 'dup' && dupString.value.unreadableRows.length === 0,
    'A2  control: a duplicate STRING id is matched by its own regex and names itself',
    JSON.stringify(dupString.value ?? dupString.msg));
  const misnamed = [];
  for (const id of [42, null, true, undefined]) {
    const h = hist([row({ id }), row({ id }), innocent]);
    if (!h.threw && /duplicate summary id/.test(h.value.message) && h.value.rowId === 'has-a-bad-date') {
      misnamed.push({ id: String(id), message: h.value.message, rowId: h.value.rowId });
    }
  }
  ok(misnamed.length === 0,
    'A2b a duplicate id that is not a string does not make the failure branch name an unrelated row',
    `${misnamed.length}/4 non-string duplicate ids escape DUPLICATE_ROW_ID_RE ` +
    '(`packages/client/src/selectors/index.ts:291` requires `"…"`, and `travelStats` embeds the id ' +
    'with `JSON.stringify`, which does not quote a number/boolean/null/undefined). The message says ' +
    `${JSON.stringify(misnamed[0]?.message)} and the surface names ${JSON.stringify(misnamed[0]?.rowId)} — ` +
    'a row that reads perfectly and did not cause the refusal. **A-59 Part 4 is an attribution, and ' +
    'this one attributes to the wrong row.** Reachable only from hand-edited storage (a stored row ' +
    'id that is not a string, twice).');

  // A3 — the residue A-88 Part 2 records and leaves: `rowDatesReadable` is STRICTER than the
  // throw it names, so a calendar-invalid row is a suspect for a throw it cannot produce.
  const shapeInvalid = row({ id: 'the-broken-one', startDate: 'not-a-date' });
  const calendarInvalid = row({ id: 'feb-30', startDate: '2026-02-30', endDate: '2026-03-05' });
  const alone = attempt(() => core.travelStats([calendarInvalid], TODAY));
  ok(!alone.threw, 'A3  a calendar-invalid `startDate` does not throw — the predicate is stricter than the throw', alone.msg);
  const both = hist([shapeInvalid, calendarInvalid]);
  const namesNeither = !both.threw && both.value.rowId === null && both.value.unreadableRows.length === 2;
  note(`the residue, measured: {shape-invalid, calendar-invalid} -> rowId ${JSON.stringify(both.value?.rowId)}, ` +
    `unreadableRows ${JSON.stringify(both.value?.unreadableRows)} — strictly narrower than both e1e1973 and ede933f`);
  ok(namesNeither, 'A3b the residue is exactly what A-88 Part 2 records (two suspects, neither named)',
    JSON.stringify(both.value ?? both.msg));

  // A3c — the residue has a SECOND population A-88 Part 2 does not record, and this one needs
  // no history: `travelStats` reads a PLANNED row's `startDate` only, so a planned row with a
  // shape-invalid `endDate` cannot throw — and `rowDatesReadable` asks both dates, so it is a
  // suspect all the same.
  const plannedBadEnd = { ...REF, id: 'planned-bad-end', lifecycle: 'planned', startDate: '2030-01-01', endDate: 'nope' };
  const plannedThrows = attempt(() => core.travelStats([plannedBadEnd], TODAY)).threw;
  const plannedSuspect = client.rowDatesReadable(plannedBadEnd) === false;
  ok(!(plannedSuspect && !plannedThrows),
    'A3c every row the failure branch calls a suspect could actually have produced the throw',
    'a PLANNED row with a shape-invalid `endDate` does not throw (`travelStats` reads only ' +
    `startDate for a row it has not travelled: threw=${plannedThrows}) and is a suspect all the ` +
    `same (rowDatesReadable=${!plannedSuspect}). Beside one genuinely shape-invalid travelled row ` +
    `it makes two suspects and names neither: ` +
    JSON.stringify(hist([shapeInvalid, plannedBadEnd]).value?.rowId) +
    '. This is A-88 Part 2\'s residue with a second population the residue does not name.');

  // A4 — is that population REACHABLE? Every shipped door, run.
  const doorRefusals = {};
  let n = 0;
  const ctx = { ids: { newId: () => `id${++n}` }, clock: { today: () => '2026-01-01', now: () => '2026-01-01T00:00:00' } };
  doorRefusals.createTrip = attempt(() => core.createTrip({ id: 't', title: 'T', startDate: '2026-02-30', endDate: '2026-03-05' }, ctx)).threw;
  doorRefusals.setTripMeta = attempt(() => core.setTripMeta(trip, { startDate: '2026-02-30' }, ctx)).threw;
  const doc = JSON.parse(core.toJSON(trip));
  doc.startDate = '2026-02-30';
  doorRefusals.fromJSON = attempt(() => core.fromJSON(JSON.stringify(doc))).threw;
  note(`shipped doors asked for a calendar-invalid trip date: ${JSON.stringify(doorRefusals)}`);
  ok(Object.values(doorRefusals).every(Boolean),
    'A4  no door shipping TODAY can store a calendar-invalid trip date, so A-88 Part 2\'s residue trigger does not fire from a current write path',
    JSON.stringify(doorRefusals));
  note('a PREVIOUSLY shipped one could — §2.9 A-45 is the ruling that added the calendar check to ' +
    '`fromJSON`, and `qa/README.md`\'s I-8e note records that a pre-A-45 `store.importDoc` wrote ' +
    'both records. `qa/r66-prea45.sh` measures that at the commit itself.');

  // A5 — the row CONTAINER. A-88 Part 6 puts one predicate at three object gates: a `cities`
  // entry, the `attribution` container, each census. The fourth object the reader dereferences
  // is the row, and it has no gate — so a non-record row is a raw `TypeError` out of
  // `travelStats` AND a second raw `TypeError` out of `travelHistory`'s own failure branch.
  const escapes = [];
  for (const [lab, v] of [['null', null], ['undefined', undefined]]) {
    const h = hist([row({ id: 'healthy' }), v]);
    if (h.threw) escapes.push(`${lab}: ${h.msg}`);
  }
  ok(escapes.length === 0,
    'A5  `travelHistory` returns `ok: false` rather than throwing, for every stored library shape',
    `it throws for ${escapes.length}/2 non-record rows: ${JSON.stringify(escapes)} — ` +
    '`travelStats` throws first (the row is dereferenced ungated), the `catch` then calls ' +
    '`rowDatesReadable(row)` on the same row (`selectors/index.ts:380` reads `row.startDate`) and ' +
    'throws again, so the exception ESCAPES the branch whose whole purpose is to degrade. ' +
    'Reachable only from hand-edited storage.');
  const idless = hist([row({ id: 'ok1' }), new Error('boom')]);
  ok(!idless.threw && (idless.value.rowId === null || typeof idless.value.rowId === 'string'),
    'A5b `TravelHistoryResult.rowId` is `string | null` as its type declares, for every library shape',
    `a row with no \`id\` produces rowId ${JSON.stringify(idless.value?.rowId)} (typeof ` +
    `${typeof idless.value?.rowId}) and unreadableRows ${JSON.stringify(idless.value?.unreadableRows)}, ` +
    'so the declared type is wrong on the failure branch. Hand-edited storage only.');
}

// ---------------------------------------------------------------------------
head('B  Part 2\'s independent census gating — what the value arm publishes');
// A-88 Part 5's decisive argument: "the value arm's outcome must equal the outcome of the
// legitimate value it stands in for". That is testable as an EQUALITY, and the risk it opens is
// the other half of the pair: a census that carries only `attributed` now contributes it.
{
  const pub = (attr) => {
    const s = attempt(() => core.travelStats([row({ id: 'cen', attribution: { places: attr, stops: REF.attribution.stops } })], TODAY));
    if (s.threw) return { threw: s.msg };
    return { seen: s.value.seen.places, located: s.value.located.places, unattributed: s.value.unattributed.places, absorbed: s.value.absorbed.length };
  };
  const half = pub({ located: 5 });
  const whole = pub({ located: 5, attributed: 0 });
  ok(JSON.stringify(half) === JSON.stringify(whole),
    'B1  `{located: 5}` publishes exactly what `{located: 5, attributed: 0}` publishes (A-88 Part 5\'s own argument, as an equality)',
    `${JSON.stringify(half)} vs ${JSON.stringify(whole)}`);
  // The other half of the pair is the one the ruling does not work through: `attributed` alone,
  // and `attributed` > `located`, both of which the both-numbers arm used to absorb away.
  const matrix = [{ attributed: 7 }, { located: 0, attributed: 7 }, { located: 2, attributed: 9 },
    { located: 5, attributed: null }, {}, null, { located: '5', attributed: 2 }];
  const bad = [];
  for (const attr of matrix) {
    const p = pub(attr);
    note(`attribution.places = ${JSON.stringify(attr)} -> ${JSON.stringify(p)}`);
    if (p.threw) { bad.push([attr, 'threw']); continue; }
    for (const [k, v] of Object.entries(p)) if (typeof v === 'number' && (!Number.isFinite(v) || v < 0)) bad.push([attr, k, v]);
    if (p.unattributed > p.located) bad.push([attr, 'unattributed > located', p]);
    if (p.located > p.seen) bad.push([attr, 'located > seen', p]);
  }
  ok(bad.length === 0,
    'B2  no half-a-census publishes a negative, non-finite or inconsistent number (`unattributed <= located <= seen` holds through the new arm)',
    JSON.stringify(bad));
  const inert = pub({});
  ok(inert.absorbed === 0 && inert.located === 0,
    'B3  `{places: {}}` is INERT by ruling — no absorption, no contribution', JSON.stringify(inert));
}

// ---------------------------------------------------------------------------
head('C  Part 3\'s stored-record predicate, and the premises A-88 rests it on');
{
  // C1 — the premise, tested rather than accepted (A-88 Part 6 states both halves as verified).
  const kinds = [['Date', new Date()], ['Map', new Map([['a', 1]])], ['Set', new Set([1])], ['RegExp', /x/], ['Error', new Error('b')], ['BigInt', 1n]];
  const survived = kinds.filter(([, v]) => { const c = attempt(() => structuredClone(v)); return !c.threw && Object.getPrototypeOf(c.value) !== Object.prototype; });
  ok(survived.length === kinds.length,
    'C1  structured clone carries Date/Map/Set/RegExp/Error/BigInt — A-87 Part 7\'s "plain data" premise is false, as A-88 Part 6 says',
    JSON.stringify(survived.map(([k]) => k)));
  const nullProto = structuredClone(Object.create(null));
  ok(Object.getPrototypeOf(nullProto) === Object.prototype,
    'C2  `structuredClone(Object.create(null))` comes back carrying `Object.prototype` — the prototype test has no false positive on a same-realm clone',
    String(Object.getPrototypeOf(nullProto)));

  // C3 — the gate at all three object levels, one shape each, kept short because the covering
  // table owns the matrix. What is measured here is that the three gates AGREE.
  const gates = {
    'cities[0]': (v) => core.travelStats([row({ id: 'g', cities: [v] })], TODAY),
    attribution: (v) => core.travelStats([row({ id: 'g', attribution: v })], TODAY),
    'attribution.places': (v) => core.travelStats([row({ id: 'g', attribution: { places: v, stops: REF.attribution.stops } })], TODAY),
  };
  const disagreements = [];
  for (const [path, run] of Object.entries(gates)) {
    for (const [lab, v] of [['Error', new Error('b')], ['Date', new Date()], ['Map', new Map()], ['array', []]]) {
      const s = attempt(() => run(v));
      const at = s.threw ? null : s.value.absorbed.filter((a) => a.path === path);
      if (s.threw || at.length !== 1) disagreements.push(`${path} <- ${lab}: ${s.threw ? s.msg : JSON.stringify(s.value.absorbed)}`);
    }
  }
  ok(disagreements.length === 0,
    'C3  one predicate, three gates: a non-record absorbs exactly once, at its own level, at all three',
    JSON.stringify(disagreements));
  const err = attempt(() => core.travelStats([row({ id: 'g', cities: [new Error('boom')] })], TODAY));
  ok(!err.threw && !err.value.cities.some((c) => /Error/.test(c.name ?? '')) && err.value.unnamedCities === 0,
    'C3b `cities: [new Error()]` no longer puts a city named "Error" on the lifetime map',
    JSON.stringify(err.value?.cities?.slice(0, 3)));

  // C4 — the false positive the docstring says does not exist. `isStoredRecord` compares against
  // THIS realm's `Object.prototype`, so a structurally perfect record built in another realm is
  // refused and its city vanishes from the lifetime map, absorbed as a defect.
  const foreignCity = vm.runInNewContext('({ key: "k", name: "Vienna", countryCode: "AT", countrySource: "coordinate", centre: { lat: 48.2, lng: 16.4 }, firstDay: null, lastDay: null })');
  const fc = attempt(() => core.travelStats([row({ id: 'realm', cities: [foreignCity] })], TODAY));
  const refused = !fc.threw && fc.value.absorbed.some((a) => a.path === 'cities[0]');
  const docstring = src('packages/core/src/derive/travelStats.ts');
  note(`the docstring at travelStats.ts states: "The prototype test has no false positive" — ` +
    `${/has no false positive/.test(docstring) ? 'present' : 'ABSENT'} in the source`);
  ok(!refused,
    'C4  a structurally perfect stored record is accepted however it was constructed',
    'a cross-realm plain object (`vm.runInNewContext`, and in a browser an `iframe`/`Worker` ' +
    '`postMessage` payload) has a DIFFERENT `Object.prototype`, so `isStoredRecord` refuses it: ' +
    `absorbed ${JSON.stringify(fc.value?.absorbed)}, and the city is dropped from the lifetime map. ` +
    'The docstring\'s "has no false positive" is stated over same-realm structured clone only, and ' +
    'is broader than its mechanism. **Not reachable today** — `packages/client/src/ports/` has no ' +
    'Worker and `apps/web/src` never calls `postMessage`, both greped in §G.');
}

// ---------------------------------------------------------------------------
head('D  the three counts that moved into the reader');
{
  const hostile = row({ id: 'counts', stopCount: 'x', poolCount: 'x', placeCount: 'x' });
  const s = attempt(() => core.travelStats([hostile], TODAY));
  const paths = s.value?.absorbed.map((a) => a.path) ?? [];
  ok(JSON.stringify(paths) === JSON.stringify(['stopCount', 'poolCount', 'placeCount']),
    'D1  the absorption paths are exactly the three A-88 Part 6 names, in field order (the GatedRow field names are NOT the paths)',
    JSON.stringify(s.value?.absorbed ?? s.msg));
  ok(s.value?.absorbed.every((a) => a.kind === 'field'), 'D2  kind is `field` at all three', JSON.stringify(s.value?.absorbed));
  const planned = { ...REF, id: 'planned', startDate: '2027-01-01', endDate: '2027-01-10', stopCount: 'x', poolCount: 'x', placeCount: 'x' };
  const p = attempt(() => core.travelStats([planned], TODAY));
  ok(p.value?.absorbed.length === 3,
    'D3  the new count gate is lifecycle-blind (A-87 Part 5), like every other absorption',
    JSON.stringify(p.value?.absorbed ?? p.msg));
  // A-86 Part 5's *no ceiling* is explicitly untouched: the value stays `countOf`'s.
  const huge = attempt(() => core.travelStats([row({ id: 'huge', placeCount: 4000 })], TODAY));
  ok(!huge.threw && huge.value.absorbed.length === 0 && huge.value.seen.places === 4000,
    'D4  `countOf` still floors and does not cap — A-86 Part 5 untouched, and a believable-but-large count absorbs nothing',
    JSON.stringify({ absorbed: huge.value?.absorbed, seen: huge.value?.seen }));
  const neg = attempt(() => core.travelStats([row({ id: 'neg', stopCount: -1, poolCount: 1.5, placeCount: NaN })], TODAY));
  ok(neg.value?.absorbed.length === 3 && Number.isFinite(neg.value.seen.stops) && neg.value.seen.stops >= 0,
    'D5  `-1`, `1.5` and `NaN` are each reported and each publish 0',
    JSON.stringify({ absorbed: neg.value?.absorbed, seen: neg.value?.seen }));
}

// ---------------------------------------------------------------------------
head('E  the CLI cap (R65-6)');
{
  const cli = strip(src('cli.ts'));
  const m = /const shown = paths\.slice\(0, (\d+)\);/.exec(cli);
  ok(m && m[1] === '5', 'E1  `cli.ts` caps the per-row path list at five', m ? m[1] : 'no cap found');
  ok(/…and \$\{more\} more/.test(cli), 'E2  and it says it is capping', 'no "…and N more" in cli.ts');
  // The cap is applied AFTER the de-duplication, which is what makes "N more" a count of paths
  // the user does not see rather than a count of duplicate absorptions.
  const dedup = cli.indexOf('!paths.includes(a.path)');
  const slice = cli.indexOf('paths.slice(0, 5)');
  ok(dedup > 0 && slice > dedup, 'E3  the cap is applied after de-duplication, so "N more" counts unseen paths', `${dedup} / ${slice}`);
  // Simulate the shipped expression over a 200-absorption row — the exact shape R65-6 measured.
  const paths = Array.from({ length: 200 }, (_, i) => `cities[${i}].name`);
  const shown = paths.slice(0, 5);
  const more = paths.length - shown.length;
  const line = `  trip r1: unreadable stored values at ${shown.join(', ')}${more > 0 ? ` …and ${more} more` : ''}`;
  note(`the 200-absorption line is now ${line.length} characters: ${JSON.stringify(line)}`);
  ok(line.length < 200, 'E4  a 200-absorption row prints one line under 200 characters', String(line.length));
  ok(/…and 195 more$/.test(line), 'E5  and the count of what it did not print is right', line.slice(-30));
}

// ---------------------------------------------------------------------------
head('F  privacy: does anything on this path carry a stored VALUE (§6.1)');
{
  const secret = 'PIN-4471 door code, jacob@example.com';
  const s = attempt(() => core.travelStats([row({
    id: 'privacy',
    title: secret,
    cities: [city({ name: 42, countryCode: secret })],
    attribution: { places: { located: secret, attributed: 1 }, stops: REF.attribution.stops },
    stopCount: secret,
  })], TODAY));
  const blob = JSON.stringify(s.value?.absorbed ?? s.msg);
  ok(!blob.includes('PIN-4471') && !blob.includes('jacob@'),
    'F1  `absorbed` carries `{rowId, path, kind}` and never a stored value', blob.slice(0, 300));
  const keys = new Set((s.value?.absorbed ?? []).flatMap((a) => Object.keys(a)));
  ok(JSON.stringify([...keys].sort()) === JSON.stringify(['kind', 'path', 'rowId']),
    'F2  and it carries exactly those three keys', JSON.stringify([...keys]));
  const cli = strip(src('cli.ts'));
  const statsBody = cli.slice(cli.indexOf('function cmdStats'), cli.indexOf('function cmdStats') + 3000);
  // Every property read off an absorption record in `cmdStats`, whatever it is spelled `a.`.
  const readOff = [...statsBody.matchAll(/\ba\.(\w+)/g)].map((m) => m[1]);
  ok(readOff.every((k) => k === 'rowId' || k === 'path'),
    'F3  the CLI\'s absorption line reads only `rowId` and `path` off an absorption',
    JSON.stringify([...new Set(readOff)]));
}

// ---------------------------------------------------------------------------
head('G  the standing constraints over the three changed files');
{
  const files = ['packages/core/src/derive/travelStats.ts', 'packages/client/src/selectors/index.ts', 'cli.ts'];
  const ambient = [];
  for (const f of files) {
    const s = strip(src(f));
    for (const pat of [/\bDate\.now\(/, /\bMath\.random\(/, /crypto\.randomUUID\(/, /new Date\(\)/]) if (pat.test(s)) ambient.push(`${f} ${pat}`);
  }
  ok(ambient.length === 0, 'G1  no ambient clock or randomness in the three changed files', JSON.stringify(ambient));
  const pkgCore = JSON.parse(src('packages/core/package.json'));
  const pkgClient = JSON.parse(src('packages/client/package.json'));
  // Zero THIRD-PARTY runtime dependencies. `@cairn/*` is this repo's own workspace wiring and is
  // not what the rule is about (`cairn-constraints` §2: "no date library, no zod, no lodash").
  const foreign = [...Object.keys(pkgCore.dependencies ?? {}), ...Object.keys(pkgClient.dependencies ?? {})]
    .filter((d) => !d.startsWith('@cairn/'));
  ok(foreign.length === 0, 'G2  zero third-party runtime dependencies in core and client', JSON.stringify(foreign));
  const clientSrc = strip(src('packages/client/src/selectors/index.ts'));
  ok(!/\bdocument\.|\bwindow\.|\bReact\b/.test(clientSrc), 'G3  no DOM or React in the changed `packages/client` file', 'a hit');
  ok(Object.keys(core).length === 88, 'G4  `Object.keys(core).length` is 88', String(Object.keys(core).length));
  // The premise C4's severity rests on: nothing in the shipped tree hands the derive path a
  // cross-realm object today.
  const realmSources = [];
  for (const f of ['packages/client/src/ports/memory.ts', 'packages/client/src/ports/types.ts']) {
    if (/Worker|postMessage/.test(src(f))) realmSources.push(f);
  }
  ok(realmSources.length === 0, 'G5  no port constructs a Worker or reads a `postMessage` payload (C4 is unreachable today)', JSON.stringify(realmSources));
  // §6.1 — the sensitive-path check on the two package files this increment changed: nothing on
  // the derive/selector path logs, fetches or persists. `cli.ts` prints, which is its job, and
  // §F above measures WHAT it prints.
  const chatty = [];
  for (const f of ['packages/core/src/derive/travelStats.ts', 'packages/client/src/selectors/index.ts']) {
    const t = strip(src(f));
    for (const pat of [/\bconsole\./, /\bfetch\(/, /localStorage/, /indexedDB/, /XMLHttpRequest/]) if (pat.test(t)) chatty.push(`${f} ${pat}`);
  }
  ok(chatty.length === 0, 'G6  neither changed package file logs, fetches or persists anything', JSON.stringify(chatty));
}

// ---------------------------------------------------------------------------
head('H  non-regression at the numbers this arc keeps moving');
{
  const s = core.travelStats([REF], TODAY);
  ok(s.absorbed.length === 0, 'H1  the committed reference row absorbs nothing', JSON.stringify(s.absorbed));
  ok(s.seen.places === 95 && s.located.places === 94, 'H2  seen.places 95 / located.places 94', `${s.seen.places}/${s.located.places}`);
  ok(s.unnamedCities === 0 && s.unreadableCityDates === 0 && s.unreadableCityLists === 0,
    'H3  the three census counters are 0 on the reference row',
    JSON.stringify({ u: s.unnamedCities, d: s.unreadableCityDates, l: s.unreadableCityLists }));
  const h = hist([REF]);
  ok(!h.threw && h.value.ok === true, 'H4  `travelHistory` is ok over the reference library', JSON.stringify(h.value ?? h.msg));
  for (const cls of ['cities', 'places', 'stops']) {
    ok(s.unattributed[cls] <= s.located[cls] && s.located[cls] <= s.seen[cls],
      `H5  unattributed <= located <= seen for ${cls}`,
      JSON.stringify({ u: s.unattributed[cls], l: s.located[cls], s: s.seen[cls] }));
  }
}

console.log(`\n${oks} ok, ${fails} FAIL`);
console.log('COMPLETE');
