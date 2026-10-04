/**
 * Protocol dispatch + request validation.
 *
 * `validateRouteRequest` is the gate that keeps the studio honest about what a
 * model can actually do: it snaps an unsupported resolution/duration/aspect
 * ratio onto the model's documented ladder and returns human-readable warnings
 * instead of sending a request a vendor would reject.
 */

import { fal, openRouter, replicate } from './aggregators.js';
import { googleLro, klingTask, minimaxTask, openAiVideos, runwayTask, stabilityJob } from './firstParty.js';
import { cloudflareWorkersAi, templateProtocol } from './edge.js';
import { localProtocol } from './local.js';
import { formatUsd, maxDurationSeconds, snapDuration } from '../costEngine.js';
import { findRoutes } from '../../../data/videoProviders.js';
import { toCurl } from './util.js';

export const PROTOCOLS = {
  local: localProtocol,
  fal,
  replicate,
  openrouter: openRouter,
  'google-lro': googleLro,
  minimax: minimaxTask,
  kling: klingTask,
  runway: runwayTask,
  stability: stabilityJob,
  cloudflare: cloudflareWorkersAi,
  'openai-videos': openAiVideos,
  template: templateProtocol,
};

export { openRouter, fal, replicate, templateProtocol, localProtocol };

export function protocolForRoute(route) {
  const protocol = PROTOCOLS[route?.protocol] || templateProtocol;
  return protocol;
}

export function listProtocols() {
  return Object.keys(PROTOCOLS);
}

const RESOLUTION_HEIGHT = { '480p': 480, '576p': 576, '720p': 720, '768p': 768, '1024p': 1024, '1080p': 1080, '2K': 1440, '4K': 2160 };

function closestResolution(supported = [], wanted) {
  if (!supported.length) return wanted;
  if (supported.includes(wanted)) return wanted;
  const wantedHeight = RESOLUTION_HEIGHT[wanted] || 720;
  return supported.reduce(
    (best, value) => (Math.abs((RESOLUTION_HEIGHT[value] || 0) - wantedHeight) < Math.abs((RESOLUTION_HEIGHT[best] || 0) - wantedHeight) ? value : best),
    supported[0]
  );
}

/**
 * @returns {{ok: boolean, errors: string[], warnings: string[], params: object, mode: string}}
 */
/**
 * A dead model should never be a dead end: name the cheapest live route that
 * can do the same job, so the UI can offer a one-click swap.
 */
function suggestionFor(route) {
  const modes = route.model?.capabilities?.modes || ['t2v'];
  // Only suggest routes the studio can call immediately: hosted APIs, not the
  // browser renderer, and not "custom" endpoints that need the user's own server.
  const usable = (entry) => !['local', 'custom'].includes(entry.providerId) && entry.modelId !== route.modelId;
  const match =
    findRoutes({ mode: modes.includes('t2v') ? 't2v' : modes[0], needsAudio: route.model?.capabilities?.audio }).filter(usable)[0] ||
    findRoutes({ mode: modes.includes('t2v') ? 't2v' : modes[0] }).filter(usable)[0] ||
    findRoutes({}).filter(usable)[0];
  if (!match) return '';
  return `Closest live replacement: ${match.model.name} via ${match.provider?.name || match.providerId} at ${formatUsd(match.usdPerSecond)}/s (route "${match.id}").`;
}

