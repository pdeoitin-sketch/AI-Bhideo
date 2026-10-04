import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { gatewayBase } from '../services/video/gatewayClient.js';
import { X, Key, Copy, Check, Plus, Trash2, Code2, ExternalLink } from 'lucide-react';

export const ApiKeysModal = () => {
  const { isApiKeysModalOpen, setIsApiKeysModalOpen, user, setUser, showToast, copyToClipboard, selectedRoute } = useApp();
  const [copiedKeyId, setCopiedKeyId] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');

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
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      showToast('Key Name Required', 'Please enter a name for the API key.', 'warning');
      return;
    }

    const randomSuffix = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newKey = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      key: `bh_live_${randomSuffix}`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      callsCount: 0
    };

    setUser(prev => ({
      ...prev,
      apiKeys: [newKey, ...(prev.apiKeys || [])]
    }));

    setNewKeyName('');
    showToast('Key Created', `New key "${newKey.name}" is active.`, 'success');
  };

  const handleDelete = (id) => {
    setUser(prev => ({
      ...prev,
      apiKeys: (prev.apiKeys || []).filter(k => k.id !== id)
    }));
    showToast('Key Deleted', 'API key has been revoked.', 'info');
  };

  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in space-y-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Programmatic access</h3>
              <p className="text-xs text-slate-400">
                The video API is the gateway this app talks to — not a hosted Bhideo service. The keys below are
                prototype data; the requests below are real.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsApiKeysModalOpen(false)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create new key box */}
        <div className="p-4 rounded-2xl bg-dark-900 border border-white/10 space-y-3">
          <label className="text-xs font-semibold text-slate-200">Create New Secret Key</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Production Video Microservice"
              className="flex-1 bg-dark-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold shadow-md shadow-brand-500/20"
            >
              Generate
            </button>
          </div>
        </div>

        {/* Existing Keys */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400">Active API Keys</h4>
          {(user.apiKeys || []).map(k => (
            <div key={k.id} className="p-4 rounded-2xl bg-dark-900 border border-white/5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{k.name}</p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">{k.key.slice(0, 14)}••••••••••••••••</p>
                <p className="text-[10px] text-slate-500 mt-1">Created: {k.created} • Usage: {k.callsCount} calls</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(k)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  {copiedKeyId === k.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKeyId === k.id ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDelete(k.id)}
                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* The real contract, for the route currently selected in the studio. */}
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            The gateway authorises with its own environment key for that provider, or with a per-request{' '}
            <code className="text-slate-400">byok.key</code> holding your vendor key. A{' '}
            <code className="text-slate-400">bh_live_…</code> value from the list above is never sent anywhere.
          </p>
          <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-brand-cyan" />
            <span>cURL Quickstart</span>
          </p>
          <div className="bg-dark-950 p-3.5 rounded-2xl font-mono text-xs text-slate-300 border border-white/5 overflow-x-auto">
            <pre className="whitespace-pre">{apiExamples}</pre>
          </div>
        </div>

      </div>
    </div>
  );
};
