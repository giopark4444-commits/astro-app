# 🚀 Poner Aluna en vivo — Hetzner + Coolify (paso a paso, sin enredos)

> Síguela con calma cuando estés fresco. **No tienes que entender todo — solo seguir los pasos.**
> Si algo se pone rojo o una pantalla se ve distinta, cópiame el mensaje/screenshot y lo resolvemos.

## 📋 Antes de empezar, ten a mano
- Tu login de **GitHub** (donde vive `astro-app`).
- Tus 2 valores de **Supabase** (están en `apps/web/.env.local`):
  - **URL:** `https://xcilrdpcanielalpfvld.supabase.co`
  - **anon key:** la cadena larga que empieza con `eyJ...` (cópiala de `.env.local`).
- Una **tarjeta** para Hetzner (~€8/mes — un solo servidor para todas tus apps).
- ~40 min con paciencia.

---

## 🟢 PASO 1 — Crear el servidor (Hetzner)
1. Entra a **console.hetzner.cloud** → crea cuenta / inicia sesión.
2. **+ New Project** → nómbralo `apps` → ábrelo.
3. **+ Add Server** y elige:
   | Campo | Qué poner |
   |---|---|
   | **Location** | Ashburn, VA (US East) — más cerca de LATAM |
   | **Image** | Ubuntu 24.04 |
   | **Type** | **CX32** (8 GB, ~€8/mes). Mínimo: CX22 (4 GB, ~€5) |
   | **SSH key** | sáltalo — Hetzner te dará una **contraseña de root** (anótala) |
   | **Name** | `aluna-server` |
4. **Create & Buy.** En ~30 seg estará listo. **Copia la IP** (ej. `5.161.x.x`).

---

## 🟢 PASO 2 — Instalar Coolify
1. En Hetzner: clic en tu servidor → botón **"Console"** (ícono `>_`, arriba derecha). Abre una terminal negra en el navegador.
2. En `login:` escribe **`root`** + Enter → pega la **contraseña de root** (clic derecho → pegar; **no se ve al teclear, es normal**) + Enter.
3. Pega este comando + Enter:
   ```
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
4. Espera ~3-5 min. Al final te dice que Coolify está en `http://TU-IP:8000`.

---

## 🟢 PASO 3 — Configurar Coolify (primera vez)
1. En tu navegador abre **`http://TU-IP:8000`** (reemplaza TU-IP por tu IP).
2. Crea tu **cuenta de admin de Coolify** (tu email + contraseña). Guárdala — es tu llave de Coolify.
3. Sigue el asistente inicial (acepta los defaults; el servidor "localhost" ya queda conectado).

---

## 🟢 PASO 4 — Conectar GitHub y desplegar Aluna
1. En Coolify → **Sources** (o Settings → GitHub Apps) → **conecta GitHub** → autoriza Coolify para el repo `astro-app`.
2. **+ New** → crea un **Project** → dentro, **+ New Resource** → **Private Repository (with GitHub App)** → elige **`astro-app`**, rama **`main`**.
3. Cuando pregunte cómo construir:
   - **Build Pack:** `Dockerfile`
   - **Dockerfile Location:** `/Dockerfile`
   - **Base Directory:** `/`
   - **Port (Ports Exposes):** `3000`
4. **Environment Variables** → agrega estas 2 y **marca CADA una como "Build Variable"** ⚠️ (si no, el navegador no conecta a Supabase):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://xcilrdpcanielalpfvld.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(tu anon key de `.env.local`)*
   - *(Las opcionales — `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` — para después.)*
5. **Deploy.** Construye la imagen (~5-10 min la 1ª vez). Verás los logs corriendo.

---

## 🟢 PASO 5 — Dominio + HTTPS (el candado 🔒)
- Coolify da una URL temporal para probar ya.
- Para HTTPS bonito con tu dominio (ej. `aluna.app`): en el servicio → **Domains** → escribe `https://tu-dominio` → Coolify saca el **certificado SSL solo** (Let's Encrypt). En tu proveedor de dominio, apunta un registro **A** a la IP de Hetzner.

---

## 🟢 PASO 6 — Verificar (¡el momento!) 🎉
Abre tu URL → **regístrate** → onboarding → **/carta**.
**Si la rueda se dibuja → Aluna está EN VIVO.** (Eso confirma que el motor nativo cargó.)

---

## 🆘 Si algo se pone rojo
Cópiame el **log de Coolify** (o un screenshot) y lo cazo. Lo que suele trabarse:
- **Build sin memoria:** sube el servidor a 8 GB temporalmente (CX32) y redespliega.
- **Pantalla en blanco / login no conecta:** casi siempre es que las 2 `NEXT_PUBLIC_*` no quedaron como **Build Variable** → márcalas y redespliega.

> Cuando enciendas las llaves de IA: agrega `ANTHROPIC_API_KEY` (o OpenAI/Gemini) y `SUPABASE_SERVICE_ROLE_KEY` como variables normales (runtime, NO build) y redespliega. Ahí se prenden las lecturas largas + el chat + el caché durable.