export function validateRouteRequest(route, rawParams = {}) {
  const errors = [];
  const warnings = [];
  const params = { ...rawParams };
  const caps = route?.model?.capabilities || {};

  if (!route) {
    return { ok: false, errors: ['Unknown video route.'], warnings, params };
  }

  if (route.retired && !params.allowRetired) {
    errors.push(`${route.model.name} was retired${route.model.retiredOn ? ` on ${route.model.retiredOn}` : ''} and cannot be called through ${route.provider?.name || 'this provider'}. ${suggestionFor(route)} Pick another route from the model catalog to keep going.`);
  }

  const wantsImage = Boolean(params.imageUrl || params.imageDataUrl);
  const modes = caps.modes || ['t2v'];
  let mode = 't2v';
  if (params.extendFromUrl && modes.includes('extend')) mode = 'extend';
  else if (wantsImage && modes.includes('i2v')) mode = 'i2v';
  else if (wantsImage && !modes.includes('i2v')) {
    warnings.push(`${route.model.name} has no image-to-video mode — the reference image will be ignored.`);
  }
  if (modes.length === 1 && modes[0] === 'i2v' && !wantsImage) {
    errors.push(`${route.model.name} is image-to-video only: attach a still image (or pick a text-to-video model).`);
  }
  if (params.extendFromUrl && !modes.includes('extend')) {
    warnings.push('This model cannot extend an existing clip; it will be generated fresh.');
    params.extendFromUrl = undefined;
  }

  if (!String(params.prompt || '').trim() && mode !== 'i2v') {
    errors.push('A prompt is required.');
  }

  const requestedDuration = params.durationSeconds || params.duration || 5;
  const duration = snapDuration(route.model, requestedDuration);
  if (duration !== Number(requestedDuration)) {
    warnings.push(
      `Duration ${requestedDuration}s is not offered by ${route.model.name}; using ${duration}s (max ${maxDurationSeconds(route.model)}s per request).`
    );
  }
  params.durationSeconds = duration;

  if (caps.resolutions?.length) {
    const resolution = closestResolution(caps.resolutions, params.resolution || '720p');
    if (resolution !== params.resolution) {
      warnings.push(`Resolution ${params.resolution || '720p'} is unavailable on ${route.model.name}; using ${resolution}.`);
    }
    params.resolution = resolution;
  }

  if (caps.aspectRatios?.length && params.aspectRatio && !caps.aspectRatios.includes(params.aspectRatio)) {
    warnings.push(`${params.aspectRatio} is not supported by ${route.model.name}; using ${caps.aspectRatios[0]}.`);
    params.aspectRatio = caps.aspectRatios[0];
  }

  if (params.audio === true && !caps.audio) {
    warnings.push(`${route.model.name} does not generate audio — the audio flag was cleared.`);
    params.audio = false;
  }

  if (params.fps && caps.fps && Number(params.fps) !== Number(caps.fps)) {
    warnings.push(`Frame rate is fixed at ${caps.fps} fps for ${route.model.name}.`);
    params.fps = caps.fps;
  }

  const provider = route.provider || {};
  if (provider.envVar && !params.allowMissingKey && !params.keySource) {
    // Not fatal: the gateway may hold the key in its own environment.
    warnings.push(`No key configured for ${provider.name}. Provide one in the provider panel or set ${provider.envVar}${provider.extraEnvVars?.length ? ` + ${provider.extraEnvVars.join(' + ')}` : ''} on the gateway.`);
  }

  return { ok: errors.length === 0, errors, warnings, params, mode };
}

/** What a call would look like — powers the docs panel and the cURL snippet. */
export function describeRoute(route, { params = {}, auth = {} } = {}) {
  const protocol = protocolForRoute(route);
  const info = protocol.describe ? protocol.describe({ route, params, auth }) : { modelId: route.route.model };
  let sample = null;
  try {
    const request = protocol.buildSubmit({ route, params: { ...params, model: route.route.model }, auth: { ...auth, key: auth.key ? `<${route.provider?.envVar || 'API_KEY'}>` : undefined } });
    sample = { method: request.method, url: request.url, headers: request.headers, body: request.body };
  } catch (error) {
    sample = { error: error.message };
  }
  return { protocol: protocol.id, ...info, sample };
}

export function curlForRoute(route, { params = {}, auth = {} } = {}) {
  const protocol = protocolForRoute(route);
  try {
    const request = protocol.buildSubmit({ route, params: { ...params, model: route.route.model }, auth });
    return toCurl(request);
  } catch (error) {
    return `# ${error.message}`;
  }
}

export { toCurl };
