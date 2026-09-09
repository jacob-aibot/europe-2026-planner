/**
 * QA round 61 — the migration half of the adversarial pass over I-22 / §8.4 A-83 Part 8,
 * against commit `3b21a63`.
 *
 * Run from `cairn/`:  `node --experimental-strip-types qa/r61-migration.mjs`
 *
 * `SCHEMA_VERSION` 3 → 4 rewrites a stored value for the first time in this product's history,
 * over documents that may hold a real person's trips. Data loss or corruption here is the worst
 * outcome available in this area, so this probe attacks the rung and nothing else.
 *
 * A `FAIL` line is a finding; a `note` line is a fact recorded. The run ends with a `COMPLETE`
 * line — a run without it is INCOMPLETE and its counts may not be quoted. It writes nothing:
 * every fixture is built in memory, and `fixtures/legacy/` is read only.
 *
 * Sections:
 *   A  a rich version-3 document: every located coordinate byte-identical, only `{0,0}` nulled
 *   B  near-Null-Island — São Tomé and five other coordinates within a degree of the origin
 *   C  idempotence, re-run, and an already-version-4 document
 *   D  every fixture under `fixtures/legacy/` still opens
 *   E  the ladder's refusals: an unknown version, a fractional one, a future one
 *   F  input mutation — does the rung write through to the caller's document?
 *   G  the shipped gazetteer: is any pickable row at or near `{0,0}`?
 *   H  the `{lat:0,lng:0,…}` shape the rung's own docstring says it does not catch
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CAIRN = dirname(dirname(fileURLToPath(import.meta.url)));
const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);
const mig = await import(pathToFileURL(join(CAIRN, 'packages/core/src/serialize/migrate.ts')).href);

let fails = 0;
const ok = (cond, msg, extra) => {
  if (cond) console.log(`  ok   ${msg}`);
  else {
    fails++;
    console.log(`  FAIL ${msg}${extra === undefined ? '' : `  — ${extra}`}`);
  }
};
const note = (msg) => console.log(`  note ${msg}`);
const head = (s) => console.log(`\n== ${s}`);

const J = (v) => JSON.stringify(v);
const clone = (v) => JSON.parse(JSON.stringify(v));

/**
 * A real stored document, downgraded to version 3 — which is what a v3 document on a real
 * person's device actually looks like. The base is the committed Europe 2026 sample (6 cities,
 * 16 days, 112 stops, 95 places, 21 bookings, resolutions), re-written the way a v3 build wrote
 * it: no `placeId` key at all, and `{lat:0,lng:0}` where the current build writes `null`.
 * Participants and a photo are added so the rung is measured over every record class.
 */
