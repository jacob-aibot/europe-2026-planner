/**
 * **ROADMAP `I-32` — ARCHITECTURE §8.4 A-94 Parts 2 and 3, read with A-84 Part 5 and A-89 Parts 4
 * and 5. QA R68-1.**
 *
 * Every claim in this file is a claim about **the committed bytes under
 * `packages/core/src/geo/gazetteer/`** and the committed goldens beside them, checked offline with
 * no network and no generator run (A-90 clause 1).
 *
 * ---------------------------------------------------------------------------------------------
 * ## An abstention is not a vote
 *
 * `node cli.ts cities "west island"` returned **no match**. West Island is the **capital of the
 * Cocos (Keeling) Islands**, and the whole territory shipped **zero rows**: all five of its
 * candidates sat in `gazetteer-refusals.json` under `reason: 'bare-name'`. (Four of the five are
 * `T/ISL` or `T/ISLS` and one is `P/PPL`; A-94 Part 1's table calls `West Island` `P/PPLC` and the
 * row in this corpus is the island — **KD-129**, which changes no outcome.)
 *
 * The chain, from A-94 Part 1. `CC` is not a code `COUNTRY_INDEX` draws, so A-84 Part 5's parent
 * translation ran, and it resolves a parent **per stated code, modally** (A-89 Part 4). The layer
 * — `ne_10m_admin_0_countries.geojson` at the pinned sha256 — carries no feature spelled `CC`; it
 * carries **`Indian Ocean Territories`** (`ISO_A2 = -99`, **`ISO_A2_EH = AU`**, `SOV_A3 = AU1`,
 * `SOVEREIGNT = Australia`), whose polygons **are** the Cocos atolls. Two of the five rows fall
 * inside its 0.05° tolerance and answer **`AU`**. The other three miss it by **0.0501°, 0.0510°
 * and 0.1267°** — about eleven metres of coastline generalisation at 1:10m — and the layer has no
 * opinion about them.
 *
 * The generator wrote each of those three silences into the ballot as the key `''` and took the
 * plurality **including** it: `CC → null (null:3 AU:2)`. Every `CC` row then shipped
 * `countryCode: null` with no `admin1`, and A-83 Part 9 clause 1 refused all five as bare names.
 * The tie-break made it worse rather than better — `''` sorts first, so on a tie the silence also
 * won. The same artefact gave `TK → null (null:2 NZ:1)`.
 *
 * > **A-94 Part 2.** The modal parent of a stated code is the plurality over the **answers** the
 * > layer gives. A row the layer neither contains nor places within the tolerance contributes
 * > **nothing** — it is a row the layer has no opinion about, not a row the layer says has no
 * > country. A tie between answers breaks on the **lowest ISO code**. A code **all** of whose
 * > candidate rows abstain has no modal parent and its rows ship `null`, exactly as before. **The
 * > election is published, not summarised**: the full per-code tally, abstentions beside the
 * > answers, is in `gazetteer-parents.json`.
 *
 * **The alternatives, rejected on measurement** (A-94 Part 2). *Widening the tolerance* to 0.06°
 * recovers three of the five rows and re-decides all 152 translated rows — a dial, and `I-32`'s
 * fault **N2**. *Resolving the parent per row* is already an injected fault: it ships
 * `Saint-Georges`, a French commune, as `BR`. *Leaving it* is A-93 Part 3(a)'s own sentence read
 * backwards — deleting an inhabited territory is a worse answer than the imperfect one its own
 * rows give.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { decodeGazetteer, decodeGazetteerMeta, searchGazetteer } from '../src/geo/gazetteer.ts';
import type { Gazetteer, GazetteerRow } from '../src/geo/gazetteer.ts';
import { loadGazetteerFor } from '../src/geo/gazetteerShards.gen.ts';
import { COUNTRY_INDEX } from '../src/index.ts';
import { electParent } from '../../../tools/elect-parent.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(HERE, '..', 'src', 'geo', 'gazetteer');
const GOLDEN = resolve(HERE, '..', '..', '..', 'fixtures', 'golden');

let WHOLE: Gazetteer | null = null;
/** Every shipped row, from every shard, decoded — *"ships"* is a claim about the whole corpus. */
const whole = (): Gazetteer => {
  if (WHOLE !== null) return WHOLE;
  const meta = decodeGazetteerMeta(JSON.parse(readFileSync(resolve(CORPUS, 'meta.json'), 'utf8')));
  const byId = new Map<string, GazetteerRow>();
  for (const name of readdirSync(CORPUS).filter((n) => n !== 'meta.json' && n.endsWith('.json')).sort()) {
    const doc: unknown = JSON.parse(readFileSync(resolve(CORPUS, name), 'utf8'));
    for (const row of decodeGazetteer(meta, doc).rows) if (!byId.has(row.id)) byId.set(row.id, row);
  }
  WHOLE = { source: meta.source, shard: null, countryNames: meta.countryNames, rows: [...byId.values()] };
  return WHOLE;
};

