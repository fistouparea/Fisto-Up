/**
 * Builds the backup demo video from the recorded clips (frontend/showcase/video.spec.ts):
 * a 1920×1080 MP4 – the phone on the right, the Hindi caption on the left (rendered by Chromium, so Devanagari is
 * shaped correctly), title cards between the flows – plus one caption file (agriai-demo.srt) for the whole video.
 *   FFMPEG=/path/to/ffmpeg node showcase/3-video/make-video.mjs      (run from frontend/ or anywhere)
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../frontend/package.json'));
const { chromium } = require('@playwright/test');
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const clipsDir = path.join(here, 'clips');
const work = path.join(here, 'build');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

const W = 1920, H = 1080, FPS = 30;
const PHONE = { x: 1290, y: 40, w: 460, h: 997 };
const NOTE = 'ऑफ़लाइन डेमो · डेमो डेटा · AI के जवाब असली मॉडल से पहले रिकॉर्ड किए गए';

const SECTIONS = [
  { title: '1. फोटो से बीमारी की जाँच', clips: ['1-diagnosis'] },
  { title: '2. बोलकर चलाएँ · मौसम · पानी की सलाह', clips: ['2-weather-water'] },
  { title: '3. उपज बेचें → ऑर्डर → डिलीवरी ट्रैकिंग', clips: ['3a-sell', '3b-order', '3c-delivery', '3d-timeline'] },
  { title: '4. SHG दीदी (संयोजक) का पैनल', clips: ['4-coordinator'] },
];

const fonts = pathToFileURL(path.join(here, '../assets/fonts/')).href;
const css = `
@font-face{font-family:M;font-weight:400;src:url(${fonts}mukta-devanagari-400-normal.woff2)}
@font-face{font-family:M;font-weight:700;src:url(${fonts}mukta-devanagari-700-normal.woff2)}
@font-face{font-family:M;font-weight:800;src:url(${fonts}mukta-devanagari-800-normal.woff2)}
@font-face{font-family:L;font-weight:400;src:url(${fonts}mukta-latin-400-normal.woff2)}
@font-face{font-family:L;font-weight:700;src:url(${fonts}mukta-latin-700-normal.woff2)}
@font-face{font-family:L;font-weight:800;src:url(${fonts}mukta-latin-800-normal.woff2)}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;font-family:L,M,sans-serif;background:#f6f8f6;color:#1a2b22;position:relative;overflow:hidden}
.brand{position:absolute;left:90px;top:70px;display:flex;align-items:center;gap:18px}
.logo{width:64px;height:64px;border-radius:18px;background:#03542c;color:#fbba16;font-weight:800;font-size:38px;display:flex;align-items:center;justify-content:center}
.name{font-weight:800;font-size:34px;color:#03542c}.sub{font-size:22px;color:#55665b}
.section{position:absolute;left:90px;top:250px;background:#fbba16;color:#1a2b22;font-weight:700;font-size:28px;border-radius:40px;padding:6px 26px}
.cap{position:absolute;left:90px;top:340px;width:1060px;font-weight:700;font-size:58px;line-height:1.3;color:#03542c}
.note{position:absolute;left:90px;bottom:60px;font-size:22px;color:#55665b;border-top:2px solid #d5e2d9;padding-top:14px;width:1060px}
.phone{position:absolute;left:${PHONE.x - 14}px;top:${PHONE.y - 14}px;width:${PHONE.w + 28}px;height:${PHONE.h + 28}px;border-radius:44px;background:#1a2b22;box-shadow:0 30px 60px rgba(3,84,44,.18)}
.card{position:absolute;inset:0;background:#03542c;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 160px}
.card h1{font-weight:800;font-size:88px;color:#fff;line-height:1.15}.card h2{font-weight:700;font-size:44px;color:#fbba16;margin-top:24px}
.card p{font-size:28px;color:#d9eadf;margin-top:40px;line-height:1.5;max-width:1500px}
`;
const esc = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const frameHtml = (section, caption) => `<!doctype html><meta charset=utf-8><style>${css}</style><body>
<div class=brand><div class=logo>A</div><div><div class=name>AgriAI</div><div class=sub>Fisto Up · खेती का साथी</div></div></div>
<div class=section>${esc(section)}</div><div class=cap>${esc(caption)}</div><div class=note>${esc(NOTE)}</div><div class=phone></div></body>`;
const cardHtml = (title, subtitle, small) => `<!doctype html><meta charset=utf-8><style>${css}</style><body><div class=card>
<h1>${esc(title)}</h1>${subtitle ? `<h2>${esc(subtitle)}</h2>` : ''}${small ? `<p>${small}</p>` : ''}</div></body>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
let pngCount = 0;
async function png(html) {
  pngCount += 1;
  const file = path.join(work, `f${String(pngCount).padStart(3, '0')}.png`);
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  return file;
}

function run(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
}
const ENCODE = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-preset', 'medium', '-crf', '20'];

const parts = [];
const srt = [];
let clock = 0;
const stamp = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3_600_000), m = Math.floor(ms / 60_000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
const addSrt = (from, to, text) => text && srt.push(`${srt.length + 1}\n${stamp(clock + from)} --> ${stamp(clock + to)}\n${text}\n`);

async function card(html, seconds, text) {
  const image = await png(html);
  const out = path.join(work, `p${parts.length}.mp4`);
  run(['-loop', '1', '-t', String(seconds), '-i', image, '-f', 'lavfi', '-t', String(seconds), '-i', 'anullsrc=r=48000:cl=stereo', ...ENCODE, '-c:a', 'aac', '-shortest', out]);
  addSrt(0, seconds, text);
  clock += seconds;
  parts.push(out);
}

await card(cardHtml('AgriAI', 'खेती का साथी – फोटो, आवाज़ और SHG दीदी के साथ', `बैकअप डेमो वीडियो (लगभग 2½ मिनट)<br>${esc(NOTE)}`), 5, 'AgriAI – बैकअप डेमो वीडियो');

for (const section of SECTIONS) {
  await card(cardHtml(section.title), 2.5, section.title);
  for (const name of section.clips) {
    const video = path.join(clipsDir, `${name}.webm`);
    if (!existsSync(video)) throw new Error(`missing clip ${video} – run the recording first`);
    const captions = JSON.parse(readFileSync(path.join(clipsDir, `${name}.json`), 'utf8'));
    const start = Math.max(0, (captions[0]?.t ?? 0) - 0.6);
    const end = captions.at(-1).t;
    const list = [];
    for (let i = 0; i < captions.length - 1; i += 1) {
      const from = i === 0 ? start : captions[i].t;
      const to = captions[i + 1].t;
      if (to - from < 0.05) continue;
      list.push(`file '${await png(frameHtml(section.title, captions[i].text))}'\nduration ${(to - from).toFixed(3)}`);
      addSrt(from - start, to - start, captions[i].text);
    }
    list.push(list.at(-1).split('\n')[0]); // concat demuxer: repeat the last file
    const listFile = path.join(work, `${name}.txt`);
    writeFileSync(listFile, `${list.join('\n')}\n`);
    const out = path.join(work, `p${parts.length}.mp4`);
    run([
      '-f', 'concat', '-safe', '0', '-i', listFile,
      '-ss', start.toFixed(3), '-t', (end - start).toFixed(3), '-i', video,
      '-f', 'lavfi', '-t', (end - start).toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo',
      '-filter_complex', `[0:v]fps=${FPS},format=yuv420p[bg];[1:v]fps=${FPS},crop=360:780:0:0,scale=${PHONE.w}:${PHONE.h}:flags=lanczos[ph];[bg][ph]overlay=${PHONE.x}:${PHONE.y}:shortest=1[v]`,
      '-map', '[v]', '-map', '2:a', ...ENCODE, '-c:a', 'aac', '-t', (end - start).toFixed(3), out,
    ]);
    clock += end - start;
    parts.push(out);
  }
}

await card(
  cardHtml('जो दिखाया, वह बना हुआ है', 'डेमो डेटा पर टेस्टेड · KVK समीक्षा और पायलट अभी बाकी', 'अगला कदम: चूरू ज़िले में KVK और SHG के साथ निगरानी में 4 हफ़्ते का पायलट।<br>आवाज़ वाला हिस्सा: रिकॉर्डिंग में माइक नहीं होता, इसलिए बोली की जगह तय वाक्य “मौसम बताओ” डाला गया।'),
  6,
  'जो दिखाया वह बना हुआ है; डेमो डेटा पर टेस्टेड। KVK समीक्षा और पायलट बाकी।',
);
await browser.close();

const concatList = path.join(work, 'parts.txt');
writeFileSync(concatList, parts.map((part) => `file '${part}'`).join('\n') + '\n');
const final = path.join(here, 'agriai-demo.mp4');
run(['-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', '-movflags', '+faststart', final]);
writeFileSync(path.join(here, 'agriai-demo.srt'), srt.join('\n'));
rmSync(work, { recursive: true, force: true });
console.log(`agriai-demo.mp4: ${clock.toFixed(1)} s, ${srt.length} captions`);
