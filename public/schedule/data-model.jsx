/* ============================================================
   REALITY SCHEDULE STUDIO — data · the model
   Registries (rooms, flags), venue-time date utils, the document
   (blank · starter · normalize) and the read-side selectors.
   eventsOn is THE one place a weekly series is projected onto a
   date: every view, export, capacity check and the CSV read
   through it, and nothing stores a copy.
   Spec: SCHEDULE-STUDIO-SPEC.md
   ============================================================ */

/* Location registry — editable config, drives the auto-legend. */
const LOCATIONS = [
  { code:'1L', label:'1st-Floor Lounge' },
  { code:'2L', label:'2nd-Floor Lounge' },
  { code:'2E', label:'Event Space' },
  { code:'3P', label:'3rd-Floor Patio' },
];
const FLAGS = [
  { key:'prereg', glyph:'*', label:'Requires Pre-Registration' },
  { key:'fee',    glyph:'$', label:'Has Fee Beyond Purchase' },
];

/* Daily-card layout ids. Duplicated from DAILY_CARDS in render-daily-kit.jsx:
   the data layer must be able to normalise a document without the render
   engine. An archive
   naming a layout we no longer ship falls back to classic rather than blank. */
const DAILY_CARD_IDS = ['classic','flood','misreg','spine','chrono'];

/* ---- dates (all ISO yyyy-mm-dd strings; UTC-noon anchor avoids TZ drift) ---- */
function dToDate(iso){ return new Date(iso + 'T12:00:00Z'); }
function dToISO(d){ return d.toISOString().slice(0,10); }
function dAdd(iso, n){ const d = dToDate(iso); d.setUTCDate(d.getUTCDate()+n); return dToISO(d); }
function dWeekday(iso){ const w = dToDate(iso).getUTCDay(); return w===0 ? 7 : w; }   // ISO 1..7
function dShort(iso){ const d = dToDate(iso); return d.getUTCDate() + '.' + (d.getUTCMonth()+1); }
function dShortYr(iso){ const d = dToDate(iso); return d.getUTCDate() + '.' + (d.getUTCMonth()+1) + '.' + String(d.getUTCFullYear()).slice(2); }
function rangeDates(range){ const out=[]; for(let i=0;i<range.days;i++) out.push(dAdd(range.start,i)); return out; }
function rangeLabel(range){ const end = dAdd(range.start, range.days-1); return dShortYr(range.start) + ' - ' + dShortYr(end); }
/* Today's date AT THE VENUE — Asia/Ho_Chi_Minh, whatever timezone the laptop
   happens to be in. The venue is UTC+7 with no DST, so shifting the epoch by a
   fixed 7h and reading the UTC date is exact (the same pin ictDate uses for the
   feed). The old browser-local version was right in Đà Nẵng and wrong on a
   laptop still set to home time — "this week" landed on the wrong Monday and
   the Backstage push skipped a day that hadn't happened yet. `now` (epoch ms)
   is for the self-test. */
function todayIso(now){
  return new Date((now==null ? Date.now() : now) + 7*3600*1000).toISOString().slice(0,10); }
/* The Monday that opens the venue's current week (Mon–Sun). */
function thisMonday(now){ const iso = todayIso(now); return dAdd(iso, 1 - dWeekday(iso)); }
function nextMonday(now){ return dAdd(thisMonday(now), 7); }

let _sid = 1;
function suid(){ return 'ev' + (_sid++) + '_' + Math.random().toString(36).slice(2,7); }

/* ---- document ---- */
function blankEvent(date){
  return { id:suid(), date, start:'19:00', end:null, title:'New event', titleShort:null,
           locations:[], flags:{ prereg:false, fee:false }, emphasis:'none', hide:[],
           repeat:null, repeatUntil:null, exceptions:[], notionId:null, seriesId:null };
}
/* startIso defaults to THIS week's Monday: the tool opens on the week that is
   actually happening, and the feed pull fills it (spec §4). */
