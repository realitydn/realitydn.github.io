/* ============================================================
   REALITY SCHEDULE STUDIO — data layer
   Model, date utils, registries, parsers (quick-add / paste /
   CSV), serializers, persistence, brand atoms (wordmark, QR).
   Spec: SCHEDULE-STUDIO-SPEC.md
   ============================================================ */

const INK = '#0d0905';
const CREAM = '#fffbf1';
const WHITE = '#ffffff';
const MONT = "'Montserrat',sans-serif";
const ALT = "'Montserrat Alternates',sans-serif";
const GROT = "'Space Grotesk',sans-serif";

/* Year 2 locked palette, glued to weekdays (ISO 1=Mon .. 7=Sun):
   MON green · TUE blue · WED purple · THU pink · FRI red · SAT orange (amber) · SUN yellow.
   Purple is the one block that takes cream text (--on-ink logic).
   SOURCE OF TRUTH: public/tokens/day-colours.json (canon 18.08.26). These are
   literals only because a canvas renderer can't read CSS custom properties —
   tools/verify-day-colours.mjs enforces the match and fails the build on
   drift. Change the json first, then this block. */
const DAY_COLORS = { 1:'#43b02a', 2:'#18a7e0', 3:'#6e3179', 4:'#ed1b72', 5:'#ed2224', 6:'#fdb515', 7:'#fddf00' };
const DAY_TEXT   = { 1:INK, 2:INK, 3:CREAM, 4:INK, 5:INK, 6:INK, 7:INK };
const DAY_ABBR   = { 1:'MON', 2:'TUE', 3:'WED', 4:'THU', 5:'FRI', 6:'SAT', 7:'SUN' };
const DAY_FULL   = { 1:'Monday', 2:'Tuesday', 3:'Wednesday', 4:'Thursday', 5:'Friday', 6:'Saturday', 7:'Sunday' };

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

/* ---- dates (all ISO yyyy-mm-dd strings; UTC-noon anchor avoids TZ drift) ---- */
function dToDate(iso){ return new Date(iso + 'T12:00:00Z'); }
function dToISO(d){ return d.toISOString().slice(0,10); }
function dAdd(iso, n){ const d = dToDate(iso); d.setUTCDate(d.getUTCDate()+n); return dToISO(d); }
function dWeekday(iso){ const w = dToDate(iso).getUTCDay(); return w===0 ? 7 : w; }   // ISO 1..7
function dShort(iso){ const d = dToDate(iso); return d.getUTCDate() + '.' + (d.getUTCMonth()+1); }
function dShortYr(iso){ const d = dToDate(iso); return d.getUTCDate() + '.' + (d.getUTCMonth()+1) + '.' + String(d.getUTCFullYear()).slice(2); }
function rangeDates(range){ const out=[]; for(let i=0;i<range.days;i++) out.push(dAdd(range.start,i)); return out; }
function rangeLabel(range){ const end = dAdd(range.start, range.days-1); return dShortYr(range.start) + ' - ' + dShortYr(end); }
function nextMonday(){ const t = new Date(); const iso = dToISO(new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate(),12)));
  const w = dWeekday(iso); return dAdd(iso, w===1 ? 7 : 8-w); }

let _sid = 1;
function suid(){ return 'ev' + (_sid++) + '_' + Math.random().toString(36).slice(2,7); }

/* ---- document ---- */
function blankEvent(date){
  return { id:suid(), date, start:'19:00', end:null, title:'New event', titleShort:null,
           locations:[], flags:{ prereg:false, fee:false }, emphasis:'none', hide:[],
           repeat:null, repeatUntil:null, exceptions:[], notionId:null };
}
function newDoc(startIso){
  return {
    version:2,
    range:{ start:startIso || nextMonday(), days:7 },
    header:{ title:'PUBLIC EVENTS' },
    days:{},
    events:[],
    splits:[],
    footer:{ supportNote:true,
      supportText:'While many of our events are free, we do ask that everyone using the space order something, so that REALITY can continue!',
      wifi:'auto', wifiName:'REALITY', wifiPass:'thankyou', density:'auto' },
    style:{ look:'ledger', theme:'day', inkSaver:false },
    sizing:{},   /* per-channel weekly text sizing: { feed|stories: { base:'auto'|step, perDay:{date:step} } } */
    cover:{ layout:'banner', sizeOffset:0, cols:'auto', titles:'wrap' },   /* FB cover: styling + text-size bias, columns, title handling */
    daily:{ story:0, feed:0 },   /* discrete per-day-card text-size bias (9:16 story / 4:5 feed) */
  };
}

