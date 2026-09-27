// İmzalı oturum çerezi: veritabanına gitmeden, ortam değişkenindeki
// SESSION_SECRET ile imzalanmış bir çerez üzerinden kullanıcının
// giriş yapmış olduğunu doğrularız. Middleware (edge) içinde de
// çalışsın diye Web Crypto API kullanıyoruz.

const encoder = new TextEncoder();

async function getKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toB64Url(bytes) {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

export async function signSession(payloadObj, secret) {
  const payload = JSON.stringify(payloadObj);
  const payloadB64 = toB64Url(encoder.encode(payload));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const sigB64 = toB64Url(new Uint8Array(sig));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySession(token, secret) {
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromB64Url(sigB64),
      encoder.encode(payloadB64)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(payloadB64)));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
