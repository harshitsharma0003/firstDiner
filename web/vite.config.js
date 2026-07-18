import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // The console lives under /web/ (e.g. thefirstdiner.com/web/login).
  base: '/web/',
  plugins: [react()],
  // Output into dist/web so the published tree serves everything under /web/.
  build: { outDir: 'dist/web' },
  server: {
    port: 5173,
    // Proxy API calls to the backend during development.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
