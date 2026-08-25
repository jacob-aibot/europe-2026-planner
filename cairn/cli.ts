/**
 * Cairn CLI — reports on a real trip with no browser and no install.
 *
 *   node cli.ts trip                 headline counts and the city ranges
 *   node cli.ts day 2026-08-13       one day: stops, legs, costs, badges
 *   node cli.ts conflicts [--all]    the conflicts panel, as text
 *   node cli.ts cost                 per-day and whole-trip roll-ups
 *   node cli.ts validate             validateTrip issues
 *   node cli.ts import               the legacy import report
 *   node cli.ts export [file]        the trip as JSON on stdout, or to a file inside cairn/
 *
 * With no `--file`, it loads the Europe 2026 fixture by reading the live planner
 * READ-ONLY. `--file trip.json` reads a Cairn document instead.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
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
  const s = core.tripSummary(trip);
  out(`${trip.title}  ${trip.startDate} → ${trip.endDate}  (owner ${trip.ownerId}, rev ${trip.revision})`);
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
 * Pure.
 */
function safeWritePath(target: string): string | null {
  const abs = resolve(process.cwd(), target);
  return abs.startsWith(CAIRN_ROOT + sep) ? abs : null;
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
  import: cmdImport,
  export: cmdExport,
};

const run = commands[cmd];
if (!run) {
  out(`unknown command "${cmd}". Try: ${Object.keys(commands).join(' | ')}`);
  process.exitCode = 1;
} else run();
