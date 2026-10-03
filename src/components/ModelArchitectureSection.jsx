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
          <span>ILLUSTRATIVE PIPELINE MOCK-UP</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
          Video Pipeline <span className="gradient-text-neon">Concepts</span>
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
          This interactive section is a conceptual mock-up. The current app renders prompt-themed Canvas scenes and records them locally; no neural inference model, hosted GPU, or real model telemetry is connected.
        </p>
      </div>

      {/* Interactive 5-Step Pipeline Inspector */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl mb-12">
        
        <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6 flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-brand-400" />
              <span>Conceptual Video Pipeline</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Example stages only; these do not run during the local canvas render</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-dark-900 border border-white/10 text-brand-300">
            Demo data only
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
            <p className="text-[11px] text-slate-500 mt-1">Illustrative slider only; it does not change the current browser render.</p>
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
            <p className="text-[11px] text-slate-500 mt-1">Illustrative slider only; it does not change the current browser render.</p>
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
            💡 <strong>Demo controls:</strong> The values above are for interface illustration and are not sent to an AI model in this static build.
          </div>
        </div>

      </div>

      {/* Current renderer facts */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10">
        <h3 className="text-lg font-bold text-white mb-4">Current Browser Renderer</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5">
            <p className="text-slate-500">Render engine</p>
            <p className="text-white font-semibold mt-1">Prompt-themed Canvas animation</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5">
            <p className="text-slate-500">Video export</p>
            <p className="text-white font-semibold mt-1">WebM or MP4 via MediaRecorder</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5">
            <p className="text-slate-500">Canvas size</p>
            <p className="text-white font-semibold mt-1">Up to 1280px on the long edge</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5">
            <p className="text-slate-500">Clip duration</p>
            <p className="text-white font-semibold mt-1">Up to 16 seconds, captured in real time</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5">
            <p className="text-slate-500">Prompt mapping</p>
            <p className="text-white font-semibold mt-1">Theme plus a few recognized subject shapes</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5">
            <p className="text-slate-500">Hosted AI inference</p>
            <p className="text-white font-semibold mt-1">Not configured in this static demo</p>
          </div>
        </div>
      </div>

    </section>
  );
};
