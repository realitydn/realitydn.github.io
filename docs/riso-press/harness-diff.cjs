/* docs/riso-press/harness-diff.cjs
   The zero-differing-pixels gate (README §2). Renders every treatment × every
   TREAT_LOOKS entry (plus the bare "preset" baseline) × both papers × two
   photos on OLD (a git ref) and NEW (the working tree) at the same size, and
   reports per render the number of pixels that differ in any channel and the
   largest single-channel delta.

   node harness-diff.cjs [--ref HEAD] [--w 300] [--allow treat1,treat2]
                         [--photos c,g] [--treat halftone,overprint]

     --ref     git ref the OLD side is read from (git show <ref>:…); default HEAD
     --w       render width in px; height is w × 1.27; default 300
     --allow   treatments whose differences are reported but do not fail the
               run (a retrofit that is expected to move); default none
     --photos  gallery keys (public/images/gallery/<k>.jpg) or paths; default c,g
     --treat   subset of the fourteen; default all

   Exit 0 when every render is identical; 1 when any render outside --allow
   differs or throws; 2 on bad arguments. `separation` is diffed only once both
   sides have it — until then its presence on the new side is just noted. See
   harness-sides.cjs for how the two engines are loaded side by side. */
'use strict';
const S = require('./harness-sides.cjs');

const USAGE = 'node harness-diff.cjs [--ref HEAD] [--w 300] [--allow treat1,treat2] [--photos c,g] [--treat halftone,overprint]';
const SEP_EXTRA = { ink: 'pink', ink2: 'blue' };

(async () => {
  const a = S.parseArgs(process.argv.slice(2), { ref: 'HEAD', w: 300, allow: '', photos: 'c,g', treat: '' }, USAGE);
  const w = Math.max(16, a.w | 0), h = Math.round(w * S.TILE_ASPECT);
  const photos = S.splitList(a.photos), allow = new Set(S.splitList(a.allow));
  const treats = a.treat ? S.splitList(a.treat) : S.TREATMENTS14.slice();
  const tables = S.readTables();

  const { browser, page } = await S.openPage();
  let code = 0;
  try {
    const old = await S.loadSide(page, 'old', a.ref), nu = await S.loadSide(page, 'new', a.ref);
    console.log('old  ' + old.label);
    console.log('new  ' + nu.label);
    console.log('render ' + w + '×' + h + ' · photos ' + photos.join(',') + (allow.size ? ' · allowed to differ: ' + [...allow].join(',') : ''));
    await S.loadPhotos(page, photos);

    /* separation joins the table only once both engines can render it */
    const sepProbe = S.renderOpts(tables, 'separation', null, S.PAPERS[0], SEP_EXTRA);
    const sep = {};
    for (const side of ['old', 'new']) {
      sep[side] = await page.evaluate((side, photo, opts) => window.__riso.hasTreatment(side, 'separation', photo, opts), side, photos[0], sepProbe);
    }
    if (sep.old && sep.new && !treats.includes('separation')) treats.push('separation');

    const C = { treat: 13, look: 10, paper: 7, photo: 8, px: 11, max: 7 };
    const line = (t, l, p, ph, px, mx, st) => console.log(
      String(t).padEnd(C.treat) + String(l).padEnd(C.look) + String(p).padEnd(C.paper) + String(ph).padEnd(C.photo) +
      String(px).padStart(C.px) + String(mx).padStart(C.max) + '  ' + st);
    console.log('');
    line('treatment', 'look', 'paper', 'photo', 'diff px', 'maxΔ', 'result');
    console.log('-'.repeat(C.treat + C.look + C.paper + C.photo + C.px + C.max + 12));

    let n = 0, differ = 0, errors = 0, allowed = 0, maxAll = 0;
    for (const t of treats) {
      const extra = t === 'separation' ? SEP_EXTRA : null;
      for (const look of S.looksFor(tables, t, true)) {
        for (const photo of photos) {
          const papers = S.PAPERS.map(pp => ({ paper: pp.paper, opts: S.renderOpts(tables, t, look, pp, extra) }));
          const res = await page.evaluate((treat, photo, w, h, papers) => {
            const R = window.__riso;
            return papers.map(pp => {
              try {
                const A = R.render('old', R.canvas(w, h), photo, treat, pp.opts);
                const B = R.render('new', R.canvas(w, h), photo, treat, pp.opts);
                const d = R.diff(A, B);
                return { paper: pp.paper, px: d.px, max: d.max, err: null };
              } catch (e) { return { paper: pp.paper, px: null, max: null, err: e.message || String(e) }; }
            });
          }, t, photo, w, h, papers);
          for (const r of res) {
            n++;
            let status;
            if (r.err) {
              errors++;
              if (allow.has(t)) { allowed++; status = 'ERROR (allowed) ' + r.err; } else { code = 1; status = 'ERROR ' + r.err; }
            } else if (r.px) {
              differ++; if (r.max > maxAll) maxAll = r.max;
              if (allow.has(t)) { allowed++; status = 'differs (allowed)'; } else { code = 1; status = 'DIFFERS'; }
            } else status = 'ok';
            line(t, look.v, r.paper, photo, r.err ? '-' : r.px, r.err ? '-' : r.max, status);
          }
        }
      }
    }

    console.log('\n' + n + ' renders · ' + differ + ' differ · ' + errors + ' errors' +
      (allowed ? ' (' + allowed + ' in allowed treatments)' : '') + ' · max Δ ' + maxAll);
    if (!(sep.old && sep.new)) {
      console.log('separation: ' + (sep.new ? 'on the new side only — nothing at ' + a.ref + ' to diff it against' : 'not in the new engine yet'));
    }
    console.log('GATE ' + (code ? 'FAIL' : 'PASS'));
  } finally { await browser.close(); }
  process.exit(code);
})().catch(e => { console.error(e && e.stack || e); process.exit(1); });