/* Real week of 8.6.26 — the seed document and the 30-event stress test. */
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
  doc.cover = Object.assign({ layout:'banner', sizeOffset:0, cols:'auto', titles:'wrap' }, (d && d.cover) || {});
  doc.daily = Object.assign({ story:0, feed:0 }, (d && d.daily) || {});
  doc.events = ((d && d.events) || []).map(ev=>Object.assign(blankEvent(ev.date||doc.range.start), ev,
    { flags:Object.assign({prereg:false,fee:false}, ev.flags), locations:ev.locations||[], hide:ev.hide||[],
      repeat:ev.repeat==='weekly'?'weekly':null, exceptions:(ev.exceptions||[]).slice() }));
  return doc;
}

/* ---- selectors ---- */
function timeKey(t){ const m = /^(\d{1,2}):(\d{2})$/.exec(t||''); return m ? (+m[1])*60+(+m[2]) : 0; }
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
   here — `repeat:'weekly'` is set only as an editor hint when a weekly tag or
   seriesId is present; the anchor `date` is the instance date.

   Time mapping pins the venue TZ (+07:00; Đà Nẵng has no DST): the feed's ISO
   carries the offset, so we read the local wall HH:MM from the +07:00 form.

   `opts`:
     locations : LOCATIONS registry (defaults to the module LOCATIONS)
     range     : { start, days } — events outside the range are dropped
                 (mirrors ImportModal's range-clamp)
     makeId    : () => id  (defaults to suid(); pass a stub in tests)
   Returns { events:[...], errors:[...] }.
   ------------------------------------------------------------ */
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
  list.forEach(ev=>{
    try{
      const date = ictDate(ev.startsAt);
      if(!date){ errors.push('Event "'+(ev.title_en||ev.id||'?')+'" has no usable start date'); return; }
      if(!inRange(date)) return;                                 // silently skip out-of-range (caller clamps)
      const start = ictHHMM(ev.startsAt) || '19:00';
      // End times are deliberately NOT synced from the app — the schedule rarely
      // shows them. `end` is user-owned here: set one by hand in the Inspector
      // and the merge below preserves it across re-syncs.
      const end = null;
      const code = ev.location && ev.location.code ? String(ev.location.code).toUpperCase() : null;
      const mapped = code && codeSet[code] ? codeSet[code] : null;
      const tags = Array.isArray(ev.tags) ? ev.tags.map(t=>String(t).toLowerCase()) : [];
      const weekly = tags.indexOf('weekly')>=0 || !!ev.seriesId;
      // $ (fee) flag: a non-blank `cost` (e.g. "100k") auto-flags, OR an explicit `fee`
      // tag. `cost` is the app's source of truth for "costs money beyond a purchase"
      // (null/blank = free), so a priced event flags without a tag added by hand.
      const hasCost = ev.cost!=null && String(ev.cost).trim()!=='';
      events.push({
        id: mk(), date, start, end, title: ev.title_en || ev.title_vi || 'Untitled event',
        titleShort: null, locations: mapped ? [mapped] : [],
        // map the feed onto the schedule's flags/emphasis ($ = fee, * = prereg)
        flags:{ prereg: tags.indexOf('prereg')>=0, fee: hasCost || tags.indexOf('fee')>=0 },
        emphasis: tags.indexOf('featured')>=0 ? 'banner' : 'none', hide:[],
        repeat: weekly ? 'weekly' : null, repeatUntil:null, exceptions:[],
        notionId: ev.id || null,                                 // feed event id → existing hook
      });
    }catch(e){ errors.push('Could not map a feed event: '+(e&&e.message)); }
  });
  return { events, errors };
}

/* Idempotent App→Schedule merge for the auto-pull-on-open. The app is the source
   of truth, so we REPLACE all feed-sourced rows (notionId set) with the freshly-
   built feed rows, while (a) keeping purely-local rows (notionId == null), (b)
   preserving the user's presentation layer (titleShort, non-default emphasis, hide,
   repeatUntil) by notionId, and (c) collapsing weekly duplicates so weekly
   projections don't stack. Never accumulates across opens; an event removed in the
   app (or now out of range) simply drops. Returns { events, added, updated,
   removed, changed }. Caller no-ops on an empty/failed feed before calling this. */
