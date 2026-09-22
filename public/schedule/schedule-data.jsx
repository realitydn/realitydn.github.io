/* ============================================================
   REALITY SCHEDULE STUDIO — data layer
   Model, date utils, registries, parsers (quick-add / paste /
   CSV), serializers, persistence, brand atoms (wordmark, QR).
   Spec: SCHEDULE-STUDIO-SPEC.md
   ============================================================ */

/* Brand atoms — the neutrals, the three faces and the Year 2 weekday coding
   (MON green · TUE blue · WED purple · THU pink · FRI red · SAT orange (amber)
   · SUN yellow; purple is the one block that takes cream text) — come from
   ../studio-shared/brand.js, which DERIVES the day tables from
   public/tokens/day-colours.json (canon 18.08.26) at build time. A canvas
   renderer can't read CSS custom properties, so the hexes are inlined into
   the bundle rather than read at run time; the verifier checks that one
   source. Keyed by ISO weekday (1=Mon .. 7=Sun). */
import {
  INK_HEX as INK, CREAM_HEX as CREAM, WHITE_HEX as WHITE, MONT, ALT, GROT,
  DAY_COLORS, DAY_TEXT, DAY_ABBR_ISO as DAY_ABBR, DAY_FULL,
  PALETTE, INK_MARK, INK_MARK_CELLS, INK_MARK_DAY_ACCENT, inkMarkCells, inkMarkLayout, inkMarkHex,
} from '../studio-shared/brand.js';
import { WordmarkSVG as Wordmark } from '../studio-shared/wordmark.jsx';
import { QRGlyph, qrPatternOf, QUIET_SPEC, QUIET_TIGHT } from '../studio-shared/qr.js';
import { openDB, makeWriter } from '../studio-shared/store.js';

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

/* Daily-card layout ids. Duplicated from DAILY_CARDS in schedule-render.jsx:
   this file is loaded first and must be able to normalise a document on its
   own. An archive
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
   evening instead of floating to the top of the list. (The feed mapping below
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

/* ============================================================
   PARSERS
   ============================================================ */
const CODESET = ()=>LOCATIONS.map(l=>l.code.toUpperCase());

/* tail tokens: location codes (slash-combos ok), * $ prereg fee */
function takeTail(text){
  const codes = CODESET();
  const out = { locations:[], flags:{prereg:false,fee:false} };
  let words = text.trim().split(/\s+/);
  for(;;){
    if(!words.length) break;
    const w = words[words.length-1];
    const W = w.toUpperCase().replace(/[.,;]$/,'');
    if(W==='*' || W==='PREREG'){ out.flags.prereg=true; words.pop(); continue; }
    if(W==='$' || W==='FEE'){ out.flags.fee=true; words.pop(); continue; }
    const segs = W.split('/');
    if(segs.length && segs.every(s=>codes.indexOf(s)>=0)){
      out.locations = segs.map(s=>codes[codes.indexOf(s)]).concat(out.locations);
      words.pop(); continue;
    }
    break;
  }
  out.title = words.join(' ').replace(/[:\s]+$/,'').trim();
  return out;
}

/* "17:00 - 21:00: Happy Hour: Buy1Get1 Cocktails 1L/2E *" → partial event */
function parseQuickLine(line){
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*(?:[-–]\s*(?:(\d{1,2})[:.](\d{2})|(ALL\s*NIGHT|LATE)))?\s*[:–-]?\s*(.+)$/i.exec(line);
  if(!m) return null;
  const pad = n=>(n.length<2?'0':'')+n;
  const tail = takeTail(m[6]);
  if(!tail.title) return null;
  return {
    start: pad(m[1]) + ':' + m[2],
    end: m[5] ? 'late' : (m[3] ? pad(m[3]) + ':' + m[4] : null),
    title: tail.title, locations: tail.locations, flags: tail.flags,
  };
}

