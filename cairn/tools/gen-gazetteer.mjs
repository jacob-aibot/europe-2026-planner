/**
 * gen-gazetteer.mjs — builds `packages/core/src/geo/gazetteer.gen.ts` from Natural Earth's
 * populated-places layer (ARCHITECTURE §8.4 **A-82**, ROADMAP Phase 2 **I-21**).
 *
 * Run:
 *   node tools/gen-gazetteer.mjs               # fetch, verify, build, write the module + refusals
 *   node tools/gen-gazetteer.mjs --dry-run     # measure and audit, write nothing
 *   node tools/gen-gazetteer.mjs --audit-only  # audit the COMMITTED module, fetch nothing
 *   node tools/gen-gazetteer.mjs --audit-only --write
 *                                              # …and rewrite fixtures/golden/gazetteer-probes.json
 *
 * **Why this file exists.** Both trip-creation forms collect city *names*, `createTrip` writes
 * `centre: {lat:0, lng:0}` and `countryCode: ''`, so a hand-entered past trip attributes to nothing
 * and puts no country on the lifetime map (BUILD-NOTES **KD-39**). This dataset is the coordinate.
 * Jacob's bar, in his own words: *"For people wanting to put in past trips — how would they do it?
 * The ease of that is key as well since many people will want to upload where they've been.
 * Otherwise it's not a true sign of their travels."* Two requirements: **easy**, and **true**.
 *
 * **The consistency invariant is the whole point of this generator and it is A-82 Part 5.** The
 * shipped `COUNTRY_INDEX` and this dataset disagree about **98 named cities** — Maastricht→`BE`,
 * Niagara Falls→`CA`, Lugano→`IT`, Arlon→`LU` — and every one of them is a border town, because
 * §8.4 A-26 Part 2 chose the base scale for being *"the most forgiving of the error that dominates
 * this dataset's use"* rather than for accuracy, and a coarse ring bulges outward. Shipping those
 * rows would put Maastricht in Belgium on a user's lifetime map. So:
 *
 * > **A row is emitted only if `countryOf(row.centre, COUNTRY_INDEX)` is either the row's own
 * > country code or `null`.** A row where both are non-null and disagree is **REFUSED**, named, and
 * > published in `fixtures/golden/gazetteer-refusals.json`. Where the source carries no code
 * > (`-99`), the derived answer is used if there is one and `''` is stored if there is not.
 *
 * `countryOf` stays authoritative, because wherever it speaks it now agrees; A-29's four-step gate
 * is untouched, `countrySource` gains no value and `SUMMARY_VERSION` does not move. What it costs
 * is stated rather than buried: **98 real cities become unfindable**, 1.3 % of the layer, published
 * by name rather than silently dropped. Restoring them needs a field on `City` and a schema
 * migration — ROADMAP **I-22**, deliberately not this increment.
 *
 * **A refusal count of zero is a FAILURE, not a clean run**: the filter that never fires is the
 * filter that was deleted.
 *
 * **This runs at generation time, by a human, once. Nothing in the shipped product runs it.**
 * `packages/core`, `packages/client`, `apps/web` and `cli.ts` never fetch anything for this
 * feature, in this phase or any other. §6.1 forbids sending a coordinate to a geocoder in every
 * phase, and a committed generated module is how that is affordable.
 *
 * **Where the bytes come from.** The same repository and the same **pinned tag `v5.1.2`** the
 * country index already uses — `naturalearthdata.com` answers `CONNECT tunnel failed, response
 * 403` through this environment's egress proxy, and `master` carries a moving `5.2.0-pre`. A
 * committed generated module fetched from a moving ref is a measurement nobody can reproduce, and
 * the budget in `packages/core/test/0-gazetteerBudget.test.ts` is precisely such a measurement.
 * A fetch that does not match the pin is **REPORTED and refuses to write**, never absorbed.
 *
 * Public domain: "Everything here is public domain … the primary authors, Tom Patterson and
 * Nathaniel Vaughn Kelso, and all other contributors renounce all financial claim"
 * (nvkelso/natural-earth-vector LICENSE.md at v5.1.2, verified 2026-08-28 for the admin-0 layer
 * and re-read 2026-09-09 for this one — it is one licence over the whole repository).
 *
 * **Determinism.** No clock, no randomness, no reliance on source order or on `Map` iteration
 * order. Emission order is A-82 Part 2's total order: ascending folded name, then descending
 * population, then ascending ISO code, then ascending `NE_ID`. Two runs against the same input
 * produce byte-identical output, and I-21's ship gate runs it twice and diffs.
 */
