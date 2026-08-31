/**
 * I-8a — the rendered-output half of the increment, in Chromium.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i8a-signals.mjs
 *
 * `packages/client/test/world-map.test.ts` holds `worldMapFrame` in plain Node and
 * `test/views.test.ts` holds A-40's greppable ceilings. Neither can see a computed style, so
 * everything ROADMAP I-8a asks to be *"asserted on the rendered output"* lands here:
 *
 *   §1  the world map fits correctly when its tab was HIDDEN AT MOUNT (A-40 Part 4)
 *   §2  a one-country history does not exceed the min-span guard
 *   §3  a provisional country renders differently from a confirmed one (A-34)
 *   §4  a code the index cannot fill appears in `missing` AND on screen (A-40 clause 3)
 *   §5  `travelStats` is rendered behind a boundary that can refuse (A-37 Part 2)
 *   §6  the two signals are SEPARABLE: a copied/unaccepted stop that also carries a blocker
 *       renders the blocker at full strength and the unaccepted mark
 *   §7  neither named removal comes back — no `backdrop-filter`, no gradient in a chrome fill
 *       (`docs/VISUAL-TELLS.md`'s first two computed-style assertions)
 *   §8  no rendered text below the floor the token layer settled (11px), outside a named list
 *
 * A "FAIL" line means the probe found what it was looking for.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';
import { worldMapFrame } from '../packages/client/src/selectors/worldMap.ts';

const { chromium } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
let fails = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ok    ${label}`);
  else { fails++; console.log(`  FAIL  ${label}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`); }
};
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const browser = await chromium.launch();

/** A fresh browser context with no storage, tiles blocked. */
async function fresh() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_|tile|favicon/.test(m.text())) errors.push('console.error: ' + m.text().slice(0, 200));
  });
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  return { ctx, page, errors };
}

