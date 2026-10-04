/**
 * Cost engine — pure, dependency-free price maths for the video catalogue.
 *
 * Everything the UI shows about money comes from here so it can be unit tested
 * and so a single pricing bug cannot drift across components. Estimates are
 * budget guidance, never invoices: providers bill per successfully generated
 * second (or per run/clip) and failed attempts may still be charged.
 */

import { CREDIT_TO_USD } from '../../data/videoProviders.js';

/** Smallest billable length for a route, from the model's own duration ladder. */
export function billableDurations(model) {
  const durations = Array.isArray(model?.capabilities?.durations) ? model.capabilities.durations.filter((d) => d > 0) : [];
  return durations.length ? durations : [5];
}

export function maxDurationSeconds(model) {
  return Math.max(...billableDurations(model));
}

/** Snap an arbitrary requested length onto the model's supported ladder. */
export function snapDuration(model, requestedSeconds) {
  const ladder = billableDurations(model).slice().sort((a, b) => a - b);
  const wanted = Math.max(1, Number(requestedSeconds) || ladder[0]);
  if (ladder.includes(wanted)) return wanted;
  const nearest = ladder.reduce(
    (best, value) => (Math.abs(value - wanted) < Math.abs(best - wanted) ? value : best),
    ladder[0]
  );
  return nearest;
}

/**
 * Estimate the provider price of one clip in USD.
 *
 * Billing units seen in the wild:
 *   'second'  — price × seconds (Veo, Kling, Runway, LTX, Wan, Hailuo…)
 *   'run'     — flat price per job (Wan 2.2 i2v fast, some Stability SKUs)
 *   'clip'    — flat price per finished clip (MiniMax list prices)
 *   'token'   — resolution-scaled; approximated by its per-second figure
 *   'gpu-hour'— self-hosted; per-second figure derived from the rented GPU rate
 *   'neuron'  — Cloudflare; per-second figure is an approximation
 */
export function estimateClipCost(route, options = {}) {
  if (!route) return { usd: 0, credits: 0, seconds: 0, unit: 'unknown', note: 'No route selected.' };

  const { durationSeconds = 5, resolution, takes = 1, audio } = options;
  const price = { ...(route.provider?.price || {}), ...(route.model?.pricing || {}), ...(route.route?.price || {}) };
  const unit = price.unit || 'second';
  const seconds = Math.max(1, Number(durationSeconds) || 1);

  let usd = 0;
  let note = '';

  if (unit === 'run' || unit === 'clip') {
    const flat = Number(price.usdPerRun ?? price.usdPerClip ?? 0);
    const clipsPerRequest = Math.max(1, Math.ceil(seconds / maxDurationSeconds(route.model)));
    usd = flat * clipsPerRequest;
    note = `flat ${price.usdPerRun != null ? '$' + flat.toFixed(2) : '$' + flat.toFixed(2)} per ${unit}`;
  } else {
    // Resolution tiers live on the model (`model.tiers`) or inside `pricing`.
    const tiers = price.tiers || route.model?.tiers || {};
    let perSecond = Number(price.usdPerSecond || 0);
    const tierKey = resolution || Object.keys(tiers)[0];
    const tierRate = Number(tiers[tierKey]);
    if (Number.isFinite(tierRate) && tierRate > 0) perSecond = tierRate;
    if (audio && Number(tiers.audioSurcharge) > 0) perSecond += tiers.audioSurcharge;
    usd = perSecond * seconds;
    note = `$${perSecond.toFixed(3)}/s × ${seconds}s${unit === 'neuron' ? ' (Neuron estimate)' : ''}${unit === 'token' ? ' (token-billed approx.)' : ''}`;
  }

  const attempts = Math.max(1, Number(takes) || 1);
  usd *= attempts;
  if (attempts > 1) note += ` × ${attempts} takes`;

  return {
    usd: +usd.toFixed(4),
    // A free route must stay free in the credit ledger too, or the studio would
    // charge a credit for every local preview render.
    credits: usd <= 0 ? 0 : Math.max(1, Math.ceil(usd / CREDIT_TO_USD)),
    seconds,
    unit,
    note,
  };
}

