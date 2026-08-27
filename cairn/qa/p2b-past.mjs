/**
 * Phase 2, 2a breaker round — the Chromium half. `qa/p2-pasttrip.mjs` is the builder's own
 * probe and it is run unmodified alongside this one; this file attacks the boundaries it does
 * not cross.
 *
 *   §1  A STRADDLING trip entered through the real form, with a real city on every day (not
 *       transit days): does the conflicts panel show findings, and do any of them name a day
 *       that is wholly in the past?
 *   §2  "A year" precision through the real form: 365 dense days and 366 dispatches in one
 *       click. Does the browser survive it, is the record fully attributed, and what does
 *       Ctrl+Z do to it?
 *   §3  A non-Latin city name — the phase's own headline case is a trip to Japan.
 *   §4  What the LIBRARY says about a fuzzy range, versus what the open trip says.
 *
 * Needs `npm run web:build && node tools/serve.mjs` in one shell, then:
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/p2b-past.mjs
 *
 * **QA R13-8, and it is `qa/p2b-gate.mjs` §3.3's problem (KD-43) in the Chromium half.**
 * §1c, §2d and §3d were written against the name-derived slug `PastTripForm.tsx` used to mint
 * (`'Tokyo'` → `'tokyo'`). A-10 deleted that expression: a `CityKey` is now an opaque id from the
 * injected factory, and the 東京/京都 collapse those assertions expected the app to *report* no
 * longer happens. Left alone the three would fail forever while measuring nothing that ships.
 * Every one is kept and repointed at what the app actually stores — the city is looked up by the
 * NAME the user typed, which is a city's only human identity after A-10, and the minted key is
 * read back off the persisted document. §3d is inverted rather than dropped: it now asserts there
 * is nothing to report, which is exactly the claim that fails again if the collapse returns
 * (a collapse re-lights `duplicate_city_key` in the Validation panel).
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : '')); };
const line = (s) => console.log('\n== ' + s + ' ==');

const browser = await chromium.launch();
const ctx = await browser.newContext();
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.route('**tile.openstreetmap.org/**', (r) => r.abort());
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);

const persisted = async () => p.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('cairn', 3);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const docs = await new Promise((res, rej) => {
    const tx = db.transaction('docs', 'readonly').objectStore('docs').getAll();
    tx.onsuccess = () => res(tx.result); tx.onerror = () => rej(tx.error);
  });
  return docs.map((d) => {
    const raw = d && d.doc ? d.doc : d;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  });
});

const today = await p.evaluate(() => {
  const d = new Date();
  const q = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}`;
});
const shift = (iso, days) => {
  const t = Date.parse(`${iso}T00:00:00Z`) + days * 86400000;
  const d = new Date(t);
  const q = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${q(d.getUTCMonth() + 1)}-${q(d.getUTCDate())}`;
};
console.log('  browser today:', today);

/** Fills and submits the past-trip form. Returns the persisted document. */
async function record({ title, precision, exactStart, exactEnd, month, year, cities }, waitMs = 1800) {
  await toLibrary();
  await p.getByTestId('record-past-trip').click();
  await p.waitForTimeout(250);
  await p.getByTestId('past-title').fill(title);
  await p.getByTestId(`past-precision-${precision}`).check();
  await p.waitForTimeout(150);
  if (precision === 'exact') {
    await p.getByTestId('past-start').fill(exactStart);
    await p.getByTestId('past-end').fill(exactEnd);
  } else if (precision === 'month') {
    await p.getByTestId('past-month').fill(month);
  } else {
    await p.getByTestId('past-year').fill(year);
  }
  await p.getByTestId('past-cities').fill(cities);
  await p.waitForTimeout(200);
  // Poll rather than sleep, so `ms` is the time the app took and not the time this probe waited.
  const t0 = Date.now();
  await p.getByTestId('past-submit').click();
  let docs = [];
  let doc = null;
  while (Date.now() - t0 < waitMs) {
    await p.waitForTimeout(120);
    docs = await persisted();
    doc = docs.find((d) => d && d.title === title) ?? null;
    if (doc) break;
  }
  const ms = Date.now() - t0;
  // one more settle, so a partially-written day skeleton is not what gets asserted
  await p.waitForTimeout(700);
  docs = await persisted();
  return { doc: docs.find((d) => d && d.title === title) ?? null, ms, docs };
}

