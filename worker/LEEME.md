# IA incluida de Michi Salud (Cloudflare Worker)

Guarda tu clave de Anthropic en el servidor. Los usuarios solo necesitan su cuenta de Michi Salud (Firebase); nadie ve la clave.

## Publicarlo (una sola vez, ~10 min)
1. Crea una cuenta gratis en https://dash.cloudflare.com.
2. En Cloudflare: **My Profile → API Tokens → Create Token → plantilla "Edit Cloudflare Workers"**. Copia el token.
   Copia también tu **Account ID** (aparece a la derecha en Workers & Pages).
3. En Anthropic (https://console.anthropic.com): crea una clave de API y fija un **límite de gasto mensual** (Settings → Limits).
4. En GitHub → repo `mi-tracker` → **Settings → Secrets and variables → Actions → New repository secret**, crea tres:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `ANTHROPIC_API_KEY`
5. GitHub → **Actions → "Publicar IA (Cloudflare)" → Run workflow**. Al terminar, la URL sale en el registro:
   `https://michi-salud-ia.<tu-subdominio>.workers.dev`
6. Pásame esa URL (o pégala en `www/index.html`, en `var MS_AI=''`). Con eso la opción "Michi Salud" aparece en la app y queda por defecto.

## Controles de costo
- Modelo: `MODEL` en `wrangler.toml` (por defecto Claude Haiku 5.5, el más económico).
- Máximo 1.200 tokens por respuesta, fijado por el servidor.
- Solo responde a usuarios con sesión iniciada.
- Límite diario por usuario (`DAILY_LIMIT`, 80): para activarlo, crea el KV como indica `wrangler.toml`.
