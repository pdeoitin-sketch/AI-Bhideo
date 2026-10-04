import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, X, ArrowRight, Wand2, Copy, Check, Film, Camera } from 'lucide-react';

export const AiPromptAssistant = () => {
  const { 
    isPromptAssistantOpen, 
    setIsPromptAssistantOpen, 
    setPrompt, 
    setSelectedModel, 
    setSelectedAspectRatio,
    models,
    showToast,
    setCurrentView 
  } = useApp();

  const [inputIdea, setInputIdea] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [generatedOptions, setGeneratedOptions] = useState([]);

  if (!isPromptAssistantOpen) return null;

  const handleGenerateDirectorPrompts = () => {
    if (!inputIdea.trim()) {
      showToast('Idea Required', 'Please enter a rough scene concept.', 'warning');
      return;
    }

    setIsExpanding(true);

    setTimeout(() => {
      setIsExpanding(false);
      const idea = inputIdea.trim();

      const options = [
        {
          id: 1,
          style: 'Cinematic Widescreen (35mm Panavision)',
          prompt: `A hyper-detailed cinematic sequence featuring ${idea}, shot on 35mm Panavision anamorphic lens, warm golden hour backlighting, subtle atmospheric volumetric haze, shallow depth of field with creamy bokeh, DaVinci Resolve color grading, 8k resolution master.`,
          aspectRatio: '2.39:1',
          model: 'Bhideo Cinema v3',
          camera: 'Dolly Zoom In 🔍'
        },
        {
          id: 2,
          style: 'Cyberpunk Neon & Volumetric Atmosphere',
          prompt: `Futuristic cyberpunk reimagining of ${idea}, illuminated by radiant cyan and magenta holographic neon advertisements, wet reflective asphalt streets, volumetric steam plumes, Blade Runner 2049 mood, Unreal Engine 5 Octane render, ultra-crisp 4k textures.`,
          aspectRatio: '16:9',
          model: 'Bhideo Motion Pro',
          camera: 'Orbit 360° 🔄'
        },
        {
          id: 3,
          style: 'Makoto Shinkai Anime Aesthetic',
          prompt: `Stunning hand-painted anime aesthetic depiction of ${idea}, Makoto Shinkai vibrant sky with towering cumulonimbus clouds, warm pastel sunset glow reflecting on crystal clear waters, ethereal floating light particles, Studio Ghibli masterwork.`,
          aspectRatio: '16:9',
          model: 'Bhideo Anime-X',
          camera: 'Tilt Up ↑'
        }
      ];

      setGeneratedOptions(options);
      showToast('Director Prompts Ready ✨', 'Generated 3 cinematic variations.', 'success');
    }, 900);
  };

  const handleApplyToStudio = (opt) => {
    setPrompt(opt.prompt);
    setSelectedAspectRatio(opt.aspectRatio);
    const matched = models.find(m => m.name === opt.model);
    if (matched) setSelectedModel(matched);
    
    setIsPromptAssistantOpen(false);
    setCurrentView('studio');
    showToast('Applied to Video Studio!', 'Prompt and camera parameters set.', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className="fixed inset-0 bright-modal-overlay z-50 flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) setIsPromptAssistantOpen(false);
      }}
    >
      <div
        className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in space-y-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-assistant-title"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-cyan flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="prompt-assistant-title" className="text-lg font-bold text-white">AI Director Co-Pilot</h3>
              <p className="text-xs text-slate-400">Transform raw concepts into award-winning cinematic prompt recipes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPromptAssistantOpen(false)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-200">
            Describe your raw idea in plain English:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputIdea}
              onChange={(e) => setInputIdea(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateDirectorPrompts()}
              placeholder="e.g. A flying sports car flying over a glowing crystal mountain at night..."
              className="flex-1 bg-dark-900 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              disabled={isExpanding}
              onClick={handleGenerateDirectorPrompts}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shrink-0"
            >
              {isExpanding ? <Wand2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isExpanding ? 'Directing...' : 'Direct Prompt'}</span>
            </button>
          </div>
        </div>

        {/* Results */}
        {generatedOptions.length > 0 && (
          <div className="space-y-4 pt-2">
            <p className="text-xs font-semibold text-slate-300">Choose a Cinematic Director Style:</p>
            
            <div className="space-y-3">
              {generatedOptions.map((opt) => (
                <div 
                  key={opt.id}
                  className="p-4 rounded-2xl bg-dark-900/90 border border-white/10 hover:border-brand-500/50 transition-all space-y-2 text-left group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-300">{opt.style}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                      {opt.model} • {opt.aspectRatio}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {opt.prompt}
                  </p>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => handleApplyToStudio(opt)}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-brand-500/20 transition-all"
                    >
                      <span>Load into Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
