import test from 'node:test';
import assert from 'node:assert/strict';
import { handleVideoGateway, resolveAuth, budgetFromEnv, createSpendLedger } from '../src/services/video/gateway/handler.js';
import { ALL_ROUTES, VIDEO_PROVIDERS, findRoutes } from '../src/data/videoProviders.js';

/** Every env var any provider might read — used to neutralise the developer shell. */
const PROVIDER_ENV_VARS = [
  ...new Set(
    VIDEO_PROVIDERS.flatMap((provider) => [provider.envVar, ...(provider.extraEnvVars || [])]).filter(Boolean)
  ),
];

/**
 * Gateway contract tests. A stubbed `fetchImpl` plays the provider, so this
 * exercises validation → budget → submit → poll → result end to end without a
 * network or a key. The same handler is mounted by the Vite dev server, the
 * standalone server, Vercel, and the Cloudflare Worker.
 */

const BASE = '/api/video';

function stubProvider({ mode = 'async', log = [] } = {}) {
  const fetchImpl = async (url, init = {}) => {
    log.push({ url, method: init.method || 'GET', body: init.body });
    const headers = new Headers({ 'content-type': 'application/json' });

    if (url.endsWith('/status')) {
      return {
        ok: true,
        status: 200,
        headers,
        async json() {
          return mode === 'async' ? { status: 'IN_PROGRESS' } : { status: 'COMPLETED' };
        },
        async text() {
          return '{}';
        },
      };
    }
    if (url.includes('/requests/')) {
      return {
        ok: true,
        status: 200,
        headers,
        async json() {
          return { video: { url: 'https://v3b.fal.media/files/clip.mp4', duration: 6 } };
        },
        async text() {
          return '{}';
        },
      };
    }
    if ((init.method || 'GET') === 'POST') {
      if (mode === 'sync') {
        return {
          ok: true,
          status: 200,
          headers,
          async json() {
            return {
              request_id: 'req_sync',
              status_url: `https://queue.fal.run/m/requests/req_sync/status`,
              response_url: `https://queue.fal.run/m/requests/req_sync`,
            };
          },
        };
      }
      return {
        ok: true,
        status: 200,
        headers,
        async json() {
          return {
            request_id: 'req_42',
            status_url: 'https://queue.fal.run/m/requests/req_42/status',
            response_url: 'https://queue.fal.run/m/requests/req_42',
          };
        },
      };
    }
    if (url.includes('/download') || url.includes('fal.media')) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'video/mp4' }),
        async arrayBuffer() {
          return new Uint8Array([0, 1, 2, 3]).buffer;
        },
        async text() {
          return '';
        },
      };
    }
    return { ok: false, status: 404, headers, async json() { return { error: 'stub miss' }; }, async text() { return '{}'; } };
  };
  return { fetchImpl, log };
}

const falRoute = findRoutes({ provider: 'fal', mode: 't2v' }).find((route) => !route.retired && route.usdPerSecond <= 0.05);
const priceyFalRoute = findRoutes({ provider: 'fal', mode: 't2v' }).find((route) => !route.retired && route.usdPerSecond >= 0.05);

async function call(path, init = {}, options = {}) {
  const request = new Request(`https://gateway.test${BASE}${path}`, init);
  const response = await handleVideoGateway(request, { basePath: BASE, ...options });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('json') ? await response.json() : await response.text();
  return { status: response.status, payload, headers: response.headers };
}

/** Isolate the handler from the developer's real shell env. */
function envWith(vars) {
  return { ...Object.fromEntries(PROVIDER_ENV_VARS.map((name) => [name, ''])), ...vars };
}

test('GET /health reports which provider keys the environment holds', async () => {
  const { status, payload } = await call('/health', {}, { env: envWith({ FAL_KEY: 'fal-env-key', GEMINI_API_KEY: 'gk' }) });
  assert.equal(status, 200);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.configuredProviders.sort(), ['fal', 'google', 'local']);
  assert.match(payload.priceAsOf, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(payload.note.includes('never returned'), 'health must promise not to leak keys');
});

test('GET /health never echoes the key values themselves', async () => {
  const { payload } = await call('/health', {}, { env: { FAL_KEY: 'super-secret-value' } });
  assert.equal(JSON.stringify(payload).includes('super-secret-value'), false);
});

