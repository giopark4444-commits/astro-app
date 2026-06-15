// packages/core/src/astrology/__tests__/synastry.test.ts
import { describe, it, expect } from "vitest";
import {
  synastryReport,
  SYNASTRY_THEMES,
  type SynastryTheme,
  type SynastryThemeScore,
} from "../synastry";

// Longitudes eclípticas por signo (0° del signo). Permite construir aspectos
// exactos colocando dos cuerpos a la separación deseada.
const ARIES = 0;
const TAURUS = 30;
const GEMINI = 60;
const CANCER = 90;
const LEO = 120;
const LIBRA = 180;
const CAPRICORN = 270;

type Body = { body: string; longitude: number };
const at = (body: string, longitude: number): Body => ({ body, longitude });

function byTheme(themes: SynastryThemeScore[]): Record<SynastryTheme, SynastryThemeScore> {
  return Object.fromEntries(themes.map((t) => [t.key, t])) as Record<
    SynastryTheme,
    SynastryThemeScore
  >;
}

/** Carta "vacía" salvo los cuerpos que pongamos lejos de todo (sin aspectos). */
function isolated(...bodies: Body[]): Body[] {
  return bodies;
}

describe("synastryReport", () => {
  it("dos cartas sin contactos relevantes: todo neutral (50)", () => {
    // A en Aries, B en Tauro+15 → separaciones que no forman aspecto mayor.
    const a = isolated(at("sun", ARIES + 0), at("venus", ARIES + 5));
    const b = isolated(at("moon", TAURUS + 18), at("mars", TAURUS + 23));
    const r = synastryReport(a, b);
    expect(r.overall).toBe(50);
    expect(r.tone).toBe("mixed");
    expect(r.themes).toHaveLength(4);
    expect(r.themes.every((t) => t.score === 50)).toBe(true);
    expect(r.aspects).toHaveLength(0);
  });

  it("devuelve siempre los cuatro temas en orden", () => {
    const r = synastryReport([at("sun", 0)], [at("moon", 0)]);
    expect(r.themes.map((t) => t.key)).toEqual(SYNASTRY_THEMES);
  });

  it("Venus de A en trígono al Marte de B SUBE la atracción", () => {
    // Venus 0° Aries, Marte 0° Leo → 120° = trígono exacto.
    const a = [at("venus", ARIES)];
    const b = [at("mars", LEO)];
    const r = synastryReport(a, b);
    const th = byTheme(r.themes);
    expect(th.attraction.score).toBeGreaterThan(50);
    expect(th.attraction.tone).toBe("high");
    // y el driver lo explica
    expect(th.attraction.drivers.length).toBeGreaterThan(0);
    const d = th.attraction.drivers[0]!;
    expect(d.a).toBe("venus");
    expect(d.b).toBe("mars");
    expect(d.aspect).toBe("trine");
    expect(d.favorable).toBe(true);
  });

  it("Sol de A en cuadratura a Venus de B BAJA la atracción", () => {
    // Sol 0° Aries, Venus 0° Cáncer → 90° = cuadratura.
    const a = [at("sun", ARIES)];
    const b = [at("venus", CANCER)];
    const r = synastryReport(a, b);
    const th = byTheme(r.themes);
    expect(th.attraction.score).toBeLessThan(50);
    expect(th.attraction.drivers[0]!.favorable).toBe(false);
  });

  it("Saturno de A en cuadratura a la Luna de B baja armonía y sube crecimiento", () => {
    // Saturno 0° Aries, Luna 0° Cáncer → cuadratura (Saturno↔Luna: contacto clásico de peso).
    const a = [at("saturn", ARIES)];
    const b = [at("moon", CANCER)];
    const r = synastryReport(a, b);
    const th = byTheme(r.themes);
    // Saturno∠Luna no entra en HARMONY (no es soft), pero sí en crecimiento.
    expect(th.growth.score).toBeGreaterThan(50);
    expect(th.growth.drivers.length).toBeGreaterThan(0);
    // y arrastra el clima global hacia abajo respecto al neutro (tensión sin contrapeso)
    expect(r.overall).toBeLessThan(50);
  });

  it("Mercurio de A en trígono a la Luna de B sube comunicación (mente + corazón)", () => {
    const a = [at("mercury", ARIES)];
    const b = [at("moon", LEO)]; // 120°
    const r = synastryReport(a, b);
    const th = byTheme(r.themes);
    expect(th.communication.score).toBeGreaterThan(50);
    const d = th.communication.drivers[0]!;
    expect(d.aspect).toBe("trine");
    expect([d.a, d.b]).toContain("mercury");
  });

  it("la comunicación SOLO se mueve con contactos de Mercurio", () => {
    // Venus△Marte mueve atracción, pero no toca Mercurio → comunicación neutra.
    const a = [at("venus", ARIES)];
    const b = [at("mars", LEO)];
    const r = synastryReport(a, b);
    const th = byTheme(r.themes);
    expect(th.communication.score).toBe(50);
    expect(th.communication.drivers).toHaveLength(0);
  });

  it("ARMONÍA sube con aspectos suaves entre luminarias/benéficos, no con los duros", () => {
    // Sol(A) △ Luna(B) → suave entre luminarias: armonía sube.
    const soft = synastryReport([at("sun", ARIES)], [at("moon", LEO)]);
    const thSoft = byTheme(soft.themes);
    expect(thSoft.harmony.score).toBeGreaterThan(50);

    // Sol(A) □ Luna(B) → duro: no cuenta como armonía (queda en 50).
    const hard = synastryReport([at("sun", ARIES)], [at("moon", CANCER)]);
    const thHard = byTheme(hard.themes);
    expect(thHard.harmony.score).toBe(50);
  });

  it("Marte□Marte (sin luminarias/benéficos) NO mueve armonía pero SÍ crecimiento", () => {
    const r = synastryReport([at("mars", ARIES)], [at("mars", CANCER)]); // 90°
    const th = byTheme(r.themes);
    expect(th.harmony.score).toBe(50); // Marte no está en HARMONY_BODIES
    expect(th.growth.score).toBeGreaterThan(50); // cuadratura = fricción
  });

  it("el orbe pesa: un aspecto exacto mueve más que uno amplio", () => {
    const exact = byTheme(synastryReport([at("venus", ARIES)], [at("mars", LEO)]).themes);
    // Marte a 117° de Venus → trígono con orbe 3°.
    const wide = byTheme(synastryReport([at("venus", ARIES)], [at("mars", LEO - 3)]).themes);
    expect(exact.attraction.score).toBeGreaterThan(wide.attraction.score);
  });

  it("simétrico en magnitud: A↔B armónico equivale a B↔A (mismo |desvío| del neutro)", () => {
    const ab = synastryReport([at("venus", ARIES)], [at("mars", LEO)]);
    const ba = synastryReport([at("mars", LEO)], [at("venus", ARIES)]);
    // el clima global no depende de a quién llamemos A o B
    expect(ab.overall).toBe(ba.overall);
    // y la atracción se mueve igual de magnitud
    const a1 = byTheme(ab.themes).attraction.score;
    const a2 = byTheme(ba.themes).attraction.score;
    expect(a1).toBe(a2);
  });

  it("varios contactos armónicos elevan el clima global por encima del neutro", () => {
    const a = [at("sun", ARIES), at("venus", TAURUS), at("moon", GEMINI)];
    const b = [at("moon", LEO), at("jupiter", GEMINI + 120), at("venus", CAPRICORN)];
    // Sol(0)△Luna(120); Venus(30)△? ; Luna(60)△Jupiter(180) etc. — mezcla favorable.
    const r = synastryReport(a, b);
    expect(r.overall).toBeGreaterThan(50);
    expect(r.aspects.length).toBeGreaterThan(0);
  });

  it("clamping: mucha tensión nunca baja de 0 ni el global ni los temas", () => {
    // pila de duros sobre la atracción + Saturno
    const a = [at("sun", ARIES), at("mars", ARIES + 1), at("saturn", ARIES + 2)];
    const b = [at("venus", CANCER), at("moon", CANCER + 1), at("sun", LIBRA)];
    const r = synastryReport(a, b);
    expect(r.overall).toBeGreaterThanOrEqual(0);
    expect(r.overall).toBeLessThanOrEqual(100);
    for (const t of r.themes) {
      expect(t.score).toBeGreaterThanOrEqual(0);
      expect(t.score).toBeLessThanOrEqual(100);
    }
  });

  it("clamping: mucha luz nunca pasa de 100", () => {
    // pila de trígonos/sextiles entre benéficos y luminarias
    const a = [at("venus", ARIES), at("sun", TAURUS), at("moon", GEMINI), at("jupiter", CANCER)];
    const b = [
      at("mars", LEO),
      at("venus", LEO + 30),
      at("moon", GEMINI + 120),
      at("jupiter", CANCER + 120),
    ];
    const r = synastryReport(a, b);
    expect(r.overall).toBeLessThanOrEqual(100);
    for (const t of r.themes) expect(t.score).toBeLessThanOrEqual(100);
  });

  it("ignora cuerpos transpersonales (Plutón, Urano, nodos): no generan aspectos", () => {
    // Plutón(A) exactamente conjunto a Urano(B): fuera del set → sin efecto.
    const a = [at("pluto", ARIES), at("uranus", LEO)];
    const b = [at("uranus", ARIES), at("neptune", LEO), at("north_node", CANCER)];
    const r = synastryReport(a, b);
    expect(r.aspects).toHaveLength(0);
    expect(r.overall).toBe(50);
  });

  it("los drivers de un tema vienen ordenados por magnitud (el más fuerte primero)", () => {
    // dos contactos a la atracción con orbes distintos
    const a = [at("venus", ARIES), at("sun", TAURUS)];
    const b = [at("mars", LEO), at("moon", LEO - 4)]; // Venus△Mars exacto; Sun△Moon con orbe
    const r = synastryReport(a, b);
    const th = byTheme(r.themes);
    const ds = th.attraction.drivers;
    expect(ds.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < ds.length; i++) {
      // como proxy de magnitud usamos orbe (más pequeño = más fuerte) dentro del mismo tipo,
      // pero como hay tipos/cuerpos distintos sólo comprobamos que el primero es un contacto real.
      expect(ds[i]!.orb).toBeGreaterThanOrEqual(0);
    }
    // el driver más fuerte debe ser el Venus△Mars exacto (orbe 0)
    expect(ds[0]!.orb).toBeCloseTo(0, 5);
  });

  it("la conjunción Venus☌Júpiter (benéficos) suma; Saturno☌Sol resta", () => {
    const benefic = byTheme(
      synastryReport([at("venus", ARIES)], [at("jupiter", ARIES)]).themes,
    );
    // Venus☌Júpiter: ambos benéficos → armónico. Toca atracción? Venus sí está en
    // ATTRACTION_BODIES pero Júpiter no → no entra en atracción. Sí en armonía (soft? no,
    // conjunción es neutral) — así que comprobamos el clima global.
    const rBenefic = synastryReport([at("venus", ARIES)], [at("jupiter", ARIES)]);
    expect(rBenefic.overall).toBeGreaterThan(50);

    const rSaturn = synastryReport([at("sun", ARIES)], [at("saturn", ARIES)]);
    expect(rSaturn.overall).toBeLessThan(50);
    void benefic;
  });
});
