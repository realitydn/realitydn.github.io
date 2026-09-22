/* docs/riso-press/harness-compare.cjs
   OLD engine (a git ref) against NEW (the working tree): one labelled contact
   sheet per treatment, old and new side by side on both papers.

   node harness-compare.cjs [--ref HEAD] [--out shots/compare] [--photos c,g]
                            [--treat halftone,overprint] [--w 420] [--all-looks]

     --ref        git ref the OLD side is read from (git show <ref>:…); default HEAD
     --out        output dir; a relative path is resolved against THIS folder
                  (docs/riso-press/shots/ is gitignored); default shots/compare
     --photos     gallery keys (public/images/gallery/<k>.jpg — c g b a h) or
                  paths, comma-separated; default c,g
     --treat      subset of the fourteen, comma-separated; default all
     --w          tile width in px; tile height is w × 1.27; default 420
     --all-looks  add one row per TREAT_LOOKS entry under the "preset" baseline
                  row (default: the preset row only)

   Sheet: columns = old·day  new·day  old·night  new·night — day is proofed in
   blue, night in pink; rows = looks × photos. Every NEW tile's caption carries
   its pixel diff against the OLD tile beside it, and a differing tile is
   outlined in pink. A last sheet, separation.png, renders the `separation`
   treatment with { ink:'pink', ink2:'blue' } on whichever side has it, and is
   skipped with a note while neither does. Dials come from TREAT_PRESETS /
   TREAT_LOOKS in public/studio/panels/photo-panel/looks.js (working tree) on both sides.
   Which files each side loaded is printed first — see harness-sides.cjs. */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('./harness-sides.cjs');

const USAGE = 'node harness-compare.cjs [--ref HEAD] [--out shots/compare] [--photos c,g] [--treat halftone,overprint] [--w 420] [--all-looks]';

const GAP = 14, GUT = 172, TITLE_H = 58, HEAD_H = 30, CAP_H = 24;
const MAX_SHEET_H = 15500;               // Chrome's canvas/PNG ceiling is 16384 px
const COLS = [{ side: 'old', paper: 'day' }, { side: 'new', paper: 'day' }, { side: 'old', paper: 'night' }, { side: 'new', paper: 'night' }];
const SEP_EXTRA = { ink: 'pink', ink2: 'blue' };

(async () => {
  const a = S.parseArgs(process.argv.slice(2), { ref: 'HEAD', out: 'shots/compare', photos: 'c,g', treat: '', w: 420, 'all-looks': false }, USAGE);
  const w = Math.max(48, a.w | 0), h = Math.round(w * S.TILE_ASPECT);
  const photos = S.splitList(a.photos);
  const treats = a.treat ? S.splitList(a.treat) : S.TREATMENTS14.slice();
  const outDir = path.isAbsolute(a.out) ? a.out : path.join(__dirname, a.out);
  fs.mkdirSync(outDir, { recursive: true });
  const tables = S.readTables();
  const noPreset = treats.filter(t => !tables.presets[t]);
  if (noPreset.length) console.warn('no TREAT_PRESETS entry for: ' + noPreset.join(', ') + ' (engine defaults will be used)');

  const { browser, page } = await S.openPage();
  try {
    const sides = { old: await S.loadSide(page, 'old', a.ref), new: await S.loadSide(page, 'new', a.ref) };
    console.log('old  ' + sides.old.label);
    console.log('new  ' + sides.new.label);
    await S.loadPhotos(page, photos);

    const jobs = treats.map(t => ({ treat: t, avail: { old: true, new: true }, extra: t === 'separation' ? SEP_EXTRA : null }));
    /* separation rides along on whichever side actually has it */
    if (!treats.includes('separation')) {
      const probe = S.renderOpts(tables, 'separation', null, S.PAPERS[0], SEP_EXTRA);
      const avail = {};
      for (const side of ['old', 'new']) {
        avail[side] = await page.evaluate((side, photo, opts) => window.__riso.hasTreatment(side, 'separation', photo, opts), side, photos[0], probe);
      }
      if (avail.old || avail.new) jobs.push({ treat: 'separation', avail, extra: SEP_EXTRA });
      else console.log('separation: not in either engine yet — sheet skipped');
    }

    console.log('');
    for (const job of jobs) {
      const looks = S.looksFor(tables, job.treat, a['all-looks']);
      await renderSheet(page, job, looks, photos, w, h, sides, outDir, a.ref, tables);
    }
    console.log('\nsheets in ' + outDir);
  } finally { await browser.close(); }
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });

