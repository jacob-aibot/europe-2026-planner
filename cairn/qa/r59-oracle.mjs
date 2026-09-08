/**
 * QA round 59 — a TYPE-LEVEL ORACLE for A-80's coverage claim.
 *
 * `qa/r59-descent.sh` costs a full `tsc` per shape (~5.5 s). That is the right instrument for
 * *harm* — it runs the real censuses over the real tree — and the wrong one for *breadth*. This
 * script instead loads the TypeScript compiler as a library, resolves `Carries<Shape>` for ~150
 * shapes in one program, and prints the verdict for each. Whole run: ~4 s.
 *
 * The predicate is copied VERBATIM from `packages/core/test/storable.test.ts` (see PRED below);
 * `Trip` is a local branded stand-in, which is sound because every question here is about TYPE
 * CONSTRUCTORS and `IsExact<X, Trip>` behaves identically for any distinct object type. Any row
 * this file calls a gap is then re-run through `qa/r59-descent.sh` against the real tree before it
 * is filed — nothing here is filed on the oracle's word alone.
 *
 * Three predicates are evaluated side by side:
 *   ship  — the shipped `Carries` at 386c459
 *   noNN  — the same with `NonNullable<T[K]>` reverted to `T[K]` in `Members` (the I-19 builder's
 *           disclosed objection: R59-4)
 *   fix   — a CANDIDATE repair, offered as a measurement and not as a patch: ask `IsDoor` of every
 *           union MEMBER rather than of the whole union, and try all three `CarriesOne` arms
 *           rather than letting the first matching one win (R59-1, R59-2)
 *
 * Usage:  node qa/r59-oracle.mjs                 # from cairn/
 *         node qa/r59-oracle.mjs --all           # print every row, not just the interesting ones
 */
import ts from 'typescript';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PRED = `
declare const TRIP_BRAND: unique symbol;
type Trip = { [TRIP_BRAND]: true; id: string; days: number[] };
type ConflictResolution = { id: string };
type Day = { id: string; date: string };

// --- verbatim from packages/core/test/storable.test.ts @386c459 ---
type IsExact<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type TripishReturn<F> = F extends (...a: never[]) => infer R ? Exclude<Awaited<R>, null | undefined> : never;
type IsDoor<F> = IsExact<TripishReturn<F>, Trip>;
type Down = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
type Members<T, D extends number> =
  true extends { [K in keyof T]-?: Carries<NonNullable<T[K]>, D> }[keyof T] ? true : false;
type ProducesTrip<R> = IsExact<Exclude<Awaited<R>, null | undefined>, Trip>;
type Carries<T, D extends number = 12> =
  [D] extends [never] ? false :
    IsDoor<T> extends true ? true :
      true extends (T extends unknown ? CarriesOne<T, D> : never) ? true : false;
type CarriesOne<T, D extends number> =
  [T] extends [(...a: never[]) => infer R]
    ? (Carries<Awaited<R>, Down[D]> extends true ? true : Members<T, Down[D]>)
    : [T] extends [abstract new (...a: never[]) => infer I]
      ? (ProducesTrip<I> extends true ? true
        : Carries<I, Down[D]> extends true ? true : Members<T, Down[D]>)
      : [T] extends [object] ? Members<T, Down[D]> : false;

// --- R59-4: the same, with NonNullable<T[K]> reverted to T[K] ---
type MembersN<T, D extends number> =
  true extends { [K in keyof T]-?: CarriesN<T[K], D> }[keyof T] ? true : false;
type CarriesN<T, D extends number = 12> =
  [D] extends [never] ? false :
    IsDoor<T> extends true ? true :
      true extends (T extends unknown ? CarriesOneN<T, D> : never) ? true : false;
type CarriesOneN<T, D extends number> =
  [T] extends [(...a: never[]) => infer R]
    ? (CarriesN<Awaited<R>, Down[D]> extends true ? true : MembersN<T, Down[D]>)
    : [T] extends [abstract new (...a: never[]) => infer I]
      ? (ProducesTrip<I> extends true ? true
        : CarriesN<I, Down[D]> extends true ? true : MembersN<T, Down[D]>)
      : [T] extends [object] ? MembersN<T, Down[D]> : false;

// --- R59-1 / R59-2: a CANDIDATE repair, measured not shipped ---
type MembersF<T, D extends number> =
  true extends { [K in keyof T]-?: CarriesF<T[K], D> }[keyof T] ? true : false;
type CarriesF<T, D extends number = 12> =
  [D] extends [never] ? false :
    true extends (T extends unknown
      ? (IsDoor<T> extends true ? true : CarriesOneF<T, D>)
      : never) ? true : false;
type CallSideF<T, D extends number> =
  [T] extends [(...a: never[]) => infer R] ? CarriesF<Awaited<R>, Down[D]> : false;
type CtorSideF<T, D extends number> =
  [T] extends [abstract new (...a: never[]) => infer I]
    ? (ProducesTrip<I> extends true ? true : CarriesF<I, Down[D]>) : false;
type CarriesOneF<T, D extends number> =
  CallSideF<T, D> extends true ? true
    : CtorSideF<T, D> extends true ? true
      : [T] extends [object] ? MembersF<T, Down[D]> : false;

type Door = (t: Trip, r: ConflictResolution) => Trip;
type Doorless = (t: Trip, r: ConflictResolution) => string[];
type Inert = (t: Trip) => void;
declare const DESCENT_SYM: unique symbol;
type RecursiveWithDoor = { readonly next?: RecursiveWithDoor; readonly run?: Door };
type RecursiveDoorless = { readonly next?: RecursiveDoorless; readonly run?: Doorless };
declare abstract class AbsFactory { static make(): { archive: Door }; }
declare class Concrete { static make(): Concrete; archive(t: Trip, r: ConflictResolution): Trip; }
declare class Priv { #x: number; archive(t: Trip, r: ConflictResolution): Trip; }
interface SelfRef { child: SelfRef | null; run?: Door }
interface Chainable { chain(): this; run: Door }
type Flatten<T> = T extends readonly (infer E)[] ? Flatten<E> : T;
type D11 = {a?:{b?:{c?:{d?:{e?:{f?:{g?:{h?:{i?:{j?:{k?:Door}}}}}}}}}}};
type D12 = {a:{b:{c:{d:{e:{f:{g:{h:{i:{j:{k:{run:Door}}}}}}}}}}}};
type D13 = {a:{b:{c:{d:{e:{f:{g:{h:{i:{j:{k:{l:{run:Door}}}}}}}}}}}}};
`;

