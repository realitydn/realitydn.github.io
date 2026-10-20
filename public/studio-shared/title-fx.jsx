/* ============================================================
   REALITY STUDIOS — title party effects (Poster + Print)
   For the Kinetic register (style guide §06: parties, celebrations,
   one-offs) — opt-in per title, 'none' by default, and the default path
   in either renderer doesn't touch this file, so every existing poster
   and sheet renders exactly as before.

   Thirteen silkscreen moves from the canon, in two rows:
   PRINT
     misreg    Misregister — two plates slip opposite ways behind the key
               (the 13 / 6 hero offsets) and overprint where they cross
     echo      Echo — Poster Echo held still: two key-line pulls step out
               behind the word in the two inks
     slab      Slab — the ticket print run solid: a hard extrusion in ink A
               ending on an ink-B edge. No blur, ever.
     keyline   Key line — hollow letters with the fill plate slipped off
               register under them
     sep       Separation — Kinetic Headline as print: every word its own
               ink, the last one landing on yellow where yellow can read
     tape      Tape — each line on its own ink bar, alternating A / B,
               with a hard print under the bar
     halftone  Halftone — a flat plate screened from each line's foot
   LOUD
     run       Colour run — a long extrusion banded through the palette
     sticker   Sticker — the title die-cut from the paper stock: the
               ticket (stock, edge, hard print) wrapped round the letters
     slice     Slice — strips of key and first ink slipping opposite ways
     tiles     Tiles — every letter on its own palette tile, off true
     candy     Candy — first ink + stock stripes, key line, hard print
     repeat    Repeat — the title again above and below as key lines

   ---- one spec, two renderers ----
   fxSpec(el, ctx) makes EVERY decision — which inks, which order, how far,
   how many — and returns plain numbers and hex. The screen renderer
   (titleFx → FxTitle, CSS + an SVG filter, Poster and Print alike) and
   Print's vector PDF drawer (print/print-fx.js) both draw from it, so a
   proof and its file can't pick different inks.

   ctx = { ground, accentHex, textCol, lineHeight, pair }
     ground    what the title sits on (the box fill, else the page)
     pair      the studio's neutrals { ink, light } — Poster's artwork
               cream, Print's paper white (brand.js NEUTRALS). The light
               one is the STOCK: the sticker's body, candy's second stripe.

   ---- how they meet the box (Surface) ----
     · A plate never matches the ground — on an Accent box the plates move
       to the partner ink (canon partners), so they can't vanish into it.
     · Anything you READ in an ink (Separation words, the Halftone face)
       must clear APCA |Lc| 35 on that ground — display size at poster
       range — or it steps to the next ink, then to the box's own text
       colour. So yellow drops out on cream, purple on ink.
     · Tape bars and tiles carry their own text by the APCA rule.
     · On a box, the padding grows by the effect's overhang so plates stay
       inside the border instead of crossing it (Repeat is cropped by it).
   All offsets are in em — they scale with the title through every
   format and the Story boost, and preview = export.
   ============================================================ */
import { PALETTE as FX_PAL, ACCENTS as FX_ACC, partnerOf, apcaLc, contrastInk, NEUTRALS } from './brand.js';

const TITLE_FX = [
  { v:'none',     l:'None' },
  { v:'misreg',   l:'Misregister', t:'Two plates slip opposite ways behind the letters and overprint where they cross' },
  { v:'echo',     l:'Echo',        t:'Two key-line pulls step out behind the word — Poster Echo, held still' },
  { v:'slab',     l:'Slab',        t:'A hard solid extrusion in the first ink, edged in the second' },
  { v:'keyline',  l:'Key line',    t:'Hollow letters, the fill plate slipped off register beneath' },
  { v:'sep',      l:'Separation',  t:'Every word its own ink — Kinetic Headline, printed' },
  { v:'tape',     l:'Tape',        t:'Each line on its own ink bar, alternating the two inks' },
  { v:'halftone', l:'Halftone',    t:'A flat plate, screened from each line’s foot' },
  /* the LOUD row — the same moves pushed until they own the sheet. For the
     one-offs; each one is a whole look, not a garnish. */
  { v:'run',      l:'Colour run',  loud:1, t:'A long solid extrusion banded through the whole palette' },
  { v:'sticker',  l:'Sticker',     loud:1, t:'The title die-cut from the stock — ink edge, hard print in the first ink' },
  { v:'slice',    l:'Slice',       loud:1, t:'The title cut into strips that slip sideways, alternating the key and the first ink' },
  { v:'tiles',    l:'Tiles',       loud:1, t:'Every letter on its own ink-square tile, knocked a little off true' },
  { v:'candy',    l:'Candy',       loud:1, t:'Letters striped in the first ink and the stock, a key line round them and a hard print under' },
  { v:'repeat',   l:'Repeat',      loud:1, t:'The title printed again above and below as key lines — a wall of it' },
];
const FX_AMOUNTS = [{ v:'subtle', l:'Subtle' }, { v:'bold', l:'Bold' }, { v:'loud', l:'Loud' }];
const AMT = { subtle:0.6, bold:1, loud:1.6 };
/* which effects use which ink, so an Inspector only offers the swatches
   that change something */
