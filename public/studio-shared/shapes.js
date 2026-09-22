/* ============================================================
   REALITY STUDIOS — vector geometry, once
   ------------------------------------------------------------
   The graphical-element kit Poster and Print both draw from: shapes,
   sunbursts, rules/dividers and the Year 2 icon set fitted to a box.
   Every path is an SVG path string in LOCAL, y-DOWN element coords
   (0..w, 0..h) — exactly what Print Studio's pdf-lib exporter consumes
   and what the Poster's <svg> and CSS clip-paths take — so a shape
   authored on a poster and the same shape on a printed A3 are the
   same geometry. The two Studios used to carry twin copies of all of
   this ("add a kind to BOTH files or the two studios drift"); the
   Poster's had gained five kinds (drop · arrow · halfdisc · quarter ·
   bolt) that were mirrored by hand. One copy now: add a kind here and
   both Studios have it.

   Units are the host's: px on the Poster, pt on Print. Nothing here
   knows which.
   ============================================================ */
import { ICON_GLYPHS } from './print-icons.js';

function _poly(pts){ return 'M '+pts.map(p=>p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' L ')+' Z'; }
function _regPoly(cx,cy,r,n,startDeg){ const p=[]; for(let i=0;i<n;i++){ const a=(startDeg+i*360/n)*Math.PI/180; p.push([cx+Math.cos(a)*r, cy+Math.sin(a)*r]); } return _poly(p); }
function _starPts(cx,cy,R,n,inner,startDeg){ const p=[]; for(let i=0;i<n*2;i++){ const r=i%2?R*inner:R, a=(startDeg+i*180/n)*Math.PI/180; p.push([cx+Math.cos(a)*r, cy+Math.sin(a)*r]); } return p; }
function _star(cx,cy,R,n,inner,startDeg){ return _poly(_starPts(cx,cy,R,n,inner,startDeg)); }
function _scalePath(d,w,h){ let i=0; return d.replace(/-?\d*\.?\d+/g, m=> ((i++%2)===0 ? parseFloat(m)*w : parseFloat(m)*h).toFixed(2) ); }
function roundedRectPath(ox,oy,w,h,r){
  r=Math.max(0,Math.min(r, Math.min(w,h)/2));
  if(r<=0) return `M ${ox} ${oy} L ${ox+w} ${oy} L ${ox+w} ${oy+h} L ${ox} ${oy+h} Z`;
  const x=ox,y=oy;
  return `M ${x+r} ${y} L ${x+w-r} ${y} Q ${x+w} ${y} ${x+w} ${y+r} `
       + `L ${x+w} ${y+h-r} Q ${x+w} ${y+h} ${x+w-r} ${y+h} `
       + `L ${x+r} ${y+h} Q ${x} ${y+h} ${x} ${y+h-r} `
       + `L ${x} ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;
}
/* kind → path for a w×h box. 'circle' returns null (renderers draw a true
   ellipse, so it stays round at any aspect). Polygons inscribe in the
   short-side circle so they stay regular; box shapes fill the rectangle. */
const SHAPE_KINDS=['circle','rounded','squircle','rect','pill','triangle','diamond','pentagon','hexagon','octagon','star5','star6','chevron','cross','banner','shield','arch','heart','blob','drop','arrow','halfdisc','quarter','bolt'];
function shapePath(kind, w, h){
  const cx=w/2, cy=h/2, R=Math.min(w,h)/2;
  switch(kind){
    case 'circle': case 'ellipse': return null;
    case 'rect':     return _poly([[0,0],[w,0],[w,h],[0,h]]);
    case 'rounded':  return roundedRectPath(0,0,w,h,Math.min(w,h)*0.18);
    case 'squircle': return roundedRectPath(0,0,w,h,Math.min(w,h)*0.32);
    case 'pill':     return roundedRectPath(0,0,w,h,Math.min(w,h)/2);
    case 'triangle': return _poly([[cx,0],[w,h],[0,h]]);
    case 'diamond':  return _poly([[cx,0],[w,cy],[cx,h],[0,cy]]);
    case 'pentagon': return _regPoly(cx,cy,R,5,-90);
    case 'hexagon':  return _regPoly(cx,cy,R,6,-90);
    case 'octagon':  return _regPoly(cx,cy,R,8,-67.5);
    case 'star5':    return _star(cx,cy,R,5,0.42,-90);
    case 'star6':    return _star(cx,cy,R,6,0.5,-90);
    case 'chevron':  return _poly([[0,0],[w*0.62,0],[w,cy],[w*0.62,h],[0,h],[w*0.34,cy]]);
    case 'cross':    { const ax=w*0.33, ay=h*0.33; return _poly([[ax,0],[w-ax,0],[w-ax,ay],[w,ay],[w,h-ay],[w-ax,h-ay],[w-ax,h],[ax,h],[ax,h-ay],[0,h-ay],[0,ay],[ax,ay]]); }
    case 'banner':   { const d=Math.min(w*0.12,h*0.5); return _poly([[0,0],[w,0],[w-d,cy],[w,h],[0,h],[d,cy]]); }
    case 'shield':   return `M 0 0 L ${w} 0 L ${w} ${(h*0.52).toFixed(2)} Q ${w} ${(h*0.92).toFixed(2)} ${cx} ${h} Q 0 ${(h*0.92).toFixed(2)} 0 ${(h*0.52).toFixed(2)} Z`;
    case 'arch':     { const a=Math.min(w/2,h*0.7).toFixed(2); return `M 0 ${h} L 0 ${a} Q 0 0 ${cx} 0 Q ${w} 0 ${w} ${a} L ${w} ${h} Z`; }
    case 'heart':    return _scalePath('M 0.5 0.95 C 0.0 0.62 0.05 0.16 0.32 0.16 C 0.44 0.16 0.5 0.30 0.5 0.36 C 0.5 0.30 0.56 0.16 0.68 0.16 C 0.95 0.16 1.0 0.62 0.5 0.95 Z', w, h);
    case 'blob':     return _scalePath('M 0.50 0.03 C 0.80 0.0 1.0 0.24 0.97 0.52 C 0.94 0.80 0.80 1.0 0.50 0.97 C 0.18 1.0 0.03 0.78 0.05 0.50 C 0.0 0.20 0.20 0.05 0.50 0.03 Z', w, h);
    case 'drop':     return _scalePath('M 0.50 0.0 C 0.78 0.30 0.92 0.48 0.92 0.64 C 0.92 0.87 0.73 1.0 0.50 1.0 C 0.27 1.0 0.08 0.87 0.08 0.64 C 0.08 0.48 0.22 0.30 0.50 0.0 Z', w, h);
    case 'arrow':    { const s=h*0.28; return _poly([[0,cy-s],[w*0.58,cy-s],[w*0.58,0],[w,cy],[w*0.58,h],[w*0.58,cy+s],[0,cy+s]]); }
    case 'halfdisc': return `M 0 ${h} L 0 ${cy.toFixed(2)} A ${cx.toFixed(2)} ${cy.toFixed(2)} 0 0 1 ${w} ${cy.toFixed(2)} L ${w} ${h} Z`;
    case 'quarter':  return `M 0 ${h} L 0 0 A ${w} ${h} 0 0 1 ${w} ${h} Z`;
    case 'bolt':     return _scalePath('M 0.62 0.0 L 0.14 0.56 L 0.44 0.56 L 0.34 1.0 L 0.86 0.40 L 0.55 0.40 Z', w, h);
    default:         return _poly([[0,0],[w,0],[w,h],[0,h]]);
  }
}
/* CSS clip-path value for a kind — the bridge that lets ANY box (a photo
   frame today) wear a shape. `circle` becomes an ellipse() so it tracks a
   non-square frame; everything else is the same path the shape element draws. */
function shapeClip(kind, w, h){
  if(!kind || kind==='none' || kind==='rect') return null;
  if(kind==='circle' || kind==='ellipse') return 'ellipse(50% 50% at 50% 50%)';
  const d = shapePath(kind, w, h);
  return d ? `path('${d}')` : null;
}

/* Sunburst — `n` filled wedges in a centred disc, half-slice gaps between
   them for the classic ray pop. */
function burstRays(W,H,rays,spinDeg){
  const n=Math.max(3, rays|0), R=Math.min(W,H)/2*1.06, cx=W/2, cy=H/2;
  const spin=(spinDeg||0)*Math.PI/180, slice=Math.PI*2/n;
  const wedges=[];
  for(let i=0;i<n;i++){
    const a0=spin+i*slice, a1=a0+slice/2;           // lit half of each slice
    wedges.push({ cx, cy,
      p0:[cx+Math.cos(a0)*R, cy+Math.sin(a0)*R],
      p1:[cx+Math.cos(a1)*R, cy+Math.sin(a1)*R] });
  }
  return { wedges, cx, cy, R };
}

/* Rule / divider — the humble line as an expressive kit. Everything comes
   back as point arrays (LOCAL coords, centred on my=h/2) so a renderer only
   ever draws polylines, dots and filled terminals. Patterns: solid · dashed ·
   dotted · dashdot · double · triple · ticks · zigzag · wave · square. */
function ruleLayout(el){
  const W=Math.max(1,el.w), H=Math.max(1,el.h), w=Math.max(0.5, el.weight||3), my=H/2;
  const pat=el.pattern||el.style||'solid';
  const term=el.term||'none', termAt=el.termAt||'end';
  const tHas=(s)=> term!=='none' && (termAt==='both'||termAt===s);
  const ts=Math.max(2.5, Math.min(H/2, (w*2.2)*(el.termScale||1)));
  const extOf = term==='arrow' ? 2*ts : (term==='none'?0:ts);
  const x0=tHas('start')?extOf:0, x1=W-(tHas('end')?extOf:0), span=Math.max(1, x1-x0);
  const strokes=[], dots=[], fills=[];
  const period=Math.max(2, el.spacing!=null?el.spacing : (pat==='dotted'?Math.max(4,w*2.6) : pat==='ticks'?14 : pat==='wave'?28 : pat==='zigzag'?24 : pat==='square'?26 : Math.max(6,w*4)));
  const amp=Math.max(1, Math.min(H/2 - w/2, el.amp!=null?el.amp : Math.min(H/2 - w/2, 7)));

  if(x1>x0){
    if(pat==='double'){ const g=el.gap!=null?el.gap:Math.max(2,w*1.7); strokes.push({pts:[[x0,my-g/2],[x1,my-g/2]]},{pts:[[x0,my+g/2],[x1,my+g/2]]}); }
    else if(pat==='triple'){ const g=el.gap!=null?el.gap:Math.max(2,w*1.7); strokes.push({pts:[[x0,my-g],[x1,my-g]]},{pts:[[x0,my],[x1,my]]},{pts:[[x0,my+g],[x1,my+g]]}); }
    else if(pat==='dashed'){ const on=period*(el.dashRatio!=null?Math.max(0.1,Math.min(0.9,el.dashRatio)):0.55); for(let x=x0;x<x1-0.01;x+=period) strokes.push({pts:[[x,my],[Math.min(x+on,x1),my]]}); }
    else if(pat==='dotted'){ const r=Math.max(0.6,(el.dotSize!=null?el.dotSize:w)/2), n=Math.max(1,Math.round(span/period)), st=span/n; for(let i=0;i<=n;i++) dots.push({x:x0+i*st,y:my,r}); }
    else if(pat==='dashdot'){ const on=period*0.42; for(let x=x0;x<x1-0.01;x+=period){ const xe=Math.min(x+on,x1); strokes.push({pts:[[x,my],[xe,my]]}); const xd=xe+(period-on)/2; if(xd<x1-0.01) dots.push({x:xd,y:my,r:Math.max(0.9,w*0.72)}); } }
    else if(pat==='ticks'){ strokes.push({pts:[[x0,my],[x1,my]]}); const tl=Math.max(1,el.tickLen!=null?el.tickLen:Math.min(H/2-w/2,6)), dir=el.tickDir||'both', n=Math.max(1,Math.round(span/period)), st=span/n; for(let i=0;i<=n;i++){ const x=x0+i*st, up=dir!=='down'?tl:0, dn=dir!=='up'?tl:0; strokes.push({pts:[[x,my-up],[x,my+dn]]}); } }
    else if(pat==='zigzag'){ const pts=[[x0,my]]; let i=0; for(let x=x0+period/2;x<x1-0.01;x+=period/2){ pts.push([x, my+(i%2?amp:-amp)]); i++; } pts.push([x1,my]); strokes.push({pts}); }
    else if(pat==='square'){ let lvl=-amp; const pts=[[x0,my+lvl]]; for(let x=x0+period/2;x<x1-0.01;x+=period/2){ pts.push([x,my+lvl]); lvl=-lvl; pts.push([x,my+lvl]); } pts.push([x1,my+lvl]); strokes.push({pts}); }
    else if(pat==='wave'){ const steps=Math.max(16,Math.round(span/2)), pts=[]; for(let i=0;i<=steps;i++){ const x=x0+span*i/steps; pts.push([x, my+amp*Math.sin(((x-x0)/period)*Math.PI*2)]); } strokes.push({pts}); }
    else { strokes.push({pts:[[x0,my],[x1,my]]}); }
  }

  function addTerm(s){
    const isStart=s==='start', cx=isStart?x0:x1;
    if(term==='dot') dots.push({x:cx,y:my,r:ts});
    else if(term==='diamond') fills.push({pts:[[cx,my-ts],[cx+ts,my],[cx,my+ts],[cx-ts,my]]});
    else if(term==='star') fills.push({pts:_starPts(cx,my,ts,5,0.42,-90)});
    else if(term==='arrow'){ const tipX=isStart?0:W, baseX=isStart?2*ts:W-2*ts; fills.push({pts:[[tipX,my],[baseX,my-ts],[baseX,my+ts]]}); }
  }
  if(tHas('start')) addTerm('start');
  if(tHas('end')) addTerm('end');

  return { strokes, dots, fills, w, cap: el.cap==='butt'?'butt':'round' };
}

/* ---- icon geometry — the Year 2 glyph set (loaded from print-icons.js, the
   one generated copy both studios share). Glyphs are 24×24 primitive lists;
   we centre a uniform scale into the element so a 400px poster icon keeps the
   visual weight of the 2px-at-24 original. `solid` fills the closed
   primitives instead of stroking them. */
function iconLayout(el){
  const g = (ICON_GLYPHS||{})[el.kind] || null;
  if(!g) return null;
  const s = Math.min(el.w, el.h)/24;
  const ox = (el.w-24*s)/2, oy = (el.h-24*s)/2;
  const sw = 2*(el.strokeScale!=null?el.strokeScale:1)*s;
  const prims = g.map(p=>{
    const stroke = !!p.linear || p.t==='line' || !el.solid;
    if(p.t==='rect')    return { t:'rect', x:ox+p.x*s, y:oy+p.y*s, w:p.w*s, h:p.h*s, stroke };
    if(p.t==='line')    return { t:'line', x1:ox+p.x1*s, y1:oy+p.y1*s, x2:ox+p.x2*s, y2:oy+p.y2*s, stroke:true };
    if(p.t==='ellipse') return { t:'ellipse', cx:ox+p.cx*s, cy:oy+p.cy*s, rx:p.rx*s, ry:p.ry*s, stroke };
    if(p.t==='poly'){
      const pts = p.points.trim().split(/[\s,]+/).map(Number);
      const out=[]; for(let i=0;i<pts.length;i+=2) out.push([ox+pts[i]*s, oy+pts[i+1]*s]);
      return { t:'poly', pts:out, stroke };
    }
    if(p.t==='path')    return { t:'path', d:_scaleSvgPath(p.d, s, ox, oy), stroke };
    return null;
  }).filter(Boolean);
  return { prims, sw, s };
}
/* uniform-scale + translate every coordinate in a simple SVG path string.
   Handles the command set the icon glyphs actually use (M L H V C Q T A Z,
   absolute + relative). Arc flags are passed through untouched. */
function _scaleSvgPath(d, s, ox, oy){
  let out='', i=0;
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g)||[];
  let cmd='';
  while(i<toks.length){
    const t=toks[i];
    if(/[a-zA-Z]/.test(t)){ cmd=t; out+=(out?' ':'')+t; i++; continue; }
    const rel = cmd===cmd.toLowerCase() && cmd!=='z';
    const C = cmd.toUpperCase();
    let nums;
    if(C==='H'||C==='V'){ nums=[parseFloat(toks[i])]; i+=1; }
    else if(C==='A'){ nums=toks.slice(i,i+7).map(parseFloat); i+=7; }
    else if(C==='C'){ nums=toks.slice(i,i+6).map(parseFloat); i+=6; }
    else if(C==='S'||C==='Q'){ nums=toks.slice(i,i+4).map(parseFloat); i+=4; }
    else { nums=toks.slice(i,i+2).map(parseFloat); i+=2; }   // M L T
    let scaled;
    if(C==='A'){
      scaled=[nums[0]*s, nums[1]*s, nums[2], nums[3], nums[4],
              rel?nums[5]*s:nums[5]*s+ox, rel?nums[6]*s:nums[6]*s+oy];
    } else if(C==='H'){ scaled=[rel?nums[0]*s:nums[0]*s+ox]; }
    else if(C==='V'){ scaled=[rel?nums[0]*s:nums[0]*s+oy]; }
    else { scaled=nums.map((n,j)=> rel? n*s : (j%2===0? n*s+ox : n*s+oy)); }
    out += ' '+scaled.map(n=>+n.toFixed(3)).join(' ');
  }
  return out;
}

/* 5-point star as one closed vector path (points up), radius r about (cx,cy).
   Print draws it on screen and in the PDF (the QR centre mark, stamps), so
   the two are pixel-identical. */
function starPath(cx,cy,r){ return _star(cx,cy,r,5,0.42,-90); }

/* The rule element's patterns, as picker options — the same ten in both
   Studios (ruleLayout above draws each). */
const RULE_PATTERNS = [
  { v:'solid',   l:'Solid' },   { v:'dashed',  l:'Dashed' },  { v:'dotted', l:'Dotted' },
  { v:'dashdot', l:'Dash-dot' },{ v:'double',  l:'Double' },  { v:'triple', l:'Triple' },
  { v:'ticks',   l:'Ticks' },   { v:'zigzag',  l:'Zigzag' },  { v:'wave',   l:'Wave' },
  { v:'square',  l:'Square' }
];

export {
  SHAPE_KINDS, shapePath, shapeClip, roundedRectPath, starPath,
  burstRays, ruleLayout, RULE_PATTERNS, iconLayout,
};
