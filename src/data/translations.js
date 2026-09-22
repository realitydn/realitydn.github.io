// The string catalogue lives in per-language files under ./locales — one file
// per language, all mirroring locales/en.js key-for-key. EN is the reference
// copy; makeT() (App.jsx) falls back to EN, so a key missing from a locale
// degrades to English rather than a raw key path. The language registry
// (codes, URL prefixes, ISO codes) lives in ./languages.js.
//
// LAZY LOCALES (Phase 6, 23.09.26). Only EN ships in the main bundle — it is
// the default page AND the fallback every other catalogue leans on. The other
// five are their own chunks, fetched by import() when a route needs them, so a
// visitor pays for the one language they read (~30–40 KB of source each).
//
//   STR[code]          the catalogue, once loaded (EN always). Components keep
//                      reading STR[lang] synchronously: every route renders
//                      under useLocale(lang), so by the time they run it's there.
//   loadLocale(code)   → null when already loaded, else a promise that settles
//                      once STR[code] is filled. main.jsx awaits it BEFORE the
//                      first render, so the prerendered /vn/ (etc.) is replaced
//                      by an identical Vietnamese tree, never an empty one.
//   useLocale(code)    the render-time gate: suspends (throws the load promise)
//                      until the catalogue is in. Client-side language switches
//                      run inside React Router's startTransition, so the old
//                      page stays up until the new language lands — no blank.
//
// A chunk that fails to load (offline, or a stale tab after a deploy renamed
// the hashes) falls back to EN rather than suspending forever: an English page
// under /vn/ beats an empty one, and it is exactly what makeT's fallback does
// for a single missing key.
import EN from './locales/en.js';

export const STR = { EN };

const LOADERS = {
  VN: () => import('./locales/vi.js'),
  RU: () => import('./locales/ru.js'),
  UK: () => import('./locales/uk.js'),
  KO: () => import('./locales/ko.js'),
  JA: () => import('./locales/ja.js'),
};

const pending = {};

export const localeReady = (code) => !!STR[code] || !LOADERS[code];

export function loadLocale(code) {
  if (localeReady(code)) return null;
  if (!pending[code]) {
    pending[code] = LOADERS[code]()
      .then((m) => { STR[code] = m.default; })
      .catch((err) => {
        console.warn(`[i18n] ${code} strings failed to load — showing English`, err);
        STR[code] = EN;
      });
  }
  return pending[code];
}

// Suspends the calling component until STR[code] is loaded.
export function useLocale(code) {
  const p = loadLocale(code);
  if (p) throw p;
  return STR[code] || EN;
}

// Every catalogue at once — for Node (scripts/build-seo-files.mjs) and checks.
export async function loadAllLocales() {
  await Promise.all(Object.keys(LOADERS).map(loadLocale));
  return STR;
}

export const URLS = {
  APP: "https://app.realitydn.com",
  WA: "https://chat.whatsapp.com/KxJVFwOv89A22qSLfO98nO",
  IG: "https://www.instagram.com/reality.dn/",
  FB: "https://www.facebook.com/realitybarcafedanang/",
  MAP: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1766.9182173001361!2d108.24125224818768!3d16.05241110360417!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x314217004e52b329%3A0x7d382203015c404b!2sREALITY!5e1!3m2!1sen!2s!4v1756275333082!5m2!1sen!2s",
  PDF: "https://realitydn.com/menu-drinks-en.pdf"
};
