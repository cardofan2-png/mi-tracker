// IA de Michi Salud: recibe la conversación de la app, verifica que el usuario tenga sesión
// (token de Firebase) y la reenvía a Anthropic con la clave guardada aquí. La app nunca ve la clave.
const PROJECT = 'mi-tracker-a6d2e';
const JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'POST, OPTIONS' };
const out = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors } });
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));

let keys = null, keysExp = 0;
async function verify(tok) {
  const [h, p, sig] = String(tok).split('.');
  if (!sig) throw 0;
  const head = JSON.parse(new TextDecoder().decode(b64u(h))), pay = JSON.parse(new TextDecoder().decode(b64u(p)));
  if (Date.now() > keysExp) { const r = await fetch(JWKS); keys = (await r.json()).keys; keysExp = Date.now() + 3600e3; }
  const jwk = keys.find(k => k.kid === head.kid);
  if (!jwk || head.alg !== 'RS256') throw 0;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(sig), new TextEncoder().encode(h + '.' + p));
  const now = Date.now() / 1000;
  if (!ok || pay.aud !== PROJECT || pay.iss !== 'https://securetoken.google.com/' + PROJECT || pay.exp < now || !pay.sub) throw 0;
  return pay.sub;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return out(405, { error: 'POST' });
    let uid;
    try { uid = await verify((req.headers.get('authorization') || '').replace(/^Bearer /, '')); }
    catch { return out(401, { error: { message: 'NOAUTH' } }); }
    // Límite diario por usuario (solo si conectaste el KV "LIMITS")
    const max = +(env.DAILY_LIMIT || 80);
    if (env.LIMITS) {
      const k = uid + ':' + new Date().toISOString().slice(0, 10), n = +(await env.LIMITS.get(k) || 0);
      if (n >= max) return out(429, { error: { message: 'LIMIT' } });
      await env.LIMITS.put(k, String(n + 1), { expirationTtl: 172800 });
    }
    let b;
    try { b = await req.json(); } catch { return out(400, { error: { message: 'JSON' } }); }
    if (!Array.isArray(b.messages) || !b.messages.length || b.messages.length > 40) return out(400, { error: { message: 'messages' } });
    // El modelo y el tope de tokens los decide el servidor, no la app
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: env.MODEL || 'claude-haiku-5-5', max_tokens: Math.min(+b.max_tokens || 800, 1200), system: typeof b.system === 'string' ? b.system.slice(0, 8000) : undefined, messages: b.messages }),
    });
    return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json', ...cors } });
  },
};
