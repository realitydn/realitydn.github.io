/* ============================================================
   REALITY PRINT STUDIO — inspector · marks, arc text, wayfinding
   Content panels for the brand carriers and the lettering parts
   that aren't plain text boxes: arc text, the REALITY footer, badge
   / seal, marquee, arrow, contact, the wordmark and the ink mark.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { INK_MARK, INK_MARK_DAY_KEYS } from '../studio-shared/brand.js';
import { Field, Slider, Chips, Hint } from './controls.jsx';

function ArcTextPanel({ el, update }){
  return (
    <React.Fragment>
      <Field label="Text" value={el.text} onChange={v=>update({text:v})} />
      <Chips label="Arc" options={[{v:false,l:'Top'},{v:true,l:'Bottom'}]} value={!!el.flip} onChange={v=>update({flip:v})} />
      <Slider label="Radius nudge" val={el.radiusAdj||0} min={-90} max={90} step={2} onChange={v=>update({radiusAdj:v})} suffix="pt" />
      <Slider label="Size" val={el.fontSize||24} min={8} max={80} step={1} onChange={v=>update({fontSize:v})} suffix="pt" />
      <Chips label="Weight" options={[{v:500,l:'Medium'},{v:700,l:'Bold'},{v:800,l:'Heavy'}]} value={el.weight||700} onChange={v=>update({weight:v})} />
      <Slider label="Letter spacing" val={el.tracking!=null?el.tracking:0.08} min={-0.02} max={0.4} step={0.005} onChange={v=>update({tracking:v})} suffix="em" />
      <Chips label="Case" options={[{v:true,l:'UPPER'},{v:false,l:'As typed'}]} value={el.upper!==false} onChange={v=>update({upper:v})} />
    </React.Fragment>
  );
}

function FooterPanel({ el, update }){
  return (
    <React.Fragment>
      <Field label="Website" value={el.site} onChange={v=>update({site:v})} />
      <Field label="Address" value={el.addr} onChange={v=>update({addr:v})} />
      <Field label="QR encodes" value={el.qrData} onChange={v=>update({qrData:v})} />
      <Chips label="QR" options={[{v:true,l:'Show'},{v:false,l:'Hide'}]} value={el.showQR!==false} onChange={v=>update({showQR:v})} />
      {/* absent prop = ON — the footer is the print ticket, the brand carrier */}
      <Chips label="Ink mark" options={[{v:'on',l:'On'},{v:'off',l:'Off'}]} value={el.mark||'on'} onChange={v=>update({mark:v})} />
      {el.mark!=='off' && <Chips label="Mark form" options={[{v:'auto',l:'Auto'},{v:'square',l:'Square'},{v:'strip',l:'Strip'},{v:'strip-long',l:'Full strip'}]}
        value={el.markForm||'auto'} onChange={v=>update({markForm:v})} />}
      {el.mark!=='off' && <Chips label="Mark mode" options={[{v:'full',l:'Full'},{v:'majors',l:'Majors'},{v:'ink',l:'Ink'}]}
        value={el.markMode||(((el.markForm||'auto')==='square'||((el.markForm||'auto')==='auto'&&el.showQR!==false))?'full':'majors')} onChange={v=>update({markMode:v})} />}
      <Hint>Auto pairs the canon square with the QR (flush — its quiet zone is the gap) and a short strip with a bare band; Square / Strip / Full strip force one form. Mode unset keeps each form's classic ink (square Full · strip Majors). Stock cells stay unprinted.</Hint>
      <Chips label="Top rule" options={[{v:true,l:'On'},{v:false,l:'Off'}]} value={el.rule!==false} onChange={v=>update({rule:v})} />
    </React.Fragment>
  );
}

function BadgePanel({ el, update }){
  return (
    <React.Fragment>
      <Field label="Top" value={el.top} onChange={v=>update({top:v})} />
      <Field label="Big" value={el.big} onChange={v=>update({big:v})} />
      <Field label="Sub" value={el.sub} onChange={v=>update({sub:v})} />
      <Slider label="Rotate" val={el.rot||0} min={-20} max={20} step={1} onChange={v=>update({rot:v})} suffix="°" />
    </React.Fragment>
  );
}

