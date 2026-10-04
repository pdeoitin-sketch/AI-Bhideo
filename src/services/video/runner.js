/**
 * Job runner: submit → poll → result, shared by the browser client and the
 * serverless gateway so both enforce identical validation and budget rules.
 *
 * The gateway stays stateless: everything needed to poll a job is packed into a
 * base64 `handle` (never containing credentials), so a Vercel/Cloudflare
 * function can answer the next poll without a database.
 */

import { ALL_ROUTES, ROUTE_BY_ID, getRoute } from '../../data/videoProviders.js';
import { assertWithinBudget, estimateClipCost, formatUsd } from './costEngine.js';
import { decodeJob, encodeJob, joinUrl } from './protocols/util.js';
import { protocolForRoute, validateRouteRequest } from './protocols/index.js';
import { localProtocol } from './protocols/local.js';

export class VideoJobError extends Error {
  constructor(message, { status = 400, kind = 'job', details } = {}) {
    super(message);
    this.name = 'VideoJobError';
    this.status = status;
    this.kind = kind;
    this.details = details;
  }
}

export function resolveRoute(routeId) {
  const route = typeof routeId === 'string' ? getRoute(routeId) : routeId;
  if (!route) throw new VideoJobError(`Unknown video route "${routeId}".`, { status: 404, kind: 'route' });
  return route;
}

/** Validate + estimate. Returns `{ ok, errors, warnings, cost }`. */
export function previewJob({ routeId, params = {}, budget = {} }) {
  const route = ROUTE_BY_ID[routeId] || null;
  if (!route) return { ok: false, errors: [`Unknown video route "${routeId}".`], warnings: [], cost: null };
  const validation = validateRouteRequest(route, params);
  const cost = estimateClipCost(route, validation.params);
  const budgetCheck = assertWithinBudget(route, { ...validation.params, ...budget });
  return {
    ok: validation.ok && budgetCheck.ok,
    errors: [...validation.errors, ...(budgetCheck.ok ? [] : [budgetCheck.message])],
    warnings: validation.warnings,
    params: validation.params,
    mode: validation.mode,
    cost: budgetCheck.cost || cost,
    route: { id: route.id, modelId: route.modelId, providerId: route.providerId, protocol: route.protocol },
  };
}

/**
 * Start a job. Returns either a pending handle or an already-completed result
 * (Cloudflare replies synchronously, and Replicate honours `Prefer: wait`).
 */
export async function submitJob({ routeId, params = {}, auth = {}, fetchImpl, signal, budget = {}, onProgress }) {
  const route = resolveRoute(routeId);
  const validation = validateRouteRequest(route, params);
  if (!validation.ok) {
    throw new VideoJobError(validation.errors.join(' '), { status: 422, kind: 'validation', details: validation.errors });
  }
  const budgetCheck = assertWithinBudget(route, { ...validation.params, ...budget });
  if (!budgetCheck.ok) throw new VideoJobError(budgetCheck.message, { status: 402, kind: 'budget', details: budgetCheck });

  const protocol = protocolForRoute(route);
  const cost = estimateClipCost(route, validation.params);
  const requestParams = { ...validation.params, model: route.route.model };

  onProgress?.({ status: 'submitting', stage: `Submitting to ${route.provider?.name || route.providerId}…`, progress: 5 });

  let request;
  try {
    request = protocol.buildSubmit({ route, params: requestParams, auth });
  } catch (error) {
    throw new VideoJobError(error.message, { status: 400, kind: 'adapter', details: { provider: route.providerId } });
  }

  const response = await doFetch(fetchImpl, request, signal);
  const payload = await readPayload(response);
  if (!response.ok && payload?.error === undefined) {
    throw new VideoJobError(describeHttpError(response, payload, route), { status: response.status, kind: 'provider' });
  }
  if (!response.ok && payload?.error) {
    throw new VideoJobError(payload.error?.message || payload.error || `${route.provider?.name} rejected the request.`, {
      status: response.status,
      kind: 'provider',
      details: payload,
    });
  }

  let job;
  try {
    job = protocol.parseSubmit(payload.json, { contentType: payload.contentType, route }) || {};
  } catch (error) {
    throw new VideoJobError(error.message, { status: 502, kind: 'parse', details: payload.json });
  }

  const base = {
    routeId: route.id,
    providerId: route.providerId,
    modelId: route.modelId,
    protocol: route.protocol,
    jobId: job.jobId || null,
    statusUrl: job.statusUrl || null,
    resultUrl: job.resultUrl || null,
    fileId: job.fileId || null,
    pollWithFetch: Boolean(job.pollWithFetch),
    requiresRetrieve: Boolean(job.requiresRetrieve),
    endpoint: job.endpoint || null,
    params: requestParams,
    estimatedUsd: cost.usd,
    credits: cost.credits,
    createdAt: Date.now(),
  };

  // Some providers answer with the finished asset in the submit call.
  if (job.done || job.immediate) {
    const result = job.done ? job : job.immediate;
    return {
      handle: encodeJob(base),
      status: 'completed',
      videoUrl: result.videoUrl || null,
      videoBase64: result.videoBase64 || null,
      binaryBody: Boolean(result.binaryBody),
      posterUrl: result.posterUrl || null,
      estimatedUsd: cost.usd,
      credits: cost.credits,
      warnings: validation.warnings,
      routeId: route.id,
    };
  }

  return {
    handle: encodeJob(base),
    status: job.jobId ? 'queued' : 'queued',
    jobId: base.jobId,
    estimatedUsd: cost.usd,
    credits: cost.credits,
    warnings: validation.warnings,
    routeId: route.id,
  };
}

