/**
 * Cairn CLI — reports on a real trip with no browser and no install.
 *
 *   node cli.ts trip                 headline counts and the city ranges
 *   node cli.ts ask "<question>"     one question about this trip, answered from the document
 *   node cli.ts ask --menu           every question it can answer (§11)
 *   node cli.ts day 2026-08-13       one day: stops, legs, costs, badges
 *   node cli.ts conflicts [--all]    the conflicts panel, as text
 *   node cli.ts cost                 per-day and whole-trip roll-ups
 *   node cli.ts validate             validateTrip issues
 *   node cli.ts stats                lifetime travel statistics, derived (§8.4 A-31)
 *   node cli.ts cities "<query>" [--limit N]
 *                                    search the bundled offline city gazetteer (§8.4 A-83)
 *   node cli.ts photos a.jpg …       what each file's EXIF block actually says (§10.2, A-58)
 *   node cli.ts import               the legacy import report
 *   node cli.ts export [file] [--force]
 *                                    the trip as JSON on stdout, or to a NEW file inside
 *                                    cairn/. Refuses to overwrite without --force.
 *
 * With no `--file`, it loads the Europe 2026 fixture by reading the live planner
 * READ-ONLY. `--file trip.json` reads a Cairn document instead.
 */
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as core from './packages/core/src/index.ts';
import { loadEurope2026, FIXTURE_TODAY } from './fixtures/loadEurope2026.mjs';

const argv = process.argv.slice(2);
const cmd = argv[0] ?? 'trip';
const flag = (name: string): string | null => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? '') : null;
};
const has = (name: string) => argv.includes(`--${name}`);

const file = flag('file');
const today = flag('today') ?? FIXTURE_TODAY;

/**
 * QA **R28-9**. `--today` reached `dayNumber` unchecked, so `stats --today bogus` exited on a raw
 * `Error: invalid IsoDate` **stack trace** — and its sibling `conflicts --today bogus` did the
 * opposite: it printed `(today = bogus)` and exit 0, because `detectConflicts` never parses the
 * date on the path a one-trip fixture takes. Two opposite bugs from one missing check, so the
 * check is one function and every command that reads `today` calls it. Refusal is this CLI's
 * house style for bad input — one line, no stack, a non-zero exit (see `cmdExport`'s two).
 *
 * **The check is core's own, reached through `weekdayOf`, and not a regex of its own.** §2.1
 * **A-32** Part 5: there is one definition of `IsoDate`'s shape and a caller refuses against
 * *that*. `weekdayOf` is the narrowest thing on §2.10's surface whose only precondition is
 * `parseIsoDate` (BUILD-NOTES **KD-66**; ROADMAP criterion E ceiling (1) forbids this file
 * reaching past the index).
 *
 * **§2.9 A-47 Part 6 (QA R35-4), revision 32: it now refuses a calendar-invalid date too, and
 * the `weekdayOf` try/catch is REPLACED rather than stacked.** `node cli.ts stats --today
 * 2026-13-45` used to print *"travel statistics as of 2026-13-45"* over statistics computed for
 * **2027-02-14** — the header names a string and the numbers answer for a date up to 14 months
 * away. This file's earlier comment left the question open on the ground that a stricter rule
 * reached for locally would be the second, narrower definition of the domain A-32 Part 5
 * refuses; **that objection was correct when it was written and A-46 Part 2 removed it** by
 * putting `isIsoDate` on §2.10's surface (76 → 77). The check is not a second definition — it is
 * *the* definition, called by name, exactly as `rowDatesReadable` calls it.
 *
 * `isIsoDate` strictly **contains** the guard it replaces (every shape-invalid string fails it
 * too), which is why stacking the two would be the same predicate written twice. The containment
 * is asserted rather than assumed, in `test/cli.test.ts`: `core.weekdayOf` does not throw at
 * `0000-01-01` or `9999-12-31`, `IsoDate`'s domain boundaries.
 *
 * Refusal rather than an echo (*"as of 2027-02-14 (normalised from 2026-13-45)"*) because an
 * echo keeps a path where the CLI computes for a date the user did not type, and surfaces A-32
 * Part 4's normalisation as a user-facing concept — a repair-and-proceed, which A-45 Part 3 and
 * A-32 Part 5 both refuse. **No capability is lost**: every date `dayNumber` would normalise to
 * is itself typeable.
 */
function todayIsValid(): boolean {
  if (core.isIsoDate(today)) return true;
  // A-45's parser sentence, so the two surfaces say the same thing about the same input.
  out(`--today must be a real calendar date in YYYY-MM-DD, got ${JSON.stringify(today)}`);
  process.exitCode = 2;
  return false;
}

type Loaded = { trip: core.Trip; issues: core.Issue[]; cityRangeCheck?: unknown; unmatchedNames?: string[] };

const loaded: Loaded = file
  ? { trip: core.fromJSON(readFileSync(file, 'utf8')), issues: [] }
  : (loadEurope2026() as unknown as Loaded);
