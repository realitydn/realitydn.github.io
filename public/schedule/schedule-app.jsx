/* ============================================================
   REALITY SCHEDULE STUDIO — app shell
   Day strip (range + splits) · day list editor · channel
   previews · inspector · import (paste/CSV) · export pipeline.

   This file is the shell: Boot, and the App — its state, the hooks
   in the order they run, and the layout. Each job is its own file:
     app-doc.jsx          useDoc — the doc, undo / redo, autosave
     app-cloud.jsx        useCloud — the draft in the hub
     app-feed.jsx         useFeedSync — the App→Schedule pull
     app-preview.jsx      sizing, rendered fit, stage scale, capacity
     app-keys.jsx         useKeys — the keyboard
     app-export.jsx       useExport — PNG / PDF / zip + Backstage
   and each panel:
     app-topbar.jsx · app-daystrip.jsx · app-daylist.jsx
     app-event-editor.jsx · app-document-panel.jsx · app-import.jsx
     app-controls.jsx     the small controls they share
   ============================================================ */
import { persistStorage } from '../studio-shared/store.js';
import { useCloud } from './app-cloud.jsx';
import { DayList } from './app-daylist.jsx';
import { DayStrip } from './app-daystrip.jsx';
import { useDoc } from './app-doc.jsx';
import { DocumentPanel } from './app-document-panel.jsx';
import { EventEditor } from './app-event-editor.jsx';
import { useExport } from './app-export.jsx';
import { useFeedSync, usePullRequest } from './app-feed.jsx';
import { ImportModal } from './app-import.jsx';
import { useKeys } from './app-keys.jsx';
import { capacityMessage, useRenderedFit, useSizing, useStageScale } from './app-preview.jsx';
import { Topbar } from './app-topbar.jsx';
import { DAY_ABBR as A_DA, rangeDates as a_dates, dayInfo as a_dayInfo, dShort as a_dshort,
  loadStoredDoc as a_load, dWeekday as a_wd } from './schedule-data.jsx';
import { computeCapacity as a_cap, channelById as a_ch, CHANNELS as A_CH, partCount as a_partCount,
  partSize as a_partSize, PartCanvas as APart, coverInfo as coverInfo_, dailySizing } from './schedule-render.jsx';

/* ---------- boot: the stored doc is async now (IndexedDB) ----------
   Boot waits for loadStoredDoc() — a few ms — and only then mounts the app,
   so the first render IS the saved week and the autosave never writes a blank
   one over it. */
function Boot(){
  const [boot, setBoot] = React.useState(null);
  React.useEffect(()=>{
    let live = true;
    a_load().catch(()=>null).then(d=>{ if(live) setBoot({ doc:d }); });
    persistStorage();
    return ()=>{ live=false; };
  }, []);
  if(!boot) return null;
  return <App stored={boot.doc} />;
}

/* ---------- inspector: the selected event, or the document ---------- */
function Inspector(props){
  return props.sel ? <EventEditor {...props} /> : <DocumentPanel {...props} />;
}

/* ---------- app ---------- */
function App({ stored }){
  const [selId, setSelId] = React.useState(null);
  const { doc, setDoc, setDocQuiet, docRef, dirtyRef, hist, lastFeedRef, saveFailed } = useDoc(stored, setSelId);
  const { undo, redo, canUndo, canRedo } = hist;
  const [selDate, setSelDate] = React.useState(null);
  const [channelId, setChannelId] = React.useState('feed');
  const [partIdx, setPartIdx] = React.useState(0);
  const [dailyDate, setDailyDate] = React.useState(null);
  const [dailyVariant, setDailyVariant] = React.useState('story');
  const [importOpen, setImportOpen] = React.useState(false);
  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [pullNonce, requestPull] = usePullRequest();
  const { cloudUser, cloudSignIn, cloudSignOut } =
    useCloud({ doc, docRef, dirtyRef, hist, setDocQuiet, setSelId, requestPull });
  const { feedStat, syncNote } = useFeedSync({ doc, docRef, lastFeedRef, setDocQuiet, pullNonce });

  const dates = a_dates(doc.range);
  const sel = doc.events.filter(e=>e.id===selId)[0] || null;
  const capacity = React.useMemo(()=>a_cap(doc, channelId), [doc, channelId]);
  const { sizeInfo, setDaySize, setBaseSize, resetSizes } = useSizing(doc, channelId, setDoc);
  const [fitReport, onFitReport] = useRenderedFit(doc, channelId, partIdx, dailyVariant);
  const nParts = a_partCount(doc, channelId);
  const effPart = Math.min(partIdx, nParts-1);
  const effDaily = dates.indexOf(dailyDate)>=0 ? dailyDate :
    (dates.filter(d=>a_dayInfo(doc,d).status!=='closed')[0] || dates[0]);
  const size = a_partSize(channelId, dailyVariant);
  const coverInfo = (channelId==='daily' && dailyVariant==='cover' && coverInfo_)
    ? coverInfo_(doc, effDaily) : null;
  const dailyInfo = (channelId==='daily' && dailyVariant!=='cover' && dailySizing)
    ? dailySizing(doc, dailyVariant, effDaily) : null;
  const scale = useStageScale(stageRef, size);
  useKeys({ selId, setSelId, docRef, setDoc, undo, redo });
  const capMsg = capacityMessage({ fitReport, capacity, channelId, dailyVariant });
  const { exporting, exportMsg, hubMsg, exportJob, exportRef, doExport } =
    useExport({ doc, channelId, dailyVariant, setSelId });

  const ch = a_ch(channelId);
  return (
    <div className="ss-app">
      {syncNote && <div className="ss-syncnote">{syncNote}</div>}
      <Topbar doc={doc} setDoc={setDoc} count={doc.events.length}
        onImport={()=>setImportOpen(true)} onExport={doExport} exporting={exporting} exportMsg={exportMsg} hubMsg={hubMsg}
        cloudUser={cloudUser} onCloudSignIn={cloudSignIn} onCloudSignOut={cloudSignOut}
        canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} saveFailed={saveFailed} requestPull={requestPull} />
      <DayStrip doc={doc} setDoc={setDoc} capacity={capacity} selDate={selDate}
        feedStat={feedStat} onRetryFeed={requestPull}
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
            dailyVariant={dailyVariant} coverInfo={coverInfo} dailyInfo={dailyInfo} requestPull={requestPull} />
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

ReactDOM.createRoot(document.getElementById('root')).render(<Boot/>);
