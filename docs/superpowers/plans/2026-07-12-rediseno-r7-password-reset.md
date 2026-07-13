# R7 — Recuperación de contraseña: plan de implementación

> **Para ejecutores:** SUB-SKILL: subagent-driven-development. Cada tarea con su entregable verificable.

**Goal:** flujo forgot/reset de contraseña en web y móvil, siguiendo el patrón de login/signup ya existente. Cierra un hueco de auth que hoy pierde cuentas.

**Arquitectura:** Supabase Auth estándar — `resetPasswordForEmail(email, { redirectTo })` manda un email; el link abre la página de reset con una sesión de recovery (auto-detectada de la URL por `@supabase/ssr` en web); la página llama `updateUser({ password })`. Web sigue el patrón login/signup (Server Component + form; primitivo `card card--elevated`; avisos por `?error=<code>`); la página de reset es la EXCEPCIÓN (client component, necesita detectar la sesión). Móvil espeja login.tsx/signup.tsx + deep-link `aluna://`. Emails: mismo mecanismo que la confirmación de signup (ya vivo); delivery vía SMTP de Supabase (default rate-limited salvo SMTP propio de Gio).

**Tech:** Next 16 App Router + `@supabase/ssr` (web), Expo SDK 56 + expo-router (móvil), Supabase Auth.

## Global Constraints
- `/auth` YA es prefijo público (`PUBLIC_PREFIXES` en `apps/web/lib/supabase/middleware.ts`) → páginas bajo `app/auth/*` NO requieren tocar middleware. Confirmado por el test `isPublicPath("/auth/confirm")`.
- Web: `resetPasswordForEmail`/`updateUser` desde `apps/web/lib/supabase/client.ts` (`createClient()` = browser client `@supabase/ssr`). NUNCA el service-role.
- Seguir el patrón exacto de login/signup: Server Component page + client form + Server Action donde aplique; avisos por `?error=<code>` → `authMessageKey` → i18n namespace `auth`; clases de `auth.module.css` + `card card--elevated`; validación en `app/auth/validation.ts` con tests.
- Móvil: espejar login.tsx/signup.tsx (function component + useState + Card/FadeIn + `useT()` flat `auth.*`); métodos nuevos en `lib/auth-context.tsx` con la forma `{error: string|null}`. NUNCA importar `@aluna/ephemeris`/`@aluna/compute`.
- i18n en AMBOS idiomas (es.json + en.json web; strings móvil) — mismas claves.
- Reset page: estados claros — sesión-recovery-válida (form de nueva contraseña), sin-sesión (link inválido/expirado + link a forgot), éxito (→ login/hoy), error.

---

### Task 1: Web — validación, códigos de error e i18n (foundation)

**Files:** Modify `apps/web/app/auth/validation.ts` (+ test), `apps/web/app/auth/auth-error.ts` (+ test), `apps/web/messages/{en,es}.json`.

- [ ] **Step 1:** en `validation.ts`, añadir `parseEmail(formData): {ok:true,value:string}|{ok:false,error:"email"}` (reusa la validación de email de `parseCredentials`, solo email). Test primero (mirror `validation.test.ts`): email válido → ok; vacío/inválido → error "email".
- [ ] **Step 2:** en `auth-error.ts`, añadir códigos al mapa `KEYS`: `reset_sent: "resetLinkSent"`, `reset_invalid: "errResetLink"`, `reset_ok: "resetSuccess"`. Test (mirror `auth-error.test.ts`).
- [ ] **Step 3:** claves i18n `auth` en `en.json` Y `es.json` (mismas claves): `forgotPassword` ("¿Olvidaste tu contraseña?"), `forgotTitle`, `forgotBody` (instrucción), `sendResetLink`, `resetLinkSent` (aviso éxito forgot), `resetTitle`, `newPassword`, `confirmPassword`, `updatePassword`, `resetSuccess`, `errResetLink` (link inválido/expirado), `errPasswordMatch`, `backToLogin`. Voz Aluna (cálida, no genérica). Verificar paridad con el test de i18n existente.
- [ ] **Step 4:** gate `npx tsc --noEmit && npx vitest run` verde. Commit.

---

### Task 2: Web — página forgot + link desde login

**Files:** Create `apps/web/app/auth/forgot/page.tsx`, `apps/web/app/auth/forgot/forgot-form.tsx`; Modify `apps/web/app/login/page.tsx` (o login-form) para el link.

- [ ] **Step 1:** `forgot/page.tsx` = Server Component que ESPEJA `login/page.tsx` (shell + Starfield + mark + `card card--elevated`; guard `getUser()`→redirect si ya logueado; `authMessageKey` del `?error`; render `<ForgotForm />`; link "Volver a iniciar sesión" → /login).
- [ ] **Step 2:** `forgot-form.tsx` = client component (mirror `login-form.tsx` pero con estado, porque llama Supabase desde el browser): input email (clases `auth.module.css`), botón `sendResetLink`, estado busy/notice. onSubmit: `parseEmail` local → `createClient().auth.resetPasswordForEmail(email, { redirectTo: ${NEXT_PUBLIC_APP_URL}/auth/reset })` → SIEMPRE mostrar el aviso `resetLinkSent` (no revelar si el email existe — anti-enumeración), aun si hay error (loguear el error, no mostrarlo). Usar el slot `.notice`/`.error` del patrón.
- [ ] **Step 3:** en `login/page.tsx` (o login-form.tsx), añadir `<Link href="/auth/forgot">{t("forgotPassword")}</Link>` (clase `.switch` o similar del patrón).
- [ ] **Step 4:** gate tsc+vitest+next build verde. Commit. (Verificación en navegador en Fase 5.)