function newDoc(startIso){
  return {
    version:2,
    range:{ start:startIso || thisMonday(), days:7 },
    header:{ title:'PUBLIC EVENTS' },
    days:{},
    events:[],
    splits:[],
    footer:{ supportNote:true,
      supportText:'While many of our events are free, we do ask that everyone using the space order something, so that REALITY can continue!',
      wifi:'auto', wifiName:'REALITY', wifiPass:'thankyou', density:'auto' },
    style:{ look:'ledger', theme:'day', inkSaver:false },
    sizing:{},   /* per-channel weekly text sizing: { feed|stories: { base:'auto'|step, perDay:{date:step} } } */
    cover:{ layout:'banner', sizeOffset:0, cols:'auto', titles:'wrap', qr:false },   /* FB cover: styling + text-size bias, columns, title handling, optional QR */
    /* daily card: discrete per-variant text-size bias, plus the LAYOUT — one
       choice for the whole document, because a week of cards posted a morning
       at a time has to look like one week. */
    daily:{ story:0, feed:0, card:'classic' },
    /* App-sync memory (see mergeFeedIntoDoc). feedPrefs: the presentation you
       gave a synced event — short title, emphasis, hidden channels, end time,
       skipped weeks — keyed by series ('s:'+seriesId) or, for a one-off, by
       occurrence ('e:'+feed id), so it survives the row being swapped for next
       week's copy. feedDeleted: tombstones for synced events you deleted here,
       so the next pull doesn't quietly put them back. */
    feedPrefs:{},
    feedDeleted:[],
    savedAt:0,   /* epoch ms of the last real edit — what cloud sync compares */
  };
}

/* Real week of 8.6.26 — the 30-event stress test. DEV ONLY: no longer the
   first-run document (a new install opens on the current week and pulls the
   feed). Load it on purpose with ?seed=stress. */