const byId = (id: string): GazetteerRow | undefined => whole().rows.find((r) => r.id === id);

type Refusal = {
  id: string; name: string; statedCode: string | null; shippedCode: string | null;
  admin1: string; cc2: string[]; cls: string; population: number; reason: string;
};
type Refusals = { total: number; byReason: Record<string, number>; refusals: Refusal[] };
const refusals = (): Refusals =>
  JSON.parse(readFileSync(resolve(GOLDEN, 'gazetteer-refusals.json'), 'utf8')) as Refusals;

type Tally = {
  parent: string | null;
  answers: Record<string, number>;
  noIsoCode: number;
  abstain: number;
  candidates: number;
};
type Parents = {
  codeParent: Record<string, string | null>;
  codeTally: Record<string, Tally>;
  parents: Array<{ id: string; name: string; statedCode: string; shippedCode: string | null }>;
};
const parents = (): Parents =>
  JSON.parse(readFileSync(resolve(GOLDEN, 'gazetteer-parents.json'), 'utf8')) as Parents;

// ---------------------------------------------------------------------------------------------
// A-94 Part 1 and Part 2 — the territory is reachable.
// ---------------------------------------------------------------------------------------------

/**
 * **The five rows, each named by its GeoNames id**, because *"the Cocos Islands ship"* and
 * *"`gn:x5xz` ships"* are different assertions and only the second one survives a corpus swap
 * silently substituting a different row.
 *
 * **N1, injected — put the abstention back on the ballot** (one line at the election): all five
 * redden by name, and the refusals golden's `bare-name` group returns to 18. **That fault is
 * permanent**: it is the shipped behaviour of two revisions.
 */
const COCOS: ReadonlyArray<readonly [string, string]> = [
  ['gn:x5xz', 'West Island'],
  ['gn:x5yu', 'Bantam Village'],
  ['gn:x5y5', 'South Island'],
  ['gn:x5yj', 'Horsburgh Island'],
  ['gn:x5xw', 'Cocos Islands'],
];

test('A-94 Part 2: all five Cocos (Keeling) rows ship AU, each named by GeoNames id', () => {
  const got = COCOS.map(([id]) => {
    const row = byId(id);
    return row === undefined ? `${id} ABSENT` : `${id} ${row.name} ${String(row.countryCode)}`;
  });
  assert.deepEqual(
    got,
    COCOS.map(([id, name]) => `${id} ${name} AU`),
    'the Cocos (Keeling) Islands are missing from the corpus, or ship the wrong country. A-94 ' +
      'Part 2: the layer CONTAINS two of these five inside Indian Ocean Territories ' +
      '(ISO_A2_EH = AU) and has no opinion about the other three; an abstention is not a vote.',
  );
});

