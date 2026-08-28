/**
 * gen-countries.mjs — builds `packages/core/src/geo/countries.gen.ts` from Natural Earth's
 * admin-0 country boundaries (ARCHITECTURE §8.4 clause 1, ROADMAP Phase 2 I-5).
 *
 * Run:
 *   node tools/gen-countries.mjs                 # 1:110m base + 1:10m fill + 1:50m forgiveness
 *                                                #   (the shipped index; also writes
 *                                                #   fixtures/golden/forgiveness-drops.json)
 *   node tools/gen-countries.mjs --scale 50m     # a different base; the budget moves with it
 *   node tools/gen-countries.mjs --no-fill       # the base scale alone, for A-26 Part 2's comparison
 *   node tools/gen-countries.mjs --dry-run       # measure and audit, write nothing
 *   node tools/gen-countries.mjs --audit-only    # audit the COMMITTED module, fetch nothing
 *   node tools/gen-countries.mjs --holes         # write fixtures/golden/country-holes.json
 *
 * **The index is mixed-resolution (ARCHITECTURE §8.4 A-26, ROADMAP Phase 2 I-5a).** The base scale
 * is 1:110m because it leaves the fewest records of the reference corpus unattributed — a coarse
 * ring bulges *outward* at a convex coast and forgives the shoreline coordinates travel data is
 * made of, where a fine one tracks the waterline and drops them. But the 1:110m layer carries only
 * 175 of the family's 239 ISO codes: Malta, the Maldives, Macao, Hong Kong, Singapore, Bermuda,
 * the Faroes and 57 more are either unreachable or answered with a wrong neighbour. So after
 * building the base, this generator fetches the family's FINEST scale and splices in the polygons
 * of exactly the codes the base does not carry — nothing else — and emits every entry in
 * **ascending summed absolute spherical ring area, ties by ISO code ascending**, which is the
 * order `countryOf` must test them in: an enclave is always smaller than the thing enclosing it,
 * so San Marino's ring is reached before Italy's. `countryIndex()` preserves that order; it does
 * not re-derive it. See A-26 Parts 4 and 6.
 *
 * **And a filled code ships a second entry — the forgiveness entry (ARCHITECTURE §8.4 A-27 as
 * A-28 replaced its filter 2, ROADMAP Phase 2 I-5b and I-5c).** The fill is the family's finest
 * scale, which is the scale A-26 Part 2
 * measured and rejected for the base: it tracks the waterline, and five of the sixty-four filled
 * countries came back `null` at their own capital. A-27 measured the obvious remedy — pick a
 * coarser scale per code — and **rejected it**, because substituting the coarser polygon deletes
 * whole landforms (175 of the Maldives' 176 atolls, 67 of French Polynesia's 88). So a filled code
 * is not made to choose. It ships the fine rings for coverage AND, as a **separate entry under the
 * same ISO code**, the same country's rings at each strictly coarser scale of the family, filtered
 * so that the coarse ring may only claim ground that is genuinely uncontested. That is **three**
 * comparisons, not two: it must overlap the code's own coverage rings (filter 1 — it is the same
 * place), no other entry of the coverage-only index (arm 2a — forgiveness is never taken from a
 * neighbour as the index draws it), and no other ISO code at the family's FINEST scale (arm 2b —
 * nor from a neighbour the mixed-resolution index draws too coarsely to defend itself, which is
 * how `MO` came to claim ~22.1 km² of Guangdong; QA R23-1). Two entries of one code compose as a
 * union, because `countryOf` returns on the first *entry* whose rings contain the point and the
 * even-odd rule runs within an entry. `overlaps`, filter 1 and both arms live in
 * `tools/forgiveness.mjs`; see A-28 Part 3 first, then A-27 Parts 3 and 7.
 *
 * **This runs at generation time, by a human, once. Nothing in the shipped product runs it.**
 * `packages/core`, `packages/client` and `apps/web` never fetch anything for this feature — the
 * emitted module is committed and is the whole dataset. §6.1 forbids sending a coordinate to a
 * geocoder in any phase, and this file is how that is affordable.
 *
 * **Where the bytes come from.** §8.4's citation: `naturalearthdata.com` answers
 * `CONNECT tunnel failed, response 403` through this environment's egress proxy, so the source is
 * Natural Earth's own vector repository, `nvkelso/natural-earth-vector`, at the **pinned tag
 * `v5.1.2`** — not `master`, which carries a moving `5.2.0-pre`. A committed generated module
 * fetched from a moving ref is a measurement nobody can reproduce, and the size budget in
 * `packages/core/test/0-countryBudget.test.ts` is precisely such a measurement. The checksums
 * below are §8.4's, and a fetch that does not match one is REPORTED, never absorbed.
 *
 * Public domain: "Everything here is public domain … the primary authors, Tom Patterson and
 * Nathaniel Vaughn Kelso, and all other contributors renounce all financial claim"
 * (nvkelso/natural-earth-vector LICENSE.md at v5.1.2, verified 2026-08-28).
 */
