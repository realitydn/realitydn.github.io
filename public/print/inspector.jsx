/* ============================================================
   REALITY PRINT STUDIO — the inspector
   One canonical order for every element (Actions → Content → Type →
   Colour & surface → Treatment → Border → Arrange); the per-type
   Content comes from the family panels (inspector-graphics, -lists,
   -marks, image-controls). Nothing selected → the sheet panel.
   Also the plane-shadow dials and the multi-select align bar.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { processImageFile } from '../studio-shared/image-intake.jsx';
import { PALETTE as AP_PAL, ACCENTS as AP_ACC } from '../studio-shared/brand.js';
import { PrintImg } from './print-store.js';
import { INK as AP_INK, gridSpec } from './print-paper.js';
import { DEFAULTS as AP_DEF } from './print-data.jsx';
import {
  RUI, Field, Slider, Chips, NumField, Fold, Hint, ScaleControl, Swatches,
  SURFACES, FAMS, LIFTS, ECHOABLE, LIFTABLE, BLENDS, ORIENTS, BLENDABLE, FITTABLE, ORIENTABLE,
  BORDER_PATTERNS, SURFACED_BOX,
} from './controls.jsx';
import { ImageControls } from './image-controls.jsx';
import { GRAPHIC_PANELS } from './inspector-graphics.jsx';
import { LIST_PANELS } from './inspector-lists.jsx';
import { MARK_PANELS } from './inspector-marks.jsx';
import { SheetPanel } from './sheet-panel.jsx';

/* type → its Content panel (the bespoke part of the inspector) */
const PANELS = Object.assign({}, GRAPHIC_PANELS, LIST_PANELS, MARK_PANELS);

/* ---------- shadow — the Year 2 plane, preset or dialled ---------- */
function ShadowControls({ el, update }){
  const key = el.lift||'none';
  return (
    <React.Fragment>
      <Chips label="Lift · plane shadow" options={LIFTS} value={key} onChange={v=>update({lift:v})} />
      {key==='custom' && <React.Fragment>
        <Slider label="Distance" val={el.shadowDist!=null?el.shadowDist:8} min={0} max={40} step={1} onChange={v=>update({shadowDist:v})} suffix="pt" />
        <Slider label="Direction" val={el.shadowAngle!=null?el.shadowAngle:90} min={-180} max={180} step={5} onChange={v=>update({shadowAngle:v})} suffix="°" />
        <div className="ps-lab">Shadow ink<span className="val">{el.shadowColor||'soft K'}</span></div>
        <div className="ps-swatches">
          <div className={'ps-sw'+((el.shadowColor||'k')==='k'?' on':'')} title="Soft press tint (K)"
            style={{ background:'linear-gradient(135deg,#777 0 50%,#ddd 50% 100%)', border:'1.5px solid #cfc7b6' }}
            onClick={()=>update({shadowColor:'k', shadowAlpha:null})} />
          <div className={'ps-sw'+(el.shadowColor==='ink'?' on':'')} title="Ink" style={{ background:AP_INK.rgb }}
            onClick={()=>update({shadowColor:'ink', shadowAlpha:el.shadowAlpha!=null?el.shadowAlpha:1})} />
          {AP_ACC.map(a=>(
            <div key={a} className={'ps-sw'+(el.shadowColor===a?' on':'')} title={a} style={{ background:AP_PAL[a] }}
              onClick={()=>update({shadowColor:a, shadowAlpha:el.shadowAlpha!=null?el.shadowAlpha:1})} />
          ))}
        </div>
        <Slider label="Opacity" val={el.shadowAlpha!=null?el.shadowAlpha:((el.shadowColor||'k')==='k'?0.12:1)} min={0.05} max={1} step={0.01} onChange={v=>update({shadowAlpha:v})} />
        <Hint tight>Hard accent shadow — distance up, full opacity. Very riso. Soft K prints as a grey tint on the black plate.</Hint>
      </React.Fragment>}
    </React.Fragment>
  );
}

