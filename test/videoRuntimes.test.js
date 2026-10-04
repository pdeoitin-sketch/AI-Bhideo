import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../worker/index.js';
import { createNodeGatewayHandler, viteVideoGateway } from '../src/services/video/gateway/nodeBridge.js';
import { parseDotEnv } from '../server/video-gateway.mjs';
import { VIDEO_PROVIDERS } from '../src/data/videoProviders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runtime bridges. The gateway core is shared, so what can break per platform
 * is the mounting: paths, env plumbing, CORS, and body handling.
 */

test('Cloudflare Worker: /health and /api/video/* both answer', async () => {
  const env = { FAL_KEY: '', BHIDEO_MAX_CLIP_USD: '0.50' };

  const root = await worker.fetch(new Request('https://gw.example/'), env, {});
  assert.equal(root.status, 200);
  const rootBody = await root.json();
  assert.equal(rootBody.ok, true);
  assert.equal(rootBody.budget.maxUsdPerClip, 0.5, 'worker reads guardrails from env bindings');
  assert.equal(root.headers.get('access-control-allow-origin'), '*');

  const models = await worker.fetch(new Request('https://gw.example/api/video/models?free=1'), env, {});
  assert.equal(models.status, 200);
  assert.ok((await models.json()).routes.length > 0);
});

test('Cloudflare Worker: unmounted paths explain where the gateway lives', async () => {
  const response = await worker.fetch(new Request('https://gw.example/generate'), { FAL_KEY: '' }, {});
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.match(body.error, /\/api\/video\/generate/);
});

test('Cloudflare Worker: preflight is CORS-permissive, POST is not required', async () => {
  const response = await worker.fetch(new Request('https://gw.example/api/video/models', { method: 'OPTIONS' }), {}, {});
  assert.equal(response.status, 204);
  assert.match(response.headers.get('access-control-allow-methods'), /POST/);
});

test('Vite plugin mounts the middleware and leaves other requests alone', () => {
  const plugin = viteVideoGateway({ basePath: '/api/video', env: {} });
  assert.equal(plugin.name, 'ai-bhideo-video-gateway');
  let mounted = 0;
  const fakeServer = { middlewares: { use: () => { mounted++; } } };
  plugin.configureServer(fakeServer);
  plugin.configurePreviewServer(fakeServer);
  assert.equal(mounted, 2, 'dev and preview servers both get the gateway');
});

test('Node bridge turns a req/res pair into a gateway response', async () => {
  const { Readable } = await import('node:stream');
  const listener = createNodeGatewayHandler({ basePath: '/api/video', env: { FAL_KEY: '' } });

  const req = Readable.from([]);
  Object.assign(req, { method: 'GET', url: '/api/video/health', headers: { host: '127.0.0.1' } });

  let status = 0;
  let headers = {};
  let body = Buffer.alloc(0);
  const res = {
    writeHead(code, extra) {
      status = code;
      headers = extra || {};
      return this;
    },
    end(chunk) {
      if (chunk) body = Buffer.concat([body, chunk]);
      return this;
    },
  };

  await listener(req, res);
  assert.equal(status, 200);
  assert.equal(headers['content-type'] || headers['Content-Type'], 'application/json', 'Headers are lower-cased');
  assert.equal(JSON.parse(body.toString()).service, 'ai-bhideo-video-gateway');
});

test('the standalone server module boots, serves, and closes', async () => {
  const { server } = await import('../server/video-gateway.mjs');
  assert.ok(server, 'the module exports its http server for tests and embedding');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    const healthBody = await health.json();
    assert.equal(healthBody.ok, true);
    assert.match(healthBody.basePath, /^\/api\/video/);

    const models = await fetch(`${base}/api/video/models?maxUsdPerSecond=0.05`);
    assert.equal(models.status, 200);
    const catalogue = await models.json();
    assert.ok(catalogue.routes.length > 0);
    catalogue.routes.forEach((route) => assert.ok(route.usdPerSecond <= 0.05));

    const missing = await fetch(`${base}/whatever`);
    assert.equal(missing.status, 404);
    assert.match((await missing.json()).hint, /\/api\/video\/health/);

    // A retired model must not be callable even when hit directly on the server.
    const retired = await fetch(`${base}/api/video/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ routeId: 'sora-2::openai', params: { prompt: 'x', durationSeconds: 8 } }),
    });
    assert.equal(retired.status, 422);
    assert.match((await retired.json()).error, /retired/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('parseDotEnv handles the shapes a developer will actually type', () => {
  const parsed = parseDotEnv(
    [
      '# comment',
      '',
      'FAL_KEY=fal-abc123',
      'export GEMINI_API_KEY="gk with spaces"',
      "MINIMAX_API_KEY='mmx-plain'",
      'KLING_SECRET_KEY=secret   # trailing comment',
      'EMPTY_VALUE=',
      'not-a-key should be ignored',
      'BHIDEO_MAX_CLIP_USD=0.50',
    ].join('\n')
  );
  assert.equal(parsed.FAL_KEY, 'fal-abc123');
  assert.equal(parsed.GEMINI_API_KEY, 'gk with spaces');
  assert.equal(parsed.MINIMAX_API_KEY, 'mmx-plain');
  assert.equal(parsed.KLING_SECRET_KEY, 'secret');
  assert.equal(parsed.EMPTY_VALUE, '');
  assert.equal(parsed['not-a-key'], undefined);
  assert.equal(parsed.BHIDEO_MAX_CLIP_USD, '0.50');
});

test('.env.example documents every provider the registry can authenticate', () => {
  const example = fs.readFileSync(path.resolve(__dirname, '../.env.example'), 'utf8');
  const parsed = parseDotEnv(example);
  const documented = Object.keys(parsed);
  for (const provider of VIDEO_PROVIDERS) {
    for (const name of [provider.envVar, ...(provider.extraEnvVars || [])].filter(Boolean)) {
      assert.ok(documented.includes(name), `.env.example must carry a slot for ${name}`);
      assert.equal(parsed[name], '', `${name} must ship empty so no key is ever committed`);
    }
  }
});
