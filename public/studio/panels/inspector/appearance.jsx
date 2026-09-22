/* ============================================================
   REALITY POSTER STUDIO — inspector · colour, surface and shadow
   ============================================================ */
import { PALETTE as AP_PAL, shadowModel } from '../../studio-data.jsx';
import { Chips, Slider, Fold, Hint, Swatches, SURFACES } from '../controls.jsx';
/* One shadow control for every element. Defaults + slider ranges come from the
   shared window.shadowModel, so what you see matches what renders, and a brand
   new element's shadow Just Works. Applies as a text-shadow on bare text, a
   box-shadow on a surfaced card, or a drop-shadow on artwork (photo/logo/block/
   weekly) — the model picks the mode. */
function ShadowControls({ el, update, theme }){
  const m = shadowModel(el, theme);
  const lift = shadowLift(el, m);
  const label = (LIFTS.find(x=>x.v===lift)||{}).l;
  // Only badge a rung you chose. "Lift" on an element whose family lifts by
  // default is the absence of a decision, and badging it says nothing.
  const deflt = m.defOn ? 'lift' : 'off';
  return (
    <Fold id="sh" title="Shadow" badge={lift===deflt?null:label} dirty={lift==='custom'?1:0}>
      <Chips label="Lift" options={LIFTS} value={lift} onChange={v=>update(applyLift(v,m))} />
      {lift==='custom' && <React.Fragment>
        <Slider label="Distance" val={m.dist} min={0} max={m.maxDist} step={1} onChange={v=>update({shadowDist:v})} suffix="px" />
        <Slider label="Direction" val={m.ang} min={-180} max={180} step={5} onChange={v=>update({shadowAngle:v})} suffix="°" />
        <Slider label="Blur" val={m.blur} min={0} max={m.maxBlur} step={1} onChange={v=>update({shadowBlur:v})} suffix="px" />
        <Slider label="Opacity" val={m.alpha} min={0.05} max={1} step={0.01} onChange={v=>update({shadowAlpha:v})} />
        <Swatches label="Shadow colour" value={m.ck} autoTitle="Auto — soft press shadow"
          onChange={v=>update(v==='fg'?{shadowColor:'fg',shadowAlpha:null}:{shadowColor:v,shadowAlpha:el.shadowAlpha!=null?el.shadowAlpha:0.9})} />
      </React.Fragment>}
      <Hint tight>
        {m.mode==='text'
          ? <span>Falls on the letters (bare text) — add a surface for a card shadow instead. <b>Hard</b> is the riso one: far, unblurred, opaque.</span>
          : <span><b>Lift</b> is this element's own default drop. <b>Hard</b> throws it further with no blur — very riso. <b>Custom</b> opens the dials.</span>}
      </Hint>
    </Fold>
  );
}

/* ---- shadow, as a ladder instead of six dials ----
   Print Studio has had this shape for a while (its LIFTS) and it's the right
   one: four named steps carry every shadow anyone actually places, and the
   dials stay one click away for the fifth case. The rungs are multiples of
   the type's OWN defaults (shadowModel computes those per element family), so
   "Lift" on a photo and "Lift" on a chip both look right. */
const LIFTS = [{v:'off',l:'Flat'},{v:'light',l:'Light'},{v:'lift',l:'Lift'},{v:'heavy',l:'Hard'},{v:'custom',l:'Custom'}];
function shadowLift(el, m){
  if(el.shadowLift) return el.shadowLift;
  // Posters saved before the ladder existed: read the rung back off the dials.
  if(!m.on) return 'off';
  const touched = el.shadowDist!=null || el.shadowBlur!=null || el.shadowAngle!=null
               || el.shadowAlpha!=null || !!el.shadowColor;
  return touched ? 'custom' : 'lift';
}
function applyLift(v, m){
  // null clears an override — shadowModel then falls back to the type default,
  // which is exactly what "Lift" means.
  const clear = { shadowDist:null, shadowBlur:null, shadowAngle:null, shadowAlpha:null, shadowColor:null };
  if(v==='off')   return Object.assign({ shadowLift:'off',   shadowOn:false }, clear);
  if(v==='light') return Object.assign({ shadowLift:'light', shadowOn:true }, clear, { shadowDist:Math.max(1,Math.round(m.dDef*0.55)), shadowBlur:m.bDef });
  if(v==='lift')  return Object.assign({ shadowLift:'lift',  shadowOn:true }, clear);
  if(v==='heavy') return Object.assign({ shadowLift:'heavy', shadowOn:true }, clear, { shadowDist:Math.round(m.dDef*2.2), shadowBlur:0, shadowAlpha:0.9 });
  return { shadowLift:'custom', shadowOn:true };
}

function SurfaceFold({ el, doc, update, caps, dSurface }){
  return (
    <React.Fragment>
      {caps.surface &&
        <Fold id="f-surface" title="Colour & surface" dirty={dSurface}>
          <Chips label="Surface" options={SURFACES} value={el.surface} onChange={v=>update({surface:v})} />
          <Swatches label={el.type==='host'?'Background / fill':'Fill / accent'} value={el.fill!=null?el.fill:el.color}
            onChange={v=>update({fill:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
          <Hint tight>Fill colours an <b>Accent</b> surface and the element’s accent highlights (heading, first row…).</Hint>
        </Fold>}
      {el.type==='weekly' &&
        <Fold id="f-surface" title="Accent" dirty={dSurface}>
          <Swatches label="Bar + day" value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
          <Hint tight>The badge stays a white circle; the bar and day follow the accent.</Hint>
        </Fold>}
    </React.Fragment>
  );
}

export { ShadowControls, LIFTS, shadowLift, applyLift, SurfaceFold };
