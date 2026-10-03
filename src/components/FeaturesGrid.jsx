import React from 'react';
import { 
  Sparkles, 
  Camera, 
  Zap, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Video, 
  Sliders, 
  Palette,
  FileCode2
} from 'lucide-react';

export const FeaturesGrid = () => {
  const features = [
    {
      icon: Video,
      title: 'Native 4K 60FPS Video',
      description: 'Ultra-crisp 3840×2160 rendering with micro-surface textures, skin subsurface scattering, and cinema HDR tone mapping.',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: Camera,
      title: 'Camera Path Director',
      description: 'Direct sweeping FPV drone dives, 360° orbits, dolly zooms, and precision tilt moves with exact optical trajectories.',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      icon: Zap,
      title: 'Zero Temporal Smear',
      description: 'Physics-informed causal flow matching eliminates flickering, limb morphing, and ghosting in high-velocity action scenes.',
      color: 'from-amber-500 to-rose-500'
    },
    {
      icon: Layers,
      title: 'Consistent Characters & Lore',
      description: 'Maintain face structure, wardrobe, lighting, and scene geography across multi-shot cinematic storyboards.',
      color: 'from-pink-500 to-purple-500'
    },
    {
      icon: Palette,
      title: 'Artistic Multi-Style Engine',
      description: 'Seamlessly transition between photoreal 35mm film, Makoto Shinkai anime, cyberpunk, vintage 70s, and claymation.',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      icon: FileCode2,
      title: 'Developer REST & Python SDK',
      description: 'Integrate automated video generation directly into your pipelines with webhooks, asynchronous jobs, and streaming endpoints.',
      color: 'from-blue-500 to-cyan-500'
    }
  ];

  return (
    <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
          Engineered for <span className="gradient-text-neon">Uncompromising Visuals</span>
        </h2>
        <p className="mt-4 text-slate-300 text-sm sm:text-base">
          Everything creators, studios, and developers need to push the boundaries of synthetic motion graphics and cinematic storytelling.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feat, i) => {
          const Icon = feat.icon;
          return (
            <div
              key={i}
              className="glass-card glass-card-hover p-6 rounded-3xl border border-white/10 flex flex-col justify-between"
            >
              <div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feat.color} flex items-center justify-center text-white mb-4 shadow-lg shadow-brand-500/20`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs font-semibold text-brand-300">
                <span>Learn more</span>
                <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