/** The two the ruling names as the user-facing symptom, through the loader a consumer uses. */
test('A-94 Part 1: "west island" and "bantam" resolve, labelled Australia', async () => {
  for (const [query, id, name] of [
    ['west island', 'gn:x5xz', 'West Island'],
    ['bantam', 'gn:x5yu', 'Bantam Village'],
  ] as const) {
    const gazetteer = await loadGazetteerFor(query);
    assert.ok(gazetteer, `"${query}" does not resolve to a shard`);
    const hits = searchGazetteer(query, gazetteer, { limit: 20 });
    const hit = hits.find((h) => h.id === id);
    assert.ok(
      hit !== undefined,
      `"${query}" does not return ${name} (${id}). Got: ${hits.map((h) => h.label).join(' | ') || 'no match'}`,
    );
    assert.equal(hit.name, name);
    assert.match(
      hit.label,
      /, Australia$/,
      `${name}'s label does not end in the country the layer's own containing feature names: ${hit.label}`,
    );
  }
});

/**
 * The other half of the same fact: they are **gone from the refusals**, and the group they left is
 * the size the ruling states. A row that both ships and is published as refused would mean the
 * refusal list had stopped describing the corpus.
 */
test('A-94 Part 2: the five leave the refusals golden and the bare-name group is 13', () => {
  const doc = refusals();
  const stillRefused = doc.refusals.filter((r) => COCOS.some(([id]) => id === r.id));
  assert.deepEqual(stillRefused.map((r) => `${r.id} ${r.name} ${r.reason}`), [],
    'a Cocos (Keeling) row is still published as refused');
  const bare = doc.refusals.filter((r) => r.reason === 'bare-name');
  assert.equal(bare.length, 13, 'the bare-name group is not 13 rows (A-94 Part 2: 18 - 5)');
  assert.equal(doc.byReason['bare-name'], 13, 'the header count is not the group size');
  assert.deepEqual(
    bare.filter((r) => r.statedCode !== null).map((r) => `${r.id} ${r.name} ${String(r.statedCode)}`),
    [],
    'a bare-name refusal still carries a stated country code. After A-94 the whole bare-name ' +
      'group is the CODELESS arm — rows the layer does not contain and GeoNames gives no code.',
  );
});

// ---------------------------------------------------------------------------------------------
// A-94 Part 3 — the declared price: the shipped `null` arm goes to zero, and it is said out loud.
// ---------------------------------------------------------------------------------------------

/**
 * **A-89 Part 5 sentence 3 demanded that a ruling taking this count to zero SAY so, and A-94
 * Part 3 says it.** The three rows that exercised the shipped `null` arm were exactly the three
 * Tokelau rows; `TK`'s parent was `null` only because two abstentions outvoted the layer's one
 * answer. They now ship `NZ`, keeping their ids, names and regions.
 *
 * **This file deliberately does NOT assert that the shipped `null` count is zero** (A-94 Part 3
 * item 4). A count of zero is satisfied by deleting the arm, which is the exact failure A-89
 * Part 5 sentence 3 was written against. The arm is asserted **by its mechanism**: the type still
 * admits `null` (below), the 13 codeless refusals keep their reason (above), and the election that
 * produces a parent is published and re-derived (below).
 */
test('A-94 Part 3: the three Tokelau rows ship NZ, keeping their names and regions', () => {
  const TOKELAU: ReadonlyArray<readonly [string, string]> = [
    ['gn:4h85j', 'Atafu Village'],
    ['gn:2eefa', 'Fale old settlement'],
    ['gn:4h85h', 'Nukunonu'],
  ];
  const got = TOKELAU.map(([id]) => {
    const row = byId(id);
    return row === undefined ? `${id} ABSENT` : `${id} ${row.name} ${String(row.countryCode)} / ${row.admin1}`;
  });
  assert.deepEqual(
    got,
    [
      'gn:4h85j Atafu Village NZ / Atafu',
      'gn:2eefa Fale old settlement NZ / Fakaofo',
      'gn:4h85h Nukunonu NZ / Nukunonu',
    ],
    'the Tokelau rows did not move to NZ, or lost their region. A-94 Part 3: a traveller to ' +
      'Tokelau now gets New Zealand on their lifetime map — the same trade A-84 Part 5 already ' +
      'ruled for Martinique, stated rather than discovered.',
  );
});

