import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev, the Vite server (npm run dev) and the API server
      // (npm run dev:server) run on different ports — this forwards
      // /api/* calls to the backend so fetch('/api/db') just works.
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
