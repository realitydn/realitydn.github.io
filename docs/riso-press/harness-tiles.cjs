/* Render each shot as its own PNG. node tiles.cjs <jobfile.json>
   job = { outDir, photo, w, h, extras:[], shots:[{name, photo?, treatment, opts}] } */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const REPO = require('path').resolve(__dirname, '../..');

(async () => {
  const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const W = job.w || 700, H = job.h || 900;
  const engine = fs.readFileSync(path.join(REPO, 'public/studio-shared/riso-press.js'), 'utf8') + ';' + fs.readFileSync(path.join(REPO, 'public/studio-shared/riso-engine.js'), 'utf8');
  const extras = (job.extras || []).map(p => fs.readFileSync(path.isAbsolute(p) ? p : (fs.existsSync(path.join(__dirname,p)) ? path.join(__dirname,p) : path.join(REPO,p)), 'utf8'));
  const photos = {};
  for (const p of new Set([job.photo, ...job.shots.map(s => s.photo)].filter(Boolean))) {
    photos[p] = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(REPO, p)).toString('base64');
  }
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGEERR:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('PAGE:', m.text()); });
  await page.setContent('<html><body></body></html>');
  await page.evaluate(engine);
  for (const e of extras) await page.evaluate(e);

  const urls = await page.evaluate(async (job, photos, W, H) => {
    const imgs = {};
    for (const k in photos) imgs[k] = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = photos[k]; });
    const out = {};
    for (const s of job.shots) {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      try {
        if (s.treatment && s.treatment.indexOf('retro:') === 0) {
          window.RETRO.setSource(imgs[s.photo || job.photo]);
          window.RETRO.render(cv, s.treatment.slice(6), s.opts || {});
        }
        else if (s.treatment === 'lab') window.LAB.render(cv, Object.assign({ src: imgs[s.photo || job.photo] }, s.opts || {}));
        else {
          window.RISO.setSource(imgs[s.photo || job.photo]);
          window.RISO.setTransform(s.tf || { scale: 1, x: 0, y: 0, rot: 0 });
          window.RISO.render(cv, s.treatment, s.opts || {});
        }
        out[s.name] = cv.toDataURL('image/png');
      } catch (err) { console.error(s.name + ': ' + err.message); }
    }
    return out;
  }, job, photos, W, H);

  const dir = job.outDir;
  fs.mkdirSync(dir, { recursive: true });
  for (const n in urls) {
    fs.writeFileSync(path.join(dir, n + '.png'), Buffer.from(urls[n].split(',')[1], 'base64'));
    console.log(n + '.png', (fs.statSync(path.join(dir, n + '.png')).size / 1024 | 0) + 'KB');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
