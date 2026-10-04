/**
 * AI-Bhideo video model + provider registry.
 *
 * This is the single source of truth for *which* video-generation models the
 * studio can use and *through which API* each one is reachable. One model is
 * often sold by several vendors at different prices, so a model carries a list
 * of `routes`; every route is callable by the same generic job runner because
 * each `protocol` ships a small adapter (see `src/services/video/protocols/`).
 *
 * PRICING HONESTY
 * ---------------
 * Rates below are public list prices gathered on PRICE_AS_OF from vendor
 * pricing pages and cross-checked against secondary sources. Per-second video
 * prices move monthly and often differ by region/resolution/audio, so:
 *   - `price.confidence` is 'vendor' when taken from the vendor's own page,
 *     'reported' when taken from a secondary source (treat as an estimate),
 *   - `price.usdPerSecond` is the *typical* rate for `price.referenceTier`,
 *   - the UI always shows the as-of date and links to the source, and
 *   - `estimateClipCost()` is an estimate for a budget gauge, never an invoice.
 * Nothing here is a contract: verify on the vendor page before spending.
 */

export const PRICE_AS_OF = '2026-10-04';

/** 1 compute credit == this many USD of upstream provider spend (demo ledger). */
export const CREDIT_TO_USD = 0.05;

/**
 * Providers are the API accounts a user can authenticate against.
 * `protocol` selects the adapter, `envVar` the server-side key, `keyKind`
 * describes what the user must paste in the BYOK panel.
 */
