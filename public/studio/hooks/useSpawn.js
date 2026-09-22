/* ============================================================
   REALITY POSTER STUDIO — useSpawn
   Dragging (or clicking) a part out of the library onto the poster.
   ============================================================ */
import { DEFAULTS as AP_DEF, FORMATS as AP_FMT, STEP, pointToMaster as apToMaster, makeElement as apMake } from '../studio-data.jsx';
function useSpawn({ stageRef, canvasRef, scaleRef, docRef, setDoc, setSelectedIds }){
  const [spawn, setSpawn] = React.useState(null);

  /* spawn-drag from library — always adds to Master (mapped from drop point).
     A CLICK (no real travel, released back in the library) used to do nothing
     at all: it "missed" the stage. It now drops the part in the middle of the
     canvas you're looking at — the obvious thing for a click to mean. */
  function startSpawn(e, item){
    e.preventDefault();
    const type = item.type, preset = item.preset||null;
    const x0 = e.clientX, y0 = e.clientY;
    let travelled = false;
    setSpawn({ type:item.label||type, x:e.clientX, y:e.clientY });
    function mv(ev){
      if(Math.abs(ev.clientX-x0)>4 || Math.abs(ev.clientY-y0)>4) travelled = true;
      setSpawn(s=> s?{...s, x:ev.clientX, y:ev.clientY}:s); }
    function done(){
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', done);
      setSpawn(null);
    }
    function up(ev){
      done();
      const st = stageRef.current, cv = canvasRef.current; if(!st||!cv) return;
      const sr = st.getBoundingClientRect();
      const onStage = !(ev.clientX<sr.left||ev.clientX>sr.right||ev.clientY<sr.top||ev.clientY>sr.bottom);
      if(!onStage && travelled) return;                       // dragged out and let go elsewhere — a miss
      const cr = cv.getBoundingClientRect(), sc = scaleRef.current, d = AP_DEF[type], dd = docRef.current;
      const pw = (preset&&preset.w!=null)?preset.w:d.w, ph = (preset&&preset.h!=null)?preset.h:d.h;
      const vfmt = AP_FMT[dd.activeFormat==='master'?dd.masterFormat:dd.activeFormat];
      let vx = onStage ? (ev.clientX-cr.left)/sc - pw/2 : vfmt.w/2 - pw/2,
          vy = onStage ? (ev.clientY-cr.top)/sc - ph/2 : vfmt.h/2 - ph/2;
      if(dd.snap){ vx=Math.round(vx/STEP)*STEP; vy=Math.round(vy/STEP)*STEP; }
      const vf = dd.activeFormat==='master'?dd.masterFormat:dd.activeFormat;
      const m = apToMaster(type, vx, vy, dd.masterFormat, vf);
      const el = apMake(type, Math.round(m.x), Math.round(m.y));
      if(preset) Object.assign(el, JSON.parse(JSON.stringify(preset)));
      setDoc(x=>({ ...x, elements:[...x.elements, el] }));
      setSelectedIds([el.id]);
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', done);
  }

  return { spawn, startSpawn };
}

export { useSpawn };
