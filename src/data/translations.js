// The string catalogue lives in per-language files under ./locales — one file
// per language, all mirroring locales/en.js key-for-key. EN is the reference
// copy; makeT() (App.jsx) falls back to EN, so a key missing from a locale
// degrades to English rather than a raw key path. The language registry
// (codes, URL prefixes, ISO codes) lives in ./languages.js.
import EN from './locales/en.js';
import VN from './locales/vi.js';
import RU from './locales/ru.js';
import UK from './locales/uk.js';
import KO from './locales/ko.js';
import JA from './locales/ja.js';

export const STR = { EN, VN, RU, UK, KO, JA };

export const URLS = {
  APP: "https://app.realitydn.com",
  WA: "https://chat.whatsapp.com/KxJVFwOv89A22qSLfO98nO",
  IG: "https://www.instagram.com/reality.dn/",
  FB: "https://www.facebook.com/realitybarcafedanang/",
  MAP: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1766.9182173001361!2d108.24125224818768!3d16.05241110360417!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x314217004e52b329%3A0x7d382203015c404b!2sREALITY!5e1!3m2!1sen!2s!4v1756275333082!5m2!1sen!2s",
  PDF: "https://realitydn.com/menu-drinks-en.pdf"
};