export const VIDEO_PROVIDERS = [
  {
    id: 'local',
    name: 'AI-Bhideo Local Renderer',
    protocol: 'local',
    kind: 'local',
    blurb: 'Prompt-themed canvas renderer recorded in the browser. No key, no network, no cost.',
    docsUrl: 'https://github.com/pdeoitin-sketch/AI-Bhideo',
    keyKind: 'none',
    freeTier: { label: 'Unlimited', detail: 'Free forever, runs on your CPU/GPU locally.' },
    supports: { t2v: true, i2v: false, audio: false, upscale: false, extend: false },
    corsSafeInBrowser: true,
    price: { unit: 'second', usdPerSecond: 0, confidence: 'vendor', referenceTier: 'n/a', note: 'Your hardware only.' },
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    protocol: 'cloudflare',
    kind: 'edge',
    blurb: 'Open and third-party video models on Cloudflare edge GPUs, metered in Neurons with a real daily free allowance.',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts',
    docsUrl: 'https://developers.cloudflare.com/ai/models/',
    keyKind: 'apiKey + accountId',
    envVar: 'CLOUDFLARE_API_TOKEN',
    extraEnvVars: ['CLOUDFLARE_ACCOUNT_ID'],
    // Model slugs in the Workers AI catalogue churn; `verify` reminds us to
    // re-check them against `GET /ai/models` before trusting a hard-coded id.
    verifySlugs: true,
    freeTier: {
      label: '10,000 Neurons/day',
      detail: 'Free daily allowance on the Workers Free plan, no card required; hard rate limit instead of billing. Video models burn it fast.',
    },
    supports: { t2v: true, i2v: true, audio: true, upscale: false, extend: true },
    corsSafeInBrowser: false,
    price: {
      unit: 'neuron',
      usdPerSecond: 0.02,
      confidence: 'reported',
      referenceTier: 'varies per model',
      note: 'Billed at $0.011 per 1,000 Neurons above the free daily allowance; per-model Neuron rates in the dashboard.',
    },
  },
  {
    id: 'fal',
    name: 'fal.ai',
    protocol: 'fal',
    kind: 'aggregator',
    blurb: 'Largest single-key catalogue (Veo, Kling, Seedance, Wan, LTX, Hailuo…) with the lowest headline per-second rates.',
    baseUrl: 'https://queue.fal.run',
    docsUrl: 'https://fal.ai/docs/documentation/model-apis/overview',
    keyKind: 'apiKey',
    envVar: 'FAL_KEY',
    freeTier: { label: 'Signup credit (~$10–20)', detail: 'One-time trial credit for new accounts, not a recurring free tier.' },
    supports: { t2v: true, i2v: true, audio: true, upscale: true, extend: true },
    corsSafeInBrowser: false,
    price: { unit: 'second', usdPerSecond: 0.05, confidence: 'reported', referenceTier: 'Wan class models', note: 'Per model page; same model can be cheaper here than first-party.' },
  },
  {
    id: 'replicate',
    name: 'Replicate',
    protocol: 'replicate',
    kind: 'aggregator',
    blurb: 'Predictable async predictions API, webhooks, and the widest open-weight model coverage.',
    baseUrl: 'https://api.replicate.com/v1',
    docsUrl: 'https://replicate.com/docs/topics/predictions',
    keyKind: 'apiKey',
    envVar: 'REPLICATE_API_TOKEN',
    freeTier: { label: 'Limited free runs', detail: 'New accounts get a handful of free predictions; then pay-as-you-go.' },
    supports: { t2v: true, i2v: true, audio: true, upscale: false, extend: true },
    corsSafeInBrowser: false,
    price: { unit: 'second', usdPerSecond: 0.07, confidence: 'reported', referenceTier: 'Wan 480p', note: 'Official models bill per output second; community models bill per GPU second.' },
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Video',
    protocol: 'openrouter',
    kind: 'aggregator',
    blurb: 'One key, one unified async contract (`/api/v1/videos`) that swaps Seedance / Veo / Wan / Kling / Hailuo by model slug.',
    baseUrl: 'https://openrouter.ai/api/v1',
    docsUrl: 'https://openrouter.ai/docs/cookbook/video-generation/text-to-video',
    keyKind: 'apiKey',
    envVar: 'OPENROUTER_API_KEY',
    freeTier: { label: 'None for video', detail: 'Prepaid credits only; discovering models via GET /api/v1/videos/models is free.' },
    supports: { t2v: true, i2v: true, audio: true, upscale: false, extend: false },
    corsSafeInBrowser: false,
    price: { unit: 'second', usdPerSecond: 0.03, confidence: 'reported', referenceTier: 'Veo 3.1 Lite 720p', note: 'Aggregates cheapest upstream route per model; query the models endpoint for live caps.' },
  },
  {
    id: 'google',
    name: 'Google Gemini API (Veo)',
    protocol: 'google-lro',
    kind: 'first-party',
    blurb: 'First-party Veo 3.1 / Gemini Omni Flash: native audio, up to 4K, extension and frame control.',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    docsUrl: 'https://ai.google.dev/gemini-api/docs/veo',
    keyKind: 'apiKey',
    envVar: 'GEMINI_API_KEY',
    freeTier: { label: 'None for Veo', detail: 'AI Studio has a free tier for text models; Veo video generation is paid-only.' },
    supports: { t2v: true, i2v: true, audio: true, upscale: false, extend: true },
    corsSafeInBrowser: false,
    price: { unit: 'second', usdPerSecond: 0.4, confidence: 'vendor', referenceTier: 'Veo 3.1 Standard 720/1080p incl. audio', note: 'Lite $0.05–0.08/s and Fast $0.10–0.12/s are the budget tiers.' },
  },
  {
    id: 'minimax',
    name: 'MiniMax (Hailuo)',
    protocol: 'minimax',
    kind: 'first-party',
    blurb: 'Hailuo video generation with a self-serve pay-as-you-go key from $5 and strong motion physics.',
    baseUrl: 'https://api.minimax.io/v1',
    docsUrl: 'https://platform.minimax.io/docs/api-reference/video-generation-t2v',
    keyKind: 'apiKey',
    envVar: 'MINIMAX_API_KEY',
    freeTier: { label: 'Occasional promo credits', detail: 'No standing free API tier; credits are bought in packs valid 365 days.' },
    supports: { t2v: true, i2v: true, audio: true, upscale: false, extend: false },
    corsSafeInBrowser: false,
    price: { unit: 'second', usdPerSecond: 0.05, confidence: 'reported', referenceTier: 'Hailuo 2.3 768p', note: 'Per-clip list prices: 768p 6s $0.28, 1080p 6s $0.49, H3 2K $0.13/s.' },
  },
  {
    id: 'kling',
    name: 'Kling AI (Kuaishou)',
    protocol: 'kling',
    kind: 'first-party',
    blurb: 'Kling 3.0 / Video O3 direct: cinematic motion, 4K/60fps, longest clip lengths, JWT auth.',
    baseUrl: 'https://api-singapore.klingai.com',
    docsUrl: 'https://app.klingai.com/global/dev/document-api',
    keyKind: 'accessKey + secretKey (JWT)',
    envVar: 'KLING_ACCESS_KEY',
    extraEnvVars: ['KLING_SECRET_KEY'],
    freeTier: { label: '66 credits/day (app)', detail: 'The consumer app grants daily credits; the API is prepaid packages from ~$700.' },
    supports: { t2v: true, i2v: true, audio: true, upscale: true, extend: true },
    corsSafeInBrowser: false,
    price: { unit: 'second', usdPerSecond: 0.084, confidence: 'vendor', referenceTier: 'Kling 3.0 720p silent', note: '$0.126/s with audio, $0.112–0.168/s at 1080p, $0.42/s at 4K.' },
  },
  {
    id: 'runway',
    name: 'Runway Dev',
    protocol: 'runway',
    kind: 'first-party',
    blurb: 'Gen-4.5 plus third-party models behind one Runway key, with recipes for multi-step edits.',
    baseUrl: 'https://api.dev.runwayml.com',
    docsUrl: 'https://docs.dev.runwayml.com/',
    keyKind: 'apiKey',
    envVar: 'RUNWAYML_API_SECRET',
    fixedHeaders: { 'X-Runway-Version': '2024-11-06' },
    freeTier: { label: 'Trial credits', detail: 'Signup credits on a free account; paid plans are credit subscriptions.' },
    supports: { t2v: true, i2v: true, audio: true, upscale: true, extend: true },
    corsSafeInBrowser: false,
    price: { unit: 'credit', usdPerSecond: 0.12, confidence: 'reported', referenceTier: 'Gen-4.5 720p', note: 'Runway bills in credits (10 credits/sec on some routes); ~$0.01 per credit on plans.' },
  },
  {
    id: 'luma',
    name: 'Luma (Ray)',
    protocol: 'template',
    kind: 'first-party',
    blurb: 'Ray 3.x cinematographic motion; accessed through its REST job API.',
    baseUrl: 'https://api.lumalabs.ai',
    docsUrl: 'https://docs.lumalabs.ai/',
    keyKind: 'apiKey',
    envVar: 'LUMA_API_KEY',
    freeTier: { label: 'Limited free generations', detail: 'Consumer free tier; API is pay-as-you-go.' },
    supports: { t2v: true, i2v: true, audio: false, upscale: false, extend: true },
    corsSafeInBrowser: false,
    verifySlugs: true,
    price: { unit: 'second', usdPerSecond: 0.09, confidence: 'reported', referenceTier: 'Ray 3.2 720p 10s', note: '~$0.90 per 10s clip; loop and keyframe modes included.' },
  },
  {
    id: 'pika',
    name: 'Pika',
    protocol: 'template',
    kind: 'first-party',
    blurb: 'Pika 2.5 with effects/templates; subscription-first, third-party API access for automation.',
    baseUrl: 'https://api.pika.art',
    docsUrl: 'https://pika.art/',
    keyKind: 'apiKey',
    envVar: 'PIKA_API_KEY',
    freeTier: { label: 'Free credits, commercial use allowed', detail: 'One of the few free tiers that permits commercial output (capped at 480p).' },
    supports: { t2v: true, i2v: true, audio: false, upscale: false, extend: false },
    corsSafeInBrowser: false,
    verifySlugs: true,
    price: { unit: 'second', usdPerSecond: 0.08, confidence: 'reported', referenceTier: 'via aggregators', note: 'No public pay-as-you-go list price; ~$0.05–0.15/s through aggregators.' },
  },
  {
    id: 'stability',
    name: 'Stability AI',
    protocol: 'stability',
    kind: 'first-party',
    blurb: 'Image-to-video (Stable Video Diffusion family) for animating your own stills.',
    baseUrl: 'https://api.stability.ai',
    docsUrl: 'https://platform.stability.ai/docs/api-reference',
    keyKind: 'apiKey',
    envVar: 'STABILITY_API_KEY',
    freeTier: { label: '25 free credits', detail: 'One-time credits on new accounts; Stable Assistant has daily free generations (not the API).' },
    supports: { t2v: false, i2v: true, audio: false, upscale: false, extend: false },
    corsSafeInBrowser: false,
    price: { unit: 'second', usdPerSecond: 0.02, confidence: 'reported', referenceTier: 'per generation', note: 'Historically billed per generation (≈$0.20–0.40 per short clip).' },
  },
  {
    id: 'byteplus',
    name: 'BytePlus ModelArk (Seedance)',
    protocol: 'template',
    kind: 'first-party',
    blurb: 'ByteDance Seedance 2.0 direct — top of the audio-with-video leaderboards, cheaper than Western flagships.',
    baseUrl: 'https://ark.ap-southeast.bytepluses.com/api/v3',
    docsUrl: 'https://www.byteplus.com/en/product/ModelArk',
    keyKind: 'apiKey',
    envVar: 'BYTEPLUS_ARK_API_KEY',
    freeTier: { label: 'Free trial tokens', detail: 'New-user trial quota; video SKUs are usually paid.' },
    supports: { t2v: true, i2v: true, audio: true, upscale: false, extend: true },
    corsSafeInBrowser: false,
    verifySlugs: true,
    price: { unit: 'second', usdPerSecond: 0.09, confidence: 'reported', referenceTier: 'Seedance 2.0 Fast 720p', note: 'Bills by video token (w·h·fps·sec ÷ 1024), so cost scales with resolution. Mini tier ~$0.08/s.' },
  },
  {
    id: 'openai',
    name: 'OpenAI (Sora)',
    protocol: 'openai-videos',
    kind: 'first-party',
    blurb: 'Sora 2 Videos API. RETIRED: OpenAI removed /v1/videos and the sora-2 models on 2026-09-24.',
    baseUrl: 'https://api.openai.com/v1',
    docsUrl: 'https://developers.openai.com/api/docs/guides/video-generation',
    keyKind: 'apiKey',
    envVar: 'OPENAI_API_KEY',
    freeTier: { label: 'None for video', detail: 'Sora was never on the free API tier and the endpoint is now removed.' },
    supports: { t2v: true, i2v: true, audio: true, upscale: false, extend: true },
    corsSafeInBrowser: false,
    retired: '2026-09-24',
    price: { unit: 'second', usdPerSecond: 0.1, confidence: 'vendor', referenceTier: 'sora-2 720p (last list price)', note: 'Historical: $0.10/s sora-2, $0.30/s sora-2-pro 720p, $0.50/s at 1024p.' },
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Inference',
    protocol: 'template',
    kind: 'edge',
    blurb: 'Serverless inference for community video pipelines (Wan, LTX, CogVideoX) plus your own Inference Endpoints.',
    baseUrl: 'https://router.huggingface.co',
    docsUrl: 'https://huggingface.co/docs/inference-providers',
    keyKind: 'apiKey',
    envVar: 'HF_TOKEN',
    freeTier: { label: 'Small monthly free credit', detail: 'Cents per month on the free plan; your own Inference Endpoint bills by GPU-hour instead.' },
    supports: { t2v: true, i2v: true, audio: false, upscale: false, extend: false },
    corsSafeInBrowser: true,
    verifySlugs: true,
    price: { unit: 'second', usdPerSecond: 0.01, confidence: 'reported', referenceTier: 'open-weight models', note: 'Endpoint cost is GPU-time: ~$0.03–0.08/hr per consumer GPU you rent yourself.' },
  },
  {
    id: 'custom',
    name: 'Self-host / ComfyUI (any REST)',
    protocol: 'template',
    kind: 'self-host',
    blurb: 'Bring your own endpoint: ComfyUI, FastVideo, Diffusers, a CogVideoX box, or any vendor not listed. Fully configurable request/response mapping.',
    docsUrl: 'https://github.com/comfyanonymous/ComfyUI',
    keyKind: 'apiKey (optional)',
    envVar: 'BHIDEO_CUSTOM_VIDEO_URL',
    freeTier: { label: 'Free software', detail: 'Weights are Apache-2.0 for Wan/LTX/Hunyuan; you pay only for the GPU you run.' },
    supports: { t2v: true, i2v: true, audio: false, upscale: false, extend: false },
    corsSafeInBrowser: false,
    verifySlugs: true,
    price: { unit: 'second', usdPerSecond: 0, confidence: 'vendor', referenceTier: 'self-hosted', note: 'Marginal cost is your GPU-hour: an H100 at ~$2/hr producing a 720p clip in ~2 min ≈ $0.07/clip.' },
  },
];

