// vite.config.js
import { defineConfig } from "file:///sessions/serene-loving-johnson/mnt/Main%20Reality%20Website/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/serene-loving-johnson/mnt/Main%20Reality%20Website/node_modules/@vitejs/plugin-react/dist/index.js";
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
    sourcemap: true,
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvc2VyZW5lLWxvdmluZy1qb2huc29uL21udC9NYWluIFJlYWxpdHkgV2Vic2l0ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3Nlc3Npb25zL3NlcmVuZS1sb3Zpbmctam9obnNvbi9tbnQvTWFpbiBSZWFsaXR5IFdlYnNpdGUvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3Nlc3Npb25zL3NlcmVuZS1sb3Zpbmctam9obnNvbi9tbnQvTWFpbiUyMFJlYWxpdHklMjBXZWJzaXRlL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuXG4vLyBQcmUtcmVuZGVyaW5nOiBhZnRlciBgdml0ZSBidWlsZGAsIHJlbmRlcnMgZWFjaCByb3V0ZSBpbiBhIGhlYWRsZXNzIGJyb3dzZXJcbi8vIGFuZCBzYXZlcyB0aGUgcmVzdWx0aW5nIEhUTUwuIFVzZXJzIHdpdGggSlMgZ2V0IHRoZSBzYW1lIFJlYWN0IFNQQSBleHBlcmllbmNlXG4vLyAoaHlkcmF0aW9uIGtpY2tzIGluKSwgYnV0IGNyYXdsZXJzIHNlZSBmdWxseSByZW5kZXJlZCBjb250ZW50LlxuY29uc3QgcHJlcmVuZGVyID0gKCkgPT4gKHtcbiAgbmFtZTogJ3ZpdGUtcGx1Z2luLXNpbXBsZS1wcmVyZW5kZXInLFxuICBhc3luYyBjbG9zZUJ1bmRsZSgpIHtcbiAgICAvLyBPbmx5IHJ1biBkdXJpbmcgYnVpbGQsIG5vdCBkZXZcbiAgICBpZiAocHJvY2Vzcy5lbnYuU0tJUF9QUkVSRU5ERVIpIHJldHVybjtcblxuICAgIGNvbnN0IHsgZXhlY1N5bmMgfSA9IGF3YWl0IGltcG9ydCgnY2hpbGRfcHJvY2VzcycpO1xuICAgIHRyeSB7XG4gICAgICBleGVjU3luYygnbm9kZSBwcmVyZW5kZXIubWpzJywgeyBzdGRpbzogJ2luaGVyaXQnLCBjd2Q6IHByb2Nlc3MuY3dkKCkgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS53YXJuKCdcXG5cdTI2QTAgUHJlLXJlbmRlcmluZyBmYWlsZWQgKG5vbi1mYXRhbCkuIFNpdGUgd2lsbCBzdGlsbCB3b3JrIGFzIGEgbm9ybWFsIFNQQS4nKTtcbiAgICAgIGNvbnNvbGUud2FybihlLm1lc3NhZ2UpO1xuICAgIH1cbiAgfSxcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgcHJlcmVuZGVyKCldLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIG9wZW46IHRydWUsXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgc291cmNlbWFwOiB0cnVlLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAnY2Fyb3VzZWwnOiBbJ2VtYmxhLWNhcm91c2VsLXJlYWN0JywgJ2VtYmxhLWNhcm91c2VsLWF1dG9wbGF5J10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ2VtYmxhLWNhcm91c2VsLXJlYWN0JywgJ2VtYmxhLWNhcm91c2VsLWF1dG9wbGF5J10sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFYsU0FBUyxvQkFBb0I7QUFDM1gsT0FBTyxXQUFXO0FBS2xCLElBQU0sWUFBWSxPQUFPO0FBQUEsRUFDdkIsTUFBTTtBQUFBLEVBQ04sTUFBTSxjQUFjO0FBRWxCLFFBQUksUUFBUSxJQUFJLGVBQWdCO0FBRWhDLFVBQU0sRUFBRSxTQUFTLElBQUksTUFBTSxPQUFPLGVBQWU7QUFDakQsUUFBSTtBQUNGLGVBQVMsc0JBQXNCLEVBQUUsT0FBTyxXQUFXLEtBQUssUUFBUSxJQUFJLEVBQUUsQ0FBQztBQUFBLElBQ3pFLFNBQVMsR0FBRztBQUNWLGNBQVEsS0FBSyxrRkFBNkU7QUFDMUYsY0FBUSxLQUFLLEVBQUUsT0FBTztBQUFBLElBQ3hCO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUM7QUFBQSxFQUM5QixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osZ0JBQWdCLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDckMsWUFBWSxDQUFDLHdCQUF3Qix5QkFBeUI7QUFBQSxRQUNoRTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLFNBQVMsYUFBYSx3QkFBd0IseUJBQXlCO0FBQUEsRUFDbkY7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
