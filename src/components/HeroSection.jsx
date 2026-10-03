import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  Play, 
  ArrowRight, 
  Film, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Layers,
  Flame,
  CheckCircle2
} from 'lucide-react';

export const HeroSection = ({ onOpenStudio }) => {
  const { setCurrentView, setPrompt, setRandomInspiration, setIsPromptAssistantOpen, showToast } = useApp();

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
      {/* Background ambient lighting glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-brand-600/20 via-brand-cyan/20 to-brand-pink/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-brand-500/10 blur-[90px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand-cyan/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-dark-900/90 border border-brand-500/30 shadow-lg shadow-brand-500/10 mb-8 backdrop-blur-md animate-float">
          <span className="flex h-2 w-2 rounded-full bg-brand-cyan animate-ping" />
          <span className="text-xs font-semibold text-slate-200">
            Announcing <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-cyan font-bold">AI-Bhideo Cinema v3</span> with 4K Anamorphic DiT
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.12]">
          Turn Simple Words into{' '}
          <span className="gradient-text-neon">
            Cinematic 4K Videos
          </span>{' '}
          in Seconds
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
          AI-Bhideo is a next-generation neural text-to-video diffusion transformer. 
          Generate photorealistic scenes, directed camera motions, and zero-flicker physics with zero VFX overhead.
        </p>

        {/* Action CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => {
              if (onOpenStudio) onOpenStudio();
              else setCurrentView('studio');
            }}
            className="px-7 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan hover:from-brand-500 hover:to-brand-400 text-white font-semibold text-base shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2.5 group"
          >
            <Sparkles className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
            <span>Launch Video Studio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setCurrentView('showcase')}
            className="px-6 py-4 rounded-2xl bg-dark-900/90 hover:bg-dark-850 text-slate-200 hover:text-white border border-white/10 hover:border-brand-500/40 font-semibold text-base backdrop-blur-md transition-all flex items-center gap-2"
          >
            <Film className="w-5 h-5 text-brand-cyan" />
            <span>Explore Community Showcase</span>
          </button>

          <button
            onClick={() => setIsPromptAssistantOpen(true)}
            className="px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-brand-300 hover:text-brand-200 border border-brand-500/20 font-medium text-sm backdrop-blur-md transition-all flex items-center gap-2"
          >
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>AI Director Co-Pilot</span>
          </button>
        </div>

        {/* Fast prompt try buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-500 mr-1">Try prompt:</span>
          <button 
            onClick={() => setRandomInspiration()}
            className="px-3 py-1.5 rounded-lg bg-dark-900/80 hover:bg-brand-500/20 border border-white/10 hover:border-brand-500/40 text-slate-300 hover:text-brand-200 transition-colors"
          >
            🎲 Random Idea
          </button>
          <button 
            onClick={() => {
              setPrompt('A sleek chrome hypercar gliding through rain-slicked Tokyo streets at midnight, vibrant holographic neon signs reflecting on wet asphalt, cinematic 35mm anamorphic lens, 8k resolution');
              setCurrentView('studio');
              if (showToast) showToast('Prompt Loaded', 'Loaded: "Cyberpunk Tokyo Rain"', 'info');
            }}
            className="px-3 py-1.5 rounded-lg bg-dark-900/80 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
          >
            🏎️ Cyberpunk Tokyo Rain
          </button>
          <button 
            onClick={() => {
              setPrompt('First-person POV drifting into a glowing purple and gold supermassive black hole singularity, gravitational lensing bending starlight, interstellar cosmic dust, IMAX 70mm 8k');
              setCurrentView('studio');
              if (showToast) showToast('Prompt Loaded', 'Loaded: "Cosmic Wormhole Singularity"', 'info');
            }}
            className="px-3 py-1.5 rounded-lg bg-dark-900/80 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
          >
            🪐 Cosmic Wormhole Singularity
          </button>
        </div>

        {/* Performance & Feature Stats Ticker */}
        <div className="mt-14 pt-10 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center p-3">
            <p className="font-display font-extrabold text-2xl sm:text-3xl text-white">12.8M+</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Videos Synthesized</p>
          </div>
          <div className="text-center p-3">
            <p className="font-display font-extrabold text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-brand-neon to-brand-400">99.8%</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Temporal Consistency</p>
          </div>
          <div className="text-center p-3">
            <p className="font-display font-extrabold text-2xl sm:text-3xl text-white">4K 60FPS</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Native Super Resolution</p>
          </div>
          <div className="text-center p-3">
            <p className="font-display font-extrabold text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400">&lt; 0.8s</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Turbo Frame Speed</p>
          </div>
        </div>

      </div>
    </section>
  );
};
