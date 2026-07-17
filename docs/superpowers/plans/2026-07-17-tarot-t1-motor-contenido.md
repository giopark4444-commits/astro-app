# Tarot T1 — Motor + contenido + assets + BD: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** la fundación completa del mundo tarot según `docs/superpowers/specs/2026-07-17-tarot-design.md` — motor puro en `@aluna/core` (78 cartas, shuffle sembrado, invertidas, spreads, carta del día determinista, registro de mazos), contenido profesional de las 78 en ES+EN, assets RWS, y la migración `tarot_readings`. Sin UI (eso es T2).

**Architecture:** motor como datos+funciones puras en `packages/core/src/tarot/` (extraíble, RNG inyectable para tests); contenido con el patrón horoscope (es.ts = motor de composición, en.ts = solo dicts, import runtime solo es→en); assets estáticos por convención `public/tarot/{deckId}/{cardId}.webp`; BD con RLS patrón manifestations.

**Tech Stack:** TypeScript puro (core), Vitest, next-intl no aplica aquí (el contenido de cartas vive en lib/content, no en messages/), Supabase SQL.

## Global Constraints

- Gate en `packages/core`: `npx tsc --noEmit -p tsconfig.json && npx vitest run` (desde el paquete). Gate en `apps/web`: `npx tsc --noEmit && npx vitest run` — verde antes de cada commit.
- Sin dependencias nuevas de runtime. (Los assets pueden usar `npx` one-off en un script, no se instala nada al repo.)
- Voz del contenido: evolutiva, segunda persona, sin fatalismo — calibrar leyendo primero `HOROSCOPE_SIGNS_ES` (aries/cancer/scorpio) y `HOROSCOPE_ANIMALS_ES` (rat/horse) en `apps/web/lib/content/horoscope-es.ts`. EN = misma voz, NO traducción literal.
- Contenido: import runtime SOLO es.ts→en.ts (patrón documentado en horoscope-es.ts:94).
- Commits en español, prefijo `feat(tarot):`.
- El mazo `aluna` queda REGISTRADO pero `enabled: false` — nada en T1 lo activa.
- ⚠️ Sesiones paralelas de Gio tocan este repo: `git add` siempre por ruta explícita, nunca `-A`.

---

### Task 1: El mazo — 78 cartas como datos + registro de mazos

**Files:**
- Create: `packages/core/src/tarot/deck.ts`
- Create: `packages/core/src/tarot/types.ts`
- Modify: `packages/core/src/index.ts` (añadir sección `// Tarot` con los exports)
- Test: `packages/core/src/tarot/__tests__/deck.test.ts`

**Interfaces:**
- Produces: tipos `TarotCard`, `TarotArcana`, `TarotSuit`, `TarotCorrespondence`; constantes `TAROT_DECK: readonly TarotCard[]` (78), `TAROT_DECKS: readonly TarotDeckInfo[]`, helper `cardById(id: string): TarotCard | undefined`.

**Diseño de datos (types.ts):**

```ts
export type TarotArcana = "major" | "minor";
export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";

/** Correspondencia Golden Dawn: los mayores llevan planeta O signo (uno de los
 *  dos); los menores llevan solo el elemento de su palo. El eco numerológico
 *  es el número reducido de la carta (puente con el mundo Números). */
export interface TarotCorrespondence {
  planet?: string;   // key de PLANETS de @aluna/core cuando aplique ("mercury"…)
  sign?: string;     // key de ZODIAC_SIGNS cuando aplique ("aries"…)
  element: "fire" | "water" | "air" | "earth";
  numerology: number; // 0-21 mayores reducido; 1-10 pips; courts: página=11,caballero=12,reina=13,rey=14 reducidos
}

export interface TarotCard {
  id: string;              // slug estable: "fool", "wands-03", "cups-queen"
  arcana: TarotArcana;
  suit?: TarotSuit;        // solo minor
  number: number;          // major: 0-21 · pips: 1-10 · page=11 knight=12 queen=13 king=14
  correspondence: TarotCorrespondence;
}

export interface TarotDeckInfo {
  id: "rws" | "aluna";
  enabled: boolean;        // aluna: false hasta que el arte esté verificado
}
```

