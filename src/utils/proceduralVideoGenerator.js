// Procedural Dynamic Neural Video Generator on HTML5 Canvas
// Creates realistic, cinematic, high-aesthetic animated visual sequences based on prompt semantics and themes.

export class ProceduralVideoEngine {
  constructor(canvas, theme = 'cyberpunk', options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = theme;
    this.options = {
      fps: options.fps || 60,
      duration: options.duration || 8,
      motionStrength: options.motionStrength || 7,
      cameraPreset: options.cameraPreset || 'static',
      ...options
    };
    this.animationFrameId = null;
    this.startTime = null;
    this.paused = false;
    this.currentTime = 0;
    // Engines start paused on purpose: `render()` used to kick off a rAF loop
    // immediately, so every card on screen animated forever at 60fps and
    // `play()` stacked extra loops on top. Callers now opt in with play().
    this.isPlaying = false;
    this.destroyed = false;
    this.particles = [];
    this.initThemeState();
  }

  initThemeState() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.particles = [];

    // Initialize particles based on theme
    const count = this.theme === 'cyberpunk' ? 120 :
                  this.theme === 'space' ? 180 :
                  this.theme === 'temple' ? 80 :
                  this.theme === 'anime' ? 60 :
                  this.theme === 'fluid' ? 140 : 100;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 1000 + 100,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: (Math.random() * 2 + 1) * (this.theme === 'cyberpunk' ? 2 : 0.5),
        color: this.getThemeParticleColor(),
        alpha: Math.random() * 0.8 + 0.2,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  getThemeParticleColor() {
    switch (this.theme) {
      case 'cyberpunk':
        return ['#00f5ff', '#ff007f', '#a855f7', '#3b82f6'][Math.floor(Math.random() * 4)];
      case 'space':
        return ['#8b5cf6', '#c084fc', '#f43f5e', '#38bdf8', '#ffffff'][Math.floor(Math.random() * 5)];
      case 'temple':
        return ['#2dd4bf', '#10b981', '#34d399', '#6ee7b7', '#fef08a'][Math.floor(Math.random() * 5)];
      case 'anime':
        return ['#fbcfe8', '#f472b6', '#38bdf8', '#bae6fd', '#ffffff'][Math.floor(Math.random() * 5)];
      case 'fluid':
        return ['#fbbf24', '#f59e0b', '#f43f5e', '#ec4899', '#ffffff'][Math.floor(Math.random() * 5)];
      default:
        return ['#a855f7', '#06b6d4', '#ffffff', '#6366f1'][Math.floor(Math.random() * 4)];
    }
  }

  render(timestamp) {
    if (this.destroyed || !this.ctx) return;

    if (!this.startTime) this.startTime = timestamp;
    if (!this.paused) {
      const duration = Math.max(0.1, this.options.duration || 8);
      this.currentTime = ((timestamp - this.startTime) / 1000) % duration;
    }

    const t = this.currentTime;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Clear background
    ctx.save();

    // Theme-specific background rendering
    switch (this.theme) {
      case 'cyberpunk':
        this.renderCyberpunk(ctx, w, h, t);
        break;
      case 'space':
        this.renderSpace(ctx, w, h, t);
        break;
      case 'temple':
        this.renderTemple(ctx, w, h, t);
        break;
      case 'anime':
        this.renderAnime(ctx, w, h, t);
        break;
      case 'fluid':
        this.renderFluid(ctx, w, h, t);
        break;
      default:
        this.renderGenericCinematic(ctx, w, h, t);
        break;
    }

    // Camera preset overlay effect
    this.renderCameraMotion(ctx, w, h, t);

    // Cinematic Film Grain & Anamorphic Letterbox if applicable
    this.renderCinematicOverlay(ctx, w, h, t);

    ctx.restore();

    if (this.isPlaying && !this.destroyed) {
      this.animationFrameId = this.requestFrame((ts) => this.render(ts));
    }
  }

  // Small indirection so the engine still works in environments without rAF
  // (SSR/tests) instead of throwing on load.
  requestFrame(callback) {
    if (typeof requestAnimationFrame === 'function') {
      return requestAnimationFrame(callback);
    }
    return setTimeout(() => callback(Date.now()), 1000 / (this.options.fps || 60));
  }

