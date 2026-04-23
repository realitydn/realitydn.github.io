// vite.config.js
import { defineConfig } from "file:///sessions/upbeat-inspiring-brahmagupta/mnt/Main%20Reality%20Website/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/upbeat-inspiring-brahmagupta/mnt/Main%20Reality%20Website/node_modules/@vitejs/plugin-react/dist/index.js";
var prerender = () => ({
  name: "vite-plugin-simple-prerender",
  async closeBundle() {
    if (process.env.SKIP_PRERENDER) return;
    const { execSync } = await import("child_process");
    try {
      execSync("node prerender.mjs", { stdio: "inherit", cwd: process.cwd() });
    } catch (e) {
      console.warn("\n\u26A0 Pre-rendering failed (non-fatal). Site will still work as a normal SPA.");
      console.warn(e.message);
    }
  }
});
var vite_config_default = defineConfig({
  plugins: [react(), prerender()],
  server: {
    port: 3e3,
    open: true
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "carousel": ["embla-carousel-react", "embla-carousel-autoplay"]
        }
      }
    }
  },
  optimizeDeps: {
    include: ["react", "react-dom", "embla-carousel-react", "embla-carousel-autoplay"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvdXBiZWF0LWluc3BpcmluZy1icmFobWFndXB0YS9tbnQvTWFpbiBSZWFsaXR5IFdlYnNpdGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy91cGJlYXQtaW5zcGlyaW5nLWJyYWhtYWd1cHRhL21udC9NYWluIFJlYWxpdHkgV2Vic2l0ZS92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvdXBiZWF0LWluc3BpcmluZy1icmFobWFndXB0YS9tbnQvTWFpbiUyMFJlYWxpdHklMjBXZWJzaXRlL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuXG4vLyBQcmUtcmVuZGVyaW5nOiBhZnRlciBgdml0ZSBidWlsZGAsIHJlbmRlcnMgZWFjaCByb3V0ZSBpbiBhIGhlYWRsZXNzIGJyb3dzZXJcbi8vIGFuZCBzYXZlcyB0aGUgcmVzdWx0aW5nIEhUTUwuIFVzZXJzIHdpdGggSlMgZ2V0IHRoZSBzYW1lIFJlYWN0IFNQQSBleHBlcmllbmNlXG4vLyAoaHlkcmF0aW9uIGtpY2tzIGluKSwgYnV0IGNyYXdsZXJzIHNlZSBmdWxseSByZW5kZXJlZCBjb250ZW50LlxuY29uc3QgcHJlcmVuZGVyID0gKCkgPT4gKHtcbiAgbmFtZTogJ3ZpdGUtcGx1Z2luLXNpbXBsZS1wcmVyZW5kZXInLFxuICBhc3luYyBjbG9zZUJ1bmRsZSgpIHtcbiAgICAvLyBPbmx5IHJ1biBkdXJpbmcgYnVpbGQsIG5vdCBkZXZcbiAgICBpZiAocHJvY2Vzcy5lbnYuU0tJUF9QUkVSRU5ERVIpIHJldHVybjtcblxuICAgIGNvbnN0IHsgZXhlY1N5bmMgfSA9IGF3YWl0IGltcG9ydCgnY2hpbGRfcHJvY2VzcycpO1xuICAgIHRyeSB7XG4gICAgICBleGVjU3luYygnbm9kZSBwcmVyZW5kZXIubWpzJywgeyBzdGRpbzogJ2luaGVyaXQnLCBjd2Q6IHByb2Nlc3MuY3dkKCkgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS53YXJuKCdcXG5cdTI2QTAgUHJlLXJlbmRlcmluZyBmYWlsZWQgKG5vbi1mYXRhbCkuIFNpdGUgd2lsbCBzdGlsbCB3b3JrIGFzIGEgbm9ybWFsIFNQQS4nKTtcbiAgICAgIGNvbnNvbGUud2FybihlLm1lc3NhZ2UpO1xuICAgIH1cbiAgfSxcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgcHJlcmVuZGVyKCldLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIG9wZW46IHRydWUsXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgICAgJ2Nhcm91c2VsJzogWydlbWJsYS1jYXJvdXNlbC1yZWFjdCcsICdlbWJsYS1jYXJvdXNlbC1hdXRvcGxheSddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdlbWJsYS1jYXJvdXNlbC1yZWFjdCcsICdlbWJsYS1jYXJvdXNlbC1hdXRvcGxheSddLFxuICB9LFxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUFtWCxTQUFTLG9CQUFvQjtBQUNoWixPQUFPLFdBQVc7QUFLbEIsSUFBTSxZQUFZLE9BQU87QUFBQSxFQUN2QixNQUFNO0FBQUEsRUFDTixNQUFNLGNBQWM7QUFFbEIsUUFBSSxRQUFRLElBQUksZUFBZ0I7QUFFaEMsVUFBTSxFQUFFLFNBQVMsSUFBSSxNQUFNLE9BQU8sZUFBZTtBQUNqRCxRQUFJO0FBQ0YsZUFBUyxzQkFBc0IsRUFBRSxPQUFPLFdBQVcsS0FBSyxRQUFRLElBQUksRUFBRSxDQUFDO0FBQUEsSUFDekUsU0FBUyxHQUFHO0FBQ1YsY0FBUSxLQUFLLGtGQUE2RTtBQUMxRixjQUFRLEtBQUssRUFBRSxPQUFPO0FBQUEsSUFDeEI7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQztBQUFBLEVBQzlCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixnQkFBZ0IsQ0FBQyxTQUFTLFdBQVc7QUFBQSxVQUNyQyxZQUFZLENBQUMsd0JBQXdCLHlCQUF5QjtBQUFBLFFBQ2hFO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsU0FBUyxhQUFhLHdCQUF3Qix5QkFBeUI7QUFBQSxFQUNuRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
