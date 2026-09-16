// Potpisan (HMAC-SHA256) sesijski token - koristi Web Crypto API koji postoji
// i u Node.js (18+) i u Next.js Edge/middleware runtime-u, bez ikakvog dodatnog paketa.

const encoder = new TextEncoder();

function toBase64Url(bytes) {
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

// Napravi potpisan token koji istice posle maxAgeSeconds (podrazumevano 7 dana)
export async function signSession(payload, secret, maxAgeSeconds = 60 * 60 * 24 * 7) {
  if (!secret) throw new Error('SESSION_SECRET nije podesen');
  const data = { ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds };
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(data)));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(sig));
  return `${payloadB64}.${sigB64}`;
}

// Proveri token - vraca payload ako je ispravan i nije istekao, inace null
export async function verifySession(token, secret) {
  if (!token || !secret || !token.includes('.')) return null;
  const [payloadB64, sigB64] = token.split('.');
  try {
    const key = await getKey(secret);
    const sigBytes = fromBase64Url(sigB64);
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payloadB64));
    if (!valid) return null;
    const json = new TextDecoder().decode(fromBase64Url(payloadB64));
    const data = JSON.parse(json);
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}
