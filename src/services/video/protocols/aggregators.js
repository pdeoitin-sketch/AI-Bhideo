/**
 * Aggregator protocols: fal.ai, Replicate, OpenRouter.
 *
 * These three cover a large share of the catalogue because they host other
 * labs' models — often cheaper than going first-party, which is why the
 * catalogue stores several routes per model.
 */

import {
  authHeaders,
  firstPath,
  firstUrl,
  getPath,
  joinUrl,
  normalizeProgress,
  providerConfig,
} from './util.js';

/* --------------------------------------------------------------------- fal */

const FAL_QUEUE_BASE = 'https://queue.fal.run';

export const fal = {
  id: 'fal',
  authStyle: 'fal-key',

  buildSubmit({ route, params, auth }) {
    const model = route.route.model;
    const endpoint = route.route.endpoint || joinUrl(route.provider?.baseUrl || FAL_QUEUE_BASE, model);
    const body = {
      prompt: params.prompt,
      ...falInput(route, params),
    };
    if (params.webhookUrl) body.webhook_url = params.webhookUrl;
    return {
      method: 'POST',
      url: endpoint,
      headers: { 'Content-Type': 'application/json', ...authHeaders(auth, this.authStyle) },
      body,
    };
  },

  parseSubmit(json) {
    const requestId = firstPath(json, ['request_id', 'requestId', 'id']);
    if (!requestId) throw new Error('fal did not return a request_id.');
    return {
      jobId: String(requestId),
      statusUrl: json.status_url || undefined,
      resultUrl: json.response_url || undefined,
    };
  },

  buildPoll({ route, job, auth }) {
    const url = job.statusUrl || joinUrl(FAL_QUEUE_BASE, `${route.route.model}/requests/${job.jobId}/status`);
    return { method: 'GET', url, headers: authHeaders(auth, this.authStyle) };
  },

  parsePoll(json) {
    const raw = String(firstPath(json, ['status', 'state']) || '').toUpperCase();
    if (raw === 'COMPLETED') return { status: 'needsResult', pollResult: true };
    if (raw === 'IN_QUEUE' || raw === 'QUEUED' || raw === 'PENDING') {
      return { status: 'queued', queuePosition: getPath(json, 'queue_position') };
    }
    if (raw === 'IN_PROGRESS' || raw === 'PROCESSING') return { status: 'running', progress: 45 };
    if (raw === 'FAILED' || raw === 'ERROR') {
      return { status: 'failed', error: firstPath(json, ['error', 'detail', 'message']) || 'fal generation failed.' };
    }
    return { status: 'running' };
  },

  buildResult({ route, job, auth }) {
    const url = job.resultUrl || joinUrl(FAL_QUEUE_BASE, `${route.route.model}/requests/${job.jobId}`);
    return { method: 'GET', url, headers: authHeaders(auth, this.authStyle) };
  },

  parseResult(json) {
    if (json?.detail || json?.error) {
      return { status: 'failed', error: typeof json.detail === 'string' ? json.detail : json.error };
    }
    const videoUrl =
      firstUrl(json, ['video.url', 'video_url', 'url', 'videos.0.url', 'output.url', 'data.video.url']) ||
      (typeof json?.video === 'string' ? json.video : undefined) ||
      (typeof json?.output === 'string' ? json.output : undefined);
    if (!videoUrl) return { status: 'failed', error: 'fal completed the job but no video URL was present.' };
    return {
      status: 'completed',
      videoUrl,
      posterUrl: firstUrl(json, ['poster.url', 'thumbnail.url', 'cover.url']),
      seed: getPath(json, ['seed']),
      durationSeconds: Number(getPath(json, ['video.duration', 'duration'])) || undefined,
      raw: json,
    };
  },

  describe({ route, params, auth }) {
    return {
      modelId: route.route.model,
      inputFields: Object.keys(falInput(route, params)),
      authHeader: `Authorization: Key ${auth?.key ? '…' : '<FAL_KEY>'}`,
    };
  },
};

