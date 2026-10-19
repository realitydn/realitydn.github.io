/* ============================================================
   REALITY POSTER STUDIO — title party effects
   For the Kinetic register (style guide §06: parties, celebrations,
   one-offs) — opt-in per title, 'none' by default, and the default path
   in the renderer doesn't touch this file, so every existing poster
   renders exactly as before.

   Each effect is a silkscreen move from the canon, not a screen effect:
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
     halftone  Halftone — letters screened in two inks, a dot plate over a
               flat one

   ---- how they meet the box (Surface) ----
   Every ink is picked against the GROUND the title actually sits on: the
   box fill (Solid = theme ink, Paper, Accent = the fill), else the page.
     · A plate never matches the ground — on an Accent box the plates move
       to the partner ink (canon partners), so they can't vanish into it.
     · Anything you READ in an ink (Separation words, the Halftone face)
       must clear APCA |Lc| 35 on that ground — display size at poster
       range — or it steps to the next ink, then to the box's own text
       colour. So yellow drops out on cream, purple on ink.
     · Tape bars carry their own text by the APCA rule (contrastInk).
     · On a box, the padding grows by the effect's overhang so plates stay
       inside the border instead of crossing it. A bare title keeps its
       geometry; its press shadow moves to a drop-shadow on the whole
       group, so the plates are shadowed as one print.
   All offsets are in em — they scale with the title through every
   format and the Story boost, and preview = export.
   ============================================================ */
import { PALETTE as FX_PAL, ACCENTS as FX_ACC, themeColors as fxTheme, contrastInk as fxOn } from '../studio-data.jsx';
import { partnerOf, apcaLc } from '../../studio-shared/brand.js';

const TITLE_FX = [
  { v:'none',     l:'None' },
  { v:'misreg',   l:'Misregister', t:'Two plates slip opposite ways behind the letters and overprint where they cross' },
  { v:'echo',     l:'Echo',        t:'Two key-line pulls step out behind the word — Poster Echo, held still' },
  { v:'slab',     l:'Slab',        t:'A hard solid extrusion in the first ink, edged in the second' },
  { v:'keyline',  l:'Key line',    t:'Hollow letters, the fill plate slipped off register beneath' },
  { v:'sep',      l:'Separation',  t:'Every word its own ink — Kinetic Headline, printed' },
  { v:'tape',     l:'Tape',        t:'Each line on its own ink bar, alternating the two inks' },
  { v:'halftone', l:'Halftone',    t:'Letters screened in two inks — a dot plate over a flat one' },
  /* the LOUD row — the same moves pushed until they own the poster. For the
     one-offs; each one is a whole look, not a garnish. */
  { v:'run',      l:'Colour run',  loud:1, t:'A long solid extrusion banded through the whole palette' },
  { v:'sticker',  l:'Sticker',     loud:1, t:'The title die-cut as a cream ticket — ink edge, hard print in the first ink' },
  { v:'slice',    l:'Slice',       loud:1, t:'The title cut into strips that slip sideways, alternating the key and the first ink' },
  { v:'tiles',    l:'Tiles',       loud:1, t:'Every letter on its own ink-square tile, knocked a little off true' },
  { v:'candy',    l:'Candy',       loud:1, t:'Letters striped in two inks, a key line round them and a hard print under' },
  { v:'repeat',   l:'Repeat',      loud:1, t:'The title printed again above and below as key lines — a wall of it' },
];
const FX_AMOUNTS = [{ v:'subtle', l:'Subtle' }, { v:'bold', l:'Bold' }, { v:'loud', l:'Loud' }];
const AMT = { subtle:0.6, bold:1, loud:1.6 };
/* which effects use which ink, so the Inspector only offers the swatches
   that change something */
const FX_USES = {
  misreg:{ a:1, b:1 }, echo:{ a:1, b:1 }, slab:{ a:1, b:1 }, keyline:{ a:1 },
  sep:{}, tape:{ a:1, b:1 }, halftone:{ a:1, b:1 },
  run:{ a:1 }, sticker:{ a:1 }, slice:{ a:1 }, tiles:{ a:1 }, candy:{ a:1, b:1 }, repeat:{ a:1, b:1 },
};
/* The palette as a run — the ink square's order (the red · blue · yellow
   quadrants, then pink · purple · amber) with green closing it. Colour run and
   Tiles walk it from the first ink, skipping whatever the box is. */
