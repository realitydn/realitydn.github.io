/* ============================================================
   REALITY — RISO PHOTO ENGINE
   Pixel-level riso treatments rendered to <canvas>.
   No deps. Exposes window.RISO.
   ============================================================ */
(function(){
  "use strict";

  /* ---- locked palette (mirror of the system tokens) ---- */
  const PAL = {
    blue:'#18a7e0', green:'#43b02a', yellow:'#fddf00',
    amber:'#fdb515', purple:'#6e3179', pink:'#ed1b72', red:'#ed2224'
  };
  const PAPER = { day:'#fffbf1', night:'#0a0703' };
  const INK   = { day:'#0d0905', night:'#fffbf1' };
  /* warm/cool partner for misregister + overprint passes */
  const PARTNER = { pink:'blue', red:'blue', amber:'purple', yellow:'pink',
                    blue:'pink', green:'purple', purple:'amber' };

  /* ---- color helpers ---- */
  function hex2rgb(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join('');
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  function lerp(a,b,t){ return [ a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t ]; }
  function rampSample(stops,t){ // stops: array of rgb
    if(t<=0) return stops[0]; if(t>=1) return stops[stops.length-1];
    const s=(stops.length-1)*t, i=Math.floor(s); return lerp(stops[i],stops[i+1],s-i);
  }
  function rgbCss(c){ return 'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')'; }
  function inkRGB(key,fallback){ return hex2rgb(PAL[key]||fallback||PAL.pink); }

  /* ---- source handling ---- */
  let SRC = null; // HTMLImageElement | HTMLCanvasElement
  function setSource(el){ SRC = el; }
  /* optional second exposure — blended into the source inside drawCover, so
     every treatment (and the luminance buffer) sees the mixed image */
  let SRC2 = null;
  function setSource2(el){ SRC2 = el; }
  function loadImage(url){
    return new Promise((res,rej)=>{ const im=new Image(); im.crossOrigin='anonymous';
      im.onload=()=>res(im); im.onerror=rej; im.src=url; });
  }

  /* ---- image transform within the frame (pan / zoom / rotate) ----
     scale: multiplier on the cover-fit size (1 = fill); x,y: pan as a
     fraction of the frame; rot: degrees. Set just before render(). */
  let TF = { scale:1, x:0, y:0, rot:0 };
  function setTransform(t){ TF = Object.assign({ scale:1, x:0, y:0, rot:0 }, t||{}); }
  let TF2 = { scale:1, x:0, y:0, rot:0 };
  function setTransform2(t){ TF2 = Object.assign({ scale:1, x:0, y:0, rot:0 }, t||{}); }
  /* second-exposure mix, set per render() */
  let MIX2 = { amount:0, mode:'screen' };

  /* cover-fit draw one source into ctx of size w×h, honouring a transform */
  function drawOne(ctx,w,h,fit,src,tf){
    const sw=src.naturalWidth||src.width, sh=src.naturalHeight||src.height;
    const base = fit==='contain' ? Math.min(w/sw,h/sh) : Math.max(w/sw,h/sh);   // contain = whole mark shows (logos)
    const s=base*(tf.scale||1), dw=sw*s, dh=sh*s;
    ctx.save();
    ctx.translate(w/2 + (tf.x||0)*w, h/2 + (tf.y||0)*h);
    if(tf.rot) ctx.rotate(tf.rot*Math.PI/180);
    ctx.drawImage(src, -dw/2, -dh/2, dw, dh);
    ctx.restore();
  }
  /* what the press photographs: the main image + the optional second exposure */
  function drawCover(ctx,w,h,fit){
    if(!SRC){ ctx.fillStyle='#777'; ctx.fillRect(0,0,w,h); return; }
    drawOne(ctx,w,h,fit,SRC,TF);
    if(SRC2 && MIX2.amount>0.001){
      ctx.save();
      ctx.globalAlpha=Math.min(1,MIX2.amount);
      ctx.globalCompositeOperation=MIX2.mode||'screen';
      drawOne(ctx,w,h,fit,SRC2,TF2);
      ctx.restore();
    }
  }

  /* brightness shift (-0.5..0.5), set per render() — applied in lumBuffer */
  let BRIGHT = 0;
  /* soft-focus blur spec applied to the source BEFORE the press screens it —
     spreads halftone dots / posterize bands. { amount, type, angle, x, y,
     pos, width } — see applyBlur. Set per render(). */
  let PREBLUR = null;
  /* halftone glyph-dot character, set per render() */
  let GLYPH = 'R';

  /* luminance buffer (0..1) at canvas res, with brightness + contrast + gamma.
     extraBlur: additional gaussian (design px) a treatment needs for stable
     edges (contour / outline), on top of the user's soft focus. */
  function lumBuffer(w,h,contrast,extraBlur){
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const cx=c.getContext('2d',{willReadFrequently:true}); drawCover(cx,w,h);
    applyBlur(c, PREBLUR);
    if(extraBlur) blurCanvas(c, extraBlur);
    const d=cx.getImageData(0,0,w,h).data, L=new Float32Array(w*h);
    const k=contrast||1;
    for(let i=0,p=0;i<d.length;i+=4,p++){
      let l=(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])/255;
      l=(l-0.5)*k+0.5+BRIGHT;          // contrast about mid, then brightness
      L[p]=l<0?0:l>1?1:l;
    }
    return L;
  }
  function smooth(e0,e1,x){ const t=Math.max(0,Math.min(1,(x-e0)/(e1-e0))); return t*t*(3-2*t); }
  /* normalize a luminance buffer to span the full 0..1 range (key-independent) */
  function stretch(L){ let mn=1,mx=0; for(let p=0;p<L.length;p++){ if(L[p]<mn)mn=L[p]; if(L[p]>mx)mx=L[p]; }
    const r=Math.max(0.001,mx-mn); for(let p=0;p<L.length;p++) L[p]=(L[p]-mn)/r; return L; }

  /* seeded value noise 0..1 sampled at (x,y), `cell` px blotches — smooth
     organic wobble for torn band edges, inky field texture, roller streaks.
     Always built from the same seed, so re-renders repeat exactly. */
  function valueNoise(w,h,cell,seed){
    const gw=Math.max(2,Math.ceil(w/cell)+2), gh=Math.max(2,Math.ceil(h/cell)+2);
    const rnd=mulberry32(seed||0x51ED), g=new Float32Array(gw*gh);
    for(let i=0;i<g.length;i++) g[i]=rnd();
    return function(x,y){
      const fx=x/cell, fy=y/cell, ix=fx|0, iy=fy|0, tx=fx-ix, ty=fy-iy;
      const sx=tx*tx*(3-2*tx), sy=ty*ty*(3-2*ty);
      const a=g[iy*gw+ix], b=g[iy*gw+ix+1], c=g[(iy+1)*gw+ix], d=g[(iy+1)*gw+ix+1];
      return a+(b-a)*sx+(c-a+(d-b-c+a)*sx)*sy;
    };
  }

  /* ============================================================
     TREATMENTS — each fills `cv` given opts
     opts: { ink, paper('day'|'night'), contrast, dot, bands, threshold }
     ============================================================ */
  function paperRGB(o){ return hex2rgb(PAPER[o.paper]); }
  function inkBaseRGB(o){ return hex2rgb(INK[o.paper]); }
  function accentRGB(o){ return hex2rgb(PAL[o.ink]); }
  /* the second ink: an explicit pick (o.ink2) wins, else the auto partner */
  function partnerRGB(o){ return hex2rgb(PAL[o.ink2] || PAL[PARTNER[o.ink]||'blue']); }

  /* 1 · DUOTONE — luminance lerped between two inks
       params: balance (tonal pivot), shadowTint, invert
       midInk  — optional third ink at the midtones (tritone)
       hiTint / hiInk — split-tone: pull the light end toward a second ink */
  function duotone(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),L=lumBuffer(w,h,o.contrast*1.05);
    const k=Math.pow(4,(o.balance-0.5)*2);             // gamma pivot from tone balance
    const lo = o.paper==='day'? inkBaseRGB(o) : paperRGB(o);
    let hi = o.paper==='day'? paperRGB(o)   : accentRGB(o);
    const loTint = lerp(lo, accentRGB(o), (o.paper==='day'?o.shadowTint:o.shadowTint*0.6));
    if(o.hiTint>0) hi = lerp(hi, hex2rgb(PAL[o.hiInk]||PAL[PARTNER[o.ink]||'blue']), Math.min(1,o.hiTint));
    const stops = o.midInk ? [loTint, inkRGB(o.midInk), hi] : null;   // tritone ramp
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<L.length;p++,i+=4){ let l=Math.pow(L[p],k); if(o.invert) l=1-l;
      const c= stops? rampSample(stops,l) : lerp(loTint,hi,l);
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255; }
    cx.putImageData(out,0,0);
  }

  /* 2 · OFF-REGISTER — two ink passes, offset (the misprint)
       params: offset (distance), angle (deg), spread (coverage)
       ink3  — optional third pass, offset off-axis (three-colour drift)
       ghost — a faint double-hit of the main ink at 1.8× the offset */
  function offRegister(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const L=lumBuffer(w,h,o.contrast*1.1);
    const night=o.paper==='night';
    const cov = p => night? L[p] : 1-L[p];          // where ink lands
    const A=accentRGB(o), B=partnerRGB(o);
    const mag=(o.offset!=null?o.offset:13) * (w/520);
    const a=(o.angle!=null?o.angle:47)*Math.PI/180;
    const dx=Math.round(Math.cos(a)*mag), dy=Math.round(Math.sin(a)*mag);
    const sp=o.spread!=null?o.spread:1.25;
    function pass(color,ox,oy,am){
      const lc=document.createElement('canvas'); lc.width=w; lc.height=h;
      const lx=lc.getContext('2d'),id=lx.createImageData(w,h),dd=id.data;
      const aM=am!=null?am:1;
      for(let p=0,i=0;p<L.length;p++,i+=4){ dd[i]=color[0];dd[i+1]=color[1];dd[i+2]=color[2];
        dd[i+3]=Math.round(255*Math.min(1,cov(p)*sp)*aM); }
      lx.putImageData(id,0,0);
      cx.drawImage(lc,ox,oy);
    }
    cx.fillStyle=PAPER[o.paper]; cx.fillRect(0,0,w,h);
    cx.globalCompositeOperation = night? 'screen':'multiply';
    if(o.ink3) pass(inkRGB(o.ink3), Math.round(Math.cos(a+2.1)*mag*0.8), Math.round(Math.sin(a+2.1)*mag*0.8), 1);
    pass(B, dx, dy);
    if(o.ghost>0) pass(A, Math.round(dx*1.8), Math.round(dy*1.8), Math.min(1,o.ghost)*0.5);
    pass(A, 0, 0);
    cx.globalCompositeOperation='source-over';
  }

  /* one screen dot at (gx,gy); amt = coverage 0..1 already gained */
  function drawDot(cx,shape,gx,gy,amt,step,pucker){
    if(amt<=0) return;
    if(shape==='line'){ const t=amt*step; cx.fillRect(gx-step/2, gy-t/2, step+1, t); return; }
    if(shape==='square'){ const s=amt*step*1.25; cx.fillRect(gx-s/2,gy-s/2,s,s); return; }
    if(shape==='diamond'){ const r=amt*step*0.82; if(r<0.5) return;       // 4-point pucker — concave star vs a flat square
      const pk=pucker!=null?pucker:0.35, p=[[0,-r],[r,0],[0,r],[-r,0]];
      cx.beginPath(); cx.moveTo(gx+p[0][0],gy+p[0][1]);
      for(let k=0;k<4;k++){ const a=p[k], b=p[(k+1)%4];
        cx.quadraticCurveTo(gx+(a[0]+b[0])/2*(1-pk), gy+(a[1]+b[1])/2*(1-pk), gx+b[0], gy+b[1]); }
      cx.closePath(); cx.fill(); return; }
    if(shape==='ring'){ const r=amt*step*0.74; if(r<0.6) return; const lw=Math.max(0.6,r*0.42);
      cx.beginPath(); cx.arc(gx,gy,r,0,7); cx.arc(gx,gy,Math.max(0.05,r-lw),0,7,true); cx.fill('evenodd'); return; }
    if(shape==='cross'){ const s=amt*step*1.15; if(s<0.8) return; const t=Math.max(0.6,s*0.34);
      cx.fillRect(gx-s/2, gy-t/2, s, t); cx.fillRect(gx-t/2, gy-s/2, t, s); return; }
    if(shape==='hex'){ const r=amt*step*0.78; if(r<0.5) return;
      cx.beginPath(); for(let k=0;k<6;k++){ const a=Math.PI/6+k*Math.PI/3;
        const x=gx+Math.cos(a)*r, y=gy+Math.sin(a)*r; k?cx.lineTo(x,y):cx.moveTo(x,y); }
      cx.closePath(); cx.fill(); return; }
    if(shape==='star'){ const r=amt*step*0.9; if(r<0.6) return; const r2=r*0.42;
      cx.beginPath(); for(let k=0;k<10;k++){ const a=-Math.PI/2+k*Math.PI/5, rr=(k%2)?r2:r;
        const x=gx+Math.cos(a)*rr, y=gy+Math.sin(a)*rr; k?cx.lineTo(x,y):cx.moveTo(x,y); }
      cx.closePath(); cx.fill(); return; }
    if(shape==='glyph'){ const s=amt*step*1.5; if(s<3) return;   // the letter IS the dot
      cx.font='800 '+s+"px Montserrat, sans-serif"; cx.textAlign='center'; cx.textBaseline='middle';
      cx.fillText(GLYPH, gx, gy); return; }
    const r=amt*step*0.72; if(r<0.4) return; cx.beginPath(); cx.arc(gx,gy,r,0,7); cx.fill();   // circle
  }

  /* 3 · HALFTONE — rotated dot screen sized by luminance, now in colour.
       inkMode: single (accent) | black (paper's mono ink) | gradient | two (rosette)
       gradient: gradMode tone|frame, gradA/gradB inks, gradAngle (frame)
       field: paper | tint | ink  (+ fieldInk, fieldStrength)
       shape: circle|square|diamond|ring|line · dotGain · jitter · invert
       params: dot (spacing), angle (deg), screenOffset (two-ink) */
  function halftone(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const step=Math.max(4, o.dot|0)*(w/520);
    GLYPH = (o.glyphChar && String(o.glyphChar).trim()) ? String(o.glyphChar).trim().slice(0,2) : 'R';
    const L=lumBuffer(w,h,o.contrast);
    const night=o.paper==='night';
    const shape=o.shape||'circle';
    const mode=o.inkMode||'single';
    const gain=o.dotGain!=null?o.dotGain:1;
    const jit=(o.jitter||0)*step*0.5;            // max wobble: half a cell
    const inv=!!o.invert;
    const pucker=o.pucker!=null?o.pucker:0.35;   // diamond concavity
    const baseAngle=o.angle!=null?o.angle:-20;
    const accent=accentRGB(o), partner=partnerRGB(o), paper=paperRGB(o);

    /* ---- field (the ground the dots print over) ---- */
    const fieldInk = o.fieldInk? inkRGB(o.fieldInk) : accent;
    if(o.field==='ink'){ cx.fillStyle=rgbCss(fieldInk); }
    else if(o.field==='tint'){ const s=Math.max(0,Math.min(1,o.fieldStrength!=null?o.fieldStrength:0.12));
      cx.fillStyle=rgbCss(lerp(paper,fieldInk,s)); }
    else { cx.fillStyle=PAPER[o.paper]; }
    cx.fillRect(0,0,w,h);

    /* draw one rotated screen; `color` is a CSS string (constant) or fn(l,sx,sy) */
    function screen(angleDeg,color,seed){
      const ang=angleDeg*Math.PI/180, cos=Math.cos(ang), sin=Math.sin(ang);
      const diag=Math.ceil(Math.hypot(w,h));
      const rj=mulberry32(seed||0x9E3779B1);
      const fn= typeof color==='function'? color : null;
      if(!fn) cx.fillStyle=color;
      cx.save(); cx.translate(w/2,h/2); cx.rotate(ang); cx.translate(-w/2,-h/2);
      for(let gy=-diag/2; gy<diag*1.5; gy+=step){
        for(let gx=-diag/2; gx<diag*1.5; gx+=step){
          let jx=0,jy=0; if(jit){ jx=(rj()*2-1)*jit; jy=(rj()*2-1)*jit; }   // advance per cell → deterministic
          const sx=(gx-w/2)*cos-(gy-h/2)*sin + w/2;
          const sy=(gx-w/2)*sin+(gy-h/2)*cos + h/2;
          if(sx<0||sx>=w||sy<0||sy>=h) continue;
          const l=L[(sy|0)*w+(sx|0)];
          let ink= night? l : 1-l; if(inv) ink=1-ink;
          if(ink<0.01) continue;
          const amt=Math.sqrt(Math.max(0,ink))*gain;
          if(fn) cx.fillStyle=fn(l,sx,sy);
          drawDot(cx,shape,gx+jx,gy+jy,amt,step,pucker);
        }
      }
      cx.restore();
    }

    if(mode==='two'){
      cx.globalCompositeOperation = night? 'screen':'multiply';
      const off=o.screenOffset!=null?o.screenOffset:30;
      screen(baseAngle,        rgbCss(accent),  0x1f1f1f);
      screen(baseAngle+off,    rgbCss(partner), 0x2e2e2e);
      cx.globalCompositeOperation='source-over';
    } else if(mode==='gradient'){
      const A=inkRGB(o.gradA||o.ink), B=inkRGB(o.gradB|| (PARTNER[o.ink]||'blue'));
      let fn;
      if((o.gradMode||'tone')==='frame'){
        const ga=(o.gradAngle!=null?o.gradAngle:90)*Math.PI/180, gc=Math.cos(ga), gs=Math.sin(ga);
        const D=(w*Math.abs(gc)+h*Math.abs(gs))||1;
        fn=(l,sx,sy)=>{ let t=0.5+((sx-w/2)*gc+(sy-h/2)*gs)/D; t=t<0?0:t>1?1:t; return rgbCss(lerp(A,B,t)); };
      } else { fn=(l)=>rgbCss(lerp(A,B,l)); }                              // by tone: shadow→A, light→B
      screen(baseAngle,fn,0x3a3a3a);
    } else if(mode==='black'){
      screen(baseAngle, INK[o.paper], 0x4b4b4b);                          // mono — paper's own ink
    } else {
      screen(baseAngle, rgbCss(accent), 0x5c5c5c);                        // single accent ink (default)
    }
  }

  /* 4 · POSTERIZE — hard tonal bands snapped to a palette ramp
       bandInks   — per-band ink override (array, dark→light; null = ramp)
       bandJitter — seeded blotch noise on the thresholds: torn, hand-pulled edges */
  function posterize(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),L=lumBuffer(w,h,o.contrast*1.1);
    const n=Math.max(2,o.bands|0);
    stretch(L); // histogram stretch so bands always read regardless of image key
    const stops = o.paper==='day'
      ? [ inkBaseRGB(o), accentRGB(o), lerp(accentRGB(o),paperRGB(o),0.55), paperRGB(o) ]
      : [ paperRGB(o), lerp(paperRGB(o),accentRGB(o),0.5), accentRGB(o), lerp(accentRGB(o),[255,251,241],0.6) ];
    const cols=[]; for(let b=0;b<n;b++){ const key=o.bandInks&&o.bandInks[b];
      cols.push((key&&PAL[key])? inkRGB(key) : rampSample(stops, n===1?0:b/(n-1))); }
    const jit=o.bandJitter||0, nz= jit>0? valueNoise(w,h,Math.max(6,16*(w/520)),0xBADD) : null;
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<L.length;p++,i+=4){
      let l=L[p];
      if(nz) l+=(nz(p%w,(p/w)|0)-0.5)*jit*(1.4/n);
      const band=Math.max(0,Math.min(n-1,Math.floor(l*n)));
      const c=cols[band];
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
    }
    cx.putImageData(out,0,0);
  }

  /* 5 · INK CUTOUT — single-ink subject knocked out over a solid accent field
       params: threshold, softness, invert
       cutEdge / cutEdgeInk — an outline traced along the cut, in a third ink
       cutSlip / cutSlipAngle — the outline slips off-register from the fill */
  function cutout(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),L=stretch(lumBuffer(w,h,o.contrast*1.25));
    const field=accentRGB(o);
    const ink = o.paper==='day'? hex2rgb('#0d0905') : hex2rgb('#fffbf1');
    const thr=o.threshold!=null?o.threshold:0.52, soft=Math.max(0.005,o.softness!=null?o.softness:0.12);
    const eW=o.cutEdge||0;
    const eInk = eW>0 ? inkRGB(o.cutEdgeInk||PARTNER[o.ink]||'blue') : null;
    const sa=(o.cutSlipAngle!=null?o.cutSlipAngle:45)*Math.PI/180, sm=(o.cutSlip||0)*(w/520);
    const sdx=Math.round(Math.cos(sa)*sm), sdy=Math.round(Math.sin(sa)*sm);
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<L.length;p++,i+=4){
      let a=smooth(thr-soft,thr+soft,L[p]);   // lit subject prints
      if(o.invert) a=1-a;
      let c=lerp(field,ink,a);
      if(eW>0){
        const x=p%w, y=(p/w)|0;
        const q=Math.min(h-1,Math.max(0,y-sdy))*w + Math.min(w-1,Math.max(0,x-sdx));
        const l2=L[q];
        const e=smooth(thr-eW,thr,l2)*(1-smooth(thr,thr+eW,l2));   // peaks on the cut
        if(e>0.003) c=lerp(c,eInk,e);
      }
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
    }
    cx.putImageData(out,0,0);
  }

  /* 6 · OVERPRINT — two flat ink fields overlap to bloom a third colour
       params: offset, angle (deg), split (gap between the two field thresholds)
       ink3 — optional third field at the midtone, quarter-turn offset
       fieldTexture — seeded blotch noise thins the ink coverage (roller texture) */
  function overprint(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),L=stretch(lumBuffer(w,h,o.contrast*1.15));
    const night=o.paper==='night';
    const A=accentRGB(o), B=partnerRGB(o);
    const mag=(o.offset!=null?o.offset:8)*(w/520);
    const a=(o.angle!=null?o.angle:45)*Math.PI/180;
    const dx=Math.round(Math.cos(a)*mag), dy=Math.round(Math.sin(a)*mag);
    const split=o.split!=null?o.split:0.16;
    const t1=0.5+split, t2=0.5-split;             // two flat thresholds → solid fields
    const tex=o.fieldTexture||0, nz= tex>0? valueNoise(w,h,Math.max(4,7*(w/520)),0x0F1E1D) : null;
    function field(color,thr,ox,oy){
      const lc=document.createElement('canvas'); lc.width=w; lc.height=h;
      const lx=lc.getContext('2d'),id=lx.createImageData(w,h),dd=id.data;
      for(let p=0,i=0;p<L.length;p++,i+=4){
        const lit = night? L[p] : 1-L[p];
        let on = smooth(thr-0.06,thr+0.06,lit);
        if(nz && on>0.003) on*= 1-tex*(0.2+0.8*nz(p%w,(p/w)|0));
        dd[i]=color[0];dd[i+1]=color[1];dd[i+2]=color[2]; dd[i+3]=Math.round(255*on);
      }
      lx.putImageData(id,0,0); cx.drawImage(lc,ox,oy);
    }
    cx.fillStyle=PAPER[o.paper]; cx.fillRect(0,0,w,h);
    cx.globalCompositeOperation = night? 'screen':'multiply';
    if(o.ink3) field(inkRGB(o.ink3), 0.5, -dy, dx);
    field(B, t2, dx, dy);
    field(A, t1, -dx, 0);
    cx.globalCompositeOperation='source-over';
  }

  /* 7 · UNTREATED — the raw photo in full colour. Brightness/contrast still
       nudge it (via canvas filter), soft-focus + the finish passes still apply.
       Honours the in-frame pan / zoom / rotate like every other treatment. */
  function untreated(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    if(!o.transparent){ cx.fillStyle=o.paperFill||PAPER[o.paper]; cx.fillRect(0,0,w,h); }   // logos keep their alpha; paperFill tints the card
    const canFilter = typeof cx.filter==='string';
    if(canFilter){ const b=1+(o.brightness||0), k=o.contrast||1;
      const sat=o.saturation!=null?o.saturation:1, hue=o.hue||0;
      cx.filter='brightness('+b+') contrast('+k+')'
        +(sat!==1?' saturate('+sat+')':'')+(hue?' hue-rotate('+hue+'deg)':''); }
    drawCover(cx,w,h, o.fit==='contain'?'contain':'cover');                    // logos contain (whole mark, paper around); photos cover
    if(canFilter) cx.filter='none';
    /* temperature: a warm / cool wash pressed over the photo */
    const temp=o.temperature||0;
    if(temp){
      cx.save();
      cx.globalCompositeOperation = o.transparent? 'source-atop' : 'soft-light';
      cx.globalAlpha = Math.min(1,Math.abs(temp)) * (o.transparent?0.3:0.9);
      cx.fillStyle = temp>0 ? '#ff9a3c' : '#3c7dff';
      cx.fillRect(0,0,w,h);
      cx.restore();
    }
    applyBlur(cv, PREBLUR);
  }

  /* 8 · SPOT — a luminance band flooded with solid accent, sitting over either
       a duotone rendering or the raw photo (spotBase). Outside the band you see
       the backdrop; inside, flat accent — a spot-colour pop.
       params: spotLo, spotHi (the band), spotSoft (edge), spotInvert, spotBase */
  function spot(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const L=lumBuffer(w,h,o.contrast);
    const night=o.paper==='night';
    const accent=accentRGB(o);
    const lo=o.spotLo!=null?o.spotLo:0.35, hi=o.spotHi!=null?o.spotHi:0.65;
    const soft=Math.max(0.002,o.spotSoft!=null?o.spotSoft:0.08);
    const base=o.spotBase||'duotone';
    const hueMode = o.spotMode==='hue';                    // pick by the photo's colour, not its tone
    let img=null;
    if(base==='image' || hueMode){                         // sample the raw photo
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      const ix=c.getContext('2d',{willReadFrequently:true});
      ix.fillStyle=PAPER[o.paper]; ix.fillRect(0,0,w,h); drawCover(ix,w,h);
      applyBlur(c, PREBLUR);
      img=ix.getImageData(0,0,w,h).data;
    }
    /* duotone backdrop endpoints — mirror the duotone treatment's day/night feel */
    const k=Math.pow(4,((o.balance!=null?o.balance:0.5)-0.5)*2);
    const dlo = night? paperRGB(o) : lerp(inkBaseRGB(o), accent, (o.shadowTint!=null?o.shadowTint:0.18));
    const dhi = night? accent : paperRGB(o);
    const tgtH=o.spotHue!=null?o.spotHue:340, rng=Math.max(8,o.spotHueRange!=null?o.spotHueRange:45);
    const band2 = !!o.spot2 && !hueMode;
    const lo2=o.spot2Lo!=null?o.spot2Lo:0.7, hi2=o.spot2Hi!=null?o.spot2Hi:0.9;
    const ink2 = band2? inkRGB(o.spot2Ink||PARTNER[o.ink]||'blue') : null;
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<L.length;p++,i+=4){
      const l=L[p];
      let m;
      if(hueMode){
        const r=img[i]/255,g=img[i+1]/255,b=img[i+2]/255;
        const mx=Math.max(r,g,b), mn=Math.min(r,g,b), dd=mx-mn;
        let hd=0; if(dd>0.0001){ if(mx===r) hd=60*(((g-b)/dd)%6); else if(mx===g) hd=60*((b-r)/dd+2); else hd=60*((r-g)/dd+4); if(hd<0) hd+=360; }
        const sat= mx>0? dd/mx : 0;
        let dh=Math.abs(hd-tgtH); if(dh>180) dh=360-dh;
        m = (1-smooth(rng*0.6,rng,dh)) * smooth(0.10,0.30,sat);   // near the hue, and colourful enough
      } else {
        m = smooth(lo-soft,lo+soft,l) * (1-smooth(hi-soft,hi+soft,l));   // band membership
      }
      if(o.spotInvert) m=1-m;
      const bg = base==='image' ? [img[i],img[i+1],img[i+2]] : lerp(dlo,dhi,Math.pow(l,k));
      let c=lerp(bg,accent,m);
      if(band2){
        const m2=smooth(lo2-soft,lo2+soft,l)*(1-smooth(hi2-soft,hi2+soft,l));
        if(m2>0.003) c=lerp(c,ink2,m2);
      }
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
    }
    cx.putImageData(out,0,0);
  }

  /* 9 · DITHER — 1-bit zine screen. Tone is decided on a coarse grid (bayer
       matrix, seeded noise, or serpentine error-diffusion) and upscaled hard,
       so the cells stay square. params: ditherMode, ditherScale, invert,
       inkMode ('single' accent | 'black' mono) */
  const BAYER8=[ [0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],
    [60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],
    [15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21] ];
  function dither(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const cell=Math.max(1,(o.ditherScale||3)*(w/520));
    const rw=Math.max(2,Math.round(w/cell)), rh=Math.max(2,Math.round(h/cell));
    const L=stretch(lumBuffer(rw,rh,o.contrast));
    const night=o.paper==='night';
    const inkC=(o.inkMode==='black')? inkBaseRGB(o) : accentRGB(o);
    const papC=paperRGB(o);
    const mode=o.ditherMode||'bayer';
    const inked=new Uint8Array(rw*rh);
    if(mode==='diffusion'){
      const buf=Float32Array.from(L);
      for(let y=0;y<rh;y++){
        const ltr=(y%2)===0;
        for(let s=0;s<rw;s++){
          const x= ltr? s : rw-1-s, p=y*rw+x;
          const q= buf[p]<0.5? 0:1, err=buf[p]-q;
          inked[p]= night? q : 1-q;                       // ink carries dark on day, light on night
          const dx= ltr?1:-1;
          if(x+dx>=0&&x+dx<rw) buf[p+dx]+=err*7/16;
          if(y+1<rh){
            if(x-dx>=0&&x-dx<rw) buf[p+rw-dx]+=err*3/16;
            buf[p+rw]+=err*5/16;
            if(x+dx>=0&&x+dx<rw) buf[p+rw+dx]+=err*1/16;
          }
        }
      }
    } else {
      const rnd=mulberry32(0xD17E4);
      for(let y=0;y<rh;y++) for(let x=0;x<rw;x++){
        const p=y*rw+x;
        const t= mode==='noise'? rnd() : (BAYER8[y&7][x&7]+0.5)/64;
        const q= L[p]<t? 0:1;
        inked[p]= night? q : 1-q;
      }
    }
    const sm=document.createElement('canvas'); sm.width=rw; sm.height=rh;
    const sx=sm.getContext('2d'), id=sx.createImageData(rw,rh), d=id.data;
    for(let p=0,i=0;p<rw*rh;p++,i+=4){
      let on=inked[p]; if(o.invert) on=1-on;
      const c= on? inkC : papC;
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
    }
    sx.putImageData(id,0,0);
    cx.save(); cx.imageSmoothingEnabled=false; cx.drawImage(sm,0,0,w,h); cx.restore();
  }

  /* 10 · HATCH — engraving: parallel strokes whose weight carries the tone;
        an optional cross pass builds up in the shadows; wobble bends the line
        like a hand-pulled burin. params: hatchSpacing, angle, hatchWeight,
        hatchCross, hatchWobble, inkMode */
  function hatch(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const L=lumBuffer(w,h,o.contrast);
    const night=o.paper==='night';
    const step=Math.max(3,(o.hatchSpacing||9))*(w/520);
    const wgt=o.hatchWeight!=null?o.hatchWeight:1;
    const wob=(o.hatchWobble||0)*step*0.45;
    cx.fillStyle=PAPER[o.paper]; cx.fillRect(0,0,w,h);
    cx.fillStyle=(o.inkMode==='black')? INK[o.paper] : rgbCss(accentRGB(o));
    const sub=Math.max(1.2, step*0.22);
    const baseAng=o.angle!=null?o.angle:-22;
    function pass(angleDeg, shadowOnly, phase){
      const ang=angleDeg*Math.PI/180, cos=Math.cos(ang), sin=Math.sin(ang);
      const diag=Math.ceil(Math.hypot(w,h));
      cx.save(); cx.translate(w/2,h/2); cx.rotate(ang); cx.translate(-w/2,-h/2);
      let row=0;
      for(let gy=-diag/2; gy<diag*1.5; gy+=step, row++){
        const ph=row*2.399+phase;
        for(let gx=-diag/2; gx<diag*1.5; gx+=sub){
          const yy=gy + (wob? Math.sin(gx/(step*2.6)+ph)*wob : 0);
          const sxp=(gx-w/2)*cos-(yy-h/2)*sin + w/2;
          const syp=(gx-w/2)*sin+(yy-h/2)*cos + h/2;
          if(sxp<0||sxp>=w||syp<0||syp>=h) continue;
          const l=L[(syp|0)*w+(sxp|0)];
          let ink= night? l : 1-l;
          if(shadowOnly) ink=Math.max(0, ink*2-1);
          if(ink<0.02) continue;
          const t=Math.min(step*0.92, Math.pow(ink,0.85)*step*wgt);
          if(t<0.35) continue;
          cx.fillRect(gx, yy-t/2, sub+0.6, t);
        }
      }
      cx.restore();
    }
    pass(baseAng, false, 0);
    if(o.hatchCross) pass(baseAng+90, true, 1.7);
  }

  /* 11 · PHOTOCOPY — toner-crushed mono: noise, then an s-curve crush per
        generation (each recopy harder), then roller streaks down the page.
        params: toner, copyNoise, streaks, generations, inkMode */
  function photocopy(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const L=stretch(lumBuffer(w,h,o.contrast));
    const night=o.paper==='night';
    const inkC=(o.inkMode==='single')? accentRGB(o) : inkBaseRGB(o);
    const papC=paperRGB(o);
    const noiseAmt=(o.copyNoise||0)*0.30;
    /* toner speckle sampled from a fixed design-resolution grid (≈1 design px
       cells) — a bare per-device-pixel rnd() would render finer on the 2×
       export than in the 900px preview, breaking WYSIWYG */
    const gw=520, gh=Math.max(2,Math.round(520*h/w)), nb=new Float32Array(gw*gh);
    { const rn=mulberry32(0xC0B1E5); for(let q=0;q<nb.length;q++) nb[q]=rn()*2-1; }
    const gens=Math.max(1,Math.min(5,(o.generations|0)||2));
    const toner=o.toner!=null?o.toner:0.55;
    const streaks=o.streaks||0;
    let sk=null;                                    // 1-D streak profile across x
    if(streaks>0){ const nz=valueNoise(w,2,Math.max(8,26*(w/520)),0x57EA);
      sk=new Float32Array(w); for(let x=0;x<w;x++){ const v=nz(x,0); sk[x]=v*v*streaks*0.5; } }
    const cw=0.5-toner*0.22, bias=(toner-0.5)*0.24;  // harder + darker with more toner
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<L.length;p++,i+=4){
      const x=p%w, y=(p/w)|0;
      let l=L[p] + nb[Math.min(gh-1,(y*gh/h)|0)*gw + Math.min(gw-1,(x*gw/w)|0)]*noiseAmt;
      for(let g=0; g<gens; g++) l=smooth(0.5-cw-bias, 0.5+cw-bias, l);
      if(sk){ const s=sk[x]; l= night? Math.min(1,l+s) : Math.max(0,l-s); }
      const c= night? lerp(papC,inkC,l) : lerp(inkC,papC,l);
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
    }
    cx.putImageData(out,0,0);
  }

  /* Line-art WYSIWYG: edge/boundary detection reads a PER-PIXEL slope, so on a
     wider export the same tonal edge spans more pixels, reads weaker, and drops
     out — the export loses linework the preview showed. The cure is to detect
     on a FIXED-resolution grid (ADET, = the preview cap) and scale the finished
     line mask to the output, so preview and every export width trace identical
     lines. These helpers grow + paint that grid. */
  const ADET = 900;
  function detW(w){ return ADET; }
  function detH(w,h){ return Math.max(2, Math.round(ADET*h/w)); }
  /* grow a 1-bit mask on a gw×gh grid to radius r (contour of the shape only) */
  function dilateMask(mask,gw,gh,r){
    for(let it=1; it<r; it++){
      const m2=new Uint8Array(mask);
      for(let y=1;y<gh-1;y++) for(let x=1;x<gw-1;x++){
        const p=y*gw+x;
        if(mask[p] && !(mask[p-1]&&mask[p+1]&&mask[p-gw]&&mask[p+gw])){ m2[p-1]=1;m2[p+1]=1;m2[p-gw]=1;m2[p+gw]=1; }
      }
      mask=m2;
    }
    return mask;
  }
  /* paint a 1-bit mask as solid ink on its own transparent gw×gh canvas */
  function maskCanvas(mask,gw,gh,inkC){
    const lc=document.createElement('canvas'); lc.width=gw; lc.height=gh;
    const lx=lc.getContext('2d'), id=lx.createImageData(gw,gh), dd=id.data;
    for(let p=0,i=0;p<mask.length;p++,i+=4){ if(mask[p]){ dd[i]=inkC[0];dd[i+1]=inkC[1];dd[i+2]=inkC[2];dd[i+3]=255; } }
    lx.putImageData(id,0,0); return lc;
  }

  /* 12 · CONTOUR — the photo as a topographic map: tonal band boundaries
        traced as ink lines over paper, a faint accent tint, or the full ramp.
        params: bands, contourWeight, contourFill (paper|tint|bands) */
  function contour(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const n=Math.max(2,o.bands|0);
    const accent=accentRGB(o), papC=paperRGB(o);
    const stops = o.paper==='day'
      ? [ inkBaseRGB(o), accent, lerp(accent,papC,0.55), papC ]
      : [ papC, lerp(papC,accent,0.5), accent, lerp(accent,[255,251,241],0.6) ];
    /* fill at full resolution (smooth ground) */
    const Lf=stretch(lumBuffer(w,h,o.contrast*1.1, 2.2));   // pre-smoothed so bands stay clean
    const fill=o.contourFill||'tint';
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<Lf.length;p++,i+=4){
      let c;
      if(fill==='bands') c=rampSample(stops, n===1?0:Math.min(n-1,(Lf[p]*n)|0)/(n-1));
      else if(fill==='tint') c=lerp(papC, accent, 0.06+0.13*(o.paper==='night'? Lf[p] : 1-Lf[p]));
      else c=papC;
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
    }
    cx.putImageData(out,0,0);
    /* boundary lines traced at the fixed detection resolution, scaled to fit */
    const aw=detW(w), ah=detH(w,h);
    const La=stretch(lumBuffer(aw,ah,o.contrast*1.1, 2.2));
    const idx=new Uint8Array(aw*ah);
    for(let p=0;p<La.length;p++) idx[p]=Math.min(n-1,(La[p]*n)|0);
    let mask=new Uint8Array(aw*ah);
    for(let y=0;y<ah-1;y++) for(let x=0;x<aw-1;x++){
      const p=y*aw+x;
      if(idx[p]!==idx[p+1] || idx[p]!==idx[p+aw]) mask[p]=1;
    }
    mask=dilateMask(mask,aw,ah,Math.max(1,Math.round((o.contourWeight||2)*(aw/520))));
    const lineC = (fill==='bands')? inkBaseRGB(o) : accent;   // ramp fill wants mono lines
    cx.imageSmoothingEnabled=true;
    cx.drawImage(maskCanvas(mask,aw,ah,lineC), 0,0, w,h);
  }

  /* 13 · EDGES — ink linework: Sobel edges printed in ink over paper, a pale
        duotone, or the raw photo. params: edgeDetail, edgeThick,
        edgeBackdrop (paper|duotone|image), inkMode */
  function edges(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    /* backdrop at full resolution (stays crisp) */
    if(o.edgeBackdrop==='image'){ untreated(cv, Object.assign({},o,{transparent:false})); }
    else if(o.edgeBackdrop==='duotone'){
      duotone(cv,o);
      cx.save(); cx.globalAlpha=0.5; cx.fillStyle=PAPER[o.paper]; cx.fillRect(0,0,w,h); cx.restore();   // washed pale so the line does the talking
    }
    else { cx.fillStyle=PAPER[o.paper]; cx.fillRect(0,0,w,h); }
    /* Sobel detection on the fixed grid, scaled to the frame — so preview and
       every export width trace the SAME lines (a per-pixel Sobel on the wider
       export reads weaker and drops most of them). */
    const aw=detW(w), ah=detH(w,h);
    const L=stretch(lumBuffer(aw,ah,o.contrast,1.6));
    const detail=o.edgeDetail!=null?o.edgeDetail:0.3;
    const thr=0.9-detail*0.75, tt=thr*thr*0.16;
    let mask=new Uint8Array(aw*ah);
    for(let y=1;y<ah-1;y++) for(let x=1;x<aw-1;x++){
      const p=y*aw+x;
      const gx=L[p-aw+1]+2*L[p+1]+L[p+aw+1]-L[p-aw-1]-2*L[p-1]-L[p+aw-1];
      const gy=L[p+aw-1]+2*L[p+aw]+L[p+aw+1]-L[p-aw-1]-2*L[p-aw]-L[p-aw+1];
      if(gx*gx+gy*gy > tt) mask[p]=1;
    }
    mask=dilateMask(mask,aw,ah,Math.max(1,Math.round((o.edgeThick||2)*(aw/520))));
    const inkC=(o.inkMode==='black')? inkBaseRGB(o) : accentRGB(o);
    cx.imageSmoothingEnabled=true;
    cx.drawImage(maskCanvas(mask,aw,ah,inkC), 0,0, w,h);
  }

  /* 14 · MOSAIC — chunky tiles snapped to the paper→ink ramp, optional grout.
        params: cellSize, mosaicDepth, mosaicGap */
  function mosaic(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const cell=Math.max(3,(o.cellSize||16)*(w/520));
    const rw=Math.max(1,Math.round(w/cell)), rh=Math.max(1,Math.round(h/cell));
    const L=stretch(lumBuffer(rw,rh,o.contrast));
    const n=Math.max(2,Math.min(6,(o.mosaicDepth|0)||4));
    const accent=accentRGB(o), papC=paperRGB(o);
    const stops = o.paper==='day'
      ? [ inkBaseRGB(o), accent, lerp(accent,papC,0.55), papC ]
      : [ papC, lerp(papC,accent,0.5), accent, lerp(accent,[255,251,241],0.6) ];
    cx.fillStyle=PAPER[o.paper]; cx.fillRect(0,0,w,h);
    const gap=Math.min(0.45,o.mosaicGap||0)*Math.min(w/rw,h/rh);
    const cw2=w/rw, ch2=h/rh;
    for(let y=0;y<rh;y++) for(let x=0;x<rw;x++){
      const band=Math.min(n-1,(L[y*rw+x]*n)|0);
      cx.fillStyle=rgbCss(rampSample(stops, n===1?0:band/(n-1)));
      cx.fillRect(x*cw2+gap/2, y*ch2+gap/2, cw2-gap, ch2-gap);
    }
  }

  const TREATMENTS = { duotone, offregister:offRegister, halftone, posterize, cutout, overprint, none:untreated, spot,
                       dither, hatch, photocopy, contour, edges, mosaic };

  /* ============================================================
     FINISH PASSES — blur, grain and the press-artifact stack
     All sizes are design px relative to a 520-wide frame (like
     dot/offset), so previews and 2× exports match exactly.
     ============================================================ */
  /* gaussian-blur a canvas in place; the redraw is overscanned so edges stay
     opaque instead of fading to whatever sits behind the photo */
  function blurCanvas(cv, design){
    if(!design || design<=0) return;
    const w=cv.width, h=cv.height, cx=cv.getContext('2d');
    if(typeof cx.filter!=='string') return;            // no canvas filters — skip
    const b=design*(w/520); if(b<0.3) return;
    const t=document.createElement('canvas'); t.width=w; t.height=h;
    t.getContext('2d').drawImage(cv,0,0);
    const ov=Math.ceil(b*1.5)+2;
    cx.filter='blur('+b+'px)';
    cx.drawImage(t, -ov, -ov, w+2*ov, h+2*ov);
    cx.filter='none';
  }

  /* pad a snapshot with clamped (stretched) edges, so offset / rotated taps
     never expose the void beyond the frame */
  function clampPad(src,P){
    const w=src.width,h=src.height;
    const c=document.createElement('canvas'); c.width=w+2*P; c.height=h+2*P;
    const x=c.getContext('2d');
    x.drawImage(src,P,P);
    x.drawImage(src, 0,0,w,1,   P,0,w,P);       // edges…
    x.drawImage(src, 0,h-1,w,1, P,h+P,w,P);
    x.drawImage(src, 0,0,1,h,   0,P,P,h);
    x.drawImage(src, w-1,0,1,h, w+P,P,P,h);
    x.drawImage(src, 0,0,1,1,     0,0,P,P);     // …and corners
    x.drawImage(src, w-1,0,1,1,   w+P,0,P,P);
    x.drawImage(src, 0,h-1,1,1,   0,h+P,P,P);
    x.drawImage(src, w-1,h-1,1,1, w+P,h+P,P,P);
    return c;
  }

  /* ---- typed blur — one entry point for the soft-focus (under the press)
     and finish (over it) passes.
       spec: { amount, type, angle, x, y, pos, width }
       amount — design px on the 520 grid (DEGREES for 'spin')
       angle  — motion direction / tilt focus-plane axis
       x,y    — zoom & spin pivot, fraction of the frame from centre
       pos,width — where the 'tilt' focus band sits along its axis (0..1)
     Multi-tap types draw the snapshot N times at globalAlpha 1/(i+1) — a
     running average, so the result is the exact mean at full opacity. ---- */
  function applyBlur(cv, spec){
    if(!spec) return;
    const type=spec.type||'gauss', amt=spec.amount||0;
    if(amt<=0) return;
    if(type==='gauss'){ blurCanvas(cv, amt); return; }
    const w=cv.width, h=cv.height, cx=cv.getContext('2d');
    const px=amt*(w/520);
    const snap=document.createElement('canvas'); snap.width=w; snap.height=h;
    snap.getContext('2d').drawImage(cv,0,0);
    const pvx=w/2+(spec.x||0)*w, pvy=h/2+(spec.y||0)*h;

    if(type==='motion'){
      if(px<0.5) return;
      const a=(spec.angle||0)*Math.PI/180, ux=Math.cos(a), uy=Math.sin(a);
      const P=Math.ceil(px/2)+1, ext=clampPad(snap,P);
      const N=Math.max(8,Math.min(36,Math.round(px)));
      for(let i=0;i<N;i++){
        const t=(N===1?0:i/(N-1))-0.5;
        cx.globalAlpha=1/(i+1);
        cx.drawImage(ext, -P+ux*t*px, -P+uy*t*px);
      }
      cx.globalAlpha=1;
      return;
    }
    if(type==='zoom'){
      /* scale is a RATIO — it must come from the dimensionless amount, not px
         (=amt·w/520). Anchored so the frame edge streaks `amt` design-px, so
         preview (900) and export (2×) zoom identically. */
      const maxs=1+amt/260; if(maxs<=1.002) return;
      const N=18;
      for(let i=0;i<N;i++){
        const k=1+(i/(N-1))*(maxs-1);
        cx.globalAlpha=1/(i+1);
        cx.setTransform(k,0,0,k, pvx*(1-k), pvy*(1-k));
        cx.drawImage(snap,0,0);
      }
      cx.setTransform(1,0,0,1,0,0); cx.globalAlpha=1;
      return;
    }
    if(type==='spin'){
      const D=Math.min(60,amt)*Math.PI/180; if(D<0.004) return;   // amount is degrees
      const rmax=Math.max(Math.hypot(pvx,pvy), Math.hypot(w-pvx,pvy), Math.hypot(pvx,h-pvy), Math.hypot(w-pvx,h-pvy));
      const P=Math.ceil(rmax*D/2)+2, ext=clampPad(snap,P);
      const N=Math.max(10,Math.min(30,Math.round(D*57)));
      for(let i=0;i<N;i++){
        const th=((N===1?0:i/(N-1))-0.5)*D;
        cx.globalAlpha=1/(i+1);
        cx.setTransform(1,0,0,1,0,0);
        cx.translate(pvx,pvy); cx.rotate(th); cx.translate(-pvx,-pvy);
        cx.drawImage(ext,-P,-P);
      }
      cx.setTransform(1,0,0,1,0,0); cx.globalAlpha=1;
      return;
    }
    if(type==='lens'){
      if(px<0.5) return;
      const P=Math.ceil(px)+1, ext=clampPad(snap,P);
      const taps=[[0,0]];
      for(let k=0;k<6;k++){ const a=k*Math.PI/3;        taps.push([Math.cos(a)*px*0.55, Math.sin(a)*px*0.55]); }
      for(let k=0;k<12;k++){ const a=k*Math.PI/6+0.26; taps.push([Math.cos(a)*px,      Math.sin(a)*px]); }
      for(let i=0;i<taps.length;i++){
        cx.globalAlpha=1/(i+1);
        cx.drawImage(ext, -P+taps[i][0], -P+taps[i][1]);
      }
      cx.globalAlpha=1;
      return;
    }
    if(type==='tilt'){
      /* a blurred copy shown through a gradient mask — sharp inside the focus
         band, dreamy outside it */
      const B=document.createElement('canvas'); B.width=w; B.height=h;
      B.getContext('2d').drawImage(cv,0,0);
      blurCanvas(B, amt);
      const a=((spec.angle!=null?spec.angle:90))*Math.PI/180;
      const ux=Math.cos(a), uy=Math.sin(a);
      const span=(Math.abs(ux)*w+Math.abs(uy)*h)/2;
      const bx=B.getContext('2d');
      const g=bx.createLinearGradient(w/2-ux*span, h/2-uy*span, w/2+ux*span, h/2+uy*span);
      const pos=spec.pos!=null?spec.pos:0.5, half=(spec.width!=null?spec.width:0.3)/2;
      const soft=half*0.8+0.05;
      let last=0;
      const stop=(t,al)=>{ t=Math.max(last,Math.min(1,Math.max(0,t))); g.addColorStop(t,'rgba(0,0,0,'+al+')'); last=t; };
      stop(0, pos-half-soft<=0 ? 0 : 1);
      stop(pos-half-soft, 1); stop(pos-half, 0);
      stop(pos+half, 0); stop(pos+half+soft, 1);
      stop(1, pos+half+soft>=1 ? 0 : 1);
      bx.save(); bx.globalCompositeOperation='destination-in';
      bx.fillStyle=g; bx.fillRect(0,0,w,h); bx.restore();
      cx.drawImage(B,0,0);
      return;
    }
    blurCanvas(cv, amt);   // unknown type — fall back to gaussian
  }

  /* deterministic film grain — seeded so the pattern never dances between
     re-renders, and the noise tile depends only on grain size (not render
     width), so the export reuses the preview's exact pattern */
  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  let _noise = {};
  function noiseTile(nw,nh){
    const key=nw+'x'+nh;
    if(_noise[key]) return _noise[key];
    if(Object.keys(_noise).length>8) _noise={};
    const c=document.createElement('canvas'); c.width=nw; c.height=nh;
    const x=c.getContext('2d'), id=x.createImageData(nw,nh), d=id.data;
    const rnd=mulberry32(19770604);
    for(let i=0;i<d.length;i+=4){
      const v=((rnd()+rnd()+rnd())/3)*255|0;   // triangular-ish — filmic, not salt & pepper
      d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
    }
    x.putImageData(id,0,0); _noise[key]=c; return c;
  }
  /* amount 0..1, size = clump size in design px. Soft-light carries the tooth
     in the mids; the faint normal pass keeps deep shadows + highlights grainy.
     inkKey tints the noise (ink-coloured grain); blend 'dirty' presses the
     noise in with multiply — press muck rather than film tooth. */
  function grain(cv, amount, size, inkKey, blend){
    if(!amount || amount<=0.001) return;
    const w=cv.width, h=cv.height, cx=cv.getContext('2d');
    const s=Math.max(0.5, size||2);
    const nw=Math.max(2,Math.ceil(520/s)), nh=Math.max(2,Math.ceil(nw*h/w));
    let nc=noiseTile(nw,nh);
    if(inkKey && PAL[inkKey]){
      const t=document.createElement('canvas'); t.width=nw; t.height=nh;
      const tx=t.getContext('2d');
      tx.fillStyle=PAL[inkKey]; tx.fillRect(0,0,nw,nh);
      tx.globalCompositeOperation='luminosity'; tx.drawImage(nc,0,0);   // ink hue, noise tooth
      nc=t;
    }
    cx.save();
    cx.imageSmoothingEnabled=true;
    if(blend==='dirty'){
      cx.globalCompositeOperation='multiply';
      cx.globalAlpha=Math.min(1,amount)*0.6;
      cx.drawImage(nc,0,0,w,h);
      cx.globalCompositeOperation='source-over';
      cx.globalAlpha=Math.min(1,amount)*0.22;
      cx.drawImage(nc,0,0,w,h);
    } else {
      cx.globalCompositeOperation='soft-light';
      cx.globalAlpha=Math.min(1,amount);
      cx.drawImage(nc,0,0,w,h);
      cx.globalCompositeOperation='source-over';
      cx.globalAlpha=Math.min(1,amount)*0.15;
      cx.drawImage(nc,0,0,w,h);
    }
    cx.restore();
  }

  /* ---- the rest of the finish stack ---- */
  /* darken (edge-of-print) falloff; soft = how gradual the roll-off is */
  function vignette(cv, amount, soft){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const s=soft!=null?soft:0.6;
    const r0=Math.min(w,h)*0.5*(1.15-s*0.75), r1=Math.hypot(w,h)*0.62;
    const g=cx.createRadialGradient(w/2,h/2,Math.max(1,r0), w/2,h/2,r1);
    g.addColorStop(0,'rgba(10,7,3,0)'); g.addColorStop(1,'rgba(10,7,3,'+Math.min(1,amount*0.85)+')');
    cx.save(); cx.fillStyle=g; cx.fillRect(0,0,w,h); cx.restore();
  }
  /* anisotropic tooth — one tile stretched along x (laid fibres), a finer one
     along y, both soft-light so it reads as stock, not dirt */
  function paperTexture(cv, amount){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const a=Math.min(1,amount);
    cx.save(); cx.imageSmoothingEnabled=true;
    cx.globalCompositeOperation='soft-light';
    cx.globalAlpha=a*0.55; cx.drawImage(noiseTile(320,64),0,0,w,h);
    cx.globalAlpha=a*0.3;  cx.drawImage(noiseTile(72,280),0,0,w,h);
    cx.restore();
  }
  /* wet-ink swell: 'darken' taps dilate the dark ink (day) / 'lighten' the
     light ink (night), then the softest touch of blur */
  function inkBleed(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const r=Math.max(0.6,(o.inkBleed||0)*3*(w/520));
    const t=document.createElement('canvas'); t.width=w; t.height=h;
    t.getContext('2d').drawImage(cv,0,0);
    cx.save();
    cx.globalCompositeOperation = o.paper==='night' ? 'lighten' : 'darken';
    for(let k=0;k<8;k++){ const a=k*Math.PI/4;
      cx.drawImage(t, Math.cos(a)*r, Math.sin(a)*r); }
    cx.restore();
    blurCanvas(cv, Math.min(1.2,(o.inkBleed||0)*0.9));
  }
  /* seeded specks + hairline scratches — the same dust every render */
  function dust(cv, amount, o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),k=w/520;
    const rnd=mulberry32(0xD057);
    const inkC=INK[o.paper], papC=PAPER[o.paper];
    const n=Math.round(amount*150), ns=Math.round(amount*9);
    cx.save();
    for(let i=0;i<n;i++){
      const x=rnd()*w, y=rnd()*h, r=(0.4+rnd()*1.3)*k;
      cx.globalAlpha=0.18+rnd()*0.5;
      cx.fillStyle= rnd()<0.7? inkC : papC;
      cx.beginPath(); cx.arc(x,y,r,0,7); cx.fill();
    }
    for(let i=0;i<ns;i++){
      const x=rnd()*w, y=rnd()*h, len=(18+rnd()*70)*k, a=rnd()*Math.PI;
      const mx=x+Math.cos(a)*len/2+(rnd()-0.5)*14*k, my=y+Math.sin(a)*len/2+(rnd()-0.5)*14*k;
      cx.globalAlpha=0.14+rnd()*0.3;
      cx.strokeStyle= rnd()<0.6? inkC : papC;
      cx.lineWidth=Math.max(0.5,(0.5+rnd()*0.5)*k);
      cx.beginPath(); cx.moveTo(x,y);
      cx.quadraticCurveTo(mx,my, x+Math.cos(a)*len, y+Math.sin(a)*len); cx.stroke();
    }
    cx.restore();
  }
  /* the whole finished print lands off-centre in its frame, exposing paper */
  function misprint(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const mag=(o.misprint||0)*(w/520); if(mag<0.5) return;
    const a=(o.misprintAngle!=null?o.misprintAngle:-35)*Math.PI/180;
    const t=document.createElement('canvas'); t.width=w; t.height=h;
    t.getContext('2d').drawImage(cv,0,0);
    cx.clearRect(0,0,w,h);
    if(!o.transparent){ cx.fillStyle=PAPER[o.paper]; cx.fillRect(0,0,w,h); }
    cx.drawImage(t, Math.cos(a)*mag, Math.sin(a)*mag);
  }
  /* on a transparent logo the texture passes must stay ON the artwork — take
     an alpha snapshot now, clip back to it after */
  function alphaMaskGuard(cv){
    const m=document.createElement('canvas'); m.width=cv.width; m.height=cv.height;
    m.getContext('2d').drawImage(cv,0,0);
    return function(){
      const cx=cv.getContext('2d');
      cx.save(); cx.globalCompositeOperation='destination-in'; cx.drawImage(m,0,0); cx.restore();
    };
  }

  const RENDER_DEFAULTS = {
    ink:'pink', paper:'night', contrast:1.18, brightness:0, dot:9, bands:4, threshold:0.52,
    softness:0.12, angle:null, balance:0.5, shadowTint:0.18, invert:false, spread:1.25,
    shape:'circle', split:0.16, offset:null, blurUnder:0, blurOver:0, grain:0, grainSize:2,
    inkMode:'single', gradMode:'tone', gradAngle:90, gradA:null, gradB:null, screenOffset:30,
    field:'paper', fieldInk:null, fieldStrength:0.12, dotGain:1, jitter:0, pucker:0.35,
    spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotInvert:false, spotBase:'duotone', transparent:false, fit:'cover', paperFill:null,
    /* deepened treatments */
    saturation:1, hue:0, temperature:0,
    midInk:null, hiTint:0, hiInk:null,
    ink3:null, ghost:0, glyphChar:'R',
    bandInks:null, bandJitter:0,
    cutEdge:0, cutEdgeInk:null, cutSlip:0, cutSlipAngle:45,
    fieldTexture:0,
    spotMode:'tone', spotHue:340, spotHueRange:45, spot2:false, spot2Lo:0.7, spot2Hi:0.9, spot2Ink:null,
    /* new treatments */
    ditherMode:'bayer', ditherScale:3,
    hatchSpacing:9, hatchWeight:1, hatchCross:false, hatchWobble:0.15,
    toner:0.55, copyNoise:0.35, streaks:0.25, generations:2,
    contourWeight:2, contourFill:'tint',
    edgeDetail:0.3, edgeThick:2, edgeBackdrop:'paper',
    cellSize:16, mosaicDepth:4, mosaicGap:0.08,
    /* typed blur, both stages */
    blurUnderType:'gauss', blurUnderAngle:0, blurUnderX:0, blurUnderY:0, blurUnderPos:0.5, blurUnderWidth:0.3,
    blurOverType:'gauss', blurOverAngle:0, blurOverX:0, blurOverY:0, blurOverPos:0.5, blurOverWidth:0.3,
    /* finish stack */
    grainInk:null, grainBlend:'soft',
    vignette:0, vignetteSoft:0.6, paperTex:0, inkBleed:0, dust:0, misprint:0, misprintAngle:-35,
    /* second exposure */
    mix2:0, mix2Mode:'screen'
  };

  function render(cv, name, opts){
    const o=Object.assign({}, RENDER_DEFAULTS, opts||{});
    /* elements saved before a control existed pass undefined — restore the
       default so old docs render, but keep meaningful nulls (auto inks etc.) */
    for(const kk in RENDER_DEFAULTS){ if(o[kk]==null && RENDER_DEFAULTS[kk]!=null) o[kk]=RENDER_DEFAULTS[kk]; }
    if(o.balance==null) o.balance=0.5; if(o.shadowTint==null) o.shadowTint=0.18;
    BRIGHT = o.brightness||0;
    PREBLUR = { amount:o.blurUnder||0, type:o.blurUnderType, angle:o.blurUnderAngle,
                x:o.blurUnderX, y:o.blurUnderY, pos:o.blurUnderPos, width:o.blurUnderWidth };
    MIX2 = { amount: SRC2? (o.mix2||0) : 0, mode:o.mix2Mode||'screen' };
    cv.getContext('2d').clearRect(0,0,cv.width,cv.height);
    (TREATMENTS[name]||duotone)(cv,o);
    /* ---- finish stack: everything below prints over the finished image ---- */
    applyBlur(cv, { amount:o.blurOver||0, type:o.blurOverType, angle:o.blurOverAngle,
                    x:o.blurOverX, y:o.blurOverY, pos:o.blurOverPos, width:o.blurOverWidth });
    const guard = o.transparent? alphaMaskGuard(cv) : null;
    if(o.inkBleed>0) inkBleed(cv,o);
    if(o.grain>0) grain(cv, o.grain, o.grainSize!=null?o.grainSize:2, o.grainInk, o.grainBlend);
    if(o.paperTex>0) paperTexture(cv, o.paperTex);
    if(o.vignette>0) vignette(cv, o.vignette, o.vignetteSoft);
    if(o.dust>0) dust(cv, o.dust, o);
    if(guard) guard();
    if(o.misprint>0) misprint(cv,o);
  }

  /* ============================================================
     SYNTHETIC CLUB IMAGERY — tonal stand-ins until a photo is dropped
     ============================================================ */
  function sampleCanvas(kind,w,h){
    const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,0,h); g.addColorStop(0,'#1c1c26'); g.addColorStop(1,'#0a0a10');
    x.fillStyle=g; x.fillRect(0,0,w,h);
    const beam=(cxp,topw,col,a)=>{ x.save(); x.globalAlpha=a; const gg=x.createLinearGradient(cxp,0,cxp,h*0.95);
      gg.addColorStop(0,col); gg.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=gg;
      x.beginPath(); x.moveTo(cxp-topw/2,0); x.lineTo(cxp+topw/2,0); x.lineTo(cxp+topw*2.4,h); x.lineTo(cxp-topw*2.4,h); x.closePath(); x.fill(); x.restore(); };
    const bokeh=(n,max)=>{ for(let i=0;i<n;i++){ const bx=Math.random()*w,by=Math.random()*h*0.7,r=4+Math.random()*max;
      const rg=x.createRadialGradient(bx,by,0,bx,by,r); const sh=Math.random(); rg.addColorStop(0,'rgba(255,'+(220-sh*120|0)+','+(180-sh*120|0)+','+(0.5+Math.random()*0.4)+')'); rg.addColorStop(1,'rgba(255,200,150,0)');
      x.fillStyle=rg; x.beginPath(); x.arc(bx,by,r,0,7); x.fill(); } };

    if(kind==='spotlight'){
      beam(w*0.42,w*0.16,'rgba(255,210,150,0.9)',0.7);
      beam(w*0.6,w*0.12,'rgba(150,200,255,0.8)',0.55);
      // DJ booth + figure silhouette
      x.fillStyle='#020203';
      x.fillRect(w*0.18,h*0.66,w*0.64,h*0.34);                    // booth
      x.beginPath(); x.ellipse(w*0.5,h*0.5,w*0.11,h*0.1,0,0,7); x.fill();   // head
      x.beginPath(); x.moveTo(w*0.3,h*0.7); x.quadraticCurveTo(w*0.5,h*0.5,w*0.7,h*0.7); x.lineTo(w*0.7,h*0.72); x.lineTo(w*0.3,h*0.72); x.closePath(); x.fill(); // shoulders
      // rim light
      x.save(); x.globalCompositeOperation='lighter'; x.strokeStyle='rgba(255,180,120,0.9)'; x.lineWidth=w*0.012;
      x.beginPath(); x.ellipse(w*0.5,h*0.5,w*0.11,h*0.1,0,Math.PI*1.05,Math.PI*1.9); x.stroke(); x.restore();
      bokeh(26,w*0.05);
    } else if(kind==='crowd'){
      beam(w*0.3,w*0.1,'rgba(120,200,255,0.8)',0.5);
      beam(w*0.7,w*0.1,'rgba(255,120,200,0.8)',0.5);
      const cg=x.createRadialGradient(w*0.5,h*0.2,0,w*0.5,h*0.2,w*0.7); cg.addColorStop(0,'rgba(255,230,180,0.55)'); cg.addColorStop(1,'rgba(0,0,0,0)');
      x.fillStyle=cg; x.fillRect(0,0,w,h);
      x.fillStyle='#020204';
      for(let i=0;i<14;i++){ const hx=w*(0.05+i*0.07)+(Math.random()*20-10), hy=h*(0.72+Math.random()*0.12), r=w*(0.035+Math.random()*0.02);
        x.beginPath(); x.arc(hx,hy,r,0,7); x.fill();
        x.beginPath(); x.moveTo(hx-r*1.6,h); x.quadraticCurveTo(hx,hy+r*0.6,hx+r*1.6,h); x.closePath(); x.fill(); }
      bokeh(40,w*0.045);
    } else { // portrait
      const rg=x.createRadialGradient(w*0.4,h*0.34,0,w*0.5,h*0.45,w*0.75); rg.addColorStop(0,'rgba(255,220,170,0.9)'); rg.addColorStop(0.5,'rgba(120,90,70,0.5)'); rg.addColorStop(1,'rgba(0,0,0,0.1)');
      x.fillStyle=rg; x.fillRect(0,0,w,h);
      // head & shoulders form with smooth tonal falloff
      const hg=x.createRadialGradient(w*0.42,h*0.4,w*0.02,w*0.5,h*0.46,w*0.4); hg.addColorStop(0,'#f2d3ad'); hg.addColorStop(0.55,'#7c5640'); hg.addColorStop(1,'#0a0707');
      x.fillStyle=hg;
      x.beginPath(); x.ellipse(w*0.5,h*0.42,w*0.2,h*0.24,0,0,7); x.fill();
      x.beginPath(); x.moveTo(w*0.2,h); x.quadraticCurveTo(w*0.5,h*0.56,w*0.8,h); x.closePath(); x.fill();
      x.save(); x.globalCompositeOperation='multiply'; const sh=x.createLinearGradient(w,0,0,0); sh.addColorStop(0,'rgba(0,0,0,0.85)'); sh.addColorStop(0.5,'rgba(0,0,0,0)'); x.fillStyle=sh; x.fillRect(0,0,w,h); x.restore();
      bokeh(10,w*0.06);
    }
    // global vignette
    const vg=x.createRadialGradient(w*0.5,h*0.45,w*0.2,w*0.5,h*0.5,w*0.75); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.7)');
    x.fillStyle=vg; x.fillRect(0,0,w,h);
    return c;
  }

  window.RISO = { PAL, PAPER, PARTNER, setSource, setSource2, setTransform, setTransform2, loadImage, render, sampleCanvas, grain,
                  get source(){ return SRC; } };
})();
