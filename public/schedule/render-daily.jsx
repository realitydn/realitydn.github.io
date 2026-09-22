/* ============================================================
   REALITY SCHEDULE STUDIO — render · the daily card
   Classic · Flood · Misreg · Spine · Chrono, and the dispatcher
   every caller (preview, export, the digest) goes through.
   ============================================================ */
import { themeTokens, ThemeCtx, DAILY_VARIANTS } from './render-config.jsx';
import { dailyCardOf, DAILY_METRICS, D_S, dailyLongLocs, dailySizing, dailyPlate, dailyFitName,
  dailyTail, dailyRooms, DAILY_SPREAD, DailyClosed, DailyCTA, dailyTitleStyle, DailyNameRow,
  DAILY_OPEN_MIN, DAILY_CLOSE_MIN, dailyMinutes } from './render-daily-kit.jsx';
import { codesText } from './render-fit.jsx';
import { QRBlock } from './render-footer.jsx';
import { CREAM as R_CREAM, dayInfo as r_dayInfo, DAY_FULL as R_DF, dShort as r_dshort,
  eventsOn as r_eventsOn, GROT as R_GROT, INK as R_INK, LOCATIONS as R_LOCS, MONT as R_MONT,
  QR_CTA as R_QR_CTA, timeLabel as r_timeLabel, dWeekday as r_wd, Wordmark as RWordmark } from './schedule-data.jsx';

/* ---- 01 · CLASSIC — the original. Day block header, list, footer rule. ---- */
function DailyClassic({ doc, date, variant }){
  const v = DAILY_VARIANTS[variant||'story'];
  const story = (variant||'story')==='story';
  const T = themeTokens(doc.style.theme);
  const w = r_wd(date);
  const info = r_dayInfo(doc, date);
  const evs = r_eventsOn(doc, date, 'daily');
  const pad = story ? 84 : 72;
  const D = dailySizing(doc, variant||'story', date);
  const font = D.font;
  const rowGap = story ? 20 : 14;
  const locLabel = code=>{ const hit = R_LOCS.filter(l=>l.code===code)[0]; return hit ? hit.label : code; };
  const showChips = D.idx<=1 && evs.length<=7;
  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ width:v.w, height:v.h, background:T.bg, color:T.fg, position:'relative', overflow:'hidden',
        boxSizing:'border-box', padding:pad, display:'flex', flexDirection:'column' }}>
        <div style={{ flex:'none', background:T.dc[w], color:T.dt[w], boxShadow:T.shadow,
          padding:(story?54:40)+'px '+(story?58:48)+'px', marginBottom:story?56:40 }}>
          <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:story?26:22, letterSpacing:'.22em',
            textTransform:'uppercase', opacity:.92 }}>TODAY AT REALITY</div>
          <DailyNameRow name={R_DF[w]} date={r_dshort(date)} nameFs={story?108:88} dateFs={story?54:44}
            gap={story?36:28} marginTop={story?18:12} />
        </div>
        <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column',
          justifyContent: evs.length>5 ? 'flex-start' : 'space-evenly', gap:rowGap }}>
          {info.status==='closed'
            ? <div style={{ fontFamily:R_MONT, fontWeight:600, fontSize:story?44:36, letterSpacing:'.06em',
                textTransform:'uppercase', color:T.fg, textAlign:'center' }}>{info.note||'CLOSED'}</div>
            : evs.map((ev,i)=>{
              const banner = ev.emphasis==='banner', bold = ev.emphasis==='bold';
              const bannerBg = T.id==='night' ? T.dc[w] : R_INK;
              const bannerFg = T.id==='night' ? T.dt[w] : R_CREAM;
              return (
                <div key={ev.id} style={{ paddingBottom:rowGap*0.8,
                  borderBottom: i<evs.length-1 ? '1.5px solid '+T.hairline : 'none' }}>
                  <div style={banner
                    ? { background:bannerBg, color:bannerFg, boxShadow:T.shadowSm, padding:(font*0.4)+'px '+(font*0.55)+'px',
                        display:'flex', alignItems:'baseline', gap:font*0.55 }
                    : { display:'flex', alignItems:'baseline', gap:font*0.62 }}>
                    <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.9, flex:'none',
                      color:banner?bannerFg:T.fgStrong, fontVariantNumeric:'tabular-nums' }}>{r_timeLabel(ev)}</span>
                    <span style={(banner||bold)
                      ? { fontFamily:R_MONT, fontWeight:700, fontSize:font*0.96, textTransform:'uppercase',
                          letterSpacing:'.035em', lineHeight:1.22,
                          borderBottom: bold ? '6px solid '+T.dc[w] : 'none', paddingBottom: bold ? 6 : 0 }
                      : { fontFamily:R_GROT, fontWeight:600, fontSize:font, lineHeight:1.3 }}>{ev.title}</span>
                    {!showChips && codesText(ev)
                      ? <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.82,
                          color:banner?bannerFg:T.dim, whiteSpace:'nowrap', opacity:banner?0.8:1 }}>{codesText(ev)}</span> : null}
                  </div>
                  {showChips && (ev.locations.length || ev.flags.prereg || ev.flags.fee) ?
                    <div style={{ display:'flex', gap:12, marginTop:12, marginLeft:font*0.9*0.6*6.2, flexWrap:'wrap' }}>
                      {ev.locations.map(c=>(
                        <span key={c} style={{ border:'2px solid '+T.fg, padding:'4px 14px',
                          fontFamily:R_GROT, fontWeight:500, fontSize:font*0.56, color:T.fg }}>{locLabel(c)}</span>))}
                      {ev.flags.prereg && <span style={{ fontFamily:R_GROT, fontWeight:600, fontSize:font*0.6, color:T.fg }}>* pre-register</span>}
                      {ev.flags.fee && <span style={{ fontFamily:R_GROT, fontWeight:600, fontSize:font*0.6, color:T.fg }}>$ fee</span>}
                    </div> : null}
                </div>
              );
            })}
        </div>
        {/* Classic used to point at realitydn.com and leave the app to the QR's
            own caption — the one daily layout whose footer named a different
            destination from the code beside it. It carries the same offer as
            the other four now: the app in words, the address under it, the code
            (which already targets app.realitydn.com) beside them. */}
        <div style={{ flex:'none', borderTop:'3px solid '+T.fg, marginTop:story?40:28, paddingTop:story?34:24,
          display:'flex', justifyContent:'space-between', alignItems:'center', gap:30 }}>
          <div style={{ minWidth:0 }}>
            <RWordmark tight height={story?44:38} color={T.fg} />
            <div style={{ fontFamily:R_GROT, fontWeight:600, fontSize:story?25:21, color:T.fg,
              marginTop:12, lineHeight:1.35 }}>{R_QR_CTA}</div>
            <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:story?22:19, color:T.dim,
              marginTop:6, lineHeight:1.5 }}>86 Mai Thúc Lân, Đà Nẵng</div>
          </div>
          <QRBlock size={story?128:104} label={false} />
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

