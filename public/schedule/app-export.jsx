/* ============================================================
   REALITY SCHEDULE STUDIO — app · useExport: PNG / PDF / zip, and Backstage
   Renders each part offscreen, captures it (html-to-image), zips or
   saves it, and files the 9:16 day cards and FB covers in the app's daily digest.
   ============================================================ */
import { RCloud } from '../studio-shared/cloud.js';
import { rangeDates as a_dates, dayInfo as a_dayInfo, serializeCSV as a_serCSV, todayIso as a_today } from './schedule-data.jsx';
import { channelById as a_ch, partCount as a_partCount, partSize as a_partSize } from './schedule-render.jsx';

function dl(href, name){ const a=document.createElement('a'); a.href=href; a.download=name; document.body.appendChild(a); a.click(); a.remove(); }
function dlBlob(blob, name){ const u=URL.createObjectURL(blob); dl(u, name); setTimeout(()=>URL.revokeObjectURL(u), 4000); }

/* A capture comes back as a data: URL; the hub wants bytes. */
function dataUrlToBlob(dataUrl){
  const type = (/^data:([^;,]+)/.exec(dataUrl) || [,'image/png'])[1];
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',')+1));
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
/* Downsample a captured daily card to its own 1080x1920 before sending it to
   Backstage. The capture is 2x (pixelRatio 2 on a 1080-wide node) — four times the
   pixels Instagram or WhatsApp will ever use, and enough on a dense day to run at
   the hub's 10MB ceiling. Stays PNG on purpose: the card is flat colour and hard
   type, which is exactly what RCloud.optimizeImage's lossy path rings on. */
async function toStoryBlob(dataUrl){
  const src = dataUrlToBlob(dataUrl);
  if(typeof createImageBitmap !== 'function') return src;
  try{
    const bmp = await createImageBitmap(src);
    const w = Math.min(1080, bmp.width), h = Math.round(bmp.height * (w / bmp.width));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    try{ bmp.close(); }catch(e){}
    const out = await new Promise(res => c.toBlob(res, 'image/png'));
    return out || src;
  }catch(err){ console.info('[Studio] story downsample failed; sending the capture', err); return src; }
}

/* The FB cover goes up at the resolution it was captured at (851x315 at 2x is
   1702x630 — Facebook's own retina size, and a few hundred KB). Halved only if a
   capture ever outgrows the app's upload ceiling, MAX_IMAGE_BYTES in REALITYApp. */
const COVER_MAX_BYTES = 10000000;
async function toCoverBlob(dataUrl){
  const src = dataUrlToBlob(dataUrl);
  if(src.size <= COVER_MAX_BYTES || typeof createImageBitmap !== 'function') return src;
  try{
    const bmp = await createImageBitmap(src);
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width/2); c.height = Math.round(bmp.height/2);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    try{ bmp.close(); }catch(e){}
    const out = await new Promise(res => c.toBlob(res, 'image/png'));
    return out || src;
  }catch(err){ console.info('[Studio] cover downsample failed; sending the capture', err); return src; }
}

