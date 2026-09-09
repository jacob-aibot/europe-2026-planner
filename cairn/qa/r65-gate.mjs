/**
 * QA round 65 — the adversarial pass over `e1e1973` + `I-26` (`ede933f`) as ONE subject:
 * *the read gate and the census after round 64*.
 *
 * Run from `cairn/`:  `node --experimental-strip-types qa/r65-gate.mjs`
 *
 * A-87 Part 7 states round 65's own falsification condition, and this probe is written to it:
 * the target is the **coverage claim**, not a sixth hostile shape of a field the table already
 * covers. So the sections below attack the table's DENOMINATORS, the reader's own read-once
 * discipline, the reachability premise the scope limit rests on, and the two behaviour changes
 * (the uniform null arm; lifecycle-blind absorption).
 *
 * A `FAIL` line is a finding; a `note` line is a recorded fact. The run ends with a `COMPLETE`
 * line — a run without one is INCOMPLETE and its counts may not be quoted. It writes nothing
 * outside memory and reads `fixtures/` and the repo's own source only.
 *
 *   A  the covering table's denominators vs. the record classes the reader actually reads
 *   B  the reader's own read count, per gated field, measured with counting accessors
 *   C  `readCensus`: an ABSENT number is reported as a defect, and a readable one is discarded
 *   D  the uniform null arm — which fields can a shipped write path put `null` on
 *   E  `absorbed`'s ordering and mutability
 *   F  reachability: can a storage port carry an accessor, or a non-plain object
 *   G  `rowStatsReadable`'s new cost, measured
 *   H  lifecycle blindness downstream — who consumes the two views
 *   I  `absorbed` rendered: `cli.ts`'s per-row line is unbounded
 *   J  the shape set stops at seven PLAIN shapes; structured clone carries five more kinds
 *   K  does `absorbed` carry any stored VALUE (a privacy question — §6.1)
 *   L  what widening `rowStatsReadable` IN PLACE cost the one caller it already had
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CAIRN = dirname(dirname(fileURLToPath(import.meta.url)));
const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);
const client = await import(pathToFileURL(join(CAIRN, 'packages/client/src/index.ts')).href);
const { loadEurope2026 } = await import(pathToFileURL(join(CAIRN, 'fixtures/loadEurope2026.mjs')).href);

let fails = 0;
const ok = (c, m, x) => { if (c) console.log(`  ok   ${m}`); else { fails++; console.log(`  FAIL ${m}${x === undefined ? '' : `  — ${x}`}`); } };
const note = (m) => console.log(`  note ${m}`);
const head = (s) => console.log(`\n== ${s}`);

const TODAY = '2026-09-09';
const { trip } = loadEurope2026(core);
const REF = core.tripSummary(trip, core.COUNTRY_INDEX);
const travelledRow = (over) => ({ ...REF, ...over });
const plannedRow = (over) => ({ ...REF, id: 'planned', startDate: '2027-01-01', endDate: '2027-01-10', ...over });
const attempt = (fn) => { try { return { threw: false, value: fn() }; } catch (e) { return { threw: true, err: e }; } };
const src = (p) => readFileSync(join(CAIRN, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

// ---------------------------------------------------------------------------
head('A  the covering table\'s denominators vs. the record classes the reader reads');
// A-87 Part 7: "the row axis is `ROW_KEYS` … and the city axis is its new sibling
// `Record<keyof TripSummaryCity, true>` … Both are exhaustive by type, so a field added to
// either record breaks the build until the table has a row for it."  Falsification condition
// (b) is "a stored record class reachable from the derive path that the table does not cover".
{
  const summary = src('packages/core/src/derive/summary.ts');
  const test = src('test/stats-storage.test.ts');
  // The record classes the reader descends into, read off the model rather than off the table.
  const censusDecl = /export type AttributionCensus = \{([\s\S]*?)\n\};/.exec(summary);
  const censusKeys = censusDecl
    ? [...censusDecl[1].matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1])
    : [];
  const attrDecl = /attribution: \{ ([^}]*)\};/.exec(summary);
  const attrKeys = attrDecl ? [...attrDecl[1].matchAll(/(\w+):/g)].map((m) => m[1]) : [];
  note(`the reader descends into 4 record classes: TripSummaryRow (15 keys), TripSummaryCity (7), ` +
    `the attribution container (${attrKeys.length}: ${attrKeys.join(', ')}), AttributionCensus (${censusKeys.length}: ${censusKeys.join(', ')})`);
  const axes = [...strip(test).matchAll(/Record<keyof (\w+), true>/g)].map((m) => m[1]);
  note(`compiler-maintained axes in the covering table: ${JSON.stringify(axes)}`);
  ok(axes.includes('AttributionCensus'),
    'A1  `AttributionCensus` — a stored record class the reader gates per key — has a compiler-maintained axis',
    `axes are ${JSON.stringify(axes)}; the reader gates \`located\` and \`attributed\` by name at ` +
    'derive/travelStats.ts:474-482 and emits `attribution.places.located` absorptions, but no ' +
    '`Record<keyof AttributionCensus, true>` denominates them, so a third census number is a HOLE the build does not catch');
  // Prove it is not academic: a third key on the census is invisible to the reader AND to the table.
  const withThird = travelledRow({ id: 'third', attribution: { places: { located: 1, attributed: 1, disputed: 'x' }, stops: REF.attribution.stops } });
  const t3 = attempt(() => core.travelStats([withThird], TODAY));
  note(`a census carrying a THIRD number (\`disputed: 'x'\`): travelStats ${t3.threw ? 'threw' : `returned, absorbed=${JSON.stringify(t3.value.absorbed)}`} — ungated, unreported, and no cell of the table names it`);
  ok(axes.includes('AttributionCensusContainer') || /Record<keyof TripSummaryRow\['attribution'\], true>/.test(test),
    'A2  the attribution CONTAINER (`{places, stops}`) has a compiler-maintained axis too',
    'it does not; `attribution` is one ROW_TABLE cell whose shape set never opens the container, ' +
    'so a third census class (`attribution.days`) is covered by nothing');
  // The row axis's own shape set never reaches the second level either.
  const shapeSet = /const SHAPES: Array<\[label: string, value: unknown\]> = \[([\s\S]*?)\];/.exec(test);
  note(`ROW_TABLE's \`attribution\` cell for "a plain object" is stated \`inert\`; every absorption the ` +
    `reader can make BELOW \`attribution\` (attribution, attribution.places, attribution.places.located, ` +
    `attribution.places.attributed, and the same four for \`stops\` = 7 distinct paths) is asserted in ` +
    `absorption.test.ts by example, not by any denominator`);
  const absorb = src('packages/core/test/absorption.test.ts');
  const censusPaths = new Set([...absorb.matchAll(/attribution\.(?:places|stops)(?:\.\w+)?/g)].map((m) => m[0]));
  note(`absorption.test.ts names ${censusPaths.size} of them: ${JSON.stringify([...censusPaths].sort())}`);
}

// ---------------------------------------------------------------------------
head('B  the reader\'s own read count, per gated field');
// A-87 Part 2: "reads each field it uses through a gate that is total over `unknown`, and reads
// it **exactly once**." BUILD-NOTES: '"Read exactly once" is structural, not counted.' Round 64
// §H's technique, one layer in: count the reads with accessors on the ENTRY, not on the row.
{
  const counted = (obj) => {
    const counts = {};
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      counts[k] = 0;
      Object.defineProperty(out, k, { enumerable: true, configurable: true, get() { counts[k]++; return v; } });
    }
    return { out, counts };
  };
  const healthyCity = { key: 'c1', name: 'Vienna', countryCode: 'AT', countrySource: 'coordinate', centre: { lat: 48.2, lng: 16.4 }, firstDay: '2026-08-08', lastDay: '2026-08-10' };
  const { out: city, counts } = counted(healthyCity);
  const row = travelledRow({ id: 'readcount', cities: [city] });
  core.travelStats([row], TODAY);
  note(`reads per CityInit-shaped stored entry: ${JSON.stringify(counts)}`);
  const over = Object.entries(counts).filter(([, n]) => n > 1);
  ok(over.length === 0,
    'B1  every gated field of a `cities[]` entry is read EXACTLY ONCE (A-87 Part 2)',
    `read more than once: ${JSON.stringify(Object.fromEntries(over))} — derive/travelStats.ts:547 tests ` +
    '`isUnreadableDay(c.firstDay) || isUnreadableDay(c.lastDay)` and derive/travelStats.ts:551-552 ' +
    'then re-reads `c.firstDay`/`c.lastDay` to build the gated entry. This is R64-1\'s class, ' +
    'inside the increment whose subject is the rule, and the fix is R64-1\'s own: bind the value once');
  // And it is observable, not merely structural: two reads that disagree.
  let n = 0;
  const flip = { key: 'c2', name: 'Vienna', countryCode: 'AT', countrySource: 'coordinate', centre: null,
    get firstDay() { n++; return n === 1 ? '2026-08-08' : 'not-a-date'; }, lastDay: null };
  const flipRow = travelledRow({ id: 'flip', cities: [flip] });
  const f = attempt(() => core.travelStats([flipRow], TODAY));
  note(`an entry whose \`firstDay\` yields a date on read 1 and garbage on read 2: ` +
    `${f.threw ? `THREW ${f.err.constructor.name}: ${f.err.message}` : `returned; absorbed=${JSON.stringify(f.value.absorbed)}; city=${JSON.stringify(f.value.cities[0])}`}`);
  // The row level, for completeness: `id`, `startDate`, `endDate` are read by the fold too.
  const rowCounts = {};
  const rowProxy = new Proxy({ ...REF, id: 'rowcount' }, {
    get(t, p) { if (typeof p === 'string') rowCounts[p] = (rowCounts[p] ?? 0) + 1; return t[p]; },
  });
  core.travelStats([rowProxy], TODAY);
  note(`reads per ROW: ${JSON.stringify(rowCounts)}`);
  const gatedRowFields = ['cities', 'countryCodes', 'attribution'];
  ok(gatedRowFields.every((k) => (rowCounts[k] ?? 0) === 1),
    'B2  every GATED row field is read exactly once',
    JSON.stringify(Object.fromEntries(gatedRowFields.map((k) => [k, rowCounts[k] ?? 0]))));
}

// ---------------------------------------------------------------------------
head('C  `readCensus` — the absent arm reports a defect, and discards a readable number');
// A-87 Part 2 arm 1: "absent or `null` → a *value*. The field's documented fallback applies and
// **nothing is counted**." Builder disclosure (a) says the two criteria force the census to be
// gated on PRESENCE OF BOTH numbers. Measured here against the rule it is an exception to.
{
  const cases = [
    ['{places:{}} — both numbers absent (the criterion\'s own case)', { places: {}, stops: REF.attribution.stops }],
    ['{places:{located:5}} — `attributed` ABSENT, `located` perfectly readable', { places: { located: 5 }, stops: REF.attribution.stops }],
    ['{places:{located:5,attributed:null}} — `attributed` NULL', { places: { located: 5, attributed: null }, stops: REF.attribution.stops }],
    ['{places:{located:5,attributed:0}} — the control', { places: { located: 5, attributed: 0 }, stops: REF.attribution.stops }],
    ['{places:{located:\'5\',attributed:0}} — present-and-wrong (the criterion\'s other case)', { places: { located: '5', attributed: 0 }, stops: REF.attribution.stops }],
  ];
  for (const [label, attribution] of cases) {
    const s = core.travelStats([travelledRow({ id: 'c', attribution })], TODAY);
    note(`${label} → absorbed=${JSON.stringify(s.absorbed.map((a) => `${a.path}/${a.kind}`))}, located.places=${s.located.places}, seen.places=${s.seen.places}`);
  }
  const absentPair = core.travelStats([travelledRow({ id: 'c', attribution: { places: { located: 5 }, stops: REF.attribution.stops } })], TODAY);
  ok(absentPair.absorbed.length === 0,
    'C1  an ABSENT `attributed` is a VALUE and is counted by nothing (A-87 Part 2 arm 1, uniform)',
    `it absorbs at ${JSON.stringify(absentPair.absorbed.map((a) => a.path))} — derive/travelStats.ts:474 ` +
    'treats absent/`null` on EITHER number as a census-level defect, which is arm 1 inverted for this one record class');
  ok(absentPair.located.places === 5,
    'C2  …and the readable `located: 5` beside it survives',
    `located.places reads ${absentPair.located.places}; the readable observation is deleted because its ` +
    'neighbour is absent — the move A-60 Part 6.2 refused one record over ("absent evidence does not ' +
    'poison its pair"). A gate of "a plain object carrying at least one declared number" satisfies BOTH ' +
    'I-26 criteria and neither of these two failures');
}

// ---------------------------------------------------------------------------
head('D  the uniform null arm — which fields can a shipped write path put `null` on');
// Disclosure 1. A-87 Part 3 rule 5's residue: "a `null` on a field no generation ever wrote
// `null` to is absorbed and reported by nothing. **Trigger:** a measurement that a shipped write
// path can produce it — at which point it is a write-side defect, not a read gate."
{
  const summary = src('packages/core/src/derive/summary.ts');
  const ledger = [...summary.matchAll(/^\s*\*\s*-\s*\*\*(\d+)\*\*\s*—\s*([^\n]*)/gm)].map((m) => `${m[1]}: ${m[2].slice(0, 90)}`);
  note(`SUMMARY_VERSION ledger, from the model file:\n${ledger.map((l) => `        ${l}`).join('\n')}`);
  // What does the only write path actually write?
  const minted = core.tripSummary(trip, core.COUNTRY_INDEX);
  const nullable = Object.entries(minted).filter(([, v]) => v === null || v === undefined).map(([k]) => k);
  note(`\`tripSummary\` — the ONLY minting path — writes null/undefined at top level for: ${JSON.stringify(nullable)} (none)`);
  ok(nullable.length === 0, 'D1  no top-level row field is written `null` by the shipped write path', JSON.stringify(nullable));
  // So for `countryCodes` the value arm has an empty population, and the observable cost is:
  const wasThrow = travelledRow({ id: 'nulled', countryCodes: null });
  const s = core.travelStats([wasThrow], TODAY);
  ok(s.absorbed.length > 0,
    'D2  `countryCodes: null` — a shape NO generation and NO write path produces — is reported',
    `absorbed=${JSON.stringify(s.absorbed)}, countries=${s.countries.length} (the row\'s ${REF.countryCodes.length} ` +
    'stored codes vanish from the lifetime map), rowStatsReadable=' + client.rowStatsReadable(wasThrow) +
    '. The trigger A-87 Part 3 rule 5 writes for this residue ("a shipped write path can produce it") ' +
    'can never fire, because a write path producing it is exactly what would make it a VALUE; the ' +
    'measurement that matters is the opposite one, and it is above: no generation of the row ever ' +
    'omitted `countryCodes` either, so the arm has no population to protect');
  // The `cities` control: version 1 genuinely had no `cities` key, which is the arm's real population.
  note(`the control, one field over: \`cities\` arrived at SUMMARY_VERSION 2, so a version-1 row ` +
    `legitimately carries no key — that population exists, and it is what makes the uniform arm right THERE`);
}

// ---------------------------------------------------------------------------
head('E  `absorbed`\'s ordering and mutability');
{
  const a = travelledRow({ id: 'zzz', startDate: '2026-01-01', endDate: '2026-01-05', cities: 'nope' });
  const b = travelledRow({ id: 'aaa', startDate: '2026-03-01', endDate: '2026-03-05', countryCodes: 42 });
  const fwd = core.travelStats([a, b], TODAY).absorbed;
  const rev = core.travelStats([b, a], TODAY).absorbed;
  ok(JSON.stringify(fwd) === JSON.stringify(rev),
    'E1  `absorbed` is in CANONICAL row order, not caller order', `${JSON.stringify(fwd)} vs ${JSON.stringify(rev)}`);
  const s = core.travelStats([a], TODAY);
  const before = s.absorbed.length;
  const mutated = attempt(() => { s.absorbed.push({ rowId: 'x', path: 'y', kind: 'list' }); });
  ok(mutated.threw || s.absorbed.length === before,
    'E2  a caller cannot mutate the `absorbed` list a derivation handed it',
    `pushed; length ${before} → ${s.absorbed.length}. \`readonly\` is erased at runtime and nothing freezes it; ` +
    'the same is true of `countries`, `cities` and `tripIds`, so this is pre-existing rather than new');
}

// ---------------------------------------------------------------------------
head('F  reachability — can a storage port carry an accessor, or a non-plain object');
// A-87 Part 7's scope limit: "It is not reachable: storage returns plain data from structured
// clone or `JSON.parse`, neither of which can carry an accessor." Tested rather than accepted.
{
  const withGetter = { a: 1 };
  Object.defineProperty(withGetter, 'boom', { enumerable: true, get() { throw new Error('accessor ran'); } });
  const jsonKilled = attempt(() => JSON.parse(JSON.stringify({ x: 1 })));
  note(`JSON round trip of an object with a throwing getter: ${attempt(() => JSON.stringify(withGetter)).threw ? 'the STRINGIFY throws' : 'survives'} — an accessor cannot cross \`JSON.parse\``);
  const cloned = attempt(() => structuredClone({ get x() { return 1; } }));
  note(`structuredClone of an object with a getter: ${cloned.threw ? `threw ${cloned.err.name}` : `returned ${JSON.stringify(cloned.value)} — the getter is EVALUATED and the result is a plain data property`}`);
  const proxyClone = attempt(() => structuredClone(new Proxy({ a: 1 }, {})));
  note(`structuredClone of a Proxy: ${proxyClone.threw ? `threw ${proxyClone.err.name}` : 'returned a plain object'}`);
  // The premise is about STORAGE. Does the shipped in-memory port round-trip, or alias?
  const ports = await import(pathToFileURL(join(CAIRN, 'packages/client/src/ports/memory.ts')).href);
  const memSrc = src('packages/client/src/ports/memory.ts');
  note(`\`memoryStorage\` (the port the CLI and every test use) does ${/structuredClone|JSON\.parse/.test(memSrc) ? '' : 'NOT '}` +
    `convert what it is handed — it aliases the caller's object, so the premise "storage returns plain data" ` +
    `is a property of what the WRITER wrote (\`tripSummary\`), not of this port. Recorded, not asserted: no ` +
    `shipped writer produces an accessor, so the accessor half of A-87 Part 7's scope limit HOLDS`);
  // …and the non-accessor half of the premise: structured clone carries things that are NOT plain.
  const exotic = [
    ['a Date as `centre`', { centre: new Date() }],
    ['a Map as `attribution`', new Map()],
    ['a Set as `cities`', new Set(['Vienna'])],
    ['a RegExp as `countryCodes`', /AT/],
    ['a BigInt as `placeCount`', 10n],
  ];
  for (const [label, v] of exotic) {
    const c = attempt(() => structuredClone(v));
    note(`structuredClone(${label}): ${c.threw ? `threw ${c.err.name}` : 'SURVIVES — a non-plain object out of storage'}`);
  }
  const dateCentre = travelledRow({ id: 'dt', cities: [{ ...REF.cities[0], centre: new Date() }] });
  const mapAttr = travelledRow({ id: 'mp', attribution: new Map([['places', { located: 1, attributed: 1 }]]) });
  const setCities = travelledRow({ id: 'st', cities: new Set(['Vienna']) });
  for (const [label, r] of [['Date centre', dateCentre], ['Map attribution', mapAttr], ['Set cities', setCities]]) {
    const t = attempt(() => core.travelStats([r], TODAY));
    note(`${label} (structured-clone-reachable, NOT plain): ${t.threw ? `THREW ${t.err.constructor.name}` : `returned, absorbed=${JSON.stringify(t.value.absorbed.map((x) => `${x.path}/${x.kind}`))}`}`);
  }
  const mapStats = attempt(() => core.travelStats([mapAttr], TODAY));
  ok(!mapStats.threw && mapStats.value.absorbed.length > 0,
    'F2  a `Map` as `attribution` — plain-old structured-clone data — is reported as a defect',
    mapStats.threw ? 'threw' : `absorbed=${JSON.stringify(mapStats.value.absorbed)}; \`isPlainObject\` admits it ` +
    '(typeof "object", not null, not an Array), so `attribution.places` reads `undefined` and the whole ' +
    'census is silently absent — the exact silent-vanish shape the ruling closed for `countryCodes: "AT"`');
}

// ---------------------------------------------------------------------------
head('G  `rowStatsReadable`\'s new cost, measured');
// A-87 Part 10 residue 3, and the builder's non-blocking objection to its stated remedy.
{
  const lib = [];
  for (let i = 0; i < 40; i++) lib.push({ ...REF, id: `row-${i}`, startDate: `2026-0${(i % 9) + 1}-01`, endDate: `2026-0${(i % 9) + 1}-05` });
  const timeIt = (fn, n) => { const t0 = process.hrtime.bigint(); for (let i = 0; i < n; i++) fn(); return Number(process.hrtime.bigint() - t0) / 1e6 / n; };
  const one = timeIt(() => client.rowStatsReadable(lib[0]), 200);
  const whole = timeIt(() => core.travelStats(lib, TODAY), 200);
  const listPass = timeIt(() => lib.map((r) => client.rowStatsReadable(r)), 20);
  note(`one \`rowStatsReadable\` over a 6-city reference row: ${one.toFixed(3)} ms`);
  note(`one whole-library \`travelStats\` over 40 such rows: ${whole.toFixed(3)} ms`);
  note(`a Trips list of 40 rows, one call per row: ${listPass.toFixed(3)} ms — ${(listPass / whole).toFixed(1)}x the cost of deriving the WHOLE library's statistics once`);
  ok(listPass < whole,
    'G1  asking "is this row readable" 40 times costs less than deriving the whole library once',
    `${listPass.toFixed(3)} ms vs ${whole.toFixed(3)} ms. A-87 Part 10 residue 3's stated remedy is ` +
    '"memoised in the selector layer"; the call is per row with a different argument each time, so a ' +
    'memo on (row, startDate) caches 40 distinct entries and saves nothing on first paint. The builder\'s ' +
    'recorded answer — an `absorbed`-only variant — is the one that reaches the cost');
  // travelHistory's failure branch pays it too, once per row.
  const bad = [...lib.slice(0, 39), { ...REF, id: 'bad', startDate: 'nope', endDate: 'nope' }];
  const hist = timeIt(() => client.travelHistory({ library: bad }, TODAY), 20);
  note(`\`travelHistory\` on the FAILURE branch over 40 rows (one bad): ${hist.toFixed(3)} ms — the catch calls \`rowStatsReadable\` per row`);
}

// ---------------------------------------------------------------------------
head('H  lifecycle blindness downstream — who consumes the two views');
{
  const travelledCorrupt = travelledRow({ id: 't', cities: 'nope' });
  const plannedCorrupt = plannedRow({ id: 'p', cities: 'nope' });
  const s = core.travelStats([travelledCorrupt, plannedCorrupt], TODAY);
  ok(s.unreadableCityLists === 2, 'H1  a travelled and a planned corrupt row count 2 (A-87 Part 5, R64-3 §C3)', String(s.unreadableCityLists));
  ok(client.rowStatsReadable(plannedCorrupt) === false, 'H2  the planned row is `rowStatsReadable` false', 'true');
  const healthyPlanned = plannedRow({ id: 'hp' });
  const hp = core.travelStats([healthyPlanned], TODAY);
  ok(hp.seen.cities === 0 && hp.countries.length === 0 && hp.unnamedCities === 0,
    'H3  a HEALTHY planned row still contributes nothing to any travel count',
    JSON.stringify({ seen: hp.seen, countries: hp.countries.length, unnamedCities: hp.unnamedCities }));
  // Consumers of the two views, found rather than reasoned about.
  const { execSync } = await import('node:child_process');
  const grep = (pat) => execSync(`grep -rn --include=*.ts --include=*.tsx --include=*.mjs '${pat}' packages apps cli.ts test qa 2>/dev/null || true`, { cwd: CAIRN, encoding: 'utf8' }).trim();
  const consumers = grep('unreadableCityLists\\|unreadableCityDates').split('\n').filter(Boolean)
    .filter((l) => !/^(packages\/core\/src\/derive\/travelStats\.ts|test\/|packages\/\w+\/test\/|qa\/)/.test(l));
  note(`non-test consumers of the two views:\n${consumers.map((l) => `        ${l.slice(0, 150)}`).join('\n') || '        (none outside cli.ts)'}`);
  const cliTxt = src('cli.ts');
  ok(!/travelled|completed|active/.test(/trips whose stored city list[^\n]*/.exec(cliTxt)?.[0] ?? ''),
    'H4  `cli.ts`\'s two sentences do not claim a travelled-only population',
    'one of them does — the sentence would be false for the widened population');
}

