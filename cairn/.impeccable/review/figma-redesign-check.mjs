const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({headless:true,executablePath: process.env.BROWSER_PATH});
const results=[];
try {
 for (const [size,width,height] of [['mobile',390,844],['desktop',1280,800]]) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5180',{waitUntil:'networkidle'});
  for(const [tab,slug] of [['World','world'],['Trips','trips'],['You','you']]) {
   await page.getByRole('tab',{name:tab,exact:true}).click(); await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);
   await page.screenshot({path:`.impeccable/review/redesign-${slug}-${size}.png`,fullPage:true});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
   results.push({size,tab,errors:[...errors]});
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 // Reflow equivalent to a 640px wide viewport at 200% browser zoom.
 const context=await browser.newContext({viewport:{width:320,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();await page.goto('http://127.0.0.1:5180',{waitUntil:'networkidle'});
 for(const tab of ['World','Trips','You']){await page.getByRole('tab',{name:tab,exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'320px reflow');}
 await context.close();await writeFile('.impeccable/review/redesign-results.json',JSON.stringify(results,null,2));console.log('Six screenshots, three reflow checks, no browser errors.');
} finally {await browser.close();}