/** Advance a job once. The gateway calls this per client poll; no server state. */
export async function pollJob({ handle, auth = {}, fetchImpl, signal }) {
  const job = typeof handle === 'string' ? decodeJob(handle) : handle;
  if (!job?.routeId) throw new VideoJobError('Malformed job handle.', { status: 400, kind: 'handle' });

  const route = resolveRoute(job.routeId);
  const protocol = protocolForRoute(route);

  if (job.pollWithFetch && !protocol.buildPoll) {
    throw new VideoJobError(`The ${route.protocol} protocol cannot poll job ${job.jobId}.`, { status: 501 });
  }

  let request;
  try {
    request = protocol.buildPoll({ route, job: { ...job, jobId: job.jobId, statusUrl: job.statusUrl }, auth });
  } catch (error) {
    throw new VideoJobError(error.message, { status: 400, kind: 'adapter' });
  }

  const response = await doFetch(fetchImpl, request, signal);
  const payload = await readPayload(response);
  if (!response.ok) throw new VideoJobError(describeHttpError(response, payload, route), { status: response.status, kind: 'provider' });

  let parsed;
  try {
    parsed = protocol.parsePoll(payload.json, { contentType: payload.contentType, route, job }) || { status: 'running' };
  } catch (error) {
    throw new VideoJobError(error.message, { status: 502, kind: 'parse' });
  }

  if (parsed.status === 'needsResult' && typeof protocol.buildResult === 'function') {
    const resultRequest = protocol.buildResult({ route, job: { ...job, ...parsed }, auth });
    const resultResponse = await doFetch(fetchImpl, resultRequest, signal);
    const resultPayload = await readPayload(resultResponse);
    if (!resultResponse.ok) throw new VideoJobError(describeHttpError(resultResponse, resultPayload, route), { status: resultResponse.status, kind: 'provider' });
    const result = protocol.parseResult ? protocol.parseResult(resultPayload.json, { contentType: resultPayload.contentType }) : {};
    if (result.status === 'failed') throw new VideoJobError(result.error || 'Provider reported a failed result.', { status: 502, kind: 'provider' });
    return finish(route, job, { ...parsed, ...result });
  }

  if (parsed.status === 'failed') {
    throw new VideoJobError(parsed.error || `${route.provider?.name || route.providerId} generation failed.`, {
      status: 502,
      kind: 'provider',
      details: parsed.raw,
    });
  }

  if (parsed.status !== 'completed') {
    return {
      status: parsed.status || 'running',
      progress: parsed.progress,
      stage: parsed.queuePosition != null ? `Queued (position ${parsed.queuePosition})` : undefined,
      handle,
      routeId: route.id,
      estimatedUsd: job.estimatedUsd,
    };
  }

  return finish(route, job, parsed);
}

function finish(route, job, parsed) {
  const needsProxy = Boolean(parsed.needsAuthForDownload);
  return {
    status: 'completed',
    videoUrl: needsProxy ? proxyPath(job, parsed.videoUrl) : parsed.videoUrl || null,
    originalVideoUrl: parsed.videoUrl || null,
    videoBase64: parsed.videoBase64 || null,
    posterUrl: parsed.posterUrl || null,
    durationSeconds: parsed.durationSeconds || job.params?.durationSeconds,
    estimatedUsd: job.estimatedUsd,
    credits: job.credits,
    provider: route.providerId,
    model: route.modelId,
    raw: parsed.raw || null,
    handle: null,
    needsProxy,
  };
}

/** Provider URLs that require an auth header must be streamed by the gateway. */
function proxyPath(job, url) {
  if (!url) return null;
  return `__gateway_download__${encodeURIComponent(url)}`;
}

export function isProxiedDownload(value) {
  return typeof value === 'string' && value.startsWith('__gateway_download__');
}

export function decodeProxiedDownload(value) {
  return decodeURIComponent(String(value).replace('__gateway_download__', ''));
}