import { writeFileSync, readFileSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { forgivenessFor, overlaps, prepRing, prepSet } from './forgiveness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const OUT = resolve(CAIRN, 'packages/core/src/geo/countries.gen.ts');
const DROPS_OUT = resolve(CAIRN, 'fixtures/golden/forgiveness-drops.json');

const TAG = 'v5.1.2';
const REPO = 'nvkelso/natural-earth-vector';
const base = (file) => `https://raw.githubusercontent.com/${REPO}/${TAG}/geojson/${file}`;

/**
 * The three admin-0 scales at the pinned tag. `sha256` and `bytes` for 110m and 50m are
 * §8.4's own recorded figures. 10m carries no §8.4 checksum — the citation says only that it is
 * "reachable too" — so its pin is marked as measured by this generator, and a run at that scale
 * says so out loud rather than implying the architect verified it.
 */
const SCALES = {
  '110m': {
    file: 'ne_110m_admin_0_countries.geojson',
    bytes: 838726,
    sha256: '6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f',
    pinnedBy: 'ARCHITECTURE §8.4',
  },
  '50m': {
    file: 'ne_50m_admin_0_countries.geojson',
    bytes: 3083490,
    sha256: '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb',
    pinnedBy: 'ARCHITECTURE §8.4',
  },
  '10m': {
    file: 'ne_10m_admin_0_countries.geojson',
    bytes: 13287234,
    sha256: '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255',
    pinnedBy: 'measured by this generator on 2026-08-28; §8.4 records no checksum for 10m',
  },
};

/** Coordinate decimals kept. 1e-4° ≈ 11 m — two orders of magnitude finer than the km-scale
 *  generalisation error of any admin-0 layer, and the quantisation is checked, not assumed:
 *  `verifyQuantisation` below re-attributes a global grid against the unquantised rings. */
const DECIMALS = 4;

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

/** Coarsest first. `resolvesAt` in the holes golden is the FIRST of these that attributes, and
 *  the index of a scale in this array is the emitted order's third sort key (A-27 Part 7). */
const FAMILY = ['110m', '50m', '10m'];
/** The fill scale: the family's finest. A-26 Part 4 — the fill is 64 small polygons, not an escalation. */
const FILL = '10m';
/** The forgiveness scales: every scale of the family strictly COARSER than the fill, coarsest
 *  first (A-27 Part 4). With `FAMILY`/`FILL` as pinned this is `['110m', '50m']`, and the base
 *  layer contributes nothing by construction — a filled code is one the base does not carry. */
const FORGIVE = FAMILY.slice(0, FAMILY.indexOf(FILL));

/**
 * **A-28 Part 3's trigger, asserted rather than left to be discovered.** Filter 1's population is
 * the code's own *coverage* rings, which for a filled code are the fill — so filter 1 compares at
 * the family's finest resolution today and carries no instance of R23-1's class **by construction,
 * not by luck**. That construction is exactly this equality. The moment `FILL` is not `FAMILY`'s
 * last element, filter 1 starts comparing a 1:50m candidate against a coarser drawing of the same
 * country and acquires the defect A-28 just fixed one filter to the right — so it fails here,
 * loudly, instead of quietly re-opening it.
 */
if (FILL !== FAMILY[FAMILY.length - 1]) {
  console.error(
    `gen-countries: FILL is "${FILL}" but the pinned family's finest scale is ` +
      `"${FAMILY[FAMILY.length - 1]}". ARCHITECTURE §8.4 A-28 Part 3: filter 1 only avoids R23-1 ` +
      'because the fill IS the finest scale, so a filled code\'s own coverage rings are already ' +
      'the finest drawing of it. Change either constant and filter 1 needs its own second arm — ' +
      'that is an architect decision, not a regeneration.',
  );
  process.exit(2);
}

/**
 * **And the ordering that equality stands for (QA R24-3).** The assertion above guards A-28 Part
 * 3's *sentence*; this one guards its *invariant*. `FILL === FAMILY[FAMILY.length - 1]` means "the
 * fill is the family's finest scale" only while `FAMILY` is ordered coarsest-first — which its own
 * comment states and, until this, nothing checked. Reorder it to `['110m', '10m', '50m']` with
 * `FILL = '50m'` and the equality above is still satisfied, while arm 2b — which reads "the finest
 * scale that carries this code" off the LAST family entry carrying it — starts comparing 1:10m
 * candidates against 1:50m neighbours, and filter 1 compares a 1:10m candidate against the code's
 * own 1:50m coverage. That is R23-1's class, reintroduced inside the arm A-28 added to prevent it.
 *
 * The ordering is checked from **data rather than from the scale names**: a coarser admin-0 layer is
 * a smaller file, so the pinned byte counts must strictly increase across the family. They do —
 * 838,726 / 3,083,490 / 13,287,234, re-fetched and re-measured over the network on 2026-08-28 — and
 * that is the only fact this needs. A family member with no `SCALES` entry has no byte count to
 * order and fails here too, which is the same class of change.
 */
for (let i = 0; i < FAMILY.length; i++) {
  const here = SCALES[FAMILY[i]];
  const fail = (why) => {
    console.error(
      `gen-countries: FILL is "${FILL}", which IS FAMILY's last scale — but FAMILY is not ordered ` +
        `coarsest-first, so its last scale is not its finest: ${why}. ARCHITECTURE §8.4 A-28 Part 3 ` +
        "reads FILL === FAMILY[FAMILY.length - 1] as \"the fill is the family's FINEST scale\", and " +
        'that is only the same statement while this array is ordered coarsest first. Out of order, ' +
        'arm 2b and filter 1 both start comparing a candidate against a COARSER drawing of its ' +
        'neighbour — QA R23-1 — with the assertion above still green. Fix the order, or the ' +
        'population both arms are built from is an architect decision, not a regeneration.',
    );
    process.exit(2);
  };
  if (!here) fail(`"${FAMILY[i]}" is not a pinned scale, so it has no size to order by`);
  if (i > 0 && here.bytes <= SCALES[FAMILY[i - 1]].bytes) {
    fail(
      `"${FAMILY[i]}" (${here.bytes} bytes) is not finer than "${FAMILY[i - 1]}" ` +
        `(${SCALES[FAMILY[i - 1]].bytes} bytes)`,
    );
  }
}

const scaleKey = opt('scale', '110m');
const scale = SCALES[scaleKey];
if (!scale) {
  console.error(`gen-countries: unknown --scale "${scaleKey}". One of: ${Object.keys(SCALES).join(', ')}`);
  process.exit(2);
}

main().catch((err) => {
  console.error(`gen-countries: ${err.message}`);
  process.exit(1);
});

async function main() {
  if (flag('audit-only')) {
    const { COUNTRY_INDEX } = await import('../packages/core/src/index.ts');
    console.log(`auditing the COMMITTED module: ${COUNTRY_INDEX.scale} (${COUNTRY_INDEX.source})`);
    await audit(COUNTRY_INDEX);
    return;
  }
  if (flag('holes')) {
    await writeHoles();
    return;
  }

  const baseDl = await download(scaleKey);
  const geo = JSON.parse(baseDl.buf.toString('utf8'));
  const built = build(geo, null, scaleKey);
  console.log(
    `  ${geo.features.length} features -> ${built.entries.length} ISO-coded countries, ` +
      `${built.stats.rings} rings, ${built.stats.points} points (${built.stats.dropped} rings dropped as degenerate)`,
  );
  if (built.skipped.length) {
    console.log(`  skipped (no ISO 3166-1 alpha-2 code, left unattributed by design — §8.4):`);
    for (const s of built.skipped) console.log(`    ${s}`);
  }

  // ---- the fill (A-26 Part 4). Exactly the ISO codes the base does not carry, and nothing else.
  const baseCodes = new Set(built.entries.map((e) => e.code));
  let entries = built.entries;
  let filled = [];
  let fillDl = null;
  let fillGeo = null;
  const doFill = !flag('no-fill') && scaleKey !== FILL;
  if (doFill) {
    fillDl = await download(FILL);
    fillGeo = JSON.parse(fillDl.buf.toString('utf8'));
    // Which codes are missing is decided from the fill's OWN full code list, then only those are
    // quantised — the other 175 are thrown away, so the emitted module never carries 1:10m detail
    // for a country the base already names.
    const fillCodes = codesOf(fillGeo);
    const want = new Set([...fillCodes].filter((c) => !baseCodes.has(c)));
    const fillBuilt = build(fillGeo, want, FILL);
    filled = fillBuilt.entries.map((e) => e.code).sort();
    entries = [...built.entries, ...fillBuilt.entries];
    console.log(
      `  fill from ${FILL}: base carries ${baseCodes.size} codes, ${FILL} carries ${fillCodes.size}; ` +
        `splicing ${filled.length} (+${fillBuilt.stats.rings} rings, +${fillBuilt.stats.points} points, ` +
        // R22-5: the fill's own degenerate-ring count, reported beside the base's rather than
        // discarded. A fill that silently loses a small island's only ring would otherwise be
        // invisible — the `stillMissing` throw below only catches a code losing ALL of its rings.
        `${fillBuilt.stats.dropped} rings dropped as degenerate)`,
    );
    console.log(`    ${wrap(filled.join(' '), 88, '    ')}`);
    const stillMissing = [...want].filter((c) => !filled.includes(c)).sort();
    if (stillMissing.length) {
      // Criterion 4c's coverage half, enforced at generation time: a code the finest scale carries
      // that does not reach the index is a silent hole, and this is where it must be caught.
      throw new Error(`fill lost ${stillMissing.length} code(s) the finest scale carries: ${stillMissing.join(' ')}`);
    }
  } else {
    console.log(`  fill: none (${flag('no-fill') ? '--no-fill' : `base is already ${FILL}`})`);
  }

  // ---- the forgiveness pass (A-27 Part 4). Filled codes only, and nothing else.
  const forgiveness = await forgivenessPass({
    filled,
    coverage: orderEntries(entries),
    layers: new Map([
      [scaleKey, { geo, sha: baseDl.sha }],
      ...(fillGeo ? [[FILL, { geo: fillGeo, sha: fillDl.sha }]] : []),
    ]),
  });
  entries = [...entries, ...forgiveness.entries];

  // ---- the order IS the artefact (A-26 Part 4, A-27 Part 7): ascending area, ties by ISO code
  //      ascending, then by scale coarsest first.
  entries = orderEntries(entries);
  const stats = statsOf(entries);
  console.log(
    `  emitted order: ascending polygon area, ties by code, then scale coarsest first — ` +
      `${entries[0].code} (smallest) … ${entries[entries.length - 1].code} (largest)`,
  );

  // ---- criterion 4(e)'s third-source comparison (ROADMAP revision 22, A-28 Part 1's lesson).
  //      Every OTHER sweep this generator and its tests run compares the index against ITSELF,
  //      which is exactly why 22.1 km² of Guangdong could be gained without any of them noticing:
  //      a cell going `null → MO` books as a *gain*. This asks a third source — the pinned
  //      family's FINEST layer, the one the fill is cut from — about the ground every admitted
  //      forgiveness ring claims, and it asks it of the EMITTED artefact rather than of the pass's
  //      own bookkeeping.
  const forgivenessAt = [];
  entries.forEach((e, i) => {
    if (e.forgiveness) forgivenessAt.push(i);
  });
  const thirdSource = thirdSourceCheck(entries, forgivenessAt, forgiveness);

  const rawMixed = mixedRaw(entries);
  const quantMisses = verifyQuantisation(rawMixed, entries);
  console.log(`  quantisation check: ${quantMisses} grid points changed answer at ${DECIMALS} dp`);
  if (quantMisses > 0) throw new Error(`quantisation to ${DECIMALS} dp moved ${quantMisses} attributions`);

  const usedScales = forgiveness.scalesUsed;
  const indexScale = [scaleKey, ...(doFill ? [FILL] : []), ...usedScales].join('+');
  const source = doFill
    ? `${REPO}@${TAG}/geojson/${scale.file} (base) + ${SCALES[FILL].file} ` +
      `(fill: ${filled.length} codes the base omits)` +
      (usedScales.length
        ? ` + ${usedScales.map((k) => SCALES[k].file).join(' + ')} ` +
          // A-28, not A-27: A-28 Part 3 replaced filter 2 in full, and it is the two-arm filter
          // that produced THIS index. The string reaches `COUNTRY_INDEX.source` and the web
          // bundle, so a reader tracing the artefact's provenance must land on the live ruling
          // (QA R24-2). Four characters, deliberately — the emitted byte count is pinned.
          `(forgiveness: ${forgiveness.codes.length} of those codes, A-28)`
        : '')
    : `${REPO}@${TAG}/geojson/${scale.file}`;
  const shas = doFill
    ? [
        `${scale.file} ${baseDl.sha}`,
        `${SCALES[FILL].file} ${fillDl.sha}`,
        ...usedScales.map((k) => `${SCALES[k].file} ${forgiveness.shas.get(k)}`),
      ]
    : [`${scale.file} ${baseDl.sha}`];
  const text = emit({ scaleKey, indexScale, source, shas, entries, stats, filled, forgiveness });

  roundTrip(text, entries);
  console.log(`  round-trip: the emitted literal re-parses to the same ${entries.length} countries`);

  const local = toIndex(entries, indexScale, source);
  const disagreements = await crossCheck(entries, local);
  console.log(`  cross-check: countryOf() vs the generator's own ray cast — ${disagreements} disagreements`);
  if (disagreements > 0) throw new Error(`countryOf disagrees with the generator on ${disagreements} grid points`);

  if (flag('dry-run')) {
    console.log(`\nemitted bytes: ${Buffer.byteLength(text, 'utf8')}   (dry run — nothing written)`);
    console.log('  (the audit below runs against the index just built in memory, not the committed module)');
    await audit(local);
    return;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, text);
  const written = statSync(OUT).size;
  console.log(`\nwrote packages/core/src/geo/countries.gen.ts`);
  console.log(`emitted bytes: ${written}`);
  console.log(`  ^ this is the number that goes in EMITTED_BYTES in`);
  console.log(`    packages/core/test/0-countryBudget.test.ts, and in no document.`);
  console.log(
    `  entries: ${entries.length}   distinct codes: ${new Set(entries.map((e) => e.code)).size}` +
      `   rings: ${stats.rings}   points: ${stats.points}`,
  );
  writeDrops(forgiveness, indexScale, source, forgivenessAt, thirdSource);
  // Audit the module that was actually written, decoded the way the product decodes it — not the
  // in-memory build. A generator that audits its own intermediate value cannot see an emit bug.
  //
  // In a CHILD PROCESS, and that is the whole point: `crossCheck` above has already imported
  // `packages/core/src/index.ts`, so `countries.gen.ts` is in this process's module cache and a
  // cache-busting query on the barrel does not reload it. Before I-5a this line re-audited the
  // PREVIOUS module and reported its scale — the guard was reading the file it had just replaced.
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--audit-only'], {
    stdio: 'inherit',
  });
  if (child.status !== 0) throw new Error(`the post-write audit exited ${child.status}`);
}

