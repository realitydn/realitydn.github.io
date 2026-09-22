/* ============================================================
   REALITY — RISO PHOTO ENGINE
   Pixel-level riso treatments rendered to <canvas>.
   Exposes window.RISO. ONE copy, at public/studio-shared/, loaded
   by Poster Studio and Print Studio alike (Print's true-white
   paper is the press's `white` stock, not a fork of this file).

   Depends on riso-press.js (window.RisoPress) loaded first: the
   pure separation / screening / press core that this engine and
   the app's Darkroom both build on. Everything that is physics
   lives there; everything that is a canvas lives here.
   ============================================================ */
(function(){
  "use strict";

  const RP = window.RisoPress;
  if(!RP) throw new Error('riso-engine.js: riso-press.js must be loaded first');

  /* ---- locked palette — the press's tables, one source ----
     PAL: seven accents + the two neutrals (pickable anywhere an ink key is
     stored). PAPER: the stocks, `day`/`night` being the keys the themes map
     to. INK: what the mono drum prints on each stock. */
  const PAL = RP.PAL;
  const PAPER = RP.PAPER;
  const INK   = RP.INK;
  /* warm/cool partner for misregister + overprint passes */
  const PARTNER = RP.PARTNER;

  /* ---- color helpers ---- */
  function hex2rgb(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join('');
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  function lerp(a,b,t){ return [ a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t ]; }
  function rampSample(stops,t){ // stops: array of rgb
    if(t<=0) return stops[0]; if(t>=1) return stops[stops.length-1];
    const s=(stops.length-1)*t, i=Math.floor(s); return lerp(stops[i],stops[i+1],s-i);
  }
  function rgbCss(c){ return 'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')'; }
  function rgbHex(c){ return '#'+[c[0],c[1],c[2]].map(v=>('0'+Math.round(Math.max(0,Math.min(255,v))).toString(16)).slice(-2)).join(''); }
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
  function paperRGB(o){ return hex2rgb(o._stock||PAPER[o.paper]); }
  function inkBaseRGB(o){ return hex2rgb(o._ink||INK[o.paper]); }
  /* ink density — how much ink the plate lays down, 0.4..1. A drum has one
     colour; how DARK it prints is coverage, and yellow is run under-density on
     every real press: at 100% over black it is nearly white in luminance and
     washes a room; at 72% the same drum prints an ochre. Less than full lets
     the stock through — darker on night, paler on day. Ported from the app's
     Darkroom (inkDensity). Absent = 1 = every poster ever saved. */
  function atDensity(rgb,o){
    const d = o.inkDensity!=null ? o.inkDensity : 1;
    if(d>=1) return rgb;
    return lerp(paperRGB(o), rgb, Math.max(0.2, Math.min(1, d)));
  }
  function accentRGB(o){ return atDensity(hex2rgb(PAL[o.ink]), o); }
  /* the second ink: an explicit pick (o.ink2) wins, else the auto partner */
  function partnerRGB(o){ return atDensity(hex2rgb(PAL[o.ink2] || PAL[PARTNER[o.ink]||'blue']), o); }

  /* 1 · DUOTONE — luminance lerped between two inks
       params: balance (tonal pivot), shadowTint, invert
       midInk  — optional third ink at the midtones (tritone)
       hiTint / hiInk — split-tone: pull the light end toward a second ink */
  function duotone(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),L=lumBuffer(w,h,o.contrast*1.05);
    const k=Math.pow(4,(o.balance-0.5)*2);             // gamma pivot from tone balance
    const lo = !o._dark? inkBaseRGB(o) : paperRGB(o);
    let hi = !o._dark? paperRGB(o)   : accentRGB(o);
    const loTint = lerp(lo, accentRGB(o), (!o._dark?o.shadowTint:o.shadowTint*0.6));
    if(o.hiTint>0) hi = lerp(hi, hex2rgb(PAL[o.hiInk]||PAL[PARTNER[o.ink]||'blue']), Math.min(1,o.hiTint));
    /* split tone (the app's two-drum ramp): night runs paper → second ink →
       ink; day runs second ink → ink → paper with NO black plate at all. Wins
       over the older mid-ink tritone when both are set. */
    /* option D — a night poster's duotone is a black plate under an accent
       plate on cream: the shadows in ink, the mids in the accent, the lights
       cream. (The day duotone keeps the accent as a tint in the shadows.) */
    const nightD = o.paper==='night' && !o.stock && !o._dark;
    const stops = o.splitTone
      ? (!o._dark
          ? [ partnerRGB(o), accentRGB(o), paperRGB(o) ]
          : [ lerp(paperRGB(o), partnerRGB(o), o.shadowTint*0.6), partnerRGB(o), accentRGB(o) ])
      : o.midInk ? [loTint, inkRGB(o.midInk), hi]                // tritone ramp
      : nightD ? [ lerp(inkBaseRGB(o), accentRGB(o), o.shadowTint*0.5), accentRGB(o), hi ]
      : null;
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<L.length;p++,i+=4){ let l=Math.pow(L[p],k); if(o.invert) l=1-l;
      const c= stops? rampSample(stops,l) : lerp(loTint,hi,l);
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255; }
    cx.putImageData(out,0,0);
  }

  /* 2 · OFF-REGISTER — two ink passes, offset (the misprint)
       params: offset (distance), angle (deg), spread (coverage)
       ink3  — optional third pass, offset off-axis (three-colour drift)
       ghost — a faint double-hit of the main ink at 1.8× the offset
       sep   — the two plates come from a real separation of the colour
               photograph instead of one luminance buffer read twice
     Retrofit (22.09.26): the offset is a real registration miss — the
     author's shift, plus the press's own drift / skew / stretch when those
     are set — and the passes stack as transmittances on the stock (opaque on
     a dark stock) instead of canvas multiply / screen, so the overlap is the
     colour those two inks actually make. Coverages go through the press
     curve; ink density is coverage. */
  function offRegister(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),K=w/520;
    const night=o._dark;
    const sp=o.spread!=null?o.spread:1.25, dens=o.inkDensity!=null?Math.max(0.2,Math.min(1,o.inkDensity)):1;
    const keyA=o.ink||'pink', keyB=o.ink2||PARTNER[o.ink]||'blue';
    const hexA=PAL[keyA]||PAL.pink, hexB=PAL[keyB]||PAL.blue;
    const so=sepOpts(o);
    let plA, plB;
    if(o.sep){
      const src=rgbBuffer(w,h);
      const sep=RP.separate(src.data,w,h,Object.assign({},so,{ inks:[keyA,keyB], stock:o._stock, opaque:o.opaque, contrast:o.contrast, brightness:o.brightness }));
      plA=sep.plates[0]; plB=sep.plates[1];
      for(let p=0;p<plA.length;p++){ plA[p]=Math.min(1,plA[p]*sp*dens); plB[p]=Math.min(1,plB[p]*sp*dens); }
    } else {
      const L=lumBuffer(w,h,o.contrast*1.1);
      plA=new Float32Array(w*h); plB=plA;
      for(let p=0;p<L.length;p++) plA[p]=Math.min(1,(night? L[p] : 1-L[p])*sp)*dens;
    }
    const mag=(o.offset!=null?o.offset:13)*K, a=(o.angle!=null?o.angle:47)*Math.PI/180;
    const dx=Math.cos(a)*mag, dy=Math.sin(a)*mag;
    /* the press's own miss (drift / skew / stretch, the run) rides on top of
       the author's offset; plate 0 of regSet is always true, so the main ink
       stays where the photo is */
    const regs=RP.regSet(4, so, w, h, K);
    const P=[], H=[], reg=[];
    /* Drum order matters now: a later drum transfers less onto wet ink, and
       an opaque drum covers what is under it. Translucent stock: the MAIN ink
       goes down first at full transfer so the shadows keep its colour and the
       partner is what thins in the overlap (the signature blue-with-pink-
       fringe). Dark stock (opaque): the main ink goes LAST so it is the one
       on top where the two coincide. */
    const opaque = o.opaque!=null ? !!o.opaque : RP.isDark(o._stock);
    const mainReg=regs[0], partReg=Object.assign({},regs[1],{ dx:regs[1].dx+dx, dy:regs[1].dy+dy });
    const pushMain=()=>{ P.push(plA); H.push(hexA); reg.push(mainReg); };
    const pushPart=()=>{ P.push(plB); H.push(hexB); reg.push(partReg); };
    if(o.ink3){ P.push(plA); H.push(PAL[o.ink3]||hexB); reg.push(Object.assign({},regs[3],{ dx:regs[3].dx+Math.cos(a+2.1)*mag*0.8, dy:regs[3].dy+Math.sin(a+2.1)*mag*0.8 })); }
    if(opaque) pushPart(); else pushMain();
    if(o.ghost>0){ const g=Math.min(1,o.ghost)*0.5, pg=new Float32Array(w*h); for(let p=0;p<pg.length;p++) pg[p]=plA[p]*g;
      P.push(pg); H.push(hexA); reg.push(Object.assign({},regs[2],{ dx:regs[2].dx+dx*1.8, dy:regs[2].dy+dy*1.8 })); }
    if(opaque) pushMain(); else pushPart();
    const NK=nightKPlate(w,h,o); if(NK){ P.unshift(NK); H.unshift(PAL.ink); reg.unshift(regs[0]); }
    o._pressed=true;
    const out=cx.createImageData(w,h);
    RP.stackPlates(P, H, o._stock, w, h, Object.assign(so, { reg:reg, opaque:o.opaque }), out.data);
    cx.putImageData(out,0,0);
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
       params: dot (spacing), angle (deg), screenOffset (two-ink)
     Retrofit (22.09.26): the basic dots (circle, square, diamond, line) are
     the press's own per-pixel spot function — antialiased, linking into a
     chain at 50 %, any angle for the same cost — and the tone goes through
     the press curve. `two` is a real two-ink separation of the colour
     photograph, one plate per drum at its own angle, stacked as ink on the
     field, instead of one luminance buffer screened twice. The drawn dots
     (ring, cross, hex, star, letter), gradient inking and hand-set jitter
     keep the per-cell renderer, with the press curve on their tone. */
  const HT_CORE_SHAPES = { circle:'chain', square:'square', diamond:'diamond', line:'line' };
  function halftone(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),K=w/520;
    const step=Math.max(4, o.dot|0)*K;
    GLYPH = (o.glyphChar && String(o.glyphChar).trim()) ? String(o.glyphChar).trim().slice(0,2) : 'R';
    const night=o._dark;
    const shape=o.shape||'circle';
    const mode=o.inkMode||'single';
    const gain=o.dotGain!=null?o.dotGain:1;
    const jit=(o.jitter||0)*step*0.5;            // max wobble: half a cell
    const inv=!!o.invert;
    const pucker=o.pucker!=null?o.pucker:0.35;   // diamond concavity
    const baseAngle=o.angle!=null?o.angle:-20;
    const accent=accentRGB(o), partner=partnerRGB(o), paper=paperRGB(o);
    const dens=o.inkDensity!=null?Math.max(0.2,Math.min(1,o.inkDensity)):1;

    /* ---- field (the ground the dots print over) ---- */
    const fieldInk = o.fieldInk? inkRGB(o.fieldInk) : accent;
    const fieldC = o.field==='ink' ? fieldInk
                 : o.field==='tint' ? lerp(paper, fieldInk, Math.max(0,Math.min(1,o.fieldStrength!=null?o.fieldStrength:0.12)))
                 : paper;
    const fieldHex = rgbHex(fieldC);
    const so=sepOpts(o);
    const tp=RP.pressOpts(so);

    /* ---- the press's own screen: the basic dots, no jitter, one ink or two ---- */
    if(HT_CORE_SHAPES[shape] && !jit && mode!=='gradient'){
      let plates, hexes, angles;
      if(mode==='two'){
        const src=rgbBuffer(w,h);
        const keyB=o.ink2||PARTNER[o.ink]||'blue';
        const sep=RP.separate(src.data,w,h,Object.assign({},so,{ inks:[o.ink||'pink', keyB], stock:fieldHex, opaque:o.opaque, contrast:o.contrast, brightness:o.brightness }));
        plates=sep.plates; hexes=sep.inkHexes;
        angles=[baseAngle, baseAngle+(o.screenOffset!=null?o.screenOffset:30)];
        if(inv) for(const pl of plates) for(let p=0;p<pl.length;p++) pl[p]=1-pl[p];
      } else {
        const L=lumBuffer(w,h,o.contrast), pl=new Float32Array(w*h);
        for(let p=0;p<L.length;p++){ let ink= night? L[p] : 1-L[p]; if(inv) ink=1-ink; pl[p]=Math.min(1,ink*gain); }
        plates=[pl]; hexes=[ mode==='black' ? o._ink : (PAL[o.ink]||PAL.pink) ]; angles=[baseAngle];
      }
      if(dens<1) for(const pl of plates) for(let p=0;p<pl.length;p++) pl[p]*=dens;
      const opaque = o.opaque!=null ? !!o.opaque : RP.isDark(fieldHex);
      const NK=nightKPlate(w,h,o);
      if(NK && !opaque){ plates.unshift(NK); hexes.unshift(PAL.ink); angles.unshift(45); }   // the black drum first, at 45°
      o._pressed=true;
      const out=cx.createImageData(w,h);
      RP.pressPlates({ plates:plates, inkHexes:hexes, inkKeys:null, paperHex:fieldHex, opaque:opaque,
                       o:Object.assign({}, RP.DEFAULTS, so, { screen:'am', shape:HT_CORE_SHAPES[shape], pitch:Math.max(4,o.dot|0), angles:angles, inks:null }) },
                     w, h, out.data);
      cx.putImageData(out,0,0);
      return;
    }

    /* ---- the drawn screen: exotic dots, gradient inking, hand-set jitter ---- */
    const L=lumBuffer(w,h,o.contrast);
    cx.fillStyle=fieldHex; cx.fillRect(0,0,w,h);

    /* draw one rotated screen; `color` is a CSS string (constant) or fn(l,sx,sy) */
    function screen(angleDeg,color,seed){
      const ang=angleDeg*Math.PI/180, cos=Math.cos(ang), sin=Math.sin(ang);
      const diag=Math.ceil(Math.hypot(w,h));
      const rj=mulberry32((seed||0x9E3779B1)+(o.pull|0)*7919);
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
          /* the press curve decides how much ink lands; the dot's area is that
             coverage, so its radius is the square root */
          const cov=RP.press(Math.min(1,ink*gain*dens), tp);
          if(cov<=0.002) continue;
          const amt=Math.sqrt(cov);
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
      screen(baseAngle, o._ink, 0x4b4b4b);                          // mono — paper's own ink
    } else {
      screen(baseAngle, rgbCss(accent), 0x5c5c5c);                        // single accent ink (default)
    }
  }


  /* 4 · POSTERIZE — hard tonal bands snapped to a palette ramp
       bandInks   — per-band ink override (array, dark→light; null = ramp)
       bandJitter — seeded blotch noise on the thresholds: torn, hand-pulled edges */
  function posterize(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),L=lumBuffer(w,h,o.contrast*1.1,(o.toneSmooth||0));
    const n=Math.max(2,o.bands|0);
    stretch(L); // histogram stretch so bands always read regardless of image key
    /* split: the second drum takes the band the paper-tint held — night's second
       step, day's first — so a three-colour banded print is three plates */
    const stops = o.splitTone
      ? (!o._dark
          ? [ partnerRGB(o), accentRGB(o), lerp(accentRGB(o),paperRGB(o),0.55), paperRGB(o) ]
          : [ paperRGB(o), partnerRGB(o), accentRGB(o), lerp(accentRGB(o),[255,251,241],0.6) ])
      : !o._dark
      ? [ inkBaseRGB(o), accentRGB(o), lerp(accentRGB(o),paperRGB(o),0.55), paperRGB(o) ]
      : [ paperRGB(o), lerp(paperRGB(o),accentRGB(o),0.5), accentRGB(o), lerp(accentRGB(o),[255,251,241],0.6) ];
    const cols=[]; for(let b=0;b<n;b++){ const key=o.bandInks&&o.bandInks[b];
      cols.push((key&&PAL[key])? inkRGB(key) : rampSample(stops, n===1?0:b/(n-1))); }
    const jit=o.bandJitter||0, nz= jit>0? valueNoise(w,h,Math.max(6,16*(w/520)),0xBADD+(o.pull|0)*17) : null;
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
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),L=stretch(lumBuffer(w,h,o.contrast*1.25,(o.toneSmooth||0)));
    const field=accentRGB(o);
    const ink = inkBaseRGB(o);
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
       fieldTexture — seeded blotch noise thins the ink coverage (roller texture)
       sep — the fields are cut from a real separation's plates rather than
             from one luminance buffer
     Retrofit (22.09.26): the fields stack as transmittances on the stock —
     and a later drum transfers less onto wet ink — so the overlap is the
     colour those two drums actually make, not what canvas `multiply` makes
     of sRGB bytes. Offsets are registration misses (plus the press's own). */
  function overprint(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),K=w/520;
    const night=o._dark;
    const dens=o.inkDensity!=null?Math.max(0.2,Math.min(1,o.inkDensity)):1;
    const keyA=o.ink||'pink', keyB=o.ink2||PARTNER[o.ink]||'blue';
    const hexA=PAL[keyA]||PAL.pink, hexB=PAL[keyB]||PAL.blue;
    const mag=(o.offset!=null?o.offset:8)*K;
    const a=(o.angle!=null?o.angle:45)*Math.PI/180;
    const dx=Math.cos(a)*mag, dy=Math.sin(a)*mag;
    const split=o.split!=null?o.split:0.16;
    const t1=0.5+split, t2=0.5-split;             // two flat thresholds → solid fields
    const tex=o.fieldTexture||0, nz= tex>0? valueNoise(w,h,Math.max(4,7*K),0x0F1E1D+(o.pull|0)*29) : null;
    const so=sepOpts(o);
    /* what each field is cut from: the luminance (lit → ink), or the
       separation's own plates */
    let srcA, srcB, srcC;
    if(o.sep){
      const src=rgbBuffer(w,h);
      const inks=[keyA,keyB]; if(o.ink3) inks.push(o.ink3);
      const sep=RP.separate(src.data,w,h,Object.assign({},so,{ inks:inks, stock:o._stock, opaque:o.opaque, contrast:o.contrast, brightness:o.brightness }));
      srcA=sep.plates[0]; srcB=sep.plates[1]; srcC=sep.plates[2]||null;
    } else {
      const L=stretch(lumBuffer(w,h,o.contrast*1.15,(o.toneSmooth||0)));
      const lit=new Float32Array(w*h); for(let p=0;p<L.length;p++) lit[p]= night? L[p] : 1-L[p];
      srcA=lit; srcB=lit; srcC=lit;
    }
    function field(src,thr){
      const pl=new Float32Array(w*h);
      for(let p=0;p<pl.length;p++){
        let on=smooth(thr-0.06,thr+0.06,src[p]);
        if(nz && on>0.003) on*= 1-tex*(0.2+0.8*nz(p%w,(p/w)|0));
        pl[p]=on*dens;
      }
      return pl;
    }
    const regs=RP.regSet(3, so, w, h, K);
    const P=[], H=[], reg=[];
    if(o.ink3 && srcC){ P.push(field(srcC, o.sep?0.5:0.5)); H.push(PAL[o.ink3]||hexB); reg.push(Object.assign({},regs[2],{ dx:regs[2].dx-dy, dy:regs[2].dy+dx })); }
    const opaque = o.opaque!=null ? !!o.opaque : RP.isDark(o._stock);
    const fA=()=>{ P.push(field(srcA, o.sep?0.5:t1)); H.push(hexA); reg.push(Object.assign({},regs[0],{ dx:regs[0].dx-dx, dy:regs[0].dy })); };
    const fB=()=>{ P.push(field(srcB, o.sep?0.5:t2)); H.push(hexB); reg.push(Object.assign({},regs[1],{ dx:regs[1].dx+dx, dy:regs[1].dy+dy })); };
    /* the main ink first on translucent stock (it keeps its colour; the
       partner thins in the wet overlap), last on an opaque one (it covers) */
    if(opaque){ fB(); fA(); } else { fA(); fB(); }
    const NK=nightKPlate(w,h,o); if(NK){ P.unshift(NK); H.unshift(PAL.ink); reg.unshift(regs[0]); }
    o._pressed=true;
    const out=cx.createImageData(w,h);
    RP.stackPlates(P, H, o._stock, w, h, Object.assign(so, { reg:reg, opaque:o.opaque }), out.data);
    cx.putImageData(out,0,0);
  }


  /* 7 · UNTREATED — the raw photo in full colour. Brightness/contrast still
       nudge it (via canvas filter), soft-focus + the finish passes still apply.
       Honours the in-frame pan / zoom / rotate like every other treatment. */
  function untreated(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    if(!o.transparent){ cx.fillStyle=o.paperFill||o._stock; cx.fillRect(0,0,w,h); }   // logos keep their alpha; paperFill tints the card
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
    const L=lumBuffer(w,h,o.contrast,(o.toneSmooth||0));
    const night=o._dark;
    const accent=accentRGB(o);
    const lo=o.spotLo!=null?o.spotLo:0.35, hi=o.spotHi!=null?o.spotHi:0.65;
    const soft=Math.max(0.002,o.spotSoft!=null?o.spotSoft:0.08);
    const base=o.spotBase||'duotone';
    const hueMode = o.spotMode==='hue';                    // pick by the photo's colour, not its tone
    let img=null;
    if(base==='image' || hueMode){                         // sample the raw photo
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      const ix=c.getContext('2d',{willReadFrequently:true});
      ix.fillStyle=o._stock; ix.fillRect(0,0,w,h); drawCover(ix,w,h);
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
       matrix, clustered dot, scanlines, seeded noise, or serpentine
       error-diffusion) and upscaled hard, so the cells stay square.
       params: ditherMode (bayer|cluster|lines|noise|diffusion), ditherScale
         ditherAngle — rotates the ordered lattices (bayer / cluster / lines)
         invert, inkMode ('single' accent | 'black' mono | 'gradient' —
         gradA→gradB by gradMode tone|frame, gradAngle)
         field: paper | tint | ink (+ fieldInk, fieldStrength) — the ground */
  const BAYER8=[ [0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],
    [60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],
    [15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21] ];
  function dither(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const cell=Math.max(1,(o.ditherScale||3)*(w/520));
    const rw=Math.max(2,Math.round(w/cell)), rh=Math.max(2,Math.round(h/cell));
    const L=stretch(lumBuffer(rw,rh,o.contrast));
    const night=o._dark;
    const inkC=(o.inkMode==='black')? inkBaseRGB(o) : accentRGB(o);
    /* the ground the screen prints over — paper, an ink tint, or solid ink */
    const fieldInkC = o.fieldInk? inkRGB(o.fieldInk) : accentRGB(o);
    let papC;
    if(o.field==='ink') papC=fieldInkC;
    else if(o.field==='tint'){ const s=Math.max(0,Math.min(1,o.fieldStrength!=null?o.fieldStrength:0.12)); papC=lerp(paperRGB(o),fieldInkC,s); }
    else papC=paperRGB(o);
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
      const rnd=mulberry32(0xD17E4+(o.pull|0)*131);
      const ang=(o.ditherAngle||0)*Math.PI/180, ca=Math.cos(ang), sa=Math.sin(ang);
      for(let y=0;y<rh;y++) for(let x=0;x<rw;x++){
        const p=y*rw+x;
        let t;
        if(mode==='noise') t=rnd();
        else {
          const rx= ca*x+sa*y, ry= -sa*x+ca*y;            // rotate the ordered lattice
          if(mode==='cluster'){
            const P=8, fx=rx-Math.floor(rx/P)*P-P/2, fy=ry-Math.floor(ry/P)*P-P/2;
            t=Math.max(0.02, 1-Math.hypot(fx,fy)/(P*0.62));   // round dots grow from cell centres
          } else if(mode==='lines'){
            const P=4, f=ry-Math.floor(ry/P)*P;
            t=1-Math.abs(f/P*2-1);                            // stripes thicken with tone
          } else {
            t=(BAYER8[((Math.round(ry)%8)+8)%8][((Math.round(rx)%8)+8)%8]+0.5)/64;
          }
        }
        const q= L[p]<t? 0:1;
        inked[p]= night? q : 1-q;
      }
    }
    /* gradient inking — the printed cells ramp A→B by tone or across the frame */
    const grad = o.inkMode==='gradient';
    let gA,gB,gFrame=false,gc=0,gs=0,gD=1;
    if(grad){
      gA=inkRGB(o.gradA||o.ink); gB=inkRGB(o.gradB||PARTNER[o.ink]||'blue');
      gFrame=(o.gradMode||'tone')==='frame';
      if(gFrame){ const ga=(o.gradAngle!=null?o.gradAngle:90)*Math.PI/180; gc=Math.cos(ga); gs=Math.sin(ga); gD=(rw*Math.abs(gc)+rh*Math.abs(gs))||1; }
    }
    const sm=document.createElement('canvas'); sm.width=rw; sm.height=rh;
    const sx=sm.getContext('2d'), id=sx.createImageData(rw,rh), d=id.data;
    for(let p=0,i=0;p<rw*rh;p++,i+=4){
      let on=inked[p]; if(o.invert) on=1-on;
      let c;
      if(!on) c=papC;
      else if(grad){
        if(gFrame){ const x=p%rw, y=(p/rw)|0; let tt=0.5+((x-rw/2)*gc+(y-rh/2)*gs)/gD; tt=tt<0?0:tt>1?1:tt; c=lerp(gA,gB,tt); }
        else c=lerp(gA,gB,L[p]);
      }
      else c=inkC;
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
    }
    sx.putImageData(id,0,0);
    cx.save(); cx.imageSmoothingEnabled=false; cx.drawImage(sm,0,0,w,h); cx.restore();
  }

  /* 10 · HATCH — engraving: parallel strokes whose weight carries the tone;
        an optional cross pass builds up in the shadows; wobble bends the line
        like a hand-pulled burin. params: hatchSpacing, angle, hatchWeight,
        hatchCross, hatchWobble, toneSmooth,
        inkMode ('single' | 'black' | 'gradient' — gradA→gradB by gradMode
        tone|frame, gradAngle),
        field: paper | tint | ink (+ fieldInk, fieldStrength) — the ground */
  function hatch(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const L=lumBuffer(w,h,o.contrast,(o.toneSmooth||0));
    const night=o._dark;
    const step=Math.max(3,(o.hatchSpacing||9))*(w/520);
    const wgt=o.hatchWeight!=null?o.hatchWeight:1;
    const wob=(o.hatchWobble||0)*step*0.45;
    /* the ground the strokes print over — paper, an ink tint, or solid ink */
    const fieldInkC = o.fieldInk? inkRGB(o.fieldInk) : accentRGB(o);
    if(o.field==='ink'){ cx.fillStyle=rgbCss(fieldInkC); }
    else if(o.field==='tint'){ const fs=Math.max(0,Math.min(1,o.fieldStrength!=null?o.fieldStrength:0.12)); cx.fillStyle=rgbCss(lerp(paperRGB(o),fieldInkC,fs)); }
    else { cx.fillStyle=o._stock; }
    cx.fillRect(0,0,w,h);
    /* gradient inking — stroke colour ramps A→B by tone or across the frame */
    const grad = o.inkMode==='gradient';
    let gA,gB,gFrame=false,gc=0,gsn=0,gD=1;
    if(grad){
      gA=inkRGB(o.gradA||o.ink); gB=inkRGB(o.gradB||PARTNER[o.ink]||'blue');
      gFrame=(o.gradMode||'tone')==='frame';
      if(gFrame){ const ga=(o.gradAngle!=null?o.gradAngle:90)*Math.PI/180; gc=Math.cos(ga); gsn=Math.sin(ga); gD=(w*Math.abs(gc)+h*Math.abs(gsn))||1; }
    }
    cx.fillStyle=(o.inkMode==='black')? o._ink : rgbCss(accentRGB(o));
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
          if(grad){
            let tt;
            if(gFrame){ tt=0.5+((sxp-w/2)*gc+(syp-h/2)*gsn)/gD; tt=tt<0?0:tt>1?1:tt; }
            else tt=l;
            cx.fillStyle=rgbCss(lerp(gA,gB,tt));
          }
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
        params: toner, copyNoise, streaks, generations, inkMode
          field 'tint' + fieldInk/fieldStrength — run the toner on coloured stock
     Retrofit (22.09.26) — xerography. A copier moves toner by ELECTRIC
     FIELD, and the field bends at every edge of the charge image: edges
     over-develop into a dark rim (copyEdge — an unsharp mask with a physical
     cause) while the middles of big solids are starved of field and come out
     grey (copyHollow — big blacks develop grey-centred with a hard rim). Toner
     flies off the edge as it transfers (copySatellites), and the drum repeats
     its faults once per circumference (copyDrum / copyDrumPeriod). */
  function photocopy(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),K=w/520;
    const night=o._dark;
    const inkC=(o.inkMode==='single')? accentRGB(o) : inkBaseRGB(o);
    /* tinted copy stock — the page the toner crushes onto */
    let papC=paperRGB(o);
    if(o.field==='tint'){
      const fieldInkC=o.fieldInk? inkRGB(o.fieldInk) : accentRGB(o);
      const fs=Math.max(0,Math.min(1,o.fieldStrength!=null?o.fieldStrength:0.12));
      papC=lerp(papC,fieldInkC,fs);
    }
    const noiseAmt=(o.copyNoise||0)*0.30;
    /* toner speckle sampled from a fixed design-resolution grid (≈1 design px
       cells) — a bare per-device-pixel rnd() would render finer on the 2×
       export than in the 900px preview, breaking WYSIWYG. The same grid
       decides where a satellite lands, for the same reason. */
    const gw=520, gh=Math.max(2,Math.round(520*h/w)), nb=new Float32Array(gw*gh);
    { const rn=mulberry32(0xC0B1E5+(o.pull|0)*331); for(let q=0;q<nb.length;q++) nb[q]=rn()*2-1; }
    const gens=Math.max(1,Math.min(5,(o.generations|0)||2));
    const toner=o.toner!=null?o.toner:0.55;
    const streaks=o.streaks||0;
    const edge=o.copyEdge!=null?o.copyEdge:0.45;            // fringe-field enhancement
    const hollow=o.copyHollow!=null?o.copyHollow:0.35;      // solid-area starvation
    const sat=o.copySatellites!=null?o.copySatellites:0.3;  // toner scatter at edges
    const drumPer=Math.max(8,(o.copyDrumPeriod||150)*K);   // one OPC circumference
    const drumAmt=o.copyDrum!=null?o.copyDrum:0.06;
    let sk=null;                                    // 1-D streak profile across x
    if(streaks>0){ const nz=valueNoise(w,2,Math.max(8,26*K),0x57EA+(o.pull|0)*61);
      sk=new Float32Array(w); for(let x=0;x<w;x++){ const v=nz(x,0); sk[x]=v*v*streaks*0.5; } }
    const cw=0.5-toner*0.22, bias=(toner-0.5)*0.24;  // harder + darker with more toner
    const L=stretch(lumBuffer(w,h,o.contrast));
    /* a blurred copy of the tone gives both the edge term and the
       solid-interior term for the price of one pass */
    let near=null, far=null;
    if(edge>0 || hollow>0 || sat>0){
      const bc=document.createElement('canvas'); bc.width=w; bc.height=h;
      const bx=bc.getContext('2d',{willReadFrequently:true});
      const tmp=bx.createImageData(w,h);
      for(let p=0,i=0;p<L.length;p++,i+=4){ const v=L[p]*255; tmp.data[i]=tmp.data[i+1]=tmp.data[i+2]=v; tmp.data[i+3]=255; }
      bx.putImageData(tmp,0,0);
      const blurTo=(design)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h;
        const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(bc,0,0); blurCanvas(c,design);
        return x.getImageData(0,0,w,h).data; };
      near=blurTo(1.6);      // tight — the fringe field
      far=blurTo(14);        // wide  — "am I inside a big solid?"
    }
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<L.length;p++,i+=4){
      const x=p%w, y=(p/w)|0;
      const gi=Math.min(gh-1,(y*gh/h)|0)*gw + Math.min(gw-1,(x*gw/w)|0);
      let l=L[p] + nb[gi]*noiseAmt;
      if(near){
        /* FRINGE FIELD: the charge image steps at every edge; the field bends
           across the step, over-developing the dark side and starving the
           light one — the crunchy outline on every photocopy */
        const nearV=near[i]/255, farV=far[i]/255;
        if(edge>0) l = l - edge*(nearV-l)*2;
        /* HOLLOW SOLIDS: inside a large dark area the field is weak and
           perpendicular to the plate, so the middle develops LESS toner */
        if(hollow>0){ const inSolid=(1-smooth(0.15,0.55,farV)); l += hollow*inSolid*(1-smooth(0.0,0.35,l))*0.55; }
        for(let g=0; g<gens; g++) l=smooth(0.5-cw-bias, 0.5+cw-bias, l);
        /* SATELLITES: toner flies off during transfer and lands just outside
           the edge it came from */
        if(sat>0){ const grad=Math.abs(nearV-farV); if(grad>0.04 && (nb[gi]+1)*0.5 < sat*grad*0.9) l=l*0.35; }
      } else {
        for(let g=0; g<gens; g++) l=smooth(0.5-cw-bias, 0.5+cw-bias, l);
      }
      /* the drum repeats its faults once per circumference */
      if(drumAmt>0) l*= 1 - drumAmt*0.5*(1+Math.cos(6.2831853*y/drumPer));
      if(sk){ const s=sk[x]; l= night? Math.min(1,l+s) : Math.max(0,l-s); }
      l = l<0?0:l>1?1:l;
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
        params: bands, contourWeight, contourFill (paper|tint|bands)
          contourSmooth — pre-blur (design px) melting detail into clean loops
          contourTint   — strength of the accent tint under the 'tint' fill
          contourLine (auto|ink|black) / contourInk — what the lines print in
          contourSlip / contourSlipAngle — linework off-register from the fill
          contourEcho / contourEchoAngle / contourEchoInk — double-strike
          bandInks — per-band ink override for the 'bands' fill (dark→light) */
  function contour(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const n=Math.max(2,o.bands|0);
    const accent=accentRGB(o), papC=paperRGB(o);
    const stops = !o._dark
      ? [ inkBaseRGB(o), accent, lerp(accent,papC,0.55), papC ]
      : [ papC, lerp(papC,accent,0.5), accent, lerp(accent,[255,251,241],0.6) ];
    const smoothPx = o.contourSmooth!=null ? o.contourSmooth : 2.2;
    /* fill at full resolution (smooth ground) */
    const Lf=stretch(lumBuffer(w,h,o.contrast*1.1, smoothPx));   // pre-smoothed so bands stay clean
    const fill=o.contourFill||'tint';
    const tintHi=o.contourTint!=null?o.contourTint:0.19, tintLo=tintHi*0.32;
    /* the ramp fill honours posterize's per-band ink overrides (dark→light) */
    const cols=[]; if(fill==='bands'){ for(let b=0;b<n;b++){ const key=o.bandInks&&o.bandInks[b];
      cols.push((key&&PAL[key])? inkRGB(key) : rampSample(stops, n===1?0:b/(n-1))); } }
    const out=cx.createImageData(w,h),d=out.data;
    for(let p=0,i=0;p<Lf.length;p++,i+=4){
      let c;
      if(fill==='bands') c=cols[Math.min(n-1,(Lf[p]*n)|0)];
      else if(fill==='tint') c=lerp(papC, accent, tintLo+(tintHi-tintLo)*(o._dark? Lf[p] : 1-Lf[p]));
      else c=papC;
      d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
    }
    cx.putImageData(out,0,0);
    /* boundary lines traced at the fixed detection resolution, scaled to fit */
    const aw=detW(w), ah=detH(w,h);
    const La=stretch(lumBuffer(aw,ah,o.contrast*1.1, smoothPx));
    const idx=new Uint8Array(aw*ah);
    for(let p=0;p<La.length;p++) idx[p]=Math.min(n-1,(La[p]*n)|0);
    let mask=new Uint8Array(aw*ah);
    for(let y=0;y<ah-1;y++) for(let x=0;x<aw-1;x++){
      const p=y*aw+x;
      if(idx[p]!==idx[p+1] || idx[p]!==idx[p+aw]) mask[p]=1;
    }
    mask=dilateMask(mask,aw,ah,Math.max(1,Math.round((o.contourWeight||2)*(aw/520))));
    const lineMode=o.contourLine||'auto';
    const lineC = lineMode==='black' ? inkBaseRGB(o)
                : lineMode==='ink'   ? inkRGB(o.contourInk||o.ink)
                : (fill==='bands')? inkBaseRGB(o) : accent;   // auto: ramp fill wants mono lines
    /* the linework can slip off-register from the fills — same grammar as the
       cutout's outline slip (design px on the 520 grid) */
    const sa=(o.contourSlipAngle!=null?o.contourSlipAngle:45)*Math.PI/180, sm=(o.contourSlip||0)*(w/520);
    const sdx=Math.round(Math.cos(sa)*sm), sdy=Math.round(Math.sin(sa)*sm);
    cx.imageSmoothingEnabled=true;
    /* echo — Outline's double-strike, offset relative to the (slipped) lines */
    const em=(o.contourEcho||0)*(w/520);
    if(em>0){
      const ea=(o.contourEchoAngle!=null?o.contourEchoAngle:45)*Math.PI/180;
      const echoC=inkRGB(o.contourEchoInk||PARTNER[o.ink]||'blue');
      cx.drawImage(maskCanvas(mask,aw,ah,echoC), sdx+Math.round(Math.cos(ea)*em), sdy+Math.round(Math.sin(ea)*em), w,h);
    }
    cx.drawImage(maskCanvas(mask,aw,ah,lineC), sdx, sdy, w,h);
  }

  /* drop 4-connected mask blobs smaller than minPx cells — sweeps the salt
     noise Sobel leaves on skin and sky; pushed hard it keeps only the major
     lines. Runs pre-dilate on the fixed detection grid, so one threshold
     means the same clean-up at every export width. */
  function despeckleMask(mask,gw,gh,minPx){
    const N=gw*gh, seen=new Uint8Array(N), stack=new Int32Array(N), comp=new Int32Array(N);
    const out=new Uint8Array(N);
    for(let p0=0;p0<N;p0++){
      if(!mask[p0]||seen[p0]) continue;
      let top=0,cn=0; seen[p0]=1; stack[top++]=p0;
      while(top){
        const p=stack[--top]; comp[cn++]=p;
        const x=p%gw;
        if(x>0    && mask[p-1]  && !seen[p-1]){  seen[p-1]=1;  stack[top++]=p-1; }
        if(x<gw-1 && mask[p+1]  && !seen[p+1]){  seen[p+1]=1;  stack[top++]=p+1; }
        if(p>=gw  && mask[p-gw] && !seen[p-gw]){ seen[p-gw]=1; stack[top++]=p-gw; }
        if(p<N-gw && mask[p+gw] && !seen[p+gw]){ seen[p+gw]=1; stack[top++]=p+gw; }
      }
      if(cn>=minPx){ for(let i=0;i<cn;i++) out[comp[i]]=1; }
    }
    return out;
  }

  /* 13 · EDGES — ink linework: Sobel edges printed in ink over paper, a solid
        ink field, a pale duotone, or the raw photo.
        params: edgeDetail, edgeThick, edgeBackdrop (paper|ink|duotone|image), inkMode
          edgeInk    — the line ink (default: the main ink)
          fieldInk   — 'ink' backdrop colour; its lines knock out in paper
          edgeWash   — paper wash over duotone/image (null = 0.5 duotone, 0 image)
          edgeSmooth — pre-blur before detection: fewer, more confident lines
          edgeClean  — sweep specks smaller than this many detection cells
          edgeEcho / edgeEchoAngle / edgeEchoInk — double-strike: the same
          linework re-struck off-register in a second ink under the main pass
          edgeSlip / edgeSlipAngle — the whole linework slips off the backdrop */
  function edges(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const backdrop=o.edgeBackdrop||'paper';
    const wash=o.edgeWash!=null?o.edgeWash:(backdrop==='duotone'?0.5:0);
    /* backdrop at full resolution (stays crisp) */
    if(backdrop==='image'){ untreated(cv, Object.assign({},o,{transparent:false})); }
    else if(backdrop==='duotone'){ duotone(cv,o); }
    else if(backdrop==='ink'){ cx.fillStyle=rgbCss(inkRGB(o.fieldInk||o.ink)); cx.fillRect(0,0,w,h); }
    else { cx.fillStyle=o._stock; cx.fillRect(0,0,w,h); }
    if(wash>0 && (backdrop==='duotone'||backdrop==='image')){
      cx.save(); cx.globalAlpha=wash; cx.fillStyle=o._stock; cx.fillRect(0,0,w,h); cx.restore();   // washed pale so the line does the talking
    }
    /* Sobel detection on the fixed grid, scaled to the frame — so preview and
       every export width trace the SAME lines (a per-pixel Sobel on the wider
       export reads weaker and drops most of them). */
    const aw=detW(w), ah=detH(w,h);
    const L=stretch(lumBuffer(aw,ah,o.contrast, o.edgeSmooth!=null?o.edgeSmooth:1.6));
    const detail=o.edgeDetail!=null?o.edgeDetail:0.3;
    const thr=0.9-detail*0.75, tt=thr*thr*0.16;
    let mask=new Uint8Array(aw*ah);
    for(let y=1;y<ah-1;y++) for(let x=1;x<aw-1;x++){
      const p=y*aw+x;
      const gx=L[p-aw+1]+2*L[p+1]+L[p+aw+1]-L[p-aw-1]-2*L[p-1]-L[p+aw-1];
      const gy=L[p+aw-1]+2*L[p+aw]+L[p+aw+1]-L[p-aw-1]-2*L[p-aw]-L[p-aw+1];
      if(gx*gx+gy*gy > tt) mask[p]=1;
    }
    if((o.edgeClean|0)>=2) mask=despeckleMask(mask,aw,ah,o.edgeClean|0);
    mask=dilateMask(mask,aw,ah,Math.max(1,Math.round((o.edgeThick||2)*(aw/520))));
    const inkC = backdrop==='ink' ? paperRGB(o)
               : (o.inkMode==='black')? inkBaseRGB(o) : inkRGB(o.edgeInk||o.ink);
    cx.imageSmoothingEnabled=true;
    /* the whole linework can slip off-register from the backdrop (echo rides along) */
    const sa=(o.edgeSlipAngle!=null?o.edgeSlipAngle:45)*Math.PI/180, sm=(o.edgeSlip||0)*(w/520);
    const sdx=Math.round(Math.cos(sa)*sm), sdy=Math.round(Math.sin(sa)*sm);
    const em=(o.edgeEcho||0)*(w/520);
    if(em>0){
      const ea=(o.edgeEchoAngle!=null?o.edgeEchoAngle:45)*Math.PI/180;
      const echoC=inkRGB(o.edgeEchoInk||PARTNER[o.ink]||'blue');
      cx.drawImage(maskCanvas(mask,aw,ah,echoC), sdx+Math.round(Math.cos(ea)*em), sdy+Math.round(Math.sin(ea)*em), w,h);
    }
    cx.drawImage(maskCanvas(mask,aw,ah,inkC), sdx, sdy, w,h);
  }

  /* 14 · MOSAIC — chunky tiles snapped to the paper→ink ramp, optional grout.
        params: cellSize, mosaicDepth, mosaicGap
          mosaicShape (square|round|diamond) · mosaicBond (grid|brick)
          mosaicJitter — hand-laid wobble (seeded, repeats exactly)
          mosaicGrout (paper|black|accent) — the ground between tiles
          bandInks — per-depth ink override (array, dark→light; null = ramp) */
  function mosaic(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const cell=Math.max(3,(o.cellSize||16)*(w/520));
    const rw=Math.max(1,Math.round(w/cell)), rh=Math.max(1,Math.round(h/cell));
    const L=stretch(lumBuffer(rw,rh,o.contrast));
    const n=Math.max(2,Math.min(6,(o.mosaicDepth|0)||4));
    const accent=accentRGB(o), papC=paperRGB(o);
    const stops = !o._dark
      ? [ inkBaseRGB(o), accent, lerp(accent,papC,0.55), papC ]
      : [ papC, lerp(papC,accent,0.5), accent, lerp(accent,[255,251,241],0.6) ];
    const cols=[]; for(let b=0;b<n;b++){ const key=o.bandInks&&o.bandInks[b];
      cols.push((key&&PAL[key])? inkRGB(key) : rampSample(stops, n===1?0:b/(n-1))); }
    const grout=o.mosaicGrout||'paper';
    cx.fillStyle = grout==='black'? rgbCss(inkBaseRGB(o)) : grout==='accent'? rgbCss(accent) : o._stock;
    cx.fillRect(0,0,w,h);
    const gap=Math.min(0.45,o.mosaicGap||0)*Math.min(w/rw,h/rh);
    const cw2=w/rw, ch2=h/rh;
    const shape=o.mosaicShape||'square';
    const brick=o.mosaicBond==='brick';
    const jit=Math.max(0,Math.min(1,o.mosaicJitter||0));
    const rj=mulberry32(0x7E55E+(o.pull|0)*977);
    for(let y=0;y<rh;y++){
      const off= (brick && (y&1))? 0.5 : 0;               // brick rows shift half a tile
      for(let x=(off? -1:0);x<rw;x++){
        const sxi=Math.max(0,Math.min(rw-1, off? x+1 : x));   // sample at the tile centre
        const band=Math.min(n-1,(L[y*rw+sxi]*n)|0);
        let px=(x+off)*cw2+gap/2, py=y*ch2+gap/2;
        const tw=cw2-gap, th=ch2-gap;
        if(jit>0){ px+=(rj()-0.5)*jit*cw2*0.5; py+=(rj()-0.5)*jit*ch2*0.5; }
        cx.fillStyle=rgbCss(cols[band]);
        if(shape==='round'){ cx.beginPath(); cx.ellipse(px+tw/2,py+th/2,tw/2,th/2,0,0,6.2832); cx.fill(); }
        else if(shape==='diamond'){ cx.beginPath(); cx.moveTo(px+tw/2,py); cx.lineTo(px+tw,py+th/2); cx.lineTo(px+tw/2,py+th); cx.lineTo(px,py+th/2); cx.closePath(); cx.fill(); }
        else cx.fillRect(px,py,tw,th);
      }
    }
  }

  /* 15 · SEPARATION — the press itself. A colour photograph becomes N
        greyscale plates (one per drum), each screened at its own angle and
        printed in its own translucent ink, in its own pass, with its own
        registration error. The default for photos; the fourteen above are
        the specific moves you reach for on purpose. All of the physics is in
        riso-press.js — this function only photographs the source and hands
        the pixels over.
        params (engine names → core names where they differ):
          inks (ordered plate list; null = accent + partner, night adds the
          black plate first) · stock (null = cream, option D) · opaque
          screen (fm|am) · sepShape→shape · pitch · grainPitch · levels
          sepGCR · sepBoost · tac · gain · linear · solidity · ceiling ·
          floor · floodCap · drift · skew · stretch · duo · drumBand→band ·
          drumStreak→streak · starve · wet · pull · pressRun→run · pressOff
          fountainTo/fountainPlate/fountainAngle/fountainSoft → fountain[]
          proofPlate→only · proofGrey→plateGrey · invertSource */
  function sepOpts(o){
    const c = {
      inks: (Array.isArray(o.inks) && o.inks.length) ? o.inks : null,
      ink:o.ink, ink2:o.ink2, paper:o.paper, stock:o.stock||null, opaque:o.opaque,
      sepGCR:o.sepGCR, sepBoost:o.sepBoost, tac:o.tac,
      contrast:o.contrast, brightness:o.brightness, saturation:o.saturation, invertSource:!!o.invertSource,
      screen:o.screen, shape:o.sepShape, pitch:o.pitch, grainPitch:o.grainPitch, levels:o.levels,
      gain:o.gain, linear:o.linear, solidity:o.solidity, ceiling:o.ceiling, floor:o.floor, floodCap:o.floodCap,
      drift:o.drift, driftSeed:o.driftSeed, skew:o.skew, stretch:o.stretch, duo:o.duo,
      band:o.drumBand, bandPeriod:o.bandPeriod, streak:o.drumStreak, starve:o.starve, wet:o.wet,
      pull:o.pull, run:o.pressRun, pressOff:!!o.pressOff,
      only: o.proofPlate!=null && o.proofPlate>=0 ? o.proofPlate : null, plateGrey:!!o.proofGrey,
      screens:o.screens, pitches:o.pitches, designW:520
    };
    /* the inspector offers one split fountain — a second ink loaded on one
       drum — which is the case a shop actually runs */
    if(o.fountainTo){ const f=[]; f[Math.max(0,o.fountainPlate|0)] = { to:o.fountainTo, angle:o.fountainAngle||0, soft:o.fountainSoft!=null?o.fountainSoft:1 }; c.fountain=f; }
    /* undefined dials must not shadow the core's defaults */
    for(const k in c) if(c[k]===undefined) delete c[k];
    return c;
  }
  /* what the press photographs, as RGBA over the stock: the framed source +
     the second exposure + the soft focus, exactly what lumBuffer reads but in
     colour. Transparent pixels (logos) stay transparent — the core treats them
     as paper and the alpha is restored after the press. */
  function rgbBuffer(w,h){
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const cx=c.getContext('2d',{willReadFrequently:true}); drawCover(cx,w,h);
    applyBlur(c, PREBLUR);
    return cx.getImageData(0,0,w,h);
  }
  function separation(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    const src=rgbBuffer(w,h);
    const sep=RP.separate(src.data, w, h, sepOpts(o));
    const out=cx.createImageData(w,h);
    RP.pressPlates(sep, w, h, out.data);
    if(o.transparent){ const s=src.data, d=out.data; for(let i=3;i<d.length;i+=4) d[i]=s[i]; }
    cx.putImageData(out,0,0);
  }
  /* the stock a render sits on, and whether it is dark — read by the finish
     passes (a misprint exposes the STOCK, not the theme paper; on option D a
     night print is on cream). The fourteen still print on the theme paper
     until their retrofit lands. */
  function stockOf(name,o){
    if(name==='separation') return RP.resolveStock(sepOpts(o));
    if(o.stock) return RP.stockHex(o.stock);          // an explicit stock — Print's white sheet, a kraft job
    if(name==='none') return PAPER[o.paper];          // the photo as shot sits on the theme surface
    return PAPER.day;                                 // option D: a press treatment prints on cream, on either theme
  }

  /* ---- the press, under every treatment ----------------------------------
     Retrofit (22.09.26). Each of the fourteen still decides WHAT prints — its
     ramp, its bands, its lines, its screen — and the press decides how the
     ink lands: the finished picture is separated back into plates for the
     inks that treatment used, with the black drum among them, and pressed
     FLAT (no second screen), so the press curve, the registration miss, the
     drum, the run and the proof view apply to all of them alike. On a night
     poster the black plate also carries the photograph's own shadows
     (nightPlate), which is what "riso on cream with a black plate" means:
     the print's darkness follows the subject and reaches the Night surface.
     Treatments that already stack their own plates (halftone's press screen,
     off-register, overprint) skip this and add the night plate themselves. */
  const INK_PROPS=['ink2','ink3','fieldInk','gradA','gradB','cutEdgeInk','edgeInk','edgeEchoInk','contourInk','contourEchoInk','midInk','hiInk','spot2Ink'];
  function plateSetFor(o){
    const set=[];
    const add=k=>{ if(k && PAL[k] && set.indexOf(k)<0 && set.length<5) set.push(k); };
    if(!o._dark) add('ink'); else add('cream');       // the mono drum for this stock
    add(o.ink); add(o.ink2||PARTNER[o.ink]);
    INK_PROPS.forEach(p=>add(o[p]));
    if(o.bandInks) o.bandInks.forEach(add);
    return set;
  }
  /* the night plate: the photograph's shadows in black, on cream. Only for
     the treatments whose print does not already carry the shadows in ink — a
     duotone's ramp, a banded print's darkest band, a cutout's subject and the
     copier's toner are the black plate already; a screen of accent dots, a
     hatch, a line drawing or a two-colour misprint are not, and on a night
     poster they get the photograph's shadows printed under them in black. */
  const NIGHT_K = { halftone:1, dither:1, hatch:1, contour:1, edges:1, offregister:1, overprint:1 };
  function nightKPlate(w,h,o){
    if(o.paper!=='night' || o.stock || o._dark || !NIGHT_K[o._name]) return null;
    const amt=o.nightPlate!=null?o.nightPlate:1; if(amt<=0) return null;
    const L=lumBuffer(w,h,o.contrast), pl=new Float32Array(w*h);
    for(let p=0;p<L.length;p++) pl[p]=Math.min(1, smooth(0.4,0.92,1-L[p])*amt);
    return pl;
  }
  function pressThrough(cv,o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d',{willReadFrequently:true});
    const src=cx.getImageData(0,0,w,h);
    const inks=plateSetFor(o);
    const so=Object.assign(sepOpts(o), { inks:inks, stock:o._stock, opaque:o.opaque, contrast:1, brightness:0, saturation:1,
      invertSource:false, sepBoost:1, sepGCR:0.05, tac:5, flat:true });
    const sep=RP.separate(src.data,w,h,so);
    const K=nightKPlate(w,h,o), ki=inks.indexOf('ink');
    if(K && ki>=0){ const pl=sep.plates[ki]; for(let p=0;p<pl.length;p++) if(K[p]>pl[p]) pl[p]=K[p]; }
    const out=cx.createImageData(w,h);
    RP.pressPlates(sep,w,h,out.data);
    if(o.transparent){ const sd=src.data,d=out.data; for(let i=3;i<d.length;i+=4) d[i]=sd[i]; }
    cx.putImageData(out,0,0);
  }

  /* The plates the press will run for `name` at these dials, as ink keys in
     drum order — what a host's Proof picker lists, so "Plate 2 · Blue" is the
     plate `proofPlate: 1` isolates. No pixels are touched. It MIRRORS the
     stacking in separation / offRegister / overprint / halftone's core screen
     and plateSetFor (everything else, via pressThrough): change a stack order
     there and change it here. [] for 'none', which never meets the press. */
  function platesFor(name, opts){
    const o=Object.assign({}, RENDER_DEFAULTS, opts||{});
    for(const kk in RENDER_DEFAULTS){ if(o[kk]==null && RENDER_DEFAULTS[kk]!=null) o[kk]=RENDER_DEFAULTS[kk]; }
    if(!name || name==='none') return [];
    o._stock=stockOf(name,o); o._dark=RP.isDark(o._stock); o._name=name;
    if(name==='separation') return RP.resolveInks(sepOpts(o));
    const keyA=o.ink||'pink', keyB=o.ink2||PARTNER[o.ink]||'blue';
    const mono = o._dark ? 'cream' : 'ink';
    const nightK = o.paper==='night' && !o.stock && !o._dark && !!NIGHT_K[name] && (o.nightPlate!=null?o.nightPlate:1)>0;
    const stockOpaque = o.opaque!=null ? !!o.opaque : o._dark;
    let L=null;
    if(name==='offregister'){
      L=[]; if(o.ink3) L.push(o.ink3);
      L.push(stockOpaque?keyB:keyA); if(o.ghost>0) L.push(keyA); L.push(stockOpaque?keyA:keyB);
      if(nightK) L.unshift('ink');
    } else if(name==='overprint'){
      L=[]; if(o.ink3) L.push(o.ink3);
      if(stockOpaque) L.push(keyB,keyA); else L.push(keyA,keyB);
      if(nightK) L.unshift('ink');
    } else if(name==='halftone' && HT_CORE_SHAPES[o.shape||'circle'] && !(o.jitter>0) && (o.inkMode||'single')!=='gradient'){
      const mode=o.inkMode||'single';
      L = mode==='two' ? [keyA,keyB] : [mode==='black' ? mono : keyA];
      const fieldDark = (o.field||'paper')==='paper' ? o._dark : (o.field==='ink' && (o.fieldInk||keyA)==='ink');
      if(nightK && !(o.opaque!=null ? !!o.opaque : fieldDark)) L.unshift('ink');
    }
    return L || plateSetFor(o);
  }

  const TREATMENTS = { separation, duotone, offregister:offRegister, halftone, posterize, cutout, overprint, none:untreated, spot,
                       dither, hatch, photocopy, contour, edges, mosaic };

  /* ---- blend modes ----------------------------------------------------
     One channel of a separable blend: backdrop `a` (the photograph showing
     through) under source `b` (the print). W3C compositing formulas, so a
     multiply here matches a multiply anywhere else the operator has used one.
     Ported back from the app's Darkroom (src/lib/riso-photo.ts), which took
     this engine's treatments and finish stack in the first place. */
  function blendChannel(mode,a,b){
    switch(mode){
      case 'multiply':   return a*b;
      case 'screen':     return a+b-a*b;
      case 'overlay':    return a<=0.5 ? 2*a*b : 1-2*(1-a)*(1-b);
      case 'hard-light': return b<=0.5 ? 2*a*b : 1-2*(1-a)*(1-b);
      case 'soft-light': {
        if(b<=0.5) return a-(1-2*b)*a*(1-a);
        const dd = a<=0.25 ? ((16*a-12)*a+4)*a : Math.sqrt(a);
        return a+(2*b-1)*(dd-a);
      }
      case 'darken':     return Math.min(a,b);
      case 'lighten':    return Math.max(a,b);
      default:           return b;                    // 'normal' — opaque ink
    }
  }
  /* Every (backdrop, source) byte pair, precomputed. A blend is three
     evaluations per pixel — near three million on a 900px render — and
     soft-light alone carries a square root. Both inputs are bytes, so the
     whole function is 65,536 answers: one 64KB table built once per mode,
     then a single array read where the arithmetic used to be. */
  const BLEND_LUTS = new Map();
  function blendLut(mode){
    if(!mode || mode==='normal') return null;
    const hit=BLEND_LUTS.get(mode); if(hit) return hit;
    const lut=new Uint8Array(65536);
    for(let base=0;base<256;base++){ const a=base/255;
      for(let src=0;src<256;src++){ const v=blendChannel(mode,a,src/255);
        lut[(base<<8)|src] = v<=0?0 : v>=1?255 : Math.round(v*255); } }
    BLEND_LUTS.set(mode,lut);
    return lut;
  }

  /* ============================================================
     BLEND-THROUGH — print the press over the REAL photo
     ============================================================
     Three decisions, all of them about the photograph under the ink:

       treatStrength  how far towards the print each pixel travels.
       treatWhere     which tonal end the print lands on, feathered on
                      the press's own luminance, so a duotone can sink
                      into just the shadows while faces stay true.
       treatBlend     WHAT the print is mixed towards. 'normal' is the
                      treated pixel itself — opaque ink, the arithmetic
                      this engine has always done. Any other mode
                      composites the print onto the photograph FIRST, so
                      a halftone multiplied over a picture keeps the
                      picture's own tone under the screen instead of
                      replacing it. That is what a screen printed over a
                      photograph actually does, and no amount of
                      strength gets you there — strength only fades.

     `compOrig` splits the two photographs. Normally the picture showing
     through is the same one the press read, so Adjust does two jobs at
     once: it decides what the treatment LOOKS like and it grades
     whatever is left showing. Turn comp on and the two separate — the
     press can read a crushed mono version while the photograph
     underneath stays a full-colour original. With a tonal mask that is
     the one thing the single-layer version cannot do at any setting:
     ink sunk into the shadows, faces still photographic.

     Ported from the app's Darkroom (src/lib/riso-photo.ts). Runs after
     the treatment, before the finish stack — grain, blur and the press
     artifacts still print over the blended result.
     ============================================================ */
  function blendThrough(cv,o){
    const s=o.treatStrength!=null?o.treatStrength:1, where=o.treatWhere||'all';
    const mode=o.treatBlend||'normal', comp=!!o.compOrig;
    /* Opaque ink at full strength everywhere covers the photograph completely:
       every pixel travels the whole way to the treated one, so the loop below
       would copy the treated buffer onto itself. That holds however the photo
       underneath is graded, which is why `compOrig` is deliberately NOT part of
       this test — comping over an original the print hides is a no-op, and
       paying for a second full render to prove it is not. */
    const regionKind = o.treatRegion||'none';
    if(s>=1 && where==='all' && mode==='normal' && regionKind==='none') return;
    const w=cv.width,h=cv.height,cx=cv.getContext('2d',{willReadFrequently:true});
    /* the REGION — a stencil over the print: a disc about a point, a stripe
       through it, or a sweep across the frame, feathered. Where the stencil
       is open the graded photograph shows. Coordinates are fractions of the
       frame from its centre so the same region reads the same at every size.
       Ported from the app's Darkroom (PhotoEdit.region). */
    let rw=null;
    if(regionKind!=='none'){
      rw=new Float32Array(w*h);
      const rcx=(w/2)*(1+(o.regionX||0)), rcy=(h/2)*(1+(o.regionY||0));
      const halfDiag=Math.hypot(w,h)/2, soft=Math.max(0,Math.min(1,o.regionSoft!=null?o.regionSoft:0.5));
      const size=o.regionSize!=null?o.regionSize:0.6, rad=((o.regionAngle||0)*Math.PI)/180;
      const dirX=Math.cos(rad), dirY=Math.sin(rad), inv=!!o.regionInvert;
      for(let y=0,p=0;y<h;y++){ for(let x=0;x<w;x++,p++){
        const dx=x+0.5-rcx, dy=y+0.5-rcy; let wgt;
        if(regionKind==='radial'){ const r=Math.max(1,size*halfDiag); wgt=1-smooth(r*(1-soft), r, Math.hypot(dx,dy)); }
        else if(regionKind==='band'){ const half=Math.max(1,size*(Math.min(w,h)/2)); const dist=Math.abs(dx*-dirY+dy*dirX); wgt=1-smooth(half*(1-soft), half, dist); }
        else { const sd=dx*dirX+dy*dirY; const fz=Math.max(1,soft*halfDiag); wgt=1-smooth(-fz, fz, sd); }
        rw[p]= inv? 1-wgt : wgt;
      } }
    }
    const base=document.createElement('canvas'); base.width=w; base.height=h;
    /* the photo showing THROUGH the print — same framing, second exposure and
       soft focus the press saw, on its own grade when comp is on */
    untreated(base, comp ? Object.assign({}, o, {
      brightness:  o.underBright||0,
      contrast:    o.underContrast!=null?o.underContrast:1,
      saturation:  o.underSat!=null?o.underSat:1,
      hue:         o.underHue||0,
      temperature: o.underTemp||0
    }) : o);
    /* the mask reads the PRESS's luminance: where the ink lands is a property
       of what the press saw, not of how the photo underneath is graded */
    const L=lumBuffer(w,h,1);
    const bd=base.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
    const out=cx.getImageData(0,0,w,h), d=out.data;
    const lut=blendLut(mode);
    for(let p=0,i=0;p<L.length;p++,i+=4){
      let mw=1;
      if(where==='shadows') mw=1-smooth(0.3,0.7,L[p]);
      else if(where==='highlights') mw=smooth(0.3,0.7,L[p]);
      const t=s*mw*(rw?rw[p]:1), u=1-t;
      /* d still holds the TREATED pixel until it is written — read it first.
         Written as t/u rather than the lerp form on purpose: this is exactly
         the arithmetic that shipped, so every poster already saved at a partial
         strength renders byte for byte as it did before the blend modes landed.
         The lerp rounds a hair differently on some inputs. */
      const r = lut? lut[(bd[i]  <<8)|d[i]  ] : d[i];
      const g = lut? lut[(bd[i+1]<<8)|d[i+1]] : d[i+1];
      const b = lut? lut[(bd[i+2]<<8)|d[i+2]] : d[i+2];
      d[i]  =r*t + bd[i]  *u;
      d[i+1]=g*t + bd[i+1]*u;
      d[i+2]=b*t + bd[i+2]*u;
      d[i+3]=d[i+3]*t + bd[i+3]*u;
    }
    cx.putImageData(out,0,0);
  }

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
  function noiseTile(nw,nh,pull){
    const key=nw+'x'+nh+'p'+(pull|0);
    if(_noise[key]) return _noise[key];
    if(Object.keys(_noise).length>8) _noise={};
    const c=document.createElement('canvas'); c.width=nw; c.height=nh;
    const x=c.getContext('2d'), id=x.createImageData(nw,nh), d=id.data;
    const rnd=mulberry32(19770604+(pull|0)*97);
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
  function grain(cv, amount, size, inkKey, blend, pull){
    if(!amount || amount<=0.001) return;
    const w=cv.width, h=cv.height, cx=cv.getContext('2d');
    const s=Math.max(0.5, size||2);
    const nw=Math.max(2,Math.ceil(520/s)), nh=Math.max(2,Math.ceil(nw*h/w));
    let nc=noiseTile(nw,nh,pull);
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
  /* post-press grade — brightness / contrast / saturation over the FINISHED
     print. Unlike the Adjust pass (which changes what the press *sees*) this
     pushes the ink as it landed, so a halftone or duotone can be punched or
     faded without re-screening it. Runs first in the stack, so the artifact
     passes below stay true to the paper. */
  function finishTone(cv,o){
    const b=o.finBright||0, c=o.finContrast!=null?o.finContrast:1, s=o.finSat!=null?o.finSat:1;
    if(Math.abs(b)<0.002 && Math.abs(c-1)<0.005 && Math.abs(s-1)<0.005) return;
    const w=cv.width,h=cv.height,cx=cv.getContext('2d');
    if(typeof cx.filter!=='string') return;            // no canvas filters — skip
    const t=document.createElement('canvas'); t.width=w; t.height=h;
    t.getContext('2d').drawImage(cv,0,0);
    cx.save();
    cx.clearRect(0,0,w,h);
    cx.filter='brightness('+(1+b)+') contrast('+c+') saturate('+s+')';
    cx.drawImage(t,0,0);
    cx.restore();
  }
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
    cx.globalCompositeOperation = (o._dark!=null ? o._dark : o.paper==='night') ? 'lighten' : 'darken';
    for(let k=0;k<8;k++){ const a=k*Math.PI/4;
      cx.drawImage(t, Math.cos(a)*r, Math.sin(a)*r); }
    cx.restore();
    blurCanvas(cv, Math.min(1.2,(o.inkBleed||0)*0.9));
  }
  /* seeded specks + hairline scratches — the same dust every render */
  function dust(cv, amount, o){
    const w=cv.width,h=cv.height,cx=cv.getContext('2d'),k=w/520;
    const rnd=mulberry32(0xD057+(o.pull|0)*43);
    const papC=o._stock||PAPER[o.paper], inkC=o._stock? (o._dark? PAL.cream : PAL.ink) : INK[o.paper];
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
    if(!o.transparent){ cx.fillStyle=o._stock||PAPER[o.paper]; cx.fillRect(0,0,w,h); }
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
    treatStrength:1, treatWhere:'all', treatBlend:'normal',
    /* backfilled from the app's Darkroom, 08.09.26 */
    inkDensity:1, splitTone:false,
    treatRegion:'none', regionX:0, regionY:0, regionSize:0.6, regionSoft:0.5, regionAngle:0, regionInvert:false,
    /* comp over the original — the photo showing through gets its own grade */
    compOrig:false, underBright:0, underContrast:1, underSat:1, underHue:0, underTemp:0,
    ink:'pink', paper:'night', contrast:1.18, brightness:0, dot:9, bands:4, threshold:0.52,
    softness:0.12, angle:null, balance:0.5, shadowTint:0.18, invert:false, spread:1.25,
    shape:'circle', split:0.16, offset:null, blurUnder:0, blurOver:0, grain:0, grainSize:2,
    inkMode:'single', gradMode:'tone', gradAngle:90, gradA:null, gradB:null, screenOffset:30,
    field:'paper', fieldInk:null, fieldStrength:0.12, dotGain:1, jitter:0, pucker:0.35,
    spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotInvert:false, spotBase:'duotone', transparent:false, fit:'cover', paperFill:null,
    /* deepened treatments */
    saturation:1, hue:0, temperature:0, toneSmooth:0,
    midInk:null, hiTint:0, hiInk:null,
    ink3:null, ghost:0, glyphChar:'R',
    bandInks:null, bandJitter:0,
    cutEdge:0, cutEdgeInk:null, cutSlip:0, cutSlipAngle:45,
    fieldTexture:0,
    spotMode:'tone', spotHue:340, spotHueRange:45, spot2:false, spot2Lo:0.7, spot2Hi:0.9, spot2Ink:null,
    /* new treatments */
    ditherMode:'bayer', ditherScale:3, ditherAngle:0,
    hatchSpacing:9, hatchWeight:1, hatchCross:false, hatchWobble:0.15,
    toner:0.55, copyNoise:0.35, streaks:0.25, generations:2,
    /* xerography (retrofit 22.09.26) */
    copyEdge:0.45, copyHollow:0.35, copySatellites:0.3, copyDrum:0.06, copyDrumPeriod:150,
    /* off-register + overprint: plates from a real separation */
    sep:false,
    /* option D: how much of the photograph's shadows the black plate carries on a night poster */
    nightPlate:1,
    contourWeight:2, contourFill:'tint', contourSmooth:2.2, contourTint:0.19,
    contourLine:'auto', contourInk:null, contourSlip:0, contourSlipAngle:45,
    contourEcho:0, contourEchoAngle:45, contourEchoInk:null,
    edgeDetail:0.3, edgeThick:2, edgeBackdrop:'paper', edgeSmooth:1.6, edgeClean:0,
    edgeInk:null, edgeWash:null, edgeEcho:0, edgeEchoAngle:45, edgeEchoInk:null,
    edgeSlip:0, edgeSlipAngle:45,
    cellSize:16, mosaicDepth:4, mosaicGap:0.08,
    mosaicShape:'square', mosaicBond:'grid', mosaicJitter:0, mosaicGrout:'paper',
    /* typed blur, both stages */
    blurUnderType:'gauss', blurUnderAngle:0, blurUnderX:0, blurUnderY:0, blurUnderPos:0.5, blurUnderWidth:0.3,
    blurOverType:'gauss', blurOverAngle:0, blurOverX:0, blurOverY:0, blurOverPos:0.5, blurOverWidth:0.3,
    /* finish stack */
    grainInk:null, grainBlend:'soft',
    finBright:0, finContrast:1, finSat:1,
    vignette:0, vignetteSoft:0.6, paperTex:0, inkBleed:0, dust:0, misprint:0, misprintAngle:-35,
    /* second exposure */
    mix2:0, mix2Mode:'screen',
    /* the separation (15) — see sepOpts for the core names; null = the
       core's own default (riso-press.js DEFAULTS), which the paper decides
       for the inks, the stock, the GCR and the ink limit */
    inks:null, stock:null, opaque:null, invertSource:false,
    screen:'fm', sepShape:'chain', pitch:9, grainPitch:0.5, levels:0,
    sepGCR:null, sepBoost:1.15, tac:null,
    gain:0.8, linear:true, solidity:0.97, ceiling:0.98, floor:0.10, floodCap:0,
    drift:0, driftSeed:7, skew:0, stretch:0, duo:true,
    drumBand:0, bandPeriod:90, drumStreak:0, starve:0, wet:0.25,
    pull:0, pressRun:true, pressOff:false,
    fountainTo:null, fountainPlate:1, fountainAngle:0, fountainSoft:1,
    screens:null, pitches:null, proofPlate:null, proofGrey:false
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
    o._stock = stockOf(name,o); o._dark = RP.isDark(o._stock);
    /* the mono drum follows the STOCK, not the theme: black on a light sheet, cream on a dark one (Print's white sheet has its own K) */
    o._ink = o.stock ? RP.inkOnStock(o.stock) : (o._dark ? PAL.cream : PAL.ink);
    cv.getContext('2d').clearRect(0,0,cv.width,cv.height);
    o._pressed=false; o._name=name;
    (TREATMENTS[name]||separation)(cv,o);
    if(name!=='none' && name!=='separation' && !o._pressed) pressThrough(cv,o);
    if(name!=='none') blendThrough(cv,o);
    /* ---- finish stack: everything below prints over the finished image ---- */
    applyBlur(cv, { amount:o.blurOver||0, type:o.blurOverType, angle:o.blurOverAngle,
                    x:o.blurOverX, y:o.blurOverY, pos:o.blurOverPos, width:o.blurOverWidth });
    const guard = o.transparent? alphaMaskGuard(cv) : null;
    finishTone(cv,o);
    if(o.inkBleed>0) inkBleed(cv,o);
    if(o.grain>0) grain(cv, o.grain, o.grainSize!=null?o.grainSize:2, o.grainInk, o.grainBlend, o.pull);
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

  window.RISO = { PAL, PAPER, PARTNER, INK, setSource, setSource2, setTransform, setTransform2, loadImage, render, sampleCanvas, grain,
                  /* the press's revision, stamped on documents by the hosts */
                  REV: RP.REV,
                  /* the core, for hosts that want the plates themselves (a proof export) */
                  press: RP,
                  TREATMENTS: Object.keys(TREATMENTS),
                  /* the plates a treatment presses, for a host's Proof picker */
                  platesFor,
                  RENDER_DEFAULTS,
                  get source(){ return SRC; } };
})();