**deck.ts:** el array completo de 78. Ids de mayores (orden 0-21): `fool, magician, high-priestess, empress, emperor, hierophant, lovers, chariot, strength, hermit, wheel-of-fortune, justice, hanged-man, death, temperance, devil, tower, star, moon, sun, judgement, world`. Menores: `{suit}-01`…`{suit}-10`, `{suit}-page`, `{suit}-knight`, `{suit}-queen`, `{suit}-king` para los 4 palos en orden `wands, cups, swords, pentacles`.

Correspondencias Golden Dawn de los mayores (tabla canónica — copiar EXACTA):

| id | planet/sign | element |
|---|---|---|
| fool | planet: uranus | air |
| magician | planet: mercury | air |
| high-priestess | planet: moon | water |
| empress | planet: venus | earth |
| emperor | sign: aries | fire |
| hierophant | sign: taurus | earth |
| lovers | sign: gemini | air |
| chariot | sign: cancer | water |
| strength | sign: leo | fire |
| hermit | sign: virgo | earth |
| wheel-of-fortune | planet: jupiter | fire |
| justice | sign: libra | air |
| hanged-man | planet: neptune | water |
| death | sign: scorpio | water |
| temperance | sign: sagittarius | fire |
| devil | sign: capricorn | earth |
| tower | planet: mars | fire |
| star | sign: aquarius | air |
| moon | sign: pisces | water |
| sun | planet: sun | fire |
| judgement | planet: pluto | fire |
| world | planet: saturn | earth |

Menores: element por palo (wands=fire, cups=water, swords=air, pentacles=earth), sin planet/sign. `numerology` = número reducido con `reduce` de `@aluna/core` (`import { reduce } from "../numerology/reduction"`) — mayores: reduce(number) con 0→0; menores: reduce(number).

- [ ] **Step 1: Test que falla** — escribir `deck.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TAROT_DECK, TAROT_DECKS, cardById } from "../deck";

describe("TAROT_DECK", () => {
  it("tiene exactamente 78 cartas con ids únicos", () => {
    expect(TAROT_DECK).toHaveLength(78);
    expect(new Set(TAROT_DECK.map((c) => c.id)).size).toBe(78);
  });
  it("22 mayores (0-21) y 56 menores (14 por palo)", () => {
    const majors = TAROT_DECK.filter((c) => c.arcana === "major");
    expect(majors).toHaveLength(22);
    expect(majors.map((c) => c.number).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 22 }, (_, i) => i),
    );
    for (const suit of ["wands", "cups", "swords", "pentacles"] as const) {
      expect(TAROT_DECK.filter((c) => c.suit === suit)).toHaveLength(14);
    }
  });
  it("correspondencias canónicas Golden Dawn (anclas)", () => {
    expect(cardById("emperor")!.correspondence.sign).toBe("aries");
    expect(cardById("magician")!.correspondence.planet).toBe("mercury");
    expect(cardById("wands-03")!.correspondence.element).toBe("fire");
    expect(cardById("cups-queen")!.correspondence.element).toBe("water");
  });
  it("todo mayor lleva planet O sign (exactamente uno); ningún menor lleva ninguno", () => {
    for (const c of TAROT_DECK) {
      const n = Number(!!c.correspondence.planet) + Number(!!c.correspondence.sign);
      expect(n, c.id).toBe(c.arcana === "major" ? 1 : 0);
    }
  });
  it("registro de mazos: rws activo, aluna registrado pero apagado", () => {
    expect(TAROT_DECKS.find((d) => d.id === "rws")!.enabled).toBe(true);
    expect(TAROT_DECKS.find((d) => d.id === "aluna")!.enabled).toBe(false);
  });
});
```

- [ ] **Step 2: correr y ver fallar** — `cd packages/core && npx vitest run src/tarot` → FAIL (módulo no existe).
- [ ] **Step 3: implementar** types.ts + deck.ts (el array completo — sin atajos, las 78) + exports en index.ts (`export * from "./tarot/types"; export { TAROT_DECK, TAROT_DECKS, cardById } from "./tarot/deck";`).
- [ ] **Step 4: verde** — mismo comando, 5/5.
- [ ] **Step 5: gate + commit** — tsc del paquete + vitest completo del paquete; `git add packages/core/src/tarot packages/core/src/index.ts && git commit -m "feat(tarot): el mazo — 78 cartas con correspondencias Golden Dawn + registro de mazos (rws activo, aluna en flag)"`.

---

### Task 2: Shuffle sembrado + invertidas (RNG inyectable)

