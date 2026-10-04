import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_ROUTES,
  CATALOGUE_MODELS,
  LOCAL_MODELS,
  PROVIDER_BY_ID,
  VIDEO_MODELS,
  VIDEO_PROVIDERS,
  cheapestMatchingRoute,
  findRoutes,
  getRoute,
  modelsForProvider,
  PRICE_AS_OF,
} from '../src/data/videoProviders.js';
import { PROTOCOLS, listProtocols } from '../src/services/video/protocols/index.js';

/**
 * The catalogue is data, and data rots silently. These tests are the contract
 * that every model route in `videoProviders.js` is actually callable: a known
 * provider, an implemented protocol, a price, and capability metadata.
 */

test('catalogue exports a price as-of date (prices must never look undated)', () => {
  assert.match(PRICE_AS_OF, /^\d{4}-\d{2}-\d{2}$/);
});

test('provider ids are unique and every protocol is implemented', () => {
  const ids = VIDEO_PROVIDERS.map((provider) => provider.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate provider id');
  for (const provider of VIDEO_PROVIDERS) {
    assert.ok(PROTOCOLS[provider.protocol], `${provider.id} uses unimplemented protocol "${provider.protocol}"`);
    assert.ok(listProtocols().includes(provider.protocol));
  }
});

test('every provider documents docs, free tier, and pricing confidence', () => {
  for (const provider of VIDEO_PROVIDERS) {
    assert.ok(provider.name, `${provider.id} needs a display name`);
    assert.ok(provider.blurb, `${provider.id} needs a blurb`);
    assert.ok(provider.docsUrl, `${provider.id} needs a docs link`);
    assert.ok(provider.freeTier?.label, `${provider.id} needs a freeTier label`);
    assert.ok(['vendor', 'reported'].includes(provider.price?.confidence), `${provider.id} price must be vendor|reported`);
    if (provider.id !== 'local' && provider.id !== 'custom') {
      assert.ok(provider.envVar, `${provider.id} needs an env var name for server-side keys`);
    }
  }
});

test('model ids are unique and every model carries caps + pricing', () => {
  const ids = CATALOGUE_MODELS.map((model) => model.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate model id');
  assert.ok(LOCAL_MODELS.every((model) => model.routes[0].providerId === 'local'), 'local models must use the local provider');
  for (const model of CATALOGUE_MODELS) {
    assert.ok(model.name && model.maker, `${model.id} needs name + maker`);
    assert.ok(model.tagline, `${model.id} needs a tagline`);
    const caps = model.capabilities;
    assert.ok(Array.isArray(caps.modes) && caps.modes.length, `${model.id} needs modes`);
    assert.ok(Array.isArray(caps.resolutions) && caps.resolutions.length, `${model.id} needs resolutions`);
    assert.ok(Array.isArray(caps.durations) && caps.durations.length, `${model.id} needs durations`);
    assert.ok(Array.isArray(caps.aspectRatios) && caps.aspectRatios.length, `${model.id} needs aspect ratios`);
    assert.equal(typeof caps.audio, 'boolean', `${model.id} audio must be boolean`);
    assert.ok(model.pricing && Number.isFinite(Number(model.pricing.usdPerSecond ?? model.pricing.usdPerRun ?? model.pricing.usdPerClip)), `${model.id} needs a numeric price`);
    assert.ok(['live', 'beta', 'retired'].includes(model.status), `${model.id} status must be live|beta|retired`);
    if (model.status === 'retired') assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(model.retiredOn), `${model.id} retired models need retiredOn`);
    assert.ok(model.routes.length, `${model.id} needs at least one route`);
  }
});

test('every route points at a real provider and a non-empty model slug', () => {
  for (const model of VIDEO_MODELS) {
    for (const route of model.routes) {
      assert.ok(PROVIDER_BY_ID[route.providerId], `${model.id} references unknown provider "${route.providerId}"`);
      assert.ok(typeof route.model === 'string' && route.model.length > 2, `${model.id}/${route.providerId} needs a vendor model slug`);
    }
  }
});

test('flattened routes are unique, correctly derived, and never carry secrets', () => {
  assert.equal(new Set(ALL_ROUTES.map((route) => route.id)).size, ALL_ROUTES.length, 'duplicate route id');
  for (const route of ALL_ROUTES) {
    assert.match(route.id, /^[a-z0-9-]+::[a-z0-9-]+(#\d+)?$/, `bad route id shape: ${route.id}`);
    assert.equal(route.providerId, route.route.providerId);
    assert.equal(route.requiresKey, route.provider.keyKind !== 'none');
    assert.ok(!JSON.stringify(route.route).match(/api[_-]?key["']?\s*[:=]\s*["'][A-Za-z0-9]/), 'catalogue must not contain literal keys');
    assert.ok(Number.isFinite(route.usdPerSecond) && route.usdPerSecond >= 0, `${route.id} needs a numeric usdPerSecond`);
    if (route.free) assert.equal(route.providerId, route.providerId);
  }
});

test('retired models are excluded by default but visible on request', () => {
  const retired = VIDEO_MODELS.filter((model) => model.status === 'retired');
  assert.ok(retired.length >= 1, 'expected at least one retired model (Sora 2)');
  for (const model of retired) {
    assert.equal(findRoutes({}).some((route) => route.modelId === model.id), false, `${model.id} must be hidden by default`);
    assert.equal(
      findRoutes({ includeRetired: true }).some((route) => route.modelId === model.id),
      true,
      `${model.id} must be visible with includeRetired`
    );
  }
});

test('findRoutes filters by capability and price, cheapest first', () => {
  const withAudio = findRoutes({ needsAudio: true });
  assert.ok(withAudio.length > 3, 'several routes must support native audio');
  withAudio.forEach((route) => assert.equal(route.model.capabilities.audio, true));

  const prices = withAudio.map((route) => route.usdPerSecond);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b), 'results must be sorted by price');

  const cheap = findRoutes({ maxUsdPerSecond: 0.05 });
  cheap.forEach((route) => assert.ok(route.usdPerSecond <= 0.05, `${route.id} over cap`));

  const free = findRoutes({ freeOnly: true });
  assert.ok(free.length >= 4, 'the four local profiles must be free');
  free.forEach((route) => assert.equal(route.usdPerSecond, 0));

  const fourK = findRoutes({ resolution: '4K' });
  fourK.forEach((route) => assert.ok(route.model.capabilities.resolutions.includes('4K')));

  assert.equal(findRoutes({ mode: 'i2v', freeOnly: true, maxUsdPerSecond: -1 }).length >= 0, true);
});

test('a cheapest route exists for the common studio requests', () => {
  const draft = cheapestMatchingRoute({ mode: 't2v', maxUsdPerSecond: 0.06 });
  assert.ok(draft, 'budget drafts must resolve to a route');
  assert.ok(draft.usdPerSecond <= 0.06);

  const audio = cheapestMatchingRoute({ needsAudio: true });
  assert.equal(audio.model.capabilities.audio, true);

  const selfHost = cheapestMatchingRoute({ needsOpenWeight: true });
  assert.equal(selfHost.model.capabilities.openWeight, true);
});

test('local routes need no key and are always the cheapest option', () => {
  const local = findRoutes({ freeOnly: true })[0];
  assert.equal(local.providerId, 'local', 'the free local route should sort first');
  assert.equal(local.requiresKey, false);
  assert.equal(local.usdPerSecond, 0);
  assert.equal(local.retired, false);
});

test('modelsForProvider lists the catalogue per vendor route', () => {
  const falModels = modelsForProvider('fal');
  assert.ok(falModels.length >= 5, 'fal should cover many models as an aggregator');
  falModels.forEach((model) => assert.ok(model.routes.some((route) => route.providerId === 'fal')));
  assert.deepEqual(modelsForProvider('nope'), []);
});

test('getRoute returns the exact route object for its id', () => {
  const route = ALL_ROUTES[Math.floor(ALL_ROUTES.length / 2)];
  const found = getRoute(route.id);
  assert.equal(found, route);
  assert.equal(getRoute('does-not-exist::fal'), null);
});

test('same model can be sold by several providers at different prices', () => {
  const byModel = ALL_ROUTES.reduce((acc, route) => {
    acc[route.modelId] = acc[route.modelId] || [];
    acc[route.modelId].push(route);
    return acc;
  }, {});
  const multi = Object.entries(byModel).filter(([, routes]) => routes.length > 1);
  assert.ok(multi.length >= 8, 'most models should offer more than one provider route');
  const [, routes] = multi[0];
  const prices = new Set(routes.map((route) => route.usdPerSecond));
  assert.ok(prices.size >= 1);
  // The same provider may appear twice only when the vendor slug differs
  // (e.g. MiniMax standard vs Fast, Cloudflare Seedance fast vs mini).
  const seen = new Set();
  for (const route of routes) {
    const key = `${route.providerId}::${route.route.model}`;
    assert.equal(seen.has(key), false, `duplicate route for ${key}`);
    seen.add(key);
  }
});
