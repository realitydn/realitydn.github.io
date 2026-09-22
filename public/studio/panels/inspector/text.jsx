/* ============================================================
   REALITY POSTER STUDIO — inspector · text
   Content fields for every text-bearing type, then Type, Subtitle and Kicker.
   ============================================================ */
import { DEFAULTS as AP_DEF, PALETTE as AP_PAL, textInsetModel } from '../../studio-data.jsx';
import { titleLineHeight } from '../../studio-element.jsx';
import { searchNorm } from '../../feed.js';
import { Field, Slider, Chips, Fold, Hint, ScaleControl, Swatches, WEIGHTS_MONT, WEIGHTS_GROT } from '../controls.jsx';
import { TicketContent } from './ticket.jsx';

/* Text content lives in its own fold per type. Kept as one expression so the
   order of the type branches — and the copy in them — is unchanged from when
   they were bare sections; only the container is new. */
function ContentFields({ el, doc, update, caps, feedEvents }){
  /* The linked event's Vietnamese name, when it is a different name (not a
     copy of the EN). Opt-in: a queue starter no longer places it — the Title
     offers it as a button. Posters linked before eventRef carried titleVi
     look it up in the queue's feed. */
  const viName = (()=>{
    const r = doc.eventRef; if(!r) return '';
    if(r.titleVi!=null) return r.titleVi || '';
    const ev = (feedEvents||[]).find(e=>e && e.id===r.id);
    return (ev && ev.title_en && ev.title_vi && searchNorm(ev.title_vi).trim()!==searchNorm(ev.title_en).trim()) ? ev.title_vi : '';
  })();
  const subIsVi = !!el.subtitleVi && (el.subtitle||'').trim()!=='';

  return (
    <React.Fragment>
      {el.type==='title' && <Field label="Title text" value={el.text} onChange={v=>update({text:v})} area />}
      {el.type==='title' && viName && !subIsVi &&
        <button className="rs-addrow" title="Put the event's Vietnamese name in the subtitle (replaces what is there)"
          onClick={()=>update({ subtitle:viName, subtitleVi:true })}>＋ Tiếng Việt — “{viName}”</button>}
      {el.type==='title' && subIsVi &&
        <div className="rs-mini" style={{ marginTop:-2, marginBottom:10 }}>Subtitle is the event's Vietnamese name — it follows the feed week to week.{' '}
          <button className="rs-linkbtn" onClick={()=>update({ subtitle:'', subtitleVi:false })}>Remove</button></div>}
      {el.type==='tagline' && <Field label="Tagline" value={el.text} onChange={v=>update({text:v})} area />}
      {el.type==='info' && <React.Fragment>
        <Field label="Info text" value={el.text} onChange={v=>update({text:v})} area />
        <Hint tight>Markdown: <b>**bold**</b>, <i>*italic*</i>, and lines starting with <b>-</b> become bullets. Blank line = a gap.</Hint>
      </React.Fragment>}
      {el.type==='when' && <Field label="When" value={el.text} onChange={v=>update({text:v})} />}
      {el.type==='cost' && <Field label="Cost" value={el.text} onChange={v=>update({text:v})} />}
      {el.type==='stamp' && <Field label="Stamp text" value={el.text} onChange={v=>update({text:v})} />}
      {el.type==='host' && <Field label="Name" value={el.name} onChange={v=>update({name:v})} />}
      {el.type==='ticket' && <TicketContent el={el} update={update} />}
      {el.type==='qr' && <React.Fragment>
        <Field label="Label" value={el.label} onChange={v=>update({label:v})} />
        <Field label="Website" value={el.site} onChange={v=>update({site:v})} />
      </React.Fragment>}
      {el.type==='badge' && <React.Fragment>
        <div className="rs-rowflex">
          <Field label="Top" value={el.top} onChange={v=>update({top:v})} />
          <Field label="Big" value={el.big} onChange={v=>update({big:v})} />
        </div>
        <Field label="Sub" value={el.sub} onChange={v=>update({sub:v})} />
      </React.Fragment>}
      {el.type==='wordmark' &&
        <Hint tight>The canonical REALITY mark — fixed vector letterforms (Montserrat Alternates A/I/Y). Drag a handle or use Width/Height to resize; it scales crisp and never distorts. Recolour below.</Hint>}
      {el.type==='weekly' && <React.Fragment>
        <div className="rs-rowflex">
          <Field label="Price (left)" value={el.price} onChange={v=>update({price:v})} />
          <Field label="Time (right)" value={el.time} onChange={v=>update({time:v})} />
        </div>
        <div className="rs-rowflex">
          <Field label="Above day" value={el.every} onChange={v=>update({every:v})} />
          <Field label="Day" value={el.day} onChange={v=>update({day:v})} />
        </div>
        <Field label="Below day" value={el.allYear} onChange={v=>update({allYear:v})} />
      </React.Fragment>}
      {el.type==='matchup' && <React.Fragment>
        <Field label="Competition / round" value={el.comp} onChange={v=>update({comp:v})} />
        <div className="rs-rowflex">
          <Field label="Team A" value={el.teamA} onChange={v=>update({teamA:v})} />
          <Field label="Team B" value={el.teamB} onChange={v=>update({teamB:v})} />
        </div>
        <div className="rs-rowflex">
          <Field label="Date" value={el.date} onChange={v=>update({date:v})} />
          <Field label="Time" value={el.time} onChange={v=>update({time:v})} />
        </div>
        <Field label="Centre mark" value={el.vs} onChange={v=>update({vs:v})} />
        <Hint tight>Team names auto-fit and stay matched in size. Want flags or crests? Drop in Partner-logo elements over the photo.</Hint>
      </React.Fragment>}
      {caps.list && <React.Fragment>
        <Field label="Heading" value={el.heading} onChange={v=>update({heading:v})} />
        <Slider label="Heading size" val={el.headingSize!=null?el.headingSize:(el.type==='specials'?26:15)} min={11} max={56} step={1} suffix="px" onChange={v=>update({headingSize:v})} />
      </React.Fragment>}
    </React.Fragment>
  );
}

