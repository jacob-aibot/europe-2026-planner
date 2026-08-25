/**
 * The disclosure rule, enforced.
 *
 * From the Phase 1 review: *"a comment in `packages/*​/src` is not a disclosure. Any source
 * comment that records a known divergence from ARCHITECTURE.md or ROADMAP.md — 'see
 * BUILD-NOTES', 'objection', 'artifact', 'not a real defect', 'the roadmap says X but' —
 * MUST have a matching entry in a BUILD-NOTES section called **Known divergences from the
 * contract**, and that section is the first thing the manager reads."*
 *
 * That happened because a caveat recorded in a source comment — correctly, and before
 * anyone found it — never reached BUILD-NOTES, so nine false-positive blockers rode a
 * passing acceptance gate. Six files cited a section that did not exist.
 *
 * The mechanism: every divergence in BUILD-NOTES §1 has an id `KD-n`. A comment that trips
 * a disclosure trigger must name one, and the id must exist. The two cannot drift because
 * `npm test` fails if they do.
 *
 * This file is excluded from its own scan: it has to contain the trigger words to define
 * them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve, sep } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const BUILD_NOTES = resolve(CAIRN, 'docs/BUILD-NOTES.md');
const SECTION_HEADING = 'Known divergences from the contract';

/**
 * Phrases that mean "this code knowingly differs from the spec". Deliberately broad: a
 * false positive costs one `KD-n` reference, a false negative costs a phase.
 */
const TRIGGERS: RegExp[] = [
  /BUILD-?NOTES/i,
  /\bobjection\b/i,
  /\bartifact\b/i,
  /not a real defect/i,
  /the roadmap says/i,
  /roadmap('s)? (figure|criterion|number)/i,
  /disagrees with the roadmap/i,
  /\bcries wolf\b/i,
];

const KD_REF = /\bKD-(\d+)\b/g;

/** Files whose comments are scanned. Sources, tests, the CLI and the tools. */
const ROOTS = ['packages', 'apps/web/src', 'tools'].map((d) => resolve(CAIRN, d));
const EXTRA_FILES = [resolve(CAIRN, 'cli.ts')];
const EXCLUDE = new Set([resolve(HERE, 'disclosure.test.ts')]);
const SCANNED_EXT = /\.(ts|tsx|mts|mjs|js)$/;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    if (n === 'node_modules' || n === 'dist') return [];
    const full = resolve(dir, n);
    return statSync(full).isDirectory() ? walk(full) : SCANNED_EXT.test(full) ? [full] : [];
  });
}

