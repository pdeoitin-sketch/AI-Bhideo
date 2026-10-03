// Mock Data for AI-Bhideo Video Generation Platform

export const INITIAL_MODELS = [
  {
    id: 'bhideo-cinema-v3',
    name: 'Bhideo Cinema v3',
    tag: 'Cinematic Profile',
    badge: 'Film',
    description: 'Prompt-themed canvas preset with cinematic lighting, animated atmosphere, and a prompt caption.',
    resolution: 'Up to 1280px long edge',
    maxDuration: '16s',
    fps: '24 / 60 FPS',
    speed: 'Browser-recorded',
    creditCost: 4,
    features: ['Anamorphic Lens Flare', 'Global Volumetric Fog', 'Photorealistic Skin & Subsurface Scattering', 'Director Camera Paths'],
    color: 'from-purple-500 to-indigo-600',
    accent: '#8b5cf6'
  },
  {
    id: 'bhideo-turbo-v2',
    name: 'Bhideo Turbo v2.1',
    tag: 'Fast Preview',
    badge: 'Quick',
    description: 'Lightweight profile for quick storyboard clips with prompt captions and simple motion.',
    resolution: 'Up to 1280px long edge',
    maxDuration: '8s',
    fps: '30 FPS',
    speed: 'Browser-recorded',
    creditCost: 1,
    features: ['Sub-5s Generation', 'Instant Prompt Feedback', 'Optimized for Mobile Shorts & TikTok', 'Low VRAM Footprint'],
    color: 'from-cyan-500 to-blue-600',
    accent: '#06b6d4'
  },
  {
    id: 'bhideo-motion-pro',
    name: 'Bhideo Motion Pro',
    tag: 'Action Profile',
    badge: 'Motion',
    description: 'Motion-focused prompt preview for action, fluid, and vehicle scenes.',
    resolution: 'Up to 1280px long edge',
    maxDuration: '12s',
    fps: '60 FPS Ultra-fluid',
    speed: 'Browser-recorded',
    creditCost: 3,
    features: ['Complex Fluid Dynamics', 'Zero Temporal Smear', 'High-Speed Action Tracking', 'Consistent Multibody Collision'],
    color: 'from-amber-500 to-rose-600',
    accent: '#f59e0b'
  },
  {
    id: 'bhideo-anime-x',
    name: 'Bhideo Anime-X',
    tag: 'Stylized Profile',
    badge: 'Anime',
    description: 'Stylized local preview profile for animation, skies, and illustration prompts.',
    resolution: 'Up to 1280px long edge',
    maxDuration: '16s',
    fps: '24 / 60 FPS',
    speed: 'Browser-recorded',
    creditCost: 2,
    features: ['Hand-drawn Cel Shading', 'Ethereal Cloud & Lighting FX', 'Consistent Anime Character Keyframes', 'Manga Line-art Weight Control'],
    color: 'from-pink-500 to-purple-600',
    accent: '#ec4899'
  }
];

export const STYLE_PRESETS = [
  { id: 'cinematic', label: '🎬 Cinematic 35mm', promptSuffix: ', cinematic lighting, 35mm Panavision lens, shallow depth of field, 8k resolution, photorealistic, color graded in DaVinci Resolve' },
  { id: 'cyberpunk', label: '🌆 Cyberpunk Neon', promptSuffix: ', cyberpunk aesthetic, neon lights reflecting on wet asphalt, volumetric mist, blade runner 2049 mood, futuristic high-tech, 8k octanerect' },
  { id: 'hyperreal', label: '📸 Hyper-Realistic 8K', promptSuffix: ', hyper-detailed photographic render, Hasselblad H6D-100c, natural sun flare, photorealistic textures, HDR, 8k crisp focus' },
  { id: 'anime', label: '✨ Anime & Ghibli', promptSuffix: ', Makoto Shinkai aesthetic, Studio Ghibli hand-painted background, vibrant colors, lush volumetric clouds, magical atmosphere, masterpiece' },
  { id: 'drone', label: '🛸 8K Drone Aerial', promptSuffix: ', wide angle drone shot, aerial top-down dynamic flight, epic sweeping landscape, cinematic golden hour sunlight, 4k ultra-hd' },
  { id: 'scifi', label: '🚀 Deep Space Sci-Fi', promptSuffix: ', interstellar deep space nebula, futuristic cosmic mega-structure, glowing plasma thrusters, IMAX 70mm film quality, Nolan style' },
  { id: 'vintage', label: '📼 Vintage 1970s Film', promptSuffix: ', 1970s Kodachrome 64 film stock, vintage color saturation, authentic film grain, nostalgic warm tone, retro cinematic masterpiece' },
  { id: 'claymation', label: '🎨 Claymation / Stop-Motion', promptSuffix: ', handmade claymation stop-motion animation, plasticine textures, fingerprint details, Laika Studios style, miniature lighting' }
];

