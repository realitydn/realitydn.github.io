/* ============================================================
   REALITY SCHEDULE STUDIO — app · the document panel
   The inspector with nothing selected: layout, palette, per-channel
   text size, daily card + FB cover settings, header, footer, Save
   JSON / CSV, clone, new blank, and "Hidden from app sync".
   Each section is an RUI fold (open until you close it; Ctrl-K finds its
   fields); the explanatory notes are Hints (the topbar toggle).
   ============================================================ */
import { Field, Chips, Fold, Hint } from './app-controls.jsx';
import { dlBlob } from './app-export.jsx';
import { cloneToNextPeriod as a_cloneNext, dShort as a_dshort, newDoc as a_new, normalizeDoc as a_norm,
  restoreFeedEvent as a_restoreFeed, serializeCSV as a_serCSV, thisMonday as a_thisMonday, QR_CTA } from './schedule-data.jsx';
import { COVER_STYLES, DAILY_CARDS, dailyCardOf, LOOKS_LIST, PALETTES } from './schedule-render.jsx';

/* ---------- inspector: document settings ---------- */
function DocumentPanel({ doc, setDoc, setSelId, channelId, sizeInfo, setBaseSize, resetSizes, dailyVariant, coverInfo, dailyInfo, requestPull }){
  const setStyle = patch => setDoc(d=>Object.assign({}, d, { style:Object.assign({}, d.style, patch) }));
  const setCover = patch => setDoc(d=>Object.assign({}, d, { cover:Object.assign({ layout:'banner', sizeOffset:0, cols:'auto', titles:'wrap', qr:false }, d.cover, patch) }));
  const setDaily = patch => setDoc(d=>Object.assign({}, d, { daily:Object.assign({ story:0, feed:0, card:'classic' }, d.daily, patch) }));
  return (
    <React.Fragment>
      <Fold id="doc-look" title="Layout + palette" open>
      <div className="ss-sech">Layout</div>
      <div className="ss-chips">
        {LOOKS_LIST.map(lk=>(
          <button key={lk.id} className={'ss-chip'+((doc.style.look||'ledger')===lk.id?' on':'')}
            title={lk.hint} onClick={()=>setStyle({ look:lk.id })}>{lk.l}</button>
        ))}
      </div>
      <div className="ss-sech">Palette</div>
      <div className="ss-styles">
        {PALETTES.map(p=>{
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
      <Hint>Layout + palette apply to the whole week, every output. Print always renders on white.</Hint>
      </Fold>
      {sizeInfo && sizeInfo.active &&
        <Fold id="doc-size" title={'Text size · '+(channelId==='stories'?'Stories':'Feed')} open>
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
        </Fold>}
      {channelId==='daily' && dailyVariant!=='cover' &&
        <Fold id="doc-daily" title={'Daily card · '+(dailyVariant==='story'?'9:16 Story':'4:5 Feed')} open>
          <div className="ss-lab" style={{ marginBottom:6 }}>Layout</div>
          <div className="ss-chips" style={{ marginBottom:8 }}>
            {DAILY_CARDS.map(dcd=>(
              <button key={dcd.id} className={'ss-chip'+(dailyCardOf(doc)===dcd.id?' on':'')}
                title={dcd.hint} onClick={()=>setDaily({ card:dcd.id })}>{dcd.name}</button>
            ))}
          </div>
          <Hint>
            One layout for the whole document — every day you export uses it, so a week
            of cards reads as one week. Each gives the day colour a different structural
            job; all of them hold from two events to ten.
          </Hint>
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
          <Hint>
            Daily cards size independently of the weekly schedules — the 9:16 story runs large by default. This adjusts only the {dailyVariant==='story'?'9:16 story':'4:5 feed'}.
          </Hint>
        </Fold>}
      {channelId==='daily' && dailyVariant==='cover' &&
        <Fold id="doc-cover" title="FB Cover" open>
          <div className="ss-lab" style={{ marginBottom:6 }}>Cover style</div>
          <div className="ss-chips" style={{ marginBottom:12 }}>
            {COVER_STYLES.map(cs=>(
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
          <Chips label="Columns" options={[{v:'auto',l:'Auto'},{v:1,l:'1'},{v:2,l:'2'}]}
            value={doc.cover.cols||'auto'} onChange={v=>setCover({ cols:v })} />
          <Chips label="Long titles" options={[{v:'wrap',l:'Wrap'},{v:'short',l:'Short'},{v:'crop',l:'Crop'}]}
            value={doc.cover.titles||'wrap'} onChange={v=>setCover({ titles:v })} />
          <Chips label="QR code" options={[{v:false,l:'Off'},{v:true,l:'On'}]}
            value={!!doc.cover.qr} onChange={v=>setCover({ qr:!!v })} />
          <Hint>
            <b>Wrap</b> shows full titles on two lines — nothing is cropped. <b>Short</b> uses each event's short title; <b>Crop</b> is one line with an ellipsis. Size auto-fits the previewed day; nudge it bigger or smaller here.
          </Hint>
          <Hint>
            Every cover ends on <b>{QR_CTA}</b> — that line is always there. The <b>QR code</b> is off by default: a cover is mostly seen on the phone someone is holding, where a code can’t be scanned. On <b>Sidebar</b>, <b>Slice</b> and <b>Halftone</b> it sits in the colour panel and costs the events list nothing; on the other six it rides the footer and the text steps down a size to make room. Turn it on for a cover that will be projected or seen on desktop.
          </Hint>
        </Fold>}
      <Fold id="doc-header" title="Header" open>
      <Field label="Title" value={doc.header.title}
        onChange={v=>setDoc(d=>Object.assign({}, d, { header:{ title:v } }))} />
      </Fold>
      <Fold id="doc-footer" title="Footer" open>
      <Chips label="Support note" options={[{v:true,l:'Show'},{v:false,l:'Hide'}]}
        value={doc.footer.supportNote}
        onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { supportNote:v }) }))} />
      {doc.footer.supportNote &&
        <Field value={doc.footer.supportText} area
          onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { supportText:v }) }))} />}
      <Chips label="Footer density" options={[{v:'auto',l:'Auto'},{v:'full',l:'Full'},{v:'compact',l:'Compact'},{v:'minimal',l:'Minimal'}]}
        value={doc.footer.density||'auto'}
        onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { density:v }) }))} />
      <Hint>Auto compacts the footer only when a heavy week needs the room.</Hint>
      <Chips label="Wifi on print" options={[{v:'auto',l:'Show'},{v:'off',l:'Hide'}]}
        value={doc.footer.wifi}
        onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { wifi:v }) }))} />
      <div className="ss-rowflex">
        <Field label="Wifi name" value={doc.footer.wifiName}
          onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { wifiName:v }) }))} />
        <Field label="Pass" value={doc.footer.wifiPass}
          onChange={v=>setDoc(d=>Object.assign({}, d, { footer:Object.assign({}, d.footer, { wifiPass:v }) }))} />
      </div>
      </Fold>
      <Fold id="doc-document" title="Document" open>
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
          if(confirm('Move onto the next period? One-off events you added here shift forward '+doc.range.days+' days; weekly events carry over on their own; the app’s events for the new dates arrive from the feed.')){
            /* weekly masters stay put; synced one-offs don't clone (see cloneToNextPeriod) */
            setDoc(d=>a_norm(a_cloneNext(d)));
          }
        }}>Clone → next {doc.range.days===7?'week':'period'}</button>
      </div>
      <div className="ss-actions">
        <button className="ss-iconbtn ss-del" onClick={()=>{
          if(confirm('Start a blank schedule on this week? Everything here is cleared (Ctrl+Z brings it back; Save JSON first if you want a copy). The app’s events are pulled in again.')) {
            setDoc(a_norm(a_new(a_thisMonday()))); setSelId(null);
            if(requestPull) requestPull();
          }
        }}>New blank</button>
      </div>
      </Fold>
      {(doc.feedDeleted||[]).length>0 &&
        <Fold id="doc-hidden" title="Hidden from app sync" badge={String(doc.feedDeleted.length)} open>
          <Hint>
            App events you deleted here. They stay out of every pull until restored.</Hint>
          {doc.feedDeleted.map(t=>(
            <div key={t.key} className="ss-tomb">
              <span className="tt">{t.weekly?'↻ ':''}{t.title}<small>{t.weekly?'whole series':a_dshort(t.date)}</small></span>
              <button className="ss-iconbtn" onClick={()=>{
                setDoc(d=>a_restoreFeed(d, t.key));
                if(requestPull) requestPull();
              }}>Restore</button>
            </div>
          ))}
        </Fold>}
      <Hint>Select an event (left list or click it in the preview) to edit it here. The day strip up top moves the range and places carousel splits.</Hint>
    </React.Fragment>
  );
}

export { DocumentPanel };
