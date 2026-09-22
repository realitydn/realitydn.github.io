/* ============================================================
   REALITY POSTER STUDIO — photo panel · the press and the blurs
   ============================================================ */
import { inkTitle } from '../../../studio-shared/brand.js';
import { PressPanels, SEP_SCREENS, PressStock } from '../../../studio-shared/press-panels.jsx';
import { INK_CHOICES as AP_INKS, PALETTE as AP_PAL } from '../../studio-data.jsx';
import { Chips, Slider, Hint } from '../controls.jsx';
/* one blur group — drives the under-press (soft focus) or over-press (finish)
   stage via its prop prefix ('blurUnder' | 'blurOver'). Six characters:
   gaussian soft, motion streak, zoom rush, spin sweep, lens defocus, and a
   tilt-shift focus band. */
const BLUR_TYPES = [
  {v:'gauss',l:'Soft'},{v:'motion',l:'Motion'},{v:'zoom',l:'Zoom'},
  {v:'spin',l:'Spin'},{v:'lens',l:'Lens'},{v:'tilt',l:'Band'}
];
function BlurControls({ el, update, prefix, label, max }){
  const P = k => prefix+k;
  const amt = el[prefix]!=null?el[prefix]:0;
  const type = el[P('Type')]||'gauss';
  const spin = type==='spin';
  const set = (k,v)=>{ const u={}; u[k]=v; update(u); };
  return (
    <React.Fragment>
      <Chips label={label} options={BLUR_TYPES} value={type}
        onChange={v=>{ const u={}; u[P('Type')]=v; if(v==='tilt') u[P('Angle')]=90; else if(v==='motion') u[P('Angle')]=0; update(u); }} />
      <Slider label={spin?'Sweep':'Amount'} val={amt} min={0} max={spin?40:(max||30)} step={0.5} onChange={v=>set(prefix,v)} suffix={spin?'°':'px'} />
      {amt>0 && type==='motion' &&
        <Slider label="Direction" val={el[P('Angle')]!=null?el[P('Angle')]:0} min={-180} max={180} step={5} onChange={v=>set(P('Angle'),v)} suffix="°" />}
      {amt>0 && (type==='zoom'||type==='spin') && <React.Fragment>
        <Slider label="Centre X" val={el[P('X')]!=null?el[P('X')]:0} min={-0.5} max={0.5} step={0.01} onChange={v=>set(P('X'),v)} />
        <Slider label="Centre Y" val={el[P('Y')]!=null?el[P('Y')]:0} min={-0.5} max={0.5} step={0.01} onChange={v=>set(P('Y'),v)} />
      </React.Fragment>}
      {amt>0 && type==='tilt' && <React.Fragment>
        <Slider label="Band angle" val={el[P('Angle')]!=null?el[P('Angle')]:90} min={0} max={180} step={5} onChange={v=>set(P('Angle'),v)} suffix="°" />
        <Slider label="Band position" val={el[P('Pos')]!=null?el[P('Pos')]:0.5} min={0} max={1} step={0.01} onChange={v=>set(P('Pos'),v)} />
        <Slider label="Band width" val={el[P('Width')]!=null?el[P('Width')]:0.3} min={0.05} max={0.9} step={0.01} onChange={v=>set(P('Width'),v)} />
      </React.Fragment>}
    </React.Fragment>
  );
}
/* ============================================================
   THE PRESS — the separation's own dials.
   ============================================================
   Plates, stock, screen and the separation in the Tune fold, then
   the press itself and a proof as folds of their own. Every dial
   maps one-to-one onto riso-press.js's options (sepOpts in
   riso-engine.js carries the renames); the physics and the
   defaults live there, this only exposes them. A null dial means
   "the paper decides", and the copy says what that resolves to, so
   Auto is never a mystery.

   The Stock picker, The press and Proof folds, the ink rows and the dial
   table are ../studio-shared/press-panels.jsx — the one copy Print Studio
   shows too. Poster's parameters: an Auto (cream) stock, every press dial
   grouped in a fold of its own, tight hints on the dark panel.
   ============================================================ */