const FX_USES = {
  misreg:{ a:1, b:1 }, echo:{ a:1, b:1 }, slab:{ a:1, b:1 }, keyline:{ a:1 },
  sep:{}, tape:{ a:1, b:1 }, halftone:{ a:1, b:1 },
  run:{ a:1 }, sticker:{ a:1 }, slice:{ a:1 }, tiles:{ a:1 }, candy:{ a:1, b:1 }, repeat:{ a:1, b:1 },
};
/* the Inspector's one-line explanation of each — both Studios show these */
const FX_HINTS = {
  misreg:   'The 13 / 6 hero plates, behind the letters. They overprint where they cross — on a dark ground they add instead.',
  echo:     'Two outline pulls step out behind the word. Heavier weights hold the outlines best.',
  slab:     'The ticket print, run solid. Hard, no blur.',
  keyline:  'Hollow letters in the box’s text colour, fill slipped underneath. Bold or heavier.',
  sep:      'Each word takes its own ink — red, blue, amber… — the last on yellow where yellow reads. Inks that don’t read on this box are skipped.',
  tape:     'Each line (each Enter) gets its own bar, and the bar text follows the APCA rule. The bars stand taller than bare type — give the box about a fifth more height.',
  halftone: 'A flat plate in the first ink, screened from each line’s foot in the box’s text colour. Pick a second ink to screen in that instead.',
  run:      'The extrusion walks the palette from the first ink in ink-square order, skipping the box colour. Loud runs longer.',
  sticker:  'The title die-cut from the stock: ink type, an edge, and a hard print in the first ink. It reads on any photo.',
  slice:    'Strips alternate the box’s text colour and the first ink, slipping opposite ways. Amount adds strips and slip.',
  tiles:    'Each letter on a palette tile, its letter by the APCA rule, the box colour skipped. Tiles stand taller than type — give the box about a third more height.',
  candy:    'Stripes in the first ink and the stock, a key line and a hard print in the second ink. Heavy weights only — thin letters lose the stripes.',
  repeat:   'The title again, above and below, as key lines. Amount sets the rows (1 · 2 · 3 each way). Made for a bare title, where the rows fill the sheet — a box crops them to its edges, so give it the height to show them.',
};
/* Kinetic Headline's order: red, blue, amber crash in; the last word lands on
   yellow. The rest of the palette follows so a long title has somewhere to go. */
const SEP_ORDER = ['red','blue','amber','pink','green','purple'];
/* The palette as a run — the ink square's order (the red · blue · yellow
   quadrants, then pink · purple · amber) with green closing it. Colour run and
   Tiles walk it from the first ink, skipping whatever the box is. */
const RUN_ORDER = ['red','blue','yellow','pink','purple','amber','green'];
/* a fixed knock per letter — the same every render and every export (never
   Math.random), and it doesn't move when you add a letter further on */
const KNOCK = [-4, 3, -1.5, 5, -3, 1.5, 4, -5, 2, -2.5, 3.5, -1];
const READ_LC = 35;

