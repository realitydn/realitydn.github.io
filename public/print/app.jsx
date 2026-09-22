/* ============================================================
   REALITY PRINT STUDIO — App (the shell)
   One A-size document, vector CMYK PDF out, gang-on-A4.
   Year 2 pass: layout grid + snapping, undo/redo, zoom, Fold
   inspector in one canonical order, template previews.

   This file only boots and lays out. The state lives in hooks —
     use-doc.js       the sheet, selection, undo, every edit
     use-storage.js   autosave, My templates, other tabs, photo sweep
     use-viewport.js  fit, zoom
     use-keys.js      the keyboard, pasted images
     use-library.js   dragged parts, templates in and out
     use-export.js    Save PDF / Gang on A4
     use-preflight.js the live preflight
   — and the panels in topbar.jsx, library.jsx, inspector*.jsx,
   image-controls.jsx, sheet-panel.jsx, preflight-chip.jsx.
   ============================================================ */
import { ACCENTS as AP_ACC } from '../studio-shared/brand.js';
import { PrintDocs } from './print-store.js';
import { SIZES as AP_SZ, SIZE_ORDER as AP_ORD, sizeDims as apDims, PT_PER_MM as AP_PPM, gridSpec } from './print-paper.js';
import { PrintCanvas as APCanvas } from './print-canvas.jsx';
import { RUI } from './controls.jsx';
import { Inspector } from './inspector.jsx';
import { Topbar, SaveStatus } from './topbar.jsx';
import { Library } from './library.jsx';
import { useDoc } from './use-doc.js';
import { useStorage } from './use-storage.js';
import { useViewport } from './use-viewport.js';
import { useKeys, usePaste } from './use-keys.js';
import { useLibrary } from './use-library.js';
import { useExport } from './use-export.js';
import { usePreflight } from './use-preflight.js';

/* ---------- boot: the stored doc is async now (IndexedDB) ----------
   Root waits for PrintDocs.load() — a few ms — and only then mounts the app,
   so the first render IS the saved sheet and the autosave never gets a chance
   to write the starter doc over it. */
function Root(){
  const [boot, setBoot] = React.useState(null);
  React.useEffect(()=>{
    let live = true;
    const p = PrintDocs ? PrintDocs.load() : Promise.resolve({ doc:null, tpls:null, backend:'none' });
    p.catch(e=>({ doc:null, tpls:null, backend:'none', error:e })).then(r=>{ if(live) setBoot(r); });
    return ()=>{ live=false; };
  }, []);
  if(!boot) return <div className="ps-boot">Reality · Print Studio</div>;
  return <App boot={boot} />;
}