/**
 * Models (the "AI tools") with every vendor route that sells them.
 * `routes[].price.usdPerSecond` overrides the provider default when a vendor
 * publishes a specific rate for that model/tier.
 */
export const VIDEO_MODELS = [
  {
    id: 'veo-3-1-lite',
    name: 'Veo 3.1 Lite',
    maker: 'Google DeepMind',
    status: 'live',
    tagline: 'Cheapest way to get native-audio video from a serious flagship family.',
    strengths: ['Native audio', 'Lowest Veo price', 'Good for drafts at volume'],
    weaknesses: ['720p/1080p only (no 4K)', 'Short clips'],
    capabilities: {
      modes: ['t2v', 'i2v'],
      audio: true,
      resolutions: ['720p', '1080p'],
      aspectRatios: ['16:9', '9:16'],
      durations: [4, 6, 8],
      fps: 24,
      openWeight: false,
      watermark: 'SynthID',
    },
    pricing: { unit: 'second', usdPerSecond: 0.05, confidence: 'vendor', referenceTier: '720p incl. audio', freeTier: 'none' },
    tiers: { '720p': 0.05, '1080p': 0.08 },
    bestFor: 'draft',
    routes: [
      { providerId: 'google', model: 'veo-3.1-lite-generate-preview', price: { usdPerSecond: 0.05 }, note: 'Billed per successfully generated second.' },
      { providerId: 'openrouter', model: 'google/veo-3.1-lite', price: { usdPerSecond: 0.05 } },
      { providerId: 'fal', model: 'fal-ai/veo3.1/lite', price: { usdPerSecond: 0.05, confidence: 'reported' } },
      { providerId: 'replicate', model: 'google/veo-3.1-lite', price: { usdPerSecond: 0.03, confidence: 'reported' }, note: 'Silent SKU reported near $0.03/s.' },
    ],
  },
  {
    id: 'veo-3-1-fast',
    name: 'Veo 3.1 Fast',
    maker: 'Google DeepMind',
    status: 'live',
    tagline: 'The balanced default: production quality, audio, 4K option, per-second billing.',
    strengths: ['Production-grade motion', '4K available', 'Extension + last-frame control'],
    weaknesses: ['Pricier than Lite by 2–3×', 'No free tier'],
    capabilities: {
      modes: ['t2v', 'i2v', 'extend'],
      audio: true,
      resolutions: ['720p', '1080p', '4K'],
      aspectRatios: ['16:9', '9:16'],
      durations: [4, 6, 8],
      fps: 24,
      openWeight: false,
      watermark: 'SynthID',
    },
    pricing: { unit: 'second', usdPerSecond: 0.1, confidence: 'vendor', referenceTier: '720p incl. audio', freeTier: 'none' },
    tiers: { '720p': 0.1, '1080p': 0.12, '4K': 0.3 },
    bestFor: 'production',
    routes: [
      { providerId: 'google', model: 'veo-3.1-fast-generate-preview', price: { usdPerSecond: 0.1 }, note: 'Video-only pricing is lower (≈$0.08/s at 720p).' },
      { providerId: 'fal', model: 'fal-ai/veo3.1/fast', price: { usdPerSecond: 0.1, confidence: 'reported' } },
      { providerId: 'replicate', model: 'google/veo-3.1-fast', price: { usdPerSecond: 0.12, confidence: 'reported' } },
      { providerId: 'openrouter', model: 'google/veo-3.1-fast' },
    ],
  },
  {
    id: 'veo-3-1-standard',
    name: 'Veo 3.1 Standard',
    maker: 'Google DeepMind',
    status: 'live',
    tagline: 'Flagship fidelity for hero shots where the take has to be right first time.',
    strengths: ['Best physics + audio', '4K', 'Reference images (up to 3)'],
    weaknesses: ['Most expensive per second in the Veo family'],
    capabilities: {
      modes: ['t2v', 'i2v', 'extend'],
      audio: true,
      resolutions: ['720p', '1080p', '4K'],
      aspectRatios: ['16:9', '9:16'],
      durations: [4, 6, 8],
      fps: 24,
      openWeight: false,
      watermark: 'SynthID',
    },
    pricing: { unit: 'second', usdPerSecond: 0.4, confidence: 'vendor', referenceTier: '720/1080p incl. audio', freeTier: 'none' },
    tiers: { '720p': 0.4, '1080p': 0.4, '4K': 0.6 },
    bestFor: 'hero',
    routes: [
      { providerId: 'google', model: 'veo-3.1-generate-preview', price: { usdPerSecond: 0.4 } },
      { providerId: 'fal', model: 'fal-ai/veo3.1', price: { usdPerSecond: 0.35, confidence: 'reported' } },
      { providerId: 'replicate', model: 'google/veo-3.1', price: { usdPerSecond: 0.4, confidence: 'reported' } },
      { providerId: 'cloudflare', model: '@cf/google/veo-3.1', price: { usdPerSecond: 0.4, confidence: 'reported' }, verify: true },
    ],
  },
  {
    id: 'gemini-omni-flash',
    name: 'Gemini Omni Flash (video)',
    maker: 'Google DeepMind',
    status: 'live',
    tagline: 'Conversational video: multi-turn editing of a clip instead of re-rolling it.',
    strengths: ['Multi-turn edits', 'Character consistency', 'Fast'],
    weaknesses: ['Newer surface, docs still moving', 'No standing free tier'],
    capabilities: {
      modes: ['t2v', 'i2v', 'edit'],
      audio: true,
      resolutions: ['720p', '1080p'],
      aspectRatios: ['16:9', '9:16'],
      durations: [4, 6, 8],
      fps: 24,
      openWeight: false,
    },
    pricing: { unit: 'second', usdPerSecond: 0.1, confidence: 'reported', referenceTier: '720p', freeTier: 'none' },
    tiers: { '720p': 0.1, '1080p': 0.15 },
    bestFor: 'iterating',
    routes: [
      { providerId: 'google', model: 'gemini-omni-flash-preview', price: { usdPerSecond: 0.1 }, note: 'Uses the Interactions API; verify the exact method name in vendor docs.' },
      { providerId: 'runway', model: 'gemini_omni_flash', price: { usdPerSecond: 0.15, confidence: 'reported' }, note: '10 credits/sec on the Runway API.' },
    ],
  },
  {
    id: 'kling-3-0-standard',
    name: 'Kling 3.0 Standard',
    maker: 'Kuaishou',
    status: 'live',
    tagline: 'Best cinematic motion per dollar and the longest usable clips.',
    strengths: ['15s clips', 'Multi-shot consistency', 'Cheapest premium route'],
    weaknesses: ['Prepaid API packages', 'Optional audio costs +50%'],
    capabilities: {
      modes: ['t2v', 'i2v', 'extend'],
      audio: true,
      resolutions: ['720p', '1080p', '4K'],
      aspectRatios: ['16:9', '9:16', '1:1'],
      durations: [5, 10, 15],
      fps: 30,
      openWeight: false,
    },
    pricing: { unit: 'second', usdPerSecond: 0.084, confidence: 'vendor', referenceTier: '720p silent', freeTier: 'app credits' },
    tiers: { '720p': 0.084, '1080p': 0.112, '4K': 0.42, audioSurcharge: 0.042 },
    bestFor: 'cinematic',
    routes: [
      { providerId: 'kling', model: 'kling-v3-0-standard', price: { usdPerSecond: 0.084 }, note: 'JWT from your access+secret key pair; $0.126/s with audio.' },
      { providerId: 'fal', model: 'fal-ai/kling-video/v3/standard/text-to-video', price: { usdPerSecond: 0.084, confidence: 'reported' } },
      { providerId: 'replicate', model: 'kwaivgi/kling-v3.0-std', price: { usdPerSecond: 0.084, confidence: 'reported' } },
      { providerId: 'openrouter', model: 'kwaivgi/kling-v3.0-std', price: { usdPerSecond: 0.084, confidence: 'reported' } },
    ],
  },
  {
    id: 'kling-3-0-pro',
    name: 'Kling 3.0 Pro',
    maker: 'Kuaishou',
    status: 'live',
    tagline: 'Higher fidelity Kling with 4K/60fps output for final masters.',
    strengths: ['4K', 'Detailed textures', 'Audio + dialogue'],
    weaknesses: ['Roughly 2× Standard'],
    capabilities: {
      modes: ['t2v', 'i2v', 'extend'],
      audio: true,
      resolutions: ['1080p', '4K'],
      aspectRatios: ['16:9', '9:16'],
      durations: [5, 10],
      fps: 60,
      openWeight: false,
    },
    pricing: { unit: 'second', usdPerSecond: 0.112, confidence: 'vendor', referenceTier: '1080p silent', freeTier: 'none' },
    tiers: { '1080p': 0.112, '4K': 0.42 },
    bestFor: 'master',
    routes: [
      { providerId: 'kling', model: 'kling-v3-0-pro', price: { usdPerSecond: 0.112 } },
      { providerId: 'replicate', model: 'kwaivgi/kling-v3.0-pro', price: { usdPerSecond: 0.112, confidence: 'reported' } },
      { providerId: 'fal', model: 'fal-ai/kling-video/v3/pro/text-to-video', price: { usdPerSecond: 0.126, confidence: 'reported' } },
    ],
  },
  {
    id: 'seedance-2-0',
    name: 'Seedance 2.0',
    maker: 'ByteDance',
    status: 'live',
    tagline: 'Leaderboard-topping prompt adherence with audio, and multi-reference conditioning.',
    strengths: ['9 images + 3 clips + 3 audio refs', 'Native audio', 'Multi-shot narrative'],
    weaknesses: ['Bills by video token — resolution drives cost', 'Direct access needs BytePlus'],
    capabilities: {
      modes: ['t2v', 'i2v', 'extend', 'edit'],
      audio: true,
      resolutions: ['480p', '720p', '1080p', '2K'],
      aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
      durations: [4, 8, 10, 12, 15],
      fps: 24,
      openWeight: false,
    },
    pricing: { unit: 'token', usdPerSecond: 0.1, confidence: 'reported', referenceTier: '1080p', freeTier: 'trial quota' },
    tiers: { '720p': 0.09, '1080p': 0.247 },
    bestFor: 'ads',
    routes: [
      { providerId: 'byteplus', model: 'seedance-2-0-pro', price: { usdPerSecond: 0.247, confidence: 'reported' }, note: 'Token billing: w·h·fps·sec ÷ 1024.' },
      { providerId: 'cloudflare', model: '@cf/bytedance/seedance-2.0-fast', price: { usdPerSecond: 0.09, confidence: 'reported' }, verify: true, note: 'Fast variant: cheaper, same architecture.' },
      { providerId: 'cloudflare', model: '@cf/bytedance/seedance-2.0-mini', price: { usdPerSecond: 0.08, confidence: 'reported' }, verify: true, note: 'Mini tier for high-volume drafts.' },
      { providerId: 'replicate', model: 'bytedance/seedance-2.0', price: { usdPerSecond: 0.18, confidence: 'reported' } },
      { providerId: 'openrouter', model: 'bytedance/seedance-2.0', price: { usdPerSecond: 0.1, confidence: 'reported' } },
      { providerId: 'fal', model: 'fal-ai/seedance-2/standard/text-to-video', price: { usdPerSecond: 0.1, confidence: 'reported' } },
    ],
  },
  {
    id: 'seedance-1-5-pro',
    name: 'Seedance 1.5 Pro',
    maker: 'ByteDance',
    status: 'live',
    tagline: 'Prior-gen Seedance that is still the price/perf king on open-weight routes.',
    strengths: ['Very cheap', 'First/last frame support', 'Fast queue'],
    weaknesses: ['Weaker audio + prompt adherence than 2.0'],
    capabilities: {
      modes: ['t2v', 'i2v'],
      audio: false,
      resolutions: ['480p', '720p', '1080p'],
      aspectRatios: ['16:9', '9:16', '1:1'],
      durations: [4, 5, 8, 10],
      fps: 24,
      openWeight: true,
    },
    pricing: { unit: 'second', usdPerSecond: 0.026, confidence: 'reported', referenceTier: '720p on Replicate', freeTier: 'signup credit' },
    bestFor: 'bulk',
    routes: [
      { providerId: 'replicate', model: 'bytedance/seedance-1-5-pro', price: { usdPerSecond: 0.026, confidence: 'reported' } },
      { providerId: 'fal', model: 'fal-ai/seedance-1-5-pro/text-to-video', price: { usdPerSecond: 0.03, confidence: 'reported' } },
      { providerId: 'custom', model: 'seedance-1-5-pro', price: { usdPerSecond: 0, confidence: 'vendor' }, note: 'Weights are downloadable; run it on your own GPU.' },
    ],
  },
  {
    id: 'wan-3-0',
    name: 'Wan 3.0',
    maker: 'Alibaba',
    status: 'live',
    tagline: 'Long shots with sound on a budget — and open weights if you self-host.',
    strengths: ['30s clips', 'Audio', 'Apache-2.0 weights (older 2.x)', 'Region-aware pricing'],
    weaknesses: ['Style is less "cinematic" than Veo/Kling', 'Self-host needs big VRAM'],
    capabilities: {
      modes: ['t2v', 'i2v'],
      audio: true,
      resolutions: ['480p', '720p', '1080p'],
      aspectRatios: ['16:9', '9:16', '1:1', '4:5'],
      durations: [2, 5, 8, 10, 15, 30],
      fps: 24,
      openWeight: true,
    },
    pricing: { unit: 'second', usdPerSecond: 0.083, confidence: 'reported', referenceTier: '720p US/EU region', freeTier: 'weights free to self-host' },
    tiers: { '720p': 0.083, '1080p': 0.15 },
    bestFor: 'long-cheap',
    routes: [
      { providerId: 'cloudflare', model: '@cf/alibaba/wan-3.0', price: { usdPerSecond: 0.1, confidence: 'reported' }, verify: true },
      { providerId: 'replicate', model: 'alibaba/wan-3', price: { usdPerSecond: 0.05, confidence: 'reported' }, note: '$0.05/s at 480p, ~$0.10/s at 1080p.' },
      { providerId: 'openrouter', model: 'alibaba/wan-2.7', price: { usdPerSecond: 0.1, confidence: 'reported' }, note: 'Adjacent 2.7 generation on this route.' },
      { providerId: 'fal', model: 'fal-ai/wan/v2.7-2025/text-to-video', price: { usdPerSecond: 0.1, confidence: 'reported' } },
      { providerId: 'custom', model: 'wan-2.2-14b', price: { usdPerSecond: 0, confidence: 'vendor' }, note: 'Apache-2.0 weights: ComfyUI / FastVideo, ~40GB VRAM at FP8.' },
    ],
  },
  {
    id: 'wan-2-2-i2v-fast',
    name: 'Wan 2.2 I2V Fast',
    maker: 'Alibaba',
    status: 'live',
    tagline: 'Flat per-run price: animate a still for pennies regardless of clip length.',
    strengths: ['$0.05 flat per run at 480p', 'Open weights', 'Great for loops/b-roll'],
    weaknesses: ['480p on the cheapest SKU', 'No audio'],
    capabilities: {
      modes: ['i2v'],
      audio: false,
      resolutions: ['480p', '720p'],
      aspectRatios: ['16:9', '9:16', '1:1'],
      durations: [3, 5, 8],
      fps: 24,
      openWeight: true,
    },
    pricing: { unit: 'run', usdPerRun: 0.05, usdPerSecond: 0.0066, confidence: 'reported', referenceTier: '480p / 81 frames', freeTier: 'weights free' },
    bestFor: 'cheapest-i2v',
    routes: [
      { providerId: 'replicate', model: 'wan-video/wan-2.2-i2v-fast', price: { usdPerRun: 0.05, confidence: 'reported' }, note: 'Billed flat per run — the cheapest paid route in this catalogue.' },
      { providerId: 'fal', model: 'fal-ai/wan/v2.2-i2v/fast', price: { usdPerRun: 0.05, confidence: 'reported' } },
      { providerId: 'custom', model: 'wan-2.2-i2v-14b', price: { usdPerSecond: 0, confidence: 'vendor' } },
    ],
  },
  {
    id: 'ltx-2-5',
    name: 'LTX-2.5',
    maker: 'Lightricks',
    status: 'live',
    tagline: 'Fast 4K with audio, open weights, and a low list price — the pragmatic workhorse.',
    strengths: ['20s clips', '4K @ 50fps', 'Open weights', 'Cheap fast tier'],
    weaknesses: ['Community licence beyond $10M ARR', 'Prompt nuance below the flagships'],
    capabilities: {
      modes: ['t2v', 'i2v'],
      audio: true,
      resolutions: ['720p', '1080p', '4K'],
      aspectRatios: ['16:9', '9:16', '1:1'],
      durations: [5, 8, 10, 15, 20],
      fps: 50,
      openWeight: true,
    },
    pricing: { unit: 'second', usdPerSecond: 0.09, confidence: 'vendor', referenceTier: 'Fast 720p', freeTier: 'weights free' },
    tiers: { '720p': 0.09, '1080p': 0.12, '4K': 0.32 },
    bestFor: 'fast-4k',
    routes: [
      { providerId: 'fal', model: 'fal-ai/ltx-video/2-5/fast', price: { usdPerSecond: 0.09, confidence: 'reported' } },
      { providerId: 'replicate', model: 'lightricks/ltx-2-5-fast', price: { usdPerSecond: 0.06, confidence: 'reported' } },
      { providerId: 'custom', model: 'ltx-2-3-distilled', price: { usdPerSecond: 0, confidence: 'vendor' }, note: 'Runs on consumer GPUs; near-realtime on an RTX 4090.' },
    ],
  },
  {
    id: 'hunyuan-video-1-5',
    name: 'HunyuanVideo 1.5',
    maker: 'Tencent',
    status: 'live',
    tagline: 'The best self-hostable open model: 8.3B params, 75s per clip on one RTX 4090.',
    strengths: ['Apache-2.0', 'Low VRAM for its quality', 'No per-second fee'],
    weaknesses: ['You operate the GPU', 'Tencent community licence has regional exclusions'],
    capabilities: {
      modes: ['t2v', 'i2v'],
      audio: false,
      resolutions: ['480p', '720p', '1080p'],
      aspectRatios: ['16:9', '9:16'],
      durations: [3, 5, 8],
      fps: 24,
      openWeight: true,
    },
    pricing: { unit: 'gpu-hour', usdPerSecond: 0.004, confidence: 'reported', referenceTier: 'RTX 4090 rented at $0.40/hr', freeTier: 'weights free' },
    bestFor: 'self-host',
    routes: [
      { providerId: 'custom', model: 'hunyuan-video-1-5', price: { usdPerSecond: 0.004, confidence: 'reported' }, note: 'Your GPU-hour ÷ clips produced; zero marginal API fee.' },
      { providerId: 'replicate', model: 'tencent/hunyuan-video-1-5', price: { usdPerSecond: 0.02, confidence: 'reported' } },
      { providerId: 'fal', model: 'fal-ai/hunyuan-video', price: { usdPerSecond: 0.02, confidence: 'reported' } },
      { providerId: 'huggingface', model: 'hunyuanvideo-community/HunyuanVideo-1.5', price: { usdPerSecond: 0.02, confidence: 'reported' }, verify: true },
    ],
  },
  {
    id: 'hailuo-h3',
    name: 'MiniMax H3 (Hailuo 3.0)',
    maker: 'MiniMax',
    status: 'live',
    tagline: '2K output with native stereo audio and reference-driven direction.',
    strengths: ['2K', 'Stereo audio + dialogue', 'Reference video/audio conditioning'],
    weaknesses: ['Pay-as-you-go only', 'Input video billed at output rates'],
    capabilities: {
      modes: ['t2v', 'i2v', 'edit'],
      audio: true,
      resolutions: ['768p', '1080p', '2K'],
      aspectRatios: ['16:9', '9:16'],
      durations: [5, 6, 10, 15],
      fps: 30,
      openWeight: false,
    },
    pricing: { unit: 'second', usdPerSecond: 0.13, confidence: 'vendor', referenceTier: '2K', freeTier: '5 free reference images' },
    tiers: { '2K': 0.13, '768p': 0.09 },
    bestFor: 'dialogue',
    routes: [
      { providerId: 'minimax', model: 'MiniMax-H3', price: { usdPerSecond: 0.13 }, note: 'V2 endpoint: content[] array with roles; +$0.04 per reference image after 5.' },
      { providerId: 'openrouter', model: 'minimax/hailuo-3', price: { usdPerSecond: 0.13, confidence: 'reported' } },
      { providerId: 'fal', model: 'fal-ai/minimax/hailuo-3/text-to-video', price: { usdPerSecond: 0.13, confidence: 'reported' } },
    ],
  },
  {
    id: 'hailuo-2-3',
    name: 'MiniMax Hailuo 2.3',
    maker: 'MiniMax',
    status: 'live',
    tagline: 'The affordable MiniMax tier: fixed price per clip, strong physics.',
    strengths: ['$0.28 per 768p clip', 'Simple REST flow', 'Camera-move prompt syntax'],
    weaknesses: ['6–10s max', 'No audio on this tier'],
    capabilities: {
      modes: ['t2v', 'i2v'],
      audio: false,
      resolutions: ['768p', '1080p'],
      aspectRatios: ['16:9', '9:16'],
      durations: [6, 10],
      fps: 24,
      openWeight: false,
    },
    pricing: { unit: 'clip', usdPerClip: 0.28, usdPerSecond: 0.047, confidence: 'vendor', referenceTier: '768p 6s', freeTier: 'none' },
    tiers: { '768p-6s': 0.28, '768p-10s': 0.56, '1080p-6s': 0.49 },
    bestFor: 'cheap-physical',
    routes: [
      { providerId: 'minimax', model: 'MiniMax-Hailuo-2.3', price: { usdPerClip: 0.28, usdPerSecond: 0.047 } },
      { providerId: 'minimax', model: 'MiniMax-Hailuo-2.3-Fast', price: { usdPerClip: 0.19, usdPerSecond: 0.032 }, note: 'Fast variant: $0.19 for 768p/6s — i2v only.' },
      { providerId: 'replicate', model: 'minimax/hailuo-2-3', price: { usdPerSecond: 0.05, confidence: 'reported' } },
    ],
  },
  {
    id: 'runway-gen-4-5',
    name: 'Runway Gen-4.5',
    maker: 'Runway',
    status: 'live',
    tagline: 'Reference-heavy control (images, video, audio) with solid physics for product work.',
    strengths: ['Multi-reference conditioning', 'Act-Two style motion transfer', 'Recipes for composite workflows'],
    weaknesses: ['Credit ledger is harder to forecast', 'Per-second cost above Wan/LTX'],
    capabilities: {
      modes: ['t2v', 'i2v', 'edit'],
      audio: false,
      resolutions: ['720p', '1080p', '4K'],
      aspectRatios: ['16:9', '9:16', '1:1', '4:3'],
      durations: [2, 5, 10],
      fps: 24,
      openWeight: false,
    },
    pricing: { unit: 'credit', usdPerSecond: 0.12, confidence: 'reported', referenceTier: '720p on third-party hosts', freeTier: 'trial credits' },
    bestFor: 'control',
    routes: [
      { providerId: 'runway', model: 'gen4.5', price: { usdPerSecond: 0.12, confidence: 'reported' }, note: 'Text/image-to-video 10 credits/sec on some routes; ratio + duration params.' },
      { providerId: 'replicate', model: 'runway/gen-4.5', price: { usdPerSecond: 0.12, confidence: 'reported' } },
      { providerId: 'cloudflare', model: '@cf/runwayml/gen-4.5', price: { usdPerSecond: 0.12, confidence: 'reported' }, verify: true },
    ],
  },
  {
    id: 'luma-ray-3-2',
    name: 'Luma Ray 3.2',
    maker: 'Luma AI',
    status: 'live',
    tagline: 'Film-camera motion quality with loop support; the cinematographer pick.',
    strengths: ['Natural camera moves', 'Looping', 'Video-to-video'],
    weaknesses: ['~$0.09/s', 'No native audio'],
    capabilities: {
      modes: ['t2v', 'i2v', 'edit'],
      audio: false,
      resolutions: ['540p', '720p', '1080p'],
      aspectRatios: ['16:9', '9:16', '1:1'],
      durations: [5, 10],
      fps: 24,
      openWeight: false,
    },
    pricing: { unit: 'second', usdPerSecond: 0.09, confidence: 'reported', referenceTier: '720p 10s clip', freeTier: 'consumer free gens' },
    bestFor: 'camera-feel',
    routes: [
      { providerId: 'luma', model: 'ray-3.2', price: { usdPerSecond: 0.09, confidence: 'reported' } },
      { providerId: 'replicate', model: 'luma/ray-3.2', price: { usdPerSecond: 0.03, confidence: 'reported' }, note: '540p route reported at $0.15 per 5s clip.' },
      { providerId: 'fal', model: 'fal-ai/luma-dream-machine/ray-3-2/text-to-video', price: { usdPerSecond: 0.1, confidence: 'reported' } },
    ],
  },
  {
    id: 'pika-2-5',
    name: 'Pika 2.5',
    maker: 'Pika',
    status: 'live',
    tagline: 'Effects, lip-sync and templates with a free tier that allows commercial use.',
    strengths: ['Free tier permits commercial use', 'Effects library', 'Fast drafts'],
    weaknesses: ['No public pay-as-you-go price list', '480p on free'],
    capabilities: {
      modes: ['t2v', 'i2v'],
      audio: false,
      resolutions: ['480p', '720p', '1080p'],
      aspectRatios: ['16:9', '9:16', '1:1'],
      durations: [4, 5, 8],
      fps: 24,
      openWeight: false,
    },
    pricing: { unit: 'second', usdPerSecond: 0.08, confidence: 'reported', referenceTier: 'via aggregators', freeTier: '80 free credits' },
    bestFor: 'social-effects',
    routes: [
      { providerId: 'pika', model: 'pika-2-5', price: { usdPerSecond: 0.08, confidence: 'reported' } },
      { providerId: 'fal', model: 'fal-ai/pika/v2.5/text-to-video', price: { usdPerSecond: 0.08, confidence: 'reported' } },
    ],
  },
  {
    id: 'vidu-q3-pro',
    name: 'Vidu Q3 Pro',
    maker: 'Vidu',
    status: 'live',
    tagline: 'Start/end frame control and 16s clips with audio — anime-friendly.',
    strengths: ['Up to 16s', 'Start+end frames', 'Audio'],
    weaknesses: ['Less photoreal than flagships'],
    capabilities: {
      modes: ['t2v', 'i2v'],
      audio: true,
      resolutions: ['720p', '1080p'],
      aspectRatios: ['16:9', '9:16', '1:1'],
      durations: [4, 8, 16],
      fps: 24,
      openWeight: false,
    },
    pricing: { unit: 'second', usdPerSecond: 0.07, confidence: 'reported', referenceTier: '720p', freeTier: 'daily app credits' },
    bestFor: 'stylized',
    routes: [
      { providerId: 'cloudflare', model: '@cf/vidu/q3-pro', price: { usdPerSecond: 0.07, confidence: 'reported' }, verify: true },
      { providerId: 'fal', model: 'fal-ai/vidu/q3/pro/text-to-video', price: { usdPerSecond: 0.07, confidence: 'reported' } },
    ],
  },
  {
    id: 'grok-imagine-video',
    name: 'Grok Imagine Video',
    maker: 'xAI',
    status: 'live',
    tagline: 'Text/image-to-video with synced audio and a playful "fun" mode; cheap on edge hosts.',
    strengths: ['Native synced audio', 'Edit + extend', 'Edge-hosted'],
    weaknesses: ['Stylization over realism', 'Limited fine camera control'],
    capabilities: {
      modes: ['t2v', 'i2v', 'edit'],
      audio: true,
      resolutions: ['480p', '720p'],
      aspectRatios: ['16:9', '9:16'],
      durations: [4, 6, 8],
      fps: 24,
      openWeight: false,
    },
    pricing: { unit: 'second', usdPerSecond: 0.02, confidence: 'reported', referenceTier: '480p', freeTier: 'neurons/day' },
    bestFor: 'cheap-social',
    routes: [
      { providerId: 'cloudflare', model: '@cf/xai/grok-imagine-video', price: { usdPerSecond: 0.02, confidence: 'reported' }, verify: true, note: 'Fits the daily free Neuron allowance for short drafts.' },
      { providerId: 'fal', model: 'fal-ai/grok/imagine-video', price: { usdPerSecond: 0.03, confidence: 'reported' } },
    ],
  },
  {
    id: 'p-video',
    name: 'PrunaAI P-Video',
    maker: 'Pruna AI',
    status: 'live',
    tagline: 'The budget speed route: ~$0.01 for a 720p draft, 1s minimum billing.',
    strengths: ['Cheapest paid drafts', '1s minimum', 'Draft tier at $0.04/1080p run'],
    weaknesses: ['Quality tier below flagships', 'Short clips'],
    capabilities: {
      modes: ['t2v', 'i2v'],
      audio: false,
      resolutions: ['720p', '1080p'],
      aspectRatios: ['16:9', '9:16'],
      durations: [1, 2, 4, 6, 8],
      fps: 24,
      openWeight: false,
    },
    pricing: { unit: 'second', usdPerSecond: 0.01, confidence: 'reported', referenceTier: 'draft 720p', freeTier: 'none' },
    bestFor: 'cheapest-draft',
    routes: [
      { providerId: 'replicate', model: 'prunaai/p-video', price: { usdPerSecond: 0.01, confidence: 'reported' }, note: 'draft tier 720p $0.01, base tier 1080p $0.04.' },
    ],
  },
  {
    id: 'cogvideox-1-5',
    name: 'CogVideoX 1.5',
    maker: 'Zhipu / THUDM',
    status: 'live',
    tagline: 'Open weights that run on modest VRAM — good for local dev and CI smoke tests.',
    strengths: ['Open weights', 'Low VRAM', 'Good prompt following for its size'],
    weaknesses: ['5s clips', 'Soft detail vs 2026 flagships'],
    capabilities: {
      modes: ['t2v', 'i2v'],
      audio: false,
      resolutions: ['480p', '720p'],
      aspectRatios: ['16:9', '1:1'],
      durations: [3, 5, 8],
      fps: 16,
      openWeight: true,
    },
    pricing: { unit: 'gpu-hour', usdPerSecond: 0.003, confidence: 'reported', referenceTier: 'self-hosted A100 share', freeTier: 'weights free' },
    bestFor: 'local-dev',
    routes: [
      { providerId: 'custom', model: 'cogvideox-1-5-5b', price: { usdPerSecond: 0.003, confidence: 'reported' } },
      { providerId: 'replicate', model: 'thu/mochi1', price: { usdPerSecond: 0.04, confidence: 'reported' }, note: 'Neighbouring open-weight option on the same route.' },
    ],
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    maker: 'OpenAI',
    status: 'retired',
    retiredOn: '2026-09-24',
    tagline: 'Removed from the platform: /v1/videos and sora-2 were retired on 2026-09-24.',
    strengths: ['Was strong for photoreal + synced audio'],
    weaknesses: ['No longer callable — do not build on it', 'Was paid-tier only'],
    capabilities: {
      modes: ['t2v', 'i2v', 'extend'],
      audio: true,
      resolutions: ['720p'],
      aspectRatios: ['16:9', '9:16'],
      durations: [4, 8, 12],
      fps: 24,
      openWeight: false,
    },
    pricing: { unit: 'second', usdPerSecond: 0.1, confidence: 'vendor', referenceTier: '720p (last list price)', freeTier: 'none' },
    bestFor: 'archived',
    routes: [
      { providerId: 'openai', model: 'sora-2', price: { usdPerSecond: 0.1 }, note: 'Endpoint returns an error since the shutdown; kept for migration reference only.' },
    ],
  },
  {
    id: 'stable-video-diffusion',
    name: 'Stable Video Diffusion',
    maker: 'Stability AI',
    status: 'live',
    tagline: 'Animate a still you already own; image-to-video only.',
    strengths: ['Cheap short animates', 'Deterministic motion-Id control', 'Studio weights available'],
    weaknesses: ['14s ceiling at 25fps in practice', 'No text-to-video'],
    capabilities: {
      modes: ['i2v'],
      audio: false,
      resolutions: ['576p', '720p'],
      aspectRatios: ['16:9', '1:1'],
      durations: [2, 4],
      fps: 25,
      openWeight: true,
    },
    pricing: { unit: 'run', usdPerRun: 0.2, usdPerSecond: 0.05, confidence: 'reported', referenceTier: 'per generation', freeTier: '25 credits' },
    bestFor: 'animate-stills',
    routes: [
      { providerId: 'stability', model: 'stable-video-diffusion-img2vid-xt-1-1', price: { usdPerRun: 0.2, confidence: 'reported' } },
      { providerId: 'replicate', model: 'stability-ai/stable-video-diffusion', price: { usdPerSecond: 0.05, confidence: 'reported' } },
      { providerId: 'custom', model: 'svd-xt', price: { usdPerSecond: 0, confidence: 'vendor' } },
    ],
  },
];

