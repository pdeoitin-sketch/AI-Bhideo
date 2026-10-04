# Video providers, models and the gateway

Everything AI-Bhideo knows about generating video, in one place: which vendors
are wired up, what each route costs, how credentials are handled, and how the
same gateway code runs in the dev server, in a Node process, on Vercel and on
Cloudflare Workers.

Prices are **public list rates as of 2026-10-04**. They are data, not constants:
they live in `src/data/videoProviders.js` and the UI always shows the
`priceAsOf` date next to them. Nothing in this repo sells credits or billing —
the vendors bill you directly, on your own key.

* 16 providers · 27 models (4 of them the free local renderer) · 74 routes.
* Every route has a working adapter: `src/services/video/protocols/`.
* The studio never requires a key: the local renderer is always selectable.

## What "supported" means here

| Level | Meaning |
| --- | --- |
| **Wired** | The adapter builds a real request, submits it, polls it and hands back a playable URL. Covered by `test/videoAdapters.test.js`. |
| **Verified shape** | The request/response shape was read from vendor docs. |
| **Verify** | Vendor docs for that exact REST surface are thin (or the model slug churns), so the adapter is written to a documented pattern and flagged in code. The gateway surfaces `verifySlugs` in `GET /models` so the studio can label it. |

Nothing is advertised as working if it has no adapter. Retired models (Sora 2,
whose `/v1/videos` endpoint was removed on 2026-09-24) stay in the catalogue
with `status: 'retired'`, are hidden by default, and refuse `POST /generate`
with a pointer to the cheapest live route that does the same job.

## Providers

