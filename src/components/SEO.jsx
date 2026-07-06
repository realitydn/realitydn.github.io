import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LANGS, langByCode, pathFor, stripLangPrefix } from '../data/languages';

/**
 * SEO — imperatively syncs per-route meta tags on mount / route change.
 *
 * Why this exists
 * ---------------
 * The site is a SPA with pre-rendering (see prerender.mjs). Puppeteer captures
 * the DOM after React effects have run, so whatever this component writes into
 * <head> ends up in the static HTML each crawler sees. Every page therefore
 * gets a correct canonical, hreflang alternates pointing at all its language
 * twins (see data/languages.js), and (optionally) its own title + description.
 *
 * Consumers pass `lang` (a LANGS code). The twin paths are derived from the
 * current URL by stripping the language prefix: /vn/foo ↔ /foo ↔ /ru/foo …
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
    // The language-free base path for this route ('/', '/event-guidelines', …).
    const base = stripLangPrefix(pathname);
    const currentPath = pathFor(lang, base);

    // <html lang="..."> — ISO 639-1 code, not the user-facing label
    // (Google validates hreflang against ISO 639-1 and rejects "vn").
    document.documentElement.setAttribute('lang', langByCode(lang).iso);

    // Canonical points at this route's own URL.
    upsertLink({ rel: 'canonical' }, SITE + currentPath);

    // hreflang alternates — one per language twin, EN as x-default.
    for (const l of LANGS) {
      upsertLink({ rel: 'alternate', hreflang: l.iso }, SITE + pathFor(l.code, base));
    }
    upsertLink({ rel: 'alternate', hreflang: 'x-default' }, SITE + base);

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