/* ---------- align / distribute bar (multi-select) ---------- */
function AlignBar({ count, align, distribute }){
  return (
    <React.Fragment>
      <div className="ps-sech">{count} selected</div>
      <div className="ps-actions">
        <button className="ps-iconbtn" onClick={()=>align('x','left')} title="Align left edges">⇤</button>
        <button className="ps-iconbtn" onClick={()=>align('x','center')} title="Align horizontal centres">↔</button>
        <button className="ps-iconbtn" onClick={()=>align('x','right')} title="Align right edges">⇥</button>
        <button className="ps-iconbtn" onClick={()=>align('y','top')} title="Align top edges">⤒</button>
        <button className="ps-iconbtn" onClick={()=>align('y','middle')} title="Align vertical centres">↕</button>
        <button className="ps-iconbtn" onClick={()=>align('y','bottom')} title="Align bottom edges">⤓</button>
      </div>
      {count>=3 && <div className="ps-actions">
        <button className="ps-iconbtn" style={{ flex:1 }} onClick={()=>distribute('x')} title="Equal horizontal gaps">Distribute ↔</button>
        <button className="ps-iconbtn" style={{ flex:1 }} onClick={()=>distribute('y')} title="Equal vertical gaps">Distribute ↕</button>
      </div>}
      <Hint>Shift-click adds to the selection. Drag any selected part to move the whole set.</Hint>
    </React.Fragment>
  );
}

/* ============================================================
   INSPECTOR — one canonical order for every element:
   Actions → Content → Type → Colour & surface → Treatment →
   Border → Arrange. Capability arrays (ECHOABLE / LIFTABLE /
   BLENDABLE / SURFACED_BOX / FITTABLE / ORIENTABLE) decide what
   shows, so parity can't drift between element types.
   ============================================================ */
