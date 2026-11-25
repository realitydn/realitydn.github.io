import React, { useLayoutEffect, useRef } from 'react';
import { setFold, isFoldOpen } from './fold';
import { isStill } from './parts';
import { WIDE } from './wide';

// Expand — the one fold on the deck page. A bar you tap; what it holds opens
// under it (fold.js has the motion). Used wherever a card keeps the long
// version of itself out of the way: each chapter of the menu, more figures,
// "Can I just join in?", the rules.
//
// It is a real <details>/<summary>, left to the browser:
//   - the content is ALWAYS in the DOM and in the prerendered HTML, so
//     crawlers, find-in-page and visitors with no JavaScript get all of it;
//   - keyboard (Enter / Space), the expanded state for a screen reader and the
//     focus plate come with the element;
//   - React never sets `open`: the element owns its state, so a re-render
//     (the feed arriving, the clock ticking) can't shut a panel someone opened.
//
//   id        the anchor. A link to it, or to anything inside it, opens it
//             (hooks/useHashLanding.js)
//   label     the words on the bar. Plain: "More figures"
//   meta      a short fact at the right of the bar ("6 sections")
//   mark      a colour for the square ahead of the label (menu chapters)
//   as        'h3' | 'h4' to make the label a heading in the page outline
//   sub       a row in a stack of folds: lighter bar, flush with its siblings
//   close     words for a second way to shut it at the END of a long panel
//             (it also brings the bar back into view)
//   flatFrom  'm' | 'l' | 'tall' (wide.js): from that screen size up this is NOT a
//             fold. The bar goes and the content is laid out in the card.
//             Below that size, and with no JavaScript, it is a fold as usual.
//   heading   with flatFrom: keep the label as a heading over the content
//             when the bar is gone
export default function Expand({
  id, label, meta, mark, as: Tag = 'span', sub = false, close, className = '',
  flatFrom = null, heading = false, children,
}) {
  const ref = useRef(null);

  // Before the first paint, so a wide screen never sees the bar it won't have.
  useLayoutEffect(() => {
    const d = ref.current;
    if (!flatFrom || !d || isStill() || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(WIDE[flatFrom]);
    const sync = () => {
      if (mq.matches) {
        setFold(d, true, { animate: false });
        d.classList.add('is-flat');
      } else if (d.classList.contains('is-flat')) {
        d.classList.remove('is-flat');
        setFold(d, false, { animate: false });
      }
    };
    sync();
    mq.addEventListener('change', sync);
    return () => {
      mq.removeEventListener('change', sync);
      d.classList.remove('is-flat');
    };
  }, [flatFrom]);

  const onBar = (e) => {
    // Modified clicks and the keyboard both arrive here as `click`.
    e.preventDefault();
    const d = e.currentTarget.parentElement;
    if (d.classList.contains('is-flat')) return;
    setFold(d, !isFoldOpen(d));
  };
  const onClose = (e) => {
    const d = e.currentTarget.closest('details');
    const bar = d.querySelector(':scope > summary');
    // Shut it where it stands and put the bar where the reader is looking:
    // travelling a screen-tall panel shut under their thumb is not a kindness.
    setFold(d, false, { animate: false });
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    bar.scrollIntoView({ block: 'center' });
    root.style.scrollBehavior = prev;
    bar.focus({ preventScroll: true });
  };
  return (
    <details ref={ref} id={id} className={`dk-ex${sub ? ' dk-ex-sub' : ''}${className ? ` ${className}` : ''}`}>
      <summary className="dk-ex-s" onClick={onBar}>
        {mark ? <i className="dk-ex-mark" style={{ background: mark }} aria-hidden="true" /> : null}
        <Tag className="dk-ex-l">{label}</Tag>
        {meta ? <span className="dk-ex-m">{meta}</span> : null}
        <span className="dk-ex-pm" aria-hidden="true" />
      </summary>
      <div className="dk-ex-b">
        <div className="dk-ex-in">
          {/* Shown only when the bar is gone (.is-flat): never both. */}
          {flatFrom && heading ? <h3 className="dk-ex-h">{label}</h3> : null}
          {children}
          {close ? (
            <p className="dk-ex-end">
              <button type="button" className="dk-ex-x" onClick={onClose}>
                <span className="dk-ex-pm" aria-hidden="true" />
                {close}
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </details>
  );
}