/** Map studio params onto fal's per-family input shapes. */
function falInput(route, params) {
  const model = String(route.route.model || '');
  const aspect = params.aspectRatio === '9:16' ? '9:16' : params.aspectRatio === '1:1' ? '1:1' : '16:9';
  if (model.includes('veo')) {
    return {
      aspect_ratio: aspect,
      resolution: params.resolution === '4K' ? '2160p' : params.resolution,
      generate_audio: params.audio !== false,
      negative_prompt: params.negativePrompt || undefined,
      seed: params.seed,
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
    };
  }
  if (model.includes('kling')) {
    return {
      duration: params.durationSeconds >= 10 ? '10' : '5',
      aspect_ratio: aspect,
      mode: model.includes('/pro') ? 'pro' : 'std',
      generate_audio: params.audio === true,
      negative_prompt: params.negativePrompt || undefined,
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
    };
  }
  if (model.includes('wan')) {
    return {
      length: params.durationSeconds,
      resolution: params.resolution === '1080p' ? '1080p' : '720p',
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      negative_prompt: params.negativePrompt || undefined,
    };
  }
  if (model.includes('ltx')) {
    return {
      duration: params.durationSeconds,
      resolution: params.resolution,
      generate_audio: params.audio === true,
      seed: params.seed,
    };
  }
  return {
    aspect_ratio: aspect,
    resolution: params.resolution,
    duration: params.durationSeconds,
    negative_prompt: params.negativePrompt || undefined,
    seed: params.seed,
    ...(params.imageUrl ? { image_url: params.imageUrl, start_image_url: params.imageUrl } : {}),
  };
}

/* --------------------------------------------------------------- Replicate */

export const replicate = {
  id: 'replicate',
  authStyle: 'bearer',

  buildSubmit({ route, params, auth }) {
    const modelId = route.route.model; // "owner/name"
    const [owner, name] = String(modelId).split('/');
    const base = route.provider?.baseUrl || 'https://api.replicate.com/v1';
    const isVersion = /^[0-9a-f]{40}$/.test(modelId);
    const url = owner && name && !isVersion ? `${base}/models/${owner}/${name}/predictions` : `${base}/predictions`;
    const body = { input: replicateInput(route, params) };
    if (isVersion) body.version = modelId;
    if (params.webhookUrl) {
      body.webhook = params.webhookUrl;
      body.webhook_filter_version = '80123e8f06964bb3b4dbf7fb8df40fe58ad19e82';
    }
    return {
      method: 'POST',
      url,
      headers: { 'Content-Type': 'application/json', 'Prefer': 'wait', ...authHeaders(auth, this.authStyle) },
      body,
    };
  },

  parseSubmit(json) {
    const id = firstPath(json, ['id', 'uuid', 'urls.get.id']);
    if (!id) throw new Error('Replicate did not return a prediction id.');
    return {
      jobId: String(id),
      statusUrl: firstPath(json, ['urls.get.self', 'urls.get.stream']) || undefined,
      // `Prefer: wait` may return the finished prediction in one call.
      immediate: json.status === 'succeeded' ? resultFromPrediction(json) : null,
    };
  },

  buildPoll({ route, job, auth }) {
    const base = route.provider?.baseUrl || 'https://api.replicate.com/v1';
    const url = job.statusUrl || `${base}/predictions/${job.jobId}`;
    return { method: 'GET', url, headers: authHeaders(auth, this.authStyle) };
  },

  parsePoll(json) {
    if (json?.status === 'succeeded') return resultFromPrediction(json);
    if (json?.status === 'failed' || json?.status === 'canceled') {
      return { status: 'failed', error: json.error || `Prediction ${json.status}.` };
    }
    return {
      status: json?.status === 'processing' ? 'running' : 'queued',
      progress: normalizeProgress(json?.metrics?.average_token_rate ? 50 : undefined),
    };
  },

  describe({ route }) {
    return {
      modelId: route.route.model,
      endpoint: 'POST /v1/models/{owner}/{name}/predictions',
      authHeader: 'Authorization: Bearer <REPLICATE_API_TOKEN>',
    };
  },
};

