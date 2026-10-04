/**
 * First-party protocol adapters: Google Veo, MiniMax, Kling, Runway, Stability,
 * and OpenAI's retired Videos API.
 *
 * Where a vendor uses a signed token instead of a plain key (Kling issues an
 * HS256 JWT from an access/secret pair), the gateway signs it — see
 * `../auth/jwt.js`. The browser never sees the secret.
 */

import {
  authHeaders,
  firstPath,
  firstUrl,
  getPath,
  joinUrl,
  normalizeProgress,
  ratioForRunway,
} from './util.js';

/* ------------------------------------------------------- Google (Gemini/Veo) */

export const googleLro = {
  id: 'google-lro',
  authStyle: 'x-goog-api-key',

  buildSubmit({ route, params, auth }) {
    const base = route.provider?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const model = route.route.model;
    const instance = { prompt: params.prompt };
    if (params.imageUrl) instance.image = { mime_type: 'image/png', bytes_base64_encoded: params.imageDataUrl?.split(',')[1] || undefined, uri: params.imageUrl };
    if (params.lastFrameImageUrl) instance.last_frame = { uri: params.lastFrameImageUrl };
    if (params.extendFromUrl) instance.video = { uri: params.extendFromUrl };

    const parameters = {
      aspectRatio: params.aspectRatio === '9:16' ? '9:16' : '16:9',
      resolution: params.resolution === '4K' ? '4k' : params.resolution,
      durationSeconds: params.durationSeconds,
    };
    if (params.negativePrompt) parameters.negativePrompt = params.negativePrompt;
    if (params.seed !== undefined) parameters.seed = params.seed;
    // Audio is on by default for Veo 3.1 and is part of the per-second price.
    if (model.includes('veo')) parameters.generateAudio = params.audio !== false;

    return {
      method: 'POST',
      url: `${base}/models/${model}:predictLongRunning`,
      headers: { 'Content-Type': 'application/json', ...authHeaders(auth, this.authStyle) },
      body: { instances: [instance], parameters },
    };
  },

  parseSubmit(json) {
    const name = firstPath(json, ['name', 'operation.name']);
    if (!name) throw new Error(`Veo rejected the request: ${firstPath(json, ['error.message']) || 'no operation name returned'}.`);
    return { jobId: String(name), usesOperationName: true };
  },

  buildPoll({ route, job, auth }) {
    const base = route.provider?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    return { method: 'GET', url: `${base}/${job.jobId}`, headers: authHeaders(auth, this.authStyle) };
  },

  parsePoll(json) {
    if (json?.error?.message) return { status: 'failed', error: json.error.message };
    if (!json?.done) {
      return {
        status: 'running',
        progress: normalizeProgress(getPath(json, ['metadata.progressPercent'])),
      };
    }
    const sample = getPath(json, ['response.generateVideoResponse.generatedSamples.0', 'response.generatedVideos.0']);
    const video = sample?.video || sample;
    const uri = video?.uri || video?.fileUri;
    if (!uri) return { status: 'failed', error: 'Veo reported success but returned no media URI.' };
    // The URI requires the API key header, so it can only be fetched by the
    // gateway (or via the returned `downloadHeaders` below).
    return {
      status: 'completed',
      videoUrl: uri,
      needsAuthForDownload: true,
      raw: json,
    };
  },

  buildDownload({ route, auth }) {
    // Merged onto the result by the runner when `needsAuthForDownload` is set.
    return { headers: authHeaders(auth, this.authStyle) };
  },

  describe({ route }) {
    return {
      modelId: route.route.model,
      endpoint: 'POST /v1beta/models/{model}:predictLongRunning → GET /v1beta/{operation.name}',
      resultPath: 'response.generateVideoResponse.generatedSamples[0].video.uri',
    };
  },
};

/* ------------------------------------------------------------- MiniMax (Hailuo) */

