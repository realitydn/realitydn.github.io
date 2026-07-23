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

/* ---- raster (photo) embedding ----
   The image element is the one non-vector part: render its RISO treatment to a
   canvas at a size-aware DPI (small pieces 300 · A3-ish 200 · larger 150 — per
   the print-studio plan), then embed as a JPEG. RGB, not CMYK — fine for a
   photo; the K-only-text guarantee is unaffected (no rgb() touches the text). */
function dataURLtoBytes(u){ const b=atob((u.split(',')[1])||''); const a=new Uint8Array(b.length); for(let i=0;i<b.length;i++) a[i]=b.charCodeAt(i); return a; }
async function rasterizeImage(pdf, el, accentName){
  if(typeof document==='undefined' || !window.RISO) return null;
  let img=null;
  if(el.imgId && window.PrintImg){ img = window.PrintImg.peek(el.imgId) || await window.PrintImg.load(el.imgId).catch(()=>null); }
  const longMM=Math.max(el.w,el.h)/PT_PER_MM;
  const dpi = longMM<=210 ? 300 : longMM<=420 ? 200 : 150;
  let pxW=Math.round(el.w/72*dpi), pxH=Math.round(el.h/72*dpi);
  const cap=3200, mx=Math.max(pxW,pxH); if(mx>cap){ const k=cap/mx; pxW=Math.round(pxW*k); pxH=Math.round(pxH*k); }
  const cv=document.createElement('canvas'); cv.width=Math.max(1,pxW); cv.height=Math.max(1,pxH);
  if(img){ window.RISO.setSource(img);
    if(window.RISO.setTransform) window.RISO.setTransform({ scale:el.imgScale||1, x:el.imgX||0, y:el.imgY||0, rot:el.imgRot||0 });
    window.RISO.render(cv, el.treatment||'none', window.risoOpts(el, accentName)); }
  else { const cx=cv.getContext('2d'); cx.fillStyle='#ffffff'; cx.fillRect(0,0,cv.width,cv.height); }
  return await pdf.embedJpg(dataURLtoBytes(cv.toDataURL('image/jpeg',0.92)));
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
/* auto text colour on a surfaced box — contrast is judged against the box's OWN
   fill accent (accentHex), not the doc accent, so it matches the screen when the
   surface accent is customised. */
function surfTextFallback(surface, accentHex){
  if(surface==='solid') return whiteColor();
  if(surface==='accent') return window.contrastInk(accentHex)==='#ffffff' ? whiteColor() : inkColor();
  return inkColor();
}

/* ---- text layout ---- */
function chars(s){ return Array.from(s); }
/* ★ (U+2605) isn't in any embedded face, so as a font glyph it exports as tofu.
   We draw it as a vector star instead (see drawLineStr); measure it with a
   matching advance so centring/wrapping stay WYSIWYG with the screen. */
const STAR_CH = '★';
function starGlyphW(size){ return size*0.9; }
function measure(str, font, size, tracking){
  if(!str) return 0;
  const cs=chars(str); let w=0;
  for(const ch of cs) w += ch===STAR_CH ? starGlyphW(size) : font.widthOfTextAtSize(ch,size);
  return w + Math.max(0,cs.length-1)*tracking*size;
}
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
  const { B, pageH, fontFor, accentName, imgMap } = ctx;
  const { degrees } = L();
  const ex = B + el.x, ey = B + el.y;
  const r = el.rot||0, rad = r*Math.PI/180, cs=Math.cos(rad), sn=Math.sin(rad);
  const cx = el.w/2, cy = el.h/2;
  const ROT = degrees(-r);
  /* blend mode (riso overprint) — applied to every draw op for this element */
  const BM = (el.blend && el.blend!=='normal' && L().BlendMode) ? L().BlendMode[window.blendPdf(el.blend)] : null;
  const bm = (o)=>{ if(BM) o.blendMode=BM; return o; };
  /* local (lx, top-down ly) → PDF point, rotated about element centre */
  function place(lx, ly){
    const dx=lx-cx, dy=ly-cy;
    const rx = dx*cs - dy*sn, ry = dx*sn + dy*cs;
    return { x: ex + cx + rx, y: pageH - (ey + cy + ry) };
  }
  /* rectangle whose visual TOP-LEFT is (lx,lyTop) extending +w,+h down-right */
  function rect(lx, lyTop, w, h, opts){
    const bl = place(lx, lyTop+h);
    page.drawRectangle(bm(Object.assign({ x:bl.x, y:bl.y, width:w, height:h, rotate:ROT }, opts)));
  }
  function line(ax, ay, bx, by, thickness, color, dash){
    const p=place(ax,ay), q=place(bx,by);
    const o={ start:{x:p.x,y:p.y}, end:{x:q.x,y:q.y}, thickness, color };
    if(dash) o.dashArray=dash;
    page.drawLine(bm(o));
  }
  function ellipse(lxC, lyC, rx, ry, opts){
    const c=place(lxC,lyC);
    page.drawEllipse(bm(Object.assign({ x:c.x, y:c.y, xScale:rx, yScale:ry, rotate:ROT }, opts)));
  }
  function drawLineStr(str, lx, baselineTop, font, size, color, tracking){
    if(!str) return;
    /* fast path only when there's no ★ and no tracking; otherwise step per glyph
       so ★ can be swapped for a vector star (missing from every embedded face). */
    if(str.indexOf(STAR_CH)<0 && Math.abs(tracking)<0.0005){ const p=place(lx,baselineTop); page.drawText(str,bm({x:p.x,y:p.y,size,font,color,rotate:ROT})); return; }
    let curX=lx;
    for(const ch of chars(str)){
      if(ch===STAR_CH){ const w=starGlyphW(size); localPath(window.starPath(0,0,size*0.38), color, curX+w/2, baselineTop-size*0.35); curX += w+tracking*size; continue; }
      const p=place(curX,baselineTop); page.drawText(ch,bm({x:p.x,y:p.y,size,font,color,rotate:ROT})); curX += font.widthOfTextAtSize(ch,size)+tracking*size;
    }
  }
  /* draw an SVG path given in LOCAL element coords (0..w, 0..h, y-down),
     optionally offset by (ox,oy) local pt. Anchored at the rotated local
     origin so it rotates about the element centre, matching rect()/text. */
  function localPath(d, color, ox, oy){ const o=place(ox||0, oy||0); page.drawSvgPath(d, bm({ x:o.x, y:o.y, scale:1, rotate:ROT, color })); }
  function localPathStroke(d, color, w, ox, oy){ const o=place(ox||0, oy||0); page.drawSvgPath(d, bm({ x:o.x, y:o.y, scale:1, rotate:ROT, borderColor:color, borderWidth:w })); }

  const accentHex = isAccent(el.fill) ? window.PALETTE[el.fill] : window.PALETTE[accentName];
  const fillKey = el.fill!=null ? el.fill : accentName;
  const textFallback = surfTextFallback(el.surface, accentHex);
  const textColor = colorForKey(el.ink!=null?el.ink:'auto', textFallback);
  const echoColor = el.echoAccent && el.echoAccent!=='auto' ? colorForKey(el.echoAccent) : accentColor(window.partnerOf(accentName));

  function liftRect(lx,lyTop,w,h){
    const s = window.LIFT[el.lift]; if(!s) return;
    rect(lx, lyTop+s.dy, w, h, { color:tintK(s.k) });
  }
  /* shared box fill + styled border (color · pattern · radius) — same geometry as
     the screen border overlay via roundedRectPath, so dashes land identically. */
  function fillBox(color, radius){
    if((radius||0)>0) localPath(window.roundedRectPath(0,0,el.w,el.h,Math.min(radius,Math.min(el.w,el.h)/2)), color, 0, 0);
    else rect(0,0,el.w,el.h,{ color });
  }
  function strokeBox(bw, color, pattern, radius){
    if(!(bw>0)) return;
    const bd=window.borderDash(pattern||'solid', bw), ins=bw/2;
    const d=window.roundedRectPath(ins, ins, Math.max(0,el.w-bw), Math.max(0,el.h-bw), Math.max(0,(radius||0)-ins));
    const o0=place(0,0), o={ x:o0.x, y:o0.y, scale:1, rotate:ROT, borderColor:color, borderWidth:bw };
    if(bd.dash) o.borderDashArray=bd.dash;
    if(L().LineCapStyle) o.borderLineCap = bd.cap==='round'?L().LineCapStyle.Round:L().LineCapStyle.Butt;
    page.drawSvgPath(d, bm(o));
  }
  function drawSurface(){
    const s=el.surface; if(!s||s==='none') return;
    const bw=el.border!=null?el.border:2, radius=el.radius||0;
    let fill=null;
    if(s==='solid') fill=inkColor();
    else if(s==='accent') fill=accentColor(fillKey);
    else if(s==='paper') fill=whiteColor();
    liftRect(0,0,el.w,el.h);
    if(fill) fillBox(fill, radius);
    const bcol = (el.borderColor && el.borderColor!=='auto') ? colorForKey(el.borderColor) : (s==='accent'?accentColor(fillKey):inkColor());
    strokeBox(bw, bcol, el.borderPattern, radius);
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
  /* upright-stacked vertical text — one glyph per row, centred */
  function drawVerticalText({ str, fam, weight, size, upper, color, pad }){
    const font=fontFor(fam,weight), gl=(upper?(str||'').toUpperCase():(str||'')).split('').filter(c=>c!=='\n');
    const lineH=size*1.04, asc=font.heightAtSize(size,{descender:false}), blockH=gl.length*lineH;
    let top=(el.h-blockH)/2; if(top<pad) top=pad;
    gl.forEach((ch,i)=>{ if(ch===' ') return; const w=measure(ch,font,size,0); drawLineStr(ch,(el.w-w)/2, top+i*lineH+asc, font, size, color, 0); });
  }

  const t=el.type;
  if(t==='headline'||t==='body'||t==='kicker'||t==='bignum'||t==='numeral'){
    drawSurface();
    const pad=(el.surface&&el.surface!=='none')?12:0;
    const isUpper=el.upper!==false && t!=='body';
    let size=el.fontSize;
    if(el.fit){ const lines=(el.text||'').split('\n').map(l=>isUpper?l.toUpperCase():l);
      size=window.fitTextSize(lines, el.fam, el.weight, (el.w-pad*2)*0.98, Math.min(Math.max(el.h*1.3, el.fontSize),320), el.tracking||0); }
    if(el.orient==='v'){ drawVerticalText({ str:el.text, fam:el.fam, weight:el.weight, size, upper:isUpper, color:textColor, pad }); }
    else {
      const opts={ str:el.text, fam:el.fam, weight:el.weight, size, align:el.align||'left',
        tracking:el.tracking||0, leading:el.leading!=null?el.leading:(t==='body'?1.32:0.95),
        upper:isUpper, valign:'center', padX:pad, padY:pad, color:textColor };
      if(el.echo){ textBlock(Object.assign({}, opts, { color:echoColor, dx:(el.echoDx||4), dy:(el.echoDy||4) })); }
      textBlock(opts);
    }
  }
  else if(t==='pricelist'){
    drawSurface();
    const mode=el.listStyle||'prices';
    let yTop=(el.surface&&el.surface!=='none')?12:6;
    const padX=(el.surface&&el.surface!=='none')?12:2;
    const listAccent=accentColor(isAccent(fillKey)?fillKey:accentName);
    if(el.heading){ const hf=fontFor('mont',800), hs=Math.min(el.fontSize||20,22), a=hf.heightAtSize(hs,{descender:false});
      drawLineStr(el.heading.toUpperCase(), padX, yTop+a, hf, hs, listAccent, 0.04); yTop+=hs*1.1+8; }
    const rf=fontFor('mont',700), mf=fontFor('mont',800), rs=13, ra=rf.heightAtSize(rs,{descender:false}), rowH=rs*1.7;
    const markerCol = (el.markerColor&&el.markerColor!=='auto') ? colorForKey(el.markerColor) : listAccent;
    const glyph = el.marker || '•';
    (el.items||[]).forEach((it,i)=>{
      const baseTop=yTop+ra, lbl=(it.l||'').toUpperCase();
      let lx=padX;
      if(mode==='bulleted'){ drawLineStr(glyph, padX, baseTop, mf, rs, markerCol, 0); lx=padX+measure(glyph,mf,rs,0)+7; }
      else if(mode==='numbered'){ const num=(i+1)+'.'; drawLineStr(num, padX, baseTop, mf, rs, markerCol, 0); lx=padX+Math.max(measure(num,mf,rs,0), rs*0.9)+7; }
      if(mode==='prices'){
        const prc=(it.p||'').toUpperCase(), pw=measure(prc,rf,rs,0.02);
        drawLineStr(lbl, lx, baseTop, rf, rs, textColor, 0.02);
        drawLineStr(prc, el.w-padX-pw, baseTop, rf, rs, textColor, 0.02);
        if(el.dotLeader!==false){ const lw=measure(lbl,rf,rs,0.02), x0=lx+lw+6, x1=el.w-padX-pw-6, my=yTop+ra*0.72;
          if(x1>x0) line(x0,my,x1,my,0.75,textColor,[0.5,2]); }
        yTop+=rowH;
      } else {   // bulleted / numbered / plain → wrap long labels (matches the screen, no truncation in print)
        const availW=Math.max(20, el.w-lx-padX), lineH=rs*1.32, lines=wrapText(lbl, rf, rs, 0.02, availW);
        lines.forEach((ln,li)=> drawLineStr(ln, lx, baseTop+li*lineH, rf, rs, textColor, 0.02));
        yTop += rowH + (lines.length-1)*lineH;
      }
    });
  }
  else if(t==='qr'){
    drawSurface();
    const pad=(el.surface&&el.surface!=='none')?10:0;
    const capH=el.caption?18:0, qrSize=Math.min(el.w-pad*2,el.h-pad*2-capH), blockH=qrSize+capH;
    const top=(el.h-blockH)/2, qx=(el.w-qrSize)/2;
    /* shared geometry → the SAME shape descriptors the screen SVG draws, so the
       stylized code is WYSIWYG down to the module. */
    const g=window.qrGeometry(el.data, { ecl:el.ecl, quiet:el.quiet, moduleStyle:el.moduleStyle, eyeStyle:el.eyeStyle, logo:el.logo });
    const dataCol=textColor, eyeCol=colorForKey(el.eye, textColor), logoCol=colorForKey(el.logoColor, eyeCol), lightCol=whiteColor();
    const realCol=(role)=> role==='eye'?eyeCol : (role==='eyeHole'||role==='logoBg')?lightCol : dataCol;
    const ghostCol=(role)=> (role==='eyeHole'||role==='logoBg')?null : (el.echoAccent&&el.echoAccent!=='auto'?accentColor(el.echoAccent):accentColor(window.partnerOf(accentName)));
    if(g){
      const ms=qrSize/g.tot;
      const draw=(s, bx, by, col)=>{ if(!col) return;
        if(s.kind==='circle') ellipse(bx+s.cx*ms, by+s.cy*ms, s.r*ms, s.r*ms, { color:col });
        else if(s.kind==='roundrect') localPath(window.roundedRectPath(bx+s.x*ms, by+s.y*ms, s.w*ms, s.h*ms, s.r*ms), col, 0, 0);
        /* honour the shape's own w/h — square eye frames are 7/5/3 modules, not 1.
           (+0.3pt overdraw kills hairline seams between cells, same as the screen's +0.03u) */
        else rect(bx+s.x*ms, by+s.y*ms, s.w*ms+0.3, s.h*ms+0.3, { color:col }); };
      if(el.echo){ const bx=qx+(el.echoDx||6), by=top+(el.echoDy||6); g.shapes.forEach(s=> draw(s, bx, by, ghostCol(s.role))); }
      rect(qx, top, qrSize, qrSize, { color:lightCol });
      g.shapes.forEach(s=> draw(s, qx, top, realCol(s.role)));
      if(g.logo && g.logoKind!=='none'){
        ellipse(qx+g.logo.cx*ms, top+g.logo.cy*ms, g.logo.s*0.42*ms, g.logo.s*0.42*ms, { color:logoCol });
        if(g.logoKind==='star') localPath(window.starPath(qx+g.logo.cx*ms, top+g.logo.cy*ms, g.logo.s*0.30*ms), lightCol, 0, 0);
      }
    } else { rect(qx, top, qrSize, qrSize, { color:lightCol }); }
    if(el.caption){ const cf=fontFor('mont',700), csz=11, a=cf.heightAtSize(csz,{descender:false}), cw=measure(el.caption.toUpperCase(),cf,csz,0.14);
      drawLineStr(el.caption.toUpperCase(), (el.w-cw)/2, top+qrSize+(capH+a)/2-2, cf, csz, textColor, 0.14); }
  }
  else if(t==='coupon'){
    drawSurface();   // shared styled border (dashed by default) + lift
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
    const radius=el.radius||0;
    liftRect(0,0,el.w,el.h);
    if(el.echo){ if(radius>0) localPath(window.roundedRectPath(el.echoDx||8, el.echoDy||8, el.w, el.h, radius), echoColor, 0, 0); else rect(el.echoDx||8, el.echoDy||8, el.w, el.h, { color:echoColor }); }
    fillBox(colorForKey(fillKey, accentColor(accentName)), radius);
    const bcol = (el.borderColor && el.borderColor!=='auto') ? colorForKey(el.borderColor) : inkColor();
    strokeBox(el.border, bcol, el.borderPattern, radius);
  }
  else if(t==='slab'){
    /* sheared geometric colour block (hard-edge plane, 15–45°) */
    let sh=Math.tan((el.angle||0)*Math.PI/180)*el.h; sh=Math.max(-el.w*0.5,Math.min(el.w*0.5,sh));
    const quad=(ox,oy)=>{ const a=Math.abs(sh); return sh>=0
      ? `M ${ox+sh} ${oy} L ${ox+el.w} ${oy} L ${ox+el.w-sh} ${oy+el.h} L ${ox} ${oy+el.h} Z`
      : `M ${ox} ${oy} L ${ox+el.w-a} ${oy} L ${ox+el.w} ${oy+el.h} L ${ox+a} ${oy+el.h} Z`; };
    const sObj=window.LIFT[el.lift];
    if(sObj) localPath(quad(0, sObj.dy), tintK(sObj.k));          // plane shadow (matches the screen)
    if(el.echo) localPath(quad(el.echoDx||9, el.echoDy||9), echoColor);
    localPath(quad(0,0), colorForKey(fillKey, accentColor(accentName)));
  }
  else if(t==='stripes'){
    const bgSolid = el.bg && el.bg!=='none';
    if(bgSolid){ liftRect(0,0,el.w,el.h); rect(0,0,el.w,el.h,{ color: el.bg==='ink'?inkColor():whiteColor() }); }
    const col=colorForKey(fillKey, accentColor(accentName)), lay=window.stripeLayout(el);   // clipped polygon bars — matches the screen
    const bandD=(b,dx,dy)=> 'M '+b.map(p=>(p[0]+dx).toFixed(2)+' '+(p[1]+dy).toFixed(2)).join(' L ')+' Z';
    if(el.echo) lay.bands.forEach(b=> localPath(bandD(b, el.echoDx||9, el.echoDy||9), echoColor));
    lay.bands.forEach(b=> localPath(bandD(b,0,0), col));
  }
  else if(t==='dotfield'){
    const bgSolid = el.bg && el.bg!=='none';
    if(bgSolid){ liftRect(0,0,el.w,el.h); rect(0,0,el.w,el.h,{ color: el.bg==='ink'?inkColor():whiteColor() }); }
    const col=colorForKey(fillKey, accentColor(accentName)), lay=window.dotFieldLayout(el), shape=lay.shape;
    const drawDots=(c,dx,dy)=> lay.dots.forEach(p=>{ const r=p.d/2, x=p.x+dx, y=p.y+dy;
      if(shape==='square') rect(x-r, y-r, p.d, p.d, { color:c });
      else if(shape==='diamond') localPath(`M ${x} ${y-r} L ${x+r} ${y} L ${x} ${y+r} L ${x-r} ${y} Z`, c);
      else if(shape==='ring'){ const lw=Math.max(0.5,r*0.5); ellipse(x,y, Math.max(0.3,r-lw/2), Math.max(0.3,r-lw/2), { borderColor:c, borderWidth:lw }); }
      else if(shape==='plus'){ const tk=Math.max(0.4,p.d*0.34); rect(x-r, y-tk/2, p.d, tk, {color:c}); rect(x-tk/2, y-r, tk, p.d, {color:c}); }
      else ellipse(x, y, r, r, { color:c });
    });
    if(el.echo) drawDots(echoColor, el.echoDx||8, el.echoDy||8);
    drawDots(col, 0, 0);
  }
  else if(t==='image'){
    liftRect(0,0,el.w,el.h);                                   // K-tint plane shadow behind the photo
    const png = imgMap && imgMap[el.id];
    if(png){ const bl=place(0,el.h); page.drawImage(png, bm({ x:bl.x, y:bl.y, width:el.w, height:el.h, rotate:ROT })); }
    else rect(0,0,el.w,el.h,{ color:whiteColor(), borderColor:inkColor(), borderWidth:1 });
    if(el.frame){ rect(0,0,el.w,el.h,{ borderColor:inkColor(), borderWidth:el.frameW||3 }); }
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
    const drawW=(c,dx,dy)=> b.wedges.forEach(w=> localPath(`M ${w.cx+dx} ${w.cy+dy} L ${w.p0[0]+dx} ${w.p0[1]+dy} L ${w.p1[0]+dx} ${w.p1[1]+dy} Z`, c));
    if(el.echo) drawW(echoColor, el.echoDx||7, el.echoDy||7);
    drawW(col, 0, 0);
    const hub=el.hub!=null?el.hub:0;
    if(hub>0) ellipse(b.cx, b.cy, b.R*hub, b.R*hub, { color: colorForKey(el.hubFill||'white', whiteColor()) });
  }
  else if(t==='shape'){
    const col=colorForKey(el.fill!=null?el.fill:'blue', accentColor(accentName));
    const strokeCol=colorForKey(el.strokeColor||'ink', inkColor()), sw=el.stroke||0;
    const path=window.shapePath(el.kind||'hexagon', el.w, el.h), s=window.LIFT[el.lift];
    if(path){
      if(s) localPath(path, tintK(s.k), 0, s.dy);
      if(el.echo) localPath(path, echoColor, el.echoDx||7, el.echoDy||7);
      localPath(path, col);
      if(sw>0) localPathStroke(path, strokeCol, sw);
    } else {
      const rx=el.w/2, ry=el.h/2, cxL=el.w/2, cyL=el.h/2;
      if(s) ellipse(cxL, cyL+s.dy, rx, ry, { color:tintK(s.k) });
      if(el.echo) ellipse(cxL+(el.echoDx||7), cyL+(el.echoDy||7), rx, ry, { color:echoColor });
      ellipse(cxL, cyL, rx, ry, { color:col });
      if(sw>0) ellipse(cxL, cyL, Math.max(0.5,rx-sw/2), Math.max(0.5,ry-sw/2), { borderColor:strokeCol, borderWidth:sw });
    }
  }
  else if(t==='arctext'){
    const col=colorForKey(el.fill||'ink', inkColor()), font=fontFor(el.fam||'mont', el.weight||700);
    const lay=window.arcTextLayout(el.text, el.w, el.h, { fontSize:el.fontSize, tracking:el.tracking, flip:el.flip, fam:el.fam, weight:el.weight, radiusAdj:el.radiusAdj, upper:el.upper });
    const co=font.heightAtSize(lay.fontSize,{descender:false})*0.34;   // glyph centre above baseline
    lay.glyphs.forEach(g=>{
      if(g.ch===' ') return;
      const gw=measure(g.ch,font,lay.fontSize,0), C=place(g.x,g.y);
      if(g.ch===STAR_CH){ page.drawSvgPath(window.starPath(0,0,lay.fontSize*0.38), bm({ x:C.x, y:C.y, rotate:degrees(-(r+g.deg)), color:col })); return; }
      const phi=(-(r+g.deg))*Math.PI/180, cosP=Math.cos(phi), sinP=Math.sin(phi);
      const ox=-gw/2, oy=-co;                                          // centre → baseline-left (PDF y-up)
      page.drawText(g.ch, bm({ x:C.x+(ox*cosP-oy*sinP), y:C.y+(ox*sinP+oy*cosP), size:lay.fontSize, font, color:col, rotate:degrees(-(r+g.deg)) }));
    });
  }
  else if(t==='rule'){
    /* one shared layout with the screen (print-data ruleLayout) → identical
       geometry. strokes = polylines, dots = circles, fills = closed polys. */
    const col=colorForKey(el.fill||'ink',inkColor()), lay=window.ruleLayout(el);
    const CAP = L().LineCapStyle ? (lay.cap==='butt'?L().LineCapStyle.Butt:L().LineCapStyle.Round) : null;
    const polyD = pts => 'M '+pts.map(p=>p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' L ');
    const drawLay=(c, dx, dy)=>{
      const o0=place(0,0), off = pts => pts.map(p=>[p[0]+dx, p[1]+dy]);
      lay.strokes.forEach(s=>{ const o={ x:o0.x, y:o0.y, scale:1, rotate:ROT, borderColor:c, borderWidth:lay.w }; if(CAP!=null) o.borderLineCap=CAP; page.drawSvgPath(polyD(off(s.pts)), bm(o)); });
      lay.fills.forEach(f=>{ page.drawSvgPath(polyD(off(f.pts))+' Z', bm({ x:o0.x, y:o0.y, scale:1, rotate:ROT, color:c })); });
      lay.dots.forEach(d=> ellipse(d.x+dx, d.y+dy, d.r, d.r, { color:c }));
    };
    if(el.echo){ const ec = el.echoAccent&&el.echoAccent!=='auto' ? accentColor(el.echoAccent) : accentColor(window.partnerOf(accentName)); drawLay(ec, el.echoDx||5, el.echoDy||5); }
    drawLay(col, 0, 0);
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
    drawSurface();
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
const roundedRectPath = window.roundedRectPath;   // shared geometry lives in print-data.jsx

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
  /* embed photo rasters up front (async) so renderElement can stay synchronous */
  const imgMap={};
  for(const el of (doc.elements||[])){ if(el.type==='image'){ try{ const r=await rasterizeImage(pdf, el, doc.accent); if(r) imgMap[el.id]=r; }catch(e){ console.warn('image embed failed', e); } } }
  const ctx={ B, pageH, fontFor, accentName:doc.accent, imgMap };
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
