/* ============================================================
   REALITY SCHEDULE STUDIO — app shell
   Day strip (range + splits) · day list editor · channel
   previews · inspector · import (paste/CSV) · export pipeline.
   ============================================================ */
const { CHANNELS:A_CH, channelById:a_ch, computeCapacity:a_cap, PartCanvas:APart,
        partCount:a_partCount, partSize:a_partSize,
        DAY_COLORS:A_DC, DAY_TEXT:A_DT, DAY_ABBR:A_DA, LOCATIONS:A_LOCS,
        rangeDates:a_dates, rangeLabel:a_rangeLabel, dAdd:a_dAdd, dWeekday:a_wd, dShort:a_dshort,
        eventsOn:a_eventsOn, dayInfo:a_dayInfo, blankEvent:a_blank, suid:a_uid,
        parseQuickLine:a_quick, parsePasteBlock:a_paste, parseCSV:a_csv, serializeCSV:a_serCSV,
        buildDocFromFeed:a_buildFeed, mergeFeedIntoDoc:a_mergeFeed,
        normalizeDoc:a_norm, newDoc:a_new, starterDoc:a_starter, loadStoredDoc:a_load, storeDoc:a_store } = window;

const CAP_COL = { ok:'#3d3526', tight:'#fdb515', over:'#ed2224' };

function dl(href, name){ const a=document.createElement('a'); a.href=href; a.download=name; document.body.appendChild(a); a.click(); a.remove(); }
function dlBlob(blob, name){ const u=URL.createObjectURL(blob); dl(u, name); setTimeout(()=>URL.revokeObjectURL(u), 4000); }