/* ---- 02 · FLOOD — the day colour is the paper ----
   A bordered slab carries the list and floats on the colour field: a light day
   is a small card on a lot of ink, a heavy one nearly fills the sheet, and the
   colour's share of the card carries the density without a word being read.
   The CTA takes a full-bleed plate band so the base is anchored at any count. */
function DailyFlood({ doc, date, variant }){
  const story = (variant||'story')==='story';
  const v = DAILY_VARIANTS[story?'story':'feed'];
  const T = themeTokens(doc.style.theme), P = dailyPlate(T);
  const w = r_wd(date), dc = T.dc[w], dt = T.dt[w];
  const info = r_dayInfo(doc, date);
  const evs = r_eventsOn(doc, date, 'daily');
  const n = Math.max(1, evs.length);
  const m = DAILY_METRICS.flood[story?'story':'feed'];
  const D = dailySizing(doc, variant||'story', date);
  const font = D.font, gap = m.gap(n), pad = m.pad;
  const dim = dt===R_CREAM ? 'rgba(255,251,241,.72)' : 'rgba(13,9,5,.66)';
  const name = dailyFitName(D_S(n,[story?150:120, story?132:106, story?114:92, story?102:82]), R_DF[w], v.w-pad*2);
  const slabPad = D_S(n,[story?52:40, story?44:34, story?36:28, story?32:25]);
  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ width:v.w, height:v.h, background:dc, position:'relative', overflow:'hidden',
        boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, minHeight:0, padding:pad+'px '+pad+'px 0', display:'flex', flexDirection:'column' }}>
          <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:story?25:21, letterSpacing:'.22em',
            textTransform:'uppercase', color:dim }}>TODAY AT REALITY</div>
          <div style={{ fontFamily:R_MONT, fontWeight:800, fontSize:name, lineHeight:.9,
            letterSpacing:'-.01em', textTransform:'uppercase', color:dt, marginTop:story?16:12 }}>{R_DF[w]}</div>
          <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:story?44:36, color:dim,
            marginTop:story?18:13 }}>{r_dshort(date)}</div>
          {/* auto margins float the slab in the colour field */}
          <div style={{ background:T.bg, border:'2px solid '+T.fg, boxShadow:T.shadow,
            margin:'auto 0', padding:slabPad, display:'flex', flexDirection:'column',
            justifyContent:DAILY_SPREAD, gap:gap }}>
            {info.status==='closed'
              ? <DailyClosed note={info.note} font={story?44:36} color={T.fg} />
              : evs.map((ev,i)=>(
                <div key={ev.id} style={{ paddingBottom: i<evs.length-1 ? gap*0.7 : 0,
                  borderBottom: i<evs.length-1 ? '1.5px solid '+T.hairline : 'none' }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:font*0.62 }}>
                    <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.88, flex:'none',
                      color:T.fgStrong, fontVariantNumeric:'tabular-nums' }}>{r_timeLabel(ev)}</span>
                    <span style={Object.assign({ minWidth:0 }, dailyTitleStyle(ev, font, dc, T))}>{ev.title}</span>
                    {!dailyLongLocs(n) && codesText(ev) ?
                      <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.8, color:T.dim,
                        whiteSpace:'nowrap', flex:'none', marginLeft:'auto' }}>{codesText(ev)}</span> : null}
                  </div>
                  {dailyLongLocs(n) && dailyRooms(ev,n) ?
                    <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.6, color:T.dim,
                      marginTop:Math.round(font*0.25) }}>{dailyRooms(ev,n)}</div> : null}
                </div>
              ))}
          </div>
        </div>
        <div style={{ flex:'none', background:P.bg, padding:(story?44:34)+'px '+pad+'px' }}>
          <DailyCTA n={n} story={story} T={P} />
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

