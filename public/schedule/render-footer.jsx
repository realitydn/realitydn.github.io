/* ============================================================
   REALITY SCHEDULE STUDIO — render · footer atoms and the QR
   The shared layout kernel, part 4: legend, support note, address
   line, the QR block with its ink square, the carousel arrow chip,
   and the carousel footer at each density.
   ============================================================ */
import { R_LUM, ThemeCtx, RED, channelById, GEOM, CAROUSEL_QR } from './render-config.jsx';
import { CREAM as R_CREAM, GROT as R_GROT, INK as R_INK, INK_MARK as R_INK_MARK, MONT as R_MONT,
  QR_LABEL as R_QR_LABEL, QR_LABEL_SHORT as R_QR_LABEL_SHORT, qrPatternOf as R_QR_PATTERN,
  QUIET_SPEC as R_QUIET_SPEC, QUIET_TIGHT as R_QUIET_TIGHT, SchInkMark as RInkMark, SchQR as RQR } from './schedule-data.jsx';

/* ---- footer atoms ---- */
function LegendBlock({ legend, font, stacked }){
  const T = React.useContext(ThemeCtx);
  if(!legend.locations.length && !legend.flags.length) return null;
  const item = (k, v, i)=>(
    <div key={i} style={{ fontFamily:R_GROT, fontSize:font, lineHeight:1.55, color:T.fg }}>
      <span style={{ fontWeight:600 }}>{k}</span>
      <span style={{ color:T.dim }}>{' : ' + v}</span>
    </div>
  );
  if(stacked) return (
    <div>{legend.locations.map((l,i)=>item(l.code, l.label, 'l'+i))}
      {legend.flags.map((f,i)=>item(f.glyph, f.label, 'f'+i))}</div>
  );
  return (
    <div style={{ display:'flex', gap:font*2.6 }}>
      <div>{legend.locations.map((l,i)=>item(l.code, l.label, i))}</div>
      <div>{legend.flags.map((f,i)=>item(f.glyph, f.label, i))}</div>
    </div>
  );
}
function LegendLine({ legend, font }){
  const T = React.useContext(ThemeCtx);
  if(!legend.locations.length && !legend.flags.length) return null;
  const bits = legend.locations.map(l=>l.code+' '+l.label)
    .concat(legend.flags.map(f=>f.glyph+' '+f.label.replace('Requires ','').replace('Has ','').replace(' Beyond Purchase','')));
  return (
    <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font, color:T.dim, lineHeight:1.5 }}>
      {bits.join('  ·  ')}
    </div>
  );
}
function SupportNote({ text, font, maxW, plain }){
  const T = React.useContext(ThemeCtx);
  if(plain) return (
    <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font, lineHeight:1.45, color:T.dim,
      maxWidth:maxW, textAlign:'center' }}>{text}</div>
  );
  return (
    <div style={{ border:'2.5px dashed '+RED, padding:font*0.85, maxWidth:maxW,
      fontFamily:R_GROT, fontWeight:500, fontSize:font, lineHeight:1.5, color:T.fg, textAlign:'center' }}>{text}</div>
  );
}
/* nowrap: the footer is a flex row, and once the QR block gained its caption
   the address started breaking after "ĐÀ". As a flex item with the default
   min-width:auto, nowrap makes the string its own minimum, so the row gives up
   gap instead of splitting the address. */
function MetaLine({ font }){
  const T = React.useContext(ThemeCtx);
  return (
    <div style={{ fontFamily:R_MONT, fontWeight:600, fontSize:font, letterSpacing:'.07em',
      textTransform:'uppercase', color:T.fg, whiteSpace:'nowrap' }}>
      realitydn.com<span style={{ fontWeight:500, opacity:.72 }}>{' · '}86 Mai Thúc Lân, Đà Nẵng</span>
    </div>
  );
}
/* The QR and its caption. The code targets app.realitydn.com — a weekly
   listing's natural partner is the LIVE version of itself, where every event
   has a detail page and a printed sheet from Monday still resolves to
   Thursday's changes — so it earns a word telling people what they get.

   The caption is sized to the block rather than fixed, because this code turns
   up in footers ranging from a story card to a stamp-sized grid cell: the full
   sentence under a large code, the short form under a middling one, and
   nothing at all below ~52px, where any caption would be sub-legible and the
   bare code reads better than a smudge. Pass label={false} to force it off. */
