import { chromium } from 'file:///C:/Users/jacob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  for (const failure of ['image','webgl']) {
    const context=await browser.newContext({viewport:{width:320,height:844},reducedMotion:'reduce'});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    if(failure==='image') await page.route('**/images/earth-nasa.jpg',route=>route.abort());
    else await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};});
    await page.goto('http://127.0.0.1:5180',{waitUntil:'networkidle'});
    assert.equal(await page.locator('.globe--textured').count(),0);
    assert(await page.locator('.globe__country').count()>100);
    const globe=page.getByRole('group',{name:'Interactive world globe'});
    await globe.focus();await globe.press('ArrowRight');
    await page.waitForFunction(()=>Number(document.querySelector('.globe__earth').dataset.longitude)!==12);
    await page.locator('.world-discovery').getByRole('button',{name:'Explore Croatia',exact:true}).click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const state=await page.evaluate(async()=>(await import('/src/store.ts')).store.getState());
    assert.equal(state.library.length,0,'Exploring must not create a journey');
    await page.getByRole('button',{name:'Back to World'}).click();
    assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Explore Croatia →');
    assert.deepEqual(errors,[]);
    console.log(`${failure}: SVG fallback, keyboard rotation, 320px preview reflow, no implicit trip, and return focus passed`);
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();
  await page.goto('http://127.0.0.1:5180',{waitUntil:'networkidle'});await page.locator('.globe--textured').waitFor();
  const supported=await page.evaluate(()=>{window.earthLoss=document.querySelector('.globe__material').getContext('webgl').getExtension('WEBGL_lose_context');window.earthLoss?.loseContext();return Boolean(window.earthLoss);});
  assert(supported,'Context loss extension required for this exercise');
  await page.locator('.globe--textured').waitFor({state:'detached'});
  await page.evaluate(()=>window.earthLoss.restoreContext());await page.locator('.globe--textured').waitFor();
  console.log('WebGL context loss restores SVG and context recovery restores imagery');
  await context.close();
} finally {await browser.close();}
