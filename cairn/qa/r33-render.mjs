/**
 * QA round 33 — the rendered-output attacks I-8a's own probe does NOT make.
 *
 *   Needs: npm run web:build && npm run serve   (in another shell)
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r33-render.mjs
 *
 * `qa/i8a-signals.mjs` is the builder's own probe and is all green; this one goes at the
 * things the builder listed under "what I could not verify", plus the ship-gate clauses that
 * only a second pair of eyes exercises:
 *
 *   A  DARK MODE — the whole computed-style sweep again under prefers-color-scheme: dark,
 *      including both named removals and the A-34 provisional/confirmed distinction, plus
 *      provisional-vs-SEA which light mode never tests.
 *   B  MOTION — the two transitions the builder wrote but did not exercise, and whether
 *      prefers-reduced-motion actually suppresses them.
 *   C  NETWORK — zero external requests after load, the hard requirement (fonts self-hosted).
 *   D  ANTIMERIDIAN — the residue, MEASURED in rendered CSS pixels on the shipped sample.
 *   E  MOBILE — 375x667, the tab shell and the map.
 *   F  THE ERROR BOUNDARY'S RECOVERY PATH — the blast radius is contained; is it escapable?
 *   G  SIGNAL COMPOSITION — the .stop--dim fix at every severity, not just blocker.
 *   H  TAB-SWITCH END TO END for the min-span case, through the real UI.
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

async function fresh(opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => requests.push(r.url()));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_|tile|favicon/.test(m.text())) errors.push('console.error: ' + m.text().slice(0, 200));
  });
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  return { ctx, page, errors, requests };
}

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
const today = () => new Date().toISOString().slice(0, 10);

async function withLibrary(rows, opts = {}) {
  const h = await fresh(opts);
  await h.page.goto(URL, { waitUntil: 'domcontentloaded' });
  await h.page.waitForSelector('.tabbar');
  await plantRows(h.page, rows);
  await h.page.reload({ waitUntil: 'domcontentloaded' });
  await h.page.waitForSelector('.tabbar');
  return h;
}

/** Every element's computed style, swept for the two named removals. */
const sweepRemovals = (page) => page.evaluate(() => {
  const bad = { backdrop: [], gradient: [] };
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const bf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (bf && bf !== 'none') bad.backdrop.push(el.className + ' :: ' + bf);
    for (const p of ['backgroundImage', 'background', 'maskImage', 'borderImageSource']) {
      const v = cs[p];
      if (typeof v === 'string' && /gradient\(/.test(v)) bad.gradient.push(el.className + ' :: ' + p + '=' + v.slice(0, 80));
    }
  }
  return bad;
});

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));