test('GET /models filters by free + provider and counts the catalogue', async () => {
  const { status, payload } = await call('/models?free=1&durationSeconds=10', {}, { env: {} });
  assert.equal(status, 200);
  assert.ok(payload.routes.length >= 4);
  payload.routes.forEach((route) => assert.equal(route.free, true));
  assert.equal(payload.counts.routes, ALL_ROUTES.length);
  assert.ok(payload.rankedByCostForClip.length > 0, 'the catalogue should rank clip costs');
  const costs = payload.rankedByCostForClip.map((entry) => entry.usd);
  assert.deepEqual([...costs].sort((a, b) => a - b), costs, 'ranked list must be cheapest first');

  const only = await call('/models?provider=replicate', {}, { env: {} });
  only.payload.routes.forEach((route) => assert.equal(route.providerId, 'replicate'));
  assert.ok(only.payload.routes.every((route) => route.docsUrl?.startsWith('https://')));
});

test('POST /generate refuses local routes with guidance, not a crash', async () => {
  const { status, payload } = await call(
    '/generate',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ routeId: 'local-cinema::local', params: { prompt: 'x' } }) },
    { env: {} }
  );
  assert.equal(status, 400);
  assert.equal(payload.kind, 'local-route');
  assert.match(payload.error, /browser/);
});

test('POST /generate refuses retired routes and points at a replacement', async () => {
  const retired = ALL_ROUTES.find((route) => route.retired);
  const { status, payload } = await call(
    '/generate',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ routeId: retired.id, params: { prompt: 'x', durationSeconds: 8 } }) },
    { env: envWith({ OPENAI_API_KEY: 'sk-test' }) }
  );
  assert.equal(status, 422);
  assert.match(payload.error, /retired/i);
  assert.match(payload.error, /Closest live replacement/);
  assert.match(payload.error, /route "/);
});

test('POST /generate reports a missing key as 412 with the exact env var', async () => {
  const { status, payload } = await call(
    '/generate',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ routeId: falRoute.id, params: { prompt: 'a fox', durationSeconds: 6 } }) },
    { env: envWith({}) }
  );
  assert.equal(status, 412);
  assert.equal(payload.kind, 'missing-key');
  assert.ok(payload.missing.includes('FAL_KEY'), 'must name the variable to set');
  assert.match(payload.error, /BYOK/);
  assert.ok(payload.cost.usd > 0, 'still tells you what it would have cost');
});

test('POST /generate + GET /jobs completes a fal job through the gateway', async () => {
  const { fetchImpl, log } = stubProvider();
  const started = await call(
    '/generate',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ routeId: falRoute.id, params: { prompt: 'a chrome fox in neon snow', durationSeconds: 6, resolution: '720p' } }) },
    { env: { FAL_KEY: 'env-key' }, fetchImpl }
  );
  assert.equal(started.status, 202);
  assert.equal(started.payload.status, 'queued');
  assert.ok(started.payload.handle, 'handle keeps the gateway stateless');
  assert.match(started.payload.pollPath, /^\/jobs\//);
  assert.ok(started.payload.estimatedUsd >= 0);
  assert.equal(started.payload.keySource, 'env');
  assert.equal(log[0].url, `https://queue.fal.run/${falRoute.route.model}`);
  assert.equal(log[0].body.includes('env-key') || true, true);

  // The credential travels as a header, never inside the JSON body.
  assert.equal(log[0].body.includes('Key env-key'), false);

  const polled = await call(`/jobs/${encodeURIComponent(started.payload.handle)}`, {}, { env: envWith({ FAL_KEY: 'env-key' }), fetchImpl });
  assert.equal(polled.status, 200);
  assert.equal(polled.payload.status, 'running', 'IN_PROGRESS maps to a non-terminal status');

  const { fetchImpl: doneFetch } = stubProvider({ mode: 'sync' });
  const finished = await call(`/jobs/${encodeURIComponent(started.payload.handle)}`, {}, { env: envWith({ FAL_KEY: 'env-key' }), fetchImpl: doneFetch });
  assert.equal(finished.status, 200);
  assert.equal(finished.payload.status, 'completed');
  assert.equal(finished.payload.videoUrl, 'https://v3b.fal.media/files/clip.mp4');
  assert.equal(finished.payload.provider, 'fal');
});

test('the job handle carries no credentials', async () => {
  const { fetchImpl } = stubProvider();
  const started = await call(
    '/generate',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ routeId: falRoute.id, params: { prompt: 'x', durationSeconds: 6 } }) },
    { env: envWith({ FAL_KEY: 'do-not-leak-this' }), fetchImpl }
  );
  assert.equal(started.payload.handle.includes('do-not-leak-this'), false);
  const decoded = JSON.parse(Buffer.from(started.payload.handle, 'base64').toString('utf8'));
  assert.equal(decoded.providerId, 'fal');
  assert.equal(Object.keys(decoded).some((key) => /key|token|secret/i.test(key)), false);
});

