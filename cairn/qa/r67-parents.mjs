/**
 * QA round 67 — **KD-119 adjudicated against the layer itself, not against the disclosure.**
 *
 * `KD-119` says A-84 Part 5's per-row parent was replaced by a **modal** parent per country code,
 * with a 0.05° coastal tolerance, because per-row containment ships Saint-Georges as Brazil and
 * splits Mayotte 39 `FR` / 11 `null`. Every one of those numbers is a claim about a file that is
 * **not** committed — `ne_10m_admin_0_countries.geojson` — so it cannot be checked from the repo.
 * This probe fetches that file at the tag `tools/gen-countries.mjs` pins, checks its sha256
 * against the pin, re-implements the generator's own `locate()` (same ray-cast, same 0.05°
 * tolerance, same `ISO_A2_EH` column) and re-derives, per row:
 *
 *   - the code the row's OWN coordinate resolves to, and how (`contained`/`nearest`/`none`);
 *   - whether that equals the code the row actually SHIPS;
 *   - the per-code distribution, which is what the modal rule collapses.
 *
 *   node qa/r67-parents.mjs                      # fetches to the scratchpad if needed
 *   CAIRN_ADMIN0=/path/ne_10m_admin_0_countries.geojson node qa/r67-parents.mjs
 *
 * It writes nothing to the repo. The download goes to `$TMPDIR` (or `CAIRN_ADMIN0`'s directory).
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const CAIRN = dirname(dirname(fileURLToPath(import.meta.url)));
const URL_ = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson';
const SHA = '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255';
const TOL = 0.05;

let fails = 0;
const ok = (c, m, x) => { if (c) console.log(`  ok   ${m}`); else { fails++; console.log(`  FAIL ${m}${x === undefined ? '' : `  — ${x}`}`); } };
const note = (m) => console.log(`  note ${m}`);
const head = (s) => console.log(`\n== ${s}`);

const cache = process.env.CAIRN_ADMIN0 ?? join(tmpdir(), 'cairn-qa', 'ne_10m_admin_0_countries.geojson');
if (!existsSync(cache)) {
  mkdirSync(dirname(cache), { recursive: true });
  console.log(`fetching ${URL_} → ${cache}`);
  const res = await fetch(URL_);
  if (!res.ok) { console.log(`SKIPPED: fetch failed ${res.status}`); process.exit(0); }
  writeFileSync(cache, Buffer.from(await res.arrayBuffer()));
}
const bytes = readFileSync(cache);
const sha = createHash('sha256').update(bytes).digest('hex');
head('A  the layer, at the pin the generator declares');
ok(sha === SHA, `A1  sha256 of the fetched layer matches gen-gazetteer.mjs's admin0 pin`, sha);
if (sha !== SHA) { console.log('\nrefusing to adjudicate against different bytes'); process.exit(1); }

// The generator's own locate(), re-implemented from tools/gen-gazetteer.mjs `readAdmin0`.
const isIso = (s) => typeof s === 'string' && /^[A-Z]{2}$/.test(s);
const features = [];
for (const f of JSON.parse(bytes.toString('utf8')).features) {
  const p = f.properties;
  const code = isIso(p.ISO_A2_EH) ? p.ISO_A2_EH : null;
  if (!f.geometry) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    const rings = poly.map((r) => r.map(([lng, lat]) => [lng, lat]));
    let a = Infinity; let b = Infinity; let c = -Infinity; let d = -Infinity;
    for (const [lng, lat] of rings[0]) { if (lng < a) a = lng; if (lng > c) c = lng; if (lat < b) b = lat; if (lat > d) d = lat; }
    features.push({ code, name: p.NAME, rings, box: [a, b, c, d] });
  }
}
const inRing = (ring, x, y) => {
  let ins = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
};
const seg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax; const dy = by - ay; const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const locate = (lng, lat) => {
  for (const f of features) {
    const [a, b, c, d] = f.box;
    if (lng < a || lng > c || lat < b || lat > d) continue;
    if (!inRing(f.rings[0], lng, lat)) continue;
    let hole = false;
    for (let i = 1; i < f.rings.length; i += 1) if (inRing(f.rings[i], lng, lat)) { hole = true; break; }
    if (!hole) return { code: f.code, name: f.name, via: 'contained', degrees: 0 };
  }
  let best = null;
  for (const f of features) {
    const [a, b, c, d] = f.box;
    if (lng < a - TOL || lng > c + TOL || lat < b - TOL || lat > d + TOL) continue;
    for (const ring of f.rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const dd = seg(lng, lat, ring[j][0], ring[j][1], ring[i][0], ring[i][1]);
        if (best === null || dd < best.degrees) best = { code: f.code, name: f.name, via: 'nearest', degrees: dd };
      }
    }
  }
  return best !== null && best.degrees <= TOL ? best : { code: null, name: null, via: 'none', degrees: Infinity };
};
note(`${features.length} polygons read`);

const C = await import('./corpus.mjs');
const core = await import(pathToFileURL(join(CAIRN, 'packages/core/src/index.ts')).href);
const { gazetteer: W } = C.wholeCorpus();
const byId = new Map(W.rows.map((r) => [r.id, r]));
const G = JSON.parse(readFileSync(join(CAIRN, 'fixtures/golden/gazetteer-parents.json'), 'utf8'));

head('B  every published parent row, re-derived from its own coordinate');
let viaMismatch = 0;
const codeMismatch = [];
const perCode = new Map();
for (const p of G.parents) {
  const row = byId.get(p.id);
  if (row === undefined) { fails += 1; console.log(`  FAIL published parent ${p.id} does not ship`); continue; }
  const loc = locate(row.centre.lng, row.centre.lat);
  if (loc.via !== p.via) { viaMismatch += 1; if (viaMismatch <= 5) console.log(`       via drift: ${p.name} golden=${p.via} re-derived=${loc.via}`); }
  const g = perCode.get(p.statedCode) ?? [];
  g.push({ name: p.name, own: loc.code, ownName: loc.name, via: loc.via, ships: p.shippedCode });
  perCode.set(p.statedCode, g);
  if (loc.code !== p.shippedCode) codeMismatch.push({ name: p.name, stated: p.statedCode, ships: p.shippedCode, ownContaining: loc.code, ownFeature: loc.name, via: loc.via });
}
ok(viaMismatch === 0, `B1  the golden's \`via\` equals the row's own re-derived \`via\` for all ${G.parents.length} rows`, String(viaMismatch));
note(`${codeMismatch.length} of ${G.parents.length} rows SHIP a code their own coordinate does not resolve to — the modal rule's whole effect:`);
for (const m of codeMismatch) note(`   ${m.name}: ships ${m.ships}, own coordinate resolves to ${m.ownContaining} (${m.ownFeature ?? '—'}) via ${m.via}`);

head('C  KD-119\'s four named measurements, re-derived');
const named = (n) => G.parents.filter((p) => p.name === n).map((p) => ({ p, row: byId.get(p.id) }));
for (const n of ['Saint-Georges', 'Longyearbyen', 'Basse-Terre', 'Dzaoudzi']) {
  for (const { p, row } of named(n)) {
    const loc = locate(row.centre.lng, row.centre.lat);
    note(`  ${n} @ ${row.centre.lat},${row.centre.lng}: per-row → ${loc.code} (${loc.name ?? '—'}) via ${loc.via} ${loc.degrees === Infinity ? '' : `${(loc.degrees * 111).toFixed(1)} km`}; ships ${p.shippedCode}`);
  }
}
const sg = named('Saint-Georges')[0];
const sgLoc = locate(sg.row.centre.lng, sg.row.centre.lat);
ok(sgLoc.code === 'BR', 'C1  KD-119 is right that per-row containment puts Saint-Georges in BRAZIL', `it resolves to ${sgLoc.code}`);
ok(sg.p.shippedCode === 'FR', 'C2  and the modal rule ships it FR, which is A-84 Part 5\'s named outcome');
ok(sg.p.via === 'contained' && sgLoc.code !== 'FR',
  'C3  the golden records `via: "contained"` beside `shippedCode: "FR"` for a row contained in BRAZIL — the artefact cannot be read as it reads',
  `via=${sg.p.via} shipped=${sg.p.shippedCode} containing=${sgLoc.code}`);

head('D  the modal collapse, per stated code');
for (const [code, g] of [...perCode].sort()) {
  const tally = new Map();
  for (const x of g) tally.set(String(x.own), (tally.get(String(x.own)) ?? 0) + 1);
  const sorted = [...tally].sort((a, b) => b[1] - a[1]);
  note(`  ${code} ×${g.length} ships ${g[0].ships} — per-row: ${sorted.map(([k, n]) => `${k}×${n}`).join(' ')}`);
  const minority = sorted.slice(1).reduce((n, [, c]) => n + c, 0);
  ok(minority === 0 || sorted[0][0] === String(g[0].ships),
    `D1  ${code}: the shipped code IS the modal per-row answer`, JSON.stringify(sorted));
}
const straddles = [...perCode].filter(([, g]) => {
  const real = new Set(g.filter((x) => x.own !== null).map((x) => x.own));
  return real.size > 1;
});
note(`stated codes whose rows genuinely resolve to MORE THAN ONE country: ${straddles.length}`);
for (const [code, g] of straddles) {
  const t = new Map();
  for (const x of g) t.set(String(x.own), (t.get(String(x.own)) ?? 0) + 1);
  note(`   ${code}: ${[...t].map(([k, n]) => `${k}×${n}`).join(' ')} → all ship ${g[0].ships}`);
}

head('E  what a modal parent would do to a code that really is split — measured, not argued');
// The counterfactual the ruling cannot show from this corpus: take every stated code in the WHOLE
// corpus (not just the undrawable ones), locate each row, and count how many codes would have had
// a minority arm big enough for a modal rule to overrule a genuinely different sovereign.
const sample = W.rows.filter((r) => r.countryCode !== null && r.indexSays === 'differs');
note(`${sample.length} shipped rows DISAGREE with countryOf — the population a modal rule would have absorbed had these codes been undrawable`);
const disByCode = new Map();
for (const r of sample) disByCode.set(r.countryCode, (disByCode.get(r.countryCode) ?? 0) + 1);
const top = [...disByCode].sort((a, b) => b[1] - a[1]).slice(0, 8);
note(`  top: ${top.map(([c, n]) => `${c}×${n}`).join(' ')}`);

console.log(`\n${fails} FAIL`);
console.log('COMPLETE');
