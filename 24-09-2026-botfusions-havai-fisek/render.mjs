// Gösteriyi kare kare headless Chromium'da çizip ffmpeg'e aktarır (30 fps, 1920x1080, 30 sn).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs'; import path from 'path'; import { once } from 'events';
const FF = process.env.FFMPEG || 'ffmpeg';
const FRAMES = +(process.env.FRAMES || 900), OUT = process.env.OUT || 'video_sessiz.mp4';
const browser = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport:process.env.VERTICAL?{width:1080,height:1920}:{width:1920,height:1080}, deviceScaleFactor:1 });
page.on('pageerror', e=>console.log('[err]', e.message));
await page.goto('file://'+path.resolve('index.html')+(process.env.VERTICAL?'?render=1&v=1':'?render=1'));
await page.waitForFunction(()=>window.__ready===true, null, {timeout:60000});
const ff = spawn(FF, ['-y','-loglevel','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-',
  '-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-tune','film','-movflags','+faststart',OUT], {stdio:['pipe','inherit','inherit']});
const t0 = Date.now();
for (let i=0;i<FRAMES;i++){
  const d = await page.evaluate(i=>window.__frame(i), i);
  if(!ff.stdin.write(Buffer.from(d.slice(d.indexOf(',')+1),'base64'))) await once(ff.stdin,'drain');
  if(i%30===0) console.log(`kare ${i}/${FRAMES}  ${((Date.now()-t0)/1000).toFixed(0)} sn`);
}
ff.stdin.end(); await once(ff,'close');
fs.writeFileSync('events.json', await page.evaluate(()=>JSON.stringify(window.__events)));
await browser.close();
console.log('bitti', ((Date.now()-t0)/1000).toFixed(0), 'sn');
