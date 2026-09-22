import { useCallback, useEffect, useRef } from 'react';
import useScrollLock from './useScrollLock';

// useDialog — the modal contract every overlay on the site shares (the event
// overlay, the gallery lightbox):
//
//   • focus moves INTO the dialog on open (initialFocusRef, else the first
//     focusable, else the container itself) and Tab / Shift+Tab wrap inside
//     it — the page behind is aria-modal, so it must be unreachable too;
//   • Escape closes;
//   • on close, focus returns to whatever had it when the dialog opened
//     (the card or photo that was tapped);
//   • the page scroll is locked through the shared counter (useScrollLock),
//     so two overlays can never unlock each other;
//   • with a historyKey, opening pushes ONE history entry ({ overlay: key },
//     layered over the router's own state so its idx survives) and the
//     phone's back gesture closes the dialog instead of leaving the page.
//
// History, carefully: a close from inside (✕, Escape, scrim) only calls
// history.back() when OUR entry is still on top — the popstate that follows
// does the actual closing, so there is exactly one path to "closed" and no
// double navigation. If our entry is not on top (it was already popped, or
// never pushed) the close is direct. The push is skipped when our entry is
// already on top, which also keeps React StrictMode's double effect run
// from stacking two entries in dev.
//
// Returns requestClose — wire every in-dialog close control to it.

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

function focusables(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0
  );
}

function ours(key) {
  const s = typeof window !== 'undefined' ? window.history.state : null;
  return key != null && !!s && s.overlay === key;
}

export default function useDialog({ open, onClose, containerRef, initialFocusRef, historyKey = null }) {
  // Parents pass inline arrows; keep the latest without re-running effects
  // (a re-run would yank focus back to the close button on every render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useScrollLock(open);

  const requestClose = useCallback(() => {
    if (ours(historyKey)) window.history.back();
    else if (onCloseRef.current) onCloseRef.current();
  }, [historyKey]);

  // Focus in, trap, Escape, focus back out.
  useEffect(() => {
    if (!open) return undefined;
    const trigger = document.activeElement;
    const box = containerRef.current;
    const first =
      (initialFocusRef && initialFocusRef.current) ||
      (box && focusables(box)[0]) ||
      box;
    if (first && first.focus) first.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== 'Tab' || !box) return;
      const items = focusables(box);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const head = items[0];
      const tail = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === head || !box.contains(active))) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && (active === tail || !box.contains(active))) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      if (trigger && typeof trigger.focus === 'function' && document.contains(trigger)) {
        trigger.focus({ preventScroll: true });
      }
    };
    // containerRef / initialFocusRef are refs — stable by definition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requestClose]);

  // Back gesture / back button closes the dialog.
  useEffect(() => {
    if (!open || historyKey == null) return undefined;
    if (!ours(historyKey)) {
      window.history.pushState({ ...(window.history.state || {}), overlay: historyKey }, '');
    }
    const onPop = () => {
      if (!ours(historyKey) && onCloseRef.current) onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open, historyKey]);

  return requestClose;
}
