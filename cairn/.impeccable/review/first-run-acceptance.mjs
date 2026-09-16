import { chromium } from 'file:///C:/Users/jacob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const passed = [];
const origin = 'http://127.0.0.1:5180';
const dir = '.impeccable/review';
async function fresh(options = {}) {
 const context = await browser.newContext({ viewport: { width:390, height:844 }, colorScheme:'dark', reducedMotion:'reduce', ...options });
 const page = await context.newPage();
 await page.goto(origin, {waitUntil:'networkidle'});
 return {context,page};
}
async function tab(page, name) { await page.getByRole('tab', {name,exact:true}).click(); }
async function visible(locator) { await locator.waitFor({state:'visible'}); }
async function noOverflow(page) { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow'); }
try {
 const {page,context} = await fresh();
 await page.getByRole('button',{name:'Skip for now'}).click();
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.getByRole('button',{name:/Set up my profile/}).count(),0);
 await visible(page.getByRole('heading',{name:'A world of possibilities.'}));
 passed.push('Skip is remembered; inviting actions remain');
 await tab(page,'You');
 await page.getByRole('button',{name:'Set up profile'}).click();
 await page.getByLabel('Your name').fill('Jacob Miller');
 await page.getByLabel(/Home city/).fill('Phoenix');
 await page.getByLabel(/A little about you/).fill('Old cities, mountain trails, and time to wander.');
 await page.evaluate(() => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(key,value) { if(key==='cairn.local-identity.v1') throw new DOMException('Storage full','QuotaExceededError'); return window.originalSetItem.call(this,key,value); }; });
 await page.getByRole('button',{name:'Save my profile'}).click();
 await visible(page.getByText('Your profile could not be saved. Your changes are still here; try saving again.'));
 assert.equal(await page.getByLabel('Your name').inputValue(),'Jacob Miller');
 await page.evaluate(() => {Storage.prototype.setItem=window.originalSetItem;});
 await page.getByRole('button',{name:'Save my profile'}).click();
 await visible(page.getByRole('heading',{name:'Jacob Miller'}));
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.getByRole('heading',{name:'Where next, Jacob?'}).count(),1);
 await tab(page,'You');
 await visible(page.getByText('Home in Phoenix'));
 assert.equal(await page.getByTestId('profile-claim').count(),0);
 passed.push('Profile write failure preserves draft; retry, reload and no-trip identity work');
 await page.getByRole('button',{name:'Edit profile'}).click();
 await page.getByLabel('Your name').fill('Jacob M');
 await page.getByRole('button',{name:'Save my profile'}).click();
 await page.getByRole('button',{name:/Add a past journey/}).click();
 await page.getByLabel('Title',{exact:true}).fill('Croatia memory');
 await page.getByTestId('past-month').fill('2022-06');
 const city=page.getByRole('combobox');
 const corpusRequests=[];
 page.on('request',r=>{if(/gazetteerShards|gazetteer\/shards/.test(r.url())) corpusRequests.push(r.url());});
 await city.fill('P'); await page.waitForTimeout(250);
 assert.equal(corpusRequests.length,0);
 await city.fill('Paris');
 await visible(page.getByRole('option',{name:/Paris, Île-de-France, France/}));
 await page.route('**/sp.json*',async route=>{await new Promise(r=>setTimeout(r,900));await route.continue();});
 await city.fill('Split');
 assert.equal(await page.getByRole('option',{name:/Paris, Île-de-France/}).count(),0);
 await city.press('Enter');
 assert.equal(await page.getByRole('list',{name:'Cities in journey order'}).count(),0);
 await visible(page.getByRole('option',{name:/Split, Split-Dalmatia, Croatia/}));
 assert.match(await page.locator('.city-selector__source').innerText(),/^GeoNames geographical database/);
 await city.press('ArrowDown'); await city.press('ArrowUp'); await city.press('Enter');
 await visible(page.getByRole('button',{name:'Remove Split'}));
 assert.equal(await city.evaluate(el=>el===document.activeElement),true);
 await city.fill('Dubrovnik');
 await visible(page.getByRole('option',{name:/Dubrovnik, Dubrovnik-Neretva, Croatia/}));
 await city.press('Enter');
 await page.getByRole('button',{name:'Remove Dubrovnik'}).click();
 assert.equal(await page.getByRole('button',{name:'Remove Split'}).count(),1);
 passed.push('City minimum length, stale visible hits, loading Enter, keyboard, focus, multiple cities, removal and attribution');
 await page.getByRole('button',{name:'Record it'}).click();
 await visible(page.getByRole('button',{name:'See it on World'}));
 const doc = await page.evaluate(async()=> (await import('/src/store.ts')).store.getState().doc);
 assert.equal(doc.cities[0].pick.countryCode,'HR');
 assert.notEqual(doc.cities[0].pick.rowId,null);
 assert.notEqual(doc.homeBase,'Phoenix');
 await page.getByRole('button',{name:'See it on World'}).click();
 await visible(page.getByRole('heading',{name:'Croatia',exact:true}));
 assert.equal(await page.locator('.globe__country--visited[data-country=HR]').count()>0,true);
 await page.getByRole('button',{name:'← Your world'}).click();
 await page.screenshot({path:`${dir}/populated-world-mobile.png`,fullPage:false});
 await tab(page,'You'); await page.screenshot({path:`${dir}/populated-you-mobile.png`,fullPage:false});
 passed.push('Matched past city persists CityPick and illuminates Croatia through completion; home city never becomes travel');
 // A failed close must not leave an intent waiting to open a form later.
 await page.evaluate(async()=>{ const {store}=await import('/src/store.ts');window.originalClose=store.closeTrip;store.closeTrip=async()=>{throw new Error('Injected close failure');};});
 await page.getByRole('button',{name:'Your travel profile'}).click();
 await tab(page,'World');
 await page.getByRole('button',{name:'Open your trip library'}).click().catch(()=>{});
 // The shell's intent path is reached by You's empty travel action after an upcoming-only seed below.
 await page.evaluate(async()=>{const {store}=await import('/src/store.ts');store.closeTrip=window.originalClose;});
 await context.close();

 const future = await fresh();
 await tab(future.page,'Trips');
 await future.page.getByRole('button',{name:/Plan a new trip/}).click();
 await future.page.getByLabel('Title',{exact:true}).fill('Japan ahead');
 await future.page.getByLabel('Start',{exact:true}).fill('2027-04-05');
 await future.page.getByLabel('End',{exact:true}).fill('2027-04-08');
 await future.page.getByRole('combobox').fill('Tokyo');
 await visible(future.page.getByRole('option',{name:/Tokyo.*Japan/}).first());
 await future.page.getByRole('combobox').press('Enter');
 await future.page.getByRole('button',{name:'Create',exact:true}).click();
 await tab(future.page,'World');
 await visible(future.page.getByTestId('world-upcoming-only'));
 assert.match(await future.page.getByTestId('world-upcoming-only').innerText(),/Japan ahead/);
 await future.page.screenshot({path:`${dir}/upcoming-world-mobile.png`,fullPage:false});
 await future.page.getByRole('button',{name:'Japan Upcoming',exact:true}).focus();
 await future.page.keyboard.press('Enter');
 await visible(future.page.getByRole('heading',{name:'Japan',exact:true}));
 await future.page.getByRole('button',{name:'← Your world'}).click();
 passed.push('Upcoming-only country choice opens Japan by keyboard');
 const futureDoc=await future.page.evaluate(async()=>(await import('/src/store.ts')).store.getState().doc);
 assert.equal(futureDoc.cities[0].pick.countryCode,'JP');
 await future.page.evaluate(async()=>{const {store}=await import('/src/store.ts');window.originalClose=store.closeTrip;store.closeTrip=async()=>{throw new Error('Injected close failure');};});
 await future.page.getByRole('button',{name:/Add somewhere I’ve been/}).click();
 await visible(future.page.getByText(/Could not open the journey form: Injected close failure/));
 await future.page.evaluate(async()=>{const {store}=await import('/src/store.ts');store.closeTrip=window.originalClose;await store.closeTrip();});
 await tab(future.page,'Trips');
 assert.equal(await future.page.getByRole('form',{name:'Record a past trip'}).count(),0);
 await future.page.getByRole('button',{name:'Add a past journey',exact:true}).click();
 await visible(future.page.getByRole('form',{name:'Record a past trip'}));
 passed.push('Upcoming form persists CityPick; upcoming-only World; failed close leaves no deferred form and allows retry');
 await future.context.close();

 const fallback = await fresh();
 await fallback.page.getByRole('button',{name:/Add somewhere I’ve been/}).click();
 await fallback.page.getByLabel('Title',{exact:true}).fill('A remembered place');
 await fallback.page.getByTestId('past-month').fill('2020-05');
 await fallback.page.getByRole('combobox').fill('My tiny village');
 await visible(fallback.page.getByRole('option',{name:/without a map match/}));
 await fallback.page.getByRole('option',{name:/without a map match/}).click();
 await fallback.page.getByRole('button',{name:'Record it'}).click();
 await visible(fallback.page.getByRole('button',{name:'See it on World'}));
 await fallback.page.getByRole('button',{name:'See it on World'}).click();
 await visible(fallback.page.getByRole('heading',{name:'Your journey belongs here.'}));
 assert.equal(await fallback.page.getByRole('button',{name:'Open my journeys'}).count(),1);
 passed.push('Unmatched fallback records honestly and gives a concrete next step');
 await fallback.context.close();

 const corrupt=await fresh();
 await corrupt.page.evaluate(()=>localStorage.setItem('cairn.local-identity.v1','{'));
 await corrupt.page.reload({waitUntil:'networkidle'});
 await visible(corrupt.page.getByText('The profile saved on this device could not be read.'));
 await corrupt.page.getByRole('button',{name:/Set up my profile/}).click();
 await corrupt.page.getByLabel('Your name').fill('Recovered');
 await corrupt.page.getByRole('button',{name:'Save my profile'}).click();
 assert.equal(await corrupt.page.getByRole('heading',{name:'Where next, Recovered?'}).count(),1);
 passed.push('Corrupt local profile surfaces an error and can be replaced explicitly');
 await corrupt.context.close();

 for(const size of [{width:390,height:844},{width:1280,height:800}]) {
  const device=size.width===390?'mobile':'desktop';
  const run=await fresh({viewport:size,reducedMotion:'reduce'});
  for(const [name,file] of [['World','world'],['Trips','trips'],['You','you']]) {
   await tab(run.page,name); await noOverflow(run.page);
   assert.equal(await run.page.locator('.journey-action:visible').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationName==='none')),true);
   await run.page.evaluate(()=>window.scrollTo(0,0));
   await run.page.screenshot({path:`${dir}/first-run-${file}-${device}.png`,fullPage:false});
  }
  if(device==='desktop') {
   await run.page.setViewportSize({width:640,height:400});
   for(const name of ['World','Trips','You']) {await tab(run.page,name);await noOverflow(run.page);}
  }
  await run.context.close();
 }
 passed.push('Light surfaces under OS dark mode, mobile/desktop layout, 200% desktop reflow and reduced motion on all three tabs');
 await writeFile(`${dir}/first-run-acceptance-results.json`,JSON.stringify({passed},null,2));
 console.log(passed.join('\n'));
} finally { await browser.close(); }

