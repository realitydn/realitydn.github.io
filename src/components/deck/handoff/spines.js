// 4 · SPINES. A card that is not open is a thin bar in its colour. The cards
// you have passed are stacked as bars at the top of the screen; the ones
// still to come wait as bars at the bottom. The card being left tucks up into
// its bar as the next one opens out of its own. This REPLACES the strip.
//
// ON THE REAL (TALL) CARDS: the open card is its header (held under the bars
// of the cards before it) plus its body, scrolling between the two stacks.
//   leaving   the body runs out, the header slides up under the stack above
//             until only a bar's height of its colour is left: that is its bar
//   arriving  the next card's bar is the top of the bottom stack; its header
//             comes up from behind that stack and carries the bar away with it
// Nothing is held or resized by script: the headers are position: sticky, the
// two stacks are fixed, and this file only decides which bars each stack shows.
//
// THE BARS AS NAVIGATION, AND THE 48px RULE. Eight bars cannot each be 48px
// tall: that would be 384px of a phone's screen. So:
//   mouse   every bar is a link. It is thin, and grows to show its name when
//           pointed at or focused.
//   touch   a whole stack is ONE target (never less than 48px tall). Tapping
//           either stack opens the list of all nine cards as full 48px rows;
//           tapping a row goes there. The thin bars are never the target.
import './spines.css';
import { toggle } from './stage';

export default {
  key: 'spines',

  mount(st) {
    const tabs = st.hand ? Array.from(st.hand.querySelectorAll('.dk-hand-a')) : [];
    const label = st.hand ? st.hand.getAttribute('aria-label') : 'On this page';
    const no = (i) => String(i + 1).padStart(2, '0');
    const colour = (i) => Array.from(st.secs[i].classList).find((c) => c.startsWith('k-')) || '';
    const name = (i) => (tabs[i] ? tabs[i].textContent.trim() : st.secs[i].id);

    const bar = (i) => {
      const a = document.createElement('a');
      a.className = `ho-sp-bar ${colour(i)}`;
      a.href = `#${st.secs[i].id}`;
      a.hidden = true;
      a.innerHTML = '<span></span><b></b>';
      a.querySelector('span').textContent = no(i);
      a.querySelector('b').textContent = name(i);
      return a;
    };

    const nav = document.createElement('nav');
    nav.className = 'ho-sp';
    nav.setAttribute('aria-label', label);
    const top = document.createElement('div');
    top.className = 'ho-sp-stack ho-sp-top';
    const bot = document.createElement('div');
    bot.className = 'ho-sp-stack ho-sp-bot';
    const topBars = st.secs.map((s, i) => top.appendChild(bar(i)));
    const botBars = st.secs.map((s, i) => bot.appendChild(bar(i)));

    // The fan: all nine as full rows (touch).
    const fan = document.createElement('div');
    fan.className = 'ho-sp-fan';
    fan.hidden = true;
    const rows = st.secs.map((s, i) => {
      const a = bar(i);
      a.className = `ho-sp-row ${colour(i)}`;
      a.hidden = false;
      return fan.appendChild(a);
    });

    nav.append(top, fan, bot);
    document.body.appendChild(nav);
    st.html.style.setProperty('--ho-n', String(st.n));
    st.secs.forEach((s, i) => s.style.setProperty('--ho-i', String(i)));

    const coarse = window.matchMedia('(hover: none), (pointer: coarse)');
    const setFan = (open) => {
      fan.hidden = !open;
      nav.classList.toggle('is-fanned', open);
    };
    const onClick = (e) => {
      if (e.target.closest('.ho-sp-row')) { setFan(false); return; } // a row: go there
      if (!coarse.matches) return;                                   // mouse: the bar is the link
      if (e.target.closest('.ho-sp-stack')) { e.preventDefault(); setFan(fan.hidden); }
    };
    const onOutside = (e) => { if (!nav.contains(e.target)) setFan(false); };
    const onKey = (e) => { if (e.key === 'Escape') setFan(false); };
    nav.addEventListener('click', onClick);
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKey);

    st.sp = { nav, top, bot, fan, topBars, botBars, rows, cur: -2, off: () => {
      nav.removeEventListener('click', onClick);
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onKey);
    } };
  },

  measure(st) {
    // the bar's height comes from the stylesheet (it differs on a phone)
    st.bar = parseFloat(getComputedStyle(st.html).getPropertyValue('--ho-b')) || 12;
  },

  frame(st) {
    const { nav, topBars, botBars, rows } = st.sp;
    const b = st.bar;
    let below = 0;
    let cur = -1;
    for (let i = 0; i < st.n; i++) {
      const artTop = st.top[i] + st.padTop;
      const artBottom = artTop + st.artH[i];
      // PASSED: its end has gone up under its own slot, so its bar is all that is left.
      const passed = artBottom <= (i + 1) * b + 0.5;
      // WAITING: its header has not yet come up past its slot in the bottom stack.
      const waiting = !passed && artTop >= st.vh - (st.n - i) * b - 0.5;
      if (topBars[i].hidden === passed) topBars[i].hidden = !passed;
      if (botBars[i].hidden === waiting) botBars[i].hidden = !waiting;
      if (waiting) below++;
      if (!passed && !waiting && cur < 0) cur = i;
    }
    if (cur !== st.sp.cur) {
      st.sp.cur = cur;
      rows.forEach((r, i) => {
        if (i === cur) r.setAttribute('aria-current', 'true');
        else r.removeAttribute('aria-current');
      });
    }
    // The stacks come on with the cards (not over the hero) and go with them.
    const first = st.top[0];
    const end = st.top[st.n - 1] + st.H[st.n - 1];
    toggle(nav, 'is-on', first < st.vh * 0.8 && end > st.n * b);
    // keep the switch clear of the bottom stack
    st.html.style.setProperty('--ho-sw-lift', `${below * b}px`);
  },

  unmount(st) {
    if (st.sp) { st.sp.off(); st.sp.nav.remove(); }
    st.html.style.removeProperty('--ho-n');
    st.html.style.removeProperty('--ho-sw-lift');
    st.secs.forEach((s) => s.style.removeProperty('--ho-i'));
  },
};
