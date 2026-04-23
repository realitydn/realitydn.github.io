import { useEffect } from 'react';

/**
 * FAQSchema — emits a JSON-LD FAQPage from the current language's infoItems.
 * Lets Google surface the Q&A directly in search results. Must live inside a
 * <Route> child so Puppeteer captures it in pre-rendered HTML.
 *
 * We only emit this on the homepage. Each route has its own ID so switching
 * languages replaces the tag instead of stacking duplicates.
 */
export default function FAQSchema({ items, id = 'faq-schema' }) {
  useEffect(() => {
    if (!items || items.length === 0) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
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
      // Cleaning up on unmount keeps stale tags out of the head when the
      // language changes and this component re-mounts with a new items array.
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, [items, id]);

  return null;
}
