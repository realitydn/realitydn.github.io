/* ============================================================
   REALITY POSTER STUDIO — where a Sessions row puts its time
   The time is a FACT (Space Grotesk, never uppercased); these only say
   where it sits and how loud it is. Unset props keep the original
   layout exactly — the time in the muted line under the title.
     meta    Stacked — in the line under the title, with the date / number
     lead    In front — a column before the title, the times lined up
     kicker  Above — over the title, like an eyebrow
     end     Right — a column at the row's far end
   timeSize is a multiple of the row's title size, so the time scales with
   Row size, the highlight's Size and the Story boost.
   ============================================================ */
const TIME_LAYOUTS = [
  { v:'meta',   l:'Stacked',  t:'In the line under the title, with the date' },
  { v:'lead',   l:'In front', t:'A column before the title — the times line up' },
  { v:'kicker', l:'Above',    t:'Over the title, like an eyebrow' },
  { v:'end',    l:'Right',    t:'A column at the end of the row' },
];
const TIME_RANGES = [
  { v:'full',    l:'20:00–22:00', t:'The whole range as written' },
  { v:'compact', l:'20–22',       t:'Ranges drop their “:00” — a single time keeps it' },
  { v:'start',   l:'20:00',       t:'The start time only' },
];
const TIME_RATIO = { meta:0.52, lead:0.9, kicker:0.6, end:0.75 };
const TIME_WT    = { meta:600, lead:700, kicker:700, end:700 };

const timeLayout = (el)=> TIME_RATIO[el.timeLayout] ? el.timeLayout : 'meta';
const timeRatio  = (el)=> el.timeSize!=null ? el.timeSize : TIME_RATIO[timeLayout(el)];
const timeWeight = (el)=> el.timeWeight || TIME_WT[timeLayout(el)];
/* the layout's look as it stands — nothing set means the original meta line */
const timeStyled = (el)=> el.timeSize!=null || !!el.timeWeight || (!!el.timeColor && el.timeColor!=='fg');

function fmtTime(t, mode){
  if(!t) return '';
  const parts = String(t).split('–');
  if(mode==='start') return parts[0];
  if(mode==='compact' && parts.length>1) return parts.map(p=>p.replace(/^(\d{1,2})[:h]00$/, '$1')).join('–');
  return t;
}
/* a time's width in ch — tabular figures are exactly 1ch; the colon and the
   dash run narrower — so the In-front column fits its longest time */
function timeCh(s){
  let w = 0;
  for(const c of String(s||'')) w += /\d/.test(c) ? 1 : c===':' ? 0.45 : c==='–' ? 0.8 : 0.95;
  return Math.round(w*10)/10;
}

export { TIME_LAYOUTS, TIME_RANGES, timeLayout, timeRatio, timeWeight, timeStyled, fmtTime, timeCh };
