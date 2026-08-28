/**
 * QA round 22 — I-5 / I-5a: the mixed-resolution country index, network half.
 *
 *   cd cairn && node --experimental-strip-types qa/i5-fillscale.mjs
 *
 * Fetches the three pinned Natural Earth admin-0 layers (`nvkelso/natural-earth-vector@v5.1.2`,
 * the same three `tools/gen-countries.mjs` uses) into `$TMPDIR/cairn-ne-v5.1.2/` and caches them
 * there. Nothing under `cairn/` is written. If the proxy blocks the fetch every section prints
 * SKIP rather than a false pass.
 *
 * A "FAIL" line means the probe found what it was looking for. Read the finding in
 * `../docs/QA-FINDINGS.md` before assuming the script is broken.
 *
 * Sections:
 *   §1  R22-1 — the fill scale is fixed by fiat at the family's FINEST layer (A-26 Part 4), which
 *       is the layer A-26 Part 2 measured and rejected for the base. Measured cost.
 *   §2  R22-2 — `fixtures/golden/country-holes.json`'s seven `resolvesAt` values, re-derived from
 *       the raw layers rather than trusted.
 *   §3  R22-3 — where the shipped index's nine self-intersecting rings come from, and what the
 *       generator's quantisation guard can and cannot see.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const CACHE = resolve(tmpdir(), 'cairn-ne-v5.1.2');

const { COUNTRY_INDEX: IX, countryOf } = await import(resolve(CAIRN, 'packages/core/src/index.ts'));

let fails = 0;
const ok = (cond, label, detail = '') => {
  if (!cond) fails++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};
const note = (label, detail = '') => console.log(`  ---- ${label}${detail ? ` — ${detail}` : ''}`);
const h = (s) => console.log(`\n== ${s} ==`);

// ---------------------------------------------------------------- the three pinned layers

const SCALES = {
  '110m': { file: 'ne_110m_admin_0_countries.geojson', sha256: '6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f' },
  '50m': { file: 'ne_50m_admin_0_countries.geojson', sha256: '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb' },
  '10m': { file: 'ne_10m_admin_0_countries.geojson', sha256: '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255' },
};
const FAMILY = ['110m', '50m', '10m'];

async function layer(key) {
  mkdirSync(CACHE, { recursive: true });
  const path = resolve(CACHE, SCALES[key].file);
  if (!existsSync(path)) {
    const url = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/${SCALES[key].file}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  const buf = readFileSync(path);
  const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== SCALES[key].sha256) throw new Error(`${key} checksum ${sha} != pinned ${SCALES[key].sha256}`);
  return JSON.parse(buf.toString('utf8'));
}

let GEO = null;
try {
  GEO = {};
  for (const k of FAMILY) GEO[k] = await layer(k);
  console.log(`three pinned layers verified against the generator's own checksums, cached in ${CACHE}`);
} catch (err) {
  GEO = null;
  console.log(`SKIP: could not fetch/verify the pinned Natural Earth layers — ${err.message}`);
}

// ---------------------------------------------------------------- quantise exactly as the generator does

const D = 4;
const q = (n) => Math.round(n * 10 ** D) / 10 ** D;
function build(geo) {
  const m = new Map();
  for (const f of geo.features) {
    const c = f.properties.ISO_A2_EH;
    if (!(typeof c === 'string' && /^[A-Z]{2}$/.test(c))) continue;
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const out = m.get(c) ?? [];
    for (const poly of polys)
      for (const ring of poly) {
        const flat = [];
        let px = null;
        let py = null;
        for (const p of ring) {
          const x = q(p[0]);
          const y = q(p[1]);
          if (x === px && y === py) continue;
          flat.push(x, y);
          px = x;
          py = y;
        }
        if (flat.length < 6) continue;
        out.push(flat);
      }
    m.set(c, out);
  }
  return m;
}
function rawByCode(geo) {
  const m = new Map();
  for (const f of geo.features) {
    const c = f.properties.ISO_A2_EH;
    if (!(typeof c === 'string' && /^[A-Z]{2}$/.test(c))) continue;
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const out = m.get(c) ?? [];
    for (const poly of polys) for (const r of poly) out.push(r.flat());
    m.set(c, out);
  }
  return m;
}
function oddRing(lng, lat, r) {
  let inside = false;
  const n = r.length;
  let jx = r[n - 2];
  let jy = r[n - 1];
  for (let i = 0; i + 1 < n; i += 2) {
    const ix = r[i];
    const iy = r[i + 1];
    if (iy > lat !== jy > lat) {
      const x = ((jx - ix) * (lat - iy)) / (jy - iy) + ix;
      if (lng < x) inside = !inside;
    }
    jx = ix;
    jy = iy;
  }
  return inside;
}
const inRings = (rings, lng, lat) => {
  let inside = false;
  for (const r of rings) if (oddRing(lng, lat, r)) inside = !inside;
  return inside;
};
const anyCode = (byCode, lng, lat) => {
  for (const [c, rings] of byCode) if (inRings(rings, lng, lat)) return c;
  return null;
};

// ---------------------------------------------------------------- §1 R22-1: the fill scale

h('§1 R22-1 — the fill is taken from the family\'s FINEST layer by fiat, and that costs five countries their capital');

/**
 * A-26 Part 2 derives the BASE scale by measurement and its finding is that the coarse layer is
 * the forgiving one for travel coordinates: *"a coarse ring bulges over the sea and swallows
 * shoreline points; a fine one tracks the water and drops anything a few hundred metres
 * seaward."* A-26 Part 4 then fixes the FILL at 1:10m — the layer that finding rejects — with no
 * measurement behind it, because the reference corpus (one Adriatic trip) contains none of the 64
 * filled countries. This section supplies the measurement that was never taken.
 *
 * Coordinates below are capital cities / principal settlements, from general knowledge and NOT
 * verified against a cited source — the finding does not rest on any single one of them. What it
 * rests on is the shape: 10 of 64 miss, every miss is a WATERSIDE settlement within 0.3–3.7 km of
 * its own ring, and five of them are inside the SAME country's 1:50m polygon.
 */
