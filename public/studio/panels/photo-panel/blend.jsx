/* ============================================================
   REALITY POSTER STUDIO — photo panel · Blend with photo
   ============================================================ */
import { Chips, Slider, Fold, Hint } from '../controls.jsx';
import { PRESS_BLENDS } from './looks.js';
function BlendFold({ el, update, blendDirty }){
  /* The press's own grade, in the under-layer's prop names — what the photo
     showing through is graded by while the two are joined. */
  const pressGrade = { underBright:el.brightness||0, underContrast:el.contrast!=null?el.contrast:1,
    underSat:el.saturation!=null?el.saturation:1, underHue:el.hue||0, underTemp:el.temperature||0 };
  /* Whether any of the photograph survives the print at all. Opaque ink at full
     strength everywhere leaves none of it, and the engine skips the whole
     composite in that case — so the panel says so rather than offering dials
     that cannot move anything. */
  const photoShowsThrough = (el.treatStrength!=null && el.treatStrength<1)
    || (el.treatWhere && el.treatWhere!=='all') || ((el.treatBlend||'normal')!=='normal')
    || ((el.treatRegion||'none')!=='none');
  const blendDef = PRESS_BLENDS.find(b=>b.v===(el.treatBlend||'normal'));
  return (
        <Fold id="ph-blend" title="Blend with photo" dirty={blendDirty}
          hint={<React.Fragment><b>Strength</b> fades the print towards the photo, <b>Where</b> feathers it into one tonal end, and <b>how the ink sits</b> changes what the print <i>is</i> — no amount of fading gets you a screen the photograph reads through.</React.Fragment>}>
          <Chips label="Where" options={[{v:'all',l:'Everywhere'},{v:'shadows',l:'Shadows'},{v:'highlights',l:'Lights'}]} value={el.treatWhere||'all'} onChange={v=>update({treatWhere:v})} />
          <Slider label="Strength" val={el.treatStrength!=null?el.treatStrength:1} min={0.1} max={1} step={0.02} onChange={v=>update({treatStrength:v})} />
          <Chips label="How the ink sits" options={PRESS_BLENDS.map(b=>({v:b.v,l:b.l,t:b.note}))}
            value={el.treatBlend||'normal'} onChange={v=>update({treatBlend:v})} />
          {blendDef && <Hint tight><b>{blendDef.l}</b> — {blendDef.note}</Hint>}

          {/* WHERE on the frame — a stencil over the print. The tonal mask above
              says which tones take ink; this says which part of the picture.
              Backfilled from the Darkroom's region, 08.09.26. */}
          <div className="rs-sech">Where on the frame</div>
          <Chips options={[{v:'none',l:'Everywhere'},{v:'centre',l:'Centre'},{v:'edges',l:'Edges'},{v:'band',l:'Band'},{v:'linear',l:'Sweep'}]}
            value={(el.treatRegion||'none')==='radial' ? (el.regionInvert?'edges':'centre') : (el.treatRegion||'none')}
            onChange={v=>update(v==='none' ? {treatRegion:'none'} : v==='centre' ? {treatRegion:'radial',regionInvert:false} : v==='edges' ? {treatRegion:'radial',regionInvert:true} : {treatRegion:v,regionInvert:false})} />
          {(el.treatRegion||'none')!=='none' && <React.Fragment>
            {el.treatRegion!=='linear' && <Slider label={el.treatRegion==='band'?'Width':'Radius'} val={el.regionSize!=null?el.regionSize:0.6} min={0.1} max={1.4} step={0.02} onChange={v=>update({regionSize:v})} />}
            <Slider label="Feather" val={el.regionSoft!=null?el.regionSoft:0.5} min={0} max={1} step={0.02} onChange={v=>update({regionSoft:v})} />
            {el.treatRegion!=='radial' && <Slider label="Angle" val={el.regionAngle||0} min={-180} max={180} step={5} onChange={v=>update({regionAngle:v})} suffix="°" />}
            <Slider label="Across" val={el.regionX||0} min={-1} max={1} step={0.02} onChange={v=>update({regionX:v})} />
            <Slider label="Up / down" val={el.regionY||0} min={-1} max={1} step={0.02} onChange={v=>update({regionY:v})} />
            {el.treatRegion!=='radial' && <Chips label="Flip" options={[{v:false,l:'As drawn'},{v:true,l:'Flipped'}]} value={!!el.regionInvert} onChange={v=>update({regionInvert:v})} />}
            <Hint tight>Off the shape the photograph shows through. Turn on <b>Comp over the original</b> below and pull its saturation to 0 for a mono photograph under a coloured print — a subject left photographic in a room gone to ink.</Hint>
          </React.Fragment>}

          <div className="rs-sech">The photo underneath</div>
          {/* Switching on SEEDS the second grade from the press's own, so the
              toggle itself never moves a pixel — the split starts as a copy and
              only becomes a decision when you drag one of the dials. */}
          <Chips options={[{v:false,l:'As the press saw it'},{v:true,l:'Comp over the original'}]}
            value={!!el.compOrig} onChange={v=>update(v? Object.assign({compOrig:true}, pressGrade) : {compOrig:false})} />
          {el.compOrig && !photoShowsThrough && <Hint tight>Nothing to comp over yet: at <b>full strength</b> with <b>opaque</b> ink the print covers the photo completely. Drop the strength, feather it into Shadows or Lights, or change how the ink sits.</Hint>}
          {el.compOrig
            ? <React.Fragment>
                <Slider label="Photo brightness" val={el.underBright!=null?el.underBright:0} min={-0.5} max={0.5} step={0.02} onChange={v=>update({underBright:v})} />
                <Slider label="Photo contrast" val={el.underContrast!=null?el.underContrast:1} min={0.7} max={1.9} step={0.01} onChange={v=>update({underContrast:v})} />
                <Slider label="Photo saturation" val={el.underSat!=null?el.underSat:1} min={0} max={2} step={0.02} onChange={v=>update({underSat:v})} />
                <Slider label="Photo hue shift" val={el.underHue!=null?el.underHue:0} min={-180} max={180} step={5} onChange={v=>update({underHue:v})} suffix="°" />
                <Slider label="Photo warmth" val={el.underTemp!=null?el.underTemp:0} min={-1} max={1} step={0.02} onChange={v=>update({underTemp:v})} />
                <button className="rs-addrow" onClick={()=>update(pressGrade)}>↺ Match the press again</button>
                <Hint tight>The photograph showing <b>through</b> the print, graded on its own. <b>Adjust &amp; focus</b> still decides what the press sees — so the press can read a crushed mono version while this stays a full-colour photo.{el.treatWhere && el.treatWhere!=='all' ? ' With the print landing on one tonal end only, this is where it gets interesting.' : ''}</Hint>
              </React.Fragment>
            : <Hint tight>Off, the photo under the print is the same one the press read, and <b>Adjust &amp; focus</b> grades both at once. Turn it on to split them.</Hint>}
        </Fold>
  );
}

export { BlendFold };