export const CAMERA_PRESETS = [
  { id: 'static', label: 'Static Tripod', icon: 'Camera' },
  { id: 'pan-left', label: 'Pan Left ←', icon: 'MoveLeft' },
  { id: 'pan-right', label: 'Pan Right →', icon: 'MoveRight' },
  { id: 'tilt-up', label: 'Tilt Up ↑', icon: 'MoveUp' },
  { id: 'zoom-in', label: 'Dolly Zoom In 🔍', icon: 'ZoomIn' },
  { id: 'orbit', label: 'Orbit 360° 🔄', icon: 'RotateCw' },
  { id: 'fpv-drone', label: 'FPV Drone Dive 🦅', icon: 'Compass' }
];

export const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9 Landscape', desc: 'YouTube / Film / Desktop', class: 'aspect-video' },
  { id: '9:16', label: '9:16 Vertical', desc: 'Reels / Shorts / TikTok', class: 'aspect-[9/16]' },
  { id: '1:1', label: '1:1 Square', desc: 'Instagram / Feed', class: 'aspect-square' },
  { id: '2.39:1', label: '2.39:1 Anamorphic', desc: 'Cinematic Widescreen', class: 'aspect-[2.39/1]' },
  { id: '4:5', label: '4:5 Portrait', desc: 'Social Media', class: 'aspect-[4/5]' }
];

export const INSPIRATION_PROMPTS = [
  {
    title: 'Cyberpunk Tokyo Rain',
    prompt: 'A sleek chrome hypercar gliding through rain-slicked Tokyo streets at midnight, vibrant holographic neon signs reflecting on wet asphalt, cinematic 35mm anamorphic lens, 8k resolution',
    category: 'Sci-Fi & Cyberpunk',
    model: 'Bhideo Cinema v3',
    aspectRatio: '16:9'
  },
  {
    title: 'Bioluminescent Alien Forest',
    prompt: 'FPV drone flying smoothly through a mystical alien jungle filled with giant glowing bioluminescent mushrooms, floating spores, ethereal teal and violet lighting, ultra-high dynamic range',
    category: 'Fantasy & Nature',
    model: 'Bhideo Motion Pro',
    aspectRatio: '16:9'
  },
  {
    title: 'Astronaut Nebula Drift',
    prompt: 'An astronaut in a futuristic carbon-fiber spacesuit floating weightlessly through a swirling golden and violet cosmic nebula, visor reflecting distant starburst, IMAX 70mm film format',
    category: 'Photorealistic',
    model: 'Bhideo Cinema v3',
    aspectRatio: '2.39:1'
  },
  {
    title: 'Anime Sunset Train',
    prompt: 'A solitary passenger sitting inside a vintage train moving along an ocean railway during a warm golden hour sunset, ocean waves splashing against tracks, Makoto Shinkai anime style',
    category: 'Anime & VFX',
    model: 'Bhideo Anime-X',
    aspectRatio: '16:9'
  },
  {
    title: 'Liquid Gold Splash Macro',
    prompt: 'Macro slow-motion shot of a drop of molten liquid gold impacting a pool of black obsidian liquid, intricate physics crowns forming, 1000fps phantom flex 4k camera',
    category: 'Commercial & Ads',
    model: 'Bhideo Motion Pro',
    aspectRatio: '1:1'
  },
  {
    title: 'Nordic Aurora Fjord Flight',
    prompt: 'Cinematic aerial drone sweep over Norwegian snowy fjords at night under dancing emerald green Northern Lights aurora borealis, calm icy water reflections, 8k photorealistic',
    category: 'Drone & Aerial',
    model: 'Bhideo Cinema v3',
    aspectRatio: '16:9'
  }
];

