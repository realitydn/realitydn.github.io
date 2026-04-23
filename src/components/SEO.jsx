import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEO — imperatively syncs per-route meta tags on mount / route change.
 *
 * Why this exists
 * ---------------
 * The site is a SPA with pre-rendering (see prerender.mjs). Puppeteer captures
 * the DOM after React effects have run, so whatever this component writes into
 * <head> ends up in the static HTML each crawler sees. Every page therefore
 * gets a correct canonical, correct hreflang alternates pointing at its EN and
 * VN twins, and (optionally) its own title + description.
 *
 * Consumers pass `lang` ('EN' | 'VN'). The EN↔VN path pair is derived from the
 * current URL: /foo ↔ /vn/foo, / ↔ /vn.
 */
const SITE = 'https://realitydn.com';

function upsertLink({ rel, hreflang }, href) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertMeta(name, content, attr = 'name') {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertRobots(content) {
  let el = document.head.querySelector('meta[name="robots"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function SEO({ lang, title, description, noindex = false }) {
  const { pathname } = useLocation();

  useEffect(() => {
    // Normalize path. Strip trailing slash except for root.
    const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');

    // Derive the EN and VN twins for this route.
    const enPath = path.startsWith('/vn')
      ? (path === '/vn' ? '/' : path.slice(3))
      : path;
    const vnPath = enPath === '/' ? '/vn' : `/vn${enPath}`;

    const currentPath = lang === 'VN' ? vnPath : enPath;

    // <html lang="..."> — ISO 639-1 code, not the user-facing label.
    document.documentElement.setAttribute('lang', lang === 'VN' ? 'vi' : 'en');

    // Canonical points at this route's own URL.
    upsertLink({ rel: 'canonical' }, SITE + currentPath);

    // hreflang alternates — note we use "vi" (ISO) here even though the UI
    // label is "VN". Google validates against ISO 639-1 and will reject "vn".
    upsertLink({ rel: 'alternate', hreflang: 'en' }, SITE + enPath);
    upsertLink({ rel: 'alternate', hreflang: 'vi' }, SITE + vnPath);
    upsertLink({ rel: 'alternate', hreflang: 'x-default' }, SITE + enPath);

    if (title) {
      document.title = title;
      upsertMeta('title', title);
      upsertMeta('og:title', title, 'property');
      upsertMeta('twitter:title', title, 'property');
    }
    if (description) {
      upsertMeta('description', description);
      upsertMeta('og:description', description, 'property');
      upsertMeta('twitter:description', description, 'property');
    }

    upsertMeta('og:url', SITE + currentPath, 'property');
    upsertMeta('twitter:url', SITE + currentPath, 'property');

    upsertRobots(noindex ? 'noindex, follow' : 'index, follow');
  }, [pathname, lang, title, description, noindex]);

  return null;
}