const RUN_ORDER = ['red','blue','yellow','pink','purple','amber','green'];
function paletteFrom(startHex, ground){
  const k = keyOf(startHex);
  const i = Math.max(0, RUN_ORDER.indexOf(k));
  const seq = RUN_ORDER.slice(i).concat(RUN_ORDER.slice(0, i)).map(x=>FX_PAL[x]);
  return seq.filter(h=>!same(h, ground));
}
/* a fixed knock per letter — the same every render and every export (never
   Math.random), and it doesn't move when you add a letter further on */
const KNOCK = [-4, 3, -1.5, 5, -3, 1.5, 4, -5, 2, -2.5, 3.5, -1];
/* Kinetic Headline's order: red, blue, amber crash in; the last word lands on
   yellow. The rest of the palette follows so a long title has somewhere to go. */
const SEP_ORDER = ['red','blue','amber','pink','green','purple'];
const READ_LC = 35;

const lc = (fg, bg)=> Math.abs(apcaLc(fg, bg));
const same = (a, b)=> String(a).toLowerCase()===String(b).toLowerCase();
function keyOf(hex){
  const h = String(hex||'').toLowerCase();
  return FX_ACC.find(k=>FX_PAL[k]===h) || null;
}
/* an ink key ('red', 'ink', 'cream', 'fg'/null = auto) → hex, or null for auto */
function inkHex(k){
  if(k==='ink'||k==='cream'||FX_ACC.indexOf(k)>=0) return FX_PAL[k];
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

/* What the title sits on. A bare / outlined / scrimmed title reads the page —
   over a photo that's an estimate, but it's the same one Auto text makes. */
function groundOf(surface, theme, accentHex){
  const t = fxTheme(theme);
  if(surface==='solid')  return t.fg;
  if(surface==='paper')  return t.paper;
  if(surface==='accent') return accentHex;
  return t.bg;
}
const isLight = (hex)=> lc('#000000', hex) > lc('#ffffff', hex);

/* The two plate inks, resolved against the ground and each other. */
function fxInks(el, ctx){
  const G = ctx.ground;
  let A = inkHex(el.fxInk) || ctx.accentHex;
  if(same(A, G)) A = partnerAway(A, [G]);
  let B = inkHex(el.fxInk2) || partnerAway(A, [G, A]);
  if(same(B, G) || same(B, A)) B = partnerAway(B, [G, A]);
  return { A, B };
}

/* split a title into words and the whitespace between them, keeping both, so
   pre-wrap still breaks lines exactly where the plain title does */
function words(text){ return String(text||'').split(/(\s+)/).filter(s=>s!==''); }

/* ---- the effect, as data the renderer lays out ----
   face    style for the readable letters (on top)
   layers  copies behind the face, back → front: { dx, dy (em), style }
   blend   mix-blend-mode for the layers
   render  (text) → nodes, applied to the face and every layer alike
   over    overhang in em per side, for the box padding
   lh      a line-height floor (Tape's bars need the room)
   ownShadow the face draws its own text-shadow (Slab) — the press shadow
           still rides the group as a drop-shadow */
function titleFx(el, ctx){
  const fx = el.titleFx;
  if(!fx || fx==='none' || !FX_USES[fx]) return null;
  const m = AMT[el.fxAmt] || 1;
  const G = ctx.ground, T = ctx.textCol;
  const { A, B } = fxInks(el, ctx);
  const r3 = (v)=> Math.round(v*1000)/1000;
  const em = (v)=> r3(v)+'em';

  if(fx==='misreg'){
    const p1 = 0.07*m, p2 = 0.035*m;            // the 13 / 6 hero pair, as em at title size
    return { layers:[
        { dx:p1,  dy:p1,  style:{ color:A } },
        { dx:-p2, dy:-p2, style:{ color:B } },
      ], blend: isLight(G) ? 'multiply' : 'screen',
      face:{}, over:{ l:p2, t:p2, r:p1, b:p1 } };
  }
  if(fx==='echo'){
    const d = 0.085*m, w = 0.024*(0.75+0.25*m);
    return { layers:[
        { dx:2*d, dy:2*d, ring:{ w, col:B } },
        { dx:d,   dy:d,   ring:{ w, col:A } },
      ], face:{}, over:{ l:0, t:0, r:2*d+w, b:2*d+w } };
  }
  if(fx==='slab'){
    const depth = 0.075*m, edge = 0.02*(0.75+0.25*m);
    const steps = Math.max(10, Math.round(24*m));
    const sh = [];
    for(let i=1;i<=steps;i++){ const v = em(depth*i/steps); sh.push(v+' '+v+' 0 '+A); }
    const e = em(depth+edge);
    sh.push(e+' '+e+' 0 '+B);
    return { layers:[], face:{ textShadow:sh.join(', ') }, ownShadow:true,
      over:{ l:0, t:0, r:depth+edge, b:depth+edge } };
  }
  if(fx==='keyline'){
    const s = 0.05*m, w = 0.024*(0.75+0.25*m);
    // the key is the box's readable colour; on a fill that IS the plate ink
    // the plate already moved to the partner (fxInks)
    return { layers:[ { dx:s, dy:s, style:{ color:A } } ],
      face:{}, faceRing:{ w, col:T },
      over:{ l:w, t:w, r:s+w, b:s+w } };
  }
  if(fx==='sep'){
    const readable = (h)=> !same(h, G) && lc(h, G) >= READ_LC;
    let pool = SEP_ORDER.map(k=>FX_PAL[k]).filter(readable);
    if(pool.length<2) pool = pool.concat([T, FX_PAL.ink, FX_PAL.cream].filter(h=>readable(h) && !pool.some(p=>same(p,h))));
    if(!pool.length) pool = [T];
    const last = [FX_PAL.yellow, ctx.accentHex, T].find(readable) || T;
    const toks = words(el.text);
    const nWords = toks.filter(s=>!/^\s+$/.test(s)).length;
    const render = ()=>{
      let i = 0;
      return toks.map((s, k)=>{
        if(/^\s+$/.test(s)) return s;
        const col = (nWords>1 && i===nWords-1) ? last : pool[i % pool.length];
        i++;
        return <span key={k} style={{ color:col }}>{s}</span>;
      });
    };
    return { layers:[], face:{}, render, over:{ l:0, t:0, r:0, b:0 } };
  }
  if(fx==='tape'){
    /* Each line (each Enter) is its own bar: a block that hugs its words, at
       the title's own line spacing (so Vietnamese stacks still lift it), and
       a long line that wraps stays one bar. Caps sit centred in a .84 line
       box, so even padding centres them in the bar. */
    const padV = 0.1, padH = 0.16, pr = 0.05*m, gap = pr + 0.04;
    const lines = String(el.text||'').split('\n');
    const side = el.align==='center' ? { marginInlineStart:'auto', marginInlineEnd:'auto' }
               : el.align==='right'  ? { marginInlineStart:'auto' } : null;
    const render = ()=> lines.map((ln, i)=>{
      const bar = i%2 ? B : A;
      return <div key={i} style={Object.assign({
          width:'fit-content', maxWidth:'100%', boxSizing:'border-box',
          background:bar, color:fxOn(bar), padding:padV+'em '+padH+'em',
          marginBlockStart: i ? gap+'em' : 0,
          // the bar's print in the box's readable colour — the hard ticket offset
          boxShadow: em(pr)+' '+em(pr)+' 0 '+T,
          visibility: ln.trim()==='' ? 'hidden' : null,
        }, side)}>{ln.trim()==='' ? ' ' : ln}</div>;
    });
    return { layers:[], face:{}, render,
      over:{ l:0, t:0, r:pr, b:pr } };
  }
  if(fx==='halftone'){
    /* A flat plate you read, and a dot screen over it in the other ink that
       comes in down the letters — the riso gradient. The flat plate takes the
       first ink that clears the ground; the dots take the other. */
    const reads = (h)=> !same(h, G) && lc(h, G) >= READ_LC;
    const flat = [A, B, T].find(reads) || T;
    /* the screen is the KEY by default — the box's own text colour, ink on a
       light ground and cream on a dark one — because two mid-tone inks dotted
       over each other go to mud. A chosen second ink still takes it. */
    const dots = el.fxInk2 ? (same(flat, A) ? B : A) : (same(flat, T) ? A : T);
    const cell = 0.075, r = Math.round(46 + 18*m);   // dot radius, % of the half-cell
    // the fade restarts on every line: one line box of the title's own height
    const L = ctx.lineHeight || 0.84;
    const fade = 'repeating-linear-gradient(180deg, transparent 0, transparent '+em(L*0.12)+', #000 '+em(L*0.88)+', #000 '+em(L)+')';
    return { layers:[], face:{ color:flat },
      overlays:[{ dx:0, dy:0, style:{
        color:'transparent', WebkitTextFillColor:'transparent',
        backgroundImage:'radial-gradient(circle closest-side, '+dots+' 0 '+r+'%, transparent '+(r+5)+'%)',
        backgroundSize:em(cell)+' '+em(cell),
        WebkitBackgroundClip:'text', backgroundClip:'text',
        WebkitMaskImage:fade, maskImage:fade,
      } }],
      over:{ l:0, t:0, r:0, b:0 } };
  }

  /* ================= LOUD ================= */
  if(fx==='run'){
    /* bands of solid extrusion, each a few hard sub-steps deep so it reads as
       a stripe, not a stack of offset copies */
    const seq = paletteFrom(A, G), bands = Math.round(3.5 + 2*m), d = 0.06, sub = 6;
    const sh = [];
    for(let k=0;k<bands;k++) for(let j=1;j<=sub;j++){
      const v = em(d*(k + j/sub));
      sh.push(v+' '+v+' 0 '+seq[k % seq.length]);
    }
    const depth = d*bands;
    return { layers:[], face:{ textShadow:sh.join(', ') }, over:{ l:0, t:0, r:depth, b:depth } };
  }
  if(fx==='sticker'){
    /* The ticket, wrapped round the letterforms: the title die-cut out of
       cream stock, ink type on it, a 2px-scale ink edge, and the hard print
       offset in the first ink (the ticket's category colour). Cream in both
       themes, like every ticket. */
    const body = 0.12*(0.7+0.3*m), edge = 0.022, s = 0.07*m;
    const CREAM = FX_PAL.cream, INK = FX_PAL.ink;
    // the edge is what separates the stock from what it sits on — ink on any
    // light ground (a cream box at Night too), cream on a dark one
    const edgeCol = isLight(G) ? INK : CREAM;
    return { layers:[
        { dx:s, dy:s, ring:{ w:body+edge, col:A, solid:true } },      // the print
        { dx:0, dy:0, ring:{ w:body+edge, col:edgeCol, solid:true } }, // the edge
        { dx:0, dy:0, ring:{ w:body, col:CREAM, solid:true } },        // the stock
      ], face:{ color:INK, WebkitTextFillColor:INK },
      over:{ l:body+edge, t:body+edge, r:body+edge+s, b:body+edge+s } };
  }
  if(fx==='slice'){
    /* strips across the whole block, cut with a hairline of paper between
       them; odd strips are the first ink and slip one way, even strips the key
       and slip the other. The face keeps the layout and isn't drawn. */
    const n = Math.round(5 + 2*m), s = 0.05*m, gap = 0.6;
    const layers = [];
    for(let i=0;i<n;i++){
      const top = i*100/n, bot = 100 - (i+1)*100/n;
      layers.push({ dx: i%2 ? s : -s, dy:0, style:{
        color: i%2 ? A : T,
        clipPath:'inset('+r3(top + (i ? gap/2 : 0))+'% -20% '+r3(bot + (i<n-1 ? gap/2 : 0))+'% -20%)',
      } });
    }
    return { layers, face:{ visibility:'hidden' }, over:{ l:s, t:0, r:s, b:0 } };
  }
  if(fx==='tiles'){
    /* each letter on a cell of the ink square, walked from the first ink;
       the letter takes the APCA side of its tile; each tile knocked off true
       by a fixed amount and printed hard in the box's text colour. Words stay
       whole (a tile row never breaks mid-word). */
    const seq = paletteFrom(A, G);
    const pr = 0.045, lift = Math.max(ctx.lineHeight || 0.84, 0.84);
    const toks = words(el.text);
    const render = ()=>{
      let n = 0;
      return toks.map((tok, ti)=>{
        if(/^\s+$/.test(tok)) return tok;
        return <span key={ti} style={{ whiteSpace:'nowrap' }}>{Array.from(tok).map((ch, ci)=>{
          const bg = seq[n % seq.length], kn = KNOCK[n % KNOCK.length];
          n++;
          return <span key={ci} style={{
            display:'inline-block', background:bg, color:fxOn(bg),
            minWidth:'0.92em', textAlign:'center', lineHeight:lift,
            padding:'0.08em 0.07em', margin:'0 0.035em',
            transform:'rotate('+r3(kn*m*0.8)+'deg) translateY('+em(kn*m*0.006)+')',
            boxShadow: em(pr)+' '+em(pr)+' 0 '+T,
          }}>{ch}</span>;
        })}</span>;
      });
    };
    // the tiles stand taller than the line — open the line so rows don't collide
    return { layers:[], face:{ lineHeight: r3(lift + 0.34), letterSpacing:0 }, render,
      over:{ l:0.08, t:0.1, r:0.08+pr, b:0.1+pr } };
  }
  if(fx==='candy'){
    /* two saturated inks in thin stripes vibrate into mud — the stripes are
       the first ink and cream stock, wide; the second ink takes the print */
    const s = 0.065*m, w = 0.026*(0.75+0.25*m), band = 0.085*(0.8+0.2*m);
    const stripes = 'repeating-linear-gradient(135deg, '+A+' 0 '+em(band)+', '+FX_PAL.cream+' '+em(band)+' '+em(band*2)+')';
    return { layers:[
        { dx:s, dy:s, style:{ color:B } },                 // the hard print
        { dx:0, dy:0, ring:{ w, col:T } },                 // the key line
      ], face:{
        color:'transparent', WebkitTextFillColor:'transparent',
        backgroundImage:stripes, WebkitBackgroundClip:'text', backgroundClip:'text',
      }, over:{ l:w, t:w, r:s+w, b:s+w } };
  }
  if(fx==='repeat'){
    // whole copies of the block, one block-height apart — translate % is the
    // layer's own height, so the rows butt exactly at any size or line count
    const rows = m<0.8 ? 1 : m<1.2 ? 2 : 3, w = 0.022;
    // a block apart, always: packed tighter, the outlines cross the solid
    // letters and the title stops reading. On a box the panel crops the rows.
    const step = 100;
    const layers = [];
    for(let k=rows;k>=1;k--) [-1, 1].forEach(sgn=>layers.push({ ring:{ w, col: k%2 ? A : B },
      style:{ transform:'translateY('+(sgn*k*step)+'%)' } }));
    return { layers, face:{}, clip:true, over:{ l:0, t:0, r:0, b:0 } };
  }
  return null;
}

/* The title's letters with an effect laid over them. `base` is the plain
   title's text style (font, size, line height, colour, align, orientation),
   so every layer wraps line-for-line with the face. */
/* A KEY LINE is drawn as a filter, not -webkit-text-stroke: Montserrat is a
   variable font with overlapping contours, and a stroke traces every one of
   them — stray lines through B, G, N, R. Dilating the letters' alpha and
   cutting the letters back out traces the silhouette only, and the line sits
   OUTSIDE the letter, so a light weight doesn't get eaten. (The dilate kernel
   is square — hard corners on the outline, which is on brand.) */
/* solid: the dilated silhouette itself (Sticker's stock, edge and print),
   not the ring cut out of it */
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
   complete shorthand — see sePad for why never a longhand beside it */
function fxPad(padding, fx, fontSize){
  const p = String(padding).split(' ').map(parseFloat);
  const o = fx.over, s = fontSize;
  const t = p[0] + o.t*s, r = p[1] + o.r*s, b = p[2] + o.b*s, l = p[3] + o.l*s;
  return [t, r, b, l].map(v=>Math.round(v)+'px').join(' ');
}

export { TITLE_FX, FX_AMOUNTS, FX_USES, titleFx, groundOf, FxTitle, fxPad };
