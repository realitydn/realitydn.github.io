/* ============================================================
   REALITY PRINT STUDIO — Element renderer (screen / per type)
   Mirrors the vector PDF renderer in print-export.jsx, with the
   Year 2 silkscreen DNA: 2px ink borders, straight-down plane
   shadows, misregistration echo, geometric blocking, Thin display.
   Exports: PrintElement, WordmarkSVG
   ============================================================ */
const { PALETTE: PE_PAL, INK: PE_INK, WHITE: PE_WHITE, ACCENTS: PE_ACC,
        surfaceStyle: peSurf, resolveInk: peInk, buildQR: peQR, partnerOf: pePartner, LIFT: PE_LIFT,
        dotFieldLayout: peDots, burstRays: peBurst, shapePath: peShape, arcTextLayout: peArc,
        fitTextSize: peFit, blendCss: peBlend } = window;

const FAM_CSS = { mont:"'Montserrat',sans-serif", grot:"'Space Grotesk',sans-serif", alt:"'Montserrat Alternates',sans-serif" };
function famCss(fam){ return FAM_CSS[fam] || FAM_CSS.mont; }
function peFill(key, accentHex){
  if(key==='ink') return PE_INK.rgb;
  if(key==='white') return PE_WHITE.rgb;
  if(PE_ACC.indexOf(key)>=0) return PE_PAL[key];
  return accentHex;
}
function liftShadow(key){ const s=PE_LIFT[key]; return s ? `0 ${s.dy}px ${Math.max(1,Math.round(s.dy/3))}px rgba(13,9,5,${s.k})` : 'none'; }
function echoHex(el, docAccent){ const k = el.echoAccent && el.echoAccent!=='auto' ? el.echoAccent : pePartner(docAccent); return peFill(k, PE_PAL[docAccent]); }
/* one halftone dot as an SVG node — mirrors the PDF drawDot shapes */
function dotNode(shape, p, col, key){
  const r=p.d/2;
  if(shape==='square')  return <rect key={key} x={p.x-r} y={p.y-r} width={p.d} height={p.d} fill={col} />;
  if(shape==='diamond') return <rect key={key} x={p.x-r} y={p.y-r} width={p.d} height={p.d} fill={col} transform={`rotate(45 ${p.x} ${p.y})`} />;
  if(shape==='ring'){ const lw=Math.max(0.6,r*0.5); return <circle key={key} cx={p.x} cy={p.y} r={Math.max(0.3,r-lw/2)} fill="none" stroke={col} strokeWidth={lw} />; }
  return <circle key={key} cx={p.x} cy={p.y} r={r} fill={col} />;
}
/* die-cut bed corner radius (CSS) for a sticker shape */
function stickerRadius(el){
  const sh=el.shape||'circle', m=Math.min(el.w,el.h);
  if(sh==='circle')   return '50%';
  if(sh==='squircle') return Math.round(m*(el.radius!=null?el.radius:0.3))+'px';
  if(sh==='rounded')  return Math.round(m*(el.radius!=null?el.radius:0.22))+'px';
  return '0';
}

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
window.WordmarkSVG = WordmarkSVG;

function QRView({ data, ecl, dark, light, quiet }){
  const m = React.useMemo(()=> peQR(data, ecl), [data, ecl]);
  if(!m) return <div style={{ width:'100%', height:'100%', background:light, display:'flex', alignItems:'center', justifyContent:'center', color:dark, fontFamily:FAM_CSS.mont, fontWeight:700, fontSize:11 }}>QR</div>;
  const n = m.length, q = quiet!==false ? 4 : 0, tot = n + q*2;
  return (
    <div style={{ width:'100%', height:'100%', background:light, padding:`${(q/tot)*100}%`, boxSizing:'border-box' }}>
      <div style={{ width:'100%', height:'100%', display:'grid', gridTemplateColumns:`repeat(${n},1fr)`, gridTemplateRows:`repeat(${n},1fr)` }}>
        {m.flatMap((row,y)=>row.map((c,x)=> <div key={x+'-'+y} style={{ background: c?dark:light }} />))}
      </div>
    </div>
  );
}
function ArrowGlyph({ color }){
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display:'block' }}>
      <g fill={color}><rect x="10" y="42" width="52" height="16" /><path d="M55 22 L90 50 L55 78 Z" /></g>
    </svg>
  );
}
const ARROW_ROT = { right:0, down:90, left:180, up:270 };

