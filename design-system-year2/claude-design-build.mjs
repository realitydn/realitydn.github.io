/* ============================================================
   REALITY Design System — Year 2  ·  Claude Design package builder
   ------------------------------------------------------------
   Emits self-contained @dsCard preview HTML files (tokens inlined,
   no external deps beyond Google Fonts) into ./claude-design/.
   Each file's FIRST LINE is the <!-- @dsCard ... --> marker that
   Claude Design's pane reads to build the card index.

   Faithful to the handoff: tokens (reality-tokens), components
   (components/ui.jsx), icons (icons/icons.jsx — all 72), photo
   treatments (riso-engine.js), poster grid + archetypes
   (poster-grid.css), taxonomy dials (Poster Taxonomy), motion
   (REALITY Motion), and the REVISION.md "conventions learned".
   Run:  node claude-design-build.mjs
   ============================================================ */
import { writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dir, 'design_handoff_reality_system');
const OUT = join(__dir, 'claude-design');
mkdirSync(OUT, { recursive: true });
/* clean stale generated HTML so renamed/removed cards don't linger */
if (existsSync(OUT)) for (const f of readdirSync(OUT)) if (f.endsWith('.html')) rmSync(join(OUT, f));

/* ---------- shared head: fonts + tokens + base reset + card chrome ---------- */
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;500;600;700;800&family=Montserrat+Alternates:wght@600&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">`;

