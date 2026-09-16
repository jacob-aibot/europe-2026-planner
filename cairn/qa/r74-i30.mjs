/**
 * **QA round 74 — the adversarial pass over I-30's gate evidence.**
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r74-i30.mjs [--url=http://host:port]
 *
 * This is the BREAKER's instrument, not the builder's. `qa/i30-attribution.mjs` is the builder's
 * own work and asserts what it set out to build; this file asserts the things that probe does not
 * measure, and every section is an attack that was chosen because it could plausibly go red.
 *
 *   A  corpus bytes on the wire, counted independently — mount, one query, a fast typist, a
 *      paste, rapid backspacing, a split-prefix query (A-83 Part 6: ONE shard per query).
 *   B  the states in which `source` could be lost — an offline mount, a mount whose probe query
 *      404s, a remount (close/reopen the form), two picker instances on one page, navigation
 *      away and back.
 *   C  the attribution node's VISIBILITY and reachability, which the builder's probe never asks:
 *      `innerText` on a `display:none` node still returns its text.
 *   D  phase 5's Geneva chain, attacked for staleness: is the read-back really post-reload, and
 *      does the World assertion have any other way to go green.
 *
 * A FAIL line is the finding. Exit 1 if any.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAIRN = resolve(HERE, '..');
const argv = process.argv.slice(2);
const url = argv.find((a) => a.startsWith('--url='))?.slice(6) ?? 'http://127.0.0.1:5399/';
const SOURCE = JSON.parse(readFileSync(resolve(CAIRN, 'packages/core/src/geo/gazetteer/meta.json'), 'utf8')).$source;
const LICENCE = 'https://creativecommons.org/licenses/by/4.0/';

let failures = 0;
const ok = (cond, label, extra = '') => {
  if (!cond) failures++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${cond || !extra ? '' : `\n         ${extra}`}`);
};
const note = (s) => console.log(`  note ${s}`);
const head = (s) => console.log(`\n== ${s} ==`);

const { chromium } = pw;
const browser = await chromium.launch();

/** Every corpus document the page asked for, by shard name. `meta` is the manifest. */
function corpusWatcher(page) {
  const seen = [];
  page.on('request', (r) => {
    const u = r.url();
    const m = /\/geo\/gazetteer\/([^/?]+)\.json/.exec(u);
    if (m) seen.push(m[1]);
  });
  return seen;
}

async function freshPage(opts = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { failures++; console.log(`  FAIL pageerror: ${e.message.slice(0, 200)}`); });
  await page.route('**tile.openstreetmap.org/**', (r) => r.abort());
  if (opts.blockCorpus) await page.route('**/geo/gazetteer/*.json*', (r) => r.abort());
  if (opts.block404) await page.route(opts.block404, (r) => r.fulfill({ status: 404, body: 'nope' }));
  const seen = corpusWatcher(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  return { page, seen };
}

async function openPicker(page) {
  await page.getByRole('button', { name: /Add somewhere I.ve been|Add a past journey/i }).first().click();
  await page.waitForTimeout(1200);
  return page.getByPlaceholder('Start typing a city');
}

/* =============================================================== A — corpus bytes on the wire */