/* shared text block (optional misregistration echo, auto-fit, vertical set) */
function TextBlock({ el, textCol, justify }){
  const isUpper = el.upper!==false && el.type!=='body';
  let fs = el.fontSize;
  if(el.fit){
    const lines=(el.text||'').split('\n').map(l=>isUpper?l.toUpperCase():l);
    fs = peFit(lines, el.fam, el.weight, el.w*0.94, Math.min(Math.max(el.h*1.3, el.fontSize), 320), el.tracking||0);
  }
  const vertical = el.orient==='v';
  const style = {
    fontFamily:famCss(el.fam), fontWeight:el.weight, textTransform: isUpper ? 'uppercase':'none',
    fontSize:fs+'px', lineHeight: el.leading!=null?el.leading:(el.type==='body'?1.32:0.95),
    letterSpacing:(el.tracking!=null?el.tracking:0)+'em', textAlign:el.align, whiteSpace:'pre-wrap', width:'100%',
    writingMode: vertical?'vertical-rl':'horizontal-tb'
  };
  return (
    <div style={{ position:'relative', width:'100%', display:'flex', justifyContent:justify }}>
      {el.echo && <div aria-hidden="true" style={Object.assign({}, style, { position:'absolute', left:(el.echoDx||4), top:(el.echoDy||4), color:echoHex(el, el._docAccent), width:'100%' })}>{el.text}</div>}
      <div style={Object.assign({}, style, { position:'relative', color:textCol })}>{el.text}</div>
    </div>
  );
}