/** Fetches one pinned scale and refuses to continue if the bytes are not the pinned bytes. */
async function download(key) {
  const s = SCALES[key];
  const url = base(s.file);
  console.log(`fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sha = createHash('sha256').update(buf).digest('hex');
  console.log(`  ${buf.length} bytes, sha256 ${sha}`);
  console.log(`  pinned : ${s.bytes} bytes, sha256 ${s.sha256}  (${s.pinnedBy})`);
  if (sha !== s.sha256 || buf.length !== s.bytes) {
    // Reported, not absorbed. A tag that moved is a fact about the world, and the right response
    // is a ruling on which bytes are canonical, not a quietly different committed module.
    console.error(
      'gen-countries: DOWNLOAD DOES NOT MATCH THE PIN. Not writing. The tag is supposed to be\n' +
        'immutable; if it genuinely moved, that is an architect decision, not a regeneration.',
    );
    process.exit(3);
  }
  return { buf, sha };
}

// ---------------------------------------------------------------- building

/**
 * GeoJSON features -> `[{code, rings}]`. `ISO_A2_EH` is the code column: it is the one Natural
 * Earth fills in for the de-facto entities that `ISO_A2` leaves as `-99`. Features that still
 * have no alpha-2 code (N. Cyprus, Somaliland at 110m) are DROPPED, not invented: §8.4 says a
 * disputed area is reported as unattributed, and minting a code for one here would be exactly the
 * guess `null` exists to refuse.
 */
function build(geo, only = null, scaleTag = null) {
  const q = (n) => Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS;
  const byCode = new Map();
  const skipped = [];
  let rings = 0;
  let points = 0;
  let dropped = 0;

  for (const f of geo.features) {
    const p = f.properties;
    const code = typeof p.ISO_A2_EH === 'string' && /^[A-Z]{2}$/.test(p.ISO_A2_EH) ? p.ISO_A2_EH : null;
    if (!code) {
      if (!only) skipped.push(`${p.NAME} (SOVEREIGNT=${p.SOVEREIGNT}, ISO_A2_EH=${p.ISO_A2_EH})`);
      continue;
    }
    if (only && !only.has(code)) continue;
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const out = byCode.get(code) ?? { rings: [], raw: [] };
    for (const poly of polys) {
      for (const ring of poly) {
        const flat = [];
        let px = null;
        let py = null;
        for (const c of ring) {
          const x = q(c[0]);
          const y = q(c[1]);
          if (x === px && y === py) continue; // collapsed by quantisation
          flat.push(x, y);
          px = x;
          py = y;
        }
        // A ring needs three distinct points to enclose anything.
        if (flat.length < 6) {
          dropped++;
          continue;
        }
        out.rings.push(flat);
        // The unquantised twin of the ring just kept, at the same index. `verifyQuantisation`
        // compares the two attributions ring-for-ring, so the raw list has to be built HERE,
        // beside the ring it belongs to — a raw list rebuilt afterwards from the source layer
        // silently re-includes the rings this loop dropped, and once one ISO code can supply
        // rings from two different scales (A-27) it cannot be rebuilt by code at all.
        out.raw.push(ring.flat());
        rings++;
        points += flat.length / 2;
      }
    }
    byCode.set(code, out);
  }

  // Insertion order, deliberately: `orderEntries` is the one place the emitted order is decided,
  // and A-26 Part 4 makes that order part of the committed artefact rather than a property this
  // function happens to have.
  const entries = [...byCode.entries()].map(([code, v]) => ({
    code,
    rings: v.rings,
    raw: v.raw,
    scale: scaleTag,
  }));
  return { entries, skipped, stats: { rings, points, dropped } };
}

// ------------------------------------------------- the forgiveness pass (A-27 Part 4, A-28 Part 3)

/**
 * **A-27 Part 4 as A-28 Part 3 replaced it, run.** For each filled ISO code — the codes the base
 * scale does not carry, and only those — take the same country's rings at each strictly coarser
 * scale of the pinned family that carries it, coarsest first, and keep a ring only if all three
 * of these hold. Filter 2's two arms are tested in order and a drop is booked against the first
 * that fires; both arms are required and neither substitutes for the other:
 *
 *  1. **filter 1** — it `overlaps` the code's own coverage rings: a coarser drawing of the same
 *     place. Its population is already the family's finest scale, which is why it needs no second
 *     arm and why `FILL`/`FAMILY` are asserted at the top of this file (A-28 Part 3, QA R24-3);
 *  2. **arm 2a** — it `overlaps` no OTHER entry of the coverage-only index, each at whatever
 *     resolution that entry ships at. The non-regression guarantee: it is what refuses `HK[1]`,
 *     `HK[2]` and `SG[0]`, whose ground is `CN`'s and `MY`'s as the index draws them at 1:110m;
 *  3. **arm 2b** — it `overlaps` no other ISO code at the FINEST scale of the pinned family that
 *     carries that code, whatever scale its own coverage entry uses. The truth guarantee: the
 *     mixed-resolution index cannot defend ground it draws too coarsely, which is how `MO` came
 *     to claim ~22.1 km² of Guangdong (QA R23-1). It is what refuses that ring.
 *
 * Surviving rings become a **second entry under the same ISO code**, never a merge into the first.
 * That matters: `countryOf` runs even-odd *within* an entry, so merging a coarse ring into the
 * fine ones would make the two cancel wherever they overlap — which is everywhere the forgiveness
 * entry is for. As two entries they compose as a union, because the function returns on the first
 * *entry* that contains the point.
 *
 * Every drop is recorded with the filter that made it and, for filter 2, the code it would have
 * taken ground from. A code with no surviving ring gets no entry and the run says so. **A
 * forgiveness entry can never introduce an ISO code the coverage pass did not emit** — the pass
 * only ever iterates `filled`, and the assertion below states that rather than assuming it.
 */
async function forgivenessPass({ filled, coverage, layers }) {
  const out = {
    entries: [],
    codes: [],
    refused: [],
    noCandidates: [],
    drops: [],
    candidates: 0,
    kept: 0,
    scalesUsed: [],
    shas: new Map(),
    // Arm 2b's population, kept for the third-source check in `main()`: every coverage code at the
    // finest scale of the pinned family that carries it, and the same set ordered for `pick()`.
    finest: new Map(),
    finestOrdered: [],
  };
  // Two distinct reasons to skip the pass, reported distinctly (QA R25-2). Reporting both as "no
  // filled codes" made the run contradict itself: with `FAMILY = ['10m']` the fill still splices 64
  // codes three lines above, and the log named a cause that had not happened.
  if (!FORGIVE.length) {
    console.log(
      `  forgiveness: none (no scale in FAMILY is coarser than the fill "${FILL}", so there is ` +
        'nothing to forgive from)',
    );
    return out;
  }
  if (!filled.length) {
    console.log(`  forgiveness: none (no filled codes)`);
    return out;
  }

  const filledSet = new Set(filled);
  const byCode = new Map(coverage.map((e) => [e.code, e]));
  const built = new Map(); // scale -> Map(code -> {rings, raw})
  const geoByScale = new Map([...layers.entries()].map(([k, v]) => [k, v.geo]));

  for (const key of FORGIVE) {
    const cached = layers.get(key);
    let geoHere = cached?.geo;
    if (cached) out.shas.set(key, cached.sha);
    else {
      const dl = await download(key);
      out.shas.set(key, dl.sha);
      geoHere = JSON.parse(dl.buf.toString('utf8'));
      geoByScale.set(key, geoHere);
    }
    const has = codesOf(geoHere);
    const want = new Set(filled.filter((c) => has.has(c)));
    if (!want.size) {
      console.log(`  forgiveness from ${key}: 0 of ${filled.length} filled codes appear at this scale — skipped`);
      built.set(key, new Map());
      continue;
    }
    const b = build(geoHere, want, key);
    built.set(key, new Map(b.entries.map((e) => [e.code, e])));
    console.log(
      `  forgiveness from ${key}: ${want.size} of ${filled.length} filled codes have a polygon here ` +
        `(${b.stats.rings} candidate rings, ${b.stats.dropped} dropped as degenerate)`,
    );
  }

  // **Arm 2b's population, built ONCE (A-28 Parts 3 and 7).** `F(c)` is every ISO code the
  // coverage-only index carries, drawn at *the finest scale of the pinned family that carries it*
  // — regardless of the scale that code's own coverage entry uses. That is the whole fix: the
  // shipped index is mixed-resolution, so arm 2a alone asks "do you overlap this neighbour as the
  // index happens to draw it", which for a 1:110m neighbour is a question at the wrong scale and
  // fails generously. Built here rather than inside the per-code loop because re-preparing 239
  // ring-sets 62 times is the difference between a generator run and a coffee break.
  const finestByCode = new Map();
  const finestFrom = new Map(); // scale -> how many codes took their finest drawing from it
  for (let i = FAMILY.length - 1; i >= 0; i--) {
    const key = FAMILY[i];
    const geoHere = geoByScale.get(key);
    if (!geoHere) continue; // a scale this run never fetched (--no-fill, --scale 10m)
    const want = new Set(coverage.map((e) => e.code).filter((c) => !finestByCode.has(c)));
    if (!want.size) break;
    const b = build(geoHere, want, key);
    for (const e of b.entries) finestByCode.set(e.code, { code: e.code, rings: e.rings });
    if (b.entries.length) finestFrom.set(key, b.entries.length);
  }
  const noFinest = coverage.map((e) => e.code).filter((c) => !finestByCode.has(c));
  if (noFinest.length) {
    // Unreachable with the pinned family — every code the index carries comes from one of these
    // very layers — and stated rather than assumed, because arm 2b silently skipping a neighbour
    // is R23-1 again with a different cause.
    throw new Error(`forgiveness: ${noFinest.length} coverage code(s) have no finest drawing: ${noFinest.join(' ')}`);
  }
  console.log(
    `  arm 2b population: ${finestByCode.size} codes at the finest scale that carries each — ` +
      [...finestFrom.entries()].map(([k, n]) => `${n} from ${k}`).join(', '),
  );
  out.finest = finestByCode;
  // Ordered the way the emitted index is, so `pick()` reaches an enclave before its encloser and
  // the third source's answers are the ones a properly-ordered index would give.
  out.finestOrdered = orderEntries([...finestByCode.values()].map((e) => ({ ...e, scale: FILL })));

  for (const code of filled) {
    const own = byCode.get(code);
    if (!own) throw new Error(`forgiveness: ${code} is filled but has no coverage entry`);
    const others = coverage.filter((e) => e.code !== code);
    const finestOthers = [...finestByCode.values()].filter((e) => e.code !== code);
    let got = 0;
    let sawCandidate = false;
    for (const key of FORGIVE) {
      const cand = built.get(key)?.get(code);
      if (!cand || !cand.rings.length) continue;
      sawCandidate = true;
      out.candidates += cand.rings.length;
      const { kept, drops } = forgivenessFor(cand.rings, own.rings, others, finestOthers);
      for (const d of drops) {
        out.drops.push({
          code,
          scale: key,
          filter: d.filter,
          against: d.against,
          takenFrom: d.code,
          ring: cand.rings[d.index],
        });
      }
      if (!kept.length) continue;
      out.kept += kept.length;
      got += kept.length;
      if (!out.scalesUsed.includes(key)) out.scalesUsed.push(key);
      out.entries.push({
        code,
        rings: kept.map((i) => cand.rings[i]),
        raw: kept.map((i) => cand.raw[i]),
        scale: key,
        // Survives `orderEntries`' spread, and is what lets the emitted positions of the
        // forgiveness entries be recorded exactly rather than guessed at from ring counts.
        forgiveness: true,
      });
    }
    if (got > 0) out.codes.push(code);
    else {
      out.refused.push(code);
      if (!sawCandidate) out.noCandidates.push(code);
    }
  }

  // The ceiling, asserted rather than assumed (A-27 Part 4, ROADMAP exit criterion 4 part e).
  for (const e of out.entries) {
    if (!filledSet.has(e.code)) {
      throw new Error(`forgiveness: ${e.code} is not a filled code — a forgiveness entry may not introduce one`);
    }
  }

  // The two arms are reported separately (A-28 Part 7): a run that says "9 by filter 2" cannot
  // tell a reader whether the arm that catches Macao is doing anything at all.
  const byFilter1 = out.drops.filter((d) => d.filter === 1);
  const by2a = out.drops.filter((d) => d.against === 'coverage');
  const by2b = out.drops.filter((d) => d.against === 'finest');
  console.log(
    `  forgiveness: ${out.entries.length} entries over ${out.codes.length} codes; ` +
      `${out.kept} of ${out.candidates} candidate rings kept, ${out.drops.length} dropped ` +
      `(${byFilter1.length} by filter 1 — not the same place; ` +
      `${by2a.length} by filter 2a — a neighbour's ground as the index draws it; ` +
      `${by2b.length} by filter 2b — a neighbour's ground at the finest scale)`,
  );
  console.log(`    ${wrap(out.codes.join(' '), 88, '    ')}`);
  for (const d of out.drops) {
    console.log(
      `    drop  ${d.code} @${d.scale}  filter ${d.filter}${d.against ? d.against === 'coverage' ? 'a' : 'b' : ' '}  ` +
        (d.filter === 2
          ? `overlaps ${d.takenFrom}${d.against === 'finest' ? ` at the finest scale — invisible to the shipped index` : ''}`
          : 'does not touch its own coverage rings'),
    );
  }
  console.log(
    `    refused a forgiveness entry (${out.refused.length}): ${out.refused.join(' ') || 'none'}` +
      (out.noCandidates.length ? `   — of which no polygon at any coarser scale: ${out.noCandidates.join(' ')}` : ''),
  );
  return out;
}

/**
 * `fixtures/golden/forgiveness-drops.json` — every candidate ring filter 1 or either arm of
 * filter 2 rejected (A-28 Part 3), with the filter, and for filter 2 the arm, that rejected it.
 *
 * **Why this is written at all.** A rejected ring is by definition absent from `countries.gen.ts`,
 * so ROADMAP exit criterion 4 part (e)'s two injected faults — *"delete filter 2 and the bordered codes gain
 * entries"*, *"delete filter 1 and Vatican City gains a polygon a kilometre west of itself"* —
 * cannot be asserted from the shipped artefact. `test/forgiveness.test.ts` re-runs the real
 * filters over these rings with each one switched off. Everything else those tests need (the
 * code's own coverage rings, every other entry's rings) comes out of `COUNTRY_INDEX`, so the only
 * thing committed here is the part that is otherwise unrecoverable.
 *
 * Generated, never hand-typed — I-5's dependency clause applies to every polygon in this
 * repository, test fixtures included.
 */
function writeDrops(forgiveness, indexScale, source, forgivenessAt, thirdSource) {
  // `forgivenessAt` is the positions, in the emitted array, of the entries the forgiveness pass
  // added. Recorded rather than inferred: two entries of one ISO code are indistinguishable in the
  // packed payload, so a test that wants "the coverage-only index" has no way to reconstruct it
  // from the artefact alone. With these,
  // `countries.filter((_, i) => !forgivenessAt.includes(i))` is exactly the index as it shipped
  // before I-5b, which is what makes the additive claim assertable.
  if (forgivenessAt.length !== forgiveness.entries.length) {
    throw new Error(
      `forgiveness: ${forgivenessAt.length} flagged entries emitted but ${forgiveness.entries.length} were built`,
    );
  }
  const out = {
    $generatedBy: 'cairn/tools/gen-countries.mjs',
    $what:
      "Every coarser-scale candidate ring that ARCHITECTURE §8.4 A-28 Part 3's filter 1 and " +
      "filter 2's two arms rejected, with the filter or arm that rejected it. These rings are " +
      'NOT in countries.gen.ts — ' +
      'that is the point: ROADMAP exit criterion 4(e) injects a fault into each filter and needs ' +
      'the rings the filters refused. Natural Earth admin-0, public domain, quantised exactly as ' +
      'the shipped module is.',
    index: { scale: `ne_${indexScale}`, source },
    candidateScales: [...FORGIVE],
    candidates: forgiveness.candidates,
    kept: forgiveness.kept,
    dropped: forgiveness.drops.length,
    entries: forgiveness.entries.length,
    codes: [...forgiveness.codes],
    forgivenessAt,
    refusedCodes: [...forgiveness.refused],
    noCandidates: [...forgiveness.noCandidates],
    drops: forgiveness.drops.map((d) => ({
      code: d.code,
      scale: d.scale,
      filter: d.filter,
      // A-28: which ARM refused it. `filter` stays 1|2 so the golden's shape and the run's
      // counting survive; `against` is what distinguishes a neighbour the shipped index can see
      // (2a) from one only the finest layer can (2b) — Macao's is the only 'finest' in the
      // artefact, and it is the whole point of the increment.
      against: d.against,
      takenFrom: d.takenFrom,
      ring: d.ring,
    })),
    thirdSource,
  };
  mkdirSync(dirname(DROPS_OUT), { recursive: true });
  writeFileSync(DROPS_OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(
    `wrote fixtures/golden/forgiveness-drops.json  (${out.dropped} rejected rings, ${statSync(DROPS_OUT).size} bytes)`,
  );
}

// ------------------------------------------- criterion 4(e)'s comparison against a third source

/**
 * **The third source, asked about the artefact that was just built** — ROADMAP exit criterion 4
 * part **e**, revision 22, and A-28 Part 1's generalisable lesson: *"every sweep either of us ran
 * compared the index against itself … a wrong answer of this class is only visible against a third
 * source, and the right one was already in the repository."*
 *
 * Two things happen here, and they are different in kind:
 *
 *  1. **The exact assertion, over the full geometry.** For every ring an emitted forgiveness entry
 *     carries, `overlaps` is re-run against every OTHER ISO code's finest-scale rings. This is arm
 *     2b again — but taken from the *emitted entries* rather than from the pass's own `kept` list,
 *     so a pass that admitted a ring and an entry that ships it have to agree. A hit throws; there
 *     is no artefact to write.
 *  2. **A committed sample the test suite can re-assert without the layer.** The finest layer is
 *     13 MB and nothing in this repository may commit a copy of it (the whole point of a generated
 *     index), and the neighbour rings whose *bounding boxes* meet the forgiveness rings come to
 *     1.2 MB of polygon on their own. So what is recorded is the third source's **answer** at
 *     deterministic probe points inside each ring: for an admitted ring the answer must be that
 *     ring's own code or `null`, and for `MO`'s refused ring it is `CN`, which is Zhuhai. The test
 *     re-checks that each probe really lies inside the ring it is recorded against, so the sample
 *     cannot drift into open water and pass vacuously.
 */
function thirdSourceCheck(entries, forgivenessAt, forgiveness) {
  const finestOrdered = forgiveness.finestOrdered ?? [];
  const finestByCode = forgiveness.finest ?? new Map();
  if (!forgivenessAt.length) return null;
  if (!finestOrdered.length) throw new Error('third source: no finest layer to compare against');

  // 1. the exact assertion, ring by ring, against every other code's finest drawing.
  const prepped = new Map([...finestByCode.entries()].map(([c, e]) => [c, prepSet(e.rings)]));
  let checked = 0;
  for (const i of forgivenessAt) {
    const e = entries[i];
    for (const ring of e.rings) {
      checked++;
      const R = prepRing(ring);
      for (const [c, set] of prepped) {
        if (c === e.code) continue;
        if (overlaps(R, set)) {
          throw new Error(
            `third source: a shipped ${e.code} forgiveness ring claims ground the finest layer ` +
              `calls ${c}. That is QA R23-1 — arm 2b did not do its job (ARCHITECTURE §8.4 A-28).`,
          );
        }
      }
    }
  }

  // 2. the committed sample.
  const answer = (x, y) => pick(finestOrdered, x, y);
  const admitted = [];
  for (const i of forgivenessAt) {
    const e = entries[i];
    e.rings.forEach((ring, r) => {
      admitted.push({ entry: i, ring: r, code: e.code, points: probesInside(ring).map((p) => [...p, answer(p[0], p[1])]) });
    });
  }
  const dropped = forgiveness.drops.map((d, i) => ({
    drop: i,
    code: d.code,
    filter: d.filter,
    against: d.against,
    takenFrom: d.takenFrom,
    points: probesInside(d.ring).map((p) => [...p, answer(p[0], p[1])]),
  }));

  const elsewhere = admitted.filter((a) => a.points.some((p) => p[2] !== null && p[2] !== a.code));
  if (elsewhere.length) {
    throw new Error(`third source: ${elsewhere.length} admitted ring(s) probe to another country`);
  }
  const unprobed = admitted.filter((a) => a.points.length === 0).length;
  console.log(
    `  third source (${FILL}): ${checked} shipped forgiveness rings checked against every other ` +
      `code's finest drawing — 0 claim another country's ground; ${admitted.length} rings sampled ` +
      `at ${admitted.reduce((n, a) => n + a.points.length, 0)} probe points (${unprobed} rings too ` +
      'thin for a probe)',
  );
  return {
    $what:
      "The finest layer's own answer at deterministic points inside each forgiveness ring — the " +
      'ONE comparison in criterion 4(e) that is not the index against itself. An admitted ring may ' +
      "probe to its own code or to null, never to another country's; MO's refused ring probes to " +
      'CN, which is the ~22 km² of Zhuhai that ARCHITECTURE §8.4 A-28 removed.',
    scale: FILL,
    checkedRings: checked,
    unprobedRings: unprobed,
    admitted,
    dropped,
  };
}

/**
 * Deterministic probe points strictly inside a flat ring: the coarsest `k × k` lattice over the
 * ring's bounding box that lands at least one point inside it, thinned evenly to at most `max`.
 * Points are rounded to 6 dp for the fixture and re-tested after rounding, so a recorded point is
 * always genuinely inside the ring it is recorded against. Pure and order-stable.
 */
function probesInside(ring, max = 8) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < ring.length; i += 2) {
    if (ring[i] < x0) x0 = ring[i];
    if (ring[i] > x1) x1 = ring[i];
    if (ring[i + 1] < y0) y0 = ring[i + 1];
    if (ring[i + 1] > y1) y1 = ring[i + 1];
  }
  for (const k of [4, 8, 16, 32, 64, 128, 256]) {
    const found = [];
    for (let i = 1; i < k; i++) {
      for (let j = 1; j < k; j++) {
        const x = Number((x0 + ((x1 - x0) * i) / k).toFixed(6));
        const y = Number((y0 + ((y1 - y0) * j) / k).toFixed(6));
        if (odd(x, y, ring)) found.push([x, y]);
      }
    }
    if (found.length) {
      const step = Math.max(1, Math.floor(found.length / max));
      return found.filter((_, i) => i % step === 0).slice(0, max);
    }
  }
  return [];
}

/** Every ISO alpha-2 code a layer carries, without quantising a single ring. */
function codesOf(geo) {
  const out = new Set();
  for (const f of geo.features) {
    const c = f.properties.ISO_A2_EH;
    if (typeof c === 'string' && /^[A-Z]{2}$/.test(c)) out.add(c);
  }
  return out;
}

/**
 * Spherical polygon area on a unit sphere (Chamberlain & Duquette's line-integral form), absolute.
 * Only the *ordering* it induces is used, so the Earth's radius cancels and is not applied.
 *
 * Absolute, and summed across every ring a country owns — including its hole rings. That is what
 * A-26 Part 4 specifies, and it is the right key: the quantity being ordered is "how much of the
 * map does this entry's geometry cover", which is what decides whether an enclave is reached
 * before its encloser.
 */
function ringArea(ring) {
  const rad = Math.PI / 180;
  const n = ring.length;
  let sum = 0;
  for (let i = 0; i + 1 < n; i += 2) {
    const jx = ring[(i + 2) % n];
    const jy = ring[(i + 3) % n];
    sum += (jx - ring[i]) * rad * (2 + Math.sin(ring[i + 1] * rad) + Math.sin(jy * rad));
  }
  return Math.abs(sum / 2);
}

/**
 * **The emitted order (A-26 Part 4, third key added by A-27 Part 7).** Ascending summed absolute
 * ring area, ties by ISO code ascending, then by scale **coarsest first**. `countryOf` returns the
 * first entry whose rings contain the point, and filling a 1:110m base with 1:10m polygons creates
 * overlaps the source data never had — a Vaduz point is inside both Austria's coarse ring and
 * Liechtenstein's fine one. Ascending area is the non-arbitrary tie-break, because an enclave is
 * always smaller than the thing enclosing it; alphabetical order resolved seven of the eight in
 * favour of the encloser.
 *
 * **Why the third key exists at all.** Before A-27 an ISO code appeared at most once, so
 * `(area, code)` was already a total order and the tie-break by code was never exercised. A filled
 * code now carries a coverage entry and a forgiveness entry, so `(area, code)` alone can tie — and
 * a comparator that returns 0 for two distinct entries hands the outcome to `Array.prototype.sort`
 * implementation detail, which is the one thing the emitted order may not depend on. The key is
 * `FAMILY.indexOf(scale)` ascending; `FAMILY` is coarsest-first, so the coarser entry of a
 * same-code pair sorts first, exactly as A-27 Part 3 states. It cannot change any *answer* — the
 * two entries carry the same ISO code — only which of them `countryOf` returns it from.
 */
function orderEntries(entries) {
  const fam = (e) => {
    const i = FAMILY.indexOf(e.scale);
    return i < 0 ? FAMILY.length : i;
  };
  return entries
    .map((e) => ({ ...e, area: e.rings.reduce((a, r) => a + ringArea(r), 0) }))
    .sort(
      (a, b) =>
        a.area - b.area || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0) || fam(a) - fam(b),
    )
    .map(({ area, ...rest }) => rest);
}