function TypeFold({ el, caps, isText, isOutput, activeLabel, update, dType }){
  // Per-type default tracking, so the slider reads true for elements saved
  // before letter-spacing was configurable (matches the renderer's fallback).
  const lsDefault = (el.type==='when'||el.type==='cost')?0.16 : el.type==='host'?0.02 : el.type==='stamp'?0.04 : el.type==='title'?0.005 : 0;
  // Companion to Align: how far off the aligned edge the text sits. Defaults to
  // the type's baked-in padding, so 0 reads as (and is) flush to the box edge.
  const inset = textInsetModel(el);
  const WEIGHTS = caps.font==='grot' ? WEIGHTS_GROT : WEIGHTS_MONT;
  const defWeight = (AP_DEF[el.type] && AP_DEF[el.type].props.weight) || (caps.font==='grot'?400:700);
  const sizeLabel = 'Font size'+(isOutput?' · '+activeLabel+' only':'');
  return (
        <Fold id="f-type" title="Type" open dirty={dType}>
          {caps.size && <ScaleControl label={sizeLabel} val={el.fontSize} onChange={v=>update({fontSize:v})} />}
          {caps.sizePreset && <Chips label="Size preset" options={[{v:'lg',l:'Large'},{v:'md',l:'Medium'},{v:'sm',l:'Small'}]}
            value={el.fontSize>=40?'lg':el.fontSize>=30?'md':'sm'}
            onChange={v=>update(v==='lg'?{fontSize:46,h:180}:v==='md'?{fontSize:32,h:135}:{fontSize:26,h:90})} />}
          {caps.weight && <Chips label="Weight" options={WEIGHTS} value={el.weight!=null?el.weight:defWeight} onChange={v=>update({weight:v})} />}
          {isText && <Slider label="Letter spacing" val={el.letterSpacing!=null?el.letterSpacing:lsDefault} min={-0.05} max={0.6} step={0.005} onChange={v=>update({letterSpacing:v})} suffix="em" />}
          {caps.lineHeight && <Slider label="Line spacing" val={el.lineHeight!=null?el.lineHeight:caps.lineHeight.def} min={caps.lineHeight.min} max={caps.lineHeight.max} step={0.05} onChange={v=>update({lineHeight:v})} />}
          {/* The renderer lifts a title's line height under Vietnamese stacked
              capitals (see titleLineHeight). Say so, or a slider that stops
              doing anything below 1.08 reads as broken. */}
          {el.type==='title' && titleLineHeight && (()=>{
            const set = el.lineHeight!=null ? el.lineHeight : caps.lineHeight.def;
            const eff = titleLineHeight(el);
            return eff > set + 0.001
              ? <Hint tight>Showing at <b>{eff.toFixed(2)}</b> — the Vietnamese accents (Ấ Ổ Ặ…) need that much room to clear the line above. Your {set.toFixed(2)} is kept and comes back if they go.</Hint>
              : null;
          })()}
          {caps.align && <Chips label="Align" options={[{v:'left',l:'Left'},{v:'center',l:'Center'},{v:'right',l:'Right'}]} value={inset.align} onChange={v=>update({align:v})} />}
          {caps.align && inset.applies &&
            <Slider label={'Edge offset · from the '+inset.side} val={inset.val} min={0} max={inset.max} step={1}
              onChange={v=>update({textInset:v})} suffix="px" />}
          {caps.align && caps.list && <Hint tight>Aligns the heading and row text. Two-column rows (name · time) keep their columns — that spread is the layout.</Hint>}
          {caps.orient && <Chips label="Orientation" options={[{v:'h',l:'Horizontal'},{v:'v',l:'Vertical'}]} value={el.orient||'h'} onChange={v=>update({orient:v})} />}
          {(caps.surface || caps.textColor) && !caps.list &&
            <Swatches label={el.type==='host'?'Name colour':el.type==='wordmark'?'Wordmark colour':el.type==='weekly'?'Bar text colour':'Text colour'} value={el.textColor!=null?el.textColor:el.color}
              onChange={v=>update({textColor:v})} autoTitle="Auto — the readable neutral for this fill (ink, or cream on purple)" />}
        </Fold>
  );
}

