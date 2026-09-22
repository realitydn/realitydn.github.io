/* ============================================================
   REALITY PRINT STUDIO — useViewport: zoom + pan
   ------------------------------------------------------------
   The stage and canvas refs, the fit scale (recomputed whenever
   the stage or the sheet changes size), the zoom (null = fit) and
   how you move around a zoomed sheet:
     · Space-drag or middle-drag pans (the stage scrolls; a part
       under the pointer is never picked up while panning);
     · Ctrl/⌘-wheel (and a trackpad pinch) zooms about the cursor —
       the point under the pointer stays under it;
     · the topbar's − / + step about the middle of the view;
     · the % button, Ctrl/⌘-0 and "Zoom to fit" fit AND re-centre.
   The pan is the stage's own scroll position, so nothing about it
   is stored — it never reaches the doc, the undo history or a PDF.
   (Split out of print-app.jsx, Phase 3; panning added with it.)
   ============================================================ */

const ZOOMS = [0.1,0.15,0.25,0.35,0.5,0.65,0.8,1,1.25,1.5,2,3,4];

function isTyping(){
  const ae = document.activeElement;
  return !!(ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'||ae.isContentEditable));
}

function useViewport(dims){
  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [fitScale, setFitScale] = React.useState(0.5);
  const [zoom, setZoom] = React.useState(null);           // null = fit
  const scale = zoom!=null ? zoom : fitScale;
  const scaleRef = React.useRef(scale); scaleRef.current = scale;
  const fitRef = React.useRef(fitScale); fitRef.current = fitScale;
  const zoomRef = React.useRef(zoom); zoomRef.current = zoom;

  React.useLayoutEffect(()=>{
    function recompute(){ const s=stageRef.current; if(!s) return; const pad=110;
      setFitScale(Math.max(0.05, Math.min((s.clientWidth-pad)/dims.wpt, (s.clientHeight-pad)/dims.hpt))); }
    recompute();
    const ro = new ResizeObserver(recompute); if(stageRef.current) ro.observe(stageRef.current);
    return ()=>ro.disconnect();
  }, [dims.wpt, dims.hpt]);

  /* ---- keeping a point still across a zoom. `anchor` is the sheet point (pt)
     that should stay at a screen position (clientX/Y) once the new scale has
     laid out; `centre` asks for the sheet to be centred instead (every fit). */
  const anchor = React.useRef(null);
  function centre(){
    const st = stageRef.current; if(!st) return;
    st.scrollLeft = Math.max(0, (st.scrollWidth-st.clientWidth)/2);
    st.scrollTop  = Math.max(0, (st.scrollHeight-st.clientHeight)/2);
  }
  function anchorAt(clientX, clientY){
    const cv = canvasRef.current; if(!cv) return;
    const r = cv.getBoundingClientRect(), s = scaleRef.current;
    anchor.current = { px:(clientX-r.left)/s, py:(clientY-r.top)/s, clientX, clientY };
  }
  function anchorMiddle(){
    const st = stageRef.current; if(!st) return;
    const r = st.getBoundingClientRect();
    anchorAt(r.left+st.clientWidth/2, r.top+st.clientHeight/2);
  }
  React.useLayoutEffect(()=>{
    const a = anchor.current; anchor.current = null;
    if(zoom==null){ centre(); return; }       // fit (or a refit on resize) is always centred
    const st = stageRef.current, cv = canvasRef.current; if(!a || !st || !cv) return;
    const r = cv.getBoundingClientRect();
    st.scrollLeft += (r.left + a.px*scale) - a.clientX;
    st.scrollTop  += (r.top  + a.py*scale) - a.clientY;
  }, [scale, zoom==null]);

  /* zoom controls */
  const fit = ()=>{ anchor.current = null; if(zoomRef.current==null) centre(); else setZoom(null); };
  const zoomStep = (dir)=>{ anchorMiddle(); setZoom(z=>{
    const cur = z!=null?z:fitRef.current;
    let i = 0; for(let k=0;k<ZOOMS.length;k++){ if(Math.abs(ZOOMS[k]-cur)<Math.abs(ZOOMS[i]-cur)) i=k; }
    if(ZOOMS[i]<=cur && dir>0) i++; else if(ZOOMS[i]>=cur && dir<0) i--;
    i = Math.max(0, Math.min(ZOOMS.length-1, dir>0?Math.max(i, 0):i));
    return ZOOMS[Math.max(0, Math.min(ZOOMS.length-1, i))];
  }); };
  /* Ctrl/⌘-wheel from the canvas, with the pointer it happened at */
  const zoomWheel = React.useCallback((deltaY, clientX, clientY)=>{
    if(clientX!=null) anchorAt(clientX, clientY); else anchorMiddle();
    setZoom(z=>{
      const cur = z!=null?z:fitRef.current;
      return Math.max(0.08, Math.min(4, cur*Math.exp(-deltaY*0.0012)));
    });
  }, []);
  const zoomPct = Math.round(scale*100)+'%';

  /* ---- panning. Space held (not while typing) arms it — the stage shows a
     grab hand — and a drag then scrolls the stage; the middle button pans
     any time. Listeners sit on the stage in the CAPTURE phase and stop the
     event there, so the canvas never sees the press: no part is picked up,
     moved or deselected by a pan. ---- */
  React.useEffect(()=>{
    const st = stageRef.current; if(!st) return;
    let space = false, pan = null;
    const arm = (on)=>{ space = on; st.classList.toggle('ps-panready', on); };
    function onKeyDown(e){
      /* Ctrl/⌘-0 — fit and re-centre (the browser's zoom reset stays on the menu) */
      if((e.ctrlKey||e.metaKey) && !e.altKey && (e.key==='0' || e.code==='Digit0' || e.code==='Numpad0') && !isTyping()){
        e.preventDefault(); fit(); return;
      }
      if(e.code!=='Space' && e.key!==' ') return;
      if(isTyping()) return;
      e.preventDefault();                          // no page scroll, no button press
      if(!space) arm(true);
    }
    function onKeyUp(e){
      if(e.code!=='Space' && e.key!==' ') return;
      if(space) e.preventDefault();
      arm(false);
    }
    function onBlur(){ arm(false); }
    function onDown(e){
      const middle = e.button===1;
      if(!middle && !(space && e.button===0)) return;
      e.preventDefault(); e.stopPropagation();
      pan = { x:e.clientX, y:e.clientY, l:st.scrollLeft, t:st.scrollTop, id:e.pointerId };
      st.classList.add('ps-panning');
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);
    }
    function onMove(e){
      if(!pan || e.pointerId!==pan.id) return;
      e.preventDefault(); e.stopPropagation();
      st.scrollLeft = pan.l - (e.clientX - pan.x);
      st.scrollTop  = pan.t - (e.clientY - pan.y);
    }
    function onUp(e){
      if(!pan || e.pointerId!==pan.id) return;
      e.stopPropagation();
      pan = null; st.classList.remove('ps-panning');
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
    }
    /* the middle button's own default — Windows autoscroll — goes too */
    function onMouseDown(e){ if(e.button===1) e.preventDefault(); }
    st.addEventListener('pointerdown', onDown, true);
    st.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return ()=>{
      st.removeEventListener('pointerdown', onDown, true);
      st.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
    };
  }, []);

  return { stageRef, canvasRef, scale, scaleRef, zoom, fit, zoomStep, zoomWheel, zoomPct };
}

export { useViewport };
