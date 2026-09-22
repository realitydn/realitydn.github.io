// The drinks menu, one language at a time.
//
// menu.js is GENERATED (from the app repo — don't edit it here) and carries all
// six languages on every item: 64 KB of source, of which a visitor reads one
// sixth. The `?menu-lang=XX` imports below are served by the
// `reality-menu-per-language` plugin in vite.config.js, which evaluates menu.js
// and emits just that language, fields already resolved with the EN fallback:
//
//   [{ key, label, sections: [{ label, items: [{ name, tag?, desc?, price }] }] }]
//
// so MenuSection / MenuSchema read item.name, not item['name' + suffix]. Node
// (scripts/build-seo-files.mjs) keeps importing menu.js whole.
//
// Same contract as the locale catalogues in translations.js: EN is in the main
// bundle; loadMenu(code) → null | promise (main.jsx awaits it before the first
// render on the home routes); useMenu(code) suspends until it's there; a failed
// chunk falls back to the EN menu.
import { MENU as EN } from './menu.js?menu-lang=EN';

const MENUS = { EN };

const LOADERS = {
  VN: () => import('./menu.js?menu-lang=VN'),
  RU: () => import('./menu.js?menu-lang=RU'),
  UK: () => import('./menu.js?menu-lang=UK'),
  KO: () => import('./menu.js?menu-lang=KO'),
  JA: () => import('./menu.js?menu-lang=JA'),
};

const pending = {};

export const menuReady = (code) => !!MENUS[code] || !LOADERS[code];

export function loadMenu(code) {
  if (menuReady(code)) return null;
  if (!pending[code]) {
    pending[code] = LOADERS[code]()
      .then((m) => { MENUS[code] = m.MENU; })
      .catch((err) => {
        console.warn(`[i18n] ${code} menu failed to load — showing English`, err);
        MENUS[code] = EN;
      });
  }
  return pending[code];
}

// Suspends the calling component until the menu for `code` is loaded.
export function useMenu(code) {
  const p = loadMenu(code);
  if (p) throw p;
  return MENUS[code] || EN;
}