/* whole pasted block: MON/TUE… or 8.6 / ISO headers assign dates; CLOSED lines set day notes */
function parsePasteBlock(text, doc){
  const dates = rangeDates(doc.range);
  const byWeekday = {}; dates.forEach(d=>{ const w=dWeekday(d); if(!(w in byWeekday)) byWeekday[w]=d; });
  const events = [], notes = {}, errors = [];
  let cur = null;
  text.split(/\r?\n/).forEach((raw)=>{
    const line = raw.trim();
    if(!line) return;
    const wd = /^(MON|TUE|WED|THU|FRI|SAT|SUN)\b/i.exec(line);
    const dm = /^(\d{1,2})\.(\d{1,2})(?:\.\d{2,4})?$/.exec(line);
    const iso = /^(\d{4}-\d{2}-\d{2})$/.exec(line);
    if(wd){ const w = {MON:1,TUE:2,WED:3,THU:4,FRI:5,SAT:6,SUN:7}[wd[1].toUpperCase()];
      cur = byWeekday[w] || null; if(!cur) errors.push('No '+wd[1].toUpperCase()+' in the current range: "'+line+'"'); return; }
    if(iso){ cur = dates.indexOf(iso[1])>=0 ? iso[1] : null; if(!cur) errors.push('Date outside range: '+iso[1]); return; }
    if(dm){ const hit = dates.filter(d=>dShort(d)===(+dm[1])+'.'+(+dm[2]))[0];
      cur = hit || null; if(!cur) errors.push('Date outside range: '+line); return; }
    if(/^CLOSED/i.test(line)){ if(cur) notes[cur] = { status:'closed', note:line.toUpperCase() }; return; }
    const ev = parseQuickLine(line);
    if(ev){ if(!cur){ errors.push('Event before any day header: "'+line+'"'); return; }
      events.push(Object.assign(blankEvent(cur), ev, { id:suid() })); return; }
    errors.push('Could not parse: "'+line+'"');
  });
  return { events, notes, errors };
}

/* ---- CSV (Schedule Studio CSV v1) ---- */
function parseCSVText(text){
  const rows = []; let row = [], cell = '', q = false;
  for(let i=0;i<text.length;i++){
    const c = text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=c; }
    else if(c==='"') q = true;
    else if(c===','){ row.push(cell); cell=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(cell); rows.push(row); row=[]; cell=''; }
    else cell+=c;
  }
  if(cell.length||row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r=>r.some(c=>c.trim()!==''));
}
function parseCSV(text){
  const rows = parseCSVText(text);
  if(!rows.length) return { events:[], errors:['Empty file'] };
  const head = rows[0].map(h=>h.trim().toLowerCase().replace(/\s+/g,'_'));
  const col = name=>head.indexOf(name);
  const iDate=col('date'), iStart=col('start'), iEnd=col('end'), iTitle=col('title'),
        iShort=col('title_short'), iLoc=col('locations'), iFlags=col('flags'), iEmph=col('emphasis'), iRepeat=col('repeat');
  if(iDate<0 || iTitle<0) return { events:[], errors:['Header must include at least "date" and "title" columns'] };
  const events = [], errors = [], seenWeekly = {};
  rows.slice(1).forEach((r, idx)=>{
    const get = i=>(i>=0 && r[i]!=null) ? r[i].trim() : '';
    const date = get(iDate), title = get(iTitle);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){ errors.push('Row '+(idx+2)+': bad date "'+date+'"'); return; }
    if(!title){ errors.push('Row '+(idx+2)+': missing title'); return; }
    let start = get(iStart) || '19:00';
    const sm = /^(\d{1,2}):(\d{2})$/.exec(start);
    if(!sm){ errors.push('Row '+(idx+2)+': bad start "'+start+'"'); return; }
    start = (sm[1].length<2?'0':'')+sm[1]+':'+sm[2];
    let end = get(iEnd).toLowerCase(); end = end==='' ? null : (end==='late'||end==='all night' ? 'late' : end);
    if(end && end!=='late' && !/^\d{1,2}:\d{2}$/.test(end)){ errors.push('Row '+(idx+2)+': bad end "'+end+'"'); end = null; }
    const codes = CODESET();
    const locations = get(iLoc).split(/[\/,;|\s]+/).map(s=>s.toUpperCase()).filter(s=>codes.indexOf(s)>=0);
    const ftxt = get(iFlags).toLowerCase();
    const flags = { prereg:/(\*|prereg)/.test(ftxt), fee:/(\$|fee)/.test(ftxt) };
    let emphasis = get(iEmph).toLowerCase();
    emphasis = emphasis==='bold'||emphasis==='banner' ? emphasis : 'none';
    const repeat = /weekly/i.test(get(iRepeat)) ? 'weekly' : null;
    if(repeat==='weekly'){   /* a multi-week snapshot lists the same series once per week — collapse to one master */
      const sig = title.toLowerCase()+'|'+start+'|'+dWeekday(date);
      if(seenWeekly[sig]) return; seenWeekly[sig] = 1;
    }
    events.push(Object.assign(blankEvent(date), { start, end, title,
      titleShort:get(iShort)||null, locations, flags, emphasis, repeat }));
  });
  return { events, errors };
}
function csvEscape(s){ s = String(s==null?'':s); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }
function serializeCSV(doc){
  const lines = ['date,start,end,title,title_short,locations,flags,emphasis,repeat'];
  rangeDates(doc.range).forEach(date=>eventsOn(doc, date).forEach(ev=>{
    const flags = [ev.flags.prereg?'prereg':null, ev.flags.fee?'fee':null].filter(Boolean).join(' ');
    lines.push([ev.date, ev.start, ev.end||'', csvEscape(ev.title), csvEscape(ev.titleShort||''),
      (ev.locations||[]).join('/'), flags, ev.emphasis==='none'?'':ev.emphasis,
      ev.repeat==='weekly'?'weekly':''].join(','));
  }));
  return lines.join('\n');
}

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

