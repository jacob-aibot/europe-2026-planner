/**
 * `cli export` may not write outside `cairn/`.
 *
 * Sequencing rule 4 and `CLAUDE.md`: `europe-2026-itinerary.html`, `docs/` and `tickets/`
 * at the repo root are the live app on Jacob's phone. Cairn reads them and never writes
 * them. `cmdExport` used to be `writeFileSync(argv[1], text)` with no normalisation, so
 * `npm run cli -- export ../europe-2026-itinerary.html` overwrote the planner (F-16).
 *
 * This is an end-to-end test on purpose: it runs the real CLI in a child process, because
 * the property being protected is "this command cannot destroy that file", not "this
 * function returns false".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import * as core from '../packages/core/src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const REPO = resolve(CAIRN, '..');
const PLANNER = join(REPO, 'europe-2026-itinerary.html');

function cli(...args: string[]) {
  const r = spawnSync(process.execPath, [join(CAIRN, 'cli.ts'), ...args], {
    cwd: CAIRN,
    encoding: 'utf8',
    timeout: 120_000,
  });
  return { code: r.status, out: r.stdout ?? '', err: r.stderr ?? '' };
}

const ESCAPES = [
  '../europe-2026-itinerary.html',
  '../docs/BOOKINGS.md',
  '../tickets/anything.pdf',
  '/etc/passwd',
  '../../tmp/escape.json',
  'subdir/../../europe-2026-itinerary.html',
];

for (const target of ESCAPES) {
  test(`cli export refuses to write to ${target}`, () => {
    // Snapshot-and-restore: if this test ever fails it must not ALSO leave Jacob's live
    // planner destroyed. Restoring first, then asserting, is what makes the regression
    // loud instead of expensive. (It cost the file once while this test was being written.)
    const before = existsSync(PLANNER) ? readFileSync(PLANNER) : null;
    const r = cli('export', target);
    const after = existsSync(PLANNER) ? readFileSync(PLANNER) : null;
    let clobbered = false;
    if (before && after && !before.equals(after)) {
      writeFileSync(PLANNER, before);
      clobbered = true;
    }
    assert.equal(clobbered, false, 'THE LIVE PLANNER WAS MODIFIED (restored, but the guard is gone)');
    assert.notEqual(r.code, 0, `exit code was ${r.code}; the write was not refused`);
    assert.match(r.out + r.err, /refus|outside/i);
  });
}

test('cli export still writes a file inside cairn/', () => {
  const dir = mkdtempSync(join(CAIRN, 'export-test-'));
  try {
    const target = join(dir, 'trip.cairn.json');
    const r = cli('export', target);
    assert.equal(r.code, 0, r.err);
    assert.ok(existsSync(target), `nothing was written: ${r.out} ${r.err}`);
    assert.ok(statSync(target).size > 1000);
    assert.match(r.out, /wrote/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('cli export with no target still prints to stdout', () => {
  const r = cli('export');
  assert.match(r.out.slice(0, 60), /^\{\s*"schemaVersion": 5/);
});

test('the live planner is not writable through any cli command', () => {
  const before = readFileSync(PLANNER);
  for (const cmd of ['trip', 'conflicts', 'validate', 'import']) cli(cmd);
  assert.deepEqual(readFileSync(PLANNER), before);
});

// ---------------------------------------------------------------------------
// QA R2-5 — the guard was LEXICAL, and a symlink is not lexical.
// ---------------------------------------------------------------------------

test('cli export refuses a path that escapes cairn/ THROUGH A SYMLINK', () => {
  // `resolve()` normalises `..` and a leading `/`. It does not follow symlinks, so a link
  // planted inside `cairn/` passed the prefix test and `writeFileSync` then wrote through
  // it — the reviewer reproduced exactly this and the file outside `cairn/` was overwritten
  // with the trip JSON. `CLAUDE.md` calls the read-only boundary "the one rule that must
  // never drift"; a lexical guard on a symlinked path is drift waiting to happen.
  const outside = mkdtempSync(join(tmpdir(), 'cairn-escape-'));
  const victim = join(outside, 'victim.txt');
  writeFileSync(victim, 'DO NOT OVERWRITE ME');
  const link = join(CAIRN, 'qa', 'escape-link.json');
  rmSync(link, { force: true });
  symlinkSync(victim, link);
  try {
    const r = cli('export', 'qa/escape-link.json');
    assert.equal(readFileSync(victim, 'utf8'), 'DO NOT OVERWRITE ME',
      'THE FILE OUTSIDE cairn/ WAS OVERWRITTEN through a symlink');
    assert.notEqual(r.code, 0, `exit code was ${r.code}; the write was not refused`);
    // Specifically the BOUNDARY refusal, not the no-clobber one: the no-clobber guard added
    // in the same pass would also stop this write, and a test that cannot tell which guard
    // fired would keep passing with the symlink hole open.
    assert.match(r.out + r.err, /refusing to write outside/i,
      'refused, but for the wrong reason — the boundary guard is not what stopped it');
  } finally {
    rmSync(link, { force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('cli export refuses a path whose PARENT DIRECTORY is a symlink out of cairn/', () => {
  const outside = mkdtempSync(join(tmpdir(), 'cairn-escape-dir-'));
  const link = join(CAIRN, 'qa', 'escape-dir');
  rmSync(link, { force: true });
  symlinkSync(outside, link);
  try {
    const r = cli('export', 'qa/escape-dir/trip.json');
    assert.equal(existsSync(join(outside, 'trip.json')), false,
      'the CLI wrote into a directory outside cairn/ reached through a symlinked parent');
    assert.notEqual(r.code, 0, `exit code was ${r.code}`);
  } finally {
    rmSync(link, { force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// QA R2-5, second half — `export <existing file>` overwrote it silently, exit 0.
// ---------------------------------------------------------------------------

test('cli export refuses to clobber an existing file, and says so', () => {
  const dir = mkdtempSync(join(CAIRN, 'export-test-'));
  try {
    const target = join(dir, 'trip.cairn.json');
    writeFileSync(target, 'SOMETHING THE USER ALREADY HAD');
    const r = cli('export', target);
    assert.equal(readFileSync(target, 'utf8'), 'SOMETHING THE USER ALREADY HAD',
      'an existing file was overwritten with no prompt');
    assert.notEqual(r.code, 0, `exit code was ${r.code}; a silent clobber must not report success`);
    assert.match(r.out + r.err, /exists/i, 'the refusal does not say why');
    assert.match(r.out + r.err, /--force/, 'the refusal does not name the way through');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('cli export --force overwrites deliberately', () => {
  const dir = mkdtempSync(join(CAIRN, 'export-test-'));
  try {
    const target = join(dir, 'trip.cairn.json');
    writeFileSync(target, 'STALE');
    const r = cli('export', target, '--force');
    assert.equal(r.code, 0, r.err);
    assert.match(readFileSync(target, 'utf8').slice(0, 40), /^\{\s*"schemaVersion": 5/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--force still cannot write outside cairn/, through a symlink or otherwise', () => {
  const outside = mkdtempSync(join(tmpdir(), 'cairn-force-'));
  const victim = join(outside, 'victim.txt');
  writeFileSync(victim, 'SAFE');
  const link = join(CAIRN, 'qa', 'escape-link.json');
  rmSync(link, { force: true });
  symlinkSync(victim, link);
  try {
    for (const target of ['qa/escape-link.json', '../europe-2026-itinerary.html']) {
      const r = cli('export', target, '--force');
      assert.notEqual(r.code, 0, `--force wrote to ${target}`);
    }
    assert.equal(readFileSync(victim, 'utf8'), 'SAFE');
  } finally {
    rmSync(link, { force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

/**
 * ROADMAP Phase 2 I-1: `cli.ts trip` prints the trip's lifecycle stage, driven by the
 * existing `--today` flag. This is the first time the product can say a trip has ended —
 * the reference trip ran 2026-08-07 → 2026-08-22 and today is after that.
 */