function mergeFeedIntoDoc(existing, fresh){
  const seenWeekly = {}, rows = [];
  (fresh||[]).forEach(e=>{
    if(!e) return;
    if(e.repeat==='weekly'){
      const k = (e.title||'')+'|'+(e.start||'')+'|'+((e.locations||[]).join(','));
      if(seenWeekly[k]) return; seenWeekly[k] = 1;
    }
    rows.push(e);
  });
  const prevFeed = {}, local = [];
  (existing||[]).forEach(e=>{ if(e && e.notionId) prevFeed[e.notionId] = e; else if(e) local.push(e); });
  // sig includes flags + emphasis so a tag-only change (e.g. a newly-correct $/*)
  // is detected as an update and actually applied by the auto-pull.
  const sig = e=>[e.date,e.start,e.end,e.title,(e.locations||[]).join(','),e.repeat||'',(e.exceptions||[]).join(','),
    (e.flags&&e.flags.fee?'$':'')+(e.flags&&e.flags.prereg?'*':''), e.emphasis||'none'].join('|');
  let added = 0, updated = 0;
  const merged = rows.map(e=>{
    const p = prevFeed[e.notionId];
    if(!p){ added++; return e; }
    /* take core fields from the feed; keep the user's presentation choices */
    const next = Object.assign({}, e, {
      titleShort: p.titleShort,
      emphasis: (p.emphasis && p.emphasis!=='none') ? p.emphasis : e.emphasis,
      hide: p.hide || e.hide,
      repeatUntil: p.repeatUntil != null ? p.repeatUntil : e.repeatUntil,
      // end times don't sync from the app (feed rows carry end:null) — a
      // hand-set end (incl. 'late'/ALL NIGHT) belongs to the user and sticks
      end: p.end != null ? p.end : e.end,
    });
    if(sig(next) !== sig(p)) updated++;
    return next;
  });
  const newIds = {}; merged.forEach(e=>{ if(e.notionId) newIds[e.notionId] = 1; });
  let removed = 0; Object.keys(prevFeed).forEach(id=>{ if(!newIds[id]) removed++; });
  // drop purely-local rows that DUPLICATE a feed event (same date+start+title) — the
  // app is the source of truth, so the synced copy wins and the stray local one goes.
  const fKey = e=>(e.date||'')+'|'+(e.start||'')+'|'+String(e.title||'').trim().toLowerCase();
  const feedKeys = {}; merged.forEach(e=>{ feedKeys[fKey(e)] = 1; });
  const localKept = local.filter(e=>!feedKeys[fKey(e)]);
  const dedup = local.length - localKept.length;
  return { events: localKept.concat(merged), added, updated, removed, dedup,
    changed: (added>0 || updated>0 || removed>0 || dedup>0) };
}

/* ---- persistence ---- */
const SCH_LS = 'reality-schedule-doc-v2';
function loadStoredDoc(){
  try{ const r = localStorage.getItem(SCH_LS); if(r){ const d = JSON.parse(r); if(d && d.events) return normalizeDoc(d); } }catch(e){}
  return starterDoc();
}
function storeDoc(doc){ try{ localStorage.setItem(SCH_LS, JSON.stringify(doc)); }catch(e){} }

/* ============================================================
   BRAND ATOMS
   ============================================================ */
/* Canonical REALITY wordmark — Montserrat w/ Alternates A,I,Y, baked vector
   (same paths as the site Logo + Poster Studio). tight=true crops the built-in
   margins so it sits flush in left-aligned headers. */
