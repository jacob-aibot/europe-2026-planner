/**
 * QA round 69 — **the three measured corrections `I-32`'s builder made, re-derived independently,
 * plus the two construction claims nobody had executed.**
 *
 * Everything here is offline. It reads the committed corpus, the four goldens, the pinned
 * `ne_10m_admin_0_countries.geojson` and `qa/r68-source.mjs`'s cache of the clause-4-relevant rows
 * of `allCountries.txt`. It writes nothing but its own cache. Sections:
 *
 *   **A**  KD-128 — the class-`P` exempt population, re-derived from the committed corpus joined to
 *          the source rows, and the counterfactual that produces `I-32`'s routed 141 in 57.
 *   **B**  KD-128 (cont.) — A-93 Part 7 fault 3's refusal count, **derived offline** rather than by
 *          a 625 MB run: 102 before A-94, 100 after, with `Vatican City` in and `Tórshavn` out.
 *   **C**  KD-129 — the eight source rows by GeoNames id, straight out of `allCountries.txt`.
 *   **D**  A-94 Part 9 fault 3's premise: is there a tie anywhere in the twelve published tallies?
 *   **E**  A-94 Part 6's *"~70 KB on every client fetch"* — the reason the manifest is a golden.
 *
 *   node qa/r69-corrections.mjs           # A B D E  (fast; C needs the zip)
 *   node qa/r69-corrections.mjs A B C D E
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const SRC = process.env.CAIRN_GAZETTEER_CACHE ?? '/tmp/cairn-gazetteer-src';
const CACHE = process.env.CAIRN_R68_CACHE ?? join(tmpdir(), 'cairn-r68');
const ROWS = join(CACHE, 'src-rows.jsonl');
const want = process.argv.slice(2).filter((a) => /^[A-Z]$/.test(a));
const on = (s) => (want.length === 0 ? s !== 'C' : want.includes(s));
let pass = 0; let fail = 0;
const ok = (c, m, extra = '') => { if (c) { pass += 1; console.log(`  ok   ${m}`); } else { fail += 1; console.log(`  FAIL ${m}${extra ? `  — ${extra}` : ''}`); } };
const note = (m) => console.log(`  note ${m}`);
const head = (m) => console.log(`\n== ${m}`);
const golden = (n) => JSON.parse(readFileSync(join(CAIRN, 'fixtures/golden', n), 'utf8'));

const C = await import('./corpus.mjs');
const { gazetteer: W } = C.wholeCorpus();
const byId = new Map(W.rows.map((r) => [r.id, r]));
note(`corpus: ${W.rows.length} rows in ${C.shardFiles().length} shards`);

/** Every class-`P` source row carrying a non-empty `cc2` — the only population §A and §B read. */
async function* classPWithCc2() {
  if (!existsSync(ROWS)) throw new Error(`no cached source rows at ${ROWS} — run: node qa/r68-source.mjs --rebuild`);
  const rl = createInterface({ input: createReadStream(ROWS), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line === '') continue;
    const r = JSON.parse(line);
    if (r.cls === 'P' && r.cc2 !== '') yield r;
  }
}
/** The generator's own `code` at clause 4 is the code the row ships; the corpus carries it. */
const shipped = (r) => byId.get(`gn:${r.gid.toString(36)}`);
/** The counterfactual: before A-94, `codeParent` was `null` for `CC` and `TK` and unmoved elsewhere. */
const preA94Code = (r, row) => (r.cc === 'TK' || r.cc === 'CC' ? null : row.countryCode);

