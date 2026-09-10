/**
 * **ROADMAP `I-29` — ARCHITECTURE §8.4 A-89, A-90 Part 1 clause 1 and A-83 Part 9 clause 4.**
 *
 * Every claim in this file is a claim about **the committed bytes under
 * `packages/core/src/geo/gazetteer/`**, checked against those bytes, offline, with no network and
 * no generator run. That is A-90 clause 1, and it is what makes the corpus's unreproducibility
 * from source cost the product nothing at rest: **nobody, including us, can rebuild this corpus —
 * GeoNames rebuilds every dump daily, retains one day of `modifications`/`deletes`, and archives
 * nothing, so a past state can be neither refetched nor replayed.** Say that plainly.
 *
 * ---------------------------------------------------------------------------------------------
 * ## Why clause 4 exists, and why the obvious fix is a permanent injected fault here
 *
 * `Antilles` shipped as *"Antilles, Dominican Republic"* at rank 1 for its own name, and
 * `Hispaniola` as *"Hispaniola, Dominican Republic"*. Both reported `{DO, picked}` through
 * `cityPickFromRow` → `createTrip` → `tripSummary`, so **a traveller to Haiti who typed
 * *Hispaniola* got the Dominican Republic on their lifetime map.**
 *
 * The obvious fix — move A-83 Part 9 clause 1's bare-name refusal ahead of A-84 Part 5's parent
 * translation — was implemented, MEASURED and reverted (**KD-122**). It deletes **nine correct
 * rows to remove one sea**, and it never reaches `Hispaniola` at all, which states `DO` outright
 * and renders bare under no ordering. **The predicate is wrong, not its position.** Clause 1 asks
 * *"would this render as a bare name"*, and that question cannot tell a multi-country landmass
 * from a territory whose parent the translation deliberately fills in: both are a row with no
 * region and no drawable code of its own.
 *
 * Clause 4 is a separate, orthogonal refusal on a column GeoNames already publishes and the corpus
 * never shipped — `allCountries` column 10, **`cc2`**:
 *
 * > With `S` the row's stated code, `C` the code it would ship after the translation and `X` the
 * > uppercased, trimmed set of non-empty codes in `cc2`: **the row is REFUSED when `X \ {S, C}` is
 * > non-empty** — when the source's own row names a country that is neither the country the row
 * > states nor the country we attribute it to.
 *
 * **Both subtractions are load-bearing.** `Hispaniola`'s `cc2` is `HT,DO` — GeoNames names Haiti
 * itself — and `Antilles`' names twenty countries, while all nine rescued rows leave the column
 * **empty**. A naive *"`cc2` is non-empty"* refusal is a different rule that deletes Longyearbyen,
 * whose `cc2` names the parent the translation just supplied; that is **fault N2** and it is the
 * control below.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { decodeGazetteer, decodeGazetteerMeta } from '../src/geo/gazetteer.ts';
import type { Gazetteer, GazetteerRow } from '../src/geo/gazetteer.ts';
import { COUNTRY_INDEX } from '../src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(HERE, '..', 'src', 'geo', 'gazetteer');
const GOLDEN = resolve(HERE, '..', '..', '..', 'fixtures', 'golden');

const metaDoc = () => JSON.parse(readFileSync(resolve(CORPUS, 'meta.json'), 'utf8')) as Record<string, unknown>;

let WHOLE: Gazetteer | null = null;
const whole = (): Gazetteer => {
  if (WHOLE !== null) return WHOLE;
  const meta = decodeGazetteerMeta(metaDoc());
  const byId = new Map<string, GazetteerRow>();
  for (const name of readdirSync(CORPUS).filter((n) => n !== 'meta.json' && n.endsWith('.json')).sort()) {
    const doc: unknown = JSON.parse(readFileSync(resolve(CORPUS, name), 'utf8'));
    for (const row of decodeGazetteer(meta, doc).rows) if (!byId.has(row.id)) byId.set(row.id, row);
  }
  WHOLE = { source: meta.source, shard: null, countryNames: meta.countryNames, rows: [...byId.values()] };
  return WHOLE;
};

/** Every shipped row with this exact `name`. Named rather than folded: these are stated outcomes. */
const named = (name: string): GazetteerRow[] => whole().rows.filter((r) => r.name === name);

// ---------------------------------------------------------------------------------------------
// A-89 Part 1 — the two defects are gone, and the nine are not.
// ---------------------------------------------------------------------------------------------

