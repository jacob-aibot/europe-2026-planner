/**
 * **I-30 — the picker's CC BY 4.0 attribution and the Geneva round trip, in a real browser.**
 *
 *   Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/i30-attribution.mjs   (from cairn/)
 *   Options: `--url=http://host:port` to attack an already-running server instead of spawning
 *            one; `--keep` to leave the browser's console noise on stdout; `--offline` to skip
 *            phase 4's live licence fetch (it will say SKIPPED, loudly, and still exit 1 —
 *            a criterion that says *"actually loaded and confirmed to resolve"* is not
 *            satisfiable without a network and this probe will not pretend otherwise).
 *
 * **Why a browser.** ROADMAP `I-30` marks A-91 item 3 `[rendered]` and the node suite cannot
 * reach it: `test/boundaries.test.ts` forbids importing `apps/web` from `test/`, which is the
 * boundary that keeps the live planner's data out of a bundle. `test/attribution.test.ts` holds
 * the half a text instrument can hold — that no fragment of the credit is written in the picker's
 * code, and that the "keep typing" probe query still resolves to `meta.json`'s own `$source`.
 * **This file holds the other half: that the string and the link are on screen.**
 *
 * **The three states are three different things** (§8.4 A-83 Part 6, A-91 item 3):
 *
 *   - **phase 1, hits** — the corpus was searched and answered.
 *   - **phase 2, a miss** — the corpus was searched and holds nothing. *A miss is a miss.*
 *   - **phase 3, "keep typing"** — **nothing was searched**. Two shapes: a query under two
 *     characters (including the empty input a freshly-opened form starts in), and a one-token
 *     query that IS a corpus split prefix, whose true answer is that prefix's whole subtree.
 *     Below two characters `loadGazetteerFor` answers `null` *before* it reads the meta document,
 *     so this is the state that has no `source` of its own and the one the picker's
 *     `ATTRIBUTION_PROBE` exists for.
 *
 * **phase 4** loads the licence link itself — root `CLAUDE.md`'s ticket rule applied to a licence:
 * *every ticketed thing gets a link that was actually loaded and confirmed to resolve*.
 *
 * **phase 5** is `I-30`'s other formal criterion, the pick round trip, driven from the screen
 * rather than from a test: **Geneva → save → reload → Switzerland**. Geneva is not an arbitrary
 * city. It is one of the 2,494 shipped rows the country index disagrees about
 * (`node cli.ts cities geneva` prints the disagreement marker on it), so the pick's own
 * `countryCode` has to outrank `countryOf(centre)` for `CH` to survive — §8.4 **A-84** Part 3.
 * A city the index agrees with would pass this phase without exercising it.
 *
 * The injected faults N1, N2, N3 and N4 are `qa/i30-faults.sh`, which mutates the real sources,
 * runs this probe and `test/boundaries.test.ts` against each mutation, and restores.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const argv = process.argv.slice(2);
const flag = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const has = (n) => argv.includes(`--${n}`);

const LICENCE = 'https://creativecommons.org/licenses/by/4.0/';
/** The credit, read from the corpus. Never spelled here either — that is the fault N3 injects. */
const SOURCE = JSON.parse(readFileSync(resolve(CAIRN, 'packages/core/src/geo/gazetteer/meta.json'), 'utf8')).$source;

let failures = 0;
const ok = (cond, label, extra = '') => {
  if (!cond) failures++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${cond || !extra ? '' : `\n         ${extra}`}`);
};
const head = (s) => console.log(`\n== ${s} ==`);

/* ------------------------------------------------------------------ the server under attack */

let child = null;
let url = flag('url');
if (url === null) {
  const port = 5100 + Math.floor(Math.random() * 400);
  url = `http://127.0.0.1:${port}/`;
  child = spawn('npx', ['vite', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], {
    cwd: resolve(CAIRN, 'apps/web'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const ready = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('vite did not start within 90s')), 90_000);
    child.stdout.on('data', (b) => { if (/ready in/.test(String(b))) { clearTimeout(t); res(); } });
    child.stderr.on('data', (b) => process.stderr.write(`  vite: ${b}`));
  });
  await ready;
}
console.log(`i30-attribution: ${url}`);

const { chromium } = pw;
const browser = await chromium.launch();
const stop = async () => {
  await browser.close();
  if (child) child.kill('SIGTERM');
};

/** A fresh origin-scoped page with the map tiles cut off; the picker needs neither. */
async function freshPage() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { failures++; console.log(`  FAIL pageerror: ${e.message.slice(0, 200)}`); });
  if (has('keep')) page.on('console', (m) => console.log(`  console.${m.type()}: ${m.text().slice(0, 160)}`));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  return page;
}

