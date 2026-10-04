/**
 * Cloudflare Worker entry for the video gateway.
 *
 * Deploy:  npx wrangler deploy   (config in wrangler.toml)
 * Secrets: npx wrangler secret put FAL_KEY   (repeat per provider)
 *
 * Runs on `workerd`, where `env` carries both bindings and secrets — that is
 * the only place credentials live. Kling's JWT is signed per request with
 * Web Crypto, which the Worker runtime provides, so no Node polyfill is needed.
 */

import { handleVideoGateway } from '../src/services/video/gateway/handler.js';

const BASE_PATH = '/api/video';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      const response = await handleVideoGateway(new Request(`${url.origin}${BASE_PATH}/health`, { method: 'GET' }), { env, basePath: BASE_PATH });
      return withCors(response);
    }
    if (!url.pathname.startsWith(BASE_PATH)) {
      return new Response(JSON.stringify({ error: `Not mounted here. Use ${BASE_PATH}/health, ${BASE_PATH}/models, ${BASE_PATH}/generate.` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    return withCors(await handleVideoGateway(request, { env, basePath: BASE_PATH }));
  },
};

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Bhideo-Gateway-Key');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