const CAPITALS = [
  ['AD', 42.5063, 1.5218, 'Andorra la Vella'], ['AG', 17.1274, -61.8468, "St John's"],
  ['AI', 18.217, -63.0578, 'The Valley'], ['AS', -14.2756, -170.702, 'Pago Pago'],
  ['AW', 12.5092, -70.0086, 'Oranjestad'], ['AX', 60.0971, 19.9348, 'Mariehamn'],
  ['BB', 13.1059, -59.6132, 'Bridgetown'], ['BH', 26.2285, 50.586, 'Manama'],
  ['BL', 17.8962, -62.8498, 'Gustavia'], ['BM', 32.2949, -64.781, 'Hamilton'],
  ['CK', -21.2075, -159.775, 'Avarua'], ['CV', 14.933, -23.5133, 'Praia'],
  ['CW', 12.1084, -68.9335, 'Willemstad'], ['DM', 15.3092, -61.3794, 'Roseau'],
  ['FM', 6.9248, 158.1611, 'Palikir'], ['FO', 62.0079, -6.79, 'Tórshavn'],
  ['GD', 12.0561, -61.7488, "St George's"], ['GG', 49.4555, -2.5368, 'St Peter Port'],
  ['GI', 36.1408, -5.3536, 'Gibraltar'], ['GS', -54.2833, -36.5, 'Grytviken'],
  ['GU', 13.4745, 144.7504, 'Hagåtña'], ['HK', 22.3193, 114.1694, 'Hong Kong'],
  ['HM', -53.1, 73.5167, 'Heard Island'], ['IM', 54.1509, -4.4814, 'Douglas'],
  ['IO', -7.3133, 72.4111, 'Diego Garcia'], ['JE', 49.1866, -2.1064, 'St Helier'],
  ['KI', 1.3278, 172.9797, 'Tarawa'], ['KM', -11.7172, 43.2473, 'Moroni'],
  ['KN', 17.2955, -62.725, 'Basseterre'], ['KY', 19.2866, -81.3744, 'George Town'],
  ['LC', 14.0101, -60.9875, 'Castries'], ['LI', 47.141, 9.5209, 'Vaduz'],
  ['MC', 43.7333, 7.4167, 'Monaco'], ['MF', 18.0708, -63.0501, 'Marigot'],
  ['MH', 7.0897, 171.3803, 'Majuro'], ['MO', 22.1987, 113.5439, 'Macao'],
  ['MP', 15.2137, 145.7546, 'Saipan'], ['MS', 16.7062, -62.2136, 'Plymouth'],
  ['MT', 35.8997, 14.5147, 'Valletta'], ['MU', -20.1609, 57.5012, 'Port Louis'],
  ['MV', 4.1755, 73.5093, 'Malé'], ['NF', -29.0568, 167.9617, 'Kingston'],
  ['NR', -0.5477, 166.9209, 'Yaren'], ['NU', -19.0554, -169.9187, 'Alofi'],
  ['PF', -17.5352, -149.5695, 'Papeete'], ['PM', 46.7783, -56.1774, 'Saint-Pierre'],
  ['PN', -25.0667, -130.1, 'Adamstown'], ['PW', 7.5, 134.6242, 'Ngerulmud'],
  ['SC', -4.6191, 55.4513, 'Victoria'], ['SG', 1.3521, 103.8198, 'Singapore'],
  ['SH', -15.9387, -5.7168, 'Jamestown'], ['SM', 43.9424, 12.4578, 'San Marino'],
  ['ST', 0.3365, 6.7273, 'São Tomé'], ['SX', 18.0255, -63.045, 'Philipsburg'],
  ['TC', 21.4664, -71.136, 'Cockburn Town'], ['TO', -21.1393, -175.2049, "Nuku'alofa"],
  ['TV', -8.5211, 179.1962, 'Funafuti'], ['UM', 19.2833, 166.65, 'Wake Island'],
  ['VA', 41.9022, 12.4539, "St Peter's Basilica"], ['VC', 13.16, -61.2248, 'Kingstown'],
  ['VG', 18.4207, -64.64, 'Road Town'], ['VI', 18.3419, -64.9307, 'Charlotte Amalie'],
  ['WF', -13.2825, -176.1745, 'Mata-Utu'], ['WS', -13.8333, -171.7667, 'Apia'],
];

