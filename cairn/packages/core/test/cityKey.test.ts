/**
 * A-10 — a `CityKey` is a minted opaque id, not a slug of the city's name
 * (ARCHITECTURE §2.2 A-10, revision 11, QA P2-2). ROADMAP I-4a.
 *
 * The defect: both trip-creation forms minted a key with
 * `name.toLowerCase().replace(/[^a-z0-9]+/g, '-')`, which deletes every character outside
 * ASCII alphanumerics — so **any name in a non-Latin script collapsed to the single key
 * `"-"`**. Recording *"日本 2019, 東京, 京都"* stored two cities under one key, put
 * `primaryCity: "-"` on all 30 days, and `validateTrip` said nothing, because no check
 * anywhere asserted that city keys are distinct. §8.1's own worked example is a trip to
 * Japan; this is the phase's headline scenario, not its edge case.
 *
 * Two halves, and they are separate claims:
 *   - **minting** — `CityInit.key` is optional and `createTrip` mints one, so the collision
 *     is unreachable by construction;
 *   - **validation** — a key that is minted is not thereby a key that is trusted. A document
 *     can arrive by `importDoc`, by hand-edit, or from a build that predates this ruling, and
 *     it must **open** and say so rather than fail to parse.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import {
  createTrip, daysForCity, detectConflicts, fromJSON, sequentialIds, setDayMeta, toJSON,
  validateTrip, LOCAL_OWNER,
} from '../src/index.ts';
// Off §2.10's surface deliberately: the sentinel is core's, not a caller's. Tests import the
// module path, exactly as `conflict.test.ts` does for `STALE_RESOLUTION_LIMIT`.
import { TRANSIT_CITY_KEY } from '../src/model/ids.ts';
import { europe2026, FIXTURE_TODAY } from './fixture.ts';
import type { BuildCtx, Trip } from '../src/index.ts';

const ctx = (p = 'ck'): BuildCtx => ({ ids: sequentialIds(p), now: '2019-03-01', actorUserId: LOCAL_OWNER });

// ---------------------------------------------------------------------------
// Minting
// ---------------------------------------------------------------------------

test('A-10: two Japanese city names yield two distinct keys, two day sets and zero issues', () => {
  const c = ctx();
  let t = createTrip(
    {
      title: '日本 2019',
      startDate: '2019-03-01',
      endDate: '2019-03-04',
      cities: [{ name: '東京', order: 0 }, { name: '京都', order: 1 }],
    },
    c,
  );
  const [tokyo, kyoto] = t.cities;
  assert.equal(tokyo.name, '東京');
  assert.equal(kyoto.name, '京都');
  assert.notEqual(tokyo.key, kyoto.key, 'the two cities must not collapse into one key');
  assert.notEqual(tokyo.key, '-');
  assert.notEqual(tokyo.key, '');
  assert.notEqual(tokyo.key, TRANSIT_CITY_KEY);

  t = setDayMeta(t, t.days[0].id, { primaryCity: tokyo.key, cities: [tokyo.key] });
  t = setDayMeta(t, t.days[1].id, { primaryCity: tokyo.key, cities: [tokyo.key] });
  t = setDayMeta(t, t.days[2].id, { primaryCity: kyoto.key, cities: [kyoto.key] });
  t = setDayMeta(t, t.days[3].id, { primaryCity: kyoto.key, cities: [kyoto.key] });
  assert.equal(daysForCity(t, tokyo.key).length, 2);
  assert.equal(daysForCity(t, kyoto.key).length, 2);
  assert.deepEqual(validateTrip(t), [], 'a Japanese trip must validate clean');
});

test('A-10: the minted key comes from the injected IdFactory, and only when absent', () => {
  const c = ctx('jp');
  const t = createTrip(
    {
      title: 'Mixed',
      startDate: '2019-03-01',
      endDate: '2019-03-02',
      // An explicit key is honoured verbatim — legacy import and every fixture depend on it.
      cities: [{ key: 'vienna', name: 'Vienna' }, { name: 'München' }, { name: 'Кыив' }],
    },
    c,
  );
  assert.equal(t.cities[0].key, 'vienna', 'an explicit key is honoured verbatim');
  assert.deepEqual(t.cities.slice(1).map((x) => x.key), ['jpcity-1', 'jpcity-2'],
    'the minted keys come from ctx.ids.newId("city"), deterministically');
  // Determinism: the same init through the same factory prefix reproduces the same document.
  const again = createTrip(
    {
      id: t.id, title: 'Mixed', startDate: '2019-03-01', endDate: '2019-03-02',
      cities: [{ key: 'vienna', name: 'Vienna' }, { name: 'München' }, { name: 'Кыив' }],
    },
    ctx('jp'),
  );
  assert.deepEqual(again.cities, t.cities);
});

test('A-10: a city name is never parsed out of a key — the "Transit" name is safe', () => {
  const c = ctx('tr');
  let t = createTrip(
    { title: 'T', startDate: '2019-03-01', endDate: '2019-03-03', cities: [{ name: 'Transit' }] },
    c,
  );
  assert.notEqual(t.cities[0].key, TRANSIT_CITY_KEY,
    'a city literally named "Transit" must not shadow the sentinel');
  for (const d of t.days) t = setDayMeta(t, d.id, { primaryCity: t.cities[0].key, cities: [t.cities[0].key] });
  assert.deepEqual(validateTrip(t).map((i) => i.code), []);
});

// ---------------------------------------------------------------------------
// Validation — the three new codes, each with an injected fault
// ---------------------------------------------------------------------------

/** A clean two-city trip to inject a fault into. */
function twoCityTrip(): Trip {
  const c = ctx('v');
  let t = createTrip(
    {
      title: 'V', startDate: '2019-03-01', endDate: '2019-03-02',
      cities: [{ name: 'Tokyo' }, { name: 'Kyoto' }],
    },
    c,
  );
  for (const d of t.days) t = setDayMeta(t, d.id, { primaryCity: t.cities[0].key, cities: [t.cities[0].key] });
  assert.deepEqual(validateTrip(t), [], 'the control must be clean, or the injection proves nothing');
  return t;
}