function useExport({ doc, channelId, dailyVariant, setSelId }){
  const [exporting, setExporting] = React.useState(false);
  const [exportMsg, setExportMsg] = React.useState('');
  const [hubMsg, setHubMsg] = React.useState('');
  const [exportJob, setExportJob] = React.useState(null);
  const exportRef = React.useRef(null);
  const dates = a_dates(doc.range);

  /* ---- export pipeline ---- */
  async function renderOffscreen(job){
    setExportJob(job);
    await new Promise(r=>setTimeout(r, 60));
    await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
    await new Promise(r=>setTimeout(r, 320));
    const node = exportRef.current && exportRef.current.firstChild;
    if(!node) throw new Error('export node missing');
    return node;
  }
  async function capturePart(job, ch){
    const node = await renderOffscreen(job);
    const sz = a_partSize(job.channelId, job.dailyVariant);
    /* no cacheBust: the schedule has no remote images, and busting forces a
       font refetch per capture — it made the 7-part "Everything" export crawl */
    return window.htmlToImage.toPng(node, { width:sz.w, height:sz.h, pixelRatio:ch.px||2,
      backgroundColor: ch.bg });
  }
  function pngName(chId, i, n, variant, date){
    const base = 'reality-schedule-' + doc.range.start;
    if(chId==='daily') return 'reality-daily-' + date + '-' + variant + '.png';
    if(chId==='wa') return base + '-wa.png';
    if(chId==='print') return base + '-print.png';
    return base + '-' + chId + (n>1 ? '-' + (i+1) : '') + '.png';
  }
  async function makePrintPDF(){
    const ch = a_ch('print');
    const url = await capturePart({ channelId:'print' }, ch);
    const JS = window.jspdf && window.jspdf.jsPDF;
    const pdf = new JS({ unit:'mm', format:'a4', orientation:'landscape' });
    /* compression flag matters: without it jsPDF embeds the decoded raster
       essentially raw — ~30MB for the A4 sheet. FLATE is lossless. */
    pdf.addImage(url, 'PNG', 0, 0, 297, 210, undefined, 'SLOW');
    return pdf;
  }
  /* ---- Backstage propagation ----
     Every export that renders daily cards also files them against their dates in
     the app's daily digest (/staff/digest), so the morning WhatsApp post has its
     picture waiting beside its prose instead of living in someone's Downloads —
     and the day's FB cover beside it, for the 8:00 routine that sets the Page cover.
     Runs AFTER the download, and can only ever report on itself: the export is the
     job, this is the errand on the way back, and a dormant hub must never cost you
     the zip you actually asked for. */
  async function pushDigestCards(cards, covers){
    if(!RCloud || !RCloud.isSignedIn()) return 'Backstage: sign in to Cloud to send day cards';
    /* A card for a day that has already happened has no digest left to sit under,
       and would only push a dead date to the top of Backstage's Recent list. */
    const today = a_today();
    const due = cards.filter(c => c.date >= today).map(c => ({ ...c, kind:'story' }))
      .concat(covers.filter(c => c.date >= today).map(c => ({ ...c, kind:'cover' })));
    if(!due.length) return 'Backstage: nothing to send — this week has already been';
    const sent = { story:0, cover:0 }; let failed = 0;
    for(let i=0;i<due.length;i++){
      const c = due[i];
      setExportMsg('Backstage ' + (i+1) + '/' + due.length + '…');
      try{
        const r = c.kind==='cover'
          ? await toCoverBlob(c.dataUrl).then(b => RCloud.putDigestCover(c.date, b, b.type))
          : await toStoryBlob(c.dataUrl).then(b => RCloud.putDigestStory(c.date, b, b.type));
        if(r && r.ok) sent[c.kind]++; else failed++;
      }catch(err){ console.error('[Studio] digest ' + c.kind + ' push failed', c.date, err); failed++; }
    }
    const plural = (n, word) => n + ' ' + word + (n===1?'':'s');
    const parts = [];
    if(sent.story) parts.push(plural(sent.story, 'day card'));
    if(sent.cover) parts.push(plural(sent.cover, 'cover'));
    if(!parts.length) return 'Backstage: could not send day cards (' + failed + ' failed)';
    return 'Backstage: ' + parts.join(' + ') + ' sent' + (failed ? ' · ' + failed + ' failed' : '');
  }

  async function doExport(scope){
    if(exporting || !window.htmlToImage) return;
    setSelId(null); setExporting(true); setExportMsg('Rendering…'); setHubMsg('');
    const base = 'reality-schedule-' + doc.range.start;
    /* 9:16 day cards and FB covers picked up on the way past, sent to Backstage below. */
    const cards = [], covers = [];
    const today = a_today();
    try{
      if(scope==='channel'){
        const ch = a_ch(channelId);
        if(channelId==='print'){
          setExportMsg('Print PDF…');
          const pdf = await makePrintPDF();
          pdf.save(base + '-print.pdf');
        } else if(channelId==='daily'){
          const open = dates.filter(d=>a_dayInfo(doc,d).status!=='closed');
          const zip = new window.JSZip();
          for(let i=0;i<open.length;i++){
            setExportMsg('Daily ' + (i+1) + '/' + open.length + '…');
            const url = await capturePart({ channelId:'daily', dailyDate:open[i], dailyVariant }, ch);
            zip.file(pngName('daily',0,1,dailyVariant,open[i]), url.split(',')[1], { base64:true });
            if(dailyVariant==='story') cards.push({ date:open[i], dataUrl:url });
            if(dailyVariant==='cover' && open[i] >= today) covers.push({ date:open[i], dataUrl:url });
          }
          /* Exporting the feed or cover variant still propagates — Backstage wants
             the 9:16 whatever you happened to be looking at. Quietly sending
             nothing is how you find out on Thursday morning that nothing sent. */
          if(dailyVariant!=='story'){
            for(let i=0;i<open.length;i++){
              setExportMsg('Story card ' + (i+1) + '/' + open.length + '…');
              cards.push({ date:open[i],
                dataUrl:await capturePart({ channelId:'daily', dailyDate:open[i], dailyVariant:'story' }, ch) });
            }
          }
          /* …and the FB cover, for the routine that sets the Page cover each morning.
             Days still to come only: nothing ever fetches a past day's cover. */
          if(dailyVariant!=='cover'){
            const due = open.filter(d => d >= today);
            for(let i=0;i<due.length;i++){
              setExportMsg('FB cover ' + (i+1) + '/' + due.length + '…');
              covers.push({ date:due[i],
                dataUrl:await capturePart({ channelId:'daily', dailyDate:due[i], dailyVariant:'cover' }, ch) });
            }
          }
          setExportMsg('Zipping…');
          dlBlob(await zip.generateAsync({ type:'blob' }), 'reality-daily-' + doc.range.start + '-' + dailyVariant + '.zip');
        } else {
          const n = a_partCount(doc, channelId);
          if(n===1){
            const url = await capturePart({ channelId, partIndex:0 }, ch);
            dl(url, pngName(channelId,0,1));
          } else {
            const zip = new window.JSZip();
            for(let i=0;i<n;i++){
              setExportMsg(ch.label + ' ' + (i+1) + '/' + n + '…');
              const url = await capturePart({ channelId, partIndex:i }, ch);
              zip.file(pngName(channelId,i,n), url.split(',')[1], { base64:true });
            }
            setExportMsg('Zipping…');
            dlBlob(await zip.generateAsync({ type:'blob' }), base + '-' + channelId + '.zip');
          }
        }
      } else {
        /* everything: feed + stories + wa + print.pdf + dailies + archives */
        const zip = new window.JSZip();
        for(const chId of ['feed','stories']){
          const ch = a_ch(chId), n = a_partCount(doc, chId);
          for(let i=0;i<n;i++){
            setExportMsg(ch.label + ' ' + (i+1) + '/' + n + '…');
            const url = await capturePart({ channelId:chId, partIndex:i }, ch);
            zip.file(pngName(chId,i,n), url.split(',')[1], { base64:true });
          }
        }
        setExportMsg('WhatsApp…');
        const waUrl = await capturePart({ channelId:'wa' }, a_ch('wa'));
        zip.file(pngName('wa'), waUrl.split(',')[1], { base64:true });
        setExportMsg('Print PDF…');
        const pdf = await makePrintPDF();
        zip.file(base + '-print.pdf', pdf.output('blob'));
        const open = dates.filter(d=>a_dayInfo(doc,d).status!=='closed');
        for(let i=0;i<open.length;i++){
          setExportMsg('Daily ' + (i+1) + '/' + open.length + '…');
          const url = await capturePart({ channelId:'daily', dailyDate:open[i], dailyVariant:'story' }, a_ch('daily'));
          zip.file(pngName('daily',0,1,'story',open[i]), url.split(',')[1], { base64:true });
          cards.push({ date:open[i], dataUrl:url });
        }
        for(let i=0;i<open.length;i++){
          setExportMsg('FB cover ' + (i+1) + '/' + open.length + '…');
          const url = await capturePart({ channelId:'daily', dailyDate:open[i], dailyVariant:'cover' }, a_ch('daily'));
          zip.file(pngName('daily',0,1,'cover',open[i]), url.split(',')[1], { base64:true });
          if(open[i] >= today) covers.push({ date:open[i], dataUrl:url });
        }
        zip.file(base + '.json', JSON.stringify(doc, null, 2));
        zip.file(base + '.csv', a_serCSV(doc));
        setExportMsg('Zipping…');
        dlBlob(await zip.generateAsync({ type:'blob' }), base + '.zip');
      }
      if(cards.length || covers.length){
        /* Its own try: the zip is already on disk by now, so a Backstage hiccup
           must not come back to the user as "Export failed". */
        try{ setHubMsg(await pushDigestCards(cards, covers)); }
        catch(err){ console.error('[Studio] Backstage push failed', err); setHubMsg('Backstage: send failed'); }
      }
    }catch(err){ console.error('export failed', err); setExportMsg('Export failed'); await new Promise(r=>setTimeout(r,1500)); }
    setExportJob(null); setExporting(false); setExportMsg('');
  }
  return { exporting, exportMsg, hubMsg, exportJob, exportRef, doExport };
}

export { dlBlob, useExport };
