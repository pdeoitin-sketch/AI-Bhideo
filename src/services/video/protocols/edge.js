/**
 * Edge + generic protocols.
 *
 * `cloudflareWorkersAi` targets Cloudflare's `/ai/run` surface — the one
 * hosted option with a genuine daily free allowance.
 *
 * `templateProtocol` is the escape hatch that lets any other REST video API
 * (Luma, Pika, BytePlus, Higgsfield, kie.ai, PiAPI, Segmind, WaveSpeed, a
 * self-hosted ComfyUI box…) be added purely as data: submit/poll/result paths,
 * status field names, and the fields to read the video out of. No new code.
 */

import {
  authHeaders,
  firstPath,
  firstUrl,
  getPath,
  joinUrl,
  normalizeProgress,
  resolveTemplate,
  toPixelSize,
} from './util.js';

/* --------------------------------------------------- Cloudflare Workers AI */

export const cloudflareWorkersAi = {
  id: 'cloudflare',
  authStyle: 'bearer',

  buildSubmit({ route, params, auth }) {
    const accountId = auth.accountId;
    if (!accountId) {
      throw new Error('Cloudflare Workers AI needs both an API token and an account id (CLOUDFLARE_ACCOUNT_ID).');
    }
    const base = route.provider?.baseUrl || 'https://api.cloudflare.com/client/v4/accounts';
    const body = {
      prompt: params.prompt,
      ...cloudflareInput(route, params),
    };
    return {
      method: 'POST',
      url: `${base}/${encodeURIComponent(accountId)}/ai/run/${route.route.model}`,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders(auth, this.authStyle) },
      body,
    };
  },

  /**
   * Workers AI answers synchronously for most models and returns either JSON
   * (with a URL or base64 payload) or raw bytes. Both are handled here so the
   * runner never has to special-case Cloudflare.
   */
  parseSubmit(json, context = {}) {
    if (json && json.success === false) {
      const message = Array.isArray(json.errors) ? json.errors.map((e) => e.message).join('; ') : 'Cloudflare rejected the request';
      throw new Error(`${message} (code ${json.errors?.[0]?.code ?? 'n/a'}). Model availability on the Free plan varies — check the model page.`);
    }
    const result = json?.result ?? json;
    const dataUrl = firstPath(result, ['__binaryDataUrl']);
    if (dataUrl) return { jobId: 'cf-inline', done: true, videoBase64: dataUrl };
    const videoUrl = firstUrl(result, ['url', 'video.url', 'videos.0.url', 'output.url', 'result.url']);
    const base64 = firstPath(result, ['video', 'base64', 'b64_json', 'b64', 'result']);
    if (videoUrl) return { jobId: 'cf-inline', done: true, videoUrl };
    if (typeof base64 === 'string' && base64.length > 128) {
      return { jobId: 'cf-inline', done: true, videoBase64: maybeDataUrl(base64, context.contentType) };
    }
    if (context.contentType && context.contentType.startsWith('video/')) {
      return { jobId: 'cf-inline', done: true, binaryBody: true };
    }
    const id = firstPath(result, ['id', 'identifier', 'task_id']);
    if (!id) throw new Error('Cloudflare returned neither media nor a job id — the model may not support this request shape.');
    return { jobId: String(id), pollWithFetch: true };
  },

  buildPoll({ route, job, auth }) {
    const base = route.provider?.baseUrl || 'https://api.cloudflare.com/client/v4/accounts';
    return {
      method: 'GET',
      url: `${base}/${encodeURIComponent(auth.accountId)}/ai/fetch/${encodeURIComponent(job.jobId)}`,
      headers: authHeaders(auth, this.authStyle),
    };
  },

  parsePoll(json) {
    const result = json?.result ?? json;
    const dataUrl = firstPath(result, ['__binaryDataUrl']);
    if (dataUrl) return { status: 'completed', videoBase64: dataUrl };
    const videoUrl = firstUrl(result, ['url', 'video.url', 'output.url']);
    if (videoUrl) return { status: 'completed', videoUrl, raw: json };
    const base64 = firstPath(result, ['video', 'base64', 'b64_json']);
    if (base64) return { status: 'completed', videoBase64: maybeDataUrl(base64) };
    const status = String(firstPath(result, ['status', 'state']) || '').toLowerCase();
    if (['failed', 'error', 'canceled'].includes(status)) {
      return { status: 'failed', error: firstPath(result, ['error', 'message']) || `Cloudflare task ${status}.` };
    }
    return { status: status === 'running' || status === 'processing' ? 'running' : 'queued', progress: normalizeProgress(getPath(result, ['progress'])) };
  },

  describe({ route, auth }) {
    const base = route.provider?.baseUrl || 'https://api.cloudflare.com/client/v4/accounts';
    return {
      modelId: route.route.model,
      endpoint: `POST ${base}/{account_id}/ai/run/${route.route.model}`,
      freeTier: '10,000 Neurons/day on the Workers Free plan',
      catalogue: 'https://developers.cloudflare.com/ai/models/',
      note: auth?.accountId ? undefined : 'CLOUDFLARE_ACCOUNT_ID is required.',
    };
  },
};

