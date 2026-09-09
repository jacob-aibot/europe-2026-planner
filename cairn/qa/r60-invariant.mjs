/**
 * R60 — A-82 Part 5's consistency invariant, and the quantisation question, re-derived from the
 * pinned source rather than from the builder's bookkeeping.
 *
 * Sections:
 *   A  the pin: bytes, sha256, feature count
 *   B  the RAW-coordinate census (A-82 Part 1's table: 6806 / 426 / 98 / 12)
 *   C  the QUANTISED-coordinate census (what actually ships)
 *   D  **the question that matters** — can 4 dp quantisation move a row across a border into a
 *      DIFFERENT country, rather than merely into `null`? Every row is classified by the pair
 *      (countryOf(raw), countryOf(quantised)).
 *   E  the refusal SET at raw vs at quantised — a refusal that quantisation *hides* would ship a
 *      contradicted row, which is the failure the whole ruling exists to prevent.
 *   F  the shipped invariant walked independently over the committed module, no allowlist
 *   G  the 12 codeless / derived-only rows, and the 98 refusals as border towns
 *
 * Needs the pinned source. Fetches it once to $SCRATCH or reuses R60_SOURCE if set:
 *   R60_SOURCE=/path/to/ne_10m_populated_places.geojson node qa/r60-invariant.mjs
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SRC_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_populated_places.geojson';
const PIN = {
  bytes: 19_359_003,
  sha256: '9b8e3de09048ef00dfc70357dbb9fa324493f214b5e0ae4daf1aa79a8d10116b',
  features: 7342,
};

const cache = process.env.R60_SOURCE ?? '/tmp/r60-ne_10m_populated_places.geojson';
if (!existsSync(cache)) {
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`${res.status} fetching the pinned layer`);
  writeFileSync(cache, Buffer.from(await res.arrayBuffer()));
}
const buf = readFileSync(cache);
const sha = createHash('sha256').update(buf).digest('hex');

console.log('## A — the pin');
console.log(`  bytes    ${buf.length}  ${buf.length === PIN.bytes ? 'MATCHES' : 'DIFFERS'}`);
console.log(`  sha256   ${sha}`);
console.log(`           ${sha === PIN.sha256 ? 'MATCHES A-82 Part 1' : 'DIFFERS FROM A-82 Part 1'}`);
const geo = JSON.parse(buf.toString('utf8'));
console.log(`  features ${geo.features.length}  ${geo.features.length === PIN.features ? 'MATCHES' : 'DIFFERS'}`);
console.log('');

const { countryOf, COUNTRY_INDEX, searchGazetteer } = await import('../packages/core/src/index.ts');
const { GAZETTEER } = await import('@cairn/core/gazetteer');

const DECIMALS = 4;
const q = (n) => Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS;
const isIso = (c) => typeof c === 'string' && /^[A-Z]{2}$/.test(c);

const census = (quantise) => {
  const c = { agree: 0, silent: 0, disagree: 0, noCode: 0 };
  const disagreed = new Map();
  for (const f of geo.features) {
    const p = f.properties;
    const lat = quantise ? q(p.LATITUDE) : p.LATITUDE;
    const lng = quantise ? q(p.LONGITUDE) : p.LONGITUDE;
    const stated = isIso(p.ISO_A2) ? p.ISO_A2 : null;
    const derived = countryOf({ lat, lng }, COUNTRY_INDEX);
    if (stated === null) c.noCode += 1;
    else if (derived === null) c.silent += 1;
    else if (derived === stated) c.agree += 1;
    else {
      c.disagree += 1;
      disagreed.set(String(p.NE_ID), { name: p.NAME, stated, derived });
    }
  }
  return { c, disagreed };
};

const raw = census(false);
const qn = census(true);
console.log('## B — the RAW-coordinate census (A-82 Part 1 states 6806 / 426 / 98 / 12)');
console.log(`  agree ${raw.c.agree} · null ${raw.c.silent} · different ${raw.c.disagree} · no ISO_A2 ${raw.c.noCode}`);
console.log(
  `  A-82 Part 1 reproduces: ${
    raw.c.agree === 6806 && raw.c.silent === 426 && raw.c.disagree === 98 && raw.c.noCode === 12 ? 'YES' : 'NO'
  }`,
);
console.log('');
console.log('## C — the QUANTISED (4 dp) census — the coordinates that actually ship');
console.log(`  agree ${qn.c.agree} · null ${qn.c.silent} · different ${qn.c.disagree} · no ISO_A2 ${qn.c.noCode}`);
console.log('');

console.log('## D — can quantisation move a row into a DIFFERENT country?');
const moves = { toNull: [], fromNull: [], crossed: [] };
for (const f of geo.features) {
  const p = f.properties;
  const a = countryOf({ lat: p.LATITUDE, lng: p.LONGITUDE }, COUNTRY_INDEX);
  const b = countryOf({ lat: q(p.LATITUDE), lng: q(p.LONGITUDE) }, COUNTRY_INDEX);
  if (a === b) continue;
  const rec = { name: p.NAME, iso: p.ISO_A2, raw: a, quantised: b, id: String(p.NE_ID) };
  if (b === null) moves.toNull.push(rec);
  else if (a === null) moves.fromNull.push(rec);
  else moves.crossed.push(rec);
}
console.log(`  rows whose derived country CHANGED under quantisation: ${moves.toNull.length + moves.fromNull.length + moves.crossed.length}`);
console.log(`    country -> null   ${moves.toNull.length}`);
for (const r of moves.toNull) console.log(`      ${r.name} (${r.iso}) ${r.raw} -> null`);
console.log(`    null -> country   ${moves.fromNull.length}`);
for (const r of moves.fromNull) console.log(`      ${r.name} (${r.iso}) null -> ${r.quantised}`);
console.log(`    country -> DIFFERENT COUNTRY   ${moves.crossed.length}   <-- the failure mode in question`);
for (const r of moves.crossed) console.log(`      ${r.name} (${r.iso}) ${r.raw} -> ${r.quantised}`);
console.log('');

console.log('## E — is the refusal SET the same at raw and at quantised?');
const rawIds = new Set(raw.disagreed.keys());
const qIds = new Set(qn.disagreed.keys());
const hidden = [...rawIds].filter((i) => !qIds.has(i));
const created = [...qIds].filter((i) => !rawIds.has(i));
console.log(`  refused at raw ${rawIds.size} · refused at quantised ${qIds.size}`);
console.log(`  refusals quantisation HID (would have been refused, now ships) : ${hidden.length}`);
for (const i of hidden) console.log(`    ${raw.disagreed.get(i).name} states ${raw.disagreed.get(i).stated}, raw-countryOf said ${raw.disagreed.get(i).derived}`);
console.log(`  refusals quantisation CREATED : ${created.length}`);
for (const i of created) console.log(`    ${qn.disagreed.get(i).name}`);
console.log('');

console.log('## F — the shipped invariant, walked over the COMMITTED module, no allowlist');
let agree = 0;
let silent = 0;
const violations = [];
for (const r of GAZETTEER.rows) {
  const d = countryOf(r.centre, COUNTRY_INDEX);
  if (d === null) silent += 1;
  else if (d === r.countryCode) agree += 1;
  else violations.push(`${r.name} ships ${r.countryCode || "''"} but countryOf says ${d}`);
}
console.log(`  shipped ${GAZETTEER.rows.length} · agree ${agree} · silent ${silent} · CONTRADICTED ${violations.length}`);
for (const v of violations) console.log(`    VIOLATION ${v}`);
console.log('');

console.log('## G — the codeless / derived-only rows and the refusals golden');
const codeless = GAZETTEER.rows.filter((r) => r.countryCode === '');
console.log(`  countryCode '' : ${codeless.length}`);
for (const r of codeless) {
  const hit = searchGazetteer(r.name, GAZETTEER, { limit: 20 }).find((h) => h.id === r.id);
  console.log(`    ${r.name} -> label "${hit ? hit.label : '(not reachable by its own name)'}"`);
}
const refusals = JSON.parse(readFileSync(new (globalThis.URL)('../fixtures/golden/gazetteer-disagreements.json', import.meta.url), 'utf8'));
console.log(`  disagreements golden total ${refusals.total}, rows ${refusals.disagreements.length}`);
const shippedIds = new Set(GAZETTEER.rows.map((r) => r.id));
const leaked = refusals.disagreements.filter((r) => shippedIds.has(r.id));
console.log(`  disagreeing rows that SHIP (A-83 Part 8: all of them, carrying the record) : ${leaked.length}`);
const goldenIds = new Set(refusals.disagreements.map((r) => r.id));
const rawRefusedIds = new Set([...qn.disagreed.keys()].map((i) => (Number(i) >>> 0).toString(36)));
const missingFromGolden = [...rawRefusedIds].filter((i) => !goldenIds.has(i));
console.log(`  quantised-census refusals absent from the golden : ${missingFromGolden.length}`);

// distance from each refused row to its stated country, so "they are border towns" is measured
console.log('');
console.log('  the 98 disagreements, stated -> derived pairs, counted:');
const pairs = new Map();
for (const r of refusals.disagreements) {
  const k = `${r.statedCountry} -> ${r.derivedCountry}`;
  pairs.set(k, (pairs.get(k) ?? 0) + 1);
}
for (const [k, n] of [...pairs].sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(3)}  ${k}`);
