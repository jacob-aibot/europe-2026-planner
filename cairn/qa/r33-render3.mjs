/**
 * QA round 33, part 3 — the last two: the dead font face, and the sticky-bar stripe, both
 * across the WHOLE app rather than one surface.
 *
 *   Needs: npm run web:build && npm run serve
 *   Run:   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r33-render3.mjs
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const URL = process.env.CAIRN_URL ?? 'http://localhost:4173/';
let fails = 0;
const ok = (c, l, x) => { if (c) console.log(`  ok    ${l}`); else { fails++; console.log(`  FAIL  ${l}${x === undefined ? '' : '  -> ' + JSON.stringify(x)}`); } };
const head = (s) => console.log(`\n== ${s} ==`);
const note = (s) => console.log(`  note  ${s}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
const page = await ctx.newPage();
const reqs = [];
page.on('request', (r) => reqs.push(r.url()));
await page.route('**tile.openstreetmap.org/**', (r) => r.abort());

head('the shipped sample, every surface — which of the four faces is ever used?');
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.tabbar');
await page.waitForTimeout(400);

const sampleBtn = page.locator('button', { hasText: /Europe 2026|sample|Open the sample/i }).first();
if (await sampleBtn.count()) { await sampleBtn.click(); await page.waitForTimeout(1200); }
note('opened: ' + (await page.locator('.topbar__title').innerText().catch(() => '(no trip open)')));

const seen = new Set();
const collect = async (where) => {
  const w = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      if (el.childElementCount !== 0 || !el.textContent.trim()) continue;
      const cs = getComputedStyle(el);
      const fam = cs.fontFamily.split(',')[0].replace(/"/g, '');
      out.push(fam + '@' + cs.fontWeight);
    }
    return [...new Set(out)];
  });
  for (const x of w) seen.add(x);
  note(`${where}: ${JSON.stringify(w)}`);
};
await collect('TripView');
// Every panel the trip view has.
for (const name of ['Conflicts', 'Validation', 'Costs', 'Bookings', 'Places', 'Map']) {
  const b = page.locator('button', { hasText: new RegExp('^' + name, 'i') }).first();
  if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(350); await collect(name); }
}
await page.locator('.topbar__brand').click().catch(() => {});
await page.waitForTimeout(600);
await collect('Library');
await page.getByRole('tab', { name: 'Map' }).click();
await page.waitForTimeout(500);
await collect('World map');

await page.evaluate(() => document.fonts.ready);
const faces = await page.evaluate(() => [...document.fonts].map((f) => `${f.family}@${f.weight}=${f.status}`));
note('document.fonts after visiting every surface: ' + JSON.stringify(faces));
const woff = [...new Set(reqs.filter((u) => /\.woff2/.test(u)).map((u) => u.split('/').pop()))];
note('woff2 files the browser actually fetched: ' + JSON.stringify(woff));
ok(woff.length === 4, 'all four shipped woff2 files are fetched by a full tour of the app', woff);
const dead = faces.filter((f) => !f.endsWith('=loaded'));
ok(dead.length === 0, 'no shipped face is dead payload', { dead, weightsUsed: [...seen] });

head('the two sticky bars, photographed');
await page.locator('.topbar__brand').click().catch(() => {});
await page.waitForTimeout(500);
if (await sampleBtn.count()) { await sampleBtn.click().catch(() => {}); await page.waitForTimeout(1000); }
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(250);
const gap = await page.evaluate(() => {
  const t = document.querySelector('.topbar').getBoundingClientRect();
  const b = document.querySelector('.tabbar').getBoundingClientRect();
  // What is painted in the strip between them?
  const mid = (t.bottom + b.top) / 2;
  const el = document.elementFromPoint(Math.round(window.innerWidth / 2), Math.round(mid));
  return { topbarBottom: +t.bottom.toFixed(2), tabbarTop: +b.top.toFixed(2), gap: +(b.top - t.bottom).toFixed(2),
           whatIsInTheGap: el ? (el.className || el.tagName) + ' :: ' + (el.textContent || '').trim().slice(0, 40) : null };
});
note(JSON.stringify(gap));
ok(gap.gap < 1, 'no see-through stripe between the two sticky bars', gap);
await page.screenshot({ path: '/tmp/r33-sticky.png', clip: { x: 0, y: 0, width: 700, height: 110 } });

head('the brand mark, at 1x');
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(150);
const mark = await page.evaluate(() => {
  const s = document.querySelector('.topbar__mark');
  const r = s.getBoundingClientRect();
  const cs = getComputedStyle(s);
  const p = s.querySelector('path');
  const pcs = getComputedStyle(p);
  return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), fill: pcs.fill, stroke: pcs.stroke, sw: pcs.strokeWidth,
           bg: cs.backgroundImage, filter: cs.filter, boxShadow: cs.boxShadow };
});
note(JSON.stringify(mark));
ok(mark.bg === 'none', 'the mark carries no gradient background', mark.bg);
ok(mark.boxShadow === 'none', 'and no glow ring', mark.boxShadow);
ok(mark.fill === 'none', 'it is drawn (stroked), not filled', mark.fill);
ok(mark.w >= 14 && mark.h >= 14, 'and it is at least 14px, i.e. actually legible', mark);
await page.screenshot({ path: '/tmp/r33-mark.png', clip: { x: 0, y: 0, width: 200, height: 40 } });

await browser.close();
console.log(fails === 0 ? '\nall green' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
