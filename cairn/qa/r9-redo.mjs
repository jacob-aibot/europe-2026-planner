/**
 * Round 9 — **R9-1** in real Chromium: the retirement ledger vs. **Redo**.
 *
 * `qa/r8-undo.mjs`'s sequence, continued by three more real user actions:
 *
 *   dismiss -> put the data back (retire) -> Ctrl+Z (conflict live, correctly NOT dismissed)
 *   -> "Not a problem" a SECOND time  (A-5a: correctly sticks)
 *   -> Ctrl+Z                          (the user takes that dismissal back)
 *   -> Ctrl+Shift+Z                    (the user changes their mind again)
 *
 * The last step must restore the dismissal. It does not: `store.redo()` (`store.ts:672`) does
 * not call `releaseRetirement`, unlike `dispatch` (`store.ts:659`), and the intervening
 * `undo` re-acquired the mark from a document that then held only the retired row — so the
 * redone live row is stamped `retiredAt` inside the same `set()` and the conflict renders
 * unresolved. The row is retired in the document permanently; no further edit brings it back.
 *
 * Needs `npm run web:build && node tools/serve.mjs` in one shell, then:
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r9-redo.mjs
 *
 * Not timing-dependent: a deterministic click/key sequence, not a race.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : '')); };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.route('**tile.openstreetmap.org/**', (r) => r.abort());
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await p.locator('button').filter({ hasText: /Europe 2026/ }).first().click().catch(() => {});
await p.waitForTimeout(1600);

const STOP = 'City Airport Train';
const DAY = /^08-08/;
const rows = () => p.locator('li.conflict').filter({ hasText: 'booking_vs_plan' });
const openStop = async () => {
  await p.getByRole('tab', { name: /^Day$/ }).click();
  await p.waitForTimeout(400);
  await p.locator('button').filter({ hasText: DAY }).first().click();
  await p.waitForTimeout(500);
  await p.locator('.stop').filter({ hasText: STOP }).first().locator('button[title="Edit"]').click();
  await p.waitForTimeout(400);
  return p.locator('form.editor').first();
};
const conflicts = async () => {
  await p.getByRole('tab', { name: /^Conflicts/ }).click();
  await p.waitForTimeout(700);
  return rows().count();
};
const rowText = async () => (await rows().count()) ? (await rows().first().innerText()).replace(/\n/g, ' ') : '';
const timeField = (form) => form.locator('input').nth(1);
const key = async (k) => {
  await p.getByRole('tab', { name: /^Day$/ }).click();
  await p.waitForTimeout(300);
  await p.locator('body').click({ position: { x: 5, y: 200 } }).catch(() => {});
  await p.keyboard.press(k);
  await p.waitForTimeout(900);
};

ok('precondition: no booking_vs_plan on the unmodified trip', (await conflicts()) === 0);

let form = await openStop();
const original = await timeField(form).inputValue();
await timeField(form).fill('21:45');
await form.locator('button[type="submit"]').click();
await p.waitForTimeout(700);
ok('the conflict appears', (await conflicts()) === 1);

await rows().first().locator('button', { hasText: 'Not a problem' }).click();
await p.waitForTimeout(500);
ok('the user dismisses it', /Marked\s+dismissed/i.test(await rowText()));

form = await openStop();
await timeField(form).fill(original);
await form.locator('button[type="submit"]').click();
await p.waitForTimeout(800);
ok('putting it back removes the conflict (and retires the resolution)', (await conflicts()) === 0);

await key('Control+z');
let n = await conflicts();
ok('A-5/R8-1: Ctrl+Z brings the conflict back LIVE, not "Marked dismissed"',
   n === 1 && !/Marked\s+dismissed/i.test(await rowText()), (await rowText()).slice(0, 160));

// ---- the second dismissal — A-5a's own case, through the shipped button ----
await rows().first().locator('button', { hasText: 'Not a problem' }).click();
await p.waitForTimeout(600);
ok('A-5a/KD-36: the SECOND "Not a problem" sticks', /Marked\s+dismissed/i.test(await rowText()),
   (await rowText()).slice(0, 160));

// ---- the crossing: undo that dismissal, then redo it ----
await key('Control+z');
await conflicts();
ok('Ctrl+Z takes the second dismissal back (conflict unresolved)',
   !/Marked\s+dismissed/i.test(await rowText()), (await rowText()).slice(0, 160));

await key('Control+Shift+z');   // App.tsx:33 — the app's own redo shortcut
n = await conflicts();
const after = await rowText();
console.log('  after Ctrl+Shift+Z: ' + n + ' row(s) — ' + JSON.stringify(after.slice(0, 200)));
ok('R9-1: Ctrl+Shift+Z restores the dismissal the user just took back',
   n === 1 && /Marked\s+dismissed/i.test(after),
   'the redone `resolveConflict` row is stamped retired inside the same `set()` — `redo` does not '
   + 'release the ledger mark that the preceding `undo` re-acquired (store.ts:672 vs :659)');

// It is not a rendering blip: the row is retired in the document, so it stays gone.
await p.getByRole('tab', { name: /^Trip$/ }).click().catch(() => {});
await p.waitForTimeout(400);
await conflicts();
ok('R9-1b: ...and it is still not dismissed after a re-render', /Marked\s+dismissed/i.test(await rowText()),
   (await rowText()).slice(0, 160));

console.log('  page errors: ' + (errors.length ? errors.join(' | ') : 'none'));
await browser.close();
console.log(`\n== ${fails} FAIL ==`);
