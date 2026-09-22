/* ============================================================
   REALITY POSTER STUDIO — useViewport
   Zoom and pan of the stage. Nothing here ever reaches an export:
   the captures render the canvas node with transform:none (see
   hooks/useExport.js), so the view is only ever how you're LOOKING.
   ============================================================ */
import { FORMATS as AP_FMT } from '../studio-data.jsx';

/* The zoom ladder the − / ＋ buttons step along, as multiples of `fit`. The
   wheel zooms continuously between its two ends. */
const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3];
const ZOOM_MIN = ZOOMS[0], ZOOM_MAX = ZOOMS[ZOOMS.length-1];
/* However far you pan, this much of the poster (screen px) stays on the stage,
   so it can never be flung off into the dark. */
const PAN_KEEP = 80;

function useViewport({ stageRef, viewFormat }){
  /* Zoom. The stage has always fitted the poster to the pane and left it there,
     which is fine until you're nudging a 6px inset on a 1080px canvas rendered
     at 0.4. `fit` stays the auto-computed scale; `zoom` multiplies it, and
     changing format or resizing the pane refits without discarding the zoom. */
  const [fit, setFit] = React.useState(0.4);
  /* …and PAN. The poster used to be pinned to the centre of a stage that clips
     its overflow, so at 150–300% its corners simply could not be reached.
     x / y are screen px the poster's centre sits off the stage's centre. Zoom
     and pan are ONE state, so zooming about the pointer moves both in a single
     render and the point under it stays put. */
  const [view, setView] = React.useState({ zoom:1, x:0, y:0 });
  React.useLayoutEffect(()=>{
    function recompute(){
      const s = stageRef.current; if(!s) return;
      const pad = 96, f = AP_FMT[viewFormat];
      setFit(Math.min((s.clientWidth-pad)/f.w, (s.clientHeight-pad)/f.h));
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    if(stageRef.current) ro.observe(stageRef.current);
    return ()=>ro.disconnect();
  }, [viewFormat]);
  const scale = fit*view.zoom;
  const scaleRef = React.useRef(scale); scaleRef.current = scale;
  const viewRef = React.useRef(view); viewRef.current = view;
  const liveRef = React.useRef(null); liveRef.current = { fit, fmt:viewFormat };

  /* Zoom into range, and the pan into the range that keeps PAN_KEEP px of the
     poster on the stage at that zoom. */
  const clampView = React.useCallback((v)=>{
    const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.zoom));
    const st = stageRef.current, f = AP_FMT[liveRef.current.fmt];
    if(!st || !f) return { zoom, x:v.x, y:v.y };
    const s = liveRef.current.fit*zoom;
    const mx = Math.max(0, (f.w*s + st.clientWidth)/2 - PAN_KEEP);
    const my = Math.max(0, (f.h*s + st.clientHeight)/2 - PAN_KEEP);
    return { zoom, x:Math.max(-mx, Math.min(mx, v.x)), y:Math.max(-my, Math.min(my, v.y)) };
  }, []);
  /* Zoom to next(zoom) about a point given in stage px from the stage's
     centre: the design point under it stays where it is on screen. */
  const zoomAbout = React.useCallback((next, cx, cy)=>setView(v=>{
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next(v.zoom))), k = z/v.zoom;
    return clampView({ zoom:z, x:cx-(cx-v.x)*k, y:cy-(cy-v.y)*k });
  }), [clampView]);

  /* − / ＋ step the ladder about the middle of the stage; the % between them
     fits the poster and re-centres it. */
  const zoomStep = (dir)=>zoomAbout(z=>{
    const i = ZOOMS.findIndex(v=>v>z+0.001);
    const at = dir>0 ? (i<0 ? ZOOMS.length-1 : i)
                     : (i<=0 ? 0 : (Math.abs(ZOOMS[i-1]-z)<0.001 ? Math.max(0,i-2) : i-1));
    return ZOOMS[Math.max(0, Math.min(ZOOMS.length-1, at))];
  }, 0, 0);
  const zoomFit = React.useCallback(()=>setView({ zoom:1, x:0, y:0 }), []);
  const zoomPct = Math.round(scale*100)+'%';

  /* The gestures, on the stage itself:
       Space held + drag, or a middle-button drag — pan;
       Ctrl/⌘ + wheel (a trackpad pinch arrives as this too) — zoom about the pointer;
       a plain wheel while zoomed in — scroll the poster (⇧ for sideways).
     A pan grab is taken in the CAPTURE phase and stopped there, so the element
     under the pointer never sees it: nothing is selected, dragged or deselected. */
  const zoomAboutRef = React.useRef(zoomAbout); zoomAboutRef.current = zoomAbout;
  React.useEffect(()=>{
    const st = stageRef.current; if(!st) return;
    let space = false, panning = false;
    const mark = ()=>{ st.classList.toggle('rs-panready', space && !panning); st.classList.toggle('rs-panning', panning); };
    const typing = ()=>{ const ae = document.activeElement;
      return !!ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'||ae.isContentEditable); };
    const isSpace = (e)=> e.code==='Space' || e.key===' ';
    function onKeyDown(e){
      if(!isSpace(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if(typing() || document.querySelector('.rs-overlay')) return;   // a field or the event picker has it
      e.preventDefault();                  // no page scroll, and no click on a focused button
      if(!space){ space = true; mark(); }
    }
    function onKeyUp(e){ if(isSpace(e) && space){ space = false; mark(); } }
    function onBlur(){ space = false; mark(); }
    function onPointerDown(e){
      if(!(e.button===1 || (e.button===0 && space))) return;
      e.preventDefault(); e.stopPropagation();
      const x0 = e.clientX, y0 = e.clientY, v0 = viewRef.current;
      panning = true; mark();
      const move = (ev)=>setView(clampView({ zoom:v0.zoom, x:v0.x+ev.clientX-x0, y:v0.y+ev.clientY-y0 }));
      const end = ()=>{ panning = false; mark();
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end); };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    }
    /* the middle button's own default is the browser's autoscroll */
    function onMouseDown(e){ if(e.button===1) e.preventDefault(); }
    function onWheel(e){
      const k = e.deltaMode===1 ? 16 : e.deltaMode===2 ? st.clientHeight : 1;   // lines / pages → px
      if(e.ctrlKey || e.metaKey){
        e.preventDefault();                // not the browser's page zoom
        const r = st.getBoundingClientRect();
        const cx = e.clientX - (r.left + r.width/2), cy = e.clientY - (r.top + r.height/2);
        const dy = e.deltaY*k;
        zoomAboutRef.current(z=>z*Math.exp(-dy*0.0015), cx, cy);
        return;
      }
      if(viewRef.current.zoom <= 1.0001) return;   // at fit (or under) the whole poster is on screen
      e.preventDefault();
      let dx = e.deltaX*k, dy = e.deltaY*k;
      if(e.shiftKey && !dx){ dx = dy; dy = 0; }
      setView(v=>clampView({ zoom:v.zoom, x:v.x-dx, y:v.y-dy }));
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    st.addEventListener('pointerdown', onPointerDown, true);
    st.addEventListener('mousedown', onMouseDown, true);
    st.addEventListener('wheel', onWheel, { passive:false });
    return ()=>{
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      st.removeEventListener('pointerdown', onPointerDown, true);
      st.removeEventListener('mousedown', onMouseDown, true);
      st.removeEventListener('wheel', onWheel, { passive:false });
    };
  }, []);

  return { scale, scaleRef, pan:{ x:view.x, y:view.y }, zoomPct, zoomStep, zoomFit };
}

export { useViewport };