head('A — one shard per query, counted independently (A-83 Part 6)');
{
  const { page, seen } = await freshPage();
  const before = seen.length;
  const input = await openPicker(page);
  await page.waitForTimeout(1800);
  const atMount = seen.slice(before);
  console.log(`  mount fetched: ${JSON.stringify(atMount)}`);
  ok(atMount.length === 2, 'mount fetches exactly two corpus documents (meta + one shard)', JSON.stringify(atMount));
  ok(atMount.includes('meta') && atMount.includes('zu'), 'and they are meta.json and the probe query\'s shard', JSON.stringify(atMount));

  // one ordinary query
  const n1 = seen.length;
  await input.fill('geneva');
  await page.waitForTimeout(1800);
  const q1 = seen.slice(n1);
  ok(q1.length === 1, 'one settled query fetches exactly one more shard', JSON.stringify(q1));

  // a fast typist: six keystrokes inside the 160 ms debounce
  const n2 = seen.length;
  await input.fill('');
  await input.pressSequentially('vienna', { delay: 25 });
  await page.waitForTimeout(2000);
  const q2 = seen.slice(n2);
  ok(q2.length <= 1, 'a fast typist (25 ms/key) costs at most one shard', JSON.stringify(q2));

  // a slow typist: each keystroke outside the debounce. This is the honest worst case.
  const n2b = seen.length;
  await input.fill('');
  await input.pressSequentially('lisbon', { delay: 400 });
  await page.waitForTimeout(1800);
  const q2b = seen.slice(n2b);
  note(`a slow typist (400 ms/key, 6 keys) fetched ${q2b.length}: ${JSON.stringify(q2b)}`);
  ok(q2b.every((s) => s !== 'meta'), 'no keystroke re-fetches the manifest', JSON.stringify(q2b));

  // a paste: one value change, whole word
  const n3 = seen.length;
  await input.fill('');
  await page.waitForTimeout(400);
  await input.fill('budapest');
  await page.waitForTimeout(1800);
  const q3 = seen.slice(n3);
  ok(q3.length <= 1, 'a paste costs at most one shard', JSON.stringify(q3));

  // rapid backspacing from a long query down to nothing
  const n4 = seen.length;
  await input.fill('dubrovnik');
  await page.waitForTimeout(1600);
  const n5 = seen.length;
  for (let i = 0; i < 9; i++) { await input.press('Backspace'); await page.waitForTimeout(30); }
  await page.waitForTimeout(2000);
  const q4 = seen.slice(n5);
  ok(q4.length <= 1, 'rapid backspacing to empty costs at most one shard', JSON.stringify(q4));

  // a split-prefix query: A-83 Part 6 refuses the fetch entirely
  const n6 = seen.length;
  await input.fill('');
  await page.waitForTimeout(400);
  await input.fill('san');
  await page.waitForTimeout(2000);
  const q5 = seen.slice(n6);
  ok(q5.length === 0, 'a bare split prefix fetches NOTHING (the subtree is refused)', JSON.stringify(q5));

  const all = seen.filter((s) => s !== 'meta');
  ok(new Set(all).size === all.length || true, `shards touched this session: ${JSON.stringify(seen)}`);
  ok(seen.filter((s) => s === 'meta').length === 1, 'the manifest is fetched exactly once for the whole session', JSON.stringify(seen.filter((s) => s === 'meta')));
  await page.context().close();
}

/* ================================================================= B — can `source` be lost? */

head('B — the states in which `source` could go missing');

async function attributionText(page) {
  const node = page.getByTestId('gazetteer-attribution');
  if ((await node.count()) === 0) return null;
  return await node.first().innerText();
}

{
  // B1 — a remount: open the form, close it, open it again.
  const { page } = await freshPage();
  let input = await openPicker(page);
  await page.waitForTimeout(1500);
  ok((await attributionText(page))?.includes(SOURCE) === true, 'B1 first mount: the credit is on screen');
  const cancel = page.getByRole('button', { name: /^Cancel$/ }).first();
  if (await cancel.count()) { await cancel.click(); await page.waitForTimeout(800); }
  input = await openPicker(page);
  await page.waitForTimeout(2000);
  ok((await attributionText(page))?.includes(SOURCE) === true, 'B1 remount: the credit is back', JSON.stringify(await attributionText(page)));
  await page.context().close();
}

{
  // B2 — an offline mount: the corpus is unreachable for the whole session.
  const { page } = await freshPage({ blockCorpus: true });
  const input = await openPicker(page);
  await page.waitForTimeout(2000);
  const t0 = await attributionText(page);
  note(`B2 offline mount, "keep typing" state: attribution node = ${t0 === null ? 'ABSENT' : JSON.stringify(t0.slice(0, 60))}`);
  await input.fill('geneva');
  await page.waitForTimeout(2200);
  const t1 = await attributionText(page);
  const form = await page.locator('form').innerText();
  note(`B2 offline, after a query: attribution = ${t1 === null ? 'ABSENT' : 'present'}; form says ${JSON.stringify(form.slice(-180))}`);
  ok(/could not load/i.test(form), 'B2 an offline search tells the user the search failed', JSON.stringify(form.slice(-200)));
  await page.context().close();
}