import { writeFileSync, readFileSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const OUT = resolve(CAIRN, 'packages/core/src/geo/gazetteer.gen.ts');
const REFUSALS_OUT = resolve(CAIRN, 'fixtures/golden/gazetteer-refusals.json');
const PROBES_OUT = resolve(CAIRN, 'fixtures/golden/gazetteer-probes.json');

const TAG = 'v5.1.2';
const REPO = 'nvkelso/natural-earth-vector';
const FILE = 'ne_10m_populated_places.geojson';
const URL = `https://raw.githubusercontent.com/${REPO}/${TAG}/geojson/${FILE}`;

/**
 * The pin. §8.4 **A-82** Part 1 measured all three on 2026-09-09 and this generator refuses to
 * write on a mismatch rather than absorbing one.
 */
const PIN = {
  bytes: 19_359_003,
  sha256: '9b8e3de09048ef00dfc70357dbb9fa324493f214b5e0ae4daf1aa79a8d10116b',
  features: 7342,
  pinnedBy: 'ARCHITECTURE §8.4 A-82 Part 1',
};

/** Coordinate decimals kept. 1e-4° ≈ 11 m — far finer than the question "where is this city". */
const DECIMALS = 4;

/**
 * A-82 Part 10's probe list, *"at minimum"* its thirteen queries. These become
 * `fixtures/golden/gazetteer-probes.json`, which pins **the answer, not the mechanism**: a fold
 * that stops handling `ł`, a comparator whose tie moves, or a coordinate that shifted between
 * source revisions all show up here as a diff.
 */
const PROBES = [
  'zurich', 'Zürich', 'sao paulo', 'London', 'Paris', 'springfield', 'york',
  'lodz', 'istanbul', 'bac kan', 'vatican', 'nara', 'hvar',
  // Two more, because they are the two claims A-82 makes that a reader is most likely to doubt:
  // the micro-states resolve correctly (Part 1 measurement 2), and a refused border town is gone.
  'monaco', 'maastricht',
];
const PROBE_DEPTH = 5;

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);

main().catch((err) => {
  console.error(`gen-gazetteer: ${err.message}`);
  process.exit(1);
});

// ---------------------------------------------------------------- the fold
//
// **This is a SECOND implementation of A-82 Part 3's five steps, and that is deliberate rather
// than careless.** `foldPlaceName` is module-private in `packages/core/src/geo/gazetteer.ts` (§2.10
// group 1: a caller that can reach both it and `normalizeCityName` will use the wrong one), and
// ROADMAP criterion E ceiling (1) forbids anything under `tools/` reaching past
// `packages/core/src/index.ts`. So the generator cannot import it.
//
// Disclosed as **KD-112**. The duplication is made safe by **pinning the output rather than
// trusting the copy**: every row
// carries its fold in the emitted module, and `packages/core/test/gazetteer.test.ts` asserts that
// core's own `foldPlaceName(row.name) === row.fold` for **every shipped row**. Two implementations
// that are checked against each other over 7,244 real names are a verified pair; one of them
// silently drifting is what that test exists to prevent.

const SUBSTITUTIONS = {
  'ł': 'l', 'ø': 'o', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ß': 'ss',
  'æ': 'ae', 'œ': 'oe', 'ı': 'i', 'ħ': 'h', 'ŀ': 'l', 'ʻ': '', 'ʼ': '',
};

