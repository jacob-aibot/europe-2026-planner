import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;

const URL = 'http://localhost:4173/';
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n, c ? '' : x);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
const requests = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0, 200)); });
page.on('request', (r) => requests.push(r.url()));

await page.goto(URL, { waitUntil: 'networkidle' });
console.log('== boot ==');
ok('title is Cairn', (await page.title()) === 'Cairn');
ok('library renders', await page.locator('.library').isVisible());

await page.getByRole('button', { name: /Load Europe 2026/i }).click();
await page.waitForSelector('.tripcard, .trip, .spine, .daytimeline, .timeline', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
console.log('   after loading the sample, url:', page.url());
const bodyText = await page.locator('body').innerText();
console.log('   first 300 chars:', JSON.stringify(bodyText.slice(0, 300)));

console.log('');
console.log('== every day reachable ==');
const dayButtons = await page.locator('[data-day-id], .spine__day, .sidebar button').count();
console.log('   candidate day controls:', dayButtons);

console.log('');
console.log('== provenance badges in the DOM ==');
// walk all 16 days, collect stop rows and check that non-own rows carry a visible badge
const html = await page.content();
for (const word of ['suggested', 'Suggested', 'candidate', 'Candidate', 'imported', 'my addition']) {
  const n = (html.match(new RegExp(word, 'g')) || []).length;
  console.log('   occurrences of ' + JSON.stringify(word) + ':', n);
}

console.log('');
console.log('== network requests made by the app ==');
const hosts = [...new Set(requests.map((u) => { try { return new URL(u).host; } catch { return u; } }))];
console.log('   ', hosts.join(', '));

console.log('');
console.log('== errors seen ==');
console.log(errors.length ? errors.slice(0, 10).join('\n') : '   none');

await page.screenshot({ path: './shot1.png', fullPage: false });
await browser.close();
