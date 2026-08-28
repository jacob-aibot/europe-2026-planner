import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|tile/.test(m.text())) errors.push('console.error: ' + m.text().slice(0, 200)); });
await page.route('**/*.tile.openstreetmap.org/**', (r) => r.abort());
await page.route('**tile.openstreetmap.org/**', (r) => r.abort());

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /Load Europe 2026/i }).click();
await page.waitForTimeout(1200);

console.log('== the spine: are all 16 days present and clickable? ==');
const dayBtns = page.locator('button').filter({ hasText: /^08-\d\d/ });
const n = await dayBtns.count();
console.log('   day buttons in the spine:', n, '(days appear once per city tab, so >16 is expected)');
const labels = [];
for (let i = 0; i < n; i++) labels.push((await dayBtns.nth(i).innerText()).split('\n')[0]);
const unique = [...new Set(labels)].sort();
console.log('   unique day ids:', unique.join(' '));
ok('all 16 dates reachable from the spine', unique.length === 16, unique.length + ' unique');

console.log('');
console.log('== walk every day: render errors, badges, map ==');
const seen = new Set();
const badgeCounts = {};
for (let i = 0; i < n; i++) {
  const label = labels[i];
  if (seen.has(label)) continue;
  seen.add(label);
  await dayBtns.nth(i).click();
  await page.waitForTimeout(250);
  const txt = await page.locator('body').innerText();
  if (/Something went wrong|TypeError|undefined is not/.test(txt)) console.log('   RENDER PROBLEM on ' + label);
  const rows = await page.locator('[class*="status"], [class*="badge"], .stop__status, .pill').allInnerTexts();
  for (const r of rows) { const k = r.trim().toLowerCase(); if (k) badgeCounts[k] = (badgeCounts[k] || 0) + 1; }
}
console.log('   distinct badge/status texts seen across all days:');
for (const [k, v] of Object.entries(badgeCounts).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log('     ' + JSON.stringify(k) + ' x' + v);

console.log('');
console.log('== the 21 "suggested" stops: does each carry a visible marker? ==');
await page.locator('button').filter({ hasText: /^08-08/ }).first().click();
await page.waitForTimeout(400);
const dayHtml = await page.locator('body').innerHTML();
const film = await page.getByText(/Filmfestival Rathausplatz/).count();
console.log('   Filmfestival Rathausplatz (a sug:true stop) present:', film);
const rowHandle = page.locator('li,div').filter({ hasText: /Filmfestival Rathausplatz/ }).last();
const rowClass = await rowHandle.getAttribute('class');
const rowText = (await rowHandle.innerText()).replace(/\n+/g, ' | ');
console.log('   its row class:', rowClass);
console.log('   its row text :', rowText.slice(0, 260));
ok('a system suggestion is visibly marked in the day view',
  /suggest/i.test(rowClass || '') || /suggest|my addition|proposal|idea/i.test(rowText),
  'no badge text and no suggestion class on the row');

console.log('');
console.log('== Aug 8 map: opens on Vienna, not the 621 km whole-day box ==');
const mapInfo = await page.evaluate(() => {
  const el = document.querySelector('.leaflet-container');
  if (!el) return { mounted: false };
  const zoomEl = document.querySelector('.leaflet-control-zoom');
  const tiles = document.querySelectorAll('.leaflet-tile').length;
  const markers = document.querySelectorAll('.leaflet-marker-icon, .leaflet-interactive').length;
  return { mounted: true, tiles, markers, w: el.clientWidth, h: el.clientHeight, hasZoomCtl: !!zoomEl };
});
console.log('   ', JSON.stringify(mapInfo));
ok('map container mounted with non-zero size', mapInfo.mounted && mapInfo.w > 0 && mapInfo.h > 0);
ok('pins/polyline rendered', mapInfo.markers > 0, JSON.stringify(mapInfo));
const toggle = await page.getByText(/Whole day|journey/i).count();
console.log('   "whole day journey" toggle present:', toggle);

console.log('');
console.log('== conflicts panel ==');
const conflictBtn = page.getByRole('button', { name: /conflict/i }).first();
if (await conflictBtn.count()) {
  await conflictBtn.click();
  await page.waitForTimeout(400);
  const t = await page.locator('body').innerText();
  const blockers = (t.match(/blocker/gi) || []).length;
  console.log('   "blocker" occurrences in the panel:', blockers);
  console.log('   panel excerpt:', t.slice(t.search(/conflict/i), t.search(/conflict/i) + 400).replace(/\n+/g, ' | '));
}

console.log('');
console.log('== errors ==');
console.log(errors.length ? errors.slice(0, 8).join('\n') : '   none');
await page.screenshot({ path: './day08.png' });
await browser.close();
