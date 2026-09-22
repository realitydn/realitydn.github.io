/* ============================================================
   REALITY SCHEDULE STUDIO — data · the app feed
   REALITY Events Feed → schedule rows (WP9) and the idempotent
   App→Schedule merge: series-keyed presentation, tombstones,
   weekly dedupe. Pure — node-testable (scripts/selftest-schedule.mjs).
   ============================================================ */
import { LOCATIONS, dAdd, dWeekday, rangeDates, suid } from './data-model.jsx';

/* ============================================================
   WP9 — build schedule rows from the REALITY Events Feed
   ------------------------------------------------------------
   Pure mapping (no globals required for the core, no network) so it's
   node-testable. Each feed instance → a blankEvent()-shaped row. The hub feed
   already delivers FLAT concrete instances, so we never re-generate recurrence
   here; the anchor `date` is the instance date.

   WEEKLY IS INFERRED, NOT ASSUMED. The feed (v1, checked 23.09.26) has no
   recurrence field and nobody tags 'weekly' — but 86 of 94 instances carry a
   seriesId, including one-off workshops and series that skip weeks. So a row
   is weekly only when its series really does come back: an instance of the
   same series at the same start exactly 7 days later, somewhere in the
   fetched window (feedWindow() fetches two weeks past the range for this).
   A 'weekly' tag still forces it. And when that next instance is itself in
   the range, it gets its own row and this one stays a one-off — only the
   LAST in-range instance of a series projects forward, so a 10-day range
   never shows a series twice on one day.

   Time mapping pins the venue TZ (+07:00; Đà Nẵng has no DST): the feed's ISO
   carries the offset, so we read the local wall HH:MM from the +07:00 form.
   A start before 06:00 is filed under the PREVIOUS date — it is the tail of
   that night (see timeKey).

   Only `status: 'published'` instances map. The public feed only serves
   published events today (94/94 on 23.09.26), so this is a guard, not a filter
   — if a draft or cancelled instance ever leaks, it must not reach a poster.

   `opts`:
     locations : LOCATIONS registry (defaults to the module LOCATIONS)
     range     : { start, days } — events outside the range are dropped
                 (mirrors ImportModal's range-clamp); the rest of the list
                 still informs the weekly inference
     makeId    : () => id  (defaults to suid(); pass a stub in tests)
   Returns { events:[...], errors:[...] }.
   ------------------------------------------------------------ */
/* The window to fetch for a range: the range itself plus the two weeks after
   it (the weekly inference needs to see next week), plus a day for a Sunday
   night that runs past midnight. */