**Files:**
- Create: `packages/core/src/tarot/shuffle.ts`
- Test: `packages/core/src/tarot/__tests__/shuffle.test.ts`

**Interfaces:**
- Consumes: `TAROT_DECK`, `TarotCard` (Task 1).
- Produces: `type Rng = () => number` (0≤x<1); `mulberry32(seed: number): Rng` (PRNG determinista para tests y para la carta del día); `shuffleDeck(rng: Rng): TarotCard[]` (Fisher-Yates, no muta TAROT_DECK); `drawCards(count: number, rng: Rng, opts?: { reversals?: boolean }): DrawnCard[]` donde `DrawnCard = { card: TarotCard; reversed: boolean }` — baraja y toma las primeras `count`, invertidas al 50% vía el MISMO rng (para determinismo con semilla), `reversals: false` fuerza todas derechas.

En producción el llamador (T2) construirá el rng con `crypto.getRandomValues` + el timestamp del gesto; el motor NO conoce crypto — solo recibe `Rng`.

- [ ] **Step 1: Test que falla**:

```ts
import { describe, expect, it } from "vitest";
import { TAROT_DECK } from "../deck";
import { mulberry32, shuffleDeck, drawCards } from "../shuffle";

describe("shuffle", () => {
  it("misma semilla → mismo orden; semillas distintas → órdenes distintos", () => {
    const a = shuffleDeck(mulberry32(42)).map((c) => c.id);
    const b = shuffleDeck(mulberry32(42)).map((c) => c.id);
    const c = shuffleDeck(mulberry32(43)).map((c) => c.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
  it("permutación completa: 78 cartas, ninguna perdida, TAROT_DECK intacto", () => {
    const before = TAROT_DECK.map((c) => c.id).join(",");
    const s = shuffleDeck(mulberry32(7));
    expect(new Set(s.map((c) => c.id)).size).toBe(78);
    expect(TAROT_DECK.map((c) => c.id).join(",")).toBe(before);
  });
  it("drawCards: count cartas sin repetir, invertidas deterministas por semilla", () => {
    const d = drawCards(10, mulberry32(11));
    expect(d).toHaveLength(10);
    expect(new Set(d.map((x) => x.card.id)).size).toBe(10);
    expect(d.map((x) => x.reversed)).toEqual(drawCards(10, mulberry32(11)).map((x) => x.reversed));
  });
  it("reversals:false → todas derechas; con reversals, ~50% en muestra grande", () => {
    expect(drawCards(78, mulberry32(3), { reversals: false }).every((x) => !x.reversed)).toBe(true);
    const n = drawCards(78, mulberry32(5)).filter((x) => x.reversed).length;
    expect(n).toBeGreaterThan(20); expect(n).toBeLessThan(58);
  });
});
```

- [ ] **Step 2: FAIL** → **Step 3: implementar** (mulberry32 estándar; Fisher-Yates de atrás hacia adelante sobre copia) → **Step 4: verde** → **Step 5: gate + commit** `feat(tarot): shuffle sembrado con RNG inyectable + invertidas deterministas`.

---

### Task 3: Spreads como plantillas + carta del día determinista

**Files:**
- Create: `packages/core/src/tarot/spreads.ts`
- Create: `packages/core/src/tarot/daily.ts`
- Modify: `packages/core/src/index.ts` (exports)
- Test: `packages/core/src/tarot/__tests__/spreads.test.ts` + `daily.test.ts`

**Interfaces:**
- Consumes: `drawCards`, `mulberry32`, `DrawnCard` (Task 2).
- Produces: `interface TarotSpread { id: "daily"|"three"|"celtic-cross"; cardCount: number; positions: Array<{ key: string; role: string }> }`; `TAROT_SPREADS: readonly TarotSpread[]`; `spreadById(id)`; `dailyCard(userId: string, localDate: string): DrawnCard` (determinista; `localDate` formato "YYYY-MM-DD"); `dailySeed(userId, localDate): number` (FNV-1a 32-bit del string `${userId}|${localDate}` — exportada para test).

Posiciones canónicas: `daily` = [{key:"day", role:"message"}]. `three` = past/present/future. `celtic-cross` (10) = `heart, crossing, foundation, past, crown, future, self, environment, hopes-fears, outcome` (roles homónimos). Los textos i18n de las posiciones son de T2 — aquí SOLO keys.

