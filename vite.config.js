import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Cache-busting for the Studios. Poster / Print / Schedule Studio are copied
// verbatim from public/ into dist/ — each index.html loads vendor scripts, the
// shared riso press and one prebuilt bundle (scripts/build-studios.mjs) — so
// their .js/.css keep stable, unhashed names, and the CDN caches those for
// hours. After a deploy a browser could pair a fresh bundle with a stale
// ../studio-shared/riso-engine.js (or, before the bundles, one app script with
// another) and break in ways that only a hard reload fixed. The HTML itself is served max-age=0 (public/_headers), so stamping
// each local <script src> / stylesheet <link> in it with ?v=<content hash>
// makes every changed file a new URL the moment the new HTML lands, while
// unchanged files keep their cached copy.
//
// This runs on the dist/ COPIES only, after Vite has copied public/ over. The
// tracked public/*/index.html files are never touched, so a build leaves the
// git tree clean and the local launchers (tools/serve-*.cjs) keep serving the
// plain, unstamped HTML. Hashes are taken from the dist copies of the
// referenced files — exactly the bytes that deploy. Idempotent: an existing
// ?v= is replaced, never appended to.
const STUDIO_PAGES = ['studio/index.html', 'print/index.html', 'schedule/index.html'];

function stampStudioAssets(outDir) {
  const shortHash = (file) =>
    createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 10);

  for (const page of STUDIO_PAGES) {
    const htmlPath = path.join(outDir, page);
    if (!existsSync(htmlPath)) {
      console.warn(`  cache-bust: ${page} not in ${outDir} — skipped`);
      continue;
    }
    const htmlDir = path.dirname(htmlPath);
    let stamped = 0;
    let missing = 0;

    const stamp = (match, pre, url, post) => {
      // Local, relative files only (vendor/…, ../studio-shared/…, the
      // *.bundle.js). CDN URLs, protocol-relative and root-absolute paths are
      // left alone.
      if (/^(?:[a-z]+:|\/)/i.test(url)) return match;
      const file = path.join(htmlDir, url);
      if (!existsSync(file)) {
        missing++;
        console.warn(`  cache-bust: ${page} references ${url}, not found in dist — left unstamped`);
        return match;
      }
      stamped++;
      return `${pre}${url}?v=${shortHash(file)}${post}`;
    };

    const html = readFileSync(htmlPath, 'utf8')
      .replace(/(<script\b[^>]*?\bsrc=")([^"?#]+\.js)(?:\?v=[^"]*)?(")/g, stamp)
      .replace(/(<link\b[^>]*?\bhref=")([^"?#]+\.css)(?:\?v=[^"]*)?(")/g, stamp);
    writeFileSync(htmlPath, html, 'utf8');
    console.log(`  cache-bust: ${page} — ${stamped} asset(s) stamped${missing ? `, ${missing} missing` : ''}`);
  }
}

const studioCacheBust = () => {
  let outDir = 'dist';
  return {
    name: 'reality-studio-cache-bust',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    // closeBundle hooks run in parallel by default; `order: 'pre'` +
    // `sequential: true` makes this finish before the prerender plugin starts.
    closeBundle: {
      order: 'pre',
      sequential: true,
      handler() {
        stampStudioAssets(outDir);
      },
    },
  };
};

// One language of the drinks menu per chunk. src/data/menu.js is generated
// (by the app repo) with all six languages on every item; the site imports it
// as `./menu.js?menu-lang=XX` (src/data/menu-i18n.js) and this plugin answers
// with only that language, each field already resolved with the EN fallback —
// { key, label, sections: [{ label, items: [{ name, tag?, desc?, price }] }] }.
// menu.js stays the single source (Node scripts keep importing it whole), and
// because the query variants are the same file in Vite's module graph, editing
// menu.js in dev invalidates all six.
const MENU_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/data/menu.js');
const MENU_SUFFIX = { EN: 'EN', VN: 'VI', RU: 'RU', UK: 'UK', KO: 'KO', JA: 'JA' };

function projectMenu(menu, lang) {
  const suffix = MENU_SUFFIX[lang] || 'EN';
  const pick = (obj, field) => obj[field + suffix] || obj[field + 'EN'];
  return menu.map((cat) => ({
    key: cat.key,
    label: pick(cat, 'label'),
    sections: cat.sections.map((section) => ({
      label: pick(section, 'label'),
      items: section.items.map((item) => {
        const out = { name: pick(item, 'name') };
        const tag = pick(item, 'tag');
        const desc = pick(item, 'desc');
        if (tag) out.tag = tag;
        if (desc) out.desc = desc;
        if (item.price) out.price = item.price;
        return out;
      }),
    })),
  }));
}

const menuPerLanguage = () => ({
  name: 'reality-menu-per-language',
  enforce: 'pre',
  async load(id) {
    const [file, query] = id.split('?');
    if (!query) return null;
    const lang = new URLSearchParams(query).get('menu-lang');
    if (!lang || path.resolve(file).toLowerCase() !== MENU_FILE.toLowerCase()) return null;
    this.addWatchFile(MENU_FILE);
    // mtime in the URL: Node caches ESM imports, so an edited menu.js needs a
    // fresh specifier to be re-read in a long-running dev server.
    const { MENU } = await import(pathToFileURL(MENU_FILE).href + '?t=' + statSync(MENU_FILE).mtimeMs);
    return `export const MENU = ${JSON.stringify(projectMenu(MENU, lang))};\n`;
  },
});

// Pre-rendering: after `vite build`, renders each route in a headless browser
// and saves the resulting HTML. Users with JS get the same React SPA experience
// (hydration kicks in), but crawlers see fully rendered content.
const prerender = () => ({
  name: 'vite-plugin-simple-prerender',
  async closeBundle() {
    // Only run during build, not dev
    if (process.env.SKIP_PRERENDER) return;

    const { execSync } = await import('child_process');
    try {
      execSync('node prerender.mjs', { stdio: 'inherit', cwd: process.cwd() });
    } catch (e) {
      // prerender.mjs exits 1 on purpose when any route failed to render: a
      // partial pre-render deploys the missing routes as the English homepage
      // (200, no 404) and gets them indexed that way. Swallowing that here used
      // to ship exactly the broken site the script was refusing to ship, so the
      // failure now fails the build. ALLOW_PARTIAL_PRERENDER=1 is the same
      // escape hatch prerender.mjs honours (it normally exits 0 under it, so
      // reaching here with it set means the run itself fell over).
      if (!process.env.ALLOW_PARTIAL_PRERENDER) {
        throw new Error(
          'Pre-rendering failed — refusing to build a partial site. ' +
            'Set ALLOW_PARTIAL_PRERENDER=1 to ship it anyway, or SKIP_PRERENDER=1 to skip pre-rendering.',
          { cause: e }
        );
      }
      console.warn('\n⚠ Pre-rendering failed; continuing because ALLOW_PARTIAL_PRERENDER is set.');
      console.warn(e.message);
    }
  },
});

export default defineConfig({
  plugins: [menuPerLanguage(), react(), studioCacheBust(), prerender()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // The per-language menu chunks all come from menu.js, so Rollup would
        // name them menu-<hash> ×5; tag them with their language instead.
        chunkFileNames: (chunk) => {
          const m = /[?&]menu-lang=([A-Z]+)/.exec(chunk.facadeModuleId || '');
          return m ? `assets/menu-${m[1].toLowerCase()}-[hash].js` : 'assets/[name]-[hash].js';
        },
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'carousel': ['embla-carousel-react', 'embla-carousel-autoplay'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'embla-carousel-react', 'embla-carousel-autoplay'],
  },
});
