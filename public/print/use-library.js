/* ============================================================
   REALITY PRINT STUDIO — useLibrary: templates + dragged parts
   ------------------------------------------------------------
   What the library column does to the sheet: drag a part out
   (the ghost that follows the pointer, dropped where it lands, on
   the snap step), apply a starter template or one of "My
   templates" (switching bleed on for a flood), save the sheet as a
   template, delete one.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { uid as apUid } from '../studio-shared/util.js';
import { sizeDims as apDims } from './print-paper.js';
import { DEFAULTS as AP_DEF, makeElement as apMake } from './print-data.jsx';
import { buildTemplate as apBuildTpl } from './print-templates.js';
import { artPastTrim as apPastTrim, migrateElements as apMigrate } from './print-preflight.js';

function useLibrary({ docRef, setDoc, setSelectedIds, userTpls, persistTpls, view }){
  const { stageRef, canvasRef, scaleRef } = view;
  const [spawn, setSpawn] = React.useState(null);

  /* spawn-drag from library */
  function startSpawn(e, item){
    e.preventDefault();
    const type = item.type;
    setSpawn({ type:item.label||type, x:e.clientX, y:e.clientY });
    function mv(ev){ setSpawn(s=> s?{...s, x:ev.clientX, y:ev.clientY}:s); }
    function up(ev){
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); setSpawn(null);
      const st=stageRef.current, cv=canvasRef.current; if(!st||!cv) return;
      const sr=st.getBoundingClientRect();
      if(ev.clientX<sr.left||ev.clientX>sr.right||ev.clientY<sr.top||ev.clientY>sr.bottom) return;
      const cr=cv.getBoundingClientRect(), sc=scaleRef.current, d=AP_DEF[type];
      let vx=(ev.clientX-cr.left)/sc - d.w/2, vy=(ev.clientY-cr.top)/sc - d.h/2;
      if(docRef.current.snap){ vx=Math.round(vx/6)*6; vy=Math.round(vy/6)*6; }
      const el=apMake(type, Math.round(vx), Math.round(vy));
      setDoc(x=>({ ...x, elements:[...x.elements, el] })); setSelectedIds([el.id]);
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }

  function applyTemplate(tpl){
    if(docRef.current.elements.length && !window.confirm('Replace the current sheet with the “'+tpl.name+'” layout?')) return;
    const b = apBuildTpl(tpl);
    /* A flood template runs its colour 12pt past the trim — which only prints
       if the PDF carries bleed. withBleed defaults OFF, so applying one used to
       hand over a trim-only file that guillotines to white slivers. Floods
       switch it on (the Trim/Bleed control shows it; switch back if the shop
       wants trim-only); anything else leaves the choice as it was. */
    const floods = apPastTrim(b.elements, apDims(b.size, b.orient)).length>0;
    setDoc(d=>({ ...d, size:b.size, orient:b.orient, accent:b.accent, elements:b.elements, withBleed: floods ? true : d.withBleed })); setSelectedIds([]); view.fit();
  }
  function saveUserTpl(){
    const d=docRef.current; if(!d.elements.length){ window.alert('Nothing on the sheet to save yet.'); return; }
    const name=(window.prompt('Save this sheet as a template called:', d.title||'My layout')||'').trim(); if(!name) return;
    const snap=JSON.parse(JSON.stringify({ size:d.size, orient:d.orient, accent:d.accent, elements:d.elements }));
    const existing=userTpls.find(t=>t.name.toLowerCase()===name.toLowerCase());
    const t={ id: existing?existing.id:apUid(), name, savedAt:Date.now(), doc:snap };
    const next = existing ? userTpls.map(p=>p.id===t.id?t:p) : [t, ...userTpls];
    persistTpls(next);
  }
  function applyUserTpl(t){
    if(docRef.current.elements.length && !window.confirm('Replace the current sheet with “'+t.name+'”?')) return;
    const snap=JSON.parse(JSON.stringify(t.doc)); snap.elements = apMigrate(snap.elements); snap.elements.forEach(e=>{ e.id=apUid(); });
    const floods = apPastTrim(snap.elements, apDims(snap.size, snap.orient)).length>0;   // same rule as applyTemplate
    setDoc(d=>({ ...d, size:snap.size, orient:snap.orient, accent:snap.accent, elements:snap.elements, withBleed: floods ? true : d.withBleed })); setSelectedIds([]); view.fit();
  }
  function delUserTpl(id){ persistTpls(userTpls.filter(x=>x.id!==id)); }

  return { spawn, startSpawn, applyTemplate, saveUserTpl, applyUserTpl, delUserTpl };
}

export { useLibrary };