function foldPlaceName(name) {
  const lowered = name.toLowerCase();
  let substituted = '';
  for (const ch of lowered) substituted += SUBSTITUTIONS[ch] ?? ch;
  return substituted.normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// ---------------------------------------------------------------- main

async function main() {
  if (flag('audit-only')) {
    const { GAZETTEER } = await import('@cairn/core/gazetteer');
    console.log(`auditing the COMMITTED module: ${GAZETTEER.rows.length} rows (${GAZETTEER.source})`);
    await audit(GAZETTEER, { writeProbes: flag('write') });
    return;
  }

  const { buf, sha } = await download();
  const geo = JSON.parse(buf.toString('utf8'));
  if (geo.features.length !== PIN.features) {
    throw new Error(`${geo.features.length} features, pinned at ${PIN.features}`);
  }
  console.log(`  ${geo.features.length} features read`);

  const { countryOf, COUNTRY_INDEX } = await import('../packages/core/src/index.ts');
  const built = build(geo, countryOf, COUNTRY_INDEX);

  console.log('');
  console.log(`A-82 Part 1's census, re-derived against the COMMITTED index (${COUNTRY_INDEX.scale}):`);
  console.log(`  agrees with ISO_A2      ${String(built.census.agree).padStart(5)}`);
  console.log(`  countryOf returns null  ${String(built.census.silent).padStart(5)}   (A-26's honest hole)`);
  console.log(`  a DIFFERENT country     ${String(built.census.disagree).padStart(5)}   REFUSED — border towns`);
  console.log(`  no ISO_A2 at all (-99)  ${String(built.census.noCode).padStart(5)}`);
  console.log('');
  console.log(`rows read      ${geo.features.length}`);
  console.log(`rows shipped   ${built.rows.length}`);
  console.log(`rows refused   ${built.refusals.length}   (reason: countryOf contradicts the source's own ISO code)`);
  console.log(`admin-1 dict   ${built.admin1.length}`);
  console.log(`country names  ${Object.keys(built.countryNames).length}`);
  if (built.derivedOnly.length) {
    console.log(`  ${built.derivedOnly.length} row(s) shipped on a DERIVED code the source did not state:`);
    for (const r of built.derivedOnly) console.log(`    ${r.name} (${r.adm0}) -> ${r.code}`);
  }
  if (built.unnamed.length) {
    console.log(`  ${built.unnamed.length} shipped row(s) carry a country code the ADM0NAME table cannot name:`);
    for (const r of built.unnamed) console.log(`    ${r.name} -> ${r.code}`);
  }
  if (built.codeless.length) {
    console.log(`  ${built.codeless.length} shipped row(s) carry countryCode '' — no stated code and none derivable:`);
    for (const r of built.codeless) console.log(`    ${r.name} (${r.adm0})`);
  }
  console.log('');
  for (const r of built.refusals) {
    console.log(`  refused  ${r.name.padEnd(24)} states ${r.statedCountry}  countryOf says ${r.derivedCountry}`);
  }

  // **A refusal count of 0 is itself a failure** (ROADMAP I-21, and it is one of that increment's
  // two stop-and-report conditions): the filter that never fires is the filter that was deleted.
  if (built.refusals.length === 0) {
    throw new Error(
      'ZERO refusals. A-82 Part 5 measured 98 border towns the shipped index contradicts; a run ' +
        'that refuses none has lost its consistency filter, not found a clean dataset.',
    );
  }

  const text = emit(built, sha);
  roundTrip(text, built);
  console.log(`  round-trip: the emitted literal re-parses to the same ${built.rows.length} rows`);

  if (flag('dry-run')) {
    console.log(`\nemitted bytes: ${Buffer.byteLength(text, 'utf8')}   (dry run — nothing written)`);
    console.log('  (the audit below runs against the gazetteer just built in memory, not the committed module)');
    await audit(gazetteerOf(built, sha), { writeProbes: false });
    return;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, text);
  const written = statSync(OUT).size;
  console.log(`\nwrote packages/core/src/geo/gazetteer.gen.ts`);
  console.log(`emitted bytes: ${written}`);
  console.log(`  ^ this is the number that goes in EMITTED_BYTES in`);
  console.log(`    packages/core/test/0-gazetteerBudget.test.ts, and in no document.`);

  writeRefusals(built, sha);

  // Audit the module that was actually written, decoded the way the product decodes it — not the
  // in-memory build, and in a CHILD PROCESS, because this process has already imported
  // `packages/core/src/index.ts` and a stale module cache would let the guard read the file it
  // just replaced. `gen-countries.mjs` learned this the expensive way at I-5a.
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--audit-only', '--write'], {
    stdio: 'inherit',
  });
  if (child.status !== 0) throw new Error(`the post-write audit exited ${child.status}`);
}