function statsOf(entries) {
  let rings = 0;
  let points = 0;
  for (const e of entries) {
    rings += e.rings.length;
    for (const r of e.rings) points += r.length / 2;
  }
  return { rings, points };
}

/**
 * The unquantised twin of the emitted index: the same entries, in the same order, each carrying
 * the raw rings `build()` recorded beside the quantised ones it kept. Same order matters — the
 * comparison below is between two ray casts whose tie-break is position in the list.
 *
 * **This is a lookup, not a reconstruction, and A-27 is why.** Before the forgiveness pass, the
 * raw twin could be rebuilt by ISO code from the two source layers. It cannot be now: a filled
 * code's coverage rings come from 1:10m and its forgiveness rings from 1:50m, so "the raw rings
 * for `TO`" is not a well-formed question. `build()` carries each ring's raw twin at the same
 * index instead, which also fixes a smaller inaccuracy in the old form — the rebuilt list
 * re-included rings that quantisation had collapsed and `build()` had dropped.
 */
function mixedRaw(entries) {
  return entries.map((e) => ({ code: e.code, rings: e.raw ?? [] }));
}

/**
 * The quantisation guard. Attributes a deterministic global grid twice — once against the raw
 * six-decimal rings, once against the emitted four-decimal ones — and counts the disagreements.
 * A grid point that lands within 11 m of a border would legitimately flip; on a 1.7° lattice
 * none does, and a non-zero count means the rounding is coarse enough to be visible, which is a
 * measurement rather than an assumption.
 */
