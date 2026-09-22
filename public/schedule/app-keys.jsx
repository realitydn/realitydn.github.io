/* ============================================================
   REALITY SCHEDULE STUDIO — app · useKeys: the keyboard
   Undo / redo, Delete on the selected event, Esc to deselect.
   ============================================================ */
import { historyKey } from '../studio-shared/history.js';
import { confirmDelete } from './app-controls.jsx';
import { deleteEventFromDoc as a_delEvent } from './schedule-data.jsx';

function useKeys({ selId, setSelId, docRef, setDoc, undo, redo }){
  /* Keyboard: Ctrl/⌘+Z undo · Ctrl/⌘+Shift+Z or Ctrl+Y redo · Delete/Backspace
     removes the selected event (a weekly series asks first) · Esc deselects —
     from a field it first drops focus, pressed again it deselects. None of it
     fires while typing in a field: there, Ctrl+Z is the field's own undo. */
  const selRef = React.useRef(selId); selRef.current = selId;
  React.useEffect(()=>{
    function onKey(e){
      const ae = document.activeElement;
      const typing = ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA' || ae.tagName==='SELECT' || ae.isContentEditable);
      if(historyKey(e, undo, redo)) return;
      if(e.key==='Escape'){
        if(typing){ ae.blur(); return; }
        if(selRef.current) setSelId(null);
        return;
      }
      if(e.key!=='Delete' && e.key!=='Backspace') return;
      const id = selRef.current; if(!id) return;
      if(typing) return;
      e.preventDefault();
      const ev = docRef.current.events.filter(x=>x.id===id)[0];
      if(!confirmDelete(ev)) return;
      setDoc(d=>a_delEvent(d, id));
      setSelId(null);
    }
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [undo, redo]);
}

export { useKeys };
