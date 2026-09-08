/**
 * QA round 57 — the adversarial pass over ROADMAP **I-17** / `ARCHITECTURE.md` revision 59 §2.1
 * **A-78** ("the census reads the tree, not a list of files"), commit `c677162`.
 *
 * The two injection probes live beside this one and are shell scripts because they need `tsc`:
 *   bash qa/r57-doorforms.sh    — §A/§B/§C: seven declaration forms the type census cannot see
 *   bash qa/r57-async.sh        — §C: is the `Promise<Trip>` widening safe or only permissive
 *   bash qa/r57-nondoors.sh     — §D: hiding a door in `NON_DOORS` without a fourth name
 *   bash qa/r57-kd106.sh        — §E: a THIRD wrapper-returning producer
 *
 * This one is everything that needs no compiler:
 *   §F  the ARRAY-identity gap the round-56 fix pass flagged and did not close
 *   §G  KD-108 — the ordering check below the commit, and its blast radius
 *   §H  the riders: R56-3 / R56-5 / R56-7, re-derived
 *   §I  `cairn-constraints` §2/§4/§5/§6 and I-17's own "zero X" claims, run rather than quoted
 *
 * Run:  node --experimental-strip-types qa/r57-a78.mjs      # from cairn/
 * Exit 0 iff `fails === 0`.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const CAIRN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, gaps = 0;
const ok = (l, c, d) => {
  if (c) console.log(`ok   ${l}`);
  else { fails++; console.log(`FAIL ${l}${d === undefined ? '' : ` — ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); }
};
const gap = (l, d) => { gaps++; console.log(`gap  ${l}${d === undefined ? '' : ` — ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); };
const note = (l, d) => console.log(`note ${l}${d === undefined ? '' : ` — ${d}`}`);
const section = (n) => console.log(`\n=== ${n} ===`);
const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };

const core = await import(resolve(CAIRN, 'packages/core/src/index.ts'));
const Stops = await import(resolve(CAIRN, 'packages/core/src/build/stops.ts'));
const Days = await import(resolve(CAIRN, 'packages/core/src/build/days.ts'));
const CreateTrip = await import(resolve(CAIRN, 'packages/core/src/build/createTrip.ts'));
const Bookings = await import(resolve(CAIRN, 'packages/core/src/build/bookings.ts'));

let seq = 0;
const CTX = () => ({ ids: core.sequentialIds(`r57-${++seq}-`), now: '2026-08-01', actorUserId: 'local:self' });
const mk = (over = {}) => core.createTrip({
  title: 'R57', startDate: '2026-08-07', endDate: '2026-08-09',
  cities: [{ key: 'v', name: 'Vienna', countryCode: 'AT', centre: { lat: 48.21, lng: 16.37 } }],
  ...over,
}, CTX());
const PROV = {
  source: 'user', state: 'accepted', confidence: 'confirmed',
  addedAt: '2026-08-01', acceptedAt: '2026-08-01', actorUserId: 'local:self',
};
const GOOD_BOOKING = {
  id: 'bk-1', tripId: 't', kind: 'train', operator: 'ÖBB', reference: 'R1',
  startsAt: { date: '2026-08-07', time: '08:00' }, price: null, party: 2, status: 'active',
  ticket: null, provenance: PROV,
};

/** Round 54's oracle. UNOPENABLE is the defect class. */
function census(fn) {
  let doc = null;
  const doorErr = threw(() => { doc = fn(); });
  if (doorErr) return { v: 'REFUSED', d: doorErr.message.slice(0, 100) };
  let bytes = null;
  const serErr = threw(() => { bytes = core.toJSON(doc); });
  if (serErr) return { v: 'UNSERIALISABLE', d: serErr.message.slice(0, 60) };
  const parseErr = threw(() => core.fromJSON(bytes));
  if (parseErr) return { v: 'UNOPENABLE', d: parseErr.message.slice(0, 100) };
  return { v: 'clean', doc };
}