/** [label, type, expected-under-a-CORRECT-predicate]. `true` = a door is genuinely reachable. */
const ROWS = [
  // ---- the 33 DESCENT_CENSUS positives, re-derived independently of the shipped table ----
  ['census property-required', '{ run: Door }', true],
  ['census property-required NEG', '{ run: Doorless }', false],
  ['census property-optional', '{ run?: Door }', true],
  ['census property-optional NEG', '{ run?: Doorless }', false],
  ['census property-optional-nested', '{ a?: { b?: { run: Door } } }', true],
  ['census property-optional-nested NEG', '{ a?: { b?: { run: Doorless } } }', false],
  ['census property-readonly-getter', '{ readonly a?: { get run(): Door } }', true],
  ['census property-readonly-getter NEG', '{ readonly a?: { get run(): Doorless } }', false],
  ['census property-symbol-key', '{ [DESCENT_SYM]: Door }', true],
  ['census property-symbol-key NEG', '{ [DESCENT_SYM]: Doorless }', false],
  ['census index-signature-string', '{ [k: string]: Door }', true],
  ['census index-signature-string NEG', '{ [k: string]: Doorless }', false],
  ['census index-signature-symbol', '{ [k: symbol]: Door }', true],
  ['census index-signature-symbol NEG', '{ [k: symbol]: Doorless }', false],
  ['census array', 'Door[]', true],
  ['census array NEG', 'Doorless[]', false],
  ['census readonly-array', 'readonly Door[]', true],
  ['census readonly-array NEG', 'readonly Doorless[]', false],
  ['census tuple', '[string, Door]', true],
  ['census tuple NEG', '[string, number]', false],
  ['census union-non-object-member', '{ run: Door } | undefined', true],
  ['census union-non-object-member NEG', '{ run: Doorless } | undefined', false],
  ['census union-null', '{ run: Door } | null', true],
  ['census union-null NEG', '{ run: Doorless } | null', false],
  ['census discriminated-union', "{ kind: 'a'; run: Door } | { kind: 'n'; why: string }", true],
  ['census discriminated-union NEG', "{ kind: 'a'; run: Doorless } | { kind: 'n'; why: string }", false],
  ['census intersection', '{ x: string } & { run: Door }', true],
  ['census intersection NEG', '{ x: string } & { run: Doorless }', false],
  ['census call-signature-return', '() => Door', true],
  ['census call-signature-return NEG', '() => Doorless', false],
  ['census call-signature-return-promise', '() => Promise<{ run: Door }>', true],
  ['census call-signature-return-promise NEG', '() => Promise<{ run: Doorless }>', false],
  ['census call-signature-own-property', '(() => string) & { run: Door }', true],
  ['census call-signature-own-property NEG', '(() => string) & { run: Doorless }', false],
  ['census construct-signature-instance', 'new () => { archive: Door }', true],
  ['census construct-signature-instance NEG', 'new () => { archive: Doorless }', false],
  ['census construct-signature-produces-trip', 'new (t: Trip, r: ConflictResolution) => Trip', true],
  ['census construct-signature-produces-trip NEG', 'new (t: Trip, r: ConflictResolution) => string[]', false],
  ['census promise', 'Promise<{ run: Door }>', true],
  ['census promise NEG', 'Promise<{ run: Doorless }>', false],
  ['census iterable', 'Iterable<Door>', true],
  ['census iterable NEG', 'Iterable<Doorless>', false],
  ['census async-iterable', 'AsyncIterable<Door>', true],
  ['census async-iterable NEG', 'AsyncIterable<Doorless>', false],
  ['census generator', 'Generator<Door>', true],
  ['census generator NEG', 'Generator<Doorless>', false],
  ['census set', 'Set<Door>', true],
  ['census set NEG', 'Set<Doorless>', false],
  ['census readonly-set', 'ReadonlySet<Door>', true],
  ['census readonly-set NEG', 'ReadonlySet<Doorless>', false],
  ['census map-door-value', 'Map<string, Door>', true],
  ['census map-door-value NEG', 'Map<string, Doorless>', false],
  ['census map-carrier-value', 'Map<string, { run: Door }>', true],
  ['census map-carrier-value NEG', 'Map<string, { run: Doorless }>', false],
  ['census weakmap', 'WeakMap<object, { run: Door }>', true],
  ['census weakmap NEG', 'WeakMap<object, { run: Doorless }>', false],
  ['census record', 'Record<string, { a?: { run: Door } }>', true],
  ['census record NEG', 'Record<string, { a?: { run: Doorless } }>', false],
  ['census partial', 'Partial<{ run: Door }>', true],
  ['census partial NEG', 'Partial<{ run: Doorless }>', false],
  ['census readonly-mapped', 'Readonly<{ run: Door }>', true],
  ['census readonly-mapped NEG', 'Readonly<{ run: Doorless }>', false],
  ['census pick', "Pick<{ run: Door; x: string }, 'run'>", true],
  ['census pick NEG', "Pick<{ run: Doorless; x: string }, 'run'>", false],
  ['census recursive-type', 'RecursiveWithDoor', true],
  ['census recursive-type NEG', 'RecursiveDoorless', false],
  ['census NONDESCENT parameter-position', '(cb: Door) => void', false],
  ['census NONDESCENT overload-last-not-trip', '{ (t: Trip, r: ConflictResolution): Trip; (t: Trip): string }', false],

  // ---- R59-1: the door IS the union member, not one hop below it ----
  ['R59-1 Door | Inert', 'Door | Inert', true],
  ['R59-1 Door | Doorless', 'Door | Doorless', true],
  ['R59-1 Door | ((t: Trip) => Day)', 'Door | ((t: Trip) => Day)', true],
  ['R59-1 { run: Door | Inert }', '{ run: Door | Inert }', true],
  ['R59-1 { autofix?: Door | Inert }  (N9/N11 sideways)', '{ id: string; autofix?: Door | Inert }', true],
  ['R59-1 (Door | Inert)[]', '(Door | Inert)[]', true],
  ['R59-1 Record<string, Door | Inert>', 'Record<string, Door | Inert>', true],
  ['R59-1 Map<string, Door | Inert>', 'Map<string, Door | Inert>', true],
  ['R59-1 Promise<Door | Inert>', 'Promise<Door | Inert>', true],
  ['R59-1 () => Door | Inert', '() => Door | Inert', true],
  ['R59-1 discriminated { run: Door | Inert }', "{ kind: 'a'; run: Door | Inert } | { kind: 'n'; why: string }", true],
  ['R59-1 { a?: { b?: Door | Inert } }', '{ a?: { b?: Door | Inert } }', true],
  ['R59-1 get a(): Door | Inert', '{ get a(): Door | Inert }', true],
  ["R59-1 ({a: Door} | {a: Doorless})['a']", "({ a: Door } | { a: Doorless })['a']", true],
  ['R59-1 CONTROL Door | undefined', 'Door | undefined', true],
  ['R59-1 CONTROL Door | string', 'Door | string', true],
  ['R59-1 CONTROL Door | ((t: Trip) => Promise<Trip>)', 'Door | ((t: Trip) => Promise<Trip>)', true],
  ['R59-1 NEG Inert | Doorless', 'Inert | Doorless', false],
  ['R59-1 CONTROL {run: Door} | {why: string}', '{ run: Door } | { why: string }', true],

  // ---- R59-2: CarriesOne's arms are ordered, so the first match wins ----
  ['R59-2 { (): string; new (): Trip }', '{ (): string; new (): Trip }', true],
  ['R59-2 { (): string; new (): {archive: Door} }', '{ (): string; new (): { archive: Door } }', true],
  ['R59-2 CONTROL { new (): {archive: Door} }', '{ new (): { archive: Door } }', true],
  ['R59-2 NEG { (): string; new (): {archive: Doorless} }', '{ (): string; new (): { archive: Doorless } }', false],
  ['R59-2 CONTROL members still walked', '{ (): string; new (): Trip; extra: Door }', true],

  // ---- R59-3: a union RETURN (A-78 Part 2's illegal shape) below the top level ----
  ['R59-3 { archive(t: Trip): Trip | Day }', '{ archive(t: Trip): Trip | Day }', true],
  ['R59-3 { autofix?(t: Trip): Trip | Day }', '{ id: string; autofix?(t: Trip): Trip | Day }', true],
  ['R59-3 CONTROL (t: Trip) => Trip | null', '{ archive(t: Trip): Trip | null }', true],

  // ---- construct-signature variations A-80/I-19 did not measure ----
  ['ctor abstract class + static factory', 'typeof AbsFactory', true],
  ['ctor class static factory -> instance door', 'typeof Concrete', true],
  ['ctor generic', 'new <X>(x: X) => { archive: Door }', true],
  ['ctor no trip args, instance has door', 'new (n: number) => { archive: Door }', true],
  ['ctor instance method returns Promise<Trip>', 'new () => { go(): Promise<Trip> }', true],
  ['ctor abstract new produces Trip', 'abstract new () => Trip', true],
  ['ctor private-field class instance', 'Priv', true],
  ['ctor private-field class static side', 'typeof Priv', true],
  ['ctor InstanceType<>', 'InstanceType<typeof Priv>', true],

  // ---- the rest of the language, swept for a constructor the census has no row for ----
  ['generator TReturn', 'Generator<string, Door>', true],
  ['generator TReturn NEG', 'Generator<string, Doorless>', false],
  ['iterator TReturn', 'Iterator<string, Door>', true],
  ['Promise<Door>', 'Promise<Door>', true],
  ['Map KEY position', 'Map<Door, string>', true],
  ['Map KEY position NEG', 'Map<Doorless, string>', false],
  ['mapped type with `as` key remap', "{ [K in 'a' as `on${K}`]: Door }", true],
  ['mapped type with `as` NEG', "{ [K in 'a' as `on${K}`]: Doorless }", false],
  ['conditional type', 'string extends string ? { run: Door } : never', true],
  ['recursive conditional (Flatten)', 'Flatten<Door[][][]>', true],
  ['variadic tuple head', '[string, ...Door[]]', true],
  ['variadic tuple tail', '[...Door[], string]', true],
  ['readonly tuple', 'readonly [string, Door]', true],
  ['optional tuple element', '[string, Door?]', true],
  ['named tuple element', '[label: string, fn: Door]', true],
  ['`this` return type', 'Chainable', true],
  ['indexed access', "{ a: { run: Door } }['a']", true],
  ['keyof over a door-bearing type', '{ run: Door }[]["length"]', false],
  ['getter/setter pair', '{ get run(): Door; set run(v: Door) }', true],
  ['setter only', '{ set run(v: Door) }', true],
  ['readonly index signature', '{ readonly [k: string]: Door }', true],
  ['number index signature', '{ [k: number]: Door }', true],
  ['template-literal index signature', 'Record<`rule_${string}`, Door>', true],
  ['nested Promise', 'Promise<Promise<{ run: Door }>>', true],
  ['array of arrays', 'Door[][]', true],
  ['branded door (unique symbol)', 'Door & { readonly x: 1 }', true],
  ['Omit', "Omit<{ run: Door; x: string }, 'x'>", true],
  ['Required<Partial>', 'Required<{ run?: Door }>', true],
  ['ArrayLike', 'ArrayLike<Door>', true],
  ['IterableIterator', 'IterableIterator<Door>', true],
  ['AsyncGenerator', 'AsyncGenerator<{ run: Door }>', true],
  ['Symbol.iterator custom', '{ [Symbol.iterator](): Iterator<Door> }', true],
  ['Symbol.asyncIterator custom', '{ [Symbol.asyncIterator](): AsyncIterator<Door> }', true],
  ['self-referential interface', 'SelfRef', true],
  ['awaited custom thenable behind a return', '() => { then(cb: (v: { run: Door }) => void): void }', true],
  ['custom thenable NOT behind a return', '{ then(cb: (v: { run: Door }) => void): void }', false],
  ['`this` PARAMETER (non-descent)', '(this: { run: Door }, x: number) => void', false],
  ['parameters only (non-descent)', '{ register(cb: Door): void; unregister(cb: Door): void }', false],
  ['generic constraint (non-descent)', '<T extends Door>(x: T) => void', false],
  ['WeakSet (no output side)', 'WeakSet<{ run: Door }>', false],
  ['intersection of callables, door last', 'Doorless & Door', true],
  ['intersection of callables, door first', 'Door & Doorless', false],
  ['depth 11 optional chain', 'D11', true],
  ['depth 12 property chain', 'D12', true],
  ['depth 13 property chain (over budget)', 'D13', false],
  ['any (outside the claim)', '{ a: any }', false],
  ['unknown (outside the claim)', '{ a: unknown }', false],
];

