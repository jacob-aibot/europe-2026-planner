const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({headless:true,executablePath: process.env.BROWSER_PATH});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
await page.goto('http://127.0.0.1:5180',{waitUntil:'networkidle'});
const svg=await page.locator('.globe svg').first().evaluate(el=>{
 const copy=el.cloneNode(true), src=[el,...el.querySelectorAll('*')], dst=[copy,...copy.querySelectorAll('*')];
 src.forEach((node,i)=>{const s=getComputedStyle(node);for(const p of ['fill','stroke','stroke-width','opacity'])dst[i].style.setProperty(p,s.getPropertyValue(p));});
 copy.setAttribute('xmlns','http://www.w3.org/2000/svg'); return new XMLSerializer().serializeToString(copy);
});
await writeFile('.impeccable/review/figma-globe.svg',svg);
await browser.close();