/* ---- editing helpers (pure; the app wraps each in one setDoc) ---- */
/* Delete an event. A synced event also leaves a tombstone so the next pull
   doesn't put it straight back: a weekly series is tombstoned by SERIES (every
   week stays gone), a one-off by its occurrence id. Restorable from the
   Document panel (restoreFeedEvent). */
function deleteEventFromDoc(doc, id){
  const ev = doc.events.filter(e=>e.id===id)[0];
  if(!ev) return doc;
  const events = doc.events.filter(e=>e.id!==id);
  if(!ev.notionId) return Object.assign({}, doc, { events });
  const key = (ev.repeat==='weekly' && ev.seriesId) ? 's:'+ev.seriesId : 'e:'+ev.notionId;
  const feedDeleted = (doc.feedDeleted||[]).filter(t=>t.key!==key)
    .concat([{ key, title:ev.title, date:ev.date, weekly:ev.repeat==='weekly' }]);
  return Object.assign({}, doc, { events, feedDeleted });
}
function restoreFeedEvent(doc, key){
  return Object.assign({}, doc, { feedDeleted:(doc.feedDeleted||[]).filter(t=>t.key!==key) });
}
/* Clear what occurs in `range` before a Replace import, WITHOUT duplicating
   weekly series. A one-off dated in the range goes. A local weekly series
   anchored before the range would otherwise keep projecting into it beside the
   replacement rows — so instead of deleting the series (it still owns every
   other week) its in-range dates become skipped weeks. A synced row (weekly or
   not) that shows in the range is simply dropped: the feed re-delivers it.
   localOnly: leave synced rows alone (the feed Replace path, where the merge
   replaces them anyway). */
