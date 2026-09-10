/**
 * ARCHITECTURE §3, enforced.
 *
 *   "Dependency direction, enforced by a test that walks imports: `core` → nothing.
 *    `tokens` → nothing. `client` → core. `web`/`mobile` → client, core, tokens.
 *    `api`/`ingest` → core. **Nothing imports `web` or `mobile`.**
 *    This is the boundary that rots first."
 *
 * The property held in Phase 1 and this test did not exist, which is the definition of a
 * guard nobody wrote. Four packages is when it is cheap.
 *
 * Two kinds of edge are checked, because both break the boundary:
 *   - a BARE specifier (`@cairn/core`, `react`, `node:fs`) — the visible dependency;
 *   - a RELATIVE specifier that resolves outside the package's own directory
 *     (`../../core/src/index.ts`) — the invisible one, and the one that actually happens.
 *
 * `packages/client/src/deps.ts` is the single deliberate exception: it is the ONE file
 * allowed to reach into core by relative path, so that `node --test` runs the client's
 * `.ts` files with no build step. It is named here so that the exception cannot spread
 * without editing this list.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve, sep } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');

type Unit = {
  /** Name used in messages, e.g. `packages/core`. */
  name: string;
  dir: string;
  /** Bare specifiers this unit may import, beyond `node:*` where allowed. */
  allowBare: string[];
  /** May it import Node builtins at all? core and tokens may not: zero runtime deps, no fs. */
  allowNodeBuiltins: boolean;
  /** Relative imports may leave the package dir only from these files (repo-relative). */
  relativeEscapeHatches: string[];
};

const UNITS: Unit[] = [
  { name: 'packages/core', dir: resolve(CAIRN, 'packages/core/src'), allowBare: [], allowNodeBuiltins: false, relativeEscapeHatches: [] },
  { name: 'packages/tokens', dir: resolve(CAIRN, 'packages/tokens/src'), allowBare: [], allowNodeBuiltins: false, relativeEscapeHatches: [] },
  {
    name: 'packages/client',
    dir: resolve(CAIRN, 'packages/client/src'),
    allowBare: ['@cairn/core'],
    allowNodeBuiltins: false,
    relativeEscapeHatches: ['packages/client/src/deps.ts'],
  },
  {
    name: 'apps/web',
    dir: resolve(CAIRN, 'apps/web/src'),
    allowBare: ['@cairn/core', '@cairn/client', '@cairn/tokens', 'react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'leaflet'],
    allowNodeBuiltins: false,
    relativeEscapeHatches: [],
  },
];

/** Every module specifier in a source file: static, re-export and dynamic. */
const SPEC_RE = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const full = resolve(dir, n);
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx|mts)$/.test(full) ? [full] : [];
  });
}

function specsOf(file: string): string[] {
  const src = stripComments(readFileSync(file, 'utf8'));
  const out: string[] = [];
  for (const m of src.matchAll(SPEC_RE)) out.push(m[1]);
  return out;
}

const isRelative = (s: string) => s.startsWith('./') || s.startsWith('../');
const isNodeBuiltin = (s: string) => s.startsWith('node:');
/** `@scope/pkg/sub` → `@scope/pkg`; `pkg/sub` → `pkg`. */
const packageOf = (s: string) => (s.startsWith('@') ? s.split('/').slice(0, 2).join('/') : s.split('/')[0]);

for (const unit of UNITS) {
  test(`${unit.name} imports only what §3 allows`, () => {
    const files = walk(unit.dir);
    assert.ok(files.length > 0, `${unit.name}: no sources found at ${unit.dir}`);
    const violations: string[] = [];
    for (const file of files) {
      const rel = relative(CAIRN, file).split(sep).join('/');
      for (const spec of specsOf(file)) {
        if (isRelative(spec)) {
          const target = resolve(dirname(file), spec);
          if (!target.startsWith(unit.dir + sep) && !unit.relativeEscapeHatches.includes(rel)) {
            violations.push(`${rel} reaches outside its package: ${spec}`);
          }
          continue;
        }
        if (isNodeBuiltin(spec)) {
          if (!unit.allowNodeBuiltins) violations.push(`${rel} imports a Node builtin: ${spec}`);
          continue;
        }
        const pkg = packageOf(spec);
        if (!unit.allowBare.includes(spec) && !unit.allowBare.includes(pkg)) {
          violations.push(`${rel} imports ${spec}`);
        }
      }
    }
    assert.deepEqual(violations, [], `\n  ${violations.join('\n  ')}\n`);
  });
}