test('cli trip prints the lifecycle stage, and --today drives it', () => {
  const cases: Array<[string, string]> = [
    ['2026-08-01', 'planned'],    // FIXTURE_TODAY, before the trip starts
    ['2026-08-07', 'active'],     // startDate
    ['2026-08-22', 'active'],     // endDate — inclusive
    ['2026-08-27', 'completed'],  // the day this increment was written
  ];
  for (const [today, stage] of cases) {
    const r = cli('trip', '--today', today);
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, new RegExp(`\\b${stage}\\b`), `--today ${today} did not report "${stage}":\n${r.out}`);
  }
});

test('cli trip with no --today still runs and reports a stage at FIXTURE_TODAY', () => {
  const r = cli('trip');
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /\bplanned\b/, r.out);
});

/**
 * `cli stats` — ROADMAP Phase 2 **I-7**. One trip is a thin exercise of a multi-trip function
 * (the multi-trip cases live in `packages/core/test/travelStats.test.ts`); what the command is
 * for is making the numbers addressable with no browser and no install.
 *
 * The two clocks are the whole demonstration of §8.4 **A-31 Part 3**: at the default
 * `FIXTURE_TODAY` the reference trip has not happened yet, so it is `planned` and contributes
 * nothing — a map of everywhere you have been may not include a trip you have booked.
 */
test('cli stats honours --today: the reference trip is planned before it starts', () => {
  const r = cli('stats', '--today', '2026-08-01');
  assert.equal(r.code ?? 0, 0, r.err);
  assert.match(r.out, /planned\s+1/i);
  assert.match(r.out, /days travelled\s+0\b/i);
  assert.equal(/\bAT\b/.test(r.out), false, `a planned trip put a country on the lifetime map:\n${r.out}`);
});

test('cli stats after the trip ends reports its countries, cities and days', () => {
  const r = cli('stats', '--today', '2026-08-24');
  assert.equal(r.code ?? 0, 0, r.err);
  assert.match(r.out, /completed\s+1/i);
  for (const code of ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US']) {
    assert.match(r.out, new RegExp(`\\b${code}\\b`), `${code} is missing:\n${r.out}`);
  }
  assert.match(r.out, /days travelled\s+16\b/i, r.out);
});

test('cli stats reports the honest hole as a count, never as a silence', () => {
  const r = cli('stats', '--today', '2026-08-24');
  // The reference trip has records the index cannot name (the Dalmatian coves, Hvar Town).
  // "N we could not place" is the sentence; "0 countries" would be a measurement never taken.
  assert.match(r.out, /could not place|unattributed/i, r.out);
});

/**
 * §8.4 **A-34** (QA R28-7). On 2026-08-14 the reference trip is `active`, so every country it
 * carries is contributed **un-clamped** by the day the traveller has reached — the CLI printed
 * `GB 2026-08-07 → 2026-08-14 (1 trip)` for a country the trip does not reach until the 20th, in
 * the same visual form as one actually visited. A plan rendered as an accomplished fact is the
 * root `CLAUDE.md` convention broken, and this is the first place a *derived statistic* did it.
 *
 * Both directions are asserted, because a marker with a test on one side only is a marker that
 * will be printed always or never.
 */
test('cli stats marks a country an active trip has not confirmed reaching', () => {
  const r = cli('stats', '--today', '2026-08-14');
  assert.equal(r.code ?? 0, 0, r.err);
  assert.match(r.out, /GB\s+2026-08-07 → 2026-08-14\s+\(1 trip\)\s+·\s+in progress/, r.out);
  assert.match(r.out, /countries\s+7\s+\(7 in progress\)/, r.out);
  assert.match(r.out, /cities\s+6\s+\(6 in progress\)/, r.out);
  // The legend prints once, and it is a caveat rather than a negation: "in progress", not
  // "not visited" — on day 8 of a 16-day trip most of these rows are true visits (A-34 Part 5).
  const legend = r.out.split('\n').filter((l) => /in progress — from a trip you are on/.test(l));
  assert.equal(legend.length, 1, `the legend printed ${legend.length} times:\n${r.out}`);
  // Marked, NOT hidden and not excluded from the counts — excluding them is the alternative
  // A-31 Part 5 residue 2 already refused.
  for (const code of ['AT', 'CZ', 'DE', 'GB', 'HR', 'HU', 'US']) {
    assert.match(r.out, new RegExp(`\\b${code}\\b`), `${code} was hidden rather than marked:\n${r.out}`);
  }
});