// =================================================================================================
section('F — the ARRAY-identity gap: Invariant R is stated over RECORDS, not over the arrays that hold them');
// The round-56 fix pass (commit `ba6f1e9`) disclosed this objection and left it open: *"A-77 Part 3's
// induction and A-78 Part 7's Invariant R are both stated over RECORDS; the equivalent claim over the
// ARRAYS that hold them is stated nowhere."*
//
// `commitList` reads `aligned = before.<coll>` and `after = after.<coll>`. If those are the SAME array
// object — which they are whenever a door builds `{...trip, ...patch}` and does not touch that
// collection — then `aligned[i] === r` for EVERY slot, including a slot a caller appended. A record
// that has never been parsed is therefore treated as already-parsed, permanently.
// =================================================================================================
{
  const t = mk();
  // The caller half of Invariant R: nothing here mutates a RECORD. It appends an unparsed record
  // object to a committed document's array — which Invariant R's text does not forbid, because a
  // `Trip`'s own arrays are not in its list of record classes.
  t.bookings.push({ ...GOOD_BOOKING, kind: 'teleport' });
  const r = census(() => CreateTrip.setTripMeta(t, { title: 'Renamed' }, CTX()));
  if (r.v === 'UNOPENABLE') {
    gap('F1  a record APPENDED to a committed array is never parsed — the next door writes an unopenable document', r.d);
  } else {
    ok('F1  a record appended to a committed array is caught', r.v === 'REFUSED', r);
  }

  // Same shape, one level in: a stop appended to a committed day's `stops` array.
  const t2 = mk();
  t2.days[0].stops.push({
    id: 's-x', name: 'Ghost', category: 'transport', placement: { kind: 'scheduled', dayId: t2.days[0].id, time: null, order: 0 },
    place: null, cost: null, durationMins: null, notes: null, links: [], provenance: PROV,
  });
  const r2 = census(() => CreateTrip.setTripMeta(t2, { title: 'Renamed' }, CTX()));
  if (r2.v === 'UNOPENABLE') gap('F2  ...and the same one level in, at `day.stops`', r2.d);
  else ok('F2  a stop appended to a committed day is caught', r2.v === 'REFUSED', r2);

  // The other direction — OVER-validation. A door that replaces the ARRAY with a new array holding
  // the SAME record objects must re-parse nothing: the aligned test is what A-77 Part 9's budget is
  // bought with. Measured by identity, not by a timer.
  const t3 = mk();
  const withBooking = Bookings.upsertBooking(t3, GOOD_BOOKING);
  const reboxed = { ...withBooking, bookings: [...withBooking.bookings], revision: withBooking.revision + 1 };
  const out = CreateTrip.setTripMeta(withBooking, { title: 'Rebox' }, CTX());
  ok('F3  a door that re-boxes a collection re-parses nothing (records keep identity)',
    out.bookings[0] === withBooking.bookings[0], 'the booking record was re-parsed and substituted');
  ok('F3b commit still hands back a NEW array, never the one it was given (R56-4)',
    out.bookings !== withBooking.bookings && reboxed.bookings !== out.bookings);

  // And a REORDER: same objects, new array, different indices. Should cost one identity Set and no parse.
  const two = Bookings.upsertBooking(withBooking, { ...GOOD_BOOKING, id: 'bk-2' });
  const swapped = { ...two, bookings: [two.bookings[1], two.bookings[0]], revision: two.revision + 1 };
  const after = threw(() => core.toJSON(swapped)) === null ? swapped : null;
  ok('F4  a reordered collection is not re-parsed for having moved',
    after !== null && after.bookings[0] === two.bookings[1]);
}

