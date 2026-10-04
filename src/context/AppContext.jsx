import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  INITIAL_MODELS, 
  INITIAL_COMMUNITY_VIDEOS, 
  MOCK_USER, 
  PRICING_PLANS,
  INSPIRATION_PROMPTS 
} from '../data/mockData';
import { readJSON, writeJSON } from '../utils/safeStorage';
import { createApiKeyRecord, withoutApiKey } from '../utils/apiKeys';
import { inferPromptTheme } from '../utils/videoRecorder';
import { deleteVideoBlob, getVideoBlob, saveVideoBlob } from '../utils/videoStorage';

const AppContext = createContext();

// A user object persisted by an older version (or hand-edited in devtools) may
// be missing nested fields such as `stats` or `apiKeys`. Merging over the
// defaults keeps every screen safe from `cannot read property of undefined`.
const normalizeUser = (saved) => {
  if (!saved || typeof saved !== 'object') return MOCK_USER;
  return {
    ...MOCK_USER,
    ...saved,
    stats: { ...MOCK_USER.stats, ...(saved.stats || {}) },
    apiKeys: Array.isArray(saved.apiKeys) ? saved.apiKeys : MOCK_USER.apiKeys,
  };
};

const normalizeVideos = (saved, fallback) =>
  Array.isArray(saved) ? saved.filter((v) => v && typeof v === 'object' && v.id) : fallback;