/**
 * **The type is unchanged, and this assertion is checked by `tsc`, not by `node`.** A-94 Part 3
 * item 1: `GazetteerRow.countryCode` stays `CountryCode | null`, `SCHEMA_VERSION` does not move,
 * and A-84 Part 5's *"Cairn does not adjudicate a sovereignty its own map cannot draw"* stands
 * word for word. What changed is that this corpus no longer contains a row for which that sentence
 * has to fire. **The arm is unoccupied, not unreachable**, and A-94 Part 3 item 2 names both ways
 * back in: a stated code whose every candidate row abstains, and a codeless row the layer does not
 * contain (13 of those are in the refusals golden today).
 */
test('A-94 Part 3 item 1: countryCode still admits null — the rule and the type do not move', () => {
  const unoccupiedArm: GazetteerRow['countryCode'] = null;
  assert.equal(unoccupiedArm, null);
});

// ---------------------------------------------------------------------------------------------
// A-94 Part 2 — the election is PUBLISHED, per code, with its abstentions beside its answers.
// ---------------------------------------------------------------------------------------------

/**
 * **`CC → AU (AU:2, abstain:3)` is a fact a reviewer reads out of the repository offline**, per
 * A-90 clause 1, instead of a line that scrolled past in a five-minute run nobody can re-run.
 * That is §0 position 12 (d)'s routing consequence: a rule that aggregates evidence says what a
 * silent witness contributes, and the tally goes in a committed golden.
 */
test('A-94 Part 2: CC and TK carry the ruling\'s own tallies, abstentions included', () => {
  const { codeParent, codeTally } = parents();
  assert.deepEqual(
    codeTally['CC'],
    { parent: 'AU', answers: { AU: 2 }, noIsoCode: 0, abstain: 3, candidates: 5 },
    'CC\'s published tally is not A-94 Part 1\'s measurement (two contained answers of AU, three ' +
      'rows the layer has no opinion about)',
  );
  assert.deepEqual(
    codeTally['TK'],
    { parent: 'NZ', answers: { NZ: 1 }, noIsoCode: 0, abstain: 2, candidates: 3 },
    'TK\'s published tally is not A-94 Part 1\'s measurement',
  );
  assert.equal(codeParent['CC'], 'AU');
  assert.equal(codeParent['TK'], 'NZ');
});

/**
 * **The whole election, all twelve codes, as a literal — which is what *"no other code's tally
 * changes"* means when there is no previous tally to diff against** (`I-32`'s N2 criterion).
 *
 * `CC` and `TK` are the ruling's own measurements. **The other ten are measured, not ruled**: they
 * are this generator's output over the pinned sources, committed here so that a change to any of
 * them has to be argued for. That pairing is *How a criterion is written* rule 2 — a snapshot
 * value is never alone; it sits beside a `[stated]` value (`CC`, `TK`) and an injected fault.
 *
 * **N2, injected — widen the tolerance to 0.06° instead of fixing the election**: `Bantam
 * Village` (0.0501°), `Horsburgh Island` (0.0510°) and `Fale old settlement` (0.0618°) are
 * answered directly, `Cocos Islands` (0.1267°) still abstains — so the five-row assertion above
 * reddens **and** `GF`, `SJ` and every other code with an abstention moves here. **That is how a
 * dial is made visible as a dial**: the tolerance re-decides all 152 translated rows, and this
 * ruling touches two codes.
 *
 * Read the rows as `code → parent  answers  abstentions  electorate`. The coastal tolerance
 * actually used on this corpus is 0.0451° of the 0.05° A-89 Part 4 adopted.
 */
const TWELVE: ReadonlyArray<readonly [string, string | null, Record<string, number>, number, number]> = [
  ['AN', 'DO', { DO: 1 }, 0, 1],
  ['BQ', 'NL', { NL: 7 }, 0, 7],
  ['BV', 'NO', { NO: 1 }, 0, 1],
  ['CC', 'AU', { AU: 2 }, 3, 5],
  ['CX', 'AU', { AU: 1 }, 0, 1],
  ['GF', 'FR', { FR: 9, BR: 1 }, 1, 11],
  ['GP', 'FR', { FR: 21 }, 0, 21],
  ['MQ', 'FR', { FR: 18 }, 0, 18],
  ['RE', 'FR', { FR: 20 }, 0, 20],
  ['SJ', 'NO', { NO: 17 }, 1, 18],
  ['TK', 'NZ', { NZ: 1 }, 2, 3],
  ['YT', 'FR', { FR: 51 }, 0, 51],
];