export const INITIAL_COMMUNITY_VIDEOS = [
  {
    id: 'vid-001',
    title: 'Cyberpunk Neon Tiger Prowling Shibuya',
    prompt: 'A cybernetic mechanical tiger with glowing neon blue veins prowling through a rain-drenched Shibuya alleyway at midnight, neon reflections in puddles, cinematic anamorphic lens, 8k photorealistic, volumetric steam.',
    negativePrompt: 'blurry, low quality, artifacts, distorted paws, flickering, cartoonish',
    model: 'Bhideo Cinema v3',
    modelId: 'bhideo-cinema-v3',
    aspectRatio: '16:9',
    duration: '8s',
    fps: 60,
    resolution: '3840×2160 (4K)',
    seed: 849204112,
    motionScore: 8.5,
    camera: 'Pan Right →',
    author: {
      name: 'Elena Rostova',
      handle: '@elenavfx',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      badge: 'PRO'
    },
    likes: 1842,
    views: 14200,
    category: 'Sci-Fi & Cyberpunk',
    theme: 'cyberpunk',
    isLiked: false,
    createdAt: '2 hours ago'
  },
  {
    id: 'vid-002',
    title: 'Ethereal Bioluminescent Ancient Temple',
    prompt: 'Ancient stone temple overgrown with glowing bioluminescent blue moss and floating celestial motes, cinematic drone push-in shot, sunlight filtering through lush canopy, hyper-detailed 4k.',
    negativePrompt: 'muddy textures, low contrast, oversaturated, deformed architecture',
    model: 'Bhideo Motion Pro',
    modelId: 'bhideo-motion-pro',
    aspectRatio: '16:9',
    duration: '12s',
    fps: 60,
    resolution: '2560×1440 (2K)',
    seed: 391058291,
    motionScore: 7.8,
    camera: 'FPV Drone Dive 🦅',
    author: {
      name: 'Kai Takahashi',
      handle: '@kaicreates',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      badge: 'STUDIO'
    },
    likes: 2450,
    views: 29800,
    category: 'Fantasy & Nature',
    theme: 'temple',
    isLiked: true,
    createdAt: '5 hours ago'
  },
  {
    id: 'vid-003',
    title: 'Interstellar Gravity Singularity Rift',
    prompt: 'A sleek black exploration starship traversing the swirling accretion disk of a glowing purple wormhole singularity, gravitational lensing warping distant stars, Christopher Nolan cinematic style, 70mm IMAX.',
    negativePrompt: 'cheap cgi, pixelated, jitter, low resolution',
    model: 'Bhideo Cinema v3',
    modelId: 'bhideo-cinema-v3',
    aspectRatio: '2.39:1',
    duration: '16s',
    fps: 24,
    resolution: '3840×1608 (4K Anamorphic)',
    seed: 712948193,
    motionScore: 9.2,
    camera: 'Orbit 360° 🔄',
    author: {
      name: 'Dr. Marcus Vance',
      handle: '@vance_astro',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      badge: 'PRO'
    },
    likes: 3890,
    views: 45200,
    category: 'Photorealistic',
    theme: 'space',
    isLiked: false,
    createdAt: '1 day ago'
  },
  {
    id: 'vid-004',
    title: 'Makoto Shinkai Sky of Floating Islands',
    prompt: 'Floating grassy islands high in a pastel sunset sky with cascading crystal waterfalls plunging into endless sea of clouds, paper airplanes gliding, Makoto Shinkai anime aesthetic, lush watercolor detail.',
    negativePrompt: 'harsh 3D edges, photorealistic humans, dark mood, muddy colors',
    model: 'Bhideo Anime-X',
    modelId: 'bhideo-anime-x',
    aspectRatio: '16:9',
    duration: '8s',
    fps: 24,
    resolution: '3840×2160 (4K)',
    seed: 194827519,
    motionScore: 6.5,
    camera: 'Tilt Up ↑',
    author: {
      name: 'Yuki Morita',
      handle: '@yukinoko',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      badge: 'PRO'
    },
    likes: 4120,
    views: 52100,
    category: 'Anime & VFX',
    theme: 'anime',
    isLiked: true,
    createdAt: '1 day ago'
  },
  {
    id: 'vid-005',
    title: 'Luxury Perfume Fluid Sculpture',
    prompt: 'Ultra-slow motion commercial shot of a frosted crystalline perfume bottle bursting through a vortex of pink rose petals and shimmering liquid gold droplets, high fashion studio lighting, 120fps.',
    negativePrompt: 'amateur, bad lighting, grainy, flicker, dull colors',
    model: 'Bhideo Motion Pro',
    modelId: 'bhideo-motion-pro',
    aspectRatio: '9:16',
    duration: '8s',
    fps: 60,
    resolution: '2160×3840 (Vertical 4K)',
    seed: 948102847,
    motionScore: 8.9,
    camera: 'Dolly Zoom In 🔍',
    author: {
      name: 'Studio Lux VFX',
      handle: '@luxagency',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
      badge: 'STUDIO'
    },
    likes: 1980,
    views: 18400,
    category: 'Commercial & Ads',
    theme: 'fluid',
    isLiked: false,
    createdAt: '2 days ago'
  },
  {
    id: 'vid-006',
    title: 'Swiss Alps Glacial FPV Dive',
    prompt: 'High speed FPV drone carving down a jagged snowy mountain peak in the Swiss Alps, snow powder spraying in the air, golden sunrise rays reflecting off pristine glaciers, ultra-wide 8k resolution.',
    negativePrompt: 'motion blur smear, low poly, artifacting, lens dirt',
    model: 'Bhideo Cinema v3',
    modelId: 'bhideo-cinema-v3',
    aspectRatio: '16:9',
    duration: '12s',
    fps: 60,
    resolution: '3840×2160 (4K)',
    seed: 582049182,
    motionScore: 9.8,
    camera: 'FPV Drone Dive 🦅',
    author: {
      name: 'Oliver Berg',
      handle: '@berg_drones',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
      badge: 'PRO'
    },
    likes: 3120,
    views: 37900,
    category: 'Drone & Aerial',
    theme: 'drone',
    isLiked: false,
    createdAt: '3 days ago'
  }
];

