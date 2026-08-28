/**
 * gen-countries.mjs — builds `packages/core/src/geo/countries.gen.ts` from Natural Earth's
 * admin-0 country boundaries (ARCHITECTURE §8.4 clause 1, ROADMAP Phase 2 I-5).
 *
 * Run:
 *   node tools/gen-countries.mjs                 # 1:110m (the shipped scale), writes + audits
 *   node tools/gen-countries.mjs --scale 50m     # a scale escalation; the budget moves with it
 *   node tools/gen-countries.mjs --dry-run       # measure and audit, write nothing
 *   node tools/gen-countries.mjs --audit-only    # audit the COMMITTED module, fetch nothing
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
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const OUT = resolve(CAIRN, 'packages/core/src/geo/countries.gen.ts');

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

  const url = base(scale.file);
  console.log(`fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sha = createHash('sha256').update(buf).digest('hex');
  console.log(`  ${buf.length} bytes, sha256 ${sha}`);
  console.log(`  pinned : ${scale.bytes} bytes, sha256 ${scale.sha256}  (${scale.pinnedBy})`);
  if (sha !== scale.sha256 || buf.length !== scale.bytes) {
    // Reported, not absorbed. A tag that moved is a fact about the world, and the right response
    // is a ruling on which bytes are canonical, not a quietly different committed module.
    console.error(
      'gen-countries: DOWNLOAD DOES NOT MATCH THE PIN. Not writing. The tag is supposed to be\n' +
        'immutable; if it genuinely moved, that is an architect decision, not a regeneration.',
    );
    process.exit(3);
  }

  const geo = JSON.parse(buf.toString('utf8'));
  const { entries, skipped, stats } = build(geo);
  console.log(
    `  ${geo.features.length} features -> ${entries.length} ISO-coded countries, ` +
      `${stats.rings} rings, ${stats.points} points (${stats.dropped} rings dropped as degenerate)`,
  );
  if (skipped.length) {
    console.log(`  skipped (no ISO 3166-1 alpha-2 code, left unattributed by design — §8.4):`);
    for (const s of skipped) console.log(`    ${s}`);
  }

  const quantMisses = verifyQuantisation(geo, entries);
  console.log(`  quantisation check: ${quantMisses} grid points changed answer at ${DECIMALS} dp`);
  if (quantMisses > 0) throw new Error(`quantisation to ${DECIMALS} dp moved ${quantMisses} attributions`);

  const source = `${REPO}@${TAG}/geojson/${scale.file}`;
  const text = emit({ scaleKey, source, sha, entries, stats });

  roundTrip(text, entries);
  console.log(`  round-trip: the emitted literal re-parses to the same ${entries.length} countries`);

  const local = toIndex(entries, scaleKey, source);
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
  // Audit the module that was actually written, decoded the way the product decodes it — not the
  // in-memory build. A generator that audits its own intermediate value cannot see an emit bug.
  const { COUNTRY_INDEX } = await import(`../packages/core/src/index.ts?written=${Date.now()}`);
  await audit(COUNTRY_INDEX);
}

// ---------------------------------------------------------------- building

/**
 * GeoJSON features -> `[{code, rings}]`. `ISO_A2_EH` is the code column: it is the one Natural
 * Earth fills in for the de-facto entities that `ISO_A2` leaves as `-99`. Features that still
 * have no alpha-2 code (N. Cyprus, Somaliland at 110m) are DROPPED, not invented: §8.4 says a
 * disputed area is reported as unattributed, and minting a code for one here would be exactly the
 * guess `null` exists to refuse.
 */
function build(geo) {
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
      skipped.push(`${p.NAME} (SOVEREIGNT=${p.SOVEREIGNT}, ISO_A2_EH=${p.ISO_A2_EH})`);
      continue;
    }
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const out = byCode.get(code) ?? [];
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
        out.push(flat);
        rings++;
        points += flat.length / 2;
      }
    }
    byCode.set(code, out);
  }

  const entries = [...byCode.entries()]
    .map(([code, rings2]) => ({ code, rings: rings2 }))
    .sort((a, b) => (a.code < b.code ? -1 : 1));
  return { entries, skipped, stats: { rings, points, dropped } };
}

/**
 * The quantisation guard. Attributes a deterministic global grid twice — once against the raw
 * six-decimal rings, once against the emitted four-decimal ones — and counts the disagreements.
 * A grid point that lands within 11 m of a border would legitimately flip; on a 1.7° lattice
 * none does, and a non-zero count means the rounding is coarse enough to be visible, which is a
 * measurement rather than an assumption.
 */
function verifyQuantisation(geo, entries) {
  const raw = [];
  for (const f of geo.features) {
    const p = f.properties;
    if (!(typeof p.ISO_A2_EH === 'string' && /^[A-Z]{2}$/.test(p.ISO_A2_EH))) continue;
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const rings = [];
    for (const poly of polys) for (const r of poly) rings.push(r.flat());
    raw.push({ code: p.ISO_A2_EH, rings });
  }
  const merged = new Map();
  for (const r of raw) merged.set(r.code, (merged.get(r.code) ?? []).concat(r.rings));
  const rawEntries = [...merged.entries()].map(([code, rings]) => ({ code, rings })).sort((a, b) => (a.code < b.code ? -1 : 1));

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

function emit({ scaleKey, source, sha, entries, stats }) {
  const packed = JSON.stringify(entries.map((e) => [e.code, e.rings]));
  if (packed.includes("'") || packed.includes('\\')) {
    throw new Error("the packed payload contains ' or \\ and would need escaping in a TS literal");
  }
  const codes = entries.map((e) => e.code);
  return `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by \`node tools/gen-countries.mjs --scale ${scaleKey}\`. Re-run that to change it; a hand
 * edit here is lost on the next run and untraceable to a source in the meantime.
 *
 * Source : ${source}
 *          (Natural Earth admin-0 countries, public domain — see the generator's header for the
 *          licence citation and why the tag is pinned rather than tracking \`master\`.)
 * sha256 : ${sha}
 * Scale  : 1:${scaleKey.replace('m', '')} million  ·  ${entries.length} ISO-coded countries · ${stats.rings} rings · ${stats.points} points
 * Coords : ${DECIMALS} decimal places (~11 m); the generator re-attributes a global grid against
 *          the unquantised rings and refuses to write if any answer moves.
 *
 * The polygons live in ONE string literal — one token to Node's type stripping, which is what
 * keeps \`node --test packages/core\` running the .ts files with no build step. The size budget is
 * pinned by \`packages/core/test/0-countryBudget.test.ts\`, which is the first test the suite runs.
 *
 * Codes: ${wrap(codes.join(' '), 92, ' *        ')}
 */
import { decodeCountryIndex } from './countryIndex.ts';
import type { CountryIndex } from './countryIndex.ts';

const PACKED =
  '${packed}';

/** The bundled admin-0 index. Injected into \`countryOf(at, index)\`; never read by it directly. */
export const COUNTRY_INDEX: CountryIndex = decodeCountryIndex(
  { scale: 'ne_${scaleKey}', source: '${source}' },
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
 * A `CountryIndex` built in memory, matching `countryIndex()`'s contract: sorted by code
 * ascending, each entry carrying its derived box. Used so a `--dry-run` at another scale can be
 * audited and cross-checked without writing anything.
 */
function toIndex(entries, scaleKey2, source) {
  const countries = [...entries]
    .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0))
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
