import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  INITIAL_MODELS, 
  INITIAL_COMMUNITY_VIDEOS, 
  MOCK_USER, 
  PRICING_PLANS,
  INSPIRATION_PROMPTS 
} from '../data/mockData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Navigation & Page routing
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'studio' | 'showcase' | 'models' | 'profile' | 'pricing' | 'docs'
  
  // User Authentication State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bhideo_user');
    return saved ? JSON.parse(saved) : MOCK_USER;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Community Videos & User Creations
  const [communityVideos, setCommunityVideos] = useState(() => {
    const saved = localStorage.getItem('bhideo_community_videos');
    return saved ? JSON.parse(saved) : INITIAL_COMMUNITY_VIDEOS;
  });

  const [userCreations, setUserCreations] = useState(() => {
    const saved = localStorage.getItem('bhideo_user_creations');
    return saved ? JSON.parse(saved) : [
      {
        id: 'usr-vid-01',
        title: 'Cyberpunk Rain Hypercar Drift',
        prompt: 'A sleek titanium hypercar drifting across rain-soaked asphalt in neo-Tokyo at 2am, glowing cyan neon underglow, 8k resolution, cinematic 35mm film.',
        negativePrompt: 'blurry, low quality, cartoon, watermark',
        model: 'Bhideo Cinema v3',
        modelId: 'bhideo-cinema-v3',
        aspectRatio: '16:9',
        duration: '8s',
        fps: 60,
        resolution: '3840×2160 (4K)',
        seed: 74910283,
        motionScore: 8.5,
        camera: 'FPV Drone Dive 🦅',
        likes: 142,
        views: 890,
        theme: 'cyberpunk',
        createdAt: '1 hour ago',
        status: 'completed'
      },
      {
        id: 'usr-vid-02',
        title: 'Bioluminescent Jellyfish in Deep Cosmic Abyss',
        prompt: 'Giant translucent crystal jellyfish floating gently in deep cosmic ocean, emitting pulses of emerald and violet bioluminescent light, 120fps macro lens.',
        negativePrompt: 'flicker, artifacts, low poly',
        model: 'Bhideo Motion Pro',
        modelId: 'bhideo-motion-pro',
        aspectRatio: '9:16',
        duration: '8s',
        fps: 60,
        resolution: '2160×3840 (4K)',
        seed: 39482019,
        motionScore: 7.2,
        camera: 'Dolly Zoom In 🔍',
        likes: 89,
        views: 450,
        theme: 'temple',
        createdAt: 'Yesterday',
        status: 'completed'
      }
    ];
  });

  // Current Video Generation Inputs
  const [prompt, setPrompt] = useState('A sleek chrome hypercar gliding through rain-slicked Tokyo streets at midnight, vibrant holographic neon signs reflecting on wet asphalt, cinematic 35mm anamorphic lens, 8k resolution');
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, artifacts, distorted limbs, flickering, cartoonish, oversaturated watermark');
  const [selectedModel, setSelectedModel] = useState(INITIAL_MODELS[0]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9');
  const [selectedDuration, setSelectedDuration] = useState('8s');
  const [selectedFps, setSelectedFps] = useState(60);
  const [motionStrength, setMotionStrength] = useState(7.5);
  const [cameraPreset, setCameraPreset] = useState('pan-right');
  const [activeStylePreset, setActiveStylePreset] = useState(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000000));
  const [cfgScale, setCfgScale] = useState(7.5);

  // Generation Pipeline Progress State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [generationEta, setGenerationEta] = useState(0);
  const [activeGeneratedVideo, setActiveGeneratedVideo] = useState(null);

  // Lightbox / Modal States
  const [activeLightboxVideo, setActiveLightboxVideo] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [isPromptAssistantOpen, setIsPromptAssistantOpen] = useState(false);
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Global Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Showcase');

  // Persist State
  useEffect(() => {
    localStorage.setItem('bhideo_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('bhideo_user_creations', JSON.stringify(userCreations));
  }, [userCreations]);

  useEffect(() => {
    localStorage.setItem('bhideo_community_videos', JSON.stringify(communityVideos));
  }, [communityVideos]);

  // Show Toast Helper
  const showToast = (title, message, type = 'info') => {
    setToastMessage({ title, message, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Generate Video Simulation Pipeline
  const startVideoGeneration = () => {
    if (!prompt.trim()) {
      showToast('Prompt Required', 'Please enter a prompt to generate your AI video.', 'error');
      return;
    }

    const creditCost = selectedModel.creditCost;
    if (user.credits < creditCost) {
      showToast('Insufficient Credits', `You need ${creditCost} credits for ${selectedModel.name}. Please recharge or upgrade.`, 'warning');
      setIsUpgradeModalOpen(true);
      return;
    }

    // Deduct credits
    setUser(prev => ({
      ...prev,
      credits: prev.credits - creditCost,
      stats: {
        ...prev.stats,
        videosGenerated: prev.stats.videosGenerated + 1,
        renderTimeSavedHours: +(prev.stats.renderTimeSavedHours + 0.4).toFixed(1)
      }
    }));

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStage('Initializing Dual Text Encoders (CLIP + T5-XXL)...');
    setGenerationEta(8);

    // Dynamic theme derivation
    const pLower = prompt.toLowerCase();
    let theme = 'generic';
    if (pLower.includes('cyber') || pLower.includes('neon') || pLower.includes('tokyo') || pLower.includes('rain') || pLower.includes('car')) theme = 'cyberpunk';
    else if (pLower.includes('space') || pLower.includes('star') || pLower.includes('galaxy') || pLower.includes('astron') || pLower.includes('singularity')) theme = 'space';
    else if (pLower.includes('temple') || pLower.includes('forest') || pLower.includes('bioluminescent') || pLower.includes('plant') || pLower.includes('moss')) theme = 'temple';
    else if (pLower.includes('anime') || pLower.includes('ghibli') || pLower.includes('cloud') || pLower.includes('sky') || pLower.includes('sunset')) theme = 'anime';
    else if (pLower.includes('fluid') || pLower.includes('gold') || pLower.includes('liquid') || pLower.includes('splash') || pLower.includes('water')) theme = 'fluid';

    const stages = [
      { progress: 15, stage: 'Text Tokenization & Multimodal Latent Projection...', eta: 7 },
      { progress: 35, stage: '3D Latent Spatio-Temporal Noise Injection (Seed ' + seed + ')...', eta: 5 },
      { progress: 65, stage: 'Cross-Attention Temporal Flow Denoising (Step 32/50)...', eta: 3 },
      { progress: 85, stage: '4K Latent Super-Resolution & Motion Vector Alignment...', eta: 2 },
      { progress: 95, stage: 'Neural Frame Interpolation & 60FPS Render Encoding...', eta: 1 },
      { progress: 100, stage: 'Synthesis Complete! Loading Master Output...', eta: 0 }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < stages.length) {
        setGenerationProgress(stages[currentStep].progress);
        setGenerationStage(stages[currentStep].stage);
        setGenerationEta(stages[currentStep].eta);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsGenerating(false);

        const newVideo = {
          id: `gen-${Date.now()}`,
          title: prompt.slice(0, 42) + '...',
          prompt: prompt,
          negativePrompt: negativePrompt,
          model: selectedModel.name,
          modelId: selectedModel.id,
          aspectRatio: selectedAspectRatio,
          duration: selectedDuration,
          fps: selectedFps,
          resolution: selectedModel.resolution,
          seed: seed,
          motionScore: motionStrength,
          camera: cameraPreset,
          author: {
            name: user.name,
            handle: user.handle,
            avatar: user.avatar,
            badge: user.tier.toUpperCase()
          },
          likes: 1,
          views: 1,
          category: 'My Generations',
          theme: theme,
          isLiked: true,
          createdAt: 'Just now',
          status: 'completed'
        };

        setActiveGeneratedVideo(newVideo);
        setUserCreations(prev => [newVideo, ...prev]);
        setCommunityVideos(prev => [newVideo, ...prev]);
        showToast('Video Synthesized!', `Your 4K AI video was created successfully with ${selectedModel.name}.`, 'success');
        
        // Regenerate seed for next generation
        setSeed(Math.floor(Math.random() * 1000000000));
      }
    }, 1100);
  };

  // Magic Prompt Enhancer with Cinema Terms
  const enhancePrompt = () => {
    if (!prompt.trim()) {
      showToast('Enter Text First', 'Please write a base prompt before enhancing.', 'info');
      return;
    }

    const cinematicKeywords = [
      'cinematic 35mm anamorphic lens, Panavision Ultra Prime, color graded DaVinci Resolve',
      '8k photorealistic volumetric atmospheric lighting, Unreal Engine 5 Octane render',
      'golden hour volumetric dust motes, ultra-high dynamic range (HDR), hyper-detailed textures',
      'shallow depth of field, f/1.4 aperture, bokeh reflections, zero motion blur distortion',
      'masterpiece IMAX 70mm cinematography, intricate micro-details, hyper-realistic'
    ];

    const randomAddition = cinematicKeywords[Math.floor(Math.random() * cinematicKeywords.length)];
    if (!prompt.includes('cinematic') && !prompt.includes('8k')) {
      setPrompt(prev => `${prev.trim()}, ${randomAddition}`);
      showToast('Prompt Enhanced! ✨', 'Added cinematic lens, lighting, and 8k render parameters.', 'success');
    } else {
      showToast('Prompt Already Polished', 'Your prompt already includes cinematic enhancements.', 'info');
    }
  };

  // Apply Random Prompt Inspiration
  const setRandomInspiration = () => {
    const randomItem = INSPIRATION_PROMPTS[Math.floor(Math.random() * INSPIRATION_PROMPTS.length)];
    setPrompt(randomItem.prompt);
    setSelectedAspectRatio(randomItem.aspectRatio);
    const matchedModel = INITIAL_MODELS.find(m => m.name === randomItem.model) || INITIAL_MODELS[0];
    setSelectedModel(matchedModel);
    showToast('Inspiration Loaded', `Loaded: "${randomItem.title}"`, 'info');
  };

  // Like video handler
  const toggleLikeVideo = (videoId) => {
    setCommunityVideos(prev =>
      prev.map(v => {
        if (v.id === videoId) {
          const isLiked = !v.isLiked;
          return {
            ...v,
            isLiked,
            likes: isLiked ? v.likes + 1 : v.likes - 1
          };
        }
        return v;
      })
    );
  };

  // Remix Prompt Handler (Loads into Prompt Studio and navigates to Studio)
  const remixPrompt = (video) => {
    setPrompt(video.prompt);
    if (video.negativePrompt) setNegativePrompt(video.negativePrompt);
    if (video.aspectRatio) setSelectedAspectRatio(video.aspectRatio);
    if (video.fps) setSelectedFps(video.fps);
    const matched = INITIAL_MODELS.find(m => m.id === video.modelId || m.name === video.model);
    if (matched) setSelectedModel(matched);
    
    // Switch to studio view or scroll to studio
    setCurrentView('studio');
    showToast('Prompt Remixed! 🎬', 'Loaded model parameters, camera style, and prompt into studio.', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Copy Prompt to Clipboard
  const copyPrompt = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to Clipboard!', 'Prompt copied. Ready to paste.', 'success');
  };

  // Auth Handlers
  const handleLogin = (email, password) => {
    setIsAuthenticated(true);
    setUser(prev => ({
      ...prev,
      email: email || prev.email,
    }));
    setIsAuthModalOpen(false);
    showToast('Welcome back!', `Signed in as ${user.name}`, 'success');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    showToast('Signed Out', 'You have been signed out successfully.', 'info');
  };

  const upgradePlan = (plan) => {
    setUser(prev => ({
      ...prev,
      tier: plan.name,
      credits: prev.credits + (plan.id === 'studio' ? 3500 : plan.id === 'creator' ? 1000 : 500)
    }));
    setIsUpgradeModalOpen(false);
    showToast('Plan Upgraded! 🚀', `You are now subscribed to ${plan.name}. Credits added.`, 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        user,
        setUser,
        isAuthenticated,
        setIsAuthenticated,
        communityVideos,
        userCreations,
        prompt,
        setPrompt,
        negativePrompt,
        setNegativePrompt,
        selectedModel,
        setSelectedModel,
        selectedAspectRatio,
        setSelectedAspectRatio,
        selectedDuration,
        setSelectedDuration,
        selectedFps,
        setSelectedFps,
        motionStrength,
        setMotionStrength,
        cameraPreset,
        setCameraPreset,
        activeStylePreset,
        setActiveStylePreset,
        seed,
        setSeed,
        cfgScale,
        setCfgScale,
        isGenerating,
        generationProgress,
        generationStage,
        generationEta,
        activeGeneratedVideo,
        setActiveGeneratedVideo,
        startVideoGeneration,
        enhancePrompt,
        setRandomInspiration,
        toggleLikeVideo,
        remixPrompt,
        copyPrompt,
        activeLightboxVideo,
        setActiveLightboxVideo,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        isPromptAssistantOpen,
        setIsPromptAssistantOpen,
        isApiKeysModalOpen,
        setIsApiKeysModalOpen,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
        toastMessage,
        showToast,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        handleLogin,
        handleLogout,
        upgradePlan,
        models: INITIAL_MODELS,
        pricingPlans: PRICING_PLANS
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
