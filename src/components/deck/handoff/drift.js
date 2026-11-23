// 2 · DRIFT. Nothing moves but the colour plates. The page scrolls exactly as
// it does now; what changes is the REGISTER of each card's header colour
// against its ink outline and its words.
//
//   leaving   the header's colour slips down and to the right, further the
//             further its card has gone
//   arriving  the next header's colour starts out of register (up and to the
//             left, towards the card being left) and closes in as it rises,
//             then LOCKS with a hard snap when the header reaches its place
//
// ON THE REAL (TALL) CARDS: by the time a card is left, its header would be
// screens away. So the header rides under the strip while its card is read
// (`head`), and that is where its colour is seen slipping.
//
// KEEPING THE HEADER READABLE while its colour is off: the words are printed
// twice by one gradient (drift.css). Where the colour plate is under a
// letter, the letter is the plate's own text colour (cream on red, ink on
// yellow, as at rest). Where the plate has slipped away and the letter is on
// bare paper, the letter is ink. The words never move and never lose contrast.
import './drift.css';
import { clamp01, setVar, toggle } from './stage';

// How far a plate travels, as a share of the header's height (down) and in px
// (across). Leaving goes further than arriving: it has longer to go.
const OUT_Y = 0.78;
const OUT_X = 30;
const IN_Y = 0.6;
const IN_X = 20;
// …and how far off it still is the moment before it locks.
const SNAP_Y = 12;
const SNAP_X = 7;

export default {
  key: 'drift',
  head: true,

  // The gradient needs each piece of header text to know where it sits inside
  // its header (see drift.css).
  measure(st) {
    st.heads.forEach((h) => {
      h.style.setProperty('--hw', `${h.offsetWidth}px`);
      h.style.setProperty('--hh', `${h.offsetHeight}px`);
      Array.from(h.children).forEach((c) => {
        c.style.setProperty('--ex', `${c.offsetLeft}px`);
        c.style.setProperty('--ey', `${c.offsetTop}px`);
      });
    });
  },

  frame(st) {
    const place = st.strip;
    const run = Math.max(1, st.vh - place);
    for (let i = 0; i < st.n; i++) {
      const head = st.heads[i];
      const artTop = st.top[i] + st.padTop;
      const artBottom = artTop + st.artH[i];
      if (artBottom < -200 || artTop > st.vh + 200) continue; // nowhere near the screen
      const hh = st.headH[i];
      const arriving = clamp01((artTop - place) / run);           // 1 at the bottom of the screen → 0 in place
      const leaving = i < st.n - 1 ? clamp01((st.vh - artBottom) / run) : 0; // 0 → 1 as its end rises
      let dx = 0;
      let dy = 0;
      if (arriving > 0) {
        dx = -(SNAP_X + arriving * IN_X);
        dy = -(SNAP_Y + arriving * IN_Y * hh);
      } else if (leaving > 0) {
        dx = leaving * OUT_X;
        dy = leaving * OUT_Y * hh;
      }
      // .ho-lock: in register. The class carries the snap (a short, hard
      // transition); while a plate is tracking the scroll it has none.
      toggle(head, 'ho-lock', arriving === 0 && leaving === 0);
      setVar(head, '--ho-dx', `${dx.toFixed(1)}px`);
      setVar(head, '--ho-dy', `${dy.toFixed(1)}px`);
    }
  },

  unmount(st) {
    st.heads.forEach((h) => {
      h.classList.remove('ho-lock');
      ['--hw', '--hh', '--ho-dx', '--ho-dy'].forEach((p) => h.style.removeProperty(p));
      Array.from(h.children).forEach((c) => ['--ex', '--ey'].forEach((p) => c.style.removeProperty(p)));
    });
  },
};