const trip = loaded.trip;

const out = (s: string) => process.stdout.write(`${s}\n`);
const money = (roll: core.CostRollUp) =>
  Object.entries(roll.byCurrency)
    .map(([cur, v]) => core.formatRange(cur, v.lo, v.hi))
    .join(' + ') || '—';

function cmdTrip() {
  if (!todayIsValid()) return;   // R28-9 — `--today` drives the stage below
  const s = core.tripSummary(trip, core.COUNTRY_INDEX);
  // §8.1: the stage is DERIVED from (trip, today) — there is no stored status field. `--today`
  // is what drives it, and it already defaults to FIXTURE_TODAY.
  const stage = core.lifecycle(trip, today);
  out(`${trip.title}  ${trip.startDate} → ${trip.endDate}  [${stage}]  (owner ${trip.ownerId}, rev ${trip.revision})`);
  out(`stage: ${stage}  (as of ${today})`);
  out(`${s.dayCount} days · ${s.stopCount} scheduled stops · ${s.poolCount} pooled · ${trip.places.length} places · ${trip.bookings.length} bookings`);
  out('');
  for (const c of core.orderedCities(trip)) {
    out(`  ${(c.meta?.flagEmoji ?? ' ').padEnd(2)} ${c.name.padEnd(12)} ${String(core.cityRange(trip, c.key)).padEnd(14)} ${core.daysForCity(trip, c.key).length} days`);
  }
  out('');
  const conflicts = core.detectConflicts(trip, { today });
  const issues = core.validateTrip(trip);
  out(`conflicts: ${conflicts.filter((c) => c.severity === 'blocker').length} blockers, ${conflicts.filter((c) => c.severity === 'warning').length} warnings, ${conflicts.filter((c) => c.severity === 'note').length} notes`);
  out(`validation: ${core.issueCounts(issues).error} errors, ${core.issueCounts(issues).warn} warnings`);
}

function cmdDay() {
  const id = argv[1];
  const day = trip.days.find((d) => d.id === id || d.date === id || d.id.endsWith(String(id)));
  if (!day) {
    out(`no such day: ${id}. Days run ${trip.days[0].id} … ${trip.days[trip.days.length - 1].id}`);
    process.exitCode = 1;
    return;
  }
  const legs = core.computeLegs(day, trip);
  out(`${day.date} (${core.weekdayOf(day.date)})  ${day.title}`);
  out(`${day.primaryCity} · cities: ${day.cities.join(', ')}${day.legacyFlag ? '  ⚑ FLAGGED' : ''}`);
  if (day.subtitle) out(`\n${day.subtitle}\n`);
  day.stops.forEach((s, i) => {
    const leg = legs[i];
    if (leg) out(`        ↓ ${leg.mode} ${core.fmtMins(leg.mins)}${leg.km != null ? ` · ${leg.km.toFixed(1)} km` : ''} (${leg.source})`);
    const status = core.displayStatus(s);
    const badges = [
      ...s.flags,
      status !== 'own' ? status : '',
      s.ticket ? `ticket:${s.ticket.kind}` : '',
      s.bookingId ? 'booked' : '',
    ].filter(Boolean);
    const t = s.placement.kind === 'scheduled' ? (s.placement.time ?? '  —  ') : '  —  ';
    out(`  ${t.padEnd(6)} ${s.name}${s.cost?.display ? `  [${s.cost.display}]` : ''}${badges.length ? `  {${badges.join(' ')}}` : ''}`);
  });
  const roll = core.rollUpCost(day.stops, { target: trip.homeCurrency });
  out(`\n  moving ${core.fmtMins(core.dayMovingMinutes(day, trip))} · ${core.dayDistanceKm(day, trip).toFixed(1)} km · cost ${money(roll)}`);
  if (roll.missingRates.length) out(`  no rate table for: ${roll.missingRates.join(', ')} — core will not convert`);
  for (const w of roll.basisWarnings) out(`  ⚠ ${w}`);
  const foc = core.focusCluster(day.stops, trip);
  out(`  map focus: ${foc.split ? `${foc.groups.length} clusters, showing ${foc.focus.length} stops` : 'single cluster'} · span ${core.fitSpanKm(core.stopPoints(foc.focus, trip)).toFixed(2)} km`);
}

function cmdConflicts() {
  if (!todayIsValid()) return;   // R28-9 — this printed `(today = bogus)` and exit 0
  const list = core.detectConflicts(trip, { today });
  const shown = has('all') ? list : list.filter((c) => !c.resolution);
  out(`${shown.length} conflicts (today = ${today})\n`);
  for (const c of shown) {
    out(`[${c.severity}] ${c.ruleId}${c.resolution ? ` (resolved: ${c.resolution.state})` : ''}`);
    out(`   ${c.summary}`);
    if (c.detail) out(`   ${c.detail}`);
    out(`   subjects: ${c.subjects.map((s) => `${s.kind}:${s.id}`).join(', ')}`);
    out(`   id: ${c.id}\n`);
  }
}