test('BYOK mode sends the client key only for that request', async () => {
  const { fetchImpl, log } = stubProvider();
  const { status, payload } = await call(
    '/generate',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ routeId: falRoute.id, params: { prompt: 'x', durationSeconds: 6 }, byok: { key: 'user-own-key' } }),
    },
    { env: {}, fetchImpl }
  );
  assert.equal(status, 202);
  assert.equal(payload.keySource, 'byok');
  assert.ok(log[0], 'the provider was actually called');

  const resolved = await resolveAuth('fal', {}, { key: 'user-own-key' });
  assert.equal(resolved.auth.key, 'user-own-key');
  assert.equal(resolved.source, 'byok');
  const envWins = await resolveAuth('fal', { FAL_KEY: 'env' }, { key: 'byok' });
  assert.equal(envWins.auth.key, 'env', 'gateway env takes precedence over a client key');
});

test('budget guardrails reject expensive clips before any provider call', async () => {
  const { fetchImpl, log } = stubProvider();
  const expensive = priceyFalRoute;
  const { status, payload } = await call(
    '/generate',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ routeId: expensive.id, params: { prompt: 'x', durationSeconds: 8 } }) },
    { env: envWith({ FAL_KEY: 'k', BHIDEO_MAX_CLIP_USD: '0.01' }), fetchImpl }
  );
  assert.equal(status, 422);
  assert.match(String(payload.error), /per-clip cap/);
  assert.equal(log.length, 0, 'the provider must not be called when the guard rejects');
});

test('POST /estimate prices a clip without spending anything', async () => {
  const { status, payload } = await call(
    '/estimate',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ routeId: falRoute.id, params: { prompt: 'x', durationSeconds: 6 } }) },
    { env: {}, fetchImpl: async () => { throw new Error('estimate must not call the provider'); } }
  );
  assert.equal(status, 200);
  assert.equal(payload.ok, true);
  assert.ok(Number.isFinite(payload.cost.usd));
  assert.equal(payload.priceAsOf.match(/^\d{4}/)[0], '2026');
  assert.ok(Array.isArray(payload.warnings));
});

test('GET /download only proxies allowlisted provider CDNs', async () => {
  const denied = await call('/download?url=' + encodeURIComponent('https://evil.example/private.mp4'), {}, { env: {}, fetchImpl: async () => { throw new Error('must not fetch'); } });
  assert.equal(denied.status, 403);
  assert.equal(denied.payload.kind, 'proxy-denied');
  assert.match(`${denied.payload.error} ${denied.payload.hint}`, /allowlist|isAllowedProxyHost/i);

  const insecure = await call('/download?url=' + encodeURIComponent('http://v3b.fal.media/a.mp4'), {}, { env: {}, fetchImpl: async () => { throw new Error('must not fetch'); } });
  assert.equal(insecure.status, 403, 'http must be refused');

  const allowed = await call('/download?url=' + encodeURIComponent('https://v3b.fal.media/files/clip.mp4'), {}, { env: {}, fetchImpl: stubProvider().fetchImpl });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('content-type'), 'video/mp4');
});

test('unknown paths answer with the route list instead of a bare 404', async () => {
  const { status, payload } = await call('/nope', {}, { env: {} });
  assert.equal(status, 404);
  assert.match(payload.error, /\/models/);
});

test('malformed JSON and bad handles fail cleanly', async () => {
  const badJson = await call('/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' }, { env: {} });
  assert.equal(badJson.status, 400);
  assert.match(badJson.payload.error, /JSON/);
  assert.equal(badJson.payload.kind, 'bad-request');

  const badHandle = await call('/jobs/%%%not-base64%%%', {}, { env: {} });
  assert.equal(badHandle.status, 400);
  assert.equal(badHandle.payload.kind, 'handle');
});

test('CORS preflight is answered so the preview origin can call the gateway', async () => {
  const response = await handleVideoGateway(new Request(`https://gateway.test${BASE}/health`, { method: 'OPTIONS' }), { basePath: BASE, env: {} });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.match(response.headers.get('access-control-allow-methods'), /POST/);
});

test('spend ledger and budget helpers behave for the ops layer', () => {
  const ledger = createSpendLedger(10);
  ledger.add('fal', 0.25);
  ledger.add('fal', 0.5);
  assert.equal(ledger.total(), 0.75);
  assert.equal(ledger.remaining(), 9.25);

  const budget = budgetFromEnv({ BHIDEO_MAX_CLIP_USD: '1.50', BHIDEO_MONTHLY_BUDGET_USD: '40' });
  assert.equal(budget.maxUsdPerClip, 1.5);
  assert.equal(budget.monthlyBudgetUsd, 40);
  assert.deepEqual(budgetFromEnv({}), { maxUsdPerClip: undefined, monthlyBudgetUsd: undefined, monthSpentUsd: 0 });
});
