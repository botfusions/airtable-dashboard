import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const times = process.argv.slice(2).map(Number);
const browser = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport:{width:1920,height:1080}, deviceScaleFactor:1 });
page.on('console', m=>console.log('[page]', m.text())); page.on('pageerror', e=>console.log('[err]', e.message));
await page.goto('file://'+path.resolve('index.html')+'?render=1');
await page.waitForFunction(()=>window.__ready===true, null, {timeout:60000});
console.log(await page.evaluate(()=>JSON.stringify(window.__meta)));
for(const t of times){ const t0=Date.now(); const d=await page.evaluate(t=>window.__still(t), t);
  fs.writeFileSync(`../temp/still_${t}.png`, Buffer.from(d.split(',')[1],'base64')); console.log('t',t,'ms',Date.now()-t0); }
await browser.close();