// ===========================================================================
head('A — DARK MODE (builder: "dark mode was not looked at in a browser")');
{
  const t = today();
  const rows = [
    row('done', '2019-05-01', '2019-05-08', ['AT']),
    row('now', t, t, ['AT', 'GB']),
  ];
  for (const scheme of ['light', 'dark']) {
    const { ctx, page, errors } = await withLibrary(rows, { colorScheme: scheme });
    await page.getByRole('tab', { name: 'Map' }).click();
    await page.waitForTimeout(200);

    const bad = await sweepRemovals(page);
    ok(bad.backdrop.length === 0, `[${scheme}] tell 1: no element paints a backdrop-filter`, bad.backdrop);
    ok(bad.gradient.length === 0, `[${scheme}] tell 2: no element paints a gradient`, bad.gradient);

    const paint = await page.evaluate(() => {
      const g = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e) : null; };
      const conf = document.querySelector('.worldmap__country:not(.worldmap__country--provisional)');
      const prov = document.querySelector('.worldmap__country--provisional');
      const sea = document.querySelector('.worldmap__sea');
      return {
        paper: getComputedStyle(document.body).backgroundColor,
        ink: getComputedStyle(document.body).color,
        topbar: g('.topbar').backgroundColor,
        confFill: conf ? getComputedStyle(conf).fill : null,
        provFill: prov ? getComputedStyle(prov).fill : null,
        provStroke: prov ? getComputedStyle(prov).stroke : null,
        seaFill: sea ? getComputedStyle(sea).fill : null,
        markFill: g('.topbar__mark path') ? getComputedStyle(document.querySelector('.topbar__mark path')).stroke : null,
      };
    });
    note(`[${scheme}] paper=${paint.paper} ink=${paint.ink} sea=${paint.seaFill} conf=${paint.confFill} prov=${paint.provFill}/${paint.provStroke}`);

    ok(paint.confFill && paint.provFill, `[${scheme}] both countries are drawn`);
    ok(paint.confFill !== paint.provFill, `[${scheme}] A-34: provisional is NOT the same ink as confirmed`);
    // The one only dark can fail: is a provisional country distinguishable from the SEA?
    const dSea = dist(rgb(paint.provFill), rgb(paint.seaFill));
    const dConfSea = dist(rgb(paint.confFill), rgb(paint.seaFill));
    note(`[${scheme}] provisional-fill vs sea distance = ${dSea.toFixed(1)}; confirmed-fill vs sea = ${dConfSea.toFixed(1)}`);
    // NOT an assertion: A-40 residue 3 / the stylesheet both specify "an OUTLINE over a faint
    // tint", so the fill deliberately sits near the sea and the DASHED STROKE carries the
    // signal. Recorded because it is the one thing only a dark render can get wrong, and it
    // does not: the stroke is high-contrast in both themes. See /tmp/r33-map-{light,dark}.png.
    ok(dist(rgb(paint.provStroke), rgb(paint.provFill)) > 40,
       `[${scheme}] the provisional STROKE (which carries the signal) contrasts with its own tint`,
       { stroke: paint.provStroke, fill: paint.provFill });

    // Opacity is still not carrying a signal in this theme either.
    const anyOpacity = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('.worldmap__country, .stop, .spine__day')) {
        const o = getComputedStyle(el).opacity;
        if (o !== '1') out.push(el.className + '=' + o);
      }
      return out;
    });
    ok(anyOpacity.length === 0, `[${scheme}] nothing on the map or timeline is attenuated by opacity`, anyOpacity);

    // Topbar is opaque in this theme too (removal 1's real content).
    ok(!/rgba?\([^)]*,\s*0?\.\d+\)/.test(paint.topbar), `[${scheme}] the topbar is OPAQUE`, paint.topbar);
    ok(errors.length === 0, `[${scheme}] no page errors`, errors);
    await page.screenshot({ path: `/tmp/r33-map-${scheme}.png`, fullPage: false });
    await ctx.close();
  }
}

