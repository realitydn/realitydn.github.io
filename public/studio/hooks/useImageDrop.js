/* ============================================================
   REALITY POSTER STUDIO — useImageDrop
   ============================================================ */
import { looksLikeImage } from '../../studio-shared/image-intake.jsx';
import { takePhoto } from '../photos.js';
import { DEFAULTS as AP_DEF, STEP, pointToMaster as apToMaster, makeElement as apMake } from '../studio-data.jsx';
function useImageDrop({ stageRef, canvasRef, scaleRef, docRef, setDoc, setSelectedIds, resolvedRef, updateElRef, exportingRef, say }){
  /* ---- drag-and-drop images ----
     The empty canvas has always said "DROP YOUR PHOTO", and nothing listened:
     the browser took the drop itself and NAVIGATED to the image, throwing the
     Studio (and, before the IndexedDB autosave, anything unsaved) away.
     Now every file drag is caught at the window, so a drop that misses can
     never navigate — and on the stage it does what the words say:
       • onto a photo (or logo) → replaces its image, like Ctrl-V;
       • anywhere else on the stage → a new photo, centred where it landed.
     Same processImageFile as upload and paste (through photos.js takePhoto, so
     the photo lands as a reference), so the same 2000px cap and the same
     message for a file the browser can't open. */
  React.useEffect(()=>{
    const isFiles = (e)=>{ const t = e.dataTransfer && e.dataTransfer.types;
      return !!t && Array.prototype.indexOf.call(t, 'Files')>=0; };
    const overStage = (e)=>{ const st = stageRef.current; if(!st) return false;
      const r = st.getBoundingClientRect();
      return e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom; };
    const mark = (on)=>{ const st = stageRef.current; if(st) st.classList.toggle('dropping', !!on); };
    function onOver(e){
      if(!isFiles(e)) return;
      e.preventDefault();
      const on = overStage(e);
      e.dataTransfer.dropEffect = on ? 'copy' : 'none';
      mark(on);
    }
    function onLeave(e){ if(!e.relatedTarget) mark(false); }   // left the window
    function onDrop(e){
      if(!isFiles(e)) return;
      e.preventDefault();
      mark(false);
      if(!overStage(e)){ say('Drop images onto the poster.'); return; }
      const files = Array.prototype.slice.call(e.dataTransfer.files||[]);
      const file = files.find(looksLikeImage);
      if(!file){ say(files.length ? 'That isn’t an image — drop a JPEG, PNG or WebP.' : 'Nothing to drop.'); return; }
      if(exportingRef.current) return;
      /* What's under the pointer: the element wrapper carries data-elid. */
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const box = hit && hit.closest ? hit.closest('[data-elid]') : null;
      const target = box ? resolvedRef.current.find(x=>x.id===box.getAttribute('data-elid')) : null;
      if(target && (target.type==='photo' || target.type==='logo')){
        takePhoto(file, ({ data:src })=>{ const fn=updateElRef.current; if(fn) fn(target.id, { src });
          setSelectedIds([target.id]); }, m=>window.alert(m));
        return;
      }
      /* A new photo, its box centred on the drop point — mapped from the view
         you're in back to Master, exactly like dragging a part in. */
      const cv = canvasRef.current; if(!cv) return;
      const cr = cv.getBoundingClientRect(), sc = scaleRef.current, d = AP_DEF.photo;
      const px = (e.clientX-cr.left)/sc, py = (e.clientY-cr.top)/sc;
      takePhoto(file, ({ data:src })=>{
        const dd = docRef.current;
        let vx = px - d.w/2, vy = py - d.h/2;
        if(dd.snap){ vx=Math.round(vx/STEP)*STEP; vy=Math.round(vy/STEP)*STEP; }
        const vf = dd.activeFormat==='master'?dd.masterFormat:dd.activeFormat;
        const m = apToMaster('photo', vx, vy, dd.masterFormat, vf);
        const el = Object.assign(apMake('photo', Math.round(m.x), Math.round(m.y)), { src });
        setDoc(x=>({ ...x, elements:[...x.elements, el] }));
        setSelectedIds([el.id]);
      }, m=>window.alert(m));
    }
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return ()=>{
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [say]);
}

export { useImageDrop };