if (on('A')) {
  head('A  KD-128 — the class-P exempt population, re-derived from corpus × source');
  // The generator computes this group on **A-89's** predicate — `X \ {S, C}` — deliberately: it is
  // the price of the class restriction, and the sovereign subtraction is priced separately.
  const now = new Map(); const pre = new Map();
  let nNow = 0; let nPre = 0;
  for await (const r of classPWithCc2()) {
    const row = shipped(r);
    if (row === undefined) continue;               // refused before clause 4, or never a candidate
    const cc2 = r.cc2.split(',').filter(Boolean);
    for (const [era, code, tally] of [['now', row.countryCode, now], ['pre', preA94Code(r, row), pre]]) {
      const a89 = cc2.filter((c) => c !== r.cc && c !== code);
      if (a89.length === 0) continue;
      const key = `${r.cc || 'no code'}+${a89.join(',')}`;
      tally.set(key, (tally.get(key) ?? 0) + 1);
      if (era === 'now') nNow += 1; else nPre += 1;
    }
  }
  const audit = golden('gazetteer-refusals.json').audit.classPExempt;
  ok(nNow === 139 && now.size === 56, `A1  the exempt population is ${nNow} in ${now.size} groups — KD-128's 139 in 56`);
  ok(audit.rows === nNow && audit.groups.length === now.size,
    'A2  the committed golden publishes exactly that', `golden ${audit.rows}/${audit.groups.length}`);
  ok(nPre === 141 && pre.size === 57,
    `A3  and before A-94 it was ${nPre} in ${pre.size} — ROADMAP I-32's routed 141 in 57 is re-derived, not dismissed`);
  const gone = [...pre.keys()].filter((k) => !now.has(k));
  ok(gone.length === 1 && gone[0] === 'TK+NZ', `A4  the one group A-94 removed is ${JSON.stringify(gone)}`);
  const top = [...now].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 4);
  ok(JSON.stringify(top) === JSON.stringify([['FO+DK', 16], ['AX+FI', 15], ['AR+AQ', 11], ['EH+MA', 8]]),
    'A5  the four largest groups are A-93 Part 3(a)\'s own and did not move', JSON.stringify(top));
  // The predicate the ruling's PROSE names is a different one, and it is not the one that gives 139.
  note('the generator groups on A-89\'s X \\ {S, C}; KD-128 and gazetteerArtefact.test.ts both');
  note('describe the set as A-93 Part 2\'s X \\ {S, C, P(S), P(C)} — see §B for what that yields.');
}

/** A-93 Part 2's `P(c)`: the self-governing member of `c`'s own `SOV_A3` group (A-94 Part 4). */
function sovereigns() {
  const buf = readFileSync(join(SRC, 'ne_10m_admin_0_countries.geojson'));
  const sha = createHash('sha256').update(buf).digest('hex');
  const geo = JSON.parse(buf.toString('utf8'));
  const isIso = (v) => typeof v === 'string' && /^[A-Z]{2}$/.test(v);
  const isoOf = (p) => (isIso(p.ISO_A2_EH) ? p.ISO_A2_EH : null);
  const self = new Map();
  for (const f of geo.features) if (f.properties.ADMIN === f.properties.SOVEREIGNT) self.set(f.properties.SOV_A3, f.properties);
  const map = new Map();
  for (const f of geo.features) {
    const code = isoOf(f.properties);
    if (code === null) continue;
    const head2 = self.get(f.properties.SOV_A3);
    const parent = head2 === undefined ? null : isoOf(head2);
    if (parent !== null && parent !== code && !map.has(code)) map.set(code, parent);
  }
  return { sha, map, features: geo.features.length };
}