---

### Task 3: Web — página reset (detecta sesión recovery)

**Files:** Create `apps/web/app/auth/reset/page.tsx` (+ un client component si se separa).

- [ ] **Step 1:** `reset/page.tsx` = **client component** ("use client"). En mount: `const supabase = createClient()`. `@supabase/ssr` auto-detecta la sesión de recovery del hash de la URL — usar `supabase.auth.getSession()` (y/o `onAuthStateChange` para el evento `PASSWORD_RECOVERY`) para saber si hay sesión de recovery. Estado: `checking` (inicial) → `ready` (hay sesión, mostrar form) | `invalid` (no hay sesión → "link inválido o expirado" + Link a /auth/forgot).
- [ ] **Step 2:** form de nueva contraseña (2 inputs: newPassword + confirmPassword, minLength 8, clases del patrón). onSubmit: validar que coinciden (si no → `errPasswordMatch`); `supabase.auth.updateUser({ password })` → éxito: redirect `/login?error=reset_ok` (reusa el banner, muestra `resetSuccess`) o a /hoy; error → mostrar `errResetLink`. Estado busy.
- [ ] **Step 3:** shell visual igual que login/forgot (`card card--elevated`, Starfield, mark). Reduced-motion N/A (sin animación nueva).
- [ ] **Step 4:** gate tsc+vitest+next build verde. Commit.

---

### Task 4: Móvil — screens forgot/reset + métodos auth-context + deep-link

**Files:** Create `apps/mobile/app/forgot-password.tsx`, `apps/mobile/app/reset-password.tsx`; Modify `apps/mobile/lib/auth-context.tsx`, y el link desde login.tsx.

**⚠️ Leer `apps/mobile/AGENTS.md` + docs v56 antes de tocar expo-router/linking.**

- [ ] **Step 1:** en `auth-context.tsx`, añadir `resetPassword(email): Promise<{error: string|null}>` (`supabase.auth.resetPasswordForEmail(email, { redirectTo: "aluna://reset-password" })`) y `updatePassword(password): Promise<{error: string|null}>` (`supabase.auth.updateUser({ password })`), misma forma que `signIn`.
- [ ] **Step 2:** `forgot-password.tsx` = espeja `login.tsx` (function component, useState email/busy/error/notice, Card/FadeIn, `useT()`). Botón → `resetPassword` → mostrar `notice` (auth.resetLinkSent) siempre (anti-enumeración). Link "Volver".
- [ ] **Step 3:** `reset-password.tsx` = pantalla que el deep-link `aluna://reset-password` abre. Al abrir, la sesión de recovery llega vía `onAuthStateChange` (PASSWORD_RECOVERY) en auth-context (que ya usa onAuthStateChange) — mostrar form nueva contraseña → `updatePassword` → éxito → router a login/tabs. Sin sesión → aviso link inválido.
- [ ] **Step 4:** link "¿Olvidaste tu contraseña?" en login.tsx → router a /forgot-password. Claves i18n `auth.*` móvil (mismas que web).
- [ ] **Step 5:** gate `npx tsc --noEmit && npx vitest run && npx expo export --platform ios` verde. Commit. (Deep-link + flujo real = validación de Gio en dispositivo; el allow-list de Redirect URLs en Supabase también.)

---

### Task 5: Doc — config de email Supabase

**Files:** Create `docs/auth-password-reset.md`.

- [ ] **Step 1:** documentar lo que Gio debe hacer en el dashboard de Supabase para que R7 funcione end-to-end: (a) **Redirect URLs allow-list** (Authentication → URL Configuration): añadir `${PUBLIC_BASE_URL}/auth/reset` (web) + `aluna://reset-password` (móvil); (b) **plantilla de email "Reset Password"** (Authentication → Email Templates) con la voz de Aluna, ES/EN si aplica (Supabase no i18n-a templates nativamente — nota); (c) **SMTP**: si sigue en el default de Supabase (rate-limited ~2-4/h), recomendar SMTP propio (Resend/Postmark) antes del lanzamiento — misma caveat que la confirmación de signup ya tiene hoy. (d) el flujo: forgot → email → link → reset page (web) / deep-link (móvil) → updateUser.
- [ ] **Step 2:** commit.

---

## Self-Review
- Cobertura: validación/i18n (T1) → forgot web (T2) + reset web (T3) → móvil (T4) + doc (T5). Anti-enumeración (siempre "revisa tu correo"). `/auth` público sin tocar middleware. Reset page = client (detecta sesión).
- Verificable por el controlador: render de forgot/reset web + la llamada forgot + estados de la reset page (sin-sesión visible navegando directo a /auth/reset). El flujo email→link→updateUser real lo valida Gio (o con link de recovery admin-generado si consigo el service key). Móvil = Gio en dispositivo.
- Latente en Gio: Redirect URLs allow-list + plantilla de email + (opcional) SMTP propio + deep-link móvil.
