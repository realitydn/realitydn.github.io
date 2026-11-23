// 1 · OVERPRINT. The next card rises over the one being left, and where they
// overlap the two print over each other like two riso inks. When the next
// card reaches its place it becomes solid and the old one is gone.
//
// ON THE REAL (TALL) CARDS: only the old card's LAST SCREEN takes part. When
// its end reaches the bottom of the screen it stops there (position: sticky),
// and the next card scrolls up over it at the speed of the scroll. Nothing is
// timed: the overlap is exactly how far the page has been scrolled, and it
// runs backwards on the way up.
//
//   .ho-live  the old card, held with its end at the bottom of the screen
//   .ho-wet   the card rising over it, printed (multiply) instead of opaque
//
// Both headers ride under the strip (`head`), so the very last thing that
// happens is the new header's colour landing on the old header's colour:
// blue under yellow reads green, then it snaps solid.
import './overprint.css';
import { toggle } from './stage';

export default {
  key: 'overprint',
  head: true,
  pins: true,

  frame(st) {
    const place = st.strip - st.padTop; // a section's top when its card's header is under the strip
    for (let i = 0; i < st.n; i++) {
      const top = st.top[i];
      const nextTop = i + 1 < st.n ? st.top[i + 1] : Infinity;
      // Rising: on screen, not yet in place. The first card has nothing under it.
      const wet = i > 0 && top < st.vh && top > place + 0.5;
      // Held: from a little before its end reaches the bottom of the screen
      // (sticky does nothing until then) until the next card is in place.
      const live = !wet && nextTop <= st.vh + 400 && nextTop > place + 0.5;
      toggle(st.secs[i], 'ho-wet', wet);
      toggle(st.secs[i], 'ho-live', live);
    }
  },

  unmount(st) {
    st.secs.forEach((s) => s.classList.remove('ho-wet', 'ho-live'));
  },
};