function MarqueePanel({ el, update }){
  return (
    <React.Fragment>
      <Field label="Word" value={el.text} onChange={v=>update({text:v})} />
      <Field label="Separator" value={el.sep} onChange={v=>update({sep:v})} />
      <Slider label="Size" val={el.fontSize||15} min={8} max={40} step={1} onChange={v=>update({fontSize:v})} suffix="pt" />
    </React.Fragment>
  );
}

function ArrowPanel({ el, update }){
  return (
    <React.Fragment>
      <Chips label="Direction" options={[{v:'up',l:'↑'},{v:'right',l:'→'},{v:'down',l:'↓'},{v:'left',l:'←'}]} value={el.dir||'right'} onChange={v=>update({dir:v})} />
      <Field label="Label (optional)" value={el.label} onChange={v=>update({label:v})} />
    </React.Fragment>
  );
}

function ContactPanel({ el, update }){
  return (
    <React.Fragment>
      <Field label="Site / line 1" value={el.site} onChange={v=>update({site:v})} />
      <Field label="Address / line 2" value={el.addr} onChange={v=>update({addr:v})} />
      <Chips label="Align" options={[{v:'left',l:'Left'},{v:'center',l:'Center'}]} value={el.align||'left'} onChange={v=>update({align:v})} />
    </React.Fragment>
  );
}

function WordmarkPanel({ el, update }){
  return <div className="ps-mini" style={{ marginBottom:8 }}>The canonical REALITY vector — Montserrat with the Alternates A·I·Y. Colour below.</div>;
}

function InkMarkPanel({ el, update }){
  /* the canon grid (brand.js INK_MARK) — the panel only RECOLOURS
     (mode/day) or resizes by whole modules; cell order is untouchable.
     Form/module changes snap the box to exact module multiples so cells
     stay square; a free drag-resize still fits-and-centres undistorted. */
  const IM = INK_MARK;
  const form = el.form||'strip-v';
  const f = IM.forms[form] || IM.forms['strip-v'];
  const m = Math.max(1, Math.round(Math.min(el.w/f.cols, el.h/f.rows)));
  const floor = IM.floors[form.indexOf('short')>=0 ? 'short' : f.square ? 'square' : 'strip'];
  const fit = (patch, mod)=>{
    const nf = IM.forms[patch.form!=null?patch.form:form] || f;
    return Object.assign(patch, { w:Math.round(nf.cols*mod), h:Math.round(nf.rows*mod) });
  };
  const days = INK_MARK_DAY_KEYS.map(d=>({ v:d, l:d.charAt(0).toUpperCase()+d.slice(1) }));
  return <React.Fragment>
    <Chips label="Form" options={[
      {v:'strip-v',l:'Strip'},{v:'strip-h',l:'Strip ↔'},
      {v:'strip-short-v',l:'Short'},{v:'strip-short-h',l:'Short ↔'},
      {v:'square',l:'Square'},{v:'square-anchored',l:'Anchored'}]}
      value={form} onChange={v=>update(fit({form:v}, m))} />
    <Chips label="Mode" options={[{v:'full',l:'Full'},{v:'majors',l:'Majors'},{v:'daycode',l:'Day code'},{v:'ink',l:'Ink'}]}
      value={el.mode||'full'} onChange={v=>update({mode:v})} />
    {el.mode==='daycode' && <Chips label="Day — sets the hue" options={days}
      value={el.day||'fri'} onChange={v=>update({day:v})} />}
    <Slider label="Module" val={m} min={floor} max={60} step={1} suffix="pt"
      onChange={v=>update(fit({}, v))} />
    <Hint>Cell order is canon — recolour by mode/day only. Stock cells are the paper: <b>unprinted</b> in the PDF, never a cream fill. One mark per surface.</Hint>
  </React.Fragment>;
}

const MARK_PANELS = {
  arctext:ArcTextPanel, footer:FooterPanel, badge:BadgePanel, seal:BadgePanel, marquee:MarqueePanel,
  arrow:ArrowPanel, contact:ContactPanel, wordmark:WordmarkPanel, inkmark:InkMarkPanel,
};

export { MARK_PANELS };
