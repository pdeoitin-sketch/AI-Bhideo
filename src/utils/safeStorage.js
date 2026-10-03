// localStorage wrapper that never throws.
//
// Why this exists: AppContext reads localStorage inside useState initialisers,
// i.e. during the very first render. If a stored value is corrupted, or the
// browser blocks storage access (sandboxed iframe / private mode / strict
// third-party cookie settings), a plain `localStorage.getItem` or `JSON.parse`
// would throw during render and React would unmount the whole tree — leaving a
// completely blank page. Every access is therefore guarded.

const memoryFallback = new Map();

function getStore() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Touch the API once to be sure it is really usable (some browsers only
      // throw on access, not on the property lookup).
      const probe = '__bhideo_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch {
    // Storage blocked — fall through to the in-memory fallback.
  }
  return null;
}

export function readJSON(key, fallback) {
  try {
    const store = getStore();
    if (store) {
      const raw = store.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    }
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn(`[AI-Bhideo] Could not read "${key}" from storage, using defaults.`, err);
    }
    return fallback;
  }
  return memoryFallback.has(key) ? memoryFallback.get(key) : fallback;
}

export function writeJSON(key, value) {
  try {
    const store = getStore();
    if (store) store.setItem(key, JSON.stringify(value));
    else memoryFallback.set(key, value);
  } catch (err) {
    // Quota exceeded or storage blocked: keep the value for this session only.
    memoryFallback.set(key, value);
  }
}

export function removeKey(key) {
  try {
    const store = getStore();
    if (store) store.removeItem(key);
  } catch {
    /* ignore */
  }
  memoryFallback.delete(key);
}
