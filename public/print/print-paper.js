/* ============================================================
   REALITY PRINT STUDIO — the paper: sizes, inks, type, faces
   ------------------------------------------------------------
   What a sheet IS, before anything is placed on it: the A-series
   (+ square sticker stock) in exact ISO millimetres, the working
   unit (the PDF point), the gang tiling onto A4, the CMYK builds
   of the locked accents, K-only ink on the true-white sheet, the
   print type ladder, the embedded faces, the screen colour
   resolution, the plane shadow, and the layout grid.
   Read by the data, both renderers, the exporter and the app.
   (Split out of print-data.jsx, Phase 3.)
   ============================================================ */
/* ---- brand palette (LOCKED) — screen RGB, the weekday coding, contrast,
   the ink mark, the wordmark path and the brand strings: one copy for every
   Studio, in ../studio-shared/brand.js (the hexes derive from
   public/tokens/day-colours.json). Print's own substrate — #111111 ink on the
   true-white sheet, canon's `print` block — is NEUTRALS.print there, handed
   to contrastInk and the ink-mark cells as a parameter. ---- */
import { PALETTE, ACCENTS, NEUTRALS, contrastInk } from '../studio-shared/brand.js';
import { makeTypeScale } from '../studio-shared/util.js';
/* Canonical CMYK build of each locked accent [c,m,y,k] 0..1. The browser
   renders the RGB hex above; the PDF is filled with THESE, so saturated
   hues (blue, green, yellow) don't blow out on a coated press. Seeded from
   a coated-stock reading — tune against a test print and they propagate. */
const PALETTE_CMYK = {
  blue:  [0.78, 0.18, 0.00, 0.00],
  green: [0.72, 0.00, 0.95, 0.00],
  yellow:[0.00, 0.07, 1.00, 0.00],
  amber: [0.00, 0.32, 0.95, 0.00],
  purple:[0.62, 0.88, 0.00, 0.10],
  pink:  [0.00, 0.92, 0.22, 0.00],
  red:   [0.00, 0.92, 0.88, 0.00],
};
/* Ink = the text/line black. On screen a hair off pure so it sits kindly on
   white; in the PDF it is K-ONLY (CMYK 0,0,0,1) so type rides the black plate
   alone — one ink, crisp registration, no colour fringing on small text.
   White = the paper; in print it is "no ink" (0,0,0,0), never a fill.
   The screen hex #111111 is the canon for print (public/tokens/day-colours.json
   → print.ink, beside true-white stock), not Poster's cream-paper #0d0905;
   tools/verify-day-colours.mjs holds both to it. The PDF never sees this
   hex: text and ink fills stay K-only. */
const INK   = { rgb:NEUTRALS.print.ink,   cmyk:[0,0,0,1] };
const WHITE = { rgb:NEUTRALS.print.light, cmyk:[0,0,0,0] };

/* ---- A-series, portrait base, exact ISO millimetres ---- */
const PT_PER_MM = 72 / 25.4;                 // 2.834645…  (1pt = 1/72")
const SIZES = {
  a8:{ mm:[52,74],   label:'A8', sub:'COUPON' },
  a7:{ mm:[74,105],  label:'A7', sub:'TAG' },
  a6:{ mm:[105,148], label:'A6', sub:'CARD' },
  a5:{ mm:[148,210], label:'A5', sub:'SIGN' },
  a4:{ mm:[210,297], label:'A4', sub:'SIGN' },
  a3:{ mm:[297,420], label:'A3', sub:'POSTER' },
  a2:{ mm:[420,594], label:'A2', sub:'POSTER' },
  a1:{ mm:[594,841], label:'A1', sub:'STANDEE' },
  /* square die-cut sticker stock — the trim is square; the visible shape
     (circle / rounded / squircle) is the `sticker` element drawn inside.
     Not in GANG (a die-cut printer gangs + cuts them); for DIY sheets use a
     small A-size + "Gang on A4". */
  st50: { mm:[50,50],   label:'S50',  sub:'STICKER' },
  st75: { mm:[75,75],   label:'S75',  sub:'STICKER' },
  st100:{ mm:[100,100], label:'S100', sub:'STICKER' },
};
const SIZE_ORDER = ['a8','a7','a6','a5','a4','a3','a2','a1','st50','st75','st100'];

/* Physical + working dims for a size at an orientation. Working canvas unit
   IS the point, so wpt/hpt are both the on-screen artboard size and the PDF
   page (trim) size. */
function sizeDims(size, orient){
  const s = SIZES[size] || SIZES.a5;
  let [wmm, hmm] = s.mm;
  if(orient === 'landscape'){ const t = wmm; wmm = hmm; hmm = t; }
  return { wmm, hmm, wpt: wmm*PT_PER_MM, hpt: hmm*PT_PER_MM };
}