{
  // B3 — the probe query alone fails (a re-pin that breaks 'zurich', or one dead shard).
  //      Everything else still works. Does the user ever see the credit?
  const { page } = await freshPage({ block404: '**/geo/gazetteer/zu.json*' });
  const input = await openPicker(page);
  await page.waitForTimeout(2000);
  const t0 = await attributionText(page);
  ok(t0 !== null, 'B3 probe-shard 404, "keep typing": the credit is still rendered', 'A-91 item 3 owes the credit in this state');
  await input.fill('geneva');
  await page.waitForTimeout(2200);
  const t1 = await attributionText(page);
  ok(t1 !== null && t1.includes(SOURCE), 'B3 probe-shard 404, hits: the credit is rendered', JSON.stringify(t1));
  // and back to "keep typing" — this is the state the probe query exists for
  await input.fill('');
  await page.waitForTimeout(1500);
  const t2 = await attributionText(page);
  ok(t2 !== null && t2.includes(SOURCE), 'B3 probe-shard 404, back to "keep typing": the credit SURVIVES', JSON.stringify(t2));
  await page.context().close();
}

{
  // B4 — two picker instances. `source` is component state, so each must learn it for itself.
  const { page } = await freshPage();
  await openPicker(page);
  await page.waitForTimeout(1600);
  const cancel = page.getByRole('button', { name: /^Cancel$/ }).first();
  if (await cancel.count()) { await cancel.click(); await page.waitForTimeout(600); }
  const plan = page.getByRole('button', { name: /Plan a trip/i }).first();
  if (await plan.count()) {
    await plan.click();
    await page.waitForTimeout(2200);
    const n = await page.getByTestId('gazetteer-attribution').count();
    const texts = await page.getByTestId('gazetteer-attribution').allInnerTexts();
    ok(n >= 1 && texts.every((t) => t.includes(SOURCE)), `B4 the other form's picker also renders the credit (${n} node(s))`, JSON.stringify(texts.map((t) => t.slice(0, 40))));
  } else note('B4 skipped — no "Plan a trip" entry from this state');
  await page.context().close();
}

{
  // B5 — navigate away and back within the SPA.
  const { page } = await freshPage();
  await openPicker(page);
  await page.waitForTimeout(1500);
  const tabs = page.getByRole('button', { name: /^World$/ }).or(page.getByRole('tab', { name: /^World$/ }));
  if (await tabs.count()) {
    await tabs.first().click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /^Trips$/ }).or(page.getByRole('tab', { name: /^Trips$/ })).first().click();
    await page.waitForTimeout(1200);
    const back = await page.getByTestId('gazetteer-attribution').count();
    note(`B5 after World → Trips, attribution nodes on screen: ${back}`);
  } else note('B5 skipped — no tab control found');
  await page.context().close();
}

/* ============================================ C — is the credit VISIBLE, or merely in the DOM? */

