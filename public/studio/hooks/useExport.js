/* ============================================================
   REALITY POSTER STUDIO — useExport
   Save Images (PNG / JPG / PDF / ZIP) and the cloud send to an event's poster slots.
   ============================================================ */
import { RCloud } from '../../studio-shared/cloud.js';
import { slugify } from '../../studio-shared/util.js';
import { FORMATS as AP_FMT, OUTPUT_FORMATS as AP_OUT } from '../studio-data.jsx';
import { storyStem } from '../doc.js';
import { queueKey, fetchFeedRetry } from '../feed.js';
function useExport({ doc, docRef, viewFormat, canvasRef, setSelectedIds, setDocQuiet, queueFeed, setQueueSent, cloudSignIn }){
  const [exporting, setExporting] = React.useState(false);
  const exportingRef = React.useRef(false); exportingRef.current = exporting;   // for window-level handlers
  const [plateOnly, setPlateOnly] = React.useState(false);   // image-only/text-less render for the 'feed' slot
  const [exportMsg, setExportMsg] = React.useState('');

  /* ---- export — Save Images. Scope follows the active view (an output format
     exports just itself; Master exports every format), the file type comes from
     the toolbar select, and filenames come from the poster name:
       "Board Game Night" →  board-game-night-4x5.png        (single format)
                             board-game-night-poster.zip     (Master, png/jpg)
                             board-game-night-poster.pdf     (Master, pdf — one page per format)
     No name falls back to the old reality-poster-* names. ---- */
  /* Wait until the on-screen canvas PROVABLY shows `fmt` before capturing: poll
     the data-fmt commit sentinel, then two rAFs (one fully painted frame), then
     the old fixed wait as a floor for the async riso photo repaint. A blind fixed
     wait loses this race on a busy main thread and the capture bakes the PREVIOUS
     format's layout into the render (the 2026-07 mixed-layout square1x1 bug). */
  async function settleFormat(fmt, floorMs){
    const until = performance.now() + 5000;
    while(performance.now() < until){
      const node = canvasRef.current;
      if(node && node.dataset && node.dataset.fmt === fmt) break;
      await new Promise(r=>setTimeout(r, 40));
    }
    /* two rAFs = one fully painted frame — but rAF never fires in a hidden/
       backgrounded tab, so race it against a timeout or the export hangs */
    await new Promise(r=>{ let done=false; const fin=()=>{ if(!done){ done=true; r(); } };
      requestAnimationFrame(()=>requestAnimationFrame(fin)); setTimeout(fin, 300); });
    await new Promise(r=>setTimeout(r, floorMs));
  }

  async function doExport(titleArg){
    if(exporting || !window.htmlToImage) return;
    const kind = doc.exportFormat || 'png';
    const slug = slugify(titleArg!=null ? titleArg : (doc.title||''));
    const base = slug || 'reality-poster';
    /* Print views (A1, standees) carry a `print:{wmm,hmm,dpi}` descriptor and
       capture at true print resolution — e.g. A1 is 3508px wide (594mm @
       150dpi), an 80×200 standee 4724px wide. The ratio rides the `exporting`
       flag as a number so riso photos and grainy blocks repaint 1:1 with the
       capture grid (no soft upscale). */
    const printDef = (AP_FMT[doc.activeFormat]||{}).print;
    const printRatio = printDef ? Math.round(printDef.wmm/25.4*printDef.dpi) / AP_FMT[doc.activeFormat].w : 0;
    setSelectedIds([]); setExporting(printRatio || true); setExportMsg('Rendering…');
    const bg = doc.theme==='night' ? '#0a0703' : '#fffbf1';
    const capture = (f, type, ratio)=>{
      const node=canvasRef.current;
      const opts={ width:f.w, height:f.h, pixelRatio:ratio||2, cacheBust:true, backgroundColor:bg,
        style:{ transform:'none', left:'0px', top:'0px', margin:'0', position:'static' } };
      return type==='jpg' ? window.htmlToImage.toJpeg(node, Object.assign({quality:0.95}, opts))
                          : window.htmlToImage.toPng(node, opts);
    };
    const dl = (href, name)=>{ const a=document.createElement('a'); a.href=href; a.download=name; document.body.appendChild(a); a.click(); a.remove(); };
    const JS = window.jspdf && window.jspdf.jsPDF;
    try{
      if(doc.activeFormat!=='master'){
        /* single format — exactly the view on screen */
        await settleFormat(viewFormat, printRatio?420:140);   // print-res riso repaints need longer
        const f=AP_FMT[viewFormat], name=storyStem(viewFormat, base, doc.accent);
        if(kind==='pdf'){
          const url=await capture(f, null, printRatio||null);
          /* Print PDFs (A1, standees) are made at real-world size in mm so a
             print shop runs them 1:1; screen formats keep the px-sized page. */
          const pdf = printDef
            ? new JS({ unit:'mm', format:[printDef.wmm,printDef.hmm], orientation: printDef.wmm>printDef.hmm?'landscape':'portrait' })
            : new JS({ unit:'px', format:[f.w,f.h], orientation: f.w>f.h?'landscape':'portrait', hotfixes:['px_scaling'] });
          /* 'FAST' = lossless FLATE on the embedded raster — without a
             compression arg jsPDF stores it raw and one page tops 20MB.
             FAST over SLOW: same pixels, ~0.7MB larger, no multi-second
             main-thread stall per page (matters for the 5-page master). */
          if(printDef) pdf.addImage(url,'PNG',0,0,printDef.wmm,printDef.hmm,undefined,'FAST');
          else pdf.addImage(url,'PNG',0,0,f.w,f.h,undefined,'FAST');
          pdf.save(name+'.pdf');
        } else {
          dl(await capture(f, kind, printRatio||null), name+'.'+kind);
        }
      } else {
        /* Master — every output format: zip of images, or one multi-page PDF */
        const prev = doc.activeFormat;
        const zip = kind!=='pdf' ? new window.JSZip() : null;
        let pdf = null;
        /* The view flips through every format and MUST come back, whatever
           happens: a capture that threw used to skip the restore and strand you
           on the last format with no idea why. The flips are quiet (see
           setDocQuiet) — they're not edits and don't belong in undo. */
        try{
          for(const fmt of AP_OUT){
            setExportMsg('Rendering '+AP_FMT[fmt].label+'…');
            setDocQuiet(d=>({ ...d, activeFormat:fmt }));
            await settleFormat(fmt, 380);   // sentinel + painted frame + riso-repaint floor
            const f = AP_FMT[fmt];
            if(kind==='pdf'){
              const url = await capture(f);
              if(!pdf) pdf = new JS({ unit:'px', format:[f.w,f.h], orientation: f.w>f.h?'landscape':'portrait', hotfixes:['px_scaling'] });
              else pdf.addPage([f.w,f.h], f.w>f.h?'l':'p');
              pdf.addImage(url,'PNG',0,0,f.w,f.h,undefined,'FAST');
            } else {
              const url = await capture(f, kind);
              zip.file(storyStem(fmt, base, doc.accent)+'.'+kind, url.split(',')[1], { base64:true });
            }
          }
        }finally{
          setDocQuiet(d=>({ ...d, activeFormat:prev }));
        }
        if(kind==='pdf'){
          pdf.save((slug? slug+'-poster' : 'reality-posters')+'.pdf');
        } else {
          setExportMsg('Zipping…');
          const blob = await zip.generateAsync({ type:'blob' });
          dl(URL.createObjectURL(blob), (slug? slug+'-poster' : 'reality-posters')+'.zip');
        }
      }
    }catch(err){ console.error('export failed', err); setExportMsg('Export failed'); await new Promise(r=>setTimeout(r,1400)); }
    setExporting(false); setExportMsg('');
  }

  /* ---- WP9 poster write-back — "Export to event…". Renders the studio formats
     to blobs and POSTs them onto an event's poster slots via RCloud.putPoster
     (replacing the old Poster Manager publish loop). Format → slot:
       4x5  → poster4x5   (the designed 4:5 poster)
       9x16 → story
       1x1  → square1x1
       4x5  → feed        (the text-less FEED SLICE: a horizontal band of the image
                           only — the strip that fills the calendar's "This week" cards)
     Strictly additive: nothing here touches the local export path; all guarded.
     Photos are embedded inline as data URLs (content-addressing OUT OF SCOPE —
     TODO(WP9): content-address photos so big posters don't bloat R2). ---- */
  const EVENT_SLOTS = [
    { fmt:'4x5',  slot:'poster4x5' },
    { fmt:'9x16', slot:'story' },
    { fmt:'1x1',  slot:'square1x1' },
    { fmt:'4x5',  slot:'feed', plate:true },   // image-only / text-less render
  ];
  const [eventPicker, setEventPicker] = React.useState(null);   // null | { open, loading, events, err }
  async function openEventPicker(){
    if(!RCloud){ return; }
    if(!RCloud.isSignedIn()){
      await cloudSignIn();
      if(!RCloud.isSignedIn()){ window.alert('Cloud sign-in is needed to export to an event. (Stayed local-only.)'); return; }
    }
    /* the event this poster was queued for (if any) gets pinned first in the picker */
    const origin = docRef.current.eventRef || null;
    setEventPicker({ open:true, loading:true, events:[], err:null, origin });
    try{
      const today = new Date(Date.now()+7*3600*1000).toISOString().slice(0,10);   // ICT date
      const feed = await fetchFeedRetry({ from: today });
      const events = (feed && Array.isArray(feed.events)) ? feed.events : [];
      setEventPicker({ open:true, loading:false, events, err: feed ? null : 'Feed not available — the hub may be mid-deploy or the connection blipped.', origin });
    }catch(e){
      setEventPicker({ open:true, loading:false, events:[], err:'Could not load the events feed.', origin });
    }
  }
  /* scope: 'one' (this date) | 'series' (every upcoming date of the series).
     The picker only offers the choice when the target actually repeats. */
  async function exportToEvent(eventId, scope){
    if(exporting || !window.htmlToImage || !RCloud) return;
    /* grab the picker's feed rows before closing it — the post-send message needs
       to know whether the target belongs to a series, and the fan-out fallback
       needs the sibling dates */
    const pickedFrom = (eventPicker && eventPicker.events) || [];
    setEventPicker(null);
    const feedRows = pickedFrom.length ? pickedFrom : ((queueFeed && queueFeed.events) || []);
    const target = feedRows.find(e=>e.id===eventId) || null;
    const wantSeries = scope==='series' && !!(target && target.seriesId);
    /* The other upcoming dates of this series, soonest first. Only walked on the
       FALLBACK path: a hub that understands scope=series answers seriesForced,
       having already stamped the series default and every date in one write. */
    const siblings = wantSeries
      ? feedRows.filter(e=>e.seriesId===target.seriesId && e.id!==eventId)
          .sort((a,b)=>String(a.startsAt||'').localeCompare(String(b.startsAt||'')))
      : [];
    const prev = doc.activeFormat;
    setSelectedIds([]); setExporting(true);
    const bg = doc.theme==='night' ? '#0a0703' : '#fffbf1';
    const toBlob = (f)=>{
      const node=canvasRef.current;
      const opts={ width:f.w, height:f.h, pixelRatio:2, cacheBust:true, backgroundColor:bg,
        style:{ transform:'none', left:'0px', top:'0px', margin:'0', position:'static' } };
      return window.htmlToImage.toBlob(node, opts);
    };
    // The feed slice: capture only the chosen band of the 4:5 master — shift the
    // canvas up by the band's top, capture the band's height. Photo-only via plateOnly,
    // so the output is a small text-less strip (storage/bandwidth win).
    const toBlobSlice = ()=>{
      const node=canvasRef.current, f=AP_FMT['4x5'];
      const sl=doc.feedSlice||{ yFrac:0.4, hFrac:0.2 };
      const by=Math.round((sl.yFrac||0)*f.h), bh=Math.max(1, Math.round((sl.hFrac||0.2)*f.h));
      const opts={ width:f.w, height:bh, pixelRatio:2, cacheBust:true, backgroundColor:bg,
        style:{ transform:`translateY(${-by}px)`, left:'0px', top:'0px', margin:'0', position:'static' } };
      return window.htmlToImage.toBlob(node, opts);
    };
    let ok = 0, failed = 0, wideHits = 0, forcedHits = 0, fanFailed = 0;
    const fanned = {};   // sibling ids that took at least one slot on the fallback path
    try{
      for(const m of EVENT_SLOTS){
        const label = m.plate ? 'image-only' : AP_FMT[m.fmt].label;
        setExportMsg('Rendering '+label+'…');
        if(m.plate) setPlateOnly(true);
        setDocQuiet(d=>({ ...d, activeFormat:m.fmt }));   // a view flip, not an edit
        await settleFormat(m.fmt, m.plate?440:380);   // sentinel + painted frame + riso-repaint floor
        let blob = null;
        try{ blob = await (m.plate ? toBlobSlice() : toBlob(AP_FMT[m.fmt])); }catch(e){ blob = null; }
        if(m.plate) setPlateOnly(false);
        if(!blob){ failed++; continue; }
        /* Downscale the 2x render to its base px and re-encode for upload. WebP by
           default; story + square1x1 stay JPEG — story for Instagram's share intake,
           square1x1 because it's the event's OG/social share image and Facebook /
           Zalo / iMessage render WebP link previews unreliably. The hub feed,
           the app, and danang.community serve THIS file — full-res PNGs remain in
           the local Save/export path. On any encode failure the raw render goes
           up unchanged, exactly as before. */
        let up = { blob, type: blob.type || 'image/png' };
        try{
          if(RCloud.optimizeImage){
            const f = AP_FMT[m.fmt];
            const sl = doc.feedSlice || { yFrac:0.4, hFrac:0.2 };
            const th = m.plate ? Math.max(1, Math.round((sl.hFrac||0.2)*f.h)) : f.h;
            up = await RCloud.optimizeImage(blob, f.w, th,
              (m.slot==='story' || m.slot==='square1x1') ? { prefer:'image/jpeg' } : undefined);
          }
        }catch(e){ /* keep the raw render */ }
        setExportMsg('Uploading '+label+'…');
        const res = await RCloud.putPoster(eventId, m.slot, up.blob, up.type,
          wantSeries ? { scope:'series' } : undefined);
        if(res && res.ok){ ok++; if(res.seriesWide) wideHits++; if(res.seriesForced) forcedHits++; }
        else { failed++; continue; }
        /* Fallback for a hub deployed before scope=series: it stamped at most the
           non-detached dates, so push the same bytes onto each sibling by hand.
           Costs one upload per date — it stops happening the moment the hub starts
           answering seriesForced. */
        if(wantSeries && !res.seriesForced){
          for(let i=0;i<siblings.length;i++){
            setExportMsg(label+' — date '+(i+2)+' of '+(siblings.length+1)+'…');
            const r2 = await RCloud.putPoster(siblings[i].id, m.slot, up.blob, up.type, { scope:'series' });
            if(r2 && r2.ok) fanned[siblings[i].id] = 1; else fanFailed++;
          }
        }
      }
      setDocQuiet(d=>({ ...d, activeFormat:prev }));
      if(ok){
        /* the event now has a poster — take it (and its weekly series) off the queue */
        const hit = ((queueFeed && queueFeed.events) || []).find(e=>e.id===eventId);
        const k = hit ? queueKey(hit) : eventId;
        setQueueSent(s=>Object.assign({}, s, { [k]:1 }));
      }
      /* A send onto a series instance normally stamps the whole series (the hub
         answers seriesWide). It DOESN'T when that instance is hand-edited — a
         detached date keeps its own artwork, so the other dates quietly keep the
         old poster. Say so, or it reads as "the update didn't work"; "All N dates"
         is the way past it. Each outcome gets its own line — none of them can be
         inferred from the canvas, so silence here is what made this confusing. */
      const isSeries = !!(target && target.seriesId);
      const seriesRun = wantSeries && ok>0;
      const dates = forcedHits ? (siblings.length+1) : (Object.keys(fanned).length+1);
      const oneDateOnly = ok>0 && !wantSeries && isSeries && wideHits===0;
      const wentWide    = ok>0 && !wantSeries && isSeries && wideHits>0;
      const lost = failed + fanFailed;
      setExportMsg(!ok ? 'Export to event failed'
        : seriesRun   ? ('Sent to '+dates+' date'+(dates===1?'':'s')+' in the series'+(lost?(' · '+lost+' failed'):''))
        : oneDateOnly ? 'Sent to THIS DATE only — the rest of the series keeps its old poster'
        : wentWide    ? 'Sent to the event — this series shares one poster, so every date took it'
        : ('Sent '+ok+' image'+(ok===1?'':'s')+' to the event'+(failed?(' · '+failed+' failed'):'')));
      await new Promise(r=>setTimeout(r, ok?((oneDateOnly||wentWide||seriesRun)?3400:1600):1800));
    }catch(err){
      console.error('export-to-event failed', err);
      setPlateOnly(false);
      setDocQuiet(d=>({ ...d, activeFormat:prev }));
      setExportMsg('Export to event failed'); await new Promise(r=>setTimeout(r,1600));
    }
    setExporting(false); setExportMsg('');
  }

  return { exporting, exportingRef, exportMsg, plateOnly, doExport, eventPicker, setEventPicker, openEventPicker, exportToEvent };
}

export { useExport };
