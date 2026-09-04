/**
 * QA round 43 — the independent breaker pass over **I-12** (`ARCHITECTURE.md` §8.4 **A-56**,
 * revision 40): `TripSummaryCity` gains `centre` + `firstDay`/`lastDay`, `SUMMARY_VERSION`
 * 4 → 5, `TravelStatsCity` gains `firstVisit`/`lastVisit`.
 *
 * **RE-CUT at round 44, `master` @ `b574dc5`, by the breaker who wrote it — sections E, F, K
 * and M.** Three of round 43's own findings were fixed between the two rounds, and this file
 * asserted the *defects* rather than the contracts, so re-running it unchanged reported the
 * fixes as 9 FAILs (3 → 9) and made ROADMAP I-12a's ship gate — *"§F, §H and §M must go
 * green"* — literally unsatisfiable. The builder of I-12a correctly declined to edit it; that
 * is the breaker's call and this is the breaker making it. What moved, and nothing else did:
 *
 *   - **§E ×2** — the two assertions pinning A-56 clause 1's clamp-collapse, which **A-60 Part
 *     2 supersedes**. Same inputs, the ruled answer, plus the two touching-at-one-day edges the
 *     ruling explicitly keeps.
 *   - **§F ×5** — the four corrupt-date throws and the whole-library blast radius, which
 *     **A-59 Part 2** removes. Re-cut to the fallback and its count.
 *   - **§K ×1** — a hand-typed copy of `qa/i7a-idb-rowkeys.mjs`'s pre-fix float check, stale
 *     since **R43-3** was fixed at `28ed249`. Re-transcribed, and the transcription is now
 *     *checked against the file* so it cannot silently drift again.
 *   - **§M ×1** — `res.rowId !== null`, which after A-59 Part 2 passed **vacuously** on the
 *     `ok: true` branch. Re-cut to demand the naming on a library that is still refused.
 *
 * Sections A–D and G–L are round 43's, unchanged. The **new** contract's own adversarial
 * pass is `qa/r44-a59.mjs`; this file is not it.
 *
 *   node --experimental-strip-types qa/r43-a56.mjs      (bare Node, no browser, no server)
 *
 * Written from A-56 and the shipped source. It re-derives every builder claim with its own
 * instruments and does **not** call, extend or trust `packages/core/test/summary.test.ts`,
 * `travelStats.test.ts`, `summary-rescan.test.ts` or `test/stats-storage.test.ts` — those were
 * written by the builder of this increment.
 *
 * The oracle for section C is **hand-transcribed from the root planner HTML** (`cityStops`'s
 * six `lat`/`lng`/`note` triples and the `cities:[...]` array on each of the 16 `DAYS`
 * entries), read with `grep`, typed into this file, and compared against the shipped row. It
 * is not the code's own answer to its own question.
 *
 * Sections
 *   A  fence + `cairn-constraints`: what the diff touched, and what it must not have.
 *   B  the allow-list arithmetic, re-derived with MY leafPaths over MY minted rows.
 *   C  the hand oracle — six centres, six date ranges, from the planner HTML.
 *   D  the rescan, from a genuine version-4 row through the shipped store.
 *   E  `travelStats` clamping, driven at every edge A-56 Part 7 clause 1 names.
 *   F  the no-shape-gate throw, and its blast radius measured rather than argued.
 *   G  `TravelStatsCountry` — untouched, and country dates still TRIP-range.
 *   H  containment: `centre` in a golden, a CLI line, an export, a log.
 *   I  purity, determinism, aliasing.
 *   J  real-data shapes: multi-city days, zero-day trips, unsorted days, duplicate imports.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import * as core from '../packages/core/src/index.ts';
import {
  createStore, memoryStorage, memoryFile, fixedClockPort, sequentialIdPort, immediateScheduler,
} from '../packages/client/src/index.ts';
import { summaryScan } from '../packages/client/src/selectors/index.ts';
import { loadEurope2026 } from '../fixtures/loadEurope2026.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const ROOT = resolve(CAIRN, '..');

let fails = 0;
const ok = (c, m, extra) => {
  if (c) console.log(`  ok    ${m}`);
  else { fails++; console.log(`  FAIL  ${m}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });

const PRE = '4b5643b';
const AT = '8b50889';
const TODAY = '2026-08-24';

// ===========================================================================
head('A. the fence, and cairn-constraints, over `git diff 4b5643b..8b50889`');
// ===========================================================================
{
  const names = git('diff', '--name-only', PRE, AT).trim().split('\n');
  note(`${names.length} files: ${names.map((n) => n.replace('cairn/', '')).join(' ')}`);
  const none = (re, label) => ok(names.filter((n) => re.test(n)).length === 0, label,
    names.filter((n) => re.test(n)));
  none(/\.tsx$/, 'zero `.tsx` files');
  none(/^cairn\/packages\/client\/src\//, 'zero `packages/client/src/` — A-56 Part 3 "no client code changes"');
  none(/^cairn\/apps\/web\/src\//, 'zero `apps/web/src/`');
  none(/^cairn\/packages\/core\/src\/index\.ts$/, 'zero `packages/core/src/index.ts` — §2.10 unmoved');
  none(/^cairn\/docs\/design\//, 'zero `docs/design/`');
  none(/^cairn\/packages\/core\/src\/geo\/|derive\/geo\.ts$|worldMap/, 'zero world-map / geo geometry');
  none(/package(-lock)?\.json$/, 'zero dependency change');
  none(/photo|storage\//i, 'zero photo/storage files (I-13 is a separate pass)');
  none(/^(?!cairn\/)/, 'nothing outside `cairn/` — the root planner is untouched');

  // The export count of §2.10, counted rather than asserted from a zero-line diff.
  const cnt = (rev) => git('show', `${rev}:cairn/packages/core/src/index.ts`)
    .split('\n').filter((l) => /^export /.test(l)).length;
  ok(cnt(PRE) === cnt(AT), `core/index.ts export lines unchanged (${cnt(PRE)} → ${cnt(AT)})`);

  // md5 of the live planner, against the figure BUILD-NOTES records.
  const md5 = execFileSync('md5sum', [join(ROOT, 'europe-2026-itinerary.html')], { encoding: 'utf8' }).split(' ')[0];
  ok(md5 === '7c69df3208ef91c8be0fb59a56443188', `root planner md5 unchanged (${md5})`);

  // The added lines, grepped for everything §6.1 and cairn-constraints §4/§5 forbid.
  // PRODUCTION source only — a test's prose says "document" and that is not a DOM reference.
  const added = git('diff', PRE, AT, '--', 'cairn/packages/core/src', 'cairn/packages/client/src',
    'cairn/apps/web/src', 'cairn/cli.ts')
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const stripComment = (l) => l.replace(/^\+\s*(\*|\/\/|\/\*).*$/, '');
  const code = added.map(stripComment).join('\n');
  for (const [re, label] of [
    [/console\./, 'console.*'], [/\bfetch\(/, 'fetch('], [/XMLHttpRequest|sendBeacon/, 'beacon/XHR'],
    [/localStorage|sessionStorage/, 'web storage'], [/geolocation|watchPosition/, 'geolocation'],
    [/Date\.now|new Date\(/, 'ambient clock'], [/Math\.random|crypto\.randomUUID/, 'ambient randomness'],
    [/\bdocument\b|\bwindow\b|navigator\./, 'DOM'],
    [/imap|gmail|oauth|mailbox|EXIF/i, 'mailbox/EXIF'],
  ]) ok(!re.test(code), `no added line matches ${label}`,
    code.split('\n').filter((l) => re.test(l)).slice(0, 3));

  // A-56 Part 4: stop-level geometry is REFUSED. Nothing in the row may be per-stop.
  const sum = readFileSync(join(CAIRN, 'packages/core/src/derive/summary.ts'), 'utf8');
  const typeBlock = sum.slice(sum.indexOf('export type TripSummaryRow'), sum.indexOf('export function tripSummary'));
  ok(!/stops?\s*:\s*(readonly\s*)?\{|places?\s*:\s*(readonly\s*)?\{|at\s*:\s*LatLng|coords|geometry|polyline/i.test(typeBlock),
    'A-56 Part 4: no per-stop / per-place geometry on TripSummaryRow');
  const refRow = core.tripSummary(loadRef(), core.COUNTRY_INDEX);
  const latlngs = JSON.stringify(refRow).match(/"lat":/g) ?? [];
  ok(latlngs.length === refRow.cities.length,
    `a minted row carries exactly one coordinate PER CITY and no more (${latlngs.length} lat keys, ${refRow.cities.length} cities)`,
    latlngs.length);
  ok(refRow.stopCount === 112 && refRow.cities.length === 6,
    `A-56 Part 4 ground 1: 112 stops, 6 cities — the row grew by 6 coordinates, not 112 (${refRow.stopCount}/${refRow.cities.length})`);
}

/** The reference trip, through the shipped read-only extractor (§2.11: nothing is copied). */
function loadRef() {
  return loadEurope2026().trip;
}