function feedWindow(range){
  return { from: range.start, to: dAdd(range.start, (range.days|0) - 1 + 15) };
}
function ictHHMM(iso){
  if(!iso || typeof iso!=='string') return null;
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if(/\+07:?00$/.test(iso) && m) return m[1]+':'+m[2];          // explicit ICT wall time
  const t = Date.parse(iso);
  if(isNaN(t)) return m ? (m[1]+':'+m[2]) : null;
  const d = new Date(t + 7*3600*1000);                          // normalise any offset/Z to ICT
  const pad = n=>(n<10?'0':'')+n;
  return pad(d.getUTCHours())+':'+pad(d.getUTCMinutes());
}
function ictDate(iso){
  if(!iso || typeof iso!=='string') return null;
  if(/\+07:?00$/.test(iso)){ const m=/^(\d{4}-\d{2}-\d{2})/.exec(iso); if(m) return m[1]; }
  const t = Date.parse(iso); if(isNaN(t)){ const m=/^(\d{4}-\d{2}-\d{2})/.exec(iso); return m?m[1]:null; }
  return new Date(t + 7*3600*1000).toISOString().slice(0,10);
}
function buildDocFromFeed(feedOrEvents, opts){
  opts = opts || {};
  const locs = opts.locations || (typeof LOCATIONS!=='undefined' ? LOCATIONS : []);
  const codeSet = {}; (locs||[]).forEach(l=>{ if(l&&l.code) codeSet[String(l.code).toUpperCase()]=l.code; });
  const mk = opts.makeId || (typeof suid!=='undefined' ? suid : (()=>'ev'+Math.random().toString(36).slice(2,8)));
  const list = Array.isArray(feedOrEvents) ? feedOrEvents
             : (feedOrEvents && Array.isArray(feedOrEvents.events) ? feedOrEvents.events : []);
  const events = [], errors = [];
  const inRange = (date)=>{
    if(!opts.range || !opts.range.start || !opts.range.days) return true;
    if(typeof rangeDates==='undefined') return true;
    return rangeDates(opts.range).indexOf(date)>=0;
  };
  /* pass 1: wall date/time for every usable instance, and an index of
     series|date|start so the weekly test below is a lookup */
  const TITLE = ev=>ev.title_en || ev.title_vi || 'Untitled event';
  const pre = [], seen = {};
  list.forEach(ev=>{
    try{
      if(!ev) return;
      if(ev.status && ev.status!=='published') return;           // guard: drafts/cancelled never map
      let date = ictDate(ev.startsAt);
      if(!date){ errors.push('Event "'+(ev.title_en||ev.id||'?')+'" has no usable start date'); return; }
      const start = ictHHMM(ev.startsAt) || '19:00';
      if(+start.slice(0,2) < 6) date = dAdd(date, -1);            // after midnight → that night
      const tags = Array.isArray(ev.tags) ? ev.tags.map(t=>String(t).toLowerCase()) : [];
      // a series is its seriesId; a tagged-weekly event without one falls back to its title
      const skey = ev.seriesId ? 's:'+ev.seriesId
                 : (tags.indexOf('weekly')>=0 ? 't:'+TITLE(ev).trim().toLowerCase() : null);
      if(skey) seen[skey+'|'+date+'|'+start] = 1;
      pre.push({ ev, date, start, tags, skey });
    }catch(e){ errors.push('Could not map a feed event: '+(e&&e.message)); }
  });
  pre.forEach(({ ev, date, start, tags, skey })=>{
    try{
      if(!inRange(date)) return;                                 // silently skip out-of-range (caller clamps)
      // End times are deliberately NOT synced from the app — the schedule rarely
      // shows them. `end` is user-owned here: set one by hand in the Inspector
      // and the merge below preserves it across re-syncs.
      const end = null;
      // Locations: the full `locations` list when the feed gives one (Board Game
      // Night takes all four floors; `location` only names the first), else the
      // single `location`. Unknown codes drop; order follows the feed.
      const raw = (Array.isArray(ev.locations) && ev.locations.length ? ev.locations : [ev.location])
        .map(l=>l && l.code ? String(l.code).toUpperCase() : null);
      const mapped = [];
      raw.forEach(c=>{ if(c && codeSet[c] && mapped.indexOf(codeSet[c])<0) mapped.push(codeSet[c]); });
      const next = dAdd(date, 7);
      const recurs = !!skey && !!seen[skey+'|'+next+'|'+start];
      const weekly = (tags.indexOf('weekly')>=0 || recurs) && !(recurs && inRange(next));
      // $ (fee) flag: a non-blank `cost` (e.g. "100k") auto-flags, OR an explicit `fee`
      // tag. `cost` is the app's source of truth for "costs money beyond a purchase"
      // (null/blank = free), so a priced event flags without a tag added by hand.
      const hasCost = ev.cost!=null && String(ev.cost).trim()!=='';
      events.push({
        id: mk(), date, start, end, title: TITLE(ev),
        titleShort: null, locations: mapped,
        // map the feed onto the schedule's flags/emphasis ($ = fee, * = prereg)
        flags:{ prereg: tags.indexOf('prereg')>=0, fee: hasCost || tags.indexOf('fee')>=0 },
        emphasis: tags.indexOf('featured')>=0 ? 'banner' : 'none', hide:[],
        repeat: weekly ? 'weekly' : null, repeatUntil:null, exceptions:[],
        notionId: ev.id || null,                                 // feed OCCURRENCE id (changes weekly)
        seriesId: ev.seriesId || null,                           // stable across weeks — the merge keys on it
      });
    }catch(e){ errors.push('Could not map a feed event: '+(e&&e.message)); }
  });
  return { events, errors };
}

