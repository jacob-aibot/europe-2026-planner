/**
 * QA round 33, part 2 — the follow-ups r33-render.mjs raised.
 *
 *   Needs: npm run web:build && npm run serve
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r33-render2.mjs
 *
 *   I  MOTION, properly: does the hover fill actually ARRIVE after the transition, and is it
 *      instantaneous under prefers-reduced-motion?
 *   J  THE TWO STICKY BARS: `.tabbar { top: 2.7rem }` is a hardcoded guess at the topbar's
 *      height. Measure the real one, at three viewports.
 *   K  W2 BEHAVIOURALLY: hit testing is the browser's — click and keyboard, on the path.
 *   L  FONT PAYLOAD: is every one of the four shipped faces actually USED?
 *   M  SIGNAL COMPOSITION beyond the one the builder measured.
 *   N  THE MAP'S OWN LifecycleChip: WorldMap.tsx calls `core.lifecycle` in the drill-down,
 *      INSIDE the surface that just refused for the same reason. Is there a row travelStats
 *      accepts and lifecycle refuses?
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import * as core from '../packages/core/src/index.ts';

const { chromium } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
let fails = 0;
const ok = (c, l, x) => { if (c) console.log(`  ok    ${l}`); else { fails++; console.log(`  FAIL  ${l}${x === undefined ? '' : '  -> ' + JSON.stringify(x)}`); } };
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);
const browser = await chromium.launch();

async function fresh(opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  return { ctx, page, errors };
}
const plantRows = (page, rows) => page.evaluate(async (rows) => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  await new Promise((res, rej) => { const tx = db.transaction('summaries', 'readwrite'); for (const row of rows) tx.objectStore('summaries').put(row, row.id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  db.close();
}, rows);
const row = (id, s, e, codes) => ({
  id, title: id, startDate: s, endDate: e, datePrecision: 'exact',
  cityCount: 0, dayCount: 3, stopCount: 0, poolCount: 0, revision: 1,
  countryCodes: codes, cities: [],
  attribution: { places: { located: 0, attributed: 0 }, stops: { located: 0, attributed: 0 } },
  summaryVersion: core.SUMMARY_VERSION,
});
async function withLibrary(rows, opts = {}) {
  const h = await fresh(opts);
  await h.page.goto(URL, { waitUntil: 'domcontentloaded' });
  await h.page.waitForSelector('.tabbar');
  await plantRows(h.page, rows);
  await h.page.reload({ waitUntil: 'domcontentloaded' });
  await h.page.waitForSelector('.tabbar');
  return h;
}
const today = () => new Date().toISOString().slice(0, 10);

// ===========================================================================
head('I — MOTION, with the transition allowed to finish');
{
  for (const rm of ['no-preference', 'reduce']) {
    const { ctx, page } = await withLibrary([row('at', '2019-05-01', '2019-05-08', ['AT'])], { reducedMotion: rm });
    await page.getByRole('tab', { name: 'Map' }).click();
    await page.waitForTimeout(200);
    const rest = await page.evaluate(() => getComputedStyle(document.querySelector('.worldmap__country')).fill);
    await page.hover('.worldmap__country');
    const t0 = await page.evaluate(() => getComputedStyle(document.querySelector('.worldmap__country')).fill);
    await page.waitForTimeout(400);
    const t1 = await page.evaluate(() => getComputedStyle(document.querySelector('.worldmap__country')).fill);
    note(`[${rm}] rest=${rest}  at hover t=0: ${t0}  after 400ms: ${t1}`);
    ok(t1 !== rest, `[${rm}] the hover fill ARRIVES (the transition is not on a dead property)`, { rest, t1 });
    if (rm === 'no-preference') ok(t0 === rest, '[no-preference] and it is genuinely animated (t=0 still the resting ink)', { rest, t0 });
    else ok(t0 === t1, '[reduce] and under reduced motion it is INSTANT', { t0, t1 });

    // The tab underline: switch tabs and watch it move.
    const before = await page.evaluate(() => [...document.querySelectorAll('.tabbar__tab')].map((t) => getComputedStyle(t).borderBottomColor));
    await page.getByRole('tab', { name: 'Trips' }).click();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => [...document.querySelectorAll('.tabbar__tab')].map((t) => getComputedStyle(t).borderBottomColor));
    note(`[${rm}] underline before ${JSON.stringify(before)} after ${JSON.stringify(after)}`);
    ok(before[0] !== after[0] && before[1] !== after[1], `[${rm}] the underline moves with the selection`, { before, after });
    await ctx.close();
  }
}

// ===========================================================================
head('J — the two sticky bars: `.tabbar { top: 2.7rem }` vs the topbar\'s REAL height');
{
  for (const vp of [{ width: 1280, height: 800 }, { width: 768, height: 900 }, { width: 375, height: 667 }]) {
    const { ctx, page } = await withLibrary([row('a', '2019-01-01', '2019-01-10', ['AT'])], { viewport: vp });
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const t = document.querySelector('.topbar').getBoundingClientRect();
      const b = document.querySelector('.tabbar').getBoundingClientRect();
      return { topbarH: +t.height.toFixed(2), topbarBottom: +t.bottom.toFixed(2), tabbarTop: +b.top.toFixed(2), stickyTop: getComputedStyle(document.querySelector('.tabbar')).top };
    });
    note(`${vp.width}px: topbar height ${m.topbarH}, tabbar sticks at ${m.stickyTop} (top ${m.tabbarTop}) — gap ${(m.tabbarTop - m.topbarBottom).toFixed(2)}px`);
    ok(Math.abs(m.tabbarTop - m.topbarBottom) < 1,
       `${vp.width}px: the tab bar sits flush under the topbar when scrolled (no see-through stripe)`,
       { gap: +(m.tabbarTop - m.topbarBottom).toFixed(2) });
    await ctx.close();
  }
  // With a trip open the topbar carries a title and a save chip — does it get taller?
  const { ctx, page } = await fresh({ viewport: { width: 375, height: 667 } });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tabbar');
  const sample = page.locator('button', { hasText: /sample|Europe/i }).first();
  if (await sample.count()) {
    await sample.click().catch(() => {});
    await page.waitForTimeout(600);
  }
  const open = await page.evaluate(() => {
    const t = document.querySelector('.topbar').getBoundingClientRect();
    const b = document.querySelector('.tabbar').getBoundingClientRect();
    return { hasTitle: !!document.querySelector('.topbar__title'), topbarH: +t.height.toFixed(2), gap: +(b.top - t.bottom).toFixed(2) };
  });
  note(`375px with a trip open: ${JSON.stringify(open)}`);
  ok(Math.abs(open.gap) < 1, 'and still flush once the topbar carries a title + save chip', open);
  await ctx.close();
}

// ===========================================================================
head('K — W2 behaviourally: hit testing is the browser\'s, on the <path>');
{
  const { ctx, page, errors } = await withLibrary([
    row('a', '2019-01-01', '2019-01-10', ['AT']),
    row('b', '2019-02-01', '2019-02-10', ['HR']),
  ]);
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(250);
  await page.click('.worldmap__country[data-code="AT"]');
  await page.waitForTimeout(120);
  const drill = await page.locator('.worldmap__drill').innerText();
  ok(/^AT/.test(drill.trim()), 'clicking a country\'s FILL selects it', drill.slice(0, 60));
  ok(/\ba\b/.test(drill), 'and the drill-down names the trip', drill.slice(0, 120));

  // Click the SEA between the two countries — nothing should be selected.
  await page.click('.worldmap__country[data-code="AT"]'); // toggle off
  await page.waitForTimeout(100);
  await page.click('.worldmap__sea', { position: { x: 5, y: 5 } }).catch(() => {});
  await page.waitForTimeout(100);
  ok(/tap a country/i.test(await page.locator('.worldmap__drill h2').innerText()),
     'clicking the sea selects nothing (no hand-rolled point-in-polygon over screen coords)');

  // Keyboard: the path is focusable and Enter selects it.
  await page.focus('.worldmap__country[data-code="HR"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
  ok(/^HR/.test((await page.locator('.worldmap__drill h2').innerText()).trim()), 'Enter on a focused country selects it');
  ok(errors.length === 0, 'no page errors', errors);
  await ctx.close();
}

// ===========================================================================
head('L — is every shipped face actually USED? (91.7 KB of payload)');
{
  const { ctx, page } = await withLibrary([row('a', '2019-01-01', '2019-01-10', ['AT', 'GB'])]);
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(300);
  await page.evaluate(() => document.fonts.ready);
  const faces = await page.evaluate(() => [...document.fonts].map((f) => ({ f: f.family, w: f.weight, s: f.status })));
  note(JSON.stringify(faces));
  // Which font-weights does the app actually ASK a mono element for?
  const monoWeights = await page.evaluate(() => {
    const s = new Set();
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (/IBM Plex Mono/.test(cs.fontFamily) && el.childElementCount === 0 && el.textContent.trim()) s.add(cs.fontWeight);
    }
    return [...s].sort();
  });
  note(`mono weights actually requested on this page: ${JSON.stringify(monoWeights)}`);
  const unloaded = faces.filter((f) => f.s !== 'loaded');
  ok(unloaded.length === 0, 'every shipped face is exercised by the running app (nothing is dead payload)', { unloaded, monoWeights });
  await ctx.close();
}

// ===========================================================================
head('M — signal composition: severity at FULL strength for every provenance state');
{
  // Read the composed border-colour a `.stop--flag` row gets, with and without the
  // provenance mark, for each severity the timeline can render.
  const { ctx, page } = await withLibrary([]);
  const probe = await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-9999px;top:0';
    document.body.appendChild(host);
    const out = [];
    for (const sev of ['blocker', 'warning', 'note']) {
      for (const prov of ['', 'stop--unaccepted', 'stop--dim']) {
        const el = document.createElement('div');
        el.className = `stop stop--flag stop--flag-${sev} ${prov}`.trim();
        host.appendChild(el);
        const cs = getComputedStyle(el);
        // Effective opacity: the product of every opacity from here to the root.
        let eff = 1, n = el;
        while (n && n !== document.documentElement) { eff *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
        out.push({ sev, prov: prov || '(none)', borderColor: cs.borderLeftColor, borderStyle: cs.borderLeftStyle, opacity: cs.opacity, effective: +eff.toFixed(3) });
      }
    }
    host.remove();
    return out;
  });
  for (const r of probe) note(`${r.sev.padEnd(8)} ${r.prov.padEnd(18)} border=${r.borderColor} style=${r.borderStyle} opacity=${r.opacity} effective=${r.effective}`);
  for (const sev of ['blocker', 'warning', 'note']) {
    const g = probe.filter((r) => r.sev === sev);
    const base = g.find((r) => r.prov === '(none)');
    for (const r of g) {
      ok(r.borderColor === base.borderColor, `${sev}: the severity colour survives "${r.prov}"`, { got: r.borderColor, base: base.borderColor });
      ok(r.effective === 1, `${sev}: nothing attenuates it under "${r.prov}"`, r);
    }
  }
  ok(!probe.some((r) => r.prov === 'stop--dim' && r.effective !== 1),
     'even the RETIRED `.stop--dim` class is inert — no rule left behind', probe.filter((r) => r.prov === 'stop--dim'));
  await ctx.close();
}

// ===========================================================================
head('N — the Map\'s OWN LifecycleChip: a second ungated core.lifecycle call, inside the refusing surface');
{
  // WorldMap.tsx:206 renders <LifecycleChip trip={row}> for each tripId of the selected
  // country. Is there a row `travelStats` accepts but `lifecycle` refuses? If so the Map's
  // own refusal boundary is bypassed by its own drill-down.
  const t = today();
  const bad = [];
  for (const [s, e] of [['2019-01-01', 'not-a-date'], ['2019-01-01', '99999-01-01'], ['2019-01-01', '']]) {
    const r = row('x', s, e, ['AT']);
    let stats = null, lc = null;
    try { stats = core.travelStats([r], t); } catch (er) { stats = 'THROWS: ' + er.message.slice(0, 40); }
    try { core.lifecycle(r, t); } catch (er) { lc = 'THROWS'; }
    note(`start=${s} end=${JSON.stringify(e)} -> travelStats ${typeof stats === 'string' ? stats : 'ok'}; lifecycle ${lc ?? 'ok'}`);
    if (typeof stats !== 'string' && lc) bad.push([s, e]);
  }
  ok(bad.length === 0, 'no row is accepted by travelStats and refused by lifecycle (the Map drill-down is safe)', bad);
}

await browser.close();
console.log(fails === 0 ? '\nall green' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
