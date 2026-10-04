/**
 * Bring-your-own-key storage for the studio.
 *
 * Rules:
 *  - Keys live in `sessionStorage` by default (gone when the tab closes).
 *  - "Remember on this device" opts into localStorage, which persists across
 *    reloads and is readable by any script on the origin — the UI says so,
 *    because a browser is not a keystore.
 *  - A page that should never hold credentials uses gateway mode instead: the
 *    key stays in the gateway's environment and the browser only knows that a
 *    key exists (`configuredProviders` from /health).
 *  - Keys are never written to logs, toasts, or analytics payloads.
 */

import { readJSON, writeJSON, removeKey } from '../../utils/safeStorage.js';
import { PROVIDER_BY_ID, VIDEO_PROVIDERS } from '../../data/videoProviders.js';

const SESSION_KEY = 'ai-bhideo:provider-access:v1';
const LOCAL_KEY = 'ai-bhideo:provider-access:persisted:v1';
const SETTINGS_KEY = 'ai-bhideo:video-settings:v1';

const DEFAULT_SETTINGS = {
  /** '' means: try the same-origin gateway at /api/video, then fall back locally. */
  gatewayUrl: '',
  /** 'gateway' (env keys) | 'byok' (send the browser's key per request) | 'auto' */
  keyMode: 'auto',
  /** Hard guardrails applied client-side *and* server-side. */
  maxUsdPerClip: 0.5,
  monthlyBudgetUsd: 20,
  clipsThisMonth: 0,
  allowFallbackToLocal: true,
  preferFreeRoutes: true,
};

function readSession() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  } catch {
    /* storage blocked */
  }
  return null;
}

function writeSession(value) {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function sanitise(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const clean = {};
  for (const field of ['key', 'secret', 'accountId', 'baseUrl', 'headerName']) {
    const value = entry[field];
    if (typeof value === 'string' && value.trim()) clean[field] = value.trim();
  }
  if (entry.remember === true) clean.remember = true;
  return Object.keys(clean).length ? clean : null;
}

/** Load the effective access map: persisted entries merged with session-only ones. */
export function loadAccess() {
  const persisted = readJSON(LOCAL_KEY, {}) || {};
  const session = readSession() || {};
  const merged = {};
  for (const providerId of Object.keys(PROVIDER_BY_ID)) {
    const entry = sanitise({ ...persisted[providerId], ...session[providerId] });
    if (entry) merged[providerId] = { ...entry, remember: Boolean(persisted[providerId]) };
  }
  return merged;
}

export function saveProviderKey(providerId, values = {}) {
  const access = loadAccess();
  const next = sanitise({ ...(access[providerId] || {}), ...values });
  if (!next) {
    clearProviderKey(providerId);
    return null;
  }
  if (values.remember) {
    const persisted = readJSON(LOCAL_KEY, {}) || {};
    persisted[providerId] = { key: values.key, secret: values.secret, accountId: values.accountId, baseUrl: values.baseUrl, headerName: values.headerName };
    writeJSON(LOCAL_KEY, persisted);
    writeSession({ ...readSession(), [providerId]: next });
  } else {
    writeSession({ ...readSession(), [providerId]: next });
  }
  return next;
}

export function clearProviderKey(providerId) {
  const session = readSession() || {};
  delete session[providerId];
  writeSession(session);
  const persisted = readJSON(LOCAL_KEY, {}) || {};
  if (persisted[providerId]) {
    delete persisted[providerId];
    writeJSON(LOCAL_KEY, persisted);
  }
  const provider = PROVIDER_BY_ID[providerId];
  if (provider?.keyKind?.includes('localStorage')) removeKey(`ai-bhideo:key:${providerId}`);
}

export function clearAllProviderKeys() {
  for (const provider of VIDEO_PROVIDERS) clearProviderKey(provider.id);
}

export function maskKey(value) {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= 8) return '••••';
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

/** UI-facing status per provider: who can run right now, and why not. */
export function providerStatuses(access = loadAccess(), configuredProviders = []) {
  return VIDEO_PROVIDERS.map((provider) => {
    const entry = access[provider.id] || {};
    const hasLocalKey = Boolean(entry.key || entry.accountId || provider.id === 'custom');
    const hasServerKey = configuredProviders.includes(provider.id);
    const available = provider.id === 'local' || hasLocalKey || hasServerKey;
    const needs = [];
    if (provider.envVar && !hasLocalKey && !hasServerKey) needs.push(provider.envVar);
    for (const name of provider.extraEnvVars || []) if (!entry[name] && !configuredProviders.includes(provider.id)) needs.push(name);
    return {
      provider,
      available,
      hasLocalKey,
      hasServerKey,
      masked: hasLocalKey ? maskKey(entry.key || entry.accessKey) : '',
      needsKey: Boolean(provider.envVar),
      missingVars: available ? [] : needs,
      freeTier: provider.freeTier,
      retired: Boolean(provider.retired),
    };
  });
}

/** The BYOK payload for one request; only sent in byok mode. */
export function byokFor(providerId, access = loadAccess()) {
  const entry = access[providerId];
  if (!entry?.key && !entry?.accessKey) return undefined;
  const provider = PROVIDER_BY_ID[providerId];
  if (providerId === 'kling') return { accessKey: entry.key, secretKey: entry.secret };
  const payload = { key: entry.key };
  if (entry.accountId) {
    payload.accountId = entry.accountId;
    payload.CLOUDFLARE_ACCOUNT_ID = entry.accountId;
  }
  if (entry.baseUrl) payload.baseUrl = entry.baseUrl;
  for (const name of provider?.extraEnvVars || []) {
    if (entry[name]) payload[name] = entry[name];
  }
  if (entry.baseUrl) payload.baseUrl = entry.baseUrl;
  return payload;
}

export function loadSettings() {
  const stored = readJSON(SETTINGS_KEY, {}) || {};
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(patch = {}) {
  const next = { ...loadSettings(), ...patch };
  writeJSON(SETTINGS_KEY, next);
  return next;
}

export { DEFAULT_SETTINGS, SETTINGS_KEY };