/**
 * §8.4 **A-60** — the rendered face of the fix, at the exact clock QA **R43-4** measured.
 *
 * Mid-trip, `stats --today 2026-08-12` printed `HU  Budapest  2026-08-12 → 2026-08-12` for a
 * city the traveller reaches on the 18th, beside `HU  2026-08-07 → 2026-08-12  (1 trip)` for
 * the same place — the country form coarse and true, the city form a **specific day**, and that
 * day the one in the whole window the traveller is provably elsewhere (they are in Split).
 * **The finer granularity is the more assertive claim, so it may not be the less honest one.**
 *
 * A ceiling, not a floor: no city line may be narrower than its own country's at the same
 * clock. And `cli.ts` re-derives nothing to know this — the statistic carries the honest
 * answer and the surface prints it (A-60 Part 3, A-34 Part 2).
 */
test('A-60: cli stats mid-trip prints no city range the clock erased, and keeps the ones it did not', () => {
  const r = cli('stats', '--today', '2026-08-12');
  assert.equal(r.code ?? 0, 0, r.err);
  // Unchanged — their own days intersect the row's clamp window [08-07, 08-12].
  assert.match(r.out, /AT\s+Vienna\s+2026-08-08 → 2026-08-10/, r.out);
  assert.match(r.out, /HR\s+Dubrovnik\s+2026-08-10 → 2026-08-12/, r.out);
  // Split's single day is its REAL arrival day. A rule that erased it would be throwing away
  // the precision A-56 bought, which is why this is asserted beside the three that change.
  assert.match(r.out, /HR\s+Split\s+2026-08-12 → 2026-08-12/, r.out);
  // Not yet reached — the trip's own range, matching their country lines exactly.
  for (const [code, name] of [['CZ', 'Prague'], ['HU', 'Budapest'], ['GB', 'London']]) {
    assert.match(r.out, new RegExp(`${code}\\s+${name}\\s+2026-08-07 → 2026-08-12`), r.out);
    assert.match(r.out, new RegExp(`^\\s+${code}\\s+2026-08-07 → 2026-08-12\\s`, 'm'), r.out);
  }
  // The finding's own shape, stated as an absence so a future regression is caught by name.
  const collapsed = r.out.split('\n').filter((l) => /(Budapest|London|Prague)\s+2026-08-12 → 2026-08-12/.test(l));
  assert.deepEqual(collapsed, [], `a clamp artefact is being printed as a visit:\n${r.out}`);
  // A-34's marker and legend are unchanged and still print beside them.
  assert.match(r.out, /·\s+in progress/, r.out);
  assert.match(r.out, /in progress — from a trip you are on/, r.out);
});

/**
 * §8.4 **A-56** Part 5, half 2 — **`centre` is in a row, and that is not a licence to print
 * it.** `TripSummaryCity` gained `centre: LatLng` at `SUMMARY_VERSION` 5, so clause 3's
 * standing *"no coordinate in any log line"* rule now has a field that could violate it. The
 * check is the one §6.1 cross-cutting rule 1 already licenses: grep this command's own output
 * for a coordinate-shaped float pair.
 *
 * `travelStats` never reads `centre` and `cmdStats` never touches a row's `cities[]` directly,
 * so this is a ceiling on both at once — and it is deliberately a grep over the *rendered*
 * bytes rather than an assertion about which function was called.
 */
test('A-56 Part 5: cli stats prints city DATES and no coordinate of any kind', () => {
  const r = cli('stats', '--today', '2026-08-24');
  assert.equal(r.code ?? 0, 0, r.err);
  // The dates are there — this is what I-12 makes visible on the CLI today.
  assert.match(r.out, /AT\s+Vienna\s+2026-08-08 → 2026-08-10/, r.out);
  assert.match(r.out, /HR\s+Dubrovnik\s+2026-08-10 → 2026-08-12/, r.out);
  // …and no coordinate. A decimal number at all is enough to fail here: `stats` prints
  // integers, ISO dates and country codes, and `centre.lat` is the only decimal anywhere near
  // this path.
  const decimals = r.out.match(/-?\d+\.\d+/g) ?? [];
  assert.deepEqual(decimals, [], `a coordinate-shaped float reached the CLI:\n${r.out}`);
  // The pair form, stated separately so the reason survives a future formatting change.
  assert.equal(
    /-?\d+\.\d+\s*[,\s]\s*-?\d+\.\d+/.test(r.out),
    false,
    `a coordinate PAIR reached the CLI:\n${r.out}`,
  );
});

/**
 * §8.4 **A-56** Part 5, half 1 — **the goldens stay coordinate-free.** `countries.json` and
 * `travel-stats.json` both carry *"NO COORDINATES: ids and names only"* in their own header and
 * that discipline is kept, not excepted; the *"every number is an integer"* walk that enforces
 * it for those two lives in `packages/core/test/country.test.ts` and `travelStats.test.ts` and
 * is unchanged. What A-56 adds is a field that could violate it, so this is the field-shaped
 * half: no golden carries a `centre` at all.
 *
 * `centre`'s correctness is asserted somewhere strictly stronger —
 * `packages/core/test/summary.test.ts` compares it to `orderedCities(trip)[i].centre`, an
 * equality against the source, which catches a wrong coordinate a transcribed literal never
 * could.
 */
