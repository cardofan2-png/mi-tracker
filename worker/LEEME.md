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

## Cupos y controles de costo
Se ajustan en `wrangler.toml` → `[vars]`:
- **Gratis:** `FREE_DAILY` = 10 consultas por día por usuario (se renuevan a medianoche, hora de Colombia).
- **Tope mensual de los gratis:** `FREE_BUDGET_USD` = 5. Se suma el gasto real (tokens que reporta Anthropic) de todos los usuarios gratis; al llegar a USD 5 en el mes, la IA gratis se pausa hasta el mes siguiente y la app ofrece Premium.
- **Premium:** `PREMIUM_DAILY` = 80 por día. Fotos (comida y báscula) y planes/recetas son solo Premium; el servidor detecta las fotos, no confía en la app.
- **Dar Premium a mano** (mientras se conecta el pago): pon el UID de Firebase del usuario en `PREMIUM_UIDS` (separados por coma). El UID está en Firebase → Authentication → Users.
- Modelo `MODEL` (Claude Haiku 5.5) y máximo 1.200 tokens por respuesta, fijados por el servidor.
- Solo responde a usuarios con sesión iniciada.
- El contador usa Durable Objects con SQLite, incluido en el plan gratis de Cloudflare: no hay que crear nada.
