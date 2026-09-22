/* ============================================================
   REALITY STUDIOS — the press panels, once
   ------------------------------------------------------------
   The riso press (riso-press.js, one pure core) runs under every photo
   treatment in Poster and Print, and both inspectors expose the same
   three things about it: the STOCK the job runs on, THE PRESS itself
   (registration, the drum, the run, tone transfer) and a PROOF of one
   plate. They were written twice — Poster's PressStock / SepPressFold /
   SepProofFold, Print's PressCommon — with the same dials at the same
   ranges typed in two places. This is the one copy, built on the RUI
   atoms so each Studio's class prefix (rs- / ps-) styles it.

   What differs between the Studios is configuration, set once per host
   (each Studio's bundle has its own copy of this module):
     stockDefault — the sheet an element with no `stock` runs on: Poster
                    'day' (cream, and an Auto swatch that means it),
                    Print 'white' (the true-white sheet it prints on; no
                    Auto — white IS the default).
     stockNote    — a closing line under the stock picker (Print's).
     hintTight    — Poster's inspector runs its hints tight.
   (the outline an outlined swatch takes is RUI's swatchBorder, set with
   the Studio's RUI.configure).
   and per call:
     PressFold `dials` — Print exposes a SUBSET of the press (drift, skew,
                    stretch, streaks, starvation, pull) as a section of its
                    treatment fold; Poster shows every dial, grouped, as a
                    fold of its own. The dial table below is shared either
                    way, so a range or default can't drift between them.
     `fold` — a RUI.Fold (Poster) or a section header (Print).
   Physics and defaults: riso-press.js. This file only exposes them.
   ============================================================ */
import { RUI } from './studio-ui.jsx';
import { inkTitle, INK_CHOICES, PALETTE } from './brand.js';

const CFG = { stockDefault:'day', stockNote:null, hintTight:true };
function configure(opts){ Object.assign(CFG, opts||{}); }

const cls = (s)=> RUI.cls(s);
function H(props){ return <RUI.Hint tight={CFG.hintTight} {...props} />; }
function Sech({ children }){ return <div className={cls('sech')}>{children}</div>; }
function press(){ return window.RISO && window.RISO.press; }

/* the stocks, by name — the picker's tooltips and the hint's lead word */
const STOCK_LABEL = { day:'Cream', white:'White', news:'Newsprint', straw:'Straw', kraft:'Kraft', salmon:'Salmon',
                      grey:'Grey board', flint:'Flint', steel:'Steel', night:'Night' };
/* the separation's screens: the machine's own grain, or a dot screen */
const SEP_SCREENS = [{v:'grain',l:'Grain'},{v:'s43',l:'43'},{v:'s71',l:'71'},{v:'s106',l:'106'}];

/* ---- STOCK ------------------------------------------------------------
   `stockKey` / `opaque` are what the host resolved (the stock this element
   really runs on, and whether its ink goes opaque on it). */
function PressStock({ el, update, stockKey, opaque }){
  const RP = press(); if(!RP) return null;
  const auto = CFG.stockDefault==='day';
  const on = (s)=> auto ? el.stock===s : (el.stock||CFG.stockDefault)===s;
  const key = stockKey || el.stock || CFG.stockDefault;
  return (
    <React.Fragment>
      <Sech>Stock</Sech>
      <div className={cls('swatches')}>
        {auto && <div className={cls('sw')+(el.stock==null?' on':'')} title="Auto — cream"
          style={{ background:RP.PAPER.day, border:'1.5px solid '+RUI.swatchBorder() }} onClick={()=>update({ stock:null, opaque:null })} />}
        {RP.STOCKS.map(s=>(<div key={s} className={cls('sw')+(on(s)?' on':'')} title={STOCK_LABEL[s]||s}
          style={auto ? { background:RP.PAPER[s] } : { background:RP.PAPER[s], border:'1.5px solid '+RUI.swatchBorder() }}
          onClick={()=>update({ stock:s, opaque:null })} />))}
      </div>
      <H><b>{STOCK_LABEL[key]||key}.</b> {opaque
        ? 'Dark stock — opaque ink, a screenprint rather than a riso: each plate covers what is under it.'
        : 'Translucent ink: the sheet shows through every plate, so a tinted stock colours the whole print.'}
        {CFG.stockNote ? ' '+CFG.stockNote : null}</H>
    </React.Fragment>
  );
}

