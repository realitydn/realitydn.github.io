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
];
const FX_AMOUNTS = [{ v:'subtle', l:'Subtle' }, { v:'bold', l:'Bold' }, { v:'loud', l:'Loud' }];
const AMT = { subtle:0.6, bold:1, loud:1.6 };
/* which effects use which ink, so the Inspector only offers the swatches
   that change something */
const FX_USES = {
  misreg:{ a:1, b:1 }, echo:{ a:1, b:1 }, slab:{ a:1, b:1 }, keyline:{ a:1 },
  sep:{}, tape:{ a:1, b:1 }, halftone:{ a:1, b:1 },
};
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
function RingFilter({ id, px, col }){
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius={px} result="fat" />
      <feComposite in="fat" in2="SourceAlpha" operator="out" result="ring" />
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
  const ringOf = (r)=>{ const id = fid+'r'+rings.length; rings.push({ id, px:Math.max(0.5, r.w*fontSize), col:r.col }); return 'url(#'+id+')'; };
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