export const minimaxTask = {
  id: 'minimax',
  authStyle: 'bearer',

  buildSubmit({ route, params, auth }) {
    const base = route.provider?.baseUrl || 'https://api.minimax.io/v1';
    const isV2 = String(route.route.model || '').includes('H3');
    const body = isV2
      ? {
          model: route.route.model,
          content: [{ type: 'text', text: params.prompt }],
          resolution: params.resolution === '2K' ? '2K' : params.resolution,
          duration: params.durationSeconds,
          ratio: 'adaptive',
        }
      : {
          model: route.route.model,
          prompt: params.prompt,
          duration: params.durationSeconds,
          resolution: params.resolution.replace('p', 'P'),
          prompt_optimizer: true,
        };
    if (params.imageUrl) body.first_frame_image = params.imageUrl;

    return {
      method: 'POST',
      url: joinUrl(base, '/video_generation'),
      headers: { 'Content-Type': 'application/json', ...authHeaders(auth, this.authStyle) },
      body,
    };
  },

  parseSubmit(json) {
    const taskId = firstPath(json, ['task_id', 'data.task_id']);
    const code = firstPath(json, ['base_resp.status_code', 'status_code']);
    if (!taskId) throw new Error(`MiniMax rejected the task: ${firstPath(json, ['base_resp.status_msg']) || code || 'no task_id'}.`);
    return { jobId: String(taskId), requiresRetrieve: true };
  },

  buildPoll({ route, job, auth }) {
    const base = route.provider?.baseUrl || 'https://api.minimax.io/v1';
    return {
      method: 'GET',
      url: joinUrl(base, `/query/video_generation?task_id=${encodeURIComponent(job.jobId)}`),
      headers: authHeaders(auth, this.authStyle),
    };
  },

  parsePoll(json) {
    const status = String(firstPath(json, ['status', 'task.status']) || '').toLowerCase();
    if (status === 'success' || status === 'succeeded') {
      const directUrl = firstUrl(json, ['task.file.content.url', 'file_url']);
      if (directUrl) return { status: 'completed', videoUrl: directUrl, raw: json };
      const fileId = firstPath(json, ['file_id', 'task.file.file_id']);
      if (!fileId) return { status: 'failed', error: 'MiniMax succeeded but returned no file_id.' };
      return { status: 'needsResult', pollResult: true, fileId: String(fileId) };
    }
    if (['fail', 'failed', 'cancelled', 'expired', 'invalid'].includes(status)) {
      return { status: 'failed', error: firstPath(json, ['status_msg', 'base_resp.status_msg']) || `MiniMax task ${status}.` };
    }
    return { status: status === 'processing' ? 'running' : 'queued' };
  },

  buildResult({ route, job, auth }) {
    const base = route.provider?.baseUrl || 'https://api.minimax.io/v1';
    return {
      method: 'GET',
      url: joinUrl(base, `/files/retrieve?file_id=${encodeURIComponent(job.fileId || job.jobId)}`),
      headers: authHeaders(auth, this.authStyle),
    };
  },

  parseResult(json) {
    const url = firstUrl(json, ['file.download_url', 'download_url', 'file.url']);
    if (!url) return { status: 'failed', error: 'MiniMax file lookup returned no download URL.' };
    return { status: 'completed', videoUrl: url, raw: json };
  },

  describe({ route }) {
    return {
      modelId: route.route.model,
      endpoint: 'POST /v1/video_generation → GET /v1/query/video_generation?task_id= → GET /v1/files/retrieve?file_id=',
    };
  },
};

/* ------------------------------------------------------------------ Kling */

