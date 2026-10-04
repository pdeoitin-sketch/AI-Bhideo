import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ROUTES } from '../src/data/videoProviders.js';
import { PROTOCOLS, protocolForRoute, validateRouteRequest, curlForRoute, describeRoute } from '../src/services/video/protocols/index.js';
import { normaliseParams } from '../src/services/video/protocols/util.js';
import { previewJob } from '../src/services/video/runner.js';

/**
 * Adapter contract tests. These never touch the network: they pin the exact
 * request a provider receives and the interpretation of its replies, which is
 * the part that silently breaks when a vendor renames a field.
 */

const pick = (predicate, label) => {
  const route = ALL_ROUTES.find(predicate);
  assert.ok(route, `catalogue must contain a route for ${label}`);
  return route;
};

const submit = (route, overrides = {}, auth = { key: 'test-key' }) => {
  const validation = validateRouteRequest(route, { ...normaliseParams(baseParams(overrides)), ...overrides });
  assert.equal(validation.ok, true, validation.errors.join('; '));
  const protocol = protocolForRoute(route);
  return protocol.buildSubmit({ route, params: { ...validation.params, model: route.route.model }, auth });
};

const baseParams = (extra = {}) => ({
  prompt: 'A chrome fox trotting through wet neon snow',
  negativePrompt: 'blurry, watermark',
  durationSeconds: extra.durationSeconds ?? 6,
  aspectRatio: '16:9',
  resolution: '720p',
  seed: 1234,
  ...extra,
});

const jsonResponse = (payload, status = 200) => ({
  ok: status < 400,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  async json() {
    return payload;
  },
  async text() {
    return JSON.stringify(payload);
  },
});

/* --------------------------------------------------------------------- fal */

test('fal: queue submit, status poll, and result fetch all use the documented shape', () => {
  const route = pick((r) => r.providerId === 'fal' && r.route.model.includes('veo'), 'fal Veo');
  const request = submit(route);
  assert.equal(request.method, 'POST');
  assert.equal(request.url, `https://queue.fal.run/${route.route.model}`);
  assert.equal(request.headers.Authorization, 'Key test-key');
  assert.equal(request.body.prompt, 'A chrome fox trotting through wet neon snow');
  assert.equal(request.body.aspect_ratio, '16:9');
  assert.equal(typeof request.body.resolution, 'string');
  assert.equal(request.body.negative_prompt, 'blurry, watermark');

  const protocol = protocolForRoute(route);
  const job = protocol.parseSubmit({ request_id: 'req_1', status_url: 'https://queue.fal.run/x/status', response_url: 'https://queue.fal.run/x/resp' });
  assert.equal(job.jobId, 'req_1');
  assert.equal(job.statusUrl, 'https://queue.fal.run/x/status');

  assert.equal(protocol.parsePoll({ status: 'IN_QUEUE', queue_position: 3 }).status, 'queued');
  assert.equal(protocol.parsePoll({ status: 'IN_PROGRESS' }).status, 'running');
  assert.equal(protocol.parsePoll({ status: 'COMPLETED' }).status, 'needsResult');
  assert.equal(protocol.parsePoll({ status: 'FAILED', error: 'nsfw' }).error, 'nsfw');

  const result = protocol.parseResult({ video: { url: 'https://v3.fal.media/clip.mp4', duration: 6 } });
  assert.equal(result.status, 'completed');
  assert.equal(result.videoUrl, 'https://v3.fal.media/clip.mp4');
  assert.throws(() => protocol.parseSubmit({ detail: 'nope' }), /request_id/);

  const poll = protocol.buildPoll({ route, job: { jobId: 'abc' }, auth: { key: 'k' } });
  assert.ok(poll.url.endsWith('/requests/abc/status'), poll.url);
});

/* --------------------------------------------------------------- Replicate */

