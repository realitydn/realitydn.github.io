import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// ScrollToTop — a route change lands at the TOP of the new page.
//
// React Router keeps the window where it was across a client-side
// navigation, so the Event Guidelines "back" link (scrolled deep into the
// guidelines) dropped the visitor mid-way down the homepage. Mount once
// inside <BrowserRouter>, above <Routes>.
//
// Leaves alone: a navigation that carries a hash (useHashLanding and the
// guidelines page own those landings), back/forward (POP — the browser
// restores its own scroll position), and the first render (a fresh page load
// already starts at the top, or at its hash).
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (hash || navType === 'POP') return;
    // Instant, never smooth: this is a page turn, not a glide.
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
  }, [pathname, hash, navType]);

  return null;
}