export const MOCK_USER = {
  id: 'usr_78912',
  name: 'Alex Rivera',
  handle: '@alex_motion',
  email: 'alex.rivera@bhideo.ai',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  tier: 'Studio Pro',
  tierBadgeColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
  credits: 1450,
  maxCredits: 2000,
  joinedDate: 'Joined March 2026',
  bio: 'Filmmaker & Neural VFX Artist. Exploring generative cinema, temporal coherence, and synthetic worldbuilding with AI-Bhideo.',
  stats: {
    videosGenerated: 48,
    renderTimeSavedHours: 18.5,
    likesReceived: 1240,
    storageUsedGb: 4.8,
    storageLimitGb: 50.0
  },
  apiKeys: [
    {
      id: 'key_1',
      name: 'Production Server Webhook',
      key: 'bh_live_9f82a17cb2049e81b67f',
      created: '2026-08-14',
      lastUsed: 'Just now',
      callsCount: 3824
    },
    {
      id: 'key_2',
      name: 'Local Dev & Testing',
      key: 'bh_test_3a8b99c0d11ef4219aa0',
      created: '2026-09-01',
      lastUsed: '3 days ago',
      callsCount: 412
    }
  ]
};

export const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'Free Explorer',
    priceMonthly: 0,
    priceAnnual: 0,
    description: 'Try prompt-themed browser renders and downloadable video previews.',
    credits: '50 Demo Credits / month',
    badge: 'Free Forever',
    popular: false,
    features: [
      'Access to all four local render profiles',
      'Prompt-themed browser-rendered clips',
      'WebM/MP4 export where supported',
      'Up to 16 seconds per clip',
      'Community Showcase access',
      '50 demo credits shown in the UI'
    ],
    buttonText: 'Get Started Free',
    buttonVariant: 'outline'
  },
  {
    id: 'creator',
    name: 'Creator Pro',
    priceMonthly: 19,
    priceAnnual: 15,
    description: 'For creators who want more monthly credits and prompt/camera controls.',
    credits: '1,000 Demo Credits / month',
    badge: 'Most Popular',
    popular: true,
    features: [
      'All four local render profiles',
      'Up to 16-second browser captures',
      'WebM/MP4 downloads where supported',
      'Camera and aspect-ratio controls',
      'Prompt captions on rendered clips',
      'Saved clips stored in browser IndexedDB',
      'Demo checkout only; no charge is processed'
    ],
    buttonText: 'Upgrade to Creator',
    buttonVariant: 'primary'
  },
  {
    id: 'studio',
    name: 'Studio Pro',
    priceMonthly: 49,
    priceAnnual: 39,
    description: 'For frequent creators who need a larger local-render credit allowance.',
    credits: '3,500 Demo Credits / month',
    badge: 'Power Studio',
    popular: false,
    features: [
      'All four local render profiles',
      '3,500 demo credits shown in the UI',
      'Up to 16-second browser captures',
      'Up to 1280px on the long edge',
      'IndexedDB clip library',
      'Advanced prompt, camera, and aspect settings',
      'No hosted GPU queue is configured in this demo'
    ],
    buttonText: 'Upgrade to Studio Pro',
    buttonVariant: 'gradient'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Cluster',
    priceMonthly: 149,
    priceAnnual: 119,
    description: 'A placeholder plan for teams evaluating a future provider-backed workflow.',
    credits: '10,000 Demo Credits / month',
    badge: 'Enterprise',
    popular: false,
    features: [
      'Future server-side integration placeholder',
      '10,000 demo credits shown in the UI',
      'All local render profiles',
      'Browser-based video export',
      'No dedicated GPU, SLA, or support is provisioned',
      'Demo checkout only; no charge is processed'
    ],
    buttonText: 'Contact Enterprise',
    buttonVariant: 'outline'
  }
];

