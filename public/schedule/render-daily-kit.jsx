/* ============================================================
   REALITY SCHEDULE STUDIO — render · daily card kit
   What the five daily-card layouts share (and the FB cover borrows):
   the layout registry, the per-layout furniture budgets and the fit
   engine, the ink plate, the WEDNESDAY name fit, rooms / tails,
   the call to action, emphasis styling and the day-axis clock.
   ============================================================ */
import { R_LUM, ThemeCtx, DAILY_VARIANTS } from './render-config.jsx';
import { estW, codesText } from './render-fit.jsx';
import { QRBlock } from './render-footer.jsx';
import { eventsOn as r_eventsOn, GROT as R_GROT, LOCATIONS as R_LOCS, MONT as R_MONT,
  QR_CTA as R_QR_CTA, QR_HOST as R_QR_HOST, Wordmark as RWordmark } from './schedule-data.jsx';

/* ============================================================
   DAILY CARD — five layouts over one fit engine
   ============================================================
   The daily card is the only surface that travels alone, so it carries the
   full furniture every time and has to survive both a two-event Tuesday and
   a ten-event Saturday. Five layouts share that job; what separates them is
   the STRUCTURAL role they give the day colour, which is the whole point —
   a colour band across the top is a hat, and every day wearing the same hat
   is why this card read as flat.

     classic  the original header block — kept, and still the default
     flood    the colour IS the paper; a bordered slab floats in it
     misreg   the house off-register plate at card scale
     spine    a full-height colour rail, day name set vertically
     chrono   the colour as the day's time axis, plus a chip per row

   The layout is a DOCUMENT setting (doc.daily.card), not a per-day one: a
   week of cards posted one a morning has to look like one week. ---- */
const DAILY_CARDS = [
  { id:'classic', name:'Classic', hint:'day block header' },
  { id:'flood',   name:'Flood',   hint:'colour is the paper' },
  { id:'misreg',  name:'Misreg',  hint:'the house misprint' },
  { id:'spine',   name:'Spine',   hint:'full-height rail' },
  { id:'chrono',  name:'Chrono',  hint:'colour as time axis' },
];
function dailyCardOf(doc){
  const k = doc && doc.daily && doc.daily.card;
  return DAILY_CARDS.some(c=>c.id===k) ? k : 'classic';
}

/* Vertical budget each layout spends on furniture, so one fit engine can size
   all five. head/foot are functions of the event count because the layouts that
   CAN give a light day a bigger masthead do exactly that; titleW/sub describe
   the ROW, which is what makes the estimate wrap-aware. */
const DAILY_METRICS = {
  /* classic keeps the original naive estimate — one line per event, no sub-line.
     Its output is unchanged from before the other four existed, deliberately:
     a document saved against it must still render exactly the same card. */
  classic:{ naive:true,
            story:{ pad:84, head:()=>420, foot:()=>230, lead:1.6, gap:()=>20 },
            feed: { pad:72, head:()=>330, foot:()=>196, lead:1.6, gap:()=>14 } },
  flood:  { story:{ pad:78, head:()=>330, foot:()=>250, gap:n=>D_S(n,[30,23,17,13]),
                    titleW:(f,n)=>1080-156-2*D_S(n,[52,44,36,32])-4-f*4.6-70,
                    sub:n=>dailyLongLocs(n), subH:f=>f*0.6*1.3+Math.round(f*0.25) },
            feed: { pad:66, head:()=>268, foot:()=>212, gap:n=>D_S(n,[22,17,13,10]),
                    titleW:(f,n)=>1080-132-2*D_S(n,[40,34,28,25])-4-f*4.6-60,
                    sub:n=>dailyLongLocs(n), subH:f=>f*0.6*1.3+Math.round(f*0.25) } },
  misreg: { story:{ pad:76, head:n=>D_S(n,[700,560,470,410]), foot:()=>300, gap:n=>D_S(n,[34,26,19,15]),
                    titleW:f=>1080-152-f*3.05-f*0.62-96, sub:()=>false, subH:()=>0 },
            feed: { pad:64, head:n=>D_S(n,[470,390,340,300]), foot:()=>250, gap:n=>D_S(n,[24,19,14,11]),
                    titleW:f=>1080-128-f*3.05-f*0.62-84, sub:()=>false, subH:()=>0 } },
  spine:  { story:{ pad:76, head:()=>150, foot:()=>300, gap:n=>D_S(n,[38,27,20,15]),
                    titleW:(f,n)=>1080-210-62-76-D_S(n,[172,150,134,120])-26,
                    sub:()=>true, subH:(f,n)=>f*0.66*1.3+D_S(n,[12,9,7,5]) },
            feed: { pad:64, head:()=>124, foot:()=>250, gap:n=>D_S(n,[26,20,15,11]),
                    titleW:(f,n)=>1080-168-50-64-D_S(n,[138,120,108,96])-21,
                    sub:()=>true, subH:(f,n)=>f*0.66*1.3+D_S(n,[12,9,7,5]) } },
  chrono: { story:{ pad:76, head:n=>D_S(n,[430,390,350,320]), foot:()=>270, gap:n=>D_S(n,[32,24,17,13]),
                    titleW:(f,n)=>1080-152-(f*0.8*3.1+2*D_S(n,[16,14,12,10]))-D_S(n,[26,22,18,15]),
                    sub:()=>true, subH:(f,n)=>f*0.66*1.3+D_S(n,[11,8,6,5]) },
            feed: { pad:64, head:n=>D_S(n,[330,300,272,250]), foot:()=>224, gap:n=>D_S(n,[23,18,13,10]),
                    titleW:(f,n)=>1080-128-(f*0.8*3.1+2*D_S(n,[16,14,12,10]))-D_S(n,[21,18,14,12]),
                    sub:()=>true, subH:(f,n)=>f*0.66*1.3+D_S(n,[11,8,6,5]) } },
};
/* Density tiers — airy · normal · tight · packed. Structural choices (how much
   room the masthead takes, whether a room is spelled out) step per tier; TYPE
   steps per event, off the fit engine below. */