/**
 * **Narrowed at Phase 2 I-21 (§8.4 A-82 Part 10), and the narrowing is the smallest one that keeps
 * the guard's whole subject.** This scan's subject is *the live planner's own records*: A-56 Part 5
 * and §6.6 forbid a coordinate of Jacob's trip reaching a committed file, and `country-holes.json`
 * carries `NO COORDINATES: ids and names only` for exactly that reason. A-82 Part 10 rules, in
 * writing and pre-emptively, that the line **does not transfer** to the two gazetteer goldens:
 * *"These two fixtures' subject is a public-domain dataset that is already committed in full…
 * §6.1 governs observed location — a fix stream, a library index — and a city centre from Natural
 * Earth is neither."* `gazetteer-probes.json` publishes `centre` because A-82 Part 10 specifies its
 * rows as `{id, name, countryCode, admin1, centre}`, so a shifted coordinate shows up as a diff.
 *
 * The scan therefore still runs over **every** golden, including any golden added tomorrow, and the
 * exemption is an explicit two-name list that is itself asserted — a third name cannot be added to
 * it without failing this test. **Editing this test was outside ROADMAP I-21's file fence and is
 * disclosed as KD-114 rather than treated as a routine edit.**
 */
const GAZETTEER_GOLDENS = ['gazetteer-probes.json', 'gazetteer-disagreements.json'];

test('A-56 Part 5: `centre` reached no committed golden, and travel-stats.json carries the city DATES', () => {
  const dir = join(CAIRN, 'fixtures', 'golden');
  const names = readdirSync(dir).filter((n) => n.endsWith('.json'));
  assert.ok(names.length >= 10, `INCONCLUSIVE: only ${names.length} goldens were scanned`);
  // The exemption list is closed: every name on it must exist, and nothing may be added silently.
  assert.deepEqual(
    GAZETTEER_GOLDENS.filter((n) => names.includes(n)).sort(),
    [...GAZETTEER_GOLDENS].sort(),
    'the A-82 Part 10 exemption names a golden that does not exist',
  );
  const offenders: string[] = [];
  for (const name of names) {
    if (GAZETTEER_GOLDENS.includes(name)) continue;
    const text = readFileSync(join(dir, name), 'utf8');
    if (/"centre"/.test(text)) offenders.push(name);
  }
  assert.deepEqual(offenders, [], `\`centre\` reached a golden: ${offenders.join(', ')}`);
  // …and the scan is running over a file this increment actually changed, so it is not green
  // because nothing moved. `travel-stats.json` gained `firstVisit`/`lastVisit` per city — dates,
  // which are not coordinates, and which the "NO COORDINATES" header does not forbid.
  const stats = readFileSync(join(dir, 'travel-stats.json'), 'utf8');
  assert.match(stats, /"firstVisit": "2026-08-08"/, 'travel-stats.json has no city dates in it');
  assert.match(stats, /"summaryVersion": 8/, 'travel-stats.json was not regenerated at SUMMARY_VERSION 8');
});

test('cli stats prints no marker and no legend when the trip is over', () => {
  const r = cli('stats', '--today', '2026-08-24');
  assert.equal(r.code ?? 0, 0, r.err);
  assert.equal(/in progress/.test(r.out), false, `a completed trip was marked provisional:\n${r.out}`);
  assert.match(r.out, /countries\s+7\s*$/m, r.out);
});

/**
 * QA **R28-9**. `stats --today bogus` exited on a raw `Error: invalid IsoDate` stack trace, and
 * `conflicts --today bogus` did the opposite — it accepted the garbage and printed
 * `(today = bogus)` with exit 0. One check, every command that reads `today`.
 */
for (const cmd of ['stats', 'conflicts', 'trip']) {
  test(`cli ${cmd} --today refuses garbage with a message, not a stack trace`, () => {
    for (const bad of ['bogus', '', '20260814', '2026-8-7', 'tomorrow', '2026-08-07T00:00:00Z']) {
      const r = cli(cmd, '--today', bad);
      assert.notEqual(r.code, 0, `"${bad}" was accepted by ${cmd} (exit ${r.code}):\n${r.out}`);
      assert.match(r.out, /--today must be a real calendar date in YYYY-MM-DD/, r.out);
      assert.equal(/at .*cli\.ts:\d+/.test(r.out + r.err), false, `a stack trace reached the user:\n${r.err}`);
      assert.equal(/invalid IsoDate/.test(r.err), false, `the raw core error reached stderr:\n${r.err}`);
      assert.equal(new RegExp(`today = ${bad}`).test(r.out), false, `the garbage was echoed as fact:\n${r.out}`);
    }
  });
}

/**
 * **§2.9 A-47 Part 6 (QA R35-4), revision 32 — this test is re-pointed at the refusal.**
 *
 * It used to assert the opposite: that a **shape-valid, calendar-invalid** `--today` was
 * ACCEPTED and rolled over, on the ground that `isIsoDate` was off §2.10's surface and a
 * stricter rule reached for locally would be A-32 Part 5's second definition of the domain.
 * **A-46 Part 2 put `isIsoDate` on the surface (76 → 77) and A-47 ruled the refusal**: what
 * shipped was `stats --today 2026-13-45` printing *"travel statistics as of 2026-13-45"* over
 * numbers computed for 2027-02-14, which is the same *confident, plausible, false* shape R34-4
 * was, one surface over. The label and the numbers now describe the same day or the command
 * refuses.
 */
test('R35-4 / A-47 Part 6: cli refuses a calendar-invalid --today with exit 2, rather than echoing it', () => {
  for (const bad of ['2026-13-45', '2026-02-30', '2026-00-10', '2026-01-32', '0000-00-00']) {
    for (const cmd of ['stats', 'conflicts', 'trip']) {
      const r = cli(cmd, '--today', bad);
      assert.equal(r.code, 2, `${cmd} --today ${bad} exited ${r.code}, not 2:\n${r.out}`);
      assert.match(r.out, new RegExp(`--today must be a real calendar date in YYYY-MM-DD, got "${bad}"`), r.out);
      assert.equal(r.out.includes('as of'), false, `statistics were printed anyway:\n${r.out}`);
      assert.equal(/at .*cli\.ts:\d+/.test(r.out + r.err), false, `a stack trace reached the user:\n${r.err}`);
    }
  }
});

test('A-47 Part 6: real calendar dates still work, including the one the old behaviour rolled to', () => {
  for (const good of ['2027-02-14', '2026-02-28', '2024-02-29', '2026-08-24']) {
    const r = cli('stats', '--today', good);
    assert.equal(r.code ?? 0, 0, `${good} was refused:\n${r.out}${r.err}`);
    assert.match(r.out, new RegExp(`travel statistics as of ${good}\\b`), r.out);
  }
});

