/* ============================================================
   REALITY POSTER STUDIO — Element renderer (per type)
   Exports: StudioElement
   ============================================================ */
const { PALETTE: SE_PAL, ACCENTS: SE_ACC, themeColors: seTheme, surfaceStyle: seSurf, QRGlyph: SEQR } = window;
const MONT = "'Montserrat',sans-serif";
const ALT  = "'Montserrat Alternates',sans-serif";
const GROT = "'Space Grotesk',sans-serif";

/* riso image caches (shared across photo elements) */
const _imgCache = new Map();
const _sampleCache = {};
function getSample(kind){ kind=kind||'spotlight'; if(!_sampleCache[kind]) _sampleCache[kind]=window.RISO.sampleCanvas(kind,900,1125); return _sampleCache[kind]; }

/* how far the faded overflow preview extends past the frame (1 = none) */
const BLEED_K = 1.7;

function PhotoEl({ el, theme, inkKey, selected }){
  const ref = React.useRef(null);
  const bleedRef = React.useRef(null);

  /* main riso canvas — the kept, in-frame region (clipped) */
  React.useEffect(()=>{
    const cv=ref.current; if(!cv||!window.RISO) return; let alive=true;
    const W=Math.min(Math.round(el.w),900), H=Math.max(1,Math.round(W*(el.h/el.w)));
    cv.width=W; cv.height=H;
    const opts={ ink:inkKey, ink2:el.ink2, paper: theme==='night'?'night':'day',
      contrast:el.contrast, brightness:el.brightness, dot:el.dot, bands:el.bands, threshold:el.threshold,
      angle:el.angle, softness:el.softness, balance:el.balance, shadowTint:el.shadowTint,
      invert:el.invert, spread:el.spread, shape:el.shape, split:el.split, offset:el.offset };
    const draw=(src)=>{ if(!alive) return; window.RISO.setSource(src);
      if(window.RISO.setTransform) window.RISO.setTransform({ scale:el.imgScale, x:el.imgX, y:el.imgY, rot:el.imgRot });
      window.RISO.render(cv, el.treatment, opts); };
    if(el.src){ const c=_imgCache.get(el.src); if(c) draw(c);
      else window.RISO.loadImage(el.src).then(im=>{ _imgCache.set(el.src,im); draw(im); }).catch(()=>draw(getSample(el.sample))); }
    else draw(getSample(el.sample));
    return ()=>{ alive=false; };
  });

  /* editing aid: while this photo is selected, show the cropped image OUTSIDE
     the frame, faded — so it's clear what's kept vs cut. Raw source (not riso),
     drawn at the same scale/position into a canvas BLEED_K× the frame and aligned
     on the frame centre. Not selected (incl. during export) → not rendered. */
  React.useEffect(()=>{
    if(!selected) return;
    const cv=bleedRef.current; if(!cv) return; let alive=true;
    const r = Math.min(Math.round(el.w),700) / el.w;     // px per design-unit
    const BW=Math.max(1,Math.round(el.w*BLEED_K*r)), BH=Math.max(1,Math.round(el.h*BLEED_K*r));
    cv.width=BW; cv.height=BH;
    const cx=cv.getContext('2d'); cx.clearRect(0,0,BW,BH);
    const drawSrc=(src)=>{ if(!alive||!src) return;
      const sw=src.naturalWidth||src.width, sh=src.naturalHeight||src.height;
      const cover=Math.max((el.w*r)/sw,(el.h*r)/sh) * (el.imgScale!=null?el.imgScale:1);
      const dw=sw*cover, dh=sh*cover;
      cx.save();
      cx.translate(BW/2 + (el.imgX||0)*(el.w*r), BH/2 + (el.imgY||0)*(el.h*r));
      if(el.imgRot) cx.rotate(el.imgRot*Math.PI/180);
      cx.drawImage(src, -dw/2, -dh/2, dw, dh);
      cx.restore();
    };
    if(el.src){ const c=_imgCache.get(el.src); if(c) drawSrc(c);
      else window.RISO.loadImage(el.src).then(im=>{ _imgCache.set(el.src,im); drawSrc(im); }).catch(()=>drawSrc(getSample(el.sample))); }
    else drawSrc(getSample(el.sample));
    return ()=>{ alive=false; };
  });

  const t=seTheme(theme);
  const off=`${-(BLEED_K-1)/2*100}%`, span=`${BLEED_K*100}%`;
  return <div style={{ width:'100%', height:'100%', position:'relative', boxSizing:'border-box' }}>
    {selected && <canvas ref={bleedRef} aria-hidden="true" style={{ position:'absolute',
      left:off, top:off, width:span, height:span, opacity:0.22, pointerEvents:'none', zIndex:0 }} />}
    <div style={{ position:'absolute', inset:0, overflow:'hidden', zIndex:1,
      border: el.frame? `3px solid ${t.fg}` : 'none',
      boxShadow: el.frame? `0 10px 2px ${t.shadow(theme==='night'?0.2:0.16)}` : 'none', boxSizing:'border-box' }}>
      <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }} />
    </div>
  </div>;
}