export const MODEL_ARCHITECTURE_STEPS = [
  {
    step: '01',
    title: 'Dual Multimodal Tokenization',
    subtitle: 'CLIP-ViT-L/14 + T5-XXL Encoders',
    description: 'The input prompt is tokenized through a synchronized dual text-encoder pipeline. High-level semantics and fine-grained camera/lighting nuances are projected into a 4096-dimensional shared embedding space.',
    icon: 'BrainCircuit',
    metric: '4,096-dim token vectors'
  },
  {
    step: '02',
    title: 'Spatio-Temporal 3D Latent VAE',
    subtitle: '8× Spatial, 4× Temporal Compression',
    description: 'Video frames are encoded into a continuous 3D latent manifold using a causal temporal Variational Autoencoder, reducing computational complexity while retaining micro-textures and motion physics.',
    icon: 'Layers',
    metric: '32× compressed manifold'
  },
  {
    step: '03',
    title: 'Flow-Matching Diffusion Transformer',
    subtitle: '12 Billion Parameter DiT Backbone',
    description: 'AI-Bhideo utilizes full 3D Spatio-Temporal Cross-Attention with 3D Rotary Positional Embeddings (3D-RoPE) to solve temporal flickering, object morphing, and motion consistency across time slices.',
    icon: 'Cpu',
    metric: '12B Parameters, 64 layers'
  },
  {
    step: '04',
    title: 'Neural Fluid & Physics Director',
    subtitle: 'Collision & Inertia Guidance',
    description: 'A physics-aware guidance loss reinforces real-world dynamic constraints — such as fluid flow, gravity, atmospheric volumetric scattering, and multi-body object interactions.',
    icon: 'Activity',
    metric: '99.8% Temporal Consistency'
  },
  {
    step: '05',
    title: '4K Latent Super-Resolution & 60FPS Interpolator',
    subtitle: 'Temporal Latent Upscaler',
    description: 'The sampled latents are reconstructed via a high-fidelity neural decoder, upscaling from 1080p latent space to native 4K HDR at 60 frames per second with motion-vector guided frame synthesis.',
    icon: 'Sparkles',
    metric: 'Native 4K 60FPS Output'
  }
];
