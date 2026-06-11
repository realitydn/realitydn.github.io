import { useEffect } from 'react';
import { MENU } from '../data/menu';

/**
 * MenuSchema — emits a schema.org Menu (JSON-LD) generated from the same
 * MENU data that renders the on-page menu, so the structured data can never
 * drift from what customers actually see. Pre-rendering captures it into the
 * static HTML for crawlers; search engines and LLMs both read it.
 *
 * Prices in menu.js are thousands of VND ('95' → ₫95,000).
 */
export default function MenuSchema({ lang = 'EN', id = 'menu-schema' }) {
  useEffect(() => {
    const vn = lang === 'VN';

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Menu',
      '@id': 'https://realitydn.com/#drinks-menu',
      name: vn ? 'Menu đồ uống REALITY' : 'REALITY Drinks Menu',
      inLanguage: vn ? 'vi' : 'en',
      url: 'https://realitydn.com/#menus',
      mainEntityOfPage: 'https://realitydn.com/',
      hasMenuSection: MENU.map((cat) => ({
        '@type': 'MenuSection',
        name: vn ? cat.labelVI : cat.labelEN,
        hasMenuSection: cat.sections.map((section) => ({
          '@type': 'MenuSection',
          name: vn ? section.labelVI : section.labelEN,
          hasMenuItem: section.items.map((item) => {
            const entry = {
              '@type': 'MenuItem',
              name: vn ? (item.nameVI || item.nameEN) : item.nameEN,
            };
            const desc = vn ? (item.descVI || item.descEN) : item.descEN;
            if (desc) entry.description = desc;
            const price = Number(item.price);
            if (Number.isFinite(price) && price > 0) {
              entry.offers = {
                '@type': 'Offer',
                price: String(price * 1000),
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
    tag.textContent = JSON.stringify(schema);

    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, [lang, id]);

  return null;
}