test('A-94 Part 2: the whole election is published, and only CC and TK moved', () => {
  const { codeTally } = parents();
  assert.deepEqual(
    Object.keys(codeTally),
    TWELVE.map(([code]) => code),
    'the set of undrawable stated codes moved',
  );
  const got = Object.entries(codeTally).map(([code, t]) =>
    [code, t.parent, t.answers, t.abstain, t.candidates]);
  assert.deepEqual(
    got,
    TWELVE.map(([code, parent, answers, abstain, candidates]) => [code, parent, answers, abstain, candidates]),
    'a published tally changed. A-94 Part 1 measures the scope of this ruling as exactly two ' +
      'stated codes: removing abstentions cannot reorder the answers of the other ten, because ' +
      'removing a key from a plurality does not change the ranking of the keys that remain.',
  );
  // No code on this corpus has a row the layer contains inside a feature with no ISO code, so the
  // third ballot kind is measured EMPTY and is published anyway — a missing line is the failure.
  assert.deepEqual(
    Object.entries(codeTally).filter(([, t]) => t.noIsoCode !== 0).map(([c]) => c),
    [],
    'a row is located inside a feature the layer gives no ISO code; that is an answer that can ' +
      'never be a parent, and it is now load-bearing rather than measured inert',
  );
});

/**
 * **The tally is the electorate, so it has to add up.** `candidates` is every row that stood in
 * this code's election; `answers` + `noIsoCode` + `abstain` is every ballot the layer produced.
 * A tally that does not sum is a tally that has dropped a row somewhere between the loop and the
 * golden — which is the only way the published election could disagree with the one that ran.
 */
test('A-94 Part 2: every published tally sums to its own electorate', () => {
  const broken: string[] = [];
  for (const [code, t] of Object.entries(parents().codeTally)) {
    const answered = Object.values(t.answers).reduce((n, v) => n + v, 0);
    if (answered + t.noIsoCode + t.abstain !== t.candidates) {
      broken.push(`${code}: ${answered} answers + ${t.noIsoCode} noIsoCode + ${t.abstain} abstain ≠ ${t.candidates} candidates`);
    }
    if (t.candidates < 1) broken.push(`${code}: an election with no candidates`);
  }
  assert.deepEqual(broken, [], `\n  ${broken.join('\n  ')}\n`);
});

/**
 * **The rule, re-implemented here on purpose** — this file's re-derivation of the twelve published
 * elections is what catches a generator that publishes one election and performs another, and it
 * can only do that if it is a *second* implementation. `tools/elect-parent.mjs` is the first one;
 * this is the second, and they are asserted to agree below.
 */
const rankIndependently = (answers: ReadonlyArray<readonly [string, number]>): Array<[string, number]> =>
  [...answers].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)) as Array<[string, number]>;

/**
 * **A-94 Part 9 fault 3, MADE LIVE — QA R69-3.**
 *
 * The ruling says the published tally is what catches an inverted tie-break. **It is not, and it
 * could not be: there is no tie in the twelve tallies.** Inverting the comparator in the generator
 * *and* in this file's re-derivation left all 1,880 tests green — executed by the breaker, and the
 * fourth instance in this project of a fault that is claimed to be caught and cannot fire.
 *
 * **A tie does not need a corpus.** The rule now lives in `tools/elect-parent.mjs`, which the
 * generator calls and a test can call, and here it is called on ballots that *are* tied:
 *
 *  - a plain tie between two drawable codes → the **lowest** wins, and inverting the comparator
 *    elects the other one;
 *  - a tie whose lowest code is **not drawable** → the parent is `null`, and inverting it elects a
 *    code instead of `null` — so the tie-break and A-94 Part 3's `null` arm are pinned together;
 *  - a three-way tie, so the rule is a total order rather than a swap of two.
 *
 * The **generator's** copy of the rule is the same object: it imports this function, and the
 * assertion below that it does is what stops an inline sort creeping back in beside it.
 */