// ===========================================================================
head('B. the allow-list arithmetic — MY leafPaths, MY rows, against A-56 Part 6 as transcribed');
// ===========================================================================
{
  // A-56 Part 6's list, typed in from ARCHITECTURE.md rather than imported from the test.
  const A56_PART6 = [
    'attribution.places.attributed', 'attribution.places.located', 'attribution.stops.attributed',
    'attribution.stops.located', 'cities[].centre.lat', 'cities[].centre.lng', 'cities[].countryCode',
    'cities[].countrySource', 'cities[].firstDay', 'cities[].key', 'cities[].lastDay', 'cities[].name',
    'cityCount', 'countryCodes[]', 'datePrecision', 'dayCount', 'endDate', 'id', 'poolCount',
    'revision', 'startDate', 'stopCount', 'summaryVersion', 'title',
  ];
  ok(A56_PART6.length === 24, `A-56 Part 6's transcription is 24 entries (${A56_PART6.length})`);

  // My own leaf walker, written here, different in shape from the test's.
  const leaves = (v, p = '', out = new Set()) => {
    if (Array.isArray(v)) { v.forEach((x) => leaves(x, `${p}[]`, out)); return out; }
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) leaves(v[k], p ? `${p}.${k}` : k, out);
      return out;
    }
    out.add(p); return out;
  };
  const ids = (p) => core.sequentialIds(p);
  const mk = (o, p) => core.createTrip({ homeCurrency: 'EUR', ...o }, { ids: ids(p), now: '2026-06-15' });
  const rows = [
    core.tripSummary(loadRef(), core.COUNTRY_INDEX),
    core.tripSummary(mk({ title: 'null country', startDate: '2024-03-01', endDate: '2024-03-02',
      cities: [{ key: 'nowhere', name: 'Nowhere', centre: { lat: -40.5, lng: -20.5 } }] }, 'n-'), core.COUNTRY_INDEX),
    core.tripSummary(mk({ title: 'empty', startDate: '2024-05-01', endDate: '2024-05-02' }, 'e-'), core.COUNTRY_INDEX),
    core.tripSummary(mk({ title: 'no days', startDate: '2019-03-01', endDate: '2019-03-31', datePrecision: 'month',
      cities: [{ key: 'kyoto', name: 'Kyoto', centre: { lat: 35.0116, lng: 135.7681 } }] }, 'k-'), core.COUNTRY_INDEX),
  ];
  const union = new Set();
  for (const r of rows) for (const p of leaves(r)) union.add(p);
  ok(JSON.stringify([...union].sort()) === JSON.stringify([...A56_PART6].sort()),
    `the union of four rows' leaf paths is exactly A-56 Part 6's 24 (${union.size})`,
    { extra: [...union].filter((p) => !A56_PART6.includes(p)), missing: A56_PART6.filter((p) => !union.has(p)) });

  // Top-level keys — `ROW_KEYS` must not have grown. 14 before I-12 and 14 now.
  const top = Object.keys(rows[0]).sort();
  ok(top.length === 14, `top-level key count is 14, unchanged (${top.length}): ${top.join(',')}`);

  // Count-shaped, my own classifier, deliberately GENEROUS: anything ending in a domain plural
  // or a counting suffix, plus the census pair. Eight, exactly, or a count got stored.
  const countShaped = (leaf) => {
    const n = leaf.split('.').pop().replace(/\[\]$/, '');
    if (/^(located|attributed)$/i.test(n)) return true;
    if (/(count|total|tally|num|visited|travell?ed)$/i.test(n) && /countr|cit|trip|day|stop|place|pool/i.test(n)) return true;
    return /^(cities|countries|trips|days|stops|places)$/i.test(n);
  };
  const counts = A56_PART6.filter(countShaped).sort();
  ok(counts.length === 8, `ROW_COUNT_FIELDS is still exactly eight (${counts.length}): ${counts.join(',')}`, counts);
  ok(!counts.some((c) => c.startsWith('cities[].')),
    'no count-shaped field was added INSIDE cities[] — A-56 Part 6\'s real check');

  // The nested-leaf trap the builder flagged: CITY_KEYS derived from ROW_PATHS.
  const cityLeaves = A56_PART6.filter((p) => p.startsWith('cities[].')).map((p) => p.slice(9).split('.')[0]);
  const cityKeys = [...new Set(cityLeaves)].sort();
  ok(JSON.stringify(cityKeys) === JSON.stringify(['centre', 'countryCode', 'countrySource', 'firstDay', 'key', 'lastDay', 'name']),
    `first-segment de-dup gives the 7 real city keys (${cityKeys.join(',')})`, cityKeys);
  ok(JSON.stringify(Object.keys(rows[0].cities[0]).sort()) === JSON.stringify(cityKeys),
    'a minted city entry\'s own keys equal that derivation', Object.keys(rows[0].cities[0]).sort());

  // A-56 Part 6's fourth fixture, and the claim its stated reason is inverted.
  const withDays = rows[0].cities.filter((c) => c.firstDay !== null).length;
  ok(withDays === 6, `the reference trip reaches the NON-null branch for all 6 cities (${withDays})`);
  ok(rows[1].cities[0].firstDay === null && rows[2].cities.length === 0 && rows[3].cities[0].firstDay === null,
    'fixtures 2 and 4 both reach firstDay: null; fixture 3 contributes no cities[] path at all',
    { two: rows[1].cities[0].firstDay, four: rows[3].cities[0].firstDay });
  // The mechanism behind the inversion, measured on the document rather than argued.
  const built = mk({ title: 'x', startDate: '2024-03-01', endDate: '2024-03-03',
    cities: [{ key: 'c1', name: 'C1', centre: { lat: 1, lng: 1 } }] }, 'i-');
  ok(built.days.length === 3 && built.days.every((d) => JSON.stringify(d.cities) === '["transit"]'),
    'createTrip/ensureDays marks EVERY blank day cities:["transit"] — so a built trip\'s city occupies no day',
    built.days.map((d) => d.cities));
  ok(rows[3].cities[0].centre.lat === 35.0116,
    'a city with NO days still carries its centre — "no days" is not "no city"');
}