const nearestKm = (code, lat, lng) => {
  const c = IX.countries.find((x) => x.code === code);
  let best = Infinity;
  for (const r of c.rings)
    for (let i = 0; i + 1 < r.length; i += 2) {
      const dx = (r[i] - lng) * Math.cos((lat * Math.PI) / 180) * 111.32;
      const dy = (r[i + 1] - lat) * 110.57;
      const d = Math.hypot(dx, dy);
      if (d < best) best = d;
    }
  return best;
};

const missed = CAPITALS.filter(([code, lat, lng]) => countryOf({ lat, lng }, IX) !== code);
note('filled codes probed', `${CAPITALS.length} (all 64)`);
note('the shipped index answers the country at its capital for', `${CAPITALS.length - missed.length} of ${CAPITALS.length}`);
for (const [code, lat, lng, name] of missed)
  note(`  MISS ${code} ${name}`, `-> ${countryOf({ lat, lng }, IX)}, ${nearestKm(code, lat, lng).toFixed(2)} km from the country's own 1:10m ring`);

if (!GEO) {
  console.log('  SKIP: the per-scale comparison needs the pinned layers');
} else {
  const B = {};
  for (const k of FAMILY) B[k] = build(GEO[k]);
  const base = new Set(B['110m'].keys());
  const fillCodes = [...B['10m'].keys()].filter((c) => !base.has(c)).sort();
  ok(fillCodes.length === 64, 'the fill set re-derives to 64 codes', String(fillCodes.length));
  note('of those 64, the 1:50m layer also carries', `${fillCodes.filter((c) => B['50m'].has(c)).length} (only ${fillCodes.filter((c) => !B['50m'].has(c)).join(' ')} are 10m-only)`);

  const rescued = [];
  const nowhere = [];
  for (const [code, lat, lng, name] of missed) {
    const in50 = B['50m'].has(code) && inRings(B['50m'].get(code), lng, lat);
    const in110 = B['110m'].has(code) && inRings(B['110m'].get(code), lng, lat);
    if (in50 || in110) rescued.push(`${code} ${name} (${in110 ? '110m' : '50m'})`);
    else nowhere.push(`${code} ${name}`);
  }
  ok(
    rescued.length === 0,
    'R22-1: no filled country loses its capital to the choice of 1:10m as the fill layer',
    `${rescued.length} do — ${JSON.stringify(rescued)}; these attribute correctly at a COARSER layer of the same pinned family and return null in the shipped index`,
  );
  note('and these miss at every scale — a genuine dataset gap, null is correct', JSON.stringify(nowhere));

  // the objective half: how much ground each fill loses by being 1:10m rather than 1:50m
  const bbox = (rings) => {
    let a = Infinity;
    let b = Infinity;
    let c = -Infinity;
    let d = -Infinity;
    for (const r of rings)
      for (let i = 0; i + 1 < r.length; i += 2) {
        if (r[i] < a) a = r[i];
        if (r[i] > c) c = r[i];
        if (r[i + 1] < b) b = r[i + 1];
        if (r[i + 1] > d) d = r[i + 1];
      }
    return [a, b, c, d];
  };
  const shrunk = [];
  for (const code of fillCodes) {
    if (!B['50m'].has(code)) continue;
    const r50 = B['50m'].get(code);
    const r10 = B['10m'].get(code);
    const bb = bbox([...r50, ...r10]);
    const step = Math.max(0.002, Math.max(bb[2] - bb[0], bb[3] - bb[1]) / 400);
    let n50 = 0;
    let n10 = 0;
    for (let lat = bb[1]; lat <= bb[3]; lat += step)
      for (let lng = bb[0]; lng <= bb[2]; lng += step) {
        if (inRings(r50, lng, lat)) n50++;
        if (inRings(r10, lng, lat)) n10++;
      }
    if (n50 > 0 && n10 < n50) shrunk.push(`${code}:${(n10 / n50).toFixed(2)}`);
  }
  note(
    'filled codes whose 1:50m polygon covers MORE ground than the 1:10m one the fill used',
    `${shrunk.length} of 62 — ${shrunk.join(' ')} (ratio 1:10m / 1:50m)`,
  );
  note(
    'and the counter-evidence, stated so the finding is not overclaimed',
    'for the other 53 the 1:10m polygon is the larger one, so a blanket switch to 1:50m would be worse. The rule that is missing is per-code and measured — exactly what `resolvesAt` already computes for the holes golden.',
  );
  note(
    'the one code where 1:50m is bigger AND worse',
    'VA: the 1:50m Vatican polygon spans 12.4275–12.4392 E, ~1 km WEST of the real state, so it would claim ~1 km² of Rome and still miss St Peter\'s. A-26 Part 5 residue 1 survives this attack.',
  );
}

