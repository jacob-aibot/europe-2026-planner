const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.goto('http://127.0.0.1:5180/', { waitUntil: 'networkidle' });
assert.equal(await page.getByText('Make this world yours.').count(), 1);
assert.equal(await page.getByText(/0 countries/i).count(), 0);
await page.screenshot({ path: '.impeccable/review/first-run-world-mobile.png' });

await page.getByRole('tab', { name: 'Trips' }).click();
assert.equal(await page.getByRole('button', { name: /Plan a new trip/ }).count(), 1);
assert.equal(await page.getByRole('button', { name: /Add a past journey/ }).count(), 1);
await page.waitForTimeout(500);
await page.screenshot({ path: '.impeccable/review/first-run-trips-mobile.png' });

await page.getByRole('tab', { name: 'You' }).click();
assert.equal(await page.getByText('Built one journey at a time.').count(), 1);
assert.equal(await page.getByTestId('profile-claim').count(), 0);
await page.waitForTimeout(500);
await page.screenshot({ path: '.impeccable/review/first-run-you-mobile.png' });

await page.getByRole('button', { name: 'Set up profile' }).click();
await page.getByLabel('Your name').fill('Jacob Miller');
await page.getByLabel(/Home city/).fill('Phoenix');
await page.getByLabel(/A little about you/).fill('Curious about old cities and wild coastlines.');
await page.getByRole('button', { name: 'Save my profile' }).click();
assert.equal(await page.getByText('Jacob Miller').count(), 1);
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('tab', { name: 'You' }).click();
assert.equal(await page.getByText('Home in Phoenix').count(), 1);

await page.getByRole('button', { name: /Add a past journey/ }).click();
await page.getByLabel('Title').fill('Croatia memory');
await page.getByTestId('past-month').fill('2022-06');
const city = page.getByRole('combobox');
await city.fill('Pa');
await city.fill('Split');
assert.match(await page.locator('.city-selector__source').innerText(), /^GeoNames geographical database/);
await page.getByRole('option', { name: /Split, Split-Dalmatia, Croatia/ }).click();
await page.getByRole('button', { name: 'Record it' }).click();
await page.getByRole('tab', { name: 'World' }).click();
assert.equal(await page.getByRole('button', { name: /Croatia Visited/ }).count(), 1);

await context.close();
const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const wide = await desktop.newPage();
await wide.goto('http://127.0.0.1:5180/', { waitUntil: 'networkidle' });
await wide.waitForTimeout(500);
await wide.screenshot({ path: '.impeccable/review/first-run-world-desktop.png' });
await wide.getByRole('tab', { name: 'Trips' }).click();
await wide.waitForTimeout(500);
await wide.screenshot({ path: '.impeccable/review/first-run-trips-desktop.png' });
await wide.getByRole('tab', { name: 'You' }).click();
await wide.waitForTimeout(500);
await wide.screenshot({ path: '.impeccable/review/first-run-you-desktop.png' });
await browser.close();
console.log('first-run browser checks passed');
