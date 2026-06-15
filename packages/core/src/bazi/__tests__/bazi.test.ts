// packages/core/src/bazi/__tests__/bazi.test.ts
import { describe, it, expect } from "vitest";
import {
  computeBaZi,
  yearPillar,
  monthPillar,
  dayPillar,
  hourPillar,
  gregorianToJDN,
  hiddenStems,
  tenGod,
  TEN_GODS,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  type TenGod,
} from "../bazi";

describe("Ba Zi / Saju — pilares sexagenarios", () => {
  it("JDN gregoriano (referencia astronómica: 2000-01-01 = 2451545)", () => {
    expect(gregorianToJDN(2000, 1, 1)).toBe(2451545);
  });

  it("pilar de AÑO: 1984 = 甲子 (Rata de Madera, inicio del ciclo de 60)", () => {
    expect(yearPillar(1984)).toEqual({ stem: 0, branch: 0 });
    expect(HEAVENLY_STEMS[0]!.hanzi).toBe("甲");
    expect(EARTHLY_BRANCHES[0]!.hanzi).toBe("子");
  });

  it("pilar de AÑO: ciclo de 60 (1984≡2044; 1985 = 乙丑)", () => {
    expect(yearPillar(2044)).toEqual(yearPillar(1984));
    expect(yearPillar(1985)).toEqual({ stem: 1, branch: 1 });
  });

  it("pilar de DÍA: referencia documentada 2000-01-07 = 甲子 (valida el ancla)", () => {
    expect(dayPillar(2000, 1, 7)).toEqual({ stem: 0, branch: 0 });
  });

  it("pilar de DÍA: días consecutivos avanzan el ciclo (+1 tronco, +1 rama)", () => {
    const a = dayPillar(1990, 6, 15);
    const b = dayPillar(1990, 6, 16);
    expect(b.stem).toBe((a.stem + 1) % 10);
    expect(b.branch).toBe((a.branch + 1) % 12);
  });

  it("rama de MES por término solar: Lichun 315° = 寅 (rama 2); 345° = 卯; 0° cae en 卯", () => {
    expect(monthPillar(0, 315).branch).toBe(2);
    expect(monthPillar(0, 345).branch).toBe(3);
    expect(monthPillar(0, 0).branch).toBe(3);
  });

  it("tronco de MES por Cinco Tigres (五虎遁): año 甲→丙寅, 乙→戊寅, 戊→甲寅", () => {
    expect(monthPillar(0, 315)).toEqual({ stem: 2, branch: 2 });
    expect(monthPillar(1, 315).stem).toBe(4);
    expect(monthPillar(4, 315).stem).toBe(0);
  });

  it("rama de HORA: 子 cubre 23–01 (23 y 0 → 子; 1 → 丑; 12 → 午)", () => {
    expect(hourPillar(0, 23).branch).toBe(0);
    expect(hourPillar(0, 0).branch).toBe(0);
    expect(hourPillar(0, 1).branch).toBe(1);
    expect(hourPillar(0, 12).branch).toBe(6);
  });

  it("tronco de HORA por Cinco Ratas (五鼠遁): día 甲→子=甲; día 乙→子=丙", () => {
    expect(hourPillar(0, 23)).toEqual({ stem: 0, branch: 0 });
    expect(hourPillar(1, 0).stem).toBe(2);
  });

  it("computeBaZi integra los cuatro pilares", () => {
    const r = computeBaZi({
      localYear: 2000,
      localMonth: 1,
      localDay: 7,
      hour: 0,
      solarYear: 1999,
      sunLongitude: 286,
    });
    expect(r.day).toEqual({ stem: 0, branch: 0 }); // referencia 甲子
    expect(r.year).toEqual(yearPillar(1999));
    expect(r.hour.branch).toBe(0); // medianoche → 子
  });
});

// ───────────────────────── Modo Pro: 藏干 (troncos ocultos) ─────────────────────────

