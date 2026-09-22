/* ============================================================
   REALITY SCHEDULE STUDIO — app · the preview: sizing, fit, scale, capacity
   Per-day text sizing edits, the rendered-fit report the preview sends
   up, the stage scale, and the capacity message under the stage.
   ============================================================ */
import { DAY_ABBR as A_DA, dWeekday as a_wd } from './schedule-data.jsx';
import { computeStackSizing } from './schedule-render.jsx';

/* per-day text sizing view for the current channel (Stories / Feed, stacked looks) */
function useSizing(doc, channelId, setDoc){
  const sizeInfo = React.useMemo(()=>computeStackSizing(doc, channelId), [doc, channelId]);
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
  return { sizeInfo, setDaySize, setBaseSize, resetSizes };
}

/* rendered truth, beats the estimate: the preview reports whether it fits */
function useRenderedFit(doc, channelId, partIdx, dailyVariant){
  const [fitReport, setFitReport] = React.useState(null);
  const reportRef = React.useRef(null);
  React.useEffect(()=>{ reportRef.current = null; setFitReport(null); }, [doc, channelId, partIdx, dailyVariant]);
  const onFitReport = React.useCallback(r=>{
    const prev = reportRef.current;
    if(prev && prev.over===r.over && prev.level===r.level && prev.denIdx===r.denIdx) return;
    reportRef.current = r; setFitReport(r);
  }, []);
  return [fitReport, onFitReport];
}

function useStageScale(stageRef, size){
  const [scale, setScale] = React.useState(0.3);
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
  return scale;
}

/* capacity message for the bar under the stage */
function capacityMessage({ fitReport, capacity, channelId, dailyVariant }){
  /* the rendered preview reports its measured truth — trust it over estimates */
  if(fitReport){
    /* A cover is one day on one canvas — there is no split to move, so the
       carousel's advice is noise there. What actually helps is a layout that
       gives the list the full width. */
    if(fitReport.over) return { tone:'over', text: channelId==='daily' && dailyVariant==='cover'
      ? 'Over capacity — rows are being cut off. Banner, Sidebar or Flood give the list more room on a heavy day; or shorten titles, or hide a row on this channel.'
      : 'Over capacity — rows are being cut off. Move a split on the day strip, shorten titles, or hide a row on this channel.' };
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
}

export { useSizing, useRenderedFit, useStageScale, capacityMessage };