if (on('B')) {
  head('B  KD-128 (cont.) — A-93 Part 7 fault 3, derived offline instead of by a 625 MB run');
  // Fault 3 is "drop the class restriction": clause 4 refuses ANY row whose
  // `X \ {S, C, P(S), P(C)}` is non-empty. The 16 terrain refusals do not move, so the fault's
  // count is 16 + the class-`P` rows the full subtraction reaches.
  const { sha, map, features } = sovereigns();
  ok(sha === '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255',
    `B0  the pinned admin0 layer is the one the generator names (${features} features)`, sha);
  ok(map.size === 41, `B1  the layer names a distinct sovereign for ${map.size} codes — A-93 Part 3(b)'s 41`);
  const P = (c) => (c === null ? null : map.get(c) ?? null);
  const refused = { now: [], pre: [] };
  for await (const r of classPWithCc2()) {
    const row = shipped(r);
    if (row === undefined) continue;
    const cc2 = r.cc2.split(',').filter(Boolean);
    for (const [era, code] of [['now', row.countryCode], ['pre', preA94Code(r, row)]]) {
      const sub = new Set([r.cc || null, code, P(r.cc || null), P(code)].filter((c) => c !== null));
      if (cc2.some((c) => !sub.has(c))) refused[era].push(r.name);
    }
  }
  const TERRAIN = golden('gazetteer-refusals.json').refusals.filter((x) => x.reason === 'multi-country').length;
  ok(TERRAIN === 16, `B2  the terrain half of the fault is A-93's own sixteen`, String(TERRAIN));
  ok(refused.pre.length + TERRAIN === 102,
    `B3  before A-94 the fault refuses ${refused.pre.length + TERRAIN} rows — round 68's own 102, re-derived rather than defended`);
  ok(refused.now.length + TERRAIN === 100,
    `B4  and on THIS corpus it refuses ${refused.now.length + TERRAIN} — the builder's correction to A-94 Part 7 item 2 holds`);
  const only = refused.pre.filter((n) => !refused.now.includes(n));
  ok(only.length === 2 && only.includes('Nukunonu') && only.includes('Atafu Village'),
    `B5  the two rows that leave are ${JSON.stringify(only)} — the same two as KD-128, for the same reason`);
  ok(refused.now.includes('Vatican City'), 'B6  the fault\'s stated effect: Vatican City IS among the refused (P(VA) is null)');
  ok(!refused.now.includes('Tórshavn'), 'B7  and Tórshavn is NOT (FO -> DK is subtracted)');
  // And the predicate KD-128's prose names, measured: it is not the exempt set's predicate.
  note(`if the exempt set really were X \\ {S, C, P(S), P(C)} it would hold ${refused.now.length} rows, not 139:`);
  note('FO+DK (16) and AX+FI (15) are kept by the SOVEREIGN subtraction, not by the class restriction.');
}

if (on('C')) {
  head('C  KD-129 — the eight rows A-94 Part 1 tabulates, straight out of allCountries.txt');
  const WANT = new Map([[1547351, 'West Island'], [1547382, 'Bantam Village'], [1547348, 'Cocos Islands'],
    [1547357, 'South Island'], [1547371, 'Horsburgh Island'], [7522183, 'Atafu Village'],
    [7522181, 'Nukunonu'], [4031110, 'Fale old settlement']]);
  const cacheFile = join(CACHE, 'r69-a94-rows.json');
  let got;
  if (existsSync(cacheFile)) { got = JSON.parse(readFileSync(cacheFile, 'utf8')); note('from cache'); }
  else {
    const { eachLine } = await import('./r68-source.mjs');
    got = {};
    await eachLine(join(SRC, 'allCountries.zip'), 'allCountries.txt', (line) => {
      const f = line.split('\t');
      const id = Number(f[0]);
      if (!WANT.has(id) && !(f[8] === 'CC' || f[8] === 'TK')) return;
      if (f[8] !== 'CC' && f[8] !== 'TK') return;
      got[id] = { name: f[1], lat: +f[4], lng: +f[5], cls: f[6], code: f[7], cc: f[8], cc2: f[9], admin1: f[10], pop: Number(f[14]) };
    });
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(got, null, 1));
  }
  for (const [id, name] of WANT) {
    const r = got[id];
    if (r === undefined) { note(`${id} ${name}: NOT FOUND under cc=CC/TK`); continue; }
    note(`${id} ${r.name.padEnd(22)} cc=${r.cc} cc2=${JSON.stringify(r.cc2)} ${r.cls}/${r.code} pop=${r.pop}`);
  }
  const wi = got[1547351];
  ok(wi !== undefined && wi.cls === 'T' && wi.code === 'ISL' && wi.pop === 120,
    'C1  West Island is T/ISL population 120 — A-94 Part 1\'s table says P/PPLC, and KD-129 is right');
  const cc = [...WANT.keys()].filter((id) => got[id]?.cc === 'CC').map((id) => got[id]);
  ok(cc.length === 5 && cc.every((r) => r.cc2 === ''),
    `C2  ALL ${cc.length} of A-94 Part 1's CC rows carry an EMPTY cc2 — stronger than Part 2's "the three non-P rows"`);
  ok(cc.filter((r) => r.cls !== 'P').length === 4, 'C3  four of the five are non-P, not three',
    JSON.stringify(cc.map((r) => `${r.name} ${r.cls}/${r.code}`)));
  const allCC = Object.values(got).filter((r) => r.cc === 'CC');
  note(`the dump carries ${allCC.length} rows for CC in all; ${allCC.filter((r) => r.cc2 !== '').length} carry any cc2`);
  const tk = Object.values(got).filter((r) => r.cc === 'TK' && r.cls === 'P' && r.cc2 !== '');
  ok(tk.length === 2 && tk.every((r) => r.cc2 === 'NZ' && r.code === 'PPLA'),
    'C4  and exactly two TK rows are P/PPLA with cc2 = NZ — KD-128\'s two', JSON.stringify(tk.map((r) => [r.name, r.cc2])));
}