export const klingTask = {
  id: 'kling',
  authStyle: 'jwt',

  buildSubmit({ route, params, auth }) {
    const base = route.provider?.baseUrl || 'https://api-singapore.klingai.com';
    const isImageMode = Boolean(params.imageUrl) && (route.route.endpoint || '').includes('image2video');
    const path = route.route.endpoint || (isImageMode ? '/v1/videos/image2video' : '/v1/videos/text2video');
    const body = {
      model_name: klingModelName(route.route.model),
      prompt: params.prompt,
      duration: String(params.durationSeconds),
      aspect_ratio: params.aspectRatio === '9:16' ? '9:16' : params.aspectRatio === '1:1' ? '1:1' : '16:9',
      mode: String(route.route.model || '').includes('pro') ? 'pro' : 'std',
      audio: params.audio === true ? 'on' : 'off',
      cfg_scale: params.motionScore !== undefined ? Math.min(1, 0.5 + params.motionScore / 10) : undefined,
    };
    if (params.negativePrompt) body.negative_prompt = params.negativePrompt;
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.imageUrl) body.image = params.imageUrl;
    if (params.lastFrameImageUrl) body.tail_image = params.lastFrameImageUrl;

    return {
      method: 'POST',
      url: joinUrl(base, path),
      headers: { 'Content-Type': 'application/json', ...authHeaders(auth, this.authStyle) },
      body,
    };
  },

  parseSubmit(json) {
    const code = Number(getPath(json, ['code']));
    const taskId = firstPath(json, ['data.task_id']);
    if (code > 0 || !taskId) {
      throw new Error(`Kling rejected the request: ${firstPath(json, ['message']) || json?.msg || `code ${code}`}`);
    }
    return { jobId: String(taskId), endpoint: klingResourcePath(json) };
  },

  buildPoll({ route, job, auth }) {
    const base = route.provider?.baseUrl || 'https://api-singapore.klingai.com';
    const path = job.endpoint || route.route.endpoint || '/v1/videos/text2video';
    return {
      method: 'GET',
      url: joinUrl(base, `${path}/${encodeURIComponent(job.jobId)}`),
      headers: authHeaders(auth, this.authStyle),
    };
  },

  parsePoll(json) {
    const status = String(firstPath(json, ['data.task_status']) || '').toLowerCase();
    if (status === 'succeed' || status === 'completed') {
      const videoUrl = firstUrl(json, ['data.task_result.videos.0.url']);
      if (!videoUrl) return { status: 'failed', error: 'Kling finished without a video URL.' };
      return {
        status: 'completed',
        videoUrl,
        durationSeconds: Number(getPath(json, ['data.task_result.videos.0.duration'])) || undefined,
        raw: json,
      };
    }
    if (status === 'failed' || status === 'canceled') {
      return { status: 'failed', error: firstPath(json, ['data.task_status_msg', 'message']) || `Kling task ${status}.` };
    }
    return { status: status === 'processing' ? 'running' : 'queued' };
  },

  describe({ route }) {
    return {
      modelId: route.route.model,
      endpoint: `POST ${route.route.endpoint || '/v1/videos/text2video'} → GET …/{task_id}`,
      auth: 'HS256 JWT signed from KLING_ACCESS_KEY + KLING_SECRET_KEY (gateway only)',
    };
  },
};

function klingModelName(model) {
  const value = String(model || '');
  if (value.includes('o3')) return 'kling-v2-6';
  if (value.includes('pro')) return 'kling-v1-6';
  return 'kling-v1';
}

function klingResourcePath(json) {
  // Kling echoes the resource path for some task types; keep it when present.
  const path = getPath(json, ['data.resource']);
  return typeof path === 'string' && path.startsWith('/') ? path : undefined;
}

/* ----------------------------------------------------------------- Runway */

