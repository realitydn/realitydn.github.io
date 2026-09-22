/* ============================================================
   REALITY STUDIOS — the wordmark, as an <svg>
   ------------------------------------------------------------
   The canonical mark — Montserrat with Alternates A/I/Y, baked to
   vector (brand.js WORDMARK_PATHS, the site Logo's own paths). Every
   Studio draws it through this one component; posters, sheets and
   schedules never set the name in a font.

     height — fixed pixel height (the ticket / footer / header lockup)
     fill   — scale to fit the container instead, preserving aspect
              (Poster's standalone resizable Wordmark element)
     tight  — crop the built-in margins so it sits flush in a
              left-aligned header (Schedule)
     color  — defaults to artwork ink
   ============================================================ */
import { WORDMARK_PATHS, WORDMARK_VIEWBOX, WORDMARK_VIEWBOX_TIGHT, INK_HEX } from './brand.js';

function WordmarkSVG({ height, color, fill, tight }){
  const sz = fill ? { width:'100%', height:'100%', preserveAspectRatio:'xMidYMid meet' } : { height };
  return (
    <svg viewBox={tight ? WORDMARK_VIEWBOX_TIGHT : WORDMARK_VIEWBOX} {...sz} role="img" aria-label="REALITY" style={{ display:'block' }}>
      <g fill={color||INK_HEX}>{WORDMARK_PATHS.map((d,i)=><path key={i} d={d} />)}</g>
    </svg>
  );
}

export { WordmarkSVG };