/* ---------- small controls ---------- */
function SField({ label, value, onChange, area, ph }){
  return (
    <div className="ss-row">
      {label && <div className="ss-lab">{label}</div>}
      {area
        ? <textarea className="ss-area" value={value||''} placeholder={ph||''} onChange={e=>onChange(e.target.value)} />
        : <input className="ss-input" value={value||''} placeholder={ph||''} onChange={e=>onChange(e.target.value)} />}
    </div>
  );
}
function SChips({ label, options, value, onChange, multi }){
  const isOn = v => multi ? (value||[]).indexOf(v)>=0 : value===v;
  const flip = v => { if(!multi) return onChange(v);
    const cur = value||[]; onChange(isOn(v) ? cur.filter(x=>x!==v) : cur.concat([v])); };
  return (
    <div className="ss-row">
      {label && <div className="ss-lab">{label}</div>}
      <div className="ss-chips">
        {options.map(o=>(
          <button key={String(o.v)} className={'ss-chip'+(isOn(o.v)?' on':'')} onClick={()=>flip(o.v)}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------- day strip — the range slider ---------- */
function DayStrip({ doc, setDoc, capacity, selDate, onPickDate }){
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
      <span className="ss-striplab">{doc.range.days} day{doc.range.days===1?'':'s'} · click a gap to split the carousel</span>
    </div>
  );
}

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

/* ---------- inspector ---------- */
function Inspector({ doc, setDoc, sel, setSelId, channelId, sizeInfo, setBaseSize, resetSizes, dailyVariant, coverInfo, dailyInfo }){
  function update(patch){
    setDoc(d=>Object.assign({}, d, { events:d.events.map(e=>e.id===sel.id?Object.assign({},e,patch):e) }));
  }
  function normTime(v, old){
    const m = /^(\d{1,2})[:.](\d{2})$/.exec((v||'').trim());
    if(!m) return old;
    return ((m[1].length<2?'0':'')+m[1])+':'+m[2];
  }
  if(sel){
    const dates = a_dates(doc.range);
    return (
      <React.Fragment>
        <div className="ss-sech">Event</div>
        <div className="ss-actions">
          <button className="ss-iconbtn" onClick={()=>{
            const c = Object.assign(JSON.parse(JSON.stringify(sel)), { id:a_uid(), exceptions:[], notionId:null });
            setDoc(d=>Object.assign({}, d, { events:d.events.concat([c]) })); setSelId(c.id);
          }}>Duplicate</button>
          <button className="ss-iconbtn ss-del" onClick={()=>{
            setDoc(d=>Object.assign({}, d, { events:d.events.filter(e=>e.id!==sel.id) })); setSelId(null);
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
                Shows on every <b>{window.DAY_FULL[a_wd(sel.date)]}</b> from {a_dshort(sel.date)} onward —
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
        <div className="ss-mini" style={{ marginTop:8 }}>Click the row again, press Esc, or click the canvas to deselect. Delete / Backspace removes the event (when not typing in a field).</div>
      </React.Fragment>
    );
  }
  /* document settings */
  const setStyle = patch => setDoc(d=>Object.assign({}, d, { style:Object.assign({}, d.style, patch) }));
  const setCover = patch => setDoc(d=>Object.assign({}, d, { cover:Object.assign({ layout:'banner', sizeOffset:0, cols:'auto', titles:'wrap' }, d.cover, patch) }));
  const setDaily = patch => setDoc(d=>Object.assign({}, d, { daily:Object.assign({ story:0, feed:0 }, d.daily, patch) }));
  return (
    <React.Fragment>
      <div className="ss-sech">Layout</div>
      <div className="ss-chips">
        {window.LOOKS_LIST.map(lk=>(
          <button key={lk.id} className={'ss-chip'+((doc.style.look||'ledger')===lk.id?' on':'')}
            title={lk.hint} onClick={()=>setStyle({ look:lk.id })}>{lk.l}</button>
        ))}
      </div>
      <div className="ss-sech">Palette</div>
      <div className="ss-styles">
        {window.PALETTES.map(p=>{
          const on = (doc.style.theme||'day')===p.id;
          return (
            <button key={p.id} className={'ss-style'+(on?' on':'')} title={p.note}
              onClick={()=>setStyle({ theme:p.id })}>
              <span className="sw" style={{ background:p.sw.bg }}>
                {p.sw.a.map((c,i)=><i key={i} style={{ background:c }} />)}
              </span>
              <span className="nm">{p.name}</span>
            </button>
          );
        })}
      </div>
      <div className="ss-mini" style={{ marginBottom:12 }}>Layout + palette apply to the whole week, every output. Print always renders on white.</div>
      {sizeInfo && sizeInfo.active &&
        <React.Fragment>
          <div className="ss-sech">Text size · {channelId==='stories'?'Stories':'Feed'}</div>
          <div className="ss-sizebar">
            <button className="ss-iconbtn" disabled={sizeInfo.baseStep<=0}
              title="Smaller — whole week" onClick={()=>setBaseSize(Math.max(0, sizeInfo.baseStep-1))}>−</button>
            <span className="ss-sizebig">{sizeInfo.baseStep+1}<small>/{sizeInfo.steps}</small></span>
            <button className="ss-iconbtn" disabled={sizeInfo.baseStep>=sizeInfo.uniformMax}
              title="Bigger — whole week" onClick={()=>setBaseSize(Math.min(sizeInfo.uniformMax, sizeInfo.baseStep+1))}>＋</button>
            <button className="ss-iconbtn" disabled={!sizeInfo.hasOverrides}
              title="Back to the auto comfort default" onClick={resetSizes}>Auto</button>
          </div>
          <div className="ss-mini" style={{ marginBottom:10 }}>
            {sizeInfo.base==='auto' ? <b>Auto.</b> : <b>Custom.</b>} Every day starts at the biggest size that still sits easy in your busiest day. Nudge the whole week here, or any single day in the list on the left. Per-day tweaks reset when you add or remove days.
          </div>
        </React.Fragment>}
      {channelId==='daily' && dailyVariant!=='cover' &&
        <React.Fragment>
          <div className="ss-sech">Daily card · {dailyVariant==='story'?'9:16 Story':'4:5 Feed'}</div>
          <div className="ss-row">
            <div className="ss-lab"><span>Text size</span><span>{dailyInfo ? dailyInfo.px+'px' : ''}</span></div>
            <div className="ss-sizebar">
              <button className="ss-iconbtn" disabled={dailyInfo && dailyInfo.atMin}
                title="Smaller" onClick={()=>setDaily({ [dailyVariant]:(((doc.daily&&doc.daily[dailyVariant])|0))-1 })}>−</button>
              <span className="ss-sizebig">{(((doc.daily&&doc.daily[dailyVariant])|0))===0?'Auto':((doc.daily[dailyVariant]>0?'+':'')+doc.daily[dailyVariant])}</span>
              <button className="ss-iconbtn" disabled={dailyInfo && dailyInfo.atMax}
                title="Bigger" onClick={()=>setDaily({ [dailyVariant]:(((doc.daily&&doc.daily[dailyVariant])|0))+1 })}>＋</button>
              <button className="ss-iconbtn" disabled={(((doc.daily&&doc.daily[dailyVariant])|0))===0}
                title="Back to auto-fit" onClick={()=>setDaily({ [dailyVariant]:0 })}>Auto</button>
            </div>
          </div>
          <div className="ss-mini" style={{ marginBottom:10 }}>
            Daily cards size independently of the weekly schedules — the 9:16 story runs large by default. This adjusts only the {dailyVariant==='story'?'9:16 story':'4:5 feed'}.
          </div>
        </React.Fragment>}
      {channelId==='daily' && dailyVariant==='cover' &&
        <React.Fragment>
          <div className="ss-sech">FB Cover</div>
          <div className="ss-lab" style={{ marginBottom:6 }}>Cover style</div>
          <div className="ss-chips" style={{ marginBottom:12 }}>
            {window.COVER_STYLES.map(cs=>(
              <button key={cs.id} className={'ss-chip'+(((doc.cover&&doc.cover.layout)||'banner')===cs.id?' on':'')}
                onClick={()=>setCover({ layout:cs.id })}>{cs.name}</button>
            ))}
          </div>
          <div className="ss-row">
            <div className="ss-lab"><span>Text size</span><span>{coverInfo ? coverInfo.px+'px' : ''}</span></div>
            <div className="ss-sizebar">
              <button className="ss-iconbtn" disabled={(doc.cover.sizeOffset||0)<=-5}
                title="Smaller" onClick={()=>setCover({ sizeOffset:(doc.cover.sizeOffset||0)-1 })}>−</button>
              <span className="ss-sizebig">{(doc.cover.sizeOffset||0)===0?'Auto':((doc.cover.sizeOffset>0?'+':'')+doc.cover.sizeOffset)}</span>
              <button className="ss-iconbtn" disabled={(doc.cover.sizeOffset||0)>=5}
                title="Bigger" onClick={()=>setCover({ sizeOffset:(doc.cover.sizeOffset||0)+1 })}>＋</button>
              <button className="ss-iconbtn" disabled={(doc.cover.sizeOffset||0)===0}
                title="Back to auto-fit" onClick={()=>setCover({ sizeOffset:0 })}>Auto</button>
            </div>
          </div>
          <SChips label="Columns" options={[{v:'auto',l:'Auto'},{v:1,l:'1'},{v:2,l:'2'}]}
            value={doc.cover.cols||'auto'} onChange={v=>setCover({ cols:v })} />
          <SChips label="Long titles" options={[{v:'wrap',l:'Wrap'},{v:'short',l:'Short'},{v:'crop',l:'Crop'}]}
            value={doc.cover.titles||'wrap'} onChange={v=>setCover({ titles:v })} />
          <div className="ss-mini" style={{ marginBottom:10 }}>
            <b>Wrap</b> shows full titles on two lines — nothing is cropped. <b>Short</b> uses each event's short title; <b>Crop</b> is one line with an ellipsis. Size auto-fits the previewed day; nudge it bigger or smaller here.
          </div>
        </React.Fragment>}
      <div className="ss-sech">Header</div>
      <SField label="Title" value={doc.header.title}
        onChange={v=>setDoc(d=>Object.assign({}, d, { header:{ title:v } }))} />
      <div className="ss-sech">Footer</div>
      <SChips label="Support note" options={[{v:true,l:'Show'},{v:false,l:'Hide'}]}
        value={doc.footer.supportNote}
        onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { supportNote:v }) }))} />
      {doc.footer.supportNote &&
        <SField value={doc.footer.supportText} area
          onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { supportText:v }) }))} />}
      <SChips label="Footer density" options={[{v:'auto',l:'Auto'},{v:'full',l:'Full'},{v:'compact',l:'Compact'},{v:'minimal',l:'Minimal'}]}
        value={doc.footer.density||'auto'}
        onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { density:v }) }))} />
      <div className="ss-mini" style={{ marginBottom:10 }}>Auto compacts the footer only when a heavy week needs the room.</div>
      <SChips label="Wifi on print" options={[{v:'auto',l:'Show'},{v:'off',l:'Hide'}]}
        value={doc.footer.wifi}
        onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { wifi:v }) }))} />
      <div className="ss-rowflex">
        <SField label="Wifi name" value={doc.footer.wifiName}
          onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { wifiName:v }) }))} />
        <SField label="Pass" value={doc.footer.wifiPass}
          onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { wifiPass:v }) }))} />
      </div>
      <div className="ss-sech">Document</div>
      <div className="ss-actions">
        <button className="ss-iconbtn" onClick={()=>{
          const blob = new Blob([JSON.stringify(doc, null, 2)], { type:'application/json' });
          dlBlob(blob, 'reality-schedule-'+doc.range.start+'.json');
        }}>Save JSON</button>
        <button className="ss-iconbtn" onClick={()=>{
          const blob = new Blob([a_serCSV(doc)], { type:'text/csv' });
          dlBlob(blob, 'reality-schedule-'+doc.range.start+'.csv');
        }}>Save CSV</button>
      </div>
      <div className="ss-actions">
        <button className="ss-iconbtn" onClick={()=>{
          if(confirm('Move onto the next period? One-off events shift forward '+doc.range.days+' days; weekly events carry over on their own.')){
            setDoc(d=>a_norm(Object.assign({}, d, {
              range:{ start:a_dAdd(d.range.start, d.range.days), days:d.range.days },
              splits:d.splits.map(s=>a_dAdd(s, d.range.days)),
              days:Object.keys(d.days).reduce((o,k)=>{ o[a_dAdd(k, d.range.days)] = d.days[k]; return o; }, {}),
              /* weekly masters stay put — they already project into the new range; only one-offs shift */
              events:d.events.filter(e=>e.repeat==='weekly').concat(
                d.events.filter(e=>e.repeat!=='weekly')
                  .map(e=>Object.assign({}, e, { id:a_uid(), date:a_dAdd(e.date, d.range.days), notionId:null }))),
            })));
          }
        }}>Clone → next {doc.range.days===7?'week':'period'}</button>
      </div>
      <div className="ss-actions">
        <button className="ss-iconbtn ss-del" onClick={()=>{
          if(confirm('Start a blank schedule? The current one is kept in your last saved JSON only.')) {
            setDoc(a_norm(a_new()));
          }
        }}>New blank</button>
      </div>
      <div className="ss-mini">Select an event (left list or click it in the preview) to edit it here. The day strip up top moves the range and places carousel splits.</div>
    </React.Fragment>
  );
}

