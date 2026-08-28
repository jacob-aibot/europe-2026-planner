/**
 * Round 5, real Chromium against real IndexedDB — the eighth case.
 *
 * §4.2 rule 6a: "a pending write is never outlived by its document." `flushForTransition()`
 * flushes ONCE and then decides purely on `persistence.status`. An edit dispatched while that
 * flush is awaiting IndexedDB makes `writeAndSettle` see `stillOurs === false`: it sets
 * `savedDoc` to the document it wrote (the old one), re-arms the 400 ms debounce for the new
 * one — and `flushForTransition` still returns `true`, because the status is `'idle'`. The
 * transition then clears `state.doc`, and the re-armed timer fires against a document that is
 * no longer there. `attemptSave` returns early, the edit is gone, `isDirty()` reads false
 * (there is no `doc` to be dirty about) and the indicator reads "Saved".
 *
 * `qa/r5-freshness.mjs` §6 proves it deterministically in Node with a real debounce, real
 * timers and a storage port that parks the write (which is what a real IndexedDB write does,
 * only for longer). This is the same sequence driven through the shipped UI: click "Cairn"
 * (closeTrip) and then nudge a stop with ↓ while the flush is still in flight. BUILD-NOTES §6
 * names the window itself — "there is no spinner or disabled state while it does" — so every
 * control stays live for the whole of the write.
 *
 * The click has to land AFTER `attemptSave` has captured `state.doc` (a microtask) and BEFORE
 * IndexedDB commits (several real milliseconds), so the delay is swept rather than guessed.
 *
 * Needs: npm run web:build && node tools/serve.mjs, then
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node qa/r5-browser.mjs
 * A "FAIL" line means the probe found what it was looking for.
 */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const URL = 'http://localhost:4173/';
const ok = (n, c, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? ' — ' + x : ''));
const line = (s) => console.log('\n== ' + s + ' ==');

const browser = await chromium.launch();

const storedOrder = (page) => page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('cairn');
  r.onsuccess = () => {
    const g = r.result.transaction('docs').objectStore('docs').get('trip-europe-2026');
    g.onsuccess = () => {
      if (!g.result) return res(null);
      const d = JSON.parse(g.result);
      res(d.days.find((x) => x.date === '2026-08-16').stops.map((s) => s.name).join('|'));
    };
  };
}));

const boot = async (ctx) => {
  const p = await ctx.newPage();
  await p.route('**tile.openstreetmap.org/**', (r) => r.abort());
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: /Load Europe 2026/i }).click();
  await p.waitForTimeout(1800);
  return p;
};

line('the eighth case — one click on "Cairn", one nudge while its flush is in flight');

const results = [];
for (const delay of [0, 1, 2, 4, 8]) {
  const ctx = await browser.newContext();
  const p = await boot(ctx);
  await p.locator('button').filter({ hasText: /^08-16/ }).first().click();
  await p.waitForTimeout(600);

  const before = await storedOrder(p);

  const shot = await p.evaluate(async (d) => {
    const domOrder = () => [...document.querySelectorAll('.stop__name')].map((e) => e.textContent).join('|');
    const nextDown = (i = 0) => [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === '↓' && !b.disabled)[i];
    const brand = document.querySelector('button.topbar__brand');
    const first = nextDown();
    if (!brand || !first) return { err: `brand=${!!brand} down=${!!first}` };
    // Edit TWO — this is what the transition's flush will be busy writing.
    first.click();
    await new Promise((r) => setTimeout(r, 0));
    const domBefore = domOrder();
    brand.click();                                     // closeTrip() — its flush starts here
    await new Promise((r) => setTimeout(r, d));        // ... and is still in flight
    const second = nextDown(3);                         // edit THREE: a nudge on a DIFFERENT stop
    if (second) second.click();
    await new Promise((r) => setTimeout(r, 0));
    return {
      domBefore, domAfterClick: domOrder(),
      secondFound: !!second,
      stillOnDay: !!document.querySelector('.stop__name'),
    };
  }, delay);

  await p.waitForTimeout(2500);
  const after = await storedOrder(p);
  const dom = await p.locator('body').innerText();
  // `domAfterClick` is what the user last saw. Storage must end up holding exactly that.
  const landed = !!shot.domAfterClick && shot.domAfterClick !== shot.domBefore;
  const kept = after === shot.domAfterClick;
  results.push({ delay, landed, kept, before, after, dom, saw: shot.domAfterClick });
  if (shot.err) console.log('  probe could not find its controls:', shot.err);
  console.log(`  delay=${delay}ms · edit THREE reached the UI = ${landed} · storage ends up holding what the user last saw = ${kept}` +
    ` · anything on screen about an unsaved edit = ${/unsaved|not saved|discard/i.test(dom) ? 'yes' : 'NOTHING'}`);
  if (landed && !kept) {
    const a = String(shot.domAfterClick).split('|');
    const b = String(after).split('|');
    const i = a.findIndex((x, n) => x !== b[n]);
    console.log(`      position ${i + 1} — last seen "${a[i]}", storage holds "${b[i]}"`);
  }
  await ctx.close();
}

const exercised = results.filter((r) => r.landed);
const lost = exercised.filter((r) => !r.kept && !/unsaved|not saved|discard/i.test(r.dom));
ok(`the edit dispatched during the transition's flush survives it (${exercised.length}/${results.length} runs exercised the window)`,
  exercised.length > 0 && lost.length === 0,
  exercised.length === 0
    ? 'INCONCLUSIVE — no run landed the dispatch inside the window; see qa/r5-freshness.mjs §6 for the deterministic form'
    : `${lost.length} of ${exercised.length} runs lost the reorder with nothing on screen saying so`);

await browser.close();
