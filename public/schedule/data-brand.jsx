/* ============================================================
   REALITY SCHEDULE STUDIO — data · brand atoms
   The Schedule's ink mark and its QR (target, labels, the glyph).
   The palette, faces, day tables, wordmark and encoder themselves
   live in ../studio-shared/ and are re-exported by schedule-data.jsx.
   ============================================================ */
import { INK_MARK_DAY_ACCENT, inkMarkCells, inkMarkHex, inkMarkLayout } from '../studio-shared/brand.js';
import { QRGlyph } from '../studio-shared/qr.js';

/* ============================================================
   BRAND ATOMS
   ============================================================ */
/* The canonical REALITY wordmark — Montserrat w/ Alternates A,I,Y, baked
   vector (the site Logo's paths) — is ../studio-shared/wordmark.jsx, re-exported
   by schedule-data.jsx as Wordmark. tight=true crops the built-in margins so it sits flush
   in left-aligned headers. */

/* Real QR — encodes https://app.realitydn.com (QR_TARGET below; v2, EC M),
   live, through ../studio-shared/qr.js — the encoder the Poster and Print use.
   Until 23.09.26 this was a matrix pinned from tools/generate-qr.py.

   DELIBERATELY NOT the same target as the Poster Studio's code, which stays on
   the bare apex realitydn.com per canon D5. A poster is an advert for one
   event and the site is where you land; a weekly schedule is a LISTING, and
   the thing a listing wants to hand you is the live version of itself — the
   app, where the same week carries every event's detail page, and where a
   printed sheet from Monday still resolves to Thursday's changes. The printed
   site string on the sheet stays realitydn.com; only the code goes to the app. */
/* INK MARK — canon rev 22.08.26 — is brand.js's (INK_MARK, the artwork cell
   table, inkMarkCells / inkMarkLayout / inkMarkHex): the one block the Poster
   and Print draw too, so the three renderers cannot drift to different marks.
   Machine spec: design-system-year2/design_handoff_web_app_ink_pass/tokens/
   ink-strip.json — cell ORDER is FIXED, recolouring (mode / day) is the only
   parameter. */
/* The mark itself. `m` is the module in px; the caller sizes it, exactly as the
   poster ticket does, so a mark beside a QR can be pinned to that QR's height.
   No radius, no gradients, no cell shadows — the spec bans all three. */
function SchInkMark({ form, mode, m, day }){
  const lay = inkMarkLayout(form);
  const cells = inkMarkCells(form, mode||'full');
  const acc = INK_MARK_DAY_ACCENT[day||'fri'] || 'red';
  const nameOf = (slot)=> slot[0]==='b' ? cells.bands[+slot.slice(1)] : cells.field[+slot.slice(1)];
  return <div aria-hidden="true" style={{ position:'relative', flex:'none',
      width:lay.cols*m, height:lay.rows*m }}>
    {lay.boxes.map(b=>(
      <div key={b.slot} style={{ position:'absolute', left:b.x*m, top:b.y*m, width:b.w*m, height:b.h*m,
        background:inkMarkHex(nameOf(b.slot), acc) }} />
    ))}
  </div>;
}

const QR_TARGET = 'https://app.realitydn.com';
const QR_HOST   = 'app.realitydn.com';
/* Two lengths for the label, because the QR appears in footers of very
   different widths. The renderer picks by available space — full sentence in
   the print/story footers, the short host where a grid cell is the size of a
   stamp, nothing at all when even that won't sit. */
const QR_LABEL      = 'Full schedule + event details';
const QR_LABEL_SHORT= 'Full schedule';
/* The same offer as a sentence, for surfaces that carry the words WITHOUT a
   code beside them — the FB cover, where 315px of height has no room for a
   scannable one, and any daily card whose footer is a line rather than a block.
   One constant so the host is spelled one way everywhere: bare, no scheme, no
   www (canon D5). */
const QR_CTA        = 'Full schedule + details at ' + QR_HOST;
/* The quiet-zone maths (QUIET_SPEC / QUIET_TIGHT / qrPatternOf — the pattern
   inside a tile, which sizes the ink square butted against the code), the
   encoder and the <div>-grid glyph are ../studio-shared/qr.js, the same ones
   the Poster uses. The live encoder picks a different (equally valid) mask
   than the old pinned matrix did — still 25 modules, so every size and the
   ink square beside it are unchanged. flex:none so a footer row never
   squeezes it. */
function SchQR(props){ return <QRGlyph {...props} text={QR_TARGET} style={{ flex:'none' }} />; }

export { SchInkMark, QR_TARGET, QR_HOST, QR_LABEL, QR_LABEL_SHORT, QR_CTA, SchQR };
