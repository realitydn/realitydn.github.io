/* ============================================================
   REALITY POSTER STUDIO — usePhotoSweep
   The blob store's garbage collection. A photo is stored once and
   referenced from everywhere, so replacing or deleting one no longer
   frees anything by itself; once per load this lets go of the images
   nothing refers to any more.

   It runs only when every holder of references read cleanly — the
   working doc (bootState.clean), the library (lib.libClean: the v2
   templates, after this load's pick-up from the old build) — and then
   keeps anything referenced by:
     the working doc on screen · the localStorage fallback copy ·
     this tab's undo/redo history · every v2 template · Recently deleted
   and only deletes images nothing has stored for a day (a photo pasted
   a minute ago in another tab, or replaced and still one Ctrl-Z away in
   a tab that has since closed, survives).

   Never while another Poster Studio tab is open: its history and its
   unsaved edits hold references this tab can't see. Tabs of THIS build
   answer on the 'reality-poster-studio' BroadcastChannel (store.js
   watchOtherTabs); a tab of an older build doesn't — and doesn't need
   to, since it never reads the blob store.
   ============================================================ */
import { watchOtherTabs } from '../../studio-shared/store.js';
import { RStore } from '../studio-store.js';
import { Photos, refsOf } from '../photos.js';
import { loadLegacyDoc } from '../doc.js';

const DAY_MS = 24*3600*1000;
const SWEEP_DELAY_MS = 4000;   // after the hello on the channel has had its answers

function usePhotoSweep({ docRef, hist, libClean, bootClean }){
  const tabs = React.useRef(null);
  React.useEffect(()=>{
    tabs.current = watchOtherTabs({ channel:'reality-poster-studio', onChange:()=>{} });
    return ()=>{ tabs.current.stop(); tabs.current = null; };
  }, []);

  const done = React.useRef(false);
  React.useEffect(()=>{
    if(done.current || !libClean) return;
    if(!bootClean){ done.current = true; console.info('[studio] photo sweep skipped — the working doc was not read from storage cleanly.'); return; }
    const t = setTimeout(async ()=>{
      done.current = true;
      if(tabs.current && tabs.current.peers()>0){
        console.info('[studio] photo sweep skipped — another Poster Studio tab is open.');
        return;
      }
      try{
        const keep = new Set();
        refsOf(docRef.current, keep);
        refsOf(loadLegacyDoc(), keep);
        hist.snapshots().forEach(d=>refsOf(d, keep));
        (await RStore.tplGetAll()).forEach(tp=>refsOf(tp && tp.doc, keep));
        (await RStore.binGetAll()).forEach(b=>refsOf(b && b.tpl && b.tpl.doc, keep));
        const r = await Photos.gc(keep, { minAgeMs: DAY_MS });
        if(r.deleted || r.released) console.info('[studio] photo sweep: removed '+r.deleted+' unused image'+(r.deleted===1?'':'s')
          +(r.released ? ' (+'+r.released+' kept for another Studio)' : '')+'; '+r.kept+' kept.');
      }catch(e){ console.warn('[studio] photo sweep skipped', e); }
    }, SWEEP_DELAY_MS);
    return ()=>clearTimeout(t);
  }, [libClean, bootClean]);
}

export { usePhotoSweep };
