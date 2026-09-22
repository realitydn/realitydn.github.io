/* ============================================================
   REALITY POSTER STUDIO — element style helpers
   Colour resolution, shadows and text padding shared by every element renderer.
   ============================================================ */
import { PALETTE as SE_PAL, ACCENTS as SE_ACC, themeColors as seTheme, textInsetModel, shadowModel } from '../studio-data.jsx';
const SE_LIT = { ink:'#0d0905', cream:'#fffbf1' };
/* Resolve an element's colour choice to a hex. 'fg' (or anything unknown)
   falls back to the supplied default — surface-contrast colour for text,
   the poster accent for fills. 'ink'/'cream' are literal and theme-independent,
   so e.g. a title can be forced cream for legibility over a dark photo. */
function seResolve(colorKey, fallback){
  if(colorKey==='ink'||colorKey==='cream') return SE_LIT[colorKey];
  return SE_ACC.indexOf(colorKey)>=0 ? SE_PAL[colorKey] : fallback;
}
function seRGBA(hex, a){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
}
/* Build a shadow CSS string ("dx dy blur colour") from a shadowModel — the one
   place the trig + colour resolution lives. text-shadow, box-shadow and
   drop-shadow all take this same syntax, so every element shares it. 'fg' uses
   the theme's adaptive press shadow (dark on day, a soft glow on night).
   Returns null when the shadow is off. */
function seShadowCss(m, theme){
  if(!m || !m.on) return null;
  const t = seTheme(theme);
  const ang = m.ang*Math.PI/180;
  const col = m.ck==='fg' ? t.shadow(m.alpha)
            : seRGBA(m.ck==='ink'?'#0d0905':m.ck==='cream'?'#fffbf1':(SE_PAL[m.ck]||'#0d0905'), m.alpha);
  const dx = Math.round(Math.cos(ang)*m.dist*10)/10, dy = Math.round(Math.sin(ang)*m.dist*10)/10;
  return `${dx}px ${dy}px ${m.blur}px ${col}`;
}
/* The Align control's companion: how far the text sits from the edge it is
   aligned to. `vert` is the type's own vertical padding — pass it in and this
   returns the element's COMPLETE padding, replacing the shorthand it used to
   hard-code.
   One shorthand, never a longhand beside it. React only re-applies style keys
   that changed, so any shorthand/longhand pair silently desyncs: drop the
   longhand (align left→right) and React clears paddingLeft to '' without
   re-applying the unchanged shorthand, collapsing that side to 0; change the
   shorthand (surface none→solid) and it clobbers the longhand that didn't
   change. Emitting one always-complete string sidesteps both. */
function sePad(el, vert){
  const m = textInsetModel(el);
  const l = m.side==='left'  ? m.val : m.def;
  const r = m.side==='right' ? m.val : m.def;
  return { padding: vert+'px '+r+'px '+vert+'px '+l+'px' };
}
/* Cross-axis for a COLUMN container whose children shrink-wrap (a badge's
   stacked lines, matchup's team names, the ticket banner): textAlign alone
   can't move those, they need alignItems to follow the text. */
function seColAlign(el){
  const a = textInsetModel(el).align;
  return a==='left' ? 'flex-start' : a==='right' ? 'flex-end' : 'center';
}
/* Main-axis for a ROW container (qr) — there, horizontal is justifyContent. */
function seRowAlign(el){
  const a = textInsetModel(el).align;
  return a==='left' ? 'flex-start' : a==='right' ? 'flex-end' : 'center';
}
/* drop-shadow form for the artwork family (photo / logo / block / weekly). */
function seShadow(el, theme){
  const css = seShadowCss(shadowModel(el, theme), theme);
  return css ? { css, filter:`drop-shadow(${css})` } : null;
}

export { SE_LIT, seResolve, seRGBA, seShadowCss, sePad, seColAlign, seRowAlign, seShadow };
