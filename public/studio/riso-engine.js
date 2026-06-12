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

  /* ---- source handling ---- */
  let SRC = null; // HTMLImageElement | HTMLCanvasElement
  function setSource(el){ SRC = el; }
  function loadImage(url){
    return new Promise((res,rej)=>{ const im=new Image(); im.crossOrigin='anonymous';
      im.onload=()=>res(im); im.onerror=rej; im.src=url; });
  }

  /* ---- image transform within the frame (pan / zoom / rotate) ----
     scale: multiplier on the cover-fit size (1 = fill); x,y: pan as a
     fraction of the frame; rot: degrees. Set just before render(). */
  let TF = { scale:1, x:0, y:0, rot:0 };
  function setTransform(t){ TF = Object.assign({ scale:1, x:0, y:0, rot:0 }, t||{}); }

  /* cover-fit draw the source into ctx of size w×h, honouring TF */
  function drawCover(ctx,w,h){
    if(!SRC){ ctx.fillStyle='#777'; ctx.fillRect(0,0,w,h); return; }
    const sw=SRC.naturalWidth||SRC.width, sh=SRC.naturalHeight||SRC.height;
    const s=Math.max(w/sw,h/sh)*(TF.scale||1), dw=sw*s, dh=sh*s;
    ctx.save();
    ctx.translate(w/2 + (TF.x||0)*w, h/2 + (TF.y||0)*h);
    if(TF.rot) ctx.rotate(TF.rot*Math.PI/180);
    ctx.drawImage(SRC, -dw/2, -dh/2, dw, dh);
    ctx.restore();
  }

  /* brightness shift (-0.5..0.5), set per render() — applied in lumBuffer */
  let BRIGHT = 0;
  /* soft-focus blur (design px, 520-ref like dot/offset) applied to the source
     BEFORE the press screens it — spreads halftone dots / posterize bands.
     Set per render(). */
  let PREBLUR = 0;

  /* luminance buffer (0..1) at canvas res, with brightness + contrast + gamma */
  function lumBuffer(w,h,contrast){
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const cx=c.getContext('2d',{willReadFrequently:true}); drawCover(cx,w,h);
    blurCanvas(c, PREBLUR);
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
       params: balance (tonal pivot), shadowTint, invert */
  function duotone(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),L=lumBuffer(w,h,o.contrast*1.05);
    const k=Math.pow(4,(o.balance-0.5)*2);             // gamma pivot from tone balance
    const lo = o.paper==='day'? inkBaseRGB(o) : paperRGB(o);
    const hi = o.paper==='day'? paperRGB(o)   : accentRGB(o);
    const loTint = lerp(lo, accentRGB(o), (o.paper==='day'?o.shadowTint:o.shadowTint*0.6));
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<L.length;p++,i+=4){ let l=Math.pow(L[p],k); if(o.invert) l=1-l;
      const c=lerp(loTint,hi,l);
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255; }
    cx.putImageData(out,0,0);
  }

  /* 2 · OFF-REGISTER — two ink passes, offset (the misprint)
       params: offset (distance), angle (deg), spread (coverage) */
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
    function pass(color,ox,oy){
      const lc=document.createElement('canvas'); lc.width=w; lc.height=h;
      const lx=lc.getContext('2d'),id=lx.createImageData(w,h),dd=id.data;
      for(let p=0,i=0;p<L.length;p++,i+=4){ dd[i]=color[0];dd[i+1]=color[1];dd[i+2]=color[2];
        dd[i+3]=Math.round(255*Math.min(1,cov(p)*sp)); }
      lx.putImageData(id,0,0);
      cx.drawImage(lc,ox,oy);
    }
    cx.fillStyle=PAPER[o.paper]; cx.fillRect(0,0,w,h);
    cx.globalCompositeOperation = night? 'screen':'multiply';
    pass(B, dx, dy);
    pass(A, 0, 0);
    cx.globalCompositeOperation='source-over';
  }

  /* 3 · HALFTONE — single ink dot screen sized by luminance
       params: dot (spacing), angle (deg), shape (circle|square|line) */
  function halftone(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const step=Math.max(4, o.dot|0)*(w/520);
    const L=lumBuffer(w,h,o.contrast);
    const night=o.paper==='night';
    const shape=o.shape||'circle';
    cx.fillStyle=PAPER[o.paper]; cx.fillRect(0,0,w,h);
    cx.fillStyle = night? PAL[o.ink] : INK.day;
    const ang=(o.angle!=null?o.angle:-20)*Math.PI/180, cos=Math.cos(ang), sin=Math.sin(ang);
    const diag=Math.ceil(Math.hypot(w,h));
    const sample=(x,y)=>{ x=Math.max(0,Math.min(w-1,x|0)); y=Math.max(0,Math.min(h-1,y|0)); return L[y*w+x]; };
    cx.save(); cx.translate(w/2,h/2); cx.rotate(ang); cx.translate(-w/2,-h/2);
    for(let gy=-diag/2; gy<diag*1.5; gy+=step){
      for(let gx=-diag/2; gx<diag*1.5; gx+=step){
        const sx=(gx-w/2)*cos-(gy-h/2)*sin + w/2;
        const sy=(gx-w/2)*sin+(gy-h/2)*cos + h/2;
        if(sx<0||sx>=w||sy<0||sy>=h) continue;
        const l=sample(sx,sy); const ink= night? l : 1-l;
        if(ink<0.01) continue;
        if(shape==='line'){ const t=Math.sqrt(Math.max(0,ink))*step; cx.fillRect(gx-step/2, gy-t/2, step+1, t); }
        else if(shape==='square'){ const s=Math.sqrt(Math.max(0,ink))*step*1.25; cx.fillRect(gx-s/2,gy-s/2,s,s); }
        else { const r=Math.sqrt(Math.max(0,ink))*step*0.72; if(r<0.4) continue; cx.beginPath(); cx.arc(gx,gy,r,0,7); cx.fill(); }
      }
    }
    cx.restore();
  }

  /* 4 · POSTERIZE — hard tonal bands snapped to a palette ramp */
  function posterize(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),L=lumBuffer(w,h,o.contrast*1.1);
    const n=Math.max(2,o.bands|0);
    stretch(L); // histogram stretch so bands always read regardless of image key
    const stops = o.paper==='day'
      ? [ inkBaseRGB(o), accentRGB(o), lerp(accentRGB(o),paperRGB(o),0.55), paperRGB(o) ]
      : [ paperRGB(o), lerp(paperRGB(o),accentRGB(o),0.5), accentRGB(o), lerp(accentRGB(o),[255,251,241],0.6) ];
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<L.length;p++,i+=4){
      const band=Math.min(n-1,Math.floor(L[p]*n));
      const c=rampSample(stops, n===1?0:band/(n-1));
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
    }
    cx.putImageData(out,0,0);
  }

  /* 5 · INK CUTOUT — single-ink subject knocked out over a solid accent field
       params: threshold, softness, invert */
  function cutout(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),L=stretch(lumBuffer(w,h,o.contrast*1.25));
    const field=accentRGB(o);
    const ink = o.paper==='day'? hex2rgb('#0d0905') : hex2rgb('#fffbf1');
    const thr=o.threshold!=null?o.threshold:0.52, soft=Math.max(0.005,o.softness!=null?o.softness:0.12);
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<L.length;p++,i+=4){
      let a=smooth(thr-soft,thr+soft,L[p]);   // lit subject prints
      if(o.invert) a=1-a;
      const c=lerp(field,ink,a);
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
    }
    cx.putImageData(out,0,0);
  }

  /* 6 · OVERPRINT — two flat ink fields overlap to bloom a third colour
       params: offset, angle (deg), split (gap between the two field thresholds) */
  function overprint(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),L=stretch(lumBuffer(w,h,o.contrast*1.15));
    const night=o.paper==='night';
    const A=accentRGB(o), B=partnerRGB(o);
    const mag=(o.offset!=null?o.offset:8)*(w/520);
    const a=(o.angle!=null?o.angle:45)*Math.PI/180;
    const dx=Math.round(Math.cos(a)*mag), dy=Math.round(Math.sin(a)*mag);
    const split=o.split!=null?o.split:0.16;
    const t1=0.5+split, t2=0.5-split;             // two flat thresholds → solid fields
    function field(color,thr,ox,oy){
      const lc=document.createElement('canvas'); lc.width=w; lc.height=h;
      const lx=lc.getContext('2d'),id=lx.createImageData(w,h),dd=id.data;
      for(let p=0,i=0;p<L.length;p++,i+=4){
        const lit = night? L[p] : 1-L[p];
        const on = smooth(thr-0.06,thr+0.06,lit);
        dd[i]=color[0];dd[i+1]=color[1];dd[i+2]=color[2]; dd[i+3]=Math.round(255*on);
      }
      lx.putImageData(id,0,0); cx.drawImage(lc,ox,oy);
    }
    cx.fillStyle=PAPER[o.paper]; cx.fillRect(0,0,w,h);
    cx.globalCompositeOperation = night? 'screen':'multiply';
    field(B, t2, dx, dy);
    field(A, t1, -dx, 0);
    cx.globalCompositeOperation='source-over';
  }

  const TREATMENTS = { duotone, offregister:offRegister, halftone, posterize, cutout, overprint };

  /* ============================================================
     FINISH PASSES — blur and grain
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
     in the mids; the faint normal pass keeps deep shadows + highlights grainy. */
  function grain(cv, amount, size){
    if(!amount || amount<=0.001) return;
    const w=cv.width, h=cv.height, cx=cv.getContext('2d');
    const s=Math.max(0.5, size||2);
    const nw=Math.max(2,Math.ceil(520/s)), nh=Math.max(2,Math.ceil(nw*h/w));
    const nc=noiseTile(nw,nh);
    cx.save();
    cx.imageSmoothingEnabled=true;
    cx.globalCompositeOperation='soft-light';
    cx.globalAlpha=Math.min(1,amount);
    cx.drawImage(nc,0,0,w,h);
    cx.globalCompositeOperation='source-over';
    cx.globalAlpha=Math.min(1,amount)*0.15;
    cx.drawImage(nc,0,0,w,h);
    cx.restore();
  }

  function render(cv, name, opts){
    const o=Object.assign({ ink:'pink', paper:'night', contrast:1.18, brightness:0, dot:9, bands:4, threshold:0.52,
      softness:0.12, angle:null, balance:0.5, shadowTint:0.18, invert:false, spread:1.25,
      shape:'circle', split:0.16, offset:null, blurUnder:0, blurOver:0, grain:0, grainSize:2 }, opts||{});
    if(o.balance==null) o.balance=0.5; if(o.shadowTint==null) o.shadowTint=0.18;
    BRIGHT = o.brightness||0;
    PREBLUR = o.blurUnder||0;
    cv.getContext('2d').clearRect(0,0,cv.width,cv.height);
    (TREATMENTS[name]||duotone)(cv,o);
    if(o.blurOver>0) blurCanvas(cv, o.blurOver);
    if(o.grain>0) grain(cv, o.grain, o.grainSize!=null?o.grainSize:2);
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

  window.RISO = { PAL, PAPER, PARTNER, setSource, setTransform, loadImage, render, sampleCanvas, grain,
                  get source(){ return SRC; } };
})();
