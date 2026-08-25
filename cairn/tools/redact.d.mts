/**
 * Declarations for `tools/redact.mjs`. The tool itself is `.mjs` by design — it runs from
 * `gen-sample.mjs` at build time with no compile step — so the types live here, the same
 * arrangement as `fixtures/loadEurope2026.d.mts`.
 */
export type RedactionPattern = { id: string; why: string; re: RegExp };

export declare const REDACTION_PATTERNS: RedactionPattern[];
export declare const REDACTED: string;
export declare const KNOWN_LEAKS: string[];
export declare const STRUCTURAL_KEYS: Set<string>;

export declare function redactText(text: string): string;
export declare function redactionHits(text: string): string[];
export declare function allStrings(value: unknown, out?: string[]): string[];
export declare function redactStringsDeep<T>(value: T, key?: string): T;
export declare function redactForSample<T>(trip: T): T;