const WM_PATHS = [
  'M73.4,63.7V13.3h20.7c4.5,0,8.3.7,11.5,2.1,3.2,1.4,5.7,3.5,7.4,6.2,1.7,2.7,2.6,5.9,2.6,9.6s-.9,6.9-2.6,9.5c-1.7,2.6-4.2,4.7-7.4,6.1-3.2,1.4-7,2.2-11.5,2.2h-15.5l4.1-4.2v18.9h-9.4ZM82.7,45.9l-4.1-4.5h15c4.1,0,7.2-.9,9.3-2.7,2.1-1.8,3.1-4.2,3.1-7.4s-1-5.6-3.1-7.4c-2.1-1.8-5.2-2.6-9.3-2.6h-15l4.1-4.6v29.2ZM106.3,63.7l-12.7-18.3h10l12.8,18.3h-10.1Z',
  'M142.6,55.8h28.4v7.9h-37.8V13.3h36.8v7.9h-27.4v34.6ZM141.8,34.3h25.1v7.7h-25.1v-7.7Z',
  'M188.2,63.7v-27.9c0-5,.9-9.3,2.8-12.7s4.5-6.1,7.8-7.8c3.4-1.8,7.2-2.6,11.7-2.6s8.4.9,11.8,2.6c3.4,1.8,6,4.4,7.8,7.8,1.8,3.5,2.8,7.7,2.8,12.7v27.9h-9.3v-28.8c0-4.8-1.2-8.3-3.6-10.6-2.4-2.3-5.6-3.5-9.5-3.5s-7.2,1.2-9.5,3.5c-2.4,2.3-3.6,5.9-3.6,10.6v28.8h-9.2ZM194.1,50.7v-7.8h32.8v7.8h-32.8Z',
  'M253.3,63.7V13.3h9.4v42.5h26.4v7.9h-35.7Z',
  'M299.8,21.2v-7.9h27.9v7.9h-27.9ZM299.8,63.7v-7.9h27.9v7.9h-27.9ZM309,62.6V14.3h9.4v48.3h-9.4Z',
  'M354.8,63.7V21.2h-16.7v-7.9h42.8v7.9h-16.7v42.5h-9.4Z',
  'M415.7,71.4c-4.2,0-8.1-.6-11.5-1.9-3.5-1.2-6.4-3-8.7-5.2l3.8-7.2c2.3,2,4.7,3.5,7.5,4.5,2.7,1,5.7,1.5,9,1.5s7.8-1.2,10.2-3.5c2.3-2.4,3.5-6,3.5-10.9v-9.8l2.7,1.2c-1.6,3.9-4,6.7-7,8.5-3,1.8-6.6,2.7-10.6,2.7-6.3,0-11.3-1.8-14.8-5.4-3.5-3.6-5.3-8.9-5.3-15.7V13.3h9.4v16.5c0,4.5,1.1,7.9,3.3,10.1,2.2,2.2,5.1,3.3,8.8,3.3s7.2-1.2,9.7-3.5c2.5-2.3,3.7-6,3.7-10.9v-15.6h9.4v35c0,5.1-.9,9.3-2.8,12.7s-4.5,6-7.9,7.7c-3.4,1.8-7.5,2.7-12.2,2.7Z',
];
function Wordmark({ height, color, tight }){
  const vb = tight ? '72.4 12.3 374.2 60.1' : '0 0 512 84';
  return (
    <svg viewBox={vb} height={height} role="img" aria-label="REALITY" style={{ display:'block' }}>
      <g fill={color||INK}>{WM_PATHS.map((d,i)=><path key={i} d={d} />)}</g>
    </svg>
  );
}

/* Real QR — encodes https://app.realitydn.com (v2, EC M). Generated by
   tools/generate-qr.py's algorithm (python-qrcode, EC M, border 0); exports
   scan for real.

   DELIBERATELY NOT the same target as the Poster Studio's code, which stays on
   the bare apex realitydn.com per canon D5. A poster is an advert for one
   event and the site is where you land; a weekly schedule is a LISTING, and
   the thing a listing wants to hand you is the live version of itself — the
   app, where the same week carries every event's detail page, and where a
   printed sheet from Monday still resolves to Thursday's changes. The printed
   site string on the sheet stays realitydn.com; only the code goes to the app. */
/* ============================================================
   INK MARK — canon rev 22.08.26. A verbatim port of the block in
   studio-data.jsx / print-data.jsx: machine spec lives in
   design-system-year2/design_handoff_web_app_ink_pass/tokens/
   ink-strip.json, cell ORDER is FIXED, and recolouring (mode /
   day) is the only parameter. tools/verify-day-colours.mjs checks
   this file alongside the other two, so the three renderers cannot
   drift to different marks.

   PALETTE duplicates the seven hues that DAY_COLORS below also
   carries. That is deliberate, not an oversight: DAY_COLORS is
   keyed by ISO weekday and the verifier reads its literals
   directly (it cannot follow a reference), while the mark needs
   the same hues by NAME. Both blocks are guarded against
   day-colours.json, so a drift between them fails the build.
   ============================================================ */
