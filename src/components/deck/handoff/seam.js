// 7 · SEAM. The card's frame stays put on the screen, and a hard horizontal
// line travels up through it as you scroll: below the line is the card
// arriving, above it the card leaving. Neither card moves while the line
// crosses them.
//
// ON THE REAL (TALL) CARDS: only a card's FIRST and LAST screen are crossed
// by a line. In between, the card scrolls inside the frame as it does now.
//   leaving   when its end reaches the bottom of the frame it stops there
//   arriving  the next card is already in place behind it, under the strip
//   the line  is where the next card's top edge WOULD be if the page were
//             simply scrolling, so it moves exactly with the scroll
// No scroll distance is added or taken away: the page is as long as it was.
// (The one screen a card would have spent sliding out is spent being wiped.)
//
// HOW: every card near the screen is held by position: sticky between two
// limits (its end no higher than the frame's bottom, its top no lower than
// the frame's top), which the browser does in step with the scroll. This file
// then shows each card ONLY inside the stretch of screen it would naturally
// occupy (clip-path), and draws the line where two stretches meet.
import './seam.css';
import { setVar } from './stage';

export default {
  key: 'seam',
  head: true,
  pins: true,

  mount(st) {
    const ui = document.createElement('div');
    ui.className = 'ho-seam';
    ui.setAttribute('aria-hidden', 'true');
    const floor = document.createElement('div');
    floor.className = 'ho-seam-floor';
    ui.appendChild(floor);
    const lines = st.secs.map((s, i) => {
      if (i === 0) return null; // the first card arrives as it does now
      const ln = document.createElement('div');
      ln.className = 'ho-seam-ln';
      ln.hidden = true;
      return ui.appendChild(ln);
    });
    document.body.appendChild(ui);
    st.seam = { ui, floor, lines, live: [], rect: [], foot: -2 };
    st.colours = st.secs.map((s) => Array.from(s.classList).find((c) => c.startsWith('k-')) || '');
  },

  measure(st) {
    // The frame's sides are the card's own sides.
    const r = st.arts[0].getBoundingClientRect();
    st.seam.ui.style.setProperty('--ho-fl', `${r.left}px`);
    st.seam.ui.style.setProperty('--ho-fw', `${r.width}px`);
    st.m = parseFloat(getComputedStyle(st.html).getPropertyValue('--ho-m')) || 16;
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
      // Held only while near the screen: a far-off card is left where the flow puts it.
      const live = top + H > -st.vh && top < 2 * st.vh;
      if (live !== !!s.live[i]) {
        s.live[i] = live;
        sec.classList.toggle('ho-live', live);
        sec.style.removeProperty('--ho-clip'); // newly held: hidden until its rectangle has been read
        again = live || again;
      } else if (live) {
        // Show it only where it would naturally be.
        const up = Math.max(0, top - s.rect[i]);   // held ABOVE its natural place → hide its top
        const down = Math.max(0, s.rect[i] - top); // held BELOW it → hide its end
        const clip = up >= H || down >= H ? 'inset(100% 0 0 0)' : `inset(${up.toFixed(1)}px 0 ${down.toFixed(1)}px 0)`;
        setVar(sec, '--ho-clip', clip);
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
      s.floor.className = `ho-seam-floor ${foot >= 0 ? st.colours[foot] : ''}`;
      s.floor.hidden = foot < 0; // no card at the foot (the hero, the footer): no frame
    }
    if (again) st.kick();
  },

  unmount(st) {
    if (st.seam) st.seam.ui.remove();
    st.secs.forEach((sec) => {
      sec.classList.remove('ho-live');
      sec.style.removeProperty('--ho-clip');
    });
  },
};
