import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, ArrowRight, Github, Twitter, Disc as Discord, Shield, Activity, Heart } from 'lucide-react';

export const Footer = () => {
  const { setCurrentView, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    setIsSubscribed(true);
    showToast('Subscribed to AI-Bhideo Dispatch', 'You will receive model updates and research breakthroughs.', 'success');
  };

  return (
    <footer className="border-t border-white/10 bg-dark-950/90 relative overflow-hidden pt-16 pb-12">
      
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-t from-brand-900/10 to-transparent blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          
          {/* Col 1: Brand & Bio (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-cyan to-brand-pink p-[1.5px] shadow-lg shadow-brand-500/20">
                <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                </div>
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight text-white">
                AI-Bhideo
              </span>
            </div>

            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Pioneering 4K multimodal neural video synthesis. Turn text prompts into photorealistic video scenes with zero flicker, causal flow-matching, and camera path directing.
            </p>

            {/* Live Operational Status */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-900 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>GPU Cluster 99.98% Operational (H100 Active)</span>
            </div>
          </div>

          {/* Col 2: AI Models */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">AI Models</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => setCurrentView('models')} className="hover:text-brand-300 transition-colors">
                  Bhideo Cinema v3 (4K)
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('models')} className="hover:text-brand-300 transition-colors">
                  Bhideo Turbo v2.1
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('models')} className="hover:text-brand-300 transition-colors">
                  Bhideo Motion Pro
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('models')} className="hover:text-brand-300 transition-colors">
                  Bhideo Anime-X VFX
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Research & Studio */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">Studio & Research</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => setCurrentView('studio')} className="hover:text-brand-300 transition-colors">
                  Text-to-Video Studio
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('showcase')} className="hover:text-brand-300 transition-colors">
                  Community Gallery
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('models')} className="hover:text-brand-300 transition-colors">
                  DiT Architecture Paper
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('pricing')} className="hover:text-brand-300 transition-colors">
                  Compute Pricing & Tiers
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">Stay Updated</h4>
            <p className="text-xs text-slate-400">Receive model checkpoint releases and prompt engineering guides.</p>
            
            {isSubscribed ? (
              <p className="text-xs text-emerald-400 font-semibold">✓ Subscribed to dispatch!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-xs transition-all shadow-md shadow-brand-500/20"
                >
                  Join Research Dispatch
                </button>
              </form>
            )}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 AI-Bhideo Synthesis Lab. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">Security & SOC2</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
