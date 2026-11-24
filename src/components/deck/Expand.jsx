import React from 'react';
import { setFold, isFoldOpen } from './fold';

// Expand — the one fold on the deck page. A bar you tap; what it holds opens
// under it (fold.js has the motion). Used wherever a card keeps the long
// version of itself out of the way: all events, the full menu and each of its
// chapters, more figures, the welcome text, the rules.
//
// It is a real <details>/<summary>, left to the browser:
//   - the content is ALWAYS in the DOM and in the prerendered HTML, so
//     crawlers, find-in-page and visitors with no JavaScript get all of it;
//   - keyboard (Enter / Space), the expanded state for a screen reader and the
//     focus plate come with the element;
//   - React never sets `open`: the element owns its state, so a re-render
//     (the feed arriving, the clock ticking) can't shut a panel someone opened.
//
//   id      the anchor. A link to it, or to anything inside it, opens it
//           (hooks/useHashLanding.js)
//   label   the words on the bar. Plain: "Full menu", "All events"
//   meta    a short fact at the right of the bar ("6 sections")
//   mark    a colour for the square ahead of the label (menu chapters)
//   as      'h3' | 'h4' to make the label a heading in the page outline
//   sub     a fold inside a fold: lighter bar, stacks flush with its siblings
//   close   words for a second way to shut it at the END of a long panel
//           (it also brings the bar back into view)
export default function Expand({ id, label, meta, mark, as: Tag = 'span', sub = false, close, className = '', children }) {
  const onBar = (e) => {
    // Modified clicks and the keyboard both arrive here as `click`.
    e.preventDefault();
    const d = e.currentTarget.parentElement;
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
    <details id={id} className={`dk-ex${sub ? ' dk-ex-sub' : ''}${className ? ` ${className}` : ''}`}>
      <summary className="dk-ex-s" onClick={onBar}>
        {mark ? <i className="dk-ex-mark" style={{ background: mark }} aria-hidden="true" /> : null}
        <Tag className="dk-ex-l">{label}</Tag>
        {meta ? <span className="dk-ex-m">{meta}</span> : null}
        <span className="dk-ex-pm" aria-hidden="true" />
      </summary>
      <div className="dk-ex-b">
        <div className="dk-ex-in">
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
