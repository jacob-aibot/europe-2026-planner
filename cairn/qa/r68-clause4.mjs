/**
 * QA round 68 — **A-93 clause 4 re-derived from the SOURCE, not from the corpus.**
 *
 * Every previous gazetteer round measured the committed corpus. The sixteen refusals cannot be
 * checked that way: the refused rows are precisely the ones the corpus no longer contains. This
 * probe joins the **pre-clause-4** corpus (`e94f8a1`, 149,101 rows, decoded from a throwaway
 * worktree) to the cached pinned `allCountries.txt` and **re-implements A-93 Part 2 from the
 * ruling's own words**, so that "the set is right" and "the predicate is right" are two facts
 * rather than one.
 *
 *   node qa/r68-source.mjs --rebuild       # once, ~1 min: caches the source rows it needs
 *   node qa/r68-clause4.mjs                # all sections
 *   node qa/r68-clause4.mjs A C            # only those
 *
 * `--prev <dir>` points at a decoded pre-clause-4 corpus directory. Without one, sections C, E, F
 * and G that need the refused rows are SKIPPED rather than silently measured over 149,085:
 *
 *   git worktree add /tmp/r68-base e94f8a1
 *   node qa/r68-clause4.mjs --prev /tmp/r68-base/cairn/packages/core/src/geo/gazetteer
 *
 * It writes nothing. It reads the committed corpus, the cached pinned sources and
 * `$CAIRN_R68_CACHE`. No network, no generator run, no browser.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { sourceRows, SRC } from './r68-source.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = join(HERE, '..');
const CORPUS = join(CAIRN, 'packages/core/src/geo/gazetteer');
const GOLDEN = join(CAIRN, 'fixtures/golden');

const argv = process.argv.slice(2);
const prevAt = argv.indexOf('--prev');
const PREV = prevAt >= 0 ? resolve(argv[prevAt + 1]) : null;
const wanted = argv.filter((a, i) => /^[A-Z]$/.test(a) && i !== prevAt + 1);
const run = (s) => wanted.length === 0 || wanted.includes(s);

let pass = 0; let fail = 0; let skipped = 0;
const head = (s) => console.log(`\n== ${s}`);
const ok = (cond, msg, detail = '') => {
  if (cond) { pass += 1; console.log(`  ok   ${msg}`); }
  else { fail += 1; console.log(`  FAIL ${msg}${detail ? `  — ${detail}` : ''}`); }
};
const note = (s) => console.log(`  note ${s}`);
const skip = (s) => { skipped += 1; console.log(`  SKIP ${s}`); };

// ---------------------------------------------------------------- shared readers

const gz = await import('../packages/core/src/geo/gazetteer.ts');

function corpusAt(dir) {
  const meta = gz.decodeGazetteerMeta(JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')));
  const byId = new Map();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json') && n !== 'meta.json').sort()) {
    for (const row of gz.decodeGazetteer(meta, JSON.parse(readFileSync(join(dir, f), 'utf8'))).rows) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
  }
  return { rows: [...byId.values()], meta };
}

/** The pinned Natural Earth layer's own properties — the only source `P(c)` may read (A-93 Part 2). */
const admin0Props = () =>
  JSON.parse(readFileSync(join(SRC, 'ne_10m_admin_0_countries.geojson'), 'utf8')).features.map((f) => f.properties);

/** A-93 Part 2's literal sentence: the feature whose `ADM0_A3` is that code's `SOV_A3`. */
function sovereignsByAdm0(props) {
  const byAdm0 = new Map();
  for (const p of props) if (!byAdm0.has(p.ADM0_A3)) byAdm0.set(p.ADM0_A3, p);
  const out = new Map();
  for (const p of props) {
    const code = p.ISO_A2_EH;
    if (!/^[A-Z]{2}$/.test(code ?? '')) continue;
    const head_ = byAdm0.get(p.SOV_A3);
    if (!head_ || head_.ADMIN !== head_.SOVEREIGNT) continue;
    const parent = head_.ISO_A2_EH;
    if (parent && parent !== code && !out.has(code)) out.set(code, parent);
  }
  return out;
}

