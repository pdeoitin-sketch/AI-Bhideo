import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Layers, 
  Cpu, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  Code2, 
  BarChart3, 
  SlidersHorizontal,
  Flame,
  ArrowRight
} from 'lucide-react';
import { MODEL_ARCHITECTURE_STEPS } from '../data/mockData';
import { useApp } from '../context/AppContext';

export const ModelArchitectureSection = () => {
  const { setCurrentView } = useApp();
  const [activeStepIndex, setActiveStepIndex] = useState(2); // Step 3 by default
  const [simCfg, setSimCfg] = useState(7.5);
  const [simMotion, setSimMotion] = useState(6.0);

  // Compute live simulated metrics based on sliders
  const simulatedConsistency = Math.min(99.9, +(94 + (simCfg * 0.4) - (simMotion * 0.2)).toFixed(1));
  const simulatedSharpness = Math.min(100, +(88 + (simCfg * 0.6)).toFixed(1));
  const simulatedLatencyMs = Math.round(420 + (simCfg * 12) + (simMotion * 18));

  return (
    <section id="model-architecture" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold mb-4">
          <Cpu className="w-3.5 h-3.5" />
          <span>RESEARCH & NEURAL ARCHITECTURE</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
          Inside the <span className="gradient-text-neon">AI-Bhideo DiT</span> Engine
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
          A 12-Billion parameter 3D Spatio-Temporal Diffusion Transformer engineered from scratch with continuous flow-matching, rotational positional embeddings (3D-RoPE), and physics-guided guidance loss.
        </p>
      </div>

      {/* Interactive 5-Step Pipeline Inspector */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl mb-12">
        
        <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6 flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-brand-400" />
              <span>Multi-Stage Diffusion Synthesis Pipeline</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Click through stages to explore the mathematical transformations</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-dark-900 border border-white/10 text-brand-300">
            Transformer Depth: 64 Layers
          </span>
        </div>

        {/* Step Buttons Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-8">
          {MODEL_ARCHITECTURE_STEPS.map((step, idx) => {
            const isActive = activeStepIndex === idx;
            return (
              <button
                key={step.step}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  isActive
                    ? 'bg-brand-500/20 border-brand-500 ring-1 ring-brand-500/50 shadow-lg shadow-brand-500/20'
                    : 'bg-dark-900/80 border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-mono font-bold ${isActive ? 'text-brand-300' : 'text-slate-500'}`}>
                    STEP {step.step}
                  </span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />}
                </div>
                <p className="text-xs font-semibold text-white truncate">{step.title}</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{step.metric}</p>
              </button>
            );
          })}
        </div>

        {/* Active Step Detailed Showcase Panel */}
        {MODEL_ARCHITECTURE_STEPS[activeStepIndex] && (
          <div className="bg-dark-900/90 rounded-2xl p-6 border border-white/10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 text-xs font-mono font-semibold">
                STAGE {MODEL_ARCHITECTURE_STEPS[activeStepIndex].step} • {MODEL_ARCHITECTURE_STEPS[activeStepIndex].subtitle}
              </div>
              <h4 className="text-xl font-bold text-white">
                {MODEL_ARCHITECTURE_STEPS[activeStepIndex].title}
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {MODEL_ARCHITECTURE_STEPS[activeStepIndex].description}
              </p>
              <div className="pt-2 flex items-center gap-4 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sub-millisecond Tensor Quantization</span>
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Zero Memory Leak Flow</span>
                </span>
              </div>
            </div>

            <div className="md:col-span-4 p-5 rounded-2xl bg-dark-950 border border-white/10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-cyan mx-auto flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Stage Throughput</p>
                <p className="text-lg font-mono font-bold text-brand-300 mt-0.5">
                  {MODEL_ARCHITECTURE_STEPS[activeStepIndex].metric}
                </p>
              </div>
              <button
                onClick={() => setCurrentView('studio')}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
              >
                Test in Studio →
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Interactive Guidance & Motion Telemetry Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-12">
        
        {/* Simulator Controls */}
        <div className="lg:col-span-6 glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal className="w-4 h-4 text-brand-cyan" />
              <h3 className="text-base font-bold text-white">Diffusion Dynamics Hyperparameter Simulator</h3>
            </div>
            <p className="text-xs text-slate-400">
              Adjust parameters below to see how CFG Guidance and Motion Intensity alter mathematical coherence and inference speed.
            </p>
          </div>

          {/* CFG Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-200 mb-1.5">
              <span>Classifier-Free Guidance (CFG Scale)</span>
              <span className="font-mono text-brand-300">{simCfg}</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={simCfg}
              onChange={(e) => setSimCfg(parseFloat(e.target.value))}
              className="w-full accent-brand-500 h-2 bg-dark-900 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Controls prompt adherence fidelity versus creative hallucination.</p>
          </div>

          {/* Motion Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-200 mb-1.5">
              <span>Temporal Velocity & Motion Vector</span>
              <span className="font-mono text-cyan-300">{simMotion}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={simMotion}
              onChange={(e) => setSimMotion(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-2 bg-dark-900 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Controls optical flow intensity and inter-frame kinetic acceleration.</p>
          </div>
        </div>

        {/* Real-time Computed Neural Metrics */}
        <div className="lg:col-span-6 glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>Simulated Model Output Telemetry</span>
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-dark-900/90 border border-white/5 text-center">
              <p className="text-[11px] text-slate-400">Coherence</p>
              <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{simulatedConsistency}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Zero-Flicker</p>
            </div>
            <div className="p-4 rounded-2xl bg-dark-900/90 border border-white/5 text-center">
              <p className="text-[11px] text-slate-400">Sharpness</p>
              <p className="text-xl font-bold font-mono text-cyan-400 mt-1">{simulatedSharpness}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">4K Microtextures</p>
            </div>
            <div className="p-4 rounded-2xl bg-dark-900/90 border border-white/5 text-center">
              <p className="text-[11px] text-slate-400">Latency</p>
              <p className="text-xl font-bold font-mono text-amber-400 mt-1">{simulatedLatencyMs}ms</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Per 16-Frame Batch</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 leading-relaxed">
            💡 <strong>Optimal Recommendation:</strong> A CFG of 7.0–8.5 paired with Motion Intensity 6.0 yields maximum photorealism with zero temporal degradation across 16s video sequences.
          </div>
        </div>

      </div>

      {/* Model Benchmark Comparison Table */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 overflow-x-auto">
        <h3 className="text-lg font-bold text-white mb-4">
          Architectural Benchmark Matrix
        </h3>

        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 font-mono">
              <th className="pb-3 pr-4">Video Model Pipeline</th>
              <th className="pb-3 px-4">Architecture</th>
              <th className="pb-3 px-4">Max Resolution</th>
              <th className="pb-3 px-4">Temporal Flicker</th>
              <th className="pb-3 px-4">FPS Cadence</th>
              <th className="pb-3 pl-4 text-right">Inference Speed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-medium">
            <tr className="bg-brand-500/10 text-white font-bold">
              <td className="py-3.5 pr-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-cyan" />
                <span>AI-Bhideo Cinema v3</span>
              </td>
              <td className="py-3.5 px-4 text-brand-300">3D-RoPE DiT (12B)</td>
              <td className="py-3.5 px-4 text-emerald-400">3840×2160 (Native 4K)</td>
              <td className="py-3.5 px-4 text-emerald-400">&lt; 0.2% (Imperceptible)</td>
              <td className="py-3.5 px-4">60 FPS Native</td>
              <td className="py-3.5 pl-4 text-right text-brand-cyan font-mono">0.8s / frame</td>
            </tr>
            <tr className="text-slate-300">
              <td className="py-3.5 pr-4">Standard 3D U-Net Model</td>
              <td className="py-3.5 px-4">Conv3D + Self-Attention</td>
              <td className="py-3.5 px-4">1280×720 (720p)</td>
              <td className="py-3.5 px-4 text-rose-400">8.4% (Noticeable Morphing)</td>
              <td className="py-3.5 px-4">24 FPS</td>
              <td className="py-3.5 pl-4 text-right text-slate-400 font-mono">4.5s / frame</td>
            </tr>
            <tr className="text-slate-300">
              <td className="py-3.5 pr-4">Legacy 2D Frame Interpolator</td>
              <td className="py-3.5 px-4">Optical Flow Morphing</td>
              <td className="py-3.5 px-4">1920×1080 (1080p)</td>
              <td className="py-3.5 px-4 text-amber-400">14.2% (Smearing)</td>
              <td className="py-3.5 px-4">30 FPS</td>
              <td className="py-3.5 pl-4 text-right text-slate-400 font-mono">6.2s / frame</td>
            </tr>
          </tbody>
        </table>
      </div>

    </section>
  );
};
