import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
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
import {
  ALL_ROUTES,
  LOCAL_MODELS,
  PRICE_AS_OF,
  PROVIDER_BY_ID,
  VIDEO_MODELS,
  VIDEO_PROVIDERS,
  cheapestMatchingRoute,
  findRoutes,
  getRoute,
} from '../data/videoProviders';
import {
  costSummary,
  estimateClipCost,
  estimateMonthlyCost,
  formatUsd,
  rankRoutesByCost,
} from '../services/video/costEngine';
import { previewJob } from '../services/video/runner';
import { generateRemote, materialiseVideo, probeGateway, resetGatewayProbeCache } from '../services/video/gatewayClient';
import {
  clearProviderKey,
  loadAccess,
  loadSettings,
  providerStatuses,
  saveProviderKey,
  saveSettings,
} from '../services/video/providerAccess';

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

const ROUTE_EXISTS = (id) => Boolean(getRoute(id));

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
  // Remote video providers. `selectedRouteId` is a (model, provider) pair from
  // the catalogue; local routes render on the canvas, remote ones go through
  // the gateway. Default is the free local profile so the app works with zero
  // configuration.
  const [selectedRouteId, setSelectedRouteId] = useState(() => {
    const saved = readJSON('bhideo_video_route', null);
    return saved && ROUTE_EXISTS(saved) ? saved : 'local-cinema::local';
  });
  const [providerSettings, setProviderSettings] = useState(() => loadSettings());
  const [providerAccess, setProviderAccess] = useState(() => loadAccess());
  const [gatewayInfo, setGatewayInfo] = useState({ probed: false, online: false, configuredProviders: [], error: null });
  const [remoteSpendUsd, setRemoteSpendUsd] = useState(() => Number(readJSON('bhideo_remote_spend_usd', 0)) || 0);
  const [lastRemoteJob, setLastRemoteJob] = useState(null);
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
  const generationAbortRef = useRef(null);
  const isGeneratingRef = useRef(false);
  useEffect(() => () => {
    if (generationAbortRef.current) generationAbortRef.current.abort();
    if (generationTimerRef.current) clearInterval(generationTimerRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    isGeneratingRef.current = false;
  }, []);

  // ---- Video provider catalogue -------------------------------------------
  const selectedRoute = useMemo(() => getRoute(selectedRouteId) || getRoute('local-cinema::local'), [selectedRouteId]);
  const isRemoteRoute = selectedRoute?.protocol !== 'local';
  const remoteEstimate = useMemo(() => {
    if (!selectedRoute) return null;
    const estimate = estimateClipCost(selectedRoute, {
      durationSeconds: parseInt(selectedDuration, 10) || 8,
      resolution: '720p',
      aspectRatio: selectedAspectRatio,
    });
    // Local routes cost nothing upstream, but the demo credit ledger still
    // charges the profile's own rate — keep both numbers visible and honest.
    if (selectedRoute.providerId === 'local') {
      const profile = INITIAL_MODELS.find((model) => model.id === selectedRoute.route.model);
      return { ...estimate, credits: Number(profile?.creditCost) || 0, localCredits: true };
    }
    return estimate;
  }, [selectedRoute, selectedDuration, selectedAspectRatio]);
  const providerCatalog = useMemo(() => providerStatuses(providerAccess, gatewayInfo.configuredProviders || []), [providerAccess, gatewayInfo]);

  const chooseVideoRoute = (routeId) => {
    if (!routeId || !ROUTE_EXISTS(routeId)) {
      showToast('Unknown Model Route', 'That provider route is not in the catalogue.', 'error');
      return;
    }
    setSelectedRouteId(routeId);
    writeJSON('bhideo_video_route', routeId);
    const route = getRoute(routeId);
    // Keep the legacy profile selector in sync so cards and the lightbox still
    // describe the render with a name the rest of the UI understands.
    if (route?.providerId === 'local') {
      const profile = INITIAL_MODELS.find((m) => m.id === route.route.model) || INITIAL_MODELS[0];
      setSelectedModel(profile);
    }
  };

  /** Pick the cheapest route that satisfies the current studio requirements. */
  const useCheapestRoute = (criteria = {}) => {
    const durationSeconds = parseInt(selectedDuration, 10) || 8;
    const route = cheapestMatchingRoute({
      mode: criteria.mode || 't2v',
      needsAudio: criteria.needsAudio,
      resolution: criteria.resolution,
      freeOnly: criteria.freeOnly ?? providerSettings.preferFreeRoutes,
      maxUsdPerSecond: criteria.maxUsdPerSecond,
      ...criteria,
    });
    if (!route) {
      showToast('No Matching Route', 'No provider offers that combination right now — relax a filter.', 'warning');
      return null;
    }
    chooseVideoRoute(route.id);
    const cost = estimateClipCost(route, { durationSeconds, resolution: route.model.capabilities?.resolutions?.[0] });
    showToast(
      'Cheapest Route Selected',
      `${route.model.name} via ${route.provider?.name}: ${cost.usd > 0 ? formatUsd(cost.usd) : 'free'} for a ${durationSeconds}s clip.`,
      'success'
    );
    return route;
  };

  const refreshGatewayStatus = async ({ force = false } = {}) => {
    const probe = await probeGateway({ settings: providerSettings, force });
    setGatewayInfo({ probed: true, ...probe });
    return probe;
  };

  const configureProviderKey = (providerId, values = {}) => {
    saveProviderKey(providerId, values);
    setProviderAccess(loadAccess());
    resetGatewayProbeCache();
    const label = PROVIDER_BY_ID[providerId]?.name || providerId;
    if (values.key || values.accessKey || values.accountId) {
      showToast('Key Saved', `${label} credentials are stored ${values.remember ? 'on this device' : 'for this tab only'}.`, 'success');
    } else {
      showToast('Key Cleared', `${label} credentials were removed from this browser.`, 'info');
    }
  };

  const forgetProviderKey = (providerId) => {
    clearProviderKey(providerId);
    setProviderAccess(loadAccess());
    showToast('Credential Removed', `${PROVIDER_BY_ID[providerId]?.name || providerId} no longer has a local key.`, 'info');
  };

  const updateProviderSettings = (patch = {}) => {
    const next = saveSettings(patch);
    setProviderSettings(next);
    resetGatewayProbeCache();
  };

  // Probe the gateway once on mount so the studio can show remote options
  // honestly (configured / not configured) without the user clicking anything.
  useEffect(() => {
    let cancelled = false;
    refreshGatewayStatus({ force: true }).then((probe) => {
      if (cancelled) return;
      if (probe?.online && probe.configuredProviders?.length) {
        showToast('Video Gateway Detected', `${probe.configuredProviders.length} provider key(s) available for real generation.`, 'success');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [providerSettings.gatewayUrl]);

  // Rough monthly-spend ledger so the budget gauge survives reloads. It is a
  // convenience mirror of the gateway's own accounting, not a billing source.
  const addRemoteSpend = (usd) => {
    const amount = Number(usd) || 0;
    if (amount <= 0) return;
    setRemoteSpendUsd((previous) => {
      const next = +(previous + amount).toFixed(4);
      writeJSON('bhideo_remote_spend_usd', next);
      return next;
    });
  };

  /**
   * Single funnel for every finished clip, local or remote: create the object
   * URL, persist the blob, charge credits, and publish the video everywhere.
   * Returns the generated video record so callers can add provider metadata.
   */
  const adoptRenderedVideo = async ({
    blob,
    url: providedUrl,
    mimeType,
    extension,
    width,
    height,
    source = 'local',
    modelSnapshot,
    durationSeconds,
    fps,
    creditCost = 0,
    remoteMeta = null,
  }) => {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      throw new Error('This browser cannot open the rendered video file.');
    }
    const id = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const assetId = id;
    const videoUrl = providedUrl || URL.createObjectURL(blob);
    const promptSnapshot = prompt.trim();
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
      duration: `${durationSeconds}s`,
      durationSeconds,
      fps,
      resolution: width && height ? `${width}×${height}` : remoteMeta?.resolutionLabel || `${selectedAspectRatio} HD`,
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
      mimeType,
      fileExtension: extension,
      generation: {
        source,
        providerId: remoteMeta?.providerId || 'local',
        providerName: remoteMeta?.providerName || 'AI-Bhideo Local Renderer',
        routeId: remoteMeta?.routeId || 'local',
        protocol: remoteMeta?.protocol || 'local',
        costUsd: remoteMeta?.costUsd || 0,
        creditsCharged: creditCost,
        jobId: remoteMeta?.jobId || null,
        videoUrl: remoteMeta?.videoUrl || null,
        priceAsOf: PRICE_AS_OF,
      },
    };

    setVideoAssets((previous) => ({
      ...previous,
      [assetId]: { url: videoUrl, mimeType: mimeType || 'video/mp4', extension: extension || 'webm' },
    }));
    if (blob) await saveVideoBlob(assetId, blob);

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
    return newVideo;
  };

  /**
   * Real generation through a provider route (gateway or BYOK). Credits are
   * charged from the price estimate only after a playable clip exists, and a
   * missing key/gateway falls back to the free local renderer instead of
   * dead-ending the user.
   */
  const startRemoteGeneration = async (renderVideo) => {
    if (isGeneratingRef.current) return;
    const route = selectedRoute;
    if (!route) {
      showToast('No Model Selected', 'Pick a video model in the catalogue first.', 'error');
      return;
    }

    const durationSeconds = parseInt(selectedDuration, 10) || 8;
    const params = {
      prompt: prompt.trim(),
      negativePrompt,
      durationSeconds,
      aspectRatio: selectedAspectRatio,
      resolution: '720p',
      fps: Number(selectedFps) || 24,
      seed,
      motionScore: motionStrength,
      audio: false,
    };
    const preview = previewJob({
      routeId: route.id,
      params,
      budget: {
        maxUsdPerClip: providerSettings.maxUsdPerClip || undefined,
        monthlyBudgetUsd: providerSettings.monthlyBudgetUsd ? Math.max(0, providerSettings.monthlyBudgetUsd - remoteSpendUsd) : undefined,
      },
    });

    if (!preview.ok) {
      const canFallBack = providerSettings.allowFallbackToLocal && typeof renderVideo === 'function';
      showToast(
        'Remote Generation Blocked',
        `${preview.errors[0]}${canFallBack ? ' Falling back to the free local renderer.' : ''}`,
        canFallBack ? 'warning' : 'error'
      );
      if (canFallBack) await startVideoGeneration(renderVideo, { forceLocal: true });
      return;
    }

    const creditCost = Math.max(0, Number(preview.cost?.credits) || 0);
    if ((Number(user?.credits) || 0) < creditCost) {
      showToast('Insufficient Credits', `This clip is estimated at ${creditCost} credits (${formatUsd(preview.cost.usd)} upstream). Recharge or pick a cheaper route.`, 'warning');
      setIsUpgradeModalOpen(true);
      return;
    }

    preview.warnings.forEach((warning, index) => {
      if (index === 0) showToast('Route Adjusted', warning, 'info');
    });

    isGeneratingRef.current = true;
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStage(`Submitting to ${route.provider?.name || route.providerId}…`);
    setLastRemoteJob({ routeId: route.id, status: 'queued', startedAt: new Date().toISOString(), estimate: preview.cost });

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    generationAbortRef.current = controller;
    const startedAt = Date.now();
    const etaSeconds = Math.max(30, Math.round(durationSeconds * 12));
    setGenerationEta(etaSeconds);

    if (generationTimerRef.current) clearInterval(generationTimerRef.current);
    generationTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setGenerationEta(Math.max(0, etaSeconds - elapsed));
    }, 1000);

    try {
      const result = await generateRemote({
        routeId: route.id,
        params: preview.params,
        settings: providerSettings,
        signal: controller?.signal,
        onProgress: ({ progress, stage }) => {
          setGenerationProgress(Math.max(0, Math.min(99, Math.floor(Number(progress) || 0))));
          if (stage) setGenerationStage(stage);
        },
      });

      setGenerationStage('Fetching the generated clip…');
      const media = await materialiseVideo(result, { settings: providerSettings, signal: controller?.signal });
      const blob = media.blob || (await (media.url ? fetch(media.url).then((r) => r.blob()) : null));
      if ((!blob || blob.size === 0) && !media.url) {
        throw new Error('The provider finished but returned no playable file.');
      }

      const costUsd = Number(result.estimatedUsd) || preview.cost.usd;
      const video = await adoptRenderedVideo({
        blob: blob || null,
        url: media.url,
        mimeType: blob?.type || 'video/mp4',
        extension: (blob?.type || '').includes('webm') ? 'webm' : 'mp4',
        width: result.width,
        height: result.height,
        source: 'remote',
        modelSnapshot: { id: route.modelId, name: `${route.model.name} · ${route.provider?.name || route.providerId}` },
        durationSeconds: result.durationSeconds || preview.params.durationSeconds,
        fps: Number(selectedFps) || 24,
        creditCost,
        remoteMeta: {
          providerId: route.providerId,
          providerName: route.provider?.name,
          routeId: route.id,
          protocol: route.protocol,
          costUsd,
          jobId: result.jobId || null,
          videoUrl: result.originalVideoUrl || result.videoUrl || null,
          resolutionLabel: preview.params.resolution,
        },
      });

      addRemoteSpend(costUsd);
      setLastRemoteJob({
        routeId: route.id,
        status: 'completed',
        finishedAt: new Date().toISOString(),
        costUsd,
        videoId: video.id,
        warnings: preview.warnings,
      });
      showToast(
        'Video Ready',
        `${route.model.name} finished${costUsd > 0 ? ` — ${formatUsd(costUsd)} (est.) charged as ${creditCost} credits` : ' at no cost'}.`,
        'success'
      );
      setSeed(Math.floor(Math.random() * 1_000_000_000));
    } catch (error) {
      const message = error?.message || 'Remote generation failed.';
      setGenerationStage('Generation failed. No credits were charged.');
      setLastRemoteJob((previous) => ({ ...(previous || {}), status: 'failed', error: message }));
      const canFallBack =
        providerSettings.allowFallbackToLocal &&
        typeof renderVideo === 'function' &&
        ['no-gateway', 'missing-key', 'auth'].includes(error?.kind);
      if (canFallBack) {
        showToast('Falling Back to Local Render', `${message} Rendering the free canvas version instead so your prompt is not lost.`, 'warning');
        isGeneratingRef.current = false;
        setIsGenerating(false);
        await startVideoGeneration(renderVideo, { forceLocal: true });
      } else {
        showToast('Remote Generation Failed', `${message} No credits were charged.`, 'error');
      }
    } finally {
      if (generationTimerRef.current) clearInterval(generationTimerRef.current);
      generationTimerRef.current = null;
      isGeneratingRef.current = false;
      setIsGenerating(false);
      generationAbortRef.current = null;
    }
  };

  const cancelRemoteGeneration = () => {
    if (generationAbortRef.current) {
      generationAbortRef.current.abort();
      showToast('Generation Cancelled', 'The provider job may still finish and bill upstream; the local wait loop was stopped.', 'info');
    }
  };

  // Capture the live scene into an actual video Blob. The canvas recorder is
  // supplied by PromptStudio; credits are charged only after a non-empty video
  // file has been produced successfully.
  const startVideoGeneration = async (renderVideo, { forceLocal = false } = {}) => {
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
    setGenerationStage(forceLocal ? 'Preparing free local fallback render…' : 'Preparing prompt and scene settings...');
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
      await adoptRenderedVideo({
        blob: output.blob,
        mimeType: output.mimeType,
        extension: output.extension,
        width: output.width,
        height: output.height,
        source: 'local',
        modelSnapshot: modelSnapshot,
        durationSeconds,
        fps,
        creditCost,
      });
      showToast('Video Ready', `Your ${durationSeconds}s ${(output.extension || 'webm').toUpperCase()} clip is ready to play and download.`, 'success');
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

  /**
   * One entry point for the studio button: local routes render on the canvas,
   * remote routes go through the provider gateway.
   */
  const startGeneration = (renderVideo) => (isRemoteRoute ? startRemoteGeneration(renderVideo) : startVideoGeneration(renderVideo));

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
        pricingPlans: PRICING_PLANS,
        // Video provider catalogue + remote generation
        videoModels: VIDEO_MODELS,
        videoProviders: VIDEO_PROVIDERS,
        videoRoutes: ALL_ROUTES,
        localModels: LOCAL_MODELS,
        selectedRoute,
        selectedRouteId,
        chooseVideoRoute,
        useCheapestRoute,
        isRemoteRoute,
        remoteEstimate,
        providerSettings,
        updateProviderSettings,
        providerAccess,
        providerCatalog,
        configureProviderKey,
        forgetProviderKey,
        gatewayInfo,
        refreshGatewayStatus,
        startRemoteGeneration,
        cancelRemoteGeneration,
        startGeneration,
        lastRemoteJob,
        remoteSpendUsd,
        costSummary,
        estimateClipCost,
        estimateMonthlyCost,
        rankRoutesByCost,
        findRoutes,
        formatUsd,
        priceAsOf: PRICE_AS_OF
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