function cmdCost() {
  for (const day of trip.days) {
    const roll = core.rollUpCost(day.stops, { target: trip.homeCurrency });
    out(`${day.date}  ${money(roll).padEnd(24)} ${roll.basisWarnings.length ? '⚠ mixed basis' : ''}`);
  }
  const total = core.rollUpCost(trip, { target: trip.homeCurrency });
  out(`\nTRIP TOTAL  ${money(total)}`);
  if (total.missingRates.length) out(`unconvertible without a rate table: ${total.missingRates.join(', ')}`);
  for (const w of total.basisWarnings) out(`⚠ ${w}`);
}

function cmdValidate() {
  const issues = core.validateTrip(trip);
  const counts = core.issueCounts(issues);
  out(`${counts.error} errors, ${counts.warn} warnings\n`);
  for (const i of issues) out(`[${i.level}] ${i.code.padEnd(24)} ${i.message}`);
}

function cmdImport() {
  if (file) {
    out('import report is only available for the legacy fixture (drop --file)');
    return;
  }
  const r = loaded;
  out(`import warnings: ${r.issues.length}`);
  const byCode: Record<string, number> = {};
  for (const i of r.issues) byCode[i.code] = (byCode[i.code] ?? 0) + 1;
  for (const [k, v] of Object.entries(byCode)) out(`  ${k.padEnd(24)} ${v}`);
  out('\nCITY_RANGE parity:');
  for (const c of (r.cityRangeCheck ?? []) as Array<{ cityKey: string; derived: string; legacy: string; ok: boolean }>) {
    out(`  ${c.cityKey.padEnd(12)} derived ${String(c.derived).padEnd(14)} legacy ${c.legacy.padEnd(14)} ${c.ok ? 'OK' : 'MISMATCH'}`);
  }
}

/**
 * `cairn/ stats` — ARCHITECTURE §8.4 clause 2 / **A-31**, ROADMAP Phase 2 I-7.
 *
 * `travelStats` is a *multi-trip* function and this CLI holds one trip, so this is a thin
 * exercise of it — the multi-trip cases live in `packages/core/test/travelStats.test.ts`. What
 * the command is for is making the numbers addressable with no browser and no install.
 *
 * `--today` is the whole of the population rule made visible: before the trip's `startDate` it
 * is `planned` and contributes **nothing** — no country, no city, no day — because a map of
 * everywhere you have been may not include a trip you have booked.
 */