const dir = mkdtempSync(join(tmpdir(), 'r59-oracle-'));
const file = join(dir, 'probe.ts');
const decls = ROWS.map(([, t], i) => [
  `type Q${i}_ship = Carries<${t}>;`,
  `type Q${i}_noNN = CarriesN<${t}>;`,
  `type Q${i}_fix  = CarriesF<${t}>;`,
].join('\n')).join('\n');
writeFileSync(file, `${PRED}\ntype _keep = Day | ConflictResolution;\n${decls}\n`);

const program = ts.createProgram([file], {
  target: ts.ScriptTarget.ES2023,
  lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'],
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true, noEmit: true, skipLibCheck: true, noErrorTruncation: true,
});
const checker = program.getTypeChecker();
const sf = program.getSourceFile(file);
const verdicts = new Map();
for (const stmt of sf.statements) {
  if (ts.isTypeAliasDeclaration(stmt) && /^Q\d+_/.test(stmt.name.text)) {
    verdicts.set(stmt.name.text.trim(), checker.typeToString(checker.getTypeAtLocation(stmt.type)));
  }
}
const errs = ts.getPreEmitDiagnostics(program, sf).filter((d) => d.file?.fileName === file);
for (const d of errs) console.log(`DIAG ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
rmSync(dir, { recursive: true, force: true });

const all = process.argv.includes('--all');
let shipGaps = 0; let shipFalsePos = 0; let nnDiff = 0; let fixGaps = 0;
console.log('label'.padEnd(52), 'want   ship   noNN   fix');
for (let i = 0; i < ROWS.length; i++) {
  const [label, , want] = ROWS[i];
  const ship = verdicts.get(`Q${i}_ship`);
  const noNN = verdicts.get(`Q${i}_noNN`);
  const fix = verdicts.get(`Q${i}_fix`);
  const shipWrong = ship !== String(want);
  if (shipWrong) (want ? shipGaps++ : shipFalsePos++);
  if (ship !== noNN) nnDiff++;
  if (fix !== String(want)) fixGaps++;
  if (all || shipWrong || ship !== noNN || fix !== String(want)) {
    const mark = shipWrong ? (want ? 'GAP ' : 'FP  ') : 'ok  ';
    console.log(mark + label.padEnd(48), String(want).padEnd(6), String(ship).padEnd(6), String(noNN).padEnd(6), String(fix));
  }
}
console.log(`
rows                                   ${ROWS.length}
shipped predicate MISSES a real door    ${shipGaps}    <- R59-1 / R59-2 / R59-3
shipped predicate FALSE-POSITIVES       ${shipFalsePos}
rows where removing NonNullable changes ${nnDiff}    <- R59-4: zero means it is not load-bearing
candidate repair still wrong            ${fixGaps}    <- both are R59-3, which is a defect in
                                             ILLEGAL_SHAPE_CENSUS's REACH, not in \`Carries\`; no
                                             change to the predicate can close it`);
process.exit(shipGaps + shipFalsePos === 0 ? 0 : 1);
