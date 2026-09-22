/* ============================================================
   REALITY POSTER STUDIO — inspector · list rows
   lineup · specials · sessions · agenda.
   ============================================================ */
import { inkTitle } from '../../../studio-shared/brand.js';
import { INK_CHOICES as AP_INKS, PALETTE as AP_PAL, parseSessions } from '../../studio-data.jsx';
import { Chips, Slider, Fold, Hint, Swatches, WEIGHTS_MONT } from '../controls.jsx';
import { ROW_SIZES } from './caps.js';
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
            <Hint tight>Paste columns split by <b>tabs, dashes or 2+ spaces</b> — date, time, a label and the fixture, in any order. End a line with a symbol (<b>&lt;</b> <b>~</b> …) to tag its category below.</Hint>
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

export { RowsFold };
