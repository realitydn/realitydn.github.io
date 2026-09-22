/* ============================================================
   REALITY POSTER STUDIO — Element renderer (per type)
   Exports: StudioElement
   The text families render here (tools/verify-day-colours.mjs reads their
   tracking, fact type and ticket straight out of this file). The photo press
   and the graphic families are ./elements/ (photo.jsx, graphics.jsx) over the
   shared style helpers (style.js); they are re-exported below as before.
   ============================================================ */
import {
  PALETTE as SE_PAL, ACCENTS as SE_ACC, themeColors as seTheme, surfaceStyle as seSurf,
  QRGlyph as SEQR, textInsetModel, shadowModel, relLuminance, QUIET_TIGHT, QUIET_SPEC, INK_MARK,
  qrPatternOf, parseSessions, DAY_NAMES, DAY_ABBR, ACCENT_BY_DAY, contrastInk,
} from './studio-data.jsx';
import { MONT, ALT, GROT } from '../studio-shared/brand.js';
import { qrTarget, qrMatrix } from '../studio-shared/qr.js';
import { WordmarkSVG } from '../studio-shared/wordmark.jsx';
import { EM } from '../studio-shared/util.js';
import { seResolve, seShadowCss, sePad, seColAlign, seRowAlign, seShadow } from './elements/style.js';
import {
  loadCachedImage, getSample, SE_DAY_INK, posterDayOf, risoSig, photoSources, drawPhotoPress, PhotoEl,
} from './elements/photo.jsx';
import { BlockEl, ShapeEl, IconEl, RuleEl, BurstEl, InkmarkEl, TicketInkMark } from './elements/graphics.jsx';

/* ---- FACT type — the 5+6 merge, in one place -------------------------
   Canon (reality-ds.css .type-fact-far · decision M1 "family wins"):
   Montserrat NAMES things, Space Grotesk STATES facts, and the family does
   NOT change with the medium — at range only the size and weight rise
   (500 → 700). Poster surfaces are FAR, so every fact here runs at 700.

   Takes: times, prices, dates, room names, capacities, set times, the
   day·time and cost chips. Does NOT take: event names, headings, host
   names, taglines, buttons, eyebrows — those stay Montserrat.

   Grotesk is never uppercased (M3), so nothing here sets text-transform;
   tabular figures keep a column of times or prices in true alignment.
   `letterSpacing` is 0 by definition — the optical ladder is Montserrat's,
   derived from its wide geometric caps, and spraying it across Grotesk's
   narrower lowercase is exactly what the merge forbids. */
/* ---- THE TRACKING LADDER, in one place ---------------------------------
   reality-ds.css / reality-tokens.json, baked per ROLE — no size-derived
   formula, no per-component taste:
       display .015 · h1 .025 · h2 .04 · name 0 · label .16 · button .11
   Grotesk (facts, body) is always 0: the ladder was derived from Montserrat's
   wide geometric caps and means nothing on Grotesk's lowercase.

   Screen artwork carries the BARE ladder. The +.01em print offset belongs to
   Print Studio and must never appear in this file.

   Before this pass the ladder had been applied to the six DEFAULTS the
   verifier checks and to nothing else, so the renderers carried FOURTEEN
   distinct hardcoded numbers — .2 on the host kicker, .24 on the matchup
   kicker, .18 on two list headings, .14, .12, .1, .08, .06, .03 … Every one
   of those is a label or a heading that should have been on a rung.
   verify-day-colours.mjs §TYPE now fails the build on any off-ladder literal
   in here, so it cannot drift back. */
const TRACK = { display:0.015, h1:0.025, h2:0.04, name:0, label:0.16, button:0.11, fact:0 };

const FACT = (size, extra) => Object.assign({
  fontFamily:GROT, fontWeight:700, letterSpacing:0, fontSize:size,
  fontVariantNumeric:'tabular-nums'
}, extra||{});


/* ---- Vietnamese capitals need their headroom ---------------------------
   Titles set uppercase at line-height .84 — tight on purpose, for Latin caps
   (cap height .70). Vietnamese puts a mark over the capital, and stacks a tone
   mark ON a circumflex or breve: measured in Montserrat 800, Á/Ô rise to .91em
   and Ấ Ổ Ỗ Ẵ to .99–1.08em — straight through the bottom of the line above.
   So the renderer reads the text and lifts the EFFECTIVE line height when it
   has to: 1.08 under a stacked capital, .94 under a single mark. The saved
   value is never touched — take the accents out and the title closes back up
   to exactly what was set. Horn (Ơ Ư) and dot-below (Ạ) add no height above
   the cap, so they don't count. */
const VI_ABOVE = /[̀́̂̃̆̉]/;   // grave acute circumflex tilde breve hook-above
const VI_MARK  = /[̀-ͯ]/;
function viLineHeight(text, lh){
  const s = String(text||'');
  if(!s || !/[^\x00-\x7f]/.test(s)) return lh;          // plain ASCII — the common case, no work
  let floor = 0, above = 0;
  for(const ch of s.toUpperCase().normalize('NFD')){
    if(VI_ABOVE.test(ch)){ above++; floor = Math.max(floor, above>=2 ? 1.08 : 0.94); if(floor>=1.08) break; }
    else if(!VI_MARK.test(ch)) above = 0;                // a new base letter
  }
  return floor > lh ? floor : lh;
}
/* The title's line height as it actually renders — its set value (or the .84
   default) lifted for Vietnamese stacks. The canvas editor and the Inspector
   read the same number, so none of the three disagree. */
function titleLineHeight(el){
  const lh = el && el.lineHeight!=null ? el.lineHeight : 0.84;
  return viLineHeight(el && el.text, lh);
}

/* Largest Montserrat-800 size at which `text` (uppercased) fits `availW`, capped
   at maxSize. Measured for real (not estimated) so a match-up's two team names
   share one size and neither spills its box, whatever their length. */
const _seMeasCtx = (typeof document!=='undefined') ? document.createElement('canvas').getContext('2d') : null;
function seFitText(text, availW, maxSize){
  const s = String(text||'').toUpperCase();
  if(!_seMeasCtx || !s) return maxSize;
  _seMeasCtx.font = "800 "+maxSize+"px 'Montserrat', Montserrat, sans-serif";
  const w = _seMeasCtx.measureText(s).width || 1;
  return w <= availW ? maxSize : Math.max(14, Math.floor(maxSize * availW / w));
}

/* ---- lightweight markdown for the Info text box ----
   inline **bold** / *italic* / _italic_, and lines starting with - or • → bullets.
   Returns React nodes; pure text passes straight through. */
