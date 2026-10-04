# 🎬 AI-Bhideo — Chat-first creative workspace and browser video studio

[![Version](https://img.shields.io/badge/version-2.5%20DiT-a32340.svg)](https://github.com/pdeoitin-sketch/AI-Bhideo)
[![License](https://img.shields.io/badge/license-MIT-294f72.svg)](https://github.com/pdeoitin-sketch/AI-Bhideo)
[![React](https://img.shields.io/badge/React-18.3-c25571.svg)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-527493.svg)](https://tailwindcss.com)

**AI-Bhideo** is a browser-based video studio with two generation paths:

1. **Local (default, free, no key)** — animated, prompt-themed scenes are drawn on a canvas and recorded by the browser into a playable WebM/MP4 clip.
2. **Real video models (optional)** — a catalogue of 23 hosted models (Veo, Kling, Seedance, Hailuo, Runway, Luma, Pika, Wan, Hunyuan, SVD, …) reached through 16 providers via one gateway, priced per second and sorted cheapest-first.

Path 2 is not a hosted service run by this project: every call goes to the vendor **on your own key** — either a server environment variable or a bring-your-own-key entry held only in your browser. With no key configured the app is still fully usable through path 1. See [docs/VIDEO_PROVIDERS.md](docs/VIDEO_PROVIDERS.md).
**AI-Bhideo** is a chat-first creative workspace for developing video ideas. The interface pairs a Gemini-inspired conversation layout with a browser-based video studio, prompt presets, a personal library, render profiles, and community exploration. The current static build renders animated, prompt-themed scenes locally on a canvas and exports playable WebM/MP4 clips; it does not connect to a hosted language or video inference service. A provider backend is required for live AI responses and genuine AI-generated footage.

---

## ✨ Features & Architecture Highlights

### Chat-first creative workspace
- **Gemini-inspired interaction pattern**: bright white canvas, crimson-and-blue identity, collapsible navigation rail, model profile picker, and a centered conversation composer—branded for AI-Bhideo rather than copying Gemini assets.
- **Persistent conversations**: start new chats, search recent threads, return to previous conversations, and keep messages in browser storage.
- **Useful starter ideas**: select a cinematic, product, or imaginative-world prompt, or shuffle in a prompt from the existing inspiration library.
- **Working composer controls**: ask locally, route a prompt into Video Studio, attach local files, use browser speech recognition when available, and set aspect ratio, duration, and frame rate.
- **Honest local-mode disclosure**: the chat shell is ready for a language-model integration, but this static build does not send messages or attachments to an AI service. The built-in assistant provides local guidance only.
- **Responsive and accessible**: collapsible desktop navigation, mobile drawer, keyboard send/new-chat shortcuts, visible focus states, reduced-motion support, readable medium-sized type, and high-contrast white, crimson, and blue colors.

### 1. 🚀 Neural Video Studio
- **Prompt Synthesis Bar**: Expandable prompt input with real-time character and token counters.
- **✨ Magic Enhance**: Automatically elevates simple prompts with 35mm Panavision lens, volumetric lighting, and DaVinci color grading keywords.
- **AI Director Co-Pilot**: An interactive assistant that transforms loose concepts into 3 multi-style director scripts with camera angles and lighting profiles.
- **Negative Prompt Filtering**: Filter out artifacts, limb morphing, flickers, and watermarks.
- **Style Presets**: 35mm Cinema, Cyberpunk Neon, 8K Drone Aerial, Makoto Shinkai Anime & Ghibli, Deep Space Sci-Fi, Vintage 70s Kodachrome, Claymation Stop-Motion.
- **Camera Director Controls**: Direct camera paths including Static Tripod, Pan Left/Right, Tilt Up, Orbit 360°, Dolly Zoom In, and FPV Drone Dives.
- **Aspect Ratio Selector**: 16:9 Landscape, 9:16 Vertical (Shorts/Reels/TikTok), 1:1 Square, 2.39:1 Anamorphic Cinema, 4:5 Social.
- **Video Render Progress**: Live progress and ETA while the browser records the animated canvas preview to a real WebM/MP4 file.

### 2. 🧠 AI Video Models (real providers, priced)
- **Model & API catalog** (`VideoModelCatalog`): every model, every vendor route that serves it, one click to switch. Filter by free-only, text/image-to-video, audio, and a max-$-per-second slider; a **Cheapest match** button picks the lowest-cost route for your filters.
- **Local profiles** — `Bhideo Cinema v3`, `Turbo v2.1`, `Motion Pro`, `Anime-X` are canvas render profiles (⚡ 4 / 1 / 3 / 2 credits) with prompt-themed lighting and camera styling. They cost nothing upstream: the clip is browser-rendered (up to 1280px on its long edge), **not** native 4K AI footage.
- **Hosted models** — `Veo 3.1` (lite/fast/standard), `Kling 3.0` (std/pro/4K), `Seedance 2.0 / 1.5 Pro`, `Hailuo 2.3 / H3`, `Runway Gen-4.5`, `Luma Ray 3.2`, `Pika 2.5`, `Wan 3.0 / 2.2`, `HunyuanVideo 1.5`, `LTX-2.5`, `Grok Imagine Video`, `Vidu Q3`, `CogVideoX`, `PrunaAI P-Video`, `Stable Video Diffusion`, `Gemini Omni Flash`, plus any self-hosted ComfyUI/OpenAI-shaped endpoint.
- **Same model, many providers**: a model is priced per route, so `Veo 3.1 Lite` can run via Google, fal, Replicate or OpenRouter and the catalog shows which is cheapest for *your* clip length right now (e.g. $0.03–0.08/s).
- **Cost bar before you spend**: estimated USD, credits, provider, per-take and multi-run notes, the `priceAsOf` date, plus the monthly spend counter and your per-clip cap. Prices are public list rates gathered from vendor docs and stored in `src/data/videoProviders.js` — edit the data, the UI follows.
- **Retired is not broken**: `Sora 2` stays listed with its retirement date, refuses to be called, and suggests the closest live route instead.

### 3. 🌐 Community Showcase & Gallery
- Filter by themes: Photorealistic Cinema, Sci-Fi & Cyberpunk, Fantasy & Nature, Anime & VFX, Drone & Aerial, Commercial & Ads, and My Generations.
- Interactive video cards with live procedural animated playback on hover.
- Real-time like counter, prompt copying, remixing into the studio, and browser-recorded video export (WebM or MP4 where supported).
- Fullscreen Lightbox Inspector with playback scrubber, frame-by-frame navigation, and hyperparameters (Seed, CFG Scale, Motion Score, Camera Trajectory).

### 4. 👤 Comprehensive User Profile & Dashboard
- **Profile Header**: Avatar, cover banner, bio editing, tier badges, and live stats (Videos Created, Render Hours Saved, Community Likes, Cloud Storage).
- **🎬 My Creations**: Generated video library with batch actions, lightbox viewing, prompt remixes, and deletion.
- **⚡ Subscription & Credits**: Credit usage gauge, instant recharge packs (+500, +2,000), and plan manager.
- **🔑 Developer API Keys & SDK**: a *demo* key list (`bh_live_…` — nothing validates these, and no AI-Bhideo API accepts them) next to the real request shape for whichever route is selected in the studio: the exact vendor endpoint, headers and JSON body as a copy-paste `curl`, generated by the same adapter the gateway uses. Real credentials are entered once per provider in the studio's provider panel.
- **🔑 Developer API Keys & SDK**: Local demo key management (`bh_live_...`), copy and immediate revocation without a reload, cancelable key creation, and code snippets in Python and cURL. These demo keys do not authenticate with a live API.
- **⚙️ Studio Preferences**: Default synthesis model, default resolution (1080p / 4K), auto-enhance toggle, and NSFW safety filter level.

### 5. 🔐 Authentication System
- Sign In, Sign Up, and Forgot Password modal with responsive form validation and Google/GitHub preview actions.
- Authentication is simulated locally in this static demo; no password is sent to or stored by a server.

### 6. 💳 Recharge & Subscription Modal
- Demo credit packs: **+500**, **+2,000**, and **+6,000** credits; selections update local state and do not charge a payment method.
- Live credit gauge showing `balance / allowance`.
- Switch between every studio plan from one place; credits from the new plan are granted immediately.
- Opens automatically when a generation is attempted without enough credits, so the flow never dead-ends.

### 7. 💳 Compute Pricing Plans
- **Free Explorer** ($0/mo - 50 demo credits)
- **Creator Pro** ($19/mo or $15/mo billed annually - 1,000 demo credits)
- **Studio Pro** ($49/mo or $39/mo billed annually - 3,500 demo credits)
- **Enterprise Cluster** ($149/mo or $119/mo billed annually - 10,000 demo credits)

These are illustrative plan prices for the static demo; checkout is simulated and does not provision GPU compute or hosted model access.

---

## 🛡️ Reliability & Error Handling

The studio is defensive by design so that a single failure can never leave a blank page:

- **`ErrorBoundary`** wraps the app shell, the routed views, the modal layer and the footer. Any render error shows a readable "Something went wrong" panel with *Try again* / *Reload app* actions and collapsible technical details, instead of unmounting the React root.
- **Safe storage layer** (`src/utils/safeStorage.js`): every `localStorage` read/write is guarded, and persisted state is normalised on load. Corrupted JSON, blocked storage (private mode / sandboxed iframe) and user objects saved by older versions can no longer throw during the first render.
- **Clipboard fallback**: `navigator.clipboard` is unavailable on insecure origins and in some embedded contexts, so copying a prompt/API key falls back to a hidden-textarea copy instead of throwing inside the click handler.
- **Video export**: the studio records the animated canvas through `MediaRecorder`, downloads the resulting file instead of a PNG renamed to `.webm`, and charges credits only after a non-empty clip is created.
- **Canvas engine fixes**: `ProceduralVideoEngine` no longer auto-starts a `requestAnimationFrame` loop on construction — idle showcase cards render one static poster frame and only animate while hovered (previously every card on screen ran a 60 FPS loop forever). `play()` cannot stack duplicate loops and `destroy()` hard-stops rendering.
- **Missing Tailwind utilities added**: `animate-fade-in`, `animate-bounce-in`, `scrollbar-none` and the `h-18` navbar height are now actually defined, plus a `prefers-reduced-motion` fallback.
- **Relative base path** (`base: './'`): the production build also works when served from a sub-path (static hosts, GitHub Pages, previews).
- **Zero-config GitHub Pages & static root deployment (`bundle/app.js` + `bundle/app.css`)**: `index.html` and `404.html` ship with a bright white-theme first-paint fallback and reference pre-compiled `./bundle/app.css` and `./bundle/app.js` (plus `.nojekyll`). When GitHub Pages deploys directly from the repository root (`main` / `/`), the full application loads immediately instead of failing on uncompiled `/src/main.jsx` with a blank white screen. During `npm run dev` and `npm run build`, the Vite plugin in `vite.config.js` transparently switches to `/src/main.jsx` and refreshes `bundle/` on every build. `.github/workflows/ci-pages.yml` fails CI when `bundle/` drifts from `src/` and explicitly requests the Pages build on every push to `main`, so neither a stale bundle nor a skipped Pages build can silently ship a blank page (see **Deployment — GitHub Pages** below).

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite 6
- **Styling**: Tailwind CSS 3.4 with bright white surfaces, readable medium-sized typography, and a consistent crimson-and-blue palette across chat, studio, Explore, Models, library, plans, and credits
- **Icons**: Lucide React
- **Video Engine**: Prompt-themed Canvas renderer, browser `MediaRecorder` export, and IndexedDB storage for generated clip files
- **State**: React Context API with LocalStorage metadata and IndexedDB video blobs
- **Video gateway**: one fetch-based handler (`src/services/video/gateway/`) mounted by the Vite dev server, a standalone Node server, a Vercel function and a Cloudflare Worker — per-provider protocol adapters, cost/budget guards, stateless job handles, allowlisted media proxy
- **Tests**: `node --test` over the catalogue, cost engine, every protocol adapter, the gateway HTTP contract and all four runtime mounts (71 tests, no test framework dependency)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/pdeoitin-sketch/AI-Bhideo.git
cd AI-Bhideo

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Generating with real video models (optional)

```bash
cp .env.example .env    # add only the provider keys you intend to pay for
npm run dev             # gateway is already mounted at /api/video
# or run it separately:
npm run gateway         # http://localhost:8787/api/video/health
```

Then open **Studio → Providers** and either leave it on the gateway, or paste a
key for one vendor (BYOK) and let the browser call that provider directly where
CORS allows it. `GET /api/video/models?free=1&maxUsdPerSecond=0.05` is the fastest
way to see what is cheap right now.

```bash
# Deploy the gateway
npx vercel deploy                       # api/video/[...path].js is the whole API
npx wrangler deploy                     # worker/index.js + wrangler.toml
npx wrangler secret put FAL_KEY         # one secret per provider you enable
```

Guardrails are enforced in the gateway, not only the UI: `BHIDEO_MAX_CLIP_USD`
rejects an expensive clip before any vendor is called, `BHIDEO_MONTHLY_BUDGET_USD`
caps monthly upstream spend, `/download` proxies only allowlisted vendor CDNs over
HTTPS, and no endpoint ever echoes a key. Full reference:
[docs/VIDEO_PROVIDERS.md](docs/VIDEO_PROVIDERS.md).

### Production Build

```bash
npm run build
npm run preview
```

---

## 🌍 Deployment — GitHub Pages

Live site: <https://pdeoitin-sketch.github.io/AI-Bhideo/>

Pages is configured as **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/ (root)`**.
That makes the *committed repository root* the website, so two rules apply:

1. **`bundle/` is the deployed app.** `index.html` and `404.html` load
   `./bundle/app.css` + `./bundle/app.js`, which are the compiled output of
   `src/`. After editing anything under `src/`, run `npm run build` and commit
   `bundle/app.js`, `bundle/app.css` and `404.html` in the same commit. Forgetting
   this ships the old app (or, if `bundle/` is absent, a blank white page because
   a static host cannot run `/src/main.jsx`).
2. **Pages has to build after the push.** GitHub does not always run the Pages
   build for a merge — the merge of PR #3 left the site serving the previous
   commit, which is exactly what a "white screen after merging" looks like.
   `.github/workflows/ci-pages.yml` therefore does two jobs:

   | Job | Runs on | Purpose |
   | --- | --- | --- |
   | `verify-bundle` | every push & PR | `npm ci && npm run build`, then fails if `bundle/` or `404.html` differ from `src/` |
   | `trigger-pages-build` | push to `main`, `workflow_dispatch` | `POST /repos/{owner}/{repo}/pages/builds` with `pages: write`, so the rebuild never depends on the implicit trigger |

**If the site looks wrong after a merge**, in this order:

```bash
# 1. Which commit is actually deployed?
gh api repos/pdeoitin-sketch/AI-Bhideo/pages/builds/latest --jq '.commit, .created_at'

# 2. Is it the tip of main?
gh api repos/pdeoitin-sketch/AI-Bhideo/commits/main --jq '.sha'

# 3. If not, force a rebuild (needs pages: write) or open Actions → "CI & GitHub Pages deploy" → Run workflow
gh api -X POST repos/pdeoitin-sketch/AI-Bhideo/pages/builds
```

Then hard-refresh (Ctrl/Cmd + Shift + R): Pages caches the old `index.html`
briefly, and a cached 404 for `bundle/app.js` can outlive the fix by a minute.

A missing or stale bundle is no longer silent either — `index.html` watches the
`bundle/app.js` request and prints "Could not load bundle/app.js" with the fix
instead of leaving the visitor on an unexplained splash screen.

---

## 📄 License

MIT License © 2026 AI-Bhideo Synthesis Lab.