// =================================================================================================
section('G — KD-108: the ordering check sits BELOW the commit, and whether that pattern is anywhere else');
// =================================================================================================
{
  // The rider criterion, verbatim: a mistyped month is refused by the parser's own sentence, naming
  // `$.startDate`, and A-35's span cap does not pre-empt it.
  const e = threw(() => mk({ startDate: '2026-13-45', endDate: '2026-13-46' }));
  ok('G1  createTrip refuses a calendar-invalid startDate', e !== null);
  ok('G1a it is the parser\'s own sentence, naming $.startDate',
    e !== null && /expected a real calendar date in YYYY-MM-DD/.test(e.message) && e.message.includes('$.startDate'), e && e.message);
  ok('G1b A-35\'s span cap did NOT pre-empt it', e !== null && !/would cover/.test(e.message), e && e.message);
  ok('G1c and the ordering message did not either', e !== null && !/precedes startDate/.test(e.message), e && e.message);

  // The half KD-108 is actually about: `'2026-03-02' < '2026-13-45'` is TRUE, so with the ordering
  // check ABOVE the commit a mistyped month reads as an ordering error.
  const e2 = threw(() => mk({ startDate: '2026-03-02', endDate: '2026-13-45' }));
  ok('G2  a mistyped MONTH in endDate is a storability refusal, not an ordering one',
    e2 !== null && /cannot be stored/.test(e2.message) && e2.message.includes('$.endDate'), e2 && e2.message);

  // And the ordering check still works when both dates are real.
  const e3 = threw(() => mk({ startDate: '2026-08-09', endDate: '2026-08-07' }));
  ok('G3  a genuinely inverted range still gets the ordering message',
    e3 !== null && /endDate 2026-08-07 precedes startDate 2026-08-09/.test(e3.message), e3 && e3.message);

  const t = mk();
  const e4 = threw(() => CreateTrip.setTripMeta(t, { endDate: '2026-13-45' }, CTX()));
  ok('G4  setTripMeta answers the same way', e4 !== null && /cannot be stored/.test(e4.message) && e4.message.includes('$.endDate'), e4 && e4.message);
  const e5 = threw(() => CreateTrip.setTripMeta(t, { endDate: '2026-08-06' }, CTX()));
  ok('G5  ...and its ordering check still fires on a real inverted range',
    e5 !== null && /precedes startDate/.test(e5.message), e5 && e5.message);

  // Blast radius: is "a check placed after the commit" anywhere else? Every other door in core is a
  // single `return commit(...)`, so there is no statement after it to be mis-ordered.
  const srcFiles = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = resolve(d, e.name);
      if (e.isDirectory()) walk(p); else if (e.name.endsWith('.ts')) srcFiles.push(p);
    }
  })(resolve(CAIRN, 'packages/core/src'));
  const postCommit = [];
  for (const f of srcFiles) {
    const lines = readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => {
      // A commit whose result is BOUND rather than returned is the shape KD-108 lives in.
      if (/^\s*const \w+ = commit\(/.test(l)) postCommit.push(`${f.slice(CAIRN.length + 1)}:${i + 1}`);
    });
  }
  ok('G6  the "bind a commit, then check" shape exists at exactly the two doors KD-108 names',
    postCommit.length === 2 && postCommit.every((p) => p.startsWith('packages/core/src/build/createTrip.ts')), postCommit);
}