/**
 * **The defect a user meets by typing a place they have been to.** Asserted over the whole corpus
 * rather than over one shard, because *"absent"* is a claim about every shard there is.
 */
test('A-89: Antilles and Hispaniola are absent from every shard', { skip: 'ROADMAP I-29 stop-and-report condition 1 FIRED — A-83 Part 9 clause 4 is implemented in tools/gen-gazetteer.mjs and NOT ENABLED (CLAUSE_4_ENABLED), so the corpus is unchanged and these two rows still ship. Measured: the predicate as A-89 rules it matches 169 rows, 6 of them over 100,000 people and named nowhere in the ruling (Borneo, New Guinea, Laayoune, Santo Antonio, Nossa Senhora de Fatima, Dakhla), plus Vatican City and four capitals. Enabling it is an architect ruling, not a builder decision. See BUILD-NOTES.' }, () => {
  for (const name of ['Antilles', 'Hispaniola']) {
    assert.deepEqual(
      named(name).map((r) => `${r.name} / ${r.countryCode} / ${r.id}`),
      [],
      `${name} still ships. A-83 Part 9 clause 4 refuses a row whose cc2 names a country that is ` +
        'neither its stated code nor the code we attribute it to.',
    );
  }
});

/**
 * **The positive half of A-89 Part 7 fault 1, which the ruling asks for by name**: it is not
 * enough that a search misses the row; there must be **no row to give** the pick minter. If a
 * refused row survived under a different label, `cityPickFromRow` could still be handed it.
 */
test('A-89: no shipped row anywhere carries the Hispaniola or Antilles GeoNames id', { skip: 'ROADMAP I-29 stop-and-report condition 1 FIRED — A-83 Part 9 clause 4 is implemented in tools/gen-gazetteer.mjs and NOT ENABLED (CLAUSE_4_ENABLED), so the corpus is unchanged and these two rows still ship. Measured: the predicate as A-89 rules it matches 169 rows, 6 of them over 100,000 people and named nowhere in the ruling (Borneo, New Guinea, Laayoune, Santo Antonio, Nossa Senhora de Fatima, Dakhla), plus Vatican City and four capitals. Enabling it is an architect ruling, not a builder decision. See BUILD-NOTES.' }, () => {
  // gn:<base36 of the GeoNames id> — A-89 Part 2's table: 3504558 and 3491552.
  const forbidden = new Set([`gn:${(3504558).toString(36)}`, `gn:${(3491552).toString(36)}`]);
  const found = whole().rows.filter((r) => forbidden.has(r.id)).map((r) => `${r.id} ${r.name}`);
  assert.deepEqual(found, [], 'a refused row is still in the corpus under its id');
});

/**
 * **N1, injected and permanent: restore KD-122's ordering fix → all nine of these redden, naming
 * all nine.** It is the wrong fix, it is four lines, and it is the one a future builder will
 * re-derive from the finding alone. The fault stays in this suite for exactly that reason.
 *
 * Each row's expected code is A-89 Part 1's own table, resolved through A-84 Part 5's translation:
 * these are the rows the translation exists to produce, and *"Guadeloupe, France"* is its point.
 */