function cmdStats() {
  if (!todayIsValid()) return;   // R28-9 — this exited on a raw `invalid IsoDate` stack trace
  const s = core.travelStats([core.tripSummary(trip, core.COUNTRY_INDEX)], today);
  /**
   * §8.4 **A-34** (QA R28-7). An `active` trip contributes all of its countries un-clamped by the
   * day it has reached (A-31 Part 5 residue 2), and that licence holds **only because the
   * contribution is marked**: printing `GB 2026-08-07 → 2026-08-14 (1 trip)` for a country the
   * traveller does not reach until the 20th is a plan rendered as an accomplished fact, which is
   * the root `CLAUDE.md` convention. Marked, never hidden and never excluded from the counts —
   * excluding them tells a traveller standing in Vienna that they have never been.
   */
  const MARKER = '  ·  in progress';
  const LEGEND = '  ·  in progress — from a trip you are on; not yet confirmed reached';
  const provisional = [...s.countries, ...s.cities].some((r) => r.provisional);
  const pad = (label: string, n: number, marked = 0) =>
    out(`  ${label.padEnd(18)} ${n}${marked ? `  (${marked} in progress)` : ''}`);
  out(`travel statistics as of ${today}  (derived, never stored)`);
  out('');
  pad('trips planned', s.trips.planned);
  pad('trips active', s.trips.active);
  pad('trips completed', s.trips.completed);
  pad('days travelled', s.daysTravelled);
  pad('countries', s.countries.length, s.countries.filter((c) => c.provisional).length);
  pad('cities', s.cities.length, s.cities.filter((c) => c.provisional).length);
  out('');
  if (s.countries.length === 0) {
    // Never "0 countries" as though zero had been measured — A-31 Part 4's closing sentence.
    const nothing = s.located.cities + s.located.places + s.located.stops === 0;
    out(nothing ? '  no places yet' : '  nothing could be placed on the map');
  }
  for (const c of s.countries) {
    out(
      `  ${c.code}  ${c.firstVisit} → ${c.lastVisit}  ` +
        `(${c.tripIds.length} trip${c.tripIds.length === 1 ? '' : 's'})${c.provisional ? MARKER : ''}`,
    );
  }
  if (s.cities.length) out('');
  for (const c of s.cities) {
    // §8.4 **A-56** Part 7: a city now carries its own dates, so it prints them the way a
    // country does. **No coordinate** — `TripSummaryCity.centre` exists and A-56 Part 5 forbids
    // it reaching a log line, a golden or this output; `travelStats` never sees it and this
    // command never asks for it.
    out(
      `  ${(c.countryCode ?? '··').padEnd(3)} ${c.name.padEnd(18)} ` +
        `${c.firstVisit} → ${c.lastVisit}${c.provisional ? MARKER : ''}`,
    );
  }
  // The legend prints once, and only when something is actually marked.
  if (provisional) out(LEGEND);
  out('');
  // §8.4 **A-84** Part 7 item 1 (QA **R61-6**), completed by §8.4 **A-85** Part 3 (QA **R62-1**,
  // ROADMAP I-24). `seen` is what there WAS, per class, counted as RECORDS, and it prints ABOVE
  // `located` because it is the denominator `located` is a fraction of. `seen − located` is the
  // number of records with no coordinate at all — a number no `TravelStats` field could answer
  // before, because `cities` groups by name across trips.
  //
  // **All three columns are exact from summary generation 8.** The *"`places` is a lower bound"*
  // caveat that stood here was true and is now false: the stored row gained `placeCount`, so an
  // unlocated place is no longer invisible. A row minted before generation 8 still reports
  // `places` equal to `located` until the rescan reaches it.
  out(`  records seen cities ${s.seen.cities} · places ${s.seen.places} · stops ${s.seen.stops}`);
  out(`  located      cities ${s.located.cities} · places ${s.located.places} · stops ${s.located.stops}`);
  out(
    `  could not place  cities ${s.unattributed.cities} · places ${s.unattributed.places} · ` +
      `stops ${s.unattributed.stops}`,
  );
  // §8.4 **A-87** Part 3 rule 3 widens this population by one clause and the line is already
  // true for it as written: the stored `name` folded to `''`, **or was not a string at all**.
  if (s.unnamedCities) out(`  cities with no usable name: ${s.unnamedCities}`);
  // §8.4 **A-59** Part 3. The absorption is visible on the one surface that exists: a stored
  // `cities[].firstDay`/`lastDay` that is present and unreadable no longer takes the whole
  // library's statistics down (QA R43-2) — it takes A-56 Part 7 clause 2's fallback to the
  // trip's own range — and a silently absorbed value is A-37 Part 5 residue 2's mistake
  // repeated. Same conditional idiom as `unnamedCities` above, one line over, deliberately.
  if (s.unreadableCityDates) out(`  cities with unreadable stored dates: ${s.unreadableCityDates}`);
  // §8.4 **A-86** Part 4 (QA **R63-9**, ROADMAP I-25). Third instance of the same idiom, one
  // line further down, deliberately. A stored `cities` that is present and not an array
  // contributes no cities at all — I-24 Part 4's guard, which is correct and stays — and
  // before this line **nothing anywhere said so**: `travelHistory` returns `ok: true` with no
  // banner and no named row, and `rowStatsReadable`, which does name such a row, is consulted
  // only on the catch branch the guard made unreachable. This is the one surface that exists
  // today, so the absorption becomes visible here rather than waiting on `Library.tsx` and the
  // unresolved visual direction (A-59 Part 5, still unscheduled).
  if (s.unreadableCityLists) out(`  trips whose stored city list could not be read: ${s.unreadableCityLists}`);
  // §8.4 **A-87** Part 4 (QA **R64-2**, ROADMAP I-26). **The two sentences above stay verbatim;
  // this block is data-driven and replaces the habit of adding a fourth.** A new gate adds a row
  // to `absorbed`, never a field to `TravelStats` and never a line here, so a gate cannot be
  // added and forgotten on the one surface that exists.
  //
  // **This is the line that names the row on the SUCCESS path.** At `e1e1973` a row was nameable
  // only if something threw — `travelHistory`'s `rowId`/`unreadableRows` are computed inside its
  // own `catch` — so the moment a fault was absorbed rather than fatal, nothing anywhere said
  // which row it was on. No `.tsx` and no wait on the unresolved visual direction: the rendered
  // Trips-list treatment is still A-59 Part 5's and still triggers on `Library.tsx`.
  //
  // **A-87 Part 8 item 4 (R64-4's criterion):** a criterion that pins a shipped line pins its
  // EXECUTION, not its text. This block prints for a library that carries an absorption, so the
  // end-to-end arm asserting a PRESENCE in the captured output exists by construction and an
  // early `return` above it reddens that arm rather than sailing past an absence check.
  const byRow = new Map<string, string[]>();
  for (const a of s.absorbed) {
    const paths = byRow.get(a.rowId);
    if (!paths) byRow.set(a.rowId, [a.path]);
    else if (!paths.includes(a.path)) paths.push(a.path);
  }
  //
  // **§8.4 A-88 Part 9 (QA R65-6), and it discharges A-87 Part 10 residue 1 rather than
  // deferring it a second time.** That residue's own trigger — *"the first surface that renders
  // the list rather than a count caps its own display and says it is capping"* — fired inside
  // `I-26`, on the surface `I-26` added, and nothing capped: a row with 200 absorptions printed
  // one line of 3,529 characters. **Five paths, then "…and N more."** Five because the line
  // exists to name the row and give a repair a starting point, not to enumerate storage — and it
  // says it is capping, because a silently truncated list is a list that lies about its length.
  // The literal lives here rather than at module scope: `test/cli.test.ts` lifts this body into a
  // standalone function, and a module-level binding would be out of scope there.
  for (const [rowId, paths] of byRow) {
    const shown = paths.slice(0, 5);
    const more = paths.length - shown.length;
    out(`  trip ${rowId}: unreadable stored values at ${shown.join(', ')}${more > 0 ? ` …and ${more} more` : ''}`);
  }
}

