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
 *     `ATTRIBUTION_PROBES` exist for.
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
 * **phase 6** is the RUNTIME half of the "keep typing" state (**QA R74-5**): the shard the
 * picker's first attribution probe resolves to is answered **404**, and the credit must still be
 * on screen. `test/attribution.test.ts` holds the re-pin path — *does the probe query still
 * resolve against the committed corpus* — and by construction cannot see a shard that fails in
 * the browser. Only a browser can.
 *
 * The injected faults N1, N2, N3, N3b and N4 are `qa/i30-faults.sh`, which applies each mutation
 * inside a throwaway `git worktree` (never the checkout you run it from — QA R74-4) and runs this
 * probe and `test/boundaries.test.ts` against it.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
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

/**
 * **A run that never started must not look like a run that failed** — QA **R74-2**.
 *
 * This used to pick one random port in 5100-5499, pass `--strictPort`, and have no retry. An
 * occupied port was therefore a 90 s timeout and a **non-zero exit with zero assertions run** —
 * and `qa/i30-faults.sh`'s `probe()`, which scored a row by exit code alone, read that as *the
 * injected fault fired*. Vite's own default port, 5173, is inside that range. Two halves, and
 * both are needed:
 *
 *  1. the port is one the **kernel** says is free (bind `:0`, read it back, release it), and a
 *     start that fails anyway is retried on a fresh port rather than giving up;
 *  2. a run that could not start prints a `FAIL` line, exits non-zero and **never prints the
 *     `i30-attribution: <url>` line below** — which is the marker `probe()` now requires before
 *     it will call a non-zero exit a fired fault.
 */
const freePort = () => new Promise((res, rej) => {
  const s = createServer();
  s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});