// ===========================================================================
head('C. the hand oracle — six centres and six date ranges, transcribed from the planner HTML');
// ===========================================================================
{
  // Typed in from `europe-2026-itinerary.html`:
  //   `const cityStops = [...]`     (lat/lng and the human-written note)
  //   `DAYS`' 16 `cities:[...]`     (which days carry which city)
  // Neither number below came from `tripSummary`.
  const ORACLE = {
    vienna:    { centre: { lat: 48.2082, lng: 16.3738 },  first: '2026-08-08', last: '2026-08-10', note: 'Aug 8–10' },
    dubrovnik: { centre: { lat: 42.6507, lng: 18.0944 },  first: '2026-08-10', last: '2026-08-12', note: 'Aug 10–12' },
    split:     { centre: { lat: 43.5081, lng: 16.4402 },  first: '2026-08-12', last: '2026-08-15', note: 'Aug 12–15' },
    prague:    { centre: { lat: 50.0755, lng: 14.4378 },  first: '2026-08-15', last: '2026-08-18', note: 'Aug 15–18' },
    budapest:  { centre: { lat: 47.4979, lng: 19.0402 },  first: '2026-08-18', last: '2026-08-21', note: 'Aug 18–21' },
    london:    { centre: { lat: 51.4839, lng: -0.6044 },  first: '2026-08-21', last: '2026-08-22', note: 'Aug 21–22' },
  };
  const trip = loadRef();
  const row = core.tripSummary(trip, core.COUNTRY_INDEX);
  ok(row.summaryVersion === 5, `SUMMARY_VERSION is 5 (${row.summaryVersion})`);
  ok(core.SUMMARY_VERSION === 5, `the exported constant is 5 (${core.SUMMARY_VERSION})`);
  for (const c of row.cities) {
    const want = ORACLE[c.key];
    if (!want) { ok(false, `unexpected city key ${c.key}`); continue; }
    ok(c.centre.lat === want.centre.lat && c.centre.lng === want.centre.lng,
      `${c.key}: centre matches the planner's own cityStops entry`, { got: c.centre, want: want.centre });
    ok(c.firstDay === want.first && c.lastDay === want.last,
      `${c.key}: ${c.firstDay} → ${c.lastDay} matches my hand count of DAYS[].cities and the note "${want.note}"`,
      { got: [c.firstDay, c.lastDay], want: [want.first, want.last] });
  }
  ok(row.cities.map((c) => c.key).join(',') === 'vienna,dubrovnik,split,prague,budapest,london',
    'display order preserved', row.cities.map((c) => c.key));
  // A-56 residue 1, measured: the ranges DO overlap, and the sum exceeds dayCount.
  const dayNum = (d) => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000);
  const sum = row.cities.reduce((n, c) => n + (dayNum(c.lastDay) - dayNum(c.firstDay) + 1), 0);
  ok(sum > row.dayCount,
    `residue 1 holds and is visible: Σ city spans = ${sum} > dayCount ${row.dayCount} — no surface may sum these`);
  // A-56 Part 5: correctness asserted against the SOURCE, and the six are pairwise distinct.
  const ordered = trip.cities.slice().sort((a, b) => a.order - b.order);
  ok(row.cities.every((c, i) => c.centre === ordered[i].centre || JSON.stringify(c.centre) === JSON.stringify(ordered[i].centre)),
    'every centre is identical to orderedCities(trip)[i].centre');
  ok(new Set(row.cities.map((c) => JSON.stringify(c.centre))).size === 6,
    'the six centres are pairwise distinct — a row carrying one city six times could not pass');
  // `cityRange` did not move, and MY OWN formatter agrees with the pair.
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const myRange = (f, l) => {
    const [, fm, fd] = f.split('-').map(Number); const [, lm, ld] = l.split('-').map(Number);
    const h = `${MON[fm - 1]} ${fd}`;
    return f === l ? h : `${h}–${fm === lm ? ld : `${MON[lm - 1]} ${ld}`}`;
  };
  for (const c of row.cities) {
    ok(core.cityRange(trip, c.key) === myRange(c.firstDay, c.lastDay),
      `${c.key}: cityRange "${core.cityRange(trip, c.key)}" agrees with my formatter over the stored pair`);
  }
}

// ===========================================================================
head('D. the rescan — a GENUINE version-4 row, through the shipped store');
// ===========================================================================
let seq = 0;
const ports = (storage, today = TODAY) => ({
  storage, file: memoryFile(), clock: fixedClockPort(today),
  ids: sequentialIdPort(`r43-${++seq}-`), scheduler: immediateScheduler(),
});
const CITY = {
  vienna: { key: 'vienna', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.2082, lng: 16.3738 } },
  tokyo: { key: 'tokyo', name: 'Tokyo', countryCode: 'JP', centre: { lat: 35.6762, lng: 139.6503 } },
  split: { key: 'split', name: 'Split', countryCode: 'HR', centre: { lat: 43.5081, lng: 16.4402 } },
};
const makeTrip = (id, cityKey, startDate, endDate) =>
  core.createTrip(
    { id, title: `Trip ${id}`, startDate, endDate, homeCurrency: 'EUR', cities: [CITY[cityKey]] },
    { ids: core.sequentialIds(`${id}-`), now: TODAY, actorUserId: core.LOCAL_OWNER },
  );
/** What a build one commit older wrote: mint at HEAD, then delete exactly what I-12 added. */
function versionFourRow(doc) {
  const row = core.tripSummary(doc, core.COUNTRY_INDEX);
  for (const c of row.cities) { delete c.centre; delete c.firstDay; delete c.lastDay; }
  row.summaryVersion = 4;
  return JSON.parse(JSON.stringify(row));
}
{
  const storage = memoryStorage();
  const docs = [
    makeTrip('t-at', 'vienna', '2024-05-01', '2024-05-10'),
    makeTrip('t-jp', 'tokyo', '2023-03-01', '2023-03-14'),
    makeTrip('t-hr', 'split', '2026-08-20', '2026-09-05'),
  ];
  // Give one of them real day→city edges, so the rescan has a non-null branch to reach.
  let atDoc = docs[0];
  for (const d of atDoc.days) {
    atDoc = core.setDayMeta(atDoc, d.id, { primaryCity: 'vienna', cities: ['vienna'] },
      { ids: core.sequentialIds('sd-'), now: TODAY });
  }
  docs[0] = atDoc;
  for (const d of docs) {
    const r = await storage.saveIfVersion(d.id, null, core.toJSON(d), versionFourRow(d));
    if (!r.ok) throw new Error(`seed ${d.id} failed`);
  }
  const before = await storage.listTrips();
  ok(before.every((r) => r.summaryVersion === 4), 'seeded rows are genuine version 4', before.map((r) => r.summaryVersion));
  ok(before.every((r) => r.cities.every((c) => !('centre' in c) && !('firstDay' in c))),
    'seeded rows carry no centre / firstDay key at all');

  const store = createStore({ ports: ports(storage) });
  await store.refreshLibrary();
  const scan0 = summaryScan(store.getState());
  ok(scan0.phase === 'stale', `summaryScan is 'stale' on boot (${scan0.phase}) — the VERSION BUMP ALONE is the trigger`, scan0.phase);
  ok(scan0.outdated.length === 3, `all three rows are outdated (${scan0.outdated.length})`, scan0.outdated);

  await store.rescanSummaries();
  const after = await storage.listTrips();
  ok(after.every((r) => r.summaryVersion === 5), 'every stored row reached 5', after.map((r) => r.summaryVersion));
  ok(after.every((r) => r.cities.every((c) => typeof c.centre?.lat === 'number' && typeof c.centre?.lng === 'number')),
    'every rescanned city carries a real {lat,lng}', after.map((r) => r.cities.map((c) => c.centre)));
  const at = after.find((r) => r.id === 't-at');
  ok(at.cities[0].firstDay === '2024-05-01' && at.cities[0].lastDay === '2024-05-10',
    `the rescanned Vienna row has the document's own day range (${at.cities[0].firstDay} → ${at.cities[0].lastDay})`);
  const jp = after.find((r) => r.id === 't-jp');
  ok(jp.cities[0].firstDay === null && jp.cities[0].lastDay === null,
    'a rescanned city that occupies no day is null on BOTH ends', [jp.cities[0].firstDay, jp.cities[0].lastDay]);
  for (const d of docs) {
    const want = core.tripSummary(d, core.COUNTRY_INDEX);
    const got = after.find((r) => r.id === d.id);
    ok(JSON.stringify(got) === JSON.stringify(want),
      `${d.id}'s rescanned row deep-equals a fresh mint — no backfill read the old row`,
      { got: got.cities, want: want.cities });
  }
  const scan1 = summaryScan(store.getState());
  ok(scan1.phase === 'complete', `summaryScan is 'complete' after the pass (${scan1.phase})`);
  ok(storage.saveCount === 3, `the rescan wrote NO document (saveCount ${storage.saveCount}, all 3 from the seed)`);
  ok(storage.refreshCount === 3, `three summary-only refreshes (${storage.refreshCount})`);

  // The control: nothing is rescanned when the rows are already current.
  const s2 = memoryStorage();
  for (const d of docs) await s2.saveIfVersion(d.id, null, core.toJSON(d), core.tripSummary(d, core.COUNTRY_INDEX));
  const st2 = createStore({ ports: ports(s2) });
  await st2.refreshLibrary();
  ok(summaryScan(st2.getState()).phase === 'complete', 'a library already at 5 is `complete` on boot — D is not green by rescanning everything');
  const rc = s2.refreshCount;
  await st2.rescanSummaries();
  ok(s2.refreshCount === rc, `rescanSummaries is a no-op on a current library (${rc} → ${s2.refreshCount})`);

  // The third-reader claim: grep, over `packages/client/src`, done here rather than trusted.
  const files = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) files.push(p); } };
  walk(join(CAIRN, 'packages/client/src'));
  walk(join(CAIRN, 'apps/web/src'));
  const readers = files.filter((f) => /SUMMARY_VERSION/.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  ok(readers.length === 2, `exactly two readers of SUMMARY_VERSION outside core (${readers.length})`,
    readers.map((f) => f.replace(CAIRN + '/', '')));
  for (const f of readers) {
    const src = readFileSync(f, 'utf8');
    ok(/\(\w+\.summaryVersion \?\? 0\) < core\.SUMMARY_VERSION/.test(src) &&
       !/SUMMARY_VERSION\s*[=!<>]==?\s*\d|[<>]=?\s*[45]\b.*summaryVersion/.test(src),
      `${f.replace(CAIRN + '/', '')} compares generically and reads no literal`);
  }
}