/** Open the past-journey form, which is one of the two surfaces that mounts the picker. */
async function openPicker(page) {
  const start = page.getByRole('button', { name: /Add somewhere I.ve been|Add a past journey/i }).first();
  await start.click();
  await page.waitForTimeout(1200);
  return page.getByPlaceholder('Start typing a city');
}

/**
 * **The assertion A-91 item 3 actually makes, in one place so all three states make the same
 * one.** The exact `Gazetteer.source` string, and a link to the licence, both on screen.
 */
async function attributionIsOnScreen(page, state) {
  const node = page.getByTestId('gazetteer-attribution');
  const present = (await node.count()) === 1;
  ok(present, `${state}: an attribution node is rendered`, 'A-91 item 3: the credit is owed in this state too');
  if (!present) return;
  const text = await node.innerText();
  ok(
    text.includes(SOURCE),
    `${state}: the rendered text is meta.json's exact $source`,
    `rendered: ${JSON.stringify(text.slice(0, 160))}\n         expected to contain: ${JSON.stringify(SOURCE.slice(0, 160))}`,
  );
  const link = node.locator(`a[href="${LICENCE}"]`);
  ok(
    (await link.count()) === 1,
    `${state}: a link to ${LICENCE}`,
    `hrefs found: ${JSON.stringify(await node.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))))}`,
  );
}

/* --------------------------------------------------------------------------------- phase 1 */

head(`phase 1 — hits: the corpus was searched and answered`);
{
  const page = await freshPage();
  const input = await openPicker(page);
  await input.fill('geneva');
  await page.waitForTimeout(1600);
  const options = await page.locator('[role=option]').allInnerTexts();
  ok(options.some((o) => /Geneva, Switzerland/.test(o)), 'the search returns at least one hit', JSON.stringify(options.slice(0, 3)));
  await attributionIsOnScreen(page, 'hits');
  await page.context().close();
}

/* --------------------------------------------------------------------------------- phase 2 */

head(`phase 2 — a miss: the corpus was searched and holds nothing`);
{
  const page = await freshPage();
  const input = await openPicker(page);
  await input.fill('zzqqxwv');
  await page.waitForTimeout(1600);
  const body = await page.locator('form').innerText();
  ok(/No map matches found/.test(body), 'the picker says a miss is a miss', JSON.stringify(body.slice(-300)));
  await attributionIsOnScreen(page, 'miss');
  await page.context().close();
}

/* --------------------------------------------------------------------------------- phase 3 */

head(`phase 3 — "keep typing": nothing was searched, and the credit is still owed`);
{
  const page = await freshPage();
  const input = await openPicker(page);

  // (a) the empty input a freshly-opened form starts in — zero characters.
  await page.waitForTimeout(1200);
  ok((await input.inputValue()) === '', 'the form opens with an empty city input');
  await attributionIsOnScreen(page, 'keep typing (0 characters)');

  // (b) one character: still under `loadGazetteer`'s two-character floor.
  await input.fill('g');
  await page.waitForTimeout(1200);
  ok((await page.locator('[role=option]').count()) === 0, 'one character searches nothing');
  await attributionIsOnScreen(page, 'keep typing (1 character)');

  // (c) a bare split prefix — two characters, and still "I have not looked yet". `san` is a
  //     split prefix in the shipped corpus, so its true answer is that prefix's whole subtree
  //     and A-83 Part 6 refuses the fetch. The picker must not call this a miss.
  await input.fill('san');
  await page.waitForTimeout(1800);
  const panel = await page.locator('form').innerText();
  ok(!/No map matches found/.test(panel), 'a bare split prefix is not reported as a miss', JSON.stringify(panel.slice(-300)));
  ok(/Keep typing/i.test(panel), 'a bare split prefix says "keep typing"', JSON.stringify(panel.slice(-300)));
  await attributionIsOnScreen(page, 'keep typing (bare split prefix)');
  await page.context().close();
}

/* --------------------------------------------------------------------------------- phase 4 */