/** Every `/** ... *​/` and `//` comment in a file, with the 1-based line it starts on. */
function commentsOf(src: string): Array<{ line: number; text: string }> {
  const out: Array<{ line: number; text: string }> = [];
  const lineOf = (idx: number) => src.slice(0, idx).split('\n').length;
  for (const m of src.matchAll(/\/\*[\s\S]*?\*\//g)) out.push({ line: lineOf(m.index), text: m[0] });
  // Consecutive `//` lines are one comment: a disclosure written over three lines must not
  // need the id repeated on each of them.
  const lines = src.split('\n');
  let buf: string[] = [];
  let start = 0;
  const flush = () => {
    if (buf.length) out.push({ line: start + 1, text: buf.join('\n') });
    buf = [];
  };
  lines.forEach((raw, i) => {
    const m = /^\s*\/\/(.*)$/.exec(raw);
    if (m) {
      if (!buf.length) start = i;
      buf.push(m[1]);
    } else flush();
  });
  flush();
  return out;
}

function knownDivergenceIds(): Set<string> {
  const md = readFileSync(BUILD_NOTES, 'utf8');
  const headingIdx = md.search(new RegExp(`^#{1,3}[^\\n]*${SECTION_HEADING}`, 'im'));
  assert.notEqual(headingIdx, -1, `BUILD-NOTES.md has no "${SECTION_HEADING}" section`);
  const rest = md.slice(headingIdx);
  const end = rest.search(/^\n---\n/m);
  const section = end === -1 ? rest : rest.slice(0, end);
  const ids = new Set<string>();
  for (const m of section.matchAll(/^###\s+(KD-\d+)\b/gm)) ids.add(m[1]);
  return ids;
}

test('BUILD-NOTES has a "Known divergences from the contract" section with numbered entries', () => {
  const ids = knownDivergenceIds();
  assert.ok(ids.size >= 5, `only ${ids.size} KD entries; the review named at least six required ones`);
  // Ids are contiguous from 1, so a deleted entry is loud rather than a hole.
  const nums = [...ids].map((i) => Number(i.slice(3))).sort((a, b) => a - b);
  assert.deepEqual(nums, nums.map((_, i) => i + 1), `KD ids are not contiguous from 1: ${nums.join(',')}`);
});

test('the six divergences the review named by hand are all present in the section', () => {
  const md = readFileSync(BUILD_NOTES, 'utf8');
  const headingIdx = md.search(new RegExp(`^#{1,3}[^\\n]*${SECTION_HEADING}`, 'im'));
  const section = md.slice(headingIdx);
  const required: Array<[string, RegExp]> = [
    ['the geo_outlier anchor objection', /geo_outlier/],
    ['the impossible_transfer departure-time artifact', /impossible_transfer/],
    ['day-cost parity is 6/16, not 16/16', /6\s*(of|\/)\s*16/i],
    ['3 bundled tickets over 2 files, not 2 bundled', /3\s+bundled|bundled over 2 files/i],
    // Spans lines: the KD-5 prose wraps between "`closed`" and its evidence, so this
    // deliberately reaches across newlines. Same-line adjacency is layout, not disclosure.
    ['the closed rule having no data path', /`?closed`?[\s\S]{0,600}?\b(no data path|never fire|0 of 95)/i],
    ['the cluster.ts caveat', /cluster\.ts|MIN_SPAN_KM/],
    ['the stops.ts caveat', /stops\.ts|compareStops/],
  ];
  const missing = required.filter(([, re]) => !re.test(section)).map(([label]) => label);
  assert.deepEqual(missing, [], `BUILD-NOTES §1 does not cover: ${missing.join('; ')}`);
});

test('every source comment that records a divergence names a KD entry that exists', () => {
  const ids = knownDivergenceIds();
  const files = [...ROOTS.flatMap(walk), ...EXTRA_FILES].filter((f) => !EXCLUDE.has(f));
  assert.ok(files.length > 20, `only ${files.length} files scanned`);

  const undisclosed: string[] = [];
  const dangling: string[] = [];

  for (const file of files) {
    const rel = relative(CAIRN, file).split(sep).join('/');
    for (const c of commentsOf(readFileSync(file, 'utf8'))) {
      const refs = [...c.text.matchAll(KD_REF)].map((m) => `KD-${m[1]}`);
      for (const r of refs) if (!ids.has(r)) dangling.push(`${rel}:${c.line} cites ${r}, which is not in BUILD-NOTES §1`);
      if (refs.length > 0) continue;
      const trigger = TRIGGERS.find((t) => t.test(c.text));
      if (trigger) {
        const first = c.text.replace(/\s+/g, ' ').slice(0, 110);
        undisclosed.push(`${rel}:${c.line} matches ${trigger} but names no KD entry — "${first}…"`);
      }
    }
  }

  assert.deepEqual(dangling, [], `\n  ${dangling.join('\n  ')}\n`);
  assert.deepEqual(
    undisclosed,
    [],
    '\nA comment recording a divergence is not a disclosure unless BUILD-NOTES §1 carries it:\n  ' +
      undisclosed.join('\n  ') +
      '\n',
  );
});

test('every KD entry is cited by at least one source file, or is explicitly doc-only', () => {
  const ids = knownDivergenceIds();
  const files = [...ROOTS.flatMap(walk), ...EXTRA_FILES].filter((f) => !EXCLUDE.has(f));
  const cited = new Set<string>();
  for (const file of files) {
    for (const m of readFileSync(file, 'utf8').matchAll(KD_REF)) cited.add(`KD-${m[1]}`);
  }
  const md = readFileSync(BUILD_NOTES, 'utf8');
  const orphans = [...ids].filter((id) => {
    if (cited.has(id)) return false;
    // A divergence with no single source home says so on its own heading line.
    const heading = new RegExp(`^###\\s+${id}\\b.*$`, 'm').exec(md)?.[0] ?? '';
    return !/doc-only|no single source|architect/i.test(heading);
  });
  assert.deepEqual(orphans, [], `KD entries nothing points at: ${orphans.join(', ')}`);
});

test('the review\'s two corrected numbers carry their caveat next to them, not in a footnote', () => {
  const md = readFileSync(BUILD_NOTES, 'utf8');
  const verified = md.slice(md.search(/^#{1,3}[^\n]*Verified, by running it/im));
  assert.ok(verified.length > 200, 'no "Verified, by running it" section');
  const ticketRow = verified.split('\n').find((l) => /ticket/i.test(l) && /\|/.test(l));
  assert.ok(ticketRow, 'the ticket census is not in the verified table');
  assert.match(ticketRow, /3 bundled/i, 'the ticket row still reports the wrong bundled count');
  assert.match(ticketRow, /KD-\d/, 'the ticket row does not carry its caveat');
  const conflictRow = verified.split('\n').find((l) => /blockers/i.test(l) && /\|/.test(l));
  assert.ok(conflictRow, 'the conflict count is not in the verified table');
  assert.match(conflictRow, /self-snapshot/i, 'the blocker count is still reported as a result');
  assert.match(conflictRow, /KD-\d/, 'the blocker row does not carry its caveat');
});