/** Hosts we are willing to stream through the gateway (CDNs, not arbitrary URLs). */
export function isAllowedProxyHost(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const allowlist = [
      'generativelanguage.googleapis.com',
      'fal.media',
      'storage.googleapis.com',
      'replicate.delivery',
      'openrouter.ai',
      'huggingface.co',
      'cdn.hailuoai.com',
      'hailuoai.com',
      's21.acgsny.com',
      'v2-fdl.kechuang.com',
      'ksu.motimati.com',
      'lumalabs.ai',
      'assets-api.stability.ai',
      'stability.ai',
      'r2.cloudflarestorage.com',
    ];
    return allowlist.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

/**
 * Full lifecycle for a single caller that can await: submit then poll until the
 * provider answers or the timeout budget runs out.
 */
export async function runVideoJob({
  routeId,
  params,
  auth,
  fetchImpl,
  signal,
  budget,
  onProgress,
  localRenderer,
  pollIntervalMs = 5000,
  timeoutMs = 15 * 60_000,
}) {
  const route = resolveRoute(routeId);
  const protocol = protocolForRoute(route);

  if (protocol.id === 'local') {
    const validation = validateRouteRequest(route, params);
    if (!validation.ok) throw new VideoJobError(validation.errors.join(' '), { status: 422, kind: 'validation' });
    return localProtocolRun({ route, params: validation.params, localRenderer, onProgress });
  }

  const started = await submitJob({ routeId, params, auth, fetchImpl, signal, budget, onProgress });
  if (started.status === 'completed') {
    onProgress?.({ status: 'completed', stage: 'Video ready.', progress: 100, handle: started.handle });
    return started;
  }

  const deadline = Date.now() + timeoutMs;
  let handle = started.handle;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(remaining, Math.max(1000, pollIntervalMs)));
    const result = await pollJob({ handle, auth, fetchImpl, signal });
    if (result.status === 'completed') {
      onProgress?.({ status: 'completed', stage: 'Video ready.', progress: 100 });
      return result;
    }
    handle = result.handle || handle;
    onProgress?.({
      status: result.status,
      progress: Math.min(95, result.progress ?? Math.min(90, 10 + attempt * 8)),
      stage: result.stage || `Waiting for ${route.provider?.name || route.providerId}…`,
      attempt,
    });
  }

  throw new VideoJobError(`Timed out after ${Math.round(timeoutMs / 60000)} min waiting for ${route.provider?.name}.`, {
    status: 504,
    kind: 'timeout',
    details: { handle },
  });
}

async function localProtocolRun({ route, params, localRenderer, onProgress }) {
  return localProtocol.runLocal({ route, params, localRenderer, onProgress });
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

async function doFetch(fetchImpl, request, signal) {
  const impl = fetchImpl || globalThis.fetch;
  if (typeof impl !== 'function') throw new VideoJobError('No fetch implementation is available in this runtime.', { status: 500 });
  const init = { method: request.method || 'GET', headers: request.headers || {}, signal };
  if (request.body && request.method !== 'GET') init.body = JSON.stringify(request.body);
  try {
    return await impl(request.url, init);
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new VideoJobError(`Network call to ${new URL(request.url).host} failed: ${error.message}`, { status: 502, kind: 'network' });
  }
}

async function readPayload(response) {
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.includes('json')) {
    try {
      return { json: await response.json(), contentType };
    } catch {
      return { json: null, contentType };
    }
  }
  if (contentType.startsWith('video/')) {
    // Binary replies (Cloudflare returns raw bytes for some video models) are
    // carried as a data URL so the same result shape works everywhere.
    const dataUrl = await toDataUrl(response, contentType);
    return { json: dataUrl ? { __binaryDataUrl: dataUrl } : null, contentType };
  }
  const text = await response.text().catch(() => '');
  if (!text) return { json: null, contentType };
  try {
    return { json: JSON.parse(text), contentType };
  } catch {
    return { json: { raw: text }, contentType };
  }
}

async function toDataUrl(response, contentType) {
  try {
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (typeof Buffer !== 'undefined') {
      return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
    }
    let binary = '';
    // Chunked to avoid blowing the call stack on large clips.
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

function describeHttpError(response, payload, route) {
  const detail = payload?.json?.error?.message || payload?.json?.message || payload?.json?.detail || payload?.json?.error || '';
  const authHint = response.status === 401 || response.status === 403 ? ' The API key is missing, expired, or lacks access to this model.' : '';
  const rateHint = response.status === 429 ? ' Rate limited — raise the poll interval or add quota.' : '';
  return `${route.provider?.name || route.providerId} responded ${response.status}${detail ? `: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : '.'}${authHint}${rateHint}`;
}

export { encodeJob, decodeJob, joinUrl, formatUsd, ALL_ROUTES };
