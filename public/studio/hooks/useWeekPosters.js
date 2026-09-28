/* ============================================================
   REALITY POSTER STUDIO — useWeekPosters
   "Week's 4:5" — every event in the next 7 days (today + 6, ICT), its
   PUBLISHED 4:5 poster, in one download. Nothing is rendered here: the
   files are the posters the events actually carry (the feed's
   posters.poster4x5, the one Export-to-event sent), fetched from the
   image host and re-encoded to the toolbar's PNG / JPG / PDF choice.
   The canvas is never touched, so it runs beside whatever is on screen.

   Filenames are the Save Images ones (storyStem): "3-wed-karaoke-4x5.png",
   the weekday taken from the event's own date. A series poster that runs
   twice this week is saved once per date — each file is one night.
   ============================================================ */
import { slugify } from '../../studio-shared/util.js';
import { DAY_ABBR } from '../studio-data.jsx';
import { feedDate, feedDayIdx, feedDayLabel, fetchFeedRetry } from '../feed.js';

const WEEK_DAYS = 7;
const FETCH_POOL = 4;   // parallel image fetches — ~40 files of ~70KB each

/* YYYY-MM-DD in Đà Nẵng (ICT, UTC+7), `plus` days from today. */
function ictDate(plus){ return new Date(Date.now()+7*3600*1000 + (plus||0)*86400000).toISOString().slice(0,10); }

/* The image host caches at the edge and doesn't vary on Origin, so a copy
   first cached by an <img> (no Origin, no CORS headers) could be handed to
   this cross-origin read and fail it. A per-origin query gives the Studio
   its own cache entries, each first filled by a CORS request from here. */
function corsUrl(url){
  return url + (url.indexOf('?')<0 ? '?' : '&') + 'studio=' + encodeURIComponent(window.location.host || 'local');
}

/* A fetched poster → the bytes to save as `kind`. The hosted 4:5 is WebP;
   PNG is a lossless re-encode of it, JPG matches Save Images' 0.95, and a
   PDF page takes the JPG (a PNG page of an already-lossy source would only
   make a week's PDF ten times the size). A file already in the wanted type
   goes through untouched. */