export const AppProvider = ({ children }) => {
  // Navigation & Page routing
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'studio' | 'showcase' | 'models' | 'profile' | 'pricing' | 'docs'
  
  // User Authentication State
  const [user, setUser] = useState(() => normalizeUser(readJSON('bhideo_user', MOCK_USER)));
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Community Videos & User Creations
  const [communityVideos, setCommunityVideos] = useState(
    () => normalizeVideos(readJSON('bhideo_community_videos', null), INITIAL_COMMUNITY_VIDEOS)
  );

  const [userCreations, setUserCreations] = useState(() => {
    const saved = normalizeVideos(readJSON('bhideo_user_creations', null), null);
    if (saved) return saved;
    return [
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
  const [videoAssets, setVideoAssets] = useState({});
  const videoAssetsRef = useRef(videoAssets);

  useEffect(() => {
    videoAssetsRef.current = videoAssets;
  }, [videoAssets]);

  // Load saved video files from IndexedDB. Metadata stays in localStorage, but
  // video blobs belong in IndexedDB so an 8-second clip cannot exhaust the
  // browser's small localStorage quota.
  useEffect(() => {
    let isMounted = true;
    const savedVideos = Array.from(new Map(
      [...userCreations, ...communityVideos]
        .filter((video) => video?.assetId)
        .map((video) => [video.assetId, video])
    ).values());

    Promise.all(savedVideos.map(async (video) => [video.assetId, await getVideoBlob(video.assetId)]))
      .then((entries) => {
        if (!isMounted || typeof URL === 'undefined' || !URL.createObjectURL) return;
        setVideoAssets((previous) => {
          const next = { ...previous };
          entries.forEach(([assetId, blob]) => {
            if (!blob || next[assetId]) return;
            next[assetId] = {
              url: URL.createObjectURL(blob),
              mimeType: blob.type || 'video/webm',
              extension: (blob.type || '').includes('mp4') ? 'mp4' : 'webm',
            };
          });
          return next;
        });
      })
      .catch(() => {
        // The gallery falls back to its procedural preview when a saved asset
        // is unavailable; a storage read should never break the app shell.
      });

    return () => {
      isMounted = false;
    };
    // These arrays are the initial persisted library. New renders register
    // their Blob URL directly when generation completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Release object URLs when the app provider is removed.
  useEffect(() => () => {
    Object.values(videoAssetsRef.current).forEach((asset) => {
      if (asset?.url && typeof URL !== 'undefined') URL.revokeObjectURL(asset.url);
    });
  }, []);

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
    writeJSON('bhideo_user', user);
  }, [user]);

  useEffect(() => {
    writeJSON('bhideo_user_creations', userCreations);
  }, [userCreations]);

  useEffect(() => {
    writeJSON('bhideo_community_videos', communityVideos);
  }, [communityVideos]);

  // Show Toast Helper
  const toastTimerRef = useRef(null);
  const showToast = (title, message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage({ title, message, type, id: Date.now() });
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 4000);
  };

  const clearToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
    setToastMessage(null);
  };

  // Render progress and toast timers are cleaned up with the provider.
  const generationTimerRef = useRef(null);
  const isGeneratingRef = useRef(false);
  useEffect(() => () => {
    if (generationTimerRef.current) clearInterval(generationTimerRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    isGeneratingRef.current = false;
  }, []);

  // Capture the live scene into an actual video Blob. The canvas recorder is
  // supplied by PromptStudio; credits are charged only after a non-empty video
  // file has been produced successfully.
  const startVideoGeneration = async (renderVideo) => {
    if (isGeneratingRef.current) return;

    const promptSnapshot = prompt.trim();
    if (!promptSnapshot) {
      showToast('Prompt Required', 'Please enter a prompt before rendering a video.', 'error');
      return;
    }

    const modelSnapshot = selectedModel;
    const creditCost = Math.max(0, Number(modelSnapshot?.creditCost) || 0);
    if ((Number(user?.credits) || 0) < creditCost) {
      showToast('Insufficient Credits', `You need ${creditCost} credits for ${modelSnapshot.name}. Please recharge or upgrade.`, 'warning');
      setIsUpgradeModalOpen(true);
      return;
    }

    if (typeof renderVideo !== 'function') {
      showToast('Video Renderer Not Ready', 'Open the studio again and retry the render.', 'error');
      return;
    }

    const durationSeconds = Math.max(1, parseInt(selectedDuration, 10) || 8);
    const fps = Math.max(1, Number(selectedFps) || 24);
    const startedAt = Date.now();
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStage('Preparing prompt and scene settings...');
    setGenerationEta(durationSeconds);

    const updateProgress = (rawProgress) => {
      const progress = Math.max(0, Math.min(99, Math.floor(Number(rawProgress) || 0)));
      const stage = progress < 5
        ? 'Preparing prompt-themed scene...'
        : progress < 88
          ? 'Rendering animated video frames in your browser...'
          : 'Encoding and finalizing the video file...';
      const elapsed = (Date.now() - startedAt) / 1000;
      setGenerationProgress(progress);
      setGenerationStage(stage);
      setGenerationEta(Math.max(0, Math.ceil(durationSeconds - elapsed)));
    };

    if (generationTimerRef.current) clearInterval(generationTimerRef.current);
    generationTimerRef.current = setInterval(() => {
      updateProgress(Math.min(99, ((Date.now() - startedAt) / (durationSeconds * 1000)) * 100));
    }, 500);

    try {
      const output = await renderVideo({
        durationSeconds,
        fps,
        onProgress: updateProgress,
      });
      if (!output?.blob || output.blob.size === 0) {
        throw new Error('The browser returned an empty video file. Please try again.');
      }
      if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
        throw new Error('This browser cannot open the rendered video file.');
      }

      const id = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const assetId = id;
      const videoUrl = URL.createObjectURL(output.blob);
      const title = promptSnapshot.length > 60 ? `${promptSnapshot.slice(0, 60).trim()}…` : promptSnapshot;
      const newVideo = {
        id,
        assetId,
        title,
        prompt: promptSnapshot,
        negativePrompt,
        model: modelSnapshot.name,
        modelId: modelSnapshot.id,
        aspectRatio: selectedAspectRatio,
        duration: selectedDuration,
        durationSeconds,
        fps,
        resolution: `${output.width}×${output.height} (Browser Render)`,
        seed,
        motionScore: motionStrength,
        camera: cameraPreset,
        author: {
          name: user.name,
          handle: user.handle,
          avatar: user.avatar,
          badge: String(user.tier || 'Creator').toUpperCase(),
        },
        likes: 1,
        views: 1,
        category: 'My Generations',
        theme: inferPromptTheme(promptSnapshot),
        isLiked: true,
        createdAt: 'Just now',
        status: 'completed',
        mimeType: output.mimeType,
        fileExtension: output.extension,
      };

      // Keep a session URL for the player and persist the Blob separately from
      // localStorage so the actual clip remains available after a reload.
      setVideoAssets((previous) => ({
        ...previous,
        [assetId]: {
          url: videoUrl,
          mimeType: output.mimeType,
          extension: output.extension,
        },
      }));
      await saveVideoBlob(assetId, output.blob);

      setGenerationProgress(100);
      setGenerationStage('Video file ready.');
      setGenerationEta(0);
      setUser((previous) => ({
        ...previous,
        credits: Math.max(0, (Number(previous.credits) || 0) - creditCost),
        stats: {
          ...MOCK_USER.stats,
          ...(previous.stats || {}),
          videosGenerated: (Number(previous.stats?.videosGenerated) || 0) + 1,
          renderTimeSavedHours: +((Number(previous.stats?.renderTimeSavedHours) || 0) + 0.4).toFixed(1),
        },
      }));
      setActiveGeneratedVideo(newVideo);
      setUserCreations((previous) => [newVideo, ...previous]);
      setCommunityVideos((previous) => [newVideo, ...previous]);
      showToast('Video Ready', `Your ${durationSeconds}s ${output.extension.toUpperCase()} clip is ready to play and download.`, 'success');
      setSeed(Math.floor(Math.random() * 1_000_000_000));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The browser could not render this video.';
      setGenerationStage('Render failed. No credits were charged.');
      showToast('Video Render Failed', `${message} No credits were charged.`, 'error');
    } finally {
      if (generationTimerRef.current) clearInterval(generationTimerRef.current);
      generationTimerRef.current = null;
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
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

  // Delete a creation from the personal library (and the community feed).
  // Previously UserProfile called a `setUserCreations` that was never exposed
  // by this provider, so pressing delete threw "setUserCreations is not a
  // function" inside an event handler and React tore down the entire tree,
  // leaving a blank page.
  const deleteCreation = (videoId) => {
    const video = [...userCreations, ...communityVideos].find((entry) => entry.id === videoId);
    const assetId = video?.assetId || videoId;
    const existingAsset = videoAssetsRef.current[assetId];
    if (existingAsset?.url && typeof URL !== 'undefined') URL.revokeObjectURL(existingAsset.url);
    setVideoAssets((previous) => {
      const next = { ...previous };
      delete next[assetId];
      return next;
    });
    deleteVideoBlob(assetId);
    setUserCreations((prev) => prev.filter((v) => v.id !== videoId));
    setCommunityVideos((prev) => prev.filter((v) => v.id !== videoId));
    setActiveGeneratedVideo((prev) => (prev && prev.id === videoId ? null : prev));
    setActiveLightboxVideo((prev) => (prev && prev.id === videoId ? null : prev));
  };

  // Keep API-key edits in the shared user state so the profile and key modal
  // stay in sync immediately, without requiring a page refresh.
  const createApiKey = (name) => {
    const apiKey = createApiKeyRecord(name);
    if (!apiKey) return null;

    setUser((previous) => ({
      ...previous,
      apiKeys: [apiKey, ...(Array.isArray(previous.apiKeys) ? previous.apiKeys : [])],
    }));
    return apiKey;
  };

  const revokeApiKey = (keyId) => {
    if (!keyId) return;
    setUser((previous) => {
      const currentKeys = Array.isArray(previous.apiKeys) ? previous.apiKeys : [];
      const nextKeys = withoutApiKey(currentKeys, keyId);
      return nextKeys === currentKeys ? previous : { ...previous, apiKeys: nextKeys };
    });
  };

  // One-time credit packs (never expire).
  const purchaseCredits = (amount) => {
    setUser((prev) => ({
      ...prev,
      credits: prev.credits + amount,
      maxCredits: Math.max(prev.maxCredits || 0, prev.credits + amount),
    }));
    setIsUpgradeModalOpen(false);
    showToast('Credits Added! ⚡', `${amount} compute credits were added to your balance.`, 'success');
  };

  // Copy Prompt to Clipboard
  // `navigator.clipboard` is undefined on insecure origins and in some
  // embedded/iframe contexts, so fall back to a hidden textarea instead of
  // throwing inside the click handler.
  const copyToClipboard = (text) => {
    const value = String(text ?? '');
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      /* fall through to the legacy path */
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  };

  const copyPrompt = (text) => {
    const copied = copyToClipboard(text);
    if (copied) {
      showToast('Copied to Clipboard!', 'Prompt copied. Ready to paste.', 'success');
    } else {
      showToast('Copy Failed', 'Your browser blocked clipboard access.', 'warning');
    }
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

  const PLAN_CREDITS = { studio: 3500, creator: 1000, enterprise: 10000 };

  const upgradePlan = (plan) => {
    const bonus = PLAN_CREDITS[plan?.id] ?? 500;
    setUser(prev => {
      const credits = prev.credits + bonus;
      return {
        ...prev,
        tier: plan.name,
        credits,
        maxCredits: Math.max(prev.maxCredits || 0, credits),
      };
    });
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
        setCommunityVideos,
        userCreations,
        setUserCreations,
        deleteCreation,
        createApiKey,
        revokeApiKey,
        purchaseCredits,
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
        videoAssets,
        startVideoGeneration,
        enhancePrompt,
        setRandomInspiration,
        toggleLikeVideo,
        remixPrompt,
        copyToClipboard,
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
        clearToast,
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
