/* ============================================================
   REALITY POSTER STUDIO — photo panel
   Split by the Inspector's tabs, each in the order the engine works:
     Image  — the source, framing the shot, the second exposure, the
              Recompose move, and what the press reads (Before the press)
     Press  — the treatment (strip, look, ink), its Tune dials, the press
              itself, how the print sits on the photo, and the proof
     Finish — what happens to the printed sheet, and the mask
   (Layout — size & border, shadow, transform — is the Inspector's.)
   No fold holds another fold. The press / proof folds are
   ../../../studio-shared/press-panels.jsx; each other fold is a file here.
   ============================================================ */
import { RUI } from '../../../studio-shared/studio-ui.jsx';
import { inkTitle } from '../../../studio-shared/brand.js';
import { PhotoUpload } from '../../../studio-shared/image-intake.jsx';
import { PressFold, ProofFold } from '../../../studio-shared/press-panels.jsx';
import { INK_CHOICES as AP_INKS, PALETTE as AP_PAL, DEFAULTS as AP_DEF } from '../../studio-data.jsx';
import { SE_DAY_INK } from '../../studio-element.jsx';
import { Chips, Slider, Fold, Hint, Swatches } from '../controls.jsx';
import { TREATS, TREAT_PRESETS, TREAT_LOOKS } from './looks.js';
import { sepResolved, pressResolved } from './press.jsx';
import { TreatmentStrip } from './strip.jsx';
import { adoptResult } from '../../photos.js';
import { BlendFold } from './blend.jsx';
import { TuneFold } from './tune.jsx';
import { AdjustFold, FinishFold } from './finish.jsx';
import { FrameFold, PlaceFold, MaskFold } from './frame.jsx';
import { RecomposeFold } from './recompose.jsx';

/* How far each part of a photo sits off where it started — the fold badges,
   and summed per tab for the tab bar. Counted against the photo's defaults,
   except the treatment's own dials, which count against "the treatment, plus
   whatever named look is selected": picking Deep is a choice you made ONE
   click ago and can see highlighted, so counting its dials as tuning would
   badge the fold for doing exactly what the chip says it did. */
function photoDirt(el){
  const t = el.treatment;
  const looks = TREAT_LOOKS[t] || [];
  const activeLook = looks.find(x=>x.v===el.look);
  const photoBase = (AP_DEF[el.type]||{}).props || {};
  const pressBase = Object.assign({}, photoBase, TREAT_PRESETS[t]||{}, activeLook?activeLook.p:{});
  const d = (keys, base)=>RUI.dirtyCount(el, keys, base||photoBase);
  const r = {
    pressDirty:  d(Object.keys(TREAT_PRESETS[t]||{}), pressBase),
    adjustDirty: d(['brightness','contrast','saturation','hue','temperature','blurUnder'], pressBase),
    shotDirty:   d(['imgScale','imgX','imgY','imgRot']),
    placeDirty:  d(['frame','bleed','bleedBottom']),
    /* the second grade only counts while it is switched on: turning comp off
       keeps the dials (so flipping back doesn't lose the grade), and a badge
       that kept counting them would claim something that changes nothing */
    blendDirty:  d(['treatStrength','treatWhere','treatBlend','compOrig','treatRegion'].concat(
                   el.compOrig ? ['underBright','underContrast','underSat','underHue','underTemp'] : [])),
    finishCount: [el.blurOver>0, el.grain>0, el.vignette>0, el.paperTex>0, el.inkBleed>0, el.dust>0, el.misprint>0,
                  !!el.finBright, el.finContrast!=null&&el.finContrast!==1, el.finSat!=null&&el.finSat!==1].filter(Boolean).length,
  };
  r.tabs = {
    image:  (el.src2?1:0) + (el.compose && el.compose!=='none' ? 1 : 0) + r.adjustDirty + r.shotDirty,
    press:  r.pressDirty + r.blendDirty,
    finish: r.finishCount + (el.mask && el.mask!=='none' ? 1 : 0),
  };
  return r;
}