// ===========================================================================
head('B — MOTION: the two transitions, and prefers-reduced-motion (builder: "not exercised")');
{
  for (const rm of ['no-preference', 'reduce']) {
    const { ctx, page } = await withLibrary([row('at', '2019-05-01', '2019-05-08', ['AT'])], { reducedMotion: rm });
    await page.getByRole('tab', { name: 'Map' }).click();
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const tab = document.querySelector('.tabbar__tab');
      const country = document.querySelector('.worldmap__country');
      const cs = (e) => { const s = getComputedStyle(e); return { prop: s.transitionProperty, dur: s.transitionDuration }; };
      return { tab: cs(tab), country: cs(country) };
    });
    note(`[reduced-motion:${rm}] tab ${m.tab.prop} / ${m.tab.dur} · country ${m.country.prop} / ${m.country.dur}`);
    const live = (d) => d.split(',').some((x) => parseFloat(x) > 0);
    if (rm === 'no-preference') {
      ok(live(m.tab.dur), 'the tab underline transition is LIVE', m.tab);
      ok(/border-color|all/.test(m.tab.prop), 'and it covers the underline (border-color)', m.tab.prop);
      ok(live(m.country.dur) && /fill|all/.test(m.country.prop), 'the country hover fill transition is LIVE', m.country);
    } else {
      ok(!live(m.tab.dur), 'prefers-reduced-motion SUPPRESSES the tab transition', m.tab);
      ok(!live(m.country.dur), 'prefers-reduced-motion SUPPRESSES the country transition', m.country);
    }

    // And that the hover/selected states actually change paint (a transition on a property
    // nothing changes is a written-but-dead transition).
    const hover = await page.evaluate(async () => {
      const c = document.querySelector('.worldmap__country');
      const before = getComputedStyle(c).fill;
      c.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      return { before };
    });
    const onFill = await page.evaluate(() => {
      const c = document.querySelector('.worldmap__country');
      c.classList.add('worldmap__country--on');
      const on = getComputedStyle(c).fill;
      c.classList.remove('worldmap__country--on');
      return on;
    });
    // Read IMMEDIATELY after the class change, so under `no-preference` the transition has
    // not started yet and the value is still the resting ink. That is the point: equal here
    // and different in `reduce` is exactly what a live transition looks like. The arrival is
    // asserted in `qa/r33-render2.mjs` §I, which waits for it.
    note(`[${rm}] fill at t=0 after adding --on: rest=${hover.before} on=${onFill}`);
    if (rm === 'reduce') ok(onFill !== hover.before, '[reduce] the selected fill applies INSTANTLY', { rest: hover.before, on: onFill });
    else ok(onFill === hover.before, '[no-preference] the selected fill is still animating at t=0 (the transition is real)', { rest: hover.before, on: onFill });

    // The tab underline actually moves when you switch tabs.
    const under = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('.tabbar__tab')];
      return tabs.map((t) => ({ id: t.id, on: t.className.includes('--on'), border: getComputedStyle(t).borderBottomColor }));
    });
    ok(under.filter((t) => t.on).length === 1, `[${rm}] exactly one tab is marked current`, under);
    ok(under.find((t) => t.on).border !== under.find((t) => !t.on).border,
       `[${rm}] the current tab's underline is a different colour from the others`, under);
    await ctx.close();
  }
}