// ---------------------------------------------------------------------------
head('I  `absorbed` rendered — `cli.ts`\'s per-row line is unbounded');
// A-87 Part 10 residue 1: "**Trigger:** the first surface that renders the LIST rather than a
// count — that surface caps its own display and says it is capping."
{
  const many = travelledRow({ id: 'many', cities: Array.from({ length: 200 }, (_, i) => ({ key: `k${i}`, name: i, countryCode: 'AT', countrySource: 'stated', centre: null, firstDay: null, lastDay: null })) });
  const s = core.travelStats([many], TODAY);
  const byRow = new Map();
  for (const a of s.absorbed) {
    const p = byRow.get(a.rowId);
    if (!p) byRow.set(a.rowId, [a.path]); else if (!p.includes(a.path)) p.push(a.path);
  }
  const line = `  trip many: unreadable stored values at ${byRow.get('many').join(', ')}`;
  note(`a row with 200 unreadable city names produces ${s.absorbed.length} absorptions and ONE cli line of ${line.length} characters`);
  const cliTxt = strip(src('cli.ts'));
  const block = /for \(const \[rowId, paths\] of byRow\)[\s\S]{0,200}/.exec(cliTxt)?.[0] ?? '';
  ok(/slice|Math\.min|cap|\.\.\./.test(block),
    'I1  `cli.ts` caps the rendered path list and says it is capping (A-87 Part 10 residue 1)',
    `it renders every path: ${JSON.stringify(block.replace(/\s+/g, ' ').slice(0, 120))}. The residue's ` +
    'trigger — "the first surface that renders the list rather than a count" — fired in THIS increment, ' +
    'on the surface the increment added, and the cap it names was not applied');
}

