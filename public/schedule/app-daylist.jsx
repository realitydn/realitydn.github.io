/* ============================================================
   REALITY SCHEDULE STUDIO — app · the week as a list
   Left column: each day with its events, quick-add, closed days,
   per-day text size, and drag-to-move between days.
   ============================================================ */
import { CAP_COL } from './app-controls.jsx';
import { blankEvent as a_blank, DAY_ABBR as A_DA, rangeDates as a_dates, dayInfo as a_dayInfo,
  DAY_COLORS as A_DC, dShort as a_dshort, eventsOn as a_eventsOn, parseQuickLine as a_quick,
  suid as a_uid, dWeekday as a_wd } from './schedule-data.jsx';

/* ---------- left: the week as a list ---------- */
function DayList({ doc, setDoc, selId, setSelId, capacity, selDate, setSelDate, sizeInfo, setDaySize }){
  const dates = a_dates(doc.range);
  const [quick, setQuick] = React.useState({});
  const [quickErr, setQuickErr] = React.useState(null);

  function addQuick(date){
    const text = (quick[date]||'').trim();
    if(!text) return;
    const p = a_quick(text);
    if(!p){ setQuickErr(date); setTimeout(()=>setQuickErr(null), 1300); return; }
    const ev = Object.assign(a_blank(date), p, { id:a_uid() });
    setDoc(d=>Object.assign({}, d, { events:d.events.concat([ev]) }));
    setQuick(q=>Object.assign({}, q, { [date]:'' }));
    setSelId(ev.id);
  }
  function toggleClosed(date){
    setDoc(d=>{
      const days = Object.assign({}, d.days);
      if(days[date] && days[date].status==='closed') delete days[date];
      else days[date] = { status:'closed', note:'CLOSED' };
      return Object.assign({}, d, { days });
    });
  }
  function setNote(date, note){
    setDoc(d=>Object.assign({}, d, { days:Object.assign({}, d.days, { [date]:{ status:'closed', note } }) }));
  }
  function onDropDay(e, date){
    e.preventDefault();
    const id = e.dataTransfer.getData('text/ev');
    if(!id) return;
    setDoc(d=>Object.assign({}, d, { events:d.events.map(ev=>ev.id===id?Object.assign({},ev,{date}):ev) }));
  }
  return (
    <div className="ss-lib">
      {dates.map(date=>{
        const w = a_wd(date), info = a_dayInfo(doc, date), closed = info.status==='closed';
        const evs = a_eventsOn(doc, date);
        const cap = capacity.byDate[date]||'ok';
        return (
          <div key={date} className={'ss-daysec'+(selDate===date?' sel':'')}
            onDragOver={e=>e.preventDefault()} onDrop={e=>onDropDay(e, date)}>
            <div className="ss-dayhead" onClick={()=>setSelDate(date)}>
              <span className="sq" style={{ background:closed?'transparent':A_DC[w], border:closed?'1.5px solid #4a3d29':'none' }} />
              <span className="nm">{A_DA[w]} <small>{a_dshort(date)}</small></span>
              <span className="ct" style={{ color:CAP_COL[cap]==='#3d3526'?'#6f6553':CAP_COL[cap] }}>
                {closed ? 'closed' : evs.length+' ev'}</span>
              {sizeInfo && sizeInfo.active && !closed && sizeInfo.byDate[date] &&
                (()=>{ const si = sizeInfo.byDate[date]; return (
                  <span className="ss-sizestep" onClick={e=>e.stopPropagation()}
                    title={'Text size '+(si.step+1)+'/'+sizeInfo.steps+' · '+si.px+'px'+(si.isAuto?' (auto)':'')+' — click number to reset to auto'}>
                    <button disabled={si.step<=si.min} onClick={()=>setDaySize(date, Math.max(si.min, si.step-1))}>−</button>
                    <b className={si.isAuto?'':'set'} onClick={()=>setDaySize(date, null)}>{si.step+1}</b>
                    <button disabled={si.step>=si.max} onClick={()=>setDaySize(date, Math.min(si.max, si.step+1))}>＋</button>
                  </span>
                ); })()}
              <button className={'ss-closebtn'+(closed?' on':'')} title={closed?'Reopen this day':'Mark day closed'}
                onClick={e=>{ e.stopPropagation(); toggleClosed(date); }}>⊘</button>
            </div>
            {closed
              ? <input className="ss-input ss-noteinput" value={info.note||''} placeholder="CLOSED FOR…"
                  onChange={e=>setNote(date, e.target.value.toUpperCase())} />
              : <React.Fragment>
                  {evs.map(ev=>(
                    <div key={ev.id} className={'ss-evrow'+(selId===ev.id?' on':'')+(ev._proj?' proj':'')}
                      draggable onDragStart={e=>e.dataTransfer.setData('text/ev', ev.id)}
                      onClick={()=>setSelId(selId===ev.id ? null : ev.id)}>
                      <span className="tm">{ev.start}</span>
                      <span className="tt">{ev.title}</span>
                      {ev.repeat==='weekly' && <span className="rep"
                        title={ev._proj?'Repeats weekly (auto — set on an earlier week)':'Repeats weekly'}>↻</span>}
                      {ev.emphasis!=='none' && <span className="em">{ev.emphasis==='banner'?'▮':'B'}</span>}
                    </div>
                  ))}
                  <input className={'ss-input ss-quickadd'+(quickErr===date?' err':'')}
                    value={quick[date]||''} placeholder="17:00 Event Title 2E *"
                    onChange={e=>setQuick(q=>Object.assign({}, q, { [date]:e.target.value }))}
                    onKeyDown={e=>{ if(e.key==='Enter') addQuick(date); }} />
                </React.Fragment>}
          </div>
        );
      })}
      <div className="ss-mini" style={{ marginTop:10 }}>
        Quick-add speaks the schedule grammar: <b>17:00 - 21:00: Title 1L/2E * $</b>. Enter commits. Drag a row onto another day to move it.
      </div>
    </div>
  );
}

export { DayList };