function clearRangeOccurrences(events, range, localOnly){
  const ds = rangeDates(range);
  const out = [];
  (events||[]).forEach(e=>{
    const feed = !!e.notionId;
    if(localOnly && feed){ out.push(e); return; }
    const hits = e.repeat==='weekly' ? ds.filter(d=>eventsOn({ events:[e] }, d).length) : (ds.indexOf(e.date)>=0 ? [e.date] : []);
    if(!hits.length){ out.push(e); return; }
    if(e.repeat==='weekly' && !feed){
      const exc = (e.exceptions||[]).slice();
      hits.forEach(d=>{ if(exc.indexOf(d)<0) exc.push(d); });
      out.push(Object.assign({}, e, { exceptions:exc.sort() }));
    }
  });
  return out;
}
/* Clone → next period. One-offs you typed in shift forward with the range;
   weekly series stay put (they already project into the new range). Synced
   ONE-OFFS do not clone: they're specific to their week, and a local copy of
   last week's workshop is a ghost the sync never removes — the new week's own
   events arrive from the feed. */
function cloneToNextPeriod(doc){
  const n = doc.range.days;
  return Object.assign({}, doc, {
    range:{ start:dAdd(doc.range.start, n), days:n },
    splits:doc.splits.map(s=>dAdd(s, n)),
    days:Object.keys(doc.days).reduce((o,k)=>{ o[dAdd(k, n)] = doc.days[k]; return o; }, {}),
    events:doc.events.filter(e=>e.repeat==='weekly').concat(
      doc.events.filter(e=>e.repeat!=='weekly' && !e.notionId)
        .map(e=>Object.assign({}, e, { id:suid(), date:dAdd(e.date, n), notionId:null, seriesId:null }))),
  });
}

/* ---- persistence ----
   The working doc lives in IndexedDB (../studio-shared/store.js — the layer
   Poster and Print stand on) in Schedule's own database: 'reality-schedule',
   object store 'kv', key 'doc', the doc object exactly as it is (the shape
   Save JSON writes; savedAt is already part of it). It used to live ONLY in
   localStorage under SCH_LS — one ~5MB box per origin that Poster + Print
   fill too, so a full box meant NOT SAVED.

   COEXISTENCE, while tabs still running the old code may be open (added
   23.09.26). Old code reads and writes localStorage only; this code:
     • on load, reads BOTH copies and adopts the one with the newer savedAt
       (a tie goes to IndexedDB — they are the same save). The app's first
       autosave then writes the adopted doc to both, so it lands in IDB;
     • on every save, writes IndexedDB AND the localStorage copy.
   So an old tab's edits (localStorage, newer savedAt) win the next load here,
   and this code's edits are in the box the old tab reads. Neither loses the
   other's work. The localStorage copy is also what survives a tab closed
   mid-IDB-write (setItem is synchronous).
   FOLLOW-UP: once every Schedule tab has reloaded onto this code (a later
   release — see docs/REFACTOR-PLAN.md, "Schedule localStorage copy"), drop the
   storeDoc() call in saveStoredDoc and the readLSDoc() fallback in
   loadStoredDoc, and remove SCH_LS from localStorage. */
const SCH_LS = 'reality-schedule-doc-v2';
const SCH_DB = 'reality-schedule', SCH_KV = 'kv', SCH_KEY = 'doc';
let _schDb = null;
function schDb(){
  return _schDb || (_schDb = openDB({ name:SCH_DB, version:1,
    upgrade(d){ if(!d.objectStoreNames.contains(SCH_KV)) d.createObjectStore(SCH_KV); } }));
}
/* One IDB write in flight, the newest doc queued behind it (a typed title is a
   change per key). */
let _idbWrite = null;
function writeIDBDoc(doc){
  if(!_idbWrite) _idbWrite = makeWriter(d=>schDb().put(SCH_KV, d, SCH_KEY));
  return _idbWrite(doc);
}
function readLSDoc(){
  try{ const r = localStorage.getItem(SCH_LS); if(r){ const d = JSON.parse(r); if(d && d.events) return d; } }catch(e){}
  return null;
}
/* true when the localStorage write landed (false when that box is full). */
function storeDoc(doc){ try{ localStorage.setItem(SCH_LS, JSON.stringify(doc)); return true; }catch(e){ return false; } }

