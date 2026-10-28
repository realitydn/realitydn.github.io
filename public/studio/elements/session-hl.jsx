/* ============================================================
   REALITY POSTER STUDIO — the Sessions highlight
   One row of a schedule dressed to be found first: the headliner, the
   costume contest, the one you mustn't miss. A line that starts with "!"
   is highlighted (parseSessions → hl); el.hlFx says how. Nothing here runs
   unless a row is marked, so every existing list renders as before.

   Two rows of styles:
   ROW   — the row itself is dressed, the type stays plain
     band     the row on a solid ink bar, text by the APCA rule, hard print
     ticket   the row on the stock with an edge and a hard print in the ink
     outline  a key-line box in the first ink, printed hard in the second
     pointer  an ink arrow points at it and the title takes the ink
   PARTY — the title's own party effects (studio-shared/title-fx.jsx), on
     the row's title. Tape, Tiles and Repeat are left out: they stack bars,
     tiles and copies taller than a row has room for.

   Inks come from the SAME fxSpec the title uses, so a highlighted row
   picks against its box exactly like a title on that box would: a plate
   that matches the fill moves to its partner. Offsets are em of the
   row's title size, so they scale with Row size and the Story boost.
   ============================================================ */
import { TITLE_FX, FX_USES, fxSpec, titleFx, FxTitle } from './title-fx.jsx';
import { apcaLc } from '../../studio-shared/brand.js';

const HL_ROW = [
  { v:'band',    l:'Band',    t:'The row on a solid ink bar, printed hard' },
  { v:'ticket',  l:'Ticket',  t:'The row on the stock with an edge — the ticket, as a row' },
  { v:'outline', l:'Outline', t:'A key-line box round the row, printed hard in the second ink' },
  { v:'pointer', l:'Pointer', t:'An ink arrow points at the row; its title takes the ink' },
];
const HL_PARTY_KEYS = ['misreg','echo','slab','keyline','sep','halftone','run','sticker','slice','candy'];
const HL_PARTY = TITLE_FX.filter(x=>HL_PARTY_KEYS.indexOf(x.v)>=0);
const HL_SCALES = [{ v:1, l:'Same' }, { v:1.2, l:'Up' }, { v:1.45, l:'Big' }];
const HL_DEF = 'band', HL_SCALE_DEF = 1.2;
const HL_USES = Object.assign({ band:{ a:1 }, ticket:{ a:1 }, outline:{ a:1, b:1 }, pointer:{ a:1 } }, FX_USES);
const HL_HINTS = {
  band:    'The row on a bar of the first ink — the text takes the readable side — with a hard print in the box’s text colour.',
  ticket:  'The row cut from the stock: ink type, an edge, and a hard print in the first ink. Reads on any photo.',
  outline: 'A key-line box in the first ink, printed hard in the second. The type stays as it is.',
  pointer: 'An arrow in the first ink, and the title in it too where it reads on the box.',
};

const hlKind = (el)=> el.hlFx || HL_DEF;
const hlScale = (el)=> el.hlScale!=null ? el.hlScale : HL_SCALE_DEF;

/* one row's highlight → what the renderer applies.
   ctx = { ground, accentHex, textCol }, fs = the row title size (px)
     scale  — the title size multiplier (applied by the caller, before fs)
     row    — extra style on the row
     color  — the title's colour, when the style sets one
     lead   — a node before the title (the pointer)
     title  — (text, base) → the title node, for the party styles */
function sessionHl(el, ctx, fs, text){
  const kind = hlKind(el);
  const party = HL_PARTY_KEYS.indexOf(kind)>=0;
  const pseudo = { titleFx: party ? kind : 'tape', fxAmt:el.hlAmt, fxInk:el.hlInk, fxInk2:el.hlInk2, text, align:'left' };
  const fctx = { ground:ctx.ground, accentHex:ctx.accentHex, textCol:ctx.textCol, lineHeight:1 };
  const S = fxSpec(pseudo, fctx);
  if(!S) return null;
  const { m, A, B, T, G, on, pair } = S;
  const px = (v)=> Math.round(v*fs*10)/10;
  /* a dressed row keeps its text on the other rows' line: the bar grows
     out past the column by its own padding */
  const padH = px(0.3), padV = px(0.14), pr = Math.max(2, px(0.07*m));
  const slab = (bg, extra)=> Object.assign({ background:bg, marginInline:-padH, paddingInline:padH,
    paddingBlock:padV, marginBlock:Math.round(pr/2)+'px '+pr+'px', boxShadow:pr+'px '+pr+'px 0 '+T, borderTop:'none' }, extra);

  if(kind==='band')   return { row:slab(A, { color:on(A) }) };
  if(kind==='ticket'){
    const light = Math.abs(apcaLc('#000000', G)) > Math.abs(apcaLc('#ffffff', G));
    return { row:slab(pair.light, { color:pair.ink, boxShadow:pr+'px '+pr+'px 0 '+A,
      outline:Math.max(1.5, px(0.035))+'px solid '+(light ? pair.ink : pair.light), outlineOffset:0 }) };
  }
  if(kind==='outline') return { row:slab('transparent', { boxShadow:'inset 0 0 0 '+Math.max(2, px(0.06))+'px '+A+', '+pr+'px '+pr+'px 0 '+B }) };
  if(kind==='pointer'){
    const reads = Math.abs(apcaLc(A, G)) >= 35;
    const w = px(0.62);
    return { color: reads ? A : null,
      lead: <svg aria-hidden="true" width={w} height={w} viewBox="0 0 10 10" style={{ flex:'none', marginTop:px(0.19), marginRight:px(0.1) }}>
              <path d="M0 0 L10 5 L0 10 Z" fill={A} /></svg> };
  }
  // party — the title's effect, its overhang held as padding so the plates stay off the next row
  const fx = titleFx(pseudo, fctx);
  if(!fx) return null;
  const o = fx.over;
  return { title:(base)=>(
    <div style={{ padding:[o.t, o.r, o.b, o.l].map(v=>px(v)+'px').join(' ') }}>
      <FxTitle fx={fx} base={base} text={text} fontSize={fs} />
    </div>) };
}

export { HL_ROW, HL_PARTY, HL_SCALES, HL_USES, HL_HINTS, HL_DEF, HL_SCALE_DEF, hlKind, hlScale, sessionHl };
