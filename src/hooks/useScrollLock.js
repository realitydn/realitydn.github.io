import { useEffect } from 'react';

// useScrollLock — one page-scroll lock shared by every overlay (the event
// overlay, the gallery lightbox, anything later).
//
// A COUNTER, not a flag: each overlay used to write body.style.overflow
// itself, so closing one unlocked the page under another still open. Here
// the first lock saves the body's inline styles and the last unlock restores
// them; everything in between just counts.
//
// Scrollbar compensation: hiding overflow removes a desktop scrollbar and
// the whole page (sticky masthead included) would jump sideways by its
// width, so the body takes that width back as padding-right while locked.

let count = 0;
let saved = null;

export function lockScroll() {
  if (typeof document === 'undefined') return;
  count += 1;
  if (count > 1) return;
  const body = document.body;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  body.style.overflow = 'hidden';
  if (gap > 0) {
    const pad = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${pad + gap}px`;
  }
}

export function unlockScroll() {
  if (typeof document === 'undefined' || count === 0) return;
  count -= 1;
  if (count > 0 || !saved) return;
  document.body.style.overflow = saved.overflow;
  document.body.style.paddingRight = saved.paddingRight;
  saved = null;
}

export default function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lockScroll();
    return unlockScroll;
  }, [active]);
}