/* Idempotent App→Schedule merge — the one funnel for the auto-pull (on open and
   on every range change) AND the Import dialog's "Pull from REALITY feed". The
   app is the source of truth, so we REPLACE all feed-sourced rows (notionId
   set) with the freshly-built feed rows for the range, while:
   (a) keeping purely-local rows (notionId == null);
   (b) carrying the user's presentation layer — titleShort, non-default
       emphasis, hide, a hand-set end, repeatUntil, skipped weeks — through
       `prefs` (doc.feedPrefs). Feed ids are per OCCURRENCE (a new UUID every
       week), so prefs key on the series ('s:'+seriesId) and only fall back to
       the occurrence ('e:'+id) for an event with no series. That is what makes
       a short title set on this Monday's quiz still be there next Monday, and
       what lets a one-off keep its styling after you navigate away and back.
       A short title only carries to a DIFFERENT occurrence when the title is
       the same — Film Club's "Roma (2018)" shortening must not land on next
       week's different film;
   (c) skipping tombstoned events (`deleted`, doc.feedDeleted) — an event you
       deleted here stays deleted instead of coming back on the next pull;
   (d) collapsing weekly duplicates so weekly projections don't stack, and
       dropping local rows (one-offs AND local weekly series) that duplicate a
       feed event on a date the feed covers — the synced copy wins.
   Never accumulates across pulls; an event removed in the app simply drops.
   Returns { events, prefs, added, updated, removed, dedup, hidden, changed }.
   Caller no-ops on a failed/empty feed before calling this. */
