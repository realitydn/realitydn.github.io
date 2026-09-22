/* ============================================================
   REALITY POSTER STUDIO — App
   Master layout + per-format overrides, snapping type scale.
   The shell: it wires the hooks (hooks/) to the panels (panels/) and
   lays out top bar · library · stage · inspector. State lives in the
   hooks; what each column shows lives in its panel.
   ============================================================ */
import { RUI } from '../studio-shared/studio-ui.jsx';
import { persistStorage } from '../studio-shared/store.js';
import {
  FORMATS as AP_FMT, OUTPUT_FORMATS as AP_OUT, STANDEE_FORMATS as AP_STD, HANDOUT_FORMATS as AP_HND,
  ACCENTS_BY_DAY as AP_ABYDAY, DAY_NAMES as AP_DNAMES,
} from './studio-data.jsx';
import { posterDayOf } from './studio-element.jsx';
import { StudioCanvas as APCanvas } from './studio-canvas.jsx';
import { starterDoc, normalizeDoc, loadLegacyDoc, bootDoc } from './doc.js';
import { useDoc } from './hooks/useDoc.js';
import { useAutosave } from './hooks/useAutosave.js';
import { useToast } from './hooks/useToast.js';
import { useCloudSession, useCloud } from './hooks/useCloud.js';
import { useLibrary } from './hooks/useLibrary.js';
import { useQueue } from './hooks/useQueue.js';
import { useExport } from './hooks/useExport.js';
import { useKeys } from './hooks/useKeys.js';
import { useViewport } from './hooks/useViewport.js';
import { useImageDrop } from './hooks/useImageDrop.js';
import { useArrange } from './hooks/useArrange.js';
import { useSpawn } from './hooks/useSpawn.js';
import { Topbar } from './panels/topbar.jsx';
import { QueueList } from './panels/queue.jsx';
import { Library } from './panels/library.jsx';
import { Inspector } from './panels/inspector/index.jsx';
import { EventPickerModal } from './panels/event-picker.jsx';