export const runwayTask = {
  id: 'runway',
  authStyle: 'bearer',

  buildSubmit({ route, params, auth }) {
    const base = route.provider?.baseUrl || 'https://api.dev.runwayml.com';
    const path = params.imageUrl ? '/v1/image_to_video' : '/v1/text_to_video';
    const body = {
      model: route.route.model,
      promptText: params.prompt,
      ratio: ratioForRunway(params.aspectRatio, params.resolution),
      duration: params.durationSeconds,
    };
    if (params.negativePrompt) body.promptText = `${params.prompt}. Avoid: ${params.negativePrompt}`;
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.imageUrl) body.promptImage = params.imageUrl;

    return {
      method: 'POST',
      url: `${base}${path}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Runway-Version': route.provider?.fixedHeaders?.['X-Runway-Version'] || '2024-11-06',
        ...authHeaders(auth, this.authStyle),
      },
      body,
    };
  },

  parseSubmit(json) {
    const id = firstPath(json, ['id', 'taskId']);
    if (!id) throw new Error(`Runway rejected the task: ${firstPath(json, ['message', 'error']) || 'no task id'}.`);
    return { jobId: String(id) };
  },

  buildPoll({ route, job, auth }) {
    const base = route.provider?.baseUrl || 'https://api.dev.runwayml.com';
    return { method: 'GET', url: `${base}/v1/tasks/${encodeURIComponent(job.jobId)}`, headers: authHeaders(auth, this.authStyle) };
  },

  parsePoll(json) {
    const status = String(firstPath(json, ['status']) || '').toUpperCase();
    if (status === 'SUCCEEDED') {
      const videoUrl = firstUrl(json, ['output.0', 'output', 'result.video']) || (Array.isArray(json?.output) ? json.output[0] : undefined);
      if (!videoUrl) return { status: 'failed', error: 'Runway task succeeded but returned no output URL.' };
      return { status: 'completed', videoUrl, failedReason: json?.failure, raw: json };
    }
    if (status === 'FAILED' || status === 'CANCELED') {
      return { status: 'failed', error: firstPath(json, ['failure']) || `Runway task ${status}.` };
    }
    return { status: status === 'RUNNING' ? 'running' : 'queued', progress: normalizeProgress(getPath(json, ['progress'])) };
  },

  describe({ route }) {
    return {
      modelId: route.route.model,
      endpoint: 'POST /v1/text_to_video → GET /v1/tasks/{id}',
      auth: 'Authorization: Bearer <RUNWAYML_API_SECRET> + X-Runway-Version',
    };
  },
};

/* ------------------------------------------------------------- Stability */

export const stabilityJob = {
  id: 'stability',
  authStyle: 'bearer',

  buildSubmit({ route, params, auth }) {
    const base = route.provider?.baseUrl || 'https://api.stability.ai';
    if (!params.imageUrl && !params.imageDataUrl) {
      throw new Error('Stable Video Diffusion is image-to-video only — attach a still image first.');
    }
    const body = {
      seed: params.seed ?? 0,
      input_strength: 0.5,
      motion_strength_id: params.motionScore !== undefined ? String(Math.min(4, Math.max(1, Math.round(params.motionScore / 2.5)))) : '2',
      fps: params.fps || 25,
    };
    if (params.imageUrl) body.input_image_uri = params.imageUrl;
    return {
      method: 'POST',
      url: joinUrl(base, `/v2beta/${route.route.endpoint || 'image-to-video'}`),
      headers: { Accept: 'application/json', ...authHeaders(auth, this.authStyle) },
      body,
      formData: params.imageDataUrl ? { input_image: params.imageDataUrl } : undefined,
    };
  },

  parseSubmit(json) {
    const id = firstPath(json, ['id', 'generation']);
    if (!id) throw new Error('Stability did not return a generation id.');
    return { jobId: String(id) };
  },

  buildPoll({ route, job, auth }) {
    const base = route.provider?.baseUrl || 'https://api.stability.ai';
    return { method: 'GET', url: joinUrl(base, `/v2beta/generation/${encodeURIComponent(job.jobId)}`), headers: authHeaders(auth, this.authStyle) };
  },

  parsePoll(json) {
    const status = String(firstPath(json, ['status']) || '').toUpperCase();
    if (status === 'COMPLETE' || status === 'SUCCEEDED') {
      const videoUrl = firstUrl(json, ['result.artifacts.0.video', 'artifacts.0.video', 'result.video']);
      if (!videoUrl) return { status: 'failed', error: 'Stability finished but returned no artifact URL.' };
      return { status: 'completed', videoUrl, raw: json };
    }
    if (status === 'FAILED') return { status: 'failed', error: firstPath(json, ['message', 'errors.0']) || 'Stability generation failed.' };
    return { status: status === 'IN_PROGRESS' ? 'running' : 'queued' };
  },

  describe({ route }) {
    return { modelId: route.route.model, endpoint: 'POST /v2beta/image-to-video → GET /v2beta/generation/{id}' };
  },
};

/* ------------------------------------------------- OpenAI Videos (retired) */

export const openAiVideos = {
  id: 'openai-videos',
  authStyle: 'bearer',
  retired: true,

  buildSubmit({ route, params }) {
    throw new Error(
      `${route.provider?.name || 'OpenAI'} retired this API on 2026-09-24 (POST /v1/videos and the sora-2 models were removed). ` +
        'Pick another route — Kling 3.0, Veo 3.1 Fast, or Seedance 2.0 cover the same ground for less.' +
        (params?.allowRetired ? ' (Override with allowRetired if you use an Azure or proxy endpoint.)' : '')
    );
  },

  /** Documented request shape, kept so migrations can be diffed against it. */
  describe({ route }) {
    const base = route.provider?.baseUrl || 'https://api.openai.com/v1';
    return {
      status: 'retired-2026-09-24',
      historicalEndpoints: [
        `POST ${base}/videos  (multipart: model, prompt, size, seconds, input_reference)`,
        `GET  ${base}/videos/{video_id}`,
        `GET  ${base}/videos/{video_id}/content`,
      ],
      lastListPrice: '$0.10/s sora-2 720p · $0.30/s sora-2-pro 720p · $0.50/s at 1024p',
    };
  },
};