/**
 * Local, always-available render profiles. These stay in the catalogue so the
 * studio works with zero configuration and so a paid generation can always
 * fall back to a free preview.
 */
export const LOCAL_MODELS = [
  {
    id: 'local-motion',
    name: 'Local Motion Pro (canvas)',
    maker: 'AI-Bhideo',
    status: 'live',
    tagline: 'Motion-weighted procedural pass for action, fluid, and vehicle prompts.',
    strengths: ['Free', 'High frame rate', 'Prompt-aware motion'],
    weaknesses: ['Procedural, not neural'],
    capabilities: {
      modes: ['t2v'],
      audio: false,
      resolutions: ['720p', '1080p'],
      aspectRatios: ['16:9', '9:16', '1:1', '4:5'],
      durations: [2, 4, 6, 8, 12],
      fps: 60,
      openWeight: true,
    },
    pricing: { unit: 'second', usdPerSecond: 0, confidence: 'vendor', referenceTier: 'n/a', freeTier: 'unlimited' },
    bestFor: 'action-preview',
    routes: [{ providerId: 'local', model: 'bhideo-motion-pro', price: { usdPerSecond: 0 } }],
  },
  {
    id: 'local-anime',
    name: 'Local Anime-X (canvas)',
    maker: 'AI-Bhideo',
    status: 'live',
    tagline: 'Stylized cel-shaded preview for animation and illustration prompts.',
    strengths: ['Free', 'Stylized palettes', 'Good for animation tests'],
    weaknesses: ['Procedural, not neural'],
    capabilities: {
      modes: ['t2v'],
      audio: false,
      resolutions: ['720p', '1080p'],
      aspectRatios: ['16:9', '9:16', '1:1', '2.39:1'],
      durations: [2, 4, 8, 16],
      fps: 30,
      openWeight: true,
    },
    pricing: { unit: 'second', usdPerSecond: 0, confidence: 'vendor', referenceTier: 'n/a', freeTier: 'unlimited' },
    bestFor: 'stylized-preview',
    routes: [{ providerId: 'local', model: 'bhideo-anime-x', price: { usdPerSecond: 0 } }],
  },
  {
    id: 'local-cinema',
    name: 'Local Cinema (canvas)',
    maker: 'AI-Bhideo',
    status: 'live',
    tagline: 'Prompt-themed procedural render recorded with MediaRecorder. Free, offline, deterministic.',
    strengths: ['No key needed', 'No cost', 'Instant retries'],
    weaknesses: ['Procedural art, not neural footage', 'No audio'],
    capabilities: {
      modes: ['t2v'],
      audio: false,
      resolutions: ['720p', '1080p'],
      aspectRatios: ['16:9', '9:16', '1:1', '2.39:1', '4:5'],
      durations: [2, 4, 6, 8, 12, 16],
      fps: 60,
      openWeight: true,
    },
    pricing: { unit: 'second', usdPerSecond: 0, confidence: 'vendor', referenceTier: 'n/a', freeTier: 'unlimited' },
    bestFor: 'free-preview',
    routes: [{ providerId: 'local', model: 'bhideo-cinema-v3', price: { usdPerSecond: 0 } }],
  },
  {
    id: 'local-turbo',
    name: 'Local Turbo (canvas)',
    maker: 'AI-Bhideo',
    status: 'live',
    tagline: 'Fast, light storyboard pass for shot lists and timing checks.',
    strengths: ['Fastest', 'Cheapest', 'Good for animatics'],
    weaknesses: ['Simple motion', 'Not neural'],
    capabilities: {
      modes: ['t2v'],
      audio: false,
      resolutions: ['480p', '720p'],
      aspectRatios: ['16:9', '9:16', '1:1', '4:5'],
      durations: [2, 4, 6, 8],
      fps: 30,
      openWeight: true,
    },
    pricing: { unit: 'second', usdPerSecond: 0, confidence: 'vendor', referenceTier: 'n/a', freeTier: 'unlimited' },
    bestFor: 'storyboard',
    routes: [{ providerId: 'local', model: 'bhideo-turbo-v2', price: { usdPerSecond: 0 } }],
  },
];