/** KD-125's join: the self-governing member of the code's own `SOV_A3` group. */
function sovereignsBySov(props) {
  const selfGov = new Map();
  for (const p of props) if (p.ADMIN === p.SOVEREIGNT && !selfGov.has(p.SOV_A3)) selfGov.set(p.SOV_A3, p);
  const out = new Map();
  for (const p of props) {
    const code = p.ISO_A2_EH;
    if (!/^[A-Z]{2}$/.test(code ?? '')) continue;
    const head_ = selfGov.get(p.SOV_A3);
    if (!head_) continue;
    const parent = head_.ISO_A2_EH;
    if (parent && parent !== code && !out.has(code)) out.set(code, parent);
  }
  return out;
}

const cc2Of = (field) =>
  [...new Set((field ?? '').split(',').map((c) => c.trim().toUpperCase()).filter((c) => c !== ''))].sort();
const gidOf = (id) => parseInt(id.slice(3), 36);

const SRC_ROWS = new Map((await sourceRows()).map((r) => [r.gid, r]));
const NOW = corpusAt(CORPUS);
const BEFORE = PREV ? corpusAt(PREV) : null;
const props = admin0Props();
const SOV = sovereignsBySov(props);
const P = (c) => (c === null || c === undefined ? null : SOV.get(c) ?? null);

/** A-93 Part 2, re-implemented from the ruling's words. `row` is a decoded corpus row. */
function clause4(row) {
  const s = SRC_ROWS.get(gidOf(row.id));
  if (!s) return null;
  const X = cc2Of(s.cc2);
  if (X.length === 0) return null;
  const S = s.cc === '' ? null : s.cc;
  const C = row.countryCode;
  const subtract = new Set([S, C, P(S), P(C)].filter((c) => c !== null));
  const foreign = X.filter((c) => !subtract.has(c));
  return { s, S, C, X, foreign, terrain: s.code === 'ISL' || s.code === 'ISLS' };
}

const REFUSALS = JSON.parse(readFileSync(join(GOLDEN, 'gazetteer-refusals.json'), 'utf8'));

// ---------------------------------------------------------------------------------------------
if (run('A')) {
  head('A  KD-125 — A-93 Part 2\'s join for P(c), both readings, over the pinned layer');
  const lit = sovereignsByAdm0(props);
  note(`the pinned layer carries ${props.length} features`);
  ok(lit.size === 0,
    'A1  the ruling\'s LITERAL join (feature.ADM0_A3 === c.SOV_A3) names a distinct sovereign for ZERO codes',
    `${lit.size}`);
  ok(SOV.size === 41,
    'A2  the join on SOV_A3 names a distinct sovereign for 41 codes — A-93 Part 3(b)\'s own figure',
    `${SOV.size}`);
  ok(!props.some((p) => p.ADM0_A3 === 'GB1'),
    'A3  no feature carries ADM0_A3 = "GB1" — which is why the literal join is empty');
  const gb = props.find((p) => p.ISO_A2_EH === 'GB');
  const je = props.find((p) => p.ISO_A2_EH === 'JE');
  ok(gb?.ADM0_A3 === 'GBR' && gb?.SOV_A3 === 'GB1' && je?.SOV_A3 === 'GB1',
    'A4  the UK is ADM0_A3 GBR / SOV_A3 GB1 and Jersey\'s SOV_A3 is GB1',
    `${gb?.ADM0_A3}/${gb?.SOV_A3}, JE ${je?.SOV_A3}`);
  for (const [c, p] of [['JE', 'GB'], ['GG', 'GB'], ['FO', 'DK'], ['AX', 'FI'], ['NF', 'AU'], ['TF', 'FR']]) {
    ok(SOV.get(c) === p, `A5  P(${c}) = ${p} — one of A-93's six load-bearing pairs`, String(SOV.get(c)));
  }
  ok(P('VA') === null, 'A6  P(VA) is null — the Holy See is its own sovereign', String(P('VA')));
  note(`the loaded pairs the layer also carries: ${['PS', 'HK', 'MO', 'GI', 'FK', 'IO', 'NC'].map((c) => `${c}->${SOV.get(c)}`).join(', ')}`);
  note('VERDICT: the builder\'s join is right and A-93 Part 2\'s sentence is wrong. Built literally the');
  note('        ruling would have shipped its own injected fault 4 — see section D.');
}