// ===========================================================================
head('E. `travelStats` clamping, driven at every edge A-56 Part 7 clause 1 names');
// ===========================================================================
{
  const base = () => {
    const t = makeTrip('t-e', 'vienna', '2026-03-10', '2026-03-20');
    return core.tripSummary(t, core.COUNTRY_INDEX);
  };
  const withCity = (patch, rowPatch = {}) => {
    const r = JSON.parse(JSON.stringify(base()));
    Object.assign(r.cities[0], patch);
    Object.assign(r, rowPatch);
    return r;
  };
  const cityOf = (row, today = '2026-06-01') => core.travelStats([row], today).cities[0];

  ok(cityOf(withCity({ firstDay: '2026-03-12', lastDay: '2026-03-14' })).firstVisit === '2026-03-12',
    'in-range city dates pass through');
  const inside = cityOf(withCity({ firstDay: '2026-03-12', lastDay: '2026-03-14' }));
  ok(inside.lastVisit === '2026-03-14', 'in-range lastDay passes through');

  // null → trip range (clause 2).
  const n = cityOf(withCity({ firstDay: null, lastDay: null }));
  ok(n.firstVisit === '2026-03-10' && n.lastVisit === '2026-03-20',
    `null falls back to the TRIP's range (${n.firstVisit} → ${n.lastVisit})`);
  // absent key → same. This is the version-4 row the rescan has not reached.
  const v4 = withCity({});
  delete v4.cities[0].firstDay; delete v4.cities[0].lastDay; v4.summaryVersion = 4;
  const a = cityOf(v4);
  ok(a.firstVisit === '2026-03-10' && a.lastVisit === '2026-03-20',
    `an ABSENT key falls back the same way — a v4 row in the rescan window is safe (${a.firstVisit} → ${a.lastVisit})`);

  // Out of range, both directions.
  const lo = cityOf(withCity({ firstDay: '1999-01-01', lastDay: '2026-03-12' }));
  ok(lo.firstVisit === '2026-03-10', `a firstDay BEFORE the trip clamps up to startDate (${lo.firstVisit})`);
  const hi = cityOf(withCity({ firstDay: '2026-03-12', lastDay: '2099-01-01' }));
  ok(hi.lastVisit === '2026-03-20', `a lastDay AFTER the trip clamps down to endDate (${hi.lastVisit})`);
  const inv = cityOf(withCity({ firstDay: '2026-03-18', lastDay: '2026-03-12' }));
  ok(inv.firstVisit === '2026-03-18' && inv.lastVisit === '2026-03-18',
    `an INVERTED pair collapses rather than emitting last < first (${inv.firstVisit} → ${inv.lastVisit})`);
  // ---- RE-CUT at round 44, against A-60 as ruled. -------------------------------------
  // These two assertions used to pin A-56 clause 1's collapse — a range the clamp interval
  // does not intersect landing on whichever end of `[a, b]` it was clamped to. That IS R43-4,
  // which this section's own `note` described in those words, and **A-60 Part 2 supersedes
  // it**: a disjoint range takes clause 2's fallback to `[a, b]` instead. Left in place and
  // re-pointed rather than deleted, because the input is the same and only the ruled answer
  // moved — a reader comparing rounds should see which line changed and why.
  const both = cityOf(withCity({ firstDay: '1900-01-01', lastDay: '1900-02-01' }));
  ok(both.firstVisit === '2026-03-10' && both.lastVisit === '2026-03-20',
    `A-60: a range entirely OUTSIDE the trip takes the trip's own RANGE, not its edge (${both.firstVisit} → ${both.lastVisit})`);

  // The active-trip ceiling — R43-4's own shape, at the granularity that filed it.
  const act = withCity({ firstDay: '2026-03-25', lastDay: '2026-03-28' },
    { startDate: '2026-03-10', endDate: '2026-03-31' });
  const ac = cityOf(act, '2026-03-20');
  ok(ac.firstVisit === '2026-03-10' && ac.lastVisit === '2026-03-20',
    `A-60: a city the ACTIVE trip has not reached reports [a, b], not today (${ac.firstVisit} → ${ac.lastVisit})`);
  ok(ac.provisional === true, 'and it is still flagged provisional — A-34 is untouched');
  note('  ^ A-60 Part 2. The clamp is upheld everywhere the two intervals intersect; what moved');
  note('    is the disjoint case, which used to name a single day the traveller was NOT there.');
  // The edge the ruling explicitly keeps: touching at one day is intersecting, and that day is
  // evidence. A `<`/`<=` slip either side of it erases a real arrival day.
  const touchA = cityOf(withCity({ firstDay: '2026-03-05', lastDay: '2026-03-10' }));
  ok(touchA.firstVisit === '2026-03-10' && touchA.lastVisit === '2026-03-10',
    `a range touching [a, b] on ONE day keeps that day — it is evidence, not an artefact (${touchA.firstVisit} → ${touchA.lastVisit})`);
  const touchB = cityOf(withCity({ firstDay: '2026-03-20', lastDay: '2026-03-25' }));
  ok(touchB.firstVisit === '2026-03-20' && touchB.lastVisit === '2026-03-20',
    `and the same at the other end (${touchB.firstVisit} → ${touchB.lastVisit})`);

  // IsoDate domain: `inDomain` at both walls.
  const dom = cityOf(withCity({ firstDay: '0001-01-01', lastDay: '9999-12-31' },
    { startDate: '0001-01-01', endDate: '9999-12-31' }), '9999-12-31');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(dom.firstVisit) && /^\d{4}-\d{2}-\d{2}$/.test(dom.lastVisit),
    `both ends stay IsoDate-shaped at the domain walls (${dom.firstVisit} → ${dom.lastVisit})`);

  // The fold across two rows: earliest first, latest last, per (nameKey, country).
  const r1 = JSON.parse(JSON.stringify(base()));
  const r2 = JSON.parse(JSON.stringify(base()));
  r2.id = 't-e2'; r2.startDate = '2020-01-01'; r2.endDate = '2020-01-31';
  r1.cities[0].firstDay = '2026-03-12'; r1.cities[0].lastDay = '2026-03-14';
  r2.cities[0].firstDay = '2020-01-05'; r2.cities[0].lastDay = '2020-01-09';
  const folded = core.travelStats([r1, r2], '2026-06-01').cities[0];
  ok(folded.firstVisit === '2020-01-05' && folded.lastVisit === '2026-03-14',
    `the fold takes the earliest first and the latest last across rows (${folded.firstVisit} → ${folded.lastVisit})`);
  ok(folded.tripIds.length === 2, 'both trips are credited');
  // The fold's private bookkeeping must not leak onto the output type.
  ok(!('firstNum' in folded) && !('lastNum' in folded),
    'firstNum/lastNum are projected out and do not reach the output', Object.keys(folded));
  ok(JSON.stringify(Object.keys(folded).sort()) ===
     JSON.stringify(['countryCode', 'firstVisit', 'lastVisit', 'nameKey', 'name', 'provisional', 'tripIds'].sort()),
    'TravelStatsCity carries exactly seven keys', Object.keys(folded).sort());
}

