import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  Zap, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Copy, 
  Sliders, 
  Camera, 
  Film, 
  Maximize2, 
  Share2, 
  ChevronDown, 
  ChevronUp, 
  Dices, 
  Wand2, 
  Check, 
  Layers, 
  Cpu, 
  FastForward, 
  RefreshCw,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { 
  STYLE_PRESETS, 
  CAMERA_PRESETS, 
  ASPECT_RATIOS 
} from '../data/mockData';
import { ProceduralVideoEngine } from '../utils/proceduralVideoGenerator';
import {
  downloadVideoAsset,
  getCanvasDimensions,
  inferPromptTheme,
  recordCanvasVideo,
} from '../utils/videoRecorder';
import { VideoModelCatalog } from './VideoModelCatalog';
import { GenerationCostBar } from './GenerationCostBar';
import { ProviderAccessPanel } from './ProviderAccessPanel';

export const PromptStudio = () => {
  const {
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
    videoAssets,
    startVideoGeneration,
    startGeneration,
    selectedRoute,
    isRemoteRoute,
    remoteEstimate,
    gatewayInfo,
    enhancePrompt,
    setRandomInspiration,
    copyPrompt,
    remixPrompt,
    setActiveLightboxVideo,
    setIsPromptAssistantOpen,
    models,
    showToast
  } = useApp();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isProviderPanelOpen, setIsProviderPanelOpen] = useState(false);
  const [showNegative, setShowNegative] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isCopied, setIsCopied] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef(null);
  const outputVideoRef = useRef(null);
  const noiseCanvasRef = useRef(null);
  const engineRef = useRef(null);
  const noiseEngineRef = useRef(null);

  const activeVideoAsset = activeGeneratedVideo ? videoAssets[activeGeneratedVideo.id] : null;
  const previewPrompt = prompt;
  const activeTheme = inferPromptTheme(prompt);

  // Initialize the prompt-aware canvas preview. Once a recording exists, play
  // the actual encoded video file instead of leaving the user on a live canvas.
  useEffect(() => {
    if (canvasRef.current) {
      if (engineRef.current) engineRef.current.destroy();

      const canvas = canvasRef.current;
      const dimensions = getCanvasDimensions(selectedAspectRatio);
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      const engine = new ProceduralVideoEngine(canvas, activeTheme, {
        prompt: previewPrompt,
        fps: selectedFps,
        duration: parseInt(selectedDuration, 10) || 8,
        motionStrength,
        cameraPreset,
      });

      engine.play();
      engineRef.current = engine;
      if (!activeVideoAsset?.url) setIsPlaying(true);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [
    activeTheme,
    activeVideoAsset?.url,
    cameraPreset,
    motionStrength,
    previewPrompt,
    selectedAspectRatio,
    selectedDuration,
    selectedFps,
  ]);

  // Handle Latent Noise Canvas during generation
  useEffect(() => {
    let animId;
    if (isGenerating && noiseCanvasRef.current) {
      const canvas = noiseCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = 400;
      canvas.height = 225;

      const renderNoise = () => {
        const imgData = ctx.createImageData(canvas.width, canvas.height);
        const data = imgData.data;
        const progress = generationProgress / 100;

        for (let i = 0; i < data.length; i += 4) {
          const noise = Math.random() * 255;
          // As progress increases, blend noise with theme color
          const blendR = progress * 139 + (1 - progress) * noise;
          const blendG = progress * 92 + (1 - progress) * noise;
          const blendB = progress * 246 + (1 - progress) * noise;

          data[i] = blendR;
          data[i + 1] = blendG;
          data[i + 2] = blendB;
          data[i + 3] = 255;
        }

        ctx.putImageData(imgData, 0, 0);
        animId = requestAnimationFrame(renderNoise);
      };

      renderNoise();
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isGenerating, generationProgress]);

  const togglePlayPause = () => {
    const outputVideo = outputVideoRef.current;
    if (outputVideo) {
      if (isPlaying) {
        outputVideo.pause();
        setIsPlaying(false);
      } else {
        outputVideo.play().then(() => setIsPlaying(true)).catch(() => {
          showToast('Playback Blocked', 'Use the video controls to start playback in your browser.', 'warning');
        });
      }
      return;
    }

    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.pause();
      setIsPlaying(false);
    } else {
      engineRef.current.play();
      setIsPlaying(true);
    }
  };

  const restartPlayback = () => {
    if (outputVideoRef.current) {
      outputVideoRef.current.currentTime = 0;
      outputVideoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      return;
    }
    engineRef.current?.seek(0);
  };

  const handleApplyStylePreset = (preset) => {
    if (activeStylePreset === preset.id) {
      setActiveStylePreset(null);
    } else {
      setActiveStylePreset(preset.id);
      if (!prompt.includes(preset.promptSuffix)) {
        setPrompt(prev => `${prev.trim()}${preset.promptSuffix}`);
        showToast('Style Preset Applied', preset.label, 'info');
      }
    }
  };

  const handleRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000000);
    setSeed(newSeed);
    showToast('Seed Generated', `New Latent Seed: ${newSeed}`, 'info');
  };

  const handleCopyPrompt = () => {
    copyPrompt(prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleGenerateVideo = () => startGeneration(({ durationSeconds, fps, onProgress }) => {
    if (!canvasRef.current) {
      throw new Error('The preview canvas is not ready. Please wait a moment and retry.');
    }
    return recordCanvasVideo(canvasRef.current, { durationSeconds, fps, onProgress });
  });

  const handleDownloadVideo = async () => {
    if (isGenerating || isExporting) return;
    setIsExporting(true);
    try {
      if (activeVideoAsset?.url) {
        const filename = downloadVideoAsset(activeVideoAsset, activeGeneratedVideo?.title);
        if (!filename) throw new Error('The browser could not start the video download.');
        showToast('Download Started', `Saving ${filename}`, 'success');
        return;
      }

      if (!canvasRef.current) throw new Error('The video preview is not ready yet.');
      const durationSeconds = parseInt(selectedDuration, 10) || 8;
      showToast('Recording Video', `Capturing a ${durationSeconds}-second ${selectedAspectRatio} preview...`, 'info');
      const output = await recordCanvasVideo(canvasRef.current, {
        durationSeconds,
        fps: selectedFps,
      });
      const filename = downloadVideoAsset(output, activeGeneratedVideo?.title || `AI-Bhideo-${selectedModel.id}`);
      if (!filename) throw new Error('The browser could not start the video download.');
      showToast('Video Download Ready', `Saved ${filename}`, 'success');
    } catch (error) {
      showToast('Video Export Failed', error instanceof Error ? error.message : 'The video could not be exported.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpscaleTo4K = () => {
    showToast('Upscaling Unavailable', 'No server-side AI upscaler is connected. The downloaded clip uses the selected canvas resolution.', 'info');
  };

  const handleExtendVideo = () => {
    setSelectedDuration('16s');
    showToast('Duration Updated', 'The next render will record a 16-second clip. Generate again to create it.', 'info');
  };

  return (
    <div id="video-studio" className="relative py-8">
      
      {/* Studio Header Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30">
                <Sparkles className="w-4 h-4 text-brand-400" />
              </span>
              <span className="text-xs font-mono font-semibold text-brand-400 uppercase tracking-widest">
                Browser Video Studio
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white">
              Video Render Studio
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Describe your scene, pick a model and API, then export a real playable clip. Free routes render on your own canvas; any route with a key runs the real model through the gateway (fal, Replicate, Cloudflare, Veo, Kling, MiniMax, Runway, self-hosted…).
            </p>
          </div>

          {/* Quick Action Helpers */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setRandomInspiration()}
              className="px-3.5 py-2 rounded-xl bg-dark-900 border border-white/10 hover:border-brand-500/40 text-slate-200 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <Dices className="w-4 h-4 text-brand-cyan" />
              <span>Surprise Me</span>
            </button>

            <button
              onClick={() => setIsPromptAssistantOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-300 hover:text-brand-200 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Wand2 className="w-4 h-4 text-brand-400" />
              <span>AI Director</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio 2-Column Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Prompt Input & Generation Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Primary Prompt Box */}
            <div className="glass-panel p-5 rounded-3xl relative overflow-hidden border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Film className="w-4 h-4 text-brand-400" />
                  <span>Prompt Description</span>
                  <span className="text-[10px] text-slate-500 font-mono">(Text to Video)</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={enhancePrompt}
                    className="px-2.5 py-1 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 text-xs font-medium transition-all flex items-center gap-1.5 group"
                    title="Automatically enhance prompt with cinematic camera, lighting, and 8K keywords"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-400 group-hover:rotate-12 transition-transform" />
                    <span>✨ Magic Enhance</span>
                  </button>

                  <button
                    onClick={handleCopyPrompt}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                    title="Copy prompt"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe a scene (e.g. a chrome hypercar in neon rain, a starship near a violet nebula, or a glowing jellyfish in a deep ocean...)"
                  rows={4}
                  className="w-full bg-dark-900/90 border border-white/10 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/50 resize-y transition-all leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500 font-mono">
                  <span>{prompt.length} characters</span>
                  <span>{prompt.split(/\s+/).filter(Boolean).length} tokens</span>
                </div>
              </div>

              {/* Preset Style Tags */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1">
                  <span>Cinematic Preset Styles:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_PRESETS.map((preset) => {
                    const isActive = activeStylePreset === preset.id || prompt.includes(preset.promptSuffix);
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyStylePreset(preset)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                            : 'bg-dark-900/80 text-slate-300 hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle Negative Prompt */}
              <div className="mt-3">
                <button
                  onClick={() => setShowNegative(!showNegative)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  {showNegative ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>Negative Prompt Filter {showNegative ? '(Expanded)' : '(Add keywords to exclude)'}</span>
                </button>

                {showNegative && (
                  <div className="mt-2 animate-fade-in">
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="Keywords to exclude: blurry, low quality, artifacts, morphing limbs, flickering, watermark..."
                      rows={2}
                      className="w-full bg-dark-900/80 border border-white/10 rounded-xl p-3 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-rose-500/50 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Video model + API catalogue */}
            <VideoModelCatalog />

            <GenerationCostBar onOpenProviderAccess={() => setIsProviderPanelOpen(true)} />
            <ProviderAccessPanel open={isProviderPanelOpen} onClose={() => setIsProviderPanelOpen(false)} />

            {/* Camera Controls & Aspect Ratio Settings */}
            <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-5">
              
              {/* Aspect Ratio Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 mb-3">
                  <Maximize2 className="w-4 h-4 text-cyan-400" />
                  <span>Output Aspect Ratio</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ASPECT_RATIOS.map((ar) => {
                    const isSelected = selectedAspectRatio === ar.id;
                    return (
                      <button
                        key={ar.id}
                        onClick={() => setSelectedAspectRatio(ar.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-brand-500/20 border-brand-500 text-white shadow-md shadow-brand-500/20'
                            : 'bg-dark-900/80 border-white/10 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <p className="text-xs font-bold">{ar.id}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{ar.label.split(' ')[1] || ar.id}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Camera Presets & Motion Strength */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                {/* Camera Presets */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 mb-2">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Camera Director Trajectory</span>
                  </label>
                  <select
                    value={cameraPreset}
                    onChange={(e) => setCameraPreset(e.target.value)}
                    className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    {CAMERA_PRESETS.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration & FPS */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 mb-2">
                    <Film className="w-4 h-4 text-pink-400" />
                    <span>Duration & Framerate</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(e.target.value)}
                      className="w-1/2 bg-dark-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                    >
                      <option value="4s">4 Seconds</option>
                      <option value="8s">8 Seconds</option>
                      <option value="16s">16 Seconds</option>
                    </select>
                    <select
                      value={selectedFps}
                      onChange={(e) => setSelectedFps(Number(e.target.value))}
                      className="w-1/2 bg-dark-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                    >
                      <option value={24}>24 FPS (Cinematic)</option>
                      <option value={60}>60 FPS (Fluid 4K)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Motion Intensity Slider */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-brand-400" />
                    <span>Motion Dynamics Score</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-brand-300">{motionStrength} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={motionStrength}
                  onChange={(e) => setMotionStrength(parseFloat(e.target.value))}
                  className="w-full accent-brand-500 h-1.5 bg-dark-900 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>Subtle & Calm</span>
                  <span>Balanced Kinetic</span>
                  <span>High-Velocity Action</span>
                </div>
              </div>

              {/* Advanced Parameters Accordion (Seed & CFG Scale) */}
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center justify-between w-full py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    Advanced Seed & CFG Guidance Scale
                  </span>
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showAdvanced && (
                  <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    {/* Seed input */}
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 mb-1 block">
                        Latent Noise Seed
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={seed}
                          onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                          className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                        />
                        <button
                          onClick={handleRandomSeed}
                          className="p-2 rounded-xl bg-dark-900 border border-white/10 hover:border-brand-500 text-slate-300 hover:text-white"
                          title="Generate Random Seed"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* CFG Scale */}
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1">
                        <span>CFG Guidance Scale</span>
                        <span className="font-mono text-brand-300">{cfgScale}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.5"
                        value={cfgScale}
                        onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                        className="w-full accent-brand-500 h-1.5 bg-dark-900 rounded-lg cursor-pointer mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* GENERATE VIDEO CTA BUTTON */}
            <div>
              <button
                disabled={isGenerating}
                onClick={handleGenerateVideo}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-base shadow-2xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${
                  isGenerating
                    ? 'bg-dark-800 text-slate-400 cursor-not-allowed border border-white/10'
                    : 'bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan hover:from-brand-500 hover:to-brand-400 text-white shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 text-brand-400 animate-spin" />
                    <span>{isRemoteRoute ? 'Generating on provider' : 'Recording video'}… {generationProgress}%</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
                    <span>{isRemoteRoute ? 'Generate' : 'Render'} with {selectedRoute?.model?.name || selectedModel.name}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-black/30 border border-white/20 text-xs text-amber-300 font-mono">
                      {remoteEstimate && remoteEstimate.usd > 0
                        ? `$${remoteEstimate.usd.toFixed(2)} · ⚡${remoteEstimate.credits}`
                        : remoteEstimate && remoteEstimate.credits > 0
                          ? `free API · ⚡${remoteEstimate.credits} demo`
                          : 'FREE'}
                    </span>
                  </>
                )}
              </button>
            </div>

          </div>

            {/* RIGHT COLUMN: Video Player & Render Progress (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Master Video Display Canvas / Player */}
            <div className="glass-panel p-4 rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative">
              
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-white">Video Output</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300">
                    {activeVideoAsset ? `${activeVideoAsset.extension.toUpperCase()} READY` : 'LIVE PREVIEW'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (activeGeneratedVideo) {
                        setActiveLightboxVideo(activeGeneratedVideo);
                      } else {
                        // Create preview lightbox
                        setActiveLightboxVideo({
                          id: 'preview-active',
                          title: prompt.slice(0, 36) + '...',
                          prompt: prompt,
                          negativePrompt: negativePrompt,
                          model: selectedModel.name,
                          aspectRatio: selectedAspectRatio,
                          duration: selectedDuration,
                          fps: selectedFps,
                          resolution: selectedModel.resolution,
                          seed: seed,
                          motionScore: motionStrength,
                          camera: cameraPreset,
                          theme: activeTheme,
                          author: { name: 'You', handle: '@creator', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80', badge: 'PRO' },
                          likes: 12,
                          views: 84,
                          createdAt: 'Just now'
                        });
                      }
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    title="Fullscreen Lightbox Inspector"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Video player uses the selected aspect ratio for both preview and export. */}
              <div
                className="relative w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10"
                style={{ aspectRatio: selectedAspectRatio.replace(':', ' / '), maxHeight: '70vh' }}
              >
                {activeVideoAsset?.url && (
                  <video
                    ref={outputVideoRef}
                    src={activeVideoAsset.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                )}
                <canvas
                  ref={canvasRef}
                  aria-hidden={Boolean(activeVideoAsset?.url)}
                  className={activeVideoAsset?.url
                    ? 'absolute inset-0 w-full h-full opacity-0 pointer-events-none'
                    : 'w-full h-full object-contain transition-opacity duration-500'}
                />

                {/* Overlaid Live Generation Diffusion Tensor when generating */}
                {isGenerating && (
                  <div className="absolute inset-0 bg-dark-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
                    
                    {/* Live Latent Noise Canvas */}
                    <div className="relative w-48 h-28 rounded-xl overflow-hidden border border-brand-500/50 shadow-lg shadow-brand-500/20 mb-4">
                      <canvas ref={noiseCanvasRef} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-transparent to-transparent flex items-end justify-center pb-1">
                        <span className="text-[10px] font-mono text-brand-300">Browser Video Capture</span>
                      </div>
                    </div>

                    <div className="w-full max-w-xs space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-200">
                        <span>Video Render Progress</span>
                        <span className="text-brand-400 font-mono">{generationProgress}%</span>
                      </div>
                      
                      {/* Animated Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-dark-800 overflow-hidden border border-white/10">
                        <div 
                          className="h-full bg-gradient-to-r from-brand-600 via-brand-cyan to-brand-pink transition-all duration-300"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-400 font-medium truncate pt-1">
                        {generationStage}
                      </p>

                      <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500 font-mono pt-1">
                        <span>ETA: ~{generationEta}s</span>
                        <span>•</span>
                        <span>Renderer: This Browser</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Player Play/Pause Overlay Button */}
                {!isGenerating && (
                  <button
                    onClick={togglePlayPause}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-brand-500/90 text-white flex items-center justify-center shadow-xl shadow-brand-500/40 group-hover:scale-110 transition-transform">
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </div>
                  </button>
                )}

                {/* Overlay Metadata Tag */}
                <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
                  <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10">
                    {activeGeneratedVideo?.resolution?.split(' ')[0] || 'Preview'} • {activeGeneratedVideo?.fps || selectedFps}FPS • {activeGeneratedVideo?.duration || selectedDuration}
                  </span>
                </div>
              </div>

              {/* Player Timeline & Controls */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlayPause}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={restartPlayback}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                    title="Restart"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpscaleTo4K}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>4K Upscale</span>
                  </button>

                  <button
                    onClick={handleExtendVideo}
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>+4s Extend</span>
                  </button>

                  <button
                    onClick={handleDownloadVideo}
                    disabled={isGenerating || isExporting}
                    className="p-2 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white font-medium text-xs shadow-md shadow-brand-500/30 transition-all flex items-center gap-1"
                    title={isExporting ? 'Preparing video download' : 'Download a WebM or MP4 video file'}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

            {/* Generation Metadata Telemetry Card */}
            <div className="glass-panel p-4 rounded-3xl border border-white/10 text-xs space-y-3">
              <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-white/10 pb-2">
                <span>Video Render Details</span>
                <span className="text-[10px] text-emerald-400 font-mono">Status: Ready</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div className="p-2 rounded-xl bg-dark-900/80 border border-white/5">
                  <p className="text-[10px] text-slate-500">Seed</p>
                  <p className="text-slate-200 truncate font-semibold">{seed}</p>
                </div>
                <div className="p-2 rounded-xl bg-dark-900/80 border border-white/5">
                  <p className="text-[10px] text-slate-500">CFG Guidance</p>
                  <p className="text-slate-200 font-semibold">{cfgScale}</p>
                </div>
                <div className="p-2 rounded-xl bg-dark-900/80 border border-white/5">
                  <p className="text-[10px] text-slate-500">Temporal Flow</p>
                  <p className="text-slate-200 font-semibold">{motionStrength} / 10</p>
                </div>
                <div className="p-2 rounded-xl bg-dark-900/80 border border-white/5">
                  <p className="text-[10px] text-slate-500">Camera Preset</p>
                  <p className="text-slate-200 font-semibold capitalize">{cameraPreset}</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