/**
 * `cairn/` — the only directory this CLI may ever write into.
 *
 * `europe-2026-itinerary.html`, `docs/` and `tickets/` at the repo root are the live app on
 * Jacob's phone; Cairn reads them and never writes them (CLAUDE.md, sequencing rule 4).
 * `cmdExport` used to be `writeFileSync(argv[1], text)`, so
 * `npm run cli -- export ../europe-2026-itinerary.html` overwrote the planner (F-16).
 * `tools/serve.mjs` already has the equivalent guard on its read path.
 */
const CAIRN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));

/**
 * The absolute path to write to, or `null` if it escapes `cairn/`.
 *
 * `resolve` normalises `..`, a leading `/` and any symlink-free traversal; the trailing
 * separator on the prefix is what stops `/…/cairn-backup/x` passing as `/…/cairn/x`.
 *
 * **`resolve` does not follow symlinks, and the guard used to stop there** (QA R2-5). A link
 * planted inside `cairn/` — `ln -s <outside>/victim.txt cairn/qa/escape-link.json` — passed
 * the prefix test lexically, and `writeFileSync` then wrote *through* it: the file outside
 * `cairn/` was overwritten with the trip JSON and the CLI reported success. So the real path
 * is resolved before the prefix test:
 *
 *   - `realpathSync` on the containing DIRECTORY, which catches both a symlinked parent and
 *     a symlinked final component (the link's own directory is real, so the check has to be
 *     on where the link POINTS, below);
 *   - `realpathSync` on the target itself when it already exists, which is the symlinked-file
 *     case;
 *   - and both results must still sit under `cairn/`.
 *
 * A missing parent directory is a refusal too: there is nothing to resolve, and the CLI does
 * not create directories. BUILD-NOTES KD-30. Pure apart from the `realpath` reads.
 */
function safeWritePath(target: string): string | null {
  const abs = resolve(process.cwd(), target);
  const inside = (p: string) => p.startsWith(CAIRN_ROOT + sep);
  if (!inside(abs)) return null;
  let realParent: string;
  try {
    realParent = realpathSync(dirname(abs));
  } catch {
    return null;   // the directory does not exist, or cannot be resolved
  }
  if (!inside(join(realParent, basename(abs)))) return null;
  if (existsSync(abs)) {
    try {
      if (!inside(realpathSync(abs))) return null;
    } catch {
      return null;
    }
  }
  return abs;
}

function cmdExport() {
  const text = core.toJSON(trip);
  const target = argv[1];
  if (target && !target.startsWith('--')) {
    const abs = safeWritePath(target);
    if (abs === null) {
      out(`refusing to write outside ${CAIRN_ROOT}: ${target}`);
      out('Cairn never writes to the live planner, docs/ or tickets/. Pick a path inside cairn/.');
      process.exitCode = 2;
      return;
    }
    // QA R2-5, second half: `export <existing file>` overwrote it with no prompt and exit 0.
    // A CLI has no dialog to raise, and a prompt would break every scripted use, so the
    // answer is refuse-by-default with the way through named in the message. Silent is the
    // one thing it may not be.
    if (existsSync(abs) && !has('force')) {
      out(`refusing to overwrite: ${abs} already exists`);
      out('Pick another path, or pass --force if you meant to replace it.');
      process.exitCode = 3;
      return;
    }
    writeFileSync(abs, text);
    out(`wrote ${abs} (${text.length} bytes)`);
  } else process.stdout.write(`${text}\n`);
}

/**
 * `photos <file>…` — ARCHITECTURE §10.2, ROADMAP **I-13**'s only user-visible outcome.
 *
 * *"Reports what a JPEG's metadata actually says, which is the fastest way to see A-58's central
 * fact for yourself on your own photos."* That fact is A-58 Part 2's: **on iOS Safari a photo
 * picked through a file input arrives with its EXIF already gone**, so the capability that
 * separates a parsing library from a hand-roll buys nothing on the primary target. It is worth
 * being checkable against a real file rather than taken from a ruling, so this command exists.
 *
 * It calls `core.readExif` — the same pure, total, bounded parser `apps/web`'s import path uses,
 * reached through §2.10's index like everything else here (criterion E ceiling (1)).
 *
 * **No coordinate is printed** (§10.5, and §8.4 A-56 Part 5's identical rule for
 * `TripSummaryCity.centre`): the report says whether a location is present, never what it is.
 * A photograph's coordinate is the single most sensitive field this model holds, a terminal
 * scrollback is a log, and *"no coordinate in any log line"* has no exception for a CLI the user
 * ran themselves. `test/cli.test.ts` greps this command's own output for a decimal.
 *
 * **Reads are confined to `cairn/`** by the same `safeWritePath` the export path uses — the
 * function is a containment check on a resolved path, and it is as correct for a read as for a
 * write. Cairn reads the live planner through the extractor and by no other route; a `photos`
 * command that would happily open `../tickets/*.pdf` is a file-disclosure primitive.
 */