function resultFromPrediction(json) {
  const output = json?.output;
  const videoUrl =
    (typeof output === 'string' && /^https?:\/\//i.test(output) ? output : undefined) ||
    firstUrl(typeof output === 'object' ? output : {}, ['url', 'video.url', '0']) ||
    (Array.isArray(output) && typeof output[0] === 'string' && /^https?:\/\//i.test(output[0]) ? output[0] : undefined);
  if (!videoUrl && typeof output === 'string' && output.startsWith('data:video')) {
    return { status: 'completed', videoBase64: output, raw: json };
  }
  if (!videoUrl) return { status: 'failed', error: 'Replicate prediction finished without a usable output URL.' };
  return { status: 'completed', videoUrl, raw: json };
}

function replicateInput(route, params) {
  const model = String(route.route.model || '');
  const input = { prompt: params.prompt, ...(params.seed !== undefined ? { seed: params.seed } : {}) };
  if (params.negativePrompt) input.negative_prompt = params.negativePrompt;
  if (model.includes('veo')) {
    input.aspect_ratio = params.aspectRatio;
    input.resolution = params.resolution;
    input.generate_audio = params.audio !== false;
  } else if (model.includes('kling')) {
    input.duration = params.durationSeconds;
    input.aspect_ratio = params.aspectRatio;
  } else if (model.includes('wan') || model.includes('seedance')) {
    input.duration = params.durationSeconds;
    input.aspect_ratio = params.aspectRatio;
    input.resolution = params.resolution;
  } else if (model.includes('p-video')) {
    input.length = params.durationSeconds;
    input.quality = params.resolution === '1080p' ? 'base' : 'draft';
  } else {
    input.num_frames = Math.round(params.durationSeconds * (params.fps || 24));
  }
  if (params.imageUrl) input.image_url = params.imageUrl;
  return input;
}

/* -------------------------------------------------------------- OpenRouter */

export const openRouter = {
  id: 'openrouter',
  authStyle: 'bearer',

  buildSubmit({ route, params, auth }) {
    const base = route.provider?.baseUrl || 'https://openrouter.ai/api/v1';
    const body = {
      model: route.route.model,
      prompt: params.prompt,
      duration: params.durationSeconds,
      resolution: params.resolution,
      aspect_ratio: params.aspectRatio,
      generate_audio: params.audio === true,
    };
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.imageUrl) {
      body.frame_images = [{ type: 'image_url', image_url: { url: params.imageUrl }, frame_type: 'first_frame' }];
    }
    if (params.lastFrameImageUrl) {
      body.frame_images = [
        ...(body.frame_images || []),
        { type: 'image_url', image_url: { url: params.lastFrameImageUrl }, frame_type: 'last_frame' },
      ];
    }
    return {
      method: 'POST',
      url: `${base}/videos`,
      headers: { 'Content-Type': 'application/json', ...authHeaders(auth, this.authStyle) },
      body,
    };
  },

  parseSubmit(json) {
    const id = firstPath(json, ['id', 'data.id', 'job_id']);
    if (!id) throw new Error('OpenRouter did not return a video job id.');
    return {
      jobId: String(id),
      statusUrl: firstPath(json, ['polling_url', 'data.polling_url']) || undefined,
      needsAuthOnPoll: !firstPath(json, ['polling_url', 'data.polling_url']),
    };
  },

  buildPoll({ route, job, auth }) {
    const base = route.provider?.baseUrl || 'https://openrouter.ai/api/v1';
    const url = job.statusUrl || `${base}/videos/${job.jobId}`;
    const isVendorHosted = /^https?:\/\//i.test(url) && !url.startsWith(base);
    return {
      method: 'GET',
      url,
      // Signed OpenRouter URLs need the key; provider-hosted CDN links do not.
      headers: isVendorHosted ? {} : authHeaders(auth, this.authStyle),
    };
  },

  parsePoll(json) {
    const status = String(firstPath(json, ['status', 'data.status']) || '').toLowerCase();
    const data = json?.data || json;
    if (status === 'completed' || status === 'succeeded') {
      const videoUrl = firstUrl(data, ['unsigned_urls.0', 'unsignedUrls.0', 'video.url', 'urls.0', 'output.0']);
      if (videoUrl) return { status: 'completed', videoUrl, raw: json };
      // No public URL: the /videos/{id}/content endpoint streams the bytes.
      return { status: 'needsResult', pollResult: true, raw: json };
    }
    if (['failed', 'cancelled', 'expired'].includes(status)) {
      return { status: 'failed', error: firstPath(json, ['error', 'data.error']) || `Video generation ${status}.` };
    }
    return { status: status === 'in_progress' || status === 'generating' ? 'running' : 'queued', progress: normalizeProgress(getPath(json, ['progress'])) };
  },

  buildResult({ route, job }) {
    const base = route.provider?.baseUrl || 'https://openrouter.ai/api/v1';
    return { method: 'GET', url: `${base}/videos/${job.jobId}/content?index=0`, expectsBinary: true };
  },

  /** The models endpoint is the source of truth for caps; expose it for the gateway. */
  modelsUrl(route) {
    const base = route.provider?.baseUrl || 'https://openrouter.ai/api/v1';
    return `${base}/videos/models`;
  },

  describe({ route }) {
    return {
      modelId: route.route.model,
      endpoint: 'POST /api/v1/videos → GET polling_url → GET /videos/{id}/content',
      discovery: 'GET https://openrouter.ai/api/v1/videos/models',
    };
  },
};

/** Live model discovery: used by the gateway's `/models` route when a key exists. */
export async function fetchOpenRouterCatalog(fetchImpl, apiKey, baseUrl = 'https://openrouter.ai/api/v1') {
  const response = await (fetchImpl || fetch)(`${baseUrl}/videos/models`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  if (!response.ok) throw new Error(`OpenRouter model discovery failed (${response.status}).`);
  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
}
