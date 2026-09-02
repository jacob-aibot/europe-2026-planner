/**
 * Renders every direction at the two viewports Jacob named, in every state, and writes PNGs to
 * `shots/`. Mobile is `devices['iPhone 14']` (390×664, DPR 3, touch, coarse pointer) rather than a
 * bare viewport, because a bare viewport emulates no touch and a touch-target check needs one.
 *
 *   node docs/design/directions/render.mjs            # all
 *   node docs/design/directions/render.mjs a          # one
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium, devices } = pw;
const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });

const BASE = process.env.CAIRN_PROTO_URL ?? 'http://localhost:4180/cairn/docs/design/directions';
const only = process.argv[2];

/** [id, folder, [ [stateName, driver] ... ] ] */
const DIRECTIONS = [
  ['a', 'a-journey-map', [
    ['world', async () => {}],
    ['journey', async (p) => { await p.locator('.j', { hasText: 'Europe 2026' }).first().click(); await p.waitForTimeout(500); }],
    ['day', async (p) => {
      await p.locator('.j', { hasText: 'Europe 2026' }).first().click(); await p.waitForTimeout(400);
      await p.locator('.day').nth(7).click(); await p.waitForTimeout(500);
    }],
    ['past-record', async (p) => { await p.locator('.j', { hasText: 'Croatia 2022' }).first().click(); await p.waitForTimeout(500); }],
  ]],
  ['b', 'b-plates', [
    ['top', async () => {}],
    ['plate', async (p) => { await p.evaluate(() => document.querySelector('#scroller').scrollTo({ top: 1500 })); await p.waitForTimeout(700); }],
    ['memory', async (p) => { await p.evaluate(() => { const t = document.querySelector('#memory'); document.querySelector('#scroller').scrollTo({ top: t.offsetTop - 40 }); }); await p.waitForTimeout(700); }],
  ]],
  ['c', 'c-spatial', [
    ['far', async () => {}],
    ['mid', async (p) => { await p.getByRole('button', { name: /^Countries$/ }).click(); await p.waitForTimeout(600); }],
    ['near', async (p) => { await p.getByRole('button', { name: /^Places$/ }).click(); await p.waitForTimeout(600); }],
  ]],
];

const VIEWPORTS = [
  ['mobile', { ...devices['iPhone 14'] }],
  ['desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }],
];

const browser = await chromium.launch();
let errors = 0;

for (const [id, folder, states] of DIRECTIONS) {
  if (only && only !== id) continue;
  for (const [vname, vopts] of VIEWPORTS) {
    for (const [sname, drive] of states) {
      const ctx = await browser.newContext(vopts);
      const page = await ctx.newPage();
      page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log(`  console error ${id}/${vname}/${sname}: ${m.text()}`); } });
      page.on('pageerror', (e) => { errors++; console.log(`  PAGE ERROR ${id}/${vname}/${sname}: ${e.message}`); });
      await page.goto(`${BASE}/${folder}/index.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      try { await drive(page); } catch (e) { errors++; console.log(`  DRIVE FAILED ${id}/${vname}/${sname}: ${e.message.split('\n')[0]}`); }
      await page.screenshot({ path: join(SHOTS, `${id}-${vname}-${sname}.png`) });
      console.log(`  ${id}-${vname}-${sname}.png`);
      await ctx.close();
    }
  }
}
await browser.close();
console.log(errors ? `\n${errors} error(s)` : '\nno console or page errors');
