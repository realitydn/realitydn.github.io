/* ============================================================
   REALITY POSTER STUDIO — useKeys
   The keyboard, and Ctrl/⌘-V onto a selected photo.
   ============================================================ */
import { historyKey } from '../../studio-shared/history.js';
import { imageFromClipboard, processImageFile } from '../../studio-shared/image-intake.jsx';
import { FORMATS as AP_FMT, STEP, uid } from '../studio-data.jsx';
import { NUDGE } from '../doc.js';
function useKeys({ undo, redo, say, docRef, setDoc, setSelectedIds, selIdsRef, selRef, updateElRef, resolvedRef, actionsRef }){
  /* Keyboard. Nothing here fires while you're typing in an inspector field
     (bar the save/export chords, which blur the field first so its value
     commits), nor while a dialog is up. */
  React.useEffect(()=>{
    function onKey(e){
      if(document.querySelector('.rs-overlay')) return;     // the event picker has the keyboard
      const ae = document.activeElement;
      const typing = ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'||ae.isContentEditable);
      const mod = e.ctrlKey||e.metaKey;
      if(historyKey(e, undo, redo)) return;
      /* Ctrl-S keeps the poster as a template (never the browser's "save page"),
         Ctrl-E saves the images. Both work from inside a field: blur it first so
         whatever you just typed — the poster name, usually — is committed, then
         act once React has rendered it. */
      if(mod && !e.altKey && (e.key==='s'||e.key==='S'||e.key==='e'||e.key==='E')){
        e.preventDefault();
        if(e.repeat) return;
        const save = e.key==='s'||e.key==='S';
        if(typing && ae.blur) ae.blur();
        setTimeout(()=>{ const A = actionsRef.current;
          if(save) A.saveTpl && A.saveTpl(); else A.exportImages && A.exportImages(); }, 0);
        return;
      }
      if(typing) return;
      const ids = selIdsRef.current;

      if(mod && (e.key==='a'||e.key==='A')){ e.preventDefault(); setSelectedIds(docRef.current.elements.map(x=>x.id)); return; }
      if(mod && (e.key==='d'||e.key==='D')){
        e.preventDefault();
        if(!ids.length) return;
        const cur = docRef.current, copies = [];
        ids.forEach(id=>{ const src = cur.elements.find(x=>x.id===id);
          if(src) copies.push(Object.assign(JSON.parse(JSON.stringify(src)), { id:uid(), x:src.x+40, y:src.y+40 })); });
        if(copies.length){ setDoc(d=>({ ...d, elements:[...d.elements, ...copies] })); setSelectedIds(copies.map(c=>c.id)); }
        return;
      }
      if(e.key==='Escape'){ setSelectedIds([]); return; }

      /* [ and ] step the selected box back / forward one layer; with Shift
         (which types { and }) all the way to the back / front. */
      if(!mod && (e.key==='['||e.key===']'||e.key==='{'||e.key==='}')){
        if(!ids.length) return;
        e.preventDefault();
        const L = actionsRef.current.layer; if(!L) return;
        L(e.key==='[' ? -1 : e.key===']' ? 1 : e.key==='{' ? 'back' : 'front');
        return;
      }

      if(e.key==='Delete' || e.key==='Backspace'){
        if(!ids.length) return;
        e.preventDefault();
        /* On an output format, Delete HIDES the box in that format — the same
           thing the inspector's Visibility · Hidden does. It used to delete the
           element from Master, i.e. from every format, without a word, while
           you were looking at just one of them. Master still deletes. */
        const cur = docRef.current;
        if(cur.activeFormat!=='master'){
          const up = updateElRef.current;
          ids.forEach(id=>up && up(id, { hidden:true }));
          const lab = (AP_FMT[cur.activeFormat]||{}).label || cur.activeFormat;
          say('Hidden in '+lab+' only — it’s still in every other format. Delete on Master removes it everywhere; Visibility in the inspector brings it back here.', 4600);
          return;
        }
        setDoc(d=>{ const overrides=Object.assign({}, d.overrides);
          Object.keys(overrides).forEach(f=>{ let fo=overrides[f]; if(!fo) return; let changed=false;
            ids.forEach(id=>{ if(fo[id]){ if(!changed){ fo=Object.assign({},fo); changed=true; } delete fo[id]; } });
            if(changed) overrides[f]=fo; });
          return {...d, elements:d.elements.filter(e=>ids.indexOf(e.id)<0), overrides};
        });
        setSelectedIds([]);
        return;
      }

      if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown'){
        if(!ids.length) return;
        e.preventDefault();
        /* A small nudge (NUDGE, a ninth of a step), or with Shift one whole grid
           step — so Shift-arrows move along the same armature a drag snaps to.
           (This used to say "6px = one grid step"; the step has been 45 since
           the 23.08 grid, so Shift's 30 landed off it every time.) */
        const st = e.shiftKey ? STEP : NUDGE;
        const dx = e.key==='ArrowLeft'?-st : e.key==='ArrowRight'?st : 0;
        const dy = e.key==='ArrowUp'?-st : e.key==='ArrowDown'?st : 0;
        const up = updateElRef.current;
        ids.forEach(id=>{ const r = resolvedRef.current.find(x=>x.id===id);
          if(r) up(id, { x:r.x+dx, y:r.y+dy }); });
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [undo, redo, say]);

  /* Ctrl/⌘-V over a selected photo replaces its image — same downscale → JPEG
     pipeline as the upload button. Ignored while typing in an inspector field,
     or when the selection isn't a photo (so text paste is never hijacked). */
  React.useEffect(()=>{
    function onPaste(e){
      const el = selRef.current;
      if(!el || el.type!=='photo') return;
      const ae = document.activeElement;
      if(ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA' || ae.tagName==='SELECT' || ae.isContentEditable)) return;
      const file = imageFromClipboard(e.clipboardData);
      if(!file) return;
      e.preventDefault();
      processImageFile(file, ({ data:src })=>{ const fn=updateElRef.current; if(fn) fn(el.id, { src }); }, m=>window.alert(m));
    }
    window.addEventListener('paste', onPaste);
    return ()=>window.removeEventListener('paste', onPaste);
  }, []);
}

export { useKeys };