/** Fetches the pinned layer and refuses to continue if the bytes are not the pinned bytes. */
async function download() {
  console.log(`fetching ${URL}`);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${URL}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sha = createHash('sha256').update(buf).digest('hex');
  console.log(`  ${buf.length} bytes, sha256 ${sha}`);
  console.log(`  pinned : ${PIN.bytes} bytes, sha256 ${PIN.sha256}  (${PIN.pinnedBy})`);
  if (sha !== PIN.sha256 || buf.length !== PIN.bytes) {
    // Reported, not absorbed. A tag that moved is a fact about the world, and the right response
    // is a ruling on which bytes are canonical, not a quietly different committed module.
    console.error(
      'gen-gazetteer: DOWNLOAD DOES NOT MATCH THE PIN. Not writing. The tag is supposed to be\n' +
        'immutable; if it genuinely moved, that is an architect decision, not a regeneration.',
    );
    process.exit(3);
  }
  return { buf, sha };
}

// ---------------------------------------------------------------- building

const q = (n) => Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS;
const isIso = (c) => typeof c === 'string' && /^[A-Z]{2}$/.test(c);
/** A folded alternate ships only if it is Latin-script — A-82 Part 3 defers non-Latin to Part 11. */
const isLatinFold = (s) => /^[a-z0-9 ]+$/.test(s);

/**
 * GeoJSON features → the shipped rows, the refusals and the census.
 *
 * `countryOf` is evaluated against the **quantised** centre, not the raw one, because the
 * quantised centre is what ships and therefore what the invariant test will ask about. Eleven
 * metres cannot move a city out of its country, but "cannot" is not a thing to assume when the
 * check is free.
 */
