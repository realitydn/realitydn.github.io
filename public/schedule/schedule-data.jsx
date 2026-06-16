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
   Purple is the one block that takes cream text (--on-ink logic). */
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
           locations:[], flags:{ prereg:false, fee:false }, emphasis:'none', hide:[], notionId:null };
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
    emphasis:emph||'none', hide:[], notionId:null });
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
  doc.events = ((d && d.events) || []).map(ev=>Object.assign(blankEvent(ev.date||doc.range.start), ev,
    { flags:Object.assign({prereg:false,fee:false}, ev.flags), locations:ev.locations||[], hide:ev.hide||[] }));
  return doc;
}

/* ---- selectors ---- */
function timeKey(t){ const m = /^(\d{1,2}):(\d{2})$/.exec(t||''); return m ? (+m[1])*60+(+m[2]) : 0; }
function eventsOn(doc, date, channel){
  return doc.events
    .filter(e=>e.date===date && (!channel || (e.hide||[]).indexOf(channel)<0))
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
        iShort=col('title_short'), iLoc=col('locations'), iFlags=col('flags'), iEmph=col('emphasis');
  if(iDate<0 || iTitle<0) return { events:[], errors:['Header must include at least "date" and "title" columns'] };
  const events = [], errors = [];
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
    events.push(Object.assign(blankEvent(date), { start, end, title,
      titleShort:get(iShort)||null, locations, flags, emphasis }));
  });
  return { events, errors };
}
function csvEscape(s){ s = String(s==null?'':s); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }
function serializeCSV(doc){
  const lines = ['date,start,end,title,title_short,locations,flags,emphasis'];
  rangeDates(doc.range).forEach(date=>eventsOn(doc, date).forEach(ev=>{
    const flags = [ev.flags.prereg?'prereg':null, ev.flags.fee?'fee':null].filter(Boolean).join(' ');
    lines.push([ev.date, ev.start, ev.end||'', csvEscape(ev.title), csvEscape(ev.titleShort||''),
      (ev.locations||[]).join('/'), flags, ev.emphasis==='none'?'':ev.emphasis].join(','));
  }));
  return lines.join('\n');
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

/* Real QR — encodes https://realitydn.com (v2, EC M); same matrix as the
   Poster Studio / brand-assets. Exports scan for real. */
const _SQR = [
'1111111000000100001111111','1000001000111111001000001','1011101011001000101011101',
'1011101010101110001011101','1011101010111000101011101','1000001010111101001000001',
'1111111010101010101111111','0000000010111011100000000','1011111001111111001111100',
'1111010001011100100100010','0000111110111111111011011','0110000100110011011000001',
'0100001001001110111110111','1111110111100100100101010','1000001111011011001111011',
'1001110101010011111110001','1010011011010001111110100','0000000011001100100011000',
'1111111000100110101010111','1000001010001100100011011','1011101010101011111110111',
'1011101010000000011011111','1011101010011001100001101','1000001000110011110111001',
'1111111010110000001111111'].map(r=>r.split('').map(Number));
function SchQR({ size, dark, light }){
  const n = _SQR.length;
  const pad = size * (4 / (n + 8));
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
  loadStoredDoc, storeDoc,
  Wordmark, SchQR,
});