/** Every conflict row on screen, as {rule, text} — same selectors qa/p2-pasttrip.mjs uses. */
const onScreen = async () => {
  await p.getByRole('tab', { name: /Conflicts/ }).first().click();
  await p.waitForTimeout(700);
  const rules = await p.locator('.conflict__rule').allInnerTexts();
  const texts = await p.locator('li.conflict').allInnerTexts();
  return rules.map((r, i) => ({ rule: r, text: (texts[i] || '').replace(/\s+/g, ' ').slice(0, 240) }));
};

/** Back to the Library. */
const toLibrary = async () => {
  if ((await p.locator('.topbar__brand').count()) > 0) {
    await p.locator('.topbar__brand').click();
    await p.waitForTimeout(800);
  }
};

// ---------------------------------------------------------------------------
line('§1 a STRADDLING trip, entered as a user, with a real city on every day');
{
  const start = shift(today, -3);
  const end = shift(today, 3);
  const { doc } = await record({ title: 'Straddle probe', precision: 'exact', exactStart: start, exactEnd: end, cities: 'Tokyo' });
  ok('a. it stored', !!doc, 'not found in IndexedDB');
  if (doc) {
    console.log(`  stored ${doc.startDate} → ${doc.endDate}, ${doc.days.length} days`);
    ok('b. 7 dense days', doc.days.length === 7, String(doc.days.length));
    // R13-8: the key is minted, so it is read back off the document by the name that was typed.
    const tokyo = (doc.cities || []).find((c) => c.name === 'Tokyo');
    ok('c. every day carries Tokyo, not the transit catch-all',
      !!tokyo && tokyo.key !== 'transit' &&
      doc.days.every((d) => d.primaryCity === tokyo.key && (d.cities || []).includes(tokyo.key)),
      tokyo
        ? JSON.stringify(doc.days.filter((d) => d.primaryCity !== tokyo.key).map((d) => `${d.date}:${d.primaryCity}`))
        : `no city named Tokyo: ${JSON.stringify((doc.cities || []).map((c) => c.name))}`);
    const chip = await p.getByTestId('lifecycle-chip').first().getAttribute('data-stage');
    ok('d. the chip reads ACTIVE', chip === 'active', String(chip));
    // the conflicts panel, as a user sees it
    const rows = await onScreen();
    console.log('  conflict rows on screen:', rows.length);
    for (const r of rows) console.log('    ', r.rule, '|', r.text);
    const namesPastOnly = rows.filter((r) => {
      const days = (r.text.match(/\d{4}-\d{2}-\d{2}/g) || []);
      return days.length > 0 && days.every((d) => d < today);
    });
    ok('e. no rendered finding is wholly about days already past', namesPastOnly.length === 0,
      JSON.stringify(namesPastOnly.map((r) => r.rule)));
    const namesSomePast = rows.filter((r) => (r.text.match(/\d{4}-\d{2}-\d{2}/g) || []).some((d) => d < today));
    console.log('  findings that NAME at least one already-past day (permitted by §8.2 ruling 1):',
      namesSomePast.length, JSON.stringify(namesSomePast.map((r) => r.rule)));
  }
}

// ---------------------------------------------------------------------------
line('§2 "a year" precision: 365 days and 366 dispatches behind one click');
{
  const { doc, ms } = await record({ title: 'Backpacking 2015', precision: 'year', year: '2015', cities: 'Bangkok' }, 3500);
  console.log(`  submit -> persisted took ~${ms} ms`);
  ok('a. it stored', !!doc);
  if (doc) {
    ok('b. 365 dense days', doc.days.length === 365, String(doc.days.length));
    ok('c. datePrecision year', doc.datePrecision === 'year', String(doc.datePrecision));
    // R13-8: same repoint as §1c — the city is found by its name, the key is whatever was minted.
    const bangkok = (doc.cities || []).find((c) => c.name === 'Bangkok');
    const unassigned = doc.days.filter((d) => !bangkok || d.primaryCity !== bangkok.key);
    ok('d. EVERY one of the 365 days carries the city', !!bangkok && unassigned.length === 0,
      bangkok
        ? `${unassigned.length} days still on "${unassigned[0] ? unassigned[0].primaryCity : ''}"`
        : `no city named Bangkok: ${JSON.stringify((doc.cities || []).map((c) => c.name))}`);
    ok('e. the click reaches IndexedDB inside 3 s', ms < 3000, `${ms} ms (polled, not slept)`);
    // one user action, one Ctrl+Z
    await p.keyboard.press('Control+z');
    await p.waitForTimeout(900);
    const after = (await persisted()).find((d) => d && d.title === 'Backpacking 2015');
    const stillCity = after ? after.days.filter((d) => d.primaryCity === 'bangkok').length : -1;
    console.log('  after one Ctrl+Z:', stillCity, 'of', after ? after.days.length : '?', 'days still carry the city');
    ok('f. one Ctrl+Z does not leave a half-attributed record',
      after && (stillCity === after.days.length || stillCity === 0),
      `${stillCity} of ${after ? after.days.length : '?'}`);
  }
}