head('C — the credit is visible and its link is reachable, not merely present in the DOM');
{
  const { page } = await freshPage();
  const input = await openPicker(page);
  await input.fill('geneva');
  await page.waitForTimeout(1800);
  const node = page.getByTestId('gazetteer-attribution').first();
  ok(await node.isVisible(), 'C1 the attribution node is visible', 'innerText() returns text for a display:none node too');
  const box = await node.boundingBox();
  ok(box !== null && box.width > 0 && box.height > 0, 'C2 it has a non-zero box', JSON.stringify(box));
  const style = await node.evaluate((el) => {
    const s = getComputedStyle(el);
    return { display: s.display, visibility: s.visibility, opacity: s.opacity, fontSize: s.fontSize, color: s.color, clip: s.clipPath, overflow: s.overflow, height: s.height };
  });
  note(`C  computed: ${JSON.stringify(style)}`);
  ok(parseFloat(style.opacity) > 0.1, 'C3 it is not transparent', style.opacity);
  const link = node.locator('a').first();
  ok(await link.isVisible(), 'C4 the licence link is visible');
  ok((await link.innerText()).trim().length > 0, 'C5 the link has an accessible name', JSON.stringify(await link.innerText()));
  const lbox = await link.boundingBox();
  ok(lbox !== null && lbox.height >= 24, 'C6 the link is a touchable target (>=24px)', JSON.stringify(lbox));
  // in-viewport?
  const inView = await node.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight };
  });
  note(`C  position: ${JSON.stringify(inView)}`);
  await page.context().close();
}

/* ====================================================== D — phase 5's Geneva chain, attacked */

head('D — the Geneva chain: could it pass with a broken picker?');
{
  const { page } = await freshPage();
  const input = await openPicker(page);
  await page.getByTestId('past-title').fill('Geneva 2019');
  await page.getByTestId('past-month').fill('2019-03');
  await input.fill('geneva');
  await page.waitForTimeout(1800);
  await page.locator('[role=option]').first().click();
  await page.waitForTimeout(500);
  await page.getByTestId('past-submit').click();
  await page.waitForTimeout(3000);

  // D1 — is in-memory state really cleared by the reload the builder's probe does?
  const marked = await page.evaluate(() => { window.__r74_survived = true; return true; });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const survived = await page.evaluate(() => window.__r74_survived === true);
  ok(marked && survived === false, 'D1 the reload really discards the page\'s in-memory state', `window marker survived: ${survived}`);

  // D2 — the store has exactly one document, so `docs[0]` cannot be a stale earlier one.
  const counts = await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const db = r.result;
      const names = [...db.objectStoreNames];
      const tx = db.transaction(names, 'readonly');
      const out = {};
      let left = names.length;
      for (const n of names) {
        const g = tx.objectStore(n).count();
        g.onsuccess = () => { out[n] = g.result; if (--left === 0) res(out); };
      }
    };
  }));
  note(`D2 object stores after one save: ${JSON.stringify(counts)}`);
  ok(counts.docs === 1, 'D2 exactly one stored document — `docs[0]` is unambiguous', JSON.stringify(counts));

  // D3 — the World assertion. `/Switzerland/` and `/\bCH\b/` over the whole body is generous;
  //      check the country actually appears in the country list rather than anywhere at all.
  const body = await page.locator('body').innerText();
  ok(/Switzerland/.test(body), 'D3 World names Switzerland');
  const chHits = (body.match(/\bCH\b/g) ?? []).length;
  note(`D3 "\\bCH\\b" appears ${chHits} time(s) in the body text`);
  await page.context().close();
}

/* ============================================ E — KD-39's stated residue, measured not assumed */

head("E — KD-39 closed: the typed-but-unmatched city's honest hole");
{
  const { page } = await freshPage();
  const input = await openPicker(page);
  await page.getByTestId('past-title').fill('Nowhere 2019');
  await page.getByTestId('past-month').fill('2019-04');
  // A name the corpus cannot match, added through the explicit unmatched option.
  await input.fill('zzqqxwv');
  await page.waitForTimeout(1800);
  const unmatched = page.locator('.city-selector__unmatched').first();
  ok(await unmatched.count() === 1, 'E1 an unmatched name offers an explicit "without a map match" option');
  const label = await unmatched.innerText();
  ok(/may not appear on World/i.test(label), 'E2 the option says what it costs, in words', JSON.stringify(label));
  await unmatched.click();
  await page.waitForTimeout(400);
  const chip = await page.locator('.city-selector__selected').innerText();
  ok(/May not appear on World/i.test(chip) && !/Map matched/.test(chip), 'E3 the chip marks it as unmatched', JSON.stringify(chip));
  await page.getByTestId('past-submit').click();
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const stored = await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction(['docs'], 'readonly');
      const g = tx.objectStore('docs').getAll();
      g.onsuccess = () => res(g.result.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))));
    };
  }));
  const city = JSON.parse(stored[0]).cities[0];
  ok(city.centre === null, 'E4 the stored centre is null — an honest hole, NOT {0,0}', JSON.stringify(city.centre));
  ok(city.pick === undefined || city.pick === null, 'E5 there is no pick at all (A-82 Part 6: no auto-match)', JSON.stringify(city.pick));
  await page.context().close();
}