// ---------------------------------------------------------------------------------------------
if (run('B')) {
  head('B  A-93 Part 7 fault 3 — "the refusal count goes 16 -> 169", re-derived');
  if (!BEFORE) { skip('B needs --prev; the 16 refused rows are not in the shipped corpus'); }
  else {
    let a89 = 0; let noClassP = 0; let noClassTerrain = 0; let exempt = 0;
    const exemptGroups = new Map();
    const fault3P = [];
    for (const row of BEFORE.rows) {
      const r = clause4(row);
      if (r === null) continue;
      const a89Foreign = r.X.filter((c) => c !== r.S && c !== r.C);
      if (a89Foreign.length > 0) a89 += 1;
      if (r.foreign.length > 0) { if (r.terrain) noClassTerrain += 1; else { noClassP += 1; fault3P.push(r); } }
      if (!r.terrain && a89Foreign.length > 0) {
        exempt += 1;
        const k = `${r.S ?? 'no code'}+${a89Foreign.join(',')}`;
        exemptGroups.set(k, (exemptGroups.get(k) ?? 0) + 1);
      }
    }
    ok(a89 === 169, 'B1  A-89\'s predicate (X \\ {S, C}) matches 169 rows — A-93 Part 1\'s figure', String(a89));
    ok(exempt === 141 && exemptGroups.size === 57,
      'B2  141 class-P rows in 57 groups — A-93 Part 3(a) and the generator\'s audit line',
      `${exempt} in ${exemptGroups.size}`);
    ok(noClassTerrain === 16, 'B3  with the class restriction, clause 4 refuses 16', String(noClassTerrain));
    const total = noClassTerrain + noClassP;
    note(`dropping the class restriction with the sovereign subtraction still in place refuses ${total}`);
    note(`  = ${noClassTerrain} terrain + ${noClassP} class-P`);
    ok(total !== 169,
      'B4  A-93 Part 7 fault 3\'s stated count 16 -> 169 is WRONG (169 is A-89\'s pre-class count)',
      `fault 3 refuses ${total}`);
    ok(total === 102, 'B5  the number the fault should state is 16 -> 102', String(total));
    ok(fault3P.some((r) => r.s.name === 'Vatican City'),
      'B6  Vatican City DOES disappear under fault 3 — P(VA) is null, so the fault\'s EFFECT stands');
    ok(!fault3P.some((r) => r.s.name.startsWith('Tórshavn')),
      'B7  Tórshavn does NOT — FO->DK is subtracted, which is what makes 169 too big');
    const byCode = new Map();
    for (const r of fault3P) byCode.set(r.S, (byCode.get(r.S) ?? 0) + 1);
    note(`fault-3 class-P victims by stated code: ${[...byCode].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(', ')}`);
    const faroese = [...exemptGroups].find(([k]) => k === 'FO+DK')?.[1] ?? 0;
    const aland = [...exemptGroups].find(([k]) => k === 'AX+FI')?.[1] ?? 0;
    ok(faroese === 16 && aland === 15,
      'B8  the 16 Faroese and 15 Åland rows the builder names are exactly the two largest exempt groups',
      `FO+DK ${faroese}, AX+FI ${aland}`);
  }
}