/* Newer savedAt wins; a tie goes to IndexedDB; anything without an events
   list isn't a doc. Pure: → { doc, from:'idb'|'ls'|null }. */
function pickNewerDoc(idbDoc, lsDoc){
  const a = (idbDoc && idbDoc.events) ? idbDoc : null;
  const b = (lsDoc && lsDoc.events) ? lsDoc : null;
  if(!a && !b) return { doc:null, from:null };
  if(!b) return { doc:a, from:'idb' };
  if(!a) return { doc:b, from:'ls' };
  return (+b.savedAt||0) > (+a.savedAt||0) ? { doc:b, from:'ls' } : { doc:a, from:'idb' };
}
/* Both writes, every save: writeLS(doc) → bool (synchronous, first),
   writeIDB(doc) → Promise. Resolves { ls, idb, ok }, ok when EITHER copy
   landed — the next load adopts whichever is newer. Pure over its writers. */
function writeBothDocs(doc, writeLS, writeIDB){
  let ls = false;
  try{ ls = !!writeLS(doc); }catch(e){ ls = false; }
  let p;
  try{ p = Promise.resolve(writeIDB(doc)); }catch(e){ p = Promise.reject(e); }
  return p.then(()=>true, ()=>false).then(idb=>({ ls, idb, ok: ls || idb }));
}

/* The stored document, or null on a first run (nothing stored) — the app then
   opens a blank document on the current week and lets the feed fill it. A
   wedged IndexedDB (a second tab mid-upgrade) gets 3 s, then the
   localStorage copy is used alone. */
async function loadStoredDoc(){
  const ls = readLSDoc();
  let idb = null;
  try{
    idb = await Promise.race([
      schDb().get(SCH_KV, SCH_KEY),
      new Promise((_, rej)=>setTimeout(()=>rej(new Error('IndexedDB read timed out')), 3000)),
    ]);
  }catch(e){ console.warn('[schedule] IndexedDB unavailable — using the localStorage copy.', e); idb = null; }
  const pick = pickNewerDoc(idb, ls);
  return pick.doc ? normalizeDoc(pick.doc) : null;
}
/* Save the working doc: IndexedDB + the localStorage copy (see COEXISTENCE).
   → Promise<{ ls, idb, ok }>; the app shows NOT SAVED when !ok. */
function saveStoredDoc(doc){ return writeBothDocs(doc, storeDoc, writeIDBDoc); }

/* ============================================================
   BRAND ATOMS
   ============================================================ */
/* The canonical REALITY wordmark — Montserrat w/ Alternates A,I,Y, baked
   vector (the site Logo's paths) — is ../studio-shared/wordmark.jsx, imported
   above as Wordmark. tight=true crops the built-in margins so it sits flush
   in left-aligned headers. */

/* Real QR — encodes https://app.realitydn.com (QR_TARGET below; v2, EC M),
   live, through ../studio-shared/qr.js — the encoder the Poster and Print use.
   Until 23.09.26 this was a matrix pinned from tools/generate-qr.py.

   DELIBERATELY NOT the same target as the Poster Studio's code, which stays on
   the bare apex realitydn.com per canon D5. A poster is an advert for one
   event and the site is where you land; a weekly schedule is a LISTING, and
   the thing a listing wants to hand you is the live version of itself — the
   app, where the same week carries every event's detail page, and where a
   printed sheet from Monday still resolves to Thursday's changes. The printed
   site string on the sheet stays realitydn.com; only the code goes to the app. */
/* INK MARK — canon rev 22.08.26 — is brand.js's (INK_MARK, the artwork cell
   table, inkMarkCells / inkMarkLayout / inkMarkHex): the one block the Poster
   and Print draw too, so the three renderers cannot drift to different marks.
   Machine spec: design-system-year2/design_handoff_web_app_ink_pass/tokens/
   ink-strip.json — cell ORDER is FIXED, recolouring (mode / day) is the only
   parameter. */
