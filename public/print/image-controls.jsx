/* ============================================================
   REALITY PRINT STUDIO — the photo panel
   The image element's inspector: upload / fit / pan, the riso
   treatment strip with its presets, the separation press (plates,
   screen, separation), and — under every treatment but none — the
   shared stock / press / proof folds. ImageControls, IMG_TREATS and
   IMG_TREAT_PRESETS are test hooks (window globals, main.jsx).
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { inkTitle, INK_CHOICES, PALETTE as AP_PAL } from '../studio-shared/brand.js';
import { ImageIntake, PhotoUpload } from '../studio-shared/image-intake.jsx';
import { PressPanels, SEP_SCREENS, PressStock, PressFold, ProofFold } from '../studio-shared/press-panels.jsx';
import { risoOpts } from './print-layout.js';
import { Slider, Chips, Fold, Hint, AccentRow } from './controls.jsx';

const IMG_TREATS = [{v:'none',l:'None'},{v:'separation',l:'Press'},{v:'duotone',l:'Duotone'},{v:'halftone',l:'Halftone'},{v:'posterize',l:'Banded'},{v:'cutout',l:'Cutout'},{v:'spot',l:'Spot'},{v:'offregister',l:'Off-Reg'},{v:'overprint',l:'Overprint'}];
const IMG_TREAT_PRESETS = {
  none:       { contrast:1.1,  brightness:0 },
  /* the press — a real separation on the white sheet (Print's stock); null =
     the engine decides (plates: accent + partner). See riso-press.js DEFAULTS. */
  separation: { contrast:1.08, brightness:0, inks:null, stock:'white', opaque:null, invertSource:false, screen:'fm', sepShape:'chain',
                pitch:9, grainPitch:0.5, levels:0, sepGCR:null, sepBoost:1.15, tac:null, gain:0.8, linear:true,
                drift:0, skew:0, stretch:0, drumStreak:0, drumBand:0, starve:0, wet:0.25, pull:0, pressRun:true, proofPlate:null, proofGrey:false },
  duotone:    { contrast:1.18, balance:0.5,  shadowTint:0.18, invert:false },
  halftone:   { contrast:1.2,  dot:9, angle:15, shape:'circle', inkMode:'single', gradMode:'tone', gradAngle:90, gradA:null, gradB:null, screenOffset:30, field:'paper', fieldInk:null, fieldStrength:0.12, dotGain:1, jitter:0, invert:false },
  posterize:  { contrast:1.25, bands:4 },
  cutout:     { contrast:1.3,  threshold:0.52, softness:0.12, invert:false },
  spot:       { contrast:1.2,  spotLo:0.35, spotHi:0.65, spotSoft:0.08, spotInvert:false, spotBase:'duotone', balance:0.5, shadowTint:0.18 },
  offregister:{ contrast:1.25, offset:13, angle:47, spread:1.25 },
  overprint:  { contrast:1.2,  offset:8,  angle:45, split:0.16 },
};

/* ---------- photo helpers ----------
   File / clipboard → a sized image is ../studio-shared/image-intake.jsx, the
   same code the Poster uses (which is how Print gained the HEIC message and an
   error path — an undecodable file used to do nothing at all). Print's
   parameters: a 3500px long edge — 150 dpi across 593 mm, an A2's long side,
   an A1's short one; it was 2000, which gave a full-width A1 photo ~85 dpi.
   The pixels live in IndexedDB (print-store), not the doc, so the bigger file
   costs storage we have, and the exporter's raster cap (4000) sits above it
   so none of it is thrown away. The preflight names the dpi a photo really
   gets. JPEG at 0.86. */
ImageIntake.configure({ maxEdge:3500, jpegQuality:0.86, uploadLabel:'⬆ Upload / replace image…' });
/* The separation press on a print piece — the same dials Poster Studio
   exposes, cut to what a Print job needs. Print's stock is the white sheet by
   default (the engine's `white`); every other stock is one click away for a
   piece going on kraft or board. Physics and defaults: riso-press.js. The
   Stock picker, the press dials and the Proof are
   ../studio-shared/press-panels.jsx, shared with the Poster; Print's
   parameters: white stock (no Auto), a subset of the press as a section of
   the treatment fold, loose hints on the light panel. */