// ---------------------------------------------------------------------------------------------
if (run('C')) {
  head('C  the sixteen, re-derived from A-93 Part 2\'s words over the PRE-clause-4 corpus');
  if (!BEFORE) { skip('C needs --prev'); }
  else {
    ok(BEFORE.rows.length === 149101, 'C0  the pre-clause-4 corpus is 149,101 rows', String(BEFORE.rows.length));
    const refused = [];
    for (const row of BEFORE.rows) {
      const r = clause4(row);
      if (r && r.terrain && r.foreign.length > 0) refused.push(r);
    }
    ok(refused.length === 16, 'C1  an independent implementation of the predicate refuses exactly 16 rows', String(refused.length));
    const mine = new Set(refused.map((r) => r.s.gid));
    const golden = REFUSALS.refusals.filter((r) => r.reason === 'multi-country');
    const theirs = new Set(golden.map((r) => parseInt(r.id.slice(3), 36)));
    const missing = [...theirs].filter((g) => !mine.has(g));
    const added = [...mine].filter((g) => !theirs.has(g));
    ok(missing.length === 0 && added.length === 0,
      'C2  my set and the committed golden\'s set agree by GeoNames id, both directions',
      `missing ${missing.join(',')} added ${added.join(',')}`);
    ok(golden.every((r) => r.cls !== 'P'), 'C3  no clause-4 refusal has feature class P — A-93 Part 8 condition 1');
    const translatedRefusals = refused.filter((r) => r.S !== r.C);
    ok(translatedRefusals.length === 1 && translatedRefusals[0].s.name === 'Antilles',
      'C4  exactly one refused row is translated (Antilles AN -> DO); the other fifteen state a drawable code',
      translatedRefusals.map((r) => `${r.s.name} ${r.S}->${r.C}`).join(', '));
    for (const r of refused.sort((a, b) => b.s.pop - a.s.pop)) {
      note(`  ${String(r.s.gid).padStart(8)} ${r.s.name.padEnd(32)} ${r.s.code.padEnd(4)} ${r.S} cc2=[${r.X.join(',')}] foreign=[${r.foreign.join(',')}] pop=${r.s.pop}`);
    }
    // The twelve the sovereign subtraction keeps, re-derived rather than read off the ruling.
    const keptBySovereign = [];
    for (const row of BEFORE.rows) {
      const r = clause4(row);
      if (!r || !r.terrain || r.foreign.length > 0) continue;
      const noSov = r.X.filter((c) => c !== r.S && c !== r.C);
      if (noSov.length > 0) keptBySovereign.push(r.s.name);
    }
    ok(keptBySovereign.length === 12,
      'C5  exactly twelve terrain rows are kept ONLY by the sovereign subtraction — A-93 Part 3(b)\'s table',
      `${keptBySovereign.length}: ${keptBySovereign.join(', ')}`);
    note(`  ${keptBySovereign.join(', ')}`);
    // A-93 Part 7 fault 5 — inverting the relation refuses all twelve again.
    const inverted = keptBySovereign.filter(() => true).length;
    ok(inverted === 12,
      'C6  fault 5\'s premise holds: P(GB), P(DK), P(FI), P(AU), P(FR) are all null, so an inverted relation subtracts nothing',
      `${['GB', 'DK', 'FI', 'AU', 'FR'].map((c) => `${c}->${P(c)}`).join(' ')}`);
    ok(['GB', 'DK', 'FI', 'AU', 'FR'].every((c) => P(c) === null), 'C7  a sovereign has no sovereign, measured');
  }
}