/**
 * **The containment the replaced guard depends on, asserted rather than assumed** (A-47 Part 6).
 * `isIsoDate` replaces a `try { core.weekdayOf(today) }`, which is only sound if `isIsoDate`
 * strictly contains it — i.e. nothing `isIsoDate` accepts can still make `weekdayOf` throw. The
 * interesting inputs are `IsoDate`'s own domain boundaries (§2.1 A-32).
 */
test('A-47 Part 6: core.weekdayOf does not throw at IsoDate’s boundaries — the replacement is sound', () => {
  for (const edge of ['0000-01-01', '9999-12-31', '0000-02-29', '2026-08-07']) {
    assert.equal(core.isIsoDate(edge), true, `${edge} is not in isIsoDate's domain`);
    assert.doesNotThrow(() => core.weekdayOf(edge as core.IsoDate), `weekdayOf threw at ${edge}`);
  }
});

/**
 * `cli photos <file>` — ROADMAP **I-13**'s only user-visible outcome.
 *
 * *"`cli.ts photos <file>` reports what a JPEG's metadata actually says, which is the fastest way
 * to see A-58's central fact for yourself on your own photos."* That fact is that an iPhone photo
 * picked through a Safari file input arrives with no EXIF at all, and it is worth being able to
 * check against a real file rather than taking it from a ruling.
 *
 * **P13**, on this surface: §10.5's cross-cutting rule is *"no coordinate in any log line, ever"*,
 * and this command is the one place in the repo where a `PhotoAsset.at`-shaped value could reach
 * stdout. It is the same assertion `A-56 Part 5` imposes on `TripSummaryCity.centre` — a grep of
 * the command's own rendered bytes for a coordinate-shaped float — reused rather than reinvented.
 */
const PHOTO_FIXTURES = join(CAIRN, 'fixtures', 'photo');

test('cli photos reports the date, the container and whether a location is present', () => {
  const r = cli('photos', join(PHOTO_FIXTURES, 'jpeg-exif-gps.jpg'));
  assert.equal(r.code ?? 0, 0, r.err);
  assert.match(r.out, /jpeg-exif-gps\.jpg/, r.out);
  assert.match(r.out, /2024-05-11 08:14/, r.out);
  assert.match(r.out, /4032\s*×\s*3024/, r.out);
  // Present, and NOT printed — the sentence says a location is there, never where.
  assert.match(r.out, /location\s+present/i, r.out);
});

test('cli photos says so honestly when a file carries no EXIF, and when it is a HEIC', () => {
  const none = cli('photos', join(PHOTO_FIXTURES, 'jpeg-noexif.jpg'));
  assert.equal(none.code ?? 0, 0, none.err);
  assert.match(none.out, /no_exif/, none.out);
  assert.match(none.out, /location\s+none/i, none.out);

  const heic = cli('photos', join(PHOTO_FIXTURES, 'heic-ftyp.heic'));
  assert.equal(heic.code ?? 0, 0, heic.err);
  assert.match(heic.out, /unsupported_container/, heic.out);
  // A-58 Part 2's central fact, said on the surface rather than only in a ruling.
  assert.match(heic.out, /iOS|Safari|file input/i, heic.out);
});

test('cli photos accepts several files at once and never throws on a non-image', () => {
  const r = cli(
    'photos',
    join(PHOTO_FIXTURES, 'jpeg-truncated-app1.jpg'),
    join(PHOTO_FIXTURES, 'png-header.png'),
    join(PHOTO_FIXTURES, 'not-an-image.bin'),
  );
  assert.equal(r.code ?? 0, 0, r.err);
  assert.match(r.out, /truncated/, r.out);
  assert.equal(r.out.split('\n').filter((l) => /\.(jpg|png|bin)/.test(l)).length >= 3, true, r.out);
});

test('cli photos refuses a path outside cairn/, with no read attempted', () => {
  const r = cli('photos', '../europe-2026-itinerary.html');
  assert.notEqual(r.code, 0, `the CLI read outside cairn/:\n${r.out}`);
  assert.match(r.out, /refus/i, r.out);
});

test('P13: cli photos prints no coordinate of any kind', () => {
  const r = cli('photos', ...readdirSync(PHOTO_FIXTURES).map((n) => join(PHOTO_FIXTURES, n)));
  assert.equal(r.code ?? 0, 0, r.err);
  assert.ok(r.out.length > 200, `INCONCLUSIVE: only ${r.out.length} bytes of output`);
  // The same rule and the same shape as A-56 Part 5's `centre` check: `photos` prints names,
  // integers, ISO dates, `HH:MM` and reason words, and a decimal could only be a coordinate.
  const decimals = r.out.match(/-?\d+\.\d+/g) ?? [];
  assert.deepEqual(decimals, [], `a coordinate-shaped float reached the CLI:\n${r.out}`);
  assert.equal(
    /-?\d+\.\d+\s*[,\s]\s*-?\d+\.\d+/.test(r.out),
    false,
    `a coordinate PAIR reached the CLI:\n${r.out}`,
  );
});

// ---------------------------------------------------------------------------------------------
// `cli.ts cities` — Phase 2 I-21, ARCHITECTURE §8.4 **A-82** Part 2 reason 4.
//
// This command exists so a tester can exercise the whole gazetteer **with no browser, no device
// and no UI**. It is the P1 caller that makes `searchGazetteer` a §2.10 surface symbol.
// ---------------------------------------------------------------------------------------------

test('I-21: `cli cities zurich` returns Zürich, in Switzerland, with a coordinate', () => {
  const r = cli('cities', 'zurich');
  assert.equal(r.code ?? 0, 0, r.err);
  assert.match(r.out, /Zürich/);
  assert.match(r.out, /Switzerland/);
  // `label · lat,lng · countryCode`
  assert.match(r.out, /Zürich, Switzerland · 47\.\d+,8\.\d+ · CH/);
});

