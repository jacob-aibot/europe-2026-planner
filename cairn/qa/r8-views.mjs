/**
 * Round 8, real Chromium — the three product-surface findings the gate review sent back,
 * asserted on RENDERED TEXT rather than on a flag or a grep.
 *
 *   §1  B-1 / §2.12 — a `journey` stop reads "departs HH:MM · duration · arrives HH:MM",
 *       on Aug 8 (the Condor flight) and Aug 18 (the airport bus). A `transfer` stop is
 *       unchanged. An `unknown` stop carries a one-tap control that really dispatches.
 *   §2  B-3 / §2.14 rule 7 — the credit line survives ⇩ into the Optional panel, and the
 *       stop editor renders badge AND credit.
 *   §3  B-4 / §4.2 rule 6a″ — the banner an exhausted flush renders. Driven through the
 *       store from the page, because the point is that the SCREEN says something.
 *   §4  B-2 / §2.7 — dismiss, edit away, edit back, in the real app.
 *
 * Needs: npm run web:build && node tools/serve.mjs, then
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r8-views.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');

const browser = await chromium.launch();
const ctx = await browser.newContext();
const errors = [];

async function page() {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(String(e)));
  // The map tiles are deliberately aborted by the route below; their failures are the
  // probe's own doing and are not the app's.
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource/.test(m.text())) return;
    errors.push('console: ' + m.text());
  });
  await p.route('**tile.openstreetmap.org/**', (r) => r.abort());
  return p;
}

const openDay = async (p, label) => {
  await p.locator('button').filter({ hasText: label }).first().click();
  await p.waitForTimeout(350);
};

// ---------------------------------------------------------------------------
const p = await page();
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.getByRole('button', { name: /Load Europe 2026/i }).click();
await p.waitForTimeout(1800);

line('§1 B-1 — travelRole is on the screen (ARCHITECTURE §2.12)');
await openDay(p, /^08-08/);
const aug8 = await p.locator('.timeline').innerText();
const condor = (aug8.split('\n').find((l) => /departs/.test(l)) ?? '');
console.log('  Aug 8 journey line: ' + JSON.stringify(condor));
ok('a journey stop reads "departs … · … · arrives …"',
   /departs \d\d:\d\d · .+ · arrives \d\d:\d\d/.test(condor), condor || '(no departs line at all)');
ok('the Condor flight departs 14:30 and arrives 15:50 — 14:30 is NOT an arrival',
   /departs 14:30 · 1h 20m · arrives 15:50/.test(aug8),
   aug8.split('\n').filter((l) => /14:30|Condor|Vienna \(VIE\)/.test(l)).join(' | '));

await openDay(p, /^08-18/);
const aug18 = await p.locator('.timeline').innerText();
ok('the Aug 18 Airport Express bus departs 05:30 and arrives 06:10',
   /departs 05:30 · 40 min · arrives 06:10/.test(aug18),
   aug18.split('\n').filter((l) => /05:30|departs/.test(l)).join(' | '));

const journeyEls = await p.locator('[data-travel-role="journey"]').count();
const transferEls = await p.locator('[data-travel-role="transfer"]').count();
ok('journey and transfer stops render differently on one day',
   journeyEls > 0 && transferEls > 0, `journey=${journeyEls} transfer=${transferEls}`);
const transferText = transferEls ? await p.locator('[data-travel-role="transfer"]').first().innerText() : '';
ok("a transfer stop keeps today's string — just the time",
   /^\d\d:\d\d$/.test(transferText.trim()), JSON.stringify(transferText));

line('§1b the ten unknown stops get the one-tap control, and it dispatches');
let found = null;
for (const label of [/^08-13/, /^08-12/, /^08-14/, /^08-11/, /^08-09/, /^08-10/]) {
  await openDay(p, label);
  if (await p.locator('[data-role-control="unknown"]').count()) { found = label; break; }
}
ok('an unknown stop renders the control', found !== null, found ? String(found) : 'none found on 08-09..08-14');
if (found) {
  const before = await p.locator('[data-role-control="unknown"]').count();
  const txt = await p.locator('[data-role-control="unknown"]').first().innerText();
  console.log('  control: ' + JSON.stringify(txt.replace(/\n/g, ' ')));
  await p.locator('[data-role-control="unknown"]').first().getByRole('button', { name: /It departs then/i }).click();
  await p.waitForTimeout(400);
  const after = await p.locator('[data-role-control="unknown"]').count();
  ok('one tap sets the role and the control goes away', after === before - 1, `${before} -> ${after}`);
  ok('and the stop now renders as a journey', (await p.locator('[data-travel-role="journey"]').count()) > 0);
  // Put it back so the rest of the run is against the imported data.
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
}

line('§2 B-3 — the credit line renders wherever an attributed record renders');
const p2 = await page();
await p2.goto(URL, { waitUntil: 'domcontentloaded' });
await p2.waitForTimeout(900);
// Load the sample first so the library has a trip to browse FROM.
await p2.getByRole('button', { name: /Load Europe 2026/i }).click().catch(() => {});
await p2.waitForTimeout(1600);
await p2.locator('button.topbar__brand').click();
await p2.waitForTimeout(700);
await p2.getByRole('button', { name: /^New trip$/ }).first().click();
await p2.waitForTimeout(400);
// title, start date, end date, cities — Create stays disabled until all of them are real.
await p2.locator('form.newtrip input').nth(0).fill('Second trip');
await p2.locator('form.newtrip input[type="date"]').nth(0).fill('2026-09-01');
await p2.locator('form.newtrip input[type="date"]').nth(1).fill('2026-09-03');
await p2.locator('form.newtrip input').last().fill('Lisbon');
await p2.locator('form.newtrip button[type="submit"]').click();
await p2.waitForTimeout(1400);
await p2.locator('button', { hasText: /Browse/i }).first().click().catch(() => {});
await p2.waitForTimeout(400);
const select = p2.locator('select[aria-label="Choose a trip to browse"]');
ok('the browse pane is reachable', (await select.count()) > 0);
if (await select.count()) {
  await select.selectOption({ index: 1 });
  await p2.waitForTimeout(900);
  await p2.locator('.browse__row button', { hasText: 'Copy' }).first().click();
  await p2.waitForTimeout(700);
  // The panels are exclusive: go back to the Day tab to see where the copy landed.
  await p2.getByRole('tab', { name: /^Day$/ }).click();
  await p2.waitForTimeout(600);

  const dayText = await p2.locator('.timeline').innerText();
  ok('the copy lands badged and credited in the day view',
     /from a friend/i.test(dayText) && /From “Europe 2026”/.test(dayText),
     dayText.split('\n').filter((l) => /friend|From /.test(l)).join(' | '));

  // ⇩ into the Optional list — the review's exact repro.
  await p2.locator('.stop').filter({ hasText: /from a friend/i }).first()
    .locator('button[title*="optional" i]').click();
  await p2.waitForTimeout(600);
  await p2.getByRole('tab', { name: /^Optional/ }).click();
  await p2.waitForTimeout(600);
  // The whole panel, not the first `.pool` list: a stop pooled from a day whose city the
  // target trip does not have renders under the "not filed under a city" catch-all (R2-2).
  const poolText = await p2.locator('.panel').first().innerText().catch(() => '');
  console.log('  Optional panel: ' + JSON.stringify(poolText.replace(/\n/g, ' ').slice(0, 200)));
  ok('the Optional panel renders the badge AND the credit (QA R2-8)',
     /from a friend/i.test(poolText) && /From /.test(poolText), poolText.replace(/\n/g, ' ').slice(0, 160));

  // Put it back on the day, then open the editor on it.
  await p2.locator('.pool__item').filter({ hasText: /from a friend/i }).first()
    .locator('button', { hasText: /Add to the plan/i }).click();
  await p2.waitForTimeout(600);
  await p2.getByRole('tab', { name: /^Day$/ }).click();
  await p2.waitForTimeout(600);
  await p2.locator('.stop').filter({ hasText: /from a friend/i }).first()
    .locator('button[title="Edit"]').click();
  await p2.waitForTimeout(500);
  const editorText = await p2.locator('form.editor').first().innerText();
  console.log('  editor header: ' + JSON.stringify(editorText.split('\n').slice(0, 3).join(' | ')));
  ok('the stop editor renders the badge AND the credit',
     /from a friend/i.test(editorText) && /From /.test(editorText),
     editorText.replace(/\n/g, ' ').slice(0, 160));
}

line('§3 B-4 — the error banner §4.2 rule 6a" reuses is really on the screen');
{
  // The exhausted-bound exit sets `status:'error'` with a `lastError` naming what happened,
  // deliberately reusing the banner rule 6b's refusal path already reaches the screen
  // through. This section proves that banner EXISTS and says the right things, by making a
  // write genuinely fail: `indexedDB.open` is broken before the app boots, so the first save
  // rejects. (The bound-exhaustion path itself needs a port that never settles, which is not
  // reachable from a page; it is asserted on the rendered banner string in
  // packages/client/test/switch.test.ts.)
  const p3 = await ctx.newPage();
  const seen = [];
  p3.on('pageerror', (e) => seen.push(String(e)));
  await p3.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await p3.addInitScript(() => {
    const real = indexedDB.open.bind(indexedDB);
    let armed = false;
    Object.defineProperty(window, '__breakStorage', { value: () => { armed = true; }, writable: false });
    indexedDB.open = function broken(...args) {
      if (!armed) return real(...args);
      const req = { onsuccess: null, onerror: null, onupgradeneeded: null, error: new Error('storage is unavailable') };
      setTimeout(() => req.onerror && req.onerror({ target: req }), 0);
      return req;
    };
  });
  await p3.goto(URL, { waitUntil: 'domcontentloaded' });
  await p3.waitForTimeout(900);
  await p3.getByRole('button', { name: /Load Europe 2026/i }).click();
  await p3.waitForTimeout(1600);
  await p3.evaluate(() => window.__breakStorage());
  // An ordinary edit, which schedules an ordinary autosave that cannot land.
  await p3.locator('button', { hasText: '✎' }).first().click();
  await p3.waitForTimeout(300);
  await p3.locator('form.editor input').first().fill('EDITED WHILE STORAGE IS BROKEN');
  await p3.locator('form.editor button[type="submit"]').click();
  await p3.waitForTimeout(1500);

  const body = await p3.locator('body').innerText();
  const bannerLines = body.split('\n').filter((l) => /Not saved|Retry|Export this copy|Merge and save/i.test(l));
  console.log('  banner: ' + JSON.stringify(bannerLines.join(' | ').slice(0, 220)));
  ok('a write that cannot land puts a "Not saved" banner on the screen', /Not saved/i.test(body), bannerLines.join(' | '));
  ok('and it offers the two recoveries rule 6b names — Retry, Export this copy',
     /Retry/.test(body) && /Export this copy/.test(body), bannerLines.join(' | '));
  ok('the indicator does not read "Saved" over an unwritten edit',
     !/(^|\W)Saved(\W|$)/.test(bannerLines.join(' ')) && /Not saved/i.test(body));
  ok('the edit is still on screen — nothing was discarded',
     /EDITED WHILE STORAGE IS BROKEN/.test(body));
  await p3.close();
}

line('§4 B-2 — dismiss, make it go away, bring it back (§2.7), in the real app');
{
  const p4 = await page();
  await p4.goto(URL, { waitUntil: 'domcontentloaded' });
  await p4.waitForTimeout(900);
  await p4.locator('button').filter({ hasText: /Europe 2026/ }).first().click().catch(() => {});
  await p4.waitForTimeout(1600);

  await p4.getByRole('tab', { name: /^Conflicts/ }).click();
  await p4.waitForTimeout(600);
  ok('the conflicts panel ships Acknowledge and Not a problem',
     (await p4.locator('button', { hasText: 'Not a problem' }).count()) > 0);

  // `booking_vs_plan` is the rule whose input a user can move and move back entirely from
  // the shipped UI: it compares a linked booking's time against its stop's, and the stop
  // editor edits that time. So this is literally §2.7's own sentence — *"dismiss a conflict
  // at value X, edit to Y, edit back to X"* — driven as a user.
  const STOP = 'City Airport Train';
  const DAY = /^08-08/;
  const rows = () => p4.locator('li.conflict').filter({ hasText: 'booking_vs_plan' });
  const openStop = async () => {
    await p4.getByRole('tab', { name: /^Day$/ }).click();
    await p4.waitForTimeout(400);
    await p4.locator('button').filter({ hasText: DAY }).first().click();
    await p4.waitForTimeout(500);
    await p4.locator('.stop').filter({ hasText: STOP }).first().locator('button[title="Edit"]').click();
    await p4.waitForTimeout(400);
    return p4.locator('form.editor').first();
  };
  const conflicts = async () => {
    await p4.getByRole('tab', { name: /^Conflicts/ }).click();
    await p4.waitForTimeout(700);
    return rows().count();
  };
  const timeField = (form) => form.locator('input').nth(1);

  ok('precondition: no booking_vs_plan on the unmodified trip', (await conflicts()) === 0, 'the fixture already disagrees with itself');

  // X -> Y: move the stop away from its booking. The conflict appears.
  let form = await openStop();
  const original = await timeField(form).inputValue();
  console.log('  ' + STOP + ' is scheduled ' + JSON.stringify(original));
  await timeField(form).fill('21:45');
  await form.locator('button[type="submit"]').click();
  await p4.waitForTimeout(700);
  const n1 = await conflicts();
  ok('moving a booked stop away from its booking raises booking_vs_plan', n1 === 1, `${n1} rows`);

  if (n1 === 1) {
    // The user says it is not a problem.
    await rows().first().locator('button', { hasText: 'Not a problem' }).click();
    await p4.waitForTimeout(500);
    const marked = (await rows().first().innerText()).replace(/\n/g, ' ');
    ok('the dismissal is recorded and the conflict stays visible, marked',
       /Marked\s+dismissed/i.test(marked), marked.slice(0, 140));

    // Y -> X: put it back. The conflict's inputs are gone, so the conflict is gone.
    form = await openStop();
    await timeField(form).fill(original);
    await form.locator('button[type="submit"]').click();
    await p4.waitForTimeout(700);
    const n2 = await conflicts();
    ok('putting it back removes the conflict', n2 === 0, `${n1} -> ${n2}`);

    // X -> Y again. Content-addressing restores the SAME id — §2.7 says it must come back
    // LIVE, not carrying a dismissal the user never repeated.
    form = await openStop();
    await timeField(form).fill('21:45');
    await form.locator('button[type="submit"]').click();
    await p4.waitForTimeout(700);
    const n3 = await conflicts();
    const backText = n3 ? (await rows().first().innerText()).replace(/\n/g, ' ') : '';
    console.log('  returned as: ' + JSON.stringify(backText.slice(0, 220)));
    ok('the conflict comes back', n3 === 1, `${n2} -> ${n3}`);
    ok('and it comes back LIVE, not still dismissed (QA R2-7)',
       n3 === 1 && !/Marked\s+dismissed/i.test(backText), backText.slice(0, 160));
    ok('and it records the earlier dismissal rather than pretending it never happened',
       /dismissed this/i.test(backText), backText.slice(0, 160));
  }
  await p4.close();
}

line('page errors');
console.log('  ' + (errors.length ? errors.slice(0, 6).join('\n  ') : 'none'));
ok('zero page errors across every session', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
console.log(`\n== r8-views: ${fails} FAIL ==`);
process.exitCode = fails ? 1 : 0;
