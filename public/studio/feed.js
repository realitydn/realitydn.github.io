/* ============================================================
   REALITY POSTER STUDIO — the events feed
   Reading the hub's public feed: dates off the ICT ISO strings, the
   diacritics-blind search, the series rule, and the queue's bookkeeping.
   ============================================================ */
import { RCloud } from '../studio-shared/cloud.js';
/* ---- In-queue helpers ------------------------------------------------------
   The queue lists app-calendar events that still need a poster. Feed ISO
   strings are always +07:00 (the hub's ictIso), so date/time read straight off
   the string — no TZ math in the browser. */
function feedDate(iso){ return (iso||'').slice(0,10); }                    // YYYY-MM-DD
function feedTime(iso){ return (iso||'').slice(11,16); }                   // HH:MM
function feedDayIdx(iso){ const d=feedDate(iso); if(d.length<10) return null;   // 0=Mon..6=Sun
  const w=new Date(d+'T12:00:00Z').getUTCDay(); return isNaN(w)?null:(w+6)%7; }
function feedDayLabel(iso){ const d=feedDate(iso); if(d.length<10) return '';   // house style, day-first: 9.7
  return (+d.slice(8,10))+'.'+(+d.slice(5,7)); }
/* Search text for a feed row — diacritics-blind, so "cafe" finds "Philosophy
   Café" and "dem" finds "Đêm Trò Chơi". Same đ/Đ hand-map as slugify (they don't
   decompose under NFD). Both titles, the host and the room code are searchable:
   the feed runs two months out, so the picker's flat list is ~300 rows deep. */
function searchNorm(s){
  return (s||'').replace(/đ/g,'d').replace(/Đ/g,'D')
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'),'')
    .toLowerCase();
}
function eventHaystack(ev){
  if(!ev) return '';
  return searchNorm([ev.title_en, ev.title_vi, ev.host, ev.location && ev.location.code]
    .filter(Boolean).join(' '));
}
/* Tokens AND together, so "chess night" and "night chess" both land. */
function eventMatches(ev, terms){
  if(!terms || !terms.length) return true;
  const hay = eventHaystack(ev);
  for(let i=0;i<terms.length;i++){ if(hay.indexOf(terms[i])<0) return false; }
  return true;
}
/* Does ONE poster cover the whole series, or does this date own its artwork?
   The hub answers it per event (feed v1 `posterScope`) with the same rule its
   poster write-back applies: a series date shares the series poster only while
   it is neither hand-edited nor part of a series whose content changes every
   week (Film Club, Coffee + Conversation). Hubs deployed before that field
   don't send it — fall back to the old read, where any series meant one shared
   weekly poster. */
function seriesWidePoster(ev){
  if(!ev) return false;
  if(ev.posterScope) return ev.posterScope === 'series';
  return !!ev.seriesId;
}
/* One queue row per SERIES for weekly events; dismiss/claim key by the series
   so next week's instance doesn't resurrect a dismissed row. */
function queueKey(ev){ return (ev && (ev.seriesId || ev.id)) || null; }
const QUEUE_DISMISS_KEY = 'reality-studio-queue-dismissed-v1';
function loadQueueDismissed(){ try{ const r=localStorage.getItem(QUEUE_DISMISS_KEY); if(r){ const o=JSON.parse(r); if(o&&typeof o==='object'&&!Array.isArray(o)) return o; } }catch(e){} return {}; }
function storeQueueDismissed(o){ try{ localStorage.setItem(QUEUE_DISMISS_KEY, JSON.stringify(o)); }catch(e){} }
/* Title size for a prefilled starter — steps down the type scale as titles get
   longer, so long event names land inside the Classic layout's box. */
function queueTitleSize(t){ const n=(t||'').length; return n<=12?120 : n<=22?100 : n<=34?82 : n<=50?68 : 56; }

/* One transient blip (weak wifi, the hub mid-redeploy) must not read as "no
   feed" for the rest of the session — retry a couple of times with a pause
   before giving up. The picker also gets a manual Retry button. */
async function fetchFeedRetry(params, tries){
  tries = tries || 3;
  for(let i=0;i<tries;i++){
    const fd = RCloud && RCloud.fetchFeed ? await RCloud.fetchFeed(params) : null;
    if(fd && Array.isArray(fd.events)) return fd;
    if(i < tries-1) await new Promise(r=>setTimeout(r, 1200*(i+1)));
  }
  return null;
}

export {
  feedDate, feedTime, feedDayIdx, feedDayLabel, searchNorm, eventHaystack, eventMatches, seriesWidePoster,
  queueKey, QUEUE_DISMISS_KEY, loadQueueDismissed, storeQueueDismissed, queueTitleSize, fetchFeedRetry,
};