/** Writes summary rows straight into the `summaries` store. No document, no version row. */
const plantRows = (page, rows) =>
  page.evaluate(async (rows) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('cairn');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('summaries', 'readwrite');
      for (const row of rows) tx.objectStore('summaries').put(row, row.id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, rows);

const SUMMARY_VERSION = core.SUMMARY_VERSION;
const row = (id, startDate, endDate, countryCodes) => ({
  id, title: id, startDate, endDate, datePrecision: 'exact',
  cityCount: 0, dayCount: 3, stopCount: 0, poolCount: 0, revision: 1,
  countryCodes, cities: [],
  attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
  summaryVersion: SUMMARY_VERSION,
});

/** Boots the app once so IndexedDB exists, plants rows, reloads, lands on the Map tab. */
async function withLibrary(rows) {
  const { ctx, page, errors } = await fresh();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await plantRows(page, rows);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(250);
  return { ctx, page, errors };
}

const today = () => new Date().toISOString().slice(0, 10);

// ===========================================================================
head('§1 — the world map fits correctly when its tab was HIDDEN AT MOUNT (A-40 Part 4)');
{
  const rows = [row('done-at', '2019-05-01', '2019-05-08', ['AT', 'HR', 'CZ'])];
  const { ctx, page, errors } = await withLibrary([]);
  // Boot on Trips with the Map tab already MOUNTED and `display:none`. This is exactly the
  // container state Leaflet cannot be fitted in — CLAUDE.md's first shipped map bug.
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  await plantRows(page, rows);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#tabpanel-map', { state: 'attached' });

  const hiddenState = await page.evaluate(() => {
    const panel = document.querySelector('#tabpanel-map');
    const svg = document.querySelector('#tabpanel-map .worldmap__svg');
    return {
      mounted: !!svg,
      display: getComputedStyle(panel).display,
      viewBoxWhileHidden: svg ? svg.getAttribute('data-viewbox') : null,
      widthWhileHidden: svg ? svg.getBoundingClientRect().width : null,
    };
  });
  ok(hiddenState.mounted, 'the Map panel is MOUNTED while the Trips tab is showing');
  ok(hiddenState.display === 'none', 'and its container is display:none', hiddenState.display);
  ok(hiddenState.widthWhileHidden === 0, 'so it has zero measured width at mount', hiddenState.widthWhileHidden);

  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(200);

  const shown = await page.evaluate(() => {
    const svg = document.querySelector('#tabpanel-map .worldmap__svg');
    const r = svg.getBoundingClientRect();
    return { viewBox: svg.getAttribute('viewBox'), data: svg.getAttribute('data-viewbox'), w: r.width, h: r.height };
  });

  // The independent oracle: the same frame, recomputed in Node from the same rows.
  const want = worldMapFrame(core.travelStats(rows, today()), core.COUNTRY_INDEX);
  ok(shown.viewBox === want.viewBox, 'the RENDERED viewBox is exactly the one worldMapFrame returned', { got: shown.viewBox, want: want.viewBox });
  ok(shown.viewBox === hiddenState.viewBoxWhileHidden, 'and it did not change when the container gained a size');
  ok(shown.w > 100 && shown.h > 100, 'the map is actually painted at a usable size', shown);
  ok(errors.length === 0, 'no page errors', errors);
  await ctx.close();
}

// ===========================================================================
head('§2 — a one-country history does not exceed the min-span guard');
{
  // The Vatican: 1.06 km across, the only shipped country under MIN_SPAN_KM. Austria is the
  // control — ROADMAP I-8a's own example names AT here, and AT cannot clamp (see BUILD-NOTES).
  const rows = [row('va', '2018-03-01', '2018-03-03', ['VA'])];
  const { ctx, page } = await withLibrary(rows);
  const want = worldMapFrame(core.travelStats(rows, today()), core.COUNTRY_INDEX);
  ok(want.bounds.clamped === true, 'ORACLE: a VA-only history is clamped by core');
  const got = await page.getAttribute('.worldmap__svg', 'viewBox');
  ok(got === want.viewBox, 'the rendered viewBox is the CLAMPED box', { got, want: want.viewBox });
  const width = Number(got.split(' ')[2]);
  const rawBox = core.COUNTRY_INDEX.countries.find((c) => c.code === 'VA').box;
  ok(width > rawBox[2] - rawBox[0], 'and it is WIDER than the raw country box', { width, raw: rawBox[2] - rawBox[0] });
  const legend = await page.locator('.legend__note').innerText();
  ok(/readable minimum/i.test(legend), 'the surface says it zoomed out to a readable minimum', legend);
  await ctx.close();
}
{
  const rows = [row('at', '2018-03-01', '2018-03-08', ['AT'])];
  const { ctx, page } = await withLibrary(rows);
  const want = worldMapFrame(core.travelStats(rows, today()), core.COUNTRY_INDEX);
  ok(want.bounds.clamped === false, 'ORACLE: an AT-only history is NOT clamped (631 km across)');
  ok(await page.locator('.legend__note').count() === 0, 'and the surface does not claim it was');
  await ctx.close();
}

// ===========================================================================
head('§3 — a provisional country renders differently from a confirmed one (A-34)');
{
  // ROADMAP I-8a's own fixture: one COMPLETED trip to AT, one ACTIVE trip to AT and GB.
  const t = today();
  const y = Number(t.slice(0, 4));
  const rows = [
    row('completed-at', `${y - 3}-05-01`, `${y - 3}-05-08`, ['AT']),
    // Active: started yesterday, ends next month.
    row('active-at-gb', new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), ['AT', 'GB']),
  ];
  const { ctx, page } = await withLibrary(rows);
  const stats = core.travelStats(rows, t);
  ok(stats.trips.completed === 1 && stats.trips.active === 1, 'ORACLE: one completed, one active', stats.trips);
  ok(stats.countries.find((c) => c.code === 'AT').provisional === false, 'ORACLE: AT is confirmed');
  ok(stats.countries.find((c) => c.code === 'GB').provisional === true, 'ORACLE: GB is provisional');

  const paint = await page.evaluate(() => {
    const read = (code) => {
      const el = document.querySelector(`.worldmap__country[data-code="${code}"]`);
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        provisional: el.getAttribute('data-provisional'),
        fill: s.fill, stroke: s.stroke, dash: s.strokeDasharray, width: s.strokeWidth,
        opacity: s.opacity, fillOpacity: s.fillOpacity,
      };
    };
    return { AT: read('AT'), GB: read('GB') };
  });
  ok(paint.AT && paint.GB, 'both countries are drawn', paint);
  ok(paint.AT.provisional === 'false' && paint.GB.provisional === 'true', 'the flag reaches the element');
  ok(paint.AT.fill !== paint.GB.fill, 'they are NOT the same ink on the filled map', paint);
  ok(paint.AT.dash !== paint.GB.dash, 'and the provisional one is outlined rather than filled solid', paint);
  // A-34's treatment may not be "the same signal at lower strength".
  ok(paint.GB.opacity === '1' && paint.GB.fillOpacity === '1',
    'the provisional treatment is a DIFFERENT ink, not the confirmed ink attenuated', paint.GB);
  await ctx.close();
}