const SE_LIT = { ink:'#0d0905', cream:'#fffbf1' };
/* Resolve an element's colour choice to a hex. 'fg' (or anything unknown)
   falls back to the supplied default — surface-contrast colour for text,
   the poster accent for fills. 'ink'/'cream' are literal and theme-independent,
   so e.g. a title can be forced cream for legibility over a dark photo. */
function seResolve(colorKey, fallback){
  if(colorKey==='ink'||colorKey==='cream') return SE_LIT[colorKey];
  return SE_ACC.indexOf(colorKey)>=0 ? SE_PAL[colorKey] : fallback;
}

/* The canonical REALITY wordmark — Montserrat with Alternates A/I/Y, baked
   as vector (same paths as the site Logo). Posters use this, not set-text. */
function WordmarkSVG({ height, color }){
  return (
    <svg viewBox="0 0 512 84" height={height} role="img" aria-label="REALITY" style={{ display:'block' }}>
      <g fill={color}>
        <path d="M73.4,63.7V13.3h20.7c4.5,0,8.3.7,11.5,2.1,3.2,1.4,5.7,3.5,7.4,6.2,1.7,2.7,2.6,5.9,2.6,9.6s-.9,6.9-2.6,9.5c-1.7,2.6-4.2,4.7-7.4,6.1-3.2,1.4-7,2.2-11.5,2.2h-15.5l4.1-4.2v18.9h-9.4ZM82.7,45.9l-4.1-4.5h15c4.1,0,7.2-.9,9.3-2.7,2.1-1.8,3.1-4.2,3.1-7.4s-1-5.6-3.1-7.4c-2.1-1.8-5.2-2.6-9.3-2.6h-15l4.1-4.6v29.2ZM106.3,63.7l-12.7-18.3h10l12.8,18.3h-10.1Z"/>
        <path d="M142.6,55.8h28.4v7.9h-37.8V13.3h36.8v7.9h-27.4v34.6ZM141.8,34.3h25.1v7.7h-25.1v-7.7Z"/>
        <path d="M188.2,63.7v-27.9c0-5,.9-9.3,2.8-12.7s4.5-6.1,7.8-7.8c3.4-1.8,7.2-2.6,11.7-2.6s8.4.9,11.8,2.6c3.4,1.8,6,4.4,7.8,7.8,1.8,3.5,2.8,7.7,2.8,12.7v27.9h-9.3v-28.8c0-4.8-1.2-8.3-3.6-10.6-2.4-2.3-5.6-3.5-9.5-3.5s-7.2,1.2-9.5,3.5c-2.4,2.3-3.6,5.9-3.6,10.6v28.8h-9.2ZM194.1,50.7v-7.8h32.8v7.8h-32.8Z"/>
        <path d="M253.3,63.7V13.3h9.4v42.5h26.4v7.9h-35.7Z"/>
        <path d="M299.8,21.2v-7.9h27.9v7.9h-27.9ZM299.8,63.7v-7.9h27.9v7.9h-27.9ZM309,62.6V14.3h9.4v48.3h-9.4Z"/>
        <path d="M354.8,63.7V21.2h-16.7v-7.9h42.8v7.9h-16.7v42.5h-9.4Z"/>
        <path d="M415.7,71.4c-4.2,0-8.1-.6-11.5-1.9-3.5-1.2-6.4-3-8.7-5.2l3.8-7.2c2.3,2,4.7,3.5,7.5,4.5,2.7,1,5.7,1.5,9,1.5s7.8-1.2,10.2-3.5c2.3-2.4,3.5-6,3.5-10.9v-9.8l2.7,1.2c-1.6,3.9-4,6.7-7,8.5-3,1.8-6.6,2.7-10.6,2.7-6.3,0-11.3-1.8-14.8-5.4-3.5-3.6-5.3-8.9-5.3-15.7V13.3h9.4v16.5c0,4.5,1.1,7.9,3.3,10.1,2.2,2.2,5.1,3.3,8.8,3.3s7.2-1.2,9.7-3.5c2.5-2.3,3.7-6,3.7-10.9v-15.6h9.4v35c0,5.1-.9,9.3-2.8,12.7s-4.5,6-7.9,7.7c-3.4,1.8-7.5,2.7-12.2,2.7Z"/>
      </g>
    </svg>
  );
}

