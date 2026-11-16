# Michi Salud – app Android

App personal de seguimiento de tratamiento, comidas y peso, conectada a **Health Connect** (báscula, reloj, Samsung Health).

## Obtener el APK
- **Automático:** sube esta carpeta a un repositorio de GitHub (rama `main`). GitHub Actions compila solo y deja `MichiSalud.apk` en *Releases → Michi Salud (última versión)*.
- **Manual:** con Android Studio, `npm install`, `npx cap sync android`, abre la carpeta `android/` y usa *Build → Build APK(s)*.

## Instalar en el teléfono
1. Descarga `MichiSalud.apk` en el celular y ábrelo.
2. Acepta "Permitir instalar apps de esta fuente" (solo la primera vez).
3. Abre Michi Salud → Mi plan → Conexiones → **Conectar** Health Connect y marca los permisos.
4. En Samsung Health: Ajustes → Health Connect → permite compartir peso, pasos, ejercicio y frecuencia cardiaca. Haz lo mismo en la app de tu báscula si tiene la opción.

## IA (Mochi y cálculo automático de comidas)
La IA viene incluida: nadie tiene que poner su propia clave. Funciona con un servidor propio en Cloudflare que guarda la clave de Anthropic (ver `worker/LEEME.md`). Mientras no esté publicado, la app funciona igual y calcula las comidas con su tabla interna.
