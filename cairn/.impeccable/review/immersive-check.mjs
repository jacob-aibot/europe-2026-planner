const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath: process.env.BROWSER_PATH,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 for(const [size,width,height] of [['mobile',390,844],['desktop',1280,800]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5180',{waitUntil:'networkidle'});
  await page.locator('.globe--textured').waitFor();
  await page.screenshot({path:`.impeccable/review/immersive-world-${size}.png`,fullPage:true});
  await page.locator('.world-discovery').getByRole('button',{name:'Explore Croatia',exact:true}).click();
  await page.getByTestId('croatia-preview').waitFor();
  await page.screenshot({path:`.impeccable/review/immersive-croatia-${size}.png`,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Destination overflow');
  await page.getByRole('button',{name:/Split Palace/}).click();
  await page.getByRole('button',{name:'I’ve been to Split · Record a visit'}).click();
  await page.getByRole('option',{name:/Split, Split-Dalmatia, Croatia/}).waitFor();
  await page.getByRole('option',{name:/Split, Split-Dalmatia, Croatia/}).click();
  await page.getByLabel('Title',{exact:true}).fill('A week in Split');await page.getByTestId('past-month').fill('2022-06');
  await page.getByTestId('past-submit').click();
  await page.getByRole('button',{name:'See it on World'}).click();
  await page.getByTestId('country-history').getByRole('heading',{name:'Croatia',exact:true}).waitFor();
  assert(await page.locator('[data-country="HR"][data-status="visited"]').count()>0);
  await page.screenshot({path:`.impeccable/review/immersive-saved-${size}.png`,fullPage:true});
  assert.deepEqual(errors,[]);console.log(size+': textured World → Croatia → Split map pick → persisted past trip → Croatia visited passes');await context.close();
 }
} finally {await browser.close();}