function D_TIER(n){ return n<=4?0 : n<=7?1 : n<=9?2 : 3; }
function D_S(n, arr){ return arr[D_TIER(n)]; }
/* Rooms spelled out only where there is room to spell them. */
function dailyLongLocs(n){ return n<=4; }
/* The call to action stands down on crowded days rather than switching off: a
   ten-event card still carries the wordmark and a scannable code, it just
   stops spending four lines saying so. */
function dailyCtaTier(n){ return n<=7?'full' : n<=9?'compact' : 'minimal'; }

/* Daily-card text sizing — its OWN ladder (the 9:16 story runs larger than the
   weekly schedules) with a discrete per-variant bias stored on doc.daily.
   The ladder runs largest-first and the engine takes the biggest step that
   still sits easy, so a light day reads BIG instead of leaving half a card
   empty — the furniture budget it measures against comes from the layout. */
const DAILY_LAD = { story:[50,46,42,38,35,32,29], feed:[42,39,36,33,30,27,25] };
/* Measured height of the event stack at a candidate size. The naive "one line
   per event" estimate is what let a nine-event Thursday pick 50px and then run
   its last row straight through the footer — four of those titles wrap. So the
   layouts that own a title column estimate the WRAP against that column's real
   width, the same way coverFit does, and add the room line where they show one.
   Over-estimating is the safe direction: it costs a type step, whereas
   under-estimating costs a broken card. */
const DAILY_ADV = 0.55;                    /* Space Grotesk 600 advance per em */
function dailyStackH(evs, f, m, n){
  const tw = Math.max(1, m.titleW(f, n));
  let h = 0;
  for(let i=0;i<evs.length;i++){
    const lines = Math.max(1, Math.min(3, Math.ceil(estW(evs[i].title, f, DAILY_ADV) / tw)));
    h += lines * f * 1.28;
    if(m.sub(n, evs[i])) h += m.subH(f, n);
    if(i < evs.length-1) h += m.gap(n);
  }
  return h;
}
function dailySizing(doc, variant, date){
  const story = (variant||'story')!=='feed';
  const key = story ? 'story' : 'feed';
  const v = DAILY_VARIANTS[key];
  const evs = r_eventsOn(doc, date, 'daily');
  const n = Math.max(1, evs.length);
  const M = DAILY_METRICS[dailyCardOf(doc)] || DAILY_METRICS.classic;
  const m = M[key];
  const rowsAvail = v.h - m.pad*2 - m.head(n) - m.foot(n);
  const lad = DAILY_LAD[key];
  /* classic keeps its original one-line estimate so its output cannot shift */
  const stack = M.naive ? (f => n*(f*m.lead + m.gap(n))) : (f => dailyStackH(evs, f, m, n));
  const fits = (f, mult) => stack(f) <= rowsAvail*mult;
  let baseIdx=lad.length-1, maxIdx=lad.length-1;
  for(let i=0;i<lad.length;i++){ if(fits(lad[i],0.9)){ baseIdx=i; break; } }
  for(let i=0;i<lad.length;i++){ if(fits(lad[i],1.0)){ maxIdx=i; break; } }
  const off = Math.max(-5, Math.min(5, ((doc.daily && doc.daily[key])|0)));
  const idx = Math.min(lad.length-1, Math.max(maxIdx, baseIdx - off));
  return { font:lad[idx], idx, px:Math.round(lad[idx]), atMax: idx<=maxIdx, atMin: idx>=lad.length-1, isAuto: off===0 };
}


