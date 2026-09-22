import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ScrollToTop from './components/ScrollToTop';
import { langFromPath, stripLangPrefix } from './data/languages';
import { loadLocale } from './data/translations';
import { loadMenu } from './data/menu-i18n';
import './index.css';

// createRoot, deliberately NOT hydrateRoot (reviewed 23.09.26). The prerendered
// HTML is a Day-theme, build-time STILL; the client tree legitimately differs
// from it on first render — ThemeToggle reads a saved Night theme, the calendar
// is re-cut against today's date (TONIGHT chips, ended events dropped), Footer's
// year, BandField's live mosaic — so hydration would log mismatches and patch
// them anyway. The visible cost of re-rendering (the calendar flashing
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