// ===========================================================================
head('F. R43-2 — RE-CUT at round 44: the throw is a counted fallback (A-59 Parts 2 and 3)');
// ===========================================================================
// This section used to assert the defect it filed: four shapes of corrupt `cities[].firstDay`
// each throwing `invalid IsoDate` out of `travelStats`, and one of them taking the whole
// library down. **A-59 Part 2 removes exactly that**, so those five assertions cannot pass
// after the fix and re-running them unchanged measures nothing. They are re-cut here to the
// contract that replaced them — same four inputs, same blast-radius question, the ruled answer
// — and the old expectation is kept in the message so the two rounds stay comparable.
{
  const t = makeTrip('t-f', 'vienna', '2026-03-10', '2026-03-20');
  const good = core.tripSummary(t, core.COUNTRY_INDEX);
  const bad = (patch) => { const r = JSON.parse(JSON.stringify(good)); Object.assign(r.cities[0], patch); return r; };
  const stats = (row, today = '2026-06-01') => {
    try { return core.travelStats([row], today); } catch (e) { return { threw: e.message }; }
  };
  // A-59 Part 2's fallback is A-56 clause 2's: the trip's own range, `[2026-03-10, 2026-03-20]`.
  const absorbed = (label, patch) => {
    const s = stats(bad(patch));
    if (s.threw) return ok(false, `${label}: must NOT throw (A-59 Part 2)`, s.threw);
    const c = s.cities[0];
    ok(c.firstVisit === '2026-03-10' && c.lastVisit === '2026-03-20' && s.unreadableCityDates === 1,
      `${label} → the trip's range, counted once (${c.firstVisit} → ${c.lastVisit}, n=${s.unreadableCityDates})`,
      { span: [c.firstVisit, c.lastVisit], unreadableCityDates: s.unreadableCityDates });
  };
  absorbed('a malformed cities[].firstDay (was: THREW)', { firstDay: 'not-a-date' });
  absorbed('a near-miss cities[].lastDay "2026-3-1" (was: THREW)', { lastDay: '2026-3-1' });
  absorbed('a NUMBER in cities[].firstDay (was: THREW)', { firstDay: 12345 });
  absorbed('an OBJECT in cities[].firstDay (was: THREW)', { firstDay: {} });
  // A-59 Part 2 keeps the grandfathered throw on the row's OWN two dates, and says why: those
  // decide whether the row participates at all, and there is nothing to degrade to.
  const s = JSON.parse(JSON.stringify(good)); s.startDate = 'not-a-date';
  ok(stats(s).threw !== undefined,
    'A-37 Part 2 is NOT reversed: a malformed row.startDate still throws — it gates participation');
  // The blast radius question, asked again and answered the other way.
  const ref = core.tripSummary(loadRef(), core.COUNTRY_INDEX);
  note(`date strings read per row: 2 (startDate/endDate, still ungated) + ${2 * ref.cities.length} ` +
    `on the reference row (cities[], now gated by \`isIsoDate\`)`);
  const g2 = core.tripSummary(makeTrip('t-f2', 'tokyo', '2020-01-01', '2020-01-05'), core.COUNTRY_INDEX);
  const all = stats2([bad({ firstDay: 'x' }), g2]);
  ok(all.threw === undefined && all.cities.length === 2 && all.unreadableCityDates === 1,
    'ONE corrupt city date no longer takes the ENTIRE library down — both trips still report',
    all.threw ?? { cities: all.cities.length, n: all.unreadableCityDates });
  // The count is the difference between absorbing and swallowing (A-37 Part 5 residue 2).
  ok(stats(bad({ firstDay: 'x', lastDay: 'y' })).unreadableCityDates === 1,
    'both ends corrupt is ONE entry, counted once — A-59 Part 3 counts per entry, not per field');
  ok(stats(bad({ firstDay: null })).unreadableCityDates === 0,
    '`null` is a value and is NOT counted — the count means "a defect was absorbed", not "no days"');
  // And what the client does with it now: a read gate finally exists above core.
  const prof = readdirSync(join(CAIRN, 'apps/web/src/views')).filter((f) => /Profile/.test(f));
  const src = prof.map((f) => readFileSync(join(CAIRN, 'apps/web/src/views', f), 'utf8')).join('\n');
  ok(/travelHistory/.test(src),
    'Profile.tsx still reaches `travelStats` only through the `travelHistory` selector');
  note('A-59 Part 4 adds the gate this section said did not exist: `rowStatsReadable` reads all');
  note('2 + 2N date fields in packages/client, beside `rowDatesReadable`. §M drives it end to end.');
}
function stats2(rows, today = '2026-06-01') {
  try { return core.travelStats(rows, today); } catch (e) { return { threw: e.message }; }
}

// ===========================================================================
head('G. `TravelStatsCountry` — untouched, and country dates are still TRIP-range');
// ===========================================================================
{
  const src = readFileSync(join(CAIRN, 'packages/core/src/derive/travelStats.ts'), 'utf8');
  const ctry = src.slice(src.indexOf('export type TravelStatsCountry'), src.indexOf('export type TravelStatsCity'));
  ok(!/A-56/.test(ctry), 'no A-56 clause leaked onto TravelStatsCountry');
  ok(!/firstDay|lastDay/.test(ctry), 'no firstDay/lastDay leaked onto TravelStatsCountry');
  const diff = git('diff', PRE, AT, '--', 'cairn/packages/core/src/derive/travelStats.ts');
  const ctryTouched = /^[+-].*TravelStatsCountry/m.test(diff);
  ok(!ctryTouched, 'the TravelStatsCountry type declaration has a zero-line diff');
  // Behaviourally: a city inside a wider trip must NOT narrow the country's range.
  const t = makeTrip('t-g', 'vienna', '2026-03-10', '2026-03-20');
  const row = JSON.parse(JSON.stringify(core.tripSummary(t, core.COUNTRY_INDEX)));
  row.cities[0].firstDay = '2026-03-15'; row.cities[0].lastDay = '2026-03-16';
  const st = core.travelStats([row], '2026-06-01');
  ok(st.countries[0].firstVisit === '2026-03-10' && st.countries[0].lastVisit === '2026-03-20',
    `AT is still the TRIP's range (${st.countries[0].firstVisit} → ${st.countries[0].lastVisit}) while Vienna is 03-15 → 03-16`,
    { country: [st.countries[0].firstVisit, st.countries[0].lastVisit],
      city: [st.cities[0].firstVisit, st.cities[0].lastVisit] });
  ok(st.cities[0].firstVisit === '2026-03-15' && st.cities[0].lastVisit === '2026-03-16',
    'and the city is genuinely narrower — residue 1 is closed for cities and open for countries');
  ok(JSON.stringify(Object.keys(st.countries[0]).sort()) ===
     JSON.stringify(['code', 'firstVisit', 'lastVisit', 'provisional', 'tripIds'].sort()),
    'TravelStatsCountry carries exactly its five keys', Object.keys(st.countries[0]).sort());
}

