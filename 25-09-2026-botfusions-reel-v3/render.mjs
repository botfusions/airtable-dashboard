// Reel v3'ü kare kare headless Chromium'da (WebGL/SwiftShader) çizip ffmpeg'e aktarır: 30 fps, 64 vuruş.
// Kullanım: FFMPEG=... OUT=sessiz.mp4 [SUB=4] [LAND=1 → 1920x1080] [BPM=90] node render.mjs
//   kontrol kareleri: STILLS="0.2 5.1" STILLDIR=klasör node render.mjs   |   ses ipuçları: CUES=cues.json
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs'; import path from 'path'; import { once } from 'events';
const FF=process.env.FFMPEG||'ffmpeg',OUT=process.env.OUT||'sessiz.mp4',SUB=process.env.SUB||'4',LAND=!!process.env.LAND,BPM=+(process.env.BPM||90);
const NF=Math.round(64*60/BPM*30);
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:LAND?{width:1920,height:1080}:{width:1080,height:1920},deviceScaleFactor:1});
page.on('pageerror',e=>console.log('[hata]',e.message));page.on('console',m=>{if(m.type()==='error')console.log('[konsol]',m.text())});
await page.goto('file://'+path.resolve('index.html')+'?render=1&sub='+SUB+'&bpm='+BPM+(LAND?'&land=1':''));
await page.waitForFunction(()=>window.__ready===true,null,{timeout:60000});
if(!await page.evaluate(()=>window.__fontsOk)){console.log('HATA: fontlar yüklenemedi');process.exit(1)}
if(process.env.CUES)fs.writeFileSync(process.env.CUES,await page.evaluate(()=>window.__cues()));
if(process.env.STILLS){
  for(const t of process.env.STILLS.split(' ').map(Number)){const d=await page.evaluate(i=>window.__frame(i),Math.round(t*30));fs.writeFileSync(`${process.env.STILLDIR||'.'}/k_${t}.jpg`,Buffer.from(d.split(',')[1],'base64'))}
  await browser.close();process.exit(0);
}
const ff=spawn(FF,['-y','-loglevel','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','slow','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',OUT],{stdio:['pipe','inherit','inherit']});
const t0=Date.now();
for(let i=0;i<NF;i++){const d=await page.evaluate(i=>window.__frame(i),i);if(!ff.stdin.write(Buffer.from(d.slice(d.indexOf(',')+1),'base64')))await once(ff.stdin,'drain');if(i%90===0)console.log(`kare ${i}/${NF}  ${((Date.now()-t0)/1000).toFixed(0)} sn`)}
ff.stdin.end();await once(ff,'close');await browser.close();console.log('bitti',((Date.now()-t0)/1000).toFixed(0),'sn');
