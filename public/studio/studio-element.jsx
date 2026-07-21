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
function getSample(kind){ kind=kind||'spotlight'; if(!_sampleCache[kind]) _sampleCache[kind]=window.RISO.sampleCanvas(kind,900,1125); return _sampleCache[kind]; }

/* how far the faded overflow preview extends past the frame (1 = none) */
const BLEED_K = 1.7;

function PhotoEl({ el, theme, inkKey, selected, exporting }){
  const ref = React.useRef(null);
  const bleedRef = React.useRef(null);

  /* main riso canvas — the kept, in-frame region (clipped).
     While editing, the render is capped at 900px wide for responsiveness; the
     screen shows it scaled DOWN, so it reads crisp. Exports rasterise at
     pixelRatio 2 (up to 2160px wide), and upscaling the 900px render 2.4×
     smears the dots/edges into the paper — colours go visibly flat. So during
     export the riso is re-rendered 1:1 with the capture's pixel grid. */
  React.useEffect(()=>{
    const cv=ref.current; if(!cv||!window.RISO) return; let alive=true;
    /* `exporting` may carry the capture's pixelRatio as a number (A1 print is
       ~3.25×); rendering the riso 1:1 with that grid keeps dots crisp in print. */
    const xr = typeof exporting==='number' ? exporting : 2;
    const W = exporting ? Math.min(Math.round(el.w)*xr, xr>2?3840:2400) : Math.min(Math.round(el.w),900);
    const H=Math.max(1,Math.round(W*(el.h/el.w)));
    cv.width=W; cv.height=H;
    /* every engine-facing dial rides through by name — undefined props (docs
       saved before a control existed) fall back to the engine's defaults */
    const OPT_KEYS=['contrast','brightness','dot','bands','threshold','angle','softness','balance','shadowTint',
      'invert','spread','shape','split','offset','inkMode','gradMode','gradAngle','gradA','gradB',
      'screenOffset','field','fieldInk','fieldStrength','dotGain','jitter','pucker',
      'spotLo','spotHi','spotSoft','spotInvert','spotBase','transparent','fit',
      'blurUnder','blurOver','grain','grainSize',
      'saturation','hue','temperature','midInk','hiTint','hiInk','ink3','ghost','glyphChar',
      'bandInks','bandJitter','cutEdge','cutEdgeInk','cutSlip','cutSlipAngle','fieldTexture',
      'spotMode','spotHue','spotHueRange','spot2','spot2Lo','spot2Hi','spot2Ink',
      'ditherMode','ditherScale','hatchSpacing','hatchWeight','hatchCross','hatchWobble',
      'toner','copyNoise','streaks','generations','contourWeight','contourFill',
      'edgeDetail','edgeThick','edgeBackdrop','cellSize','mosaicDepth','mosaicGap',
      'blurUnderType','blurUnderAngle','blurUnderX','blurUnderY','blurUnderPos','blurUnderWidth',
      'blurOverType','blurOverAngle','blurOverX','blurOverY','blurOverPos','blurOverWidth',
      'grainInk','grainBlend','finBright','finContrast','finSat',
      'vignette','vignetteSoft','paperTex','inkBleed','dust','misprint','misprintAngle',
      'mix2','mix2Mode'];
    const opts={ ink:inkKey, ink2:el.ink2, paper: theme==='night'?'night':'day',
      paperFill: (el.paperFill && el.paperFill!=='fg' && el.paperFill!=='paper') ? seResolve(el.paperFill, null) : null };
    OPT_KEYS.forEach(k=>{ opts[k]=el[k]; });
    const draw=(src,src2)=>{ if(!alive) return;
      window.RISO.setSource(src);
      if(window.RISO.setSource2) window.RISO.setSource2(src2||null);
      if(window.RISO.setTransform) window.RISO.setTransform({ scale:el.imgScale, x:el.imgX, y:el.imgY, rot:el.imgRot });
      if(window.RISO.setTransform2) window.RISO.setTransform2({ scale:el.img2Scale, x:el.img2X, y:el.img2Y, rot:el.img2Rot });
      window.RISO.render(cv, el.treatment, opts); };
    const getImg=(url)=>{ const c=_imgCache.get(url); if(c) return Promise.resolve(c);
      return window.RISO.loadImage(url).then(im=>{ _imgCache.set(url,im); return im; }); };
    const p1 = el.src ? getImg(el.src).catch(()=>getSample(el.sample))
                      : Promise.resolve(el.type==='logo'? null : getSample(el.sample));
    const p2 = el.src2 ? getImg(el.src2).catch(()=>null) : Promise.resolve(null);
    Promise.all([p1,p2]).then(([s1,s2])=>{ if(!alive) return;
      if(!s1){ cv.getContext('2d').clearRect(0,0,cv.width,cv.height); return; }   // empty logo stays transparent
      draw(s1,s2); });
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
  /* photo / logo shadow (off by default; a framed piece keeps its press shadow
     below regardless): a transparent logo casts off its own shape (drop-shadow
     on the outer box so it isn't clipped); an opaque photo/paper logo casts off
     its card edge. */
  const lsh = (el.type==='logo'||el.type==='photo') ? seShadow(el, theme) : null;
  return <div style={{ width:'100%', height:'100%', position:'relative', boxSizing:'border-box',
      filter: (lsh && el.transparent) ? lsh.filter : undefined }}>
    {selected && <canvas ref={bleedRef} aria-hidden="true" style={{ position:'absolute',
      left:off, top:off, width:span, height:span, opacity:0.22, pointerEvents:'none', zIndex:0 }} />}
    <div style={{ position:'absolute', inset:0, overflow:'hidden', zIndex:1,
      border: el.frame? `3px solid ${t.fg}` : 'none',
      boxShadow: el.frame? `0 10px 2px ${t.shadow(theme==='night'?0.2:0.16)}` : (lsh && !el.transparent ? lsh.css : 'none'), boxSizing:'border-box' }}>
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
function seRGBA(hex, a){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
}
/* Build a shadow CSS string ("dx dy blur colour") from a shadowModel — the one
   place the trig + colour resolution lives. text-shadow, box-shadow and
   drop-shadow all take this same syntax, so every element shares it. 'fg' uses
   the theme's adaptive press shadow (dark on day, a soft glow on night).
   Returns null when the shadow is off. */
function seShadowCss(m, theme){
  if(!m || !m.on) return null;
  const t = seTheme(theme);
  const ang = m.ang*Math.PI/180;
  const col = m.ck==='fg' ? t.shadow(m.alpha)
            : seRGBA(m.ck==='ink'?'#0d0905':m.ck==='cream'?'#fffbf1':(SE_PAL[m.ck]||'#0d0905'), m.alpha);
  const dx = Math.round(Math.cos(ang)*m.dist*10)/10, dy = Math.round(Math.sin(ang)*m.dist*10)/10;
  return `${dx}px ${dy}px ${m.blur}px ${col}`;
}
/* The Align control's companion: how far the text sits from the edge it is
   aligned to. `vert` is the type's own vertical padding — pass it in and this
   returns the element's COMPLETE padding, replacing the shorthand it used to
   hard-code.
   One shorthand, never a longhand beside it. React only re-applies style keys
   that changed, so any shorthand/longhand pair silently desyncs: drop the
   longhand (align left→right) and React clears paddingLeft to '' without
   re-applying the unchanged shorthand, collapsing that side to 0; change the
   shorthand (surface none→solid) and it clobbers the longhand that didn't
   change. Emitting one always-complete string sidesteps both. */
function sePad(el, vert){
  const m = window.textInsetModel(el);
  const l = m.side==='left'  ? m.val : m.def;
  const r = m.side==='right' ? m.val : m.def;
  return { padding: vert+'px '+r+'px '+vert+'px '+l+'px' };
}
/* Cross-axis for a COLUMN container whose children shrink-wrap (a badge's
   stacked lines, matchup's team names, the ticket banner): textAlign alone
   can't move those, they need alignItems to follow the text. */
function seColAlign(el){
  const a = window.textInsetModel(el).align;
  return a==='left' ? 'flex-start' : a==='right' ? 'flex-end' : 'center';
}
/* Main-axis for a ROW container (qr) — there, horizontal is justifyContent. */
function seRowAlign(el){
  const a = window.textInsetModel(el).align;
  return a==='left' ? 'flex-start' : a==='right' ? 'flex-end' : 'center';
}
/* drop-shadow form for the artwork family (photo / logo / block / weekly). */
function seShadow(el, theme){
  const css = seShadowCss(window.shadowModel(el, theme), theme);
  return css ? { css, filter:`drop-shadow(${css})` } : null;
}

/* Solid colour block — a flat ink field. With grain it renders through a
   canvas (the engine's noise pass) so the texture survives export 1:1;
   without, it's a plain painted div. */
function BlockEl({ el, theme, fillHex, exporting }){
  const ref = React.useRef(null);
  const t = seTheme(theme);
  const grainy = (el.grain||0) > 0.001;
  React.useEffect(()=>{
    if(!grainy) return;
    const cv=ref.current; if(!cv||!window.RISO) return;
    const xr = typeof exporting==='number' ? exporting : 2;   // print captures pass their ratio
    const W = exporting ? Math.min(Math.round(el.w)*xr, xr>2?3840:2400) : Math.min(Math.round(el.w), 900);
    const H = Math.max(1, Math.round(W*(el.h/el.w)));
    cv.width=W; cv.height=H;
    const cx=cv.getContext('2d');
    cx.fillStyle=fillHex; cx.fillRect(0,0,W,H);
    window.RISO.grain(cv, el.grain, el.grainSize!=null?el.grainSize:2, el.grainInk, el.grainBlend);
  });
  const bsh = seShadow(el, theme);   // off by default; casts off the block shape when on
  return <div style={{ position:'absolute', inset:0, overflow:'hidden',
    opacity: el.opacity!=null?el.opacity:1,
    background: grainy? 'transparent' : fillHex,
    border: el.outline? `3px solid ${t.fg}` : 'none', boxSizing:'border-box',
    filter: bsh? bsh.filter : undefined }}>
    {grainy && <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }} />}
  </div>;
}

/* The canonical REALITY wordmark — Montserrat with Alternates A/I/Y, baked
   as vector (same paths as the site Logo). Posters use this, not set-text. */
function WordmarkSVG({ height, color, fill }){
  /* `fill` scales the mark to fit its container, preserving aspect — for the
     standalone resizable Wordmark element. Otherwise it renders at a fixed
     pixel height (the footer/ticket lockup). */
  const sz = fill ? { width:'100%', height:'100%', preserveAspectRatio:'xMidYMid meet' } : { height };
  return (
    <svg viewBox="0 0 512 84" {...sz} role="img" aria-label="REALITY" style={{ display:'block' }}>
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

function StudioElement({ el, theme, posterAccentHex, posterAccent, selected, dragging, onElPointerDown, exporting }){
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
    const inkKey = el.followAccent ? (posterAccent||'pink') : (el.ink||'pink');
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
          fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', fontSize:12, color:seTheme(theme).shadow(0.7), textAlign:'center' }}>
          <span>Partner logo</span><span style={{ fontWeight:600, fontSize:10, opacity:.8 }}>upload a PNG →</span>
        </div>
      : <PhotoEl el={el} theme={theme} inkKey={inkKey} selected={selected} exporting={exporting} />;
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
  /* Unified shadow for the text / surface family (everything below). A bare
     element shadows its letters (text-shadow, inherited by the children); a
     surfaced one shadows its card (box-shadow, overriding the surface's default).
     Defaults reproduce the old press shadow — see shadowModel. */
  const _sm = window.shadowModel(el, theme);
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
     { textAlign: window.textInsetModel(el).align }, extra);

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
          fontSize:el.fontSize+'px', lineHeight:(el.lineHeight!=null?el.lineHeight:.84),
          letterSpacing: (el.letterSpacing!=null?el.letterSpacing:(el.weight<300?0.04:0.005))+'em',
          color:textCol, textAlign:el.align,
          writingMode: el.orient==='v'?'vertical-rl':'horizontal-tb',
          textShadow: tShadow,
          whiteSpace:'pre-wrap', textWrap:'balance'
        }}>{el.text}</div>
        {hasSub && <div style={{
          fontFamily:MONT, fontWeight:el.subWeight||600, textTransform:'uppercase',
          fontSize:((el.subSize!=null?el.subSize:30)*B)+'px', lineHeight:1.15, marginTop:subGap,
          letterSpacing:(el.subTracking!=null?el.subTracking:0.02)+'em',
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
    // The cost chip is the day·time chip's twin — same accent tag, price text.
    inner = <div style={box(Object.assign({ alignItems:'center' }, sePad(el, 10)))}>
      <div style={{ fontFamily:MONT, fontWeight:el.weight||700, textTransform:'uppercase', letterSpacing:(el.letterSpacing!=null?el.letterSpacing:0.16)+'em', fontSize:el.fontSize+'px', color:textCol, width:'100%' }}>{el.text}</div>
    </div>;
  }
  else if(el.type==='host'){
    inner = <div style={box(Object.assign({ alignItems: el.align==='left'?'flex-start':el.align==='right'?'flex-end':'center' }, sePad(el, 18)))}>
      {el.kicker && <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.2em', fontSize:(el.fontSize*0.38)+'px', color:kickerHex, marginBottom:6 }}>{el.kicker}</div>}
      <div style={{ fontFamily:MONT, fontWeight:el.weight, textTransform:'uppercase', letterSpacing:(el.letterSpacing!=null?el.letterSpacing:0.02)+'em', fontSize:el.fontSize+'px', lineHeight:.95, color:textCol, textAlign:el.align }}>{el.name}</div>
    </div>;
  }
  else if(el.type==='ticket'){
    const qrLight = surf.background==='transparent'? t.paper : surf.background;
    if(el.variant==='banner'){
      // Full-width band — wordmark centred over the address. The serious,
      // bookish bottom for talks.
      inner = <div style={box(Object.assign({ flexDirection:'column', alignItems:seColAlign(el), justifyContent:'center', gap:16 }, sePad(el, 30)))}>
        <WordmarkSVG height={64*B} color={textCol} />
        <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.16em', fontSize:18*B, color:textCol }}>
          {el.site}{el.addr? <span style={{ fontWeight:600, opacity:.72 }}>{'  ·  '+el.addr}</span> : null}
        </div>
        {el.showQR && <div style={{ flex:'none', marginTop:4 }}><SEQR size={92*B} dark={surf.color} light={qrLight} /></div>}
      </div>;
    } else {
      const wmH = (el.variant==='mini'?38 : el.variant==='slim'?44 : 50) * B;
      inner = <div style={box(Object.assign({ flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:22 }, sePad(el, 22)))}>
        <WordmarkSVG height={wmH} color={textCol} />
        <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', fontSize:18*B, lineHeight:1.5, color:textCol }}>
          {el.site}{(el.addr && el.variant!=='mini')? <span style={{ display:'block', fontWeight:600, opacity:.72, fontSize:14*B, letterSpacing:'.06em' }}>{el.addr}</span> : null}
        </div>
        {el.showQR && <div style={{ flex:'none' }}><SEQR size={108*B} dark={surf.color} light={qrLight} /></div>}
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
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.18em', fontSize:(el.headingSize!=null?el.headingSize:15)*B, color:accentHex, marginBottom:10 }}>{el.heading}</div>
      {el.items.map((it,i)=>(
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:16,
          borderTop:i? `1.5px solid ${seSurf('outline',theme,accentHex).color}33` : 'none', padding:(el.rowGap!=null?el.rowGap:7)+'px 0',
          fontFamily:MONT, fontWeight:el.rowWeight||700, textTransform:'uppercase' }}>
          <span style={{ fontSize: (i===0?lpName1:lpBase)*B, color: i===0?accentHex:'inherit', letterSpacing:(el.rowTracking!=null?el.rowTracking:0.01)+'em' }}>{it.n}</span>
          <span style={{ fontSize:lpTime*B, fontWeight:600, letterSpacing:'.06em', opacity:.72 }}>{it.t}</span>
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
    const rowTr  = (el.rowTracking!=null?el.rowTracking:0.01)+'em';
    const headFs = (el.headingSize!=null?el.headingSize:15)*B;
    const items  = window.parseSessions(el.raw);
    const markers = items.reduce((a,r)=>{ if(r.marker && a.indexOf(r.marker)<0) a.push(r.marker); return a; }, []);
    const rich = markers.length>0 || items.some(r=>r.time);
    /* category colour/name: explicit markerKey wins, else a default accent per
       marker in order of first appearance. */
    const DEFCAT = ['blue','green','pink','amber','purple','red','yellow'];
    const catColor = m => { const k=el.markerKey&&el.markerKey[m]; const c=(k&&k.color)||DEFCAT[markers.indexOf(m)%7];
      return SE_ACC.indexOf(c)>=0 ? SE_PAL[c] : accentHex; };
    const catName = m => { const k=el.markerKey&&el.markerKey[m]; return (k&&k.name&&k.name.trim()) || m; };
    const headH = el.heading ? headFs+13 : 0;
    const legendH = (rich && markers.length) ? 26 : 0;
    const avail = el.h/B - 32 - headH - legendH;
    const heading = el.heading ? <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.18em', fontSize:headFs, color:accentHex, marginBottom:10 }}>{el.heading}</div> : null;
    const legend = (rich && markers.length) ? <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 18px', marginTop:10 }}>
      {markers.map(m=>{ const ms=Math.max(8,Math.round((rich?20:18)*B*0.5));
        return <span key={m} style={{ display:'flex', alignItems:'center', gap:6, fontFamily:MONT, fontWeight:700, textTransform:'uppercase', fontSize:Math.max(11,12*B), letterSpacing:'.08em' }}>
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
              {(it.date||it.time||it.num) ? <div style={{ fontFamily:MONT, fontWeight:600, textTransform:'uppercase', fontSize:metaFs, letterSpacing:'.06em', opacity:.66, marginTop:Math.round(fs*0.1) }}>
                {[it.num, it.date, it.time].filter(Boolean).join('  ·  ')}</div> : null}
            </div>
          </div>
        ))}
        {legend}
        {!items.length && !exporting &&
          <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', fontSize:14*B, opacity:.4 }}>Paste the list in the panel →</div>}
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
            {it.num ? <span style={{ flex:'none', fontSize:sub, color:accentHex, letterSpacing:'.08em' }}>{it.num}</span> : null}
            <span style={{ flex:'1 1 auto', minWidth:0, fontSize:fs, lineHeight:1.05, letterSpacing:rowTr }}>{it.title}</span>
            {it.date ? <span style={{ flex:'none', fontSize:sub, fontWeight:600, letterSpacing:'.06em', opacity:.72 }}>{it.date}</span> : null}
          </div>
        ))}
        {!items.length && !exporting &&
          <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', fontSize:14*B, opacity:.4 }}>Paste the list in the panel →</div>}
      </div>;
    }
  }
  else if(el.type==='specials'){
    /* Item rows auto-fit the box (rowSize 0) or take an S/M/L override — parity
       with sessions/lineup. The heading stays fixed. */
    const spAvail = el.h/B - 32 - (el.heading?34:0);
    const spBase = el.rowSize || Math.max(11, Math.min(15, Math.floor(spAvail/Math.max(1,el.items.length)) - 8));
    inner = <div style={box(Object.assign({ justifyContent:'flex-start' }, sePad(el, 16)))}>
      <div style={{ fontFamily:MONT, fontWeight:800, textTransform:'uppercase', letterSpacing:'.03em', fontSize:(el.headingSize!=null?el.headingSize:26)*B, marginBottom:8, lineHeight:.9 }}>{el.heading}</div>
      {el.items.map((it,i)=>(
        <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:16, padding:(el.rowGap!=null?el.rowGap:5)+'px 0',
          borderTop:i? '1.5px dashed rgba(13,9,5,.3)':'none', fontFamily:MONT, fontWeight:el.rowWeight||700, textTransform:'uppercase', fontSize:spBase*B, letterSpacing:(el.rowTracking!=null?el.rowTracking:0.03)+'em' }}>
          <span>{it.l}</span><span style={{ fontWeight:800 }}>{it.p}</span>
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
    const dayNames = window.DAY_NAMES||[], dayAbbr = window.DAY_ABBR||[], byDay = window.ACCENT_BY_DAY||{};
    const items = el.items||[];
    const rowGap = el.rowGap!=null?el.rowGap:16;
    const rowTr  = (el.rowTracking!=null?el.rowTracking:0.01)+'em';
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
      {el.heading ? <div style={{ fontFamily:MONT, fontWeight:800, textTransform:'uppercase', letterSpacing:'.03em', fontSize:headFs, color:accentHex, marginBottom:12, lineHeight:.9 }}>{el.heading}</div> : null}
      {items.map((it,i)=>{
        const col = dayCol(it);
        return <div key={i} style={{ display:'flex', alignItems:'stretch', gap:Math.round(14*B),
          borderTop:i?`1.5px solid ${ruleC}22`:'none', padding:rowGap+'px 0' }}>
          <div style={{ flex:'none', width:chipW, borderRadius:Math.round(6*B), background:col, alignSelf:'flex-start',
            display:'flex', alignItems:'center', justifyContent:'center', padding:Math.round(nameFs*0.3)+'px 0',
            fontFamily:MONT, fontWeight:800, fontSize:abbrFs, letterSpacing:'.08em', color:window.contrastInk(col) }}>{dayShort(it.day)}</div>
          <div style={{ flex:'1 1 auto', minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:Math.round(10*B), flexWrap:'wrap' }}>
              <span style={{ fontFamily:MONT, fontWeight:el.rowWeight||700, textTransform:'uppercase', fontSize:nameFs, letterSpacing:rowTr, lineHeight:1.04 }}>{it.name}</span>
              {it.time?<span style={{ fontFamily:MONT, fontWeight:700, fontSize:Math.round(nameFs*0.78), color:col, letterSpacing:'.04em' }}>{it.time}</span>:null}
            </div>
            {it.desc?<div style={{ fontFamily:GROT, fontWeight:400, fontSize:descFs, lineHeight:1.3, opacity:.72, marginTop:Math.round(3*B) }}>{it.desc}</div>:null}
          </div>
        </div>;
      })}
      {!items.length && !exporting &&
        <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', fontSize:14*B, opacity:.4 }}>Add days in the panel →</div>}
    </div>;
  }
  else if(el.type==='qr'){
    inner = <div style={box(Object.assign({ flexDirection:'row', alignItems:'center', justifyContent:seRowAlign(el), gap:16 }, sePad(el, 16)))}>
      {el.showQR && <SEQR size={Math.min(el.h-32, el.w*0.42)} dark={surf.color} light={surf.background==='transparent'? t.paper : surf.background} />}
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1.15 }}>
        <div style={{ fontSize:18*B }}>{el.label}</div>
        <div style={{ fontSize:12*B, color:accentHex, letterSpacing:'.12em', marginTop:5 }}>{el.site}</div>
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
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.16em', fontSize:13*B }}>{el.top}</div>
      <div style={{ fontFamily:ALT, fontWeight:600, textTransform:'uppercase', fontSize:Math.min(el.w*0.28,56*B)+'px', lineHeight:.85, color:accentHex }}>{el.big}</div>
      <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', fontSize:11*B, opacity:.65 }}>{el.sub}</div>
    </div>;
  }
  else if(el.type==='weekly'){
    /* accent bar (price left · time right) with a white day-badge on top */
    const accent = accentHex, ink='#0d0905', cream='#fffbf1';
    const lum = (function(h){ if(!h||h[0]!=='#'||h.length<7) return 0.5; var r=parseInt(h.slice(1,3),16)/255,g=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255; return 0.2126*r+0.7152*g+0.0722*b; })(accent);
    const barText = lum < 0.6 ? cream : ink;          // cream on saturated accents, dark on yellow/amber
    const H=el.h, barH=Math.round(H*0.6), badgeD=H, pad=Math.round(el.w*0.05);
    /* fonts derive from el.h (which boostForStory already scales per format), so
       they must NOT also multiply by B — that would scale the text twice. */
    const barF=Math.round(barH*0.32), bigF=Math.round(badgeD*0.32), smF=Math.round(badgeD*0.10);
    const sh=seShadow(el, theme);
    inner = <div style={{ position:'relative', width:'100%', height:'100%', boxSizing:'border-box' }}>
      <div style={{ position:'absolute', left:0, right:0, top:(H-barH)/2, height:barH, background:accent, boxShadow: sh?sh.css:'none',
        display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 '+pad+'px', boxSizing:'border-box' }}>
        <span style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', color:barText, fontSize:barF, letterSpacing:'.08em' }}>{el.price}</span>
        <span style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', color:barText, fontSize:barF, letterSpacing:'.08em' }}>{el.time}</span>
      </div>
      <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
        width:badgeD, height:badgeD, borderRadius:'50%', background:cream, border:Math.max(2,Math.round(badgeD*0.018))+'px solid '+ink, boxShadow: sh?sh.css:'none', boxSizing:'border-box',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
        {el.every ? <span style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', color:ink, fontSize:smF, letterSpacing:'.14em' }}>{el.every}</span> : null}
        <span style={{ fontFamily:ALT, fontWeight:600, textTransform:'uppercase', color:accent, fontSize:bigF, lineHeight:.9, margin:'0.05em 0' }}>{el.day}</span>
        {el.allYear ? <span style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', color:ink, fontSize:smF, letterSpacing:'.14em' }}>{el.allYear}</span> : null}
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
      color:textCol, letterSpacing:'.01em', whiteSpace:'nowrap', maxWidth:'100%' };
    inner = <div style={box(Object.assign({ alignItems:seColAlign(el) }, sePad(el, pad)))}>
      {el.comp ? <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.24em', fontSize:compF, color:accentHex, marginBottom:gap }}>{el.comp}</div> : null}
      <div style={team}>{el.teamA}</div>
      <div style={{ width:vsD, height:vsD, borderRadius:'50%', background:accentHex, margin:gap+'px 0', flex:'none',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:MONT, fontWeight:800, textTransform:'uppercase', fontSize:vsF, color:window.contrastInk(accentHex), letterSpacing:'.02em' }}>{el.vs||'VS'}</span>
      </div>
      <div style={team}>{el.teamB}</div>
      {(el.date||el.time) ? <div style={{ fontFamily:MONT, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', fontSize:dtF, color:textCol, marginTop:gap }}>
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

window.StudioElement = StudioElement;