/* ---- shared daily parts ---- */

/* The card's OTHER ink. On cream stock it prints black; on night stock it
   prints cream. Taking it from the tokens rather than a literal is what keeps
   an ink plate legible after dark — a black plate on near-black paper is a
   hole — and it hands QRBlock a correct ground, so the code's quiet zone
   resolves on its own instead of needing a special case per layout. */
function dailyPlate(T){
  const onCream = R_LUM(T.fg) < 0.5;        /* day stock: the plate is ink */
  return Object.assign({}, T, {
    bg:T.fg, paper:T.fg, fg:T.bg,
    fgStrong: onCream ? 'rgba(255,251,241,.9)' : 'rgba(13,9,5,.88)',
    dim:      onCream ? 'rgba(255,251,241,.62)' : 'rgba(13,9,5,.66)',
    hairline: onCream ? 'rgba(255,251,241,.25)' : 'rgba(13,9,5,.25)',
  });
}
/* WEDNESDAY is two glyphs longer than any other day name and will not fit at
   the size SUNDAY wants. Step the display down rather than let it clip. */
function dailyFitName(base, name, avail){
  const est = String(name).length * base * 0.75;      /* Montserrat 800 caps advance */
  return est <= avail ? base : Math.floor(base * avail / est);
}
function dailyTail(ev){
  if(ev.end==='late') return 'all night';
  if(ev.end) return 'til ' + ev.end;
  return null;
}
/* Codes, or the rooms spelled out when the day is light enough to afford it. */
function dailyRooms(ev, n){
  if(!dailyLongLocs(n)) return codesText(ev);
  const label = c=>{ const hit = R_LOCS.filter(l=>l.code===c)[0]; return hit ? hit.label : c; };
  let t = (ev.locations||[]).map(label).join(' + ');
  if(ev.flags.prereg) t += (t?'  ·  ':'') + '* pre-register';
  if(ev.flags.fee)    t += (t?'  ·  ':'') + '$ fee';
  return t;
}
/* Whatever slack the fit engine leaves goes into the row gaps, never to the
   floor — a stack packed to the top over half a card of dead paper is exactly
   what makes a card look thin, and ten events leave slack too. */
const DAILY_SPREAD = 'space-evenly';

/* A closed day is one line, quietly. Shared so a status set in the editor
   shows up whichever layout is selected. */
function DailyClosed({ note, font, color }){
  return <div style={{ fontFamily:R_MONT, fontWeight:600, fontSize:font, letterSpacing:'.06em',
    textTransform:'uppercase', color:color, textAlign:'center', margin:'auto 0' }}>{note || 'CLOSED'}</div>;
}

/* The call to action. `plate` renders it against dailyPlate tokens, which is
   what puts a correct light ground under the code on an inverted band. */
function DailyCTA({ n, story, T }){
  const tier = dailyCtaTier(n);
  const wm = tier==='full' ? (story?46:40) : tier==='compact' ? (story?38:33) : (story?32:28);
  const qr = tier==='full' ? (story?128:104) : tier==='compact' ? (story?96:82) : (story?72:64);
  const line = tier==='full' ? (story?27:23) : tier==='compact' ? (story?24:21) : (story?22:19);
  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:story?34:26 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:tier==='full'?14:10, minWidth:0 }}>
          <RWordmark tight height={wm} color={T.fg} />
          <div style={{ fontFamily:R_GROT, fontWeight:600, fontSize:line, color:T.fg, lineHeight:1.35 }}>
            {tier==='minimal' ? R_QR_HOST : R_QR_CTA}
          </div>
          {tier!=='minimal' &&
            <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:story?22:19, color:T.dim, lineHeight:1.4 }}>
              86 Mai Thúc Lân, Đà Nẵng</div>}
        </div>
        <QRBlock size={qr} label={false} />
      </div>
    </ThemeCtx.Provider>
  );
}

