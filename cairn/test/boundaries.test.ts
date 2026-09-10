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

/**
 * **§8.4 A-91 item 2 — the set of modules allowed to reach the gazetteer corpus is an ALLOWLIST,
 * and the allowlist is the attribution census's denominator.**
 *
 * GeoNames is CC BY 4.0 and it is this repository's first attribution obligation. The
 * **source-level** half is complete and was verified in QA round 67: `meta.json`'s `$source`
 * carries the text and the licence URL, `Gazetteer.source` is that string on every loaded shard
 * **including a miss**, and `cli.ts cities` prints it on hit, on miss and on *"keep typing"*. The
 * **user-visible** half is owed by whichever increment adds the first rendered consumer, and
 * **nothing in code fired when that consumer landed**: no test, no type, no boundary.
 *
 * A note will be lost. So the obligation is written into a list the compiler makes you open:
 * **adding a consumer requires editing `GAZETTEER_CONSUMERS` in the same increment**, and the
 * entry beside the new name is where the obligation is stated. This is §0 position 10(a)'s shape
 * — a denominator a test maintains — rather than a census over a population that changes
 * underneath it, which is the failure this project has hit five times (rounds 61–65, and A-92).
 *
 * **A consumer is a module that NAMES one of the three doors** — `loadGazetteerFor`,
 * `searchGazetteer`, or the `@cairn/core/gazetteer` subpath / `geo/gazetteerShards.gen.ts` —
 * **or one that imports such a module by relative path.** It is deliberately not *"imports
 * `@cairn/core`"*: the barrel exports `searchGazetteer`, so that reading would make every file in
 * the repository a consumer and the census would mean nothing.
 */
const GAZETTEER_CONSUMERS: ReadonlyArray<{ file: string; why: string }> = [
  {
    file: 'cli.ts',
    why:
      'The `cities` command — the only surface that renders a gazetteer hit today. It prints the ' +
      'attribution on a hit, on a miss and on "keep typing", reading it from the loaded ' +
      "gazetteer's own `source` rather than from a constant (A-91 item 3's third injected fault: " +
      'a hard-coded string passes the other two forever and goes stale at the next re-pin).',
  },
];

test('exactly the modules in GAZETTEER_CONSUMERS reach the gazetteer corpus — A-91 item 2', () => {
  const DOORS = ['loadGazetteerFor', 'searchGazetteer'];
  const SUBPATHS = ['@cairn/core/gazetteer', 'gazetteerShards.gen.ts'];

  const roots = ['packages/client/src', 'apps/web/src'].map((d) => resolve(CAIRN, d));
  const files = [...roots.flatMap(walk), resolve(CAIRN, 'cli.ts')];

  /** A module names a door if it imports one of the two symbols, or names a corpus subpath. */
  const namesADoor = (src: string): boolean => {
    if (SUBPATHS.some((s) => src.includes(s))) return true;
    for (const m of src.matchAll(/\bimport\b[^;]*?\bfrom\b|\bawait\s+import\s*\([^)]*\)/g)) void m;
    // Any import statement or dynamic-import expression whose bindings mention a door.
    for (const m of src.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from|import\s*\(([^)]*)\)/g)) {
      const text = `${m[1] ?? ''}${m[2] ?? ''}`;
      if (DOORS.some((d) => text.includes(d))) return true;
    }
    // `const { searchGazetteer } = await import(...)` / `core.searchGazetteer(` — the two other
    // ways a module reaches a door without an import binding that carries its name.
    return /(?:\.|\{\s*|,\s*)(?:loadGazetteerFor|searchGazetteer)\b/.test(src);
  };

  const consumers = new Set<string>();
  const sources = new Map<string, string>();
  for (const file of files) {
    const src = stripComments(readFileSync(file, 'utf8'));
    sources.set(file, src);
    if (namesADoor(src)) consumers.add(file);
  }

  // Close over relative imports: a module that imports a consumer by relative path is one too.
  for (let changed = true; changed; ) {
    changed = false;
    for (const [file, src] of sources) {
      if (consumers.has(file)) continue;
      for (const spec of specsOf(file)) {
        if (!isRelative(spec)) continue;
        const base = resolve(dirname(file), spec);
        const target = [base, `${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts')]
          .find((c) => consumers.has(c));
        if (target !== undefined) { consumers.add(file); changed = true; break; }
      }
    }
  }

  const found = [...consumers].map((f) => relative(CAIRN, f).split(sep).join('/')).sort();
  const allowed = GAZETTEER_CONSUMERS.map((c) => c.file).sort();
  assert.deepEqual(
    found,
    allowed,
    '\n  The set of modules that reach the gazetteer corpus is not the set GAZETTEER_CONSUMERS\n' +
      '  names. GeoNames is CC BY 4.0 and this list is where that obligation is written down:\n' +
      `    reaches the corpus : ${JSON.stringify(found)}\n` +
      `    GAZETTEER_CONSUMERS: ${JSON.stringify(allowed)}\n` +
      '  Adding a consumer means adding it HERE, with its reason, in the same increment — and if\n' +
      '  it renders a hit it owes A-91 item 3: the exact Gazetteer.source string and a resolving\n' +
      '  link to https://creativecommons.org/licenses/by/4.0/, in all three picker states.\n',
  );
  for (const c of GAZETTEER_CONSUMERS) {
    assert.ok(c.why.length > 40, `GAZETTEER_CONSUMERS: ${c.file} has no stated reason`);
  }
});