PressPanels.configure({ stockDefault:'white', hintTight:false,
  stockNote:'White is the sheet these pieces are run on; the rest are for a piece going on a coloured stock.' });
const PRINT_PRESS_DIALS = ['drift','skew','stretch','drumStreak','starve','pull'];
const PLATE_INKS = INK_CHOICES;
function PressControls({ el, update, docAccent }){
  const RP = window.RISO && window.RISO.press; if(!RP) return null;
  const inkKey = el.followAccent!==false ? docAccent : (el.ink||'pink');
  const resolved = RP.resolveInks({ inks:el.inks, ink:inkKey, ink2:el.ink2, paper:'day' });
  const custom = Array.isArray(el.inks) && el.inks.length>0;
  const plates = custom ? el.inks : resolved;
  const setPlate = (i,v)=>{ const arr=plates.slice(); arr[i]=v; update({ inks:arr }); };
  const dropPlate = (i)=>{ const arr=plates.slice(); arr.splice(i,1); update({ inks:arr }); };
  const screenKey = el.screen==='am' ? ((el.pitch||9)>=11 ? 's43' : (el.pitch||9)<=6.5 ? 's106' : 's71') : 'grain';
  const pickScreen = v=>{ const s=RP.SCREENS[v]; update(v==='grain' ? { screen:'fm', levels:0 } : { screen:'am', pitch:s.pitch, levels:s.levels }); };
  const warn = RP.NEVER_PAIR.filter(p=>plates.indexOf(p[0])>=0 && plates.indexOf(p[1])>=0);
  const sw = (a)=> RP.PAL[a] || AP_PAL[a];
  return (
    <React.Fragment>
      <div className="ps-sech">Plates</div>
      <Chips options={[{v:false,l:'Auto'},{v:true,l:'Custom'}]} value={custom} onChange={v=>update({ inks: v ? resolved.slice() : null })} />
      {custom
        ? <React.Fragment>
            {plates.map((k,i)=>(
              <React.Fragment key={i}>
                <div className="ps-lab">Plate {i+1}{i===0?' · first drum':''}<span className="val">{inkTitle(k)}</span></div>
                <div className="ps-swatches">
                  {PLATE_INKS.map(a=>(<div key={a} className={'ps-sw'+(k===a?' on':'')} title={inkTitle(a)} style={{ background:sw(a) }} onClick={()=>setPlate(i,a)} />))}
                  {plates.length>1 && <div className="ps-sw" title="Remove this plate" style={{ border:'1.5px solid var(--st-sw-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }} onClick={()=>dropPlate(i)}>✕</div>}
                </div>
              </React.Fragment>
            ))}
            {plates.length<5 && <button className="ps-addrow" onClick={()=>update({ inks: plates.concat([RP.PARTNER[plates[plates.length-1]]||'blue']) })}>+ Add a plate</button>}
            {plates.length>3 && <Hint>Studios cap a job at 2–4 passes — every plate past the dual drum is another trip through the feed.</Hint>}
          </React.Fragment>
        : <Hint><b>{plates.map(inkTitle).join(' → ')}</b> — the accent and its partner, the classic two-colour riso.</Hint>}
      {warn.length>0 && <Hint>⚠ <b>{warn.map(p=>inkTitle(p[0])+' + '+inkTitle(p[1])).join(', ')}</b> — near-tonal pairs the guidance advises against. Allowed; the overlap goes muddy.</Hint>}
      <div className="ps-sech">Screen</div>
      <Chips options={SEP_SCREENS} value={screenKey} onChange={pickScreen} />
      {el.screen==='am'
        ? <React.Fragment>
            <Chips label="Dot" options={[{v:'chain',l:'Chain'},{v:'line',l:'Line'},{v:'square',l:'Square'},{v:'diamond',l:'Diamond'}]} value={el.sepShape||'chain'} onChange={v=>update({sepShape:v})} />
            <Slider label="Pitch" val={el.pitch!=null?el.pitch:9} min={3} max={24} step={0.5} onChange={v=>update({pitch:v})} suffix="px" />
          </React.Fragment>
        : <Slider label="Grain size" val={el.grainPitch!=null?el.grainPitch:0.5} min={0.25} max={3} step={0.05} onChange={v=>update({grainPitch:v})} suffix="px" />}
      <div className="ps-sech">Separation</div>
      <Slider label="GCR" val={el.sepGCR!=null?el.sepGCR:0.2} min={0} max={0.8} step={0.01} onChange={v=>update({sepGCR:v})} />
      <Slider label="Chroma boost" val={el.sepBoost!=null?el.sepBoost:1.15} min={0.8} max={2} step={0.01} onChange={v=>update({sepBoost:v})} suffix="×" />
      <Slider label="Ink limit" val={el.tac!=null?el.tac:2.2} min={1} max={4} step={0.05} onChange={v=>update({tac:v})} />
      <Chips label="Source" options={[{v:false,l:'Positive'},{v:true,l:'Negative'}]} value={!!el.invertSource} onChange={v=>update({invertSource:v})} />
    </React.Fragment>
  );
}
/* The press under EVERY treatment. Separation is the press itself; every other
   treatment but "none" is separated back into plates and pressed flat by the
   shared engine (riso-engine pressThrough), so the stock, the registration miss,
   the drum, the pull and the proof all apply to it — and they carry over when
   the treatment changes, so every treatment has to be able to reach them.
   Plates for the proof come from the engine itself (RISO.platesFor). */
function PressCommon({ el, update, t, docAccent }){
  const RP = window.RISO && window.RISO.press; if(!RP) return null;
  const stockKey = el.stock||'white';
  const opaque = el.opaque!=null ? !!el.opaque : RP.isDark(RP.stockHex(stockKey));
  const plates = (window.RISO.platesFor && risoOpts) ? window.RISO.platesFor(t, risoOpts(el, docAccent)) : [];
  return (
    <React.Fragment>
      <PressStock el={el} update={update} stockKey={stockKey} opaque={opaque} />
      <PressFold el={el} update={update} plates={plates} fold={false} dials={PRINT_PRESS_DIALS}
        note="A riso misses register because the paper moves; each plate gets its own miss. Pull is which sheet off the run this is — 0 is the idealised print, the miss opens and the master wears as the run goes." />
      <ProofFold el={el} update={update} plates={plates} fold={false} />
    </React.Fragment>
  );
}
/* the full riso treatment panel, in Folds (ported from Poster Studio) */
function ImageControls({ el, update, onFile, docAccent }){
  const t = el.treatment||'none';
  return (
    <React.Fragment>
      <Fold id="im-img" title="Image" open>
        <PhotoUpload onFile={onFile} />
        <Hint>…or copy any image and paste with <b>Ctrl-V</b> / <b>⌘V</b>.</Hint>
        <Chips label="Fit" options={[{v:'cover',l:'Fill'},{v:'contain',l:'Contain'}]} value={el.fit||'cover'} onChange={v=>update({fit:v})} />
        <Slider label="Zoom" val={el.imgScale!=null?el.imgScale:1} min={0.5} max={3} step={0.02} onChange={v=>update({imgScale:v})} suffix="×" />
        <div className="ps-rowflex">
          <Slider label="Pan X" val={el.imgX!=null?el.imgX:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({imgX:v})} />
          <Slider label="Pan Y" val={el.imgY!=null?el.imgY:0} min={-0.5} max={0.5} step={0.01} onChange={v=>update({imgY:v})} />
        </div>
        <Slider label="Image spin" val={el.imgRot!=null?el.imgRot:0} min={-180} max={180} step={1} onChange={v=>update({imgRot:v})} suffix="°" />
        <Chips label="Keyline frame" options={[{v:false,l:'None'},{v:true,l:'Ink frame'}]} value={!!el.frame} onChange={v=>update({frame:v})} />
        {el.frame && <Slider label="Frame width" val={el.frameW||3} min={1} max={10} step={0.5} onChange={v=>update({frameW:v})} suffix="pt" />}
      </Fold>

      <Fold id="im-treat" title={'Riso treatment · '+(IMG_TREATS.find(x=>x.v===t)||{l:t}).l} open>
        <Chips options={IMG_TREATS} value={t} onChange={v=>update(Object.assign({ treatment:v }, IMG_TREAT_PRESETS[v]||{}))} />
        {t!=='none' && <React.Fragment>
          <Chips label="Main ink" options={[{v:true,l:'Doc accent'},{v:false,l:'Custom'}]} value={el.followAccent!==false} onChange={v=>update({ followAccent:v })} />
          {el.followAccent===false && <AccentRow value={el.ink} onChange={v=>update({ ink:v })} />}
        </React.Fragment>}

        <div className="ps-sech">{t==='none'?'Adjust':'Press'}</div>
        <Slider label="Brightness" val={el.brightness!=null?el.brightness:0} min={-0.5} max={0.5} step={0.02} onChange={v=>update({brightness:v})} />
        <Slider label="Contrast" val={el.contrast!=null?el.contrast:1.1} min={0.7} max={1.9} step={0.01} onChange={v=>update({contrast:v})} />
        <Slider label="Soft focus" val={el.blurUnder!=null?el.blurUnder:0} min={0} max={16} step={0.5} onChange={v=>update({blurUnder:v})} suffix="px" />
        {t==='separation' && <PressControls el={el} update={update} docAccent={docAccent} />}
        {t!=='none' && <PressCommon el={el} update={update} t={t} docAccent={docAccent} />}
        {t==='duotone' && <React.Fragment>
          <Slider label="Tone balance" val={el.balance!=null?el.balance:0.5} min={0.1} max={0.9} step={0.01} onChange={v=>update({balance:v})} />
          <Slider label="Shadow tint" val={el.shadowTint!=null?el.shadowTint:0.18} min={0} max={0.6} step={0.02} onChange={v=>update({shadowTint:v})} />
          <Chips label="Invert" options={[{v:false,l:'Normal'},{v:true,l:'Inverted'}]} value={!!el.invert} onChange={v=>update({invert:v})} />
        </React.Fragment>}
        {t==='halftone' && <React.Fragment>
          <Chips label="Inking" options={[{v:'single',l:'Ink'},{v:'black',l:'Mono'},{v:'gradient',l:'Gradient'},{v:'two',l:'Two-ink'}]} value={el.inkMode||'single'} onChange={v=>update({inkMode:v})} />
          {(el.inkMode||'single')==='gradient' && <React.Fragment>
            <Chips label="Ramp" options={[{v:'tone',l:'By tone'},{v:'frame',l:'Across frame'}]} value={el.gradMode||'tone'} onChange={v=>update({gradMode:v})} />
            <div className="ps-lab">From<span className="val">{el.gradA||'main'}</span></div>
            <AccentRow value={el.gradA} onChange={v=>update({ gradA:v })} nullable nullTitle="Main ink" />
            <div className="ps-lab">To<span className="val">{el.gradB||'partner'}</span></div>
            <AccentRow value={el.gradB} onChange={v=>update({ gradB:v })} nullable nullTitle="Auto — partner" />
            {el.gradMode==='frame' && <Slider label="Ramp angle" val={el.gradAngle!=null?el.gradAngle:90} min={0} max={360} step={1} onChange={v=>update({gradAngle:v})} suffix="°" />}
          </React.Fragment>}
          {(el.inkMode||'single')==='two' && <React.Fragment>
            <div className="ps-lab">Second ink<span className="val">{el.ink2||'auto'}</span></div>
            <AccentRow value={el.ink2} onChange={v=>update({ ink2:v })} nullable nullTitle="Auto — partner" />
            <Slider label="Screen offset" val={el.screenOffset!=null?el.screenOffset:30} min={0} max={90} step={1} onChange={v=>update({screenOffset:v})} suffix="°" />
          </React.Fragment>}
          <Slider label="Dot size" val={el.dot!=null?el.dot:9} min={4} max={22} step={1} onChange={v=>update({dot:v})} suffix="px" />
          <Slider label="Screen angle" val={el.angle!=null?el.angle:15} min={-90} max={90} step={1} onChange={v=>update({angle:v})} suffix="°" />
          <Chips label="Dot shape" options={[{v:'circle',l:'Dot'},{v:'square',l:'Square'},{v:'diamond',l:'Diamond'},{v:'ring',l:'Ring'},{v:'line',l:'Line'}]} value={el.shape||'circle'} onChange={v=>update({shape:v})} />
          <Slider label="Dot gain" val={el.dotGain!=null?el.dotGain:1} min={0.6} max={1.6} step={0.02} onChange={v=>update({dotGain:v})} />
          <Chips label="Print" options={[{v:false,l:'Shadows'},{v:true,l:'Highlights'}]} value={!!el.invert} onChange={v=>update({invert:v})} />
        </React.Fragment>}
        {t==='posterize' && <Slider label="Bands" val={el.bands!=null?el.bands:4} min={2} max={6} step={1} onChange={v=>update({bands:v})} />}
        {t==='cutout' && <React.Fragment>
          <Slider label="Threshold" val={el.threshold!=null?el.threshold:0.52} min={0.15} max={0.85} step={0.01} onChange={v=>update({threshold:v})} />
          <Slider label="Edge softness" val={el.softness!=null?el.softness:0.12} min={0.01} max={0.4} step={0.01} onChange={v=>update({softness:v})} />
          <Chips label="Invert" options={[{v:false,l:'Subject'},{v:true,l:'Background'}]} value={!!el.invert} onChange={v=>update({invert:v})} />
        </React.Fragment>}
        {t==='spot' && <React.Fragment>
          <Chips label="Backdrop" options={[{v:'duotone',l:'Duotone'},{v:'image',l:'Raw image'}]} value={el.spotBase||'duotone'} onChange={v=>update({spotBase:v})} />
          <Slider label="Range low" val={el.spotLo!=null?el.spotLo:0.35} min={0} max={1} step={0.01} onChange={v=>update({spotLo:v})} />
          <Slider label="Range high" val={el.spotHi!=null?el.spotHi:0.65} min={0} max={1} step={0.01} onChange={v=>update({spotHi:v})} />
          <Slider label="Edge softness" val={el.spotSoft!=null?el.spotSoft:0.08} min={0.002} max={0.4} step={0.01} onChange={v=>update({spotSoft:v})} />
          <Chips label="Fill" options={[{v:false,l:'In range'},{v:true,l:'Out of range'}]} value={!!el.spotInvert} onChange={v=>update({spotInvert:v})} />
        </React.Fragment>}
        {(t==='offregister'||t==='overprint') && <React.Fragment>
          <div className="ps-lab">Second ink<span className="val">{el.ink2||'auto'}</span></div>
          <AccentRow value={el.ink2} onChange={v=>update({ ink2:v })} nullable nullTitle="Auto — partner" />
          <Slider label="Offset" val={el.offset!=null?el.offset:(t==='overprint'?8:13)} min={0} max={40} step={1} onChange={v=>update({offset:v})} suffix="px" />
          <Slider label="Angle" val={el.angle!=null?el.angle:(t==='overprint'?45:47)} min={0} max={360} step={1} onChange={v=>update({angle:v})} suffix="°" />
          {t==='offregister' && <Slider label="Ink spread" val={el.spread!=null?el.spread:1.25} min={0.8} max={1.8} step={0.02} onChange={v=>update({spread:v})} />}
          {t==='overprint' && <Slider label="Field split" val={el.split!=null?el.split:0.16} min={0.04} max={0.4} step={0.01} onChange={v=>update({split:v})} />}
        </React.Fragment>}
      </Fold>

      <Fold id="im-finish" title="Finish" badge={(el.blurOver>0||el.grain>0)?'on':null}>
        <Slider label="Blur" val={el.blurOver!=null?el.blurOver:0} min={0} max={30} step={0.5} onChange={v=>update({blurOver:v})} suffix="px" />
        <Slider label="Grain" val={el.grain!=null?el.grain:0} min={0} max={1} step={0.02} onChange={v=>update({grain:v})} />
        {(el.grain||0)>0 && <Slider label="Grain size" val={el.grainSize!=null?el.grainSize:2} min={0.5} max={5} step={0.25} onChange={v=>update({grainSize:v})} suffix="px" />}
      </Fold>
    </React.Fragment>
  );
}

export { ImageControls, IMG_TREATS, IMG_TREAT_PRESETS };
