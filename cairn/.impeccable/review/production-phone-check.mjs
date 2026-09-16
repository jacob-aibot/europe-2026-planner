import { chromium } from 'file:///C:/Users/jacob/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',isMobile:true,hasTouch:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://192.168.1.92:5175/',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/Set up my profile/}).click();
 await page.getByLabel('Your name').fill('Phone preview');
 await page.getByRole('button',{name:'Save my profile'}).click();
 await page.getByRole('button',{name:/Add somewhere I’ve been/}).click();
 await page.getByLabel('Title',{exact:true}).fill('Coast remembered');
 await page.getByTestId('past-month').fill('2020-06');
 await page.getByRole('combobox').fill('Split');
 await page.getByRole('option',{name:/Split, Split-Dalmatia, Croatia/}).click();
 await page.getByRole('button',{name:'Record it'}).click();
 await page.getByRole('button',{name:'See it on World'}).click();
 await page.getByRole('heading',{name:'Croatia',exact:true}).waitFor();
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Croatia Visited',exact:true}).waitFor();
 await page.getByRole('tab',{name:'You',exact:true}).click();
 await page.getByRole('heading',{name:'Phone preview'}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('Production LAN origin: profile, lazy city search, saved journey, Croatia on World, reload and You pass; no page errors. Desktop Edge touch emulation, not physical iPhone.');
}finally{await browser.close();}
