/* ============================================================
   REALITY PRINT STUDIO — useExport: Save PDF / Gang on A4
   ------------------------------------------------------------
   Asks before exporting photos that would print blank, runs the
   exporter (print-imposition.js PrintExport), downloads the file,
   and keeps what went wrong on screen until it's dismissed.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { slugify as apSlug } from '../studio-shared/util.js';
import { PrintImg } from './print-store.js';
import { SIZES as AP_SZ, GANG as AP_GANG } from './print-paper.js';
import { PrintExport } from './print-imposition.js';

function dl(bytes, name){
  const blob = new Blob([bytes], { type:'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}

function useExport({ docRef, setSelectedIds }){
  const [exporting, setExporting] = React.useState(false);
  const [exportMsg, setExportMsg] = React.useState('');
  /* export problems stay until dismissed — they used to vanish after 1.8 s */
  const [exportErr, setExportErr] = React.useState(null);
  const [exportNote, setExportNote] = React.useState(null);

  /* fetch the TTFs early, so the first Save PDF doesn't wait on them */
  React.useEffect(()=>{ if(PrintExport) PrintExport.ready().catch(()=>{}); }, []);

  async function onExport(mode){
    if(exporting || !PrintExport) return;
    const d = docRef.current;
    /* photos that would print as blank boxes — ask before making a broken PDF
       rather than after (the preflight shows them too) */
    const imgs = d.elements.filter(e=>e.type==='image');
    if(imgs.length && PrintImg){
      const miss = [];
      for(const e of imgs){
        if(!e.imgId){ miss.push('an empty image frame'); continue; }
        const m = await PrintImg.meta(e.imgId).catch(()=>null);
        if(!m) miss.push('a photo missing from storage');
      }
      if(miss.length && !window.confirm(miss.length+' image'+(miss.length===1?'':'s')+' will print as a blank white box:\n\n  · '+miss.join('\n  · ')
          +'\n\nRe-upload '+(miss.length===1?'it':'them')+' first, or export anyway?')) return;
    }
    setSelectedIds([]); setExporting(true); setExportErr(null); setExportNote(null);
    const base = apSlug(d.title) || 'reality-print';
    try{
      if(mode==='gang'){
        setExportMsg('Ganging '+AP_SZ[d.size].label+'…');
        const bytes = await PrintExport.gang(d, { marks:true });
        dl(bytes, base+'-'+d.size+'-x'+AP_GANG[d.size].per+'-a4.pdf');
      } else {
        setExportMsg('Rendering '+AP_SZ[d.size].label+'…');
        const withBleed = d.withBleed===true;
        const bytes = await PrintExport.single(d, { bleed:withBleed, marks:true });
        dl(bytes, base+'-'+d.size+(withBleed?'-bleed':'')+'.pdf');
      }
      /* what the exporter could not draw — said out loud, kept until dismissed */
      const rep = PrintExport.report ? PrintExport.report() : null;
      if(rep && (rep.missingImages.length || rep.failed.length)){
        const bits = [];
        if(rep.missingImages.length) bits.push(rep.missingImages.length+' image'+(rep.missingImages.length===1?'':'s')+' printed as blank boxes');
        if(rep.failed.length) bits.push(rep.failed.length+' part'+(rep.failed.length===1?'':'s')+' failed to draw ('+rep.failed.map(f=>f.type).join(', ')+')');
        setExportNote('PDF saved, but '+bits.join(' and ')+'. Check it before sending.');
        setSelectedIds(rep.missingImages.map(m=>m.id).concat(rep.failed.map(f=>f.id)).filter(Boolean));
      }
    }catch(err){ console.error('export failed', err); setExportErr('Export failed — '+((err&&err.message)||err)); }
    setExporting(false); setExportMsg('');
  }

  const dismiss = ()=>{ setExportErr(null); setExportNote(null); };
  return { exporting, exportMsg, exportErr, exportNote, onExport, dismiss };
}

export { useExport };
