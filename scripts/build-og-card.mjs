/* Cut the social preview card — the image every chat app draws when someone
   drops a REALITY link.
   ===========================================================================

   Why this exists
   ---------------
   The card used to be `/images/hero.jpg`: a photograph of the room. It read as
   "a bar", not as us. This renders the card from the ink mark instead, so the
   thing people see before they see the site is the same mark that is on the
   wall, the posters and the menus.

   Why it is generated and not drawn
   ---------------------------------
   The mark's cell ORDER is canon (design-system-year2/.../tokens/ink-strip.json)
   and its colours are canon (public/tokens/day-colours.json). A hand-drawn PNG
   would silently drift from both the first time either file changes. This
   script reads the same order the site's <InkMark> renders and ships the same
   vector wordmark <Logo> ships, so re-running it is always correct.

   Run it on demand, NOT in prebuild — the card changes about once a year and
   launching Chrome for every deploy is not worth it:

       npm run og

   Outputs
   -------
       public/images/og-card.png          1200x630  — the OG / Twitter card
       public/images/og-card-square.png   1200x1200 — 1:1 sibling, for the app
                                                      and any surface that wants
                                                      a square. Not referenced
                                                      by the site's meta tags.

   Design: option D, "Press Slam" — Montserrat 800 doing the talking, the full
   strip along the bottom as a footer rule. Clear space under the strip is a
   full module, per canon; do not tighten the bottom padding below --m.
   =========================================================================== */

import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'images');

/* ── Canon: cell order is fixed, recolouring is the only parameter. Mirrors
      MODES in src/components/InkMark.jsx. Only `full` is used here, but the
      whole table is kept so a future mode swap is a one-word edit. ────────── */
const MODES = {
  full: {
    bands: ['red', 'blue', 'yellow'],
    field: ['stock', 'ink', 'green', 'pink', 'purple', 'amber'],
  },
};

/* ── Locked palette. Values are the canon hexes; kept literal because the
      renderer cannot read CSS custom properties (decided 18.08.26). ──────── */
const INK = '#0d0905';
const STOCK = '#fffbf1';
const CELL = {
  red: '#ed2224', blue: '#18a7e0', yellow: '#fddf00', green: '#43b02a',
  pink: '#ed1b72', amber: '#fdb515', purple: '#6e3179', ink: INK, stock: STOCK,
};

const ADDRESS = '86 Mai Thúc Lân · Đà Nẵng';
const HOURS = 'Open daily 11am – 2am';
const SITE = 'realitydn.com';
const LINES = ['Coffee', 'Cocktails', 'Community'];

/* The canonical wordmark, lifted verbatim from src/components/Logo.jsx. The
   shipped viewBox carries generous side padding; VIEW is the tight box so the
   layout can size the mark by its actual ink. Never re-typeset from a webfont
   — Montserrat Alternates is not the mark (see brand guidelines §03). */
const WORDMARK_VIEW = '73 12 368 60';
const WORDMARK_PATHS = [
  'M73.4,63.7V13.3h20.7c4.5,0,8.3.7,11.5,2.1,3.2,1.4,5.7,3.5,7.4,6.2,1.7,2.7,2.6,5.9,2.6,9.6s-.9,6.9-2.6,9.5c-1.7,2.6-4.2,4.7-7.4,6.1-3.2,1.4-7,2.2-11.5,2.2h-15.5l4.1-4.2v18.9h-9.4ZM82.7,45.9l-4.1-4.5h15c4.1,0,7.2-.9,9.3-2.7,2.1-1.8,3.1-4.2,3.1-7.4s-1-5.6-3.1-7.4c-2.1-1.8-5.2-2.6-9.3-2.6h-15l4.1-4.6v29.2ZM106.3,63.7l-12.7-18.3h10l12.8,18.3h-10.1Z',
  'M142.6,55.8h28.4v7.9h-37.8V13.3h36.8v7.9h-27.4v34.6ZM141.8,34.3h25.1v7.7h-25.1v-7.7Z',
  'M188.2,63.7v-27.9c0-5,.9-9.3,2.8-12.7s4.5-6.1,7.8-7.8c3.4-1.8,7.2-2.6,11.7-2.6s8.4.9,11.8,2.6c3.4,1.8,6,4.4,7.8,7.8,1.8,3.5,2.8,7.7,2.8,12.7v27.9h-9.3v-28.8c0-4.8-1.2-8.3-3.6-10.6-2.4-2.3-5.6-3.5-9.5-3.5s-7.2,1.2-9.5,3.5c-2.4,2.3-3.6,5.9-3.6,10.6v28.8h-9.2ZM194.1,50.7v-7.8h32.8v7.8h-32.8Z',
  'M253.3,63.7V13.3h9.4v42.5h26.4v7.9h-35.7Z',
  'M299.8,21.2v-7.9h27.9v7.9h-27.9ZM299.8,63.7v-7.9h27.9v7.9h-27.9ZM309,62.6V14.3h9.4v48.3h-9.4Z',
  'M354.8,63.7V21.2h-16.7v-7.9h42.8v7.9h-16.7v42.5h-9.4Z',
  'M415.7,71.4c-4.2,0-8.1-.6-11.5-1.9-3.5-1.2-6.4-3-8.7-5.2l3.8-7.2c2.3,2,4.7,3.5,7.5,4.5,2.7,1,5.7,1.5,9,1.5s7.8-1.2,10.2-3.5c2.3-2.4,3.5-6,3.5-10.9v-9.8l2.7,1.2c-1.6,3.9-4,6.7-7,8.5-3,1.8-6.6,2.7-10.6,2.7-6.3,0-11.3-1.8-14.8-5.4-3.5-3.6-5.3-8.9-5.3-15.7V13.3h9.4v16.5c0,4.5,1.1,7.9,3.3,10.1,2.2,2.2,5.1,3.3,8.8,3.3s7.2-1.2,9.7-3.5c2.5-2.3,3.7-6,3.7-10.9v-15.6h9.4v35c0,5.1-.9,9.3-2.8,12.7s-4.5,6-7.9,7.7c-3.4,1.8-7.5,2.7-12.2,2.7Z',
];