// ---------------------------------------------------------------------------
head('J  the shape set stops at seven PLAIN shapes; structured clone carries five more kinds');
// A-87 Part 7's shape set is `undefined | null | number | string | plain object | array |
// boolean` (+ a non-object entry for the two containers). The gates that decide "is this the
// declared shape" are `isPlainObject` (`typeof === 'object' && !== null && !Array.isArray`) and,
// for a city entry, `entry !== null && typeof entry === 'object'`. Both admit every exotic
// object a structured clone can carry — which is the SAME population (hand-edited storage) the
// whole ruling is about, and none of these shapes has a cell.
{
  const exotics = [
    ['a Date', () => new Date('2026-01-01')],
    ['a Map', () => new Map([['located', 5]])],
    ['a Set', () => new Set([1])],
    ['a RegExp', () => /x/],
    ['an Error', () => new Error('x')],
  ];
  let silent = 0;
  for (const [label, mk] of exotics) {
    const attr = core.travelStats([travelledRow({ id: 'x', attribution: mk() })], TODAY);
    const places = core.travelStats([travelledRow({ id: 'x', attribution: { places: mk(), stops: REF.attribution.stops } })], TODAY);
    const entry = core.travelStats([travelledRow({ id: 'x', cities: [mk()] })], TODAY);
    const line = `attribution=${JSON.stringify(attr.absorbed.map((a) => a.path))} located.places=${attr.located.places} · ` +
      `attribution.places=${JSON.stringify(places.absorbed.map((a) => a.path))} · ` +
      `cities[0]=${JSON.stringify(entry.absorbed.map((a) => a.path))} seen.cities=${entry.seen.cities} unnamed=${entry.unnamedCities}`;
    note(`${label}: ${line}`);
    if (attr.absorbed.length === 0) silent++;
  }
  ok(silent === 0,
    'J1  a stored `attribution` that is present and is not a census is REPORTED, whatever kind of object it is',
    `${silent} of ${exotics.length} exotic objects are read as "this row carries no census", silently — ` +
    '`isPlainObject` (derive/travelStats.ts:420) asks `typeof === "object" && !null && !Array` and nothing ' +
    'more, so every structured-clone-reachable object kind is admitted as a census and then reads empty. ' +
    'This is A-87 Part 1 shape 4\'s QUIET half, one field over and still open. Per A-87 Part 7 this is a ' +
    'builder finding against the table\'s shape set, not against the ruling');
  note('and the two levels disagree about the SAME object kind: `attribution: <Date>` is a value ' +
    '(silent), `attribution.places: <Date>` is a defect (absorbed) — one convention at one level and ' +
    'another at the level below it, inside one record, which is what A-86 Part 1 reason 3 refuses');
  const errEntry = core.travelStats([travelledRow({ id: 'x', cities: [new Error('boom')] })], TODAY);
  note(`a \`cities[]\` entry that is an Error: \`Error.prototype.name\` is the string "Error", so the ` +
    `lifetime map gains a city called ${JSON.stringify(errEntry.cities.map((c) => c.name))} — absorbed=${JSON.stringify(errEntry.absorbed)}`);
  const dateEntry = core.travelStats([travelledRow({ id: 'x', cities: [new Date()] })], TODAY);
  ok(dateEntry.absorbed.length > 0,
    'J2  a `cities[]` entry that is a Date is reported as an unreadable entry',
    `absorbed=[], seen.cities=${dateEntry.seen.cities}, unnamedCities=${dateEntry.unnamedCities} — the entry ` +
    'gate is `typeof entry === "object"` (derive/travelStats.ts:517), so a Date counts as a city record with ' +
    'every field absent: it inflates `seen.cities`, increments `unnamedCities`, and absorbs nothing');
}

