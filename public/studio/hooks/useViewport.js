/* ============================================================
   REALITY POSTER STUDIO — useViewport
   ============================================================ */
import { FORMATS as AP_FMT } from '../studio-data.jsx';
function useViewport({ stageRef, viewFormat }){
  const [scale, setScale] = React.useState(0.4);
  const scaleRef = React.useRef(scale); scaleRef.current = scale;
  /* Zoom. The stage has always fitted the poster to the pane and left it there,
     which is fine until you're nudging a 6px inset on a 1080px canvas rendered
     at 0.4. `fit` stays the auto-computed scale; `zoom` multiplies it, and
     changing format or resizing the pane refits without discarding the zoom. */
  const [fit, setFit] = React.useState(0.4);
  const [zoom, setZoom] = React.useState(1);
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
  React.useEffect(()=>{ setScale(fit*zoom); }, [fit, zoom]);
  const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3];
  const zoomStep = (dir)=>setZoom(z=>{
    const i = ZOOMS.findIndex(v=>v>z+0.001);
    const at = dir>0 ? (i<0 ? ZOOMS.length-1 : i)
                     : (i<=0 ? 0 : (Math.abs(ZOOMS[i-1]-z)<0.001 ? Math.max(0,i-2) : i-1));
    return ZOOMS[Math.max(0, Math.min(ZOOMS.length-1, at))];
  });
  const zoomPct = Math.round(fit*zoom*100)+'%';

  return { scale, scaleRef, zoomPct, zoomStep, setZoom };
}

export { useViewport };
