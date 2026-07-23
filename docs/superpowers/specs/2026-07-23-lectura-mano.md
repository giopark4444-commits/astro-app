# Lectura de Mano — spec v1 (goal de Gio 2026-07-23)

**Meta**: lectura de mano con TODAS las opciones, tan completa que "un pro diga que no le falta nada".
Diferenciador Aluna: visión REAL de la foto + cruce con la carta natal. Sin migraciones de BD.

## Arquitectura (2 etapas, acordada)
1. **Ojos** — `POST /api/palm-analysis`: foto (base64) → modelo con VISIÓN → JSON estructurado de
   rasgos (inventario quiromántico completo + calidad de foto con guía de retoma). Proveedores con
   visión: gemini (default, gratis, vivo) → openai → anthropic (cuando haya llave). La foto NO se
   guarda jamás (privacidad: se procesa y se descarta; solo viaja el JSON de rasgos).
2. **Voz** — `POST /api/palm-reading`: rasgos JSON (1 o 2 manos) + profileId → lectura por secciones
   con el CANON quiromántico (lib/palm/canon.ts, pre-escrito) + cruce natal (regencias: montes/dedos
   ↔ posiciones natales) + los 3 MODOS DE VOZ (íntima/estudio/pro — el modo pro ES el informe
   profesional). resolveReadingProvider + parseModelOverride + parseVoiceMode como el resto.

## Inventario profesional (lo que la visión debe extraer y el canon cubrir)
- **Forma**: elemento de mano (tierra/aire/fuego/agua = palma cuadrada/rectangular × dedos cortos/largos),
  nudillos lisos/nudosos, pulgar (ángulo de apertura; falange voluntad vs lógica), dedos (Júpiter/
  Saturno/Apolo/Mercurio: largo relativo, inclinación), uñas si visibles.
- **Líneas** principales y secundarias: vida, cabeza, corazón, destino/Saturno, sol/Apolo, Mercurio/
  salud, matrimonio/uniones, intuición, vía láctea, brazaletes/rascetas, anillo de Venus, anillo de
  Salomón, simiesca si aparece. Por línea: presencia, inicio/fin, profundidad, longitud, curvatura,
  calidad (clara/encadenada/fragmentada/doble), marcas locales.
- **Montes**: Venus, Júpiter, Saturno, Apolo, Mercurio, Marte positivo/negativo, llanura de Marte,
  Luna — desarrollo (prominente/equilibrado/plano) + marcas.
- **Marcas especiales**: islas, estrellas, cruces, cuadrados, rejillas, triángulos, cadenas, rupturas,
  lunares — con ubicación.
- **Mano dominante vs pasiva** (opcional 2 fotos): activa=presente/elección, pasiva=potencial/herencia;
  síntesis comparada cuando hay ambas.
- Confianza por rasgo + honestidad: lo no visible se declara "no visible en la foto" (jamás inventar).

## UX (/mano — reemplaza el "pronto" de Otras lecturas)
Intro ceremonial (privacidad: "tu foto no se guarda") → elegir 1 o 2 manos + cuál es dominante →
subir/tomar foto(s) con guía (palma abierta, luz, encuadre) → "leyendo tu mano…" → si foto mala:
guía de retoma → lectura por SECCIONES navegables (Forma · Líneas · Montes · Marcas · Puente astral ·
Síntesis) + consejo → chat lens abajo ("Conversa tu mano") reutilizando lens-chat-panel con contexto
de la lectura → guardar en localStorage del dispositivo (sin BD) + rehacer.

## Piezas
- lib/reading/provider.ts: `visionComplete()` (gemini inline_data / openai image_url / anthropic image
  block) + `resolveVisionProvider()` (orden: override→gemini→openai→anthropic).
- lib/palm/schema.ts (tipos + validador tolerante del JSON de visión), lib/palm/canon.ts (canon
  quiromántico es/en compacto y riguroso), lib/palm/prompts.ts (prompt de extracción + prompt de
  lectura con canon+natal+modos).
- app/api/palm-analysis/route.ts, app/api/palm-reading/route.ts (auth, límites de tamaño ~6MB,
  validación, x-aluna-model, sin persistencia de imagen).
- app/(app)/mano/* (page + vista cliente + css con tokens) + hub otras-lecturas: activar entrada.
- Tests: schema/validador, rutas (400/401/tamaño/calidad-mala/feliz con fakes), modos en prompt.
- Verificación: generar foto de palma realista (Higgsfield) → flujo completo en navegador con Gemini
  gratis → probar modos íntima y pro → push a main.

## Estado
- [x] Spec
- [x] Núcleo visión+palm libs+rutas+tests — PROBADO en vivo con foto real (`a7b9873`):
      foto difícil → usable:false + guía + no-visibles honestos; palma limpia →
      13 líneas + 9 montes; lectura 7 secciones íntima y pro; timeout 150s.
- [x] UI /mano — máquina de estados completa, 9 tests, i18n es/en, hub activo
- [x] Curaduría + E2E navegador (retoma verificada con foto difícil; camino feliz
      completo con palma real: 6 secciones + consejo) + fotos de prueba borradas +
      push a main (`bd016c6`). GOAL CUMPLIDO.