test('A-10 injected fault: duplicate_city_key — the exact shape the slug produced', () => {
  const t = twoCityTrip();
  // What `PastTripForm` used to store for 東京/京都: two cities, one key.
  const collapsed: Trip = {
    ...t,
    cities: t.cities.map((x) => ({ ...x, key: '-' })),
    days: t.days.map((d) => ({ ...d, primaryCity: '-', cities: ['-'] })),
  };
  const issues = validateTrip(collapsed).filter((i) => i.code === 'duplicate_city_key');
  assert.equal(issues.length, 1, 'exactly one error, naming the key');
  assert.equal(issues[0].level, 'error');
  assert.equal(issues[0].ref.kind, 'trip');
  assert.equal(issues[0].ref.id, collapsed.id);
  assert.equal(issues[0].params.cityKey, '-');
  // ...and the document still OPENS: a broken document the user cannot see is worse.
  assert.doesNotThrow(() => fromJSON(toJSON(collapsed)));
  assert.equal(fromJSON(toJSON(collapsed)).cities.length, 2);
});

test('A-10 injected fault: reserved_city_key — a city that shadows the transit sentinel', () => {
  const t = twoCityTrip();
  const shadowed: Trip = {
    ...t,
    cities: [{ ...t.cities[0], key: TRANSIT_CITY_KEY }, t.cities[1]],
    days: t.days.map((d) => ({ ...d, primaryCity: TRANSIT_CITY_KEY, cities: [TRANSIT_CITY_KEY] })),
  };
  const issues = validateTrip(shadowed).filter((i) => i.code === 'reserved_city_key');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].level, 'error');
  assert.equal(issues[0].params.cityKey, TRANSIT_CITY_KEY);
  assert.doesNotThrow(() => fromJSON(toJSON(shadowed)));
});

test('A-10 injected fault: city_name_empty — the name is the only human identity a city has', () => {
  const t = twoCityTrip();
  for (const name of ['', '   ']) {
    const nameless: Trip = { ...t, cities: [{ ...t.cities[0], name }, t.cities[1]] };
    const issues = validateTrip(nameless).filter((i) => i.code === 'city_name_empty');
    assert.equal(issues.length, 1, `name ${JSON.stringify(name)} must be exactly one error`);
    assert.equal(issues[0].level, 'error');
    assert.equal(issues[0].params.cityKey, t.cities[0].key);
    assert.doesNotThrow(() => fromJSON(toJSON(nameless)));
  }
});

