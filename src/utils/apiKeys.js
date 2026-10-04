export function createApiKeyRecord(name, now = new Date(), random = Math.random) {
  const label = String(name ?? '').trim();
  if (!label) return null;

  const randomSuffix = `${random().toString(36).slice(2)}${random().toString(36).slice(2)}`;
  const timestamp = now instanceof Date ? now.getTime() : new Date(now).getTime();

  return {
    id: `key_${Number.isFinite(timestamp) ? timestamp : Date.now()}_${randomSuffix.slice(0, 8)}`,
    name: label,
    key: `bh_live_${randomSuffix}`,
    created: new Date(Number.isFinite(timestamp) ? timestamp : Date.now()).toISOString().split('T')[0],
    lastUsed: 'Never',
    callsCount: 0,
  };
}

/** Return a new key list after revocation, leaving the original list untouched. */
export function withoutApiKey(apiKeys, keyId) {
  const keys = Array.isArray(apiKeys) ? apiKeys : [];
  if (!keyId) return keys;

  const remainingKeys = keys.filter((key) => key?.id !== keyId);
  return remainingKeys.length === keys.length ? keys : remainingKeys;
}
