/* ============================================================
   REALITY POSTER STUDIO — inspector · arrange, transform, this-format override
   ============================================================ */
import { NumField, Slider, Chips, Fold, Hint } from '../controls.jsx';
import { TAG_HEIGHTS } from './caps.js';
/* Centre-on-canvas row — the same three buttons serve one box and a group of
   them (the handler centres the selection's bounding box either way), so the
   only thing that changes is the label. */
function CentreRow({ label, centre, hint }){
  return (
    <React.Fragment>
      <div className="rs-lab" style={{ marginTop:0 }}>{label}</div>
      <div className="rs-actions">
        <button className="rs-iconbtn" onClick={()=>centre('x')} title="Centre left-to-right on the canvas">⇄ Across</button>
        <button className="rs-iconbtn" onClick={()=>centre('y')} title="Centre top-to-bottom on the canvas">⇕ Down</button>
        <button className="rs-iconbtn" onClick={()=>centre('both')} title="Centre on both axes">⊕ Both</button>
      </div>
      {hint && <div className="rs-mini" style={{ margin:'4px 0 2px' }}>{hint}</div>}
    </React.Fragment>
  );
}

function ArrangeFold({ selCount, align, distribute, centre, formatLabel, del }){
  return (
        <Fold id="f-arrange" title={'Arrange · '+selCount+' selected'} open>
          <div className="rs-lab" style={{ marginTop:0 }}>Align on a vertical line</div>
          <div className="rs-actions">
            <button className="rs-iconbtn" onClick={()=>align('x','left')} title="Align left edges">Left</button>
            <button className="rs-iconbtn" onClick={()=>align('x','center')} title="Align horizontal centres">Centre</button>
            <button className="rs-iconbtn" onClick={()=>align('x','right')} title="Align right edges">Right</button>
          </div>
          <div className="rs-lab">Align on a horizontal line</div>
          <div className="rs-actions">
            <button className="rs-iconbtn" onClick={()=>align('y','top')} title="Align top edges">Top</button>
            <button className="rs-iconbtn" onClick={()=>align('y','middle')} title="Align vertical centres">Middle</button>
            <button className="rs-iconbtn" onClick={()=>align('y','bottom')} title="Align bottom edges">Bottom</button>
          </div>

          {/* Distribute needs something BETWEEN the two extremes to move, so it
              can't do anything at 2 — but HIDING it there just read as "distribute
              is missing". Always shown from 2, disabled until 3, and the hint says
              why. */}
          {(()=>{ const off = selCount<3; return <React.Fragment>
            <div className="rs-lab">Distribute — even gaps</div>
            <div className="rs-actions">
              <button className="rs-iconbtn" disabled={off} onClick={()=>distribute('x','gaps')} title="Equal gaps left-to-right">⇄ Across</button>
              <button className="rs-iconbtn" disabled={off} onClick={()=>distribute('y','gaps')} title="Equal gaps top-to-bottom">⇕ Down</button>
            </div>
            <div className="rs-lab">Distribute — even centres</div>
            <div className="rs-actions">
              <button className="rs-iconbtn" disabled={off} onClick={()=>distribute('x','centres')} title="Equal spacing of centres, left-to-right">⇄ Across</button>
              <button className="rs-iconbtn" disabled={off} onClick={()=>distribute('y','centres')} title="Equal spacing of centres, top-to-bottom">⇕ Down</button>
            </div>
            <div className="rs-mini" style={{ margin:'4px 0 12px' }}>
              {off
                ? <React.Fragment>Select a <b>third</b> box to distribute — with two there's nothing between them to space.</React.Fragment>
                : <React.Fragment>The outermost two stay put. <b>Gaps</b> evens the space between boxes; <b>centres</b> evens their midpoints — they differ once the boxes are different sizes.</React.Fragment>}
            </div>
          </React.Fragment>; })()}

          <div className="rs-lab">Centre the group on the canvas</div>
          <div className="rs-actions">
            <button className="rs-iconbtn" onClick={()=>centre('x')} title="Centre the group left-to-right on the canvas">⇄ Across</button>
            <button className="rs-iconbtn" onClick={()=>centre('y')} title="Centre the group top-to-bottom on the canvas">⇕ Down</button>
            <button className="rs-iconbtn" onClick={()=>centre('both')} title="Centre the group on both axes">⊕ Both</button>
          </div>
          <Hint tight>Moves the whole selection as one onto the {formatLabel} centre — the boxes keep their positions relative to each other.</Hint>
          <button className="rs-iconbtn rs-del" style={{ width:'100%', justifyContent:'center', marginTop:8, marginBottom:10 }} onClick={del}>Delete {selCount}</button>
        </Fold>
  );
}

