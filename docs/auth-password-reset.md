# Recuperación de contraseña (R7) — config de Supabase

El flujo forgot/reset está construido en la app (web `app/auth/forgot` + `app/auth/reset`;
móvil `app/forgot-password` + `app/reset-password`). Para que funcione **end-to-end** hace
falta configurar el proyecto de Supabase (`xcilrdpcanielalpfvld`) desde el dashboard.

## El flujo

1. El usuario entra a **Forgot** (`/auth/forgot` web · `aluna://` app), pone su correo.
2. La app llama `supabase.auth.resetPasswordForEmail(email, { redirectTo })`. **Anti-enumeración:**
   siempre muestra "revisa tu correo", exista o no la cuenta (no filtra qué emails están registrados).
3. Supabase manda un email con un enlace al `redirectTo` + un token de recovery.
4. El enlace abre la página **Reset** con una sesión de recovery → el usuario elige nueva
   contraseña → `supabase.auth.updateUser({ password })` → listo.

## Lo que Gio debe configurar en el dashboard

### 1. Redirect URLs (Authentication → URL Configuration → Redirect URLs)
Añadir a la allow-list (Supabase rechaza redirects a URLs no listadas):
- **Web:** `${PUBLIC_BASE_URL}/auth/reset` (p.ej. `https://aluna.app/auth/reset`) + para dev
  local `http://localhost:3002/auth/reset`.
- **Móvil:** `aluna://reset-password` (el deep-link; el scheme `aluna` ya está en `app.json`).

### 2. Plantilla de email "Reset Password" (Authentication → Email Templates → Reset Password)
Reescribir con la **voz de Aluna** (cálida, evolutiva — no el texto genérico de Supabase).
Nota: Supabase NO internacionaliza las plantillas nativamente (una sola plantilla por proyecto);
si se quiere ES/EN habría que decidir un idioma default o usar un servicio de email externo con
lógica de idioma. Variables disponibles: `{{ .ConfirmationURL }}` (el enlace de reset), etc.

### 3. SMTP (Authentication → Settings → SMTP Settings) — ⚠️ caveat de lanzamiento
Si sigue en el **email service default de Supabase**, está fuertemente rate-limited (~2-4 emails/
hora) y solo para bajo volumen — **igual que la confirmación de signup que ya funciona hoy**. Para
producción real: configurar **SMTP propio** (Resend / Postmark / SES). Esta es la misma deuda que
Loopkeeper ("SMTP propio pendiente"); no bloquea el flujo pero sí el volumen.

## Qué está verificado y qué falta

- **Web verificado en navegador** (por el controlador): render de forgot + reset, estado "inválido"
  sin sesión de recovery, estado "form" con sesión. Falta solo el round-trip real del email (depende
  del SMTP/allow-list de arriba).
- **Móvil:** screens + auth-context + deep-link construidos; el establecimiento de la sesión de
  recovery desde el deep-link en RN (Supabase `detectSessionInUrl` es web-only → manejo manual del
  token) y el flujo completo **los valida Gio en Expo Go / dispositivo** con el allow-list puesto.
