/* ============================================================
   REALITY POSTER STUDIO — useArrange
   ============================================================ */
import { FORMATS as AP_FMT } from '../studio-data.jsx';
function useArrange({ selectedIds, resolved, updateEl, viewFormat }){
  /* ============================================================
     ARRANGE — align · distribute · centre on canvas.

     All three read the RESOLVED boxes (what you actually see in the
     format on screen) and write back through updateEl, so the edit is
     routed exactly like dragging a box: in Master it moves Master, in
     an output format it lands as that format's override.

     Deliberately NOT snapped to the grid even when Snap is on — the
     whole point of "centre" and "distribute" is the exact number, and
     rounding it to the 45px step (STEP) would put it visibly off.
     ============================================================ */
  function selBoxes(){ return selectedIds.map(id=>resolved.find(e=>e.id===id)).filter(Boolean); }

  /* Align to a shared edge/line — the Swiss vertical (and horizontal).
     Operates on the selection's own bounding box. */
  function alignSel(axis, mode){
    const items = selBoxes();
    if(items.length<2) return;
    const x0=Math.min(...items.map(e=>e.x)), x1=Math.max(...items.map(e=>e.x+e.w));
    const y0=Math.min(...items.map(e=>e.y)), y1=Math.max(...items.map(e=>e.y+e.h));
    items.forEach(e=>{
      if(axis==='x'){
        const nx = mode==='left'? x0 : mode==='right'? x1-e.w : (x0+x1)/2 - e.w/2;
        updateEl(e.id, { x: Math.round(nx) });
      } else {
        const ny = mode==='top'? y0 : mode==='bottom'? y1-e.h : (y0+y1)/2 - e.h/2;
        updateEl(e.id, { y: Math.round(ny) });
      }
    });
  }

  /* Distribute — the two extremes stay put and everything between them is
     respaced. Two readings, because they differ the moment the boxes aren't
     the same size:
       'gaps'    even GAPS between edges — what the eye reads as even rhythm
                 for a row of mixed-width chips.
       'centres' even spacing of CENTRES — what you want when the boxes are
                 icons/marks on a grid and the gaps should vary.
     Needs 3+ (with 2 there is nothing between the extremes to move). */
  function distributeSel(axis, mode){
    const items = selBoxes();
    if(items.length<3) return;
    const P = axis==='x' ? 'x' : 'y', S = axis==='x' ? 'w' : 'h';
    const sorted = items.slice().sort((a,b)=> (a[P]+a[S]/2) - (b[P]+b[S]/2));
    if(mode==='centres'){
      const c0 = sorted[0][P]+sorted[0][S]/2;
      const last = sorted[sorted.length-1];
      const c1 = last[P]+last[S]/2;
      const step = (c1-c0)/(sorted.length-1);
      sorted.forEach((e,i)=>{ if(i===0||i===sorted.length-1) return;
        updateEl(e.id, { [P]: Math.round(c0 + i*step - e[S]/2) }); });
    } else {
      const start = Math.min(...sorted.map(e=>e[P]));
      const end   = Math.max(...sorted.map(e=>e[P]+e[S]));
      const span  = sorted.reduce((n,e)=>n+e[S], 0);
      const gap   = (end - start - span) / (sorted.length - 1);   // may go negative on overlaps — that's the honest result
      let cur = start;
      sorted.forEach((e,i)=>{
        if(i && i<sorted.length-1) updateEl(e.id, { [P]: Math.round(cur) });
        cur += e[S] + gap;
      });
    }
  }

  /* Centre on the canvas. One box centres itself; several centre as a GROUP —
     the selection's bounding box lands on the canvas centre and every box
     keeps its place within it. (The safe square is itself centred on the
     canvas, so canvas-centre and safe-centre are the same point — no second
     control needed.) */
  function centreSel(axis){
    const items = selBoxes();
    if(!items.length) return;
    const f = AP_FMT[viewFormat];
    const x0=Math.min(...items.map(e=>e.x)), x1=Math.max(...items.map(e=>e.x+e.w));
    const y0=Math.min(...items.map(e=>e.y)), y1=Math.max(...items.map(e=>e.y+e.h));
    const dx = f.w/2 - (x0+x1)/2, dy = f.h/2 - (y0+y1)/2;
    items.forEach(e=>{
      const patch = {};
      if(axis!=='y') patch.x = Math.round(e.x + dx);
      if(axis!=='x') patch.y = Math.round(e.y + dy);
      updateEl(e.id, patch);
    });
  }

  return { alignSel, distributeSel, centreSel };
}

export { useArrange };
