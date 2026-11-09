// Protects /api/leads/* (lead names and phones). Only requests that passed Cloudflare Access get through.
// Cloudflare Access adds a signed JWT (Cf-Access-Jwt-Assertion); we verify its signature, audience,
// issuer and expiry here too, so the data stays closed even if the Access rule is missing or misconfigured.
// Needs env ACCESS_TEAM_DOMAIN (https://<team>.cloudflareaccess.com) and ACCESS_AUD (the application's AUD tag).
// Fails closed: without both settings, nobody can read the leads.

const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

let certCache = { at: 0, keys: [] };
async function accessKeys(team) {
  if (Date.now() - certCache.at < 10 * 60 * 1000 && certCache.keys.length) return certCache.keys;
  const r = await fetch(`${team}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error('certs');
  const { keys = [] } = await r.json();
  certCache = { at: Date.now(), keys };
  return keys;
}

export async function verifyAccess(request, env) {
  const team = String(env.ACCESS_TEAM_DOMAIN || '').replace(/\/+$/, '');
  const aud = String(env.ACCESS_AUD || '');
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!team || !aud || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(b64url(parts[1])));
    if (header.alg !== 'RS256') return null;
    const jwk = (await accessKeys(team)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const now = Math.floor(Date.now() / 1000);
    const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!auds.includes(aud) || payload.iss !== team || !(payload.exp > now) || (payload.nbf && payload.nbf > now + 60)) return null;
    return { email: payload.email || '' };
  } catch { return null; }
}

export async function onRequest(context) {
  const who = await verifyAccess(context.request, context.env);
  if (!who) return json({ error: 'not_authorized' }, 401);
  context.data.user = who;
  return context.next();
}
