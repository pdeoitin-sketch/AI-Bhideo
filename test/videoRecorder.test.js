import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadVideoAsset, getCanvasDimensions, inferPromptTheme, recordCanvasVideo } from '../src/utils/videoRecorder.js';

const makeCanvas = () => ({
  width: 640,
  height: 360,
  captureStream(fps) {
    this.capturedFps = fps;
    return { getTracks: () => [{ stop() {} }] };
  },
});

function withMediaRecorder(value, run) {
  const previous = globalThis.MediaRecorder;
  globalThis.MediaRecorder = value;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      if (previous === undefined) delete globalThis.MediaRecorder;
      else globalThis.MediaRecorder = previous;
    });
}

test('prompt theme detection follows scene keywords and falls back to generic', () => {
  assert.equal(inferPromptTheme('A chrome hypercar in neon Tokyo rain'), 'cyberpunk');
  assert.equal(inferPromptTheme('An astronaut drifting near a violet nebula'), 'space');
  assert.equal(inferPromptTheme('A hand-painted train crossing a sunset sky'), 'anime');
  assert.equal(inferPromptTheme('A quiet portrait in a studio'), 'generic');
});

test('canvas dimensions match common landscape, portrait, and cinema ratios', () => {
  assert.deepEqual(getCanvasDimensions('16:9'), { width: 1280, height: 720 });
  assert.deepEqual(getCanvasDimensions('9:16'), { width: 720, height: 1280 });
  assert.deepEqual(getCanvasDimensions('2.39:1'), { width: 1280, height: 536 });
  assert.deepEqual(getCanvasDimensions('not-a-ratio'), { width: 1280, height: 720 });
});

test('recordCanvasVideo returns a non-empty video blob and reports progress', async () => {
  class FakeMediaRecorder {
    static isTypeSupported(type) {
      return type === 'video/webm;codecs=vp9';
    }

    constructor(stream, options = {}) {
      this.stream = stream;
      this.mimeType = options.mimeType || 'video/webm';
      this.state = 'inactive';
    }

    start() {
      this.state = 'recording';
    }

    stop() {
      if (this.state === 'inactive') return;
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['encoded video bytes'], { type: this.mimeType }) });
      queueMicrotask(() => this.onstop?.());
    }
  }

  await withMediaRecorder(FakeMediaRecorder, async () => {
    const progressValues = [];
    const canvas = makeCanvas();
    const output = await recordCanvasVideo(canvas, {
      durationSeconds: 0.1,
      fps: 30,
      onProgress: (progress) => progressValues.push(progress),
    });

    assert.ok(output.blob.size > 0);
    assert.equal(output.mimeType, 'video/webm;codecs=vp9');
    assert.equal(output.extension, 'webm');
    assert.equal(output.durationSeconds, 0.1);
    assert.equal(canvas.capturedFps, 30);
    assert.ok(progressValues.some((progress) => progress > 0));
    assert.equal(progressValues.at(-1), 100);
  });
});

test('video download creates and clicks a video file link', () => {
  const previousDocument = globalThis.document;
  let clickedLink;
  const fakeDocument = {
    body: { appendChild() {} },
    createElement() {
      return {
        style: {},
        click() { clickedLink = this; },
        remove() {},
      };
    },
  };

  try {
    globalThis.document = fakeDocument;
    const filename = downloadVideoAsset({ url: 'blob:rendered-video', extension: 'webm' }, 'Tokyo Rain');
    assert.equal(filename, 'Tokyo-Rain.webm');
    assert.equal(clickedLink.href, 'blob:rendered-video');
    assert.equal(clickedLink.download, 'Tokyo-Rain.webm');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('recordCanvasVideo rejects clearly when MediaRecorder is not supported', async () => {
  await withMediaRecorder(undefined, async () => {
    await assert.rejects(
      recordCanvasVideo(makeCanvas(), { durationSeconds: 0.1 }),
      /Video recording is not supported/,
    );
  });
});