/* The mark itself. `m` is the module in px; the caller sizes it, exactly as the
   poster ticket does, so a mark beside a QR can be pinned to that QR's height.
   No radius, no gradients, no cell shadows — the spec bans all three. */
function SchInkMark({ form, mode, m, day }){
  const lay = inkMarkLayout(form);
  const cells = inkMarkCells(form, mode||'full');
  const acc = INK_MARK_DAY_ACCENT[day||'fri'] || 'red';
  const nameOf = (slot)=> slot[0]==='b' ? cells.bands[+slot.slice(1)] : cells.field[+slot.slice(1)];
  return <div aria-hidden="true" style={{ position:'relative', flex:'none',
      width:lay.cols*m, height:lay.rows*m }}>
    {lay.boxes.map(b=>(
      <div key={b.slot} style={{ position:'absolute', left:b.x*m, top:b.y*m, width:b.w*m, height:b.h*m,
        background:inkMarkHex(nameOf(b.slot), acc) }} />
    ))}
  </div>;
}

const QR_TARGET = 'https://app.realitydn.com';
const QR_HOST   = 'app.realitydn.com';
/* Two lengths for the label, because the QR appears in footers of very
   different widths. The renderer picks by available space — full sentence in
   the print/story footers, the short host where a grid cell is the size of a
   stamp, nothing at all when even that won't sit. */
const QR_LABEL      = 'Full schedule + event details';
const QR_LABEL_SHORT= 'Full schedule';
/* The same offer as a sentence, for surfaces that carry the words WITHOUT a
   code beside them — the FB cover, where 315px of height has no room for a
   scannable one, and any daily card whose footer is a line rather than a block.
   One constant so the host is spelled one way everywhere: bare, no scheme, no
   www (canon D5). */
const QR_CTA        = 'Full schedule + details at ' + QR_HOST;
/* The quiet-zone maths (QUIET_SPEC / QUIET_TIGHT / qrPatternOf — the pattern
   inside a tile, which sizes the ink square butted against the code), the
   encoder and the <div>-grid glyph are ../studio-shared/qr.js, the same ones
   the Poster uses. The live encoder picks a different (equally valid) mask
   than the old pinned matrix did — still 25 modules, so every size and the
   ink square beside it are unchanged. flex:none so a footer row never
   squeezes it. */
function SchQR(props){ return <QRGlyph {...props} text={QR_TARGET} style={{ flex:'none' }} />; }

export {
  INK, CREAM, WHITE, MONT, ALT, GROT,
  DAY_COLORS, DAY_TEXT, DAY_ABBR, DAY_FULL, LOCATIONS, FLAGS,
  dToDate, dToISO, dAdd, dWeekday, dShort, dShortYr, rangeDates, rangeLabel, nextMonday, thisMonday, todayIso,
  suid, blankEvent, newDoc, starterDoc, normalizeDoc,
  timeKey, eventsOn, dayInfo, timeLabel, usedLegend, partDates,
  parseQuickLine, parsePasteBlock, parseCSV, serializeCSV,
  buildDocFromFeed, mergeFeedIntoDoc, applyFeedToDoc, feedWindow, feedPrefKey, ictHHMM, ictDate,
  deleteEventFromDoc, restoreFeedEvent, clearRangeOccurrences, cloneToNextPeriod,
  loadStoredDoc, saveStoredDoc, storeDoc, pickNewerDoc, writeBothDocs,
  Wordmark, SchQR, qrPatternOf, QUIET_SPEC, QUIET_TIGHT, QR_TARGET, QR_HOST, QR_LABEL, QR_LABEL_SHORT, QR_CTA,
  PALETTE, INK_MARK, INK_MARK_CELLS, INK_MARK_DAY_ACCENT, inkMarkCells, inkMarkLayout, inkMarkHex, SchInkMark,
};