function build(geo, countryOf, index) {
  const census = { agree: 0, silent: 0, disagree: 0, noCode: 0 };
  const rows = [];
  const refusals = [];
  const derivedOnly = [];
  const codeless = [];
  const adm0Counts = new Map();   // code -> Map(ADM0NAME -> count), stated codes only
  const derivedAdm0 = new Map();  // code -> ADM0NAME, from rows whose code was DERIVED only
  let coordMismatch = 0;

  for (const f of geo.features) {
    const p = f.properties;
    const lat = q(p.LATITUDE);
    const lng = q(p.LONGITUDE);
    // The layer carries the coordinate twice. If the two ever disagree, that is a fact about the
    // source worth reporting rather than a preference between two columns.
    const g = f.geometry?.coordinates;
    if (!g || q(g[0]) !== lng || q(g[1]) !== lat) coordMismatch += 1;

    const stated = isIso(p.ISO_A2) ? p.ISO_A2 : null;
    const derived = countryOf({ lat, lng }, index);

    let code;
    if (stated !== null) {
      if (derived === null) {
        census.silent += 1;
        code = stated;
      } else if (derived === stated) {
        census.agree += 1;
        code = stated;
      } else {
        // A-82 Part 5. Refused, named, published — never shipped and contradicted later.
        census.disagree += 1;
        refusals.push({
          id: (p.NE_ID >>> 0).toString(36),
          name: String(p.NAME),
          statedCountry: stated,
          derivedCountry: derived,
        });
        continue;
      }
    } else {
      census.noCode += 1;
      code = derived ?? '';
    }

    const name = String(p.NAME);
    const fold = foldPlaceName(name);
    const admin1 = p.ADM1NAME == null ? '' : String(p.ADM1NAME);
    const adm0 = p.ADM0NAME == null ? '' : String(p.ADM0NAME);

    // Alternates: the layer's own Latin-script name columns, folded, minus the ones the name's own
    // fold already covers. `NAMEALT` is pipe-separated where it carries more than one.
    const altSources = [
      ...String(p.NAMEALT ?? '').split('|'),
      String(p.NAMEASCII ?? ''),
      String(p.NAME_EN ?? ''),
    ];
    const alts = [];
    for (const a of altSources) {
      const folded = foldPlaceName(a);
      if (folded === '' || folded === fold || !isLatinFold(folded)) continue;
      if (!alts.includes(folded)) alts.push(folded);
    }
    alts.sort();

    if (stated !== null) {
      if (!adm0Counts.has(stated)) adm0Counts.set(stated, new Map());
      const m = adm0Counts.get(stated);
      m.set(adm0, (m.get(adm0) ?? 0) + 1);
    } else if (code !== '') {
      derivedOnly.push({ name, adm0, code });
      if (!derivedAdm0.has(code)) derivedAdm0.set(code, adm0);
    } else {
      codeless.push({ name, adm0 });
    }

    rows.push({
      name, fold, alts, countryCode: code, admin1,
      population: Math.max(0, Math.round(p.POP_MAX ?? 0)),
      lat, lng,
      id: (p.NE_ID >>> 0).toString(36),
      neId: p.NE_ID,
    });
  }

  if (coordMismatch) console.log(`  NOTE: ${coordMismatch} feature(s) whose LATITUDE/LONGITUDE differ from their geometry`);

  // **A-82 Part 2's total order, and it IS the artefact**: ascending folded name, descending
  // population, ascending ISO code, ascending NE_ID. Every key is needed and only the first two
  // decide anything a reader would notice; the last two exist so a regeneration cannot reshuffle.
  rows.sort((a, b) =>
    a.fold < b.fold ? -1 : a.fold > b.fold ? 1 :
    b.population - a.population ||
    (a.countryCode < b.countryCode ? -1 : a.countryCode > b.countryCode ? 1 : a.neId - b.neId));
  refusals.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : 1));

  // The admin-1 dictionary: distinct names, sorted, so its indices are a property of the data and
  // not of the order the features happened to arrive in.
  const admin1 = [...new Set(rows.map((r) => r.admin1).filter((s) => s !== ''))].sort();
  const admin1At = new Map(admin1.map((s, i) => [s, i]));

  // A-82 Part 4's code→name table, from the source's own ADM0NAME column. Built from **stated**
  // codes only: a Northern Cyprus row whose code was *derived* as `CY` must not teach the table
  // that `CY` is called "Northern Cyprus". Ties break on the name, so the table is deterministic.
  const countryNames = {};
  for (const [code, counts] of [...adm0Counts].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const best = [...counts].filter(([n]) => n !== '')
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    if (best) countryNames[code] = best[0];
  }
  // **Gap fill, never override.** Three Kosovo rows carry `ISO_A2: -99` and derive `XK`, and no
  // row *states* `XK`, so the loop above cannot name it and the label would read
  // `'Pristina, Kosovo, XK'`. A derived-only row's own `ADM0NAME` fills a code the stated rows
  // left unnamed — and only that: it can never rewrite a name a stated row supplied, which is
  // what stops a `Northern Cyprus` row that derived `CY` from teaching the table that `CY` is
  // called Northern Cyprus. Sorted, so the fill is deterministic.
  for (const [code, adm0] of [...derivedAdm0].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (countryNames[code] === undefined && adm0 !== '') countryNames[code] = adm0;
  }
  const sortedNames = {};
  for (const code of Object.keys(countryNames).sort()) sortedNames[code] = countryNames[code];

  const unnamed2 = rows
    .filter((r) => r.countryCode !== '' && sortedNames[r.countryCode] === undefined)
    .map((r) => ({ name: r.name, code: r.countryCode }));

  return {
    rows, refusals, census, admin1, admin1At,
    countryNames: sortedNames, derivedOnly, codeless, unnamed: unnamed2,
  };
}

