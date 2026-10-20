/* ============================================================
   REALITY PRINT STUDIO — the party effects, as vector PDF
   ------------------------------------------------------------
   The thirteen title effects (studio-shared/title-fx.jsx) drawn onto
   a pdf-lib page. Every decision — which inks, which order, how far,
   how many — comes from the SAME fxSpec the screen draws from, so the
   proof on the canvas and the file can't pick different inks.

   Nothing here is raster. The letters you read are still real text
   (drawText — K-only where they're ink). What the effects need beyond
   offset text passes comes from the embedded fonts' own glyph
   outlines (fontkit, behind each pdf-lib font):
     · a KEY LINE (Echo, Key line, Candy, Repeat) — the glyph path
       stroked at twice the width, clipped to OUTSIDE the letters with
       an even-odd clip, so the line sits outside the letter like the
       screen's dilate filter. The print TTFs are static instances with
       no overlapping contours, so even-odd is exact.
     · a SILHOUETTE (Sticker's stock, edge and print) — the glyph path
       filled and stroked together: a dilation. Bevel joins: the screen
       kernel is square (hard corners), and miters spike on A, V, W.
     · a SCREEN or STRIPES inside the letters (Halftone, Candy) — the
       glyph path as a clip, the dots / bands drawn through it.
   The whole effect is clipped to the part's frame, as the canvas
   crops it (overflow hidden on every text box).
   Exports: fxOn, drawTitleFx
   ============================================================ */
import { fxSpec, words } from '../studio-shared/title-fx.jsx';
import { NEUTRALS, PALETTE, ACCENTS } from '../studio-shared/brand.js';
import { starPath } from '../studio-shared/shapes.js';
import { L, inkColor, whiteColor, accentColor, chars, STAR_CH, starGlyphW, measure, wrapText } from './print-pdf.js';

/* the display types take an effect, horizontal only — print-element.jsx's twin */
const FX_TYPES = ['headline','numeral','bignum'];
function fxOn(el){ return FX_TYPES.indexOf(el.type)>=0 && el.titleFx && el.titleFx!=='none' && el.orient!=='v'; }

/* a spec hex → a pdf-lib colour: ink is the K plate, the stock is no ink, an
   accent is its tuned CMYK build (print-paper PALETTE_CMYK) */
function hexColor(hex){
  const h = String(hex||'').toLowerCase();
  if(h===String(NEUTRALS.print.ink).toLowerCase() || h===String(NEUTRALS.artwork.ink).toLowerCase()) return inkColor();
  if(h===String(NEUTRALS.print.light).toLowerCase() || h===String(NEUTRALS.artwork.light).toLowerCase() || h==='#ffffff') return whiteColor();
  const k = ACCENTS.find(a=>String(PALETTE[a]).toLowerCase()===h);
  return k ? accentColor(k) : inkColor();
}

/* ---- glyph outlines, in the element's local coords (x right, y DOWN) ----
   A path is a list of segments: ['M',x,y] ['L',x,y] ['Q',cx,cy,x,y]
   ['C',c1x,c1y,c2x,c2y,x,y] ['Z']. The advance per character is the one
   drawText and measure() use (font.widthOfTextAtSize), so outlines land
   on the set letters exactly. */
function fkOf(font){ return font && font.embedder && font.embedder.font; }
function glyphSegs(str, lx, base, font, size, tracking, out){
  const fk = fkOf(font); if(!fk) return out;
  const sc = size/fk.unitsPerEm;
  let x = lx;
  for(const ch of chars(str)){
    if(ch===STAR_CH){ x += starGlyphW(size)+tracking*size; continue; }
    const run = fk.layout(ch);
    let gx = x;
    run.glyphs.forEach((g, i)=>{
      const pos = run.positions[i] || { xAdvance:g.advanceWidth, xOffset:0, yOffset:0 };
      const ox = gx + pos.xOffset*sc, oy = base - pos.yOffset*sc;
      const P = (ax, ay)=> [ox + ax*sc, oy - ay*sc];
      (g.path.commands||[]).forEach(c=>{
        const a = c.args;
        if(c.command==='moveTo')            out.push(['M'].concat(P(a[0],a[1])));
        else if(c.command==='lineTo')       out.push(['L'].concat(P(a[0],a[1])));
        else if(c.command==='quadraticCurveTo') out.push(['Q'].concat(P(a[0],a[1]), P(a[2],a[3])));
        else if(c.command==='bezierCurveTo')    out.push(['C'].concat(P(a[0],a[1]), P(a[2],a[3]), P(a[4],a[5])));
        else if(c.command==='closePath')    out.push(['Z']);
      });
      gx += pos.xAdvance*sc;
    });
    x += font.widthOfTextAtSize(ch, size) + tracking*size;
  }
  return out;
}
function segsSvg(segs){
  const f = (v)=> (Math.round(v*100)/100);
  return segs.map(s=> s[0]==='Z' ? 'Z' : s[0]+s.slice(1).map(f).join(' ')).join(' ');
}