function SubtitleFold({ el, isOutput, activeLabel, update, dSub }){
  return (
        <Fold id="f-sub" title="Subtitle" dirty={dSub}>
          <Field label="Subtitle — sits in the title box" value={el.subtitle||''} onChange={v=>update({ subtitle:v, subtitleVi:false })} area />
          {(el.subtitle||'').trim()
            ? <React.Fragment>
                <Chips label="Spacing to title" options={[{v:'tight',l:'Tight'},{v:'snug',l:'Snug'},{v:'roomy',l:'Roomy'},{v:'split',l:'Top / bottom'}]} value={el.subLayout||'snug'} onChange={v=>update({subLayout:v})} />
                <ScaleControl label={'Subtitle size'+(isOutput?' · '+activeLabel+' only':'')} val={el.subSize!=null?el.subSize:30} onChange={v=>update({subSize:v})} />
                <Chips label="Subtitle weight" options={WEIGHTS_MONT} value={el.subWeight||600} onChange={v=>update({subWeight:v})} />
                <Slider label="Subtitle tracking" val={el.subTracking!=null?el.subTracking:0.02} min={-0.05} max={0.6} step={0.005} onChange={v=>update({subTracking:v})} suffix="em" />
                <Swatches label="Subtitle colour" value={el.subColor!=null?el.subColor:'fg'} onChange={v=>update({subColor:v})} autoTitle="Auto — follows the title" />
              </React.Fragment>
            : <div className="rs-mini" style={{ marginTop:-2, marginBottom:10 }}>Add a line to sit under the title, inside the same box.</div>}
        </Fold>
  );
}

function KickerFold({ el, doc, update, dKicker }){
  return (
        <Fold id="f-kicker" title="Kicker" dirty={dKicker}>
          <Field label="Kicker (optional)" value={el.kicker} onChange={v=>update({kicker:v})} />
          <Swatches label="“Hosted by” colour" value={el.kickerColor!=null?el.kickerColor:'fg'} onChange={v=>update({kickerColor:v})} autoTitle="Auto — the poster accent" autoBg={AP_PAL[doc.accent]} />
        </Fold>
  );
}

export { ContentFields, TypeFold, SubtitleFold, KickerFold };
