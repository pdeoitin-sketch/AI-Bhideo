import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dual-mode entry plugin:
 * - On disk, `index.html` references the pre-compiled `./bundle/app.css` and
 *   `./bundle/app.js` so that static hosts serving the repository root directly
 *   (such as GitHub Pages "Deploy from branch: main / root" or any static HTTP
 *   server) render the full application immediately instead of a blank white
 *   screen caused by uncompiled `/src/main.jsx`.
 * - When Vite runs (`npm run dev` or `npm run build`), `transformIndexHtml`
 *   swaps those prebuilt tags back to `<script type="module" src="/src/main.jsx">`
 *   so HMR and Rollup bundling work from `src/`.
 * - After `vite build` completes, `closeBundle` refreshes `bundle/app.css`,
 *   `bundle/app.js`, and `404.html` from the latest source.
 */
function dualModeBundlePlugin() {
  return {
    name: 'ai-bhideo-dual-mode-bundle',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace(/<link[^>]*data-prebuilt-css[^>]*>\s*/g, '')
          .replace(
            /<script[^>]*data-prebuilt-js[^>]*><\/script>/,
            '<script type="module" src="/src/main.jsx"></script>'
          );
      },
    },
    closeBundle() {
      try {
        const distAssetsDir = path.resolve(__dirname, 'dist/assets');
        const bundleDir = path.resolve(__dirname, 'bundle');
        fs.mkdirSync(bundleDir, { recursive: true });

        if (fs.existsSync(distAssetsDir)) {
          const cssFile = fs.readdirSync(distAssetsDir).find((f) => f.endsWith('.css'));
          if (cssFile) {
            fs.copyFileSync(
              path.join(distAssetsDir, cssFile),
              path.join(bundleDir, 'app.css')
            );
          }
        }

        esbuild.buildSync({
          entryPoints: [path.resolve(__dirname, 'src/main.jsx')],
          bundle: true,
          format: 'iife',
          minify: true,
          target: ['es2018'],
          outfile: path.join(bundleDir, 'app.js'),
          define: {
            'process.env.NODE_ENV': '"production"',
          },
          loader: {
            '.js': 'jsx',
            '.jsx': 'jsx',
            '.css': 'empty',
          },
        });

        const indexHtmlPath = path.resolve(__dirname, 'index.html');
        const notFoundHtmlPath = path.resolve(__dirname, '404.html');
        if (fs.existsSync(indexHtmlPath)) {
          fs.copyFileSync(indexHtmlPath, notFoundHtmlPath);
        }
      } catch (err) {
        console.warn('[ai-bhideo-dual-mode-bundle] Could not refresh bundle/:', err);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dualModeBundlePlugin(), react()],
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
  },
});