// ===========================================================================
head('§4 — a code the index cannot fill appears in `missing` AND on screen');
{
  const rows = [row('mixed', '2019-05-01', '2019-05-08', ['AT', 'ZZ'])];
  const { ctx, page } = await withLibrary(rows);
  const want = worldMapFrame(core.travelStats(rows, today()), core.COUNTRY_INDEX);
  ok(want.missing.join() === 'ZZ', 'ORACLE: ZZ is a code the shipped index cannot fill', want.missing);
  const gap = page.locator('.worldmap__gap');
  ok(await gap.getAttribute('data-missing') === '1', 'the surface states a count of 1');
  const text = await gap.innerText();
  ok(/\bZZ\b/.test(text), 'and names the code itself rather than swallowing it', text);
  ok(await page.locator('.worldmap__country[data-code="ZZ"]').count() === 0, 'nothing is drawn for it');
  const drawn = await page.locator('.worldmap__country').count();
  ok(drawn + want.missing.length === 2, 'drawn + missing accounts for every country row', drawn);
  await ctx.close();
}

// ===========================================================================
head('§5 — travelStats is rendered behind a boundary that can refuse (A-37 Part 2)');
{
  const rows = [row('bad-date', 'not-a-date', '2019-05-08', ['AT'])];
  const { ctx, page, errors } = await withLibrary(rows);
  const body = await page.locator('#tabpanel-map').innerText();
  ok(/could not read your travel history/i.test(body), 'the Map refuses in words', body.slice(0, 200));
  ok(await page.locator('.worldmap__svg').count() === 0, 'and draws no map rather than a blank one');
  // The app is NOT blank: the tab bar and both panels are still there.
  ok(await page.locator('.tabbar__tab').count() === 2, 'the shell is still on screen — not a blank page');
  await page.getByRole('tab', { name: 'Trips' }).click();
  ok(await page.locator('#tabpanel-trips').isVisible(), 'the Trips tab still renders');
  // FINDING (BUILD-NOTES): the same shape-invalid row ALSO throws out of `core.lifecycle`,
  // which `Library.tsx` calls per row with no read gate. That is a second, pre-existing
  // instance of A-37's problem on a surface I-8a does not own; the per-tab error boundary
  // keeps it from taking the Map down with it, and says so on the Trips tab.
  const trips = await page.locator('#tabpanel-trips').innerText();
  ok(/could not be shown/i.test(trips), 'and the Trips tab reports its own failure instead of blanking', trips.slice(0, 160));
  const uncaught = errors.filter((e) => e.startsWith('pageerror'));
  ok(uncaught.length === 0, 'no unhandled rejection escaped to the page', uncaught);
  await ctx.close();
}

