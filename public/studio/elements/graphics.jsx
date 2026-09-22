/* ============================================================
   REALITY POSTER STUDIO — graphic elements
   block · shape · icon · rule · burst · ink mark, and the ticket's mark.
   ============================================================ */
import {
  themeColors as seTheme, shapePath as seShapePath, burstRays as seBurst, ruleLayout as seRule, iconLayout as seIcon,
  inkMarkLayout, inkMarkCells, INK_MARK_DAY_ACCENT, inkMarkHex,
} from '../studio-data.jsx';
import { seResolve, seShadow } from './style.js';
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
    const W = Math.max(1, exporting ? Math.min(Math.round(el.w)*xr, xr>2?3840:2400) : Math.min(Math.round(el.w), 900));
    const H = Math.max(1, Math.round(W*(el.h/el.w)));
    cv.width=W; cv.height=H;
    const cx=cv.getContext('2d');
    cx.fillStyle=fillHex; cx.fillRect(0,0,W,H);
    window.RISO.grain(cv, el.grain, el.grainSize!=null?el.grainSize:2, el.grainInk, el.grainBlend);
  /* Same lesson as the photo press: with no dependency list this re-ran the
     whole noise pass on every render of the app — every frame of dragging
     anything. It depends on the size, the fill and the grain dials; not x/y. */
  }, [grainy, el.w, el.h, fillHex, el.grain, el.grainSize, el.grainInk, el.grainBlend, exporting]);
  const bsh = seShadow(el, theme);   // off by default; casts off the block shape when on
  return <div style={{ position:'absolute', inset:0, overflow:'hidden',
    opacity: el.opacity!=null?el.opacity:1,
    background: grainy? 'transparent' : fillHex,
    border: el.outline? `3px solid ${t.fg}` : 'none', boxSizing:'border-box',
    filter: bsh? bsh.filter : undefined }}>
    {grainy && <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }} />}
  </div>;
}

/* ============================================================
   GRAPHICAL ELEMENTS — shape · icon · rule · burst.

   All four draw as inline SVG, so they stay crisp at every export
   ratio (A1 captures at ~3.25×) instead of being resampled like the
   riso canvases. They share the block's colour + shadow vocabulary:
   `fill` resolves 'fg' → the poster accent (so a shape follows the
   day carousel), and window.shadowModel drives the drop-shadow.
   ============================================================ */

/* Grain on a vector shape: the riso noise pass painted into a canvas that is
   CLIPPED to the shape's own path (Path2D takes the same `d` string the SVG
   uses), so a grained hexagon is grained hexagon-shaped. Same engine call as
   BlockEl, so a grained block and a grained shape match. */
function ShapeGrain({ el, fillHex, path, exporting }){
  const ref = React.useRef(null);
  React.useEffect(()=>{
    const cv=ref.current; if(!cv||!window.RISO) return;
    const xr = typeof exporting==='number' ? exporting : 2;
    const W = Math.max(1, exporting ? Math.min(Math.round(el.w)*xr, xr>2?3840:2400) : Math.min(Math.round(el.w), 900));
    const H = Math.max(1, Math.round(W*(el.h/el.w)));
    cv.width=W; cv.height=H;
    const cx=cv.getContext('2d'), s=W/el.w;
    /* Paint + grain the full rect first (identical to BlockEl, so the texture
       reads the same), then punch it down to the silhouette with a
       destination-in pass — clipping BEFORE the grain wouldn't survive the
       engine's own canvas writes. */
    cx.clearRect(0,0,W,H);
    cx.fillStyle=fillHex; cx.fillRect(0,0,W,H);
    window.RISO.grain(cv, el.grain, el.grainSize!=null?el.grainSize:2, el.grainInk, el.grainBlend);
    cx.save();
    cx.globalCompositeOperation='destination-in';
    cx.scale(s,s);
    cx.fillStyle='#000';
    if(path) cx.fill(new Path2D(path));
    else { cx.beginPath(); cx.ellipse(el.w/2, el.h/2, el.w/2, el.h/2, 0, 0, 6.2832); cx.fill(); }
    cx.restore();
  /* `path` is the shape's `d` string, so it compares by value — a new kind or
     a resize re-cuts the silhouette, a drag doesn't. */
  }, [path, el.w, el.h, fillHex, el.grain, el.grainSize, el.grainInk, el.grainBlend, exporting]);
  return <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }} />;
}

/* Vector shape — circle first, then the full kind registry. `style` picks
   solid (filled) or outline (hollow, keyline only), which is what turns the
   same 24 kinds into 48 marks. Stroke insets on the ellipse so an outline
   circle can't clip on its own box. */
