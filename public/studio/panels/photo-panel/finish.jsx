/* ============================================================
   REALITY POSTER STUDIO — photo panel · Adjust & focus, Finish
   ============================================================ */
import { InkRow } from '../../../studio-shared/press-panels.jsx';
import { Chips, Slider, Fold, Hint } from '../controls.jsx';
import { BlurControls } from './press.jsx';
import { FINISH_NEUTRAL, FINISH_LOOKS } from './looks.js';
function AdjustFold({ el, update, t, adjustDirty }){
  return (
      <Fold id="ph-adjust" title="Adjust & focus" dirty={adjustDirty}>
        <Slider label="Brightness" val={el.brightness!=null?el.brightness:0} min={-0.5} max={0.5} step={0.02} onChange={v=>update({brightness:v})} />
        <Slider label="Contrast" val={el.contrast} min={0.7} max={1.9} step={0.01} onChange={v=>update({contrast:v})} />
        {t==='none' && <React.Fragment>
          <Slider label="Saturation" val={el.saturation!=null?el.saturation:1} min={0} max={2} step={0.02} onChange={v=>update({saturation:v})} />
          <Slider label="Hue shift" val={el.hue!=null?el.hue:0} min={-180} max={180} step={5} onChange={v=>update({hue:v})} suffix="°" />
          <Slider label="Warmth" val={el.temperature!=null?el.temperature:0} min={-1} max={1} step={0.02} onChange={v=>update({temperature:v})} />
        </React.Fragment>}
        <BlurControls el={el} update={update} prefix="blurUnder" label="Soft focus" max={24} />
        <Hint tight>Soft focus blurs the photo <b>before</b> the press — motion smears the dots along a direction, zoom rushes them outward. The <b>Finish</b> blur prints over the finished image instead.</Hint>
      </Fold>
  );
}
function FinishFold({ el, update }){
  /* The named finish this stack IS — measured against the whole neutral set, so
     it can never claim "Pressed" about a print that merely shares one dial with
     it. Undefined once you tune off one, which is the honest answer. */
  const finishLook = FINISH_LOOKS.find(f=>{
    const want=Object.assign({}, FINISH_NEUTRAL, f.p);
    return Object.keys(FINISH_NEUTRAL).every(k=>(el[k]==null?FINISH_NEUTRAL[k]:el[k])===want[k]);
  });
  const finishCount = [el.blurOver>0, el.grain>0, el.vignette>0, el.paperTex>0, el.inkBleed>0, el.dust>0, el.misprint>0,
                       !!el.finBright, el.finContrast!=null&&el.finContrast!==1, el.finSat!=null&&el.finSat!==1].filter(Boolean).length;
  return (
      <Fold id="ph-finish" title="Finish" badge={finishLook && finishLook.v!=='clean' ? finishLook.l : (finishCount? String(finishCount) : null)}>
        <Chips label="Named finish" options={FINISH_LOOKS.map(f=>({v:f.v,l:f.l,t:f.note}))} value={finishLook? finishLook.v : null}
          onChange={v=>{ const f=FINISH_LOOKS.find(x=>x.v===v); if(f) update(Object.assign({}, FINISH_NEUTRAL, f.p)); }} />
        <Hint tight>{finishLook? finishLook.note : 'Tuned off a named finish — the dials below are yours.'} Picking one resets the whole stack, so two of them can never pile up.</Hint>
        <div className="rs-sech">Tone</div>
        <Slider label="Brightness" val={el.finBright!=null?el.finBright:0} min={-0.5} max={0.5} step={0.02} onChange={v=>update({finBright:v})} />
        <Slider label="Contrast" val={el.finContrast!=null?el.finContrast:1} min={0.5} max={2} step={0.02} onChange={v=>update({finContrast:v})} />
        <Slider label="Saturation" val={el.finSat!=null?el.finSat:1} min={0} max={2} step={0.02} onChange={v=>update({finSat:v})} />
        <button className="rs-addrow" onClick={()=>update({finBright:0, finContrast:1, finSat:1})}>↺ Reset tone</button>
        <Hint tight>Grades the <b>printed</b> ink — <b>Adjust &amp; focus</b> changes what the press sees instead. Unlike that pass, saturation here works under every treatment: pull it to 0 to grey off a duotone, push it up to make one ink shout.</Hint>
        <div className="rs-sech">Press artifacts</div>
        <BlurControls el={el} update={update} prefix="blurOver" label="Blur" max={30} />
        <Slider label="Grain" val={el.grain!=null?el.grain:0} min={0} max={1} step={0.02} onChange={v=>update({grain:v})} />
        {el.grain>0 && <React.Fragment>
          <Slider label="Grain size" val={el.grainSize!=null?el.grainSize:2} min={0.5} max={5} step={0.25} onChange={v=>update({grainSize:v})} suffix="px" />
          <InkRow label="Grain ink" value={el.grainInk} onChange={v=>update({grainInk:v})} autoTitle="Auto — neutral tooth" />
          <Chips label="Character" options={[{v:'soft',l:'Soft'},{v:'dirty',l:'Dirty'}]} value={el.grainBlend||'soft'} onChange={v=>update({grainBlend:v})} />
        </React.Fragment>}
        <Slider label="Vignette" val={el.vignette!=null?el.vignette:0} min={0} max={1} step={0.02} onChange={v=>update({vignette:v})} />
        {el.vignette>0 && <Slider label="Vignette softness" val={el.vignetteSoft!=null?el.vignetteSoft:0.6} min={0.2} max={1} step={0.02} onChange={v=>update({vignetteSoft:v})} />}
        <Slider label="Paper texture" val={el.paperTex!=null?el.paperTex:0} min={0} max={1} step={0.02} onChange={v=>update({paperTex:v})} />
        <Slider label="Ink bleed" val={el.inkBleed!=null?el.inkBleed:0} min={0} max={1} step={0.02} onChange={v=>update({inkBleed:v})} />
        <Slider label="Dust & scratches" val={el.dust!=null?el.dust:0} min={0} max={1} step={0.02} onChange={v=>update({dust:v})} />
        <Slider label="Misprint" val={el.misprint!=null?el.misprint:0} min={0} max={24} step={0.5} onChange={v=>update({misprint:v})} suffix="px" />
        {el.misprint>0 && <Slider label="Misprint angle" val={el.misprintAngle!=null?el.misprintAngle:-35} min={-180} max={180} step={5} onChange={v=>update({misprintAngle:v})} suffix="°" />}
        <Hint tight>Press artifacts print over the finished image — the misprint slides the whole print off its paper.</Hint>
      </Fold>
  );
}

export { AdjustFold, FinishFold };
