/* ============================================================
   REALITY POSTER STUDIO — title party effects, Poster's side
   The effects themselves (the thirteen moves, the one spec both
   renderers draw from, the screen renderer) are shared with Print:
   studio-shared/title-fx.jsx. What stays here is Poster's own idea of
   the GROUND a title sits on — Day / Night pages and the cream paper.
   ============================================================ */
import { themeColors as fxTheme } from '../studio-data.jsx';
export { TITLE_FX, FX_AMOUNTS, FX_USES, FX_HINTS, fxSpec, titleFx, FxTitle, fxPad } from '../../studio-shared/title-fx.jsx';

/* What the title sits on. A bare / outlined / scrimmed title reads the page —
   over a photo that's an estimate, but it's the same one Auto text makes. */
function groundOf(surface, theme, accentHex){
  const t = fxTheme(theme);
  if(surface==='solid')  return t.fg;
  if(surface==='paper')  return t.paper;
  if(surface==='accent') return accentHex;
  return t.bg;
}

export { groundOf };
