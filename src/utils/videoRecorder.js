const VIDEO_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];

export function inferPromptTheme(prompt = '') {
  const text = String(prompt).toLowerCase();
  const keywordGroups = [
    ['space', ['space', 'star', 'galaxy', 'astronaut', 'cosmic', 'nebula', 'planet', 'moon', 'singularity', 'wormhole', 'spaceship']],
    ['anime', ['anime', 'ghibli', 'makoto', 'shinkai', 'sunset', 'sky', 'cloud', 'train', 'watercolor', 'floating island']],
    ['fluid', ['fluid', 'gold', 'liquid', 'splash', 'water', 'wave', 'ocean', 'perfume', 'petal', 'lava']],
    ['temple', ['temple', 'forest', 'jungle', 'mushroom', 'bioluminescent', 'moss', 'garden', 'meadow', 'mountain', 'plant', 'tree']],
    ['cyberpunk', ['cyber', 'neon', 'tokyo', 'rain', 'hypercar', 'car', 'street', 'city', 'urban', 'robot', 'hologram', 'futuristic']],
  ];

  for (const [theme, keywords] of keywordGroups) {
    if (keywords.some((keyword) => text.includes(keyword))) return theme;
  }

  return 'generic';
}

export function getCanvasDimensions(aspectRatio = '16:9', maxDimension = 1280) {
  const [rawWidth, rawHeight] = String(aspectRatio).split(':').map(Number);
  const ratio = rawWidth > 0 && rawHeight > 0 ? rawWidth / rawHeight : 16 / 9;

  let width;
  let height;
  if (ratio >= 1) {
    width = maxDimension;
    height = Math.round(width / ratio);
  } else {
    height = maxDimension;
    width = Math.round(height * ratio);
  }

  // Even dimensions are more broadly supported by browser video encoders.
  width = Math.max(2, Math.floor(width / 2) * 2);
  height = Math.max(2, Math.floor(height / 2) * 2);
  return { width, height };
}

function selectMimeType(Recorder) {
  if (typeof Recorder.isTypeSupported !== 'function') return '';
  return VIDEO_MIME_TYPES.find((type) => Recorder.isTypeSupported(type)) || '';
}

function getExtension(mimeType = '') {
  return mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm';
}

/**
 * Record the animation currently drawn on a canvas as a real video file.
 * This uses the browser's MediaRecorder implementation; it does not claim to
 * run remote/AI inference. Callers can surface progress while the clip records.
 */
export function recordCanvasVideo(canvas, {
  durationSeconds = 8,
  fps = 24,
  onProgress,
} = {}) {
  return new Promise((resolve, reject) => {
    const Recorder = globalThis.MediaRecorder;
    if (!canvas || typeof canvas.captureStream !== 'function') {
      reject(new Error('This browser cannot capture the video preview. Try a recent version of Chrome, Edge, or Firefox.'));
      return;
    }
    if (typeof Recorder !== 'function') {
      reject(new Error('Video recording is not supported in this browser. Try a recent version of Chrome, Edge, or Firefox.'));
      return;
    }

    const safeDuration = Math.max(0.1, Number(durationSeconds) || 8);
    const safeFps = Math.max(1, Math.min(60, Math.round(Number(fps) || 24)));
    let stream;
    try {
      stream = canvas.captureStream(safeFps);
    } catch (error) {
      reject(new Error(`Could not start canvas capture: ${error?.message || 'unsupported video format'}`));
      return;
    }

    const preferredMimeType = selectMimeType(Recorder);
    const bitrate = safeFps >= 50 ? 5_000_000 : 3_000_000;
    let recorder;
    try {
      const options = preferredMimeType
        ? { mimeType: preferredMimeType, videoBitsPerSecond: bitrate }
        : { videoBitsPerSecond: bitrate };
      recorder = new Recorder(stream, options);
    } catch {
      try {
        // Some browsers reject the optional bitrate or codec hint.
        recorder = new Recorder(stream);
      } catch (error) {
        stream.getTracks?.().forEach((track) => track.stop());
        reject(new Error(`Could not initialize the video encoder: ${error?.message || 'unsupported video format'}`));
        return;
      }
    }

    const chunks = [];
    let settled = false;
    let progressTimer = null;
    const startedAt = typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now();

    const cleanup = () => {
      if (progressTimer !== null) clearInterval(progressTimer);
      stream.getTracks?.().forEach((track) => track.stop());
    };

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(result);
    };

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = (event) => {
      const message = event?.error?.message || 'The browser video encoder stopped unexpectedly.';
      finish(new Error(message));
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        // The encoder is already shutting down.
      }
    };
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || preferredMimeType || 'video/webm';
      const blob = new Blob(chunks, { type: mimeType });
      if (!blob.size) {
        finish(new Error('The video encoder returned an empty file. Please try again.'));
        return;
      }
      try {
        onProgress?.(100);
      } catch {
        // Progress callbacks should not make an otherwise valid recording fail.
      }
      finish(null, {
        blob,
        mimeType,
        extension: getExtension(mimeType),
        durationSeconds: safeDuration,
        width: canvas.width,
        height: canvas.height,
      });
    };

    try {
      recorder.start(250);
    } catch (error) {
      finish(new Error(`Could not start the video encoder: ${error?.message || 'unknown error'}`));
      return;
    }

    try {
      onProgress?.(0);
    } catch {
      // Ignore errors in UI progress handlers.
    }

    const intervalMs = Math.min(100, Math.max(10, safeDuration * 50));
    progressTimer = setInterval(() => {
      const now = typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now();
      const elapsedSeconds = (now - startedAt) / 1000;
      const progress = Math.min(99, (elapsedSeconds / safeDuration) * 100);
      try {
        onProgress?.(progress);
      } catch {
        // Ignore errors in UI progress handlers.
      }
      if (elapsedSeconds >= safeDuration && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch (error) {
          finish(new Error(`Could not finalize the video file: ${error?.message || 'unknown error'}`));
        }
      }
    }, intervalMs);
  });
}

function safeBaseName(value) {
  const base = String(value || 'ai-bhideo-video')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'ai-bhideo-video';
}

/** Trigger an actual browser download for a recorded video asset. */
export function downloadVideoAsset(asset, name = 'AI-Bhideo-video') {
  if (typeof document === 'undefined' || !asset) return false;

  let url = asset.url;
  let ownsUrl = false;
  if (!url && asset.blob && typeof URL !== 'undefined' && URL.createObjectURL) {
    url = URL.createObjectURL(asset.blob);
    ownsUrl = true;
  }
  if (!url) return false;

  const extension = asset.extension || getExtension(asset.mimeType);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeBaseName(name)}.${extension}`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Keep temporary object URLs valid until the browser has started the download.
  if (ownsUrl) setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return link.download;
}
