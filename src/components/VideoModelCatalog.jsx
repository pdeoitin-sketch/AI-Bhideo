import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ALL_ROUTES, findRoutes } from '../data/videoProviders';
import { estimateClipCost, formatUsd } from '../services/video/costEngine';
import {
  Zap,
  Search,
  Sparkles,
  KeyRound,
  Globe2,
  ShieldCheck,
  CircleDollarSign,
  Film,
  Image as ImageIcon,
  Volume2,
  BadgeCheck,
  AlertTriangle,
  Waves,
} from 'lucide-react';

/**
 * The video model catalogue: every model the studio can call, with the provider
 * route that will actually serve it, sorted by what it costs for the clip you
 * configured. Free/local routes are always selectable so the studio never
 * requires a key to be useful.
 */
export const VideoModelCatalog = () => {
  const {
    selectedRouteId,
    chooseVideoRoute,
    useCheapestRoute,
    providerCatalog,
    priceAsOf,
    selectedDuration,
    selectedAspectRatio,
    showToast,
    copyToClipboard,
  } = useApp();

  const [query, setQuery] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [needsAudio, setNeedsAudio] = useState(false);
  const [mode, setMode] = useState('any');
  const [maxUsd, setMaxUsd] = useState(0.2);
  const [dedupe, setDedupe] = useState(true);
  const [showRetired, setShowRetired] = useState(false);
  const [sort, setSort] = useState('price');

  const durationSeconds = parseInt(selectedDuration, 10) || 8;
  const configuredProviders = useMemo(
    () => new Set((providerCatalog || []).filter((entry) => entry.available).map((entry) => entry.provider.id)),
    [providerCatalog]
  );

  const routes = useMemo(() => {
    const base = findRoutes({
      mode: mode === 'any' ? undefined : mode,
      needsAudio: needsAudio || undefined,
      freeOnly: freeOnly || undefined,
      maxUsdPerSecond: maxUsd > 0 ? maxUsd : undefined,
      includeRetired: showRetired,
    });
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? base.filter((route) =>
          `${route.model.name} ${route.model.maker} ${route.provider?.name} ${route.route.model}`
            .toLowerCase()
            .includes(needle)
        )
      : base;

    const chosen = dedupe
      ? filtered.reduce((acc, route) => {
          const existing = acc.get(route.modelId);
          if (!existing || route.usdPerSecond < existing.usdPerSecond) acc.set(route.modelId, route);
          return acc;
        }, new Map())
      : null;
    const list = chosen ? Array.from(chosen.values()) : filtered;

    if (sort === 'duration') {
      return [...list].sort(
        (a, b) =>
          Math.max(...(b.model.capabilities?.durations || [0])) - Math.max(...(a.model.capabilities?.durations || [0])) ||
          a.usdPerSecond - b.usdPerSecond
      );
    }
    if (sort === 'provider') {
      return [...list].sort((a, b) => `${a.model.maker}${a.model.name}`.localeCompare(`${b.model.maker}${b.model.name}`));
    }
    return list;
  }, [query, freeOnly, needsAudio, mode, maxUsd, dedupe, showRetired, sort]);

  const freeCount = ALL_ROUTES.filter((route) => route.free).length;

  return (
    <div className="glass-panel p-5 rounded-3xl border border-white/10">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>Video Model &amp; API</span>
          </label>
          <p className="text-[11px] text-slate-400 mt-1">
            {routes.length} route{routes.length === 1 ? '' : 's'} · {freeCount} free · list prices as of {priceAsOf}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const route = useCheapestRoute({
                mode: mode === 'any' ? undefined : mode,
                needsAudio: needsAudio || undefined,
                freeOnly,
                maxUsdPerSecond: maxUsd > 0 ? maxUsd : undefined,
              });
              if (route) setQuery('');
            }}
            className="px-3 py-1.5 rounded-xl bg-brand-500/15 border border-brand-500/40 text-brand-200 text-[11px] font-semibold hover:bg-brand-500/25 transition-colors flex items-center gap-1.5"
            title="Select the cheapest route that matches the filters above"
          >
            <CircleDollarSign className="w-3.5 h-3.5" />
            Cheapest match
          </button>
          <button
            type="button"
            onClick={() => chooseVideoRoute('local-cinema::local')}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[11px] font-semibold hover:bg-white/10 transition-colors"
            title="Switch to the free local canvas renderer"
          >
            Free local
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Veo, Kling, Wan, LTX, Hailuo, self-hosted…"
            className="w-full bg-dark-900/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <FilterChip active={freeOnly} onClick={() => setFreeOnly((value) => !value)} label="Free only" />
          <FilterChip active={needsAudio} onClick={() => setNeedsAudio((value) => !value)} label="Native audio" icon={<Volume2 className="w-3 h-3" />} />
          {['any', 't2v', 'i2v'].map((value) => (
            <FilterChip key={value} active={mode === value} onClick={() => setMode(value)} label={value === 'any' ? 'Any mode' : value === 't2v' ? 'Text → video' : 'Image → video'} />
          ))}
          <FilterChip active={dedupe} onClick={() => setDedupe((value) => !value)} label="One per model" />
          <FilterChip active={showRetired} onClick={() => setShowRetired((value) => !value)} label="Show retired" />
          <span className="ml-auto flex items-center gap-1.5 text-slate-400">
            sort
            {['price', 'duration', 'provider'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSort(value)}
                className={`px-2 py-0.5 rounded-lg border transition-colors ${
                  sort === value ? 'bg-brand-500/20 border-brand-500/60 text-brand-200' : 'border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                {value}
              </button>
            ))}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="whitespace-nowrap">Max $/sec</span>
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.01"
            value={maxUsd}
            onChange={(event) => setMaxUsd(parseFloat(event.target.value))}
            className="flex-1 accent-brand-500 h-1.5 bg-dark-900 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-slate-200 w-16 text-right">{maxUsd === 0 ? 'off' : `$${maxUsd.toFixed(2)}`}</span>
        </div>
      </div>

      {/* Route cards */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-none">
        {routes.length === 0 && (
          <div className="p-4 rounded-2xl bg-dark-900/70 border border-white/10 text-xs text-slate-400">
            No route matches those filters. Clear "Free only", raise the price cap, or switch mode.
          </div>
        )}
        {routes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          const cost = estimateClipCost(route, { durationSeconds, resolution: route.model.capabilities?.resolutions?.[0] });
          const keyReady = !route.requiresKey || configuredProviders.has(route.providerId);
          const caps = route.model.capabilities || {};
          return (
            <button
              type="button"
              key={route.id}
              onClick={() => chooseVideoRoute(route.id)}
              onDoubleClick={() => copyToClipboard(route.id)}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-dark-850 border-brand-500 ring-1 ring-brand-500/50 shadow-lg shadow-brand-500/20'
                  : 'bg-dark-900/70 border-white/10 hover:border-white/25 hover:bg-dark-850/60'
              }`}
            >
              {isSelected && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-500 via-brand-cyan to-brand-pink" />}

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[13px] text-white truncate">{route.model.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                      {route.provider?.name || route.providerId}
                    </span>
                    {route.model.status === 'retired' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300">RETIRED</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{route.model.tagline}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-mono text-xs font-bold ${cost.usd === 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {cost.usd === 0 ? 'FREE' : formatUsd(route.usdPerSecond, { digits: route.usdPerSecond < 0.1 ? 3 : 2 })}
                    {cost.usd > 0 && <span className="text-slate-500 font-normal">/s</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                    {cost.usd === 0 ? 'no upstream cost' : `${formatUsd(cost.usd)} · ⚡${cost.credits}`}
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[10px]">
                <Cap icon={<Film className="w-3 h-3" />} label={caps.modes?.includes('t2v') ? 't2v' : 'i2v only'} />
                {caps.modes?.includes('i2v') && <Cap icon={<ImageIcon className="w-3 h-3" />} label="i2v" />}
                {caps.audio && <Cap icon={<Volume2 className="w-3 h-3" />} label="audio" />}
                {caps.openWeight && <Cap icon={<Waves className="w-3 h-3" />} label="open weights" />}
                {(caps.resolutions || []).includes('4K') && <Cap icon={<Sparkles className="w-3 h-3" />} label="4K" />}
                {route.route.verify && <Cap icon={<AlertTriangle className="w-3 h-3" />} label="verify slug" warn />}
                <span className="ml-auto flex items-center gap-1">
                  {keyReady ? (
                    <span className="flex items-center gap-1 text-emerald-300">
                      <ShieldCheck className="w-3 h-3" /> ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-500">
                      <KeyRound className="w-3 h-3" /> key needed
                    </span>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-500 flex items-start gap-1.5">
        <Globe2 className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          Prices are public list rates, gathered {priceAsOf} and editable in <code className="text-slate-400">src/data/videoProviders.js</code>. Vendors bill per
          successfully generated second (some per run/clip), and failed attempts can still be charged — treat every figure as a budget estimate.
          {' '}
          <BadgeCheck className="inline w-3 h-3 text-emerald-400/70" /> routes marked "ready" have a key on the gateway or in this browser.
        </span>
      </p>
    </div>
  );
};

function Cap({ icon, label, warn }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${
        warn ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400'
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

function FilterChip({ active, onClick, label, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded-lg border font-semibold transition-colors flex items-center gap-1 ${
        active ? 'bg-brand-500/20 border-brand-500/60 text-brand-200' : 'border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default VideoModelCatalog;