head(`phase 4 — the licence link is actually loaded and confirmed to resolve`);
if (has('offline')) {
  failures++;
  console.log('  SKIPPED — --offline was passed. The criterion says "actually loaded and confirmed');
  console.log('           to resolve"; this run does not establish it and exits non-zero.');
} else {
  const page = await freshPage();
  const input = await openPicker(page);
  await input.fill('geneva');
  await page.waitForTimeout(1600);
  const link = page.getByTestId('gazetteer-attribution').locator('a');
  const href = (await link.count()) === 0 ? null : await link.first().getAttribute('href');
  ok(href === LICENCE, 'the rendered href is the CC BY 4.0 deed', JSON.stringify(href));
  await page.context().close();
  // **Fetched with Node rather than navigated in the page, and the reason is the container, not
  // the criterion.** Outbound HTTPS here goes through an agent proxy whose CA Node trusts
  // (`NODE_EXTRA_CA_CERTS`) and Chromium's own store does not, so `page.goto(href)` dies on
  // `ERR_CERT_AUTHORITY_INVALID`. The alternative is `ignoreHTTPSErrors`, which would turn *"a
  // link that was actually loaded and confirmed to resolve"* into *"a link that resolved to
  // whatever answered"* — a weaker claim wearing the same words. The href under test is the one
  // read off the rendered DOM a line above, so nothing about the subject changes.
  try {
    if (href === null) throw new Error('there is no link on screen to load — see phases 1-3');
    const res = await fetch(href, { redirect: 'follow' });
    ok(res.status === 200, `${href} returns 200`, `status: ${res.status}`);
    ok(res.url === LICENCE, 'it resolves without redirecting somewhere else', res.url);
    const body = await res.text();
    ok(/Attribution 4\.0 International/i.test(body), 'the loaded page is the CC BY 4.0 deed', body.slice(0, 200));
  } catch (e) {
    ok(false, 'the licence link is loaded and resolves', String(e).slice(0, 200));
  }
}

/* --------------------------------------------------------------------------------- phase 5 */

head(`phase 5 — Geneva, saved, reloaded, Switzerland`);
{
  const page = await freshPage();
  const input = await openPicker(page);
  await page.getByTestId('past-title').fill('Geneva 2019');
  await page.getByTestId('past-month').fill('2019-03');
  await input.fill('geneva');
  await page.waitForTimeout(1600);
  const first = page.locator('[role=option]').first();
  ok(/Geneva, Switzerland/.test(await first.innerText()), 'the Swiss Geneva is the first option');
  await first.click();
  await page.waitForTimeout(500);
  const chip = await page.locator('.city-selector__selected').innerText();
  ok(/Map matched/.test(chip) && /CH/.test(chip), 'the picked city carries a map match and CH', JSON.stringify(chip));
  await page.getByTestId('past-submit').click();
  await page.waitForTimeout(3000);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // (a) the stored document and its summary — the pick, whole, off disk after a reload.
  const stored = await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const db = r.result;
      const names = [...db.objectStoreNames].filter((n) => n === 'docs' || n === 'summaries');
      const tx = db.transaction(names, 'readonly');
      const out = {};
      let left = names.length;
      for (const n of names) {
        const g = tx.objectStore(n).getAll();
        g.onsuccess = () => { out[n] = g.result.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))); if (--left === 0) res(out); };
      }
    };
  }));
  const doc = JSON.parse(stored.docs[0]);
  const city = doc.cities[0];
  ok(city.name === 'Geneva', 'the stored city is Geneva', JSON.stringify(city.name));
  ok(
    city.centre !== null && Math.abs(city.centre.lat - 46.2022) < 1e-6 && Math.abs(city.centre.lng - 6.1457) < 1e-6,
    "the stored city carries Geneva's own coordinate, not {0,0} and not null",
    JSON.stringify(city.centre),
  );
  ok(city.pick !== null && city.pick.countryCode === 'CH', 'the pick is stored whole, carrying CH', JSON.stringify(city.pick));
  ok(
    city.pick !== null && city.centre !== null && city.pick.centre.lat === city.centre.lat && city.pick.centre.lng === city.centre.lng,
    'the city stands on a copy of the pick\'s centre',
  );
  const summary = JSON.parse(stored.summaries[0]);
  const sc = summary.cities.find((c) => c.name === 'Geneva');
  ok(sc !== undefined && sc.countryCode === 'CH', 'the summary attributes Geneva to CH', JSON.stringify(sc));
  ok(
    sc !== undefined && sc.countrySource === 'picked',
    "the attribution's source is the PICK, outranking countryOf — the index disagrees about this row",
    JSON.stringify(sc && sc.countrySource),
  );

  // (b) the lifetime map, rendered, after the reload.
  const world = await page.locator('body').innerText();
  ok(/Switzerland/.test(world), 'World names Switzerland after the reload', JSON.stringify(world.slice(0, 200)));
  ok(/\bCH\b/.test(world), 'World carries the CH code after the reload');
  await page.context().close();
}

/* ------------------------------------------------------------------------------------ done */

await stop();
console.log(`\n${failures === 0 ? 'all phases green' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