async function recode(blob, kind){
  const jpeg = kind==='jpg' || kind==='pdf';
  const want = jpeg ? 'image/jpeg' : 'image/png';
  if(blob.type===want) return blob;
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  const ctx = c.getContext('2d');
  if(jpeg){ ctx.fillStyle = '#0a0703'; ctx.fillRect(0, 0, c.width, c.height); }   // JPEG has no alpha
  ctx.drawImage(bmp, 0, 0);
  try{ bmp.close(); }catch(e){}
  const out = await new Promise(r=>c.toBlob(r, want, jpeg ? 0.95 : undefined));
  if(!out) throw new Error('re-encode failed');
  return out;
}
function blobToDataUrl(blob){
  return new Promise((res, rej)=>{ const fr = new FileReader(); fr.onload = ()=>res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
}
function imageSize(blob){
  return createImageBitmap(blob).then(b=>{ const s = { w:b.width, h:b.height }; try{ b.close(); }catch(e){} return s; });
}

function useWeekPosters({ doc, say }){
  const [weekBusy, setWeekBusy] = React.useState(false);
  const [weekMsg, setWeekMsg] = React.useState('');

  async function exportWeek(){
    if(weekBusy) return;
    const kind = doc.exportFormat || 'png';
    const from = ictDate(0), to = ictDate(WEEK_DAYS-1);
    setWeekBusy(true); setWeekMsg('Reading the week…');
    try{
      const feed = await fetchFeedRetry({ from, to });
      if(!feed || !Array.isArray(feed.events)){
        say('Couldn’t reach the events feed — check the connection and try again.', 5000);
        return;
      }
      /* The window is filtered here too: the feed's `to` is the hub's to honour. */
      const events = feed.events
        .filter(ev=>ev && ev.id && ev.startsAt && feedDate(ev.startsAt)>=from && feedDate(ev.startsAt)<=to)
        .sort((a,b)=> a.startsAt===b.startsAt
          ? String(a.title_en||'').localeCompare(String(b.title_en||''))
          : (a.startsAt < b.startsAt ? -1 : 1));
      const withPoster = events.filter(ev=>ev.posters && ev.posters.poster4x5);
      const without = events.filter(ev=>!(ev.posters && ev.posters.poster4x5));
      if(!withPoster.length){
        say(events.length ? 'None of the '+events.length+' events this week has a 4:5 poster yet.' : 'No events in the next 7 days.', 5000);
        return;
      }

      /* Filenames first, so two events that slug the same on one day don't collide. */
      const used = {};
      const jobs = withPoster.map(ev=>{
        const di = feedDayIdx(ev.startsAt);
        const slug = slugify(ev.title_en || ev.title_vi || '') || 'event';
        let stem = (di!=null ? (di+1)+'-'+DAY_ABBR[di].toLowerCase()+'-' : '') + slug + '-4x5';
        if(used[stem]){ used[stem]++; stem += '-'+used[stem]; } else used[stem] = 1;
        return { ev, url:ev.posters.poster4x5, stem, blob:null };
      });

      /* Fetch — one request per distinct URL (a series shares one file). */
      const byUrl = {};
      const fetchOne = url=> byUrl[url] || (byUrl[url] =
        fetch(corsUrl(url), { mode:'cors', credentials:'omit', cache:'no-store' })
          .then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.blob(); }));
      let done = 0, next = 0;
      async function worker(){
        while(next < jobs.length){
          const j = jobs[next++];
          try{ j.blob = await recode(await fetchOne(j.url), kind); }
          catch(e){ console.warn('[week] could not fetch', j.url, e && e.message); j.blob = null; }
          done++; setWeekMsg('Fetching '+done+' / '+jobs.length+'…');
        }
      }
      await Promise.all(Array.from({ length:Math.min(FETCH_POOL, jobs.length) }, worker));

      const got = jobs.filter(j=>j.blob);
      const lost = jobs.length - got.length;
      if(!got.length){
        say('Couldn’t read any of the '+jobs.length+' poster files from the image host (it may be blocking the Studio — CORS). Nothing saved.', 7000);
        return;
      }

      const name = 'reality-4x5-'+from+'-to-'+to.slice(5);
      if(kind==='pdf'){
        /* One page per poster, in date order, each page the poster's own size. */
        setWeekMsg('Building the PDF…');
        const JS = window.jspdf && window.jspdf.jsPDF;
        let pdf = null;
        for(const j of got){
          const { w, h } = await imageSize(j.blob);
          if(!pdf) pdf = new JS({ unit:'px', format:[w,h], orientation:'portrait', hotfixes:['px_scaling'] });
          else pdf.addPage([w,h], 'p');
          pdf.addImage(await blobToDataUrl(j.blob), 'JPEG', 0, 0, w, h, undefined, 'FAST');
        }
        pdf.save(name+'.pdf');
      } else {
        setWeekMsg('Zipping…');
        const zip = new window.JSZip();
        got.forEach(j=>zip.file(j.stem+'.'+kind, j.blob));
        const blob = await zip.generateAsync({ type:'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name+'.zip';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(a.href), 60000);
      }

      /* Say what ISN'T in there — those are the posters still to make. */
      const missing = without.map(ev=>(ev.title_en || ev.title_vi || 'Untitled')+' ('+feedDayLabel(ev.startsAt)+')');
      say('Saved '+got.length+' poster'+(got.length===1?'':'s')
        + (lost ? ' · '+lost+' couldn’t be fetched' : '')
        + (missing.length ? ' · no 4:5 yet: '+missing.join(', ') : ''), missing.length || lost ? 9000 : 3600);
    }catch(err){
      console.error('week export failed', err);
      say('Week export failed — '+(err && err.message || 'unknown error'), 5000);
    }finally{
      setWeekBusy(false); setWeekMsg('');
    }
  }

  return { weekBusy, weekMsg, exportWeek };
}

export { useWeekPosters };