function feedPrefKey(e){
  if(!e) return null;
  if(e.seriesId) return 's:'+e.seriesId;
  return e.notionId ? 'e:'+e.notionId : null;
}
function mergeFeedIntoDoc(existing, fresh, opts){
  opts = opts || {};
  const tomb = {}; (opts.deleted||[]).forEach(t=>{ if(t && t.key) tomb[t.key] = 1; });
  const seenWeekly = {}, rows = [];
  let hidden = 0;
  (fresh||[]).forEach(e=>{
    if(!e) return;
    if((e.notionId && tomb['e:'+e.notionId]) || (e.seriesId && tomb['s:'+e.seriesId])){ hidden++; return; }
    if(e.repeat==='weekly'){
      const k = e.seriesId ? 's:'+e.seriesId : (e.title||'')+'|'+(e.start||'')+'|'+((e.locations||[]).join(','));
      if(seenWeekly[k]) return; seenWeekly[k] = 1;
    }
    rows.push(e);
  });
  const prevFeed = {}, prevSeries = {}, local = [];
  (existing||[]).forEach(e=>{
    if(e && e.notionId){ prevFeed[e.notionId] = e; if(e.seriesId) prevSeries[e.seriesId] = e; }
    else if(e) local.push(e);
  });
  /* harvest: the rows on screen are the latest word on their key's presentation.
     Later dates win, so in a long range the series' projecting row speaks last. */
  const prefs = Object.assign({}, opts.prefs || {});
  Object.keys(prevFeed).map(k=>prevFeed[k]).sort((a,b)=>(a.date<b.date?-1:a.date>b.date?1:0)).forEach(p=>{
    const key = feedPrefKey(p); if(!key) return;
    const pr = {};
    if(p.titleShort){ pr.titleShort = p.titleShort; pr.titleFor = p.title; pr.id = p.notionId; }
    if(p.emphasis && p.emphasis!=='none') pr.emphasis = p.emphasis;
    if(p.hide && p.hide.length) pr.hide = p.hide.slice();
    if(p.end != null) pr.end = p.end;
    if(p.repeatUntil != null) pr.repeatUntil = p.repeatUntil;
    if(p.repeat==='weekly' && p.exceptions && p.exceptions.length) pr.exceptions = p.exceptions.slice();
    if(Object.keys(pr).length) prefs[key] = pr; else delete prefs[key];
  });
  const normT = s=>String(s||'').trim().toLowerCase();
  // sig includes flags + emphasis so a tag-only change (e.g. a newly-correct $/*)
  // is detected as an update and actually applied by the auto-pull.
  const sig = e=>[e.date,e.start,e.end,e.title,e.titleShort||'',(e.locations||[]).join(','),e.repeat||'',(e.exceptions||[]).join(','),
    (e.flags&&e.flags.fee?'$':'')+(e.flags&&e.flags.prereg?'*':''), e.emphasis||'none', (e.hide||[]).join(','), e.repeatUntil||''].join('|');
  let added = 0, updated = 0;
  const merged = rows.map(e=>{
    const pr = prefs[feedPrefKey(e)];
    /* take core fields from the feed; lay the user's presentation choices back on */
    const next = !pr ? e : Object.assign({}, e, {
      titleShort: (pr.titleShort && (pr.id===e.notionId || normT(pr.titleFor)===normT(e.title))) ? pr.titleShort : null,
      emphasis: pr.emphasis || e.emphasis,
      hide: pr.hide ? pr.hide.slice() : e.hide,
      repeatUntil: pr.repeatUntil != null ? pr.repeatUntil : e.repeatUntil,
      // end times don't sync from the app (feed rows carry end:null) — a
      // hand-set end (incl. 'late'/ALL NIGHT) belongs to the user and sticks
      end: pr.end != null ? pr.end : e.end,
      exceptions: (e.repeat==='weekly' && pr.exceptions) ? pr.exceptions.slice() : e.exceptions,
    });
    const p = prevFeed[e.notionId] || (e.seriesId && prevSeries[e.seriesId]);
    if(!p) added++;
    else if(sig(next) !== sig(p)) updated++;
    return next;
  });
  const newIds = {}, newSeries = {};
  merged.forEach(e=>{ if(e.notionId) newIds[e.notionId] = 1; if(e.seriesId) newSeries[e.seriesId] = 1; });
  let removed = 0; Object.keys(prevFeed).forEach(id=>{
    if(!newIds[id] && !(prevFeed[id].seriesId && newSeries[prevFeed[id].seriesId])) removed++; });
  // drop purely-local rows that DUPLICATE a feed event (same date+start+title) — the
  // app is the source of truth, so the synced copy wins and the stray local one goes.
  // A local WEEKLY row is checked on every date it projects onto: a hand-made
  // "Pub Quiz ↻" from before the app existed would otherwise sit beside the
  // synced quiz every week, forever.
  const fKey = (date, e)=>(date||'')+'|'+(e.start||'')+'|'+normT(e.title);
  const feedKeys = {}; merged.forEach(e=>{ feedKeys[fKey(e.date, e)] = 1; });
  const feedDates = {}; merged.forEach(e=>{ feedDates[e.date] = 1; });
  const localKept = local.filter(e=>{
    if(e.repeat!=='weekly') return !feedKeys[fKey(e.date, e)];
    return !Object.keys(feedDates).some(date=>
      dWeekday(date)===dWeekday(e.date) && e.date<=date && (!e.repeatUntil || date<=e.repeatUntil)
      && (e.exceptions||[]).indexOf(date)<0 && feedKeys[fKey(date, e)]);
  });
  const dedup = local.length - localKept.length;
  return { events: localKept.concat(merged), prefs, added, updated, removed, dedup, hidden,
    changed: (added>0 || updated>0 || removed>0 || dedup>0) };
}
/* Apply built feed rows to a whole document through the merge — returns
   { doc, res }. doc is the same object when nothing changed. */
function applyFeedToDoc(doc, rows){
  const res = mergeFeedIntoDoc(doc.events, rows, { prefs:doc.feedPrefs, deleted:doc.feedDeleted });
  if(!res.changed) return { doc, res };
  return { doc: Object.assign({}, doc, { events:res.events, feedPrefs:res.prefs }), res };
}

export { feedWindow, ictHHMM, ictDate, buildDocFromFeed, feedPrefKey, mergeFeedIntoDoc, applyFeedToDoc };