/* Emphasis, shared. `banner` takes the plate; `bold` takes Montserrat caps over
   a day-colour underline. Both are document data the editor already sets, so
   every layout has to honour them or a headline night renders as a plain row. */
function dailyTitleStyle(ev, font, dc, T){
  if(ev.emphasis==='banner' || ev.emphasis==='bold')
    /* colour is NOT optional here: without it an emphasised title inherits the
       document default and a headline night goes invisible on Night stock. */
    return { fontFamily:R_MONT, fontWeight:700, fontSize:font*0.96, textTransform:'uppercase',
      letterSpacing:'.035em', lineHeight:1.22, color:T.fg,
      borderBottom: ev.emphasis==='bold' ? Math.max(4, Math.round(font*0.14))+'px solid '+dc : 'none',
      paddingBottom: ev.emphasis==='bold' ? Math.round(font*0.14) : 0 };
  return { fontFamily:R_GROT, fontWeight:600, fontSize:font, lineHeight:1.28, color:T.fg };
}

/* The Classic header row: the day's name on the left, its date on the right,
   both inside the day block's padding. The name is set at a fixed size, and
   WEDNESDAY — the longest name — at the story's 108px is wider than the row
   has room for beside its date: as a flex item a nowrap word won't shrink, so
   the date was pushed past the block's right padding and sat flush against
   its edge (every other day kept the 58px). Now the name is FITTED: measured
   at its set size after layout (and again once the webfonts are in, which is
   when the measurement is true), and stepped down only as far as it takes to
   leave `gap` before the date. A day that already fits keeps its exact size,
   and a fitted name keeps the set size's line height, so the header block —
   and everything under it — stays exactly where it is on every other day. */
function DailyNameRow({ name, date, nameFs, dateFs, gap, marginTop }){
  const rowRef = React.useRef(null), nameRef = React.useRef(null), dateRef = React.useRef(null);
  const [fs, setFs] = React.useState(nameFs);
  React.useLayoutEffect(()=>{
    const fit = ()=>{
      const row = rowRef.current, nm = nameRef.current, dt = dateRef.current;
      if(!row || !nm || !dt) return;
      const cur = parseFloat(getComputedStyle(nm).fontSize) || nameFs;
      const natural = nm.scrollWidth * nameFs / cur;              // the name's width at its set size
      const room = row.clientWidth - dt.offsetWidth - gap;
      const want = natural <= room ? nameFs : Math.max(1, Math.floor(nameFs * room / natural));
      setFs(prev=> prev===want ? prev : want);
    };
    fit();
    let live = true;
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ if(live) fit(); });
    return ()=>{ live = false; };
  }, [name, date, nameFs, dateFs, gap]);
  return (
    <div ref={rowRef} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap, marginTop }}>
      <div ref={nameRef} style={{ fontFamily:R_MONT, fontWeight:700, fontSize:fs, lineHeight:nameFs+'px',
        textTransform:'uppercase', letterSpacing:'.005em', whiteSpace:'nowrap' }}>{name}</div>
      <div ref={dateRef} style={{ fontFamily:R_MONT, fontWeight:500, fontSize:dateFs, lineHeight:1, flex:'none' }}>{date}</div>
    </div>
  );
}

const DAILY_OPEN_MIN = 11*60, DAILY_CLOSE_MIN = 26*60;   /* 11:00 → 02:00 */
/* The axis runs past midnight, so an after-midnight start is read as 24:xx+
   (the same night rollover as timeKey in data-model.jsx) — otherwise a 00:30
   set clamps to 11:00 and plots at the top of the day it closes. */
function dailyMinutes(hhmm){
  const p = /^(\d{1,2}):(\d{2})$/.exec(hhmm||'');
  if(!p) return DAILY_OPEN_MIN;
  const h = +p[1];
  return (h < 6 ? h+24 : h)*60 + (+p[2]);
}

export { DAILY_CARDS, dailyCardOf, DAILY_METRICS, D_S, dailyLongLocs, dailySizing, dailyPlate,
  dailyFitName, dailyTail, dailyRooms, DAILY_SPREAD, DailyClosed, DailyCTA, dailyTitleStyle,
  DailyNameRow, DAILY_OPEN_MIN, DAILY_CLOSE_MIN, dailyMinutes };
