/**
 * Cairn CLI — reports on a real trip with no browser and no install.
 *
 *   node cli.ts trip                 headline counts and the city ranges
 *   node cli.ts day 2026-08-13       one day: stops, legs, costs, badges
 *   node cli.ts conflicts [--all]    the conflicts panel, as text
 *   node cli.ts cost                 per-day and whole-trip roll-ups
 *   node cli.ts validate             validateTrip issues
 *   node cli.ts stats                lifetime travel statistics, derived (§8.4 A-31)
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
 * So this refuses what is not `YYYY-MM-DD` and **accepts a shape-valid, calendar-invalid date**
 * such as `2026-13-45`, which rolls over to 2027-02-14 exactly as `dayNumber` does everywhere
 * else in this system (§2.1 A-32 Part 4).
 *
 * **Corrected at revision 31 (QA R34-6), on both halves.** This paragraph used to justify that
 * acceptance with *"`fromJSON` accepts one in a stored document"* — §2.9 **A-45** made that
 * false; `fromJSON` now refuses a calendar-invalid date at all five sites. And it said
 * `isIsoDate` is *"deliberately off §2.10's surface"* — §2.9 **A-46** Part 2 put it on
 * (76 → 77), so this file *could* now refuse `--today 2026-02-30`.
 *
 * It still does not, and that is a choice rather than an oversight: A-46 rules on the Trips
 * list and explicitly moves nothing else, and `--today` is a *developer* knob whose whole job
 * is to drive the clock to an arbitrary point — including one `dayNumber` normalises. What is
 * true today, verifiably: `node cli.ts stats --today 2026-02-30` prints *"travel statistics as
 * of 2026-02-30"*. **Whether that should tighten now that `isIsoDate` is reachable is an open
 * question for the architect** (QA R34-6's second half), not something to settle here — a
 * stricter rule reached for locally would be the second, narrower definition of the domain
 * A-32 Part 5 refuses.
 */
function todayIsValid(): boolean {
  try {
    core.weekdayOf(today);
    return true;
  } catch {
    out(`--today must be a date in YYYY-MM-DD, got ${JSON.stringify(today)}`);
    process.exitCode = 2;
    return false;
  }
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
    out(`  ${(c.countryCode ?? '··').padEnd(3)} ${c.name}${c.provisional ? MARKER : ''}`);
  }
  // The legend prints once, and only when something is actually marked.
  if (provisional) out(LEGEND);
  out('');
  out(`  located      cities ${s.located.cities} · places ${s.located.places} · stops ${s.located.stops}`);
  out(
    `  could not place  cities ${s.unattributed.cities} · places ${s.unattributed.places} · ` +
      `stops ${s.unattributed.stops}`,
  );
  if (s.unnamedCities) out(`  cities with no usable name: ${s.unnamedCities}`);
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

const commands: Record<string, () => void> = {
  trip: cmdTrip,
  day: cmdDay,
  conflicts: cmdConflicts,
  cost: cmdCost,
  validate: cmdValidate,
  stats: cmdStats,
  import: cmdImport,
  export: cmdExport,
};

const run = commands[cmd];
if (!run) {
  out(`unknown command "${cmd}". Try: ${Object.keys(commands).join(' | ')}`);
  process.exitCode = 1;
} else run();