function ShapeEl({ el, theme, fillHex, exporting }){
  const t = seTheme(theme);
  const kind = el.kind||'circle';
  const path = seShapePath(kind, el.w, el.h);
  const hollow = el.style==='outline';
  const sw = hollow ? Math.max(1, el.stroke!=null?el.stroke:8) : (el.stroke>0 ? el.stroke : 0);
  const strokeCol = hollow ? fillHex : seResolve(el.strokeColor||'fg', t.fg);
  const grainy = !hollow && (el.grain||0) > 0.001;
  const half = sw/2;
  const sh = seShadow(el, theme);
  return <div style={{ position:'absolute', inset:0, opacity: el.opacity!=null?el.opacity:1,
    filter: sh? sh.filter : undefined }}>
    <svg viewBox={`0 0 ${el.w} ${el.h}`} width="100%" height="100%" preserveAspectRatio="none"
      style={{ display:'block', overflow:'visible' }}>
      {path
        ? <path d={path} fill={hollow?'none':(grainy?'transparent':fillHex)}
            stroke={sw>0?strokeCol:'none'} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
        : <ellipse cx={el.w/2} cy={el.h/2} rx={Math.max(0.5, el.w/2 - (hollow?half:0))} ry={Math.max(0.5, el.h/2 - (hollow?half:0))}
            fill={hollow?'none':(grainy?'transparent':fillHex)} stroke={sw>0?strokeCol:'none'} strokeWidth={sw} />}
    </svg>
    {grainy && <ShapeGrain el={el} fillHex={fillHex} path={path} exporting={exporting} />}
  </div>;
}

/* Year 2 glyph — 24×24 primitives scaled into the box by iconLayout, drawn as
   real strokes so a 400px poster icon keeps the mark's proportions. `solid`
   fills the closed primitives (lines always stroke). */
function IconEl({ el, theme, fillHex }){
  const lay = seIcon(el);
  const sh = seShadow(el, theme);
  const common = { fill:'none', stroke:fillHex, strokeWidth:lay?lay.sw:2, strokeLinecap:'round', strokeLinejoin:'round' };
  const solid  = { fill:fillHex, stroke:'none' };
  const node = (p,i)=>{
    const st = p.stroke ? common : solid;
    if(p.t==='rect')    return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} {...st} />;
    if(p.t==='line')    return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} {...common} />;
    if(p.t==='ellipse') return <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} {...st} />;
    if(p.t==='poly')    return <polygon key={i} points={p.pts.map(q=>q[0]+','+q[1]).join(' ')} {...st} />;
    if(p.t==='path')    return <path key={i} d={p.d} {...st} />;
    return null;
  };
  return <div style={{ position:'absolute', inset:0, opacity: el.opacity!=null?el.opacity:1,
    filter: sh? sh.filter : undefined }}>
    {lay
      ? <svg viewBox={`0 0 ${el.w} ${el.h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display:'block', overflow:'visible' }}>
          {lay.prims.map(node)}
        </svg>
      : <div style={{ width:'100%', height:'100%', border:`2px dashed ${seTheme(theme).shadow(0.45)}`, borderRadius:8, boxSizing:'border-box' }} />}
  </div>;
}

/* Divider — one layout (ruleLayout) covering ten patterns and four terminals.
   Rotate the element for a vertical rule; the geometry is always drawn along
   the box's long axis and centred on it. */
function RuleEl({ el, theme, fillHex }){
  const lay = seRule(el);
  const sh = seShadow(el, theme);
  return <div style={{ position:'absolute', inset:0, opacity: el.opacity!=null?el.opacity:1,
    filter: sh? sh.filter : undefined }}>
    <svg viewBox={`0 0 ${el.w} ${el.h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display:'block', overflow:'visible' }}>
      {lay.strokes.map((s,i)=><polyline key={'s'+i} points={s.pts.map(p=>p[0]+','+p[1]).join(' ')} fill="none"
        stroke={fillHex} strokeWidth={lay.w} strokeLinecap={lay.cap} strokeLinejoin="round" />)}
      {lay.dots.map((d,i)=><circle key={'o'+i} cx={d.x} cy={d.y} r={d.r} fill={fillHex} />)}
      {lay.fills.map((f,i)=><polygon key={'f'+i} points={f.pts.map(p=>p[0]+','+p[1]).join(' ')} fill={fillHex} />)}
    </svg>
  </div>;
}

/* Sunburst — filled wedges radiating from the centre, with an optional knocked
   -out hub. Spin it with the element's own rotate handle or the Spin dial. */