- [ ] **Step 1: Tests que fallan** (ambos archivos):

```ts
// spreads.test.ts
it("3 spreads con cardCount coherente con sus posiciones", () => {
  expect(TAROT_SPREADS).toHaveLength(3);
  for (const s of TAROT_SPREADS) expect(s.positions).toHaveLength(s.cardCount);
});
it("celtic-cross: las 10 posiciones canónicas en orden", () => {
  expect(spreadById("celtic-cross")!.positions.map((p) => p.key)).toEqual([
    "heart","crossing","foundation","past","crown","future","self","environment","hopes-fears","outcome",
  ]);
});

// daily.test.ts
it("misma (user,fecha) → misma carta e inversión; usuario o fecha distintos → puede variar y la semilla SIEMPRE difiere", () => {
  const a = dailyCard("user-1", "2026-07-17");
  expect(dailyCard("user-1", "2026-07-17")).toEqual(a);
  expect(dailySeed("user-1", "2026-07-18")).not.toBe(dailySeed("user-1", "2026-07-17"));
  expect(dailySeed("user-2", "2026-07-17")).not.toBe(dailySeed("user-1", "2026-07-17"));
});
it("en 60 días seguidos salen ≥25 cartas distintas (no se estanca)", () => {
  const ids = new Set(Array.from({ length: 60 }, (_, i) =>
    dailyCard("user-1", `2026-08-${String((i % 28) + 1).padStart(2, "0")}` + (i >= 28 ? "x" + i : "")).card.id));
  expect(ids.size).toBeGreaterThan(25);
});
```

(El segundo test del daily usa fechas sintéticas variadas — el implementador puede simplificarlo a 60 strings distintos cualesquiera; lo que se afirma es dispersión de la semilla.)

- [ ] **Step 2: FAIL** → **Step 3: implementar** (`dailyCard` = `drawCards(1, mulberry32(dailySeed(u,d)))[0]`) → **Step 4: verde** → **Step 5: gate + commit** `feat(tarot): spreads canónicos + carta del día determinista por usuario y fecha`.

---

### Task 4: Contenido — tipos, andamio y las 22 mayores ES+EN

**Files:**
- Create: `apps/web/lib/content/tarot-es.ts`
- Create: `apps/web/lib/content/tarot-en.ts`
- Test: `apps/web/lib/content/__tests__/tarot.test.ts`

**Interfaces:**
- Consumes: `TAROT_DECK`, `cardById` de `@aluna/core`.
- Produces (contrato para Tasks 5-7 y para T2):

```ts
export interface TarotAmbits { love: string; work: string; path: string; }
export interface TarotCardContent {
  name: string;              // "El Loco" / "The Fool"
  keywords: string[];        // 3-5
  essence: string;           // párrafo, voz Aluna
  upright: TarotAmbits;
  reversed: TarotAmbits;
  bridge: string;            // 1 frase narrando la correspondencia ("El Emperador lleva el fuego de Aries…")
}
export const TAROT_CARDS_ES: Record<string, TarotCardContent>; // key = card.id
export const TAROT_CARDS_EN: Record<string, TarotCardContent>; // en tarot-en.ts, SOLO datos
```

**ANTES de escribir una sola carta:** leer `HOROSCOPE_SIGNS_ES` (aries, cancer, scorpio) y `HOROSCOPE_ANIMALS_ES` (rat, horse) en `apps/web/lib/content/horoscope-es.ts` para calibrar voz. Ejemplo del calibre esperado (El Loco, ES):

```ts
fool: {
  name: "El Loco",
  keywords: ["comienzo", "confianza", "salto", "inocencia"],
  essence: "Llegas al borde del acantilado con el equipaje ligero: El Loco no ignora el riesgo, elige confiar más en el camino que en el mapa. Es la energía de empezar sin garantías, con los ojos nuevos.",
  upright: {
    love: "Algo nuevo pide espacio: una persona, una etapa, una forma de querer sin libreto. Di sí antes de tener todas las respuestas.",
    work: "El proyecto que te da un poco de vértigo es el que te va a enseñar. Empieza pequeño, pero empieza.",
    path: "Tu alma pide primera vez: territorio sin mapa. La inocencia aquí no es ingenuidad, es apertura deliberada.",
  },
  reversed: {
    love: "Revisa si el salto es fe o huida: la espontaneidad que no mira a nadie deja caídas ajenas.",
    work: "Frenar no es fracasar. Un plan mínimo convierte el impulso en dirección.",
    path: "El vértigo que sientes es información: algo pide preparación antes que valentía.",
  },
  bridge: "El Loco respira el aire de Urano: la libertad que interrumpe lo previsible.",
},
```

