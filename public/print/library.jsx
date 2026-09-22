/* ============================================================
   REALITY PRINT STUDIO — the library
   The left column: the starter templates (live mini renders), My
   templates, and the parts you drag onto the sheet.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { PALETTE as AP_PAL } from '../studio-shared/brand.js';
import { SIZES as AP_SZ, sizeDims as apDims } from './print-paper.js';
import { TEMPLATES as AP_TPL, TEMPLATE_GROUPS as AP_TPLG, buildTemplate as apBuildTpl } from './print-templates.js';
import { CATALOG as AP_CAT } from './print-data.jsx';
import { PrintElement as APElement } from './print-element.jsx';

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

/* The library column. Which drawers are open is local to it. */
function Library({ userTpls, onApplyTemplate, onApplyUserTpl, onDeleteUserTpl, onSaveUserTpl, onStartSpawn }){
  /* the QR standees are what gets printed most — that group starts open, so
     a first run lands on real layouts instead of four closed drawers */
  const [openSecs, setOpenSecs] = React.useState({ 't:QR standee':true });
  const toggleSec = (k)=> setOpenSecs(s=>({ ...s, [k]:!s[k] }));
  return (
    <div className="ps-lib">
      <div className="ps-libtitle">Templates</div>
      {AP_TPLG.map(grp=>{
        const items = AP_TPL.filter(tp=>tp.group===grp); const k='t:'+grp, open=!!openSecs[k];
        return (
          <React.Fragment key={k}>
            <button className={'ps-sec'+(open?' open':'')} onClick={()=>toggleSec(k)}>
              <span className="caret">{open?'▾':'▸'}</span><span className="t">{grp}</span><span className="n">{items.length}</span>
            </button>
            {open && <div className="ps-tplgrid">
              {items.map(tp=><TplCard key={tp.id} tpl={tp} onApply={()=>onApplyTemplate(tp)} />)}
            </div>}
          </React.Fragment>
        );
      })}
      {(()=>{ const k='my', open=!!openSecs[k]; return (
        <React.Fragment>
          <button className={'ps-sec'+(open?' open':'')} onClick={()=>toggleSec(k)}>
            <span className="caret">{open?'▾':'▸'}</span><span className="t">My templates</span><span className="n">{userTpls.length}</span>
          </button>
          {open && <React.Fragment>
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
          </React.Fragment>}
        </React.Fragment>
      ); })()}

      <div className="ps-libtitle">Parts <span className="hint">drag onto the sheet</span></div>
      {AP_CAT.map(g=>{
        const k='c:'+g.group, open=!!openSecs[k];
        return (
          <React.Fragment key={k}>
            <button className={'ps-sec'+(open?' open':'')} onClick={()=>toggleSec(k)}>
              <span className="caret">{open?'▾':'▸'}</span><span className="t">{g.group}</span><span className="n">{g.items.length}</span>
            </button>
            {open && g.items.map(it=>(
              <div key={it.label} className="ps-libitem" onPointerDown={e=>onStartSpawn(e, it)}>
                <span className="ln">{it.label}</span><span className="lh">{it.hint}</span>
              </div>
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export { Library, TplThumb, TplCard };