/** The packed payload, whose grammar `decodeGazetteer` documents and parses. */
function pack(built) {
  const lines = [
    `${built.admin1.length}|${Object.keys(built.countryNames).length}|${built.rows.length}`,
    ...built.admin1,
    ...Object.entries(built.countryNames).map(([c, n]) => `${c} ${n}`),
    ...built.rows.map((r) => [
      r.name,
      r.fold,
      r.alts.join(','),
      r.countryCode,
      r.admin1 === '' ? '' : built.admin1At.get(r.admin1).toString(36),
      r.population.toString(36),
      Math.round(r.lat * 1e4).toString(36),
      Math.round(r.lng * 1e4).toString(36),
      r.id,
    ].join('|')),
  ];
  return lines.join('\n');
}

/** The in-memory equivalent of what the emitted module decodes to, for `--dry-run`'s audit. */
function gazetteerOf(built, sha) {
  return {
    source: sourceString(sha),
    countryNames: built.countryNames,
    rows: built.rows.map((r) => ({
      name: r.name, fold: r.fold, alts: r.alts, countryCode: r.countryCode,
      admin1: r.admin1, population: r.population, centre: { lat: r.lat, lng: r.lng }, id: r.id,
    })),
  };
}

const sourceString = () => `${REPO}@${TAG}/geojson/${FILE}`;

function emit(built, sha) {
  const packed = pack(built);
  // The payload lives in ONE template literal, newline-separated so a regeneration diff is one row
  // changing on one key rather than a wall of reordered text (A-82 Part 10). Three sequences would
  // change its meaning; two of them do not occur in this dataset and are REFUSED rather than
  // escaped blind, and the third (a backtick, in seven Arabic-transliterated ADM1NAMEs) is escaped.
  if (packed.includes('\\')) throw new Error('the payload contains a backslash; the literal would misparse');
  if (packed.includes('${')) throw new Error('the payload contains "${"; the literal would interpolate');
  const literal = packed.replaceAll('`', '\\`');

  const codes = Object.keys(built.countryNames);
  return `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by \`node tools/gen-gazetteer.mjs\`. Re-run that to change it; a hand edit here is lost
 * on the next run and untraceable to a source in the meantime.
 *
 * Source : ${sourceString()}
 *          (Natural Earth populated places, public domain — see the generator's header for the
 *          licence citation and why the tag is pinned rather than tracking \`master\`.)
 * sha256 : ${FILE} ${sha}
 * Rows   : ${built.rows.length} shipped of ${built.rows.length + built.refusals.length} coded source rows · ${built.admin1.length} admin-1 names · ${codes.length} country names
 * Refused: ${built.refusals.length} — ARCHITECTURE §8.4 **A-82** Part 5, the consistency invariant. A row ships only
 *          where \`countryOf(row.centre, COUNTRY_INDEX)\` is the row's own ISO code or \`null\`. The
 *          refused rows are border towns the shipped index draws on the wrong side of a frontier
 *          (Maastricht, Niagara Falls, Lugano, Arlon…), and shipping one would put it in the wrong
 *          country on a user's lifetime map. Every one is named in
 *          \`fixtures/golden/gazetteer-refusals.json\`, and ROADMAP **I-22** is what would restore
 *          them.
 * Census : ${built.census.agree} agree with ISO_A2 · ${built.census.silent} countryOf-silent (A-26's honest hole) ·
 *          ${built.census.disagree} contradicted (refused) · ${built.census.noCode} carry no ISO_A2 at all
 * Order  : ascending folded name, then descending population, then ascending ISO code, then
 *          ascending NE_ID. A **total** order, so a regeneration cannot reshuffle the list, and it
 *          is a property of THIS FILE — \`decodeGazetteer\` preserves it and does not re-derive it.
 * Coords : ${DECIMALS} decimal places (~11 m), stored as base-36 tenth-thousandths. \`countryOf\` was
 *          evaluated against the QUANTISED coordinate, so the invariant holds for the bytes that
 *          ship rather than for the ones that were measured.
 * Fold   : A-82 Part 3's five ordered steps. Each row carries its own fold, and
 *          \`packages/core/test/gazetteer.test.ts\` asserts core's \`foldPlaceName(row.name)\`
 *          reproduces it for every row — which is what makes the generator's own copy of that
 *          algorithm a checked pair rather than a second opinion.
 * Budget : \`packages/core/test/0-gazetteerBudget.test.ts\`. This module is NOT reachable from
 *          \`packages/core/src/index.ts\`: it is a **second declared entry point**,
 *          \`@cairn/core/gazetteer\`, dynamically imported, because unlike \`COUNTRY_INDEX\` the
 *          gazetteer is not on the write path (A-82 Part 9).
 *
 * The rows live in ONE template literal — one token to Node's type stripping, which is what keeps
 * \`node --test packages/core\` running the .ts files with no build step — and one row per line, so
 * a moved coordinate is one line of diff on one stable \`NE_ID\`.
 */
import { decodeGazetteer } from './gazetteer.ts';
import type { Gazetteer } from './gazetteer.ts';

const PACKED = \`${literal}\`;

/** The bundled city gazetteer. Injected into \`searchGazetteer(query, gazetteer, opts?)\`. */
export const GAZETTEER: Gazetteer = decodeGazetteer({ source: '${sourceString()}' }, PACKED);
`;
}