function TransformFold({ el, update, caps, isText, isOutput, activeLabel, selCount, centre, formatLabel, dTransform }){
  // Tags get a height dial too (chips auto-centre their text); paragraph text
  // auto-sizes to its box, so height stays hidden there.
  const showHeight = !isText || !!caps.tag;
  return (
      <Fold id="f-transform" title={'Transform'+(isOutput?' · '+activeLabel:'')} dirty={dTransform}>
        {/* Numbers first: nudging a slider to an exact 540 is a fight, and
            these are the same X/Y/W/H fields Print Studio has. */}
        <div className="rs-numgrid" style={{ marginBottom:12 }}>
          <NumField label="X" value={Math.round(el.x)} onChange={v=>update({x:Math.round(v)})} />
          <NumField label="Y" value={Math.round(el.y)} onChange={v=>update({y:Math.round(v)})} />
          <NumField label="W" value={Math.round(el.w)} min={60} onChange={v=>update({w:Math.round(v)})} />
          <NumField label="H" value={Math.round(el.h)} min={40} onChange={v=>update({h:Math.round(v)})} />
          <NumField label="Rot°" value={Math.round(el.rot||0)} onChange={v=>update({rot:Math.round(v)})} />
        </div>
        {selCount<2 && <CentreRow label="Centre on the canvas" centre={centre}
          hint={'Exact centre of the '+formatLabel+' canvas — never snapped to the grid.'} />}
        <Chips label="Tilt presets" options={[{v:0,l:'0°'},{v:-3,l:'-3°'},{v:3,l:'+3°'},{v:-6,l:'-6°'},{v:6,l:'+6°'}]} value={el.rot||0} onChange={v=>update({rot:v})} />
        <Slider label="Rotation" val={el.rot||0} min={-45} max={45} onChange={v=>update({rot:v})} suffix="°" />
        <Slider label="Width" val={el.w} min={120} max={1080} step={6} onChange={v=>update({w:v})} suffix="px" />
        {caps.widthPreset && <Chips label="Width presets" options={[{v:540,l:'Half'},{v:756,l:'Wide'},{v:900,l:'Safe'},{v:1080,l:'Bleed'}]} value={el.w} onChange={v=>update({w:v})} />}
        {showHeight && <Slider label="Height" val={el.h} min={70} max={1920} step={6} onChange={v=>update({h:v})} suffix="px" />}
        {caps.height && <Chips label="Height presets — match across tags" options={TAG_HEIGHTS} value={el.h} onChange={v=>update({h:v})} />}
        <Chips label="Anchor (all formats)" options={[{v:'safe',l:'Safe cluster'},{v:'bottom',l:'Pin to base'}]} value={el.anchor||'safe'} onChange={v=>update({anchor:v})} />
      </Fold>
  );
}

function OverrideFold({ el, isText, activeLabel, resetOverride, toggleHidden }){
  return (
        <Fold id="f-override" title={activeLabel+' only'} open badge={el._overridden?'detached':null}>
          <Chips label={'Visibility · '+activeLabel} options={[{v:false,l:'Shown'},{v:true,l:'Hidden'}]} value={!!el.hidden} onChange={v=>toggleHidden(el.id, v)} />
          {el._overridden
            ? <React.Fragment>
                <button className="rs-addrow" onClick={()=>resetOverride(el.id)}>↺ Reset to Master</button>
                <div className="rs-mini" style={{ margin:'6px 0 10px' }}>Layout detached for {activeLabel}. Reset to follow Master again.</div>
              </React.Fragment>
            : <div className="rs-mini" style={{ marginBottom:10 }}>Following Master. Move, resize, rotate{el.type==='photo'?', reframe the photo':''}{isText?', resize text':''} to override just {activeLabel}.</div>}
        </Fold>
  );
}

export { CentreRow, ArrangeFold, TransformFold, OverrideFold };
