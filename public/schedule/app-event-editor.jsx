/* ============================================================
   REALITY SCHEDULE STUDIO — app · the event editor
   The inspector when an event is selected: title, times, rooms, flags,
   emphasis, hide-on, weekly repeat and skipped weeks, duplicate, delete.
   ============================================================ */
import { confirmDelete, SField, SChips } from './app-controls.jsx';
import { DAY_ABBR as A_DA, rangeDates as a_dates, deleteEventFromDoc as a_delEvent, dShort as a_dshort,
  LOCATIONS as A_LOCS, suid as a_uid, dWeekday as a_wd, DAY_FULL } from './schedule-data.jsx';
import { CHANNELS as A_CH } from './schedule-render.jsx';

/* ---------- inspector: the selected event ---------- */
function EventEditor({ doc, setDoc, sel, setSelId }){
  function update(patch){
    setDoc(d=>Object.assign({}, d, { events:d.events.map(e=>e.id===sel.id?Object.assign({},e,patch):e) }));
  }
  function normTime(v, old){
    const m = /^(\d{1,2})[:.](\d{2})$/.exec((v||'').trim());
    if(!m) return old;
    return ((m[1].length<2?'0':'')+m[1])+':'+m[2];
  }
  const dates = a_dates(doc.range);
  return (
    <React.Fragment>
      <div className="ss-sech">Event</div>
      <div className="ss-actions">
        <button className="ss-iconbtn" onClick={()=>{
          const c = Object.assign(JSON.parse(JSON.stringify(sel)), { id:a_uid(), exceptions:[], notionId:null, seriesId:null });
          setDoc(d=>Object.assign({}, d, { events:d.events.concat([c]) })); setSelId(c.id);
        }}>Duplicate</button>
        <button className="ss-iconbtn ss-del" onClick={()=>{
          if(!confirmDelete(sel)) return;
          setDoc(d=>a_delEvent(d, sel.id)); setSelId(null);
        }}>{sel.repeat==='weekly'?'Delete series':'Delete'}</button>
      </div>
      <SField label="Title" value={sel.title} onChange={v=>update({ title:v })} area />
      <SField label="Short title (used when space is tight)" value={sel.titleShort||''} ph="optional"
        onChange={v=>update({ titleShort:v||null })} />
      <div className="ss-row">
        <div className="ss-lab">{sel.repeat==='weekly'?'Weekday (anchor)':'Day'}</div>
        <select className="ss-input" value={sel.date} onChange={e=>update({ date:e.target.value })}>
          {dates.indexOf(sel.date)<0 &&
            <option value={sel.date}>{A_DA[a_wd(sel.date)]} {a_dshort(sel.date)} · earlier week</option>}
          {dates.map(d=><option key={d} value={d}>{A_DA[a_wd(d)]} {a_dshort(d)}</option>)}
        </select>
      </div>
      <div className="ss-rowflex">
        <div className="ss-row" style={{ flex:1 }}>
          <div className="ss-lab">Start</div>
          <input className="ss-input" defaultValue={sel.start} key={sel.id+'s'+sel.start}
            onBlur={e=>update({ start:normTime(e.target.value, sel.start) })} />
        </div>
        <div className="ss-row" style={{ flex:1 }}>
          <div className="ss-lab">End</div>
          <input className="ss-input" defaultValue={sel.end&&sel.end!=='late'?sel.end:''} key={sel.id+'e'+(sel.end||'')}
            placeholder={sel.end==='late'?'ALL NIGHT':'—'} disabled={sel.end==='late'}
            onBlur={e=>{ const v=e.target.value.trim(); update({ end: v? normTime(v, sel.end==='late'?null:sel.end) : null }); }} />
        </div>
      </div>
      <SChips options={[{v:false,l:'Ends quietly'},{v:true,l:'ALL NIGHT'}]} value={sel.end==='late'}
        onChange={v=>update({ end: v?'late':null })} />
      <SChips label="Locations" multi options={A_LOCS.map(l=>({v:l.code,l:l.code}))}
        value={sel.locations} onChange={v=>update({ locations:v })} />
      <SChips label="Flags" multi
        options={[{v:'prereg',l:'* Pre-reg'},{v:'fee',l:'$ Fee'}]}
        value={[sel.flags.prereg?'prereg':null, sel.flags.fee?'fee':null].filter(Boolean)}
        onChange={v=>update({ flags:{ prereg:v.indexOf('prereg')>=0, fee:v.indexOf('fee')>=0 } })} />
      <SChips label="Emphasis" options={[{v:'none',l:'None'},{v:'bold',l:'Bold'},{v:'banner',l:'Banner'}]}
        value={sel.emphasis} onChange={v=>update({ emphasis:v })} />
      <SChips label="Hide on" multi options={A_CH.map(c=>({v:c.id,l:c.label}))}
        value={sel.hide||[]} onChange={v=>update({ hide:v })} />
      <SChips label="Repeat" options={[{v:'none',l:'One-off'},{v:'weekly',l:'↻ Weekly'}]}
        value={sel.repeat==='weekly'?'weekly':'none'}
        onChange={v=> v==='weekly' ? update({ repeat:'weekly' })
          : update({ repeat:null, exceptions:[], repeatUntil:null })} />
      {sel.repeat==='weekly' && (()=>{
        const occ = dates.filter(d=>a_wd(d)===a_wd(sel.date) && d>=sel.date)[0] || null;
        const exc = sel.exceptions||[];
        const skipped = !!occ && exc.indexOf(occ)>=0;
        return (
          <React.Fragment>
            <div className="ss-mini" style={{ marginTop:-4 }}>
              Shows on every <b>{DAY_FULL[a_wd(sel.date)]}</b> from {a_dshort(sel.date)} onward —
              in every week you open, on every channel and export. Switch back to One-off to drop all future copies at once.
            </div>
            {occ &&
              <div className="ss-actions" style={{ marginTop:-2 }}>
                <button className="ss-iconbtn" onClick={()=>update({ exceptions:
                  skipped ? exc.filter(d=>d!==occ) : exc.concat([occ]).sort() })}>
                  {skipped ? '↻ Restore '+a_dshort(occ) : '⊘ Skip the week of '+a_dshort(occ)}
                </button>
                {exc.length>0 &&
                  <button className="ss-iconbtn" onClick={()=>update({ exceptions:[] })}>
                    Clear {exc.length} skip{exc.length===1?'':'s'}</button>}
              </div>}
          </React.Fragment>
        );
      })()}
      <div className="ss-mini">Banner is the anniversary-party treatment — one per week reads loud.</div>
      {sel.notionId && <div className="ss-mini" style={{ marginTop:8 }}>
        From the REALITY app — the title, time, place and flags follow the app on every sync.
        Short title, emphasis, hide-on, end time and skipped weeks are yours and stick
        {sel.seriesId ? ' to the whole series, week after week' : ''}.</div>}
      <div className="ss-mini" style={{ marginTop:8 }}>Click the row again, press Esc, or click the canvas to deselect. Delete / Backspace removes the event (when not typing in a field); a weekly series asks first. Ctrl+Z undoes.</div>
    </React.Fragment>
  );
}

export { EventEditor };