| Provider | Protocol | Key env var | Free tier | Base rate | Browser-direct? |
| --- | --- | --- | --- | --- | --- |
| AI-Bhideo Local Renderer | `local` | — | Unlimited | $0.0000/second | yes |
| Cloudflare Workers AI | `cloudflare` | `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | 10,000 Neurons/day | $0.0200/neuron | no (gateway) |
| fal.ai | `fal` | `FAL_KEY` | Signup credit (~$10–20) | $0.0500/second | no (gateway) |
| Replicate | `replicate` | `REPLICATE_API_TOKEN` | Limited free runs | $0.0700/second | no (gateway) |
| OpenRouter Video | `openrouter` | `OPENROUTER_API_KEY` | None for video | $0.0300/second | no (gateway) |
| Google Gemini API (Veo) | `google-lro` | `GEMINI_API_KEY` | None for Veo | $0.40/second | no (gateway) |
| MiniMax (Hailuo) | `minimax` | `MINIMAX_API_KEY` | Occasional promo credits | $0.0500/second | no (gateway) |
| Kling AI (Kuaishou) | `kling` | `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` | 66 credits/day (app) | $0.0840/second | no (gateway) |
| Runway Dev | `runway` | `RUNWAYML_API_SECRET` | Trial credits | $0.12/credit | no (gateway) |
| Luma (Ray) | `template` | `LUMA_API_KEY` | Limited free generations | $0.0900/second | no (gateway) |
| Pika | `template` | `PIKA_API_KEY` | Free credits, commercial use allowed | $0.0800/second | no (gateway) |
| Stability AI | `stability` | `STABILITY_API_KEY` | 25 free credits | $0.0200/second | no (gateway) |
| BytePlus ModelArk (Seedance) | `template` | `BYTEPLUS_ARK_API_KEY` | Free trial tokens | $0.0900/second | no (gateway) |
| OpenAI (Sora) | `openai-videos` | `OPENAI_API_KEY` | None for video | $0.10/second | no (gateway) |
| Hugging Face Inference | `template` | `HF_TOKEN` | Small monthly free credit | $0.0100/second | yes |
| Self-host / ComfyUI (any REST) | `template` | `BHIDEO_CUSTOM_VIDEO_URL` | Free software | $0.0000/second | no (gateway) |

Every provider is env-key driven *and* BYOK driven. `corsSafeInBrowser: yes`
means the studio may call the vendor directly when it cannot reach a gateway;
everything else must be relayed.

## Models and cheapest route

`Cheapest route` is computed, not curated — it is simply the lowest
`usdPerSecond` among that model's routes. `custom` routes show `$0.0000/s`
because you pay for your own GPU, not per second.

| Model | Maker | Status | Durations | List price | Routes | Cheapest route |
| --- | --- | --- | --- | --- | --- | --- |
| Local Motion Pro (canvas) | AI-Bhideo | live | 2/4/6/8/12s | $0.0000/s | 1 (local) | `local-motion::local` $0.0000/s |
| Local Anime-X (canvas) | AI-Bhideo | live | 2/4/8/16s | $0.0000/s | 1 (local) | `local-anime::local` $0.0000/s |
| Local Cinema (canvas) | AI-Bhideo | live | 2/4/6/8/12/16s | $0.0000/s | 1 (local) | `local-cinema::local` $0.0000/s |
| Local Turbo (canvas) | AI-Bhideo | live | 2/4/6/8s | $0.0000/s | 1 (local) | `local-turbo::local` $0.0000/s |
| Veo 3.1 Lite | Google DeepMind | live | 4/6/8s | $0.0500/s | 4 (google, openrouter, fal, replicate) | `veo-3-1-lite::replicate#3` $0.0300/s |
| Veo 3.1 Fast | Google DeepMind | live | 4/6/8s | $0.10/s | 4 (google, fal, replicate, openrouter) | `veo-3-1-fast::google` $0.10/s |
| Veo 3.1 Standard | Google DeepMind | live | 4/6/8s | $0.40/s | 4 (google, fal, replicate, cloudflare) | `veo-3-1-standard::fal#1` $0.35/s |
| Gemini Omni Flash (video) | Google DeepMind | live | 4/6/8s | $0.10/s | 2 (google, runway) | `gemini-omni-flash::google` $0.10/s |
| Kling 3.0 Standard | Kuaishou | live | 5/10/15s | $0.0840/s | 4 (kling, fal, replicate, openrouter) | `kling-3-0-standard::kling` $0.0840/s |
| Kling 3.0 Pro | Kuaishou | live | 5/10s | $0.11/s | 3 (kling, replicate, fal) | `kling-3-0-pro::kling` $0.11/s |
| Seedance 2.0 | ByteDance | live | 4/8/10/12/15s | $0.10/s | 6 (byteplus, cloudflare, cloudflare, replicate, openrouter, fal) | `seedance-2-0::cloudflare#2` $0.0800/s |
| Seedance 1.5 Pro | ByteDance | live | 4/5/8/10s | $0.0260/s | 3 (replicate, fal, custom) | `seedance-1-5-pro::custom#2` $0.0000/s |
| Wan 3.0 | Alibaba | live | 2/5/8/10/15/30s | $0.0830/s | 5 (cloudflare, replicate, openrouter, fal, custom) | `wan-3-0::custom#4` $0.0000/s |
| Wan 2.2 I2V Fast | Alibaba | live | 3/5/8s | $0.0500 / run | 3 (replicate, fal, custom) | `wan-2-2-i2v-fast::custom#2` $0.0000/s |
| LTX-2.5 | Lightricks | live | 5/8/10/15/20s | $0.0900/s | 3 (fal, replicate, custom) | `ltx-2-5::custom#2` $0.0000/s |
| HunyuanVideo 1.5 | Tencent | live | 3/5/8s | $0.0040/s | 4 (custom, replicate, fal, huggingface) | `hunyuan-video-1-5::custom` $0.0040/s |
| MiniMax H3 (Hailuo 3.0) | MiniMax | live | 5/6/10/15s | $0.13/s | 3 (minimax, openrouter, fal) | `hailuo-h3::minimax` $0.13/s |
| MiniMax Hailuo 2.3 | MiniMax | live | 6/10s | $0.28 / clip | 3 (minimax, minimax, replicate) | `hailuo-2-3::minimax#1` $0.0320/s |
| Runway Gen-4.5 | Runway | live | 2/5/10s | $0.12/s | 3 (runway, replicate, cloudflare) | `runway-gen-4-5::runway` $0.12/s |
| Luma Ray 3.2 | Luma AI | live | 5/10s | $0.0900/s | 3 (luma, replicate, fal) | `luma-ray-3-2::replicate#1` $0.0300/s |
| Pika 2.5 | Pika | live | 4/5/8s | $0.0800/s | 2 (pika, fal) | `pika-2-5::pika` $0.0800/s |
| Vidu Q3 Pro | Vidu | live | 4/8/16s | $0.0700/s | 2 (cloudflare, fal) | `vidu-q3-pro::cloudflare` $0.0700/s |
| Grok Imagine Video | xAI | live | 4/6/8s | $0.0200/s | 2 (cloudflare, fal) | `grok-imagine-video::cloudflare` $0.0200/s |
| PrunaAI P-Video | Pruna AI | live | 1/2/4/6/8s | $0.0100/s | 1 (replicate) | `p-video::replicate` $0.0100/s |
| CogVideoX 1.5 | Zhipu / THUDM | live | 3/5/8s | $0.0030/s | 2 (custom, replicate) | `cogvideox-1-5::custom` $0.0030/s |
| Sora 2 | OpenAI | retired | 4/8/12s | $0.10/s | 1 (openai) | `sora-2::openai` $0.10/s |
| Stable Video Diffusion | Stability AI | live | 2/4s | $0.20 / run | 3 (stability, replicate, custom) | `stable-video-diffusion::custom#2` $0.0000/s |