PressPanels.configure({ stockDefault:'day', hintTight:true });
/* What the press will actually run for this element — resolved the same way
   the engine resolves it, so the panel never describes a different job from
   the one on the poster. */
function sepResolved(el, inkKey, theme){
  const RP = window.RISO && window.RISO.press; if(!RP) return null;
  const paper = theme==='night' ? 'night' : 'day';
  const o = { inks:el.inks, ink:inkKey, ink2:el.ink2, paper, stock:el.stock||null };
  const inks = RP.resolveInks(o);
  const stockHex = RP.resolveStock(o);
  const night = paper==='night';
  return { inks, night, stockKey: el.stock||'day', stockHex,
    opaque: el.opaque!=null ? !!el.opaque : RP.isDark(stockHex),
    gcr: el.sepGCR!=null ? el.sepGCR : (night?0.12:0.2),
    tac: el.tac!=null ? el.tac : (night?2.8:2.2),
    warn: RP.NEVER_PAIR.filter(p=>inks.indexOf(p[0])>=0 && inks.indexOf(p[1])>=0) };
}
/* What the press runs for ANY treatment. Separation resolves its own job
   (sepResolved); every other treatment but "none" is separated back into
   plates and pressed flat (riso-engine pressThrough, or its own stack for
   off-register / overprint / halftone), so the stock and The press / Proof
   folds apply to it just the same — and its settings carry over when you
   switch treatments, so they must be reachable from every one of them. */
