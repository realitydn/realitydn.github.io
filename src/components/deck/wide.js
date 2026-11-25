import { useEffect, useState } from 'react';
import { isStill } from './parts';

// wide.js — HOW MUCH A CARD SHOWS DEPENDS ON THE SCREEN (25.11.26).
//
// A phone gets the short version of a card, with the rest behind a fold. A
// larger screen has the room, so the same card shows more up front and keeps
// a fold only for what is really long. Three sizes, by the window's width:
//
//   S   up to 760px       a phone: condensed
//   M   761px – 1099px    a tablet, a small laptop window
//   L   1100px and up     a desktop: each card about one screen full
//       (and "tall": L with at least 1000px of height, which has room for
//       one more thing on two of the cards)
//
// Most of this is plain CSS in deck.css (block 11: how many events show,
// and the grids). Two things need a script, and both read this file:
//
//   <Expand flatFrom="m|l">   a fold that is not a fold from that size up:
//                             its content is laid out in the card
//                             (Expand.jsx reads WIDE)
//   useWide('l')              for the one card whose LAYOUT changes, not just
//                             how much of it shows: the menu (MenuSection.jsx)
//
// The static HTML and a visitor with no JavaScript get the S version at every
// width: every fold shut, everything still in the page.
export const WIDE = {
  m: '(min-width: 761px)',
  l: '(min-width: 1100px)',
  // L, on a screen tall enough to take a little more (a 1080p monitor)
  tall: '(min-width: 1100px) and (min-height: 1000px)',
};

const matches = (size) => typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && !isStill()
  && window.matchMedia(WIDE[size]).matches;

// True while the window is at least that size. False in the static capture.
export function useWide(size) {
  const [on, setOn] = useState(() => matches(size));
  useEffect(() => {
    if (isStill() || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(WIDE[size]);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [size]);
  return on;
}
