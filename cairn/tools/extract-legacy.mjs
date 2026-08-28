/**
 * extract-legacy.mjs — reads the live planner READ-ONLY and returns its constant block.
 *
 * The Europe 2026 data is *adjacent, not copied* (ARCHITECTURE §2.11). Nothing here writes
 * to `europe-2026-itinerary.html`; nothing commits a copy of `DAYS`. What is committed is
 * `fixtures/europe2026.sha256` (the source hash) and `fixtures/golden/*.json`.
 *
 * Trap from HISTORY.md: use lastIndexOf('<script>'), not indexOf — the first match is the
 * Leaflet CDN tag.
 *
 * Pure apart from the single `readFileSync`. Throws on a missing file or an unparsable block.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Repo-root-relative path of the live planner. Read-only. */
export const LEGACY_HTML = resolve(HERE, '..', '..', 'europe-2026-itinerary.html');

/** Constants we lift out of the page. Order matters only for readability. */
const WANTED = [
  'CONTENT_VERSION',
  'COLORS',
  'CAT_LABEL',
  'MODES',
  'CITY_META',
  'DAYS',
  'OPTIONAL',
  'CITY_PLACES',
  'CITY_ORDER',
  'CITY_RANGE',
  'cityStops',
];

/** Returns the text of the LAST <script> block in the page. Pure. */
export function lastScriptBlock(html) {
  const open = html.lastIndexOf('<script>');
  if (open < 0) throw new Error('extract-legacy: no <script> block found');
  const start = open + '<script>'.length;
  const end = html.indexOf('</script>', start);
  if (end < 0) throw new Error('extract-legacy: unterminated <script> block');
  return html.slice(start, end);
}

/**
 * Slices the initializer of `const <name> = ...;` out of `src` by bracket matching.
 * Pure. Throws if the declaration is missing or unbalanced.
 */
export function sliceInitializer(src, name) {
  const decl = new RegExp(`(^|\\n)\\s*(?:const|let|var)\\s+${name}\\s*=\\s*`);
  const m = decl.exec(src);
  if (!m) throw new Error(`extract-legacy: declaration not found: ${name}`);
  let i = m.index + m[0].length;
  const depthOf = { '{': 1, '[': 1, '(': 1 };
  const closeOf = { '}': -1, ']': -1, ')': -1 };
  let depth = 0;
  let inStr = null;
  let esc = false;
  const startAt = i;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (ch === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (depthOf[ch]) depth += depthOf[ch];
    else if (closeOf[ch]) {
      depth += closeOf[ch];
      if (depth === 0) return src.slice(startAt, i + 1);
    } else if (ch === ';' && depth === 0) return src.slice(startAt, i);
  }
  throw new Error(`extract-legacy: unbalanced initializer for ${name}`);
}

/**
 * Reads the live planner and evaluates its constant block in an empty VM context.
 * No DOM, no Leaflet, no globals are provided — only literals are evaluated.
 * Returns `{ sha256, constants }`. Impure (one file read); throws on IO or parse failure.
 */
export function extractLegacy(htmlPath = LEGACY_HTML) {
  const bytes = readFileSync(htmlPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const src = lastScriptBlock(bytes.toString('utf8'));
  const parts = WANTED.map((n) => `${JSON.stringify(n)}: (${sliceInitializer(src, n)})`);
  const expr = `({${parts.join(',\n')}})`;
  const evaluated = vm.runInNewContext(expr, Object.create(null), { timeout: 5000 });
  // Objects created inside a VM context carry THAT realm's prototypes, which makes
  // `assert.deepStrictEqual` fail on structurally identical data and makes `Array.isArray`
  // checks subtly realm-dependent. Round-tripping through JSON brings everything home.
  const constants = JSON.parse(JSON.stringify(evaluated));
  return { sha256, constants, path: htmlPath };
}

if (process.argv[1] && process.argv[1].endsWith('extract-legacy.mjs')) {
  const { sha256, constants } = extractLegacy();
  const sub = process.argv[2];
  if (sub === 'hash') {
    process.stdout.write(sha256 + '\n');
  } else if (sub === 'dump') {
    process.stdout.write(JSON.stringify(constants[process.argv[3]] ?? constants, null, 2) + '\n');
  } else {
    const c = constants;
    process.stdout.write(
      [
        `source sha256 : ${sha256}`,
        `days          : ${c.DAYS.length}`,
        `scheduled     : ${c.DAYS.reduce((n, d) => n + d.stops.length, 0)}`,
        `pool          : ${Object.values(c.OPTIONAL).reduce((n, o) => n + o.stops.length, 0)}`,
        `places        : ${Object.values(c.CITY_PLACES).reduce((n, p) => n + p.length, 0)}`,
      ].join('\n') + '\n',
    );
  }
}