## The gateway HTTP API

One handler (`src/services/video/gateway/handler.js`) serves everything, mounted
under a base path — `/api/video` by default. It is fetch-based, so the same
module is used by `vite.config.js`, `server/video-gateway.mjs`,
`api/video/[...path].js` (Vercel) and `worker/index.js` (Cloudflare).

| Method & path | Purpose |
| --- | --- |
| `GET  /health` | Service name, `priceAsOf`, which providers have keys, budget state. Never returns a key value. |
| `GET  /models` | The catalogue. Query: `provider`, `mode` (`t2v`/`i2v`/`extend`), `free=1`, `includeRetired=1`, `maxUsdPerSecond`, `durationSeconds`. Returns `routes[]` plus `rankedByCostForClip[]`. |
| `POST /estimate` | `{routeId, params, budget}` → cost, credits, warnings, normalised params. No provider call. |
| `GET  /describe?routeId=` | The real endpoint, method, headers, JSON body and a copy-paste `curl` for a route, with the key replaced by its env-var name. |
| `POST /generate` | `{routeId, params, byok?, budget?}` → `202 {handle, status:'queued', pollPath, estimatedUsd, credits, keySource, warnings, cost}` or `200` when the vendor answered inline. |
| `GET  /jobs/{handle}` | Poll. `200 {status:'queued'\|'running'\|'completed'\|'failed', videoUrl?, posterUrl?, ...}`. |
| `GET  /download?url=` | Stream a vendor CDN asset through the gateway for hosts that need auth or have no CORS. Allowlisted hosts only. |

### Status codes worth handling

| Code | `kind` | Meaning |
| --- | --- | --- |
| `400` | `local-route` | The route runs in the browser; the gateway cannot render it. |
| `400` | `bad-request` / `handle` | Body was not JSON, or a job handle was malformed. |
| `412` | `missing-key` | Provider not configured. `missing: ["FAL_KEY", …]` names exactly what to set, in env or in the BYOK panel. |
| `422` | `validation` | Bad params for that model, or a retired route. Body carries `errors[]`, `warnings[]` and the `cost` anyway so the UI can explain rather than fail silently. |
| `402` | `budget` | Over the per-clip cap or the monthly ceiling. |
| `403` | `proxy-denied` | `/download` host is not on the allowlist. |
| `502`/`504` | `provider`/`timeout` | Upstream rejected the job, or it did not finish in time. |

### Job handles

A handle is base64 JSON of `{routeId, providerId, jobId, statusUrl, resultUrl,
params, estimatedUsd, …}` — **no credentials**. That is what lets a
scale-to-zero function answer the next poll without a database: the state is in
the URL the client already holds. When a vendor returns a URL that needs an auth
header, the gateway hands back `__gateway_download__<url>` and the client
streams it through `/download` instead.

## Cost rules

`src/services/video/costEngine.js` is the single source of truth for what a clip
costs, and the gateway enforces it server-side too (a handcrafted `curl` cannot
spend past the cap):

1. **Duration snaps to the model's ladder** (`capabilities.durations`), and a
   request longer than `maxDurationSeconds` is billed as
   `ceil(requested / max)` runs, because that many calls are required.
2. **Per-second pricing** resolves `pricing.tiers || model.tiers[tier]` by
   resolution, plus `audioSurcharge` when audio is on.
3. **`unit: 'run' | 'clip'` is flat** and deliberately does *not* scale with
   duration.
4. `takes` (alternate outputs) multiply the total.
5. A free route is **0 credits**, so a local preview never touches the ledger.
6. `CREDIT_TO_USD = 0.05` converts for display only; the demo credit balance in
   the app is not a payment system.
7. `formatUsd()` prints 4 decimals under `$0.10`, because `$0.03` vs `$0.026`
   matters at these prices.

`rankRoutesByCost()` is what makes "cheapest first" provable: `test/videoCostEngine.test.js`
asserts the ranking is monotonic, so a pricing edit cannot silently invert it.

## Credentials

Two modes, both supported everywhere:

* **Environment** — one variable per provider (`FAL_KEY`, `REPLICATE_API_TOKEN`,
  `GEMINI_API_KEY`, … full list in the table above); `npm run gateway`
  reads `.env` (git-ignored, `.env.example` documents every name). Keys live on
  the server and are never serialized by any endpoint.