/* Render every tile of one treatment into the page, compose the sheet on a
   canvas there, and write the PNG(s) here. */
async function renderSheet(page, job, looks, photos, w, h, sides, outDir, ref, tables) {
  const rows = [];
  for (const look of looks) for (const photo of photos) rows.push({ look, photo });
  const paperOf = p => S.PAPERS.find(x => x.paper === p);

  await page.evaluate(() => { window.__tiles = []; });
  const stats = [];
  for (let r = 0; r < rows.length; r++) {
    const { look, photo } = rows[r];
    const cells = COLS.map(c => ({ side: c.side, paper: c.paper, enabled: !!job.avail[c.side],
                                   opts: S.renderOpts(tables, job.treat, look, paperOf(c.paper), job.extra) }));
    stats.push(await page.evaluate((r, cells, treat, photo, w, h) => {
      const R = window.__riso, tiles = [], out = [];
      for (const c of cells) {
        const cv = R.canvas(w, h);
        let err = null;
        if (!c.enabled) err = 'n/a';
        else { try { R.render(c.side, cv, photo, treat, c.opts); } catch (e) { err = e.message || String(e); } }
        tiles.push(cv); out.push({ err });
      }
      const diff = {};
      for (const paper of ['day', 'night']) {
        const i = cells.findIndex(c => c.side === 'old' && c.paper === paper);
        const j = cells.findIndex(c => c.side === 'new' && c.paper === paper);
        diff[paper] = (i >= 0 && j >= 0 && !out[i].err && !out[j].err) ? R.diff(tiles[i], tiles[j]) : null;
      }
      window.__tiles[r] = tiles;
      return { cells: out, diff };
    }, r, cells, job.treat, photo, w, h));
  }

  const inkLabel = pp => { const o = S.renderOpts(tables, job.treat, null, pp, job.extra); return (o.ink + (o.ink2 ? '+' + o.ink2 : '')).toUpperCase(); };
  const cols = COLS.map(c => ({ side: c.side, paper: c.paper,
    head: c.side.toUpperCase() + ' · ' + c.paper.toUpperCase() + ' · ' + inkLabel(paperOf(c.paper)),
    na: 'not in ' + (c.side === 'old' ? ref : 'the working tree') }));
  const title = job.treat.toUpperCase() + '     tile ' + w + '×' + h + '     ' + S.stamp();
  const subtitle = 'old = ' + sides.old.label + '      new = ' + sides.new.label;
  const rowMeta = rows.map(r => ({ lookLabel: r.look.l, lookV: r.look.v, photo: r.photo }));
  const y0 = TITLE_H + HEAD_H + GAP, rowH = h + CAP_H + GAP;
  const chunkRows = Math.max(1, Math.floor((MAX_SHEET_H - y0) / rowH));
  const sheets = await page.evaluate(composeSheet, { rows: rowMeta, stats, cols, title, subtitle, w, h, GAP, GUT, TITLE_H, HEAD_H, CAP_H, chunkRows });
  await page.evaluate(() => { window.__tiles = []; });

  const written = sheets.map((s, i) => {
    const name = sheets.length === 1 ? job.treat + '.png' : job.treat + '-' + (i + 1) + 'of' + sheets.length + '.png';
    const buf = Buffer.from(s.url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(outDir, name), buf);
    return name + ' ' + s.W + '×' + s.H + ' ' + (buf.length / 1048576).toFixed(1) + 'MB';
  });

  let tiles = 0, errors = 0, pairs = 0, differing = 0, maxD = 0;
  for (const st of stats) {
    for (const c of st.cells) { if (c.err === 'n/a') continue; tiles++; if (c.err) errors++; }
    for (const p of ['day', 'night']) { const d = st.diff[p]; if (!d) continue; pairs++; if (d.px) differing++; if (d.max > maxD) maxD = d.max; }
  }
  console.log(job.treat.padEnd(12) + ' rows ' + String(rows.length).padStart(2) +
    ' (' + looks.length + ' look' + (looks.length === 1 ? '' : 's') + ' × ' + photos.length + ' photo' + (photos.length === 1 ? '' : 's') + ')' +
    '  tiles ' + String(tiles).padStart(3) + '  new≠old ' + differing + '/' + pairs + '  maxΔ ' + String(maxD).padStart(3) +
    (errors ? '  ERRORS ' + errors : '') + '  → ' + written.join(', '));
  if (errors) rows.forEach((row, r) => stats[r].cells.forEach((c, i) => {
    if (c.err && c.err !== 'n/a') console.log('   ! ' + row.look.v + '/' + row.photo + ' ' + COLS[i].side + '·' + COLS[i].paper + ': ' + c.err);
  }));
}

