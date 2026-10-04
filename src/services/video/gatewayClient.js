/**
 * Browser transport for remote video generation.
 *
 * Three modes, chosen automatically (or pinned in the provider panel):
 *   gateway — POST to the deployed gateway (`/api/video` by default). Keys live
 *             server-side; this is the only mode that works on a static origin.
 *   byok    — same gateway, but the request carries the key the user pasted, so
 *             their own quota and billing are used. The key is sent per request
 *             and never stored by the gateway.
 *   direct  — only for providers that allow browser origins (Hugging Face).
 *
 * When none of them is reachable, callers fall back to the local renderer; the
 * studio must stay usable without any configuration at all.
 */

import { loadAccess, byokFor, loadSettings } from './providerAccess.js';
import { isProxiedDownload, pollJob, submitJob } from './runner.js';
import { getRoute } from '../../data/videoProviders.js';

export const DEFAULT_GATEWAY_BASE = '/api/video';
const PROBE_CACHE = { key: null, value: null, at: 0 };

function envValue(name) {
  try {
    return import.meta?.env?.[name];
  } catch {
    return undefined;
  }
}

export function gatewayBase(settings = loadSettings()) {
  const explicit = String(settings.gatewayUrl || envValue('VITE_BHIDEO_GATEWAY_URL') || '').trim();
  if (!explicit) return DEFAULT_GATEWAY_BASE;
  return explicit.replace(/\/+$/, '');
}

/** `fetch` indirection so tests can inject a fake transport. */
function fetcher(options = {}) {
  const impl = options.fetchImpl || globalThis.fetch;
  if (typeof impl !== 'function') throw new Error('This runtime has no fetch(); remote generation is unavailable.');
  return impl;
}

export async function probeGateway(options = {}) {
  const settings = options.settings || loadSettings();
  const base = gatewayBase(settings);
  const now = Date.now();
  if (!options.force && PROBE_CACHE.key === base && now - PROBE_CACHE.at < 15_000) return PROBE_CACHE.value;

  const result = { online: false, configuredProviders: [], priceAsOf: null, base, error: null };
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs || 3000) : null;
    const response = await fetcher(options)(`${base}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
    });
    if (timer) clearTimeout(timer);
    const contentType = response.headers?.get?.('content-type') || '';
    if (response.ok && contentType.includes('json')) {
      const payload = await response.json();
      result.online = true;
      result.configuredProviders = payload.configuredProviders || [];
      result.priceAsOf = payload.priceAsOf || null;
      result.budget = payload.budget || null;
    } else {
      result.error = `Gateway probe returned HTTP ${response.status}. Static hosts (GitHub Pages) have no gateway — remote routes need the deployed worker.`;
    }
  } catch (error) {
    result.error = error?.name === 'AbortError' ? 'Gateway probe timed out.' : error?.message || 'Gateway unreachable.';
  }
  PROBE_CACHE.key = base;
  PROBE_CACHE.at = now;
  PROBE_CACHE.value = result;
  return result;
}

export function resetGatewayProbeCache() {
  PROBE_CACHE.key = null;
  PROBE_CACHE.value = null;
  PROBE_CACHE.at = 0;
}

function decideMode(settings, route, probe) {
  const provider = route?.provider;
  if (provider?.corsSafeInBrowser && !probe?.online) return 'direct';
  if (probe?.online) {
    if (settings.keyMode === 'byok') return 'byok';
    if (settings.keyMode === 'gateway') return 'gateway';
    const serverHasKey = probe.configuredProviders?.includes(route.providerId);
    const localKey = Boolean(loadAccess()[route.providerId]?.key);
    if (serverHasKey) return 'gateway';
    if (localKey) return 'byok';
    return 'gateway';
  }
  return provider?.corsSafeInBrowser ? 'direct' : 'unavailable';
}

/**
 * Run one remote generation end to end.
 * Resolves `{ status:'completed', videoUrl|videoBase64, … }` or rejects with an
 * Error carrying the provider's message (already human-readable).
 */
export async function generateRemote({ routeId, params = {}, onProgress, signal, options = {} }) {
  const settings = options.settings || loadSettings();
  const route = getRoute(routeId) || routeId;
  const resolvedRouteId = route?.id || routeId;
  if (!route) throw new Error(`Unknown video route "${resolvedRouteId}".`);

  const probe = options.probe ?? (await probeGateway({ settings, fetchImpl: options.fetchImpl }));
  const mode = decideMode(settings, route, probe.online ? probe : null);
  if (mode === 'unavailable') {
    const error = new Error(
      `${route.provider?.name || route.providerId} cannot be called from this page: video APIs block browser origins (CORS) and no gateway is reachable at ${gatewayBase(settings)}. Deploy the gateway or add its URL in Provider Access.`
    );
    error.kind = 'no-gateway';
    throw error;
  }

  const base = mode === 'direct' ? directBase(route) : gatewayBase(settings);
  const byok = mode === 'byok' ? byokFor(route.providerId) : undefined;
  const budget = {
    maxUsdPerClip: settings.maxUsdPerClip || undefined,
    monthlyBudgetUsd: settings.monthlyBudgetUsd || undefined,
  };

  onProgress?.({ status: 'submitting', stage: `Submitting to ${route.provider?.name} via ${mode === 'direct' ? 'direct browser call' : 'gateway'}…`, progress: 4 });

  if (mode === 'direct') {
    // Providers that allow CORS can be driven straight from the browser using
    // the same protocol adapters as the gateway.
    const auth = { key: loadAccess()[route.providerId]?.key, accountId: loadAccess()[route.providerId]?.accountId };
    const started = await submitJob({ routeId: resolvedRouteId, params, auth, budget, fetchImpl: options.fetchImpl, signal, onProgress });
    if (started.status === 'completed') return { ...started, mode };
    return await pollUntilDone({ started, poll: (handle) => pollJob({ handle, auth, fetchImpl: options.fetchImpl, signal }), onProgress, options });
  }

  const started = await requestJson(`${base}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routeId: resolvedRouteId, params, byok, budget }),
    signal,
    fetchImpl: options.fetchImpl,
  });

  if (started.status === 'completed') {
    onProgress?.({ status: 'completed', stage: 'Video ready.', progress: 100 });
    return { ...started, mode, warnings: started.warnings || [] };
  }

  const warnings = started.warnings || [];
  return {
    ...(await pollUntilDone({
      started,
      poll: (handle) =>
        requestJson(`${base}/jobs/${encodeURIComponent(handle)}`, {
          signal,
          fetchImpl: options.fetchImpl,
          headers: started.keySource === 'byok' ? { 'X-Bhideo-Gateway-Key': 'byok' } : {},
        }),
      onProgress,
      options,
    })),
    mode,
    warnings,
  };
}

