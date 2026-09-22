/* ============================================================
   REALITY PRINT STUDIO — inspector · graphics
   Content panels for the drawn parts: the icon picker (the Year 2
   glyph set, searchable), slab, stripes, halftone field, sticker
   bed, sunburst, shape and rule.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { ICON_GLYPHS, ICON_LABELS, ICON_CATEGORIES, ICON_CORE } from '../studio-shared/print-icons.js';
import { SHAPE_KINDS, RULE_PATTERNS } from '../studio-shared/shapes.js';
import { Slider, Chips, Swatches } from './controls.jsx';

const STICKER_SHAPES = [{v:'circle',l:'Circle'},{v:'rounded',l:'Rounded'},{v:'squircle',l:'Squircle'},{v:'rect',l:'Square'}];
const DOT_SHAPES = [{v:'circle',l:'Circle'},{v:'square',l:'Square'},{v:'diamond',l:'Diamond'},{v:'ring',l:'Ring'},{v:'plus',l:'Plus'}];
const DOT_GRADS = [{v:'none',l:'Even'},{v:'out',l:'Radial out'},{v:'in',l:'Radial in'},{v:'up',l:'Up'},{v:'down',l:'Down'},{v:'left',l:'Left'},{v:'right',l:'Right'},{v:'diag',l:'Diagonal'},{v:'diag2',l:'Diagonal ↗'},{v:'wave',l:'Wave'},{v:'bloom',l:'Bloom'}];
const STRIPE_DIRS = [{v:'h',l:'Horizontal'},{v:'v',l:'Vertical'},{v:'diag',l:'Diagonal ↘'},{v:'diag2',l:'Diagonal ↗'}];
const SHAPE_OPTS = (SHAPE_KINDS||['circle']).map(k=>({v:k, l:k.charAt(0).toUpperCase()+k.slice(1)}));
const RULE_TERMS = [{v:'none',l:'None'},{v:'dot',l:'Dot'},{v:'arrow',l:'Arrow'},{v:'diamond',l:'Diamond'},{v:'star',l:'★ Star'}];

/* ---------- icon picker — the Year 2 glyph set, searchable ---------- */
function IconGlyphSvg({ kind, size }){
  const g = (ICON_GLYPHS||{})[kind]; if(!g) return null;
  return (
    <svg viewBox="0 0 24 24" width={size||22} height={size||22} style={{ display:'block' }}>
      {g.map((p,i)=>{
        const stroke = !!p.linear || p.t==='line';
        const sp = stroke ? { fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinejoin:'miter', strokeLinecap:'square' }
                          : { fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinejoin:'miter', strokeLinecap:'square' };
        if(p.t==='rect')    return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} {...sp} />;
        if(p.t==='line')    return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} {...sp} />;
        if(p.t==='ellipse') return <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} {...sp} />;
        if(p.t==='poly')    return <polygon key={i} points={p.points} {...sp} />;
        if(p.t==='path')    return <path key={i} d={p.d} {...sp} />;
        return null;
      })}
    </svg>
  );
}
function IconPicker({ el, update }){
  const [q, setQ] = React.useState('');
  const labels = ICON_LABELS||{};
  const cats = ICON_CATEGORIES||[];
  const core = ICON_CORE||[];
  const query = q.trim().toLowerCase();
  const match = (k)=> !query || k.indexOf(query)>=0 || (labels[k]||'').toLowerCase().indexOf(query)>=0;
  const grid = (keys)=>(
    <div className="ps-icongrid">
      {keys.filter(match).map(k=>(
        <button key={k} className={'ps-icb'+(el.kind===k?' on':'')} title={labels[k]||k} onClick={()=>update({ kind:k })}>
          <IconGlyphSvg kind={k} />
        </button>
      ))}
    </div>
  );
  return (
    <React.Fragment>
      <div className="ps-row">
        <div className="ps-lab">Glyph<span className="val">{labels[el.kind]||el.kind}</span></div>
        <input className="ps-input" placeholder="Search icons…" value={q} onChange={e=>setQ(e.target.value)} spellCheck={false} />
      </div>
      {query
        ? grid(Object.keys(ICON_GLYPHS||{}))
        : <React.Fragment>
            <div className="ps-mini" style={{ margin:'0 0 4px' }}>Core</div>
            {grid(core)}
            {cats.map(c=>(
              <React.Fragment key={c.group}>
                <div className="ps-mini" style={{ margin:'8px 0 4px' }}>{c.group}</div>
                {grid(c.items)}
              </React.Fragment>
            ))}
          </React.Fragment>}
      <div style={{ height:8 }} />
      <Chips label="Style" options={[{v:false,l:'Stroke'},{v:true,l:'Solid'}]} value={!!el.solid} onChange={v=>update({solid:v})} />
      <Slider label="Stroke weight" val={el.strokeScale!=null?el.strokeScale:1} min={0.5} max={2} step={0.05} onChange={v=>update({strokeScale:v})} suffix="×" />
    </React.Fragment>
  );
}

