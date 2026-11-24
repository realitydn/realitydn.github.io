import { prefersReducedMotion } from '../../hooks/motion';

// fold.js — opening and closing an <Expand> (a <details class="dk-ex">).
//
// THE ONE MOTION (24.11.26). The panel's lower edge is a hard ink line. It
// travels down and uncovers the content, which does not move, then rests at
// the end of the panel; closing, it travels back up. Height only: nothing
// fades, nothing overshoots, nothing arrives from anywhere. A glide out
// (--ease-out), a quicker settle back (--ease-snap).
//
// The content is always in the page: a closed <details> keeps its children in
// the DOM and in the prerendered HTML, and opens natively with no JavaScript.
// This file only adds the travel, and under reduced motion it adds nothing:
// the panel is simply open or shut.

const EASE_OPEN = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_CLOSE = 'cubic-bezier(0.3, 0, 0.2, 1)';
// Longer panels take a little longer, within limits.
const openMs = (px) => Math.round(Math.min(560, 280 + px * 0.14));
const closeMs = (px) => Math.round(Math.min(360, 200 + px * 0.08));

const running = new WeakMap();
const bodyOf = (d) => d.querySelector(':scope > .dk-ex-b');

// setFold(details, true | false, { animate })
export function setFold(d, open, { animate = true } = {}) {
  if (!d || d.tagName !== 'DETAILS') return;
  const b = bodyOf(d);
  const prev = running.get(d);
  if (!prev && d.open === open) return;

  // Where the edge is now, if it was caught mid-travel.
  const caught = prev && b ? b.getBoundingClientRect().height : null;
  if (prev) {
    running.delete(d);
    prev.cancel();
  }

  if (!animate || !b || typeof b.animate !== 'function' || prefersReducedMotion()) {
    d.classList.remove('is-moving', 'is-closing');
    d.open = open;
    return;
  }

  d.open = true; // laid out for both directions
  const full = b.offsetHeight;
  const from = caught != null ? caught : open ? 0 : full;
  const to = open ? full : 0;
  d.classList.add('is-moving');
  d.classList.toggle('is-closing', !open);
  const dist = Math.abs(to - from);
  const anim = b.animate(
    [{ height: `${from}px` }, { height: `${to}px` }],
    { duration: open ? openMs(dist) : closeMs(dist), easing: open ? EASE_OPEN : EASE_CLOSE }
  );
  running.set(d, anim);
  anim.onfinish = () => {
    if (running.get(d) !== anim) return;
    running.delete(d);
    d.classList.remove('is-moving', 'is-closing');
    if (!open) d.open = false;
  };
}

export const isFoldOpen = (d) => !!d && d.open && !d.classList.contains('is-closing');

// reveal(el) — make sure `el` can be seen: open every closed fold it sits in
// (and `el` itself, when it is one). Instant: this runs just before a jump to
// an anchor, and the landing has to be measured against the open page.
// Returns true when something was opened.
export function reveal(el) {
  let opened = false;
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.tagName === 'DETAILS' && n.classList.contains('dk-ex') && !isFoldOpen(n)) {
      setFold(n, true, { animate: false });
      opened = true;
    }
  }
  return opened;
}