function pressResolved(el, t, inkKey, theme){
  if(!t || t==='none') return null;
  if(t==='separation') return sepResolved(el, inkKey, theme);
  const RP = window.RISO && window.RISO.press; if(!RP || !window.RISO.platesFor) return null;
  const paper = theme==='night' ? 'night' : 'day';
  const stockHex = el.stock ? RP.stockHex(el.stock) : RP.PAPER.day;   // a press treatment prints on cream on either theme
  return { inks: window.RISO.platesFor(t, Object.assign({}, el, { ink:inkKey, paper })),
    night: paper==='night', stockKey: el.stock||'day', stockHex,
    opaque: el.opaque!=null ? !!el.opaque : RP.isDark(stockHex) };
}
function SepControls({ el, update, theme, inkKey }){
  const RP = window.RISO && window.RISO.press;
  const r = sepResolved(el, inkKey, theme);
  if(!RP || !r) return null;
  const custom = Array.isArray(el.inks) && el.inks.length>0;
  const plates = custom ? el.inks : r.inks;
  const setPlate = (i,v)=>{ const arr=plates.slice(); arr[i]=v; update({ inks:arr }); };
  const dropPlate = (i)=>{ const arr=plates.slice(); arr.splice(i,1); update({ inks:arr }); };
  const screenKey = el.screen==='am' ? ((el.pitch||9)>=11 ? 's43' : (el.pitch||9)<=6.5 ? 's106' : 's71') : 'grain';
  const pickScreen = v=>{ const s=RP.SCREENS[v]; update(v==='grain' ? { screen:'fm', levels:0 } : { screen:'am', pitch:s.pitch, levels:s.levels }); };
  return (
    <React.Fragment>
      <div className="rs-sech">Plates</div>
      <Chips options={[{v:false,l:'Auto'},{v:true,l:'Custom'}]} value={custom} onChange={v=>update({ inks: v ? r.inks.slice() : null })} />
      {custom
        ? <React.Fragment>
            {plates.map((k,i)=>(
              <React.Fragment key={i}>
                <div className="rs-lab">Plate {i+1}{i===0?' · first drum':''} <span className="val">{inkTitle(k)}</span></div>
                <div className="rs-swatches">
                  {AP_INKS.map(a=>(<div key={a} className={'rs-sw'+(k===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>setPlate(i,a)} />))}
                  {plates.length>1 && <div className="rs-sw" title="Remove this plate" style={{ border:'1.5px solid var(--st-sw-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#cdbfae' }} onClick={()=>dropPlate(i)}>✕</div>}
                </div>
              </React.Fragment>
            ))}
            {plates.length<5 && <button className="rs-addrow" onClick={()=>update({ inks: plates.concat([RP.PARTNER[plates[plates.length-1]]||'blue']) })}>+ Add a plate</button>}
            {plates.length>3 && <Hint tight>Studios cap a job at 2–4 passes — every plate past the dual drum is another trip through the feed, and another miss.</Hint>}
            <Hint tight>Drum order: the first plate prints first; later drums transfer less onto wet ink. <b>Cream</b> only prints as an opaque ink on a dark stock.</Hint>
          </React.Fragment>
        : <Hint tight>{r.night
            ? <React.Fragment><b>{plates.map(inkTitle).join(' → ')}</b> — the black plate first, then the accent and its partner, on cream: the shadows reach the Night surface and the print's darkness follows the subject, not the page.</React.Fragment>
            : <React.Fragment><b>{plates.map(inkTitle).join(' → ')}</b> — the accent and its partner, the classic two-colour riso.</React.Fragment>}</Hint>}
      {r.warn.length>0 && <Hint tight>⚠ <b>{r.warn.map(p=>inkTitle(p[0])+' + '+inkTitle(p[1])).join(', ')}</b> — near-tonal pairs the guidance advises against. Allowed; the overlap goes muddy.</Hint>}

      <PressStock el={el} update={update} stockKey={r.stockKey} opaque={r.opaque} />

      <div className="rs-sech">Screen</div>
      <Chips options={SEP_SCREENS} value={screenKey} onChange={pickScreen} />
      {el.screen==='am'
        ? <React.Fragment>
            <Chips label="Dot" options={[{v:'chain',l:'Chain'},{v:'line',l:'Line'},{v:'square',l:'Square'},{v:'diamond',l:'Diamond'}]} value={el.sepShape||'chain'} onChange={v=>update({sepShape:v})} />
            <Slider label="Pitch" val={el.pitch!=null?el.pitch:9} min={3} max={24} step={0.5} onChange={v=>update({pitch:v})} suffix="px" />
            <Slider label="Tone steps" val={el.levels||0} min={0} max={256} step={1} onChange={v=>update({levels:v})} />
          </React.Fragment>
        : <Slider label="Grain size" val={el.grainPitch!=null?el.grainPitch:0.5} min={0.25} max={3} step={0.05} onChange={v=>update({grainPitch:v})} suffix="px" />}
      <Hint tight>Grain is the machine's own stochastic screen — what a riso does on most jobs. 43 / 71 / 106 are the dot screens, coarse to fine; a fine screen holds fewer tones and bands on a long gradient (Tone steps, 0 = unlimited).</Hint>

      <div className="rs-sech">Separation</div>
      <Slider label="GCR" val={r.gcr} min={0} max={0.8} step={0.01} onChange={v=>update({sepGCR:v})} />
      <Slider label="Chroma boost" val={el.sepBoost!=null?el.sepBoost:1.15} min={0.8} max={2} step={0.01} onChange={v=>update({sepBoost:v})} suffix="×" />
      <Slider label="Ink limit" val={r.tac} min={1} max={4} step={0.05} onChange={v=>update({tac:v})} />
      <Slider label="Saturation" val={el.saturation!=null?el.saturation:1} min={0} max={2} step={0.02} onChange={v=>update({saturation:v})} />
      <Chips label="Source" options={[{v:false,l:'Positive'},{v:true,l:'Negative'}]} value={!!el.invertSource} onChange={v=>update({invertSource:v})} />
      {(el.sepGCR!=null || el.tac!=null) && <button className="rs-addrow" onClick={()=>update({ sepGCR:null, tac:null })}>↺ Let the paper decide GCR &amp; ink limit</button>}
      <Hint tight><b>GCR</b>: of two mixes that hit a colour, how strongly the press prefers the one laying down less ink. <b>Ink limit</b>: total coverage across the plates — night presses harder (2.8) than day (2.2). <b>Negative</b> prints the inverse: the studio's own advice for a dark poster on light stock.</Hint>
    </React.Fragment>
  );
}

export { BLUR_TYPES, BlurControls, sepResolved, pressResolved, SepControls };
