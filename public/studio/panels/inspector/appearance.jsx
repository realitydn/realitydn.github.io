/* ============================================================
   REALITY POSTER STUDIO — inspector · colour, surface and shadow
   ============================================================ */
import { PALETTE as AP_PAL, ACCENTS as AP_ACC, ACCENT_BY_DAY, parseSessions, shadowModel } from '../../studio-data.jsx';
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
    <Fold id="sh" title="Shadow" open badge={lift===deflt?null:label} dirty={lift==='custom'?1:0}>
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

/* ---- does Fill do anything to this element, as it stands? ----
   Read off the renderer (studio-element.jsx), not guessed. `el.fill` becomes
   accentHex there, and accentHex reaches the art two ways:
     1. through the surface — surfaceStyle() paints accentHex ONLY for
        'accent' (solid/paper/outline/scrim/none are theme ink and paper;
        'outline' borders and the list row rules are t.fg, not the accent),
        and on an accent card the Auto text colour follows it too;
     2. straight from a renderer, for the accent highlights:
          lineup   — the heading and the first row's name
          sessions — the heading; the row number in a plain (no time, no
                     marker) list
          agenda   — the heading; a row whose day isn't a weekday name
          qr       — the website line
          badge    — the big word
          matchup  — the competition line, the VS coin, the date · time dot
          host     — the kicker, while its own colour is Auto
   Every other surfaced type (title, tagline, info, when, cost, stamp, ticket,
   specials, wordmark) only takes Fill on an Accent surface. When Fill does
   nothing, the swatches go and a one-line note says when it would. */
function fillMatters(el){
  if(el.surface==='accent') return true;
  const has = (s)=> s!=null && String(s).trim()!=='';
  switch(el.type){
    case 'lineup':   return has(el.heading) || (el.items||[]).length>0;
    case 'sessions': {
      if(has(el.heading)) return true;
      const rows = parseSessions(el.raw);
      return !rows.some(r=>r.marker || r.time) && rows.some(r=>r.num);
    }
    /* the renderer's dayCol: a row's own accent, else its weekday's — and the
       poster fill for anything that resolves to neither */
    case 'agenda':   return has(el.heading) || (el.items||[]).some(it=>{
      const d = String(it.day||'');
      return AP_ACC.indexOf(it.accent || ACCENT_BY_DAY[d.charAt(0).toUpperCase()+d.slice(1).toLowerCase()])<0;
    });
    case 'qr':       return has(el.site);
    case 'badge':    return has(el.big);
    case 'matchup':  return true;
    case 'host':     return has(el.kicker) && !(el.kickerColor==='ink' || el.kickerColor==='cream' || AP_ACC.indexOf(el.kickerColor)>=0);
    default:         return false;
  }
}

function SurfaceFold({ el, doc, update, caps, dSurface }){
  const fillOn = caps.surface && fillMatters(el);
  return (
    <React.Fragment>
      {caps.surface &&
        <Fold id="f-surface" title="Colour & surface" open dirty={dSurface}>
          <Chips label="Surface" options={SURFACES} value={el.surface} onChange={v=>update({surface:v})} />
          {fillOn
            ? <React.Fragment>
                <Swatches label={el.type==='host'?'Background / fill':'Fill / accent'} value={el.fill!=null?el.fill:el.color}
                  onChange={v=>update({fill:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
                <Hint tight>Fill colours an <b>Accent</b> surface and the element’s accent highlights (heading, first row…).</Hint>
              </React.Fragment>
            : <div className="rs-mini" style={{ margin:'-6px 0 12px' }}>Fill applies on an <b>Accent</b> surface.</div>}
        </Fold>}
      {el.type==='weekly' &&
        <Fold id="f-surface" title="Accent" dirty={dSurface}>
          <Swatches label="Bar + day" value={el.fill!=null?el.fill:el.color} onChange={v=>update({fill:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
          <Hint tight>The badge stays a white circle; the bar and day follow the accent.</Hint>
        </Fold>}
    </React.Fragment>
  );
}

export { ShadowControls, LIFTS, shadowLift, applyLift, SurfaceFold, fillMatters };