function mdInline(s, kb){
  const nodes=[]; const re=/(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_)/g; let m,last=0,k=0;
  while((m=re.exec(s))){
    if(m.index>last) nodes.push(s.slice(last,m.index));
    if(m[2]!=null) nodes.push(React.createElement('strong',{key:kb+'b'+(k++)}, m[2]));
    else nodes.push(React.createElement('em',{key:kb+'i'+(k++)}, m[3]!=null?m[3]:m[4]));
    last=re.lastIndex;
  }
  if(last<s.length) nodes.push(s.slice(last));
  return nodes.length?nodes:s;
}
function renderRich(text){
  const lines=(text||'').split('\n'); const out=[]; let bullets=null, k=0;
  const flush=()=>{ if(bullets){ out.push(React.createElement('ul',{key:'ul'+(k++),style:{margin:'0.15em 0 0.15em 1.1em',padding:0}}, bullets)); bullets=null; } };
  lines.forEach((ln,idx)=>{
    const b=ln.match(/^\s*[-•]\s+(.*)$/);
    if(b){ (bullets||(bullets=[])).push(React.createElement('li',{key:'li'+idx,style:{margin:'0.12em 0'}}, mdInline(b[1],idx+'-'))); }
    else { flush();
      if(ln.trim()==='') out.push(React.createElement('div',{key:'sp'+idx,style:{height:'0.55em'}}));
      else out.push(React.createElement('div',{key:'p'+idx}, mdInline(ln,idx+'-')));
    }
  });
  flush();
  return out;
}