test('replicate: official-model prediction route, Prefer wait, and output parsing', () => {
  const route = pick((r) => r.providerId === 'replicate' && r.route.model.includes('veo'), 'replicate Veo');
  const request = submit(route);
  assert.equal(request.url, `https://api.replicate.com/v1/models/${route.route.model.split('/')[0]}/${route.route.model.split('/')[1]}/predictions`);
  assert.equal(request.headers.Prefer, 'wait');
  assert.equal(request.headers.Authorization, 'Bearer test-key');
  assert.equal(request.body.input.prompt, 'A chrome fox trotting through wet neon snow');

  const protocol = protocolForRoute(route);
  const finished = protocol.parseSubmit({ id: 'p1', status: 'succeeded', output: ['https://replicate.delivery/a.mp4'] });
  assert.equal(finished.immediate.status, 'completed');
  assert.equal(finished.immediate.videoUrl, 'https://replicate.delivery/a.mp4');

  const pending = protocol.parseSubmit({ id: 'p2', status: 'starting' });
  assert.equal(pending.jobId, 'p2');
  assert.equal(pending.immediate, null);

  assert.equal(protocol.parsePoll({ status: 'processing' }).status, 'running');
  assert.equal(protocol.parsePoll({ status: 'failed', error: 'gpu oom' }).error, 'gpu oom');
  assert.equal(protocol.parsePoll({ status: 'succeeded', output: 'https://x/y.mp4' }).videoUrl, 'https://x/y.mp4');
});

test('replicate: community version hashes post to /predictions with a version field', () => {
  const fakeRoute = {
    id: 'fake::replicate',
    providerId: 'replicate',
    protocol: 'replicate',
    provider: { baseUrl: 'https://api.replicate.com/v1', name: 'Replicate' },
    model: { id: 'fake', name: 'Fake', capabilities: { modes: ['t2v'], resolutions: ['720p'], durations: [4, 8], aspectRatios: ['16:9'] } },
    route: { model: 'a'.repeat(40) },
  };
  const request = PROTOCOLS.replicate.buildSubmit({ route: fakeRoute, params: { ...baseParams(), model: 'a'.repeat(40) }, auth: { key: 'k' } });
  assert.equal(request.url, 'https://api.replicate.com/v1/predictions');
  assert.equal(request.body.version, 'a'.repeat(40));
});

/* -------------------------------------------------------------- OpenRouter */

test('openrouter: unified videos API submit, polling_url follow-up, and content fallback', () => {
  const route = pick((r) => r.providerId === 'openrouter', 'openrouter');
  const request = submit(route);
  assert.equal(request.url, 'https://openrouter.ai/api/v1/videos');
  assert.equal(request.body.model, route.route.model);
  assert.equal(request.body.duration, 6);
  assert.equal(request.body.resolution, '720p');
  assert.equal(request.body.aspect_ratio, '16:9');
  assert.equal(request.body.seed, 1234);

  const protocol = protocolForRoute(route);
  const job = protocol.parseSubmit({ id: 'job_9', status: 'pending', polling_url: 'https://openrouter.ai/api/v1/videos/job_9' });
  assert.equal(job.jobId, 'job_9');
  assert.equal(job.statusUrl, 'https://openrouter.ai/api/v1/videos/job_9');

  const poll = protocol.buildPoll({ route, job: { jobId: 'job_9', statusUrl: job.statusUrl }, auth: { key: 'k' } });
  assert.equal(poll.url, 'https://openrouter.ai/api/v1/videos/job_9');

  const done = protocol.parsePoll({ status: 'completed', unsigned_urls: ['https://cdn/openrouter/a.mp4'] });
  assert.equal(done.videoUrl, 'https://cdn/openrouter/a.mp4');
  assert.equal(protocol.parsePoll({ status: 'failed', error: 'moderation' }).error, 'moderation');
  assert.equal(protocol.parsePoll({ status: 'expired' }).status, 'failed');
  assert.equal(protocol.parsePoll({ status: 'in_progress', progress: 0.4 }).status, 'running');
  assert.equal(protocol.parseResult === undefined, true, 'OpenRouter streams via /content, not a result object');
});

/* ------------------------------------------------------------------ Google */

