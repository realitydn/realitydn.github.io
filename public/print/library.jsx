/* ============================================================
   REALITY PRINT STUDIO — the library
   The left column, in Poster Studio's order (21.10.26): Templates
   (one collapsible section — the starters by group, then My
   templates), Parts (drag in, or click to drop one mid-sheet), and
   Graphics (the shape kinds as a grid of silhouettes). Every drawer
   remembers whether it was open (RUI.foldStore), like Poster's.
   ============================================================ */
import { PALETTE as AP_PAL } from '../studio-shared/brand.js';
import { SHAPE_KINDS, shapePath } from '../studio-shared/shapes.js';
import { SIZES as AP_SZ, sizeDims as apDims } from './print-paper.js';
import { TEMPLATES as AP_TPL, TEMPLATE_GROUPS as AP_TPLG, buildTemplate as apBuildTpl } from './print-templates.js';
import { CATALOG as AP_CAT } from './print-data.jsx';
import { PrintElement as APElement } from './print-element.jsx';
import { RUI, Hint } from './controls.jsx';

/* ---------- template thumbnail — a real mini render of the layout ---------- */
function TplThumb({ built, w }){
  const dd = apDims(built.size, built.orient);
  const tw = w||100, sc = tw/dd.wpt, th = Math.round(dd.hpt*sc);
  const noop = ()=>{};
  return (
    <div className="ps-thumbbox" style={{ width:tw, height:th }}>
      <div style={{ width:dd.wpt, height:dd.hpt, transform:`scale(${sc})`, transformOrigin:'0 0',
        background:'#ffffff', position:'relative', overflow:'hidden', pointerEvents:'none' }}>
        {built.elements.map(el=>(
          <APElement key={el.id} el={el} docAccentHex={AP_PAL[built.accent]||AP_PAL.pink} docAccent={built.accent}
            selected={false} dragging={false} onElPointerDown={noop} />
        ))}
      </div>
    </div>
  );
}
function TplCard({ tpl, onApply }){
  const built = React.useMemo(()=>apBuildTpl(tpl), [tpl]);
  return (
    <div className="ps-tplcard" onClick={onApply} title={tpl.name}>
      <TplThumb built={built} w={100} />
      <span className="tn">{tpl.name}</span>
      <span className="ts">{AP_SZ[tpl.size].label}{tpl.orient==='landscape'?' ⬓':''}</span>
    </div>
  );
}

/* A drawer whose open state is remembered — Poster's Sec, on Print's prefix. */
function Sec({ id, title, count, open, children }){
  const key = 'lib:'+id;
  const folds = RUI.useStore(RUI.foldStore);
  const isOpen = folds[key]!=null ? folds[key] : !!open;
  return (
    <React.Fragment>
      <button className={'ps-sec'+(isOpen?' open':'')} onClick={()=>RUI.setFold(key, !isOpen)}>
        <span className="caret">{isOpen?'▾':'▸'}</span>
        <span className="t">{title}</span>
        {count!=null && <span className="n">{count}</span>}
      </button>
      {isOpen && children}
    </React.Fragment>
  );
}

/* the shape kinds as silhouettes, drawn from the SAME shapePath the sheet and
   the PDF use — drag one out (or click) and it lands as that shape */
function ShapeGrid({ onSpawn }){
  const S = 38;
  return (
    <div className="ps-gfxgrid">
      {(SHAPE_KINDS||[]).map(k=>{
        const d = shapePath(k, S, S);
        const label = k.charAt(0).toUpperCase()+k.slice(1);
        return (
          <div key={k} className="ps-gfxtile" title={label}
            onPointerDown={e=>onSpawn(e, { type:'shape', label, props:{ kind:k } })}>
            <span className="gp"><svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ display:'block', overflow:'visible' }}>
              {d ? <path d={d} fill="currentColor" /> : <circle cx={S/2} cy={S/2} r={S/2} fill="currentColor" />}
            </svg></span>
            <span className="gl">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Library({ userTpls, onApplyTemplate, onApplyUserTpl, onDeleteUserTpl, onSaveUserTpl, onStartSpawn }){
  const folds = RUI.useStore(RUI.foldStore);
  const tplOpen = folds['lib:templates']!=null ? folds['lib:templates'] : true;
  return (
    <div className="ps-lib">
      <div className="ps-sech" onClick={()=>RUI.setFold('lib:templates', !tplOpen)}
        style={{ cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>Templates</span><span style={{ fontSize:11, opacity:.6 }}>{tplOpen?'▾':'▸'}</span>
      </div>
      {tplOpen && <React.Fragment>
        {/* the QR standees are what gets printed most — that group starts
            open, so a first run lands on real layouts */}
        {AP_TPLG.map(grp=>{
          const items = AP_TPL.filter(tp=>tp.group===grp);
          return (
            <Sec key={grp} id={'t:'+grp} title={grp} count={items.length} open={grp==='QR standee'}>
              <div className="ps-tplgrid">
                {items.map(tp=><TplCard key={tp.id} tpl={tp} onApply={()=>onApplyTemplate(tp)} />)}
              </div>
            </Sec>
          );
        })}
        <Sec id="my" title="My templates" count={userTpls.length}>
          <div className="ps-tplgrid">
            {userTpls.map(t=>(
              <div key={t.id} className="ps-tplcard" onClick={()=>onApplyUserTpl(t)} title={t.name} style={{ position:'relative' }}>
                <TplThumb built={{ size:t.doc.size, orient:t.doc.orient, accent:t.doc.accent, elements:t.doc.elements }} w={100} />
                <span className="tn">{t.name}</span>
                <span className="ts">{AP_SZ[t.doc.size].label} · {t.doc.elements.length} parts</span>
                <button className="ps-tplx" onClick={e=>{ e.stopPropagation(); onDeleteUserTpl(t.id); }}>×</button>
              </div>
            ))}
          </div>
          <button className="ps-addrow" onClick={onSaveUserTpl} style={{ marginBottom:6 }}>＋ Save current sheet</button>
        </Sec>
        <Hint>Loading a starter replaces the sheet.</Hint>
      </React.Fragment>}

      <div className="ps-libtitle">Parts <span className="hint">drag in, or click</span></div>
      {AP_CAT.map(g=>(
        <Sec key={g.group} id={'c:'+g.group} title={g.group} count={g.items.length}>
          {g.items.map(it=>(
            <div key={it.label} className="ps-libitem" onPointerDown={e=>onStartSpawn(e, it)}>
              <span className="ln">{it.label}</span><span className="lh">{it.hint}</span>
            </div>
          ))}
        </Sec>
      ))}

      <div className="ps-libtitle">Graphics <span className="hint">drag in, or click</span></div>
      <Sec id="g:shapes" title="Shapes" count={(SHAPE_KINDS||[]).length}>
        <ShapeGrid onSpawn={onStartSpawn} />
      </Sec>

      <Hint>Drag a part onto the sheet — it snaps to the grid. A click drops it in the middle of the sheet.</Hint>
    </div>
  );
}

export { Library, TplThumb, TplCard };