/* ---- 03 · MISREG — the house misprint at card scale ----
   A plate and a day-colour plate of the same size, shifted, both bleeding off
   the edges: the signature off-register, sized to the masthead rather than to
   a word. The colour carries down the list as a rule under every row, and the
   CTA ticket repeats the offset so the misprint reads at both ends. Offsets
   are STATIC per canon — the moment they vary they stop reading as a print. */
const DAILY_MISREG_OFF = { x:30, y:20 };
function DailyMisreg({ doc, date, variant }){
  const story = (variant||'story')==='story';
  const v = DAILY_VARIANTS[story?'story':'feed'];
  const T = themeTokens(doc.style.theme), P = dailyPlate(T);
  const w = r_wd(date), dc = T.dc[w];
  const info = r_dayInfo(doc, date);
  const evs = r_eventsOn(doc, date, 'daily');
  const n = Math.max(1, evs.length);
  const m = DAILY_METRICS.misreg[story?'story':'feed'];
  const D = dailySizing(doc, variant||'story', date);
  const font = D.font, gap = m.gap(n), pad = m.pad;
  const headH = m.head(n), OX = DAILY_MISREG_OFF.x, OY = DAILY_MISREG_OFF.y;
  const inset = story?56:46, plateW = v.w - (story?118:98);
  const name = dailyFitName(D_S(n,[story?164:130, story?142:114, story?124:100, story?110:88]),
    R_DF[w], plateW - (story?132:108) - pad);
  const rule = Math.max(4, Math.round(font*0.16));
  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ width:v.w, height:v.h, background:T.bg, position:'relative', overflow:'hidden',
        boxSizing:'border-box', display:'flex', flexDirection:'column', isolation:'isolate' }}>
        <div style={{ flex:'none', position:'relative', height:headH }}>
          <div style={{ position:'absolute', left:-inset+OX, top:-(story?70:58)+OY, width:v.w+inset,
            height:headH-(story?30:24), background:dc }} />
          <div style={{ position:'absolute', left:-inset, top:-(story?70:58), width:plateW,
            height:headH-(story?30:24), background:P.bg, boxSizing:'border-box',
            padding:(story?96:78)+'px '+pad+'px 0 '+(story?132:108)+'px',
            display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:story?25:21, letterSpacing:'.22em',
              textTransform:'uppercase', color:P.dim }}>TODAY AT REALITY</div>
            <div style={{ fontFamily:R_MONT, fontWeight:800, fontSize:name, lineHeight:.88,
              letterSpacing:'-.012em', textTransform:'uppercase', color:P.fg, marginTop:story?20:15 }}>{R_DF[w]}</div>
            <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:story?42:34, color:P.dim,
              margin:(story?22:17)+'px 0 '+Math.round(headH*0.09)+'px' }}>{r_dshort(date)}</div>
          </div>
        </div>
        <div style={{ flex:1, minHeight:0, padding:D_S(n,[story?70:54, story?54:42, story?42:32, story?34:26])+'px '+pad+'px 0',
          display:'flex', flexDirection:'column', justifyContent:DAILY_SPREAD }}>
          {info.status==='closed'
            ? <DailyClosed note={info.note} font={story?44:36} color={T.fg} />
            : evs.map(ev=>(
              <div key={ev.id} style={{ paddingBottom:Math.round(gap*0.5), borderBottom:rule+'px solid '+dc }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:font*0.62 }}>
                  <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.88, flex:'none',
                    minWidth:Math.round(font*3.05), color:T.fgStrong, fontVariantNumeric:'tabular-nums' }}>{ev.start}</span>
                  <span style={Object.assign({ minWidth:0 }, dailyTitleStyle(ev, font, dc, T))}>
                    {ev.title}
                    {dailyTail(ev) && ev.emphasis!=='banner' && ev.emphasis!=='bold' ?
                      <span style={{ fontWeight:500, color:T.dim }}> — {dailyTail(ev)}</span> : null}
                  </span>
                  {codesText(ev) ?
                    <span style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.78, color:T.dim,
                      whiteSpace:'nowrap', flex:'none', marginLeft:'auto' }}>{codesText(ev)}</span> : null}
                </div>
              </div>
            ))}
        </div>
        <div style={{ flex:'none', position:'relative', margin:'0 '+pad+'px '+D_S(n,[story?76:60, story?64:52, story?54:44, story?46:38])+'px' }}>
          <div style={{ position:'absolute', left:OX, top:OY, right:-OX, bottom:-OY, background:dc }} />
          <div style={{ position:'relative', background:P.bg, padding:(story?38:30)+'px '+(story?40:32)+'px' }}>
            <DailyCTA n={n} story={story} T={P} />
          </div>
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