/**
 * Round-trip: the one literal the module carries must re-parse to exactly the rows that went into
 * it. Done here with the generator's own reader rather than by calling core's `decodeGazetteer` —
 * ROADMAP criterion E ceiling (1) says nothing under `tools/` reaches past
 * `packages/core/src/index.ts`, and a decoder is not on §2.10's surface. What the decoder does with
 * these bytes is `packages/core/test/gazetteer.test.ts`'s job, not this file's. (**KD-112**.)
 */
function roundTrip(text, built) {
  const m = /const PACKED = `([\s\S]*)`;\n/.exec(text);
  if (!m) throw new Error('round-trip: could not find PACKED in the emitted text');
  const back = m[1].replaceAll('\\`', '`');
  if (back !== pack(built)) throw new Error('round-trip: the emitted literal is not the payload that produced it');
  const lines = back.split('\n');
  const want = 1 + built.admin1.length + Object.keys(built.countryNames).length + built.rows.length;
  if (lines.length !== want) throw new Error(`round-trip: ${lines.length} lines, expected ${want}`);
}

// ---------------------------------------------------------------- the goldens

/**
 * `fixtures/golden/gazetteer-refusals.json` — every row the consistency invariant refused, by name.
 * The analogue of `country-holes.json`, doing the same job: it makes a deliberate hole
 * **countable, nameable and reviewable** instead of invisible, and it is the input I-22 restores
 * from. A refusal count that changes when the country index next changes is a diff a reviewer must
 * look at, which is the point.
 *
 * **Coordinates are NOT in this file and that is not a redaction** — `{id, name, statedCountry,
 * derivedCountry}` is A-82 Part 10's stated shape for it, and a refused row has no shipped
 * coordinate to publish. `country-holes.json`'s `NO COORDINATES` line does not transfer to the
 * probes golden, which does carry them (A-82 Part 10: that line's subject is the live planner's own
 * records under §6.6, and this one's is a public-domain dataset already committed in full).
 */
