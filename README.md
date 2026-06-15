# Aluna 🌙

Plataforma multi-sistema de **autoconocimiento**: astrología occidental (carta astral), numerología,
y —por fases— horóscopo chino, Ba Zi y Saju coreano. Web (Next.js) + móvil (Expo) sobre un backend
compartido. Bonita, precisa, y con un **Modo Pro** pensado para que un astrólogo profesional la respete.

> El nombre **Aluna** viene del pueblo kogi (Sierra Nevada de Santa Marta): la consciencia originaria
> desde donde todo se manifiesta. Lleva *luna* dentro.

## Monorepo

```
packages/core         @aluna/core — TypeScript ISOMÓRFICO (RN-safe, va en web y móvil)
                      · Numerología pitagórica completa (núcleo, ciclos, pináculos, kármicos…)
                      · Dominio de carta: signos, dignidades, aspectos, distribución, patrones
packages/ephemeris    @aluna/ephemeris — SOLO SERVIDOR (addon nativo)
                      · Swiss Ephemeris (sweph) + zona horaria histórica (luxon)
                      · computeChart(): carta natal precisa (validada al arcominuto)
packages/supabase     @aluna/supabase — SDK tipado + tipos del esquema
                      · createBrowserSupabaseClient (público/anon, RN-safe, respeta RLS)
                      · createServiceSupabaseClient (service-role, SOLO SERVIDOR, "./server")
packages/compute      @aluna/compute — SOLO SERVIDOR — servicio de cómputo de carta
                      · cacheKey() determinista + getOrComputeChart() (lee-o-calcula y cachea)
supabase/             Esquema + RLS + migraciones del backend (proyecto "aluna")
docs/superpowers/     Spec de diseño (specs/) y planes de implementación (plans/)
```

**Regla arquitectónica (para App Store / Play Store):** `@aluna/core` es isomórfico y se importa tal
cual en la app móvil; todo lo nativo/servidor (Swiss Ephemeris) vive en `@aluna/ephemeris` y el móvil
lo consume por API. El cálculo **no** corre en Supabase Edge (Deno no ejecuta el addon nativo).

## Estado actual

**Los 5 lentes funcionan en la web** (bilingüe ES/EN, 3 temas × claro/oscuro):

| Lente / Función | Estado |
|---|---|
| **Carta Astral** + Modo Pro técnico (posiciones, aspectario, dignidades, patrones) | ✅ |
| **Numerología** + Modo Pro (kármicos, pináculos, inclusión…) + selector de profundidad | ✅ |
| **Hoy: "Tu energía"** (barras por área × periodo) + **numerología del día** (Fase 2) | ✅ |
| **Compatibilidad / Sinastría** (inter-aspectos + temas) (Fase 3) | ✅ |
| **Cuatro Pilares** (Ba Zi 八字 / Saju 사주) + Modo Pro (Diez Dioses, troncos ocultos) | ✅ |
| **Chat "Pregúntale a Aluna"** (anclado a tu carta, con streaming) | ✅ latente\* |
| **Móvil** (Expo): tabs + onboarding ceremonial + Numerología Modo Pro + 3 temas + EN | ✅ |

\* La capa de **IA** (lecturas largas + chat) está **cableada pero latente**: se enciende al pegar UNA
llave (Anthropic/OpenAI/Gemini). Sin llave, muestra la "Esencia" escrita a mano. Proveedor intercambiable.

Carta validada contra Astrodienst al arcominuto (Sol 15°57′ Acuario, Asc 26°06′ Piscis…).
Los pilares Ba Zi se validan contra una referencia documentada (día 2000-01-07 = 甲子).

**Pendiente:** desplegar (en curso, ver abajo), encender IA con una llave, Fase 4 (monetización),
horóscopo ligero, pilares de suerte (大運), validar Ba Zi/móvil con Gio.

## Desarrollo

```bash
pnpm install
pnpm test        # @aluna/core + @aluna/ephemeris (TDD)
pnpm typecheck
pnpm lint
```

Requisitos: Node ≥ 20, pnpm. `@aluna/ephemeris` compila un addon nativo (`sweph`) — necesita
toolchain de C/C++ (en macOS, Xcode Command Line Tools).

Las variables de entorno van en `.env.local` (ver `.env.example`).

## Deploy

La web (`apps/web`) corre como **servidor Node de larga vida** (no serverless): las rutas de cómputo
usan el addon **nativo `sweph`** + los datos `.se1`, frágiles en serverless. El repo trae **`Dockerfile`**
(multi-stage; `next start` desde `apps/web`) + **`render.yaml`**.

**Camino elegido: Hetzner (un VPS) + Coolify** — un solo servidor barato (~€8/mes) con panel tipo
Render/Vercel autohospedado, que reúne todas las apps de músculo (Aluna y, luego, Vendalo, etc.).

- 👉 **Guía paso a paso (para principiantes):** [`docs/deploy-hetzner-coolify.md`](docs/deploy-hetzner-coolify.md)
- Alternativa gestionada: **Render** (`render.yaml`) — más fácil, pero cobra por app.
- Runbook técnico general (Docker / Vercel / checklist): [`docs/deploy.md`](docs/deploy.md)

```bash
docker build -t aluna-web .
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... aluna-web
```

> Las `NEXT_PUBLIC_*` deben estar en **build time** (en Coolify, marcarlas como *Build Variable*). El app
> arranca **sin** llaves de IA (lecturas largas → "Esencia", latente).

### Estado del deploy (dónde vamos) 🧭
- **Supabase** del proyecto `aluna`: las **4 migraciones aplicadas** en vivo (incl. `reading_cache`).
- **En curso:** desplegar Aluna en **Hetzner + Coolify** siguiendo la guía de arriba (desde el Paso 1).
- **Al terminar:** verificar `/carta` en vivo → encender IA (una llave) + `SUPABASE_SERVICE_ROLE_KEY`
  como variables de **runtime** → luego mover Vendalo al mismo servidor.

## Licencia / notas

- **Swiss Ephemeris** es dual-licencia (AGPL o profesional). **Para uso comercial cerrado se debe
  adquirir la licencia profesional (Astrodienst) antes del lanzamiento público.** Los archivos de
  datos `.se1` son de libre distribución, pero el uso de la librería en un producto cerrado no lo es
  bajo AGPL.
- Proyecto privado. © Gio.