function verifyQuantisation(rawEntries, entries) {
  let misses = 0;
  for (let lat = -89.3; lat < 90; lat += 1.7) {
    for (let lng = -179.3; lng < 180; lng += 1.7) {
      if (pick(rawEntries, lng, lat) !== pick(entries, lng, lat)) misses++;
    }
  }
  return misses;
}

/** A local copy of the ray cast, deliberately: the generator must not certify its own output
 *  using the very function under test. This is `derive/country.ts`'s algorithm re-stated, and a
 *  divergence between the two would show up as a golden diff. */
function pick(entries, lng, lat) {
  for (const c of entries) {
    let inside = false;
    for (const ring of c.rings) if (odd(lng, lat, ring)) inside = !inside;
    if (inside) return c.code;
  }
  return null;
}

function odd(lng, lat, ring) {
  let inside = false;
  const n = ring.length;
  let jx = ring[n - 2];
  let jy = ring[n - 1];
  for (let i = 0; i + 1 < n; i += 2) {
    const ix = ring[i];
    const iy = ring[i + 1];
    if (iy > lat !== jy > lat) {
      const x = ((jx - ix) * (lat - iy)) / (jy - iy) + ix;
      if (lng < x) inside = !inside;
    }
    jx = ix;
    jy = iy;
  }
  return inside;
}

