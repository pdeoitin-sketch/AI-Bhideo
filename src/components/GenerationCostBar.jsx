import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { previewJob } from '../services/video/runner';
import { formatUsd } from '../services/video/costEngine';
import { Gauge, ServerCog, TriangleAlert, ShieldCheck, PlugZap } from 'lucide-react';

/**
 * Cost + transport strip under the render button: what this clip will cost,
 * what the month is tracking to, and whether a gateway is reachable. The same
 * `previewJob()` the gateway runs is used here, so a warning in the UI means
 * the request would also be refused server-side.
 */
export const GenerationCostBar = ({ onOpenProviderAccess }) => {
  const {
    selectedRoute,
    providerSettings,
    updateProviderSettings,
    gatewayInfo,
    remoteSpendUsd,
    isGenerating,
    prompt,
    negativePrompt,
    selectedDuration,
    selectedAspectRatio,
    selectedFps,
    seed,
    motionStrength,
  } = useApp();
  const [clipsPerMonth, setClipsPerMonth] = useState(20);

  const durationSeconds = parseInt(selectedDuration, 10) || 8;
  const preview = useMemo(() => {
    if (!selectedRoute) return null;
    return previewJob({
      routeId: selectedRoute.id,
      params: {
        prompt,
        negativePrompt,
        durationSeconds,
        aspectRatio: selectedAspectRatio,
        resolution: '720p',
        fps: Number(selectedFps) || 24,
        seed,
        motionScore: motionStrength,
        audio: false,
      },
      budget: {
        maxUsdPerClip: providerSettings.maxUsdPerClip || undefined,
        monthlyBudgetUsd: providerSettings.monthlyBudgetUsd
          ? Math.max(0, providerSettings.monthlyBudgetUsd - remoteSpendUsd)
          : undefined,
      },
    });
  }, [selectedRoute, prompt, negativePrompt, durationSeconds, selectedAspectRatio, selectedFps, seed, motionStrength, providerSettings, remoteSpendUsd]);

  if (!selectedRoute) return null;

  const cost = preview?.cost || { usd: 0, credits: 0, note: '' };
  const projection = cost.usd * clipsPerMonth;
  const budgetCap = Number(providerSettings.monthlyBudgetUsd) || 0;
  const budgetPct = budgetCap > 0 ? Math.min(100, Math.round((remoteSpendUsd / budgetCap) * 100)) : 0;
  const gatewayOnline = Boolean(gatewayInfo?.online);

  return (
    <div className="glass-panel rounded-2xl border border-white/10 p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
            <Gauge className="w-3.5 h-3.5 text-brand-400" />
            <span className="truncate">
              {selectedRoute.model.name} · {selectedRoute.provider?.name || selectedRoute.providerId}
            </span>
            <span className="font-mono text-[10px] text-slate-500">/{selectedRoute.protocol}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {cost.usd === 0 ? (
              <>
                Free route — {selectedRoute.providerId === 'local' ? 'rendered on your canvas' : 'covered by the provider free tier'}
                {cost.credits > 0 ? `; the demo ledger still charges ⚡${cost.credits}` : '; no credits charged'}.
              </>
            ) : (
              <>
                Est. <span className="text-amber-300 font-semibold">{formatUsd(cost.usd)}</span> for {cost.seconds}s ({cost.note}) → charges{' '}
                <span className="text-amber-300 font-semibold">⚡{cost.credits}</span> demo credits.
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenProviderAccess}
          className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 hover:bg-white/10 flex items-center gap-1.5 transition-colors"
        >
          <ServerCog className="w-3.5 h-3.5" />
          Provider access
        </button>
      </div>

      {(preview?.errors?.length > 0 || preview?.warnings?.length > 0) && (
        <div className="space-y-1">
          {preview.errors.map((error) => (
            <p key={error} className="text-[10px] text-rose-300 flex items-start gap-1.5">
              <TriangleAlert className="w-3 h-3 mt-0.5 shrink-0" /> {error}
            </p>
          ))}
          {preview.warnings.map((warning) => (
            <p key={warning} className="text-[10px] text-amber-200/80 flex items-start gap-1.5">
              <TriangleAlert className="w-3 h-3 mt-0.5 shrink-0" /> {warning}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        <Metric label="This clip">
          <span className={cost.usd === 0 ? 'text-emerald-300' : 'text-white'}>{cost.usd === 0 ? 'free' : formatUsd(cost.usd)}</span>
        </Metric>
        <Metric label={`${clipsPerMonth} clips/mo`}>
          <span className={budgetCap && projection > budgetCap ? 'text-rose-300' : 'text-slate-200'}>{formatUsd(projection)}</span>
          <input
            type="number"
            min="1"
            max="5000"
            value={clipsPerMonth}
            onChange={(event) => setClipsPerMonth(Math.max(1, Number(event.target.value) || 1))}
            className="w-12 ml-1 bg-dark-900 border border-white/10 rounded px-1 text-[10px] text-slate-300 focus:outline-none"
            aria-label="Clips per month"
          />
        </Metric>
        <Metric label="Per-clip cap">
          <input
            type="number"
            step="0.05"
            min="0"
            value={providerSettings.maxUsdPerClip ?? 0}
            onChange={(event) => updateProviderSettings({ maxUsdPerClip: Math.max(0, Number(event.target.value) || 0) })}
            className="w-16 bg-dark-900 border border-white/10 rounded px-1 text-slate-200 font-mono focus:outline-none"
            aria-label="Maximum USD per clip"
          />
        </Metric>
        <Metric label="Month spend">
          <span className="font-mono text-slate-200">{formatUsd(remoteSpendUsd)}</span>
          {budgetCap > 0 && (
            <span className="block mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <span
                className={`block h-full ${budgetPct > 85 ? 'bg-rose-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.max(2, budgetPct)}%` }}
              />
            </span>
          )}
        </Metric>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[10px]">
        <span className={`flex items-center gap-1.5 ${gatewayOnline ? 'text-emerald-300' : 'text-slate-400'}`}>
          {gatewayOnline ? <ShieldCheck className="w-3 h-3" /> : <PlugZap className="w-3 h-3" />}
          {gatewayOnline
            ? `Gateway live · ${(gatewayInfo.configuredProviders || []).length} key(s) configured`
            : 'No gateway detected — remote calls fall back to the free local render'}
        </span>
        <span className="text-slate-500 font-mono">
          {providerSettings.keyMode === 'auto' ? 'auto' : providerSettings.keyMode} mode
          {isGenerating ? ' · job running' : ''}
        </span>
      </div>
    </div>
  );
};

function Metric({ label, children }) {
  return (
    <div className="rounded-xl bg-dark-900/70 border border-white/10 px-2 py-1.5">
      <div className="text-slate-500">{label}</div>
      <div className="mt-0.5 flex items-center font-semibold">{children}</div>
    </div>
  );
}

export default GenerationCostBar;