const PALETTE = {
  blue:'#18a7e0', green:'#43b02a', yellow:'#fddf00',
  amber:'#fdb515', purple:'#6e3179', pink:'#ed1b72', red:'#ed2224'
};
const INK_MARK_CELLS = {
  red:PALETTE.red, blue:PALETTE.blue, yellow:PALETTE.yellow, green:PALETTE.green,
  pink:PALETTE.pink, purple:PALETTE.purple, amber:PALETTE.amber,
  ink:'#0d0905',      /* literal artwork ink */
  stock:'#fffbf1'     /* a COLOUR, not an absence — always an inner cell */
};
const INK_MARK = {
  rev:'22.08.26',
  forms:{
    'strip-v':        { cols:2, rows:9, field:6 },
    'strip-h':        { cols:9, rows:2, field:6 },
    'strip-short-v':  { cols:2, rows:7, field:2 },
    'strip-short-h':  { cols:7, rows:2, field:2 },
    'square':         { cols:4, rows:4, field:4, square:true },
    'square-anchored':{ cols:4, rows:4, field:4, square:true, anchored:true }
  },
  modes:{
    full:    { bands:['red','blue','yellow'], field:['stock','ink','green','pink','purple','amber'], sq:['stock','pink','purple','amber'] },
    majors:  { bands:['red','blue','yellow'], field:['stock','ink','stock','ink','ink','stock'],     sq:['stock','ink','stock','ink'] },
    daycode: { bands:['day','ink','day'],     field:['stock','day','ink','day','day','stock'],       sq:['stock','day','day','ink'] },
    ink:     { bands:['ink','stock','ink'],   field:['ink','stock','stock','ink','ink','stock'],     sq:['stock','ink','ink','ink'] }
  },
  anchoredField:['stock','pink','green','ink'],
  floors:{ strip:8, short:6, square:6 }
};
const INK_MARK_DAY_ACCENT = { mon:'green', tue:'blue', wed:'purple', thu:'pink', fri:'red', sat:'amber', sun:'yellow' };
function inkMarkCells(form, mode){
  const m = INK_MARK.modes[mode] || INK_MARK.modes.full;
  const f = INK_MARK.forms[form] || INK_MARK.forms['strip-v'];
  const field = f.square
    ? ((f.anchored && (mode==='full' || !INK_MARK.modes[mode])) ? INK_MARK.anchoredField : m.sq)
    : (f.field===2 ? m.field.slice(0,2) : m.field);
  return { bands:m.bands.slice(), field:field.slice() };
}
function inkMarkLayout(form){
  const f = INK_MARK.forms[form] || INK_MARK.forms['strip-v'];
  const boxes=[];
  if(f.square){
    boxes.push({ slot:'b0', x:0, y:0, w:2, h:2 });
    boxes.push({ slot:'b1', x:2, y:0, w:2, h:2 });
    boxes.push({ slot:'b2', x:0, y:2, w:2, h:2 });
    for(let i=0;i<4;i++) boxes.push({ slot:'f'+i, x:2+(i%2), y:2+(i>>1), w:1, h:1 });
  } else if(f.cols===2){
    for(let b=0;b<3;b++) boxes.push({ slot:'b'+b, x:0, y:b*2, w:2, h:2 });
    for(let i=0;i<f.field;i++) boxes.push({ slot:'f'+i, x:i%2, y:6+(i>>1), w:1, h:1 });
  } else {
    for(let b=0;b<3;b++) boxes.push({ slot:'b'+b, x:b*2, y:0, w:2, h:2 });
    for(let i=0;i<f.field;i++) boxes.push({ slot:'f'+i, x:6+(i>>1), y:i%2, w:1, h:1 });
  }
  return { cols:f.cols, rows:f.rows, boxes };
}
function inkMarkHex(name, dayAccent){
  if(name==='day') return PALETTE[dayAccent] || PALETTE.pink;
  return INK_MARK_CELLS[name] || '#0d0905';
}
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
const _SQR = [
  '1111111000011100001111111','1000001010001010101000001','1011101011010001001011101',
  '1011101011010101101011101','1011101001100110101011101','1000001000101000001000001',
  '1111111010101010101111111','0000000011000010100000000','1000001011000110011001110',
  '1010110100010011010111110','1110111100000011101101011','0100000001110000001001001',
  '1010001100001001101100001','1001010101100101110100010','1000101110111111101111011',
  '1001000100010010001101101','1000111011011101111110100','0000000011101100100010000',
  '1111111001110000101010001','1000001001000001100010011','1011101000111111111110100',
  '1011101001110010001000011','1011101000000101000001101','1000001001110011110110001',
  '1111111010001000110001001'].map(r=>r.split('').map(Number));
