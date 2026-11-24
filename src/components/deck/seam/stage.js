// The stage — what the seam (./seam.js) stands on.
//
// It knows the opened cards (the .dk-sec sections), measures them, and once a
// frame while the page scrolls says where each card NATURALLY is. "Naturally"
// matters: the seam holds cards still with position: sticky, and a held card's
// own rectangle then says where it is held, not where it belongs. So the stage
// works every position out from the one thing that never sticks (the .dk-secs
// wrapper) plus the cards' heights.
//
//   st.top[i]   viewport y of card i's top, as if nothing were held
//   st.H[i]     its height                  st.headH[i]  its banner's height
//   st.vh / st.strip                        the screen, and the strip's height
//
// It also keeps everything that lands on an anchor honest while cards are
// held (see "anchors + focus" below).
//
// Scroll is read in one requestAnimationFrame per frame; the seam's frame()
// only sets classes and custom properties (transform / clip-path), never layout.

// (click as well: assistive tech can activate a link with no pointer or key event)
const USER_INTENT = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'click'];
const px = (v) => parseFloat(v) || 0;

export function createStage(seam) {
  const html = document.documentElement;
  const secsEl = document.querySelector('.dk-secs');
  if (!secsEl) return null;
  const hand = document.querySelector('.dk-hand');
  const secs = Array.from(secsEl.children).filter((el) => el.classList.contains('dk-sec'));
  if (!secs.length) return null;
  const arts = secs.map((s) => s.querySelector('.dk-open'));
  const heads = secs.map((s) => s.querySelector('.dk-oh'));
  const bodies = secs.map((s) => s.querySelector('.dk-ob'));

  const st = {
    html, secsEl, hand, secs, arts, heads, bodies, n: secs.length,
    vh: 0, strip: 0,
    H: [], headH: [], off: [], top: [],
    touched: false, // has the visitor started scrolling on their own?
    onMeasure: null, // called after a height on the page has changed
  };

  st.measure = () => {
    st.vh = window.innerHeight;
    st.strip = hand && getComputedStyle(hand).display !== 'none' ? hand.offsetHeight : 0;
    html.style.setProperty('--seam-vh', `${st.vh}px`);
    html.style.setProperty('--seam-strip', `${st.strip}px`);
    secs.forEach((s, i) => {
      st.headH[i] = heads[i].offsetHeight;
      s.style.setProperty('--seam-hh', `${st.headH[i]}px`);
    });
    // The seam's own sizes change a card's height (the room it leaves under a
    // fold bar), so it measures before the heights are read.
    seam.measure(st);
    let off = 0;
    secs.forEach((s, i) => {
      st.H[i] = s.offsetHeight;
      st.off[i] = off;
      off += st.H[i] + px(getComputedStyle(s).marginBottom);
      s.style.setProperty('--seam-h', `${st.H[i]}px`);
    });
  };

  st.read = () => {
    const base = secsEl.getBoundingClientRect().top;
    for (let i = 0; i < st.n; i++) st.top[i] = base + st.off[i];
  };

  // Where an element would be on screen if nothing were held.
  st.naturalY = (el) => {
    const sec = el.closest ? el.closest('.dk-sec') : null;
    const i = sec ? secs.indexOf(sec) : -1;
    if (i < 0) return el.getBoundingClientRect().top;
    st.read();
    return st.top[i] + (el.getBoundingClientRect().top - sec.getBoundingClientRect().top);
  };

  // ── the frame loop ──
  // The strip's "you are here" mark, from natural positions (the strip's own
  // scroll-spy reads rectangles, which are wrong while cards are held). Same
  // reading line as DeckHand: 30% down the screen.
  const tabs = hand ? Array.from(hand.querySelectorAll('.dk-hand-a')) : [];
  let marked = -2;
  const markCurrent = () => {
    const y = st.vh * 0.3;
    let cur = -1;
    for (let i = 0; i < st.n; i++) if (st.top[i] <= y && y < st.top[i] + st.H[i]) cur = i;
    if (cur === marked) return;
    marked = cur;
    tabs.forEach((a, i) => {
      if (i === cur) a.setAttribute('data-seam-cur', '');
      else a.removeAttribute('data-seam-cur');
    });
  };

  let raf = 0;
  const tick = () => {
    raf = 0;
    st.read();
    seam.frame(st);
    markCurrent();
  };
  st.kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  let mq = 0;
  const remeasure = () => {
    if (mq) return;
    mq = requestAnimationFrame(() => { mq = 0; st.measure(); tick(); if (st.onMeasure) st.onMeasure(); });
  };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(remeasure) : null;

  // ── anchors + focus ──
  // A held card's rectangle is where it is held, so the browser's own "scroll
  // this into view" lands in the wrong place. While the seam runs, the jump
  // is worked out from the natural position instead. Everything that lands on
  // an anchor goes through here: the strip, the mobile menu, the hero cards,
  // useHashLanding (deep links such as /#proposal), the panel and form
  // scrolls inside the cards, a fold's close button.
  const cleanups = [];
  const helpLandings = () => {
    const native = Element.prototype.scrollIntoView;
    const patched = function scrollIntoView(arg) {
      if (!this.closest || !this.closest('.dk-secs')) return native.call(this, arg);
      const opt = arg && typeof arg === 'object' ? arg : {};
      const block = opt.block || (arg === false ? 'end' : 'start');
      const sec = this.closest('.dk-sec');
      const i = sec ? secs.indexOf(sec) : -1;
      // Whatever led here may have just changed a height (a fold opened, the
      // feed arrived): measure now, not on the next frame.
      st.measure();
      const y = st.naturalY(this); // (reads the natural tops)
      const h = this.getBoundingClientRect().height;
      // Clear of the strip, and of the card's banner for anything in its body.
      let margin = px(getComputedStyle(this).scrollMarginTop);
      if (i >= 0 && this.closest('.dk-ob')) margin = Math.max(margin, st.strip + st.headH[i] + 8);
      const floor = st.vh - 24;
      // The card is "at rest" from the moment its top reaches the frame's top
      // until its end reaches the frame's bottom. Outside that a line is
      // crossing it, and part of it is under another card.
      const frameTop = st.strip;
      const frameEnd = st.vh - (st.m || 16);
      const T = i >= 0 ? st.top[i] : 0;
      const least = T - frameTop;                  // scroll at least this far: the card has arrived
      // …and no further than this: it has not begun to leave. (Nothing comes
      // over the last card, so it has no such limit.)
      const most = i === st.n - 1 ? Infinity : T - (frameEnd - st.H[i]);
      const atRest = i < 0 || (least <= 1 && most >= -1);
      let delta;
      if (block === 'center') delta = y - Math.max(margin, (st.vh - h) / 2);
      else if (block === 'end') delta = y + h - floor;
      else if (block === 'nearest') {
        if (atRest && y >= margin && y + h <= floor) return undefined;
        delta = y < margin || h > floor - margin ? y - margin : y + h - floor;
      } else delta = y - margin;
      // Land with the card at rest wherever that is possible, so the target
      // is never under the card before or the card after.
      if (i >= 0) delta = most >= least ? Math.min(most, Math.max(least, delta)) : least;
      const to = { top: window.scrollY + delta };
      if (opt.behavior) to.behavior = opt.behavior;
      window.scrollTo(to);
      return undefined;
    };
    Element.prototype.scrollIntoView = patched;
    cleanups.push(() => {
      if (Element.prototype.scrollIntoView === patched) Element.prototype.scrollIntoView = native;
    });

    // A click on an in-page link, or the address bar's hash changing: let the
    // browser do its jump (the app listens for it), then correct it before
    // the next paint.
    const fix = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      const el = id ? document.getElementById(id) : null;
      if (el && secsEl.contains(el)) el.scrollIntoView({ block: 'start' });
    };
    const onClick = (e) => {
      const a = e.target.closest ? e.target.closest('a[href*="#"]') : null;
      if (!a || a.origin !== window.location.origin || a.pathname !== window.location.pathname) return;
      requestAnimationFrame(fix);
    };
    const onHash = () => requestAnimationFrame(fix);
    document.addEventListener('click', onClick);
    window.addEventListener('hashchange', onHash);
    cleanups.push(() => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('hashchange', onHash);
    });

    // Keyboard focus landing on something in a HELD card. A held card is only
    // really showing between its natural top and its natural end: past its
    // end the next card is over it, before its top the card before still is,
    // and its own banner covers the top of what is left. The browser cannot
    // know any of that (it sees the held rectangle, and scrolls as if the
    // card would move), so the page is scrolled just far enough to bring the
    // focused thing into the part of its card that is showing: the same
    // landing as above, asked for the nearest edge.
    let byKey = false;
    const onKey = (e) => { if (e.key === 'Tab') byKey = true; };
    const onPointer = () => { byKey = false; };
    const onFocus = (e) => {
      if (!byKey || !secsEl.contains(e.target)) return;
      if (!e.target.closest('.dk-sec')) return;
      patched.call(e.target, { block: 'nearest', behavior: 'instant' });
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('focusin', onFocus);
    cleanups.push(() => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('focusin', onFocus);
    });
  };

  const touch = () => { st.touched = true; };

  st.start = () => {
    html.setAttribute('data-seam', '');
    seam.mount(st);
    window.addEventListener('scroll', st.kick, { passive: true });
    window.addEventListener('resize', remeasure);
    if (ro) arts.forEach((a) => ro.observe(a));
    helpLandings();
    USER_INTENT.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    st.measure();
    tick();
  };

  st.stop = () => {
    cancelAnimationFrame(raf);
    cancelAnimationFrame(mq);
    window.removeEventListener('scroll', st.kick);
    window.removeEventListener('resize', remeasure);
    USER_INTENT.forEach((e) => window.removeEventListener(e, touch));
    if (ro) ro.disconnect();
    cleanups.forEach((fn) => fn());
    seam.unmount(st);
    tabs.forEach((a) => a.removeAttribute('data-seam-cur'));
    html.removeAttribute('data-seam');
    ['--seam-vh', '--seam-strip'].forEach((p) => html.style.removeProperty(p));
    secs.forEach((s) => ['--seam-h', '--seam-hh'].forEach((p) => s.style.removeProperty(p)));
  };

  return st;
}

export function setVar(el, name, value) {
  if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
}