const TOKENS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
img{max-width:100%;display:block}
button{font:inherit;color:inherit;cursor:pointer;background:none;border:none}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
:root{
  --yellow:#fddf00;--red:#ed2224;--blue:#18a7e0;
  --pink:#ed1b72;--amber:#fdb515;--green:#43b02a;--purple:#6e3179;
  --accent:var(--pink);--accent-2:var(--blue);
  --bg:#fffbf1;--surface:#fffbf1;--surface-2:#fffbf1;
  --fg:#0d0905;--fg-dim:rgba(13,9,5,.72);--fg-faint:rgba(13,9,5,.45);
  --hairline:rgba(13,9,5,.16);--on-ink:#fffbf1;
  --sh-light:0 4px 1px rgba(13,9,5,.08);--sh-default:0 8px 2px rgba(13,9,5,.12);--sh-heavy:0 12px 3px rgba(13,9,5,.18);
  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;
  --space-6:24px;--space-7:32px;--space-8:48px;--space-9:64px;--space-10:96px;
  --screen-pad:var(--space-5);--section-gap:var(--space-4);--card-pad:var(--space-5);
  --row-y:var(--space-3);--tap-min:var(--space-8);--grid-cols:4;--grid-gutter:var(--space-3);
  --mont:'Montserrat',sans-serif;--alt:'Montserrat Alternates',sans-serif;--grotesk:'Space Grotesk',sans-serif;
  --ease-stamp:cubic-bezier(.2,1.4,.45,1);--ease-snap:cubic-bezier(.3,0,.2,1);--ease-out:cubic-bezier(.16,1,.3,1);
  --dur-tap:120ms;--dur-quick:200ms;--dur-settle:350ms;--dur-enter:700ms;--stagger:90ms;
  color-scheme:light;
}
[data-theme="dark"]{
  --purple:#9a4faa;--bg:#0a0703;--surface:#171109;--surface-2:#241a10;
  --fg:#fffbf1;--fg-dim:rgba(255,251,241,.60);--fg-faint:rgba(255,251,241,.32);--hairline:#3a2c1c;--on-ink:#fffbf1;
  --sh-light:0 4px 1px rgba(255,251,241,.14);--sh-default:0 9px 2px rgba(255,251,241,.18);--sh-heavy:0 14px 3px rgba(255,251,241,.26);
  color-scheme:dark;
}
.scope-day{--bg:#fffbf1;--surface:#fffbf1;--surface-2:#fffbf1;--fg:#0d0905;--fg-dim:rgba(13,9,5,.72);--fg-faint:rgba(13,9,5,.45);--hairline:rgba(13,9,5,.16);--sh-light:0 4px 1px rgba(13,9,5,.08);--sh-default:0 8px 2px rgba(13,9,5,.12);--sh-heavy:0 12px 3px rgba(13,9,5,.18);color-scheme:light}
.scope-night{--bg:#0a0703;--surface:#171109;--surface-2:#241a10;--fg:#fffbf1;--fg-dim:rgba(255,251,241,.60);--fg-faint:rgba(255,251,241,.32);--hairline:#3a2c1c;--sh-light:0 4px 1px rgba(255,251,241,.14);--sh-default:0 9px 2px rgba(255,251,241,.18);--sh-heavy:0 14px 3px rgba(255,251,241,.26);color-scheme:dark}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

const CHROME = `
body.dsc{font-family:var(--grotesk);background:var(--bg);color:var(--fg);line-height:1.6;-webkit-font-smoothing:antialiased;padding:28px}
.dsc-h{display:flex;align-items:baseline;gap:14px;border-bottom:2px solid var(--fg);padding-bottom:12px;margin-bottom:26px;flex-wrap:wrap}
.dsc-h .nm{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:18px}
.dsc-h .sub{font-family:var(--grotesk);font-weight:400;font-size:13px;color:var(--fg-dim);max-width:64ch}
.dsc-h .tag{margin-left:auto;font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.14em;font-size:10px;background:var(--fg);color:var(--bg);padding:6px 11px;align-self:flex-start}
.dual{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:760px){.dual{grid-template-columns:1fr}}
.pane{background:var(--bg);color:var(--fg);padding:24px;border:2px solid var(--fg);box-shadow:var(--sh-default)}
.pane>.plabel{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.16em;font-size:10px;color:var(--fg-faint);margin-bottom:18px;display:flex;align-items:center;gap:8px}
.pane>.plabel::before{content:"";width:9px;height:9px;border:2px solid var(--fg);display:inline-block}
.eyebrow{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.15em;font-size:12px;color:var(--accent);margin:0 0 14px}
.note{border:2px solid var(--fg);background:var(--surface);box-shadow:var(--sh-default);padding:18px 22px;margin-top:22px}
.note h4{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:11px;color:var(--accent);margin-bottom:10px}
.note p{font-size:13.5px;color:var(--fg-dim);margin-bottom:7px}.note p:last-child{margin-bottom:0}
.note b{color:var(--fg);font-weight:600}
.wm{font-family:var(--alt);font-weight:600;text-transform:uppercase;letter-spacing:.02em;line-height:.9}
.stack{display:flex;flex-direction:column;gap:20px}
.row{display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.lbl{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:10px;color:var(--fg-faint);margin-bottom:10px}
`;

/* page wrapper — @dsCard marker MUST be the first line */
function page({ group, name, subtitle, w = 1100, h = 720, css = '', body, theme }) {
  const sub = subtitle ? ` subtitle="${subtitle}"` : '';
  return `<!-- @dsCard group="${group}" name="${name}"${sub} w="${w}" h="${h}" -->
<!doctype html><html lang="en"${theme ? ` data-theme="${theme}"` : ''}><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>REALITY — ${name}</title>
${FONTS}
<style>${TOKENS}${CHROME}${css}</style>
</head>
<body class="dsc">
<header class="dsc-h"><span class="nm">${name}</span><span class="sub">${subtitle || ''}</span><span class="tag">REALITY · Y2</span></header>
${body}
</body></html>`;
}

const dual = (inner, dayLabel = 'Day · ink on cream', nightLabel = 'Night · cream on ink') => `<div class="dual">
  <div class="pane scope-day"><div class="plabel">${dayLabel}</div>${inner}</div>
  <div class="pane scope-night"><div class="plabel">${nightLabel}</div>${inner}</div>
</div>`;

/* ============================================================
   ICON GLYPHS — full set ported from design/icons/icons.jsx (72),
   rendered to static SVG at build time.
   ============================================================ */
const GLYPHS = {
  home:[{t:'path',d:'M3.5 11 L12 3.5 L20.5 11 V20.5 H3.5 Z'}],
  live:[{t:'poly',points:'7 4.5 7 19.5 19.5 12'}],
  scan:[{t:'path',d:'M4 8.5 V4 H8.5',linear:true},{t:'path',d:'M15.5 4 H20 V8.5',linear:true},{t:'path',d:'M4 15.5 V20 H8.5',linear:true},{t:'path',d:'M20 15.5 V20 H15.5',linear:true},{t:'line',x1:5,y1:12,x2:19,y2:12,linear:true}],
  leaders:[{t:'rect',x:4,y:13,w:4,h:7},{t:'rect',x:10,y:9,w:4,h:11},{t:'rect',x:16,y:5,w:4,h:15}],
  music:[{t:'ellipse',cx:9.5,cy:17,rx:3,ry:2.4},{t:'line',x1:12.5,y1:16.6,x2:12.5,y2:5,linear:true},{t:'poly',points:'12.5 5 19.5 7 19.5 10.5 12.5 8.5'}],
  calendar:[{t:'rect',x:4,y:5.5,w:16,h:14.5,linear:true},{t:'line',x1:4,y1:10,x2:20,y2:10,linear:true},{t:'line',x1:8,y1:3.5,x2:8,y2:6.5,linear:true},{t:'line',x1:16,y1:3.5,x2:16,y2:6.5,linear:true},{t:'rect',x:7,y:13,w:3.2,h:3.2}],
  user:[{t:'ellipse',cx:12,cy:8.5,rx:3.7,ry:3.7},{t:'poly',points:'5.5 20 6.8 14.5 17.2 14.5 18.5 20'}],
  drink:[{t:'poly',points:'5 6 19 6 12 13.5'},{t:'line',x1:12,y1:13.5,x2:12,y2:19,linear:true},{t:'line',x1:8,y1:19.5,x2:16,y2:19.5,linear:true},{t:'ellipse',cx:13.6,cy:8.4,rx:1.05,ry:1.05}],
  check:[{t:'path',d:'M4.5 12.5 L9.5 17.5 L19.5 6.5',linear:true}],
  alert:[{t:'line',x1:12,y1:4.5,x2:12,y2:14,linear:true},{t:'rect',x:10.8,y:17,w:2.4,h:2.4}],
  info:[{t:'rect',x:10.9,y:5,w:2.2,h:2.2},{t:'line',x1:12,y1:10,x2:12,y2:19,linear:true}],
  bell:[{t:'path',d:'M6 17 V11 a6 6 0 0 1 12 0 V17 H6 Z',linear:true},{t:'line',x1:4,y1:17,x2:20,y2:17,linear:true},{t:'rect',x:10.6,y:19,w:2.8,h:1.8}],
  martini:[{t:'poly',points:'5 6 19 6 12 13.5'},{t:'line',x1:12,y1:13.5,x2:12,y2:19,linear:true},{t:'line',x1:8,y1:19.5,x2:16,y2:19.5,linear:true},{t:'ellipse',cx:13.6,cy:8.6,rx:1.05,ry:1.05}],
  coupe:[{t:'poly',points:'5 7 19 7 15.5 11.5 8.5 11.5'},{t:'line',x1:12,y1:11.5,x2:12,y2:19,linear:true},{t:'line',x1:8,y1:19.5,x2:16,y2:19.5,linear:true}],
  flute:[{t:'poly',points:'10 4 14 4 13.1 13 10.9 13'},{t:'line',x1:12,y1:13,x2:12,y2:19,linear:true},{t:'line',x1:9,y1:19.5,x2:15,y2:19.5,linear:true},{t:'ellipse',cx:12,cy:7,rx:.7,ry:.7},{t:'ellipse',cx:12,cy:9.6,rx:.6,ry:.6}],
  wine:[{t:'path',d:'M7.5 4 H16.5 C16.5 9.5 14 12 12 12 C10 12 7.5 9.5 7.5 4 Z'},{t:'line',x1:12,y1:12,x2:12,y2:19.2,linear:true},{t:'line',x1:8,y1:19.5,x2:16,y2:19.5,linear:true}],
  rocks:[{t:'poly',points:'6.5 8 17.5 8 16.5 19 7.5 19',linear:true},{t:'poly',points:'12 11 15.5 13.5 12 16 8.5 13.5'}],
  highball:[{t:'rect',x:8,y:4,w:8,h:16,linear:true},{t:'line',x1:14,y1:4.5,x2:15.5,y2:11,linear:true},{t:'ellipse',cx:11,cy:9.5,rx:1,ry:1},{t:'ellipse',cx:12.5,cy:14,rx:1,ry:1}],
  shot:[{t:'poly',points:'8 11 16 11 14.5 19 9.5 19',linear:true},{t:'line',x1:9,y1:14,x2:15,y2:14,linear:true}],
  dropshot:[{t:'poly',points:'7 7 17 7 16 20 8 20',linear:true},{t:'poly',points:'10.5 8.5 13.5 8.5 13 12 11 12',linear:true},{t:'line',x1:7.5,y1:6.5,x2:6,y2:4.5,linear:true},{t:'line',x1:16.5,y1:6.5,x2:18,y2:4.5,linear:true}],
  tiki:[{t:'poly',points:'7.5 7 16.5 7 15.5 20 8.5 20'},{t:'rect',x:9.6,y:10,w:1.8,h:1.8},{t:'rect',x:12.6,y:10,w:1.8,h:1.8},{t:'path',d:'M9.5 14.5 L11 16.5 L13 14.5 L14.5 16.5',linear:true}],
  beer_can:[{t:'rect',x:7.5,y:5,w:9,h:15,linear:true},{t:'line',x1:7.5,y1:8,x2:16.5,y2:8,linear:true},{t:'rect',x:11,y:3.4,w:2,h:1.8}],
  beer_bottle:[{t:'poly',points:'10.5 3.5 13.5 3.5 13.5 8 15 11 15 20 9 20 9 11 10.5 8'},{t:'rect',x:10.7,y:2.4,w:2.6,h:1.6},{t:'rect',x:9.6,y:12.5,w:4.8,h:3.4,linear:true}],
  beer_stubby:[{t:'poly',points:'9.5 5.5 14.5 5.5 14.5 8 16 10.5 16 20 8 20 8 10.5 9.5 8'},{t:'rect',x:10.7,y:4,w:2.6,h:1.6}],
  beer_bomber:[{t:'poly',points:'9.5 3.5 14.5 3.5 14.5 8 16.5 11.5 16.5 20 7.5 20 7.5 11.5 9.5 8'},{t:'rect',x:9.7,y:2.3,w:4.6,h:1.7}],
  beer_belgian:[{t:'path',d:'M10.5 3 H13.5 V7 C13.5 9 16 10.5 16 13.5 C16 17.5 14.5 20 12 20 C9.5 20 8 17.5 8 13.5 C8 10.5 10.5 9 10.5 7 Z'},{t:'rect',x:10.5,y:2,w:3,h:1.4},{t:'line',x1:10.5,y1:5,x2:13.5,y2:5,linear:true}],
  beer_growler:[{t:'rect',x:7.5,y:8,w:8.5,h:12,linear:true},{t:'rect',x:10,y:4,w:3.5,h:4,linear:true},{t:'rect',x:9.8,y:2.6,w:3.9,h:1.6},{t:'path',d:'M16 10 h2.5 v5 h-2.5',linear:true}],
  pint:[{t:'poly',points:'8 5 16 5 15.2 20 8.8 20',linear:true},{t:'path',d:'M8 8 Q10 6.6 12 8 T16 8',linear:true},{t:'ellipse',cx:11,cy:12.5,rx:.85,ry:.85},{t:'ellipse',cx:13,cy:16,rx:.85,ry:.85}],
  stein:[{t:'rect',x:6.5,y:6,w:9,h:14,linear:true},{t:'path',d:'M15.5 9 h2.5 v7 h-2.5',linear:true},{t:'line',x1:6.5,y1:9,x2:15.5,y2:9,linear:true}],
  wine_bottle:[{t:'path',d:'M11 3 H13 V7.5 C13 9 15 10 15 12.5 V20 H9 V12.5 C9 10 11 9 11 7.5 Z'},{t:'rect',x:9.3,y:13.5,w:5.4,h:3.2,linear:true}],
  coffee:[{t:'poly',points:'6.5 9 16 9 15 18 7.5 18'},{t:'path',d:'M16 11 h2 a1.5 1.5 0 0 1 0 4 H15.4',linear:true},{t:'line',x1:6,y1:20,x2:17,y2:20,linear:true},{t:'line',x1:9.5,y1:4.5,x2:9.5,y2:7,linear:true},{t:'line',x1:12.5,y1:4.5,x2:12.5,y2:7,linear:true}],
  soda_can:[{t:'rect',x:7.5,y:5,w:9,h:15,linear:true},{t:'line',x1:7.5,y1:8,x2:16.5,y2:8,linear:true},{t:'line',x1:13,y1:2.5,x2:14.5,y2:9,linear:true}],
  dice:[{t:'rect',x:5,y:5,w:14,h:14,linear:true},{t:'ellipse',cx:9,cy:9,rx:1.1,ry:1.1},{t:'ellipse',cx:12,cy:12,rx:1.1,ry:1.1},{t:'ellipse',cx:15,cy:15,rx:1.1,ry:1.1}],
  cards:[{t:'rect',x:4.5,y:6,w:8.5,h:13,linear:true},{t:'rect',x:11,y:6,w:8.5,h:13,linear:true},{t:'ellipse',cx:15.2,cy:12.5,rx:1.2,ry:1.2}],
  gamepad:[{t:'rect',x:4,y:9,w:16,h:8,linear:true},{t:'line',x1:7,y1:11,x2:7,y2:15,linear:true},{t:'line',x1:5,y1:13,x2:9,y2:13,linear:true},{t:'ellipse',cx:16,cy:12,rx:1,ry:1},{t:'ellipse',cx:17.3,cy:14.5,rx:1,ry:1}],
  trivia:[{t:'path',d:'M9.4 9.4 a2.6 2.6 0 1 1 2.8 2.6 v1.4',linear:true},{t:'rect',x:11.1,y:16,w:1.9,h:1.9}],
  boardgame:[{t:'rect',x:4,y:4,w:16,h:16,linear:true},{t:'rect',x:8,y:8,w:4,h:4},{t:'rect',x:12,y:12,w:4,h:4}],
  chess:[{t:'ellipse',cx:12,cy:6,rx:2.2,ry:2.2},{t:'poly',points:'8.5 19 10 12 14 12 15.5 19'},{t:'line',x1:9.5,y1:12.5,x2:14.5,y2:12.5,linear:true},{t:'line',x1:7.5,y1:19.5,x2:16.5,y2:19.5,linear:true}],
  dominoes:[{t:'rect',x:8,y:4,w:8,h:16,linear:true},{t:'line',x1:8,y1:12,x2:16,y2:12,linear:true},{t:'ellipse',cx:12,cy:7.5,rx:1,ry:1},{t:'ellipse',cx:10.5,cy:15.5,rx:.9,ry:.9},{t:'ellipse',cx:13.5,cy:17,rx:.9,ry:.9}],
  speech:[{t:'rect',x:4,y:5,w:16,h:10,linear:true},{t:'poly',points:'8 15 8 19 12 15'}],
  chat:[{t:'rect',x:4,y:4,w:12,h:9,linear:true},{t:'rect',x:10,y:10,w:10,h:7,linear:true}],
  globe:[{t:'ellipse',cx:12,cy:12,rx:8,ry:8,linear:true},{t:'line',x1:4,y1:12,x2:20,y2:12,linear:true},{t:'line',x1:12,y1:4,x2:12,y2:20,linear:true},{t:'ellipse',cx:12,cy:12,rx:3.4,ry:8,linear:true}],
  palette:[{t:'ellipse',cx:12,cy:12,rx:8,ry:7,linear:true},{t:'ellipse',cx:9,cy:10,rx:1,ry:1},{t:'ellipse',cx:13,cy:8.5,rx:1,ry:1},{t:'ellipse',cx:16,cy:11.5,rx:1,ry:1},{t:'ellipse',cx:13,cy:16,rx:1.7,ry:1.7,linear:true}],
  brush:[{t:'line',x1:17.5,y1:5,x2:10.5,y2:12,linear:true},{t:'poly',points:'7 14 10 11 12.5 13.5 9.5 16.5'},{t:'poly',points:'7 14 9.5 16.5 6 18.5 6.5 15'}],
  pencil:[{t:'poly',points:'16.5 4.5 19.5 7.5 9.5 17.5 6.5 14.5',linear:true},{t:'poly',points:'6.5 14.5 9.5 17.5 5 19'},{t:'line',x1:14.5,y1:6.5,x2:17.5,y2:9.5,linear:true}],
  mic:[{t:'rect',x:9.5,y:4,w:5,h:9,linear:true},{t:'path',d:'M7 11 a5 5 0 0 0 10 0',linear:true},{t:'line',x1:12,y1:16,x2:12,y2:19,linear:true},{t:'line',x1:9,y1:19.5,x2:15,y2:19.5,linear:true}],
  vinyl:[{t:'ellipse',cx:12,cy:12,rx:8,ry:8,linear:true},{t:'ellipse',cx:12,cy:12,rx:3,ry:3,linear:true},{t:'ellipse',cx:12,cy:12,rx:.9,ry:.9}],
  speaker:[{t:'rect',x:6,y:4,w:12,h:16,linear:true},{t:'ellipse',cx:12,cy:14,rx:3,ry:3,linear:true},{t:'ellipse',cx:12,cy:7.5,rx:1.3,ry:1.3}],
  decks:[{t:'ellipse',cx:10,cy:13,rx:5.5,ry:5.5,linear:true},{t:'ellipse',cx:10,cy:13,rx:1,ry:1},{t:'line',x1:18.5,y1:6.5,x2:12,y2:11.5,linear:true},{t:'rect',x:16.8,y:5,w:2.6,h:2.6,linear:true},{t:'line',x1:19,y1:15,x2:19,y2:19.5,linear:true}],
  dance:[{t:'ellipse',cx:14,cy:5,rx:2,ry:2},{t:'path',d:'M13.5 7 L12 12 L9 14.5',linear:true},{t:'path',d:'M12 12 L14 15 L13 20',linear:true},{t:'line',x1:13,y1:8.5,x2:17,y2:7,linear:true},{t:'line',x1:12.6,y1:9.5,x2:9.5,y2:12,linear:true}],
  meditate:[{t:'ellipse',cx:12,cy:6.5,rx:2.2,ry:2.2},{t:'poly',points:'5.5 18.5 18.5 18.5 12 11'},{t:'line',x1:6,y1:15.5,x2:18,y2:15.5,linear:true}],
  leaf:[{t:'path',d:'M12 3 C16.5 7 16.5 15 12 21 C7.5 15 7.5 7 12 3 Z'},{t:'line',x1:12,y1:5.5,x2:12,y2:19,linear:true}],
  sprout:[{t:'line',x1:12,y1:20,x2:12,y2:11.5,linear:true},{t:'path',d:'M12 13 C9.5 13.2 7.2 11.5 6.5 8.8 C9.2 9 11.4 10.6 12 13 Z'},{t:'path',d:'M12 13 C14.5 13.2 16.8 11.5 17.5 8.8 C14.8 9 12.6 10.6 12 13 Z'}],
  heart:[{t:'path',d:'M12 19 L5.5 12 A3.4 3.4 0 0 1 12 8 A3.4 3.4 0 0 1 18.5 12 Z'}],
  laptop:[{t:'rect',x:5,y:5,w:14,h:9,linear:true},{t:'poly',points:'3 18 21 18 22 20 2 20'}],
  chart:[{t:'line',x1:4,y1:4,x2:4,y2:20,linear:true},{t:'line',x1:4,y1:20,x2:20,y2:20,linear:true},{t:'path',d:'M5 16 L9 12 L13 14 L19 6',linear:true}],
  briefcase:[{t:'rect',x:4,y:8,w:16,h:11,linear:true},{t:'path',d:'M9 8 V6 a1 1 0 0 1 1-1 h4 a1 1 0 0 1 1 1 V8',linear:true},{t:'line',x1:4,y1:13,x2:20,y2:13,linear:true}],
  bulb:[{t:'ellipse',cx:12,cy:9,rx:5,ry:5,linear:true},{t:'line',x1:9.6,y1:13,x2:9.6,y2:15.5,linear:true},{t:'line',x1:14.4,y1:13,x2:14.4,y2:15.5,linear:true},{t:'rect',x:9.8,y:15.5,w:4.4,h:2.4,linear:true},{t:'line',x1:10.5,y1:18.6,x2:13.5,y2:18.6,linear:true}],
  clapper:[{t:'rect',x:4,y:9,w:16,h:10,linear:true},{t:'poly',points:'4 9 20 9 19.5 5.5 6 5.5'},{t:'line',x1:9,y1:5.7,x2:7.5,y2:9,linear:true},{t:'line',x1:13,y1:5.7,x2:11.5,y2:9,linear:true},{t:'line',x1:17,y1:5.7,x2:15.5,y2:9,linear:true}],
  reel:[{t:'ellipse',cx:12,cy:12,rx:8,ry:8,linear:true},{t:'ellipse',cx:12,cy:8,rx:1.4,ry:1.4},{t:'ellipse',cx:8.5,cy:13.5,rx:1.4,ry:1.4},{t:'ellipse',cx:15.5,cy:13.5,rx:1.4,ry:1.4},{t:'ellipse',cx:12,cy:12,rx:1.3,ry:1.3}],
  playframe:[{t:'rect',x:4,y:4,w:16,h:16,linear:true},{t:'poly',points:'10 8 16 12 10 16'}],
  projector:[{t:'rect',x:3.5,y:9,w:13,h:8,linear:true},{t:'ellipse',cx:8,cy:13,rx:2.4,ry:2.4,linear:true},{t:'poly',points:'16.5 11 21 8.5 21 17.5 16.5 15'},{t:'line',x1:5.5,y1:17,x2:5.5,y2:19,linear:true},{t:'line',x1:14.5,y1:17,x2:14.5,y2:19,linear:true}],
  popcorn:[{t:'poly',points:'7 9 17 9 16 20 8 20',linear:true},{t:'line',x1:9.7,y1:9,x2:9,y2:20,linear:true},{t:'line',x1:14.3,y1:9,x2:15,y2:20,linear:true},{t:'ellipse',cx:9,cy:7.5,rx:1.6,ry:1.6},{t:'ellipse',cx:12,cy:6.5,rx:1.8,ry:1.8},{t:'ellipse',cx:15,cy:7.5,rx:1.6,ry:1.6}],
  ticket:[{t:'rect',x:3.5,y:7.5,w:17,h:9,linear:true},{t:'line',x1:14,y1:7.5,x2:14,y2:16.5,linear:true},{t:'poly',points:'6.5 10 9.5 12 6.5 14'}],
  group:[{t:'ellipse',cx:12,cy:8,rx:2.6,ry:2.6},{t:'poly',points:'7 17.5 8 13 16 13 17 17.5'},{t:'ellipse',cx:5.5,cy:9.5,rx:1.9,ry:1.9},{t:'ellipse',cx:18.5,cy:9.5,rx:1.9,ry:1.9}],
  pair:[{t:'ellipse',cx:8.5,cy:8,rx:2.4,ry:2.4},{t:'ellipse',cx:15.5,cy:8,rx:2.4,ry:2.4},{t:'poly',points:'4.5 18 5.5 13 11.5 13 12.5 18'},{t:'poly',points:'11.5 18 12.5 13 18.5 13 19.5 18'}],
  network:[{t:'ellipse',cx:12,cy:5,rx:2,ry:2},{t:'ellipse',cx:5,cy:17,rx:2,ry:2},{t:'ellipse',cx:19,cy:17,rx:2,ry:2},{t:'line',x1:11,y1:6.5,x2:6,y2:15.5,linear:true},{t:'line',x1:13,y1:6.5,x2:18,y2:15.5,linear:true},{t:'line',x1:7,y1:17,x2:17,y2:17,linear:true}],
  dating:[{t:'path',d:'M9 16 L5 12 A2.4 2.4 0 0 1 9 8.6 A2.4 2.4 0 0 1 13 12 Z'},{t:'path',d:'M15.5 18.5 L11.6 14.6 A2.2 2.2 0 0 1 15.5 11.4 A2.2 2.2 0 0 1 19.4 14.6 Z'}],
  popper:[{t:'poly',points:'4.5 20.5 10.5 12.5 13 15 7 23'},{t:'line',x1:10.5,y1:12.5,x2:13,y2:15,linear:true},{t:'line',x1:13.5,y1:10.5,x2:16,y2:8.5,linear:true},{t:'rect',x:17,y:11,w:1.6,h:1.6},{t:'ellipse',cx:15.5,cy:5.5,rx:1,ry:1},{t:'rect',x:19,y:6.5,w:1.5,h:1.5}],
  balloon:[{t:'ellipse',cx:12,cy:8.5,rx:5,ry:6,linear:true},{t:'poly',points:'10.8 14.2 13.2 14.2 12 16'},{t:'path',d:'M12 16 C12 18 13.6 19 12.5 21',linear:true}],
  cake:[{t:'rect',x:5,y:12,w:14,h:7,linear:true},{t:'line',x1:5,y1:15,x2:19,y2:15,linear:true},{t:'line',x1:8,y1:8.5,x2:8,y2:11,linear:true},{t:'line',x1:12,y1:8.5,x2:12,y2:11,linear:true},{t:'line',x1:16,y1:8.5,x2:16,y2:11,linear:true},{t:'ellipse',cx:8,cy:7.4,rx:.9,ry:1.1},{t:'ellipse',cx:12,cy:7.4,rx:.9,ry:1.1},{t:'ellipse',cx:16,cy:7.4,rx:.9,ry:1.1}],
  sparkle:[{t:'poly',points:'12 3 13.6 10.4 21 12 13.6 13.6 12 21 10.4 13.6 3 12 10.4 10.4'}],
};
const ICON_LABELS = {home:'Home',live:'Live',scan:'Scan',leaders:'Leaders',music:'Music',calendar:'Events',user:'You',drink:'Bar',check:'Check',alert:'Alert',info:'Info',bell:'Alerts',martini:'Martini',coupe:'Coupe',flute:'Flute',wine:'Wine',rocks:'Rocks',highball:'Highball',shot:'Shot',dropshot:'Drop Shot',tiki:'Tiki',beer_can:'Beer Can',beer_bottle:'Longneck',beer_stubby:'Stubby',beer_bomber:'Bomber',beer_belgian:'Belgian',beer_growler:'Growler',pint:'Pint',stein:'Stein',wine_bottle:'Wine Bottle',coffee:'Coffee',soda_can:'Soda',dice:'Dice',cards:'Cards',gamepad:'Gamepad',trivia:'Trivia',boardgame:'Board Game',chess:'Chess',dominoes:'Dominoes',speech:'Speech',chat:'Chat',globe:'Languages',palette:'Palette',brush:'Brush',pencil:'Pencil',mic:'Mic',vinyl:'Vinyl',speaker:'Speaker',decks:'DJ Decks',dance:'Dance',meditate:'Meditate',leaf:'Leaf',sprout:'Growth',heart:'Wellbeing',laptop:'Laptop',chart:'Chart',briefcase:'Business',bulb:'Ideas',clapper:'Clapper',reel:'Reel',playframe:'Screening',projector:'Projector',popcorn:'Popcorn',ticket:'Ticket',group:'Group',pair:'Meet',network:'Network',dating:'Dating',popper:'Popper',balloon:'Balloon',cake:'Cake',sparkle:'Sparkle'};
const ICON_CATEGORIES = [
  { group: 'Core nav / system', items: ['home','live','scan','leaders','music','calendar','user','drink','check','alert','info','bell'] },
  { group: 'Bar · Drinks', items: ['martini','coupe','flute','wine','rocks','highball','shot','dropshot','tiki','beer_can','beer_bottle','beer_stubby','beer_bomber','beer_belgian','beer_growler','pint','stein','wine_bottle','coffee','soda_can'] },
  { group: 'Games + Trivia', items: ['dice','cards','gamepad','trivia','boardgame','chess','dominoes'] },
  { group: 'Language + Conversation', items: ['speech','chat','globe'] },
  { group: 'Creative Arts', items: ['palette','brush','pencil'] },
  { group: 'Music + Dance', items: ['mic','vinyl','speaker','decks','dance'] },
  { group: 'Wellness + Growth', items: ['meditate','leaf','sprout','heart'] },
  { group: 'Tech + Business', items: ['laptop','chart','briefcase','bulb'] },
  { group: 'Film + Screenings', items: ['clapper','reel','playframe','projector','popcorn','ticket'] },
  { group: 'Social + Community', items: ['group','pair','network','dating'] },
  { group: 'Parties + Events', items: ['popper','balloon','cake','sparkle'] },
];

function prim(p, mode) {
  const isLinear = p.linear || p.t === 'line';
  const sw = mode === 'solid' ? 2.6 : 2;
  const stroke = `fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linejoin="miter" stroke-linecap="square" vector-effect="non-scaling-stroke"`;
  const solid = `fill="currentColor" stroke="none"`;
  const a = (mode === 'solid' && !isLinear) ? solid : stroke;
  switch (p.t) {
    case 'rect': return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" ${a}/>`;
    case 'poly': return `<polygon points="${p.points}" ${a}/>`;
    case 'ellipse': return `<ellipse cx="${p.cx}" cy="${p.cy}" rx="${p.rx}" ry="${p.ry}" ${a}/>`;
    case 'line': return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" ${a}/>`;
    case 'path': return `<path d="${p.d}" ${a}/>`;
    default: return '';
  }
}
function icon(name, { size = 28, mode = 'stroke', echo = null } = {}) {
  const glyph = (c) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;color:${c};overflow:visible">${GLYPHS[name].map(p => prim(p, mode)).join('')}</svg>`;
  if (echo) return `<span style="position:relative;display:inline-block;width:${size}px;height:${size}px"><span style="position:absolute;left:1.6px;top:1.8px">${glyph(echo)}</span><span style="position:relative">${glyph('var(--fg)')}</span></span>`;
  return glyph('currentColor');
}

/* deterministic QR-ish placeholder matrix (11×11): 3×3 corner finders + ~45% field */
function qrCells() {
  const N = 11; let s = 7; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const g = Array.from({ length: N }, () => Array(N).fill(0));
  const finder = (r, c) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g[r + i][c + j] = (i === 0 || i === 2 || j === 0 || j === 2 || (i === 1 && j === 1)) ? 1 : 0; };
  finder(0, 0); finder(0, N - 3); finder(N - 3, 0);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const inF = (r < 3 && c < 3) || (r < 3 && c >= N - 3) || (r >= N - 3 && c < 3);
    if (!inF) g[r][c] = rnd() > 0.55 ? 1 : 0;
  }
  return g.flat().map(v => v ? '<i class="on"></i>' : '<i></i>').join('');
}
const QR = qrCells();