function QRBlock({ size, label, align, boxW }){
  const T = React.useContext(ThemeCtx);
  const txt = label===false ? null
            : size >= 76 ? (label || R_QR_LABEL)
            : size >= 52 ? R_QR_LABEL_SHORT
            : null;
  const ta = align==='flex-end' ? 'right' : align==='flex-start' ? 'left' : 'center';
  /* boxW pins the block to a known width so a caller can reserve exactly that
     much elsewhere — the carousel footer puts an invisible spacer of the same
     width on the opposite side, which keeps its centred column optically
     centred while the QR rides the margin. */
  const w = boxW || null;
  /* The canon square rides the QR — the poster's footer rule, applied here:
     square-anchored (its ink cell takes the outer corner, so it needs no
     ground on any substrate), butted FLUSH against the code with no rule
     between, because the QR's own quiet zone IS the gap.

     The square always matches the code's visible PATTERN. What changes with
     the palette is how much cream sits around that pattern: a QR's light
     modules must stay light or it will not scan, so on Day / Press / Paper —
     light grounds — the quiet zone takes the sheet colour and disappears, and
     the spec's 4 modules cost nothing. On Night and Carbon the zone has to be
     real cream, and 4 modules would draw a slab a third wider than the
     pattern, outweighing the square beside it; there it tightens to 2 — a
     close safe area that still reads as deliberate margin.

     Below the floor the square is dropped entirely: four modules under 6px
     print as mud. */
  const lightGround = R_LUM(T.bg) > 0.5;
  const qrLight = lightGround ? T.bg : R_CREAM;
  const qrQuiet = lightGround ? R_QUIET_SPEC : R_QUIET_TIGHT;
  const sqM = R_QR_PATTERN(size, qrQuiet)/4;
  const sq = sqM >= R_INK_MARK.floors.square;
  return (
    <div style={{ flex:'none', width:w, display:'flex', flexDirection:'column',
      alignItems:align||'center', gap:Math.round(size*0.07) }}>
      <div style={{ display:'flex', alignItems:'center' }}>
        <RQR size={size} dark={R_INK} light={qrLight} quiet={qrQuiet} />
        {sq ? <RInkMark form="square-anchored" mode="full" m={sqM} /> : null}
      </div>
      {txt ? <div style={{ fontFamily:R_GROT, fontWeight:600,
        fontSize:Math.max(8.5, Math.round(size*0.115)), lineHeight:1.25, color:T.dim,
        maxWidth:w || size*1.9, textAlign:ta }}>{txt}</div> : null}
    </div>
  );
}
function ArrowChip({ dir, size }){
  const T = React.useContext(ThemeCtx);
  const fwd = dir==='fwd';
  return (
    <div style={{ width:size, height:size*0.7, background:T.fg, boxShadow:T.shadowSm,
      display:'flex', alignItems:'center', justifyContent:'center', boxSizing:'border-box',
      opacity: fwd ? 1 : 0.92 }}>
      <svg viewBox="0 0 24 24" width={size*0.46} height={size*0.46} style={{ display:'block',
        transform:fwd?'none':'scaleX(-1)' }}>
        <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke={T.bg} strokeWidth="2.6" />
      </svg>
    </div>
  );
}
/* final-part footer at a given density */

function CarouselFooter({ doc, channel, legend, denIdx }){
  const T = React.useContext(ThemeCtx);
  const g = GEOM[channel];
  const s = g.fs || 1;
  /* The QR sits in the footer's left/right MARGIN, beside the centred stack,
     not beneath it — so on a feed card it adds no height at all: the support
     note and meta line are already taller than the code. Feed and Stories had
     no QR whatsoever before this; only the A4 print sheet carried one, which
     meant the app link never reached the three social channels. */
  const qs = Math.round((CAROUSEL_QR[denIdx]||0) * s);
  const qrW = qs ? Math.round(qs*1.5) : 0;
  const withQR = (stack) => qs
    ? <div style={{ display:'flex', alignItems:'center', gap:16*s, width:'100%' }}>
        <div style={{ width:qrW, flex:'none' }} aria-hidden="true" />
        <div style={{ flex:'1 1 auto', minWidth:0, display:'flex', flexDirection:'column',
          gap:stack.gap, alignItems:'center' }}>{stack.children}</div>
        <QRBlock size={qs} boxW={qrW} />
      </div>
    : <div style={{ display:'flex', flexDirection:'column', gap:stack.gap, alignItems:'center' }}>{stack.children}</div>;
  if(denIdx===0) return (
    <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:g.footPad*0.5, paddingTop:g.footPad,
      display:'flex', flexDirection:'column', alignItems:'center' }}>
      {withQR({ gap:20*s, children:<React.Fragment>
        <LegendBlock legend={legend} font={18*s} />
        {doc.footer.supportNote && <SupportNote text={doc.footer.supportText} font={18*s} maxW={(channelById(channel).w-g.pad*2-qrW*2)*0.86} />}
        <MetaLine font={17*s} />
      </React.Fragment> })}
    </div>
  );
  if(denIdx===1) return (
    <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:g.footPad*0.4, paddingTop:g.footPad*0.7,
      display:'flex', flexDirection:'column', alignItems:'center' }}>
      {withQR({ gap:12*s, children:<React.Fragment>
        <LegendLine legend={legend} font={15*s} />
        {doc.footer.supportNote && <SupportNote plain text={doc.footer.supportText} font={14*s} maxW={(channelById(channel).w-g.pad*2-qrW*2)*0.92} />}
        <MetaLine font={16*s} />
      </React.Fragment> })}
    </div>
  );
  return (
    <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:g.footPad*0.4, paddingTop:g.footPad*0.7,
      display:'flex', flexDirection:'column', gap:10*s, alignItems:'center' }}>
      <LegendLine legend={legend} font={14*s} />
      <MetaLine font={15*s} />
    </div>
  );
}

export { LegendBlock, LegendLine, SupportNote, MetaLine, QRBlock, ArrowChip, CarouselFooter };
