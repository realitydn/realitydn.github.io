// The single registry of the site's languages. The URL prefix is the source
// of truth for language ('' = EN default, matching the original / ↔ /vn pair).
// `iso` is what <html lang> and hreflang need — ISO 639-1, which is why
// Vietnamese is "vi" even though the UI label is "VN" (Google rejects "vn").
// `ogLocale` is the Open Graph og:locale form (language_TERRITORY).
// `label` is the visible two-letter tag only: Ukrainian shows "UA" because
// "UK" reads as the United Kingdom — the code, prefix and hreflang stay 'uk'.
export const LANGS = [
  { code: 'EN', prefix: '',    iso: 'en', ogLocale: 'en_US', label: 'EN', native: 'English' },
  { code: 'VN', prefix: '/vn', iso: 'vi', ogLocale: 'vi_VN', label: 'VN', native: 'Tiếng Việt' },
  { code: 'RU', prefix: '/ru', iso: 'ru', ogLocale: 'ru_RU', label: 'RU', native: 'Русский' },
  { code: 'UK', prefix: '/uk', iso: 'uk', ogLocale: 'uk_UA', label: 'UA', native: 'Українська' },
  { code: 'KO', prefix: '/ko', iso: 'ko', ogLocale: 'ko_KR', label: 'KO', native: '한국어' },
  { code: 'JA', prefix: '/ja', iso: 'ja', ogLocale: 'ja_JP', label: 'JA', native: '日本語' },
];

export const langByCode = (code) =>
  LANGS.find((l) => l.code === code) || LANGS[0];

// The language a pathname belongs to (by prefix) — EN when unprefixed.
// '/vn/foo' → VN · '/ru' → RU · '/foo' → EN
export function langFromPath(pathname = '/') {
  for (const l of LANGS) {
    if (!l.prefix) continue;
    if (pathname === l.prefix || pathname.startsWith(l.prefix + '/')) return l.code;
  }
  return 'EN';
}

// '/vn/event-guidelines/' → '/event-guidelines' · '/ru' → '/' · '/foo' → '/foo'
// Accepts both slash forms; always returns the slash-free base.
export function stripLangPrefix(pathname) {
  const path = pathname === '/' ? '/' : (pathname || '/').replace(/\/+$/, '');
  for (const l of LANGS) {
    if (!l.prefix) continue;
    if (path === l.prefix) return '/';
    if (path.startsWith(l.prefix + '/')) return path.slice(l.prefix.length);
  }
  return path || '/';
}

// pathFor('RU', '/event-guidelines') → '/ru/event-guidelines/' · ('RU', '/') → '/ru/'
// Trailing slash on purpose: the prerender writes dist/ru/index.html, so the
// host serves /ru/ and 308-redirects /ru → /ru/. Canonicals, hreflang, the
// sitemap and every internal link use the slash form so none of them points
// at a redirect. (React Router matches both forms, so routes are unaffected.)
export function pathFor(code, basePath = '/') {
  const { prefix } = langByCode(code);
  const base = basePath === '/' ? '/' : basePath.replace(/\/+$/, '') + '/';
  return base === '/' ? (prefix ? prefix + '/' : '/') : prefix + base;
}

// The same path without the trailing slash — for <Route path>, where the
// slash-free pattern is the conventional form (it still matches '/ru/').
export function routeFor(code, basePath = '/') {
  const p = pathFor(code, basePath);
  return p === '/' ? '/' : p.replace(/\/+$/, '');
}