// ---------------------------------------------------------------- emitting

function emit({ scaleKey, indexScale, source, shas, entries, stats, filled, forgiveness }) {
  const packed = JSON.stringify(entries.map((e) => [e.code, e.rings]));
  if (packed.includes("'") || packed.includes('\\')) {
    throw new Error("the packed payload contains ' or \\ and would need escaping in a TS literal");
  }
  const codes = entries.map((e) => e.code);
  const shaLines = shas.map((s) => ` * sha256 : ${s}`).join('\n');
  const fillLine = filled.length
    ? ` * Fill   : ${filled.length} ISO codes the 1:${scaleKey.replace('m', '')} million layer does not carry, taken from
 *          1:${FILL.replace('m', '')} million — ARCHITECTURE §8.4 A-26 Part 4.
 *          ${wrap(filled.join(' '), 88, ' *          ')}`
    : ' * Fill   : none — this is a single-scale index.';
  const forgiveLine = forgiveness.entries.length
    ? ` * Forgive: ${forgiveness.entries.length} SECOND entries, one per filled code whose coarser polygon survives
 *          A-28 Part 3's three comparisons: it must touch the code's own coverage rings
 *          (filter 1), no other entry of the coverage-only index (arm 2a), and no other
 *          country at the family's FINEST scale (arm 2b). The fine rings track the waterline;
 *          the coarse one forgives a coordinate a few hundred metres offshore. AN ISO CODE
 *          APPEARS TWICE, and its two entries compose as a union: \`countryOf\` returns on the
 *          first ENTRY containing the point.
 *          Forgiven (${forgiveness.codes.length}):
 *          ${wrap(forgiveness.codes.join(' '), 88, ' *          ')}
 *          Refused (${forgiveness.refused.length}) — a coarse ring that would be a neighbour's ground,
 *          would not touch the country at all, or does not exist at any coarser scale:
 *          ${wrap(forgiveness.refused.join(' '), 88, ' *          ')}`
    : ' * Forgive: none — no filled code has a coarser polygon that survives A-28 Part 3.';
  return `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by \`node tools/gen-countries.mjs --scale ${scaleKey}\`. Re-run that to change it; a hand
 * edit here is lost on the next run and untraceable to a source in the meantime.
 *
 * Source : ${source}
 *          (Natural Earth admin-0 countries, public domain — see the generator's header for the
 *          licence citation and why the tag is pinned rather than tracking \`master\`.)
${shaLines}
 * Scale  : base 1:${scaleKey.replace('m', '')} million  ·  ${entries.length} entries · ${new Set(codes).size} distinct ISO codes · ${stats.rings} rings · ${stats.points} points
${fillLine}
${forgiveLine}
 * Order  : ascending summed absolute spherical ring area, ties by ISO code ascending, then by
 *          scale coarsest first. This is the order \`countryOf\` tests entries in, and it is a
 *          property of THIS FILE: \`countryIndex()\` preserves it and does not re-derive it. An
 *          enclave is always smaller than the thing enclosing it, so San Marino is reached
 *          before Italy and Singapore before Malaysia — which ISO-ascending order got wrong for
 *          7 of 8 enclaves. The third key exists only to keep the comparator a total order now
 *          that one ISO code can own two entries; it decides no answer.
 * Coords : ${DECIMALS} decimal places (~11 m); the generator re-attributes a global grid against
 *          the unquantised rings and refuses to write if any answer moves.
 *
 * The polygons live in ONE string literal — one token to Node's type stripping, which is what
 * keeps \`node --test packages/core\` running the .ts files with no build step. The size budget is
 * pinned by \`packages/core/test/0-countryBudget.test.ts\`, which is the first test the suite runs.
 *
 * Codes, smallest first: ${wrap(codes.join(' '), 92, ' *        ')}
 */
import { decodeCountryIndex } from './countryIndex.ts';
import type { CountryIndex } from './countryIndex.ts';

const PACKED =
  '${packed}';

/** The bundled admin-0 index. Injected into \`countryOf(at, index)\`; never read by it directly. */
export const COUNTRY_INDEX: CountryIndex = decodeCountryIndex(
  { scale: 'ne_${indexScale}', source: '${source}' },
  PACKED,
);
`;
}

