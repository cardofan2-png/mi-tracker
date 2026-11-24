// IA de MokiFit: recibe la conversación de la app, verifica que el usuario tenga sesión
// (token de Firebase), aplica los cupos y la reenvía a Anthropic con la clave guardada aquí.
// La app nunca ve la clave.
//
// Cupos (wrangler.toml → [vars]):
//   Gratis:  FREE_DAILY consultas de chat + FREE_PHOTOS fotos por día (hora de Colombia) y, entre todos los gratis,
//            máximo FREE_BUDGET_USD al mes de gasto real en Anthropic.
//   Premium: PREMIUM_DAILY consultas por día (chat y fotos juntos); planes/recetas solo Premium.
const PROJECT = 'mi-tracker-a6d2e';
const JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS' };
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

const isPremium = (env, uid) => (env.PREMIUM_UIDS || '').split(',').map(s => s.trim()).includes(uid);
// ponytail: Premium se otorga a mano con PREMIUM_UIDS; al conectar el pago, el webhook escribirá aquí.

// Contador de cupos: un solo Durable Object (SQLite, incluido en el plan gratis de Cloudflare).
// ponytail: un objeto global atiende ~1.000 consultas/s; repartir por usuario si algún día no alcanza.
export class Cupos {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS uso (uid TEXT, dia TEXT, n INTEGER, PRIMARY KEY (uid, dia))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS gasto (mes TEXT PRIMARY KEY, usd REAL)');
  }
  async fetch(req) {
    const q = await req.json(), dia = q.dia, mes = dia.slice(0, 7);
    const usados = () => (this.sql.exec('SELECT n FROM uso WHERE uid = ? AND dia = ?', q.uid, dia).toArray()[0] || { n: 0 }).n;
    const gastado = () => (this.sql.exec('SELECT usd FROM gasto WHERE mes = ?', mes).toArray()[0] || { usd: 0 }).usd;
    if (q.op === 'estado') return Response.json({ usados: usados(), gastado: gastado() });
    if (q.op === 'reservar') { // cuenta la consulta antes de llamar a Anthropic, para que no se pase por consultas simultáneas
      if (usados() >= q.max) return Response.json({ ok: false, motivo: 'LIMIT', usados: usados() });
      if (q.tope != null && gastado() >= q.tope) return Response.json({ ok: false, motivo: 'BUDGET', usados: usados() });
      this.sql.exec('INSERT INTO uso (uid, dia, n) VALUES (?, ?, 1) ON CONFLICT (uid, dia) DO UPDATE SET n = n + 1', q.uid, dia);
      return Response.json({ ok: true, usados: usados() });
    }
    if (q.op === 'cobrar') { // gasto real según los tokens que reportó Anthropic
      this.sql.exec('INSERT INTO gasto (mes, usd) VALUES (?, ?) ON CONFLICT (mes) DO UPDATE SET usd = usd + excluded.usd', mes, q.usd);
      return Response.json({ ok: true });
    }
    if (q.op === 'borrar') { // el usuario eliminó su cuenta: se borran sus contadores de uso
      this.sql.exec('DELETE FROM uso WHERE uid = ?', q.uid);
      return Response.json({ ok: true });
    }
    if (q.op === 'devolver') { // Anthropic falló: no se descuenta la consulta
      this.sql.exec('UPDATE uso SET n = MAX(n - 1, 0) WHERE uid = ? AND dia = ?', q.uid, dia);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'op' }, { status: 400 });
  }
}

// Día en hora de Colombia (UTC-5, sin horario de verano): el cupo se renueva a medianoche local.
const hoy = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    let uid;
    try { uid = await verify((req.headers.get('authorization') || '').replace(/^Bearer /, '')); }
    catch { return out(401, { error: { message: 'NOAUTH' } }); }

    const premium = isPremium(env, uid);
    const max = +(premium ? env.PREMIUM_DAILY || 80 : env.FREE_DAILY || 10);
    const tope = premium ? null : +(env.FREE_BUDGET_USD || 5);
    const cupos = env.CUPOS.get(env.CUPOS.idFromName('global'));
    const ask = body => cupos.fetch('https://cupos/', { method: 'POST', body: JSON.stringify({ uid, dia: hoy(), ...body }) }).then(r => r.json());
    const fmax = +(env.FREE_PHOTOS || 2), diaF = hoy() + ':foto'; // las fotos gratis llevan su propio contador
    const cupo = (usados, fu) => premium ? { premium, usados, max } : { premium, usados, max, fotos: { usados: fu, max: fmax } };

    if (req.method === 'GET') { // estado del cupo para mostrar en la app
      const e = await ask({ op: 'estado' }), f = premium ? {} : await ask({ op: 'estado', dia: diaF });
      return out(200, { cupo: cupo(e.usados, f.usados), disponible: premium || e.gastado < tope });
    }
    if (req.method === 'DELETE') { await ask({ op: 'borrar' }); return out(200, { ok: true }); } // eliminar cuenta
    if (req.method !== 'POST') return out(405, { error: 'POST' });

    let b;
    try { b = await req.json(); } catch { return out(400, { error: { message: 'JSON' } }); }
    if (!Array.isArray(b.messages) || !b.messages.length || b.messages.length > 40) return out(400, { error: { message: 'messages' } });

    // Planes/recetas: solo Premium. Fotos: 2 al día gratis. La foto se detecta aquí, no se confía en la app.
    const foto = b.messages.some(m => Array.isArray(m.content) && m.content.some(c => c && c.type === 'image'));
    if (!premium && b.kind === 'plan') return out(402, { error: { message: 'PREMIUM' }, cupo: cupo(null, null) });
    const fg = foto && !premium; // foto de usuario gratis: descuenta del contador de fotos
    const cu = n => fg ? cupo(null, n) : cupo(n, null);

    const r0 = await ask(fg ? { op: 'reservar', max: fmax, tope, dia: diaF } : { op: 'reservar', max, tope });
    if (!r0.ok) return out(r0.motivo === 'LIMIT' ? 429 : 503, { error: { message: r0.motivo === 'LIMIT' && fg ? 'LIMIT_FOTO' : r0.motivo }, cupo: cu(r0.usados) });

    // El modelo y el tope de tokens los decide el servidor, no la app
    let r, j;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: env.MODEL || 'claude-haiku-5-5', max_tokens: Math.min(+b.max_tokens || 800, 1200), system: typeof b.system === 'string' ? b.system.slice(0, 8000) : undefined, messages: b.messages }),
      });
      j = await r.json();
    } catch { r = { ok: false, status: 502 }; j = { error: { message: 'UPSTREAM' } }; }

    if (!r.ok) { await ask(fg ? { op: 'devolver', dia: diaF } : { op: 'devolver' }); return out(r.status, { ...j, cupo: cu(Math.max(r0.usados - 1, 0)) }); }
    const u = j.usage || {};
    const usd = ((u.input_tokens || 0) + (u.cache_creation_input_tokens || 0)) * (+env.PRICE_IN || 0.1) / 1e6
      + (u.cache_read_input_tokens || 0) * (+env.PRICE_IN || 0.1) / 1e7
      + (u.output_tokens || 0) * (+env.PRICE_OUT || 0.5) / 1e6;
    if (!premium) await ask({ op: 'cobrar', usd }); // el tope de USD 5 cuenta solo lo que gastan los usuarios gratis
    return out(200, { ...j, cupo: cu(r0.usados) });
  },
};