// ---------------------------------------------------------------------------
line('§3 the phase\'s own headline case, entered in the local script');
{
  const { doc } = await record({ title: '日本 2019', precision: 'month', month: '2019-06', cities: '東京, 京都' });
  ok('a. it stored', !!doc);
  if (doc) {
    console.log('  cities as stored:', JSON.stringify(doc.cities));
    console.log('  day 1 primaryCity:', JSON.stringify(doc.days[0].primaryCity));
    const keys = doc.cities.map((c) => c.key);
    ok('b. two cities get two distinct keys', new Set(keys).size === keys.length, JSON.stringify(keys));
    ok('c. a city key is not an empty slug', keys.every((k) => k && k !== '-' && k !== ''), JSON.stringify(keys));
    // and what the app then says about it
    await p.getByRole('tab', { name: /Validation/ }).first().click().catch(() => {});
    await p.waitForTimeout(600);
    const issues = await p.locator('li.issue, .issue__code').allInnerTexts().catch(() => []);
    // R13-8: "zero issues" is only evidence if the Validation panel is the one on screen.
    // `ValidationPanel` renders exactly one of these two shapes, so this distinguishes
    // "nothing to report" from "the tab click missed and the locator found nothing".
    const emptyState = await p.locator('p.empty').allInnerTexts().catch(() => []);
    const panelOpen = issues.length > 0 || emptyState.some((t) => /Nothing to report/.test(t));
    console.log('  validation issue codes on screen:', JSON.stringify(issues),
      '| panel empty-state:', JSON.stringify(emptyState));
    ok('d0. the Validation panel is actually the one being read', panelOpen, JSON.stringify(emptyState));
    // R13-8: inverted, not deleted. The collapse this asserted the app would REPORT cannot
    // happen after A-10, so the surviving claim is the one that still has teeth — every day
    // sits on a key the document actually declares, and the Validation panel is therefore
    // empty. A collapse coming back fails this again: two cities under one key is
    // `duplicate_city_key`, an error, and it renders in this same panel. (The form puts every
    // day on `cities[0]` by design — `PastTripForm.tsx`'s own header calls that the simplest
    // thing that makes the record — so this asserts no day fell to the transit catch-all, not
    // that both cities got days.)
    const keySet = new Set(keys);
    const stray = doc.days.filter((d) => !keySet.has(d.primaryCity));
    ok('d. no city collapsed, so the app has nothing to report: every day sits on a declared city key and the panel is empty',
      panelOpen && issues.length === 0 && stray.length === 0,
      `${issues.length} issue(s) ${JSON.stringify(issues)}; ${stray.length} day(s) on no declared city ` +
      JSON.stringify(stray.slice(0, 3).map((d) => `${d.date}:${d.primaryCity}`)));
  }
}

// ---------------------------------------------------------------------------
line('§4 the Library vs the open trip on a fuzzy range');
{
  const openRange = await p.getByTestId('trip-range').innerText().catch(() => '(none)');
  console.log('  the OPEN trip header reads:', JSON.stringify(openRange));
  await toLibrary();
  const rows = await p.evaluate(() => [...document.querySelectorAll('.card, li, tr')]
    .map((e) => (e.innerText || '').replace(/\s+/g, ' '))
    .filter((t) => /日本 2019|Japan|Backpacking/.test(t)).slice(0, 6));
  for (const r of rows) console.log('    library row:', r.slice(0, 160));
  const exactClaim = rows.some((t) => /2019-06-01/.test(t) && /2019-06-30/.test(t));
  ok('a. the Library does not state two exact days the user never claimed', !exactClaim,
    'the Library lists "2019-06-01 → 2019-06-30" for a trip recorded as a MONTH');
  const yearClaim = rows.some((t) => /2015-01-01/.test(t) && /2015-12-31/.test(t));
  ok('b. ...and the same for a year-precision trip', !yearClaim,
    'the Library lists "2015-01-01 → 2015-12-31" for a trip recorded as a YEAR');
}

console.log('\n  page errors:', errors.length ? errors : 'none');
ok('no uncaught page error at any point', errors.length === 0, JSON.stringify(errors.slice(0, 3)));
console.log(`\n== p2b-past: ${fails} FAIL ==`);
await browser.close();
