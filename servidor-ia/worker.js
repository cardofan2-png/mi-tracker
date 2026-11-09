// Intermediario de IA de Michi Salud (Cloudflare Worker, plan gratis).
// La app le manda la consulta; el Worker le agrega la clave de Google AI Studio (guardada como secreto GEMINI_KEY)
// y se la pasa a Gemini. La clave nunca queda en el teléfono.
// ponytail: sin límite por usuario en el servidor; el plan gratis de Google pone el tope total y la app limita 40/día.
// Si alguien abusa: agregar Rate Limiting de Cloudflare o exigir el token de la cuenta de Firebase.
const MODELO = 'gemini-3.5-flash-lite';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-app',
};

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const json = (o, status) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'content-type': 'application/json' } });
    if (req.method !== 'POST' || req.headers.get('x-app') !== 'michi-salud') return json({ error: { message: 'No permitido' } }, 403);
    const texto = await req.text();
    if (texto.length > 6_000_000) return json({ error: { message: 'Consulta demasiado grande' } }, 413);
    let body;
    try { body = JSON.parse(texto); } catch { return json({ error: { message: 'JSON inválido' } }, 400); }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
      body: JSON.stringify({ contents: body.contents, generationConfig: body.generationConfig }),
    });
    return new Response(await r.text(), { status: r.status, headers: { ...CORS, 'content-type': 'application/json' } });
  },
};
