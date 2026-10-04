/**
 * Runtime bridges around the single `handleVideoGateway` fetch handler, so the
 * exact same gateway runs in: the Vite dev server (HMR), a standalone Node
 * process, a Vercel function, and a Cloudflare Worker.
 */

import { handleVideoGateway, createSpendLedger } from './handler.js';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    req.on('error', reject);
  });
}

/**
 * @returns {(req, res) => Promise<void>} Node request listener for the base path.
 */
export function createNodeGatewayHandler({ basePath = '/api/video', env, fetchImpl, spendLimitUsd } = {}) {
  const spendLedger = createSpendLedger(spendLimitUsd);
  return async function gatewayRequestListener(req, res) {
    try {
      const host = req.headers.host || 'localhost';
      const url = new URL(req.url, `http://${host}`);
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers || {})) {
        if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry));
        else if (value !== undefined) headers.set(name, String(value));
      }
      const method = (req.method || 'GET').toUpperCase();
      const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);
      const request = new Request(url.toString(), { method, headers, body });
      const response = await handleVideoGateway(request, {
        env: env ?? (typeof process !== 'undefined' ? process.env : {}) ?? {},
        basePath,
        fetchImpl,
        spendLedger,
      });
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      const buffer = Buffer.from(await response.arrayBuffer());
      res.end(buffer);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: error?.message || 'Gateway failed.' }));
    }
  };
}

/** Vite plugin: mounts the gateway during `npm run dev` and `npm run preview`. */
export function viteVideoGateway({ basePath = '/api/video', env = process.env, port = 8787 } = {}) {
  const listener = createNodeGatewayHandler({ basePath, env });
  return {
    name: 'ai-bhideo-video-gateway',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!String(req.url || '').startsWith(basePath)) return next();
        req.url = req.url.slice(basePath.length) || '/';
        return listener(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!String(req.url || '').startsWith(basePath)) return next();
        req.url = req.url.slice(basePath.length) || '/';
        return listener(req, res);
      });
    },
  };
}