/* canonical wordmark, inlined from assets/wordmark/reality-wordmark.svg */
const WORDMARK = `<svg viewBox="60 6 384 72" role="img" aria-label="REALITY" style="display:block;width:100%;height:auto;color:var(--fg)"><g fill="currentColor"><path d="M73.4,63.7V13.3h20.7c4.5,0,8.3.7,11.5,2.1,3.2,1.4,5.7,3.5,7.4,6.2,1.7,2.7,2.6,5.9,2.6,9.6s-.9,6.9-2.6,9.5c-1.7,2.6-4.2,4.7-7.4,6.1-3.2,1.4-7,2.2-11.5,2.2h-15.5l4.1-4.2v18.9h-9.4ZM82.7,45.9l-4.1-4.5h15c4.1,0,7.2-.9,9.3-2.7,2.1-1.8,3.1-4.2,3.1-7.4s-1-5.6-3.1-7.4c-2.1-1.8-5.2-2.6-9.3-2.6h-15l4.1-4.6v29.2ZM106.3,63.7l-12.7-18.3h10l12.8,18.3h-10.1Z"/><path d="M142.6,55.8h28.4v7.9h-37.8V13.3h36.8v7.9h-27.4v34.6ZM141.8,34.3h25.1v7.7h-25.1v-7.7Z"/><path d="M188.2,63.7v-27.9c0-5,.9-9.3,2.8-12.7s4.5-6.1,7.8-7.8c3.4-1.8,7.2-2.6,11.7-2.6s8.4.9,11.8,2.6c3.4,1.8,6,4.4,7.8,7.8,1.8,3.5,2.8,7.7,2.8,12.7v27.9h-9.3v-28.8c0-4.8-1.2-8.3-3.6-10.6-2.4-2.3-5.6-3.5-9.5-3.5s-7.2,1.2-9.5,3.5c-2.4,2.3-3.6,5.9-3.6,10.6v28.8h-9.2ZM194.1,50.7v-7.8h32.8v7.8h-32.8Z"/><path d="M253.3,63.7V13.3h9.4v42.5h26.4v7.9h-35.7Z"/><path d="M299.8,21.2v-7.9h27.9v7.9h-27.9ZM299.8,63.7v-7.9h27.9v7.9h-27.9ZM309,62.6V14.3h9.4v48.3h-9.4Z"/><path d="M354.8,63.7V21.2h-16.7v-7.9h42.8v7.9h-16.7v42.5h-9.4Z"/><path d="M415.7,71.4c-4.2,0-8.1-.6-11.5-1.9-3.5-1.2-6.4-3-8.7-5.2l3.8-7.2c2.3,2,4.7,3.5,7.5,4.5,2.7,1,5.7,1.5,9,1.5s7.8-1.2,10.2-3.5c2.3-2.4,3.5-6,3.5-10.9v-9.8l2.7,1.2c-1.6,3.9-4,6.7-7,8.5-3,1.8-6.6,2.7-10.6,2.7-6.3,0-11.3-1.8-14.8-5.4-3.5-3.6-5.3-8.9-5.3-15.7V13.3h9.4v16.5c0,4.5,1.1,7.9,3.3,10.1,2.2,2.2,5.1,3.3,8.8,3.3s7.2-1.2,9.7-3.5c2.5-2.3,3.7-6,3.7-10.9v-15.6h9.4v35c0,5.1-.9,9.3-2.8,12.7s-4.5,6-7.9,7.7c-3.4,1.8-7.5,2.7-12.2,2.7Z"/></g></svg>`;

/* "R" lettermark / favicon, inlined from assets/wordmark/reality-mark-R.svg
   (the deliberate radius exception — app-icon corners) */
const RMARK = `<svg viewBox="64 7 62 62" role="img" aria-label="REALITY R mark" style="display:block;width:100%;height:100%"><rect x="64" y="7" width="62" height="62" rx="8" fill="var(--fg)"/><path fill="var(--bg)" d="M73.4,63.7V13.3h20.7c4.5,0,8.3.7,11.5,2.1,3.2,1.4,5.7,3.5,7.4,6.2,1.7,2.7,2.6,5.9,2.6,9.6s-.9,6.9-2.6,9.5c-1.7,2.6-4.2,4.7-7.4,6.1-3.2,1.4-7,2.2-11.5,2.2h-15.5l4.1-4.2v18.9h-9.4ZM82.7,45.9l-4.1-4.5h15c4.1,0,7.2-.9,9.3-2.7,2.1-1.8,3.1-4.2,3.1-7.4s-1-5.6-3.1-7.4c-2.1-1.8-5.2-2.6-9.3-2.6h-15l4.1-4.6v29.2ZM106.3,63.7l-12.7-18.3h10l12.8,18.3h-10.1Z"/></svg>`;

