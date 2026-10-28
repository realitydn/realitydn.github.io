/* ============================================================
   REALITY POSTER STUDIO — inspector · list rows
   lineup · specials · sessions · agenda.
   ============================================================ */
import { inkTitle } from '../../../studio-shared/brand.js';
import { INK_CHOICES as AP_INKS, PALETTE as AP_PAL, parseSessions } from '../../studio-data.jsx';
import { Chips, Slider, Fold, Hint, Swatches, WEIGHTS_MONT, WEIGHTS_GROT } from '../controls.jsx';
import { ROW_SIZES } from './caps.js';
import { RUI } from '../../../studio-shared/studio-ui.jsx';
import { FX_AMOUNTS, FX_HINTS } from '../../elements/title-fx.jsx';
import { HL_ROW, HL_PARTY, HL_SCALES, HL_USES, HL_HINTS, hlKind, hlScale } from '../../elements/session-hl.jsx';
import { TIME_LAYOUTS, TIME_RANGES, timeLayout, timeRatio, timeWeight } from '../../elements/session-time.js';
function RowsFold({ el, update, dRows }){
  const setItems = (items)=>update({ items });
  return (
        <Fold id="f-rows" title="Rows" open dirty={dRows}>
          {(el.type==='lineup'||el.type==='specials') && <React.Fragment>
            <div className="rs-lab">Items</div>
            {el.items.map((it,i)=>(
              <div className="rs-itemrow" key={i}>
                <input className="rs-input" value={el.type==='lineup'?it.n:it.l}
                  onChange={e=>{ const items=el.items.slice(); items[i]=el.type==='lineup'?{...it,n:e.target.value}:{...it,l:e.target.value}; setItems(items); }} />
                <input className="rs-input" style={{ maxWidth:80 }} value={el.type==='lineup'?it.t:it.p}
                  onChange={e=>{ const items=el.items.slice(); items[i]=el.type==='lineup'?{...it,t:e.target.value}:{...it,p:e.target.value}; setItems(items); }} />
                <button onClick={()=>setItems(el.items.filter((_,j)=>j!==i))}>×</button>
              </div>
            ))}
            <button className="rs-addrow" onClick={()=>setItems([...el.items, el.type==='lineup'?{n:'New act',t:'00:00'}:{l:'Item',p:'₫0'}])}>+ Add row</button>
            <div style={{ height:10 }} />
          </React.Fragment>}
          {el.type==='sessions' && <React.Fragment>
            <div className="rs-row">
              <div className="rs-lab">Sessions — one per line</div>
              <textarea className="rs-area" style={{ minHeight:160 }} value={el.raw} spellCheck={false}
                placeholder={'001 — Session title — 3.6.26'}
                onChange={e=>update({ raw:e.target.value })} />
            </div>
            <Hint tight>Paste columns split by <b>tabs, dashes or 2+ spaces</b> — date, time, a label and the fixture, in any order. A time can be a range (<b>20:00 - 22:00</b>, <b>21:00–late</b>). End a line with a symbol (<b>&lt;</b> <b>~</b> …) to tag its category below; start one with <b>!</b> to highlight it.</Hint>
          </React.Fragment>}
          {el.type==='agenda' && <React.Fragment>
            <div className="rs-lab">Days — colour follows the weekday</div>
            {el.items.map((it,i)=>(
              <div key={i} style={{ marginBottom:8, paddingBottom:8, borderBottom:'1px solid rgba(120,110,90,.14)' }}>
                <div className="rs-itemrow">
                  <input className="rs-input" style={{ maxWidth:104 }} placeholder="Day" value={it.day||''}
                    onChange={e=>{ const items=el.items.slice(); items[i]={...it,day:e.target.value}; setItems(items); }} />
                  <input className="rs-input" placeholder="Event" value={it.name||''}
                    onChange={e=>{ const items=el.items.slice(); items[i]={...it,name:e.target.value}; setItems(items); }} />
                  <input className="rs-input" style={{ maxWidth:64 }} placeholder="Time" value={it.time||''}
                    onChange={e=>{ const items=el.items.slice(); items[i]={...it,time:e.target.value}; setItems(items); }} />
                  <button onClick={()=>setItems(el.items.filter((_,j)=>j!==i))}>×</button>
                </div>
                <input className="rs-input" style={{ marginTop:4, width:'100%' }} placeholder="Description (optional)" value={it.desc||''}
                  onChange={e=>{ const items=el.items.slice(); items[i]={...it,desc:e.target.value}; setItems(items); }} />
              </div>
            ))}
            <button className="rs-addrow" onClick={()=>setItems([...el.items, {day:'Monday',name:'New event',time:'19:00',desc:''}])}>+ Add day</button>
            <Hint tight>Each day auto-colours by the weekly schedule — <b>Mon</b> green · <b>Tue</b> blue · <b>Wed</b> purple · <b>Thu</b> pink · <b>Fri</b> red · <b>Sat</b> amber · <b>Sun</b> yellow.</Hint>
            <div style={{ height:6 }} />
          </React.Fragment>}
          <Chips label="Row size" options={ROW_SIZES} value={el.rowSize||0} onChange={v=>update({rowSize:v})} />
          <Chips label="Row weight" options={WEIGHTS_MONT} value={el.rowWeight||700} onChange={v=>update({rowWeight:v})} />
          <Slider label="Row tracking" val={el.rowTracking!=null?el.rowTracking:(el.type==='specials'?0.03:0.01)} min={-0.05} max={0.4} step={0.005} suffix="em" onChange={v=>update({rowTracking:v})} />
          <Slider label="Line spacing" val={el.rowGap!=null?el.rowGap:(el.type==='specials'?5:7)} min={0} max={24} step={1} suffix="px" onChange={v=>update({rowGap:v})} />
          <Swatches label="Row text colour" value={el.textColor!=null?el.textColor:el.color} onChange={v=>update({textColor:v})} autoTitle="Auto — stays readable on the surface" />
          {el.type==='sessions' && (()=>{
            const marks = parseSessions(el.raw).reduce((a,r)=>{ if(r.marker && a.indexOf(r.marker)<0) a.push(r.marker); return a; }, []);
            if(!marks.length) return <Hint>Tip: end a line with a symbol — <b>&lt;</b>, <b>~</b>, <b>^</b>, <b>●</b> — to tag it. Name + colour the categories here once they appear, and rows get a dot + a legend.</Hint>;
            const DEFCAT=['blue','green','pink','amber','purple','red','yellow'];
            return <React.Fragment>
              <div className="rs-lab" style={{ marginTop:8 }}>Categories — line-end markers</div>
              {marks.map(m=>{
                const k=(el.markerKey&&el.markerKey[m])||{};
                const setK=(patch)=>update({ markerKey: Object.assign({}, el.markerKey||{}, { [m]: Object.assign({}, k, patch) }) });
                const cur=k.color||DEFCAT[marks.indexOf(m)%7];
                return <div key={m} style={{ marginBottom:8 }}>
                  <div className="rs-itemrow">
                    <span style={{ flex:'none', width:24, textAlign:'center', fontFamily:'Montserrat', fontWeight:800 }}>{m}</span>
                    <input className="rs-input" placeholder="Name (e.g. Projector)" value={k.name||''} onChange={e=>setK({name:e.target.value})} />
                  </div>
                  <div className="rs-swatches" style={{ marginTop:4 }}>
                    {AP_INKS.map(a=>(<div key={a} className={'rs-sw'+(cur===a?' on':'')} title={inkTitle(a)} style={{ background:AP_PAL[a] }} onClick={()=>setK({color:a})} />))}
                  </div>
                </div>;
              })}
            </React.Fragment>;
          })()}
        </Fold>
  );
}