// ===========================================================================
head('§6 — the two signals are SEPARABLE (the I-8a design defect)');
{
  // The collision needs a stop that is BOTH unaccepted AND carries a blocker, so it is built
  // through the real user path rather than planted: load the sample, create a PLANNED trip,
  // add an own stop, copy a stop out of the sample into it (`copyStopInto` — provenance
  // preserved, §2.14), and time the two so the transfer between them is impossible.
  //
  // It must be a PLANNED trip: `impossible_transfer` is a FEASIBILITY rule (§8.2 — "you
  // cannot miss a connection you already made"), so on the completed Europe 2026 trip it is
  // correctly silent. That is core behaving as designed, not an obstacle to work around.
  const { ctx, page, errors } = await fresh();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Load Europe 2026/i }).click();
  await page.waitForTimeout(900);
  await page.locator('.topbar__brand').click();
  await page.waitForTimeout(400);

  const y = new Date().getUTCFullYear() + 1;
  await page.getByRole('button', { name: 'New trip' }).click();
  await page.locator('.newtrip input[placeholder="Japan 2027"]').fill('Signal fixture');
  const dates = page.locator('.newtrip input[type="date"]');
  await dates.nth(0).fill(`${y}-04-01`);
  await dates.nth(1).fill(`${y}-04-03`);
  await page.locator('.newtrip input[placeholder="Tokyo, Kyoto, Osaka"]').fill('Vienna');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.waitForTimeout(700);

  // An OWN stop with a time and a coordinate — the control.
  await page.getByRole('button', { name: 'Add a stop' }).click();
  const form = page.locator('form.editor');
  await form.locator('input[placeholder="Belvedere Palace"]').fill('Hotel checkout');
  await form.locator('input[placeholder="09:30"]').fill('09:00');
  await form.locator('input[placeholder="48.1916"]').fill('48.2082');
  await form.locator('input[placeholder="16.3810"]').fill('16.3738');
  await page.getByRole('button', { name: 'Add stop' }).click();
  await page.waitForTimeout(500);

  // A COPIED stop out of Europe 2026 — unaccepted, credited, and far away.
  await page.locator('.tab').filter({ hasText: /Browse & copy/i }).click();
  await page.waitForTimeout(400);
  await page.locator('.browse select').selectOption({ index: 1 });
  await page.waitForTimeout(600);
  const SUBJECT = 'Lokrum Island';
  await page.locator('.browse__row').filter({ hasText: SUBJECT }).first()
    .getByRole('button', { name: /copy/i }).click();
  await page.waitForTimeout(500);
  await page.locator('.tab').filter({ hasText: /Timeline|Day/i }).first().click();
  await page.waitForTimeout(400);

  const CONTROL = 'Hotel checkout';
  // Located by PROVENANCE, not by text: the control row quotes the subject's name inside its
  // own conflict summary, so `hasText` matches both. (It did, and the first version of this
  // probe measured the wrong row for it.)
  const subject = page.locator('li.stop[data-status="imported"]');
  const controlRow = page.locator('li.stop[data-status="own"]');
  ok(await subject.count() === 1, 'the copied stop is on the day');
  ok((await subject.innerText()).includes(SUBJECT) && (await controlRow.innerText()).includes(CONTROL),
    'and the two rows are the ones the fixture built');
  ok(await subject.getAttribute('data-status') === 'imported', 'and it is UNACCEPTED (imported)',
    await subject.getAttribute('data-status'));

  // 09:05 in Dubrovnik, five minutes after a 09:00 in Vienna: not a trip anyone makes.
  await subject.locator('button[title="Edit"]').click();
  await subject.locator('form.editor input[placeholder="09:30"]').fill('09:05');
  await subject.locator('button[type="submit"]').click();
  await page.waitForTimeout(600);

  // §2.12's one-tap control: a copied stop's `travelRole` is `unknown`, and
  // `impossible_transfer` is deliberately a WARNING while it is. Answering the question is
  // what turns it into the blocker — which is the rule working, not a workaround.
  await subject.locator('[data-role-control] button').first().click();
  await page.waitForTimeout(600);

  const s2 = subject;
  const c2 = controlRow;
  ok(await s2.getAttribute('data-severity') === 'blocker', 'the unaccepted stop now carries a BLOCKER',
    await s2.getAttribute('data-severity'));
  ok(await c2.getAttribute('data-severity') === 'blocker', 'and so does the own-stop control',
    await c2.getAttribute('data-severity'));
  ok(await s2.getAttribute('data-status') === 'imported', 'and it is still unaccepted');

  const measure = await page.evaluate(() => {
    const find = (sel) => document.querySelector(`li.stop[data-status="${sel}"]`);
    /** Every opacity between an element and the document root, multiplied. */
    const effective = (el) => {
      let o = 1;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        o *= Number(getComputedStyle(n).opacity);
      }
      return o;
    };
    const read = (status) => {
      const li = find(status);
      if (!li) return null;
      const flag = li.querySelector('.stop__conflict.sev--blocker');
      const s = getComputedStyle(li);
      return {
        rowOpacity: s.opacity,
        rowEffective: effective(li),
        borderStyle: s.borderTopStyle,
        borderColor: s.borderTopColor,
        flagPresent: !!flag,
        flagColor: flag ? getComputedStyle(flag).borderLeftColor : null,
        flagText: flag ? getComputedStyle(flag).color : null,
        flagEffective: flag ? effective(flag) : null,
        badge: !!li.querySelector('.pill'),
        credit: !!li.querySelector('.stop__credit'),
      };
    };
    return { subject: read('imported'), control: read('own') };
  });

  const { subject: S, control: C } = measure;
  ok(S && C && S.flagPresent && C.flagPresent, 'both rows render the blocker line', measure);
  if (S && C && S.flagPresent && C.flagPresent) {
    ok(S.rowEffective === 1, 'the unaccepted+blocker row is NOT attenuated', S);
    ok(S.flagEffective === 1, 'and neither is its blocker', S);
    ok(S.flagColor === C.flagColor,
      'the blocker renders at FULL computed strength — identical to the control', { S: S.flagColor, C: C.flagColor });
    ok(S.flagText === C.flagText, 'and so does its text');
    ok(S.flagEffective === C.flagEffective, 'and at the same effective opacity as the control');
    ok(S.borderColor === C.borderColor, 'severity keeps the border colour whatever the provenance', measure);
    // ...and the provenance mark is still there, on a channel of its own.
    ok(S.borderStyle === 'dashed', 'the unaccepted mark is a dashed outline', S.borderStyle);
    ok(C.borderStyle !== 'dashed', 'and the own stop carries no such mark', C.borderStyle);
    ok(S.badge, 'the provenance badge is still rendered beside it');
    ok(S.credit, 'and so is the §2.14 rule 7 credit line');
  }
  ok(errors.length === 0, 'no page errors', errors);
  await ctx.close();
}