test('google: predictLongRunning submit, operation poll, and media URI extraction', () => {
  const route = pick((r) => r.providerId === 'google', 'google Veo');
  const request = submit(route);
  assert.equal(request.url, `https://generativelanguage.googleapis.com/v1beta/models/${route.route.model}:predictLongRunning`);
  assert.equal(request.headers['x-goog-api-key'], 'test-key');
  assert.equal(request.headers.Authorization, undefined);
  assert.equal(request.body.instances[0].prompt, 'A chrome fox trotting through wet neon snow');
  assert.equal(request.body.parameters.aspectRatio, '16:9');
  assert.equal(request.body.parameters.durationSeconds, 6);
  assert.equal(request.body.parameters.generateAudio, false);

  const protocol = protocolForRoute(route);
  const job = protocol.parseSubmit({ name: 'models/veo-3.1/operations/op_1' });
  assert.equal(job.jobId, 'models/veo-3.1/operations/op_1');
  const poll = protocol.buildPoll({ route, job: { jobId: job.jobId }, auth: { key: 'k' } });
  assert.equal(poll.url, 'https://generativelanguage.googleapis.com/v1beta/models/veo-3.1/operations/op_1');

  assert.equal(protocol.parsePoll({ done: false, metadata: { progressPercent: 40 } }).progress, 40);
  const completed = protocol.parsePoll({
    done: true,
    response: { generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://generativelanguage.googleapis.com/v1/files/a.mp4' } }] } },
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.needsAuthForDownload, true, 'Veo URIs require the API key header, so the gateway must stream them');

  assert.throws(() => protocol.parseSubmit({ error: { message: 'quota exceeded' } }), /quota exceeded/);
});

/* ----------------------------------------------------- MiniMax and Kling */

test('minimax: three-step task → status → file retrieve chain', () => {
  const route = pick((r) => r.providerId === 'minimax' && r.route.model.includes('2.3'), 'MiniMax Hailuo');
  const request = submit(route);
  assert.equal(request.url, 'https://api.minimax.io/v1/video_generation');
  assert.equal(request.body.model, 'MiniMax-Hailuo-2.3');
  // 720p is not offered by Hailuo 2.3, so validation snaps to the nearest rung.
  assert.equal(request.body.resolution, '768P');
  assert.equal(request.body.duration, 6);

  const protocol = protocolForRoute(route);
  const job = protocol.parseSubmit({ task_id: 't-1', base_resp: { status_code: 0 } });
  assert.equal(job.jobId, 't-1');
  assert.throws(() => protocol.parseSubmit({ base_resp: { status_code: 1002, status_msg: 'insufficient balance' } }), /insufficient balance/);

  assert.equal(protocol.parsePoll({ status: 'Preparing' }).status, 'queued');
  assert.equal(protocol.parsePoll({ status: 'Processing' }).status, 'running');
  const needsFile = protocol.parsePoll({ status: 'Success', file_id: 'f-77' });
  assert.equal(needsFile.pollResult, true);
  const retrieve = protocol.buildResult({ route, job: { fileId: 'f-77' }, auth: { key: 'k' } });
  assert.match(retrieve.url, /\/files\/retrieve\?file_id=f-77$/);
  assert.equal(protocol.parseResult({ file: { download_url: 'https://cdn.hailuoai.com/a.mp4' } }).videoUrl, 'https://cdn.hailuoai.com/a.mp4');
});

test('kling: JWT bearer auth, task ids, and audio on/off mapping', async () => {
  const route = pick((r) => r.providerId === 'kling', 'Kling');
  const request = submit(route, { audio: true });
  assert.equal(request.url, 'https://api-singapore.klingai.com/v1/videos/text2video');
  assert.equal(request.headers.Authorization, 'Bearer test-key');
  assert.equal(request.body.audio, 'on');
  assert.equal(request.body.duration, '5', 'Kling offers 5/10/15s, so 6s snaps to 5');
  assert.equal(request.body.aspect_ratio, '16:9');
  assert.equal(typeof request.body.model_name, 'string');

  const protocol = protocolForRoute(route);
  assert.equal(protocol.parseSubmit({ code: 0, data: { task_id: 'k-1' } }).jobId, 'k-1');
  assert.throws(() => protocol.parseSubmit({ code: 1102, message: 'auth failed' }), /auth failed/);
  const succeeded = protocol.parsePoll({ data: { task_status: 'succeed', task_result: { videos: [{ url: 'https://v2-fdl.kechuang.com/a.mp4', duration: 6 }] } } });
  assert.equal(succeeded.videoUrl, 'https://v2-fdl.kechuang.com/a.mp4');
  assert.equal(succeeded.durationSeconds, 6);
  assert.equal(protocol.parsePoll({ data: { task_status: 'processing' } }).status, 'running');

  const { klingJwt } = await import('../src/services/video/auth/jwt.js');
  const token = await klingJwt({ accessKey: 'ak', secretKey: 'sk' });
  assert.match(token, /^eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\./, 'header must be the standard HS256 JWT header');
  assert.equal(token.split('.').length, 3);
  const [, payload] = token.split('.');
  const claims = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  assert.equal(claims.iss, 'ak');
  assert.ok(claims.exp > claims.nbf);
  await assert.rejects(klingJwt({ accessKey: 'ak' }), /KLING_ACCESS_KEY and KLING_SECRET_KEY/);
});

/* --------------------------------------------------------- Runway & SVD */

test('runway: version header, ratio string, and task polling', () => {
  const route = pick((r) => r.providerId === 'runway' && r.route.model === 'gen4.5', 'Runway Gen-4.5');
  const request = submit(route);
  assert.equal(request.url, 'https://api.dev.runwayml.com/v1/text_to_video');
  assert.equal(request.headers['X-Runway-Version'], '2024-11-06');
  assert.equal(request.body.model, 'gen4.5');
  assert.equal(request.body.ratio, '1280:720');
  assert.equal(request.body.duration, 5, 'Gen-4.5 offers 2/5/10s, so 6s snaps to 5');

  // The same Runway key can also serve a Google model — the catalogue keeps
  // that as a separate route so pricing stays attributable.
  const omni = ALL_ROUTES.find((r) => r.providerId === 'runway' && r.route.model === 'gemini_omni_flash');
  assert.ok(omni, 'gemini omni flash via runway should be routed');
  assert.equal(omni.model.maker, 'Google DeepMind');

  const withImage = submit(route, { imageUrl: 'https://example.com/frame.png' });
  assert.equal(withImage.url, 'https://api.dev.runwayml.com/v1/image_to_video');
  assert.equal(withImage.body.promptImage, 'https://example.com/frame.png');

  const protocol = protocolForRoute(route);
  assert.equal(protocol.parsePoll({ status: 'RUNNING' }).status, 'running');
  assert.equal(protocol.parsePoll({ status: 'SUCCEEDED', output: ['https://content.runwayml.com/a.mp4'] }).videoUrl, 'https://content.runwayml.com/a.mp4');
  assert.equal(protocol.parsePoll({ status: 'FAILED', failure: 'safety' }).error, 'safety');
});

test('stability: image-to-video only, and it refuses text-only requests', () => {
  const route = pick((r) => r.providerId === 'stability', 'Stability');
  assert.throws(() => submit(route), /image-to-video only/);
  const request = submit(route, { imageUrl: 'https://example.com/still.jpg', imageDataUrl: 'data:image/jpeg;base64,AAAA' });
  assert.match(request.url, /image-to-video$/);
  assert.equal(request.body.motion_strength_id, '2');
  const protocol = protocolForRoute(route);
  assert.equal(protocol.parsePoll({ status: 'COMPLETE', result: { artifacts: [{ video: 'https://api.stability.ai/v2beta/generation/1/zip' }] } }).videoUrl, 'https://api.stability.ai/v2beta/generation/1/zip');
});

/* ------------------------------------------------------------ Cloudflare */

test('cloudflare: account id required, sync JSON, inline base64, and async ids', () => {
  const route = pick((r) => r.providerId === 'cloudflare', 'Cloudflare');
  const protocol = protocolForRoute(route);
  assert.throws(
    () => protocol.buildSubmit({ route, params: { ...baseParams(), model: route.route.model }, auth: {} }),
    /account id/
  );

  const request = protocol.buildSubmit({ route, params: { ...baseParams(), model: route.route.model }, auth: { key: 'cf-token', accountId: 'acct_123' } });
  assert.equal(request.url, 'https://api.cloudflare.com/client/v4/accounts/acct_123/ai/run/' + route.route.model);
  assert.equal(request.headers.Authorization, 'Bearer cf-token');

  assert.equal(
    protocol.parseSubmit({ success: true, result: { url: 'https://pub-abc.r2.dev/a.mp4' } }).videoUrl,
    'https://pub-abc.r2.dev/a.mp4'
  );
  const inline = protocol.parseSubmit({ success: true, result: { video: 'AAAA'.repeat(64) } });
  assert.equal(inline.done, true);
  assert.match(inline.videoBase64, /^data:video\/mp4;base64,/);
  const async = protocol.parseSubmit({ success: true, result: { id: 'task-1' } });
  assert.equal(async.jobId, 'task-1');
  assert.equal(async.pollWithFetch, true);
});

test('cloudflare: free-plan model errors surface with the vendor message', () => {
  const route = pick((r) => r.providerId === 'cloudflare', 'Cloudflare');
  const protocol = protocolForRoute(route);
  assert.throws(
    () => protocol.parseSubmit({ success: false, errors: [{ code: 5035, message: 'Model is not available on the Workers Free plan' }] }),
    /Workers Free plan/
  );
});

/* -------------------------------------------------- Generic template (BYO) */

test('template protocol: Luma maps through data-only config, no bespoke code', () => {
  const route = pick((r) => r.providerId === 'luma', 'Luma');
  const request = submit(route);
  assert.equal(request.url, 'https://api.lumalabs.ai/dream-machine/v1/generations');
  assert.equal(request.body.prompt, 'A chrome fox trotting through wet neon snow');
  assert.equal(request.body.aspect_ratio, '16:9');

  const protocol = protocolForRoute(route);
  assert.equal(protocol.parseSubmit({ id: 'gen-1' }).jobId, 'gen-1');
  assert.equal(protocol.parsePoll({ state: 'dreaming' }, { route }).status, 'queued');
  assert.equal(protocol.parsePoll({ state: 'generating' }, { route }).status, 'running');
  assert.equal(protocol.parsePoll({ state: 'failed' }, { route }).status, 'failed');
  assert.equal(protocol.parsePoll({ state: 'completed', assets: { video: 'https://vid.lumalabs.ai/a.mp4' } }, { route }).videoUrl, 'https://vid.lumalabs.ai/a.mp4');
  assert.throws(() => protocol.parseSubmit({}), /job id/);
});

test('template protocol: a route can override paths and field names entirely', () => {
  const customRoute = {
    id: 'custom-test::custom',
    providerId: 'custom',
    protocol: 'template',
    provider: { id: 'custom', name: 'Self-host', baseUrl: 'http://127.0.0.1:8188', keyKind: 'apiKey (optional)' },
    model: { id: 'custom-test', name: 'Comfy Box', capabilities: { modes: ['t2v'], resolutions: ['720p'], durations: [4, 8], aspectRatios: ['16:9'] } },
    route: {
      providerId: 'custom',
      model: 'wan-2.2',
      template: {
        submit: { method: 'POST', path: '/api_prompt', body: { payload: { prompt: '{prompt}', seconds: '{durationSeconds}' } }, authStyle: 'header', header: 'X-Key' },
        poll: { method: 'GET', path: '/history/{jobId}', statusPath: 'data.state', pending: ['queued'], running: ['working'], done: ['ok'], videoUrlPaths: ['data.clips.0.url'] },
      },
    },
  };
  const protocol = PROTOCOLS.template;
  const request = protocol.buildSubmit({ route: customRoute, params: { ...baseParams(), model: 'wan-2.2' }, auth: { key: 'local' } });
  assert.equal(request.url, 'http://127.0.0.1:8188/api_prompt');
  assert.equal(request.body.payload.seconds, 6);
  assert.equal(protocol.config(customRoute).poll.statusPath, 'data.state');
  const parsed = protocol.parsePoll({ data: { state: 'ok', clips: [{ url: 'http://127.0.0.1:8188/view?f=a.mp4' }] } }, { route: customRoute });
  assert.equal(parsed.status, 'completed');
  assert.equal(parsed.videoUrl, 'http://127.0.0.1:8188/view?f=a.mp4');
});

/* ------------------------------------------------------- validation rules */

test('validation refuses retired routes and explains the migration', () => {
  const retired = pick((r) => r.retired, 'a retired route');
  const result = validateRouteRequest(retired, baseParams());
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /retired/);
  assert.match(result.errors.join(' '), new RegExp(retired.model.retiredOn));
  assert.equal(validateRouteRequest(retired, { ...baseParams(), allowRetired: true }).errors.length, 0);
});

test('validation clamps capabilities and reports every change as a warning', () => {
  const veo = pick((r) => r.providerId === 'google', 'Veo');
  const result = validateRouteRequest(veo, { ...baseParams(), durationSeconds: 99, resolution: '4K', aspectRatio: '4:5', audio: false });
  assert.equal(result.ok, true, result.errors.join('; '));
  assert.equal(result.params.durationSeconds, 8, 'duration clamps to the model ladder');
  assert.ok(result.warnings.some((warning) => /Duration/.test(warning)));
  assert.ok(result.warnings.some((warning) => /4:5/.test(warning)), 'unsupported aspect ratio must be reported');
  assert.equal(result.params.aspectRatio, '16:9');

  const audioless = pick((r) => r.route.model.includes('dream-machine') || r.providerId === 'pika', 'a model without audio');
  const noAudio = validateRouteRequest(audioless, { ...baseParams(), audio: true });
  assert.equal(noAudio.params.audio, false);
  assert.ok(noAudio.warnings.some((warning) => /does not generate audio/.test(warning)));

  const i2vOnly = ALL_ROUTES.find((r) => r.model.capabilities.modes.length === 1 && r.model.capabilities.modes[0] === 'i2v');
  if (i2vOnly) {
    assert.equal(validateRouteRequest(i2vOnly, baseParams()).ok, false, 'image-only models need an image');
  }
});

test('previewJob combines validation, price, and the budget guard for the UI', () => {
  const route = pick((r) => r.providerId === 'google', 'Veo');
  const ok = previewJob({ routeId: route.id, params: baseParams({ durationSeconds: 4 }) });
  assert.equal(ok.ok, true);
  assert.ok(ok.cost.usd > 0);
  assert.equal(ok.route.providerId, 'google');
  assert.match(ok.cost.note, /\/s/);

  const blocked = previewJob({ routeId: route.id, params: baseParams({ durationSeconds: 8 }), budget: { maxUsdPerClip: 0.01 } });
  assert.equal(blocked.ok, false);
  assert.match(blocked.errors[0], /per-clip cap/);

  const unknown = previewJob({ routeId: 'nope::nope', params: baseParams() });
  assert.equal(unknown.ok, false);
  assert.match(unknown.errors[0], /Unknown video route/);
});

test('docs helpers show the exact call for every protocol', () => {
  for (const route of [
    pick((r) => r.providerId === 'fal', 'fal'),
    pick((r) => r.providerId === 'replicate', 'replicate'),
    pick((r) => r.providerId === 'openrouter', 'openrouter'),
  ]) {
    const described = describeRoute(route, { params: baseParams() });
    assert.ok(described.protocol, route.id);
    assert.ok(described.sample.url.startsWith('https://'), `${route.id} sample url`);
    const curl = curlForRoute(route, { params: baseParams(), auth: { key: 'k' } });
    assert.match(curl, /^curl -sS -X POST 'https:\/\//);
    assert.match(curl, /-d '/);
  }
});