/* ---- THE PRESS -------------------------------------------------------
   Every dial once: label, range, the engine's default. `show` hides a dial
   that means nothing until another is set. */
const PRESS_DIALS = {
  drift:      { l:'Drift',       min:0,   max:24,   step:0.5,   def:0,    suffix:'px' },
  skew:       { l:'Feed skew',   min:0,   max:24,   step:0.5,   def:0,    suffix:'px' },
  stretch:    { l:'Stretch',     min:0,   max:30,   step:0.5,   def:0,    suffix:'px' },
  duo:        { chips:[{v:true,l:'Dual-drum'},{v:false,l:'One drum'}], l:'Drums', get:el=>el.duo!==false },
  drumStreak: { l:'Streaks',     min:0,   max:1,    step:0.02,  def:0 },
  drumBand:   { l:'Drum band',   min:0,   max:1,    step:0.02,  def:0 },
  bandPeriod: { l:'Drum period', min:20,  max:260,  step:2,     def:90,   suffix:'px', show:el=>el.drumBand>0 },
  starve:     { l:'Starvation',  min:0,   max:1,    step:0.02,  def:0 },
  wet:        { l:'Wet-on-wet',  min:0,   max:0.7,  step:0.01,  def:0.25 },
  pull:       { l:'Pull',        min:0,   max:400,  step:1,     def:0 },
  pressRun:   { chips:[{v:true,l:'Modelled'},{v:false,l:'Reseed only'}], l:'Run', get:el=>el.pressRun!==false },
  gain:       { l:'Dot gain',    min:0,   max:1.2,  step:0.02,  def:0.8 },
  linear:     { chips:[{v:true,l:'Compensated'},{v:false,l:'Straight to press'}], l:'RIP', get:el=>el.linear!==false },
  floor:      { l:'Tone floor',  min:0,   max:0.3,  step:0.01,  def:0.10 },
  ceiling:    { l:'Plate ceiling', min:0.7, max:1,  step:0.005, def:0.98 },
  solidity:   { l:'Solidity',    min:0.7, max:1,    step:0.005, def:0.97 },
  floodCap:   { l:'Flood cap',   min:0,   max:1,    step:0.01,  def:0 },
};
/* the dials that count toward the fold's "changed" badge */
const PRESS_DIRTY_KEYS = ['drift','skew','stretch','duo','drumStreak','drumBand','starve','wet','pull','pressRun','fountainTo','gain','linear','floor','ceiling','solidity','floodCap'];
function PressDial({ k, el, update }){
  const d = PRESS_DIALS[k];
  if(!d || (d.show && !d.show(el))) return null;
  if(d.chips) return <RUI.Chips label={d.l} options={d.chips} value={d.get(el)} onChange={v=>update({ [k]:v })} />;
  return <RUI.Slider label={d.l} val={el[k]!=null?el[k]:d.def} min={d.min} max={d.max} step={d.step}
    onChange={v=>update({ [k]:v })} suffix={d.suffix} />;
}
/* an ink swatch row with a leading Auto/Off slot (null) */
function InkRow({ label, value, onChange, autoTitle }){
  return (
    <React.Fragment>
      <div className={cls('lab')}>{label} <span className="val">{value||'auto'}</span></div>
      <div className={cls('swatches')}>
        <div className={cls('sw')+(value==null?' on':'')} title={autoTitle||'Auto'} style={{ border:'1.5px solid '+RUI.swatchBorder() }} onClick={()=>onChange(null)} />
        {INK_CHOICES.map(a=>(
          <div key={a} className={cls('sw')+(value===a?' on':'')} title={inkTitle(a)} style={{ background:PALETTE[a] }} onClick={()=>onChange(a)} />
        ))}
      </div>
    </React.Fragment>
  );
}
/* The press, in full (no `dials`) — Poster: grouped, with the split
   fountain — or a flat SUBSET (`dials: [...]`, `note`) — Print. */
