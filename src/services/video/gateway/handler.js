/**
 * The video gateway: one fetch-based handler that works unchanged in a Vite dev
 * middleware, a plain Node server, a Vercel function, and a Cloudflare Worker.
 *
 * Why it exists
 *  - CORS: almost no video vendor allows a browser origin, so calls must be
 *    relayed from a server.
 *  - Secrets: env keys never reach the client. The browser may instead send its
 *    own BYOK key for a single request ("bring your own key" mode), which the
 *    gateway uses and never stores.
 *  - Budget: the per-clip cap and monthly ceiling are enforced here as well as
 *    in the UI, so a crafted request cannot spend past the guardrails.
 *  - Statelessness: job state is packed into an opaque `handle`, so a
 *    scale-to-zero function can answer the next poll without storage.
 */

import { PROVIDER_BY_ID, VIDEO_MODELS, VIDEO_PROVIDERS, ALL_ROUTES, PRICE_AS_OF } from '../../../data/videoProviders.js';
import { formatUsd, rankRoutesByCost } from '../costEngine.js';
import { decodeJob, decodeProxiedDownload, isAllowedProxyHost, isProxiedDownload, pollJob, previewJob, submitJob } from '../runner.js';
import { describeRoute, curlForRoute } from '../protocols/index.js';
import { klingJwt } from '../auth/jwt.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Bhideo-Gateway-Key',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Max-Age': '600',
};

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errorPayload(error) {
  return {
    error: error?.message || 'Unexpected gateway error.',
    kind: error?.kind || 'internal',
    details: error?.details ?? null,
  };
}

/**
 * Credentials for one provider: environment first (server-held), then the
 * request's BYOK value. Returns `{ auth, source }` or `{ missing: [...] }`.
 */
export async function resolveAuth(providerId, env = {}, byok = {}, { cryptoObj } = {}) {
  const provider = PROVIDER_BY_ID[providerId] || {};
  const missing = [];
  const auth = {};

  if (providerId === 'kling') {
    const accessKey = env.KLING_ACCESS_KEY || byok.accessKey;
    const secretKey = env.KLING_SECRET_KEY || byok.secretKey;
    if (!accessKey || !secretKey) return { missing: ['KLING_ACCESS_KEY', 'KLING_SECRET_KEY'] };
    try {
      auth.jwt = await klingJwt({ accessKey, secretKey, cryptoObj });
      auth.key = auth.jwt;
      return { auth, source: accessKey === env.KLING_ACCESS_KEY ? 'env' : 'byok' };
    } catch (error) {
      return { missing: ['KLING_JWT'], error: error.message };
    }
  }

  const envKey = provider.envVar ? env[provider.envVar] : undefined;
  const byokKey = byok.key;
  if (envKey) auth.key = envKey;
  else if (byokKey) auth.key = byokKey;
  else if (provider.envVar) missing.push(provider.envVar);

  for (const name of provider.extraEnvVars || []) {
    const value = env[name] || byok[name];
    if (!value) {
      missing.push(name);
    } else if (name === 'CLOUDFLARE_ACCOUNT_ID') {
      auth.accountId = value;
    } else {
      auth[name] = value;
    }
  }

  if (providerId === 'cloudflare' && !auth.accountId && env.CLOUDFLARE_ACCOUNT_ID) auth.accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (providerId === 'custom' && env.BHIDEO_CUSTOM_VIDEO_URL) auth.baseUrl = env.BHIDEO_CUSTOM_VIDEO_URL;
  if (byok.baseUrl) auth.baseUrl = byok.baseUrl;

  return missing.length ? { missing, provider } : { auth, source: envKey ? 'env' : byokKey ? 'byok' : 'none' };
}