/* ---- 04 · SPINE — a full-height colour rail ----
   The rail runs edge to edge whatever the day holds, so the card's identity is
   fixed before a single event is placed: two events and ten produce the same
   object at different weights. The day name is set vertically inside it and the
   list hangs off a fixed time column, which is what puts the colons in a line
   down the whole card. */
function DailySpine({ doc, date, variant }){
  const story = (variant||'story')==='story';
  const v = DAILY_VARIANTS[story?'story':'feed'];
  const T = themeTokens(doc.style.theme);
  const w = r_wd(date), dc = T.dc[w], dt = T.dt[w];
  const info = r_dayInfo(doc, date);
  const evs = r_eventsOn(doc, date, 'daily');
  const n = Math.max(1, evs.length);
  const m = DAILY_METRICS.spine[story?'story':'feed'];
  const D = dailySizing(doc, variant||'story', date);
  const font = D.font, gap = m.gap(n), pad = m.pad;
  const rail = story ? 210 : 168;
  const dim = dt===R_CREAM ? 'rgba(255,251,241,.72)' : 'rgba(13,9,5,.62)';
  const timeW = D_S(n,[story?172:138, story?150:120, story?134:108, story?120:96]);
  /* the vertical name is sized to the rail's HEIGHT, not the card's width */
  const vName = dailyFitName(story?128:104, R_DF[w], v.h - (story?190:150));
  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ width:v.w, height:v.h, background:T.bg, overflow:'hidden',
        boxSizing:'border-box', display:'flex' }}>
        <div style={{ flex:'none', width:rail, background:dc, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'flex-end', padding:(story?56:44)+'px 0 '+(story?64:50)+'px' }}>
          <div style={{ writingMode:'vertical-rl', transform:'rotate(180deg)', fontFamily:R_MONT,
            fontWeight:800, fontSize:vName, letterSpacing:'.01em', lineHeight:1,
            textTransform:'uppercase', color:dt }}>{R_DF[w]}</div>
          <div style={{ writingMode:'vertical-rl', transform:'rotate(180deg)', fontFamily:R_GROT,
            fontWeight:500, fontSize:story?40:33, color:dim, marginBottom:story?26:20 }}>{r_dshort(date)}</div>
        </div>
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column',
          padding:pad+'px '+pad+'px 0 '+(story?62:50)+'px' }}>
          <div style={{ flex:'none' }}>
            <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:story?24:20, letterSpacing:'.22em',
              textTransform:'uppercase', color:T.dim }}>TODAY AT REALITY</div>
            <div style={{ height:story?6:5, background:dc, marginTop:story?20:15 }} />
          </div>
          <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column',
            padding:D_S(n,[story?62:48, story?46:36, story?36:28, story?30:23])+'px 0',
            justifyContent:DAILY_SPREAD }}>
            {info.status==='closed'
              ? <DailyClosed note={info.note} font={story?42:34} color={T.fg} />
              : evs.map((ev,i)=>(
                <div key={ev.id} style={{ display:'flex', gap:story?26:21, alignItems:'baseline',
                  paddingBottom: i<evs.length-1 ? gap : 0,
                  borderBottom: i<evs.length-1 ? '1.5px solid '+T.hairline : 'none' }}>
                  <div style={{ flex:'none', width:timeW, fontFamily:R_GROT, fontWeight:500,
                    fontSize:font*0.88, color:T.fgStrong, fontVariantNumeric:'tabular-nums', lineHeight:1.25 }}>
                    {ev.start}
                    {dailyTail(ev) ? <div style={{ fontSize:font*0.62, color:T.dim, marginTop:4 }}>{dailyTail(ev)}</div> : null}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={dailyTitleStyle(ev, font, dc, T)}>{ev.title}</div>
                    {dailyRooms(ev,n) ?
                      <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.66, color:T.dim,
                        marginTop:D_S(n,[12,9,7,5]) }}>{dailyRooms(ev,n)}</div> : null}
                  </div>
                </div>
              ))}
          </div>
          <div style={{ flex:'none', borderTop:'3px solid '+T.fg,
            padding:D_S(n,[story?36:28, story?32:25, story?28:22, story?24:19])+'px 0 '+
              D_S(n,[story?70:56, story?60:48, story?52:42, story?44:35])+'px' }}>
            <DailyCTA n={n} story={story} T={T} />
          </div>
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

