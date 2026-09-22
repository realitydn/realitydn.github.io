import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ScrollToTop from './components/ScrollToTop';
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
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Route changes land at the top (hash + back/forward excepted). */}
      <ScrollToTop />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