function cmdPhotos() {
  const targets = argv.slice(1).filter((a) => !a.startsWith('--'));
  if (targets.length === 0) {
    out('usage: node cli.ts photos <file.jpg> [more…]');
    out('Reports what each file\'s own EXIF block says. Paths must be inside cairn/.');
    process.exitCode = 2;
    return;
  }
  for (const target of targets) {
    const abs = safeWritePath(target);
    if (abs === null || !existsSync(abs)) {
      out(`refusing to read outside ${CAIRN_ROOT}: ${target}`);
      process.exitCode = 2;
      return;
    }
    const bytes = new Uint8Array(readFileSync(abs));
    const r = core.readExif(bytes);
    const when = r.capturedAt ? `${r.capturedAt.date} ${r.capturedAt.time}` : '—';
    const px = r.pixel ? `${r.pixel.w} × ${r.pixel.h}` : '—';
    out(`${basename(abs)}  (${bytes.length} bytes)`);
    out(`  read       ${r.reason}`);
    out(`  taken      ${when}`);
    out(`  pixels     ${px}`);
    out(`  rotation   ${r.orientation ?? '—'}`);
    // Present or none. Never the value — §10.5.
    out(`  location   ${r.at ? 'present' : 'none'}`);
    if (r.reason === 'unsupported_container') {
      out('  note       not a JPEG with an Exif APP1 segment. HEIC/HEIF, AVIF, PNG, WebP and');
      // No section number here, and that is not fussiness: `test/cli.test.ts` greps this
      // command's whole output for a decimal, because a decimal could only be a coordinate
      // (§10.5). A citation like "10.2" is a false positive that would blunt a real check.
      out('             bare TIFF are refused rather than guessed at.');
    }
    if (r.reason === 'no_exif' || r.reason === 'unsupported_container') {
      out('  why        This is the EXPECTED result for a photo picked on iOS: Safari strips');
      out('             EXIF at the file input, and converts HEIC to JPEG without it (A-58).');
    }
  }
}

/**
 * The bundled offline city gazetteer, on the command line — ARCHITECTURE §8.4 **A-82**, **A-83**
 * and **A-84**; ROADMAP Phase 2 **I-21** and **I-23**. This is the P1 caller that makes
 * `searchGazetteer` a §2.10 surface symbol, and A-82 Part 2 reason 4 is why it exists at all:
 * *"`cli.ts` gets a `cities` command in the same increment, which is what lets a tester exercise
 * this with no browser, no device and no UI."*
 *
 * **The subpath now carries `loadGazetteerFor(query)`, not the corpus.** A-83 Part 6 shards the
 * corpus across ~950 JSON documents behind dynamic imports, so a search fetches **one** of them
 * (~20 kB gzipped) rather than all 8.6 MB. The boundary is unchanged and is what makes that
 * possible: `@cairn/core/gazetteer` is a **second declared entry point**, reached by the bare
 * subpath and never by module path, because nothing on a document's write path needs any of this.
 *
 * **The attribution is printed on every run, and that is a licence obligation rather than a
 * courtesy.** GeoNames is **CC BY 4.0** — the first attribution obligation in this repository;
 * Natural Earth was public domain and needed none. A-83 Part 2: *"any surface that renders a hit
 * must render the attribution"*, and this command is the surface that makes that testable before
 * a screen exists.
 *
 * **Three answers, and they are three different things** (A-83 Part 6):
 *
 *  - **hits** — rows, each with the label `searchGazetteer` computed, never a bare name;
 *  - **`no match`** — the corpus was searched and holds nothing. *A miss is a miss and the product
 *    says so*; an empty successful exit is how a search feature lies about its coverage;
 *  - **`keep typing`** — the query cannot resolve to one shard yet, so **nothing was searched**.
 *    *"I have not looked yet" is not a miss*, and printing `no match` for it would be a lie.
 *
 * **Picking is not implemented here and that is deliberate.** A-82 Part 6 forbids matching a typed
 * name to a row without a human choosing it — this command prints candidates, and nothing in this
 * repository turns the top hit into a `City`. §8.4 **A-84** makes that fence load-bearing rather
 * than merely stated: a picked row's country is read off the pick and outranks `countryOf`, so a
 * system that picked on a user's behalf would be putting a country on their lifetime map.
 */
const ATTRIBUTION_PROBE = 'zurich';

