# Cuestionario ceremonial de primera entrada — diseño

**Fecha:** 2026-07-16 · **Estado:** aprobado por Gio (brainstorm en sesión)
**Origen:** análisis de 28 capturas del funnel de onboarding de Nebula; se adopta el patrón
"intención antes de datos" con voz y estética propias de Aluna. Sin dark patterns.

## Qué se construye

Un cuestionario de primera entrada que corre ANTES de que el usuario nuevo vea la interfaz,
extendiendo el flujo ceremonial de onboarding existente (enfoque A: mismos componentes de
pasos/progreso/reveal; NO un pre-flujo separado ni una reescritura). Plataformas: **móvil
primero** (`apps/mobile/app/onboarding.tsx`), luego **web** (`apps/web/app/onboarding/`).
Mismos pasos y mismo modelo de datos en ambas.

## Flujo de pasos (intención → datos)

| # | Paso | Tipo | Obligatorio |
|---|------|------|-------------|
| 1 | **Metas** — "¿Qué te trae a Aluna?" | multi-select ~7 chips + campo libre opcional | No — "Omitir" |
| 2 | **Afirmación** — "Con Aluna vas a…" | checklist derivada SOLO de las metas elegidas | Auto (no aparece si omitió metas) |
| 3 | **Foco actual** — "¿Dónde quieres más luz ahora?" | multi-select, mapa 1:1 a las 6 áreas de `scoreLifeAreas` (amor, dinero, trabajo, salud, ánimo, suerte) | No — "Omitir" |
| 4 | **Estado sentimental** | single-select (soltería · en pareja · matrimonio · es complicado · prefiero no decirlo) | No — "Omitir" |
| 5–9 | **Nacimiento** (nombre → fecha → hora → lugar → género), flujo actual intacto | igual que hoy | Sí (sin ellos no hay carta) |

Opciones de metas (voz Aluna, evolutiva-yóguica, ES/EN): Conocerme en profundidad · Mis
vínculos · Mi propósito · Prepararme para lo que viene · Explorar la espiritualidad ·
Entender a los demás · Guía para decidir (+ texto libre "algo más").

**Gauge zodiacal vivo** en el paso de fecha: arco con los 12 glifos que resalta el signo
solar mientras se elige la fecha. Helper puro `sunSignFromDate(date)` en `@aluna/core`
(tabla tropical por fechas; aproximado en cúspides y presentado como tal — la carta real
se calcula después con efemérides como siempre). Web: SVG/CSS; móvil: react-native-svg.

**Excluido a propósito:** recordatorio de hora de notificación (no hay infra push aún —
futuro), encuesta de atribución, comparación "Without/With" (dark pattern), paywall al
cierre (pertenece a la fase de monetización), tarot y psíquicos.

## Modelo de datos

Las respuestas de intención son **del usuario**, no del perfil de nacimiento (los perfiles
múltiples son otras personas). Migración nueva (siguiente número libre en
`supabase/migrations/`): columna JSONB `intent` en la tabla de settings del usuario:

```json
{
  "goals": ["self", "bonds"],
  "goalNote": "…texto libre opcional…",
  "focus": ["love", "work"],
  "relationship": "single" | "partnered" | "married" | "complicated" | "private",
  "useInAI": true,
  "answeredAt": "2026-07-16T…Z"
}
```

Claves internas estables en inglés (i18n solo en la superficie). Campos ausentes = paso
omitido. RLS existente por usuario cubre la columna. Móvil espeja en AsyncStorage (patrón
`profile-sync.ts`); web persiste dentro del mismo server action del onboarding
(`createBirthProfile` se extiende o gana un compañero `saveIntent`).

## Personalización (ligera + IA opcional)

- **Hoy:** el panel de energía ordena las áreas poniendo primero las del `focus` (orden
  estable; el motor `scoreLifeAreas` NO se toca — es orden de presentación).
- **IA (opcional, decisión de Gio):** interruptor en Ajustes "Personalizar lecturas con
  mis intenciones" (`intent.useInAI`, default activado al responder). Solo si hay
  respuestas Y el toggle está activo, `/api/chat` e informes añaden una línea de contexto
  al system prompt ("busca X; foco actual Y; estado Z"). Apagado o sin respuestas = prompt
  byte-igual al actual.
- **Usuarios existentes:** no se les interrumpe (el cuestionario solo corre en primera
  entrada, cuando no hay perfil). **Futuro (fuera de alcance):** editar/completar las
  intenciones desde Perfil/Ajustes — el modelo de datos ya lo soporta tal cual.

## Calidad

- i18n ES/EN completo en ambas plataformas (paridad vigilada por los tests existentes).
- Tipografía móvil: escala de 4 tamaños (13/15/19/24) de Gio.
- Tests: `sunSignFromDate` (core, con cúspides), lógica de pasos/omitir (web RTL + móvil
  vitest), orden de áreas por foco, prompt con/sin intent (byte-igual cuando off).
- Gates por tarea: `tsc` + `vitest` + `next build` (web) / `expo export` (móvil).

## Decisiones registradas

- Enfoque A (extender flujo existente) sobre pre-flujo separado (dos flujos cosidos) y
  reescritura funnel (tira la ceremonia verificada).
- Intención → datos (inversión emocional antes del paso duro), saltable con "Omitir".
- Afirmación dinámica que solo ecoa lo elegido (honestidad > plantilla fija de Nebula).
- IA opcional con toggle (Gio), obligatorio solo lo imprescindible (nacimiento).