test('I-21: `cli cities london` returns three Londons in three countries, largest first', () => {
  const r = cli('cities', 'london');
  const lines = r.out.trim().split('\n').filter((l) => l.startsWith('London,'));
  assert.ok(lines.length >= 3, `only ${lines.length} London lines:\n${r.out}`);
  assert.match(lines[0], /United Kingdom/);
  assert.match(lines[1], /Canada/);
  assert.match(lines[2], /United States/);
});

test('I-21: a query with no match says so explicitly rather than exiting 0 with no output', () => {
  const r = cli('cities', 'hallstatt');
  assert.match(r.out, /^no match: hallstatt$/m, `expected an explicit miss line, got:\n${r.out}`);
});

test('I-21: `cli cities` with no query refuses rather than dumping the dataset', () => {
  const r = cli('cities');
  assert.notEqual(r.code, 0);
  assert.match(r.out + r.err, /usage/i);
});

test('I-22: --limit truncates, and a DISAGREEING border town is there and is MARKED', () => {
  assert.equal(cli('cities', 'london', '--limit', '1').out.trim().split('\n').length, 1);
  // **§8.4 A-83 Part 8 inverts this assertion and that is the increment.** A-82 Part 5 refused
  // Maastricht at generation time and this test asserted `no match`; the invariant is restated —
  // *no shipped row may SILENTLY contradict the index* — so the row ships carrying the
  // disagreement, and the CLI line says so. A tester sees the whole of I-22 in one command.
  const maastricht = cli('cities', 'maastricht').out;
  assert.match(maastricht, /^Maastricht, Limburg, Netherlands · /m);
  assert.match(maastricht, /our country index disagrees/);
});

/**
 * **ROADMAP I-22's product proof, and it is one command.** `node cli.ts cities geneva` answered
 * `no match: geneva` for the second city of Switzerland; A-83 Part 8 is why it does not any more.
 * The three names are the ruling's own measured cost of A-82 Part 5's remedy — a national capital,
 * a city of 1.24 M, and a second national capital.
 */
test('I-22: `cli cities` finds Geneva, Jerusalem and Brazzaville, each marked as a disagreement', () => {
  for (const [query, expect] of [
    ['geneva', /^Geneva, Genève, Switzerland · /m],
    ['jerusalem', /^Jerusalem, Israel · /m],
    ['brazzaville', /^Brazzaville, Pool, Congo \(Brazzaville\) · /m],
  ] as const) {
    const out = cli('cities', query).out;
    assert.match(out, expect, `\`cli cities ${query}\` does not find it`);
    assert.match(out, /our country index disagrees/, `\`cli cities ${query}\` does not mark the disagreement`);
  }
  // The control: a row the index AGREES with carries no marker, so the marker means something.
  const vienna = cli('cities', 'vienna', '--limit', '1').out;
  assert.match(vienna, /^Vienna, Wien, Austria · /m);
  assert.equal(/disagrees/.test(vienna), false, 'every line carries the marker, so the marker says nothing');
});

/**
 * **ROADMAP I-25 Part 1 — §8.4 A-86 Part 4 item 1 (QA R63-9): the absorption is visible on the
 * one surface that exists today.**
 *
 * `unreadableCityLists` is printed by `cli.ts stats` on the **existing conditional idiom** —
 * the one `unnamedCities` and `unreadableCityDates` already use — so a library that quietly
 * lost a trip's cities says so with no `.tsx` and no wait on the unresolved visual direction.
 *
 * **The positive arm is not reachable through the shipped command, and this is how it is run
 * anyway.** `cmdStats` mints its library from one document (the reference trip, or `--file`),
 * and `tripSummary` always produces a real `cities` array — so no invocation of `cairn stats`
 * can produce a non-zero count. That has been true of `unnamedCities`' line since I-7 and of
 * `unreadableCityDates`' since I-12a; `qa/r44-a59.mjs` recorded it as unreachable and asserted
 * the silent arm only. Here the **shipped line's own source text** is lifted out of `cli.ts`
 * and executed against both a zero and a non-zero `TravelStats`, so the printed sentence, the
 * conditional and the field name are all the ones that ship. The end-to-end run below is the
 * silent arm, unchanged in kind.
 */