// ---------------------------------------------------------------- §2 R22-2: the holes golden

h('§2 country-holes.json — every `resolvesAt` re-derived from the raw layers, not trusted');

const holes = JSON.parse(readFileSync(resolve(CAIRN, 'fixtures/golden/country-holes.json'), 'utf8'));
const { loadEurope2026 } = await import(resolve(CAIRN, 'fixtures/loadEurope2026.mjs'));
const { trip, sha256 } = loadEurope2026();
const coordOf = (s) => {
  const l = s.place;
  if (l.kind === 'inline') return l.at;
  if (l.kind === 'place') return trip.places.find((p) => p.id === l.placeId)?.at ?? null;
  return null;
};
const records = [];
for (const d of trip.days) for (const s of d.stops) records.push(['stop', s.id, s.name, coordOf(s)]);
for (const s of trip.pool) records.push(['stop', s.id, s.name, coordOf(s)]);
for (const p of trip.places) records.push(['place', p.id, p.name, p.at]);
const withCoords = records.filter((r) => r[3]);
note('coordinate-bearing records in the reference trip', `${withCoords.length} (${withCoords.filter((r) => r[0] === 'stop').length} stops + ${withCoords.filter((r) => r[0] === 'place').length} places)`);
ok(sha256 === holes.$sourceSha256, 'the holes golden names the live planner sha it was generated from', sha256.slice(0, 12));

const unattributed = withCoords.filter((r) => countryOf(r[3], IX) === null).map((r) => r[1]);
ok(
  JSON.stringify(unattributed.sort()) === JSON.stringify(holes.holes.map((x) => x.id).sort()),
  'the golden names exactly the records the committed index leaves null',
  JSON.stringify(unattributed),
);
ok(holes.total === holes.holes.length && holes.resolvable === holes.holes.filter((x) => x.resolvesAt !== null).length, 'its own `total`/`resolvable` counters agree with its rows');

if (!GEO) {
  console.log('  SKIP: re-deriving `resolvesAt` needs the pinned layers');
} else {
  const Bq = {};
  const Br = {};
  for (const k of FAMILY) {
    Bq[k] = build(GEO[k]);
    Br[k] = rawByCode(GEO[k]);
  }
  for (const row of holes.holes) {
    const rec = records.find((r) => r[1] === row.id);
    const { lat, lng } = rec[3];
    const firstQ = FAMILY.find((k) => anyCode(Bq[k], lng, lat) !== null) ?? null;
    const firstR = FAMILY.find((k) => anyCode(Br[k], lng, lat) !== null) ?? null;
    ok(firstQ === row.resolvesAt, `${row.id} ${row.name}: resolvesAt=${JSON.stringify(row.resolvesAt)} re-derived from the quantised layers`, String(firstQ));
    ok(firstR === row.resolvesAt, `  …and from the RAW, unquantised layers, so quantisation is not what decides it`, String(firstR));
  }
}

