/* ============================================================
   REALITY PRINT STUDIO — vector PDF export (pdf-lib + fontkit)
   Every element drawn as VECTOR, CMYK, K-only black text.
   Year 2 DNA: 2px ink borders, straight-down plane shadows,
   misregistration echo (the second silkscreen layer), geometric
   colour blocking, Thin-100 display, rotated badges/seals.
   Trim at exact mm + 3mm bleed + vector crop marks. Gang on A4.
   Exports: window.PrintExport { single, gang, ready }
   ============================================================ */
(function(){
const PT_PER_MM = 72/25.4;
function L(){ return window.PDFLib; }
function sizeDims(size, orient){ return window.sizeDims(size, orient); }

/* ---- fonts ---- */
async function loadFontBytes(){
  if(loadFontBytes._cache) return loadFontBytes._cache;
  const FACES = window.FACES, out = {};
  await Promise.all(Object.keys(FACES).map(async key=>{
    const res = await fetch(FACES[key].file);
    if(!res.ok) throw new Error('font fetch failed: '+FACES[key].file);
    out[key] = await res.arrayBuffer();
  }));
  loadFontBytes._cache = out; return out;
}
async function embedFonts(pdf){
  pdf.registerFontkit(window.fontkit);
  const bytes = await loadFontBytes(), fonts = {};
  for(const key of Object.keys(bytes)) fonts[key] = await pdf.embedFont(bytes[key], { subset:true });
  return (fam, weight)=> fonts[window.faceFor(fam, weight)];
}

/* ---- colour ---- */
function cmykArr(a){ return L().cmyk(a[0],a[1],a[2],a[3]); }
function inkColor(){ return cmykArr([0,0,0,1]); }
function whiteColor(){ return cmykArr([0,0,0,0]); }
function tintK(k){ return cmykArr([0,0,0,k]); }
function accentColor(name){ const c=window.PALETTE_CMYK[name]; return c?cmykArr(c):inkColor(); }
function isAccent(name){ return window.ACCENTS.indexOf(name)>=0; }
function colorForKey(key, fallback){
  if(key==null || key==='auto') return fallback || inkColor();
  if(key==='ink') return inkColor();
  if(key==='white') return whiteColor();
  if(isAccent(key)) return accentColor(key);
  return inkColor();
}
function surfTextFallback(surface, accentName){
  if(surface==='solid') return whiteColor();
  if(surface==='accent'){ return window.contrastInk(window.PALETTE[accentName])==='#ffffff' ? whiteColor() : inkColor(); }
  return inkColor();
}

/* ---- text layout ---- */
function chars(s){ return Array.from(s); }
function measure(str, font, size, tracking){ if(!str) return 0; return font.widthOfTextAtSize(str,size)+Math.max(0,chars(str).length-1)*tracking*size; }
function wrapText(text, font, size, tracking, maxW){
  const lines=[];
  (text||'').split('\n').forEach(par=>{
    const words=par.split(/\s+/).filter(w=>w.length);
    if(!words.length){ lines.push(''); return; }
    let cur='';
    for(const w of words){ const t=cur?cur+' '+w:w; if(!cur||measure(t,font,size,tracking)<=maxW) cur=t; else { lines.push(cur); cur=w; } }
    if(cur) lines.push(cur);
  });
  return lines;
}

/* ============================================================
   render one element. ctx = { B, pageH, fontFor, accentName }
   Element coords are top-left, y-down, pt. Rotation about centre
   is applied per-primitive via place() + the ROT option.
   ============================================================ */
function renderElement(page, el, ctx){
  const { B, pageH, fontFor, accentName } = ctx;
  const { degrees } = L();
  const ex = B + el.x, ey = B + el.y;
  const r = el.rot||0, rad = r*Math.PI/180, cs=Math.cos(rad), sn=Math.sin(rad);
  const cx = el.w/2, cy = el.h/2;
  const ROT = degrees(-r);
  /* local (lx, top-down ly) → PDF point, rotated about element centre */
  function place(lx, ly){
    const dx=lx-cx, dy=ly-cy;
    const rx = dx*cs - dy*sn, ry = dx*sn + dy*cs;
    return { x: ex + cx + rx, y: pageH - (ey + cy + ry) };
  }
  /* rectangle whose visual TOP-LEFT is (lx,lyTop) extending +w,+h down-right */
  function rect(lx, lyTop, w, h, opts){
    const bl = place(lx, lyTop+h);
    const o = Object.assign({ x:bl.x, y:bl.y, width:w, height:h, rotate:ROT }, opts);
    page.drawRectangle(o);
  }
  function line(ax, ay, bx, by, thickness, color, dash){
    const p=place(ax,ay), q=place(bx,by);
    const o={ start:{x:p.x,y:p.y}, end:{x:q.x,y:q.y}, thickness, color };
    if(dash) o.dashArray=dash;
    page.drawLine(o);
  }
  function ellipse(lxC, lyC, rx, ry, opts){
    const c=place(lxC,lyC);
    page.drawEllipse(Object.assign({ x:c.x, y:c.y, xScale:rx, yScale:ry, rotate:ROT }, opts));
  }
  function drawLineStr(str, lx, baselineTop, font, size, color, tracking){
    if(!str) return;
    if(Math.abs(tracking)<0.0005){ const p=place(lx,baselineTop); page.drawText(str,{x:p.x,y:p.y,size,font,color,rotate:ROT}); return; }
    let curX=lx;
    for(const ch of chars(str)){ const p=place(curX,baselineTop); page.drawText(ch,{x:p.x,y:p.y,size,font,color,rotate:ROT}); curX += font.widthOfTextAtSize(ch,size)+tracking*size; }
  }
  /* draw an SVG path given in LOCAL element coords (0..w, 0..h, y-down).
     Anchored at the rotated local origin so it rotates about the element
     centre, matching rect()/text — same as the wordmark. */
  function localPath(d, color){ const o=place(0,0); page.drawSvgPath(d, { x:o.x, y:o.y, scale:1, rotate:ROT, color }); }
  function localPathStroke(d, color, w){ const o=place(0,0); page.drawSvgPath(d, { x:o.x, y:o.y, scale:1, rotate:ROT, borderColor:color, borderWidth:w }); }

  const accentHex = isAccent(el.fill) ? window.PALETTE[el.fill] : window.PALETTE[accentName];
  const fillKey = el.fill!=null ? el.fill : accentName;
  const textFallback = surfTextFallback(el.surface, accentName);
  const textColor = colorForKey(el.ink!=null?el.ink:'auto', textFallback);
  const echoColor = el.echoAccent && el.echoAccent!=='auto' ? colorForKey(el.echoAccent) : accentColor(window.partnerOf(accentName));

  function liftRect(lx,lyTop,w,h){
    const s = window.LIFT[el.lift]; if(!s) return;
    rect(lx, lyTop+s.dy, w, h, { color:tintK(s.k) });
  }
  function drawSurface(){
    const s=el.surface; if(!s||s==='none') return;
    let fill=null, border=inkColor(), bw=el.border!=null?el.border:2;
    if(s==='solid'){ fill=inkColor(); border=inkColor(); }
    else if(s==='accent'){ fill=accentColor(fillKey); border=inkColor(); }
    else if(s==='paper'){ fill=whiteColor(); border=inkColor(); }
    else if(s==='outline'){ fill=null; border=inkColor(); }
    liftRect(0,0,el.w,el.h);
    const o={}; if(fill) o.color=fill; if(bw>0){ o.borderColor=border; o.borderWidth=bw; }
    rect(0,0,el.w,el.h,o);
  }

  /* multi-line text block; valign centre/top; optional offset (echo) */
  function textBlock({ str, fam, weight, size, align, tracking, leading, upper, valign, padX, padY, color, dx, dy }){
    const font=fontFor(fam,weight), t=upper?(str||'').toUpperCase():(str||'');
    const maxW=el.w-padX*2, lines=wrapText(t,font,size,tracking,maxW);
    const asc=font.heightAtSize(size,{descender:false}), lineH=size*leading, blockH=lines.length*lineH;
    let top = valign==='top'?padY:(el.h-blockH)/2; if(valign!=='center'&&top<padY) top=padY;
    lines.forEach((ln,i)=>{
      const w=measure(ln,font,size,tracking);
      let lx=padX; if(align==='center') lx=padX+(maxW-w)/2; else if(align==='right') lx=padX+(maxW-w);
      drawLineStr(ln, lx+(dx||0), top+i*lineH+asc+(dy||0), font, size, color, tracking);
    });
  }

  const t=el.type;
  if(t==='headline'||t==='body'||t==='kicker'||t==='bignum'||t==='numeral'){
    drawSurface();
    const pad=(el.surface&&el.surface!=='none')?12:0;
    const opts={ str:el.text, fam:el.fam, weight:el.weight, size:el.fontSize, align:el.align||'left',
      tracking:el.tracking||0, leading:el.leading!=null?el.leading:(t==='body'?1.32:0.95),
      upper: el.upper!==false && t!=='body', valign:'center', padX:pad, padY:pad, color:textColor };
    if(el.echo){ textBlock(Object.assign({}, opts, { color:echoColor, dx:(el.echoDx||4), dy:(el.echoDy||4) })); }
    textBlock(opts);
  }
  else if(t==='pricelist'){
    drawSurface();
    let yTop=(el.surface&&el.surface!=='none')?12:6;
    const padX=(el.surface&&el.surface!=='none')?12:2;
    if(el.heading){ const hf=fontFor('mont',800), hs=Math.min(el.fontSize||20,22), a=hf.heightAtSize(hs,{descender:false});
      drawLineStr(el.heading.toUpperCase(), padX, yTop+a, hf, hs, accentColor(isAccent(fillKey)?fillKey:accentName), 0.04); yTop+=hs*1.1+8; }
    const rf=fontFor('mont',700), rs=13, ra=rf.heightAtSize(rs,{descender:false}), rowH=rs*1.7;
    (el.items||[]).forEach(it=>{
      const baseTop=yTop+ra, lbl=(it.l||'').toUpperCase(), prc=(it.p||'').toUpperCase();
      drawLineStr(lbl, padX, baseTop, rf, rs, textColor, 0.02);
      const pw=measure(prc,rf,rs,0.02); drawLineStr(prc, el.w-padX-pw, baseTop, rf, rs, textColor, 0.02);
      if(el.dotLeader!==false){ const lw=measure(lbl,rf,rs,0.02), x0=padX+lw+6, x1=el.w-padX-pw-6, my=yTop+ra*0.72;
        if(x1>x0) line(x0,my,x1,my,0.75,textColor,[0.5,2]); }
      yTop+=rowH;
    });
  }
  else if(t==='qr'){
    drawSurface();
    const m=window.buildQR(el.data,el.ecl), pad=(el.surface&&el.surface!=='none')?10:0;
    const capH=el.caption?18:0, qrSize=Math.min(el.w-pad*2,el.h-pad*2-capH), blockH=qrSize+capH;
    const top=(el.h-blockH)/2, qx=(el.w-qrSize)/2;
    rect(qx, top, qrSize, qrSize, { color:whiteColor() });
    if(m){ const quiet=el.quiet!==false?4:0, n=m.length, tot=n+quiet*2, ms=qrSize/tot;
      for(let rr=0;rr<n;rr++) for(let cc=0;cc<n;cc++) if(m[rr][cc]) rect(qx+(cc+quiet)*ms, top+(rr+quiet)*ms, ms+0.3, ms+0.3, { color:inkColor() }); }
    if(el.caption){ const cf=fontFor('mont',700), csz=11, a=cf.heightAtSize(csz,{descender:false}), cw=measure(el.caption.toUpperCase(),cf,csz,0.14);
      drawLineStr(el.caption.toUpperCase(), (el.w-cw)/2, top+qrSize+(capH+a)/2-2, cf, csz, textColor, 0.14); }
  }
  else if(t==='coupon'){
    liftRect(0,0,el.w,el.h);
    rect(0,0,el.w,el.h,{ borderColor:textColor, borderWidth:1.4, borderDashArray:[3,2.5] });
    const pad=12;
    const kf=fontFor('mont',700), ks=10, ka=kf.heightAtSize(ks,{descender:false});
    drawLineStr((el.heading||'').toUpperCase(), pad, pad+ka, kf, ks, accentColor(isAccent(fillKey)?fillKey:accentName), 0.22);
    const bf=fontFor('mont',800), bs=Math.min(el.w*0.12,26), blines=wrapText((el.big||'').toUpperCase(),bf,bs,0,el.w-pad*2), ba=bf.heightAtSize(bs,{descender:false}), blh=bs*0.98;
    blines.forEach((ln,i)=>drawLineStr(ln, pad, pad+18+i*blh+ba, bf, bs, textColor, 0));
    if(el.terms){ const tf=fontFor('grot',400), ts=9, ta=tf.heightAtSize(ts,{descender:false}); drawLineStr(el.terms, pad, el.h-28-ts+ta, tf, ts, textColor, 0); }
    if(el.code){ const cf=fontFor('mont',700), csz=10, cw=measure(el.code,cf,csz,0.1), ca=cf.heightAtSize(csz,{descender:false}), chipH=csz+8, chipW=cw+14, chipTop=el.h-pad-chipH;
      rect(pad, chipTop, chipW, chipH, { color:textColor }); drawLineStr(el.code, pad+7, chipTop+(chipH-csz)/2+ca, cf, csz, whiteColor(), 0.1); }
  }
  else if(t==='block'){
    liftRect(0,0,el.w,el.h);
    if(el.echo) rect(el.echoDx||8, el.echoDy||8, el.w, el.h, { color:echoColor });
    const o={ color:colorForKey(fillKey, accentColor(accentName)) };
    if(el.border>0){ o.borderColor=inkColor(); o.borderWidth=el.border; }
    rect(0,0,el.w,el.h,o);
  }
  else if(t==='slab'){
    /* sheared geometric colour block (hard-edge plane, 15–45°) */
    let sh=Math.tan((el.angle||0)*Math.PI/180)*el.h; sh=Math.max(-el.w*0.5,Math.min(el.w*0.5,sh));
    const quad=(ox,oy)=>{ const a=Math.abs(sh); return sh>=0
      ? `M ${ox+sh} ${oy} L ${ox+el.w} ${oy} L ${ox+el.w-sh} ${oy+el.h} L ${ox} ${oy+el.h} Z`
      : `M ${ox} ${oy} L ${ox+el.w-a} ${oy} L ${ox+el.w} ${oy+el.h} L ${ox+a} ${oy+el.h} Z`; };
    if(el.echo) localPath(quad(el.echoDx||9, el.echoDy||9), echoColor);
    localPath(quad(0,0), colorForKey(fillKey, accentColor(accentName)));
  }
  else if(t==='stripes'){
    if(el.bg && el.bg!=='none') rect(0,0,el.w,el.h,{ color: el.bg==='ink'?inkColor():whiteColor() });
    const n=Math.max(2,el.count||8), band=el.h/n, duty=el.ratio!=null?el.ratio:0.5, col=colorForKey(fillKey, accentColor(accentName));
    const vertical = el.dir==='v';
    const span = vertical?el.w:el.h, bw2=span/n;
    for(let i=0;i<n;i++){ if(i%2) continue; const o=i*bw2, th=bw2*Math.min(1,duty*2);
      if(vertical) rect(o,0,th,el.h,{color:col}); else rect(0,o,el.w,th,{color:col}); }
  }
  else if(t==='dotfield'){
    if(el.bg && el.bg!=='none') rect(0,0,el.w,el.h,{ color: el.bg==='ink'?inkColor():whiteColor() });
    const col=colorForKey(fillKey, accentColor(accentName)), lay=window.dotFieldLayout(el), shape=lay.shape;
    lay.dots.forEach(p=>{ const r=p.d/2;
      if(shape==='square') rect(p.x-r, p.y-r, p.d, p.d, { color:col });
      else if(shape==='diamond') localPath(`M ${p.x} ${p.y-r} L ${p.x+r} ${p.y} L ${p.x} ${p.y+r} L ${p.x-r} ${p.y} Z`, col);
      else if(shape==='ring'){ const lw=Math.max(0.5,r*0.5); ellipse(p.x,p.y, Math.max(0.3,r-lw/2), Math.max(0.3,r-lw/2), { borderColor:col, borderWidth:lw }); }
      else ellipse(p.x, p.y, r, r, { color:col });
    });
  }
  else if(t==='sticker'){
    const bed=colorForKey(el.fill!=null?el.fill:'white', whiteColor());
    const ringCol=colorForKey(el.ring!=null?el.ring:'ink', inkColor());
    const ringW=el.ringW!=null?el.ringW:4, shape=el.shape||'circle', s=window.LIFT[el.lift];
    if(shape==='circle'){
      const rx=el.w/2, ry=el.h/2, cxL=el.w/2, cyL=el.h/2;
      if(s) ellipse(cxL, cyL+s.dy, rx, ry, { color:tintK(s.k) });
      if(el.echo) ellipse(cxL+(el.echoDx||7), cyL+(el.echoDy||7), rx, ry, { color:echoColor });
      ellipse(cxL, cyL, rx, ry, { color:bed });
      if(ringW>0) ellipse(cxL, cyL, Math.max(0.5,rx-ringW/2), Math.max(0.5,ry-ringW/2), { borderColor:ringCol, borderWidth:ringW });
    } else {
      const m=Math.min(el.w,el.h), rad= shape==='rect'?0 : m*(el.radius!=null?el.radius:(shape==='squircle'?0.3:0.22));
      const path=(ox,oy)=>roundedRectPath(ox,oy,el.w,el.h,rad);
      if(s) localPath(path(0,s.dy), tintK(s.k));
      if(el.echo) localPath(path(el.echoDx||7, el.echoDy||7), echoColor);
      localPath(path(0,0), bed);
      if(ringW>0) localPathStroke(roundedRectPath(ringW/2, ringW/2, el.w-ringW, el.h-ringW, Math.max(0,rad-ringW/2)), ringCol, ringW);
    }
  }
  else if(t==='burst'){
    const col=colorForKey(fillKey, accentColor(accentName)), b=window.burstRays(el.w, el.h, el.rays||16, 0);
    b.wedges.forEach(w=> localPath(`M ${w.cx} ${w.cy} L ${w.p0[0]} ${w.p0[1]} L ${w.p1[0]} ${w.p1[1]} Z`, col));
    const hub=el.hub!=null?el.hub:0;
    if(hub>0) ellipse(b.cx, b.cy, b.R*hub, b.R*hub, { color: colorForKey(el.hubFill||'white', whiteColor()) });
  }
  else if(t==='rule'){
    const th=Math.max(0.5,el.weight||3), col=colorForKey(el.fill||'ink',inkColor()), my=el.h/2, st=el.style||'solid';
    if(st==='double'){ rect(0,my-th,el.w,th*0.5,{color:col}); rect(0,my+th*0.5,el.w,th*0.5,{color:col}); }
    else if(st==='dotted'){ const r2=th/2, gap=th*1.6; for(let x=0;x+th<=el.w;x+=th+gap) ellipse(x+r2,my,r2,r2,{color:col}); }
    else if(st==='dashed'){ line(0,my,el.w,my,th,col,[th*2.2, th*1.6]); }
    else rect(0,my-th/2,el.w,th,{color:col});
  }
  else if(t==='footer'){
    if(el.rule!==false) rect(0,0,el.w,2.5,{ color:inkColor() });
    const top=6, wmH=Math.min(el.h-top-6, 30), s=wmH/84, wmW=512*s, wmTop=top+(el.h-top-wmH)/2;
    const wmA=place(0,wmTop);
    page.drawSvgPath(window.WORDMARK_PATH, { x:wmA.x, y:wmA.y, scale:s, color:colorForKey(el.ink||'ink',inkColor()), rotate:ROT });
    // QR right
    let rightX=el.w;
    if(el.showQR){ const m=window.buildQR(el.qrData||'https://realitydn.com','M'), qs=Math.min(el.h-6, 56), qy=(el.h-qs)/2, qx=el.w-qs;
      rect(qx,qy,qs,qs,{color:whiteColor()});
      if(m){ const quiet=2,n=m.length,tot=n+quiet*2,ms=qs/tot; for(let rr=0;rr<n;rr++)for(let cc=0;cc<n;cc++) if(m[rr][cc]) rect(qx+(cc+quiet)*ms,qy+(rr+quiet)*ms,ms+0.3,ms+0.3,{color:inkColor()}); }
      rightX=qx-12; }
    // address + site between wordmark and QR
    const tf=fontFor('mont',700), ts=10, ta=tf.heightAtSize(ts,{descender:false}), tx=wmW+18, tw=Math.max(0,rightX-tx);
    const a1=(el.site||SITELESS).toUpperCase(), a2=el.addr||'';
    const blockTop=(el.h - (ts*1.4 + (a2?ts*1.25:0)))/2 + 2;
    drawLineStr(a1, tx, blockTop+ta, tf, ts, colorForKey(el.ink||'ink',inkColor()), 0.08);
    if(a2) drawLineStr(a2, tx, blockTop+ts*1.4+ta, fontFor('mont',600)||tf, ts*0.92, inkColor(), 0.04);
  }
  else if(t==='wordmark'){
    const wmH=Math.min(el.h,el.w*0.16), s=wmH/84, wmW=512*s, lx=(el.w-wmW)/2, lyTop=(el.h-wmH)/2;
    const o=place(lx,lyTop);
    page.drawSvgPath(window.WORDMARK_PATH, { x:o.x, y:o.y, scale:s, color:colorForKey(el.ink||'ink',inkColor()), rotate:ROT });
  }
  else if(t==='badge'){
    drawSurface();
    const top=fontFor('mont',700), ts=Math.min(el.w*0.11,14), bigf=fontFor('mont',800), bs=Math.min(el.w*0.30,42), subf=fontFor('mont',700), ss=Math.min(el.w*0.085,11);
    const ta=top.heightAtSize(ts,{descender:false}), ba=bigf.heightAtSize(bs,{descender:false}), sa=subf.heightAtSize(ss,{descender:false});
    const tCol=textColor;
    const totalH=ts*1.1+bs+ss*1.2, t0=(el.h-totalH)/2;
    const ctr=(str,font,size,topY,col,tr)=>{ const w=measure(str,font,size,tr); drawLineStr(str,(el.w-w)/2,topY,font,size,col,tr); };
    if(el.top) ctr(el.top.toUpperCase(),top,ts,t0+ta,tCol,0.14);
    if(el.big) ctr(el.big.toUpperCase(),bigf,bs,t0+ts*1.1+ba,tCol,0.01);
    if(el.sub) ctr(el.sub.toUpperCase(),subf,ss,t0+ts*1.1+bs+sa,tCol,0.1);
  }
  else if(t==='seal'){
    const cxL=el.w/2, cyL=el.h/2, R=Math.min(el.w,el.h)/2-2, col=colorForKey(el.fill||'ink',inkColor());
    ellipse(cxL,cyL,R,R,{ borderColor:col, borderWidth:2 });
    ellipse(cxL,cyL,R-6,R-6,{ borderColor:col, borderWidth:1 });
    const bigf=fontFor('mont',800), bs=Math.min(R*0.9,46), ba=bigf.heightAtSize(bs,{descender:false}), bw=measure(el.big||'★',bigf,bs,0);
    drawLineStr(el.big||'★', cxL-bw/2, cyL+ba*0.35, bigf, bs, col, 0);
    if(el.top){ const tf=fontFor('mont',700), ts=Math.min(R*0.20,11), tw=measure(el.top.toUpperCase(),tf,ts,0.1); drawLineStr(el.top.toUpperCase(), cxL-tw/2, cyL-R*0.45, tf, ts, col, 0.1); }
    if(el.sub){ const sf=fontFor('mont',700), ssz=Math.min(R*0.18,10), sw=measure(el.sub.toUpperCase(),sf,ssz,0.1); drawLineStr(el.sub.toUpperCase(), cxL-sw/2, cyL+R*0.66, sf, ssz, col, 0.1); }
  }
  else if(t==='marquee'){
    drawSurface();
    const f=fontFor('mont',800), s=el.fontSize||15, a=f.heightAtSize(s,{descender:false}), sep=' '+(el.sep||'★')+' ';
    const unit=(el.text||'REALITY').toUpperCase()+sep, uw=measure(unit,f,s,0.1);
    const reps=Math.max(1,Math.ceil(el.w/Math.max(1,uw))+1); let str=''; for(let i=0;i<reps;i++) str+=unit;
    const baseTop=(el.h-s)/2+a-2;
    drawLineStr(str, 6, baseTop, f, s, textColor, 0.1);
  }
  else if(t==='arrow'){
    const labelH=el.label?24:0, aH=el.h-labelH;
    localPath(arrowPath(el.dir||'right', el.w, aH), colorForKey(el.ink||'ink',accentColor(accentName)));
    if(el.label){ const f=fontFor('mont',800), s=el.fontSize||18, a=f.heightAtSize(s,{descender:false}), w=measure(el.label.toUpperCase(),f,s,0.06); drawLineStr(el.label.toUpperCase(), (el.w-w)/2, aH+(labelH+a)/2-2, f, s, textColor, 0.06); }
  }
  else if(t==='contact'){
    const align=el.align||'left', a1=(el.site||SITELESS).toUpperCase(), a2=el.addr||'';
    const ff=fontFor('mont',700), s=el.fontSize||11;
    const draw=(str,topY,sz)=>{ const a=ff.heightAtSize(sz,{descender:false}), w=measure(str,ff,sz,0.08); let lx=0; if(align==='center') lx=(el.w-w)/2; else if(align==='right') lx=el.w-w; drawLineStr(str,lx,topY+a,ff,sz,textColor,0.08); };
    const top=(el.h-(s*1.5+(a2?s*1.3:0)))/2;
    draw(a1,top,s); if(a2) draw(a2,top+s*1.5,s*0.92);
  }
}
const SITELESS = 'www.realitydn.com';

function arrowPoints(dir, w, h){
  const P=[[0.10,0.42],[0.58,0.42],[0.58,0.26],[0.92,0.50],[0.58,0.74],[0.58,0.58],[0.10,0.58]];
  const ang=({right:0,down:90,left:180,up:270})[dir]||0, a=ang*Math.PI/180, ca=Math.cos(a), sa=Math.sin(a);
  return P.map(([ux,uy])=>{ const x=ux-0.5,y=uy-0.5; return [(x*ca-y*sa+0.5)*w,(x*sa+y*ca+0.5)*h]; });
}
function arrowPath(dir,w,h){ const p=arrowPoints(dir,w,h); return 'M '+p.map(q=>q[0].toFixed(2)+' '+q[1].toFixed(2)).join(' L ')+' Z'; }

/* rounded-rectangle SVG path in local (y-down) coords, anchored at (ox,oy).
   r clamps to half the short side; r=0 → plain rectangle. Quadratic corners. */
function roundedRectPath(ox,oy,w,h,r){
  r=Math.max(0,Math.min(r, Math.min(w,h)/2));
  if(r<=0) return `M ${ox} ${oy} L ${ox+w} ${oy} L ${ox+w} ${oy+h} L ${ox} ${oy+h} Z`;
  const x=ox,y=oy;
  return `M ${x+r} ${y} L ${x+w-r} ${y} Q ${x+w} ${y} ${x+w} ${y+r} `
       + `L ${x+w} ${y+h-r} Q ${x+w} ${y+h} ${x+w-r} ${y+h} `
       + `L ${x+r} ${y+h} Q ${x} ${y+h} ${x} ${y+h-r} `
       + `L ${x} ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;
}

function drawCropMarks(page, B, trimW, trimH, pageH){
  const len=18, gap=6, th=0.5, col=inkColor();
  const corners=[[B,B],[B+trimW,B],[B,B+trimH],[B+trimW,B+trimH]];
  corners.forEach(([cxp,cyTop],i)=>{ const right=(i%2)===1, bottom=i>=2;
    const hx=right?cxp+gap:cxp-gap-len; page.drawRectangle({ x:hx, y:pageH-cyTop-th/2, width:len, height:th, color:col });
    const vyTop=bottom?cyTop+gap:cyTop-gap-len; page.drawRectangle({ x:cxp-th/2, y:pageH-(vyTop+len), width:th, height:len, color:col }); });
}

async function buildPiece(doc, { bleed, marks }){
  const { PDFDocument } = L();
  const dims=sizeDims(doc.size,doc.orient), B=bleed?3*PT_PER_MM:0;
  const pageW=dims.wpt+B*2, pageH=dims.hpt+B*2;
  const pdf=await PDFDocument.create(); const fontFor=await embedFonts(pdf);
  const page=pdf.addPage([pageW,pageH]);
  page.drawRectangle({ x:0,y:0,width:pageW,height:pageH,color:whiteColor() });
  const ctx={ B, pageH, fontFor, accentName:doc.accent };
  (doc.elements||[]).forEach(el=>{ try{ renderElement(page,el,ctx); }catch(e){ console.warn('el render failed',el&&el.type,e); } });
  if(bleed&&marks) drawCropMarks(page,B,dims.wpt,dims.hpt,pageH);
  return { pdf, dims, B, pageW, pageH };
}

async function single(doc, opts){
  opts=opts||{}; const { pdf }=await buildPiece(doc,{ bleed:opts.bleed!==false, marks:opts.marks!==false });
  return await pdf.save();
}

async function gang(doc, opts){
  opts=opts||{}; const { PDFDocument, degrees }=L();
  const g=window.GANG[doc.size]; if(!g) throw new Error('Size '+doc.size+' cannot be ganged on A4');
  const piece=await buildPiece(doc,{ bleed:false, marks:false }); const pieceBytes=await piece.pdf.save();
  const a4=await PDFDocument.create(); const A4=sizeDims('a4','portrait');
  const sheet=a4.addPage([A4.wpt,A4.hpt]); sheet.drawRectangle({ x:0,y:0,width:A4.wpt,height:A4.hpt,color:whiteColor() });
  const [embedded]=await a4.embedPdf(pieceBytes);
  const cellW=A4.wpt/g.cols, cellH=A4.hpt/g.rows;
  const pieceLandscape=piece.dims.wpt>piece.dims.hpt, cellLandscape=g.cell==='landscape', rotate=pieceLandscape!==cellLandscape;
  const pw=rotate?piece.dims.hpt:piece.dims.wpt, ph=rotate?piece.dims.wpt:piece.dims.hpt, sc=Math.min(cellW/pw,cellH/ph);
  for(let rr=0;rr<g.rows;rr++) for(let cc=0;cc<g.cols;cc++){
    const cellX=cc*cellW, cellY=A4.hpt-(rr+1)*cellH;
    if(rotate) sheet.drawPage(embedded,{ x:cellX+piece.dims.hpt*sc, y:cellY, xScale:sc, yScale:sc, rotate:degrees(90) });
    else sheet.drawPage(embedded,{ x:cellX, y:cellY, xScale:sc, yScale:sc });
  }
  if(opts.marks!==false){
    for(let c=1;c<g.cols;c++) sheet.drawLine({ start:{x:c*cellW,y:0}, end:{x:c*cellW,y:A4.hpt}, thickness:0.4, color:inkColor() });
    for(let rr=1;rr<g.rows;rr++) sheet.drawLine({ start:{x:0,y:rr*cellH}, end:{x:A4.wpt,y:rr*cellH}, thickness:0.4, color:inkColor() });
  }
  return await a4.save();
}

async function ready(){ await loadFontBytes(); return true; }
window.PrintExport = { single, gang, ready };
})();