describe("Ba Zi — troncos ocultos (藏干)", () => {
  // índices de tronco por su hanzi, para leer las aserciones en notación clásica
  const S: Record<string, number> = Object.fromEntries(HEAVENLY_STEMS.map((s, i) => [s.hanzi, i]));
  const B: Record<string, number> = Object.fromEntries(EARTHLY_BRANCHES.map((b, i) => [b.hanzi, i]));

  it("tabla estándar completa (rama → troncos ocultos)", () => {
    expect(hiddenStems(B["子"]!)).toEqual([S["癸"]!]);
    expect(hiddenStems(B["丑"]!)).toEqual([S["己"]!, S["癸"]!, S["辛"]!]);
    expect(hiddenStems(B["寅"]!)).toEqual([S["甲"]!, S["丙"]!, S["戊"]!]);
    expect(hiddenStems(B["卯"]!)).toEqual([S["乙"]!]);
    expect(hiddenStems(B["辰"]!)).toEqual([S["戊"]!, S["乙"]!, S["癸"]!]);
    expect(hiddenStems(B["巳"]!)).toEqual([S["丙"]!, S["戊"]!, S["庚"]!]);
    expect(hiddenStems(B["午"]!)).toEqual([S["丁"]!, S["己"]!]);
    expect(hiddenStems(B["未"]!)).toEqual([S["己"]!, S["丁"]!, S["乙"]!]);
    expect(hiddenStems(B["申"]!)).toEqual([S["庚"]!, S["壬"]!, S["戊"]!]);
    expect(hiddenStems(B["酉"]!)).toEqual([S["辛"]!]);
    expect(hiddenStems(B["戌"]!)).toEqual([S["戊"]!, S["辛"]!, S["丁"]!]);
    expect(hiddenStems(B["亥"]!)).toEqual([S["壬"]!, S["甲"]!]);
  });

  it("coincide con los índices crudos del enunciado", () => {
    expect(hiddenStems(0)).toEqual([9]);
    expect(hiddenStems(1)).toEqual([5, 9, 7]);
    expect(hiddenStems(2)).toEqual([0, 2, 4]);
    expect(hiddenStems(4)).toEqual([4, 1, 9]);
    expect(hiddenStems(8)).toEqual([6, 8, 4]);
    expect(hiddenStems(11)).toEqual([8, 0]);
  });

  it("el primer tronco oculto es el principal (本气) y comparte elemento con la rama (cardinales)", () => {
    // ramas cardinales puras: 子=癸(agua), 卯=乙(madera), 午=丁(fuego), 酉=辛(metal)
    for (const bi of [B["子"]!, B["卯"]!, B["午"]!, B["酉"]!]) {
      const principal = hiddenStems(bi)[0]!;
      expect(HEAVENLY_STEMS[principal]!.element).toBe(EARTHLY_BRANCHES[bi]!.element);
    }
  });

  it("devuelve una copia (mutarla no afecta a la tabla interna)", () => {
    const a = hiddenStems(1);
    a.push(99);
    expect(hiddenStems(1)).toEqual([5, 9, 7]);
  });

  it("normaliza el índice de rama (módulo 12)", () => {
    expect(hiddenStems(12)).toEqual(hiddenStems(0));
    expect(hiddenStems(-1)).toEqual(hiddenStems(11));
  });
});

// ───────────────────────── Modo Pro: 十神 (Diez Dioses) ─────────────────────────