function StudioElement({ el, theme, posterAccentHex, posterAccent, selected, dragging, onElPointerDown }){
  const t = seTheme(theme);
  const accentHex = seResolve(el.color, posterAccentHex);
  const surf = seSurf(el.surface, theme, accentHex, true);
  // Text colour: 'fg' follows the surface's own contrast colour (so text on a
  // solid/accent block stays readable); an explicit ink/cream/accent overrides.
  const textCol = seResolve(el.color, surf.color);

  if(el.type==='photo'){
    const inkKey = el.followAccent ? (posterAccent||'pink') : (el.ink||'pink');
    const pwrap = {
      position:'absolute', left:0, top:0, width:el.w+'px', height:el.h+'px',
      transform:`translate(${el.x}px,${el.y}px) rotate(${el.rot||0}deg)`, transformOrigin:'center center',
      transition: dragging ? 'none' : 'transform .16s cubic-bezier(0.2,1.4,0.45,1)',
      cursor: dragging ? 'grabbing' : 'grab', userSelect:'none', touchAction:'none', boxSizing:'border-box'
    };
    return <Wrap el={el} wrap={pwrap} sel={selected} onDown={onElPointerDown}><PhotoEl el={el} theme={theme} inkKey={inkKey} selected={selected} /></Wrap>;
  }

  const wrap = {
    position:'absolute', left:0, top:0,
    width:el.w + 'px', height:el.h + 'px',
    transform:`translate(${el.x}px,${el.y}px) rotate(${el.rot||0}deg)`,
    transformOrigin:'center center',
    transition: dragging ? 'none' : 'transform .16s cubic-bezier(0.2,1.4,0.45,1)',
    cursor: dragging ? 'grabbing' : 'grab',
    userSelect:'none', WebkitUserSelect:'none', touchAction:'none', boxSizing:'border-box'
  };
  const box = (extra)=>Object.assign({
    width:'100%', height:'100%', boxSizing:'border-box', overflow:'hidden',
    display:'flex', flexDirection:'column', justifyContent:'center'
  }, surf, extra);

  let inner = null;

  if(el.type==='title'){
    // The Surface control now applies to the title too: 'none' = bare floating
    // text (with the drop shadow); any other surface wraps it in that block.
    const bare = !el.surface || el.surface==='none';
    const container = Object.assign({
      width:'100%', height:'100%', display:'flex', boxSizing:'border-box',
      alignItems:'center', justifyContent: el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start'
    }, bare ? { padding:0 } : Object.assign({ padding:'16px 26px' }, surf));
    inner = (
      <div style={container}>
        <div style={{
          fontFamily:MONT, fontWeight:el.weight, textTransform:'uppercase',
          fontSize:el.fontSize+'px', lineHeight:.84,
          letterSpacing: (el.letterSpacing!=null?el.letterSpacing:(el.weight<300?0.04:0.005))+'em',
          color:textCol, textAlign:el.align,
          writingMode: el.orient==='v'?'vertical-rl':'horizontal-tb',
          textShadow: bare?`0 6px 1px ${t.shadow(theme==='night'?0.22:0.16)}`:'none',
          whiteSpace:'pre-wrap', textWrap:'balance'
        }}>{el.text}</div>
      </div>
    );
    return <Wrap el={el} wrap={wrap} sel={selected} onDown={onElPointerDown}>{inner}</Wrap>;
  }

  if(el.type==='tagline'){
    inner = <div style={box({ padding:'14px 24px' })}>
      <div style={{ fontFamily:GROT, fontWeight:el.weight, fontSize:el.fontSize+'px', lineHeight:1.25, letterSpacing:(el.letterSpacing!=null?el.letterSpacing:0)+'em', color:textCol, textAlign:el.align }}>{el.text}</div>
    </div>;
  }
  else if(el.type==='when'){
    inner = <div style={box({ padding:'10px 26px', alignItems:'center' })}>
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:(el.letterSpacing!=null?el.letterSpacing:0.16)+'em', fontSize:el.fontSize+'px', color:textCol, textAlign:'center', width:'100%' }}>{el.text}</div>
    </div>;
  }
  else if(el.type==='host'){
    inner = <div style={box({ padding:'18px 28px', alignItems: el.align==='left'?'flex-start':el.align==='right'?'flex-end':'center' })}>
      {el.kicker && <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.2em', fontSize:(el.fontSize*0.38)+'px', color:accentHex, marginBottom:6 }}>{el.kicker}</div>}
      <div style={{ fontFamily:MONT, fontWeight:el.weight, textTransform:'uppercase', letterSpacing:(el.letterSpacing!=null?el.letterSpacing:0.02)+'em', fontSize:el.fontSize+'px', lineHeight:.95, color:textCol, textAlign:el.align }}>{el.name}</div>
    </div>;
  }
  else if(el.type==='ticket'){
    const qrLight = surf.background==='transparent'? t.paper : surf.background;
    if(el.variant==='banner'){
      // Full-width band — wordmark centred over the address. The serious,
      // bookish bottom for talks.
      inner = <div style={box({ flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:'30px 46px' })}>
        <WordmarkSVG height={64} color={textCol} />
        <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.16em', fontSize:18, textAlign:'center', color:textCol }}>
          {el.site}{el.addr? <span style={{ fontWeight:600, opacity:.72 }}>{'  ·  '+el.addr}</span> : null}
        </div>
        {el.showQR && <div style={{ flex:'none', marginTop:4 }}><SEQR size={92} dark={surf.color} light={qrLight} /></div>}
      </div>;
    } else {
      const wmH = el.variant==='mini'?38 : el.variant==='slim'?44 : 50;
      inner = <div style={box({ flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:22, padding:'22px 34px' })}>
        <WordmarkSVG height={wmH} color={textCol} />
        <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', fontSize:18, textAlign:'center', lineHeight:1.5, color:textCol }}>
          {el.site}{(el.addr && el.variant!=='mini')? <span style={{ display:'block', fontWeight:600, opacity:.72, fontSize:14, letterSpacing:'.06em' }}>{el.addr}</span> : null}
        </div>
        {el.showQR && <div style={{ flex:'none' }}><SEQR size={108} dark={surf.color} light={qrLight} /></div>}
      </div>;
    }
  }
  else if(el.type==='lineup'){
    inner = <div style={box({ padding:'18px 24px', justifyContent:'flex-start' })}>
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.18em', fontSize:15, color:accentHex, marginBottom:10 }}>{el.heading}</div>
      {el.items.map((it,i)=>(
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:16,
          borderTop:i? `1.5px solid ${seSurf('outline',theme,accentHex).color}33` : 'none', padding:'7px 0',
          fontFamily:MONT, fontWeight:700, textTransform:'uppercase' }}>
          <span style={{ fontSize: i===0?26:21, color: i===0?accentHex:'inherit', letterSpacing:'.01em' }}>{it.n}</span>
          <span style={{ fontSize:13, fontWeight:600, letterSpacing:'.06em', opacity:.72 }}>{it.t}</span>
        </div>
      ))}
    </div>;
  }
  else if(el.type==='specials'){
    inner = <div style={box({ padding:'16px 24px', justifyContent:'flex-start' })}>
      <div style={{ fontFamily:MONT, fontWeight:800, textTransform:'uppercase', letterSpacing:'.03em', fontSize:26, marginBottom:8, lineHeight:.9 }}>{el.heading}</div>
      {el.items.map((it,i)=>(
        <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:16, padding:'5px 0',
          borderTop:i? '1.5px dashed rgba(13,9,5,.3)':'none', fontFamily:MONT, fontWeight:700, textTransform:'uppercase', fontSize:14, letterSpacing:'.03em' }}>
          <span>{it.l}</span><span style={{ fontWeight:800 }}>{it.p}</span>
        </div>
      ))}
    </div>;
  }
  else if(el.type==='qr'){
    inner = <div style={box({ flexDirection:'row', alignItems:'center', gap:16, padding:'16px 18px' })}>
      {el.showQR && <SEQR size={Math.min(el.h-32, el.w*0.42)} dark={surf.color} light={surf.background==='transparent'? t.paper : surf.background} />}
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1.15 }}>
        <div style={{ fontSize:18 }}>{el.label}</div>
        <div style={{ fontSize:12, color:accentHex, letterSpacing:'.12em', marginTop:5 }}>{el.site}</div>
      </div>
    </div>;
  }
  else if(el.type==='stamp'){
    inner = <div style={box({ alignItems:'center', padding:'8px 16px' })}>
      <div style={{ fontFamily:MONT, fontWeight:800, textTransform:'uppercase', letterSpacing:(el.letterSpacing!=null?el.letterSpacing:0.04)+'em', fontSize:el.fontSize+'px', lineHeight:.95, color:textCol, textAlign:'center', width:'100%' }}>{el.text}</div>
    </div>;
  }
  else if(el.type==='badge'){
    inner = <div style={Object.assign(box({ alignItems:'center', padding:0 }), { borderRadius:'50%' })}>
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.16em', fontSize:13 }}>{el.top}</div>
      <div style={{ fontFamily:ALT, fontWeight:600, textTransform:'uppercase', fontSize:Math.min(el.w*0.28,56)+'px', lineHeight:.85, color:accentHex }}>{el.big}</div>
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', fontSize:11, opacity:.65 }}>{el.sub}</div>
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

window.StudioElement = StudioElement;
