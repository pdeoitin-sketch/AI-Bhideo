import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertWithinBudget,
  billableDurations,
  costSummary,
  estimateClipCost,
  estimateMonthlyCost,
  formatPricePerSecond,
  formatUsd,
  maxDurationSeconds,
  rankRoutesByCost,
  selectRoute,
  snapDuration,
  usdToCredits,
} from '../src/services/video/costEngine.js';
import { CREDIT_TO_USD, findRoutes, getRoute } from '../src/data/videoProviders.js';

const route = (id) => {
  const found = getRoute(id);
  assert.ok(found, `route ${id} must exist in the catalogue`);
  return found;
};

test('duration snapping keeps requests inside the model ladder', () => {
  const veo = route('veo-3-1-fast::google').model;
  assert.deepEqual(billableDurations(veo), [4, 6, 8]);
  assert.equal(snapDuration(veo, 8), 8, 'exact values are kept');
  assert.equal(snapDuration(veo, 5), 4, 'midpoints snap to the nearest rung');
  assert.equal(snapDuration(veo, 100), 8, 'over-sized requests clamp to the max');
  assert.equal(snapDuration(veo, 0), 4);
  assert.equal(maxDurationSeconds(veo), 8);
  assert.equal(snapDuration({ capabilities: {} }, 7), 5, 'models without a ladder fall back to 5s');
});

test('per-second pricing multiplies by duration and adds the audio surcharge', () => {
  const veoFast = route('veo-3-1-fast::google');
  const silent = estimateClipCost(veoFast, { durationSeconds: 8, resolution: '720p' });
  assert.equal(silent.usd, 0.8, '720p fast at $0.10/s for 8s');
  assert.equal(silent.credits, Math.ceil(0.8 / CREDIT_TO_USD));

  const withAudio = estimateClipCost(veoFast, { durationSeconds: 8, resolution: '4K' });
  assert.equal(withAudio.usd, 2.4, 'the 4K tier rate wins over the flat figure');

  const kling = route('kling-3-0-standard::kling');
  const audioClip = estimateClipCost(kling, { durationSeconds: 10, resolution: '720p', audio: true });
  assert.ok(audioClip.usd > estimateClipCost(kling, { durationSeconds: 10, resolution: '720p' }).usd, 'audio must cost more on Kling');
});

test('flat per-run billing does not scale with duration', () => {
  const wan = route('wan-2-2-i2v-fast::replicate');
  const short = estimateClipCost(wan, { durationSeconds: 3 });
  const long = estimateClipCost(wan, { durationSeconds: 8 });
  assert.equal(short.usd, 0.05);
  assert.equal(long.usd, 0.05, 'a flat run price is the same for 3s or 8s');
  assert.match(long.note, /flat/);
});

test('requests longer than one generation bill as multiple runs', () => {
  const wan = route('wan-2-2-i2v-fast::replicate');
  const overCap = estimateClipCost(wan, { durationSeconds: 24 });
  assert.equal(overCap.usd, +(0.05 * Math.ceil(24 / maxDurationSeconds(wan.model))).toFixed(4));
});

test('iteration takes multiply cost, and free routes stay free', () => {
  const veo = route('veo-3-1-fast::google');
  assert.equal(estimateClipCost(veo, { durationSeconds: 4, takes: 3 }).usd, +(0.1 * 4 * 3).toFixed(4));
  const local = route('local-cinema::local');
  const free = estimateClipCost(local, { durationSeconds: 8, takes: 5 });
  assert.equal(free.usd, 0);
  assert.equal(free.credits, 0, 'a free route must never charge credits');
});

test('credit conversion rounds up and never goes negative', () => {
  assert.equal(usdToCredits(0), 0);
  assert.equal(usdToCredits(0.001), 1);
  assert.equal(usdToCredits(CREDIT_TO_USD), 1);
  assert.equal(usdToCredits(-5), 0);
});

test('money formatting keeps sub-cent rates readable', () => {
  assert.equal(formatUsd(0.1), '$0.10');
  assert.equal(formatUsd(0.0066), '$0.0066');
  assert.equal(formatUsd(undefined), '$0.00');
  assert.match(formatPricePerSecond(route('local-turbo::local')), /free/);
  assert.match(formatPricePerSecond(route('veo-3-1-lite::google')), /\$0\.0\d+\/s/);
});

test('monthly projection scales by clip volume and reports per-minute cost', () => {
  const pruna = route('p-video::replicate');
  const monthly = estimateMonthlyCost(pruna, { durationSeconds: 5, clipsPerMonth: 100 });
  const perClip = estimateClipCost(pruna, { durationSeconds: 5 });
  assert.equal(monthly.usd, +(perClip.usd * 100).toFixed(2));
  assert.equal(monthly.clipsPerMonth, 100);
  assert.ok(monthly.minutesOfVideo > 0);
  assert.ok(monthly.costPerMinuteOfVideo > 0);
  assert.equal(estimateMonthlyCost(pruna, { durationSeconds: 5, clipsPerMonth: 0 }).usd, 0);
});

test('ranking puts the cheapest matching route first', () => {
  const audioRoutes = findRoutes({ needsAudio: true, resolution: '720p' });
  const ranked = rankRoutesByCost(audioRoutes, { durationSeconds: 6, resolution: '720p' });
  assert.ok(ranked.length > 2);
  for (let i = 1; i < ranked.length; i += 1) {
    assert.ok(ranked[i].cost.usd >= ranked[i - 1].cost.usd, 'ranking must be monotonic');
  }
});

test('route selection prefers a free route, then a preferred provider, then budget', () => {
  const everything = [
    route('local-cinema::local'),
    route('veo-3-1-fast::google'),
    route('veo-3-1-lite::google'),
  ];
  assert.equal(selectRoute(everything, {}).id, 'local-cinema::local', 'free wins by default');
  assert.equal(
    selectRoute(everything, { allowFreePreference: false }).id,
    'veo-3-1-lite::google',
    'without the free preference the cheapest paid route wins'
  );
  assert.equal(
    selectRoute(everything, { allowFreePreference: false, preferredProvider: 'google' }).providerId,
    'google'
  );
  assert.equal(
    selectRoute(everything, { allowFreePreference: false, maxUsdPerClip: 0.3 })?.id,
    'veo-3-1-lite::google',
    'an unaffordable cheaper option must be skipped'
  );
  assert.equal(selectRoute([], {}), null);
});

test('budget guard refuses over-cap clips with an actionable message', () => {
  const veo = route('veo-3-1-standard::google');
  const blocked = assertWithinBudget(veo, { durationSeconds: 8, maxUsdPerClip: 0.5 });
  assert.equal(blocked.ok, false);
  assert.match(blocked.message, /per-clip cap/);
  assert.match(blocked.message, /\$\d/);

  assert.equal(assertWithinBudget(veo, { durationSeconds: 8, maxUsdPerClip: 100 }).ok, true);

  const monthly = assertWithinBudget(veo, { durationSeconds: 8, monthlyBudgetUsd: 5, monthSpentUsd: 4.9 });
  assert.equal(monthly.ok, false);
  assert.equal(monthly.reason, 'over-monthly-budget');
});

test('cost summary explains a route in one line', () => {
  assert.match(costSummary(route('local-cinema::local'), { durationSeconds: 8 }), /free/i);
  const line = costSummary(route('veo-3-1-fast::google'), { durationSeconds: 8, resolution: '1080p' });
  assert.match(line, /\$0\.10\/s/);
  assert.match(line, /\$0\.96/);
  assert.match(line, /8s clip/);
  assert.match(line, /credits/);
  assert.match(costSummary(null), /Pick a model/);
});