  cancelFrame(id) {
    if (id == null) return;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
    else clearTimeout(id);
  }

  /** Draw a single static frame without starting the animation loop. */
  renderStaticFrame() {
    if (this.destroyed || !this.ctx) return;
    const wasPlaying = this.isPlaying;
    const wasPaused = this.paused;
    this.isPlaying = false;
    this.paused = true;
    this.render(0);
    this.isPlaying = wasPlaying;
    this.paused = wasPaused;
  }

  renderCyberpunk(ctx, w, h, t) {
    // Cyberpunk Tokyo Night Rain
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#050714');
    bgGrad.addColorStop(0.6, '#0d1326');
    bgGrad.addColorStop(1, '#1b122c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // City Silhouette Skyline
    ctx.fillStyle = '#0a0d1a';
    const buildingCount = 18;
    for (let i = 0; i < buildingCount; i++) {
      const bx = (i / buildingCount) * w * 1.2 - ((t * 15) % (w / 4));
      const bw = w / buildingCount * 1.4;
      const bh = h * (0.35 + Math.sin(i * 99) * 0.2);
      ctx.fillRect(bx, h - bh, bw, bh);

      // Cyberpunk Windows
      for (let wy = h - bh + 15; wy < h - 40; wy += 14) {
        for (let wx = bx + 6; wx < bx + bw - 6; wx += 10) {
          if (Math.sin(i * 10 + wx + wy) > 0.3) {
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(0, 245, 255, 0.4)' : 'rgba(236, 72, 153, 0.4)';
            ctx.fillRect(wx, wy, 4, 6);
          }
        }
      }
    }

    // Wet Asphalt Floor Reflections
    const groundGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
    groundGrad.addColorStop(0, 'rgba(10, 15, 30, 0.95)');
    groundGrad.addColorStop(1, 'rgba(3, 5, 12, 1)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.75, w, h * 0.25);

    // Glowing Neon Cyber Tiger / Energy Flow in Center
    const centerX = w * 0.5 + Math.sin(t * 1.5) * 40;
    const centerY = h * 0.65 + Math.cos(t * 2) * 8;
    
    // Radial Hologram Glow
    const halo = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 180);
    halo.addColorStop(0, 'rgba(0, 245, 255, 0.45)');
    halo.addColorStop(0.4, 'rgba(168, 85, 247, 0.25)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 180, 0, Math.PI * 2);
    ctx.fill();

    // Cybernetic Hologram Ring Lines
    ctx.lineWidth = 2;
    for (let r = 0; r < 4; r++) {
      ctx.strokeStyle = r % 2 === 0 ? 'rgba(0, 245, 255, 0.8)' : 'rgba(236, 72, 153, 0.8)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 90 + r * 25, 35 + r * 10, t * (r % 2 === 0 ? 0.8 : -0.6), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Rain Streaks
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.35)';
    ctx.lineWidth = 1.2;
    for (let p of this.particles) {
      p.y += p.speedY * 5;
      p.x += Math.sin(t) * 0.5;
      if (p.y > h) {
        p.y = 0;
        p.x = Math.random() * w;
      }
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 2, p.y + 12);
      ctx.stroke();
    }
  }

  renderSpace(ctx, w, h, t) {
    // Cosmic Nebula & Singularity
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, w * 0.8);
    bgGrad.addColorStop(0, '#0f051d');
    bgGrad.addColorStop(0.5, '#070913');
    bgGrad.addColorStop(1, '#020307');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Swirling Nebula clouds
    for (let i = 0; i < 3; i++) {
      const nGrad = ctx.createRadialGradient(
        w * 0.5 + Math.sin(t * 0.5 + i) * 60,
        h * 0.5 + Math.cos(t * 0.4 + i) * 40,
        30,
        w * 0.5,
        h * 0.5,
        250 + i * 50
      );
      nGrad.addColorStop(0, i === 0 ? 'rgba(139, 92, 246, 0.3)' : i === 1 ? 'rgba(6, 182, 212, 0.2)' : 'rgba(236, 72, 153, 0.25)');
      nGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nGrad;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, 300, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gravitational Lensing Wormhole / Singularity Ring
    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = 80 + Math.sin(t * 2) * 4;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.3);

    // Accretion disk
    for (let r = 0; r < 360; r += 12) {
      const angle = (r * Math.PI) / 180;
      const rx = Math.cos(angle) * (radius * 1.8);
      const ry = Math.sin(angle) * (radius * 0.6);
      ctx.fillStyle = `hsl(${(r + t * 40) % 360}, 90%, 65%)`;
      ctx.beginPath();
      ctx.arc(rx, ry, 3 + Math.sin(r + t) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Singularity Black Hole Core
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Floating Stars / Motes
    for (let p of this.particles) {
      p.phase += 0.02;
      const alpha = (Math.sin(p.phase) + 1) * 0.5;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  renderTemple(ctx, w, h, t) {
    // Bioluminescent Temple & Forest
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#041712');
    bgGrad.addColorStop(0.7, '#07241c');
    bgGrad.addColorStop(1, '#020d0a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Sunlight god rays from canopy
    for (let r = 0; r < 5; r++) {
      const rayGrad = ctx.createLinearGradient(w * 0.2 + r * 100, 0, w * 0.4 + r * 120, h);
      rayGrad.addColorStop(0, 'rgba(45, 212, 191, 0.25)');
      rayGrad.addColorStop(1, 'rgba(45, 212, 191, 0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(w * 0.1 + r * 120, 0);
      ctx.lineTo(w * 0.2 + r * 120, 0);
      ctx.lineTo(w * 0.5 + r * 140, h);
      ctx.lineTo(w * 0.35 + r * 140, h);
      ctx.closePath();
      ctx.fill();
    }

    // Ancient Stone Architecture Pillar Silhouettes
    ctx.fillStyle = '#061310';
    // Left Pillar
    ctx.fillRect(w * 0.15, h * 0.2, w * 0.12, h * 0.8);
    // Right Pillar
    ctx.fillRect(w * 0.73, h * 0.2, w * 0.12, h * 0.8);
    // Center Altar
    ctx.fillRect(w * 0.38, h * 0.55, w * 0.24, h * 0.45);

    // Bioluminescent Glowing Runes / Vines on Pillars
    for (let vy = h * 0.3; vy < h * 0.9; vy += 20) {
      const glow = (Math.sin(t * 3 + vy * 0.1) + 1) * 0.5;
      ctx.fillStyle = `rgba(52, 211, 153, ${0.4 + glow * 0.5})`;
      ctx.fillRect(w * 0.18 + Math.sin(vy) * 10, vy, 12, 4);
      ctx.fillRect(w * 0.76 + Math.cos(vy) * 10, vy, 12, 4);
      ctx.fillRect(w * 0.42 + Math.sin(vy) * 20, vy + 40, 16, 4);
    }

    // Floating Bioluminescent Spores
    for (let p of this.particles) {
      p.y -= 0.6;
      p.x += Math.sin(t * 1.5 + p.phase) * 1.2;
      if (p.y < 0) p.y = h;
      
      const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
      glowGrad.addColorStop(0, 'rgba(45, 212, 191, 0.9)');
      glowGrad.addColorStop(1, 'rgba(45, 212, 191, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderAnime(ctx, w, h, t) {
    // Makoto Shinkai Sunset Skies & Water
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    skyGrad.addColorStop(0, '#3b1c54');
    skyGrad.addColorStop(0.35, '#8b3a7a');
    skyGrad.addColorStop(0.7, '#ea580c');
    skyGrad.addColorStop(1, '#fbbf24');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.65);

    // Glowing Sun Disk
    const sunGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.45, 120);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.3, '#fef08a');
    sunGrad.addColorStop(0.7, 'rgba(251, 191, 36, 0.4)');
    sunGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.45, 120, 0, Math.PI * 2);
    ctx.fill();

    // Ocean Water Horizon with Reflections
    const seaGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
    seaGrad.addColorStop(0, '#f59e0b');
    seaGrad.addColorStop(0.4, '#c026d3');
    seaGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, h * 0.65, w, h * 0.35);

    // Floating Clouds
    for (let c = 0; c < 3; c++) {
      const cx = ((c * 220 + t * 15) % (w + 200)) - 100;
      const cy = h * 0.25 + c * 35;
      ctx.fillStyle = 'rgba(255, 230, 245, 0.5)';
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.arc(cx + 35, cy - 10, 50, 0, Math.PI * 2);
      ctx.arc(cx + 70, cy, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sparkles / Paper Airplanes
    for (let p of this.particles) {
      p.x += Math.cos(t + p.phase) * 1.5;
      p.y += Math.sin(t * 0.5 + p.phase) * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderFluid(ctx, w, h, t) {
    // Liquid Gold & Obsidian Fluid Dynamics
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, w, h);

    const waves = 5;
    for (let j = 0; j < waves; j++) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 10) {
        const y = h * 0.5 + Math.sin(x * 0.015 + t * 2 + j) * 40 + Math.cos(x * 0.03 - t * 1.5) * 25;
        ctx.lineTo(x, y + j * 20);
      }
      ctx.lineTo(w, h);
      ctx.closePath();

      const fGrad = ctx.createLinearGradient(0, h * 0.3, w, h);
      fGrad.addColorStop(0, j % 2 === 0 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(236, 72, 153, 0.6)');
      fGrad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
      ctx.fillStyle = fGrad;
      ctx.fill();
    }

    // Floating Gold Orbs & Splashes
    for (let p of this.particles) {
      p.y -= p.speedY;
      if (p.y < 0) p.y = h;
      const gGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      gGrad.addColorStop(0, '#fef08a');
      gGrad.addColorStop(0.5, '#f59e0b');
      gGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderGenericCinematic(ctx, w, h, t) {
    // Dynamic Photorealistic Cinematic Gradient & Energy Waves
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0a0d18');
    bgGrad.addColorStop(0.5, '#131b2e');
    bgGrad.addColorStop(1, '#080a14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Glowing neural mesh lines
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(139, 92, 246, 0.4)' : 'rgba(6, 182, 212, 0.4)';
      ctx.beginPath();
      for (let x = 0; x < w; x += 30) {
        const y = h * 0.5 + Math.sin(x * 0.01 + t * 2 + i) * 60 + Math.cos(x * 0.02 + t) * 30;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Central Radiant Lens Flare
    const flareGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 5, w * 0.5, h * 0.5, 200);
    flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    flareGrad.addColorStop(0.2, 'rgba(139, 92, 246, 0.4)');
    flareGrad.addColorStop(0.6, 'rgba(6, 182, 212, 0.15)');
    flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, 200, 0, Math.PI * 2);
    ctx.fill();
  }

  renderCameraMotion(ctx, w, h, t) {
    const preset = this.options.cameraPreset;
    if (preset === 'pan-left') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(0, 0, w * 0.1, h);
    } else if (preset === 'pan-right') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(w * 0.9, 0, w * 0.1, h);
    } else if (preset === 'zoom-in') {
      // Vignette effect
      const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.3, w * 0.5, h * 0.5, w * 0.7);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    }
  }

  renderCinematicOverlay(ctx, w, h, t) {
    // Scanline & subtle noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }
  }

  play() {
    if (this.destroyed) return;
    this.paused = false;
    // Guard against stacking several rAF loops when play() is called repeatedly
    // (e.g. hovering a card in and out quickly).
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = null;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.render(now);
  }

  pause() {
    this.paused = true;
    this.isPlaying = false;
    this.cancelFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  seek(timeInSeconds) {
    if (this.destroyed) return;
    const duration = this.options.duration || 8;
    this.currentTime = Math.max(0, Math.min(duration, timeInSeconds));
    this.startTime = null;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const wasPlaying = this.isPlaying;
    this.isPlaying = false;
    this.render(now);
    this.isPlaying = wasPlaying;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pause();
    this.particles = [];
    this.ctx = null;
  }
}