export function budgetFromEnv(env = {}) {
  const maxUsdPerClip = Number(env.BHIDEO_MAX_CLIP_USD);
  const monthlyBudgetUsd = Number(env.BHIDEO_MONTHLY_BUDGET_USD);
  return {
    maxUsdPerClip: Number.isFinite(maxUsdPerClip) && maxUsdPerClip > 0 ? maxUsdPerClip : undefined,
    monthlyBudgetUsd: Number.isFinite(monthlyBudgetUsd) && monthlyBudgetUsd > 0 ? monthlyBudgetUsd : undefined,
    monthSpentUsd: 0,
  };
}

/** Workers/edge runtimes have no `process`, so read env defensively. */
function defaultEnv() {
  try {
    return typeof process !== 'undefined' && process.env ? process.env : {};
  } catch {
    return {};
  }
}

/**
 * @param {Request} request
 * @param {{env?: object, basePath?: string, fetchImpl?: Function, spendLedger?: Map<string,number>}} [options]
 */
export async function handleVideoGateway(request, options = {}) {
  const { env = defaultEnv(), basePath = '', fetchImpl, spendLedger } = options;
  const url = new URL(request.url);
  const pathname = stripBase(url.pathname, basePath);
  const method = (request.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    if (pathname === '/health' || pathname === '/') return json(200, health(env));
    if (pathname === '/models' && method === 'GET') return json(200, catalog(url, env));
    if (pathname === '/estimate' && method === 'POST') {
      const body = await readJson(request);
      const preview = previewJob({ routeId: body.routeId, params: body.params || {}, budget: { ...budgetFromEnv(env), ...body.budget } });
      return json(preview.ok ? 200 : 422, { ...preview, priceAsOf: PRICE_AS_OF });
    }
    if (pathname === '/describe' && method === 'GET') {
      const routeId = url.searchParams.get('routeId');
      const route = ALL_ROUTES.find((entry) => entry.id === routeId);
      if (!route) return json(404, { error: `Unknown route "${routeId}".` });
      return json(200, { route: routeSummary(route), request: describeRoute(route, { params: {} }), curl: curlForRoute(route, { params: { prompt: '…', durationSeconds: 5 } }) });
    }
    if (pathname === '/generate' && method === 'POST') return await handleGenerate(request, { env, fetchImpl, spendLedger });
    if (pathname.startsWith('/jobs/') && method === 'GET') return await handlePoll({ url, pathname }, { env, fetchImpl, basePath, spendLedger });
    if (pathname === '/download' && method === 'GET') return await handleDownload({ url }, { env, fetchImpl });
    return json(404, { error: `Unknown gateway path "${pathname}". Try /health, /models, /estimate, /generate, /jobs/{handle}, /download?url=.` });
  } catch (error) {
    return json(error?.status || 500, errorPayload(error));
  }
}

async function handleGenerate(request, { env, fetchImpl, spendLedger }) {
  const body = await readJson(request);
  const route = ALL_ROUTES.find((entry) => entry.id === body.routeId);
  if (!route) return json(404, { error: `Unknown route "${body.routeId}". GET /models lists the valid ids.` });

  if (route.protocol === 'local') {
    return json(400, {
      error: 'The local renderer runs in the browser against the studio canvas — the gateway cannot render it. Call it from the studio instead.',
      kind: 'local-route',
    });
  }

  const preview = previewJob({ routeId: body.routeId, params: body.params || {}, budget: mergeBudget(env, body, spendLedger) });
  if (!preview.ok) return json(422, { error: preview.errors.join(' '), kind: 'validation', warnings: preview.warnings, cost: preview.cost });

  const providerId = route.providerId;
  const { auth, missing, source, error: authError } = await resolveAuth(providerId, env, body.byok || {}, { cryptoObj: globalThis.crypto });
  if (missing?.length) {
    return json(412, {
      error: `${PROVIDER_BY_ID[providerId]?.name || providerId} is not configured on this gateway. Set ${missing.join(' + ')} in the server environment, or paste your own key in the studio's provider panel (BYOK).`,
      kind: 'missing-key',
      missing,
      cost: preview.cost,
    });
  }
  if (authError) return json(412, { error: authError, kind: 'auth' });

  try {
    const started = await submitJob({
      routeId: body.routeId,
      params: body.params || {},
      auth: { ...auth, baseUrl: auth.baseUrl || route.route.baseUrl },
      fetchImpl,
      budget: mergeBudget(env, body, spendLedger),
    });
    if (started.status === 'completed') recordSpend(spendLedger, providerId, started.estimatedUsd);
    return json(202, {
      ...started,
      keySource: source,
      warnings: preview.warnings,
      cost: preview.cost,
      priceAsOf: PRICE_AS_OF,
      pollPath: started.handle ? `/jobs/${started.handle}` : null,
    });
  } catch (error) {
    return json(error?.status || 502, { ...errorPayload(error), routeId: body.routeId, cost: preview.cost });
  }
}