- [ ] **Step 1: Test que falla** — paridad y completitud SOLO de mayores en esta task (las tasks 5-7 extienden el mismo test):

```ts
import { describe, expect, it } from "vitest";
import { TAROT_DECK } from "@aluna/core";
import { TAROT_CARDS_ES } from "../tarot-es";
import { TAROT_CARDS_EN } from "../tarot-en";

const DONE: ReadonlyArray<(typeof TAROT_DECK)[number]["arcana"] | string> = ["major"]; // tasks 5-7 añaden palos

const cardsDone = TAROT_DECK.filter((c) => DONE.includes(c.arcana) || DONE.includes(c.suit ?? ""));

describe("contenido tarot", () => {
  it("cada carta cubierta existe en ES y EN con todos los campos no vacíos", () => {
    for (const card of cardsDone) {
      for (const dict of [TAROT_CARDS_ES, TAROT_CARDS_EN]) {
        const c = dict[card.id];
        expect(c, card.id).toBeDefined();
        expect(c!.keywords.length).toBeGreaterThanOrEqual(3);
        for (const s of [c!.name, c!.essence, c!.bridge,
          c!.upright.love, c!.upright.work, c!.upright.path,
          c!.reversed.love, c!.reversed.work, c!.reversed.path]) {
          expect(s.trim().length, card.id).toBeGreaterThan(0);
        }
      }
    }
  });
  it("EN no es copia de ES (voz propia, no placeholder)", () => {
    for (const card of cardsDone) {
      expect(TAROT_CARDS_EN[card.id]!.essence).not.toBe(TAROT_CARDS_ES[card.id]!.essence);
    }
  });
});
```

- [ ] **Step 2: FAIL** → **Step 3: escribir las 22 mayores × ES+EN** (interfaces + dicts; en.ts abre con el comentario del patrón: "solo datos; es.ts es el motor — misma dirección de import que horoscope"). → **Step 4: verde** (gate completo apps/web) → **Step 5: commit** `feat(tarot): contenido — tipos + las 22 arcanas mayores (ES+EN, voz Aluna)`.

---

### Task 5: Contenido — bastos y copas (28 cartas ES+EN)

**Files:** Modify: `tarot-es.ts`, `tarot-en.ts`, test (añadir `"wands", "cups"` a `DONE`).
**Interfaces:** las de Task 4, sin cambios.

- [ ] Step 1: ampliar `DONE` → correr → FAIL (faltan 28).
- [ ] Step 2: escribir las 28 × ES+EN (misma voz; los pips narran la progresión 1→10 del elemento; courts como personas/energías, no género rígido).
- [ ] Step 3: verde + gate → commit `feat(tarot): contenido — bastos y copas completos (ES+EN)`.

### Task 6: Contenido — espadas y oros (28 cartas ES+EN)

Idéntica a Task 5 con `"swords", "pentacles"`. Commit `feat(tarot): contenido — espadas y oros completos (ES+EN)`. Al cerrar esta task `DONE` cubre las 78 — reemplazar el filtro por `TAROT_DECK` entero y borrar la constante `DONE`.

---

### Task 7: composeReadingProse — prosa base sin IA

**Files:**
- Modify: `apps/web/lib/content/tarot-es.ts` (la función vive aquí, patrón composeWith)
- Test: extender `apps/web/lib/content/__tests__/tarot.test.ts`

**Interfaces:**
- Consumes: `TAROT_CARDS_ES/EN`, `spreadById` y `DrawnCard` de `@aluna/core`.
- Produces: `composeReadingProse(locale: "es"|"en", spreadId: string, cards: Array<{ cardId: string; reversed: boolean; position: string }>, question?: string): string[]` — párrafos: apertura (con la pregunta si existe) → un párrafo por carta (nombre + ámbito según el role de su posición: past/present/future→path, posiciones de relación→love… mapping simple documentado: v1 usa `path` para todo role salvo que T2 pase ámbito explícito) → cierre que teje las cartas (menciona si dominan invertidas: "el cielo te pide revisar antes que avanzar").