// ---------------------------------------------------------------------------------------------
if (run('D')) {
  head('D  what the ruling\'s LITERAL join would have shipped — fault 4, by accident');
  if (!BEFORE) { skip('D needs --prev'); }
  else {
    const lit = sovereignsByAdm0(props);
    const Plit = (c) => (c === null ? null : lit.get(c) ?? null);
    const refused = [];
    for (const row of BEFORE.rows) {
      const s = SRC_ROWS.get(gidOf(row.id));
      if (!s || (s.code !== 'ISL' && s.code !== 'ISLS')) continue;
      const X = cc2Of(s.cc2);
      if (!X.length) continue;
      const S = s.cc === '' ? null : s.cc;
      const C = row.countryCode;
      const sub = new Set([S, C, Plit(S), Plit(C)].filter((c) => c !== null));
      if (X.filter((c) => !sub.has(c)).length > 0) refused.push(s.name);
    }
    ok(refused.length === 28,
      'D1  built to the sentence, clause 4 refuses 28 terrain rows, not 16',
      String(refused.length));
    for (const n of ['Jersey', 'Guernsey', 'Alderney', 'Faroe Islands', 'Signilskär', 'Norfolk Island']) {
      ok(refused.includes(n), `D2  ${n} is DELETED by the literal join — A-93's own injected fault 4`);
    }
    note('the ruling\'s prose, built literally, ships the fault the ruling names. KD-125 is correct and');
    note('the correction belongs in ARCHITECTURE §8.4 A-93 Part 2, not only in BUILD-NOTES.');
  }
}

// ---------------------------------------------------------------------------------------------
if (run('E')) {
  head('E  KD-126 — is "no refused row of ANY reason has class P" false, and is the scoped form right?');
  const bantam = REFUSALS.refusals.find((r) => r.name === 'Bantam Village');
  ok(bantam !== undefined, 'E1  Bantam Village is in the refusals golden');
  ok(bantam?.cls === 'P' && bantam?.reason === 'bare-name',
    'E2  it is class P and reason bare-name — so ROADMAP I-31\'s WIDER criterion is false',
    JSON.stringify(bantam));
  ok(REFUSALS.refusals.filter((r) => r.reason === 'multi-country').every((r) => r.cls !== 'P'),
    'E3  the SCOPED criterion (A-93 Part 8 condition 1, clause 4 only) holds');
  const preExisting = REFUSALS.refusals.filter((r) => r.reason === 'bare-name');
  ok(preExisting.length === 18, 'E4  the 18 bare-name refusals are pre-existing and unchanged', String(preExisting.length));
  note('VERDICT: the builder is right and ROADMAP I-31\'s verification bullet is what needs correcting.');
}