function cloudflareInput(route, params) {
  const model = String(route.route.model || '');
  const out = {};
  if (model.includes('seedance') || model.includes('wan')) {
    out.size = `${toPixelSize(params.aspectRatio, params.resolution)}px`;
    out.duration = params.durationSeconds;
    out.steps = 30;
  } else if (model.includes('gen-4')) {
    out.ratio = params.aspectRatio;
    out.duration = params.durationSeconds;
  }
  if (params.imageUrl) out.image = params.imageDataUrl || params.imageUrl;
  return out;
}

function maybeDataUrl(value, contentType) {
  if (typeof value !== 'string') return value;
  if (value.startsWith('data:')) return value;
  return `data:${contentType && contentType.startsWith('video/') ? contentType : 'video/mp4'};base64,${value}`;
}

/* --------------------------------------------- Generic template protocol */

/**
 * Per-provider defaults so a provider can be added with a few lines of data.
 * `submit`/`poll`/`result` are templates resolved against the normalised params.
 */
export const PROVIDER_TEMPLATES = {
  luma: {
    submit: {
      method: 'POST',
      path: '/dream-machine/v1/generations',
      body: {
        prompt: '{prompt}',
        aspect_ratio: '{aspectRatio}',
        resolution: '{resolution}',
        keyframe: { type: 'image', url: '{imageUrl}' },
      },
    },
    poll: {
      method: 'GET',
      path: '/dream-machine/v1/generations/{jobId}',
      intervalMs: 8000,
      statusPath: 'state',
      pending: ['queued', 'dreaming', 'pending'],
      running: ['generating', 'processing'],
      done: ['completed'],
      failed: ['failed', 'canceled'],
      videoUrlPaths: ['assets.video', 'video_url', 'assets.gif'],
      progressPath: 'progress',
    },
  },
  pika: {
    submit: {
      method: 'POST',
      path: '/v1/create',
      body: { prompt: '{prompt}', aspect_ratio: '{aspectRatio}', resolution: '{resolution}', duration_seconds: '{durationSeconds}' },
    },
    poll: {
      method: 'GET',
      path: '/v1/create/{jobId}',
      intervalMs: 5000,
      statusPath: 'status',
      pending: ['queued', 'created'],
      running: ['generating', 'in_progress'],
      done: ['completed', 'succeeded'],
      failed: ['failed'],
      videoUrlPaths: ['video_url', 'result.video_url', 'outputs.0.url'],
    },
  },
  byteplus: {
    submit: {
      method: 'POST',
      path: '/contents/generations/tasks',
      body: {
        model: '{model}',
        content: [{ type: 'text', text: '{prompt}' }],
        resolution: '{resolution}',
        duration: '{durationSeconds}',
        ratio: '{aspectRatio}',
        generate_audio: '{audio}',
      },
    },
    poll: {
      method: 'GET',
      path: '/contents/generations/tasks/{jobId}',
      intervalMs: 10000,
      statusPath: 'status',
      pending: ['queued'],
      running: ['running', 'in_progress'],
      done: ['succeeded', 'completed'],
      failed: ['failed', 'cancelled', 'expired'],
      videoUrlPaths: ['content.video_url', 'content.url', 'output.video'],
      errorPath: 'error.message',
    },
  },
  huggingface: {
    submit: {
      method: 'POST',
      path: '/models/{model}',
      body: { inputs: '{prompt}', parameters: { duration: '{durationSeconds}', resolution: '{resolution}', seed: '{seed}' } },
    },
    poll: { method: 'GET', path: '/models/{model}', statusPath: 'status', done: ['succeeded', 'completed'], videoUrlPaths: ['output.0', 'output.url', 'video.url'] },
  },
  custom: {
    submit: {
      method: 'POST',
      path: '/generate',
      body: {
        prompt: '{prompt}',
        negative_prompt: '{negativePrompt}',
        duration_seconds: '{durationSeconds}',
        aspect_ratio: '{aspectRatio}',
        resolution: '{resolution}',
        seed: '{seed}',
        image_url: '{imageUrl}',
      },
    },
    poll: {
      method: 'GET',
      path: '/jobs/{jobId}',
      intervalMs: 4000,
      statusPath: 'status',
      pending: ['queued', 'pending', 'created'],
      running: ['running', 'processing', 'in_progress', 'generating'],
      done: ['completed', 'succeeded', 'done'],
      failed: ['failed', 'error', 'cancelled'],
      videoUrlPaths: ['video.url', 'video_url', 'output.video', 'result.url', 'outputs.0.url', 'output'],
      videoBase64Paths: ['video_base64', 'result.base64', 'b64_json'],
      progressPath: 'progress',
      errorPath: 'error',
    },
  },
};