/* Runs in the page (serialised by puppeteer — it can only see its argument).
   Lays the rendered tiles out with a title bar, column heads, a row gutter and
   per-tile captions, in chunks that stay under the canvas size ceiling. */
function composeSheet(m) {
  const { rows, stats, cols, title, subtitle, w, h, GAP, GUT, TITLE_H, HEAD_H, CAP_H, chunkRows } = m;
  const font = (px, wt) => (wt || 600) + ' ' + px + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const x0 = GAP + GUT, rowH = h + CAP_H + GAP, W = x0 + cols.length * (w + GAP), y0 = TITLE_H + HEAD_H + GAP;
  const out = [];
  for (let from = 0; from < rows.length; from += chunkRows) {
    const to = Math.min(rows.length, from + chunkRows), H = y0 + (to - from) * rowH;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = '#15110c'; x.fillRect(0, 0, W, H);
    x.textBaseline = 'middle'; x.letterSpacing = '0.06em';
    x.fillStyle = '#f0e6d6'; x.font = font(15, 700);
    x.fillText(title + (rows.length > chunkRows ? '     (rows ' + (from + 1) + '–' + to + ' of ' + rows.length + ')' : ''), GAP, TITLE_H * 0.34);
    x.fillStyle = '#8f8272'; x.font = font(11);
    x.fillText(subtitle, GAP, TITLE_H * 0.74);
    x.fillStyle = '#cdbfae'; x.font = font(12);
    cols.forEach((c, i) => x.fillText(c.head, x0 + i * (w + GAP), TITLE_H + HEAD_H / 2));
    x.strokeStyle = '#2c241a'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(GAP, TITLE_H + HEAD_H - 0.5); x.lineTo(W - GAP, TITLE_H + HEAD_H - 0.5); x.stroke();
    for (let r = from; r < to; r++) {
      const y = y0 + (r - from) * rowH, row = rows[r], st = stats[r], tiles = window.__tiles[r];
      x.fillStyle = '#f0e6d6'; x.font = font(13, 700); x.fillText(row.lookLabel.toUpperCase(), GAP, y + 12);
      x.fillStyle = '#8f8272'; x.font = font(11); x.fillText(row.lookV + '  ·  photo ' + row.photo, GAP, y + 34);
      cols.forEach((c, i) => {
        const tx = x0 + i * (w + GAP), cell = st.cells[i];
        if (cell.err) {
          x.fillStyle = '#221a12'; x.fillRect(tx, y, w, h);
          x.fillStyle = cell.err === 'n/a' ? '#6e6255' : '#ed2224'; x.font = font(11);
          x.fillText(cell.err === 'n/a' ? c.na : ('ERROR ' + cell.err).slice(0, Math.max(8, w / 6.5 | 0)), tx + 10, y + h / 2);
        } else x.drawImage(tiles[i], tx, y);
        let cap = c.head.toLowerCase(), hot = false;
        if (c.side === 'new') {
          const d = st.diff[c.paper];
          if (d) { hot = d.px > 0; cap += hot ? '  ·  Δ ' + d.px + ' px (max ' + d.max + ')' : '  ·  Δ 0'; }
        }
        if (hot) { x.strokeStyle = '#ed1b72'; x.lineWidth = 2; x.strokeRect(tx + 1, y + 1, w - 2, h - 2); }
        x.fillStyle = hot ? '#ed1b72' : '#cdbfae'; x.font = font(11); x.fillText(cap, tx, y + h + CAP_H / 2);
      });
    }
    out.push({ url: cv.toDataURL('image/png'), W, H });
  }
  return out;
}