/* ---- the Sessions highlight (elements/session-hl.jsx) ----
   A "!" at the start of a line marks the row; the stars here just add or
   remove that "!", so the textarea stays the one source of truth. Closed
   unless a row is marked, like the title's party effect. */
function SessionHlFold({ el, doc, update }){
  const rows = parseSessions(el.raw);
  const on = rows.filter(r=>r.hl).length;
  const toggle = (li)=>{
    RUI.setFold('f-hl', true);   // un-starring the last row mustn't fold the panel shut under the cursor
    const lines = String(el.raw||'').split('\n');
    const t = lines[li], lead = t.match(/^\s*/)[0], body = t.slice(lead.length);
    lines[li] = lead + (body[0]==='!' ? body.slice(1).replace(/^\s+/, '') : '!'+body);
    update({ raw:lines.join('\n') });
  };
  const kind = hlKind(el), uses = HL_USES[kind] || {};
  const label = ([].concat(HL_ROW, HL_PARTY).find(x=>x.v===kind)||{}).l;
  return (
    <Fold id="f-hl" title="Highlight" badge={on ? label : null} dirty={on?1:0}>
      <div className="rs-lab">Rows — star the ones to call out</div>
      {rows.map(r=>(
        <div className="rs-itemrow" key={r.line}>
          <button onClick={()=>toggle(r.line)} title={r.hl ? 'Remove the highlight' : 'Highlight this row'}
            style={r.hl ? { background:AP_PAL[doc.accent], borderColor:AP_PAL[doc.accent], color:'#fff' } : null}>{r.hl ? '★' : '☆'}</button>
          <span style={{ flex:'1 1 auto', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:r.hl?1:.7 }}>
            {r.title || r.num || r.date || r.time}{r.time ? <span style={{ opacity:.6 }}>{'  ·  '+r.time}</span> : null}</span>
        </div>
      ))}
      {!rows.length && <Hint tight>Add rows under Rows first.</Hint>}
      {on>0 && <React.Fragment>
        <div style={{ height:6 }} />
        <Chips label="Row" options={HL_ROW} value={kind} onChange={v=>update({ hlFx:v })} />
        <Chips label="Party" options={HL_PARTY} value={kind} onChange={v=>update({ hlFx:v })} />
        <Chips label="Size" options={HL_SCALES} value={hlScale(el)} onChange={v=>update({ hlScale:v })} />
        <Chips label="Amount" options={FX_AMOUNTS} value={el.hlAmt||'bold'} onChange={v=>update({ hlAmt:v })} />
        {uses.a && <Swatches label="First ink" value={el.hlInk||'fg'} onChange={v=>update({ hlInk:v==='fg'?null:v })}
          autoTitle="Auto — the list’s fill (the poster accent); its partner on an Accent box" autoBg={AP_PAL[doc.accent]} />}
        {uses.b && <Swatches label="Second ink" value={el.hlInk2||'fg'} onChange={v=>update({ hlInk2:v==='fg'?null:v })}
          autoTitle="Auto — the first ink’s partner" />}
        <Hint tight>{HL_HINTS[kind] || FX_HINTS[kind]} Inks are picked against the box, like the title’s party effects.</Hint>
      </React.Fragment>}
      {!on && rows.length>0 && <Hint tight>Or start a line with <b>!</b> in the Rows list.</Hint>}
    </Fold>
  );
}

