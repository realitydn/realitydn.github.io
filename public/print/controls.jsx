/* ============================================================
   REALITY PRINT STUDIO — shared inspector controls
   The kit's controls configured for Print (prefix ps-, Print's type
   ladder, K-only swatches), the accent-only row, and the capability
   arrays + option lists every inspector family reads.
   (Split out of print-app.jsx, Phase 3.)
   ============================================================ */
import { RUI } from '../studio-shared/studio-ui.jsx';
import { PALETTE as AP_PAL, ACCENTS as AP_ACC } from '../studio-shared/brand.js';
import { TYPE_SCALE as AP_SCALE, snapToScale as apSnap, scaleStep as apStep, INK as AP_INK } from './print-paper.js';

/* ---------- small controls ----------
   Field / Slider / Chips / ScaleControl / NumField / Fold now come from the
   shared kit (public/studio-shared/studio-ui.jsx) so Poster and Print can't
   drift to different components again. The prefix is the only local part —
   every class the kit builds is `ps-…` from here. Swatches is the kit's row
   too, with print's fixed swatches (K-only ink, paper white) as its parameter. */
RUI.configure({ prefix:'ps', storeKey:'reality-print' });
const { Field, Slider, Chips, NumField, Fold, Hint, HintsToggle } = RUI;
const ScaleControl = (p)=><RUI.ScaleControl {...p} scale={AP_SCALE} snap={apSnap} step={apStep} suffix="pt" />;

/* Print's fixed swatches — K-only ink, the paper white, an optional Auto —
   ahead of the accents; the row itself is RUI.Swatches. */
const Swatches = ({ auto, white, ...p })=> <RUI.Swatches {...p} fixed={[].concat(
  auto  ? [{ v:'auto',  bg:'linear-gradient(135deg,'+AP_INK.rgb+' 0 50%,#fff 50% 100%)', title:'Auto — readable on the surface' }] : [],
  [{ v:'ink', bg:AP_INK.rgb, title:'Ink (K-only)' }],
  white ? [{ v:'white', bg:'#ffffff', title:'White (paper / reverse)' }] : []
)} />;
const SURFACES =[{v:'none',l:'None'},{v:'paper',l:'Outline box'},{v:'solid',l:'Solid'},{v:'accent',l:'Accent'},{v:'outline',l:'Hairline'}];
const FAMS = [{v:'mont',l:'Display'},{v:'grot',l:'Text'},{v:'alt',l:'Wordmark'}];
const LIFTS = [{v:'none',l:'Flat'},{v:'light',l:'Light'},{v:'default',l:'Lift'},{v:'heavy',l:'Heavy'},{v:'custom',l:'Custom'}];
const ECHOABLE = ['headline','numeral','bignum','kicker','body','block','slab','sticker','shape','rule','stripes','dotfield','burst','icon'];
const LIFTABLE = ['headline','numeral','bignum','block','slab','pricelist','qr','badge','coupon','footer','marquee','sticker','shape','image','stripes','dotfield','icon'];
const BLENDS = [{v:'normal',l:'None'},{v:'multiply',l:'Multiply'},{v:'screen',l:'Screen'},{v:'overlay',l:'Overlay'},{v:'darken',l:'Darken'},{v:'lighten',l:'Lighten'},{v:'hard-light',l:'Hard'}];
const ORIENTS = [{v:'h',l:'Horizontal'},{v:'v',l:'Vertical'}];
const BLENDABLE = ['headline','numeral','bignum','kicker','body','block','slab','stripes','dotfield','sticker','burst','shape','marquee','image','pricelist','coupon','badge','seal','rule','arrow','contact','wordmark','footer','arctext','icon','punchgrid'];
const FITTABLE = ['headline','numeral','bignum','kicker'];
const ORIENTABLE = ['headline','numeral','bignum','kicker','body'];
const BORDER_PATTERNS = [{v:'solid',l:'Solid'},{v:'dashed',l:'Dashed'},{v:'dotted',l:'Dotted'},{v:'dashdot',l:'Dash-dot'}];
const SURFACED_BOX = ['headline','numeral','bignum','kicker','pricelist','qr','coupon','badge','marquee','arrow'];
/* accent-only swatch row (optional null = auto/partner, for second inks) */
function AccentRow({ value, onChange, nullable, nullTitle }){
  return (<div className="ps-swatches">
    {nullable && <div className={'ps-sw'+(value==null?' on':'')} title={nullTitle||'Auto'} style={{ background:'linear-gradient(135deg,'+AP_INK.rgb+' 0 50%,#fff 50% 100%)', border:'1.5px solid var(--st-sw-border)' }} onClick={()=>onChange(null)} />}
    {AP_ACC.map(a=>(<div key={a} className={'ps-sw'+(value===a?' on':'')} title={a} style={{ background:AP_PAL[a] }} onClick={()=>onChange(a)} />))}
  </div>);
}

export {
  RUI, Field, Slider, Chips, NumField, Fold, Hint, HintsToggle, ScaleControl, Swatches, AccentRow,
  SURFACES, FAMS, LIFTS, ECHOABLE, LIFTABLE, BLENDS, ORIENTS, BLENDABLE, FITTABLE, ORIENTABLE,
  BORDER_PATTERNS, SURFACED_BOX,
};
