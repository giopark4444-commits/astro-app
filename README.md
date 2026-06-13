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

## Estado de construcción (Fase 1)

| Plan | Qué | Estado |
|---|---|---|
| 1 | Monorepo + motor de **Numerología** | ✅ en `main` |
| 2 | Motor de **Carta Astral** (Swiss Ephemeris) | ✅ en `main` |
| 3 | Backend **Supabase** (esquema + RLS + auth) + **API de cómputo** | ✅ en `main` |
| 4 | Cliente **web** (Next.js PWA) | ⏳ |
| 5 | Cliente **móvil** (Expo) | ⏳ |
| 6 | **Interpretaciones** (ES/EN) | ⏳ |

Validado contra una carta real de Astrodienst al arcominuto (Sol 15°57′ Acuario, Asc 26°06′ Piscis…).

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

## Licencia / notas

- **Swiss Ephemeris** es dual-licencia (AGPL o profesional). Para uso comercial cerrado se debe
  adquirir la licencia profesional antes del lanzamiento público. Los archivos de datos `.se1` son
  de libre distribución.
- Proyecto privado. © Gio.
