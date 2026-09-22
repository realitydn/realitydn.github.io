import { useEffect } from 'react';
import { useMenu } from '../data/menu-i18n';
import { langByCode, pathFor } from '../data/languages';

/**
 * MenuSchema — emits a schema.org Menu (JSON-LD) generated from the same
 * MENU data that renders the on-page menu, so the structured data can never
 * drift from what customers actually see. Pre-rendering captures it into the
 * static HTML for crawlers; search engines and LLMs both read it.
 *
 * Every language reads its own menu: useMenu(lang) hands back that language
 * only, name/desc/label already resolved with the EN fallback (see
 * data/menu-i18n.js and the menu plugin in vite.config.js).
 * The @id is shared with the LocalBusiness `hasMenu` in index.html.
 *
 * Prices in menu.js are thousands of VND ('95' → ₫95,000).
 */
const SITE = 'https://realitydn.com';
const MENU_ID = `${SITE}/#drinks-menu`;

const NAMES = {
  EN: 'REALITY Drinks Menu',
  VN: 'Menu đồ uống REALITY',
  RU: 'Меню напитков REALITY',
  UK: 'Меню напоїв REALITY',
  KO: 'REALITY 음료 메뉴',
  JA: 'REALITY ドリンクメニュー',
};

export default function MenuSchema({ lang = 'EN', id = 'menu-schema' }) {
  const MENU = useMenu(lang);
  useEffect(() => {
    const page = SITE + pathFor(lang, '/');

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Menu',
      '@id': MENU_ID,
      name: NAMES[lang] || NAMES.EN,
      inLanguage: langByCode(lang).iso,
      url: page + '#menus',
      mainEntityOfPage: page,
      hasMenuSection: MENU.map((cat) => ({
        '@type': 'MenuSection',
        name: cat.label,
        hasMenuSection: cat.sections.map((section) => ({
          '@type': 'MenuSection',
          name: section.label,
          hasMenuItem: section.items.map((item) => {
            const entry = {
              '@type': 'MenuItem',
              name: item.name,
            };
            if (item.desc) entry.description = item.desc;
            const price = Number(item.price);
            if (Number.isFinite(price) && price > 0) {
              entry.offers = {
                '@type': 'Offer',
                price: price * 1000,
                priceCurrency: 'VND',
              };
            }
            return entry;
          }),
        })),
      })),
    };

    let tag = document.getElementById(id);
    if (!tag) {
      tag = document.createElement('script');
      tag.id = id;
      tag.type = 'application/ld+json';
      document.head.appendChild(tag);
    }
    // '<' escaped so no menu text can close the <script> in baked HTML.
    tag.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');

    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, [MENU, lang, id]);

  return null;
}
