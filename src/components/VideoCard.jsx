import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Heart, 
  Sparkles, 
  Maximize2, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  Film, 
  Share2, 
  Sliders,
  Flame
} from 'lucide-react';
import { ProceduralVideoEngine } from '../utils/proceduralVideoGenerator';

export const VideoCard = ({ video }) => {
  const { toggleLikeVideo, remixPrompt, copyPrompt, setActiveLightboxVideo, showToast } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 640;
      canvas.height = 360;

      const engine = new ProceduralVideoEngine(canvas, video.theme || 'cyberpunk', {
        fps: video.fps || 60,
        duration: parseInt(video.duration) || 8,
        motionStrength: video.motionScore || 7.5,
        cameraPreset: video.camera || 'static'
      });

      // Render first static frame
      engine.render(performance.now());
      engineRef.current = engine;
    }

    return () => {
      if (engineRef.current) engineRef.current.destroy();
    };
  }, [video]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (engineRef.current) {
      engineRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (engineRef.current) {
      engineRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    copyPrompt(video.prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRemix = (e) => {
    e.stopPropagation();
    remixPrompt(video);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    toggleLikeVideo(video.id);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin + '?vid=' + video.id);
    showToast('Link Copied!', `Share link for "${video.title}" copied to clipboard.`, 'success');
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => setActiveLightboxVideo(video)}
      className="glass-card glass-card-hover rounded-2xl overflow-hidden cursor-pointer group flex flex-col justify-between border border-white/10 relative"
    >
      {/* Video Canvas Container */}
      <div className="relative aspect-video w-full bg-dark-900 overflow-hidden">
        
        <canvas 
          ref={canvasRef} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-dark-950/80 backdrop-blur-md text-[10px] font-mono font-bold text-brand-300 border border-brand-500/30">
            {video.model}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-dark-950/80 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10">
            {video.duration} • {video.fps}FPS
          </span>
        </div>

        {/* Play indicator overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-black/20">
          <div className="w-10 h-10 rounded-full bg-brand-500/90 text-white flex items-center justify-center shadow-lg shadow-brand-500/50">
            <Play className="w-4 h-4 ml-0.5" />
          </div>
        </div>

        {/* Hover Quick Action Buttons */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={handleRemix}
            className="p-1.5 rounded-lg bg-dark-900/90 hover:bg-brand-500 text-slate-200 hover:text-white border border-white/10 text-xs transition-colors shadow-lg"
            title="Remix prompt in Studio"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-dark-900/90 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10 text-xs transition-colors shadow-lg"
            title="Copy prompt"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg bg-dark-900/90 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10 text-xs transition-colors shadow-lg"
            title="Share video"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content & Metadata */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        
        <div>
          <h3 className="font-semibold text-sm text-white group-hover:text-brand-300 transition-colors line-clamp-1">
            {video.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
            {video.prompt}
          </p>
        </div>

        {/* Card Footer: Author & Likes */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          
          <div className="flex items-center gap-2">
            <img 
              src={video.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'} 
              alt={video.author?.name || 'Creator'} 
              className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20"
            />
            <span className="text-[11px] font-medium text-slate-300 truncate max-w-[100px]">
              {video.author?.name || 'Anonymous'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-xs transition-colors ${
                video.isLiked ? 'text-pink-400 font-semibold' : 'text-slate-400 hover:text-pink-400'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${video.isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
              <span>{video.likes}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