function PressFold({ el, update, plates, other, dials, note, fold=true, dirtyBase }){
  const D = (k)=> <PressDial key={k} k={k} el={el} update={update} />;
  const n = Math.max(2, (plates||[]).length);
  const body = dials
    ? <React.Fragment>{dials.map(D)}{note && <H>{note}</H>}</React.Fragment>
    : <React.Fragment>
        {other && <H>The <b>{other}</b> is separated back into these plates and run through the same press — every dial here moves it too, and they stay set when you switch treatment.</H>}
        <Sech>Registration</Sech>
        {['drift','skew','stretch','duo'].map(D)}
        <Sech>Ink on the drum</Sech>
        {['drumStreak','drumBand','bandPeriod','starve','wet'].map(D)}
        <H>Streaks and the band belong to the plate, before the stack — so a starved patch in the pink plate goes green-ish, not grey. Wet-on-wet: a later drum transfers less onto an oily sheet, which is why swapping two inks changes the overprint.</H>
        <Sech>The run</Sech>
        {['pull','pressRun'].map(D)}
        <H>Which sheet off the run this is. Pull 0 is the idealised print; pull 1 is the first sheet off a cold drum and prints light; as the run goes the miss opens, the master wears, and the feed tires carry ink onto the head of the sheet.</H>
        <Sech>Split fountain</Sech>
        <InkRow label="Second ink on a drum" value={el.fountainTo} onChange={v=>update({fountainTo:v})} autoTitle="Off — one ink per drum" />
        {el.fountainTo && <React.Fragment>
          <RUI.Slider label="Which drum" val={(el.fountainPlate!=null?el.fountainPlate:1)+1} min={1} max={n} step={1} onChange={v=>update({fountainPlate:v-1})} />
          <RUI.Slider label="Blend angle" val={el.fountainAngle||0} min={0} max={360} step={5} onChange={v=>update({fountainAngle:v})} suffix="°" />
          <RUI.Slider label="Blend width" val={el.fountainSoft!=null?el.fountainSoft:1} min={0.1} max={3} step={0.05} onChange={v=>update({fountainSoft:v})} />
          <H>One drum loaded with two inks that blend across it — the colour changes with where you are on the sheet, not with what the picture is doing. The blend widens with every pull.</H>
        </React.Fragment>}
        <Sech>Tone transfer</Sech>
        {['gain','linear','floor','ceiling','solidity','floodCap'].map(D)}
        <H>Dot gain is what the press adds back (ISO 12647-3: a 50 % dot prints at 76 %); a compensated RIP pulls the plate down by as much. Straight to press is the darkened, closed-up print of an uncompensated file. The floor is where the master has no hole; the ceiling what a master can carry; solidity how completely ink covers where it lands. Flood cap is design advice about big floods — off by default.</H>
      </React.Fragment>;
  if(!fold) return <React.Fragment><Sech>The press</Sech>{body}</React.Fragment>;
  return (
    <RUI.Fold id="ph-sep-press" title="The press" dirty={RUI.dirtyCount(el, PRESS_DIRTY_KEYS, dirtyBase)}
      hint={<React.Fragment>A riso misses register because the <b>paper</b> moves. Each plate gets its own miss — a shift, a fraction of a degree, a shear that opens down the sheet, a stretch along the feed. A dual-drum press lays the first two plates in one pass, so those two register tight.</React.Fragment>}>
      {body}
    </RUI.Fold>
  );
}

/* ---- PROOF — one plate at a time ------------------------------------- */
function ProofFold({ el, update, plates, fold=true }){
  const body = <React.Fragment>
    <RUI.Chips options={[{v:-1,l:'The print'}].concat((plates||[]).map((k,i)=>({v:i,l:'Plate '+(i+1)+' · '+inkTitle(k)})))}
      value={el.proofPlate!=null?el.proofPlate:-1} onChange={v=>update({ proofPlate: v<0?null:v })} />
    <RUI.Chips label="Show as" options={[{v:false,l:'In its ink'},{v:true,l:'Greyscale'}]} value={!!el.proofGrey} onChange={v=>update({proofGrey:v})} />
  </React.Fragment>;
  if(!fold) return <React.Fragment><Sech>Proof</Sech>{body}</React.Fragment>;
  return (
    <RUI.Fold id="ph-sep-proof" title="Proof" badge={el.proofPlate!=null && el.proofPlate>=0 ? 'plate '+(el.proofPlate+1) : null}>
      {body}
      <H>One plate at a time — the sheet a shop pulls to check a separation. Greyscale is the file you would hand them, one per drum.</H>
    </RUI.Fold>
  );
}

const PressPanels = { configure };
export {
  PressPanels, STOCK_LABEL, SEP_SCREENS, PRESS_DIALS, PRESS_DIRTY_KEYS,
  PressStock, PressDial, PressFold, ProofFold, InkRow,
};
