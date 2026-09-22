/* ============================================================
   REALITY POSTER STUDIO — useQueue
   ============================================================ */
import { RCloud } from '../../studio-shared/cloud.js';
import {
  ACCENTS_BY_DAY as AP_ABYDAY, DAY_ABBR as AP_DABBR, uid,
} from '../studio-data.jsx';
import { TEMPLATES as AP_TPL, buildTemplate as apBuildTpl } from '../templates.jsx';
import { sortTpls } from '../doc.js';
import {
  feedDate, feedTime, feedDayIdx, feedDayLabel, searchNorm, seriesWidePoster, queueKey, loadQueueDismissed,
  storeQueueDismissed, queueTitleSize, fetchFeedRetry,
} from '../feed.js';
/* ---- In queue — app-calendar events that still need a poster ----
   Anonymous public feed read (no sign-in). An event queues while it has no
   image in any poster slot, no saved template claiming it (tpl.eventId), and
   hasn't been dismissed here. Weekly series collapse to their next instance.
   The fetch is unclamped so the ?event= deep link can find far-out events;
   the visible queue clamps to the next QUEUE_DAYS days. */
const QUEUE_DAYS = 35;
function useQueue({ docRef, setDoc, setSelectedIds, userTpls, userTplsRef, tplReady }){
  const [queueOpen, setQueueOpen] = React.useState(true);
  const [queueFeed, setQueueFeed] = React.useState(null);   // null=loading | { events, err }
  const [queueDismissed, setQueueDismissed] = React.useState(loadQueueDismissed);
  const [queueSent, setQueueSent] = React.useState({});     // keys postered this session
  React.useEffect(()=>{ let live=true; (async()=>{
    try{
      if(!RCloud || !RCloud.fetchFeed){ setQueueFeed({ events:[], err:'unavailable' }); return; }
      const from = new Date(Date.now()+7*3600*1000).toISOString().slice(0,10);   // today, ICT
      const fd = await fetchFeedRetry({ from });
      if(!live) return;
      setQueueFeed(fd && Array.isArray(fd.events) ? { events:fd.events, err:null } : { events:[], err:'unavailable' });
    }catch(e){ if(live) setQueueFeed({ events:[], err:'unavailable' }); }
  })(); return ()=>{ live=false; }; }, []);

  const queueItems = React.useMemo(()=>{
    const evs = (queueFeed && queueFeed.events) || [];
    if(!evs.length) return [];
    const claimed = {}; userTpls.forEach(t=>{ if(t && t.eventId) claimed[t.eventId]=1; });
    const horizon = new Date(Date.now()+7*3600*1000 + QUEUE_DAYS*86400000).toISOString().slice(0,10);
    const hasPoster = ev=>{ const p=(ev&&ev.posters)||{}; return !!(p.poster4x5||p.feed||p.square1x1||p.story); };
    /* posterStaleAt (hub 0033): something the ARTWORK prints changed after this
       poster was made — the name, the host, the price, or the day/time — so the
       poster now advertises the old one. Such events re-queue even though they
       have a poster; only a dismissal NEWER than the change (a later change
       re-surfaces) or a poster sent this session clears them. */
    const staleAt = ev=>{ const t=Date.parse((ev&&ev.posterStaleAt)||''); return isNaN(t)?0:t; };
    const done = ev=>{ const k=queueKey(ev); const st=staleAt(ev);
      if(st) return !!(queueSent[k] || (queueDismissed[k]||0) > st);
      return !!(hasPoster(ev) || claimed[k] || queueDismissed[k] || queueSent[k]); };
    /* One row per series — the earliest ELIGIBLE instance. (Any-eligible-shows,
       not any-done-hides: after a rename only the stamped instances re-open, and
       one fresh instance with the old poster must not silence the whole series.) */
    const bySeries = {}, out = [];
    evs.forEach(ev=>{
      if(!ev || !ev.id || !ev.startsAt) return;
      if(done(ev) || feedDate(ev.startsAt) > horizon) return;
      if(ev.seriesId){
        const s = bySeries[ev.seriesId] || (bySeries[ev.seriesId] = { first:null });
        if(!s.first || ev.startsAt < s.first.startsAt) s.first = ev;
        return;
      }
      out.push(ev);
    });
    Object.keys(bySeries).forEach(k=>{ out.push(bySeries[k].first); });
    out.sort((a,b)=> a.startsAt < b.startsAt ? -1 : 1);
    return out;
  }, [queueFeed, userTpls, queueDismissed, queueSent]);

  /* ?event=<id> deep link (the app's "Open in Poster Studio") — once the feed
     lands, load that event's starter directly. */
  const deepLinkDoneRef = React.useRef(false);
  React.useEffect(()=>{
    // wait for the library too — the event's series may have a saved poster to open
    if(deepLinkDoneRef.current || !queueFeed || !tplReady) return;
    deepLinkDoneRef.current = true;
    try{
      const id = new URLSearchParams(window.location.search).get('event');
      if(!id) return;
      const ev = (queueFeed.events||[]).find(e=>e.id===id);
      if(ev) applyQueueItem(ev);
      else if(queueFeed.err) window.alert('Couldn’t reach the events feed to open that event — check the connection and reload.');
      else window.alert('That event isn’t in the public feed yet (draft or unpublished) — publish it in the app, then try again.');
    }catch(e){ /* never disturb the app over a deep link */ }
  }, [queueFeed, tplReady]);

  function dismissQueueItem(ev){
    const k = queueKey(ev); if(!k) return;
    const next = Object.assign({}, queueDismissed, { [k]: Date.now() });
    setQueueDismissed(next); storeQueueDismissed(next);
  }

  /* Click a queue row → the Classic starter prefilled with the event's name,
     day accent, time, host and price, linked to the event (doc.eventRef) so the
     cloud send offers it first and a template save claims it off the queue. */
  function applyQueueItem(ev){
    const title = ev.title_en || ev.title_vi || 'Untitled event';
    /* The Vietnamese name, when it's a different name (not a copy of the EN). */
    const titleVi = (ev.title_en && ev.title_vi && searchNorm(ev.title_vi).trim()!==searchNorm(ev.title_en).trim()) ? ev.title_vi : '';
    /* A weekly that already has a poster of its own: saving one files it with
       eventId = the series key (see saveUserTpl), so next week's row can start
       from LAST week's poster — photos, treatment, layout — instead of a bare
       Classic starter every time. Newest save wins; archived ones only if
       nothing else is left. The event's own facts are re-stamped over it below. */
    const k = queueKey(ev);
    const own = k ? sortTpls((userTplsRef.current||[]).filter(t=>t && t.eventId===k && t.doc && Array.isArray(t.doc.elements))) : [];
    const mine = own.find(t=>!t.archived) || own[0] || null;
    if(docRef.current.elements.length &&
       !window.confirm(mine
         ? 'Replace the current poster with your saved “'+mine.name+'”, restamped for '+feedDayLabel(ev.startsAt)+'?'
         : 'Replace the current poster with a starter for “'+title+'”?')) return;
    if(mine){ applySeriesTpl(ev, mine, title, titleVi); return; }
    const tpl = (AP_TPL||[]).find(t=>t.id==='talk-classic') || (AP_TPL||[])[0];
    if(!tpl) return;
    const built = apBuildTpl(tpl);
    const di = feedDayIdx(ev.startsAt);
    const accent = di!=null ? AP_ABYDAY[di] : built.accent;
    /* A poster that covers every date of a weekly stays date-less ("Thu · 19:00");
       one that belongs to THIS date pins it: "Thu 9.7 · 19:00". That's one-offs,
       hand-edited dates, and series whose topic changes weekly — Film Club and
       Storyteller print a date because their artwork is only true for one night.
       Sentence case, not caps: the chip is a FACT and renders in Grotesk, which
       is never uppercased (canon M3) — AP_DABBR is already in the house form. */
    const when = queueWhen(ev, di);
    /* Fill every box the feed can populate: the day·time chip, the host credit,
       and the price chip. Host keeps the template placeholder when the event has
       none; cost reads "Free" when the event carries no price (the feed's null
       cost means free — matching the app's own event page). The Vietnamese name
       is NOT placed: it rides doc.eventRef.titleVi, and the Title's Subtitle
       fold offers it as a one-click "Import Vietnamese". */
    built.elements.forEach(el=>{
      if(el.type==='title'){ el.text = title; el.fontSize = queueTitleSize(title); }
      if(el.type==='when'){ el.text = when; el.w = 450; }
      if(el.type==='host' && ev.host){ el.name = ev.host; }
      if(el.type==='cost'){ el.text = ev.cost ? ev.cost : 'Free'; }
    });
    setDoc(d=>({ ...d, masterFormat:'4x5', activeFormat:'master', overrides:built.overrides||{},
      elements:built.elements, theme:built.theme, accent, title,
      eventRef:{ id:ev.id, key:queueKey(ev), title, titleVi:titleVi||null, startsAt:ev.startsAt, cost:ev.cost||null } }));
    setSelectedIds([]);
  }
  /* The day·time chip text for a feed event (see the note above). */
  function queueWhen(ev, di){
    return ((di!=null?AP_DABBR[di]:'')
      + (seriesWidePoster(ev) ? '' : ' '+feedDayLabel(ev.startsAt)) + ' · ' + feedTime(ev.startsAt)).trim();
  }
  /* Load a saved poster for this event's series and restamp the facts that
     change from date to date. Deliberately light-handed — this is somebody's
     finished artwork: the date/time chip and the price are always rewritten,
     the host only when the feed has one, and the title's words only when the
     event's name has actually CHANGED (so a hand-set line break or size in
     "PULSE / SESSIONS" survives week after week). Box sizes, photos and
     per-format nudges are the template's own. Fresh element ids, overrides
     remapped, exactly as applyUserTpl does. */
  function applySeriesTpl(ev, t, title, titleVi){
    const snap = JSON.parse(JSON.stringify(t.doc));
    const idMap = {};
    snap.elements.forEach(e=>{ const nid=uid(); idMap[e.id]=nid; e.id=nid; });
    const overrides = {};
    Object.keys(snap.overrides||{}).forEach(f=>{ const fo=snap.overrides[f]||{}; const nfo={};
      Object.keys(fo).forEach(id=>{ if(idMap[id]) nfo[idMap[id]]=fo[id]; }); overrides[f]=nfo; });
    const di = feedDayIdx(ev.startsAt);
    const when = queueWhen(ev, di);
    const same = (a,b)=> searchNorm(a).replace(/\s+/g,' ').trim() === searchNorm(b).replace(/\s+/g,' ').trim();
    snap.elements.forEach(el=>{
      if(el.type==='title'){
        if(!same(el.text||'', title)){ el.text = title; el.fontSize = queueTitleSize(title); }
        /* Only a subtitle that was IMPORTED as the Vietnamese name follows the
           feed (Film Club's changes weekly); a hand-written one is artwork. */
        if(el.subtitleVi) el.subtitle = titleVi || '';
      }
      if(el.type==='when'){ el.text = when; }
      if(el.type==='host' && ev.host){ el.name = ev.host; }
      if(el.type==='cost'){ el.text = ev.cost ? ev.cost : 'Free'; }
    });
    setDoc(d=>({ ...d, masterFormat:snap.masterFormat||'4x5', activeFormat:'master', overrides,
      elements:snap.elements, theme:snap.theme||d.theme,
      accent: di!=null ? AP_ABYDAY[di] : (snap.accent||d.accent), title,
      eventRef:{ id:ev.id, key:queueKey(ev), title, titleVi:titleVi||null, startsAt:ev.startsAt, cost:ev.cost||null } }));
    setSelectedIds([]);
  }

  return { queueOpen, setQueueOpen, queueFeed, queueItems, setQueueSent, dismissQueueItem, applyQueueItem };
}

export { QUEUE_DAYS, useQueue };
