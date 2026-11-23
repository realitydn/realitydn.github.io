// 3 · HAND-ME-DOWN. Every opened card's hard offset print is in the colour of
// the card BEFORE it (the first card keeps the neutral print). So at rest the
// page already says which card came before which.
//
// IN MOTION: when a card leaves, its colour stays on the paper. As its end
// rises up the screen, a flat field of its colour is left behind where the
// card was, and the next card comes up and lands on top of that field. What
// is left showing round the new card's edge is its print.
//
// ON THE REAL (TALL) CARDS this needs no adapting: the field is one screen
// tall, it is uncovered by the old card's last screen and covered by the new
// card's first, and the long middles scroll as they do now.
//
// HOW: the field is a block at the very end of the old card's section
// (handmedown.css), held on screen by position: sticky. The browser moves it,
// in step with the scroll, so there is no per-frame script here at all: this
// file only says which colour each card inherits and how tall each field is.
import './handmedown.css';

// A card lands with its section's top 50px down the screen (deck.css,
// scroll-margin-top). The field is held where the next card will land.
const LAND = 50;

function inherit(st) {
  st.secs.forEach((s, i) => {
    const prev = i > 0 ? Array.from(st.secs[i - 1].classList).find((c) => c.startsWith('k-')) : null;
    if (prev) s.setAttribute('data-ho-prev', prev.slice(2));
    if (i < st.n - 1) s.setAttribute('data-ho-field', '');
  });
}

export default {
  key: 'handmedown',

  mount: inherit,

  measure(st) {
    const place = LAND + st.padTop; // where a card's top edge lands
    st.html.style.setProperty('--ho-land', `${place}px`);
    // The field is as tall as the screen below the landing place, but never
    // taller than the card that will land on it.
    const room = st.vh - place - st.px;
    st.secs.forEach((s, i) => {
      if (i < st.n - 1) s.style.setProperty('--ho-fh', `${Math.max(0, Math.min(room, st.artH[i + 1]))}px`);
    });
  },

  // Reduced motion: no field, nothing held. The inherited print stays, since
  // it is a colour, not a movement.
  still(st) {
    st.html.setAttribute('data-handoff-still', 'handmedown');
    inherit(st);
    st.secs.forEach((s) => s.removeAttribute('data-ho-field'));
  },
  unstill(st) {
    st.html.removeAttribute('data-handoff-still');
    st.secs.forEach((s) => s.removeAttribute('data-ho-prev'));
  },

  unmount(st) {
    st.html.style.removeProperty('--ho-land');
    st.secs.forEach((s) => {
      s.removeAttribute('data-ho-prev');
      s.removeAttribute('data-ho-field');
      s.style.removeProperty('--ho-fh');
    });
  },
};