export const templateProtocol = {
  id: 'template',
  authStyle: 'bearer',

  config(route) {
    const overrides = route?.route?.template || {};
    const defaults = PROVIDER_TEMPLATES[route?.providerId] || PROVIDER_TEMPLATES.custom;
    return {
      baseUrl: route.route.baseUrl || route.provider?.baseUrl || '',
      submit: { ...(defaults.submit || {}), ...(overrides.submit || {}) },
      poll: { ...(defaults.poll || {}), ...(overrides.poll || {}) },
      result: { ...(defaults.result || {}), ...(overrides.result || {}) },
    };
  },

  buildSubmit({ route, params, auth }) {
    const config = this.config(route);
    const resolvedParams = { ...params, model: route.route.model, audio: params.audio === true };
    const submit = config.submit || {};
    const body = resolveTemplate(submit.body ?? { prompt: '{prompt}' }, resolvedParams);
    const headers = {
      'Content-Type': 'application/json',
      ...authHeaders(auth, submit.authStyle || this.authStyle),
      ...resolveTemplate(submit.headers || {}, resolvedParams),
    };
    if (!config.baseUrl) {
      throw new Error(`${route.provider?.name || route.providerId} has no baseUrl — set one in the provider access panel or the catalogue.`);
    }
    return {
      method: submit.method || 'POST',
      url: joinUrl(config.baseUrl, resolveTemplate(submit.path || '/generate', resolvedParams)),
      headers,
      body,
    };
  },

  parseSubmit(json) {
    const id = firstPath(json, ['id', 'job_id', 'taskId', 'task_id', 'data.id', 'data.task_id', 'request_id', 'output.0']);
    if (!id) throw new Error('The endpoint did not return a job id — check the response mapping for this provider.');
    return { jobId: String(id) };
  },

  buildPoll({ route, job, auth }) {
    const config = this.config(route);
    const poll = config.poll || {};
    const url = job.statusUrl || joinUrl(config.baseUrl, resolveTemplate(poll.path || '/jobs/{jobId}', { jobId: job.jobId, model: route.route.model }));
    return {
      method: poll.method || 'GET',
      url,
      headers: { ...authHeaders(auth, poll.authStyle || this.authStyle), ...resolveTemplate(poll.headers || {}, { jobId: job.jobId }) },
    };
  },

  parsePoll(json, context = {}) {
    const config = this.config(context.route);
    const poll = config.poll || {};
    const status = String(firstPath(json, [poll.statusPath || 'status', 'state', 'data.status']) || '').toLowerCase();
    const error = firstPath(json, [poll.errorPath || 'error', 'message', 'detail']);
    if ((poll.failed || []).map(String).some((value) => value.toLowerCase() === status)) {
      return { status: 'failed', error: error || `Job ${status}.` };
    }
    if (error && status === '') return { status: 'failed', error };
    const videoUrl = firstUrl(json, poll.videoUrlPaths || ['video.url', 'video_url', 'output.0', 'result.url', 'output']);
    if (videoUrl) return { status: 'completed', videoUrl, raw: json };
    const base64 = firstPath(json, poll.videoBase64Paths || ['video_base64', 'b64_json', 'result.base64']);
    if (typeof base64 === 'string' && base64.length > 128) return { status: 'completed', videoBase64: maybeDataUrl(base64, context.contentType), raw: json };
    if ((poll.done || []).map(String).some((value) => value.toLowerCase() === status)) {
      return { status: 'failed', error: 'Job reported success but no video URL/base64 field matched the mapping.' };
    }
    const running = (poll.running || []).map(String).some((value) => value.toLowerCase() === status);
    return {
      status: running ? 'running' : 'queued',
      progress: normalizeProgress(firstPath(json, [poll.progressPath || 'progress'])),
    };
  },

  pollIntervalMs(route) {
    return this.config(route).poll?.intervalMs || 5000;
  },

  describe({ route }) {
    const config = this.config(route);
    return {
      modelId: route.route.model,
      submit: `${config.submit?.method || 'POST'} ${config.baseUrl}${config.submit?.path || '/generate'}`,
      poll: `${config.poll?.method || 'GET'} ${config.baseUrl}${config.poll?.path || '/jobs/{jobId}'}`,
      videoUrlPaths: config.poll?.videoUrlPaths || ['video.url', 'video_url', 'output.0'],
      hint: 'Set BHIDEO_CUSTOM_VIDEO_URL (or the panel field) to point at your own worker; add a `template` object on a catalogue route to remap fields.',
    };
  },
};