async function handlePoll({ url, pathname }, { env, fetchImpl, basePath, spendLedger }) {
  const handle = safeDecodeComponent(String(pathname).replace(/^\/jobs\//, ''));
  const decoded = safeDecodeHandle(handle);
  if (!decoded) return json(400, { error: 'Job handle is malformed.', kind: 'handle' });

  const providerId = decoded.providerId || ALL_ROUTES.find((route) => route.id === decoded.routeId)?.providerId;
  const { auth, missing } = await resolveAuth(providerId, env, {}, { cryptoObj: globalThis.crypto });
  if (missing?.length) return json(412, { error: `${providerId} needs ${missing.join(' + ')} to poll this job.`, kind: 'missing-key' });

  try {
    const result = await pollJob({ handle, auth, fetchImpl });
    if (result.status === 'completed') {
      recordSpend(spendLedger, providerId, result.estimatedUsd);
      if (result.originalVideoUrl && !result.videoUrl) result.videoUrl = result.originalVideoUrl;
    }
    return json(200, { ...result, handle: result.handle || handle, basePath });
  } catch (error) {
    return json(error?.status || 502, errorPayload(error));
  }
}

async function handleDownload({ url }, { env, fetchImpl }) {
  const raw = url.searchParams.get('url') || '';
  const target = isProxiedDownload(raw) ? decodeProxiedDownload(raw) : raw;
  if (!isAllowedProxyHost(target)) {
    return json(403, {
      error: 'That download host is not on the gateway allowlist.',
      kind: 'proxy-denied',
      hint: 'Add the vendor CDN to isAllowedProxyHost() in src/services/video/runner.js, or use a route whose URL is already public.',
    });
  }
  const route = ALL_ROUTES.find((entry) => entry.providerId === 'google' && target.includes('generativelanguage.googleapis.com'));
  const { auth } = await resolveAuth(route?.providerId || 'google', env, {}, { cryptoObj: globalThis.crypto });
  const headers = {};
  if (auth?.key) headers['x-goog-api-key'] = auth.key;
  const response = await (fetchImpl || fetch)(target, { headers });
  if (!response.ok) return json(response.status, { error: `Upstream download failed (${response.status}).`, kind: 'proxy' });
  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'video/mp4',
      'Cache-Control': 'private, max-age=3600',
      ...CORS_HEADERS,
    },
  });
}

/** A stray `%` in a URL segment must be a 400, not a URIError 500. */
function safeDecodeComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function safeDecodeHandle(handle) {
  try {
    return decodeJob(handle);
  } catch {
    return null;
  }
}

function mergeBudget(env, body, spendLedger) {
  const fromEnv = budgetFromEnv(env);
  const spent = spendLedger?.total?.() ?? 0;
  return { ...fromEnv, monthSpentUsd: spent, ...(body.budget || {}) };
}

function recordSpend(spendLedger, providerId, usd) {
  if (!spendLedger || !Number.isFinite(usd)) return;
  spendLedger.add(providerId, usd);
}