async function pollUntilDone({ started, poll, onProgress, options }) {
  const pollIntervalMs = options.pollIntervalMs || 5000;
  const timeoutMs = options.timeoutMs || 15 * 60_000;
  const deadline = Date.now() + timeoutMs;
  let handle = started.handle;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    await new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(0, deadline - Date.now()), pollIntervalMs)));
    const status = await poll(handle);
    if (status.status === 'completed') {
      onProgress?.({ status: 'completed', stage: 'Video ready.', progress: 100 });
      return status;
    }
    handle = status.handle || handle;
    onProgress?.({
      status: status.status || 'running',
      progress: status.progress ?? Math.min(94, 8 + attempt * 7),
      stage: status.stage || `Waiting on ${status.provider || 'the provider'}…`,
      attempt,
    });
  }
  const error = new Error(`Timed out waiting for the provider. Job handle preserved: ${String(handle).slice(0, 12)}…`);
  error.kind = 'timeout';
  error.handle = handle;
  throw error;
}

function directBase(route) {
  return route?.provider?.baseUrl || '';
}

async function requestJson(url, { method = 'GET', headers = {}, body, signal, fetchImpl } = {}) {
  const response = await fetcher({ fetchImpl })(url, { method, headers, body, signal });
  const contentType = response.headers?.get?.('content-type') || '';
  if (!contentType.includes('json')) {
    const text = await response.text().catch(() => '');
    const error = new Error(text ? `Unexpected ${response.status} response: ${text.slice(0, 180)}` : `Unexpected ${response.status} response.`);
    error.status = response.status;
    throw error;
  }
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error || `Gateway responded ${response.status}.`);
    error.status = response.status;
    error.kind = payload?.kind;
    error.details = payload?.details;
    error.missing = payload?.missing;
    throw error;
  }
  return payload;
}

/** Turn a provider URL / base64 payload into something a <video> can play. */
export async function materialiseVideo(result, { options = {}, signal } = {}) {
  const settings = options.settings || loadSettings();
  const base = gatewayBase(settings);

  if (result?.videoBase64) {
    const blob = dataUrlToBlob(result.videoBase64);
    return { blob, url: blob ? URL.createObjectURL(blob) : null, mimeType: blob?.type || 'video/mp4', via: 'inline-base64' };
  }

  const raw = result?.videoUrl || result?.originalVideoUrl;
  if (!raw) return { blob: null, url: null, mimeType: 'video/mp4', via: 'none' };

  const candidate = isProxiedDownload(raw) ? `${base}/download?url=${encodeURIComponent(raw)}` : raw;
  if (!candidate.startsWith('http') && !candidate.startsWith('/')) {
    return { blob: null, url: candidate, mimeType: 'video/mp4', via: 'relative' };
  }
  if (candidate.startsWith('/') || candidate.startsWith(base)) {
    // Through the gateway: the response is already CORS-friendly for us.
    const blob = await fetchBlob(candidate, { fetchImpl: options.fetchImpl, signal });
    if (blob) return { blob, url: URL.createObjectURL(blob), mimeType: blob.type || 'video/mp4', via: 'gateway-proxy' };
    return { blob: null, url: candidate, mimeType: 'video/mp4', via: 'gateway-url' };
  }

  // A public CDN URL: prefer it directly, and let the gateway proxy if the
  // browser cannot read it (CORS) or the origin is a static host.
  const blob = await fetchBlob(candidate, { fetchImpl: options.fetchImpl, signal });
  if (blob) return { blob, url: URL.createObjectURL(blob), mimeType: blob.type || 'video/mp4', via: 'direct-cdn' };
  const proxied = await fetchBlob(`${base}/download?url=${encodeURIComponent(candidate)}`, { fetchImpl: options.fetchImpl, signal });
  if (proxied) return { blob: proxied, url: URL.createObjectURL(proxied), mimeType: proxied.type || 'video/mp4', via: 'gateway-proxy' };
  return { blob: null, url: candidate, mimeType: 'video/mp4', via: 'remote-url' };
}

async function fetchBlob(url, { fetchImpl, signal } = {}) {
  try {
    const response = await fetcher({ fetchImpl })(url, { method: 'GET', signal });
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

function dataUrlToBlob(dataUrl) {
  try {
    const [header, payload] = String(dataUrl).split(',');
    const mimeType = /data:([^;]+)/.exec(header)?.[1] || 'video/mp4';
    if (typeof atob !== 'function') return null;
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  } catch {
    return null;
  }
}

export async function fetchRemoteCatalog(options = {}) {
  const settings = options.settings || loadSettings();
  return requestJson(`${gatewayBase(settings)}/models`, { fetchImpl: options.fetchImpl });
}
