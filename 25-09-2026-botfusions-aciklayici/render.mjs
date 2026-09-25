// Açıklayıcıyı kare kare headless Chromium'da çizip ffmpeg'e aktarır (30 fps, 30 sn).
// Kullanım: FFMPEG=... OUT=sessiz.mp4 [VERTICAL=1] node render.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import path from 'path'; import { once } from 'events';
const FF = process.env.FFMPEG || 'ffmpeg', OUT = process.env.OUT || 'sessiz.mp4', V = !!process.env.VERTICAL;
const FRAMES = +(process.env.FRAMES || 900);
const size = V ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
page.on('pageerror', e => console.log('[hata]', e.message));

// Google Fonts bazen ilk denemede yüklenmiyor; fontlar gerçekten gelene kadar yeniden dene
let ok = false;
for (let i = 0; i < 6 && !ok; i++) {
  await page.goto('file://' + path.resolve('index.html') + '?render=1' + (V ? '&v=1' : ''));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  ok = await page.evaluate(async () => {
    const a = await document.fonts.load('800 40px Outfit'), b = await document.fonts.load('400 20px Manrope');
    return a.length > 0 && b.length > 0;
  });
  if (!ok) console.log('fontlar yüklenemedi, yeniden deneniyor');
}
if (!ok) { console.log('HATA: fontlar yüklenemedi'); process.exit(1); }

const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let i = 0; i < FRAMES; i++) {
  await page.evaluate(t => window.__seek(t), i / 30);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
  if (i % 150 === 0) console.log(`kare ${i}/${FRAMES}  ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
}
ff.stdin.end(); await once(ff, 'close'); await browser.close();
console.log('bitti', ((Date.now() - t0) / 1000).toFixed(0), 'sn');