/* ============================================================
   drawTitleFx — K is renderElement's kit:
   { page, place, localPath, bm, fontFor, ROT, rot, accentName,
     textHex, fillHex, size }
   Returns true when it drew the title (the caller then skips its own).
   ============================================================ */
function drawTitleFx(K, el){
  const P = L();
  const { page, place, localPath, bm, fontFor, ROT, rot, accentName, textHex, fillHex, size } = K;
  const s = el.surface || 'none', surfaced = s!=='none';
  /* the ground and the Auto ink — exactly what the canvas hands fxSpec */
  const ground = s==='solid' ? NEUTRALS.print.ink : s==='accent' ? fillHex : NEUTRALS.print.light;
  const plate  = el.fill!=null ? fillHex : PALETTE[accentName];
  const lead = el.leading!=null ? el.leading : 0.95;
  const S = fxSpec(el, { ground, accentHex:plate, textCol:textHex, pair:NEUTRALS.print, lineHeight:lead });
  if(!S) return false;

  const isUpper = el.upper!==false;
  const text = isUpper ? (el.text||'').toUpperCase() : (el.text||'');
  const font = fontFor(el.fam, el.weight), tr = el.tracking||0;
  const pad = surfaced ? 12 : 0, o = surfaced ? S.over : { l:0, t:0, r:0, b:0 };
  const padL = pad + o.l*size, padR = pad + o.r*size, padT = pad + o.t*size, padB = pad + o.b*size;
  const maxW = Math.max(10, el.w - padL - padR), innerH = el.h - padT - padB;
  const asc = font.heightAtSize(size, { descender:false });
  /* the baseline inside a line box as CSS sets it: the font's content area
     centred in the line (half-leading), so an effect title lands on the
     canvas's lines rather than an ascent lower */
  const halfLead = (lh)=> (lh - font.heightAtSize(size))/2;
  const lineH = size*lead;
  const alignX = (w, x0, avail)=> el.align==='center' ? x0 + (avail-w)/2 : el.align==='right' ? x0 + (avail-w) : x0;

  /* ---- the raw-operator kit: clips and line joins ---- */
  const ops = (...o)=> page.pushOperators(...o);
  const pathOps = (segs, dx, dy)=>{
    const out = [];
    segs.forEach(sg=>{
      if(sg[0]==='Z'){ out.push(P.closePath()); return; }
      const pts = []; for(let i=1;i<sg.length;i+=2){ const p = place(sg[i]+dx, sg[i+1]+dy); pts.push(p.x, p.y); }
      if(sg[0]==='M') out.push(P.moveTo(pts[0], pts[1]));
      else if(sg[0]==='L') out.push(P.lineTo(pts[0], pts[1]));
      else if(sg[0]==='Q') out.push(P.appendQuadraticCurve(pts[0], pts[1], pts[2], pts[3]));
      else if(sg[0]==='C') out.push(P.appendBezierCurve(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]));
    });
    return out;
  };
  const rectSegs = (x, y, w, h)=> [['M',x,y],['L',x+w,y],['L',x+w,y+h],['L',x,y+h],['Z']];
  const clipBegin = (segs, dx, dy, evenOdd)=> ops(P.pushGraphicsState(), ...pathOps(segs, dx||0, dy||0), evenOdd ? P.clipEvenOdd() : P.clip(), P.endPath());
  const clipEnd = ()=> ops(P.popGraphicsState());
  const bevel = ()=> ops(P.setLineJoin(P.LineJoinStyle.Bevel));

  /* ---- text passes: the title set as text, at an offset, in one ink ---- */
  function drawStr(str, lx, base, color, extra){
    if(!str) return;
    const o2 = (x, y)=> Object.assign(bm({ x, y, size, font, color, rotate:ROT }), extra||null);
    if(str.indexOf(STAR_CH)<0 && Math.abs(tr)<0.0005){ const p = place(lx, base); page.drawText(str, o2(p.x, p.y)); return; }
    let x = lx;
    for(const ch of chars(str)){
      if(ch===STAR_CH){ const w = starGlyphW(size); localPath(starPath(0,0,size*0.38), color, x+w/2, base-size*0.35, extra); x += w+tr*size; continue; }
      const p = place(x, base); page.drawText(ch, o2(p.x, p.y)); x += font.widthOfTextAtSize(ch, size)+tr*size;
    }
  }

  /* ---- the block, laid out as print's textBlock lays it ---- */
  const lines = wrapText(text, font, size, tr, maxW);
  const blockH = lines.length*lineH;
  const top = padT + (innerH - blockH)/2;
  const LN = lines.map((str, i)=>{ const w = measure(str, font, size, tr); return { str, w, lx: alignX(w, padL, maxW), top: top+i*lineH, base: top+i*lineH+halfLead(lineH)+asc }; });
  const pass = (hex, dx, dy, extra)=> LN.forEach(l=> drawStr(l.str, l.lx+dx, l.base+dy, hexColor(hex), extra));
  let _segs = null;
  const segs = ()=> _segs || (_segs = LN.reduce((acc, l)=> glyphSegs(l.str, l.lx, l.base, font, size, tr, acc), []));
  const svg = (()=>{ let v = null; return ()=> v || (v = segsSvg(segs())); })();
  const T = S.T, A = S.A, B = S.B;
  const face = ()=> pass(T, 0, 0);

  /* a key line of width w (em) outside the letters, at an offset */
  function ring(dx, dy, w, hex){
    const big = el.w + el.h;
    clipBegin(rectSegs(-big, -big, el.w+2*big, el.h+2*big).concat(segs()), dx, dy, true);
    bevel();
    localPath(svg(), undefined, dx, dy, { borderColor:hexColor(hex), borderWidth:2*w*size });
    clipEnd();
  }
  /* the letters dilated by R (em): fill + stroke together */
  function fat(dx, dy, R, hex){
    ops(P.pushGraphicsState()); bevel();
    const c = hexColor(hex);
    localPath(svg(), c, dx, dy, { borderColor:c, borderWidth:2*R*size });
    ops(P.popGraphicsState());
  }

  // everything the effect draws stays in the part's frame, as on the canvas
  clipBegin(rectSegs(0, 0, el.w, el.h), 0, 0, false);
  const fx = S.fx, m = S.m;

  if(fx==='misreg'){
    const mode = S.blend && P.BlendMode && P.BlendMode[S.blend==='multiply' ? 'Multiply' : 'Screen'];
    const ex = mode ? { blendMode:mode } : null;
    pass(A, S.p1*size, S.p1*size, ex);
    pass(B, -S.p2*size, -S.p2*size, ex);
    face();
  }
  else if(fx==='echo'){
    ring(2*S.d*size, 2*S.d*size, S.w, B);
    ring(S.d*size, S.d*size, S.w, A);
    face();
  }
  else if(fx==='slab'){
    const e = (S.depth+S.edge)*size;
    pass(B, e, e);
    for(let i=S.steps;i>=1;i--){ const v = S.depth*size*i/S.steps; pass(A, v, v); }
    face();
  }
  else if(fx==='keyline'){
    pass(A, S.s*size, S.s*size);
    ring(0, 0, S.w, T);
  }
  else if(fx==='sep'){
    /* word i across the whole title → its ink; a word's x is the set width
       of everything before it on its line, so it lands where drawText would */
    let wi = 0;
    LN.forEach(l=>{
      const parts = l.str.split(' ');
      let idx = 0;
      parts.forEach(wd=>{
        if(wd){
          const before = l.str.slice(0, idx);
          const x = l.lx + (before ? measure(before, font, size, tr) + tr*size : 0);
          drawStr(wd, x, l.base, hexColor(S.inkAt(wi++)));
        }
        idx += wd.length + 1;
      });
    });
  }
  else if(fx==='tape'){
    /* each line (each Enter) its own bar, hugging its words; a long line
       wraps inside one bar. Same padding / gap / print as the canvas. */
    const pV = S.padV*size, pH = S.padH*size, pr = S.pr*size, gap = S.gap*size;
    const bars = (el.text||'').split('\n').map((para, i)=>{
      const t = isUpper ? para.toUpperCase() : para;
      const sub = t.trim()==='' ? [''] : wrapText(t, font, size, tr, Math.max(10, maxW - 2*pH));
      const w = Math.max.apply(null, sub.map(x=>measure(x, font, size, tr))) + 2*pH;
      return { sub, w, h: sub.length*lineH + 2*pV, empty: t.trim()==='', i };
    });
    const total = bars.reduce((a, b)=> a + b.h, 0) + gap*(bars.length-1);
    let y = padT + (innerH - total)/2;
    bars.forEach(b=>{
      if(!b.empty){
        const x = alignX(b.w, padL, maxW), bar = S.barAt(b.i);
        localPath(segsSvg(rectSegs(x+pr, y+pr, b.w, b.h)), hexColor(T), 0, 0);
        localPath(segsSvg(rectSegs(x, y, b.w, b.h)), hexColor(bar), 0, 0);
        const tc = hexColor(S.on(bar));
        b.sub.forEach((ln, j)=>{
          const lw = measure(ln, font, size, tr);
          const lx = el.align==='center' ? x + (b.w - lw)/2 : el.align==='right' ? x + b.w - pH - lw : x + pH;
          drawStr(ln, lx, y + pV + j*lineH + halfLead(lineH) + asc, tc);
        });
      }
      y += b.h + gap;
    });
  }
  else if(fx==='halftone'){
    pass(S.flat, 0, 0);
    /* the dot screen, through the letters: dots on a grid from the block's
       top-left, faded in from each line's foot like the canvas's mask */
    const cell = S.cell*size, r = (S.rPct/100)*cell/2, dc = hexColor(S.dots);
    clipBegin(segs(), 0, 0, false);
    LN.forEach(l=>{
      const x0 = padL, rows = Math.ceil(lineH/cell)+1;
      const jy0 = Math.floor((l.top - top)/cell);
      for(let j=jy0; j<jy0+rows; j++){
        const cy = top + (j+0.5)*cell;
        const t = (cy - l.top)/lineH;
        if(t<0 || t>1) continue;
        const a = Math.max(0, Math.min(1, (t-0.12)/(0.88-0.12)));
        const q = Math.round(a*10)/10;
        if(q<=0) continue;
        const i0 = Math.floor((l.lx - x0)/cell)-1, i1 = Math.ceil((l.lx + l.w - x0)/cell)+1;
        for(let i=i0;i<=i1;i++){
          const p = place(x0 + (i+0.5)*cell, cy);
          page.drawEllipse(bm({ x:p.x, y:p.y, xScale:r, yScale:r, color:dc, opacity:q<1?q:undefined }));
        }
      }
    });
    clipEnd();
  }
  else if(fx==='run'){
    for(let k=S.bands-1;k>=0;k--) for(let j=S.sub;j>=1;j--){
      const v = S.d*size*(k + j/S.sub);
      pass(S.seq[k % S.seq.length], v, v);
    }
    face();
  }
  else if(fx==='sticker'){
    const R = S.body+S.edge;
    fat(S.s*size, S.s*size, R, A);       // the print
    fat(0, 0, R, S.edgeCol);             // the edge
    fat(0, 0, S.body, S.stock);          // the stock
    pass(S.letter, 0, 0);
  }
  else if(fx==='slice'){
    for(let i=0;i<S.n;i++){
      const g = blockH*S.gapPct/100/2;
      const y0 = top + i*blockH/S.n + (i ? g : 0), y1 = top + (i+1)*blockH/S.n - (i<S.n-1 ? g : 0);
      clipBegin(rectSegs(-el.w, y0, 3*el.w, Math.max(0.1, y1-y0)), 0, 0, false);
      pass(S.inkAt(i), (i%2 ? S.s : -S.s)*size, 0);
      clipEnd();
    }
  }
  else if(fx==='tiles'){
    /* every letter on its own tile: words kept whole, wrapped greedily at
       the canvas's tile metrics, each tile turned about its centre */
    /* words, and the line breaks typed between them — a break is a new row,
       as the canvas's pre-wrap makes it */
    const toks = words(text);
    const sp = font.widthOfTextAtSize(' ', size);
    const adv = (ch)=> ch===STAR_CH ? starGlyphW(size) : font.widthOfTextAtSize(ch, size);
    const tileW = (ch)=> Math.max(S.minW*size, adv(ch) + 2*S.padH*size);
    const outer = (ch)=> tileW(ch) + 2*S.margin*size;
    const wordW = (w)=> chars(w).reduce((a, c)=> a + outer(c), 0);
    const rows = []; let cur = [], cw = 0;
    const flush = ()=>{ rows.push({ ws:cur, w:cw }); cur = []; cw = 0; };
    toks.forEach(w=>{
      if(/^\s+$/.test(w)){ const nb = (w.match(/\n/g)||[]).length; for(let i=0;i<nb;i++) flush(); return; }
      const ww = wordW(w); if(cur.length && cw + sp + ww > maxW) flush();
      cw += (cur.length ? sp : 0) + ww; cur.push(w); });
    if(cur.length) flush();
    const LH = (S.lift + S.lineGap)*size, tH = S.lift*size + 2*S.padV*size;
    const contentH = font.heightAtSize(size);
    const y0 = padT + (innerH - rows.length*LH)/2;
    let n = 0;
    rows.forEach((row, ri)=>{
      let x = alignX(row.w, padL, maxW);
      const cyLine = y0 + ri*LH + LH/2;
      row.ws.forEach((w, wi)=>{
        if(wi) x += sp;
        chars(w).forEach(ch=>{
          const tw = tileW(ch), bg = S.tileAt(n), kn = S.knockAt(n); n++;
          const cx = x + S.margin*size + tw/2, cy = cyLine + kn.dy*size;
          const th = kn.deg*Math.PI/180, c = Math.cos(th), sn = Math.sin(th);
          const R2 = (lx, ly)=> [cx + lx*c - ly*sn, cy + lx*sn + ly*c];
          const quad = (ox, oy)=>{ const pts = [[-tw/2,-tH/2],[tw/2,-tH/2],[tw/2,tH/2],[-tw/2,tH/2]].map(p=>R2(p[0]+ox, p[1]+oy));
            return 'M'+pts.map(p=>p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' L')+' Z'; };
          const pr = S.pr*size;
          localPath(quad(pr, pr), hexColor(T), 0, 0);
          localPath(quad(0, 0), hexColor(bg), 0, 0);
          const a = adv(ch);
          const bl = R2(-a/2, -tH/2 + S.padV*size + (S.lift*size - contentH)/2 + asc);
          const tc = hexColor(S.on(bg));
          if(ch===STAR_CH){ const sc2 = R2(0, 0); localPath(starPath(0, 0, size*0.38), tc, sc2[0], sc2[1]); }
          else { const p = place(bl[0], bl[1]); page.drawText(ch, bm({ x:p.x, y:p.y, size, font, color:tc, rotate:P.degrees(-((rot||0) + kn.deg)) })); }
          x += tw + 2*S.margin*size;
        });
      });
    });
  }
  else if(fx==='candy'){
    pass(B, S.s*size, S.s*size);          // the hard print
    ring(0, 0, S.w, T);                   // the key line
    /* the stripes, through the letters: the stock, then bands of the first
       ink at 135° — phase from the block's top-left, as the CSS gradient */
    clipBegin(segs(), 0, 0, false);
    localPath(segsSvg(rectSegs(0, 0, el.w, el.h)), hexColor(S.stripeB), 0, 0);
    const band = S.band*size, x0 = padL, y0 = top, v = [Math.SQRT1_2, Math.SQRT1_2], u = [Math.SQRT1_2, -Math.SQRT1_2];
    const big = el.w + el.h;
    const pMin = -big*1.5, pMax = big*1.5, ac = hexColor(A);
    for(let p = Math.floor(pMin/(2*band))*2*band; p < pMax; p += 2*band){
      const c0 = [x0 + v[0]*p, y0 + v[1]*p], c1 = [x0 + v[0]*(p+band), y0 + v[1]*(p+band)];
      const pts = [[c0[0]-u[0]*big, c0[1]-u[1]*big], [c0[0]+u[0]*big, c0[1]+u[1]*big], [c1[0]+u[0]*big, c1[1]+u[1]*big], [c1[0]-u[0]*big, c1[1]-u[1]*big]];
      localPath('M'+pts.map(q=>q[0].toFixed(2)+' '+q[1].toFixed(2)).join(' L')+' Z', ac, 0, 0);
    }
    clipEnd();
  }
  else if(fx==='repeat'){
    for(let k=S.rows;k>=1;k--) [-1, 1].forEach(sgn=> ring(0, sgn*k*blockH, S.w, S.inkAt(k)));
    face();
  }
  else { clipEnd(); return false; }

  clipEnd();
  return true;
}

export { fxOn, drawTitleFx };