function SlabPanel({ el, update }){
  return <Slider label="Angle" val={el.angle||0} min={-45} max={45} step={1} onChange={v=>update({angle:v})} suffix="°" />;
}

function StripesPanel({ el, update }){
  return (
    <React.Fragment>
      <Chips label="Direction" options={STRIPE_DIRS} value={el.dir||'diag'} onChange={v=>update({dir:v})} />
      <Slider label="Count" val={el.count||8} min={2} max={40} step={1} onChange={v=>update({count:v})} />
      <Slider label="Thickness" val={el.ratio!=null?el.ratio:0.5} min={0.1} max={0.9} step={0.05} onChange={v=>update({ratio:v})} />
      <Chips label="Ground" options={[{v:'white',l:'White'},{v:'ink',l:'Ink'},{v:'none',l:'None'}]} value={el.bg||'white'} onChange={v=>update({bg:v})} />
    </React.Fragment>
  );
}

function DotfieldPanel({ el, update }){
  return (
    <React.Fragment>
      <Chips label="Dot shape" options={DOT_SHAPES} value={el.shape||'circle'} onChange={v=>update({shape:v})} />
      <Chips label="Size ramp" options={DOT_GRADS} value={el.grad||'none'} onChange={v=>update({grad:v})} />
      {(el.grad && el.grad!=='none') && <Slider label="Ramp strength" val={el.ramp!=null?el.ramp:0.8} min={0} max={1} step={0.05} onChange={v=>update({ramp:v})} />}
      <Slider label="Screen angle" val={el.angle||0} min={-90} max={90} step={1} onChange={v=>update({angle:v})} suffix="°" />
      <Slider label="Dot size" val={el.dot||9} min={2} max={28} step={1} onChange={v=>update({dot:v})} suffix="pt" />
      <Slider label="Gap" val={el.gap!=null?el.gap:6} min={1} max={28} step={1} onChange={v=>update({gap:v})} suffix="pt" />
      <Chips label="Ground" options={[{v:'white',l:'White'},{v:'ink',l:'Ink'},{v:'none',l:'None'}]} value={el.bg||'white'} onChange={v=>update({bg:v})} />
    </React.Fragment>
  );
}

function StickerPanel({ el, update }){
  return (
    <React.Fragment>
      <Chips label="Die-cut shape" options={STICKER_SHAPES} value={el.shape||'circle'} onChange={v=>update({shape:v})} />
      {(el.shape==='rounded'||el.shape==='squircle') &&
        <Slider label="Corner radius" val={el.radius!=null?el.radius:0.22} min={0.05} max={0.5} step={0.01} onChange={v=>update({radius:v})} />}
      <Slider label="Keyline ring" val={el.ringW!=null?el.ringW:4} min={0} max={14} step={0.5} onChange={v=>update({ringW:v})} suffix="pt" />
      <Swatches label="Ring colour" value={el.ring!=null?el.ring:'ink'} onChange={v=>update({ring:v})} white />
    </React.Fragment>
  );
}

