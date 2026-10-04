import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { gatewayBase } from '../services/video/gatewayClient.js';
import { X, Key, Copy, Check, Plus, Trash2, Code2, ExternalLink } from 'lucide-react';

export const ApiKeysModal = () => {
  const { isApiKeysModalOpen, setIsApiKeysModalOpen, user, setUser, showToast, copyToClipboard, selectedRoute } = useApp();
import { X, Key, Copy, Check, Plus, Trash2, Code2 } from 'lucide-react';

export const ApiKeysModal = () => {
  const {
    isApiKeysModalOpen,
    setIsApiKeysModalOpen,
    user,
    createApiKey,
    revokeApiKey,
    showToast,
    copyToClipboard,
  } = useApp();
  const [copiedKeyId, setCopiedKeyId] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const apiKeys = Array.isArray(user?.apiKeys) ? user.apiKeys : [];
  const snippetKey = apiKeys[0]?.key || 'bh_live_...';

  useEffect(() => {
    if (!isApiKeysModalOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setNewKeyName('');
        setIsApiKeysModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isApiKeysModalOpen, setIsApiKeysModalOpen]);

  if (!isApiKeysModalOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const base = `${origin}${gatewayBase()}`;
  const routeId = !selectedRoute || selectedRoute.protocol === 'local' ? 'veo-3-1-lite::replicate#3' : selectedRoute.id;
  const payload = (extra) =>
    `{ "routeId": "${routeId}", "params": { "prompt": "Cyberpunk tiger in rain, 8k", "durationSeconds": 6, "resolution": "720p" }${extra} }`;
  const apiExamples = [
    '# 1 · which routes exist, and what do they cost per second?',
    `curl '${base}/models?maxUsdPerSecond=0.05'`,
    '',
    '# 2 · price the clip first — no provider call, no spend',
    `curl -X POST '${base}/estimate' \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '${payload('')}'`,
    '',
    '# 3 · submit, then poll the handle until the clip is ready',
    `curl -X POST '${base}/generate' \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '${payload(', "byok": { "key": "<your-vendor-key>" }')}'`,
    `curl '${base}/jobs/HANDLE_FROM_STEP_3'`,
    '',
    `# Base path comes from the app settings; the local renderer has no HTTP call at all`,
    `# (it records the studio canvas). Keys are never read back from the gateway.`,
  ].join('\n');

  const handleCopy = (k) => {
    copyToClipboard(k.key);
    setCopiedKeyId(k.id);
    showToast('Copied demo key', 'Prototype only — no API checks this value.', 'info');
  const handleCopy = (keyRecord) => {
    const copied = copyToClipboard(keyRecord.key);
    if (!copied) {
      showToast('Copy Failed', 'Your browser blocked clipboard access.', 'warning');
      return;
    }
    setCopiedKeyId(keyRecord.id);
    showToast('Copied API Key', 'Ready to use in requests.', 'success');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleCreate = (event) => {
    event.preventDefault();
    const apiKey = createApiKey(newKeyName);
    if (!apiKey) {
      showToast('Key Name Required', 'Please enter a name for the API key.', 'warning');
      return;
    }

    setNewKeyName('');
    showToast('Key Created', `New key "${apiKey.name}" is active.`, 'success');
  };

  const handleRevoke = (keyId) => {
    const keyExists = apiKeys.some((keyRecord) => keyRecord.id === keyId);
    if (!keyExists) return;

    revokeApiKey(keyId);
    setCopiedKeyId((currentId) => currentId === keyId ? null : currentId);
    showToast('Key Revoked', 'The key was removed from your active keys.', 'info');
  };

  const closeModal = () => {
    setNewKeyName('');
    setIsApiKeysModalOpen(false);
  };

  return (
    <div
      className="fixed inset-0 bright-modal-overlay z-50 flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in space-y-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-keys-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Programmatic access</h3>
              <p className="text-xs text-slate-400">
                The video API is the gateway this app talks to — not a hosted Bhideo service. The keys below are
                prototype data; the requests below are real.
              </p>
              <h3 id="api-keys-modal-title" className="text-lg font-bold text-white">Developer API Keys & SDK</h3>
              <p className="text-xs text-slate-400">Create and manage keys for the local preview.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Close developer API keys"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create new key */}
        <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-dark-900 border border-white/10 space-y-3">
          <label htmlFor="api-key-name" className="text-sm font-semibold text-slate-200">Create a new key</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="api-key-name"
              type="text"
              value={newKeyName}
              onChange={(event) => setNewKeyName(event.target.value)}
              placeholder="e.g. Production video service"
              className="flex-1 min-w-0 bg-dark-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500"
              autoComplete="off"
            />
            {newKeyName && (
              <button
                type="button"
                onClick={() => setNewKeyName('')}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="modal-primary-action px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Generate key
            </button>
          </div>
          <p className="text-xs text-slate-500">Demo keys are saved in this browser and do not authenticate with a live API.</p>
        </form>

        {/* Existing keys update immediately after revoke; no page reload needed. */}
        <section className="space-y-3" aria-labelledby="active-api-keys-title" aria-live="polite" aria-relevant="additions removals">
          <h4 id="active-api-keys-title" className="text-sm font-semibold text-slate-700">Active API keys <span className="text-slate-500">({apiKeys.length})</span></h4>
          {apiKeys.length > 0 ? (
            <div className="space-y-3">
              {apiKeys.map((keyRecord) => (
                <div key={keyRecord.id} className="p-4 rounded-2xl bg-dark-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{keyRecord.name}</p>
                    <p className="text-xs font-mono text-slate-400 mt-1 break-all">
                      {String(keyRecord.key || '').slice(0, 14)}••••••••••••••••
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Created {keyRecord.created || 'Unknown'} · {keyRecord.callsCount || 0} calls</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(keyRecord)}
                      className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKeyId === keyRecord.id ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedKeyId === keyRecord.id ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevoke(keyRecord.id)}
                      className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-sm font-semibold text-rose-800 flex items-center gap-1.5 transition-colors"
                      aria-label={`Revoke ${keyRecord.name}`}
                      title="Revoke this key"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Revoke</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center" role="status">
              <Key className="w-6 h-6 mx-auto mb-2 text-slate-500" />
              <p className="text-sm font-semibold text-slate-800">No active API keys</p>
              <p className="text-xs text-slate-600 mt-1">Create a key above. Revoked keys are removed from this list immediately.</p>
            </div>
          )}
        </section>

        {/* The real contract, for the route currently selected in the studio. */}
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            The gateway authorises with its own environment key for that provider, or with a per-request{' '}
            <code className="text-slate-400">byok.key</code> holding your vendor key. A{' '}
            <code className="text-slate-400">bh_live_…</code> value from the list above is never sent anywhere.
          </p>
          <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-brand-cyan" />
            <span>cURL quickstart</span>
          </p>
          <div className="bg-dark-950 p-3.5 rounded-2xl font-mono text-xs text-slate-300 border border-white/5 overflow-x-auto">
            <pre className="whitespace-pre">{apiExamples}</pre>
          <div className="api-code-sample bg-dark-950 p-4 rounded-2xl font-mono text-sm text-slate-300 border border-white/5 overflow-x-auto">
            <pre>{`curl -X POST https://api.bhideo.ai/v1/video/generate \\
  -H "Authorization: Bearer ${snippetKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Cyberpunk tiger in rain 8k",
    "model": "bhideo-cinema-v3",
    "fps": 60
  }'`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