function wrap(text, width, indent) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line.length + w.length + 1 > width) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return lines.join(`\n${indent}`);
}

/**
 * Round-trip: the one string literal the module carries must re-parse to exactly the rings that
 * went into it. Deliberately done with `JSON.parse` here rather than by calling core's
 * `decodeCountryIndex` — §2.10 ceiling (1) says nothing under `tools/` reaches past
 * `packages/core/src/index.ts`, and a decoder is not on §2.10's surface. What the decoder does
 * with these bytes is `packages/core/test/country.test.ts`'s job, not this file's.
 */
function roundTrip(text, entries) {
  const m = /const PACKED =\n\s*'([\s\S]*?)';/.exec(text);
  if (!m) throw new Error('round-trip: could not find PACKED in the emitted text');
  const back = JSON.parse(m[1]);
  const want = entries.map((e) => [e.code, e.rings]);
  if (JSON.stringify(back) !== JSON.stringify(want)) {
    throw new Error('round-trip: the emitted literal does not re-parse to the rings that produced it');
  }
}

/**
 * A `CountryIndex` built in memory, matching `countryIndex()`'s contract: **the order it is given
 * is preserved** (A-26 Part 4 — the emitted order is the artefact), each entry carrying its
 * derived box. Used so a `--dry-run` at another scale can be audited and cross-checked without
 * writing anything.
 */
