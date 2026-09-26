// Tanıtımı kare kare headless Chromium'da çizip ffmpeg'e aktarır: 30 fps, 30 sn.
// Kullanım: FFMPEG=... OUT=sessiz.mp4 [LAND=1 → 1920x1080] node render.mjs
//   kontrol kareleri: STILLS="0.5 5.2" STILLDIR=klasör node render.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs'; import path from 'path'; import { once } from 'events';
const FF=process.env.FFMPEG||'ffmpeg',OUT=process.env.OUT||'sessiz.mp4',LAND=!!process.env.LAND,NF=900;
const browser=await chromium.launch();
const page=await browser.newPage({viewport:LAND?{width:1920,height:1080}:{width:1080,height:1920},deviceScaleFactor:1});
page.on('pageerror',e=>console.log('[hata]',e.message));page.on('console',m=>{if(m.type()==='error')console.log('[konsol]',m.text())});
await page.goto('file://'+path.resolve('index.html')+'?render=1'+(LAND?'&land=1':''));
await page.waitForFunction(()=>window.__ready===true,null,{timeout:60000});
if(!await page.evaluate(()=>window.__fontsOk)){console.log('HATA: fontlar yüklenemedi');process.exit(1)}
if(process.env.STILLS){
  for(const t of process.env.STILLS.split(' ').map(Number)){const d=await page.evaluate(i=>window.__frame(i),Math.round(t*30));fs.writeFileSync(`${process.env.STILLDIR||'.'}/k_${t}.jpg`,Buffer.from(d.split(',')[1],'base64'))}
  await browser.close();process.exit(0);
}
const ff=spawn(FF,['-y','-loglevel','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','slow','-crf','14','-pix_fmt','yuv420p',OUT],{stdio:['pipe','inherit','inherit']});
const t0=Date.now();
for(let i=0;i<NF;i++){const d=await page.evaluate(i=>window.__frame(i),i);if(!ff.stdin.write(Buffer.from(d.slice(d.indexOf(',')+1),'base64')))await once(ff.stdin,'drain');if(i%150===0)console.log(`kare ${i}/${NF}  ${((Date.now()-t0)/1000).toFixed(0)} sn`)}
ff.stdin.end();await once(ff,'close');await browser.close();console.log('bitti',((Date.now()-t0)/1000).toFixed(0),'sn');