function BurstEl({ el, theme, fillHex }){
  const b = seBurst(el.w, el.h, el.rays||16, el.spin||0);
  const hub = el.hub!=null?el.hub:0;
  const hubHex = seResolve(el.hubFill||'paper', seTheme(theme).paper);
  const sh = seShadow(el, theme);
  return <div style={{ position:'absolute', inset:0, overflow:'hidden', opacity: el.opacity!=null?el.opacity:1,
    filter: sh? sh.filter : undefined }}>
    <svg viewBox={`0 0 ${el.w} ${el.h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display:'block' }}>
      {b.wedges.map((w,i)=><path key={i} d={`M${w.cx} ${w.cy} L${w.p0[0]} ${w.p0[1]} L${w.p1[0]} ${w.p1[1]} Z`} fill={fillHex} />)}
      {hub>0 && <circle cx={b.cx} cy={b.cy} r={b.R*hub} fill={hubHex} />}
    </svg>
  </div>;
}

/* The ink strip / ink square — canon rev 22.08.26 (studio-data INK_MARK,
   from ink-strip.json). Flat cells on a shared module grid (inkMarkLayout —
   the SAME geometry Print Studio's PDF draws), fitted undistorted into the
   element box and centred, like the wordmark. Recolouring (mode/day) is the
   only parameter — cell order never changes. No radius, no gradient, no cell
   shadow; STATIC always (studio output never animates).
   Ground (G2, defaults on): a paper-shade plate with one module of clear
   space so stock never lands on an outer corner of the poster; the
   square-anchored form skips it — its ink cell IS the outer corner. */
function InkmarkEl({ el, theme }){
  const form = el.form||'strip-v';
  const lay = inkMarkLayout(form);
  const cells = inkMarkCells(form, el.mode||'full');
  const dayAccent = (INK_MARK_DAY_ACCENT||{})[el.day||'fri'] || 'red';
  const hx = (n)=> inkMarkHex(n, dayAccent);
  /* Ground is OPT-IN (23.08): only an explicit `ground:true` draws the
     paper-shade plate. It used to be opt-out — absent meant grounded — which
     put a mat under every mark placed before the control existed, and under
     every mark in a doc saved by an older build. G2's outer-corner rule is
     the reason the plate exists, but in practice the mark is dropped onto
     artwork that already has its own ground, and the plate reads as a mat
     nobody asked for. The control and its guidance are unchanged; this is
     which way the switch rests. */
  const grounded = el.ground===true && form!=='square-anchored';
  const pad = grounded ? 1 : 0;                       // one module of clear space
  const gw = lay.cols + pad*2, gh = lay.rows + pad*2;
  const m = Math.max(1, Math.min(el.w/gw, el.h/gh));  // module: fit the box, keep cells square
  const W = gw*m, H = gh*m;
  /* --paper-shade (src/index.css tokens) — the sanctioned ground tone. Stock
     itself stays substrate-pinned (#fffbf1) and never tints with the theme. */
  const shade = theme==='night' ? '#1c140b' : '#ece2c9';
  const nameOf = (slot)=> slot[0]==='b' ? cells.bands[+slot.slice(1)] : cells.field[+slot.slice(1)];
  return <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
    <div style={{ position:'relative', width:W, height:H, background: grounded?shade:'transparent' }} aria-hidden="true">
      {lay.boxes.map(b=>(
        <div key={b.slot} style={{ position:'absolute',
          left:(pad+b.x)*m, top:(pad+b.y)*m, width:b.w*m, height:b.h*m,
          background:hx(nameOf(b.slot)) }} />
      ))}
    </div>
  </div>;
}

/* The ticket's ink mark — a fixed-module rendering of the canon grid (same
   inkMarkLayout/inkMarkCells the Inkmark element and Print Studio's PDF draw,
   so the geometries can never drift). Unlike InkmarkEl it takes its module
   `m` directly instead of fitting a box: the ticket derives the module from
   the QR (square) or the band (strip). `grounded` wraps the cells in the
   paper-shade plate with one module of clear space (G2 — stock never lands
   on an outer corner of a paper surface); square-anchored never needs it,
   its ink cell IS the outer corner. Flat cells, no radius, static always. */
function TicketInkMark({ form, mode, m, grounded, theme, day }){
  const lay = inkMarkLayout(form);
  const cells = inkMarkCells(form, mode);
  const pad = grounded ? 1 : 0;
  const shade = theme==='night' ? '#1c140b' : '#ece2c9';   /* --paper-shade */
  /* `day` only bites in daycode mode, where it picks the hue. Defaults to
     Friday/red so every existing ticket call renders exactly as before. */
  const dayAccent = (INK_MARK_DAY_ACCENT||{})[day||'fri'] || 'red';
  const nameOf = (slot)=> slot[0]==='b' ? cells.bands[+slot.slice(1)] : cells.field[+slot.slice(1)];
  return <div aria-hidden="true" style={{ position:'relative', flex:'none',
      width:(lay.cols+pad*2)*m, height:(lay.rows+pad*2)*m,
      background: grounded ? shade : 'transparent' }}>
    {lay.boxes.map(b=>(
      <div key={b.slot} style={{ position:'absolute',
        left:(pad+b.x)*m, top:(pad+b.y)*m, width:b.w*m, height:b.h*m,
        background:inkMarkHex(nameOf(b.slot), dayAccent) }} />
    ))}
  </div>;
}

/* The canonical REALITY wordmark is ../studio-shared/wordmark.jsx (WordmarkSVG) —
   baked vector, the site Logo's paths. Posters use it, never set-text. */


export { BlockEl, ShapeGrain, ShapeEl, IconEl, RuleEl, BurstEl, InkmarkEl, TicketInkMark };