/* ---------- app ---------- */
function App({ boot }){
  const D = useDoc(boot.doc);
  const { doc, setDoc, docRef, selectedIds, setSelectedIds, selIdsRef, selectedId, sel, hist } = D;
  const { undo, redo } = hist;
  const dims = apDims(doc.size, doc.orient);

  const store = useStorage(boot, { doc, docRef, hist });
  const view = useViewport(dims);
  useKeys({ docRef, selIdsRef, setDoc, setSelectedIds, undo, redo });
  usePaste({ docRef, selIdsRef, setDoc, setSelectedIds, updateEl:D.updateEl });
  const lib = useLibrary({ docRef, setDoc, setSelectedIds, userTpls:store.userTpls, persistTpls:store.persistTpls, view });
  const ex = useExport({ docRef, setSelectedIds });
  const pf = usePreflight({ doc, dims, storeErr:store.storeErr, setSelectedIds });

  /* layouts measured in JS (fitted headlines, the coupon stack) read the webfont
     off a canvas — repaint once the faces land so a cold load isn't laid out
     against the fallback metrics. */
  const [, fontsIn] = React.useState(0);
  React.useEffect(()=>{ if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>fontsIn(1)).catch(()=>{}); }, []);

  /* a new paper size rescales the layout in place, then refits the view */
  const onResize = (sz)=>{ D.resize(sz); view.fit(); };
  const gridS = gridSpec(doc, dims);

  /* Ctrl-K. The palette searches every inspector label the Fold index has
     harvested, plus these — the sheet-level commands that live in the topbar
     and are otherwise only reachable by aiming at a 10px segmented button. */
  const [palOpen, setPalOpen] = RUI.usePalette();
  React.useEffect(()=>{
    RUI.setActions([].concat(
      AP_ORD.map(sz=>({ label:'Size · '+AP_SZ[sz].label+' ('+AP_SZ[sz].mm.join('×')+' mm)', group:'Sheet', run:()=>onResize(sz) })),
      [{ label:'Orientation · Portrait', group:'Sheet', run:()=>setDoc(d=>({...d, orient:'portrait'})) },
       { label:'Orientation · Landscape', group:'Sheet', run:()=>setDoc(d=>({...d, orient:'landscape'})) }],
      AP_ACC.map(a=>({ label:'Accent · '+a, group:'Sheet', run:()=>setDoc(d=>({...d, accent:a})) })),
      [{ label:'Export · Trim only (exact '+AP_SZ[doc.size].label+')', group:'Sheet', run:()=>setDoc(d=>({...d, withBleed:false})) },
       { label:'Export · With 3 mm bleed + crop marks', group:'Sheet', run:()=>setDoc(d=>({...d, withBleed:true})) }],
      [{ label:'Toggle bleed guide on canvas', group:'View', run:()=>setDoc(d=>({...d, showBleed:!d.showBleed})) },
       { label:'Toggle layout grid', group:'View', run:()=>setDoc(d=>({...d, showGrid:!d.showGrid})) },
       { label:'Toggle snap', group:'View', run:()=>setDoc(d=>({...d, snap:!d.snap})) },
       { label:'Toggle hints', group:'View', run:()=>RUI.setHints(!RUI.hintsOn()) },
       { label:'Zoom to fit', group:'View', run:view.fit },
       { label:'Undo', group:'Edit', run:undo },
       { label:'Redo', group:'Edit', run:redo },
       { label:'Save PDF — 1 up', group:'Export', run:()=>ex.onExport('single') },
       { label:'Save PDF — gang on A4', group:'Export', run:()=>ex.onExport('gang') }]
    ));
  }, [doc.size, doc.orient, doc.showBleed, doc.showGrid, doc.snap]);

  return (
    <div className="ps-app">
      <Topbar doc={doc} setDoc={setDoc} onResize={onResize} onExport={ex.onExport} exporting={ex.exporting} exportMsg={ex.exportMsg}
        zoomPct={view.zoomPct} onZoomFit={view.fit} onZoomStep={view.zoomStep}
        canUndo={hist.canUndo} canRedo={hist.canRedo} onUndo={undo} onRedo={redo}
        preflight={pf.items} onPickIssue={pf.pickIssue} pastTrim={pf.pastTrim} status={<SaveStatus st={store} />} />
      <div className="ps-body">
        <Library userTpls={store.userTpls} onApplyTemplate={lib.applyTemplate} onApplyUserTpl={lib.applyUserTpl}
          onDeleteUserTpl={lib.delUserTpl} onSaveUserTpl={lib.saveUserTpl} onStartSpawn={lib.startSpawn} />

        <APCanvas elements={doc.elements} wpt={dims.wpt} hpt={dims.hpt} accent={doc.accent}
          grid={gridS} bleedPt={3*AP_PPM} showGrid={doc.showGrid} showBleed={doc.showBleed} snap={doc.snap}
          scale={view.scale} stageRef={view.stageRef} canvasRef={view.canvasRef}
          selectedId={selectedId} selectedIds={selectedIds} onSelect={D.select}
          onChange={D.updateEl} onChangeMany={D.updateMany} onCommit={()=>{}} onZoomWheel={view.zoomWheel} />

        <div className="ps-inspector">
          <Inspector el={sel} doc={doc} dims={dims} update={D.update} dup={D.dup} del={D.del} layer={D.layer}
            clearAll={D.clearAll} setDoc={setDoc} selCount={selectedIds.length} align={D.alignSel} distribute={D.distributeSel} />
        </div>
      </div>
      {lib.spawn && <div className="ps-ghost" style={{ left:lib.spawn.x, top:lib.spawn.y }}>{lib.spawn.type}</div>}
      {palOpen && <RUI.Palette onClose={()=>setPalOpen(false)} />}
      {(ex.exportErr || ex.exportNote) && <div className={'ps-toast'+(ex.exportErr?' bad':'')} role="alert">
        <span>{ex.exportErr || ex.exportNote}</span>
        <button className="ps-statx" onClick={ex.dismiss} title="Dismiss">×</button>
      </div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root/>);
