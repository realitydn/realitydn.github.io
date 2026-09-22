/* ============================================================
   REALITY SCHEDULE STUDIO — app · the day strip (range bar)
   Moves the range a day or a week at a time (or back to this week),
   drags either end to add / remove days, places carousel splits, and
   says what the app-feed pull is doing.
   ============================================================ */
import { CAP_COL } from './app-controls.jsx';
import { DAY_ABBR as A_DA, dAdd as a_dAdd, rangeDates as a_dates, dayInfo as a_dayInfo,
  DAY_COLORS as A_DC, dShort as a_dshort, DAY_TEXT as A_DT, eventsOn as a_eventsOn,
  normalizeDoc as a_norm, thisMonday as a_thisMonday, dWeekday as a_wd } from './schedule-data.jsx';

/* ---------- day strip — the range slider ---------- */
function DayStrip({ doc, setDoc, capacity, selDate, onPickDate, feedStat, onRetryFeed }){
  const dates = a_dates(doc.range);
  const stripRef = React.useRef(null);

  function setRange(start, days){
    /* changing the week (or its length) wipes per-day size tweaks back to the auto default */
    setDoc(d=>a_norm(Object.assign({}, d, { range:{ start, days:Math.max(1, Math.min(10, days)) }, sizing:{} })));
  }
  /* drag a grip: quantize horizontal movement by chip width */
  function gripDrag(e, side){
    e.preventDefault(); e.stopPropagation();
    const chipW = stripRef.current ? (stripRef.current.firstChild ? stripRef.current.firstChild.offsetWidth+10 : 74) : 74;
    const x0 = e.clientX, r0 = Object.assign({}, doc.range);
    function mv(ev){
      const n = Math.round((ev.clientX - x0)/chipW);
      if(side==='L'){ const days = r0.days - n; if(days>=1 && days<=10) setRange(a_dAdd(r0.start, n), days); }
      else { const days = r0.days + n; if(days>=1 && days<=10) setRange(r0.start, days); }
    }
    function up(){ window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }
  function toggleSplit(date){
    setDoc(d=>{
      const has = d.splits.indexOf(date)>=0;
      const splits = has ? d.splits.filter(s=>s!==date) : d.splits.concat([date]).sort();
      return Object.assign({}, d, { splits });
    });
  }
  return (
    <div className="ss-stripbar">
      <button className="ss-iconbtn" title="Back one week" onClick={()=>setRange(a_dAdd(doc.range.start,-7), doc.range.days)}>«</button>
      <button className="ss-iconbtn" title="Back one day" onClick={()=>setRange(a_dAdd(doc.range.start,-1), doc.range.days)}>‹</button>
      <div className="ss-grip" title="Drag to move the start day" onPointerDown={e=>gripDrag(e,'L')} />
      <div className="ss-strip" ref={stripRef}>
        {dates.map((date,i)=>{
          const w = a_wd(date), closed = a_dayInfo(doc, date).status==='closed';
          const cap = capacity.byDate[date]||'ok';
          const n = a_eventsOn(doc, date).length;
          return (
            <React.Fragment key={date}>
              <div className={'ss-chipday'+(selDate===date?' sel':'')+(closed?' closed':'')}
                style={{ background:closed?'transparent':A_DC[w], color:closed?'#b6ab97':A_DT[w],
                  borderColor:closed?'#4a3d29':A_DC[w] }}
                onClick={()=>onPickDate(date)} title={date + (closed?' · closed':' · '+n+' events')}>
                <span className="da">{A_DA[w]}</span>
                <span className="dn">{a_dshort(date)}</span>
                <span className="dot" style={{ background:CAP_COL[cap], opacity:cap==='ok'?0.35:1 }} />
              </div>
              {i<dates.length-1 &&
                <div className={'ss-gap'+(doc.splits.indexOf(date)>=0?' on':'')}
                  title={doc.splits.indexOf(date)>=0?'Remove carousel split':'Split the carousel after '+A_DA[w]}
                  onClick={()=>toggleSplit(date)}>
                  <span /></div>}
            </React.Fragment>
          );
        })}
      </div>
      <div className="ss-grip" title="Drag to add / remove days at the end" onPointerDown={e=>gripDrag(e,'R')} />
      <button className="ss-iconbtn" title="Forward one day" onClick={()=>setRange(a_dAdd(doc.range.start,1), doc.range.days)}>›</button>
      <button className="ss-iconbtn" title="Forward one week" onClick={()=>setRange(a_dAdd(doc.range.start,7), doc.range.days)}>»</button>
      <button className="ss-iconbtn" disabled={doc.range.start===a_thisMonday()}
        title="Jump to the current week (Mon–Sun, Đà Nẵng time)"
        onClick={()=>setRange(a_thisMonday(), doc.range.days)}>This week</button>
      <span className="ss-striplab">{doc.range.days} day{doc.range.days===1?'':'s'} · click a gap to split the carousel</span>
      {/* App-feed status. Every range change re-pulls; a failure is said out loud
          here (never a modal — the week you already have stays fully editable). */}
      {feedStat && feedStat.state==='loading' && <span className="ss-feedstat">Pulling the app feed…</span>}
      {feedStat && feedStat.state==='empty' && <span className="ss-feedstat">No app events in this range</span>}
      {feedStat && feedStat.state==='error' &&
        <span className="ss-feedstat err" role="status">
          Couldn’t reach the REALITY feed — app events may be out of date.
          <button className="ss-iconbtn" onClick={onRetryFeed}>Retry</button>
        </span>}
    </div>
  );
}

export { DayStrip };