function PhotoControls({ el, update, theme, accent, day, tab }){
  const t = el.treatment;
  const tDef = TREATS.find(x=>x.v===t);
  const pressLabel = tDef? tDef.l : t;
  /* The ink the press will actually run, resolved exactly the way the canvas
     resolves it — so a thumbnail in the strip is never a different colour from
     the photo on the poster. */
  const dayInk = (el.followDay && day) ? SE_DAY_INK[day] : null;
  const inkKey = dayInk ? dayInk.ink : (el.followAccent ? (accent||'pink') : (el.ink||'pink'));
  const DAY_NAME = { mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday', sun:'Sunday' };
  const pickTreat = v=>update(Object.assign({ treatment:v, look:null }, TREAT_PRESETS[v]||{}));
  /* the job the press will run — plates, stock, physics — resolved like the engine does */
  const sepR = t==='separation' ? sepResolved(el, inkKey, theme) : null;
  const pressR = t==='separation' ? sepR : pressResolved(el, t, inkKey, theme);
  const looks = TREAT_LOOKS[t] || [];
  const D = photoDirt(el);

  if(tab==='image') return (
    <React.Fragment>
      <Fold id="ph-img" title="Image" open>
        <PhotoUpload onImage={r=>adoptResult(r).then(({ data })=>update({ src:data }))} />
        <Hint tight>…or copy an image anywhere and paste it here with <b>Ctrl-V</b> / <b>⌘V</b>.</Hint>
        {el.type==='logo'
          ? <React.Fragment>
              <Chips label="Background" options={[{v:true,l:'Transparent'},{v:false,l:'Paper'}]} value={el.transparent!==false} onChange={v=>update({ transparent:v })} />
              {el.transparent===false && <Swatches label="Paper fill" value={el.paperFill!=null?el.paperFill:'fg'} onChange={v=>update({paperFill:v})} autoTitle="Auto — paper" autoBg={theme==='night'?'#0a0703':'#fffbf1'} />}
              <Hint tight>PNG transparency is kept and the whole mark is shown (contain-fit). Pick a treatment below only if you want to riso it.</Hint>
            </React.Fragment>
          : <Chips label="Or a sample" options={[{v:'spotlight',l:'DJ'},{v:'crowd',l:'Crowd'},{v:'portrait',l:'Portrait'}]}
              value={el.src?null:el.sample} onChange={v=>update({ sample:v, src:null })} />}
      </Fold>
      <FrameFold el={el} update={update} frameDirty={D.shotDirty} />
      <Fold id="ph-mix" title="Second exposure" badge={el.src2?'on':null}>
        {!el.src2 && <Hint tight>Blend a second image into the source — the press treats the two as one photo.</Hint>}
        <PhotoUpload label={el.src2?'⬆ Replace second image…':'⬆ Add a second image…'} onImage={r=>adoptResult(r).then(({ data })=>update({ src2:data }))} />
        {el.src2 && <React.Fragment>
          <Slider label="Mix" val={el.mix2!=null?el.mix2:0.6} min={0} max={1} step={0.02} onChange={v=>update({mix2:v})} />
          <Chips label="Blend" options={[{v:'screen',l:'Screen'},{v:'multiply',l:'Multiply'},{v:'lighten',l:'Lighten'},{v:'overlay',l:'Overlay'}]} value={el.mix2Mode||'screen'} onChange={v=>update({mix2Mode:v})} />
          <Slider label="Zoom" val={el.img2Scale!=null?el.img2Scale:1} min={0.5} max={3} step={0.02} onChange={v=>update({img2Scale:v})} suffix="×" />
          <Slider label="Pan X" val={el.img2X!=null?el.img2X:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({img2X:v})} />
          <Slider label="Pan Y" val={el.img2Y!=null?el.img2Y:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({img2Y:v})} />
          <Slider label="Turn in frame" val={el.img2Rot!=null?el.img2Rot:0} min={-180} max={180} step={1} onChange={v=>update({img2Rot:v})} suffix="°" />
          <button className="rs-addrow" onClick={()=>update({ src2:null })}>✕ Remove second image</button>
        </React.Fragment>}
      </Fold>
      {/* the move happens to the original, before the press */}
      {el.type==='photo' && <RecomposeFold el={el} update={update} inkKey={inkKey} theme={theme} />}
      <AdjustFold el={el} update={update} t={t} adjustDirty={D.adjustDirty} />
    </React.Fragment>
  );

  if(tab==='press') return (
    <React.Fragment>
      <Fold id="ph-treat" title={'Treatment · '+pressLabel} open>
        {/* A logo with no file has nothing to develop, so it keeps the words. */}
        {(el.type==='logo' && !el.src)
          ? <Chips options={TREATS} value={el.treatment} onChange={pickTreat} />
          : <TreatmentStrip el={el} inkKey={inkKey} theme={theme} onPick={pickTreat} />}
        {tDef && tDef.tag && <Hint tight>
          <b>{tDef.tag}</b> · <b>Best for</b> {tDef.best} <b>Avoid when</b> {tDef.avoid}
        </Hint>}
        {/* The variants of this press worth a name. Picking one patches the
            dials below — it isn't a mode, so nudging afterwards is fine and
            the chip simply stops being highlighted. */}
        {looks.length>0 &&
          <Chips label="Look" options={looks} value={el.look||null}
            onChange={v=>{ const L=looks.find(x=>x.v===v); update(Object.assign({ look:v }, L?L.p:{})); }} />}

        {t!=='none' && <React.Fragment>
          <div className="rs-sech">Main ink</div>
          {/* Day colour: the linked event's weekday, at the density that colour
              wants (green 85, amber 90, yellow 72) — the app's "Day colour" look,
              here as an ink choice. Backfilled from the Darkroom, 08.09.26. */}
          <Chips options={[{v:'accent',l:'Follow poster accent'},{v:'day',l:'Day colour'},{v:'custom',l:'Custom'}]}
            value={el.followDay ? 'day' : (el.followAccent ? 'accent' : 'custom')}
            onChange={v=>update(v==='day' ? { followDay:true, followAccent:false } : v==='accent' ? { followDay:false, followAccent:true } : { followDay:false, followAccent:false })} />
          {el.followDay && <Hint tight>{day
            ? <React.Fragment>The linked event is on a <b>{DAY_NAME[day]}</b> — {SE_DAY_INK[day].ink}{SE_DAY_INK[day].inkDensity ? ' at '+Math.round(SE_DAY_INK[day].inkDensity*100)+'%' : ''}.</React.Fragment>
            : <React.Fragment>No event is linked to this poster yet — start one from the <b>In queue</b> list and the ink follows its weekday.</React.Fragment>}</Hint>}
          {!el.followAccent && !el.followDay &&
            <div className="rs-swatches">
              {AP_INKS.map(a=>(
                <div key={a} className={'rs-sw'+(el.ink===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ ink:a })} />
              ))}
            </div>}
          {/* Option D: on a night poster every press treatment prints on cream
              with a black plate. The treatments whose print already carries
              the shadows in ink (a duotone's ramp, a banded print, a cutout,
              the copier) are that plate; the screens and line treatments get
              the photograph's shadows printed under them, and this is how
              much. Day posters and named stocks never show it. */}
          {theme==='night' && !el.stock && t!=='separation' && ['halftone','dither','hatch','contour','edges','offregister','overprint'].indexOf(t)>=0 && <React.Fragment>
            <Slider label="Night plate" val={el.nightPlate!=null?el.nightPlate:1} min={0} max={1.5} step={0.02} onChange={v=>update({nightPlate:v})} />
            <Hint tight>Riso on cream with a black plate: the photograph's shadows print in black under the {pressLabel.toLowerCase()}, so the print's darkness follows the subject and reaches the Night surface. 0 leaves the accent alone on cream.</Hint>
          </React.Fragment>}
          {/* Density is a tinting dial: the separation decides coverage itself, so
              the slider would do nothing there and is not offered. */}
          {!el.followDay && t!=='separation' && <React.Fragment>
            <Slider label="Ink density" val={el.inkDensity!=null?el.inkDensity:1} min={0.4} max={1} step={0.02} onChange={v=>update({inkDensity:v})} />
            <Hint tight>How much ink the plate lays down. Yellow and green blast at 100% on night stock — 70–85% prints them as an ochre and a bottle green; on day stock less ink is a paler tint.</Hint>
          </React.Fragment>}
        </React.Fragment>}
        {(t==='offregister'||t==='overprint'||((t==='duotone'||t==='posterize')&&el.splitTone)) && <React.Fragment>
          <div className="rs-lab">{(t==='duotone'||t==='posterize') ? 'Second ink' : 'Accent ink'} <span className="val">{el.ink2||'auto'}</span></div>
          <div className="rs-swatches">
            <div className={'rs-sw ink'+(el.ink2==null?' on':'')} title="Auto — warm/cool partner" style={{ border:'1.5px solid var(--st-sw-border)' }} onClick={()=>update({ ink2:null })} />
            {AP_INKS.map(a=>(
              <div key={a} className={'rs-sw'+(el.ink2===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ ink2:a })} />
            ))}
          </div>
        </React.Fragment>}
      </Fold>
      {/* Every dial the chosen press exposes. Choosing a treatment already lands
          on a good default (TREAT_PRESETS) and the Look chips cover the variants
          worth naming — this is where you go when none of them is quite it. */}
      {t!=='none' && <TuneFold el={el} update={update} theme={theme} t={t} inkKey={inkKey} pressR={pressR}
        pressLabel={pressLabel} pressDirty={D.pressDirty} />}
      {/* the press is a dozen dials that describe a machine, not a look */}
      {pressR && <PressFold el={el} update={update} plates={pressR.inks} other={t!=='separation' ? pressLabel.toLowerCase() : null} dirtyBase={TREAT_PRESETS.separation} />}
      {/* where the print meets the photograph under it — after the press */}
      {t!=='none' && <BlendFold el={el} update={update} blendDirty={D.blendDirty} />}
      {/* the proof changes what the canvas shows, so it closes the tab */}
      {pressR && <ProofFold el={el} update={update} plates={pressR.inks} />}
    </React.Fragment>
  );

  if(tab==='finish') return (
    <React.Fragment>
      <FinishFold el={el} update={update} />
      <MaskFold el={el} update={update} />
    </React.Fragment>
  );

  /* layout: the box itself — the Inspector adds shadow, transform and format */
  return <PlaceFold el={el} update={update} placeDirty={D.placeDirty} />;
}

export { PhotoControls, photoDirt };