function Inspector({ el, doc, dims, update, dup, del, layer, clearAll, setDoc, selCount, align, distribute }){
  if(!el) return <SheetPanel doc={doc} setDoc={setDoc} dims={dims} clearAll={clearAll} />;

  const isText = ['headline','body','kicker','bignum','numeral'].indexOf(el.type)>=0;
  const onPickImage = (file)=> processImageFile(file, ({data,w,h})=>{
    if(!PrintImg) return;
    PrintImg.add(data, w, h).then(id=>{
      const patch={ imgId:id };
      if(!el.imgId && w && h) patch.h = Math.max(20, Math.round(el.w * h/w));
      update(patch);
    });
  });
  const gridS = gridSpec(doc, dims);

  /* ---- bespoke content per type ---- */
  let content = null;
  if(isText) content = <Field label="Text" value={el.text} onChange={v=>update({text:v})} area />;
  else if(el.type==='image') content = <ImageControls el={el} update={update} onFile={onPickImage} docAccent={doc.accent} />;
  else if(PANELS[el.type]){ const Panel = PANELS[el.type]; content = <Panel el={el} update={update} />; }

  /* the ink mark's palette is canon-fixed — no colour/surface dials for it */
  const showColour = el.type!=='image' && el.type!=='inkmark';
  const showBorder = (el.type==='block' || (SURFACED_BOX.indexOf(el.type)>=0 && el.surface && el.surface!=='none'));

  /* Fold badges + auto-open, counted against what this element type is BORN
     with (DEFAULTS[type].props). A collapsed fold showing "3" is the whole
     point of collapsing them: you can still see where the edits are. */
  const base = (AP_DEF[el.type]||{}).props || {};
  const dirt = (keys)=>RUI.dirtyCount(el, keys, base);
  const dType   = dirt(['fontSize','fam','weight','align','tracking','leading','upper','fit','orient']);
  const dColour = dirt(['ink','fill','surface']);
  const dTreat  = dirt(['lift','echo','echoAccent','echoDx','echoDy','blend']);
  const dBorder = dirt(['border','borderPattern','borderColor','radius']);

  return (
    <React.Fragment>
      <div className="ps-sech ps-seltype">{el.type}</div>
      <div className="ps-actions">
        <button className="ps-iconbtn" onClick={()=>layer(1)} title="Bring forward">▲</button>
        <button className="ps-iconbtn" onClick={()=>layer(-1)} title="Send back">▼</button>
        <button className="ps-iconbtn" onClick={dup}>Duplicate</button>
        <button className="ps-iconbtn ps-del" onClick={del}>Delete</button>
      </div>
      {selCount>=2 && <AlignBar count={selCount} align={align} distribute={distribute} />}

      {content && (el.type==='image'
        ? content   /* the photo panel brings its own Folds */
        : <Fold id={'c-'+el.type} title="Content" open>{content}</Fold>)}

      {isText && <Fold id="f-type" title="Type" open dirty={dType}>
        <ScaleControl label="Size" val={el.fontSize} onChange={v=>update({fontSize:v})} />
        <Chips label="Typeface" options={FAMS} value={el.fam||'mont'} onChange={v=>update({fam:v})} />
        {el.fam==='grot'
          ? <Chips label="Weight" options={[{v:400,l:'Regular'},{v:500,l:'Medium'}]} value={el.weight||400} onChange={v=>update({weight:v})} />
          : el.fam!=='alt' && <Chips label="Weight" options={[{v:100,l:'Thin'},{v:500,l:'Medium'},{v:700,l:'Bold'},{v:800,l:'Heavy'}]} value={el.weight||800} onChange={v=>update({weight:v})} />}
        <Chips label="Align" options={[{v:'left',l:'Left'},{v:'center',l:'Center'},{v:'right',l:'Right'}]} value={el.align||'left'} onChange={v=>update({align:v})} />
        <Slider label="Letter spacing" val={el.tracking!=null?el.tracking:0} min={-0.05} max={0.5} step={0.005} onChange={v=>update({tracking:v})} suffix="em" />
        <Slider label="Line height" val={el.leading!=null?el.leading:(el.type==='body'?1.32:0.95)} min={0.7} max={2} step={0.02} onChange={v=>update({leading:v})} />
        <Chips label="Case" options={[{v:true,l:'UPPER'},{v:false,l:'As typed'}]} value={el.upper!==false} onChange={v=>update({upper:v})} />
        {FITTABLE.indexOf(el.type)>=0 && <Chips label="Auto-fit width" options={[{v:false,l:'Off'},{v:true,l:'Fit box'}]} value={!!el.fit} onChange={v=>update({fit:v})} />}
        {ORIENTABLE.indexOf(el.type)>=0 && <Chips label="Orientation" options={ORIENTS} value={el.orient||'h'} onChange={v=>update({orient:v})} />}
      </Fold>}

      {showColour && <Fold id="f-colour" title="Colour & surface" open dirty={dColour}>
        {['headline','numeral','body','kicker','bignum','pricelist','qr','coupon','contact','arrow','wordmark','footer','badge','marquee','arctext','icon','punchgrid'].indexOf(el.type)>=0 &&
          <Swatches label={el.type==='arctext'?'Text':'Ink'} value={el.type==='arctext'?(el.fill!=null?el.fill:'ink'):(el.ink!=null?el.ink:'auto')} onChange={v=>update(el.type==='arctext'?{fill:v}:{ink:v})} auto white />}
        {['block','rule','slab','stripes','dotfield','badge','seal','marquee','sticker','burst','shape'].indexOf(el.type)>=0 &&
          <Swatches label={el.type==='sticker'?'Bed fill':el.type==='burst'?'Ray colour':'Fill'} value={el.fill!=null?el.fill:'pink'} onChange={v=>update({fill:v})} white />}
        {SURFACED_BOX.indexOf(el.type)>=0 &&
          <Chips label="Surface" options={SURFACES} value={el.surface||'none'} onChange={v=>update({surface:v})} />}
        {['headline','numeral','bignum','kicker','pricelist','qr','coupon','arrow'].indexOf(el.type)>=0 && el.surface==='accent' &&
          <Swatches label="Surface accent" value={el.fill!=null?el.fill:'pink'} onChange={v=>update({fill:v})} />}
      </Fold>}

      {(LIFTABLE.indexOf(el.type)>=0 || ECHOABLE.indexOf(el.type)>=0 || BLENDABLE.indexOf(el.type)>=0) &&
        <Fold id="f-treat" title="Treatment" dirty={dTreat}>
          {LIFTABLE.indexOf(el.type)>=0 && <ShadowControls el={el} update={update} />}
          {ECHOABLE.indexOf(el.type)>=0 && <React.Fragment>
            <Chips label="Echo · misregistration" options={[{v:false,l:'Off'},{v:true,l:'On'}]} value={!!el.echo} onChange={v=>update({echo:v})} />
            {el.echo && <React.Fragment>
              <Swatches label="Echo colour" value={el.echoAccent||'auto'} onChange={v=>update({echoAccent:v})} auto />
              <div className="ps-rowflex">
                <Slider label="Echo X" val={el.echoDx!=null?el.echoDx:4} min={-24} max={24} step={1} onChange={v=>update({echoDx:v})} suffix="pt" />
                <Slider label="Echo Y" val={el.echoDy!=null?el.echoDy:4} min={-24} max={24} step={1} onChange={v=>update({echoDy:v})} suffix="pt" />
              </div>
            </React.Fragment>}
          </React.Fragment>}
          {BLENDABLE.indexOf(el.type)>=0 && <Chips label="Blend · overprint" options={BLENDS} value={el.blend||'normal'} onChange={v=>update({blend:v})} />}
        </Fold>}

      {showBorder && (()=>{
        const bw = el.border!=null?el.border:(el.type==='block'?0:2);
        return <Fold id="f-border" title="Border" badge={bw>0?bw+'pt':null} dirty={dBorder}>
          <Slider label="Border width" val={bw} min={0} max={12} step={0.5} onChange={v=>update({border:v})} suffix="pt" />
          {bw>0 && <React.Fragment>
            <Chips label="Border pattern" options={BORDER_PATTERNS} value={el.borderPattern||'solid'} onChange={v=>update({borderPattern:v})} />
            <Swatches label="Border colour" value={el.borderColor!=null?el.borderColor:'auto'} onChange={v=>update({borderColor:v})} auto white />
          </React.Fragment>}
          <Slider label="Corner radius" val={el.radius||0} min={0} max={60} step={1} onChange={v=>update({radius:v})} suffix="pt" />
        </Fold>;
      })()}

      <Fold id="f-arrange" title="Arrange" open>
        <div className="ps-numgrid">
          <NumField label="X" value={el.x} onChange={v=>update({x:Math.round(v)})} />
          <NumField label="Y" value={el.y} onChange={v=>update({y:Math.round(v)})} />
          <NumField label="W" value={el.w} min={8} onChange={v=>update({w:Math.round(v)})} />
          <NumField label="H" value={el.h} min={6} onChange={v=>update({h:Math.round(v)})} />
          <NumField label="Rot°" value={el.rot||0} onChange={v=>update({rot:Math.round(v)})} />
        </div>
        <div className="ps-actions" style={{ marginTop:8 }}>
          <button className="ps-iconbtn" style={{ flex:1 }} title="Fit width to the safe margins"
            onClick={()=>update({ x:Math.round(gridS.m), w:Math.round(dims.wpt-gridS.m*2) })}>Margins</button>
          <button className="ps-iconbtn" style={{ flex:1 }} title="Full bleed width"
            onClick={()=>update({ x:0, w:Math.round(dims.wpt) })}>Bleed W</button>
          <button className="ps-iconbtn" style={{ flex:1 }} title="Centre horizontally"
            onClick={()=>update({ x:Math.round((dims.wpt-el.w)/2) })}>Centre H</button>
          <button className="ps-iconbtn" style={{ flex:1 }} title="Centre vertically"
            onClick={()=>update({ y:Math.round((dims.hpt-el.h)/2) })}>Centre V</button>
        </div>
      </Fold>
    </React.Fragment>
  );
}

export { Inspector };