/* ---- 05 · CHRONO — the colour as the day's time axis ----
   A filled bar spanning the venue's own day with a notch at every start, so the
   SHAPE of the day reads before a word does, then a colour time chip on every
   row. That last part inverts the usual problem: because each row carries a
   chip, the card gains colour as it fills rather than losing it, and a
   ten-event day is the best-looking one instead of the worst. */
function DailyChrono({ doc, date, variant }){
  const story = (variant||'story')==='story';
  const v = DAILY_VARIANTS[story?'story':'feed'];
  const T = themeTokens(doc.style.theme);
  const w = r_wd(date), dc = T.dc[w], dt = T.dt[w];
  const info = r_dayInfo(doc, date);
  const evs = r_eventsOn(doc, date, 'daily');
  const n = Math.max(1, evs.length);
  const m = DAILY_METRICS.chrono[story?'story':'feed'];
  const D = dailySizing(doc, variant||'story', date);
  const font = D.font, gap = m.gap(n), pad = m.pad;
  const barH = D_S(n,[story?86:68, story?76:60, story?66:53, story?58:47]);
  const name = dailyFitName(D_S(n,[story?132:106, story?118:94, story?104:84, story?94:76]),
    R_DF[w], v.w - pad*2 - (story?210:170));
  /* An axis is a promise: a day that starts before we open or runs past close
     still gets a notch, clamped to the ends, rather than one off the bar. */
  const notch = ev=>{
    const mm = Math.max(DAILY_OPEN_MIN, Math.min(DAILY_CLOSE_MIN, dailyMinutes(ev.start)));
    return (mm - DAILY_OPEN_MIN) / (DAILY_CLOSE_MIN - DAILY_OPEN_MIN);
  };
  const ticks = [['11:00',0],['15:00',4/15],['19:00',8/15],['23:00',12/15],['02:00',1]];
  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ width:v.w, height:v.h, background:T.bg, overflow:'hidden',
        boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:'none', padding:pad+'px '+pad+'px 0' }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24 }}>
            <div>
              <div style={{ fontFamily:R_MONT, fontWeight:700, fontSize:story?24:20, letterSpacing:'.22em',
                textTransform:'uppercase', color:T.dim }}>TODAY AT REALITY</div>
              <div style={{ fontFamily:R_MONT, fontWeight:800, fontSize:name, lineHeight:.94,
                letterSpacing:'-.012em', textTransform:'uppercase', color:T.fg, marginTop:story?14:11 }}>{R_DF[w]}</div>
            </div>
            <div style={{ flex:'none', background:dc, color:dt, fontFamily:R_GROT, fontWeight:600,
              fontSize:story?34:28, padding:(story?12:9)+'px '+(story?20:16)+'px', marginBottom:story?10:8 }}>{r_dshort(date)}</div>
          </div>
          {info.status!=='closed' &&
            <div style={{ marginTop:D_S(n,[story?46:36, story?38:30, story?32:25, story?28:22]) }}>
              <div style={{ position:'relative', height:barH, background:dc }}>
                {evs.map(ev=>(
                  <div key={ev.id} style={{ position:'absolute', left:'calc('+(notch(ev)*100)+'% - '+
                    (notch(ev)*(story?6:5))+'px)', top:0, bottom:0, width:story?6:5, background:T.fg }} />
                ))}
              </div>
              <div style={{ position:'relative', height:story?26:22, marginTop:story?12:9 }}>
                {ticks.map(t=>(
                  <div key={t[0]} style={{ position:'absolute', left:(t[1]*100)+'%',
                    transform:'translateX('+(t[1]===0?'0':t[1]===1?'-100%':'-50%')+')',
                    fontFamily:R_GROT, fontWeight:500, fontSize:story?21:18, color:T.dim,
                    fontVariantNumeric:'tabular-nums' }}>{t[0]}</div>
                ))}
              </div>
            </div>}
        </div>
        <div style={{ flex:1, minHeight:0, padding:D_S(n,[story?58:44, story?44:34, story?34:27, story?28:22])+'px '+pad+'px 0',
          display:'flex', flexDirection:'column', justifyContent:DAILY_SPREAD }}>
          {info.status==='closed'
            ? <DailyClosed note={info.note} font={story?44:36} color={T.fg} />
            : evs.map((ev,i)=>(
              <div key={ev.id} style={{ display:'flex', gap:D_S(n,[story?26:21, story?22:18, story?18:14, story?15:12]),
                alignItems:'flex-start', paddingBottom: i<evs.length-1 ? gap : 0,
                borderBottom: i<evs.length-1 ? '1.5px solid '+T.hairline : 'none' }}>
                <span style={{ flex:'none', background:dc, color:dt, fontFamily:R_GROT, fontWeight:600,
                  fontSize:font*0.8, fontVariantNumeric:'tabular-nums', lineHeight:1.15,
                  padding:D_S(n,[10,8,6,5])+'px '+D_S(n,[16,14,12,10])+'px' }}>{ev.start}</span>
                <div style={{ flex:1, minWidth:0, paddingTop:D_S(n,[6,5,4,3]) }}>
                  <div style={dailyTitleStyle(ev, font, dc, T)}>{ev.title}</div>
                  {(dailyRooms(ev,n) || dailyTail(ev)) ?
                    <div style={{ fontFamily:R_GROT, fontWeight:500, fontSize:font*0.66, color:T.dim,
                      marginTop:D_S(n,[11,8,6,5]) }}>
                      {[dailyRooms(ev,n), dailyTail(ev)].filter(Boolean).join('  ·  ')}</div> : null}
                </div>
              </div>
            ))}
        </div>
        <div style={{ flex:'none', margin:'0 '+pad+'px '+D_S(n,[story?72:58, story?62:50, story?52:42, story?44:35])+'px',
          borderTop:'3px solid '+T.fg, paddingTop:D_S(n,[story?36:28, story?32:25, story?28:22, story?24:19]) }}>
          <DailyCTA n={n} story={story} T={T} />
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

/* The dispatcher every caller goes through — preview, export and the digest
   all render the same component, so what you pick is what ships. */
const DAILY_IMPL = { classic:DailyClassic, flood:DailyFlood, misreg:DailyMisreg,
                     spine:DailySpine, chrono:DailyChrono };
function DailyCard({ doc, date, variant }){
  const Impl = DAILY_IMPL[dailyCardOf(doc)] || DailyClassic;
  return <Impl doc={doc} date={date} variant={variant} />;
}

export { DailyCard };