* **BYOK** — the studio's provider panel keeps the vendor key in this browser
  (`ai-bhideo:provider-access:*`) and sends it per request as
  `{byok: {key}}`. The gateway uses it for that request and does not store it;
  the response only says `keySource: "byok"`.

Env wins when both exist (`resolveAuth`), because a deployed gateway should not
be overridable by whoever loads the page.

Cloudflare's `CLOUDFLARE_ACCOUNT_ID` is not a secret but is required; Higgsfield
needs a `keyid.secret` pair; Kling needs an access+secret pair that is exchanged
for a short-lived HS256 JWT per request (`src/services/video/auth/jwt.js`,
Web Crypto only — no `jsonwebtoken`).

### Guardrails

* `BHIDEO_MAX_CLIP_USD` — refuse a clip above this estimate.
* `BHIDEO_MONTHLY_BUDGET_USD` — refuse past this much upstream spend this month.
  `createSpendLedger()` is **in-memory**; swap it for Workers KV / Redis / Postgres
  before putting real money behind it. Until then it is a per-instance brake, and
  `GET /health` says so.
* `/download` only proxies hosts in `isAllowedProxyHost()`, HTTPS only, so the
  gateway can never be turned into an open file proxy.
* The studio tracks its own running total in `bhideo_remote_spend_usd` and shows
  it in the cost bar.

## Running it

```bash
cp .env.example .env       # optional: only the keys you intend to use
npm run dev                # gateway is mounted at /api/video by the Vite plugin
npm run gateway            # standalone on :8787 (--port, --base flags)
npm run gateway:watch      # node --watch
```

**Vercel**: `api/video/[...path].js` is the whole deployment — add the provider
env vars in Project Settings. Because the studio defaults to a *relative*
`/api/video`, a same-origin Pages + API deploy needs no client configuration.

**Cloudflare**: `npx wrangler deploy` with `wrangler.toml`; secrets via
`npx wrangler secret put FAL_KEY`. `workerd` provides `fetch` and Web Crypto, so
Kling's JWT signing works without a Node polyfill.

Point the app at another gateway with `VITE_BHIDEO_GATEWAY_URL` (build-time) or
the gateway field in the provider panel (per-browser override).
`probeGateway()` caches the check for 15s and reports `no-gateway` distinctly
from an auth failure, so the studio can say "the gateway is not reachable"
rather than "your key is wrong".

## Adding a model or provider

1. Add the provider (or skip it) and the model entry to
   `src/data/videoProviders.js`: capabilities (modes, durations, resolutions,
   aspect ratios, audio, open weight), `pricing`, `status`, `docsUrl`, and one
   `routes[]` entry per vendor that serves it — each with the protocol's model
   slug and, if it differs from the provider default, its own `price`.
2. If it needs a new protocol, add it under `src/services/video/protocols/` and
   register it in `PROTOCOLS`.
3. Add the env var name to `.env.example` (a test asserts every provider var is
   documented and ships empty) and the CDN host to `isAllowedProxyHost()` if
   downloads must be proxied.
4. `npm test` — the registry tests assert uniqueness, that every route's
   protocol exists, and that every model has ≥1 route.

## Tests

| File | Covers |
| --- | --- |
| `test/videoProviders.test.js` | Catalogue integrity: unique ids, protocol existence, price sanity, local routes free, retired handling. |
| `test/videoCostEngine.test.js` | Duration snapping, tier/audio math, flat-run billing, credits, ranking monotonicity, budget guard messages. |
| `test/videoAdapters.test.js` | Each protocol's submit/poll/result against a stubbed transport — headers, body shape, task ids, ratio/pixel conversion. |
| `test/videoGateway.test.js` | The HTTP contract end to end: health, catalogue filters, validation, missing-key, BYOK vs env, submit → poll → completed, handle opacity, download allowlist, CORS. |
| `test/videoRuntimes.test.js` | The per-platform mounts: Cloudflare Worker, Vite plugin, Node bridge, the standalone server on a real socket, `.env` parsing. |
| `test/videoRecorder.test.js` | Local canvas renderer plumbing (dimensions, recording, download). |

## Known gaps

* **Kling, Luma, Stability i2v, BytePlus**: their REST docs are not published as
  fetchable pages, so those adapters follow the documented pattern of the family
  and are flagged `verify` in code. Re-check against the vendor console before
  trusting a production key.
* Cloudflare Workers AI model slugs move; `verifySlugs` is set on that provider
  and `/models` propagates it.
* A long generation outlives a 60s function timeout on Vercel's default. The
  gateway is designed for poll-after-timeout (stateless handles), but a
  `maxDuration` bump or a cron-driven re-poll is the right production answer.
* Nothing here does uploads: an image for i2v must be a public URL or a data URL
  the vendor accepts inline.