function writeRefusals(built, sha) {
  const out = {
    $generatedBy: 'cairn/tools/gen-gazetteer.mjs',
    $source: sourceString(),
    $sourceSha256: sha,
    $what:
      'Every row of the pinned populated-places layer that ARCHITECTURE §8.4 A-82 Part 5\'s ' +
      'consistency invariant REFUSED: the row states an ISO country code, and countryOf(row.centre, ' +
      'COUNTRY_INDEX) returns a DIFFERENT one. Every one is a border town the shipped index draws on ' +
      'the wrong side of a frontier, and shipping it would put the city in the wrong country on a ' +
      "user's lifetime map. They are named here rather than dropped silently. ROADMAP I-22 is what " +
      'would restore them. statedCountry is the source\'s ISO_A2; derivedCountry is what countryOf says.',
    total: built.refusals.length,
    refused: built.refusals,
  };
  writeFileSync(REFUSALS_OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote fixtures/golden/gazetteer-refusals.json  (${built.refusals.length} rows)`);
}

// ---------------------------------------------------------------- the audit

/**
 * Runs A-82's two measurable claims against a decoded gazetteer — the committed module under
 * `--audit-only`, the in-memory build under `--dry-run` — and writes the probes golden.
 *
 * The invariant is re-derived here **from the artefact**, not from the build's own bookkeeping. A
 * generator that audits its own intermediate value cannot see an emit bug.
 */
async function audit(gaz, { writeProbes }) {
  const { countryOf, COUNTRY_INDEX, searchGazetteer } = await import('../packages/core/src/index.ts');

  let agree = 0;
  let silent = 0;
  const violations = [];
  for (const r of gaz.rows) {
    const derived = countryOf(r.centre, COUNTRY_INDEX);
    if (derived === null) silent += 1;
    else if (derived === r.countryCode) agree += 1;
    else violations.push(`${r.name} states ${r.countryCode || "''"}, countryOf says ${derived}`);
  }
  console.log(`  invariant: ${agree} rows agree with countryOf, ${silent} it is silent on, ${violations.length} contradicted`);
  for (const v of violations.slice(0, 20)) console.log(`    VIOLATION ${v}`);
  if (violations.length) throw new Error(`${violations.length} shipped rows contradict countryOf`);

  const ambiguous = new Map();
  for (const r of gaz.rows) ambiguous.set(r.fold, (ambiguous.get(r.fold) ?? 0) + 1);
  console.log(`  ${[...ambiguous.values()].filter((n) => n > 1).length} folded names are carried by more than one row`);

  const probes = PROBES.map((query) => ({
    query,
    hits: searchGazetteer(query, gaz, { limit: PROBE_DEPTH }).map((h) => ({
      id: h.id, name: h.name, label: h.label, countryCode: h.countryCode,
      admin1: h.admin1, centre: h.centre,
    })),
  }));
  console.log('  probes:');
  for (const p of probes) {
    const top = p.hits[0];
    console.log(`    ${p.query.padEnd(12)} ${p.hits.length} hit(s)  ${top ? top.label : 'NO MATCH'}`);
  }

  const out = {
    $generatedBy: 'cairn/tools/gen-gazetteer.mjs --audit-only --write',
    $source: gaz.source,
    $sourceSha256: shaFromModule(),
    $what:
      'The top ' + PROBE_DEPTH + ' hits searchGazetteer returns for each of ARCHITECTURE §8.4 A-82 ' +
      "Part 10's probe queries, over the committed GAZETTEER. This pins THE ANSWER, not the " +
      'mechanism: a fold that stops handling a letter, a comparator whose tie moves, or a coordinate ' +
      'that shifted between source revisions all show up here as a diff. COORDINATES ARE PUBLISHED ' +
      "here deliberately — A-82 Part 10: country-holes.json's NO COORDINATES line has the live " +
      "planner's own records as its subject, and this file's subject is a public-domain dataset " +
      'already committed in full.',
    probeDepth: PROBE_DEPTH,
    probes,
  };
  const json = `${JSON.stringify(out, null, 2)}\n`;
  if (writeProbes) {
    writeFileSync(PROBES_OUT, json);
    console.log(`wrote fixtures/golden/gazetteer-probes.json  (${probes.length} queries)`);
  } else {
    let current = null;
    try { current = readFileSync(PROBES_OUT, 'utf8'); } catch { /* not written yet */ }
    console.log(
      current === json
        ? '  probes golden: matches the committed file'
        : '  probes golden: DIFFERS from the committed file (re-run with --write to update)',
    );
  }
}

/** The sha the committed module records, read back out of its own header. */
function shaFromModule() {
  try {
    const m = /sha256 : \S+ ([0-9a-f]{64})/.exec(readFileSync(OUT, 'utf8').slice(0, 4000));
    return m ? m[1] : PIN.sha256;
  } catch {
    return PIN.sha256;
  }
}