function toIndex(entries, scaleKey2, source) {
  const countries = entries
    .map(({ code, rings }) => {
      let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
      for (const r of rings) {
        for (let i = 0; i + 1 < r.length; i += 2) {
          if (r[i] < a) a = r[i];
          if (r[i] > c) c = r[i];
          if (r[i + 1] < b) b = r[i + 1];
          if (r[i + 1] > d) d = r[i + 1];
        }
      }
      return { code, rings, box: [a, b, c, d] };
    });
  return { scale: `ne_${scaleKey2}`, source, countries };
}

/**
 * The two implementations, made to agree on a grid. `pick()` above is this file's own ray cast
 * (written so the generator does not certify its output with the very function under test);
 * `countryOf` is core's. A divergence means one of them is wrong and the golden would inherit it.
 */
async function crossCheck(entries, index) {
  const { countryOf } = await import('../packages/core/src/index.ts');
  let bad = 0;
  for (let lat = -89.3; lat < 90; lat += 1.7) {
    for (let lng = -179.3; lng < 180; lng += 1.7) {
      if (pick(entries, lng, lat) !== countryOf({ lat, lng }, index)) bad++;
    }
  }
  return bad;
}

// ---------------------------------------------------------------- the holes golden

/**
 * `--holes` — writes `fixtures/golden/country-holes.json` (ROADMAP exit criterion 4 part **b**,
 * ARCHITECTURE §8.4 A-26 Part 4 item 4).
 *
 * One row per coordinate-bearing record of the reference trip that the **committed** index leaves
 * `null`, carrying `resolvesAt`: the COARSEST scale in the pinned family that does attribute it,
 * or `null` if none does. That single field is what makes KD-51's question un-askable again:
 *
 *   - `resolvesAt: null`  — the dataset has no polygon for that landform at ANY scale. `null` is
 *     the correct answer, not a defect and not a `TODO`, and no tolerance may close it.
 *   - `resolvesAt: "10m"` — a scale question, and the mixed index's coverage decision is what
 *     decides whether it is worth paying for. This is the count that may not grow.
 *
 * This mode fetches all three scales. That is a human's generation-time cost, once; nothing in the
 * product fetches anything, ever (§6.1).
 *
 * **No coordinate is written.** Same rule as `countries.json`: ids and names only, because a list
 * of latitudes is a copy of the half of the live planner's `DAYS` that matters most.
 */
async function writeHoles() {
  const { COUNTRY_INDEX, countryOf } = await import('../packages/core/src/index.ts');
  const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
  const { trip, sha256 } = loadEurope2026();

  console.log(`the committed index: ${COUNTRY_INDEX.scale} (${COUNTRY_INDEX.countries.length} codes)`);

  // Every scale in the family, quantised exactly as the shipped module is, so `resolvesAt` says
  // what a regeneration at that scale would ACTUALLY produce rather than what its raw data holds.
  const byScale = new Map();
  for (const key of FAMILY) {
    const dl = await download(key);
    byScale.set(key, orderEntries(build(JSON.parse(dl.buf.toString('utf8')), null, key).entries));
  }

  const resolvesAt = (at) => {
    for (const key of FAMILY) if (pick(byScale.get(key), at.lng, at.lat) !== null) return key;
    return null;
  };

  const rows = [];
  const record = (kind, id, name, at) => {
    if (!at) return;
    if (countryOf(at, COUNTRY_INDEX) !== null) return;
    rows.push({ kind, id, name, resolvesAt: resolvesAt(at) });
  };
  const coordOf = (stop) => {
    const link = stop.place;
    if (link.kind === 'inline') return link.at;
    if (link.kind === 'place') return trip.places.find((p) => p.id === link.placeId)?.at ?? null;
    return null;
  };
  for (const day of trip.days) for (const s of day.stops) record('stop', s.id, s.name, coordOf(s));
  for (const s of trip.pool) record('stop', s.id, s.name, coordOf(s));
  for (const p of trip.places) record('place', p.id, p.name, p.at);

  const out = {
    $generatedBy: 'cairn/tools/gen-countries.mjs --holes',
    $source: 'europe-2026-itinerary.html (read-only)',
    $sourceSha256: sha256,
    $what:
      'Every coordinate-bearing record of the reference trip that the committed COUNTRY_INDEX ' +
      'leaves unattributed, with the coarsest scale in the pinned Natural Earth family that does ' +
      'attribute it — or null, which means the dataset carries no polygon for that landform at ' +
      'any scale and null is the CORRECT answer. NO COORDINATES: ids and names only.',
    index: { scale: COUNTRY_INDEX.scale, source: COUNTRY_INDEX.source },
    scales: FAMILY,
    total: rows.length,
    resolvable: rows.filter((r) => r.resolvesAt !== null).length,
    holes: rows,
  };
  const path = resolve(CAIRN, 'fixtures', 'golden', 'country-holes.json');
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`\nwrote fixtures/golden/country-holes.json`);
  console.log(`  ${rows.length} holes, ${out.resolvable} of them a scale would fix:`);
  for (const r of rows) console.log(`    ${r.kind.padEnd(5)} ${r.id.padEnd(9)} ${String(r.resolvesAt).padEnd(5)} ${r.name}`);
}

// ---------------------------------------------------------------- the audit

/**
 * §8.4's correctness floor, run rather than asserted: *"The generator is validated against every
 * coordinate-bearing record in the reference trip — 112 stops and 94 places, including the
 * Dalmatian islands (Blue Cave, Biševo; Stiniva Cove, Vis) and Lokrum."*
 *
 * This prints the attribution of every one of them. It does not decide anything by itself — the
 * decision it feeds is the scale, and BUILD-NOTES **KD-51** records the measurement that produced
 * it, including why the escalation §8.4 prescribes makes every number here worse.
 */
async function audit(index) {
  const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
  const { countryOf } = await import('../packages/core/src/index.ts');
  const { trip } = loadEurope2026();

  const places = trip.places.filter((p) => p.at);
  const stops = [];
  for (const day of trip.days) for (const s of day.stops) stops.push(s);
  for (const s of trip.pool) stops.push(s);

  const coordOf = (stop) => {
    const link = stop.place;
    if (link.kind === 'inline') return link.at;
    if (link.kind === 'place') return trip.places.find((p) => p.id === link.placeId)?.at ?? null;
    return null;
  };

  const tally = (rows) => {
    const counts = new Map();
    const nulls = [];
    for (const [name, at] of rows) {
      const c = at ? countryOf(at, index) : null;
      if (c === null) nulls.push(name);
      else counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return { counts, nulls, total: rows.length };
  };

  const placeRows = places.map((p) => [p.name, p.at]);
  const stopRows = stops.map((s) => [s.name, coordOf(s)]).filter(([, at]) => at);

  console.log(`\n§8.4 correctness floor — the reference trip, at ${index.scale}:`);
  for (const [label, r] of [['places', tally(placeRows)], ['stops', tally(stopRows)]]) {
    const codes = [...r.counts.entries()].sort().map(([c, n]) => `${c}:${n}`).join(' ');
    console.log(`  ${label.padEnd(7)} ${r.total} with coordinates -> ${codes}  unattributed:${r.nulls.length}`);
    for (const n of r.nulls) console.log(`      null  ${n}`);
  }

  console.log('  the three §8.4 names by hand:');
  for (const name of ['Blue Cave, Biševo', 'Stiniva Cove, Vis', 'Lokrum Island']) {
    const p = places.find((x) => x.name === name);
    console.log(`    ${name.padEnd(20)} -> ${p ? countryOf(p.at, index) : 'NOT IN FIXTURE'}`);
  }
}
