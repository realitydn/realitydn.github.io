import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
      console.warn('\n⚠ Pre-rendering failed (non-fatal). Site will still work as a normal SPA.');
      console.warn(e.message);
    }
  },
});

export default defineConfig({
  plugins: [react(), prerender()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
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