/* ============================================================
   CARDS
   ============================================================ */
const cards = [];
const add = (filename, def) => cards.push({ filename, html: page(def) });

/* ---------- 00 · OVERVIEW ---------- */
add('00-overview.html', {
  group: 'Overview', name: 'REALITY — Year 2', subtitle: 'Silkscreen / riso identity · one tokened theme, Day ⇄ Night',
  w: 1100, h: 800,
  css: `
  .cover{border:3px solid var(--fg);box-shadow:var(--sh-heavy);padding:44px}
  .cover .kick{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.18em;font-size:12px;color:var(--accent);margin-bottom:18px}
  .cover .wmlogo{max-width:520px;margin-bottom:18px}
  .cover .lede{font-size:16px;color:var(--fg-dim);max-width:66ch}
  .cover .lede b{color:var(--fg);font-weight:500}
  .strip{display:flex;height:28px;margin:26px 0;border:2px solid var(--fg);box-shadow:var(--sh-light)}
  .strip i{flex:1}
  .dna{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:26px}
  @media(max-width:760px){.dna{grid-template-columns:1fr 1fr}}
  .dna .p{border:2px solid var(--fg);box-shadow:var(--sh-light);padding:18px;background:var(--surface)}
  .dna .n{font-family:var(--mont);font-weight:100;font-size:40px;line-height:1;color:var(--accent);margin-bottom:8px}
  .dna h5{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:13px;margin-bottom:6px}
  .dna p{font-size:12px;color:var(--fg-dim)}
  .convs{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
  .convs span{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:10px;border:2px solid var(--fg);padding:7px 11px;box-shadow:var(--sh-light)}`,
  body: `
  <div class="cover">
    <div class="kick">Bar · Café · Community — Đà Nẵng, Việt Nam</div>
    <div class="wmlogo">${WORDMARK}</div>
    <p class="lede">The complete Year-2 visual system: <b>foundations</b> (colour, type, spacing, shadow, motion, icons), an <b>app component set</b>, a <b>photo language</b>, and a nightlife <b>poster system</b>. One tokened theme that flips between <b>Day</b> (ink-on-cream) and <b>Night</b> (cream-on-ink). Everything re-skins from <code>--fg</code> / <code>--bg</code> + the accent.</p>
    <div class="strip"><i style="background:var(--yellow)"></i><i style="background:var(--red)"></i><i style="background:var(--blue)"></i><i style="background:var(--pink)"></i><i style="background:var(--amber)"></i><i style="background:var(--green)"></i><i style="background:var(--purple)"></i></div>
    <div class="dna">
      <div class="p"><div class="n">01</div><h5>Ink &amp; paper</h5><p>Two-colour thinking. Cream + ink carry everything; the palette is an accent, not a background.</p></div>
      <div class="p"><div class="n">02</div><h5>Hard corners</h5><p>No radius, anywhere. Everything is a stamped rectangle.</p></div>
      <div class="p"><div class="n">03</div><h5>Down-shadow</h5><p>Flat offset shadow — objects sit above the paper. Inverts to cream after dark.</p></div>
      <div class="p"><div class="n">04</div><h5>Stamp, don't float</h5><p>Motion punches in with overshoot and settles. No slow fades from nowhere.</p></div>
    </div>
    <div class="convs"><span>Major colour leads</span><span>Full-bleed photo</span><span>Swiss alignment</span><span>Talk = bottom banner</span><span>Settle, don't snap</span></div>
  </div>`
});

/* ---------- FOUNDATIONS ---------- */
const swatch = (varname, label, hex, reg) => `
  <div class="sw"><div class="chip" style="background:var(${varname})"></div>
    <div class="meta"><span class="n">${label}</span><span class="h">${hex}</span><span class="r">${reg}</span></div></div>`;
add('10-color.html', {
  group: 'Foundations', name: 'Colour & Palette', subtitle: '3 majors + 4 minors · LOCKED · doubles as poster category-coding',
  w: 1100, h: 660,
  css: `
  .tier{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.14em;font-size:11px;color:var(--fg-faint);margin:6px 0 14px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:26px}
  @media(max-width:760px){.grid{grid-template-columns:repeat(2,1fr)}}
  .sw{border:2px solid var(--fg);box-shadow:var(--sh-light);background:var(--surface)}
  .sw .chip{height:70px;border-bottom:2px solid var(--fg)}
  .sw .meta{padding:8px 11px 11px;display:flex;flex-direction:column;gap:2px}
  .sw .meta .n{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:11px}
  .sw .meta .h{font-family:var(--mont);font-weight:600;font-size:11px;color:var(--fg-faint)}
  .sw .meta .r{font-size:11px;color:var(--fg-dim);margin-top:3px}`,
  body: `
  <p class="tier">Major — working colours, lead with these on surfaces</p>
  <div class="grid">
    ${swatch('--yellow','Yellow','#fddf00','Drink deals · happy hour')}
    ${swatch('--red','Red','#ed2224','Imperative · alerts')}
    ${swatch('--blue','Blue','#18a7e0','Live music')}
    <div class="sw"><div class="chip" style="background:linear-gradient(90deg,var(--fg) 0 50%,var(--bg) 50% 100%);border-bottom:2px solid var(--fg)"></div><div class="meta"><span class="n">Ink / Paper</span><span class="h">#0d0905 · #fffbf1</span><span class="r">The two that carry everything</span></div></div>
  </div>
  <p class="tier">Minor — extend the category-coding</p>
  <div class="grid">
    ${swatch('--pink','Pink','#ed1b72','Parties · default accent')}
    ${swatch('--amber','Amber','#fdb515','Warm · late')}
    ${swatch('--green','Green','#43b02a','Community · day')}
    ${swatch('--purple','Purple','#6e3179 → #9a4faa','After-dark · lifts on ink')}
  </div>
  <div class="note"><h4>Locked</h4><p>The palette is fixed — don't add or recolour. <b>On surfaces, lead with the three majors (blue / yellow / red);</b> the minors play second fiddle. <b>--accent</b> (default pink) is the swappable lead; <b>--accent-2</b> (default blue) is the second misregistration layer. Purple is the one value that shifts: <b>#6e3179</b> in Day lifts to <b>#9a4faa</b> in Night so it glows on the dark ground.</p></div>`
});

add('11-surfaces.html', {
  group: 'Foundations', name: 'Surfaces — Day ⇄ Night', subtitle: 'data-theme="dark" flips it · in Day, bg = surface = surface-2 (borders, not fills, separate cards)',
  w: 1100, h: 600,
  css: `
  .rows{display:flex;flex-direction:column;gap:0}
  .r{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--hairline)}
  .r:last-child{border-bottom:none}
  .r .box{width:46px;height:46px;border:2px solid var(--fg);flex:none}
  .r .tn{font-family:var(--mont);font-weight:700;font-size:12px;letter-spacing:.04em;width:118px;flex:none}
  .r .tx{font-size:12.5px;color:var(--fg-dim)}
  .demo{margin-top:18px;border:2px solid var(--fg);box-shadow:var(--sh-default);padding:16px;background:var(--surface)}
  .demo .ink{background:var(--fg);color:var(--bg);font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:12px;padding:10px 14px;display:inline-block}`,
  body: dual(`
    <div class="rows">
      <div class="r"><div class="box" style="background:var(--bg)"></div><span class="tn">--bg</span><span class="tx">page / paper</span></div>
      <div class="r"><div class="box" style="background:var(--surface)"></div><span class="tn">--surface</span><span class="tx">cards (bordered, same paper in Day)</span></div>
      <div class="r"><div class="box" style="background:var(--fg)"></div><span class="tn">--fg</span><span class="tx">ink: text · 2px borders · fills</span></div>
      <div class="r"><div class="box" style="background:var(--fg-dim)"></div><span class="tn">--fg-dim</span><span class="tx">secondary text</span></div>
      <div class="r"><div class="box" style="background:var(--fg-faint)"></div><span class="tn">--fg-faint</span><span class="tx">tertiary / labels</span></div>
      <div class="r"><div class="box" style="background:var(--hairline)"></div><span class="tn">--hairline</span><span class="tx">subtle rules</span></div>
    </div>
    <div class="demo"><span class="ink">--fg fill → --bg text (flips together)</span></div>`) + `
  <div class="note"><h4>Settle, don't snap</h4><p>When flipping the theme, transition every surface, border, shadow and fill <b>together (~350ms settle)</b> for the duration of the flip, then return to snappy interaction timings. <b>Default to the visitor's OS setting</b> (prefers-color-scheme) until they choose explicitly.</p></div>`
});

add('12-typography.html', {
  group: 'Foundations', name: 'Typography', subtitle: 'Montserrat (UI/display) · Montserrat Alternates (wordmark A/I/Y) · Space Grotesk (body)',
  w: 1100, h: 720,
  css: `
  .trow{display:grid;grid-template-columns:150px 1fr;gap:28px;padding:20px 0;border-bottom:1px solid var(--hairline);align-items:baseline}
  .trow:last-child{border-bottom:none}
  .tm{font-family:var(--mont);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--fg-faint);line-height:1.5}
  .d{font-family:var(--mont);font-weight:100;font-size:clamp(34px,5.5vw,64px);text-transform:uppercase;letter-spacing:.05em;line-height:1.05}
  .h1{font-family:var(--mont);font-weight:700;font-size:clamp(26px,3.4vw,40px);text-transform:uppercase;letter-spacing:.05em;line-height:1.1}
  .h2{font-family:var(--mont);font-weight:600;font-size:24px;text-transform:uppercase;letter-spacing:.05em}
  .lab{font-family:var(--mont);font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.15em;color:var(--accent)}
  .bd{font-family:var(--grotesk);font-weight:400;font-size:17px;line-height:1.7;color:var(--fg-dim);max-width:60ch}
  .wd{width:100%;max-width:330px}`,
  body: `
  <div class="trow"><div class="tm">Display<br>Montserrat 100<br>clamp 40–82 · .05em</div><div class="d">After Dark</div></div>
  <div class="trow"><div class="tm">H1<br>Montserrat 700<br>clamp 30–46 · .05em</div><div class="h1">Happy Hour</div></div>
  <div class="trow"><div class="tm">H2<br>Montserrat 600<br>24px · .05em</div><div class="h2">This Week at Reality</div></div>
  <div class="trow"><div class="tm">Label / eyebrow<br>Montserrat 700<br>13px · .15em</div><div class="lab">Live Music · Tonight</div></div>
  <div class="trow"><div class="tm">Body<br>Space Grotesk 400<br>17px · lh 1.7</div><div class="bd">Open daily 11:00–02:00 at 86 Mai Thúc Lân. A bar that runs on two colours — cream and ink — and a palette that only ever shows up as an accent.</div></div>
  <div class="trow"><div class="tm">Wordmark<br>Mont. + Alternates<br>A/I/Y only · baked SVG</div><div class="wd">${WORDMARK}</div></div>`
});

add('13-shadow.html', {
  group: 'Foundations', name: 'Shadow — flat riso down-shadow', subtitle: 'Straight-down offset, almost no blur — ink leaking under a lifted edge. Inverts to cream in Night.',
  w: 1100, h: 520,
  css: `
  .sg{display:grid;grid-template-columns:repeat(3,1fr);gap:30px}
  @media(max-width:760px){.sg{grid-template-columns:1fr;gap:36px}}
  .sd{background:var(--surface);border:2px solid var(--fg);height:120px;display:flex;align-items:center;justify-content:center;font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:12px}
  .sd.l{box-shadow:var(--sh-light)}.sd.d{box-shadow:var(--sh-default)}.sd.h{box-shadow:var(--sh-heavy)}
  .cap{font-family:var(--mont);font-weight:600;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--fg-faint);margin-top:14px;text-align:center}`,
  body: dual(`
    <div class="sg">
      <div><div class="sd l">Light</div><div class="cap">--sh-light · 0 4px 1px</div></div>
      <div><div class="sd d">Default</div><div class="cap">--sh-default · 0 8px 2px</div></div>
      <div><div class="sd h">Heavy</div><div class="cap">--sh-heavy · 0 12px 3px</div></div>
    </div>`)
});