/* ------------------------------------------------------------------ helpers */

export const PROVIDER_BY_ID = VIDEO_PROVIDERS.reduce((acc, p) => {
  acc[p.id] = p;
  return acc;
}, {});

/** Local preview models first, then every paid/API model — what the picker lists. */
export const CATALOGUE_MODELS = [...LOCAL_MODELS, ...VIDEO_MODELS];

/** Every (model, route) pair flattened — what the picker and router iterate over. */
export const ALL_ROUTES = CATALOGUE_MODELS.flatMap((model) =>
  model.routes.map((route, index) => {
    const provider = PROVIDER_BY_ID[route.providerId];
    const price = { ...(provider?.price || {}), ...(model.pricing || {}), ...(route.price || {}) };
    const usdPerSecond = Number(price.usdPerSecond || 0);
    return {
      id: `${model.id}::${route.providerId}${index > 0 ? `#${index}` : ''}`,
      model,
      modelId: model.id,
      provider,
      providerId: route.providerId,
      protocol: provider?.protocol || 'template',
      route,
      usdPerSecond,
      free: usdPerSecond <= 0,
      requiresKey: (provider?.keyKind || 'none') !== 'none',
      retired: model.status === 'retired',
    };
  })
);

export const ROUTE_BY_ID = ALL_ROUTES.reduce((acc, route) => {
  acc[route.id] = route;
  return acc;
}, {});