function starterDoc(){
  const doc = newDoc('2026-06-08');
  doc.splits = ['2026-06-11'];
  doc.days = { '2026-06-14':{ status:'closed', note:'CLOSED FOR STAFF TRIP' } };
  const E = (date, start, end, title, locs, fl, emph, tShort)=>({
    id:suid(), date, start, end:end||null, title, titleShort:tShort||null,
    locations:locs||[], flags:{ prereg:!!(fl&&fl.indexOf('*')>=0), fee:!!(fl&&fl.indexOf('$')>=0) },
    emphasis:emph||'none', hide:[], repeat:null, repeatUntil:null, exceptions:[], notionId:null });
  doc.events = [
    E('2026-06-08','17:00',null,  'How to DJ',['2E'],'$'),
    E('2026-06-08','17:00','21:00','Happy Hour: Buy1Get1 Cocktails',[]),
    E('2026-06-08','19:00','late','Board Game Night',['1L','2L','2E','3P']),
    E('2026-06-09','13:30',null,  'French Social Club',['2E']),
    E('2026-06-09','14:00',null,  'Awareness Itself: Intro Nondual Meditation',['2L'],null,null,'Intro Nondual Meditation'),
    E('2026-06-09','17:00',null,  'FIRE Meetup (Fin. Ind. Retire Early)',['2E'],'*','none','FIRE Meetup'),
    E('2026-06-09','19:00',null,  'Đà Nẵng Nomad Chess Club',['2E']),
    E('2026-06-09','20:00',null,  'Talk Circle: Playfulness + Attraction',['2L']),
    E('2026-06-10','14:30',null,  'Vietnam Talk: Culture + Language',['2E']),
    E('2026-06-10','16:30',null,  'PULSE Sessions 2: Ambition w/o Losing Yourself',['2L'],null,null,'PULSE 2: Ambition'),
    E('2026-06-10','17:00',null,  'Workshop: Stop Chasing Virality!',['2E']),
    E('2026-06-10','18:30',null,  'Short Films Talk: Screenings + Discussion',['2E'],null,null,'Short Films Talk'),
    E('2026-06-10','20:30',null,  'Speed Friending, 4th Edition',['2E']),
    E('2026-06-11','11:00',null,  'Coffee + Conversation: Starting Over',['2L']),
    E('2026-06-11','11:30',null,  'Mandarin Fun Club',['2E']),
    E('2026-06-11','13:30',null,  'Nutrition: Getting Strong: Protein + Exercise',['2E'],null,null,'Nutrition: Protein + Exercise'),
    E('2026-06-11','15:00',null,  'Teen Hangout',['1L']),
    E('2026-06-11','17:00',null,  'AI Meetup',['2E']),
    E('2026-06-11','18:00',null,  'Spill It w/Dr. Steph: Desire, Intimacy',['2L']),
    E('2026-06-11','19:00',null,  'GeoGuessr Battle Night',['2E']),
    E('2026-06-11','19:30',null,  'Grounded: A Men’s Wellness Talk',['3P']),
    E('2026-06-11','21:00',null,  'Karaoke',['2E']),
    E('2026-06-12','16:00',null,  'Create in Community: Art Skill Sharing',['2E']),
    E('2026-06-12','18:30',null,  'Film Club: Sicario (2015)',['2E']),
    E('2026-06-12','19:00',null,  'No Mic Open Mic: Rooftop Acoustic Jam',['3P']),
    E('2026-06-12','20:00',null,  'Language Mixer: Money Talks',['2L']),
    E('2026-06-13','11:00',null,  'Cẩm Nang Lần Đầu Đến Úc',['2E']),
    E('2026-06-13','13:00',null,  'Women of REALITY',['2L']),
    E('2026-06-13','17:00',null,  'Đà Nẵng Film Forum Filmmakers Meetup',['2E'],null,null,'Filmmakers Meetup'),
    E('2026-06-13','19:30',null,  'small things, mostly: Travel Photo Sharing Event',['2E'],null,null,'Travel Photo Sharing'),
    E('2026-06-13','20:30',null,  'REALITY 1-Year Anniversary Party',['2E'],null,'banner'),
  ];
  return doc;
}

function normalizeDoc(d){
  const base = newDoc();
  const doc = Object.assign({}, base, d);
  doc.range = Object.assign({}, base.range, d && d.range);
  doc.range.days = Math.max(1, Math.min(10, doc.range.days|0 || 7));
  doc.header = Object.assign({}, base.header, d && d.header);
  doc.footer = Object.assign({}, base.footer, d && d.footer);
  doc.style = Object.assign({}, base.style, d && d.style);
  doc.days = (d && d.days) || {};
  doc.splits = ((d && d.splits) || []).filter(s=>rangeDates(doc.range).indexOf(s)>=0);
  doc.sizing = {};
  const _inRange = rangeDates(doc.range), _src = (d && d.sizing) || {};
  ['feed','stories'].forEach(chId=>{
    const s = _src[chId] || {}, perDay = {};
    Object.keys(s.perDay || {}).forEach(date=>{ if(_inRange.indexOf(date)>=0) perDay[date] = s.perDay[date]|0; });
    doc.sizing[chId] = { base:(s.base==null ? 'auto' : s.base), perDay };
  });
  doc.cover = Object.assign({ layout:'banner', sizeOffset:0, cols:'auto', titles:'wrap', qr:false }, (d && d.cover) || {});
  doc.daily = Object.assign({ story:0, feed:0, card:'classic' }, (d && d.daily) || {});
  if(DAILY_CARD_IDS.indexOf(doc.daily.card) < 0) doc.daily.card = 'classic';
  doc.events = ((d && d.events) || []).map(ev=>Object.assign(blankEvent(ev.date||doc.range.start), ev,
    { flags:Object.assign({prereg:false,fee:false}, ev.flags), locations:ev.locations||[], hide:ev.hide||[],
      repeat:ev.repeat==='weekly'?'weekly':null, exceptions:(ev.exceptions||[]).slice() }));
  doc.feedPrefs = (d && d.feedPrefs && typeof d.feedPrefs==='object') ? d.feedPrefs : {};
  doc.feedDeleted = (d && Array.isArray(d.feedDeleted)) ? d.feedDeleted : [];
  doc.savedAt = (d && +d.savedAt) || 0;
  return doc;
}