add('14-spacing.html', {
  group: 'Foundations', name: 'Spacing & Layout', subtitle: '4px ramp · semantic app tokens at the locked "Comfortable" density',
  w: 1100, h: 660,
  css: `
  .ramp{display:flex;flex-direction:column;gap:9px;margin-bottom:24px}
  .ramp .rr{display:flex;align-items:center;gap:14px}
  .ramp .bar{height:18px;background:var(--accent);border:2px solid var(--fg)}
  .ramp .lab{font-family:var(--mont);font-weight:600;font-size:11px;letter-spacing:.06em;color:var(--fg-dim);width:120px;flex:none}
  table{width:100%;border-collapse:collapse;border:2px solid var(--fg);box-shadow:var(--sh-light)}
  th,td{text-align:left;padding:9px 13px;border-bottom:1px solid var(--hairline);font-size:12.5px}
  th{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:10.5px;background:var(--fg);color:var(--bg)}
  td:first-child{font-family:var(--mont);font-weight:700;font-size:12px}
  td.v{color:var(--accent);font-family:var(--mont);font-weight:700}`,
  body: `
  <p class="eyebrow">The ramp · --space-1…10</p>
  <div class="ramp">
    ${[['1',4],['2',8],['3',12],['4',16],['5',20],['6',24],['7',32],['8',48],['9',64],['10',96]].map(([n,px])=>`<div class="rr"><span class="lab">--space-${n} · ${px}px</span><div class="bar" style="width:${px*2.4}px"></div></div>`).join('')}
  </div>
  <table>
    <tr><th>Semantic token</th><th>Value</th><th>Use</th></tr>
    <tr><td>--screen-pad</td><td class="v">20</td><td>phone screen margin</td></tr>
    <tr><td>--section-gap</td><td class="v">16</td><td>between screen blocks</td></tr>
    <tr><td>--card-pad</td><td class="v">20</td><td>inside cards</td></tr>
    <tr><td>--row-y</td><td class="v">12</td><td>list-row vertical</td></tr>
    <tr><td>--tap-min</td><td class="v">48</td><td>touch-target floor</td></tr>
    <tr><td>--grid-cols / --grid-gutter</td><td class="v">4 / 12</td><td>phone content grid</td></tr>
  </table>
  <div class="note"><h4>Borders &amp; corners</h4><p><b>Hard corners everywhere — border-radius: 0, no exceptions.</b> Standard stroke is <b>2px</b> ink; section rules 1.5px; mastheads &amp; footers 3px. Touch targets ≥ 48px.</p></div>`
});

add('15-motion.html', {
  group: 'Foundations', name: 'Motion', subtitle: 'Stamp, then settle — overshoot punch + quick settle. Honour prefers-reduced-motion (ship end-state).',
  w: 1100, h: 760,
  css: `
  .mg{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:24px}
  @media(max-width:760px){.mg{grid-template-columns:1fr}}
  .curve{border:2px solid var(--fg);box-shadow:var(--sh-light);padding:16px;background:var(--surface)}
  .curve svg{width:100%;height:80px;display:block}
  .curve .t{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:12px;margin-top:10px}
  .curve .c{font-family:var(--mont);font-weight:600;font-size:10.5px;color:var(--fg-faint);letter-spacing:.03em}
  .durs{display:flex;flex-direction:column;gap:9px;margin-bottom:24px}
  .durs .rr{display:flex;align-items:center;gap:14px}
  .durs .lab{font-family:var(--mont);font-weight:600;font-size:11px;letter-spacing:.05em;width:160px;flex:none;color:var(--fg-dim)}
  .durs .bar{height:16px;background:var(--accent);border:2px solid var(--fg)}
  .named{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  @media(max-width:760px){.named{grid-template-columns:1fr}}
  .na{border:2px solid var(--fg);box-shadow:var(--sh-light);background:var(--surface);padding:16px}
  .na h5{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:13px;margin-bottom:6px}
  .na .meta{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:9.5px;color:var(--accent);margin-bottom:8px}
  .na p{font-size:12px;color:var(--fg-dim);line-height:1.5}`,
  body: `
  <p class="eyebrow">Easing curves</p>
  <div class="mg">
    <div class="curve"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="100" x2="100" y2="100" stroke="var(--hairline)" stroke-width="1"/><path d="M0 100 C20 -40 45 0 100 0" fill="none" stroke="var(--accent)" stroke-width="3" vector-effect="non-scaling-stroke"/></svg><div class="t">Stamp</div><div class="c">cubic-bezier(.2,1.4,.45,1) · overshoot</div></div>
    <div class="curve"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="100" x2="100" y2="100" stroke="var(--hairline)" stroke-width="1"/><path d="M0 100 C30 100 80 0 100 0" fill="none" stroke="var(--accent)" stroke-width="3" vector-effect="non-scaling-stroke"/></svg><div class="t">Snap</div><div class="c">cubic-bezier(.3,0,.2,1) · settle</div></div>
    <div class="curve"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="100" x2="100" y2="100" stroke="var(--hairline)" stroke-width="1"/><path d="M0 100 C16 0 30 0 100 0" fill="none" stroke="var(--accent)" stroke-width="3" vector-effect="non-scaling-stroke"/></svg><div class="t">Glide</div><div class="c">cubic-bezier(.16,1,.3,1) · long decel</div></div>
  </div>
  <p class="eyebrow">Duration scale</p>
  <div class="durs">
    ${[['--dur-tap · 120ms','hover lift · button press',120],['--dur-quick · 200ms','chip / small toggle',200],['--dur-settle · 350ms','day/night flip · crossfade',350],['--dur-enter · 700ms','counters · kinetic · hero',700],['--stagger · 90ms','between sibling entrances',90]].map(([l,u,ms])=>`<div class="rr"><span class="lab">${l}</span><div class="bar" style="width:${ms/2.2}px"></div><span style="font-size:11.5px;color:var(--fg-dim)">${u}</span></div>`).join('')}
  </div>
  <p class="eyebrow">Named animations</p>
  <div class="named">
    <div class="na"><div class="meta">Glide · ~900ms</div><h5>Color Separation</h5><p>Riso print reveal — red, blue, amber passes slide in offset, then converge into register. Brand / splash.</p></div>
    <div class="na"><div class="meta">Stamp · 460ms · 120ms stagger</div><h5>Chip Pop</h5><p>Filters lay down left-to-right, each shooting a misregistered accent behind it. Filter / category tap.</p></div>
    <div class="na"><div class="meta">Glide · 700ms / word</div><h5>Kinetic Headline</h5><p>Words punch in as registration passes (red, blue, amber crash &amp; lock; last word yellow). Headline reveal.</p></div>
  </div>`
});

/* ---------- COMPONENTS ---------- */
const BTN = `
.btn{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:14px;border:2px solid var(--fg);padding:14px 24px;min-height:48px;background:var(--fg);color:var(--bg);box-shadow:var(--sh-default);transition:transform .12s ease,box-shadow .12s ease;display:inline-flex;align-items:center;gap:9px}
.btn:hover{transform:translateY(-3px);box-shadow:var(--sh-heavy)}
.btn:active{transform:translateY(2px);box-shadow:var(--sh-light)}
.btn.ghost{background:var(--surface);color:var(--fg)}
.btn.action{background:var(--red);color:#fffbf1;border-color:var(--red)}
.btn.info{background:var(--blue);color:#0d0905;border-color:var(--blue)}
.btn.notice{background:var(--yellow);color:#0d0905;border-color:var(--yellow)}
.btn.sm{font-size:12px;padding:9px 16px;min-height:38px}
.btn.dis{background:var(--surface);color:var(--fg-faint);border-color:var(--hairline);box-shadow:none;cursor:not-allowed}
.rd-spin{width:15px;height:15px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:rd-rot .7s linear infinite;display:inline-block}
@keyframes rd-rot{to{transform:rotate(360deg)}}`;

add('20-buttons.html', {
  group: 'Components', name: 'Buttons', subtitle: 'Roles default / ghost / action / info / notice · sizes md+sm · states default / disabled / loading',
  w: 1100, h: 600, css: BTN,
  body: dual(`
    <div class="lbl">Roles</div>
    <div class="row" style="margin-bottom:18px"><button class="btn">Default</button><button class="btn ghost">Ghost</button><button class="btn action">Action</button><button class="btn info">Info</button><button class="btn notice">Notice</button></div>
    <div class="lbl">Sizes</div>
    <div class="row" style="margin-bottom:18px"><button class="btn">Medium · 48</button><button class="btn sm">Small · 38</button></div>
    <div class="lbl">States</div>
    <div class="row"><button class="btn">Default</button><button class="btn dis">Disabled</button><button class="btn"><span class="rd-spin"></span>Loading</button></div>`)
});

add('21-chips.html', {
  group: 'Components', name: 'Chips', subtitle: 'Montserrat 700 · 11px · 2px ink · paper fill · optional bordered category dot',
  w: 1100, h: 420,
  css: `.chip{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:11px;border:2px solid var(--fg);background:var(--surface);padding:8px 14px;display:inline-flex;align-items:center;gap:8px}
  .chip .dot{width:10px;height:10px;border:1.5px solid var(--fg)}`,
  body: dual(`
    <div class="row">
      <span class="chip"><span class="dot" style="background:var(--pink)"></span>Party</span>
      <span class="chip"><span class="dot" style="background:var(--blue)"></span>Live Music</span>
      <span class="chip"><span class="dot" style="background:var(--yellow)"></span>Happy Hour</span>
      <span class="chip"><span class="dot" style="background:var(--green)"></span>Community</span>
      <span class="chip"><span class="dot" style="background:var(--amber)"></span>Late</span>
      <span class="chip">No dot</span>
    </div>`)
});

add('22-fields.html', {
  group: 'Components', name: 'Input Fields', subtitle: 'Default · Focus (accent + 3px outline) · Error (red + hint) · Disabled — label above in Montserrat 700',
  w: 1100, h: 560,
  css: `
  .field{border:2px solid var(--fg);background:var(--surface);box-shadow:var(--sh-light);padding:13px 14px;width:100%;font-family:var(--grotesk);font-size:15px;color:var(--fg)}
  .field::placeholder{color:var(--fg-faint)}
  .flabel{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:11px;margin-bottom:7px;display:block}
  .fg{margin-bottom:18px}
  .field.focus{border-color:var(--accent);outline:3px solid color-mix(in srgb,var(--accent) 35%,transparent)}
  .field.err{border-color:var(--red)}
  .hint{font-size:12px;color:var(--red);margin-top:6px;font-family:var(--grotesk)}
  .field.dis{opacity:.5;background:transparent;box-shadow:none}`,
  body: dual(`
    <div class="fg"><label class="flabel">Default</label><div class="field">your@email.com</div></div>
    <div class="fg"><label class="flabel">Focus</label><div class="field focus">typing…</div></div>
    <div class="fg"><label class="flabel">Error</label><div class="field err">not-an-email</div><div class="hint">Enter a valid email</div></div>
    <div class="fg"><label class="flabel">Disabled</label><div class="field dis">unavailable</div></div>`)
});

add('23-cards.html', {
  group: 'Components', name: 'Cards', subtitle: '2px ink · paper surface · down-shadow · optional accent top-bar with ink label',
  w: 1100, h: 460,
  css: `
  .card{border:2px solid var(--fg);background:var(--surface);box-shadow:var(--sh-default)}
  .card .top{background:var(--accent);border-bottom:2px solid var(--fg);padding:10px 16px;font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:#0d0905;display:flex;justify-content:space-between}
  .card .body{padding:20px}
  .card .body h4{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:20px;margin-bottom:8px}
  .card .body p{font-size:14px;color:var(--fg-dim)}`,
  body: dual(`
    <div class="card">
      <div class="top"><span>Tonight</span><span>21:00</span></div>
      <div class="body"><h4>DJ Misregistration</h4><p>Late set in the back room. Cream + ink, one accent, hard corners — a card is a bordered rectangle that sits above the paper.</p></div>
    </div>`)
});

add('24-controls.html', {
  group: 'Components', name: 'Controls', subtitle: 'Switch · Checkbox · Radio — hard-corner, 2px ink, accent on-state',
  w: 1100, h: 520,
  css: `
  .ctl{display:flex;align-items:center;gap:12px}
  .ctlname{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:12px}
  .sw-tr{position:relative;width:56px;height:30px;border:2px solid var(--fg);background:var(--surface);box-shadow:var(--sh-light);flex:none}
  .sw-tr.on{background:var(--accent)}
  .sw-kn{position:absolute;top:2px;left:2px;width:22px;height:22px;background:var(--fg)}
  .sw-tr.on .sw-kn{left:28px}
  .cb{width:26px;height:26px;border:2px solid var(--fg);background:var(--surface);box-shadow:var(--sh-light);display:flex;align-items:center;justify-content:center;flex:none}
  .cb.on{background:var(--fg)}
  .rd-o{width:26px;height:26px;border:2px solid var(--fg);background:var(--surface);box-shadow:var(--sh-light);display:flex;align-items:center;justify-content:center;flex:none}
  .rd-o .in{width:12px;height:12px;background:var(--accent)}
  .grp{display:flex;flex-direction:column;gap:16px}`,
  body: dual(`
    <div class="grp">
      <div class="lbl">Switch</div>
      <div class="ctl"><span class="sw-tr on"><span class="sw-kn"></span></span><span class="ctlname">On</span></div>
      <div class="ctl"><span class="sw-tr"><span class="sw-kn"></span></span><span class="ctlname">Off</span></div>
      <div class="lbl">Checkbox</div>
      <div class="ctl"><span class="cb on"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M4.5 12.5 L9.5 17.5 L19.5 6.5" fill="none" stroke="var(--bg)" stroke-width="2.6" stroke-linecap="square" stroke-linejoin="miter"/></svg></span><span class="ctlname">Checked</span></div>
      <div class="ctl"><span class="cb"></span><span class="ctlname">Unchecked</span></div>
      <div class="lbl">Radio</div>
      <div class="ctl"><span class="rd-o"><span class="in"></span></span><span class="ctlname">Selected</span></div>
      <div class="ctl"><span class="rd-o"></span><span class="ctlname">Unselected</span></div>
    </div>`)
});

