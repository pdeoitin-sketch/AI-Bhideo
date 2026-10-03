# 🎬 AI-Bhideo — Next-Gen Neural Text-to-Video AI Platform

[![Version](https://img.shields.io/badge/version-2.5%20DiT-8b5cf6.svg)](https://github.com/pdeoitin-sketch/AI-Bhideo)
[![License](https://img.shields.io/badge/license-MIT-06b6d4.svg)](https://github.com/pdeoitin-sketch/AI-Bhideo)
[![React](https://img.shields.io/badge/React-18.3-ec4899.svg)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com)

**AI-Bhideo** is a cutting-edge multimodal AI video synthesis platform powered by a 12-Billion parameter 3D Spatio-Temporal Diffusion Transformer (DiT). It transforms plain text prompts into photorealistic, 4K 60FPS cinematic videos with temporal physics, directed camera motions, and zero motion smearing.

---

## ✨ Features & Architecture Highlights

### 1. 🚀 Neural Video Studio (Front & Center)
- **Prompt Synthesis Bar**: Expandable text-to-video input with real-time token counter and character tracking.
- **✨ Magic Enhance**: Automatically elevates simple prompts with 35mm Panavision lens, volumetric lighting, and DaVinci color grading keywords.
- **AI Director Co-Pilot**: An interactive assistant that transforms loose concepts into 3 multi-style director scripts with camera angles and lighting profiles.
- **Negative Prompt Filtering**: Filter out artifacts, limb morphing, flickers, and watermarks.
- **Style Presets**: 35mm Cinema, Cyberpunk Neon, 8K Drone Aerial, Makoto Shinkai Anime & Ghibli, Deep Space Sci-Fi, Vintage 70s Kodachrome, Claymation Stop-Motion.
- **Camera Director Controls**: Direct camera paths including Static Tripod, Pan Left/Right, Tilt Up, Orbit 360°, Dolly Zoom In, and FPV Drone Dives.
- **Aspect Ratio Selector**: 16:9 Landscape, 9:16 Vertical (Shorts/Reels/TikTok), 1:1 Square, 2.39:1 Anamorphic Cinema, 4:5 Social.
- **Live Diffusion Pipeline Visualizer**: Real-time tensor noise canvas showing multi-step denoising progress, stages (Tokenization → 3D Latent Init → Cross-Attention Flow Steps 1–50 → 4K Super-Resolution → 60FPS Frame Interpolator), ETA countdown, and GPU telemetry.

### 2. 🧠 AI Video Models
- **`Bhideo Cinema v3`** *(Flagship DiT)*: Native 4K anamorphic rendering, volumetric fog, photorealistic skin subsurface scattering, and director camera paths (⚡ 5 credits).
- **`Bhideo Turbo v2.1`** *(Lightning Fast)*: Sub-4s few-step distilled diffusion for rapid storyboard ideation (⚡ 2 credits).
- **`Bhideo Motion Pro`** *(Physics & Action)*: High-velocity spatio-temporal flow model for sports, fluid dynamics, car chases, and explosions without motion smear (⚡ 4 credits).
- **`Bhideo Anime-X`** *(Stylized & VFX)*: Hand-drawn cel shading, Makoto Shinkai ethereal skies, and consistent anime character keyframes (⚡ 3 credits).

### 3. 🌐 Community Showcase & Gallery
- Filter by themes: Photorealistic Cinema, Sci-Fi & Cyberpunk, Fantasy & Nature, Anime & VFX, Drone & Aerial, Commercial & Ads, and My Generations.
- Interactive video cards with live procedural animated playback on hover.
- Real-time like counter, prompt copying, remixing into the studio, and 4K MP4 download.
- Fullscreen Lightbox Inspector with playback scrubber, frame-by-frame navigation, and hyperparameters (Seed, CFG Scale, Motion Score, Camera Trajectory).

### 4. 👤 Comprehensive User Profile & Dashboard
- **Profile Header**: Avatar, cover banner, bio editing, tier badges, and live stats (Videos Created, Render Hours Saved, Community Likes, Cloud Storage).
- **🎬 My Creations**: Generated video library with batch actions, lightbox viewing, prompt remixes, and deletion.
- **⚡ Subscription & Credits**: Credit usage gauge, instant recharge packs (+500, +2,000), and plan manager.
- **🔑 Developer API Keys & SDK**: Secret API key management (`bh_live_...`), copy to clipboard, key revocation, and code snippets in Python and cURL.
- **⚙️ Studio Preferences**: Default synthesis model, default resolution (1080p / 4K), auto-enhance toggle, and NSFW safety filter level.

### 5. 🔐 Authentication System
- Seamless Sign In, Sign Up, and Forgot Password modal with social logins (Google, GitHub, Discord, Apple).
- Active state management with localStorage persistence.

### 6. 💳 Recharge & Subscription Modal
- One-click GPU credit top-ups: **+500**, **+2,000**, and **+6,000** credit packs (one-off, never expire).
- Live credit gauge showing `balance / allowance`.
- Switch between every studio plan from one place; credits from the new plan are granted immediately.
- Opens automatically when a generation is attempted without enough credits, so the flow never dead-ends.

### 7. 💳 Compute Pricing Plans
- **Free Explorer** ($0/mo - 50 credits)
- **Creator Pro** ($29/mo - 1,000 credits, 1080p 60FPS, commercial license)
- **Studio Pro** ($79/mo - 3,500 credits, native 4K 60FPS, API access, dedicated GPU queue)
- **Enterprise Cluster** ($249/mo - Dedicated H100 cluster, custom LoRA fine-tuning)

---

## 🛡️ Reliability & Error Handling

The studio is defensive by design so that a single failure can never leave a blank page:

- **`ErrorBoundary`** wraps the app shell, the routed views, the modal layer and the footer. Any render error shows a readable "Something went wrong" panel with *Try again* / *Reload app* actions and collapsible technical details, instead of unmounting the React root.
- **Safe storage layer** (`src/utils/safeStorage.js`): every `localStorage` read/write is guarded, and persisted state is normalised on load. Corrupted JSON, blocked storage (private mode / sandboxed iframe) and user objects saved by older versions can no longer throw during the first render.
- **Clipboard fallback**: `navigator.clipboard` is unavailable on insecure origins and in some embedded contexts, so copying a prompt/API key falls back to a hidden-textarea copy instead of throwing inside the click handler.
- **Leak-proof timers**: the generation simulation and toast timers are tracked in refs and cleared on unmount.
- **Canvas engine fixes**: `ProceduralVideoEngine` no longer auto-starts a `requestAnimationFrame` loop on construction — idle showcase cards render one static poster frame and only animate while hovered (previously every card on screen ran a 60 FPS loop forever). `play()` cannot stack duplicate loops and `destroy()` hard-stops rendering.
- **Missing Tailwind utilities added**: `animate-fade-in`, `animate-bounce-in`, `scrollbar-none` and the `h-18` navbar height are now actually defined, plus a `prefers-reduced-motion` fallback.
- **Relative base path** (`base: './'`): the production build also works when served from a sub-path (static hosts, GitHub Pages, previews).
- **Zero-config GitHub Pages & static root deployment (`bundle/app.js` + `bundle/app.css`)**: `index.html` and `404.html` ship with inline dark-theme fallback styles and reference pre-compiled `./bundle/app.css` and `./bundle/app.js` (plus `.nojekyll`). When GitHub Pages deploys directly from the repository root (`main` / `/`), the full application loads immediately instead of failing on uncompiled `/src/main.jsx` with a blank white screen. During `npm run dev` and `npm run build`, the Vite plugin in `vite.config.js` transparently switches to `/src/main.jsx` and refreshes `bundle/` on every build. `.github/workflows/ci-pages.yml` fails CI when `bundle/` drifts from `src/` and explicitly requests the Pages build on every push to `main`, so neither a stale bundle nor a skipped Pages build can silently ship a blank page (see **Deployment — GitHub Pages** below).

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite 6
- **Styling**: Tailwind CSS 3.4 with custom glassmorphism, cyberpunk neon gradients, and animated glowing borders
- **Icons**: Lucide React
- **Video Engine**: High-fidelity Procedural Neural Video Canvas Engine & HTML5 Video Streamer
- **State**: React Context API with LocalStorage sync

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
