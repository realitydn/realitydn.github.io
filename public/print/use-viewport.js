/* ============================================================
   REALITY PRINT STUDIO — useViewport: zoom
   ------------------------------------------------------------
   The stage and canvas refs, the fit scale (recomputed whenever
   the stage or the sheet changes size), the zoom (null = fit), the
   topbar's −/fit/+ steps and Ctrl/⌘-wheel zoom.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */

const ZOOMS = [0.1,0.15,0.25,0.35,0.5,0.65,0.8,1,1.25,1.5,2,3,4];

function useViewport(dims){
  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [fitScale, setFitScale] = React.useState(0.5);
  const [zoom, setZoom] = React.useState(null);           // null = fit
  const scale = zoom!=null ? zoom : fitScale;
  const scaleRef = React.useRef(scale); scaleRef.current = scale;
  const fitRef = React.useRef(fitScale); fitRef.current = fitScale;

  React.useLayoutEffect(()=>{
    function recompute(){ const s=stageRef.current; if(!s) return; const pad=110;
      setFitScale(Math.max(0.05, Math.min((s.clientWidth-pad)/dims.wpt, (s.clientHeight-pad)/dims.hpt))); }
    recompute();
    const ro = new ResizeObserver(recompute); if(stageRef.current) ro.observe(stageRef.current);
    return ()=>ro.disconnect();
  }, [dims.wpt, dims.hpt]);

  /* zoom controls */
  const fit = ()=> setZoom(null);
  const zoomStep = (dir)=> setZoom(z=>{
    const cur = z!=null?z:fitRef.current;
    let i = 0; for(let k=0;k<ZOOMS.length;k++){ if(Math.abs(ZOOMS[k]-cur)<Math.abs(ZOOMS[i]-cur)) i=k; }
    if(ZOOMS[i]<=cur && dir>0) i++; else if(ZOOMS[i]>=cur && dir<0) i--;
    i = Math.max(0, Math.min(ZOOMS.length-1, dir>0?Math.max(i, 0):i));
    return ZOOMS[Math.max(0, Math.min(ZOOMS.length-1, i))];
  });
  const zoomWheel = React.useCallback((deltaY)=>{
    setZoom(z=>{
      const cur = z!=null?z:fitRef.current;
      return Math.max(0.08, Math.min(4, cur*Math.exp(-deltaY*0.0012)));
    });
  }, []);
  const zoomPct = Math.round(scale*100)+'%';

  return { stageRef, canvasRef, scale, scaleRef, zoom, fit, zoomStep, zoomWheel, zoomPct };
}

export { useViewport };
