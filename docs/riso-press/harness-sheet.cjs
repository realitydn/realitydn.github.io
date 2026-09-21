/* Riso render harness.
   node shoot.cjs <jobfile.json>
   job = { out, photo, tile:{w,h}, cols, gap, label:bool, extras:[paths], shots:[{label,photo?,treatment,opts}] }
*/
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const REPO = require('path').resolve(__dirname, '../..');

(async () => {
  const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const tile = job.tile || { w: 420, h: 560 };
  const cols = job.cols || 3;
  const gap = job.gap != null ? job.gap : 18;
  const labelH = job.label === false ? 0 : 30;

  const engine = fs.readFileSync(path.join(REPO, 'public/studio/riso-engine.js'), 'utf8');
  const extras = (job.extras || []).map(p => fs.readFileSync(path.isAbsolute(p) ? p : (require('fs').existsSync(path.join(__dirname,p)) ? path.join(__dirname,p) : path.join(REPO,p)), 'utf8'));

  const photos = {};
  const wanted = new Set([job.photo, ...job.shots.map(s => s.photo)].filter(Boolean));
  for (const p of wanted) {
    const full = path.isAbsolute(p) ? p : path.join(REPO, p);
    photos[p] = 'data:image/jpeg;base64,' + fs.readFileSync(full).toString('base64');
  }

  const rows = Math.ceil(job.shots.length / cols);
  const W = cols * tile.w + (cols + 1) * gap;
  const H = rows * (tile.h + labelH) + (rows + 1) * gap;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('PAGE:', m.text()); });
  page.on('pageerror', e => console.error('PAGEERR:', e.message));

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
  <style>
    html,body{margin:0;background:${job.bg || '#15110c'};font:600 12px/1.2 -apple-system,system-ui,sans-serif;color:#cdbfae}
    #g{display:grid;grid-template-columns:repeat(${cols},${tile.w}px);gap:${gap}px;padding:${gap}px;width:max-content}
    figure{margin:0}
    canvas{display:block;width:${tile.w}px;height:${tile.h}px}
    figcaption{height:${labelH}px;display:flex;align-items:center;letter-spacing:.06em;text-transform:uppercase;padding-top:6px}
  </style></head><body><div id="g"></div></body></html>`);

  await page.evaluate(engine);
  for (const e of extras) await page.evaluate(e);

  await page.evaluate(async (job, tile, photos, labelH) => {
    const imgs = {};
    for (const k in photos) {
      imgs[k] = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = photos[k]; });
    }
    const g = document.getElementById('g');
    const DPR = 2;
    for (const s of job.shots) {
      const fig = document.createElement('figure');
      const cv = document.createElement('canvas');
      cv.width = tile.w * DPR; cv.height = tile.h * DPR;
      fig.appendChild(cv);
      if (labelH) { const fc = document.createElement('figcaption'); fc.textContent = s.label || ''; fig.appendChild(fc); }
      g.appendChild(fig);
      try {
        if (s.treatment && s.treatment.indexOf('retro:') === 0) {
          window.RETRO.setSource(imgs[s.photo || job.photo]);
          window.RETRO.render(cv, s.treatment.slice(6), s.opts || {});
        } else if (s.treatment === 'lab') {
          window.LAB.render(cv, Object.assign({ src: imgs[s.photo || job.photo] }, s.opts || {}));
        } else {
          window.RISO.setSource(imgs[s.photo || job.photo]);
          window.RISO.setTransform(s.tf || { scale: 1, x: 0, y: 0, rot: 0 });
          window.RISO.render(cv, s.treatment, s.opts || {});
        }
      } catch (err) { console.error('shot "' + (s.label || '?') + '": ' + err.message); }
    }
  }, job, tile, photos, labelH);

  await new Promise(r => setTimeout(r, 300));
  const outPath = path.isAbsolute(job.out) ? job.out : path.join(process.cwd(), job.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath });
  await browser.close();
  console.log('wrote', outPath, W + 'x' + H);
})().catch(e => { console.error(e); process.exit(1); });