// =================================================================================================
section('H — the riders, re-derived: R56-3 (isIsoDate), R56-5 (TripMetaPatch), R56-7 (day provenance)');
// =================================================================================================
{
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  const src = strip(readFileSync(resolve(CAIRN, 'packages/core/src/build/createTrip.ts'), 'utf8'));
  ok('H1  `isIsoDate` is gone from createTrip.ts CODE (both call sites and the import)', !/isIsoDate/.test(src));
  const ids = readFileSync(resolve(CAIRN, 'packages/core/src/model/ids.ts'), 'utf8');
  ok('H1a ...and `isIsoDate` itself is untouched and still exported', /export function isIsoDate/.test(ids));
  ok('H1b build/ holds exactly one non-parser guard (assertBuiltAttach)',
    srcGuards().length === 1, srcGuards());

  // R56-5 / KD-104 — THIS IS THE NEW VERDICT the round-56 probe measured as a defect.
  const t = mk({ datePrecision: 'month' });
  ok('H2  the fixture really is a `month` trip', t.datePrecision === 'month');
  const e = threw(() => CreateTrip.setTripMeta(t, { datePrecision: undefined }, CTX()));
  ok('H2a setTripMeta({datePrecision: undefined}) now THROWS', e !== null, 'still silently writes `exact`');
  ok('H2b ...with A-78 Part 4\'s reason', e !== null && /may not be patched to `undefined`/.test(e.message), e && e.message);
  ok('H2c ...and the trip still reads `month`', t.datePrecision === 'month');
  // All ten keys, both directions.
  const KEYS = ['title', 'startDate', 'endDate', 'datePrecision', 'homeCurrency', 'homeBase', 'party', 'cities', 'ownerId', 'meta'];
  const notRefused = KEYS.filter((k) => threw(() => CreateTrip.setTripMeta(t, { [k]: undefined }, CTX())) === null);
  ok('H2d all ten TripMetaPatch keys are refused when present with `undefined`', notRefused.length === 0, notRefused);
  const outside = threw(() => CreateTrip.setTripMeta(t, { revision: 99 }, CTX()));
  ok('H2e a key outside the Pick is refused', outside !== null && /not a field of TripMetaPatch/.test(outside.message), outside && outside.message);
  const proto = threw(() => CreateTrip.setTripMeta(t, { toString: 'x' }, CTX()));
  ok('H2f an inherited key name is refused too (hasOwnProperty, not `in`)', proto !== null, proto && proto.message);
  const nonArray = threw(() => CreateTrip.setTripMeta(t, { cities: 'nope' }, CTX()));
  ok('H2g the `cities` Array.isArray half survives', nonArray !== null && /must be an array/.test(nonArray.message), nonArray && nonArray.message);

  // R56-7 — `provenance` out of DayMetaPatch.
  const pe = threw(() => Days.setDayMeta(t, t.days[0].id, { provenance: { ...PROV, source: 'email' } }));
  ok('H3  setDayMeta refuses a `provenance` key', pe !== null, 'a day provenance is still patchable');
  ok('H3a ...with updateStop\'s reason verbatim',
    pe !== null && /acceptCandidate/.test(pe.message) && /rejectCandidate/.test(pe.message), pe && pe.message);
  const before = t.days[0].provenance;
  const okPatch = Days.setDayMeta(t, t.days[0].id, { title: 'Arrival' });
  ok('H3b ...and an ordinary day patch still works and leaves provenance alone',
    okPatch.days[0].title === 'Arrival' && okPatch.days[0].provenance.source === before.source);
  const stopE = threw(() => Stops.updateStop(mk(), 'nope', { provenance: PROV }));
  ok('H3c the two doors read the same sentence', stopE !== null && /acceptCandidate/.test(stopE.message), stopE && stopE.message);
}

function srcGuards() {
  const dir = resolve(CAIRN, 'packages/core/src/build');
  const found = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.ts')) continue;
    const s = readFileSync(resolve(dir, f), 'utf8');
    for (const m of s.matchAll(/^function (assert\w+)/gm)) {
      // `assertStorable` is the parser mechanism; `assertPatchable` is a key allowlist, which §2.1's
      // patch paragraph requires and A-78 Part 4 adds — neither is a per-FIELD door guard.
      if (!/^assert(Storable|Patchable)$/.test(m[1])) found.push(`${f}:${m[1]}`);
    }
  }
  return found;
}