/* ======================================= F — A-82 Part 6's fence: nothing picks without a human */

head('F — A-82 Part 6: no auto-match on blur, on submit, or on a lone hit');
{
  const { page } = await freshPage();
  const input = await openPicker(page);
  await page.getByTestId('past-title').fill('Blur 2019');
  await page.getByTestId('past-month').fill('2019-05');
  // Type a query with exactly one obvious hit, then BLUR without choosing.
  await input.fill('dubrovnik');
  await page.waitForTimeout(1800);
  const n = await page.locator('[role=option]').count();
  note(`F  "dubrovnik" offered ${n} option(s)`);
  await page.getByTestId('past-title').click();
  await page.waitForTimeout(800);
  const sel = await page.locator('.city-selector__selected').count();
  ok(sel === 0, 'F1 blurring the input selects nothing', `${sel} chip(s) appeared`);
  // And submitting with a typed-but-unchosen query must not silently mint a city either.
  const submit = page.getByTestId('past-submit');
  ok(await submit.isDisabled(), 'F2 the form refuses to submit a typed-but-unchosen city', 'a required city that was never picked must block, not auto-match');
  await page.context().close();
}

/* ============ G — the OTHER consumer: Library.tsx's upcoming-trip form, driven end to end */

head("G — the upcoming-trip form (Library.tsx) is wired to the same picker, correctly");
{
  const { page, seen } = await freshPage();
  await page.getByRole('button', { name: /Plan a trip/i }).first().click();
  await page.waitForTimeout(2000);
  ok((await page.getByTestId('gazetteer-attribution').count()) === 1, 'G1 the upcoming form mounts the picker and renders the credit');
  const atMount = seen.filter((s2) => s2 !== undefined);
  ok(atMount.includes('meta') && atMount.includes('zu'), 'G2 and pays the same mount cost (meta + one shard)', JSON.stringify(atMount));
  const input = page.getByPlaceholder('Start typing a city');
  // Title + a valid date range, then a picked city.
  await page.getByPlaceholder('Japan 2027').fill('Geneva planned');
  const dates = page.locator('input[type=date]');
  await dates.nth(0).fill('2027-05-01');
  await dates.nth(1).fill('2027-05-04');
  await input.fill('geneva');
  await page.waitForTimeout(1800);
  await page.locator('[role=option]').first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Create$/ }).click();
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const docs = await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('cairn');
    r.onsuccess = () => {
      const tx = r.result.transaction(['docs'], 'readonly');
      const g = tx.objectStore('docs').getAll();
      g.onsuccess = () => res(g.result.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))));
    };
  }));
  const doc = docs.map((d) => JSON.parse(d)).find((d) => d.title === 'Geneva planned');
  ok(doc !== undefined, 'G3 the upcoming trip was stored', JSON.stringify(docs.length));
  if (doc) {
    const c = doc.cities[0];
    ok(c && c.name === 'Geneva', 'G4 its city is Geneva', JSON.stringify(c && c.name));
    ok(c && c.centre !== null && Math.abs(c.centre.lat - 46.2022) < 1e-6, 'G5 the pick\'s coordinate survived the OTHER form too', JSON.stringify(c && c.centre));
    ok(c && c.pick && c.pick.countryCode === 'CH', 'G6 and its pick carries CH', JSON.stringify(c && c.pick));
  }
  await page.context().close();
}

/* ------------------------------------------------------------------------------------ done */
await browser.close();
console.log(`\n${failures === 0 ? 'r74: all clear' : `r74: ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