// ===========================================================================
head('C — NETWORK: fonts self-hosted, zero external requests after load');
{
  const { ctx, page, requests } = await withLibrary([row('at', '2019-05-01', '2019-05-08', ['AT', 'US'])]);
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(400);
  await page.evaluate(() => document.fonts.ready);
  const external = requests.filter((u) => !u.startsWith(URL) && !u.startsWith('data:') && !u.startsWith('blob:'));
  note(`total requests: ${requests.length}; distinct origins: ${[...new Set(requests.map((u) => { try { return new global.URL(u).origin; } catch { return u.slice(0, 20); } }))].join(', ')}`);
  ok(external.length === 0, 'NO request leaves the app origin (fonts, tiles, telemetry)', external.slice(0, 8));
  ok(!requests.some((u) => /fonts\.(googleapis|gstatic)\.com/.test(u)), 'specifically: nothing from Google Fonts');
  const faces = await page.evaluate(() => [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`));
  void 0;
  note('faces: ' + faces.join(' | '));
  // NB `'unloaded'.endsWith('loaded')` is true — compare the status exactly. A Map-only tour
  // never requests a mono weight below 600, so the 500 face is legitimately not yet loaded
  // here; `qa/r33-render3.mjs` tours every surface and confirms all four are used.
  ok(faces.length === 4, 'four self-hosted faces are declared', faces);
  ok(faces.filter((f) => /=?loaded$/.test(f) && !/unloaded$/.test(f)).length >= 3,
     'at least the three faces this surface uses are loaded from the app', faces);
  const fontReqs = requests.filter((u) => /\.woff2$/.test(u));
  ok(fontReqs.length > 0 && fontReqs.every((u) => u.startsWith(URL)), 'every woff2 came from this origin', fontReqs);
  await ctx.close();
}

// ===========================================================================
head('D — THE ANTIMERIDIAN RESIDUE, measured on the SHIPPED SAMPLE (A-40 Part 7 residue 1)');
{
  // Europe 2026 is the only real trip this product ships. It carries US (the LA legs).
  const t = today();
  const rows = [row('europe2026', '2026-08-07', '2026-08-22', ['AT', 'HR', 'CZ', 'HU', 'GB', 'US'])];
  const want = worldMapFrame(core.travelStats(rows, t), core.COUNTRY_INDEX);
  note(`reference viewBox: ${want.viewBox}`);
  const { ctx, page } = await withLibrary(rows);
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(300);
  const geom = await page.evaluate(() => {
    const svg = document.querySelector('.worldmap__svg');
    const box = svg.getBoundingClientRect();
    const out = { svg: { w: Math.round(box.width), h: Math.round(box.height) }, countries: {} };
    for (const p of svg.querySelectorAll('.worldmap__country')) {
      const r = p.getBoundingClientRect();
      out.countries[p.dataset.code] = { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    }
    return out;
  });
  note(`svg painted at ${geom.svg.w}x${geom.svg.h} css px`);
  for (const [code, r] of Object.entries(geom.countries)) note(`  ${code}: ${r.w} x ${r.h} px`);
  const euro = ['AT', 'HR', 'CZ', 'HU', 'GB'];
  const worst = Math.min(...euro.map((c) => geom.countries[c].w));
  const at = geom.countries.AT;
  ok(at.w >= 24, `Austria is at least 24 css px wide on the shipped sample (got ${at.w})`, geom.countries);
  ok(worst >= 12, `the narrowest European country on the shipped sample is at least 12 px wide (got ${worst})`, geom.countries);
  note(`US is ${geom.countries.US.w} px wide; the five European countries occupy ` +
       `${euro.reduce((s, c) => s + geom.countries[c].w, 0).toFixed(1)} px of ${geom.svg.w}`);
  await page.screenshot({ path: '/tmp/r33-antimeridian.png' });

  // The control: the SAME trip without the US leg.
  const rows2 = [row('europe2026', '2026-08-07', '2026-08-22', ['AT', 'HR', 'CZ', 'HU', 'GB'])];
  const { ctx: c2, page: p2 } = await withLibrary(rows2);
  await p2.getByRole('tab', { name: 'Map' }).click();
  await p2.waitForTimeout(300);
  const g2 = await p2.evaluate(() => {
    const r = document.querySelector('.worldmap__country[data-code="AT"]').getBoundingClientRect();
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  });
  note(`without the US leg, Austria renders ${g2.w} x ${g2.h} px — ${(g2.w / at.w).toFixed(0)}x wider`);
  await c2.close();
  await ctx.close();
}

// ===========================================================================
head('E — MOBILE, 375x667 (the product is a phone app with a web companion)');
{
  const { ctx, page, errors } = await withLibrary(
    [row('at', '2019-05-01', '2019-05-08', ['AT', 'HR', 'CZ', 'HU', 'GB', 'US'])],
    { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  );
  const layout = await page.evaluate(() => {
    const t = document.querySelector('.topbar').getBoundingClientRect();
    const b = document.querySelector('.tabbar').getBoundingClientRect();
    return {
      docW: document.documentElement.scrollWidth, winW: window.innerWidth,
      topbar: { top: t.top, bottom: t.bottom, h: t.height },
      tabbar: { top: b.top, bottom: b.bottom, h: b.height },
      tabbarStickyTop: getComputedStyle(document.querySelector('.tabbar')).top,
    };
  });
  note(JSON.stringify(layout));
  ok(layout.docW <= layout.winW + 1, 'no horizontal overflow on the Trips tab', layout);
  ok(layout.tabbar.top >= layout.topbar.bottom - 1,
     'the tab bar does not sit under the topbar at rest', layout);

  // The real test: SCROLL, where the two sticky bars meet.
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(120);
  const stuck = await page.evaluate(() => {
    const t = document.querySelector('.topbar').getBoundingClientRect();
    const b = document.querySelector('.tabbar').getBoundingClientRect();
    return { topbarBottom: +t.bottom.toFixed(1), tabbarTop: +b.top.toFixed(1), overlap: +(t.bottom - b.top).toFixed(1) };
  });
  note(`scrolled: topbar bottom ${stuck.topbarBottom}, tabbar top ${stuck.tabbarTop}, overlap ${stuck.overlap}px`);
  ok(stuck.overlap <= 1, 'the two sticky bars do not overlap when scrolled', stuck);

  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(250);
  const mapM = await page.evaluate(() => {
    const s = document.querySelector('.worldmap__svg').getBoundingClientRect();
    return { w: +s.width.toFixed(1), h: +s.height.toFixed(1), docW: document.documentElement.scrollWidth, winW: window.innerWidth };
  });
  note(JSON.stringify(mapM));
  ok(mapM.docW <= mapM.winW + 1, 'no horizontal overflow on the Map tab', mapM);
  ok(mapM.w > 200 && mapM.h > 120, 'the map is painted at a usable size on a phone', mapM);
  // The legend wraps rather than clipping.
  const legend = await page.evaluate(() => {
    const l = document.querySelector('.worldmap__legend');
    return { w: l.scrollWidth, cw: l.clientWidth };
  });
  ok(legend.w <= legend.cw + 1, 'the legend does not clip on a phone', legend);
  ok(errors.length === 0, 'no page errors on mobile', errors);
  await page.screenshot({ path: '/tmp/r33-mobile.png', fullPage: false });
  await ctx.close();
}

// ===========================================================================
head('F — THE ERROR BOUNDARY: contained, but is it ESCAPABLE?');
{
  // A shape-invalid stored startDate. `travelStats` throws (the Map's read gate catches it)
  // and `core.lifecycle` throws inside Library.tsx (no read gate) — the builder's own
  // second finding. Confirm the containment AND look for the way out.
  const rows = [row('broken', 'not-a-date', '2019-05-08', ['AT']), row('fine', '2019-05-01', '2019-05-08', ['HR'])];
  const { ctx, page, errors } = await withLibrary(rows);
  await page.waitForTimeout(300);

  const trips = await page.evaluate(() => {
    const p = document.querySelector('#tabpanel-trips');
    return { html: p ? p.innerText.slice(0, 200) : null, cards: document.querySelectorAll('.tripcard').length };
  });
  note(`Trips tab: ${JSON.stringify(trips)}`);
  ok(await page.locator('.tabbar').count() === 1, 'the shell survives — not a blank page');
  ok(/could not be shown/i.test(trips.html || ''), 'the Trips tab reports its own failure (TabBoundary)');
  ok(trips.cards === 0, 'and the library list is gone with it');

  await page.getByRole('tab', { name: 'Map' }).click();
  await page.waitForTimeout(200);
  ok(/could not read your travel history/i.test(await page.locator('#tabpanel-map').innerText()),
     'the Map refuses in words');

  // Now: is there ANY in-app way back? The Library is the only delete/export surface, and
  // it is the surface that threw. Enumerate every control the user still has.
  const controls = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button, a[href], input, select')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      out.push((el.tagName + ':' + (el.innerText || el.getAttribute('aria-label') || el.type || '')).trim().slice(0, 40));
    }
    return out;
  });
  note('every visible control left: ' + JSON.stringify(controls));
  const canRecover = controls.some((c) => /delete|remove|repair|reset|clear|export|discard/i.test(c));
  ok(canRecover, 'the user has SOME control that removes or exports the offending trip', controls);

  // And does the boundary reset when the cause is gone? Remove the bad row live and re-render.
  await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open('cairn'); r.onsuccess = () => res(r.result); });
    await new Promise((res) => { const tx = db.transaction('summaries', 'readwrite'); tx.objectStore('summaries').delete('broken'); tx.oncomplete = res; });
    db.close();
  });
  await page.getByRole('tab', { name: 'Trips' }).click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => document.querySelector('#tabpanel-trips').innerText.slice(0, 120));
  note(`after the bad row is gone (no reload): ${JSON.stringify(after)}`);
  ok(!/could not be shown/i.test(after), 'the boundary RESETS once the cause is removed', after);
  note('page errors seen: ' + JSON.stringify(errors.slice(0, 3)));
  await ctx.close();
}

// ===========================================================================
head('G — SIGNAL COMPOSITION at every severity, not just blocker (.stop--dim fix)');
{
  // The builder's §6 measures ONE composition: copied + unaccepted + blocker. The rule the
  // increment is written to is broader — provenance may attenuate NOTHING. Sweep the
  // stylesheet's own rules for any selector that sets opacity and also matches a signal.
  const { ctx, page } = await withLibrary([]);
  const rules = await page.evaluate(() => {
    const out = [];
    for (const sheet of document.styleSheets) {
      let list; try { list = sheet.cssRules; } catch { continue; }
      const walk = (rs) => {
        for (const r of rs) {
          if (r.cssRules) { walk(r.cssRules); continue; }
          if (!r.selectorText || !r.style) continue;
          const o = r.style.getPropertyValue('opacity');
          if (o && o.trim() !== '' && o.trim() !== '1') out.push({ sel: r.selectorText, opacity: o.trim() });
        }
      };
      walk(list);
    }
    return out;
  });
  note('every stylesheet rule that sets a non-1 opacity:');
  for (const r of rules) note(`   ${r.sel}  ->  ${r.opacity}`);
  const PROV = /unaccepted|imported|dim|provisional|suggest|candidate|copied/i;
  const offenders = rules.filter((r) => PROV.test(r.sel));
  ok(offenders.length === 0, 'no provenance/provisional selector carries opacity anywhere in the shipped CSS', offenders);
  const SEV = /flag|blocker|warn|sev|conflict/i;
  const sevOff = rules.filter((r) => SEV.test(r.sel) && !/--done|is-done|resolved/i.test(r.sel));
  ok(sevOff.length === 0, 'no UNRESOLVED severity selector carries opacity either', sevOff);
  await ctx.close();
}

// ===========================================================================
head('H — THE MIN-SPAN CASE END TO END, through the real tab UI (I-8a ship gate)');
{
  for (const [code, shouldClamp] of [['VA', true], ['AT', false], ['GI', false], ['MC', false]]) {
    const rows = [row(code.toLowerCase(), '2018-03-01', '2018-03-03', [code])];
    const want = worldMapFrame(core.travelStats(rows, today()), core.COUNTRY_INDEX);
    const { ctx, page } = await withLibrary(rows);
    // Boot on Trips (map hidden), then switch — the inherited "never fit while hidden" bug.
    const hiddenVB = await page.getAttribute('#tabpanel-map .worldmap__svg', 'viewBox');
    await page.getByRole('tab', { name: 'Map' }).click();
    await page.waitForTimeout(200);
    const shownVB = await page.getAttribute('.worldmap__svg', 'viewBox');
    ok(shownVB === want.viewBox && shownVB === hiddenVB,
       `[${code}] the viewBox survives the hidden->shown transition and equals the oracle`,
       { hiddenVB, shownVB, want: want.viewBox });
    ok(want.bounds.clamped === shouldClamp, `[${code}] ORACLE clamped=${shouldClamp}`, want.bounds.clamped);
    const noteCount = await page.locator('.legend__note').count();
    ok((noteCount === 1) === shouldClamp, `[${code}] the "readable minimum" note is shown iff clamped`, noteCount);
    // What does the user actually see? How wide is the country's own frame, in km?
    const [, , w] = want.viewBox.split(' ').map(Number);
    const km = w * 111.32 * Math.cos((want.bounds.centre.lat * Math.PI) / 180);
    note(`[${code}] rendered frame is ${km.toFixed(2)} km wide (clamped=${want.bounds.clamped})`);
    ok(km >= 50, `[${code}] a one-country history does not open at a rooftop zoom (>= 50 km of frame)`, km.toFixed(2));
    await ctx.close();
  }
}

await browser.close();
console.log(fails === 0 ? '\nall green' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
