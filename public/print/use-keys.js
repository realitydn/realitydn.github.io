/* ============================================================
   REALITY PRINT STUDIO — useKeys + usePaste: the keyboard
   ------------------------------------------------------------
   Window-level keys (undo / redo through history.js historyKey,
   select all, duplicate, delete, nudge, Esc) — ignored while typing
   in a field — and pasted images: onto the selected photo frame, or
   as a new image part centred on the sheet.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { historyKey } from '../studio-shared/history.js';
import { processImageFile, imageFromClipboard } from '../studio-shared/image-intake.jsx';
import { uid as apUid } from '../studio-shared/util.js';
import { PrintImg } from './print-store.js';
import { sizeDims as apDims } from './print-paper.js';
import { DEFAULTS as AP_DEF, makeElement as apMake } from './print-data.jsx';

/* ---- keyboard: delete, undo/redo, duplicate, select-all, nudge, esc ---- */
function useKeys({ docRef, selIdsRef, setDoc, setSelectedIds, undo, redo }){
  React.useEffect(()=>{
    function onKey(e){
      const ae = document.activeElement;
      const typing = ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'||ae.isContentEditable);
      const mod = e.ctrlKey||e.metaKey;
      if(historyKey(e, undo, redo)) return;
      if(typing) return;
      const ids = selIdsRef.current;
      if(mod && (e.key==='a'||e.key==='A')){ e.preventDefault(); setSelectedIds(docRef.current.elements.map(x=>x.id)); return; }
      if(mod && (e.key==='d'||e.key==='D')){ e.preventDefault();
        if(!ids.length) return;
        const cur=docRef.current; const copies=[];
        ids.forEach(id=>{ const src=cur.elements.find(x=>x.id===id); if(src){ const c=Object.assign(JSON.parse(JSON.stringify(src)),{id:apUid(), x:src.x+12, y:src.y+12}); copies.push(c); } });
        if(copies.length){ setDoc(d=>({ ...d, elements:[...d.elements, ...copies] })); setSelectedIds(copies.map(c=>c.id)); }
        return; }
      if(e.key==='Escape'){ setSelectedIds([]); return; }
      if(e.key==='Delete'||e.key==='Backspace'){
        if(!ids.length) return;
        e.preventDefault();
        setDoc(d=>({ ...d, elements:d.elements.filter(x=>ids.indexOf(x.id)<0) })); setSelectedIds([]);
        return;
      }
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown'){
        if(!ids.length) return;
        e.preventDefault();
        const st = e.shiftKey?10:1;
        const dx = e.key==='ArrowLeft'?-st : e.key==='ArrowRight'?st : 0;
        const dy = e.key==='ArrowUp'?-st : e.key==='ArrowDown'?st : 0;
        setDoc(d=>({ ...d, elements:d.elements.map(x=> ids.indexOf(x.id)>=0 ? {...x, x:x.x+dx, y:x.y+dy} : x) }));
        return;
      }
    }
    window.addEventListener('keydown', onKey); return ()=>window.removeEventListener('keydown', onKey);
  }, [undo, redo]);
}

/* ---- pasted images ---- */
function usePaste({ docRef, selIdsRef, setDoc, setSelectedIds, updateEl }){
  React.useEffect(()=>{
    function onPaste(e){
      const file = imageFromClipboard(e.clipboardData); if(!file) return;
      const ae=document.activeElement; if(ae && (ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable)) return;
      e.preventDefault();
      processImageFile(file, ({data,w,h})=>{
        if(!PrintImg) return;
        PrintImg.add(data,w,h).then(id=>{
          const cur=docRef.current, ids=selIdsRef.current, selEl=cur.elements.find(x=>x.id===ids[ids.length-1]);
          if(selEl && selEl.type==='image'){ updateEl(selEl.id, { imgId:id, h: selEl.imgId?selEl.h:Math.max(20,Math.round(selEl.w*h/w)) }); return; }
          const dd=apDims(cur.size,cur.orient), elw=Math.min(AP_DEF.image.w, Math.round(dd.wpt-40)), elh=Math.max(20,Math.round(elw*h/w));
          const ne=apMake('image', Math.round((dd.wpt-elw)/2), 60); ne.w=elw; ne.h=elh; ne.imgId=id;
          setDoc(x=>({ ...x, elements:[...x.elements, ne] })); setSelectedIds([ne.id]);
        });
      });
    }
    window.addEventListener('paste', onPaste); return ()=>window.removeEventListener('paste', onPaste);
  }, []);
}

export { useKeys, usePaste };