// ---------------------------------------------------------------------------
head('K  the channel and the sensitive paths — does `absorbed` carry any stored VALUE');
// §6.1: a coordinate and a mailbox are data that must not leak. `absorbed` is printed by
// `cli.ts` and is destined for a rendered surface, so what it carries is a privacy question.
{
  const row = travelledRow({ id: 'trip-1', cities: [{ key: 'k', name: 42, countryCode: 'zz', countrySource: 'stated', centre: { lat: 48.2082, lng: 16.3738, secret: 'x' }, firstDay: 'nope', lastDay: null }] });
  const s = core.travelStats([row], TODAY);
  const blob = JSON.stringify(s.absorbed);
  note(`absorbed for a row with a hostile entry: ${blob}`);
  ok(!/48\.2082|16\.3738|zz|secret/.test(blob) && Object.keys(s.absorbed[0]).sort().join(',') === 'kind,path,rowId',
    'K1  `absorbed` carries a row id, a path and a level — never the stored VALUE',
    blob);
}

// ---------------------------------------------------------------------------
head('L  what widening `rowStatsReadable` IN PLACE cost the one caller it already had');
// A-87 Part 6 widens the predicate. Its only production caller is `travelHistory`'s catch
// branch, where A-59 Part 4 uses it for ATTRIBUTION: "when `rowStatsReadable` finds **exactly
// one** suspect row in the library, that row is named. Two or more stays `null`." Widening the
// predicate widens the suspect set — over rows whose fault this ruling made NON-fatal.
{
  const bad = travelledRow({ id: 'the-broken-one', startDate: 'not-a-date' });
  const absorbedOnly = travelledRow({ id: 'merely-absorbed', cities: REF.cities.map((c, i) => (i === 0 ? { ...c, countryCode: 'at' } : c)) });
  const alone = client.travelHistory({ library: [bad] }, TODAY);
  const withHealthy = client.travelHistory({ library: [bad, travelledRow({ id: 'healthy' })] }, TODAY);
  const withAbsorbed = client.travelHistory({ library: [bad, absorbedOnly] }, TODAY);
  note(`the bad-date row alone            → rowId=${JSON.stringify(alone.rowId)} unreadableRows=${JSON.stringify(alone.unreadableRows)}`);
  note(`+ a healthy row                   → rowId=${JSON.stringify(withHealthy.rowId)} unreadableRows=${JSON.stringify(withHealthy.unreadableRows)}`);
  note(`+ a row whose ONLY fault is absorbed (\`cities[0].countryCode: 'at'\` — non-fatal by this very ruling)`);
  note(`                                  → rowId=${JSON.stringify(withAbsorbed.rowId)} unreadableRows=${JSON.stringify(withAbsorbed.unreadableRows)}`);
  note(`measured at e1e1973, the same three libraries give rowId="the-broken-one" every time, because ` +
    `\`rowStatsReadable(merely-absorbed)\` was TRUE there and is FALSE here (A-87 Part 6's own "six shapes it called healthy at e1e1973")`);
  ok(withAbsorbed.rowId === 'the-broken-one',
    'L1  the row that actually took the library down is still NAMED when another row merely absorbs',
    `rowId=${JSON.stringify(withAbsorbed.rowId)}. A-59 Part 4's named-row arm — the one A-46 Part 5 said ` +
    'should become reachable when `travelStats`\' refusal set changed — goes DARK, and `WorldMap.tsx`\'s ' +
    'banner falls back to "one of these two" for a failure only one of them caused. The suspect set is ' +
    'computed from the WIDENED predicate while the refusal it is attributing is still the narrow one ' +
    '(a malformed trip date). Absorbed rows are non-fatal BY THIS RULING and are not suspects for this throw');
  ok(withAbsorbed.unreadableRows.length === 1,
    'L2  …and the suspect list holds only rows that could have caused THIS refusal',
    `unreadableRows=${JSON.stringify(withAbsorbed.unreadableRows)} — it now mixes "this row broke the ` +
    'derivation" with "this row has an absorbed value", which are the two populations A-87 Part 4 exists ' +
    'to keep apart');
}

console.log(`\nCOMPLETE — ${fails} FAIL`);
process.exit(0);
