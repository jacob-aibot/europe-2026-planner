/**
 * Builds the data the three visual directions render from.
 *
 * **Everything here is real or is the repository's own development fixture. Nothing is invented.**
 *
 *   world.json  — the whole world's admin-0 outlines, taken from `packages/core`'s committed
 *                 `COUNTRY_INDEX` (Natural Earth v5.1.2, public domain), rounded to 2 dp. This is
 *                 the SAME data the shipped world map attributes stops against; the directions
 *                 differ from the shipped map only in how it is drawn, never in what it is.
 *   cairn.json  — the real Europe 2026 trip (`apps/web/src/sample/europe2026.json`, generated and
 *                 redacted by `tools/gen-sample.mjs`) plus the repository's existing QA development
 *                 library from `qa/i8b-render.mjs`, which is a **development fixture and not
 *                 Jacob's actual travel history** — it is carried here unchanged so the directions
 *                 can show completed-vs-planned without anyone inventing a trip.
 *
 * Run:  node cairn/docs/docs/design/directions/build-data.mjs      (cwd anywhere)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..', '..', '..');            // cairn/
const OUT = join(HERE, 'data');

const core = await import(join(CAIRN, 'packages/core/src/index.ts'));
const { COUNTRY_INDEX, countryKeyPoint } = core;

// ---------------------------------------------------------------------------
// world.json — every country, every ring, 2 dp.
// ---------------------------------------------------------------------------
const r2 = (n) => Math.round(n * 100) / 100;
const seen = new Set();
const countries = [];
for (const e of COUNTRY_INDEX.countries) {
  // An ISO code may appear twice (A-28 "forgiveness" entries). For DRAWING we want one shape per
  // code, and the first entry is the one `countryOf` returns on, so it is the one to draw.
  if (seen.has(e.code)) continue;
  seen.add(e.code);
  const rings = [];
  for (const ring of e.rings) {
    if (ring.length < 8) continue;                        // 3 points or fewer: nothing to draw
    const out = new Array(ring.length);
    for (let i = 0; i < ring.length; i += 2) { out[i] = r2(ring[i]); out[i + 1] = r2(ring[i + 1]); }
    rings.push(out);
  }
  if (rings.length) countries.push({ c: e.code, r: rings });
}
writeFileSync(join(OUT, 'world.json'), JSON.stringify({
  source: COUNTRY_INDEX.source, scale: COUNTRY_INDEX.scale, countries,
}));

// ---------------------------------------------------------------------------
// cairn.json — the real trip, plus the repo's QA development library.
// ---------------------------------------------------------------------------
const trip = JSON.parse(readFileSync(join(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8'));

const cityByKey = new Map(trip.cities.map((c) => [c.key, c]));
const placeById = new Map(trip.places.map((p) => [p.id, p]));

const stopAt = (s) => {
  if (!s.place) return null;
  if (s.place.kind === 'inline') return s.place.at ?? null;
  const p = placeById.get(s.place.id ?? s.place.placeId);
  return p?.at ?? p?.centre ?? null;
};

const days = trip.days.map((d) => ({
  id: d.id,
  date: d.date ?? d.id,
  city: d.primaryCity ?? null,
  cities: d.cities ?? [],
  title: d.title ?? null,
  subtitle: d.subtitle ?? null,
  stops: (d.stops ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category ?? null,
    time: s.placement?.time ?? null,
    at: stopAt(s),
    cost: s.cost?.display ?? null,
    mode: s.arrival?.mode ?? null,
    mins: s.arrival?.mins ?? null,
    role: s.travelRole ?? null,
    ticketed: (s.flags ?? []).includes('ticketed'),
    provenance: s.provenance?.state ?? null,
    source: s.provenance?.source ?? null,
  })),
}));

// Attribution census, computed rather than asserted: how many stops carry a coordinate at all.
let located = 0, unlocated = 0;
for (const d of days) for (const s of d.stops) (s.at ? located++ : unlocated++);

/**
 * The QA development library, copied verbatim from `qa/i8b-render.mjs`'s REFERENCE constant.
 * Past trips recorded through the past-trip form carry NO city coordinate (A-40 Part 5), so they
 * are attributable to a COUNTRY and nothing finer. `key` is the country's own key point, derived
 * by `packages/core`'s `countryKeyPoint` — a real derived value, not a guessed city location.
 */
const devLibrary = [
  { id: 'r1', title: 'Central Europe 2019', start: '2019-08-03', end: '2019-08-17',
    countries: ['AT', 'CZ', 'HU'], cities: ['Vienna', 'Prague', 'Budapest'],
    census: { located: 100, attributed: 93 } },
  { id: 'r2', title: 'Croatia 2022', start: '2022-06-01', end: '2022-06-10',
    countries: ['HR'], cities: ['Dubrovnik', 'Split', 'Somewhere at sea'],
    census: { located: 32, attributed: 32 }, unnamed: 1 },
  { id: 'r4', title: 'London 2026', start: '2026-03-02', end: '2026-03-06',
    countries: ['GB'], cities: ['London'], census: { located: 23, attributed: 23 } },
  { id: 'r3', title: 'Japan 2027', start: '2027-04-01', end: '2027-04-12',
    countries: ['JP'], cities: ['Tokyo'], census: null },
].map((t) => ({
  ...t,
  points: t.countries.map((c) => ({ code: c, at: countryKeyPoint(c, COUNTRY_INDEX) })),
}));

writeFileSync(join(OUT, 'cairn.json'), JSON.stringify({
  today: '2026-09-02',
  trip: {
    id: trip.id, title: trip.title, start: trip.startDate, end: trip.endDate,
    homeBase: trip.homeBase ?? null,
    cities: trip.cities.map((c) => ({
      key: c.key, name: c.name, country: c.countryCode, at: c.centre, order: c.order,
    })),
    days,
    counts: {
      days: days.length,
      stops: days.reduce((n, d) => n + d.stops.length, 0),
      places: trip.places.length,
      bookings: (trip.bookings ?? []).length,
      pool: (trip.pool ?? []).length,
      located, unlocated,
    },
  },
  devLibrary,
}, null, 0));

console.log('world.json  ', countries.length, 'countries,',
  countries.reduce((n, c) => n + c.r.length, 0), 'rings');
console.log('cairn.json  ', days.length, 'days,',
  days.reduce((n, d) => n + d.stops.length, 0), 'stops,', located, 'located /', unlocated, 'not');
console.log('devLibrary  ', devLibrary.length, 'fixture trips;',
  devLibrary.flatMap((t) => t.points).filter((p) => p.at === null).length, 'country key points missing');