- [ ] Step 1: tests que fallan — prosa de `three` con 3 cartas: menciona los 3 nombres localizados; con `question` la apertura la incluye; con 2/3 invertidas el cierre lleva la señal; `daily` produce ≥2 párrafos.
- [ ] Step 2: implementar (ES motor + dicts EN para las frases fijas, patrón EasternComposeDicts).
- [ ] Step 3: verde + gate → commit `feat(tarot): prosa base de lectura compuesta (sin IA, patrón horóscopo)`.

---

### Task 8: Assets RWS — 78 imágenes + test de convención

**Files:**
- Create: `scripts/tarot-fetch-rws.mjs` (one-off, documentado)
- Create: `apps/web/public/tarot/rws/{id}.webp` × 78
- Test: `apps/web/lib/content/__tests__/tarot-assets.test.ts`

Fuente: los escaneos Rider-Waite-Smith 1909 de Wikimedia Commons (dominio público — Pamela Colman Smith, publicación 1909; documentar la URL exacta de la categoría usada en el header del script). El script descarga, renombra al id del mazo (mapa explícito wikimedia-name → card.id dentro del script) y convierte/comprime a webp ~600px de alto vía `npx --yes sharp-cli` (sin instalar nada al repo). El "entonado" fino a temas es de T2/diseño — aquí solo limpieza+formato.

- [ ] Step 1: test que falla — por cada `card.id` de `TAROT_DECK` existe `public/tarot/rws/{id}.webp` no vacío (fs.statSync > 5KB).
- [ ] Step 2: escribir script + ejecutarlo + verificar 3 cartas al azar ABRIÉNDOLAS (el implementador mira que fool sea el Loco, no un mislabel de Wikimedia).
- [ ] Step 3: verde + gate → commit (assets + script + test) `feat(tarot): mazo RWS 1909 — 78 assets de dominio público (fuente documentada)`.

---

### Task 9: Migración `tarot_readings` + tipos de BD

**Files:**
- Create: `supabase/migrations/0012_tarot_readings.sql`
- Modify: `packages/supabase/src/database.types.ts` (añadir la tabla a mano, patrón de las existentes)

```sql
-- Aluna · Tarot T1 — el diario de lecturas (RLS CRUD, patrón manifestations 0010).
create table public.tarot_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_user(id) on delete cascade,
  profile_id uuid references public.birth_profiles(id) on delete set null, -- NULL = para mí; fase 2: la persona leída
  spread text not null check (spread in ('daily','three','celtic-cross')),
  question text check (char_length(question) <= 280),
  cards jsonb not null,             -- [{cardId, reversed, position}] — VALIDADO en la API contra el motor, nunca confiado al cliente
  notes text check (char_length(notes) <= 2000),
  deck text not null default 'rws',
  created_at timestamptz not null default now()
);
alter table public.tarot_readings enable row level security;
create policy "own tarot select" on public.tarot_readings for select using (user_id = auth.uid());
create policy "own tarot insert" on public.tarot_readings for insert with check (user_id = auth.uid());
create policy "own tarot update" on public.tarot_readings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tarot delete" on public.tarot_readings for delete using (user_id = auth.uid());
create index tarot_readings_user_created on public.tarot_readings (user_id, created_at desc);
```

- [ ] Step 1: escribir la migración (arriba, verbatim) + tipos en database.types.ts (Row/Insert/Update, copiar la forma de manifestations).
- [ ] Step 2: gate apps/web (tsc ve los tipos nuevos) → commit `feat(tarot): migración tarot_readings con RLS + tipos` — **anotar en el reporte: PENDIENTE GIO aplicarla al Supabase remoto (como 0011)**.

---

### Task 10 (controlador, Fable 5): Curación de voz del mazo completo

NO es task de subagente Sonnet. Con las 78×2 escritas: un pase de Fable 5 sobre `tarot-es.ts`/`tarot-en.ts` completo — consistencia de voz entre lotes (las mayores del lote A no deben sonar distinto a los oros del lote C), profundidad pareja, cero clichés de horóscopo de periódico, bridges que realmente conecten con la correspondencia. Entrega: edits directos + commit `fix(tarot): curación de voz del mazo completo`.

### Task 11 (controlador): Gate final + merge

Gate completo en core y web, revisión adversarial del branch (lentes: corrección del motor, contenido/paridad, seguridad de la migración), merge a main + push (auto-push autorizado), memoria.