test('A-94 Part 2 / fault 3: the tie-break elects the LOWEST ISO code, on a ballot that has a tie', () => {
  const draws = new Set(['AU', 'NZ', 'ZZ']);
  assert.deepEqual(
    electParent([['NZ', 2], ['AU', 2]], draws),
    { parent: 'AU', ranked: [['AU', 2], ['NZ', 2]] },
    'a tie between two drawable codes is not broken on the lowest ISO code (A-94 Part 2)',
  );
  assert.deepEqual(
    electParent([['NZ', 3], ['AU', 2]], draws),
    { parent: 'NZ', ranked: [['NZ', 3], ['AU', 2]] },
    'the plurality is not the top answer — the tie-break has become the whole rule',
  );
  assert.deepEqual(
    electParent([['ZZ', 2], ['NZ', 2], ['AU', 2]], draws).ranked.map(([c]) => c),
    ['AU', 'NZ', 'ZZ'],
    'a three-way tie is not ordered by ISO code',
  );
  // The tie-break and the `null` arm, pinned together: the lowest code wins the tie and then
  // fails to be drawable, so the code's rows ship `countryCode: null` (A-94 Part 3). Inverting
  // the comparator elects `ZZ` here — a shipped code where the rule says none.
  assert.deepEqual(
    electParent([['ZZ', 2], ['AA', 2]], new Set(['ZZ'])),
    { parent: null, ranked: [['AA', 2], ['ZZ', 2]] },
    'a tie won by an undrawable code must elect null, not the runner-up',
  );
  assert.deepEqual(electParent([], draws), { parent: null, ranked: [] }, 'an empty ballot elects null');
});

/**
 * **The two implementations agree, on the twelve real elections and on the synthetic ties.** This
 * is what lets the re-derivation below stay independent while the generator's own rule is the one
 * under test above: if they ever disagree, one of them is not A-94 Part 2's rule.
 */
test('A-94 Part 2 / fault 3: the generator\'s rule and this file\'s re-derivation agree', () => {
  const draws = new Set(COUNTRY_INDEX.countries.map((c) => c.code));
  const disagreed: string[] = [];
  const { codeTally, codeParent } = parents();
  for (const [code, t] of Object.entries(codeTally)) {
    const mine = rankIndependently(Object.entries(t.answers));
    const theirs = electParent(Object.entries(t.answers), draws);
    if (JSON.stringify(mine) !== JSON.stringify(theirs.ranked)) {
      disagreed.push(`${code}: ${JSON.stringify(mine)} vs ${JSON.stringify(theirs.ranked)}`);
    }
    // And the extracted rule reproduces the election that actually SHIPPED, code for code — which
    // is what makes lifting it out of the generator checkable offline instead of by a 625 MB run.
    if (theirs.parent !== (codeParent[code] ?? null)) {
      disagreed.push(`${code}: the shipped parent is ${String(codeParent[code])}, electParent says ${String(theirs.parent)}`);
    }
  }
  for (const ballot of [
    [['NZ', 2], ['AU', 2]],
    [['ZZ', 2], ['AA', 2]],
    [['ZZ', 2], ['NZ', 2], ['AU', 2]],
  ] as ReadonlyArray<ReadonlyArray<readonly [string, number]>>) {
    const mine = rankIndependently(ballot);
    const theirs = electParent(ballot, draws).ranked;
    if (JSON.stringify(mine) !== JSON.stringify(theirs)) {
      disagreed.push(`synthetic ${JSON.stringify(ballot)}: ${JSON.stringify(mine)} vs ${JSON.stringify(theirs)}`);
    }
  }
  assert.deepEqual(disagreed, [], `\n  ${disagreed.join('\n  ')}\n`);
});

/**
 * **The generator elects through that module and does not keep a copy of the rule beside it.** A
 * grep — KD-127's weaker instrument, and the only one available against a file that streams 625 MB
 * on import — but it is what stops fault 3 going dead again by an inline sort reappearing in
 * `gen-gazetteer.mjs`.
 */