// ===========================================================================
head('§7 — neither named removal comes back (VISUAL-TELLS computed-style 1 and 2)');
{
  const { ctx, page } = await fresh();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Load Europe 2026/i }).click();
  await page.waitForTimeout(900);

  const chrome = await page.evaluate(() => {
    const blur = [];
    const grad = [];
    for (const el of document.querySelectorAll('*')) {
      const s = getComputedStyle(el);
      if (s.backdropFilter && s.backdropFilter !== 'none') blur.push(el.className || el.tagName);
      const bg = s.backgroundImage;
      if (bg && bg !== 'none' && /gradient/.test(bg)) grad.push((el.className || el.tagName) + ' :: ' + bg.slice(0, 60));
    }
    return { blur, grad };
  });
  ok(chrome.blur.length === 0, 'tell 1: no element paints a backdrop-filter', chrome.blur);
  // No selector exemption is needed: the world map fills with SVG `fill`, never with a CSS
  // background, so a gradient anywhere is a chrome gradient by construction.
  ok(chrome.grad.length === 0, 'tell 2: no element paints a gradient background', chrome.grad);

  const mark = await page.evaluate(() => {
    const el = document.querySelector('.topbar__mark');
    if (!el) return null;
    const s = getComputedStyle(el);
    return { tag: el.tagName, bg: s.backgroundImage, shadow: s.boxShadow, fill: s.fill, stroke: s.stroke };
  });
  ok(mark && mark.tag.toLowerCase() === 'svg', 'the brand mark is a drawn glyph', mark);
  ok(mark && mark.bg === 'none' && /none/.test(mark.shadow), 'with no gradient and no glow ring', mark);

  const bar = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.topbar'));
    return { bg: s.backgroundColor, blur: s.backdropFilter, border: s.borderBottomWidth };
  });
  ok(!/rgba\(.*0(\.\d+)?\)$/.test(bar.bg), 'the topbar is an OPAQUE bar', bar);
  ok(bar.border === '1px', 'with a hairline under it', bar);
  await ctx.close();
}

// ===========================================================================
head('§8 — the UI text floor the token layer settled (11px), on rendered output');
{
  const { ctx, page } = await fresh();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Load Europe 2026/i }).click();
  await page.waitForTimeout(900);
  const small = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      if (!el.textContent || !el.textContent.trim()) continue;
      const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasOwnText) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < 11) out.push(`${el.className || el.tagName} @ ${px}px`);
    }
    return [...new Set(out)];
  });
  ok(small.length === 0, 'nothing renders below the 11px floor', small);
  const fonts = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    h1: getComputedStyle(document.querySelector('h1, h2')).fontFamily,
    loaded: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`),
  }));
  note(`body: ${fonts.body}`);
  note(`display: ${fonts.h1}`);
  note(`faces: ${fonts.loaded.join(' | ')}`);
  ok(/Public Sans/.test(fonts.body), 'body is Public Sans');
  ok(/Big Shoulders/.test(fonts.h1), 'headings are Big Shoulders');
  ok(fonts.loaded.length === 4 && fonts.loaded.every((f) => /loaded/.test(f)),
    'all four self-hosted faces loaded from the app, not from a CDN', fonts.loaded);
  await ctx.close();
}

console.log(fails === 0 ? '\nall green' : `\n${fails} FAIL`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
