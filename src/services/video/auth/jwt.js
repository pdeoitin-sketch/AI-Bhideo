/**
 * Minimal HS256 JWT signing with Web Crypto, so the same code runs in Node 18+
 * (dev gateway) and in a Cloudflare Worker. Only the gateway ever holds the
 * secret pair; the browser receives a short-lived signed request, never a key.
 */

function encoding() {
  if (typeof TextEncoder === 'undefined') throw new Error('TextEncoder is unavailable in this runtime.');
  return new TextEncoder();
}

function toBase64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  if (typeof btoa === 'function') return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64url');
  throw new Error('No base64 encoder available in this runtime.');
}

export function cryptoReady(cryptoObj = globalThis.crypto) {
  return Boolean(cryptoObj?.subtle);
}

export async function signHs256(claims, secret, { cryptoObj = globalThis.crypto } = {}) {
  if (!cryptoReady(cryptoObj)) throw new Error('Web Crypto is required to sign this provider token but is unavailable here.');
  const encoder = encoding();
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodePart = (value) => toBase64Url(encoder.encode(JSON.stringify(value)));
  const signingInput = `${encodePart(header)}.${encodePart(claims)}`;
  const key = await cryptoObj.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await cryptoObj.subtle.sign('HMAC', key, encoder.encode(signingInput));
  return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Kling issues a JWT from an access key + secret; tokens are ~30 min by design. */
export async function klingJwt({ accessKey, secretKey, ttlSeconds = 1800, cryptoObj } = {}) {
  if (!accessKey || !secretKey) throw new Error('Kling needs both KLING_ACCESS_KEY and KLING_SECRET_KEY.');
  const now = Math.floor(Date.now() / 1000);
  return signHs256({ iss: accessKey, exp: now + ttlSeconds, nbf: now - 5 }, secretKey, { cryptoObj });
}
