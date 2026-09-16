import { chromium } from 'file:///C:/Users/jacob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
try {
 await page.goto('http://127.0.0.1:5180/',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/Add somewhere I’ve been/}).click();
 await page.getByLabel('Title',{exact:true}).fill('Croatia to keep');
 await page.getByTestId('past-month').fill('2020-06');
 await page.getByRole('combobox').fill('Split');
 await page.getByRole('option',{name:/Split, Split-Dalmatia, Croatia/}).click();
 await page.evaluate(()=>{
  window.originalTransaction=IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction=function(stores,mode,...rest){
   if(mode==='readwrite' && (Array.isArray(stores)?stores:[stores]).includes('docs')) throw new DOMException('Injected disk full','QuotaExceededError');
   return window.originalTransaction.call(this,stores,mode,...rest);
  };
 });
 await page.getByRole('button',{name:'Record it'}).click();
 await page.getByRole('button',{name:'Retry',exact:true}).waitFor();
 await page.waitForTimeout(400);
 assert.equal(await page.getByRole('button',{name:'See it on World'}).count(),0);
 const state=await page.evaluate(async()=>(await import('/src/store.ts')).store.getState());
 assert.equal(state.persistence.status,'error');assert.equal(state.doc.title,'Croatia to keep');
 await page.evaluate(()=>{IDBDatabase.prototype.transaction=window.originalTransaction;});
 await page.getByRole('button',{name:'Retry',exact:true}).click();
 await page.getByRole('button',{name:'See it on World'}).waitFor();
 await page.screenshot({path:'.impeccable/review/past-save-success-mobile.png'});
 await page.getByRole('button',{name:'See it on World'}).click();
 await page.getByRole('heading',{name:'Croatia',exact:true}).waitFor();
 console.log('Resolved failed writes show no completion; Retry saves the same journey and then reveals World confirmation.');
}finally{await browser.close();}
