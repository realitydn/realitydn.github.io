/* ============================================================
   REALITY POSTER STUDIO — photo panel · Tune
   Every dial the chosen press exposes, in one fold.
   ============================================================ */
import { InkRow, PressStock } from '../../../studio-shared/press-panels.jsx';
import { inkTitle } from '../../../studio-shared/brand.js';
import { INK_CHOICES as AP_INKS, PALETTE as AP_PAL } from '../../studio-data.jsx';
import { Field, Chips, Slider, Fold, Hint } from '../controls.jsx';
import { SepControls } from './press.jsx';
function TuneFold({ el, update, theme, t, inkKey, pressR, pressLabel, pressDirty }){
  const nBands = Math.max(2, (el.bands|0)||4);
  const setBandInk = (i,v)=>{ const arr=[]; for(let b=0;b<nBands;b++) arr.push((el.bandInks&&el.bandInks[b])||null); arr[i]=v; update({ bandInks:arr }); };
  /* mosaic shares bandInks with posterize (same dark→light order), sized by its depth */
  const nMosaic = Math.max(2, Math.min(6, (el.mosaicDepth|0)||4));
  const setMosaicInk = (i,v)=>{ const arr=[]; for(let b=0;b<nMosaic;b++) arr.push((el.bandInks&&el.bandInks[b])||null); arr[i]=v; update({ bandInks:arr }); };
  return (
        <Fold id="ph-press" title={'Tune · '+pressLabel} dirty={pressDirty}>
        {t==='separation' && <SepControls el={el} update={update} theme={theme} inkKey={inkKey} />}
        {t!=='separation' && pressR && <PressStock el={el} update={update} stockKey={pressR.stockKey} opaque={pressR.opaque} />}
        {t==='duotone' && <React.Fragment>
          <Slider label="Tone balance" val={el.balance} min={0.1} max={0.9} step={0.01} onChange={v=>update({balance:v})} />
          <Slider label="Shadow tint" val={el.shadowTint} min={0} max={0.6} step={0.02} onChange={v=>update({shadowTint:v})} />
          <Chips label="Invert" options={[{v:false,l:'Normal'},{v:true,l:'Inverted'}]} value={el.invert} onChange={v=>update({invert:v})} />
          <Chips label="Ramp" options={[{v:false,l:'One drum'},{v:true,l:'Split tone'}]} value={!!el.splitTone} onChange={v=>update({splitTone:v})} />
          {el.splitTone && <Hint tight>Two drums — on night stock paper → second ink → ink; on day stock second ink → ink → paper, with <b>no black plate at all</b>. Pick the second ink above.</Hint>}
          <InkRow label="Mid ink" value={el.midInk} onChange={v=>update({midInk:v})} autoTitle="Off — two-ink ramp" />
          <Slider label="Highlight tint" val={el.hiTint!=null?el.hiTint:0} min={0} max={0.6} step={0.02} onChange={v=>update({hiTint:v})} />
          {el.hiTint>0 && <InkRow label="Highlight ink" value={el.hiInk} onChange={v=>update({hiInk:v})} autoTitle="Auto — warm/cool partner" />}
          <Hint tight>A <b>mid ink</b> makes it a tritone; <b>highlight tint</b> split-tones the light end.</Hint>
        </React.Fragment>}
        {t==='offregister' && <React.Fragment>
          <Slider label="Offset" val={el.offset} min={0} max={40} step={1} onChange={v=>update({offset:v})} suffix="px" />
          <Slider label="Angle" val={el.angle} min={0} max={360} step={1} onChange={v=>update({angle:v})} suffix="°" />
          <Slider label="Ink spread" val={el.spread} min={0.8} max={1.8} step={0.02} onChange={v=>update({spread:v})} />
          <InkRow label="Third ink" value={el.ink3} onChange={v=>update({ink3:v})} autoTitle="Off — two passes" />
          <Slider label="Ghost hit" val={el.ghost!=null?el.ghost:0} min={0} max={1} step={0.02} onChange={v=>update({ghost:v})} />
          <Chips label="Plates" options={[{v:false,l:'From the tone'},{v:true,l:'Separated'}]} value={!!el.sep} onChange={v=>update({sep:v})} />
          <Hint tight>Ghost prints a faint second impression of the main ink — the classic riso double-feed. <b>Separated</b> cuts the two plates from the colour photograph, so each ink carries its own part of the picture rather than the same tone twice. The press's own drift, skew and stretch (Tune · Press) ride on top of the offset.</Hint>
        </React.Fragment>}
        {t==='halftone' && <React.Fragment>
          <Chips label="Inking" options={[{v:'single',l:'Ink'},{v:'black',l:'Mono'},{v:'gradient',l:'Gradient'},{v:'two',l:'Two-ink'}]} value={el.inkMode||'single'} onChange={v=>update({inkMode:v})} />
          {(el.inkMode||'single')==='gradient' && <React.Fragment>
            <Chips label="Ramp" options={[{v:'tone',l:'By tone'},{v:'frame',l:'Across frame'}]} value={el.gradMode||'tone'} onChange={v=>update({gradMode:v})} />
            <div className="rs-lab">From <span className="val">{el.gradA||el.ink||'accent'}</span></div>
            <div className="rs-swatches">
              <div className={'rs-sw'+(el.gradA==null?' on':'')} title="Main ink" style={{ border:'1.5px solid var(--st-sw-border)' }} onClick={()=>update({ gradA:null })} />
              {AP_INKS.map(a=>(<div key={a} className={'rs-sw'+(el.gradA===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ gradA:a })} />))}
            </div>
            <div className="rs-lab">To <span className="val">{el.gradB||'partner'}</span></div>
            <div className="rs-swatches">
              <div className={'rs-sw'+(el.gradB==null?' on':'')} title="Auto — warm/cool partner" style={{ border:'1.5px solid var(--st-sw-border)' }} onClick={()=>update({ gradB:null })} />
              {AP_INKS.map(a=>(<div key={a} className={'rs-sw'+(el.gradB===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ gradB:a })} />))}
            </div>
            {el.gradMode==='frame' && <Slider label="Ramp angle" val={el.gradAngle!=null?el.gradAngle:90} min={0} max={360} step={1} onChange={v=>update({gradAngle:v})} suffix="°" />}
          </React.Fragment>}
          {(el.inkMode||'single')==='two' && <React.Fragment>
            <div className="rs-lab">Second ink <span className="val">{el.ink2||'auto'}</span></div>
            <div className="rs-swatches">
              <div className={'rs-sw ink'+(el.ink2==null?' on':'')} title="Auto — warm/cool partner" style={{ border:'1.5px solid var(--st-sw-border)' }} onClick={()=>update({ ink2:null })} />
              {AP_INKS.map(a=>(<div key={a} className={'rs-sw'+(el.ink2===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ ink2:a })} />))}
            </div>
            <Slider label="Screen offset" val={el.screenOffset!=null?el.screenOffset:30} min={0} max={90} step={1} onChange={v=>update({screenOffset:v})} suffix="°" />
          </React.Fragment>}
          <Slider label="Dot size" val={el.dot} min={4} max={22} step={1} onChange={v=>update({dot:v})} suffix="px" />
          <Slider label="Screen angle" val={el.angle} min={-90} max={90} step={1} onChange={v=>update({angle:v})} suffix="°" />
          <Chips label="Dot shape" options={[{v:'circle',l:'Dot'},{v:'square',l:'Square'},{v:'diamond',l:'Diamond'},{v:'ring',l:'Ring'},{v:'line',l:'Line'},{v:'cross',l:'Cross'},{v:'hex',l:'Hex'},{v:'star',l:'Star'},{v:'glyph',l:'Letter'}]} value={el.shape} onChange={v=>update({shape:v})} />
          {el.shape==='diamond' && <Slider label="Pucker" val={el.pucker!=null?el.pucker:0.35} min={0} max={1} step={0.02} onChange={v=>update({pucker:v})} />}
          {el.shape==='glyph' && <Field label="Letter (1–2 characters)" value={el.glyphChar!=null?el.glyphChar:'R'} onChange={v=>update({glyphChar:v})} />}
          <Slider label="Dot gain" val={el.dotGain!=null?el.dotGain:1} min={0.6} max={1.6} step={0.02} onChange={v=>update({dotGain:v})} />
          <Slider label="Hand-set jitter" val={el.jitter!=null?el.jitter:0} min={0} max={1} step={0.02} onChange={v=>update({jitter:v})} />
          <Chips label="Print" options={[{v:false,l:'Shadows'},{v:true,l:'Highlights'}]} value={!!el.invert} onChange={v=>update({invert:v})} />
          <div className="rs-sech">Halftone field</div>
          <Chips label="Background" options={[{v:'paper',l:'Paper'},{v:'tint',l:'Ink tint'},{v:'ink',l:'Solid ink'}]} value={el.field||'paper'} onChange={v=>update({field:v})} />
          {el.field && el.field!=='paper' && <React.Fragment>
            <div className="rs-lab">Field ink <span className="val">{el.fieldInk||'main'}</span></div>
            <div className="rs-swatches">
              <div className={'rs-sw'+(el.fieldInk==null?' on':'')} title="Main ink" style={{ border:'1.5px solid var(--st-sw-border)' }} onClick={()=>update({ fieldInk:null })} />
              {AP_INKS.map(a=>(<div key={a} className={'rs-sw'+(el.fieldInk===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>update({ fieldInk:a })} />))}
            </div>
            {el.field==='tint' && <Slider label="Tint strength" val={el.fieldStrength!=null?el.fieldStrength:0.12} min={0.04} max={0.5} step={0.01} onChange={v=>update({fieldStrength:v})} />}
          </React.Fragment>}
        </React.Fragment>}
        {t==='posterize' && <React.Fragment>
          <Slider label="Bands" val={el.bands} min={2} max={6} step={1} onChange={v=>update({bands:v})} />
          <Chips label="Ramp" options={[{v:false,l:'One drum'},{v:true,l:'Split tone'}]} value={!!el.splitTone} onChange={v=>update({splitTone:v})} />
          <Slider label="Smoothing" val={el.toneSmooth!=null?el.toneSmooth:0} min={0} max={10} step={0.2} onChange={v=>update({toneSmooth:v})} />
          <Slider label="Torn edges" val={el.bandJitter!=null?el.bandJitter:0} min={0} max={1} step={0.02} onChange={v=>update({bandJitter:v})} />
          <Chips label="Band colours" options={[{v:false,l:'Auto ramp'},{v:true,l:'Custom'}]} value={!!el.bandInks}
            onChange={v=>{ if(!v){ update({ bandInks:null }); } else { const arr=[]; for(let b=0;b<nBands;b++) arr.push(null); update({ bandInks:arr }); } }} />
          {el.bandInks && Array.from({length:nBands}).map((_,i)=>(
            <InkRow key={i} label={'Band '+(i+1)+(i===0?' · dark':i===nBands-1?' · light':'')} value={el.bandInks[i]||null} onChange={v=>setBandInk(i,v)} autoTitle="Auto — ramp colour" />
          ))}
        </React.Fragment>}
        {t==='cutout' && <React.Fragment>
          <Slider label="Threshold" val={el.threshold} min={0.15} max={0.85} step={0.01} onChange={v=>update({threshold:v})} />
          <Slider label="Edge softness" val={el.softness} min={0.01} max={0.4} step={0.01} onChange={v=>update({softness:v})} />
          <Slider label="Smoothing" val={el.toneSmooth!=null?el.toneSmooth:0} min={0} max={10} step={0.2} onChange={v=>update({toneSmooth:v})} />
          <Chips label="Invert" options={[{v:false,l:'Subject'},{v:true,l:'Background'}]} value={el.invert} onChange={v=>update({invert:v})} />
          <Slider label="Outline" val={el.cutEdge!=null?el.cutEdge:0} min={0} max={0.2} step={0.005} onChange={v=>update({cutEdge:v})} />
          {el.cutEdge>0 && <React.Fragment>
            <InkRow label="Outline ink" value={el.cutEdgeInk} onChange={v=>update({cutEdgeInk:v})} autoTitle="Auto — warm/cool partner" />
            <Slider label="Outline slip" val={el.cutSlip!=null?el.cutSlip:0} min={0} max={20} step={0.5} onChange={v=>update({cutSlip:v})} suffix="px" />
            {el.cutSlip>0 && <Slider label="Slip angle" val={el.cutSlipAngle!=null?el.cutSlipAngle:45} min={0} max={360} step={5} onChange={v=>update({cutSlipAngle:v})} suffix="°" />}
          </React.Fragment>}
        </React.Fragment>}
        {t==='overprint' && <React.Fragment>
          <Slider label="Offset" val={el.offset} min={0} max={30} step={1} onChange={v=>update({offset:v})} suffix="px" />
          <Slider label="Angle" val={el.angle} min={0} max={360} step={1} onChange={v=>update({angle:v})} suffix="°" />
          <Slider label="Field split" val={el.split} min={0.04} max={0.4} step={0.01} onChange={v=>update({split:v})} />
          <Slider label="Smoothing" val={el.toneSmooth!=null?el.toneSmooth:0} min={0} max={10} step={0.2} onChange={v=>update({toneSmooth:v})} />
          <InkRow label="Third ink" value={el.ink3} onChange={v=>update({ink3:v})} autoTitle="Off — two fields" />
          <Slider label="Ink texture" val={el.fieldTexture!=null?el.fieldTexture:0} min={0} max={1} step={0.02} onChange={v=>update({fieldTexture:v})} />
          <Chips label="Fields" options={[{v:false,l:'From the tone'},{v:true,l:'Separated'}]} value={!!el.sep} onChange={v=>update({sep:v})} />
          <Hint tight>The overlap is the colour the two drums actually make — transmittances stacked, a later drum transferring less onto wet ink. <b>Separated</b> cuts each field from the colour photograph's own plate.</Hint>
        </React.Fragment>}
        {t==='spot' && <React.Fragment>
          <Chips label="Select by" options={[{v:'tone',l:'Tone'},{v:'hue',l:'Colour'}]} value={el.spotMode||'tone'} onChange={v=>update({spotMode:v})} />
          <Chips label="Backdrop" options={[{v:'duotone',l:'Duotone'},{v:'image',l:'Raw image'}]} value={el.spotBase||'duotone'} onChange={v=>update({spotBase:v})} />
          {(el.spotMode||'tone')==='hue'
            ? <React.Fragment>
                <Slider label="Hue" val={el.spotHue!=null?el.spotHue:340} min={0} max={360} step={2} onChange={v=>update({spotHue:v})} suffix="°" />
                <Slider label="Hue range" val={el.spotHueRange!=null?el.spotHueRange:45} min={10} max={120} step={2} onChange={v=>update({spotHueRange:v})} suffix="°" />
                <Hint tight>Everything near that hue in the <b>original photo</b> floods with the accent — "make the red jacket pop".</Hint>
              </React.Fragment>
            : <React.Fragment>
                <Slider label="Range low" val={el.spotLo!=null?el.spotLo:0.35} min={0} max={1} step={0.01} onChange={v=>update({spotLo:v})} />
                <Slider label="Range high" val={el.spotHi!=null?el.spotHi:0.65} min={0} max={1} step={0.01} onChange={v=>update({spotHi:v})} />
              </React.Fragment>}
          <Slider label="Edge softness" val={el.spotSoft!=null?el.spotSoft:0.08} min={0.002} max={0.4} step={0.01} onChange={v=>update({spotSoft:v})} />
          <Slider label="Smoothing" val={el.toneSmooth!=null?el.toneSmooth:0} min={0} max={10} step={0.2} onChange={v=>update({toneSmooth:v})} />
          <Chips label="Fill" options={[{v:false,l:'In range'},{v:true,l:'Out of range'}]} value={!!el.spotInvert} onChange={v=>update({spotInvert:v})} />
          {(el.spotMode||'tone')==='tone' && <React.Fragment>
            <Chips label="Second band" options={[{v:false,l:'Off'},{v:true,l:'On'}]} value={!!el.spot2} onChange={v=>update({spot2:v})} />
            {el.spot2 && <React.Fragment>
              <Slider label="Band 2 low" val={el.spot2Lo!=null?el.spot2Lo:0.7} min={0} max={1} step={0.01} onChange={v=>update({spot2Lo:v})} />
              <Slider label="Band 2 high" val={el.spot2Hi!=null?el.spot2Hi:0.9} min={0} max={1} step={0.01} onChange={v=>update({spot2Hi:v})} />
              <InkRow label="Band 2 ink" value={el.spot2Ink} onChange={v=>update({spot2Ink:v})} autoTitle="Auto — warm/cool partner" />
            </React.Fragment>}
          </React.Fragment>}
          {(el.spotBase||'duotone')==='duotone' && <React.Fragment>
            <Slider label="Tone balance" val={el.balance} min={0.1} max={0.9} step={0.01} onChange={v=>update({balance:v})} />
            <Slider label="Shadow tint" val={el.shadowTint} min={0} max={0.6} step={0.02} onChange={v=>update({shadowTint:v})} />
          </React.Fragment>}
        </React.Fragment>}
        {t==='dither' && <React.Fragment>
          <Chips label="Pattern" options={[{v:'bayer',l:'Bayer'},{v:'cluster',l:'Cluster dot'},{v:'lines',l:'Scanlines'},{v:'noise',l:'Noise'},{v:'diffusion',l:'Diffusion'}]} value={el.ditherMode||'bayer'} onChange={v=>update({ditherMode:v})} />
          <Slider label="Cell size" val={el.ditherScale!=null?el.ditherScale:3} min={1} max={12} step={0.5} onChange={v=>update({ditherScale:v})} suffix="px" />
          {(el.ditherMode==null||el.ditherMode==='bayer'||el.ditherMode==='cluster'||el.ditherMode==='lines') &&
            <Slider label="Screen angle" val={el.ditherAngle!=null?el.ditherAngle:0} min={-90} max={90} step={1} onChange={v=>update({ditherAngle:v})} suffix="°" />}
          <Chips label="Inking" options={[{v:'single',l:'Ink'},{v:'black',l:'Mono'},{v:'gradient',l:'Gradient'}]} value={el.inkMode==='black'?'black':el.inkMode==='gradient'?'gradient':'single'} onChange={v=>update({inkMode:v})} />
          {el.inkMode==='gradient' && <React.Fragment>
            <Chips label="Ramp" options={[{v:'tone',l:'By tone'},{v:'frame',l:'Across frame'}]} value={el.gradMode||'tone'} onChange={v=>update({gradMode:v})} />
            <InkRow label="From" value={el.gradA} onChange={v=>update({gradA:v})} autoTitle="Main ink" />
            <InkRow label="To" value={el.gradB} onChange={v=>update({gradB:v})} autoTitle="Auto — warm/cool partner" />
            {el.gradMode==='frame' && <Slider label="Ramp angle" val={el.gradAngle!=null?el.gradAngle:90} min={0} max={360} step={1} onChange={v=>update({gradAngle:v})} suffix="°" />}
          </React.Fragment>}
          <Chips label="Print" options={[{v:false,l:'Shadows'},{v:true,l:'Highlights'}]} value={!!el.invert} onChange={v=>update({invert:v})} />
          <Chips label="Background" options={[{v:'paper',l:'Paper'},{v:'tint',l:'Ink tint'},{v:'ink',l:'Solid ink'}]} value={el.field||'paper'} onChange={v=>update({field:v})} />
          {el.field && el.field!=='paper' && <React.Fragment>
            <InkRow label="Field ink" value={el.fieldInk} onChange={v=>update({fieldInk:v})} autoTitle="Main ink" />
            {el.field==='tint' && <Slider label="Tint strength" val={el.fieldStrength!=null?el.fieldStrength:0.12} min={0.04} max={0.5} step={0.01} onChange={v=>update({fieldStrength:v})} />}
          </React.Fragment>}
        </React.Fragment>}
        {t==='hatch' && <React.Fragment>
          <Chips label="Inking" options={[{v:'single',l:'Ink'},{v:'black',l:'Mono'},{v:'gradient',l:'Gradient'}]} value={el.inkMode==='black'?'black':el.inkMode==='gradient'?'gradient':'single'} onChange={v=>update({inkMode:v})} />
          {el.inkMode==='gradient' && <React.Fragment>
            <Chips label="Ramp" options={[{v:'tone',l:'By tone'},{v:'frame',l:'Across frame'}]} value={el.gradMode||'tone'} onChange={v=>update({gradMode:v})} />
            <InkRow label="From" value={el.gradA} onChange={v=>update({gradA:v})} autoTitle="Main ink" />
            <InkRow label="To" value={el.gradB} onChange={v=>update({gradB:v})} autoTitle="Auto — warm/cool partner" />
            {el.gradMode==='frame' && <Slider label="Ramp angle" val={el.gradAngle!=null?el.gradAngle:90} min={0} max={360} step={1} onChange={v=>update({gradAngle:v})} suffix="°" />}
          </React.Fragment>}
          <Slider label="Spacing" val={el.hatchSpacing!=null?el.hatchSpacing:9} min={4} max={20} step={0.5} onChange={v=>update({hatchSpacing:v})} suffix="px" />
          <Slider label="Angle" val={el.angle!=null?el.angle:-22} min={-90} max={90} step={1} onChange={v=>update({angle:v})} suffix="°" />
          <Slider label="Stroke weight" val={el.hatchWeight!=null?el.hatchWeight:1} min={0.5} max={1.5} step={0.02} onChange={v=>update({hatchWeight:v})} />
          <Chips label="Cross-hatch" options={[{v:false,l:'Off'},{v:true,l:'In the shadows'}]} value={!!el.hatchCross} onChange={v=>update({hatchCross:v})} />
          <Slider label="Wobble" val={el.hatchWobble!=null?el.hatchWobble:0.15} min={0} max={1} step={0.02} onChange={v=>update({hatchWobble:v})} />
          <Slider label="Smoothing" val={el.toneSmooth!=null?el.toneSmooth:0} min={0} max={10} step={0.2} onChange={v=>update({toneSmooth:v})} />
          <Chips label="Background" options={[{v:'paper',l:'Paper'},{v:'tint',l:'Ink tint'},{v:'ink',l:'Solid ink'}]} value={el.field||'paper'} onChange={v=>update({field:v})} />
          {el.field && el.field!=='paper' && <React.Fragment>
            <InkRow label="Field ink" value={el.fieldInk} onChange={v=>update({fieldInk:v})} autoTitle="Main ink" />
            {el.field==='tint' && <Slider label="Tint strength" val={el.fieldStrength!=null?el.fieldStrength:0.12} min={0.04} max={0.5} step={0.01} onChange={v=>update({fieldStrength:v})} />}
          </React.Fragment>}
        </React.Fragment>}
        {t==='photocopy' && <React.Fragment>
          <Chips label="Inking" options={[{v:'black',l:'Toner'},{v:'single',l:'Ink'}]} value={el.inkMode==='single'?'single':'black'} onChange={v=>update({inkMode:v})} />
          <Slider label="Toner" val={el.toner!=null?el.toner:0.55} min={0} max={1} step={0.02} onChange={v=>update({toner:v})} />
          <Slider label="Copy noise" val={el.copyNoise!=null?el.copyNoise:0.35} min={0} max={1} step={0.02} onChange={v=>update({copyNoise:v})} />
          <Slider label="Streaks" val={el.streaks!=null?el.streaks:0.25} min={0} max={1} step={0.02} onChange={v=>update({streaks:v})} />
          <Slider label="Generations" val={el.generations!=null?el.generations:2} min={1} max={5} step={1} onChange={v=>update({generations:v})} />
          <div className="rs-sech">The machine</div>
          <Slider label="Edge burn" val={el.copyEdge!=null?el.copyEdge:0.45} min={0} max={1.2} step={0.02} onChange={v=>update({copyEdge:v})} />
          <Slider label="Hollow solids" val={el.copyHollow!=null?el.copyHollow:0.35} min={0} max={1} step={0.02} onChange={v=>update({copyHollow:v})} />
          <Slider label="Satellites" val={el.copySatellites!=null?el.copySatellites:0.3} min={0} max={1} step={0.02} onChange={v=>update({copySatellites:v})} />
          <Slider label="Drum band" val={el.copyDrum!=null?el.copyDrum:0.06} min={0} max={0.4} step={0.01} onChange={v=>update({copyDrum:v})} />
          {el.copyDrum>0 && <Slider label="Drum period" val={el.copyDrumPeriod!=null?el.copyDrumPeriod:150} min={40} max={400} step={5} onChange={v=>update({copyDrumPeriod:v})} suffix="px" />}
          <Hint tight>A copier moves toner by electric field, and the field bends at every edge: edges burn into a dark rim, the middles of big blacks starve and go grey, toner flies off as satellites, and the drum repeats its faults once per turn.</Hint>
          <Chips label="Paper" options={[{v:'paper',l:'Plain'},{v:'tint',l:'Tinted stock'}]} value={el.field==='tint'?'tint':'paper'} onChange={v=>update({field:v})} />
          {el.field==='tint' && <React.Fragment>
            <InkRow label="Stock ink" value={el.fieldInk} onChange={v=>update({fieldInk:v})} autoTitle="Main ink" />
            <Slider label="Tint strength" val={el.fieldStrength!=null?el.fieldStrength:0.18} min={0.04} max={0.5} step={0.01} onChange={v=>update({fieldStrength:v})} />
          </React.Fragment>}
          <Hint tight>Each generation is a re-copy — harder blacks, blown highlights. Tinted stock runs the toner on coloured paper.</Hint>
        </React.Fragment>}
        {t==='contour' && <React.Fragment>
          <Slider label="Bands" val={el.bands} min={2} max={12} step={1} onChange={v=>update({bands:v})} />
          <Slider label="Smoothing" val={el.contourSmooth!=null?el.contourSmooth:2.2} min={0} max={10} step={0.2} onChange={v=>update({contourSmooth:v})} />
          <Slider label="Line weight" val={el.contourWeight!=null?el.contourWeight:2} min={1} max={6} step={0.5} onChange={v=>update({contourWeight:v})} />
          <Chips label="Fill" options={[{v:'paper',l:'Paper'},{v:'tint',l:'Tint'},{v:'bands',l:'Full ramp'}]} value={el.contourFill||'tint'} onChange={v=>update({contourFill:v})} />
          {(el.contourFill||'tint')==='tint' && <Slider label="Tint strength" val={el.contourTint!=null?el.contourTint:0.19} min={0.05} max={0.6} step={0.01} onChange={v=>update({contourTint:v})} />}
          {(el.contourFill||'tint')==='bands' && <React.Fragment>
            <Chips label="Band colours" options={[{v:false,l:'Auto ramp'},{v:true,l:'Custom'}]} value={!!el.bandInks}
              onChange={v=>{ if(!v){ update({ bandInks:null }); } else { const arr=[]; for(let b=0;b<nBands;b++) arr.push(null); update({ bandInks:arr }); } }} />
            {el.bandInks && Array.from({length:nBands}).map((_,i)=>(
              <InkRow key={i} label={'Band '+(i+1)+(i===0?' · dark':i===nBands-1?' · light':'')} value={el.bandInks[i]||null} onChange={v=>setBandInk(i,v)} autoTitle="Auto — ramp colour" />
            ))}
          </React.Fragment>}
          <Chips label="Lines" options={[{v:'auto',l:'Auto'},{v:'ink',l:'Ink colour'},{v:'black',l:'Mono'}]} value={el.contourLine||'auto'} onChange={v=>update({contourLine:v})} />
          {el.contourLine==='ink' && <InkRow label="Line ink" value={el.contourInk} onChange={v=>update({contourInk:v})} autoTitle="Main ink" />}
          <Slider label="Line slip" val={el.contourSlip!=null?el.contourSlip:0} min={0} max={20} step={0.5} onChange={v=>update({contourSlip:v})} suffix="px" />
          {el.contourSlip>0 && <Slider label="Slip angle" val={el.contourSlipAngle!=null?el.contourSlipAngle:45} min={0} max={360} step={5} onChange={v=>update({contourSlipAngle:v})} suffix="°" />}
          <Slider label="Echo" val={el.contourEcho!=null?el.contourEcho:0} min={0} max={20} step={0.5} onChange={v=>update({contourEcho:v})} suffix="px" />
          {el.contourEcho>0 && <React.Fragment>
            <InkRow label="Echo ink" value={el.contourEchoInk} onChange={v=>update({contourEchoInk:v})} autoTitle="Auto — warm/cool partner" />
            <Slider label="Echo angle" val={el.contourEchoAngle!=null?el.contourEchoAngle:45} min={0} max={360} step={5} onChange={v=>update({contourEchoAngle:v})} suffix="°" />
          </React.Fragment>}
          <Hint tight>Smoothing melts detail into clean topographic loops — push it up for a weather-map read. Slip prints the linework off-register from the fills; echo re-strikes it in a second ink.</Hint>
        </React.Fragment>}
        {t==='edges' && <React.Fragment>
          <Chips label="Backdrop" options={[{v:'paper',l:'Paper'},{v:'ink',l:'Ink field'},{v:'duotone',l:'Pale duotone'},{v:'image',l:'Raw image'}]} value={el.edgeBackdrop||'paper'} onChange={v=>update({edgeBackdrop:v})} />
          {el.edgeBackdrop==='ink' && <InkRow label="Field ink" value={el.fieldInk} onChange={v=>update({fieldInk:v})} autoTitle="Main ink" />}
          {(el.edgeBackdrop==='duotone'||el.edgeBackdrop==='image') &&
            <Slider label="Paper wash" val={el.edgeWash!=null?el.edgeWash:(el.edgeBackdrop==='duotone'?0.5:0)} min={0} max={0.9} step={0.02} onChange={v=>update({edgeWash:v})} />}
          <Slider label="Detail" val={el.edgeDetail!=null?el.edgeDetail:0.3} min={0} max={1} step={0.02} onChange={v=>update({edgeDetail:v})} />
          <Slider label="Simplify" val={el.edgeSmooth!=null?el.edgeSmooth:1.6} min={0} max={8} step={0.1} onChange={v=>update({edgeSmooth:v})} />
          <Slider label="De-speckle" val={el.edgeClean!=null?el.edgeClean:0} min={0} max={200} step={2} onChange={v=>update({edgeClean:v})} />
          <Slider label="Line weight" val={el.edgeThick!=null?el.edgeThick:2} min={1} max={6} step={0.5} onChange={v=>update({edgeThick:v})} />
          {el.edgeBackdrop!=='ink' && <React.Fragment>
            <Chips label="Inking" options={[{v:'single',l:'Ink'},{v:'black',l:'Mono'}]} value={el.inkMode==='black'?'black':'single'} onChange={v=>update({inkMode:v})} />
            {el.inkMode!=='black' && <InkRow label="Line ink" value={el.edgeInk} onChange={v=>update({edgeInk:v})} autoTitle="Main ink" />}
          </React.Fragment>}
          <Slider label="Line slip" val={el.edgeSlip!=null?el.edgeSlip:0} min={0} max={20} step={0.5} onChange={v=>update({edgeSlip:v})} suffix="px" />
          {el.edgeSlip>0 && <Slider label="Slip angle" val={el.edgeSlipAngle!=null?el.edgeSlipAngle:45} min={0} max={360} step={5} onChange={v=>update({edgeSlipAngle:v})} suffix="°" />}
          <Slider label="Echo" val={el.edgeEcho!=null?el.edgeEcho:0} min={0} max={20} step={0.5} onChange={v=>update({edgeEcho:v})} suffix="px" />
          {el.edgeEcho>0 && <React.Fragment>
            <InkRow label="Echo ink" value={el.edgeEchoInk} onChange={v=>update({edgeEchoInk:v})} autoTitle="Auto — warm/cool partner" />
            <Slider label="Echo angle" val={el.edgeEchoAngle!=null?el.edgeEchoAngle:45} min={0} max={360} step={5} onChange={v=>update({edgeEchoAngle:v})} suffix="°" />
          </React.Fragment>}
          <Hint tight>Simplify melts texture so only confident lines survive; de-speckle sweeps the leftover dust. Echo re-strikes the linework off-register in a second ink.</Hint>
        </React.Fragment>}
        {t==='mosaic' && <React.Fragment>
          <Slider label="Tile size" val={el.cellSize!=null?el.cellSize:16} min={4} max={48} step={1} onChange={v=>update({cellSize:v})} suffix="px" />
          <Slider label="Depth" val={el.mosaicDepth!=null?el.mosaicDepth:4} min={2} max={6} step={1} onChange={v=>update({mosaicDepth:v})} />
          <Chips label="Tile shape" options={[{v:'square',l:'Square'},{v:'round',l:'Round'},{v:'diamond',l:'Diamond'}]} value={el.mosaicShape||'square'} onChange={v=>update({mosaicShape:v})} />
          <Chips label="Bond" options={[{v:'grid',l:'Grid'},{v:'brick',l:'Brick'}]} value={el.mosaicBond||'grid'} onChange={v=>update({mosaicBond:v})} />
          <Slider label="Hand-laid jitter" val={el.mosaicJitter!=null?el.mosaicJitter:0} min={0} max={1} step={0.02} onChange={v=>update({mosaicJitter:v})} />
          <Slider label="Grout" val={el.mosaicGap!=null?el.mosaicGap:0.08} min={0} max={0.3} step={0.01} onChange={v=>update({mosaicGap:v})} />
          {((el.mosaicGap==null?0.08:el.mosaicGap)>0 || (el.mosaicShape&&el.mosaicShape!=='square')) &&
            <Chips label="Grout colour" options={[{v:'paper',l:'Paper'},{v:'black',l:'Mono'},{v:'accent',l:'Accent'}]} value={el.mosaicGrout||'paper'} onChange={v=>update({mosaicGrout:v})} />}
          <Chips label="Tile colours" options={[{v:false,l:'Auto ramp'},{v:true,l:'Custom'}]} value={!!el.bandInks}
            onChange={v=>{ if(!v){ update({ bandInks:null }); } else { const arr=[]; for(let b=0;b<nMosaic;b++) arr.push(null); update({ bandInks:arr }); } }} />
          {el.bandInks && Array.from({length:nMosaic}).map((_,i)=>(
            <InkRow key={i} label={'Tile '+(i+1)+(i===0?' · dark':i===nMosaic-1?' · light':'')} value={el.bandInks[i]||null} onChange={v=>setMosaicInk(i,v)} autoTitle="Auto — ramp colour" />
          ))}
          <Hint tight>Round and diamond tiles show the grout between them even at 0 — pick a mono grout for a stained-glass read.</Hint>
        </React.Fragment>}
        </Fold>
  );
}

export { TuneFold };