test('core has zero runtime dependencies declared, not merely zero imported', () => {
  const pkg = JSON.parse(readFileSync(resolve(CAIRN, 'packages/core/package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  assert.deepEqual(pkg.dependencies ?? {}, {});
});

test('nothing in the repo imports apps/web or apps/mobile', () => {
  const roots = ['packages', 'apps', 'tools', 'test', 'fixtures'].map((d) => resolve(CAIRN, d));
  const offenders: string[] = [];
  for (const root of roots) {
    for (const file of walk(root)) {
      const rel = relative(CAIRN, file).split(sep).join('/');
      const inWeb = rel.startsWith('apps/web/');
      for (const spec of specsOf(file)) {
        if (/^@cairn\/(web|mobile)\b/.test(spec)) offenders.push(`${rel} → ${spec}`);
        if (isRelative(spec)) {
          const target = relative(CAIRN, resolve(dirname(file), spec)).split(sep).join('/');
          if (!inWeb && target.startsWith('apps/')) offenders.push(`${rel} → ${spec}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('core is deterministic at the source level: no clock, no randomness, no IO', () => {
  const banned: Array<[RegExp, string]> = [
    [/\bDate\.now\s*\(/, 'Date.now()'],
    [/\bMath\.random\s*\(/, 'Math.random()'],
    [/\brandomUUID\s*\(/, 'crypto.randomUUID()'],
    [/\bnew Date\s*\(\s*\)/, 'new Date() with no argument'],
    [/\bfetch\s*\(/, 'fetch()'],
    [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
    [/\bprocess\.env\b/, 'process.env'],
    [/\bconsole\.\w+\s*\(/, 'console'],
  ];
  const offenders: string[] = [];
  for (const file of walk(resolve(CAIRN, 'packages/core/src'))) {
    const src = stripComments(readFileSync(file, 'utf8'));
    for (const [re, label] of banned) {
      if (re.test(src)) offenders.push(`${relative(CAIRN, file)}: ${label}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('every rollUpCost call outside core passes { target: homeCurrency } — F-15', () => {
  // Without a target, `missingRates` lists EVERY currency including the trip's own, and a
  // `homeCurrency:'EUR'` trip renders "No conversion rate for EUR". That was the first
  // thing Jacob would have seen. It was fixed in the client and missed in the CLI, which is
  // exactly why this is a grep and not a code review.
  const roots = ['packages/client/src', 'apps/web/src'].map((d) => resolve(CAIRN, d));
  const files = [...roots.flatMap(walk), resolve(CAIRN, 'cli.ts')];
  const offenders: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (!/\brollUpCost\s*\(/.test(line)) return;
      if (!/target\s*:/.test(line)) offenders.push(`${relative(CAIRN, file)}:${i + 1}  ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [], `\n  ${offenders.join('\n  ')}\n`);
});

/**
 * **§8.4 A-92 clause 3 — a port may not RE-DECLARE a type `packages/core` exports.**
 *
 * `packages/client/src/ports/types.ts` declared `MapBoundsLike`, a hand-maintained structural
 * restatement of `core.MapBounds`, with nothing tying the two together. When A-84 Part 7 item 2
 * changed `MapBounds.centre` to `LatLng | null` it censused the *readers* of the type — the import
 * graph — and concluded *"`apps/web/src/ports/map.ts:48` is the only reader"*. It was one file
 * short, because **the import graph answers *who uses this name*; it does not answer *who has
 * promised this shape*.** The compiler only spoke at build time, after the census had concluded.
 *
 * This check is stated at exactly the width it reaches (§0 position 10c): it is a `grep` over the
 * one file, total over that file's declarations, and it catches the naming convention a structural
 * restatement almost always arrives under — **including the one that was actually written**. It
 * does **not** catch a restatement under an unrelated name and this test does not claim it does;
 * A-92 clause 2 is the part a reviewer applies. Ports declare **port-shaped** types (`MapPoint`,
 * `MapHandle`, `TripDoc`, `StorageVersion`) and **import** domain types from `../deps.ts`, which
 * this file already does for `IsoDate`, `PhotoId`, `TripId` and `TripSummaryRow`.
 */
test('no type in packages/client/src/ports/types.ts restates a core export — A-92', () => {
  const portsTypes = resolve(CAIRN, 'packages/client/src/ports/types.ts');
  const coreIndex = resolve(CAIRN, 'packages/core/src/index.ts');

  // Every name `packages/core/src/index.ts` exports, value or type, from its own export lines.
  const coreExports = new Set<string>();
  for (const m of readFileSync(coreIndex, 'utf8').matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) coreExports.add(name);
    }
  }
  assert.ok(coreExports.has('MapBounds'), 'sanity: core exports MapBounds');

  const SUFFIXES = ['Like', 'Shape', 'Ish', 'Alike'];
  const declared: string[] = [];
  for (const m of stripComments(readFileSync(portsTypes, 'utf8'))
    .matchAll(/^export\s+(?:type|interface)\s+([A-Za-z0-9_$]+)/gm)) {
    declared.push(m[1]);
  }
  assert.ok(declared.length > 0, 'sanity: ports/types.ts declares types');

  const offenders: string[] = [];
  for (const name of declared) {
    for (const suffix of SUFFIXES) {
      if (!name.endsWith(suffix)) continue;
      const stem = name.slice(0, -suffix.length);
      if (coreExports.has(stem)) {
        offenders.push(
          `packages/client/src/ports/types.ts declares ${name}, a restatement of core's ${stem}. ` +
            'A-92 clause 1: import it from ../deps.ts instead.',
        );
      }
    }
  }
  assert.deepEqual(offenders, [], `\n  ${offenders.join('\n  ')}\n`);
});