add('25-indicators.html', {
  group: 'Components', name: 'Indicators', subtitle: 'Avatar · Badge · Dot · Progress · Stepper · Countdown timer',
  w: 1100, h: 620,
  css: `
  .av{border:2px solid var(--fg);box-shadow:var(--sh-light);display:inline-flex;align-items:center;justify-content:center;color:#0d0905;font-family:var(--mont);font-weight:700;letter-spacing:.02em}
  .badge{min-width:20px;height:20px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;font-family:var(--mont);font-weight:700;letter-spacing:.04em;font-size:11px;text-transform:uppercase}
  .dot{width:11px;height:11px;border:2px solid var(--bg);display:inline-block}
  .prog{height:16px;border:2px solid var(--fg);background:var(--surface);box-shadow:var(--sh-light)}
  .prog i{display:block;height:100%;background:var(--accent)}
  .step{display:flex;align-items:center;gap:10px}
  .step .seg{width:18px;height:10px;border:2px solid var(--fg)}
  .step-name{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:11px}
  .timer{border:2px solid var(--fg);background:var(--surface);box-shadow:var(--sh-default);padding:16px;max-width:260px}
  .timer .th{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:11px}
  .timer .tl{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.14em;font-size:10px}
  .timer .tv{font-family:var(--mont);font-weight:700;font-size:30px;letter-spacing:.02em}
  .seg-track{display:flex;gap:3px}
  .seg-track .s{flex:1;height:8px;border:1.5px solid var(--fg);background:var(--surface)}
  .seg-track .s.on{background:var(--fg)}`,
  body: dual(`
    <div class="lbl">Avatar · initials on category colour</div>
    <div class="row" style="margin-bottom:18px">
      <span class="av" style="width:44px;height:44px;background:var(--pink);font-size:16px">LK</span>
      <span class="av" style="width:44px;height:44px;background:var(--blue);font-size:16px">MN</span>
      <span class="av" style="width:44px;height:44px;background:var(--green);font-size:16px">TK</span>
      <span class="av" style="width:44px;height:44px;background:var(--amber);font-size:16px">PD</span>
    </div>
    <div class="lbl">Badge · Dot</div>
    <div class="row" style="margin-bottom:18px">
      <span class="badge" style="background:var(--red);color:#fffbf1">3</span>
      <span class="badge" style="background:var(--blue);color:#0d0905">New</span>
      <span class="dot" style="background:var(--red)"></span>
      <span class="dot" style="background:var(--green)"></span>
      <span class="dot" style="background:var(--amber)"></span>
    </div>
    <div class="lbl">Progress</div>
    <div class="prog" style="margin-bottom:18px"><i style="width:62%"></i></div>
    <div class="lbl">Stepper</div>
    <div class="step" style="margin-bottom:18px"><span class="step-name">Round 2 / 5</span>
      <span class="seg" style="background:var(--fg)"></span><span class="seg" style="background:var(--accent)"></span><span class="seg" style="background:var(--surface)"></span><span class="seg" style="background:var(--surface)"></span><span class="seg" style="background:var(--surface)"></span>
    </div>
    <div class="lbl">Countdown timer · turns red ≤ 5s</div>
    <div class="timer">
      <div class="th"><span class="tl">Time left</span><span class="tv" style="color:var(--red)">0:03</span></div>
      <div class="seg-track">${Array.from({length:15}).map((_,i)=>`<span class="s${i<3?' on':''}"></span>`).join('')}</div>
    </div>`)
});

add('26-feedback.html', {
  group: 'Components', name: 'Toast & Alert', subtitle: 'Four kinds (success / info / action / notice) · icon tile + message · inline alert with action',
  w: 1100, h: 600, css: BTN + `
  .toast{display:flex;gap:14px;align-items:flex-start;border:2px solid var(--fg);background:var(--surface);box-shadow:var(--sh-default);padding:14px;width:330px}
  .toast .ic{width:40px;height:40px;border:2px solid var(--fg);display:flex;align-items:center;justify-content:center;flex:none}
  .toast .tt{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:12px}
  .toast .ms{font-size:13px;color:var(--fg-dim);margin-top:3px;line-height:1.45}
  .alert{border:2px solid var(--fg);background:var(--surface);box-shadow:var(--sh-light)}
  .alert .bar{border-bottom:2px solid var(--fg);padding:8px 14px;display:flex;align-items:center;gap:9px;color:#0d0905;font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:11px}
  .alert .ab{padding:16px;display:flex;align-items:center;gap:16px;justify-content:space-between;flex-wrap:wrap}
  .alert .ab span{font-size:13.5px;color:var(--fg-dim);flex:1;min-width:160px}`,
  body: dual(`
    <div class="lbl">Toasts</div>
    <div class="stack" style="margin-bottom:20px">
      <div class="toast"><span class="ic" style="background:var(--green)">${icon('check',{size:22})}</span><div><div class="tt">Saved</div><div class="ms">Your RSVP is in — see you Friday.</div></div></div>
      <div class="toast"><span class="ic" style="background:var(--red)">${icon('alert',{size:22})}</span><div><div class="tt">Sold out</div><div class="ms">This session just hit capacity.</div></div></div>
    </div>
    <div class="lbl">Inline alert</div>
    <div class="alert">
      <div class="bar" style="background:var(--yellow)">${icon('bell',{size:18})}Last call</div>
      <div class="ab"><span>Happy hour ends in 15 minutes.</span><button class="btn action sm">Order now</button></div>
    </div>`)
});

add('27-navigation.html', {
  group: 'Components', name: 'Bottom Navigation', subtitle: 'Five tabs · centre Scan raised in an accent tile · active tab inverts to ink',
  w: 1100, h: 420,
  css: `
  .nav{display:flex;border:2px solid var(--fg);background:var(--surface);position:relative;box-shadow:var(--sh-default)}
  .nav .tab{flex:1;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:var(--fg)}
  .nav .tab.on{background:var(--fg);color:var(--bg)}
  .nav .tab .tl{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:8px}
  .nav .scan{flex:1;display:flex;justify-content:center}
  .nav .scan .tile{width:60px;height:60px;margin-top:-18px;background:var(--accent);border:2px solid var(--fg);box-shadow:var(--sh-default);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#0d0905}
  .nav .scan .tl{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:8px}`,
  body: dual(`
    <div class="nav">
      <div class="tab on">${icon('home',{size:23})}<span class="tl">Home</span></div>
      <div class="tab">${icon('calendar',{size:23})}<span class="tl">Events</span></div>
      <div class="scan"><div class="tile">${icon('scan',{size:24})}<span class="tl">Scan</span></div></div>
      <div class="tab">${icon('leaders',{size:23})}<span class="tl">Leaders</span></div>
      <div class="tab">${icon('user',{size:23})}<span class="tl">You</span></div>
    </div>`)
});

add('28-leaderboard.html', {
  group: 'Components', name: 'Leaderboard', subtitle: 'Ranked rows · rank · avatar · name · score — leader row inverts to ink',
  w: 1100, h: 460,
  css: `
  .lb{border:2px solid var(--fg);box-shadow:var(--sh-default);background:var(--surface)}
  .lb .lr{display:flex;align-items:center;gap:14px;padding:12px 16px;border-top:1px solid var(--hairline)}
  .lb .lr:first-child{border-top:none}
  .lb .lr.lead{background:var(--fg);color:var(--bg)}
  .lb .rk{font-family:var(--mont);font-weight:700;font-size:13px;letter-spacing:.04em;width:22px;color:var(--fg-faint)}
  .lb .lr.lead .rk{color:var(--bg)}
  .lb .av{width:38px;height:38px;border:2px solid var(--fg);box-shadow:var(--sh-light);display:flex;align-items:center;justify-content:center;color:#0d0905;font-family:var(--mont);font-weight:700;font-size:13px;flex:none}
  .lb .nm{flex:1;font-family:var(--mont);font-weight:600;text-transform:uppercase;letter-spacing:.04em;font-size:13px}
  .lb .sc{font-family:var(--mont);font-weight:700;font-size:17px;letter-spacing:.02em}`,
  body: dual(`
    <div class="lb">
      <div class="lr lead"><span class="rk">01</span><span class="av" style="background:var(--pink)">LK</span><span class="nm">Linh · table 4</span><span class="sc">248</span></div>
      <div class="lr"><span class="rk">02</span><span class="av" style="background:var(--blue)">MN</span><span class="nm">Minh</span><span class="sc">231</span></div>
      <div class="lr"><span class="rk">03</span><span class="av" style="background:var(--green)">TK</span><span class="nm">Tâm + Khoa</span><span class="sc">205</span></div>
      <div class="lr"><span class="rk">04</span><span class="av" style="background:var(--amber)">PD</span><span class="nm">Phúc</span><span class="sc">188</span></div>
    </div>`)
});

add('29-icons.html', {
  group: 'Components', name: 'Icon Library', subtitle: '72 geometric 24×24 glyphs · 2px ink strokes · hard joints (square caps, miter joins) · 11 categories',
  w: 1100, h: 1100,
  css: `
  .cat{margin-bottom:22px}
  .cat .ch{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:10px;color:var(--fg-faint);margin-bottom:10px;border-bottom:1.5px solid var(--hairline);padding-bottom:6px}
  .ig{display:grid;grid-template-columns:repeat(10,1fr);border-top:2px solid var(--fg);border-left:2px solid var(--fg);box-shadow:var(--sh-light);background:var(--bg)}
  @media(max-width:760px){.ig{grid-template-columns:repeat(5,1fr)}}
  .ic{background:var(--surface);aspect-ratio:1/1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:8px;border-right:2px solid var(--fg);border-bottom:2px solid var(--fg)}
  .ic .lab{font-family:var(--mont);font-weight:600;text-transform:uppercase;letter-spacing:.05em;font-size:8px;color:var(--fg-faint);text-align:center}
  .treat{display:flex;gap:34px;align-items:center;margin-top:8px;flex-wrap:wrap}
  .treat .t{display:flex;flex-direction:column;align-items:center;gap:10px}
  .treat .t .cap{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:10px;color:var(--fg-faint)}`,
  body: `
  ${ICON_CATEGORIES.map(cat => `<div class="cat"><div class="ch">${cat.group} · ${cat.items.length}</div><div class="ig">${cat.items.map(n => `<div class="ic">${icon(n,{size:26})}<span class="lab">${ICON_LABELS[n]||n}</span></div>`).join('')}</div></div>`).join('')}
  <p class="eyebrow" style="margin-top:8px">Treatments — Day = stroke · Night = echo-line</p>
  <div class="treat">
    <div class="t">${icon('music',{size:46,mode:'stroke'})}<span class="cap">Stroke</span></div>
    <div class="t">${icon('music',{size:46,mode:'solid'})}<span class="cap">Solid</span></div>
    <div class="t">${icon('music',{size:46,mode:'solid',echo:'var(--accent)'})}<span class="cap">Echo</span></div>
    <div class="t">${icon('music',{size:46,mode:'stroke',echo:'var(--accent)'})}<span class="cap">Echo-line</span></div>
  </div>
  <div class="note"><h4>Construction</h4><p>24×24 grid · geometric primitives · <b>2px</b> stroke (2.6px in solid) · <b>square caps, miter joins</b>. Echo offsets the accent pass +1.6 / +1.8px. Resolved per theme — <b>Day = stroke, Night = echo-line</b>.</p></div>`
});

/* ---------- BRAND ---------- */
add('30-wordmark.html', {
  group: 'Brand', name: 'Wordmark & Lettermark', subtitle: 'Montserrat with the Alternates A / I / Y only · Semi-Bold, tracked 0.1em · baked vector (ships in /assets)',
  w: 1100, h: 620,
  css: `
  .stage{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
  @media(max-width:760px){.stage{grid-template-columns:1fr}}
  .panebox{border:2px solid var(--fg);box-shadow:var(--sh-default);padding:42px 40px;display:flex;align-items:center;justify-content:center;gap:32px}
  .panebox .rmk{width:84px;height:84px;flex:none}
  .files{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
  .files span{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:10px;border:2px solid var(--fg);padding:7px 11px;box-shadow:var(--sh-light)}`,
  body: `
  <div class="stage">
    <div class="panebox scope-day" style="background:var(--bg)"><div style="flex:1">${WORDMARK}</div><span class="rmk">${RMARK}</span></div>
    <div class="panebox scope-night" style="background:var(--bg)"><div style="flex:1">${WORDMARK}</div><span class="rmk">${RMARK}</span></div>
  </div>
  <div class="note"><h4>Construction (corrected canon)</h4><p>The canonical wordmark is a <b>baked SVG</b> — Montserrat Semi-Bold, all caps, tracked <b>0.1em</b>, with the Montserrat&nbsp;Alternates forms supplying the <b>A / I / Y only</b> (the R, E, L, T stay Montserrat). You can't get this mixed-font mark from one CSS font-family, so <b>don't re-typeset it</b> — use the supplied vector. Recolour with <code>fill</code> / <code>currentColor</code>. The <b>"R" lettermark</b> (favicon) is the same R in a rounded tile — the one deliberate radius exception.</p>
  <p>Ship-ready files in this package:</p>
  <div class="files"><span>assets/wordmark/reality-wordmark.svg</span><span>assets/wordmark/reality-mark-R.svg</span><span>assets/qr/reality-qr-ink.svg</span></div></div>`
});