/* ---- the Sessions time (elements/session-time.js) ----
   Where the time sits and how loud it is. Only shown once a row has a
   time. Picking a layout clears the size, so each one comes up at the size
   it was drawn for; the slider then takes it from there. */
const TIME_KEYS = ['timeLayout','timeRange','timeSize','timeWeight','timeColor'];
function SessionTimeFold({ el, doc, update }){
  const rows = parseSessions(el.raw);
  if(!rows.some(r=>r.time)) return null;
  const tl = timeLayout(el);
  const set = TIME_KEYS.filter(k=>el[k]!=null && el[k]!=='').length;
  return (
    <Fold id="f-time" title="Time" badge={tl!=='meta' ? (TIME_LAYOUTS.find(x=>x.v===tl)||{}).l : null} dirty={set}>
      <Chips label="Place" options={TIME_LAYOUTS} value={tl} onChange={v=>update({ timeLayout:v==='meta'?null:v, timeSize:null })} />
      <Chips label="Range" options={TIME_RANGES} value={el.timeRange||'full'} onChange={v=>update({ timeRange:v==='full'?null:v })} />
      <Slider label="Time size" val={timeRatio(el)} min={0.35} max={1.5} step={0.05} suffix="×" onChange={v=>update({ timeSize:v })} />
      <Chips label="Time weight" options={WEIGHTS_GROT} value={timeWeight(el)} onChange={v=>update({ timeWeight:v })} />
      <Swatches label="Time colour" value={el.timeColor||'fg'} onChange={v=>update({ timeColor:v==='fg'?null:v })}
        autoTitle={tl==='meta' ? 'Auto — the muted line under the title' : 'Auto — the accent (the row’s text on a Band or Ticket highlight)'} autoBg={tl==='meta' ? null : AP_PAL[doc.accent]} />
      <Hint tight>{(TIME_LAYOUTS.find(x=>x.v===tl)||{}).t}. Size is a multiple of the row’s title, so it follows Row size and the highlight.</Hint>
      {set>0 && <button className="rs-addrow" onClick={()=>update({ timeLayout:null, timeRange:null, timeSize:null, timeWeight:null, timeColor:null })}>Reset time</button>}
    </Fold>
  );
}

export { RowsFold, SessionHlFold, SessionTimeFold };