export function health(env = {}) {
  const configured = VIDEO_PROVIDERS.filter((provider) => {
    if (provider.id === 'local') return true;
    if (provider.id === 'kling') return Boolean(env.KLING_ACCESS_KEY && env.KLING_SECRET_KEY);
    return provider.envVar ? Boolean(env[provider.envVar]) : false;
  }).map((provider) => provider.id);
  return {
    ok: true,
    service: 'ai-bhideo-video-gateway',
    priceAsOf: PRICE_AS_OF,
    configuredProviders: configured,
    freeProviders: ['local', 'cloudflare'],
    budget: budgetFromEnv(env),
    note: 'Keys are read from the environment (or a per-request BYOK key) and are never returned by this API.',
  };
}

function routeSummary(route) {
  return {
    id: route.id,
    model: route.model.name,
    modelId: route.modelId,
    provider: route.provider?.name,
    providerId: route.providerId,
    protocol: route.protocol,
    usdPerSecond: route.usdPerSecond,
    free: route.free,
    requiresKey: route.requiresKey,
    retired: route.retired,
    status: route.model.status,
    capabilities: route.model.capabilities,
    pricing: {
      model: route.model.pricing,
      provider: route.provider?.price,
      route: route.route.price,
      asOf: PRICE_AS_OF,
    },
    docsUrl: route.provider?.docsUrl,
    verifySlugs: Boolean(route.route.verify || route.provider?.verifySlugs),
  };
}

export function catalog(search = new URLSearchParams(), env = {}) {
  // Callers hand us either a Request URL or a URLSearchParams; normalise both.
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search?.search ?? '');
  const provider = params.get('provider');
  const mode = params.get('mode');
  const free = params.get('free') === '1';
  const includeRetired = params.get('includeRetired') === '1';
  const maxUsd = Number(params.get('maxUsdPerSecond'));
  const routes = ALL_ROUTES.filter((route) => {
    if (provider && route.providerId !== provider) return false;
    if (mode && !(route.model.capabilities?.modes || []).includes(mode)) return false;
    if (free && !route.free) return false;
    if (!includeRetired && route.retired) return false;
    if (Number.isFinite(maxUsd) && route.usdPerSecond > maxUsd) return false;
    return true;
  }).map(routeSummary);
  const durationSeconds = Number(params.get('durationSeconds')) || 8;
  return {
    priceAsOf: PRICE_AS_OF,
    counts: { models: VIDEO_MODELS.length, providers: VIDEO_PROVIDERS.length, routes: ALL_ROUTES.length },
    configuredProviders: health(env).configuredProviders,
    routes,
    rankedByCostForClip: rankRoutesByCost(
      ALL_ROUTES.filter((route) => !route.retired).slice(0, 40),
      { durationSeconds }
    ).slice(0, 15).map((entry) => ({
      id: entry.route.id,
      model: entry.route.model.name,
      provider: entry.route.provider?.name,
      usd: entry.cost.usd,
      credits: entry.cost.credits,
      note: entry.cost.note,
    })),
  };
}

function stripBase(pathname, basePath) {
  if (basePath && pathname.startsWith(basePath)) return pathname.slice(basePath.length) || '/';
  return pathname || '/';
}

async function readJson(request) {
  let text = '';
  try {
    text = await request.text();
    return text ? JSON.parse(text) : {};
  } catch (cause) {
    const error = new Error(text ? 'Request body must be valid JSON.' : 'Request body must be JSON.');
    error.status = 400;
    error.kind = 'bad-request';
    error.details = cause?.message;
    throw error;
  }
}

export function formatUsdSafe(value) {
  return formatUsd(value);
}

/** In-memory monthly spend ledger for dev; swap for KV/Redis in production. */
export function createSpendLedger(limitUsd) {
  const entries = new Map();
  return {
    add(providerId, usd) {
      entries.set(providerId, (entries.get(providerId) || 0) + usd);
    },
    total() {
      let sum = 0;
      entries.forEach((value) => {
        sum += value;
      });
      return sum;
    },
    remaining() {
      return Number.isFinite(limitUsd) ? +(limitUsd - this.total()).toFixed(2) : Infinity;
    },
    entries,
  };
}
