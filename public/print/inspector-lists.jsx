/* ============================================================
   REALITY PRINT STUDIO — inspector · lists, QR, coupons
   Content panels for the parts that carry data: the punch card,
   the QR standee (destinations, style, encode), the coupon and the
   price list (rows, styles, columns, case).
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { PALETTE as AP_PAL } from '../studio-shared/brand.js';
import { INK as AP_INK } from './print-paper.js';
import { QR_DESTINATIONS } from './print-data.jsx';
import { Field, Slider, Chips, Hint, Swatches } from './controls.jsx';

/* Module shape only. Finder EYES used to offer Rounded and Dot too; decoding
   the exported PDFs, every styled eye failed (studio-shared qr.js qrGeometry) — so the
   option is gone and the eyes are always square. */
const QR_MODULES = [{v:'square',l:'Square'},{v:'rounded',l:'Rounded'},{v:'dot',l:'Dot'}];
const QR_LOGOS   = [{v:'none',l:'None'},{v:'star',l:'★ Star'},{v:'dot',l:'Dot'}];
const LIST_STYLES = [{v:'prices',l:'Prices'},{v:'bulleted',l:'Bulleted'},{v:'numbered',l:'Numbered'},{v:'plain',l:'Plain'}];
const LIST_MARKERS = [{v:'•',l:'•'},{v:'–',l:'–'},{v:'→',l:'→'},{v:'★',l:'★'}];
const PUNCH_CELLS = [{v:'circle',l:'Circle'},{v:'square',l:'Square'},{v:'star',l:'Star'}];
/* relative luminance of a QR ink choice (ink/white/accent) — matches contrastInk. */
function qrLum(key){
  const hex = key==='ink'?AP_INK.rgb : (key==='white'||key==null||key==='auto')?'#ffffff' : (AP_PAL[key]||AP_INK.rgb);
  const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
  return 0.2126*r+0.7152*g+0.0722*b;
}

function PunchgridPanel({ el, update }){
  return (
    <React.Fragment>
      <div className="ps-rowflex">
        <Slider label="Columns" val={el.cols||5} min={2} max={10} step={1} onChange={v=>update({cols:v})} />
        <Slider label="Rows" val={el.rows||2} min={1} max={5} step={1} onChange={v=>update({rows:v})} />
      </div>
      <Chips label="Cell" options={PUNCH_CELLS} value={el.cell||'circle'} onChange={v=>update({cell:v})} />
      <Slider label="Gap" val={el.gap!=null?el.gap:8} min={2} max={24} step={1} onChange={v=>update({gap:v})} suffix="pt" />
      <Slider label="Cell stroke" val={el.stroke!=null?el.stroke:1.5} min={0.5} max={5} step={0.25} onChange={v=>update({stroke:v})} suffix="pt" />
      <Chips label="Numbers" options={[{v:true,l:'Shown'},{v:false,l:'Hidden'}]} value={el.numbered!==false} onChange={v=>update({numbered:v})} />
      <Chips label="Bonus last cell" options={[{v:true,l:'Filled'},{v:false,l:'Plain'}]} value={!!el.bonus} onChange={v=>update({bonus:v})} />
      {el.bonus && <React.Fragment>
        <Field label="Bonus label" value={el.bonusLabel} onChange={v=>update({bonusLabel:v})} />
        <Swatches label="Bonus fill" value={el.bonusFill||'pink'} onChange={v=>update({bonusFill:v})} white />
      </React.Fragment>}
    </React.Fragment>
  );
}

function QrPanel({ el, update }){
  const dests = QR_DESTINATIONS||[];
  const modKey = el.ink!=null?el.ink:'ink';
  const eyeKey = el.eye&&el.eye!=='auto'?el.eye:modKey;
  const risky = qrLum(modKey)>0.40 || qrLum(eyeKey)>0.40;
  const hasLogo = el.logo && el.logo!=='none';
  return <React.Fragment>
    <div className="ps-row">
      <div className="ps-lab">Destination</div>
      <div className="ps-chips">
        {dests.map(d=>(
          <button key={d.id} className={'ps-chip'+(el.data===d.data?' on':'')} title={d.hint}
            onClick={()=>update({data:d.data})}>{d.label}</button>
        ))}
      </div>
    </div>
    <Field label="Encodes (URL / text)" value={el.data} onChange={v=>update({data:v})} area />
    <Field label="Caption (optional)" value={el.caption} onChange={v=>update({caption:v})} />

    <div className="ps-sech">QR style</div>
    <Chips label="Module shape" options={QR_MODULES} value={el.moduleStyle||'square'} onChange={v=>update({moduleStyle:v})} />
    <Hint>Finder eyes stay <b>square</b> — rounded or dot eyes break the pattern scanners lock onto. The modules and the centre mark are free.</Hint>
    <Swatches label="Eye colour" value={el.eye!=null?el.eye:'auto'} onChange={v=>update({eye:v})} auto white />
    <Chips label="Centre mark" options={QR_LOGOS} value={el.logo||'none'} onChange={v=>update({logo:v})} />
    {hasLogo && <Swatches label="Mark colour" value={el.logoColor!=null?el.logoColor:'auto'} onChange={v=>update({logoColor:v})} auto white />}
    {risky && <div className="ps-warn">Low contrast on white — test-scan before printing, or set the ink to a dark accent (purple · red · pink).</div>}

    <div className="ps-sech">Encode</div>
    {hasLogo
      ? <div className="ps-hint">Error correction locked to <b>H</b> — protects the codewords under the centre mark.</div>
      : <Chips label="Error correction" options={[{v:'L',l:'L'},{v:'M',l:'M'},{v:'Q',l:'Q'},{v:'H',l:'H'}]} value={el.ecl||'M'} onChange={v=>update({ecl:v})} />}
    <Chips label="Quiet zone" options={[{v:true,l:'On'},{v:false,l:'Off'}]} value={el.quiet!==false} onChange={v=>update({quiet:v})} />
    <Chips label="Echo · misregistration" options={[{v:false,l:'Off'},{v:true,l:'On'}]} value={!!el.echo} onChange={v=>update({echo:v})} />
    {el.echo && <Swatches label="Echo colour" value={el.echoAccent||'auto'} onChange={v=>update({echoAccent:v})} auto />}
  </React.Fragment>;
}