test('A-10: `fromJSON` refuses none of the three — an already-collapsed document must open', () => {
  const t = twoCityTrip();
  const broken: Trip = {
    ...t,
    cities: [
      { ...t.cities[0], key: '-', name: '' },
      { ...t.cities[1], key: '-', name: '東京' },
      { ...t.cities[0], key: TRANSIT_CITY_KEY, name: 'Transit' },
    ],
    days: t.days.map((d) => ({ ...d, primaryCity: '-', cities: ['-'] })),
  };
  const reopened = fromJSON(toJSON(broken));
  assert.equal(reopened.cities.length, 3, 'parsing does not refuse — validation is what catches this');
  const codes = validateTrip(reopened).map((i) => i.code);
  assert.ok(codes.includes('duplicate_city_key'));
  assert.ok(codes.includes('reserved_city_key'));
  assert.ok(codes.includes('city_name_empty'));
});

// ---------------------------------------------------------------------------
// geo_outlier's label helpers
// ---------------------------------------------------------------------------

test('A-10: geo_outlier renders the city NAME, and params.cityKey keeps the id', () => {
  const { trip } = europe2026();
  // The Fisherman's Bastion latitude typo `geoCheck.test.ts` injects, reached through a place.
  const place = trip.places.find((p) => p.cityKey === 'vienna' && p.at !== null)!;
  assert.ok(place, 'the reference trip has a Vienna place to move');
  const moved: Trip = {
    ...trip,
    places: trip.places.map((p) => (p.id === place.id ? { ...p, at: { lat: place.at!.lat + 9, lng: place.at!.lng } } : p)),
  };
  const found = detectConflicts(moved, { today: FIXTURE_TODAY })
    .filter((c) => c.ruleId === 'geo_outlier' && c.subjects.some((s) => s.id === place.id));
  assert.equal(found.length, 1, 'the injected fault must produce exactly one blocker');
  assert.match(found[0].summary, /the Vienna map/, 'the summary names the city, not its key');
  assert.doesNotMatch(found[0].summary, /the vienna map/);
  assert.equal(found[0].params.where, 'the Vienna map');
  // Structured data keeps the id: §2.7 requires it, and a label is not an identifier.
  assert.equal(typeof found[0].params.cityKey, 'string');
});

test('A-10: an unresolvable key still renders — the label helpers fall back to a legible phrase', () => {
  const { trip } = europe2026();
  const place = trip.places.find((p) => p.cityKey === 'vienna' && p.at !== null)!;
  const orphaned: Trip = {
    ...trip,
    places: trip.places.map((p) =>
      p.id === place.id ? { ...p, cityKey: 'no-such-city', at: { lat: place.at!.lat + 9, lng: place.at!.lng } } : p),
  };
  const found = detectConflicts(orphaned, { today: FIXTURE_TODAY })
    .filter((c) => c.ruleId === 'geo_outlier' && c.subjects.some((s) => s.id === place.id));
  assert.equal(found.length, 1);
  assert.match(
    found[0].summary,
    /a city this trip does not have/,
    'no trip city for this key — show a legible phrase, not the raw opaque id',
  );
  assert.doesNotMatch(found[0].summary, /no-such-city/, 'the raw key must not leak into the summary string');
});

// ---------------------------------------------------------------------------
// The ship gate's greppable ceiling
// ---------------------------------------------------------------------------

test('A-10 ship gate: the slug expression appears nowhere in apps/ or packages/', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules' || e === 'dist' || e === '.vite') continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx|js|jsx|mjs)$/.test(p)) out.push(p);
    }
    return out;
  };
  // Built from parts so this file does not match its own scan.
  const charClass = `[^a-z0${'-'.replace('-', '')}9]`.replace('09', '0-9');
  const hits: string[] = [];
  for (const dir of ['apps', 'packages']) {
    for (const f of walk(join(root, dir))) {
      if (f === fileURLToPath(import.meta.url)) continue;
      const src = readFileSync(f, 'utf8');
      if (src.includes(charClass)) hits.push(f.slice(root.length + 1));
    }
  }
  assert.deepEqual(hits, [], `the deleted slug expression is still here: ${hits.join(', ')}`);
});

test('A-10 ship gate: no call site outside packages/core constructs a city key', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules' || e === 'dist' || e === '.vite') continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(p)) out.push(p);
    }
    return out;
  };
  const hits: string[] = [];
  for (const dir of ['apps', join('packages', 'client')]) {
    for (const f of walk(join(root, dir))) {
      const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      // A `cities:` init that also assigns `key:` is a caller minting a city key.
      if (/cities:[\s\S]{0,400}?\bkey:\s*[^'"\s]/.test(code)) hits.push(f.slice(root.length + 1));
    }
  }
  assert.deepEqual(hits, [], `a caller outside packages/core constructs a city key: ${hits.join(', ')}`);
});
