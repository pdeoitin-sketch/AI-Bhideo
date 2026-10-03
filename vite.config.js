import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset URLs so the production build also works when it is served
  // from a sub-path (GitHub Pages, static hosts, previews).
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  }
});
