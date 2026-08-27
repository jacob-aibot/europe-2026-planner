/**
 * Round 8 — **R8-1** in real Chromium: `syncResolutions` × the undo stack (§2.7).
 *
 * The same sequence as `qa/r8-views.mjs` §4, except the last leg returns the data to its old
 * value with **Ctrl+Z** — the app's own global shortcut (`App.tsx:27`) — instead of with a
 * fresh edit. `store.undo()` restores a PRE-RETIREMENT snapshot, so `retiredAt` goes back to
 * `null` and the returning blocker renders *"Marked dismissed"*: §2.7's *"never un-retires"*,
 * violated through the one path B-2 did not cross.
 *
 * Needs `npm run web:build && node tools/serve.mjs` in one shell, then:
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-undo.mjs
 *
 * Not timing-dependent: it is a deterministic click sequence, not a race.
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
const timeField = (form) => form.locator('input').nth(1);

ok('precondition: no booking_vs_plan on the unmodified trip', (await conflicts()) === 0);

let form = await openStop();
const original = await timeField(form).inputValue();
await timeField(form).fill('21:45');
await form.locator('button[type="submit"]').click();
await p.waitForTimeout(700);
ok('the conflict appears', (await conflicts()) === 1);

await rows().first().locator('button', { hasText: 'Not a problem' }).click();
await p.waitForTimeout(500);
ok('the user dismisses it', /Marked\s+dismissed/i.test((await rows().first().innerText())));

// put it back — the conflict goes away and the resolution is retired on the next render
form = await openStop();
await timeField(form).fill(original);
await form.locator('button[type="submit"]').click();
await p.waitForTimeout(800);
ok('putting it back removes the conflict', (await conflicts()) === 0);

// ---- the crossing: Ctrl+Z, the app's own shortcut (App.tsx binds it globally) ----
await p.getByRole('tab', { name: /^Day$/ }).click();
await p.waitForTimeout(300);
await p.locator('body').click({ position: { x: 5, y: 200 } }).catch(() => {});
await p.keyboard.press('Control+z');
await p.waitForTimeout(900);
const n = await conflicts();
const text = n ? (await rows().first().innerText()).replace(/\n/g, ' ') : '';
console.log('  after Ctrl+Z: ' + n + ' row(s) — ' + JSON.stringify(text));
ok('undo brings the conflict back', n === 1, `${n} rows`);
ok('and it comes back LIVE, not still dismissed (§2.7 "never un-retires")',
   n === 1 && !/Marked\s+dismissed/i.test(text), text.slice(0, 180));

console.log('  page errors: ' + (errors.length ? errors.join(' | ') : 'none'));
await browser.close();
console.log(`\n== ${fails} FAIL ==`);