function CouponPanel({ el, update }){
  return (
    <React.Fragment>
      <Field label="Kicker" value={el.heading} onChange={v=>update({heading:v})} />
      <Field label="Headline" value={el.big} onChange={v=>update({big:v})} area />
      <Field label="Terms" value={el.terms} onChange={v=>update({terms:v})} />
      <Field label="Code" value={el.code} onChange={v=>update({code:v})} mono />
    </React.Fragment>
  );
}

function PricelistPanel({ el, update }){
  const mode=el.listStyle||'prices';
  const setItems = (items)=>update({ items });
  return <React.Fragment>
    <Chips label="List style" options={LIST_STYLES} value={mode} onChange={v=>update({listStyle:v})} />
    <Field label="Heading (optional)" value={el.heading} onChange={v=>update({heading:v})} />
    <div className="ps-lab">Rows</div>
    {(el.items||[]).map((it,i)=>(
      <div className="ps-itemrow" key={i}>
        <input className="ps-input" value={it.l} onChange={e=>{ const items=el.items.slice(); items[i]={...it,l:e.target.value}; setItems(items); }} />
        {mode==='prices' && <input className="ps-input" style={{ maxWidth:78 }} value={it.p} onChange={e=>{ const items=el.items.slice(); items[i]={...it,p:e.target.value}; setItems(items); }} />}
        <button title="Move up" onClick={()=>{ if(i===0) return; const items=el.items.slice(); const t=items[i-1]; items[i-1]=items[i]; items[i]=t; setItems(items); }}>↑</button>
        <button onClick={()=>setItems(el.items.filter((_,j)=>j!==i))}>×</button>
      </div>
    ))}
    <button className="ps-addrow" onClick={()=>setItems([...(el.items||[]), mode==='prices'?{l:'Item',p:'0k'}:{l:'Item',p:''}])}>+ Add row</button>
    <div style={{ height:8 }} />
    <Chips label="Columns" options={[{v:1,l:'1'},{v:2,l:'2'}]} value={el.cols||1} onChange={v=>update({cols:v})} />
    <Chips label="Row size" options={[{v:'s',l:'S'},{v:'m',l:'M'},{v:'l',l:'L'},{v:'xl',l:'XL'},{v:'xxl',l:'XXL'}]} value={el.rowSize||'m'} onChange={v=>update({rowSize:v})} />
    {/* Case on the ITEM NAMES. Canon M2 lists a printed menu as a NEAR
        surface, which takes sentence case — but every list built before this
        existed was uppercased, so absent still means UPPER and only the new
        templates opt in. Prices are unaffected either way: they are facts,
        so they are Grotesk as typed and never uppercased. */}
    <Chips label="Item case" options={[{v:true,l:'UPPER'},{v:false,l:'As typed'}]} value={el.upper!==false} onChange={v=>update({upper:v})} />
    {el.upper===false && <div className="ps-hint">Near register — canon's case for a printed menu or card.</div>}
    {mode==='prices' && <Chips label="Dot leader" options={[{v:true,l:'On'},{v:false,l:'Off'}]} value={el.dotLeader!==false} onChange={v=>update({dotLeader:v})} />}
    {mode==='bulleted' && <Chips label="Bullet" options={LIST_MARKERS} value={el.marker||'•'} onChange={v=>update({marker:v})} />}
    {(mode==='bulleted'||mode==='numbered') && <Swatches label="Marker colour" value={el.markerColor!=null?el.markerColor:'auto'} onChange={v=>update({markerColor:v})} auto white />}
    {el.heading ? <Swatches label="Heading colour" value={el.headingColor!=null?el.headingColor:'auto'} onChange={v=>update({headingColor:v})} auto white /> : null}
  </React.Fragment>;
}

const LIST_PANELS = { punchgrid:PunchgridPanel, qr:QrPanel, coupon:CouponPanel, pricelist:PricelistPanel };

export { LIST_PANELS };