/* Fraction of a QR tile that is actual pattern — the spec's 4-module quiet
   zone per side is inside the tile, so a 25-module code shows 25/33 of the box
   it occupies as ink. Anything that must LOOK the same size as the code (the
   canon ink square butted against it) measures against this, not the tile.
   Mirrors studio-data.jsx's constant of the same name. */
const QR_DATA_FRAC = _SQR.length / (_SQR.length + 8);
/* Quiet zone in modules per side. 4 is the spec and is free on a light ground —
   the zone is the sheet colour, so it is invisible and the code's PATTERN is
   the whole visible object. On a dark ground it is not free: the zone has to
   stay light or the code will not scan, and 4 modules draw a cream slab a
   third wider than the pattern, which outweighs the ink square butted against
   it. QUIET_TIGHT is the small safe area for that case — enough for a reliable
   read, little enough that code and square balance. Mirrors studio-data.jsx. */
const QUIET_SPEC = 4, QUIET_TIGHT = 2;
/* Visible pattern inside a tile of `tile` px. Callers size the TILE (it has to
   fit the footer) and read the pattern back out to size the ink square. */
function qrPatternOf(tile, quiet){
  const q = quiet==null ? QUIET_SPEC : quiet;
  return tile * _SQR.length / (_SQR.length + 2*q);
}
function SchQR({ size, dark, light, quiet }){
  const n = _SQR.length;
  const q = quiet==null ? QUIET_SPEC : quiet;
  const pad = size * (q / (n + 2*q));
  return (
    <div style={{ width:size, height:size, background:light, padding:pad, boxSizing:'border-box', flex:'none' }}>
      <div style={{ width:'100%', height:'100%', display:'grid',
        gridTemplateColumns:'repeat('+n+',1fr)', gridTemplateRows:'repeat('+n+',1fr)' }}>
        {_SQR.flatMap((row,y)=>row.map((c,x)=>
          <div key={x+'-'+y} style={{ background: c?dark:light }} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  INK, CREAM, WHITE, MONT, ALT, GROT,
  DAY_COLORS, DAY_TEXT, DAY_ABBR, DAY_FULL, LOCATIONS, FLAGS,
  dToDate, dToISO, dAdd, dWeekday, dShort, dShortYr, rangeDates, rangeLabel, nextMonday,
  suid, blankEvent, newDoc, starterDoc, normalizeDoc,
  timeKey, eventsOn, dayInfo, timeLabel, usedLegend, partDates,
  parseQuickLine, parsePasteBlock, parseCSV, serializeCSV,
  buildDocFromFeed, mergeFeedIntoDoc, ictHHMM, ictDate,
  loadStoredDoc, storeDoc,
  Wordmark, SchQR, QR_DATA_FRAC, qrPatternOf, QUIET_SPEC, QUIET_TIGHT, QR_TARGET, QR_HOST, QR_LABEL, QR_LABEL_SHORT,
  PALETTE, INK_MARK, INK_MARK_CELLS, INK_MARK_DAY_ACCENT, inkMarkCells, inkMarkLayout, inkMarkHex, SchInkMark,
});

/* CommonJS-style export for the node self-test (scripts/selftest-schedule.mjs),
   ignored in the browser where `module` is undefined. Kept guarded so it never
   throws when this file loads as a plain <script>. */
try{ if(typeof module!=='undefined' && module.exports){ module.exports = { buildDocFromFeed, mergeFeedIntoDoc, ictHHMM, ictDate }; } }catch(e){}