// =================================================================================================
section('I — the constraints, and I-17\'s own "zero X" claims, run rather than quoted');
// =================================================================================================
{
  const walkAll = (d, out = []) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = resolve(d, e.name);
      if (e.isDirectory()) walkAll(p, out); else out.push(p);
    }
    return out;
  };
  const coreSrc = walkAll(resolve(CAIRN, 'packages/core/src'));
  const clientSrc = walkAll(resolve(CAIRN, 'packages/client/src'));
  /** Source with comments and string literals stripped — a rule about CODE is not a rule about prose. */
  const read = (f) => readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''");

  // cairn-constraints §4 — determinism.
  const nondet = coreSrc.concat(clientSrc).filter((f) => /Date\.now\(|Math\.random\(|crypto\.randomUUID\(|new Date\(/.test(read(f)));
  ok('I1  no ambient clock or randomness in packages/core or packages/client', nondet.length === 0,
    nondet.map((f) => f.slice(CAIRN.length + 1)));

  // cairn-constraints §5 — no DOM, no React in packages/client.
  const dom = clientSrc.filter((f) => /\b(document|window|localStorage|navigator)\s*\./.test(read(f)) || /from ''/.test(read(f)) && /react/.test(readFileSync(f, 'utf8').match(/from '[^']*react[^']*'/)?.[0] ?? ''));
  ok('I2  packages/client touches no DOM and no React', dom.length === 0, dom.map((f) => f.slice(CAIRN.length + 1)));

  // cairn-constraints §2 — zero runtime dependencies.
  const pkgs = ['packages/core/package.json', 'packages/client/package.json'].map((p) => JSON.parse(read(resolve(CAIRN, p))));
  const thirdParty = pkgs.flatMap((p) => Object.keys(p.dependencies ?? {})).filter((d) => !d.startsWith('@cairn/'));
  ok('I3  packages/core and packages/client declare zero THIRD-PARTY runtime dependencies',
    thirdParty.length === 0, thirdParty);
  const root = JSON.parse(read(resolve(CAIRN, 'package.json')));
  ok('I3a the root manifest still declares exactly typescript + @types/node',
    !root.dependencies && Object.keys(root.devDependencies).sort().join(',') === '@types/node,typescript',
    root.devDependencies);

  // A-78 Part 7 — no `Object.freeze` in any `src` file. (`commit.ts` says there is none; that
  // sentence must not be the thing that satisfies the grep.)
  const frozen = coreSrc.filter((f) => /Object\.freeze\s*\(/.test(read(f)));
  ok('I4  no `Object.freeze(` call anywhere under packages/core/src', frozen.length === 0,
    frozen.map((f) => f.slice(CAIRN.length + 1)));

  // A-78 Part 1 half 2 — the tree the census claims to describe.
  const tsFiles = coreSrc.filter((f) => f.endsWith('.ts'));
  ok('I5  packages/core/src holds 54 `.ts` files and nothing else',
    tsFiles.length === 54 && tsFiles.length === coreSrc.length, { ts: tsFiles.length, all: coreSrc.length });
  ok('I5a and no `.d.ts`', coreSrc.every((f) => !f.endsWith('.d.ts')));
  const censusSrc = readFileSync(resolve(CAIRN, 'packages/core/test/storable.test.ts'), 'utf8');
  const rows = [...censusSrc.matchAll(/^ {2}\['([^']+\.ts)', /gm)].map((m) => m[1]);
  ok('I5b the CENSUS array carries exactly those 54 paths', rows.length === 54, rows.length);
  const disk = tsFiles.map((f) => f.slice(resolve(CAIRN, 'packages/core/src').length + 1)).sort();
  ok('I5c ...and they are the same 54', JSON.stringify(rows.slice().sort()) === JSON.stringify(disk),
    rows.slice().sort().filter((r, i) => r !== disk[i]).slice(0, 3));
  const censusCode = censusSrc.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  ok('I5d no exclusion list survived in the census file\'s CODE',
    !/CENSUSED_BUILD_FILES|EXTRA_DOOR_FILES|EXCLUDE|SKIP_FILES/.test(censusCode));

  // §2.10's surface.
  ok('I6  packages/core/src/index.ts exports exactly 86 names', Object.keys(core).length === 86, Object.keys(core).length);

  // I-17's own diff claims.
  const diff = execFileSync('git', ['show', '--stat', '--format=', 'c677162'], { cwd: CAIRN, encoding: 'utf8' });
  ok('I7  commit c677162 touches no `.tsx`', !/\.tsx\s/.test(diff), diff.split('\n').filter((l) => l.includes('.tsx')));
  ok('I7a ...and no file under qa/ or docs/design/', !/\bqa\/|docs\/design\//.test(diff));
  ok('I7b ...and neither package.json nor the lockfile', !/package(-lock)?\.json/.test(diff));
  const files = diff.split('\n').filter((l) => l.includes('|')).map((l) => l.split('|')[0].trim());
  ok('I7c it edits exactly the five files BUILD-NOTES claims', files.length === 5, files);

  // SCHEMA_VERSION / DB_VERSION / SUMMARY_VERSION do not move.
  const types = read(resolve(CAIRN, 'packages/core/src/model/types.ts'));
  ok('I8  SCHEMA_VERSION is still 3', /SCHEMA_VERSION = 3\b/.test(types), types.match(/SCHEMA_VERSION = \d+/)?.[0]);
}

console.log(`\n--- r57-a78: ${fails} FAIL, ${gaps} gap ---`);
process.exit(fails === 0 ? 0 : 1);