function StudioElement({ el, theme, posterAccentHex, posterAccent, posterDay, selected, dragging, onElPointerDown, exporting }){
  const t = seTheme(theme);
  // Two independent colour roles, each falling back to the legacy single
  // `color` when its own field is unset — so older docs/templates render
  // unchanged:
  //   fill  → an Accent surface's block colour + accent highlights (kickers,
  //           headings, badge word). 'fg' (Auto) resolves to the poster accent.
  //   text  → the main text colour. 'fg' (Auto) follows the surface's own
  //           contrast colour, so text on a filled block always stays readable.
  const accentHex = seResolve(el.fill!=null?el.fill:el.color, posterAccentHex);
  const surf = seSurf(el.surface, theme, accentHex, true);
  const textCol = seResolve(el.textColor!=null?el.textColor:el.color, surf.color);
  /* host "hosted by" kicker gets its own colour, defaulting to the accent so
     existing posters are unchanged — its own control, separate from the fill. */
  const kickerHex = seResolve(el.kickerColor!=null?el.kickerColor:'fg', accentHex);
  /* 9:16 Story boost: elements with fixed internal type multiply it by B so the
     text grows in step with the (already-scaled) box. el.fontSize-driven text is
     scaled upstream in resolveElements, so it never reads B (no double-scale). */
  const B = el._boost||1;

  if(el.type==='photo' || el.type==='logo'){
    /* Day colour: the linked event's weekday, at that colour's own density.
       Resolved here exactly as the Inspector shows it, so the canvas and the
       strip never disagree. */
    const dayInk = (el.followDay && posterDay) ? SE_DAY_INK[posterDay] : null;
    const inkKey = dayInk ? dayInk.ink : (el.followAccent ? (posterAccent||'pink') : (el.ink||'pink'));
    const inkDensity = dayInk ? (dayInk.inkDensity||1) : undefined;
    const pwrap = {
      position:'absolute', left:0, top:0, width:el.w+'px', height:el.h+'px',
      transform:`translate(${el.x}px,${el.y}px) rotate(${el.rot||0}deg)`, transformOrigin:'center center',
      /* NO transition during export: html-to-image reads COMPUTED transforms, and a
         format-flip capture racing this 160ms glide bakes the PREVIOUS format's
         positions into the render (the 2026-07 mixed-layout square1x1 bug). */
      transition: (dragging || exporting) ? 'none' : 'transform .16s cubic-bezier(0.2,1.4,0.45,1)',
      cursor: dragging ? 'grabbing' : 'grab', userSelect:'none', touchAction:'none', boxSizing:'border-box'
    };
    const inner = (el.type==='logo' && !el.src && !exporting)
      ? <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4,
          border:`2px dashed ${seTheme(theme).shadow(0.45)}`, borderRadius:8, boxSizing:'border-box', padding:8,
          fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:EM(TRACK.label), fontSize:12, color:seTheme(theme).shadow(0.7), textAlign:'center' }}>
          <span>Partner logo</span><span style={{ fontWeight:600, fontSize:10, opacity:.8 }}>upload a PNG →</span>
        </div>
      : <PhotoEl el={el} theme={theme} inkKey={inkKey} inkDensity={inkDensity} selected={selected} exporting={exporting} />;
    return <Wrap el={el} wrap={pwrap} sel={selected} onDown={onElPointerDown}>{inner}</Wrap>;
  }

  const wrap = {
    position:'absolute', left:0, top:0,
    width:el.w + 'px', height:el.h + 'px',
    transform:`translate(${el.x}px,${el.y}px) rotate(${el.rot||0}deg)`,
    transformOrigin:'center center',
    /* transition off while exporting — same capture-race guard as the photo wrap above */
    transition: (dragging || exporting) ? 'none' : 'transform .16s cubic-bezier(0.2,1.4,0.45,1)',
    cursor: dragging ? 'grabbing' : 'grab',
    userSelect:'none', WebkitUserSelect:'none', touchAction:'none', boxSizing:'border-box'
  };

  if(el.type==='block'){
    // accentHex already resolved el.fill (Auto → the poster accent)
    return <Wrap el={el} wrap={wrap} sel={selected} onDown={onElPointerDown}>
      <BlockEl el={el} theme={theme} fillHex={accentHex} exporting={exporting} />
    </Wrap>;
  }
  if(el.type==='inkmark'){
    // fixed-palette canon mark — never recoloured by the poster accent
    return <Wrap el={el} wrap={wrap} sel={selected} onDown={onElPointerDown}>
      <InkmarkEl el={el} theme={theme} />
    </Wrap>;
  }
  /* graphical family — same accentHex resolution as the block, so Auto fill
     follows the poster accent (and therefore the day) for all of them. */
  if(el.type==='shape'){
    return <Wrap el={el} wrap={wrap} sel={selected} onDown={onElPointerDown}>
      <ShapeEl el={el} theme={theme} fillHex={accentHex} exporting={exporting} />
    </Wrap>;
  }
  if(el.type==='icon'){
    return <Wrap el={el} wrap={wrap} sel={selected} onDown={onElPointerDown}>
      <IconEl el={el} theme={theme} fillHex={accentHex} />
    </Wrap>;
  }
  if(el.type==='rule'){
    return <Wrap el={el} wrap={wrap} sel={selected} onDown={onElPointerDown}>
      <RuleEl el={el} theme={theme} fillHex={accentHex} />
    </Wrap>;
  }
  if(el.type==='burst'){
    return <Wrap el={el} wrap={wrap} sel={selected} onDown={onElPointerDown}>
      <BurstEl el={el} theme={theme} fillHex={accentHex} />
    </Wrap>;
  }
  /* Unified shadow for the text / surface family (everything below). A bare
     element shadows its letters (text-shadow, inherited by the children); a
     surfaced one shadows its card (box-shadow, overriding the surface's default).
     Defaults reproduce the old press shadow — see shadowModel. */
  const _sm = shadowModel(el, theme);
  const _shCss = seShadowCss(_sm, theme);
  const autoBox  = _sm.mode==='box'  ? (_shCss||'none') : 'none';
  const autoText = _sm.mode==='text' ? (_shCss||'none') : 'none';

  /* textAlign rides the container for every text element — it inherits, so a
     heading, a chip line or a list row all follow one dial. Two-column rows
     (name…time) are flex, so they keep their columns by design. */
  const box = (extra)=>Object.assign({
    width:'100%', height:'100%', boxSizing:'border-box', overflow:'hidden',
    display:'flex', flexDirection:'column', justifyContent:'center'
  }, surf, { color:textCol, boxShadow:autoBox, textShadow:autoText },
     { textAlign: textInsetModel(el).align }, extra);

  let inner = null;

  if(el.type==='title'){
    // The Surface control now applies to the title too: 'none' = bare floating
    // text (with the drop shadow); any other surface wraps it in that block.
    const bare = !el.surface || el.surface==='none';
    /* Shadow comes from the one shadowModel: a bare title shadows its letters
       (text-shadow), a surfaced one shadows its card (box-shadow, applied on the
       container below). Defaults match the old behaviour exactly. */
    const tShadow = autoText;
    /* optional subtitle, stacked inside the title box. Spacing preset sets the
       gap (relative to the title size, so it stays natural at any scale) or
       pins the two to the box edges (split). */
    const hasSub = el.subtitle && String(el.subtitle).trim();
    const split = el.subLayout==='split';
    const gapMap = { tight:0.04, snug:0.16, roomy:0.36 };
    const subGap = (hasSub && !split) ? Math.round(el.fontSize * (gapMap[el.subLayout]!=null?gapMap[el.subLayout]:0.16)) : 0;
    const colAlign = el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start';
    const container = Object.assign({
      width:'100%', height:'100%', display:'flex', flexDirection:'column', boxSizing:'border-box',
      alignItems: colAlign, justifyContent: split ? 'space-between' : 'center'
    }, bare ? {} : Object.assign({}, surf, { boxShadow:autoBox }), sePad(el, bare?0:16));
    inner = (
      <div style={container}>
        <div style={{
          fontFamily:MONT, fontWeight:el.weight, textTransform:'uppercase',
          fontSize:el.fontSize+'px', lineHeight:titleLineHeight(el),   // .84, lifted under Vietnamese stacks
          letterSpacing: EM(el.letterSpacing!=null?el.letterSpacing:TRACK.display),
          color:textCol, textAlign:el.align,
          writingMode: el.orient==='v'?'vertical-rl':'horizontal-tb',
          textShadow: tShadow,
          whiteSpace:'pre-wrap', textWrap:'balance'
        }}>{el.text}</div>
        {hasSub && <div style={{
          fontFamily:MONT, fontWeight:el.subWeight||600, textTransform:'uppercase',
          fontSize:((el.subSize!=null?el.subSize:30)*B)+'px', lineHeight:1.15, marginTop:subGap,
          letterSpacing:EM(el.subTracking!=null?el.subTracking:TRACK.h1),
          color: seResolve(el.subColor!=null?el.subColor:'fg', textCol), textAlign:el.align,
          whiteSpace:'pre-wrap', textWrap:'balance'
        }}>{el.subtitle}</div>}
      </div>
    );
    return <Wrap el={el} wrap={wrap} sel={selected} onDown={onElPointerDown}>{inner}</Wrap>;
  }

  if(el.type==='tagline'){
    inner = <div style={box(sePad(el, 14))}>
      <div style={{ fontFamily:GROT, fontWeight:el.weight, fontSize:el.fontSize+'px', lineHeight:1.25, letterSpacing:(el.letterSpacing!=null?el.letterSpacing:0)+'em', color:textCol, textAlign:el.align,
        writingMode: el.orient==='v'?'vertical-rl':'horizontal-tb' }}>{el.text}</div>
    </div>;
  }
  else if(el.type==='info'){
    inner = <div style={box(Object.assign({ justifyContent:'flex-start' }, sePad(el, 16)))}>
      <div style={{ width:'100%', fontFamily:GROT, fontWeight:el.weight||400, fontSize:el.fontSize+'px',
        lineHeight:(el.lineHeight!=null?el.lineHeight:1.4), letterSpacing:(el.letterSpacing!=null?el.letterSpacing:0)+'em',
        color:textCol, textAlign:el.align||'left' }}>
        {renderRich(el.text)}
      </div>
    </div>;
  }
  else if(el.type==='when' || el.type==='cost'){
    /* The cost chip is the day·time chip's twin — same accent tag, price text.
       Both are FACTS, so both are Space Grotesk (canon M1, "family wins over
       distance"): the family never changes with the medium, only the size and
       weight rise at range, which is why these sit at 700 rather than the
       near-surface 500. Tabular figures keep a column of chips aligned.

       They were tracked Montserrat caps at .16em — the label role — which is
       the single most visible edit in the whole 5+6 merge. Caps are reserved
       for things you press or things that label; a time is neither. Grotesk
       is never uppercased (M3), so no text-transform: the chip renders the
       string as typed, and "Thu · 19:00" is the house form. */
    inner = <div style={box(Object.assign({ alignItems:'center' }, sePad(el, 10)))}>
      <div style={{ fontFamily:GROT, fontWeight:el.weight||700, letterSpacing:(el.letterSpacing!=null?el.letterSpacing:0)+'em', fontSize:el.fontSize+'px', color:textCol, width:'100%', fontVariantNumeric:'tabular-nums' }}>{el.text}</div>
    </div>;
  }
  else if(el.type==='host'){
    inner = <div style={box(Object.assign({ alignItems: el.align==='left'?'flex-start':el.align==='right'?'flex-end':'center' }, sePad(el, 18)))}>
      {/* The credit lead-in — "Hosted by", "With", "On the decks" — is INFO,
          not an eyebrow. It reads as a sentence that the name completes, so it
          takes Grotesk like every other fact on the poster rather than
          Montserrat's tracked caps. Ruled 23.08: the generic rule puts
          eyebrows in Montserrat because caps there are a SIGNAL ("this is a
          label, not reading matter"), and this line is the opposite — it IS
          reading matter, the first half of "Hosted by / Speaker Name".

          Grotesk is never uppercased (M3), so no text-transform: the string
          renders as typed, which is why every template and default already
          carries it in sentence case.

          The NAME is Grotesk too (24.08). The whole credit is one piece of
          information — "Hosted by Speaker Name" — and splitting it across two
          families made the lead-in read as a caption bolted onto a heading
          rather than the opening of a sentence. It loses its caps with the
          family, which also honours M4: a performer's own capitalisation
          survives instead of being flattened to a shout.

          Sizing: the lead-in is 0.6 of the name, up from 0.38. Two things were
          wrong with 0.38. It was already too quiet — and caps tracked at .16em
          carry far more optical width than the same string set lowercase at
          0em, so keeping the ratio through the family change shrank it a
          second time. 0.5 only bought back the old appearance; 0.6 is the size
          it should have been. The gap and both line-heights derive from the
          name too — 6px under a 12px lead-in was what made the pair look
          scrunched, and Grotesk's descenders need more room than the .95 an
          all-caps Montserrat name could get away with. */}
      {el.kicker && <div style={FACT(Math.round(el.fontSize*0.6)+'px', { color:kickerHex, lineHeight:1.3, marginBottom:Math.round(el.fontSize*0.32) })}>{el.kicker}</div>}
      <div style={FACT(el.fontSize+'px', { fontWeight:el.weight, letterSpacing:EM(el.letterSpacing!=null?el.letterSpacing:TRACK.name), lineHeight:1.1, color:textCol, textAlign:el.align })}>{el.name}</div>
    </div>;
  }
  else if(el.type==='ticket'){
    /* A QR must be DARK-ON-LIGHT. The band's own colours were being handed
       straight to it, so a night-theme ticket — whose paper surface is
       #171109 — rendered the code inverted: cream modules on near-black. Most
       phone cameras decode that, plenty of scanner apps do not, and it is
       outside the spec on artwork that gets printed.

       So: light bands keep using the band colour, which makes the quiet zone
       invisible and costs nothing. Dark bands get a real cream code with a
       TIGHT safe area — 2 modules instead of 4 — so the tile is a close frame
       around the pattern rather than a slab that outweighs the ink square
       beside it. */
    const bandBg = surf.background==='transparent'? t.paper : surf.background;
    const bandIsDark = relLuminance(bandBg) < 0.5;
    const qrLight = bandIsDark ? '#fffbf1' : bandBg;
    const qrDark  = bandIsDark ? '#0d0905' : surf.color;
    const qrQuiet = bandIsDark ? QUIET_TIGHT : QUIET_SPEC;
    /* The code encodes the ticket's OWN Website field — qrTarget turns the
       printed bare host into the URL a phone opens — so editing the site
       changes the code, not just the caption. qrN is its module count (25 for
       the site URL), which the pattern maths below needs. */
    const qrText = qrTarget(el.site);
    const qrN = (qrMatrix(qrText)||[]).length || 25;
    /* Ink mark on the ticket — DEFAULT ON (an absent prop = on): the ticket
       is the brand carrier, so every saved poster and every template gains
       the mark on next open. Canon (ink-strip.json + the poster exception):
       the poster carries the strip while its footer QR carries the SQUARE —
       4 modules matching the QR's rendered height (module = height/4),
       butted FLUSH against the QR's box on its outer side; the QR's own
       quiet zone is the gap, no rule between. square-anchored puts ink on
       the outer corner, so it needs no ground on any substrate — its stock
       cells print the same cream (#fffbf1) the QR block already prints,
       on paper and on the ink band alike. Without a QR, a short strip
       (majors) takes the band's trailing end at module ≈ band height/4,
       floors + fit caps respected — grounded per the print rule (G2) on
       paper-like surfaces, bare on an ink/accent band where stock reads as
       printed cream. */
    const markOn = el.mark!=='off';
    /* markForm — 'auto' keeps the classic pairing (the square rides the QR;
       a short strip takes the bare band); 'square' / 'strip' (7×2) /
       'strip-long' (9×2 full strip) force one form, on BOTH variants.
       markMode recolours (full / majors / ink); ABSENT keeps each form's
       classic ink (square full · strip majors) so saved posters render
       unchanged. Mirrored on Print Studio's footer — change both or drift. */
    const markForm = el.markForm||'auto';
    const squareMark = markForm==='square' || (markForm==='auto' && !!el.showQR);
    const markMode = el.markMode || (squareMark ? 'full' : 'majors');
    /* FULL 9×2 strip by default. 'auto' and 'strip' both used to resolve to
       the 7×2 short form, so in practice the ticket only ever drew the
       truncated mark; the full one needed the explicit 'strip-long' chip that
       nobody reached for. The short form is now what it should always have
       been — the fallback for a band too narrow to hold nine cells at the
       floor module — and `markForm:'strip'` still means short for any doc
       that asked for it. */
    const stripForm = markForm==='strip' ? 'strip-short-h' : 'strip-h';
    /* Ground OFF on the ticket band, like the placed mark. It was grounded on
       every substrate except solid/accent, which is why a paper ticket — the
       default — always carried a paper-shade mat under its strip. */
    const stripGrounded = false;
    const stripCells = stripForm==='strip-h' ? 9 : 7;
    const stripCols = stripCells + (stripGrounded?2:0), stripRows = 2 + (stripGrounded?2:0);
    const stripFloor = INK_MARK.floors[stripForm==='strip-h' ? 'strip' : 'short'];
    /* width cap: tighter when the strip shares the band with a QR, a little
       roomier for the 9×2 full strip — the centred text column never collides. */
    const stripWFrac = el.showQR ? 0.24 : (stripForm==='strip-h' ? 0.34 : 0.28);
    const stripModule = (availH)=> Math.max(stripFloor,
      Math.min(Math.round(el.h/4), Math.floor(availH/stripRows), Math.floor(el.w*stripWFrac/stripCols)));
    const stripEl = (m)=> <TicketInkMark form={stripForm} mode={markMode} m={m} grounded={stripGrounded} theme={theme} />;
    /* the square is ALWAYS square-anchored — its ink cell takes the outer
       corner in every mode (full → anchoredField; majors/ink → f3 is ink), so
       it needs no ground on any band. Flush with the QR when one is shown
       (module = QR height/4, the quiet zone is the gap); standalone it sizes
       to the band height. */
    const squareEl = (m)=> <TicketInkMark form="square-anchored" mode={markMode} m={m} grounded={false} theme={theme} />;
    const sqModule = (availH)=> Math.max(INK_MARK.floors.square, Math.floor(availH/4));
    /* The flush square is sized off the QR's PATTERN, not its tile. A QR tile
       is 25 data modules inside a 4-module quiet zone per side, so only ~76%
       of the box it occupies is ink — match the boxes and the solid square
       reads a third heavier than the code beside it. Measuring against the
       pattern is also what the canon line means by "4 modules matching the
       QR's rendered height": the two marks now read at one size, and the
       quiet zone IS the gap between them, exactly as specified. */
    const qrBlock = (qs)=> (
      <div style={{ flex:'none', display:'flex', alignItems:'center' }}>
        <SEQR size={qs} dark={qrDark} light={qrLight} quiet={qrQuiet} text={qrText} />
        {markOn && squareMark && squareEl(qrPatternOf(qs, qrQuiet, qrN)/4)}
      </div>
    );
    if(el.variant==='banner'){
      /* Full-width band — a stacked wordmark + site·address column on one
         side, the mark block (QR, ink square, strip) on the other. The
         serious, bookish bottom for talks.

         ALIGNMENT is a real composition dial here, not just text-align: the
         column follows `align` (banner default RIGHT — ticketAlignDef) and
         the mark block takes the OPPOSITE edge, so the two can never collide
         and the band reads the same at every setting. Centre keeps the column
         centred with the mark trailing, which is how the banner always looked.

         The QR used to sit INSIDE the column, below the address, at a fixed
         92px — which made a QR banner a three-row stack and left the QR
         visibly smaller than a standalone ink square on the same band. Both
         marks now fill the band interior off the same expression, so a QR
         banner and a square banner carry the same weight.

         Whichever side it lands on, the mark block reserves its width in that
         side's padding so the column can never slide under it — and the
         padding stays ONE shorthand (the longhand/shorthand desync trap). */
      const tim = textInsetModel(el);
      const padL = tim.side==='left' ? tim.val : tim.def;
      const padR = tim.side==='right' ? tim.val : tim.def;
      const vPad = 30;
      const bandH = Math.max(24, el.h - vPad*2);
      /* one size for every mark on the band: the QR, the square flush beside
         it, and a standalone square are all `4 × sqModule(bandH)`. */
      const qs  = el.showQR ? 4*sqModule(bandH) : 0;
      const stripOn  = markOn && !squareMark;
      const sqSideOn = markOn && squareMark && !el.showQR;
      const bm  = stripOn  ? stripModule(bandH) : 0;
      const sqm = sqSideOn ? sqModule(bandH) : 0;
      /* block width = strip (if forced) + QR + its flush square, or whichever
         single mark is showing. The 14px gap matches the row variants'. */
      const markW = (stripOn ? stripCols*bm : 0)
                  + (el.showQR ? qs + (markOn && squareMark ? qrPatternOf(qs, qrQuiet, qrN) : 0) : 0)
                  + (stripOn && el.showQR ? 14 : 0)
                  + (sqSideOn ? 4*sqm : 0);
      const reserve = markW ? markW + 26 : 0;
      /* column right → mark left; column left or centred → mark right */
      const markLeft = tim.align==='right';
      const bannerPad = { padding: markLeft
        ? vPad+'px '+padR+'px '+vPad+'px '+(padL+reserve)+'px'
        : vPad+'px '+(padR+reserve)+'px '+vPad+'px '+padL+'px' };
      const markBox = { position:'absolute', top:'50%', transform:'translateY(-50%)',
        display:'flex', alignItems:'center', gap:14 };
      markBox[markLeft?'left':'right'] = markLeft ? padL : padR;
      inner = <div style={box(Object.assign({ flexDirection:'column', alignItems:seColAlign(el), justifyContent:'center', gap:16 }, bannerPad))}>
        <WordmarkSVG height={64*B} color={textCol} />
        <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:EM(TRACK.label), fontSize:18*B, color:textCol, textAlign:tim.align }}>
          {el.site}{el.addr? <span style={FACT(15*B, { fontWeight:500, opacity:.72, textTransform:'none' })}>{'  ·  '+el.addr}</span> : null}
        </div>
        {markW>0 && <div style={markBox}>
          {stripOn ? stripEl(bm) : null}
          {el.showQR ? qrBlock(qs) : (sqSideOn ? squareEl(sqm) : null)}
        </div>}
      </div>;
    } else {
      const wmH = (el.variant==='mini'?38 : el.variant==='slim'?44 : 50) * B;
      inner = <div style={box(Object.assign({ flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:22 }, sePad(el, 22)))}>
        <WordmarkSVG height={wmH} color={textCol} />
        {/* nowrap so the address stays ONE line. As a flex item with the default
            min-width:auto, nowrap makes the string its own minimum — the row
            gives up gap before it breaks "86 Mai Thúc Lân · Đà Nẵng" across two
            lines, which is what happened once the QR grew to fill the band. */}
        <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:EM(TRACK.button), fontSize:18*B, lineHeight:1.5, color:textCol, whiteSpace:'nowrap', textAlign:'center' }}>
          {el.site}{(el.addr && el.variant!=='mini')? <span style={FACT(14*B, { display:'block', fontWeight:500, opacity:.72, textTransform:'none' })}>{el.addr}</span> : null}
        </div>
        {/* el.h-56 = the band interior (2×22 padding + borders) so a 4-module
            mark never clips on the card edge. The QR fills that SAME interior
            — it used to sit at a fixed 108px while a standalone square filled
            the band, so the two marks read at different weights on an
            identical ticket. One expression, one size. */}
        {el.showQR
          ? <div style={{ flex:'none', display:'flex', alignItems:'center', gap:14 }}>
              {markOn && !squareMark && stripEl(stripModule(el.h-44))}
              {qrBlock(4*sqModule(el.h-56))}
            </div>
          : (markOn ? (squareMark ? squareEl(sqModule(el.h-56)) : stripEl(stripModule(el.h-44))) : null)}
      </div>;
    }
  }
  else if(el.type==='lineup'){
    /* Row type auto-fits the box (rowSize 0) or takes an S/M/L override — parity
       with sessions. The headliner (row 0) and the set times derive from it. */
    const lpAvail = el.h/B - 36 - (el.heading?26:0);
    const lpBase = el.rowSize || Math.max(13, Math.min(22, Math.floor(lpAvail/Math.max(1,el.items.length)) - 10));
    const lpName1 = Math.round(lpBase*1.24), lpTime = Math.max(11, Math.round(lpBase*0.62));
    inner = <div style={box(Object.assign({ justifyContent:'flex-start' }, sePad(el, 18)))}>
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:EM(TRACK.label), fontSize:(el.headingSize!=null?el.headingSize:15)*B, color:accentHex, marginBottom:10 }}>{el.heading}</div>
      {el.items.map((it,i)=>(
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:16,
          borderTop:i? `1.5px solid ${seSurf('outline',theme,accentHex).color}33` : 'none', padding:(el.rowGap!=null?el.rowGap:7)+'px 0',
          fontFamily:MONT, fontWeight:el.rowWeight||700, textTransform:'uppercase' }}>
          <span style={{ fontSize: (i===0?lpName1:lpBase)*B, color: i===0?accentHex:'inherit', letterSpacing:EM(el.rowTracking!=null?el.rowTracking:TRACK.name) }}>{it.n}</span>
          {/* set time = fact → Grotesk; the artist name beside it stays Montserrat */}
          <span style={FACT(lpTime*B, { textTransform:'none', opacity:.72 })}>{it.t}</span>
        </div>
      ))}
    </div>;
  }
  else if(el.type==='sessions'){
    /* Series / schedule — rows parsed live into typed cells (date·time·num·title
       + an optional trailing category marker). The layout ADAPTS to richness:
       a plain "title — date" list stays single-line; once any row carries a time
       or a category marker the rows go two-line (headline big, date·time·num
       muted beneath) with colour-coded category dots + a legend. */
    const rowGap = el.rowGap!=null?el.rowGap:7;
    const rowWt  = el.rowWeight||700;
    const rowTr  = EM(el.rowTracking!=null?el.rowTracking:TRACK.name);
    const headFs = (el.headingSize!=null?el.headingSize:15)*B;
    const items  = parseSessions(el.raw);
    const markers = items.reduce((a,r)=>{ if(r.marker && a.indexOf(r.marker)<0) a.push(r.marker); return a; }, []);
    const rich = markers.length>0 || items.some(r=>r.time);
    /* category colour/name: explicit markerKey wins, else a default accent per
       marker in order of first appearance. */
    const DEFCAT = ['blue','green','pink','amber','purple','red','yellow'];
    const catColor = m => { const k=el.markerKey&&el.markerKey[m]; const c=(k&&k.color)||DEFCAT[markers.indexOf(m)%7];
      return SE_PAL[c] ? SE_PAL[c] : accentHex; };   // any palette key incl. ink/cream neutrals
    const catName = m => { const k=el.markerKey&&el.markerKey[m]; return (k&&k.name&&k.name.trim()) || m; };
    const headH = el.heading ? headFs+13 : 0;
    const legendH = (rich && markers.length) ? 26 : 0;
    const avail = el.h/B - 32 - headH - legendH;
    const heading = el.heading ? <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:EM(TRACK.label), fontSize:headFs, color:accentHex, marginBottom:10 }}>{el.heading}</div> : null;
    const legend = (rich && markers.length) ? <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 18px', marginTop:10 }}>
      {markers.map(m=>{ const ms=Math.max(8,Math.round((rich?20:18)*B*0.5));
        return <span key={m} style={{ display:'flex', alignItems:'center', gap:6, fontFamily:MONT, fontWeight:700, textTransform:'uppercase', fontSize:Math.max(11,12*B), letterSpacing:EM(TRACK.label) }}>
          <span style={{ width:ms, height:ms, borderRadius:'50%', background:catColor(m), flex:'none' }} />{catName(m)}</span>; })}
    </div> : null;

    if(rich){
      const auto = Math.max(14, Math.min(40, Math.round((avail/Math.max(1,items.length) - 2*rowGap)/1.55)));
      const fs = (el.rowSize || auto) * B;
      const metaFs = Math.max(10, Math.round(fs*0.52));
      const dot = Math.max(8, Math.round(fs*0.34));
      inner = <div style={box(Object.assign({ justifyContent:'flex-start' }, sePad(el, 18)))}>
        {heading}
        {items.map((it,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:Math.round(dot*0.8),
            borderTop:i? `1.5px solid ${seSurf('outline',theme,accentHex).color}22` : 'none', padding:rowGap+'px 0' }}>
            {markers.length ? <span aria-hidden="true" style={{ width:dot, height:dot, borderRadius:'50%', flex:'none',
              background: it.marker?catColor(it.marker):'transparent', border: it.marker?'none':`1.5px solid ${seSurf('outline',theme,accentHex).color}55`,
              marginTop:Math.round(fs*0.26) }} /> : null}
            <div style={{ flex:'1 1 auto', minWidth:0 }}>
              <div style={{ fontFamily:MONT, fontWeight:rowWt, textTransform:'uppercase', fontSize:fs, lineHeight:1.0, letterSpacing:rowTr }}>{it.title}</div>
              {/* the whole meta line is facts — number, date, time → Grotesk.
                  600 rather than the far-fact 700: it sits under a headline as
                  supporting detail, and the row above already carries weight. */}
              {(it.date||it.time||it.num) ? <div style={FACT(metaFs, { fontWeight:600, textTransform:'none', opacity:.66, marginTop:Math.round(fs*0.1) })}>
                {[it.num, it.date, it.time].filter(Boolean).join('  ·  ')}</div> : null}
            </div>
          </div>
        ))}
        {legend}
        {!items.length && !exporting &&
          <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:EM(TRACK.label), fontSize:14*B, opacity:.4 }}>Paste the list in the panel →</div>}
      </div>;
    } else {
      const auto = Math.max(13, Math.min(26, Math.floor(avail/Math.max(1,items.length)) - 15));
      const fs = (el.rowSize || auto) * B;
      const sub = Math.max(11, Math.round(fs*0.62));
      inner = <div style={box(Object.assign({ justifyContent:'flex-start' }, sePad(el, 18)))}>
        {heading}
        {items.map((it,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'baseline', gap:14,
            borderTop:i? `1.5px solid ${seSurf('outline',theme,accentHex).color}33` : 'none', padding:rowGap+'px 0',
            fontFamily:MONT, fontWeight:rowWt, textTransform:'uppercase' }}>
            {/* the row inherits Montserrat caps for the TITLE (a name); the
                number and the date are facts and opt out into Grotesk. */}
            {it.num ? <span style={FACT(sub, { flex:'none', fontWeight:600, textTransform:'none', color:accentHex })}>{it.num}</span> : null}
            <span style={{ flex:'1 1 auto', minWidth:0, fontSize:fs, lineHeight:1.05, letterSpacing:rowTr }}>{it.title}</span>
            {it.date ? <span style={FACT(sub, { flex:'none', fontWeight:600, textTransform:'none', opacity:.72 })}>{it.date}</span> : null}
          </div>
        ))}
        {!items.length && !exporting &&
          <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:EM(TRACK.label), fontSize:14*B, opacity:.4 }}>Paste the list in the panel →</div>}
      </div>;
    }
  }
  else if(el.type==='specials'){
    /* Item rows auto-fit the box (rowSize 0) or take an S/M/L override — parity
       with sessions/lineup. The heading stays fixed. */
    const spAvail = el.h/B - 32 - (el.heading?34:0);
    const spBase = el.rowSize || Math.max(11, Math.min(15, Math.floor(spAvail/Math.max(1,el.items.length)) - 8));
    inner = <div style={box(Object.assign({ justifyContent:'flex-start' }, sePad(el, 16)))}>
      <div style={{ fontFamily:MONT, fontWeight:800, textTransform:'uppercase', letterSpacing:EM(TRACK.h2), fontSize:(el.headingSize!=null?el.headingSize:26)*B, marginBottom:8, lineHeight:.9 }}>{el.heading}</div>
      {el.items.map((it,i)=>(
        <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:16, padding:(el.rowGap!=null?el.rowGap:5)+'px 0',
          borderTop:i? '1.5px dashed rgba(13,9,5,.3)':'none', fontFamily:MONT, fontWeight:el.rowWeight||700, textTransform:'uppercase', fontSize:spBase*B, letterSpacing:EM(el.rowTracking!=null?el.rowTracking:TRACK.name) }}>
          {/* label is a name, price is a fact — the row carries both families */}
          <span>{it.l}</span><span style={FACT(spBase*B, { textTransform:'none' })}>{it.p}</span>
        </div>
      ))}
    </div>;
  }
  else if(el.type==='agenda'){
    /* Colour-coded week — each row tinted by its day's weekly-schedule accent
       (Mon green … Sun yellow), via ACCENT_BY_DAY; a per-row `accent` wins, an
       unknown day falls back to the poster accent. Day chip + name · time over an
       optional description. Heading takes the poster accent. Fonts ride B like
       the other list blocks so a 9:16 boost scales the type in step. */
    const dayNames = DAY_NAMES||[], dayAbbr = DAY_ABBR||[], byDay = ACCENT_BY_DAY||{};
    const items = el.items||[];
    const rowGap = el.rowGap!=null?el.rowGap:16;
    const rowTr  = EM(el.rowTracking!=null?el.rowTracking:TRACK.name);
    const headFs = (el.headingSize!=null?el.headingSize:30)*B;
    const headLogical = el.heading ? (el.headingSize!=null?el.headingSize:30)+16 : 0;
    const avail  = el.h/B - 28 - headLogical;
    const auto   = Math.max(13, Math.min(30, Math.round(avail/Math.max(1,items.length)/2.3)));
    const nameFs = (el.rowSize||auto)*B;
    const descFs = Math.max(11, Math.round(nameFs*0.7));
    const abbrFs = Math.max(11, Math.round(nameFs*0.56));
    const chipW  = Math.round(nameFs*3.0);
    const titleCase = d => { const s=String(d||''); return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase(); };
    const dayCol = it => { const a = it.accent || byDay[titleCase(it.day)]; return SE_ACC.indexOf(a)>=0 ? SE_PAL[a] : accentHex; };
    const dayShort = d => { const i = dayNames.findIndex(n=>n.toLowerCase()===String(d||'').toLowerCase()); return i>=0 ? dayAbbr[i] : String(d||'').slice(0,3).toUpperCase(); };
    const ruleC = seSurf('outline',theme,accentHex).color;
    inner = <div style={box(Object.assign({ justifyContent:'flex-start' }, sePad(el, 14)))}>
      {el.heading ? <div style={{ fontFamily:MONT, fontWeight:800, textTransform:'uppercase', letterSpacing:EM(TRACK.h2), fontSize:headFs, color:accentHex, marginBottom:12, lineHeight:.9 }}>{el.heading}</div> : null}
      {items.map((it,i)=>{
        const col = dayCol(it);
        return <div key={i} style={{ display:'flex', alignItems:'stretch', gap:Math.round(14*B),
          borderTop:i?`1.5px solid ${ruleC}22`:'none', padding:rowGap+'px 0' }}>
          <div style={{ flex:'none', width:chipW, borderRadius:Math.round(6*B), background:col, alignSelf:'flex-start',
            display:'flex', alignItems:'center', justifyContent:'center', padding:Math.round(nameFs*0.3)+'px 0',
            fontFamily:MONT, fontWeight:800, fontSize:abbrFs, letterSpacing:EM(TRACK.label), color:contrastInk(col) }}>{dayShort(it.day)}</div>
          <div style={{ flex:'1 1 auto', minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:Math.round(10*B), flexWrap:'wrap' }}>
              <span style={{ fontFamily:MONT, fontWeight:el.rowWeight||700, textTransform:'uppercase', fontSize:nameFs, letterSpacing:rowTr, lineHeight:1.04 }}>{it.name}</span>
              {/* the day's time = fact → Grotesk; the event name keeps Montserrat */}
              {it.time?<span style={FACT(Math.round(nameFs*0.78), { color:col })}>{it.time}</span>:null}
            </div>
            {it.desc?<div style={{ fontFamily:GROT, fontWeight:400, fontSize:descFs, lineHeight:1.3, opacity:.72, marginTop:Math.round(3*B) }}>{it.desc}</div>:null}
          </div>
        </div>;
      })}
      {!items.length && !exporting &&
        <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:EM(TRACK.label), fontSize:14*B, opacity:.4 }}>Add days in the panel →</div>}
    </div>;
  }
  else if(el.type==='qr'){
    /* The QR FILLS the box interior (height minus the 16px padding pair),
       rounded down to a 4-module multiple so it lands at exactly the size a
       canon ink square would — the same `4 × floor(interior/4)` the ticket's
       square uses. It used to carry a `w*0.42` cap on top of that, which
       silently shrank it on any box narrower than ~2.4:1 and left it smaller
       than the square it sits next to. Drag the box to size the code. */
    const qrPad = 16;
    const qrFill = Math.max(24, 4*Math.floor((el.h - qrPad*2)/4));
    /* Same dark-on-light guarantee as the ticket's code: a dark surface gets a
       real cream tile with the tight 2-module safe area rather than an
       inverted code that only some scanners read. */
    const qrElBg = surf.background==='transparent'? t.paper : surf.background;
    const qrElDark = relLuminance(qrElBg) < 0.5;
    inner = <div style={box(Object.assign({ flexDirection:'row', alignItems:'center', justifyContent:seRowAlign(el), gap:16 }, sePad(el, qrPad)))}>
      {el.showQR && <SEQR size={qrFill} text={qrTarget(el.site)}
        dark={qrElDark ? '#0d0905' : surf.color}
        light={qrElDark ? '#fffbf1' : qrElBg}
        quiet={qrElDark ? QUIET_TIGHT : QUIET_SPEC} />}
      {/* Tracking is declared on each LINE, never on this wrapper: an em value
          resolves against the element that carries it, so 0.16em set here
          computed off the wrapper's inherited 16px and then landed as 0.142em
          on the 18px label below it. Rungs only stay rungs where the
          font-size lives. */}
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', lineHeight:1.15 }}>
        <div style={{ fontSize:18*B, letterSpacing:EM(TRACK.label) }}>{el.label}</div>
        <div style={{ fontSize:12*B, color:accentHex, letterSpacing:EM(TRACK.button), marginTop:5 }}>{el.site}</div>
      </div>
    </div>;
  }
  else if(el.type==='stamp'){
    inner = <div style={box(Object.assign({ alignItems:'center' }, sePad(el, 8)))}>
      <div style={{ fontFamily:MONT, fontWeight:el.weight||800, textTransform:'uppercase', letterSpacing:(el.letterSpacing!=null?el.letterSpacing:0.04)+'em', fontSize:el.fontSize+'px', lineHeight:.95, color:textCol, textAlign:el.align||'center', width:'100%' }}>{el.text}</div>
    </div>;
  }
  else if(el.type==='badge'){
    inner = <div style={Object.assign(box(Object.assign({ alignItems:seColAlign(el) }, sePad(el, 0))), { borderRadius:'50%' })}>
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:EM(TRACK.label), fontSize:13*B }}>{el.top}</div>
      <div style={{ fontFamily:ALT, fontWeight:600, textTransform:'uppercase', fontSize:Math.min(el.w*0.28,56*B)+'px', lineHeight:.85, color:accentHex }}>{el.big}</div>
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:EM(TRACK.label), fontSize:11*B, opacity:.65 }}>{el.sub}</div>
    </div>;
  }
  else if(el.type==='weekly'){
    /* accent bar (price left · time right) with a white day-badge on top.
       The bar text goes through contrastInk like every other accent
       fill in the Studio — it used to carry its OWN naive-luminance rule at a
       0.6 threshold, which put cream on blue and green where canon says ink,
       so a Weekly bar and a When chip on the same accent disagreed. One rule,
       one answer; el.textColor still overrides. */
    const accent = accentHex, ink='#0d0905', cream='#fffbf1';
    const barText = el.textColor!=null ? textCol : contrastInk(accent);
    const H=el.h, barH=Math.round(H*0.6), badgeD=H, pad=Math.round(el.w*0.05);
    /* fonts derive from el.h (which boostForStory already scales per format), so
       they must NOT also multiply by B — that would scale the text twice. */
    const barF=Math.round(barH*0.32), bigF=Math.round(badgeD*0.32), smF=Math.round(badgeD*0.10);
    const sh=seShadow(el, theme);
    inner = <div style={{ position:'relative', width:'100%', height:'100%', boxSizing:'border-box' }}>
      <div style={{ position:'absolute', left:0, right:0, top:(H-barH)/2, height:barH, background:accent, boxShadow: sh?sh.css:'none',
        display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 '+pad+'px', boxSizing:'border-box' }}>
        {/* price + time = facts → Grotesk. The day badge above keeps the
            wordmark's Alternates and the EVERY / ALL YEAR labels keep
            Montserrat caps: those are labels, not facts. */}
        <span style={FACT(barF, { color:barText })}>{el.price}</span>
        <span style={FACT(barF, { color:barText })}>{el.time}</span>
      </div>
      <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
        width:badgeD, height:badgeD, borderRadius:'50%', background:cream, border:Math.max(2,Math.round(badgeD*0.018))+'px solid '+ink, boxShadow: sh?sh.css:'none', boxSizing:'border-box',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
        {el.every ? <span style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', color:ink, fontSize:smF, letterSpacing:EM(TRACK.label) }}>{el.every}</span> : null}
        <span style={{ fontFamily:ALT, fontWeight:600, textTransform:'uppercase', color:accent, fontSize:bigF, lineHeight:.9, margin:'0.05em 0' }}>{el.day}</span>
        {el.allYear ? <span style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', color:ink, fontSize:smF, letterSpacing:EM(TRACK.label) }}>{el.allYear}</span> : null}
      </div>
    </div>;
  }

  else if(el.type==='matchup'){
    /* Team-vs-team combo: a competition kicker, two team names auto-fitted to a
       MATCHED size (the longer name governs both, so UAE vs Saudi Arabia still
       balances), an accent VS coin between, and date · time below. Fonts derive
       from el.w/el.h (resolveElements already scaled those per format) — so, like
       weekly, they must NOT also multiply by B. */
    const H=el.h, W=el.w, pad=Math.round(W*0.06), availW=(W-pad*2)*0.96;
    const maxTeam=Math.round(H*0.20);
    const teamSize=Math.max(18, Math.min(maxTeam, seFitText(el.teamA, availW, maxTeam), seFitText(el.teamB, availW, maxTeam)));
    const compF=Math.round(H*0.055), dtF=Math.round(H*0.072), vsD=Math.round(teamSize*0.92), vsF=Math.round(vsD*0.42), gap=Math.round(H*0.025);
    const team={ fontFamily:MONT, fontWeight:800, textTransform:'uppercase', fontSize:teamSize, lineHeight:.9,
      color:textCol, letterSpacing:EM(TRACK.display), whiteSpace:'nowrap', maxWidth:'100%' };
    inner = <div style={box(Object.assign({ alignItems:seColAlign(el) }, sePad(el, pad)))}>
      {el.comp ? <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:EM(TRACK.label), fontSize:compF, color:accentHex, marginBottom:gap }}>{el.comp}</div> : null}
      <div style={team}>{el.teamA}</div>
      <div style={{ width:vsD, height:vsD, borderRadius:'50%', background:accentHex, margin:gap+'px 0', flex:'none',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:MONT, fontWeight:800, textTransform:'uppercase', fontSize:vsF, color:contrastInk(accentHex), letterSpacing:EM(TRACK.name) }}>{el.vs||'VS'}</span>
      </div>
      <div style={team}>{el.teamB}</div>
      {/* kickoff date · time = facts → Grotesk; the team names stay Montserrat */}
      {(el.date||el.time) ? <div style={FACT(dtF, { color:textCol, marginTop:gap })}>
        {el.date}{el.date&&el.time? <span style={{ color:accentHex }}>{'  ·  '}</span> : null}{el.time}</div> : null}
    </div>;
  }

  else if(el.type==='wordmark'){
    /* The canonical REALITY mark as a standalone, freely-resizable element.
       Vector (WordmarkSVG) so it stays crisp at any size and fits its box
       without distorting. Colour + optional surface come from the shared
       controls; shadow rides the one shadowModel as a drop-shadow on the
       letters (vector family), so it isn't clipped — overflow stays visible. */
    const bareWm = !el.surface || el.surface==='none';
    const wmFilter = (_sm.mode==='filter' && _shCss) ? `drop-shadow(${_shCss})` : 'none';
    inner = <div style={Object.assign({
        width:'100%', height:'100%', boxSizing:'border-box', overflow:'visible',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding: bareWm ? 0 : '10px 18px'
      }, surf, { boxShadow:autoBox })}>
      <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', filter:wmFilter }}>
        <WordmarkSVG fill color={textCol} />
      </div>
    </div>;
  }

  return <Wrap el={el} wrap={wrap} sel={selected} onDown={onElPointerDown}>{inner}</Wrap>;
}

function Wrap({ el, wrap, sel, onDown, children }){
  return (
    <div data-elid={el.id} style={wrap}
      onPointerDown={(e)=>onDown(e, el)}>
      {children}
    </div>
  );
}

/* Memoised for the canvas. Every doc change used to re-render every element
   on the poster — each one rebuilding its styles, re-fingerprinting its press
   dials and re-measuring its text — even though a drag changes one box. The
   canvas hands this stable props: the App keeps each resolved element's
   identity while its contents are unchanged, and the pointer-down handler is
   one stable function. (The library's thumbnails use the plain component —
   they render once and are captured.) */
const StudioElementMemo = React.memo(StudioElement);
export {
  StudioElementMemo as StudioElement,
  /* The photo press, shared with the Inspector's treatment strip. */
  photoSources, drawPhotoPress, risoSig,
  /* One decode per photo, shared with the library's thumbnail warm-up. */
  loadCachedImage,
  /* The title's rendered line height (Vietnamese-aware) — the canvas editor and
     the Inspector's Line spacing hint read it from here. */
  titleLineHeight,
  /* The mark at an explicit module, in a shrink-wrapped box — the ticket's own
     renderer, shared with the Inspector's mark editor so a swatch in the panel
     and the mark on the canvas can never be drawn by two different code paths. */
  TicketInkMark as InkMarkSwatch,
  /* the day-colour ink rule + the poster's day, for the Inspector */
  SE_DAY_INK, posterDayOf,
  /* the stand-in photos, for main.jsx's test hook */
  getSample,
};
