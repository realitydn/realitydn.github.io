// THE SEAM — how one opened card gives way to the next as the page scrolls.
// (Donald's pick of the five hand-offs tried on 24.11.26; the other four are
// in git history on the branch claude/deck-handoffs.)
//
// The card's frame stays put on the screen, and a hard horizontal line
// travels up through it as you scroll. Above the line is the card leaving,
// below it the card arriving. Neither card's body moves while the line
// crosses it.
//
// THE BANNER RIDES THE LINE. The arriving card's banner (its number, title
// and live figure) sits just under the line and comes up with it from the
// foot of the frame. When the line reaches the top of the frame the banner
// locks under the strip, and stays there while its card is read. Scrolling
// back up it runs in reverse: the banner comes off the top and travels down
// with the line.
//
// ON THE REAL (TALL) CARDS: only a card's FIRST and LAST screen are crossed
// by a line. In between, the card scrolls inside the frame.
//   leaving   when its end reaches the bottom of the frame it stops there
//   arriving  the next card's body is already in place behind it
//   the line  is where the next card's top edge WOULD be if the page were
//             simply scrolling, so it moves exactly with the scroll
// No scroll distance is added or taken away by the hold itself.
//
// HOW: every card near the screen is held by position: sticky between two
// limits (its end no higher than the frame's bottom, its top no lower than
// the frame's top), which the browser does in step with the scroll. This file
// then shows each card ONLY inside the stretch of screen it would naturally
// occupy (clip-path), moves the arriving banner down to the line (transform),
// and draws the line where two stretches meet.
//
// ROOM UNDER A FOLD BAR. A fold bar (Expand.jsx) is usually the last thing in
// its card, and a card's last screen is the one the next card's line crosses
// from the bottom up: the bar would be covered almost as soon as it came on
// screen. So a card taller than the frame whose lowest bar is near its end
// gets blank paper under that bar (TAIL of the frame's height). The bar then
// comes to rest that far up the frame, and the line has that far to travel
// before it reaches it. A card no taller than the frame needs none: it never
// scrolls, so everything on it shows from the moment the line passes it.
// Scripted landings (stage.js) keep a card at rest for the same reason.
import './seam.css';
import { setVar } from './stage';

const TAIL = 0.3;                 // of the frame's height
const TAIL_MIN = 180;
const TAIL_MAX = 260;

// The fold bars showing on a card right now (a bar inside a shut fold is not).
const barsOf = (body) => Array.from(body.querySelectorAll('details.dk-ex > summary'))
  .filter((s) => !s.parentElement.parentElement.closest('details:not([open])'));

export default {
  mount(st) {
    const ui = document.createElement('div');
    ui.className = 'seam-ui';
    ui.setAttribute('aria-hidden', 'true');
    const floor = document.createElement('div');
    floor.className = 'seam-floor';
    ui.appendChild(floor);
    const lines = st.secs.map((s, i) => {
      if (i === 0) return null; // the first card simply scrolls on, after the hero
      const ln = document.createElement('div');
      ln.className = 'seam-ln';
      ln.hidden = true;
      return ui.appendChild(ln);
    });
    document.body.appendChild(ui);
    st.seam = { ui, floor, lines, live: [], rect: [], ride: [], foot: -2 };
    st.colours = st.secs.map((s) => Array.from(s.classList).find((c) => c.startsWith('k-')) || '');
  },

  measure(st) {
    // The frame's sides are the card's own sides.
    const r = st.arts[0].getBoundingClientRect();
    st.seam.ui.style.setProperty('--seam-fl', `${r.left}px`);
    st.seam.ui.style.setProperty('--seam-fw', `${r.width}px`);
    st.m = parseFloat(getComputedStyle(st.html).getPropertyValue('--seam-m')) || 16;

    // Room under the lowest fold bar (see the note at the top).
    const frame = st.vh - st.strip - st.m;
    const want = Math.max(TAIL_MIN, Math.min(TAIL_MAX, Math.round(frame * TAIL)));
    st.secs.forEach((sec, i) => {
      const body = st.bodies[i];
      let tail = 0;
      // the card's height without the tail and without its fill-the-frame minimum
      const own = st.headH[i] + body.offsetHeight + 4;
      // (the first card always counts: it scrolls on after the hero, no line
      // uncovers it. Where the tail fits inside the fill-the-frame minimum it
      // adds no height.)
      if (i === 0 || own > frame + 1) {
        const end = body.getBoundingClientRect().bottom;
        let lowest = -Infinity;
        barsOf(body).forEach((s) => { lowest = Math.max(lowest, s.getBoundingClientRect().bottom); });
        if (lowest > -Infinity) tail = Math.max(0, Math.round(want - (end - lowest)));
      }
      setVar(sec, '--seam-tail', `${tail}px`);
    });
  },

  frame(st) {
    const s = st.seam;
    const place = st.strip;          // the frame's top: under the strip
    const floor = st.vh - st.m;      // the frame's bottom
    // 1 · read where the held cards really are (before anything is written)
    for (let i = 0; i < st.n; i++) s.rect[i] = s.live[i] ? st.secs[i].getBoundingClientRect().top : 0;
    // 2 · write
    let again = false;
    let foot = -1;
    for (let i = 0; i < st.n; i++) {
      const sec = st.secs[i];
      const top = st.top[i];
      const H = st.H[i];
      let ride = 0;
      // Held only while near the screen: a far-off card is left where the flow puts it.
      const live = top + H > -st.vh && top < 2 * st.vh;
      if (live !== !!s.live[i]) {
        s.live[i] = live;
        sec.classList.toggle('seam-live', live);
        sec.style.removeProperty('--seam-clip'); // newly held: hidden until its rectangle has been read
        again = live || again;
      } else if (live) {
        // Show it only where it would naturally be.
        const up = Math.max(0, top - s.rect[i]);   // held ABOVE its natural place → hide its top
        const down = Math.max(0, s.rect[i] - top); // held BELOW it → hide its end
        const clip = up >= H || down >= H ? 'inset(100% 0 0 0)' : `inset(${up.toFixed(1)}px 0 ${down.toFixed(1)}px 0)`;
        setVar(sec, '--seam-clip', clip);
        // The banner rides the line: moved down from the card's (held) top to
        // where that top naturally is.
        if (up > 0.5 && up < st.vh) ride = up;
      }
      if (ride !== (s.ride[i] || 0)) {
        s.ride[i] = ride;
        st.heads[i].style.transform = ride ? `translate3d(0, ${ride.toFixed(1)}px, 0)` : '';
      }
      if (top < floor && top + H >= floor) foot = i;
      // The line: this card's natural top edge, while it is inside the frame.
      const ln = s.lines[i];
      if (ln) {
        const show = top > place - 2 && top < floor;
        if (ln.hidden === show) ln.hidden = !show;
        if (show) ln.style.transform = `translate3d(0, ${(top - 2).toFixed(1)}px, 0)`;
      }
    }
    // The frame's bottom print takes the colour of the card at its foot.
    if (foot !== s.foot) {
      s.foot = foot;
      s.floor.className = `seam-floor ${foot >= 0 ? st.colours[foot] : ''}`;
      s.floor.hidden = foot < 0; // no card at the foot (the hero, the footer): no frame
    }
    if (again) st.kick();
  },

  unmount(st) {
    if (st.seam) st.seam.ui.remove();
    st.secs.forEach((sec, i) => {
      sec.classList.remove('seam-live');
      sec.style.removeProperty('--seam-clip');
      sec.style.removeProperty('--seam-tail');
      st.heads[i].style.transform = '';
    });
  },
};