async function startServer() {
  const attempts = 6;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let port;
    try { port = await freePort(); } catch (e) { console.log(`  note no free port from the kernel: ${e}`); break; }
    // The vite binary directly rather than through `npx`: npx forks rather than execs, so
    // `child.kill()` reaped the wrapper and left the dev server running. Same process group as
    // this probe, deliberately — Ctrl-C at a terminal must reach it.
    const bin = resolve(CAIRN, 'node_modules/.bin/vite');
    const direct = existsSync(bin);
    const flags = ['--port', String(port), '--host', '127.0.0.1', '--strictPort'];
    const proc = spawn(direct ? bin : 'npx', direct ? flags : ['vite', ...flags], {
      cwd: resolve(CAIRN, 'apps/web'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let noise = '';
    const started = await new Promise((res) => {
      const t = setTimeout(() => res(false), 60_000);
      proc.stdout.on('data', (b) => { noise += b; if (/ready in/.test(String(b))) { clearTimeout(t); res(true); } });
      proc.stderr.on('data', (b) => { noise += b; process.stderr.write(`  vite: ${b}`); });
      proc.on('exit', () => { clearTimeout(t); res(false); });
      proc.on('error', () => { clearTimeout(t); res(false); });
    });
    if (started) return { child: proc, url: `http://127.0.0.1:${port}/` };
    proc.kill('SIGKILL');
    console.log(`  note vite did not start on port ${port} (attempt ${attempt}/${attempts})${/in use/i.test(noise) ? ' — the port was taken between the check and the spawn' : ''}`);
  }
  return null;
}

let child = null;
let url = flag('url');
if (url === null) {
  const server = await startServer();
  if (server === null) {
    failures++;
    console.log('  FAIL the dev server never started, so THIS RUN MEASURED NOTHING.');
    console.log('       Zero assertions ran. A non-zero exit here is not a fired fault — it is the');
    console.log('       absence of a measurement. Use --url=http://host:port to attack a running server.');
    process.exit(1);
  }
  ({ child, url } = server);
} else {
  // The same rule for an injected server: if it does not answer, say so rather than dying
  // inside phase 1 with an exit code that reads like a fired fault.
  try {
    const res = await fetch(url, { redirect: 'manual' });
    if (res.status >= 500) throw new Error(`the server answered ${res.status}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${url} does not answer, so THIS RUN MEASURED NOTHING: ${String(e).slice(0, 160)}`);
    process.exit(1);
  }
}
console.log(`i30-attribution: ${url}`);

const { chromium } = pw;
const browser = await chromium.launch();
const stop = async () => {
  await browser.close();
  if (child) {
    child.kill('SIGTERM');
    await new Promise((res) => { const t = setTimeout(res, 3000); child.on('exit', () => { clearTimeout(t); res(); }); });
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
};

/** A fresh origin-scoped page with the map tiles cut off; the picker needs neither. */
async function freshPage(opts = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { failures++; console.log(`  FAIL pageerror: ${e.message.slice(0, 200)}`); });
  if (has('keep')) page.on('console', (m) => console.log(`  console.${m.type()}: ${m.text().slice(0, 160)}`));
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  if (opts.block404) await page.route(opts.block404, (r) => r.fulfill({ status: 404, body: 'nope' }));
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
 * one.** The exact `Gazetteer.source` string, and a link to the licence, both **on screen**.
 *
 * **"On screen" is measured, not inferred — QA R74-3.** This used to stop at `count()` and
 * `innerText()`, and neither of them is about the screen: `count()` counts hidden nodes and
 * `innerText()` returns the text of a `display:none` element. The whole three-state set therefore
 * passed **35/35 with the credit invisible** (`qa/r74-vacuity.sh` **V1** plants exactly that).
 * The visibility half below is lifted from the breaker's own probe — `qa/r74-i30.mjs` **§C** —
 * rather than invented a second time and weaker: visible, a non-zero box, opacity above 0.1, and
 * a licence link that is itself visible, named and at least 24 px tall.
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
  const linked = (await link.count()) === 1;
  ok(
    linked,
    `${state}: a link to ${LICENCE}`,
    `hrefs found: ${JSON.stringify(await node.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))))}`,
  );

  // --- the screen, not the DOM (R74-3; qa/r74-i30.mjs §C) ---------------------------------
  ok(await node.isVisible(), `${state}: the credit is VISIBLE`, 'innerText() returns text for a display:none node too');
  const box = await node.boundingBox();
  ok(box !== null && box.width > 0 && box.height > 0, `${state}: the credit has a non-zero box`, JSON.stringify(box));
  const style = await node.evaluate((el) => {
    const s = getComputedStyle(el);
    return { display: s.display, visibility: s.visibility, opacity: s.opacity, fontSize: s.fontSize };
  });
  ok(parseFloat(style.opacity) > 0.1, `${state}: the credit is not transparent`, JSON.stringify(style));
  if (!linked) return;
  ok(await link.isVisible(), `${state}: the licence link is visible`);
  ok((await link.innerText()).trim().length > 0, `${state}: the licence link has an accessible name`);
  const lbox = await link.boundingBox();
  ok(lbox !== null && lbox.height >= 24, `${state}: the licence link is a touchable target (>=24px)`, JSON.stringify(lbox));
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

/* --------------------------------------------------------------------------------- phase 6 */

head(`phase 6 — one dead shard: the credit survives a RUNTIME probe failure`);
{
  // **QA R74-5.** The picker learns `source` by asking one query on mount. While that was a
  // single query whose failure was swallowed, a 404 on that one shard left the *"keep typing"*
  // state — the state A-91 names third — with **no attribution node at all**, and nothing went
  // red: `test/attribution.test.ts` holds the RE-PIN path (does the probe still resolve against
  // the committed corpus?) and cannot see a runtime failure. This phase is that path.
  //
  // The shard is derived rather than spelled: the picker exports its probe queries, and the
  // loader says which shard a query resolves to, so this stays true across a re-pin.
  const pickerSrc = readFileSync(resolve(CAIRN, 'apps/web/src/views/CitySelector.tsx'), 'utf8');
  const declared = /ATTRIBUTION_PROBES\s*=\s*\[([^\]]*)\]/.exec(pickerSrc);
  const probes = declared ? [...declared[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
  ok(probes.length >= 2, 'the picker declares more than one attribution probe', JSON.stringify(probes));
  const { loadGazetteerFor } = await import('@cairn/core/gazetteer');
  const first = probes.length === 0 ? null : await loadGazetteerFor(probes[0]);
  const shard = first === null ? null : first.shard;
  ok(shard !== null, 'the first probe resolves to a shard this phase can kill', JSON.stringify(probes[0] ?? null));
  if (shard !== null) {
    const page = await freshPage({ block404: `**/geo/gazetteer/${shard}.json*` });
    const input = await openPicker(page);
    await page.waitForTimeout(2400);
    ok((await input.inputValue()) === '', 'the form opens with an empty city input');
    await attributionIsOnScreen(page, `keep typing, ${shard}.json 404 at runtime`);
    await page.context().close();
  }
}

/* ------------------------------------------------------------------------------------ done */

await stop();
console.log(`\n${failures === 0 ? 'all phases green' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