// ===========================================================================
head('H. containment — `centre` in a golden, a CLI line, an export or a log');
// ===========================================================================
{
  const gdir = join(CAIRN, 'fixtures/golden');
  const hits = [];
  for (const f of readdirSync(gdir)) {
    const txt = readFileSync(join(gdir, f), 'utf8');
    if (/"centre"\s*:/.test(txt)) hits.push(f);
  }
  ok(hits.length === 0, 'no golden carries a `"centre":` key', hits);
  // travel-stats.json specifically: it changed. What did it gain?
  const ts = readFileSync(join(gdir, 'travel-stats.json'), 'utf8');
  ok(!/"lat"|"lng"/.test(ts), 'fixtures/golden/travel-stats.json carries no lat/lng');
  ok(/"firstVisit"/.test(ts) && /"summaryVersion": 5/.test(ts),
    'it gained firstVisit/lastVisit and summaryVersion 5 — dates, not coordinates');
  // CLI, run for real.
  const out = execFileSync('node', ['--experimental-strip-types', 'cli.ts', 'stats', '--today', TODAY],
    { cwd: CAIRN, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const floats = out.match(/-?\d+\.\d+/g) ?? [];
  ok(floats.length === 0, 'cli stats prints no decimal at all', floats.slice(0, 6));
  ok(!/-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}/.test(out), 'cli stats prints no coordinate-shaped float pair');
  ok(/Vienna\s+2026-08-08 → 2026-08-10/.test(out),
    'cli stats prints Vienna\'s hand-verified range', out.split('\n').filter((l) => /Vienna/.test(l)));
  note(out.split('\n').filter((l) => /→/.test(l)).slice(0, 8).join('\n        '));

  // R43-4 — the RENDERED face of A-56 Part 7 clause 1's clamp, mid-trip.
  const mid = execFileSync('node', ['--experimental-strip-types', 'cli.ts', 'stats', '--today', '2026-08-12'],
    { cwd: CAIRN, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const cityLines = mid.split('\n').filter((l) => /^\s{2}[A-Z]{2}\s{2}\S+\s+\d{4}-/.test(l) && /\s{2}\S+\s{2,}\d/.test(l));
  const unreached = mid.split('\n').filter((l) => /(Budapest|London|Prague)\s+2026-08-12 → 2026-08-12/.test(l));
  ok(unreached.length === 0,
    `FINDING R43-4: ${unreached.length} cities the traveller has NOT reached print TODAY as their visit range`,
    unreached.map((l) => l.trim()));
  ok(/·  in progress/.test(mid) && /in progress — from a trip you are on/.test(mid),
    'A-34\'s provisional marker and its legend are both printed beside them');
  const ctryLine = mid.split('\n').find((l) => /^\s+HU\s+2026-/.test(l));
  note(`the COUNTRY form for the same unreached place: "${(ctryLine ?? '').trim()}" — a trip-spanning`);
  note('range, not a point. The city form collapses to a single day, and that day is precisely');
  note('the one the traveller was NOT there. A-56 Part 7 clause 1 rules the clamp; the fallback');
  note('a country gets (the trip\'s own range) would print the same thing at both granularities.');
  void cityLines;
  // Every core-produced Issue/Conflict string, swept for a coordinate.
  const trip = loadRef();
  const strings = JSON.stringify(core.validateTrip(trip)) + JSON.stringify(core.detectConflicts(trip));
  ok(!/\d{1,3}\.\d{4}/.test(strings.replace(/"lat":[^,}]*|"lng":[^,}]*/g, '')),
    'no validate/conflict message carries a 4-decimal coordinate');
  // The export path: does a summary row reach a file the user gets?
  const cliSrc = readFileSync(join(CAIRN, 'cli.ts'), 'utf8');
  ok(!/tripSummary[\s\S]{0,200}writeFile/.test(cliSrc), 'cli export writes documents, not summary rows');
  // views.test.ts's ceiling: `.centre` is banned from every view.
  const views = readFileSync(join(CAIRN, 'test/views.test.ts'), 'utf8');
  ok(/'\.centre'|"\.centre"|`\.centre`/.test(views), 'test/views.test.ts bans `.centre` from the views');
}

// ===========================================================================
head('I. purity, determinism, aliasing');
// ===========================================================================
{
  const trip = loadRef();
  const snap = JSON.stringify(trip);
  const r1 = core.tripSummary(trip, core.COUNTRY_INDEX);
  const r2 = core.tripSummary(trip, core.COUNTRY_INDEX);
  ok(JSON.stringify(trip) === snap, 'tripSummary does not mutate its argument');
  ok(JSON.stringify(r1) === JSON.stringify(r2), 'tripSummary is deterministic across calls');
  // Row permutation must not change travelStats' output.
  const rows = [
    core.tripSummary(makeTrip('a', 'vienna', '2024-05-01', '2024-05-10'), core.COUNTRY_INDEX),
    core.tripSummary(makeTrip('b', 'tokyo', '2023-03-01', '2023-03-14'), core.COUNTRY_INDEX),
    core.tripSummary(makeTrip('c', 'split', '2022-01-01', '2022-01-05'), core.COUNTRY_INDEX),
  ];
  const s1 = JSON.stringify(core.travelStats(rows, TODAY));
  const s2 = JSON.stringify(core.travelStats([...rows].reverse(), TODAY));
  ok(s1 === s2, 'travelStats is order-independent');
  const rsnap = JSON.stringify(rows);
  core.travelStats(rows, TODAY);
  ok(JSON.stringify(rows) === rsnap, 'travelStats does not mutate its input array');

  // ALIASING: `centre: c.centre` is a REFERENCE copy. Is the row a value or a view?
  const t2 = loadRef();
  const row = core.tripSummary(t2, core.COUNTRY_INDEX);
  const aliased = row.cities[0].centre === t2.cities.find((c) => c.key === row.cities[0].key).centre;
  ok(!aliased,
    'FINDING R43-1: the row\'s `centre` is a COPY, not a reference into the live document', { aliased });
  if (aliased) {
    const beforeLat = t2.cities.find((c) => c.key === row.cities[0].key).centre.lat;
    row.cities[0].centre.lat = 0;
    const afterLat = t2.cities.find((c) => c.key === row.cities[0].key).centre.lat;
    console.log(`        writing to the ROW changed the DOCUMENT: ${beforeLat} -> ${afterLat}`);
    console.log('        `centre` is the first non-primitive on TripSummaryRow; every earlier');
    console.log('        field was a string, a number or a fresh array/object.');
  }
  // Every OTHER non-primitive on the row is freshly allocated. Measured, so the finding is
  // "centre is the exception", not "core does not copy".
  const t3 = loadRef();
  const r3 = core.tripSummary(t3, core.COUNTRY_INDEX);
  ok(r3.cities[0] !== t3.cities.find((c) => c.key === r3.cities[0].key),
    'the city ENTRY itself is a fresh object — only `centre` is shared');
  ok(r3.countryCodes !== t3.cities, 'countryCodes is a fresh array');

  // …and through the shipped store: does `state.library` alias `state.doc`?
  const st = memoryStorage();
  const doc = makeTrip('t-alias', 'vienna', '2026-05-01', '2026-05-05');
  await st.saveIfVersion(doc.id, null, core.toJSON(doc), core.tripSummary(doc, core.COUNTRY_INDEX));
  const store = createStore({ ports: ports(st) });
  await store.refreshLibrary();
  await store.openTrip('t-alias');
  const s = store.getState();
  const libCity = s.library.find((r) => r.id === 't-alias').cities[0];
  const docCity = s.doc.cities.find((c) => c.key === libCity.key);
  ok(libCity.centre !== docCity.centre,
    'through the shipped store, state.library[i].cities[j].centre is not the same object as state.doc\'s',
    { aliased: libCity.centre === docCity.centre });
  const stored = st.summaries.get('t-alias');
  ok(stored.cities[0].centre !== doc.cities[0].centre,
    'FINDING R43-1: the row HELD BY THE STORAGE PORT does not alias the document object it was minted from',
    { aliased: stored.cities[0].centre === doc.cities[0].centre });
  note('the browser port structured-clones, so this is scoped to `memoryStorage` (CLI + tests)');
  note('and to any future non-cloning host. Nothing mutates a City in place today.');
}

// ===========================================================================
head('J. real-data shapes');
// ===========================================================================
{
  // A zero-day trip (start === end).
  const z = core.tripSummary(makeTrip('t-z', 'vienna', '2026-04-01', '2026-04-01'), core.COUNTRY_INDEX);
  ok(z.cities[0].firstDay === null, 'a one-day trip whose day carries no city is null, not a crash', z.cities[0]);
  const zs = core.travelStats([z], '2026-06-01').cities[0];
  ok(zs.firstVisit === '2026-04-01' && zs.lastVisit === '2026-04-01', 'and it falls back to the single day');

  // A trip that ends before it starts.
  const bad = JSON.parse(JSON.stringify(z)); bad.endDate = '2026-03-01';
  const bs = core.travelStats([bad], '2026-06-01');
  ok(bs.cities[0].firstVisit === '2026-04-01' && bs.cities[0].lastVisit === '2026-04-01',
    `an inverted trip range collapses to its start (${bs.cities[0].firstVisit} → ${bs.cities[0].lastVisit})`);

  // The same trip imported twice under two ids — the "duplicate bookings from two emails" shape.
  const d1 = core.tripSummary(loadRef(), core.COUNTRY_INDEX);
  const d2 = JSON.parse(JSON.stringify(d1)); d2.id = 'trip-europe-2026-copy';
  const dup = core.travelStats([d1, d2], TODAY);
  const vien = dup.cities.find((c) => c.nameKey === 'vienna');
  ok(vien.tripIds.length === 2, 'two ids for the same trip credit two trips (correct — they are two rows)');
  ok(vien.firstVisit === '2026-08-08' && vien.lastVisit === '2026-08-10',
    `and the DATES do not double-count: still ${vien.firstVisit} → ${vien.lastVisit}`);
  ok(dup.daysTravelled === 16, `daysTravelled is the UNION, not the sum (${dup.daysTravelled})`);

  // A day in two cities — the Aug 10 / Aug 12 / Aug 15 / Aug 18 / Aug 21 shape.
  const ref = core.tripSummary(loadRef(), core.COUNTRY_INDEX);
  const shared = ref.cities.filter((c) => ref.cities.some((o) => o !== c &&
    c.firstDay <= o.lastDay && o.firstDay <= c.lastDay));
  ok(shared.length === 6, `all six cities share an edge day with a neighbour (${shared.length}) — residue 1, live`);

  // Days out of document order: A-56 says "document order", so this is contract, not defect.
  const t = makeTrip('t-u', 'vienna', '2026-05-01', '2026-05-05');
  let u = t;
  for (const d of u.days) u = core.setDayMeta(u, d.id, { primaryCity: 'vienna', cities: ['vienna'] },
    { ids: core.sequentialIds('u-'), now: TODAY });
  const rev = { ...u, days: [...u.days].reverse() };
  const rrow = core.tripSummary(rev, core.COUNTRY_INDEX);
  const inverted = rrow.cities[0].firstDay > rrow.cities[0].lastDay;
  note(`days reversed in the document: firstDay=${rrow.cities[0].firstDay} lastDay=${rrow.cities[0].lastDay}` +
    ` (${inverted ? 'INVERTED — document order, as A-56 Part 2 specifies' : 'still ordered'})`);
  const rs = core.travelStats([rrow], '2026-06-01').cities[0];
  ok(rs.firstVisit <= rs.lastVisit,
    `travelStats still emits first <= last from an inverted stored pair (${rs.firstVisit} → ${rs.lastVisit})`);
  ok(core.validateTrip(rev).some((i) => /day|order|date/i.test(i.message)) || !inverted,
    'validateTrip has something to say about an out-of-order day skeleton (so the row cannot be reached from a valid doc)',
    core.validateTrip(rev).map((i) => i.code).slice(0, 5));
}

// ===========================================================================
head('K. the narrowed float check in `qa/i7a-idb-rowkeys.mjs`, driven as a pure function');
// ===========================================================================
{
  // RE-CUT at round 44. This block held a HAND-TYPED copy of the pre-fix expression
  // (`JSON.stringify(persisted, (k, v) => k === 'centre' ? undefined : v)`), which the
  // R43-1/R43-3 fix-up at `28ed249` replaced with a PATH-keyed strip. The transcription went
  // stale the moment the fix landed, so this section kept reporting a closed finding as open.
  // It is re-cut against the shipped expression, and the transcription is now checked against
  // the file rather than trusted — a hand copy that cannot notice it has drifted is the defect
  // this section was written to find, one level up.
  const shipped = readFileSync(join(CAIRN, 'qa/i7a-idb-rowkeys.mjs'), 'utf8');
  ok(/const withoutCityCentres = result\.persisted\.map\(\(rec\) => \{/.test(shipped)
    && /if \(!Array\.isArray\(rec\.cities\)\) return rec;/.test(shipped)
    && /const \{ centre, \.\.\.rest \} = c;/.test(shipped),
    'the shipped strip is PATH-keyed (`cities[].centre`), which is what this transcription copies');
  ok(!/\(k, v\) => \(k === 'centre' \? undefined : v\)/.test(shipped),
    'and the NAME-keyed replacer R43-3 filed is gone from the file');
  /** The shipped `assertClean` float check, transcribed from the two assertions above. */
  const narrowed = (persisted) => {
    const withoutCityCentres = persisted.map((rec) => {
      if (!Array.isArray(rec.cities)) return rec;
      return { ...rec, cities: rec.cities.map((c) => {
        if (c === null || typeof c !== 'object' || !('centre' in c)) return c;
        const { centre, ...rest } = c; void centre; return rest;
      }) };
    });
    return (JSON.stringify(withoutCityCentres).match(/-?\d+\.\d+/g) ?? []);
  };
  const rec = (extra) => [{ id: 't1', cities: [{ key: 'k', centre: { lat: 43.17, lng: 16.44 } }], ...extra }];
  ok(narrowed(rec({})).length === 0, 'the narrowing still hides cities[].centre, as intended');
  ok(narrowed(rec({ dwellRadiusKm: 1.25 })).length === 1,
    'a float under ANY OTHER key still fails — the narrowing is not a blanket exemption');
  const elsewhere = narrowed(rec({ home: { centre: { lat: 1.5, lng: 2.5, accuracyM: 12.5 } } }));
  ok(elsewhere.length === 3,
    `R43-3 CLOSED: a float under a \`centre\` key OUTSIDE cities[] is caught again (saw ${elsewhere.length})`,
    { floats: elsewhere });
  const inside = narrowed([{ id: 't1', cities: [{ centre: { lat: 1, lng: 2, accuracyM: 9.5 } }] }]);
  ok(inside.length === 0,
    `a THIRD float INSIDE cities[].centre is still the bare-{lat,lng} shape assertion's job (${inside.length} seen here) — that division of labour is by design`,
    { floats: inside });
  note('The two halves now cover the same path and nothing else. R43-3 is fixed at 28ed249 and');
  note('this section is the evidence, re-cut rather than left asserting the old expression.');
}

// ===========================================================================
head('L. failure modes during the rescan the bump now triggers for every stored row');
// ===========================================================================
{
  // (1) A document that will not parse. A-56 Part 3 item 5: reported, never dropped.
  const st = memoryStorage();
  const good = makeTrip('t-ok', 'vienna', '2024-05-01', '2024-05-03');
  const bad = makeTrip('t-bad', 'tokyo', '2024-06-01', '2024-06-03');
  await st.saveIfVersion('t-ok', null, core.toJSON(good), versionFourRow(good));
  await st.saveIfVersion('t-bad', null, core.toJSON(bad), versionFourRow(bad));
  st.docs.set('t-bad', JSON.stringify({ schemaVersion: 99, id: 't-bad' }));
  const store = createStore({ ports: ports(st) });
  await store.refreshLibrary();
  await store.rescanSummaries();
  const scan = summaryScan(store.getState());
  ok(scan.unreadable.some((u) => u.id === 't-bad'),
    'an unreadable document is REPORTED, not dropped', scan.unreadable);
  ok(store.getState().library.some((r) => r.id === 't-bad'),
    'and its stale row is still in the library — the trip did not vanish');
  const okRow = (await st.listTrips()).find((r) => r.id === 't-ok');
  ok(okRow.summaryVersion === 5 && okRow.cities[0].centre,
    'the READABLE row beside it still reached 5 — one bad document does not stop the pass');
  ok(scan.phase !== 'complete',
    `the scan does not claim 'complete' while a row is below version (${scan.phase})`, scan.phase);
  // …and the library still renders: travelStats over a MIXED v4/v5 library must not throw.
  let threw = null;
  try { core.travelStats(store.getState().library, TODAY); } catch (e) { threw = e.message; }
  ok(threw === null, 'travelStats over a MIXED version-4 / version-5 library does not throw', threw);

  // (2) The storage port refuses the summary write.
  const st2 = memoryStorage();
  const d = makeTrip('t-rf', 'vienna', '2024-05-01', '2024-05-03');
  await st2.saveIfVersion('t-rf', null, core.toJSON(d), versionFourRow(d));
  const store2 = createStore({ ports: ports(st2) });
  await store2.refreshLibrary();
  st2.failNextRefresh = 'disk full';
  let boom = null;
  try { await store2.rescanSummaries(); } catch (e) { boom = e.message; }
  const after = await st2.listTrips();
  ok(after[0].summaryVersion === 4,
    'a refused refresh leaves the row at 4 rather than half-written', after[0].summaryVersion);
  ok(after[0].cities.every((c) => !('centre' in c)), 'and it carries no half-written centre');
  ok(summaryScan(store2.getState()).phase !== 'complete',
    `and the scan still says there is work to do (${summaryScan(store2.getState()).phase}${boom ? `; threw ${JSON.stringify(boom)}` : ''})`);
  // A document write must not have happened either (A-30).
  ok(st2.saveCount === 1, `no document was written by the failed rescan (saveCount ${st2.saveCount})`);

  // (3) A row whose document is missing entirely.
  const st3 = memoryStorage();
  const d3 = makeTrip('t-gone', 'vienna', '2024-05-01', '2024-05-03');
  await st3.saveIfVersion('t-gone', null, core.toJSON(d3), versionFourRow(d3));
  st3.docs.delete('t-gone');
  const store3 = createStore({ ports: ports(st3) });
  await store3.refreshLibrary();
  await store3.rescanSummaries();
  const s3 = summaryScan(store3.getState());
  ok(s3.phase !== 'complete' || s3.missing?.length > 0 || s3.unreadable.length > 0,
    `a row with no document is accounted for rather than silently claimed done (${s3.phase})`,
    { phase: s3.phase, missing: s3.missing, unreadable: s3.unreadable });
  ok(store3.getState().library.length === 1, 'and the row survives the pass');
}

// ===========================================================================
head('M. R43-2 — RE-CUT at round 44: the row is nameable, and the anonymity is measured, not assumed');
// ===========================================================================
// This section used to assert `res.rowId !== null` on a library `travelStats` refused. After
// A-59 Part 2 that library is no longer refused, so the assertion passed **vacuously** —
// `res` is the `ok: true` branch and `rowId` is `undefined`, which is `!== null`. A green line
// that can no longer measure what it was written to demand is worse than a red one, so the
// section is re-cut to demand the naming on a library that IS still refused, and to demand the
// non-refusal separately.
{
  const { travelHistory, rowLifecycle, rowDatesReadable, rowStatsReadable } =
    await import('../packages/client/src/selectors/index.ts');
  const good = core.tripSummary(makeTrip('t-m1', 'vienna', '2026-03-10', '2026-03-20'), core.COUNTRY_INDEX);
  const other = core.tripSummary(makeTrip('t-m2', 'tokyo', '2019-04-01', '2019-04-09'), core.COUNTRY_INDEX);
  const rot = JSON.parse(JSON.stringify(good));
  rot.cities[0].firstDay = 'not-a-date';

  // The three older gates still call this row healthy, exactly as round 43 measured — that part
  // of the finding was never about the gates being wrong, only about there being no fourth one.
  ok(rowLifecycle(rot, '2026-06-01') !== null, 'A-44 rowLifecycle: the row still classifies fine');
  ok(rowDatesReadable(rot) === true, 'A-46 rowDatesReadable: the row\'s own two dates are still readable');
  ok(!('summaryVersion' in rot) || rot.summaryVersion === 5, 'and it is stamped current, so no rescan will visit it');
  // …and the fourth gate now exists and is the one that sees it. That is A-59 Part 4's F-E.
  ok(rowStatsReadable(rot) === false,
    'A-59 F-E: `rowStatsReadable` is the gate that DOES see it — a fifth fact, not a fourth instance');

  // The library is no longer refused at all, which is the half of R43-2 A-59 Part 2 closed.
  const res = travelHistory({ library: [rot, other] }, '2026-06-01');
  ok(res.ok === true,
    `R43-2 half 1 CLOSED: one corrupt city date no longer refuses the whole library (ok=${res.ok})`, res);
  const st = core.travelStats([rot, other], '2026-06-01');
  ok(st.unreadableCityDates === 1 && st.cities.length === 2,
    'both trips still report, and the absorption is counted once',
    { n: st.unreadableCityDates, cities: st.cities.length });

  // The other half — the naming — measured on a library that IS still refused, so the assertion
  // cannot pass by the refusal having gone away.
  const stillBad = JSON.parse(JSON.stringify(good));
  stillBad.id = 't-m3'; stillBad.startDate = 'not-a-date';
  const named = travelHistory({ library: [other, stillBad] }, '2026-06-01');
  ok(named.ok === false, 'a malformed TRIP date still refuses — A-37 Part 2 is not reversed');
  ok(named.rowId === 't-m3',
    `R43-2 half 2 CLOSED: the refusal names the offending trip (rowId=${JSON.stringify(named.rowId)})`, named);
  ok(JSON.stringify(named.unreadableRows) === '["t-m3"]',
    'and `unreadableRows` lists it — the fact A-59 Part 4 records for the Trips-list treatment',
    named.unreadableRows);
  // Two suspects: the design degrades to null rather than picking one.
  const two = JSON.parse(JSON.stringify(stillBad)); two.id = 't-m4';
  const pair = travelHistory({ library: [stillBad, two] }, '2026-06-01');
  ok(pair.rowId === null && pair.unreadableRows.length === 2,
    'two suspects → `rowId` null and both listed: "one of these two" is not an attribution', pair);
  note('R43-2 is closed on both halves. What replaced it is measured in `qa/r44-a59.mjs` §D and');
  note('§E, including the version-1 row on which `rowStatsReadable` throws (R44-1).');
}

console.log(fails === 0 ? '\nALL OK' : `\n${fails} FAIL(S)`);
process.exit(fails === 0 ? 0 : 1);
