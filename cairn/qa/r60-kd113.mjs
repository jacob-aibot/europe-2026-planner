/**
 * R60 — KD-113 re-derived. The builder's disclosure rests on ONE measured claim:
 *
 *   > "Measured, and N3 as written does not fail. `'İ'.normalize('NFD') === 'İ'` — U+0130 LATIN
 *   >  CAPITAL LETTER I WITH DOT ABOVE has **no canonical decomposition**"
 *
 * and asks the architect to write that sentence into A-82 Part 3. Re-derive it from the codepoint
 * rather than from a pasted glyph, then re-run the builder's own six-ordering table.
 *
 * Run: node qa/r60-kd113.mjs        (from cairn/)
 */
const I_DOT = String.fromCodePoint(0x0130); // İ  LATIN CAPITAL LETTER I WITH DOT ABOVE
const cps = (s) => [...s].map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(' ');

console.log('## A — does U+0130 decompose under NFD?');
console.log(`  input            ${cps(I_DOT)}`);
console.log(`  .normalize('NFD') ${cps(I_DOT.normalize('NFD'))}`);
console.log(`  .normalize('NFKD') ${cps(I_DOT.normalize('NFKD'))}`);
console.log(`  .toLowerCase()    ${cps(I_DOT.toLowerCase())}`);
console.log('');
const claim = I_DOT.normalize('NFD') === I_DOT;
console.log(`  KD-113 claims  'İ'.normalize('NFD') === 'İ'   -> measured: ${claim}`);
console.log(
  claim
    ? '  KD-113\'s premise HOLDS on this runtime.'
    : `  KD-113's premise is FALSE on this runtime: U+0130 DOES have a canonical decomposition,\n` +
      `  ${cps(I_DOT)} -> ${cps(I_DOT.normalize('NFD'))} (Unicode DerivedNormalizationProps: 0130 ; 0049 0307).\n` +
      '  N3-as-specified still stays green, but NOT for the reason KD-113 gives — it stays green\n' +
      "  because 'I' + U+0307 lowercases to 'i' + U+0307, so the Mn strip still has its mark.",
);
console.log(`  Node ${process.version}, ICU ${process.config?.variables?.icu_small ? 'small' : 'full'}`);

console.log('');
console.log('## B — the six orderings KD-113 tabulates, re-run');
const SUB = {
  'ł': 'l', 'ø': 'o', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ß': 'ss',
  'æ': 'ae', 'œ': 'oe', 'ı': 'i', 'ħ': 'h', 'ŀ': 'l', 'ʻ': '', 'ʼ': '',
};
const lower = (s) => s.toLowerCase();
const sub = (s) => { let o = ''; for (const c of s) o += SUB[c] ?? c; return o; };
const nfd = (s) => s.normalize('NFD');
const strip = (s) => s.replace(/\p{Mn}/gu, '');
const tail = (s) => s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const pipe = (...fns) => (s) => tail(fns.reduce((acc, f) => f(acc), s));

const PAIRS = [
  ['Zürich', 'zurich'], ['São Paulo', 'sao paulo'], ['Łódź', 'lodz'], ['Malmö', 'malmo'],
  ['Tromsø', 'tromso'], ['Bærum', 'baerum'], ['Ağrı', 'agri'], ['İstanbul', 'istanbul'],
  ['Đông Hà', 'dong ha'], ['Bắc Kạn', 'bac kan'], ['Nukuʻalofa', 'nukualofa'],
  ['Ciudad Juárez', 'ciudad juarez'],
];
const ORDERS = [
  ['lower -> sub -> NFD -> strip   (SHIPPED)', pipe(lower, sub, nfd, strip)],
  ['NFD -> lower -> sub -> strip   (N3 as specified)', pipe(nfd, lower, sub, strip)],
  ['lower -> NFD -> sub -> strip', pipe(lower, nfd, sub, strip)],
  ['sub -> lower -> NFD -> strip', pipe(sub, lower, nfd, strip)],
  ['NFD -> sub -> lower -> strip', pipe(nfd, sub, lower, strip)],
  ['no NFD at all', pipe(lower, sub, strip)],
  ['lower -> sub -> NFD (no strip) — KD-113\'s CORRECTED N3 is the mirror of this', pipe(lower, sub, nfd)],
  ['sub -> NFD -> strip -> lower   (KD-113\'s corrected N3: toLowerCase LAST)', pipe(sub, nfd, strip, lower)],
];
for (const [label, fn] of ORDERS) {
  const bad = PAIRS.filter(([i, w]) => fn(i) !== w);
  console.log(`  ${bad.length === 0 ? 'all 12 pass' : `fails ${bad.length}`.padEnd(11)}  ${label}`);
  for (const [i, w] of bad) console.log(`        ${i} -> ${JSON.stringify(fn(i))} (want ${JSON.stringify(w)})`);
}

console.log('');
console.log('## C — is A-82 Part 3\'s ORDERING RULE load-bearing at all, and where?');
console.log('  step 1 before step 2 :',
  pipe(sub, lower, nfd, strip)('Łódź') === 'lodz' ? 'NOT load-bearing' : 'LOAD-BEARING (Ł survives a substitution that runs first)');
console.log('  step 1 before step 4 :',
  pipe(sub, nfd, strip, lower)('İstanbul') === 'istanbul' ? 'NOT load-bearing' : 'LOAD-BEARING (the mark toLowerCase mints must still be there)');
console.log('  step 1 before step 3 (A-82\'s own stated reason) :',
  pipe(nfd, lower, sub, strip)('İstanbul') === 'istanbul'
    ? 'NOT load-bearing — this is KD-113\'s correct conclusion'
    : 'LOAD-BEARING');
console.log('  step 2 before step 3 :',
  pipe(lower, nfd, sub, strip)('Tromsø') === 'tromso' ? 'NOT load-bearing for ø on this table' : 'LOAD-BEARING');
