import { chromium } from 'file:///C:/Users/jacob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const page=await context.newPage();
try {
 await page.goto('http://127.0.0.1:5180/',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/Add somewhere I’ve been/}).click();
 await page.getByLabel('Title',{exact:true}).fill('Remembered journey');
 await page.getByTestId('past-month').fill('2020-06');
 let releaseParis;
 const held=new Promise(resolve=>releaseParis=resolve);
 let parisStarted;
 const started=new Promise(resolve=>parisStarted=resolve);
 await page.route('**/par.json*', async route=>{parisStarted();await held;await route.continue();});
 const city=page.getByRole('combobox');
 await city.fill('Paris'); await started;
 await city.fill('Split');
 await page.getByRole('option',{name:/Split, Split-Dalmatia, Croatia/}).waitFor();
 releaseParis(); await page.waitForTimeout(350);
 assert.equal(await page.getByRole('option',{name:/Paris, Île-de-France/}).count(),0);
 assert.equal(await city.inputValue(),'Split');
 await city.press('Enter');
 await page.evaluate(async()=>{const {store}=await import('/src/store.ts');window.originalCreate=store.createTrip;store.createTrip=async()=>{throw new Error('Injected create failure');};});
 await page.getByRole('button',{name:'Record it'}).click();
 await page.getByText('Injected create failure').waitFor();
 assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Remembered journey');
 assert.equal(await page.getByRole('button',{name:'Remove Split'}).count(),1);
 await page.evaluate(async()=>{const {store}=await import('/src/store.ts');store.createTrip=window.originalCreate;});
 await page.getByRole('button',{name:'Record it'}).click();
 await page.getByRole('button',{name:'See it on World'}).waitFor();
 console.log('Out-of-order response suppressed; failed trip creation keeps title, dates and city picks for retry');
 // Corrupt a persisted summary in this isolated test browser, then exercise the read refusal.
 await page.evaluate(async()=>{
  const {store}=await import('/src/store.ts');await store.closeTrip();
  await new Promise((resolve,reject)=>{const request=indexedDB.open('cairn');request.onsuccess=()=>{const db=request.result;const tx=db.transaction('summaries','readwrite');const os=tx.objectStore('summaries');const c=os.openCursor();c.onsuccess=()=>{if(c.result){c.result.update({...c.result.value,startDate:'not-a-date'});}};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
 });
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('tab',{name:'You',exact:true}).click();
 await page.getByRole('button',{name:'Set up profile'}).waitFor();
 await page.getByRole('button',{name:'Set up profile'}).click();
 await page.getByLabel('Your name').fill('Still editable');
 await page.getByRole('button',{name:'Save my profile'}).click();
 await page.getByRole('heading',{name:'Still editable'}).waitFor();
 console.log('Identity remains editable with an unreadable trip summary');
 // Browser module failures can stay cached. Offer the usable free-text path without losing the draft.
 const searchContext=await browser.newContext();const search=await searchContext.newPage();
 await search.goto('http://127.0.0.1:5180/',{waitUntil:'networkidle'});
 await search.getByRole('button',{name:/Add somewhere I’ve been/}).click();
 let fail=true;
 await search.route('**/sp.json*',route=>fail?route.abort():route.continue());
 await search.getByRole('combobox').fill('Split');
 await search.getByText('City search could not load. You can keep this name without a map match and continue your journey.').waitFor();
 assert.equal(await search.getByRole('combobox').inputValue(),'Split');
 await search.getByRole('option',{name:/without a map match/}).click();
 await search.getByRole('button',{name:'Remove Split'}).waitFor();
 console.log('Failed city search preserves query and offers a working unmatched fallback');
 await searchContext.close();
} finally {await browser.close();}