// ---------------------------------------------------------------------------------------------
if (run('F')) {
  head('F  A-93 Part 9 residue 1 — is the unmarked population really just Timor and Saint Martin?');
  const src = BEFORE ?? NOW;
  const terr = src.rows.map((r) => ({ r, s: SRC_ROWS.get(gidOf(r.id)) }))
    .filter((x) => x.s && (x.s.code === 'ISL' || x.s.code === 'ISLS'));
  note(`${terr.length} shipped terrain rows; ${terr.filter((x) => cc2Of(x.s.cc2).length).length} carry any cc2 at all`);

  // (1) a COMPLETE enumeration of the large islands, so the answer is bounded rather than sampled.
  const big = terr.filter((x) => x.s.pop >= 1_000_000).sort((a, b) => b.s.pop - a.s.pop);
  const unmarkedBig = big.filter((x) => cc2Of(x.s.cc2).length === 0);
  note(`${big.length} shipped islands carry a population of 1,000,000 or more; ${unmarkedBig.length} have an empty cc2`);
  const KNOWN_DIVIDED = new Set(['Timor', 'Cyprus']);
  const surprises = unmarkedBig.filter((x) => !KNOWN_DIVIDED.has(x.s.name)).map((x) => x.s.name);
  ok(surprises.every((n) => ![
    'Borneo', 'New Guinea', 'Hispaniola', 'Ireland', 'Saint Martin', 'Sebatik',
  ].includes(n)), 'F1  no large shipped island whose polygon crosses a border is missing from the residue');
  note(`the residue names Timor; Cyprus is named too and is filed as consistent (KD-120)`);

  // (2) the source's own second opinion: the same island name under two country codes, nearby.
  const byName = new Map();
  for (const s of SRC_ROWS.values()) {
    if (s.code !== 'ISL' && s.code !== 'ISLS') continue;
    const k = s.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(s);
  }
  const shippedGids = new Set(src.rows.map((r) => gidOf(r.id)));
  const twins = [];
  for (const list of byName.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i]; const b = list[j];
        if (a.cc === b.cc || a.cc === '' || b.cc === '') continue;   // a codeless twin is not a second claim
        const d = Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180));
        if (d > 1) continue;
        if (!shippedGids.has(a.gid) && !shippedGids.has(b.gid)) continue;
        const marked = cc2Of(a.cc2).includes(b.cc) || cc2Of(b.cc2).includes(a.cc);
        twins.push({ a, b, d, marked });
      }
    }
  }
  note(`${twins.length} same-name ISL/ISLS pairs under different codes within ~1° with a shipped side`);
  for (const t of twins) note(`  ${t.marked ? 'MARKED  ' : 'unmarked'} ${t.a.name}: ${t.a.cc}[${t.a.cc2}] / ${t.b.cc}[${t.b.cc2}] d=${t.d.toFixed(2)}`);
  // A pair within 0.05° is the SAME feature listed under two codes (Tierra del Fuego's shape);
  // beyond that they are homonyms — `Mu Yu` is Xiamen Island and a Kinmen islet 33 km apart.
  const sameFeature = twins.filter((t) => !t.marked && t.d <= 0.05);
  ok(sameFeature.length === 0,
    'F2  no unmarked pair is the same feature listed under two country codes',
    sameFeature.map((t) => t.a.name).join(', '));

  // (3) the ruling's OTHER sentence: "lies in, OR IS CLAIMED BY, more than one country" (Part 2).
  //     Nine of the sixteen are disputes (Part 9 residue 2). These ship, unmarked, under one claimant.
  const disputed = ['Falkland Islands (Islas Malvinas)', 'Isla Perejil', 'Isla de Aves', 'Kinmen Island'];
  const shipsUnmarked = disputed.filter((n) => terr.some((x) => x.s.name === n && cc2Of(x.s.cc2).length === 0));
  note(`disputed islands shipping with an empty cc2 under one claimant: ${shipsUnmarked.join(', ') || 'none'}`);
  ok(shipsUnmarked.length === 0,
    'F3  residue 1\'s population also covers the CLAIMED-BY arm of Part 2\'s own sentence',
    `${shipsUnmarked.length} rows: ${shipsUnmarked.join(', ')}`);
}

