// The stage — what every hand-off stands on. DEV ONLY (see mode.js).
//
// It knows the opened cards (the .dk-sec sections), measures them, and once a
// frame while the page scrolls tells the option being tried where each card
// NATURALLY is. "Naturally" matters: three of the options hold a card still
// with position: sticky, and a held card's own rectangle then says where it is
// held, not where it belongs. So the stage works every position out from the
// one thing that never sticks (the .dk-secs wrapper) plus the cards' heights.
//
//   st.top[i]   viewport y of card i's SECTION top, as if nothing were held
//   st.H[i]     its section height        st.artH[i]  its ticket's height
//   st.headH[i] its header's height       st.vh / st.strip / st.padTop / st.px
//
// An option is a plain object:
//   key      its name (the ?handoff= value)
//   head     true → the card's header rides under the strip while it is read
//   pins     true → it holds cards still, so anchors + focus need the stage's help
//   mount(st) / measure(st) / frame(st) / unmount(st)     all optional
//
// Scroll is read in one requestAnimationFrame per frame; an option's frame()
// only sets classes and custom properties (transform / clip-path), never layout.

const USER_INTENT = ['wheel', 'touchstart', 'keydown', 'pointerdown'];

export function createStage(mode = {}) {
  const html = document.documentElement;
  const secsEl = document.querySelector('.dk-secs');
  if (!secsEl) return null;
  const hand = document.querySelector('.dk-hand');
  const secs = Array.from(secsEl.children).filter((el) => el.classList.contains('dk-sec'));
  if (!secs.length) return null;
  const arts = secs.map((s) => s.querySelector('.dk-open'));
  const heads = secs.map((s) => s.querySelector('.dk-oh'));
  const active = !!mode.key;

  const st = {
    mode, html, secsEl, hand, secs, arts, heads, n: secs.length,
    vh: 0, strip: 0, padTop: 0, padBottom: 0, px: 0, gut: 0,
    H: [], artH: [], headH: [], off: [], top: [],
  };

  const px = (v) => parseFloat(v) || 0;

  st.measure = () => {
    st.vh = window.innerHeight;
    st.strip = hand && getComputedStyle(hand).display !== 'none' ? hand.offsetHeight : 0;
    const cs = getComputedStyle(secs[0]);
    st.padTop = px(cs.paddingTop);
    st.padBottom = px(cs.paddingBottom);
    st.gut = px(cs.paddingLeft);
    st.px = px(cs.getPropertyValue('--dk-px'));
    secs.forEach((s, i) => {
      st.artH[i] = arts[i].offsetHeight;
      st.headH[i] = heads[i].offsetHeight;
    });
    if (active) {
      html.style.setProperty('--ho-vh', `${st.vh}px`);
      html.style.setProperty('--ho-strip', `${st.strip}px`);
      html.style.setProperty('--ho-pad', `${st.padTop}px`);
      html.style.setProperty('--ho-padb', `${st.padBottom}px`);
      html.style.setProperty('--ho-gut', `${st.gut}px`);
      secs.forEach((s, i) => s.style.setProperty('--ho-hh', `${st.headH[i]}px`));
      // The option's own sizes may change a section's height (a held plate,
      // say), so it measures before the heights are read.
      if (mode.measure) mode.measure(st);
    }
    let off = 0;
    secs.forEach((s, i) => {
      st.H[i] = s.offsetHeight;
      st.off[i] = off;
      off += st.H[i] + px(getComputedStyle(s).marginBottom);
      if (active) s.style.setProperty('--ho-h', `${st.H[i]}px`);
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

  // Which card the reading line (just under the strip) is in, and how far
  // through it: what the switch stores so a reload lands in the same place.
  st.place = () => {
    st.measure();
    st.read();
    const y = st.strip + 2;
    for (let i = 0; i < st.n; i++) {
      if (st.top[i] <= y && y < st.top[i] + st.H[i]) return { id: secs[i].id, f: (y - st.top[i]) / st.H[i] };
    }
    return { y: window.scrollY };
  };
  st.goTo = (spot) => {
    if (!spot) return;
    st.measure();
    st.read();
    let top = spot.y;
    if (spot.id) {
      const i = secs.findIndex((s) => s.id === spot.id);
      if (i < 0) return;
      top = window.scrollY + st.top[i] + spot.f * st.H[i] - (st.strip + 2);
    }
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  };

  if (!active) return st;

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
      if (i === cur) a.setAttribute('data-ho-cur', '');
      else a.removeAttribute('data-ho-cur');
    });
  };

  let raf = 0;
  const tick = () => {
    raf = 0;
    st.read();
    if (mode.frame) mode.frame(st);
    if (mode.pins) markCurrent();
  };
  st.kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  let mq = 0;
  const remeasure = () => {
    if (mq) return;
    mq = requestAnimationFrame(() => { mq = 0; st.measure(); tick(); });
  };
  window.addEventListener('scroll', st.kick, { passive: true });
  window.addEventListener('resize', remeasure);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(remeasure) : null;
  if (ro) arts.forEach((a) => ro.observe(a));

  // ── anchors + focus, for the options that hold cards still ──
  // A held card's rectangle is where it is held, so the browser's own "scroll
  // this into view" lands in the wrong place. While such an option runs, the
  // jump is worked out from the natural position instead. Everything that
  // lands on an anchor goes through here: the strip, the mobile menu, the
  // hero buttons, useHashLanding (deep links such as /#proposal), the panel
  // and form scrolls inside the cards.
  const cleanups = [];
  if (mode.pins) {
    const native = Element.prototype.scrollIntoView;
    const patched = function scrollIntoView(arg) {
      if (!this.closest || !this.closest('.dk-secs')) return native.call(this, arg);
      const opt = arg && typeof arg === 'object' ? arg : {};
      const block = opt.block || (arg === false ? 'end' : 'start');
      const y = st.naturalY(this);
      const h = this.getBoundingClientRect().height;
      const margin = px(getComputedStyle(this).scrollMarginTop);
      const floor = st.vh - 24;
      let delta;
      if (block === 'center') delta = y - Math.max(margin, (st.vh - h) / 2);
      else if (block === 'end') delta = y + h - floor;
      else if (block === 'nearest') {
        if (y >= margin && y + h <= floor) return undefined;
        delta = y < margin || h > floor - margin ? y - margin : y + h - floor;
      } else delta = y - margin;
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

    // Keyboard focus moving into a card that is held out of sight: bring its
    // natural position on screen (the browser thinks it already is).
    let byKey = false;
    const onKey = (e) => { if (e.key === 'Tab') byKey = true; };
    const onPointer = () => { byKey = false; };
    const onFocus = (e) => {
      if (!byKey || !secsEl.contains(e.target)) return;
      const y = st.naturalY(e.target);
      const sec = e.target.closest('.dk-sec');
      const lid = st.strip + (mode.head && sec ? st.headH[secs.indexOf(sec)] : 0);
      if (y < lid + 8 || y > st.vh - 72) {
        window.scrollTo({ top: window.scrollY + y - (lid + 32), behavior: 'instant' });
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('focusin', onFocus);
    cleanups.push(() => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('focusin', onFocus);
    });
  }

  // Has the visitor started scrolling on their own? (Then nothing re-lands.)
  st.touched = false;
  const touch = () => { st.touched = true; };
  USER_INTENT.forEach((e) => window.addEventListener(e, touch, { passive: true }));

  st.start = () => {
    html.setAttribute('data-handoff', mode.key);
    if (mode.head) html.setAttribute('data-ho-head', '');
    if (mode.pins) html.setAttribute('data-ho-pins', '');
    if (mode.mount) mode.mount(st);
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
    if (mode.unmount) mode.unmount(st);
    tabs.forEach((a) => a.removeAttribute('data-ho-cur'));
    ['data-handoff', 'data-ho-head', 'data-ho-pins'].forEach((a) => html.removeAttribute(a));
    ['--ho-vh', '--ho-strip', '--ho-pad', '--ho-padb', '--ho-gut'].forEach((p) => html.style.removeProperty(p));
    secs.forEach((s) => {
      ['--ho-h', '--ho-hh'].forEach((p) => s.style.removeProperty(p));
    });
  };

  return st;
}

// Small helpers the options share.
export function toggle(el, cls, on) {
  if (el.classList.contains(cls) !== on) { el.classList.toggle(cls, on); return true; }
  return false;
}
export function setVar(el, name, value) {
  if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
}
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
