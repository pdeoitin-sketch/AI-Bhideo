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

### 6. 💳 Compute Pricing Plans
- **Free Explorer** ($0/mo - 50 credits)
- **Creator Pro** ($29/mo - 1,000 credits, 1080p 60FPS, commercial license)
- **Studio Pro** ($79/mo - 3,500 credits, native 4K 60FPS, API access, dedicated GPU queue)
- **Enterprise Cluster** ($249/mo - Dedicated H100 cluster, custom LoRA fine-tuning)

---

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

## 📄 License

MIT License © 2026 AI-Bhideo Synthesis Lab.
