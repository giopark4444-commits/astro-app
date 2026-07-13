# Aluna móvil — paridad de features: IA + flujos (Fase 2 del diseño)

Diseño para portar **compatibilidad**, **informe** y **preguntar** al app Expo.
Fuente: audit UX de las 3 features web + audit de anatomía móvil (2026-07-13).

## Decisión de navegación

Las 5 tabs actuales (Hoy · Carta · Pilares · Números · Ajustes) **se conservan**. Las 3
features nuevas entran como **pantallas push del stack raíz** (`app/compatibilidad.tsx`,
`app/informe.tsx`, `app/preguntar.tsx`), no como tabs 6–8 (la barra de 84px no da para más
sin rediseñarla, y el audit lo desaconseja).

**Puertas de entrada:**
- **Hoy** gana una sección hub — "Tu universo" — con 3 cards de entrada (Pregúntale a
  Aluna · Compatibilidad · Informes). Preguntar es la card protagonista (paridad con el CTA
  del hero web R4a).
- **Carta** → entrada contextual a Informe ("Tu carta en profundidad").
- Header de las pantallas push: back (‹) + eyebrow, mismo patrón de safe-area del app.

*Alternativa descartada:* reemplazar la tab Ajustes por una tab "Aluna" (chat). Se descarta
por ahora: crea churn con el santuario /perfil que viene de la web (R4b) y rompe el hábito
de usuarios existentes. Reevaluar cuando /perfil llegue a móvil.

## Flujos clave

### 1. Compatibilidad (gratis, requiere 2 perfiles)
```
Hoy → card Compatibilidad → /compatibilidad
  ├─ <2 perfiles → empty-state punteado "Añade otra persona" → CTA + Añadir persona → /onboarding
  └─ ≥2 perfiles → picker A ("Tú" preseleccionado) + picker B (chips de personas)
        → CTA "Ver el vínculo" → loading "Leyendo el cielo entre ustedes…"
        → resultado: hero puente (iniciales + arco ☍ + score 0-100 + tono)
          + 4 barras expandibles (Atracción/Comunicación/Armonía/Crecimiento)
          → tap barra → drivers (Sol □ Venus…) con glifos
        → cambiar cualquier picker invalida el resultado (vuelve a idle)
```

### 2. Informe (Plus; async)
```
Hoy → card Informes → /informe
  ├─ sin perfil → empty "Crea tu perfil primero"
  ├─ sin Plus → paywall "Los informes evolutivos son parte de Aluna Plus" → Ver planes
  └─ Plus → 2 cards: Carta natal · Revolución Solar {año}
        estados por card: none→Generar / generating→"toca Actualizar" / error→Reintentar
                          / dormant "El oráculo aún duerme" / ready→Leer
        → ready → /informe lectura: experiencia tipo libro nocturno
          natal: Introducción + 4 secciones (esencia/emocional/camino/desafíos) + Cierre
          solar: Ensayo del año + 10 temas (Por qué/Invitación) + Mantra
          + "Generado con {model}" + Regenerar
```
La lectura se diseña desde cero (la web es placeholder declarado).

### 3. Preguntar (chat con Aluna; streaming)
```
Hoy → card Pregúntale a Aluna → /preguntar
  ├─ sin perfil → empty-state propio (la web no lo tiene: aquí se corrige)
  ├─ dormant → "El oráculo aún duerme" ☾
  └─ vacío → saludo de Aluna + 3 chips de preguntas sugeridas (desde la carta real)
        → enviar → burbuja usuario → "Aluna está sintiendo tu pregunta…"
        → respuesta streaming token a token (burbuja esquina asimétrica, patrón R3)
        → error inline "Algo se nubló. Inténtalo de nuevo."
```

## Lista de pantallas a mockup (alta fidelidad, iPhone 390×844, claro+oscuro)

| # | Archivo | Pantalla | Estado que muestra |
|---|---------|----------|--------------------|
| 1 | `01-hoy-hub.html` | Hoy con sección "Tu universo" | entradas a las 3 features |
| 2 | `02-compat-seleccion.html` | Compatibilidad — selección | pickers A/B + CTA (3 personas) |
| 3 | `03-compat-resultado.html` | Compatibilidad — resultado | hero puente + 4 barras, una expandida con drivers |
| 4 | `04-informe-portada.html` | Informe — portada | natal ready + solar none/generating |
| 5 | `05-informe-lectura.html` | Informe — lectura | natal: intro + secciones, tipografía de libro |
| 6 | `06-preguntar-vacio.html` | Preguntar — inicio | saludo + sugerencias + composer |
| 7 | `07-preguntar-conversacion.html` | Preguntar — conversación | hilo + streaming + placements citados |
| 8 | `08-informe-paywall.html` | Informe — paywall Plus | card punteada + planes + CTA |

Todos con contenido REAL de los strings es/en auditados (nunca lorem), tokens del tema
observatory (claro y oscuro conmutables), chrome mínimo real (status bar hora/batería +
home indicator), color en superficies grandes.

## Notas para la fase de build (fuera del diseño)

- `/api/synastry` y `/api/chat` son cookie-only → swap a `authenticateRoute` (Bearer) antes
  de consumirlos desde móvil (mismo patrón que `/api/chart`).
- Streaming RN: `chart-reading-api.ts` ya acumula texto plano; el efecto tecleo necesita
  ReadableStream en Expo/Hermes o fallback acumulado.
- `isPlusActive()` de `@aluna/core` es RN-safe → gating de UI reutilizable tal cual.
- Chat web no persiste hilo entre sesiones; decidir en build si móvil lo persiste local.