function BurstPanel({ el, update }){
  return (
    <React.Fragment>
      <Slider label="Rays" val={el.rays||16} min={6} max={48} step={1} onChange={v=>update({rays:v})} />
      <Slider label="Centre hub" val={el.hub!=null?el.hub:0} min={0} max={0.8} step={0.02} onChange={v=>update({hub:v})} />
      {(el.hub||0)>0 && <Swatches label="Hub fill" value={el.hubFill||'white'} onChange={v=>update({hubFill:v})} white />}
    </React.Fragment>
  );
}

function ShapePanel({ el, update }){
  return (
    <React.Fragment>
      <Chips label="Shape" options={SHAPE_OPTS} value={el.kind||'hexagon'} onChange={v=>update({kind:v})} />
      <Slider label="Keyline stroke" val={el.stroke||0} min={0} max={16} step={0.5} onChange={v=>update({stroke:v})} suffix="pt" />
      {(el.stroke||0)>0 && <Swatches label="Stroke colour" value={el.strokeColor||'ink'} onChange={v=>update({strokeColor:v})} white />}
    </React.Fragment>
  );
}

function RulePanel({ el, update }){
  const pat = el.pattern||el.style||'solid';
  const spaced = ['dashed','dotted','dashdot','ticks','zigzag','wave','square'].indexOf(pat)>=0;
  const wavy = ['zigzag','wave','square'].indexOf(pat)>=0;
  const ampMax = Math.max(4, Math.round(el.h/2 - (el.weight||3)/2));
  return <React.Fragment>
    <Chips label="Line pattern" options={RULE_PATTERNS} value={pat} onChange={v=>update({pattern:v, style:undefined})} />
    <Slider label="Thickness" val={el.weight||3} min={0.5} max={24} step={0.5} onChange={v=>update({weight:v})} suffix="pt" />
    {spaced && <Slider label="Spacing" val={el.spacing!=null?el.spacing:12} min={3} max={64} step={1} onChange={v=>update({spacing:v})} suffix="pt" />}
    {pat==='dashed' && <Slider label="Dash ratio" val={el.dashRatio!=null?el.dashRatio:0.55} min={0.1} max={0.9} step={0.05} onChange={v=>update({dashRatio:v})} />}
    {wavy && <Slider label="Amplitude" val={Math.min(el.amp!=null?el.amp:7, ampMax)} min={1} max={ampMax} step={1} onChange={v=>update({amp:v})} suffix="pt" />}
    {(pat==='double'||pat==='triple') && <Slider label="Line gap" val={el.gap!=null?el.gap:6} min={1} max={32} step={0.5} onChange={v=>update({gap:v})} suffix="pt" />}
    {pat==='ticks' && <React.Fragment>
      <Slider label="Tick length" val={el.tickLen!=null?el.tickLen:6} min={1} max={Math.max(4,Math.round(el.h/2))} step={0.5} onChange={v=>update({tickLen:v})} suffix="pt" />
      <Chips label="Tick direction" options={[{v:'both',l:'Both'},{v:'up',l:'Up'},{v:'down',l:'Down'}]} value={el.tickDir||'both'} onChange={v=>update({tickDir:v})} />
    </React.Fragment>}
    {['solid','dashed','dashdot','ticks','zigzag','wave','square'].indexOf(pat)>=0 &&
      <Chips label="Line cap" options={[{v:'round',l:'Round'},{v:'butt',l:'Flat'}]} value={el.cap||'round'} onChange={v=>update({cap:v})} />}
    <Chips label="Ends" options={RULE_TERMS} value={el.term||'none'} onChange={v=>update({term:v})} />
    {el.term&&el.term!=='none' && <Chips label="Ends at" options={[{v:'end',l:'End'},{v:'start',l:'Start'},{v:'both',l:'Both'}]} value={el.termAt||'end'} onChange={v=>update({termAt:v})} />}
  </React.Fragment>;
}

const GRAPHIC_PANELS = {
  icon:IconPicker, slab:SlabPanel, stripes:StripesPanel, dotfield:DotfieldPanel,
  sticker:StickerPanel, burst:BurstPanel, shape:ShapePanel, rule:RulePanel,
};

export { GRAPHIC_PANELS, IconGlyphSvg, IconPicker };
