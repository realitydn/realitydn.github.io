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
 * current URL by stripping the language prefix: /vn/foo/ ↔ /foo/ ↔ /ru/foo/ …
 * All of them in the trailing-slash form the host actually serves (pathFor).
 *
 * `noindex` pages keep a self-canonical but drop hreflang (alternates only
 * make sense between indexable twins). `notFound` (the 404 page) drops the
 * canonical and og:url too — there is no URL to point at.
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

function removeAll(selector) {
  document.head.querySelectorAll(selector).forEach((el) => el.remove());
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

export default function SEO({ lang, title, description, noindex = false, notFound = false }) {
  const { pathname } = useLocation();

  useEffect(() => {
    // The language-free base path for this route ('/', '/event-guidelines', …).
    const base = stripLangPrefix(pathname);
    const current = langByCode(lang);
    const currentPath = pathFor(lang, base);

    // <html lang="..."> — ISO 639-1 code, not the user-facing label
    // (Google validates hreflang against ISO 639-1 and rejects "vn").
    document.documentElement.setAttribute('lang', current.iso);

    // hreflang alternates — one per language twin, EN as x-default. Only
    // between indexable pages; a noindex page gets none (and any left over
    // from the shell or a previous route are cleared).
    removeAll('link[rel="alternate"][hreflang]');
    if (!noindex && !notFound) {
      for (const l of LANGS) {
        upsertLink({ rel: 'alternate', hreflang: l.iso }, SITE + pathFor(l.code, base));
      }
      upsertLink({ rel: 'alternate', hreflang: 'x-default' }, SITE + pathFor('EN', base));
    }

    // Canonical points at this route's own URL (none at all on the 404).
    if (notFound) {
      removeAll('link[rel="canonical"]');
      removeAll('meta[property="og:url"]');
    } else {
      upsertLink({ rel: 'canonical' }, SITE + currentPath);
      upsertMeta('og:url', SITE + currentPath, 'property');
    }

    // og:locale for this page + og:locale:alternate for every other language.
    upsertMeta('og:locale', current.ogLocale, 'property');
    removeAll('meta[property="og:locale:alternate"]');
    if (!notFound) {
      for (const l of LANGS) {
        if (l.code === current.code) continue;
        const el = document.createElement('meta');
        el.setAttribute('property', 'og:locale:alternate');
        el.setAttribute('content', l.ogLocale);
        document.head.appendChild(el);
      }
    }

    // Twitter cards read name= (not property=); twitter:url isn't a card tag.
    if (title) {
      document.title = title;
      upsertMeta('og:title', title, 'property');
      upsertMeta('twitter:title', title);
    }
    if (description) {
      upsertMeta('description', description);
      upsertMeta('og:description', description, 'property');
      upsertMeta('twitter:description', description);
    }

    upsertRobots(noindex || notFound ? 'noindex, follow' : 'index, follow');
  }, [pathname, lang, title, description, noindex, notFound]);

  return null;
}