async function cmdCities() {
  const query = argv.slice(1).find((a) => !a.startsWith('--'));
  if (query === undefined || query.trim() === '') {
    out('usage: node cli.ts cities "<query>" [--limit N]');
    out('Searches the bundled offline gazetteer (GeoNames under a notability filter, §8.4 A-83).');
    process.exitCode = 2;
    return;
  }
  const rawLimit = flag('limit');
  const limit = rawLimit === null || rawLimit === '' ? 20 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1) {
    out(`--limit must be a positive whole number, got ${JSON.stringify(rawLimit)}`);
    process.exitCode = 2;
    return;
  }

  const { loadGazetteerFor } = await import('@cairn/core/gazetteer');
  const gazetteer = await loadGazetteerFor(query);
  if (gazetteer === null) {
    // A-83 Part 6: the query's first token cannot resolve to one shard — it is under two
    // characters, or it is a prefix the corpus split, whose true answer is that prefix's whole
    // subtree. **Nothing was searched.**
    out(`keep typing: "${query}" is too short to search one shard`);
    // The attribution is owed on every run, and the subpath's one symbol is the only way to reach
    // it — so a query that is known to resolve stands in for the corpus that was not searched.
    out(`source: ${(await loadGazetteerFor(ATTRIBUTION_PROBE))?.source ?? ''}`);
    return;
  }
  // **§8.4 A-91 item 1.** `hits` is not reachable without `source` on the same line — the
  // attribution is in the value, so dropping it is an act rather than an omission. `source` is the
  // loaded shard's own string and **never** a constant here: a hard-coded credit passes every
  // other assertion forever and goes stale at the next re-pin (A-90 clause 3).
  const { source, hits } = core.searchGazetteer(query, gazetteer, { limit });
  if (hits.length === 0) {
    out(`no match: ${query}`);
  }
  for (const h of hits) {
    // **§8.4 A-84 Part 6's marker, and it fires on `'differs'` ONLY.** A row whose country and
    // `countryOf(row.centre)` disagree ships carrying that disagreement rather than being dropped,
    // so the line says so — *no shipped row may SILENTLY contradict the country index*. The field
    // this reads used to be a boolean, and **all 436 rows the index was silent about claimed
    // agreement**; `'silent'` is now its own value and is marked as neither.
    const mark =
      h.indexSays === 'differs'
        ? '  ⚑ our country index disagrees — it says this point is elsewhere'
        : '';
    out(`${h.label} · ${h.centre.lat},${h.centre.lng} · ${h.countryCode ?? '—'}${mark}`);
  }
  // **The CC BY 4.0 attribution, on every run, hits or not.** A-83 Part 2 clause 1, and after
  // A-91 item 1 it is read off the search's own result rather than reached for on the gazetteer.
  out(`source: ${source}`);
}

/**
 * `ask "<question>"` — ARCHITECTURE **§11**, ROADMAP **I-35**.
 *
 * **This command is the whole point of building the capability before any screen exists.** §11 is
 * designed so that it needs no surface: `ask` takes a value from a closed union and returns an
 * `Answer` whose every clause is rendered from a fact with a cite behind it, so a terminal is a
 * complete consumer of it and a tester can attack it with no browser, no device and no UI. That
 * is `cli.ts cities`' argument (§8.4 A-82 Part 2 reason 4) at a second door.
 *
 * **The restatement prints ABOVE the answer** — §11.7 rule 2, which is the root `CLAUDE.md`
 * convention (*never present our reading as the user's own*) applied at the one place in this
 * product where the system's interpretation of the user stands between them and their data.
 * **The cites print BELOW it**, because an answer that cannot say what it read is the thing this
 * capability exists to not be.
 *
 * **A refusal prints the menu and exits 2** — this CLI's house style for input it will not act on
 * (`cmdExport`'s two refusals, `cmdCities`' usage line). All four refusals do it: `ambiguous`,
 * `out_of_scope: 'lifetime'`, `out_of_scope: 'recommendation'` and `unrecognised`. §11.3 rule 5:
 * `askableQuestions(trip)` is the answer to every one of them.
 *
 * **`questionLine` is this file's own and is deliberately not a core export.** §11.9 keeps the
 * renderer and the trigger tables internal, so the menu is printed from the `Question` values
 * themselves. What keeps it honest is that **every line it prints is valid input**:
 * `test/cli.test.ts` feeds each menu line back through `core.matchQuestion` and asserts it
 * matches the question it was rendered from. A menu you cannot type is not a way out of a refusal.
 */
function questionLine(q: core.Question): string {
  const name = (key: string) => trip.cities.find((c) => c.key === key)?.name ?? key;
  switch (q.kind) {
    case 'trip_overview': return 'what does my trip look like';
    case 'unbooked': return 'what is still unbooked';
    case 'country_count': return 'how many countries am I visiting';
    case 'city_edge':
      return q.edge === 'leave' ? `when do I leave ${name(q.cityKey)}` : `when do I arrive in ${name(q.cityKey)}`;
    case 'free_time':
      return q.cityKey === null
        ? `do I have a free ${q.part}`
        : `do I have a free ${q.part} in ${name(q.cityKey)}`;
  }
}