test('A-94 Part 2 / fault 3: the generator elects through tools/elect-parent.mjs', () => {
  const gen = readFileSync(resolve(HERE, '..', '..', '..', 'tools', 'gen-gazetteer.mjs'), 'utf8');
  assert.match(
    gen,
    /import \{ electParent \} from '\.\/elect-parent\.mjs';/,
    'the generator no longer imports the elected rule (QA R69-3)',
  );
  assert.match(gen, /electParent\(ballot\.answers, draws\)/, 'the generator does not call electParent');
  // …and no second copy of the rule inside the election itself. Scoped to the election block, not
  // to the file: `gen-gazetteer.mjs` sorts group counts with the same comparator shape in two
  // audit blocks that decide nothing about a parent, and orders the codes themselves with a bare
  // `.sort()`. What may not come back is a COMPARATOR inside the loop that elects.
  const block = gen.slice(gen.indexOf('const codeParent = {};'), gen.indexOf('  const parents = ['));
  assert.ok(block.length > 200 && block.length < 4000, 'the election block could not be located');
  assert.equal(
    /\.sort\(\s*\(/.test(block),
    false,
    'an inline sort is back inside the election beside the shared rule — fault 3 goes dead again ' +
      'the moment there are two copies of the tie-break (QA R69-3)',
  );
});

/**
 * **`codeParent` is RE-DERIVED from the published tally, by the ruled rule** — plurality over the
 * answers, ties broken on the lowest ISO code, `null` where the winner is not a code the index
 * draws or where nobody answered.
 *
 * This is what makes the golden a witness rather than a decoration: a generator that publishes one
 * election and performs another reddens here. It is also `I-32`'s fault **N3** (break the
 * tie-break — resolve on the highest code): no shipped row moves on this corpus, and the tally is
 * how anybody knows, because a tie is a result to report and today there is none.
 */
test('A-94 Part 2: codeParent is the plurality of the published answers, lowest code on a tie', () => {
  const { codeParent, codeTally } = parents();
  const draws = new Set(COUNTRY_INDEX.countries.map((c) => c.code));
  const wrong: string[] = [];
  for (const [code, t] of Object.entries(codeTally)) {
    const ranked = rankIndependently(Object.entries(t.answers));
    const top = ranked[0];
    const expected = top !== undefined && draws.has(top[0]) ? top[0] : null;
    if ((codeParent[code] ?? null) !== expected) {
      wrong.push(`${code}: golden says ${String(codeParent[code])}, its own tally elects ${String(expected)} (${ranked.map(([c, n]) => `${c}:${n}`).join(' ') || 'no answers'})`);
    }
    const tied = ranked.filter(([, n]) => top !== undefined && n === top[1]);
    if (tied.length > 1 && expected !== null) {
      assert.equal(expected, tied.map(([c]) => c).sort()[0], `${code}: a tie was not broken on the lowest ISO code`);
    }
  }
  assert.deepEqual(wrong, [], `\n  ${wrong.join('\n  ')}\n`);
  assert.deepEqual(
    Object.keys(codeTally).sort(),
    Object.keys(codeParent).sort(),
    'a code has a parent with no published tally, or a tally with no parent',
  );
});

/**
 * **Every translated row's shipped code is its stated code's elected parent** — the election is
 * per code and modal (A-89 Part 4), not per row. A per-row parent is `I-32`'s standing fault: it
 * ships `Saint-Georges`, a French commune on the Oyapock, as `BR`.
 */
test('A-94 Part 2: every parents row ships its stated code\'s elected parent, not its own answer', () => {
  const { codeParent, parents: rows } = parents();
  const wrong = rows
    .filter((r) => (r.shippedCode ?? null) !== (codeParent[r.statedCode] ?? null))
    .map((r) => `${r.id} ${r.name}: stated ${r.statedCode}, ships ${String(r.shippedCode)}, elected ${String(codeParent[r.statedCode])}`);
  assert.deepEqual(wrong, [], `\n  ${wrong.slice(0, 20).join('\n  ')}\n`);
});
