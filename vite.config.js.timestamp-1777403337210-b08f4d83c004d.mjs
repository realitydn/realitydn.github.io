// vite.config.js
import { defineConfig } from "file:///sessions/nifty-ecstatic-babbage/mnt/Main%20Reality%20Website/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/nifty-ecstatic-babbage/mnt/Main%20Reality%20Website/node_modules/@vitejs/plugin-react/dist/index.js";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvbmlmdHktZWNzdGF0aWMtYmFiYmFnZS9tbnQvTWFpbiBSZWFsaXR5IFdlYnNpdGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9uaWZ0eS1lY3N0YXRpYy1iYWJiYWdlL21udC9NYWluIFJlYWxpdHkgV2Vic2l0ZS92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvbmlmdHktZWNzdGF0aWMtYmFiYmFnZS9tbnQvTWFpbiUyMFJlYWxpdHklMjBXZWJzaXRlL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuXG4vLyBQcmUtcmVuZGVyaW5nOiBhZnRlciBgdml0ZSBidWlsZGAsIHJlbmRlcnMgZWFjaCByb3V0ZSBpbiBhIGhlYWRsZXNzIGJyb3dzZXJcbi8vIGFuZCBzYXZlcyB0aGUgcmVzdWx0aW5nIEhUTUwuIFVzZXJzIHdpdGggSlMgZ2V0IHRoZSBzYW1lIFJlYWN0IFNQQSBleHBlcmllbmNlXG4vLyAoaHlkcmF0aW9uIGtpY2tzIGluKSwgYnV0IGNyYXdsZXJzIHNlZSBmdWxseSByZW5kZXJlZCBjb250ZW50LlxuY29uc3QgcHJlcmVuZGVyID0gKCkgPT4gKHtcbiAgbmFtZTogJ3ZpdGUtcGx1Z2luLXNpbXBsZS1wcmVyZW5kZXInLFxuICBhc3luYyBjbG9zZUJ1bmRsZSgpIHtcbiAgICAvLyBPbmx5IHJ1biBkdXJpbmcgYnVpbGQsIG5vdCBkZXZcbiAgICBpZiAocHJvY2Vzcy5lbnYuU0tJUF9QUkVSRU5ERVIpIHJldHVybjtcblxuICAgIGNvbnN0IHsgZXhlY1N5bmMgfSA9IGF3YWl0IGltcG9ydCgnY2hpbGRfcHJvY2VzcycpO1xuICAgIHRyeSB7XG4gICAgICBleGVjU3luYygnbm9kZSBwcmVyZW5kZXIubWpzJywgeyBzdGRpbzogJ2luaGVyaXQnLCBjd2Q6IHByb2Nlc3MuY3dkKCkgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS53YXJuKCdcXG5cdTI2QTAgUHJlLXJlbmRlcmluZyBmYWlsZWQgKG5vbi1mYXRhbCkuIFNpdGUgd2lsbCBzdGlsbCB3b3JrIGFzIGEgbm9ybWFsIFNQQS4nKTtcbiAgICAgIGNvbnNvbGUud2FybihlLm1lc3NhZ2UpO1xuICAgIH1cbiAgfSxcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgcHJlcmVuZGVyKCldLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIG9wZW46IHRydWUsXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgICAgJ2Nhcm91c2VsJzogWydlbWJsYS1jYXJvdXNlbC1yZWFjdCcsICdlbWJsYS1jYXJvdXNlbC1hdXRvcGxheSddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdlbWJsYS1jYXJvdXNlbC1yZWFjdCcsICdlbWJsYS1jYXJvdXNlbC1hdXRvcGxheSddLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlXLFNBQVMsb0JBQW9CO0FBQzlYLE9BQU8sV0FBVztBQUtsQixJQUFNLFlBQVksT0FBTztBQUFBLEVBQ3ZCLE1BQU07QUFBQSxFQUNOLE1BQU0sY0FBYztBQUVsQixRQUFJLFFBQVEsSUFBSSxlQUFnQjtBQUVoQyxVQUFNLEVBQUUsU0FBUyxJQUFJLE1BQU0sT0FBTyxlQUFlO0FBQ2pELFFBQUk7QUFDRixlQUFTLHNCQUFzQixFQUFFLE9BQU8sV0FBVyxLQUFLLFFBQVEsSUFBSSxFQUFFLENBQUM7QUFBQSxJQUN6RSxTQUFTLEdBQUc7QUFDVixjQUFRLEtBQUssa0ZBQTZFO0FBQzFGLGNBQVEsS0FBSyxFQUFFLE9BQU87QUFBQSxJQUN4QjtBQUFBLEVBQ0Y7QUFDRjtBQUVBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDO0FBQUEsRUFDOUIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLGdCQUFnQixDQUFDLFNBQVMsV0FBVztBQUFBLFVBQ3JDLFlBQVksQ0FBQyx3QkFBd0IseUJBQXlCO0FBQUEsUUFDaEU7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxTQUFTLGFBQWEsd0JBQXdCLHlCQUF5QjtBQUFBLEVBQ25GO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