const STATS_LINES = () => {
  const src = readFileSync(join(CAIRN, 'cli.ts'), 'utf8');
  return [...src.matchAll(/^\s*if \(s\.(\w+)\) out\((`[^`]*`)\);$/gm)].map((m) => ({
    field: m[1],
    body: `if (s.${m[1]}) out(${m[2]});`,
  }));
};

test('I-25 Part 1 (A-86 Part 4 item 1): `cli.ts stats` prints the absorbed-row count on the existing conditional idiom', () => {
  const lines = STATS_LINES();
  assert.deepEqual(
    lines.map((l) => l.field),
    ['unnamedCities', 'unreadableCityDates', 'unreadableCityLists'],
    'the three conditional count lines are no longer the same idiom, in the same place',
  );
  const line = lines.find((l) => l.field === 'unreadableCityLists');
  assert.ok(line, 'cli.ts stats does not print `unreadableCityLists` at all');
  // The shipped text, executed. Not a copy of it.
  const run = new Function('s', 'out', line.body) as (s: unknown, out: (t: string) => void) => void;
  const printed: string[] = [];
  run({ unreadableCityLists: 1 }, (t) => printed.push(t));
  assert.deepEqual(printed, ['  trips whose stored city list could not be read: 1']);
  printed.length = 0;
  run({ unreadableCityLists: 0 }, (t) => printed.push(t));
  assert.deepEqual(printed, [], 'the line printed at zero — the conditional idiom was dropped');
});

test('I-25 Part 1: over the reference library `cli stats` prints no such line at all', () => {
  const r = cli('stats', '--today', '2026-08-24');
  assert.equal(r.code ?? 0, 0, r.err);
  assert.equal(/stored city list/.test(r.out), false, r.out);
  // …and the two lines beside it stay silent too, which is what makes the assertion above a
  // statement about a clean library rather than about a regex that matches nothing.
  assert.equal(/no usable name|unreadable stored dates/.test(r.out), false, r.out);
});

/**
 * **QA R64-4 (MINOR) — the pairing above passes while the shipped line rots.**
 *
 * Mutant **M1** (`qa/r64-mutants.sh`) puts an early `return;` above the three conditional count
 * lines, making all three **unreachable**, and both tests above stay green: the source-lifted arm
 * proves the sentence and the conditional by executing ONE line out of context, and the
 * end-to-end arm asserts only an **absence**, which a line that never runs satisfies perfectly.
 * Neither can see that the line is dead.
 *
 * So this arm executes the **whole of `cmdStats`' shipped body** — lifted out of `cli.ts`, not
 * copied — with a `core` whose `tripSummary` hands back a corrupt row, and asserts a
 * **presence**. The count is `travelStats`' real one over a real `TripSummaryRow` whose stored
 * `cities` is a string, which is the shape the shipped command cannot mint for itself (`cmdStats`
 * builds its library from `tripSummary`, which always produces a real array — that is why the
 * positive arm is unreachable end to end and why the body is run this way instead).
 *
 * A dead line prints nothing, so M1 reddens here. So do M2 (the whole body returns), M3 (the
 * sentence changed) and M4 (the wrong field read).
 */
function cmdStatsBody(): string {
  const src = readFileSync(join(CAIRN, 'cli.ts'), 'utf8');
  const start = src.indexOf('function cmdStats() {');
  assert.notEqual(start, -1, '`cli.ts` no longer declares `function cmdStats()`');
  const open = src.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  assert.notEqual(end, -1, '`cmdStats` has no matching closing brace');
  const body = src.slice(open + 1, end);
  // The brace walk is naive about braces inside strings, so it says what it thinks it found:
  // an imbalance shows up here rather than as a confusing syntax error two steps later.
  //
  // **§8.4 A-87 Part 4 (ROADMAP I-26) moved the last statement**: below the three conditional
  // sentences there is now one data-driven loop over `absorbed`, so the sentinel is its two
  // closing lines rather than the third `if`. The `${…}` interpolations inside the template
  // literal are brace-balanced, so the walk itself is unaffected.
  const tail = body.trimEnd().split('\n');
  assert.match(tail.at(-2) ?? '', /out\(`\s*trip \$\{rowId\}: unreadable stored values at /,
    'the lifted body does not end at the line it is supposed to end at — the brace walk slipped');
  assert.match(tail.at(-1) ?? '', /^\s*\}$/,
    'the lifted body does not end at the line it is supposed to end at — the brace walk slipped');
  return body;
}

test('I-25 Part 1 (QA R64-4): the shipped `cmdStats` body PRINTS the line — an unreachable line is caught', async () => {
  // A real row, corrupted the one way `unreadableCityLists` counts: `cities` present, not an array.
  const travelled = core.createTrip(
    { title: 'Vienna', startDate: '2019-04-01', endDate: '2019-04-09', cities: [{ name: 'Vienna' }] },
    { ids: core.sequentialIds('r64-4-'), now: '2019-04-01' },
  );
  const corrupt = { ...core.tripSummary(travelled, core.COUNTRY_INDEX), cities: 'AT,HR,CZ' };
  const stubCore = {
    COUNTRY_INDEX: core.COUNTRY_INDEX,
    tripSummary: () => corrupt,
    travelStats: core.travelStats,
  };
  const printed: string[] = [];
  const dir = mkdtempSync(join(CAIRN, 'cmdstats-lift-'));
  try {
    // `cairn/` is `"type": "module"`, so a `.ts` file written here is stripped and loaded as ESM
    // — the same type-stripping run that executes this test file. The body's own annotations
    // therefore need no handling, and the shipped text is executed verbatim.
    const file = join(dir, 'lifted-cmd-stats.ts');
    writeFileSync(file, `export function cmdStats(core, trip, today, todayIsValid, out) {\n${cmdStatsBody()}\n}\n`);
    const mod = await import(pathToFileURL(file).href) as {
      cmdStats: (
        c: unknown, t: unknown, today: string, valid: () => boolean, out: (s: string) => void,
      ) => void;
    };
    mod.cmdStats(stubCore, travelled, '2026-06-15', () => true, (s) => printed.push(s));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.ok(
    printed.includes('  trips whose stored city list could not be read: 1'),
    'the shipped line did not print when the count was 1 — it is unreachable, renamed or rewritten:\n' +
      printed.join('\n'),
  );
  // The control: the same body over a clean library prints no such line, so the assertion above
  // is about the count and not about a line that prints unconditionally.
  const clean: string[] = [];
  const dir2 = mkdtempSync(join(CAIRN, 'cmdstats-lift-'));
  try {
    const file2 = join(dir2, 'lifted-cmd-stats.ts');
    writeFileSync(file2, `export function cmdStats(core, trip, today, todayIsValid, out) {\n${cmdStatsBody()}\n}\n`);
    const mod2 = await import(pathToFileURL(file2).href) as {
      cmdStats: (
        c: unknown, t: unknown, today: string, valid: () => boolean, out: (s: string) => void,
      ) => void;
    };
    mod2.cmdStats(core, travelled, '2026-06-15', () => true, (s) => clean.push(s));
  } finally {
    rmSync(dir2, { recursive: true, force: true });
  }
  assert.equal(clean.some((l) => /stored city list/.test(l)), false, clean.join('\n'));
  // …and it printed SOMETHING, so "no such line" is a statement about a working command.
  assert.ok(clean.some((l) => /^travel statistics as of /.test(l)), clean.join('\n'));
});

/**
 * **ROADMAP I-26 Part 4 — §8.4 A-87 Part 4: the per-row line, and A-87 Part 8 item 4 is why it
 * has two arms.**
 *
 * *A criterion that pins a shipped line pins its EXECUTION, not its text — every source-lift
 * assertion is paired with an end-to-end arm asserting a PRESENCE in the output.* This block is
 * written to satisfy that by construction: it prints for a library that carries an absorption, so
 * the presence arm exists, and R64-4's mutant M1 (an early `return` above the block) reddens it
 * rather than sailing past an absence check.
 *
 * The block is **data-driven** — one line per row holding absorptions, printed by a loop over
 * `absorbed` — so a new gate adds a row to the channel and cannot be added and forgotten on the
 * one surface that exists. That is the whole reason it is a loop and not a fourth `if`.
 */
test('I-26 Part 4 (A-87 Part 4): the shipped `cmdStats` body PRINTS the per-row absorbed line, with the id and the path', async () => {
  const travelled = core.createTrip(
    { title: 'Vienna', startDate: '2019-04-01', endDate: '2019-04-09', cities: [{ name: 'Vienna' }] },
    { ids: core.sequentialIds('i26-'), now: '2019-04-01' },
  );
  const base = core.tripSummary(travelled, core.COUNTRY_INDEX);
  // Two absorptions on ONE row, at two different paths: the line has to name both, which is what
  // separates a loop over `absorbed` from a fourth conditional sentence.
  const corrupt = {
    ...base,
    cities: [{ ...base.cities[0], name: 42 }],
    countryCodes: 'AT',
  };
  const stubCore = {
    COUNTRY_INDEX: core.COUNTRY_INDEX,
    tripSummary: () => corrupt,
    travelStats: core.travelStats,
  };
  const printed: string[] = [];
  const dir = mkdtempSync(join(CAIRN, 'cmdstats-lift-'));
  try {
    const file = join(dir, 'lifted-cmd-stats.ts');
    writeFileSync(file, `export function cmdStats(core, trip, today, todayIsValid, out) {\n${cmdStatsBody()}\n}\n`);
    const mod = await import(pathToFileURL(file).href) as {
      cmdStats: (
        c: unknown, t: unknown, today: string, valid: () => boolean, out: (s: string) => void,
      ) => void;
    };
    mod.cmdStats(stubCore, travelled, '2026-06-15', () => true, (s) => printed.push(s));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.ok(
    printed.includes(`  trip ${corrupt.id}: unreadable stored values at cities[0].name, countryCodes`),
    'the shipped per-row line did not print — it is unreachable, renamed or rewritten:\n' + printed.join('\n'),
  );
  // The two existing sentences are untouched by the new block: neither fires here, because
  // neither of these two faults is a `cities` list or a city date.
  assert.equal(printed.some((l) => /stored city list|unreadable stored dates/.test(l)), false, printed.join('\n'));
  // …and `unnamedCities`' sentence DOES fire, because an unreadable `name` behaves exactly as a
  // name folding to `''` (A-87 Part 3 rule 3) and the line is already true for it as written.
  assert.ok(printed.includes('  cities with no usable name: 1'), printed.join('\n'));
});

test('I-26 Part 4: over the reference library `cli stats` prints no absorbed line at all', () => {
  const r = cli('stats', '--today', '2026-08-24');
  assert.equal(r.code ?? 0, 0, r.err);
  assert.equal(/unreadable stored values/.test(r.out), false, r.out);
  // …over a command that printed something, so "no such line" is about a clean library.
  assert.match(r.out, /^travel statistics as of 2026-08-24/m);
});

/**
 * **N6 — §8.4 A-88 Part 9 (QA R65-6).** A-87 Part 10 residue 1's own trigger — *"the first
 * surface that renders the list rather than a count caps its own display and says it is
 * capping"* — **fired inside `I-26`**, on the surface `I-26` added, and nothing capped: a row
 * with 200 absorptions printed one line of **3,529 characters**. The residue is discharged here
 * rather than deferred a second time.
 *
 * **Five** because the line exists to name the row and give a repair a starting point, not to
 * enumerate storage.
 *
 * **Injected:** remove the cap and this reddens twice — on the length, and on the absence of
 * *"…and N more"*. The presence arm of A-87 Part 8 item 4 is unaffected: the block still prints
 * for a library that carries an absorption, so an early `return` above it still reddens the
 * I-26 test above rather than sailing past an absence check.
 */
test('I-28 (A-88 Part 9, R65-6): the per-row absorbed line CAPS its path list and says it is capping', async () => {
  const travelled = core.createTrip(
    { title: 'Vienna', startDate: '2019-04-01', endDate: '2019-04-09', cities: [{ name: 'Vienna' }] },
    { ids: core.sequentialIds('i28-'), now: '2019-04-01' },
  );
  const base = core.tripSummary(travelled, core.COUNTRY_INDEX);
  const cities = Array.from({ length: 200 }, (_, i) => ({ ...base.cities[0], key: `c-${i}`, name: i }));
  const corrupt = { ...base, id: 'r', cities };
  const stubCore = {
    COUNTRY_INDEX: core.COUNTRY_INDEX,
    tripSummary: () => corrupt,
    travelStats: core.travelStats,
  };
  // The library really does carry 200 absorptions on one row — otherwise the cap proves nothing.
  assert.equal(core.travelStats([corrupt as never], '2026-06-15' as never).absorbed.length, 200);

  const printed: string[] = [];
  const dir = mkdtempSync(join(CAIRN, 'cmdstats-cap-'));
  try {
    const file = join(dir, 'lifted-cmd-stats.ts');
    writeFileSync(file, `export function cmdStats(core, trip, today, todayIsValid, out) {\n${cmdStatsBody()}\n}\n`);
    const mod = await import(pathToFileURL(file).href) as {
      cmdStats: (
        c: unknown, t: unknown, today: string, valid: () => boolean, out: (s: string) => void,
      ) => void;
    };
    mod.cmdStats(stubCore, travelled, '2026-06-15', () => true, (s) => printed.push(s));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const lines = printed.filter((l) => l.includes('unreadable stored values'));
  assert.equal(lines.length, 1, 'one line per row holding absorptions:\n' + printed.join('\n'));
  const line = lines[0];
  assert.ok(line.length < 200, `the line is ${line.length} characters — it renders the whole list:\n${line}`);
  assert.match(line, /…and 195 more$/, `the line does not say it is capping:\n${line}`);
  assert.match(line, /^ {2}trip r: unreadable stored values at cities\[0]\.name, cities\[1]\.name, cities\[2]\.name, cities\[3]\.name, cities\[4]\.name …and 195 more$/);
});
