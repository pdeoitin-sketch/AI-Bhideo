/**
 * Shared helpers for the provider protocol adapters.
 *
 * Adapters are deliberately pure: they only *describe* HTTP calls and *parse*
 * JSON. Nothing in this folder touches `fetch`, so every adapter is unit
 * testable with plain objects and the same code can run in the browser, in a
 * Node server, or in a Vercel/Cloudflare serverless handler.
 */

/** `Authorization` styles differ per vendor; keep it in one place. */
export function authHeaders(auth = {}, style = 'bearer') {
  const headers = {};
  const key = auth.key || '';
  if (!key) return headers;
  switch (style) {
    case 'fal-key':
      headers.Authorization = `Key ${key}`;
      break;
    case 'x-goog-api-key':
      headers['x-goog-api-key'] = key;
      break;
    case 'jwt':
      // The gateway signs an HS256 JWT from access+secret key pairs (Kling).
      headers.Authorization = `Bearer ${auth.jwt || key}`;
      break;
    case 'basic':
      headers.Authorization = `Basic ${encodeBasic(`${key}:${auth.secret || ''}`)}`;
      break;
    case 'header':
      if (auth.headerName) headers[auth.headerName] = key;
      break;
    case 'bearer':
    default:
      headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

export function encodeBasic(value) {
  const bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(value) : null;
  if (bytes && typeof btoa === 'function') {
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
  if (bytes && typeof Buffer !== 'undefined') return Buffer.from(value).toString('base64');
  return '';
}

/**
 * `a.b[0].c` style lookup; `path` may be a single path or an array of fallback
 * paths, in which case the first one that resolves wins.
 */
export function getPath(source, path) {
  if (!source || path === undefined || path === null) return undefined;
  if (Array.isArray(path)) {
    for (const candidate of path) {
      const value = getPath(source, candidate);
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  }
  const segments = String(path)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let current = source;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    current = current[segment];
  }
  return current;
}

/** First non-empty value among `paths` (accepts a string or an array). */
export function firstPath(source, paths = []) {
  for (const path of Array.isArray(paths) ? paths : [paths]) {
    const value = getPath(source, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

/** Same, but only accepts string values that look like URLs. */
export function firstUrl(source, paths = []) {
  const value = firstPath(source, paths);
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
  if (Array.isArray(value) && typeof value[0] === 'string' && /^https?:\/\//i.test(value[0])) return value[0];
  return undefined;
}

/**
 * Replace `{placeholder}` tokens in a template object with request params.
 * Strings, arrays and nested objects are all walked. A value that is `null`
 * removes the key so vendors that reject unknown fields still accept the body.
 */
export function resolveTemplate(template, params = {}) {
  if (typeof template === 'string') {
    const single = template.match(/^\{(\w+)\}$/);
    if (single) return params[single[1]];
    return template.replace(/\{(\w+)\}/g, (_match, name) => {
      const value = params[name];
      return value === undefined || value === null ? '' : String(value);
    });
  }
  if (Array.isArray(template)) {
    return template
      .map((item) => resolveTemplate(item, params))
      .filter((item) => item !== undefined && item !== null);
  }
  if (template && typeof template === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(template)) {
      const resolved = resolveTemplate(value, params);
      if (resolved === undefined || resolved === null || resolved === '') continue;
      out[key] = resolved;
    }
    return out;
  }
  return template;
}

export function joinUrl(baseUrl, path) {
  if (!path) return baseUrl;
  if (/^https?:\/\//i.test(path)) return path;
  return `${String(baseUrl).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;
}

/** Progress from whatever field a vendor happens to use. */
export function normalizeProgress(value) {
  if (typeof value === 'number') {
    if (value > 0 && value <= 1) return Math.round(value * 100);
    return Math.max(0, Math.min(99, Math.round(value)));
  }
  return undefined;
}

export function toCurl({ method = 'POST', url, headers = {}, body }) {
  const parts = [`curl -sS -X ${method} '${url}'`];
  for (const [name, value] of Object.entries(headers)) {
    parts.push(`  -H '${name}: ${value}'`);
  }
  if (body && typeof body === 'object') {
    parts.push(`  -d '${JSON.stringify(body, null, 0).replace(/'/g, `'\\''`)}'`);
  }
  return parts.join(' \\\n');
}

/**
 * A job handle is what the runner stores between polls. Encoding the route +
 * params into it keeps the gateway stateless, which is what serverless wants.
 */
export function encodeJob(handle) {
  const json = JSON.stringify(handle);
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(json)));
  if (typeof Buffer !== 'undefined') return Buffer.from(json, 'utf8').toString('base64');
  return json;
}

export function decodeJob(token) {
  try {
    if (typeof atob === 'function') return JSON.parse(decodeURIComponent(escape(atob(token))));
    if (typeof Buffer !== 'undefined') return JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return JSON.parse(token);
  } catch {
    return null;
  }
}

export function providerConfig(route) {
  return {
    baseUrl: route.route?.baseUrl || route.provider?.baseUrl || '',
    timeoutMs: route.route?.timeoutMs || route.provider?.timeoutMs || 30_000,
    pollIntervalMs: route.route?.pollIntervalMs || route.provider?.pollIntervalMs || 5_000,
    timeoutTotalMs: route.route?.jobTimeoutMs || route.provider?.jobTimeoutMs || 15 * 60_000,
  };
}

/**
 * Translate the studio's normalised params into the vocabulary a vendor uses.
 * Every adapter starts from this so new fields only need per-vendor mapping.
 */
export function normaliseParams(raw = {}) {
  const durationSeconds = Math.max(1, Number(raw.durationSeconds) || 5);
  return {
    model: raw.model || raw.route?.route?.model || '',
    prompt: String(raw.prompt || '').trim(),
    negativePrompt: String(raw.negativePrompt || '').trim(),
    durationSeconds,
    aspectRatio: raw.aspectRatio || '16:9',
    resolution: raw.resolution || '720p',
    fps: Number(raw.fps) || undefined,
    seed: Number.isFinite(Number(raw.seed)) ? Number(raw.seed) : undefined,
    audio: raw.audio === true,
    motionScore: Number.isFinite(Number(raw.motionScore)) ? Number(raw.motionScore) : undefined,
    // Image / video conditioning, whichever shape the caller supplied.
    imageUrl: raw.imageUrl || undefined,
    imageDataUrl: raw.imageDataUrl || undefined,
    lastFrameImageUrl: raw.lastFrameImageUrl || undefined,
    referenceImageUrls: Array.isArray(raw.referenceImageUrls) ? raw.referenceImageUrls.filter(Boolean) : [],
    extendFromUrl: raw.extendFromUrl || undefined,
    stylePreset: raw.stylePreset || undefined,
    webhookUrl: raw.webhookUrl || undefined,
  };
}

/**
 * `16:9` + `720p` -> `1280x720` for the APIs that want explicit pixels.
 * A "-p" label names the *vertical* line count of a landscape frame, so it is
 * the short edge: 720p is 1280×720, and 9:16 at 720p is 720×1280.
 */
export function toPixelSize(aspectRatio = '16:9', resolution = '720p') {
  const shortEdge = { '480p': 480, '576p': 576, '720p': 720, '768p': 768, '1024p': 1024, '1080p': 1080, '2K': 1440, '4K': 2160 };
  const base = shortEdge[resolution] || 720;
  const [rawWidth, rawHeight] = String(aspectRatio).split(':').map(Number);
  const valid = rawWidth > 0 && rawHeight > 0;
  const even = (value) => Math.max(2, Math.round(value / 2) * 2);
  if (!valid) return `${even(base * (16 / 9))}x${base}`;
  if (rawWidth >= rawHeight) return `${even((base * rawWidth) / rawHeight)}x${even(base)}`;
  return `${even(base)}x${even((base * rawHeight) / rawWidth)}`;
}
export function ratioForRunway(aspectRatio, resolution) {
  return `${toPixelSize(aspectRatio, resolution).replace('x', ':')}`;
}