test('A-89: each of the nine rows the ordering fix would delete still ships, named individually', () => {
  const NINE: ReadonlyArray<readonly [string, string]> = [
    ['Guadeloupe', 'FR'],
    ['Grande-Terre', 'FR'],
    ['La Désirade', 'FR'],
    ['Devils Island', 'FR'],
    ['Flying Fish Cove', 'AU'],
    ['Bouvetøya', 'NO'],
    ['Hornsund', 'NO'],
    ['Klovningen', 'NO'],
    ['Chissioua Mtsamboro', 'FR'],
  ];
  const missing: string[] = [];
  const wrong: string[] = [];
  for (const [name, code] of NINE) {
    const rows = named(name);
    if (rows.length === 0) { missing.push(name); continue; }
    if (!rows.some((r) => r.countryCode === code)) {
      wrong.push(`${name} ships ${rows.map((r) => String(r.countryCode)).join('/')}, not ${code}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    '\n  These rows are what A-84 Part 5\'s parent translation EXISTS to produce, and refusing a\n' +
      '  bare name before the translation deletes every one of them to remove one sea (KD-122).\n' +
      '  The refusal to widen is clause 4, on cc2 — not clause 1 moved.\n',
  );
  assert.deepEqual(wrong, [], `\n  ${wrong.join('\n  ')}\n`);
});

/**
 * **N2's control, and it is the whole of what the `C` subtraction buys.**
 *
 * Every row here has a **non-empty** `cc2` that names its sovereign parent — the code A-84 Part 5's
 * translation itself just supplied — so a refusal on non-emptiness alone deletes all ten.
 * **A clause-4 implementation that does not redden this is not clause 4.**
 */
test('A-89 N2 control: the rows whose cc2 names the parent the translation supplied still ship', () => {
  // **Measured against the corpus rather than copied from the ruling.** A-89 Part 7 fault 2 names
  // ten rows; its sweep was over 14 per-country files, and **five of those ten do not clear A-83
  // Part 3's selection gates and have never shipped** — `Jan Mayen`, `Lars Island`, `Sveagruva`,
  // `Oyster Pond` and `Anse Marcel`. Asserting them would be asserting a row that was never there,
  // which is a green test that measures nothing. These five DO ship, and N2 deletes every one.
  const KEPT: ReadonlyArray<readonly [string, string | null]> = [
    ['Longyearbyen', 'NO'],
    ['Barentsburg', 'NO'],
    ['Ny-Ålesund', 'NO'],
    ['Olonkinbyen', 'NO'],
    ['Grand-Case', 'MF'],
  ];
  const gone: string[] = [];
  const wrong: string[] = [];
  for (const [name, code] of KEPT) {
    const rows = named(name);
    if (rows.length === 0) { gone.push(name); continue; }
    if (code !== null && !rows.some((r) => r.countryCode === code)) {
      wrong.push(`${name} ships ${rows.map((r) => String(r.countryCode)).join('/')}, not ${code}`);
    }
  }
  assert.deepEqual(
    gone,
    [],
    '\n  A refusal on "cc2 is non-empty" deletes these — their cc2 names the sovereign parent, not\n' +
      '  a second country. The predicate is X \\ {S, C}, and BOTH subtractions are load-bearing.\n',
  );
  assert.deepEqual(wrong, [], `\n  ${wrong.join('\n  ')}\n`);
});

// ---------------------------------------------------------------------------------------------
// A-89 Part 3 / R67-10 — the refusals are nameable again.
// ---------------------------------------------------------------------------------------------

type RefusalsGolden = {
  byReason: Record<string, number>;
  total: number;
  refusals: Array<{ id: string; name: string; statedCode: string | null; admin1: string; cc2: string[]; reason: string }>;
};

const refusalsGolden = (): RefusalsGolden =>
  JSON.parse(readFileSync(resolve(GOLDEN, 'gazetteer-refusals.json'), 'utf8')) as RefusalsGolden;

/**
 * A-83 Part 11 repurposed `gazetteer-refusals.json` into `gazetteer-disagreements.json`, so the
 * rows the generator refuses were published **nowhere** except as a count in a generated header.
 * *"A deliberate hole, countable, nameable and reviewable"* stopped being true of the refusals the
 * moment the file that held them was reused for something else, and KD-120's claim that A-83 Part
 * 9's named archipelagos were among them was **not checkable from this repository** — only the
 * negative was.
 */
test('R67-10: every refusal carries a reason from the closed set', () => {
  const CLOSED = new Set(['bare-name', 'unreadable', 'delimiter', 'multi-country']);
  const golden = refusalsGolden();
  assert.ok(golden.refusals.length > 0, 'the refusals golden is empty');
  const bad = golden.refusals.filter((r) => !CLOSED.has(r.reason)).map((r) => `${r.name}: ${r.reason}`);
  assert.deepEqual(bad, [], `reasons outside {${[...CLOSED].join(', ')}}`);
  assert.equal(golden.total, golden.refusals.length, 'the golden\'s own total disagrees with its rows');
});

/**
 * **N3, injected: compute the header's counts BESIDE the golden instead of FROM it** → delete one
 * row from the golden and the counts still agree, and this reddens. A count in a generated header
 * that no file can be checked against is the same defect as a census with no denominator (§0
 * position 10a), one artefact out.
 */
test('R67-10: the generated header\'s per-reason counts ARE this file\'s group sizes', () => {
  const golden = refusalsGolden();
  const sizes: Record<string, number> = {};
  for (const r of golden.refusals) sizes[r.reason] = (sizes[r.reason] ?? 0) + 1;
  for (const reason of ['bare-name', 'unreadable', 'delimiter', 'multi-country']) sizes[reason] ??= 0;
  assert.deepEqual(
    golden.byReason,
    sizes,
    'the golden\'s published counts are not the sizes of its own groups — so they were computed ' +
      'beside the file rather than read from it, and a row can be deleted without moving them.',
  );

  const header = readFileSync(resolve(CORPUS, '..', 'gazetteerShards.gen.ts'), 'utf8');
  for (const [reason, n] of Object.entries(sizes)) {
    assert.match(
      header,
      new RegExp(`${n}\\s+${reason}`),
      `the generated header does not carry "${n} ${reason}" — its counts must be read from the ` +
        'refusals golden, not computed beside it.',
    );
  }
});

/**
 * **KD-120's claim becomes checkable from this repository**, which is the whole reason Part 3
 * exists. A-83 Part 9 clause 1 names seven archipelagos and island groups as its measured cost;
 * before the golden came back, only the negative — *"they do not ship"* — could be checked, and a
 * hole nobody can name is not a deliberate hole.
 */
test('R67-10: A-83 Part 9\'s seven named archipelagos are in the golden with reason bare-name', () => {
  const golden = refusalsGolden();
  const byReason = new Map(golden.refusals.map((r) => [r.name, r.reason]));
  const SEVEN = [
    'Woody Island', 'Southwest Cay', 'Loaita Island', 'Channel Islands',
    'Lesser Antilles', 'Virgin Islands', 'French West Indies',
  ];
  const wrong = SEVEN
    .map((n) => [n, byReason.get(n)] as const)
    .filter(([, reason]) => reason !== 'bare-name')
    .map(([n, reason]) => `${n}: ${reason ?? 'ABSENT from the golden'}`);
  assert.deepEqual(wrong, [], `\n  ${wrong.join('\n  ')}\n`);
});

/** The two defects are in the golden, by name, with the reason a human can rule on. */
test('R67-10: Antilles and Hispaniola are published as multi-country refusals, with their cc2', { skip: 'ROADMAP I-29 stop-and-report condition 1 FIRED — A-83 Part 9 clause 4 is implemented in tools/gen-gazetteer.mjs and NOT ENABLED (CLAUSE_4_ENABLED), so the corpus is unchanged and these two rows still ship. Measured: the predicate as A-89 rules it matches 169 rows, 6 of them over 100,000 people and named nowhere in the ruling (Borneo, New Guinea, Laayoune, Santo Antonio, Nossa Senhora de Fatima, Dakhla), plus Vatican City and four capitals. Enabling it is an architect ruling, not a builder decision. See BUILD-NOTES.' }, () => {
  const golden = refusalsGolden();
  const rows = new Map(golden.refusals.map((r) => [r.name, r]));

  const hisp = rows.get('Hispaniola');
  assert.ok(hisp !== undefined, 'Hispaniola is refused but not published');
  assert.equal(hisp.reason, 'multi-country');
  assert.deepEqual([...hisp.cc2].sort(), ['DO', 'HT'], 'GeoNames names Haiti itself on that row');

  const ant = rows.get('Antilles');
  assert.ok(ant !== undefined, 'Antilles is refused but not published');
  assert.equal(ant.reason, 'multi-country');
  assert.ok(ant.cc2.includes('HT') && ant.cc2.includes('CU'), 'Antilles\' cc2 names twenty countries');

  // A-89 Part 8 residue 2, made reviewable rather than silent: a human can read this group and
  // rule on it. `Trachóni` is a real village inside a UK Sovereign Base Area and is refused
  // deliberately — Cairn does not adjudicate which of two jurisdictions a traveller was in.
  const multi = golden.refusals.filter((r) => r.reason === 'multi-country');
  assert.ok(multi.length >= 2, 'the multi-country group is smaller than its two named members');
});

// ---------------------------------------------------------------------------------------------
// A-84 Part 5 as amended by A-89 Parts 4 and 5 — the ceiling, and the named outcomes.
// ---------------------------------------------------------------------------------------------

/**
 * **The ceiling, and it is a ceiling (ROADMAP *How a criterion is written* rule 4).** Every
 * shipped row's `countryCode` is `null` or a code `COUNTRY_INDEX` can draw. Zero exceptions.
 *
 * **N5, injected — resolve the parent per row rather than per code — leaves this GREEN**, which is
 * exactly why the named outcomes below are asserted separately and are not decoration.
 */
test('A-84 Part 5: every shipped row ships a drawable country code or null — zero exceptions', () => {
  const draws = new Set(COUNTRY_INDEX.countries.map((c) => c.code));
  const bad = whole().rows
    .filter((r) => r.countryCode !== null && !draws.has(r.countryCode))
    .map((r) => `${r.name} carries ${r.countryCode}`);
  assert.deepEqual(bad, [], `${bad.length} shipped rows carry a code COUNTRY_INDEX cannot draw`);
});

/**
 * **N4, injected: delete the 0.05° coastal tolerance** → Longyearbyen, Basse-Terre and Dzaoudzi
 * ship `null` and this reddens naming them. GeoNames settlement coordinates fall in water at
 * 1:10m where Natural Earth's label points did not — 0.4 km, 1.4 km and 1.2 km offshore.
 *
 * **N5, injected: resolve the parent per row** → `Saint-Georges` ships `BR`, a French commune on a
 * traveller's lifetime map as Brazil because it sits across a river from it. **Saint-Georges alone
 * earns the per-code modal parent** (A-89 Part 4; KD-119's Mayotte justification is withdrawn —
 * with the tolerance in, `YT` is `FR × 51`).
 */
test('A-84 Part 5: the parent translation\'s named outcomes, each asserted individually', () => {
  const OUTCOMES: ReadonlyArray<readonly [string, string]> = [
    ['Fort-de-France', 'FR'],
    ['Basse-Terre', 'FR'],
    ['Dzaoudzi', 'FR'],
    ['Longyearbyen', 'NO'],   // N4's first casualty
    ['Saint-Georges', 'FR'],  // N5's only casualty, and the row that earns the modal parent
  ];
  const wrong: string[] = [];
  for (const [name, code] of OUTCOMES) {
    const rows = named(name);
    if (rows.length === 0) { wrong.push(`${name}: ABSENT from the corpus`); continue; }
    if (!rows.some((r) => r.countryCode === code)) {
      wrong.push(`${name} ships ${rows.map((r) => String(r.countryCode)).join('/')}, not ${code}`);
    }
  }
  assert.deepEqual(wrong, [], `\n  ${wrong.join('\n  ')}\n`);
});

/**
 * **R67-4: the `null` arm is not vacuous, and this is what exercises it.**
 *
 * A-84 Part 5's rule — *Cairn does not adjudicate a sovereignty its own map cannot draw* — stands.
 * Its **example** was withdrawn at revision 70: Hargeysa ships `SO` from its own GeoNames row,
 * Famagusta and Kyrenia ship `CY`, all three with `indexSays: 'silent'`. What actually reaches the
 * `null` arm in this corpus is Tokelau: no country from any source, honestly, and each row carries
 * a region so none of them renders bare.
 *
 * **Any future ruling that takes this count to zero is deleting the arm and must say so.**
 *
 * **N6, injected: translate a codeless row the layer does not contain** → *"Lesser Antilles,
 * France"* ships and the golden's `bare-name` group shrinks.
 */
test('R67-4: exactly the three Tokelau rows ship countryCode: null, each with a region', () => {
  const nulls = whole().rows.filter((r) => r.countryCode === null);
  assert.deepEqual(
    [...new Set(nulls.map((r) => r.name))].sort(),
    ['Atafu Village', 'Fale old settlement', 'Nukunonu'],
    'the population of the null arm moved',
  );
  const bare = nulls.filter((r) => r.admin1 === '').map((r) => r.name);
  assert.deepEqual(bare, [], 'a null-country row carries no region and would render as a bare name');
});

/** A-89 Part 5 sentence 2, as a positive: the three rows the withdrawn example named do ship. */
test('R67-4: Hargeysa ships SO and Famagusta ships CY — the withdrawn example, corrected', () => {
  for (const [name, code] of [['Hargeysa', 'SO'], ['Famagusta', 'CY']] as const) {
    const rows = named(name);
    assert.ok(rows.length > 0, `${name} is absent from the corpus`);
    assert.ok(
      rows.some((r) => r.countryCode === code && r.indexSays === 'silent'),
      `${name} does not ship ${code} with indexSays "silent"; got ` +
        rows.map((r) => `${r.countryCode}/${r.indexSays}`).join(', '),
    );
  }
});

// ---------------------------------------------------------------------------------------------
// A-90 — the corpus is the artefact of record, and the source log says what it was built from.
// ---------------------------------------------------------------------------------------------

type SourceLog = {
  entries: Array<{ fetched: string; source: string; bytes: number; sha256: string; previousSha256: string | null }>;
};

const sourceLog = (): SourceLog =>
  JSON.parse(readFileSync(resolve(GOLDEN, 'gazetteer-source-log.json'), 'utf8')) as SourceLog;

/**
 * **A-90 clause 3 — the source log is APPEND-ONLY, and that is a property a test asserts rather
 * than a comment at the top of the file** (Part 5 residue 2: `npm run golden` regenerates goldens,
 * and the first person to regenerate this one truncates the history).
 *
 * The shape a test can hold without a previous commit to diff against: entries are ordered, each
 * `previousSha256` is either `null` (the first entry for that source) or the `sha256` of the
 * previous entry for the same source, so the chain is checkable from the file alone. Break a link
 * — which is what a truncation in the middle does — and this reddens.
 *
 * **N7, injected: truncate the log and regenerate** → the chain's head no longer starts at `null`
 * for a source that has an earlier entry, and the link assertion reddens.
 */
test('A-90: the source log is a checkable append-only chain, per source', () => {
  const log = sourceLog();
  assert.ok(log.entries.length > 0, 'the source log has no entries');
  const lastFor = new Map<string, string>();
  const broken: string[] = [];
  for (const e of log.entries) {
    const previous = lastFor.get(e.source) ?? null;
    if (e.previousSha256 !== previous) {
      broken.push(
        `${e.source} @ ${e.fetched}: previousSha256 ${String(e.previousSha256)}, but the entry ` +
          `before it in this file carries ${String(previous)}`,
      );
    }
    assert.match(e.sha256, /^[0-9a-f]{64}$/, `${e.source}: sha256 is not a sha256`);
    assert.ok(Number.isInteger(e.bytes) && e.bytes > 0, `${e.source}: bytes is not a byte count`);
    lastFor.set(e.source, e.sha256);
  }
  assert.deepEqual(broken, [], `\n  ${broken.join('\n  ')}\n`);
});

/**
 * **A-90 clause 2 — `$sourceSha256` RECORDS what this corpus was built from; it does not PIN bytes
 * anyone can obtain again.** A checksum is a *fence*: it proves what a build was made from and
 * refuses a build made from anything else. It is not a *pin*: for a publisher that archives
 * nothing, it does not let anyone obtain those bytes a second time. The two are not substitutes,
 * and the difference surfaces exactly once — at the first regeneration, as a red audit through no
 * error of the person who ran it (KD-123).
 *
 * The document has to say so, so the next agent does not re-derive it at the next regeneration.
 */
test('A-90: the corpus documents say the checksum RECORDS rather than pins', () => {
  const what = String(metaDoc().$what);
  assert.match(
    what,
    /records/i,
    'meta.json\'s $what still describes $sourceSha256 as a pin. A-90 clause 2: it records what ' +
      'this corpus was built from and cannot obtain those bytes again.',
  );
  assert.equal(
    /\bpins\b/.test(what),
    false,
    'meta.json\'s $what claims to PIN bytes. GeoNames retains one day of modifications and no ' +
      'dated archive of any dump: a past state can be neither refetched nor replayed.',
  );
  // Verified 2026-09-10 and stated where the auditor reads it, not implied away.
  const header = readFileSync(resolve(CORPUS, '..', 'gazetteerShards.gen.ts'), 'utf8');
  assert.match(
    header,
    /cannot be rebuilt from|nobody.{0,30}can rebuild/i,
    'the generated header does not say plainly that the corpus cannot be rebuilt from source ' +
      '(§0 position 11).',
  );
});

/** A-90 clause 2: the byte length rides beside the hash, so a mismatch can be DIAGNOSED. */
test('A-90: every source in the log carries its byte length beside its hash', () => {
  const byName = new Map<string, number>();
  for (const e of sourceLog().entries) byName.set(e.source, e.bytes);
  for (const source of ['allCountries', 'alternateNames', 'admin1', 'countryInfo', 'admin0']) {
    assert.ok(byName.has(source), `the source log never names ${source}`);
  }
});