/* ---------- import modal ---------- */
function ImportModal({ doc, setDoc, onClose }){
  const [text, setText] = React.useState('');
  const [mode, setMode] = React.useState('merge');
  const [feed, setFeed] = React.useState(null);   // null | { loading } | { events, errors } — WP9 feed pull
  const fileRef = React.useRef(null);
  const isCSV = /^[^\n]*\bdate\b[^\n]*\btitle\b/i.test(text.split('\n')[0]||'');
  const hasCloud = typeof window!=='undefined' && !!window.RCloud;
  /* Feed-pulled events (when present) supersede the paste/CSV box — they carry
     the same blankEvent() shape, so the existing merge/replace + range-clamp
     reuse unchanged. */
  const parsed = React.useMemo(()=>{
    if(feed && Array.isArray(feed.events)) return { events:feed.events, errors:feed.errors||[], notes:{}, fromFeed:true };
    if(!text.trim()) return { events:[], errors:[], notes:{} };
    if(isCSV){ const r = a_csv(text); return { events:r.events, errors:r.errors, notes:{} }; }
    return a_paste(text, doc);
  }, [text, doc.range.start, doc.range.days, feed]);

  async function pullFromFeed(){
    if(!window.RCloud){ setFeed({ events:[], errors:['Cloud client unavailable.'] }); return; }
    setFeed({ loading:true });
    try{
      const dates = a_dates(doc.range);
      const from = dates[0], to = dates[dates.length-1];
      const fd = await window.RCloud.fetchFeed({ from, to });
      if(!fd){ setFeed({ events:[], errors:['Feed not available yet.'] }); return; }
      const built = a_buildFeed(fd, { locations:A_LOCS, range:doc.range, makeId:a_uid });
      setFeed({ events:built.events, errors:built.errors });
    }catch(e){ setFeed({ events:[], errors:['Could not load the feed.'] }); }
  }

  function run(){
    const dates = a_dates(doc.range);
    let evs = parsed.events, skipped = 0;
    if(mode==='replace' && isCSV && !parsed.fromFeed && evs.length){
      const ds = evs.map(e=>e.date).sort();
      const span = Math.round((window.dToDate(ds[ds.length-1]) - window.dToDate(ds[0]))/86400000) + 1;
      const range = { start:ds[0], days:Math.max(1, Math.min(10, span)) };
      const keep = evs.filter(e=>a_dates(range).indexOf(e.date)>=0);
      skipped = evs.length - keep.length;
      setDoc(d=>a_norm(Object.assign({}, d, { range, splits:[], events:keep, days:{} })));
    } else {
      evs = evs.filter(e=>dates.indexOf(e.date)>=0);
      skipped = parsed.events.length - evs.length;
      setDoc(d=>{
        const days = Object.assign({}, d.days, parsed.notes);
        const events = (mode==='replace' ? d.events.filter(e=>dates.indexOf(e.date)<0) : d.events).concat(evs);
        return Object.assign({}, d, { events, days });
      });
    }
    onClose(skipped);
  }
  return (
    <div className="ss-overlay" onClick={()=>onClose(null)}>
      <div className="ss-modal" onClick={e=>e.stopPropagation()}>
        <div className="ss-sech" style={{ marginTop:0 }}>Import — paste a week, a CSV, or pull from the REALITY feed</div>
        <textarea className="ss-area" style={{ minHeight:190 }} autoFocus value={text}
          placeholder={'MON\n17:00: How to DJ 2E $\n19:00 - ALL NIGHT: Board Game Night 1L/2L/2E/3P\nTUE\n…\n\n— or paste / load Schedule Studio CSV v1 —\ndate,start,end,title,title_short,locations,flags,emphasis'}
          onChange={e=>{ setText(e.target.value); if(feed) setFeed(null); }} />
        <div className="ss-actions" style={{ marginTop:10 }}>
          <button className="ss-iconbtn" onClick={()=>fileRef.current.click()}>Load .csv / .txt file…</button>
          {hasCloud && <button className="ss-iconbtn" onClick={pullFromFeed}
            title="Build this range's events from the published REALITY Events Feed (best-effort; no-op if the feed is unavailable)">
            {feed && feed.loading ? 'Pulling…' : 'Pull from REALITY feed'}</button>}
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" style={{ display:'none' }}
            onChange={e=>{ const f=e.target.files[0]; if(!f) return;
              const fr=new FileReader(); fr.onload=()=>{ setFeed(null); setText(String(fr.result)); }; fr.readAsText(f, 'utf-8'); e.target.value=''; }} />
        </div>
        <SChips label="Mode" options={[{v:'merge',l:'Add to current'},{v:'replace',l:(isCSV&&!parsed.fromFeed)?'Replace (range follows the file)':'Replace range events'}]}
          value={mode} onChange={setMode} />
        <div className="ss-mini" style={{ margin:'8px 0' }}>
          {parsed.fromFeed
            ? <b>{parsed.events.length} event{parsed.events.length===1?'':'s'} from the feed{parsed.errors.length?' · '+parsed.errors.length+' problem'+(parsed.errors.length===1?'':'s'):''}</b>
            : text.trim()
              ? <b>{parsed.events.length} event{parsed.events.length===1?'':'s'} parsed{isCSV?' (CSV)':''}{parsed.errors.length?' · '+parsed.errors.length+' problem'+(parsed.errors.length===1?'':'s'):''}</b>
              : 'Day headers (MON / 8.6 / 2026-06-08) assign the days in paste mode. Or pull this range straight from the published feed.'}
        </div>
        {parsed.errors.slice(0,5).map((er,i)=><div key={i} className="ss-mini ss-err">{er}</div>)}
        <div className="ss-actions" style={{ marginTop:12 }}>
          <button className="ss-iconbtn ss-go" disabled={!parsed.events.length && !Object.keys(parsed.notes||{}).length}
            onClick={run}>Import</button>
          <button className="ss-iconbtn" onClick={()=>onClose(null)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- topbar ---------- */
function Topbar({ doc, setDoc, onImport, onExport, exporting, exportMsg, count, cloudUser, onCloudSignIn, onCloudSignOut }){
  const fileRef = React.useRef(null);
  const hasCloud = typeof window!=='undefined' && !!window.RCloud;
  return (
    <div className="ss-top">
      <div className="ss-brand">Reality<small>SCHEDULE STUDIO</small></div>
      <div className="ss-tgroup"><span className="gl">Range</span>
        <span className="ss-range">{a_rangeLabel(doc.range)}</span>
      </div>
      <div className="ss-tgroup"><span className="gl">Import</span>
        <div className="ss-seg">
          <button onClick={onImport}>Paste / CSV</button>
          <button onClick={()=>fileRef.current.click()}>Open JSON</button>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display:'none' }}
          onChange={e=>{ const f=e.target.files[0]; if(!f) return;
            const fr=new FileReader(); fr.onload=()=>{ try{ setDoc(a_norm(JSON.parse(String(fr.result)))); }catch(err){ alert('Not a schedule JSON file.'); } };
            fr.readAsText(f, 'utf-8'); e.target.value=''; }} />
      </div>
      <div className="spacer" />
      <div className="ss-tgroup"><span className="gl">{exporting ? (exportMsg||'Exporting…') : 'Export'}</span>
        <div className="ss-seg">
          <button disabled={exporting} onClick={()=>onExport('channel')}>This channel</button>
          <button disabled={exporting} onClick={()=>onExport('all')} title="Every channel + dailies + archive, zipped">Everything</button>
        </div>
      </div>
      {/* WP9: cloud sign-in toggle (drives doc sync + the feed pull). Hidden if
          RCloud failed to load; best-effort, no-op when the hub is dormant. */}
      {hasCloud && <div className="ss-tgroup"><span className="gl">Cloud</span>
        {cloudUser
          ? <button onClick={onCloudSignOut} className="ss-iconbtn"
              title={'Signed in as '+cloudUser+' — click to sign out (stays local-only)'}>Sign out</button>
          : <button onClick={onCloudSignIn} className="ss-iconbtn"
              title="Sign in to the REALITY hub to sync this draft and pull from the feed">Sign in</button>}
      </div>}
      <span className="gl" style={{ fontFamily:'Montserrat', fontWeight:700, letterSpacing:'.1em', fontSize:9, color:'#6f6553' }}>{count} EV</span>
    </div>
  );
}

/* ---------- app ---------- */
function App(){
  const [doc, setDocRaw] = React.useState(a_load);
  const setDoc = React.useCallback(fn=>setDocRaw(d=>{
    const next = typeof fn==='function' ? fn(d) : fn;
    return next;
  }), []);
  const [selId, setSelId] = React.useState(null);
  const [selDate, setSelDate] = React.useState(null);
  const [channelId, setChannelId] = React.useState('feed');
  const [partIdx, setPartIdx] = React.useState(0);
  const [dailyDate, setDailyDate] = React.useState(null);
  const [dailyVariant, setDailyVariant] = React.useState('story');
  const [importOpen, setImportOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [exportMsg, setExportMsg] = React.useState('');
  const [exportJob, setExportJob] = React.useState(null);
  const [scale, setScale] = React.useState(0.3);
  const [fitReport, setFitReport] = React.useState(null);   /* rendered truth, beats the estimate */
  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const exportRef = React.useRef(null);

  React.useEffect(()=>{ a_store(doc); }, [doc]);

  /* ---- WP9 cloud sync (best-effort; localStorage stays the source of truth) ----
     Debounced (~2s) push of the working doc to studio_documents (schedule/working)
     beside the localStorage autosave above. On sign-in, a newer-in-cloud working
     doc triggers a one-line confirm before replacing. Every RCloud call no-ops
     when signed-out / hub dormant, so local-only behaviour is unchanged. ---- */
  const [cloudUser, setCloudUser] = React.useState(()=>{ try{ return window.RCloud && window.RCloud.isSignedIn() ? (window.RCloud.currentEmail()||'signed in') : null; }catch(e){ return null; } });
  const docRef = React.useRef(doc); docRef.current = doc;
  const sessionStartRef = React.useRef(Date.now());
  const cloudPushRef = React.useRef(null);
  React.useEffect(()=>{
    if(!cloudUser || !window.RCloud) return;
    if(cloudPushRef.current) clearTimeout(cloudPushRef.current);
    cloudPushRef.current = setTimeout(()=>{
      try{ window.RCloud.putDoc('schedule','working', (docRef.current.header&&docRef.current.header.title)||'', docRef.current, Date.now()); }catch(e){}
    }, 2000);
    return ()=>{ if(cloudPushRef.current) clearTimeout(cloudPushRef.current); };
  }, [doc, cloudUser]);
  const cloudPullDoneRef = React.useRef(false);
  React.useEffect(()=>{
    if(!cloudUser || !window.RCloud || cloudPullDoneRef.current) return;
    cloudPullDoneRef.current = true;
    let live = true;
    (async()=>{
      try{
        const remote = await window.RCloud.getDoc('schedule','working');
        if(!live || !remote) return;
        const remoteAt = typeof remote.updatedAt==='number' ? remote.updatedAt : Date.parse(remote.updatedAt||'')||0;
        let remoteDoc = remote.json;
        if(typeof remoteDoc==='string'){ try{ remoteDoc = JSON.parse(remoteDoc); }catch(e){ remoteDoc=null; } }
        if(remoteDoc && remoteDoc.events && remoteAt > sessionStartRef.current){
          if(window.confirm('A newer Schedule Studio working draft was found in the cloud. Load it? (Replaces what’s on screen.)')){
            setDoc(a_norm(remoteDoc)); setSelId(null);
          }
        }
      }catch(e){ /* local-only on any failure */ }
    })();
    return ()=>{ live=false; };
  }, [cloudUser]);

  /* WP9 delta — automatic App→Schedule sync. On open, pull the published Events
     Feed for the current range and idempotently merge it in (adds/updates only;
     preserves local presentation + purely-local rows; never accumulates). The feed
     is a PUBLIC read, so this needs no sign-in. Best-effort: any failure or an
     empty feed leaves the doc untouched (no silent deletes). */
  const [syncNote, setSyncNote] = React.useState(null);
  const feedPullDoneRef = React.useRef(false);
  React.useEffect(()=>{
    if(!window.RCloud || !window.RCloud.fetchFeed || feedPullDoneRef.current) return;
    feedPullDoneRef.current = true;
    let live = true;
    (async()=>{
      try{
        const base = docRef.current;
        const ds = a_dates(base.range);
        const fd = await window.RCloud.fetchFeed({ from: ds[0], to: ds[ds.length-1] });
        if(!live || !fd || !Array.isArray(fd.events) || !fd.events.length) return;   // empty/failed → no-op
        const built = a_buildFeed(fd, { locations:A_LOCS, range:base.range, makeId:a_uid });
        if(!live || !built || !built.events.length) return;
        const res = a_mergeFeed(docRef.current.events, built.events);
        if(!live || !res.changed) return;
        // re-merge inside the functional update so it composes with the latest doc
        setDoc(d=>a_norm(Object.assign({}, d, { events:a_mergeFeed(d.events, built.events).events })));
        const n = res.added + res.updated;
        setSyncNote(n ? ('Synced from the app · '+n+' new/updated') : 'Synced from the app');
        setTimeout(()=>{ if(live) setSyncNote(null); }, 6000);
      }catch(e){ /* local-only on any failure */ }
    })();
    return ()=>{ live = false; };
  }, []);   // once, on open

  async function cloudSignIn(){
    try{ if(!window.RCloud) return; const t = await window.RCloud.signIn(); setCloudUser(t ? (window.RCloud.currentEmail()||'signed in') : null); }catch(e){}
  }
  function cloudSignOut(){ try{ if(window.RCloud) window.RCloud.signOut(); }catch(e){} setCloudUser(null); }

  const dates = a_dates(doc.range);
  const sel = doc.events.filter(e=>e.id===selId)[0] || null;
  const capacity = React.useMemo(()=>a_cap(doc, channelId), [doc, channelId]);
  /* per-day text sizing view for the current channel (Stories / Feed, stacked looks) */
  const sizeInfo = React.useMemo(()=>window.computeStackSizing(doc, channelId), [doc, channelId]);
  const editSizing = React.useCallback((mutate)=>{
    setDoc(d=>{
      const sizing = Object.assign({}, d.sizing);
      const cur = Object.assign({ base:'auto', perDay:{} }, sizing[channelId]);
      sizing[channelId] = mutate(Object.assign({}, cur, { perDay:Object.assign({}, cur.perDay) }));
      return Object.assign({}, d, { sizing });
    });
  }, [channelId]);
  const setDaySize = React.useCallback((date, step)=>editSizing(s=>{
    if(step==null) delete s.perDay[date]; else s.perDay[date] = step;
    return s;
  }), [editSizing]);
  const setBaseSize = React.useCallback(base=>editSizing(s=>{ s.base = base; return s; }), [editSizing]);
  const resetSizes = React.useCallback(()=>editSizing(()=>({ base:'auto', perDay:{} })), [editSizing]);
  const reportRef = React.useRef(null);
  React.useEffect(()=>{ reportRef.current = null; setFitReport(null); }, [doc, channelId, partIdx, dailyVariant]);
  const onFitReport = React.useCallback(r=>{
    const prev = reportRef.current;
    if(prev && prev.over===r.over && prev.level===r.level && prev.denIdx===r.denIdx) return;
    reportRef.current = r; setFitReport(r);
  }, []);
  const nParts = a_partCount(doc, channelId);
  const effPart = Math.min(partIdx, nParts-1);
  const effDaily = dates.indexOf(dailyDate)>=0 ? dailyDate :
    (dates.filter(d=>a_dayInfo(doc,d).status!=='closed')[0] || dates[0]);
  const size = a_partSize(channelId, dailyVariant);
  const coverInfo = (channelId==='daily' && dailyVariant==='cover' && window.coverInfo)
    ? window.coverInfo(doc, effDaily) : null;
  const dailyInfo = (channelId==='daily' && dailyVariant!=='cover' && window.dailySizing)
    ? window.dailySizing(doc, dailyVariant, effDaily) : null;

  /* fit preview to stage (clamped — tiny panels must never yield ≤0 scale) */
  React.useLayoutEffect(()=>{
    function recompute(){
      const s = stageRef.current; if(!s) return;
      const pad = 70;
      const sc = Math.min((s.clientWidth-pad)/size.w, (s.clientHeight-pad)/size.h);
      setScale(Math.max(0.04, isFinite(sc) ? sc : 0.04));
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    if(stageRef.current) ro.observe(stageRef.current);
    window.addEventListener('resize', recompute);
    return ()=>{ ro.disconnect(); window.removeEventListener('resize', recompute); };
  }, [size.w, size.h]);

  /* Keyboard: Delete/Backspace removes the selected event (not while typing);
     Esc deselects — from a field it first drops focus, pressed again it deselects. */
  const selRef = React.useRef(selId); selRef.current = selId;
  React.useEffect(()=>{
    function onKey(e){
      const ae = document.activeElement;
      const typing = ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA' || ae.isContentEditable);
      if(e.key==='Escape'){
        if(typing){ ae.blur(); return; }
        if(selRef.current) setSelId(null);
        return;
      }
      if(e.key!=='Delete' && e.key!=='Backspace') return;
      const id = selRef.current; if(!id) return;
      if(typing) return;
      e.preventDefault();
      setDocRaw(d=>Object.assign({}, d, { events:d.events.filter(ev=>ev.id!==id) }));
      setSelId(null);
    }
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, []);

  /* capacity message for the bar under the stage */
  const capMsg = (()=>{
    /* the rendered preview reports its measured truth — trust it over estimates */
    if(fitReport){
      if(fitReport.over) return { tone:'over', text:'Over capacity — rows are being cut off. Move a split on the day strip, shorten titles, or hide a row on this channel.' };
      if(fitReport.level>=3 || fitReport.denIdx>0){
        const bits = [];
        if(fitReport.level>=3) bits.push('type at the compact floor (short titles in use)');
        if(fitReport.denIdx>0) bits.push('footer compacted to make room');
        return { tone:'tight', text:'Dense week — '+bits.join(', ')+'. Move a split on the day strip if it feels cramped.' };
      }
      if(fitReport.level===2) return { tone:'ok', text:'Fits at compact density.' };
      return { tone:'ok', text:'Fits comfortably.' };
    }
    const bad = capacity.parts.filter(p=>!p.fits);
    if(bad.length){
      const p = bad[0];
      const days = p.dates.length>4 ? 'This range' : p.dates.map(d=>A_DA[a_wd(d)]).join('–');
      return { tone:'over', text:days+' is over capacity even at the floor — move a split on the day strip, shorten titles, or hide a row on this channel.' };
    }
    const squeezed = capacity.parts.filter(p=>p.denIdx>0);
    const floor = capacity.parts.filter(p=>p.level>=3);
    if(floor.length || squeezed.length){
      const bits = [];
      if(floor.length) bits.push('type at the compact floor (short titles in use)');
      if(squeezed.length) bits.push('footer compacted to make room');
      return { tone:'tight', text:'Dense week — '+bits.join(', ')+'. Move a split on the day strip if it feels cramped.' };
    }
    const tight = capacity.parts.filter(p=>p.level===2);
    if(tight.length) return { tone:'ok', text:'Fits at compact density.' };
    return { tone:'ok', text:'Fits comfortably.' };
  })();

  /* ---- export pipeline ---- */
  async function renderOffscreen(job){
    setExportJob(job);
    await new Promise(r=>setTimeout(r, 60));
    await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
    await new Promise(r=>setTimeout(r, 320));
    const node = exportRef.current && exportRef.current.firstChild;
    if(!node) throw new Error('export node missing');
    return node;
  }
  async function capturePart(job, ch){
    const node = await renderOffscreen(job);
    const sz = a_partSize(job.channelId, job.dailyVariant);
    /* no cacheBust: the schedule has no remote images, and busting forces a
       font refetch per capture — it made the 7-part "Everything" export crawl */
    return window.htmlToImage.toPng(node, { width:sz.w, height:sz.h, pixelRatio:ch.px||2,
      backgroundColor: ch.bg });
  }
  function pngName(chId, i, n, variant, date){
    const base = 'reality-schedule-' + doc.range.start;
    if(chId==='daily') return 'reality-daily-' + date + '-' + variant + '.png';
    if(chId==='wa') return base + '-wa.png';
    if(chId==='print') return base + '-print.png';
    return base + '-' + chId + (n>1 ? '-' + (i+1) : '') + '.png';
  }
  async function makePrintPDF(){
    const ch = a_ch('print');
    const url = await capturePart({ channelId:'print' }, ch);
    const JS = window.jspdf && window.jspdf.jsPDF;
    const pdf = new JS({ unit:'mm', format:'a4', orientation:'landscape' });
    /* compression flag matters: without it jsPDF embeds the decoded raster
       essentially raw — ~30MB for the A4 sheet. FLATE is lossless. */
    pdf.addImage(url, 'PNG', 0, 0, 297, 210, undefined, 'SLOW');
    return pdf;
  }
  async function doExport(scope){
    if(exporting || !window.htmlToImage) return;
    setSelId(null); setExporting(true); setExportMsg('Rendering…');
    const base = 'reality-schedule-' + doc.range.start;
    try{
      if(scope==='channel'){
        const ch = a_ch(channelId);
        if(channelId==='print'){
          setExportMsg('Print PDF…');
          const pdf = await makePrintPDF();
          pdf.save(base + '-print.pdf');
        } else if(channelId==='daily'){
          const open = dates.filter(d=>a_dayInfo(doc,d).status!=='closed');
          const zip = new window.JSZip();
          for(let i=0;i<open.length;i++){
            setExportMsg('Daily ' + (i+1) + '/' + open.length + '…');
            const url = await capturePart({ channelId:'daily', dailyDate:open[i], dailyVariant }, ch);
            zip.file(pngName('daily',0,1,dailyVariant,open[i]), url.split(',')[1], { base64:true });
          }
          setExportMsg('Zipping…');
          dlBlob(await zip.generateAsync({ type:'blob' }), 'reality-daily-' + doc.range.start + '-' + dailyVariant + '.zip');
        } else {
          const n = a_partCount(doc, channelId);
          if(n===1){
            const url = await capturePart({ channelId, partIndex:0 }, ch);
            dl(url, pngName(channelId,0,1));
          } else {
            const zip = new window.JSZip();
            for(let i=0;i<n;i++){
              setExportMsg(ch.label + ' ' + (i+1) + '/' + n + '…');
              const url = await capturePart({ channelId, partIndex:i }, ch);
              zip.file(pngName(channelId,i,n), url.split(',')[1], { base64:true });
            }
            setExportMsg('Zipping…');
            dlBlob(await zip.generateAsync({ type:'blob' }), base + '-' + channelId + '.zip');
          }
        }
      } else {
        /* everything: feed + stories + wa + print.pdf + dailies + archives */
        const zip = new window.JSZip();
        for(const chId of ['feed','stories']){
          const ch = a_ch(chId), n = a_partCount(doc, chId);
          for(let i=0;i<n;i++){
            setExportMsg(ch.label + ' ' + (i+1) + '/' + n + '…');
            const url = await capturePart({ channelId:chId, partIndex:i }, ch);
            zip.file(pngName(chId,i,n), url.split(',')[1], { base64:true });
          }
        }
        setExportMsg('WhatsApp…');
        const waUrl = await capturePart({ channelId:'wa' }, a_ch('wa'));
        zip.file(pngName('wa'), waUrl.split(',')[1], { base64:true });
        setExportMsg('Print PDF…');
        const pdf = await makePrintPDF();
        zip.file(base + '-print.pdf', pdf.output('blob'));
        const open = dates.filter(d=>a_dayInfo(doc,d).status!=='closed');
        for(let i=0;i<open.length;i++){
          setExportMsg('Daily ' + (i+1) + '/' + open.length + '…');
          const url = await capturePart({ channelId:'daily', dailyDate:open[i], dailyVariant:'story' }, a_ch('daily'));
          zip.file(pngName('daily',0,1,'story',open[i]), url.split(',')[1], { base64:true });
        }
        for(let i=0;i<open.length;i++){
          setExportMsg('FB cover ' + (i+1) + '/' + open.length + '…');
          const url = await capturePart({ channelId:'daily', dailyDate:open[i], dailyVariant:'cover' }, a_ch('daily'));
          zip.file(pngName('daily',0,1,'cover',open[i]), url.split(',')[1], { base64:true });
        }
        zip.file(base + '.json', JSON.stringify(doc, null, 2));
        zip.file(base + '.csv', a_serCSV(doc));
        setExportMsg('Zipping…');
        dlBlob(await zip.generateAsync({ type:'blob' }), base + '.zip');
      }
    }catch(err){ console.error('export failed', err); setExportMsg('Export failed'); await new Promise(r=>setTimeout(r,1500)); }
    setExportJob(null); setExporting(false); setExportMsg('');
  }

  const ch = a_ch(channelId);
  return (
    <div className="ss-app">
      {syncNote && <div style={{ position:'fixed', top:12, left:'50%', transform:'translateX(-50%)', zIndex:10000,
        background:'#0d0905', color:'#fffbf1', fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:12,
        letterSpacing:'.04em', padding:'7px 14px', borderRadius:999, boxShadow:'0 8px 24px rgba(0,0,0,.35)', pointerEvents:'none' }}>{syncNote}</div>}
      <Topbar doc={doc} setDoc={setDoc} count={doc.events.length}
        onImport={()=>setImportOpen(true)} onExport={doExport} exporting={exporting} exportMsg={exportMsg}
        cloudUser={cloudUser} onCloudSignIn={cloudSignIn} onCloudSignOut={cloudSignOut} />
      <DayStrip doc={doc} setDoc={setDoc} capacity={capacity} selDate={selDate}
        onPickDate={d=>{ setSelDate(d); if(channelId==='daily') setDailyDate(d); }} />
      <div className="ss-body">
        <DayList doc={doc} setDoc={setDoc} selId={selId} setSelId={setSelId}
          capacity={capacity} selDate={selDate} setSelDate={setSelDate}
          sizeInfo={sizeInfo} setDaySize={setDaySize} />
        <div className="ss-stagecol">
          <div className="ss-prevtabs">
            <div className="ss-seg">
              {A_CH.map(c=>(
                <button key={c.id} className={channelId===c.id?'on':''}
                  onClick={()=>{ setChannelId(c.id); setPartIdx(0); }}>
                  {c.label}<small>{c.sub}</small>
                </button>
              ))}
            </div>
            {channelId==='daily' &&
              <React.Fragment>
                <select className="ss-input ss-dailysel" value={effDaily}
                  onChange={e=>setDailyDate(e.target.value)}>
                  {dates.map(d=><option key={d} value={d}>{A_DA[a_wd(d)]} {a_dshort(d)}</option>)}
                </select>
                <div className="ss-seg">
                  {['story','feed','cover'].map(v=>(
                    <button key={v} className={dailyVariant===v?'on':''} onClick={()=>setDailyVariant(v)}>{({story:'9:16',feed:'4:5',cover:'FB Cover'})[v]}</button>
                  ))}
                </div>
              </React.Fragment>}
            {nParts>1 &&
              <div className="ss-pager">
                <button className="ss-iconbtn" disabled={effPart===0} onClick={()=>setPartIdx(effPart-1)}>‹</button>
                <span>{effPart+1} / {nParts}</span>
                <button className="ss-iconbtn" disabled={effPart===nParts-1} onClick={()=>setPartIdx(effPart+1)}>›</button>
              </div>}
          </div>
          <div className="ss-stage" ref={stageRef} onClick={()=>setSelId(null)}>
            <div style={{ position:'absolute', left:'50%', top:'50%',
              width:size.w, height:size.h,
              transform:'translate(-50%,-50%) scale('+scale+')' }}>
              <div ref={canvasRef} style={{ width:size.w, height:size.h, boxShadow:'0 30px 70px rgba(0,0,0,.5)' }}
                onClick={e=>{ /* click an event row in the preview to select it */ }}>
                <PreviewClickLayer doc={doc} setSelId={setSelId}>
                  <APart doc={doc} channelId={channelId} partIndex={effPart}
                    dailyDate={effDaily} dailyVariant={dailyVariant} onFitReport={onFitReport} />
                </PreviewClickLayer>
              </div>
              {channelId==='stories' &&
                <React.Fragment>
                  <div className="ss-safezone" style={{ top:0, height:a_ch('stories').safeTop }} />
                  <div className="ss-safezone" style={{ bottom:0, height:a_ch('stories').safeBottom }} />
                </React.Fragment>}
              {channelId==='daily' && dailyVariant==='cover' && size.bleed &&
                <React.Fragment>
                  <div className="ss-safezone-v" style={{ left:0, width:size.bleed }} />
                  <div className="ss-safezone-v" style={{ right:0, width:size.bleed }} />
                </React.Fragment>}
            </div>
          </div>
          <div className={'ss-capbar '+capMsg.tone}>{capMsg.text}</div>
        </div>
        <div className="ss-inspector">
          <div className={'ss-context'+(sel?' ev':'')}>
            {sel ? <React.Fragment><b>Event</b> · edits apply to every channel</React.Fragment>
                 : <React.Fragment><b>{ch.label}</b> · {ch.sub} · document settings below</React.Fragment>}
          </div>
          <Inspector doc={doc} setDoc={setDoc} sel={sel} setSelId={setSelId} channelId={channelId}
            sizeInfo={sizeInfo} setBaseSize={setBaseSize} resetSizes={resetSizes}
            dailyVariant={dailyVariant} coverInfo={coverInfo} dailyInfo={dailyInfo} />
        </div>
      </div>
      {importOpen && <ImportModal doc={doc} setDoc={setDoc}
        onClose={skipped=>{ setImportOpen(false);
          if(skipped) alert(skipped+' event'+(skipped===1?'':'s')+' fell outside the current range and were skipped. Widen the range on the day strip and re-import to include them.'); }} />}
      {exportJob &&
        <div ref={exportRef} style={{ position:'fixed', left:-12000, top:0, zIndex:-1 }}>
          <APart doc={doc} channelId={exportJob.channelId} partIndex={exportJob.partIndex||0}
            dailyDate={exportJob.dailyDate} dailyVariant={exportJob.dailyVariant} />
        </div>}
    </div>
  );
}

/* click-through selection: find the event row under the click by data attr */
function PreviewClickLayer({ doc, setSelId, children }){
  /* v1: select via the left list; the preview stays a faithful artifact. */
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
