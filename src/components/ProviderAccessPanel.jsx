import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, KeyRound, Link2, ExternalLink, Trash2, Save, CircleDollarSign, Info, Sparkles } from 'lucide-react';
import { formatUsd } from '../services/video/costEngine';

/**
 * Provider access: which gateway to use, which keys the browser holds, and the
 * spend guardrails. Keys are stored in this tab by default; "remember" opts into
 * localStorage. Nothing here is uploaded anywhere except as the per-request BYOK
 * payload to the gateway you configure.
 */
export const ProviderAccessPanel = ({ open, onClose }) => {
  const {
    providerCatalog,
    providerSettings,
    updateProviderSettings,
    configureProviderKey,
    forgetProviderKey,
    gatewayInfo,
    refreshGatewayStatus,
    remoteSpendUsd,
    showToast,
  } = useApp();

  const [draft, setDraft] = useState({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) setDraft({});
  }, [open]);

  const freeRoutes = useMemo(
    () => providerCatalog.filter((entry) => entry.provider.id === 'local' || (entry.provider.freeTier?.label || '').toLowerCase().includes('neurons')),
    [providerCatalog]
  );

  if (!open) return null;

  const setField = (providerId, field, value) =>
    setDraft((previous) => ({ ...previous, [providerId]: { ...(previous[providerId] || {}), [field]: value } }));

  const saveProvider = (providerId) => {
    const values = draft[providerId] || {};
    if (!values.key && !values.accountId && !values.baseUrl) {
      showToast('Nothing To Save', 'Paste a key (or an account id for Cloudflare) first.', 'warning');
      return;
    }
    configureProviderKey(providerId, values);
    setDraft((previous) => {
      const next = { ...previous };
      delete next[providerId];
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl border border-white/10 max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in shadow-2xl">
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                Video Provider Access
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Gateway URL, per-provider keys, and the budget guardrails applied to every remote generation.
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Gateway */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-brand-400" /> Gateway
            </h4>
            <div className="grid sm:grid-cols-[1fr_auto] gap-2">
              <input
                value={providerSettings.gatewayUrl}
                onChange={(event) => updateProviderSettings({ gatewayUrl: event.target.value })}
                placeholder="/api/video"
                className="bg-dark-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-500/60"
              />
              <button
                type="button"
                disabled={testing}
                onClick={async () => {
                  setTesting(true);
                  const probe = await refreshGatewayStatus({ force: true });
                  setTesting(false);
                  showToast(
                    probe.online ? 'Gateway Reachable' : 'Gateway Not Found',
                    probe.online
                      ? `${(probe.configuredProviders || []).length} provider key(s) available.`
                      : probe.error || 'Start `npm run gateway` or deploy the worker, then re-test.',
                    probe.online ? 'success' : 'error'
                  );
                }}
                className="px-3 py-2 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-200 text-xs font-semibold hover:bg-brand-500/30 transition-colors disabled:opacity-60"
              >
                {testing ? 'Testing…' : 'Test connection'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {gatewayInfo?.probed
                ? gatewayInfo.online
                  ? `Live · keys in the gateway env: ${gatewayInfo.configuredProviders?.length ? gatewayInfo.configuredProviders.join(', ') : 'none (BYOK only)'}`
                  : gatewayInfo.error || 'Unreachable.'
                : 'Not probed yet.'}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {['auto', 'gateway', 'byok'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateProviderSettings({ keyMode: mode })}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                    providerSettings.keyMode === mode ? 'bg-brand-500/20 border-brand-500/60 text-brand-200' : 'border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                  title={
                    mode === 'auto'
                      ? 'Use the gateway env key when present, otherwise send the browser key'
                      : mode === 'gateway'
                        ? 'Never send browser keys; gateway env only'
                        : 'Always send this browser’s key with the request (your quota, your billing)'
                  }
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>

          {/* Guardrails */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <CircleDollarSign className="w-3.5 h-3.5 text-emerald-400" /> Spend guardrails
            </h4>
            <div className="grid sm:grid-cols-3 gap-2">
              <label className="text-[11px] text-slate-400">
                Max USD per clip
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={providerSettings.maxUsdPerClip}
                  onChange={(event) => updateProviderSettings({ maxUsdPerClip: Math.max(0, Number(event.target.value) || 0) })}
                  className="mt-1 w-full bg-dark-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
                />
              </label>
              <label className="text-[11px] text-slate-400">
                Monthly USD ceiling
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={providerSettings.monthlyBudgetUsd}
                  onChange={(event) => updateProviderSettings({ monthlyBudgetUsd: Math.max(0, Number(event.target.value) || 0) })}
                  className="mt-1 w-full bg-dark-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
                />
              </label>
              <div className="text-[11px] text-slate-400">
                Tracked this month
                <div className="mt-1 bg-dark-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200">
                  {formatUsd(remoteSpendUsd)} <span className="text-slate-500">estimate</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[11px] text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={providerSettings.allowFallbackToLocal}
                  onChange={(event) => updateProviderSettings({ allowFallbackToLocal: event.target.checked })}
                  className="accent-brand-500"
                />
                Fall back to the free local render when a provider call is refused
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={providerSettings.preferFreeRoutes}
                  onChange={(event) => updateProviderSettings({ preferFreeRoutes: event.target.checked })}
                  className="accent-brand-500"
                />
                Prefer free routes in "Cheapest match"
              </label>
            </div>
          </section>

          {/* Providers */}
          <section className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Providers</h4>
            {providerCatalog.map((entry) => {
              const provider = entry.provider;
              const values = draft[provider.id] || {};
              const extraFields = provider.id === 'kling' ? ['key', 'secret'] : provider.id === 'cloudflare' ? ['key', 'accountId'] : provider.id === 'custom' ? ['baseUrl', 'key'] : ['key'];
              return (
                <div key={provider.id} className={`rounded-2xl border p-3 ${entry.available ? 'bg-dark-900/70 border-emerald-500/25' : 'bg-dark-900/50 border-white/10'}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-semibold text-white">{provider.name}</span>
                        {provider.retired && <span className="text-[10px] px-1.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300">RETIRED {provider.retired}</span>}
                        {entry.hasServerKey && <span className="text-[10px] px-1.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">env key</span>}
                        {entry.hasLocalKey && <span className="text-[10px] px-1.5 rounded bg-brand-500/15 border border-brand-500/40 text-brand-200">browser key {entry.masked}</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{provider.blurb}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Free: {provider.freeTier?.label || 'none'} — {provider.freeTier?.detail || ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {provider.docsUrl && (
                        <a
                          href={provider.docsUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Vendor docs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {entry.hasLocalKey && (
                        <button
                          type="button"
                          onClick={() => forgetProviderKey(provider.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                          title="Remove this browser's key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {provider.keyKind !== 'none' && (
                    <div className="mt-2.5 grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                      {extraFields.map((field) => (
                        <input
                          key={field}
                          type={field === 'baseUrl' ? 'text' : 'password'}
                          autoComplete="off"
                          spellCheck={false}
                          placeholder={field === 'key' ? provider.envVar : field === 'secret' ? 'KLING_SECRET_KEY' : field === 'accountId' ? 'CLOUDFLARE_ACCOUNT_ID' : 'https://your-endpoint'}
                          value={values[field] || ''}
                          onChange={(event) => setField(provider.id, field, event.target.value)}
                          className="bg-dark-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-brand-500/60"
                        />
                      ))}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-slate-400 flex items-center gap-1 cursor-pointer whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="accent-brand-500"
                            checked={Boolean(values.remember)}
                            onChange={(event) => setField(provider.id, 'remember', event.target.checked)}
                          />
                          remember on device
                        </label>
                        <button
                          type="button"
                          onClick={() => saveProvider(provider.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-200 text-[11px] font-semibold hover:bg-brand-500/30 flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <div className="rounded-2xl bg-dark-900/70 border border-white/10 p-3 text-[11px] text-slate-400 space-y-1.5">
            <p className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-400" />
              A browser is not a keystore. For anything beyond your own machine, keep keys on the gateway (<code className="text-slate-300">.env</code> / wrangler
              secrets / Vercel env) and leave key mode on <span className="text-slate-300">gateway</span>.
            </p>
            <p className="flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
              Zero-key options that still work today: {freeRoutes.map((entry) => entry.provider.name).join(', ')}. Cloudflare Workers AI is metered in Neurons
              (10,000/day free) and needs a token, but no card.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderAccessPanel;