describe("Ba Zi — Diez Dioses (十神)", () => {
  const S: Record<string, number> = Object.fromEntries(HEAVENLY_STEMS.map((s, i) => [s.hanzi, i]));

  it("DM 甲 (madera yang): casos verificados a mano del enunciado", () => {
    const dm = S["甲"]!; // 0
    expect(tenGod(dm, S["甲"]!)).toBe("peer"); // 比肩 mismo elem, misma pol
    expect(tenGod(dm, S["乙"]!)).toBe("rob"); // 劫財 mismo elem, distinta pol
    expect(tenGod(dm, S["丙"]!)).toBe("eating"); // 食神 DM genera, misma pol
    expect(tenGod(dm, S["庚"]!)).toBe("power_indirect"); // 七殺 controla al DM, misma pol
    expect(tenGod(dm, S["壬"]!)).toBe("resource_indirect"); // 偏印 genera al DM, misma pol
  });

  it("DM 甲: las diez relaciones completas (un tronco de cada)", () => {
    const dm = S["甲"]!;
    const map: Record<string, TenGod> = {
      甲: "peer",
      乙: "rob",
      丙: "eating",
      丁: "hurting",
      戊: "wealth_indirect",
      己: "wealth_direct",
      庚: "power_indirect",
      辛: "power_direct",
      壬: "resource_indirect",
      癸: "resource_direct",
    };
    for (const [hanzi, expected] of Object.entries(map)) {
      expect(tenGod(dm, S[hanzi]!)).toBe(expected);
    }
  });

  it("DM 乙 (madera yin): la polaridad invierte par/impar respecto a 甲", () => {
    const dm = S["乙"]!; // 1, yin
    expect(tenGod(dm, S["乙"]!)).toBe("peer"); // mismo elem, misma pol (yin/yin)
    expect(tenGod(dm, S["甲"]!)).toBe("rob"); // mismo elem, distinta pol
    expect(tenGod(dm, S["丙"]!)).toBe("hurting"); // DM genera, distinta pol → 傷官
    expect(tenGod(dm, S["丁"]!)).toBe("eating"); // DM genera, misma pol → 食神
    expect(tenGod(dm, S["庚"]!)).toBe("power_direct"); // controla al DM, distinta pol → 正官
    expect(tenGod(dm, S["辛"]!)).toBe("power_indirect"); // controla al DM, misma pol → 七殺
  });

  it("DM 丙 (fuego yang): control y generación con otro elemento de partida", () => {
    const dm = S["丙"]!; // 2, fuego yang
    expect(tenGod(dm, S["戊"]!)).toBe("eating"); // fuego genera tierra, ambos yang → 食神
    expect(tenGod(dm, S["庚"]!)).toBe("wealth_indirect"); // fuego controla metal, ambos yang → 偏財
    expect(tenGod(dm, S["辛"]!)).toBe("wealth_direct"); // fuego controla metal, distinta pol → 正財
    expect(tenGod(dm, S["壬"]!)).toBe("power_indirect"); // agua controla fuego, ambos yang → 七殺
    expect(tenGod(dm, S["甲"]!)).toBe("resource_indirect"); // madera genera fuego, ambos yang → 偏印
    expect(tenGod(dm, S["乙"]!)).toBe("resource_direct"); // madera genera fuego, distinta pol → 正印
  });

  it("DM 癸 (agua yin): el ciclo cierra (agua→madera, metal→agua)", () => {
    const dm = S["癸"]!; // 9, agua yin
    expect(tenGod(dm, S["乙"]!)).toBe("eating"); // agua genera madera, ambos yin → 食神
    expect(tenGod(dm, S["丁"]!)).toBe("wealth_indirect"); // agua controla fuego, ambos yin → 偏財
    expect(tenGod(dm, S["己"]!)).toBe("power_indirect"); // tierra controla agua, ambos yin → 七殺
    expect(tenGod(dm, S["辛"]!)).toBe("resource_indirect"); // metal genera agua, ambos yin → 偏印
    expect(tenGod(dm, S["庚"]!)).toBe("resource_direct"); // metal genera agua, distinta pol → 正印
  });

  it("cada Maestro del Día asigna exactamente una vez cada uno de los Diez Dioses", () => {
    for (let dm = 0; dm < 10; dm++) {
      const got = HEAVENLY_STEMS.map((_, other) => tenGod(dm, other)).sort();
      const all = TEN_GODS.map((g) => g.key).sort();
      expect(got).toEqual(all);
    }
  });

  it("TEN_GODS expone las 10 claves con su hanzi canónico", () => {
    expect(TEN_GODS).toHaveLength(10);
    const byKey = Object.fromEntries(TEN_GODS.map((g) => [g.key, g.hanzi]));
    expect(byKey.peer).toBe("比肩");
    expect(byKey.rob).toBe("劫財");
    expect(byKey.eating).toBe("食神");
    expect(byKey.hurting).toBe("傷官");
    expect(byKey.wealth_indirect).toBe("偏財");
    expect(byKey.wealth_direct).toBe("正財");
    expect(byKey.power_indirect).toBe("七殺");
    expect(byKey.power_direct).toBe("正官");
    expect(byKey.resource_indirect).toBe("偏印");
    expect(byKey.resource_direct).toBe("正印");
  });

  it("normaliza índices de tronco (módulo 10)", () => {
    expect(tenGod(10, 10)).toBe(tenGod(0, 0));
    expect(tenGod(-1, -1)).toBe(tenGod(9, 9));
  });
});