// ---------------------------------------------------------------- §3 R22-3: quantisation

h('§3 R22-3 — the nine self-intersecting rings, and what the quantisation guard can see');

if (!GEO) {
  console.log('  SKIP: needs the pinned layers');
} else {
  function properCross(p1, p2, p3, p4) {
    const d = (p4[1] - p3[1]) * (p2[0] - p1[0]) - (p4[0] - p3[0]) * (p2[1] - p1[1]);
    if (d === 0) return false;
    const ua = ((p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0])) / d;
    const ub = ((p2[0] - p1[0]) * (p1[1] - p3[1]) - (p2[1] - p1[1]) * (p1[0] - p3[0])) / d;
    return ua > 0 && ua < 1 && ub > 0 && ub < 1;
  }
  const selfInt = (pts) => {
    const n = pts.length;
    for (let i = 0; i + 1 < n; i++)
      for (let j = i + 2; j + 1 < n; j++) {
        if (i === 0 && j === n - 2) continue;
        if (properCross(pts[i], pts[i + 1], pts[j], pts[j + 1])) return true;
      }
    return false;
  };
  const close = (pts) => (pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1] ? pts : [...pts, pts[0]]);
  for (const [scale, code] of [['110m', 'SD'], ['10m', 'MV']]) {
    const rings = [];
    for (const f of GEO[scale].features) {
      if (f.properties.ISO_A2_EH !== code) continue;
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      for (const p of polys) for (const r of p) rings.push(r);
    }
    let rawBad = 0;
    let qBad = 0;
    let lostM2 = 0;
    let gainM2 = 0;
    let landM2 = 0;
    for (const ring of rings) {
      const raw = ring.map((c) => [c[0], c[1]]);
      if (selfInt(close(raw))) rawBad++;
      const flat = [];
      let px = null;
      let py = null;
      for (const c of ring) {
        const x = q(c[0]);
        const y = q(c[1]);
        if (x === px && y === py) continue;
        flat.push([x, y]);
        px = x;
        py = y;
      }
      if (flat.length < 3) continue;
      const bad = selfInt(close(flat));
      if (bad) qBad++;
      if (!bad || raw.length > 200) continue;
      const xs = [...raw.map((p) => p[0]), ...flat.map((p) => p[0])];
      const ys = [...raw.map((p) => p[1]), ...flat.map((p) => p[1])];
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const step = Math.max((x1 - x0) / 300, (y1 - y0) / 300, 1e-6);
      const cell = 110574 * step * 111320 * Math.cos(((y0 + y1) / 2 / 180) * Math.PI) * step;
      const pip = (pts, lng, lat) => {
        let ins = false;
        const n = pts.length;
        let j = n - 1;
        for (let i = 0; i < n; i++) {
          const [ix, iy] = pts[i];
          const [jx, jy] = pts[j];
          if (iy > lat !== jy > lat) {
            const x = ((jx - ix) * (lat - iy)) / (jy - iy) + ix;
            if (lng < x) ins = !ins;
          }
          j = i;
        }
        return ins;
      };
      for (let lat = y0; lat <= y1; lat += step)
        for (let lng = x0; lng <= x1; lng += step) {
          const a = pip(raw, lng, lat);
          const b = pip(flat, lng, lat);
          if (a) landM2 += cell;
          if (a && !b) lostM2 += cell;
          if (b && !a) gainM2 += cell;
        }
    }
    note(`${code} at 1:${scale}`, `${rings.length} rings · self-intersecting RAW ${rawBad} · after 4-dp quantisation ${qBad}`);
    if (code === 'MV') {
      ok(
        rawBad > 0 || qBad === 0,
        'R22-3: the generator\'s 4-dp quantisation does not turn a simple Natural Earth ring into a self-intersecting one',
        `it turns ${qBad} simple MV atoll rings into bow-ties; the guard \`verifyQuantisation\` samples a 1.7° lattice (~11k points) and reports 0, which it always will — a lattice that coarse cannot land within 11 m of a border`,
      );
      note('bounded damage', `~${(lostM2 / 1e6).toFixed(4)} km² lost / ~${(gainM2 / 1e6).toFixed(4)} km² gained across the eight bow-ties, against ~108.7 km² of Maldives land — the even-odd rule still answers MV inside both lobes, so no atoll disappears`);
    } else {
      note('provenance', 'SD\'s single self-intersection is present in the raw 1:110m layer as published — Natural Earth\'s, not the generator\'s');
    }
  }
}

console.log(`\n${fails} FAIL`);
