// The single registry of the site's languages. The URL prefix is the source
// of truth for language ('' = EN default, matching the original / ↔ /vn pair).
// `iso` is what <html lang> and hreflang need — ISO 639-1, which is why
// Vietnamese is "vi" even though the UI label is "VN" (Google rejects "vn").
export const LANGS = [
  { code: 'EN', prefix: '',    iso: 'en', label: 'EN', native: 'English' },
  { code: 'VN', prefix: '/vn', iso: 'vi', label: 'VN', native: 'Tiếng Việt' },
  { code: 'RU', prefix: '/ru', iso: 'ru', label: 'RU', native: 'Русский' },
  { code: 'UK', prefix: '/uk', iso: 'uk', label: 'UK', native: 'Українська' },
  { code: 'KO', prefix: '/ko', iso: 'ko', label: 'KO', native: '한국어' },
  { code: 'JA', prefix: '/ja', iso: 'ja', label: 'JA', native: '日本語' },
];

export const langByCode = (code) =>
  LANGS.find((l) => l.code === code) || LANGS[0];

// '/vn/event-guidelines' → '/event-guidelines' · '/ru' → '/' · '/foo' → '/foo'
export function stripLangPrefix(pathname) {
  const path = pathname === '/' ? '/' : (pathname || '/').replace(/\/+$/, '');
  for (const l of LANGS) {
    if (!l.prefix) continue;
    if (path === l.prefix) return '/';
    if (path.startsWith(l.prefix + '/')) return path.slice(l.prefix.length);
  }
  return path || '/';
}

// pathFor('RU', '/event-guidelines') → '/ru/event-guidelines' · ('RU', '/') → '/ru'
export function pathFor(code, basePath = '/') {
  const { prefix } = langByCode(code);
  if (!prefix) return basePath;
  return basePath === '/' ? prefix : prefix + basePath;
}