/* ---------- PHOTO ---------- */
add('40-photo.html', {
  group: 'Photo', name: 'Photo Language', subtitle: 'Six riso treatments · full-bleed is the house default · the mandatory logo box',
  w: 1100, h: 640,
  css: `
  .ph{position:relative;height:230px;border:2px solid var(--fg);box-shadow:var(--sh-default);background:repeating-linear-gradient(45deg,var(--surface-2),var(--surface-2) 18px,var(--bg) 18px,var(--bg) 36px);display:flex;align-items:center;justify-content:center;overflow:hidden}
  .ph .stripeLabel{font-family:var(--mont);font-weight:700;letter-spacing:.16em;text-transform:uppercase;font-size:13px;background:var(--bg);padding:7px 12px;border:2px solid var(--fg)}
  .ph .logobox{position:absolute;left:16px;bottom:16px;background:var(--fg);color:var(--bg);font-family:var(--alt);font-weight:600;text-transform:uppercase;letter-spacing:.02em;font-size:22px;padding:8px 14px;border:2px solid var(--fg)}
  .treats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}
  @media(max-width:760px){.treats{grid-template-columns:1fr 1fr}}
  .tr{border:2px solid var(--fg);box-shadow:var(--sh-light);background:var(--surface);padding:12px 14px}
  .tr.lead{background:var(--accent);color:#0d0905;border-color:var(--accent)}
  .tr .tn{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:12px;margin-bottom:4px}
  .tr p{font-size:11.5px;color:var(--fg-dim);line-height:1.45}
  .tr.lead p{color:rgba(13,9,5,.7)}`,
  body: dual(`
    <div class="ph"><span class="stripeLabel">Photo →  treatment</span><span class="logobox">Reality</span></div>
    <div class="treats">
      <div class="tr lead"><div class="tn">Duotone</div><p>Luminance lerped between two inks — start here.</p></div>
      <div class="tr"><div class="tn">Off-Register</div><p>Two ink passes, offset — the deliberate misprint.</p></div>
      <div class="tr"><div class="tn">Halftone</div><p>Single-ink dot screen, dots sized by luminance.</p></div>
      <div class="tr"><div class="tn">Posterize</div><p>Hard tonal bands snapped to a palette ramp.</p></div>
      <div class="tr"><div class="tn">Ink Cutout</div><p>Lit subject knocks out over a solid accent field.</p></div>
      <div class="tr"><div class="tn">Overprint</div><p>Two flat ink fields overlap to bloom a third hue.</p></div>
    </div>`) + `
  <div class="note"><h4>Rules</h4><p><b>Full-bleed photography is the house default</b> — text goes cream over the image, with a clean surface block when the image is busy. Each treatment reads one source photo + the poster's ink. The wordmark <b>never floats bare on a photo</b> — it always sits in a box.</p></div>`
});

/* ---------- POSTERS ---------- */
const POSTER = `
.rail{display:flex;flex-wrap:wrap;gap:26px;align-items:flex-start}
.pcell{width:300px}
.pcell .pc-cat{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:10px;color:var(--accent);margin-top:12px}
.pcell .pc-name{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.03em;font-size:15px;margin:3px 0 5px}
.pcell .pc-note{font-size:12px;color:var(--fg-dim);line-height:1.5}
.pcell .pc-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.pcell .pc-tags span{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.07em;font-size:8.5px;border:1.5px solid var(--hairline);padding:3px 7px;color:var(--fg-dim)}
.frame{position:relative;width:300px;height:420px;overflow:hidden;border:2px solid var(--fg);box-shadow:var(--sh-default);background:var(--bg)}
.poster{position:absolute;top:0;left:0;width:1080px;height:1512px;transform-origin:top left;transform:scale(.27778)}
.pphoto{position:absolute;inset:0;z-index:0}
.pphoto.day{background:radial-gradient(130% 90% at 50% 12%,rgba(255,255,255,.18),transparent 58%),radial-gradient(120% 100% at 50% 105%,rgba(13,9,5,.28),transparent 55%),repeating-linear-gradient(54deg,rgba(13,9,5,.05) 0 26px,rgba(13,9,5,.11) 26px 52px);background-color:#9c9488}
.pphoto.night{background:radial-gradient(130% 90% at 50% 10%,rgba(120,90,160,.30),transparent 55%),radial-gradient(120% 100% at 50% 108%,rgba(0,0,0,.55),transparent 55%),repeating-linear-gradient(54deg,rgba(0,0,0,.24) 0 26px,rgba(0,0,0,.42) 26px 52px);background-color:#221a26}
.pphoto .ptag{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);font-family:var(--mont);font-weight:700;letter-spacing:.26em;font-size:13px;color:rgba(255,255,255,.42);white-space:nowrap}
.pcanvas{position:absolute;inset:0;z-index:1}
.box{border:3px solid currentColor;box-shadow:var(--sh-default)}
.box.solid{background:var(--fg);color:var(--bg)}
.box.paper{background:var(--bg);color:var(--fg)}
.box.accent{background:var(--accent);color:#0d0905;border-color:var(--accent)}
.box.scrim{background:color-mix(in srgb,var(--bg) 78%,transparent);color:var(--fg);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.box.outline{background:transparent;color:var(--fg)}
.amk{font-family:var(--mont);font-weight:700;text-transform:uppercase}
.akick{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.2em;font-size:23px}
.atitle{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.005em;line-height:.86}
.atitle.thin{font-weight:100;letter-spacing:.04em}
.atag{font-family:var(--grotesk);line-height:1.3}
.qr{display:grid;grid-template-columns:repeat(11,1fr);background:currentColor;padding:7px;flex:none}
.qr i{background:transparent}.qr i.on{background:var(--qr-bg,#fffbf1)}
.t-qr{width:120px;height:120px}
.ticket-band{position:absolute;left:0;right:0;bottom:0;z-index:2;border-top:3px solid currentColor;display:flex;align-items:center;justify-content:space-between;gap:22px;padding:26px 54px}
.ticket-band .tk-word{font-family:var(--alt);font-weight:600;text-transform:uppercase;letter-spacing:.02em;font-size:50px;line-height:.78}
.ticket-band .tk-mid{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:17px;text-align:center;line-height:1.55}
.ticket-band .tk-mid span{display:block;font-weight:600;letter-spacing:.08em;opacity:.72;font-size:14px}
.ticket-corner{position:absolute;z-index:2;display:flex;align-items:center;gap:18px;border:3px solid currentColor;box-shadow:var(--sh-heavy);padding:18px 22px}
.ticket-corner .tk-word{font-family:var(--alt);font-weight:600;text-transform:uppercase;letter-spacing:.02em;font-size:38px;line-height:.78}
.ticket-corner .tk-lines{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:13px;line-height:1.5}
.ticket-corner .tk-lines span{display:block;font-weight:600;opacity:.72;font-size:12px;letter-spacing:.06em}
.mreg{position:relative;display:inline-block}
.mreg .l{display:block;font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.005em;line-height:.84;margin:0}
.mreg .l.under{position:absolute;top:0;left:0}
.mreg .l.l2{color:var(--accent-2);transform:translate(18px,20px);z-index:1}
.mreg .l.l1{color:var(--accent);transform:translate(34px,40px);z-index:2}
.mreg .l.top{position:relative;z-index:3;color:currentColor}
.flag{display:inline-block;font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.06em;border:3px solid currentColor;box-shadow:var(--sh-default);padding:10px 16px}`;

add('50-posters.html', {
  group: 'Posters', name: 'Poster Archetypes', subtitle: 'Four archetypes = four coordinates in the dial space · 5:7 master · full-bleed photo (you supply)',
  w: 1240, h: 820, css: POSTER,
  body: `
  <div class="rail">

    <div class="pcell"><div class="frame"><div class="poster scope-day" style="--accent:var(--blue)">
      <div class="pphoto day"><span class="ptag">▲ YOUR PHOTO — FULL BLEED</span></div>
      <div class="pcanvas" style="color:#0d0905">
        <div class="box solid" style="position:absolute;top:250px;left:50%;transform:translateX(-50%);padding:12px 26px"><span class="amk" style="letter-spacing:.18em;font-size:26px">Wed · 19:30</span></div>
        <div style="position:absolute;top:350px;left:0;width:100%;text-align:center"><div class="atitle" style="font-size:176px">Pub</div><div class="atitle" style="font-size:176px">Quiz</div></div>
        <div class="box paper" style="position:absolute;top:712px;left:50%;transform:translateX(-50%);padding:16px 30px"><span class="atag" style="font-size:28px">Six rounds · cold beer · bragging rights</span></div>
        <div class="box solid" style="position:absolute;top:835px;left:50%;transform:translateX(-50%);padding:20px 34px;text-align:center"><div class="amk" style="color:var(--blue);letter-spacing:.2em;font-size:17px;margin-bottom:6px">Hosted by</div><div class="amk" style="font-size:44px;letter-spacing:.02em">The Quizmaster</div></div>
      </div>
      <div class="ticket-band" style="background:#fffbf1;color:#0d0905;--qr-bg:#fffbf1"><span class="tk-word">Reality</span><div class="tk-mid">realitydn.com<span>86 Mai Thúc Lân · Đà Nẵng</span></div><div class="qr t-qr">${QR}</div></div>
    </div></div>
      <div class="pc-cat">Community · day</div><div class="pc-name">Pub Quiz</div>
      <div class="pc-note">Symmetric on the spine, calm <b>blue</b>, all solid blocks — the friendly baseline.</div>
      <div class="pc-tags"><span>Day</span><span>Symmetric</span><span>Solid</span><span>Slam title</span><span>Ticket band</span></div>
    </div>

    <div class="pcell"><div class="frame"><div class="poster scope-day" style="--accent:var(--green)">
      <div class="pphoto day"><span class="ptag">▲ YOUR PHOTO — FULL BLEED</span></div>
      <div class="pcanvas" style="color:#0d0905">
        <div style="position:absolute;top:262px;left:0;width:100%;text-align:center"><span class="amk" style="letter-spacing:.22em;font-size:25px">Sunday · 17:00 · free</span></div>
        <div style="position:absolute;top:344px;left:0;width:100%;text-align:center"><div class="atitle thin" style="font-size:140px">Acoustic</div><div class="atitle thin" style="font-size:140px">Sessions</div></div>
        <div class="box paper" style="position:absolute;top:700px;left:50%;transform:translateX(-50%);padding:16px 30px"><span class="atag" style="font-size:27px">Unplugged on the patio</span></div>
        <div class="box outline" style="position:absolute;top:822px;left:50%;transform:translateX(-50%);padding:20px 34px;text-align:center;background:rgba(255,251,241,.55)"><div class="amk" style="color:var(--green);letter-spacing:.2em;font-size:17px;margin-bottom:6px">With</div><div class="amk" style="font-size:42px;letter-spacing:.02em">Mai Linh Trio</div></div>
      </div>
      <div class="ticket-band" style="background:#fffbf1;color:#0d0905;--qr-bg:#fffbf1"><span class="tk-word">Reality</span><div class="tk-mid">realitydn.com<span>86 Mai Thúc Lân · Đà Nẵng</span></div><div class="qr t-qr">${QR}</div></div>
    </div></div>
      <div class="pc-cat">Community · day</div><div class="pc-name">Acoustic Sessions</div>
      <div class="pc-note">Same grid, but a <b>thin display title</b> + <b>outline box</b> let it breathe — calmer, <b>green</b>.</div>
      <div class="pc-tags"><span>Day</span><span>Symmetric</span><span>Outline</span><span>Thin title</span><span>Ticket band</span></div>
    </div>

    <div class="pcell"><div class="frame"><div class="poster scope-night" style="--accent:var(--pink);--accent-2:var(--blue)">
      <div class="pphoto night"><span class="ptag">▲ YOUR PHOTO — FULL BLEED</span></div>
      <div class="pcanvas" style="color:#fffbf1">
        <div style="position:absolute;top:250px;left:96px"><span class="akick" style="color:var(--pink)">Fri · 22:00 — late</span></div>
        <div class="mreg" style="position:absolute;top:330px;left:90px;font-size:150px;color:#fffbf1"><div class="l under l2">Pulse<br>Sessions</div><div class="l under l1">Pulse<br>Sessions</div><div class="l top">Pulse<br>Sessions</div></div>
        <div class="flag" style="position:absolute;top:730px;left:96px;color:#0d0905;background:var(--pink);border-color:var(--pink);font-size:21px;transform:rotate(-3deg)">Free before 23:00</div>
        <div class="box" style="position:absolute;top:840px;right:96px;padding:22px 30px;text-align:right;background:#0a0703;color:#fffbf1"><div class="amk" style="color:var(--pink);letter-spacing:.2em;font-size:16px;margin-bottom:7px">On the decks</div><div class="amk" style="font-size:46px;letter-spacing:.01em;line-height:.95">DJ Milk<br>Hanø · b2b</div></div>
      </div>
      <div class="ticket-corner" style="bottom:60px;right:60px;background:#0a0703;color:#fffbf1;--qr-bg:#0a0703"><span class="tk-word">Reality</span><div class="tk-lines">realitydn.com<span>86 Mai Thúc Lân</span></div><div class="qr" style="width:104px;height:104px">${QR}</div></div>
    </div></div>
      <div class="pc-cat">Nightlife · after dark</div><div class="pc-name">Pulse Sessions</div>
      <div class="pc-note">Title slams left as a <b>misregistered print</b>, info offsets right, ticket drops to a <b>corner cluster</b>. Loud <b>pink</b>.</div>
      <div class="pc-tags"><span>Night</span><span>Asymmetric</span><span>Misregister</span><span>Corner ticket</span></div>
    </div>

    <div class="pcell"><div class="frame"><div class="poster scope-night" style="--accent:var(--red);--accent-2:var(--amber)">
      <div class="pphoto night"><span class="ptag">▲ YOUR PHOTO — FULL BLEED</span></div>
      <div class="pcanvas" style="color:#fffbf1">
        <div style="position:absolute;top:248px;left:96px"><span class="akick" style="color:var(--red)">Sat · 23:00 → 04:00</span></div>
        <div class="box scrim" style="position:absolute;top:328px;left:80px;width:720px;padding:30px 40px 38px;transform:rotate(-2deg)"><div class="atitle" style="font-size:150px;color:#fffbf1">After<br>Dark</div><div class="atag" style="font-size:26px;color:rgba(255,251,241,.82);margin-top:14px">Residents + guests · 3 floors</div></div>
        <div class="box accent" style="position:absolute;top:842px;left:96px;padding:22px 32px;transform:rotate(2deg)"><div class="amk" style="color:rgba(13,9,5,.6);letter-spacing:.2em;font-size:16px;margin-bottom:7px">Specials</div><div class="amk" style="font-size:44px;letter-spacing:.01em;line-height:.95">₫50k spirits<br>til 1am</div></div>
      </div>
      <div class="ticket-corner" style="bottom:60px;right:60px;background:#0a0703;color:#fffbf1;--qr-bg:#0a0703"><span class="tk-word">Reality</span><div class="tk-lines">realitydn.com<span>86 Mai Thúc Lân</span></div><div class="qr" style="width:104px;height:104px">${QR}</div></div>
    </div></div>
      <div class="pc-cat">Nightlife · after dark</div><div class="pc-name">After Dark</div>
      <div class="pc-note">The wildest read: a <b>translucent scrim</b> floats the title, a rotated <b>red specials box</b> packs extra info.</div>
      <div class="pc-tags"><span>Night</span><span>Offset stagger</span><span>Scrim</span><span>Specials</span><span>Corner ticket</span></div>
    </div>

  </div>`
});

