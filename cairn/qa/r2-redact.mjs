/**
 * Round 2, attack 2 — the redaction GUARANTEE, held to §6.6's own standard:
 * "a rule with a test, not a scrub of the five strings we happened to find".
 *
 * Method: derive the credential set from the real trip mechanically — every token the
 * redactor itself removes — and grep every emitted asset (including .map) for each one.
 * Anything found is a leak the shipped check cannot see, because the shipped bundle check
 * greps only 6 literal strings.
 *
 * Run: npm run web:build && node qa/r2-redact.mjs   (from cairn/)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const redact = await import('../tools/redact.mjs');
const { loadEurope2026 } = await import('../fixtures/loadEurope2026.mjs');
const { toJSON } = await import('../packages/core/src/index.ts');

const CAIRN = resolve(import.meta.dirname, '..');
const line = (s) => console.log('\n== ' + s + ' ==');

const { trip } = loadEurope2026();

line('1. the credential set, derived mechanically from the real trip');
// Every maximal token the redactor removes from a string of the real trip.
const removed = new Set();
for (const s of redact.allStrings(JSON.parse(toJSON(trip)))) {
  if (typeof s !== 'string') continue;
  for (const p of redact.REDACTION_PATTERNS) {
    for (const m of s.matchAll(new RegExp(p.re.source, p.re.flags))) {
      const tok = m[0].trim();
      if (tok.length >= 6) removed.add(tok);
    }
  }
}
console.log(`  ${removed.size} distinct credential-shaped tokens in the real trip`);
console.log(`  KNOWN_LEAKS covers ${redact.KNOWN_LEAKS.length} literal strings`);
const sample = [...removed].slice(0, 14);
for (const t of sample) console.log('   ', JSON.stringify(t.slice(0, 70)));

line('2. grep every built asset for each of them');
const dist = resolve(CAIRN, 'apps/web/dist');
if (!existsSync(dist)) {
  console.log('  dist absent — run npm run web:build first');
  process.exit(1);
}
const files = [];
const walk = (d) => {
  for (const n of readdirSync(d, { withFileTypes: true })) {
    const full = join(d, n.name);
    if (n.isDirectory()) walk(full);
    else files.push(full);
  }
};
walk(dist);
console.log('  assets:', files.map((f) => f.replace(dist + '/', '')).join(', '));
const texts = files.map((f) => [f, readFileSync(f, 'utf8')]);
const leaks = [];
for (const tok of removed) {
  for (const [f, text] of texts) {
    if (text.includes(tok)) leaks.push([f.replace(CAIRN + '/', ''), tok]);
  }
}
console.log(`  LEAKS FOUND: ${leaks.length}`);
for (const [f, tok] of leaks.slice(0, 40)) console.log(`    ${f}: ${JSON.stringify(tok.slice(0, 90))}`);

line('3. what the shipped test would say about the same assets');
const known = [];
for (const leak of redact.KNOWN_LEAKS) for (const [f, text] of texts) if (text.includes(leak)) known.push([f, leak]);
console.log(`  KNOWN_LEAKS hits: ${known.length}`, known.map(([f, l]) => l).join(', '));

line('4. does the shipped bundle check apply the PATTERNS to the bundle, as §6.6 says?');
const testSrc = readFileSync(resolve(CAIRN, 'test/redact.test.ts'), 'utf8');
const bundleTest = testSrc.slice(testSrc.indexOf('the built bundle carries none'));
console.log('  redactionHits used on bundle text? ', /redactionHits/.test(bundleTest.slice(0, 2000)));
console.log('  KNOWN_LEAKS used on bundle text?   ', /KNOWN_LEAKS/.test(bundleTest.slice(0, 2000)));

line('5. other build artifacts and sources of trip data');
for (const p of ['apps/web/src/sample/europe2026.json', 'apps/web/dist/index.html']) {
  const full = resolve(CAIRN, p);
  if (!existsSync(full)) { console.log(`  ${p}: absent`); continue; }
  const text = readFileSync(full, 'utf8');
  const hit = [...removed].filter((t) => text.includes(t));
  console.log(`  ${p}: ${hit.length} credential tokens`, hit.slice(0, 5));
}
const gi = readFileSync(resolve(CAIRN, '.gitignore'), 'utf8');
console.log('  .gitignore:', JSON.stringify(gi));

line('6. is the generated sample still recognisable / usable?');
const sampleJson = JSON.parse(readFileSync(resolve(CAIRN, 'apps/web/src/sample/europe2026.json'), 'utf8'));
const notes = sampleJson.days.flatMap((d) => d.stops).map((s) => s.note).filter(Boolean);
console.log('  redacted notes containing [redacted]:', notes.filter((n) => n.includes('[redacted]')).length, 'of', notes.length);
console.log('  example:', JSON.stringify(notes.find((n) => n.includes('[redacted]'))?.slice(0, 160)));

line('7. bypass hunt — credential-shaped text the PATTERNS do not catch');
const survivors = [];
for (const s of redact.allStrings(JSON.parse(toJSON(trip)))) {
  const after = redact.redactText(s);
  // 3-5 digit runs (a door PIN with no keyword), lowercase refs, hyphenated refs
  for (const re of [/\b\d{3,5}\b/g, /\b[a-z0-9]*\d[a-z0-9]{5,}\b/g, /\b[A-Z0-9]{2,5}-[A-Z0-9]{2,6}\b/g]) {
    for (const m of after.matchAll(re)) survivors.push([re.source, m[0], after.slice(Math.max(0, m.index - 40), m.index + 40)]);
  }
}
const uniq = new Map();
for (const [re, tok, ctx] of survivors) if (!uniq.has(tok)) uniq.set(tok, [re, ctx]);
console.log(`  ${uniq.size} distinct tokens survive redaction in the sample:`);
for (const [tok, [re, ctx]] of [...uniq].slice(0, 25)) console.log(`    ${JSON.stringify(tok)}  …${ctx.replace(/\n/g, ' ')}…`);