/** The menu, printed. It is the answer to every refusal, so it is one function. */
function printMenu() {
  out('');
  out('Questions I can answer about this trip — any line below is valid input:');
  for (const q of core.askableQuestions(trip)) out(`  ${questionLine(q)}`);
}

/** `kind:id` for a cite. `city` carries a per-trip key rather than an id (§2.2 A-10). */
function citeRef(c: core.AnswerCite): string {
  return c.kind === 'city' ? `city:${c.key}` : `${c.kind}:${c.id}`;
}

/**
 * Five at a time, then "…and N more" — §8.4 **A-88** Part 9's rule, one surface over: a list that
 * is silently truncated is a list that lies about its length. The cap is on the DISPLAY; the
 * `Answer` carries every cite, which is what `packages/core/test/ask.test.ts` resolves.
 */
function printCapped(label: string, lines: string[], cap: number) {
  if (lines.length === 0) return;
  out('');
  out(`${label} (${lines.length})`);
  for (const l of lines.slice(0, cap)) out(`  ${l}`);
  const more = lines.length - Math.min(cap, lines.length);
  if (more > 0) out(`  …and ${more} more (this display is capped at ${cap}; the answer carries all ${lines.length})`);
}

function cmdAsk() {
  if (!todayIsValid()) return;
  if (has('menu')) {
    printMenu();
    return;
  }
  const text = argv.slice(1).find((a) => !a.startsWith('--'));
  if (text === undefined || text.trim() === '') {
    out('usage: node cli.ts ask "<question>"   |   node cli.ts ask --menu');
    out('Answers from THIS trip document and nothing else. No network, no model (§11).');
    printMenu();
    process.exitCode = 2;
    return;
  }

  const m = core.matchQuestion(text, trip);
  if (m.kind !== 'matched') {
    if (m.kind === 'ambiguous') {
      out(`I read "${text}" two ways, and I will not pick one for you:`);
      for (let i = 0; i < m.readings.length; i++) {
        out(`  ${i + 1}. ${m.restatements[i]}  —  ask it as: ${questionLine(m.readings[i])}`);
      }
    } else if (m.kind === 'out_of_scope') {
      out(`I will not answer that: ${m.reason === 'lifetime' ? 'it is about a different data set' : 'it is a recommendation'}.`);
      out(`  ${m.pointer}`);
    } else {
      out(`I don't recognise "${text}" as a question about this trip.`);
      out('  No trigger phrase and no city name of this trip matched. I do not guess.');
    }
    printMenu();
    process.exitCode = 2;
    return;
  }

  const answer = core.ask(m.question, { trip, today, index: core.COUNTRY_INDEX });
  out(`I read this as: ${m.restatement}.`);
  if (m.unread.length > 0) out(`I did not read: ${m.unread.join(' ')}`);
  out('');
  out(answer.text);
  out('');
  out(`coverage: ${answer.coverage}`);
  for (const c of answer.caveats) out(`  ⚠ [${c.code}] ${c.message}`);
  // **The facts, not a second rendering of the answer.** `Answer.text` is rendered FROM these
  // (§11.5), so printing them is what lets a reader check the sentence against the structured
  // result rather than take it on trust — and it is where a record's own NAME lives, which the
  // sentence deliberately never interpolates (see `ask/ask.ts`'s header: §6.6's pattern set
  // legitimately fires on user prose, and a name is not a credential to be mangled).
  printCapped(
    'facts — what the sentence above is rendered from',
    answer.facts.map((f) => {
      const params = Object.entries(f.params)
        .filter(([k, v]) => v !== '' && String(v) !== String(f.value) && k !== 'stopId')
        .slice(0, 4)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
      return `${f.label.padEnd(24)} ${String(f.value === null ? '(not recorded)' : f.value).padEnd(14)} ${params}`.trimEnd();
    }),
    20,
  );
  printCapped('cites — every record this answer read', answer.cites.map(citeRef), 12);
}

const commands: Record<string, () => void | Promise<void>> = {
  trip: cmdTrip,
  ask: cmdAsk,
  day: cmdDay,
  conflicts: cmdConflicts,
  cost: cmdCost,
  validate: cmdValidate,
  stats: cmdStats,
  cities: cmdCities,
  import: cmdImport,
  export: cmdExport,
  photos: cmdPhotos,
};

const run = commands[cmd];
if (!run) {
  out(`unknown command "${cmd}". Try: ${Object.keys(commands).join(' | ')}`);
  process.exitCode = 1;
} else {
  // `cities` is the one async command (A-82 Part 9's dynamic import). A rejection here must exit
  // non-zero rather than becoming an unhandled rejection warning on a zero exit code.
  void Promise.resolve(run()).catch((err: unknown) => {
    out(String(err instanceof Error ? err.message : err));
    process.exitCode = 1;
  });
}
