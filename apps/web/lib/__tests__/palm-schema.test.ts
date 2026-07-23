import { describe, expect, it } from "vitest";
import { parsePalmFeatures } from "@/lib/palm/schema";
import { parsePalmReading } from "@/lib/palm/prompts";

describe("parsePalmFeatures (inventario de la visión)", () => {
  it("acepta un inventario válido y lo sanea", () => {
    const f = parsePalmFeatures(
      JSON.stringify({
        image_quality: { usable: true, issues: [] },
        mano: { declarada: "dominante", vista: "derecha" },
        forma: { elemento: "agua", palma: "rectangular", dedos: "largos" },
        lineas: [
          { id: "vida", presente: true, profundidad: "profunda", marcas: [{ tipo: "isla", posicion: "tercio medio" }] },
          { id: "corazon", presente: true, calidad: "encadenada" },
        ],
        montes: [{ id: "venus", desarrollo: "prominente" }],
        confianza: 0.8,
      }),
    );
    expect(f).not.toBeNull();
    expect(f!.forma.elemento).toBe("agua");
    expect(f!.lineas).toHaveLength(2);
    expect(f!.lineas[0]!.marcas![0]!.tipo).toBe("isla");
    expect(f!.montes[0]!.id).toBe("venus");
    expect(f!.confianza).toBe(0.8);
  });

  it("descarta líneas/montes con ids desconocidos sin rechazar el resto", () => {
    const f = parsePalmFeatures(
      JSON.stringify({
        lineas: [{ id: "lifeline_inventada", presente: true }, { id: "cabeza", presente: true }],
        montes: [{ id: "olimpo", desarrollo: "prominente" }, { id: "luna", desarrollo: "plano" }],
      }),
    );
    expect(f!.lineas.map((l) => l.id)).toEqual(["cabeza"]);
    expect(f!.montes.map((m) => m.id)).toEqual(["luna"]);
  });

  it("foto inutilizable pasa con usable:false y guía, aunque no traiga rasgos", () => {
    const f = parsePalmFeatures(
      JSON.stringify({ image_quality: { usable: false, issues: ["borrosa"], guidance: "abre la palma con luz frontal" }, lineas: [], montes: [] }),
    );
    expect(f).not.toBeNull();
    expect(f!.image_quality.usable).toBe(false);
    expect(f!.image_quality.guidance).toContain("palma");
  });

  it("basura → null (sin JSON o sin nada quiromántico)", () => {
    expect(parsePalmFeatures("no hay json aquí")).toBeNull();
    expect(parsePalmFeatures(JSON.stringify({ hola: "mundo" }))).toBeNull();
  });

  it("acota textos largos (caps de saneo)", () => {
    const f = parsePalmFeatures(
      JSON.stringify({ lineas: [{ id: "vida", presente: true, nota: "x".repeat(1000) }], montes: [] }),
    );
    expect(f!.lineas[0]!.nota!.length).toBeLessThanOrEqual(300);
  });
});

describe("parsePalmReading (secciones de la voz)", () => {
  it("acepta secciones válidas", () => {
    const r = parsePalmReading(
      JSON.stringify({ forma: "a", lineas: "b", montes: "c", marcas: "d", puente_astral: "e", sintesis: "f", consejo: "g" }),
    );
    expect(r).not.toBeNull();
    expect(Object.keys(r!)).toHaveLength(7);
  });

  it("exige mínimo síntesis + 2 secciones", () => {
    expect(parsePalmReading(JSON.stringify({ sintesis: "solo esto" }))).toBeNull();
    expect(parsePalmReading(JSON.stringify({ forma: "a", lineas: "b" }))).toBeNull();
  });
});
