/* ============================================================
   REALITY POSTER STUDIO — graphics picker
   ============================================================ */
import { ICON_CATEGORIES, ICON_CORE, ICON_LABELS } from '../../studio-shared/print-icons.js';
import { shapePath, ruleLayout, burstRays, iconLayout } from '../studio-data.jsx';
/* ============================================================
   GRAPHICS PICKER — one grid component with two jobs:
     library   → each tile DRAG-spawns a new element (pass onSpawn)
     inspector → each tile CLICKS to swap the selected element's kind
                 (pass onPick), so a circle becomes a hexagon in place.
   Previews are drawn from the SAME geometry functions the canvas
   renders with, so what you pick is literally what you get.
   ============================================================ */
function GfxPreview({ type, kind, preset }){
  const S = 38;
  if(type==='shape'){
    /* 'none' only appears in the photo-mask grid — draw it as an empty frame
       rather than letting shapePath fall through to a filled rectangle. */
    if(kind==='none') return <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ display:'block' }}>
      <rect x="2" y="2" width={S-4} height={S-4} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity=".55" />
    </svg>;
    const d = shapePath(kind, S, S);
    return <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ display:'block', overflow:'visible' }}>
      {d ? <path d={d} fill="currentColor" /> : <circle cx={S/2} cy={S/2} r={S/2} fill="currentColor" />}
    </svg>;
  }
  if(type==='rule'){
    const W=46, H=18;
    const lay = ruleLayout({ w:W, h:H, pattern:kind, weight:2.2, amp:4, tickLen:4, term:'none' });
    return <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display:'block' }}>
      {lay.strokes.map((s,i)=><polyline key={'s'+i} points={s.pts.map(p=>p[0]+','+p[1]).join(' ')} fill="none"
        stroke="currentColor" strokeWidth={lay.w} strokeLinecap={lay.cap} />)}
      {lay.dots.map((d,i)=><circle key={'o'+i} cx={d.x} cy={d.y} r={d.r} fill="currentColor" />)}
    </svg>;
  }
  if(type==='burst'){
    const p = preset||{ rays:16, hub:0 };
    const b = burstRays(S, S, p.rays, 0);
    return <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ display:'block' }}>
      {b.wedges.map((w,i)=><path key={i} d={`M${w.cx} ${w.cy} L${w.p0[0]} ${w.p0[1]} L${w.p1[0]} ${w.p1[1]} Z`} fill="currentColor" />)}
      {p.hub>0 && <circle cx={b.cx} cy={b.cy} r={b.R*p.hub} fill="#15110b" />}
    </svg>;
  }
  if(type==='icon'){
    const lay = iconLayout({ kind, w:S, h:S, strokeScale:1, solid:false });
    if(!lay) return null;
    const st = { fill:'none', stroke:'currentColor', strokeWidth:lay.sw, strokeLinecap:'round', strokeLinejoin:'round' };
    return <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ display:'block' }}>
      {lay.prims.map((p,i)=>{
        if(p.t==='rect')    return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} {...st} />;
        if(p.t==='line')    return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} {...st} />;
        if(p.t==='ellipse') return <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} {...st} />;
        if(p.t==='poly')    return <polygon key={i} points={p.pts.map(q=>q[0]+','+q[1]).join(' ')} {...st} />;
        if(p.t==='path')    return <path key={i} d={p.d} {...st} />;
        return null;
      })}
    </svg>;
  }
  return null;
}
function GfxGrid({ type, items, prop, value, onPick, onSpawn, wide }){
  return (
    <div className={'rs-gfxgrid'+(wide?' wide':'')}>
      {items.map(it=>{
        const spawn = onSpawn ? (e)=>onSpawn(e, { type, label:it.l,
          preset: Object.assign({}, it.preset||null, prop?{ [prop]:it.k }:null) }) : undefined;
        return (
          <button key={it.k} type="button" title={it.l}
            className={'rs-gfxtile'+(value===it.k?' on':'')}
            onClick={onPick?()=>onPick(it.k):undefined}
            onPointerDown={spawn}>
            <span className="gp"><GfxPreview type={type} kind={it.k} preset={it.preset} /></span>
            <span className="gl">{it.l}</span>
          </button>
        );
      })}
    </div>
  );
}
/* Icon browser — 70-odd glyphs is too many for one flat grid, so it's a live
   filter over the design system's own categories (plus the core UI set, which
   ICON_CATEGORIES doesn't cover). Search matches key or label. */
function IconPicker({ value, onPick, onSpawn }){
  const [q,setQ] = React.useState('');
  const groups = React.useMemo(()=>{
    const cats = (ICON_CATEGORIES||[]).map(c=>({ group:c.group, items:c.items }));
    const core = (ICON_CORE||[]);
    return core.length ? [{ group:'Core · interface', items:core }].concat(cats) : cats;
  }, []);
  const lab = k => (ICON_LABELS||{})[k] || k.replace(/_/g,' ');
  const needle = q.trim().toLowerCase();
  const hit = k => !needle || k.toLowerCase().indexOf(needle)>=0 || lab(k).toLowerCase().indexOf(needle)>=0;
  const shown = groups.map(g=>({ group:g.group, items:g.items.filter(hit) })).filter(g=>g.items.length);
  const total = shown.reduce((n,g)=>n+g.items.length,0);
  return (
    <React.Fragment>
      <input className="rs-input rs-gfxsearch" type="search" value={q} placeholder="Search icons…"
        onChange={e=>setQ(e.target.value)} />
      {shown.map(g=>(
        <React.Fragment key={g.group}>
          <div className="rs-mini" style={{ margin:'8px 0 4px', opacity:.7 }}>{g.group}</div>
          <GfxGrid type="icon" prop="kind" value={value} onPick={onPick} onSpawn={onSpawn} wide
            items={g.items.map(k=>({ k, l:lab(k) }))} />
        </React.Fragment>
      ))}
      {!total && <div className="rs-mini" style={{ margin:'8px 0' }}>Nothing matches “{q}”.</div>}
    </React.Fragment>
  );
}

export { GfxPreview, GfxGrid, IconPicker };
