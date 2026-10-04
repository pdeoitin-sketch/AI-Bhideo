/**
 * Vercel (Node runtime) entry for the video gateway.
 *
 * Deployed at `https://<project>.vercel.app/api/video`, so the studio defaults
 * to a relative `/api/video` base URL and needs no extra configuration.
 * Add the provider keys (FAL_KEY, REPLICATE_API_TOKEN, GEMINI_API_KEY, …) in
 * Project Settings → Environment Variables; see `.env.example`.
 *
 * Vercel hands a catch-all function the original `req.url` (for example
 * `/api/video/generate`), which is exactly what the shared handler expects, so
 * no path rewriting is needed here.
 */

import { createNodeGatewayHandler } from '../../src/services/video/gateway/nodeBridge.js';

export const config = { runtime: 'nodejs18' };

const handler = createNodeGatewayHandler({ basePath: '/api/video' });

export default async function vercelHandler(req, res) {
  return handler(req, res);
}