if (on('D')) {
  head('D  A-94 Part 9 fault 3 — the premise, checked: is there a tie to break?');
  const { codeTally, codeParent } = golden('gazetteer-parents.json');
  const codes = Object.entries(codeTally);
  ok(codes.length === 12, `D0  twelve published tallies`, String(codes.length));
  const ties = [];
  const nullArm = [];
  for (const [code, t] of codes) {
    const ranked = Object.entries(t.answers).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) ties.push(code);
    if (ranked.length === 0) nullArm.push(code);
    note(`${code} -> ${String(t.parent)}  ${ranked.map(([c, n]) => `${c}:${n}`).join(' ') || '(no answer)'} abstain:${t.abstain} of ${t.candidates}`);
  }
  ok(ties.length === 0, `D1  no code has a tie — the builder's "N3 moves no shipped row BY CONSTRUCTION" holds`, JSON.stringify(ties));
  // ...and that is exactly why nothing can catch an inverted tie-break. A-94 Part 9 fault 3 says
  // "the assertion that the tally is published, per code, with its abstention count, is what
  // catches it". A published tally with no tie in it catches nothing. `qa/r69-gate.sh` §D/§E
  // executes the mutation.
  ok(ties.length > 0, 'D2  ...and therefore SOMETHING pins the tie-break rule', 'nothing does — see qa/r69-gate.sh D1/E1');
  ok(nullArm.length > 0,
    'D3  ...and the re-derivation\'s own `null` arm (a code whose every row abstains, or whose winner the index cannot draw) is exercised by at least one of the twelve',
    'no code exercises it: the null arm of the assertion that is supposed to pin A-94 Part 3\'s null arm is itself vacuous');
  ok(Object.values(codeParent).every((v) => v !== null), 'D4  (recorded) every elected parent is non-null on this corpus');
}

if (on('E')) {
  head('E  A-94 Part 6 — "967 hashes in meta.json would be ~70 KB every client fetches"');
  const m = golden('gazetteer-manifest.json');
  const metaBytes = readFileSync(join(C.CORPUS_DIR, 'meta.json')).length;
  const asMeta = JSON.stringify(Object.fromEntries(m.files.map((f) => [f.file.replace(/\.json$/, ''), f.sha256])));
  note(`manifest: ${m.fileCount} documents, ${m.totalBytes} corpus bytes, ${m.totalRows} emitted rows`);
  note(`meta.json today: ${metaBytes} bytes; the same hashes inlined would add ${asMeta.length} bytes`);
  ok(asMeta.length > 60_000 && asMeta.length < 90_000,
    `E1  inlining the digests really is ~70 KB (${(asMeta.length / 1024).toFixed(0)} KB) — A-94 Part 6's reason for a golden holds`);
  ok(m.fileCount === C.shardFiles().length + 1, `E2  the manifest covers every shard and meta.json`,
    `${m.fileCount} vs ${C.shardFiles().length + 1}`);
  // The manifest is checked offline, by a test that recomputes it from disk — re-run here so the
  // claim is not taken on trust.
  const bad = [];
  for (const f of m.files) {
    const b = readFileSync(join(C.CORPUS_DIR, f.file));
    if (createHash('sha256').update(b).digest('hex') !== f.sha256) bad.push(`${f.file} sha`);
    if (b.length !== f.bytes) bad.push(`${f.file} bytes`);
  }
  ok(bad.length === 0, `E3  every one of the ${m.files.length} digests recomputes off disk`, bad.slice(0, 5).join(', '));
  ok(m.totalBytes === m.files.reduce((n, f) => n + f.bytes, 0), 'E4  and its own totals are its own sums');
}

console.log(`\n  ${pass} ok, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
