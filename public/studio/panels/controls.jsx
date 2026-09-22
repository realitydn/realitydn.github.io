/* ============================================================
   REALITY POSTER STUDIO — controls
   The shared kits, set to Poster's parameters: RUI's controls (px type
   scale, the Auto/Ink/Cream swatch trio) and the image intake.
   ============================================================ */
import { RUI } from '../../studio-shared/studio-ui.jsx';
import { ImageIntake } from '../../studio-shared/image-intake.jsx';
import { TYPE_SCALE as AP_SCALE, snapToScale as apSnapScale, scaleStep as apScaleStep } from '../studio-data.jsx';
/* ---------- small controls ----------
   Field / Slider / Chips / ScaleControl / NumField / Fold / Swatches come from
   the shared kit (public/studio-shared/studio-ui.jsx), the same copy Print
   Studio loads, so the two can't drift to different components again. What
   stays here is Poster's parameters: the px type scale, and Swatches' fixed
   Auto/Ink/Cream trio (Print's is K-only ink and paper white). */
RUI.configure({ prefix:'rs', storeKey:'reality-studio' });
const { Field, Slider, Chips, NumField, Fold, Hint, HintsToggle } = RUI;
const ScaleControl = (p)=><RUI.ScaleControl {...p} scale={AP_SCALE} snap={apSnapScale} step={apScaleStep} suffix="px" note="snapped" />;

/* Auto adapts to the surface/theme; Ink and Cream are literal and fixed, so
   any element (esp. text over a photo) can be forced dark or light. The Auto
   swatch is relabelled / recoloured per role (text contrast vs poster accent).
   The row itself is RUI.Swatches; Poster's fixed trio is the parameter. */
const Swatches = ({ autoTitle, autoBg, ...p })=> <RUI.Swatches {...p} fixed={[
  { v:'fg',    bg: autoBg || 'linear-gradient(135deg,#0d0905 0 50%,#fffbf1 50% 100%)',
               title: autoTitle || 'Auto — adapts to surface / theme' },
  { v:'ink',   bg:'#0d0905', title:'Ink' },
  { v:'cream', bg:'#fffbf1', title:'Cream' },
]} />;
const SURFACES = [
  {v:'solid',l:'Solid'},{v:'paper',l:'Paper'},{v:'accent',l:'Accent'},
  {v:'outline',l:'Outline'},{v:'scrim',l:'Scrim'},{v:'none',l:'None'}
];
/* Type weights. Montserrat (titles/hosts) ships the full 100–900; Space Grotesk
   (taglines/info) tops out at 700. Short labels keep the chips tidy. */
const WEIGHTS_MONT = [
  {v:100,l:'Thin'},{v:300,l:'Light'},{v:400,l:'Reg'},{v:500,l:'Med'},
  {v:600,l:'Semi'},{v:700,l:'Bold'},{v:800,l:'Heavy'},{v:900,l:'Black'}
];
const WEIGHTS_GROT = [
  {v:300,l:'Light'},{v:400,l:'Reg'},{v:500,l:'Med'},{v:600,l:'Semi'},{v:700,l:'Bold'}
];

/* ---------- photo helpers ----------
   File / clipboard / drop → a sized image is ../studio-shared/image-intake.jsx
   (processImageFile, imageFromClipboard, looksLikeImage, PhotoUpload — the
   same code Print Studio takes photos with, HEIC message and all). Poster's
   parameters: a 2000px long edge — not the old 860, which existed because the
   working doc lived in localStorage and made a 4:5 export (2160px wide) an
   upscale; the doc is in IndexedDB now, and what goes to the hub is re-cut to
   860 on the way out (RStore.slimDocForCloud), so cloud payloads are exactly
   what they were — and JPEG at 0.82. */
ImageIntake.configure({ maxEdge:2000, jpegQuality:0.82, uploadLabel:'⬆ Upload / replace photo…' });

export { Field, Slider, Chips, NumField, Fold, Hint, HintsToggle, ScaleControl, Swatches, SURFACES, WEIGHTS_MONT, WEIGHTS_GROT };