const wordmark = (width) => `
  <svg viewBox="${WORDMARK_VIEW}" width="${width}" height="${width * 60 / 368}"
       xmlns="http://www.w3.org/2000/svg" role="img" aria-label="REALITY"
       style="display:block">
    <g fill="${INK}">${WORDMARK_PATHS.map((d) => `<path d="${d}"/>`).join('')}</g>
  </svg>`;

/* strip-h: a 9x2 grid of modules. Three 2x2 bands, then six 1x1 field cells
   flowing down-then-across. Column flow with `span 2` reproduces exactly what
   .im-strip-h does in src/index.css. */
function stripH(module) {
  const { bands, field } = MODES.full;
  const cells = [
    ...bands.map((n) => `<i class="b" style="background:${CELL[n]}"></i>`),
    ...field.map((n) => `<i style="background:${CELL[n]}"></i>`),
  ].join('');
  return `<span class="im" style="--m:${module}px" aria-hidden="true">${cells}</span>`;
}

/* ── The card. `square` swaps the scale ladder, not the composition — both
      frames are the same design so the pair reads as one thing. ─────────── */
function markup({ w, h, square }) {
  /* The 1:1 frame has far more height than the composition needs, so the slam
     is centred in the space between head and foot rather than stacked under
     the wordmark — otherwise the card reads as a hole with type at the edges. */
  const s = square
    ? { pad: '96px 96px 88px', wm: 440, slam: 150, module: 52, meta: 20, gap: 44 }
    : { pad: '66px 72px 58px', wm: 392, slam: 92, module: 40, meta: 16, gap: 26 };

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Space+Grotesk:wght@500&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${w}px;height:${h}px}
  body{background:${STOCK};color:${INK};overflow:hidden;
       font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;
       -webkit-font-smoothing:antialiased}
  .card{width:${w}px;height:${h}px;padding:${s.pad};
        display:flex;flex-direction:column;justify-content:space-between}
  /* Ink mark — geometry verbatim from .im / .im-strip-h in src/index.css.
     No radius, no gradient, no outline, no cell shadow. */
  .im{display:grid;gap:0;line-height:0;flex:none;
      grid-template-rows:repeat(2,var(--m));grid-auto-columns:var(--m);grid-auto-flow:column}
  .im i{display:block}
  .im i.b{grid-column:span 2;grid-row:span 2}
  .head{display:flex;align-items:baseline;justify-content:space-between;gap:40px}
  .slam{font-weight:800;text-transform:uppercase;font-size:${s.slam}px;
        line-height:.85;letter-spacing:-.022em}
  .foot{display:flex;align-items:flex-end;justify-content:space-between;gap:40px}
  .lab{font-weight:700;text-transform:uppercase;font-size:${s.meta}px;
       letter-spacing:.16em;line-height:1.9;color:rgba(13,9,5,.66)}
  .foot .lab{text-align:right}
  .top{display:flex;flex-direction:column;gap:${s.gap}px}
  ${square ? '.top{flex:1}\n  .slam{margin-block:auto}' : ''}
</style></head><body>
  <div class="card">
    <div class="top">
      <div class="head">${wordmark(s.wm)}<span class="lab">${SITE}</span></div>
      <div class="slam">${LINES.join('<br>')}</div>
    </div>
    <div class="foot">
      ${stripH(s.module)}
      <span class="lab">${ADDRESS}<br>${HOURS}</span>
    </div>
  </div>
</body></html>`;
}

const FRAMES = [
  { file: 'og-card.png', w: 1200, h: 630, square: false },
  { file: 'og-card-square.png', w: 1200, h: 1200, square: true },
];

const browser = await puppeteer.launch({ headless: 'new' });
fs.mkdirSync(OUT_DIR, { recursive: true });

try {
  for (const frame of FRAMES) {
    const page = await browser.newPage();
    await page.setViewport({ width: frame.w, height: frame.h, deviceScaleFactor: 1 });
    await page.setContent(markup(frame), { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);

    /* A silent fallback to Arial would ship a card that is subtly not ours,
       and nothing downstream would catch it. Fail loudly instead. */
    const loaded = await page.evaluate(() => document.fonts.check('800 92px Montserrat'));
    if (!loaded) throw new Error('Montserrat did not load — refusing to ship a fallback-font card.');

    const dest = path.join(OUT_DIR, frame.file);
    await page.screenshot({ path: dest, type: 'png' });
    await page.close();

    const kb = (fs.statSync(dest).size / 1024).toFixed(0);
    console.log(`  ${frame.file}  ${frame.w}x${frame.h}  ${kb} KB`);
  }
} finally {
  await browser.close();
}

console.log('OG cards written to public/images/');