/* Gang smaller pieces onto one A4 sheet for bulk runs (coupons, tags). Each
   entry: how the A-size tiles A4, and the orientation of the cell — A-paper
   halves with a 90° flip each step, so the cell orientation alternates. The
   piece is stamped (rotated if its own orientation differs) into every cell;
   cut guides ride the grid lines for the guillotine. */
const GANG = {
  a5:{ cols:1, rows:2, cell:'landscape', per:2  },
  a6:{ cols:2, rows:2, cell:'portrait',  per:4  },
  a7:{ cols:2, rows:4, cell:'landscape', per:8  },
  a8:{ cols:4, rows:4, cell:'portrait',  per:16 },
};

/* ---- type scale (pt) — sizes snap to these ---- */
/* the snapping itself is ../studio-shared/util.js makeTypeScale */
const TYPE = makeTypeScale([7,8,9,10,11,12,14,16,18,21,24,28,33,39,46,54,64,76,90,108,128]);
const TYPE_SCALE = TYPE.steps, snapToScale = TYPE.snap, scaleStep = TYPE.step;

/* ---- font faces — one TTF per (family, weight). The export engine fetches
   + embeds (subset) these; the screen uses the same families via Google
   Fonts (index.html). ---- */
const FACES = {
  'mont-100':    { file:'fonts/montserrat-100.ttf',     css:"'Montserrat',sans-serif",            fam:'mont', weight:100 },
  'mont-500':    { file:'fonts/montserrat-500.ttf',     css:"'Montserrat',sans-serif",            fam:'mont', weight:500 },
  'mont-700':    { file:'fonts/montserrat-700.ttf',     css:"'Montserrat',sans-serif",            fam:'mont', weight:700 },
  'mont-800':    { file:'fonts/montserrat-800.ttf',     css:"'Montserrat',sans-serif",            fam:'mont', weight:800 },
  'mont-alt-600':{ file:'fonts/montserrat-alt-600.ttf', css:"'Montserrat Alternates',sans-serif", fam:'alt',  weight:600 },
  'grot-400':    { file:'fonts/space-grotesk-400.ttf',  css:"'Space Grotesk',sans-serif",         fam:'grot', weight:400 },
  'grot-500':    { file:'fonts/space-grotesk-500.ttf',  css:"'Space Grotesk',sans-serif",         fam:'grot', weight:500 },
};
/* Nearest embedded face for a family + desired weight. */
function faceFor(fam, weight){
  if(fam==='alt') return 'mont-alt-600';
  if(fam==='grot') return weight>=500 ? 'grot-500' : 'grot-400';
  // mont — Thin (100) is the Year 2 display weight for big category headers
  if(weight<=200) return 'mont-100';
  if(weight>=800) return 'mont-800';
  if(weight>=650) return 'mont-700';
  return 'mont-500';
}

/* ---- colour resolution (screen) ----
   Readable ink for text on a fill is brand.js contrastInk — Poster's
   contrast-ratio rule — handed Print's pair (NEUTRALS.print), so the light
   is the white sheet instead of cream: ink on pink and red, white only on
   purple. Ties go to ink. */
/* An element's ink choice → screen hex. 'ink'/'white' literal; an accent name
   → its hex; 'auto' → the supplied fallback (surface contrast or doc accent). */
function resolveInk(key, fallback){
  if(key==='auto' || key==null) return fallback;
  if(key==='ink') return INK.rgb;
  if(key==='white') return WHITE.rgb;
  if(ACCENTS.indexOf(key)>=0) return PALETTE[key];
  return fallback;
}
/* Surface → concrete box style (screen). Flat only — no scrim/blur on paper. */
function surfaceStyle(surface, accentHex){
  const bw = 1.6;
  switch(surface){
    case 'solid':   return { background:INK.rgb,   color:WHITE.rgb,            border:`${bw}px solid ${INK.rgb}` };
    case 'paper':   return { background:WHITE.rgb, color:INK.rgb,             border:`${bw}px solid ${INK.rgb}` };
    case 'accent':  return { background:accentHex, color:contrastInk(accentHex, NEUTRALS.print), border:`${bw}px solid ${accentHex}` };
    case 'outline': return { background:'transparent', color:INK.rgb,         border:`${bw}px solid ${INK.rgb}` };
    default:        return { background:'transparent', color:INK.rgb,         border:`${bw}px solid transparent` };
  }
}

/* The REALITY wordmark (WORDMARK_PATH — the 7 letter subpaths of the site
   Logo, joined; drawn by the PDF exporter via drawSvgPath), ADDR / SITE and
   the misregistration PARTNER map (an element's "echo" ghost, the riso
   overprint move — canon partners) are all in brand.js. */

