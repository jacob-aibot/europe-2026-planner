/**
 * Builds `data/region50.json` — a finer coastline for the ZOOMED views of the three visual
 * directions, and nothing else.
 *
 * **Why a second scale exists, and why it is not a geographic-architecture change.**
 * `packages/core`'s committed index is 1:110 million. That is the correct scale for the *world*
 * view and it is what `countryOf` attributes against — nothing here touches attribution, framing,
 * clustering or `SUMMARY_VERSION`. But 110m gives Croatia 42 points, and a design that zooms to a
 * trip would be judging its own coastline rather than its composition. Every real map product
 * carries more than one generalisation; drawing at a finer scale than you *attribute* at is
 * standard, not a correctness claim.
 *
 * **Same pinned dataset.** `nvkelso/natural-earth-vector@v5.1.2/geojson/ne_50m_admin_0_countries.geojson`,
 * sha256 `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb` — byte-identical to the
 * hash `packages/core/src/geo/countries.gen.ts` already records for its A-28 forgiveness layer, so
 * this is a scale the repository has already vetted and cited, fetched from the same tag.
 *
 * Run:  curl -sSL -o /tmp/ne50.geojson \
 *         https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson
 *       node cairn/docs/design/directions/build-region.mjs /tmp/ne50.geojson
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2];
if (!SRC) { console.error('usage: build-region.mjs <ne_50m_admin_0_countries.geojson>'); process.exit(2); }

const EXPECT = '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb';
const raw = readFileSync(SRC);
const got = createHash('sha256').update(raw).digest('hex');
if (got !== EXPECT) { console.error(`sha256 mismatch\n  want ${EXPECT}\n  got  ${got}`); process.exit(1); }

/** The window the directions actually zoom into: Europe, plus the two outliers the data reaches. */
const WINDOW = [-26, 32, 46, 73];                  // [W, S, E, N]
const EXTRA = new Set(['JP', 'US', 'CA', 'MX', 'KR', 'CN', 'RU']);

const r3 = (n) => Math.round(n * 1000) / 1000;
const gj = JSON.parse(raw.toString('utf8'));
const out = [];
let rings = 0, pts = 0;

for (const f of gj.features) {
  const p = f.properties;
  const code = p.ISO_A2_EH ?? p.ISO_A2 ?? p.WB_A2;
  if (!code || code === '-99') continue;
  const g = f.geometry;
  if (!g) continue;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  const keep = [];
  for (const poly of polys) {
    for (const ring of poly) {
      let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
      for (const [lng, lat] of ring) {
        if (lng < w) w = lng; if (lng > e) e = lng;
        if (lat < s) s = lat; if (lat > n) n = lat;
      }
      const inWindow = e >= WINDOW[0] && w <= WINDOW[2] && n >= WINDOW[1] && s <= WINDOW[3];
      if (!inWindow && !EXTRA.has(code)) continue;
      // A ring smaller than ~0.03deg across contributes nothing at the zooms these views use.
      if (e - w < 0.03 && n - s < 0.03) continue;
      const flat = new Array(ring.length * 2);
      for (let i = 0; i < ring.length; i++) { flat[i * 2] = r3(ring[i][0]); flat[i * 2 + 1] = r3(ring[i][1]); }
      keep.push(flat);
      rings++; pts += ring.length;
    }
  }
  if (keep.length) out.push({ c: code, r: keep });
}

writeFileSync(join(HERE, 'data', 'region50.json'), JSON.stringify({
  scale: '50m',
  source: 'nvkelso/natural-earth-vector@v5.1.2/geojson/ne_50m_admin_0_countries.geojson',
  sha256: EXPECT,
  window: WINDOW,
  countries: out,
}));
console.log('region50.json', out.length, 'countries,', rings, 'rings,', pts, 'points');
