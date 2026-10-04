/**
 * The local protocol: the existing in-browser canvas renderer expressed as a
 * video "provider" so the studio has exactly one code path for free and paid
 * routes. It never touches the network and can never be billed.
 */

export const localProtocol = {
  id: 'local',
  /** The gateway cannot render a browser canvas; the studio handles it. */
  gatewayCapable: false,

  async runLocal({ route, params, localRenderer, onProgress }) {
    if (typeof localRenderer !== 'function') {
      throw new Error('The local renderer is only available inside the studio (it needs the live canvas).');
    }
    if (onProgress) onProgress({ status: 'running', stage: 'Rendering locally on your canvas…', progress: 10 });
    const output = await localRenderer({
      durationSeconds: params.durationSeconds,
      fps: params.fps || 30,
      onProgress: (progress) => onProgress?.({ status: 'running', stage: 'Recording the canvas…', progress }),
      modelProfile: route.route.model,
      prompt: params.prompt,
    });
    if (!output || (!output.blob && !output.url)) {
      throw new Error('The local renderer produced no video file.');
    }
    if (onProgress) onProgress({ status: 'completed', stage: 'Local render finished.', progress: 100 });
    return {
      status: 'completed',
      source: 'local',
      videoUrl: output.url,
      blob: output.blob || null,
      posterUrl: output.posterUrl,
      width: output.width,
      height: output.height,
      mimeType: output.mimeType,
      extension: output.extension,
      durationSeconds: params.durationSeconds,
      estimatedUsd: 0,
      credits: 0,
      route: { id: route.id, providerId: route.providerId, modelId: route.modelId },
    };
  },

  describe({ route }) {
    return {
      modelId: route.route.model,
      endpoint: 'canvas + MediaRecorder (no network)',
      cost: 'free',
    };
  },
};
