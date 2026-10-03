// Prompt-themed procedural video renderer on HTML5 Canvas. This is a local
// visual renderer, not a remote neural inference service.

function addRoundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

export class ProceduralVideoEngine {
  constructor(canvas, theme = 'cyberpunk', options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = theme;
    this.prompt = String(options.prompt || '').replace(/\s+/g, ' ').trim();
    this.subject = this.detectPromptSubject(this.prompt);
    this.captionLines = this.wrapPromptCaption(this.prompt, canvas.width);
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

  detectPromptSubject(prompt) {
    const text = String(prompt || '').toLowerCase();
    if (/jellyfish|medusa/.test(text)) return 'jellyfish';
    if (/train|locomotive|railway/.test(text)) return 'train';
    if (/perfume|bottle|vial/.test(text)) return 'bottle';
    if (/drone|quad(copter)?|fpv/.test(text)) return 'drone';
    if (/spaceship|starship|rocket|ufo|spacecraft/.test(text)) return 'spacecraft';
    if (/astronaut/.test(text)) return 'astronaut';
    if (/hypercar|car|vehicle|motorcycle|motorbike|truck/.test(text)) return 'vehicle';
    return null;
  }

  wrapPromptCaption(prompt, width) {
    if (!prompt) return [];
    const maxCharacters = Math.max(24, Math.floor(width / 16));
    const words = prompt.split(/\s+/);
    const lines = [''];
    let wordIndex = 0;

    for (; wordIndex < words.length; wordIndex++) {
      const word = words[wordIndex];
      const lastLine = lines[lines.length - 1];
      const candidate = lastLine ? `${lastLine} ${word}` : word;
      if (candidate.length > maxCharacters && lastLine) {
        if (lines.length === 2) break;
        lines.push(word);
      } else {
        lines[lines.length - 1] = candidate;
      }
      if (lines.length === 2 && lines[1].length >= maxCharacters) {
        wordIndex++;
        break;
      }
    }

    if (wordIndex < words.length) {
      const lastLineIndex = lines.length - 1;
      const line = lines[lastLineIndex].replace(/[.,;:!?…]+$/, '');
      lines[lastLineIndex] = `${line.slice(0, Math.max(1, maxCharacters - 1)).trimEnd()}…`;
    }
    return lines.filter(Boolean);
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

    // Draw a simple animated subject when the prompt names a supported object.
    this.renderPromptSubject(ctx, w, h, t);

    // Camera preset overlay effect
    this.renderCameraMotion(ctx, w, h, t);

    // Cinematic Film Grain & Anamorphic Letterbox if applicable
    this.renderCinematicOverlay(ctx, w, h, t);
    this.renderPromptCaption(ctx, w, h);

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

  renderPromptSubject(ctx, w, h, t) {
    if (!this.subject) return;
    const sceneScale = Math.min(w / 1280, h / 720, 1);

    ctx.save();
    if (this.subject === 'vehicle') {
      const x = w * 0.5 + Math.sin(t * 0.8) * w * 0.09;
      const y = h * 0.75 + Math.sin(t * 1.6) * h * 0.008;
      ctx.translate(x, y);
      ctx.scale(sceneScale, sceneScale);

      const underglow = ctx.createRadialGradient(0, 22, 10, 0, 22, 270);
      underglow.addColorStop(0, 'rgba(0, 245, 255, 0.48)');
      underglow.addColorStop(1, 'rgba(0, 245, 255, 0)');
      ctx.fillStyle = underglow;
      ctx.beginPath();
      ctx.ellipse(0, 26, 270, 52, 0, 0, Math.PI * 2);
      ctx.fill();

      const body = ctx.createLinearGradient(0, -130, 0, 22);
      body.addColorStop(0, '#dbeafe');
      body.addColorStop(0.16, '#64748b');
      body.addColorStop(0.55, '#1e293b');
      body.addColorStop(1, '#070b16');
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 30;
      ctx.fillStyle = body;
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-286, 7);
      ctx.lineTo(-258, -28);
      ctx.quadraticCurveTo(-246, -52, -205, -57);
      ctx.lineTo(-142, -111);
      ctx.quadraticCurveTo(-122, -130, -84, -132);
      ctx.lineTo(73, -132);
      ctx.quadraticCurveTo(113, -130, 145, -84);
      ctx.lineTo(217, -63);
      ctx.quadraticCurveTo(257, -56, 275, -20);
      ctx.lineTo(286, 8);
      ctx.quadraticCurveTo(255, 25, 219, 25);
      ctx.lineTo(-226, 25);
      ctx.quadraticCurveTo(-266, 24, -286, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Panoramic windshield and cabin highlights.
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(3, 15, 35, 0.92)';
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-128, -112);
      ctx.lineTo(-78, -122);
      ctx.lineTo(65, -122);
      ctx.quadraticCurveTo(92, -119, 118, -84);
      ctx.lineTo(-155, -84);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wheels, hub lights, and headlamps.
      [-174, 178].forEach((wheelX) => {
        ctx.fillStyle = '#05070d';
        ctx.strokeStyle = '#a5f3fc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(wheelX, 14, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(wheelX, 14, 12 + Math.sin(t * 4) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowColor = '#f472b6';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(-272, -6, 26, 7);
      ctx.shadowColor = '#67e8f9';
      ctx.fillStyle = '#cffafe';
      ctx.fillRect(249, -8, 29, 8);
    } else if (this.subject === 'spacecraft') {
      const scale = Math.min(w / 900, h / 620, 1.15);
      const x = w * 0.5 + Math.sin(t * 0.7) * w * 0.12;
      const y = h * 0.46 + Math.cos(t * 0.9) * h * 0.05;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.shadowColor = '#67e8f9';
      ctx.shadowBlur = 28;
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#a5f3fc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(178, 0);
      ctx.lineTo(12, -34);
      ctx.lineTo(-96, -28);
      ctx.lineTo(-168, -62);
      ctx.lineTo(-138, -8);
      ctx.lineTo(-186, 19);
      ctx.lineTo(-72, 14);
      ctx.lineTo(25, 33);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.ellipse(-22, -1, 38, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(251, 146, 60, ${0.65 + Math.sin(t * 12) * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(-164, -17);
      ctx.lineTo(-257 - Math.sin(t * 15) * 14, -5);
      ctx.lineTo(-164, 9);
      ctx.closePath();
      ctx.fill();
    } else if (this.subject === 'jellyfish') {
      const scale = Math.min(w / 850, h / 680, 1.1);
      const x = w * 0.5 + Math.sin(t * 0.6) * w * 0.12;
      const y = h * 0.43 + Math.sin(t * 1.1) * h * 0.04;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      const bell = ctx.createRadialGradient(-28, -25, 8, 0, 0, 135);
      bell.addColorStop(0, 'rgba(240, 249, 255, 0.98)');
      bell.addColorStop(0.35, 'rgba(167, 139, 250, 0.92)');
      bell.addColorStop(1, 'rgba(34, 211, 238, 0.16)');
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 34;
      ctx.fillStyle = bell;
      ctx.beginPath();
      ctx.ellipse(0, 0, 118, 78 + Math.sin(t * 2) * 8, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(118, 8);
      ctx.quadraticCurveTo(0, 72, -118, 8);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(165, 243, 252, 0.85)';
      ctx.lineWidth = 5;
      for (let tentacle = -3; tentacle <= 3; tentacle++) {
        const startX = tentacle * 27;
        ctx.beginPath();
        ctx.moveTo(startX, 35);
        ctx.bezierCurveTo(
          startX + Math.sin(t * 1.7 + tentacle) * 22, 88,
          startX - Math.cos(t * 1.3 + tentacle) * 25, 135,
          startX + Math.sin(t * 1.5 + tentacle) * 35, 190
        );
        ctx.stroke();
      }
    } else if (this.subject === 'train') {
      const scale = Math.min(w / 1280, h / 760, 1);
      const x = w * 0.5 + Math.sin(t * 0.35) * w * 0.05;
      const y = h * 0.67;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.shadowColor = '#fb7185';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#312e81';
      ctx.strokeStyle = '#fbcfe8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-330, 45);
      ctx.lineTo(-304, -92);
      ctx.quadraticCurveTo(-290, -126, -236, -126);
      ctx.lineTo(274, -126);
      ctx.quadraticCurveTo(321, -120, 330, -72);
      ctx.lineTo(330, 45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fef3c7';
      for (let windowX = -250; windowX <= 220; windowX += 95) {
        ctx.fillRect(windowX, -98, 62, 52);
      }
      ctx.fillStyle = '#09090b';
      [-225, -75, 75, 225].forEach((wheelX) => {
        ctx.beginPath();
        ctx.arc(wheelX, 54, 23, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(274, -22, 35, 11);
    } else if (this.subject === 'bottle') {
      const scale = Math.min(w / 760, h / 640, 1.1);
      const x = w * 0.5 + Math.sin(t * 0.5) * w * 0.04;
      const y = h * 0.52;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.shadowColor = '#f9a8d4';
      ctx.shadowBlur = 40;
      const glass = ctx.createLinearGradient(-105, 0, 105, 0);
      glass.addColorStop(0, 'rgba(244, 114, 182, 0.2)');
      glass.addColorStop(0.48, 'rgba(255, 255, 255, 0.92)');
      glass.addColorStop(1, 'rgba(192, 132, 252, 0.28)');
      ctx.fillStyle = glass;
      ctx.strokeStyle = '#fbcfe8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      addRoundedRect(ctx, -104, -166, 208, 330, 38);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fce7f3';
      ctx.fillRect(-45, -220, 90, 60);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(-55, -238, 110, 24);
      ctx.fillStyle = 'rgba(190, 24, 93, 0.7)';
      ctx.fillRect(-70, 6, 140, 54);
    } else if (this.subject === 'drone') {
      const scale = Math.min(w / 900, h / 650, 1.1);
      ctx.translate(w * 0.5 + Math.sin(t) * w * 0.07, h * 0.4 + Math.cos(t * 1.4) * h * 0.04);
      ctx.scale(scale, scale);
      ctx.shadowColor = '#67e8f9';
      ctx.shadowBlur = 25;
      ctx.strokeStyle = '#dbeafe';
      ctx.fillStyle = '#1e293b';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-48, -5);
      ctx.lineTo(-240, -74);
      ctx.moveTo(48, -5);
      ctx.lineTo(240, -74);
      ctx.moveTo(-48, 8);
      ctx.lineTo(-200, 90);
      ctx.moveTo(48, 8);
      ctx.lineTo(200, 90);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 74, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#67e8f9';
      [[-240, -74], [240, -74], [-200, 90], [200, 90]].forEach(([propX, propY]) => {
        ctx.beginPath();
        ctx.ellipse(propX, propY, 72, 12 + Math.sin(t * 18) * 2, t * 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(0, 6, 13, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.subject === 'astronaut') {
      const scale = Math.min(w / 800, h / 700, 1.1);
      ctx.translate(w * 0.5 + Math.sin(t * 0.55) * w * 0.07, h * 0.48 + Math.cos(t * 0.9) * h * 0.04);
      ctx.scale(scale, scale);
      ctx.shadowColor = '#c4b5fd';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      addRoundedRect(ctx, -94, -6, 188, 230, 52);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -94, 105, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#172554';
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.ellipse(0, -94, 75, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#a78bfa';
      ctx.fillRect(-62, 78, 124, 42);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-40, -94, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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

  renderPromptCaption(ctx, w, h) {
    if (!this.captionLines.length) return;

    const fontSize = Math.max(12, Math.min(25, w * 0.024));
    const labelSize = Math.max(9, Math.min(13, w * 0.011));
    const lineHeight = fontSize * 1.28;
    const padding = Math.max(16, w * 0.035);
    const labelHeight = labelSize * 1.7;
    const contentHeight = this.captionLines.length * lineHeight;
    const top = h - padding - contentHeight - labelHeight;

    ctx.save();
    const gradient = ctx.createLinearGradient(0, top - 26, 0, h);
    gradient.addColorStop(0, 'rgba(2, 6, 23, 0)');
    gradient.addColorStop(0.28, 'rgba(2, 6, 23, 0.6)');
    gradient.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, top - 26, w, h - top + 26);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `700 ${labelSize}px system-ui, sans-serif`;
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('PROMPT-BASED VIDEO PREVIEW', padding, top + labelSize, w - padding * 2);

    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 5;
    this.captionLines.forEach((line, index) => {
      ctx.fillText(line, padding, top + labelHeight + fontSize + index * lineHeight, w - padding * 2);
    });
    ctx.restore();
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
