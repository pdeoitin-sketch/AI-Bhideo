import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Heart, 
  Share2, 
  Maximize2, 
  Film, 
  Camera, 
  Cpu, 
  Layers, 
  Flame, 
  ChevronRight,
  FastForward
} from 'lucide-react';
import { ProceduralVideoEngine } from '../utils/proceduralVideoGenerator';
import { downloadVideoAsset, getCanvasDimensions, recordCanvasVideo } from '../utils/videoRecorder';

export const VideoLightboxModal = () => {
  const { 
    activeLightboxVideo, 
    setActiveLightboxVideo, 
    remixPrompt, 
    copyPrompt, 
    toggleLikeVideo, 
    showToast,
    videoAssets,
  } = useApp();

  const [isPlaying, setIsPlaying] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const engineRef = useRef(null);

  const video = activeLightboxVideo;
  const videoAsset = video ? videoAssets?.[video.id] : null;

  useEffect(() => {
    if (videoAsset?.url) {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      setIsPlaying(true);
      return undefined;
    }

    if (video && canvasRef.current) {
      const canvas = canvasRef.current;
      const dimensions = getCanvasDimensions(video.aspectRatio || '16:9');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      const engine = new ProceduralVideoEngine(canvas, video.theme || 'generic', {
        prompt: video.prompt,
        fps: video.fps || 60,
        duration: parseInt(video.duration, 10) || 8,
        motionStrength: video.motionScore || 7.5,
        cameraPreset: video.camera || 'static',
      });

      engine.play();
      engineRef.current = engine;
      setIsPlaying(true);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [video, videoAsset?.url]);

  if (!video) return null;

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
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
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      return;
    }
    engineRef.current?.seek(0);
  };

  const handleCopy = () => {
    copyPrompt(video.prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRemix = () => {
    remixPrompt(video);
    setActiveLightboxVideo(null);
  };

  const handleDownload = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      if (videoAsset?.url) {
        const filename = downloadVideoAsset(videoAsset, video.title);
        if (!filename) throw new Error('The browser could not start the video download.');
        showToast('Download Started', `Saving ${filename}`, 'success');
        return;
      }

      if (!canvasRef.current) throw new Error('The video preview is not ready yet.');
      showToast('Recording Video', `Capturing a ${parseInt(video.duration, 10) || 8}-second preview...`, 'info');
      const output = await recordCanvasVideo(canvasRef.current, {
        durationSeconds: parseInt(video.duration, 10) || 8,
        fps: Number(video.fps) || 24,
      });
      const filename = downloadVideoAsset(output, video.title);
      if (!filename) throw new Error('The browser could not start the video download.');
      showToast('Video Download Ready', `Saved ${filename}`, 'success');
    } catch (error) {
      showToast('Video Export Failed', error instanceof Error ? error.message : 'The video could not be exported.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-2 sm:p-6">
      
      {/* Lightbox Container */}
      <div className="glass-panel rounded-3xl border border-white/10 max-w-6xl w-full max-h-[95vh] overflow-y-auto animate-fade-in relative flex flex-col lg:flex-row shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={() => setActiveLightboxVideo(null)}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-dark-950/80 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT: Video Player (7 Cols) */}
        <div className="lg:w-7/12 p-4 sm:p-6 flex flex-col justify-between bg-dark-950/60 border-b lg:border-b-0 lg:border-r border-white/10">
          
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center group">
            {videoAsset?.url ? (
              <video
                ref={videoRef}
                src={videoAsset.url}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
              />
            ) : (
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            )}

            {/* Click to play/pause overlay */}
            <button
              onClick={togglePlayPause}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-brand-500/90 text-white flex items-center justify-center shadow-xl shadow-brand-500/40 group-hover:scale-110 transition-transform">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </div>
            </button>

            {/* Bottom Overlay Specs */}
            <div className="absolute bottom-3 left-3 pointer-events-none">
              <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-mono text-white border border-white/10">
                {video.resolution || '3840×2160 (4K)'} • {video.fps || 60}FPS • {video.duration || '8s'}
              </span>
            </div>
          </div>

          {/* Player controls */}
          <div className="mt-4 flex items-center justify-between">
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
                onClick={handleDownload}
                disabled={isExporting}
                className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-brand-500/20"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Preparing…' : `Download ${videoAsset?.extension?.toUpperCase() || 'Video'}`}</span>
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT: Model Metadata & Remix Actions (5 Cols) */}
        <div className="lg:w-5/12 p-6 flex flex-col justify-between space-y-6">
          
          <div className="space-y-4">
            {/* Title & Author */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {video.model}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Aspect: {video.aspectRatio || '16:9'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">{video.title}</h2>
              
              <div className="flex items-center gap-2 mt-2">
                <img 
                  src={video.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'} 
                  alt={video.author?.name} 
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20"
                />
                <span className="text-xs font-medium text-slate-300">{video.author?.name || 'Creator'}</span>
                <span className="text-[10px] text-slate-500">• {video.createdAt || 'Recent'}</span>
              </div>
            </div>

            {/* Full Prompt Box */}
            <div className="p-4 rounded-2xl bg-dark-900/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>Prompt Specification</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-brand-400 hover:text-brand-300"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{video.prompt}</p>
            </div>

            {/* Negative Prompt if exists */}
            {video.negativePrompt && (
              <div className="p-3 rounded-xl bg-dark-900/60 border border-white/5">
                <p className="text-[10px] font-semibold text-slate-400 mb-0.5">Negative Filter:</p>
                <p className="text-[11px] text-slate-400 line-clamp-2">{video.negativePrompt}</p>
              </div>
            )}

            {/* Model Generation Hyperparameters */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
              <div className="p-2.5 rounded-xl bg-dark-900 border border-white/5">
                <span className="text-[10px] text-slate-500 block">Seed</span>
                <span className="text-slate-200">{video.seed || '74819204'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-dark-900 border border-white/5">
                <span className="text-[10px] text-slate-500 block">Camera Trajectory</span>
                <span className="text-slate-200">{video.camera || 'Pan Right →'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-dark-900 border border-white/5">
                <span className="text-[10px] text-slate-500 block">Motion Score</span>
                <span className="text-slate-200">{video.motionScore || 7.5} / 10</span>
              </div>
              <div className="p-2.5 rounded-xl bg-dark-900 border border-white/5">
                <span className="text-[10px] text-slate-500 block">Community Likes</span>
                <span className="text-pink-400">❤️ {video.likes}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 border-t border-white/10 flex items-center gap-3">
            <button
              onClick={() => toggleLikeVideo(video.id)}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${
                video.isLiked
                  ? 'bg-pink-500/20 border-pink-500/40 text-pink-400'
                  : 'bg-dark-900 border-white/10 text-slate-400 hover:text-pink-400'
              }`}
              title="Like video"
            >
              <Heart className={`w-5 h-5 ${video.isLiked ? 'fill-pink-500' : ''}`} />
            </button>

            <button
              onClick={handleRemix}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan hover:from-brand-500 hover:to-brand-400 text-white font-bold text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Remix Prompt in Studio</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
