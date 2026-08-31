/**
 * I-8d's frame, measured on the **shipped Europe 2026 sample** rather than on a fixture.
 * ROADMAP Phase 2 I-8d, ARCHITECTURE §4.4 A-41/A-42.
 *
 *   Run: node qa/i8d-frame.mjs            (bare Node, no browser, no server)
 *
 * The sample is loaded exactly the way the app loads it — `fromJSON` over
 * `apps/web/src/sample/europe2026.json`, `tripSummary` against the bundled index,
 * `travelStats` over the resulting library — so what this prints is what the Map tab draws.
 *
 * A "FAIL" line means the frame does not match A-41 as written.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame, WORLD_CLUSTER_THRESHOLD_KM } from '../packages/client/src/selectors/worldMap.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

// ---------------------------------------------------------------------------
head('A  THE SHIPPED SAMPLE, THROUGH THE REAL PATH');

const doc = JSON.parse(readFileSync(resolve(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8'));
const trip = core.fromJSON(doc);
const row = core.tripSummary(trip, core.COUNTRY_INDEX);
// The sample is a past trip by the time anyone reads this; `today` only decides
// planned/active/completed, and the frame is the same either way.
const stats = core.travelStats([row], '2026-08-31');
console.log(`  sample: ${row.id} · ${row.startDate}→${row.endDate} · codes ${row.countryCodes.join(' ')}`);
ok(
  JSON.stringify(stats.countries.map((c) => c.code)) === JSON.stringify(['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US']),
  'the reference row is A-41 Part 1\'s row',
  stats.countries.map((c) => c.code),
);

const frame = worldMapFrame(stats, core.COUNTRY_INDEX);

head('B  PANES — A-41 C5/C6/C7');
for (const p of frame.panes) {
  const b = p.bounds;
  console.log(
    `  ${p.id.padEnd(8)} role=${p.role.padEnd(5)} weight=${p.weight} codes=[${p.codes.join(',')}]\n` +
    `           bounds  N ${b.north.toFixed(4)}  S ${b.south.toFixed(4)}  E ${b.east.toFixed(4)}  W ${b.west.toFixed(4)}` +
    `  span ${(b.east - b.west).toFixed(4)}° × ${(b.north - b.south).toFixed(4)}°  clamped=${b.clamped}\n` +
    `           viewBox "${p.viewBox}"`,
  );
}
const W = frame.panes.reduce((n, p) => n + p.weight, 0);
ok(frame.panes.length === 2, 'the sample splits into exactly two panes', frame.panes.length);
ok(String(frame.panes[0].codes) === 'AT,CZ,DE,GB,HR,HU', 'panes[0] is the six European codes', frame.panes[0].codes);
ok(String(frame.panes[1].codes) === 'US', 'panes[1] is the United States', frame.panes[1].codes);
ok(2 * frame.panes[0].weight > W, `the dominance test: 2 × ${frame.panes[0].weight} > ${W}`);
ok(frame.panes[0].id === 'main' && frame.panes[1].id === 'inset-1', 'pane ids are positional');
ok(frame.panes[0].role === 'main' && frame.panes[1].role === 'inset', 'roles are main + inset');
const span0 = frame.panes[0].bounds.east - frame.panes[0].bounds.west;
ok(Math.abs(span0 - 30.2827) < 5e-4, 'the main pane spans A-41\'s measured 30.2827° of longitude', span0);
ok(Math.abs((frame.panes[0].bounds.north - frame.panes[0].bounds.south) - 16.155) < 5e-4,
  'and its measured 16.155° of latitude', frame.panes[0].bounds.north - frame.panes[0].bounds.south);
// The frame this replaces: one `mapBounds` over every drawn country's box corners.
const allCorners = stats.countries.flatMap((c) =>
  core.COUNTRY_INDEX.countries.filter((e) => e.code === c.code).flatMap((e) => [
    { lat: e.box[1], lng: e.box[0] }, { lat: e.box[1], lng: e.box[2] },
    { lat: e.box[3], lng: e.box[2] }, { lat: e.box[3], lng: e.box[0] },
  ]));
const before = core.mapBounds(allCorners);
note(`threshold ${WORLD_CLUSTER_THRESHOLD_KM} km · the single frame this replaces spanned ` +
  `${(before.east - before.west).toFixed(4)}° × ${(before.north - before.south).toFixed(4)}°`);

head('C  NOTHING IS DROPPED — A-41 I1/I2');
const inPanes = frame.panes.flatMap((p) => p.codes);
ok(inPanes.length + frame.missing.length === stats.countries.length,
  'every stats row is in exactly one pane or in `missing`',
  { inPanes: inPanes.length, missing: frame.missing.length, rows: stats.countries.length });
ok(new Set(inPanes).size === inPanes.length, 'no code is in two panes');
ok(frame.countries.length === 7, 'all seven countries are still drawn', frame.countries.length);
ok(frame.countries.every((c) => frame.panes.some((p) => p.id === c.paneId)), 'every paneId names a pane');
ok(frame.countries.every((c) => c.tripIds.length > 0), 'every drawn country is still attributable to a trip');
for (const p of frame.panes) {
  const byId = frame.countries.filter((c) => c.paneId === p.id).map((c) => c.code);
  ok(String(byId) === String(p.codes), `pane ${p.id}: codes === the countries carrying its paneId`, { byId, codes: p.codes });
}

head('D  CONTAINMENT WITH MARGIN — A-42 (b) / A-41 I4');
const vertices = (d) => [...d.matchAll(/[ML](-?[\d.eE+]+),(-?[\d.eE+]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
for (const p of frame.panes) {
  const [minX, minY, w, h] = p.viewBox.split(' ').map(Number);
  let worst = Infinity;
  let worstAt = '';
  for (const c of frame.countries.filter((x) => x.paneId === p.id)) {
    for (const [x, y] of vertices(c.d)) {
      const m = Math.min(x - minX, minX + w - x, y - minY, minY + h - y);
      if (m < worst) { worst = m; worstAt = c.code; }
    }
  }
  ok(w > 0 && h > 0, `pane ${p.id} has positive width and height`, [w, h]);
  ok(worst > 0, `pane ${p.id}: the tightest inset is ${worst.toFixed(6)}° (at ${worstAt}) and must be > 0`, worst);
  console.log(`  note  ${p.id}: tightest inset ${worst.toFixed(6)}° at ${worstAt} — R33-6 measured 0.000000 before this pass`);
}

head('E  THE PAYLOAD CEILING — A-40 Part 5, re-measured over all panes');
const bytes = frame.countries.reduce((n, c) => n + Buffer.byteLength(c.d, 'utf8'), 0);
ok(bytes < 512 * 1024, `emitted d payload is ${(bytes / 1024).toFixed(1)} KB, under the 512 KB ceiling`, bytes);

head('F  THE THREE CLUSTER-COUNT CASES A-41 NAMES');
const rowOf = (code, n) => ({
  code, firstVisit: '2020-01-01', lastVisit: '2020-01-10',
  tripIds: Array.from({ length: n }, (_, i) => `${code}-${i}`), provisional: false,
});
const statsFor = (rows) => ({
  countries: rows, cities: [], trips: { planned: 0, active: 0, completed: 1 },
  daysTravelled: 10, located: { cities: 0, places: 0, stops: 0 },
  unattributed: { cities: 0, places: 0, stops: 0 }, unnamedCities: 0,
});
const one = worldMapFrame(statsFor([rowOf('AT', 1), rowOf('CZ', 1), rowOf('HU', 1)]), core.COUNTRY_INDEX);
ok(one.panes.length === 1, '1 cluster → 1 pane (A-40\'s frame plus padding)', one.panes.length);
const tie = worldMapFrame(statsFor([rowOf('JP', 1), rowOf('US', 1)]), core.COUNTRY_INDEX);
ok(tie.panes.length === 1, '2 clusters at a tie (US×1, JP×1) → 1 pane', tie.panes.length);
const broken = worldMapFrame(statsFor([rowOf('JP', 1), rowOf('US', 13)]), core.COUNTRY_INDEX);
ok(broken.panes.length === 2 && String(broken.panes[0].codes) === 'US',
  'the same library plus twelve more US trips → 2 panes, US primary',
  broken.panes.map((p) => p.codes));
const many = worldMapFrame(
  statsFor([rowOf('AT', 6), rowOf('AU', 1), rowOf('BR', 1), rowOf('JP', 1), rowOf('US', 1), rowOf('ZA', 1)]),
  core.COUNTRY_INDEX,
);
ok(many.panes.length === 3, '≥4 clusters → exactly 3 panes', many.panes.length);
ok(many.panes.flatMap((p) => p.codes).length === 6, 'and all six codes are still drawn',
  many.panes.map((p) => p.codes));
console.log(`  note  5-cluster fold: ${many.panes.map((p) => `${p.id}=[${p.codes}]`).join(' ')}`);

console.log(fails === 0 ? '\nALL CLEAR\n' : `\n${fails} FAIL(S)\n`);
process.exit(fails === 0 ? 0 : 1);