/* ---- selectors ---- */
/* A day here is the venue's NIGHT, not the calendar's: the bar runs past
   midnight, and the daily chrono card already draws the day as 11:00 → 02:00.
   So a start before 06:00 is the tail of that night — it sorts AFTER the late
   evening instead of floating to the top of the list. (The feed mapping in data-feed.jsx
   files such an event under the previous date for the same reason.) */
const NIGHT_ROLLOVER_H = 6;
function timeKey(t){ const m = /^(\d{1,2}):(\d{2})$/.exec(t||'');
  if(!m) return 0;
  const h = +m[1];
  return (h < NIGHT_ROLLOVER_H ? h+24 : h)*60 + (+m[2]); }
/* A weekly event is stored once (its `date` is the anchor = first occurrence) and
   *projected* onto every later matching weekday at read time — so it shows up forever,
   across every navigated week, with no copies stored. `exceptions` skip single weeks.
   Because this selector is the one funnel every view/export/capacity path uses, the
   projection lights up the whole tool from here. */
function eventsOn(doc, date, channel){
  const wd = dWeekday(date);
  return doc.events
    .filter(e=>{
      if(channel && (e.hide||[]).indexOf(channel)>=0) return false;
      if(e.repeat==='weekly')
        return dWeekday(e.date)===wd && e.date<=date
          && (!e.repeatUntil || date<=e.repeatUntil)
          && (e.exceptions||[]).indexOf(date)<0;
      return e.date===date;
    })
    /* virtual occurrence: stamp the display date, keep the master id (so selecting it
       edits the series), tag _proj so the editor can mark it as an auto-repeat */
    .map(e=>(e.repeat==='weekly' && e.date!==date) ? Object.assign({}, e, { date, _proj:true }) : e)
    .sort((a,b)=>timeKey(a.start)-timeKey(b.start) || a.title.localeCompare(b.title));
}
function dayInfo(doc, date){ return doc.days[date] || { status:'open' }; }
function timeLabel(ev){
  if(ev.end==='late') return ev.start + ' - ALL NIGHT';
  if(ev.end) return ev.start + ' - ' + ev.end;
  return ev.start;
}
/* legend: only codes + flags actually present in these dates (per channel) */
function usedLegend(doc, dates, channel){
  const locs = {}, fl = {};
  dates.forEach(date=>eventsOn(doc, date, channel).forEach(ev=>{
    (ev.locations||[]).forEach(c=>locs[c]=1);
    if(ev.flags.prereg) fl.prereg=1;
    if(ev.flags.fee) fl.fee=1;
  }));
  return {
    locations: LOCATIONS.filter(l=>locs[l.code]),
    flags: FLAGS.filter(f=>fl[f.key]),
  };
}
/* split the range into contiguous parts at doc.splits (split AFTER the listed date) */
function partDates(doc){
  const dates = rangeDates(doc.range);
  const parts = [[]];
  dates.forEach(date=>{
    parts[parts.length-1].push(date);
    if(doc.splits.indexOf(date)>=0) parts.push([]);
  });
  return parts.filter(p=>p.length);
}

export { LOCATIONS, FLAGS, dToDate, dToISO, dAdd, dWeekday, dShort, dShortYr, rangeDates, rangeLabel,
  todayIso, thisMonday, nextMonday, suid, blankEvent, newDoc, starterDoc, normalizeDoc, timeKey,
  eventsOn, dayInfo, timeLabel, usedLegend, partDates };