add('51-poster-grid.html', {
  group: 'Posters', name: 'Poster Grid System', subtitle: '1080×1512 (5:7) · 108px square module · 10×14 grid · crop-safe square · ticket variants',
  w: 1100, h: 720,
  css: `
  .two{display:grid;grid-template-columns:.9fr 1.1fr;gap:32px;align-items:start}
  @media(max-width:820px){.two{grid-template-columns:1fr}}
  .dframe{position:relative;width:100%;max-width:300px;aspect-ratio:1080/1512;border:2px solid var(--fg);box-shadow:var(--sh-default);overflow:hidden;background-color:#2a2118}
  .dframe .dphoto{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 16%,rgba(255,255,255,.10),transparent 55%),repeating-linear-gradient(58deg,rgba(0,0,0,.20) 0 14px,rgba(0,0,0,.36) 14px 28px)}
  .glines{position:absolute;inset:0;pointer-events:none;background-image:repeating-linear-gradient(to right,rgba(255,255,255,.28) 0 1px,transparent 1px 10%),repeating-linear-gradient(to bottom,rgba(255,255,255,.28) 0 1px,transparent 1px calc(100%/14))}
  .crop-ig{position:absolute;left:0;right:0;top:5.357%;bottom:5.357%;border:2px dashed rgba(255,255,255,.7)}
  .crop-sq{position:absolute;left:0;right:0;top:14.286%;bottom:14.286%;border:3px solid var(--accent)}
  .crop-sq::before{content:"";position:absolute;inset:0;background:var(--accent);opacity:.10}
  .dframe .tag{position:absolute;font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:9px;padding:3px 6px}
  .dframe .tag.ig{top:5%;left:6px;background:var(--blue);color:#0d0905}
  .dframe .tag.sq{bottom:14.5%;left:6px;background:var(--accent);color:#0d0905}
  .spectable{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:18px}
  .cell{border:2px solid var(--fg);box-shadow:var(--sh-light);background:var(--surface);padding:14px}
  .cell .big{font-family:var(--mont);font-weight:700;font-size:26px;line-height:1}
  .cell .big .u{font-size:13px;font-weight:600;color:var(--fg-faint);margin-left:3px}
  .cell .lab{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:9.5px;color:var(--fg-faint);margin-top:7px}
  .tk{display:flex;flex-direction:column;gap:10px}
  .tk .ti{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;border-bottom:1px solid var(--hairline);padding-bottom:10px}
  .tk .ti:last-child{border-bottom:none}
  .tk .mk{font-family:var(--mont);font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);width:64px;flex:none}
  .tk p{font-size:12.5px;color:var(--fg-dim);line-height:1.5}
  .tk b{color:var(--fg)}`,
  body: `
  <div class="two">
    <div>
      <div class="dframe"><div class="dphoto"></div><div class="glines"></div><div class="crop-ig"></div><div class="crop-sq"></div><span class="tag ig">4:5 feed crop</span><span class="tag sq">1:1 safe square</span></div>
      <p style="font-size:11.5px;color:var(--fg-dim);margin-top:12px;max-width:300px">Full-bleed photo under a 10×14 module grid. The <b style="color:var(--fg)">safe square</b> (inset 2 modules top/bottom) survives a WhatsApp/IG 1:1 crop; the dashed line is the 4:5 feed crop.</p>
    </div>
    <div>
      <p class="eyebrow">The grid</p>
      <div class="spectable">
        <div class="cell"><div class="big">1080×1512<span class="u">px</span></div><div class="lab">Canvas · 5:7 master</div></div>
        <div class="cell"><div class="big">108<span class="u">px</span></div><div class="lab">Square module</div></div>
        <div class="cell"><div class="big">10 × 14</div><div class="lab">Module grid</div></div>
        <div class="cell"><div class="big">1080²</div><div class="lab">Safe square (inset 2 mod)</div></div>
      </div>
      <p class="eyebrow">Ticket — the constant anchor</p>
      <div class="tk">
        <div class="ti"><span class="mk">Band</span><p><b>Full-width base</b> below the safe square — the bookish/editorial read for talks &amp; series.</p></div>
        <div class="ti"><span class="mk">Corner</span><p><b>Compressed cluster</b> in a corner — frees the frame for nightlife asymmetry.</p></div>
        <div class="ti"><span class="mk">Centre</span><p><b>Pulled into the safe square</b> — QR + wordmark survive every crop.</p></div>
      </div>
      <div class="note"><h4>Swiss alignment</h4><p>International/Swiss alignment is core DNA — boxes of different sizes <b>share a vertical line</b> (templates seed a shared left line at x≈90). Multi-select align + edge-snapping in the Studio make it effortless.</p></div>
    </div>
  </div>`
});

add('52-poster-grammar.html', {
  group: 'Posters', name: 'Poster Grammar', subtitle: 'A poster = pick a Frame · fill the Parts · set the Dials (seven spectrums: calm community → wild nightlife)',
  w: 1100, h: 740,
  css: `
  .layers{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
  @media(max-width:760px){.layers{grid-template-columns:1fr}}
  .layer{border:2px solid var(--fg);box-shadow:var(--sh-light);padding:18px;background:var(--surface)}
  .layer .n{font-family:var(--mont);font-weight:100;font-size:36px;color:var(--accent);line-height:1;margin-bottom:8px}
  .layer h5{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:13px;margin-bottom:6px}
  .layer p{font-size:12px;color:var(--fg-dim);line-height:1.5}
  .parts{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
  .parts span{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:9px;border:1.5px solid var(--hairline);padding:4px 8px;color:var(--fg-dim)}
  .parts span.core{border-color:var(--fg);color:var(--fg)}
  .dials{display:flex;flex-direction:column;gap:11px}
  .dial{display:grid;grid-template-columns:128px 1fr 128px;gap:14px;align-items:center}
  .dial .nm{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:11px}
  .dial .nm span{color:var(--fg-faint);font-weight:600;margin-right:6px}
  .dial .lo{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:10px;color:var(--fg-dim);text-align:right}
  .dial .hi{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:10px;color:var(--accent)}
  .dial .track{height:6px;background:var(--hairline);position:relative}
  .dial .track i{position:absolute;top:50%;transform:translate(-50%,-50%);width:15px;height:15px;border:2px solid var(--fg);background:var(--bg);box-shadow:var(--sh-light)}`,
  body: `
  <div class="layers">
    <div class="layer"><div class="n">01</div><h5>Frame</h5><p>The archetype skeleton + aspect. Author on the 4:5 / 5:7 master; reflows to 1:1, 9:16, A4 with per-format overrides.</p></div>
    <div class="layer"><div class="n">02</div><h5>Parts</h5><p>The content blocks that ride the grid — nine always present, the rest drop in as the event needs.<div class="parts"><span class="core">Title</span><span class="core">Tagline</span><span class="core">Host</span><span class="core">When</span><span class="core">Ticket+QR</span><span>Lineup</span><span>Specials</span><span>Tiers</span><span>Stamps</span><span>Sponsors</span></div></p></div>
    <div class="layer"><div class="n">03</div><h5>Dials</h5><p>Continuous style controls. They slide together from community to nightlife — that single motion makes a quiz and a DJ set feel different on one system.</p></div>
  </div>
  <p class="eyebrow">The seven dials</p>
  <div class="dials">
    ${[['D1','Palette','Day','Night',.5],['D2','Accent','Cool','Hot',.45],['D3','Tilt','Square','Skewed',.3],['D4','Symmetry','Centered','Offset',.4],['D5','Density','Airy','Packed',.42],['D6','Type Weight','Quiet','Slam',.6],['D7','Surface','Solid','Sheer',.35]].map(([d,nm,lo,hi,p])=>`<div class="dial"><span class="lo">${lo}</span><div class="track" style="position:relative"><span class="nm" style="position:absolute;left:0;top:-20px"><span>${d}</span>${nm}</span><i style="left:${p*100}%"></i></div><span class="hi">${hi}</span></div>`).join('')}
  </div>
  <div class="note" style="margin-top:34px"><h4>Archetypes are coordinates</h4><p><b>Pub Quiz</b> = day · symmetric · solid · blue. <b>Acoustic Sessions</b> = day · symmetric · outline · thin · green. <b>Pulse Sessions</b> = night · offset · misregister · pink. <b>After Dark</b> = night · stagger · scrim · red. Same nine slots, four dial settings.</p></div>`
});

/* ============================================================
   WRITE
   ============================================================ */
for (const c of cards) writeFileSync(join(OUT, c.filename), c.html, 'utf8');

for (const f of ['reality-tokens.css', 'reality-tokens.json']) {
  const src = join(SRC, 'tokens', f);
  if (existsSync(src)) copyFileSync(src, join(OUT, f));
}

/* ship the real brand assets so Claude Design can place the actual logo + QR */
const ASSETS = [
  'assets/wordmark/reality-wordmark.svg',
  'assets/wordmark/reality-mark-R.svg',
  'assets/qr/reality-qr-ink.svg',
  'assets/qr/reality-qr-ink-on-cream.png',
];
for (const rel of ASSETS) {
  const src = join(SRC, rel);
  if (existsSync(src)) { mkdirSync(dirname(join(OUT, rel)), { recursive: true }); copyFileSync(src, join(OUT, rel)); }
}

/* local contact-sheet index (not a card) */
const indexHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>REALITY · Year 2 — Claude Design package</title>${FONTS}<style>${TOKENS}
body{font-family:var(--grotesk);background:var(--bg);color:var(--fg);padding:32px;max-width:1320px;margin:0 auto}
h1{font-family:var(--alt);font-weight:600;text-transform:uppercase;letter-spacing:.02em;font-size:48px;margin-bottom:6px}
.sub{color:var(--fg-dim);margin-bottom:28px;font-size:15px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:18px}
.card{border:2px solid var(--fg);box-shadow:var(--sh-default);background:var(--surface);overflow:hidden}
.card .frame{height:300px;border-bottom:2px solid var(--fg);overflow:hidden;background:var(--bg)}
.card iframe{width:200%;height:600px;border:0;transform:scale(.5);transform-origin:top left}
.card .meta{padding:12px 14px}
.card .g{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.14em;font-size:9px;color:var(--accent)}
.card .nm{font-family:var(--mont);font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:14px;margin-top:3px}
a{color:inherit;text-decoration:none}</style></head><body>
<h1>Reality</h1><div class="sub">Year 2 Design System — Claude Design package · ${cards.length} cards</div>
<div class="grid">
${cards.map(c => { const m = c.html.match(/group="([^"]*)" name="([^"]*)"/); return `<a class="card" href="${c.filename}" target="_blank"><div class="frame"><iframe src="${c.filename}" scrolling="no"></iframe></div><div class="meta"><div class="g">${m?m[1]:''}</div><div class="nm">${m?m[2]:c.filename}</div></div></a>`; }).join('\n')}
</div></body></html>`;
writeFileSync(join(OUT, 'index.html'), indexHtml, 'utf8');

console.log(`Wrote ${cards.length} cards + index.html + tokens to ${OUT}`);
for (const c of cards) console.log('  ·', c.filename);