const lc = (fg, bg)=> Math.abs(apcaLc(fg, bg));
const same = (a, b)=> String(a).toLowerCase()===String(b).toLowerCase();
function keyOf(hex){
  const h = String(hex||'').toLowerCase();
  return FX_ACC.find(k=>FX_PAL[k]===h) || null;
}
/* an ink key → hex, or null for Auto. Poster's swatches say 'cream', Print's
   'white' — both are the studio's light neutral, the stock. */
function inkHex(k, pair){
  if(k==='ink') return pair.ink;
  if(k==='cream' || k==='white') return pair.light;
  if(FX_ACC.indexOf(k)>=0) return FX_PAL[k];
  return null;
}
/* the next ink that isn't the ground (or one already taken): the canon
   partner first; the partner map pairs pink ↔ blue, so on a pink box with a
   blue plate the walk would cycle — then the majors, then the minors */
const FALLBACK = ['blue','red','yellow','pink','amber','green','purple'];
function partnerAway(hex, avoid){
  const free = (h)=> !avoid.some(a=>same(a,h));
  const p = FX_PAL[partnerOf(keyOf(hex)||'pink')];
  if(free(p)) return p;
  return FX_PAL[FALLBACK.find(k=>free(FX_PAL[k]))];
}
const isLight = (hex)=> lc('#000000', hex) > lc('#ffffff', hex);
/* paper, cream, ink, the Night page — a ground with next to no colour in it */
function neutral(hex){
  const h = String(hex||''); if(h[0]!=='#' || h.length<7) return true;
  const c = [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  return Math.max.apply(null,c) - Math.min.apply(null,c) < 24;
}
function paletteFrom(startHex, ground){
  const k = keyOf(startHex);
  const i = Math.max(0, RUN_ORDER.indexOf(k));
  const seq = RUN_ORDER.slice(i).concat(RUN_ORDER.slice(0, i)).map(x=>FX_PAL[x]);
  return seq.filter(h=>!same(h, ground));
}
/* split a title into words and the whitespace between them, keeping both, so
   pre-wrap still breaks lines exactly where the plain title does */
function words(text){ return String(text||'').split(/(\s+)/).filter(s=>s!==''); }

/* ============================================================
   fxSpec — every decision, as numbers (em of the title size) and hex
   ============================================================ */
function fxSpec(el, ctx){
  const fx = el.titleFx;
  if(!fx || fx==='none' || !FX_USES[fx]) return null;
  const pair = ctx.pair || NEUTRALS.artwork;
  const on = (hex)=> contrastInk(hex, pair);
  const m = AMT[el.fxAmt] || 1;
  const G = ctx.ground, T = ctx.textCol;
  let A = inkHex(el.fxInk, pair) || ctx.accentHex;
  if(same(A, G)) A = partnerAway(A, [G]);
  let B = inkHex(el.fxInk2, pair) || partnerAway(A, [G, A]);
  if(same(B, G) || same(B, A)) B = partnerAway(B, [G, A]);
  const reads = (h)=> !same(h, G) && lc(h, G) >= READ_LC;
  const S = { fx, m, A, B, T, G, pair, on, over:{ l:0, t:0, r:0, b:0 } };
  const cut = (v)=> 0.75+0.25*v;     // a line weight that grows slower than the offsets

  switch(fx){
    case 'misreg': {
      const p1 = 0.07*m, p2 = 0.035*m;            // the 13 / 6 hero pair, as em at title size
      /* overprint where it means something: multiply on the paper, screen on
         the ink. On a colour box the plates print flat — a PDF blends against
         the box itself (a pink box washed blue and yellow to pastels), and
         the canvas must not promise what the file can't print. */
      const blend = neutral(G) ? (isLight(G) ? 'multiply' : 'screen') : null;
      return Object.assign(S, { p1, p2, blend, over:{ l:p2, t:p2, r:p1, b:p1 } });
    }
    case 'echo': {
      const d = 0.085*m, w = 0.024*cut(m);
      return Object.assign(S, { d, w, over:{ l:0, t:0, r:2*d+w, b:2*d+w } });
    }
    case 'slab': {
      const depth = 0.075*m, edge = 0.02*cut(m), steps = Math.max(10, Math.round(24*m));
      return Object.assign(S, { depth, edge, steps, over:{ l:0, t:0, r:depth+edge, b:depth+edge } });
    }
    case 'keyline': {
      // the key is the box's readable colour; on a fill that IS the plate ink
      // the plate already moved to the partner
      const s = 0.05*m, w = 0.024*cut(m);
      return Object.assign(S, { s, w, over:{ l:w, t:w, r:s+w, b:s+w } });
    }
    case 'sep': {
      let pool = SEP_ORDER.map(k=>FX_PAL[k]).filter(reads);
      if(pool.length<2) pool = pool.concat([T, pair.ink, pair.light].filter(h=>reads(h) && !pool.some(p=>same(p,h))));
      if(!pool.length) pool = [T];
      const last = [FX_PAL.yellow, ctx.accentHex, T].find(reads) || T;
      const nWords = words(el.text).filter(s=>!/^\s+$/.test(s)).length;
      // word i of n → its ink
      const inkAt = (i)=> (nWords>1 && i===nWords-1) ? last : pool[i % pool.length];
      return Object.assign(S, { pool, last, nWords, inkAt });
    }
    case 'tape': {
      /* Each line (each Enter) is its own bar, alternating A / B. Caps sit
         centred in a .84 line box, so even padding centres them in the bar. */
      const padV = 0.1, padH = 0.16, pr = 0.05*m, gap = pr + 0.04;
      const barAt = (i)=> i%2 ? B : A;
      return Object.assign(S, { padV, padH, pr, gap, barAt, over:{ l:0, t:0, r:pr, b:pr } });
    }
    case 'halftone': {
      /* the flat plate is what you read, so it takes the first ink that clears
         the ground. The screen is the KEY by default — the box's own text
         colour — because two mid-tone inks dotted over each other go to mud.
         A chosen second ink still takes it. */
      const flat = [A, B, T].find(reads) || T;
      const dots = el.fxInk2 ? (same(flat, A) ? B : A) : (same(flat, T) ? A : T);
      const cell = 0.075, rPct = Math.round(46 + 18*m);   // dot radius, % of the half-cell
      return Object.assign(S, { flat, dots, cell, rPct, L: ctx.lineHeight || 0.84 });
    }
    case 'run': {
      /* bands of solid extrusion, each a few hard sub-steps deep so it reads
         as a stripe, not a stack of offset copies */
      const seq = paletteFrom(A, G), bands = Math.round(3.5 + 2*m), d = 0.06, sub = 6;
      return Object.assign(S, { seq, bands, d, sub, over:{ l:0, t:0, r:d*bands, b:d*bands } });
    }
    case 'sticker': {
      /* The ticket, wrapped round the letterforms: the title die-cut out of
         the stock, ink type on it, an edge, and the hard print offset in the
         first ink (the ticket's category colour). The edge is what separates
         the stock from what it sits on — ink on any light ground, the stock
         colour on a dark one. */
      const body = 0.12*(0.7+0.3*m), edge = 0.022, s = 0.07*m;
      const edgeCol = isLight(G) ? pair.ink : pair.light;
      const R = body+edge;
      return Object.assign(S, { body, edge, s, stock:pair.light, edgeCol, letter:pair.ink,
        over:{ l:R, t:R, r:R+s, b:R+s } });
    }
    case 'slice': {
      /* strips across the whole block, cut with a hairline of paper between
         them; odd strips are the first ink and slip one way, even strips the
         key and slip the other */
      const n = Math.round(5 + 2*m), s = 0.05*m, gapPct = 0.6;
      const inkAt = (i)=> i%2 ? A : T;
      return Object.assign(S, { n, s, gapPct, inkAt, over:{ l:s, t:0, r:s, b:0 } });
    }
    case 'tiles': {
      /* each letter on a cell of the ink square, walked from the first ink;
         the letter takes the APCA side of its tile; each tile knocked off true
         by a fixed amount and printed hard in the box's text colour */
      const seq = paletteFrom(A, G), pr = 0.045, lift = Math.max(ctx.lineHeight || 0.84, 0.84);
      const tileAt = (n)=> seq[n % seq.length];
      const knockAt = (n)=> { const k = KNOCK[n % KNOCK.length]; return { deg:k*m*0.8, dy:k*m*0.006 }; };
      return Object.assign(S, { seq, pr, lift, tileAt, knockAt, padV:0.08, padH:0.07, margin:0.035, minW:0.92,
        lineGap:0.34, over:{ l:0.08, t:0.1, r:0.08+pr, b:0.1+pr } });
    }
    case 'candy': {
      /* two saturated inks in thin stripes vibrate into mud — the stripes are
         the first ink and the stock, wide; the second ink takes the print */
      const s = 0.065*m, w = 0.026*cut(m), band = 0.085*(0.8+0.2*m);
      return Object.assign(S, { s, w, band, stripeB:pair.light, angle:135, over:{ l:w, t:w, r:s+w, b:s+w } });
    }
    case 'repeat': {
      // a block apart, always: packed tighter, the outlines cross the solid
      // letters and the title stops reading. On a box the panel crops the rows.
      const rows = m<0.8 ? 1 : m<1.2 ? 2 : 3, w = 0.022;
      const inkAt = (k)=> k%2 ? A : B;
      return Object.assign(S, { rows, w, inkAt, clip:true });
    }
  }
  return null;
}

/* ============================================================
   titleFx — the SCREEN description (CSS), drawn by FxTitle
   face    style for the readable letters (on top)
   layers  copies behind the face, back → front: { dx, dy (em), style, ring }
   overlays copies over the face
   blend   mix-blend-mode for the layers
   render  () → nodes, applied to the face and every layer alike
   over    overhang in em per side, for the box padding
   clip    a box crops it (Repeat)
   ============================================================ */
function titleFx(el, ctx){
  const S = fxSpec(el, ctx);
  if(!S) return null;
  const { fx, m, A, B, T, on } = S;
  const r3 = (v)=> Math.round(v*1000)/1000;
  const em = (v)=> r3(v)+'em';
  const out = { layers:[], face:{}, over:S.over };

  if(fx==='misreg') return Object.assign(out, { blend:S.blend, layers:[
      { dx:S.p1,  dy:S.p1,  style:{ color:A } },
      { dx:-S.p2, dy:-S.p2, style:{ color:B } },
    ] });
  if(fx==='echo') return Object.assign(out, { layers:[
      { dx:2*S.d, dy:2*S.d, ring:{ w:S.w, col:B } },
      { dx:S.d,   dy:S.d,   ring:{ w:S.w, col:A } },
    ] });
  if(fx==='slab'){
    const sh = [];
    for(let i=1;i<=S.steps;i++){ const v = em(S.depth*i/S.steps); sh.push(v+' '+v+' 0 '+A); }
    const e = em(S.depth+S.edge);
    sh.push(e+' '+e+' 0 '+B);
    return Object.assign(out, { face:{ textShadow:sh.join(', ') } });
  }
  if(fx==='keyline') return Object.assign(out, { layers:[ { dx:S.s, dy:S.s, style:{ color:A } } ],
      faceRing:{ w:S.w, col:T } });
  if(fx==='sep'){
    const toks = words(el.text);
    const render = ()=>{
      let i = 0;
      return toks.map((s, k)=>{
        if(/^\s+$/.test(s)) return s;
        return <span key={k} style={{ color:S.inkAt(i++) }}>{s}</span>;
      });
    };
    return Object.assign(out, { render });
  }
  if(fx==='tape'){
    /* a block that hugs its words, at the title's own line spacing (so
       Vietnamese stacks still lift it); a long line that wraps stays one bar */
    const lines = String(el.text||'').split('\n');
    const side = el.align==='center' ? { marginInlineStart:'auto', marginInlineEnd:'auto' }
               : el.align==='right'  ? { marginInlineStart:'auto' } : null;
    const render = ()=> lines.map((ln, i)=>{
      const bar = S.barAt(i);
      return <div key={i} style={Object.assign({
          width:'fit-content', maxWidth:'100%', boxSizing:'border-box',
          background:bar, color:on(bar), padding:S.padV+'em '+S.padH+'em',
          marginBlockStart: i ? S.gap+'em' : 0,
          // the bar's print in the box's readable colour — the hard ticket offset
          boxShadow: em(S.pr)+' '+em(S.pr)+' 0 '+T,
          visibility: ln.trim()==='' ? 'hidden' : null,
        }, side)}>{ln.trim()==='' ? ' ' : ln}</div>;
    });
    return Object.assign(out, { render });
  }
  if(fx==='halftone'){
    // the fade restarts on every line: one line box of the title's own height
    const L = S.L;
    const fade = 'repeating-linear-gradient(180deg, transparent 0, transparent '+em(L*0.12)+', #000 '+em(L*0.88)+', #000 '+em(L)+')';
    return Object.assign(out, { face:{ color:S.flat },
      overlays:[{ dx:0, dy:0, style:{
        color:'transparent', WebkitTextFillColor:'transparent',
        backgroundImage:'radial-gradient(circle closest-side, '+S.dots+' 0 '+S.rPct+'%, transparent '+(S.rPct+5)+'%)',
        backgroundSize:em(S.cell)+' '+em(S.cell),
        WebkitBackgroundClip:'text', backgroundClip:'text',
        WebkitMaskImage:fade, maskImage:fade,
      } }] });
  }
  if(fx==='run'){
    const sh = [];
    for(let k=0;k<S.bands;k++) for(let j=1;j<=S.sub;j++){
      const v = em(S.d*(k + j/S.sub));
      sh.push(v+' '+v+' 0 '+S.seq[k % S.seq.length]);
    }
    return Object.assign(out, { face:{ textShadow:sh.join(', ') } });
  }
  if(fx==='sticker'){
    const R = S.body+S.edge;
    return Object.assign(out, { layers:[
        { dx:S.s, dy:S.s, ring:{ w:R, col:A, solid:true } },            // the print
        { dx:0, dy:0, ring:{ w:R, col:S.edgeCol, solid:true } },        // the edge
        { dx:0, dy:0, ring:{ w:S.body, col:S.stock, solid:true } },     // the stock
      ], face:{ color:S.letter, WebkitTextFillColor:S.letter } });
  }
  if(fx==='slice'){
    const layers = [];
    for(let i=0;i<S.n;i++){
      const top = i*100/S.n, bot = 100 - (i+1)*100/S.n;
      layers.push({ dx: i%2 ? S.s : -S.s, dy:0, style:{
        color: S.inkAt(i),
        clipPath:'inset('+r3(top + (i ? S.gapPct/2 : 0))+'% -20% '+r3(bot + (i<S.n-1 ? S.gapPct/2 : 0))+'% -20%)',
      } });
    }
    return Object.assign(out, { layers, face:{ visibility:'hidden' } });
  }
  if(fx==='tiles'){
    // words stay whole (a tile row never breaks mid-word)
    const toks = words(el.text);
    const render = ()=>{
      let n = 0;
      return toks.map((tok, ti)=>{
        if(/^\s+$/.test(tok)) return tok;
        return <span key={ti} style={{ whiteSpace:'nowrap' }}>{Array.from(tok).map((ch, ci)=>{
          const bg = S.tileAt(n), kn = S.knockAt(n);
          n++;
          return <span key={ci} style={{
            display:'inline-block', background:bg, color:on(bg),
            minWidth:S.minW+'em', textAlign:'center', lineHeight:S.lift,
            padding:S.padV+'em '+S.padH+'em', margin:'0 '+S.margin+'em',
            transform:'rotate('+r3(kn.deg)+'deg) translateY('+em(kn.dy)+')',
            boxShadow: em(S.pr)+' '+em(S.pr)+' 0 '+T,
          }}>{ch}</span>;
        })}</span>;
      });
    };
    // the tiles stand taller than the line — open the line so rows don't collide
    return Object.assign(out, { face:{ lineHeight: r3(S.lift + S.lineGap), letterSpacing:0 }, render });
  }
  if(fx==='candy'){
    const stripes = 'repeating-linear-gradient('+S.angle+'deg, '+A+' 0 '+em(S.band)+', '+S.stripeB+' '+em(S.band)+' '+em(S.band*2)+')';
    return Object.assign(out, { layers:[
        { dx:S.s, dy:S.s, style:{ color:B } },               // the hard print
        { dx:0, dy:0, ring:{ w:S.w, col:T } },               // the key line
      ], face:{
        color:'transparent', WebkitTextFillColor:'transparent',
        backgroundImage:stripes, WebkitBackgroundClip:'text', backgroundClip:'text',
      } });
  }
  if(fx==='repeat'){
    // whole copies of the block, one block-height apart — translate % is the
    // layer's own height, so the rows butt exactly at any size or line count
    const layers = [];
    for(let k=S.rows;k>=1;k--) [-1, 1].forEach(sgn=>layers.push({ ring:{ w:S.w, col:S.inkAt(k) },
      style:{ transform:'translateY('+(sgn*k*100)+'%)' } }));
    return Object.assign(out, { layers, clip:true });
  }
  return null;
}

/* A KEY LINE is drawn as a filter, not -webkit-text-stroke: Montserrat (the
   web font) is a variable font with overlapping contours, and a stroke
   traces every one of them — stray lines through B, G, N, R. Dilating the
   letters' alpha and cutting the letters back out traces the silhouette
   only, and the line sits OUTSIDE the letter, so a light weight doesn't get
   eaten. (The dilate kernel is square — hard corners on the outline, which
   is on brand.) solid: the dilated silhouette itself (Sticker's stock, edge
   and print), not the ring cut out of it. */
function RingFilter({ id, px, col, solid }){
  return (
    <filter id={id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius={px} result="fat" />
      {solid ? <feComposite in="fat" in2="fat" operator="in" result="ring" />
             : <feComposite in="fat" in2="SourceAlpha" operator="out" result="ring" />}
      <feFlood floodColor={col} />
      <feComposite in2="ring" operator="in" />
    </filter>
  );
}
/* The title's letters with an effect laid over them. `base` is the plain
   title's text style (font, size, line height, colour, align, orientation),
   so every layer wraps line-for-line with the face. */
function FxTitle({ fx, base, text, pressCss, fontSize }){
  // ids for the key-line filters — useId's colons aren't valid in url(#…)
  const fid = 'fx' + React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const content = fx.render ? fx.render() : text;
  const common = Object.assign({}, base, { textShadow:'none' });
  const rings = [];
  const ringOf = (r)=>{ const id = fid+'r'+rings.length; rings.push({ id, px:Math.max(0.5, r.w*fontSize), col:r.col, solid:!!r.solid }); return 'url(#'+id+')'; };
  const copy = (l, i, over)=>(
    <div key={(over?'o':'l')+i} aria-hidden="true" style={Object.assign({}, common, {
        position:'absolute', left:0, top:0, width:'100%', height:'100%',
        transform: (l.dx||l.dy) ? 'translate('+l.dx+'em,'+l.dy+'em)' : null,
        mixBlendMode: over ? null : (fx.blend || null),
        filter: l.ring ? ringOf(l.ring) : null,
      }, l.style)}>{content}</div>
  );
  const under = fx.layers.map((l, i)=>copy(l, i, false));
  const faceFilter = fx.faceRing ? ringOf(fx.faceRing) : null;
  const overs = (fx.overlays||[]).map((l, i)=>copy(l, i, true));
  return (
    <div style={{ position:'relative', isolation:'isolate',
                  filter: pressCss ? 'drop-shadow('+pressCss+')' : null }}>
      {rings.length>0 &&
        <svg width="0" height="0" aria-hidden="true" style={{ position:'absolute', width:0, height:0, overflow:'hidden' }}>
          {rings.map(r=><RingFilter key={r.id} {...r} />)}
        </svg>}
      {under}
      <div style={Object.assign({}, common, { position:'relative', filter:faceFilter }, fx.face)}>{content}</div>
      {overs}
    </div>
  );
}

/* the plain title's padding grown by the effect's overhang (px), as ONE
   complete shorthand — never a longhand beside it (React desyncs the pair) */
function fxPad(padding, fx, fontSize){
  const p = String(padding).split(' ').map(parseFloat);
  while(p.length<4) p.push(p[p.length-2]!=null ? p[p.length-2] : p[0]);
  const o = fx.over, s = fontSize;
  const t = p[0] + o.t*s, r = p[1] + o.r*s, b = p[2] + o.b*s, l = p[3] + o.l*s;
  return [t, r, b, l].map(v=>Math.round(v)+'px').join(' ');
}

export { TITLE_FX, FX_AMOUNTS, FX_USES, FX_HINTS, KNOCK, words, fxSpec, titleFx, FxTitle, fxPad };