export const getVideoModel = (id) => VIDEO_MODELS.find((m) => m.id === id) || null;
export const getRoute = (id) => ROUTE_BY_ID[id] || null;
export const getProvider = (id) => PROVIDER_BY_ID[id] || null;

export function modelsForProvider(providerId) {
  return VIDEO_MODELS.filter((model) => model.routes.some((route) => route.providerId === providerId));
}

/**
 * Filter the flattened routes. `criteria` keys:
 *   provider, mode ('t2v'|'i2v'|'extend'|'edit'), needsAudio, needsOpenWeight,
 *   resolution ('720p'|'1080p'|'4K'), minDuration, maxUsdPerSecond,
 *   includeRetired, freeOnly
 */
export function findRoutes(criteria = {}) {
  const {
    provider,
    mode,
    needsAudio,
    needsOpenWeight,
    resolution,
    minDuration,
    maxUsdPerSecond,
    includeRetired = false,
    freeOnly = false,
  } = criteria;

  return ALL_ROUTES.filter((route) => {
    const caps = route.model.capabilities || {};
    if (!includeRetired && route.retired) return false;
    if (provider && route.providerId !== provider) return false;
    if (mode && !(caps.modes || []).includes(mode)) return false;
    if (needsAudio && !caps.audio) return false;
    if (needsOpenWeight && !caps.openWeight) return false;
    if (resolution && !(caps.resolutions || []).includes(resolution)) return false;
    if (minDuration && Math.max(...(caps.durations || [0])) < minDuration) return false;
    if (typeof maxUsdPerSecond === 'number' && route.usdPerSecond > maxUsdPerSecond) return false;
    if (freeOnly && !route.free) return false;
    return true;
  }).sort((a, b) => {
    if (a.usdPerSecond !== b.usdPerSecond) return a.usdPerSecond - b.usdPerSecond;
    // Free local preview beats an equally-priced remote route at tie-break time.
    if (a.providerId === 'local' !== b.providerId === 'local') return a.providerId === 'local' ? -1 : 1;
    return a.model.name.localeCompare(b.model.name);
  });
}

/** The cheapest route that satisfies a model + the criteria. */
export function cheapestRouteFor(modelId, criteria = {}) {
  const matches = findRoutes({ ...criteria }).filter((route) => route.modelId === modelId);
  return matches[0] || null;
}

/** Cheapest route across the whole catalogue for a set of requirements. */
export function cheapestMatchingRoute(criteria = {}) {
  return findRoutes(criteria)[0] || null;
}
