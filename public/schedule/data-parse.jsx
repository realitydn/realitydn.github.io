/* ============================================================
   REALITY SCHEDULE STUDIO — data · text in and out
   The quick-add grammar, a pasted week, and Schedule Studio CSV v1
   (parse + serialize — the format Claude emits from the calendar).
   ============================================================ */
import { LOCATIONS, dWeekday, dShort, rangeDates, suid, blankEvent, eventsOn } from './data-model.jsx';

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

export { parseQuickLine, parsePasteBlock, parseCSV, serializeCSV };