/* ---------- app ---------- */
function App({ initialDoc }){
  const { doc, setDoc, docRef, selectedIds, setSelectedIds, selectedId, select, sliceMode, setSliceMode, setFeedSlice,
    viewFormat, isOutput, activeLabel, hist, undo, redo, setDocQuiet, resolved, resolvedRef, sel, selRef, selIdsRef,
    overrideCount, updateEl, updateElRef, update, resetOverride, resetFormat, toggleHidden, del, dup, layer, clearAll } = useDoc(initialDoc);
  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const { saveState, saveMsg } = useAutosave({ doc, docRef });
  const { toast, setToast, say } = useToast();
  const session = useCloudSession();
  const { cloudUser, cloudMsg } = session;
  const lib = useLibrary({ docRef, setDoc, setSelectedIds, setCloudMsg:session.setCloudMsg, cloudProgress:session.cloudProgress });
  const { saveUserTpl } = lib;
  const { cloudSignIn, cloudSignOut } = useCloud({ session, doc, docRef, setDoc, setSelectedIds, setUserTpls:lib.setUserTpls });
  const queue = useQueue({ docRef, setDoc, setSelectedIds, userTpls:lib.userTpls, userTplsRef:lib.userTplsRef, tplReady:lib.tplReady });
  const { queueFeed } = queue;
  const { exporting, exportingRef, exportMsg, plateOnly, doExport, eventPicker, setEventPicker, openEventPicker, exportToEvent } =
    useExport({ doc, docRef, viewFormat, canvasRef, setSelectedIds, setDocQuiet, queueFeed, setQueueSent:queue.setQueueSent, cloudSignIn });

  /* The handlers the keyboard reaches that are defined further down (save,
     export, layer order). Through a ref, re-pointed every render: the listener
     is installed once, and a handler it captured on the first render would save
     against the library as it was on that render — which is how a template ends
     up saved twice under one name. */
  const actionsRef = React.useRef({});
  useKeys({ undo, redo, say, docRef, setDoc, setSelectedIds, selIdsRef, selRef, updateElRef, resolvedRef, actionsRef });
  const { scale, scaleRef, pan, zoomPct, zoomStep, zoomFit } = useViewport({ stageRef, viewFormat });
  useImageDrop({ stageRef, canvasRef, scaleRef, docRef, setDoc, setSelectedIds, resolvedRef, updateElRef, exportingRef, say });
  const { alignSel, distributeSel, centreSel } = useArrange({ selectedIds, resolved, updateEl, viewFormat });
  const { spawn, startSpawn } = useSpawn({ stageRef, canvasRef, scaleRef, docRef, setDoc, setSelectedIds });

  /* re-pointed every render — see actionsRef */
  actionsRef.current = {
    saveTpl: saveUserTpl,
    exportImages: ()=>doExport(docRef.current.title||''),
    layer,
  };

  /* Ctrl-K. The Fold index covers every inspector control on its own; these are
     the poster-level commands, which otherwise live only as 10px buttons in a
     topbar that has run out of room. */
  const [palOpen, setPalOpen] = RUI.usePalette();
  React.useEffect(()=>{
    RUI.setActions([].concat(
      [{ label:'View · Master (source)', group:'Format', run:()=>setDoc(d=>({...d, activeFormat:'master'})) }],
      AP_OUT.filter(f=>f!=='a4').map(f=>({ label:'View · '+AP_FMT[f].label+' ('+AP_FMT[f].sub+')', group:'Format', run:()=>setDoc(d=>({...d, activeFormat:f})) })),
      ['a4','a1'].concat(AP_STD).concat(AP_HND).map(f=>({ label:'Print · '+AP_FMT[f].label, group:'Format', run:()=>setDoc(d=>({...d, activeFormat:f})) })),
      AP_ABYDAY.map((a,i)=>({ label:'Day · '+AP_DNAMES[i]+' ('+a+')', group:'Accent', run:()=>setDoc(d=>({...d, accent:a})) })),
      [{ label:'Palette · Day', group:'Theme', run:()=>setDoc(d=>({...d, theme:'day'})) },
       { label:'Palette · Night', group:'Theme', run:()=>setDoc(d=>({...d, theme:'night'})) },
       { label:'Toggle grid', group:'View', run:()=>setDoc(d=>({...d, showGrid:!d.showGrid})) },
       { label:'Toggle snap', group:'View', run:()=>setDoc(d=>({...d, snap:!d.snap})) },
       { label:'Toggle hints', group:'View', run:()=>RUI.setHints(!RUI.hintsOn()) },
       { label:'Zoom to fit', group:'View', run:zoomFit },
       { label:'Undo', group:'Edit', run:undo },
       { label:'Redo', group:'Edit', run:redo },
       { label:'Select all', group:'Edit', run:()=>setSelectedIds(docRef.current.elements.map(x=>x.id)) },
       { label:'Save current poster as a template', group:'Templates', run:saveUserTpl },
       { label:'Save images', group:'Export', run:()=>doExport(docRef.current.title||'') }]
    ));
  }, [doc.activeFormat, doc.theme, doc.showGrid, doc.snap, undo, redo]);

  return (
    <div className="rs-app">
      <Topbar doc={doc} setDoc={setDoc} overrideCount={overrideCount} resetFormat={resetFormat}
        onExport={doExport} exporting={exporting} exportMsg={exportMsg}
        cloudUser={cloudUser} cloudMsg={cloudMsg} onCloudSignIn={cloudSignIn} onCloudSignOut={cloudSignOut} onExportToEvent={openEventPicker}
        onSaveTpl={saveUserTpl}
        canUndo={hist.canUndo} canRedo={hist.canRedo} onUndo={undo} onRedo={redo}
        zoomPct={zoomPct} onZoomStep={zoomStep} onZoomFit={zoomFit}
        saveState={saveState} saveMsg={saveMsg} />
      <div className="rs-body">
        <div className="rs-lib">
          <QueueList queue={queue} />
          <Library lib={lib} startSpawn={startSpawn} />
        </div>

        <APCanvas elements={resolved} format={viewFormat} theme={doc.theme} accent={doc.accent} posterDay={posterDayOf(doc)}
          showGrid={doc.showGrid} snap={doc.snap} scale={scale} pan={pan} stageRef={stageRef} canvasRef={canvasRef}
          selectedId={selectedId} selectedIds={selectedIds} onSelect={select} onChange={updateEl} onCommit={()=>{}} exporting={exporting} plateOnly={plateOnly}
          sliceMode={sliceMode} feedSlice={doc.feedSlice} onSliceChange={setFeedSlice} />

        <div className="rs-inspector">
          <div className={'rs-context'+(isOutput?' out':' master')}>
            {isOutput
              ? <React.Fragment><b>{activeLabel}</b> output · layout edits override Master{overrideCount?` · ${overrideCount} overridden`:''}</React.Fragment>
              : <React.Fragment><b>Master</b> source · edits flow to every format</React.Fragment>}
          </div>
          {/* Feed slice moved INTO the inspector's no-selection panel — it's a
              whole-poster setting, and riding along under every element edit
              was three controls of tax on every selection. */}
          <Inspector el={sel} doc={doc} feedEvents={queueFeed && queueFeed.events} update={update} dup={dup} del={del} layer={layer}
            clearAll={clearAll} setDoc={setDoc} isOutput={isOutput} activeLabel={activeLabel}
            resetOverride={resetOverride} toggleHidden={toggleHidden}
            selCount={selectedIds.length} align={alignSel} distribute={distributeSel} centre={centreSel}
            formatLabel={activeLabel}
            sliceMode={sliceMode} setSliceMode={setSliceMode} setFeedSlice={setFeedSlice} />
        </div>
      </div>

      {spawn && <div className="rs-ghost" style={{ left:spawn.x, top:spawn.y }}>{spawn.type}</div>}
      {toast && <div className="rs-toast" role="status" onClick={()=>setToast(null)}>{toast}</div>}
      {palOpen && <RUI.Palette onClose={()=>setPalOpen(false)} />}

      {eventPicker && eventPicker.open &&
        <EventPickerModal picker={eventPicker} onPick={exportToEvent} onClose={()=>setEventPicker(null)} onRetry={openEventPicker} />}
    </div>
  );
}

/* Boot: read the working doc out of IndexedDB BEFORE the Studio mounts, so the
   first thing on screen is your poster rather than the demo flashing up and
   being swapped out (and so nothing can autosave the demo over it). A read
   takes milliseconds; the timeout is only there so a wedged IndexedDB — a
   second tab mid-upgrade — can't leave a blank page. */
function Boot(){
  const [ready, setReady] = React.useState(null);
  React.useEffect(()=>{
    let done = false;
    const go = (d)=>{ if(!done){ done = true; setReady({ doc:d }); } };
    bootDoc().then(go, ()=>go(normalizeDoc(loadLegacyDoc()) || starterDoc()));
    setTimeout(()=>{ if(!done){ console.warn('[studio] working doc read timed out — starting from the fallback copy.');
      go(normalizeDoc(loadLegacyDoc()) || starterDoc()); } }, 4000);
    /* Ask the browser not to evict this origin's storage under pressure — the
       library and the working doc are the only copy of a lot of work. The
       answer doesn't change anything here, so it isn't read. */
    persistStorage();
  }, []);
  if(!ready) return null;
  return <App initialDoc={ready.doc} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Boot/>);