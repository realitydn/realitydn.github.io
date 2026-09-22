import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ScrollToTop from './components/ScrollToTop';
import { langFromPath, stripLangPrefix } from './data/languages';
import { loadLocale } from './data/translations';
import { loadMenu } from './data/menu-i18n';
import './index.css';

// createRoot, deliberately NOT hydrateRoot (reviewed 23.09.26, and re-tested
// 23.09.26 against a development build: hydrateRoot, prerendered DOM diffed
// against renderToString of the client's first render). The prerendered HTML
// is a Day-theme, build-time STILL captured from a client-rendered DOM, and it
// does not match the first client render:
//   - capture artefacts: adjacent JSX text nodes merge when the DOM is
//     serialised ("{n}." lists, the hero line), and there are no Suspense
//     markers (<!--$-->) for App's lazy-locale boundary — React 18 treats both
//     as hard mismatches, on every route;
//   - the calendar: the capture renders the 60-day snapshot, the first client
//     render the 21-day inline seed, both cut against their own "now" — so
//     the home pages mismatch on practically every visit;
//   - ThemeToggle renders the saved/OS Night icon; the gallery carousel's dot
//     count is the capture viewport's snap count, and its pause button is
//     absent under reduced motion.
// On a mismatch React 18 throws the server DOM away and client-renders the
// whole root anyway, so hydrateRoot would cost a failed pass plus console
// errors for nothing. The visible cost of re-rendering (the calendar flashing
// prerendered rows → skeleton → rows) is handled at the data layer instead: see
// the window.__FEED__ inline seed in hooks/useFeed.js.
const container = document.getElementById('root');

function render() {
  createRoot(container).render(
    <React.StrictMode>
      <BrowserRouter>
        {/* Route changes land at the top (hash + back/forward excepted). */}
        <ScrollToTop />
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

// Only EN ships in this bundle; every other language's strings (and, on the
// home pages, its menu) are a lazy chunk. createRoot REPLACES the prerendered
// DOM on its first render, so that render must already have the page's
// language — otherwise /vn/ would swap its prerendered Vietnamese for an empty
// Suspense fallback until the chunk landed. So the chunk is awaited first
// (the prerendered page stays on screen meanwhile), then React renders once,
// straight into the same content. EN needs nothing and renders synchronously.
// Both loaders settle even on failure (falling back to English), so this can't
// strand the page un-rendered.
const { pathname } = window.location;
const lang = langFromPath(pathname);
const pending = [
  loadLocale(lang),
  stripLangPrefix(pathname) === '/' ? loadMenu(lang) : null,
].filter(Boolean);

if (pending.length) Promise.all(pending).then(render);
else render();