/* INK MARK — the ink strip / square as a placeable print element (canon rev
   22.08.26) — is brand.js's, the same block the Poster and Schedule draw.
   Print departures: STOCK IS THE PAPER. On true-white stock the stock cells
   are UNPRINTED — the PDF exporter skips them entirely (never a cream/white
   fill) and the screen shows them paper-white (INK_MARK_CELLS_PRINT). Stock
   is always an inner cell, so the outer-corner rule (G2) holds with no ground
   plate; ink cells ride the K plate; accents fill from PALETTE_CMYK. */

/* Flat straight-down shadow — the lifted-edge plane (style guide §05).
   On the white sheet it prints as a soft K tint. {dy, k} per step. */
const LIFT = { none:null, light:{dy:4,k:0.08}, default:{dy:8,k:0.12}, heavy:{dy:12,k:0.18} };

/* Generalised plane shadow — the Poster Studio shadow model, print-grade.
   Presets stay the flat straight-down K-tint above; lift:'custom' opens the
   dials: shadowDist (pt) · shadowAngle (deg, 90 = straight down) · shadowColor
   ('k' soft press tint | 'ink' | any accent — the hard riso shadow) ·
   shadowAlpha (0..1). Always FLAT (zero blur): a vector offset both renderers
   can draw identically — blur would force rasterising the whole sheet.
   Returns { dx, dy, color, alpha } (color 'k'|'ink'|'white'|accent) or null. */
function shadowSpec(el){
  const key = el.lift||'none';
  if(key==='custom'){
    const dist = el.shadowDist!=null?el.shadowDist:8;
    if(!(dist>0)) return null;
    const ang = (el.shadowAngle!=null?el.shadowAngle:90)*Math.PI/180;
    const color = el.shadowColor||'k';
    const alpha = el.shadowAlpha!=null?el.shadowAlpha:(color==='k'?0.12:1);
    return { dx:Math.round(Math.cos(ang)*dist*100)/100, dy:Math.round(Math.sin(ang)*dist*100)/100, color, alpha };
  }
  const s = LIFT[key];
  return s ? { dx:0, dy:s.dy, color:'k', alpha:s.k } : null;
}
/* screen CSS colour for a shadow spec (the PDF resolves it to CMYK itself) */
function shadowCss(spec){
  if(!spec) return null;
  let rgb;
  if(spec.color==='k') rgb = 'rgba(13,9,5,'+spec.alpha+')';
  else {
    const hex = spec.color==='ink' ? INK.rgb : spec.color==='white' ? WHITE.rgb : (PALETTE[spec.color]||INK.rgb);
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    rgb = 'rgba('+r+','+g+','+b+','+spec.alpha+')';
  }
  return spec.dx+'px '+spec.dy+'px 0 '+rgb;
}

/* ---- layout grid — margins + columns/rows with gutters -------------------
   The Swiss backbone: doc.marginMm sets the safe margin; doc.grid holds
   { cols, rows, gutter } (0 = off). Returns snap targets (xs/ys — every
   column/row EDGE plus the margins and centre) and the column/row boxes for
   the canvas overlay. Both the canvas snapper and the overlay read this, so
   what you see is exactly what you snap to. */
function gridSpec(doc, dims){
  const m = (doc.marginMm!=null?doc.marginMm:6)*PT_PER_MM;
  const g = doc.grid||{};
  const cols = Math.max(0, g.cols|0), rows = Math.max(0, g.rows|0);
  const gut = g.gutter!=null?g.gutter:12;
  const innerW = dims.wpt-m*2, innerH = dims.hpt-m*2;
  const xs = [m, dims.wpt/2, dims.wpt-m];
  const ys = [m, dims.hpt/2, dims.hpt-m];
  const colBoxes = [], rowBoxes = [];
  if(cols>1 && innerW>cols*8){
    const cw = (innerW-(cols-1)*gut)/cols;
    for(let i=0;i<cols;i++){
      const x0 = m+i*(cw+gut);
      colBoxes.push([x0, x0+cw]);
      if(i>0){ xs.push(x0-gut); } xs.push(x0); xs.push(x0+cw);
    }
  }
  if(rows>1 && innerH>rows*8){
    const rh = (innerH-(rows-1)*gut)/rows;
    for(let i=0;i<rows;i++){
      const y0 = m+i*(rh+gut);
      rowBoxes.push([y0, y0+rh]);
      if(i>0){ ys.push(y0-gut); } ys.push(y0); ys.push(y0+rh);
    }
  }
  return { m, cols, rows, gutter:gut, xs, ys, colBoxes, rowBoxes, innerW, innerH };
}

export {
  PALETTE_CMYK, INK, WHITE, PT_PER_MM, SIZES, SIZE_ORDER, sizeDims, GANG,
  TYPE_SCALE, snapToScale, scaleStep, FACES, faceFor,
  resolveInk, surfaceStyle, LIFT, shadowSpec, shadowCss, gridSpec,
};