function PrintElement({ el, docAccentHex, docAccent, selected, dragging, onElPointerDown }){
  el = Object.assign({}, el, { _docAccent:docAccent });
  const accentHex = peFill(el.fill!=null?el.fill:'pink', docAccentHex);
  const surf = peSurf(el.surface||'none', accentHex);
  if(surf.border && el.border!=null && (el.surface&&el.surface!=='none')) surf.border = `${el.border}px solid ${surf.background==='transparent'?PE_INK.rgb:(el.surface==='accent'?accentHex:PE_INK.rgb)}`;
  const textCol = peInk(el.ink!=null?el.ink:'auto', surf.color);
  const lift = liftShadow(el.lift);

  const wrap = {
    position:'absolute', left:0, top:0, width:el.w+'px', height:el.h+'px',
    transform:`translate(${el.x}px,${el.y}px) rotate(${el.rot||0}deg)`, transformOrigin:'center center',
    transition: dragging ? 'none' : 'transform .14s cubic-bezier(0.2,1.4,0.45,1)',
    cursor: dragging ? 'grabbing' : 'grab', userSelect:'none', touchAction:'none', boxSizing:'border-box'
  };
  const bm = peBlend(el.blend); if(bm) wrap.mixBlendMode = bm;
  const box = (extra)=>Object.assign({ width:'100%', height:'100%', boxSizing:'border-box', overflow:'hidden',
    display:'flex', flexDirection:'column', justifyContent:'center', boxShadow:lift }, surf, { color:textCol }, extra);

  let inner = null;
  const t = el.type;

  if(t==='headline'||t==='kicker'||t==='body'||t==='bignum'||t==='numeral'){
    const justify = el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start';
    const pad = (el.surface && el.surface!=='none') ? '8px 12px' : '0';
    inner = <div style={box({ alignItems:justify, padding:pad })}><TextBlock el={el} textCol={textCol} justify={justify} /></div>;
  }
  else if(t==='pricelist'){
    inner = <div style={box({ padding: el.surface&&el.surface!=='none'?'12px 14px':'4px 2px', justifyContent:'flex-start' })}>
      {el.heading ? <div style={{ fontFamily:FAM_CSS.mont, fontWeight:800, textTransform:'uppercase', letterSpacing:'.04em', fontSize:Math.min(el.fontSize||20,22)+'px', color:accentHex, marginBottom:8, lineHeight:1 }}>{el.heading}</div> : null}
      {(el.items||[]).map((it,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'baseline', gap:8, padding:'4px 0', color:textCol, fontFamily:FAM_CSS.mont, fontWeight:700, textTransform:'uppercase', fontSize:'13px', letterSpacing:'.02em' }}>
          <span style={{ flex:'none' }}>{it.l}</span>
          {el.dotLeader!==false && <span style={{ flex:'1 1 auto', borderBottom:`1.5px dotted ${textCol}`, opacity:.5, transform:'translateY(-3px)' }} />}
          <span style={{ flex:'none', fontWeight:800 }}>{it.p}</span>
        </div>
      ))}
    </div>;
  }
  else if(t==='qr'){
    const light = surf.background==='transparent' ? PE_WHITE.rgb : surf.background;
    const cap = el.caption, qrSize = cap ? Math.min(el.w, el.h-28) : Math.min(el.w, el.h);
    inner = <div style={box({ alignItems:'center', justifyContent:'center', gap:8, padding:0 })}>
      <div style={{ width:qrSize, height:qrSize }}><QRView data={el.data} ecl={el.ecl} dark={textCol} light={light} quiet={el.quiet} /></div>
      {cap ? <div style={{ fontFamily:FAM_CSS.mont, fontWeight:700, textTransform:'uppercase', letterSpacing:'.14em', fontSize:'12px', color:textCol, textAlign:'center' }}>{cap}</div> : null}
    </div>;
  }
  else if(t==='coupon'){
    inner = <div style={Object.assign(box({ padding:'12px 14px', justifyContent:'space-between' }), { border:`1.4px dashed ${textCol}`, boxShadow:lift })}>
      <div style={{ fontFamily:FAM_CSS.mont, fontWeight:700, textTransform:'uppercase', letterSpacing:'.22em', fontSize:'10px', color:accentHex }}>{el.heading}</div>
      <div style={{ fontFamily:FAM_CSS.mont, fontWeight:800, textTransform:'uppercase', fontSize:Math.min(el.w*0.12,26)+'px', lineHeight:0.95, color:textCol, whiteSpace:'pre-wrap' }}>{el.big}</div>
      <div style={{ fontFamily:FAM_CSS.grot, fontWeight:400, fontSize:'9px', color:textCol, opacity:.8 }}>{el.terms}</div>
      {el.code ? <div style={{ alignSelf:'flex-start', fontFamily:FAM_CSS.mont, fontWeight:700, fontSize:'10px', letterSpacing:'.1em', color:PE_WHITE.rgb, background:textCol, padding:'3px 8px' }}>{el.code}</div> : null}
    </div>;
  }
  else if(t==='block'){
    inner = <div style={{ position:'relative', width:'100%', height:'100%' }}>
      {el.echo && <div style={{ position:'absolute', left:(el.echoDx||8), top:(el.echoDy||8), width:'100%', height:'100%', background:echoHex(el,docAccent) }} />}
      <div style={{ position:'relative', width:'100%', height:'100%', background:accentHex, borderRadius:(el.radius||0)+'px', border: el.border>0?`${el.border}px solid ${PE_INK.rgb}`:'none', boxShadow:lift, boxSizing:'border-box' }} />
    </div>;
  }
  else if(t==='slab'){
    let sh = Math.tan((el.angle||0)*Math.PI/180)*el.h; sh=Math.max(-el.w*0.5,Math.min(el.w*0.5,sh));
    const a=Math.abs(sh);
    const poly = sh>=0 ? `polygon(${sh/el.w*100}% 0, 100% 0, ${(el.w-sh)/el.w*100}% 100%, 0 100%)`
                       : `polygon(0 0, ${(el.w-a)/el.w*100}% 0, 100% 100%, ${a/el.w*100}% 100%)`;
    inner = <div style={{ position:'relative', width:'100%', height:'100%', filter: lift!=='none'?`drop-shadow(${lift})`:'none' }}>
      {el.echo && <div style={{ position:'absolute', left:(el.echoDx||9), top:(el.echoDy||9), width:'100%', height:'100%', background:echoHex(el,docAccent), clipPath:poly }} />}
      <div style={{ position:'absolute', inset:0, background:accentHex, clipPath:poly }} />
    </div>;
  }
  else if(t==='stripes'){
    const col = peFill(el.fill||'red', accentHex), bg = el.bg==='ink'?PE_INK.rgb:el.bg==='none'?'transparent':PE_WHITE.rgb;
    const n=Math.max(2,el.count||8), band=(el.dir==='v'?el.w:el.h)/n, duty=(el.ratio!=null?el.ratio:0.5);
    const on=band*Math.min(1,duty*2), grad=`repeating-linear-gradient(${el.dir==='v'?'90deg':'0deg'}, ${col} 0 ${on}px, ${bg} ${on}px ${band}px)`;
    inner = <div style={{ width:'100%', height:'100%', background:grad, boxShadow:lift }} />;
  }
  else if(t==='dotfield'){
    const col = peFill(el.fill||'amber', accentHex), bg = el.bg==='ink'?PE_INK.rgb:el.bg==='none'?'transparent':PE_WHITE.rgb;
    const lay = peDots(el);
    inner = <div style={{ width:'100%', height:'100%', background:bg, overflow:'hidden' }}>
      <svg viewBox={`0 0 ${el.w} ${el.h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display:'block' }}>
        {lay.dots.map((p,i)=> dotNode(lay.shape, p, col, i))}
      </svg>
    </div>;
  }
  else if(t==='sticker'){
    const bed = peFill(el.fill!=null?el.fill:'white', accentHex);
    const ringCol = peFill(el.ring!=null?el.ring:'ink', accentHex);
    const ringW = el.ringW!=null?el.ringW:4, rad = stickerRadius(el);
    inner = <div style={{ position:'relative', width:'100%', height:'100%' }}>
      {el.echo && <div aria-hidden="true" style={{ position:'absolute', left:(el.echoDx||7), top:(el.echoDy||7), width:'100%', height:'100%', background:echoHex(el,docAccent), borderRadius:rad }} />}
      <div style={{ position:'relative', width:'100%', height:'100%', background:bed, borderRadius:rad, border: ringW>0?`${ringW}px solid ${ringCol}`:'none', boxShadow:lift, boxSizing:'border-box' }} />
    </div>;
  }
  else if(t==='burst'){
    const col = peFill(el.fill||'amber', accentHex);
    const b = peBurst(el.w, el.h, el.rays||16, 0);
    const hub = el.hub!=null?el.hub:0, hubFill = peFill(el.hubFill||'white', accentHex);
    inner = <div style={{ width:'100%', height:'100%', overflow:'hidden' }}>
      <svg viewBox={`0 0 ${el.w} ${el.h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display:'block' }}>
        {b.wedges.map((w,i)=> <path key={i} d={`M${w.cx} ${w.cy} L${w.p0[0]} ${w.p0[1]} L${w.p1[0]} ${w.p1[1]} Z`} fill={col} />)}
        {hub>0 && <circle cx={b.cx} cy={b.cy} r={b.R*hub} fill={hubFill} />}
      </svg>
    </div>;
  }
  else if(t==='shape'){
    const col = peFill(el.fill!=null?el.fill:'blue', accentHex);
    const strokeCol = peFill(el.strokeColor||'ink', accentHex), sw = el.stroke||0;
    const path = peShape(el.kind||'hexagon', el.w, el.h);
    const liftF = (el.lift && el.lift!=='none') ? `drop-shadow(${liftShadow(el.lift)})` : 'none';
    const echoCol = echoHex(el, docAccent), edx=el.echoDx||7, edy=el.echoDy||7;
    const half = sw/2;
    inner = <div style={{ width:'100%', height:'100%', filter:liftF }}>
      <svg viewBox={`0 0 ${el.w} ${el.h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display:'block', overflow:'visible' }}>
        {el.echo && (path
          ? <path d={path} fill={echoCol} transform={`translate(${edx} ${edy})`} />
          : <ellipse cx={el.w/2+edx} cy={el.h/2+edy} rx={el.w/2} ry={el.h/2} fill={echoCol} />)}
        {path
          ? <path d={path} fill={col} stroke={sw>0?strokeCol:'none'} strokeWidth={sw} strokeLinejoin="round" />
          : <ellipse cx={el.w/2} cy={el.h/2} rx={Math.max(0.5,el.w/2-half)} ry={Math.max(0.5,el.h/2-half)} fill={col} stroke={sw>0?strokeCol:'none'} strokeWidth={sw} />}
      </svg>
    </div>;
  }
  else if(t==='arctext'){
    const col = peFill(el.fill||'ink', accentHex);
    const lay = peArc(el.text, el.w, el.h, { fontSize:el.fontSize, tracking:el.tracking, flip:el.flip, fam:el.fam, weight:el.weight, radiusAdj:el.radiusAdj, upper:el.upper });
    inner = <div style={{ width:'100%', height:'100%' }}>
      <svg viewBox={`0 0 ${el.w} ${el.h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display:'block', overflow:'visible' }}>
        {lay.glyphs.map((g,i)=>(
          <text key={i} transform={`translate(${g.x} ${g.y}) rotate(${g.deg})`} textAnchor="middle" dominantBaseline="central"
            style={{ fontFamily:famCss(el.fam), fontWeight:el.weight, fontSize:lay.fontSize+'px', fill:col }}>{g.ch}</text>
        ))}
      </svg>
    </div>;
  }
  else if(t==='rule'){
    const col = peFill(el.fill||'ink', accentHex), w=Math.max(1,el.weight||3), st=el.style||'solid';
    const lineStyle = st==='dashed'?'dashed':st==='dotted'?'dotted':st==='double'?'double':'solid';
    inner = <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center' }}>
      <div style={{ width:'100%', height:st==='double'?Math.max(3,w)+'px':w+'px', borderTop:`${w}px ${lineStyle} ${col}`, background: (st==='solid')?col:'transparent' }} />
    </div>;
  }
  else if(t==='footer'){
    const ink = peFill(el.ink||'ink', accentHex);
    inner = <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', gap:14, paddingTop: el.rule!==false?6:0, borderTop: el.rule!==false?`2.5px solid ${PE_INK.rgb}`:'none', boxSizing:'border-box', boxShadow:lift }}>
      <WordmarkSVG height={Math.min(el.h-12,28)} color={ink} />
      <div style={{ flex:'1 1 auto', minWidth:0, fontFamily:FAM_CSS.mont, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', fontSize:'10px', color:ink, lineHeight:1.4 }}>
        <div>{el.site}</div>{el.addr ? <div style={{ fontWeight:600, opacity:.72, letterSpacing:'.04em' }}>{el.addr}</div> : null}
      </div>
      {el.showQR ? <div style={{ flex:'none', width:Math.min(el.h-6,56), height:Math.min(el.h-6,56) }}><QRView data={el.qrData||'https://realitydn.com'} ecl="M" dark={PE_INK.rgb} light={PE_WHITE.rgb} quiet={true} /></div> : null}
    </div>;
  }
  else if(t==='wordmark'){
    inner = <div style={box({ alignItems:'center', padding:0, boxShadow:'none' })}><WordmarkSVG height={Math.min(el.h, el.w*0.16)} color={peFill(el.ink||'ink', accentHex)} /></div>;
  }
  else if(t==='badge'){
    inner = <div style={Object.assign(box({ alignItems:'center', justifyContent:'center', gap:2, padding:'8px 6px' }))}>
      {el.top ? <div style={{ fontFamily:FAM_CSS.mont, fontWeight:700, textTransform:'uppercase', letterSpacing:'.14em', fontSize:Math.min(el.w*0.11,14)+'px', color:textCol }}>{el.top}</div> : null}
      {el.big ? <div style={{ fontFamily:FAM_CSS.mont, fontWeight:800, textTransform:'uppercase', fontSize:Math.min(el.w*0.30,42)+'px', lineHeight:.9, color:textCol }}>{el.big}</div> : null}
      {el.sub ? <div style={{ fontFamily:FAM_CSS.mont, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', fontSize:Math.min(el.w*0.085,11)+'px', color:textCol }}>{el.sub}</div> : null}
    </div>;
  }
  else if(t==='seal'){
    const col = peFill(el.fill||'ink', accentHex), R=Math.min(el.w,el.h);
    inner = <div style={{ position:'relative', width:'100%', height:'100%', borderRadius:'50%', border:`2px solid ${col}`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:lift, boxSizing:'border-box' }}>
      <div style={{ position:'absolute', inset:'6px', borderRadius:'50%', border:`1px solid ${col}` }} />
      <div style={{ fontFamily:FAM_CSS.mont, fontWeight:800, fontSize:Math.min(R*0.42,46)+'px', color:col, lineHeight:1 }}>{el.big||'★'}</div>
      {el.top ? <div style={{ position:'absolute', top:R*0.14, left:0, right:0, textAlign:'center', fontFamily:FAM_CSS.mont, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', fontSize:Math.min(R*0.10,11)+'px', color:col }}>{el.top}</div> : null}
      {el.sub ? <div style={{ position:'absolute', bottom:R*0.14, left:0, right:0, textAlign:'center', fontFamily:FAM_CSS.mont, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', fontSize:Math.min(R*0.09,10)+'px', color:col }}>{el.sub}</div> : null}
    </div>;
  }
  else if(t==='marquee'){
    const sep = ' '+(el.sep||'★')+' ', unit = (el.text||'REALITY').toUpperCase()+sep;
    const reps = Math.max(3, Math.ceil(el.w/Math.max(40,(el.fontSize||15)*6)));
    inner = <div style={box({ alignItems:'center', justifyContent:'flex-start', padding:'0 6px' })}>
      <div style={{ fontFamily:FAM_CSS.mont, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', fontSize:(el.fontSize||15)+'px', color:textCol, whiteSpace:'nowrap', overflow:'hidden' }}>{unit.repeat(reps)}</div>
    </div>;
  }
  else if(t==='arrow'){
    inner = <div style={box({ flexDirection:'column', alignItems:'center', gap:4, padding:0, boxShadow:'none' })}>
      <div style={{ flex:'1 1 auto', width:'100%', minHeight:0, transform:`rotate(${ARROW_ROT[el.dir||'right']}deg)` }}><ArrowGlyph color={peFill(el.ink||'ink', accentHex)} /></div>
      {el.label ? <div style={{ fontFamily:FAM_CSS.mont, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', fontSize:(el.fontSize||18)+'px', color:textCol }}>{el.label}</div> : null}
    </div>;
  }
  else if(t==='contact'){
    inner = <div style={box({ alignItems: el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start', padding:0, boxShadow:'none' })}>
      <div style={{ fontFamily:FAM_CSS.mont, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', fontSize:(el.fontSize||11)+'px', color:textCol, textAlign:el.align, lineHeight:1.5 }}>
        {el.site}{el.addr ? <span style={{ display:'block', fontWeight:600, opacity:.72, letterSpacing:'.04em' }}>{el.addr}</span> : null}
      </div>
    </div>;
  }

  return <div data-elid={el.id} style={wrap} onPointerDown={(e)=>onElPointerDown(e, el)}>{inner}</div>;
}

window.PrintElement = PrintElement;