const SAMPLE = JSON.parse(readFileSync(join(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8'));

function v3doc(cities) {
  const d = clone(SAMPLE);
  d.schemaVersion = 3;
  d.cities = clone(cities).map((c) => {
    const x = { ...c };
    delete x.placeIdMarker;
    return x;
  });
  // Keep the day skeleton pointing at cities that exist: days name city keys.
  const keys = new Set(d.cities.map((c) => c.key));
  d.days = d.days.map((day) => ({
    ...day,
    primaryCity: keys.has(day.primaryCity) ? day.primaryCity : 'transit',
    cities: day.cities.filter((k) => keys.has(k) || k === 'transit'),
  })).map((day) => ({ ...day, cities: day.cities.length ? day.cities : ['transit'] }));
  d.participants = [
    { id: 'pt_1', displayName: 'Jacob', kind: 'self', createdAt: '2026-08-01T00:00:00.000Z' },
  ];
  d.resolutions = d.resolutions ?? [];
  return d;
}

const city = (key, name, countryCode, centre, extra = {}) => ({
  key, name, countryCode, centre, order: 0, ...extra,
});

// ---------------------------------------------------------------------------
head('A — a rich version-3 document: only the {0,0} city is touched');

const VIENNA = { lat: 48.2082, lng: 16.3738 };
const A_CITIES = [
  city('c_vie', 'Vienna', 'AT', { ...VIENNA }),
  city('c_typed', 'Typed', '', { lat: 0, lng: 0 }),
  city('c_dbv', 'Dubrovnik', 'HR', { lat: 42.6507, lng: 18.0944 }),
  city('c_split', 'Split', 'HR', { lat: 43.5081, lng: 16.4402 }),
  city('c_prg', 'Prague', 'CZ', { lat: 50.0755, lng: 14.4378 }),
  city('c_bud', 'Budapest', 'HU', { lat: 47.4979, lng: 19.0402 }),
  city('c_lon', 'London', 'GB', { lat: 51.5072, lng: -0.1276 }),
];
const docA = v3doc(A_CITIES);
const beforeA = clone(docA);
const { doc: outA, report: repA } = mig.migrateDocWithReport(clone(docA));

ok(repA.nulledOriginCentres === 1, 'conversion count is 1', `got ${J(repA)}`);
ok(outA.schemaVersion === 4, 'arrives at schemaVersion 4', `got ${outA.schemaVersion}`);
{
  const located = outA.cities.filter((c) => c.key !== 'c_typed');
  const original = A_CITIES.filter((c) => c.key !== 'c_typed');
  let byteIdentical = true;
  const drift = [];
  for (let i = 0; i < located.length; i++) {
    if (J(located[i].centre) !== J(original[i].centre)) {
      byteIdentical = false;
      drift.push(`${original[i].name}: ${J(original[i].centre)} → ${J(located[i].centre)}`);
    }
  }
  ok(byteIdentical, 'every located coordinate is byte-identical', drift.join('; '));
  ok(J(outA.cities.find((c) => c.key === 'c_vie').centre) === J(VIENNA),
    'Vienna is {48.2082, 16.3738}, untouched', J(outA.cities.find((c) => c.key === 'c_vie').centre));
  ok(outA.cities.find((c) => c.key === 'c_typed').centre === null,
    'the {0,0} city is null', J(outA.cities.find((c) => c.key === 'c_typed').centre));
  ok(outA.cities.every((c) => c.placeId === null), 'every city gained placeId: null');
}
// Everything that is not `cities[].centre` / `cities[].placeId` must be identical.
{
  const strip = (d) => {
    const c = clone(d);
    c.schemaVersion = 'X';
    c.cities = c.cities.map((x) => { const y = { ...x }; delete y.centre; delete y.placeId; return y; });
    return c;
  };
  ok(J(strip(beforeA)) === J(strip(outA)),
    'no field outside cities[].centre / cities[].placeId moved',
    'diff present');
  note(`photos ${outA.photos.length}, participants ${outA.participants.length}, bookings ${outA.bookings.length}, resolutions ${outA.resolutions.length} carried`);
}
// And the whole thing must still open.
{
  let opened = null, err = null;
  try { opened = core.fromJSON(clone(outA)); } catch (e) { err = e; }
  ok(err === null, 'the migrated document opens through fromJSON', err && err.message);
  if (opened) {
    ok(J(opened.cities.find((c) => c.key === 'c_vie').centre) === J(VIENNA),
      'Vienna survives the parse byte-identical');
    const re = core.toJSON(opened);
    const re2 = core.toJSON(core.fromJSON(clone(re)));
    ok(JSON.stringify(re) === JSON.stringify(re2), 'a second round trip is byte-identical');
  }
}

// ---------------------------------------------------------------------------
head('B — near-Null-Island: a coordinate a user genuinely picked, within a degree of {0,0}');

const NEAR = [
  ['São Tomé',            { lat: 0.3365, lng: 6.7273 }],
  ['a point 11 m north',  { lat: 0.0001, lng: 0 }],
  ['a point 11 m east',   { lat: 0, lng: 0.0001 }],
  ['4dp-quantised 0.0001 both', { lat: 0.0001, lng: 0.0001 }],
  ['negative zero lat',   { lat: -0, lng: 0 }],
  ['exact origin',        { lat: 0, lng: 0 }],
];
{
  const cities = NEAR.map(([n, at], i) => city(`c_n${i}`, n, '', { ...at }));
  const { doc, report } = mig.migrateDocWithReport(v3doc(cities));
  const nulled = doc.cities.filter((c) => c.centre === null).map((c) => c.name);
  ok(J(nulled) === J(['negative zero lat', 'exact origin']),
    'ONLY the two coordinates that ARE the origin are nulled', `nulled: ${J(nulled)}`);
  ok(report.nulledOriginCentres === 2, 'the count matches what was nulled', J(report));
  const sao = doc.cities.find((c) => c.name === 'São Tomé');
  ok(J(sao.centre) === J({ lat: 0.3365, lng: 6.7273 }),
    'São Tomé (0.3365, 6.7273) survives byte-identical', J(sao.centre));
  const near11 = doc.cities.filter((c) => c.name.startsWith('a point') || c.name.startsWith('4dp'));
  ok(near11.every((c) => c.centre !== null),
    'a coordinate 11 m from the origin is NOT nulled', J(near11.map((c) => [c.name, c.centre])));
  note('`{lat:-0,lng:0}` is nulled because -0 === 0; JSON.stringify(-0) is "0", so no stored');
  note('document can distinguish it from the exact origin. Recorded, not filed.');
  // What does the product then say about São Tomé?
  const t = core.fromJSON(clone(doc));
  const s = core.tripSummary(t, core.COUNTRY_INDEX);
  const row = s.cities.find((c) => c.name === 'São Tomé');
  note(`São Tomé after migration: ${J({ countryCode: row.countryCode, countrySource: row.countrySource, centre: row.centre })}`);
}

// ---------------------------------------------------------------------------
head('C — idempotence, re-run, and an already-version-4 document');
{
  const once = mig.migrateDocWithReport(v3doc(clone(A_CITIES)));
  const twice = mig.migrateDocWithReport(clone(once.doc));
  ok(twice.report.nulledOriginCentres === 0, 're-migrating reports 0 conversions', J(twice.report));
  ok(J(once.doc) === J(twice.doc), 'migrating twice is byte-identical to migrating once');
  // A v4 document that was never a v3 one.
  const born4 = v3doc([city('c_vie', 'Vienna', 'AT', { ...VIENNA }, { placeId: 'ne:j63zkv' })]);
  born4.schemaVersion = 4;
  const r4 = mig.migrateDocWithReport(clone(born4));
  ok(r4.report.nulledOriginCentres === 0, 'a version-4 document reports 0', J(r4.report));
  ok(J(r4.doc) === J(born4), 'a version-4 document is a byte-identical no-op');
  // A v4 document that still carries a {0,0} — the rung has already run and will not run again.
  const stale4 = v3doc([city('c_z', 'Zero', '', { lat: 0, lng: 0 })]);
  stale4.schemaVersion = 4;
  const r5 = mig.migrateDocWithReport(clone(stale4));
  ok(J(r5.doc.cities[0].centre) === J({ lat: 0, lng: 0 }),
    'a {0,0} in a document ALREADY stamped 4 passes through — the rung is not re-run', J(r5.doc.cities[0].centre));
  note('that is the ladder working as specified; it is recorded so nobody expects a sweep.');
  ok(r5.doc.cities[0].placeId === undefined,
    'and such a city gains NO placeId — the v4 arm supplies nothing',
    `placeId is ${J(r5.doc.cities[0].placeId)}`);
  let threw = null;
  try { core.fromJSON(clone(r5.doc)); } catch (e) { threw = e; }
  note(`fromJSON on that document: ${threw === null ? 'OPENS' : threw.message}`);
  // v1 and v2 documents climb the whole ladder.
  for (const from of [1, 2]) {
    const d = v3doc([city('c_vie', 'Vienna', 'AT', { ...VIENNA }), city('c_z', 'Zero', '', { lat: 0, lng: 0 })]);
    d.schemaVersion = from;
    if (from === 1) { delete d.photos; delete d.participants; }
    if (from === 2) { delete d.participants; }
    const r = mig.migrateDocWithReport(d);
    ok(r.doc.schemaVersion === 4 && r.report.nulledOriginCentres === 1,
      `a version-${from} document climbs to 4 and converts its one origin`, J(r.report));
    ok(J(r.doc.cities[0].centre) === J(VIENNA), `version-${from}: Vienna untouched`);
  }
}

// ---------------------------------------------------------------------------
head('D — every fixture under fixtures/legacy/ still opens');
{
  const dir = join(CAIRN, 'fixtures/legacy');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  note(`${files.length} fixture(s): ${files.join(', ')}`);
  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const before = clone(raw);
    let t = null, err = null, rep = null;
    try {
      const r = mig.migrateDocWithReport(clone(raw));
      rep = r.report;
      t = core.fromJSON(clone(raw));
    } catch (e) { err = e; }
    ok(err === null, `${f} (schemaVersion ${before.schemaVersion}) opens`, err && err.message);
    if (rep) note(`${f} report: ${J(rep)}`);
    if (t) {
      const drift = [];
      for (const c of before.cities ?? []) {
        const now = t.cities.find((x) => x.key === c.key);
        if (!now) { drift.push(`${c.key} vanished`); continue; }
        if (J(c.centre) !== J(now.centre)) drift.push(`${c.name}: ${J(c.centre)} → ${J(now.centre)}`);
      }
      ok(drift.length === 0, `${f}: every stored city coordinate survives`, drift.join('; '));
      const vie = t.cities.find((c) => /vienna|wien/i.test(c.name));
      if (vie) ok(J(vie.centre) === J(VIENNA), `${f}: Vienna is still {48.2082, 16.3738}`, J(vie.centre));
      ok((t.cities ?? []).every((c) => c.placeId === null), `${f}: every city reads placeId null`);
      // Re-emit and re-read.
      const a = JSON.stringify(core.toJSON(t));
      const b = JSON.stringify(core.toJSON(core.fromJSON(JSON.parse(a))));
      ok(a === b, `${f}: re-emit is stable`);
    }
  }
}

// ---------------------------------------------------------------------------
head('E — the ladder refuses what it cannot climb, naming the ORIGINAL version');
{
  for (const [v, want] of [[0, /no migration path from schemaVersion 0/], [1.5, /no migration path from schemaVersion 1.5/],
    [-1, /no migration path from schemaVersion -1/], [5, /reads up to 4/]]) {
    const d = v3doc([city('c_vie', 'Vienna', 'AT', { ...VIENNA })]);
    d.schemaVersion = v;
    let msg = 'NO THROW';
    try { mig.migrateDocWithReport(d); } catch (e) { msg = e.message; }
    ok(want.test(msg), `schemaVersion ${v} is refused loudly`, msg);
  }
  const d = v3doc([city('c_vie', 'Vienna', 'AT', { ...VIENNA })]);
  d.schemaVersion = NaN;
  let msg = 'NO THROW';
  try { mig.migrateDocWithReport(d); } catch (e) { msg = e.message; }
  ok(/no migration path/.test(msg), 'schemaVersion NaN is refused', msg);
}

// ---------------------------------------------------------------------------
head('F — the rung does not write through to the caller\'s document');
{
  const d = v3doc([city('c_vie', 'Vienna', 'AT', { ...VIENNA }), city('c_z', 'Zero', '', { lat: 0, lng: 0 })]);
  const snapshot = J(d);
  mig.migrateDocWithReport(d);
  ok(J(d) === snapshot, 'the input document is not mutated', 'the caller\'s object changed');
  // The tally is per call and holds no state between calls.
  const r1 = mig.migrateDocWithReport(v3doc([city('c_z', 'Zero', '', { lat: 0, lng: 0 })]));
  const r2 = mig.migrateDocWithReport(v3doc([city('c_z', 'Zero', '', { lat: 0, lng: 0 })]));
  ok(r1.report.nulledOriginCentres === 1 && r2.report.nulledOriginCentres === 1,
    'the tally is allocated per call', `${J(r1.report)} / ${J(r2.report)}`);
  ok(r1.report !== r2.report, 'two calls do not share one report object');
  // migrateDoc's own signature.
  ok(mig.migrateDoc.length === 1, 'migrateDoc takes exactly one parameter', String(mig.migrateDoc.length));
  const plain = mig.migrateDoc(v3doc([city('c_z', 'Zero', '', { lat: 0, lng: 0 })]));
  ok(plain.cities[0].centre === null && plain.schemaVersion === 4,
    'migrateDoc returns the document itself, not a { doc, report }', J(Object.keys(plain).slice(0, 4)));
}

// ---------------------------------------------------------------------------
head('G — is any pickable gazetteer row at or near the origin?');
{
  const gz = await import(pathToFileURL(join(CAIRN, 'packages/core/src/geo/gazetteer.gen.ts')).href);
  const rows = gz.GAZETTEER.rows;
  const exact = rows.filter((r) => r.centre.lat === 0 && r.centre.lng === 0);
  ok(exact.length === 0, 'no shipped row sits at exactly {0,0}', J(exact.map((r) => r.name)));
  const near = rows.filter((r) => Math.abs(r.centre.lat) < 1 && Math.abs(r.centre.lng) < 1);
  note(`${near.length} shipped row(s) within 1° of the origin: ${J(near.map((r) => `${r.name} ${r.centre.lat},${r.centre.lng}`))}`);
  const nearST = rows.filter((r) => Math.abs(r.centre.lat) < 1.5 && r.centre.lng > 5 && r.centre.lng < 9);
  note(`Gulf of Guinea rows: ${J(nearST.map((r) => `${r.name} ${r.countryCode} ${r.centre.lat},${r.centre.lng}`))}`);
  note(`total rows ${rows.length}; marked disagreeing ${rows.filter((r) => r.indexAgrees === false).length}`);
}

// ---------------------------------------------------------------------------
head('H — the shapes the rung\'s own docstring claims it does not catch');
{
  // migrate.ts:115 — "Exactly `{lat: 0, lng: 0}`, and nothing else — not near it, not `{0,0,extra}`."
  const cases = [
    ['{lat:0,lng:0,alt:5}', { lat: 0, lng: 0, alt: 5 }],
    ['{lat:0,lng:0,note:"picked"}', { lat: 0, lng: 0, note: 'picked' }],
    ['{lng:0,lat:0}', { lng: 0, lat: 0 }],
    ['{lat:"0",lng:"0"}', { lat: '0', lng: '0' }],
    ['{lat:0}', { lat: 0 }],
  ];
  const cities = cases.map(([n, at], i) => city(`c_h${i}`, n, '', at));
  const { doc, report } = mig.migrateDocWithReport(v3doc(cities));
  const nulled = doc.cities.filter((c) => c.centre === null).map((c) => c.name);
  note(`nulled: ${J(nulled)}; count ${report.nulledOriginCentres}`);
  // `isOrigin` is `o.lat === 0 && o.lng === 0` and says nothing about other keys, so a centre
  // with an extra key IS nulled. That is the right BEHAVIOUR — `parseCentre` reads only `lat`
  // and `lng`, so `{0,0,alt:5}` parses to `{0,0}` and is the same fabrication — but it is not
  // what `migrate.ts:115` says. The DOCSTRING is the defect, in the harmless direction.
  ok(!nulled.includes('{lat:0,lng:0,alt:5}') && !nulled.includes('{lat:0,lng:0,note:"picked"}'),
    'migrate.ts:115 — "not `{0,0,extra}`" describes the code',
    'R61-8: the code DOES null `{lat:0,lng:0,extra}`; the docstring says it does not. '
    + 'The behaviour is right and the sentence is wrong.');
  ok(!nulled.includes('{lat:"0",lng:"0"}'), 'a string "0" is not the origin');
  ok(!nulled.includes('{lat:0}'), 'a half coordinate is not the origin');
}

console.log(`\n${fails === 0 ? 'ALL CLEAR' : `${fails} FAIL(S)`}`);
console.log('COMPLETE');
process.exit(fails === 0 ? 0 : 1);