/** Projected monthly spend for a clip volume, including the retry multiplier. */
export function estimateMonthlyCost(route, options = {}) {
  const { clipsPerMonth = 0, takes = 1 } = options;
  const perClip = estimateClipCost(route, options);
  const usd = +(perClip.usd * Math.max(0, Number(clipsPerMonth) || 0)).toFixed(2);
  return {
    usd,
    perClip: perClip.usd,
    clipsPerMonth: Math.max(0, Number(clipsPerMonth) || 0),
    minutesOfVideo: +(((perClip.seconds * (Number(clipsPerMonth) || 0)) / 60)).toFixed(1),
    costPerMinuteOfVideo: perClip.seconds ? +((perClip.usd / (perClip.seconds / 60))).toFixed(2) : 0,
  };
}

/** USD credits: the demo ledger charges 1 credit per CREDIT_TO_USD dollar. */
export function usdToCredits(usd) {
  return Math.max(0, Math.ceil((Number(usd) || 0) / CREDIT_TO_USD));
}

export function formatUsd(value, { digits } = {}) {
  const amount = Number(value) || 0;
  const decimals = digits ?? (amount > 0 && amount < 0.01 ? 4 : 2);
  return `$${amount.toFixed(decimals)}`;
}

export function formatPricePerSecond(route) {
  const perSecond = Number(route?.usdPerSecond);
  if (!Number.isFinite(perSecond)) return 'price n/a';
  if (perSecond <= 0) return 'free';
  return `${formatUsd(perSecond, { digits: perSecond < 0.1 ? 3 : 2 })}/s`;
}

/** Rank routes by what a specific job would actually cost. */
export function rankRoutesByCost(routes, options = {}) {
  return (Array.isArray(routes) ? routes : [])
    .map((route) => ({ route, cost: estimateClipCost(route, options) }))
    .filter((entry) => entry.route)
    .sort((a, b) => a.cost.usd - b.cost.usd);
}

/**
 * Pick the route to run: cheapest that satisfies the requirements, unless a
 * preferred provider is configured and affordable within `maxUsdPerClip`.
 */
export function selectRoute(routes, options = {}) {
  const { preferredProvider, maxUsdPerClip, allowFreePreference = true } = options;
  let ranked = rankRoutesByCost(routes, options);
  // "Paid quality only" must drop the free preview routes, not just deprioritise them.
  if (!allowFreePreference) ranked = ranked.filter((entry) => entry.cost.usd > 0);
  if (!ranked.length) return null;

  if (allowFreePreference && ranked[0].cost.usd === 0) return ranked[0].route;

  if (preferredProvider) {
    const preferred = ranked.find((entry) => entry.route.providerId === preferredProvider);
    if (preferred && (!Number.isFinite(maxUsdPerClip) || preferred.cost.usd <= maxUsdPerClip)) {
      return preferred.route;
    }
  }

  if (Number.isFinite(maxUsdPerClip)) {
    const affordable = ranked.find((entry) => entry.cost.usd <= maxUsdPerClip);
    if (affordable) return affordable.route;
  }

  return ranked[0].route;
}

/** Hard stop before spending: used by the gateway and the studio. */
export function assertWithinBudget(route, options = {}) {
  const { maxUsdPerClip, monthlyBudgetUsd, monthSpentUsd = 0 } = options;
  const cost = estimateClipCost(route, options);
  if (Number.isFinite(maxUsdPerClip) && cost.usd > maxUsdPerClip) {
    return {
      ok: false,
      reason: `over-per-clip`,
      message: `${route.model.name} via ${route.provider.name} would cost ${formatUsd(cost.usd)} for this clip, above the ${formatUsd(maxUsdPerClip)} per-clip cap.`,
      cost,
    };
  }
  if (Number.isFinite(monthlyBudgetUsd) && monthSpentUsd + cost.usd > monthlyBudgetUsd) {
    return {
      ok: false,
      reason: `over-monthly-budget`,
      message: `This clip (${formatUsd(cost.usd)}) would push ${formatUsd(monthSpentUsd)} of ${formatUsd(monthlyBudgetUsd)} monthly spend over the cap.`,
      cost,
    };
  }
  return { ok: true, message: '', cost };
}

/** Human "what does this cost me" one-liner for the studio footer. */
export function costSummary(route, options = {}) {
  if (!route) return 'Pick a model to see an estimated price.';
  const cost = estimateClipCost(route, options);
  const price = formatPricePerSecond(route);
  if (cost.usd === 0) return `${price} — this route costs nothing to run.`;
  return `${price} · ${formatUsd(cost.usd)} for a ${cost.seconds}s clip ≈ ${cost.credits} credits`;
}