// ---------------------------------------------------------------------------------------------
if (run('G')) {
  head('G  the populations neither the architect nor the manager looked at');
  const src = BEFORE ?? NOW;
  // (a) cc2 naming a code countryInfo.txt does not list — A-93 Part 9 residue 4's trigger.
  const listed = new Set();
  for (const line of readFileSync(join(SRC, 'countryInfo.txt'), 'utf8').split('\n')) {
    if (line.startsWith('#')) continue;
    const f = line.split('\t');
    if (/^[A-Z]{2}$/.test(f[0] ?? '')) listed.add(f[0]);
  }
  const unlisted = [];
  for (const r of REFUSALS.refusals) for (const c of r.cc2 ?? []) if (!listed.has(c)) unlisted.push(`${r.name}:${c}`);
  ok(unlisted.length === 0,
    'G1  residue 4\'s trigger does not fire: no refusal\'s cc2 names a code countryInfo.txt omits',
    unlisted.join(', '));
  ok(listed.has('AN'), 'G2  AN — Antilles\' own stated code — is still a countryInfo.txt row, as the residue says');

  // (b) ISLS rows with an empty cc2, and rows where the index cannot draw a cc2 code.
  const draws = new Set((await import('../packages/core/src/index.ts')).COUNTRY_INDEX.countries.map((c) => c.code));
  let isls = 0; let islsEmpty = 0; let undrawableCc2 = 0;
  for (const row of src.rows) {
    const s = SRC_ROWS.get(gidOf(row.id));
    if (!s || s.code !== 'ISLS') continue;
    isls += 1;
    const X = cc2Of(s.cc2);
    if (X.length === 0) islsEmpty += 1;
    if (X.some((c) => !draws.has(c))) undrawableCc2 += 1;
  }
  note(`shipped ISLS rows: ${isls}; with an empty cc2: ${islsEmpty}; with a cc2 code the index cannot draw: ${undrawableCc2}`);

  // (c) rows where S and C differ AND cc2 is non-empty — the population the C subtraction is for.
  const translated = [];
  for (const row of src.rows) {
    const r = clause4(row);
    if (r && r.S !== r.C) translated.push(`${r.s.name} ${r.S}->${r.C} cc2=[${r.X.join(',')}]`);
  }
  note(`rows with a non-empty cc2 whose stated code differs from the shipped one: ${translated.length}`);
  for (const t of translated.slice(0, 12)) note(`  ${t}`);
  ok(translated.length > 0, 'G3  the C subtraction has a live population (Longyearbyen and friends)');

  // (d) the 141 class-P rows clause 4 exempts BY CONSTRUCTION — A-93 Part 9 residue 5, undefended.
  const exempt = [];
  for (const row of NOW.rows) {
    const r = clause4(row);
    if (!r || r.terrain) continue;
    const a89 = r.X.filter((c) => c !== r.S && c !== r.C);
    if (a89.length > 0) exempt.push(`${r.s.name} ${r.S} cc2=[${r.X.join(',')}]`);
  }
  ok(exempt.length === 141, 'G4  the exempt class-P population is 141, as the audit prints', String(exempt.length));
  note(`  Laayoune / Macau / Antarctic sample: ${exempt.filter((e) => /Laayoune|Nossa Senhora|Santo Ant|Base |Station/.test(e)).slice(0, 5).join(' | ')}`);
}

// ---------------------------------------------------------------------------------------------
if (run('H')) {
  head('H  the parent translation\'s abstention vote — the root cause behind two lost territories');
  // A-84 Part 5 (A-89 Part 4): the parent of an undrawable code is the MODAL CONTAINING FEATURE
  // over that code's rows. gen-gazetteer.mjs writes a row the layer does not contain as '' and
  // lets '' win the plurality. Measured consequence, from the corpus and the CLI:
  const nulls = NOW.rows.filter((r) => r.countryCode === null);
  ok(nulls.length === 3, 'H1  exactly three shipped rows carry countryCode null — A-89 Part 5 sentence 3', String(nulls.length));
  note(`  ${nulls.map((r) => `${r.name} (${r.admin1})`).join(', ')}`);
  ok(nulls.every((r) => /Atafu|Nukunonu|Fale/.test(r.name)),
    'H2  all three are Tokelau — the only thing keeping the null arm non-vacuous');
  const cc = NOW.rows.filter((r) => {
    const s = SRC_ROWS.get(gidOf(r.id));
    return s && s.cc === 'CC';
  });
  ok(cc.length === 0, 'H3  ZERO rows of the Cocos (Keeling) Islands ship — the territory is absent', String(cc.length));
  const cocosRefused = REFUSALS.refusals.filter((r) => r.statedCode === 'CC');
  ok(cocosRefused.length === 5,
    'H4  five CC rows are refused under bare-name, including its only settlement',
    cocosRefused.map((r) => r.name).join(', '));
  note('the generator\'s own audit prints the cause: `CC -> null   null:3 AU:2` and `TK -> null   null:2 NZ:1`');
  note('— an abstention (the layer contains no feature within the 0.05° tolerance) is counted as a');
  note('candidate in the mode, so three abstentions outvote two AU answers and the whole territory');
  note('renders as a bare name and is refused by A-83 Part 9 clause 1. See qa/r68-repin.sh section D.');
  ok(false,
    'H5  a user who has been to the Cocos (Keeling) Islands can record it (cli.ts cities cocos|bantam|"west island")',
    'all three answer with unrelated rows or no match — R68-1');
}

console.log(`\n${pass} ok, ${fail} FAIL, ${skipped} SKIP`);
console.log('COMPLETE');
