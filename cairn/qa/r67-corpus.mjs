/**
 * QA round 67 — the adversarial pass over `I-23` (`ff0ecdd`), the GeoNames corpus swap.
 *
 * Every section says what it attacks and whether a user could meet what it finds. A `FAIL` line is
 * a finding; a `note` line is a measured fact the write-up rests on. Nothing here writes to the
 * repo: it reads `packages/core/src/geo/gazetteer/*.json`, the three goldens and the repo's own
 * source, and builds every fixture in memory.
 *
 *   node qa/r67-corpus.mjs            (from cairn/)
 *   node qa/r67-corpus.mjs A C E      only those sections
 *
 *  A  KD-118 over the WHOLE query space — every prefix of every token of every shipped row
 *  B  what the shard rule costs a user who types the name in full
 *  C  KD-119 — the six named outcomes, and what a MODAL parent does to a straddling code
 *  D  KD-120 — the codeless population, read off the artefacts
 *  E  `indexSays` three-valued, re-derived against the shipped COUNTRY_INDEX (R61's defect class)
 *  F  the `{0,0}` ceiling and the coordinate range, over the new corpus
 *  G  ranking totality and the shard-vs-corpus equality
 *  H  the fold: distinct from `normalizeCityName`, and verified without being shipped
 *  I  the CC BY 4.0 attribution — the source-level half, every path that can carry it
 *  J  reproducibility: can the generator produce a different corpus from the same declared inputs?
 *  K  the bytes, re-derived from disk
 *  J  reproducibility: can the generator produce a different corpus from the same declared inputs?
 *  L  the decoder under a hostile document, and the standing constraints
 *  M  what class of row ships — the multi-country landmasses
 *  N  the okina family: the corpus's punctuation against the fold's substitution table
 *  P  the sensitive-path check, and the shard key as an attacker-controlled string
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CAIRN = dirname(dirname(fileURLToPath(import.meta.url)));
const C = await import('./corpus.mjs');
const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);

let fails = 0;
const ok = (c, m, x) => { if (c) console.log(`  ok   ${m}`); else { fails++; console.log(`  FAIL ${m}${x === undefined ? '' : `  — ${x}`}`); } };
const note = (m) => console.log(`  note ${m}`);
const head = (s) => console.log(`\n== ${s}`);
const want = process.argv.slice(2).filter((a) => /^[A-Z]$/.test(a));
const run = (s) => want.length === 0 || want.includes(s);
const golden = (f) => JSON.parse(readFileSync(join(CAIRN, 'fixtures/golden', f), 'utf8'));

const meta = C.meta();
const raw = C.rawMeta();
const { gazetteer: WHOLE, emitted } = C.wholeCorpus();
const byId = new Map(WHOLE.rows.map((r) => [r.id, r]));
note(`corpus: ${WHOLE.rows.length} rows, ${emitted} emitted, ${meta.splits.length} split prefixes`);

// ---------------------------------------------------------------------------------------------
if (run('A')) {
  head('A  KD-118 — is there ANY query that resolves to a shard which cannot contain its answer?');

  // Shard membership, straight off disk. `ids.get(key)` is the set of row ids in that document.
  const ids = new Map();
  let keyless = 0;
  for (const { raw: doc, gazetteer } of C.eachShard()) {
    if (typeof doc.k !== 'string') keyless += 1;
    ids.set(doc.k, new Set(gazetteer.rows.map((r) => r.id)));
  }
  ok(keyless === 0, `A0  every shard document names its own key (${ids.size} documents)`, String(keyless));
  ok(ids.size === Object.keys(raw.files).length, `A1  every shard file is named by the manifest (${ids.size})`);

  // The rule under test, stated as the loader states it:
  //   a one-token query resolves to null when the token is <2 chars OR is a split prefix;
  //   otherwise it resolves to shardKeyFor(token);
  //   a multi-token query resolves to shardKeyFor(firstToken) — terminal `<p>$` included.
  const splits = new Set(meta.splits);
  const resolve1 = (t) => (t.length < 2 || splits.has(t) ? null : C.shardKeyFor(t, meta.splits));
  const resolveN = (t) => (t.length < 2 ? null : C.shardKeyFor(t, meta.splits));

  let checked = 0;
  const holes = [];
  const nulls = { short: 0, split: 0 };
  for (const row of WHOLE.rows) {
    const candidates = [row.fold, ...row.alts];
    const tokens = new Set(candidates.flatMap((c) => c.split(' ')).filter((t) => t !== ''));
    for (const t of tokens) {
      for (let n = 1; n <= t.length; n += 1) {
        const p = t.slice(0, n);
        checked += 1;
        const key = resolve1(p);
        if (key === null) { p.length < 2 ? (nulls.short += 1) : (nulls.split += 1); continue; }
        const set = ids.get(key);
        if (set === undefined || !set.has(row.id)) {
          holes.push({ q: p, key, id: row.id, name: row.name, kind: 'single-token prefix' });
        }
      }
    }
    // The multi-word case: a query with a second word can only match a row whose WHOLE fold (or
    // whole alternate) begins with it, so its first token is that candidate's first token.
    for (const cand of candidates) {
      if (!cand.includes(' ')) continue;
      const t = cand.split(' ')[0];
      const key = resolveN(t);
      if (key === null) continue;
      const set = ids.get(key);
      if (set === undefined || !set.has(row.id)) {
        holes.push({ q: `${cand} (multi-word)`, key, id: row.id, name: row.name, kind: 'multi-word' });
      }
    }
  }
  ok(holes.length === 0, `A2  ${checked} query prefixes resolve to a shard that HOLDS the row`, `${holes.length} holes, e.g. ${JSON.stringify(holes.slice(0, 5))}`);
  note(`resolved to null: ${nulls.short} because the prefix is 1 char, ${nulls.split} because the prefix is a SPLIT prefix`);

  // The converse: a shard that carries a row no query could resolve to it is dead weight, and a
  // shard key that is not what `shardKeyFor` produces is a document nothing can fetch.
  let unreachable = 0;
  for (const [key, set] of ids) {
    for (const id of set) {
      const row = byId.get(id);
      const toks = new Set([row.fold, ...row.alts].flatMap((c) => c.split(' ')).filter(Boolean));
      const reach = [...toks].some((t) => C.shardKeyFor(t, meta.splits) === key);
      if (!reach) unreachable += 1;
    }
  }
  ok(unreachable === 0, 'A3  no shard carries a row no token of that row resolves to', `${unreachable} rows`);

  // And the loader's own two null arms, exercised through the shipped path rather than restated.
  for (const q of ['d', 'de', 'san', 'a']) {
    const g = await C.loadGazetteerFor(q);
    ok(g === null, `A4  loadGazetteerFor(${JSON.stringify(q)}) === null ("keep typing")`, String(g && g.shard));
  }
  for (const [q, k] of [['de aar', 'de$'], ['san marino', 'san$'], ['sa pa', 'sa$'], ['delhi', 'del']]) {
    const g = await C.loadGazetteerFor(q);
    ok(g !== null && g.shard === k, `A5  loadGazetteerFor(${JSON.stringify(q)}) → shard ${k}`, String(g && g.shard));
  }
}

// ---------------------------------------------------------------------------------------------
if (run('B')) {
  head('B  what the shard rule costs a user who types a name IN FULL');

  const splits = new Set(meta.splits);
  const unreachableInFull = [];
  const shortFirst = [];
  for (const row of WHOLE.rows) {
    const cands = [row.fold, ...row.alts];
    // Could a user reach this row by typing one of its own names, complete?
    const reachable = cands.some((c) => {
      const t = c.split(' ')[0];
      if (t.length < 2) return false;               // loader: token under two characters → null
      if (c === t && splits.has(t)) return false;   // loader: bare split prefix → null
      return true;
    });
    if (!reachable) unreachableInFull.push(row);
    if (cands.every((c) => c.split(' ')[0].length < 2)) shortFirst.push(row);
  }
  note(`${unreachableInFull.length} shipped rows answer NOTHING when their own full name is typed`);
  note(`  of those, ${shortFirst.length} because the first token is a single character`);
  const named = unreachableInFull.filter((r) => r.population >= 4096).slice(0, 25);
  for (const r of named.slice(0, 15)) {
    note(`  ${r.name} (${r.countryCode}, fold ${JSON.stringify(r.fold)}) — typing it returns "keep typing"`);
  }
  ok(unreachableInFull.length === 0,
    'B1  every shipped row is reachable by typing one of its own names in full',
    `${unreachableInFull.length} are not`);

  // Is it really "keep typing" through the shipped path, or does something rescue it?
  for (const r of unreachableInFull.slice(0, 3)) {
    const g = await C.loadGazetteerFor(r.name);
    note(`  shipped path: loadGazetteerFor(${JSON.stringify(r.name)}) → ${g === null ? 'null' : `shard ${g.shard}`}`);
  }
}

// ---------------------------------------------------------------------------------------------
if (run('C')) {
  head('C  KD-119 — the six named outcomes, and the MODAL parent over a straddling code');

  const parents = golden('gazetteer-parents.json');
  const rows = parents.parents ?? [];
  note(`gazetteer-parents.json: ${rows.length} rows, keys ${JSON.stringify(Object.keys(parents).filter((k) => k.startsWith('$')))}`);
  const find = (name) => rows.filter((r) => r.name === name);
  const NAMED = [
    ['Fort-de-France', 'FR'], ['Basse-Terre', 'FR'], ['Dzaoudzi', 'FR'],
    ['Saint-Benoît', 'FR'], ['Longyearbyen', 'NO'], ['Saint-Georges', 'FR'],
  ];
  for (const [name, want] of NAMED) {
    const hits = find(name);
    const got = hits.map((h) => h.shippedCode);
    ok(hits.length > 0 && got.every((g) => g === want),
      `C1  ${name} ships ${want}`, hits.length === 0 ? 'not in the golden at all' : JSON.stringify(hits));
    for (const h of hits) {
      const row = byId.get(h.id);
      ok(row !== undefined && row.countryCode === want, `C2  ${name}: the SHIPPED row carries ${want}`, JSON.stringify(row && { code: row.countryCode, centre: row.centre }));
    }
  }
  // Saint-Georges is the one A-84 Part 5 names as wrong today: countryOf says BR.
  for (const h of find('Saint-Georges')) {
    const row = byId.get(h.id);
    const derived = core.countryOf(row.centre, core.COUNTRY_INDEX);
    note(`  Saint-Georges ${row.id} at ${row.centre.lat},${row.centre.lng}: countryOf → ${derived}, ships ${row.countryCode}, indexSays ${row.indexSays}`);
  }
  // The straddle probe: per stated code, what does the containing feature say row by row?
  const byCode = new Map();
  for (const r of rows) {
    const g = byCode.get(r.statedCode) ?? [];
    g.push(r);
    byCode.set(r.statedCode, g);
  }
  for (const [code, g] of [...byCode].sort()) {
    const tally = new Map();
    for (const r of g) {
      const k = `${r.containing ?? r.resolved ?? r.shippedCode}${r.via ? `/${r.via}` : ''}`;
      tally.set(k, (tally.get(k) ?? 0) + 1);
    }
    const shipped = new Set(g.map((r) => r.shippedCode));
    note(`  ${JSON.stringify(code)} ×${g.length} → ships ${[...shipped].join(',')}; per-row: ${[...tally].map(([k, n]) => `${k}×${n}`).join(' ')}`);
    ok(shipped.size === 1, `C3  code ${JSON.stringify(code)} ships ONE answer for all its rows (a territory has one sovereign)`, [...shipped].join(','));
  }
  // Does the modal answer ever overrule a genuine majority-adjacent split?
  const straddle = [];
  for (const [code, g] of byCode) {
    const tally = new Map();
    for (const r of g) {
      const k = r.containing ?? r.perRow ?? null;
      tally.set(k, (tally.get(k) ?? 0) + 1);
    }
    const sorted = [...tally].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 1 && sorted[1][1] / g.length >= 0.25) straddle.push({ code, tally: sorted });
  }
  ok(straddle.length === 0, 'C4  no stated code has ≥25% of its rows contained by a different feature than the modal one',
    JSON.stringify(straddle));
  // Every shipped row's countryCode must be null or drawable — the zero-exception ceiling.
  const drawn = new Set();
  for (const r of WHOLE.rows) if (r.countryCode !== null) drawn.add(r.countryCode);
  const undrawable = [...drawn].filter((c) => !core.countryIsDrawn?.(c) && !drawnByIndex(c));
  ok(undrawable.length === 0, `C5  every shipped country code is one COUNTRY_INDEX draws (${drawn.size} distinct)`, JSON.stringify(undrawable));
}

function drawnByIndex(code) {
  // COUNTRY_INDEX's own code list, however it is shaped, without importing the generated module.
  const idx = core.COUNTRY_INDEX;
  const codes = idx.codes ?? idx.countries?.map?.((c) => c.code) ?? null;
  if (codes) return codes.includes(code);
  return DRAWN_CODES.has(code);
}
const DRAWN_CODES = new Set(
  (() => {
    const idx = core.COUNTRY_INDEX;
    const out = new Set();
    const walk = (v) => {
      if (Array.isArray(v)) { for (const x of v) walk(x); return; }
      if (v && typeof v === 'object') {
        if (typeof v.code === 'string') out.add(v.code);
        for (const k of Object.keys(v)) walk(v[k]);
      }
    };
    walk(idx);
    return out;
  })(),
);

// ---------------------------------------------------------------------------------------------
if (run('D')) {
  head('D  KD-120 — the codeless population, read off the artefacts rather than off the claim');
  const parents = golden('gazetteer-parents.json');
  const rows = parents.parents ?? [];
  const empties = rows.filter((r) => r.statedCode === '' || r.statedCode === null);
  note(`rows in gazetteer-parents.json whose statedCode is empty/null: ${empties.length}`);
  const nulls = WHOLE.rows.filter((r) => r.countryCode === null);
  note(`shipped rows with countryCode null: ${nulls.length}`);
  for (const r of nulls.slice(0, 20)) note(`  ${r.name} — admin1 ${JSON.stringify(r.admin1)} — ${r.id} — indexSays ${r.indexSays}`);
  ok(nulls.every((r) => r.admin1 !== '' || r.name !== ''), 'D1  no null-code row would render as a bare name');
  const gen = readFileSync(join(CAIRN, 'tools/gen-gazetteer.mjs'), 'utf8');
  const names = ['Lesser Antilles', 'French West Indies', 'Greater Antilles', 'Virgin Islands', 'Woody Island', 'Windward Islands'];
  const present = names.filter((n) => WHOLE.rows.some((r) => r.name === n));
  ok(present.length === 0, 'D2  none of A-83 Part 9\'s named multi-country archipelagos ships', JSON.stringify(present));
  note(`the refusal count lives only in the generator's stdout and the shard-map header — grep: ${/Refused/.test(readFileSync(join(CAIRN, 'packages/core/src/geo/gazetteerShards.gen.ts'), 'utf8')) ? 'header carries it' : 'NOT in the header'}`);
  note(`generator skips a codeless row at: ${(gen.match(/stated === null[^\n]*/g) ?? ['(not found by that spelling)']).join(' | ')}`);
}

// ---------------------------------------------------------------------------------------------
if (run('E')) {
  head('E  `indexSays` — re-derived over every shipped row against the shipped COUNTRY_INDEX');
  const tally = { agrees: 0, differs: 0, silent: 0 };
  const wrongAgrees = [];
  const wrongDiffers = [];
  const wrongSilent = [];
  for (const r of WHOLE.rows) {
    tally[r.indexSays] += 1;
    const derived = core.countryOf(r.centre, core.COUNTRY_INDEX);
    if (r.indexSays === 'agrees' && !(derived !== null && derived === r.countryCode)) wrongAgrees.push({ id: r.id, name: r.name, code: r.countryCode, derived });
    if (r.indexSays === 'differs' && !(derived !== null && r.countryCode !== null && derived !== r.countryCode)) wrongDiffers.push({ id: r.id, name: r.name, code: r.countryCode, derived });
    if (r.indexSays === 'silent' && derived !== null && r.countryCode !== null && derived === r.countryCode) wrongSilent.push({ id: r.id, name: r.name, code: r.countryCode, derived });
  }
  note(`census re-derived: ${JSON.stringify(tally)} — meta.json says ${JSON.stringify(raw.indexSays)}`);
  ok(tally.agrees === raw.indexSays.agrees && tally.differs === raw.indexSays.differs && tally.silent === raw.indexSays.silent,
    'E1  the published triple equals the re-derived one');
  ok(tally.agrees + tally.differs + tally.silent === WHOLE.rows.length, 'E2  the triple sums to the row count');
  ok(wrongAgrees.length === 0, 'E3  NO row claims `agrees` where the index is silent or says otherwise (R61-2\'s class)', `${wrongAgrees.length}, e.g. ${JSON.stringify(wrongAgrees.slice(0, 3))}`);
  ok(wrongDiffers.length === 0, 'E4  every `differs` row genuinely disagrees', `${wrongDiffers.length}, e.g. ${JSON.stringify(wrongDiffers.slice(0, 3))}`);
  ok(wrongSilent.length === 0, 'E5  no `silent` row was actually measurable and agreeing', `${wrongSilent.length}, e.g. ${JSON.stringify(wrongSilent.slice(0, 3))}`);
  const dis = golden('gazetteer-disagreements.json');
  const disRows = dis.disagreements ?? dis.rows ?? [];
  note(`gazetteer-disagreements.json carries ${disRows.length} rows`);
  ok(disRows.length === tally.differs, 'E6  every differing row is published with both answers', `golden ${disRows.length} vs corpus ${tally.differs}`);
  const missing = disRows.filter((d) => !byId.has(d.id));
  ok(missing.length === 0, 'E7  every published disagreement names a row that actually ships', JSON.stringify(missing.slice(0, 3)));
}

// ---------------------------------------------------------------------------------------------
if (run('F')) {
  head('F  the `{0,0}` ceiling and the coordinate range, over the NEW corpus');
  const origin = WHOLE.rows.filter((r) => r.centre.lat === 0 && r.centre.lng === 0);
  ok(origin.length === 0, 'F1  zero shipped rows sit at exactly {0,0}', JSON.stringify(origin.slice(0, 3)));
  let nearest = null;
  for (const r of WHOLE.rows) {
    const d = Math.hypot(r.centre.lat, r.centre.lng);
    if (nearest === null || d < nearest.d) nearest = { d, r };
  }
  note(`nearest row to the origin: ${nearest.r.name}, ${nearest.r.admin1}, ${nearest.r.countryCode} at {${nearest.r.centre.lat}, ${nearest.r.centre.lng}} — ${nearest.d.toFixed(2)}°`);
  ok(nearest.d > 1, 'F2  A-85 Part 5\'s "no shipped row lies within a whole degree of the origin" still holds', nearest.d.toFixed(3));
  const bad = WHOLE.rows.filter((r) => !(r.centre.lat >= -90 && r.centre.lat <= 90 && r.centre.lng >= -180 && r.centre.lng <= 180));
  ok(bad.length === 0, 'F3  every centre is in range', JSON.stringify(bad.slice(0, 3)));
  const nan = WHOLE.rows.filter((r) => Number.isNaN(r.centre.lat) || Number.isNaN(r.centre.lng) || Number.isNaN(r.population));
  ok(nan.length === 0, 'F4  no decoded NaN in a centre or a population bucket', JSON.stringify(nan.slice(0, 3)));
  const off = (n) => Math.abs(n * 1e4 - Math.round(n * 1e4));
  const dp = WHOLE.rows.filter((r) => off(r.centre.lat) > 1e-6 || off(r.centre.lng) > 1e-6);
  ok(dp.length === 0, 'F5  every centre is at 4 dp — the floor A-83 Part 4 refuses to move', String(dp.length));
}

// ---------------------------------------------------------------------------------------------
if (run('G')) {
  head('G  ranking totality, and one-shard-equals-whole-corpus');
  const QUERIES = ['york', 'london', 'san', 'sa pa', 'de aar', 'springfield', 'paris', 'nara', 'hvar', 'vienna', 'geneva', 'z', 'angeles', 'santa cruz', 'saint'];
  for (const q of QUERIES) {
    const g = await C.loadGazetteerFor(q);
    const whole = core.searchGazetteer(q, WHOLE, { limit: 20 });
    if (g === null) { note(`  ${JSON.stringify(q)} → null; the whole corpus would have returned ${whole.length} rows (top: ${whole[0]?.label ?? '—'})`); continue; }
    const one = core.searchGazetteer(q, g, { limit: 20 });
    const same = one.length === whole.length && one.every((h, i) => h.id === whole[i].id && h.label === whole[i].label);
    ok(same, `G1  ${JSON.stringify(q)}: one shard (${g.shard}) === the whole corpus, row for row`,
      `${one.map((h) => h.id).join(',')} vs ${whole.map((h) => h.id).join(',')}`);
  }
  // Totality: shuffle a shard and re-search. A comparator with a tie decides differently.
  const shard = (await C.loadGazetteerFor('santa'));
  const shuffled = { ...shard, rows: [...shard.rows].sort(() => 0.5 - ((Math.sin(shard.rows.length) + 1) % 1)) };
  const a = core.searchGazetteer('santa', shard, { limit: 50 }).map((h) => h.id).join(',');
  const rev = { ...shard, rows: [...shard.rows].reverse() };
  const b = core.searchGazetteer('santa', rev, { limit: 50 }).map((h) => h.id).join(',');
  const c2 = core.searchGazetteer('santa', shuffled, { limit: 50 }).map((h) => h.id).join(',');
  ok(a === b && a === c2, 'G2  the ranking is TOTAL: reversing and shuffling a shard changes no answer');
  // Labels distinct in the returned window.
  for (const q of ['santa cruz', 'san jose', 'springfield', 'london', 'victoria']) {
    const g = await C.loadGazetteerFor(q);
    if (g === null) continue;
    const hits = core.searchGazetteer(q, g, { limit: 20 });
    const labels = new Set(hits.map((h) => h.label));
    ok(labels.size === hits.length, `G3  ${JSON.stringify(q)}: every label in the window is distinct`, `${hits.length} hits, ${labels.size} labels`);
  }
  // The pairing check.
  const ha = await C.loadGazetteerFor('hallstatt');
  let threw = false;
  try { core.searchGazetteer('york', ha); } catch { threw = true; }
  ok(threw, 'G4  searchGazetteer("york", <the "hal" shard>) THROWS rather than returning []');

  // **G5 — the equality over a SWEEP, not a probe list.** The generator's audit and I-23's own
  // criterion check `york` and 30 probes. This draws 1,200 queries deterministically from the
  // corpus's own folds (every 124th row, its whole fold and two prefixes of its first token) and
  // compares one-shard against whole-corpus, row for row, label for label.
  const sweep = [];
  for (let i = 0; i < WHOLE.rows.length; i += 124) {
    const f = WHOLE.rows[i].fold;
    const t = f.split(' ')[0];
    sweep.push(f);
    if (t.length >= 3) sweep.push(t.slice(0, 3));
    if (t.length >= 5) sweep.push(t.slice(0, 5));
  }
  let compared = 0;
  let nulled = 0;
  const drift = [];
  for (const q of sweep) {
    const g = await C.loadGazetteerFor(q);
    if (g === null) { nulled += 1; continue; }
    const one = core.searchGazetteer(q, g, { limit: 20 });
    const all = core.searchGazetteer(q, WHOLE, { limit: 20 });
    compared += 1;
    const same = one.length === all.length && one.every((h, i2) => h.id === all[i2].id && h.label === all[i2].label);
    if (!same) drift.push({ q, shard: g.shard, one: one.map((h) => h.id).slice(0, 3), all: all.map((h) => h.id).slice(0, 3) });
  }
  ok(drift.length === 0, `G5  ${compared} swept queries answer identically from one shard and from the whole corpus`,
    `${drift.length} differ, e.g. ${JSON.stringify(drift.slice(0, 3))}`);
  note(`${nulled} of ${sweep.length} swept queries answered "keep typing" and were not compared`);
}

// ---------------------------------------------------------------------------------------------
if (run('H')) {
  head('H  the fold — distinct from `normalizeCityName`, and verified without being shipped');
  const src = readFileSync(join(CAIRN, 'packages/core/src/geo/gazetteer.ts'), 'utf8');
  ok(!/from '\.\.\/model\/cityName/.test(src), 'H1  gazetteer.ts imports nothing from model/cityName.ts');
  const cityNameSrc = readFileSync(join(CAIRN, 'packages/core/src/model/cityName.ts'), 'utf8');
  ok(!/gazetteer/.test(cityNameSrc), 'H2  cityName.ts does not reach for the gazetteer either');
  const PAIRS = [['Zürich', 'zurich'], ['São Paulo', 'sao paulo'], ['Łódź', 'lodz'], ['Malmö', 'malmo'],
    ['Tromsø', 'tromso'], ['Bærum', 'baerum'], ['Ağrı', 'agri'], ['İstanbul', 'istanbul'],
    ['Đông Hà', 'dong ha'], ['Bắc Kạn', 'bac kan'], ['Nukuʻalofa', 'nukualofa'], ['Ciudad Juárez', 'ciudad juarez']];
  for (const [inp, out] of PAIRS) ok(C.foldPlaceName(inp) === out, `H3  fold ${JSON.stringify(inp)} → ${JSON.stringify(out)}`, C.foldPlaceName(inp));
  const cn = await import(pathToFileURL(join(CAIRN, 'packages/core/src/model/cityName.ts')).href);
  ok(!('normalizeCityName' in core), 'H3b normalizeCityName is not on index.ts either — both keys stay module-private');
  const same = PAIRS.filter(([inp]) => cn.normalizeCityName(inp) === C.foldPlaceName(inp));
  note(`of the 12 pairs, ${12 - same.length} fold differently from normalizeCityName — the two keys are distinct in FACT, not only in doctrine (e.g. ${JSON.stringify(cn.normalizeCityName('Zürich'))} vs ${JSON.stringify(C.foldPlaceName('Zürich'))})`);
  // Every shipped row: is its fold the fold the shard was built from?
  const bad = [];
  for (const row of WHOLE.rows) if (C.foldPlaceName(row.name) !== row.fold) bad.push(row.name);
  ok(bad.length === 0, 'H4  foldPlaceName(row.name) === the decoded fold for every shipped row', String(bad.length));
  // Alts are already folded, and are never equal to the fold.
  const badAlt = WHOLE.rows.filter((r) => r.alts.some((a) => a === r.fold || C.foldPlaceName(a) !== a));
  ok(badAlt.length === 0, 'H5  every alternate is already folded and none duplicates the row\'s own fold', `${badAlt.length}, e.g. ${JSON.stringify(badAlt.slice(0, 3).map((r) => [r.name, r.fold, r.alts]))}`);
  const empty = WHOLE.rows.filter((r) => r.fold === '');
  ok(empty.length === 0, 'H6  no shipped row folds to the empty string', String(empty.length));
}

// ---------------------------------------------------------------------------------------------
if (run('I')) {
  head('I  CC BY 4.0 — the source-level attribution, every path that can carry it');
  const needle = 'creativecommons.org/licenses/by/4.0';
  ok(meta.source.includes('GeoNames') && meta.source.includes(needle), 'I1  meta.json $source names GeoNames and the licence URL');
  ok(WHOLE.gazetteer === undefined || true, '');
  const g = await C.loadGazetteerFor('hallstatt');
  ok(g.source === meta.source, 'I2  a loaded shard carries the attribution as Gazetteer.source');
  const miss = await C.loadGazetteerFor('zzzzzzzznotaplace');
  ok(miss === null || miss.source === meta.source, 'I3  a MISS still carries the attribution', JSON.stringify(miss && miss.source));
  const nul = await C.loadGazetteerFor('de');
  ok(nul === null, 'I4  a "keep typing" answer carries NO attribution — it is null (stated, not a defect)');
  const hits = core.searchGazetteer('hallstatt', g, { limit: 3 });
  ok(hits.every((h) => !('source' in h)), 'I5  a HIT does not carry the attribution — the consumer must reach for gazetteer.source', JSON.stringify(Object.keys(hits[0])));
  const cli = readFileSync(join(CAIRN, 'cli.ts'), 'utf8');
  ok(/source/.test(cli), 'I6  cli.ts reaches for the source string');
  const shardMap = readFileSync(join(CAIRN, 'packages/core/src/geo/gazetteerShards.gen.ts'), 'utf8');
  ok(shardMap.includes(needle), 'I7  the generated shard map carries the licence in its header');
  // The half that is OWED: is there anything in code that would stop a screen shipping without it?
  const anyGuard = [...readdirSync(join(CAIRN, 'packages/core/test'))]
    .map((f) => readFileSync(join(CAIRN, 'packages/core/test', f), 'utf8'))
    .filter((s) => s.includes('loadGazetteerFor') && /attribution/i.test(s));
  note(`tests mentioning both loadGazetteerFor and attribution: ${anyGuard.length}`);
  const webFiles = (() => { try { return readdirSync(join(CAIRN, 'apps/web/src'), { recursive: true }); } catch { return []; } })();
  const callers = webFiles.filter((f) => typeof f === 'string' && /\.(tsx|ts)$/.test(f))
    .filter((f) => readFileSync(join(CAIRN, 'apps/web/src', f), 'utf8').includes('loadGazetteerFor'));
  ok(callers.length === 0, 'I8  no rendered surface calls loadGazetteerFor yet, so nothing renders a hit without the attribution TODAY', JSON.stringify(callers));
  note('nothing in code prevents the FIRST such caller from shipping without it — standing finding');
}

// ---------------------------------------------------------------------------------------------
if (run('K')) {
  head('K  the bytes, re-derived from disk');
  const dir = C.CORPUS_DIR;
  const files = readdirSync(dir);
  let total = 0;
  let largest = { f: '', b: 0 };
  for (const f of files) {
    const b = statSync(join(dir, f)).size;
    total += b;
    if (f !== 'meta.json' && b > largest.b) largest = { f, b };
  }
  note(`${files.length} files, ${total} bytes total, largest shard ${largest.f} at ${largest.b} B`);
  ok(largest.b <= 96 * 1024, 'K1  no shard document exceeds 96 KiB', `${largest.f} ${largest.b}`);
  const budget = readFileSync(join(CAIRN, 'packages/core/test/0-gazetteerBudget.test.ts'), 'utf8');
  const pasted = [...budget.matchAll(/(\d[\d_]{5,})/g)].map((m) => Number(m[1].replace(/_/g, '')));
  ok(pasted.includes(total), `K2  the budget test carries the measured total ${total}`, JSON.stringify(pasted));
  const genTs = statSync(join(CAIRN, 'packages/core/src/geo/gazetteerShards.gen.ts')).size;
  ok(genTs < 1048576, `K3  the generated .ts stays under the type-stripping ceiling (${genTs} B)`);
  ok(!readdirSync(join(CAIRN, 'packages/core/src/geo/gazetteer')).some((f) => !f.endsWith('.json')),
    'K4  nothing but .json under the corpus directory');
}

// ---------------------------------------------------------------------------------------------
if (run('L')) {
  head('L  the decoder under a hostile document, and the standing constraints');
  const m = meta;
  const bad = (doc) => { try { C.decodeGazetteer(m, doc); return null; } catch (e) { return e.message; } };
  ok(bad({ v: 1, k: 'x', r: ['a|b'] }) !== null, 'L1  a short row is refused by field count');
  ok(bad({ v: 1, k: 'x' }) !== null, 'L2  a document with no rows array is refused');
  const decoded = C.decodeGazetteer(m, { v: 1, k: 'x', r: ['Nowhere||ZZ||||||q'] });
  note(`  a row with empty numeric fields decodes to ${JSON.stringify(decoded.rows[0])}`);
  ok(!Number.isNaN(decoded.rows[0].population) && !Number.isNaN(decoded.rows[0].centre.lat),
    'L3  empty numeric fields do not decode to NaN', JSON.stringify(decoded.rows[0]));
  const proto = C.decodeGazetteer(m, { v: 1, k: 'x', r: ['__proto__||ZZ||1|1|1|1|a'] });
  ok(Object.getPrototypeOf(proto.rows[0]) === Object.prototype, 'L4  a row named __proto__ does not pollute');
  // Determinism / zero-dep constraints over the changed product files.
  for (const f of ['packages/core/src/geo/gazetteer.ts', 'packages/core/src/geo/gazetteerShards.gen.ts']) {
    const s = readFileSync(join(CAIRN, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    ok(!/Date\.now\(|Math\.random\(|crypto\.randomUUID\(/.test(s), `L5  ${f}: no ambient clock or randomness`);
    ok(!/from '[a-z@]/.test(s.replace(/from '@cairn/g, "from 'X")), `L6  ${f}: no bare-specifier dependency`);
  }
  const twice = [await C.loadGazetteerFor('vienna'), await C.loadGazetteerFor('vienna')];
  ok(JSON.stringify(twice[0]) === JSON.stringify(twice[1]), 'L7  two loads of one query are identical');
}

// ---------------------------------------------------------------------------------------------
if (run('J')) {
  head('J  reproducibility — can the generator produce a DIFFERENT corpus from the same declared inputs?');
  const gen = readFileSync(join(CAIRN, 'tools/gen-gazetteer.mjs'), 'utf8');
  const stripped = gen.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  ok(!/new Date\(|Date\.now\(|Math\.random\(|randomUUID/.test(stripped), 'J1  the generator has no clock and no randomness');
  ok(/const FETCHED = '\d{4}-\d{2}-\d{2}'/.test(gen), 'J2  the fetch date is a constant, not a clock');

  // The declared inputs are the five pinned checksums, and the corpus sha is a function of exactly
  // those five. Re-derive it — the formula, not the value.
  const shas = [...gen.matchAll(/sha256: '([0-9a-f]{64})'/g)].map((m) => m[1]);
  const keys = [...gen.matchAll(/^  (allCountries|alternateNames|admin1|countryInfo|admin0): \{/gm)].map((m) => m[1]);
  const pairs = keys.map((k, i) => [k, shas[i]]);
  const { createHash } = await import('node:crypto');
  const recomputed = createHash('sha256')
    .update(pairs.map(([k, v]) => [k, v]).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}:${v}`).join('\n'))
    .digest('hex');
  ok(recomputed === meta.sourceSha256, 'J3  the committed `$sourceSha256` is sha256 over exactly the five source checksums', `${recomputed} vs ${meta.sourceSha256}`);

  // …and the corpus is a function of a SIXTH input that the sha does not cover.
  ok(/import\('\.\.\/packages\/core\/src\/index\.ts'\)/.test(gen), 'J4  the generator reads the committed COUNTRY_INDEX');
  const usesIndex = /countryOf\(\{ lat: r\.lat, lng: r\.lng \}, index\)/.test(gen) && /draws = new Set\(COUNTRY_INDEX\.countries/.test(gen);
  ok(usesIndex, 'J5  `indexSays` and the parent translation are functions of COUNTRY_INDEX');
  // Does the value that names the corpus cover every input the corpus is a function of?
  const shaExpr = gen.slice(gen.indexOf('const corpusSha'), gen.indexOf('console.log(`corpus sha256'));
  const coversIndex = /COUNTRY_INDEX|countries\.gen|indexSha/.test(shaExpr);
  ok(coversIndex,
    'J6  the corpus sha covers every input the corpus is a function of',
    'it is taken over the five SOURCE checksums only. COUNTRY_INDEX decides `indexSays`, the ' +
      'disagreement refusal and the whole parent translation, and contributes nothing to it — so ' +
      'two corpora built either side of a country-index regeneration are different documents ' +
      'carrying the SAME $sourceSha256, and the loader\'s skew check compares only that value');
  // Demonstrate the dependency rather than assert it: one code out of `draws` moves 149 rows.
  const drawn = new Set(core.COUNTRY_INDEX.countries.map((c) => c.code));
  const parents = golden('gazetteer-parents.json');
  const wouldMove = parents.parents.filter((p) => p.shippedCode !== null && drawn.has(p.shippedCode)).length;
  note(`${wouldMove} shipped rows carry a code that exists ONLY because COUNTRY_INDEX draws it today`);
  const marked = WHOLE.rows.filter((r) => r.indexSays !== 'silent').length;
  note(`${marked} rows carry an \`indexSays\` that is a function of COUNTRY_INDEX's geometry`);
  note('a country-index regeneration therefore changes the corpus while `$sourceSha256` is unmoved, and the loader\'s skew check compares only that value');

  // Ordering: is anything in the emitted order decided by a Map/Set iteration or an unstable sort?
  ok(/\[\.\.\.keptKeys\.keys\(\)\]\.sort\(\)/.test(gen), 'J7  shard emission order is sorted, not Map-insertion order');
  ok(/pairs\.sort\(/.test(gen), 'J8  the (token,row) pairs are sorted before sharding');
  // The order the rows themselves ship in — total, and re-derivable from the shipped bytes.
  const lessThan = (a, b) => (a.fold !== b.fold ? a.fold < b.fold
    : a.population !== b.population ? a.population > b.population
    : (a.countryCode ?? '') !== (b.countryCode ?? '') ? (a.countryCode ?? '') < (b.countryCode ?? '')
    : a.id < b.id);
  let outOfOrder = 0;
  for (const { gazetteer } of C.eachShard()) {
    for (let i = 1; i < gazetteer.rows.length; i += 1) if (!lessThan(gazetteer.rows[i - 1], gazetteer.rows[i])) outOfOrder += 1;
  }
  ok(outOfOrder === 0, 'J9  every shard ships in the generator\'s stated total order (fold, -pop, code, id)', String(outOfOrder));
}

// ---------------------------------------------------------------------------------------------
if (run('M')) {
  head('M  what class of ROW ships — is every shipped row "a settlement or an island you can say you went to"?');
  // A-83 Part 3 admits ISL/ISLS beside class P. A-83 Part 9 clause 1 refuses a row that would
  // render as a BARE NAME, and KD-120 says that refusal catches the multi-country archipelagos.
  // It catches them only when GeoNames states NO code. Here is what states one.
  const big = WHOLE.rows.filter((r) => r.population >= 2 ** 24).sort((a, b) => b.population - a.population);
  note(`${big.length} shipped rows carry a population bucket of 2^24 (16.8 M) or more:`);
  for (const r of big) note(`   ${r.name} — ${r.countryCode} — admin1 ${JSON.stringify(r.admin1)} — pop~${r.population} — ${r.centre.lat},${r.centre.lng}`);
  const MULTI = ['Antilles', 'Hispaniola'];
  for (const n of MULTI) {
    const r = WHOLE.rows.find((x) => x.name === n);
    if (r === undefined) { note(`   ${n} does not ship`); continue; }
    const g2 = await C.loadGazetteerFor(r.fold);
    const hits = g2 === null ? [] : core.searchGazetteer(r.fold, g2, { limit: 3 });
    ok(false, `M1  "${n}" is a MULTI-COUNTRY landmass and ships attributed to one country — a user typing it is offered ${JSON.stringify(hits[0]?.label ?? '')} at rank ${hits.findIndex((h) => h.id === r.id) + 1}`,
      `${r.id} ${r.countryCode} ${r.centre.lat},${r.centre.lng}`);
    const pick = core.cityPickFromRow(r);
    const t = core.createTrip({ title: 'T', startDate: '2026-03-01', endDate: '2026-03-05', ownerId: 'u1', cities: [{ name: r.name, pick }] }, { ids: core.sequentialIds('m'), now: '2026-01-01' });
    const row = core.tripSummary(t, core.COUNTRY_INDEX);
    note(`   picked through createTrip → tripSummary: {${row.cities[0].countryCode}, ${row.cities[0].countrySource}} — that is what lands on a lifetime map`);
  }
  // The mechanism: without the parent translation "Antilles" would have had no code and no region,
  // and A-83 Part 9 clause 1 would have refused it.
  const ant = WHOLE.rows.find((r) => r.name === 'Antilles');
  if (ant) {
    const p = golden('gazetteer-parents.json').parents.find((x) => x.id === ant.id);
    note(`   "Antilles" states ${JSON.stringify(p?.statedCode)} (a retired code the index cannot draw) and was TRANSLATED to ${JSON.stringify(p?.shippedCode)} via ${p?.via}`);
    note('   with `countryCode: null` and `admin1: ""` it would have rendered as a bare name — the refusal A-83 Part 9 clause 1 applies to exactly this class');
  }
}

// ---------------------------------------------------------------------------------------------
if (run('N')) {
  head('N  the okina family — the corpus\'s own punctuation against A-82 Part 3\'s substitution table');
  const OK = /[\u2018\u2019\u02BB\u02BC`\u00B4]/;
  const withMark = WHOLE.rows.filter((r) => OK.test(r.name));
  note(`${withMark.length} shipped rows carry an okina-family mark (U+2018 U+2019 U+02BB U+02BC \` ´)`);
  const tally = new Map();
  for (const r of WHOLE.rows) for (const ch of r.name) if (/[^\p{L}\p{N} ]/u.test(ch)) tally.set(ch, (tally.get(ch) ?? 0) + 1);
  note(`punctuation census: ${[...tally].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `${JSON.stringify(c)}(U+${c.codePointAt(0).toString(16).toUpperCase()})×${n}`).join(' ')}`);
  note('SUBSTITUTIONS deletes U+02BB and U+02BC. U+2018 and U+2019 are NOT in the table, so step 5 turns each into a SPACE.');
  const natural = (n) => C.foldPlaceName(n.replace(/[\u2018\u2019\u02BB\u02BC`\u00B4]/g, ''));
  const split = withMark.filter((r) => natural(r.name) !== r.fold);
  let lost = [];
  for (const r of split) {
    const q = natural(r.name);
    const g2 = await C.loadGazetteerFor(q);
    const hits = g2 === null ? [] : core.searchGazetteer(q, g2, { limit: 20 });
    if (!hits.some((h) => h.id === r.id)) lost.push(r);
  }
  ok(lost.length === 0,
    `N1  every row whose name carries an okina-family mark is reachable by typing the name WITHOUT it`,
    `${lost.length} of ${split.length} are not`);
  for (const r of lost.sort((a, b) => b.population - a.population).slice(0, 12)) {
    note(`   ${r.name} (${r.countryCode}, pop~${r.population}) folds to ${JSON.stringify(r.fold)}; a user typing ${JSON.stringify(natural(r.name))} gets nothing`);
  }
  // A-82 Part 3's own pinned pair, against the row it stands for.
  ok(C.foldPlaceName('Nukuʻalofa') === 'nukualofa', 'N2  the PINNED PAIR still passes: fold("Nukuʻalofa") === "nukualofa"');
  const nuku = WHOLE.rows.filter((r) => /Nuku/.test(r.name) && /alofa/.test(r.name));
  for (const r of nuku) note(`   the SHIPPED row is ${JSON.stringify(r.name)} → fold ${JSON.stringify(r.fold)} (U+${r.name.split('').find((c) => OK.test(c))?.codePointAt(0).toString(16).toUpperCase() ?? '—'})`);
  const g3 = await C.loadGazetteerFor('nukualofa');
  ok(g3 !== null && core.searchGazetteer('nukualofa', g3, { limit: 20 }).length > 0,
    'N3  …and the query the pinned pair produces reaches the row it stands for', 'it returns no rows at all');
}

// ---------------------------------------------------------------------------------------------
if (run('P')) {
  head('P  the sensitive-path check, and the shard key as an attacker-controlled string');
  // §6.6 / the read-only boundary: nothing of the live planner may reach a committed artefact.
  const needles = ['jacobseemann1', 'europe-2026-itinerary', 'Windsor Great Park', 'Gellért'];
  const hits = [];
  for (const { file, raw: doc } of C.eachShard()) {
    const text = JSON.stringify(doc);
    for (const n of needles) if (text.includes(n)) hits.push(`${file}:${n}`);
  }
  const metaText = JSON.stringify(rawMetaSafe());
  for (const n of needles) if (metaText.includes(n)) hits.push(`meta.json:${n}`);
  ok(hits.length === 0, 'P1  no committed corpus document carries a string from the live planner', JSON.stringify(hits));
  const parents = golden('gazetteer-parents.json');
  const keys = new Set();
  for (const p2 of parents.parents) for (const k of Object.keys(p2)) keys.add(k);
  ok(!keys.has('centre') && !keys.has('lat') && !keys.has('lng'),
    `P2  gazetteer-parents.json keeps its own "NO COORDINATES" promise (keys: ${[...keys].join(',')})`);
  // `DOCUMENTS.shard` is `key in SHARDS` over an object literal, so an inherited property name
  // would resolve to a non-thunk. Can a folded query produce one?
  for (const q of ['toString', 'constructor', '__proto__', 'valueOf', 'hasOwnProperty', 'toLocaleString']) {
    const g2 = await C.loadGazetteerFor(q);
    ok(g2 === null || typeof g2 === 'object', `P3  loadGazetteerFor(${JSON.stringify(q)}) returns a gazetteer or null, never a prototype member`, String(g2));
    if (g2 !== null) note(`   ${JSON.stringify(q)} folds to ${JSON.stringify(C.foldPlaceName(q))} → shard ${g2.shard}`);
  }
  // limit validation (R60-6) and the zero/negative arms.
  const ha = await C.loadGazetteerFor('hallstatt');
  let threw = false;
  try { core.searchGazetteer('hallstatt', ha, { limit: NaN }); } catch { threw = true; }
  ok(threw, 'P4  {limit: NaN} is a programmer error, not a silent []');
  ok(core.searchGazetteer('hallstatt', ha, { limit: 0 }).length === 0, 'P5  {limit: 0} returns []');
}

function rawMetaSafe() { return raw; }

console.log(`\n${fails} FAIL`);
console.log('COMPLETE');
